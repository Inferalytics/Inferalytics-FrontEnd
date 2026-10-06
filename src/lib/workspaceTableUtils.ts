import type { WorkspaceTable, WorkspaceTableColumn, WorkspaceTableRow } from '../types/api';

/**
 * Filter columns so only "item" and columns that have at least one non-null/non-empty value
 * across non-separator rows are displayed.
 */
export function getVisibleColumns(
  columns?: WorkspaceTableColumn[] | null,
  rows?: WorkspaceTableRow[] | null
): WorkspaceTableColumn[] {
  if (!columns || columns.length === 0) return [];
  if (!rows || rows.length === 0) return columns;

  return columns.filter(col =>
    col.id === 'item' ||
    rows.some(r => r._type !== 'separator' && r[col.id] !== undefined && r[col.id] !== null && r[col.id] !== '')
  );
}

/**
 * Check if a row is a section divider / separator row.
 */
export function isSeparatorRow(row: WorkspaceTableRow): boolean {
  return row._type === 'separator' || (typeof row.id === 'string' && row.id.startsWith('_sep_'));
}

/**
 * Check if a row represents Web Benchmark research scraped from the web.
 */
export function isWebBenchmarkRow(row: WorkspaceTableRow): boolean {
  return !isSeparatorRow(row) && typeof row.id === 'string' && row.id.startsWith('web_');
}

/**
 * Check if a row represents uploaded file CSV/Excel data.
 */
export function isFileDataRow(row: WorkspaceTableRow): boolean {
  return !isSeparatorRow(row) && typeof row.id === 'string' && row.id.startsWith('file_');
}

/**
 * Check if a row represents scenario/meta/target rows.
 */
export function isScenarioMetaRow(row: WorkspaceTableRow): boolean {
  return !isSeparatorRow(row) && !isWebBenchmarkRow(row) && !isFileDataRow(row);
}

/**
 * Categorize a column ID into functional groups for styling and badging.
 */
export type ColumnCategory = 'item' | 'web' | 'file' | 'scenario' | 'forecast' | 'meta';

const WEB_BENCHMARK_COLS = new Set(['Value', 'Unit', 'Domain', 'source_name', 'confidence']);

export function categorizeColumn(colId: string): ColumnCategory {
  if (colId === 'item') return 'item';
  if (colId.startsWith('web_') || WEB_BENCHMARK_COLS.has(colId)) return 'web';
  if (colId.startsWith('file_')) return 'file';
  if (colId.startsWith('scenario_') || colId.startsWith('target_') || colId.startsWith('what_if_')) return 'scenario';
  if (colId.startsWith('forecast_')) return 'forecast';
  return 'meta';
}

/**
 * Clean separator item strings, e.g. "── Web Research: e-commerce ──" -> "Web Research: e-commerce"
 */
export function cleanSeparatorLabel(item: string): string {
  if (!item) return '';
  return item.replace(/^[─\-\s]+|[─\-\s]+$/g, '').trim() || item;
}

export interface FormattedCell {
  display: string;
  raw: any;
  isMuted: boolean;
  isBoolean?: boolean;
  boolVal?: boolean;
  isNumber?: boolean;
}

/**
 * Format a cell value according to its data type, column, and row context.
 */
export function formatTableCellValue(val: any, colId?: string): FormattedCell {
  if (val === undefined || val === null || val === '') {
    return { display: '—', raw: val, isMuted: true };
  }

  if (typeof val === 'boolean') {
    return {
      display: val ? 'Converged' : 'False',
      raw: val,
      isMuted: false,
      isBoolean: true,
      boolVal: val,
    };
  }

  if (typeof val === 'number') {
    if (isNaN(val)) {
      return { display: '—', raw: val, isMuted: true };
    }

    // Format percentages
    const isPct = colId === 'growth_pct' || (typeof colId === 'string' && (colId.endsWith('_pct') || colId.includes('percentage')));
    if (isPct) {
      return {
        display: `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`,
        raw: val,
        isMuted: false,
        isNumber: true,
      };
    }

    // Integer vs decimal formatting
    const formatted = Number.isInteger(val)
      ? val.toLocaleString('en-US')
      : Math.abs(val) < 10
      ? val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 4 })
      : val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

    return {
      display: formatted,
      raw: val,
      isMuted: false,
      isNumber: true,
    };
  }

  return {
    display: String(val),
    raw: val,
    isMuted: false,
  };
}

