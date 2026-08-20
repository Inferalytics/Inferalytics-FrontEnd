// Maps real backend agent tool names (apps/data_ops_agent/tools.py TOOL_NAMES)
// to the dashboard route that shows that tool's result.
const TOOL_ROUTE_PRIORITY: { tools: string[]; route: string }[] = [
  { tools: ['compare_scenarios', 'compare_forecast_scenarios'], route: '/dashboard/learning' },
  { tools: ['run_scenario', 'run_forecast_scenario'], route: '/dashboard/workspace/scenarios' },
  { tools: ['run_optimization'], route: '/dashboard/workspace/summary' },
  { tools: ['run_forecast', 'set_egr', 'set_fixed_values'], route: '/dashboard/ips-engine' },
  { tools: ['vectorise_data', 'run_aggregation'], route: '/dashboard/ecr-build' },
  { tools: ['upload_data'], route: '/dashboard/ecr-batch' },
];

/**
 * Given the tools_used array from an AgentResponse, returns the dashboard
 * route that displays that action's real result — or null if the agent
 * only ran read-only/informational tools (e.g. get_batch_status).
 */
export function getRouteForTools(tools: string[] | undefined | null): string | null {
  if (!tools || tools.length === 0) return null;
  for (const { tools: names, route } of TOOL_ROUTE_PRIORITY) {
    if (tools.some(t => names.includes(t))) return route;
  }
  return null;
}
