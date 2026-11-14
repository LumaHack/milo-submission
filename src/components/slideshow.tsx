"use client";

// A full-screen slideshow of one session: each board with what the student said and what Milo asked.
// It advances on its own. Arrow keys and the buttons step through it, Escape closes it.

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

import { levelInfo } from "@/lib/levels";
import type { Frame } from "@/lib/turn";

const SLIDE_MS = 3600;

export function Slideshow({ title, frames, onClose }: { title: string; frames: Frame[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = frames.length - 1;

  useEffect(() => {
    if (paused || index >= last) return;
    const timer = setTimeout(() => setIndex((value) => Math.min(last, value + 1)), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, last]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((value) => Math.min(last, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  const frame = frames[index];
  if (!frame) return null;
  const info = levelInfo(frame.level);
  const round =
    "press inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-line bg-card px-4 text-[15px] font-medium text-ink disabled:opacity-40";

  return (
    <div role="dialog" aria-modal="true" aria-label={`Slideshow: ${title}`} className="fixed inset-0 z-50 flex flex-col gap-4 bg-bg px-7 pt-5 pb-6 max-sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-xl font-semibold tracking-[-0.02em]">{title}</span>
          <span className="text-[15px] text-muted">
            Turn {frame.turn} of {frames.length}, {info.label.toLowerCase()}
          </span>
        </div>
        <button type="button" onClick={onClose} className={round}>
          Close
        </button>
      </div>

      {/* One bar per slide. The current one fills while the slide is on screen. */}
      <div className="flex gap-1.5" aria-hidden="true">
        {frames.map((entry, i) => (
          <span key={entry.turn} className="h-1 flex-1 overflow-hidden rounded-full bg-panel">
            <span
              key={`${i}-${index}-${paused}`}
              className="block h-full rounded-full bg-ink"
              style={{
                width: i < index ? "100%" : i === index && (paused || index === last) ? "100%" : "0%",
                animation: i === index && !paused && index < last ? `slide-fill ${SLIDE_MS}ms linear both` : undefined,
              }}
            />
          </span>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center rounded-panel bg-panel p-5">
        <div key={frame.turn} className="w-full max-w-[1040px] -rotate-[0.6deg] animate-board-in overflow-hidden rounded-[10px] shadow-paper">
          <img src={frame.imageUrl} alt={`Milo's drawing after turn ${frame.turn}`} className="block aspect-video w-full bg-paper object-cover" />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div key={frame.turn} className="flex min-w-0 flex-[1_1_420px] animate-rise flex-col gap-2">
          <p className="m-0 mr-auto max-w-[70ch] rounded-[18px_18px_4px_18px] bg-ink px-4 py-2.5 text-[15px] leading-[1.4] text-white">
            “{frame.said}”
          </p>
          <p className="m-0 mr-auto max-w-[70ch] rounded-[18px_18px_18px_4px] bg-panel px-4 py-2.5 text-[15px] leading-[1.4] font-medium">
            Milo, age {info.miloAge}: {frame.hint}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className={round} aria-label="Previous turn">
            Back
          </button>
          <button type="button" onClick={() => (index === last ? setIndex(0) : setPaused((value) => !value))} className={round}>
            {index === last ? "Play again" : paused ? "Play" : "Pause"}
          </button>
          <button type="button" onClick={() => setIndex((value) => Math.min(last, value + 1))} disabled={index === last} className={round} aria-label="Next turn">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
