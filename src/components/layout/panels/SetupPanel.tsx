import React, { useState } from 'react';
import { Sparkles, ArrowRight, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../../store/useStore';

const tableSchemas: Record<string, { col: string; type: string; sample: string }[]> = {
  'q2_revenue_raw.xlsx': [
    { col: 'customer_id', type: 'VARCHAR(32)', sample: 'cust_9812_ea' },
    { col: 'revenue_arr', type: 'DECIMAL(12,2)', sample: '$124,500.00' },
    { col: 'tier', type: 'VARCHAR(16)', sample: 'Enterprise' },
    { col: 'renewal_quarter', type: 'VARCHAR(4)', sample: 'Q225' },
    { col: 'region', type: 'VARCHAR(8)', sample: 'EMEA' }
  ],
  'elasticity_matrix_v1.csv': [
    { col: 'tier_id', type: 'VARCHAR(16)', sample: 'Enterprise' },
    { col: 'price_sensitivity', type: 'FLOAT', sample: '-1.42' },
    { col: 'churn_elasticity', type: 'FLOAT', sample: '0.85' },
    { col: 'confidence_score', type: 'FLOAT', sample: '0.94' }
  ],
  'churn_forecasts.json': [
    { col: 'customer_id', type: 'VARCHAR(32)', sample: 'cust_1105_us' },
    { col: 'churn_prob', type: 'FLOAT', sample: '0.042' },
    { col: 'contract_end', type: 'DATE', sample: '2025-10-31' },
    { col: 'engagement_score', type: 'FLOAT', sample: '9.2' }
  ]
};

export default function SetupPanel() {
  const { setup, toggleSegment, toggleParameter, setFocalPoint, setTimeGranularity } = useStore();
  const { subtab } = useParams<{ subtab?: string }>();
  const navigate = useNavigate();
  const [inspectedTableId, setInspectedTableId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 animate-float-up h-full justify-center">
      {/* Setup Card */}
      <div className="max-w-[720px] w-full mx-auto my-auto bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-float overflow-hidden flex flex-col justify-between transition-all">
        <div className="p-6 border-b border-warm-border/60 bg-white/40">
          <div className="flex items-start justify-between">
            <div className="flex flex-col animate-fade-in">
              <span className="text-[9.5px] font-bold text-brand-indigo uppercase tracking-wider block mb-1">
                Step 1 of 3 · World-Model Setup
              </span>
              <h2 className="text-[18px] font-bold text-warm-text mb-0.5">
                Define what we're modelling
              </h2>
            </div>

            <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[10.5px] font-medium text-warm-muted">
              <button
                onClick={() => navigate('/dashboard/setup/general')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  (!subtab || subtab === 'general')
                    ? 'bg-white text-brand-indigo shadow-sm font-semibold'
                    : 'hover:text-warm-text'
                }`}
              >
                General Config
              </button>
              <button
                onClick={() => navigate('/dashboard/setup/sources')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  subtab === 'sources'
                    ? 'bg-white text-brand-indigo shadow-sm font-semibold'
                    : 'hover:text-warm-text'
                }`}
              >
                Data Sources ({setup.sources.length})
              </button>
            </div>
          </div>
          <p className="text-[12.5px] text-warm-muted mt-2 leading-relaxed">
            {subtab === 'sources'
              ? 'Inspect raw input files, table definitions, and row counts before vectorisation.'
              : "Before we touch the data, tell me the focal point. I'll draft the dimensions and relationships from there."
            }
          </p>
        </div>

        <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[820px] custom-scrollbar">
          {(!subtab || subtab === 'general') && (
            <div className="flex flex-col gap-5">
              {/* Focal Point */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Focal point</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">The single outcome we'll optimise.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-col gap-2">
                  <input
                    type="text"
                    value={setup.focalPoint}
                    onChange={(e) => setFocalPoint(e.target.value)}
                    className="w-full px-4 py-2 border border-warm-border rounded-xl text-[13px] bg-white/50 text-warm-text focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-peach/20 transition-all font-sans placeholder-warm-muted"
                    placeholder="Enter focal point target..."
                  />
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <Sparkles className="h-3 w-3 text-brand-indigo" />
                    <span className="text-warm-muted">Suggested:</span>
                    <span className="text-brand-indigo hover:underline cursor-pointer" onClick={() => setFocalPoint('Revenue uplift — Q2 → Q4 2025')}>Revenue uplift</span>
                    <span className="text-warm-muted">·</span>
                    <span className="text-brand-indigo hover:underline cursor-pointer" onClick={() => setFocalPoint('Cost reduction — APAC')}>Cost reduction</span>
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Time</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Granularity and horizon.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[11px] font-medium text-warm-muted overflow-x-auto max-w-full no-scrollbar">
                    {['Day', 'Week', 'Month', 'Quarter', 'Year'].map((t) => (
                      <span key={t} onClick={() => setTimeGranularity(t)} className={`px-2.5 py-1 rounded-md cursor-pointer transition-all shrink-0 ${t === setup.timeGranularity ? 'bg-white text-brand-indigo shadow-sm font-semibold' : 'hover:text-warm-text'}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-lavender/30 border border-lavender/50 text-[11.5px] font-mono text-brand-indigo font-semibold shadow-sm shrink-0">
                    {setup.timeRange}
                  </span>
                </div>
              </div>

              {/* Segments */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Segments</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Detected in your database.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-wrap gap-1.5">
                  {['Region', 'Product Line', 'Customer Tier', 'Sales Channel'].map((seg) => {
                    const isSel = setup.segments.includes(seg);
                    return (
                      <button
                        key={seg}
                        onClick={() => toggleSegment(seg)}
                        className={`px-3.5 py-1.5 border rounded-full text-[11.5px] font-medium transition-all duration-200 cursor-pointer ${
                          isSel
                            ? 'bg-brand-indigo border-brand-indigo text-white shadow-[0_2px_8px_0_rgba(255,90,31,0.2)] font-semibold scale-102'
                            : 'bg-white/50 border-warm-border text-warm-muted hover:text-warm-text hover:bg-white hover:border-warm-border'
                        }`}
                      >
                        {seg}
                      </button>
                    );
                  })}
                  <span
                    className="px-3 py-1 border border-dashed border-peach bg-[#FFF2EE] text-brand-indigo rounded-full text-[11.5px] font-medium flex items-center gap-1 cursor-pointer font-sans"
                    onClick={() => toggleSegment('Acquisition Cohort')}
                  >
                    <Sparkles className="h-3 w-3 text-peach" />
                    Acquisition Cohort
                  </span>
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Parameters</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Metrics to track and model.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-wrap gap-1.5">
                  {['Revenue', 'Cost Centre', 'Gross Margin', 'Units Sold', 'CAC'].map((param) => {
                    const isSel = setup.parameters.includes(param);
                    return (
                      <button
                        key={param}
                        onClick={() => toggleParameter(param)}
                        className={`px-3.5 py-1.5 border rounded-full text-[11.5px] font-medium transition-all duration-200 cursor-pointer ${
                          isSel
                            ? 'bg-brand-indigo border-brand-indigo text-white shadow-[0_2px_8px_0_rgba(255,90,31,0.2)] font-semibold scale-102'
                            : 'bg-white/50 border-warm-border text-warm-muted hover:text-warm-text hover:bg-white hover:border-warm-border'
                        }`}
                      >
                        {param}
                      </button>
                    );
                  })}
                  <span
                    className="px-3 py-1 border border-dashed border-peach bg-[#FFF2EE] text-brand-indigo rounded-full text-[11.5px] font-medium flex items-center gap-1 cursor-pointer font-sans"
                    onClick={() => toggleParameter('LTV / Payback')}
                  >
                    <Sparkles className="h-3 w-3 text-peach" />
                    LTV / Payback
                  </span>
                </div>
              </div>
            </div>
          )}

          {subtab === 'sources' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <span className="text-[11px] font-bold text-warm-muted uppercase tracking-[0.08em] select-none block mb-1">
                Active Spreadsheet Tables ({setup.sources.length})
              </span>
              <div className="flex flex-col gap-2.5">
                {setup.sources.map((src, sIdx) => {
                  const isInspected = inspectedTableId === src.name;
                  return (
                    <div key={sIdx} className="flex flex-col rounded-xl bg-warm-bg border border-warm-border/60 overflow-hidden transition-all duration-200">
                      <div
                        onClick={() => setInspectedTableId(isInspected ? null : src.name)}
                        className="flex items-center justify-between p-3.5 hover:bg-white transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-lavender/35 border border-lavender/40 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-brand-indigo" />
                          </div>
                          <span className="text-[12px] font-bold font-mono text-warm-text truncate max-w-[240px]">
                            {src.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-warm-muted">
                            {src.fields} fields · {src.rows.toLocaleString()} rows
                          </span>
                          <span className="text-[10.5px] font-semibold text-brand-indigo hover:underline">
                            {isInspected ? 'Collapse Schema' : 'Inspect Columns'}
                          </span>
                        </div>
                      </div>

                      {isInspected && (
                        <div className="border-t border-warm-border/40 bg-white/70 p-3.5 flex flex-col gap-2 animate-float-up">
                          <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Column Definitions</span>
                          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono border-b border-warm-border/30 pb-1.5 mb-1 text-warm-muted font-sans font-bold">
                            <span>Field Name</span>
                            <span>Data Type</span>
                            <span>Sample Value</span>
                          </div>
                          {tableSchemas[src.name]?.map((col, cIdx) => (
                            <div key={cIdx} className="grid grid-cols-3 gap-2 text-[10.5px] font-mono py-1 border-b border-warm-bg/50 last:border-0 hover:bg-muted/30 px-1 rounded transition-colors font-sans">
                              <span className="font-semibold font-mono text-warm-text">{col.col}</span>
                              <span className="text-brand-indigo font-mono">{col.type}</span>
                              <span className="text-warm-muted font-mono">{col.sample}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-warm-bg border-t border-warm-border flex items-center justify-between shrink-0 font-sans">
          <span className="text-[11px] text-warm-muted">
            {subtab === 'sources'
              ? `${setup.sources.length} sources parsed successfully`
              : `3 sources · ${setup.segments.length + setup.parameters.length + 1} dimensions selected`
            }
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-lg text-[12px] font-semibold text-warm-text transition-colors cursor-pointer font-sans">
              Save draft
            </button>
            <button
              onClick={() => {
                if (subtab === 'sources') {
                  navigate('/dashboard/setup/general');
                } else {
                  navigate('/dashboard/build');
                }
              }}
              className="px-4 py-1.5 bg-brand-indigo hover:opacity-90 active:opacity-100 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer font-sans"
            >
              {subtab === 'sources' ? 'View Config' : 'Continue to Model Construction'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
