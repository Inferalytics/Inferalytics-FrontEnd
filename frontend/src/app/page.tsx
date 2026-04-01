'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  TrendingUp,
  BarChart3,
  Layers,
  Target,
  Zap,
  Menu,
  X,
  Database,
  FileUp,
  Shield,
  Sparkles,
  ChevronDown,
  Upload,
  Settings2,
} from 'lucide-react';

// ─── Data ────────────────────────────────────────────────────────

const marqueeItems = [
  'Newton-Raphson',
  '1e-6 Tolerance',
  'Holt-Winters',
  '99.9% Precision',
  'Real-Time Convergence',
  'Multi-Format Ingestion',
  'Hierarchical Aggregation',
  'Batch Isolation',
  'Quarterly Forecasting',
  'Damped Adjustments',
];

const miniTerminalLines = [
  { text: '$ optimize --egr 15.0', type: 'cmd' },
  { text: '', type: 'gap' },
  { text: '\u25b8 Loading... 2,847 records', type: 'dim' },
  { text: '\u25b8 Newton-Raphson (tol: 1e-6)', type: 'dim' },
  { text: '', type: 'gap' },
  { text: '  Iter 1   EGR  8.23%   \u0394 6.77', type: 'muted' },
  { text: '  Iter 2   EGR 12.89%   \u0394 2.11', type: 'muted' },
  { text: '  Iter 3   EGR 14.57%   \u0394 0.43', type: 'muted' },
  { text: '  Iter 4   EGR 14.98%   \u0394 0.02', type: 'muted' },
  { text: '  Iter 5   EGR 15.00%   \u0394 0.00', type: 'muted' },
  { text: '', type: 'gap' },
  { text: '\u2713 Converged in 5 iterations', type: 'success' },
];

// ─── Animation Variants ──────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

// ─── Components ──────────────────────────────────────────────────

function Marquee() {
  return (
    <div className="overflow-hidden border-y border-white/[0.04] bg-white/[0.01]">
      <div className="animate-marquee flex whitespace-nowrap py-4">
        {[...marqueeItems, ...marqueeItems].map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-3 mx-6 text-[11px] font-medium tracking-[0.2em] uppercase text-zinc-600"
          >
            <span className="w-1 h-1 rounded-full bg-emerald-500/50 shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function BentoTerminal() {
  const [lines, setLines] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => {
      setLines((p) => {
        if (p >= miniTerminalLines.length) { clearInterval(t); return p; }
        return p + 1;
      });
    }, 250);
    return () => clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#28CA41]" />
        <span className="ml-2 text-[10px] text-zinc-700 font-mono">optimize.sh</span>
      </div>
      {/* Body */}
      <div className="p-4 font-mono text-[11px] leading-[1.8] flex-1 overflow-hidden">
        {miniTerminalLines.slice(0, lines).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={
              line.type === 'cmd' ? 'text-zinc-300 font-medium' :
              line.type === 'success' ? 'text-emerald-400 font-semibold' :
              line.type === 'muted' ? 'text-zinc-600' :
              line.type === 'dim' ? 'text-zinc-700' :
              'h-4'
            }
          >
            {line.text}
          </motion.div>
        ))}
        {lines < miniTerminalLines.length && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-1.5 h-3.5 bg-emerald-400"
          />
        )}
      </div>
    </div>
  );
}

