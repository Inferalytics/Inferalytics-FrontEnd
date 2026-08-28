import React, { useState } from 'react';
import { Check, X, TrendingUp, BarChart3, GitCompare, Layers, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { WorldModel, GrowthStrategy } from '../../types/api';

// ── Strategy display config (from guide §6) ─────────────────────────────────

const STRATEGY_LABELS: Record<GrowthStrategy, string> = {
  balanced:     "Balanced",
  leader_led:   "Leader-Led",
  catch_up:     "Catch-Up",
  front_loaded: "Front-Loaded",
  back_loaded:  "Back-Loaded",
};

const STRATEGY_COLORS: Record<GrowthStrategy, string> = {
  balanced:     "#6B7280",
  leader_led:   "#2563EB",
  catch_up:     "#16A34A",
  front_loaded: "#D97706",
  back_loaded:  "#9333EA",
};

const STRATEGY_DESCRIPTIONS: Record<GrowthStrategy, string> = {
  balanced:     "Uniform growth distributed equally across all segments",
  leader_led:   "Top-performing segments absorb more growth",
  catch_up:     "Lagging segments are prioritised for growth",
  front_loaded: "Earlier time periods carry proportionally more growth",
  back_loaded:  "Later time periods carry proportionally more growth",
};

// ── Component ────────────────────────────────────────────────────────────────

interface WorldModelCardProps {
  worldModel: WorldModel;
}

export default function WorldModelCard({ worldModel }: WorldModelCardProps) {
  const {
    optimization_result: opt,
    distribution_difference: dist,
    comparison,
    changes_from_previous: changes,
    ds_decision: ds,
  } = worldModel;

  const [showStrategy, setShowStrategy] = useState(false);

  const strategyLabel = STRATEGY_LABELS[worldModel.growth_strategy] || worldModel.growth_strategy;
  const strategyColor = STRATEGY_COLORS[worldModel.growth_strategy] || '#6B7280';
  const strategyDesc = STRATEGY_DESCRIPTIONS[worldModel.growth_strategy] || '';

  const isConverged = worldModel.status === 'converged';

  // EGR reuse detection (guide §5)
  const egrWasReused = changes !== null && changes.egr_target_delta === 0.0;

  return (
    <div className="mt-2 rounded-xl border border-warm-border bg-white shadow-card overflow-hidden animate-float-up">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-gradient-to-r from-lavender/30 to-peach-light/40 border-b border-warm-border/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-brand-indigo/10 flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-brand-indigo" />
          </div>
          <div>
            <div className="text-[12px] font-bold text-warm-text leading-tight flex items-center gap-1.5">
              <span className="text-brand-indigo">S{worldModel.scenario_number}</span>
              {worldModel.scenario_label}
            </div>
            <div className="text-[10px] text-warm-muted leading-tight mt-0.5">
              World Model Result
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Strategy chip with color */}
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
            style={{ color: strategyColor, borderColor: `${strategyColor}40`, backgroundColor: `${strategyColor}10` }}
            title={strategyDesc}
          >
            {strategyLabel}
          </span>
          {/* Convergence badge */}
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
            isConverged
              ? 'bg-sage/10 text-sage border-sage/30'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            {isConverged ? 'Converged' : 'Non-converged'}
          </span>
        </div>
      </div>

      {/* ── EGR Row ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center gap-4 border-b border-warm-border/30">
        <TrendingUp className="h-4 w-4 text-brand-indigo shrink-0" />
        <div className="flex-1 grid grid-cols-3 gap-3">
          <div>
            <div className="text-[9px] font-bold text-warm-muted uppercase tracking-wider">Target EGR</div>
            <div className="text-[14px] font-extrabold text-warm-text">{worldModel.egr_target_percentage}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-warm-muted uppercase tracking-wider">Achieved EGR</div>
            <div className={`text-[14px] font-extrabold ${isConverged ? 'text-sage' : 'text-amber-600'}`}>
              {opt.final_egr_percentage}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-warm-muted uppercase tracking-wider">Iterations</div>
            <div className="text-[14px] font-extrabold text-warm-text">{opt.iterations}</div>
          </div>
        </div>
      </div>

      {/* ── EGR Reuse / Changes from Previous (guide §5) ──────────────── */}
      {changes && (
        <div className="px-4 py-2 border-b border-warm-border/30 flex items-center gap-2 text-[11px]">
          <Info className="h-3.5 w-3.5 text-warm-muted shrink-0" />
          {egrWasReused ? (
            <span className="text-warm-muted">
              Same <strong className="text-warm-text">{worldModel.egr_target_percentage}</strong> target reused from{' '}
              <strong className="text-warm-text">Scenario {changes.previous_scenario_number}</strong>
              {changes.previous_scenario_label && ` (${changes.previous_scenario_label})`}
            </span>
          ) : (
            <span className="text-warm-muted">
              Target changed by <strong className="text-warm-text">{changes.egr_target_delta > 0 ? '+' : ''}{(changes.egr_target_delta * 100).toFixed(2)}pp</strong>{' '}
              from Scenario {changes.previous_scenario_number}
              {changes.previous_scenario_label && ` (${changes.previous_scenario_label})`}
            </span>
          )}
        </div>
      )}

      {/* ── Reasoning Summary ──────────────────────────────────────────── */}
      {worldModel.reasoning_summary && (
        <div className="px-4 py-2.5 border-b border-warm-border/30">
          <p className="text-[11px] text-warm-text leading-relaxed">{worldModel.reasoning_summary}</p>
        </div>
      )}

      {/* ── "Why this strategy?" expandable (ds_decision) ──────────────── */}
      {ds && (
        <div className="border-b border-warm-border/30">
          <button
            onClick={() => setShowStrategy(!showStrategy)}
            className="w-full px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-brand-indigo hover:bg-warm-bg/30 transition-colors cursor-pointer"
          >
            <span>Why this strategy?</span>
            {showStrategy ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showStrategy && (
            <div className="px-4 pb-3 flex flex-col gap-2">
              <p className="text-[11px] text-warm-text leading-relaxed">{ds.reasoning}</p>
              {ds.data_insight && (
                <p className="text-[10px] text-warm-muted leading-relaxed italic">
                  Data insight: {ds.data_insight}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Distribution Difference (guide §7 — Scenario 2+ only) ──────── */}
      {dist && (
        <div className="px-4 py-3 border-b border-warm-border/30">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-brand-indigo" />
            <span className="text-[10px] font-bold text-warm-text uppercase tracking-wider">vs Previous Scenario</span>
            {/* Validation badge */}
            <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
              dist.is_meaningfully_different
                ? (dist.retry_was_needed
                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-sage/10 text-sage border-sage/30')
                : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              {dist.is_meaningfully_different ? 'Validated' : 'Marginal'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-warm-bg/50 rounded-lg px-2.5 py-1.5 border border-warm-border/30">
              <div className="text-[9px] text-warm-muted font-semibold">Distribution Shift</div>
              <div className="text-[12px] font-bold text-warm-text">{dist.mard_percentage}</div>
            </div>
            <div className="bg-warm-bg/50 rounded-lg px-2.5 py-1.5 border border-warm-border/30">
              <div className="text-[9px] text-warm-muted font-semibold">Top Segments</div>
              <div className={`text-[12px] font-bold ${dist.top_quartile_share_delta >= 0 ? 'text-sage' : 'text-red-500'}`}>
                {dist.top_quartile_share_delta >= 0 ? '+' : ''}{(dist.top_quartile_share_delta * 100).toFixed(1)}% share
              </div>
            </div>
            <div className="bg-warm-bg/50 rounded-lg px-2.5 py-1.5 border border-warm-border/30">
              <div className="text-[9px] text-warm-muted font-semibold">Bottom Segments</div>
              <div className={`text-[12px] font-bold ${dist.bottom_quartile_share_delta >= 0 ? 'text-sage' : 'text-red-500'}`}>
                {dist.bottom_quartile_share_delta >= 0 ? '+' : ''}{(dist.bottom_quartile_share_delta * 100).toFixed(1)}% share
              </div>
            </div>
          </div>
          {dist.retry_was_needed && (
            <p className="text-[10px] text-amber-600 mt-2 leading-relaxed">
              Optimised with enhanced parameters to ensure meaningful differentiation.
            </p>
          )}
          {dist.validation_verdict && (
            <p className="text-[10px] text-warm-muted mt-1 leading-relaxed italic" title={dist.validation_verdict}>
              {dist.validation_verdict}
            </p>
          )}
        </div>
      )}

      {/* ── Scenario Comparison Table (guide §8) ──────────────────────── */}
      {comparison && comparison.scenarios && comparison.scenarios.length > 0 && (
        <div className="px-4 py-3 border-b border-warm-border/30">
          <div className="flex items-center gap-2 mb-2">
            <GitCompare className="h-3.5 w-3.5 text-brand-indigo" />
            <span className="text-[10px] font-bold text-warm-text uppercase tracking-wider">
              Scenario Comparison ({comparison.total_scenarios})
            </span>
          </div>
          <div className="rounded-lg border border-warm-border/40 overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-warm-bg/50">
                  <th className="text-left px-2.5 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[9px]">Rank</th>
                  <th className="text-left px-2.5 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[9px]">Scenario</th>
                  <th className="text-right px-2.5 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[9px]">Target</th>
                  <th className="text-right px-2.5 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[9px]">Achieved</th>
                  <th className="text-right px-2.5 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[9px]">Iters</th>
                  <th className="text-center px-2.5 py-1.5 font-bold text-warm-muted uppercase tracking-wider text-[9px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {comparison.scenarios.map((sc, idx) => (
                  <tr
                    key={sc.scenario_number}
                    className={`border-t border-warm-border/20 ${idx === 0 ? 'bg-sage/5' : ''}`}
                  >
                    <td className="px-2.5 py-1.5 text-center">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </td>
                    <td className="px-2.5 py-1.5 font-semibold text-warm-text">
                      S{sc.scenario_number} — {sc.scenario_label || 'Unnamed'}
                    </td>
                    <td className="text-right px-2.5 py-1.5 text-warm-muted">{sc.target_egr_percentage}</td>
                    <td className="text-right px-2.5 py-1.5 font-bold text-warm-text">{sc.final_egr_percentage}</td>
                    <td className="text-right px-2.5 py-1.5 text-warm-muted">{sc.iterations}</td>
                    <td className="text-center px-2.5 py-1.5">
                      {sc.converged ? (
                        <Check className="h-3.5 w-3.5 text-sage mx-auto" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Recommendation callout */}
          {comparison.recommendation && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-sage/5 border border-sage/20">
              <p className="text-[11px] text-sage font-semibold leading-relaxed">
                ⭐ {comparison.recommendation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Convergence precision footer ───────────────────────────────── */}
      {opt.convergence_error != null && (
        <div className="px-4 py-2 bg-warm-bg/20 flex items-center justify-between text-[10px] text-warm-muted">
          <span>Precision: ±{(opt.convergence_error * 100).toFixed(4)}%</span>
          <span>{worldModel.optimization_method === 'newton_raphson' ? 'Newton-Raphson' : worldModel.optimization_method}</span>
        </div>
      )}
    </div>
  );
}
