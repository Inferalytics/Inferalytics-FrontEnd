import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Check, Paperclip, Send, Loader2, Plus, ChevronDown } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useStore } from '../../../store/useStore';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import type { ConversationTurn } from '../../../types/api';
import { getRouteForTools } from '../../../lib/agentNavigation';

const renderFormattedText = (content: string) => {
  if (!content) return null;
  const lines = content.split('\n');

  return lines.map((line, lIdx) => {
    const processInline = (text: string) => {
      const boldParts = text.split(/\*\*(.*?)\*\*/g);
      return boldParts.map((bPart, bIdx) => {
        if (bIdx % 2 === 1) {
          return <strong key={`b-${bIdx}`} className="font-bold text-warm-text">{bPart}</strong>;
        }

        const codeParts = bPart.split(/`(.*?)`/g);
        return codeParts.map((cPart, cIdx) => {
          if (cIdx % 2 === 1) {
            return (
              <code key={`c-${cIdx}`} className="px-1.5 py-0.5 mx-0.5 rounded bg-warm-bg border border-warm-border text-[11px] font-mono text-brand-indigo font-semibold">
                {cPart}
              </code>
            );
          }

          const italicParts = cPart.split(/\*(.*?)\*/g);
          return italicParts.map((iPart, iIdx) => {
            if (iIdx % 2 === 1) {
              return <em key={`i-${iIdx}`} className="italic text-warm-text/90">{iPart}</em>;
            }
            return iPart;
          });
        });
      });
    };

    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={lIdx} className="flex items-start gap-2 my-0.5 pl-1">
          <span className="text-brand-indigo font-bold select-none text-[12px] leading-tight">•</span>
          <div className="flex-1 text-[12.5px] leading-relaxed text-warm-text/90">
            {processInline(trimmed.slice(2))}
          </div>
        </div>
      );
    }

    if (!trimmed) {
      return <div key={lIdx} className="h-1.5" />;
    }

    return (
      <div key={lIdx} className="text-[12.5px] leading-relaxed">
        {processInline(line)}
      </div>
    );
  });
};

interface TalkPanelProps {
  triggerToast: (msg: string) => void;
}

