import React from 'react';
import { SlidersHorizontal, Lock, Loader2, Sparkles } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import type { GrowthStrategy, OptimizationSettings } from '../../../types/api';

// Same bounds the backend enforces (EGR_MIN_VALUE / EGR_MAX_VALUE: 0.5 – 3.0)
const MIN_PCT = -50;
const MAX_PCT = 200;

const STRATEGIES: { value: GrowthStrategy; label: string; hint: string }[] = [
  { value: 'balanced',     label: 'Balanced',     hint: 'Spread growth evenly across all items' },
  { value: 'leader_led',   label: 'Leader-led',   hint: 'Top performers drive the growth' },
  { value: 'catch_up',     label: 'Catch-up',     hint: 'Lagging items catch up' },
  { value: 'front_loaded', label: 'Front-loaded', hint: 'Growth concentrated in early periods' },
  { value: 'back_loaded',  label: 'Back-loaded',  hint: 'Growth concentrated in later periods' },
];

/** Event LeftPanel listens for to submit the Configure step through the agent. */
export const BUILD_WORLD_MODEL_EVENT = 'advisor-build-world-model';

export default function ConfigureBar() {
  const { configureStep, updateConfigureStep } = useStore();
  if (!configureStep) return null;

  const { items, locked, egrPct, strategy, submitting } = configureStep;
  const pctValid = Number.isFinite(egrPct) && egrPct >= MIN_PCT && egrPct <= MAX_PCT;
  const allLocked = items.length > 0 && locked.length >= items.length;
  const canBuild = pctValid && !allLocked && !submitting;

  const handleBuild = () => {
    if (!canBuild) return;
    const settings: OptimizationSettings = {
      egr_value: Number((1 + egrPct / 100).toFixed(6)),
      growth_strategy: strategy,
      locked_labels: locked,
    };
    updateConfigureStep({ submitting: true });
    window.dispatchEvent(new CustomEvent(BUILD_WORLD_MODEL_EVENT, { detail: settings }));
  };

  return (
    <div className="shrink-0 px-4 py-3 border-b border-[#FFD4C5] bg-[#FFF8F4] flex flex-col gap-2.5 animate-float-up">
      <div className="flex items-center gap-2 min-w-0">
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-md border text-[#FF5A1F] bg-[#FFF2EE] border-[#FFD4C5]/80 shrink-0">
          <SlidersHorizontal className="h-3 w-3" />
          Configure
        </span>
        <span className="text-[11.5px] text-warm-muted truncate">
          Click <Lock className="inline h-3 w-3 -mt-0.5 text-[#B45309]" /> on any row that must not change, set your target, then build.
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Growth target */}
        <label className="flex items-center gap-2 text-[11px] font-semibold text-warm-text">
          <span className="text-[10px] font-bold text-warm-muted/80 uppercase tracking-wider font-mono">Growth target</span>
          <span className={`flex items-center h-8 rounded-lg border bg-white overflow-hidden transition-colors ${
            pctValid ? 'border-[#E5E1D8] focus-within:border-[#FF5A1F]' : 'border-[#FCA5A5]'
          }`}>
            <input
              type="number"
              step="0.5"
              min={MIN_PCT}
              max={MAX_PCT}
              value={Number.isFinite(egrPct) ? egrPct : ''}
              disabled={submitting}
              onChange={(e) => updateConfigureStep({ egrPct: e.target.value === '' ? NaN : Number(e.target.value) })}
              className="w-16 h-full px-2.5 text-[12px] font-mono font-bold text-warm-text text-right focus:outline-none disabled:opacity-60"
            />
            <span className="px-2 h-full flex items-center text-[11px] font-mono text-warm-muted bg-[#FAF9F7] border-l border-[#E5E1D8]">%</span>
          </span>
        </label>

        {/* Strategy */}
        <label className="flex items-center gap-2 text-[11px] font-semibold text-warm-text">
          <span className="text-[10px] font-bold text-warm-muted/80 uppercase tracking-wider font-mono">Strategy</span>
          <select
            value={strategy}
            disabled={submitting}
            onChange={(e) => updateConfigureStep({ strategy: e.target.value as GrowthStrategy })}
            title={STRATEGIES.find(s => s.value === strategy)?.hint}
            className="h-8 px-2.5 rounded-lg border border-[#E5E1D8] bg-white text-[11.5px] font-semibold text-warm-text focus:outline-none focus:border-[#FF5A1F] cursor-pointer disabled:opacity-60"
          >
            {STRATEGIES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        {/* Locked count */}
        <span className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-semibold ${
          locked.length > 0 ? 'bg-[#FFEFD6] border-[#F5C77E] text-[#92400E]' : 'bg-white border-[#E5E1D8] text-warm-muted'
        }`}>
          <Lock className="h-3 w-3" />
          {locked.length} of {items.length} locked
          {locked.length > 0 && !submitting && (
            <button
              type="button"
              onClick={() => updateConfigureStep({ locked: [] })}
              className="ml-1 text-[10.5px] underline underline-offset-2 hover:text-[#FF5A1F] cursor-pointer"
            >
              Clear
            </button>
          )}
        </span>

        <div className="flex-1" />

        {(allLocked || !pctValid) && (
          <span className="text-[11px] text-[#DC2626] font-medium">
            {allLocked ? 'Unlock at least one row to optimize.' : `Target must be between ${MIN_PCT}% and +${MAX_PCT}%.`}
          </span>
        )}

        <button
          type="button"
          onClick={handleBuild}
          disabled={!canBuild}
          className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#FF5A1F] hover:bg-[#E54E17] text-white text-[11.5px] font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span>{submitting ? 'Optimizing…' : 'Build world model'}</span>
        </button>
      </div>
    </div>
  );
}
