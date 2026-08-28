export * from './api';

export type ModelType = 'Newton-Raphson' | 'Holt-Winters' | 'Monte Carlo' | 'auto';

export interface Batch {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'archived';
  meta?: string;
}

export interface Message {
  role: 'ai' | 'user';
  content: string;
  chips?: string[];
  banner?: {
    label: string;
    buttonText: string;
    actionType: string;
  };
  isTyping?: boolean;
}

export interface SetupState {
  focalPoint: string;
  timeGranularity: string;
  timeRange: string;
  segments: string[];
  parameters: string[];
  sources: { name: string; fields: number; rows: number }[];
}

export interface Relationship {
  a: string;
  op: '→' | '↔';
  b: string;
  note: string;
  confirmed: boolean;
}

export interface GrowthRate {
  segment: string;
  q1: string;
  q2: string;
  q3: string;
  q4Proj: string;
  yoy: string;
}

export interface DimensionCard {
  id: string;
  name: string;
  type: 'numeric' | 'categorical' | 'date';
  samples: string[];
  status: 'ok' | 'busy' | 'pinned';
  x: number;
  y: number;
  selected?: boolean;
  pinned?: boolean;
  dim?: boolean;
}

export interface Scenario {
  id: string;
  label: string;
  revenue: string;
  yoy: string;
  egr: string;
  sparkColor: 'blue' | 'green';
  sparkData: number[];
  checked: boolean;
}

export interface OptimisationResultRow {
  name: string;
  value: string;
  delta: string;
  deltaDir: 'up' | 'down' | 'flat';
}

export interface OptimisationResult {
  method: string;
  timestamp: string;
  durationMs: number;
  converged: boolean;
  rows: OptimisationResultRow[];
  egrAchieved: number;
  target: number;
}

export interface GlobalState {
  screen: number;
  batches: Batch[];
  activeBatchId: string;
  model: ModelType;
  conversation: Message[];
  /** Per-batch conversation history, persisted to localStorage (last 30 msgs each) */
  perBatchConversations: Record<string, Message[]>;
  setup: SetupState;
  relationships: Relationship[];
  growthRates: GrowthRate[];
  dimensions: DimensionCard[];
  egrTarget: number;
  scenarios: Scenario[];
  optimisationResult: OptimisationResult | null;
  dataBatchId: string | null;
  latestForecast: import('./api').ForecastData | null;
  setLatestForecast: (data: import('./api').ForecastData | null) => void;
  forecastScenarios: import('./api').ForecastScenario[];
  addForecastScenario: (s: import('./api').ForecastScenario) => void;
  setForecastScenarios: (scenarios: import('./api').ForecastScenario[]) => void;
  clearForecastScenarios: () => void;
  worldModels: import('./api').WorldModel[];
  addWorldModel: (wm: import('./api').WorldModel) => void;
  selectedProvenanceMetric: string | null;
  setSelectedProvenanceMetric: (metric: string | null) => void;
  provenanceConversations: Record<string, Message[]>;
  addProvenanceMessage: (metric: string, message: Message) => void;
  workspaceMetrics: { name: string; value: string; delta: string; dir: 'up' | 'down' | 'flat' }[];
  updateWorkspaceMetric: (name: string, value: string) => void;
  setScreen: (screen: number) => void;
  setActiveBatch: (id: string) => void;
  setModel: (model: ModelType) => void;
  addMessage: (msg: Message) => void;
  toggleSegment: (segment: string) => void;
  toggleParameter: (param: string) => void;
  setFocalPoint: (val: string) => void;
  setTimeGranularity: (val: string) => void;
  toggleRelationshipConfirmed: (index: number) => void;
  setDimensionSelected: (id: string) => void;
  toggleDimensionToBatcher: (id: string) => void;
  setEgrTarget: (val: number) => void;
  toggleScenarioChecked: (id: string) => void;
  runOptimisation: (callback: () => void) => void;
  runScenarioB: (callback: () => void) => void;
  resetAll: () => void;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;

  /** Tracks which stage of the full-scenario pipeline is actively running */
  pipelineStage: 'forecast' | 'ips' | null;
  setPipelineStage: (stage: 'forecast' | 'ips' | null) => void;


  // Async API Action helpers
  fetchBatchesFromApi?: () => Promise<void>;
  createBatchApi?: (name: string) => Promise<string>;
  switchBatchApi?: (id: string) => Promise<void>;
  deleteBatchApi?: (id: string) => Promise<void>;
  syncBackendState?: () => Promise<void>;

  /** End-to-end pipeline: Forecast → IPS Optimisation → World Model */
  runFullScenario?: (opts: {
    navigate: (path: string) => void;
    triggerToast?: (msg: string) => void;
    batchQuery?: string;
  }) => Promise<void>;
}
