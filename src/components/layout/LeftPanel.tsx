import React from 'react';
import { useStore } from '../../store/useStore';
import { FolderUp, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LeftPanel() {
  const { screen, batches, activeBatchId, setActiveBatch } = useStore();
  const navigate = useNavigate();

  const handleNewBatch = () => {
    alert("Creating new optimization batch. (Mocked)");
  };

  const handleUploadClick = () => {
    if (screen === 1) {
      navigate('/dashboard/setup');
    } else if (screen === 2) {
      navigate('/dashboard/build');
    } else if (screen === 3) {
      navigate('/dashboard/batch');
    }
  };

  return (
    <aside className="w-[240px] h-[calc(100vh-48px)] bg-white/40 backdrop-blur-md border-r border-warm-border/50 flex flex-col justify-between p-4 select-none isolate shrink-0 font-sans">
      <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar">
        {/* Batches Navigation */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.08em] select-none">
            Batches
          </span>
          <div className="flex flex-col gap-1">
            {batches.map((b) => {
              const isActive = b.id === activeBatchId;
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBatch(b.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[12px] flex items-center justify-between transition-all duration-200 border cursor-pointer ${
                    isActive
                      ? 'bg-lavender/10 border-lavender text-brand-indigo font-semibold shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-muted text-warm-text hover:border-warm-border/50'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        b.status === 'active'
                          ? 'bg-brand-indigo animate-pulse'
                          : b.status === 'archived'
                          ? 'bg-warm-muted/30'
                          : 'bg-warm-muted/70'
                      }`}
                    />
                    <span className="truncate">{b.name}</span>
                  </span>
                  {b.status === 'archived' ? (
                    <span className="text-[9px] bg-secondary px-1 py-0.5 rounded text-warm-muted font-mono uppercase scale-90">
                      arc
                    </span>
                  ) : isActive ? (
                    <Check className="h-3 w-3 text-brand-indigo" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNewBatch}
            className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-warm-border hover:border-warm-border-strong hover:bg-muted text-warm-muted hover:text-warm-text rounded-xl text-[12px] font-medium transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Batch
          </button>
        </div>

        <hr className="border-warm-border/40" />

        {/* Upload Zone */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.08em] select-none">
            Upload Data
          </span>

          <div
            onClick={handleUploadClick}
            className="border-2 border-dashed border-warm-border hover:border-brand-indigo/60 hover:bg-lavender/5 p-4 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all duration-200"
          >
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center border border-warm-border/50">
              <FolderUp className="h-4 w-4 text-warm-muted" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11.5px] font-semibold text-warm-text">
                Drop CSV / XLSX / JSON
              </span>
              <span className="text-[9px] text-warm-muted font-mono font-medium tracking-tight">
                or click to browse
              </span>
            </div>
          </div>

          {/* Conditional upload progress card (shown on screen 4 Batch) */}
          {screen === 4 && (
            <div className="bg-white border border-warm-border p-3 rounded-xl shadow-sm animate-float-up">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-semibold font-mono text-warm-text truncate max-w-[120px]">
                  q2_revenue_raw.xlsx
                </span>
                <span className="text-[9px] font-bold bg-lavender/40 text-brand-indigo px-1 py-0.5 rounded font-mono">
                  78%
                </span>
              </div>
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mb-1.5 border border-warm-border/30">
                <div
                  className="bg-gradient-to-r from-peach to-brand-indigo h-full rounded-full transition-all duration-500"
                  style={{ width: '78%' }}
                />
              </div>
              <span className="text-[9px] text-warm-muted font-mono block">
                Vectorising 14 / 18 fields...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Brand Watermark / Footer info */}
      <div className="flex flex-col gap-1 border-t border-warm-border/40 pt-3">
        <span className="text-[10px] text-warm-muted font-mono">
          Inferalytics Wireframe
        </span>
        <span className="text-[9px] text-warm-muted/60">
          Powered by Newton-Raphson Engine
        </span>
      </div>
    </aside>
  );
}
