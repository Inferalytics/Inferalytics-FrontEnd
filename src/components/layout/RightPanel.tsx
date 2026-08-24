import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStore } from '../../store/useStore';
import { Sparkles, Send, RefreshCw, Paperclip } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProvenanceInspector from './ProvenanceInspector';
import api from '../../api';
import { getRouteForTools } from '../../lib/agentNavigation';

const renderFormattedText = (content: string | undefined | null) => {
  if (!content) return null;

  // Split by line blocks to preserve markdown bullet lists and paragraphs cleanly
  const lines = content.split('\n');

  return lines.map((line, lIdx) => {
    // Process line level formatting: bold, italic, code backticks
    const processInline = (text: string) => {
      // Split by bold (**text**)
      const boldParts = text.split(/\*\*(.*?)\*\*/g);
      return boldParts.map((bPart, bIdx) => {
        if (bIdx % 2 === 1) {
          return <strong key={`b-${bIdx}`} className="font-bold text-warm-text">{bPart}</strong>;
        }

        // Split by inline code (`code`)
        const codeParts = bPart.split(/`(.*?)`/g);
        return codeParts.map((cPart, cIdx) => {
          if (cIdx % 2 === 1) {
            return (
              <code key={`c-${cIdx}`} className="px-1.5 py-0.5 mx-0.5 rounded bg-warm-bg border border-warm-border text-[11px] font-mono text-brand-indigo font-semibold">
                {cPart}
              </code>
            );
          }

          // Split by italics (*text*)
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

    // Bullet list item (- or *)
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

    // Header 1 / 2 / 3
    if (trimmed.startsWith('# ')) {
      return <h3 key={lIdx} className="font-bold text-[14px] text-warm-text mt-2 mb-1">{processInline(trimmed.slice(2))}</h3>;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      return <h4 key={lIdx} className="font-semibold text-[13px] text-warm-text mt-1.5 mb-0.5">{processInline(trimmed.replace(/^#+\s*/, ''))}</h4>;
    }

    // Empty paragraph line spacer
    if (!trimmed) {
      return <div key={lIdx} className="h-1.5" />;
    }

    // Standard paragraph line
    return (
      <div key={lIdx} className="text-[12.5px] leading-relaxed">
        {processInline(line)}
      </div>
    );
  });
};

export default function RightPanel() {
  const { user } = useUser();
  const firstName = user?.firstName || 'there';

  const {
    conversation,
    addMessage,
    selectedProvenanceMetric,
    runOptimisation,
    runScenarioB,
    screen,
    activeBatchId,
    syncBackendState,
    createBatchApi,
    addWorldModel,
    worldModels,
  } = useStore();

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;
    addMessage({ role: 'user', content: userText });

    try {
      setIsOptimizing(true);

      let targetBatchId = activeBatchId;
      // Valid UUID check: hex format 8-4-4-4-12 or 32 hex chars
      const isUuid = targetBatchId && /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/.test(targetBatchId);

      if (!isUuid) {
        if (createBatchApi) {
          const defaultName = `Batch ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          targetBatchId = await createBatchApi(defaultName);
        } else {
          const defaultName = `Batch ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          const createRes = await api.createBatch(defaultName);
          targetBatchId = createRes.data.batch_id;
          await api.switchBatch(targetBatchId);
        }
      }

      const res = await api.agentChat({
        message: userText,
        batch_id: targetBatchId,
      });

      const reply = res.reply || res.error || 'No response from agent.';
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userText },
        { role: 'assistant', content: reply },
      ];

      let replyContent = reply;
      const toolsUsed = Array.isArray(res.tools_used) ? res.tools_used.filter(Boolean) : [];
      if (toolsUsed.length > 0) {
        const formattedTools = toolsUsed.map(t => {
          const clean = String(t).replace(/_/g, ' ');
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        });
        replyContent += `\n\n*Executed:* \`${formattedTools.join('`, `')}\``;
      }

      const wm = res.world_model ?? null;
      if (wm) {
        addWorldModel(wm);
      }

      addMessage({ role: 'ai', content: replyContent });


      // Automatically sync all backend data tables and metrics
      if (syncBackendState) {
        await syncBackendState();
      }

      // Jump to the tab that shows this turn's real result
      const route = getRouteForTools(toolsUsed);
      if (route) navigate(route);
    } catch (err: any) {
      console.warn('Agent call error in RightPanel:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Something went wrong. Please try again.';
      addMessage({ role: 'ai', content: `Error: ${detail}` });
    } finally {
      setIsOptimizing(false);
    }
  };

  const isBannerActionDone = (actionType: string) => {
    if (actionType === 'upload-data') return screen > 2;
    if (actionType === 'build-world-model') return screen > 3;
    if (actionType === 'run-optimisation') return screen > 5;
    if (actionType === 'run-scenario-b') return screen > 6;
    return false;
  };

  // Auto scroll to bottom of the conversation thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    const text = inputVal.trim();
    setInputVal('');
    void sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBannerAction = (actionType: string) => {
    if (actionType === 'upload-data') {
      navigate('/dashboard/blueprint/general');
    } else if (actionType === 'build-world-model') {
      navigate('/dashboard/ecr-build/dimensions');
    } else if (actionType === 'run-optimisation') {
      setIsOptimizing(true);
      runOptimisation(() => {
        setIsOptimizing(false);
        navigate('/dashboard/workspace/summary');
      });
    } else if (actionType === 'run-scenario-b') {
      setIsOptimizing(true);
      runScenarioB(() => {
        setIsOptimizing(false);
        navigate('/dashboard/learning');
      });
    }
  };

  const { rightSidebarOpen } = useStore();
  const isThinking = conversation.some((m) => m.isTyping) || isOptimizing;

  if (selectedProvenanceMetric !== null) {
    return (
      <aside className={`fixed lg:static top-12 right-0 z-40 w-[360px] sm:w-[400px] md:w-[420px] xl:w-[450px] max-w-[85vw] h-[calc(100vh-48px)] bg-white lg:bg-white/40 backdrop-blur-md border-l border-warm-border/50 flex flex-col justify-between isolate shrink-0 font-sans transition-transform duration-300 ease-in-out ${
        rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <ProvenanceInspector />
      </aside>
    );
  }

  return (
    <aside className={`fixed lg:static top-12 right-0 z-40 w-[360px] sm:w-[400px] md:w-[420px] xl:w-[450px] max-w-[85vw] h-[calc(100vh-48px)] bg-white lg:bg-white/40 backdrop-blur-md border-l border-warm-border/50 flex flex-col justify-between isolate shrink-0 font-sans transition-transform duration-300 ease-in-out ${
      rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
    }`}>
      {/* 48px Header */}
      <div className="h-12 border-b border-warm-border/40 px-4 flex items-center justify-between bg-white/50 backdrop-blur-sm shrink-0">
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
                  className={`group relative px-4 py-2.5 text-[13px] leading-relaxed shadow-sm border select-text selection:bg-brand-indigo selection:text-white ${
                    isAI
                      ? 'bg-white border-warm-border text-warm-text rounded-2xl rounded-bl-sm'
                      : 'bg-lavender/30 border-lavender/50 text-brand-indigo rounded-2xl rounded-br-sm'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {/* Copy Button on Hover */}
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.content || '')}
                    title="Copy message"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-warm-bg hover:bg-muted text-warm-muted hover:text-warm-text border border-warm-border/60 text-[10px] font-sans flex items-center gap-1 shadow-xs"
                  >
                    <span>Copy</span>
                  </button>

                  {renderFormattedText((msg.content || '').replace(/^Hi there!/, `Hi ${firstName}.`))}

                  {/* Suggestion Chips */}
                  {isAI && msg.chips && msg.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-warm-border/50">
                      {msg.chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => void sendMessage(chip.replace(/^\+\s*/, ''))}
                          className="px-2.5 py-1 rounded-full bg-lavender/40 hover:bg-lavender/60 text-brand-indigo text-[11px] font-medium transition-colors cursor-pointer border border-lavender/30"
                        >
                          + {chip.replace(/^\+\s*/, '')}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action Confirmation Banner */}
                  {isAI && msg.banner && (() => {
                    const isDone = isBannerActionDone(msg.banner.actionType);
                    return (
                      <div className={`mt-3 p-3 border rounded-xl flex flex-col gap-2.5 shadow-sm transition-all ${
                        isDone ? 'bg-secondary/40 border-warm-border/60 opacity-75' : 'bg-sage-light border-sage-border'
                      }`}>
                        <span className="text-[11.5px] font-semibold text-warm-text">
                          {msg.banner.label}
                        </span>
                        <button
                          onClick={() => handleBannerAction(msg.banner!.actionType)}
                          disabled={isThinking || isDone}
                          className={`w-full py-1.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                            isDone 
                              ? 'bg-warm-bg border border-warm-border text-warm-muted cursor-not-allowed'
                              : 'bg-sage hover:bg-sage/90 text-white cursor-pointer'
                          }`}
                        >
                          {isThinking && !isDone ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {isDone ? `✓ ${msg.banner.buttonText.replace(' →', '')} Executed` : msg.banner.buttonText}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          );
        })}

        {/* Animated Thinking/Typing Dots Bubble */}
        {isThinking && (
          <div className="flex flex-col gap-1.5 max-w-[85%] self-start animate-float-up">
            <div className="px-4 py-3 bg-white border border-warm-border/80 text-warm-text rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-indigo animate-spin shrink-0" />
              <span className="text-[12px] font-medium text-warm-muted">AI is processing pipeline</span>
              <div className="flex items-center gap-1 ml-1">
                <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            setIsOptimizing(true);
            const res = await api.uploadFile(file);
            addMessage({
              role: 'ai',
              content: `File **${res.data.file_name}** uploaded successfully! Parsed ${res.data.row_count} rows and ${res.data.column_count} columns in batch \`${res.data.batch_id.slice(0, 8)}...\`.`,
              chips: [
                `Run pipeline for ${res.data.file_name} and optimize for 15% growth`,
                `Vectorise and inspect columns of ${res.data.file_name}`,
                `Compare ${res.data.file_name} with baseline scenarios`
              ]
            });

            if (syncBackendState) {
              await syncBackendState();
            }
            navigate('/dashboard/ecr-batch');
          } catch (err: any) {
            const detail = err?.response?.data?.detail || err?.message || 'File upload failed';
            addMessage({
              role: 'ai',
              content: `File upload failed: ${detail}`,
            });
          } finally {
            setIsOptimizing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }}
        accept=".csv,.xlsx,.xls,.docx,.doc,.json"
        className="hidden"
      />

      {/* Composer Input */}
      <div className="p-3 border-t border-warm-border/40 bg-white/30 shrink-0">
        <div className="relative border border-warm-border bg-white/60 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-brand-indigo transition-all overflow-hidden flex flex-col justify-between min-h-[72px]">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            placeholder={
              tab === 'conversation'
                ? 'Reply, or keep refining the problem...'
                : 'Ask or instruct the AI...'
            }
            className="w-full px-3 py-2 text-[12.5px] text-warm-text bg-transparent placeholder-warm-muted border-none outline-none focus:ring-0 resize-none max-h-16 disabled:opacity-50"
          />
          <div className="px-3 pb-1.5 flex justify-between items-center bg-transparent">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className="p-1 rounded-md text-warm-muted hover:text-warm-text hover:bg-warm-bg transition-colors cursor-pointer disabled:opacity-50"
                title="Attach CSV, Excel, or Word file"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <span className="text-[9px] text-warm-muted font-mono font-medium">
                Press ⏎ to send · ⇧⏎ for new line
              </span>
            </div>
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
