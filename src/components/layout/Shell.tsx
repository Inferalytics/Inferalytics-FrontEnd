import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import Header from './Header';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';

// Sync dictionary mapping nested route slugs to spec screens
const routeTabMap: Record<string, number> = {
  talk: 1,
  setup: 2,
  build: 3,
  batch: 4,
  optimise: 5,
  results: 6,
  compare: 7
};

export default function Shell() {
  const { tab, subtab } = useParams<{ tab: string; subtab?: string }>();
  const navigate = useNavigate();
  const { 
    setScreen, 
    leftSidebarOpen, 
    setLeftSidebarOpen, 
    rightSidebarOpen, 
    setRightSidebarOpen 
  } = useStore();

  useEffect(() => {
    // Automatically synchronize browser route parameters with Zustand store
    if (tab && routeTabMap[tab]) {
      setScreen(routeTabMap[tab]);
    }
  }, [tab, setScreen]);

  // Canonical redirection for nested views that have default subtabs
  useEffect(() => {
    if (tab === 'setup' && !subtab) {
      navigate('/dashboard/setup/general', { replace: true });
    } else if (tab === 'build' && !subtab) {
      navigate('/dashboard/build/dimensions', { replace: true });
    } else if (tab === 'results' && !subtab) {
      navigate('/dashboard/results/summary', { replace: true });
    }
  }, [tab, subtab, navigate]);

  // Close drawers when navigating between tabs
  useEffect(() => {
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);
  }, [tab, subtab, setLeftSidebarOpen, setRightSidebarOpen]);

  // Hide side panels on screen 01 (talk) to maintain full bleed conversation grid
  const showPanels = tab !== 'talk';

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
