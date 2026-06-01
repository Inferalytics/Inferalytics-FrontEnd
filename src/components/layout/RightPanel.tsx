import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function RightPanel() {
  const {
    conversation,
    addMessage
  } = useStore();

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of the conversation thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    addMessage({ role: 'user', content: inputVal });
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBannerAction = (actionType: string) => {
    if (actionType === 'upload-data') {
      navigate('/dashboard/setup');
    } else if (actionType === 'build-world-model') {
      navigate('/dashboard/batch');
    } else if (actionType === 'run-optimisation') {
      setIsOptimizing(true);
      // Simulate 1.2s Newton-Raphson optimization calculation delay
      setTimeout(() => {
        setIsOptimizing(false);
        navigate('/dashboard/results');
      }, 1200);
    } else if (actionType === 'run-scenario-b') {
      setIsOptimizing(true);
      // Simulate 1.2s scenario projection delay
      setTimeout(() => {
        setIsOptimizing(false);
        navigate('/dashboard/compare');
      }, 1200);
    }
  };

  const isThinking = conversation.some((m) => m.isTyping) || isOptimizing;

  return (
    <aside className="w-[360px] h-[calc(100vh-48px)] bg-warm-panel border-l border-warm-border flex flex-col justify-between select-none z-30 shrink-0 font-sans">
      {/* 48px Header */}
      <div className="h-12 border-b border-warm-border px-4 flex items-center justify-between bg-white/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className={`h-4 w-4 text-brand-indigo ${isThinking ? 'animate-spin' : ''}`} />
          <span className="text-[12.5px] font-bold text-warm-text tracking-tight uppercase">
            AI Decision Engine
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${isThinking ? 'bg-sage animate-ping' : 'bg-warm-muted/40'}`} />
          <span className="text-[10px] font-mono text-warm-muted uppercase tracking-wider">
            {isThinking ? 'thinking' : 'idle'}
          </span>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {conversation.map((msg, idx) => {
          const isAI = msg.role === 'ai';
          return (
            <div
              key={idx}
              className={`flex flex-col gap-1.5 max-w-[85%] animate-float-up ${
                isAI ? 'self-start' : 'self-end'
              }`}
            >
              {msg.isTyping ? (
                // Typing Indicator
                <div className="bg-white border border-warm-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                // Normal Speech Bubbles
                <div
                  className={`px-4 py-2.5 text-[13px] leading-relaxed shadow-sm border ${
                    isAI
                      ? 'bg-white border-warm-border text-warm-text rounded-2xl rounded-bl-sm'
                      : 'bg-lavender/30 border-lavender/50 text-brand-indigo rounded-2xl rounded-br-sm'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.content}

                  {/* Suggestion Chips */}
                  {isAI && msg.chips && msg.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-warm-border/50">
                      {msg.chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => addMessage({ role: 'user', content: chip })}
                          className="px-2.5 py-1 rounded-full bg-lavender/40 hover:bg-lavender/60 text-brand-indigo text-[11px] font-medium transition-colors cursor-pointer border border-lavender/30"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Confirmation Banner */}
                  {isAI && msg.banner && (
                    <div className="mt-3 p-3 bg-sage-light border border-sage-border rounded-xl flex flex-col gap-2.5 shadow-sm">
                      <span className="text-[11.5px] font-semibold text-sage-light-foreground text-warm-text">
                        {msg.banner.label}
                      </span>
                      <button
                        onClick={() => handleBannerAction(msg.banner!.actionType)}
                        disabled={isThinking}
                        className="w-full py-1.5 rounded-lg bg-sage hover:bg-sage/90 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isOptimizing ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {msg.banner.buttonText}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={threadEndRef} />
      </div>

      {/* Composer Input */}
      <div className="p-3 border-t border-warm-border bg-white/50 backdrop-blur-md shrink-0">
        <div className="relative border border-warm-border bg-white rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-brand-indigo transition-all overflow-hidden flex flex-col justify-between min-h-[72px]">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            placeholder={
              tab === 'talk'
                ? 'Reply, or keep refining the problem...'
                : 'Ask or instruct the AI...'
            }
            className="w-full px-3 py-2 text-[12.5px] text-warm-text bg-transparent placeholder-warm-muted border-none outline-none focus:ring-0 resize-none max-h-16 disabled:opacity-50"
          />
          <div className="px-3 pb-1.5 flex justify-between items-center bg-white">
            <span className="text-[9px] text-warm-muted font-mono font-medium">
              Press ⏎ to send · ⇧⏎ for new line
            </span>
            <button
              onClick={handleSend}
              disabled={!inputVal.trim() || isThinking}
              className="h-6 w-6 rounded-lg bg-brand-indigo hover:bg-brand-indigo/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
