'use client';

import React, { useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
    Upload,
    FileSpreadsheet,
    FileText,
    FileJson,
    CheckCircle2,
    Clock,
    AlertCircle,
    Trash2,
    Download,
    Eye,
    MoreHorizontal,
    HardDrive,
    Files,
    ArrowUpRight,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
    id: string;
    name: string;
    type: string;
    size: string;
    rows: number;
    columns: number;
    status: 'completed' | 'processing' | 'failed';
    uploadedAt: string;
}

const mockUploads: UploadedFile[] = [
    { id: 'UP-001', name: 'regional_sales_q4.csv', type: 'CSV', size: '2.4 MB', rows: 12480, columns: 18, status: 'completed', uploadedAt: '2 hours ago' },
    { id: 'UP-002', name: 'forecast_data_2024.xlsx', type: 'XLSX', size: '8.1 MB', rows: 45200, columns: 32, status: 'completed', uploadedAt: '5 hours ago' },
    { id: 'UP-003', name: 'hierarchy_nodes.json', type: 'JSON', size: '1.2 MB', rows: 3200, columns: 12, status: 'processing', uploadedAt: '12 min ago' },
    { id: 'UP-004', name: 'annual_report_summary.docx', type: 'DOCX', size: '540 KB', rows: 0, columns: 0, status: 'failed', uploadedAt: '1 day ago' },
];

