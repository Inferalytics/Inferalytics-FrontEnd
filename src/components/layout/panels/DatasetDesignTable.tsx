import React, { useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { CheckCircle2, Loader2, Lock, LockOpen, PencilLine, Table2 } from 'lucide-react';
import api from '../../../api';
import { useStore } from '../../../store/useStore';
import type { DatasetAction, DatasetDesign, DesignCellStatus } from '../../../types/api';
import {
  STATUS_CELL_CLASS,
  STATUS_LABEL,
  countByStatus,
  formatDesignValue,
  formulaLabel,
  groupDimensions,
  parseCellInput,
} from '../../../lib/datasetDesign';

/** Event LeftPanel listens for to send "Approve structure" / "Reopen" through the agent. */
export const DATASET_ACTION_EVENT = 'advisor-dataset-action';

const LEGEND: DesignCellStatus[] = ['estimated', 'interpolated', 'user', 'web', 'file', 'derived'];

interface DatasetDesignTableProps {
  design: DatasetDesign;
  batchId: string;
  triggerToast?: (msg: string) => void;
  /** Configure step: row names that can be locked. When set, the table is read-only apart from locks. */
  lockableLabels?: Set<string>;
  lockedLabels?: Set<string>;
  onToggleLock?: (label: string) => void;
  lockDisabled?: boolean;
}

export default function DatasetDesignTable({
  design,
  batchId,
  triggerToast,
  lockableLabels,
  lockedLabels,
  onToggleLock,
  lockDisabled = false,
}: DatasetDesignTableProps) {
  const { setDatasetDesign, loadDatasetDesign } = useStore();
  const configuring = lockableLabels !== undefined;
  const [editing, setEditing] = useState<{ dimension: string; period: string } | null>(null);
  // Mirrors `editing` so Enter followed by the input's blur saves only once
  const editingRef = useRef<{ dimension: string; period: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => groupDimensions(design), [design]);
  const counts = useMemo(() => countByStatus(design), [design]);
  const changed = useMemo(() => new Set(design.last_changed), [design.last_changed]);
  const isDraft = design.status === 'draft';
  const isEmpty = design.periods.length === 0 || design.dimensions.length === 0;
  const periodWord = design.granularity === 'yearly' ? 'year' : 'quarter';

  const dispatchAction = (type: DatasetAction['type']) => {
    window.dispatchEvent(new CustomEvent<DatasetAction>(DATASET_ACTION_EVENT, { detail: { type } }));
  };

  const handleSaveError = async (err: unknown) => {
    const response = isAxiosError(err) ? err.response : undefined;
    const detail = (response?.data as { detail?: unknown } | undefined)?.detail;
    if (response?.status === 409) {
      await loadDatasetDesign();
      triggerToast?.('The table changed while you were editing. It has been reloaded; please try again.');
    } else {
      triggerToast?.(typeof detail === 'string' ? detail : 'Could not save the change. Please try again.');
    }
  };

  const toggleOptimise = async (dimensionId: string, optimise: boolean) => {
    if (saving || configuring) return;
    setSaving(true);
    try {
      const saved = await api.patchDatasetDesignDimension(batchId, design.version, dimensionId, optimise);
      setDatasetDesign(saved);
      if (!isDraft) triggerToast?.('Table reopened for changes');
    } catch (err) {
      await handleSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (dimension: string, period: string, current: number | undefined) => {
    if (saving || configuring) return;
    editingRef.current = { dimension, period };
    setEditing({ dimension, period });
    setEditValue(current === undefined ? '' : String(current));
  };

  const cancelEdit = () => {
    editingRef.current = null;
    setEditing(null);
  };

  const commitEdit = async () => {
    const target = editingRef.current;
    if (!target) return;
    cancelEdit();
    const current = design.cells[target.dimension]?.[target.period];
    const value = parseCellInput(editValue);
    if (value === undefined) {
      triggerToast?.('Enter a number, or leave the cell empty to clear it');
      return;
    }
    if ((value === null && !current) || (current && value === current.value)) return;

    setSaving(true);
    try {
      const saved = await api.patchDatasetDesignCells(batchId, design.version, [
        { dimension: target.dimension, period: target.period, value },
      ]);
      setDatasetDesign(saved);
      if (!isDraft) triggerToast?.('Table reopened for changes');
    } catch (err) {
      await handleSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ── Design bar (the Configure bar takes its place while configuring) ── */}
      {!configuring && (
      <div className="shrink-0 px-4 py-2.5 border-b border-[#FFD4C5] bg-[#FFF8F4] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-md border text-[#FF5A1F] bg-[#FFF2EE] border-[#FFD4C5]/80 shrink-0">
            <Table2 className="h-3 w-3" />
            {isDraft ? 'Draft' : 'Approved'} v{design.version}
          </span>
          <span className="text-[11.5px] text-warm-muted truncate">
            {isDraft
              ? 'Describe changes in the chat or double-click a cell. Estimates are placeholders until real data is loaded.'
              : 'Structure approved. Upload a file, use web data, or continue with the estimates.'}
          </span>
        </div>
        {isDraft ? (
          <button
            onClick={() => dispatchAction('approve')}
            disabled={isEmpty || saving}
            title={isEmpty ? 'Add at least one row and one period first' : undefined}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#FF5A1F] hover:bg-[#E54E17] text-white text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve structure
          </button>
        ) : (
          <button
            onClick={() => dispatchAction('reopen')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#FAF9F7] text-warm-text text-[11px] font-semibold transition-all cursor-pointer shrink-0"
          >
            <PencilLine className="h-3.5 w-3.5 text-warm-muted" />
            Edit structure
          </button>
        )}
      </div>
      )}

      {/* ── Legend ── */}
      <div className="shrink-0 px-4 py-1.5 border-b border-[#EDEAE4] bg-white flex items-center gap-3 flex-wrap text-[10.5px] font-mono text-warm-muted select-none">
        {LEGEND.map(status => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`inline-block w-4 h-2.5 rounded-xs border border-[#E5E1D8] ${STATUS_CELL_CLASS[status]}`} />
            {STATUS_LABEL[status]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-2.5 rounded-xs bg-[#FFFAF6] shadow-[inset_3px_0_0_#FF5A1F]" />
          Changed last turn
        </span>
      </div>

      {/* ── Table ── */}
      {isEmpty ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-[#FAF9F7]/40">
          <p className="text-sm font-semibold text-warm-text mb-1">The table is taking shape</p>
          <p className="text-[12px] text-warm-muted max-w-sm leading-relaxed">
            {design.periods.length === 0
              ? 'Tell the advisor which years (or quarters) to cover.'
              : 'Tell the advisor which metrics to track, for example revenue or store count.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse text-[12px] tabular-nums">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#FBFAF8] border-b border-[#EDEAE4]">
                <th className="sticky left-0 z-20 bg-[#FBFAF8] text-left px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-warm-muted min-w-[180px]">
                  Dimension
                </th>
                <th className="text-left px-2 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-warm-muted">
                  Unit
                </th>
                {design.periods.map(p => (
                  <th
                    key={p.key}
                    title={p.projected ? 'Projected period (not finished yet)' : undefined}
                    className={`text-right px-3 py-2 text-[10px] font-mono font-semibold whitespace-nowrap ${
                      p.projected ? 'text-[#C2410C]' : 'text-warm-muted'
                    }`}
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(({ group, dimensions }) => (
                <React.Fragment key={group}>
                  <tr className="bg-[#FBFAF8]">
                    <td
                      colSpan={design.periods.length + 2}
                      className="sticky left-0 px-3 py-1 text-[9.5px] font-mono uppercase tracking-widest text-warm-muted border-b border-[#EDEAE4]"
                    >
                      {group}
                    </td>
                  </tr>
                  {dimensions.map(dim => {
                    const rowCells = design.cells[dim.id] ?? {};
                    const isChanged = changed.has(dim.id);
                    const formula = formulaLabel(design, dim);
                    return (
                      <tr key={dim.id} className={`border-b border-[#EFECE8] ${isChanged ? 'bg-[#FFFAF6]' : ''}`}>
                        <td
                          className={`sticky left-0 z-[1] px-3 py-1.5 text-left ${
                            isChanged ? 'bg-[#FFFAF6] shadow-[inset_3px_0_0_#FF5A1F]' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {configuring && lockableLabels?.has(dim.name) && (
                              <button
                                onClick={() => onToggleLock?.(dim.name)}
                                disabled={lockDisabled}
                                aria-pressed={lockedLabels?.has(dim.name) ?? false}
                                title={lockedLabels?.has(dim.name) ? 'Locked: this row will not change' : 'Lock this row so it does not change'}
                                className="p-0.5 rounded hover:bg-[#FFF2EE] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {lockedLabels?.has(dim.name)
                                  ? <Lock className="h-3.5 w-3.5 text-[#B45309]" />
                                  : <LockOpen className="h-3.5 w-3.5 text-warm-muted/60" />}
                              </button>
                            )}
                            <span className="font-semibold text-warm-text">{dim.name}</span>
                            <button
                              onClick={() => void toggleOptimise(dim.id, !dim.optimise)}
                              disabled={configuring || saving}
                              title={dim.optimise
                                ? 'The optimiser grows this row. Click to keep it as context only.'
                                : 'Context only: the optimiser does not change this row. Click to optimise it.'}
                              className={`px-1.5 py-px rounded-full border text-[9.5px] font-mono whitespace-nowrap transition-colors cursor-pointer disabled:cursor-default ${
                                dim.optimise
                                  ? 'bg-[#FFF2EE] text-[#C2410C] border-[#FFD4C5]'
                                  : 'bg-white text-warm-muted border-dashed border-[#DFDCD8]'
                              }`}
                            >
                              {dim.optimise ? 'Optimised' : 'Not optimised'}
                            </button>
                          </div>
                          {formula && (
                            <span className="block text-[10px] font-mono text-warm-muted">= {formula}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-[10.5px] font-mono text-warm-muted whitespace-nowrap">{dim.unit}</td>
                        {design.periods.map(p => {
                          const cell = rowCells[p.key];
                          const isEditing = editing?.dimension === dim.id && editing.period === p.key;
                          const editable = dim.kind === 'input' && !configuring;
                          const tip = cell
                            ? [STATUS_LABEL[cell.status], cell.source_name, cell.source_url].filter(Boolean).join(' · ')
                            : editable ? 'Double-click to enter a value' : dim.kind === 'derived' ? 'Calculated when its inputs have values' : 'Empty';
                          return (
                            <td
                              key={p.key}
                              title={tip}
                              onDoubleClick={editable ? () => startEdit(dim.id, p.key, cell?.value) : undefined}
                              className={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${
                                cell ? STATUS_CELL_CLASS[cell.status] : 'text-[#C9C3BB]'
                              } ${editable ? 'cursor-text' : ''}`}
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  onBlur={() => void commitEdit()}
                                  aria-label={`${dim.name}, ${p.label}`}
                                  className="w-20 px-1 py-0.5 text-right text-[12px] font-mono text-warm-text bg-white border border-[#FF5A1F] rounded outline-none"
                                />
                              ) : cell ? (
                                <span className={cell.status === 'estimated' ? 'border-b border-dashed border-[#D9B98F]' : ''}>
                                  {formatDesignValue(cell.value)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="shrink-0 px-4 py-2 border-t border-[#EDEAE4] bg-[#F7F5F0] flex items-center justify-between gap-3 text-[10.5px] text-[#8C847C] font-mono select-none">
        <span className="flex items-center gap-1.5">
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin text-[#FF5A1F]" />
          ) : (
            <span className={`h-1.5 w-1.5 rounded-full inline-block ${isDraft ? 'bg-[#FF5A1F]' : 'bg-green-500'}`} />
          )}
          {saving ? 'Saving…' : configuring ? 'Approved · data prepared' : isDraft ? 'Draft · nothing computed yet' : 'Approved · waiting for real data'}
        </span>
        <span>
          {configuring && lockableLabels && lockableLabels.size > 0 && (
            <span className="text-[#B45309] mr-2">{lockedLabels?.size ?? 0} Locked ·</span>
          )}
          {design.dimensions.length} rows · {design.periods.length} {periodWord}{design.periods.length === 1 ? '' : 's'}
          {counts.estimated > 0 && ` · ${counts.estimated} estimated`}
          {counts.interpolated > 0 && ` · ${counts.interpolated} interpolated`}
          {counts.user > 0 && ` · ${counts.user} yours`}
        </span>
      </div>
    </div>
  );
}
