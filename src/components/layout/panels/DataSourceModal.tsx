import React from 'react';
import { Upload, Globe } from 'lucide-react';

interface DataSourceModalProps {
  onYes: () => void;
  onNo: () => void;
}

export default function DataSourceModal({ onYes, onNo }: DataSourceModalProps) {
  return (
    /* ── Blocking overlay — pointer-events on backdrop intentionally omitted so user MUST click a button ── */
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Frosted backdrop */}
      <div className="absolute inset-0 bg-[#1A1918]/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-[#E5E1D8] overflow-hidden animate-float-up">

        {/* Header strip */}
        <div className="bg-[#FFF2EE] border-b border-[#FFD4C5] px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white border border-[#FFD4C5] flex items-center justify-center shadow-xs shrink-0">
            <Upload className="h-5 w-5 text-[#FF5A1F]" />
          </div>
          <div>
            <p className="text-[11px] font-mono font-bold text-[#FF5A1F] uppercase tracking-widest">
              Data Source Selection
            </p>
            <h2 className="text-[15px] font-bold text-warm-text leading-snug">
              Do you want to upload your own data file?
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-[13px] text-warm-muted leading-relaxed">
            Web benchmarks have been collected. Choose how to build your World Model — your own data will be combined with the benchmarks for the most accurate results.
          </p>

          {/* Option buttons */}
          <div className="flex flex-col gap-2.5">
            {/* Yes */}
            <button
              onClick={onYes}
              className="group w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[#FF5A1F] bg-[#FFF2EE] hover:bg-[#FF5A1F] transition-all cursor-pointer"
            >
              <div className="h-10 w-10 rounded-lg bg-[#FF5A1F] group-hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <span className="block text-[13px] font-bold text-[#FF5A1F] group-hover:text-white transition-colors">
                  Yes — Upload my data file
                </span>
                <span className="block text-[11.5px] text-warm-muted group-hover:text-white/80 transition-colors">
                  CSV, Excel, or JSON · combined with web benchmarks
                </span>
              </div>
            </button>

            {/* No */}
            <button
              onClick={onNo}
              className="group w-full flex items-center gap-4 p-4 rounded-xl border border-[#E5E1D8] bg-[#FAF9F7] hover:bg-[#F2EFE9] hover:border-warm-border transition-all cursor-pointer"
            >
              <div className="h-10 w-10 rounded-lg bg-[#E5E1D8] group-hover:bg-warm-border flex items-center justify-center shrink-0 transition-colors">
                <Globe className="h-5 w-5 text-warm-muted" />
              </div>
              <div className="text-left">
                <span className="block text-[13px] font-bold text-warm-text">
                  No — Use web benchmarks only
                </span>
                <span className="block text-[11.5px] text-warm-muted">
                  Build from collected industry data · no upload needed
                </span>
              </div>
            </button>
          </div>

          <p className="text-[10.5px] text-warm-muted/60 font-mono text-center">
            This selection is required before the World Model can be built.
          </p>
        </div>
      </div>
    </div>
  );
}
