import { useStore } from '../../store/useStore';
import { isWebBenchmarkRow, isFileDataRow } from '../../lib/workspaceTableUtils';

/**
 * What the active batch has produced so far — drives which secondary views
 * (Dimensions, Scenarios) are worth pointing the user to. The workflow itself
 * always happens in the Conversation.
 */
export function useWorkspaceProgress() {
  const { workspaceTable, worldModels, activeBatchId } = useStore();
  const dataRows = (workspaceTable?.rows ?? []).filter(r => isWebBenchmarkRow(r) || isFileDataRow(r)).length;
  const scenarioCount = worldModels.filter(w => !activeBatchId || !w.batch_id || w.batch_id === activeBatchId).length;
  return { dataRows, scenarioCount };
}
