// Inferalytics Backend API Types (from frontend_guide (1).md)

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: number;
  clerk_user_id: string;
  email: string;
  username: string | null;
  organization_id: number | null;
  clerk_org_id: string | null;
  org_role: string | null;
  is_admin: boolean;
  created_at: string; // ISO 8601
}

// ─── Standard Envelope ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Batching ────────────────────────────────────────────────────────────────

export interface Batch {
  batch_id: string;
  batch_name: string;
  user_id: number;
  created_at: string;
}

export type ApiBatch = Batch;

export type CreateBatchResponse  = ApiResponse<Batch>;
export type SwitchBatchResponse  = ApiResponse<Batch>;
export type ListBatchResponse    = ApiResponse<{ batches: Batch[]; total_count: number }>;
export type DeleteBatchResponse  = ApiResponse<{ batch_id: string; deleted: boolean }>;

// ─── Data Population ─────────────────────────────────────────────────────────

export interface PopulatedDataRecord {
  id: number;
  file_name: string;
  file_type: string;
  data_source: string;
  row_count: number;
  column_count: number;
  data_content?: Record<string, unknown>[];
  created_at: string;
}

export interface DataUploadData extends PopulatedDataRecord {
  user_id: number;
  batch_id: string;
}

export type DataUploadResponse = ApiResponse<DataUploadData>;
export type RetrieveDataResponse = ApiResponse<{
  batch_id: string;
  batch_name: string;
  records: PopulatedDataRecord[];
  total_count: number;
}>;

// ─── Vectorisation ───────────────────────────────────────────────────────────

export interface VectorisedRecord {
  id: number;
  source_data_id: number;
  vector_data: number[];
  vector_length: number;
  column_mapping: Record<string, string>;
  created_at: string;
}

export type VectorisationResponse = ApiResponse<{
  batch_id: string;
  batch_name: string;
  vectorised_records: VectorisedRecord[];
  total_vectors: number;
  total_elements: number;
}>;

// ─── Aggregation ─────────────────────────────────────────────────────────────

export interface AggregatedRecord {
  id: number;
  source_vectorised_id: number;
  subcategory_vector: number[];
  category_vector: number[];
  macro_category_vector: number[];
  total_vector: number[];
  aggregation_matrices: Record<string, unknown>;
  hierarchy_mapping: Record<string, string[]>;
}

export type AggregationResponse = ApiResponse<{
  batch_id: string;
  batch_name: string;
  total_records: number;
  aggregation_results: AggregatedRecord[];
}>;

// ─── EGR ─────────────────────────────────────────────────────────────────────

export interface EgrData {
  batch_id: string;
  egr_value: number; // multiplier: 1.15 = 15% growth
  created_at: string;
  updated_at: string;
}

export type EgrResponse         = ApiResponse<EgrData & { id: number; user_id: number }>;
export type RetrieveEgrResponse = ApiResponse<EgrData>;

// ─── Fixed Values ────────────────────────────────────────────────────────────

export interface FixedValueItem {
  id: number;
  user_id: number;
  batch_id: string;
  source_vectorised_id: number | null;
  vector_index: number;
  row_number: number | null;
  column_number: number | null;
  fixed_value: number;
  original_value: number | null;
  created_at: string;
  updated_at: string;
}

export type FixedValuesResponse = ApiResponse<{
  batch_id: string;
  total_fixed: number;
  fixed_values: FixedValueItem[];
}>;

// ─── Data Time ───────────────────────────────────────────────────────────────

export interface TimeData {
  batch_id: string;
  start_time: string;
  end_time: string;
  period_type: string | null;
  created_at: string;
  updated_at: string;
}

export type DataTimeResponse    = ApiResponse<TimeData & { id: number; user_id: number }>;
export type GetDataTimeResponse = ApiResponse<TimeData>;

// ─── Growth Time ─────────────────────────────────────────────────────────────

export interface GrowthTimeData {
  batch_id: string;
  target_time: string;
  created_at: string;
  updated_at: string;
}

export type GrowthTimeResponse    = ApiResponse<GrowthTimeData & { id: number; user_id: number }>;
export type GetGrowthTimeResponse = ApiResponse<GrowthTimeData>;