function BentoChart() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <div ref={ref} className="h-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium mb-1">Predictive Forecast</p>
          <p className="text-white text-lg font-bold">+15.0% EGR</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-ring" />
          <span className="text-[10px] text-emerald-400 font-medium">Live</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <svg
          viewBox="0 0 240 90"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#2DD4BF" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[22, 44, 66].map((y) => (
            <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="rgba(255,255,255,0.03)" />
          ))}
          {/* Area fill */}
          <path
            d="M 10,70 C 30,65 45,55 65,50 C 85,45 100,55 120,48 C 140,41 155,35 175,30 L 175,90 L 10,90 Z"
            fill="url(#areaGrad)"
            className={inView ? 'opacity-100 transition-opacity duration-1000' : 'opacity-0'}
          />
          {/* Historical line */}
          <path
            d="M 10,70 C 30,65 45,55 65,50 C 85,45 100,55 120,48 C 140,41 155,35 175,30"
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            className={inView ? 'animate-draw' : ''}
          />
          {/* Forecast dashed */}
          <path
            d="M 175,30 C 190,25 205,20 225,14"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            className={inView ? 'opacity-60 transition-opacity duration-1000 delay-700' : 'opacity-0'}
          />
          {/* Data points */}
          {inView && [[10,70],[65,50],[120,48],[175,30]].map(([cx,cy], i) => (
            <motion.circle
              key={i}
              cx={cx} cy={cy} r="3"
              fill="#09090B"
              stroke="#10B981"
              strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.2, type: 'spring' }}
            />
          ))}
          {/* Forecast point */}
          {inView && (
            <motion.circle
              cx={225} cy={14} r="3"
              fill="#09090B"
              stroke="#2DD4BF"
              strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.3, type: 'spring' }}
            />
          )}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex gap-5 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-emerald-500 rounded-full" />
          <span className="text-[10px] text-zinc-600">Historical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-[2px] bg-emerald-500/40 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10B981 0 4px, transparent 4px 8px)' }} />
          <span className="text-[10px] text-zinc-600">Forecast</span>
        </div>
      </div>
    </div>
  );
}

function WordReveal({ text, highlight }: { text: string; highlight: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const words = text.split(' ');
  return (
    <p ref={ref} className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-medium leading-snug tracking-tight">
      {words.map((word, i) => {
        const isHighlight = highlight.split(' ').includes(word);
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0.08 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className={isHighlight ? 'text-white' : 'text-zinc-500'}
          >
            {word}{' '}
          </motion.span>
        );
      })}
    </p>
  );
}

