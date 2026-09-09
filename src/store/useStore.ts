import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// The persisted store was previously corrupted by a storage adapter that
// didn't serialize through createJSONStorage — localStorage ended up holding
// the literal string "[object Object]" instead of JSON. Clear that one-time
// so rehydration doesn't throw on JSON.parse and silently reset to defaults.
try {
  const raw = localStorage.getItem('inferalytics-store');
  if (raw && (raw.startsWith('[object') || raw === 'undefined')) {
    localStorage.removeItem('inferalytics-store');
  }
} catch { /* ignore */ }
import { GlobalState, Batch, Message, Relationship, DimensionCard, Scenario, ModelType, WorldModel } from '../types';
import type { ForecastScenariosResponse } from '../types/api';
import api from '../api';
import { buildFullScenarioPrompt, nextStrategy, shouldRefreshForecast } from '../lib/agentNavigation';

/**
 * Module-level forecast page cache — never persisted, never hits localStorage.
 * Set by the pipeline after computation completes so ForecastPage renders
 * immediately without an extra network round-trip.
 */
let _forecastPageCache: ForecastScenariosResponse | null = null;
export const getForecastPageCache = () => _forecastPageCache;
export const setForecastPageCache = (data: ForecastScenariosResponse | null) => {
  _forecastPageCache = data;
};

/**
 * Module-level world models cache — never persisted, never hits localStorage.
 * Survives route changes within the same tab session (but not full page refresh).
 * Stores all batches; filter by batch_id when reading.
 */
let _worldModelsCache: WorldModel[] = [];
export const getWorldModelsCache = () => _worldModelsCache;
export const addToWorldModelsCache = (wm: WorldModel) => {
  _worldModelsCache = [..._worldModelsCache.filter(w => w.scenario_id !== wm.scenario_id), wm];
};

export const formatByColumnName = (colName: string, val: number): string => {
  const name = colName.toLowerCase();
  
  if (['revenue', 'sales', 'price', 'cost', 'income', 'profit'].some(keyword => name.includes(keyword))) {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  }
  
  if (['rate', 'ratio', 'margin', 'growth'].some(keyword => name.includes(keyword))) {
    return `${val.toFixed(1)}%`;
  }
  
  if (['weight', 'kg', 'lbs'].some(keyword => name.includes(keyword))) {
    const suffix = name.includes('lbs') ? 'lbs' : 'kg';
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M ${suffix}`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K ${suffix}`;
    return `${val.toFixed(0)} ${suffix}`;
  }
  
  if (['hours', 'duration'].some(keyword => name.includes(keyword))) {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M h`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K h`;
    return `${val.toFixed(0)} h`;
  }
  
  if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return `${val.toFixed(0)}`;
};

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

