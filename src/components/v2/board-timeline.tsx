"use client";

// The boards of one explanation, shown as one sheet that grows. Every board sits in the same frame,
// and a timeline under it steps through them as the pointer moves along it, so the student watches
// the sheet build up turn by turn. The end page and "Your revision sheets" both use it.

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

export type BoardStep = {
  imageUrl: string;
  /** "First explanation", "Hint 1", "Final board". */
  label: string;
  /** What the student said in that turn. */
  said: string;
};

/**
 * Every board stacked in one frame, oldest at the bottom. The boards up to the chosen one show, so
 * stepping forward fades the next board in over the last, and stepping back fades it out again:
 * a cross-fade with no gap, never a jump.
 */
export function BoardStack({ steps, index, alt }: { steps: BoardStep[]; index: number; alt: string }) {
  // Pictures whose link has died. The paper says so instead of showing a broken image.
  const [gone, setGone] = useState<string[]>([]);
  const shown = steps[index];
  return (
    <div className="relative aspect-video w-full bg-paper">
      {steps.map((step, i) =>
        gone.includes(step.imageUrl) ? null : (
          <img
            key={`${i}-${step.imageUrl}`}
            src={step.imageUrl}
            alt={i === index ? alt : ""}
            aria-hidden={i !== index}
            draggable={false}
            onError={() => setGone((list) => [...list, step.imageUrl])}
            className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-200 ease-out"
            style={{ opacity: i <= index ? 1 : 0 }}
          />
        ),
      )}
      {shown && gone.includes(shown.imageUrl) && (
        <span className="absolute inset-0 flex items-center justify-center bg-paper p-4 text-center text-[13px] leading-normal text-muted">
          This picture is no longer online. Explain the topic again to draw a new one.
        </span>
      )}
    </div>
  );
}

/**
 * The timeline: one stop per board, in order. Moving the pointer along it shows each board in turn,
 * and leaving it goes back to the board that was chosen. A click, a tap or the keyboard chooses one.
 */
export function ScrubTrack({
  steps,
  index,
  onPreview,
  onPick,
}: {
  steps: BoardStep[];
  /** The board on show right now. */
  index: number;
  /** The board under the pointer, or null once the pointer has left. */
  onPreview: (index: number | null) => void;
  onPick: (index: number) => void;
}) {
  if (steps.length < 2) return null;
  return (
    <div className="flex flex-col">
      <ol
        aria-label="Timeline: step through your boards"
        className="m-0 flex list-none p-0"
        onPointerLeave={() => onPreview(null)}
      >
        {steps.map((step, i) => (
          <li key={i} className="flex min-w-0 flex-1">
            <button
              type="button"
              aria-label={`Board ${i + 1} of ${steps.length}: ${step.label}`}
              aria-pressed={i === index}
              // Only a mouse hovers. A finger taps, and the tap chooses the board.
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") onPreview(i);
              }}
              onFocus={() => onPreview(i)}
              onBlur={() => onPreview(null)}
              onClick={() => onPick(i)}
              className="flex min-h-11 w-full cursor-pointer items-center border-0 bg-transparent px-0.5 py-0"
            >
              <span className={`block w-full rounded ${i === index ? "h-2.5 bg-ink" : i < index ? "h-1.5 bg-ink" : "h-1.5 bg-line"}`} />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex justify-between gap-4 text-[13px] text-muted">
        <span>{steps[0].label}</span>
        <span className="max-sm:hidden">Move along the line to watch your sheet grow</span>
        <span>{steps[steps.length - 1].label}</span>
      </div>
    </div>
  );
}
