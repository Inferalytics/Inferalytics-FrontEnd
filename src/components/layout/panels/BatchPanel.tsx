import React, { useState, useEffect } from 'react';
import { Table2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import api from '../../../api';
import type { PopulatedDataRecord } from '../../../types/api';

// ── Component ────────────────────────────────────────────────────────────────
export default function BatchPanel() {
  const navigate = useNavigate();
  const { activeBatchId } = useStore();

  const [records, setRecords] = useState<PopulatedDataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.retrieveData()
      .then(res => { if (!cancelled) setRecords(res.data?.records ?? []); })
      .catch(() => { if (!cancelled) setRecords([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeBatchId]);

  const latest = records[records.length - 1];
  const content = (latest?.data_content ?? []) as Record<string, unknown>[];
  const allColumns = content.length > 0 ? Object.keys(content[0]) : [];
  const displayColumns = selectedCols.length > 0 ? selectedCols : allColumns;
  const rows = content.map(row => displayColumns.map(c => String(row[c] ?? '')));

  const toggleColumn = (col: string) => {
    setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const exportCSV = () => {
    if (displayColumns.length === 0) return;
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [displayColumns, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `inferalytics_${(latest?.file_name || 'export').replace(/\.[^.]+$/, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 animate-float-up w-full max-w-[1280px] mx-auto pt-2 pb-12 font-sans select-none">

      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="bg-white border border-warm-border rounded-2xl shadow-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#FF5A1F] font-bold bg-[#FFF2EE] px-2.5 py-0.5 rounded-full border border-[#FFD4C5]">
              Batch Explorer
            </span>
            <span className="text-[11px] text-warm-muted font-mono font-medium">
              · {displayColumns.length} Active Columns
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-warm-text mt-1.5 tracking-tight">
            Batch Dimension Explorer
          </h1>
          <p className="text-[12.5px] text-warm-muted mt-0.5">
            Inspect raw tabular records, filter dimension columns, and verify uploaded dataset integrity.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard/dimensions')}
          className="px-4 py-2.5 bg-[#FF5A1F] hover:opacity-90 text-white rounded-xl text-[12.5px] font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          <span>Continue to Dimensions</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Real column filter chips ──────────────────────────────── */}
      {allColumns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allColumns.map(col => (
            <button
              key={col}
              onClick={() => toggleColumn(col)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                selectedCols.includes(col)
                  ? 'bg-[#FF5A1F] text-white border-[#FF5A1F] shadow-xs'
                  : 'bg-white text-warm-text border-warm-border hover:border-[#FF5A1F]/50 hover:bg-[#FAF9F7]'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      )}

      {/* ── Main split ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 w-full">
        <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden flex flex-col min-h-[360px]">
          {/* Table header */}
          <div className="px-5 py-3.5 border-b border-warm-border bg-gradient-to-r from-white to-[#FAF9F7]/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-[#FF5A1F]" />
              </div>
              <div>
                <span className="text-[13px] font-bold text-warm-text block">
                  {latest?.file_name || 'Active Batch Dataset'}
                </span>
                <span className="text-[10px] text-warm-muted font-mono">
                  {rows.length} rows · {displayColumns.length} columns loaded
                </span>
              </div>
            </div>

            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="text-[11px] font-bold text-[#FF5A1F] bg-[#FFF2EE] border border-[#FFD4C5] px-3 py-1 rounded-xl hover:bg-[#FFE5DC] transition-colors cursor-pointer"
              >
                Export CSV ↓
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center p-12 text-[13px] text-warm-muted font-medium">
              Loading batch records…
            </div>
          ) : content.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-12 text-center">
              <span className="text-[13px] font-bold text-warm-text">No batch records uploaded yet</span>
              <span className="text-[12px] text-warm-muted max-w-sm">
                Upload a CSV, XLSX, or JSON file in Conversation to see the live dataset table here.
              </span>
            </div>
          ) : (
            <>
              {/* Scrollable table */}
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                <table className="w-full text-left border-collapse text-[12px] font-mono">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#FAF9F7] border-b border-warm-border text-warm-muted font-sans font-bold text-[11px]">
                      <th className="p-3 pl-4 w-10 text-warm-muted">#</th>
                      {displayColumns.map((col, ci) => (
                        <th key={ci} className="p-3 pr-4 font-bold text-warm-muted uppercase tracking-wide whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-border/40">
                    {rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="hover:bg-[#FAF9F7] transition-colors group"
                      >
                        <td className="p-3 pl-4 font-mono text-[11px] text-warm-muted/60 group-hover:text-warm-muted">{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className={`p-3 pr-4 font-mono text-[12px] whitespace-nowrap tabular-nums ${
                            ci === 0 ? 'font-semibold text-warm-text font-sans' : 'text-warm-muted'
                          }`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 bg-[#FAF9F7] border-t border-warm-border flex items-center justify-between text-[11.5px] font-sans">
                <span className="text-warm-muted font-mono">
                  Displaying {rows.length} total rows
                </span>
                <span onClick={exportCSV} className="text-[#FF5A1F] font-bold hover:underline cursor-pointer">
                  Export CSV →
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