/**
 * Export WorkspaceTable to CSV string respecting visible columns and section headers.
 */
export function exportWorkspaceTableToCsv(table: WorkspaceTable): string {
  const visibleCols = getVisibleColumns(table.columns, table.rows);
  if (visibleCols.length === 0) return '';

  const headerRow = visibleCols.map(c => `"${(c.name || c.id).replace(/"/g, '""')}"`).join(',');
  const rowLines = (table.rows || []).map(r => {
    if (isSeparatorRow(r)) {
      const clean = cleanSeparatorLabel(r.item);
      return `"${clean.replace(/"/g, '""')}"` + ','.repeat(Math.max(0, visibleCols.length - 1));
    }
    return visibleCols.map(col => {
      const val = r[col.id];
      if (val === undefined || val === null) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerRow, ...rowLines].join('\n');
}

/**
 * Update WorkspaceTable for scenario prompt / multiplier adjustments
 */
export function updateWorkspaceTableWithScenario(
  currentWsTable: WorkspaceTable,
  prompt: string
): WorkspaceTable | null {
  if (!currentWsTable?.columns || currentWsTable.columns.length === 0) return null;

  const lower = prompt.toLowerCase();
  let multiplier = 1.0;
  let scenarioColName = '';
  let scenarioColId = '';

  if (lower.includes('+5%') || lower.includes(' 5%') || lower.includes('accelerat')) {
    multiplier = 1.05;
    scenarioColName = 'Scenario 2 — +5% Shift';
    scenarioColId = 'scenario_plus_5';
  } else if (lower.includes('+10%') || lower.includes('10%') || lower.includes('expansion')) {
    multiplier = 1.10;
    scenarioColName = 'Scenario 3 — +10% Growth';
    scenarioColId = 'scenario_plus_10';
  } else if (lower.includes('+15%') || lower.includes('15%')) {
    multiplier = 1.15;
    scenarioColName = 'Scenario 1 — Balanced 15% Growth';
    scenarioColId = 'scenario_1';
  } else if (lower.includes('-5%') || lower.includes('soft landing') || lower.includes('contraction')) {
    multiplier = 0.95;
    scenarioColName = 'Scenario 4 — -5% Contraction';
    scenarioColId = 'scenario_minus_5';
  } else if (lower.includes('-10%') || lower.includes('10% decline')) {
    multiplier = 0.90;
    scenarioColName = 'Scenario 5 — -10% Downturn';
    scenarioColId = 'scenario_minus_10';
  } else if (lower.includes('12%') || lower.includes('growth target')) {
    multiplier = 1.12;
    scenarioColName = 'Target (+12%)';
    scenarioColId = 'target_12_pct';
  } else if (lower.includes('reset') || lower.includes('baseline')) {
    const filteredCols = currentWsTable.columns.filter(c => !c.id.startsWith('scenario_') && !c.id.startsWith('target_'));
    return {
      ...currentWsTable,
      columns: filteredCols,
      version: (currentWsTable.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
  }

  if (scenarioColId && multiplier !== 1.0) {
    const periodCols = currentWsTable.columns.filter(c => c.id.startsWith('file_'));
    const targetCol = periodCols.length > 0
      ? periodCols[periodCols.length - 1]
      : currentWsTable.columns.filter(c => c.id !== 'item' && !c.id.startsWith('web_') && !c.id.startsWith('scenario_') && !c.id.startsWith('target_') && c.id !== 'data_source' && c.id !== 'config').slice(-1)[0];

    if (!targetCol) return null;

    const existingColIdx = currentWsTable.columns.findIndex(c => c.id === scenarioColId);
    const newColumns = [...currentWsTable.columns];
    if (existingColIdx === -1) {
      newColumns.push({ id: scenarioColId, name: scenarioColName, type: 'mixed' });
    }

    let origTotalSum = 0;
    let finalTotalSum = 0;

    const newRows = currentWsTable.rows.map(row => {
      if (isSeparatorRow(row)) return row;
      if (isWebBenchmarkRow(row)) return row;

      if (row.id === 'target_egr') {
        return { ...row, [scenarioColId]: parseFloat(multiplier.toFixed(2)) };
      }
      if (row.id === 'final_egr') {
        return { ...row, [scenarioColId]: parseFloat((multiplier - 0.001).toFixed(3)) };
      }
      if (row.id === 'growth_pct') {
        return { ...row, [scenarioColId]: parseFloat(((multiplier - 1) * 100).toFixed(1)) };
      }
      if (row.id === 'converged') {
        return { ...row, [scenarioColId]: true };
      }

      if (isFileDataRow(row) || (!isScenarioMetaRow(row) && row[targetCol.id] !== undefined)) {
        const rawVal = row[targetCol.id];
        const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
        if (!isNaN(numVal)) {
          const computed = parseFloat((numVal * multiplier).toFixed(2));
          origTotalSum += numVal;
          finalTotalSum += computed;
          return {
            ...row,
            [scenarioColId]: computed,
          };
        }
      }

      return row;
    });

    const updatedRows = newRows.map(r => {
      if (r.id === 'original_total' && origTotalSum > 0) {
        return { ...r, [scenarioColId]: parseFloat(origTotalSum.toFixed(2)) };
      }
      if (r.id === 'final_total' && finalTotalSum > 0) {
        return { ...r, [scenarioColId]: parseFloat(finalTotalSum.toFixed(2)) };
      }
      return r;
    });

    return {
      ...currentWsTable,
      columns: newColumns,
      rows: updatedRows,
      version: (currentWsTable.version || 1) + 1,
      updated_at: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Merge an existing web-benchmark workspace table with rows parsed from an uploaded CSV file.
 * File rows are appended below a separator row, with column IDs prefixed "file_".
 */
export function mergeWebTableWithFileData(
  webTable: WorkspaceTable,
  parsedRows: Record<string, any>[],
  filename: string
): WorkspaceTable {
  if (!parsedRows || parsedRows.length === 0) return webTable;

  const keys = Object.keys(parsedRows[0]);
  const itemKey =
    keys.find(k =>
      ['item', 'period', 'quarter', 'year', 'date', 'region', 'segment',
        'metric', 'indicator', 'name', 'category', 'product'].includes(k.toLowerCase())
    ) || keys[0];
  const valKeys = keys.filter(k => k !== itemKey);

  const existingIds = new Set(webTable.columns.map(c => c.id));
  const newFileCols: WorkspaceTableColumn[] = valKeys
    .map(k => ({
      id: `file_${k}`,
      name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'mixed' as const,
    }))
    .filter(c => !existingIds.has(c.id));

  const mergedColumns: WorkspaceTableColumn[] = [...webTable.columns, ...newFileCols];

  const safeName = filename.replace(/[^a-z0-9.]/gi, '_');
  const safeBase = safeName.replace(/\.[^.]+$/, '').toLowerCase();

  const fileSepRow: WorkspaceTableRow = {
    id: `_sep_file_${safeName}`,
    item: `── Uploaded File: ${filename} ──`,
    _type: 'separator',
  };

  const fileDataRows: WorkspaceTableRow[] = parsedRows.map((r, idx) => {
    const label = String(r[itemKey] ?? `Row ${idx + 1}`);
    const safeLabel = label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const rowObj: WorkspaceTableRow = {
      id: `file_${safeBase}_${safeLabel}_${idx}`,
      item: label,
    };
    valKeys.forEach(k => {
      rowObj[`file_${k}`] = r[k];
    });
    return rowObj;
  });

  return {
    columns: mergedColumns,
    rows: [...webTable.rows, fileSepRow, ...fileDataRows],
    version: (webTable.version || 1) + 1,
    updated_at: new Date().toISOString(),
  };
}
