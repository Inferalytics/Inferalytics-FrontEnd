import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Check, Paperclip, Send } from 'lucide-react';
import { useStore } from '../../../store/useStore';

interface TalkPanelProps {
  triggerToast: (msg: string) => void;
}

export default function TalkPanel({ triggerToast }: TalkPanelProps) {
  const { setScreen } = useStore();

  const [talkAnimationPhase, setTalkAnimationPhase] = useState<'center' | 'sliding' | 'unfolding' | 'ready'>('center');
  const [talkMessages, setTalkMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([]);
  const [talkInputText, setTalkInputText] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [talkMessages, talkAnimationPhase]);

  useEffect(() => {
    setTalkAnimationPhase('center');

    const slideTimeout = setTimeout(() => setTalkAnimationPhase('sliding'), 1800);
    const unfoldTimeout = setTimeout(() => setTalkAnimationPhase('unfolding'), 2600);
    const readyTimeout = setTimeout(() => setTalkAnimationPhase('ready'), 3550);

    return () => {
      clearTimeout(slideTimeout);
      clearTimeout(unfoldTimeout);
      clearTimeout(readyTimeout);
    };
  }, []);

  const handleSendTalkMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!talkInputText.trim()) return;

    const userMsg = talkInputText.trim();
    setTalkInputText('');
    setTalkMessages(prev => [...prev, { sender: 'user', text: userMsg }]);

    setTimeout(() => {
      setTalkMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Got it. Modeling price changes based on your query: "${userMsg}". I will map this across customer segments and forecast renew rates.`
        }
      ]);
    }, 1200);
  };

  const handleSuggestionClick = (text: string) => {
    setTalkMessages(prev => [...prev, { sender: 'user', text }]);
    setTimeout(() => {
      setTalkMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Understood. Analyzing "${text}" scenarios. Mapping price elasticity and forecasting gross revenue uplift.`
        }
      ]);
    }, 1200);
  };

  return (
    <div className={`max-w-[1320px] w-full mx-auto flex flex-col md:flex-row pb-12 pt-4 relative min-h-[70vh] my-auto px-4 items-center justify-center animate-fade-in transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
      talkAnimationPhase === 'center' ? 'gap-0' : 'gap-12 md:gap-24'
    }`}>
      {/* Left Column: Hero Block + Key Points */}
      <div
        className={`flex flex-col transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none z-20 shrink-0 ${
          talkAnimationPhase === 'center'
            ? 'w-full max-w-[720px] scale-115 text-center items-center gap-6 mx-auto'
            : 'w-full md:w-[36%] max-w-md text-left items-start gap-5'
        }`}
      >
        <div
          className={`h-12 w-12 rounded-2xl bg-gradient-to-tr from-peach to-primary flex items-center justify-center shadow-md animate-pulse-ring transition-transform duration-700 ${
            talkAnimationPhase === 'center' ? 'scale-115' : 'scale-100'
          }`}
        >
          <Sparkles className="h-6 w-6 text-white" />
        </div>

        <h1
          className={`font-extrabold leading-tight tracking-tight select-none text-warm-text transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            talkAnimationPhase === 'center'
              ? 'text-4xl sm:text-5xl text-center'
              : 'text-3xl sm:text-4xl text-left'
          }`}
        >
          What decision are you trying to make?
        </h1>

        <p
          className={`leading-relaxed text-warm-muted transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            talkAnimationPhase === 'center'
              ? 'text-[15.5px] max-w-xl text-center'
              : 'text-[14px] max-w-lg text-left'
          }`}
        >
          Tell me about the problem. I'll help you think it through and figure out what data and dimensions we'll need — before we touch any spreadsheets.
        </p>

        <div
          className={`flex flex-col gap-4 mt-2 w-full transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            talkAnimationPhase === 'center'
              ? 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
              : 'opacity-100 max-h-[300px] visible'
          }`}
        >
          {[
            { title: 'Frame the Objective', desc: 'Define exactly what decision you want to optimize and what rules or constraints to satisfy.' },
            { title: 'Map Dimensions & Levers', desc: 'Identify customer segments, ARR bands, regions, and adjustable price percentages.' },
            { title: 'Select Solver Method', desc: 'Auto-select matching algorithms (like Newton-Raphson or Holt-Winters) for your data.' }
          ].map((point) => (
            <div key={point.title} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-sage-light border border-sage-border flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Check className="h-3 w-3 text-sage" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[12.5px] font-bold text-warm-text">{point.title}</span>
                <span className="text-[11px] text-warm-muted leading-relaxed">{point.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Conversation Flow Card */}
      <div
        className={`bg-white border rounded-2xl shadow-card flex flex-col transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] origin-left z-20 ${
          (talkAnimationPhase === 'unfolding' || talkAnimationPhase === 'ready')
            ? 'w-full md:w-[58%] opacity-100 max-h-[1600px] scale-100 translate-x-0 border-warm-border p-6 gap-6 visible'
            : 'w-0 max-w-0 opacity-0 max-h-0 scale-[0.97] -translate-x-8 border-transparent p-0 gap-0 overflow-hidden pointer-events-none invisible'
        }`}
      >
        <div className="flex flex-col gap-6 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
          {/* Initial AI bubble */}
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-lavender flex items-center justify-center shrink-0 border border-warm-border">
              <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11.5px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
              <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-4 rounded-2xl rounded-tl-sm border border-warm-border/50">
                Hi Robert. I'm here to help you frame a decision. We can talk it through first — once I understand the shape of the problem, I'll know what data to ask you for.
                <div className="mt-3 font-semibold">A few common starting points, or just describe it in your own words:</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['I want to raise prices', 'Hit a growth target next year', 'Reduce operating costs', 'Reallocate marketing spend', 'Optimize tier packaging'].map((s) => (
                    <span
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="px-3 py-1.5 rounded-full bg-white hover:bg-peach/10 border border-warm-border text-[11px] font-medium text-warm-text cursor-pointer hover:border-peach transition-all shadow-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preset user bubble */}
          <div className="flex gap-3 self-end justify-end max-w-[85%]">
            <div className="flex flex-col gap-1.5 text-right items-end">
              <span className="text-[11.5px] font-semibold text-warm-text uppercase tracking-wider">Robert M.</span>
              <div className="text-[13px] text-brand-indigo leading-relaxed bg-lavender/20 p-4 rounded-2xl rounded-tr-sm border border-lavender/40 text-left">
                We're thinking about raising prices on our Enterprise tier by 8–12% next quarter. I want to understand the trade-off between revenue uplift and churn risk before we commit.
              </div>
            </div>
          </div>

          {/* Decision frame summary */}
          <div className="flex gap-3 pt-4 border-t border-warm-border/60">
            <div className="h-7 w-7 rounded-full bg-lavender flex items-center justify-center shrink-0 border border-warm-border">
              <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <span className="text-[11.5px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
              <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-4 rounded-2xl rounded-tl-sm border border-warm-border/50 w-full flex flex-col gap-4">
                <div>Good — that's enough to build a real model. Here's what I'm understanding:</div>
                <div className="border border-warm-border rounded-xl bg-white p-3 font-mono text-[11.5px] flex flex-col gap-1.5 shadow-inner">
                  {[
                    { label: 'Decision', value: 'Set Enterprise price change for next FY' },
                    { label: 'Objective', value: 'Maximise net revenue subject to churn ≤ 6%' },
                    { label: 'Levers', value: 'Price uplift % · tier eligibility' },
                    { label: 'Dimensions', value: 'Customer, ARR band, Region, Quarter' },
                    { label: 'Inputs', value: 'Past price change, renewal history, usage' },
                    { label: 'Method', value: 'Newton-Raphson on elasticity-adjusted EGR' }
                  ].map((row, i, arr) => (
                    <div key={row.label} className={`flex justify-between ${i < arr.length - 1 ? 'border-b border-warm-bg pb-1' : ''}`}>
                      <span className="text-warm-muted">{row.label}</span>
                      <span className="font-semibold text-warm-text">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-sage-light border border-sage-border rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-sage/20 flex items-center justify-center border border-sage-border shrink-0">
                      <Check className="h-3.5 w-3.5 text-sage" />
                    </div>
                    <span className="text-[12px] font-medium text-warm-text">
                      <strong>World model framed.</strong> 5 dimensions identified, 3 sources ready.
                    </span>
                  </div>
                  <button
                    onClick={() => setScreen(2)}
                    className="py-1.5 px-4 bg-sage hover:bg-sage/90 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Upload data
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic messages */}
          {talkMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 animate-float-up ${msg.sender === 'user' ? 'self-end justify-end max-w-[85%] w-full' : ''}`}
            >
              {msg.sender === 'ai' ? (
                <>
                  <div className="h-7 w-7 rounded-full bg-lavender flex items-center justify-center shrink-0 border border-warm-border">
                    <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11.5px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
                    <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-4 rounded-2xl rounded-tl-sm border border-warm-border/50">
                      {msg.text}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 text-right items-end">
                  <span className="text-[11.5px] font-semibold text-warm-text uppercase tracking-wider">Robert M.</span>
                  <div className="text-[13px] text-brand-indigo leading-relaxed bg-lavender/20 p-4 rounded-2xl rounded-tr-sm border border-lavender/40 text-left">
                    {msg.text}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSendTalkMessage}
          className="mt-2 border-t border-warm-border/60 pt-4 flex items-center gap-3 w-full shrink-0"
        >
          <button
            type="button"
            onClick={() => triggerToast('Spreadsheet attached. Scanning data columns...')}
            className="h-9 w-9 rounded-xl bg-warm-bg hover:bg-secondary border border-warm-border flex items-center justify-center text-warm-muted hover:text-warm-text transition-colors cursor-pointer shrink-0"
            title="Attach spreadsheet / document"
          >
            <Paperclip className="h-4 w-4 shrink-0" />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={talkInputText}
              onChange={(e) => setTalkInputText(e.target.value)}
              placeholder="Ask a question or request price change simulations..."
              className="w-full h-9 pl-3 pr-10 border border-warm-border rounded-xl text-[12.5px] bg-warm-bg/30 text-warm-text focus:outline-none focus:border-brand-indigo font-sans transition-all"
            />
            <button
              type="submit"
              disabled={!talkInputText.trim()}
              className={`absolute right-1 top-1 h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                talkInputText.trim()
                  ? 'bg-brand-indigo text-white hover:opacity-90 cursor-pointer'
                  : 'bg-transparent text-warm-muted pointer-events-none'
              }`}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
