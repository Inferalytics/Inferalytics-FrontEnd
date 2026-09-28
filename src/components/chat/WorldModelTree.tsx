/**
 * WorldModelTree — Visual hierarchical tree
 *
 * Shows EGR Root → MacroCategories → Categories → DataPoints
 * with classic ├─ └─ connector lines between every level.
 *
 * The hierarchy labels come from hierarchy_schema — nothing is hardcoded.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Globe, ExternalLink, Edit3, HelpCircle } from 'lucide-react';
import type { WorldModelTreeType, MacroCategory, TreeCategory, DataPoint, MacroMetric } from '../../types/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function deltaColor(d: number) {
  if (d > 0) return 'text-green-600';
  if (d < 0) return 'text-red-500';
  return 'text-warm-muted';
}

function parseContrib(s: string): number {
  return Math.abs(parseFloat(s.replace('%', '')));
}

function maxContrib(macros: MacroMetric[]): number {
  return Math.max(...macros.map(m => parseContrib(m.egr_contribution_pct)), 0.01);
}

function getHostname(urlStr?: string): string {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return urlStr;
  }
}

function formatMacroLabel(label: string): string {
  if (label === 'web') return 'Web Benchmarks';
  if (label === 'not_found') return 'Not Found (Web)';
  return label;
}

// ── Tree connector line component ─────────────────────────────────────────────
// Renders the ├─ or └─ branch for a given item

function TreeBranch({ isLast }: { isLast: boolean }) {
  return (
    <div className="relative shrink-0 w-7 self-stretch">
      {/* Vertical line — full height for ├, half height for └ */}
      <div
        className="absolute left-3 top-0 w-px bg-warm-border/60"
        style={{ height: isLast ? '50%' : '100%' }}
      />
      {/* Horizontal arm */}
      <div className="absolute left-3 top-1/2 w-4 h-px bg-warm-border/60" />
    </div>
  );
}

// Vertical continuation line (when a parent is NOT the last child — keeps the line running down)
function TreeLine() {
  return (
    <div className="relative shrink-0 w-7 self-stretch">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-warm-border/60" />
    </div>
  );
}

// ── DataPoint leaf node ───────────────────────────────────────────────────────

