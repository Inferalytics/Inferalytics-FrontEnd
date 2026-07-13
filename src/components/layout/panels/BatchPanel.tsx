import React, { useState } from 'react';
import { RotateCw, Check, Table2, Sparkles, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';

// ── Static dimension cards ──────────────────────────────────────────────────
const BATCH_CARDS = [
  { id: 'rev',    name: 'Revenue',       type: 'numeric',     samples: ['$1.24M', '$980K', '$2.10M'],       status: 'ok',   x: 40,  y: 30  },
  { id: 'reg',    name: 'Region',        type: 'categorical', samples: ['EMEA', 'APAC', 'NA-East'],         status: 'ok',   x: 280, y: 180 },
  { id: 'qtr',    name: 'Quarter',       type: 'date',        samples: ['Q1 2025', 'Q2 2025', 'Q3 2025'],   status: 'ok',   x: 40,  y: 330 },
  { id: 'cost',   name: 'Cost Centre',   type: 'numeric',     samples: ['$420K', '$311K', '$508K'],         status: 'ok',   x: 280, y: 430 },
  { id: 'prod',   name: 'Product Line',  type: 'categorical', samples: ['Enterprise', 'SMB', 'Self-serve'], status: 'busy', x: 60,  y: 560 },
] as const;

type CardId = typeof BATCH_CARDS[number]['id'];

// ── Mock data keyed by dimension id ─────────────────────────────────────────
const MOCK_DATA: Record<string, { columns: string[]; rows: string[][] }> = {
  rev: {
    columns: ['Customer ID', 'ARR', 'Tier', 'Quarter', 'Region'],
    rows: [
      ['cust_9812_ea', '$124,500', 'Enterprise', 'Q2 2025', 'EMEA'],
      ['cust_1105_us', '$88,000',  'SMB',        'Q2 2025', 'NA-East'],
      ['cust_3341_ap', '$210,000', 'Enterprise', 'Q1 2025', 'APAC'],
      ['cust_7723_eu', '$42,000',  'Self-serve', 'Q3 2025', 'EMEA'],
      ['cust_0091_us', '$175,000', 'Enterprise', 'Q2 2025', 'NA-East'],
    ],
  },
  reg: {
    columns: ['Region', 'Revenue Total', 'Customers', 'Avg ARR', 'YoY'],
    rows: [
      ['EMEA',    '$1.24M', '18', '$68,900', '+11.3%'],
      ['APAC',    '$980K',  '12', '$81,700', '+17.4%'],
      ['NA-East', '$2.10M', '24', '$87,500', '+1.7%'],
      ['NA-West', '$640K',  '9',  '$71,100', '+5.2%'],
      ['LATAM',   '$310K',  '5',  '$62,000', '+8.9%'],
    ],
  },
  qtr: {
    columns: ['Quarter', 'Revenue', 'Cost', 'Gross Margin', 'EGR'],
    rows: [
      ['Q1 2025', '$1.92M', '$640K', '66.7%', '8.4%'],
      ['Q2 2025', '$2.04M', '$712K', '65.1%', '9.2%'],
      ['Q3 2025', '$2.18M', '$801K', '63.3%', '10.1%'],
      ['Q4 2025', '$2.40M', '$884K', '63.2%', '13.2%'],
    ],
  },
  cost: {
    columns: ['Cost Centre', 'Allocated', 'Spent', 'Variance', 'Status'],
    rows: [
      ['Engineering',  '$420K', '$398K', '−$22K', 'Under'],
      ['Sales',        '$311K', '$329K', '+$18K', 'Over'],
      ['Marketing',    '$508K', '$488K', '−$20K', 'Under'],
      ['G&A',          '$210K', '$212K', '+$2K',  'On track'],
      ['R&D',          '$180K', '$175K', '−$5K',  'Under'],
    ],
  },
  prod: {
    columns: ['Product', 'Customers', 'ARR', 'Churn %', 'NRR'],
    rows: [
      ['Enterprise',  '24', '$1.84M', '2.1%',  '118%'],
      ['SMB',         '38', '$1.12M', '6.4%',  '104%'],
      ['Self-serve',  '91', '$640K',  '12.8%', '92%'],
    ],
  },
};

// ── Merged columns when multiple cards selected ──────────────────────────────
function getMergedTable(ids: string[]) {
  if (ids.length === 0) return { columns: [], rows: [] };
  if (ids.length === 1) return MOCK_DATA[ids[0]];

  // Use first selected card's rows as base, append extra columns from others
  const base    = MOCK_DATA[ids[0]];
  const extras  = ids.slice(1).map(id => MOCK_DATA[id]);
  const columns = [
    ...base.columns,
    ...extras.flatMap(e => e.columns.slice(1)), // skip first col (key) of each extra
  ];
  const rows = base.rows.map((row, ri) => [
    ...row,
    ...extras.flatMap(e => (e.rows[ri] ?? e.rows[0]).slice(1)),
  ]);
  return { columns, rows };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BatchPanel() {
  const navigate = useNavigate();
  const { dimensions } = useStore();

  const selectedIds = dimensions.filter(d => d.selected).map(d => d.id);
  // Default to showing some data (e.g. Revenue) if nothing is selected
  const displayIds = selectedIds.length > 0 ? selectedIds : ['rev'];
  
  const { columns, rows } = getMergedTable(displayIds);

  const exportCSV = () => {
    if (columns.length === 0) return;
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [columns, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `inferalytics_${displayIds.join('_')}.csv`;
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
                  {displayIds.map(id => BATCH_CARDS.find(c => c.id === id)?.name || id).join(' + ')}
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-warm-muted">
                {rows.length} rows · {columns.length} columns · mock data
              </span>
            </div>

            {/* Scrollable table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-240px)] custom-scrollbar">
              <table className="w-full text-left border-collapse text-[11.5px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-warm-bg/80 backdrop-blur-sm border-b border-warm-border">
                    <th className="p-2.5 pl-4 w-8 text-warm-muted font-sans font-bold text-[10px]">#</th>
                    {columns.map((col, ci) => (
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
                        } ${
                          typeof cell === 'string' && cell.startsWith('+') ? 'text-sage font-semibold' :
                          typeof cell === 'string' && cell.startsWith('−') ? 'text-destructive font-semibold' : ''
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
          </div>
        </div>
      </div>
    </div>
  );
}
