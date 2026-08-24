/**
 * WorldModelGraph — Card-based knowledge graph (matches IPS Engine style)
 *
 * Renders the same white dimension-cards + bezier connections as the IPS
 * Engine, but read-only and enriched with the WorldModel result:
 *
 *   • Dimension cards  — one per data segment/parameter, footer shows impact level
 *   • Strategy card    — why this growth distribution was chosen
 *   • EGR card         — target vs achieved, convergence, iterations
 *   • Bezier edges     — thickness ∝ segment impact under the chosen strategy
 *
 * Below the canvas: a "How Growth Was Achieved" detail panel with DS/DE
 * reasoning, distribution shift, scenario comparison, and recommendation.
 */

import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { WorldModel, GrowthStrategy } from '../../types/api';
import { directBezier, getVerticalBezierPath } from '../layout/panels/bezierUtils';

// ── Strategy config ──────────────────────────────────────────────────────────

const SC: Record<GrowthStrategy, { color: string; light: string; label: string }> = {
  balanced:     { color: '#6B7280', light: '#F9FAFB', label: 'Balanced'     },
  leader_led:   { color: '#2563EB', light: '#EFF6FF', label: 'Leader-Led'   },
  catch_up:     { color: '#16A34A', light: '#F0FDF4', label: 'Catch-Up'     },
  front_loaded: { color: '#D97706', light: '#FFFBEB', label: 'Front-Loaded' },
  back_loaded:  { color: '#9333EA', light: '#FAF5FF', label: 'Back-Loaded'  },
};

// ── Card dimensions (matches OptimisePanel) ──────────────────────────────────

const CARD_W  = 196;
const CARD_H  = 118;
const COL_W   = 240;
const ROW_H   = 158;
const COLS    = 3;
const PAD_X   = 40;
const PAD_Y   = 32;
const EGR_COL = 1; // center column for EGR card

// ── Impact per slot under each strategy ────────────────────────────────────
// Segments are ordered: first half = "left" (leaders/early), second half = "right"

function segmentImpact(strategy: GrowthStrategy, idx: number, total: number): number {
  const half   = total / 2;
  const isLeft = idx < half;
  switch (strategy) {
    case 'leader_led':   return isLeft ? 1.0 : 0.30;
    case 'catch_up':     return isLeft ? 0.30 : 1.0;
    case 'front_loaded': return idx < Math.ceil(half / 2) ? 1.0 : 0.45;
    case 'back_loaded':  return idx >= total - Math.ceil(half / 2) ? 1.0 : 0.45;
    default:             return 0.75;
  }
}

function impactLabel(v: number) {
  if (v >= 0.85) return 'HIGH';
  if (v >= 0.55) return 'MED';
  return 'LOW';
}

// ── Bezier path helpers ──────────────────────────────────────────────────────

function hPath(fx: number, fy: number, tx: number, ty: number) {
  return directBezier(fx + CARD_W, fy + CARD_H / 2, tx, ty + CARD_H / 2);
}

