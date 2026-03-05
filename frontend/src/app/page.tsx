'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useUser, UserButton } from '@clerk/nextjs';

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <main className="min-h-screen bg-[#E0E5E9] flex flex-col items-center justify-center p-8 relative">
      <div className="absolute top-8 right-8">
        {isLoaded && isSignedIn && <UserButton />}
      </div>

      <div className="flex flex-col items-center text-center max-w-2xl">
        <div className="w-16 h-16 bg-[#004E64] rounded-2xl flex items-center justify-center shadow-xl mb-6">
          <ShieldCheck className="text-white w-10 h-10" />
        </div>
        <h1 className="text-5xl font-black text-[#004E64] mb-4 tracking-tighter">
          INFERALYTICS
        </h1>
        <p className="text-[#004E64]/60 text-lg font-medium mb-12">
          Premium Mathematical Optimization and Predictive Analysis Platform.
          Harness the power of Newton-Raphson and Holt-Winters algorithms.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          {isLoaded && isSignedIn ? (
            <Link
              href="/dashboard"
              className="bg-[#004E64] text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#003E4F] transition-all shadow-lg active:scale-95 text-lg"
            >
              Enter Workspace Dashboard
              <ArrowRight size={20} />
            </Link>
          ) : isLoaded ? (
            <>
              <Link
                href="/login"
                className="bg-[#004E64] text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#003E4F] transition-all shadow-lg active:scale-95 text-lg"
              >
                Establish Uplink (Sign In)
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/signup"
                className="bg-white text-[#004E64] px-8 py-4 rounded-2xl font-bold border border-black/5 flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-sm active:scale-95 text-lg"
              >
                Initialize Profile
              </Link>
            </>
          ) : (
            <div className="h-14 w-48 bg-[#004E64]/10 animate-pulse rounded-2xl" />
          )}
        </div>

        <div className="mt-20 grid grid-cols-3 gap-12 border-t border-black/5 pt-12">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-[#004E64]">v2.4</span>
            <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Optimized Engine</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-[#004E64]">1e-6</span>
            <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Convergence Tol.</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-[#004E64]">99%</span>
            <span className="text-[10px] font-bold text-[#004E64]/40 uppercase tracking-widest">Model Accuracy</span>
          </div>
        </div>
      </div>
    </main>
  );
}
