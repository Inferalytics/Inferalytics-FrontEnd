import { create } from 'zustand';
import { GlobalState, Batch, Message, Relationship, DimensionCard, Scenario, ModelType, WorldModel } from '../types';
import api from '../api';

const INITIAL_PROVENANCE_CONVERSATIONS: Record<string, Message[]> = {};

const INITIAL_CONVERSATION: Message[] = [
  {
    role: 'ai',
    content: "Hi there! I'm here to help you frame a decision. We can talk it through first — once I understand the shape of the problem, I'll know what data to ask you for.\n\nA few common starting points, or just describe it in your own words:",
    chips: [
      'I want to raise prices',
      'Hit a growth target next year',
      'Reduce operating costs',
      'Reallocate marketing spend'
    ]
  }
];

const INITIAL_BATCHES: Batch[] = [];

const INITIAL_RELATIONSHIPS: Relationship[] = [];

const INITIAL_GROWTH_RATES: { segment: string; q1: string; q2: string; q3: string; q4Proj: string; yoy: string }[] = [];

const INITIAL_DIMENSIONS = (screen: number): DimensionCard[] => {
  return [];
};

const INITIAL_SCENARIOS: Scenario[] = [];

const INITIAL_WORKSPACE_METRICS: { name: string; value: string; delta: string; dir: 'up' | 'down' | 'flat' }[] = [];

