import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, ChevronRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api';
import type { SessionBatch } from '../types/api';
import { useStore } from '../store/useStore';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BatchSelectionPage() {
  const navigate = useNavigate();
  const { createBatchApi, switchBatchApi } = useStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [batches, setBatches] = useState<SessionBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  // Create-new-batch state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Selecting an existing batch
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const session = await api.getBatchSession();
        setRequiresOnboarding(session.requires_onboarding);
        setBatches(session.batches ?? []);
        setActiveBatchId(session.active_batch?.batch_id ?? null);
        if (session.requires_onboarding) {
          setShowCreateForm(true);
        }
      } catch (e) {
        console.warn('getBatchSession failed, falling back to batch list:', e);
        // Fallback: try the regular list endpoint
        try {
          const listRes = await api.listBatches();
          const items = listRes?.data?.batches ?? [];
          if (items.length > 0) {
            setBatches(items.map((b) => ({
              batch_id: b.batch_id,
              batch_name: b.batch_name,
              created_at: b.created_at,
              is_active: false,
            })));
          } else {
            setRequiresOnboarding(true);
            setShowCreateForm(true);
          }
        } catch {
          // Both endpoints failed — show create form as fallback
          setRequiresOnboarding(true);
          setShowCreateForm(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelectBatch = async (batchId: string) => {
    setSelecting(batchId);
    try {
      await switchBatchApi(batchId);
      navigate('/dashboard/conversation');
    } catch {
      setError('Failed to switch workspace. Please try again.');
      setSelecting(null);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBatchName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError('');
    try {
      await createBatchApi(name);
      navigate('/dashboard/conversation');
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
      <div className="flex h-screen w-screen items-center justify-center bg-warm-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#FF5A1F]" />
          <span className="text-sm text-zinc-500">Loading workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-warm-bg p-4">
      <div className="w-full max-w-[520px] flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <img src="/logo-side.png" alt="Inferalytics" className="h-7 w-auto object-contain mb-2" />
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            {requiresOnboarding ? 'Create your first workspace' : 'Select a workspace'}
          </h1>
          <p className="text-sm text-zinc-500">
            {requiresOnboarding
              ? 'Workspaces keep your data, optimizations, and scenarios organized.'
              : 'Choose an existing workspace or create a new one to continue.'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Existing batches list — only when user has batches */}
        {!requiresOnboarding && batches.length > 0 && (
          <div className="flex flex-col gap-3">
            {batches.length > 10 && (
              <input
                type="text"
                placeholder="Search workspaces..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full text-sm border border-zinc-200 bg-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-zinc-400"
              />
            )}

            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-0.5">
              {filteredBatches.map((batch) => {
                const isActive = batch.batch_id === activeBatchId;
                const isSelecting = selecting === batch.batch_id;
                return (
                  <button
                    key={batch.batch_id}
                    onClick={() => handleSelectBatch(batch.batch_id)}
                    disabled={!!selecting || creating}
                    className={[
                      'flex items-center gap-3 w-full text-left rounded-xl border px-4 py-3.5 transition-all',
                      isActive
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
                      (!!selecting || creating) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-800 truncate">{batch.batch_name}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 mt-0.5 block">Created {formatDate(batch.created_at)}</span>
                    </div>
                    {isSelecting
                      ? <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                    }
                  </button>
                );
              })}
            </div>

            {filteredBatches.length === 0 && filter && (
              <p className="text-sm text-zinc-400 text-center py-4">No workspaces match "{filter}"</p>
            )}
          </div>
        )}

        {/* Divider when both list and create are shown */}
        {!requiresOnboarding && batches.length > 0 && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={!!selecting}
            className="flex items-center gap-2 justify-center w-full border border-dashed border-zinc-300 rounded-xl py-3 text-sm font-semibold text-zinc-500 hover:border-primary hover:text-primary transition-colors bg-transparent"
          >
            <Plus className="h-4 w-4" />
            Create new workspace
          </button>
        )}

        {/* Create form */}
        {showCreateForm && (
          <form onSubmit={handleCreateBatch} className="flex flex-col gap-3 border border-zinc-200 bg-white rounded-xl p-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-zinc-800">New workspace</span>
            </div>

            <input
              type="text"
              placeholder="e.g. Healthcare Analysis Q4"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              autoFocus
              disabled={creating}
              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-zinc-400 disabled:opacity-60"
            />

            {createError && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {createError}
              </p>
            )}

            <div className="flex gap-2">
              {!requiresOnboarding && (
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setNewBatchName(''); setCreateError(''); }}
                  disabled={creating}
                  className="flex-1 text-sm font-semibold text-zinc-600 border border-zinc-200 rounded-lg py-2.5 hover:bg-zinc-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={creating || !newBatchName.trim()}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-white bg-primary rounded-lg py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Create &amp; Continue</>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
