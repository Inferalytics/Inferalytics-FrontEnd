import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ArrowLeft, Sparkles, Send, Database, Calculator, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Message } from '../../types';

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

const METRIC_PROVENANCE_INFO: Record<string, {
  source: string;
  formula: string;
  accuracy: string;
  method: string;
  link: string;
}> = {
  'revenue': {
    source: 'q2_revenue_raw.xlsx (Enterprise Tier ARR)',
    formula: 'optimized_revenue = base_arr * (1 + delta_price) * (1 - elastic_churn)',
    accuracy: 'Newton-Raphson Convergence within Epsilon = 1e-6 (99.8% precision)',
    method: 'IPS Inference Solver (Gradient-based Optimization)',
    link: '/dashboard/ips-engine'
  },
  'revenue outcome': {
    source: 'q2_revenue_raw.xlsx (Enterprise Tier ARR)',
    formula: 'optimized_revenue = base_arr * (1 + delta_price) * (1 - elastic_churn)',
    accuracy: 'Newton-Raphson Convergence within Epsilon = 1e-6 (99.8% precision)',
    method: 'IPS Inference Solver (Gradient-based Optimization)',
    link: '/dashboard/ips-engine'
  },
  'cost centre': {
    source: 'cost_centre_2024.csv (Budget Allocations)',
    formula: 'optimized_cost = base_allocation * (1 - cost_reduction_coefficient)',
    accuracy: 'Departmental budget variance mapping, deviation limit <= 10%',
    method: 'IPS Optimization (Newton-Raphson linear constraints)',
    link: '/dashboard/ips-engine'
  },
  'cost allocation': {
    source: 'cost_centre_2024.csv (Budget Allocations)',
    formula: 'optimized_cost = base_allocation * (1 - cost_reduction_coefficient)',
    accuracy: 'Departmental budget variance mapping, deviation limit <= 10%',
    method: 'IPS Optimization (Newton-Raphson linear constraints)',
    link: '/dashboard/ips-engine'
  },
  'gross margin': {
    source: 'region_mapping.json & cost_centre_2024.csv',
    formula: 'gross_margin = (revenue_outcome - cost_allocation) / revenue_outcome',
    accuracy: 'Derived ratio calculation (100% deterministic arithmetic)',
    method: 'ECR Algebraic Representation',
    link: '/dashboard/blueprint/general'
  },
  'churn rate': {
    source: 'q2_revenue_raw.xlsx (Historical Renewal Cohorts)',
    formula: 'predicted_churn = base_churn_rate * (delta_price * sensitivity_multiplier)',
    accuracy: 'Elasticity log-regression curve fit (94% predictive historical matching)',
    method: 'IPS Predictive Simulation Model',
    link: '/dashboard/blueprint/general'
  },
  'egr achieved': {
    source: 'Model Convergence (Composite target output)',
    formula: 'EGR = compounded_quarterly_growth_rate(Quarterly_Balances)',
    accuracy: 'Optimization convergence achieved in 1200ms (13.2% vs 12% target)',
    method: 'IPS Newton-Raphson Solver Output',
    link: '/dashboard/ips-engine'
  },
  'egr performance': {
    source: 'Model Convergence (Composite target output)',
    formula: 'EGR = compounded_quarterly_growth_rate(Quarterly_Balances)',
    accuracy: 'Optimization convergence achieved in 1200ms (13.2% vs 12% target)',
    method: 'IPS Newton-Raphson Solver Output',
    link: '/dashboard/ips-engine'
  },
  'forecasted egr': {
    source: 'Model Projections (Scenario Comparison)',
    formula: 'delta_EGR = Scenario_B_EGR - Scenario_A_EGR (+1.4pp)',
    accuracy: 'Run comparative time-series projections',
    method: 'IPS Prediction comparison',
    link: '/dashboard/ips-engine'
  },
  'egr gap vs target': {
    source: 'Model Projections (Scenario Comparison)',
    formula: 'gap = Scenario_B_EGR - target_EGR (+1.2pp)',
    accuracy: 'Convergence error delta checks',
    method: 'IPS Prediction comparison',
    link: '/dashboard/ips-engine'
  }
};

