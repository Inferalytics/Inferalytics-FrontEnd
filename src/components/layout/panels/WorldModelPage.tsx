import React, { useState } from 'react';
import { Layers, TrendingUp, GitBranch, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import WorldModelGraph from '../../chat/WorldModelGraph';
import WorldModelTree from '../../chat/WorldModelTree';
import WorldModelContributionChart from '../../chat/WorldModelContributionChart';

type ViewMode = 'graph' | 'tree';

export default function WorldModelPage() {
  const { worldModels } = useStore();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');

  const reversed   = [...worldModels].reverse();
  const totalCount = reversed.length;

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center">
          <Layers className="h-7 w-7 text-brand-indigo/40" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-warm-text mb-1">No World Models Yet</h2>
          <p className="text-[13px] text-warm-muted max-w-sm leading-relaxed">
            Run an optimisation or forecast in the IPS Engine. The AI will build a semantic
            tree showing exactly which data points drove the EGR growth.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-indigo/5 border border-brand-indigo/15 text-[12px] text-brand-indigo font-medium">
          <TrendingUp className="h-4 w-4" />
          Go to IPS Engine → Run Optimisation
        </div>
      </div>
    );
  }

  const current = reversed[selectedIdx] ?? reversed[0];
  const tree    = current.world_model_tree ?? null;

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">

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
                viewMode === 'graph'
                  ? 'bg-white text-brand-indigo shadow-sm'
                  : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Graph
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-white text-brand-indigo shadow-sm'
                  : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Tree
            </button>
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

      {/* ── Content ─────────────────────────────────────────────── */}

      {/* Graph view — contribution drill-down chart */}
      {viewMode === 'graph' && tree && (
        <WorldModelContributionChart tree={tree} />
      )}
      {viewMode === 'graph' && !tree && (
        /* No world_model_tree — fall back to dimension card graph */
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

      {/* Tree view — semantic hierarchy */}
      {viewMode === 'tree' && tree && (
        <WorldModelTree tree={tree} />
      )}
      {viewMode === 'tree' && !tree && (
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
