'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
    Layers,
    Lock,
    Target,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Play,
    RefreshCcw,
    Info,
    Database,
    GitBranch,
    ArrowRight,
    Zap,
    Clock,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SetupTab = 'vectorisation' | 'fixed-values' | 'egr' | 'time-periods';

const tabs: { id: SetupTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'vectorisation', label: 'Vectorisation', icon: Layers, desc: 'Flatten data to vectors' },
    { id: 'fixed-values', label: 'Fixed Values', icon: Lock, desc: 'Constraint indices' },
    { id: 'egr', label: 'EGR Settings', icon: Target, desc: 'Expected growth rate' },
    { id: 'time-periods', label: 'Time Periods', icon: Calendar, desc: 'Data & forecast range' },
];

const mockVectorData = [
    { index: 0, column: 'Region_A_North', value: 1230.22, fixed: false },
    { index: 1, column: 'Region_A_South', value: 942.50, fixed: true },
    { index: 2, column: 'Region_A_Central', value: 2110.15, fixed: false },
    { index: 3, column: 'Region_B_North', value: 876.40, fixed: false },
    { index: 4, column: 'Region_B_South', value: 1455.80, fixed: true },
    { index: 5, column: 'Region_B_Central', value: 1890.60, fixed: false },
    { index: 6, column: 'Region_C_North', value: 3210.00, fixed: false },
    { index: 7, column: 'Region_C_South', value: 1100.35, fixed: false },
];

