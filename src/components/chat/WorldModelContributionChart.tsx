/**
 * WorldModelContributionChart
 *
 * Interactive drill-down contribution chart explaining HOW the target EGR was achieved.
 *
 * Levels:
 *   Root  → macro_categories  (e.g. Regions)
 *   L1    → categories         (e.g. Periods inside a Region)
 *   L2    → data_points        (individual CSV rows)
 *
 * All labels and field names come from hierarchy_schema — nothing is hardcoded.
 */

import React, { useState } from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Info } from 'lucide-react';
import type {
  WorldModelTreeType,
  MacroCategory,
  TreeCategory,
  DataPoint,
} from '../../types/api';

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Parse "+2.63%" or "-1.5%" → signed float */
function parseP(s: string): number {
  return parseFloat(s.replace(/[+%\s]/g, ''));
}

/** Format a number with commas */
function fmtN(n: number, dec = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/** Tailwind color class for a signed value */
function signCls(v: number): string {
  return v > 0 ? 'text-green-600' : v < 0 ? 'text-red-500' : 'text-warm-muted';
}

/** Hex fill color for a signed value */
function barHex(v: number): string {
  return v >= 0 ? '#16A34A' : '#EF4444';
}

// ── Canonical item type used at every drill level ────────────────────────────

interface ChartItem {
  label: string;
  egrPct: number;       // signed float parsed from egr_contribution_pct
  egrPctStr: string;    // original string e.g. "+2.63%"
  changePct: string;    // e.g. "+14.2%"
  original: number;
  final: number;
  delta: number;
  childCount: number;   // 0 = leaf node
  childLabel: string;   // e.g. "periods" or "data points"
  isFixed: boolean;
}

// ── Map backend structures → ChartItem[] ────────────────────────────────────

function macrosToItems(
  macros: MacroCategory[],
  catField: string,
): ChartItem[] {
  return macros.map((m) => ({
    label: m.label,
    egrPct: parseP(m.egr_contribution_pct),
    egrPctStr: m.egr_contribution_pct,
    changePct: m.change_pct,
    original: m.original_value,
    final: m.final_value,
    delta: m.delta,
    childCount: m.categories_count,
    childLabel: catField.toLowerCase() + 's',
    isFixed: false,
  }));
}

function categoriesToItems(cats: TreeCategory[]): ChartItem[] {
  return cats.map((c) => ({
    label: c.label,
    egrPct: parseP(c.egr_contribution_pct),
    egrPctStr: c.egr_contribution_pct,
    changePct: c.change_pct,
    original: c.original_value,
    final: c.final_value,
    delta: c.delta,
    childCount: c.data_points_count,
    childLabel: 'data points',
    isFixed: false,
  }));
}

function dataPointsToItems(dps: DataPoint[]): ChartItem[] {
  return dps.map((dp) => ({
    label: dp.label,
    egrPct: parseP(dp.egr_contribution_pct),
    egrPctStr: dp.egr_contribution_pct,
    changePct: dp.change_pct,
    original: dp.original_value,
    final: dp.final_value,
    delta: dp.delta,
    childCount: 0,
    childLabel: '',
    isFixed: dp.status === 'fixed',
  }));
}

// ── Insight generator ────────────────────────────────────────────────────────

function buildInsight(
  items: ChartItem[],
  depth: number,
  macroField: string,
  catField: string,
  finalEgrPct: string,
): string {
  const pos = [...items].filter((i) => i.egrPct > 0).sort((a, b) => b.egrPct - a.egrPct);
  const neg = [...items].filter((i) => i.egrPct < 0).sort((a, b) => a.egrPct - b.egrPct);
  const top = pos[0];
  const drag = neg[0];

  const parts: string[] = [];

  if (!top) {
    if (drag) parts.push(`All groups reduced growth; ${drag.label} was the largest drag at ${drag.egrPctStr}.`);
    return parts.join(' ');
  }

  if (depth === 0) {
    parts.push(
      `${top.label} was the largest ${macroField.toLowerCase()} contributor at ${top.egrPctStr} of the ${finalEgrPct} total EGR.`,
    );
    if (drag) parts.push(`${drag.label} offset growth by ${drag.egrPctStr}.`);
    if (pos.length > 1)
      parts.push(`${pos.length} ${macroField.toLowerCase()}s drove growth; ${neg.length} were negative.`);
  } else if (depth === 1) {
    parts.push(`${top.label} was the strongest ${catField.toLowerCase()} at ${top.egrPctStr} EGR contribution.`);
    if (drag) parts.push(`${drag.label} dragged growth by ${drag.egrPctStr}.`);
  } else {
    parts.push(`${top.label} was the top data point, contributing ${top.egrPctStr} to EGR.`);
    if (drag) parts.push(`${drag.label} reduced EGR by ${drag.egrPctStr}.`);
  }

  return parts.join(' ');
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Inline detail card shown when an item is hovered */
function TooltipCard({ item }: { item: ChartItem }) {
  return (
    <div className="bg-white border border-warm-border rounded-xl px-4 py-3 shadow-md flex gap-5 flex-wrap text-[11px]">
      <div>
        <div className="text-[9px] font-bold uppercase text-warm-muted mb-0.5">Label</div>
        <div className="font-bold text-warm-text max-w-[180px] truncate">{item.label}</div>
      </div>
      <div>
        <div className="text-[9px] font-bold uppercase text-warm-muted mb-0.5">Original</div>
        <div className="font-mono">{fmtN(item.original, 0)}</div>
      </div>
      <div className="flex items-center text-warm-muted/40">→</div>
      <div>
        <div className="text-[9px] font-bold uppercase text-warm-muted mb-0.5">Final</div>
        <div className="font-mono">{fmtN(item.final, 0)}</div>
      </div>
      <div>
        <div className="text-[9px] font-bold uppercase text-warm-muted mb-0.5">Delta</div>
        <div className={`font-mono font-bold ${signCls(item.delta)}`}>
          {item.delta >= 0 ? '+' : ''}{fmtN(item.delta, 0)}
        </div>
      </div>
      <div>
        <div className="text-[9px] font-bold uppercase text-warm-muted mb-0.5">Change</div>
        <div className={`font-mono font-bold ${signCls(item.delta)}`}>{item.changePct}</div>
      </div>
      <div>
        <div className="text-[9px] font-bold uppercase text-warm-muted mb-0.5">EGR Contribution</div>
        <div className={`font-mono font-bold ${signCls(item.egrPct)}`}>{item.egrPctStr}</div>
      </div>
    </div>
  );
}

/** Single bar row in the chart */
function BarRow({
  item,
  maxAbs,
  onClick,
  isHovered,
  onHover,
}: {
  item: ChartItem;
  maxAbs: number;
  onClick: () => void;
  isHovered: boolean;
  onHover: (on: boolean) => void;
}) {
  const barPct = maxAbs > 0 ? (Math.abs(item.egrPct) / maxAbs) * 100 : 0;
  const canDrill = item.childCount > 0;

  return (
    <div
      role={canDrill ? 'button' : undefined}
      tabIndex={canDrill ? 0 : undefined}
      onKeyDown={canDrill ? (e) => e.key === 'Enter' && onClick() : undefined}
      onClick={canDrill ? onClick : undefined}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-all ${
        canDrill ? 'cursor-pointer' : 'cursor-default'
      } ${
        isHovered && canDrill
          ? 'border-brand-indigo/30 bg-brand-indigo/3 shadow-sm'
          : 'border-warm-border/30 bg-warm-bg/20 hover:border-warm-border/60'
      } ${item.isFixed ? 'opacity-40' : ''}`}
    >
      {/* Label column */}
      <div className="w-28 shrink-0">
        <div className="text-[11.5px] font-semibold text-warm-text truncate leading-tight">
          {item.label}
        </div>
        {item.isFixed ? (
          <div className="text-[9px] text-warm-muted">fixed / held constant</div>
        ) : item.childCount > 0 ? (
          <div className="text-[9px] text-warm-muted">
            {item.childCount} {item.childLabel}
          </div>
        ) : null}
      </div>

      {/* Bar */}
      <div className="flex-1 flex items-center">
        <div className="w-full h-5 rounded-full bg-warm-border/20 overflow-hidden relative">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
            style={{ width: `${barPct}%`, backgroundColor: barHex(item.egrPct) }}
          />
          {barPct > 22 && (
            <span className="absolute inset-0 flex items-center px-2.5">
              <span className="text-[9px] font-bold text-white drop-shadow-sm">
                {item.egrPctStr}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Values */}
      <div className="text-right shrink-0 w-[72px]">
        <div className={`text-[11px] font-bold font-mono leading-tight ${signCls(item.egrPct)}`}>
          {item.egrPctStr}
        </div>
        <div className="text-[9px] text-warm-muted font-mono leading-tight">{item.changePct}</div>
      </div>

      {/* Drill arrow */}
      <ChevronRight
        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
          canDrill
            ? isHovered
              ? 'text-brand-indigo'
              : 'text-warm-muted/40'
            : 'opacity-0'
        }`}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  tree: WorldModelTreeType;
}

export default function WorldModelContributionChart({ tree }: Props) {
  /**
   * path = [] → root (macros)
   * path = [i] → categories inside macro i
   * path = [i, j] → data points inside macro i, category j
   */
  const [path, setPath] = useState<number[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const schema = tree.hierarchy_schema;
  const macroField =
    schema.macro_field ??
    schema.levels.find((l) => l.level === 'macro_category')?.label ??
    'Group';
  const catField =
    schema.category_field ??
    schema.levels.find((l) => l.level === 'category')?.label ??
    'Period';

  // ── Resolve current items & breadcrumb labels ──────────────────────────

  let items: ChartItem[];
  let levelLabel: string;
  let breadcrumbs: string[] = [];

  if (path.length === 0) {
    items = macrosToItems(tree.macro_categories, catField);
    levelLabel = `${macroField} breakdown`;
  } else if (path.length === 1) {
    const macro = tree.macro_categories[path[0]];
    items = categoriesToItems(macro.categories);
    levelLabel = `${catField} breakdown · ${macro.label}`;
    breadcrumbs = [macro.label];
  } else {
    const macro = tree.macro_categories[path[0]];
    const cat = macro.categories[path[1]];
    items = dataPointsToItems(cat.data_points);
    levelLabel = `Data points · ${cat.label}`;
    breadcrumbs = [macro.label, cat.label];
  }

  const maxAbs = Math.max(...items.map((i) => Math.abs(i.egrPct)), 0.01);
  const positiveSum = items.reduce((a, i) => (i.egrPct > 0 ? a + i.egrPct : a), 0);
  const negativeSum = items.reduce((a, i) => (i.egrPct < 0 ? a + i.egrPct : a), 0);
  const netSum = items.reduce((a, i) => a + i.egrPct, 0);

  const insight = buildInsight(items, path.length, macroField, catField, tree.final_egr_pct);

  const navigateTo = (newPath: number[]) => {
    setPath(newPath);
    setHoveredIdx(null);
  };

  // ── Formula chips (root level only) ─────────────────────────────────────

  const formulaChips = tree.macro_categories.map((m) => ({
    label: m.label,
    pct: m.egr_contribution_pct,
    isPos: parseP(m.egr_contribution_pct) >= 0,
  }));

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-indigo to-brand-indigo/75 rounded-2xl px-5 py-4 text-white shadow-md">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">
          How We Achieved
        </div>
        <div className="flex items-end gap-4 flex-wrap mb-3">
          <div>
            <span className="text-[30px] font-black leading-none">{tree.final_egr_pct}</span>
            <span className="text-[14px] ml-1.5 opacity-50">EGR</span>
          </div>
          <div className="pb-0.5 text-[12px] opacity-50">target was {tree.target_egr_pct}</div>
          <div className={`pb-0.5 text-[12px] font-bold ml-auto ${tree.converged ? 'text-green-300' : 'text-amber-300'}`}>
            {tree.converged ? '✓ Converged' : '⚠ Not converged'}
          </div>
        </div>

        {/* Contribution formula */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {formulaChips.map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && <span className="opacity-35 text-[13px] font-light">+</span>}
              <button
                onClick={() => navigateTo([i])}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                  c.isPos
                    ? 'bg-white/15 border-white/20 text-white hover:bg-white/25'
                    : 'bg-red-400/20 border-red-300/30 text-red-200 hover:bg-red-400/30'
                }`}
              >
                {c.label}: {c.pct}
              </button>
            </React.Fragment>
          ))}
          <span className="opacity-35 text-[13px] font-light ml-0.5">=</span>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/25 border border-white/30 text-white">
            {tree.final_egr_pct} EGR
          </span>
        </div>
      </div>

      {/* ── Main chart card ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">

        {/* Breadcrumb bar */}
        <div className="px-4 py-2.5 border-b border-warm-border/30 flex items-center gap-1 flex-wrap min-h-[40px]">
          <button
            onClick={() => navigateTo([])}
            className={`text-[11px] font-semibold transition-colors cursor-pointer ${
              path.length === 0
                ? 'text-brand-indigo'
                : 'text-warm-muted hover:text-brand-indigo'
            }`}
          >
            All {macroField}s
          </button>

          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb}>
              <ChevronRight className="h-3 w-3 text-warm-muted/40 shrink-0" />
              <button
                onClick={() => navigateTo(path.slice(0, i + 1))}
                className={`text-[11px] font-semibold transition-colors cursor-pointer ${
                  i === breadcrumbs.length - 1
                    ? 'text-brand-indigo'
                    : 'text-warm-muted hover:text-brand-indigo'
                }`}
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}

          <span className="ml-auto text-[9px] text-warm-muted uppercase tracking-wider font-semibold">
            {levelLabel}
          </span>
        </div>

        {/* Legend row */}
        <div className="px-4 pt-3 flex items-center gap-4 text-[10px] text-warm-muted">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            Growth driver
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Drag / reduction
          </div>
          {path.length < 2 && (
            <div className="flex items-center gap-1.5 ml-auto text-brand-indigo/60">
              <Info className="h-3 w-3" />
              Click a row to drill down
            </div>
          )}
        </div>

        {/* Bar rows */}
        <div className="px-4 py-3 flex flex-col gap-1.5">
          {items.length === 0 && (
            <div className="text-[12px] text-warm-muted text-center py-6">No data available at this level.</div>
          )}

          {items.map((item, idx) => (
            <BarRow
              key={item.label + idx}
              item={item}
              maxAbs={maxAbs}
              isHovered={hoveredIdx === idx}
              onHover={(on) => setHoveredIdx(on ? idx : null)}
              onClick={() => {
                if (path.length === 0) navigateTo([idx]);
                else if (path.length === 1) navigateTo([path[0], idx]);
              }}
            />
          ))}

          {/* Summary footer */}
          {items.length > 1 && (
            <div className="mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-brand-indigo/4 border border-brand-indigo/12">
              <div className="w-28 shrink-0 text-[10px] font-bold text-brand-indigo">Net total</div>
              <div className="flex-1 flex items-center gap-3 text-[10px] font-mono">
                {positiveSum > 0 && (
                  <span className="text-green-600 font-bold">
                    +{fmtN(positiveSum)}% drivers
                  </span>
                )}
                {negativeSum < 0 && (
                  <span className="text-red-500 font-bold">
                    {fmtN(negativeSum)}% drag
                  </span>
                )}
              </div>
              <div className={`text-right shrink-0 w-[72px] text-[12px] font-black font-mono ${signCls(netSum)}`}>
                {netSum >= 0 ? '+' : ''}{fmtN(netSum)}%
              </div>
              <div className="w-3.5 shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* ── Tooltip detail card ───────────────────────────────────────────────── */}
      {hoveredIdx !== null && items[hoveredIdx] && (
        <TooltipCard item={items[hoveredIdx]} />
      )}

      {/* ── Top growth drivers quick list (root level only) ───────────────────── */}
      {path.length === 0 && tree.relationships.top_growth_drivers.length > 0 && (
        <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-warm-border/30 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-warm-text">Top Growth Drivers</div>
              <div className="text-[10px] text-warm-muted">Highest-contributing individual data points</div>
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {tree.relationships.top_growth_drivers.slice(0, 8).map((d, i) => {
              const pct = parseP(d.egr_contribution_pct);
              const barW = (pct / Math.max(...tree.relationships.top_growth_drivers.slice(0, 8).map(x => parseP(x.egr_contribution_pct)), 0.01)) * 100;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-warm-bg/40 transition-colors">
                  <span className="text-[9px] font-bold text-warm-muted/50 w-4 shrink-0 font-mono">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-warm-text truncate">{d.label}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-warm-border/20">
                      <div
                        className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold font-mono text-green-600">{d.egr_contribution_pct}</div>
                    <div className="text-[9px] text-warm-muted font-mono">{d.change_pct}</div>
                  </div>
                </div>
              );
            })}
            {tree.relationships.top_growth_drivers.length > 8 && (
              <div className="text-[10px] text-warm-muted text-center pt-1">
                +{tree.relationships.top_growth_drivers.length - 8} more — drill into a {macroField.toLowerCase()} to see all
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Top laggards (root level only) ──────────────────────────────────── */}
      {path.length === 0 && tree.relationships.top_laggards.length > 0 && (
        <div className="bg-white border border-warm-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-warm-border/30 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-warm-text">Growth Drags</div>
              <div className="text-[10px] text-warm-muted">Data points that offset EGR growth</div>
            </div>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <div className="px-4 py-3 flex flex-col gap-1.5">
            {tree.relationships.top_laggards.slice(0, 5).map((l, i) => {
              const pct = Math.abs(parseP(l.egr_contribution_pct));
              const barW = (pct / Math.max(...tree.relationships.top_laggards.slice(0, 5).map(x => Math.abs(parseP(x.egr_contribution_pct))), 0.01)) * 100;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-red-50/40 transition-colors">
                  <span className="text-[9px] font-bold text-warm-muted/50 w-4 shrink-0 font-mono">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-warm-text truncate">{l.label}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-warm-border/20">
                      <div
                        className="h-1.5 rounded-full bg-red-400 transition-all duration-500"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold font-mono text-red-500">{l.egr_contribution_pct}</div>
                    <div className="text-[9px] text-warm-muted font-mono">{l.change_pct}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Insight ──────────────────────────────────────────────────────────── */}
      {insight && (
        <div className="flex items-start gap-3 bg-brand-indigo/5 border border-brand-indigo/15 rounded-xl px-4 py-3">
          <Info className="h-3.5 w-3.5 text-brand-indigo/60 shrink-0 mt-0.5" />
          <p className="text-[11px] text-brand-indigo leading-relaxed">{insight}</p>
        </div>
      )}

    </div>
  );
}
