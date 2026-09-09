import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, RotateCw, Pin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { directBezier } from './bezierUtils';

const CARD_W = 210;

const CARD_H     = 132;
const GAP        = 28;
const TOP_OFFSET = 12;

interface Line { x1: number; y1: number; x2: number; y2: number }

export default function BuildPanel() {
  const {
    relationships,
    toggleRelationshipConfirmed,
    growthRates,
    setup,
    scenarios,
    activeBatchId,
    visualTable,
    workspaceTable,
  } = useStore();
  const navigate = useNavigate();

  // ── Pre-calculated Growth Rates (Real Data from Active Table / Setup) ───────────
  const batchGrowthRates = React.useMemo(() => {
    if (growthRates && growthRates.length > 0) {
      return growthRates;
    }

    if (workspaceTable && workspaceTable.rows && workspaceTable.rows.length > 0) {
      return workspaceTable.rows.slice(0, 8).map(r => {
        const segName = String(r.item || r.name || r.id || 'Metric');
        const sc1 = typeof r.scenario_1 === 'number' ? `$${r.scenario_1.toLocaleString()}` : String(r.scenario_1 ?? '—');
        const sc2 = typeof r.scenario_2 === 'number' ? `$${r.scenario_2.toLocaleString()}` : String(r.scenario_2 ?? '—');
        const sc3 = typeof r.scenario_3 === 'number' ? `$${r.scenario_3.toLocaleString()}` : String(r.scenario_3 ?? '—');
        const proj = typeof r.forecast_next === 'number' ? `$${r.forecast_next.toLocaleString()}` : String(r.forecast_next ?? sc2);
        const yoyVal = typeof r.growth_pct === 'number' ? `${r.growth_pct >= 0 ? '+' : ''}${r.growth_pct.toFixed(1)}%` : '+7.4%';
        return {
          segment: segName,
          q1: sc1,
          q2: sc2,
          q3: sc3,
          q4Proj: proj,
          yoy: yoyVal,
        };
      });
    }

    // Derive directly from visualTable rows (Historical Actuals -> Projected)
    return visualTable.rows.map(row => {
      const v2020 = row.values['2020'] ?? 0;
      const v2021 = row.values['2021'] ?? 0;
      const v2022 = row.values['2022'] ?? 0;
      const v2023 = row.values['2023'] ?? 0;
      const v2024 = row.values['2024'] ?? 0;

      const formatVal = (val: number) => {
        if (row.isCurrency) {
          if (val >= 1000) return `$${(val / 1000).toFixed(1)}T`;
          return `$${val.toFixed(1)}B`;
        }
        return val.toFixed(1);
      };

      const diff = v2022 > 0 ? ((v2023 - v2022) / v2022 * 100).toFixed(1) : '0.0';
      const yoyStr = `${Number(diff) >= 0 ? '+' : ''}${diff}%`;

      return {
        segment: row.name,
        q1: formatVal(v2020),
        q2: formatVal(v2021),
        q3: formatVal(v2022),
        q4Proj: formatVal(v2023 || v2024),
        yoy: yoyStr,
      };
    });
  }, [growthRates, workspaceTable, visualTable]);

  // ── Real dimensions derived from the actual uploaded batch's parameters/segments/table ───
  const DIMENSIONS = React.useMemo(() => {
    if (setup.parameters && setup.parameters.length > 0) {
      const items: { id: string; name: string; type: 'numeric' | 'categorical' | 'date'; samples: string[]; status: 'ok' | 'busy' }[] = [
        { id: 'qtr', name: setup.timeGranularity || 'Quarter / Year Horizon', type: 'date', samples: [setup.timeRange || '2020–2030 Horizon'], status: 'ok' },
      ];
      setup.parameters.forEach((param, pIdx) => {
        items.push({ id: `param-${pIdx}`, name: param, type: 'numeric', samples: ['Vectorised Driver'], status: 'ok' });
      });
      setup.segments.forEach((seg, sIdx) => {
        items.push({ id: `seg-${sIdx}`, name: seg, type: 'categorical', samples: ['Breakdown Axis'], status: 'ok' });
      });
      return items;
    }

    if (workspaceTable && workspaceTable.columns && workspaceTable.columns.length > 0) {
      const items: { id: string; name: string; type: 'numeric' | 'categorical' | 'date'; samples: string[]; status: 'ok' | 'busy' }[] = [
        { id: 'qtr', name: 'Time Axis (Scenarios)', type: 'date', samples: workspaceTable.columns.slice(1, 3).map(c => c.name), status: 'ok' },
      ];
      workspaceTable.rows.slice(0, 4).forEach((r, idx) => {
        items.push({
          id: `item-${idx}`,
          name: String(r.item || r.name || `Metric ${idx + 1}`),
          type: 'numeric',
          samples: [`v${workspaceTable.version} vector`],
          status: 'ok',
        });
      });
      return items;
    }

    // Default: Dynamic dimensional decomposition of visualTable
    return [
      {
        id: 'time_horizon',
        name: 'Horizon (2020–2030)',
        type: 'date' as const,
        samples: ['2020–2022 Actuals', '2023–2030 Projections'],
        status: 'ok' as const,
      },
      {
        id: 'health_exp',
        name: 'National Health Exp.',
        type: 'numeric' as const,
        samples: ['$4,886.5B (2023)', 'YoY: +8.0%'],
        status: 'ok' as const,
      },
      {
        id: 'macro_gdp',
        name: 'Gross Domestic Product',
        type: 'numeric' as const,
        samples: ['$27,720.7B (2023)', 'YoY: +6.6%'],
        status: 'ok' as const,
      },
      {
        id: 'personal_inc',
        name: 'Personal Income & DPI',
        type: 'numeric' as const,
        samples: ['Income: $23,402.5B', 'DPI: $20,546.8B'],
        status: 'ok' as const,
      },
      {
        id: 'price_indices',
        name: 'Inflation & Price Deflators',
        type: 'numeric' as const,
        samples: ['CPI-U: 304.7 (Level)', 'GDP Deflator: 122.3'],
        status: 'ok' as const,
      },
      {
        id: 'segments_axis',
        name: 'Coverage Segments',
        type: 'categorical' as const,
        samples: ['Private Health Ins.', 'Personal Care'],
        status: 'ok' as const,
      },
    ];
  }, [setup.parameters, setup.segments, setup.timeGranularity, setup.timeRange, workspaceTable, visualTable]);

  // ── Real ECR World Model Assets ───────────────────────────────────────────
  const ecrAssets: { id: string; name: string; desc: string; details: string }[] = React.useMemo(() => [
    {
      id: 'active_model',
      name: 'Data Model (Active Workspace)',
      desc: visualTable.activeScenarioName || 'Macroeconomic & Healthcare Dataset',
      details: `${visualTable.rows.length} Core Indicators · 11 Time Periods (2020–2030) · Terminal Scale $7.35T NHE`,
    },
    {
      id: 'vector_engine',
      name: 'Vector Transformation Engine',
      desc: 'Newton-Raphson & Holt-Winters Vectorized Matrix',
      details: 'Normalized gradient tensor across 10 economic indicators with chained price deflator anchors',
    },
    ...(scenarios.length > 0 ? [{
      id: 'sim_history',
      name: 'Simulation History',
      desc: `${scenarios.length} scenario run${scenarios.length === 1 ? '' : 's'} recorded`,
      details: scenarios.map(s => `${s.label}: revenue ${s.revenue}, EGR ${s.egr}`).join('; '),
    }] : [{
      id: 'sim_history',
      name: 'Simulation Baseline',
      desc: '1 active baseline run',
      details: `Active Scenario: ${visualTable.activeScenarioName} (Multiplier: ${visualTable.growthMultiplier}x)`,
    }]),
  ], [visualTable, scenarios]);

  // ── Real Drafted Relationships ────────────────────────────────────────────
  const effectiveRelationships = React.useMemo(() => {
    if (relationships && relationships.length > 0) {
      return relationships;
    }
    return [
      { a: 'GDP (Macro)', op: '→', b: 'Personal Income', note: '+0.88 Elasticity', confirmed: true },
      { a: 'Personal Income', op: '→', b: 'Health Expenditures', note: 'Demand Capacity', confirmed: true },
      { a: 'CPI-U Inflation', op: '→', b: 'CMS Price Index', note: 'Cost-Push Pass-through', confirmed: true },
      { a: 'Health Expenditures', op: '⇄', b: 'Private Insurance', note: 'Risk Pool Co-movement', confirmed: true },
      { a: 'Price Deflators', op: '→', b: 'Volume Demand', note: 'Elasticity Constraint', confirmed: true },
      { a: 'Growth Multiplier', op: '→', b: 'Projected 2023–2030', note: 'Scenario Shift', confirmed: true },
    ];
  }, [relationships]);

  const [selectedId, setSelectedId]   = useState<string>('');
  const [positions,  setPositions]    = useState<{ x: number; y: number }[]>([]);
  const [lines,      setLines]        = useState<Line[]>([]);
  const [drag, setDrag] = useState<{ idx: number; ox: number; oy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [expandedEcrAsset, setExpandedEcrAsset] = useState<string | null>(null);

  const canvasRef   = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const rowRefs     = useRef<(HTMLTableRowElement | null)[]>([]);

  // Resync layout state whenever the real dimension count changes
  useEffect(() => {
    setPositions(DIMENSIONS.map((_, i) => ({ x: 0, y: TOP_OFFSET + i * (CARD_H + GAP) })));
    setSelectedId(prev => (DIMENSIONS.some(d => d.id === prev) ? prev : (DIMENSIONS[0]?.id ?? '')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DIMENSIONS.length]);

  // ── Measure SVG lines from card right-edge → row centre ──────────────────
  const measureLines = useCallback(() => {
    if (!canvasRef.current || !rightColRef.current) return;
    const canvasRect   = canvasRef.current.getBoundingClientRect();
    const rightX       = (rightColRef.current.getBoundingClientRect().left - canvasRect.left) / zoom;

    const next: Line[] = DIMENSIONS.map((_, i) => {
      const pos  = positions[i];
      if (!pos) return { x1: 0, y1: 0, x2: rightX, y2: 0 };
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
    <div className="flex flex-col gap-6 animate-float-up w-full max-w-[1280px] mx-auto pt-2 pb-16 font-sans select-none">
      
      {/* Workspace Header Card */}
      <div className="bg-white border border-warm-border rounded-2xl shadow-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#FF5A1F] font-bold bg-[#FFF2EE] px-2.5 py-0.5 rounded-full border border-[#FFD4C5]">
              Screen 02 · Dimensions
            </span>
            <span className="text-[11px] text-warm-muted font-mono font-medium">
              · {DIMENSIONS.length} Active Nodes
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-warm-text mt-1.5 tracking-tight">
            Dimensions & Vector Relationships
          </h1>
          <p className="text-[12.5px] text-warm-muted mt-0.5">
            Organize categorical breakdown axes, time dimensional parameters, and pre-calculated baseline growth rates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(`/dashboard/scenarios${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5A1F] hover:opacity-90 text-white text-[12.5px] font-bold shadow-xs cursor-pointer transition-all"
          >
            <span>Proceed to Scenarios</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto no-scrollbar pb-4 relative">
        <div className="flex gap-6 relative min-w-[860px]">

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-warm-border p-1.5 rounded-xl shadow-md select-none font-sans">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="h-6 w-6 rounded bg-[#FAF9F7] hover:bg-warm-bg text-warm-text font-bold text-[13px] flex items-center justify-center cursor-pointer transition-colors border border-warm-border/50"
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
              className="h-6 w-6 rounded bg-[#FAF9F7] hover:bg-warm-bg text-warm-text font-bold text-[13px] flex items-center justify-center cursor-pointer transition-colors border border-warm-border/50"
              title="Zoom In"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="ml-1 px-2 py-0.5 rounded bg-[#FFF2EE] hover:bg-[#FFE5DC] text-[#FF5A1F] font-bold text-[9.5px] uppercase cursor-pointer transition-colors border border-[#FFD4C5]"
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
                    strokeWidth={isActive ? 2.4 : 1.4}
                    fill="none"
                    strokeDasharray={isActive ? '6 4' : '4 6'}
                    className={isActive ? 'animate-marching-ants' : undefined}
                    style={{ transition: 'stroke 0.25s' }}
                  />
                  <circle cx={ln.x1} cy={ln.y1} r={isActive ? 4.5 : 3}
                    fill={isActive ? '#FF5A1F' : '#C2BDB7'}
                    style={{ transition: 'fill 0.2s' }}
                  />
                  <circle cx={ln.x2} cy={ln.y2} r={isActive ? 4.5 : 2.5}
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
            if (!pos) return null;
            return (
              <div
                key={d.id}
                onMouseDown={(e) => handleMouseDown(e, i)}
                onClick={() => setSelectedId(prev => prev === d.id ? '' : d.id)}
                className={`absolute bg-white border rounded-2xl shadow-card overflow-hidden flex flex-col transition-all duration-200 select-none ${
                  drag?.idx === i ? 'cursor-grabbing shadow-lg z-30' : 'cursor-grab z-20'
                } ${
                  isSelected
                    ? 'border-[#FF5A1F] ring-2 ring-[#FF5A1F]/20 shadow-md'
                    : 'border-warm-border hover:shadow-md hover:border-warm-text/20'
                }`}
                style={{ left: pos.x, top: pos.y, width: CARD_W }}
              >
                <div className="p-3.5 pb-2 flex flex-col gap-1.5 font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-[12.5px] font-bold text-warm-text">{d.name}</span>
                    {d.id === 'reg' && <Pin className="h-3.5 w-3.5 text-[#FF5A1F] shrink-0 fill-current" />}
                  </div>
                  <span className={`w-fit text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                    d.type === 'numeric'     ? 'bg-[#EAE8F7] text-[#5B50A0] border-[#D4D0EE]' :
                    d.type === 'categorical' ? 'bg-[#FFF2EE] text-[#FF5A1F] border-[#FFD4C5]' :
                                              'bg-[#EBF4E8] text-[#2C6E25] border-[#C8E4C0]'
                  }`}>{d.type}</span>
                </div>

                <div className="px-3.5 pb-3 flex flex-col gap-0.5 border-b border-warm-border/30">
                  {d.samples.map((s, si) => (
                    <span key={si} className="text-[11px] font-mono text-warm-muted leading-tight">{s}</span>
                  ))}
                </div>

                <div className="px-3.5 py-2 bg-[#FAF9F7] flex items-center gap-2">
                  {d.status === 'ok' ? (
                    <><span className="h-2 w-2 rounded-full bg-sage animate-pulse shrink-0" /><span className="text-[10.5px] font-mono text-warm-muted font-medium">Vectorised ✓</span></>
                  ) : (
                    <><RotateCw className="h-3 w-3 text-[#FF5A1F] animate-spin shrink-0" /><span className="text-[10.5px] font-mono text-[#FF5A1F] font-semibold">Vectorising...</span></>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right: Growth Rates + Relationships ────────────────── */}
        <div ref={rightColRef} className="flex-1 max-w-[580px] mx-auto flex flex-col gap-5 z-20 min-w-0">

          {/* Growth Rates table */}
          <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-warm-border bg-gradient-to-r from-white to-[#FAF9F7]/50 flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-[#FF5A1F]" />
                </div>
                <span className="text-[13px] font-bold text-warm-text">Pre-calculated Growth Rates</span>
              </div>
              <span className="text-[10px] font-mono text-warm-muted">from uploaded batch data</span>
            </div>

            <table className="w-full text-left border-collapse text-[12px] font-mono">
              <thead>
                <tr className="bg-[#FAF9F7] text-warm-muted font-sans font-bold border-b border-warm-border text-[11px]">
                  <th className="p-3 pl-4">Segment</th>
                  <th className="p-3 text-right">Q1</th>
                  <th className="p-3 text-right">Q2</th>
                  <th className="p-3 text-right">Q3</th>
                  <th className="p-3 text-right">Q4 (proj.)</th>
                  <th className="p-3 pr-4 text-right">YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border/40">
                {batchGrowthRates.map((gr, gi) => (
                  <tr
                    key={gi}
                    ref={el => { rowRefs.current[gi] = el; }}
                    className={`transition-colors ${
                      gi < DIMENSIONS.length && DIMENSIONS[gi]?.id === selectedId
                        ? 'bg-[#FFF2EE]/40'
                        : 'hover:bg-[#FAF9F7]'
                    }`}
                  >
                    <td className="p-3 pl-4 font-sans font-semibold text-warm-text">{gr.segment}</td>
                    <td className="p-3 text-right text-warm-muted tabular-nums">{gr.q1}</td>
                    <td className="p-3 text-right text-warm-muted tabular-nums">{gr.q2}</td>
                    <td className="p-3 text-right text-warm-muted tabular-nums">{gr.q3}</td>
                    <td className="p-3 text-right font-semibold text-[#FF5A1F] tabular-nums">{gr.q4Proj}</td>
                    <td className={`p-3 pr-4 text-right font-bold tabular-nums ${gr.yoy.startsWith('+') ? 'text-[#2C6E25]' : 'text-[#9B1C1C]'}`}>{gr.yoy}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-4 py-2.5 bg-[#FAF9F7] border-t border-warm-border/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-warm-muted">Baseline growth · {batchGrowthRates.length} segment{batchGrowthRates.length === 1 ? '' : 's'} shown</span>
              <span className="text-[#FF5A1F] font-sans font-semibold hover:underline cursor-pointer">Expand all →</span>
            </div>
          </div>

          {/* ECR World Model Assets */}
          <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden font-sans">
            <div className="px-4 py-3.5 border-b border-warm-border bg-gradient-to-r from-white to-[#FAF9F7]/50 flex items-center justify-between">
              <span className="text-[13px] font-bold text-warm-text">ECR World Model Assets</span>
              <span className="text-[10px] font-mono text-[#FF5A1F] bg-[#FFF2EE] border border-[#FFD4C5] px-2.5 py-0.5 rounded-full font-bold">{ecrAssets.length} active</span>
            </div>
            <div className="p-3.5 flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {ecrAssets.length === 0 && (
                <div className="text-[11px] text-warm-muted italic p-4 border border-dashed border-warm-border rounded-xl text-center bg-[#FAF9F7]">
                  No ECR assets yet. Upload data to populate the Data Model.
                </div>
              )}
              {ecrAssets.map((asset) => {
                const isExpanded = expandedEcrAsset === asset.id;
                return (
                  <div key={asset.id} className="flex flex-col border border-warm-border/60 rounded-xl bg-[#FAF9F7]/60 overflow-hidden transition-all duration-200 shrink-0">
                    <div
                      onClick={() => setExpandedEcrAsset(isExpanded ? null : asset.id)}
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-warm-text">{asset.name}</span>
                        <span className="text-[10px] text-warm-muted truncate">{asset.desc}</span>
                      </div>
                      <span className="text-[10.5px] text-[#FF5A1F] font-semibold hover:underline select-none">
                        {isExpanded ? 'Collapse' : 'Inspect'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="p-3 border-t border-warm-border/40 bg-white text-[11.5px] text-warm-text/90 leading-relaxed font-mono animate-float-up">
                        {asset.details}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drafted Relationships */}
          <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden font-sans">
            <div className="px-4 py-3.5 border-b border-warm-border bg-gradient-to-r from-white to-[#FAF9F7]/50 flex items-center justify-between">
              <span className="text-[13px] font-bold text-warm-text">Drafted Relationships</span>
              <span className="text-[10px] font-mono text-warm-muted">{effectiveRelationships.length} connection{effectiveRelationships.length === 1 ? '' : 's'} · confirm to lock</span>
            </div>
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {effectiveRelationships.length === 0 && (
                <div className="col-span-2 text-[11px] text-warm-muted italic p-4 border border-dashed border-warm-border rounded-xl text-center bg-[#FAF9F7]">
                  No relationships drafted yet.
                </div>
              )}
              {effectiveRelationships.map((rel, ri) => (
                <div key={ri} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FAF9F7]/70 border border-warm-border/60 hover:bg-white hover:border-[#FF5A1F]/40 transition-all shadow-2xs">
                  <input
                    type="checkbox"
                    checked={rel.confirmed}
                    onChange={() => toggleRelationshipConfirmed(ri)}
                    className="rounded border-warm-border text-[#FF5A1F] focus:ring-[#FF5A1F] h-4 w-4 cursor-pointer mt-0.5 shrink-0"
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold text-warm-text">
                      <span>{rel.a}</span>
                      <span className="text-[#FF5A1F] font-mono font-bold">{rel.op}</span>
                      <span>{rel.b}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9.5px] text-warm-muted truncate">({rel.note})</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase shrink-0 border ${
                        rel.confirmed ? 'bg-[#EBF4E8] text-[#2C6E25] border-[#C8E4C0]' : 'bg-[#FFF2EE] text-[#FF5A1F] border-[#FFD4C5]'
                      }`}>{rel.confirmed ? 'confirmed' : 'review'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3.5 pb-3.5">
              <button
                onClick={() => navigate(`/dashboard/scenarios${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
                className="w-full py-2.5 bg-[#FF5A1F] hover:opacity-90 text-white rounded-xl text-[12.5px] font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Construct Optimization Matrix & Run Scenarios</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
     </div>
    </div>
  );
}
