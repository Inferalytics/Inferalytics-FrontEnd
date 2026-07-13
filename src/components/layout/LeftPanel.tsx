import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FolderUp, Plus, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ECR_ASSETS = [
  { id: 'ontology', name: 'Decision Ontology', desc: 'Ontological tags & vocabulary', details: 'Core entity definitions: Quarter (temporal dimension), Revenue (financial outcome target), Region (geographic dimension), and Product Line (segmentation factor). Mapped to enterprise schema.' },
  { id: 'network', name: 'Relationship Network', desc: 'Active node connectivity map', details: 'Defined links: Quarter ➔ Revenue (time series), Region ↔ Revenue (geographic correlation), Product Line ➔ Cost Centre (allocation rule), Cost Centre ↔ Gross Margin (derived ratio).' },
  { id: 'rules', name: 'Business Rules', desc: 'System constraints & bounds', details: 'Hard Constraints: Customer renewal churn must remain ≤ 6.0% post price adjustments. Soft Constraints: Cost centre budget variance must not exceed ±10%.' },
  { id: 'model', name: 'Data Model', desc: 'Underlying spreadsheet files', details: 'Spreadsheets linked: q2_revenue_raw.xlsx (18 fields, 4,210 rows), cost_centre_2024.csv (9 fields, 1,802 rows), and region_mapping.json (6 fields, 142 rows).' },
  { id: 'history', name: 'Decision History', desc: 'Past strategic outcomes', details: 'Reference cohort: 5% uniform price increase executed 18 months ago. Results: 3.8% peak churn, +4.2% net ARR change. Used as model priors.' },
  { id: 'sim_history', name: 'Simulation History', desc: 'Active scenarios configurations', details: 'Configured projections: Scenario A (Baseline 8% YoY revenue growth), Scenario B (Optimised Newton-Raphson 18% uplift + 6% Cost Centre reduction).' },
  { id: 'expert', name: 'Expert Knowledge', desc: 'Human-anchored constraints', details: 'Static anchors: Region multipliers and Gross Margin ratios pinned to static Q3 parameters based on CFO directives.' },
  { id: 'confidence', name: 'Confidence Scores', desc: 'AI confidence ratings', details: 'Confidence indices: Ontology parsing (98%), Relationship correlation (92%), Churn predictive fit (94%). Composite ECR confidence score: 94.6%.' },
  { id: 'behavior', name: 'Learned Behaviors', desc: 'Elasticities & agent curves', details: 'Segment parameters: Calculated Enterprise price elasticity coefficient of -1.45. Churn curve escalates exponentially when price change exceeds 10%.' },
  { id: 'causal', name: 'Causal Relationships', desc: 'Optimisation impact paths', details: 'Causality stream: Strategic Price uplift % ➔ Segment Renewal Churn ➔ Operating Margin expansion ➔ Net EGR Achieved.' }
];

export default function LeftPanel() {
  const { screen, batches, activeBatchId, setActiveBatch, leftSidebarOpen, dimensions, toggleDimensionToBatcher } = useStore();
  const navigate = useNavigate();
  const [expandedEcrAsset, setExpandedEcrAsset] = useState<string | null>(null);
  const [ecrAssetsSectionExpanded, setEcrAssetsSectionExpanded] = useState(true);

  const handleNewBatch = () => {
    alert("Creating new optimization batch. (Mocked)");
  };

  const handleUploadClick = () => {
    if (screen === 1) {
      navigate('/dashboard/blueprint');
    } else if (screen === 2) {
      navigate('/dashboard/ecr-build');
    } else if (screen === 3) {
      navigate('/dashboard/ecr-batch');
    }
  };

  return (
    <aside className={`fixed lg:relative top-12 lg:top-0 left-0 z-40 h-[calc(100vh-48px)] bg-white lg:bg-white/40 backdrop-blur-md flex flex-col justify-between select-none isolate shrink-0 font-sans transition-all duration-300 ease-in-out ${
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
            className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-warm-border hover:border-warm-border-strong hover:bg-muted text-warm-muted hover:text-warm-text rounded-xl text-[12px] font-medium transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Batch
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
              <span className="text-[8.5px] font-mono text-brand-indigo bg-lavender/30 px-2 py-0.5 rounded-full font-bold">10 active</span>
            </div>
            
            {ecrAssetsSectionExpanded && (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 -mr-1">
                {ECR_ASSETS.map((asset) => {
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

        {screen === 4 && <hr className="border-warm-border/40" />}

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