function BentoMouseTracker({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div ref={ref} onMouseMove={handleMouse} className={className}>
      {children}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <main className="bg-[#09090B] min-h-screen overflow-hidden relative text-white">
      <div className="fixed inset-0 landing-grid pointer-events-none" />

      {/* ══════════ NAV ══════════ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#09090B]/80 backdrop-blur-xl border-b border-white/[0.04]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center">
              <Shield className="w-4 h-4 text-black" strokeWidth={2.5} />
            </div>
            <span className="font-bold tracking-tight text-sm">Inferalytics</span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-[13px] text-zinc-500">
            <a href="#grid" className="hover:text-white transition-colors">Platform</a>
            <a href="#algorithms" className="hover:text-white transition-colors">Algorithms</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="group bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5">
                Dashboard <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : isLoaded ? (
              <>
                <Link href="/login" className="text-[13px] text-zinc-500 hover:text-white transition-colors px-2 py-1.5">Sign In</Link>
                <Link href="/signup" className="group bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5">
                  Get Started <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            ) : <div className="w-20 h-7 bg-white/[0.04] animate-pulse rounded-lg" />}
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-zinc-400 hover:text-white">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#111]/95 backdrop-blur-xl border-b border-white/[0.04] overflow-hidden"
            >
              <div className="px-6 py-4 flex flex-col gap-1 text-[13px]">
                {['Platform', 'Algorithms', 'Workflow'].map(l => (
                  <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="text-zinc-500 hover:text-white py-2 transition-colors">{l}</a>
                ))}
                <hr className="border-white/[0.04] my-2" />
                {isLoaded && isSignedIn ? (
                  <Link href="/dashboard" className="bg-emerald-500 text-black rounded-lg py-2 text-center font-semibold">Dashboard</Link>
                ) : isLoaded ? (
                  <>
                    <Link href="/login" className="text-zinc-500 py-2 text-center">Sign In</Link>
                    <Link href="/signup" className="bg-emerald-500 text-black rounded-lg py-2 text-center font-semibold">Get Started</Link>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══════════ HERO — cinematic, centered ══════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        {/* Ambient orbs */}
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-emerald-500/[0.06] rounded-full blur-[140px] animate-float-slow pointer-events-none" />
        <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] bg-teal-500/[0.04] rounded-full blur-[100px] animate-float-delayed pointer-events-none" />
        <div className="absolute top-[40%] left-[5%] w-[250px] h-[250px] bg-emerald-500/[0.03] rounded-full blur-[80px] animate-float pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/15 rounded-full mb-8">
              <Sparkles className="w-3 h-3" /> v2.4 Engine
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-7"
          >
            <span className="block">Precision-Grade</span>
            <span className="block bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
              Data Optimization
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-zinc-500 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Newton-Raphson convergence meets Holt-Winters intelligence.
            Transform hierarchical data into actionable growth targets.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-3 justify-center"
          >
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="group bg-emerald-500 hover:bg-emerald-400 text-black px-7 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                Enter Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : isLoaded ? (
              <>
                <Link href="/signup" className="group bg-emerald-500 hover:bg-emerald-400 text-black px-7 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                  Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a href="#grid" className="border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.03] px-7 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 text-zinc-300">
                  Explore Platform <ArrowUpRight className="w-4 h-4" />
                </a>
              </>
            ) : <div className="h-[46px] w-40 bg-white/[0.04] animate-pulse rounded-xl" />}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10"
        >
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5 text-zinc-700" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════ MARQUEE ══════════ */}
      <Marquee />

      {/* ══════════ BENTO GRID ══════════ */}
      <section id="grid" className="py-24 sm:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {/* ── Terminal Card (2×2) ── */}
            <motion.div variants={fadeUp}>
              <BentoMouseTracker className="bento-card sm:col-span-2 row-span-2 rounded-2xl border border-white/[0.06] bg-[#0C0C0E] overflow-hidden h-full sm:min-h-[360px]">
                <BentoTerminal />
              </BentoMouseTracker>
            </motion.div>

            {/* ── Stat: Convergence ── */}
            <motion.div variants={fadeUp}>
              <BentoMouseTracker className="bento-card rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 flex flex-col justify-between h-full min-h-[170px]">
                <Target className="w-5 h-5 text-emerald-400/60" />
                <div>
                  <p className="text-3xl font-bold tracking-tight">1e-6</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">Convergence Tolerance</p>
                </div>
              </BentoMouseTracker>
            </motion.div>

            {/* ── Stat: Precision ── */}
            <motion.div variants={fadeUp}>
              <BentoMouseTracker className="bento-card rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 flex flex-col justify-between h-full min-h-[170px]">
                <Shield className="w-5 h-5 text-emerald-400/60" />
                <div>
                  <p className="text-3xl font-bold tracking-tight">99.9%</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">Model Precision</p>
                </div>
              </BentoMouseTracker>
            </motion.div>

            {/* ── Feature: NR Engine ── */}
            <motion.div variants={fadeUp}>
              <BentoMouseTracker className="bento-card rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 h-full min-h-[170px]">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Target className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">Newton-Raphson Engine</h3>
                <p className="text-zinc-600 text-xs leading-relaxed">Iterative optimization with damped adjustments for mathematical convergence.</p>
              </BentoMouseTracker>
            </motion.div>

            {/* ── Feature: Forecasting ── */}
            <motion.div variants={fadeUp}>
              <BentoMouseTracker className="bento-card rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 h-full min-h-[170px]">
                <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-4.5 h-4.5 text-teal-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">Holt-Winters Forecasting</h3>
                <p className="text-zinc-600 text-xs leading-relaxed">Triple exponential smoothing with seasonal decomposition for prediction.</p>
              </BentoMouseTracker>
            </motion.div>

            {/* ── Chart Card (2-col) ── */}
            <motion.div variants={fadeUp} className="sm:col-span-2">
              <BentoMouseTracker className="bento-card rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden h-full min-h-[220px]">
                <BentoChart />
              </BentoMouseTracker>
            </motion.div>

            {/* ── Feature: Pipeline ── */}
            <motion.div variants={fadeUp}>
              <BentoMouseTracker className="bento-card rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 h-full min-h-[170px]">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                  <FileUp className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">Multi-Format Pipeline</h3>
                <p className="text-zinc-600 text-xs leading-relaxed">CSV, Excel, JSON, and Word ingestion with automatic parsing.</p>
              </BentoMouseTracker>
            </motion.div>

            {/* ── Stat: Speed ── */}
            <motion.div variants={fadeUp}>
              <BentoMouseTracker className="bento-card rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 flex flex-col justify-between h-full min-h-[170px]">
                <Activity className="w-5 h-5 text-emerald-400/60" />
                <div>
                  <p className="text-3xl font-bold tracking-tight">&lt;100ms</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">Response Time</p>
                </div>
              </BentoMouseTracker>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ BOLD STATEMENT ══════════ */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <WordReveal
            text="Built for teams who need mathematical certainty, not statistical guesswork."
            highlight="mathematical certainty,"
          />
        </div>
      </section>

      {/* ══════════ ALGORITHMS — editorial ══════════ */}
      <section id="algorithms" className="py-24 sm:py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.01] to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="mb-14"
          >
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/15 rounded-full mb-5">
              Under the Hood
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Two engines.
              <span className="text-zinc-500"> One platform.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-4">
            {/* Newton-Raphson — takes 3 cols */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="md:col-span-3 relative p-8 sm:p-10 rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.04] rounded-full blur-[80px] pointer-events-none group-hover:bg-emerald-500/[0.06] transition-all duration-700" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Newton-Raphson Optimization</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8 max-w-md">
                  Iterative root-finding applied to growth rate convergence.
                  Distributes adjustments proportionally across non-fixed values
                  with configurable damping for numerical stability.
                </p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    'Convergence tolerance: 1e-6',
                    'Max \u00b11 adjustment per iteration',
                    'Hierarchical aggregation per cycle',
                    'Fixed-value constraint support',
                    'Up to 1,000 iterations',
                    'Proportional distribution',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-[13px] text-zinc-500">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 mt-[7px] shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Holt-Winters — takes 2 cols */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-2 relative p-8 sm:p-10 rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden group"
            >
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/[0.04] rounded-full blur-[80px] pointer-events-none group-hover:bg-teal-500/[0.06] transition-all duration-700" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Holt-Winters Forecasting</h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                  Triple exponential smoothing with multiplicative seasonality
                  for quarterly prediction accuracy.
                </p>
                <div className="space-y-3">
                  {[
                    '\u03b1 — Level smoothing',
                    '\u03b2 — Trend smoothing',
                    '\u03b3 — Seasonal smoothing',
                    'Year-over-year growth comparison',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-[13px] text-zinc-500">
                      <div className="w-1 h-1 rounded-full bg-teal-400 mt-[7px] shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ WORKFLOW — compact strip ══════════ */}
      <section id="workflow" className="py-24 sm:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/15 rounded-full mb-5">
              Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Four steps to convergence</h2>
          </motion.div>

          {/* Horizontal pipeline on a single "track" */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="relative"
          >
            {/* Track line (desktop) */}
            <div className="hidden lg:block absolute top-[44px] left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
              {[
                { icon: Upload, title: 'Upload', desc: 'Drag & drop datasets in CSV, Excel, JSON, or Word format.', color: 'emerald' },
                { icon: Settings2, title: 'Configure', desc: 'Set target EGR, lock constraint values, define time ranges.', color: 'emerald' },
                { icon: Zap, title: 'Optimize', desc: 'Newton-Raphson iterates until convergence is achieved.', color: 'emerald' },
                { icon: BarChart3, title: 'Forecast', desc: 'Holt-Winters generates quarterly predictions.', color: 'teal' },
              ].map((step, i) => (
                <motion.div key={step.title} variants={fadeUp} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-[88px] h-[88px] rounded-2xl border border-white/[0.06] bg-white/[0.02] mb-5 mx-auto">
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-md bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <step.icon className={`w-6 h-6 ${step.color === 'teal' ? 'text-teal-400' : 'text-emerald-400'}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{step.title}</h3>
                  <p className="text-zinc-600 text-xs leading-relaxed max-w-[200px] mx-auto">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-24 sm:py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center relative"
        >
          <div className="absolute -inset-24 bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/15">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Ready to converge?</h2>
            <p className="text-zinc-500 text-base sm:text-lg mb-9 max-w-md mx-auto leading-relaxed">
              Start transforming hierarchical data into precise growth outcomes.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {isLoaded && isSignedIn ? (
                <Link href="/dashboard" className="group bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                  Go to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : isLoaded ? (
                <>
                  <Link href="/signup" className="group bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                    Get Started Free <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link href="/login" className="border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.03] px-8 py-3.5 rounded-xl font-medium transition-all text-zinc-300">
                    Sign In
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
              <Shield className="w-3 h-3 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-xs text-zinc-700">Inferalytics &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-zinc-700">
            <a href="#grid" className="hover:text-zinc-400 transition-colors">Platform</a>
            <a href="#algorithms" className="hover:text-zinc-400 transition-colors">Algorithms</a>
            <a href="#workflow" className="hover:text-zinc-400 transition-colors">Workflow</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
