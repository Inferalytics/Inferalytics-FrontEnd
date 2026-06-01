import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import TalkPanel from './panels/TalkPanel';
import SetupPanel from './panels/SetupPanel';
import BuildPanel from './panels/BuildPanel';
import BatchPanel from './panels/BatchPanel';
import OptimisePanel from './panels/OptimisePanel';
import ResultsPanel from './panels/ResultsPanel';
import ComparePanel from './panels/ComparePanel';

export default function CenterPanel() {
  const { screen } = useStore();
  const { tab } = useParams<{ tab: string }>();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="flex-1 h-[calc(100vh-48px)] relative bg-warm-gradient overflow-auto select-none no-scrollbar">
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-brand-indigo text-white font-sans text-[12.5px] px-4 py-2.5 rounded-xl shadow-lg border border-lavender/30 flex items-center gap-2 animate-float-up">
          <Check className="h-4 w-4 text-peach" />
          {toastMsg}
        </div>
      )}

      <div className="relative z-10 p-6 min-h-full flex flex-col justify-between">
        {screen === 1 && <TalkPanel triggerToast={triggerToast} />}
        {(tab === 'setup' || screen === 2) && <SetupPanel />}
        {(tab === 'build' || screen === 3) && <BuildPanel />}
        {screen === 4 && <BatchPanel />}
        {screen === 5 && <OptimisePanel triggerToast={triggerToast} />}
        {(tab === 'results' || screen === 6) && <ResultsPanel />}
        {screen === 7 && <ComparePanel triggerToast={triggerToast} />}
      </div>
    </div>
  );
}
