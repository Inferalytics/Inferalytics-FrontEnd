import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Check, Paperclip, Send } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { useNavigate } from 'react-router-dom';

const renderFormattedText = (content: string) => {
  if (!content) return '';
  const parts = content.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-bold text-warm-text">{part}</strong>;
    }
    return part;
  });
};

interface TalkPanelProps {
  triggerToast: (msg: string) => void;
}

export default function TalkPanel({ triggerToast }: TalkPanelProps) {
  const { setScreen } = useStore();
  const navigate = useNavigate();

  const [talkAnimationPhase, setTalkAnimationPhase] = useState<'center' | 'sliding' | 'unfolding' | 'ready'>(() => {
    return sessionStorage.getItem('has_seen_talk_intro') === 'true' ? 'ready' : 'center';
  });
  const [talkMessages, setTalkMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([]);
  const [talkInputText, setTalkInputText] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [talkMessages, talkAnimationPhase]);

  useEffect(() => {
    if (sessionStorage.getItem('has_seen_talk_intro') === 'true') {
      setTalkAnimationPhase('ready');
      return;
    }

    setTalkAnimationPhase('center');

    const slideTimeout = setTimeout(() => setTalkAnimationPhase('sliding'), 1800);
    const unfoldTimeout = setTimeout(() => setTalkAnimationPhase('unfolding'), 2600);
    const readyTimeout = setTimeout(() => {
      setTalkAnimationPhase('ready');
      sessionStorage.setItem('has_seen_talk_intro', 'true');
    }, 3550);

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

    const userMsgLower = userMsg.toLowerCase();
    if (
      userMsgLower.includes('build model') ||
      userMsgLower.includes('build now') ||
      userMsgLower.includes('build') ||
      userMsgLower.includes('proceed') ||
      userMsgLower.includes('start setup') ||
      userMsgLower.includes('start build')
    ) {
      triggerToast('Initializing ECR Model Configuration...');
      setTimeout(() => {
        navigate('/dashboard/blueprint/general');
      }, 800);
      return;
    }

    setTimeout(() => {
      setTalkMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Got it. Structuring a growth simulation for your scenario: "${userMsg}". I will map these options across customer segments and project retention impacts.`
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
          text: `Understood. Analyzing "${text}" strategies. Mapping price elasticity curves to project revenue and churn tradeoffs.`
        }
      ]);
    }, 1200);
  };

  return (
    <div className={`max-w-[1320px] w-full mx-auto flex flex-col pb-6 pt-4 relative px-4 items-center animate-fade-in transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
      talkAnimationPhase === 'center' ? 'min-h-[70vh] gap-0 justify-center' : 'gap-5 justify-start'
    }`}>
      {/* Top Header Section */}
      <div
        className={`flex flex-col transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none z-20 shrink-0 ${
          talkAnimationPhase === 'center'
            ? 'w-full max-w-[720px] scale-115 text-center items-center gap-6 mx-auto'
            : 'w-full max-w-4xl text-center items-center gap-1 mb-2'
        }`}
      >
        <div
          className={`rounded-2xl bg-gradient-to-tr from-peach to-primary items-center justify-center shadow-md animate-pulse-ring transition-all duration-700 ${
            talkAnimationPhase === 'center'
              ? 'flex h-12 w-12 scale-115'
              : 'hidden h-0 w-0 scale-0 pointer-events-none'
          }`}
        >
          <Sparkles className="h-6 w-6 text-white" />
        </div>

        <span
          className={`font-bold text-brand-indigo uppercase tracking-wider bg-peach-light px-3 py-1 rounded-full border border-warm-border/50 shadow-sm text-[10px] transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            talkAnimationPhase === 'center'
              ? 'opacity-0 scale-90 h-0 py-0 overflow-hidden pointer-events-none'
              : 'opacity-100 scale-100 visible mt-1'
          }`}
        >
          Business Conversation Engine
        </span>

        <h1
          className={`font-extrabold leading-tight tracking-tight select-none text-warm-text transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            talkAnimationPhase === 'center'
              ? 'text-4xl sm:text-5xl text-center mt-2'
              : 'text-2xl sm:text-3xl text-center mt-1.5'
          }`}
        >
          What decision are you trying to make?
        </h1>

        <p
          className={`leading-relaxed text-warm-muted transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            talkAnimationPhase === 'center'
              ? 'text-[15.5px] max-w-xl text-center mt-4'
              : 'text-[12.5px] max-w-2xl text-center mt-1'
          }`}
        >
          {talkAnimationPhase === 'center'
            ? "Tell me about the problem. I'll help you think it through and figure out what data and dimensions we'll need — before we touch any spreadsheets."
            : "Outline your scenario below. We will generate the Decision Blueprint and map variables to your ECR (Enterprise Computational Representation)."}
        </p>
      </div>

      {/* Center Column: Conversation Flow Card */}
      <div
        className={`bg-white border rounded-2xl shadow-card flex flex-col transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] origin-top z-20 ${
          (talkAnimationPhase === 'unfolding' || talkAnimationPhase === 'ready')
            ? 'w-full max-w-4xl opacity-100 max-h-[1600px] scale-100 translate-y-0 border-warm-border p-4 sm:p-5 gap-4 visible'
            : 'w-full max-w-4xl opacity-0 max-h-0 scale-[0.97] translate-y-8 border-transparent p-0 gap-0 overflow-hidden pointer-events-none invisible'
        }`}
      >
        {/* Card Header with Stepper */}
        {(talkAnimationPhase === 'unfolding' || talkAnimationPhase === 'ready') && (
          <div className="border-b border-warm-border pb-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-warm-text">Decision Blueprint Flow</span>
              <span className="px-1.5 py-0.5 rounded bg-peach-light text-brand-indigo font-bold text-[9px] tracking-wider uppercase border border-peach/20">Active</span>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-warm-muted">
              <span className="flex items-center gap-1 font-bold text-sage">
                <Check className="h-3.5 w-3.5" /> Conversation
              </span>
              <span className="text-warm-border">/</span>
              <span className="flex items-center gap-1 font-bold text-sage">
                <Check className="h-3.5 w-3.5" /> Blueprint
              </span>
              <span className="text-warm-border">/</span>
              <span className="text-brand-indigo font-extrabold bg-peach-light px-2 py-0.5 rounded animate-pulse">
                ECR Simulation
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] md:max-h-[550px] xl:max-h-[640px] pr-1 custom-scrollbar">
          {/* Initial AI bubble */}
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-lavender flex items-center justify-center shrink-0 border border-warm-border">
              <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
              <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-3.5 rounded-2xl rounded-tl-sm border border-warm-border/50">
                Hi Robert. I'm here to help you design a business case and simulation model. We can explore your strategic goals first — once we map out your core business drivers, I'll recommend the exact data needed to simulate your scenarios.
                <div className="mt-2 font-semibold">Select a scenario to start, or describe your goals in your own words:</div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['I want to raise prices', 'Hit a growth target next year', 'Reduce operating costs', 'Reallocate marketing spend', 'Optimize tier packaging'].map((s) => (
                    <span
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="px-2.5 py-1 rounded-full bg-white hover:bg-peach/10 border border-warm-border text-[10.5px] font-medium text-warm-text cursor-pointer hover:border-peach transition-all shadow-sm"
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
            <div className="flex flex-col gap-1 text-right items-end">
              <span className="text-[11px] font-semibold text-warm-text uppercase tracking-wider">Robert M.</span>
              <div className="text-[13px] text-brand-indigo leading-relaxed bg-lavender/20 p-3.5 rounded-2xl rounded-tr-sm border border-lavender/40 text-left">
                We're thinking about raising prices on our Enterprise tier by 8–12% next quarter. I want to understand the trade-off between revenue uplift and churn risk before we commit.
              </div>
            </div>
          </div>

          {/* Decision frame summary */}
          <div className="flex gap-3 pt-3 border-t border-warm-border/60">
            <div className="h-7 w-7 rounded-full bg-lavender flex items-center justify-center shrink-0 border border-warm-border">
              <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[11px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
              <div 
                onClick={() => navigate('/dashboard/blueprint/general')}
                className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 hover:bg-lavender/10 hover:border-brand-indigo/40 p-3.5 rounded-2xl rounded-tl-sm border border-warm-border/50 w-full flex flex-col gap-3 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <div>Excellent. Decision Blueprint generated. Here is the ECR (Enterprise Computational Representation) structure we will configure:</div>
                <div className="border border-warm-border rounded-xl bg-white p-3 text-[12px] flex flex-col gap-1.5 shadow-sm group-hover:border-brand-indigo/20 transition-colors">
                  {[
                    { label: 'Strategic Decision', value: 'Evaluate Enterprise tier price change for next FY' },
                    { label: 'Business Goal', value: 'Maximize net revenue with churn risk ceiling under 6%' },
                    { label: 'Growth Levers', value: 'Enterprise pricing adjustments and tier eligibility options' },
                    { label: 'Market Segments', value: 'Customer tiers, contract values (ARR), geography, and timing' },
                    { label: 'Historical Baseline', value: 'Historical purchase patterns, customer retention rates, and usage metrics' },
                    { label: 'ECR Simulation Engine', value: 'Sensitivity forecasting using price-elasticity modeling' }
                  ].map((row, i, arr) => (
                    <div key={row.label} className={`flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4 ${i < arr.length - 1 ? 'border-b border-warm-bg pb-1.5' : ''}`}>
                      <span className="text-warm-muted font-medium text-[11px] sm:text-[11.5px]">{row.label}</span>
                      <span className="font-semibold text-warm-text sm:text-right text-[12px] group-hover:text-brand-indigo transition-colors">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-sage-light border border-sage-border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm group-hover:bg-sage-light/70 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-sage/20 flex items-center justify-center border border-sage-border shrink-0">
                      <Check className="h-3 w-3 text-sage" />
                    </div>
                    <span className="text-[12px] font-medium text-warm-text">
                      <strong>Decision Blueprint finalized.</strong> 3 baseline sources matched to ECR variables.
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/dashboard/blueprint/general'); }}
                    className="py-1.5 px-3.5 bg-sage hover:bg-sage/90 text-white rounded-lg text-[11.5px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    Build ECR Model
                    <ArrowRight className="h-3 w-3 transform group-hover:translate-x-0.5 transition-transform" />
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
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
                    <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-3.5 rounded-2xl rounded-tl-sm border border-warm-border/50">
                      {renderFormattedText(msg.text)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1 text-right items-end">
                  <span className="text-[11px] font-semibold text-warm-text uppercase tracking-wider">Robert M.</span>
                  <div className="text-[13px] text-brand-indigo leading-relaxed bg-lavender/20 p-3.5 rounded-2xl rounded-tr-sm border border-lavender/40 text-left">
                    {renderFormattedText(msg.text)}
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
          className="mt-1 border-t border-warm-border/60 pt-3 flex items-center gap-3 w-full shrink-0"
        >
          <button
            type="button"
            onClick={() => triggerToast('Spreadsheet attached. Scanning data columns...')}
            className="h-8.5 w-8.5 rounded-xl bg-warm-bg hover:bg-secondary border border-warm-border flex items-center justify-center text-warm-muted hover:text-warm-text transition-colors cursor-pointer shrink-0"
            title="Attach spreadsheet / document"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={talkInputText}
              onChange={(e) => setTalkInputText(e.target.value)}
              placeholder="Ask a question or request growth simulations..."
              className="w-full h-8.5 pl-3 pr-10 border border-warm-border rounded-xl text-[12px] bg-warm-bg/30 text-warm-text focus:outline-none focus:border-brand-indigo font-sans transition-all"
            />
            <button
              type="submit"
              disabled={!talkInputText.trim()}
              className={`absolute right-1 top-1 h-6.5 w-6.5 rounded-lg flex items-center justify-center transition-all ${
                talkInputText.trim()
                  ? 'bg-brand-indigo text-white hover:opacity-90 cursor-pointer'
                  : 'bg-transparent text-warm-muted pointer-events-none'
              }`}
            >
              <Send className="h-3 w-3 shrink-0" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
