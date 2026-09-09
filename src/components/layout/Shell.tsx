import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Header from './Header';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import api from '../../api';

// Sync dictionary mapping nested route slugs to spec screens
const routeTabMap: Record<string, number> = {
  conversation: 1,
  dimensions: 2,
  scenarios: 3,
  // legacy backward compatibility routes
  blueprint: 2,
  'ecr-build': 2,
  'ecr-batch': 2,
  'ips-engine': 3,
  workspace: 3,
  forecast: 3,
  learning: 3,
  'world-model': 3,
};

export default function Shell() {
  const { tab, subtab } = useParams<{ tab: string; subtab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    setScreen,
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    activeBatchId,
    setActiveBatch,
    batches
  } = useStore();

  // ── Batch gate: redirect to /batch-select if no batch is active ──
  const [batchChecked, setBatchChecked] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Tracks the last URL batch id this effect has already reconciled, so an
  // in-app switch (Header dropdown → setActiveBatch) isn't immediately fought
  // by this effect re-reading the not-yet-updated URL and reverting back —
  // that race is what caused the flicker on batch switch/create.
  const lastSyncedUrlBatch = useRef<string | null>(null);

  useEffect(() => {
    const urlBatchId = searchParams.get('batch');

    // Only pull the URL's batch into the store on a genuine external URL
    // change (initial load, pasted link, back/forward) — not one we've
    // already reconciled.
    if (urlBatchId && urlBatchId !== activeBatchId && urlBatchId !== lastSyncedUrlBatch.current) {
      lastSyncedUrlBatch.current = urlBatchId;
      setActiveBatch(urlBatchId);
      setBatchChecked(true);
      return;
    }

    // If Zustand already has an active batch, mark checked
    if (activeBatchId) {
      lastSyncedUrlBatch.current = activeBatchId;
      setBatchChecked(true);
      return;
    }

    // Neither state nor URL has a batch — ask the backend
    void (async () => {
      try {
        const session = await api.getBatchSession();
        if (session.active_batch) {
          setActiveBatch(session.active_batch.batch_id);
          setBatchChecked(true);
        } else {
          setShouldRedirect(true);
        }
      } catch {
        setShouldRedirect(true);
      }
    })();
  }, [activeBatchId, searchParams, setActiveBatch]);

  // Keep URL query param synced whenever activeBatchId changes
  useEffect(() => {
    if (batchChecked && activeBatchId && searchParams.get('batch') !== activeBatchId) {
      setSearchParams(
        prev => {
          const newParams = new URLSearchParams(prev);
          newParams.set('batch', activeBatchId);
          return newParams;
        },
        { replace: true }
      );
    }
  }, [activeBatchId, batchChecked, searchParams, setSearchParams]);

  useEffect(() => {
    if (tab && routeTabMap[tab]) {
      setScreen(routeTabMap[tab]);
    }
  }, [tab, setScreen]);

  // Canonical redirection for nested views that have default subtabs
  useEffect(() => {
    if (!batchChecked) return;
    const batchQuery = activeBatchId ? `?batch=${activeBatchId}` : '';
    if (tab === 'blueprint' && !subtab) {
      navigate(`/dashboard/blueprint/general${batchQuery}`, { replace: true });
    } else if (tab === 'ecr-build' && !subtab) {
      navigate(`/dashboard/ecr-build/dimensions${batchQuery}`, { replace: true });
    } else if (tab === 'workspace' && !subtab) {
      navigate(`/dashboard/workspace/summary${batchQuery}`, { replace: true });
    }
  }, [tab, subtab, navigate, activeBatchId, batchChecked]);

  // Close mobile drawers on mount and when navigating between tabs on small viewports
  useEffect(() => {
    const handleCheckMobile = () => {
      if (window.innerWidth < 1024) {
        setLeftSidebarOpen(false);
        setRightSidebarOpen(false);
      }
    };
    handleCheckMobile();
  }, [tab, subtab, setLeftSidebarOpen, setRightSidebarOpen]);

  // ── Conditional renders (after all hooks) ──
  if (shouldRedirect) {
    return <Navigate to="/batch-select" replace />;
  }

  if (!batchChecked) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-warm-gradient">
        <div className="animate-spin h-8 w-8 border-2 border-brand-indigo border-t-transparent rounded-full" />
      </div>
    );
  }

  const showPanels = tab !== 'conversation' && tab !== undefined && tab !== '';

  return (
    <div className="flex flex-col h-screen w-full overflow-x-hidden overflow-y-hidden bg-warm-gradient select-none">
      {/* Header */}
      <Header />

      {/* Content Columns */}
      <div className="flex flex-1 w-full min-h-0 overflow-hidden relative">
        {/* Backdrop for Left Sidebar */}
        {showPanels && leftSidebarOpen && (
          <div
            onClick={() => setLeftSidebarOpen(false)}
            className="fixed inset-0 bg-[#2C2B29]/15 backdrop-blur-[1px] z-30 lg:hidden"
          />
        )}

        {/* Backdrop for Right Sidebar */}
        {showPanels && rightSidebarOpen && (
          <div
            onClick={() => setRightSidebarOpen(false)}
            className="fixed inset-0 bg-[#2C2B29]/15 backdrop-blur-[1px] z-30 lg:hidden"
          />
        )}

        {showPanels && <LeftPanel />}
        <CenterPanel />
        {showPanels && <RightPanel />}
      </div>
    </div>
  );
}
