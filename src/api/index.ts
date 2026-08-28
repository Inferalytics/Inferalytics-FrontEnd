import axiosClient from './axiosClient';
import type {
  BatchSessionResponse,
  CreateBatchResponse,
  ListBatchResponse,
  SwitchBatchResponse,
  DeleteBatchResponse,
  DataUploadResponse,
  RetrieveDataResponse,
  VectorisationResponse,
  AggregationResponse,
  EgrResponse,
  RetrieveEgrResponse,
  FixedValuesResponse,
  DataTimeResponse,
  GetDataTimeResponse,
  GrowthTimeResponse,
  GetGrowthTimeResponse,
  NewtonRaphsonResponse,
  RetrieveNewtonRaphsonResponse,
  ListModelsResponse,
  ForecastResponse,
  GetForecastResponse,
  ForecastScenariosResponse,
  ScenarioCompareResponse,
  AgentRequest,
  AgentResponse,
} from '../types/api';

export const api = {
  // ─── Health Check ─────────────────────────────────────────────────────────
  healthCheck: async () => {
    const res = await axiosClient.get<{ message: string; status: string }>('/');
    return res.data;
  },

  // ─── Auth Exchange Token ──────────────────────────────────────────────────
  exchangeToken: async (name?: string, clerkJwt?: string) => {
    const headers: Record<string, string> = {};
    if (clerkJwt) {
      headers['Authorization'] = `Bearer ${clerkJwt}`;
    }
    const res = await axiosClient.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      refresh_token_expires_in: number;
      message: string;
    }>(
      '/auth/exchange-token',
      { name },
      { headers }
    );
    return res.data;
  },

  // ─── Batching ─────────────────────────────────────────────────────────────
  getBatchSession: async () => {
    const res = await axiosClient.get<BatchSessionResponse>('/batching/session');
    return res.data;
  },

  createBatch: async (batchName: string) => {
    const res = await axiosClient.post<CreateBatchResponse>('/batching/create', { batch_name: batchName });
    return res.data;
  },

  listBatches: async () => {
    const res = await axiosClient.get<ListBatchResponse>('/batching/list');
    return res.data;
  },

  switchBatch: async (batchId: string) => {
    const res = await axiosClient.post<SwitchBatchResponse>('/batching/switch', { batch_id: batchId });
    return res.data;
  },

  deleteBatch: async (batchId: string) => {
    const res = await axiosClient.delete<DeleteBatchResponse>('/batching/delete', { data: { batch_id: batchId } });
    return res.data;
  },

  getBatchModel: async (batchId: string) => {
    const res = await axiosClient.get<{
      batch_id: string;
      model_id: string;
      model_name: string;
      status: string;
    }>(`/batching/${batchId}/model`);
    return res.data;
  },

  setBatchModel: async (batchId: string, modelId: string) => {
    const res = await axiosClient.post<{
      batch_id: string;
      model_id: string;
      model_name: string;
      status: string;
      message: string;
    }>(`/batching/${batchId}/model`, { model_id: modelId });
    return res.data;
  },

  // ─── Data Population ──────────────────────────────────────────────────────
  uploadFile: async (file: File) => {
    if (file.name.toLowerCase().endsWith('.json')) {
      const text = await file.text();
      const parsedData = JSON.parse(text);
      const res = await axiosClient.post<DataUploadResponse>(
        '/optimization/data-population/upload-json',
        { data: parsedData }
      );
      return res.data;
    }

    const formData = new FormData();
    formData.append('file', file);
    const res = await axiosClient.post<DataUploadResponse>(
      '/optimization/data-population/upload-file',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  uploadJson: async (data: Record<string, unknown>) => {
    const res = await axiosClient.post<DataUploadResponse>(
      '/optimization/data-population/upload-json',
      { data }
    );
    return res.data;
  },

  retrieveData: async () => {
    const res = await axiosClient.get<RetrieveDataResponse>('/optimization/data-retrieval/retrieve');
    return res.data;
  },

  // ─── Pipeline ─────────────────────────────────────────────────────────────
  vectorise: async () => {
    const res = await axiosClient.post<VectorisationResponse>('/optimization/vectorisation/vectorise');
    return res.data;
  },

  aggregate: async () => {
    const res = await axiosClient.post<AggregationResponse>('/optimization/aggregation/aggregate');
    return res.data;
  },

  // ─── Target & Parameters Configuration ────────────────────────────────────
  setEgr: async (egrValue: number) => {
    const res = await axiosClient.post<EgrResponse>('/optimization/egr/create', { egr_value: egrValue });
    return res.data;
  },

  getEgr: async () => {
    const res = await axiosClient.get<RetrieveEgrResponse>('/optimization/egr/retrieve');
    return res.data;
  },

  setFixedValues: async (fixedValues: { row_number: number; column_number: number; fixed_value: number }[]) => {
    const res = await axiosClient.post<FixedValuesResponse>('/optimization/fixed-values/fix', { fixed_values: fixedValues });
    return res.data;
  },

  getFixedValues: async () => {
    const res = await axiosClient.get<FixedValuesResponse>('/optimization/fixed-values/retrieve');
    return res.data;
  },

  setDataTime: async (startTime: string, endTime: string, periodType?: string) => {
    const res = await axiosClient.post<DataTimeResponse>('/optimization/data-time/set', {
      start_time: startTime,
      end_time: endTime,
      period_type: periodType ?? 'quarterly',
    });
    return res.data;
  },

  getDataTime: async () => {
    const res = await axiosClient.get<GetDataTimeResponse>('/optimization/data-time/get');
    return res.data;
  },

  setGrowthTime: async (targetTime: string) => {
    const res = await axiosClient.post<GrowthTimeResponse>('/optimization/growth-time/set', { target_time: targetTime });
    return res.data;
  },

  getGrowthTime: async () => {
    const res = await axiosClient.get<GetGrowthTimeResponse>('/optimization/growth-time/get');
    return res.data;
  },

  // ─── Optimization & Forecast ──────────────────────────────────────────────
  listModels: async () => {
    const res = await axiosClient.get<ListModelsResponse>('/optimization/models');
    return res.data;
  },

  optimize: async () => {
    const res = await axiosClient.post<NewtonRaphsonResponse>('/optimization/newton-raphson/optimize');
    return res.data;
  },

  retrieveOptimization: async () => {
    const res = await axiosClient.get<RetrieveNewtonRaphsonResponse>('/optimization/newton-raphson/retrieve');
    return res.data;
  },

  forecast: async (params?: { alpha?: number; beta?: number; gamma?: number }) => {
    const res = await axiosClient.post<ForecastResponse>('/optimization/forecast/calculate', params ?? {});
    return res.data;
  },

  getForecast: async () => {
    const res = await axiosClient.get<GetForecastResponse>('/optimization/forecast/get');
    return res.data;
  },

  getForecastScenarios: async () => {
    const res = await axiosClient.get<ForecastScenariosResponse>('/optimization/forecast/scenarios');
    return res.data;
  },

  getScenarioCompare: async () => {
    const res = await axiosClient.get<ScenarioCompareResponse>('/optimization/scenarios/compare');
    return res.data;
  },

  // ─── Data Ops AI Agent ─────────────────────────────────────────────────────
  agentChat: async (req: AgentRequest) => {
    // Agent endpoint is explicitly mounted under /api
    const res = await axiosClient.post<AgentResponse>('/api/data-ops-agent/chat', req);
    return res.data;
  },
};

export default api;
