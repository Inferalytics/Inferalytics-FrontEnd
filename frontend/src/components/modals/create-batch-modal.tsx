'use client';

import React, { useState } from 'react';
import { X, Layers, TrendingUp, BarChart3, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const batchTypes = [
    {
        id: 'OPTIMIZATION',
        name: 'Optimization',
        icon: BarChart3,
        desc: 'Newton-Raphson hierarchical adjustment',
        color: 'bg-emerald-500'
    },
    {
        id: 'FORECASTING',
        name: 'Forecasting',
        icon: TrendingUp,
        desc: 'Holt-Winters seasonal prediction',
        color: 'bg-blue-500'
    },
    {
        id: 'FIXED',
        name: 'Fixed Matrix',
        icon: Layers,
        desc: 'Static comparison & audit',
        color: 'bg-slate-400'
    },
];

export default function CreateBatchModal({ isOpen, onClose }: CreateBatchModalProps) {
    const [selectedType, setSelectedType] = useState('OPTIMIZATION');
    const [name, setName] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#004E64]/60 backdrop-blur-md" onClick={onClose} />

            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#E0E5E9]/50 rounded-bl-full -mr-12 -mt-12 pointer-events-none" />

                <div className="p-8 pb-4 flex items-center justify-between relative">
                    <div>
                        <h2 className="text-2xl font-black text-[#004E64] uppercase tracking-tighter italic">Create New Batch</h2>
                        <p className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest mt-1">Initialize Mathematical Cycle</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#E0E5E9] flex items-center justify-center text-[#004E64]/40 hover:text-[#004E64] transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Batch Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest ml-1">Batch Designation</label>
                        <input
                            type="text"
                            placeholder="e.g. Q4 Regional Optimization Alpha"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#E0E5E9]/50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-[#004E64] focus:ring-2 focus:ring-[#004E64]/10 outline-none transition-all"
                        />
                    </div>

                    {/* Batch Type Selection */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest ml-1">Select Algorithm Logic</label>
                        <div className="grid grid-cols-1 gap-3">
                            {batchTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                                        selectedType === type.id
                                            ? "border-[#004E64] bg-[#004E64]/5 shadow-sm"
                                            : "border-black/5 hover:border-black/10 bg-white"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm", type.color)}>
                                            <type.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#004E64] uppercase tracking-tight">{type.name}</p>
                                            <p className="text-[10px] text-[#004E64]/40 font-medium">{type.desc}</p>
                                        </div>
                                    </div>
                                    {selectedType === type.id && (
                                        <div className="w-6 h-6 rounded-full bg-[#004E64] flex items-center justify-center text-white">
                                            <Check size={14} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button className="w-full bg-[#004E64] text-white py-5 rounded-[1.5rem] font-bold text-sm tracking-widest uppercase italic hover:bg-[#003E4F] transition-all shadow-xl shadow-[#004E64]/20 flex items-center justify-center gap-3 active:scale-[0.98]">
                        Initialize Matrix Engine
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