export default function TalkPanel({ triggerToast }: TalkPanelProps) {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';
  const firstName = user?.firstName || displayName.split(' ')[0] || 'there';

  const { setScreen, syncBackendState, createBatchApi, batches, activeBatchId, switchBatchApi, setActiveBatch, addWorldModel, addMessage, conversation } = useStore();
  const navigate = useNavigate();

  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);

  const [talkAnimationPhase, setTalkAnimationPhase] = useState<'center' | 'sliding' | 'unfolding' | 'ready'>(() => {
    return sessionStorage.getItem('has_seen_talk_intro') === 'true' ? 'ready' : 'center';
  });
  const [talkMessages, setTalkMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([]);
  const [talkInputText, setTalkInputText] = useState('');
  const [chatBatchId, setChatBatchId] = useState<string | null>(activeBatchId || null);
  const [chatLoading, setChatLoading] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const historyRef = useRef<ConversationTurn[]>([]);

  // Keep chatBatchId in sync when global activeBatchId changes
  useEffect(() => {
    if (activeBatchId) {
      setChatBatchId(activeBatchId);
    }
  }, [activeBatchId]);

  // Restore chat messages from Zustand when returning to conversation page
  useEffect(() => {
    // Skip the initial AI greeting message (index 0) in conversation store
    const userMessages = conversation.filter(m => !m.isTyping && !m.chips);
    if (userMessages.length > 0 && talkMessages.length === 0) {
      const restored = userMessages.map(m => ({
        sender: m.role === 'ai' ? 'ai' as const : 'user' as const,
        text: m.content,
      }));
      setTalkMessages(restored);
    }
  }, []); // Only on mount

  const handleCreateBatchAndNext = async () => {
    const defaultName = `Batch ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const batchName = window.prompt('Enter name for the new batch:', defaultName);
    if (!batchName) return;

    try {
      setIsCreatingBatch(true);
      triggerToast('Creating new batch...');
      if (createBatchApi) {
        const newBatchId = await createBatchApi(batchName);
        setChatBatchId(newBatchId);
      } else {
        const res = await api.createBatch(batchName);
        const newBatchId = res.data.batch_id;
        await api.switchBatch(newBatchId);
        setChatBatchId(newBatchId);
      }
      triggerToast(`Batch "${batchName}" created! Moving to Blueprint...`);
      navigate(`/dashboard/blueprint/general?batch=${chatBatchId}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to create batch';
      triggerToast(`Error: ${detail}`);
    } finally {
      setIsCreatingBatch(false);
    }
  };

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ensureChatBatch = async (): Promise<string> => {
    if (chatBatchId) return chatBatchId;
    const res = await api.createBatch(`Conversation ${new Date().toLocaleString()}`);
    const id = res.data.batch_id;
    setChatBatchId(id);
    return id;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setChatLoading(true);
    triggerToast(`Uploading ${file.name}...`);

    try {
      await ensureChatBatch();
      const res = await api.uploadFile(file);
      triggerToast(`File uploaded: ${res.data.file_name} (${res.data.row_count} rows, ${res.data.column_count} cols)`);
      if (syncBackendState) {
        void syncBackendState();
      }
      void sendMessage(`I uploaded ${res.data.file_name}. Run the pipeline and optimize for 12% growth.`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'File upload failed';
      triggerToast(`Upload error: ${detail}`);
    } finally {
      setChatLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (userMsg: string) => {
    setTalkMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const batchId = await ensureChatBatch();
      const res = await api.agentChat({
        message: userMsg,
        batch_id: batchId,
        conversation_history: historyRef.current,
      });

      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userMsg },
        { role: 'assistant', content: res.reply },
      ];

      let replyText = res.reply || '';
      const toolsUsed = Array.isArray(res.tools_used) ? res.tools_used.filter(Boolean) : [];
      if (toolsUsed.length > 0) {
        const formattedTools = toolsUsed.map(t => {
          const clean = String(t).replace(/_/g, ' ');
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        });
        replyText += `\n\n*Executed:* \`${formattedTools.join('`, `')}\``;
      }

      // Handle world_model: use backend field, or parse from reply text as fallback
      const wm = res.world_model ?? null;
      if (wm) {
        addWorldModel(wm);
      }

      setTalkMessages(prev => [...prev, { sender: 'ai', text: replyText }]);

      // Persist to Zustand so messages survive navigation
      addMessage({ role: 'user', content: userMsg });
      addMessage({ role: 'ai', content: replyText });

      if (res.error) {
        triggerToast(`Agent warning: ${res.error}`);
      }

      if (syncBackendState) {
        await syncBackendState();
      }

      // Navigate to the relevant dashboard panel based on which tools were used
      const batchQuery = chatBatchId ? `?batch=${chatBatchId}` : '';
      const targetRoute = getRouteForTools(toolsUsed) ?? '/dashboard/blueprint/general';
      setTimeout(() => {
        navigate(`${targetRoute}${batchQuery}`);
      }, 1500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Something went wrong. Please try again.';
      setTalkMessages(prev => [...prev, { sender: 'ai', text: `Error: ${detail}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendTalkMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!talkInputText.trim() || chatLoading) return;

    const userMsg = talkInputText.trim();
    setTalkInputText('');
    void sendMessage(userMsg);
  };

  const handleSuggestionClick = (text: string) => {
    if (chatLoading) return;
    void sendMessage(text);
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
        {/* Card Header with Stepper & Action */}
        {(talkAnimationPhase === 'unfolding' || talkAnimationPhase === 'ready') && (
          <div className="border-b border-warm-border pb-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-warm-text">Decision Blueprint Flow</span>
              <span className="px-1.5 py-0.5 rounded bg-peach-light text-brand-indigo font-bold text-[9px] tracking-wider uppercase border border-peach/20">Active</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Active Batch Selector Dropdown */}
              {batches.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsBatchDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warm-bg/70 hover:bg-warm-bg border border-warm-border text-[11px] font-semibold text-warm-text transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-indigo animate-pulse"></span>
                    <span className="max-w-[140px] sm:max-w-[180px] truncate">
                      {batches.find(b => b.id === activeBatchId)?.name || batches[0]?.name || 'Select Batch'}
                    </span>
                    <ChevronDown className="h-3 w-3 text-warm-muted" />
                  </button>

                  {isBatchDropdownOpen && (
                    <div className="absolute top-8 right-0 sm:left-0 w-56 rounded-xl bg-white border border-warm-border shadow-lg p-1.5 z-50 animate-float-up">
                      <div className="px-2 py-1 text-[9px] font-bold text-warm-muted uppercase tracking-wider border-b border-warm-border/40 pb-1 mb-1">
                        Select Existing Batch ({batches.length})
                      </div>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                        {batches.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={async () => {
                              setIsBatchDropdownOpen(false);
                              if (switchBatchApi) {
                                await switchBatchApi(b.id);
                              } else {
                                setActiveBatch(b.id);
                              }
                              setChatBatchId(b.id);
                              triggerToast(`Switched to batch "${b.name}"! Moving to Blueprint...`);
                              navigate(`/dashboard/blueprint/general?batch=${b.id}`);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] flex items-center justify-between transition-colors cursor-pointer ${
                              b.id === activeBatchId
                                ? 'bg-peach/10 text-brand-indigo font-bold'
                                : 'hover:bg-warm-bg text-warm-text'
                            }`}
                          >
                            <span className="truncate">{b.name}</span>
                            {b.id === activeBatchId && (
                              <Check className="h-3 w-3 text-brand-indigo shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="hidden md:flex items-center gap-2 text-[10.5px] text-warm-muted">
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
                Hi {firstName}. I'm here to help you design a business case and simulation model. We can explore your strategic goals first — once we map out your core business drivers, I'll recommend the exact data needed to simulate your scenarios.
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
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-brand-indigo uppercase tracking-wider">Inferalytics AI</span>
                    <div className="text-[13px] text-warm-text leading-relaxed bg-warm-bg/50 p-3.5 rounded-2xl rounded-tl-sm border border-warm-border/50">
                      {renderFormattedText(msg.text)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1 text-right items-end">
                  <span className="text-[11px] font-semibold text-warm-text uppercase tracking-wider">{displayName}</span>
                  <div className="text-[13px] text-brand-indigo leading-relaxed bg-lavender/20 p-3.5 rounded-2xl rounded-tr-sm border border-lavender/40 text-left">
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv,.xlsx,.xls,.docx,.doc,.json"
          className="hidden"
        />

        {/* Input bar */}
        <form
          onSubmit={handleSendTalkMessage}
          className="mt-1 border-t border-warm-border/60 pt-3 flex items-center gap-2 sm:gap-3 w-full shrink-0"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-8.5 w-8.5 rounded-xl bg-warm-bg hover:bg-secondary border border-warm-border flex items-center justify-center text-warm-muted hover:text-warm-text transition-colors cursor-pointer shrink-0"
            title="Attach CSV, Excel, or Word file"
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
              disabled={!talkInputText.trim() || chatLoading}
              className={`absolute right-1 top-1 h-6.5 w-6.5 rounded-lg flex items-center justify-center transition-all ${
                talkInputText.trim() && !chatLoading
                  ? 'bg-brand-indigo text-white hover:opacity-90 cursor-pointer'
                  : 'bg-transparent text-warm-muted pointer-events-none'
              }`}
            >
              {chatLoading ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              ) : (
                <Send className="h-3 w-3 shrink-0" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCreateBatchAndNext}
            disabled={isCreatingBatch}
            className="h-8.5 px-3 bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-xl text-[11.5px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            title="Create a new batch workspace and proceed to 02 Blueprint"
          >
            {isCreatingBatch ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            )}
            <span className="hidden sm:inline">Create Batch & Next</span>
            <span className="sm:hidden">New Batch</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
