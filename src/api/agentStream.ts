import axiosClient, { clearStoredApiKey, getAuthToken } from './axiosClient.ts';
import { createSseParser } from '../lib/agentStream.ts';
import type { AgentRequest, AgentResponse, DatasetDesign, WorkspaceTable } from '../types/api.ts';

const STREAM_PATH = '/api/data-ops-agent/chat/stream';

export interface AgentStreamHandlers {
  /** LLM text as it is generated. The final AgentResponse.reply is authoritative. */
  onTextDelta?: (text: string, iteration: number) => void;
  onToolStart?: (toolName: string, iteration: number) => void;
  onToolEnd?: (toolName: string, outcome: 'success' | 'error') => void;
  /** Latest workspace table after a tool changed it. */
  onWorkspaceTable?: (table: WorkspaceTable) => void;
  /** Latest dataset design after the agent edited it. */
  onDatasetDesign?: (design: DatasetDesign) => void;
  signal?: AbortSignal;
}

/**
 * Error thrown for failed agent streams. Carries an axios-like `response`
 * so existing `err?.response?.data?.detail` handling keeps working.
 */
export class AgentStreamError extends Error {
  response?: { status: number; data: unknown };

  constructor(message: string, response?: { status: number; data: unknown }) {
    super(message);
    this.name = 'AgentStreamError';
    this.response = response;
  }
}

const post = async (req: AgentRequest, token: string | null, signal?: AbortSignal) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const base = String(axiosClient.defaults.baseURL ?? '').replace(/\/+$/, '');
  return fetch(`${base}${STREAM_PATH}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
    signal,
  });
};

/**
 * Send a chat message to the agent over SSE and resolve with the final
 * AgentResponse (same shape as POST /api/data-ops-agent/chat).
 */
export async function streamAgentChat(
  req: AgentRequest,
  handlers: AgentStreamHandlers = {},
): Promise<AgentResponse> {
  let res = await post(req, await getAuthToken(), handlers.signal);

  // Mirror the axios interceptor: on 401 drop a bad stored key and retry once with a fresh Clerk token.
  if (res.status === 401) {
    clearStoredApiKey();
    const fresh = await getAuthToken();
    if (fresh) res = await post(req, fresh, handlers.signal);
  }

  if (!res.ok || !res.body) {
    let data: unknown = null;
    try { data = await res.json(); } catch { /* non-JSON error body */ }
    throw new AgentStreamError(`Agent request failed with status ${res.status}`, { status: res.status, data });
  }

  let final: AgentResponse | null = null;
  let streamError: string | null = null;

  const parser = createSseParser((event, data) => {
    const d = (data ?? {}) as Record<string, unknown>;
    switch (event) {
      case 'text_delta': handlers.onTextDelta?.(String(d.text ?? ''), Number(d.iteration ?? 0)); break;
      case 'tool_start': handlers.onToolStart?.(String(d.name ?? ''), Number(d.iteration ?? 0)); break;
      case 'tool_end': handlers.onToolEnd?.(String(d.name ?? ''), d.outcome === 'error' ? 'error' : 'success'); break;
      case 'workspace_table': handlers.onWorkspaceTable?.(d as unknown as WorkspaceTable); break;
      case 'dataset_design': handlers.onDatasetDesign?.(d as unknown as DatasetDesign); break;
      case 'final': final = d as unknown as AgentResponse; break;
      case 'error': streamError = typeof d.message === 'string' ? d.message : 'Something went wrong. Please try again.'; break;
    }
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.push(decoder.decode());
  parser.flush();

  if (final) return final;
  throw new AgentStreamError(streamError ?? 'Agent stream ended without a final response', {
    status: res.status,
    data: { detail: streamError ?? 'Agent stream ended without a final response' },
  });
}
