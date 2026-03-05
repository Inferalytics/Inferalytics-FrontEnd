'use client';

import { SignIn } from "@clerk/nextjs";
import { TrendingUp } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#E0E5E9] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#004E64]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#004E64]/5 rounded-full blur-3xl" />

            <div className="w-full max-w-[450px] flex flex-col gap-8 relative z-10">
                <div className="flex flex-col items-center gap-4 mb-2">
                    <div className="w-16 h-16 bg-[#004E64] rounded-3xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                        <TrendingUp size={32} className="text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-[#004E64] uppercase tracking-tighter italic">InferaLytics</h1>
                        <p className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest mt-1">Mathematical Infrastructure Core</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-black/5 overflow-hidden flex flex-col items-center">
                    <SignIn
                        path="/login"
                        routing="path"
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "bg-transparent shadow-none w-full p-8",
                                headerTitle: "text-[#004E64] font-black uppercase tracking-tight text-xl mb-1",
                                headerSubtitle: "text-[#004E64]/40 font-bold text-xs uppercase tracking-widest",
                                socialButtonsBlockButton: "border-[#E0E5E9] border-2 rounded-2xl hover:bg-slate-50 transition-all",
                                socialButtonsBlockButtonText: "text-[#004E64] font-bold text-xs",
                                dividerLine: "bg-[#E0E5E9]",
                                dividerText: "text-[#004E64]/30 font-black text-[10px]",
                                formFieldLabel: "text-[#004E64]/60 font-bold text-[10px] uppercase tracking-widest ml-1",
                                formFieldInput: "bg-[#E0E5E9]/50 border-none rounded-2xl py-3 px-5 text-sm font-bold text-[#004E64] focus:ring-2 focus:ring-[#004E64]/10 outline-none transition-all",
                                formButtonPrimary: "bg-[#004E64] hover:bg-[#003E4F] py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-[#004E64]/20 transition-all active:scale-[0.98]",
                                footerActionText: "text-[#004E64]/40 text-[10px] font-bold",
                                footerActionLink: "text-[#004E64] font-black hover:text-teal-600 transition-colors",
                                identityPreviewText: "text-[#004E64] font-bold",
                                identityPreviewEditButtonIcon: "text-[#004E64]",
                                formFieldSuccessText: "text-emerald-500",
                                formFieldErrorText: "text-red-500"
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
