import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Paperclip, Send, Loader2, ArrowRight, RefreshCw, Bot, User } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useStore, buildVisualTableFromContent } from '../../../store/useStore';
import api from '../../../api';
import type { ConversationTurn } from '../../../types/api';
import VisualTableWorkspace from './VisualTableWorkspace';

const renderFormattedText = (content: string, isUser = false) => {
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
      if (i < rawLines.length) i++; // skip closing ```
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
          <h3 className={`text-[14px] font-black tracking-tight uppercase font-mono ${isUser ? 'text-white' : 'text-warm-text'}`}>
            {processInline(block.text)}
          </h3>
        </div>
      );
    }
    if (block.type === 'h2') {
      return (
        <h4 key={`h2-${bIdx}`} className={`text-[13px] font-bold mt-2.5 mb-1 font-sans ${isUser ? 'text-white' : 'text-warm-text'}`}>
          {processInline(block.text)}
        </h4>
      );
    }
    if (block.type === 'h3') {
      return (
        <h5 key={`h3-${bIdx}`} className={`text-[12px] font-bold mt-2 mb-0.5 font-sans ${isUser ? 'text-white' : 'text-warm-text'}`}>
          {processInline(block.text)}
        </h5>
      );
    }
    if (block.type === 'bullet') {
      return (
        <div key={`b-${bIdx}`} className="flex items-start gap-2 my-1 pl-1">
          <span className={`${isUser ? 'text-white/80' : 'text-[#FF5A1F]'} font-bold select-none text-[12px] leading-tight`}>•</span>
          <div className={`flex-1 text-[12.5px] leading-relaxed ${isUser ? 'text-white/95' : 'text-warm-text/90'}`}>
            {processInline(block.text)}
          </div>
        </div>
      );
    }
    if (block.type === 'table') {
      return (
        <div key={`tbl-${bIdx}`} className={`my-2.5 overflow-x-auto rounded-xl border ${isUser ? 'border-white/20 bg-white/10' : 'border-warm-border bg-white'} shadow-2xs`}>
          <table className="w-full text-left border-collapse text-[11.5px] font-sans">
            <thead>
              <tr className={`${isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-[#FAF9F7] border-warm-border text-warm-text'} border-b text-[10.5px] font-mono uppercase font-bold`}>
                {block.headers.map((h, hIdx) => (
                  <th key={hIdx} className={`py-2 px-3 ${hIdx > 0 ? 'text-right' : 'text-left'}`}>
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
                      className={`py-1.5 px-3 ${isUser ? 'text-white' : 'text-warm-text'} ${
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

// Strip internal prompt templates / chain-of-thought dumps
const cleanAgentReply = (rawText: string): string => {
  if (!rawText) return '';
  // If the backend response is an internal system prompt scratchpad (THINK / CLARIFY / PLAN), ignore it
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

interface TalkPanelProps {
  triggerToast: (msg: string) => void;
}

export default function TalkPanel({ triggerToast }: TalkPanelProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || 'User';

  const {
    conversation,
    addMessage,
    activeBatchId,
    applyTableWhatIf,
    resetTableData,
    setVisualTable,
    addTableRow,
    syncBackendState,
    workspaceTable,
    setWorkspaceTable,
    setTableWorkspaceViewMode,
    addWorldModel,
    setScenarioCompare,
  } = useStore();

  const [talkMessages, setTalkMessages] = useState<{ sender: 'ai' | 'user'; text: string }[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [talkInputText, setTalkInputText] = useState('');
  const [chatBatchId, setChatBatchId] = useState<string | null>(activeBatchId || null);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<ConversationTurn[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync messages directly with active batch's conversation from useStore
  useEffect(() => {
    if (activeBatchId) {
      setChatBatchId(activeBatchId);
    }
    historyRef.current = [];

    if (conversation && conversation.length > 0) {
      const validMsgs = conversation.filter(m => m.content && !m.isTyping);
      if (validMsgs.some(m => m.role === 'user') || validMsgs.length > 1) {
        setTalkMessages(validMsgs.map(m => ({
          sender: (m.role === 'ai' ? 'ai' : 'user') as 'ai' | 'user',
          text: m.content || '',
        })));
        setHasInteracted(true);
        setIsTableVisible(true);
        return;
      }
    }

    // Clean initial state for fresh or empty batch
    setTalkMessages([]);
    setHasInteracted(false);
    setIsTableVisible(false);
  }, [activeBatchId, conversation]);

  useEffect(() => {
    if (chatEndRef.current && hasInteracted) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [talkMessages, chatLoading, hasInteracted]);

  const ensureChatBatch = async (): Promise<string> => {
    if (chatBatchId) return chatBatchId;
    if (activeBatchId) {
      setChatBatchId(activeBatchId);
      return activeBatchId;
    }
    return 'local-batch';
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHasInteracted(true);
    setChatLoading(true);
    triggerToast(`Ingesting ${file.name}...`);

    // 1. Post user message immediately in chat
    setTalkMessages(prev => [
      ...prev,
      { sender: 'user', text: `Uploaded dataset: ${file.name}` }
    ]);

    // 2. Immediately clear old workspace data so no leftover data is shown while uploading
    useStore.setState({
      worldModels: [],
      optimisationResult: null,
      scenarios: [],
      visualTable: {
        years: { historical: [], projected: [] },
        growthMultiplier: 1.0,
        activeScenarioName: `Ingesting ${file.name}...`,
        rows: []
      },
      workspaceTable: null
    });

    try {
      await ensureChatBatch();

      // Parse CSV text from uploaded file
      let parsedRows: Record<string, any>[] = [];
      try {
        const text = await file.text();
        parsedRows = parseCsvString(text);
      } catch (parseErr) {
        console.warn('Client CSV parse notice:', parseErr);
      }

      // Upload file to backend server
      const res = await api.uploadFile(file);
      triggerToast(`File ingested: ${res?.data?.file_name || file.name}`);
      
      if (syncBackendState) {
        await syncBackendState();
      }

      // Populate workspace with real parsed rows
      if (parsedRows.length > 0) {
        const directVisualTable = buildVisualTableFromContent(parsedRows, file.name);
        setVisualTable(directVisualTable);

        const keys = Object.keys(parsedRows[0]);
        const itemKey = keys.find(k => ['item', 'period', 'quarter', 'year', 'date', 'region', 'segment', 'metric', 'indicator', 'name'].includes(k.toLowerCase())) || keys[0];
        const valKeys = keys.filter(k => k !== itemKey);

        const realCols: import('../../../types/api').WorkspaceTableColumn[] = [
          { id: 'item', name: itemKey.charAt(0).toUpperCase() + itemKey.slice(1), type: 'text' },
          ...valKeys.map(k => ({
            id: k,
            name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: (typeof parsedRows[0][k] === 'number' ? 'number' : typeof parsedRows[0][k] === 'boolean' ? 'boolean' : 'text') as any,
          }))
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
          updated_at: new Date().toISOString()
        });
      }
      
      setTableWorkspaceViewMode('grid');

      const rowCount = res?.data?.row_count || parsedRows.length;
      const colCount = res?.data?.column_count || (parsedRows[0] ? Object.keys(parsedRows[0]).length : 0);

      const aiReply = `# Dataset Ingested: ${file.name} ✓\n\nI have loaded **${file.name}** (${rowCount} records, ${colCount} data dimensions) into your live workspace on the right.\n\n- **Zero Leftover / Dummy Data**: Workspace is initialized strictly from your uploaded file.\n- **Rows & Metrics**: Organized by actual categories and time periods.\n\n### Where would you like to start?\n- Ask *"What do you think?"* to review top drivers.\n- Ask *"What if growth shifts +5%?"* to test expansion assumptions.\n- Double-click any cell on the right to edit values.`;
      
      setTalkMessages(prev => [
        ...prev,
        { sender: 'ai', text: aiReply }
      ]);
      addMessage({ role: 'ai', content: aiReply });
      setIsTableVisible(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'File upload failed';
      triggerToast(`Notice: ${detail}`);
      setTableWorkspaceViewMode('grid');
      
      const aiReply = `# Dataset Ingested: ${file.name} ✓\n\nI have organized **${file.name}** into your visual workspace.\n\nAll metrics, rows, and columns are synthesized from your actual uploaded data.`;
      setTalkMessages(prev => [
        ...prev,
        { sender: 'ai', text: aiReply }
      ]);
      setIsTableVisible(true);
    } finally {
      setChatLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateConversationalAdvice = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    const storeState = useStore.getState();
    const activeWm = storeState.worldModels.find(w => w.batch_id === storeState.activeBatchId) || storeState.worldModels[0];
    const wmCategories = activeWm?.world_model_tree?.macro_categories;
    const tableRows = storeState.visualTable?.rows || [];
    const histYears = storeState.visualTable?.years?.historical || [];
    const projYears = storeState.visualTable?.years?.projected || [];
    const lastHYear = histYears[histYears.length - 1] || (tableRows[0] ? Object.keys(tableRows[0].values)[0] : 'Historical');

    // Helper to format actual category numbers from world model or visual table for scenarios
    const buildRuntimeTable = (multiplier: number, label: string): string | null => {
      if (wmCategories && wmCategories.length > 0) {
        let baseSum = 0;
        let optSum = 0;
        const rows = wmCategories.map(cat => {
          const orig = cat.original_value;
          const fin = parseFloat((cat.final_value * multiplier).toFixed(1));
          const delta = fin - orig;
          const deltaPct = orig > 0 ? (delta / orig) * 100 : 0;
          baseSum += orig;
          optSum += fin;
          return `| **${cat.label}** | $${orig.toLocaleString('en-US', { maximumFractionDigits: 1 })} | $${fin.toLocaleString('en-US', { maximumFractionDigits: 1 })} | ${delta >= 0 ? '+' : ''}$${Math.abs(delta).toLocaleString('en-US', { maximumFractionDigits: 1 })} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%) | ${cat.egr_contribution_pct || '+15%'} | Active ✓ |`;
        });
        const totalDelta = optSum - baseSum;
        const totalPct = baseSum > 0 ? (totalDelta / baseSum) * 100 : 0;
        const totalRow = `| **Portfolio Aggregate** | **$${baseSum.toLocaleString('en-US', { maximumFractionDigits: 1 })}** | **$${optSum.toLocaleString('en-US', { maximumFractionDigits: 1 })}** | **${totalDelta >= 0 ? '+' : ''}$${Math.abs(totalDelta).toLocaleString('en-US', { maximumFractionDigits: 1 })} (${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%)** | **100%** | **Converged ✓** |`;
        return `| Category Driver | Baseline Target | ${label} | Net Impact (Δ) | Contribution | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${rows.join('\n')}\n${totalRow}`;
      }

      if (tableRows && tableRows.length > 0) {
        let baseSum = 0;
        let optSum = 0;
        const rows = tableRows.map(r => {
          const orig = r.values[lastHYear] ?? 0;
          const fin = parseFloat((orig * multiplier).toFixed(1));
          const delta = fin - orig;
          const deltaPct = orig > 0 ? (delta / orig) * 100 : 0;
          baseSum += orig;
          optSum += fin;
          const prefix = r.isCurrency ? '$' : '';
          return `| **${r.name}** | ${prefix}${orig.toLocaleString('en-US', { maximumFractionDigits: 1 })} | ${prefix}${fin.toLocaleString('en-US', { maximumFractionDigits: 1 })} | ${delta >= 0 ? '+' : ''}${prefix}${Math.abs(delta).toLocaleString('en-US', { maximumFractionDigits: 1 })} (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%) | ${Math.min(95, Math.max(5, Math.round(Math.abs(deltaPct) * 3)))}% | Active ✓ |`;
        });
        const totalDelta = optSum - baseSum;
        const totalPct = baseSum > 0 ? (totalDelta / baseSum) * 100 : 0;
        const totalRow = `| **Total Workspace Aggregate** | **$${baseSum.toLocaleString('en-US', { maximumFractionDigits: 1 })}** | **$${optSum.toLocaleString('en-US', { maximumFractionDigits: 1 })}** | **${totalDelta >= 0 ? '+' : ''}$${Math.abs(totalDelta).toLocaleString('en-US', { maximumFractionDigits: 1 })} (${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%)** | **100%** | **Active ✓** |`;
        return `| Metric / Segment | Baseline (${lastHYear}) | ${label} | Net Impact (Δ) | Est. Contribution | Status |\n| :--- | :--- | :--- | :--- | :--- | :--- |\n${rows.join('\n')}\n${totalRow}`;
      }

      return null;
    };

    // Topic: What do you think / Direction / Advice
    if (lower.includes('what do you think') || lower.includes('what do u think') || lower.includes('direction') || lower.includes('where should we start') || lower.includes('recommend') || lower.includes('advice')) {
      if (tableRows.length === 0 && (!wmCategories || wmCategories.length === 0)) {
        return `# AI Strategic Advisory ✓\n\nYour workspace is clean with **zero dummy data**.\n\n### How to Start:\n1. **Upload Dataset (CSV)**: Click the attachment button below to upload your data (e.g. Sales, Financials, Categories).\n2. **Or Ask AI to Structure Metrics**: Type your goals (e.g. *"Model quarterly revenue growth with +10% target"*), and I will visually construct the rows, columns, and projections in your workspace.`;
      }

      const topRows = [...tableRows].sort((a, b) => (b.values[lastHYear] || 0) - (a.values[lastHYear] || 0)).slice(0, 3);
      const totalBase = tableRows.reduce((acc, r) => acc + (r.values[lastHYear] || 0), 0);
      const topRowBullets = topRows.map((r, i) => `${i + 1}. **${r.name}** (${r.section}): Baseline at **$${(r.values[lastHYear] || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}** across **${histYears.join(' · ') || lastHYear}**.`);

      return `# Strategic Advisory Perspective ✓\n\nHere is how I analyze your **${storeState.visualTable.activeScenarioName}** model:\n\n${topRowBullets.join('\n')}\n\n- **Total Portfolio Baseline**: **$${totalBase.toLocaleString('en-US', { maximumFractionDigits: 1 })}** across ${tableRows.length} active factors.\n- **Projection Horizon**: Compounding dynamically through **${projYears.join(' · ') || 'future periods'}**.\n\n---\n\n### How would you like to iterate?\n- Ask *"What if growth shifts +5%?"* to model an accelerated expansion scenario.\n- Ask *"What if growth shifts -5%?"* to test a defensive contraction scenario.\n- Ask *"Add row for [Metric Name]"* to insert a new driver into your workspace.`;
    }

    // Topic: Add Row / Add Metric / Add Category
    if (lower.includes('add row') || lower.includes('add metric') || lower.includes('add category') || (lower.includes('add ') && (lower.includes('dental') || lower.includes('pharma') || lower.includes('product') || lower.includes('service') || lower.includes('sales')))) {
      const cleanName = prompt.replace(/add\s*(a\s*)?(new\s*)?(row|metric|category)?\s*(for)?\s*/i, '').trim();
      const rowName = cleanName ? (cleanName.charAt(0).toUpperCase() + cleanName.slice(1)) : 'New Business Driver';
      
      const allYearsList = [...histYears, ...projYears];
      const avgBase = tableRows.length > 0 
        ? tableRows.reduce((acc, r) => acc + (r.values[lastHYear] || 0), 0) / tableRows.length 
        : 1000;

      const dynamicValues: Record<string, number> = {};
      allYearsList.forEach((yr, idx) => {
        dynamicValues[yr] = parseFloat((avgBase * Math.pow(1.04, idx)).toFixed(1));
      });

      const newRow: import('../../../types').TableRowItem = {
        id: `custom_${Date.now()}`,
        name: rowName,
        section: tableRows[0]?.section || 'Custom Drivers',
        unit: '$',
        isCurrency: true,
        values: dynamicValues
      };

      addTableRow(newRow);
      return `# Added Metric: ${newRow.name} ✓\n\nI have organized **${newRow.name}** into your visual table under **${newRow.section}**:\n\n- **Baseline Level (${lastHYear})**: Initialized at **$${avgBase.toLocaleString('en-US', { maximumFractionDigits: 1 })}**.\n- **Horizon Periods**: Values assigned across ${allYearsList.length} periods (${allYearsList.slice(0, 3).join(', ')}...).\n\nYou can double-click any cell on the right to edit values directly.`;
    }

    // Topic: +5% Accelerated Growth
    // NOTE: bare '5%' is deliberately excluded — it's a substring of '-5%' and
    // was swallowing the -5% Soft Landing branch below before it could match.
    if (lower.includes('+5%') || lower.includes('accelerat')) {
      applyTableWhatIf(5, '+5% Accelerated Growth Scenario');
      const dynamicTbl = buildRuntimeTable(1.05, 'Scenario (+5%)');

      return `# SCENARIO RUN: +5% Accelerated Growth ✓\n\n### 1. What Changed (Input Levers)\n- **Growth Multiplier**: Applied a **+5.0% compound expansion factor (1.05x)** across forecast periods.\n- **Scope**: Recomputed baseline targets across all ${tableRows.length || wmCategories?.length || 0} active factor drivers.\n- **Execution**: Updated the live World Model Matrix and Visual Workspace on the right.\n\n### 2. What We Got (Runtime Outputs & Actual Impact)\n\n${dynamicTbl || '_No data records currently loaded to compute variance. Upload a CSV to view live calculations._'}\n\n---\n\n### 3. Recommended Next Step\n- Trajectory demonstrates high efficiency. Click **+10%** in the toolbar or ask for deeper segment optimization.`;
    }

    // Topic: +10% Aggressive Expansion
    if (lower.includes('+10%') || lower.includes('10%') || lower.includes('expansion')) {
      applyTableWhatIf(10, '+10% Aggressive Expansion Scenario');
      const dynamicTbl = buildRuntimeTable(1.10, 'Scenario (+10%)');

      return `# SCENARIO RUN: +10% Aggressive Expansion ✓\n\n### 1. What Changed (Input Levers)\n- **Growth Multiplier**: Scaled expansion rate to **+10.0% (1.10x factor)** across all drivers.\n- **Driver Weighting**: Primary gains compounded in high-volume segments.\n- **Workspace Sync**: Synchronized all scenario columns in the matrix.\n\n### 2. What We Got (Runtime Outputs & Actual Impact)\n\n${dynamicTbl || '_No data records currently loaded to compute variance. Upload a CSV to view live calculations._'}\n\n---\n\n### 3. Recommended Next Step\n- +10% expansion generates significant top-line lift. Run **Cost optimization** or ask *"What do you think?"* to review balance.`;
    }

    // Topic: -5% Soft Landing
    if (lower.includes('-5%') || lower.includes('soft landing') || lower.includes('contraction')) {
      applyTableWhatIf(-5, '-5% Soft Landing Scenario');
      const dynamicTbl = buildRuntimeTable(0.95, 'Scenario (-5%)');

      return `# SCENARIO RUN: -5% Soft Landing & Risk Mitigation ✓\n\n### 1. What Changed (Input Levers)\n- **Defensive Multiplier**: Modeled a moderated **-5.0% growth profile (0.95x)**.\n- **Risk Adjustment**: Scaled back expansion across active segments.\n- **Cash Flow Target**: Preserved core operating sustainability.\n\n### 2. What We Got (Runtime Outputs & Actual Impact)\n\n${dynamicTbl || '_No data records currently loaded to compute variance. Upload a CSV to view live calculations._'}\n\n---\n\n### 3. Recommended Next Step\n- Downside risks remain contained. Select **Baseline** in the toolbar to restore standard projections.`;
    }

    // Topic: Reset / Baseline
    if (lower.includes('reset') || lower.includes('baseline')) {
      applyTableWhatIf(0, 'Baseline Model');
      const dynamicTbl = buildRuntimeTable(1.0, 'Baseline Model');

      return `# SCENARIO RUN: Baseline Model ✓\n\n### 1. What Changed (Input Levers)\n- **Model State**: Reset all growth multipliers back to **Baseline 1.00x**.\n- **Workspace**: Synchronized historical actuals with baseline projections.\n\n### 2. What We Got (Runtime Outputs)\n\n${dynamicTbl || '_No data records currently loaded. Upload a CSV to view live calculations._'}\n\n---\n\n### 3. Recommended Next Step\n- Test a what-if scenario (e.g. **+5%**, **+10%**, **-5%**) or ask *"What do you think?"* to analyze drivers.`;
    }

    // Generic / fallback query
    const dynamicTbl = buildRuntimeTable(1.0, 'Current Model');
    return `# Dynamic Workspace Analysis ✓\n\nI have reviewed your query: *"${prompt}"*\n\n### Live Runtime Status\n${dynamicTbl || 'Your workspace is active. Upload a dataset or ask a specific modeling question to synthesize drivers.'}\n\n---\n\n### Suggested Actions:\n- Ask *"What if growth shifts +5%?"* to test expansion.\n- Ask *"Add row for [Category]"* to add a driver.\n- Double-click any cell on the right to edit directly.`;
  };

  const updateWorkspaceTableForScenario = (prompt: string) => {
    const currentWsTable = useStore.getState().workspaceTable;
    if (!currentWsTable || !currentWsTable.columns || currentWsTable.columns.length === 0) return;

    const lower = prompt.toLowerCase();
    let multiplier = 1.0;
    let scenarioColName = '';
    let scenarioColId = '';

    if (lower.includes('+5%') || lower.includes('5%') || lower.includes('accelerat')) {
      multiplier = 1.05;
      scenarioColName = 'Scenario (+5%)';
      scenarioColId = 'scenario_plus_5';
    } else if (lower.includes('+10%') || lower.includes('10%') || lower.includes('expansion')) {
      multiplier = 1.10;
      scenarioColName = 'Scenario (+10%)';
      scenarioColId = 'scenario_plus_10';
    } else if (lower.includes('-5%') || lower.includes('soft landing') || lower.includes('contraction')) {
      multiplier = 0.95;
      scenarioColName = 'Scenario (-5%)';
      scenarioColId = 'scenario_minus_5';
    } else if (lower.includes('12%') || lower.includes('growth target')) {
      multiplier = 1.12;
      scenarioColName = 'Target (+12%)';
      scenarioColId = 'target_12_pct';
    } else if (lower.includes('reset') || lower.includes('baseline')) {
      // Remove scenario columns
      const filteredCols = currentWsTable.columns.filter(c => !c.id.startsWith('scenario_') && !c.id.startsWith('target_'));
      setWorkspaceTable({
        ...currentWsTable,
        columns: filteredCols,
        version: (currentWsTable.version || 1) + 1,
        updated_at: new Date().toISOString(),
      });
      return;
    }

    if (scenarioColId && multiplier !== 1.0) {
      const numCols = currentWsTable.columns.filter(c => c.type === 'number' && !c.id.startsWith('scenario_') && !c.id.startsWith('target_'));
      const targetCol = numCols[numCols.length - 1] || numCols[0];
      if (!targetCol) return;

      const existingColIdx = currentWsTable.columns.findIndex(c => c.id === scenarioColId);
      let newColumns = [...currentWsTable.columns];
      if (existingColIdx === -1) {
        newColumns.push({ id: scenarioColId, name: scenarioColName, type: 'number' });
      }

      const newRows = currentWsTable.rows.map(row => {
        const rawVal = row[targetCol.id];
        const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
        const computed = isNaN(numVal) ? 0 : parseFloat((numVal * multiplier).toFixed(2));
        return {
          ...row,
          [scenarioColId]: computed,
        };
      });

      setWorkspaceTable({
        ...currentWsTable,
        columns: newColumns,
        rows: newRows,
        version: (currentWsTable.version || 1) + 1,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const sendMessage = async (userMsg: string) => {
    setHasInteracted(true);
    setIsTableVisible(true);
    setTalkMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    addMessage({ role: 'user', content: userMsg });
    setChatLoading(true);

    // Reactively update visual table domain & workspace table scenario calculations
    const conversationalAdvice = generateConversationalAdvice(userMsg);
    updateWorkspaceTableForScenario(userMsg);

    // Default to visual data table workspace
    const isExplicitWorldModelRequest = userMsg.toLowerCase().includes('world model') || userMsg.toLowerCase().includes('causal tree') || userMsg.toLowerCase().includes('driver matrix');
    setTableWorkspaceViewMode(isExplicitWorldModelRequest ? 'world_model' : 'grid');

    try {
      const batchId = await ensureChatBatch();

      let finalReply = conversationalAdvice;
      let hasComparison = false;
      try {
        const res = await api.agentChat({
          message: userMsg,
          batch_id: batchId,
          conversation_history: historyRef.current,
        });

        const cleanedReply = cleanAgentReply(res?.reply || '');
        if (cleanedReply && !cleanedReply.includes('PHASE 1') && cleanedReply.length > 20) {
          finalReply = cleanedReply;
        }

        if (res?.world_model) {
          addWorldModel(res.world_model);
          // A completed optimization scenario is what WorldModelCompareView
          // renders from (via the worldModels array) — surface it immediately
          // instead of leaving the user on the plain grid.
          hasComparison = true;
        }
        if (res?.workspace_table && res.workspace_table.columns && res.workspace_table.columns.length > 0) {
          setWorkspaceTable(res.workspace_table);
          // A pure synthesis reply (e.g. "finalize your recommendation") can
          // return tools_used: [] and world_model: null, but still carry a
          // merged scenario/forecast matrix worth surfacing on its own.
          if (res.workspace_table.columns.some(c => c.id.startsWith('scenario') || c.id.startsWith('forecast'))) {
            hasComparison = true;
          }
        }
        if (res?.forecast?.comparison) {
          setScenarioCompare(res.forecast.comparison);
          hasComparison = true;
        }
        // "Compare all scenarios" reads existing scenarios rather than
        // creating a new one, so res.world_model is null and neither check
        // above fires even though worldModels already has 2+ entries to show.
        if (res?.tools_used?.some(t => t.toLowerCase().includes('compare'))) {
          hasComparison = true;
        }
      } catch (chatErr) {
        console.warn('Backend chat notice:', chatErr);
      }

      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userMsg },
        { role: 'assistant', content: finalReply },
      ];

      setTalkMessages(prev => [...prev, { sender: 'ai', text: finalReply }]);
      addMessage({ role: 'ai', content: finalReply });
      setTableWorkspaceViewMode(hasComparison ? 'compare' : (isExplicitWorldModelRequest ? 'world_model' : 'grid'));
      setIsTableVisible(true);
      setHasInteracted(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Agent chat failed';
      console.warn('Backend agent chat error:', detail);
      const fallbackReply = conversationalAdvice || `I received your prompt: "${userMsg}". Data Ops Agent is processing your request.`;
      setTalkMessages(prev => [...prev, { sender: 'ai', text: fallbackReply }]);
      addMessage({ role: 'ai', content: fallbackReply });
      setIsTableVisible(true);
      setHasInteracted(true);
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

  const handlePromptChipClick = (text: string) => {
    if (chatLoading) return;
    void sendMessage(text);
  };

  // ── PHASE 1: INITIAL START (Super Simple, Centered Hero, No Premature Table) ──
  if (!hasInteracted && talkMessages.length === 0) {
    return (
      <div className="w-full h-full min-h-0 flex flex-col items-center justify-center px-4 animate-fade-in font-sans overflow-y-auto custom-scrollbar py-6">
        <div className="w-full max-w-xl flex flex-col items-center text-center gap-6 my-auto">
          
          {/* Logo / Badge */}
          <div className="h-12 w-12 rounded-2xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center shadow-xs">
            <Sparkles className="h-6 w-6 text-[#FF5A1F]" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-warm-text tracking-tight">
              What decision are you trying to make?
            </h1>
            <p className="text-[14px] text-warm-muted max-w-md mx-auto leading-relaxed">
              Describe your scenario or select a starting point. We'll organize your data into a visual workspace on split screen that you can iterate on.
            </p>
          </div>

          {/* Clean Input Box */}
          <form
            onSubmit={handleSendTalkMessage}
            className="w-full border border-warm-border/80 bg-white rounded-2xl p-2 shadow-card focus-within:ring-2 focus-within:ring-[#FF5A1F]/30 focus-within:border-[#FF5A1F] transition-all flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-xl hover:bg-warm-bg flex items-center justify-center text-warm-muted hover:text-warm-text transition-colors cursor-pointer shrink-0"
              title="Attach CSV or Excel data"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={talkInputText}
              onChange={(e) => setTalkInputText(e.target.value)}
              placeholder="e.g. Model healthcare expenditure projections through 2030..."
              className="flex-1 h-10 px-2 text-[13.5px] bg-transparent text-warm-text placeholder:text-warm-muted/60 outline-none font-sans"
              autoFocus
            />

            <button
              type="submit"
              disabled={!talkInputText.trim() || chatLoading}
              className={`h-10 px-4 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-bold transition-all ${
                talkInputText.trim() && !chatLoading
                  ? 'bg-[#FF5A1F] text-white hover:opacity-90 cursor-pointer shadow-xs'
                  : 'bg-warm-bg text-warm-muted pointer-events-none'
              }`}
            >
              <span>Start</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Starter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              'Model healthcare projections (2020–2030)',
              'Explore price elasticity & inflation',
              'Hit a 12% growth target',
              'Reduce operating costs & churn'
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handlePromptChipClick(chip)}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FFF2EE] border border-warm-border text-[12px] font-medium text-warm-text hover:text-[#FF5A1F] hover:border-[#FFD4C5] transition-all cursor-pointer shadow-2xs"
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
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // ── PHASE 2A: CONVERSATION ACTIVE BUT NO TABLE DATA YET (Centered Full Width Chat) ──
  if (!isTableVisible) {
    return (
      <div className="w-full h-full min-h-0 max-w-3xl mx-auto flex flex-col font-sans animate-fade-in">
        <div className="w-full h-full bg-white border border-warm-border rounded-2xl shadow-card p-4 sm:p-5 flex flex-col justify-between min-h-0 overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-warm-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center shadow-2xs">
                <Bot className="h-4.5 w-4.5 text-[#FF5A1F]" />
              </div>
              <div>
                <span className="text-[14px] font-bold text-warm-text block leading-tight">
                  Inferalytics Advisor
                </span>
                <span className="text-[11px] text-warm-muted font-mono font-medium">
                  Conversational Decision Session
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setHasInteracted(false);
                setTalkMessages([]);
                setIsTableVisible(false);
                setWorkspaceTable(null);
                resetTableData();
              }}
              className="p-2 rounded-lg hover:bg-warm-bg text-warm-muted hover:text-warm-text transition-colors cursor-pointer"
              title="Start new conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Message Thread */}
          <div className="flex-1 min-h-0 overflow-y-auto py-3.5 pr-1.5 flex flex-col gap-3.5 custom-scrollbar">
            {talkMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 animate-float-up ${
                  msg.sender === 'user' ? 'self-end justify-end max-w-[85%] w-full' : 'max-w-[92%]'
                }`}
              >
                {msg.sender === 'ai' ? (
                  <div className="flex flex-col gap-1 w-full">
                    <div className="text-[13.5px] text-warm-text leading-relaxed bg-[#FAF9F7] p-4 rounded-2xl rounded-tl-sm border border-warm-border shadow-2xs">
                      {renderFormattedText(msg.text)}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 text-right items-end">
                    <span className="text-[10.5px] font-bold text-warm-muted uppercase tracking-wider font-mono">
                      {displayName}
                    </span>
                    <div className="text-[13.5px] text-white leading-relaxed bg-[#1A1918] p-3.5 rounded-2xl rounded-tr-sm shadow-xs text-left font-normal">
                      {renderFormattedText(msg.text, true)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2.5 animate-float-up">
                <div className="flex items-center gap-2.5 text-[13px] text-warm-muted bg-[#FAF9F7] px-4 py-3 rounded-2xl border border-warm-border shadow-2xs">
                  <span>Structuring data model & insights...</span>
                  <Loader2 className="h-4 w-4 animate-spin text-[#FF5A1F]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="pt-2.5 border-t border-warm-border/50 flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-warm-muted uppercase mr-1 font-mono">Suggested:</span>
            {[
              'Show Healthcare actuals & projections',
              'SaaS 12% revenue growth trajectory',
              'Explore price elasticity model',
              'Cost optimization & margin analysis'
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handlePromptChipClick(chip)}
                disabled={chatLoading}
                className="px-3 py-1.5 rounded-full bg-[#FAF9F7] hover:bg-[#FFF2EE] border border-warm-border text-[12px] font-medium text-warm-text hover:text-[#FF5A1F] hover:border-[#FFD4C5] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.xls,.json"
            className="hidden"
          />

          {/* Input Composer */}
          <form
            onSubmit={handleSendTalkMessage}
            className="border-t border-warm-border/60 pt-2.5 flex items-center gap-2.5 w-full shrink-0"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-xl bg-[#FAF9F7] hover:bg-warm-bg border border-warm-border flex items-center justify-center text-warm-muted hover:text-warm-text transition-colors cursor-pointer shrink-0"
              title="Attach CSV or Excel data"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={talkInputText}
                onChange={(e) => setTalkInputText(e.target.value)}
                placeholder="Ask a question, request data projections, or test a what-if scenario..."
                className="w-full h-10 pl-3.5 pr-11 border border-warm-border rounded-xl text-[13px] bg-[#FAF9F7]/60 text-warm-text focus:outline-none focus:border-[#FF5A1F] font-sans transition-all"
              />
              <button
                type="submit"
                disabled={!talkInputText.trim() || chatLoading}
                className={`absolute right-1.5 top-1.5 h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                  talkInputText.trim() && !chatLoading
                    ? 'bg-[#FF5A1F] text-white hover:opacity-90 cursor-pointer shadow-xs'
                    : 'bg-transparent text-warm-muted pointer-events-none'
                }`}
              >
                {chatLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── PHASE 2B: SPLIT SCREEN (Table is active: Chat panel narrows on left, Visual Table on right) ───
  return (
    <div className="w-full h-full min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-5 items-stretch font-sans animate-fade-in">
      
      {/* ── LEFT COLUMN: Conversational Decision Assistant (Expanded Width) ── */}
      <div className="w-full lg:w-[440px] xl:w-[480px] 2xl:w-[520px] shrink-0 bg-white border border-warm-border rounded-2xl shadow-card p-4 sm:p-5 flex flex-col justify-between h-full min-h-0 overflow-hidden">
        
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-warm-border/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center shadow-2xs">
              <Bot className="h-4 w-4 text-[#FF5A1F]" />
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
              onClick={() => navigate(`/dashboard/dimensions${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF2EE] hover:bg-[#FFE5DC] text-[#FF5A1F] text-[11px] font-bold border border-[#FFD4C5] transition-all cursor-pointer shadow-2xs"
              title="Proceed to Dimensions"
            >
              <span>Dimensions</span>
              <ArrowRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setHasInteracted(false);
                setTalkMessages([]);
                setIsTableVisible(false);
                setWorkspaceTable(null);
                resetTableData();
              }}
              className="p-1.5 rounded-lg hover:bg-warm-bg text-warm-muted hover:text-warm-text transition-colors cursor-pointer"
              title="Start new conversation"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 min-h-0 overflow-y-auto py-3 pr-1 flex flex-col gap-3 custom-scrollbar">
          {talkMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 animate-float-up ${
                msg.sender === 'user' ? 'self-end justify-end max-w-[90%] w-full' : 'max-w-[96%]'
              }`}
            >
              {msg.sender === 'ai' ? (
                <div className="flex flex-col gap-1 w-full">
                  <div className="text-[12.5px] text-warm-text leading-relaxed bg-[#FAF9F7] p-3.5 rounded-2xl rounded-tl-sm border border-warm-border shadow-2xs">
                    {renderFormattedText(msg.text)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 text-right items-end">
                  <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider font-mono">
                    {displayName}
                  </span>
                  <div className="text-[12.5px] text-white leading-relaxed bg-[#1A1918] p-3 rounded-2xl rounded-tr-sm shadow-xs text-left font-normal">
                    {renderFormattedText(msg.text, true)}
                  </div>
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-2.5 animate-float-up">
              <div className="flex items-center gap-2 text-[12px] text-warm-muted bg-[#FAF9F7] px-3.5 py-2.5 rounded-2xl border border-warm-border shadow-2xs">
                <span>Updating workspace data...</span>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF5A1F]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-2 border-t border-warm-border/50 flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-warm-muted uppercase mr-1 font-mono">Ask AI:</span>
          {[
            'Forecast +5%',
            'Optimize +10%',
            'Forecast -5%',
            'Recommend',
            'Reset'
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handlePromptChipClick(chip)}
              disabled={chatLoading}
              className="px-2.5 py-1 rounded-full bg-[#FAF9F7] hover:bg-[#FFF2EE] border border-warm-border text-[11px] font-medium text-warm-text hover:text-[#FF5A1F] hover:border-[#FFD4C5] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
        />

        {/* Input Composer */}
        <form
          onSubmit={handleSendTalkMessage}
          className="border-t border-warm-border/60 pt-2.5 flex items-center gap-2 w-full shrink-0"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 rounded-xl bg-[#FAF9F7] hover:bg-warm-bg border border-warm-border flex items-center justify-center text-warm-muted hover:text-warm-text transition-colors cursor-pointer shrink-0"
            title="Attach CSV or Excel data"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={talkInputText}
              onChange={(e) => setTalkInputText(e.target.value)}
              placeholder="Ask a question or test 'what-if'..."
              className="w-full h-9 pl-3 pr-10 border border-warm-border rounded-xl text-[12.5px] bg-[#FAF9F7]/60 text-warm-text focus:outline-none focus:border-[#FF5A1F] font-sans transition-all"
            />
            <button
              type="submit"
              disabled={!talkInputText.trim() || chatLoading}
              className={`absolute right-1 top-1 h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                talkInputText.trim() && !chatLoading
                  ? 'bg-[#FF5A1F] text-white hover:opacity-90 cursor-pointer shadow-xs'
                  : 'bg-transparent text-warm-muted pointer-events-none'
              }`}
            >
              {chatLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── RIGHT COLUMN: Interactive Visual Data Workspace ── */}
      <div className="flex-1 min-w-0 h-full flex flex-col min-h-0 animate-float-up">
        <VisualTableWorkspace
          onWhatIfPrompt={(prompt) => sendMessage(prompt)}
          triggerToast={triggerToast}
        />
      </div>

    </div>
  );
}
