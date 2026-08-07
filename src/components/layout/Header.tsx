import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { ModelType, OptimizationEngineModel } from '../../types';
import { ChevronDown, LogOut, Menu, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function Header() {
  const { 
    screen, 
    batches, 
    activeBatchId, 
    setActiveBatch, 
    model, 
    setModel,
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    fetchBatchesFromApi,
    createBatchApi,
    switchBatchApi,
    deleteBatchApi,
  } = useStore();

  const { isLoaded, isSignedIn, user } = useUser() as { isLoaded: boolean; isSignedIn: boolean; user: any };

  React.useEffect(() => {
    if (isLoaded && fetchBatchesFromApi) {
      void fetchBatchesFromApi();
    }
  }, [isLoaded, fetchBatchesFromApi]);

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0] || { id: 'default', name: 'No Active Batch', status: 'idle' };
  
  let activeStep = 0;
  if (tab === 'blueprint') activeStep = 1;
  else if (tab === 'ecr-build' || tab === 'ecr-batch') activeStep = 2;
  else if (tab === 'ips-engine' || tab === 'workspace' || tab === 'learning') activeStep = 3;

  // Screen segmented navbar items mapped directly to browser slugs
  const screensList = [
    { path: 'conversation', label: '01 Conversation' },
    { path: 'blueprint',    label: '02 Blueprint' },
    { path: 'ecr-build',    label: '03 ECR Build' },
    { path: 'ecr-batch',    label: '04 ECR Batch' },
    { path: 'ips-engine',   label: '05 IPS Engine' },
    { path: 'workspace',    label: '06 Workspace' },
    { path: 'learning',     label: '07 Learning' }
  ];

  const [availableModels, setAvailableModels] = useState<{ value: ModelType; label: string }[]>([
    { value: 'Newton-Raphson', label: 'Newton-Raphson (Gradient Optimization)' },
    { value: 'Holt-Winters', label: 'Holt-Winters (Exponential Smoothing Forecast)' },
    { value: 'auto', label: 'Auto-Select (AI Algorithm Router)' }
  ]);

  React.useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await api.listModels();
        if (res?.data?.models && res.data.models.length > 0) {
          const mapped = res.data.models.map((m: OptimizationEngineModel) => ({
            value: (m.id === 'newton_raphson' || m.name.includes('Newton') ? 'Newton-Raphson' : m.id === 'holt_winters' || m.name.includes('Holt') ? 'Holt-Winters' : m.id === 'monte_carlo' || m.name.includes('Monte') ? 'Monte Carlo' : 'auto') as ModelType,
            label: `${m.name} (${m.type || m.use_case || 'engine'})`,
          }));

          // Ensure auto-select option exists
          if (!mapped.some((m: { value: ModelType; label: string }) => m.value === 'auto')) {
            mapped.push({ value: 'auto', label: 'Auto-Select (AI Algorithm Router)' });
          }

          setAvailableModels(mapped);
        }
      } catch (err) {
        console.warn('Backend listModels notice, using default model options:', err);
      }
    };
    void loadModels();
  }, []);

  React.useEffect(() => {
    if (!activeBatchId) return;
    const fetchBatchModel = async () => {
      try {
        const res = await api.getBatchModel(activeBatchId);
        if (res?.model_id) {
          const modelId = res.model_id;
          const mappedModel: ModelType =
            modelId === 'newton_raphson' ? 'Newton-Raphson' :
            modelId === 'holt_winters' ? 'Holt-Winters' :
            modelId === 'monte_carlo' ? 'Monte Carlo' : 'auto';
          setModel(mappedModel);
        }
      } catch (err) {
        console.warn('Backend getBatchModel notice:', err);
      }
    };
    void fetchBatchModel();
  }, [activeBatchId, setModel]);

  return (
    <header className="h-12 w-full bg-transparent px-4 flex items-center justify-between z-50 relative select-none shrink-0 font-sans">
      {/* Left: Wordmark & Batch Switcher & Model Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard/conversation')}>
          <img
            src="/logo-side.png"
            alt="Inferalytics"
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Left Sidebar Toggle */}
        {tab !== 'conversation' && (
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="p-1 rounded-lg bg-secondary hover:bg-muted text-warm-text border border-warm-border/50 cursor-pointer flex items-center justify-center shrink-0 transition-colors"
            title="Toggle sidebar navigator"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {tab !== 'conversation' && (
          <div className="hidden lg:flex items-center gap-3">
            {/* Batch Switcher */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsBatchOpen(!isBatchOpen);
                  setIsModelOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary hover:bg-muted text-[12px] font-medium text-warm-text transition-all duration-150 shadow-sm border border-warm-border/50 cursor-pointer whitespace-nowrap"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-indigo animate-pulse shrink-0"></span>
                <span className="truncate block font-mono font-medium" title={activeBatch.name}>
                  {activeBatch.name.length > 12 ? `${activeBatch.name.slice(0, 12)}..` : activeBatch.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-warm-muted shrink-0" />
              </button>

              {isBatchOpen && (
                <div className="absolute top-8 left-0 w-64 rounded-xl bg-white border border-warm-border shadow-lg p-1.5 z-50 animate-float-up">
                  <div className="px-2.5 py-1 flex items-center justify-between text-[9px] font-bold text-warm-muted uppercase tracking-wider border-b border-warm-border/40 pb-1 mb-1">
                    <span>Batches ({batches.length})</span>
                    <button
                      onClick={async () => {
                        const name = window.prompt('Enter new batch name:', `Batch ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
                        if (name && createBatchApi) {
                          await createBatchApi(name);
                          setIsBatchOpen(false);
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-brand-indigo hover:underline cursor-pointer lowercase"
                    >
                      <Plus className="h-3 w-3" />
                      new batch
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                    {batches.map(b => (
                      <div
                        key={b.id}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-[12px] flex items-center justify-between transition-colors group ${
                          b.id === activeBatchId
                            ? 'bg-peach/10 text-brand-indigo font-medium'
                            : 'hover:bg-warm-bg text-warm-text'
                        }`}
                      >
                        <button
                          onClick={async () => {
                            if (switchBatchApi) {
                              await switchBatchApi(b.id);
                            } else {
                              setActiveBatch(b.id);
                            }
                            setIsBatchOpen(false);
                          }}
                          className="flex items-center gap-2 text-left truncate flex-1 cursor-pointer"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            b.status === 'active' 
                              ? 'bg-brand-indigo' 
                              : b.status === 'archived' 
                                ? 'bg-warm-muted/30' 
                                : 'bg-warm-muted/60'
                          }`}></span>
                          <span className="truncate max-w-[150px] block">{b.name}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {b.status === 'archived' && (
                            <span className="text-[9px] bg-warm-bg px-1 rounded text-warm-muted font-mono uppercase shrink-0">
                              archived
                            </span>
                          )}
                          {batches.length > 1 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete batch "${b.name}"?`)) {
                                  if (deleteBatchApi) {
                                    await deleteBatchApi(b.id);
                                  }
                                }
                              }}
                              title="Delete Batch"
                              className="opacity-0 group-hover:opacity-100 text-warm-muted hover:text-destructive transition-all p-1 rounded cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="relative">
              <button 
                onClick={async () => {
                  const nextOpen = !isModelOpen;
                  setIsModelOpen(nextOpen);
                  setIsBatchOpen(false);

                  if (nextOpen) {
                    try {
                      const res = await api.listModels();
                      if (res?.data?.models && res.data.models.length > 0) {
                        const mapped = res.data.models.map((m: OptimizationEngineModel) => ({
                          value: (m.id === 'newton_raphson' || m.name.includes('Newton') ? 'Newton-Raphson' : m.id === 'holt_winters' || m.name.includes('Holt') ? 'Holt-Winters' : m.id === 'monte_carlo' || m.name.includes('Monte') ? 'Monte Carlo' : 'auto') as ModelType,
                          label: `${m.name} (${m.type || m.use_case || 'engine'})`,
                        }));

                        if (!mapped.some((m: { value: ModelType; label: string }) => m.value === 'auto')) {
                          mapped.push({ value: 'auto', label: 'Auto-Select (AI Algorithm Router)' });
                        }
                        setAvailableModels(mapped);
                      }
                    } catch (err) {
                      console.warn('Backend listModels fetch error:', err);
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary hover:bg-muted text-[12px] text-warm-text transition-all duration-150 shadow-sm border border-warm-border/50 cursor-pointer whitespace-nowrap"
              >
                <span className="text-[9px] font-bold bg-lavender text-brand-indigo px-1 rounded font-sans uppercase">
                  MODEL
                </span>
                <span className="font-mono font-medium">
                  {model === 'auto' ? 'auto-select' : model}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-warm-muted" />
              </button>

              {isModelOpen && (
                <div className="absolute top-8 left-0 w-64 rounded-xl bg-white border border-warm-border shadow-lg p-1.5 z-50 animate-float-up">
                  <div className="px-2.5 py-1 text-[9px] font-bold text-warm-muted uppercase tracking-wider">
                    Optimization Engine
                  </div>
                  {availableModels.map(opt => (
                    <button
                      key={opt.value}
                      onClick={async () => {
                        setModel(opt.value);
                        setIsModelOpen(false);
                        if (activeBatchId) {
                          const rawModelId =
                            opt.value === 'Newton-Raphson' ? 'newton_raphson' :
                            opt.value === 'Holt-Winters' ? 'holt_winters' :
                            opt.value === 'Monte Carlo' ? 'monte_carlo' : 'auto';
                          try {
                            await api.setBatchModel(activeBatchId, rawModelId);
                          } catch (err) {
                            console.warn('Backend setBatchModel notice:', err);
                          }
                        }
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] font-mono transition-colors cursor-pointer ${
                        opt.value === model
                          ? 'bg-lavender/30 text-brand-indigo font-semibold'
                          : 'hover:bg-warm-bg text-warm-text'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Centre: Workflow Stepper (shown when activeStep > 0, hidden below xl viewports) */}
      {activeStep > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-1.5 bg-white/70 backdrop-blur-md px-3.5 py-1 border border-warm-border rounded-full shadow-sm z-10">
          {/* Step 1: Define */}
          <button
            onClick={() => navigate('/dashboard/blueprint/general')}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          >
            <span className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm transition-colors ${
              activeStep === 1 
                ? 'bg-brand-indigo text-white shadow-sm' 
                : activeStep > 1 
                  ? 'bg-sage text-white' 
                  : 'bg-secondary text-warm-muted'
            }`}>
              {activeStep > 1 ? '✓' : '1'}
            </span>
            <span className={`text-[11.5px] font-bold transition-colors ${
              activeStep === 1 ? 'text-brand-indigo font-semibold' : activeStep > 1 ? 'text-sage' : 'text-warm-muted font-medium'
            }`}>
              Define
            </span>
          </button>

          <span className="h-px w-6 bg-warm-border" />

          {/* Step 2: Construct */}
          <button
            onClick={() => navigate('/dashboard/ecr-build/dimensions')}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          >
            <span className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm transition-colors ${
              activeStep === 2 
                ? 'bg-brand-indigo text-white shadow-sm' 
                : activeStep > 2 
                  ? 'bg-sage text-white' 
                  : 'bg-secondary text-warm-muted font-medium'
            }`}>
              {activeStep > 2 ? '✓' : '2'}
            </span>
            <span className={`text-[11.5px] font-bold transition-colors ${
              activeStep === 2 ? 'text-brand-indigo font-semibold' : activeStep > 2 ? 'text-sage font-medium' : 'text-warm-muted font-medium'
            }`}>
              Construct
            </span>
          </button>

          <span className="h-px w-6 bg-warm-border" />

          {/* Step 3: IPS Engine */}
          <button
            onClick={() => navigate('/dashboard/ips-engine')}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          >
            <span className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm transition-colors ${
              activeStep === 3 
                ? 'bg-brand-indigo text-white shadow-sm' 
                : 'bg-secondary text-warm-muted font-medium'
            }`}>
              3
            </span>
            <span className={`text-[11.5px] font-bold transition-colors ${
              activeStep === 3 ? 'text-brand-indigo font-semibold' : 'text-warm-muted font-medium'
            }`}>
              IPS Engine
            </span>
          </button>
        </div>
      )}

      {/* Right: Screen Navigation & Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Right Sidebar Toggle */}
        {tab !== 'conversation' && (
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="lg:hidden p-1 rounded-lg bg-secondary hover:bg-muted text-warm-text border border-warm-border/50 cursor-pointer flex items-center justify-center shrink-0"
            title="Toggle decision panel"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}

        {/* Segmented Control */}
        {tab !== 'conversation' && (
          <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 rounded-full border border-warm-border/40 overflow-x-auto max-w-[150px] sm:max-w-[280px] md:max-w-[420px] lg:max-w-none no-scrollbar whitespace-nowrap">
            {screensList.map(s => (
              <button
                key={s.path}
                onClick={() => navigate(`/dashboard/${s.path}${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
                className={`px-2 sm:px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer shrink-0 ${
                  tab === s.path
                    ? 'bg-white text-brand-indigo shadow-sm font-semibold'
                    : 'text-warm-muted hover:text-warm-text hover:bg-white/40'
                }`}
              >
                <span className="sm:hidden">{s.label.split(' ')[0]}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* User Button / Avatar */}
        <div className="h-7 w-7 rounded-full flex items-center justify-center relative shadow-sm border border-warm-border shrink-0">
          {isLoaded && isSignedIn ? (
            <UserButton afterSignOutUrl="/" appearance={{
              elements: {
                userButtonAvatarBox: "h-7 w-7",
                userButtonTrigger: "h-7 w-7 focus:shadow-none"
              }
            }} />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center cursor-pointer group">
              <span className="text-[10px] font-bold text-white font-sans">
                {(user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '')}
              </span>
              <div className="absolute top-9 right-0 hidden group-hover:block bg-white border border-warm-border shadow-lg p-1.5 rounded-xl w-36 animate-float-up z-50">
                <div className="px-2 py-1 border-b border-warm-border mb-1">
                  <div className="text-[10px] font-bold text-warm-text truncate">
                    {user?.fullName || user?.firstName || 'User Account'}
                  </div>
                  <div className="text-[9px] text-warm-muted truncate">
                    {user?.primaryEmailAddress?.emailAddress || 'user@inferalytics.com'}
                  </div>
                </div>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full text-left px-2 py-1 text-red hover:bg-destructive/10 rounded-md text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
