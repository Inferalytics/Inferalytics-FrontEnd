import React, { useState } from 'react';
import { Sparkles, ArrowRight, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../../store/useStore';

const tableSchemas: Record<string, { col: string; type: string; sample: string }[]> = {
  'q2_revenue_raw.xlsx': [
    { col: 'customer_id', type: 'Text Identifier', sample: 'cust_9812_ea' },
    { col: 'revenue_arr', type: 'Currency (USD)', sample: '$124,500.00' },
    { col: 'tier', type: 'Category (Text)', sample: 'Enterprise' },
    { col: 'renewal_quarter', type: 'Quarter Code', sample: 'Q225' },
    { col: 'region', type: 'Region Code', sample: 'EMEA' }
  ],
  'cost_centre_2024.csv': [
    { col: 'department_id', type: 'Text Identifier', sample: 'dept_sales_us' },
    { col: 'budget_allocation', type: 'Currency (USD)', sample: '$450,000.00' },
    { col: 'headcount', type: 'Integer (Count)', sample: '14' },
    { col: 'overhead_cost', type: 'Currency (USD)', sample: '$32,100.00' }
  ],
  'region_mapping.json': [
    { col: 'region_code', type: 'Region Code', sample: 'APAC' },
    { col: 'market_size', type: 'Currency (USD)', sample: '$2,400,000.00' },
    { col: 'active_customers', type: 'Integer (Count)', sample: '382' },
    { col: 'gdp_growth', type: 'Percentage', sample: '4.2%' }
  ]
};

export default function SetupPanel() {
  const { setup, toggleSegment, toggleParameter, setFocalPoint, setTimeGranularity } = useStore();
  const { subtab } = useParams<{ subtab?: string }>();
  const navigate = useNavigate();
  const [inspectedTableId, setInspectedTableId] = useState<string | null>(null);

  const isFocalPointMissing = !setup.focalPoint || !setup.focalPoint.trim();
  const isSegmentsMissing = !setup.segments || setup.segments.length === 0;
  const isVariablesMissing = !setup.parameters || setup.parameters.length === 0;
  const isFormInvalid = isFocalPointMissing || isSegmentsMissing || isVariablesMissing;

  return (
    <div className="flex flex-col gap-6 animate-float-up pt-4 max-w-[960px] w-full mx-auto">
      {/* Setup Card */}
      <div className="w-full bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-float overflow-hidden flex flex-col justify-between transition-all">
        <div className="p-6 border-b border-warm-border/60 bg-white/40">
          <div className="flex items-start justify-between">
            <div className="flex flex-col animate-fade-in">
              <span className="text-[9.5px] font-bold text-brand-indigo uppercase tracking-wider block mb-1">
                Step 1 of 3 · Business Configuration
              </span>
              <h2 className="text-[18px] font-bold text-warm-text mb-0.5">
                Define simulation focus and strategic drivers
              </h2>
            </div>

            <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[10.5px] font-medium text-warm-muted">
              <button
                onClick={() => navigate('/dashboard/blueprint/general')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  (!subtab || subtab === 'general')
                    ? 'bg-white text-brand-indigo shadow-sm font-semibold'
                    : 'hover:text-warm-text'
                }`}
              >
                General Settings
              </button>
              <button
                onClick={() => navigate('/dashboard/blueprint/sources')}
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
              ? 'Review baseline performance data, segment details, and transaction volume before starting simulation.'
              : 'Before importing baseline performance data, define your primary target metric. We will outline the segments and growth variables from there.'
            }
          </p>
        </div>

        <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[820px] custom-scrollbar">
          {(!subtab || subtab === 'general') && (
            <div className="flex flex-col gap-5">
              {/* Focal Point */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Primary Target Metric</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">The core financial or operational result to model and improve.</span>
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
                  <span className="text-[12px] font-semibold text-warm-text block">Planning Horizon</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Determine time increment and forecast duration.</span>
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
                  <span className="text-[12px] font-semibold text-warm-text block">Strategic Segments</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Customer groups or regions to analyze.</span>
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
                  <span className="text-[12px] font-semibold text-warm-text block">Growth & Cost Variables</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Metrics to project and simulate.</span>
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

              {isFormInvalid && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-[12px] font-medium flex items-center gap-2 select-none animate-fade-in mt-4">
                  <span>⚠️</span>
                  <span>
                    <strong>Required Configuration Missing:</strong> Configure a {isFocalPointMissing && 'Primary Target Metric'}{isFocalPointMissing && (isSegmentsMissing || isVariablesMissing) && ' & '}{isSegmentsMissing && 'at least one Strategic Segment'}{(isSegmentsMissing || isFocalPointMissing) && isVariablesMissing && ' & '}{isVariablesMissing && 'at least one Growth Variable'} before proceeding.
                  </span>
                </div>
              )}
            </div>
          )}

          {subtab === 'sources' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Requirements Checklist */}
              <div className="border border-warm-border rounded-xl bg-warm-bg/40 p-4 flex flex-col gap-3">
                <span className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block">
                  Scenario Requirements Checklist
                </span>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between text-[12px] bg-white p-2.5 rounded-lg border border-warm-border/50">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-sage-light border border-sage-border flex items-center justify-center">
                        <span className="text-[9px] font-bold text-sage">✓</span>
                      </div>
                      <div>
                        <span className="font-semibold text-warm-text block">Historical Revenue & Pricing Baseline</span>
                        <span className="text-[10px] text-warm-muted">Provided by q2_revenue_raw.xlsx</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sage-light text-sage border border-sage-border text-[9px] font-bold uppercase">Ready</span>
                  </div>

                  <div className="flex items-start justify-between text-[12px] bg-white p-2.5 rounded-lg border border-warm-border/50">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-sage-light border border-sage-border flex items-center justify-center">
                        <span className="text-[9px] font-bold text-sage">✓</span>
                      </div>
                      <div>
                        <span className="font-semibold text-warm-text block">Cost Allocation Structure</span>
                        <span className="text-[10px] text-warm-muted">Provided by cost_centre_2024.csv</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sage-light text-sage border border-sage-border text-[9px] font-bold uppercase">Ready</span>
                  </div>

                  <div className="flex items-start justify-between text-[12px] bg-white p-2.5 rounded-lg border border-warm-border/50">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-sage-light border border-sage-border flex items-center justify-center">
                        <span className="text-[9px] font-bold text-sage">✓</span>
                      </div>
                      <div>
                        <span className="font-semibold text-warm-text block">Market Segment Mapping</span>
                        <span className="text-[10px] text-warm-muted">Provided by region_mapping.json</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sage-light text-sage border border-sage-border text-[9px] font-bold uppercase">Ready</span>
                  </div>

                  {/* Missing/Recommended Elasticity Data */}
                  <div className="flex items-start justify-between text-[12px] bg-[#FFF2EE] p-2.5 rounded-lg border border-peach/30">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-peach/10 border border-peach/30 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-brand-indigo">!</span>
                      </div>
                      <div>
                        <span className="font-semibold text-brand-indigo block">Price Elasticity Curves (.csv)</span>
                        <span className="text-[10px] text-warm-muted">Highly recommended to enable custom churn projections.</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-peach-light text-brand-indigo border border-peach/20 text-[9px] font-bold uppercase">Pending</span>
                  </div>
                </div>

                <div className="text-[10.5px] text-warm-muted leading-normal mt-1 p-2.5 bg-white border border-warm-border/40 rounded-lg">
                  💡 <strong>Simulation Advice:</strong> You can proceed without custom elasticity data. The engine will auto-apply baseline sensitivity coefficients derived from your historical renewal patterns.
                </div>
              </div>

              {/* Active Sources List */}
              <div className="flex flex-col gap-2">
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
                            <span className="text-[10px] text-warm-muted font-sans font-semibold">
                              {src.fields} metrics · {src.rows.toLocaleString()} historical records
                            </span>
                            <span className="text-[10.5px] font-semibold text-brand-indigo hover:underline">
                              {isInspected ? 'Collapse Details' : 'Review Columns'}
                            </span>
                          </div>
                        </div>

                        {isInspected && (
                          <div className="border-t border-warm-border/40 bg-white/70 p-3.5 flex flex-col gap-2 animate-float-up">
                            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Data Field Definitions</span>
                            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono border-b border-warm-border/30 pb-1.5 mb-1 text-warm-muted font-sans font-bold">
                              <span>Metric Field</span>
                              <span>Format</span>
                              <span>Sample Record</span>
                            </div>
                            {tableSchemas[src.name]?.map((col, cIdx) => (
                              <div key={cIdx} className="grid grid-cols-3 gap-2 text-[10.5px] font-mono py-1 border-b border-warm-bg/50 last:border-0 hover:bg-muted/30 px-1 rounded transition-colors font-sans">
                                <span className="font-semibold font-mono text-warm-text">{col.col}</span>
                                <span className="text-brand-indigo font-sans">{col.type}</span>
                                <span className="text-warm-muted font-sans">{col.sample}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-warm-bg border-t border-warm-border flex items-center justify-between shrink-0 font-sans">
          <span className="text-[11px] text-warm-muted">
            {subtab === 'sources'
              ? `${setup.sources.length} baseline datasets loaded successfully`
              : `3 baseline datasets · ${setup.segments.length + setup.parameters.length + 1} business variables configured`
            }
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-lg text-[12px] font-semibold text-warm-text transition-colors cursor-pointer font-sans">
              Save Draft
            </button>
            <button
              onClick={() => {
                if (subtab === 'sources') {
                  navigate('/dashboard/blueprint/general');
                } else {
                  navigate('/dashboard/ecr-build');
                }
              }}
              disabled={(!subtab || subtab === 'general') && isFormInvalid}
              className="px-4 py-1.5 bg-brand-indigo hover:opacity-90 active:opacity-100 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer font-sans disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {subtab === 'sources' ? 'View Setup Summary' : 'Proceed to Simulation Builder'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
