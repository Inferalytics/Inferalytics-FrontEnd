import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStore } from '../../store/useStore';
import { Sparkles, Send, RefreshCw, Paperclip } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProvenanceInspector from './ProvenanceInspector';
import api from '../../api';
import { getRouteForTools, detectFlow, shouldRefreshForecast, isFullScenarioRequest, hasExplicitPipelineParams, buildFullScenarioPrompt } from '../../lib/agentNavigation';
import { setForecastPageCache } from '../../store/useStore';

const renderFormattedText = (content: string | undefined | null, isUser = false) => {
  if (!content) return null;
  const rawLines = content.split('\n');

  const processInline = (text: string) => {
    const boldParts = text.split(/\*\*(.*?)\*\*/g);
    return boldParts.map((bPart, bIdx) => {
      if (bIdx % 2 === 1) {
        return <strong key={`b-${bIdx}`} className={`font-bold ${isUser ? 'text-brand-indigo font-bold' : 'text-warm-text'}`}>{bPart}</strong>;
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
            return <em key={`i-${iIdx}`} className={`italic ${isUser ? 'text-brand-indigo/90' : 'text-warm-text/90'}`}>{iPart}</em>;
          }
          return iPart;
        });
      });
    });
  };

  const blocks: Array<
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'h1'; text: string }
    | { type: 'h2'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'hr' }
    | { type: 'bullet'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'spacer' }
  > = [];

  let i = 0;
  while (i < rawLines.length) {
    const trimmed = rawLines[i].trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < rawLines.length) {
      const nextTrimmed = rawLines[i + 1].trim();
      if (nextTrimmed.startsWith('|') && nextTrimmed.includes('---')) {
        const headerCells = trimmed
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());
        
        const tableRows: string[][] = [];
        i += 2;

        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          const rowCells = rawLines[i]
            .trim()
            .split('|')
            .slice(1, -1)
            .map(c => c.trim());
          tableRows.push(rowCells);
          i++;
        }

        blocks.push({ type: 'table', headers: headerCells, rows: tableRows });
        continue;
      }
    }

    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'hr' });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({ type: 'bullet', text: trimmed.slice(2) });
    } else if (!trimmed) {
      blocks.push({ type: 'spacer' });
    } else {
      blocks.push({ type: 'paragraph', text: rawLines[i] });
    }

    i++;
  }

  return blocks.map((block, bIdx) => {
    if (block.type === 'hr') {
      return <hr key={`hr-${bIdx}`} className="my-2.5 border-warm-border/60" />;
    }
    if (block.type === 'spacer') {
      return <div key={`sp-${bIdx}`} className="h-1.5" />;
    }
    if (block.type === 'h1') {
      return (
        <h3 key={`h1-${bIdx}`} className={`text-[13.5px] font-bold mt-2 mb-1 uppercase font-mono ${isUser ? 'text-brand-indigo' : 'text-warm-text'}`}>
          {processInline(block.text)}
        </h3>
      );
    }
    if (block.type === 'h2') {
      return (
        <h4 key={`h2-${bIdx}`} className={`text-[13px] font-semibold mt-2 mb-0.5 font-sans ${isUser ? 'text-brand-indigo' : 'text-warm-text'}`}>
          {processInline(block.text)}
        </h4>
      );
    }
    if (block.type === 'h3') {
      return (
        <h5 key={`h3-${bIdx}`} className={`text-[12px] font-semibold mt-1.5 mb-0.5 font-sans ${isUser ? 'text-brand-indigo' : 'text-warm-text'}`}>
          {processInline(block.text)}
        </h5>
      );
    }
    if (block.type === 'bullet') {
      return (
        <div key={`b-${bIdx}`} className="flex items-start gap-2 my-0.5 pl-1">
          <span className="text-brand-indigo font-bold select-none text-[12px] leading-tight">•</span>
          <div className={`flex-1 text-[12px] leading-relaxed ${isUser ? 'text-brand-indigo/90' : 'text-warm-text/90'}`}>
            {processInline(block.text)}
          </div>
        </div>
      );
    }
    if (block.type === 'table') {
      return (
        <div key={`tbl-${bIdx}`} className="my-2 overflow-x-auto rounded-xl border border-warm-border bg-white shadow-2xs">
          <table className="w-full text-left border-collapse text-[11px] font-sans">
            <thead>
              <tr className="bg-[#FAF9F7] border-b border-warm-border text-[10px] font-mono uppercase text-warm-text font-bold">
                {block.headers.map((h, hIdx) => (
                  <th key={hIdx} className={`py-2 px-2.5 ${hIdx > 0 ? 'text-right' : 'text-left'}`}>
                    {processInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/30">
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#FFF2EE]/25 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-1.5 px-2.5 text-warm-text ${
                        cIdx > 0 ? 'text-right font-mono font-medium' : 'text-left font-sans'
                      }`}
                    >
                      {cell.includes('✓') ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#2C6E25]">
                          {processInline(cell)}
                        </span>
                      ) : cell.startsWith('+') ? (
                        <span className="font-bold text-[#2C6E25]">{processInline(cell)}</span>
                      ) : (
                        processInline(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <div key={`p-${bIdx}`} className={`text-[12px] leading-relaxed ${isUser ? 'text-brand-indigo' : 'text-warm-text'}`}>
        {processInline(block.text)}
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
    setLatestForecast,
    addForecastScenario,
    setForecastScenarios,
    latestForecast,
    egrTarget,
    setPipelineStage,
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

    // ── Full scenario: step through Forecast → IPS Engine → World Model ─────
    if (isFullScenarioRequest(userText)) {
      addMessage({ role: 'user', content: userText });
      setIsOptimizing(true);

      let targetBatchId = activeBatchId;
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

      const batchQ  = targetBatchId ? `?batch=${targetBatchId}` : '';
      const batchSep = batchQ ? '&' : '?';
      const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
      // Snapshot existing scenarios for this batch before the API call
      const batchModelsBefore = worldModels.filter(wm => wm.batch_id === targetBatchId);
      const batchForecast = (latestForecast?.batch_id === targetBatchId) ? latestForecast : null;
      const lastWM = batchModelsBefore[batchModelsBefore.length - 1];

      // If user gave explicit period/rate → use their raw message.
      // Otherwise (e.g. "run another scenario") → reuse existing forecast + rotate strategy.
      const agentPrompt = hasExplicitPipelineParams(userText)
        ? userText
        : buildFullScenarioPrompt({
            hasForecast: !!batchForecast,
            forecastValue: batchForecast?.forecasted_value,
            forecastPeriod: batchForecast?.target_time,
            lastStrategy: lastWM?.growth_strategy,
            egrTarget,
          });

      try {
        // Navigate to forecast page (computing animation plays while API runs)
        setPipelineStage('forecast');
        navigate(`/dashboard/forecast${batchQ}`);

        const apiCall = api.agentChat({ message: agentPrompt, batch_id: targetBatchId, conversation_history: historyRef.current });
        const [res] = await Promise.all([apiCall, wait(3000)]);

        // Store results
        const wm = res.world_model ?? null;
        if (wm) addWorldModel(wm);
        const replyText = res.reply || '';
        // Store original user text in history (not built prompt) for clean context
        historyRef.current = [...historyRef.current, { role: 'user', content: userText }, { role: 'assistant', content: replyText }];
        addMessage({ role: 'ai', content: replyText });

        if (syncBackendState) await syncBackendState();

        // Cache forecast data so ForecastPage renders instantly when stage clears
        try {
          const saved = await api.getForecastScenarios();
          if (saved?.has_results && saved.scenarios?.length > 0) {
            setForecastScenarios(saved.scenarios as any);
            setForecastPageCache(saved as any);
          }
        } catch {}

        // Step 1 — Show Forecast Results (2.5 s)
        setPipelineStage(null);
        await wait(2500);

        // Step 2 — IPS Engine (2.5 s)
        navigate(`/dashboard/ips-engine${batchQ}`);
        await wait(2500);

        // Step 3 — World Model
        navigate(`/dashboard/world-model${batchQ}`);

        // Step 4 — Compare (if batch now has >1 scenario)
        const totalAfter = batchModelsBefore.length + (wm ? 1 : 0);
        if (totalAfter > 1) {
          await wait(2500);
          navigate(`/dashboard/world-model${batchQ}${batchSep}view=compare`);
        }
      } catch (err: any) {
        setPipelineStage(null);
        const detail = err?.response?.data?.detail || err?.message || 'Full scenario failed';
        addMessage({ role: 'ai', content: `Error: ${detail}` });
      } finally {
        setIsOptimizing(false);
      }
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    addMessage({ role: 'user', content: userText });

    try {
      setIsOptimizing(true);

      let targetBatchId = activeBatchId;
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

      // Clean away any technical pipeline/load dumps and internal phase templates for a super conversational tone
      let replyContent = (reply || '')
        .replace(/━━━\s*PHASE\s*\d.*?━━━/gis, '')
        .replace(/PHASE\s*\d\s*[—–-]\s*(THINK|CLARIFY|PLAN|EXECUTE).*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
        .replace(/──\s*DATA\s*(SCIENTIST|ENGINEER)\s*LENS\s*──.*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
        .replace(/DATA\s*(SCIENTIST|ENGINEER)\s*LENS:.*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
        .replace(/\*Executed:\*.*$/gm, '')
        .replace(/Vectorising \d+\s*\/\s*\d+ fields/gi, '')
        .replace(/Running pipeline step \d+/gi, '')
        .trim();

      const toolsUsed = res.tools_used || [];

      // Flow detection — determines routing and what to refresh
      const flow = detectFlow(toolsUsed);

      // World model (Flow B or C)
      const wm = res.world_model ?? null;
      if (wm) addWorldModel(wm);

      addMessage({ role: 'ai', content: replyContent });

      if (syncBackendState) {
        await syncBackendState();
      }

      // Forecast refresh (Flow A always; Flow C only if forecast wasn't skipped)
      if (shouldRefreshForecast(toolsUsed, res.forecast?.forecast_skipped)) {
        try {
          const saved = await api.getForecastScenarios();
          if (saved.has_results && saved.scenarios.length > 0) {
            setForecastScenarios(saved.scenarios.map(s => ({
              scenario_number: s.scenario_number,
              target_time: s.target_period,
              forecasted_value: s.forecasted_value,
              last_known_value: s.comparison_value ?? undefined,
              predicted_growth_rate_percentage: s.predicted_growth_rate_percentage ?? '',
              predicted_growth_rate: s.predicted_growth_rate ?? undefined,
              comparison_period: s.comparison_period ?? undefined,
              comparison_value: s.comparison_value ?? undefined,
            })) as any);
            setLatestForecast(undefined as any);
          }
        } catch {}
      }

      // Navigate to the page that shows this turn's result
      const batchQ = activeBatchId ? `?batch=${activeBatchId}` : '';
      let navRoute: string | null = null;
      if (flow === 'C' || flow === 'B' || wm) {
        navRoute = `/dashboard/world-model${batchQ}`;
      } else {
        const base = getRouteForTools(toolsUsed);
        if (base) {
          const sep = base.includes('?') ? '&' : '?';
          navRoute = activeBatchId ? `${base}${sep}batch=${activeBatchId}` : base;
        }
      }
      if (navRoute) navigate(navRoute);
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
        navigate('/dashboard/world-model');
      });
    }
  };

  const { rightSidebarOpen } = useStore();
  const isThinking = conversation.some((m) => m.isTyping) || isOptimizing;

  if (selectedProvenanceMetric !== null) {
    return (
      <aside className={`fixed lg:static top-13 lg:top-0 right-0 z-40 w-[360px] sm:w-[400px] md:w-[420px] xl:w-[450px] max-w-[85vw] h-full bg-white lg:bg-white/40 backdrop-blur-md border-l border-warm-border/50 flex flex-col justify-between isolate shrink-0 font-sans transition-transform duration-300 ease-in-out ${
        rightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <ProvenanceInspector />
      </aside>
    );
  }

  return (
    <aside className={`fixed lg:static top-13 lg:top-0 right-0 z-40 w-[360px] sm:w-[400px] md:w-[420px] xl:w-[450px] max-w-[85vw] h-full bg-white lg:bg-white/40 backdrop-blur-md border-l border-warm-border/50 flex flex-col justify-between isolate shrink-0 font-sans transition-transform duration-300 ease-in-out ${
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

                  {renderFormattedText((msg.content || '').replace(/^Hi there!/, `Hi ${firstName}.`), !isAI)}

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
            useStore.setState({
              worldModels: [],
              optimisationResult: null,
              scenarios: []
            });
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
