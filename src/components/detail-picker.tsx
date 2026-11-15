"use client";

// Start screen: how much detail Milo should hold you to. Three choices, so it stays quick to pick.

import { pill } from "@/components/ui";
import { useDetail, writeDetail } from "@/lib/detail-store";
import { DEFAULT_DETAIL, DETAILS } from "@/lib/topics";

export function DetailPicker() {
  const chosen = useDetail() ?? DEFAULT_DETAIL;
  const blurb = DETAILS.find((detail) => detail.id === chosen)?.blurb;

  return (
    <div className="flex flex-col gap-3.5">
      <span className="text-[15px] font-semibold">How much detail</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-2">
          {DETAILS.map((detail) => (
            <button
              key={detail.id}
              type="button"
              aria-pressed={detail.id === chosen}
              onClick={() => writeDetail(detail.id)}
              className={detail.id === chosen ? pill.dark : pill.light}
            >
              {detail.label}
            </button>
          ))}
        </div>
        <span key={chosen} className="animate-rise text-[15px] text-muted">
          {blurb}
        </span>
      </div>
    </div>
  );
}
