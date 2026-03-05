'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
    Filter,
    Download,
    Plus,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    AlertCircle,
    Trash2,
    Archive,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

import CreateBatchModal from '@/components/modals/create-batch-modal';

const batches = [
    {
        id: '1',
        name: 'Optimization Batch Alpha',
        description: 'Newton-Raphson Multi-variable',
        created: 'Oct 12, 2023',
        status: 'COMPLETED',
        color: 'bg-emerald-500',
        type: 'OPTIMIZATION'
    },
    {
        id: '2',
        name: 'Forecasting Q3 Analysis',
        description: 'Holt-Winters Seasonal',
        created: 'Oct 15, 2023',
        status: 'IN PROGRESS',
        color: 'bg-blue-500',
        type: 'FORECASTING'
    },
    {
        id: '3',
        name: 'Convergence Test 1',
        description: 'Newton-Raphson Engine',
        created: 'Oct 18, 2023',
        status: 'PENDING',
        color: 'bg-slate-400',
        type: 'FIXED'
    }
];

const tabs = ['ALL BATCHES', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('ALL BATCHES');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === id ? null : id);
    };

    React.useEffect(() => {
        const handleClickAway = () => setActiveMenuId(null);
        if (activeMenuId) {
            window.addEventListener('click', handleClickAway);
        }
        return () => window.removeEventListener('click', handleClickAway);
    }, [activeMenuId]);

    const filteredBatches = batches.filter(batch => {
        if (activeTab === 'ALL BATCHES') return true;
        if (activeTab === 'ACTIVE') return batch.status === 'IN PROGRESS';
        if (activeTab === 'COMPLETED') return batch.status === 'COMPLETED';
        if (activeTab === 'ARCHIVED') return false; // No archived items in mock
        return true;
    });

    return (
        <DashboardLayout>
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#004E64] mb-2 uppercase tracking-tight">Workspace Batches</h1>
                    <p className="text-[#004E64]/60 text-sm font-medium">
                        Manage mathematical optimization processes and seasonal forecasting models.<br />
                        Select a batch to view detailed convergence metrics.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm font-bold text-[#004E64]/70 hover:bg-blue-50 transition-all shadow-sm">
                        <Filter size={18} />
                        Filter
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#004E64] rounded-xl text-sm font-bold text-white hover:bg-[#003E4F] transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={18} />
                        Create Batch
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-8 border-b border-black/5 mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "pb-4 text-xs font-bold tracking-widest transition-all relative",
                            activeTab === tab ? "text-[#004E64]" : "text-[#004E64]/40 hover:text-[#004E64]/60"
                        )}
                    >
                        {tab}
                        {activeTab === tab && <div className="absolute bottom-[-1px] left-0 w-full h-1 bg-[#004E64] rounded-t-full" />}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredBatches.map((batch) => (
                    <div key={batch.id} className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all border border-black/5 cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#004E64]/5 rounded-bl-[100px] -mr-8 -mt-8 group-hover:scale-110 transition-transform" />

                        <div className="flex justify-between items-start mb-6 relative">
                            <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold text-white", batch.color)}>
                                {batch.type}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={(e) => toggleMenu(e, batch.id)}
                                    className="text-[#004E64]/30 hover:text-[#004E64] transition-colors p-1"
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                {activeMenuId === batch.id && (
                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-black/5 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); alert("Routing to analysis view..."); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#004E64] hover:bg-blue-50 transition-all"
                                        >
                                            <ExternalLink size={14} />
                                            View Results
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); alert("Batch archived."); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#004E64] hover:bg-blue-50 transition-all"
                                        >
                                            <Archive size={14} />
                                            Archive Batch
                                        </button>
                                        <div className="h-px bg-black/5 my-1 mx-2" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); alert("Batch deleted."); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-[#004E64] mb-1 group-hover:text-teal-600 transition-colors">{batch.name}</h3>
                        <p className="text-xs text-[#004E64]/50 mb-8 font-medium">{batch.description}</p>

                        <div className="flex items-center justify-between pt-6 border-t border-black/5">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-[#004E64]/30 uppercase tracking-tighter">Created</span>
                                <span className="text-xs font-bold text-[#004E64]/70">{batch.created}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-[#004E64]/30 uppercase tracking-tighter mb-1">Status</span>
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold",
                                    batch.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                        batch.status === 'IN PROGRESS' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                            "bg-slate-50 text-slate-500 border border-slate-100"
                                )}>
                                    {batch.status === 'COMPLETED' && <CheckCircle2 size={10} />}
                                    {batch.status === 'IN PROGRESS' && <Clock size={10} className="animate-spin-slow" />}
                                    {batch.status === 'PENDING' && <AlertCircle size={10} />}
                                    {batch.status}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Start New Analysis Card */}
                {activeTab === 'ALL BATCHES' && (
                    <div
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-[#E0E5E9] border-4 border-dashed border-[#004E64]/10 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[#004E64]/30 hover:bg-white/40 transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#004E64]/40 group-hover:bg-[#004E64] group-hover:text-white transition-all shadow-sm">
                            <Plus size={32} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-[#004E64]/50 group-hover:text-[#004E64]">START NEW ANALYSIS</h3>
                            <p className="text-[10px] font-bold text-[#004E64]/30 tracking-widest uppercase">INITIALIZE NEW BATCH CYCLE</p>
                        </div>
                    </div>
                )}
            </div>

            <CreateBatchModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </DashboardLayout>
    );
}
