// Pure helpers for the agent SSE stream (POST /api/data-ops-agent/chat/stream).
// Kept free of React/axios imports so they can be unit-tested with node --test.

export type SseHandler = (event: string, data: unknown) => void;

/**
 * Incremental Server-Sent Events parser.
 *
 * Feed decoded text chunks with push(); each complete event (terminated by a
 * blank line) is dispatched to onEvent with its JSON-parsed data. Handles CRLF
 * line endings (sse-starlette uses \r\n), ": ping" comments, multi-line data
 * fields, and events split across chunk boundaries.
 */
export function createSseParser(onEvent: SseHandler) {
  let buf = '';
  let eventType = '';
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length > 0) {
      const raw = dataLines.join('\n');
      let data: unknown = raw;
      try { data = JSON.parse(raw); } catch { /* keep raw string */ }
      onEvent(eventType || 'message', data);
    }
    eventType = '';
    dataLines = [];
  };

  const processLine = (line: string) => {
    if (line === '') { dispatch(); return; }
    if (line.startsWith(':')) return; // comment / keep-alive ping
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') eventType = value;
    else if (field === 'data') dataLines.push(value);
  };

  return {
    push(chunk: string) {
      buf += chunk;
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) processLine(line.endsWith('\r') ? line.slice(0, -1) : line);
    },
    /** Call once the stream ends to dispatch a final event that had no trailing blank line. */
    flush() {
      if (buf) { processLine(buf.endsWith('\r') ? buf.slice(0, -1) : buf); buf = ''; }
      dispatch();
    },
  };
}

// User-facing progress text for each agent tool. Tool names are internal and
// must never be shown to the user directly.
const TOOL_PROGRESS_LABELS: Record<string, string> = {
  get_batch_status: 'Checking your workspace…',
  upload_data: 'Reading your data…',
  vectorise_data: 'Preparing your data…',
  run_aggregation: 'Aggregating categories…',
  prepare_data: 'Preparing and aggregating your data…',
  set_egr: 'Setting the growth target…',
  set_fixed_values: 'Locking fixed values…',
  run_optimization: 'Running the optimization…',
  run_forecast: 'Running the forecast…',
  run_scenario: 'Building the scenario…',
  compare_scenarios: 'Comparing scenarios…',
  run_forecast_scenario: 'Building the forecast scenario…',
  compare_forecast_scenarios: 'Comparing forecast scenarios…',
  run_full_pipeline: 'Building the world model…',
  run_full_forecast_pipeline: 'Running the forecast pipeline…',
  run_complete_scenario: 'Running the complete scenario…',
  get_uploaded_data: 'Looking up your data…',
  get_optimization_results: 'Looking up optimization results…',
  get_forecast_results: 'Looking up forecast results…',
  collect_web_data: 'Researching benchmarks on the web…',
  update_world_model_entry: 'Updating the world model…',
  edit_dataset_design: 'Updating the table…',
};

export function toolProgressLabel(toolName: string): string {
  return TOOL_PROGRESS_LABELS[toolName] ?? 'Working on it…';
}
