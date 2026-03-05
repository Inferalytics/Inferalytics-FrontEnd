'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { ForecastingChart } from '@/components/charts/forecasting-chart';
import {
    TrendingUp,
    Target,
    Activity,
    Zap,
    Info,
    Maximize2,
    RefreshCcw,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AnalysisPage() {
    const [alpha, setAlpha] = useState(0.32);
    const [beta, setBeta] = useState(0.15);
    const [gamma, setGamma] = useState(0.24);
    const [activePeriod, setActivePeriod] = useState('24 Months');
    const [isExecuting, setIsExecuting] = useState(false);

    const handleExecute = () => {
        setIsExecuting(true);
        setTimeout(() => {
            setIsExecuting(false);
            alert("Matrix forecasting execution complete. Hierarchical nodes synced.");
        }, 2000);
    };

    return (
        <DashboardLayout>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Analysis Tool</span>
                        <div className="h-px w-8 bg-[#004E64]/10" />
                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">Newton-Raphson Engine v.2.4</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#004E64] uppercase tracking-tight">Forecasting Dashboard</h1>
                    <p className="text-[#004E64]/60 text-sm font-medium">Holt-Winters Exponential Smoothing and Hierarchical Analysis.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => alert("Cross-period comparison matrix initialized.")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm font-bold text-[#004E64]/70 hover:bg-blue-50 transition-all shadow-sm"
                    >
                        Compare Period
                    </button>
                    <button
                        onClick={handleExecute}
                        disabled={isExecuting}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95",
                            isExecuting ? "bg-amber-500" : "bg-[#004E64] hover:bg-[#003E4F]"
                        )}
                    >
                        {isExecuting ? "Executing..." : "Execute Forecast"}
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'PREDICTED GROWTH RATE', value: '6.16%', sub: '+ 1.2%', icon: TrendingUp },
                    { label: 'YEARLY EGR ESTIMATION', value: '8.42%', sub: '+ 0.8%', icon: Target },
                    { label: 'RMSE ACCURACY', value: '0.042', sub: 'OPTIMAL', icon: Activity },
                    { label: 'CONVERGENCE INDEX', value: '0.998', sub: 'STABLE', icon: Zap },
                ].map((metric) => (
                    <div key={metric.label} className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest leading-none">{metric.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-[#004E64]">{metric.value}</span>
                                <span className="text-[10px] font-bold text-teal-600 leading-none">{metric.sub}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#E0E5E9] flex items-center justify-center text-[#004E64]/40">
                            <metric.icon size={20} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 flex-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8">
                            <Maximize2 size={18} className="text-[#004E64]/20 hover:text-[#004E64] cursor-pointer" />
                        </div>

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-[#004E64]">Historical vs. Forecasted Data</h2>
                                <Info size={14} className="text-[#004E64]/30" />
                            </div>
                            <div className="flex bg-[#E0E5E9] p-1 rounded-xl">
                                {['12 Months', '24 Months'].map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => setActivePeriod(period)}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-bold transition-all rounded-lg",
                                            activePeriod === period
                                                ? "bg-white text-[#004E64] shadow-sm"
                                                : "text-[#004E64]/40 hover:text-[#004E64]"
                                        )}
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 mb-8">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#004E64]" />
                                <span className="text-[10px] font-bold text-[#004E64]/60">Actual Level Records</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#0ea5e9]" />
                                <span className="text-[10px] font-bold text-[#004E64]/60">Projected Trends</span>
                            </div>
                        </div>

                        <ForecastingChart />
                    </div>

                    {/* Table Area */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-[#004E64]">Hierarchical Node Performance</h2>
                            <button className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest hover:text-[#004E64]">View All Nodes in Tree</button>
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-black/5">
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Node Level</th>
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Historical Avg.</th>
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Forecast YoY</th>
                                    <th className="text-right py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {[
                                    { node: 'Region_A_North', avg: '1,230.22', forecast: '+3.12%', status: 'STABLE', color: 'text-emerald-500' },
                                    { node: 'Region_A_South', avg: '942.50', forecast: '-0.42%', status: 'AT RISK', color: 'text-amber-500' },
                                    { node: 'Region_A_Central', avg: '2,110.15', forecast: '+5.78%', status: 'STABLE', color: 'text-emerald-500' },
                                ].map((row) => (
                                    <tr key={row.node} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 text-xs font-bold text-[#004E64]">{row.node}</td>
                                        <td className="py-4 text-xs font-medium text-[#004E64]/60">{row.avg}</td>
                                        <td className={cn("py-4 text-xs font-bold", row.forecast.startsWith('+') ? "text-emerald-600" : "text-amber-600")}>{row.forecast}</td>
                                        <td className="py-4 text-right">
                                            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md border", row.status === 'STABLE' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100 text-[11px]")}>
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Parameters Area */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-[#004E64] rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -mr-8 -mt-8" />

                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <Zap size={18} />
                            </div>
                            <h2 className="text-lg font-bold">Smoothing Parameters</h2>
                        </div>

                        <div className="space-y-8 mb-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-100/60">Alpha (Level)</span>
                                    <span className="text-xs font-bold">{alpha}</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.01" value={alpha}
                                    onChange={(e) => setAlpha(parseFloat(e.target.value))}
                                    className="w-full accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <p className="text-[10px] text-blue-100/30 font-medium leading-relaxed">Adjust level responsiveness to recent data fluctuations in the time sequence.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-100/60">Beta (Trend)</span>
                                    <span className="text-xs font-bold">{beta}</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.01" value={beta}
                                    onChange={(e) => setBeta(parseFloat(e.target.value))}
                                    className="w-full accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <p className="text-[10px] text-blue-100/30 font-medium leading-relaxed">Control trend adaptations against seasonal noise and structural changes.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-100/60">Gamma (Seasonality)</span>
                                    <span className="text-xs font-bold">{gamma}</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.01" value={gamma}
                                    onChange={(e) => setGamma(parseFloat(e.target.value))}
                                    className="w-full accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                />
                                <p className="text-[10px] text-blue-100/30 font-medium leading-relaxed">Stabilize seasonal adjustments across period cycles.</p>
                            </div>
                        </div>

                        <button className="w-full bg-white text-[#004E64] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-lg active:scale-[0.98] mt-6">
                            <RefreshCcw size={18} />
                            Reset to Optimal [System]
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-bold text-[#004E64] uppercase tracking-widest">Model Logs</h4>
                            <MoreHorizontal size={14} className="text-[#004E64]/30" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-[#004E64]">Convergence Reached</p>
                                    <p className="text-[10px] text-[#004E64]/40">System reached tolerance 1e-6 in 12 iterations.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-[#004E64]">Vectorization Complete</p>
                                    <p className="text-[10px] text-[#004E64]/40">Data points flattened to (2, 4) matrix.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
