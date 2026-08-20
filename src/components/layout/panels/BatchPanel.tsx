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
    <div className="flex flex-col gap-5 animate-float-up w-full pt-4">

      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-lavender/40 border border-lavender/50 flex items-center justify-center">
            <Table2 className="h-3.5 w-3.5 text-brand-indigo" />
          </div>
          <span className="text-[13px] font-bold text-warm-text">Batch Dimension Explorer</span>
        </div>
        <button
          onClick={() => navigate('/dashboard/ips-engine')}
          className="px-4 py-1.5 bg-brand-indigo hover:opacity-90 text-white rounded-xl text-[12px] font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          Continue to IPS Engine <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Real column filter chips ──────────────────────────────── */}
      {allColumns.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allColumns.map(col => (
            <button
              key={col}
              onClick={() => toggleColumn(col)}
              className={`px-2.5 py-1 rounded-full text-[10.5px] font-medium border transition-all cursor-pointer ${
                selectedCols.includes(col)
                  ? 'bg-brand-indigo text-white border-brand-indigo'
                  : 'bg-white text-warm-text border-warm-border hover:border-brand-indigo/50'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      )}

      {/* ── Main split ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-5 w-full">
        {/* Full width data preview ──────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <span className="text-[9.5px] font-bold text-warm-muted uppercase tracking-widest pl-0.5">
            Data Preview
          </span>

          <div className="flex-1 bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden flex flex-col min-h-[320px]">
            {/* Table header */}
            <div className="px-4 py-2.5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
                <span className="text-[11.5px] font-bold text-warm-text">
                  {latest?.file_name || 'No batch data'}
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-warm-muted">
                {rows.length} rows · {displayColumns.length} columns
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center p-10 text-[12px] text-warm-muted">
                Loading batch data…
              </div>
            ) : content.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-10 text-center">
                <span className="text-[12.5px] font-semibold text-warm-text">No data uploaded yet</span>
                <span className="text-[11px] text-warm-muted max-w-xs">
                  Upload a CSV, XLSX, or JSON file from the AI panel to see a real preview here.
                </span>
              </div>
            ) : (
              <>
                {/* Scrollable table */}
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] custom-scrollbar">
                  <table className="w-full text-left border-collapse text-[11.5px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-warm-bg/80 backdrop-blur-sm border-b border-warm-border">
                        <th className="p-2.5 pl-4 w-8 text-warm-muted font-sans font-bold text-[10px]">#</th>
                        {displayColumns.map((col, ci) => (
                          <th key={ci} className="p-2.5 pr-4 font-sans font-bold text-warm-muted text-[10px] uppercase tracking-wide whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, ri) => (
                        <tr
                          key={ri}
                          className="border-b border-warm-border/30 hover:bg-warm-bg/20 transition-colors group"
                        >
                          <td className="p-2.5 pl-4 font-mono text-[10px] text-warm-muted/50 group-hover:text-warm-muted">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`p-2.5 pr-4 font-mono text-[11.5px] whitespace-nowrap ${
                              ci === 0 ? 'font-semibold text-warm-text' : 'text-warm-muted'
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
                <div className="px-4 py-2 bg-warm-bg/30 border-t border-warm-border/50 flex items-center justify-between text-[10px] font-sans">
                  <span className="text-warm-muted">
                    Showing {rows.length} of {rows.length} rows
                  </span>
                  <span onClick={exportCSV} className="text-brand-indigo font-semibold hover:underline cursor-pointer">
                    Export CSV →
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
