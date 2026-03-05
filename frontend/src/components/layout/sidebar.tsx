'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BarChart3,
    History,
    Settings,
    ShieldCheck,
    ChevronRight,
    RefreshCw,
    LogOut,
    LayoutDashboard,
    TrendingUp,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizationSwitcher, UserButton, useUser } from '@clerk/nextjs';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: BarChart3, label: 'Optimization', href: '/optimization' },
    { icon: TrendingUp, label: 'Forecasting', href: '/analysis' },
    { icon: History, label: 'History', href: '/history' },
];

export function Sidebar() {
    const { user } = useUser();
    const pathname = usePathname();

    return (
        <div className="w-72 h-screen bg-[#004E64] flex flex-col sticky top-0 border-r border-white/5 shadow-2xl">
            {/* Logo Section */}
            <div className="p-8 pb-10">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
                        <TrendingUp size={24} className="text-[#004E64]" />
                    </div>
                    <span className="text-xl font-black text-white tracking-tighter uppercase italic">InferaLytics</span>
                </div>
            </div>

            {/* Navigation Section */}
            <div className="flex-1 px-5 overflow-y-auto scrollbar-hide">
                <p className="text-[10px] font-bold text-blue-100/40 uppercase tracking-[0.2em] mb-4 px-2">Main Console</p>
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                                    isActive
                                        ? "bg-white/10 text-white shadow-inner"
                                        : "text-blue-100/60 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon size={20} className={cn(
                                    "transition-colors",
                                    isActive ? "text-white" : "text-blue-100/40 group-hover:text-white"
                                )} />
                                <span className="text-sm font-semibold">{item.label}</span>
                                {isActive && (
                                    <div className="absolute left-[-20px] w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <p className="text-[10px] font-bold text-blue-100/40 uppercase tracking-[0.2em] mt-10 mb-4 px-2">System</p>
                <nav className="space-y-1">
                    <Link
                        href="/settings"
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative",
                            pathname === '/settings'
                                ? "bg-white/10 text-white shadow-inner"
                                : "text-blue-100/60 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <Settings size={20} className={cn(
                            "transition-colors",
                            pathname === '/settings' ? "text-white" : "text-blue-100/40 group-hover:text-white"
                        )} />
                        <span className="text-sm font-semibold">Settings</span>
                        {pathname === '/settings' && (
                            <div className="absolute left-[-20px] w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        )}
                    </Link>
                </nav>
            </div>

            <div className="p-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <UserButton />
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-white truncate">
                            {user?.fullName || user?.username || 'Authenticated User'}
                        </span>
                        <span className="text-[10px] text-blue-100/40 truncate">
                            {user?.primaryEmailAddress?.emailAddress || 'User Session'}
                        </span>
                    </div>
                </div>
                <Link href="/login" title="Switch Account">
                    <RefreshCw size={14} className="text-blue-100/40 hover:text-white cursor-pointer transition-colors" />
                </Link>
            </div>
        </div>
    );
}
