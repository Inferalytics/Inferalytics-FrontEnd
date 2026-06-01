import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, RotateCw, Pin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { getBezierPath } from './bezierUtils';

interface LineCoord { x1: number; y1: number; x2: number; y2: number; }

export default function BuildPanel() {
  const { relationships, toggleRelationshipConfirmed, growthRates } = useStore();
  const navigate = useNavigate();

  const dimensions = [
    { id: 'qtr', name: 'Quarter',      type: 'date',        samples: ['Q1 2025', 'Q2 2025', 'Q3 2025'], status: 'ok' },
    { id: 'rev', name: 'Revenue',      type: 'numeric',     samples: ['$1.24M', '$980K', '$2.10M'],     status: 'ok' },
    { id: 'reg', name: 'Region',       type: 'categorical', samples: ['EMEA', 'APAC', 'NA-East'],       status: 'ok' },
    { id: 'prod', name: 'Product Line',type: 'categorical', samples: ['Enterprise', 'SMB', 'Self-serve'],status: 'busy' },
  ] as const;

  const [selectedId, setSelectedId] = useState<string>('rev');

  const gridRef   = useRef<HTMLDivElement>(null);
  const cardRefs  = useRef<(HTMLDivElement | null)[]>([]);
  const targetRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineCoord[]>([]);

  const measureLines = useCallback(() => {
    if (!gridRef.current || !targetRef.current) return;
    const gridRect   = gridRef.current.getBoundingClientRect();
    const targetRect = targetRef.current.getBoundingClientRect();
    const x2 = targetRect.left - gridRect.left;
    const y2 = targetRect.top  - gridRect.top + targetRect.height / 2;
    const newLines = cardRefs.current.map((card) => {
      if (!card) return { x1: 0, y1: 0, x2, y2 };
      const r = card.getBoundingClientRect();
      return {
        x1: r.right - gridRect.left,
        y1: r.top   - gridRect.top + r.height / 2,
        x2,
        y2,
      };
    });
    setLines(newLines);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(measureLines);
    window.addEventListener('resize', measureLines);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', measureLines); };
  }, [measureLines]);

  // Re-measure when selection changes (scale transform shifts bounding rect)
  useEffect(() => {
    const id = requestAnimationFrame(measureLines);
    return () => cancelAnimationFrame(id);
  }, [selectedId, measureLines]);

  return (
    <div className="flex flex-col gap-4 animate-float-up h-full w-full">

      {/* Main split: cards left | table right */}
      <div ref={gridRef} className="flex-1 w-full grid grid-cols-12 gap-6 relative min-h-[520px]">

        {/* ── SVG connector lines ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" overflow="visible">
          {lines.map((ln, i) => {
            const isActive = dimensions[i]?.id === selectedId;
            return (
              <g key={i}>
                <path
                  d={getBezierPath(ln.x1, ln.y1, ln.x2, ln.y2)}
                  stroke={isActive ? '#FF5A1F' : '#DFDCD8'}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  strokeOpacity={isActive ? 1 : 0.5}
                  fill="none"
                  strokeDasharray={isActive ? '6 4' : undefined}
                  className={isActive ? 'animate-marching-ants' : undefined}
                  style={{ transition: 'stroke 0.25s, stroke-width 0.25s, stroke-opacity 0.25s' }}
                />
                {/* Origin dot on card right edge */}
                <circle
                  cx={ln.x1} cy={ln.y1}
                  r={isActive ? 4 : 3}
                  fill={isActive ? '#FF5A1F' : '#DFDCD8'}
                  fillOpacity={isActive ? 1 : 0.7}
                  style={{ transition: 'fill 0.25s' }}
                />
              </g>
            );
          })}
          {/* Target ring on table left edge */}
          {lines[0] && (
            <circle
              cx={lines[0].x2} cy={lines[0].y2}
              r={5} fill="none"
              stroke={selectedId ? '#FF5A1F' : '#DFDCD8'}
              strokeWidth="1.5" strokeOpacity="0.7"
              style={{ transition: 'stroke 0.25s' }}
            />
          )}
        </svg>

        {/* ── Left: dimension cards ── */}
        <div className="col-span-4 flex flex-col gap-3 z-20 justify-center">
          {dimensions.map((d, dIdx) => {
            const isSelected = d.id === selectedId;
            return (
              <div
                key={d.id}
                ref={(el) => { cardRefs.current[dIdx] = el; }}
                onClick={() => setSelectedId(prev => prev === d.id ? '' : d.id)}
                className={`w-[200px] bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer ${
                  isSelected
                    ? 'border-brand-indigo ring-2 ring-brand-indigo/30 shadow-md scale-[1.02]'
                    : 'border-warm-border hover:border-warm-text/20'
                }`}
              >
                <div className="p-3 pb-2 flex flex-col gap-1 font-sans">
                  <div className="flex justify-between items-center">
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
            );
          })}
        </div>

        {/* ── Right: Growth Rates table + Relationships ── */}
        <div className="col-span-8 flex flex-col gap-4 z-20 justify-center">

          {/* Growth Rates table */}
          <div ref={targetRef} className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between font-sans">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-indigo" />
                <span className="text-[12.5px] font-bold text-warm-text">Pre-calculated Growth Rates</span>
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

            <div className="p-2.5 bg-warm-bg/30 border-t border-warm-border/60 flex items-center justify-between text-[10.5px]">
              <span className="text-warm-muted">Baseline growth · 5 of 12 segments shown</span>
              <span className="text-brand-indigo font-sans font-semibold hover:underline cursor-pointer">Expand all →</span>
            </div>
          </div>

          {/* Drafted Relationships */}
          <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden font-sans">
            <div className="p-3.5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-warm-text">Drafted Relationships</span>
              <span className="text-[9.5px] font-mono text-warm-muted">4 connections · confirm to lock</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
              {relationships.map((rel, rIdx) => (
                <div key={rIdx} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-warm-bg/40 border border-warm-border/60 hover:bg-white transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={rel.confirmed}
                        onChange={() => toggleRelationshipConfirmed(rIdx)}
                        className="rounded border-warm-border text-brand-indigo focus:ring-brand-indigo h-3.5 w-3.5 cursor-pointer mt-0.5 shrink-0"
                      />
                      <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-warm-text">
                        <span>{rel.a}</span>
                        <span className="text-brand-indigo font-mono font-bold">{rel.op}</span>
                        <span>{rel.b}</span>
                      </div>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0 ${
                      rel.confirmed
                        ? 'bg-sage-light text-sage border border-sage-border/30'
                        : 'bg-amber-warm-light text-amber-warm border border-amber-warm-border/30'
                    }`}>
                      {rel.confirmed ? 'confirmed' : 'review'}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-warm-muted pl-5">({rel.note})</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-warm-bg/30 border-t border-warm-border/60">
              <button
                onClick={() => navigate('/dashboard/batch')}
                className="w-full py-1.5 bg-brand-indigo hover:opacity-90 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                Construct Optimization Matrix
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
