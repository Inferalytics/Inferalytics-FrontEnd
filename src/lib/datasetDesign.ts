import type {
  DatasetDesign,
  DesignCellStatus,
  DesignDimension,
} from '../types/api.ts';

/** User-facing name for where a value came from. */
export const STATUS_LABEL: Record<DesignCellStatus, string> = {
  estimated: 'Estimate',
  interpolated: 'Interpolated',
  user: 'Your value',
  web: 'Web data',
  file: 'Your file',
  derived: 'Calculated',
};

/** Cell styling per status (legend swatches use the same classes). */
export const STATUS_CELL_CLASS: Record<DesignCellStatus, string> = {
  estimated: 'text-[#8A5A1C] italic bg-[#FFF7EC]',
  interpolated: 'text-[#3B5E8C] italic bg-[#EEF3FA]',
  user: 'text-[#2F5D2A] font-semibold bg-[#EFF4ED]',
  web: 'text-[#1E40AF] bg-[#EBF3FF]',
  file: 'text-[#0F766E] bg-[#ECFDF5]',
  derived: 'text-[#6B655F] bg-[#F4F2EE]',
};

/** Rows grouped in display order (groups appear in the order of their first row). */
export function groupDimensions(design: DatasetDesign): { group: string; dimensions: DesignDimension[] }[] {
  const groups: { group: string; dimensions: DesignDimension[] }[] = [];
  for (const dim of design.dimensions) {
    const existing = groups.find(g => g.group === dim.group);
    if (existing) existing.dimensions.push(dim);
    else groups.push({ group: dim.group, dimensions: [dim] });
  }
  return groups;
}

/** How many cells have each status. */
export function countByStatus(design: DatasetDesign): Record<DesignCellStatus, number> {
  const counts: Record<DesignCellStatus, number> = {
    estimated: 0, interpolated: 0, user: 0, web: 0, file: 0, derived: 0,
  };
  for (const row of Object.values(design.cells)) {
    for (const cell of Object.values(row)) counts[cell.status] += 1;
  }
  return counts;
}

export function formatDesignValue(value: number): string {
  const digits = Math.abs(value) >= 1000 ? 0 : 2;
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

const FORMULA_JOINER: Record<string, string> = {
  product: ' × ',
  sum: ' + ',
  difference: ' − ',
  ratio: ' ÷ ',
};

/** Short description of a calculated row, e.g. "Store count × Sales per store" or "Y/Y of Revenue". */
export function formulaLabel(design: DatasetDesign, dim: DesignDimension): string | null {
  if (!dim.formula) return null;
  const names = dim.formula.of.map(id => design.dimensions.find(d => d.id === id)?.name ?? id);
  if (dim.formula.op === 'yoy') return `Y/Y of ${names[0]}`;
  return names.join(FORMULA_JOINER[dim.formula.op] ?? ', ');
}

/**
 * Parse what the user typed into a cell.
 * Returns null to clear the cell, a number to save, or undefined when the text is not a number.
 */
export function parseCellInput(text: string): number | null | undefined {
  const cleaned = text.trim().replace(/[,\s$€£%]/g, '');
  if (cleaned === '') return null;
  if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The design as CSV: one row per dimension, one column per period. */
export function designToCsv(design: DatasetDesign): string {
  const header = ['Dimension', 'Unit', 'Group', ...design.periods.map(p => p.label)];
  const rows = design.dimensions.map(dim => {
    const cells = design.cells[dim.id] ?? {};
    return [dim.name, dim.unit, dim.group, ...design.periods.map(p => (cells[p.key] ? String(cells[p.key].value) : ''))];
  });
  return [header, ...rows].map(r => r.map(csvField).join(',')).join('\n');
}