export const useStore = create<GlobalState>((set, get) => ({
  screen: 1,
  batches: INITIAL_BATCHES,
  activeBatchId: '',
  model: 'auto',
  conversation: INITIAL_CONVERSATION,
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  setup: {
    focalPoint: '',
    timeGranularity: 'Quarter',
    timeRange: '',
    segments: [],
    parameters: [],
    sources: []
  },
  relationships: INITIAL_RELATIONSHIPS,
  growthRates: INITIAL_GROWTH_RATES,
  dimensions: INITIAL_DIMENSIONS(4),
  egrTarget: 12,
  scenarios: INITIAL_SCENARIOS,
  optimisationResult: null,
  worldModels: [],
  selectedProvenanceMetric: null,
  provenanceConversations: INITIAL_PROVENANCE_CONVERSATIONS,
  workspaceMetrics: INITIAL_WORKSPACE_METRICS,

  setScreen: (screen: number) => {
    set({
      screen,
      // Adjust dimensions structure automatically depending on screen
      dimensions: INITIAL_DIMENSIONS(screen)
    });
  },

  setActiveBatch: (id: string) => {
    set({
      activeBatchId: id,
      batches: get().batches.map((b) => ({
        ...b,
        status: b.id === id ? 'active' : b.status === 'active' ? 'idle' : b.status
      })),
      // Clear batch-specific data so previous batch results don't bleed through
      worldModels: [],
      scenarios: [],
    });
    if (get().syncBackendState) {
      void get().syncBackendState!();
    }
  },

  setModel: (model: ModelType) => {
    set({ model });
  },

  addMessage: (msg: Message) => {
    set({ conversation: [...get().conversation, { ...msg, content: msg.content || '' }] });
  },

  toggleSegment: (segment: string) => {
    const current = get().setup.segments;
    const next = current.includes(segment)
      ? current.filter((s) => s !== segment)
      : [...current, segment];
    set({ setup: { ...get().setup, segments: next } });
  },

  toggleParameter: (param: string) => {
    const current = get().setup.parameters;
    const next = current.includes(param)
      ? current.filter((p) => p !== param)
      : [...current, param];
    set({ setup: { ...get().setup, parameters: next } });
  },

  setFocalPoint: (val: string) => {
    set({ setup: { ...get().setup, focalPoint: val } });
  },

  setTimeGranularity: (val: string) => {
    set({ setup: { ...get().setup, timeGranularity: val } });
  },

  toggleRelationshipConfirmed: (index: number) => {
    const relations = [...get().relationships];
    relations[index].confirmed = !relations[index].confirmed;
    set({ relationships: relations });
  },

  toggleDimensionToBatcher: (id: string) => {
    set({
      dimensions: get().dimensions.map((d) => {
        if (d.id === id) {
          return { ...d, selected: !d.selected };
        }
        return d;
      })
    });
  },

  setDimensionSelected: (id: string) => {
    get().toggleDimensionToBatcher(id);
  },

  fetchBatchesFromApi: async () => {
    try {
      const res = await api.listBatches();
      if (res?.data?.batches?.length > 0) {
        const currentActiveId = get().activeBatchId;
        const fetchedBatches = res.data.batches.map((b) => ({
          id: b.batch_id,
          name: b.batch_name,
          status: (b.batch_id === currentActiveId ? 'active' : 'idle') as 'active' | 'idle' | 'archived',
        }));
        // Only override activeBatchId if none is set yet
        const updates: Partial<GlobalState> = { batches: fetchedBatches };
        if (!currentActiveId) {
          updates.activeBatchId = fetchedBatches[0].id;
        }
        set(updates as any);
      }
    } catch (err) {
      console.warn('Backend batches not available, using local batches:', err);
    }
  },

  createBatchApi: async (name: string) => {
    try {
      const res = await api.createBatch(name);
      const newBatch = {
        id: res.data.batch_id,
        name: res.data.batch_name,
        status: 'active' as const,
      };

      // Call POST /batching/switch so the backend activates the newly created batch workspace
      try {
        await api.switchBatch(newBatch.id);
      } catch (switchErr) {
        console.warn('Backend switchBatch notice during create:', switchErr);
      }

      set({
        batches: [newBatch, ...get().batches.map(b => ({ ...b, status: 'idle' as const }))],
        activeBatchId: newBatch.id,
      });

      if (get().syncBackendState) {
        void get().syncBackendState!();
      }

      return newBatch.id;
    } catch (err) {
      console.error('Failed to create batch via API:', err);
      throw err;
    }
  },

  switchBatchApi: async (id: string) => {
    try {
      await api.switchBatch(id);
      get().setActiveBatch(id);
      if (get().syncBackendState) {
        await get().syncBackendState!();
      }
    } catch (err) {
      console.warn('API switchBatch failed, falling back to local state:', err);
      get().setActiveBatch(id);
    }
  },

  deleteBatchApi: async (id: string) => {
    try {
      await api.deleteBatch(id);
      const remaining = get().batches.filter(b => b.id !== id);
      set({ batches: remaining });
      if (get().activeBatchId === id && remaining.length > 0) {
        get().setActiveBatch(remaining[0].id);
      }
    } catch (err) {
      console.warn('API deleteBatch failed, deleting locally:', err);
      const remaining = get().batches.filter(b => b.id !== id);
      set({ batches: remaining });
      if (get().activeBatchId === id && remaining.length > 0) {
        get().setActiveBatch(remaining[0].id);
      }
    }
  },

  syncBackendState: async () => {
    try {
      // 1. Sync EGR Target
      try {
        const egrRes = await api.getEgr().catch(() => null);
        if (egrRes?.data?.egr_value) {
          const pct = (egrRes.data.egr_value - 1) * 100;
          set({ egrTarget: parseFloat(pct.toFixed(2)) });
        }
      } catch {}

      // 2. Sync Populated Data & Extract Real Blueprint Metadata
      try {
        const dataRes = await api.retrieveData().catch(() => null);
        if (dataRes?.data?.records?.length > 0) {
          const records = dataRes.data.records;
          const sources = records.map(r => ({
            name: r.file_name,
            fields: r.column_count,
            rows: r.row_count,
          }));

          // Inspect the data_content of the latest dataset record
          const latestRecord = records[records.length - 1];
          const content = latestRecord.data_content;

          let updatedSetup = {
            ...get().setup,
            sources,
          };

          if (Array.isArray(content) && content.length > 0) {
            const firstItem = content[0];
            const keys = Object.keys(firstItem);

            // Extract real metrics (numeric columns) and real segments (text/categorical columns)
            const realParameters: string[] = [];
            const realSegments: string[] = [];
            let realPeriods: string[] = [];

            keys.forEach(key => {
              const lowerKey = key.toLowerCase();
              if (lowerKey === 'period' || lowerKey === 'quarter' || lowerKey === 'year' || lowerKey === 'date' || lowerKey === 'time') {
                // Collect unique periods
                realPeriods = Array.from(new Set(content.map((row: any) => String(row[key])))).filter(Boolean);
              } else if (typeof firstItem[key] === 'number') {
                realParameters.push(key);
              } else {
                realSegments.push(key);
              }
            });

            const focalPointName = realParameters.length > 0
              ? `${realParameters[0]} Optimization (${realPeriods[0] || 'Q1'} → ${realPeriods[realPeriods.length - 1] || 'Q4'})`
              : latestRecord.file_name;

            const timeRangeStr = realPeriods.length > 0
              ? `${realPeriods[0]} → ${realPeriods[realPeriods.length - 1]}`
              : 'Q1 2023 → Q2 2024';

            // Group content into real growth rates by segment combinations (e.g. Region + Category)
            const growthRatesMap: Record<string, { q1: number; q2: number; q3: number; q4: number }> = {};
            content.forEach((row: any) => {
              const segName = realSegments.map(s => String(row[s])).filter(Boolean).join(' · ') || 'Baseline';
              const salesVal = typeof row.Sales === 'number' ? row.Sales : (typeof row[realParameters[0]] === 'number' ? row[realParameters[0]] : 0);
              const p = String(row.Period || row.Quarter || '').toUpperCase();

              if (!growthRatesMap[segName]) {
                growthRatesMap[segName] = { q1: 0, q2: 0, q3: 0, q4: 0 };
              }
              if (p.includes('Q1')) growthRatesMap[segName].q1 += salesVal;
              else if (p.includes('Q2')) growthRatesMap[segName].q2 += salesVal;
              else if (p.includes('Q3')) growthRatesMap[segName].q3 += salesVal;
              else if (p.includes('Q4')) growthRatesMap[segName].q4 += salesVal;
            });

            const realGrowthRates = Object.entries(growthRatesMap).map(([seg, vals]) => {
              const yoyVal = vals.q1 > 0 ? (((vals.q4 || vals.q2) - vals.q1) / vals.q1 * 100).toFixed(1) : '0.0';
              return {
                segment: seg,
                q1: `$${(vals.q1 / 1000).toFixed(0)}K`,
                q2: `$${(vals.q2 / 1000).toFixed(0)}K`,
                q3: `$${(vals.q3 / 1000).toFixed(0)}K`,
                q4Proj: `$${((vals.q4 || vals.q2 * 1.1) / 1000).toFixed(0)}K`,
                yoy: `${Number(yoyVal) >= 0 ? '+' : ''}${yoyVal}%`,
              };
            });

            updatedSetup = {
              ...updatedSetup,
              focalPoint: focalPointName,
              timeRange: timeRangeStr,
              segments: realSegments.length > 0 ? realSegments : get().setup.segments,
              parameters: realParameters.length > 0 ? realParameters : get().setup.parameters,
            };

            set({
              setup: updatedSetup,
              growthRates: realGrowthRates.length > 0 ? realGrowthRates : get().growthRates,
            });
          } else {
            set({ setup: updatedSetup });
          }
        }
      } catch (err) {
        console.warn('Failed to extract real data content metadata:', err);
      }


    } catch (err) {
      console.warn('Backend sync failed:', err);
    }
  },

  setEgrTarget: (val: number) => {
    set({ egrTarget: val });
  },

  addWorldModel: (wm: WorldModel) => {
    // Dedupe by scenario_id
    const existing = get().worldModels;
    const filtered = existing.filter(w => w.scenario_id !== wm.scenario_id);
    set({ worldModels: [...filtered, wm] });

    // Convert WorldModel → Scenario for ResultsPanel/ComparePanel
    const opt = wm.optimization_result;
    const finalPct = parseFloat((opt.final_egr_percentage || '').replace(/[^0-9.\-]/g, '')) || 0;
    const newScenario: Scenario = {
      id: wm.scenario_id,
      label: wm.scenario_label || `Scenario ${wm.scenario_number}`,
      revenue: '—',
      yoy: opt.final_egr_percentage,
      egr: opt.final_egr_percentage,
      sparkColor: 'green',
      sparkData: [100, 105, 110, 115, 120, Math.round(100 + finalPct)],
      checked: true,
    };

    const currentScenarios = get().scenarios.filter(s => s.id !== wm.scenario_id);
    set({ scenarios: [newScenario, ...currentScenarios.slice(0, 4)] });

    // Update optimisationResult
    const targetPct = parseFloat((wm.egr_target_percentage || '').replace(/[^0-9.\-]/g, '')) || 0;
    set({
      egrTarget: targetPct,
      optimisationResult: {
        method: wm.optimization_method || 'Newton-Raphson',
        timestamp: new Date().toLocaleTimeString(),
        durationMs: 0,
        converged: opt.converged,
        rows: [
          { name: 'Target Growth', value: wm.egr_target_percentage, delta: '— target', deltaDir: 'flat' },
          { name: 'Achieved Growth', value: opt.final_egr_percentage, delta: wm.status === 'converged' ? 'Converged' : 'Non-converged', deltaDir: wm.status === 'converged' ? 'up' : 'down' },
          { name: 'Iterations', value: `${opt.iterations}`, delta: `Error: ${opt.convergence_error?.toExponential(2) ?? '0'}`, deltaDir: 'flat' },
        ],
        egrAchieved: finalPct,
        target: targetPct,
      },
    });
  },

  toggleScenarioChecked: (id: string) => {
    const updatedScenarios = get().scenarios.map((s) => 
      s.id === id ? { ...s, checked: !s.checked } : s
    );
    set({ scenarios: updatedScenarios });

    // If both scenarios are checked, trigger automatic transition to Screen 07 (Compare) after 300ms
    const activeChecked = updatedScenarios.filter((s) => s.checked);
    if (activeChecked.length === 2) {
      setTimeout(() => {
        get().setScreen(7);
      }, 300);
    }
  },

  runOptimisation: async (callback: () => void) => {
    const thread = [...get().conversation];
    set({
      conversation: [
        ...thread,
        { role: 'ai', content: '', isTyping: true }
      ]
    });

    let errorMsg: string | null = null;
    try {
      // Persist the UI's EGR target to the backend — /optimize reads it from
      // the DB, not from the request body, so this must run first.
      await api.setEgr(1 + get().egrTarget / 100);
      await api.optimize();
      if (get().syncBackendState) {
        await get().syncBackendState!();
      }
    } catch (err: any) {
      errorMsg = err?.response?.data?.detail || err?.message || 'Optimisation failed.';
      console.warn('Backend optimize call failed:', err);
    } finally {
      const cleanThread = get().conversation.filter((m) => !m.isTyping);
      set({
        screen: 6,
        conversation: errorMsg
          ? [...cleanThread, { role: 'ai', content: `Error: ${errorMsg}` }]
          : cleanThread
      });
      get().setScreen(6);
      callback();
    }
  },

  runScenarioB: async (callback: () => void) => {
    const thread = [...get().conversation];
    set({
      conversation: [
        ...thread,
        { role: 'ai', content: '', isTyping: true }
      ]
    });

    let errorMsg: string | null = null;
    try {
      await api.setEgr(1 + get().egrTarget / 100);
      await api.optimize();
      if (get().syncBackendState) {
        await get().syncBackendState!();
      }
    } catch (err: any) {
      errorMsg = err?.response?.data?.detail || err?.message || 'Optimisation failed.';
      console.warn('Backend optimize call failed for Scenario B:', err);
    } finally {
      const cleanThread = get().conversation.filter((m) => !m.isTyping);
      set({
        screen: 7,
        conversation: errorMsg
          ? [...cleanThread, { role: 'ai', content: `Error: ${errorMsg}` }]
          : cleanThread
      });
      get().setScreen(7);
      callback();
    }
  },

  resetAll: () => {
    set({
      screen: 1,
      conversation: INITIAL_CONVERSATION,
      activeBatchId: '',
      model: 'auto',
      relationships: INITIAL_RELATIONSHIPS,
      dimensions: INITIAL_DIMENSIONS(4),
      scenarios: INITIAL_SCENARIOS,
      optimisationResult: null,
      leftSidebarOpen: true,
      rightSidebarOpen: false
    });
  },

  setLeftSidebarOpen: (open: boolean) => set({ leftSidebarOpen: open }),
  setRightSidebarOpen: (open: boolean) => set({ rightSidebarOpen: open }),

  updateWorkspaceMetric: (name: string, value: string) => {
    const currentMetrics = [...get().workspaceMetrics];
    const updated = currentMetrics.map(m => {
      if (m.name.toLowerCase() === name.toLowerCase()) {
        return { ...m, value };
      }
      return m;
    });

    const getVal = (metricName: string, defaultVal: string) => {
      return updated.find(m => m.name.toLowerCase() === metricName.toLowerCase())?.value || defaultVal;
    };

    const revStr = getVal('Revenue', '$0');
    const costStr = getVal('Cost Centre', '$0');
    const churnStr = getVal('Churn Rate', '0%');

    const parseValue = (n: string, v: string): number => {
      const clean = v.replace(/[^0-9.]/g, '');
      let num = parseFloat(clean) || 0;
      if (v.toLowerCase().includes('m')) return num * 1000000;
      if (v.toLowerCase().includes('k')) return num * 1000;
      if (n.toLowerCase() === 'revenue') {
        if (num < 100) return num * 1000000;
      }
      if (n.toLowerCase() === 'cost centre') {
        if (num < 10000) return num * 1000;
      }
      return num;
    };

    const formatCurrency = (n: number): string => {
      if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
      return `$${n.toFixed(0)}`;
    };

    const revNum = parseValue('Revenue', revStr);
    const costNum = parseValue('Cost Centre', costStr);
    const churnNum = parseValue('Churn Rate', churnStr);

    const marginVal = revNum > 0 ? ((revNum - costNum) / revNum) * 100 : 0;
    const egrVal = 8.4 + (revNum / 2000000 - 1) * 24 - (costNum / 1000000 - 1) * 12 - (churnNum - 4) * 0.5;

    const revFormatted = formatCurrency(revNum);
    const costFormatted = formatCurrency(costNum);
    const marginFormatted = `${marginVal.toFixed(1)}%`;
    const churnFormatted = `${churnNum.toFixed(1)}%`;
    const egrFormatted = `${egrVal.toFixed(1)}%`;

    const finalMetrics = updated.map(m => {
      if (m.name === 'Revenue') {
        const deltaPct = ((revNum / 2000000 - 1) * 100).toFixed(0);
        return { ...m, value: revFormatted, delta: `↑ +${deltaPct}%`, dir: 'up' as const };
      }
      if (m.name === 'Cost Centre') {
        const deltaPct = ((1 - costNum / 1040000) * 100).toFixed(0);
        return { ...m, value: costFormatted, delta: `↓ −${deltaPct}%`, dir: 'down' as const };
      }
      if (m.name === 'Gross Margin') {
        return { ...m, value: marginFormatted, delta: marginVal >= 63.2 ? '— stable' : '↓ compress', dir: marginVal >= 63.2 ? ('flat' as const) : ('down' as const) };
      }
      if (m.name === 'Churn Rate') {
        return { ...m, value: churnFormatted, delta: churnNum <= 6.0 ? '✓ ≤ 6%' : '⚠ > 6%', dir: churnNum <= 6.0 ? ('flat' as const) : ('up' as const) };
      }
      if (m.name === 'EGR Achieved') {
        const diffEgr = (egrVal - 12.0).toFixed(1);
        const prefix = parseFloat(diffEgr) >= 0 ? '+' : '';
        return { ...m, value: egrFormatted, delta: `↑ ${prefix}${diffEgr}pp`, dir: 'up' as const };
      }
      return m;
    });

    const optResult = get().optimisationResult;
    const updatedOptResult = optResult ? {
      ...optResult,
      egrAchieved: parseFloat(egrVal.toFixed(1)),
      rows: optResult.rows.map(r => {
        if (r.name === 'Revenue') return { ...r, value: revFormatted };
        if (r.name === 'Cost Centre') return { ...r, value: costFormatted };
        return r;
      })
    } : null;

    const updatedScenarios = get().scenarios.map(s => {
      if (s.id === 'B') {
        return { ...s, revenue: revFormatted, egr: egrFormatted };
      }
      return s;
    });

    set({
      workspaceMetrics: finalMetrics,
      optimisationResult: updatedOptResult,
      scenarios: updatedScenarios
    });

    // Note the recomputed values inside the provenance chat
    const key = name.toLowerCase();
    const currentConv = get().provenanceConversations[key] || [];
    const noteReply = `Recalculated from **${value}** for **${name}**:\n\n* **Gross Margin**: ${marginFormatted}\n* **EGR Achieved**: ${egrFormatted}`;
    set({
      provenanceConversations: {
        ...get().provenanceConversations,
        [key]: [...currentConv, { role: 'ai', content: noteReply }]
      }
    });
  },

  setSelectedProvenanceMetric: (metric: string | null) => {
    set({ selectedProvenanceMetric: metric });
  },

  addProvenanceMessage: (metric: string, message: Message) => {
    const key = metric.toLowerCase();
    const currentConv = get().provenanceConversations[key] || [
      {
        role: 'ai',
        content: `Ask me how **${metric}** was derived from your batch data.`,
      }
    ];
    const updatedConv = [...currentConv, message];

    set({
      provenanceConversations: {
        ...get().provenanceConversations,
        [key]: updatedConv
      }
    });

    if (message.role === 'user') {
      const typingMsg: Message = { role: 'ai', content: '', isTyping: true };
      set({
        provenanceConversations: {
          ...get().provenanceConversations,
          [key]: [...updatedConv, typingMsg]
        }
      });

      const batchId = get().activeBatchId;
      api.agentChat({
        message: `Regarding the metric "${metric}": ${message.content}`,
        batch_id: batchId || '',
      }).then((res) => {
        const cleanConv = (get().provenanceConversations[key] || []).filter(m => !m.isTyping);
        set({
          provenanceConversations: {
            ...get().provenanceConversations,
            [key]: [...cleanConv, { role: 'ai', content: res.reply }]
          }
        });
      }).catch((err: any) => {
        const detail = err?.response?.data?.detail || err?.message || 'Failed to reach the agent.';
        const cleanConv = (get().provenanceConversations[key] || []).filter(m => !m.isTyping);
        set({
          provenanceConversations: {
            ...get().provenanceConversations,
            [key]: [...cleanConv, { role: 'ai', content: `Error: ${detail}` }]
          }
        });
      });
    }
  }
}));
