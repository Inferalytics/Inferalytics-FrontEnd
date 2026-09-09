import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, ArrowRight, Loader2, AlertCircle, CheckCircle2, Sparkles, TrendingUp, DollarSign, Activity, Search, ChevronRight } from 'lucide-react';
import api from '../api';
import type { SessionBatch } from '../types/api';
import { useStore } from '../store/useStore';

function formatDate(iso?: string) {
  if (!iso) return 'Today';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

// Curated starter templates with executive data models
const STARTER_WORKSPACES = [
  {
    id: 'starter-healthcare',
    name: 'Healthcare Macroeconomic Outlook (2020–2030)',
    desc: 'CMS & BEA Historical Actuals, Personal Healthcare Projections, GDP Deflators & Price Indices',
    icon: Activity,
    badge: 'CMS / BEA Baseline',
    highlight: '$7.36T Projections',
  },
  {
    id: 'starter-growth',
    name: 'SaaS Revenue Growth & 12% Expansion Model',
    desc: 'Total ARR scaling, Enterprise Tier Expansion, Net Dollar Retention (NDR) & Churn Reduction',
    icon: TrendingUp,
    badge: 'Growth Model',
    highlight: '12% Annual Target',
  },
  {
    id: 'starter-cost',
    name: 'Operating Cost Optimization & Margin Structure',
    desc: 'OpEx discipline, R&D vs S&M Allocation, Gross Margin % Expansion & Free Cash Flow',
    icon: DollarSign,
    badge: 'Cost Discipline',
    highlight: '85.2% Margin Goal',
  },
  {
    id: 'starter-pricing',
    name: 'Price Elasticity & Inflation Sensitivity',
    desc: 'Average Selling Price (ASP), Contract Volume Retention, Price Sensitivity & CPI-U Deflator',
    icon: Sparkles,
    badge: 'Price Sensitivity',
    highlight: '-0.62 Elasticity',
  },
];

export default function BatchSelectionPage() {
  const navigate = useNavigate();
  const { createBatchApi, switchBatchApi, batches: storeBatches, setVisualTable, resetTableData } = useStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<SessionBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  // Create-new-batch state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Selecting state
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const session = await api.getBatchSession();
        const sessionBatches = session.batches ?? [];
        
        // Merge with store batches if any exist
        const mergedMap = new Map<string, SessionBatch>();
        sessionBatches.forEach(b => mergedMap.set(b.batch_id, b));
        
        storeBatches.forEach(b => {
          if (!mergedMap.has(b.id)) {
            mergedMap.set(b.id, {
              batch_id: b.id,
              batch_name: b.name,
              created_at: new Date().toISOString(),
              is_active: b.status === 'active',
            });
          }
        });

        const finalBatches = Array.from(mergedMap.values());
        setBatches(finalBatches);
        setActiveBatchId(session.active_batch?.batch_id ?? storeBatches[0]?.id ?? null);
      } catch (e) {
        console.warn('getBatchSession note, using store batches:', e);
        if (storeBatches.length > 0) {
          setBatches(storeBatches.map(b => ({
            batch_id: b.id,
            batch_name: b.name,
            created_at: new Date().toISOString(),
            is_active: b.status === 'active',
          })));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [storeBatches]);

  const handleSelectBatch = async (batchId: string) => {
    setSelecting(batchId);
    try {
      if (switchBatchApi) {
        await switchBatchApi(batchId);
      }
      navigate(`/dashboard/conversation?batch=${batchId}`);
    } catch {
      navigate(`/dashboard/conversation?batch=${batchId}`);
    }
  };

  const handleSelectStarter = async (starter: typeof STARTER_WORKSPACES[0]) => {
    setSelecting(starter.id);
    try {
      let createdId = '';
      if (createBatchApi) {
        createdId = await createBatchApi(starter.name);
      } else {
        const res = await api.createBatch(starter.name);
        createdId = res.data.batch_id;
        await api.switchBatch(createdId);
      }

      // Configure starter visual table
      if (starter.id === 'starter-healthcare') {
        resetTableData();
      } else if (starter.id === 'starter-growth') {
        setVisualTable({
          years: {
            historical: ['2020', '2021', '2022'],
            projected: ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030']
          },
          growthMultiplier: 1.12,
          activeScenarioName: '12% Annual Growth Trajectory (2020–2030)',
          rows: [
            {
              id: 'arr_total',
              name: 'Total Annual Recurring Revenue (ARR)',
              section: 'Revenue & Bookings ($M)',
              unit: '$M',
              isCurrency: true,
              values: {
                '2020': 42.5, '2021': 54.8, '2022': 68.2, '2023': 76.4,
                '2024': 85.6, '2025': 95.8, '2026': 107.3, '2027': 120.2,
                '2028': 134.6, '2029': 150.8, '2030': 168.9
              }
            },
            {
              id: 'arr_ent',
              name: 'Enterprise Tier ARR',
              section: 'Revenue & Bookings ($M)',
              unit: '$M',
              isCurrency: true,
              values: {
                '2020': 24.1, '2021': 32.5, '2022': 41.0, '2023': 46.8,
                '2024': 53.4, '2025': 60.8, '2026': 69.4, '2027': 79.1,
                '2028': 90.2, '2029': 102.8, '2030': 117.2
              }
            },
            {
              id: 'ndr',
              name: 'Net Dollar Retention (NDR) %',
              section: 'Key Performance Ratios',
              unit: '%',
              isCurrency: false,
              values: {
                '2020': 114.2, '2021': 116.5, '2022': 118.0, '2023': 119.5,
                '2024': 121.0, '2025': 122.4, '2026': 123.8, '2027': 125.0,
                '2028': 126.2, '2029': 127.5, '2030': 128.8
              }
            },
            {
              id: 'churn',
              name: 'Gross Logo Churn Rate %',
              section: 'Key Performance Ratios',
              unit: '%',
              isCurrency: false,
              values: {
                '2020': 6.8, '2021': 6.2, '2022': 5.8, '2023': 5.4,
                '2024': 5.0, '2025': 4.7, '2026': 4.4, '2027': 4.2,
                '2028': 4.0, '2029': 3.8, '2030': 3.6
              }
            }
          ]
        });
      } else if (starter.id === 'starter-cost') {
        setVisualTable({
          years: {
            historical: ['2020', '2021', '2022'],
            projected: ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030']
          },
          growthMultiplier: 0.95,
          activeScenarioName: 'Operating Cost Optimization (2020–2030)',
          rows: [
            {
              id: 'opex',
              name: 'Total Operating Expenses (OpEx)',
              section: 'Operating Expenses ($M)',
              unit: '$M',
              isCurrency: true,
              values: {
                '2020': 38.2, '2021': 46.5, '2022': 55.4, '2023': 52.6,
                '2024': 49.8, '2025': 47.3, '2026': 45.0, '2027': 43.2,
                '2028': 41.5, '2029': 40.0, '2030': 38.6
              }
            },
            {
              id: 'gross_margin',
              name: 'Gross Margin %',
              section: 'Margin & Profitability',
              unit: '%',
              isCurrency: false,
              values: {
                '2020': 71.4, '2021': 73.0, '2022': 74.8, '2023': 76.5,
                '2024': 78.2, '2025': 79.8, '2026': 81.2, '2027': 82.5,
                '2028': 83.6, '2029': 84.5, '2030': 85.2
              }
            }
          ]
        });
      } else if (starter.id === 'starter-pricing') {
        setVisualTable({
          years: {
            historical: ['2020', '2021', '2022'],
            projected: ['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030']
          },
          growthMultiplier: 1.05,
          activeScenarioName: 'Price Elasticity & Inflation Outlook (2020–2030)',
          rows: [
            {
              id: 'asp',
              name: 'Average Selling Price (ASP) ($/mo)',
              section: 'Pricing & Unit Metrics',
              unit: '$',
              isCurrency: true,
              values: {
                '2020': 450.0, '2021': 480.0, '2022': 520.0, '2023': 565.0,
                '2024': 610.0, '2025': 655.0, '2026': 705.0, '2027': 760.0,
                '2028': 815.0, '2029': 875.0, '2030': 940.0
              }
            },
            {
              id: 'elasticity',
              name: 'Price Elasticity Coefficient (e)',
              section: 'Elasticity & Sensitivity',
              unit: 'Index',
              isCurrency: false,
              values: {
                '2020': -0.72, '2021': -0.68, '2022': -0.65, '2023': -0.62,
                '2024': -0.60, '2025': -0.58, '2026': -0.56, '2027': -0.55,
                '2028': -0.54, '2029': -0.52, '2030': -0.51
              }
            }
          ]
        });
      }

      navigate(`/dashboard/conversation${createdId ? `?batch=${createdId}` : ''}`);
    } catch {
      navigate('/dashboard/conversation');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBatchName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError('');
    try {
      const createdId = await createBatchApi!(name);
      navigate(`/dashboard/conversation?batch=${createdId}`);
    } catch {
      setCreateError('Failed to create workspace. Please try again.');
      setCreating(false);
    }
  };

  const filteredBatches = batches.filter((b) =>
    b.batch_name.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-warm-gradient font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF5A1F]" />
          <span className="text-[13.5px] text-warm-muted font-medium">Loading decision workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-warm-gradient px-4 py-10 sm:px-8 flex flex-col items-center justify-start font-sans select-none overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-4xl flex flex-col gap-8 animate-fade-in">

        {/* ── Brand Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-warm-border/60">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <img src="/logo-side.png" alt="Inferalytics" className="h-8 sm:h-9 w-auto object-contain" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-text tracking-tight mt-2">
              Decision Workspaces
            </h1>
            <p className="text-[13.5px] text-warm-muted leading-relaxed max-w-xl">
              Launch a pre-configured decision template, reopen an active batch, or create a custom model.
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] hover:opacity-90 text-white text-[13px] font-bold shadow-xs cursor-pointer transition-all shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>{showCreateForm ? 'Close Form' : 'New Custom Workspace'}</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Create New Custom Form (Collapsible) ── */}
        {showCreateForm && (
          <form onSubmit={handleCreateBatch} className="flex flex-col gap-4 border border-warm-border bg-white rounded-2xl p-6 shadow-card animate-float-up">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-[#FF5A1F]" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-warm-text">Create Custom Workspace</h3>
                <p className="text-[12px] text-warm-muted">Enter a project name to start an isolated decision batch.</p>
              </div>
            </div>

            <input
              type="text"
              placeholder="e.g. Healthcare Analysis 2025–2030 or Q4 Pricing Model"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              autoFocus
              disabled={creating}
              className="w-full text-[13.5px] border border-warm-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A1F]/30 focus:border-[#FF5A1F] placeholder:text-warm-muted/60 disabled:opacity-60 font-sans"
            />

            {createError && (
              <p className="text-[12px] text-red-500 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {createError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setNewBatchName(''); setCreateError(''); }}
                disabled={creating}
                className="flex-1 text-[13px] font-semibold text-warm-text border border-warm-border rounded-xl py-2.5 hover:bg-warm-bg transition-colors disabled:opacity-60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newBatchName.trim()}
                className="flex-1 flex items-center justify-center gap-2 text-[13px] font-bold text-white bg-[#FF5A1F] rounded-xl py-2.5 hover:opacity-90 shadow-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {creating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Create &amp; Open Workspace</>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── Section 1: Pre-Configured Starter Templates ── */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-bold text-warm-muted uppercase tracking-wider font-mono">
              Pre-Configured Decision Templates
            </span>
            <span className="text-[11px] text-warm-muted">Instant launch with real structured data</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STARTER_WORKSPACES.map((starter) => {
              const Icon = starter.icon;
              const isSelecting = selecting === starter.id;
              return (
                <div
                  key={starter.id}
                  onClick={() => handleSelectStarter(starter)}
                  className={`flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-warm-border bg-white hover:border-[#FF5A1F] hover:shadow-card hover:-translate-y-0.5 text-left transition-all duration-200 cursor-pointer group ${
                    selecting && !isSelecting ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="h-9 w-9 rounded-xl bg-[#FFF2EE] border border-[#FFD4C5] flex items-center justify-center shadow-2xs group-hover:bg-[#FF5A1F] transition-colors">
                        <Icon className="h-4 w-4 text-[#FF5A1F] group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#FF5A1F] bg-[#FFF2EE] px-2.5 py-0.5 rounded-full border border-[#FFD4C5]">
                        {starter.badge}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-warm-text group-hover:text-[#FF5A1F] transition-colors leading-snug">
                      {starter.name}
                    </h3>
                    <p className="text-[12.5px] text-warm-muted mt-1.5 leading-relaxed">
                      {starter.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-warm-border/50 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-warm-muted">
                      {starter.highlight}
                    </span>
                    <span className="text-[12px] font-bold text-[#FF5A1F] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      {isSelecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Launch Model</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 2: Existing Batches / Workspaces ── */}
        {batches.length > 0 && (
          <div className="flex flex-col gap-3.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold text-warm-muted uppercase tracking-wider font-mono">
                Existing Custom Batches ({batches.length})
              </span>
              {batches.length > 3 && (
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-warm-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search workspaces..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-[12px] border border-warm-border bg-white rounded-xl outline-none focus:border-[#FF5A1F] w-48 font-sans placeholder:text-warm-muted/60"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredBatches.map((batch) => {
                const isActive = batch.batch_id === activeBatchId;
                const isSelecting = selecting === batch.batch_id;
                return (
                  <div
                    key={batch.batch_id}
                    onClick={() => handleSelectBatch(batch.batch_id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                      isActive
                        ? 'border-[#FF5A1F] bg-[#FFF2EE] ring-1 ring-[#FF5A1F]/30'
                        : 'border-warm-border bg-white hover:border-[#FFD4C5] hover:bg-[#FAF9F7]'
                    } ${selecting && !isSelecting ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-xl bg-warm-bg flex items-center justify-center shrink-0">
                        <FolderOpen className="h-4 w-4 text-[#FF5A1F]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] font-bold text-warm-text truncate">{batch.batch_name}</span>
                          {isActive && (
                            <span className="text-[9.5px] font-bold text-[#FF5A1F] bg-[#FFD4C5] px-1.5 py-0.2 rounded-full shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-warm-muted font-mono">{formatDate(batch.created_at)}</span>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isSelecting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#FF5A1F]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-warm-muted" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
