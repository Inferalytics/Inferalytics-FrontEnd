import React from 'react';
import { AlertTriangle } from 'lucide-react';

/** Shown on results built from a dataset design that still holds estimated values. */
export default function EstimatesBanner({ share }: { share: number }) {
  const pct = Math.round(share * 100);
  return (
    <div
      role="note"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#F3D19C] bg-[#FFF8EB] text-[11.5px] text-[#8A5A1C]"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        Based on <strong>{pct}% estimated values</strong>. Upload your own data to firm this up.
      </span>
    </div>
  );
}
