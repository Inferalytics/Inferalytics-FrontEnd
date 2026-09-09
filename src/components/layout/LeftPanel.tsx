import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Plus, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LeftPanel() {
  const { screen, batches, activeBatchId, setActiveBatch, leftSidebarOpen, dimensions, toggleDimensionToBatcher, setup, scenarios, createBatchApi } = useStore();
  const navigate = useNavigate();
  const [expandedEcrAsset, setExpandedEcrAsset] = useState<string | null>(null);
  const [ecrAssetsSectionExpanded, setEcrAssetsSectionExpanded] = useState(true);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  const ecrAssets: { id: string; name: string; desc: string; details: string }[] = [
    ...(setup.sources.length > 0 ? [{
      id: 'model',
      name: 'Data Model',
      desc: 'Underlying uploaded files',
      details: setup.sources.map(s => `${s.name} (${s.fields} fields, ${s.rows.toLocaleString()} rows)`).join('; '),
    }] : []),
    ...(scenarios.length > 0 ? [{
      id: 'sim_history',
      name: 'Simulation History',
      desc: 'Scenario runs for this batch',
      details: scenarios.map(s => `${s.label}: revenue ${s.revenue}, EGR ${s.egr}`).join('; '),
    }] : []),
  ];

  const handleNewBatch = async () => {
    const defaultName = `Batch ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const batchName = window.prompt('Enter name for the new batch:', defaultName);
    if (!batchName) return;

    try {
      setIsCreatingBatch(true);
      if (createBatchApi) {
        await createBatchApi(batchName);
      }
    } catch (err) {
      console.error('Failed to create batch:', err);
    } finally {
      setIsCreatingBatch(false);
    }
  };

  return (
    <aside className={`fixed lg:relative top-13 lg:top-0 left-0 z-40 h-full bg-white lg:bg-white/40 backdrop-blur-md flex flex-col justify-between select-none isolate shrink-0 font-sans transition-all duration-300 ease-in-out ${
      leftSidebarOpen
        ? 'w-[240px] p-4 border-r border-warm-border/50 translate-x-0 opacity-100'
        : 'w-0 p-0 border-r-0 -translate-x-full opacity-0 overflow-hidden'
    }`}>
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
            disabled={isCreatingBatch}
            className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-warm-border hover:border-warm-border-strong hover:bg-muted text-warm-muted hover:text-warm-text rounded-xl text-[12px] font-medium transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {isCreatingBatch ? 'Creating…' : 'New Batch'}
          </button>
        </div>

        <hr className="border-warm-border/40" />

        {/* Batcher section (Screen 4 only or visible when there are batches) */}
        {screen === 4 && (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.08em] select-none">
              Batcher ({dimensions.filter(d => d.selected).length})
            </span>
            <div className="flex flex-col gap-2">
              {dimensions.filter(d => d.selected).length === 0 ? (
                <div className="text-[10.5px] text-warm-muted italic p-3 border border-dashed border-warm-border rounded-xl text-center">
                  Batcher is empty.
                </div>
              ) : (
                dimensions.filter(d => d.selected).map(d => (
                  <div key={d.id} className="bg-white border border-brand-indigo ring-1 ring-brand-indigo/20 shadow-sm rounded-xl p-2.5 relative flex flex-col gap-1.5 transition-all duration-200">
                     <div className="flex justify-between items-start">
                       <span className="text-[11px] font-bold text-warm-text">{d.name}</span>
                       <button onClick={() => toggleDimensionToBatcher(d.id)} className="text-warm-muted hover:text-destructive transition-colors mt-0.5">
                          <X className="h-3.5 w-3.5" />
                       </button>
                     </div>
                     <span className={`w-fit text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                       d.type === 'numeric'     ? 'bg-lavender/30 text-brand-indigo' :
                       d.type === 'categorical' ? 'bg-amber-warm-light text-amber-warm' :
                                                 'bg-sage-light text-sage'
                     }`}>{d.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ECR World Model Assets (Screen 4 only) */}
        {screen === 4 && (
          <div className="flex flex-col gap-3 font-sans">
            <div 
              className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setEcrAssetsSectionExpanded(!ecrAssetsSectionExpanded)}
            >
              <div className="flex items-center gap-1">
                {ecrAssetsSectionExpanded ? <ChevronDown className="h-3.5 w-3.5 text-warm-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-warm-muted" />}
                <span className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.08em] select-none">
                  ECR Assets
                </span>
              </div>
              <span className="text-[8.5px] font-mono text-brand-indigo bg-lavender/30 px-2 py-0.5 rounded-full font-bold">{ecrAssets.length} active</span>
            </div>

            {ecrAssetsSectionExpanded && (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 -mr-1">
                {ecrAssets.length === 0 && (
                  <div className="text-[10.5px] text-warm-muted italic p-3 border border-dashed border-warm-border rounded-xl text-center">
                    No ECR assets yet. Upload data to populate the Data Model.
                  </div>
                )}
                {ecrAssets.map((asset) => {
                  const isExpanded = expandedEcrAsset === asset.id;
                  return (
                    <div key={asset.id} className="flex flex-col border border-warm-border/50 rounded-xl bg-white overflow-hidden transition-all duration-200 shrink-0 shadow-sm">
                      <div
                        onClick={() => setExpandedEcrAsset(isExpanded ? null : asset.id)}
                        className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-[11px] font-bold text-warm-text truncate">{asset.name}</span>
                          <span className="text-[9px] text-warm-muted truncate leading-none mt-0.5">{asset.desc}</span>
                        </div>
                        <span className="text-[9px] text-brand-indigo font-semibold shrink-0 select-none">
                          {isExpanded ? 'Hide' : 'Inspect'}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="p-2.5 border-t border-warm-border/40 bg-warm-bg/10 text-[10.5px] text-warm-muted leading-relaxed font-sans">
                          {asset.details}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
