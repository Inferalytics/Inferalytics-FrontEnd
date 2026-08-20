import React from 'react';
import { ArrowLeft, Sparkles, Download, Check, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { useNavigate } from 'react-router-dom';

interface ComparePanelProps {
  triggerToast: (msg: string) => void;
}

type ComparisonRow = {
  metric: string;
  a: string;
  b: string;
  delta: string;
  winner: 'a' | 'b' | 'tie';
  trend: 'up' | 'down' | 'flat';
};

function DeltaBadge({ trend, delta }: { trend: string; delta: string }) {
  if (trend === 'up')   return <span className="flex items-center gap-0.5 text-sage font-bold"><TrendingUp className="h-3 w-3" />{delta}</span>;
  if (trend === 'down') return <span className="flex items-center gap-0.5 text-brand-indigo font-bold"><TrendingDown className="h-3 w-3" />{delta}</span>;
  return <span className="flex items-center gap-0.5 text-warm-muted"><Minus className="h-3 w-3" />{delta}</span>;
}

function sparklinePath(data: number[]): string {
  if (data.length === 0) return '';
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = 100 / (data.length - 1 || 1);
  return data
    .map((v, i) => {
      const x = i * stepX;
      const y = 24 - ((v - min) / range) * 24;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

const parseNum = (v: string): number => {
  const clean = v.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(clean) || 0;
  if (v.toLowerCase().includes('m')) return num * 1_000_000;
  if (v.toLowerCase().includes('k')) return num * 1_000;
  return num;
};

const isCurrency = (v: string): boolean => {
  const clean = v.trim().toLowerCase();
  return clean.startsWith('$') || clean.endsWith('m') || clean.endsWith('k');
};

function buildRow(metric: string, aVal: string, bVal: string): ComparisonRow {
  const aNum = parseNum(aVal);
  const bNum = parseNum(bVal);
  const deltaNum = bNum - aNum;
  const isTie = aNum === bNum;
  const winner: 'a' | 'b' | 'tie' = isTie ? 'tie' : (bNum > aNum ? 'b' : 'a');
  const trend: 'up' | 'down' | 'flat' = isTie ? 'flat' : (bNum > aNum ? 'up' : 'down');
  const delta = isTie
    ? '—'
    : isCurrency(aVal) || isCurrency(bVal)
      ? `${deltaNum >= 0 ? '+' : '-'}${Math.abs(deltaNum / 1000).toFixed(0)}K`
      : `${deltaNum >= 0 ? '+' : ''}${deltaNum.toFixed(1)}pp`;
  return { metric, a: aVal, b: bVal, delta, winner, trend };
}

export default function ComparePanel({ triggerToast }: ComparePanelProps) {
  const { egrTarget, model, selectedProvenanceMetric, setSelectedProvenanceMetric, scenarios } = useStore();
  const navigate = useNavigate();

  const checked = scenarios.filter(s => s.checked);
  const scenarioA = checked[0];
  const scenarioB = checked[1];
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!scenarioA || !scenarioB) {
    return (
      <div className="flex flex-col gap-5 animate-float-up w-full max-w-[960px] mx-auto pt-4 items-center justify-center min-h-[60vh] text-center">
        <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-warm-muted" />
        </div>
        <span className="text-[13px] font-semibold text-warm-text">Select two scenarios to compare</span>
        <span className="text-[12px] text-warm-muted">Check two scenarios on the Results screen first.</span>
        <button onClick={() => navigate('/dashboard/workspace/scenarios')}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-indigo text-white rounded-xl text-[12px] font-bold cursor-pointer hover:opacity-90 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Scenarios
        </button>
      </div>
    );
  }

  const ROWS: ComparisonRow[] = [
    buildRow('Revenue', scenarioA.revenue, scenarioB.revenue),
    buildRow('YoY Growth', scenarioA.yoy, scenarioB.yoy),
    buildRow('EGR', scenarioA.egr, scenarioB.egr),
  ];

  const bWins = ROWS.filter(r => r.winner === 'b').length;
  const aWins = ROWS.filter(r => r.winner === 'a').length;
  const winnerLabel = bWins === aWins ? 'Tied' : (bWins > aWins ? scenarioB.label : scenarioA.label);

  const exportCSV = () => {
    const header = ['Metric', scenarioA.label, scenarioB.label, 'Delta', 'Winner'];
    const csvRows = ROWS.map(r =>
      [r.metric, r.a, r.b, r.delta, (r.winner === 'a' ? scenarioA.label : scenarioB.label)].map(v => `"${v}"`).join(',')
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
        <button onClick={() => navigate('/dashboard/workspace/scenarios')}
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
            <span className="text-[12px] font-bold text-warm-text truncate max-w-[140px]" title={scenarioA.label}>{scenarioA.label}</span>
          </div>
          <span className="text-[36px] font-extrabold text-brand-indigo leading-none">{aWins}</span>
          <span className="text-[10px] text-warm-muted">metrics won</span>
        </div>

        {/* Verdict */}
        <div className="bg-sage-light border border-sage-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-card">
          <Trophy className="h-6 w-6 text-sage" />
          <span className="text-[13px] font-extrabold text-sage truncate max-w-full" title={winnerLabel}>{winnerLabel} Wins</span>
          <span className="text-[10px] text-warm-muted text-center leading-relaxed">
            {Math.max(bWins, aWins)} of {ROWS.length} metrics
          </span>
        </div>

        {/* Scenario B score */}
        <div className={`bg-white border rounded-2xl p-4 flex flex-col items-center gap-2 shadow-card ${
          bWins > aWins ? 'border-sage ring-2 ring-sage/20' : 'border-warm-border'
        }`}>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-sage" />
            <span className="text-[12px] font-bold text-warm-text truncate max-w-[140px]" title={scenarioB.label}>{scenarioB.label}</span>
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
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr] bg-warm-bg/60 border-b border-warm-border text-[10px] font-bold text-warm-muted uppercase tracking-wide font-sans">
          <div className="px-4 py-2.5 flex justify-between items-center w-full">
            <span>Metric</span>
            <span className="text-[8px] text-brand-indigo font-normal normal-case tracking-normal">click row for provenance</span>
          </div>
          <div className="px-3 py-2.5 flex items-center gap-1.5 truncate">
            <div className="h-2 w-2 rounded-full bg-brand-indigo shrink-0" /> {scenarioA.label}
          </div>
          <div className="px-3 py-2.5 flex items-center gap-1.5 truncate">
            <div className="h-2 w-2 rounded-full bg-sage shrink-0" /> {scenarioB.label}
          </div>
          <div className="px-3 py-2.5">Δ Delta</div>
        </div>

        {ROWS.map((row) => {
          const isSelected = selectedProvenanceMetric?.toLowerCase() === row.metric.toLowerCase();
          return (
            <div key={row.metric}
              onClick={() => setSelectedProvenanceMetric(row.metric)}
              className={`grid grid-cols-[1.6fr_1fr_1fr_0.8fr] border-b border-warm-border/30 hover:bg-lavender/5 hover:text-brand-indigo transition-colors items-center cursor-pointer ${
                isSelected ? 'bg-lavender/10 font-medium border-l-2 border-brand-indigo' : ''
              }`}>
              <div className="px-4 py-3 flex items-center gap-2">
                {row.winner === 'tie'
                  ? <Minus className="h-3.5 w-3.5 text-warm-muted shrink-0" />
                  : row.winner === 'b'
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
            </div>
          );
        })}

        {/* Real sparkline trajectory row — from each scenario's actual sparkData */}
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.8fr] items-center bg-warm-bg/5">
          <div className="px-4 py-3 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-brand-indigo shrink-0" />
            <span className="text-[12px] font-semibold text-warm-text">Trajectory</span>
          </div>
          <div className="px-3 py-2">
            <div className="h-10 bg-secondary/30 rounded-lg border border-warm-border/40 p-1">
              <svg className="w-full h-full" viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d={sparklinePath(scenarioA.sparkData)} fill="none" stroke="#6E69BE" strokeWidth="2.2" />
              </svg>
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="h-10 bg-sage-light/20 rounded-lg border border-sage-border/40 p-1">
              <svg className="w-full h-full" viewBox="0 0 100 28" preserveAspectRatio="none">
                <path d={sparklinePath(scenarioB.sparkData)} fill="none" stroke="#8EA885" strokeWidth="2.2" />
              </svg>
            </div>
          </div>
          <div className="px-3 py-3 text-[10.5px] text-warm-muted">from stored run history</div>
        </div>
       </div>
      </div>
     </div>

      {/* ── Footer actions ────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border border-warm-border rounded-2xl px-5 py-3.5 shadow-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sage" />
          <span className="text-[12px] font-semibold text-sage truncate max-w-[420px]">
            {winnerLabel} outperforms on {Math.max(bWins, aWins)}/{ROWS.length} metrics.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-xl text-[12px] font-semibold text-warm-text transition-colors cursor-pointer flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-warm-muted" /> Export CSV
          </button>
          <button
            onClick={() => triggerToast(`${bWins >= aWins ? scenarioB.label : scenarioA.label} locked in.`)}
            className="px-4 py-1.5 bg-sage hover:bg-sage/90 text-white rounded-xl text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer">
            <Check className="h-3.5 w-3.5" /> Lock {bWins >= aWins ? scenarioB.label : scenarioA.label}
          </button>
        </div>
      </div>
    </div>
  );
}
