import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  Play, 
  FileText, 
  RotateCw, 
  Plus, 
  ArrowLeft, 
  Download, 
  Pin,
  HelpCircle
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

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

export default function CenterPanel() {
  const {
    screen,
    setScreen,
    setup,
    toggleSegment,
    toggleParameter,
    setFocalPoint,
    relationships,
    toggleRelationshipConfirmed,
    growthRates,
    dimensions,
    setDimensionSelected,
    egrTarget,
    setEgrTarget,
    scenarios,
    toggleScenarioChecked,
    optimisationResult,
    runOptimisation,
    runScenarioB
  } = useStore();

  const { tab, subtab } = useParams<{ tab: string; subtab?: string }>();
  const navigate = useNavigate();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [inspectedTableId, setInspectedTableId] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Helper to draw horizontal cubic bezier curves for SVG connectors
  const getBezierPath = (ax: number, ay: number, bx: number, by: number) => {
    // Add offset to make lines come out from right edge of card (width=200, height=100)
    // Left edge input and right edge output
    const startX = ax + 200;
    const startY = ay + 45;
    const endX = bx;
    const endY = by + 45;
    const mx = (startX + endX) / 2;
    return `M ${startX},${startY} C ${mx},${startY} ${mx},${endY} ${endX},${endY}`;
  };

  const getVerticalBezierPath = (ax: number, ay: number, bx: number, by: number) => {
    // Top-to-bottom vertical line
    const startX = ax + 100;
    const startY = ay + 90;
    const endX = bx + 100;
    const endY = by;
    const my = (startY + endY) / 2;
    return `M ${startX},${startY} C ${startX},${my} ${endX},${my} ${endX},${endY}`;
  };

  return (
    <div className="flex-1 h-[calc(100vh-48px)] relative bg-warm-bg overflow-auto select-none no-scrollbar">
      {/* Canvas Radial Dot Grid Background (from UI-Color.png) */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#E5DFD5 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          opacity: 0.75
        }}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-brand-indigo text-white font-sans text-[12.5px] px-4 py-2.5 rounded-xl shadow-lg border border-lavender/30 flex items-center gap-2 animate-float-up">
          <Check className="h-4 w-4 text-peach" />
          {toastMsg}
        </div>
      )}

      {/* Screen Render Switch */}
      <div className="relative z-10 p-6 min-h-full flex flex-col justify-between">
        
        {/* ==================== SCREEN 01: TALK (Conversation-First) ==================== */}
        {screen === 1 && (
          <div className="max-w-[720px] w-full mx-auto flex flex-col gap-8 my-auto animate-float-up pb-12">
            {/* Hero Block */}
            <div className="text-center flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-peach via-lavender to-brand-indigo flex items-center justify-center shadow-md animate-pulse-ring">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-warm-text leading-tight tracking-tight sm:text-4xl">
                What decision are you trying to make?
              </h1>
              <p className="text-[14px] text-warm-muted max-w-xl leading-relaxed">
                Tell me about the problem. I'll help you think it through and figure out what data and dimensions we'll need — before we touch any spreadsheets.
              </p>
            </div>

            {/* Conversation Flow Card */}
            <div className="bg-white border border-warm-border rounded-2xl shadow-card p-6 flex flex-col gap-6">
              {/* AI Bubble 1 */}
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-lavender flex items-center justify-center shrink-0 border border-warm-border">
                  <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[11.5px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
                  <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-4 rounded-2xl rounded-tl-sm border border-warm-border/50">
                    Hi Robert. I'm here to help you frame a decision. We can talk it through first — once I understand the shape of the problem, I'll know what data to ask you for.
                    <div className="mt-3 font-semibold">A few common starting points, or just describe it in your own words:</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="px-3 py-1.5 rounded-full bg-white hover:bg-peach/10 border border-warm-border text-[11px] font-medium text-warm-text cursor-pointer hover:border-peach transition-all shadow-sm">I want to raise prices</span>
                      <span className="px-3 py-1.5 rounded-full bg-white hover:bg-peach/10 border border-warm-border text-[11px] font-medium text-warm-text cursor-pointer hover:border-peach transition-all shadow-sm">Hit a growth target next year</span>
                      <span className="px-3 py-1.5 rounded-full bg-white hover:bg-peach/10 border border-warm-border text-[11px] font-medium text-warm-text cursor-pointer hover:border-peach transition-all shadow-sm">Reduce operating costs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Bubble 1 */}
              <div className="flex gap-3 self-end justify-end max-w-[85%]">
                <div className="flex flex-col gap-1.5 text-right items-end">
                  <span className="text-[11.5px] font-semibold text-warm-text uppercase tracking-wider">Robert M.</span>
                  <div className="text-[13px] text-brand-indigo leading-relaxed bg-lavender/20 p-4 rounded-2xl rounded-tr-sm border border-lavender/40 text-left">
                    We're thinking about raising prices on our Enterprise tier by 8–12% next quarter. I want to understand the trade-off between revenue uplift and churn risk before we commit.
                  </div>
                </div>
              </div>

              {/* AI Bubble 3: Decision Frame Summary */}
              <div className="flex gap-3 pt-4 border-t border-warm-border/60">
                <div className="h-7 w-7 rounded-full bg-lavender flex items-center justify-center shrink-0 border border-warm-border">
                  <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-[11.5px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
                  <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-4 rounded-2xl rounded-tl-sm border border-warm-border/50 w-full flex flex-col gap-4">
                    <div>Good — that's enough to build a real model. Here's what I'm understanding:</div>
                    
                    {/* World model Summary Sheet */}
                    <div className="border border-warm-border rounded-xl bg-white p-3 font-mono text-[11.5px] flex flex-col gap-1.5 shadow-inner">
                      <div className="flex justify-between border-b border-warm-bg pb-1"><span className="text-warm-muted">Decision</span><span className="font-semibold text-warm-text">Set Enterprise price change for next FY</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1"><span className="text-warm-muted">Objective</span><span className="font-semibold text-warm-text">Maximise net revenue subject to churn ≤ 6%</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1"><span className="text-warm-muted">Levers</span><span className="font-semibold text-warm-text">Price uplift % · tier eligibility</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1"><span className="text-warm-muted">Dimensions</span><span className="font-semibold text-warm-text">Customer, ARR band, Region, Quarter</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1"><span className="text-warm-muted">Inputs</span><span className="font-semibold text-warm-text">Past price change, renewal history, usage</span></div>
                      <div className="flex justify-between"><span className="text-warm-muted">Method</span><span className="font-semibold text-warm-text">Newton-Raphson on elasticity-adjusted EGR</span></div>
                    </div>

                    {/* Readiness Banner */}
                    <div className="p-3 bg-sage-light border border-sage-border rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-sage/20 flex items-center justify-center border border-sage-border shrink-0">
                          <Check className="h-3.5 w-3.5 text-sage" />
                        </div>
                        <span className="text-[12px] font-medium text-warm-text">
                          <strong>World model framed.</strong> 5 dimensions identified, 3 sources ready.
                        </span>
                      </div>
                      <button 
                        onClick={() => setScreen(2)}
                        className="py-1.5 px-4 bg-sage hover:bg-sage/90 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        Upload data
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

         {/* ==================== ROUTE: SETUP ==================== */}
        {(tab === 'setup' || screen === 2) && (
          <div className="flex flex-col gap-6 animate-float-up h-full">
            {/* Stepper */}
            <div className="flex items-center gap-1.5 self-start bg-white/70 px-3 py-1.5 border border-warm-border rounded-full shadow-sm">
              <span className="h-5 w-5 bg-brand-indigo rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm">1</span>
              <span className="text-[11.5px] font-bold text-brand-indigo">Define</span>
              <span className="h-px w-6 bg-warm-border"></span>
              <span className="h-5 w-5 bg-secondary rounded-full text-warm-muted text-[10px] font-medium flex items-center justify-center">2</span>
              <span className="text-[11.5px] font-medium text-warm-muted">Construct</span>
              <span className="h-px w-6 bg-warm-border"></span>
              <span className="h-5 w-5 bg-secondary rounded-full text-warm-muted text-[10px] font-medium flex items-center justify-center">3</span>
              <span className="text-[11.5px] font-medium text-warm-muted">Optimise</span>
            </div>

            {/* Setup Card */}
            <div className="max-w-[680px] w-full mx-auto my-auto bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden flex flex-col justify-between">
              <div className="p-5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col animate-fade-in">
                    <span className="text-[9.5px] font-bold text-brand-indigo uppercase tracking-wider block mb-1">
                      Step 1 of 3 · World-Model Setup
                    </span>
                    <h2 className="text-[18px] font-bold text-warm-text mb-0.5">
                      Define what we're modelling
                    </h2>
                  </div>
                  
                  {/* Premium Sub-tabs switcher */}
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

              <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[380px] custom-scrollbar">
                {(!subtab || subtab === 'general') && (
                  <div className="flex flex-col gap-5">
                    {/* Focal Point */}
                    <div className="grid grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                      <div className="col-span-1">
                        <span className="text-[12px] font-semibold text-warm-text block">Focal point</span>
                        <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">The single outcome we'll optimise.</span>
                      </div>
                      <div className="col-span-3 flex flex-col gap-2">
                        <input
                          type="text"
                          value={setup.focalPoint}
                          onChange={(e) => setFocalPoint(e.target.value)}
                          className="w-full px-3 py-1.5 border border-warm-border rounded-lg text-[13px] bg-warm-bg/30 text-warm-text focus:outline-none focus:border-brand-indigo font-sans"
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
                    <div className="grid grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                      <div className="col-span-1">
                        <span className="text-[12px] font-semibold text-warm-text block">Time</span>
                        <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Granularity and horizon.</span>
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[11px] font-medium text-warm-muted">
                          {['Day', 'Week', 'Month', 'Quarter', 'Year'].map((t) => (
                            <span key={t} className={`px-2.5 py-1 rounded-md ${t === setup.timeGranularity ? 'bg-white text-brand-indigo shadow-sm font-semibold' : ''}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-lavender/30 border border-lavender/50 text-[11.5px] font-mono text-brand-indigo font-semibold shadow-sm">
                          {setup.timeRange}
                        </span>
                      </div>
                    </div>

                    {/* Segments */}
                    <div className="grid grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                      <div className="col-span-1">
                        <span className="text-[12px] font-semibold text-warm-text block">Segments</span>
                        <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Detected in your database.</span>
                      </div>
                      <div className="col-span-3 flex flex-wrap gap-1.5">
                        {['Region', 'Product Line', 'Customer Tier', 'Sales Channel'].map((seg) => {
                          const isSel = setup.segments.includes(seg);
                          return (
                            <button
                              key={seg}
                              onClick={() => toggleSegment(seg)}
                              className={`px-3 py-1 border rounded-full text-[11.5px] font-medium transition-all duration-150 cursor-pointer ${
                                isSel
                                  ? 'bg-brand-indigo border-brand-indigo text-white shadow-sm font-semibold'
                                  : 'bg-transparent border-warm-border hover:bg-muted text-warm-muted'
                              }`}
                            >
                              {seg}
                            </button>
                          );
                        })}
                        <span className="px-3 py-1 border border-dashed border-peach bg-[#FFF2EE] text-brand-indigo rounded-full text-[11.5px] font-medium flex items-center gap-1 cursor-pointer font-sans" onClick={() => toggleSegment('Acquisition Cohort')}>
                          <Sparkles className="h-3 w-3 text-peach" />
                          Acquisition Cohort
                        </span>
                      </div>
                    </div>

                    {/* Parameters */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <div className="col-span-1">
                        <span className="text-[12px] font-semibold text-warm-text block">Parameters</span>
                        <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Metrics to track and model.</span>
                      </div>
                      <div className="col-span-3 flex flex-wrap gap-1.5">
                        {['Revenue', 'Cost Centre', 'Gross Margin', 'Units Sold', 'CAC'].map((param) => {
                          const isSel = setup.parameters.includes(param);
                          return (
                            <button
                              key={param}
                              onClick={() => toggleParameter(param)}
                              className={`px-3 py-1 border rounded-full text-[11.5px] font-medium transition-all duration-150 cursor-pointer ${
                                isSel
                                  ? 'bg-brand-indigo border-brand-indigo text-white shadow-sm font-semibold'
                                  : 'bg-transparent border-warm-border hover:bg-muted text-warm-muted'
                              }`}
                            >
                              {param}
                            </button>
                          );
                        })}
                        <span className="px-3 py-1 border border-dashed border-peach bg-[#FFF2EE] text-brand-indigo rounded-full text-[11.5px] font-medium flex items-center gap-1 cursor-pointer font-sans" onClick={() => toggleParameter('LTV / Payback')}>
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
                {/* ==================== ROUTE: BUILD ==================== */}
        {(tab === 'build' || screen === 3) && (
          <div className="flex flex-col gap-6 animate-float-up h-full w-full">
            {/* Stepper with Nested Navigation Switcher */}
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5 bg-white/70 px-3 py-1.5 border border-warm-border rounded-full shadow-sm">
                <span className="h-5 w-5 bg-sage text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">✓</span>
                <span className="text-[11.5px] font-bold text-sage">Define</span>
                <span className="h-px w-6 bg-sage-border"></span>
                <span className="h-5 w-5 bg-brand-indigo rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm">2</span>
                <span className="text-[11.5px] font-bold text-brand-indigo">Construct</span>
                <span className="h-px w-6 bg-warm-border"></span>
                <span className="h-5 w-5 bg-secondary rounded-full text-warm-muted text-[10px] font-medium flex items-center justify-center">3</span>
                <span className="text-[11.5px] font-medium text-warm-muted">Optimise</span>
              </div>

              {/* Subtab Segment Switcher */}
              <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[10.5px] font-medium text-warm-muted">
                <button
                  onClick={() => navigate('/dashboard/build/dimensions')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    (!subtab || subtab === 'dimensions') 
                      ? 'bg-white text-brand-indigo shadow-sm font-semibold' 
                      : 'hover:text-warm-text'
                  }`}
                >
                  Dimensions & Vectors
                </button>
                <button
                  onClick={() => navigate('/dashboard/build/relationships')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    subtab === 'relationships' 
                      ? 'bg-white text-brand-indigo shadow-sm font-semibold' 
                      : 'hover:text-warm-text'
                  }`}
                >
                  Baseline Rates & Rules
                </button>
              </div>
            </div>

            {/* Split canvas - Dimensions View */}
            {(!subtab || subtab === 'dimensions') && (
              <div className="flex-1 w-full grid grid-cols-12 gap-6 relative min-h-[480px]">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  <path d={getBezierPath(60, 96, 620, 96)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
                  <path d={getBezierPath(60, 260, 620, 96)} stroke="#FF5A1F" strokeWidth="2.2" fill="none" className="animate-marching-ants" />
                  <path d={getBezierPath(60, 424, 620, 96)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
                  <path d={getBezierPath(60, 588, 620, 96)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
                </svg>

                <div className="col-span-5 flex flex-col gap-4 z-20 justify-center">
                  {[
                    { id: 'qtr', name: 'Quarter', type: 'date', samples: ['Q1 2025', 'Q2 2025', 'Q3 2025'], status: 'ok' },
                    { id: 'rev', name: 'Revenue', type: 'numeric', samples: ['$1.24M', '$980K', '$2.10M'], status: 'ok', selected: true },
                    { id: 'reg', name: 'Region', type: 'categorical', samples: ['EMEA', 'APAC', 'NA-East'], status: 'ok' },
                    { id: 'prod', name: 'Product Line', type: 'categorical', samples: ['Enterprise', 'SMB', 'Self-serve'], status: 'busy' }
                  ].map((d) => (
                    <div
                      key={d.id}
                      className={`w-[200px] bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer ${
                        d.selected 
                          ? 'border-brand-indigo ring-2 ring-ring scale-102' 
                          : 'border-warm-border'
                      }`}
                    >
                      <div className="p-3 pb-2 flex flex-col gap-1 font-sans">
                        <div className="flex justify-between items-center text-sans">
                          <span className="text-[12px] font-bold text-warm-text">{d.name}</span>
                          {d.id === 'reg' && <Pin className="h-3.5 w-3.5 text-amber-warm shrink-0 fill-current" />}
                        </div>
                        <span className={`w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          d.type === 'numeric'
                            ? 'bg-lavender/30 text-brand-indigo'
                            : d.type === 'categorical'
                              ? 'bg-amber-warm-light text-amber-warm'
                              : 'bg-sage-light text-sage'
                        }`}>
                          {d.type}
                        </span>
                      </div>

                      <div className="px-3 pb-3 flex flex-col gap-0.5 border-b border-warm-border/30">
                        {d.samples.map((s, sIdx) => (
                          <span key={sIdx} className="text-[11px] font-mono text-warm-muted leading-tight">{s}</span>
                        ))}
                      </div>

                      <div className="px-3 py-1.5 bg-warm-bg/40 flex items-center gap-1.5 border-t border-warm-border/30">
                        {d.status === 'ok' ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse shrink-0" />
                            <span className="text-[10px] font-mono text-warm-muted font-medium">Vectorised ✓</span>
                          </>
                        ) : (
                          <>
                            <RotateCw className="h-3 w-3 text-amber-warm animate-spin shrink-0" />
                            <span className="text-[10px] font-mono text-amber-warm font-medium">Vectorising...</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="col-span-7 flex flex-col gap-4 z-20 justify-center font-sans">
                  <div className="p-6 bg-white border border-warm-border rounded-2xl shadow-card max-w-[420px]">
                    <div className="h-8 w-8 rounded-lg bg-lavender/40 flex items-center justify-center mb-3">
                      <Sparkles className="h-4.5 w-4.5 text-brand-indigo" />
                    </div>
                    <h3 className="text-[14px] font-bold text-warm-text mb-1">Vectorization Mapping</h3>
                    <p className="text-[12px] text-warm-muted leading-relaxed mb-4">
                      All dimensions and custom fields are currently parsed using the auto-selected multi-dimensional vector matrices. Marching orange connections indicate active data pipelines.
                    </p>
                    <button
                      onClick={() => navigate('/dashboard/build/relationships')}
                      className="px-4 py-1.5 bg-brand-indigo hover:opacity-90 active:opacity-100 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer font-sans"
                    >
                      View Growth Rates & Rules
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Relationships View - Full Width Cards */}
            {subtab === 'relationships' && (
              <div className="flex-1 w-full flex flex-col md:flex-row gap-6 relative min-h-[480px]">
                {/* Pre-calculated Growth Rates Card */}
                <div className="flex-1 bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="p-3.5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between font-sans">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-brand-indigo" />
                        <span className="text-[12.5px] font-bold text-warm-text font-sans">Pre-calculated Growth Rates</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-warm-muted">auto-generated · refreshed 12:08</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11.5px] font-mono">
                        <thead>
                          <tr className="bg-warm-bg/60 text-warm-muted font-sans font-bold border-b border-warm-border">
                            <th className="p-2.5 pl-3.5">Segment</th>
                            <th className="p-2.5">Q1</th>
                            <th className="p-2.5">Q2</th>
                            <th className="p-2.5">Q3</th>
                            <th className="p-2.5">Q4 (proj.)</th>
                            <th className="p-2.5 pr-3.5">YoY</th>
                          </tr>
                        </thead>
                        <tbody>
                          {growthRates.map((gr, gIdx) => (
                            <tr key={gIdx} className="border-b border-warm-border/40 hover:bg-warm-bg/15 transition-colors">
                              <td className="p-2.5 pl-3.5 font-sans font-semibold text-warm-text">{gr.segment}</td>
                              <td className="p-2.5 text-warm-muted">{gr.q1}</td>
                              <td className="p-2.5 text-warm-muted">{gr.q2}</td>
                              <td className="p-2.5 text-warm-muted">{gr.q3}</td>
                              <td className="p-2.5 font-semibold text-brand-indigo">{gr.q4Proj}</td>
                              <td className={`p-2.5 font-bold pr-3.5 ${gr.yoy.startsWith('+') ? 'text-sage' : 'text-destructive'}`}>
                                {gr.yoy}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="p-2.5 bg-warm-bg/30 border-t border-warm-border/60 flex items-center justify-between text-[10.5px]">
                    <span className="text-warm-muted">Baseline growth · 5 of 12 segments shown</span>
                    <span className="text-brand-indigo font-sans font-semibold hover:underline cursor-pointer">Expand all →</span>
                  </div>
                </div>

                {/* Drafted Relationships Card */}
                <div className="w-full md:w-[320px] bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden flex flex-col justify-between font-sans">
                  <div>
                    <div className="p-3.5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-warm-text">Drafted Relationships</span>
                      <span className="text-[9.5px] font-mono text-warm-muted">4 connections · confirm to lock</span>
                    </div>
                    <div className="p-3 flex flex-col gap-2 max-h-[380px] overflow-y-auto custom-scrollbar">
                      {relationships.map((rel, rIdx) => (
                        <div key={rIdx} className="flex flex-col gap-2 p-3 rounded-xl bg-warm-bg/40 border border-warm-border/60 hover:bg-white transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={rel.confirmed}
                                onChange={() => toggleRelationshipConfirmed(rIdx)}
                                className="rounded border-warm-border text-brand-indigo focus:ring-brand-indigo h-3.5 w-3.5 cursor-pointer mt-0.5"
                              />
                              <div className="flex flex-wrap items-center gap-1 text-[11.5px] font-semibold text-warm-text">
                                <span>{rel.a}</span>
                                <span className="text-brand-indigo font-mono font-bold">{rel.op}</span>
                                <span>{rel.b}</span>
                              </div>
                            </div>
                            <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                              rel.confirmed 
                                ? 'bg-sage-light text-sage border border-sage-border/30' 
                                : 'bg-amber-warm-light text-amber-warm border border-amber-warm-border/30'
                            }`}>
                              {rel.confirmed ? 'confirmed' : 'review'}
                            </span>
                          </div>
                          <span className="text-[10px] text-warm-muted font-sans font-medium pl-5">({rel.note})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-warm-bg/30 border-t border-warm-border/60 flex items-center justify-center text-[11px]">
                    <button 
                      onClick={() => navigate('/dashboard/batch')}
                      className="w-full py-1.5 bg-brand-indigo hover:opacity-90 active:opacity-100 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
                    >
                      Construct Optimization Matrix
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SCREEN 04: BATCH (Upload Staggered Canvas) ==================== */}
        {screen === 4 && (
          <div className="flex-1 w-full relative min-h-[480px] animate-float-up flex flex-col justify-between">
            {/* Organic Staggered Canvas objects mapping */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <path d={getBezierPath(60, 80, 320, 200)} stroke="#6E69BE" strokeWidth="2.2" fill="none" className="animate-marching-ants" />
            </svg>

            {/* Linking pill overlay on mid-line */}
            <div className="absolute top-[180px] left-[200px] z-20 bg-white border border-brand-indigo text-brand-indigo font-mono font-bold text-[9px] px-2 py-0.5 rounded-full shadow-sm animate-pulse-ring">
              linking...
            </div>

            {/* DimensionCards Staggered Placement */}
            <div className="flex-1 relative z-20 min-h-[500px]">
              {dimensions.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDimensionSelected(d.id)}
                  className={`absolute w-[200px] bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:scale-102 cursor-pointer z-30 ${
                    d.selected 
                      ? 'border-brand-indigo ring-2 ring-lavender/30 shadow-md' 
                      : 'border-warm-border'
                  }`}
                  style={{ left: `${d.x}px`, top: `${d.y}px` }}
                >
                  <div className="p-3 pb-2 flex flex-col gap-1">
                    <span className="text-[12px] font-bold text-warm-text">{d.name}</span>
                    <span className={`w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                      d.type === 'numeric'
                        ? 'bg-lavender/30 text-brand-indigo'
                        : d.type === 'categorical'
                          ? 'bg-amber-warm-light text-amber-warm'
                          : 'bg-sage-light text-sage'
                    }`}>
                      {d.type}
                    </span>
                  </div>

                  <div className="px-3 pb-3 flex flex-col gap-0.5 border-b border-warm-border/30">
                    {d.samples.map((s, sIdx) => (
                      <span key={sIdx} className="text-[11px] font-mono text-warm-muted leading-tight">{s}</span>
                    ))}
                  </div>

                  <div className="px-3 py-1.5 bg-warm-bg/40 flex items-center gap-1.5 border-t border-warm-border/30">
                    {d.status === 'ok' ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse shrink-0" />
                        <span className="text-[10px] font-mono text-warm-muted font-medium">Vectorised ✓</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="h-3 w-3 text-amber-warm animate-spin shrink-0" />
                        <span className="text-[10px] font-mono text-amber-warm font-medium">Vectorising...</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Hint label */}
            <div className="mt-4 self-center bg-white/70 px-4 py-1.5 border border-warm-border rounded-full shadow-sm text-[10px] font-mono text-warm-muted select-none z-20">
              18 fields parsed · 14 vectorised · drag to arrange
            </div>
          </div>
        )}

        {/* ==================== SCREEN 05: OPTIMISE (Model Pinned & Ready) ==================== */}
        {screen === 5 && (
          <div className="flex-1 w-full flex flex-col justify-between relative min-h-[480px] animate-float-up">
            
            {/* 1. Floating Controls Bar */}
            <div className="self-center bg-white border border-warm-border rounded-2xl shadow-float p-2.5 flex items-center gap-4 z-40 select-none">
              <div className="flex items-center gap-1.5 text-[12.5px]">
                <span className="font-semibold text-warm-text">EGR Target:</span>
                <div className="flex items-center bg-warm-bg/50 border border-warm-border rounded-lg px-2 py-1 max-w-[72px]">
                  <input
                    type="number"
                    value={egrTarget}
                    onChange={(e) => setEgrTarget(Number(e.target.value))}
                    className="w-full text-center bg-transparent border-none outline-none font-bold text-brand-indigo text-[13px] font-sans focus:ring-0"
                  />
                  <span className="font-bold text-brand-indigo">%</span>
                </div>
              </div>
              <span className="h-5 w-px bg-warm-border" />
              <span className="text-[11.5px] font-mono font-semibold text-brand-indigo bg-lavender/35 border border-lavender/40 px-2.5 py-1 rounded-lg">
                Q1 2025 → Q4 2025
              </span>
              <span className="h-5 w-px bg-warm-border" />
              <button 
                onClick={() => triggerToast("Simulating baseline growth models. (Mocked)")}
                className="px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-lg text-[12px] font-semibold text-warm-text cursor-pointer transition-colors"
              >
                Run Forecast
              </button>
              
              <button
                onClick={() => {
                  setIsOptimizing(true);
                  runOptimisation(() => {
                    setIsOptimizing(false);
                  });
                }}
                disabled={isOptimizing}
                className="px-4 py-1.5 bg-brand-indigo hover:bg-brand-indigo/90 disabled:opacity-50 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isOptimizing ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                Run Optimisation
              </button>
            </div>

            {/* 2. Structured SVG Connectors Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {/* Quarter -> Revenue -> Region */}
              <path d={getBezierPath(100, 130, 380, 130)} stroke="#6E69BE" strokeWidth="2.0" fill="none" />
              <path d={getBezierPath(380, 130, 660, 110)} stroke="#6E69BE" strokeWidth="2.0" fill="none" />
              
              {/* Revenue -> Cost Centre */}
              <path d={getVerticalBezierPath(380, 130, 380, 350)} stroke="#6E69BE" strokeWidth="2.0" fill="none" />
              
              {/* Product Line -> Cost Centre */}
              <path d={getBezierPath(100, 350, 380, 350)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
              
              {/* Cost Centre -> Gross Margin */}
              <path d={getBezierPath(380, 350, 660, 350)} stroke="#6E69BE" strokeWidth="2.0" fill="none" />
              
              {/* Cost Centre -> EGR Estimate */}
              <path d={getVerticalBezierPath(380, 350, 380, 560)} stroke="#6E69BE" strokeWidth="2.0" fill="none" />
            </svg>

            {/* 3. 7 Pinned DimensionCards Placement */}
            <div className="flex-1 relative z-20 min-h-[660px]">
              {dimensions.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDimensionSelected(d.id)}
                  className={`absolute w-[200px] bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer z-30 ${
                    d.pinned 
                      ? 'border-amber-warm ring-2 ring-amber-warm-light shadow-sm' 
                      : d.selected
                        ? 'border-brand-indigo ring-2 ring-lavender/30 shadow-sm'
                        : 'border-warm-border'
                  }`}
                  style={{ left: `${d.x}px`, top: `${d.y}px` }}
                >
                  <div className="p-3 pb-2 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-bold text-warm-text truncate max-w-[150px]">{d.name}</span>
                      {d.pinned && <Pin className="h-3.5 w-3.5 text-amber-warm fill-current shrink-0" />}
                    </div>
                    <span className={`w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                      d.type === 'numeric'
                        ? 'bg-lavender/30 text-brand-indigo'
                        : d.type === 'categorical'
                          ? 'bg-amber-warm-light text-amber-warm'
                          : 'bg-sage-light text-sage'
                    }`}>
                      {d.type}
                    </span>
                  </div>

                  <div className="px-3 pb-3 flex flex-col gap-0.5 border-b border-warm-border/30">
                    {d.samples.map((s, sIdx) => (
                      <span key={sIdx} className="text-[11px] font-mono text-warm-muted leading-tight truncate">{s}</span>
                    ))}
                  </div>

                  <div className={`px-3 py-1.5 flex items-center gap-1.5 border-t border-warm-border/30 ${d.pinned ? 'bg-amber-warm-light/40' : 'bg-warm-bg/40'}`}>
                    {d.pinned ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-warm shrink-0" />
                        <span className="text-[10px] font-mono text-amber-warm font-medium">Pinned · Q3 values</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-sage shrink-0" />
                        <span className="text-[10px] font-mono text-warm-muted font-medium">Vectorised ✓</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ==================== ROUTE: RESULTS ==================== */}
        {(tab === 'results' || screen === 6) && (
          <div className="flex-1 w-full flex flex-col justify-between relative min-h-[480px] animate-float-up select-none gap-6">
            {/* Navigation and Subtab Switcher */}
            <div className="flex w-full items-center justify-between z-30 relative shrink-0">
              <span className="text-[12px] font-mono text-warm-muted bg-white/70 px-3 py-1.5 border border-warm-border rounded-full shadow-sm">
                Newton-Raphson Engine Result
              </span>

              {/* Subtab Segment Switcher */}
              <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[10.5px] font-medium text-warm-muted">
                <button
                  onClick={() => navigate('/dashboard/results/summary')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    (!subtab || subtab === 'summary') 
                      ? 'bg-white text-brand-indigo shadow-sm font-semibold' 
                      : 'hover:text-warm-text'
                  }`}
                >
                  Optimisation Summary
                </button>
                <button
                  onClick={() => navigate('/dashboard/results/scenarios')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    subtab === 'scenarios' 
                      ? 'bg-white text-brand-indigo shadow-sm font-semibold' 
                      : 'hover:text-warm-text'
                  }`}
                >
                  Scenario Projections
                </button>
              </div>
            </div>

            {(!subtab || subtab === 'summary') && (
              <div className="flex-1 w-full flex flex-col md:flex-row gap-8 justify-center items-center relative z-20 min-h-[440px] animate-fade-in">
                {/* Visual SVG EGR Gauge */}
                <div className="bg-white border border-warm-border rounded-2xl shadow-card p-6 flex flex-col items-center justify-center w-[300px] h-[340px] font-sans">
                  <span className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block mb-4">EGR Growth Target</span>
                  
                  {/* Premium circular gauge */}
                  <div className="relative h-32 w-32 flex items-center justify-center mb-4">
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                      {/* Background circle */}
                      <path
                        className="text-secondary"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      {/* Active target circle */}
                      <path
                        className="text-brand-indigo animate-pulse"
                        strokeDasharray="92, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        style={{ color: '#FF5A1F' }}
                      />
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-warm-text font-sans">13.2%</span>
                      <span className="text-[10px] text-sage font-bold font-mono">Uplift ✓</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="text-[12.5px] font-semibold text-warm-text">Newton-Raphson Converged</span>
                    <span className="text-[11px] text-warm-muted">Target of {egrTarget}% exceeded by +1.2pp</span>
                  </div>
                </div>

                {/* Optimisation Result Card */}
                <div className="w-[320px] bg-white border border-sage-border rounded-2xl shadow-card overflow-hidden font-sans h-[340px] flex flex-col justify-between">
                  <div>
                    <div className="p-3.5 bg-gradient-to-r from-sage-light to-white border-b border-sage-border flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-sage/20 flex items-center justify-center border border-sage-border">
                        <Sparkles className="h-3.5 w-3.5 text-sage" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12.5px] font-bold text-warm-text font-sans">Optimisation Result</span>
                        <span className="text-[9px] font-mono text-warm-muted">Newton-Raphson · converged</span>
                      </div>
                    </div>
                    <div className="p-3.5 flex flex-col gap-2">
                      {optimisationResult?.rows.map((row, rIdx) => (
                        <div key={rIdx} className="flex items-center justify-between p-2 rounded-xl bg-warm-bg/40 border border-warm-border/50 font-sans">
                          <span className="text-[12px] font-semibold text-warm-text">{row.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-mono font-bold text-warm-text">{row.value}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              row.deltaDir === 'up' 
                                ? 'bg-sage-light text-sage' 
                                : row.deltaDir === 'down' 
                                  ? 'bg-destructive/10 text-destructive' 
                                  : 'bg-secondary text-warm-muted'
                            }`}>
                              {row.delta}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-sage-light/40 border-t border-sage-border/50 flex items-center justify-between text-[11.5px] font-sans">
                    <span className="text-warm-muted font-semibold">EGR achieved</span>
                    <span className="font-bold text-sage font-mono">13.2%</span>
                  </div>
                </div>
              </div>
            )}

            {subtab === 'scenarios' && (
              <div className="flex-1 w-full relative min-h-[480px] flex flex-col justify-between animate-fade-in text-sans">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-30">
                  <path d={getBezierPath(60, 110, 280, 110)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
                  <path d={getBezierPath(280, 110, 500, 110)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
                  <path d={getVerticalBezierPath(280, 110, 280, 300)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
                  <path d={getBezierPath(60, 300, 280, 300)} stroke="#DFDCD8" strokeWidth="1.5" fill="none" />
                </svg>

                <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                  {[
                    { name: 'Quarter', type: 'date', x: 60, y: 110 },
                    { name: 'Revenue', type: 'numeric', x: 280, y: 110 },
                    { name: 'Region', type: 'categorical', x: 500, y: 110, pinned: true },
                    { name: 'Cost Centre', type: 'numeric', x: 280, y: 300 },
                    { name: 'Product Line', type: 'categorical', x: 60, y: 300 }
                  ].map((d, dIdx) => (
                    <div
                      key={dIdx}
                      className="absolute w-[180px] bg-white border border-warm-border rounded-xl p-3 flex flex-col justify-between font-sans"
                      style={{ left: `${d.x}px`, top: `${d.y}px` }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[11.5px] font-bold text-warm-text/80">{d.name}</span>
                        {d.pinned && <Pin className="h-3 w-3 text-amber-warm" />}
                      </div>
                      <span className="text-[9px] text-warm-muted/60 mt-1 font-mono uppercase">{d.type}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1 relative z-20 min-h-[500px]">
                  {/* Scenario A Card */}
                  <div className="absolute left-[70px] top-[40px] w-[260px] bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden z-30 hover:shadow-md transition-shadow font-sans font-sans">
                    <div className="p-3 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-warm-text truncate max-w-[180px]">Scenario A — Baseline</span>
                      <span className="text-[9px] font-mono text-warm-muted">Q2 Forecast</span>
                    </div>
                    <div className="p-3.5 flex flex-col gap-2.5 font-sans">
                      <div className="flex justify-between border-b border-warm-bg pb-1.5"><span className="text-[11.5px] text-warm-muted">Revenue</span><span className="text-[12px] font-semibold font-mono text-warm-text">{scenarios[0].revenue}</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1.5"><span className="text-[11.5px] text-warm-muted">YoY Growth</span><span className="text-[12px] font-semibold font-mono text-warm-text">{scenarios[0].yoy}</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1.5"><span className="text-[11.5px] text-warm-muted">EGR Est.</span><span className="text-[12px] font-bold font-mono text-brand-indigo">{scenarios[0].egr}</span></div>
                      
                      <div className="mt-1 h-10 w-full bg-secondary/35 rounded-xl border border-warm-border/50 flex items-center justify-center p-1.5">
                        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <path d="M 0 25 Q 15 22 30 18 T 60 12 T 90 5 T 100 0" fill="none" stroke="#FF5A1F" strokeWidth="2.0" />
                        </svg>
                      </div>
                    </div>
                    <div className="p-2.5 bg-warm-bg/40 border-t border-warm-border/50 flex items-center gap-2 text-[11.5px] cursor-pointer font-sans" onClick={() => handleScenarioCheckboxClick('A')}>
                      <input
                        type="checkbox"
                        checked={scenarios[0].checked}
                        onChange={() => {}}
                        className="rounded border-warm-border text-brand-indigo h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="text-warm-muted font-sans font-medium">Compare Scenario</span>
                    </div>
                  </div>

                  {/* Scenario B Card */}
                  <div className="absolute left-[440px] top-[40px] w-[260px] bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden z-30 hover:shadow-md transition-shadow font-sans">
                    <div className="p-3 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-warm-text truncate max-w-[180px]">Scenario B — Optimised</span>
                      <span className="text-[9px] font-mono text-warm-muted">Newton-Raphson</span>
                    </div>
                    <div className="p-3.5 flex flex-col gap-2.5 font-sans">
                      <div className="flex justify-between border-b border-warm-bg pb-1.5"><span className="text-[11.5px] text-warm-muted">Revenue</span><span className="text-[12px] font-semibold font-mono text-warm-text">{scenarios[1].revenue}</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1.5"><span className="text-[11.5px] text-warm-muted">YoY Growth</span><span className="text-[12px] font-semibold font-mono text-warm-text">{scenarios[1].yoy}</span></div>
                      <div className="flex justify-between border-b border-warm-bg pb-1.5"><span className="text-[11.5px] text-warm-muted">EGR Est.</span><span className="text-[12px] font-bold font-mono text-sage">{scenarios[1].egr}</span></div>
                      
                      <div className="mt-1 h-10 w-full bg-secondary/35 rounded-xl border border-warm-border/50 flex items-center justify-center p-1.5 font-sans">
                        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                          <path d="M 0 25 Q 15 20 30 14 T 60 7 T 90 2 T 100 0" fill="none" stroke="#8EA885" strokeWidth="2.2" />
                        </svg>
                      </div>
                    </div>
                    <div className="p-2.5 bg-warm-bg/40 border-t border-warm-border/50 flex items-center gap-2 text-[11.5px] cursor-pointer font-sans" onClick={() => handleScenarioCheckboxClick('B')}>
                      <input
                        type="checkbox"
                        checked={scenarios[1].checked}
                        onChange={() => {}}
                        className="rounded border-warm-border text-brand-indigo h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="text-warm-muted font-sans font-medium">Compare Scenario</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 self-center bg-white/70 px-4 py-1.5 border border-warm-border rounded-full shadow-sm text-[10px] font-mono text-warm-muted select-none z-20 font-sans">
                  Check both "Compare Scenario" boxes to launch side-by-side trade-off review
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SCREEN 07: COMPARE (Trade-Off Comparison) ==================== */}
        {screen === 7 && (
          <div className="flex flex-col gap-5 animate-float-up h-full w-full select-none">
            
            {/* Top-Left Breadcrumb */}
            <button
              onClick={() => setScreen(6)}
              className="flex items-center gap-1.5 self-start bg-white/70 hover:bg-white border border-warm-border px-3 py-1.5 rounded-full shadow-sm text-[11.5px] font-bold text-brand-indigo transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Canvas › Scenario Comparison
            </button>

            {/* Comparison Table Card */}
            <div className="max-w-[760px] w-full mx-auto my-auto bg-white border border-warm-border rounded-2xl shadow-float overflow-hidden flex flex-col justify-between">
              
              {/* Head */}
              <div className="p-4 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25">
                <h2 className="text-[17px] font-bold text-warm-text">
                  Trade-off — Scenario A vs Scenario B
                </h2>
                <p className="text-[12px] text-warm-muted">
                  Generated 14:36 · Newton-Raphson Optimization · {egrTarget}% EGR target
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px] font-sans">
                  <thead>
                    <tr className="bg-warm-bg/60 text-warm-muted font-bold border-b border-warm-border">
                      <th className="p-3 pl-4">Metric</th>
                      <th className="p-3">Scenario A (Baseline)</th>
                      <th className="p-3">Scenario B (Optimised)</th>
                      <th className="p-3 pr-4">Δ Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1 */}
                    <tr className="border-b border-warm-border/40 hover:bg-warm-bg/15 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-warm-text">Forecasted EGR</td>
                      <td className="p-3 font-mono text-warm-muted">11.8%</td>
                      <td className="p-3 font-mono font-bold text-sage bg-sage-light/25">13.2%</td>
                      <td className="p-3 pr-4 font-mono font-bold text-sage">+1.4pp</td>
                    </tr>
                    {/* Row 2 */}
                    <tr className="border-b border-warm-border/40 hover:bg-warm-bg/15 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-warm-text">Revenue Outcome</td>
                      <td className="p-3 font-mono text-warm-muted">$2.00M</td>
                      <td className="p-3 font-mono font-bold text-warm-text bg-sage-light/25">$2.40M</td>
                      <td className="p-3 pr-4 font-mono font-bold text-sage">+$400K</td>
                    </tr>
                    {/* Row 3 */}
                    <tr className="border-b border-warm-border/40 hover:bg-warm-bg/15 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-warm-text">Cost Allocation</td>
                      <td className="p-3 font-mono text-warm-muted">$1.00M</td>
                      <td className="p-3 font-mono font-bold text-sage bg-sage-light/25">$980K</td>
                      <td className="p-3 pr-4 font-mono font-bold text-sage">−$20K</td>
                    </tr>
                    {/* Row 4 */}
                    <tr className="border-b border-warm-border/40 hover:bg-warm-bg/15 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-warm-text">YoY Growth</td>
                      <td className="p-3 font-mono text-warm-muted">+8%</td>
                      <td className="p-3 font-mono font-bold text-warm-text bg-sage-light/25">+18%</td>
                      <td className="p-3 pr-4 font-mono font-bold text-sage">+10pp</td>
                    </tr>
                    {/* Row 5 */}
                    <tr className="border-b border-warm-border/40 hover:bg-warm-bg/15 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-warm-text">EGR Gap vs Target</td>
                      <td className="p-3 font-mono text-warm-muted">−0.2pp</td>
                      <td className="p-3 font-mono font-bold text-sage bg-sage-light/25">+1.2pp</td>
                      <td className="p-3 pr-4 font-mono text-warm-muted">—</td>
                    </tr>
                    {/* Sparklines trajectories Row */}
                    <tr className="hover:bg-warm-bg/15 transition-colors">
                      <td className="p-3 pl-4 font-semibold text-warm-text">EGR Trajectory</td>
                      <td className="p-3">
                        <div className="h-10 w-36 bg-secondary/35 rounded-lg border border-warm-border/50 flex items-center p-1.5">
                          <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <path d="M 0 25 Q 15 22 30 18 T 60 12 T 90 5 T 100 0" fill="none" stroke="#6E69BE" strokeWidth="2.0" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-3 bg-sage-light/25">
                        <div className="h-10 w-36 bg-secondary/35 rounded-lg border border-warm-border/50 flex items-center p-1.5">
                          <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <path d="M 0 25 Q 15 20 30 14 T 60 7 T 90 2 T 100 0" fill="none" stroke="#8EA885" strokeWidth="2.2" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-3 pr-4 font-semibold text-sage">Scenario B wins</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Foot */}
              <div className="p-4 bg-warm-bg border-t border-warm-border flex items-center justify-between shrink-0">
                <span className="text-[11.5px] font-semibold text-sage flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 fill-current" />
                  Scenario B outperforms on 5 of 5 metrics. Recommended.
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => triggerToast("Scenario Comparison exported as CSV. (Mocked)")}
                    className="px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-lg text-[12px] font-semibold text-warm-text transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Download className="h-3.5 w-3.5 text-warm-muted" />
                    Export
                  </button>
                  <button
                    onClick={() => triggerToast("Scenario B locked. Recommendations dispatched to region leads!")}
                    className="px-4 py-1.5 bg-sage hover:bg-sage/90 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Select Scenario B
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
