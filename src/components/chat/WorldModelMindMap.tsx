import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Cpu, FlaskConical, BarChart3, GitCompare, Check, X } from 'lucide-react';
import type { WorldModel, GrowthStrategy } from '../../types/api';

const STRATEGY_LABELS: Record<GrowthStrategy, string> = {
  balanced:     'Balanced',
  leader_led:   'Leader-Led',
  catch_up:     'Catch-Up',
  front_loaded: 'Front-Loaded',
  back_loaded:  'Back-Loaded',
};

const STRATEGY_COLORS: Record<GrowthStrategy, { border: string; bg: string; text: string }> = {
  balanced:     { border: '#6B7280', bg: '#6B728012', text: '#6B7280' },
  leader_led:   { border: '#2563EB', bg: '#2563EB10', text: '#2563EB' },
  catch_up:     { border: '#16A34A', bg: '#16A34A10', text: '#16A34A' },
  front_loaded: { border: '#D97706', bg: '#D9770610', text: '#D97706' },
  back_loaded:  { border: '#9333EA', bg: '#9333EA10', text: '#9333EA' },
};

// SVG connector — draws a small vertical segment with a dot in the middle
function Connector() {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="w-px h-4 bg-brand-indigo/20" />
      <div className="h-1.5 w-1.5 rounded-full bg-brand-indigo/30" />
      <div className="w-px h-4 bg-brand-indigo/20" />
    </div>
  );
}

interface Props {
  worldModel: WorldModel;
}