// ─── Newton-Raphson ───────────────────────────────────────────────────────────

export interface NRData {
  batch_id: string;
  optimized_vector: number[];
  iterations: number;
  /** Multiplier: 1.15 = 15% growth target */
  target_egr: number;
  /** Multiplier: 1.1499 = 14.99% achieved. Display as: (final_egr - 1) * 100 */
  final_egr: number;
  converged: 0 | 1;
  convergence_error: number;
  fixed_indices: number[];
  optimized_indices: number[];
}

export type NewtonRaphsonResponse         = ApiResponse<NRData>;
export type RetrieveNewtonRaphsonResponse = ApiResponse<NRData & { vector_length: number; created_at: string }>;

// ─── Optimization Models ─────────────────────────────────────────────────────

export interface OptimizationEngineModel {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  use_case: string;
  requires: string[];
}

export type ListModelsResponse = ApiResponse<{
  models: OptimizationEngineModel[];
  total: number;
  available_count: number;
}>;

// ─── Forecast ────────────────────────────────────────────────────────────────

export interface ForecastData {
  batch_id: string;
  data_range: { start_time: string; end_time: string };
  target_time: string;
  forecasted_value: number;
  last_known_value: number;
  predicted_growth_rate: number;
  predicted_growth_rate_percentage: string;
  holt_winters_parameters: { alpha: number; beta: number; gamma: number };
  components: { level: number; trend: number; seasonal: number[] };
  periods_ahead: number;
}

export type ForecastResponse    = ApiResponse<ForecastData>;
export type GetForecastResponse = ApiResponse<Pick<ForecastData,
  "batch_id" | "target_time" | "forecasted_value" | "last_known_value" |
  "predicted_growth_rate" | "predicted_growth_rate_percentage"
> & { id: number; created_at: string }>;

// ─── Scenario Results ─────────────────────────────────────────────────────────

/** Parameters stored per scenario for what-if comparison */
export interface ScenarioParams {
  egr_value?: number;
  egr_percentage?: string;
  fixed_positions?: string[];
  fixed_indices_count?: number;
  target_period?: string;
  periods_ahead?: number;
  [key: string]: unknown;
}

export interface OptimizationScenario {
  scenario_number: number;
  /** User-friendly label, e.g. "Aggressive Growth" */
  scenario_label?: string;
  /** Multiplier: 1.15 = 15% target */
  target_egr: number;
  target_egr_percentage: string;       // e.g. "+15.00%"
  /** Multiplier: 1.1499 = 14.99% achieved */
  final_egr: number;
  final_egr_percentage: string;        // e.g. "+14.99%"
  gap_from_target: number | null;
  converged: boolean;
  iterations: number;
  fixed_periods_locked: number;
  /** Which positions were locked for THIS scenario */
  fixed_positions?: string[];
  /** Full parameter set used for this scenario */
  parameters_used?: ScenarioParams;
}

export interface ScenarioComparisonResult {
  success: boolean;
  total_scenarios: number;
  scenarios: OptimizationScenario[];
  best_scenario: number;               // scenario_number of the winner
  best_scenario_label?: string;
  best_final_egr_percentage: string;
  /** Human-readable summaries of what changed between scenarios */
  parameter_differences?: string[];
  recommendation: string;              // Human-readable explanation
}

export interface ForecastScenario {
  scenario_number: number;
  scenario_label?: string;
  target_period: string;
  forecasted_value: number;
  predicted_growth_rate: number | null;
  predicted_growth_rate_percentage: string | null;
  comparison_period?: string | null;
  comparison_value?: number | null;
  periods_ahead?: number;
  parameters_used?: ScenarioParams;
}

export interface ForecastScenarioComparisonResult {
  success: boolean;
  total_scenarios: number;
  scenarios: ForecastScenario[];
  best_scenario: number;
  best_scenario_label?: string | null;
  best_target_period?: string;
  best_forecasted_value?: number;
  recommendation: string;
}

// ─── AI Agent ─────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRequest {
  message: string;
  batch_id: string;
  clear_history?: boolean;
  conversation_history?: ConversationTurn[];
}

export interface AgentResponse {
  reply: string;
  iterations: number;
  tools_used: string[];
  error: string | null;
}
