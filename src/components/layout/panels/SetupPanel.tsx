import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, FileText, Upload, Loader2, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import api from '../../../api';

// Dynamic table details inspector

export default function SetupPanel() {
  const { setup, toggleSegment, toggleParameter, setFocalPoint, setTimeGranularity, syncBackendState, activeBatchId, addMessage } = useStore();
  const { subtab } = useParams<{ subtab?: string }>();
  const navigate = useNavigate();
  const [inspectedTableId, setInspectedTableId] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [granularityLoading, setGranularityLoading] = useState(false);
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PERIOD_TYPE_MAP: Record<string, string> = {
    Day: 'daily', Week: 'weekly', Month: 'monthly', Quarter: 'quarterly', Year: 'yearly',
  };

  const handleGranularityChange = async (t: string) => {
    setTimeGranularity(t);
    const [startRaw, endRaw] = setup.timeRange.split(' → ');
    if (!startRaw || !endRaw) return;
    try {
      setGranularityLoading(true);
      await api.setDataTime(startRaw.trim(), endRaw.trim(), PERIOD_TYPE_MAP[t] ?? 'quarterly');
    } catch (err) {
      console.warn('setDataTime notice:', err);
    } finally {
      setGranularityLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaveDraftLoading(true);
      // Persist time configuration to backend
      const [startRaw, endRaw] = setup.timeRange.split(' → ');
      if (startRaw && endRaw) {
        await api.setDataTime(startRaw.trim(), endRaw.trim(), PERIOD_TYPE_MAP[setup.timeGranularity] ?? 'quarterly').catch(() => {});
      }
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (err) {
      console.warn('Save draft notice:', err);
    } finally {
      setSaveDraftLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadLoading(true);
      await api.uploadFile(file);
      if (syncBackendState) {
        await syncBackendState();
      }
    } catch (err: any) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isFocalPointMissing = !setup.focalPoint || !setup.focalPoint.trim();
  const isSegmentsMissing = !setup.segments || setup.segments.length === 0;
  const isVariablesMissing = !setup.parameters || setup.parameters.length === 0;
  const isFormInvalid = isFocalPointMissing || isSegmentsMissing || isVariablesMissing;

  return (
    <div className="flex flex-col gap-6 animate-float-up pt-4 max-w-[960px] w-full mx-auto">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls,.docx,.doc,.json"
        className="hidden"
      />
      {/* Setup Card */}
      <div className="w-full bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-float overflow-hidden flex flex-col justify-between transition-all">
        <div className="p-6 border-b border-warm-border/60 bg-white/40">
          <div className="flex items-start justify-between">
            <div className="flex flex-col animate-fade-in">
              <span className="text-[9.5px] font-bold text-brand-indigo uppercase tracking-wider block mb-1">
                Step 1 of 3 · Business Configuration
              </span>
              <h2 className="text-[18px] font-bold text-warm-text mb-0.5">
                Define simulation focus and strategic drivers
              </h2>
            </div>

            <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[10.5px] font-medium text-warm-muted">
              <button
                onClick={() => navigate('/dashboard/blueprint/general')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  (!subtab || subtab === 'general')
                    ? 'bg-white text-brand-indigo shadow-sm font-semibold'
                    : 'hover:text-warm-text'
                }`}
              >
                General Settings
              </button>
              <button
                onClick={() => navigate('/dashboard/blueprint/sources')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  subtab === 'sources'
                    ? 'bg-white text-brand-indigo shadow-sm font-semibold'
                    : 'hover:text-warm-text'
                }`}
              >
                Data Sources ({setup.sources.length})
              </button>
            </div>
          </div>
          <p className="text-[12.5px] text-warm-muted mt-2 leading-relaxed">
            {subtab === 'sources'
              ? 'Review baseline performance data, segment details, and transaction volume before starting simulation.'
              : 'Before importing baseline performance data, define your primary target metric. We will outline the segments and growth variables from there.'
            }
          </p>
        </div>

        <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[820px] custom-scrollbar">
          {(!subtab || subtab === 'general') && (
            <div className="flex flex-col gap-5">
              {/* Focal Point */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Primary Target Metric</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">The core financial or operational result to model and improve.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-col gap-2">
                  <input
                    type="text"
                    value={setup.focalPoint}
                    onChange={(e) => setFocalPoint(e.target.value)}
                    className="w-full px-4 py-2 border border-warm-border rounded-xl text-[13px] bg-white/50 text-warm-text focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-peach/20 transition-all font-sans placeholder-warm-muted"
                    placeholder="Enter focal point target..."
                  />
                  <div className="flex items-center gap-1.5 text-[10.5px]">
                    <Sparkles className="h-3 w-3 text-brand-indigo" />
                    <span className="text-warm-muted">Suggested:</span>
                    <span className="text-brand-indigo hover:underline cursor-pointer" onClick={() => setFocalPoint('Revenue uplift — Q2 → Q4 2025')}>Revenue uplift</span>
                    <span className="text-warm-muted">·</span>
                    <span className="text-brand-indigo hover:underline cursor-pointer" onClick={() => setFocalPoint('Cost reduction — APAC')}>Cost reduction</span>
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Planning Horizon</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Determine time increment and forecast duration.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <div className="flex bg-secondary p-0.5 rounded-lg border border-warm-border/40 text-[11px] font-medium text-warm-muted overflow-x-auto max-w-full no-scrollbar">
                    {['Day', 'Week', 'Month', 'Quarter', 'Year'].map((t) => (
                      <span
                        key={t}
                        onClick={() => !granularityLoading && handleGranularityChange(t)}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-all shrink-0 ${t === setup.timeGranularity ? 'bg-white text-brand-indigo shadow-sm font-semibold' : 'hover:text-warm-text'} ${granularityLoading ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-lavender/30 border border-lavender/50 text-[11.5px] font-mono text-brand-indigo font-semibold shadow-sm shrink-0">
                    {setup.timeRange}
                  </span>
                </div>
              </div>

              {/* Segments */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4 pb-4 border-b border-warm-border/40">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Strategic Segments</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Customer groups or regions to analyze.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-wrap gap-1.5">
                  {Array.from(new Set([...setup.segments, 'Region', 'Product Line', 'Category'])).map((seg) => {
                    const isSel = setup.segments.includes(seg);
                    return (
                      <button
                        key={seg}
                        onClick={() => toggleSegment(seg)}
                        className={`px-3.5 py-1.5 border rounded-full text-[11.5px] font-medium transition-all duration-200 cursor-pointer ${
                          isSel
                            ? 'bg-brand-indigo border-brand-indigo text-white shadow-[0_2px_8px_0_rgba(255,90,31,0.2)] font-semibold scale-102'
                            : 'bg-white/50 border-warm-border text-warm-muted hover:text-warm-text hover:bg-white hover:border-warm-border'
                        }`}
                      >
                        {seg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                <div className="col-span-1 md:col-span-1">
                  <span className="text-[12px] font-semibold text-warm-text block">Growth & Cost Variables</span>
                  <span className="text-[10px] text-warm-muted leading-tight block mt-0.5">Metrics to project and simulate.</span>
                </div>
                <div className="col-span-1 md:col-span-3 flex flex-wrap gap-1.5">
                  {Array.from(new Set([...setup.parameters, 'Sales', 'Revenue', 'Gross Margin'])).map((param) => {
                    const isSel = setup.parameters.includes(param);
                    return (
                      <button
                        key={param}
                        onClick={() => toggleParameter(param)}
                        className={`px-3.5 py-1.5 border rounded-full text-[11.5px] font-medium transition-all duration-200 cursor-pointer ${
                          isSel
                            ? 'bg-brand-indigo border-brand-indigo text-white shadow-[0_2px_8px_0_rgba(255,90,31,0.2)] font-semibold scale-102'
                            : 'bg-white/50 border-warm-border text-warm-muted hover:text-warm-text hover:bg-white hover:border-warm-border'
                        }`}
                      >
                        {param}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isFormInvalid && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-[12px] font-medium flex items-center gap-2 select-none animate-fade-in mt-4">
                  <span>⚠️</span>
                  <span>
                    <strong>Required Configuration Missing:</strong> Configure a {isFocalPointMissing && 'Primary Target Metric'}{isFocalPointMissing && (isSegmentsMissing || isVariablesMissing) && ' & '}{isSegmentsMissing && 'at least one Strategic Segment'}{(isSegmentsMissing || isFocalPointMissing) && isVariablesMissing && ' & '}{isVariablesMissing && 'at least one Growth Variable'} before proceeding.
                  </span>
                </div>
              )}
            </div>
          )}

          {subtab === 'sources' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Requirements Checklist */}
              <div className="border border-warm-border rounded-xl bg-warm-bg/40 p-4 flex flex-col gap-3">
                <span className="text-[11px] font-bold text-warm-muted uppercase tracking-wider block">
                  Scenario Requirements Checklist
                </span>
                
                <div className="flex flex-col gap-2">
                  {setup.sources.length > 0 ? (
                    setup.sources.map((src, idx) => (
                      <div key={idx} className="flex items-start justify-between text-[12px] bg-white p-2.5 rounded-lg border border-warm-border/50">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-sage-light border border-sage-border flex items-center justify-center">
                            <span className="text-[9px] font-bold text-sage">✓</span>
                          </div>
                          <div>
                            <span className="font-semibold text-warm-text block">{src.name}</span>
                            <span className="text-[10px] text-warm-muted">{src.fields} metrics · {src.rows.toLocaleString()} records populated</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-sage-light text-sage border border-sage-border text-[9px] font-bold uppercase">Ready</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-start justify-between text-[12px] bg-[#FFF2EE] p-2.5 rounded-lg border border-peach/30">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-peach/10 border border-peach/30 flex items-center justify-center">
                          <span className="text-[11px] font-bold text-brand-indigo">!</span>
                        </div>
                        <div>
                          <span className="font-semibold text-brand-indigo block">No Dataset File Populated</span>
                          <span className="text-[10px] text-warm-muted">Upload CSV or Excel file to populate workspace data tables.</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-peach-light text-brand-indigo border border-peach/20 text-[9px] font-bold uppercase">Pending</span>
                    </div>
                  )}
                </div>

                <div className="text-[10.5px] text-warm-muted leading-normal mt-1 p-2.5 bg-white border border-warm-border/40 rounded-lg">
                  💡 <strong>Simulation Advice:</strong> Data uploaded to this batch is automatically populated, vectorised, and mapped to your decision model.
                </div>
              </div>

              {/* Upload Dropzone Bar */}
              <div className="border border-dashed border-warm-border rounded-xl bg-white p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-lavender/40 border border-lavender/50 flex items-center justify-center">
                    <Upload className="h-4 w-4 text-brand-indigo" />
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-warm-text block">Upload Dataset File</span>
                    <span className="text-[10.5px] text-warm-muted block">
                      `POST /optimization/data-population/upload-file` (.csv, .xlsx, .xls, .docx, .doc)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="px-3.5 py-1.5 bg-brand-indigo hover:opacity-90 active:opacity-100 text-white rounded-lg text-[11.5px] font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {uploadLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {uploadLoading ? 'Uploading...' : 'Select File'}
                </button>
              </div>

              {/* Active Sources List */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-warm-muted uppercase tracking-[0.08em] select-none block mb-1">
                  Active Spreadsheet Tables ({setup.sources.length})
                </span>
                <div className="flex flex-col gap-2.5">
                  {setup.sources.map((src, sIdx) => {
                    const isInspected = inspectedTableId === src.name;
                    return (
                      <div key={sIdx} className="flex flex-col rounded-xl bg-warm-bg border border-warm-border/60 overflow-hidden transition-all duration-200">
                        <div
                          onClick={() => setInspectedTableId(isInspected ? null : src.name)}
                          className="flex items-center justify-between p-3.5 hover:bg-white transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-lavender/35 border border-lavender/40 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-brand-indigo" />
                            </div>
                            <span className="text-[12px] font-bold font-mono text-warm-text truncate max-w-[240px]">
                              {src.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-warm-muted font-sans font-semibold">
                              {src.fields} metrics · {src.rows.toLocaleString()} historical records
                            </span>
                            <span className="text-[10.5px] font-semibold text-brand-indigo hover:underline">
                              {isInspected ? 'Collapse Details' : 'Review Columns'}
                            </span>
                          </div>
                        </div>

                        {isInspected && (
                          <div className="border-t border-warm-border/40 bg-white/70 p-3.5 flex flex-col gap-2 animate-float-up">
                            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-wider block mb-1">Dataset Profile</span>
                            <div className="flex items-center gap-4 text-[11px] text-warm-text font-sans">
                              <span><strong>Columns:</strong> {src.fields} metrics</span>
                              <span><strong>Rows:</strong> {src.rows.toLocaleString()} records</span>
                              <span><strong>Status:</strong> Populated & Vectorised</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-warm-bg border-t border-warm-border flex items-center justify-between shrink-0 font-sans">
          <span className="text-[11px] text-warm-muted">
            {subtab === 'sources'
              ? `${setup.sources.length} baseline datasets loaded successfully`
              : `${setup.sources.length} baseline datasets · ${setup.segments.length + setup.parameters.length + 1} business variables configured`
            }
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={saveDraftLoading}
              className="px-3 py-1.5 border border-warm-border bg-white hover:bg-secondary rounded-lg text-[12px] font-semibold text-warm-text transition-colors cursor-pointer font-sans disabled:opacity-50 flex items-center gap-1.5"
            >
              {saveDraftLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : draftSaved ? '✓ Saved' : 'Save Draft'}
            </button>
            <button
              onClick={async () => {
                if (subtab === 'sources') {
                  navigate('/dashboard/blueprint/general');
                } else {
                  // Pass configuration choices to AI agent
                  try {
                    const setupPrompt = `Configured simulation focus: Primary Metric: "${setup.focalPoint || 'Target Growth'}", Horizon: "${setup.timeRange || 'Quarterly'}", Segments: [${setup.segments.join(', ')}], Parameters: [${setup.parameters.join(', ')}]. ${setup.sources.length} baseline datasets loaded.`;
                    addMessage({ role: 'user', content: setupPrompt });

                    const agentRes = await api.agentChat({
                      message: setupPrompt,
                      batch_id: activeBatchId || '',
                    });

                    let replyContent = agentRes.reply;
                    if (agentRes.tools_used && agentRes.tools_used.length > 0) {
                      const formattedTools = agentRes.tools_used.map((t: string) => {
                        const clean = t.replace(/_/g, ' ');
                        return clean.charAt(0).toUpperCase() + clean.slice(1);
                      });
                      replyContent += `\n\n*Executed:* \`${formattedTools.join('`, `')}\``;
                    }

                    addMessage({ role: 'ai', content: replyContent });
                  } catch (err) {
                    console.warn('Agent setup message notice:', err);
                  }

                  navigate('/dashboard/ecr-build');
                }
              }}
              disabled={(!subtab || subtab === 'general') && isFormInvalid}
              className="px-4 py-1.5 bg-brand-indigo hover:opacity-90 active:opacity-100 text-white rounded-lg text-[12px] font-bold shadow-sm transition-colors flex items-center gap-1 cursor-pointer font-sans disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {subtab === 'sources' ? 'View Setup Summary' : 'Proceed to Simulation Builder'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
