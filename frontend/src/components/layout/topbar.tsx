'use client';

import { LogOut, Search, Bell, MessageSquare } from 'lucide-react';
import { useUser, OrganizationSwitcher, UserButton, SignOutButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export function Topbar() {
    const { user } = useUser();
    const router = useRouter();

    return (
        <header className="h-20 bg-white/50 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-8 sticky top-0 z-40">
            <div className="flex items-center gap-6 flex-1 max-w-2xl">
                {/* Organization Switcher */}
                <div className="bg-[#004E64]/5 p-1 rounded-xl border border-black/5">
                    <OrganizationSwitcher
                        appearance={{
                            elements: {
                                organizationSwitcherTrigger: "text-[#004E64] hover:bg-[#004E64]/5 px-3 py-1.5 rounded-lg border-none shadow-none",
                                organizationPreviewMainIdentifier: "text-[#004E64] font-bold text-xs",
                                organizationPreviewSecondaryIdentifier: "text-[#004E64]/40 text-[10px]",
                            }
                        }}
                    />
                </div>

                <div className="relative w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#004E64]/30 group-focus-within:text-[#004E64] transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search batches..."
                        className="w-full bg-white border border-black/5 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#004E64]/10 transition-all placeholder:text-[#004E64]/20"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-full bg-white border border-black/5 text-[#004E64]/60 hover:text-[#004E64] hover:bg-blue-50 transition-all shadow-sm">
                        <MessageSquare size={18} />
                    </button>
                    <button className="p-2.5 rounded-full bg-white border border-black/5 text-[#004E64]/60 hover:text-[#004E64] hover:bg-blue-50 transition-all shadow-sm relative">
                        <Bell size={18} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    </button>
                </div>

                <div className="h-8 w-px bg-black/5" />

                <div className="flex items-center gap-3">
                    <UserButton
                        appearance={{
                            elements: {
                                userButtonTrigger: "p-0",
                                userButtonAvatarBox: "w-10 h-10 rounded-full border-2 border-[#004E64]/10 shadow-md hover:scale-105 transition-all"
                            }
                        }}
                    />
                    <div className="flex flex-col items-start leading-none gap-1 hidden md:flex">
                        <span className="text-xs font-bold text-[#004E64]">{user?.fullName || 'User Session'}</span>
                        <span className="text-[10px] font-semibold text-[#004E64]/40 uppercase tracking-tighter">{user?.primaryEmailAddress?.emailAddress || 'Premium Account'}</span>
                    </div>
                </div>

                <div className="h-8 w-px bg-black/5 mx-2" />

                <SignOutButton redirectUrl="/">
                    <button className="p-2.5 rounded-xl text-[#004E64]/60 hover:text-red-500 hover:bg-red-50 transition-all group" title="Sign Out">
                        <LogOut size={18} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                </SignOutButton>
            </div>
        </header>
    );
}
