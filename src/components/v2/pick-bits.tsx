"use client";

// The pieces the start screen and the course page share: the coach or exam choice, the white topic
// card, Milo with his speech bubble, and the line that says how far a saved session got.
// Look from design/claude-design/StartV3.dc.html.

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { MiloPic, pill } from "@/components/ui";
import type { Mode } from "@/lib/v2/contract";
import { partTopicId, type Course } from "@/lib/v2/courses";
import { parseSession, saveMode, sessionKey } from "@/lib/v2/storage";
import { storedChanged, useStored, useStoredText } from "@/lib/v2/use-stored";

export const MODES: { id: Mode; label: string; description: string }[] = [
  { id: "coach", label: "Coach me", description: "When you are stuck, Milo gives you a hint, one small step at a time." },
  { id: "exam", label: "Exam mode", description: "The night before the exam. Milo only asks questions and never helps." },
];

const topicCard =
  "flex min-h-[190px] flex-[1_1_260px] flex-col justify-between gap-5 rounded-card bg-card p-6 text-left text-ink no-underline";

/**
 * Coach or exam, remembered in this browser. Starts as coach until the stored choice has been read.
 * What the student picks on this page wins over what is stored, so the choice still works in a
 * browser that blocks storage.
 */
export function useMode(): [Mode, (mode: Mode) => void] {
  const stored = useStored("milo.v2.mode");
  const [picked, setPicked] = useState<Mode | null>(null);
  const mode: Mode = picked ?? (stored === "exam" ? "exam" : "coach");
  return [
    mode,
    (next) => {
      setPicked(next);
      saveMode(next);
      storedChanged();
    },
  ];
}

export function ModeChoice({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const chosen = MODES.find((entry) => entry.id === mode) ?? MODES[0];
  return (
    <div className="flex max-w-[460px] flex-col gap-3.5">
      <span className="text-[15px] font-semibold">How should Milo help?</span>
      <div className="flex flex-wrap gap-2">
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === mode}
            className={entry.id === mode ? pill.dark : pill.light}
            onClick={() => onChange(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <p className="m-0 text-[15px] leading-normal text-muted">{chosen.description}</p>
    </div>
  );
}

/**
 * How far the saved session for this topic and mode got: "2 of 5 explained. Pick up where you left off".
 * `done` is true once every idea is explained: the card then opens the sheet instead of the session.
 * Null when nothing is saved.
 */
export function useProgress(topicId: string, mode: Mode, total: number): { text: string; done: boolean } | null {
  const raw = useStored(sessionKey(topicId, mode));
  return useMemo(() => {
    const saved = parseSession(raw);
    if (!saved || saved.frames.length === 0 || total === 0) return null;
    const clear = saved.live.ideas?.filter((status) => status === "clear").length ?? 0;
    return clear >= total
      ? { text: `All ${total} explained. See your sheet`, done: true }
      : { text: `${clear} of ${total} explained. Pick up where you left off`, done: false };
  }, [raw, total]);
}

/**
 * How much of a whole course is explained in this mode, over all its parts:
 * "9 of 25 ideas explained", or null when nothing is explained yet.
 */
export function useCourseProgress(course: Course, mode: Mode): string | null {
  const total = course.parts.reduce((sum, part) => sum + part.keyIdeas.length, 0);
  const clear = useStoredText(() => {
    let count = 0;
    for (const part of course.parts) {
      const saved = parseSession(window.localStorage.getItem(sessionKey(partTopicId(course.id, part.id), mode)));
      // A part can hold fewer ideas than a session saved before it was rebuilt. Never count past its size.
      count += Math.min(part.keyIdeas.length, saved?.live.ideas?.filter((status) => status === "clear").length ?? 0);
    }
    return String(count);
  }, "0");
  return clear === "0" ? null : `${clear} of ${total} ideas explained`;
}

/**
 * One white card in the grey panel. With an href it is a link, with onClick a button, with neither it
 * looks the same and goes nowhere (a topic that is not built yet).
 */
export function TopicCard({
  title,
  blurb,
  note,
  progress,
  href,
  onClick,
  onPreview,
}: {
  title: string;
  blurb: string;
  /** A small line under the blurb, such as "4 ideas". */
  note?: string;
  /** Saved progress. Shown instead of the note when there is some. */
  progress?: string | null;
  href?: string;
  onClick?: () => void;
  /** Called with true while the card is hovered or focused, so Milo can say something about it. */
  onPreview?: (on: boolean) => void;
}) {
  const body: ReactNode = (
    <>
      <span className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">{title}</span>
      <span className="flex flex-col gap-1.5">
        <span className="text-[15px] leading-normal text-muted">{blurb}</span>
        {progress ? (
          <span className="text-[13px] leading-[1.4] font-medium">{progress}</span>
        ) : (
          note && <span className="text-[13px] leading-[1.4] text-muted">{note}</span>
        )}
      </span>
    </>
  );
  const preview = onPreview
    ? {
        onMouseEnter: () => onPreview(true),
        onMouseLeave: () => onPreview(false),
        onFocus: () => onPreview(true),
        onBlur: () => onPreview(false),
      }
    : {};
  if (href) {
    return (
      <Link href={href} className={`press ${topicCard}`} {...preview}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={`press ${topicCard}`} onClick={onClick} {...preview}>
        {body}
      </button>
    );
  }
  return <div className={topicCard}>{body}</div>;
}

/** Milo aged 4 in his circle, with what he says in a grey bubble beside him. */
export function MiloSays({ line }: { line: string }) {
  return (
    <div className="flex max-w-[460px] flex-[1_1_340px] items-center gap-[18px]">
      <div aria-hidden="true" className="h-32 w-32 flex-none overflow-hidden rounded-full bg-milo max-sm:h-24 max-sm:w-24">
        <MiloPic level={1} />
      </div>
      <p
        key={line}
        aria-live="polite"
        className="m-0 animate-rise rounded-[18px_18px_18px_4px] bg-panel px-[18px] py-4 text-lg leading-normal font-medium max-sm:text-base"
      >
        {line}
      </p>
    </div>
  );
}
