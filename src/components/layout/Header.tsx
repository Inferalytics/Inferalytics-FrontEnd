import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import type { ModelType, OptimizationEngineModel } from '../../types';
import { ChevronDown, LogOut, Menu, MessageSquare, Plus, Trash2, Check, FolderKanban, Cpu, Sparkles } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function Header() {
  const { 
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

  useEffect(() => {
    if (fetchBatchesFromApi && isLoaded) {
      void fetchBatchesFromApi();
    }
  }, [isLoaded, fetchBatchesFromApi]);

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const batchMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (batchMenuRef.current && !batchMenuRef.current.contains(e.target as Node)) {
        setIsBatchOpen(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0] || { id: 'default', name: 'Main Workspace', status: 'active' };

  // Streamlined 3-screen navigation items
  const screensList = [
    { path: 'conversation', num: '01', label: 'Conversation' },
    { path: 'dimensions',   num: '02', label: 'Dimensions' },
    { path: 'scenarios',    num: '03', label: 'Scenarios' },
  ];

  const [availableModels, setAvailableModels] = useState<{ value: ModelType; label: string; desc: string }[]>([
    { value: 'Newton-Raphson', label: 'Newton-Raphson', desc: 'Gradient Optimization Engine' },
    { value: 'Holt-Winters',   label: 'Holt-Winters',   desc: 'Exponential Time-Series Smoothing' },
    { value: 'auto',           label: 'Auto-Select',    desc: 'AI Algorithm Router (Dynamic)' }
  ]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await api.listModels();
        if (res?.data?.models && res.data.models.length > 0) {
          const mapped = res.data.models.map((m: OptimizationEngineModel) => ({
            value: (m.id === 'newton_raphson' || m.name.includes('Newton') ? 'Newton-Raphson' : m.id === 'holt_winters' || m.name.includes('Holt') ? 'Holt-Winters' : m.id === 'monte_carlo' || m.name.includes('Monte') ? 'Monte Carlo' : 'auto') as ModelType,
            label: m.name.split('(')[0].trim(),
            desc: m.type || m.use_case || 'Optimization Engine',
          }));

          if (!mapped.some((m: { value: ModelType; label: string; desc: string }) => m.value === 'auto')) {
            mapped.push({ value: 'auto', label: 'Auto-Select', desc: 'AI Algorithm Router (Dynamic)' });
          }

          setAvailableModels(mapped);
        }
      } catch (err) {
        console.warn('Backend listModels notice, using default model options:', err);
      }
    };
    void loadModels();
  }, []);

  useEffect(() => {
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

  const currentTab = (!tab || tab === 'conversation') 
    ? 'conversation' 
    : (tab === 'dimensions' || tab === 'blueprint' || tab === 'ecr-build' || tab === 'ecr-batch') 
      ? 'dimensions' 
      : 'scenarios';

  return (
    <header className="h-13 w-full bg-white border-b border-warm-border px-4 sm:px-6 flex items-center justify-between z-50 relative select-none shrink-0 font-sans shadow-2xs">
      
      {/* ── Left: Brand Wordmark & Top Dropdowns ── */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Logo */}
        <div 
          onClick={() => navigate('/dashboard/conversation')}
          className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-85 shrink-0"
          title="Inferalytics Home"
        >
          <img
            src="/logo-side.png"
            alt="Inferalytics"
            className="h-7 sm:h-8 w-auto object-contain"
          />
        </div>

        {/* Vertical divider */}
        <span className="hidden sm:block h-5 w-px bg-warm-border/60" />

        {/* Left Sidebar Toggle (Only for Dimensions/Scenarios on small screens) */}
        {tab && tab !== 'conversation' && (
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="p-1.5 rounded-xl bg-warm-bg hover:bg-muted text-warm-text border border-warm-border/50 cursor-pointer flex items-center justify-center shrink-0 transition-colors"
            title="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Batch / Workspace Switcher Dropdown */}
        <div className="relative" ref={batchMenuRef}>
          <button 
            onClick={() => {
              setIsBatchOpen(!isBatchOpen);
              setIsModelOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-warm-bg text-[12px] font-medium text-warm-text transition-all duration-150 shadow-2xs border border-warm-border cursor-pointer whitespace-nowrap"
          >
            <FolderKanban className="h-3.5 w-3.5 text-[#FF5A1F] shrink-0" />
            <span className="truncate block font-sans font-semibold max-w-[110px] sm:max-w-[150px]" title={activeBatch.name}>
              {activeBatch.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-warm-muted shrink-0" />
          </button>

          {isBatchOpen && (
            <div className="absolute top-10 left-0 w-72 rounded-2xl bg-white border border-warm-border shadow-float p-2 z-50 animate-float-up font-sans">
              <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-warm-muted uppercase tracking-wider border-b border-warm-border/50 pb-1.5 mb-1.5">
                <span>Workspaces ({batches.length})</span>
                <button
                  onClick={async () => {
                    const name = window.prompt('Enter new workspace name:', `Workspace ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
                    if (name && createBatchApi) {
                      const newId = await createBatchApi(name);
                      setIsBatchOpen(false);
                      navigate(`/dashboard/conversation?batch=${newId}`);
                    }
                  }}
                  className="flex items-center gap-1 text-[10.5px] font-bold text-[#FF5A1F] hover:underline cursor-pointer lowercase"
                >
                  <Plus className="h-3 w-3" />
                  new workspace
                </button>
              </div>

              <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                {batches.map(b => {
                  const isCurrent = b.id === activeBatchId;
                  return (
                    <div
                      key={b.id}
                      className={`w-full px-2.5 py-2 rounded-xl text-[12px] flex items-center justify-between transition-colors group ${
                        isCurrent
                          ? 'bg-[#FFF2EE] text-[#FF5A1F] font-semibold border border-[#FFD4C5]'
                          : 'hover:bg-[#FAF9F7] text-warm-text border border-transparent'
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
                          navigate(`/dashboard/conversation?batch=${b.id}`);
                        }}
                        className="flex items-center gap-2 text-left truncate flex-1 cursor-pointer"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          isCurrent 
                            ? 'bg-[#FF5A1F] animate-pulse' 
                            : 'bg-warm-muted/40'
                        }`} />
                        <span className="truncate max-w-[170px] block">{b.name}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {isCurrent && <Check className="h-3.5 w-3.5 text-[#FF5A1F] shrink-0" />}
                        {batches.length > 1 && !isCurrent && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete workspace "${b.name}"?`)) {
                                if (deleteBatchApi) {
                                  await deleteBatchApi(b.id);
                                }
                              }
                            }}
                            title="Delete Workspace"
                            className="opacity-0 group-hover:opacity-100 text-warm-muted hover:text-destructive transition-all p-1 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Model Selector Dropdown */}
        <div className="relative hidden md:block" ref={modelMenuRef}>
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
                      label: m.name.split('(')[0].trim(),
                      desc: m.type || m.use_case || 'Optimization Engine',
                    }));

                    if (!mapped.some((m: { value: ModelType; label: string; desc: string }) => m.value === 'auto')) {
                      mapped.push({ value: 'auto', label: 'Auto-Select', desc: 'AI Algorithm Router (Dynamic)' });
                    }
                    setAvailableModels(mapped);
                  }
                } catch (err) {
                  console.warn('Backend listModels fetch error:', err);
                }
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-warm-bg text-[12px] text-warm-text transition-all duration-150 shadow-2xs border border-warm-border cursor-pointer whitespace-nowrap"
          >
            <Cpu className="h-3.5 w-3.5 text-brand-indigo shrink-0" />
            <span className="text-[9.5px] font-bold bg-[#EAE8F7] text-brand-indigo px-1.5 py-0.5 rounded-md font-mono uppercase">
              ENGINE
            </span>
            <span className="font-sans font-medium">
              {model === 'auto' ? 'Auto-Select' : model}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-warm-muted shrink-0" />
          </button>

          {isModelOpen && (
            <div className="absolute top-10 left-0 w-72 rounded-2xl bg-white border border-warm-border shadow-float p-2 z-50 animate-float-up font-sans">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-warm-muted uppercase tracking-wider border-b border-warm-border/50 pb-1.5 mb-1">
                Optimization Engine
              </div>
              <div className="flex flex-col gap-1">
                {availableModels.map(opt => {
                  const isSelected = opt.value === model;
                  return (
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
                      className={`w-full text-left px-3 py-2 rounded-xl text-[12px] transition-all cursor-pointer flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-lavender/30 text-brand-indigo font-bold border border-lavender/50'
                          : 'hover:bg-[#FAF9F7] text-warm-text border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{opt.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand-indigo shrink-0" />}
                      </div>
                      <span className="text-[10px] text-warm-muted font-normal">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Centre: 3-Screen Segmented Pill Switcher (Zero Overlap) ── */}
      <nav className="flex items-center gap-1 bg-[#F0ECE6]/80 p-1 rounded-full border border-warm-border/70 shadow-inner">
        {screensList.map(s => {
          const isActive = currentTab === s.path;
          return (
            <button
              key={s.path}
              onClick={() => navigate(`/dashboard/${s.path}${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-[12px] transition-all duration-200 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white text-warm-text shadow-sm font-bold border border-warm-border/50'
                  : 'text-warm-muted hover:text-warm-text hover:bg-white/50 font-medium'
              }`}
            >
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                isActive ? 'bg-[#FFF2EE] text-[#FF5A1F] font-bold' : 'text-warm-muted/70'
              }`}>
                {s.num}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Right: User Profile & Quick Actions ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Mobile Right Sidebar Toggle for screens 2 & 3 */}
        {tab && tab !== 'conversation' && (
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="lg:hidden p-1.5 rounded-xl bg-warm-bg hover:bg-muted text-warm-text border border-warm-border/50 cursor-pointer flex items-center justify-center shrink-0"
            title="Toggle decision panel"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}

        {/* User Button / Account Avatar */}
        <div className="h-8 w-8 rounded-full flex items-center justify-center relative shadow-xs border border-warm-border shrink-0 bg-white">
          {isLoaded && isSignedIn ? (
            <UserButton afterSignOutUrl="/" appearance={{
              elements: {
                userButtonAvatarBox: "h-8 w-8",
                userButtonTrigger: "h-8 w-8 focus:shadow-none"
              }
            }} />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#FF5A1F] flex items-center justify-center cursor-pointer group">
              <span className="text-[11px] font-bold text-white font-sans">
                {(user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '')}
              </span>
              <div className="absolute top-10 right-0 hidden group-hover:block bg-white border border-warm-border shadow-float p-2 rounded-2xl w-44 animate-float-up z-50 font-sans">
                <div className="px-2.5 py-1.5 border-b border-warm-border/50 mb-1">
                  <div className="text-[11px] font-bold text-warm-text truncate">
                    {user?.fullName || user?.firstName || 'User Account'}
                  </div>
                  <div className="text-[9.5px] text-warm-muted truncate font-mono">
                    {user?.primaryEmailAddress?.emailAddress || 'user@inferalytics.com'}
                  </div>
                </div>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="w-full text-left px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-[11px] flex items-center gap-2 transition-colors cursor-pointer font-medium"
                >
                  <LogOut className="h-3.5 w-3.5" />
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
