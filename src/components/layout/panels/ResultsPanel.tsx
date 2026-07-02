import React from 'react';
import { Sparkles, TrendingUp, CheckCircle2, ArrowRight, BarChart3, AlertCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../../store/useStore';

// ── Mock quarterly breakdown ──────────────────────────────────────────────────
const QUARTERLY = [
  { q: 'Q1 2025', egr: '8.4%',  rev: '$1.92M', cost: '$640K', margin: '66.7%', achieved: 28 },
  { q: 'Q2 2025', egr: '9.2%',  rev: '$2.04M', cost: '$712K', margin: '65.1%', achieved: 31 },
  { q: 'Q3 2025', egr: '10.1%', rev: '$2.18M', cost: '$801K', margin: '63.3%', achieved: 34 },
  { q: 'Q4 2025', egr: '13.2%', rev: '$2.40M', cost: '$884K', margin: '63.2%', achieved: 44, peak: true },
];

const METRICS = [
  { name: 'Revenue',       value: '$2.40M', delta: '↑ +18%',  dir: 'up'   as const },
  { name: 'Cost Centre',   value: '$980K',  delta: '↓ −6%',   dir: 'down' as const },
  { name: 'Gross Margin',  value: '63.2%',  delta: '— stable', dir: 'flat' as const },
  { name: 'Churn Rate',    value: '4.2%',   delta: '✓ ≤ 6%',  dir: 'up'   as const },
  { name: 'EGR Achieved',  value: '13.2%',  delta: '↑ +1.2pp', dir: 'up'  as const },
];

const INSIGHTS = [
  'Revenue uplift in Q4 accounts for ~60% of EGR gain.',
  'Cost Centre reduction contributes additional 40%.',
  'Churn constraint (≤ 6%) satisfied — actual 4.2%.',
];

// ── EGR arc helper ────────────────────────────────────────────────────────────
function EGRGauge({ target, achieved }: { target: number; achieved: number }) {
  const pct     = Math.min((achieved / (target * 1.4)) * 100, 100);
  const dash    = `${pct}, 100`;
  const isOver  = achieved > target;
  const color   = isOver ? '#8EA885' : '#FF5A1F';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-36 w-36 flex items-center justify-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path stroke="#F0EDE9" strokeWidth="3.5" fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path stroke={color} strokeDasharray={dash} strokeWidth="3.5" strokeLinecap="round" fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            className="animate-pulse" />
          {/* Target marker */}
          <circle cx="18" cy="2.5" r="1.5" fill={color} opacity="0.5" />
        </svg>
        <div className="flex flex-col items-center z-10">
          <span className="text-[26px] font-extrabold text-warm-text leading-none">{achieved}%</span>
          <span className={`text-[10px] font-bold font-mono mt-0.5 ${isOver ? 'text-sage' : 'text-peach'}`}>
            {isOver ? `+${(achieved - target).toFixed(1)}pp over` : 'below target'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-sans">
        <span className="text-warm-muted">Target</span>
        <span className="font-bold text-warm-text font-mono">{target}%</span>
        <span className="text-warm-muted">·</span>
        <span className="text-warm-muted">Achieved</span>
        <span className="font-bold font-mono" style={{ color }}>{achieved}%</span>
      </div>
    </div>
  );
}

// ── Inline sparkline ──────────────────────────────────────────────────────────
function Spark({ color, path }: { color: string; path: string }) {
  return (
    <div className="h-8 w-full bg-secondary/30 rounded-lg border border-warm-border/40 p-1">
      <svg className="w-full h-full" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth="2.2" />
      </svg>
    </div>
  );
}

export default function ResultsPanel() {
  const { egrTarget, optimisationResult, scenarios, toggleScenarioChecked, model, selectedProvenanceMetric, setSelectedProvenanceMetric, workspaceMetrics } = useStore();
  const { subtab } = useParams<{ subtab?: string }>();
  const navigate   = useNavigate();

  const noResult = !optimisationResult;

  React.useEffect(() => {
    const activeChecked = scenarios.filter(s => s.checked);
    if (activeChecked.length === 2) {
      const timer = setTimeout(() => {
        navigate('/dashboard/learning');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [scenarios, navigate]);

  return (
    <div className="w-full flex flex-col gap-5 animate-float-up pt-4 max-w-[960px] mx-auto">

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-lavender/40 border border-lavender/50 flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-brand-indigo" />
          </div>
          <span className="text-[13px] font-bold text-warm-text">Results</span>
          {optimisationResult && (
            <span className="text-[10px] font-mono text-sage bg-sage-light border border-sage-border px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Converged · {optimisationResult.durationMs}ms
            </span>
          )}
        </div>

        <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[10.5px] font-medium text-warm-muted">
          <button onClick={() => navigate('/dashboard/workspace/summary')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              (!subtab || subtab === 'summary') ? 'bg-white text-brand-indigo shadow-sm font-semibold' : 'hover:text-warm-text'
            }`}>
            Summary
          </button>
          <button onClick={() => navigate('/dashboard/workspace/scenarios')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              subtab === 'scenarios' ? 'bg-white text-brand-indigo shadow-sm font-semibold' : 'hover:text-warm-text'
            }`}>
            Scenarios
          </button>
        </div>
      </div>

      {/* ── No result state ─────────────────────────────────────── */}
      {noResult && (
        <div className="flex flex-col items-center justify-center bg-white border border-warm-border rounded-2xl p-12 gap-4 shadow-card">
          <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-warm-muted" />
          </div>
          <span className="text-[13px] font-semibold text-warm-text">No IPS solver results yet</span>
          <span className="text-[12px] text-warm-muted">Run the solver from the IPS Engine screen first.</span>
          <button onClick={() => navigate('/dashboard/ips-engine')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-indigo text-white rounded-xl text-[12px] font-bold cursor-pointer hover:opacity-90 transition-colors">
            Go to IPS Engine <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Summary tab ─────────────────────────────────────────── */}
      {!noResult && (!subtab || subtab === 'summary') && (
        <div className="flex flex-col gap-5 animate-fade-in">

          {/* Method + convergence banner */}
          <div className="bg-white border border-warm-border rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-lavender/30 border border-lavender/40 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-brand-indigo" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12.5px] font-bold text-warm-text">{model} Optimisation</span>
                <span className="text-[10px] font-mono text-warm-muted">
                  Converged in {optimisationResult.durationMs}ms · {optimisationResult.timestamp}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-sage bg-sage-light border border-sage-border px-2.5 py-1 rounded-full font-semibold">
                EGR {optimisationResult.egrAchieved}% achieved
              </span>
              <span className="text-[10px] font-mono text-warm-muted bg-secondary border border-warm-border px-2.5 py-1 rounded-full">
                target {optimisationResult.target}%
              </span>
            </div>
          </div>

          {/* 3-column main content */}
          <div className="grid grid-cols-12 gap-4">

            {/* Left: EGR Gauge */}
            <div
              onClick={() => setSelectedProvenanceMetric('EGR Achieved')}
              className={`col-span-12 lg:col-span-4 bg-white border rounded-2xl p-5 flex flex-col items-center gap-4 shadow-card hover:bg-lavender/5 hover:border-brand-indigo/35 transition-all cursor-pointer group ${
                selectedProvenanceMetric === 'EGR Achieved' ? 'ring-2 ring-brand-indigo/20 border-brand-indigo' : 'border-warm-border'
              }`}
            >
              <span className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider self-start flex justify-between w-full items-center">
                EGR Performance
                <span className="text-[8px] text-brand-indigo font-normal normal-case opacity-0 group-hover:opacity-100 transition-opacity">click to inspect</span>
              </span>
              <EGRGauge target={optimisationResult.target} achieved={optimisationResult.egrAchieved} />

              {/* Insights */}
              <div className="w-full flex flex-col gap-2 pt-2 border-t border-warm-border/40">
                {INSIGHTS.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sage shrink-0 mt-0.5" />
                    <span className="text-[10.5px] text-warm-muted leading-snug">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle: Metrics */}
            <div className="col-span-12 lg:col-span-4 bg-white border border-warm-border rounded-2xl overflow-hidden shadow-card flex flex-col">
              <div className="px-4 py-3 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/20 flex justify-between items-center">
                <span className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider">Key Metrics</span>
                <span className="text-[8px] text-brand-indigo lowercase">click row for provenance</span>
              </div>
              <div className="flex flex-col divide-y divide-warm-border/40">
                {workspaceMetrics.map((m, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedProvenanceMetric(m.name)}
                    className={`flex items-center justify-between px-4 py-2.5 hover:bg-lavender/5 hover:text-brand-indigo transition-colors cursor-pointer group ${
                      selectedProvenanceMetric === m.name ? 'bg-lavender/10 border-l-2 border-brand-indigo font-medium' : ''
                    }`}
                  >
                    <span className="text-[12px] font-semibold text-warm-text">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold font-mono text-warm-text">{m.value}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        m.dir === 'up'   ? 'bg-sage-light text-sage' :
                        m.dir === 'down' ? 'bg-lavender/20 text-brand-indigo' :
                                          'bg-secondary text-warm-muted'
                      }`}>{m.delta}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 mt-auto border-t border-warm-border/40 bg-sage-light/30 flex items-center justify-between">
                <span className="text-[10.5px] font-semibold text-sage">All constraints satisfied</span>
                <CheckCircle2 className="h-4 w-4 text-sage" />
              </div>
            </div>

            {/* Right: Quarterly breakdown */}
            <div className="col-span-12 lg:col-span-4 bg-white border border-warm-border rounded-2xl overflow-hidden shadow-card flex flex-col">
              <div className="px-4 py-3 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/20 flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider">Quarterly EGR</span>
                <TrendingUp className="h-3.5 w-3.5 text-brand-indigo" />
              </div>

              {/* Mini bar chart */}
              <div className="px-4 py-3 flex items-end gap-2 h-24">
                {QUARTERLY.map((q, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all ${q.peak ? 'bg-sage' : 'bg-brand-indigo/40'}`}
                      style={{ height: `${q.achieved * 1.4}px` }}
                    />
                    <span className="text-[8px] font-mono text-warm-muted">{q.q.slice(0, 2)}{q.q.slice(3, 7)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col divide-y divide-warm-border/30 flex-1">
                {QUARTERLY.map((q, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-2 text-[11px] ${q.peak ? 'bg-sage-light/30' : ''}`}>
                    <span className={`font-mono font-semibold ${q.peak ? 'text-sage' : 'text-warm-muted'}`}>{q.q}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold font-mono ${q.peak ? 'text-sage' : 'text-warm-text'}`}>{q.egr}</span>
                      <span className="text-warm-muted text-[10px] font-mono">{q.rev}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-warm-border/40 flex items-center justify-between text-[10.5px]">
                <span className="text-warm-muted">Peak Q4 2025</span>
                <button onClick={() => navigate('/dashboard/workspace/scenarios')}
                  className="text-brand-indigo font-semibold hover:underline cursor-pointer flex items-center gap-1">
                  View scenarios <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Scenarios tab ───────────────────────────────────────── */}
      {subtab === 'scenarios' && (
        <div className="flex flex-col gap-5 animate-fade-in flex-1 justify-center items-center min-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-[680px] mx-auto">
            {scenarios.map((sc, si) => {
              const isA = sc.id === 'A';
              return (
                <div
                  key={sc.id}
                  onClick={() => toggleScenarioChecked(sc.id)}
                  className={`bg-white border rounded-2xl shadow-card overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-md ${
                    sc.checked
                      ? isA ? 'border-brand-indigo ring-2 ring-brand-indigo/20' : 'border-sage ring-2 ring-sage/20'
                      : 'border-warm-border'
                  }`}
                >
                  {/* Card header */}
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${
                    isA ? 'border-warm-border bg-gradient-to-r from-white to-lavender/10'
                        : 'border-sage-border/40 bg-gradient-to-r from-white to-sage-light/40'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${isA ? 'bg-brand-indigo' : 'bg-sage'}`} />
                      <span className="text-[13px] font-bold text-warm-text">{sc.label}</span>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      sc.checked
                        ? isA ? 'bg-brand-indigo border-brand-indigo' : 'bg-sage border-sage'
                        : 'border-warm-border bg-white'
                    }`}>
                      {sc.checked && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="px-4 py-3 flex flex-col gap-2.5">
                    {[
                      { label: 'Revenue',    value: sc.revenue, highlight: false },
                      { label: 'YoY Growth', value: sc.yoy,     highlight: false },
                      { label: 'EGR Est.',   value: sc.egr,     highlight: true  },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-[11.5px] text-warm-muted">{row.label}</span>
                        <span className={`text-[13px] font-bold font-mono ${
                          row.highlight ? (isA ? 'text-brand-indigo' : 'text-sage') : 'text-warm-text'
                        }`}>{row.value}</span>
                      </div>
                    ))}

                    {/* Sparkline */}
                    <Spark
                      color={isA ? '#6E69BE' : '#8EA885'}
                      path={isA
                        ? 'M 0 22 Q 15 19 30 15 T 60 9 T 90 4 T 100 0'
                        : 'M 0 22 Q 15 17 30 11 T 60 5 T 90 1 T 100 0'
                      }
                    />
                  </div>

                  {/* Delta badges */}
                  {!isA && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {[
                        { label: 'EGR', delta: '+1.4pp' },
                        { label: 'Revenue', delta: '+$400K' },
                        { label: 'Cost', delta: '−$20K' },
                      ].map(d => (
                        <span key={d.label} className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-full bg-sage-light text-sage border border-sage-border/40">
                          {d.label} {d.delta}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className={`px-4 py-2.5 border-t mt-auto text-[11px] font-sans flex items-center justify-between ${
                    sc.checked ? (isA ? 'bg-lavender/10 border-lavender/30' : 'bg-sage-light/40 border-sage-border/40') : 'bg-warm-bg/30 border-warm-border/40'
                  }`}>
                    <span className={sc.checked ? (isA ? 'text-brand-indigo font-semibold' : 'text-sage font-semibold') : 'text-warm-muted'}>
                      {sc.checked ? '✓ Selected for comparison' : 'Click to select'}
                    </span>
                    <span className="text-[9px] font-mono text-warm-muted">
                      {isA ? 'Q2 Baseline' : 'Newton-Raphson'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison hint */}
          <div className={`w-full max-w-[680px] mx-auto flex items-center justify-between px-5 py-3 rounded-2xl border font-sans transition-all ${
            scenarios.every(s => s.checked)
              ? 'bg-sage-light border-sage-border shadow-sm'
              : 'bg-white/70 border-warm-border'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${scenarios.every(s => s.checked) ? 'bg-sage animate-pulse' : 'bg-warm-muted/40'}`} />
              <span className="text-[11.5px] text-warm-text font-medium">
                {scenarios.filter(s => s.checked).length} of 2 scenarios selected
                {scenarios.every(s => s.checked) && ' — launching comparison…'}
              </span>
            </div>
            {scenarios.every(s => s.checked) ? (
              <button
                onClick={() => navigate('/dashboard/learning')}
                className="px-3 py-1 bg-sage hover:bg-sage/90 text-white rounded-lg text-[10.5px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                Proceed to Learning →
              </button>
            ) : (
              <span className="text-[10.5px] text-warm-muted font-mono">
                Select both to open trade-off view
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