export default function DataSetupPage() {
    const [activeTab, setActiveTab] = useState<SetupTab>('vectorisation');
    const [egrValue, setEgrValue] = useState('0.15');
    const [startTime, setStartTime] = useState('Q1_2023');
    const [endTime, setEndTime] = useState('Q4_2024');
    const [targetTime, setTargetTime] = useState('Q4_2025');
    const [periodType, setPeriodType] = useState('quarterly');
    const [isVectorising, setIsVectorising] = useState(false);
    const [vectorData, setVectorData] = useState(mockVectorData);

    const handleVectorise = () => {
        setIsVectorising(true);
        setTimeout(() => {
            setIsVectorising(false);
            alert("Vectorisation complete. Data flattened to x ∈ ℝ⁸ with column mapping preserved.");
        }, 2000);
    };

    const toggleFixed = (index: number) => {
        setVectorData(prev => prev.map(v =>
            v.index === index ? { ...v, fixed: !v.fixed } : v
        ));
    };

    return (
        <DashboardLayout>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Configuration</span>
                        <div className="h-px w-8 bg-[#004E64]/10" />
                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">Step 2 of 4</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#004E64] uppercase tracking-tight">Data Setup</h1>
                    <p className="text-[#004E64]/60 text-sm font-medium">Configure vectorisation, constraints, and growth parameters before optimization.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => alert("Configuration reset to defaults.")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm font-bold text-[#004E64]/70 hover:bg-blue-50 transition-all shadow-sm"
                    >
                        <RefreshCcw size={14} />
                        Reset
                    </button>
                    <button
                        onClick={() => alert("Configuration saved. Proceed to optimization.")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#004E64] rounded-xl text-sm font-bold text-white hover:bg-[#003E4F] transition-all shadow-lg"
                    >
                        Save & Continue
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-3xl p-2 shadow-sm border border-black/5 mb-8">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl transition-all",
                                activeTab === tab.id
                                    ? "bg-[#004E64] text-white shadow-lg"
                                    : "text-[#004E64]/40 hover:bg-[#E0E5E9]/50 hover:text-[#004E64]"
                            )}
                        >
                            <tab.icon size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-8">
                    {/* Vectorisation Tab */}
                    {activeTab === 'vectorisation' && (
                        <div className="flex flex-col gap-6">
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-[#004E64]">Data Vectorisation Engine</h2>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-tighter">
                                            {isVectorising ? 'Processing' : 'Ready'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleVectorise}
                                        disabled={isVectorising}
                                        className={cn(
                                            "flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95",
                                            isVectorising ? "bg-amber-500 text-white" : "bg-[#004E64] text-white hover:bg-[#003E4F]"
                                        )}
                                    >
                                        {isVectorising ? (
                                            <>
                                                <Layers size={18} className="animate-spin" />
                                                Flattening Data...
                                            </>
                                        ) : (
                                            <>
                                                <Play size={18} fill="currentColor" />
                                                Run Vectorisation
                                            </>
                                        )}
                                    </button>
                                </div>

                                <p className="text-[#004E64]/50 text-sm mb-6">
                                    Converts multi-dimensional hierarchical data into a single flattened vector x ∈ ℝⁿ with full column mapping for traceability.
                                </p>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-[#E0E5E9]/30 rounded-2xl p-5 border border-black/5">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-1">Input Dimensions</span>
                                        <span className="text-2xl font-black text-[#004E64]">8 x 18</span>
                                    </div>
                                    <div className="bg-[#E0E5E9]/30 rounded-2xl p-5 border border-black/5">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-1">Output Vector</span>
                                        <span className="text-2xl font-black text-[#004E64]">ℝ⁸</span>
                                    </div>
                                    <div className="bg-[#E0E5E9]/30 rounded-2xl p-5 border border-black/5">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-1">Column Map</span>
                                        <span className="text-2xl font-black text-[#004E64]">Intact</span>
                                    </div>
                                </div>

                                {/* Vector Preview */}
                                <div className="bg-[#E0E5E9]/20 rounded-2xl p-6 border border-black/5">
                                    <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-4">Vector Preview</span>
                                    <div className="flex flex-wrap gap-2">
                                        {vectorData.map((v) => (
                                            <div key={v.index} className={cn(
                                                "px-3 py-2 rounded-xl text-xs font-mono border transition-all",
                                                v.fixed
                                                    ? "bg-amber-50 border-amber-200 text-amber-700"
                                                    : "bg-white border-black/5 text-[#004E64]"
                                            )}>
                                                <span className="text-[10px] text-[#004E64]/30 mr-1">x[{v.index}]</span>
                                                {v.value.toFixed(2)}
                                                {v.fixed && <Lock size={8} className="inline ml-1" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fixed Values Tab */}
                    {activeTab === 'fixed-values' && (
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold text-[#004E64]">Fixed Value Constraints</h2>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-tighter">
                                        {vectorData.filter(v => v.fixed).length} Locked
                                    </span>
                                </div>
                            </div>

                            <p className="text-[#004E64]/50 text-sm mb-6">
                                Mark specific vector indices as fixed to preserve their values during Newton-Raphson optimization.
                            </p>

                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-black/5">
                                        <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Index</th>
                                        <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Column Name</th>
                                        <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Value</th>
                                        <th className="text-center py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Status</th>
                                        <th className="text-right py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {vectorData.map((v) => (
                                        <tr key={v.index} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4">
                                                <span className="text-xs font-mono font-bold text-[#004E64]/60 bg-[#E0E5E9]/50 px-2 py-1 rounded">x[{v.index}]</span>
                                            </td>
                                            <td className="py-4 text-xs font-bold text-[#004E64]">{v.column}</td>
                                            <td className="py-4 text-xs font-medium text-[#004E64]/60 font-mono">{v.value.toFixed(2)}</td>
                                            <td className="py-4 text-center">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-1 rounded-md border inline-flex items-center gap-1",
                                                    v.fixed
                                                        ? "bg-amber-50 text-amber-600 border-amber-100"
                                                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                )}>
                                                    {v.fixed ? <><Lock size={10} /> FIXED</> : <><CheckCircle2 size={10} /> FREE</>}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button
                                                    onClick={() => toggleFixed(v.index)}
                                                    className={cn(
                                                        "text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all",
                                                        v.fixed
                                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                            : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                                    )}
                                                >
                                                    {v.fixed ? 'Unlock' : 'Lock'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* EGR Settings Tab */}
                    {activeTab === 'egr' && (
                        <div className="flex flex-col gap-6">
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                                <div className="flex items-center gap-3 mb-8">
                                    <h2 className="text-lg font-bold text-[#004E64]">Expected Growth Rate (EGR)</h2>
                                    <Info size={14} className="text-[#004E64]/30" />
                                </div>

                                <p className="text-[#004E64]/50 text-sm mb-8">
                                    Define the target growth rate for the Newton-Raphson optimization. The algorithm will iteratively adjust free vector values to converge on this target.
                                </p>

                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="bg-[#004E64] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8" />
                                        <span className="text-[10px] font-bold text-blue-100/40 uppercase tracking-widest block mb-1">Target EGR</span>
                                        <span className="text-4xl font-black text-white italic">{(parseFloat(egrValue) * 100).toFixed(1)}%</span>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span className="text-[10px] font-bold text-blue-100/60 uppercase">Active Target</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#E0E5E9]/30 rounded-2xl p-6 border border-black/5">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-1">Convergence Tolerance</span>
                                        <span className="text-4xl font-black text-[#004E64] italic">1e-6</span>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                                            <span className="text-[10px] font-bold text-[#004E64]/40 uppercase">High Precision</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-[#004E64]/60 uppercase tracking-widest">EGR Value</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={egrValue}
                                                onChange={(e) => setEgrValue(e.target.value)}
                                                className="flex-1 bg-[#E0E5E9]/30 border border-black/5 rounded-xl px-4 py-3 text-sm font-bold text-[#004E64] focus:outline-none focus:ring-2 focus:ring-[#004E64]/20"
                                                placeholder="e.g. 0.15"
                                            />
                                            <button
                                                onClick={() => alert(`EGR value set to ${egrValue}. Ready for optimization.`)}
                                                className="bg-[#004E64] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#003E4F] transition-all shadow-lg"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-[#004E64]/60 uppercase tracking-widest">Quick Select</label>
                                        <div className="flex gap-2">
                                            {['0.05', '0.10', '0.15', '0.20', '0.25'].map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => setEgrValue(val)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                                                        egrValue === val
                                                            ? "bg-[#004E64] text-white border-[#004E64] shadow-lg"
                                                            : "bg-white text-[#004E64]/60 border-black/5 hover:bg-blue-50"
                                                    )}
                                                >
                                                    {(parseFloat(val) * 100).toFixed(0)}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Time Periods Tab */}
                    {activeTab === 'time-periods' && (
                        <div className="flex flex-col gap-6">
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                                <div className="flex items-center gap-3 mb-8">
                                    <h2 className="text-lg font-bold text-[#004E64]">Time Period Configuration</h2>
                                </div>

                                <p className="text-[#004E64]/50 text-sm mb-8">
                                    Define the data range for analysis and the target forecast period for Holt-Winters projections.
                                </p>

                                {/* Data Time Range */}
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-[#004E64] uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Clock size={14} className="text-[#004E64]/40" />
                                        Data Time Range
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Start Period</label>
                                            <input
                                                type="text"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full bg-[#E0E5E9]/30 border border-black/5 rounded-xl px-4 py-3 text-sm font-bold text-[#004E64] focus:outline-none focus:ring-2 focus:ring-[#004E64]/20"
                                                placeholder="Q1_2023"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">End Period</label>
                                            <input
                                                type="text"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full bg-[#E0E5E9]/30 border border-black/5 rounded-xl px-4 py-3 text-sm font-bold text-[#004E64] focus:outline-none focus:ring-2 focus:ring-[#004E64]/20"
                                                placeholder="Q4_2024"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Period Type */}
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-[#004E64] uppercase tracking-widest mb-4">Period Type</h3>
                                    <div className="flex gap-2">
                                        {['monthly', 'quarterly', 'yearly'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setPeriodType(type)}
                                                className={cn(
                                                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all border capitalize",
                                                    periodType === type
                                                        ? "bg-[#004E64] text-white border-[#004E64] shadow-lg"
                                                        : "bg-white text-[#004E64]/60 border-black/5 hover:bg-blue-50"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Forecast Target */}
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-[#004E64] uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Target size={14} className="text-[#004E64]/40" />
                                        Forecast Target Period
                                    </h3>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={targetTime}
                                            onChange={(e) => setTargetTime(e.target.value)}
                                            className="w-full bg-[#E0E5E9]/30 border border-black/5 rounded-xl px-4 py-3 text-sm font-bold text-[#004E64] focus:outline-none focus:ring-2 focus:ring-[#004E64]/20"
                                            placeholder="Q4_2025"
                                        />
                                    </div>
                                </div>

                                {/* Timeline Visualization */}
                                <div className="bg-[#E0E5E9]/20 rounded-2xl p-6 border border-black/5">
                                    <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-4">Timeline Overview</span>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-[#004E64] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">{startTime}</div>
                                        <div className="flex-1 h-1 bg-[#004E64]/20 rounded-full relative">
                                            <div className="absolute inset-y-0 left-0 w-2/3 bg-[#004E64] rounded-full" />
                                        </div>
                                        <div className="bg-[#004E64]/80 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">{endTime}</div>
                                        <ArrowRight size={14} className="text-[#004E64]/30 mx-1" />
                                        <div className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">{targetTime}</div>
                                    </div>
                                    <div className="flex justify-between mt-2 px-1">
                                        <span className="text-[10px] text-[#004E64]/30">Historical Data</span>
                                        <span className="text-[10px] text-teal-600 font-bold">Forecast</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => alert(`Time periods saved: ${startTime} → ${endTime}, Target: ${targetTime}, Period: ${periodType}`)}
                                    className="mt-6 w-full bg-[#004E64] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#003E4F] transition-all shadow-lg active:scale-[0.98]"
                                >
                                    <CheckCircle2 size={18} />
                                    Save Time Configuration
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Setup Progress */}
                    <div className="bg-[#004E64] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -mr-8 -mt-8" />
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <ShieldCheck size={20} className="text-teal-400" />
                            Setup Progress
                        </h2>

                        <div className="space-y-4">
                            {[
                                { step: 'Data Upload', status: 'complete' as const },
                                { step: 'Vectorisation', status: activeTab === 'vectorisation' ? 'active' as const : 'complete' as const },
                                { step: 'Fixed Values', status: activeTab === 'fixed-values' ? 'active' as const : (activeTab === 'egr' || activeTab === 'time-periods' ? 'complete' as const : 'pending' as const) },
                                { step: 'EGR Configuration', status: activeTab === 'egr' ? 'active' as const : (activeTab === 'time-periods' ? 'complete' as const : 'pending' as const) },
                                { step: 'Time Periods', status: activeTab === 'time-periods' ? 'active' as const : 'pending' as const },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center",
                                        item.status === 'complete' ? "bg-emerald-500/20" :
                                        item.status === 'active' ? "bg-white/20" : "bg-white/5"
                                    )}>
                                        {item.status === 'complete' ? (
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                        ) : item.status === 'active' ? (
                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-white/20" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-bold",
                                        item.status === 'complete' ? "text-emerald-400" :
                                        item.status === 'active' ? "text-white" : "text-blue-100/30"
                                    )}>
                                        {item.step}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex justify-between text-xs font-bold text-blue-100/60 uppercase tracking-widest mb-2">
                                <span>Completion</span>
                                <span className="text-teal-400">60%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="w-[60%] h-full bg-teal-400 rounded-full transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Data Summary */}
                    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                        <h4 className="text-xs font-bold text-[#004E64] uppercase tracking-widest mb-4">Active Batch Summary</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-[#E0E5E9]/30 p-4 rounded-2xl border border-black/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#004E64]/40 shadow-sm">
                                        <Database size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Data Source</span>
                                        <span className="text-xs font-bold text-[#004E64]">regional_sales_q4.csv</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-[#004E64]/20" />
                            </div>

                            <div className="flex justify-between items-center bg-[#E0E5E9]/30 p-4 rounded-2xl border border-black/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#004E64]/40 shadow-sm">
                                        <GitBranch size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Vector Size</span>
                                        <span className="text-xs font-bold text-[#004E64]">x ∈ ℝ⁸ (8 elements)</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-[#004E64]/20" />
                            </div>

                            <div className="flex justify-between items-center bg-[#E0E5E9]/30 p-4 rounded-2xl border border-black/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#004E64]/40 shadow-sm">
                                        <Lock size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Fixed Indices</span>
                                        <span className="text-xs font-bold text-[#004E64]">{vectorData.filter(v => v.fixed).length} of {vectorData.length} locked</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-[#004E64]/20" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
