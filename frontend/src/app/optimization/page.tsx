'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
    Upload,
    Layers,
    Settings2,
    Play,
    CheckCircle2,
    Activity,
    Maximize2,
    Table as TableIcon,
    ChevronRight,
    ShieldCheck,
    Zap,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
    { id: 1, name: 'Data Population', icon: Upload, desc: 'Upload CSV/Excel' },
    { id: 2, name: 'Vectorisation', icon: Layers, desc: 'Flatten to NumPy' },
    { id: 3, name: 'EGR Settings', icon: Settings2, desc: 'Set Target Rate' },
    { id: 4, name: 'Optimization', icon: Play, desc: 'Newton-Raphson' },
];

import CreateBatchModal from '@/components/modals/create-batch-modal';

export default function OptimizationPage() {
    const [activeStep, setActiveStep] = useState(1);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileBrowse = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            alert(`File "${file.name}" selected. Initializing vectorisation...`);
            setActiveStep(2);
        }
    };

    return (
        <DashboardLayout>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".csv,.xlsx,.json"
            />
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#004E64] uppercase tracking-tight">Newton-Raphson Optimization</h1>
                    <p className="text-[#004E64]/60 text-sm font-medium">Fine-tune your mathematical models using hierarchical structural adjustment algorithms.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => alert("Configuration saved successfully.")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm font-bold text-[#004E64]/70 hover:bg-blue-50 transition-all shadow-sm"
                    >
                        Save Configuration
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#004E64] rounded-xl text-sm font-bold text-white hover:bg-[#003E4F] transition-all shadow-lg"
                    >
                        Batch Import
                    </button>
                </div>
            </div>

            {/* Stepper */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 mb-8">
                <div className="flex justify-between relative">
                    {/* Connecting Line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#E0E5E9] -translate-y-1/2" />

                    {steps.map((step) => {
                        const isActive = activeStep === step.id;
                        const isCompleted = activeStep > step.id;
                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                                <button
                                    onClick={() => setActiveStep(step.id)}
                                    className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-4",
                                        isActive ? "bg-[#004E64] text-white border-white shadow-xl scale-110" :
                                            isCompleted ? "bg-emerald-500 text-white border-white" : "bg-white text-[#004E64]/30 border-[#E0E5E9]"
                                    )}
                                >
                                    {isCompleted ? <CheckCircle2 size={24} /> : <step.icon size={24} />}
                                </button>
                                <div className="flex flex-col items-center">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "text-[#004E64]" : "text-[#004E64]/30")}>
                                        {step.name}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Workspace Area */}
                <div className="lg:col-span-8">
                    {activeStep === 1 && (
                        <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-black/5 flex flex-col items-center justify-center min-h-[500px] border-dashed border-4 border-[#004E64]/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-50/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="w-24 h-24 bg-[#E0E5E9] rounded-[2rem] flex items-center justify-center text-[#004E64]/30 mb-8 shadow-inner">
                                <TableIcon size={48} />
                            </div>
                            <h2 className="text-2xl font-black text-[#004E64] mb-2 uppercase italic tracking-tighter">Populate Your Data</h2>
                            <p className="text-[#004E64]/50 mb-10 text-center max-w-sm font-medium">
                                Drag and drop your CSV, Excel (XLSX), or JSON files to begin the optimization cycle.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleFileBrowse}
                                    className="bg-[#004E64] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#003E4F] transition-all shadow-lg"
                                >
                                    <Upload size={20} />
                                    Browse Files
                                </button>
                                <button
                                    onClick={() => alert("Manual input console initialized. Please enter structural vector data.")}
                                    className="bg-white text-[#004E64] border border-black/5 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-sm"
                                >
                                    Manual Input
                                </button>
                            </div>
                        </div>
                    )}

                    <CreateBatchModal
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                    />

                    {activeStep === 4 && (
                        <div className="flex flex-col gap-6">
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-[#004E64]">Newton-Raphson Engine</h2>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-tighter">Ready to Converge</span>
                                    </div>
                                    <button
                                        onClick={() => setIsOptimizing(!isOptimizing)}
                                        className={cn(
                                            "flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95",
                                            isOptimizing ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-[#004E64] text-white hover:bg-[#003E4F]"
                                        )}
                                    >
                                        {isOptimizing ? (
                                            <>
                                                <Activity size={18} className="animate-spin" />
                                                Processing Iterations...
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={18} fill="currentColor" />
                                                Initiate Optimization
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-center bg-[#E0E5E9]/30 p-4 rounded-2xl border border-black/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#004E64]/40 shadow-sm">
                                                <Maximize2 size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Active Matrix</span>
                                                <span className="text-xs font-bold text-[#004E64]">Hierarchy v.1.0 (2,4)</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-[#004E64]/20" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#E0E5E9]/50 rounded-2xl p-6 border border-black/5">
                                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest block mb-4">Convergence Logs</span>
                                        <div className="font-mono text-[10px] space-y-2 text-[#004E64]/70">
                                            <p className="flex justify-between"><span>[System]</span> <span className="text-emerald-500">INITIATED</span></p>
                                            <p className="flex justify-between"><span>[Matrix]</span> <span>LOADED (256 vectors)</span></p>
                                            <p className="flex justify-between"><span>[EGR]</span> <span>TARGET: 0.15</span></p>
                                            {isOptimizing && (
                                                <>
                                                    <p className="flex justify-between"><span>[Iter 1]</span> <span>EGR: 0.1245 (+0.025)</span></p>
                                                    <p className="flex justify-between"><span>[Iter 2]</span> <span>EGR: 0.1488 (+0.002)</span></p>
                                                    <p className="flex justify-between animate-pulse"><span>[Iter 3]</span> <span>CALCULATING...</span></p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-[#004E64] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8" />
                                        <span className="text-[10px] font-bold text-blue-100/40 uppercase tracking-widest block mb-1">Convergence Tolerance</span>
                                        <span className="text-4xl font-black text-white italic">1e-6</span>
                                        <div className="mt-8 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span className="text-[10px] font-bold text-blue-100/60 uppercase">High Precision Enabled</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                                <h2 className="text-lg font-bold text-[#004E64] mb-6">Optimization Results Map</h2>
                                <div className="h-64 bg-[#E0E5E9]/50 rounded-2xl flex items-center justify-center border-2 border-dashed border-[#004E64]/10">
                                    <span className="text-[10px] font-bold text-[#004E64]/30 uppercase tracking-[0.2em]">Visualizing Gradient Descent...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeStep === 2 || activeStep === 3) && (
                        <div className="bg-white rounded-3xl p-12 shadow-sm border border-black/5 min-h-[500px] flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#004E64]/40 mb-6">
                                <Info size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-[#004E64] mb-2 uppercase tracking-tight">Configuration Module</h2>
                            <p className="text-[#004E64]/50 mb-8 text-center max-w-sm">This section is being synchronized with the latest backend specifications.</p>
                            <button
                                onClick={() => setActiveStep(activeStep + 1)}
                                className="bg-[#004E64] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#003E4F] transition-all"
                            >
                                Continue to Next Step
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Configuration Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#004E64] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -mr-8 -mt-8" />
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <ShieldCheck size={20} className="text-teal-400" />
                            Engine Config
                        </h2>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold text-blue-100/60 uppercase tracking-widest">
                                    <span>Iteration Limit</span>
                                    <span className="text-teal-400">1000</span>
                                </div>
                                <input type="range" className="w-full accent-teal-400 h-1 bg-white/10 rounded-lg appearance-none" />
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold text-blue-100/60 uppercase tracking-widest">
                                    <span>Damping Factor</span>
                                    <span className="text-teal-400">0.85</span>
                                </div>
                                <input type="range" className="w-full accent-teal-400 h-1 bg-white/10 rounded-lg appearance-none" />
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-4 h-4 rounded border-none bg-white/10 text-teal-500 focus:ring-0" defaultChecked />
                                    <span className="text-xs font-medium text-blue-100/70">Auto-vectorize on upload</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-4 h-4 rounded border-none bg-white/10 text-teal-500 focus:ring-0" defaultChecked />
                                    <span className="text-xs font-medium text-blue-100/70">Strict convergence mode</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-4 h-4 rounded border-none bg-white/10 text-teal-500 focus:ring-0" />
                                    <span className="text-xs font-medium text-blue-100/70">Enable matrix logs</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                        <h4 className="text-xs font-bold text-[#004E64] uppercase tracking-widest mb-4">Hardware Utilization</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">
                                    <span>CPU Core Usage</span>
                                    <span>45%</span>
                                </div>
                                <div className="w-full h-1 bg-[#E0E5E9] rounded-full overflow-hidden">
                                    <div className="w-[45%] h-full bg-[#004E64]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">
                                    <span>Matrix Buffer</span>
                                    <span>22%</span>
                                </div>
                                <div className="w-full h-1 bg-[#E0E5E9] rounded-full overflow-hidden">
                                    <div className="w-[22%] h-full bg-teal-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
