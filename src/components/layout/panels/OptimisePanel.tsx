import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, Play, Pin, ChevronDown, TrendingUp, Lock, Link2, RefreshCw } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { directBezier } from './bezierUtils';
import { ModelType } from '../../../types';

interface OptimisePanelProps {
  triggerToast: (msg: string) => void;
}

const CARD_W = 196;
const CARD_H = 130;

const INITIAL_POSITIONS: Record<string, { x: number; y: number }> = {
  qtr:    { x: 40,  y: 80  },
  rev:    { x: 280, y: 80  },
  reg:    { x: 520, y: 60  },
  prod:   { x: 40,  y: 270 },
  cost:   { x: 280, y: 270 },
  margin: { x: 520, y: 270 },
  egr:    { x: 280, y: 460 },
};

interface Connection {
  id: string;
  from: string;
  to: string;
  color: string;
  weight: number;
  dashed: boolean;
  isDefault: boolean;
}

const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'qtr-rev',    from: 'qtr',  to: 'rev',    color: '#6E69BE', weight: 2.0, dashed: false, isDefault: true },
  { id: 'rev-reg',    from: 'rev',  to: 'reg',    color: '#6E69BE', weight: 2.0, dashed: false, isDefault: true },
  { id: 'rev-cost',   from: 'rev',  to: 'cost',   color: '#6E69BE', weight: 2.0, dashed: false, isDefault: true },
  { id: 'prod-cost',  from: 'prod', to: 'cost',   color: '#C2BDB7', weight: 1.4, dashed: true,  isDefault: true },
  { id: 'cost-mar',   from: 'cost', to: 'margin', color: '#6E69BE', weight: 2.0, dashed: false, isDefault: true },
  { id: 'cost-egr',   from: 'cost', to: 'egr',    color: '#6E69BE', weight: 2.0, dashed: false, isDefault: true },
];

function computePath(fp: { x: number; y: number }, tp: { x: number; y: number }): string {
  const sameCol = Math.abs((fp.x + CARD_W / 2) - (tp.x + CARD_W / 2)) < 40;
  if (sameCol) {
    const x1 = fp.x + CARD_W / 2, y1 = fp.y + CARD_H;
    const x2 = tp.x + CARD_W / 2, y2 = tp.y;
    const my = (y1 + y2) / 2;
    return `M ${x1},${y1} C ${x1},${my} ${x2},${my} ${x2},${y2}`;
  }
  return directBezier(fp.x + CARD_W, fp.y + CARD_H / 2, tp.x, tp.y + CARD_H / 2);
}

const SOLVER_OPTIONS: { value: ModelType; label: string; desc: string }[] = [
  { value: 'Newton-Raphson', label: 'Newton-Raphson', desc: 'Gradient-based optimizer' },
  { value: 'Holt-Winters',   label: 'Holt-Winters',   desc: 'Exponential smoothing'   },
  { value: 'Monte Carlo',    label: 'Monte Carlo',     desc: 'Stochastic simulation'   },
  { value: 'auto',           label: 'Auto-select',     desc: 'Let AI choose'           },
];

const FORECAST_ROWS = [
  { quarter: 'Q1 2025', baseline: '8.4%',  optimised: '9.1%',  delta: '+0.7pp' },
  { quarter: 'Q2 2025', baseline: '9.2%',  optimised: '10.4%', delta: '+1.2pp' },
  { quarter: 'Q3 2025', baseline: '10.1%', optimised: '11.8%', delta: '+1.7pp' },
  { quarter: 'Q4 2025', baseline: '11.0%', optimised: '13.2%', delta: '+2.2pp' },
];

const DIMENSIONS = [
  { id: 'qtr',    name: 'Quarter',      type: 'date'        as const, samples: ['Q1 2025', 'Q2 2025', 'Q3 2025']   },
  { id: 'rev',    name: 'Revenue',      type: 'numeric'     as const, samples: ['$1.24M', '$980K', '$2.10M']       },
  { id: 'reg',    name: 'Region',       type: 'categorical' as const, samples: ['EMEA', 'APAC', 'NA-East']         },
  { id: 'prod',   name: 'Product Line', type: 'categorical' as const, samples: ['Enterprise', 'SMB', 'Self-serve'] },
  { id: 'cost',   name: 'Cost Centre',  type: 'numeric'     as const, samples: ['$420K', '$311K', '$508K']         },
  { id: 'margin', name: 'Gross Margin', type: 'numeric'     as const, samples: ['72%', '68%', '75%']               },
  { id: 'egr',    name: 'EGR Estimate', type: 'numeric'     as const, samples: ['target: 12%', 'baseline: 8.4%']  },
];

