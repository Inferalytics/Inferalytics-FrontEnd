// Tools that are forecast-specific → forecast page
const FORECAST_TOOLS = new Set([
  'run_forecast', 'run_forecast_scenario', 'run_full_forecast_pipeline',
  'run_forecast_pipeline', 'forecast_revenue', 'forecast_data',
  'forecast', 'calculate_forecast', 'holt_winters', 'run_holt_winters',
  'holt_winters_forecast', 'get_forecast_results', 'save_forecast_scenario',
]);

// Tools that open the forecast comparison tab
const FORECAST_COMPARE_TOOLS = new Set([
  'compare_forecast_scenarios',
]);

// Tools that indicate an optimisation run → world-model
const WORLD_MODEL_TOOLS = new Set([
  'run_optimization', 'run_scenario',
  'run_full_pipeline', 'run_pipeline', 'full_pipeline', 'optimize',
  'run_newton_raphson', 'newton_raphson',
  'run_complete_scenario', // Flow C — always includes optimization
]);

// Tools that indicate ONLY an explicit scenario comparison (no new run)
const LEARNING_ONLY_TOOLS = new Set([
  'compare_scenarios',
]);

const STATIC_ROUTE_PRIORITY: { tools: string[]; route: string }[] = [
  { tools: ['set_egr', 'set_fixed_values'], route: '/dashboard/ips-engine' },
  { tools: ['vectorise_data', 'run_aggregation'], route: '/dashboard/ecr-build' },
  { tools: ['upload_data'], route: '/dashboard/ecr-batch' },
];

/**
 * Detect which agent flow ran based on tools_used.
 * Flow C (run_complete_scenario) takes priority over A/B.
 */
export function detectFlow(tools: string[]): 'A' | 'B' | 'C' | 'none' {
  if (tools.includes('run_complete_scenario')) return 'C';
  if (tools.some(t => FORECAST_TOOLS.has(t) || FORECAST_COMPARE_TOOLS.has(t))) return 'A';
  if (tools.some(t => WORLD_MODEL_TOOLS.has(t))) return 'B';
  return 'none';
}

/**
 * Given the tools_used array from an AgentResponse, returns the dashboard
 * route that displays that action's real result — or null if the agent
 * only ran read-only/informational tools.
 *
 * Priority:
 *  1. Flow C (run_complete_scenario) → /dashboard/world-model
 *  2. Any world-model tool present → /dashboard/world-model
 *  3. Forecast compare tool → /dashboard/forecast?view=compare
 *  4. Any forecast tool → /dashboard/forecast
 *  5. Only compare_scenarios (no run) → /dashboard/learning
 *  6. Static routes (EGR, ECR, batch)
 */
export function getRouteForTools(tools: string[] | undefined | null): string | null {
  if (!tools || tools.length === 0) return null;
  const set = tools.map(t => String(t).toLowerCase());

  if (set.includes('run_complete_scenario')) return '/dashboard/world-model';
  if (set.some(t => WORLD_MODEL_TOOLS.has(t))) return '/dashboard/world-model';
  if (set.some(t => FORECAST_COMPARE_TOOLS.has(t))) return '/dashboard/forecast?view=compare';
  if (set.some(t => FORECAST_TOOLS.has(t))) return '/dashboard/forecast';
  if (set.some(t => LEARNING_ONLY_TOOLS.has(t))) return '/dashboard/learning';

  for (const { tools: names, route } of STATIC_ROUTE_PRIORITY) {
    if (set.some(t => names.includes(t))) return route;
  }
  return null;
}

/**
 * Returns true if the forecast page should be re-fetched after this response.
 * Flow A always refreshes. Flow C only refreshes if forecast was not skipped.
 */
export function shouldRefreshForecast(
  tools: string[],
  forecastSkipped: boolean | undefined
): boolean {
  const flow = detectFlow(tools);
  if (flow === 'A') return true;
  if (flow === 'C') return forecastSkipped !== true;
  return false;
}

// ─── Full Scenario helpers ────────────────────────────────────────────────────

/** Phrases that trigger the full end-to-end pipeline (exact match fallback) */
export const FULL_SCENARIO_PHRASES = [
  'run full scenario',
  'run complete scenario',
  'run full pipeline',
  'run complete pipeline',
  'run pipeline',
  'full pipeline',
  'make another scenario',
  'run another scenario',
  'full scenario',
  'complete scenario',
  'run scenario',
  'new scenario',
];

