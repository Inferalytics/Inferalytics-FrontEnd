import React from 'react';
import { Check } from 'lucide-react';
import type { PipelinePhase } from '../../../types';

// Mirrors the backend pipeline order:
// dataset design → real data → vectorise + aggregate → user settings → Newton-Raphson → world model
const STEPS: { phase: Exclude<PipelinePhase, 'idle'>; label: string }[] = [
  { phase: 'design',    label: 'Design' },
  { phase: 'data',      label: 'Real data' },
  { phase: 'prepare',   label: 'Prepare' },
  { phase: 'configure', label: 'Configure' },
  { phase: 'optimise',  label: 'Optimise' },
  { phase: 'result',    label: 'World Model' },
];

export default function PipelineStepper({ phase }: { phase: PipelinePhase }) {
  if (phase === 'idle') return null;
  const current = STEPS.findIndex(s => s.phase === phase);

  return (
    <ol className="flex items-center gap-1 flex-wrap animate-fade-in" aria-label="Pipeline progress">
      {STEPS.map((step, i) => {
        const done = i < current || phase === 'result';
        const active = i === current && phase !== 'result';
        return (
          <li key={step.phase} className="flex items-center gap-1">
            <span
              aria-current={active ? 'step' : undefined}
              className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[10.5px] font-semibold border transition-all ${
                active
                  ? 'bg-[#FF5A1F] text-white border-[#FF5A1F] shadow-xs'
                  : done
                  ? 'bg-[#EBF4E8] text-[#2C6E25] border-[#C8E4C0]'
                  : 'bg-white text-warm-muted border-[#E5E1D8]'
              }`}
            >
              {done ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className={`font-mono text-[9.5px] ${active ? 'text-white/80' : 'text-warm-muted/60'}`}>{i + 1}</span>
              )}
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={`h-px w-3 ${i < current ? 'bg-[#C8E4C0]' : 'bg-[#E5E1D8]'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