function DataPointNode({
  dp,
  isLast,
  indent,
}: { dp: DataPoint; isLast: boolean; indent: boolean }) {
  const isFixed = dp.status === 'fixed';
  const sign    = dp.delta >= 0 ? '+' : '';

  // Filter technical keys from generic row_labels tag cloud if provenance exists
  const technicalKeys = new Set(['source_type', 'source_url', 'source_name', 'collected_at']);
  const displayRowLabels = Object.entries(dp.row_labels || {}).filter(([k]) => !dp.provenance || !technicalKeys.has(k));

  const prov = dp.provenance;
  const host = prov?.source_url ? getHostname(prov.source_url) : (prov?.source_name || 'Web');

  return (
    <div className="flex items-start">
      <TreeBranch isLast={isLast} />

      <div className={`flex-1 flex items-start justify-between gap-2 my-0.5 px-3 py-2 rounded-lg border text-[11px] min-w-0 ${
        isFixed
          ? 'bg-warm-bg/20 border-warm-border/20 opacity-50'
          : dp.delta > 0
            ? 'bg-green-50/60 border-green-100/60'
            : dp.delta < 0
              ? 'bg-red-50/50 border-red-100/50'
              : 'bg-white border-warm-border/30'
      }`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-warm-text truncate">{dp.label}</span>
            {isFixed && (
              <span className="px-1 py-0.5 rounded text-[8px] font-bold uppercase bg-warm-muted/20 text-warm-muted">fixed</span>
            )}

            {/* Provenance Badge */}
            {prov && (
              prov.source_type === 'web' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                  <Globe className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                  {prov.source_url ? (
                    <a
                      href={prov.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 hover:underline font-semibold"
                      title={prov.source_name ? `${prov.source_name} (${prov.source_url})` : prov.source_url}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {host}
                      <ExternalLink className="h-2 w-2 opacity-70" />
                    </a>
                  ) : (
                    <span>{prov.source_name || 'Web Benchmark'}</span>
                  )}
                  {prov.confidence != null && (
                    <span
                      className={`ml-0.5 px-1 py-0.2 rounded text-[8px] font-bold font-mono ${
                        prov.confidence >= 0.7 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}
                      title={`Extraction confidence: ${(prov.confidence * 100).toFixed(0)}%`}
                    >
                      {(prov.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </span>
              ) : prov.source_type === 'not_found' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  <HelpCircle className="h-2.5 w-2.5 text-gray-400" />
                  <span>Not found on web</span>
                </span>
              ) : prov.source_type === 'user_edit' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <Edit3 className="h-2.5 w-2.5 text-amber-500" />
                  <span>Edited</span>
                  {prov.previous_value != null && (
                    <span className="text-[8px] text-amber-600/80 font-mono">(was {fmt(prov.previous_value)})</span>
                  )}
                </span>
              ) : null
            )}
          </div>

          {/* Row labels */}
          {displayRowLabels.length > 0 && (
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {displayRowLabels.map(([k, v]) => (
                <span key={k} className="text-[9px] px-1.5 py-0.2 rounded bg-warm-bg/70 border border-warm-border/40 text-warm-text/80">
                  <span className="font-semibold text-warm-muted">{k}:</span> {v}
                </span>
              ))}
            </div>
          )}

          <div className="text-[9px] font-mono text-warm-muted mt-1">
            {fmt(dp.original_value)} → {fmt(dp.final_value)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-bold ${deltaColor(dp.delta)}`}>{sign}{dp.change_pct}</div>
          <div className="text-[9px] text-warm-muted">EGR {dp.egr_contribution_pct}</div>
        </div>
      </div>
    </div>
  );
}

// ── Category node (collapsible, shows DataPoints) ─────────────────────────────

function CategoryNode({
  cat,
  isLast,
  expanded,
  onToggle,
}: { cat: TreeCategory; isLast: boolean; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col">
      {/* Category header row */}
      <div className="flex items-stretch">
        <TreeBranch isLast={isLast && !expanded} />

        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between my-0.5 px-3 py-2 rounded-lg bg-white border border-warm-border/40 hover:border-brand-indigo/30 hover:bg-brand-indigo/2 transition-colors cursor-pointer text-left shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            {expanded
              ? <ChevronDown className="h-3 w-3 text-brand-indigo shrink-0" />
              : <ChevronRight className="h-3 w-3 text-warm-muted shrink-0" />}
            <span className="text-[11.5px] font-semibold text-warm-text truncate">{cat.label}</span>
            <span className="text-[9px] text-warm-muted bg-warm-bg border border-warm-border/40 px-1.5 py-0.5 rounded-full shrink-0">
              {cat.data_points_count} pts
            </span>
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className={`text-[11px] font-bold ${deltaColor(cat.delta)}`}>{cat.change_pct}</div>
            <div className="text-[9px] text-warm-muted">{cat.egr_contribution_pct}</div>
          </div>
        </button>
      </div>

      {/* Children data points */}
      {expanded && (
        <div className="flex">
          {/* Vertical line continuation from parent */}
          {!isLast && <TreeLine />}
          {isLast  && <div className="w-7 shrink-0" />}

          <div className="flex-1 flex flex-col">
            {cat.data_points.map((dp, i) => (
              <DataPointNode
                key={dp.vector_index}
                dp={dp}
                isLast={i === cat.data_points.length - 1}
                indent={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MacroCategory node (collapsible, shows Categories) ───────────────────────

function MacroNode({
  macro,
  macroField,
  isLast,
  expanded,
  expandedCats,
  maxC,
  onToggle,
  onToggleCat,
}: {
  macro: MacroCategory;
  macroField: string;
  isLast: boolean;
  expanded: boolean;
  expandedCats: Set<string>;
  maxC: number;
  onToggle: () => void;
  onToggleCat: (label: string) => void;
}) {
  const contrib  = parseContrib(macro.egr_contribution_pct);
  const barWidth = Math.min((contrib / maxC) * 100, 100);

  return (
    <div className="flex flex-col">
      {/* Macro header */}
      <div className="flex items-stretch">
        <TreeBranch isLast={isLast && !expanded} />

        <button
          onClick={onToggle}
          className={`flex-1 flex items-center justify-between my-1 px-4 py-3 rounded-xl border transition-colors cursor-pointer text-left shadow-sm ${
            expanded
              ? 'bg-brand-indigo/6 border-brand-indigo/25 shadow-md'
              : 'bg-white border-warm-border/50 hover:border-brand-indigo/30 hover:bg-brand-indigo/2'
          }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {expanded
              ? <ChevronDown className="h-4 w-4 text-brand-indigo shrink-0" />
              : <ChevronRight className="h-4 w-4 text-warm-muted shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-wider text-warm-muted">{macroField}</span>
                <span className="text-[13px] font-bold text-warm-text">{formatMacroLabel(macro.label)}</span>
                <span className="text-[9px] text-warm-muted bg-warm-bg border border-warm-border/40 px-1.5 py-0.5 rounded-full">
                  {macro.categories_count} sub-groups
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 max-w-[160px]">
                <div className="flex-1 h-1.5 rounded-full bg-warm-border/30">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: macro.delta >= 0 ? '#16A34A' : '#EF4444' }}
                  />
                </div>
                <span className={`text-[9px] font-mono font-bold shrink-0 ${deltaColor(macro.delta)}`}>
                  {macro.egr_contribution_pct}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className={`text-[13px] font-bold ${deltaColor(macro.delta)}`}>{macro.change_pct}</div>
            <div className="text-[10px] text-warm-muted font-mono">{fmt(macro.original_value)} → {fmt(macro.final_value)}</div>
          </div>
        </button>
      </div>

      {/* Children categories */}
      {expanded && (
        <div className="flex">
          {!isLast && <TreeLine />}
          {isLast  && <div className="w-7 shrink-0" />}

          <div className="flex-1 flex flex-col">
            {macro.categories.map((cat, i) => (
              <CategoryNode
                key={cat.label}
                cat={cat}
                isLast={i === macro.categories.length - 1}
                expanded={expandedCats.has(cat.label)}
                onToggle={() => onToggleCat(cat.label)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { tree: WorldModelTreeType }

export default function WorldModelTree({ tree }: Props) {
  const [expandedMacros, setExpandedMacros] = useState<Set<string>>(
    new Set(tree.macro_categories.slice(0, 1).map(m => m.label))
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
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{tree.label}</div>
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

        {/* Hierarchy path badge */}
        {schema.is_semantic && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-50">Grouped by</span>
            {macroField && (
              <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-bold">{macroField}</span>
            )}
            {catField && macroField !== catField && (
              <>
                <span className="opacity-40 text-[10px]">›</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-bold">{catField}</span>
              </>
            )}
            <span className="opacity-40 text-[10px]">›</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-bold">Data Points</span>
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
                  <div className="w-20 text-[11px] font-semibold text-warm-text shrink-0 truncate">{formatMacroLabel(m.label)}</div>
                  <div className="flex-1 h-2 rounded-full bg-warm-border/30">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${bar}%`, backgroundColor: m.delta >= 0 ? '#16A34A' : '#EF4444' }} />
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <div className={`text-[10px] font-bold font-mono ${deltaColor(m.delta)}`}>{m.egr_contribution_pct}</div>
                  </div>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                    m.role === 'driver'  ? 'bg-green-50 text-green-600 border border-green-100' :
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
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            {drivers.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg bg-green-50/60 border border-green-100/60">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-green-400 mt-0.5 shrink-0">#{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-warm-text truncate">{d.label}</div>
                    <div className="text-[9px] text-warm-muted">{d.column}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-bold text-green-600">{d.change_pct}</div>
                  <div className="text-[9px] text-warm-muted">EGR: {d.egr_contribution_pct}</div>
                </div>
              </div>
            ))}
            {rels.top_growth_drivers.length > 5 && (
              <button className="text-[10px] text-brand-indigo font-semibold hover:underline mt-1 cursor-pointer text-left"
                onClick={() => setShowAllDrivers(v => !v)}>
                {showAllDrivers ? 'Show less' : `Show all ${rels.top_growth_drivers.length} drivers`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── VISUAL TREE HIERARCHY ───────────────────────────────────── */}
      <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
        {/* Tree header */}
        <div className="px-4 py-3 border-b border-warm-border/30 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-warm-text">Full Hierarchy</div>
            <div className="text-[10px] text-warm-muted">
              {macroField} → {catField} → Data Points · click any node to expand
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="text-[10px] text-brand-indigo font-semibold hover:underline cursor-pointer"
              onClick={() => {
                setExpandedMacros(new Set(tree.macro_categories.map(m => m.label)));
                setExpandedCats(new Set(
                  tree.macro_categories.flatMap(m => m.categories.map(c => c.label))
                ));
              }}
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

        {/* Root node */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-indigo text-white shadow-md mb-1">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">EGR Root</div>
              <div className="text-[14px] font-black leading-tight">{tree.label}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[20px] font-black leading-none">{tree.final_egr_pct}</div>
              <div className="text-[9px] opacity-60">target {tree.target_egr_pct}</div>
            </div>
          </div>

          {/* MacroCategory nodes, connected to root */}
          <div className="flex">
            {/* Left spacer (no connector from root) */}
            <div className="w-7 shrink-0 relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-warm-border/60" />
            </div>
            <div className="flex-1 flex flex-col py-1">
              {tree.macro_categories.map((macro, i) => (
                <MacroNode
                  key={macro.label}
                  macro={macro}
                  macroField={macroField}
                  isLast={i === tree.macro_categories.length - 1}
                  expanded={expandedMacros.has(macro.label)}
                  expandedCats={expandedCats}
                  maxC={maxC}
                  onToggle={() => toggleMacro(macro.label)}
                  onToggleCat={toggleCat}
                />
              ))}
            </div>
          </div>
        </div>
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
              <button className="text-[10px] text-brand-indigo font-semibold hover:underline mt-1 cursor-pointer text-left"
                onClick={() => setShowAllLaggards(v => !v)}>
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
          {' '}and excluded from optimisation.
        </div>
      )}
    </div>
  );
}
