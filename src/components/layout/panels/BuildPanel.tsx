import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, RotateCw, Pin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { directBezier } from './bezierUtils';

const CARD_W = 210;

const DIMENSIONS = [
  { id: 'qtr',  name: 'Quarter',      type: 'date',        samples: ['Q1 2025', 'Q2 2025', 'Q3 2025'],   status: 'ok'   },
  { id: 'rev',  name: 'Revenue',       type: 'numeric',     samples: ['$1.24M', '$980K', '$2.10M'],       status: 'ok',  active: true },
  { id: 'reg',  name: 'Region',        type: 'categorical', samples: ['EMEA', 'APAC', 'NA-East'],         status: 'ok'   },
  { id: 'prod', name: 'Product Line',  type: 'categorical', samples: ['Enterprise', 'SMB', 'Self-serve'], status: 'busy' },
] as const;

const CARD_H     = 132;
const GAP        = 28;
const TOP_OFFSET = 12;

const INITIAL_POS = DIMENSIONS.map((_, i) => ({
  x: 0,
  y: TOP_OFFSET + i * (CARD_H + GAP),
}));

interface Line { x1: number; y1: number; x2: number; y2: number }

export default function BuildPanel() {
  const { relationships, toggleRelationshipConfirmed, growthRates } = useStore();
  const navigate = useNavigate();

  const [selectedId, setSelectedId]   = useState<string>('rev');
  const [positions,  setPositions]    = useState(INITIAL_POS);
  const [lines,      setLines]        = useState<Line[]>([]);
  const [drag, setDrag] = useState<{ idx: number; ox: number; oy: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const canvasRef   = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const rowRefs     = useRef<(HTMLTableRowElement | null)[]>([]);

  // ── Measure SVG lines from card right-edge → row centre ──────────────────
  const measureLines = useCallback(() => {
    if (!canvasRef.current || !rightColRef.current) return;
    const canvasRect   = canvasRef.current.getBoundingClientRect();
    const rightX       = (rightColRef.current.getBoundingClientRect().left - canvasRect.left) / zoom;

    const next: Line[] = DIMENSIONS.map((_, i) => {
      const pos  = positions[i];
      const x1   = pos.x + CARD_W;
      const y1   = pos.y + CARD_H / 2;

      const rowEl = rowRefs.current[i];
      let y2 = y1;
      if (rowEl) {
        const rr = rowEl.getBoundingClientRect();
        y2 = (rr.top - canvasRect.top + rr.height / 2) / zoom;
      }
      return { x1, y1, x2: rightX, y2 };
    });
    setLines(next);
  }, [positions, zoom]);

  useEffect(() => {
    const af = requestAnimationFrame(measureLines);
    const t  = setTimeout(measureLines, 300);
    window.addEventListener('resize', measureLines);
    return () => { cancelAnimationFrame(af); clearTimeout(t); window.removeEventListener('resize', measureLines); };
  }, [measureLines]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setDrag({ idx, ox: e.clientX / zoom - positions[idx].x, oy: e.clientY / zoom - positions[idx].y });
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      const maxX = (canvasRef.current?.offsetWidth ?? CARD_W) - CARD_W;
      setPositions(prev => {
        const next = [...prev];
        next[drag.idx] = {
          x: Math.min(Math.max(0, e.clientX / zoom - drag.ox), maxX),
          y: Math.max(0, e.clientY / zoom - drag.oy),
        };
        return next;
      });
    };
    const onUp = () => setDrag(null);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, zoom]);

  const canvasHeight = Math.max(
    560,
    ...positions.map(p => p.y + CARD_H + 24)
  );

  return (
    <div className="flex flex-col gap-4 animate-float-up w-full pt-6">
      <div className="w-full overflow-x-auto no-scrollbar pb-4 relative">
        <div className="flex gap-6 relative min-w-[860px]">

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-warm-border p-1.5 rounded-xl shadow-md select-none font-sans">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="h-6 w-6 rounded bg-secondary hover:bg-muted text-warm-text font-bold text-[13px] flex items-center justify-center cursor-pointer transition-colors"
              title="Zoom Out"
            >
              -
            </button>
            <span className="text-[10px] font-mono font-bold text-warm-muted px-1 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
              className="h-6 w-6 rounded bg-secondary hover:bg-muted text-warm-text font-bold text-[13px] flex items-center justify-center cursor-pointer transition-colors"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="ml-1 px-1.5 py-0.5 rounded bg-brand-indigo/10 hover:bg-brand-indigo/15 text-brand-indigo font-bold text-[9px] uppercase cursor-pointer transition-colors"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>

          {/* Draggable canvas */}
          <div
            ref={canvasRef}
            className="relative shrink-0 w-[260px] origin-top-left transition-transform duration-100"
            style={{ height: canvasHeight, transform: `scale(${zoom})` }}
          >
          {/* SVG connector lines */}
          <svg
            className="absolute inset-0 pointer-events-none z-10 overflow-visible"
            style={{ width: '100%', height: '100%' }}
            overflow="visible"
          >
            {lines.map((ln, i) => {
              const isActive = DIMENSIONS[i]?.id === selectedId;
              return (
                <g key={i}>
                  <path
                    d={directBezier(ln.x1, ln.y1, ln.x2, ln.y2)}
                    stroke={isActive ? '#FF5A1F' : '#C2BDB7'}
                    strokeWidth={isActive ? 2.2 : 1.4}
                    fill="none"
                    strokeDasharray={isActive ? '6 4' : '4 6'}
                    className={isActive ? 'animate-marching-ants' : undefined}
                    style={{ transition: 'stroke 0.25s' }}
                  />
                  <circle cx={ln.x1} cy={ln.y1} r={isActive ? 4 : 3}
                    fill={isActive ? '#FF5A1F' : '#C2BDB7'}
                    style={{ transition: 'fill 0.2s' }}
                  />
                  <circle cx={ln.x2} cy={ln.y2} r={isActive ? 4 : 2.5}
                    fill={isActive ? '#FFF2EE' : '#F5F3F0'}
                    stroke={isActive ? '#FF5A1F' : '#C2BDB7'}
                    strokeWidth={isActive ? 1.8 : 1.2}
                    style={{ transition: 'stroke 0.2s' }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Dimension cards */}
          {DIMENSIONS.map((d, i) => {
            const isSelected = d.id === selectedId;
            const pos = positions[i];
            return (
              <div
                key={d.id}
                onMouseDown={(e) => handleMouseDown(e, i)}
                onClick={() => setSelectedId(prev => prev === d.id ? '' : d.id)}
                className={`absolute bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-shadow duration-200 select-none ${
                  drag?.idx === i ? 'cursor-grabbing shadow-lg z-30' : 'cursor-grab z-20'
                } ${
                  isSelected
                    ? 'border-brand-indigo ring-2 ring-brand-indigo/20 shadow-md'
                    : 'border-warm-border hover:shadow-md hover:border-warm-text/20'
                }`}
                style={{ left: pos.x, top: pos.y, width: CARD_W }}
              >
                <div className="p-3 pb-2 flex flex-col gap-1 font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-bold text-warm-text">{d.name}</span>
                    {d.id === 'reg' && <Pin className="h-3.5 w-3.5 text-amber-warm shrink-0 fill-current" />}
                  </div>
                  <span className={`w-fit text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    d.type === 'numeric'     ? 'bg-lavender/30 text-brand-indigo' :
                    d.type === 'categorical' ? 'bg-amber-warm-light text-amber-warm' :
                                              'bg-sage-light text-sage'
                  }`}>{d.type}</span>
                </div>

                <div className="px-3 pb-3 flex flex-col gap-0.5 border-b border-warm-border/30">
                  {d.samples.map((s, si) => (
                    <span key={si} className="text-[11px] font-mono text-warm-muted leading-tight">{s}</span>
                  ))}
                </div>

                <div className="px-3 py-1.5 bg-warm-bg/40 flex items-center gap-1.5">
                  {d.status === 'ok' ? (
                    <><span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse shrink-0" /><span className="text-[10px] font-mono text-warm-muted">Vectorised ✓</span></>
                  ) : (
                    <><RotateCw className="h-3 w-3 text-amber-warm animate-spin shrink-0" /><span className="text-[10px] font-mono text-amber-warm">Vectorising...</span></>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right: Growth Rates + Relationships ────────────────── */}
        <div ref={rightColRef} className="flex-1 max-w-[580px] mx-auto flex flex-col gap-4 z-20 min-w-0">

          {/* Growth Rates table */}
          <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between font-sans">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-indigo" />
                <span className="text-[12.5px] font-bold text-warm-text">Pre-calculated Growth Rates</span>
              </div>
              <span className="text-[9.5px] font-mono text-warm-muted">auto-generated · refreshed 12:08</span>
            </div>

            <table className="w-full text-left border-collapse text-[11.5px] font-mono">
              <thead>
                <tr className="bg-warm-bg/60 text-warm-muted font-sans font-bold border-b border-warm-border text-[11px]">
                  <th className="p-2.5 pl-4">Segment</th>
                  <th className="p-2.5">Q1</th><th className="p-2.5">Q2</th><th className="p-2.5">Q3</th>
                  <th className="p-2.5">Q4 (proj.)</th>
                  <th className="p-2.5 pr-4">YoY</th>
                </tr>
              </thead>
              <tbody>
                {growthRates.map((gr, gi) => (
                  <tr
                    key={gi}
                    ref={el => { rowRefs.current[gi] = el; }}
                    className={`border-b border-warm-border/40 transition-colors ${
                      gi < DIMENSIONS.length && DIMENSIONS[gi]?.id === selectedId
                        ? 'bg-lavender/15'
                        : 'hover:bg-warm-bg/15'
                    }`}
                  >
                    <td className="p-2.5 pl-4 font-sans font-semibold text-warm-text">{gr.segment}</td>
                    <td className="p-2.5 text-warm-muted">{gr.q1}</td>
                    <td className="p-2.5 text-warm-muted">{gr.q2}</td>
                    <td className="p-2.5 text-warm-muted">{gr.q3}</td>
                    <td className="p-2.5 font-semibold text-brand-indigo">{gr.q4Proj}</td>
                    <td className={`p-2.5 font-bold pr-4 ${gr.yoy.startsWith('+') ? 'text-sage' : 'text-destructive'}`}>{gr.yoy}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-4 py-2.5 bg-warm-bg/30 border-t border-warm-border/60 flex items-center justify-between text-[10.5px]">
              <span className="text-warm-muted">Baseline growth · 5 of 12 segments shown</span>
              <span className="text-brand-indigo font-sans font-semibold hover:underline cursor-pointer">Expand all →</span>
            </div>
          </div>

          {/* Drafted Relationships */}
          <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden font-sans">
            <div className="px-4 py-3 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-warm-text">Drafted Relationships</span>
              <span className="text-[9.5px] font-mono text-warm-muted">4 connections · confirm to lock</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {relationships.map((rel, ri) => (
                <div key={ri} className="flex items-start gap-2 p-2.5 rounded-xl bg-warm-bg/40 border border-warm-border/60 hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    checked={rel.confirmed}
                    onChange={() => toggleRelationshipConfirmed(ri)}
                    className="rounded border-warm-border text-brand-indigo h-3.5 w-3.5 cursor-pointer mt-0.5 shrink-0"
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-warm-text">
                      <span>{rel.a}</span>
                      <span className="text-brand-indigo font-mono font-bold">{rel.op}</span>
                      <span>{rel.b}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-warm-muted truncate">({rel.note})</span>
                      <span className={`text-[7.5px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                        rel.confirmed ? 'bg-sage-light text-sage' : 'bg-amber-warm-light text-amber-warm'
                      }`}>{rel.confirmed ? 'confirmed' : 'review'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 pb-3">
              <button
                onClick={() => navigate('/dashboard/batch')}
                className="w-full py-2 bg-brand-indigo hover:opacity-90 text-white rounded-xl text-[12px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Construct Optimization Matrix <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
     </div>
    </div>
  );
}
