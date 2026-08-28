import React, { useEffect, useState } from 'react';
import { Layers, TrendingUp, GitBranch, BarChart3, ChevronLeft, ChevronRight, Activity, GitCompare } from 'lucide-react';
import { useStore, getWorldModelsCache } from '../../../store/useStore';
import type { WorldModel } from '../../../types/api';
import { useSearchParams } from 'react-router-dom';
import WorldModelGraph from '../../chat/WorldModelGraph';
import WorldModelCanvasTree from '../../chat/WorldModelCanvasTree';
import WorldModelContributionChart from '../../chat/WorldModelContributionChart';
import WorldModelCompareView from '../../chat/WorldModelCompareView';

type ViewMode = 'graph' | 'tree' | 'compare';

export default function WorldModelPage() {
  const { worldModels, latestForecast, activeBatchId, addWorldModel } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Derive viewMode from URL (?view=compare) so navigation drives it
  const urlView = searchParams.get('view');
  const [localViewMode, setLocalViewMode] = useState<ViewMode>(urlView === 'compare' ? 'compare' : 'tree');
  const viewMode = urlView === 'compare' ? 'compare' : localViewMode;

  const setViewMode = (v: ViewMode) => {
    setLocalViewMode(v);
    if (v === 'compare') {
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('view', 'compare'); return p; });
    } else {
      setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('view'); return p; });
    }
  };

  // On mount: if Zustand's worldModels is empty, restore from:
  //   1. module-level cache (survives route changes in same session)
  //   2. sessionStorage (survives page refresh — stored without tree)
  useEffect(() => {
    if (worldModels.length === 0) {
      // Try module-level cache first (has full tree)
      const cached = getWorldModelsCache();
      if (cached.length > 0) {
        cached.forEach(wm => addWorldModel(wm));
        return;
      }
      // Fall back to sessionStorage (compact, no tree)
      if (activeBatchId) {
        try {
          const raw = sessionStorage.getItem(`wm_batch_${activeBatchId}`);
          if (raw) {
            const stored: WorldModel[] = JSON.parse(raw);
            stored.forEach(wm => addWorldModel(wm));
          }
        } catch { /* ignore parse errors */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBatchId]);

  // Only show scenarios and forecast belonging to the active batch
  const batchModels = activeBatchId
    ? worldModels.filter(wm => wm.batch_id === activeBatchId)
    : worldModels;

  const batchForecast = (activeBatchId && latestForecast?.batch_id === activeBatchId)
    ? latestForecast : null;

  // Sort newest-first for display
  const reversed   = [...batchModels].sort((a, b) => b.scenario_number - a.scenario_number);
  const totalCount = reversed.length;

  if (totalCount === 0) {
    return (
      <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
        {batchForecast && (
          <div className="bg-white rounded-2xl border border-warm-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-border/60 bg-gradient-to-r from-white to-warm-bg/30 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-indigo" />
              <span className="text-[13px] font-bold text-warm-text">Forecast Result</span>
              <span className="ml-auto text-[10px] font-mono bg-lavender/30 text-brand-indigo px-2 py-0.5 rounded-full">
                Holt-Winters · α={batchForecast.holt_winters_parameters?.alpha} β={batchForecast.holt_winters_parameters?.beta}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-warm-border/50">
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Data Range</span>
                <span className="text-[12px] font-mono font-bold text-warm-text">{batchForecast.data_range?.start_time} → {batchForecast.data_range?.end_time}</span>
              </div>
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Target Period</span>
                <span className="text-[12px] font-mono font-bold text-brand-indigo">{batchForecast.target_time}</span>
              </div>
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Last Known Value</span>
                <span className="text-[12px] font-mono font-bold text-warm-text">{batchForecast.last_known_value?.toLocaleString()}</span>
              </div>
              <div className="px-4 py-3 flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Forecasted Value</span>
                <span className="text-[12px] font-mono font-bold text-brand-indigo">{batchForecast.forecasted_value?.toLocaleString()}</span>
              </div>
            </div>
            <div className="px-4 py-2.5 bg-sage-light/30 border-t border-sage-border/30 flex items-center gap-3">
              <span className="text-[11px] font-semibold text-warm-muted">Predicted Growth Rate:</span>
              <span className="text-[13px] font-bold text-sage">{batchForecast.predicted_growth_rate_percentage}</span>
              <span className="text-[10px] text-warm-muted ml-auto">Holt-Winters exponential smoothing — detects trend + seasonality</span>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center">
            <Layers className="h-7 w-7 text-brand-indigo/40" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-warm-text mb-1">No World Models Yet</h2>
            <p className="text-[13px] text-warm-muted max-w-sm leading-relaxed">
              Run an optimisation in the IPS Engine. The AI will build a semantic
              tree showing exactly which data points drove the EGR growth.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-indigo/5 border border-brand-indigo/15 text-[12px] text-brand-indigo font-medium">
            <TrendingUp className="h-4 w-4" />
            Go to IPS Engine → Run Optimisation
          </div>
        </div>
      </div>
    );
  }

  const current = reversed[selectedIdx] ?? reversed[0];
  const tree    = current.world_model_tree ?? null;

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-indigo/10 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5 text-brand-indigo" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-warm-text leading-tight">World Model</h1>
            <p className="text-[12px] text-warm-muted">
              {totalCount} scenario{totalCount !== 1 ? 's' : ''} · Which data drove the EGR growth
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-warm-bg p-0.5 rounded-lg border border-warm-border/40">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'graph' ? 'bg-white text-brand-indigo shadow-sm' : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Graph
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'tree' ? 'bg-white text-brand-indigo shadow-sm' : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Tree
            </button>
            {totalCount > 1 && (
              <button
                onClick={() => setViewMode('compare')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  viewMode === 'compare' ? 'bg-brand-indigo text-white shadow-sm' : 'text-warm-muted hover:text-warm-text'
                }`}
              >
                <GitCompare className="h-3.5 w-3.5" />
                Compare
              </button>
            )}
          </div>

          {/* Scenario pagination */}
          {totalCount > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
                disabled={selectedIdx === 0}
                className="h-7 w-7 rounded-lg border border-warm-border bg-white flex items-center justify-center text-warm-muted hover:text-warm-text disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[12px] font-mono text-warm-muted">{selectedIdx + 1} / {totalCount}</span>
              <button
                onClick={() => setSelectedIdx(i => Math.min(totalCount - 1, i + 1))}
                disabled={selectedIdx === totalCount - 1}
                className="h-7 w-7 rounded-lg border border-warm-border bg-white flex items-center justify-center text-warm-muted hover:text-warm-text disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Scenario tab pills ───────────────────────────────────── */}
      {totalCount > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {reversed.map((wm, i) => (
            <button
              key={wm.scenario_id}
              onClick={() => setSelectedIdx(i)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                i === selectedIdx
                  ? 'bg-brand-indigo text-white border-brand-indigo shadow-sm'
                  : 'bg-white text-warm-muted border-warm-border hover:border-brand-indigo/40 hover:text-warm-text'
              }`}
            >
              S{wm.scenario_number} · {wm.egr_target_percentage}
              {wm.status === 'converged' ? ' ✓' : ' ⚠'}
            </button>
          ))}
        </div>
      )}

      {/* ── Forecast Result Card ─────────────────────────────────── */}
      {batchForecast && (
        <div className="bg-white rounded-2xl border border-warm-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-border/60 bg-gradient-to-r from-white to-warm-bg/30 flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-indigo" />
            <span className="text-[13px] font-bold text-warm-text">Forecast Result</span>
            <span className="ml-auto text-[10px] font-mono bg-lavender/30 text-brand-indigo px-2 py-0.5 rounded-full">
              Holt-Winters · α={batchForecast.holt_winters_parameters?.alpha} β={batchForecast.holt_winters_parameters?.beta}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-warm-border/50">
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Data Range</span>
              <span className="text-[12px] font-mono font-bold text-warm-text">
                {batchForecast.data_range?.start_time} → {batchForecast.data_range?.end_time}
              </span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Target Period</span>
              <span className="text-[12px] font-mono font-bold text-brand-indigo">{batchForecast.target_time}</span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Last Known Value</span>
              <span className="text-[12px] font-mono font-bold text-warm-text">{batchForecast.last_known_value?.toLocaleString()}</span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-warm-muted uppercase tracking-wide">Forecasted Value</span>
              <span className="text-[12px] font-mono font-bold text-brand-indigo">{batchForecast.forecasted_value?.toLocaleString()}</span>
            </div>
          </div>
          <div className="px-4 py-2.5 bg-sage-light/30 border-t border-sage-border/30 flex items-center gap-3">
            <span className="text-[11px] font-semibold text-warm-muted">Predicted Growth Rate:</span>
            <span className="text-[13px] font-bold text-sage">{batchForecast.predicted_growth_rate_percentage}</span>
            <span className="text-[10px] text-warm-muted ml-auto">Holt-Winters exponential smoothing — detects trend + seasonality</span>
          </div>
        </div>
      )}

      {/* ── Compare view ─────────────────────────────────────────── */}
      {viewMode === 'compare' && (
        <WorldModelCompareView worldModels={reversed} />
      )}

      {/* ── Graph view ───────────────────────────────────────────── */}
      {viewMode !== 'compare' && viewMode === 'graph' && tree && (
        <WorldModelContributionChart tree={tree} />
      )}
      {viewMode !== 'compare' && viewMode === 'graph' && !tree && (
        <div className="flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-700 leading-relaxed">
            <strong>Contribution graph not available</strong> for this scenario — the backend did not return
            a <code className="mx-1 px-1 bg-amber-100 rounded text-[11px] font-mono">world_model_tree</code>.
            Showing dimension overview instead.
          </div>
          <div className="bg-white rounded-2xl border border-warm-border shadow-card overflow-hidden p-4">
            <WorldModelGraph worldModel={current} />
          </div>
        </div>
      )}

      {/* ── Tree view ─────────────────────────────────────────────── */}
      {viewMode !== 'compare' && viewMode === 'tree' && tree && (
        <WorldModelCanvasTree tree={tree} />
      )}
      {viewMode !== 'compare' && viewMode === 'tree' && !tree && (
        <div className="flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-700 leading-relaxed">
            <strong>Tree view not available</strong> for this scenario — the backend did not return a
            <code className="mx-1 px-1 bg-amber-100 rounded text-[11px] font-mono">world_model_tree</code>.
            Showing dimension overview instead.
          </div>
          <div className="bg-white rounded-2xl border border-warm-border shadow-card overflow-hidden p-4">
            <WorldModelGraph worldModel={current} />
          </div>
        </div>
      )}

    </div>
  );
}
