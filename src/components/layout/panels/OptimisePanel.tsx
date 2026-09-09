import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, Play, Pin, ChevronDown, TrendingUp, Link2, RefreshCw, Zap } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { directBezier } from './bezierUtils';
import { ModelType } from '../../../types';
import type { ForecastData } from '../../../types/api';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';

interface OptimisePanelProps {
  triggerToast: (msg: string) => void;
}

const CARD_W = 224;
const CARD_H = 140;

const INITIAL_POSITIONS: Record<string, { x: number; y: number }> = {
  qtr:    { x: 40,  y: 80  },
  rev:    { x: 300, y: 80  },
  reg:    { x: 560, y: 60  },
  prod:   { x: 40,  y: 280 },
  cost:   { x: 300, y: 280 },
  margin: { x: 560, y: 280 },
  egr:    { x: 300, y: 480 },
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
  { value: 'Newton-Raphson', label: 'Inference (Newton-Raphson)', desc: 'Gradient-based optimization' },
  { value: 'Holt-Winters',   label: 'Prediction (Holt-Winters)',   desc: 'Time-series forecasting'   },
  { value: 'auto',           label: 'Auto-select (Default)',        desc: 'Let AI choose method'           },
];

export default function OptimisePanel({ triggerToast }: OptimisePanelProps) {
  const {
    setup,
    egrTarget,
    setEgrTarget,
    runOptimisation,
    model,
    setModel,
    activeBatchId,
    addMessage,
    syncBackendState,
    optimisationResult,
    setLatestForecast,
    latestForecast,
    worldModels,
    runFullScenario,
    pipelineStage,
    visualTable,
    workspaceTable,
  } = useStore();
  const navigate = useNavigate();

  // Dynamically derive dimension cards from active dataset / setup / workspaceTable
  const dynamicDimensions = React.useMemo(() => {
    if (setup.parameters && setup.parameters.length > 0) {
      const items: { id: string; name: string; type: 'numeric' | 'categorical' | 'date'; samples: string[] }[] = [
        { id: 'qtr', name: setup.timeGranularity || 'Quarter', type: 'date', samples: setup.timeRange ? [setup.timeRange.split(' → ')[0] || 'Q1', setup.timeRange.split(' → ')[1] || 'Q4'] : ['Q1', 'Q2', 'Q3'] },
      ];

      setup.parameters.forEach((param, pIdx) => {
        items.push({
          id: `param-${pIdx}`,
          name: param,
          type: 'numeric',
          samples: [],
        });
      });

      (setup.segments || []).forEach((seg, sIdx) => {
        items.push({
          id: `seg-${sIdx}`,
          name: seg,
          type: 'categorical',
          samples: [],
        });
      });

      items.push({
        id: 'egr',
        name: 'EGR Estimate',
        type: 'numeric',
        samples: [`target: ${egrTarget}%`],
      });

      return items;
    }

    if (workspaceTable && workspaceTable.columns && workspaceTable.columns.length > 0) {
      const items: { id: string; name: string; type: 'numeric' | 'categorical' | 'date'; samples: string[] }[] = [
        { id: 'qtr', name: 'Scenarios Axis', type: 'date', samples: workspaceTable.columns.slice(1, 3).map(c => c.name) },
      ];
      workspaceTable.rows.slice(0, 3).forEach((r, idx) => {
        items.push({
          id: `param-${idx}`,
          name: String(r.item || r.name || `Metric ${idx + 1}`),
          type: 'numeric',
          samples: [`$${r.scenario_1 ?? '0'}`],
        });
      });
      items.push({
        id: 'seg-0',
        name: 'Segment Driver',
        type: 'categorical',
        samples: ['Active Matrix'],
      });
      items.push({
        id: 'egr',
        name: 'EGR Estimate',
        type: 'numeric',
        samples: [`target: ${egrTarget}%`],
      });
      return items;
    }

    // Default: derived from visualTable (Healthcare & Macroeconomic Outlook)
    return [
      { id: 'qtr', name: 'Horizon (2020–2030)', type: 'date', samples: ['2020–2022', '2023–2030'] },
      { id: 'param-0', name: 'National Health Exp.', type: 'numeric', samples: ['$4,886.5B (2023)', 'YoY: +8.0%'] },
      { id: 'param-1', name: 'Gross Domestic Product', type: 'numeric', samples: ['$27,720.7B', 'YoY: +6.6%'] },
      { id: 'param-2', name: 'Personal Income', type: 'numeric', samples: ['$23,402.5B', 'YoY: +5.9%'] },
      { id: 'seg-0', name: 'Private Insurance', type: 'categorical', samples: ['$1,464.6B'] },
      { id: 'seg-1', name: 'Personal Care', type: 'categorical', samples: ['$1,313.9B'] },
      { id: 'egr', name: 'EGR Estimate', type: 'numeric', samples: [`target: ${egrTarget}%`] },
    ];
  }, [setup.parameters, setup.segments, setup.timeRange, setup.timeGranularity, egrTarget, workspaceTable, visualTable]);

  // Compute clean layout grid positions dynamically based on real items count.
  // Layout: Quarter (top-left) → params (top row) → segments (middle row) → EGR (bottom centre).
  const dynamicPositions = React.useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const qtr    = dynamicDimensions.find(d => d.id === 'qtr');
    const params  = dynamicDimensions.filter(d => d.id.startsWith('param-'));
    const segs    = dynamicDimensions.filter(d => d.id.startsWith('seg-'));

    const COL_W = 260;
    const ROW_H = 180;
    const LEFT  = 40;
    const ROW1  = 60;   // Quarter + params
    const ROW2  = ROW1 + ROW_H; // segments
    const ROW3  = ROW2 + ROW_H; // EGR

    // Row 1: Quarter at col 0, then params
    if (qtr) pos[qtr.id] = { x: LEFT, y: ROW1 };
    params.forEach((p, i) => {
      pos[p.id] = { x: LEFT + (i + 1) * COL_W, y: ROW1 };
    });

    // Row 2: Segments spread across the same columns as params (centred under them)
    const segStartCol = params.length > 0 ? 0 : 0;
    segs.forEach((s, i) => {
      pos[s.id] = { x: LEFT + (segStartCol + i) * COL_W, y: ROW2 };
    });

    // Row 3: EGR centred under the params/segs cluster
    const totalCols = Math.max(params.length + 1, segs.length);
    const egrX = LEFT + Math.floor(totalCols / 2) * COL_W;
    pos['egr'] = { x: egrX, y: ROW3 };

    return pos;
  }, [dynamicDimensions]);

  // Auto-connect dynamic dataset cards:
  //   Quarter → each param (time axis)
  //   each param → each segment (breakdown axis)
  //   all params + all segs → EGR (target)
  const dynamicConnections = React.useMemo(() => {
    const conns: Connection[] = [];
    const qtr    = dynamicDimensions.find(d => d.id === 'qtr');
    const params  = dynamicDimensions.filter(d => d.id.startsWith('param-'));
    const segs    = dynamicDimensions.filter(d => d.id.startsWith('seg-'));
    const egr    = dynamicDimensions.find(d => d.id === 'egr');

    // Quarter → every param (solid indigo — time drives the metric)
    params.forEach(p => {
      if (qtr) conns.push({ id: `${qtr.id}-${p.id}`, from: qtr.id, to: p.id, color: '#6E69BE', weight: 2.0, dashed: false, isDefault: true });
    });

    // Each param → each segment (how params break down by dimension)
    params.forEach(p => {
      segs.forEach(s => {
        conns.push({ id: `${p.id}-${s.id}`, from: p.id, to: s.id, color: '#6E69BE', weight: 1.6, dashed: false, isDefault: true });
      });
    });

    // All params + all segments → EGR (every input drives the target)
    params.forEach(p => {
      if (egr) conns.push({ id: `${p.id}-${egr.id}`, from: p.id, to: egr.id, color: '#6E69BE', weight: 2.0, dashed: false, isDefault: true });
    });
    segs.forEach(s => {
      if (egr) conns.push({ id: `${s.id}-${egr.id}`, from: s.id, to: egr.id, color: '#6E69BE', weight: 1.8, dashed: false, isDefault: true });
    });

    return conns;
  }, [dynamicDimensions]);

  const [isOptimizing,    setIsOptimizing]    = useState(false);
  const [positions,       setPositions]       = useState(INITIAL_POSITIONS);
  const [connections,     setConnections]     = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [pinnedIds,       setPinnedIds]       = useState<Set<string>>(new Set(['reg', 'margin']));
  const [selectedId,      setSelectedId]      = useState('rev');
  const [drag,            setDrag]            = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [zoom,            setZoom]            = useState(1);
  const [solverOpen,      setSolverOpen]      = useState(false);
  const [forecastOpen,    setForecastOpen]    = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [realForecast,    setRealForecast]    = useState<ForecastData | null>(null);
  const [forecastError,   setForecastError]   = useState<string | null>(null);

  // Flow C: only use latestForecast if it belongs to this batch
  const batchLatestForecast = (activeBatchId && latestForecast?.batch_id === activeBatchId)
    ? latestForecast : null;
  const activeForecast = realForecast ?? batchLatestForecast;

  // Only use world models from the active batch
  const batchWorldModels = activeBatchId
    ? worldModels.filter(wm => wm.batch_id === activeBatchId)
    : worldModels;
  const latestWorldModel = batchWorldModels.length > 0 ? batchWorldModels[batchWorldModels.length - 1] : null;

  const [linkSource,      setLinkSource]      = useState<string | null>(null);

  const getCardSamples = (card: { id: string; name: string; type: string; samples: string[] }) => {
    const opt = latestWorldModel;

    // ── EGR Target card ──────────────────────────────────────────────────────
    if (card.id === 'egr') {
      if (activeForecast) {
        const fv = activeForecast.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 });
        const strategyLabel = opt?.scenario_label || opt?.growth_strategy?.replace(/_/g, ' ') || null;
        const converged = opt?.status === 'converged';
        return [
          `target: ${fv}`,
          `period: ${activeForecast.target_time}`,
          ...(strategyLabel ? [`strategy: ${strategyLabel}`] : []),
          ...(optimisationResult ? [`achieved: ${optimisationResult.egrAchieved}% ${converged ? '✓' : ''}`] : [`status: run optimisation`]),
        ];
      }
      return optimisationResult
        ? [`target: ${egrTarget}%`, `achieved: ${optimisationResult.egrAchieved}%`]
        : [`target: ${egrTarget}%`, 'not yet computed'];
    }

    // ── Parameter (Driver) cards ─────────────────────────────────────────────
    if (card.id.startsWith('param-') && opt) {
      const p = opt.optimization_params;
      const r = opt.optimization_result;
      return [
        ...(p ? [`lr: ${p.learning_rate}  ·  scale: ${p.scale_factor}`] : []),
        ...(r ? [`iterations: ${r.iterations}  ·  err: ${r.convergence_error?.toExponential(2) ?? '—'}`] : []),
        ...(opt.de_decision?.vector_modification ? [`vec: ${opt.de_decision.vector_modification}`] : []),
      ].filter(Boolean);
    }

    // ── Segment (Modifier) cards ─────────────────────────────────────────────
    if (card.id.startsWith('seg-') && opt?.distribution_difference) {
      const d = opt.distribution_difference;
      return [
        `MARD: ${d.mard_percentage}`,
        `cos similarity: ${d.cosine_similarity?.toFixed(4) ?? '—'}`,
        `validation: ${d.validation_verdict ?? '—'}`,
      ];
    }

    return card.samples;
  };

  const [mousePos,        setMousePos]        = useState({ x: 0, y: 0 });
  const [hoveredConn,     setHoveredConn]     = useState<string | null>(null);
  const [edgeHoverId,     setEdgeHoverId]     = useState<string | null>(null);

  const canvasRef     = useRef<HTMLDivElement>(null);
  // ref so handleCardClick always reads latest values without stale closure
  const linkSourceRef = useRef<string | null>(null);
  const connectionsRef = useRef<Connection[]>(INITIAL_CONNECTIONS);

  useEffect(() => { linkSourceRef.current = linkSource; }, [linkSource]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);

  // Resync layout state with the real dimension set whenever it changes —
  // the static INITIAL_POSITIONS/INITIAL_CONNECTIONS ids (qtr/rev/reg/...)
  // don't match the real dynamic ids (param-0, seg-0, ...) computed above.
  useEffect(() => {
    setPositions(dynamicPositions);
    setConnections(dynamicConnections);
    setPinnedIds(new Set());
    setSelectedId(prev => (dynamicDimensions.some(d => d.id === prev) ? prev : (dynamicDimensions[0]?.id ?? '')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicDimensions.length]);

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
    const ox = e.clientX / zoom - startPos.x;
    const oy = e.clientY / zoom - startPos.y;

    setDrag({ id, ox, oy });
    const onMove = (ev: MouseEvent) => setPositions(prev => ({
      ...prev,
      [id]: { x: Math.max(0, ev.clientX / zoom - ox), y: Math.max(0, ev.clientY / zoom - oy) },
    }));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); setDrag(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Mouse position tracking (for rubber-band line) ────────────────────────
  const updateMouse = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
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
  const resetConnections = () => setConnections(dynamicConnections);

  const canvasHeight = Math.max(420, ...Object.values(positions).map(p => p.y + CARD_H + 40));
  const [insightsOpen, setInsightsOpen] = useState(true);
  const currentSolver = SOLVER_OPTIONS.find(s => s.value === model) ?? SOLVER_OPTIONS[0];
  const customCount = connections.filter(c => !c.isDefault).length;

  if (pipelineStage === 'ips') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center max-w-[920px] mx-auto pt-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-2xl bg-brand-indigo/10 flex items-center justify-center">
            <Zap className="h-8 w-8 text-brand-indigo" />
          </div>
          <div className="absolute -inset-1 rounded-2xl border-2 border-brand-indigo/30 animate-ping" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-warm-text mb-1">Newton-Raphson Optimisation Running…</h2>
          <p className="text-[13px] text-warm-muted max-w-sm leading-relaxed">
            Iterating to find the growth factor that achieves your {egrTarget}% EGR target.
            The balanced strategy is distributing adjustments uniformly across all historical periods.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {['Applying growth strategy across quarters', `Converging toward EGR = ${(1 + egrTarget / 100).toFixed(2)}`, 'Building World Model factor tree'].map((step, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-warm-border shadow-sm">
              <div className="h-4 w-4 rounded-full border-2 border-brand-indigo border-t-transparent animate-spin shrink-0" style={{ animationDelay: `${i * 0.2}s` }} />
              <span className="text-[11.5px] text-warm-text font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-float-up w-full max-w-[1280px] mx-auto pt-2 pb-16 font-sans">

      {/* Workspace Header Card */}
      <div className="bg-white border border-warm-border rounded-2xl shadow-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#FF5A1F] font-bold bg-[#FFF2EE] px-2.5 py-0.5 rounded-full border border-[#FFD4C5]">
              Screen 03 · Scenarios & Optimization
            </span>
            <span className="text-[11px] text-warm-muted font-mono font-medium">
              · Solver: {currentSolver.label.split('(')[0].trim()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-warm-text mt-1.5 tracking-tight">
            Scenario Modeling & Sensitivity Inference
          </h1>
          <p className="text-[12.5px] text-warm-muted mt-0.5">
            Execute Newton-Raphson gradient optimization or Holt-Winters forecasting to model growth targets and sensitivity paths.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(`/dashboard/conversation${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-warm-bg text-warm-text text-[12.5px] font-bold border border-warm-border shadow-2xs cursor-pointer transition-all"
          >
            <span>Back to Conversation</span>
          </button>
        </div>
      </div>

      {/* ── Controls bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-warm-border rounded-2xl shadow-card p-3 sm:p-3.5 z-40 select-none relative overflow-visible">

        {/* Group 1 — EGR targets & Preset Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#FAF9F7] border border-warm-border rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wide shrink-0 font-mono">EGR</span>
            <input
              type="number"
              value={egrTarget}
              onChange={e => setEgrTarget(Number(e.target.value))}
              className="w-10 text-center bg-transparent border-none outline-none font-bold text-[#FF5A1F] text-[13px] font-mono focus:ring-0"
            />
            <span className="font-bold text-[#FF5A1F] text-[12px] font-mono">%</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-[#F4F1EC] p-1 rounded-xl border border-warm-border/60">
            {[
              { val: 0, label: 'Baseline' },
              { val: 5, label: '+5%' },
              { val: 10, label: '+10%' },
              { val: 12, label: '12% Target' },
              { val: 15, label: '+15%' },
            ].map(pill => (
              <button
                key={pill.label}
                onClick={() => setEgrTarget(pill.val)}
                className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-semibold transition-all cursor-pointer ${
                  egrTarget === pill.val
                    ? 'bg-[#FF5A1F] text-white shadow-xs'
                    : 'text-warm-muted hover:text-warm-text hover:bg-white/80'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <span className="h-5 w-px bg-warm-border/60 shrink-0" />

        {/* Group 2 — time + solver method */}
        <span className="text-[11px] font-mono font-bold text-[#5B50A0] bg-[#EAE8F7] border border-[#D4D0EE] px-2.5 py-1 rounded-xl whitespace-nowrap shrink-0">
          Q1 → Q4 2025
        </span>

        <div className="relative shrink-0">
          <button
            onClick={() => setSolverOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F7] hover:bg-warm-bg border border-warm-border rounded-xl text-[12px] font-semibold text-warm-text transition-all cursor-pointer whitespace-nowrap shadow-2xs"
          >
            <span>{currentSolver.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-warm-muted" />
          </button>
          {solverOpen && (
            <div className="absolute top-10 left-0 w-64 bg-white border border-warm-border rounded-2xl shadow-float p-1.5 z-[999] animate-float-up font-sans">
              <div className="px-2.5 py-1 text-[10px] font-bold text-warm-muted uppercase tracking-wider font-mono border-b border-warm-border/50 pb-1 mb-1">
                Optimization Engine
              </div>
              {SOLVER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setModel(opt.value); setSolverOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[11.5px] transition-colors cursor-pointer flex flex-col gap-0.5 ${
                    model === opt.value
                      ? 'bg-[#FFF2EE] text-[#FF5A1F] font-bold border border-[#FFD4C5]'
                      : 'hover:bg-[#FAF9F7] text-warm-text border border-transparent'
                  }`}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-[10px] text-warm-muted font-normal">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="h-5 w-px bg-warm-border/60 shrink-0" />

        {/* Group 3 — link status */}
        {linkSource ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#FFF2EE] border border-[#FFD4C5] rounded-xl px-2.5 py-1">
              <Link2 className="h-3.5 w-3.5 text-[#FF5A1F]" />
              <span className="text-[11px] font-bold text-[#FF5A1F] whitespace-nowrap">
                ↳ {dynamicDimensions.find(d => d.id === linkSource)?.name}
              </span>
            </div>
            <button
              onClick={() => setLinkSource(null)}
              className="px-2.5 py-1 border border-warm-border bg-white hover:bg-[#FAF9F7] rounded-xl text-[10.5px] text-warm-muted hover:text-warm-text cursor-pointer transition-colors shrink-0 font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-warm-muted shrink-0 font-mono">
            <Link2 className="h-3.5 w-3.5" />
            <span>Hover card edge to link</span>
          </div>
        )}

        {customCount > 0 && (
          <button
            onClick={resetConnections}
            className="flex items-center gap-1 px-2.5 py-1 border border-warm-border bg-white hover:bg-[#FAF9F7] rounded-xl text-[11px] text-warm-muted hover:text-warm-text transition-colors cursor-pointer shrink-0 font-mono"
          >
            <RefreshCw className="h-3 w-3" /> Reset
          </button>
        )}

        {/* Group 4 — action buttons (pushed right) */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={async () => {
              try {
                setForecastLoading(true);
                setForecastOpen(false);

                // Pass forecast request to Data Ops AI agent
                const userPrompt = `Run forecast prediction with solver ${currentSolver.label} for batch workspace`;
                addMessage({ role: 'user', content: userPrompt });

                const agentRes = await api.agentChat({
                  message: userPrompt,
                  batch_id: activeBatchId || '',
                });

                let replyContent = agentRes.reply;
                if (agentRes.tools_used && agentRes.tools_used.length > 0) {
                  const formattedTools = agentRes.tools_used.map((t: string) => {
                    const clean = t.replace(/_/g, ' ');
                    return clean.charAt(0).toUpperCase() + clean.slice(1);
                  });
                  replyContent += `\n\n*Executed:* \`${formattedTools.join('`, `')}\``;
                }

                addMessage({ role: 'ai', content: replyContent });

                // Call forecast endpoint and keep the real response for display
                setForecastError(null);
                const fcRes = await api.forecast();
                setRealForecast(fcRes.data);
                setLatestForecast(fcRes.data);
                if (syncBackendState) {
                  await syncBackendState();
                }
              } catch (err: any) {
                setForecastError(err?.response?.data?.detail || err?.message || 'Forecast failed.');
                console.warn('Agent forecast execution notice:', err);
              } finally {
                setForecastLoading(false);
                setForecastOpen(true);
              }
            }}
            disabled={forecastLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-warm-border bg-white hover:bg-[#FAF9F7] rounded-xl text-[12px] font-semibold text-warm-text cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
          >
            {forecastLoading ? <RotateCw className="h-3.5 w-3.5 animate-spin text-[#FF5A1F]" /> : <TrendingUp className="h-3.5 w-3.5 text-warm-muted" />}
            <span>Run Forecast</span>
          </button>

          <button
            onClick={async () => {
              try {
                setIsOptimizing(true);

                // Pass optimization request to Data Ops AI agent
                const userPrompt = activeForecast
                  ? `Run optimisation inference using ${model} solver to achieve the forecasted value of ${activeForecast.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })} for period ${activeForecast.target_time} (predicted growth rate: ${activeForecast.predicted_growth_rate_percentage}). Identify the data changes, drivers, and strategies required to reach this forecast target.`
                  : `Run optimisation inference using ${model} solver against ${egrTarget}% EGR target`;
                addMessage({ role: 'user', content: userPrompt });

                const agentRes = await api.agentChat({
                  message: userPrompt,
                  batch_id: activeBatchId || '',
                });

                let replyContent = agentRes.reply;
                if (agentRes.tools_used && agentRes.tools_used.length > 0) {
                  const formattedTools = agentRes.tools_used.map(t => {
                    const clean = t.replace(/_/g, ' ');
                    return clean.charAt(0).toUpperCase() + clean.slice(1);
                  });
                  replyContent += `\n\n*Executed:* \`${formattedTools.join('`, `')}\``;
                }

                addMessage({ role: 'ai', content: replyContent });

                runOptimisation(() => {
                  setIsOptimizing(false);
                  navigate('/dashboard/world-model');
                });
              } catch (err: any) {
                console.warn('Agent optimization execution notice:', err);
                setIsOptimizing(false);
              }
            }}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5A1F] hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-[12.5px] font-bold shadow-xs transition-all cursor-pointer"
          >
            {isOptimizing ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span>Run Optimisation (Inference)</span>
          </button>

          {latestWorldModel && optimisationResult && (
            <button
              onClick={() => setInsightsOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[12px] font-semibold transition-colors cursor-pointer ${
                insightsOpen
                  ? 'border-[#FF5A1F] bg-[#FFF2EE] text-[#FF5A1F]'
                  : 'border-warm-border bg-white hover:bg-warm-bg text-warm-text'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{insightsOpen ? 'Hide Insights' : 'Show Insights'}</span>
            </button>
          )}

          {runFullScenario && (
            <button
              onClick={() => {
                const batchQuery = activeBatchId ? `?batch=${activeBatchId}` : '';
                void runFullScenario({ navigate, triggerToast, batchQuery });
              }}
              disabled={isOptimizing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1918] hover:bg-black disabled:opacity-50 text-white rounded-xl text-[12px] font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 text-[#FF5A1F]" />
              <span>Run Full Scenario</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Forecast preview — real Holt-Winters result from the backend ─── */}
      {forecastOpen && (
        <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden animate-float-up">
          <div className="px-4 py-2.5 border-b border-warm-border bg-gradient-to-r from-white to-warm-bg/25 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-brand-indigo" />
              <span className="text-[12px] font-bold text-warm-text">Forecast Result — {currentSolver.label}</span>
              {realForecast && (
                <span className="text-[9.5px] font-mono text-warm-muted bg-secondary px-2 py-0.5 rounded-full">
                  alpha={realForecast.holt_winters_parameters.alpha}, beta={realForecast.holt_winters_parameters.beta}
                </span>
              )}
            </div>
            <button onClick={() => setForecastOpen(false)} className="text-warm-muted hover:text-warm-text cursor-pointer text-[12px]">✕</button>
          </div>

          {!realForecast ? (
            <div className="p-6 text-center text-[12px] text-warm-muted">
              {forecastError ? `Error: ${forecastError}` : 'No forecast result available.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[11.5px]">
              <tbody>
                <tr className="border-b border-warm-border/30">
                  <td className="p-2.5 pl-4 font-semibold text-warm-muted">Data Range</td>
                  <td className="p-2.5 pr-4 font-mono text-warm-text">{realForecast.data_range.start_time} → {realForecast.data_range.end_time}</td>
                </tr>
                <tr className="border-b border-warm-border/30">
                  <td className="p-2.5 pl-4 font-semibold text-warm-muted">Last Known Value</td>
                  <td className="p-2.5 pr-4 font-mono text-warm-text">{realForecast.last_known_value.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-warm-border/30">
                  <td className="p-2.5 pl-4 font-semibold text-warm-muted">Target Period</td>
                  <td className="p-2.5 pr-4 font-mono font-bold text-brand-indigo">{realForecast.target_time}</td>
                </tr>
                <tr className="border-b border-warm-border/30">
                  <td className="p-2.5 pl-4 font-semibold text-warm-muted">Forecasted Value</td>
                  <td className="p-2.5 pr-4 font-mono font-bold text-brand-indigo">{realForecast.forecasted_value.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="p-2.5 pl-4 font-semibold text-warm-muted">Predicted Growth Rate</td>
                  <td className="p-2.5 pr-4 font-mono font-bold text-sage">{realForecast.predicted_growth_rate_percentage}</td>
                </tr>
              </tbody>
            </table>
          )}

          <div className="px-4 py-2 bg-sage-light/40 border-t border-sage-border/40 text-[10.5px] font-sans flex items-center justify-end">
            <span className="text-brand-indigo font-semibold hover:underline cursor-pointer"
              onClick={async () => {
                setIsOptimizing(true);
                if (realForecast) {
                  // Flow C: log forecast-as-target optimization intent
                  const fcPrompt = `Lock forecast target of ${realForecast.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })} for ${realForecast.target_time} and run full IPS inference to determine required data changes and strategies.`;
                  addMessage({ role: 'user', content: fcPrompt });
                  try {
                    await api.agentChat({ message: fcPrompt, batch_id: activeBatchId || '' }).then(r => {
                      addMessage({ role: 'ai', content: r.reply });
                    });
                  } catch { /* non-blocking */ }
                }
                runOptimisation(() => {
                  setIsOptimizing(false);
                  navigate('/dashboard/world-model');
                });
              }}>
              Lock & run full IPS inference →
            </span>
          </div>
        </div>
      )}

      {/* ── Canvas ───────────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto no-scrollbar pb-4 relative">
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
 
        <div
          ref={canvasRef}
          onMouseMove={updateMouse}
          className="relative min-w-[760px] origin-top-left transition-transform duration-100"
          style={{ height: canvasHeight, transform: `scale(${zoom})` }}
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

            // Flow C: connections feeding into EGR get special "contribution" styling
            const isContrib = !!activeForecast && conn.to === 'egr';
            const lineColor  = isHovered ? '#EF4444' : isContrib ? '#6E69BE' : conn.color;
            const lineWeight = isContrib ? 2.8 : (isHighlighted ? conn.weight + 0.7 : conn.weight);
            const lineDash   = isContrib ? undefined : (conn.dashed ? '5 4' : undefined);
            const lineOpacity = isHovered ? 1 : isContrib ? 0.85 : (isHighlighted ? 1 : 0.6);

            // Midpoint for contribution label
            const midX = (fp.x + CARD_W + tp.x) / 2;
            const midY = (fp.y + CARD_H / 2 + tp.y + CARD_H / 2) / 2;

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
                  stroke={lineColor}
                  strokeWidth={lineWeight}
                  strokeOpacity={lineOpacity}
                  fill="none"
                  strokeDasharray={lineDash}
                  className={isContrib ? 'animate-marching-ants' : (!conn.dashed && isHighlighted ? 'animate-marching-ants' : undefined)}
                  style={{ transition: 'stroke 0.15s, stroke-opacity 0.15s' }}
                />
                {/* Arrowhead on EGR-bound lines in Flow C */}
                {isContrib && (() => {
                  // Approximate arrow tip at target card left edge
                  const ax = tp.x, ay = tp.y + CARD_H / 2;
                  return (
                    <polygon
                      points={`${ax},${ay} ${ax - 8},${ay - 4} ${ax - 8},${ay + 4}`}
                      fill={lineColor} fillOpacity={lineOpacity}
                      style={{ pointerEvents: 'none' }}
                    />
                  );
                })()}
                {/* "contributes" pill label on EGR-bound lines */}
                {isContrib && !isHovered && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect x={midX - 24} y={midY - 8} width={48} height={16} rx={8}
                      fill="#6E69BE" fillOpacity={0.12} />
                    <text x={midX} y={midY + 4} textAnchor="middle"
                      fontSize="8" fontWeight="700" fill="#6E69BE" fillOpacity={0.9}
                      style={{ userSelect: 'none', fontFamily: 'monospace' }}>
                      drives →
                    </text>
                  </g>
                )}
                {/* Origin dot */}
                <circle cx={fp.x + CARD_W} cy={fp.y + CARD_H / 2}
                  r={isHovered ? 5 : (isContrib || isHighlighted) ? 4 : 3}
                  fill={isHovered ? '#EF4444' : lineColor}
                  fillOpacity={lineOpacity}
                  style={{ transition: 'fill 0.15s, r 0.15s' }} />
                {/* Target dot */}
                <circle cx={tp.x} cy={tp.y + CARD_H / 2}
                  r={isHovered ? 5 : (isContrib || isHighlighted) ? 4 : 3}
                  fill="white" stroke={isHovered ? '#EF4444' : lineColor}
                  strokeWidth={isContrib ? 2.5 : 1.8} strokeOpacity={lineOpacity}
                  style={{ transition: 'stroke 0.15s' }} />
                {/* Hover tooltip: ✕ */}
                {isHovered && (
                  <text
                    x={midX} y={midY - 8}
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
        {dynamicDimensions.map((d) => {
          const pos      = positions[d.id] || { x: 40, y: 80 };
          const isPinned = pinnedIds.has(d.id);
          const isSel    = selectedId === d.id;
          const isSource = linkSource === d.id;

          const isEdgeHovered = edgeHoverId === d.id;

          const isEgrForecast = d.id === 'egr' && !!activeForecast;
          const cardWidth = isEgrForecast ? CARD_W + 36 : CARD_W;

          return (
            <div
              key={d.id}
              onMouseDown={e => handleCardMouseDown(e, d.id)}
              onMouseMove={e => handleCardMouseMove(e, d.id)}
              onMouseLeave={() => setEdgeHoverId(null)}
              className={`absolute border rounded-2xl overflow-hidden flex flex-col transition-all duration-150 select-none z-20 ${
                drag?.id === d.id   ? 'cursor-grabbing shadow-xl z-30' :
                isEdgeHovered       ? 'cursor-crosshair' : 'cursor-grab'
              } ${
                isEgrForecast ? 'bg-gradient-to-b from-white to-[#FFF2EE]/40 border-[#FF5A1F] ring-2 ring-[#FF5A1F]/25 shadow-md' :
                isSource      ? 'bg-white border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 shadow-md' :
                isPinned      ? 'bg-white border-[#FF5A1F] ring-2 ring-[#FF5A1F]/20' :
                isSel         ? 'bg-white border-[#5B50A0] ring-2 ring-[#5B50A0]/20 shadow-md' :
                isEdgeHovered ? 'bg-white border-[#FF5A1F]/60 ring-2 ring-[#FF5A1F]/20 shadow-md' :
                                'bg-white border-warm-border hover:shadow-md shadow-card'
              }`}
              style={{ left: pos.x, top: pos.y, width: cardWidth }}
            >
              <div className={`p-3.5 pb-2 flex flex-col gap-1 font-sans ${isEgrForecast ? 'bg-[#FFF2EE]/50 border-b border-[#FFD4C5]' : ''}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[12.5px] font-bold truncate ${isEgrForecast ? 'text-[#FF5A1F] max-w-[190px]' : 'text-warm-text max-w-[140px]'}`}>{d.name}</span>
                    {isEgrForecast && (
                      <span className="shrink-0 text-[8.5px] font-bold bg-[#FF5A1F] text-white px-2 py-0.5 rounded-full uppercase tracking-wide font-mono">Target</span>
                    )}
                    {!isEgrForecast && !!activeForecast && d.id.startsWith('param-') && (
                      <span className="shrink-0 text-[8px] font-bold bg-[#EAE8F7] text-[#5B50A0] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-mono">Driver</span>
                    )}
                    {!isEgrForecast && !!activeForecast && d.id.startsWith('seg-') && (
                      <span className="shrink-0 text-[8px] font-bold bg-[#FFF2EE] text-[#FF5A1F] px-1.5 py-0.5 rounded-full uppercase tracking-wide font-mono">Modifier</span>
                    )}
                  </div>
                  <button
                    onMouseDown={e => { e.stopPropagation(); setPinnedIds(prev => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n; }); }}
                    onClick={e => e.stopPropagation()}
                    className={`shrink-0 cursor-pointer transition-colors ${isPinned ? 'text-[#FF5A1F]' : 'text-warm-border hover:text-warm-muted'}`}
                  >
                    <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <span className={`w-fit text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                  d.type === 'numeric'     ? 'bg-[#EAE8F7] text-[#5B50A0] border-[#D4D0EE]' :
                  d.type === 'categorical' ? 'bg-[#FFF2EE] text-[#FF5A1F] border-[#FFD4C5]' :
                                            'bg-[#EBF4E8] text-[#2C6E25] border-[#C8E4C0]'
                }`}>{d.type}</span>
              </div>

              {isEgrForecast ? (
                /* ── EGR card in Flow C: structured rows ── */
                <div className="px-3.5 py-2.5 flex flex-col gap-1.5 border-b border-[#FFD4C5]">
                  {getCardSamples(d).map((s, si) => {
                    const [label, ...rest] = s.split(': ');
                    const val = rest.join(': ');
                    const isMainValue = si === 0; // "forecast target"
                    const isAchieved  = label === 'achieved';
                    return (
                      <div key={si} className="flex items-baseline justify-between gap-2">
                        <span className="text-[9.5px] font-semibold text-warm-muted uppercase tracking-wide shrink-0 font-mono">{label}</span>
                        <span className={`font-mono tabular-nums leading-tight ${
                          isMainValue ? 'text-[13.5px] font-extrabold text-[#FF5A1F]' :
                          isAchieved  ? 'text-[11.5px] font-bold text-[#2C6E25]' :
                                        'text-[11.5px] font-semibold text-warm-text'
                        }`}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3.5 pb-3 flex flex-col gap-0.5 border-b border-warm-border/30">
                  {getCardSamples(d).map((s, si) => (
                    <span key={si} className="text-[11px] font-mono text-warm-muted leading-tight truncate">{s}</span>
                  ))}
                </div>
              )}

              <div className={`px-3.5 py-1.5 flex items-center gap-1.5 ${
                isSource      ? 'bg-[#FFF2EE]' :
                isPinned      ? 'bg-[#FFF2EE]/60' :
                isEgrForecast ? 'bg-[#FFF2EE]/40' :
                                'bg-[#FAF9F7]'
              }`}>
                {isSource ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] animate-pulse shrink-0" /><span className="text-[10px] font-mono text-[#FF5A1F] font-semibold">Linking source…</span></>
                ) : isPinned ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] shrink-0" /><span className="text-[10px] font-mono text-[#FF5A1F] font-medium">Pinned · Q3 values</span></>
                ) : isEgrForecast ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] animate-pulse shrink-0" /><span className="text-[10px] font-semibold text-[#FF5A1F]">Forecast-driven target</span></>
                ) : activeForecast && d.id.startsWith('param-') && latestWorldModel ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-[#5B50A0] animate-pulse shrink-0" /><span className="text-[10px] font-mono text-[#5B50A0]">Newton-Raphson optimised</span></>
                ) : activeForecast && d.id.startsWith('param-') ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-[#5B50A0] animate-pulse shrink-0" /><span className="text-[10px] font-mono text-[#5B50A0]">Primary driver</span></>
                ) : activeForecast && d.id.startsWith('seg-') && latestWorldModel?.distribution_difference ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] animate-pulse shrink-0" /><span className="text-[10px] font-mono text-[#FF5A1F]">{latestWorldModel.distribution_difference.validation_verdict ?? 'Distribution checked'}</span></>
                ) : activeForecast && d.id.startsWith('seg-') ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-[#FF5A1F] animate-pulse shrink-0" /><span className="text-[10px] font-mono text-[#FF5A1F]">Segment modifier</span></>
                ) : (
                  <><span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse shrink-0" /><span className="text-[10px] font-mono text-warm-muted">Vectorised ✓</span></>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* ── Hint bar ─────────────────────────────────────────────── */}
      <div className="self-center bg-white/70 px-4 py-1.5 border border-warm-border rounded-full shadow-sm text-[10px] font-mono text-warm-muted select-none">
        {linkSource
          ? 'Click another card edge to link · Esc or Cancel to abort'
          : 'Drag card body to move · hover card edge (crosshair) to link · hover line to delink'
        }
      </div>

      {/* ── How we achieved this — real backend reasoning ─────────── */}
      {latestWorldModel && optimisationResult && insightsOpen && (
        <div className="bg-white border border-warm-border rounded-2xl shadow-card overflow-hidden animate-float-up">

          {/* Header */}
          <div className="px-4 py-2.5 border-b border-warm-border bg-gradient-to-r from-white to-brand-indigo/5 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-brand-indigo" />
            <span className="text-[12px] font-bold text-warm-text">How we achieved the target</span>
            <span className={`ml-auto text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
              latestWorldModel.status === 'converged'
                ? 'bg-sage-light text-sage'
                : 'bg-amber-warm-light text-amber-warm'
            }`}>
              {latestWorldModel.status === 'converged' ? '✓ Converged' : '⚠ Not converged'}
            </span>
          </div>

          {/* Section 1 — Strategy & Input parameters */}
          <div className="grid grid-cols-2 divide-x divide-warm-border/30 border-b border-warm-border/30">
            {/* Strategy chosen */}
            <div className="px-4 py-3 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-warm-muted uppercase tracking-wide">Growth Strategy</span>
              <span className="text-[13px] font-extrabold text-brand-indigo capitalize">
                {latestWorldModel.scenario_label || latestWorldModel.growth_strategy?.replace(/_/g, ' ') || '—'}
              </span>
              {latestWorldModel.ds_decision?.reasoning && (
                <p className="text-[10.5px] text-warm-muted leading-snug">{latestWorldModel.ds_decision.reasoning}</p>
              )}
              {latestWorldModel.ds_decision?.data_insight && (
                <p className="text-[10px] font-semibold text-brand-indigo/70">{latestWorldModel.ds_decision.data_insight}</p>
              )}
            </div>

            {/* Vectorisation & engine params */}
            <div className="px-4 py-3 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-warm-muted uppercase tracking-wide">Vectorisation Parameters</span>
              <span className="text-[11px] font-bold text-warm-text">
                {latestWorldModel.optimization_method?.replace(/_/g, '-') || '—'}
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-0.5">
                {([
                  ['Learning rate',   latestWorldModel.optimization_params?.learning_rate?.toString()],
                  ['Scale factor',    latestWorldModel.optimization_params?.scale_factor?.toString()],
                  ['Max iterations',  latestWorldModel.optimization_params?.max_iterations?.toString()],
                  ['Tolerance',       latestWorldModel.optimization_params?.tolerance?.toExponential?.(1)],
                ] as [string, string | undefined][]).map(([k, v]) => v != null && (
                  <React.Fragment key={k}>
                    <span className="text-[9.5px] text-warm-muted">{k}</span>
                    <span className="text-[9.5px] font-mono font-semibold text-warm-text">{v}</span>
                  </React.Fragment>
                ))}
              </div>
              {latestWorldModel.de_decision?.vector_modification && (
                <p className="text-[10px] text-warm-muted mt-1">{latestWorldModel.de_decision.vector_modification}</p>
              )}
            </div>
          </div>

          {/* Section 2 — Newton-Raphson run detail */}
          <div className="grid grid-cols-4 divide-x divide-warm-border/30 border-b border-warm-border/30">
            {([
              ['Iterations', latestWorldModel.optimization_result?.iterations?.toString()],
              ['Convergence error', latestWorldModel.optimization_result?.convergence_error != null
                ? latestWorldModel.optimization_result.convergence_error.toExponential(3) : '—'],
              ['Final EGR', latestWorldModel.optimization_result?.final_egr_percentage],
              ['Target EGR', latestWorldModel.egr_target_percentage],
            ] as [string, string | undefined][]).map(([label, val]) => (
              <div key={label} className="px-3 py-2.5 flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-warm-muted uppercase tracking-wide">{label}</span>
                <span className="text-[12px] font-extrabold text-warm-text font-mono">{val ?? '—'}</span>
              </div>
            ))}
          </div>

          {/* Section 3 — Distribution quality */}
          {latestWorldModel.distribution_difference && (
            <div className="grid grid-cols-4 divide-x divide-warm-border/30 border-b border-warm-border/30">
              {([
                ['MARD', latestWorldModel.distribution_difference.mard_percentage],
                ['Cosine similarity', latestWorldModel.distribution_difference.cosine_similarity?.toFixed(4)],
                ['Top quartile Δ', latestWorldModel.distribution_difference.top_quartile_share_delta?.toFixed(4)],
                ['Validation', latestWorldModel.distribution_difference.validation_verdict],
              ] as [string, string | undefined][]).map(([label, val]) => (
                <div key={label} className="px-3 py-2.5 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-warm-muted uppercase tracking-wide">{label}</span>
                  <span className="text-[11px] font-semibold text-warm-text font-mono truncate">{val ?? '—'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Section 4 — Reasoning summary */}
          {latestWorldModel.reasoning_summary && (
            <div className="px-4 py-3 bg-warm-bg/30">
              <span className="text-[9px] font-bold text-warm-muted uppercase tracking-wide block mb-1">Reasoning</span>
              <p className="text-[10.5px] text-warm-muted leading-relaxed">{latestWorldModel.reasoning_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
