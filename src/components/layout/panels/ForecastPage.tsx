import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend,
} from 'recharts';
import {
  Activity, TrendingUp, CheckCircle2,
  BarChart3, Zap, Calendar, GitCompare, AlertCircle, Trophy,
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { getForecastPageCache, setForecastPageCache } from '../../../store/useStore';
import type { ForecastScenariosResponse, ForecastScenarioResult, ScenarioCompareResponse } from '../../../types/api';
import api from '../../../api';

const ORANGE = '#FF5A1F';
const GREY   = '#B8B3AB';
const GOLD   = '#D4A017';
const SILVER = '#8C8C8C';
const BRONZE = '#A0522D';

const SCENARIO_COLORS: Record<string, string> = {
  'Base Case':    ORANGE,
  'Conservative': '#22C55E',
  'Aggressive':   '#3B82F6',
};

// Badge class by label
function scenarioBadgeStyle(label: string | undefined | null): string {
  if (label === 'Base Case')    return 'bg-orange-50 text-orange-600 border-orange-200';
  if (label === 'Conservative') return 'bg-green-50 text-green-600 border-green-200';
  if (label === 'Aggressive')   return 'bg-blue-50 text-blue-600 border-blue-200';
  return 'bg-warm-bg text-warm-muted border-warm-border';
}

// Dot color by label (for chart legend)
function scenarioColor(label: string | undefined | null): string {
  return SCENARIO_COLORS[label ?? ''] ?? ORANGE;
}

// Generate quarterly period labels
function generateQuarterlyPeriods(start: string | undefined | null, end: string | undefined | null): string[] {
  if (!start || !end) return [];
  const parseQP = (s: string) => {
    const m = s.match(/Q(\d)[_ ](\d{4})/i);
    return m ? { q: parseInt(m[1]), y: parseInt(m[2]) } : null;
  };
  const s = parseQP(start);
  const e = parseQP(end);
  if (!s || !e) return [];
  const periods: string[] = [];
  let { q, y } = s;
  while (y < e.y || (y === e.y && q <= e.q)) {
    periods.push(`Q${q}_${y}`);
    q++;
    if (q > 4) { q = 1; y++; }
  }
  return periods;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ForecastTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const histEntry = payload.find((p: any) => p.dataKey === 'hist');
  const foreEntries = payload.filter((p: any) => p.dataKey !== 'hist' && p.value != null);
  if (!histEntry && !foreEntries.length) return null;

  return (
    <div className="bg-white border border-warm-border shadow-lg rounded-xl px-3 py-2 text-[11px] min-w-[130px]">
      <div className="font-bold text-warm-text mb-1">{label}</div>
      {histEntry?.value != null && (
        <div className="flex items-center justify-between gap-3 mb-0.5">
          <span className="text-warm-muted">Historical</span>
          <span className="font-mono font-bold" style={{ color: '#6B6560' }}>
            {Number(histEntry.value).toLocaleString()}
          </span>
        </div>
      )}
      {foreEntries.map((e: any) => (
        <div key={e.dataKey} className="flex items-center justify-between gap-3">
          <span style={{ color: e.color }}>{e.name}</span>
          <span className="font-mono font-bold" style={{ color: e.color }}>
            {Number(e.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline running state ─────────────────────────────────────────────────
function ForecastRunningState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-2xl bg-brand-indigo/10 flex items-center justify-center">
          <Activity className="h-8 w-8 text-brand-indigo" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border-2 border-brand-indigo/30 animate-ping" />
      </div>
      <div>
        <h2 className="text-[18px] font-bold text-warm-text mb-1">Running Holt-Winters Forecast…</h2>
        <p className="text-[13px] text-warm-muted max-w-sm leading-relaxed">
          Fitting exponential smoothing parameters across your historical quarters.
          Detecting level, trend, and seasonality patterns to project Q1_2025.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {['Vectorising time series data', 'Fitting α / β / γ parameters', 'Generating Conservative, Base Case, Aggressive forecasts'].map((step, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-warm-border shadow-sm">
            <div className="h-4 w-4 rounded-full border-2 border-brand-indigo border-t-transparent animate-spin shrink-0" style={{ animationDelay: `${i * 0.2}s` }} />
            <span className="text-[11.5px] text-warm-text font-medium">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center">
        <Activity className="h-7 w-7 text-brand-indigo/40" />
      </div>
      <div>
        <h2 className="text-[18px] font-bold text-warm-text mb-1">No Forecast Results Yet</h2>
        <p className="text-[13px] text-warm-muted max-w-sm leading-relaxed">
          Ask the AI to predict a future period — e.g. <em>"forecast Q1_2025"</em> or{' '}
          <em>"run all three scenarios for Q1_2025"</em>. Holt-Winters will project your
          aggregated time series forward with Conservative, Base Case, and Aggressive trend modes.
        </p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-indigo/5 border border-brand-indigo/15 text-[12px] text-brand-indigo font-medium">
        <TrendingUp className="h-4 w-4" />
        Go to IPS Engine → Run Forecast
      </div>
    </div>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const color = rank === 1 ? GOLD : rank === 2 ? SILVER : rank === 3 ? BRONZE : '#C8C3BB';
  const label = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  return (
    <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}>
      {label}
    </span>
  );
}

// ── Range bar (same-period comparison) ───────────────────────────────────────
function RangeBar({ conservative, baseCase, aggressive }: {
  conservative: number; baseCase: number; aggressive: number;
}) {
  const min = Math.min(conservative, aggressive);
  const max = Math.max(conservative, aggressive);
  const range = max - min || 1;
  const basePct = Math.round(((baseCase - min) / range) * 100);
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between text-[10.5px] font-mono">
        <span className="font-bold text-green-600">{conservative.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span className="font-bold" style={{ color: ORANGE }}>{baseCase.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span className="font-bold text-blue-600">{aggressive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #22C55E40, #FF5A1F30, #3B82F640)' }}>
        <div className="absolute top-0 bottom-0 w-1.5 rounded-full -translate-x-1/2 shadow"
          style={{ left: `${basePct}%`, backgroundColor: ORANGE }} />
      </div>
      <div className="flex items-center justify-between text-[9px] text-warm-muted">
        <span className="text-green-600 font-semibold">↙ Conservative</span>
        <span style={{ color: ORANGE }} className="font-semibold">● Base Case</span>
        <span className="text-blue-600 font-semibold">Aggressive ↗</span>
      </div>
    </div>
  );
}

// ── Build compare data client-side from forecast scenarios ────────────────────
function buildCompareFromScenarios(scenarios: ForecastScenarioResult[]): ScenarioCompareResponse | null {
  if (!scenarios.length) return null;

  const uniquePeriods = [...new Set(scenarios.map(s => s.target_period))];
  const multiPeriod = uniquePeriods.length > 1;

  // Dedupe: for same-period keep one per label (highest scenario_number),
  // for multi-period keep one per target_period (highest scenario_number)
  const dedupeKey = (s: ForecastScenarioResult) =>
    multiPeriod ? s.target_period : (s.scenario_label ?? `Scenario ${s.scenario_number}`);

  const dedupMap = new Map<string, ForecastScenarioResult>();
  scenarios.forEach(s => {
    const key = dedupeKey(s);
    const ex = dedupMap.get(key);
    if (!ex || s.scenario_number > ex.scenario_number) dedupMap.set(key, s);
  });
  const working = Array.from(dedupMap.values());

  const sorted = [...working].sort((a, b) =>
    multiPeriod
      ? (b.predicted_growth_rate ?? 0) - (a.predicted_growth_rate ?? 0)
      : b.forecasted_value - a.forecasted_value
  );

  const ranked: ScenarioCompareResponse['scenarios'] = sorted.map((s, i) => ({
    rank: i + 1,
    scenario_number: s.scenario_number,
    scenario_label: s.scenario_label ?? `Scenario ${s.scenario_number}`,
    target_period: s.target_period,
    forecasted_value: s.forecasted_value,
    predicted_growth_rate: s.predicted_growth_rate ?? 0,
    predicted_growth_rate_percentage: s.predicted_growth_rate_percentage ?? '',
    comparison_period: s.comparison_period ?? '',
    comparison_value: s.comparison_value ?? 0,
    periods_ahead: s.periods_ahead,
  }));

  const best = ranked[0];
  const recommendation = multiPeriod
    ? `Across ${working.length} different forecast periods, ${best.target_period} shows the strongest year-over-year growth at ${best.predicted_growth_rate_percentage}.`
    : `For ${uniquePeriods[0]}, ${best.scenario_label} achieves the highest forecasted value of ${best.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 0 })} with ${best.predicted_growth_rate_percentage} predicted growth.`;

  return {
    success: true,
    total_scenarios: ranked.length,
    multi_period: multiPeriod,
    rank_basis: multiPeriod ? 'predicted_growth_rate' : 'forecasted_value',
    unique_periods: uniquePeriods,
    scenarios: ranked,
    best_scenario: best.scenario_number,
    best_scenario_label: best.scenario_label,
    best_target_period: best.target_period,
    best_forecasted_value: best.forecasted_value,
    best_growth_rate_percentage: best.predicted_growth_rate_percentage,
    recommendation,
  };
}

// ── Compare view ──────────────────────────────────────────────────────────────
function CompareView() {
  const activeBatchId     = useStore(s => s.activeBatchId);
  const forecastScenarios = useStore(s => s.forecastScenarios);
  const [data, setData]   = useState<ScenarioCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompare = useCallback(async () => {
    setLoading(true);
    const withTimeout = <T,>(p: Promise<T>, ms = 8000): Promise<T> =>
      Promise.race([p, new Promise<T>((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
    const [compareResult, foreResult] = await Promise.allSettled([
      withTimeout(api.getScenarioCompare()),
      withTimeout(api.getForecastScenarios()),
    ]);

    if (compareResult.status === 'fulfilled' &&
        compareResult.value.success &&
        compareResult.value.scenarios?.length > 0) {
      setData(compareResult.value);
    } else if (foreResult.status === 'fulfilled' &&
               foreResult.value.has_results &&
               foreResult.value.scenarios?.length > 0) {
      setData(buildCompareFromScenarios(foreResult.value.scenarios));
    } else {
      setData(null);
    }
    setLoading(false);
  }, [activeBatchId]);

  useEffect(() => { void fetchCompare(); }, [fetchCompare]);
  useEffect(() => {
    if (forecastScenarios.length > 0) void fetchCompare();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastScenarios.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-6 w-6 border-2 border-brand-indigo border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.success || !data.scenarios?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center">
          <GitCompare className="h-7 w-7 text-brand-indigo/40" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-warm-text mb-1">No Comparison Data Yet</h2>
          <p className="text-[13px] text-warm-muted max-w-sm leading-relaxed">
            Ask the AI to run all three scenarios — e.g. <em>"run conservative, base case, and aggressive forecasts for Q1_2025, then compare"</em>.
          </p>
        </div>
      </div>
    );
  }

  const { multi_period, scenarios, recommendation, unique_periods } = data;

  // Same-period mode: find Conservative / Base Case / Aggressive
  const cons = scenarios.find(s => s.scenario_label === 'Conservative');
  const base = scenarios.find(s => s.scenario_label === 'Base Case');
  const aggr = scenarios.find(s => s.scenario_label === 'Aggressive');
  const hasRange = !multi_period && cons && base && aggr;

  const headerText = multi_period
    ? `Forecast Timeline — ${unique_periods[0]} to ${unique_periods[unique_periods.length - 1]}`
    : `Scenario Range for ${unique_periods[0]}`;

  const subText = multi_period
    ? 'Ranked by YoY growth rate — absolute values not comparable across periods'
    : 'Ranked by forecasted value — same period, different trend assumptions';

  const rankBasisBadge = multi_period ? 'Ranked by Growth Rate' : 'Ranked by Forecasted Value';

  const best = scenarios[0];

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-indigo/10 flex items-center justify-center shrink-0">
            <GitCompare className="h-5 w-5 text-brand-indigo" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-warm-text leading-tight">{headerText}</h1>
            <p className="text-[12px] text-warm-muted">{subText}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-brand-indigo px-2.5 py-1 rounded-full bg-brand-indigo/8 border border-brand-indigo/15">
          {rankBasisBadge}
        </span>
      </div>

      {/* Best scenario banner */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-wrap items-center gap-4"
        style={{ borderColor: `${scenarioColor(best.scenario_label)}44` }}>
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 shrink-0" style={{ color: GOLD }} />
          <div>
            <div className="text-[10px] font-bold text-warm-muted uppercase tracking-wide">
              {multi_period ? 'Strongest Growth' : 'Highest Forecasted Value'}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[15px] font-bold text-warm-text">{best.scenario_label}</span>
              {!multi_period && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scenarioBadgeStyle(best.scenario_label)}`}>
                  {best.scenario_label}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto flex-wrap">
          {best.target_period && (
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: scenarioColor(best.scenario_label) }}>
              {best.target_period}
            </span>
          )}
          <span className="text-[15px] font-bold font-mono" style={{ color: scenarioColor(best.scenario_label) }}>
            {best.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          {best.predicted_growth_rate_percentage && (
            <span className="text-[13px] font-bold" style={{ color: '#5E7D55' }}>
              {best.predicted_growth_rate_percentage} YoY
            </span>
          )}
        </div>
      </div>

      {/* Range bar (same-period only) */}
      {hasRange && (
        <div className="bg-white rounded-2xl border border-warm-border shadow-sm p-5">
          <div className="text-[11px] font-bold text-warm-muted uppercase tracking-wide mb-3">Forecast Range</div>
          <RangeBar
            conservative={cons.forecasted_value}
            baseCase={base.forecasted_value}
            aggressive={aggr.forecasted_value}
          />
        </div>
      )}

      {/* Multi-period note */}
      {multi_period && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-brand-indigo/5 border border-brand-indigo/15 text-[11.5px] text-brand-indigo">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Growth rates are year-over-year comparisons. Absolute values vary by period.</span>
        </div>
      )}

      {/* Ranked table */}
      <div className="bg-white rounded-2xl border border-warm-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-border/60">
          <span className="text-[13px] font-bold text-warm-text">Ranked Scenarios</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-warm-border/50 bg-warm-bg/40">
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Rank</th>
              {multi_period ? (
                <>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Period</th>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Forecasted Value</th>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Growth Rate</th>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">vs Comparison</th>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Comparison Value</th>
                </>
              ) : (
                <>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Scenario</th>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Forecasted Value</th>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Growth Rate</th>
                  <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Status</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {scenarios.map(s => {
              const growth = s.predicted_growth_rate_percentage ?? '';
              const isPos  = !growth.startsWith('-');
              const color  = scenarioColor(s.scenario_label);
              return (
                <tr key={`${s.rank}-${s.scenario_number}`}
                  className="border-b border-warm-border/30 transition-colors hover:bg-warm-bg/40">
                  <td className="px-5 py-2.5"><RankBadge rank={s.rank} /></td>
                  {multi_period ? (
                    <>
                      <td className="px-5 py-2.5 font-mono font-bold text-[12px] text-warm-text">{s.target_period}</td>
                      <td className="px-5 py-2.5 font-mono font-bold text-[13px]" style={{ color }}>
                        {s.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-2.5">
                        {growth ? <span className="text-[11.5px] font-bold" style={{ color: isPos ? '#5E7D55' : '#DC2626' }}>{growth}</span>
                          : <span className="text-warm-muted text-[11px]">—</span>}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-[11.5px] text-warm-muted">{s.comparison_period || '—'}</td>
                      <td className="px-5 py-2.5 font-mono text-[11.5px] text-warm-text">
                        {s.comparison_value != null ? s.comparison_value.toLocaleString() : '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-2.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${scenarioBadgeStyle(s.scenario_label)}`}>
                          {s.scenario_label || `Scenario ${s.scenario_number}`}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 font-mono font-bold text-[13px]" style={{ color }}>
                        {s.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-2.5">
                        {growth ? <span className="text-[11.5px] font-bold" style={{ color: isPos ? '#5E7D55' : '#DC2626' }}>{growth}</span>
                          : <span className="text-warm-muted text-[11px]">—</span>}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: '#5E7D55' }}>
                          <CheckCircle2 className="h-3 w-3" /> Saved
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-white rounded-2xl border border-warm-border shadow-sm p-4 flex items-start gap-3">
          <Zap className="h-4 w-4 shrink-0 mt-0.5 text-brand-indigo/60" />
          <p className="text-[12px] text-warm-text leading-relaxed">{recommendation}</p>
        </div>
      )}
    </div>
  );
}

// ── Forecast results view ─────────────────────────────────────────────────────
function ForecastResultsView() {
  const activeBatchId     = useStore(s => s.activeBatchId);
  const forecastScenarios = useStore(s => s.forecastScenarios);
  const setLatestForecast = useStore(s => s.setLatestForecast);
  const pipelineStage     = useStore(s => s.pipelineStage);
  const cached = getForecastPageCache();
  const [data, setData]       = useState<ForecastScenariosResponse | null>(cached);
  const [loading, setLoading] = useState(!cached);

  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Promise.race([
        api.getForecastScenarios(),
        new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 10000)),
      ]);
      setData(res);
      // Sync latest forecast to store so IPS Engine can use it as Flow C target
      if (res?.latest_forecast) {
        const lf = res.latest_forecast;
        setLatestForecast({
          batch_id: activeBatchId ?? '',
          data_range: {
            start_time: res.historical_values?.start_period ?? '',
            end_time:   res.historical_values?.end_period   ?? '',
          },
          target_time: lf.target_period,
          forecasted_value: lf.forecasted_value,
          last_known_value: 0,
          predicted_growth_rate: 0,
          predicted_growth_rate_percentage: lf.predicted_growth_rate_percentage ?? '',
          holt_winters_parameters: { alpha: 0, beta: 0, gamma: 0 },
          components: { level: 0, trend: 0, seasonal: [] },
          periods_ahead: 1,
        });
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeBatchId, setLatestForecast]);

  // Only fetch from API if there's no cached pipeline data
  useEffect(() => {
    if (!getForecastPageCache()) void fetchScenarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When pipeline clears (stage goes null), read from cache immediately — no re-fetch needed
  useEffect(() => {
    if (pipelineStage === null) {
      const c = getForecastPageCache();
      if (c) {
        setData(c);
        setLoading(false);
      }
    }
  }, [pipelineStage]);

  // Re-fetch when forecastScenarios updates (non-pipeline triggers)
  useEffect(() => {
    if (forecastScenarios.length > 0 && !getForecastPageCache()) void fetchScenarios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastScenarios.length]);

  if (pipelineStage === 'forecast') return <ForecastRunningState />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-6 w-6 border-2 border-brand-indigo border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.has_results || !Array.isArray(data.scenarios) || !data.scenarios.length) return <EmptyState />;

  const allScenarios = data.scenarios;
  const meta      = data.metadata;
  // data_range now comes from historical_values object; keep as fallback for legacy responses
  const dataRange = data.historical_values
    ? { start_time: data.historical_values.start_period, end_time: data.historical_values.end_period }
    : null;

  // Detect same-period mode (all scenarios target the same period, multiple scenarios)
  const uniqueForePeriods = [...new Set(allScenarios.map(s => s.target_period))];
  const isSamePeriod = uniqueForePeriods.length === 1 && allScenarios.length > 1;

  // For multi-period: one per period (highest scenario_number)
  // For same-period: one per scenario_label (highest scenario_number)
  const displayScenarios = isSamePeriod
    ? (() => {
        const map = new Map<string, ForecastScenarioResult>();
        allScenarios.forEach(s => {
          const key = s.scenario_label ?? `Scenario ${s.scenario_number}`;
          const ex = map.get(key);
          if (!ex || s.scenario_number > ex.scenario_number) map.set(key, s);
        });
        return Array.from(map.values());
      })()
    : (() => {
        const map = new Map<string, ForecastScenarioResult>();
        allScenarios.forEach(s => {
          const ex = map.get(s.target_period);
          if (!ex || s.scenario_number > ex.scenario_number) map.set(s.target_period, s);
        });
        return Array.from(map.values()).sort((a, b) => {
          const p = (x: string) => { const m = x.match(/Q(\d)[_ ](\d{4})/); return m ? parseInt(m[2]) * 4 + parseInt(m[1]) : 0; };
          return p(a.target_period) - p(b.target_period);
        });
      })();

  // ── Latest Forecast Card data ──────────────────────────────────────────────
  const latest = data.latest_forecast ?? {
    target_period: displayScenarios[displayScenarios.length - 1].target_period,
    forecasted_value: displayScenarios[displayScenarios.length - 1].forecasted_value,
  };
  const latestPeriodScenarios = allScenarios.filter(s => s.target_period === latest.target_period);
  const latestBase = latestPeriodScenarios.find(s => s.scenario_label === 'Base Case') ?? latestPeriodScenarios[latestPeriodScenarios.length - 1];
  const latestCons = latestPeriodScenarios.find(s => s.scenario_label === 'Conservative');
  const latestAggr = latestPeriodScenarios.find(s => s.scenario_label === 'Aggressive');
  const hasLatestRange = latestBase && latestCons && latestAggr;
  const latestGrowth = latestBase?.predicted_growth_rate_percentage ?? '';
  const isPositiveGrowth = !latestGrowth.startsWith('-');

  // ── Build chart data ───────────────────────────────────────────────────────
  const histObj = data.historical_values;
  const histPeriods = histObj
    ? generateQuarterlyPeriods(histObj.start_period, histObj.end_period)
    : dataRange
      ? generateQuarterlyPeriods(dataRange.start_time, dataRange.end_time)
      : [];
  const rawHistValues = Array.isArray(histObj?.values) ? histObj!.values : [];
  const hasRealHistValues = rawHistValues.some(v => v > 0);

  type ChartPoint = {
    period: string;
    hist: number | null;
    fore: number | null;
    fore_base: number | null;
    fore_cons: number | null;
    fore_aggr: number | null;
  };

  let histPoints: ChartPoint[];
  if (hasRealHistValues) {
    histPoints = histPeriods.map((period, i) => ({
      period, hist: rawHistValues[i] ?? null,
      fore: null, fore_base: null, fore_cons: null, fore_aggr: null,
    }));
  } else {
    const anchorMap = new Map<string, number>();
    displayScenarios.forEach(s => {
      if (s.comparison_period && s.comparison_value != null)
        anchorMap.set(s.comparison_period, s.comparison_value);
    });
    histPoints = histPeriods.map(period => ({
      period, hist: anchorMap.get(period) ?? null,
      fore: null, fore_base: null, fore_cons: null, fore_aggr: null,
    }));
  }

  // Connect last non-null hist point to forecasts
  const lastHistIdx = [...histPoints].reverse().findIndex(p => p.hist != null);
  const lastHistPoint = lastHistIdx >= 0 ? histPoints[histPoints.length - 1 - lastHistIdx] : null;
  const connectionVal = lastHistPoint?.hist ?? null;

  // Hoist same-period values so they're available in JSX legend
  const baseVal = isSamePeriod ? (allScenarios.find(s => s.scenario_label === 'Base Case')?.forecasted_value ?? null) : null;
  const consVal = isSamePeriod ? (allScenarios.find(s => s.scenario_label === 'Conservative')?.forecasted_value ?? null) : null;
  const aggrVal = isSamePeriod ? (allScenarios.find(s => s.scenario_label === 'Aggressive')?.forecasted_value ?? null) : null;

  if (isSamePeriod) {
    // Same-period: connect history to each scenario type

    if (lastHistPoint && connectionVal != null) {
      lastHistPoint.fore_base = baseVal != null ? connectionVal : null;
      lastHistPoint.fore_cons = consVal != null ? connectionVal : null;
      lastHistPoint.fore_aggr = aggrVal != null ? connectionVal : null;
    }

    const forePoint: ChartPoint = {
      period: uniqueForePeriods[0],
      hist: null,
      fore: null,
      fore_base: baseVal,
      fore_cons: consVal,
      fore_aggr: aggrVal,
    };

    var chartData = [...histPoints, forePoint];
  } else {
    // Multi-period: single orange line
    if (lastHistPoint && connectionVal != null) {
      lastHistPoint.fore = connectionVal;
    }
    const forePoints: ChartPoint[] = displayScenarios.map(s => ({
      period: s.target_period, hist: null, fore: s.forecasted_value,
      fore_base: null, fore_cons: null, fore_aggr: null,
    }));
    var chartData = [...histPoints, ...forePoints];
  }

  const forecastStartPeriod = uniqueForePeriods[0];
  const forecastEndPeriod   = uniqueForePeriods[uniqueForePeriods.length - 1];

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-indigo/10 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-brand-indigo" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-warm-text leading-tight">Forecast Results</h1>
            <p className="text-[12px] text-warm-muted">
              Holt-Winters exponential smoothing · {displayScenarios.length} scenario{displayScenarios.length !== 1 ? 's' : ''}
              {isSamePeriod ? ` for ${uniqueForePeriods[0]}` : ` · ${uniqueForePeriods.length} period${uniqueForePeriods.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dataRange && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-brand-indigo px-3 py-1.5 rounded-full bg-brand-indigo/5 border border-brand-indigo/15">
              <BarChart3 className="h-3 w-3" />
              {dataRange.start_time} → {dataRange.end_time}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-warm-muted px-3 py-1.5 rounded-full bg-warm-bg border border-warm-border">
            <Calendar className="h-3 w-3" />
            {isSamePeriod ? `${displayScenarios.length} scenarios` : `${uniqueForePeriods.length}Q horizon`}
          </span>
        </div>
      </div>

      {/* Timeline chart */}
      <div className="bg-white rounded-2xl border border-warm-border shadow-sm overflow-hidden">
        <div className="px-5 pt-4 flex items-center justify-between">
          <span className="text-[13px] font-bold text-warm-text">Timeline</span>
          <div className="flex items-center gap-5 text-[10.5px] text-warm-muted">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-5 rounded" style={{ background: GREY }} />
              Historical
            </span>
            {isSamePeriod ? (
              <>
                {([['Base Case', ORANGE, baseVal], ['Conservative', '#22C55E', consVal], ['Aggressive', '#3B82F6', aggrVal]] as [string, string, number | null][])
                  .filter(([,, val]) => val != null)
                  .map(([lbl, col]) => (
                    <span key={lbl} className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col }} />
                      {lbl}
                    </span>
                  ))}
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-5 rounded" style={{ backgroundColor: ORANGE }} />
                Forecast
              </span>
            )}
          </div>
        </div>

        <div className="h-60 px-3 pb-3 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREY}   stopOpacity={0.18} />
                  <stop offset="95%" stopColor={GREY}   stopOpacity={0} />
                </linearGradient>
                <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ORANGE} stopOpacity={0.20} />
                  <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE8" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#9C9489' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#9C9489' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} width={42} />
              <Tooltip content={<ForecastTooltip />} />

              {histPoints.length > 0 && (
                <ReferenceArea x1={forecastStartPeriod} x2={forecastEndPeriod}
                  fill={ORANGE} fillOpacity={0.03} stroke="none" />
              )}
              {histPoints.length > 0 && (
                <ReferenceLine x={forecastStartPeriod} stroke={ORANGE}
                  strokeDasharray="4 3" strokeOpacity={0.45}
                  label={{ value: 'Forecast →', position: 'insideTopRight', fontSize: 9, fill: ORANGE, fontWeight: 700, dy: -6 }} />
              )}

              {/* Historical area (always) */}
              <Area dataKey="hist" stroke={GREY} strokeWidth={2} strokeDasharray="5 3"
                fill="url(#histGrad)"
                dot={{ r: 3, fill: '#FFFFFF', stroke: GREY, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#FFFFFF', stroke: GREY, strokeWidth: 2.5 }}
                connectNulls={false} name="Historical" isAnimationActive={false} />

              {isSamePeriod ? (
                // Three separate colored lines for same-period scenarios
                <>
                  <Line dataKey="fore_base" stroke={ORANGE} strokeWidth={2} name="Base Case"
                    dot={{ r: 6, fill: '#FFFFFF', stroke: ORANGE, strokeWidth: 2.5 }}
                    activeDot={{ r: 7, fill: '#FFFFFF', stroke: ORANGE, strokeWidth: 3 }}
                    connectNulls isAnimationActive={false} />
                  <Line dataKey="fore_cons" stroke="#22C55E" strokeWidth={2} name="Conservative"
                    dot={{ r: 6, fill: '#FFFFFF', stroke: '#22C55E', strokeWidth: 2.5 }}
                    activeDot={{ r: 7, fill: '#FFFFFF', stroke: '#22C55E', strokeWidth: 3 }}
                    connectNulls isAnimationActive={false} />
                  <Line dataKey="fore_aggr" stroke="#3B82F6" strokeWidth={2} name="Aggressive"
                    dot={{ r: 6, fill: '#FFFFFF', stroke: '#3B82F6', strokeWidth: 2.5 }}
                    activeDot={{ r: 7, fill: '#FFFFFF', stroke: '#3B82F6', strokeWidth: 3 }}
                    connectNulls isAnimationActive={false} />
                </>
              ) : (
                // Single orange area line for multi-period
                <Area dataKey="fore" stroke={ORANGE} strokeWidth={2.5} fill="url(#foreGrad)"
                  dot={{ r: 5, fill: '#FFFFFF', stroke: ORANGE, strokeWidth: 2.5 }}
                  activeDot={{ r: 6.5, fill: '#FFFFFF', stroke: ORANGE, strokeWidth: 3 }}
                  connectNulls name="Forecast" isAnimationActive={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="px-5 py-2 border-t border-warm-border/40 bg-warm-bg/30 flex items-center gap-6 text-[10.5px] text-warm-muted">
          {dataRange && (
            <span>Historical: <strong className="text-warm-text font-mono">{dataRange.start_time} → {dataRange.end_time}</strong></span>
          )}
          <span>Forecast: <strong className="font-mono" style={{ color: ORANGE }}>
            {forecastStartPeriod}{forecastEndPeriod !== forecastStartPeriod ? ` → ${forecastEndPeriod}` : ''}
          </strong></span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3">

        {/* Method & captures */}
        <div className="bg-white rounded-2xl border border-warm-border shadow-sm p-4 flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wide">Method</span>
            <div className="text-[15px] font-bold text-warm-text mt-0.5">{(meta as any)?.method ?? 'Holt-Winters'}</div>
            <div className="text-[10.5px] text-warm-muted">Exponential smoothing</div>
          </div>
          <div className="flex flex-col gap-1.5 border-t border-warm-border/40 pt-2.5">
            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wide mb-0.5">Captures</span>
            {((meta as any)?.captures ?? ['Level', 'Trend', 'Seasonality']).map((cap: string) => (
              <span key={cap} className="flex items-center gap-1.5 text-[11px] text-warm-text">
                <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: '#5E7D55' }} />
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Smoothing parameters */}
        <div className="bg-white rounded-2xl border border-warm-border shadow-sm p-4 flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wide">Smoothing Parameters</span>
            <div className="text-[11px] text-warm-muted mt-0.5">Controls how fast the model adapts</div>
          </div>
          <div className="border-t border-warm-border/40 pt-2.5">
            <div className="text-[13px] font-bold text-warm-text">{(meta as any)?.smoothing_params ?? 'Auto-optimised'}</div>
            <div className="text-[10.5px] text-warm-muted mt-0.5">Grid search minimising RMSE on historical quarters</div>
          </div>
        </div>

        {/* Latest forecast card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3"
          style={{ border: `1.5px solid ${ORANGE}33` }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wide">Latest Forecast</span>
            <span className="text-[9px] font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: ORANGE }}>
              {latest.target_period}
            </span>
          </div>

          {hasLatestRange ? (
            // Range display: Base Case primary + Conservative/Aggressive range
            <div className="flex flex-col gap-1.5">
              <div>
                <div className="text-[10px] text-warm-muted mb-0.5">Base Case</div>
                <div className="text-[24px] font-bold font-mono leading-none" style={{ color: ORANGE }}>
                  {latestBase.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                {latestGrowth && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold"
                    style={{ color: isPositiveGrowth ? '#5E7D55' : '#DC2626' }}>
                    <TrendingUp className="h-3 w-3" />
                    {latestGrowth} YoY
                  </div>
                )}
              </div>
              <div className="border-t border-warm-border/40 pt-2 flex items-center justify-between text-[10px] text-warm-muted">
                <span className="text-green-600 font-mono font-bold">{latestCons.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-warm-muted">Conservative ← → Aggressive</span>
                <span className="text-blue-600 font-mono font-bold">{latestAggr.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          ) : (
            // Single value display — prefer Base Case when available
            <div>
              <div className="text-[28px] font-bold font-mono leading-none" style={{ color: ORANGE }}>
                {(latestBase?.forecasted_value ?? latest.forecasted_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              {latestGrowth && (
                <div className="flex items-center gap-1.5 mt-2 text-[12px] font-bold"
                  style={{ color: isPositiveGrowth ? '#5E7D55' : '#DC2626' }}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  {latestGrowth} YoY
                </div>
              )}
              {displayScenarios[displayScenarios.length - 1]?.comparison_value != null && (
                <div className="border-t border-warm-border/40 pt-2.5 mt-2 text-[10.5px] text-warm-muted flex items-center justify-between">
                  <span>Historical baseline</span>
                  <span className="font-mono font-bold text-warm-text">
                    {displayScenarios[displayScenarios.length - 1].comparison_value.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Forecast periods table */}
      <div className="bg-white rounded-2xl border border-warm-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-border/60 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-indigo" />
          <span className="text-[13px] font-bold text-warm-text">Forecast Periods</span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-warm-border/50 bg-warm-bg/40">
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Period</th>
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Scenario</th>
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Forecasted Value</th>
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Growth Rate</th>
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">vs Comparison Period</th>
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Comparison Value</th>
              <th className="px-5 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayScenarios.map((s, i) => {
              const growth = s.predicted_growth_rate_percentage ?? '';
              const isPos  = !growth.startsWith('-');
              const color  = scenarioColor(s.scenario_label);
              // Group visual: show period cell only for first row of each period group
              const prevPeriod = i > 0 ? displayScenarios[i - 1].target_period : null;
              const showPeriod = s.target_period !== prevPeriod;
              return (
                <tr key={s.scenario_number}
                  className="border-b border-warm-border/30 transition-colors hover:bg-warm-bg/40">
                  <td className="px-5 py-2.5">
                    {showPeriod && (
                      <span className="font-mono font-bold text-[12px] text-warm-text">{s.target_period}</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${scenarioBadgeStyle(s.scenario_label)}`}>
                      {s.scenario_label || `Scenario ${s.scenario_number}`}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 font-mono font-bold text-[13px]" style={{ color }}>
                    {s.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-2.5">
                    {growth
                      ? <span className="text-[11.5px] font-bold" style={{ color: isPos ? '#5E7D55' : '#DC2626' }}>{growth}</span>
                      : <span className="text-warm-muted text-[11px]">—</span>}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-[11.5px] text-warm-muted">{s.comparison_period ?? '—'}</td>
                  <td className="px-5 py-2.5 font-mono text-[11.5px]">
                    {s.comparison_value != null
                      ? <span className="text-warm-text">{s.comparison_value.toLocaleString()}</span>
                      : <span className="text-warm-muted">—</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: '#5E7D55' }}>
                      <CheckCircle2 className="h-3 w-3" /> Saved
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="px-5 py-3 bg-warm-bg/30 border-t border-warm-border/40">
          <div className="flex items-start gap-2 text-[10.5px] text-warm-muted leading-relaxed">
            <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand-indigo/50" />
            <span>
              <strong className="text-warm-text">How it works:</strong> Holt-Winters learns level, trend, and seasonality from historical
              quarters, auto-optimises α/β/γ to minimise RMSE, then projects forward. Conservative uses damped trend (φ=0.85),
              Base Case uses linear trend, Aggressive uses accelerated trend (φ=1.05).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ForecastPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'forecast';
  // Clear module-level cache when page unmounts so next manual visit re-fetches fresh data
  useEffect(() => {
    return () => { setForecastPageCache(null); };
  }, []);

  const setView = (v: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('view', v);
      return next;
    }, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-warm-border shadow-sm p-1 w-fit">
        <button onClick={() => setView('forecast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
            view !== 'compare' ? 'bg-brand-indigo text-white shadow-sm' : 'text-warm-muted hover:text-warm-text'
          }`}>
          <Activity className="h-3.5 w-3.5" />
          Forecast Results
        </button>
        <button onClick={() => setView('compare')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
            view === 'compare' ? 'bg-brand-indigo text-white shadow-sm' : 'text-warm-muted hover:text-warm-text'
          }`}>
          <GitCompare className="h-3.5 w-3.5" />
          Scenario Comparison
        </button>
      </div>

      {view === 'compare' ? <CompareView /> : <ForecastResultsView />}
    </div>
  );
}