function vPath(fx: number, fy: number, tx: number, ty: number) {
  return getVerticalBezierPath(fx, fy, tx, ty);
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { worldModel: WorldModel }

export default function WorldModelGraph({ worldModel }: Props) {
  const { setup } = useStore();
  const [dsExpanded, setDsExpanded] = useState(false);
  const [deExpanded, setDeExpanded] = useState(false);
  const [compExpanded, setCompExpanded] = useState(true);

  const wm  = worldModel;
  const opt = wm.optimization_result;
  const ds  = wm.ds_decision;
  const de  = wm.de_decision;
  const dist = wm.distribution_difference;
  const cmp  = wm.comparison;

  const isConverged = wm.status === 'converged';
  const sc = SC[wm.growth_strategy] ?? SC.balanced;

  // Segments from store or fallback
  const rawSegs: string[] =
    setup.segments.length > 0
      ? setup.segments
      : ['Region', 'Department', 'Service_Type'];

  // Build card list: Quarter + segments + EGR
  interface CardDef {
    id: string;
    name: string;
    type: 'numeric' | 'categorical' | 'date' | 'strategy' | 'egr';
    badge?: string;
    lines: string[];
    impact?: number;
  }

  const segCards: CardDef[] = rawSegs.map((seg, i) => ({
    id:     `seg-${i}`,
    name:   seg,
    type:   'categorical',
    lines:  ['Vectorised ✓'],
    impact: segmentImpact(wm.growth_strategy, i, rawSegs.length),
  }));

  const allCards: CardDef[] = [
    {
      id:    'qtr',
      name:  'Quarter',
      type:  'date',
      lines: setup.timeRange
        ? [setup.timeRange.split(' → ')[0] || 'Q1_2020', setup.timeRange.split(' → ')[1] || 'Q4_2024']
        : ['01_2020', '04_2024'],
    },
    ...segCards,
    {
      id:    'strategy',
      name:  sc.label + ' Strategy',
      type:  'strategy',
      badge: 'STRATEGY',
      lines: ds ? [ds.reasoning.slice(0, 80) + (ds.reasoning.length > 80 ? '…' : '')] : ['AI-selected strategy'],
    },
    {
      id:    'egr',
      name:  'EGR Estimate',
      type:  'egr',
      badge: 'NUMERIC',
      lines: [
        `target: ${wm.egr_target_percentage}`,
        `achieved: ${opt.final_egr_percentage}`,
      ],
    },
  ];

  // Compute grid positions (EGR always centered at bottom)
  const nonEgrCards = allCards.filter(c => c.id !== 'egr');
  const positions: Record<string, { x: number; y: number }> = {};
  nonEgrCards.forEach((card, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    positions[card.id] = { x: PAD_X + col * COL_W, y: PAD_Y + row * ROW_H };
  });
  const rows = Math.ceil(nonEgrCards.length / COLS);
  positions['egr'] = { x: PAD_X + EGR_COL * COL_W, y: PAD_Y + rows * ROW_H };

  const canvasH = PAD_Y + (rows + 1) * ROW_H + CARD_H + 24;

  // Build bezier edges
  interface Edge { id: string; from: string; to: string; color: string; weight: number; dashed: boolean; impact?: number }
  const edges: Edge[] = [];

  // Quarter → first segment
  if (positions['qtr'] && positions['seg-0']) {
    edges.push({ id: 'qtr-seg0', from: 'qtr', to: 'seg-0', color: '#6E69BE', weight: 2.0, dashed: false });
  }

  // Segments → EGR (color + weight by impact)
  segCards.forEach(s => {
    if (!positions[s.id] || !positions['egr']) return;
    const imp = s.impact ?? 0.75;
    edges.push({
      id:     `${s.id}-egr`,
      from:   s.id,
      to:     'egr',
      color:  sc.color,
      weight: 1.2 + imp * 3.2,
      dashed: true,
      impact: imp,
    });
  });

  // Strategy → EGR
  if (positions['strategy'] && positions['egr']) {
    edges.push({ id: 'strategy-egr', from: 'strategy', to: 'egr', color: sc.color, weight: 2.8, dashed: false });
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Canvas ──────────────────────────────────────────────────── */}
      <div className="relative overflow-x-auto no-scrollbar">
        <div className="relative min-w-[760px]" style={{ height: canvasH }}>

          {/* SVG connections layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" overflow="visible">
            {edges.map(edge => {
              const fp = positions[edge.from];
              const tp = positions[edge.to];
              if (!fp || !tp) return null;

              const sameCol = Math.abs((fp.x + CARD_W / 2) - (tp.x + CARD_W / 2)) < 40;
              const d = sameCol
                ? vPath(fp.x, fp.y, tp.x, tp.y)
                : hPath(fp.x, fp.y, tp.x, tp.y);

              return (
                <g key={edge.id}>
                  <path
                    d={d}
                    stroke={edge.color}
                    strokeWidth={edge.weight}
                    strokeOpacity={0.5 + (edge.impact ?? 0.5) * 0.5}
                    strokeDasharray={edge.dashed ? '5 4' : undefined}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Origin dot */}
                  <circle
                    cx={fp.x + CARD_W} cy={fp.y + CARD_H / 2}
                    r={3}
                    fill={edge.color}
                    fillOpacity={0.7}
                  />
                  {/* Target dot */}
                  <circle
                    cx={tp.x} cy={tp.y + CARD_H / 2}
                    r={3}
                    fill="white"
                    stroke={edge.color}
                    strokeWidth={1.8}
                    strokeOpacity={0.8}
                  />
                </g>
              );
            })}
          </svg>

          {/* Dimension cards */}
          {allCards.map(card => {
            const pos = positions[card.id];
            if (!pos) return null;

            const isEgr      = card.id === 'egr';
            const isStrategy = card.type === 'strategy';
            const impact     = card.impact;

            // Border color
            const borderCls = isEgr
              ? isConverged
                ? 'border-sage ring-2 ring-sage/20'
                : 'border-amber-400 ring-2 ring-amber-200'
              : isStrategy
                ? 'border-2'
                : 'border-warm-border';

            return (
              <div
                key={card.id}
                className={`absolute bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col z-20 select-none ${borderCls}`}
                style={{
                  left: pos.x,
                  top:  pos.y,
                  width: CARD_W,
                  borderColor: isStrategy ? sc.color : undefined,
                }}
              >
                {/* Card header */}
                <div className="p-3 pb-2 flex flex-col gap-1 font-sans">
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] font-bold text-warm-text truncate max-w-[160px] leading-tight">
                      {card.name}
                    </span>
                    {isEgr && (
                      isConverged
                        ? <Check className="h-3.5 w-3.5 text-sage shrink-0" />
                        : <X className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>
                  {/* Type badge */}
                  <span className={`w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    isEgr        ? 'bg-lavender/30 text-brand-indigo' :
                    isStrategy   ? 'text-white'                        :
                    card.type === 'numeric'     ? 'bg-lavender/30 text-brand-indigo' :
                    card.type === 'categorical' ? 'bg-amber-50 text-amber-600'       :
                                                  'bg-sage/10 text-sage'
                  }`}
                  style={isStrategy ? { backgroundColor: sc.color } : undefined}>
                    {isStrategy ? card.badge ?? 'STRATEGY' :
                     card.type === 'categorical' ? 'CATEGORICAL' :
                     card.type === 'numeric'     ? 'NUMERIC'     :
                     card.type === 'date'        ? 'DATE'        : 'NUMERIC'}
                  </span>
                </div>

                {/* Card body */}
                <div className="px-3 pb-2 flex flex-col gap-0.5 border-b border-warm-border/30 flex-1">
                  {card.lines.map((line, li) => (
                    <span key={li} className={`text-[10.5px] font-mono leading-snug truncate ${
                      isEgr && li === 1
                        ? isConverged ? 'text-sage font-bold' : 'text-amber-600 font-bold'
                        : 'text-warm-muted'
                    }`}>
                      {line}
                    </span>
                  ))}
                </div>

                {/* Card footer */}
                <div className={`px-3 py-1.5 flex items-center gap-1.5 ${
                  isEgr      ? isConverged ? 'bg-sage/5' : 'bg-amber-50/60'  :
                  isStrategy ? 'bg-opacity-10'                                 :
                               'bg-warm-bg/40'
                }`}
                style={isStrategy ? { backgroundColor: sc.color + '12' } : undefined}>
                  {isEgr ? (
                    <>
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isConverged ? 'bg-sage animate-pulse' : 'bg-amber-400'}`} />
                      <span className={`text-[10px] font-mono ${isConverged ? 'text-sage' : 'text-amber-600'}`}>
                        {isConverged ? `Converged · ${opt.iterations} iters` : `Not converged · ${opt.iterations} iters`}
                      </span>
                    </>
                  ) : isStrategy ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: sc.color }} />
                      <span className="text-[10px] font-mono font-semibold" style={{ color: sc.color }}>
                        S{wm.scenario_number} · Active
                      </span>
                    </>
                  ) : impact !== undefined ? (
                    <>
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: sc.color, opacity: 0.4 + impact * 0.6 }}
                      />
                      <span className="text-[10px] font-mono" style={{ color: sc.color, opacity: 0.6 + impact * 0.4 }}>
                        {impactLabel(impact)} impact · Vectorised ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse shrink-0" />
                      <span className="text-[10px] font-mono text-warm-muted">Vectorised ✓</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── HOW GROWTH WAS ACHIEVED ─────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-warm-muted px-1">
          How This Growth Was Achieved
        </div>

        {/* DS Decision */}
        {ds && (
          <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
            <button
              className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-warm-bg/30 transition-colors"
              onClick={() => setDsExpanded(v => !v)}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[11px]" style={{ backgroundColor: sc.color + '20' }}>
                  <span style={{ color: sc.color }}>DS</span>
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-warm-text">Data Scientist — {sc.label} Strategy</div>
                  <div className="text-[10px] text-warm-muted">Why this approach was chosen for {wm.scenario_label}</div>
                </div>
              </div>
              {dsExpanded ? <ChevronUp className="h-4 w-4 text-warm-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-warm-muted shrink-0" />}
            </button>
            {dsExpanded && (
              <div className="px-4 pb-4 border-t border-warm-border/30 pt-3 flex flex-col gap-2">
                <p className="text-[12px] text-warm-text leading-relaxed">{ds.reasoning}</p>
                {ds.data_insight && (
                  <div className="bg-warm-bg/60 border border-warm-border/40 rounded-lg px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-warm-muted mb-1">Data Insight</div>
                    <p className="text-[11px] text-warm-muted italic leading-relaxed">{ds.data_insight}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DE Decision */}
        {de && (
          <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
            <button
              className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-warm-bg/30 transition-colors"
              onClick={() => setDeExpanded(v => !v)}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-purple-50 flex items-center justify-center text-[11px] text-purple-600 font-bold">
                  DE
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-warm-text">Data Engineer — LR {de.learning_rate_chosen} · Newton-Raphson</div>
                  <div className="text-[10px] text-warm-muted">How the optimisation parameters were tuned</div>
                </div>
              </div>
              {deExpanded ? <ChevronUp className="h-4 w-4 text-warm-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-warm-muted shrink-0" />}
            </button>
            {deExpanded && (
              <div className="px-4 pb-4 border-t border-warm-border/30 pt-3 flex flex-col gap-2">
                <p className="text-[12px] text-warm-text leading-relaxed">{de.reasoning || 'Parameters tuned for convergence stability.'}</p>
                {de.vector_modification && (
                  <div className="bg-purple-50/60 border border-purple-100 rounded-lg px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-purple-400 mb-1">Vector Modification</div>
                    <p className="text-[11px] text-purple-600 font-mono leading-relaxed">{de.vector_modification}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { label: 'Learning Rate', value: String(de.learning_rate_chosen) },
                    { label: 'Iterations',    value: String(opt.iterations) },
                    { label: 'Precision',     value: opt.convergence_error != null ? `±${(opt.convergence_error * 100).toFixed(4)}%` : '—' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg border border-warm-border/40 px-2.5 py-2 text-center">
                      <div className="text-[9px] text-warm-muted uppercase tracking-wider">{s.label}</div>
                      <div className="text-[12px] font-bold text-warm-text mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Distribution Difference */}
        {dist && (
          <div className="bg-white border border-warm-border rounded-xl px-4 py-3 shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-warm-text">Distribution Shift vs Previous Scenario</div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                dist.is_meaningfully_different
                  ? 'text-sage border-sage/30 bg-sage/5'
                  : 'text-amber-600 border-amber-200 bg-amber-50'
              }`}>
                {dist.is_meaningfully_different ? 'Validated' : 'Marginal'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'MARD Shift',     value: dist.mard_percentage },
                { label: 'Top Segments',   value: `${dist.top_quartile_share_delta >= 0 ? '+' : ''}${(dist.top_quartile_share_delta * 100).toFixed(1)}%`,  pos: dist.top_quartile_share_delta >= 0 },
                { label: 'Bot Segments',   value: `${dist.bottom_quartile_share_delta >= 0 ? '+' : ''}${(dist.bottom_quartile_share_delta * 100).toFixed(1)}%`, pos: dist.bottom_quartile_share_delta >= 0 },
              ].map(s => (
                <div key={s.label} className="bg-warm-bg/50 rounded-lg px-2.5 py-2 border border-warm-border/30 text-center">
                  <div className="text-[9px] text-warm-muted">{s.label}</div>
                  <div className={`text-[13px] font-bold mt-0.5 ${'pos' in s ? (s.pos ? 'text-sage' : 'text-red-500') : 'text-warm-text'}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            {dist.validation_verdict && (
              <p className="text-[10px] text-warm-muted italic leading-relaxed">{dist.validation_verdict}</p>
            )}
          </div>
        )}

        {/* Scenario Comparison */}
        {cmp && cmp.scenarios.length > 0 && (
          <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
            <button
              className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-warm-bg/30 transition-colors"
              onClick={() => setCompExpanded(v => !v)}
            >
              <div className="text-[11px] font-bold text-warm-text">
                Scenario Comparison ({cmp.total_scenarios})
              </div>
              {compExpanded ? <ChevronUp className="h-4 w-4 text-warm-muted" /> : <ChevronDown className="h-4 w-4 text-warm-muted" />}
            </button>
            {compExpanded && (
              <div className="border-t border-warm-border/30">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-warm-bg/50">
                      {['Rank', 'Scenario', 'Target', 'Achieved', 'Iters', ''].map(h => (
                        <th key={h} className={`px-3 py-2 font-bold text-warm-muted uppercase tracking-wider text-[9px] ${h === 'Target' || h === 'Achieved' || h === 'Iters' ? 'text-right' : h === '' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cmp.scenarios.map((s, i) => (
                      <tr key={s.scenario_number} className={`border-t border-warm-border/20 ${i === 0 ? 'bg-sage/5' : ''}`}>
                        <td className="px-3 py-2 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</td>
                        <td className="px-3 py-2 font-semibold text-warm-text">S{s.scenario_number} — {s.scenario_label || 'Unnamed'}</td>
                        <td className="px-3 py-2 text-right text-warm-muted">{s.target_egr_percentage}</td>
                        <td className="px-3 py-2 text-right font-bold text-warm-text">{s.final_egr_percentage}</td>
                        <td className="px-3 py-2 text-right text-warm-muted">{s.iterations}</td>
                        <td className="px-3 py-2 text-center">
                          {s.converged
                            ? <Check className="h-3.5 w-3.5 text-sage mx-auto" />
                            : <X    className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cmp.recommendation && (
                  <div className="px-4 py-3 bg-sage/5 border-t border-sage/20">
                    <p className="text-[11px] text-sage font-semibold leading-relaxed">⭐ {cmp.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reasoning summary */}
        {wm.reasoning_summary && (
          <div className="bg-brand-indigo/5 border border-brand-indigo/15 rounded-xl px-4 py-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-brand-indigo/60 mb-1">AI Reasoning</div>
            <p className="text-[11.5px] text-warm-text leading-relaxed">{wm.reasoning_summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