const supportedFormats = [
    { ext: 'CSV', icon: FileSpreadsheet, desc: 'Comma-separated values', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { ext: 'XLSX / XLS', icon: FileSpreadsheet, desc: 'Microsoft Excel', color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { ext: 'JSON', icon: FileJson, desc: 'Structured JSON data', color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { ext: 'DOCX / DOC', icon: FileText, desc: 'Word documents', color: 'text-violet-600 bg-violet-50 border-violet-100' },
];

export default function DataUploadPage() {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploads, setUploads] = useState<UploadedFile[]>(mockUploads);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            alert(`${files.length} file(s) received. Initiating data population pipeline...`);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            alert(`File "${files[0].name}" selected. Initiating data population pipeline...`);
        }
    };

    const handleRemoveFile = (id: string) => {
        setUploads(prev => prev.filter(f => f.id !== id));
    };

    return (
        <DashboardLayout>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept=".csv,.xlsx,.xls,.json,.docx,.doc"
                multiple
            />

            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Data Pipeline</span>
                        <div className="h-px w-8 bg-[#004E64]/10" />
                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">Step 1 of 4</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#004E64] uppercase tracking-tight">Data Upload</h1>
                    <p className="text-[#004E64]/60 text-sm font-medium">Upload your datasets to begin the optimization and forecasting pipeline.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => alert("Bulk upload mode activated.")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm font-bold text-[#004E64]/70 hover:bg-blue-50 transition-all shadow-sm"
                    >
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#004E64] rounded-xl text-sm font-bold text-white hover:bg-[#003E4F] transition-all shadow-lg"
                    >
                        <Upload size={16} />
                        Upload File
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'TOTAL FILES UPLOADED', value: uploads.length.toString(), sub: 'Active Batch', icon: Files },
                    { label: 'TOTAL DATA POINTS', value: '61,080', sub: '4 Sources', icon: HardDrive },
                    { label: 'PIPELINE STATUS', value: 'Ready', sub: 'All Systems Online', icon: ArrowUpRight },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest leading-none">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-black text-[#004E64]">{stat.value}</span>
                                <span className="text-[10px] font-bold text-teal-600 leading-none">{stat.sub}</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#E0E5E9] flex items-center justify-center text-[#004E64]/40">
                            <stat.icon size={20} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Upload Area */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "bg-white rounded-[2.5rem] p-12 shadow-sm border-4 border-dashed flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden group cursor-pointer transition-all",
                            isDragOver
                                ? "border-[#004E64]/30 bg-blue-50/50 scale-[1.01]"
                                : "border-[#004E64]/5 hover:border-[#004E64]/15"
                        )}
                    >
                        <div className="absolute inset-0 bg-blue-50/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <div className={cn(
                            "w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner transition-all",
                            isDragOver ? "bg-[#004E64] text-white scale-110" : "bg-[#E0E5E9] text-[#004E64]/30"
                        )}>
                            <Upload size={48} />
                        </div>
                        <h2 className="text-2xl font-black text-[#004E64] mb-2 uppercase italic tracking-tighter">
                            {isDragOver ? 'Drop Files Here' : 'Upload Your Data'}
                        </h2>
                        <p className="text-[#004E64]/50 mb-6 text-center max-w-sm font-medium">
                            Drag and drop your CSV, Excel, Word, or JSON files to populate the data pipeline for optimization.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                className="bg-[#004E64] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#003E4F] transition-all shadow-lg"
                            >
                                <Upload size={20} />
                                Browse Files
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); alert("JSON editor initialized. Enter structured data manually."); }}
                                className="bg-white text-[#004E64] border border-black/5 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-sm"
                            >
                                JSON Input
                            </button>
                        </div>
                    </div>

                    {/* Recent Uploads Table */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-[#004E64]">Recent Uploads</h2>
                            <button className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest hover:text-[#004E64]">View All Files</button>
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-black/5">
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">File Name</th>
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Type</th>
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Size</th>
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Rows x Cols</th>
                                    <th className="text-left py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Status</th>
                                    <th className="text-right py-4 text-[10px] font-bold text-[#004E64]/30 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {uploads.map((file) => (
                                    <tr key={file.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    file.type === 'CSV' ? "bg-emerald-50 text-emerald-600" :
                                                    file.type === 'XLSX' ? "bg-blue-50 text-blue-600" :
                                                    file.type === 'JSON' ? "bg-amber-50 text-amber-600" :
                                                    "bg-violet-50 text-violet-600"
                                                )}>
                                                    {file.type === 'JSON' ? <FileJson size={16} /> :
                                                     file.type === 'DOCX' ? <FileText size={16} /> :
                                                     <FileSpreadsheet size={16} />}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-[#004E64] block">{file.name}</span>
                                                    <span className="text-[10px] text-[#004E64]/40">{file.uploadedAt}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className="text-[10px] font-bold text-[#004E64]/60 bg-[#E0E5E9]/50 px-2 py-1 rounded">{file.type}</span>
                                        </td>
                                        <td className="py-4 text-xs font-medium text-[#004E64]/60">{file.size}</td>
                                        <td className="py-4 text-xs font-medium text-[#004E64]/60">
                                            {file.rows > 0 ? `${file.rows.toLocaleString()} x ${file.columns}` : '—'}
                                        </td>
                                        <td className="py-4">
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-1 rounded-md border inline-flex items-center gap-1",
                                                file.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                file.status === 'processing' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                "bg-red-50 text-red-600 border-red-100"
                                            )}>
                                                {file.status === 'completed' && <CheckCircle2 size={10} />}
                                                {file.status === 'processing' && <Clock size={10} className="animate-spin" />}
                                                {file.status === 'failed' && <AlertCircle size={10} />}
                                                {file.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="w-7 h-7 rounded-lg hover:bg-[#E0E5E9] flex items-center justify-center text-[#004E64]/40 hover:text-[#004E64]">
                                                    <Eye size={14} />
                                                </button>
                                                <button className="w-7 h-7 rounded-lg hover:bg-[#E0E5E9] flex items-center justify-center text-[#004E64]/40 hover:text-[#004E64]">
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveFile(file.id)}
                                                    className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#004E64]/40 hover:text-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Supported Formats */}
                    <div className="bg-[#004E64] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -mr-8 -mt-8" />
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Files size={20} className="text-teal-400" />
                            Supported Formats
                        </h2>

                        <div className="space-y-3">
                            {supportedFormats.map((format) => (
                                <div key={format.ext} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                                        <format.icon size={18} className="text-teal-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold">{format.ext}</span>
                                        <span className="text-[10px] text-blue-100/40">{format.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <span className="text-[10px] font-bold text-blue-100/40 uppercase tracking-widest block mb-2">Max File Size</span>
                            <span className="text-2xl font-black italic">50 MB</span>
                        </div>
                    </div>

                    {/* Upload Guidelines */}
                    <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                        <h4 className="text-xs font-bold text-[#004E64] uppercase tracking-widest mb-4">Upload Guidelines</h4>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-[#004E64]">Data Validation</p>
                                    <p className="text-[10px] text-[#004E64]/40">NaN and Infinity values are automatically sanitized during upload.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-[#004E64]">Batch Isolation</p>
                                    <p className="text-[10px] text-[#004E64]/40">All uploads are scoped to your active batch for data integrity.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-[#004E64]">Column Mapping</p>
                                    <p className="text-[10px] text-[#004E64]/40">Headers are preserved and mapped for vectorisation traceability.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