export default function OptimisePanel({ triggerToast }: OptimisePanelProps) {
  const { egrTarget, setEgrTarget, runOptimisation, model, setModel } = useStore();

  const [isOptimizing,    setIsOptimizing]    = useState(false);
  const [positions,       setPositions]       = useState(INITIAL_POSITIONS);
  const [connections,     setConnections]     = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [pinnedIds,       setPinnedIds]       = useState<Set<string>>(new Set(['reg', 'margin']));
  const [selectedId,      setSelectedId]      = useState('rev');
  const [drag,            setDrag]            = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [solverOpen,      setSolverOpen]      = useState(false);
  const [churnLimit,      setChurnLimit]      = useState(6);
  const [forecastOpen,    setForecastOpen]    = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [linkSource,      setLinkSource]      = useState<string | null>(null);
  const [mousePos,        setMousePos]        = useState({ x: 0, y: 0 });
  const [hoveredConn,     setHoveredConn]     = useState<string | null>(null);
  const [edgeHoverId,     setEdgeHoverId]     = useState<string | null>(null);

  const canvasRef     = useRef<HTMLDivElement>(null);
  // ref so handleCardClick always reads latest values without stale closure
  const linkSourceRef = useRef<string | null>(null);
  const connectionsRef = useRef<Connection[]>(INITIAL_CONNECTIONS);

  useEffect(() => { linkSourceRef.current = linkSource; }, [linkSource]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);

  // ── Escape cancels link in progress ──────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setLinkSource(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // ── Edge-zone detection ───────────────────────────────────────────────────
  const EDGE_SIZE = 14;

  const isEdgeClick = (e: React.MouseEvent): boolean => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const ry = e.clientY - rect.top;
    return rx < EDGE_SIZE || rx > rect.width - EDGE_SIZE || ry < EDGE_SIZE || ry > rect.height - EDGE_SIZE;
  };

  const handleCardMouseMove = (e: React.MouseEvent, id: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const ry = e.clientY - rect.top;
    const onEdge = rx < EDGE_SIZE || rx > rect.width - EDGE_SIZE || ry < EDGE_SIZE || ry > rect.height - EDGE_SIZE;
    setEdgeHoverId(onEdge ? id : null);
  };

  // ── Card mousedown: edge → link, body → drag ──────────────────────────────
  const handleCardMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (isEdgeClick(e)) {
      handleCardLink(id);
      return;
    }
    // Body drag
    const startPos = { ...positions[id] };
    const ox = e.clientX - startPos.x;
    const oy = e.clientY - startPos.y;

    setDrag({ id, ox, oy });
    const onMove = (ev: MouseEvent) => setPositions(prev => ({
      ...prev,
      [id]: { x: Math.max(0, ev.clientX - ox), y: Math.max(0, ev.clientY - oy) },
    }));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); setDrag(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Mouse position tracking (for rubber-band line) ────────────────────────
  const updateMouse = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // ── Link: edge click handler ──────────────────────────────────────────────
  const handleCardLink = (id: string) => {
    const src = linkSourceRef.current;
    if (!src) { setLinkSource(id); return; }
    if (src === id) { setLinkSource(null); return; }

    const exists = connectionsRef.current.some(
      c => (c.from === src && c.to === id) || (c.from === id && c.to === src)
    );
    if (!exists) {
      setConnections(prev => [...prev, {
        id: `${src}-${id}-${Date.now()}`, from: src, to: id,
        color: '#FF5A1F', weight: 2.0, dashed: true, isDefault: false,
      }]);
    }
    // keep source for multi-link fan-out — click source again or "Change" to reset
  };

  // ── Delink: remove any connection by id ───────────────────────────────────
  const removeConnection = (id: string) => setConnections(prev => prev.filter(c => c.id !== id));

  // ── Reset connections ──────────────────────────────────────────────────────
  const resetConnections = () => setConnections(INITIAL_CONNECTIONS);

  // ── Forecast ──────────────────────────────────────────────────────────────
  const handleRunForecast = () => {
    setForecastLoading(true); setForecastOpen(false);
    setTimeout(() => { setForecastLoading(false); setForecastOpen(true); }, 1000);
  };

  const canvasHeight = Math.max(640, ...Object.values(positions).map(p => p.y + CARD_H + 60));
  const currentSolver = SOLVER_OPTIONS.find(s => s.value === model) ?? SOLVER_OPTIONS[0];
  const customCount = connections.filter(c => !c.isDefault).length;

  return (
    <div className="flex flex-col gap-4 animate-float-up w-full max-w-[920px] mx-auto pt-4">

      {/* ── Controls bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-white border border-warm-border rounded-2xl shadow-float px-3 py-2 z-40 select-none relative overflow-visible">

        {/* Group 1 — targets */}
        <div className="flex items-center gap-1.5 bg-warm-bg/50 border border-warm-border/60 rounded-xl px-2.5 py-1.5">
          <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wide shrink-0">EGR</span>
          <input type="number" value={egrTarget} onChange={e => setEgrTarget(Number(e.target.value))}
            className="w-8 text-center bg-transparent border-none outline-none font-bold text-brand-indigo text-[12px] font-sans focus:ring-0" />
          <span className="font-bold text-brand-indigo text-[12px]">%</span>
          <span className="h-3.5 w-px bg-warm-border mx-1" />
          <Lock className="h-3 w-3 text-warm-muted shrink-0" />
          <span className="text-[10px] font-semibold text-warm-muted shrink-0">Churn ≤</span>
          <input type="number" value={churnLimit} onChange={e => setChurnLimit(Number(e.target.value))}
            className="w-7 text-center bg-transparent border-none outline-none font-bold text-warm-text text-[12px] font-sans focus:ring-0" />
          <span className="text-warm-muted text-[12px] font-bold">%</span>
        </div>

        <span className="h-5 w-px bg-warm-border/60 shrink-0" />

        {/* Group 2 — time + method */}
        <span className="text-[10.5px] font-mono font-semibold text-brand-indigo bg-lavender/20 border border-lavender/40 px-2 py-1 rounded-lg whitespace-nowrap shrink-0">
          Q1 → Q4 2025
        </span>

        <div className="relative shrink-0">
          <button onClick={() => setSolverOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary border border-warm-border/60 rounded-lg text-[11px] font-semibold text-warm-text hover:bg-muted transition-colors cursor-pointer whitespace-nowrap">
            {currentSolver.label}
            <ChevronDown className="h-3 w-3 text-warm-muted" />
          </button>
          {solverOpen && (
            <div className="absolute top-8 left-0 w-52 bg-white border border-warm-border rounded-xl shadow-xl p-1.5 z-[999] animate-float-up">
              {SOLVER_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setModel(opt.value); setSolverOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer flex items-center justify-between ${
                    model === opt.value ? 'bg-lavender/20 text-brand-indigo font-semibold' : 'hover:bg-warm-bg text-warm-text'
                  }`}>
                  <span>{opt.label}</span>
                  <span className="text-[9px] text-warm-muted">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="h-5 w-px bg-warm-border/60 shrink-0" />

        {/* Group 3 — link status */}
        {linkSource ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-peach/10 border border-peach/40 rounded-lg px-2.5 py-1">
              <Link2 className="h-3 w-3 text-peach" />
              <span className="text-[10.5px] font-semibold text-peach whitespace-nowrap">
                ↳ {DIMENSIONS.find(d => d.id === linkSource)?.name}
              </span>
            </div>
            <button onClick={() => setLinkSource(null)}
              className="px-2 py-1 border border-warm-border/60 bg-white hover:bg-secondary rounded-lg text-[10px] text-warm-muted cursor-pointer transition-colors shrink-0">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-warm-muted shrink-0">
            <Link2 className="h-3 w-3" />
            <span>Hover edge to link</span>
          </div>
        )}

        {customCount > 0 && (
          <button onClick={resetConnections}
            className="flex items-center gap-1 px-2 py-1 border border-warm-border/60 bg-white hover:bg-secondary rounded-lg text-[10px] text-warm-muted transition-colors cursor-pointer shrink-0">
            <RefreshCw className="h-2.5 w-2.5" /> Reset
          </button>
        )}

        {/* Group 4 — actions (pushed to right) */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button onClick={handleRunForecast} disabled={forecastLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-xl text-[11.5px] font-semibold text-warm-text cursor-pointer transition-colors disabled:opacity-50">
            {forecastLoading ? <RotateCw className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3 text-warm-muted" />}
            Forecast
          </button>
          <button
            onClick={() => { setIsOptimizing(true); runOptimisation(() => setIsOptimizing(false)); }}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-indigo hover:bg-brand-indigo/90 disabled:opacity-50 text-white rounded-xl text-[11.5px] font-bold shadow-sm transition-colors cursor-pointer">
            {isOptimizing ? <RotateCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
            Optimise
          </button>
        </div>
      </div>

      {/* ── Forecast preview ─────────────────────────────────────── */}
      {forecastOpen && (
        <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden animate-float-up">
          <div className="px-4 py-2.5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-brand-indigo" />
              <span className="text-[12px] font-bold text-warm-text">EGR Forecast — {currentSolver.label}</span>
              <span className="text-[9.5px] font-mono text-warm-muted bg-secondary px-2 py-0.5 rounded-full">target: {egrTarget}% · churn ≤ {churnLimit}%</span>
            </div>
            <button onClick={() => setForecastOpen(false)} className="text-warm-muted hover:text-warm-text cursor-pointer text-[12px]">✕</button>
          </div>
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-warm-bg/60 border-b border-warm-border text-[10px] font-bold text-warm-muted uppercase tracking-wide font-sans">
                <th className="p-2.5 pl-4">Quarter</th>
                <th className="p-2.5">Baseline EGR</th>
                <th className="p-2.5">Optimised EGR</th>
                <th className="p-2.5 pr-4">Δ Uplift</th>
              </tr>
            </thead>
            <tbody>
              {FORECAST_ROWS.map((row, i) => (
                <tr key={i} className="border-b border-warm-border/30 hover:bg-warm-bg/15 transition-colors">
                  <td className="p-2.5 pl-4 font-mono font-semibold text-warm-text">{row.quarter}</td>
                  <td className="p-2.5 font-mono text-warm-muted">{row.baseline}</td>
                  <td className="p-2.5 font-mono font-bold text-brand-indigo">{row.optimised}</td>
                  <td className="p-2.5 pr-4 font-mono font-bold text-sage">{row.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-sage-light/40 border-t border-sage-border/40 text-[10.5px] font-sans flex items-center justify-between">
            <span className="text-warm-muted">Peak EGR: <strong className="text-sage">13.2%</strong> in Q4 — exceeds target by +1.2pp</span>
            <span className="text-brand-indigo font-semibold hover:underline cursor-pointer"
              onClick={() => { setIsOptimizing(true); runOptimisation(() => setIsOptimizing(false)); }}>
              Lock & run full optimisation →
            </span>
          </div>
        </div>
      )}

      {/* ── Canvas ───────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        onMouseMove={updateMouse}
        className="relative w-full"
        style={{ height: canvasHeight }}
      >
        {/* SVG — connections layer. Pointer events enabled per-element. */}
        <svg
          className="absolute inset-0 w-full h-full z-10"
          overflow="visible"
          onMouseMove={updateMouse}
        >
          {/* All connections */}
          {connections.map((conn) => {
            const fp = positions[conn.from], tp = positions[conn.to];
            if (!fp || !tp) return null;
            const isHighlighted = conn.from === selectedId || conn.to === selectedId;
            const isHovered     = hoveredConn === conn.id;

            return (
              <g
                key={conn.id}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={() => removeConnection(conn.id)}
                onMouseEnter={() => setHoveredConn(conn.id)}
                onMouseLeave={() => setHoveredConn(null)}
              >
                {/* Wide invisible hit area */}
                <path d={computePath(fp, tp)} stroke="transparent" strokeWidth="16" fill="none" />
                {/* Visible line */}
                <path
                  d={computePath(fp, tp)}
                  stroke={isHovered ? '#EF4444' : conn.color}
                  strokeWidth={isHighlighted ? conn.weight + 0.7 : conn.weight}
                  strokeOpacity={isHighlighted || isHovered ? 1 : 0.6}
                  fill="none"
                  strokeDasharray={conn.dashed ? '5 4' : undefined}
                  className={!conn.dashed && isHighlighted ? 'animate-marching-ants' : undefined}
                  style={{ transition: 'stroke 0.15s, stroke-opacity 0.15s' }}
                />
                {/* Origin dot */}
                <circle cx={fp.x + CARD_W} cy={fp.y + CARD_H / 2} r={isHovered ? 5 : isHighlighted ? 4 : 3}
                  fill={isHovered ? '#EF4444' : conn.color}
                  fillOpacity={isHighlighted || isHovered ? 1 : 0.6}
                  style={{ transition: 'fill 0.15s, r 0.15s' }} />
                {/* Target dot */}
                <circle cx={tp.x} cy={tp.y + CARD_H / 2} r={isHovered ? 5 : isHighlighted ? 4 : 3}
                  fill="white" stroke={isHovered ? '#EF4444' : conn.color}
                  strokeWidth={1.8} strokeOpacity={isHighlighted || isHovered ? 1 : 0.6}
                  style={{ transition: 'stroke 0.15s' }} />
                {/* Hover tooltip: ✕ */}
                {isHovered && (
                  <text
                    x={(fp.x + CARD_W + tp.x) / 2}
                    y={(fp.y + CARD_H / 2 + tp.y + CARD_H / 2) / 2 - 8}
                    textAnchor="middle" fontSize="10" fontWeight="bold"
                    fill="#EF4444" style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    ✕ delink
                  </text>
                )}
              </g>
            );
          })}

          {/* Rubber-band preview line when linking */}
          {linkSource && positions[linkSource] && (
            <g style={{ pointerEvents: 'none' }}>
              <line
                x1={positions[linkSource].x + CARD_W / 2}
                y1={positions[linkSource].y + CARD_H / 2}
                x2={mousePos.x} y2={mousePos.y}
                stroke="#FF5A1F" strokeWidth="2" strokeDasharray="6 4"
                className="animate-marching-ants"
              />
              <circle cx={mousePos.x} cy={mousePos.y} r="5"
                fill="#FFF2EE" stroke="#FF5A1F" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Dimension cards — above SVG */}
        {DIMENSIONS.map((d) => {
          const pos      = positions[d.id];
          const isPinned = pinnedIds.has(d.id);
          const isSel    = selectedId === d.id;
          const isSource = linkSource === d.id;

          const isEdgeHovered = edgeHoverId === d.id;

          return (
            <div
              key={d.id}
              onMouseDown={e => handleCardMouseDown(e, d.id)}
              onMouseMove={e => handleCardMouseMove(e, d.id)}
              onMouseLeave={() => setEdgeHoverId(null)}
              className={`absolute bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-150 select-none z-20 ${
                drag?.id === d.id   ? 'cursor-grabbing shadow-xl z-30' :
                isEdgeHovered       ? 'cursor-crosshair' : 'cursor-grab'
              } ${
                isSource  ? 'border-peach ring-2 ring-peach/30 shadow-md' :
                isPinned  ? 'border-amber-warm ring-2 ring-amber-warm-light' :
                isSel     ? 'border-brand-indigo ring-2 ring-brand-indigo/20 shadow-md' :
                isEdgeHovered ? 'border-peach/60 ring-2 ring-peach/20 shadow-md' :
                            'border-warm-border hover:shadow-md'
              }`}
              style={{ left: pos.x, top: pos.y, width: CARD_W }}
            >
              <div className="p-3 pb-2 flex flex-col gap-1 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-bold text-warm-text truncate max-w-[136px]">{d.name}</span>
                  <button
                    onMouseDown={e => { e.stopPropagation(); setPinnedIds(prev => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; }); }}
                    onClick={e => e.stopPropagation()}
                    className={`shrink-0 cursor-pointer transition-colors ${isPinned ? 'text-amber-warm' : 'text-warm-border hover:text-warm-muted'}`}
                  >
                    <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <span className={`w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                  d.type === 'numeric'     ? 'bg-lavender/30 text-brand-indigo' :
                  d.type === 'categorical' ? 'bg-amber-warm-light text-amber-warm' :
                                            'bg-sage-light text-sage'
                }`}>{d.type}</span>
              </div>

              <div className="px-3 pb-3 flex flex-col gap-0.5 border-b border-warm-border/30">
                {d.samples.map((s, si) => (
                  <span key={si} className="text-[11px] font-mono text-warm-muted leading-tight truncate">{s}</span>
                ))}
              </div>

              <div className={`px-3 py-1.5 flex items-center gap-1.5 ${
                isSource ? 'bg-peach/10' : isPinned ? 'bg-amber-warm-light/40' : 'bg-warm-bg/40'
              }`}>
                {isSource ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-peach animate-pulse shrink-0" /><span className="text-[10px] font-mono text-peach">Linking source…</span></>
                ) : isPinned ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-amber-warm shrink-0" /><span className="text-[10px] font-mono text-amber-warm">Pinned · Q3 values</span></>
                ) : (
                  <><span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse shrink-0" /><span className="text-[10px] font-mono text-warm-muted">Vectorised ✓</span></>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Hint bar ─────────────────────────────────────────────── */}
      <div className="self-center bg-white/70 px-4 py-1.5 border border-warm-border rounded-full shadow-sm text-[10px] font-mono text-warm-muted select-none">
        {linkSource
          ? 'Click another card edge to link · Esc or Cancel to abort'
          : 'Drag card body to move · hover card edge (crosshair) to link · hover line to delink'
        }
      </div>
    </div>
  );
}
