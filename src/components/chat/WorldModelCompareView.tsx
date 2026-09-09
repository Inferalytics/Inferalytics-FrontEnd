/**
 * WorldModelCompareView
 * Side-by-side scenario comparison: strategy used, KPIs, charts, recommendation.
 * Shown on the 08 World Model page when totalCount > 1 and "Compare" tab is active.
 */

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, Legend,
} from 'recharts';
import {
  Trophy, CheckCircle, AlertTriangle, TrendingUp, Zap, Target, Clock,
  Scale, Rocket, ArrowUpFromLine, ChevronsRight, ChevronsLeft, Settings2,
  type LucideIcon,
} from 'lucide-react';
import type { WorldModel } from '../../types/api';

// ── Strategy metadata ─────────────────────────────────────────────────────────
interface StrategyMeta {
  label: string;
  color: string;
  Icon: LucideIcon;
  description: string;
  bestFor: string;
}

const STRATEGY_META: Record<string, StrategyMeta> = {
  balanced: {
    label:       'Balanced',
    color:       '#FF5A1F',
    Icon:        Scale,
    description: 'Equal % lift distributed uniformly across all data points. Every metric receives proportional adjustment.',
    bestFor:     'When all departments/regions should grow equally (fairness/equity model)',
  },
  leader_led: {
    label:       'Leader-Led',
    color:       '#8EA885',
    Icon:        Rocket,
    description: 'Concentrates growth in the top-performing segments. Pre-scales high performers so the algorithm needs fewer adjustments.',
    bestFor:     'When you want to scale high-performers fast (e.g. expand profitable specialties)',
  },
  catch_up: {
    label:       'Catch-Up',
    color:       '#EA580C',
    Icon:        ArrowUpFromLine,
    description: 'Boosts underperforming areas proportionally more. Weak units receive additional growth weight.',
    bestFor:     'When weak units need intervention (e.g. lift struggling clinics/regions)',
  },
  front_loaded: {
    label:       'Front-Loaded',
    color:       '#7C3AED',
    Icon:        ChevronsRight,
    description: 'Accelerates growth in the first half of the period. Early quarters/months receive higher contribution weight.',
    bestFor:     'When H1 momentum matters more (seasonal peaks, early quarter targets)',
  },
  back_loaded: {
    label:       'Back-Loaded',
    color:       '#0EA5E9',
    Icon:        ChevronsLeft,
    description: 'Delays most growth to later periods. Growth concentrates in Q3/Q4 or second half.',
    bestFor:     'When end-of-period delivery is preferred (year-end push, Q4 campaigns)',
  },
};

const DEFAULT_META: StrategyMeta = {
  label: 'Custom', color: '#7E7770', Icon: Settings2,
  description: 'Custom strategy.', bestFor: 'Specific use cases.',
};

