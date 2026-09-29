import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useStore, buildVisualTableFromContent, setForecastPageCache } from '../../store/useStore';
import { Sparkles, Send, RefreshCw, Paperclip, Bot, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProvenanceInspector from './ProvenanceInspector';
import api from '../../api';
import {
  getRouteForTools,
  detectFlow,
  shouldRefreshForecast,
  isFullScenarioRequest,
  hasExplicitPipelineParams,
  buildFullScenarioPrompt,
} from '../../lib/agentNavigation';
import { updateWorkspaceTableWithScenario } from '../../lib/workspaceTableUtils';
import type { ConversationTurn } from '../../types/api';

const renderFormattedText = (content: string | undefined | null, isUser = false) => {
  if (!content) return null;
  const rawLines = content.split('\n');

  const processInline = (text: string) => {
    const boldParts = text.split(/\*\*(.*?)\*\*/g);
    return boldParts.map((bPart, bIdx) => {
      if (bIdx % 2 === 1) {
        return (
          <strong
            key={`b-${bIdx}`}
            className={`font-bold ${isUser ? 'text-white' : 'text-warm-text'}`}
          >
            {bPart}
          </strong>
        );
      }

      const codeParts = bPart.split(/`([^`]+)`/g);
      return codeParts.map((cPart, cIdx) => {
        if (cIdx % 2 === 1) {
          return (
            <code
              key={`c-${cIdx}`}
              className={`px-1.5 py-0.5 mx-0.5 rounded text-[11.5px] font-mono font-semibold ${
                isUser
                  ? 'bg-white/20 text-white border border-white/20'
                  : 'bg-white border border-warm-border text-warm-text'
              }`}
            >
              {cPart}
            </code>
          );
        }

        const italicParts = cPart.split(/\*([^*]+)\*/g);
        return italicParts.map((iPart, iIdx) => {
          if (iIdx % 2 === 1) {
            return (
              <em
                key={`i-${iIdx}`}
                className={`italic ${isUser ? 'text-white/90' : 'text-warm-text/90'}`}
              >
                {iPart}
              </em>
            );
          }
          return iPart;
        });
      });
    });
  };

  type Block =
    | { type: 'code'; language?: string; text: string }
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'h1'; text: string }
    | { type: 'h2'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'section-header'; text: string }
    | { type: 'hr' }
    | { type: 'bullet'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'spacer' };

  const blocks: Block[] = [];

  const isAsciiBoxLine = (line: string) => {
    const t = line.trim();
    if (!t) return false;
    if (/[┌└├│─┼┬┴┐┘═║╔╗╚╝╠╣╦╩╬]/.test(t)) return true;
    if (/^[+|][-=_+]{3,}[+|]?$/.test(t)) return true;
    if (/^\s*[|]?\s*(?:[↓⬇→←↑▲▼]|-->|==>|v|\|\s*v\s*\|)\s*[|]?\s*$/.test(t)) return true;
    if (
      t.startsWith('|') &&
      (t.endsWith('|') ||
        t.includes('| •') ||
        t.includes('| -') ||
        t.includes('INPUT:') ||
        t.includes('VECTORISATION') ||
        t.includes('STRATEGY') ||
        t.includes('OUTPUT:') ||
        t.includes('Baseline Total:') ||
        t.includes('Flatten hierarchical') ||
        t.includes('Identify bottom'))
    ) {
      return true;
    }
    return false;
  };

  let i = 0;
  while (i < rawLines.length) {
    const raw = rawLines[i];
    const trimmed = raw.trim();

    // 1. Fenced code block ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length) i++;
      blocks.push({ type: 'code', language: language || 'text', text: codeLines.join('\n') });
      continue;
    }

    // 2. Markdown table
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < rawLines.length) {
      const nextTrimmed = rawLines[i + 1].trim();
      if (nextTrimmed.startsWith('|') && nextTrimmed.includes('---')) {
        const headerCells = trimmed
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());

        const tableRows: string[][] = [];
        i += 2;

        while (
          i < rawLines.length &&
          rawLines[i].trim().startsWith('|') &&
          rawLines[i].trim().endsWith('|')
        ) {
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

    // 3. Unfenced ASCII diagram / pipeline box block
    if (isAsciiBoxLine(raw)) {
      const diagramLines: string[] = [];
      while (
        i < rawLines.length &&
        (isAsciiBoxLine(rawLines[i]) ||
          (!rawLines[i].trim() && i + 1 < rawLines.length && isAsciiBoxLine(rawLines[i + 1])))
      ) {
        diagramLines.push(rawLines[i]);
        i++;
      }
      if (diagramLines.length > 0) {
        blocks.push({ type: 'code', language: 'diagram', text: diagramLines.join('\n') });
        continue;
      }
    }

    // 4. Section headers like "6. FULL WORLD MODEL SUMMARY" or "### Header"
    if (/^\d+\.\s+[A-Z0-9\s—–:-]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'section-header', text: trimmed });
    } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'hr' });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
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
      return (
        <hr
          key={`hr-${bIdx}`}
          className={`my-3 ${isUser ? 'border-white/20' : 'border-warm-border/60'}`}
        />
      );
    }
    if (block.type === 'spacer') {
      return <div key={`sp-${bIdx}`} className="h-1.5" />;
    }
    if (block.type === 'code') {
      return (
        <div
          key={`code-${bIdx}`}
          className={`my-2.5 rounded-xl border overflow-hidden shadow-2xs select-text ${
            isUser ? 'border-white/20 bg-white/10' : 'border-warm-border bg-[#FAF9F7]'
          }`}
        >
          {block.language && block.language !== 'text' && block.language !== 'diagram' && (
            <div
              className={`px-3 py-1 border-b text-[9.5px] font-mono font-bold uppercase ${
                isUser ? 'bg-white/10 border-white/20 text-white/80' : 'bg-warm-bg/70 border-warm-border/50 text-warm-muted'
              }`}
            >
              {block.language}
            </div>
          )}
          <pre
            className={`p-3 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre font-medium custom-scrollbar ${
              isUser ? 'text-white' : 'text-warm-text'
            }`}
          >
            <code>{block.text}</code>
          </pre>
        </div>
      );
    }
    if (block.type === 'section-header') {
      return (
        <div
          key={`sh-${bIdx}`}
          className={`text-[13px] font-bold font-mono uppercase tracking-wide mt-3 mb-1 pt-2 border-t ${
            isUser ? 'text-white border-white/20' : 'text-warm-text border-warm-border/40'
          }`}
        >
          {processInline(block.text)}
        </div>
      );
    }
    if (block.type === 'h1') {
      const isResults = block.text.includes('RESULTS');
      return (
        <div key={`h1-${bIdx}`} className="flex items-center gap-2 mt-2.5 mb-1.5">
          {isResults && <span className="h-2.5 w-2.5 rounded-full bg-[#2C6E25] animate-pulse shrink-0" />}
          <h3 className={`text-[13.5px] font-black tracking-tight uppercase font-mono ${isUser ? 'text-white' : 'text-warm-text'}`}>
            {processInline(block.text)}
          </h3>
        </div>
      );
    }
    if (block.type === 'h2') {
      return (
        <h4 key={`h2-${bIdx}`} className={`text-[13px] font-bold mt-2 mb-1 font-sans ${isUser ? 'text-white' : 'text-warm-text'}`}>
          {processInline(block.text)}
        </h4>
      );
    }
    if (block.type === 'h3') {
      return (
        <h5 key={`h3-${bIdx}`} className={`text-[12px] font-bold mt-1.5 mb-0.5 font-sans ${isUser ? 'text-white' : 'text-warm-text'}`}>
          {processInline(block.text)}
        </h5>
      );
    }
    if (block.type === 'bullet') {
      return (
        <div key={`b-${bIdx}`} className="flex items-start gap-2 my-1 pl-1">
          <span className={`${isUser ? 'text-white/80' : 'text-[#FF5A1F]'} font-bold select-none text-[12px] leading-tight`}>•</span>
          <div className={`flex-1 text-[12px] leading-relaxed ${isUser ? 'text-white/95' : 'text-warm-text/90'}`}>
            {processInline(block.text)}
          </div>
        </div>
      );
    }
    if (block.type === 'table') {
      return (
        <div key={`tbl-${bIdx}`} className={`my-2.5 overflow-x-auto rounded-xl border ${isUser ? 'border-white/20 bg-white/10' : 'border-warm-border bg-white'} shadow-2xs`}>
          <table className="w-full text-left border-collapse text-[11px] font-sans">
            <thead>
              <tr className={`${isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-[#FAF9F7] border-warm-border text-warm-text'} border-b text-[10px] font-mono uppercase font-bold`}>
                {block.headers.map((h, hIdx) => (
                  <th key={hIdx} className={`py-2 px-2.5 ${hIdx > 0 ? 'text-right' : 'text-left'}`}>
                    {processInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={isUser ? "divide-y divide-white/10" : "divide-y divide-warm-border/30"}>
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className={isUser ? "hover:bg-white/10 transition-colors" : "hover:bg-[#FFF2EE]/25 transition-colors"}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-1.5 px-2.5 ${isUser ? 'text-white' : 'text-warm-text'} ${
                        cIdx > 0 ? 'text-right font-mono font-medium' : 'text-left font-sans'
                      }`}
                    >
                      {cell.includes('✓') ? (
                        <span className={`inline-flex items-center gap-1 font-bold ${isUser ? 'text-emerald-300' : 'text-[#2C6E25]'}`}>
                          {processInline(cell)}
                        </span>
                      ) : cell.startsWith('+') ? (
                        <span className={`font-bold ${isUser ? 'text-emerald-300' : 'text-[#2C6E25]'}`}>{processInline(cell)}</span>
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
      <div key={`p-${bIdx}`} className={`text-[12.5px] leading-relaxed ${isUser ? 'text-white' : 'text-warm-text'}`}>
        {processInline(block.text)}
      </div>
    );
  });
};

const cleanAgentReply = (rawText: string): string => {
  if (!rawText) return '';
  if (
    /^(THINK|CLARIFY|PLAN|EXECUTE|\s*zation request)/i.test(rawText.trim()) ||
    rawText.includes('zation request') ||
    rawText.includes('How far forward would you like to forecast?') ||
    rawText.includes('Current data spans')
  ) {
    return '';
  }
  return rawText
    .replace(/━━━\s*PHASE\s*\d.*?━━━/gis, '')
    .replace(/PHASE\s*\d\s*[—–-]\s*(THINK|CLARIFY|PLAN|EXECUTE).*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
    .replace(/──\s*DATA\s*(SCIENTIST|ENGINEER)\s*LENS\s*──.*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
    .replace(/DATA\s*(SCIENTIST|ENGINEER)\s*LENS:.*?(?=\n\n|\n[A-Z]|\Z)/gis, '')
    .replace(/\*Executed:\*.*$/gm, '')
    .replace(/Vectorising \d+\s*\/\s*\d+ fields/gi, '')
    .replace(/Running pipeline step \d+/gi, '')
    .trim();
};

export default function LeftPanel() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';

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
    applyTableWhatIf,
    resetTableData,
    setVisualTable,
    workspaceTable,
    setWorkspaceTable,
    setTableWorkspaceViewMode,
    setScenarioCompare,
    leftSidebarOpen,
  } = useStore();

  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<ConversationTurn[]>([]);

  // Parse CSV string helper
  const parseCsvString = (csvText: string): Record<string, any>[] => {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const res: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          res.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      res.push(current.trim());
      return res.map(s => s.replace(/^"|"$/g, '').trim());
    };

    const headers = parseLine(lines[0]);
    const rows: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;
      const rowObj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        const v = vals[idx] ?? '';
        const num = parseFloat(v.replace(/[$,]/g, ''));
        rowObj[h] = (!isNaN(num) && !isNaN(Number(v.replace(/[$,]/g, '')))) ? num : v;
      });
      rows.push(rowObj);
    }

    return rows;
  };

  const updateWorkspaceTableForScenario = (prompt: string) => {
    const currentWsTable = useStore.getState().workspaceTable;
    if (!currentWsTable || !currentWsTable.columns || currentWsTable.columns.length === 0) return;

    const updated = updateWorkspaceTableWithScenario(currentWsTable, prompt);
    if (updated) {
      setWorkspaceTable(updated);
    }
  };

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    // Reactively update what-if scenario values in workspace table
    updateWorkspaceTableForScenario(userText);

    // Apply table what if if matching percentage
    const lower = userText.toLowerCase();
    if (lower.includes('+5%') || lower.includes('accelerat')) {
      applyTableWhatIf(5, '+5% Accelerated Growth Scenario');
    } else if (lower.includes('+10%') || lower.includes('10%') || lower.includes('expansion')) {
      applyTableWhatIf(10, '+10% Aggressive Expansion Scenario');
    } else if (lower.includes('-5%') || lower.includes('soft landing') || lower.includes('contraction')) {
      applyTableWhatIf(-5, '-5% Soft Landing Scenario');
    } else if (lower.includes('reset') || lower.includes('baseline')) {
      applyTableWhatIf(0, 'Baseline Model');
    }

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

      const batchQ = targetBatchId ? `?batch=${targetBatchId}` : '';
      const batchSep = batchQ ? '&' : '?';
      const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
      const batchModelsBefore = worldModels.filter(wm => wm.batch_id === targetBatchId);
      const batchForecast = (latestForecast?.batch_id === targetBatchId) ? latestForecast : null;
      const lastWM = batchModelsBefore[batchModelsBefore.length - 1];

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
        setPipelineStage('forecast');
        navigate(`/dashboard/forecast${batchQ}`);

        const apiCall = api.agentChat({ message: agentPrompt, batch_id: targetBatchId, conversation_history: historyRef.current });
        const [res] = await Promise.all([apiCall, wait(3000)]);

        const wm = res.world_model ?? null;
        if (wm) addWorldModel(wm);
        const replyText = res.reply || '';
        historyRef.current = [...historyRef.current, { role: 'user', content: userText }, { role: 'assistant', content: replyText }];
        addMessage({ role: 'ai', content: replyText });

        if (syncBackendState) await syncBackendState();

        try {
          const saved = await api.getForecastScenarios();
          if (saved?.has_results && saved.scenarios?.length > 0) {
            setForecastScenarios(saved.scenarios as any);
            setForecastPageCache(saved as any);
          }
        } catch {}

        setPipelineStage(null);
        await wait(2500);

        navigate(`/dashboard/ips-engine${batchQ}`);
        await wait(2500);

        navigate(`/dashboard/world-model${batchQ}`);

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
        conversation_history: historyRef.current,
      });

      const reply = res.reply || res.error || 'No response from agent.';
      const replyContent = cleanAgentReply(reply) || reply;

      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userText },
        { role: 'assistant', content: replyContent },
      ];

      const toolsUsed = res.tools_used || [];
      const flow = detectFlow(toolsUsed);

      const wm = res.world_model ?? null;
      if (wm) addWorldModel(wm);

      if (res?.workspace_table && res.workspace_table.columns && res.workspace_table.columns.length > 0) {
        setWorkspaceTable(res.workspace_table);
      }
      if (res?.forecast?.comparison) {
        setScenarioCompare(res.forecast.comparison);
      }

      addMessage({ role: 'ai', content: replyContent });

      if (syncBackendState) {
        await syncBackendState();
      }

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

      const isExplicitWorldModelRequest = userText.toLowerCase().includes('world model') || userText.toLowerCase().includes('causal tree') || userText.toLowerCase().includes('driver matrix');
      if (isExplicitWorldModelRequest) {
        setTableWorkspaceViewMode('world_model');
      }

      // If user is not on conversation tab, navigate to the page that shows this turn's result
      if (tab && tab !== 'conversation') {
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
      }
    } catch (err: any) {
      console.warn('Agent call error in LeftPanel:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Something went wrong. Please try again.';
      addMessage({ role: 'ai', content: `Error: ${detail}` });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Support listening to custom events from other components (e.g. VisualTableWorkspace onWhatIfPrompt)
  useEffect(() => {
    const handleCustomPrompt = (e: CustomEvent<string>) => {
      if (e.detail) {
        void sendMessage(e.detail);
      }
    };
    window.addEventListener('advisor-send-message' as any, handleCustomPrompt);
    return () => window.removeEventListener('advisor-send-message' as any, handleCustomPrompt);
  }, [activeBatchId, worldModels, latestForecast, egrTarget]);

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
  }, [conversation, isOptimizing]);

  const handleSend = () => {
    if (!inputVal.trim() || isOptimizing) return;
    const text = inputVal.trim();
    setInputVal('');
    void sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizing(true);
      useStore.setState({
        worldModels: [],
        optimisationResult: null,
        scenarios: [],
        visualTable: {
          years: { historical: [], projected: [] },
          growthMultiplier: 1.0,
          activeScenarioName: `Ingesting ${file.name}...`,
          rows: [],
        },
        workspaceTable: null,
      });

      let parsedRows: Record<string, any>[] = [];
      try {
        const text = await file.text();
        parsedRows = parseCsvString(text);
      } catch (parseErr) {
        console.warn('Client CSV parse notice:', parseErr);
      }

      const res = await api.uploadFile(file);

      if (syncBackendState) {
        await syncBackendState();
      }

      if (parsedRows.length > 0) {
        const directVisualTable = buildVisualTableFromContent(parsedRows, file.name);
        setVisualTable(directVisualTable);

        const keys = Object.keys(parsedRows[0]);
        const itemKey = keys.find(k => ['item', 'period', 'quarter', 'year', 'date', 'region', 'segment', 'metric', 'indicator', 'name'].includes(k.toLowerCase())) || keys[0];
        const valKeys = keys.filter(k => k !== itemKey);

        const realCols: import('../../types/api').WorkspaceTableColumn[] = [
          { id: 'item', name: itemKey.charAt(0).toUpperCase() + itemKey.slice(1), type: 'text' },
          ...valKeys.map(k => ({
            id: k,
            name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: (typeof parsedRows[0][k] === 'number' ? 'number' : typeof parsedRows[0][k] === 'boolean' ? 'boolean' : 'text') as any,
          })),
        ];

        const realRows = parsedRows.map((r, idx) => ({
          id: `rec-${idx}`,
          item: String(r[itemKey] ?? `Record ${idx + 1}`),
          ...r,
        }));

        setWorkspaceTable({
          columns: realCols,
          rows: realRows,
          version: 1,
          updated_at: new Date().toISOString(),
        });
      }

      setTableWorkspaceViewMode('grid');

      const rowCount = res?.data?.row_count || parsedRows.length;
      const colCount = res?.data?.column_count || (parsedRows[0] ? Object.keys(parsedRows[0]).length : 0);

      const aiReply = `# Dataset Ingested: ${file.name} ✓\n\nI have loaded **${file.name}** (${rowCount} records, ${colCount} data dimensions) into your live workspace.\n\n- **Zero Leftover Data**: Workspace initialized from your uploaded file.\n- **Metrics**: Formatted by categories and time periods.\n\n### Recommended Actions:\n- Ask *"What do you think?"* to review top drivers.\n- Ask *"What if growth shifts +5%?"* to test expansion assumptions.`;

      addMessage({
        role: 'ai',
        content: aiReply,
        chips: [
          `Forecast +5%`,
          `Optimize +10%`,
          `Forecast -5%`,
          `What do you think?`,
        ],
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'File upload failed';
      addMessage({
        role: 'ai',
        content: `File upload notice: ${detail}`,
      });
    } finally {
      setIsOptimizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isThinking = conversation.some((m) => m.isTyping) || isOptimizing;

  // Next step navigation target
  const getNextStepInfo = () => {
    if (!tab || tab === 'conversation') {
      return {
        label: 'Dimensions',
        target: `/dashboard/dimensions${activeBatchId ? `?batch=${activeBatchId}` : ''}`,
      };
    }
    if (tab === 'dimensions' || tab === 'blueprint' || tab === 'ecr-build' || tab === 'ecr-batch') {
      return {
        label: 'Scenarios',
        target: `/dashboard/scenarios${activeBatchId ? `?batch=${activeBatchId}` : ''}`,
      };
    }
    if (tab === 'scenarios' || tab === 'ips-engine') {
      return {
        label: 'World Model',
        target: `/dashboard/world-model${activeBatchId ? `?batch=${activeBatchId}` : ''}`,
      };
    }
    return {
      label: 'Conversation',
      target: `/dashboard/conversation${activeBatchId ? `?batch=${activeBatchId}` : ''}`,
    };
  };

  const nextStep = getNextStepInfo();

  if (selectedProvenanceMetric !== null) {
    return (
      <aside className={`fixed lg:static top-13 lg:top-0 left-0 z-40 w-[340px] sm:w-[380px] md:w-[420px] xl:w-[460px] 2xl:w-[500px] max-w-[85vw] h-full bg-white border-r border-warm-border/50 flex flex-col justify-between isolate shrink-0 font-sans transition-transform duration-300 ease-in-out ${
        leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <ProvenanceInspector />
      </aside>
    );
  }

  return (
    <aside className={`fixed lg:static top-13 lg:top-0 left-0 z-40 w-[340px] sm:w-[380px] md:w-[420px] xl:w-[460px] 2xl:w-[500px] max-w-[85vw] h-full bg-white border-r border-warm-border/50 flex flex-col justify-between isolate shrink-0 font-sans transition-transform duration-300 ease-in-out shadow-sm ${
      leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`}>
      {/* Header Matching Screenshot 2 */}
      <div className="h-13 border-b border-warm-border/50 px-4 sm:px-5 flex items-center justify-between bg-white/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center shadow-2xs">
            <Bot className="h-4.5 w-4.5 text-[#FF5A1F]" />
          </div>
          <div>
            <span className="text-[13px] font-bold text-warm-text block leading-tight">
              Inferalytics Advisor
            </span>
            <span className="text-[10px] text-warm-muted font-mono font-medium">
              Live Advisory Session
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(nextStep.target)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF2EE] hover:bg-[#FFE5DC] text-[#FF5A1F] text-[11px] font-bold border border-[#FFD4C5] transition-all cursor-pointer shadow-2xs"
            title={`Proceed to ${nextStep.label}`}
          >
            <span>{nextStep.label}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              useStore.setState({
                conversation: [],
                workspaceTable: null,
                visualTable: {
                  years: { historical: [], projected: [] },
                  growthMultiplier: 1.0,
                  activeScenarioName: 'Baseline Model',
                  rows: [],
                },
                worldModels: [],
              });
              historyRef.current = [];
              resetTableData();
            }}
            className="p-1.5 rounded-lg hover:bg-warm-bg text-warm-muted hover:text-warm-text transition-colors cursor-pointer"
            title="Reset conversation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 custom-scrollbar min-h-0 bg-[#FCFBF9]">
        {conversation.length === 0 && (
          <div className="flex flex-col gap-3 my-auto text-center py-6 px-2">
            <div className="h-10 w-10 rounded-2xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="h-5 w-5 text-[#FF5A1F]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-bold text-warm-text">
                How can I help you today?
              </span>
              <span className="text-[12px] text-warm-muted leading-relaxed max-w-xs mx-auto">
                Ask a question, request scenario projections, or attach a dataset to begin.
              </span>
            </div>
          </div>
        )}

        {conversation.map((msg, idx) => {
          const isAI = msg.role === 'ai';
          return (
            <div
              key={idx}
              className={`flex flex-col gap-1 max-w-[94%] animate-float-up ${
                isAI ? 'self-start' : 'self-end'
              }`}
            >
              {msg.isTyping ? (
                <div className="bg-white border border-warm-border px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-[#FF5A1F] rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#FF5A1F] rounded-full animate-typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-[#FF5A1F] rounded-full animate-typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {!isAI && (
                    <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider font-mono text-right pr-1">
                      {displayName}
                    </span>
                  )}
                  <div
                    className={`group relative px-3.5 py-3 text-[12.5px] leading-relaxed shadow-xs border select-text selection:bg-[#FF5A1F] selection:text-white max-w-full overflow-hidden ${
                      isAI
                        ? 'bg-[#FAF9F7] border-warm-border text-warm-text rounded-2xl rounded-tl-sm'
                        : 'bg-[#1A1918] border-[#1A1918] text-white rounded-2xl rounded-tr-sm shadow-sm'
                    }`}
                  >
                    {/* Copy Button on Hover */}
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content || '')}
                      title="Copy message"
                      className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-[10px] font-sans flex items-center gap-1 shadow-xs cursor-pointer ${
                        isAI ? 'bg-white hover:bg-warm-bg text-warm-muted hover:text-warm-text border border-warm-border/60' : 'bg-white/10 hover:bg-white/20 text-white/80'
                      }`}
                    >
                      <span>Copy</span>
                    </button>

                    {renderFormattedText(msg.content, !isAI)}

                    {/* Suggestion Chips */}
                    {isAI && msg.chips && msg.chips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-warm-border/50">
                        {msg.chips.map((chip, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => void sendMessage(chip.replace(/^\+\s*/, ''))}
                            className="px-2.5 py-1 rounded-full bg-white hover:bg-[#FFF2EE] text-warm-text hover:text-[#FF5A1F] text-[11px] font-medium transition-colors cursor-pointer border border-warm-border hover:border-[#FFD4C5] shadow-2xs"
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
                        <div className={`mt-2.5 p-2.5 border rounded-xl flex flex-col gap-2 shadow-sm transition-all ${
                          isDone ? 'bg-secondary/40 border-warm-border/60 opacity-75' : 'bg-sage-light border-sage-border'
                        }`}>
                          <span className="text-[11px] font-semibold text-warm-text">
                            {msg.banner.label}
                          </span>
                          <button
                            onClick={() => handleBannerAction(msg.banner!.actionType)}
                            disabled={isThinking || isDone}
                            className={`w-full py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                              isDone
                                ? 'bg-warm-bg border border-warm-border text-warm-muted cursor-not-allowed'
                                : 'bg-sage hover:bg-sage/90 text-white cursor-pointer'
                            }`}
                          >
                            {isThinking && !isDone ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : null}
                            {isDone ? `✓ ${msg.banner.buttonText.replace(' →', '')} Executed` : msg.banner.buttonText}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Animated Thinking Bubble */}
        {isThinking && (
          <div className="flex flex-col gap-1 max-w-[90%] self-start animate-float-up">
            <div className="px-3.5 py-2.5 bg-[#FAF9F7] border border-warm-border text-warm-text rounded-2xl rounded-tl-sm shadow-2xs flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-[#FF5A1F] animate-spin shrink-0" />
              <span className="text-[12px] font-medium text-warm-muted">AI is processing request...</span>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-3.5 py-2 border-t border-warm-border/50 bg-white flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-bold text-warm-muted uppercase mr-1 font-mono">Ask AI:</span>
        {[
          'Forecast +5%',
          'Optimize +10%',
          'Forecast -5%',
          'Recommend',
          'Reset',
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => void sendMessage(chip)}
            disabled={isThinking}
            className="px-2.5 py-1 rounded-full bg-[#FAF9F7] hover:bg-[#FFF2EE] border border-warm-border text-[11px] font-medium text-warm-text hover:text-[#FF5A1F] hover:border-[#FFD4C5] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls,.docx,.doc,.json"
        className="hidden"
      />

      {/* Input Composer */}
      <div className="p-3 border-t border-warm-border/50 bg-white shrink-0">
        <div className="relative border border-warm-border bg-[#FAF9F7]/70 rounded-xl shadow-2xs focus-within:ring-2 focus-within:ring-[#FF5A1F]/30 focus-within:border-[#FF5A1F] focus-within:bg-white transition-all overflow-hidden flex flex-col justify-between min-h-[70px]">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            placeholder="Ask a question or test 'what-if'..."
            className="w-full px-3 py-2 text-[12.5px] text-warm-text bg-transparent placeholder-warm-muted/70 border-none outline-none focus:ring-0 resize-none max-h-16 disabled:opacity-50 font-sans"
          />
          <div className="px-2.5 pb-1.5 flex justify-between items-center bg-transparent">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className="p-1 rounded-lg text-warm-muted hover:text-warm-text hover:bg-warm-bg transition-colors cursor-pointer disabled:opacity-50"
                title="Attach CSV, Excel, or JSON data"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <span className="text-[9px] text-warm-muted/70 font-mono font-medium">
                ⏎ to send · ⇧⏎ for new line
              </span>
            </div>
            <button
              onClick={handleSend}
              disabled={!inputVal.trim() || isThinking}
              className={`h-6.5 w-6.5 rounded-lg flex items-center justify-center transition-all shadow-xs ${
                inputVal.trim() && !isThinking
                  ? 'bg-[#FF5A1F] text-white hover:opacity-90 cursor-pointer'
                  : 'bg-warm-bg text-warm-muted pointer-events-none'
              }`}
            >
              {isThinking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
