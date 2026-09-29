import React, { useMemo, useState } from 'react';
import { Globe, FileSpreadsheet, Sparkles, CheckCircle2, Search, SlidersHorizontal } from 'lucide-react';
import type { WorkspaceTable, WorkspaceTableColumn } from '../../../types/api';
import {
  getVisibleColumns,
  isSeparatorRow,
  isWebBenchmarkRow,
  isFileDataRow,
  isScenarioMetaRow,
  categorizeColumn,
  formatTableCellValue,
} from '../../../lib/workspaceTableUtils';

interface CombinedSpreadsheetTableProps {
  table: WorkspaceTable;
  triggerToast?: (msg: string) => void;
}

export default function CombinedSpreadsheetTable({
  table,
  triggerToast,
}: CombinedSpreadsheetTableProps) {
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Column visibility: Show a column only if it's "item" OR has at least one non-separator row with a non-null value
  const visibleColumns = useMemo(() => {
    return getVisibleColumns(table.columns, table.rows);
  }, [table.columns, table.rows]);

  // Section summary statistics
  const stats = useMemo(() => {
    const rows = table.rows || [];
    const webRows = rows.filter(isWebBenchmarkRow);
    const fileRows = rows.filter(isFileDataRow);
    const metaRows = rows.filter(isScenarioMetaRow);
    const scenarioCols = visibleColumns.filter(c => c.id.startsWith('scenario_') || c.id.startsWith('target_'));
    const periodCols = visibleColumns.filter(c => c.id.startsWith('file_'));

    return {
      webCount: webRows.length,
      fileCount: fileRows.length,
      metaCount: metaRows.length,
      scenarioCount: scenarioCols.length,
      periodCount: periodCols.length,
      totalRows: rows.length,
    };
  }, [table.rows, visibleColumns]);

  // Filtered rows for instant in-table search
  const displayedRows = useMemo(() => {
    const rawRows = table.rows || [];
    if (!searchFilter.trim()) return rawRows;

    const query = searchFilter.toLowerCase().trim();
    // Keep separator rows if any row in their section matches, or filter rows that match item or cell values
    return rawRows.filter(row => {
      if (isSeparatorRow(row)) return true;
      if (row.item && String(row.item).toLowerCase().includes(query)) return true;
      return Object.entries(row).some(([key, val]) =>
        key !== 'id' && key !== '_type' && val !== null && val !== undefined && String(val).toLowerCase().includes(query)
      );
    });
  }, [table.rows, searchFilter]);

  const handleCellCopy = (val: any, label: string) => {
    if (val === undefined || val === null || val === '') return;
    navigator.clipboard?.writeText(String(val));
    if (triggerToast) triggerToast(`Copied ${label}: ${String(val)}`);
  };

  const renderColumnBadge = (col: WorkspaceTableColumn) => {
    const cat = categorizeColumn(col.id);
    switch (cat) {
      case 'web':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EBF3FF] text-[#2563EB] border border-[#BFDBFE]">
            <Globe className="h-2.5 w-2.5" />
            Web
          </span>
        );
      case 'file':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F4F1EC] text-[#6B6560] border border-[#E5E1D8]">
            <FileSpreadsheet className="h-2.5 w-2.5" />
            Period
          </span>
        );
      case 'scenario':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FFF2EE] text-[#FF5A1F] border border-[#FFD4C5]">
            <Sparkles className="h-2.5 w-2.5" />
            Scenario
          </span>
        );
      case 'forecast':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#F0EEF8] text-[#5B50A0] border border-[#D5D0EC]">
            Forecast
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-white">
      {/* ── Sub-toolbar / Legend ribbon ── */}
      <div className="shrink-0 px-4 py-2 border-b border-[#EDEAE4] bg-[#FAF9F7] flex items-center justify-between gap-3 flex-wrap text-[11px]">
        {/* Left: Summary badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {stats.webCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EBF3FF] text-[#1E40AF] font-medium border border-[#BFDBFE]">
              <Globe className="h-3 w-3 text-[#2563EB]" />
              <span className="font-semibold">{stats.webCount}</span> Web Benchmarks
            </span>
          )}
          {stats.fileCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F4F1EC] text-[#4A443E] font-medium border border-[#E5E1D8]">
              <FileSpreadsheet className="h-3 w-3 text-[#FF5A1F]" />
              <span className="font-semibold">{stats.fileCount}</span> File Rows ({stats.periodCount} Periods)
            </span>
          )}
          {stats.scenarioCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFF2EE] text-[#C2410C] font-medium border border-[#FFD4C5]">
              <Sparkles className="h-3 w-3 text-[#FF5A1F]" />
              <span className="font-semibold">{stats.scenarioCount}</span> Active Scenario {stats.scenarioCount === 1 ? 'Column' : 'Columns'}
            </span>
          )}
          <span className="text-[10px] text-warm-muted font-mono ml-1">
            v{table.version || 1}
          </span>
        </div>

        {/* Right: Quick filter & helper */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="h-3 w-3 text-warm-muted absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter items..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-7 pl-7 pr-2.5 text-[11px] rounded-md border border-[#E5E1D8] bg-white focus:outline-none focus:border-[#FF5A1F] text-warm-text placeholder:text-warm-muted/60 font-sans w-32 sm:w-44 transition-all"
            />
          </div>
          <span className="text-[10px] text-warm-muted/70 italic hidden lg:inline">
            Sticky header &amp; frozen first col
          </span>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative w-full select-text">
        <table className="w-full border-separate border-spacing-0 font-sans text-left">
          {/* ── Table Header (Sticky top) ── */}
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr style={{ background: '#FAFAF8' }}>
              {visibleColumns.map((col, idx) => {
                const isItem = col.id === 'item';
                const cat = categorizeColumn(col.id);
                const isRightAlign = cat === 'file' || cat === 'scenario' || cat === 'forecast' || col.id === 'web_value';

                return (
                  <th
                    key={col.id}
                    className={`py-2.5 px-3.5 border-b-2 text-[11px] font-bold tracking-tight whitespace-nowrap ${
                      isItem
                        ? 'sticky left-0 z-30 min-w-[240px] max-w-[320px] text-left border-r border-[#EDEAE4] border-b-[#3D3730]/20 text-[#3D3730]'
                        : cat === 'web'
                        ? `border-b-[#2563EB]/40 text-[#1E3A8A] ${isRightAlign ? 'text-right' : 'text-left'}`
                        : cat === 'scenario'
                        ? `border-b-[#FF5A1F] text-[#9A3412] bg-[#FFF4EE] ${isRightAlign ? 'text-right' : 'text-left'}`
                        : cat === 'forecast'
                        ? `border-b-[#5B50A0] text-[#4C1D95] bg-[#F7F5FC] ${isRightAlign ? 'text-right' : 'text-left'}`
                        : `border-b-[#3D3730]/20 text-[#3D3730] ${isRightAlign ? 'text-right' : 'text-left'}`
                    }`}
                    style={{
                      background: isItem ? '#FAFAF8' : cat === 'scenario' ? '#FFF4EE' : cat === 'forecast' ? '#F7F5FC' : '#FAFAF8',
                      boxShadow: isItem ? '2px 0 4px -1px rgba(0,0,0,0.06)' : undefined,
                    }}
                  >
                    <div className={`flex items-center gap-1.5 ${isRightAlign && !isItem ? 'justify-end' : 'justify-start'}`}>
                      <span>{col.name || col.id}</span>
                      {renderColumnBadge(col)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Table Body ── */}
          <tbody className="text-[12px] divide-y divide-[#EDEAE4]/40">
            {displayedRows.map((row, rIdx) => {
              // ── 1. Separator row: Full-width sticky section header ──
              if (isSeparatorRow(row)) {
                const isWebSec = row.id.includes('web') || row.item?.toLowerCase().includes('web research');
                const isFileSec = row.id.includes('file') || row.item?.toLowerCase().includes('uploaded file');

                return (
                  <tr key={row.id} className="section-header">
                    <td
                      colSpan={visibleColumns.length}
                      className="sticky left-0 z-10 py-2.5 px-4 font-semibold text-[11.5px] tracking-wider uppercase font-mono border-t-2 border-[#CBD5E0] border-b border-[#CBD5E0]/60 select-none"
                      style={{
                        background: isWebSec ? '#F0F4FF' : isFileSec ? '#F4F1EC' : '#F0EEF8',
                        color: isWebSec ? '#1E40AF' : isFileSec ? '#4A443E' : '#4338CA',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isWebSec ? (
                          <Globe className="h-3.5 w-3.5 text-[#2563EB]" />
                        ) : isFileSec ? (
                          <FileSpreadsheet className="h-3.5 w-3.5 text-[#FF5A1F]" />
                        ) : (
                          <SlidersHorizontal className="h-3.5 w-3.5 text-[#5B50A0]" />
                        )}
                        <span className="font-bold">{row.item}</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              // ── 2. Data Rows (Web benchmarks, File data rows, Scenario meta rows) ──
              const isWeb = isWebBenchmarkRow(row);
              const isFile = isFileDataRow(row);
              const isMeta = isScenarioMetaRow(row);
              const isEven = rIdx % 2 === 0;

              return (
                <tr
                  key={row.id}
                  className={`group transition-colors ${
                    isMeta
                      ? 'bg-[#FAF8F5] hover:bg-[#F5F2EC]'
                      : isEven
                      ? 'bg-white hover:bg-[#FFF9F6]'
                      : 'bg-[#FAFAF8] hover:bg-[#FFF9F6]'
                  }`}
                >
                  {/* Frozen first column ("Item") */}
                  <td
                    title={row.item}
                    className={`sticky left-0 z-10 py-2 px-4 text-[12px] leading-snug border-r border-[#EDEAE4] border-b border-[#F2EFE8] truncate max-w-[320px] ${
                      isMeta
                        ? 'font-bold text-[#2A2520] bg-[#FAF8F5] group-hover:bg-[#F5F2EC]'
                        : isEven
                        ? 'font-medium text-[#3D3730] bg-white group-hover:bg-[#FFF9F6]'
                        : 'font-medium text-[#3D3730] bg-[#FAFAF8] group-hover:bg-[#FFF9F6]'
                    }`}
                    style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.05)' }}
                  >
                    <div className="flex items-center gap-2">
                      {isWeb && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]/70 shrink-0" />
                      )}
                      {isFile && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F]/70 shrink-0" />
                      )}
                      {isMeta && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#5B50A0]/70 shrink-0" />
                      )}
                      <span className="truncate">{row.item}</span>
                    </div>
                  </td>

                  {/* Dynamic value columns */}
                  {visibleColumns.slice(1).map(col => {
                    const rawVal = row[col.id];
                    const cat = categorizeColumn(col.id);
                    const formatted = formatTableCellValue(rawVal, col.id);
                    const isRightAlign = cat === 'file' || cat === 'scenario' || cat === 'forecast' || col.id === 'web_value' || formatted.isNumber;

                    return (
                      <td
                        key={col.id}
                        onClick={() => handleCellCopy(rawVal, `${row.item} - ${col.name || col.id}`)}
                        title={`${col.name || col.id}: ${formatted.display}`}
                        className={`py-2 px-3.5 text-[12px] tabular-nums border-b border-[#F2EFE8] whitespace-nowrap transition-colors cursor-pointer ${
                          isRightAlign ? 'text-right' : 'text-left'
                        } ${
                          cat === 'scenario'
                            ? 'font-semibold text-[#9A3412] bg-[#FFF8F5]/60 group-hover:bg-[#FFEADB]/80'
                            : cat === 'forecast'
                            ? 'font-semibold text-[#5B50A0] bg-[#FAF9FD]/60 group-hover:bg-[#EFEAF8]/80'
                            : isWeb && (col.id === 'web_value' || col.id === 'web_source')
                            ? 'text-[#1E3A8A] font-medium'
                            : 'text-[#3D3730]'
                        } ${formatted.isMuted ? 'text-warm-muted/40 font-mono' : 'font-mono'}`}
                      >
                        {formatted.isBoolean ? (
                          <div className="flex items-center justify-end">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              formatted.boolVal
                                ? 'bg-[#EBF4E8] text-[#2C6E25] border-[#C8E4C0]'
                                : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                            }`}>
                              {formatted.boolVal && <CheckCircle2 className="h-2.5 w-2.5" />}
                              {formatted.boolVal ? 'Converged ✓' : 'Incomplete'}
                            </span>
                          </div>
                        ) : col.id === 'web_source' && !formatted.isMuted ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-sans font-medium bg-[#EBF3FF] text-[#1E40AF] border border-[#BFDBFE]">
                            {formatted.display}
                          </span>
                        ) : col.id === 'web_unit' && !formatted.isMuted ? (
                          <span className="text-[11px] font-sans font-semibold text-warm-muted">
                            {formatted.display}
                          </span>
                        ) : (
                          formatted.display
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Table Footer Status Bar ── */}
      <div className="shrink-0 px-4 py-2 border-t border-[#EDEAE4] bg-[#F7F5F0] flex items-center justify-between gap-3 text-[10.5px] text-[#8C847C] font-mono select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
            Live Workspace Table
          </span>
          <span className="hidden sm:inline text-[#C8C0B4]">·</span>
          <span className="hidden sm:inline">Click any cell to copy value</span>
        </div>
        <span>
          {displayedRows.length} Rows · {visibleColumns.length} Columns
        </span>
      </div>
    </div>
  );
}