export default function WorldModelMindMap({ worldModel }: Props) {
  const [dsExpanded, setDsExpanded] = useState(false);
  const [deExpanded, setDeExpanded] = useState(false);
  const [compExpanded, setCompExpanded] = useState(false);

  const {
    optimization_result: opt,
    ds_decision: ds,
    de_decision: de,
    distribution_difference: dist,
    comparison,
    changes_from_previous: changes,
  } = worldModel;

  const isConverged = worldModel.status === 'converged';
  const sc = STRATEGY_COLORS[worldModel.growth_strategy] ?? STRATEGY_COLORS.balanced;
  const strategyLabel = STRATEGY_LABELS[worldModel.growth_strategy] ?? worldModel.growth_strategy;
  const egrReused = changes !== null && changes?.egr_target_delta === 0.0;

  return (
    <div className="flex flex-col items-center gap-0 rounded-xl border border-warm-border bg-white shadow-card overflow-hidden animate-float-up">

      {/* ── HUB NODE ─────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-br from-brand-indigo to-brand-indigo/80 px-4 py-4 text-white text-center">
        <div className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
          World Model · S{worldModel.scenario_number}
        </div>
        <div className="text-[32px] font-black leading-none tracking-tight">
          {worldModel.egr_target_percentage}
        </div>
        <div className="text-[11px] font-semibold opacity-75 mt-0.5">
          {worldModel.scenario_label}
        </div>
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-white/15 border border-white/25 backdrop-blur-sm">
            {strategyLabel}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border backdrop-blur-sm ${
            isConverged
              ? 'bg-green-400/20 border-green-300/40 text-green-100'
              : 'bg-amber-400/20 border-amber-300/40 text-amber-100'
          }`}>
            {isConverged ? '✓ Converged' : '⚠ Not converged'}
          </span>
        </div>
        {/* EGR reuse badge */}
        {egrReused && changes && (
          <div className="mt-2 text-[9px] opacity-60 italic">
            Same target reused from S{changes.previous_scenario_number}
            {changes.previous_scenario_label && ` (${changes.previous_scenario_label})`}
          </div>
        )}
      </div>

      {/* ── REASONING SUMMARY ────────────────────────────────── */}
      {worldModel.reasoning_summary && (
        <div className="w-full px-4 py-2.5 bg-lavender/10 border-b border-warm-border/20">
          <p className="text-[11px] text-warm-text/80 leading-relaxed italic">
            {worldModel.reasoning_summary}
          </p>
        </div>
      )}

      <div className="w-full flex flex-col items-center px-3 py-3 gap-0">

        {/* connector */}
        <Connector />

        {/* ── BRANCH ROW: DS + DE ──────────────────────────────── */}
        <div className="w-full flex gap-2">

          {/* DS Branch */}
          <button
            className="flex-1 text-left rounded-xl border-2 px-3 py-2.5 transition-all hover:shadow-sm cursor-pointer"
            style={{ borderColor: sc.border + '60', backgroundColor: sc.bg }}
            onClick={() => setDsExpanded(!dsExpanded)}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FlaskConical className="h-3 w-3 shrink-0" style={{ color: sc.text }} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-warm-muted">
                Data Scientist
              </span>
            </div>
            <div className="text-[11px] font-bold leading-tight mb-1" style={{ color: sc.text }}>
              {strategyLabel}
            </div>
            {ds ? (
              <>
                <p className={`text-[10px] text-warm-muted leading-snug ${dsExpanded ? '' : 'line-clamp-2'}`}>
                  {ds.reasoning}
                </p>
                {ds.data_insight && dsExpanded && (
                  <p className="text-[10px] text-warm-muted/70 italic mt-1 leading-snug border-t border-warm-border/30 pt-1">
                    {ds.data_insight}
                  </p>
                )}
                <div className="flex items-center gap-0.5 mt-1" style={{ color: sc.text }}>
                  {dsExpanded
                    ? <><ChevronUp className="h-2.5 w-2.5" /><span className="text-[9px] font-semibold">Less</span></>
                    : <><ChevronDown className="h-2.5 w-2.5" /><span className="text-[9px] font-semibold">Why?</span></>
                  }
                </div>
              </>
            ) : (
              <p className="text-[10px] text-warm-muted/60">Strategy chosen by AI</p>
            )}
          </button>

          {/* DE Branch */}
          {de ? (
            <button
              className="flex-1 text-left rounded-xl border-2 border-purple-200 bg-purple-50/50 px-3 py-2.5 transition-all hover:shadow-sm cursor-pointer"
              onClick={() => setDeExpanded(!deExpanded)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Cpu className="h-3 w-3 text-purple-500 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-warm-muted">
                  Data Engineer
                </span>
              </div>
              <div className="text-[11px] font-bold text-purple-600 leading-tight mb-1">
                LR {de.learning_rate_chosen}
              </div>
              <p className={`text-[10px] text-warm-muted leading-snug ${deExpanded ? '' : 'line-clamp-2'}`}>
                {de.reasoning || de.vector_modification || 'Parameters tuned for convergence'}
              </p>
              {de.vector_modification && deExpanded && (
                <p className="text-[10px] text-purple-600/70 italic mt-1 border-t border-purple-100 pt-1 leading-snug">
                  Vector: {de.vector_modification}
                </p>
              )}
              <div className="flex items-center gap-0.5 mt-1 text-purple-500">
                {deExpanded
                  ? <><ChevronUp className="h-2.5 w-2.5" /><span className="text-[9px] font-semibold">Less</span></>
                  : <><ChevronDown className="h-2.5 w-2.5" /><span className="text-[9px] font-semibold">How?</span></>
                }
              </div>
            </button>
          ) : (
            <div className="flex-1 rounded-xl border-2 border-dashed border-warm-border/30 px-3 py-2.5 flex flex-col items-center justify-center gap-1 text-center">
              <Cpu className="h-4 w-4 text-warm-muted/30" />
              <span className="text-[10px] text-warm-muted/40">DE params<br />not logged</span>
            </div>
          )}
        </div>

        {/* connector */}
        <Connector />

        {/* ── RESULT NODE ──────────────────────────────────────── */}
        <div className={`w-full rounded-xl border-2 px-4 py-3 text-center ${
          isConverged
            ? 'border-sage/40 bg-gradient-to-br from-sage/5 to-sage/10'
            : 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-amber-100/30'
        }`}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp className={`h-3.5 w-3.5 ${isConverged ? 'text-sage' : 'text-amber-500'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-warm-muted">
              Achieved EGR
            </span>
          </div>
          <div className={`text-[30px] font-black leading-none tracking-tight ${
            isConverged ? 'text-sage' : 'text-amber-600'
          }`}>
            {opt.final_egr_percentage}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] text-warm-muted">
            <span className="flex items-center gap-0.5">
              {isConverged
                ? <Check className="h-3 w-3 text-sage" />
                : <X className="h-3 w-3 text-amber-500" />
              }
              {isConverged ? 'Converged' : 'Not converged'}
            </span>
            <span>·</span>
            <span>{opt.iterations} iterations</span>
            {opt.convergence_error != null && (
              <>
                <span>·</span>
                <span>±{(opt.convergence_error * 100).toFixed(4)}%</span>
              </>
            )}
          </div>
        </div>

        {/* ── DISTRIBUTION DIFFERENCE (optional) ───────────────── */}
        {dist && (
          <>
            <Connector />
            <div className="w-full rounded-xl border border-warm-border/40 bg-warm-bg/30 px-4 py-2.5">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-3 w-3 text-brand-indigo shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-warm-muted">
                  vs Previous Scenario
                </span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                  dist.is_meaningfully_different
                    ? 'text-sage border-sage/30 bg-sage/5'
                    : 'text-amber-600 border-amber-200 bg-amber-50'
                }`}>
                  {dist.is_meaningfully_different ? 'Validated' : 'Marginal'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-white/60 rounded-lg px-2 py-1.5 border border-warm-border/20">
                  <div className="text-[9px] text-warm-muted">Shift</div>
                  <div className="text-[12px] font-bold text-warm-text">{dist.mard_percentage}</div>
                </div>
                <div className="bg-white/60 rounded-lg px-2 py-1.5 border border-warm-border/20">
                  <div className="text-[9px] text-warm-muted">Top Seg.</div>
                  <div className={`text-[12px] font-bold ${dist.top_quartile_share_delta >= 0 ? 'text-sage' : 'text-red-500'}`}>
                    {dist.top_quartile_share_delta >= 0 ? '+' : ''}{(dist.top_quartile_share_delta * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg px-2 py-1.5 border border-warm-border/20">
                  <div className="text-[9px] text-warm-muted">Bot. Seg.</div>
                  <div className={`text-[12px] font-bold ${dist.bottom_quartile_share_delta >= 0 ? 'text-sage' : 'text-red-500'}`}>
                    {dist.bottom_quartile_share_delta >= 0 ? '+' : ''}{(dist.bottom_quartile_share_delta * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              {dist.retry_was_needed && (
                <p className="text-[9px] text-amber-600 mt-1.5 leading-tight">
                  Optimised with enhanced parameters to ensure meaningful differentiation.
                </p>
              )}
              {dist.validation_verdict && (
                <p className="text-[9px] text-warm-muted/70 mt-1 leading-tight italic">
                  {dist.validation_verdict}
                </p>
              )}
            </div>
          </>
        )}

        {/* ── SCENARIO COMPARISON (optional) ───────────────────── */}
        {comparison && comparison.scenarios && comparison.scenarios.length > 0 && (
          <>
            <Connector />
            <div className="w-full rounded-xl border border-warm-border/40 bg-warm-bg/30 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold text-warm-text hover:bg-warm-bg/50 transition-colors cursor-pointer"
                onClick={() => setCompExpanded(!compExpanded)}
              >
                <div className="flex items-center gap-1.5">
                  <GitCompare className="h-3 w-3 text-brand-indigo" />
                  <span>Scenario Comparison ({comparison.total_scenarios})</span>
                </div>
                {compExpanded
                  ? <ChevronUp className="h-3 w-3 text-warm-muted" />
                  : <ChevronDown className="h-3 w-3 text-warm-muted" />
                }
              </button>

              {compExpanded && (
                <div className="px-3 pb-3">
                  <div className="rounded-lg border border-warm-border/30 overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-warm-bg/60">
                          <th className="text-left px-2 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[8px]">Rank</th>
                          <th className="text-left px-2 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[8px]">Scenario</th>
                          <th className="text-right px-2 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[8px]">Target</th>
                          <th className="text-right px-2 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[8px]">Got</th>
                          <th className="text-center px-2 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[8px]">✓</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.scenarios.map((s, idx) => (
                          <tr key={s.scenario_number} className={`border-t border-warm-border/20 ${idx === 0 ? 'bg-sage/5' : ''}`}>
                            <td className="px-2 py-1.5 text-center">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </td>
                            <td className="px-2 py-1.5 font-semibold text-warm-text">
                              S{s.scenario_number}
                            </td>
                            <td className="text-right px-2 py-1.5 text-warm-muted">{s.target_egr_percentage}</td>
                            <td className="text-right px-2 py-1.5 font-bold text-warm-text">{s.final_egr_percentage}</td>
                            <td className="text-center px-2 py-1.5">
                              {s.converged
                                ? <Check className="h-3 w-3 text-sage mx-auto" />
                                : <X className="h-3 w-3 text-amber-500 mx-auto" />
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {comparison.recommendation && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-sage/5 border border-sage/20">
                      <p className="text-[10px] text-sage font-semibold leading-relaxed">
                        ⭐ {comparison.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <div className="w-full px-4 py-2 bg-warm-bg/20 border-t border-warm-border/20 flex items-center justify-between text-[9px] text-warm-muted">
        <span>{worldModel.optimization_method === 'newton_raphson' ? 'Newton-Raphson' : worldModel.optimization_method}</span>
        <span>batch: {worldModel.batch_id.slice(0, 8)}…</span>
      </div>
    </div>
  );
}