// Matches "scenario" with common misspellings:
//   senario (missing c), sceario (missing n), sceenario (double e), scenarrio (double r)
//   Pattern: sc + one-or-more-e + optional-n + up-to-3-letters + "ar" + 1-3-letters
//   OR: sen + 3-7 letters (catches "senario", "senarios")
const SCENARIO_RE = /\bsce+n?[a-z]{0,3}ar[a-z]{1,3}\b|\bsen[a-z]{3,7}\b/;
// Matches "pipeline" with common misspellings: pipline, pipleine, pipelin, piplane
const PIPELINE_RE = /\bpip(?:el?|le?)[a-z]{1,6}\b/;
// Combined trigger word (no \b needed, already in sub-patterns)
const TRIGGER_RE = new RegExp(`(?:${SCENARIO_RE.source}|${PIPELINE_RE.source})`, 'i');

/**
 * Returns true if the user message is requesting a full end-to-end pipeline run.
 * Uses regex with fuzzy spelling to handle common typos like "senario", "pipline", etc.
 */
export function isFullScenarioRequest(msg: string): boolean {
  const lower = msg.toLowerCase().trim();

  // Exact phrase match (fastest path)
  if (FULL_SCENARIO_PHRASES.some(phrase => lower.includes(phrase))) return true;

  // Typo-tolerant trigger detection
  // 1. "run [modifier?] <scenario|pipeline>"
  if (/\brun\b/.test(lower) && TRIGGER_RE.test(lower)) return true;

  // 2. "full/complete/another/new <scenario|pipeline>"
  if (/\b(?:full|complete|another|new)\b/.test(lower) && TRIGGER_RE.test(lower)) return true;

  // 3. "run forecast ... growth/optim/scenario" — explicit combined pipeline request
  if (/\brun\b/.test(lower) && /\bforecast\b/.test(lower) &&
      /\b(?:growth|optim|scen[a-z]*|pipel?[a-z]*)\b/i.test(lower)) return true;

  return false;
}

/**
 * Returns true if the user message explicitly specifies a forecast period OR a
 * custom growth/EGR rate. Used to decide whether to forward the raw user message
 * to the agent (so it uses the specified params) or to use buildFullScenarioPrompt
 * (which reuses the existing forecast and rotates the growth strategy).
 */
export function hasExplicitPipelineParams(msg: string): boolean {
  // Explicit period: Q1_2025, Q2 2024, Q1-2025, "Q3 25", etc.
  if (/\bq[1-4][_\s\-]?\d{2,4}\b/i.test(msg)) return true;
  // Explicit growth/EGR percentage: "25%", "15 %", "growth rate 20", "egr 12"
  if (/\d+\s*%|\bgrowth\s*rate\s+\d+|\begr\s+\d+|\brate\s+\d+/i.test(msg)) return true;
  return false;
}

/** Rotation order for growth strategies across consecutive scenario runs */
const STRATEGIES: string[] = [
  'balanced',
  'front_loaded',
  'back_loaded',
  'leader_led',
  'catch_up',
];

/** Returns the next strategy to use, rotating away from the last one used */
export function nextStrategy(lastStrategy: string | null | undefined): string {
  if (!lastStrategy) return 'balanced';
  const idx = STRATEGIES.indexOf(lastStrategy);
  return STRATEGIES[(idx + 1) % STRATEGIES.length];
}

export interface FullScenarioPromptOptions {
  hasForecast: boolean;
  forecastValue?: number;
  forecastPeriod?: string;
  lastStrategy?: string | null;
  egrTarget: number;
}

/**
 * Builds the agent prompt for a full scenario run.
 * When a forecast already exists, instructs the agent to skip re-running it
 * and go straight to optimization using the actual forecasted value as the target.
 */
export function buildFullScenarioPrompt(opts: FullScenarioPromptOptions): string {
  const strategy = nextStrategy(opts.lastStrategy);
  const strategyLabel = strategy.replace(/_/g, ' ');

  if (opts.hasForecast && opts.forecastValue != null && opts.forecastPeriod) {
    const fv = opts.forecastValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return (
      `Run complete scenario. A forecast already exists: ${opts.forecastPeriod} = ${fv}. ` +
      `Do NOT re-run the forecast — reuse this result as the optimization target. ` +
      `Use the "${strategyLabel}" growth strategy to determine what data changes, drivers, ` +
      `and interventions are needed to achieve the forecasted value of ${fv} for ${opts.forecastPeriod}. ` +
      `Generate the full World Model showing: affected data points, required changes, ` +
      `contribution of each variable, strategy details, and relationships between factors.`
    );
  }

  return (
    `Run complete scenario from scratch. ` +
    `First forecast the next period using Holt-Winters, then use the "${strategyLabel}" growth strategy ` +
    `to optimize and achieve the forecast target with a ${opts.egrTarget}% EGR. ` +
    `Generate the full World Model showing: affected data points, required changes, ` +
    `contribution of each variable, strategy details, and relationships between factors. ` +
    `Never fabricate results — use only actual tool and API outputs.`
  );
}
