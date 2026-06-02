import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { ModelType } from '../../types';
import { Sparkles, ChevronDown, LogOut, Menu, MessageSquare } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useNavigate, useParams } from 'react-router-dom';

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
    setRightSidebarOpen 
  } = useStore();

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0];
  
  let activeStep = 0;
  if (tab === 'setup') activeStep = 1;
  else if (tab === 'build' || tab === 'batch') activeStep = 2;
  else if (tab === 'optimise' || tab === 'results' || tab === 'compare') activeStep = 3;

  // Screen segmented navbar items mapped directly to browser slugs
  const screensList = [
    { path: 'talk', label: '01 Talk' },
    { path: 'setup', label: '02 Setup' },
    { path: 'build', label: '03 Build' },
    { path: 'batch', label: '04 Batch' },
    { path: 'optimise', label: '05 Optimise' },
    { path: 'results', label: '06 Results' },
    { path: 'compare', label: '07 Compare' }
  ];

  const modelOptions: { value: ModelType; label: string }[] = [
    { value: 'Newton-Raphson', label: 'Newton-Raphson (optimization)' },
    { value: 'Holt-Winters', label: 'Holt-Winters (forecasting)' },
    { value: 'Monte Carlo', label: 'Monte Carlo (simulation)' },
    { value: 'auto', label: 'auto-select (default)' }
  ];

  return (
    <header className="h-12 w-full bg-transparent px-4 flex items-center justify-between z-50 relative select-none shrink-0 font-sans">
      {/* Left: Wordmark & Batch Switcher & Model Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard/talk')}>
          <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-warm-text hidden sm:inline">
            Inferalytics
          </span>
        </div>

        {/* Mobile Left Sidebar Toggle */}
        {tab !== 'talk' && (
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="lg:hidden p-1 rounded-lg bg-secondary hover:bg-muted text-warm-text border border-warm-border/50 cursor-pointer flex items-center justify-center shrink-0"
            title="Toggle sidebar navigator"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {tab !== 'talk' && (
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
                <span className="h-1.5 w-1.5 rounded-full bg-brand-indigo animate-pulse"></span>
                {activeBatch.name}
                <ChevronDown className="h-3.5 w-3.5 text-warm-muted" />
              </button>

              {isBatchOpen && (
                <div className="absolute top-8 left-0 w-56 rounded-xl bg-white border border-warm-border shadow-lg p-1.5 z-50 animate-float-up">
                  <div className="px-2.5 py-1 text-[9px] font-bold text-warm-muted uppercase tracking-wider">
                    Batches
                  </div>
                  {batches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveBatch(b.id);
                        setIsBatchOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] flex items-center justify-between transition-colors cursor-pointer ${
                        b.id === activeBatchId
                          ? 'bg-peach/10 text-brand-indigo font-medium'
                          : 'hover:bg-warm-bg text-warm-text'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          b.status === 'active' 
                            ? 'bg-brand-indigo' 
                            : b.status === 'archived' 
                              ? 'bg-warm-muted/30' 
                              : 'bg-warm-muted/60'
                        }`}></span>
                        {b.name}
                      </span>
                      {b.status === 'archived' && (
                        <span className="text-[9px] bg-warm-bg px-1 rounded text-warm-muted font-mono uppercase">
                          archived
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="relative">
              <button 
                onClick={() => {
                  setIsModelOpen(!isModelOpen);
                  setIsBatchOpen(false);
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
                  {modelOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setModel(opt.value);
                        setIsModelOpen(false);
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

      {/* Centre: Workflow Stepper (shown when activeStep > 0, hidden on small viewports) */}
      {activeStep > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 bg-white/70 backdrop-blur-md px-3.5 py-1 border border-warm-border rounded-full shadow-sm">
          {/* Step 1: Define */}
          <button
            onClick={() => navigate('/dashboard/setup/general')}
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
            onClick={() => navigate('/dashboard/build/dimensions')}
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

          {/* Step 3: Optimise */}
          <button
            onClick={() => navigate('/dashboard/optimise')}
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
              Optimise
            </span>
          </button>
        </div>
      )}

      {/* Right: Screen Navigation & Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Right Sidebar Toggle */}
        {tab !== 'talk' && (
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="lg:hidden p-1 rounded-lg bg-secondary hover:bg-muted text-warm-text border border-warm-border/50 cursor-pointer flex items-center justify-center shrink-0"
            title="Toggle decision panel"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}

        {/* Segmented Control */}
        {tab !== 'talk' && (
          <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 rounded-full border border-warm-border/40 overflow-x-auto max-w-[140px] sm:max-w-[240px] md:max-w-[360px] lg:max-w-none no-scrollbar whitespace-nowrap">
            {screensList.map(s => (
              <button
                key={s.path}
                onClick={() => navigate(`/dashboard/${s.path}`)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer shrink-0 ${
                  tab === s.path
                    ? 'bg-white text-brand-indigo shadow-sm font-semibold'
                    : 'text-warm-muted hover:text-warm-text hover:bg-white/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* User Button / Avatar */}
        <div className="h-7 w-7 rounded-full flex items-center justify-center relative shadow-sm border border-warm-border shrink-0">
          {isLoaded && isSignedIn ? (
            <UserButton afterSignOutUrl="/sign-in" appearance={{
              elements: {
                userButtonAvatarBox: "h-7 w-7",
                userButtonTrigger: "h-7 w-7 focus:shadow-none"
              }
            }} />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center cursor-pointer group">
              <span className="text-[10px] font-bold text-white font-sans">RM</span>
              <div className="absolute top-9 right-0 hidden group-hover:block bg-white border border-warm-border shadow-lg p-1.5 rounded-xl w-36 animate-float-up z-50">
                <div className="px-2 py-1 border-b border-warm-border mb-1">
                  <div className="text-[10px] font-bold text-warm-text truncate">Robert M.</div>
                  <div className="text-[9px] text-warm-muted truncate">robert@client.com</div>
                </div>
                <button 
                  onClick={() => window.location.href = '/sign-in'}
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
