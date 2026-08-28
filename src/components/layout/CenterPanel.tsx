import React, { useState } from 'react';
import { Check, GitCompare, TrendingUp } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import TalkPanel from './panels/TalkPanel';
import SetupPanel from './panels/SetupPanel';
import BuildPanel from './panels/BuildPanel';
import BatchPanel from './panels/BatchPanel';
import OptimisePanel from './panels/OptimisePanel';
import WorldModelCompareView from '../chat/WorldModelCompareView';
import WorldModelPage from './panels/WorldModelPage';
import ForecastPage from './panels/ForecastPage';

function LearningTab() {
  const { worldModels, activeBatchId } = useStore();
  const navigate = useNavigate();

  // Only show scenarios from the active batch
  const batchModels = activeBatchId
    ? worldModels.filter(wm => wm.batch_id === activeBatchId)
    : worldModels;

  if (batchModels.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-brand-indigo/10 flex items-center justify-center">
          <GitCompare className="h-7 w-7 text-brand-indigo/40" />
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-warm-text mb-1">No Scenarios to Compare Yet</h2>
          <p className="text-[13px] text-warm-muted max-w-sm leading-relaxed">
            Run at least two optimisation scenarios. Ask the AI to "compare scenarios" and
            the full comparison will appear here automatically.
          </p>
        </div>
        <button
          onClick={() => navigate(`/dashboard/world-model${activeBatchId ? `?batch=${activeBatchId}` : ''}`)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-indigo text-white text-[12px] font-bold cursor-pointer hover:opacity-90 transition-opacity"
        >
          <TrendingUp className="h-4 w-4" />
          Go to World Model
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-brand-indigo/10 flex items-center justify-center shrink-0">
          <GitCompare className="h-5 w-5 text-brand-indigo" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-warm-text leading-tight">Scenario Comparison</h1>
          <p className="text-[12px] text-warm-muted">
            {batchModels.length} scenarios · Strategy breakdown & performance
          </p>
        </div>
      </div>
      <WorldModelCompareView worldModels={batchModels} />
    </div>
  );
}

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
        {(!tab || tab === 'conversation') && <TalkPanel triggerToast={triggerToast} />}
        {tab === 'blueprint' && <SetupPanel />}
        {tab === 'ecr-build' && <BuildPanel />}
        {tab === 'ecr-batch' && <BatchPanel />}
        {tab === 'ips-engine' && <OptimisePanel triggerToast={triggerToast} />}
        {tab === 'forecast' && <ForecastPage />}
        {tab === 'learning' && <LearningTab />}
        {tab === 'world-model' && <WorldModelPage />}
      </div>
    </div>
  );
}