function getStrategy(wm: WorldModel) {
  return STRATEGY_META[wm.growth_strategy] ?? DEFAULT_META;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt    = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const parseP = (s: string) => parseFloat(s.replace(/[+%\s]/g, '')) || 0;

const SCENARIO_COLORS = ['#FF5A1F', '#8EA885', '#7C3AED', '#EA580C', '#0EA5E9'];

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-warm-border rounded-xl px-3 py-2 shadow-xl text-[11px]">
      <div className="font-bold text-warm-text mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-warm-muted">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>
            {typeof p.value === 'number' ? `${p.value.toFixed(4)}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props { worldModels: WorldModel[] }

export default function WorldModelCompareView({ worldModels }: Props) {
  // Sort by scenario number ascending
  const sorted = [...worldModels].sort((a, b) => a.scenario_number - b.scenario_number);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#FAF9F7]/50 rounded-2xl border border-warm-border">
        <div className="h-12 w-12 rounded-xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center mb-3">
          <Scale className="h-6 w-6 text-[#FF5A1F]" />
        </div>
        <h4 className="text-base font-bold text-warm-text mb-1">No Scenarios to Compare Yet</h4>
        <p className="text-xs text-warm-muted max-w-sm">
          Run two or more optimization scenarios in chat (e.g. Balanced vs Front-Loaded vs Catch-Up) to compare strategies, iterations, and convergence side-by-side.
        </p>
      </div>
    );
  }

  // Best scenario = most converged + highest EGR achieved (closest to target)
  const best = sorted.reduce((acc, wm) => {
    const achieved = parseP(wm.optimization_result.final_egr_percentage);
    const target   = parseP(wm.egr_target_percentage);
    const delta    = Math.abs(achieved - target);
    const accDelta = Math.abs(parseP(acc.optimization_result.final_egr_percentage) - parseP(acc.egr_target_percentage));
    if (!acc.optimization_result.converged && wm.optimization_result.converged) return wm;
    if (acc.optimization_result.converged && !wm.optimization_result.converged) return acc;
    return delta < accDelta ? wm : acc;
  });

  // Latest scenario may have a comparison object
  const latestComparison = sorted.at(-1)?.comparison ?? null;

  // Bar chart data: EGR achieved per scenario
  const barData = sorted.map((wm, i) => ({
    name:     `S${wm.scenario_number}`,
    label:    wm.scenario_label || `Scenario ${wm.scenario_number}`,
    achieved: parseP(wm.optimization_result.final_egr_percentage),
    target:   parseP(wm.egr_target_percentage),
    color:    SCENARIO_COLORS[i % SCENARIO_COLORS.length],
  }));

  // Radar chart data: compare key dimensions
  const radarData = [
    {
      metric: 'EGR Accuracy',
      ...Object.fromEntries(sorted.map((wm, i) => {
        const achieved = parseP(wm.optimization_result.final_egr_percentage);
        const target   = parseP(wm.egr_target_percentage);
        const score    = Math.max(0, 100 - Math.abs(achieved - target) * 100);
        return [`S${wm.scenario_number}`, parseFloat(score.toFixed(1))];
      })),
    },
    {
      metric: 'Speed',
      ...Object.fromEntries(sorted.map((wm, i) => {
        const maxIter = Math.max(...sorted.map(w => w.optimization_result.iterations));
        const score   = ((maxIter - wm.optimization_result.iterations) / (maxIter || 1)) * 100;
        return [`S${wm.scenario_number}`, parseFloat(score.toFixed(1))];
      })),
    },
    {
      metric: 'Convergence',
      ...Object.fromEntries(sorted.map((wm, i) => [
        `S${wm.scenario_number}`,
        wm.optimization_result.converged ? 100 : 40,
      ])),
    },
    {
      metric: 'Precision',
      ...Object.fromEntries(sorted.map((wm, i) => {
        const err   = wm.optimization_result.convergence_error ?? 1;
        const score = Math.max(0, Math.min(100, (1 - err * 10000) * 100));
        return [`S${wm.scenario_number}`, parseFloat(score.toFixed(1))];
      })),
    },
  ];

  // Iteration comparison
  const iterData = sorted.map((wm, i) => ({
    name:       `S${wm.scenario_number}`,
    iterations: wm.optimization_result.iterations,
    color:      SCENARIO_COLORS[i % SCENARIO_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-6">

      {/* ── Winner banner ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
        style={{ backgroundColor: `${getStrategy(best).color}08`, borderColor: `${getStrategy(best).color}30` }}>
        <Trophy className="h-8 w-8 shrink-0" style={{ color: getStrategy(best).color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px] font-black text-warm-text">
            {React.createElement(getStrategy(best).Icon, { className: 'h-4 w-4 shrink-0', style: { color: getStrategy(best).color } })}
            Best Scenario: S{best.scenario_number} · {getStrategy(best).label}
          </div>
          <div className="text-[11px] text-warm-muted mt-0.5">
            Achieved {best.optimization_result.final_egr_percentage} (target {best.egr_target_percentage}) · {best.optimization_result.iterations} iterations ·{' '}
            {best.optimization_result.converged ? '✓ Converged' : '⚠ Not converged'}
          </div>
        </div>
        {latestComparison?.recommendation && (
          <div className="shrink-0 max-w-xs text-[10px] text-warm-muted leading-relaxed text-right hidden xl:block">
            {latestComparison.recommendation}
          </div>
        )}
      </div>

      {/* ── Scenario cards ─────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${sorted.length <= 2 ? 'grid-cols-2' : sorted.length === 3 ? 'grid-cols-3' : 'grid-cols-2 xl:grid-cols-4'}`}>
        {sorted.map((wm, i) => {
          const meta     = getStrategy(wm);
          const isBest   = wm.scenario_id === best.scenario_id;
          const achieved = parseP(wm.optimization_result.final_egr_percentage);
          const target   = parseP(wm.egr_target_percentage);

          return (
            <div key={wm.scenario_id}
              className="flex flex-col gap-3 px-4 py-4 bg-white rounded-2xl border shadow-sm"
              style={{ borderColor: isBest ? meta.color : '#EFECE8',
                boxShadow: isBest ? `0 0 0 2px ${meta.color}25` : undefined }}>

              {/* Scenario header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
                    style={{ backgroundColor: SCENARIO_COLORS[i % SCENARIO_COLORS.length] }}>
                    S{wm.scenario_number}
                  </span>
                  <span className="text-[11px] font-bold text-warm-text truncate">
                    {wm.scenario_label || `Scenario ${wm.scenario_number}`}
                  </span>
                </div>
                {isBest && <Trophy className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />}
              </div>

              {/* Strategy badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                style={{ backgroundColor: `${meta.color}12` }}>
                {React.createElement(meta.Icon, { className: 'h-3.5 w-3.5 shrink-0', style: { color: meta.color } })}
                <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5 px-2.5 py-2 bg-warm-bg rounded-xl">
                  <div className="text-[8px] text-warm-muted font-semibold uppercase tracking-wider">Target</div>
                  <div className="text-[15px] font-black text-warm-text">{wm.egr_target_percentage}</div>
                </div>
                <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-xl"
                  style={{ backgroundColor: wm.optimization_result.converged ? '#F0FDF4' : '#FFFBEB' }}>
                  <div className="text-[8px] font-semibold uppercase tracking-wider"
                    style={{ color: wm.optimization_result.converged ? '#16A34A' : '#B45309' }}>
                    Achieved
                  </div>
                  <div className="text-[15px] font-black" style={{ color: wm.optimization_result.converged ? '#16A34A' : '#D97706' }}>
                    {wm.optimization_result.final_egr_percentage}
                  </div>
                </div>
              </div>

              {/* Stat row */}
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 text-warm-muted">
                  <Zap className="h-3 w-3" />
                  <span>{wm.optimization_result.iterations} iter</span>
                </div>
                <div className="flex items-center gap-1">
                  {wm.optimization_result.converged
                    ? <CheckCircle className="h-3 w-3 text-green-500" />
                    : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  <span className={wm.optimization_result.converged ? 'text-green-600' : 'text-amber-600'}>
                    {wm.optimization_result.converged ? 'Converged' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* EGR achieved bar */}
        <div className="md:col-span-1 bg-white border border-warm-border/40 rounded-2xl p-4">
          <div className="text-[12px] font-bold text-warm-text mb-1">EGR Achieved</div>
          <div className="text-[10px] text-warm-muted mb-4">Final EGR % per scenario</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7E7770', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} domain={[0, 'auto']} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="achieved" radius={[6, 6, 0, 0]}
                label={{ position: 'top', fontSize: 10, fontWeight: 800,
                  formatter: ((v: any) => `${Number(v).toFixed(2)}%`) as any }}>
                {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Iteration speed bar */}
        <div className="md:col-span-1 bg-white border border-warm-border/40 rounded-2xl p-4">
          <div className="text-[12px] font-bold text-warm-text mb-1">Convergence Speed</div>
          <div className="text-[10px] text-warm-muted mb-4">Iterations to converge (lower = faster)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={iterData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EFECE8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7E7770', fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#7E7770' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="iterations" radius={[6, 6, 0, 0]}
                label={{ position: 'top', fontSize: 10, fontWeight: 800 }}>
                {iterData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div className="md:col-span-1 bg-white border border-warm-border/40 rounded-2xl p-4">
          <div className="text-[12px] font-bold text-warm-text mb-1">Performance Radar</div>
          <div className="text-[10px] text-warm-muted mb-2">Accuracy · Speed · Convergence · Precision</div>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#EFECE8" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: '#7E7770' }} />
              {sorted.map((wm, i) => (
                <Radar key={wm.scenario_id}
                  name={`S${wm.scenario_number}`}
                  dataKey={`S${wm.scenario_number}`}
                  stroke={SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
                  fill={SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
                  fillOpacity={0.12}
                  strokeWidth={2} />
              ))}
              <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Comparison table ───────────────────────────────────────────────── */}
      <div className="bg-white border border-warm-border/40 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-warm-border/30">
          <div className="text-[12px] font-bold text-warm-text">Scenario Comparison Table</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-warm-border/20 bg-warm-bg/50">
                <th className="px-4 py-2.5 text-left text-[9px] font-bold text-warm-muted uppercase tracking-wider">Metric</th>
                {sorted.map((wm, i) => (
                  <th key={wm.scenario_id} className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: SCENARIO_COLORS[i % SCENARIO_COLORS.length] }}>
                    S{wm.scenario_number} · {getStrategy(wm).label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Strategy',        getValue: (wm: WorldModel) => getStrategy(wm).label },
                { label: 'Target EGR',      getValue: (wm: WorldModel) => wm.egr_target_percentage },
                { label: 'Achieved EGR',    getValue: (wm: WorldModel) => wm.optimization_result.final_egr_percentage },
                { label: 'Status',          getValue: (wm: WorldModel) => wm.optimization_result.converged ? '✓ Converged' : '⚠ Pending' },
                { label: 'Iterations',      getValue: (wm: WorldModel) => String(wm.optimization_result.iterations) },
                { label: 'Precision Error', getValue: (wm: WorldModel) => wm.optimization_result.convergence_error != null ? wm.optimization_result.convergence_error.toExponential(2) : '—' },
              ].map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? 'bg-warm-bg/30' : 'bg-white'}>
                  <td className="px-4 py-2.5 text-[10px] font-bold text-warm-muted uppercase tracking-wider">{row.label}</td>
                  {sorted.map((wm, i) => {
                    const val     = row.getValue(wm);
                    const isBestS = wm.scenario_id === best.scenario_id;
                    return (
                      <td key={wm.scenario_id} className={`px-4 py-2.5 font-semibold ${isBestS ? 'font-black' : ''}`}
                        style={{ color: isBestS ? SCENARIO_COLORS[i % SCENARIO_COLORS.length] : '#2C2B29' }}>
                        {val}
                        {isBestS && ri === 0 && <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded bg-warm-border/30 text-warm-muted">BEST</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Strategy explanation cards ─────────────────────────────────────── */}
      <div>
        <div className="text-[12px] font-bold text-warm-text mb-3">What Each Strategy Did</div>
        <div className="flex flex-col gap-3">
          {sorted.map((wm, i) => {
            const meta = getStrategy(wm);
            return (
              <div key={wm.scenario_id}
                className="flex gap-4 px-4 py-4 rounded-2xl border bg-white"
                style={{ borderColor: `${meta.color}25` }}>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${meta.color}12` }}>
                  {React.createElement(meta.Icon, { className: 'h-5 w-5', style: { color: meta.color } })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-black text-warm-text">S{wm.scenario_number} — {meta.label}</span>
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border"
                      style={{ color: meta.color, borderColor: `${meta.color}40`, backgroundColor: `${meta.color}08` }}>
                      {wm.optimization_result.converged ? 'converged' : 'pending'}
                    </span>
                  </div>
                  <p className="text-[11px] text-warm-muted leading-relaxed mb-1.5">{meta.description}</p>
                  <div className="flex items-start gap-1.5 text-[10px]">
                    <Target className="h-3 w-3 shrink-0 mt-0.5" style={{ color: meta.color }} />
                    <span className="text-warm-text font-medium">{meta.bestFor}</span>
                  </div>
                  {wm.ds_decision?.data_insight && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-warm-bg border border-warm-border/30 text-[10px] text-warm-muted italic leading-relaxed">
                      "{wm.ds_decision.data_insight}"
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right flex flex-col gap-1">
                  <div className="text-[9px] text-warm-muted">Achieved</div>
                  <div className="text-[18px] font-black"
                    style={{ color: wm.optimization_result.converged ? '#16A34A' : '#D97706' }}>
                    {wm.optimization_result.final_egr_percentage}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-warm-muted">
                    <Clock className="h-3 w-3" />
                    <span>{wm.optimization_result.iterations} iter</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recommendation ─────────────────────────────────────────────────── */}
      {latestComparison?.recommendation && (
        <div className="flex gap-3 px-5 py-4 rounded-2xl border bg-white"
          style={{ borderColor: `${getStrategy(best).color}30`, backgroundColor: `${getStrategy(best).color}06` }}>
          <TrendingUp className="h-5 w-5 shrink-0 mt-0.5" style={{ color: getStrategy(best).color }} />
          <div>
            <div className="text-[11px] font-bold text-warm-text mb-1">AI Recommendation</div>
            <p className="text-[11px] text-warm-muted leading-relaxed">{latestComparison.recommendation}</p>
          </div>
        </div>
      )}

    </div>
  );
}
