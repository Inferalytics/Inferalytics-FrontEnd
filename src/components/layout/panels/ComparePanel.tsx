import React from 'react';
import { ArrowLeft, Sparkles, Download, Check, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { useNavigate } from 'react-router-dom';

interface ComparePanelProps {
  triggerToast: (msg: string) => void;
}

const ROWS = [
  {
    metric:   'Forecasted EGR',
    category: 'Performance',
    a: '11.8%',  b: '13.2%',  delta: '+1.4pp',
    winner: 'b', trend: 'up',
    note: 'Scenario B exceeds target by 1.2pp',
  },
  {
    metric:   'Revenue Outcome',
    category: 'Revenue',
    a: '$2.00M', b: '$2.40M', delta: '+$400K',
    winner: 'b', trend: 'up',
    note: '+18% YoY driven by Q4 Enterprise uplift',
  },
  {
    metric:   'Cost Allocation',
    category: 'Cost',
    a: '$1.00M', b: '$980K',  delta: '−$20K',
    winner: 'b', trend: 'down',
    note: 'Reduction in Cost Centre allocation',
  },
  {
    metric:   'YoY Growth',
    category: 'Revenue',
    a: '+8%',    b: '+18%',   delta: '+10pp',
    winner: 'b', trend: 'up',
    note: 'Strong acceleration in optimised scenario',
  },
  {
    metric:   'Churn Rate',
    category: 'Risk',
    a: '5.8%',   b: '4.2%',   delta: '−1.6pp',
    winner: 'b', trend: 'down',
    note: 'Well within 6% constraint',
  },
  {
    metric:   'Gross Margin',
    category: 'Efficiency',
    a: '65.1%',  b: '63.2%',  delta: '−1.9pp',
    winner: 'a', trend: 'flat',
    note: 'Slight compression due to cost mix',
  },
  {
    metric:   'EGR Gap vs Target',
    category: 'Performance',
    a: '−0.2pp', b: '+1.2pp', delta: '—',
    winner: 'b', trend: 'up',
    note: 'B meets and exceeds {egrTarget}% target',
  },
];

const QUARTERLY = [
  { q: 'Q1', a: 22, b: 24 },
  { q: 'Q2', b: 31, a: 28 },
  { q: 'Q3', b: 39, a: 33 },
  { q: 'Q4', b: 52, a: 40 },
];

const CATEGORIES = ['Performance', 'Revenue', 'Cost', 'Risk', 'Efficiency'];

function DeltaBadge({ trend, delta }: { trend: string; delta: string }) {
  if (trend === 'up')   return <span className="flex items-center gap-0.5 text-sage font-bold"><TrendingUp className="h-3 w-3" />{delta}</span>;
  if (trend === 'down') return <span className="flex items-center gap-0.5 text-brand-indigo font-bold"><TrendingDown className="h-3 w-3" />{delta}</span>;
  return <span className="flex items-center gap-0.5 text-warm-muted"><Minus className="h-3 w-3" />{delta}</span>;
}

export default function ComparePanel({ triggerToast }: ComparePanelProps) {
  const { egrTarget, model } = useStore();
  const navigate = useNavigate();

  const bWins = ROWS.filter(r => r.winner === 'b').length;
  const aWins = ROWS.filter(r => r.winner === 'a').length;
  const now   = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const exportCSV = () => {
    const header = ['Metric', 'Category', 'Scenario A', 'Scenario B', 'Delta', 'Winner', 'Note'];
    const csvRows = ROWS.map(r =>
      [r.metric, r.category, r.a, r.b, r.delta, r.winner.toUpperCase(), r.note].map(v => `"${v}"`).join(',')
    );
    const csv  = [header.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'inferalytics_comparison.csv'; a.click();
    URL.revokeObjectURL(url);
    triggerToast('Comparison exported as CSV.');
  };

  return (
    <div className="flex flex-col gap-5 animate-float-up w-full max-w-[960px] mx-auto pt-4">

      {/* ── Back + header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/dashboard/results/scenarios')}
          className="flex items-center gap-1.5 bg-white/70 hover:bg-white border border-warm-border px-3 py-1.5 rounded-full shadow-sm text-[11.5px] font-bold text-brand-indigo transition-all cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Scenarios
        </button>
        <div className="flex items-center gap-2 text-[10.5px] font-mono text-warm-muted">
          <span className="bg-white border border-warm-border px-2.5 py-1 rounded-full shadow-sm">
            {model} · {egrTarget}% target · {now}
          </span>
        </div>
      </div>

      {/* ── Score banner ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scenario A score */}
        <div className={`bg-white border rounded-2xl p-4 flex flex-col items-center gap-2 shadow-card ${
          aWins > bWins ? 'border-brand-indigo ring-2 ring-brand-indigo/15' : 'border-warm-border'
        }`}>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-brand-indigo" />
            <span className="text-[12px] font-bold text-warm-text">Scenario A</span>
            <span className="text-[9.5px] text-warm-muted font-mono">Baseline</span>
          </div>
          <span className="text-[36px] font-extrabold text-brand-indigo leading-none">{aWins}</span>
          <span className="text-[10px] text-warm-muted">metrics won</span>
        </div>

        {/* Verdict */}
        <div className="bg-sage-light border border-sage-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-card">
          <Trophy className="h-6 w-6 text-sage" />
          <span className="text-[13px] font-extrabold text-sage">Scenario B Wins</span>
          <span className="text-[10px] text-warm-muted text-center leading-relaxed">
            {bWins} of {ROWS.length} metrics · EGR +1.4pp
          </span>
        </div>

        {/* Scenario B score */}
        <div className={`bg-white border rounded-2xl p-4 flex flex-col items-center gap-2 shadow-card ${
          bWins > aWins ? 'border-sage ring-2 ring-sage/20' : 'border-warm-border'
        }`}>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-sage" />
            <span className="text-[12px] font-bold text-warm-text">Scenario B</span>
            <span className="text-[9.5px] text-warm-muted font-mono">Optimised</span>
          </div>
          <span className="text-[36px] font-extrabold text-sage leading-none">{bWins}</span>
          <span className="text-[10px] text-warm-muted">metrics won</span>
        </div>
      </div>

      {/* ── Main comparison table ─────────────────────────────── */}
      <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden">
        <div className="w-full overflow-x-auto no-scrollbar">
          <div className="min-w-[768px]">
            {/* Column headers */}
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_1.4fr] bg-warm-bg/60 border-b border-warm-border text-[10px] font-bold text-warm-muted uppercase tracking-wide font-sans">
          <div className="px-4 py-2.5">Metric</div>
          <div className="px-3 py-2.5 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-brand-indigo shrink-0" /> Scenario A
          </div>
          <div className="px-3 py-2.5 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-sage shrink-0" /> Scenario B
          </div>
          <div className="px-3 py-2.5">Δ Delta</div>
          <div className="px-3 py-2.5">Insight</div>
        </div>

        {/* Category groups */}
        {CATEGORIES.map(cat => {
          const catRows = ROWS.filter(r => r.category === cat);
          if (!catRows.length) return null;
          return (
            <div key={cat}>
              <div className="px-4 py-1.5 bg-warm-bg/30 border-b border-warm-border/40">
                <span className="text-[9px] font-bold text-warm-muted uppercase tracking-widest">{cat}</span>
              </div>
              {catRows.map((row) => (
                <div key={row.metric}
                  className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_1.4fr] border-b border-warm-border/30 hover:bg-warm-bg/10 transition-colors items-center">
                  <div className="px-4 py-3 flex items-center gap-2">
                    {row.winner === 'b'
                      ? <Check className="h-3.5 w-3.5 text-sage shrink-0" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-amber-warm shrink-0" />
                    }
                    <span className="text-[12px] font-semibold text-warm-text">{row.metric}</span>
                  </div>
                  <div className={`px-3 py-3 font-mono text-[12px] ${row.winner === 'a' ? 'font-bold text-brand-indigo' : 'text-warm-muted'}`}>
                    {row.a}
                  </div>
                  <div className={`px-3 py-3 font-mono text-[12px] ${row.winner === 'b' ? 'font-bold text-sage bg-sage-light/20' : 'text-warm-muted'}`}>
                    {row.b}
                  </div>
                  <div className="px-3 py-3 text-[11px]">
                    <DeltaBadge trend={row.trend} delta={row.delta} />
                  </div>
                  <div className="px-3 py-3 text-[10.5px] text-warm-muted leading-snug">
                    {row.note.replace('{egrTarget}', String(egrTarget))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Sparkline trajectory row */}
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_1.4fr] border-b border-warm-border/30 items-center bg-warm-bg/5">
          <div className="px-4 py-3 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-brand-indigo shrink-0" />
            <span className="text-[12px] font-semibold text-warm-text">EGR Trajectory</span>
          </div>
          <div className="px-3 py-2">
            <div className="h-10 bg-secondary/30 rounded-lg border border-warm-border/40 p-1">
              <svg className="w-full h-full" viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d="M 0 24 Q 20 20 40 16 T 70 9 T 100 2" fill="none" stroke="#6E69BE" strokeWidth="2.2" />
              </svg>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="h-10 bg-sage-light/20 rounded-lg border border-sage-border/40 p-1">
              <svg className="w-full h-full" viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d="M 0 24 Q 20 18 40 12 T 70 5 T 100 0" fill="none" stroke="#8EA885" strokeWidth="2.2" />
              </svg>
            </div>
          </div>
          <div className="px-3 py-3 text-[11px] font-semibold text-sage">B steeper</div>
          <div className="px-3 py-3 text-[10.5px] text-warm-muted">Scenario B reaches peak EGR faster</div>
        </div>

        {/* Bar chart row */}
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr_1.4fr] items-center">
          <div className="px-4 py-3 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-warm-text">Quarterly EGR</span>
          </div>
          <div className="col-span-2 px-3 py-3">
            <div className="flex items-end gap-1.5 h-12">
              {QUARTERLY.map((q) => (
                <div key={q.q} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-0.5">
                    <div className="flex-1 bg-brand-indigo/40 rounded-sm" style={{ height: `${q.a * 0.8}px` }} />
                    <div className="flex-1 bg-sage rounded-sm" style={{ height: `${q.b * 0.8}px` }} />
                  </div>
                  <span className="text-[8px] font-mono text-warm-muted">{q.q}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-3 py-3 col-span-2">
            <div className="flex items-center gap-3 text-[10px] text-warm-muted">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-indigo/40 inline-block" /> Scenario A</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sage inline-block" /> Scenario B</span>
            </div>
          </div>
        </div>
       </div>
      </div>
     </div>

      {/* ── Footer actions ────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border border-warm-border rounded-2xl px-5 py-3.5 shadow-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sage" />
          <span className="text-[12px] font-semibold text-sage">
            Scenario B outperforms on {bWins}/{ROWS.length} metrics. Recommended.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-xl text-[12px] font-semibold text-warm-text transition-colors cursor-pointer flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-warm-muted" /> Export CSV
          </button>
          <button
            onClick={() => triggerToast('Scenario B locked. Recommendations dispatched to region leads!')}
            className="px-4 py-1.5 bg-sage hover:bg-sage/90 text-white rounded-xl text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer">
            <Check className="h-3.5 w-3.5" /> Lock Scenario B
          </button>
        </div>
      </div>
    </div>
  );
}
