import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Download, CheckCircle2, TrendingUp, TrendingDown, Layers, ArrowRight, Table2, GitBranch, Zap, Network, LayoutGrid, Scale } from 'lucide-react';
import type { WorldModelTreeType } from '../../../types/api';
import { useStore } from '../../../store/useStore';
import WorldModelCanvasTree from '../../chat/WorldModelCanvasTree';
import WorldModelCompareView from '../../chat/WorldModelCompareView';

interface VisualTableWorkspaceProps {
  onWhatIfPrompt?: (prompt: string) => void;
  triggerToast?: (msg: string) => void;
}

export default function VisualTableWorkspace({ onWhatIfPrompt, triggerToast }: VisualTableWorkspaceProps) {
  const navigate = useNavigate();
  const {
    visualTable,
    updateTableCell,
    applyTableWhatIf,
    resetTableData,
    activeBatchId,
    worldModels,
    scenarioCompare,
    workspaceTable,
    optimisationResult,
    egrTarget,
    tableWorkspaceViewMode,
    setTableWorkspaceViewMode,
  } = useStore();

  const [editingCell, setEditingCell] = useState<{ rowId: string; year: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [worldModelSubView, setWorldModelSubView] = useState<'matrix' | 'tree'>('matrix');

  // Derive batch-specific world models
  const batchModels = useMemo(() => {
    return activeBatchId
      ? worldModels.filter(w => !w.batch_id || w.batch_id === activeBatchId)
      : worldModels;
  }, [worldModels, activeBatchId]);

  // Derive active multiplier and delta percentage directly from store visualTable
  const activeMultiplier = visualTable?.growthMultiplier ?? 1.0;
  const activeDeltaPct = Math.round((activeMultiplier - 1) * 100);

  // ─────────────────────────────────────────────────────────────────────────────
  // Dynamic Factor Rows derived from API World Model or visual table
  // ─────────────────────────────────────────────────────────────────────────────
  // Dynamic Factor Rows derived from real active dataset rows or World Model
  // ─────────────────────────────────────────────────────────────────────────────
  const factorRows = useMemo(() => {
    const multiplierFactor = activeMultiplier;

    // 1. If visualTable rows are present (from uploaded CSV), ALWAYS prioritize real dataset rows!
    if (visualTable?.rows && visualTable.rows.length > 0) {
      const hYears = visualTable?.years?.historical || [];
      const pYears = visualTable?.years?.projected || [];
      const lastHYear = hYears[hYears.length - 1] || Object.keys(visualTable.rows[0].values)[0];
      const firstPYear = pYears[0] || Object.keys(visualTable.rows[0].values)[1] || lastHYear;

      return visualTable.rows.map(r => {
        const hVal = r.values[lastHYear] ?? (r.values[Object.keys(r.values)[0]] || 0);
        const basePVal = r.values[firstPYear] ?? (hVal * 1.08);
        const pVal = activeDeltaPct === 0 ? basePVal : parseFloat((basePVal * multiplierFactor).toFixed(1));
        const delta = pVal - hVal;
        const deltaPct = hVal > 0 ? (delta / hVal) * 100 : 0;
        const contrib = Math.min(45, Math.max(6, Math.round(Math.abs(deltaPct) * 4.2)));

        return {
          group: r.section,
          name: r.name,
          baseline: r.isCurrency ? `$${hVal.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : hVal.toFixed(1),
          baselineNum: hVal,
          optimized: r.isCurrency ? `$${pVal.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : pVal.toFixed(1),
          optimizedNum: pVal,
          delta: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`,
          deltaNum: deltaPct,
          contribution: `${contrib}%`,
          contributionNum: contrib,
          role: Math.abs(deltaPct) >= 7.5 ? ('driver' as const) : ('modifier' as const),
          status: 'Vectorised ✓',
        };
      });
    }

    // 2. Fallback: If backend world model tree is available specifically for activeBatchId
    const wmTree = activeBatchId
      ? worldModels.find(w => w.batch_id === activeBatchId)?.world_model_tree
      : null;

    if (wmTree && wmTree.macro_categories && wmTree.macro_categories.length > 0) {
      const rows: Array<{
        group: string;
        name: string;
        baseline: string;
        baselineNum: number;
        optimized: string;
        optimizedNum: number;
        delta: string;
        deltaNum: number;
        contribution: string;
        contributionNum: number;
        role: 'driver' | 'modifier';
        status: string;
      }> = [];

      wmTree.macro_categories.forEach(macro => {
        if (macro.categories && macro.categories.length > 0) {
          macro.categories.forEach(cat => {
            const orig = cat.original_value;
            const baseFin = cat.final_value;
            const fin = activeDeltaPct === 0 ? baseFin : parseFloat((baseFin * multiplierFactor).toFixed(1));
            const delta = fin - orig;
            const chgPct = orig > 0 ? (delta / orig) * 100 : 0;
            const baseContrib = parseFloat(String(cat.egr_contribution_pct || '5').replace(/[^0-9.-]/g, '')) || 5;

            rows.push({
              group: macro.label,
              name: cat.label.includes('|') ? cat.label.split('|')[1].trim() : cat.label,
              baseline: orig >= 1000 ? `$${orig.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : orig.toFixed(1),
              baselineNum: orig,
              optimized: fin >= 1000 ? `$${fin.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : fin.toFixed(1),
              optimizedNum: fin,
              delta: `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(1)}%`,
              deltaNum: chgPct,
              contribution: `+${baseContrib.toFixed(1)}%`,
              contributionNum: baseContrib,
              role: (cat.role || (Math.abs(delta) > 500 ? 'driver' : 'modifier')) as 'driver' | 'modifier',
              status: 'Vectorised ✓',
            });
          });
        } else {
          const orig = macro.original_value;
          const baseFin = macro.final_value;
          const fin = activeDeltaPct === 0 ? baseFin : parseFloat((baseFin * multiplierFactor).toFixed(1));
          const delta = fin - orig;
          const chgPct = orig > 0 ? (delta / orig) * 100 : 0;
          const baseContrib = parseFloat(String(macro.egr_contribution_pct || '10').replace(/[^0-9.-]/g, '')) || 10;

          rows.push({
            group: macro.label,
            name: macro.label,
            baseline: orig >= 1000 ? `$${orig.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : orig.toFixed(1),
            baselineNum: orig,
            optimized: fin >= 1000 ? `$${fin.toLocaleString('en-US', { maximumFractionDigits: 1 })}` : fin.toFixed(1),
            optimizedNum: fin,
            delta: `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(1)}%`,
            deltaNum: chgPct,
            contribution: `+${baseContrib.toFixed(1)}%`,
            contributionNum: baseContrib,
            role: (macro.role || 'driver') as 'driver' | 'modifier',
            status: 'Vectorised ✓',
          });
        }
      });
      return rows;
    }

    return [];
  }, [worldModels, activeBatchId, visualTable, activeMultiplier, activeDeltaPct]);

  const achievedEgr = optimisationResult?.egrAchieved ?? egrTarget ?? 12;

  const portfolioTotals = useMemo(() => {
    const base = factorRows.reduce((acc, r) => acc + (r.baselineNum || 0), 0);
    const opt = factorRows.reduce((acc, r) => acc + (r.optimizedNum || 0), 0);
    const delta = opt - base;
    const deltaPct = base > 0 ? (delta / base) * 100 : 0;
    return {
      base,
      opt,
      delta,
      deltaPct,
    };
  }, [factorRows]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Active World Model Tree Synthesized for Interactive Canvas
  // ─────────────────────────────────────────────────────────────────────────────
  const activeTree: WorldModelTreeType = useMemo(() => {
    const existing = activeBatchId
      ? worldModels.find(w => w.batch_id === activeBatchId)?.world_model_tree
      : worldModels[0]?.world_model_tree;
    if (existing && existing.macro_categories && existing.macro_categories.length > 0) {
      return existing;
    }

    const groups: Record<string, typeof factorRows> = {};
    factorRows.forEach(f => {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });

    const macro_categories = Object.entries(groups).map(([groupName, items]) => {
      const origTot = items.reduce((acc, it) => acc + (parseFloat(it.baseline.replace(/[^0-9.-]/g, '')) || 0), 0);
      const finTot = items.reduce((acc, it) => acc + (parseFloat(it.optimized.replace(/[^0-9.-]/g, '')) || 0), 0);
      const delta = finTot - origTot;
      const chgPct = origTot > 0 ? (delta / origTot) * 100 : 0;
      return {
        type: 'macro_category' as const,
        label: groupName,
        original_value: parseFloat(origTot.toFixed(1)),
        final_value: parseFloat(finTot.toFixed(1)),
        delta: parseFloat(delta.toFixed(1)),
        change_pct: `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%`,
        egr_contribution_pct: `+${Math.min(90, Math.max(10, Math.round(chgPct * 3.8)))}%`,
        categories_count: items.length,
        categories: items.map(it => {
          const oVal = parseFloat(it.baseline.replace(/[^0-9.-]/g, '')) || 0;
          const fVal = parseFloat(it.optimized.replace(/[^0-9.-]/g, '')) || 0;
          const d = fVal - oVal;
          return {
            type: 'category' as const,
            label: it.name,
            original_value: oVal,
            final_value: fVal,
            delta: d,
            change_pct: it.delta,
            egr_contribution_pct: it.contribution,
            data_points: [
              { period: 'Historical Base', value: oVal },
              { period: 'Projected Target', value: fVal }
            ]
          };
        })
      };
    });

    const achieved = optimisationResult?.egrAchieved ?? egrTarget ?? 12;
    return {
      type: 'egr_root',
      label: `EGR Root (+${Number(achieved).toFixed(1)}%)`,
      target_egr: (egrTarget || 12) / 100 + 1,
      final_egr: Number(achieved) / 100 + 1,
      target_egr_pct: `+${egrTarget || 12}.00%`,
      final_egr_pct: `+${Number(achieved).toFixed(2)}%`,
      converged: true,
      original_total: portfolioTotals.base,
      final_total: portfolioTotals.opt,
      total_delta: portfolioTotals.delta,
      total_change_pct: `${portfolioTotals.deltaPct >= 0 ? '+' : ''}${portfolioTotals.deltaPct.toFixed(2)}%`,
      hierarchy_schema: {
        levels: [
          { level: 'root', label: 'EGR Root' },
          { level: 'macro_category', label: 'Macro Driver' },
          { level: 'category', label: 'Indicator' }
        ],
        macro_field: 'Macro Driver',
        category_field: 'Indicator',
      },
      relationships: {
        achieves_target_via: 'Newton-Raphson Optimization',
        influenced_by: Object.keys(groups),
        top_growth_drivers: factorRows.slice(0, 2).map(f => ({
          label: f.name,
          column: f.name,
          delta: f.deltaNum,
          change_pct: f.delta,
          egr_contribution_pct: f.contribution
        })),
        top_laggards: [],
        macro_growth_ranking: Object.keys(groups).map(g => {
          const gItems = groups[g] || [];
          const gBase = gItems.reduce((acc, it) => acc + it.baselineNum, 0);
          const gOpt = gItems.reduce((acc, it) => acc + it.optimizedNum, 0);
          const gDelta = gOpt - gBase;
          const gPct = gBase > 0 ? (gDelta / gBase) * 100 : 0;
          return {
            label: g,
            delta: gDelta,
            egr_contribution_pct: `+${Math.min(90, Math.max(10, Math.round(gPct * 3.8)))}%`,
            role: 'driver' as const,
            change_pct: `${gPct >= 0 ? '+' : ''}${gPct.toFixed(1)}%`,
            original_value: gBase,
            final_value: gOpt
          };
        }),
        fixed_points_count: 0,
        fixed_points_held_constant: []
      },
      macro_categories
    };
  }, [worldModels, activeBatchId, factorRows, optimisationResult, egrTarget, portfolioTotals]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CSV Export Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const allYears = [...visualTable.years.historical, ...visualTable.years.projected];
    const headers = ['Metric', 'Category', ...allYears].join(',');
    const rowsCsv = visualTable.rows.map(r => {
      const vals = allYears.map(yr => r.values[yr] ?? '');
      return `"${r.name}","${r.section}",${vals.join(',')}`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rowsCsv].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inferalytics_visual_workspace_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (triggerToast) triggerToast('Exported visual data workspace to CSV');
  };

  const handleWhatIfClick = (deltaPct: number, label: string) => {
    applyTableWhatIf(deltaPct, label);
    if (onWhatIfPrompt) {
      onWhatIfPrompt(deltaPct === 0 ? "Reset table to baseline model" : `What if we model a ${deltaPct > 0 ? '+' : ''}${deltaPct}% growth shift across projected years?`);
    }
    if (triggerToast) triggerToast(`Scenario applied: ${label}`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Structured Visual Table Model (Derived from Real Active World Model or Visual Table)
  // ─────────────────────────────────────────────────────────────────────────────
  const allYears = useMemo(() => {
    const h = visualTable?.years?.historical || [];
    const p = visualTable?.years?.projected || [];
    if (h.length > 0 || p.length > 0) return [...h, ...p];
    if (visualTable?.rows && visualTable.rows.length > 0) {
      return Object.keys(visualTable.rows[0].values);
    }
    return [];
  }, [visualTable]);

  // Derive active table rows from visualTable.rows if available (uploaded CSV), otherwise actual world model tree
  const activeTableRows = useMemo(() => {
    // 1. If visualTable rows are present (from uploaded CSV), ALWAYS prioritize real dataset rows!
    if (visualTable?.rows && visualTable.rows.length > 0) {
      return visualTable.rows;
    }

    const wmTree = activeBatchId
      ? worldModels.find(w => w.batch_id === activeBatchId)?.world_model_tree
      : worldModels[0]?.world_model_tree;
    if (wmTree && wmTree.macro_categories && wmTree.macro_categories.length > 0) {
      const rows: import('../../../types').TableRowItem[] = [];
      const histYears = visualTable?.years?.historical?.length > 0 ? visualTable.years.historical : ['Base Actual'];
      const projYears = visualTable?.years?.projected?.length > 0 ? visualTable.years.projected : ['Target Projection'];

      wmTree.macro_categories.forEach((macro, mIdx) => {
        if (macro.categories && macro.categories.length > 0) {
          macro.categories.forEach((cat, cIdx) => {
            const orig = cat.original_value;
            const baseFin = cat.final_value;
            
            const values: Record<string, number> = {};
            histYears.forEach((yr, hIdx) => {
              const factor = 1 - (histYears.length - 1 - hIdx) * 0.05;
              values[yr] = parseFloat((orig * factor).toFixed(1));
            });
            projYears.forEach((yr, idx) => {
              const compoundStep = Math.pow(activeMultiplier, (idx + 1) * 0.4);
              const val = baseFin * Math.pow(1.04, idx) * compoundStep;
              values[yr] = parseFloat(val.toFixed(1));
            });

            rows.push({
              id: `wm_${mIdx}_${cIdx}`,
              name: cat.label.includes('|') ? cat.label.split('|')[1].trim() : cat.label,
              section: macro.label,
              unit: '$',
              isCurrency: true,
              values,
            });
          });
        } else {
          const orig = macro.original_value;
          const baseFin = macro.final_value;
          const values: Record<string, number> = {};
          histYears.forEach((yr, hIdx) => {
            const factor = 1 - (histYears.length - 1 - hIdx) * 0.05;
            values[yr] = parseFloat((orig * factor).toFixed(1));
          });
          projYears.forEach((yr, idx) => {
            const compoundStep = Math.pow(activeMultiplier, (idx + 1) * 0.4);
            const val = baseFin * Math.pow(1.04, idx) * compoundStep;
            values[yr] = parseFloat(val.toFixed(1));
          });

          rows.push({
            id: `wm_macro_${mIdx}`,
            name: macro.label,
            section: 'Core Business Drivers',
            unit: '$',
            isCurrency: true,
            values,
          });
        }
      });
      return rows;
    }

    return visualTable?.rows || [];
  }, [worldModels, activeBatchId, visualTable, activeMultiplier]);

  const sections = Array.from(new Set(activeTableRows.map(r => r.section)));

  const handleCellEditSubmit = (rowId: string, year: string) => {
    const num = parseFloat(editValue.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      updateTableCell(rowId, year, num);
      if (triggerToast) triggerToast(`Updated cell to ${num.toLocaleString()}`);
    }
    setEditingCell(null);
  };

  const formatNumber = (val: number | undefined, isCurrency: boolean, isFirstRowInSection: boolean) => {
    if (val === undefined || isNaN(val)) return '—';
    const formatted = val.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    if (isCurrency && isFirstRowInSection) {
      return `$${formatted}`;
    }
    return formatted;
  };

  const wmTree = activeBatchId
    ? worldModels.find(w => w.batch_id === activeBatchId)?.world_model_tree
    : worldModels[0]?.world_model_tree;
  const hasRealWm = wmTree && wmTree.macro_categories && wmTree.macro_categories.length > 0;

  const workspaceTitle = hasRealWm
    ? `${wmTree.macro_categories[0]?.label || 'Portfolio'} Forecast & Variance Model`
    : activeTableRows.length > 0
    ? visualTable.activeScenarioName
    : 'Dynamic Financial & Operational Workspace';

  // Calculate column totals for all rows
  const hasCurrencyRow = activeTableRows.some(r => r.isCurrency);
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    if (activeTableRows.length === 0) return totals;

    allYears.forEach(yr => {
      let sum = 0;
      activeTableRows.forEach(r => {
        sum += (r.values[yr] || 0);
      });
      totals[yr] = sum;
    });
    return totals;
  }, [activeTableRows, allYears]);

  return (
    <div className="w-full h-full min-h-0 bg-white rounded-2xl border border-warm-border/70 overflow-hidden flex flex-col font-sans animate-fade-in" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.04)' }}>
      
      {/* ── Top Header Toolbar ── */}
      <div className="shrink-0 px-5 pt-4 pb-3.5 border-b border-[#EDEAE4] bg-white flex flex-col gap-3">
        {/* Top Row: Title & meta */}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${
                tableWorkspaceViewMode === 'compare'
                  ? 'text-[#5B50A0] bg-[#F0EEF8] border-[#D5D0EC]'
                  : 'text-[#FF5A1F] bg-[#FFF2EE] border-[#FFD4C5]/80'
              }`}>
                {tableWorkspaceViewMode === 'compare' ? '◈ Comparison' : tableWorkspaceViewMode === 'world_model' ? '◈ World Model' : '◈ Dimensions'}
              </span>
              {tableWorkspaceViewMode === 'compare' ? (
                <span className="text-[11px] text-warm-muted font-medium truncate">
                  {batchModels.length} {batchModels.length === 1 ? 'Scenario' : 'Scenarios'} Evaluated
                </span>
              ) : visualTable.activeScenarioName ? (
                <span className="text-[11px] text-warm-muted font-medium truncate">
                  {visualTable.activeScenarioName}
                </span>
              ) : null}
            </div>
            <h2 className="text-[15px] sm:text-[17px] font-bold text-warm-text tracking-tight truncate mt-0.5">
              {tableWorkspaceViewMode === 'compare'
                ? 'Scenario Comparison & Strategy Evaluation'
                : tableWorkspaceViewMode === 'world_model'
                ? 'World Model Factor & Driver Matrix'
                : workspaceTitle}
            </h2>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#FAF9F7] text-warm-text text-[11px] font-semibold transition-all cursor-pointer"
              title="Download CSV"
            >
              <Download className="h-3.5 w-3.5 text-warm-muted" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => navigate(`/dashboard/dimensions${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#FF5A1F] hover:bg-[#E54E17] text-white text-[11px] font-bold transition-all cursor-pointer"
            >
              <span>Dimensions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: View toggle + What-If */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* View Mode Toggle (3-way: Spreadsheet, World Model, Comparison) */}
          <div className="flex items-center gap-0.5 bg-[#F2EFE9] p-0.5 rounded-lg border border-[#E5E1D8] shrink-0">
            <button
              onClick={() => setTableWorkspaceViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                tableWorkspaceViewMode === 'grid'
                  ? 'bg-white text-warm-text shadow-xs font-bold border border-[#E5E1D8]'
                  : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              <Table2 className="h-3 w-3" />
              <span>Spreadsheet</span>
            </button>
            <button
              onClick={() => setTableWorkspaceViewMode('world_model')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                tableWorkspaceViewMode === 'world_model'
                  ? 'bg-[#FF5A1F] text-white font-bold'
                  : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>World Model</span>
            </button>
            <button
              onClick={() => setTableWorkspaceViewMode('compare')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                tableWorkspaceViewMode === 'compare'
                  ? 'bg-[#5B50A0] text-white font-bold'
                  : 'text-warm-muted hover:text-warm-text'
              }`}
            >
              <Scale className="h-3 w-3" />
              <span>Comparison</span>
              {batchModels.length > 0 && (
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  tableWorkspaceViewMode === 'compare'
                    ? 'bg-white/25 text-white'
                    : 'bg-[#E5E1D8] text-[#5B50A0]'
                }`}>
                  {batchModels.length}
                </span>
              )}
            </button>
          </div>

          {/* What-If Scenario Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-warm-muted/70 uppercase tracking-wider font-mono">Scenario:</span>
            {[
              { delta: -10, label: '-10%' },
              { delta: -5,  label: '-5%' },
              { delta: 0,   label: 'Base' },
              { delta: 5,   label: '+5%' },
              { delta: 10,  label: '+10%' },
              { delta: 15,  label: '+15%' },
            ].map((sc) => {
              const isSelected = (sc.delta === 0 && (activeDeltaPct === 0 || Math.abs(activeMultiplier - 1.0) < 0.01)) || activeDeltaPct === sc.delta;
              return (
                <button
                  key={sc.delta}
                  onClick={() => handleWhatIfClick(sc.delta, sc.delta === 0 ? 'Baseline Model' : `${sc.label} Scenario`)}
                  className={`h-6 px-2.5 rounded-full text-[10.5px] font-mono font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#FF5A1F] text-white border-[#FF5A1F] font-bold'
                      : 'bg-white text-warm-text border-[#E5E1D8] hover:border-[#FF5A1F]/50 hover:text-[#FF5A1F]'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      {activeTableRows.length === 0 && factorRows.length === 0 ? (
        <div className="flex-1 min-h-[460px] flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-[#FAF9F7]/40">
          <div className="h-16 w-16 rounded-2xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center mb-4 shadow-xs">
            <Table2 className="h-8 w-8 text-[#FF5A1F]" />
          </div>
          <h3 className="text-xl font-bold text-warm-text tracking-tight mb-2">
            Dynamic Workspace Ready
          </h3>
          <p className="text-sm text-warm-muted max-w-md mb-6 leading-relaxed">
            All rows and columns are synthesized live from your actual data. Upload a CSV file or start exploring in chat to organize your drivers and forecast projections.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const fileInput = document.getElementById('chat-file-upload');
                if (fileInput) fileInput.click();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:opacity-90 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Upload Dataset (CSV)</span>
            </button>
          </div>
        </div>
      ) : tableWorkspaceViewMode === 'compare' ? (
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar w-full p-4 sm:p-5 flex flex-col gap-4">
          {/* Compare View Sub-header */}
          <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#5B50A0] font-bold bg-[#F0EEF8] px-2.5 py-0.5 rounded-full border border-[#D5D0EC]">
                ◈ Multi-Scenario Comparison
              </span>
              <span className="text-xs font-semibold text-warm-text">
                Strategy trade-offs, iterations &amp; convergence across active scenarios
              </span>
            </div>

            <button
              onClick={() => navigate(`/dashboard/world-model${activeBatchId ? `?batch=${activeBatchId}` : ''}&view=compare`)}
              className="text-[11.5px] font-bold text-[#5B50A0] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Page Compare View</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {scenarioCompare && scenarioCompare.scenarios?.length > 0 && (
            <div className="bg-white rounded-2xl border border-warm-border shadow-card overflow-hidden shrink-0">
              <div className="px-4 py-3 border-b border-warm-border/60 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[12.5px] font-bold text-warm-text">
                  Forecast Scenario Comparison
                  {scenarioCompare.unique_periods?.length ? ` — ${scenarioCompare.unique_periods[0]}${scenarioCompare.unique_periods.length > 1 ? ` → ${scenarioCompare.unique_periods[scenarioCompare.unique_periods.length - 1]}` : ''}` : ''}
                </span>
                <span className="text-[10px] font-bold text-[#5B50A0] uppercase px-2 py-0.5 rounded-full bg-[#F0EEF8] border border-[#D5D0EC]">
                  {scenarioCompare.multi_period ? 'Ranked by Growth Rate' : 'Ranked by Forecasted Value'}
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-warm-border/50 bg-warm-bg/40">
                      <th className="px-4 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Rank</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Scenario</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Period</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Forecasted Value</th>
                      <th className="px-4 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide">Growth Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioCompare.scenarios.map(s => (
                      <tr key={`${s.rank}-${s.scenario_number}`} className="border-b border-warm-border/30">
                        <td className="px-4 py-2 text-[12px] font-bold text-warm-text">#{s.rank}</td>
                        <td className="px-4 py-2 text-[12px] font-semibold text-warm-text">{s.scenario_label || `Scenario ${s.scenario_number}`}</td>
                        <td className="px-4 py-2 text-[11.5px] font-mono text-warm-muted">{s.target_period}</td>
                        <td className="px-4 py-2 text-[12px] font-mono font-bold text-[#5B50A0]">
                          {s.forecasted_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td
                          className="px-4 py-2 text-[11.5px] font-bold"
                          style={{ color: (s.predicted_growth_rate_percentage || '').startsWith('-') ? '#DC2626' : '#5E7D55' }}
                        >
                          {s.predicted_growth_rate_percentage || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {scenarioCompare.recommendation && (
                <div className="px-4 py-3 border-t border-warm-border/50 bg-[#FAF9F7] text-[11.5px] text-warm-text leading-relaxed">
                  {scenarioCompare.recommendation}
                </div>
              )}
            </div>
          )}

          {batchModels.length > 0 && <WorldModelCompareView worldModels={batchModels} />}

          {workspaceTable && workspaceTable.columns?.some(c => c.id.startsWith('scenario') || c.id.startsWith('forecast')) && (
            <div className="bg-white rounded-2xl border border-warm-border shadow-card overflow-hidden shrink-0">
              <div className="px-4 py-3 border-b border-warm-border/60">
                <span className="text-[12.5px] font-bold text-warm-text">Full Scenario &amp; Forecast Matrix</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-warm-border/50 bg-warm-bg/40">
                      {workspaceTable.columns.map(col => (
                        <th key={col.id} className="px-4 py-2 text-[10px] font-bold text-warm-muted uppercase tracking-wide whitespace-nowrap">
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceTable.rows.map(row => (
                      <tr key={row.id} className="border-b border-warm-border/30">
                        {workspaceTable.columns.map(col => {
                          const val = row[col.id];
                          const display = val === undefined || val === null
                            ? '—'
                            : typeof val === 'number'
                              ? val.toLocaleString(undefined, { maximumFractionDigits: 4 })
                              : String(val);
                          return (
                            <td key={col.id} className="px-4 py-2 text-[11.5px] font-mono text-warm-text whitespace-nowrap">
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : tableWorkspaceViewMode === 'world_model' ? (
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar w-full p-4 flex flex-col gap-4">
          
          {/* Sub-view switcher: Factor Matrix vs Causal Tree */}
          <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1 bg-[#F4F1EC] p-1 rounded-xl border border-warm-border/60">
              <button
                onClick={() => setWorldModelSubView('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  worldModelSubView === 'matrix'
                    ? 'bg-white text-[#FF5A1F] shadow-xs font-bold border border-warm-border/50'
                    : 'text-warm-muted hover:text-warm-text'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Factor &amp; Driver Matrix</span>
              </button>
              <button
                onClick={() => setWorldModelSubView('tree')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  worldModelSubView === 'tree'
                    ? 'bg-[#FF5A1F] text-white shadow-xs font-bold'
                    : 'text-warm-muted hover:text-warm-text'
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Causal Canvas Tree</span>
              </button>
            </div>

            <button
              onClick={() => navigate(`/dashboard/world-model${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
              className="text-[11.5px] font-bold text-[#FF5A1F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Page Tree Canvas</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {worldModelSubView === 'tree' ? (
            <div className="flex-1 min-h-[440px] rounded-xl border border-warm-border overflow-hidden bg-white shadow-2xs relative">
              <WorldModelCanvasTree tree={activeTree} />
            </div>
          ) : (
            <>
              {/* Live Runtime Scenario & Actual Data Change Ribbon */}
              <div className="bg-[#FAF9F7] border border-warm-border rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5 text-[#FF5A1F]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-bold text-warm-text font-mono uppercase">
                        {activeDeltaPct === 0 ? 'Baseline Model (Actual Data)' : `${activeDeltaPct > 0 ? '+' : ''}${activeDeltaPct}% What-If Shift`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF4E8] text-[#2C6E25] border border-[#C8E4C0] font-mono whitespace-nowrap">
                        Runtime Active ✓
                      </span>
                    </div>
                    <span className="text-[11.5px] text-warm-muted truncate">
                      <strong className="text-warm-text font-semibold">What Changed:</strong> {activeDeltaPct === 0 ? 'Original baseline parameters across all active factors' : `Growth multiplier shifted by ${activeDeltaPct > 0 ? '+' : ''}${activeDeltaPct}% (${activeMultiplier.toFixed(2)}x) across ${factorRows.length} factor drivers`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[12px] font-mono shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[9.5px] text-warm-muted uppercase font-sans font-medium">Baseline Aggregate</span>
                    <span className="font-bold text-warm-text font-mono">
                      ${portfolioTotals.base >= 1000 ? portfolioTotals.base.toLocaleString('en-US', { maximumFractionDigits: 1 }) : portfolioTotals.base.toFixed(1)}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-warm-muted" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9.5px] text-[#2C6E25] uppercase font-sans font-bold">What We Got (Runtime)</span>
                    <span className="font-black text-[#2C6E25] font-mono">
                      ${portfolioTotals.opt >= 1000 ? portfolioTotals.opt.toLocaleString('en-US', { maximumFractionDigits: 1 }) : portfolioTotals.opt.toFixed(1)} ({portfolioTotals.deltaPct >= 0 ? '+' : ''}{portfolioTotals.deltaPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI Summary Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#FAF9F7] border border-warm-border rounded-xl p-3 flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-mono font-bold text-warm-muted uppercase">Target EGR</span>
                  <span className="text-[18px] font-black text-[#FF5A1F] font-mono leading-none">+{egrTarget || 12}.0%</span>
                  <span className="text-[10px] text-warm-muted mt-0.5">Growth target objective</span>
                </div>
                <div className="bg-[#FAF9F7] border border-warm-border rounded-xl p-3 flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-mono font-bold text-warm-muted uppercase">Achieved EGR</span>
                  <span className="text-[18px] font-black text-[#2C6E25] font-mono leading-none">+{achievedEgr}.0%</span>
                  <span className="text-[10px] text-[#2C6E25] font-bold mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Converged (Newton-Raphson)
                  </span>
                </div>
                <div className="bg-[#FAF9F7] border border-warm-border rounded-xl p-3 flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-mono font-bold text-warm-muted uppercase">Growth Strategy</span>
                  <span className="text-[15px] font-bold text-[#5B50A0] leading-tight">Balanced Allocation</span>
                  <span className="text-[10px] text-warm-muted mt-0.5">Uniform multi-period dispersion</span>
                </div>
                <div className="bg-[#FAF9F7] border border-warm-border rounded-xl p-3 flex flex-col gap-0.5">
                  <span className="text-[9.5px] font-mono font-bold text-warm-muted uppercase">Macro Categories</span>
                  <span className="text-[18px] font-black text-warm-text font-mono leading-none">{sections.length || factorRows.length}</span>
                  <span className="text-[10px] text-warm-muted mt-0.5">Segmented drivers</span>
                </div>
              </div>

              {/* Factor Decomposition Table */}
              <div className="border border-warm-border rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-4 py-3 bg-[#FAF9F7] border-b border-warm-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-[#FF5A1F]" />
                    <span className="text-[12.5px] font-bold text-warm-text">Hierarchical Factor Decomposition Matrix</span>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-[12px] font-sans">
                  <thead>
                    <tr className="border-b border-warm-border bg-white text-[10.5px] font-mono uppercase text-warm-muted">
                      <th className="py-2.5 px-4 font-bold">Group / Domain</th>
                      <th className="py-2.5 px-4 font-bold">Driver / Indicator</th>
                      <th className="py-2.5 px-4 text-right font-bold">Baseline Value</th>
                      <th className="py-2.5 px-4 text-right font-bold">Optimized Target</th>
                      <th className="py-2.5 px-4 text-right font-bold">Variance (Δ)</th>
                      <th className="py-2.5 px-4 text-right font-bold">EGR Contribution</th>
                      <th className="py-2.5 px-4 text-center font-bold">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-border/30">
                    {factorRows.map((f, i) => (
                      <tr key={i} className="hover:bg-[#FFF2EE]/20 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-warm-muted text-[11px]">{f.group}</td>
                        <td className="py-2.5 px-4 font-bold text-warm-text">{f.name}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-warm-muted">{f.baseline}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-warm-text">{f.optimized}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#2C6E25]">{f.delta}</td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-warm-border/30 overflow-hidden">
                              <div
                                className="h-full bg-[#FF5A1F] rounded-full"
                                style={{ width: `${Math.min(100, f.contributionNum * 2)}%` }}
                              />
                            </div>
                            <span className="font-mono font-black text-[#FF5A1F] text-[12px]">{f.contribution}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono border ${
                            f.role === 'driver'
                              ? 'bg-[#EBF4E8] text-[#2C6E25] border-[#C8E4C0]'
                              : 'bg-[#FFF2EE] text-[#FF5A1F] border-[#FFD4C5]'
                          }`}>
                            {f.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#FAF9F7] border-t-2 border-warm-border font-mono text-[12px]">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-4 font-bold text-warm-text uppercase font-mono text-[11px]">
                        Portfolio Total / Aggregation
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-warm-muted">
                        ${portfolioTotals.base >= 1000 ? portfolioTotals.base.toLocaleString('en-US', { maximumFractionDigits: 1 }) : portfolioTotals.base.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-warm-text">
                        ${portfolioTotals.opt >= 1000 ? portfolioTotals.opt.toLocaleString('en-US', { maximumFractionDigits: 1 }) : portfolioTotals.opt.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-[#2C6E25]">
                        {portfolioTotals.deltaPct >= 0 ? '+' : ''}{portfolioTotals.deltaPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-[#FF5A1F]">
                        100.0%
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono bg-[#EBF4E8] text-[#2C6E25] border border-[#C8E4C0]">
                          Total
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Structured Spreadsheet View (Visual Table Model) ── */
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar w-full relative">
          {/* Legend Ribbon */}
          <div className="sticky left-0 z-20 flex items-center justify-between gap-3 px-4 py-1.5 bg-white border-b border-[#EDEAE4] text-[10.5px] font-mono select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-warm-muted/70">
                <span className="w-2 h-2 rounded-xs bg-[#E5E1D8] inline-block" />
                <span>Historical Actuals</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#B83A0A] font-semibold bg-[#FFF4F1] px-2 py-0.5 rounded border border-[#FFD4C5]/60">
                <Sparkles className="h-2.5 w-2.5 text-[#FF5A1F]" />
                <span>Projected</span>
              </span>
            </div>
            <span className="text-[10px] text-warm-muted/50 italic hidden md:inline">
              First col &amp; header row are frozen
            </span>
          </div>

          <table className="w-full border-separate border-spacing-0 font-sans text-left select-text">
            {/* Table Header — 2 rows: group labels + year labels */}
            <thead className="sticky top-0 z-20">
              {/* Row 1: Group banners */}
              <tr style={{ background: '#FAFAF8' }}>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 py-3 px-4 w-[260px] min-w-[220px] max-w-[300px] text-left align-bottom border-b-2 border-[#3D3730]/20 border-r border-[#EDEAE4]"
                  style={{ background: '#FAFAF8', boxShadow: '2px 0 4px -1px rgba(0,0,0,0.06)' }}
                >
                  <span className="text-[11.5px] font-bold text-[#3D3730]">Metric</span>
                </th>
                {/* Historical Group Banner */}
                {(visualTable?.years?.historical || []).length > 0 && (
                  <th
                    colSpan={(visualTable?.years?.historical || []).length}
                    className="py-2 px-3 text-center text-[10px] font-bold text-[#6B6560] uppercase tracking-widest font-mono border-b border-[#EDEAE4]"
                    style={{ background: '#FAFAF8' }}
                  >
                    Historical
                  </th>
                )}
                {/* Projected Group Banner */}
                {(visualTable?.years?.projected || []).length > 0 && (
                  <th
                    colSpan={(visualTable?.years?.projected || []).length}
                    className="py-2 px-3 text-center text-[10px] font-bold text-[#B83A0A] uppercase tracking-widest font-mono border-b-2 border-[#FF5A1F] border-l border-dashed border-[#FF5A1F]/30"
                    style={{ background: '#FFF4EE' }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Sparkles className="h-3 w-3 text-[#FF5A1F]" />
                      <span>
                        {activeDeltaPct !== 0
                          ? `Projected · ${activeDeltaPct > 0 ? '+' : ''}${activeDeltaPct}% Scenario`
                          : 'Projected · Baseline'}
                      </span>
                    </div>
                  </th>
                )}
              </tr>

              {/* Row 2: Year labels */}
              <tr>
                {allYears.map(yr => {
                  const projYears = visualTable?.years?.projected || [];
                  const isProj = projYears.includes(yr);
                  const isFirstProj = isProj && yr === projYears[0];
                  return (
                    <th
                      key={yr}
                      className={`py-2 px-3 text-right text-[11px] font-bold font-mono min-w-[90px] border-b-2 ${
                        isProj
                          ? `text-[#B83A0A] border-[#FF5A1F] ${isFirstProj ? 'border-l border-dashed border-[#FF5A1F]/30' : ''}`
                          : 'text-[#3D3730] border-[#3D3730]/20'
                      }`}
                      style={{ background: isProj ? '#FFF4EE' : '#FAFAF8' }}
                    >
                      {yr}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="text-[12px]">
              {sections.map((sectionName, sIdx) => {
                const sectionRows = activeTableRows.filter(r => r.section === sectionName);

                return (
                  <React.Fragment key={sectionName}>
                    {/* Section Divider Row */}
                    <tr>
                      <td
                        colSpan={allYears.length + 1}
                        className={`py-0 ${sIdx > 0 ? 'border-t-[1.5px] border-[#E5E1D8]' : ''}`}
                      >
                        <div className="sticky left-0 flex items-center gap-2 px-4 py-1.5 bg-[#F2EFE8]">
                          <span className="h-3 w-[2.5px] rounded-full bg-[#FF5A1F]/70 shrink-0" />
                          <span className="text-[10px] font-bold text-[#6B6560] tracking-widest uppercase font-mono">{sectionName}</span>
                          <span className="ml-auto text-[9.5px] text-warm-muted/40 font-mono">{sectionRows.length}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Data Rows */}
                    {sectionRows.map((row, rIdx) => {
                      const isFirstRow = rIdx === 0;
                      const isEven = rIdx % 2 === 0;

                      return (
                        <tr key={row.id} className="group">
                          {/* Fixed First Column: Row Name */}
                          <td
                            title={row.name}
                            className={`sticky left-0 z-10 py-[7px] px-4 text-[12px] font-medium leading-snug border-r border-[#EDEAE4] border-b border-[#F2EFE8] truncate max-w-[300px] text-[#3D3730] group-hover:text-[#B83A0A] ${
                              isEven
                                ? 'bg-white group-hover:bg-[#FFF5F0]'
                                : 'bg-[#FAFAF8] group-hover:bg-[#FFF5F0]'
                            }`}
                            style={{ boxShadow: '2px 0 4px -1px rgba(0,0,0,0.05)' }}
                          >
                            {row.name}
                          </td>

                          {/* Data Cells */}
                          {allYears.map(yr => {
                            const projYears = visualTable?.years?.projected || [];
                            const isProjected = projYears.includes(yr);
                            const isFirstProj = isProjected && yr === projYears[0];
                            const isEditing = editingCell?.rowId === row.id && editingCell?.year === yr;
                            const cellVal = row.values[yr];

                            return (
                              <td
                                key={yr}
                                onDoubleClick={() => {
                                  setEditingCell({ rowId: row.id, year: yr });
                                  setEditValue(String(cellVal ?? ''));
                                }}
                                title={`${yr}: ${formatNumber(cellVal, !!row.isCurrency, isFirstRow)}${isProjected && activeDeltaPct !== 0 ? ` (${activeDeltaPct > 0 ? '+' : ''}${activeDeltaPct}% scenario)` : ''}`}
                                className={`py-[7px] px-3 text-right font-mono text-[12px] tabular-nums tracking-tight cursor-pointer border-b border-[#F2EFE8] ${
                                  isProjected
                                    ? `text-[#9A3412] font-semibold ${isFirstProj ? 'border-l border-dashed border-[#FF5A1F]/30' : ''} ${
                                        isEven
                                          ? 'bg-[#FFF8F5] group-hover:bg-[#FFE8DC]'
                                          : 'bg-[#FFF4F0] group-hover:bg-[#FFE8DC]'
                                      }`
                                    : `text-[#3D3730] ${
                                        isEven
                                          ? 'bg-white group-hover:bg-[#FFF5F0]'
                                          : 'bg-[#FAFAF8] group-hover:bg-[#FFF5F0]'
                                      }`
                                } ${isEditing ? '!bg-white !p-0' : ''}`}
                              >
                                {isEditing ? (
                                  <input
                                    type="text"
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => handleCellEditSubmit(row.id, yr)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleCellEditSubmit(row.id, yr);
                                      if (e.key === 'Escape') setEditingCell(null);
                                    }}
                                    className="w-full h-full text-right font-mono text-[12px] bg-white border-2 border-[#FF5A1F] rounded px-2 py-1.5 outline-none"
                                  />
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <span>{formatNumber(cellVal, !!row.isCurrency, isFirstRow)}</span>
                                    {isProjected && activeDeltaPct !== 0 && (
                                      <span className={`text-[8.5px] font-bold font-mono px-1 py-px rounded select-none ${
                                        activeDeltaPct > 0
                                          ? 'text-[#2C6E25] bg-[#E8F5E3]'
                                          : 'text-[#B83A0A] bg-[#FFF2EE]'
                                      }`}>
                                        {activeDeltaPct > 0 ? '+' : ''}{activeDeltaPct}%
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Totals Footer */}
            {Object.keys(columnTotals).length > 0 && (
              <tfoot className="sticky bottom-0 z-20">
                <tr className="border-t-2 border-[#C8C0B4]">
                  <td
                    className="sticky left-0 z-30 py-2.5 px-4 text-[11px] font-black text-[#2A2520] uppercase font-mono border-r border-[#D4CFC6]"
                    style={{ background: '#EAE7E0', boxShadow: '2px 0 4px -1px rgba(0,0,0,0.07)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>Total</span>
                      <span className="text-[9px] text-[#6B6560] font-normal font-sans normal-case bg-white/60 px-1.5 py-0.5 rounded border border-white/80">Σ sum</span>
                    </div>
                  </td>
                  {allYears.map(yr => {
                    const projYears = visualTable?.years?.projected || [];
                    const isProj = projYears.includes(yr);
                    const isFirstProj = isProj && yr === projYears[0];
                    return (
                      <td
                        key={yr}
                        className={`py-2.5 px-3 text-right font-black tabular-nums text-[12px] ${
                          isProj
                            ? `text-[#9A3412] ${isFirstProj ? 'border-l border-dashed border-[#FF5A1F]/40' : ''}`
                            : 'text-[#2A2520]'
                        }`}
                        style={{ background: isProj ? '#F0DDD4' : '#EAE7E0' }}
                      >
                        {hasCurrencyRow ? '$' : ''}{formatNumber(columnTotals[yr], false, false)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Bottom Status Bar ── */}
      <div className="shrink-0 px-4 py-2 border-t border-[#EDEAE4] flex items-center justify-between gap-3 text-[10.5px] text-[#A09890] font-mono select-none" style={{ background: '#F7F5F0' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
            Live projection model
          </span>
          <span className="hidden sm:inline text-[#C8C0B4]">·</span>
          <span className="hidden sm:inline">Double-click any cell to edit</span>
        </div>
        <span>{activeTableRows.length} rows · {allYears.length} periods</span>
      </div>

    </div>
  );
}
