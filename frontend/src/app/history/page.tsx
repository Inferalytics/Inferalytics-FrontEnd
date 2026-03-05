'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
    Bell,
    CheckCircle,
    FileDown,
    Search,
    Calendar,
    Filter,
    CheckCircle2,
    Clock,
    FileText,
    ChevronRight,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

const historyData = [
    {
        id: 'B-9921',
        batch: 'Optimization Batch Alpha',
        type: 'Newton-Raphson',
        date: 'Oct 12, 2023 at 14:20',
        accuracy: '0.998',
        status: 'Success',
        user: 'Alex Johnson'
    },
    {
        id: 'F-4410',
        batch: 'Forecasting Q3 Analysis',
        type: 'Holt-Winters',
        date: 'Oct 15, 2023 at 09:12',
        accuracy: '0.942',
        status: 'Partial',
        user: 'Alex Johnson'
    },
    {
        id: 'B-9918',
        batch: 'Convergence Test 1',
        type: 'Newton-Raphson',
        date: 'Oct 08, 2023 at 16:45',
        accuracy: '0.999',
        status: 'Success',
        user: 'Alex Johnson'
    },
    {
        id: 'F-4405',
        batch: 'Inventory Prediction v2',
        type: 'Holt-Winters',
        date: 'Sep 28, 2023 at 11:30',
        accuracy: '0.887',
        status: 'Failed',
        user: 'Alex Johnson'
    },
    {
        id: 'B-9882',
        batch: 'Market Volatility Test',
        type: 'Newton-Raphson',
        date: 'Sep 22, 2023 at 10:15',
        accuracy: '0.995',
        status: 'Success',
        user: 'Alex Johnson'
    }
];

export default function HistoryPage() {
    const [isExporting, setIsExporting] = React.useState(false);
    const [showDatePicker, setShowDatePicker] = React.useState(false);

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => {
            setIsExporting(false);
            alert("Audit logs exported to Infralytics_Audit_Oct23.csv");
        }, 3000);
    };

    return (
        <DashboardLayout>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#004E64] uppercase tracking-tight">Execution History</h1>
                    <p className="text-[#004E64]/60 text-sm font-medium">Review and audit all mathematical model executions and batch processing history.</p>
                </div>
                <div className="flex gap-3 relative">
                    <div className="relative">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 bg-white border rounded-xl text-sm font-bold transition-all shadow-sm",
                                showDatePicker ? "border-[#004E64] text-[#004E64] bg-blue-50" : "border-black/5 text-[#004E64]/70 hover:bg-blue-50"
                            )}
                        >
                            <Calendar size={18} />
                            Date Range
                        </button>
                        {showDatePicker && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-black/5 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest mb-3">Quick Select</p>
                                <div className="space-y-2">
                                    {['Last 24 Hours', 'Last 7 Days', 'Last 30 Days', 'Custom Range'].map(range => (
                                        <button
                                            key={range}
                                            onClick={() => {
                                                setShowDatePicker(false);
                                                alert(`Filtering history by: ${range}`);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-[#004E64] hover:bg-blue-50 transition-all flex justify-between items-center"
                                        >
                                            {range}
                                            <ChevronRight size={14} className="text-[#004E64]/20" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 disabled:opacity-70",
                            isExporting ? "bg-amber-500" : "bg-[#004E64] hover:bg-[#003E4F]"
                        )}
                    >
                        {isExporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileDown size={18} />
                                Export Audit Logs
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-2">Total Executions</span>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-black text-[#004E64]">1,284</span>
                        <div className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold">+12% vs last month</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-2">Avg. Convergence Speed</span>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-black text-[#004E64]">1.42s</span>
                        <div className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold">Stable performance</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-2">Model Reliability</span>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-black text-[#004E64]">98.2%</span>
                        <div className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold">+0.5% improvement</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
                <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#004E64]/30" size={16} />
                        <input
                            type="text"
                            placeholder="Search history ID or batch..."
                            className="w-full bg-[#E0E5E9]/50 border-none rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-[#004E64]/20 transition-all outline-none"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 bg-[#E0E5E9]/50 rounded-xl text-[10px] font-bold text-[#004E64]/60 hover:text-[#004E64] transition-all">
                        <Filter size={14} />
                        Filter by Type
                    </button>
                </div>

                <table className="w-full">
                    <thead>
                        <tr className="bg-[#E0E5E9]/20">
                            <th className="text-left p-6 text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Execution ID</th>
                            <th className="text-left p-6 text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Batch Name</th>
                            <th className="text-left p-6 text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Algorithm Type</th>
                            <th className="text-left p-6 text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Accuracy Index</th>
                            <th className="text-left p-6 text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Status</th>
                            <th className="p-6"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                        {historyData.map((item) => (
                            <tr key={item.id} className="group hover:bg-[#E0E5E9]/30 transition-all cursor-pointer">
                                <td className="p-6 text-xs font-bold text-[#004E64]/70">{item.id}</td>
                                <td className="p-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[#004E64]">{item.batch}</span>
                                        <span className="text-[10px] font-medium text-[#004E64]/40">{item.date}</span>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#004E64]/5 text-[#004E64] border border-[#004E64]/10 uppercase tracking-tighter">
                                        {item.type}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-[#E0E5E9] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#004E64] rounded-full"
                                                style={{ width: `${parseFloat(item.accuracy) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black text-[#004E64]">{item.accuracy}</span>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className={cn(
                                        "text-[10px] font-bold flex items-center gap-1.5",
                                        item.status === 'Success' ? "text-emerald-500" :
                                            item.status === 'Partial' ? "text-amber-500" : "text-red-500"
                                    )}>
                                        {item.status === 'Success' ? <CheckCircle2 size={12} /> :
                                            item.status === 'Partial' ? <Clock size={12} /> : <FileText size={12} />}
                                        {item.status}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <button className="p-2 rounded-lg text-[#004E64]/20 hover:text-[#004E64] hover:bg-white shadow-none hover:shadow-sm transition-all">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="p-6 border-t border-black/5 flex items-center justify-between bg-white text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">
                    <span>Showing 5 of 1,284 results</span>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1 bg-[#E0E5E9]/50 rounded-lg hover:text-[#004E64] transition-colors">Prev</button>
                        <button className="px-3 py-1 bg-[#004E64] text-white rounded-lg">Next</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
