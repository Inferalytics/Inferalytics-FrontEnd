import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Header from './Header';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';

// Sync dictionary mapping nested route slugs to spec screens
const routeTabMap: Record<string, number> = {
  conversation: 1,
  blueprint: 2,
  'ecr-build': 3,
  'ecr-batch': 4,
  'ips-engine': 5,
  workspace: 6,
  learning: 7
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

  // 1. Sync batch query param from URL on page load / refresh
  useEffect(() => {
    const urlBatchId = searchParams.get('batch');
    if (urlBatchId && urlBatchId !== activeBatchId) {
      setActiveBatch(urlBatchId);
    }
  }, [searchParams]);

  // 2. Keep URL query param synced whenever activeBatchId changes
  useEffect(() => {
    if (activeBatchId && searchParams.get('batch') !== activeBatchId) {
      setSearchParams(
        prev => {
          const newParams = new URLSearchParams(prev);
          newParams.set('batch', activeBatchId);
          return newParams;
        },
        { replace: true }
      );
    }
  }, [activeBatchId, searchParams, setSearchParams]);

  useEffect(() => {
    // Automatically synchronize browser route parameters with Zustand store
    if (tab && routeTabMap[tab]) {
      setScreen(routeTabMap[tab]);
    }
  }, [tab, setScreen]);

  // Canonical redirection for nested views that have default subtabs
  useEffect(() => {
    const batchQuery = activeBatchId ? `?batch=${activeBatchId}` : '';
    if (tab === 'blueprint' && !subtab) {
      navigate(`/dashboard/blueprint/general${batchQuery}`, { replace: true });
    } else if (tab === 'ecr-build' && !subtab) {
      navigate(`/dashboard/ecr-build/dimensions${batchQuery}`, { replace: true });
    } else if (tab === 'workspace' && !subtab) {
      navigate(`/dashboard/workspace/summary${batchQuery}`, { replace: true });
    }
  }, [tab, subtab, navigate, activeBatchId]);

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

  // Hide side panels on screen 01 (talk) to maintain full bleed conversation grid
  const showPanels = tab !== 'conversation';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-warm-gradient select-none">
      {/* 48px Header */}
      <Header />
      
      {/* Content Columns */}
      <div className="flex flex-1 w-full h-[calc(100vh-48px)] overflow-hidden relative">
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