export default function ProvenanceInspector() {
  const {
    selectedProvenanceMetric,
    setSelectedProvenanceMetric,
    provenanceConversations,
    addProvenanceMessage,
    workspaceMetrics,
    updateWorkspaceMetric
  } = useStore();

  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const metric = selectedProvenanceMetric || 'Revenue';
  const key = metric.toLowerCase();

  const currentMetricObj = workspaceMetrics.find(m => m.name.toLowerCase() === key);
  const currentMetricVal = currentMetricObj ? currentMetricObj.value : '';
  const [editVal, setEditVal] = useState(currentMetricVal);

  useEffect(() => {
    setEditVal(currentMetricVal);
  }, [currentMetricVal]);

  const isEditable = ['revenue', 'revenue outcome', 'cost centre', 'cost allocation', 'churn rate'].includes(key);

  const handleUpdate = () => {
    updateWorkspaceMetric(metric, editVal);
  };

  const info = METRIC_PROVENANCE_INFO[key] || {
    source: 'Multiple spreadsheet records parsed by ECR',
    formula: 'Derived via ECR node connections',
    accuracy: 'Standard computation',
    method: 'IPS Engine Output',
    link: '/dashboard/blueprint/general'
  };

  const conversation = provenanceConversations[key] || [
    {
      role: 'ai',
      content: `Welcome to the **${metric} Provenance Inspector**. Ask me how this metric was derived inside the ECR.`,
      chips: ["What sheet did this come from?", "How was this computed?"]
    }
  ];

  const isThinking = conversation.some((m) => m.isTyping);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    addProvenanceMessage(metric, { role: 'user', content: inputVal });
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full justify-between animate-fade-in">
      {/* Header */}
      <div className="h-12 border-b border-warm-border/40 px-4 flex items-center justify-between bg-white/50 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setSelectedProvenanceMetric(null)}
          className="flex items-center gap-1 text-[11px] font-bold text-brand-indigo hover:text-brand-indigo/80 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to AI Engine
        </button>
        <span className="text-[10px] font-mono text-warm-muted bg-peach-light border border-peach/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
          Provenance
        </span>
      </div>

      {/* Body containing Provenance Details + Chat */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {/* Title */}
        <div className="flex flex-col">
          <span className="text-[10px] text-warm-muted font-bold uppercase tracking-wider">Inspecting Metric</span>
          <h2 className="text-[16px] font-bold text-warm-text">{metric} Outcome</h2>
        </div>

        {/* Parameter Editor Card */}
        {isEditable ? (
          <div className="bg-white border border-warm-border/80 rounded-2xl p-3 flex flex-col gap-2 shadow-sm animate-float-up">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-warm-text uppercase">Modify Parameter</span>
              <span className="text-[9px] text-brand-indigo font-mono bg-lavender/30 px-2 py-0.5 rounded-full font-bold">Interactive ECR</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-warm-border rounded-xl text-[12px] font-mono text-warm-text focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo"
                placeholder={`Enter new ${metric} value...`}
              />
              <button
                onClick={handleUpdate}
                className="px-3.5 py-1.5 bg-brand-indigo hover:bg-brand-indigo/90 text-white rounded-xl text-[11px] font-bold shadow-sm cursor-pointer transition-colors shrink-0"
              >
                Update Model
              </button>
            </div>
            <span className="text-[9px] text-warm-muted leading-relaxed">
              Modifying this parameter will dynamically run the ECR IPS engine to solve and propagate changes immediately.
            </span>
          </div>
        ) : (
          <div className="bg-secondary/40 border border-warm-border/60 rounded-2xl p-3 flex flex-col gap-1.5 shadow-sm animate-float-up">
            <span className="text-[10px] font-bold text-warm-muted uppercase">Computed Outcome</span>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold font-mono text-warm-text">{currentMetricVal}</span>
              <span className="text-[9.5px] font-mono text-sage bg-sage-light border border-sage-border px-2 py-0.5 rounded-full font-bold">ECR Derived</span>
            </div>
            <span className="text-[9px] text-warm-muted leading-relaxed">
              This outcome is a derived structural calculation of the world model and cannot be edited directly. To adjust, modify the inputs above.
            </span>
          </div>
        )}

        {/* Computational Lineage Details Card */}
        <div className="bg-white border border-warm-border/80 rounded-2xl p-3.5 flex flex-col gap-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-brand-indigo font-bold text-[11px] uppercase tracking-wide border-b border-warm-bg pb-2">
            <Database className="h-3.5 w-3.5 shrink-0" />
            <span>Computational Lineage</span>
          </div>

          <div className="flex flex-col gap-2.5 text-[11.5px] leading-relaxed text-warm-text">
            <div>
              <span className="text-warm-muted font-semibold block text-[10px] uppercase">Data Source Origin:</span>
              <span className="font-mono text-[11px] block mt-0.5 bg-warm-bg/40 px-2 py-1 rounded border border-warm-border/30 text-warm-text truncate" title={info.source}>
                {info.source}
              </span>
            </div>

            <div>
              <span className="text-warm-muted font-semibold block text-[10px] uppercase">Mathematical Formula:</span>
              <span className="font-mono text-[10.5px] block mt-0.5 bg-warm-bg/40 px-2 py-1 rounded border border-warm-border/30 text-warm-text break-words">
                {info.formula}
              </span>
            </div>

            <div>
              <span className="text-warm-muted font-semibold block text-[10px] uppercase">Calculation Method:</span>
              <span className="block mt-0.5 font-semibold text-warm-text">
                {info.method}
              </span>
            </div>

            <div>
              <span className="text-warm-muted font-semibold block text-[10px] uppercase">Verification & Accuracy:</span>
              <span className="block mt-0.5 text-warm-muted text-[11px]">
                {info.accuracy}
              </span>
            </div>
          </div>

          {/* Go Back button */}
          <button
            onClick={() => navigate(info.link)}
            className="w-full mt-1.5 py-1.5 border border-brand-indigo/35 bg-lavender/10 hover:bg-lavender/25 text-brand-indigo rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <Calculator className="h-3.5 w-3.5" />
            Adjust Computation Parameters
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {/* AI Conversation Section */}
        <div className="flex items-center gap-1.5 text-brand-indigo font-bold text-[11px] uppercase tracking-wide border-t border-warm-border/40 pt-4 mt-1">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Lineage Conversation</span>
        </div>

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
                <div className="bg-white border border-warm-border px-3.5 py-2.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 bg-brand-indigo rounded-full animate-typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <div
                  className={`px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-sm border ${
                    isAI
                      ? 'bg-white border-warm-border text-warm-text rounded-2xl rounded-bl-sm'
                      : 'bg-lavender/30 border-lavender/50 text-brand-indigo rounded-2xl rounded-br-sm'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {renderFormattedText(msg.content)}

                  {isAI && msg.chips && msg.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-warm-border/50">
                      {msg.chips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => addProvenanceMessage(metric, { role: 'user', content: chip })}
                          className="px-2.5 py-1 rounded-full bg-lavender/40 hover:bg-lavender/60 text-brand-indigo text-[10px] font-medium transition-colors cursor-pointer border border-lavender/30 animate-fade-in"
                        >
                          + {chip}
                        </button>
                      ))}
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
      <div className="p-3 border-t border-warm-border/40 bg-white/30 shrink-0">
        <div className="relative border border-warm-border bg-white/60 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-brand-indigo transition-all overflow-hidden flex flex-col justify-between min-h-[72px]">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            placeholder={`Ask about ${metric} provenance...`}
            className="w-full px-3 py-2 text-[12.5px] text-warm-text bg-transparent placeholder-warm-muted border-none outline-none focus:ring-0 resize-none max-h-16 disabled:opacity-50"
          />
          <div className="px-3 pb-1.5 flex justify-between items-center bg-transparent">
            <span className="text-[9px] text-warm-muted font-mono font-medium">
              Press ⏎ to send
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
    </div>
  );
}