export function sortPeriodsChronologically(periods: string[]): string[] {
  return [...periods].sort((a, b) => {
    const parse = (str: string) => {
      const clean = str.trim().replace(/[_]/g, ' ');
      // Match Q1 2020, Q1_2020, 2020 Q1, 2020_Q1, Q1-2020
      const qMatch1 = clean.match(/^Q([1-4])\s*[-/]?\s*(\d{4})$/i);
      if (qMatch1) return parseInt(qMatch1[2], 10) * 10 + parseInt(qMatch1[1], 10);
      
      const qMatch2 = clean.match(/^(\d{4})\s*[-/]?\s*Q([1-4])$/i);
      if (qMatch2) return parseInt(qMatch2[1], 10) * 10 + parseInt(qMatch2[2], 10);

      // Match 4-digit year e.g. "2020"
      const yrMatch = clean.match(/^(\d{4})$/);
      if (yrMatch) return parseInt(yrMatch[1], 10) * 10;

      // Match months like Jan 2020 or 2020-01
      const d = Date.parse(clean);
      if (!isNaN(d)) return d;

      return NaN;
    };

    const valA = parse(a);
    const valB = parse(b);

    if (!isNaN(valA) && !isNaN(valB)) {
      return valA - valB;
    }
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export function buildVisualTableFromContent(
  content: any[],
  fileName: string = 'Dataset'
): import('../types').VisualTableWorkspaceState {
  if (!Array.isArray(content) || content.length === 0) {
    return {
      years: { historical: [], projected: [] },
      growthMultiplier: 1.0,
      activeScenarioName: 'Ready for Data Model',
      rows: []
    };
  }

  const firstItem = content[0];
  const keys = Object.keys(firstItem);

  // Check if wide table where columns are years/periods (e.g. '2020', '2021', '2022', 'Q1_2022', etc.)
  const yearRegex = /^(19|20)\d{2}$|^Q[1-4][_ -]?\d{2,4}$/i;
  const rawTimeCols = keys.filter(k => yearRegex.test(k.trim()));

  if (rawTimeCols.length >= 2) {
    const timeCols = sortPeriodsChronologically(rawTimeCols);
    // Wide table format: column headers are time periods
    const textCols = keys.filter(k => !timeCols.includes(k));
    const nameCol = textCols.find(k => ['item', 'name', 'metric', 'indicator', 'category', 'segment', 'row', 'department', 'region'].includes(k.toLowerCase())) || textCols[0] || keys[0];
    const sectionCol = textCols.find(k => ['section', 'group', 'type', 'macro_category', 'category'].includes(k.toLowerCase()) && k !== nameCol);

    const midPoint = Math.max(1, Math.floor(timeCols.length * 0.6));
    const historical = timeCols.slice(0, midPoint);
    const projected = timeCols.slice(midPoint);

    const isCurrency = nameCol.toLowerCase().includes('revenue') || nameCol.toLowerCase().includes('cost') || nameCol.toLowerCase().includes('sales') || nameCol.toLowerCase().includes('amount') || nameCol.toLowerCase().includes('price');

    const rows: import('../types').TableRowItem[] = content.map((row, idx) => {
      const values: Record<string, number> = {};
      timeCols.forEach(tc => {
        const parsed = typeof row[tc] === 'number' ? row[tc] : parseFloat(String(row[tc]).replace(/[^0-9.-]/g, ''));
        values[tc] = isNaN(parsed) ? 0 : parsed;
      });

      const rowName = String(row[nameCol] ?? `Metric ${idx + 1}`);
      const sectionName = sectionCol ? String(row[sectionCol] || 'Core Model') : (fileName.replace(/\.csv$/i, '') || 'Active Data Model');

      return {
        id: `row_${idx}`,
        name: rowName,
        section: sectionName,
        unit: isCurrency ? '$' : '',
        isCurrency: isCurrency,
        values
      };
    });

    return {
      years: { historical, projected },
      growthMultiplier: 1.0,
      activeScenarioName: `${fileName.replace(/\.csv$/i, '')} Baseline`,
      rows
    };
  }

  // Transactional / Long table format (e.g. Period, Sales, Region, Category)
  const periodCol = keys.find(k => ['period', 'quarter', 'year', 'date', 'time', 'month'].includes(k.toLowerCase()));
  const numCols = keys.filter(k => typeof firstItem[k] === 'number' || (!isNaN(Number(firstItem[k])) && k !== periodCol));
  const catCols = keys.filter(k => k !== periodCol && !numCols.includes(k));

  let uniquePeriods: string[] = [];
  if (periodCol) {
    const rawPeriods = Array.from(new Set(content.map(r => String(r[periodCol])))).filter(Boolean);
    uniquePeriods = sortPeriodsChronologically(rawPeriods);
  } else {
    uniquePeriods = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
  }

  const cleanPeriods = uniquePeriods.map(p => p.replace('_', ' '));
  let historical: string[] = [];
  let projected: string[] = [];

  if (cleanPeriods.length <= 4) {
    historical = [...cleanPeriods];
    const lastP = cleanPeriods[cleanPeriods.length - 1] || 'Q4 2024';
    const qMatch = lastP.match(/Q([1-4])[\s_]?(\d{4})/i);
    if (qMatch) {
      let q = parseInt(qMatch[1]);
      let yr = parseInt(qMatch[2]);
      for (let i = 0; i < 4; i++) {
        q++;
        if (q > 4) { q = 1; yr++; }
        projected.push(`Q${q} ${yr}`);
      }
    } else {
      const yrMatch = lastP.match(/\d{4}/);
      let baseYear = yrMatch ? parseInt(yrMatch[0]) : 2024;
      for (let i = 1; i <= 4; i++) {
        projected.push(String(baseYear + i));
      }
    }
  } else {
    const splitIdx = Math.max(1, Math.floor(cleanPeriods.length * 0.7));
    historical = cleanPeriods.slice(0, splitIdx);
    projected = cleanPeriods.slice(splitIdx);
  }

  const primaryNumCol = numCols[0] || 'Value';
  const numColLower = primaryNumCol.toLowerCase();
  const isNonCurrency = ['visit', 'patient', 'count', 'headcount', 'volume', 'qty', 'unit', 'hour', 'case', 'bed', 'user', 'session'].some(k => numColLower.includes(k));
  const isCurrency = !isNonCurrency && (['sales', 'rev', 'price', 'cost', 'spend', 'amount', 'profit', 'margin', 'dollar', 'ebit', 'fee', '$'].some(k => numColLower.includes(k)) || numCols.length === 0);

  const rows: import('../types').TableRowItem[] = [];

  const primaryCatCol = catCols.find(c => ['category', 'segment', 'product', 'item', 'group', 'region'].includes(c.toLowerCase())) || catCols[0];
  const secondaryCatCol = catCols.find(c => c !== primaryCatCol);

  if (primaryCatCol) {
    const uniqueCats = Array.from(new Set(content.map(r => String(r[primaryCatCol])))).filter(Boolean);
    uniqueCats.forEach((catVal, cIdx) => {
      const catRows = content.filter(r => String(r[primaryCatCol]) === catVal);
      const values: Record<string, number> = {};

      historical.forEach((pClean, pIdx) => {
        const rawP = uniquePeriods[pIdx] || pClean;
        const matching = catRows.filter(r => periodCol ? (String(r[periodCol]) === rawP || String(r[periodCol]).replace('_', ' ') === pClean) : true);
        const sum = matching.reduce((acc, r) => acc + (Number(r[primaryNumCol]) || 0), 0);
        values[pClean] = sum;
      });

      const lastHistVal = values[historical[historical.length - 1]] || 1000;
      const firstHistVal = values[historical[0]] || lastHistVal;
      const cagr = historical.length > 1 && firstHistVal > 0 ? Math.pow(lastHistVal / firstHistVal, 1 / (historical.length - 1)) - 1 : 0.05;
      const safeGrowth = Math.max(-0.2, Math.min(0.3, isNaN(cagr) ? 0.05 : cagr));

      projected.forEach((pProj, projIdx) => {
        const projectedVal = lastHistVal * Math.pow(1 + safeGrowth, projIdx + 1);
        values[pProj] = parseFloat(projectedVal.toFixed(1));
      });

      rows.push({
        id: `cat_${cIdx}`,
        name: catVal,
        section: `${primaryCatCol.charAt(0).toUpperCase() + primaryCatCol.slice(1)} Breakdown (${primaryNumCol})`,
        unit: isCurrency ? '$' : '',
        isCurrency: isCurrency,
        values
      });
    });
  }

  if (secondaryCatCol) {
    const uniqueSec = Array.from(new Set(content.map(r => String(r[secondaryCatCol])))).filter(Boolean);
    uniqueSec.forEach((secVal, sIdx) => {
      const secRows = content.filter(r => String(r[secondaryCatCol]) === secVal);
      const values: Record<string, number> = {};

      historical.forEach((pClean, pIdx) => {
        const rawP = uniquePeriods[pIdx] || pClean;
        const matching = secRows.filter(r => periodCol ? (String(r[periodCol]) === rawP || String(r[periodCol]).replace('_', ' ') === pClean) : true);
        const sum = matching.reduce((acc, r) => acc + (Number(r[primaryNumCol]) || 0), 0);
        values[pClean] = sum;
      });

      const lastHistVal = values[historical[historical.length - 1]] || 1000;
      projected.forEach((pProj, projIdx) => {
        values[pProj] = parseFloat((lastHistVal * Math.pow(1.04, projIdx + 1)).toFixed(1));
      });

      rows.push({
        id: `sec_${sIdx}`,
        name: secVal,
        section: `${secondaryCatCol.charAt(0).toUpperCase() + secondaryCatCol.slice(1)} Performance (${primaryNumCol})`,
        unit: isCurrency ? '$' : '',
        isCurrency: isCurrency,
        values
      });
    });
  }

  if (!primaryCatCol && numCols.length > 0) {
    numCols.forEach((nCol, nIdx) => {
      const values: Record<string, number> = {};
      historical.forEach((pClean, pIdx) => {
        const rawP = uniquePeriods[pIdx] || pClean;
        const matching = content.filter(r => periodCol ? (String(r[periodCol]) === rawP || String(r[periodCol]).replace('_', ' ') === pClean) : true);
        const sum = matching.reduce((acc, r) => acc + (Number(r[nCol]) || 0), 0);
        values[pClean] = sum;
      });

      const isColCurrency = !['visit', 'patient', 'count', 'headcount', 'volume', 'qty', 'unit'].some(k => nCol.toLowerCase().includes(k));
      const lastHistVal = values[historical[historical.length - 1]] || 1000;
      projected.forEach((pProj, projIdx) => {
        values[pProj] = parseFloat((lastHistVal * Math.pow(1.05, projIdx + 1)).toFixed(1));
      });

      rows.push({
        id: `num_${nIdx}`,
        name: nCol.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        section: `${fileName.replace(/\.csv$/i, '')} Metrics`,
        unit: isColCurrency ? '$' : '',
        isCurrency: isColCurrency,
        values
      });
    });
  }

  return {
    years: { historical, projected },
    growthMultiplier: 1.0,
    activeScenarioName: `${fileName.replace(/\.csv$/i, '')} Baseline`,
    rows
  };
}

const INITIAL_VISUAL_TABLE: import('../types').VisualTableWorkspaceState = {
  years: {
    historical: [],
    projected: []
  },
  growthMultiplier: 1.0,
  activeScenarioName: 'Ready for Data Model',
  rows: []
};

const INITIAL_WORKSPACE_METRICS: { name: string; value: string; delta: string; dir: 'up' | 'down' | 'flat' }[] = [];

export const useStore = create<GlobalState>()(persist((set, get) => ({
  screen: 1,
  batches: INITIAL_BATCHES,
  activeBatchId: '',
  model: 'auto',
  conversation: INITIAL_CONVERSATION,
  perBatchConversations: {} as Record<string, Message[]>,
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  pipelineStage: null as ('forecast' | 'ips' | null),
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
  dataBatchId: null as string | null,
  latestForecast: null,
  perBatchForecasts: {} as Record<string, import('../types/api').ForecastData>,
  setLatestForecast: (data) => {
    const batchId = get().activeBatchId;
    const perBatchForecasts = data && batchId
      ? { ...get().perBatchForecasts, [batchId]: data }
      : get().perBatchForecasts;
    set({ latestForecast: data, perBatchForecasts });
  },
  forecastScenarios: [],
  perBatchForecastScenarios: {} as Record<string, import('../types/api').ForecastScenario[]>,
  addForecastScenario: (s) => {
    const existing = get().forecastScenarios;
    const deduped = existing.filter(e => e.scenario_number !== s.scenario_number);
    const updated = [...deduped, s].sort((a, b) => a.scenario_number - b.scenario_number);
    const batchId = get().activeBatchId;
    const perBatchForecastScenarios = batchId
      ? { ...get().perBatchForecastScenarios, [batchId]: updated }
      : get().perBatchForecastScenarios;
    set({ forecastScenarios: updated, perBatchForecastScenarios });
  },
  setForecastScenarios: (scenarios) => {
    const sorted = [...scenarios].sort((a, b) => a.scenario_number - b.scenario_number);
    const batchId = get().activeBatchId;
    const perBatchForecastScenarios = batchId
      ? { ...get().perBatchForecastScenarios, [batchId]: sorted }
      : get().perBatchForecastScenarios;
    set({ forecastScenarios: sorted, perBatchForecastScenarios });
  },
  clearForecastScenarios: () => set({ forecastScenarios: [] }),
  scenarioCompare: null,
  perBatchScenarioCompare: {} as Record<string, import('../types/api').ScenarioCompareResponse>,
  setScenarioCompare: (data) => {
    const batchId = get().activeBatchId;
    const perBatchScenarioCompare = data && batchId
      ? { ...get().perBatchScenarioCompare, [batchId]: data }
      : get().perBatchScenarioCompare;
    set({ scenarioCompare: data, perBatchScenarioCompare });
  },
  worldModels: [],
  selectedProvenanceMetric: null,
  provenanceConversations: INITIAL_PROVENANCE_CONVERSATIONS,
  workspaceMetrics: INITIAL_WORKSPACE_METRICS,

  // Per-Batch Storage Mappings
  perBatchVisualTables: {} as Record<string, import('../types').VisualTableWorkspaceState>,
  perBatchWorkspaceTables: {} as Record<string, import('../types/api').WorkspaceTable | null>,
  perBatchSetups: {} as Record<string, SetupState>,
  perBatchGrowthRates: {} as Record<string, GrowthRate[]>,
  perBatchDimensions: {} as Record<string, DimensionCard[]>,
  perBatchWorldModels: {} as Record<string, import('../types/api').WorldModel[]>,

  // Visual Table Workspace State & Methods
  visualTable: INITIAL_VISUAL_TABLE,

  updateTableCell: (rowId: string, year: string, value: number) => {
    const current = get().visualTable;
    const updatedRows = current.rows.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          values: {
            ...r.values,
            [year]: value
          }
        };
      }
      return r;
    });
    const newVisualTable = { ...current, rows: updatedRows };
    const batchId = get().activeBatchId;
    const perBatchVisualTables = batchId
      ? { ...get().perBatchVisualTables, [batchId]: newVisualTable }
      : get().perBatchVisualTables;
    set({
      visualTable: newVisualTable,
      perBatchVisualTables,
    });
  },

  applyTableWhatIf: (growthDeltaPct: number, scenarioLabel?: string) => {
    const current = get().visualTable;
    const baseMultiplier = 1 + (growthDeltaPct / 100);
    const projectedYears = current.years.projected;
    const historicalYears = current.years.historical;
    const lastHistYear = historicalYears[historicalYears.length - 1];

    const updatedRows = current.rows.map(row => {
      const lastHistVal = lastHistYear ? (row.values[lastHistYear] ?? 100) : 100;
      const newValues = { ...row.values };

      projectedYears.forEach((yr, idx) => {
        const baseProjected = lastHistVal * Math.pow(1.04, idx + 1);
        const compoundFactor = Math.pow(baseMultiplier, (idx + 1) * 0.4);
        newValues[yr] = parseFloat((baseProjected * compoundFactor).toFixed(1));
      });

      return {
        ...row,
        values: newValues
      };
    });

    const activeScenario = scenarioLabel || (growthDeltaPct === 0 ? 'Baseline Model' : `What-If: ${growthDeltaPct > 0 ? '+' : ''}${growthDeltaPct}% Growth Assumption`);
    const newVisualTable = {
      ...current,
      rows: updatedRows,
      growthMultiplier: baseMultiplier,
      activeScenarioName: activeScenario
    };
    const batchId = get().activeBatchId;
    const perBatchVisualTables = batchId
      ? { ...get().perBatchVisualTables, [batchId]: newVisualTable }
      : get().perBatchVisualTables;

    set({
      visualTable: newVisualTable,
      perBatchVisualTables,
    });
  },

  setVisualTable: (table: import('../types').VisualTableWorkspaceState) => {
    const batchId = get().activeBatchId;
    const perBatchVisualTables = batchId
      ? { ...get().perBatchVisualTables, [batchId]: table }
      : get().perBatchVisualTables;
    set({ visualTable: table, perBatchVisualTables });
  },

  resetTableData: () => {
    const batchId = get().activeBatchId;
    const perBatchVisualTables = batchId
      ? { ...get().perBatchVisualTables, [batchId]: INITIAL_VISUAL_TABLE }
      : get().perBatchVisualTables;
    set({
      visualTable: INITIAL_VISUAL_TABLE,
      perBatchVisualTables,
    });
  },

  addTableRow: (row: import('../types').TableRowItem) => {
    const current = get().visualTable;
    const newVisualTable = {
      ...current,
      rows: [...current.rows, row]
    };
    const batchId = get().activeBatchId;
    const perBatchVisualTables = batchId
      ? { ...get().perBatchVisualTables, [batchId]: newVisualTable }
      : get().perBatchVisualTables;
    set({
      visualTable: newVisualTable,
      perBatchVisualTables,
    });
  },

  // Conversational Workspace Table from Backend (FRONTEND_INTEGRATION)
  workspaceTable: null,
  setWorkspaceTable: (table: import('../types/api').WorkspaceTable | null) => {
    const batchId = get().activeBatchId;
    const perBatchWorkspaceTables = batchId
      ? { ...get().perBatchWorkspaceTables, [batchId]: table }
      : get().perBatchWorkspaceTables;
    set({ workspaceTable: table, perBatchWorkspaceTables });
  },
  tableWorkspaceViewMode: 'grid',
  setTableWorkspaceViewMode: (mode: 'grid' | 'world_model' | 'compare') => {
    set({ tableWorkspaceViewMode: mode });
  },

  setScreen: (screen: number) => {
    set({
      screen,
      // Adjust dimensions structure automatically depending on screen
      dimensions: INITIAL_DIMENSIONS(screen)
    });
  },

  setActiveBatch: (id: string) => {
    const state = get();
    const isSameBatch = state.activeBatchId === id;

    // Save current active batch data under state.activeBatchId before switching
    const savedConvos = { ...state.perBatchConversations };
    const savedForecasts = { ...state.perBatchForecasts };
    const savedForecastScenarios = { ...state.perBatchForecastScenarios };
    const savedScenarioCompare = { ...state.perBatchScenarioCompare };
    const savedVisualTables = { ...state.perBatchVisualTables };
    const savedWorkspaceTables = { ...state.perBatchWorkspaceTables };
    const savedSetups = { ...state.perBatchSetups };
    const savedGrowthRates = { ...state.perBatchGrowthRates };
    const savedDimensions = { ...state.perBatchDimensions };
    const savedWorldModels = { ...state.perBatchWorldModels };

    if (!isSameBatch && state.activeBatchId) {
      const curId = state.activeBatchId;
      savedConvos[curId] = state.conversation.filter(m => !m.isTyping).slice(-30);
      if (state.latestForecast) savedForecasts[curId] = state.latestForecast;
      if (state.forecastScenarios.length > 0) savedForecastScenarios[curId] = state.forecastScenarios;
      if (state.scenarioCompare) savedScenarioCompare[curId] = state.scenarioCompare;
      savedVisualTables[curId] = state.visualTable;
      savedWorkspaceTables[curId] = state.workspaceTable;
      savedSetups[curId] = state.setup;
      savedGrowthRates[curId] = state.growthRates;
      savedDimensions[curId] = state.dimensions;
      savedWorldModels[curId] = state.worldModels.filter(w => w.batch_id === curId || !w.batch_id);
    }

    // When restoring for the new batch:
    // - If same batch: keep current state
    // - If target batch has saved data: use saved
    // - If new/unknown batch: use INITIAL but DON'T flash — keep current as placeholder until syncBackendState resolves
    const restoredConv = (!isSameBatch && savedConvos[id])
      ? savedConvos[id]
      : (isSameBatch ? state.conversation : INITIAL_CONVERSATION);
    const restoredForecast = (!isSameBatch && savedForecasts[id]) ? savedForecasts[id] : (isSameBatch ? state.latestForecast : null);
    const restoredForecastScenarios = (!isSameBatch && savedForecastScenarios[id]) ? savedForecastScenarios[id] : (isSameBatch ? state.forecastScenarios : []);
    const restoredScenarioCompare = (!isSameBatch && savedScenarioCompare[id]) ? savedScenarioCompare[id] : (isSameBatch ? state.scenarioCompare : null);
    // For visualTable: if target batch has saved state use it, otherwise use INITIAL (don't keep old batch's data)
    const restoredVisualTable = isSameBatch
      ? state.visualTable
      : (savedVisualTables[id] || INITIAL_VISUAL_TABLE);
    const restoredWorkspaceTable = (!isSameBatch && savedWorkspaceTables[id] !== undefined) ? savedWorkspaceTables[id] : (isSameBatch ? state.workspaceTable : null);
    const restoredSetup = (!isSameBatch && savedSetups[id]) ? savedSetups[id] : (isSameBatch ? state.setup : { focalPoint: '', timeGranularity: 'Quarter', timeRange: '', segments: [], parameters: [], sources: [] });
    const restoredGrowthRates = (!isSameBatch && savedGrowthRates[id]) ? savedGrowthRates[id] : (isSameBatch ? state.growthRates : INITIAL_GROWTH_RATES);
    const restoredDimensions = (!isSameBatch && savedDimensions[id]) ? savedDimensions[id] : (isSameBatch ? state.dimensions : INITIAL_DIMENSIONS(4));
    let restoredWorldModels = (!isSameBatch && savedWorldModels[id]) ? savedWorldModels[id] : (isSameBatch ? state.worldModels : []);

    if (restoredWorldModels.length === 0) {
      try {
        const stored = sessionStorage.getItem(`wm_batch_${id}`);
        if (stored) restoredWorldModels = JSON.parse(stored);
      } catch { /* ignore parse errors */ }
    }

    set({
      activeBatchId: id,
      dataBatchId: id,
      perBatchConversations: savedConvos,
      perBatchForecasts: savedForecasts,
      perBatchForecastScenarios: savedForecastScenarios,
      perBatchScenarioCompare: savedScenarioCompare,
      perBatchVisualTables: savedVisualTables,
      perBatchWorkspaceTables: savedWorkspaceTables,
      perBatchSetups: savedSetups,
      perBatchGrowthRates: savedGrowthRates,
      perBatchDimensions: savedDimensions,
      perBatchWorldModels: savedWorldModels,
      batches: state.batches.map((b) => ({
        ...b,
        status: b.id === id ? 'active' : b.status === 'active' ? 'idle' : b.status
      })),
      worldModels: restoredWorldModels,
      visualTable: restoredVisualTable,
      workspaceTable: restoredWorkspaceTable,
      setup: restoredSetup,
      growthRates: restoredGrowthRates,
      dimensions: restoredDimensions,
      conversation: restoredConv,
      latestForecast: restoredForecast,
      forecastScenarios: restoredForecastScenarios,
      scenarioCompare: restoredScenarioCompare,
      optimisationResult: null,
      scenarios: [],
      provenanceConversations: {},
    });

    if (get().syncBackendState) {
      void get().syncBackendState!();
    }
  },

  setModel: (model: ModelType) => {
    set({ model });
  },

  addMessage: (msg: Message) => {
    const newMsg = { ...msg, content: msg.content || '' };
    const updated = [...get().conversation, newMsg];
    const batchId = get().activeBatchId;
    const updatedConvos = batchId
      ? { ...get().perBatchConversations, [batchId]: updated.filter(m => !m.isTyping).slice(-30) }
      : get().perBatchConversations;
    set({ conversation: updated, perBatchConversations: updatedConvos });
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
      });

      // Crucial: Switch to the newly created batch cleanly so it starts with fresh isolated state
      get().setActiveBatch(newBatch.id);

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
      // Note: We intentionally do NOT call api.getForecast() here.
      // The forecast endpoint is not batch-aware and would return stale data
      // from a previous batch, causing cross-batch contamination on the
      // Forecast page. Forecast state is only set when the agent actually
      // runs a forecast in the current session (via RightPanel / TalkPanel).

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
        const currentBatch = get().activeBatchId;
        if (!dataRes?.data?.records || dataRes.data.records.length === 0) {
          // Only reset if local state does NOT already have loaded data
          const existingVisualTable = get().visualTable;
          const existingWorkspaceTable = get().workspaceTable;
          if ((!existingVisualTable?.rows || existingVisualTable.rows.length === 0) && !existingWorkspaceTable) {
            const cleanSetup = { ...get().setup, sources: [], parameters: [], segments: [] };
            const perBatchVisualTables = currentBatch
              ? { ...get().perBatchVisualTables, [currentBatch]: INITIAL_VISUAL_TABLE }
              : get().perBatchVisualTables;
            const perBatchWorkspaceTables = currentBatch
              ? { ...get().perBatchWorkspaceTables, [currentBatch]: null }
              : get().perBatchWorkspaceTables;
            const perBatchSetups = currentBatch
              ? { ...get().perBatchSetups, [currentBatch]: cleanSetup }
              : get().perBatchSetups;
            const perBatchGrowthRates = currentBatch
              ? { ...get().perBatchGrowthRates, [currentBatch]: INITIAL_GROWTH_RATES }
              : get().perBatchGrowthRates;

            set({
              growthRates: INITIAL_GROWTH_RATES,
              dimensions: INITIAL_DIMENSIONS(4),
              relationships: INITIAL_RELATIONSHIPS,
              setup: cleanSetup,
              dataBatchId: currentBatch || null,
              visualTable: INITIAL_VISUAL_TABLE,
              workspaceTable: null,
              perBatchVisualTables,
              perBatchWorkspaceTables,
              perBatchSetups,
              perBatchGrowthRates,
            });
          }
        }
        if (dataRes?.data?.records && dataRes.data.records.length > 0) {
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

            // Dynamically construct real workspaceTable from the backend record data
            const itemKey = keys.find(k => ['item', 'period', 'quarter', 'year', 'date', 'region', 'segment', 'metric', 'indicator', 'name'].includes(k.toLowerCase())) || keys[0];
            const valueKeys = keys.filter(k => k !== itemKey);

            const realCols: import('../types/api').WorkspaceTableColumn[] = [
              { id: 'item', name: itemKey.charAt(0).toUpperCase() + itemKey.slice(1), type: 'text' },
              ...valueKeys.map(k => ({
                id: k,
                name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: (typeof firstItem[k] === 'number' ? 'number' : typeof firstItem[k] === 'boolean' ? 'boolean' : 'text') as any,
              }))
            ];

            const existingTable = get().workspaceTable;
            const extraColumns = (existingTable?.columns || []).filter(c => 
              c.id.startsWith('scenario') || c.id.startsWith('forecast') || c.id.startsWith('what_if') || c.id.startsWith('target') || c.id.startsWith('custom')
            );

            // Merge extra columns without duplicates
            const mergedCols = [...realCols, ...extraColumns.filter(ec => !realCols.some(rc => rc.id === ec.id))];

            const realRows = content.map((r: any, idx: number) => {
              const baseRow: any = {
                id: `rec-${idx}`,
                item: String(r[itemKey] ?? `Record ${idx + 1}`),
                ...r,
              };
              const existingRow = existingTable?.rows?.find(er => er.id === `rec-${idx}` || er.item === baseRow.item);
              if (existingRow) {
                extraColumns.forEach(ec => {
                  if (existingRow[ec.id] !== undefined) {
                    baseRow[ec.id] = existingRow[ec.id];
                  }
                });
              }
              return baseRow;
            });

            // Extract real metrics (numeric columns) and real segments (text/categorical columns)
            const realParameters: string[] = [];
            const realSegments: string[] = [];
            let realPeriods: string[] = [];

            keys.forEach(key => {
              const lowerKey = key.toLowerCase();
              if (lowerKey === 'period' || lowerKey === 'quarter' || lowerKey === 'year' || lowerKey === 'date' || lowerKey === 'time') {
                // Collect unique periods, sorted chronologically
                realPeriods = Array.from(new Set(content.map((row: any) => String(row[key])))).filter(Boolean).sort();
              } else if (typeof firstItem[key] === 'number') {
                realParameters.push(key);
              } else {
                realSegments.push(key);
              }
            });

            // Auto-configure the data-time endpoint so the forecast pipeline
            // always knows the historical range without manual Blueprint setup.
            if (realPeriods.length >= 2) {
              api.setDataTime(
                realPeriods[0],
                realPeriods[realPeriods.length - 1],
                'quarterly',
              ).catch(() => {/* non-fatal */});
            }

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

            const valueColName = realParameters[0] || 'Sales';
            const realGrowthRates = Object.entries(growthRatesMap).map(([seg, vals]) => {
              const yoyVal = vals.q1 > 0 ? (((vals.q4 || vals.q2) - vals.q1) / vals.q1 * 100).toFixed(1) : '0.0';
              return {
                segment: seg,
                q1: formatByColumnName(valueColName, vals.q1),
                q2: formatByColumnName(valueColName, vals.q2),
                q3: formatByColumnName(valueColName, vals.q3),
                q4Proj: formatByColumnName(valueColName, vals.q4 || vals.q2 * 1.1),
                yoy: `${Number(yoyVal) >= 0 ? '+' : ''}${yoyVal}%`,
              };
            });

            // Dynamically construct visual table model from real dataset records
            const dynamicVisualTable = buildVisualTableFromContent(content, latestRecord.file_name);

            updatedSetup = {
              ...updatedSetup,
              focalPoint: focalPointName,
              timeRange: timeRangeStr,
              segments: realSegments.length > 0 ? realSegments : get().setup.segments,
              parameters: realParameters.length > 0 ? realParameters : get().setup.parameters,
            };

            const updatedWsTable = mergedCols.length > 0 ? {
              columns: mergedCols,
              rows: realRows,
              version: get().workspaceTable?.version ? get().workspaceTable!.version + 1 : 1,
              updated_at: new Date().toISOString(),
            } : get().workspaceTable;

            const existingVt = get().visualTable;
            // Do NOT overwrite if: (a) scenario is locked from optimization, OR (b) existing rows were uploaded and backend returned same/empty content
            const isScenarioLocked = existingVt?.scenarioLocked === true;
            const existingHasMoreRows = existingVt?.rows?.length > 0 && dynamicVisualTable.rows.length === 0;
            const finalVisualTable = (isScenarioLocked || existingHasMoreRows)
              ? existingVt  // keep current scenario / uploaded data
              : (dynamicVisualTable.rows.length > 0 ? dynamicVisualTable : existingVt);

            const perBatchVisualTables = currentBatch
              ? { ...get().perBatchVisualTables, [currentBatch]: finalVisualTable }
              : get().perBatchVisualTables;
            const perBatchWorkspaceTables = currentBatch
              ? { ...get().perBatchWorkspaceTables, [currentBatch]: updatedWsTable }
              : get().perBatchWorkspaceTables;
            const perBatchSetups = currentBatch
              ? { ...get().perBatchSetups, [currentBatch]: updatedSetup }
              : get().perBatchSetups;
            const perBatchGrowthRates = currentBatch
              ? { ...get().perBatchGrowthRates, [currentBatch]: realGrowthRates }
              : get().perBatchGrowthRates;

            set({
              setup: updatedSetup,
              growthRates: realGrowthRates.length > 0 ? realGrowthRates : get().growthRates,
              dataBatchId: currentBatch || get().activeBatchId,
              visualTable: finalVisualTable,
              workspaceTable: updatedWsTable,
              perBatchVisualTables,
              perBatchWorkspaceTables,
              perBatchSetups,
              perBatchGrowthRates,
            });
          } else {
            set({ setup: updatedSetup });
          }
        }
      } catch (err) {
        console.warn('Failed to extract real data content metadata:', err);
      }

      // 3. Sync Optimisation Results
      try {
        const nrRes = await api.retrieveOptimization().catch(() => null);
        if (nrRes?.data) {
          const nr = nrRes.data;
          const finalPct = ((nr.final_egr - 1) * 100).toFixed(2);
          const targetPct = ((nr.target_egr - 1) * 100).toFixed(2);
          const updatedMetrics = get().workspaceMetrics.map(m =>
            m.name === 'EGR Achieved'
              ? { ...m, value: `${finalPct}%`, delta: `↑ +${finalPct}pp`, dir: 'up' as const }
              : m
          );
          const currentScenarios = [...get().scenarios];
          const newScenarioItem = {
            id: `opt-${Date.now()}`,
            label: `Backend Optimization Run (${nr.converged === 1 ? 'Converged' : 'Max Iterations'})`,
            revenue: formatByColumnName('Revenue', nr.optimized_vector?.[0] ?? 2400000),
            yoy: `+${finalPct}%`,
            egr: `${finalPct}%`,
            sparkColor: 'green' as const,
            sparkData: [100, 105, 110, 115, 120, 125, Math.round(100 + parseFloat(finalPct))],
            checked: true
          };

          set({
            workspaceMetrics: updatedMetrics,
            optimisationResult: {
              method: 'Newton-Raphson',
              timestamp: new Date().toLocaleTimeString(),
              durationMs: 1200,
              converged: nr.converged === 1,
              rows: [
                { name: 'Target Growth', value: `${targetPct}%`, delta: '— target', deltaDir: 'flat' },
                { name: 'Achieved Growth', value: `${finalPct}%`, delta: nr.converged === 1 ? '✓ Converged' : '⚠ Non-converged', deltaDir: nr.converged === 1 ? 'up' : 'down' },
                { name: 'Iterations', value: `${nr.iterations}`, delta: `Error: ${nr.convergence_error?.toExponential(2) ?? '0'}`, deltaDir: 'flat' },
              ],
              egrAchieved: parseFloat(finalPct),
              target: parseFloat(targetPct)
            },
            scenarios: [newScenarioItem, ...currentScenarios.slice(0, 2)]
          });
        }
      } catch {}

      // 5. Sync Forecast Results
      try {
        const fcRes = await api.getForecast();
        if (fcRes?.data) {
          const fc = fcRes.data;
          const currentScenarios = [...get().scenarios];
          const forecastScenarioItem = {
            id: `fc-${Date.now()}`,
            label: `Forecast to ${fc.target_time}`,
            revenue: formatByColumnName('Revenue', fc.forecasted_value),
            yoy: fc.predicted_growth_rate_percentage || '+0%',
            egr: fc.predicted_growth_rate_percentage || '+0%',
            sparkColor: 'blue' as const,
            sparkData: [100, 103, 107, 110, 112, 115],
            checked: false
          };
          set({
            scenarios: [...currentScenarios, forecastScenarioItem]
          });
        }
      } catch {}
    } catch (err) {
      console.warn('Backend sync failed:', err);
    }
  },

  setEgrTarget: (val: number) => {
    set({ egrTarget: val });
  },

  addWorldModel: (wm: WorldModel) => {
    // Tag with active batch if missing, then dedupe by scenario_id
    const tagged = wm.batch_id ? wm : { ...wm, batch_id: get().activeBatchId || '' };
    const existing = get().worldModels;
    const filtered = existing.filter(w => w.scenario_id !== tagged.scenario_id);
    const updated = [...filtered, tagged];
    // Keep module-level cache in sync so data survives route changes
    addToWorldModelsCache(tagged);
    // Persist to sessionStorage (survives page refresh within same tab session)
    // Store the tree separately per scenario to avoid blowing the batch key quota
    try {
      const batchId = tagged.batch_id;
      const storageKey = `wm_batch_${batchId}`;
      const compact = updated
        .filter(w => w.batch_id === batchId)
        .map(({ world_model_tree: _tree, ...rest }) => rest);
      sessionStorage.setItem(storageKey, JSON.stringify(compact));
    } catch { /* ignore quota errors — module cache still works */ }
    if (tagged.world_model_tree) {
      try {
        sessionStorage.setItem(`wm_tree_${tagged.scenario_id}`, JSON.stringify(tagged.world_model_tree));
      } catch { /* ignore quota errors */ }
    }
    set({ worldModels: updated });

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

    // ── Sync Optimized Scenario Values into Visual Table Projected Columns ──
    const currentVt = get().visualTable;
    if (currentVt && currentVt.rows.length > 0) {
      const optMultiplier = 1 + (finalPct / 100);
      const projYears = currentVt.years.projected;
      const histYears = currentVt.years.historical;
      const lastHistYr = histYears[histYears.length - 1];

      const allWmCats = wm.world_model_tree?.macro_categories?.flatMap(m => m.categories || []) || [];

      const updatedVtRows = currentVt.rows.map(row => {
        const lastHistVal = lastHistYr ? (row.values[lastHistYr] ?? 100) : 100;
        const matchCat = allWmCats.find(c => 
          c.label.toLowerCase() === row.name.toLowerCase() || 
          row.name.toLowerCase().includes(c.label.toLowerCase()) || 
          c.label.toLowerCase().includes(row.name.toLowerCase())
        );

        const rowMultiplier = matchCat && matchCat.original_value > 0
          ? (matchCat.final_value / matchCat.original_value)
          : optMultiplier;

        const newVals = { ...row.values };
        projYears.forEach((yr, idx) => {
          const baseVal = lastHistVal * Math.pow(1.04, idx + 1);
          const compoundStep = Math.pow(rowMultiplier, (idx + 1) * 0.4);
          newVals[yr] = parseFloat((baseVal * compoundStep).toFixed(1));
        });

        return {
          ...row,
          values: newVals
        };
      });

      const newVt = {
        ...currentVt,
        rows: updatedVtRows,
        growthMultiplier: optMultiplier,
        activeScenarioName: wm.scenario_label || `Optimized Run (+${finalPct.toFixed(1)}%)`,
        scenarioLocked: true,  // prevent syncBackendState from overwriting these scenario values
      };

      const batchId = get().activeBatchId;
      const perBatchVisualTables = batchId
        ? { ...get().perBatchVisualTables, [batchId]: newVt }
        : get().perBatchVisualTables;

      set({ visualTable: newVt, perBatchVisualTables });
    }
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

  runFullScenario: async (opts) => {
    const state = get();
    const batchId = state.activeBatchId || '';
    const batchQuery = opts.batchQuery ?? (batchId ? `?batch=${batchId}` : '');
    const batchSep   = batchQuery ? '&' : '?';
    const existingForecast = (state.latestForecast?.batch_id === batchId) ? state.latestForecast : null;
    const batchWorldModels = state.worldModels.filter(wm => wm.batch_id === batchId);
    const lastWM = batchWorldModels[batchWorldModels.length - 1];

    const prompt = buildFullScenarioPrompt({
      hasForecast: !!existingForecast,
      forecastValue: existingForecast?.forecasted_value,
      forecastPeriod: existingForecast?.target_time,
      lastStrategy: lastWM?.growth_strategy,
      egrTarget: state.egrTarget,
    });

    get().addMessage({ role: 'user', content: prompt });

    // Minimum time each page stays visible (ms)
    const FORECAST_HOLD  = 3500;
    const IPS_HOLD       = 3000;
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    // ── Show forecast "computing" screen and fire API simultaneously ─────────
    opts.triggerToast?.('Running full scenario pipeline…');
    get().setPipelineStage('forecast');
    opts.navigate(`/dashboard/forecast${batchQuery}`);

    const apiPromise = api.agentChat({ message: prompt, batch_id: batchId });

    try {
      // Wait for API and a minimum computing display time
      const [res] = await Promise.all([apiPromise, delay(FORECAST_HOLD)]);

      // Store all results
      if (res.world_model) {
        get().addWorldModel(res.world_model as WorldModel);
      }

      if (get().syncBackendState) {
        await get().syncBackendState!();
      }

      // Fetch forecast data and cache it so ForecastPage renders instantly
      try {
        const saved = await api.getForecastScenarios();
        if (saved?.has_results && Array.isArray(saved.scenarios) && saved.scenarios.length > 0) {
          get().setForecastScenarios(saved.scenarios as any);
          setForecastPageCache(saved as any);
          const lf = (saved as any).latest_forecast;
          if (lf) {
            get().setLatestForecast({
              batch_id: batchId,
              data_range: { start_time: '', end_time: '' },
              target_time: lf.target_period ?? '',
              forecasted_value: lf.forecasted_value ?? 0,
              last_known_value: 0,
              predicted_growth_rate: 0,
              predicted_growth_rate_percentage: lf.predicted_growth_rate_percentage ?? '',
              holt_winters_parameters: { alpha: 0, beta: 0, gamma: 0 },
              components: { level: 0, trend: 0, seasonal: [] },
              periods_ahead: 1,
            });
          }
        }
      } catch {
        // ignore forecast refresh errors
      }

      const aiReply = (res as any).reply || '';
      get().addMessage({ role: 'ai', content: aiReply });

      // ── Step 1: Show actual Forecast Results (data already cached, renders instantly) ──
      opts.triggerToast?.('Step 1 / 3 — Forecast complete ✓');
      get().setPipelineStage(null);
      await delay(IPS_HOLD);

      // ── Step 2: Show IPS Engine Results (2.5 s) ─────────────────────────────
      opts.triggerToast?.('Step 2 / 3 — IPS Optimisation complete ✓');
      opts.navigate(`/dashboard/ips-engine${batchQuery}`);
      await delay(IPS_HOLD);

      // ── Step 3: World Model page ─────────────────────────────────────────────
      opts.triggerToast?.('Step 3 / 3 — World Model ready!');
      opts.navigate(`/dashboard/world-model${batchQuery}`);

      // ── If more than one scenario exists, slide to Compare view ─────────────
      const totalScenarios = get().worldModels.filter(wm => wm.batch_id === batchId).length;
      if (totalScenarios > 1) {
        setTimeout(() => {
          opts.triggerToast?.('Showing scenario comparison…');
          opts.navigate(`/dashboard/world-model${batchQuery}${batchSep}view=compare`);
        }, 2500);
      }
    } catch (err: any) {
      get().setPipelineStage(null);
      const detail = err?.response?.data?.detail || err?.message || 'Full scenario failed';
      get().addMessage({ role: 'ai', content: `Error: ${detail}` });
      opts.triggerToast?.(`Error: ${detail}`);
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
  setPipelineStage: (stage: 'forecast' | 'ips' | null) => set({ pipelineStage: stage }),

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

    const revStr = getVal('Revenue', '0');
    const costStr = getVal('Cost Centre', '0');
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

    const revNum = parseValue('Revenue', revStr);
    const costNum = parseValue('Cost Centre', costStr);
    const churnNum = parseValue('Churn Rate', churnStr);

    const marginVal = revNum > 0 ? ((revNum - costNum) / revNum) * 100 : 0;
    const egrVal = 8.4 + (revNum / 2000000 - 1) * 24 - (costNum / 1000000 - 1) * 12 - (churnNum - 4) * 0.5;

    const revFormatted = formatByColumnName('Revenue', revNum);
    const costFormatted = formatByColumnName('Cost Centre', costNum);
    const marginFormatted = formatByColumnName('Gross Margin', marginVal);
    const churnFormatted = formatByColumnName('Churn Rate', churnNum);
    const egrFormatted = formatByColumnName('EGR Achieved', egrVal);

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
}),
{
  name: 'inferalytics-store',
  // Only persist lightweight UI/preference state.
  // worldModels and forecastScenarios are excluded — they contain large tree
  // structures that blow the localStorage quota. They are re-fetched from the
  // backend (syncBackendState / getForecastScenarios) on load.
  partialize: (state) => ({
    activeBatchId:   state.activeBatchId,
    model:           state.model,
    leftSidebarOpen: state.leftSidebarOpen,
    rightSidebarOpen: state.rightSidebarOpen,
    egrTarget:       state.egrTarget,
    // Per-batch forecast (batch-isolated)
    perBatchForecasts: state.perBatchForecasts,
    perBatchForecastScenarios: state.perBatchForecastScenarios,
    // Per-batch conversation history (last 30 msgs each batch)
    perBatchConversations: Object.fromEntries(
      Object.entries(state.perBatchConversations).map(([bId, msgs]) => [
        bId,
        msgs.filter(m => !m.isTyping).slice(-30),
      ])
    ),
    // Per-batch visual & workspace tables (strictly isolated per batch)
    perBatchVisualTables: state.perBatchVisualTables,
    perBatchWorkspaceTables: state.perBatchWorkspaceTables,
    perBatchSetups: state.perBatchSetups,
    perBatchGrowthRates: state.perBatchGrowthRates,
    perBatchDimensions: state.perBatchDimensions,
    // Active table and view states (instantly restored on reload)
    visualTable: state.visualTable,
    workspaceTable: state.workspaceTable,
    setup: state.setup,
    growthRates: state.growthRates,
    dimensions: state.dimensions,
    conversation: state.conversation.filter(m => !m.isTyping).slice(-30),
    tableWorkspaceViewMode: state.tableWorkspaceViewMode,
  }),
  storage: createJSONStorage(() => ({
    getItem: (name) => {
      try { return localStorage.getItem(name); } catch { return null; }
    },
    setItem: (name, value) => {
      try { localStorage.setItem(name, value); } catch (e) {
        // Quota exceeded — clear old data and retry once
        try { localStorage.removeItem(name); localStorage.setItem(name, value); } catch { /* give up */ }
      }
    },
    removeItem: (name) => {
      try { localStorage.removeItem(name); } catch { /* ignore */ }
    },
  })),
  // After Zustand rehydrates from localStorage, restore the active batch's specific state
  onRehydrateStorage: () => (state) => {
    if (!state || !state.activeBatchId) return;
    const id = state.activeBatchId;
    
    // Restore per-batch state for the active batch
    state.visualTable = state.perBatchVisualTables?.[id] || INITIAL_VISUAL_TABLE;
    state.workspaceTable = state.perBatchWorkspaceTables?.[id] || null;
    state.setup = state.perBatchSetups?.[id] || { focalPoint: '', timeGranularity: 'Quarter', timeRange: '', segments: [], parameters: [], sources: [] };
    state.growthRates = state.perBatchGrowthRates?.[id] || INITIAL_GROWTH_RATES;
    state.dimensions = state.perBatchDimensions?.[id] || INITIAL_DIMENSIONS(4);
    state.conversation = state.perBatchConversations?.[id] || INITIAL_CONVERSATION;
    state.latestForecast = state.perBatchForecasts?.[id] || null;
    state.forecastScenarios = state.perBatchForecastScenarios?.[id] || [];

    // Restore worldModels from sessionStorage for this specific batch ONLY
    state.worldModels = [];
    try {
      const stored = sessionStorage.getItem(`wm_batch_${id}`);
      if (stored) {
        const models = JSON.parse(stored);
        state.worldModels = models.map((wm: { scenario_id: string }) => {
          try {
            const treeRaw = sessionStorage.getItem(`wm_tree_${wm.scenario_id}`);
            return treeRaw ? { ...wm, world_model_tree: JSON.parse(treeRaw) } : wm;
          } catch { return wm; }
        });
      }
    } catch { /* ignore */ }
  },
}
));
