'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
    User,
    Shield,
    Bell,
    Database,
    Key,
    Monitor,
    Check,
    ChevronRight,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsSections = [
    { id: 'profile', name: 'User Profile', icon: User, desc: 'Manage your personal identity' },
    { id: 'security', name: 'Security & Auth', icon: Shield, desc: 'Passwords and JWT settings' },
    { id: 'notifications', name: 'Notifications', icon: Bell, desc: 'Model convergence alerts' },
    { id: 'system', name: 'System Status', icon: Monitor, desc: 'API and Database health' },
];

import { useUser } from '@clerk/nextjs';

export default function SettingsPage() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = React.useState('profile');
    const [isUploading, setIsUploading] = React.useState(false);
    const avatarInputRef = React.useRef<HTMLInputElement>(null);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && user) {
            try {
                setIsUploading(true);
                await user.setProfileImage({ file });
                alert("Avatar updated successfully!");
            } catch (error) {
                console.error("Error updated avatar:", error);
                alert("Failed to update avatar. Please try again.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <DashboardLayout>
            <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                onChange={handleAvatarChange}
                accept="image/*"
            />
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#004E64] uppercase tracking-tight">System Settings</h1>
                    <p className="text-[#004E64]/60 text-sm font-medium">Configure your mathematical environment and account preferences.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    {settingsSections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveTab(section.id)}
                            className={cn(
                                "w-full flex items-center gap-4 p-5 rounded-[2rem] transition-all text-left group",
                                activeTab === section.id ? "bg-white shadow-md border border-black/5" : "hover:bg-white/50"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                activeTab === section.id ? "bg-[#004E64] text-white" : "bg-white text-[#004E64]/30 group-hover:bg-[#E0E5E9]/50"
                            )}>
                                <section.icon size={24} />
                            </div>
                            <div className="flex-1">
                                <p className={cn("text-sm font-bold", activeTab === section.id ? "text-[#004E64]" : "text-[#004E64]/60")}>{section.name}</p>
                                <p className="text-[10px] font-medium text-[#004E64]/30 uppercase tracking-widest">{section.desc}</p>
                            </div>
                            <ChevronRight size={18} className={cn(activeTab === section.id ? "text-[#004E64]/20" : "text-transparent")} />
                        </button>
                    ))}

                    <div className="mt-8 bg-[#004E64] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        {/* ... existing premium card ... */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8" />
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck className="text-teal-400" size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Premium Entity</span>
                        </div>
                        <p className="text-lg font-bold mb-1">Corporate Tier</p>
                        <p className="text-xs text-blue-100/50 mb-6 font-medium leading-relaxed">Multi-dimensional matrix processing and 1e-9 tolerance support enabled.</p>
                        <button className="w-full bg-white text-[#004E64] py-3 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all active:scale-95">
                            Manage Subscription
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-black/5 animate-in fade-in duration-500">
                            <h2 className="text-xl font-bold text-[#004E64] mb-8 uppercase tracking-tight">Main Profile Settings</h2>

                            <div className="space-y-8">
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-teal-400 p-[3px] shadow-lg overflow-hidden">
                                        {user?.imageUrl ? (
                                            <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover rounded-[1.8rem]" />
                                        ) : (
                                            <div className="w-full h-full rounded-[1.8rem] bg-white p-1">
                                                <div className="w-full h-full rounded-[1.6rem] bg-[#E0E5E9] flex items-center justify-center text-[#004E64] font-black text-2xl uppercase italic tracking-tighter shadow-inner">
                                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="bg-[#004E64] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#003E4F] transition-all shadow-md disabled:opacity-50"
                                        >
                                            {isUploading ? "Uploading..." : "Change Avatar"}
                                        </button>
                                        <button
                                            onClick={() => alert("Avatar removal will be synced with your Clerk profile.")}
                                            className="bg-white text-[#004E64] border border-black/5 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all shadow-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest ml-1">Full Identity</label>
                                        <input type="text" defaultValue={user?.fullName || ''} className="w-full bg-[#E0E5E9]/30 border-none rounded-2xl py-3 px-5 text-sm font-bold text-[#004E64] focus:ring-1 focus:ring-[#004E64]/20 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest ml-1">Username Alias</label>
                                        <input type="text" defaultValue={user?.username || 'user.alias'} className="w-full bg-[#E0E5E9]/30 border-none rounded-2xl py-3 px-5 text-sm font-bold text-[#004E64] focus:ring-1 focus:ring-[#004E64]/20 outline-none" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest ml-1">Secure Email Gateway</label>
                                        <input type="email" defaultValue={user?.primaryEmailAddress?.emailAddress || ''} className="w-full bg-[#E0E5E9]/30 border-none rounded-2xl py-3 px-5 text-sm font-bold text-[#004E64] focus:ring-1 focus:ring-[#004E64]/20 outline-none" />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-black/5 flex justify-end gap-3">
                                    <button className="px-6 py-3 text-xs font-bold text-[#004E64]/40 hover:text-[#004E64] transition-colors">Discard</button>
                                    <button
                                        onClick={() => alert("System preferences committed to secure vault.")}
                                        className="bg-[#004E64] text-white px-8 py-3 rounded-2xl text-xs font-bold hover:bg-[#003E4F] transition-all shadow-lg shadow-[#004E64]/20 flex items-center gap-2">
                                        <Check size={16} />
                                        Commit Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-black/5 animate-in slide-in-from-bottom-2 duration-500">
                            <h2 className="text-xl font-bold text-[#004E64] mb-8 uppercase tracking-tight">Security & Authentication</h2>
                            <div className="space-y-6">
                                <div className="p-6 bg-[#E0E5E9]/30 rounded-3xl border border-black/5">
                                    <p className="text-xs font-bold text-[#004E64] mb-1">Two-Factor Authentication</p>
                                    <p className="text-[10px] text-[#004E64]/50 mb-4 font-medium uppercase tracking-tighter">Adds an extra layer of security to your account.</p>
                                    <button className="bg-[#004E64]/5 text-[#004E64] px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-[#004E64]/10 transition-all">Enable 2FA</button>
                                </div>
                                <div className="p-6 bg-[#004E64]/5 rounded-3xl border border-[#004E64]/10">
                                    <p className="text-xs font-bold text-[#004E64] mb-1">Global JWT Rotation</p>
                                    <p className="text-[10px] text-[#004E64]/50 mb-4 font-medium uppercase tracking-tighter">Automate session secret rotation every 24 hours.</p>
                                    <div className="w-10 h-5 bg-[#004E64] rounded-full relative p-1 cursor-pointer">
                                        <div className="w-3 h-3 bg-white rounded-full absolute right-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-black/5 animate-in slide-in-from-bottom-2 duration-500">
                            <h2 className="text-xl font-bold text-[#004E64] mb-8 uppercase tracking-tight">Notification Channels</h2>
                            <div className="space-y-4">
                                {['Model Convergence Alerts', 'Batch Completion Reports', 'System Health Pulses'].map((label) => (
                                    <div key={label} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-2xl hover:bg-blue-50/50 transition-all">
                                        <span className="text-xs font-bold text-[#004E64]">{label}</span>
                                        <div className="w-10 h-5 bg-[#E0E5E9] rounded-full relative p-1 cursor-pointer">
                                            <div className="w-3 h-3 bg-white rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(activeTab === 'system' || activeTab === 'profile') && (
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-black/5">
                            <h2 className="text-xl font-bold text-[#004E64] mb-8 uppercase tracking-tight">Backend Infrastructure Status</h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                            <Database size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-emerald-900">SQLite Clusters</p>
                                            <p className="text-[10px] text-emerald-700 font-medium tracking-tight">Active: users.db, batching.db, optimization.db</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Operational</span>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center">
                                            <Key size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-blue-900">JWT Token Repository</p>
                                            <p className="text-[10px] text-blue-700 font-medium tracking-tight">Auth Secret: RS256_RSA_2048 (Configured)</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
