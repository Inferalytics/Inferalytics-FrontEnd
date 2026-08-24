/**
 * WorldModelTree — Interactive semantic hierarchy tree
 *
 * Shows the full breakdown of HOW the EGR was achieved:
 *   Root → MacroCategories (e.g. Region) → Categories (e.g. Period) → DataPoints
 *
 * The hierarchy labels come from hierarchy_schema.macro_field / category_field
 * dynamically — so it adapts to any dataset automatically.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Check, X } from 'lucide-react';
import type { WorldModelTreeType, MacroCategory, TreeCategory, DataPoint, MacroMetric } from '../../types/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function deltaColor(d: number) {
  if (d > 0) return 'text-sage';
  if (d < 0) return 'text-red-500';
  return 'text-warm-muted';
}

function deltaBg(d: number) {
  if (d > 0) return 'bg-sage/8 border-sage/20';
  if (d < 0) return 'bg-red-50 border-red-100';
  return 'bg-warm-bg/50 border-warm-border/30';
}

function DeltaIcon({ d, size = 'h-3 w-3' }: { d: number; size?: string }) {
  if (d > 0) return <TrendingUp className={`${size} text-sage`} />;
  if (d < 0) return <TrendingDown className={`${size} text-red-500`} />;
  return <Minus className={`${size} text-warm-muted`} />;
}

// Parse egr_contribution_pct like "+2.63%" → 2.63
function parseContrib(s: string): number {
  return Math.abs(parseFloat(s.replace('%', '')));
}

// Max contribution across all macros (for progress bar scaling)
function maxContrib(macros: MacroMetric[]): number {
  return Math.max(...macros.map(m => parseContrib(m.egr_contribution_pct)), 0.01);
}

// ── DataPoint row ─────────────────────────────────────────────────────────────

function DataPointRow({ dp }: { dp: DataPoint }) {
  const isFixed = dp.status === 'fixed';
  return (
    <div className={`flex items-start justify-between gap-3 py-2 px-3 rounded-lg border text-[11px] ${
      isFixed ? 'bg-warm-bg/30 border-warm-border/20 opacity-60' : deltaBg(dp.delta)
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-warm-text truncate">{dp.label}</span>
          {isFixed && (
            <span className="px-1 py-0.5 rounded text-[8px] font-bold uppercase bg-warm-muted/20 text-warm-muted">Fixed</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {Object.entries(dp.row_labels).map(([k, v]) => (
            <span key={k} className="text-[9px] text-warm-muted">
              <span className="font-semibold">{k}:</span> {v}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-warm-muted mt-0.5 font-mono">
          {fmt(dp.original_value)} → {fmt(dp.final_value)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-bold ${deltaColor(dp.delta)}`}>{dp.change_pct}</div>
        <div className="text-[9px] text-warm-muted">EGR: {dp.egr_contribution_pct}</div>
      </div>
    </div>
  );
}

// ── Category row (collapsible) ────────────────────────────────────────────────

function CategoryRow({
  cat,
  expanded,
  onToggle,
}: { cat: TreeCategory; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col">
      <button
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-warm-bg/40 hover:bg-warm-bg/70 border border-warm-border/30 transition-colors cursor-pointer text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-warm-muted shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-warm-muted shrink-0" />
          }
          <span className="text-[11.5px] font-semibold text-warm-text">{cat.label}</span>
          <span className="text-[9px] text-warm-muted bg-warm-bg border border-warm-border/40 px-1.5 py-0.5 rounded-full">
            {cat.data_points_count} pts
          </span>
        </div>
        <div className="text-right flex items-center gap-3 shrink-0">
          <div className="text-[10px] font-mono text-warm-muted hidden sm:block">
            {fmt(cat.original_value)} → {fmt(cat.final_value)}
          </div>
          <div>
            <div className={`text-[11px] font-bold ${deltaColor(cat.delta)}`}>{cat.change_pct}</div>
            <div className="text-[9px] text-warm-muted">{cat.egr_contribution_pct}</div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-2 ml-5 flex flex-col gap-1.5 pl-3 border-l-2 border-warm-border/30">
          {cat.data_points.map(dp => (
            <DataPointRow key={dp.vector_index} dp={dp} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Macro category row (collapsible) ──────────────────────────────────────────

function MacroCategoryRow({
  macro,
  macroField,
  macroExpanded,
  expandedCats,
  onToggleMacro,
  onToggleCat,
  maxContribPct,
}: {
  macro: MacroCategory;
  macroField: string;
  macroExpanded: boolean;
  expandedCats: Set<string>;
  onToggleMacro: () => void;
  onToggleCat: (label: string) => void;
  maxContribPct: number;
}) {
  const contrib = parseContrib(macro.egr_contribution_pct);
  const barWidth = Math.min((contrib / maxContribPct) * 100, 100);

  return (
    <div className="border border-warm-border/40 rounded-xl overflow-hidden shadow-sm">
      {/* Macro header */}
      <button
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors cursor-pointer text-left ${
          macroExpanded ? 'bg-brand-indigo/5 border-b border-brand-indigo/10' : 'bg-white hover:bg-warm-bg/30'
        }`}
        onClick={onToggleMacro}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {macroExpanded
            ? <ChevronDown className="h-4 w-4 text-brand-indigo shrink-0" />
            : <ChevronRight className="h-4 w-4 text-warm-muted shrink-0" />
          }
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-wider text-warm-muted">{macroField}</span>
              <span className="text-[13px] font-bold text-warm-text">{macro.label}</span>
              <span className="text-[9px] text-warm-muted bg-warm-bg border border-warm-border/40 px-1.5 py-0.5 rounded-full">
                {macro.categories_count} periods
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-warm-border/30 max-w-[120px]">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: macro.delta >= 0 ? '#16A34A' : '#EF4444',
                  }}
                />
              </div>
              <span className={`text-[9px] font-mono font-bold ${deltaColor(macro.delta)}`}>
                {macro.egr_contribution_pct}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 ml-4">
          <div className={`text-[13px] font-bold ${deltaColor(macro.delta)}`}>{macro.change_pct}</div>
          <div className="text-[10px] text-warm-muted font-mono">
            +{fmt(macro.delta)}
          </div>
        </div>
      </button>

      {/* Expanded: category rows */}
      {macroExpanded && (
        <div className="px-4 py-3 bg-white flex flex-col gap-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-warm-muted mb-1">
            {fmt(macro.original_value)} → {fmt(macro.final_value)} total
          </div>
          {macro.categories.map(cat => (
            <CategoryRow
              key={cat.label}
              cat={cat}
              expanded={expandedCats.has(cat.label)}
              onToggle={() => onToggleCat(cat.label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { tree: WorldModelTreeType }

export default function WorldModelTree({ tree }: Props) {
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(
    new Set(tree.macro_categories.slice(0, 1).map(m => m.label)) // first one open
  );
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [showAllLaggards, setShowAllLaggards] = useState(false);

  const schema = tree.hierarchy_schema;
  const rels   = tree.relationships;

  const macroField = schema.macro_field ?? schema.levels.find(l => l.level === 'macro_category')?.label ?? 'Group';
  const catField   = schema.category_field ?? schema.levels.find(l => l.level === 'category')?.label ?? 'Period';

  const maxC = maxContrib(rels.macro_growth_ranking);

  const toggleMacro = (label: string) =>
    setExpandedMacros(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const toggleCat = (label: string) =>
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const drivers  = showAllDrivers  ? rels.top_growth_drivers : rels.top_growth_drivers.slice(0, 5);
  const laggards = showAllLaggards ? rels.top_laggards       : rels.top_laggards.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">

      {/* ── ROOT: EGR metrics ───────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-indigo to-brand-indigo/80 rounded-2xl px-5 py-4 text-white shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">
              {tree.label}
            </div>
            <div className="flex items-end gap-3">
              <div>
                <div className="text-[10px] opacity-60 font-semibold">Target EGR</div>
                <div className="text-[28px] font-black leading-none">{tree.target_egr_pct}</div>
              </div>
              <div className="pb-1 opacity-50">→</div>
              <div>
                <div className="text-[10px] opacity-60 font-semibold">Achieved EGR</div>
                <div className={`text-[28px] font-black leading-none ${tree.converged ? 'text-green-300' : 'text-amber-300'}`}>
                  {tree.final_egr_pct}
                  <span className="text-[14px] ml-1">{tree.converged ? '✓' : '⚠'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] opacity-60 font-semibold mb-1">Totals</div>
            <div className="text-[11px] font-mono opacity-75">{fmt(tree.original_total)}</div>
            <div className="text-[11px] font-mono">→ {fmt(tree.final_total)}</div>
            <div className={`text-[12px] font-bold mt-0.5 ${tree.total_delta >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {tree.total_change_pct}
            </div>
          </div>
        </div>

        {/* Hierarchy schema badge */}
        {schema.is_semantic && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-50">Grouped by</span>
            {macroField && (
              <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-bold">
                {macroField}
              </span>
            )}
            {catField && macroField !== catField && (
              <>
                <span className="opacity-40 text-[10px]">›</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-bold">
                  {catField}
                </span>
              </>
            )}
            <span className="opacity-40 text-[10px]">›</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-bold">
              Data Points
            </span>
            <span className="ml-auto text-[9px] font-mono opacity-50">{rels.achieves_target_via.replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>

      {/* ── MACRO CONTRIBUTION RANKING ──────────────────────────────── */}
      {rels.macro_growth_ranking.length > 0 && (
        <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-warm-border/30">
            <div className="text-[11px] font-bold text-warm-text">{macroField} Contribution Ranking</div>
            <div className="text-[10px] text-warm-muted">Share of total EGR by {macroField.toLowerCase()}</div>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2.5">
            {rels.macro_growth_ranking.map((m, i) => {
              const contrib = parseContrib(m.egr_contribution_pct);
              const bar     = Math.min((contrib / maxC) * 100, 100);
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <div className="text-[10px] font-mono text-warm-muted w-4 shrink-0">{i + 1}</div>
                  <div className="w-20 text-[11px] font-semibold text-warm-text shrink-0 truncate">{m.label}</div>
                  <div className="flex-1 h-2 rounded-full bg-warm-border/30">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${bar}%`,
                        backgroundColor: m.delta >= 0 ? '#16A34A' : '#EF4444',
                      }}
                    />
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <div className={`text-[10px] font-bold font-mono ${deltaColor(m.delta)}`}>
                      {m.egr_contribution_pct}
                    </div>
                  </div>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                    m.role === 'driver'  ? 'bg-sage/10 text-sage border border-sage/20' :
                    m.role === 'laggard' ? 'bg-red-50 text-red-500 border border-red-100' :
                                           'bg-warm-bg text-warm-muted border border-warm-border/40'
                  }`}>
                    {m.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TOP GROWTH DRIVERS ──────────────────────────────────────── */}
      {drivers.length > 0 && (
        <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-warm-border/30 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-warm-text">Top Growth Drivers</div>
              <div className="text-[10px] text-warm-muted">Highest-contributing data points</div>
            </div>
            <TrendingUp className="h-4 w-4 text-sage" />
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {drivers.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg bg-sage/5 border border-sage/15">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-sage/60 mt-0.5 shrink-0">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-warm-text truncate">{d.label}</div>
                    <div className="text-[9px] text-warm-muted">{d.column}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-bold text-sage">{d.change_pct}</div>
                  <div className="text-[9px] text-warm-muted">EGR: {d.egr_contribution_pct}</div>
                </div>
              </div>
            ))}
            {rels.top_growth_drivers.length > 5 && (
              <button
                className="text-[10px] text-brand-indigo font-semibold hover:underline mt-1 cursor-pointer text-left"
                onClick={() => setShowAllDrivers(v => !v)}
              >
                {showAllDrivers ? 'Show less' : `Show all ${rels.top_growth_drivers.length} drivers`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── FULL HIERARCHY TREE ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-warm-text">Full Hierarchy</div>
            <div className="text-[10px] text-warm-muted">
              {macroField} → {catField} → Data Points · click to expand
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              className="text-[10px] text-brand-indigo font-semibold hover:underline cursor-pointer"
              onClick={() => setExpandedMacros(new Set(tree.macro_categories.map(m => m.label)))}
            >
              Expand all
            </button>
            <span className="text-warm-muted text-[10px]">·</span>
            <button
              className="text-[10px] text-warm-muted hover:text-warm-text cursor-pointer"
              onClick={() => { setExpandedMacros(new Set()); setExpandedCats(new Set()); }}
            >
              Collapse
            </button>
          </div>
        </div>

        {tree.macro_categories.map(macro => (
          <MacroCategoryRow
            key={macro.label}
            macro={macro}
            macroField={macroField}
            macroExpanded={expandedMacros.has(macro.label)}
            expandedCats={expandedCats}
            onToggleMacro={() => toggleMacro(macro.label)}
            onToggleCat={toggleCat}
            maxContribPct={maxC}
          />
        ))}
      </div>

      {/* ── TOP LAGGARDS ────────────────────────────────────────────── */}
      {laggards.length > 0 && (
        <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-warm-border/30 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-warm-text">Top Laggards</div>
              <div className="text-[10px] text-warm-muted">Data points with negative or low growth</div>
            </div>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {laggards.map((l, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg bg-red-50/60 border border-red-100">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-red-300 mt-0.5 shrink-0">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-warm-text truncate">{l.label}</div>
                    <div className="text-[9px] text-warm-muted">{l.column}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-bold text-red-500">{l.change_pct}</div>
                  <div className="text-[9px] text-warm-muted">EGR: {l.egr_contribution_pct}</div>
                </div>
              </div>
            ))}
            {rels.top_laggards.length > 5 && (
              <button
                className="text-[10px] text-brand-indigo font-semibold hover:underline mt-1 cursor-pointer text-left"
                onClick={() => setShowAllLaggards(v => !v)}
              >
                {showAllLaggards ? 'Show less' : `Show all ${rels.top_laggards.length} laggards`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Fixed points note ───────────────────────────────────────── */}
      {rels.fixed_points_count > 0 && (
        <div className="bg-warm-bg/50 border border-warm-border/40 rounded-xl px-4 py-3 text-[10.5px] text-warm-muted">
          <span className="font-semibold text-warm-text">{rels.fixed_points_count} data point{rels.fixed_points_count !== 1 ? 's' : ''} held constant</span>
          {' '}and excluded from optimization.
        </div>
      )}
    </div>
  );
}
