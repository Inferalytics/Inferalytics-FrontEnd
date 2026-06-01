import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex h-screen w-screen bg-warm-bg relative overflow-hidden select-none font-sans">
      {/* Canvas Radial Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#E5DFD5 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
          opacity: 0.55
        }}
      />

      <div className="flex w-full h-full relative z-10">
        
        {/* Left Side: Premium Enterprise Dark Panel (55% width) */}
        <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] h-full bg-[#0E0E10] border-r border-[#1F1F23] p-12 flex-col justify-between relative overflow-hidden">
          
          {/* Subtle glowing mesh gradient in dark panel */}
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-[#6E69BE]/10 to-[#FFB6A3]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-[#6E69BE]/5 to-[#8EA885]/15 blur-3xl pointer-events-none" />

          {/* Top: Wordmark */}
          <div className="flex items-center gap-2.5 select-none shrink-0 relative z-20">
            <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center shadow-md">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-[14px] font-extrabold tracking-tight text-white font-sans uppercase letter-spacing-[0.05em]">
              Inferalytics
            </span>
          </div>

          {/* Middle: Rich Copy & High-Fidelity SVG Workspace Mockup */}
          <div className="flex-1 flex flex-col justify-center gap-10 max-w-[520px] mx-auto relative z-20 pt-6">
            
            {/* Context Headline */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] font-bold text-primary-foreground bg-primary px-2.5 py-1 rounded-full w-fit tracking-wider uppercase">
                Enterprise Decision formation
              </span>
              <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight sm:text-4xl">
                Form high-stakes decisions, visually.
              </h1>
              <p className="text-[12.5px] text-zinc-400 leading-relaxed max-w-[460px]">
                Converge raw business data, Newton-Raphson optimization models, and visual canvas graphs into a single, interactive world model.
              </p>
            </div>

            {/* High-Fidelity Product UI Mockup */}
            <div className="w-full aspect-[16/10] bg-[#161619] border border-[#2B2B30] rounded-2xl p-4 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              
              {/* Mock Radial Grid */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.15]" 
                style={{
                  backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Mock Header (48px) */}
              <div className="h-7 border-b border-[#2B2B30]/60 flex items-center justify-between relative z-10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded bg-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-2 w-2 text-white" />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-300">Revenue Optimiser</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#202024] px-2 py-0.5 rounded border border-[#2B2B30] text-[8px] font-mono text-zinc-400">
                  <span className="h-1 w-1 rounded-full bg-sage shrink-0 animate-pulse" />
                  Newton-Raphson
                </div>
              </div>

              {/* Mock Canvas Workspace */}
              <div className="flex-1 relative z-10 pt-4 flex items-center justify-between select-none">
                
                {/* Left Card: Revenue */}
                <div className="w-[125px] bg-[#1E1E22] border border-[#2B2B30] rounded-lg p-2 flex flex-col gap-1 shadow-md scale-95 shrink-0">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold text-zinc-300">Revenue</span>
                    <span className="text-[7px] bg-primary/20 text-primary-foreground px-1 rounded font-sans">NUM</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#FFB6A3] mt-0.5">$2.40M</span>
                  <div className="border-t border-[#2B2B30] mt-1 pt-1.5 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-sage shrink-0" />
                    <span className="text-[7.5px] text-zinc-400 font-mono">Vectorised</span>
                  </div>
                </div>

                {/* Connecting SVG Cable (stretches dynamically between cards) */}
                <div className="flex-1 h-6 relative shrink">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path 
                      d="M 0 10 C 40 10 60 10 100 10" 
                      stroke="#6E69BE" 
                      strokeWidth="1.8" 
                      fill="none" 
                      className="animate-marching-ants" 
                    />
                  </svg>
                </div>

                {/* Right Card: Result Outcome */}
                <div className="w-[140px] bg-[#1E1E22] border border-sage-border/30 rounded-lg shadow-lg overflow-hidden shrink-0 relative scale-95">
                  <div className="p-1.5 bg-sage-light/10 border-b border-sage-border/20 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-sage shrink-0" />
                    <span className="text-[8px] font-bold text-zinc-300">Result</span>
                  </div>
                  <div className="p-2 flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[8px] text-zinc-400">
                      <span>EGR achieved</span>
                      <span className="font-bold text-sage">13.2%</span>
                    </div>
                    <div className="w-full bg-[#161619] h-1 rounded-full overflow-hidden border border-[#2B2B30]/40">
                      <div className="bg-sage h-full rounded-full" style={{ width: '82%' }} />
                    </div>
                    <div className="flex justify-between items-center text-[8px] mt-1">
                      <span className="text-zinc-400">Delta YoY</span>
                      <span className="font-bold text-sage bg-sage/10 px-1 py-0.5 rounded font-mono">+18%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Hints */}
              <div className="text-[7.5px] font-mono text-zinc-500 text-center border-t border-[#2B2B30]/40 pt-2 shrink-0">
                Visualizing Scenario comparison mode side-by-side
              </div>
            </div>

            {/* Bullet feature logs */}
            <div className="grid grid-cols-3 gap-4 border-t border-[#1F1F23] pt-8">
              {[
                { title: 'Figma Canvas', desc: 'Drag-and-arrange metric nodes.' },
                { title: 'Optimiser Solve', desc: 'Real-time Newton-Raphson.' },
                { title: 'AI Engine Assistant', desc: 'natural-language briefings.' }
              ].map((feat, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <div className="h-6 w-6 rounded-lg bg-[#1E1E22] border border-[#2B2B30] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11.5px] font-bold text-white">{feat.title}</span>
                    <span className="text-[9.5px] text-zinc-400 leading-snug">{feat.desc}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Bottom: Credits */}
          <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between shrink-0 border-t border-[#1F1F23] pt-4 select-none relative z-20">
            <span>Inferalytics © 2026</span>
            <span className="hover:text-primary-foreground transition-colors cursor-pointer font-semibold">
              Google DeepMind Team
            </span>
          </div>
        </div>

        {/* Right Side: Authentication centered column (45% width) */}
        <div className="flex-1 lg:w-[50%] xl:w-[45%] h-full flex items-center justify-center p-6 bg-warm-bg select-none relative z-10">
          <div className="w-full max-w-[390px] animate-float-up">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
