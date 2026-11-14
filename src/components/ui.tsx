// Small shared pieces of the v3 look. See docs/DESIGN.md before adding a new one.

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";

import { levelInfo, type Level } from "@/lib/levels";

/** Class strings for the two pill buttons. Every tappable thing is at least 44px tall. */
export const pill = {
  light:
    "press inline-flex min-h-11 items-center rounded-full border border-line bg-card px-5 text-[15px] font-medium text-ink no-underline",
  dark: "press inline-flex min-h-11 items-center rounded-full border border-ink bg-ink px-5 text-[15px] font-medium text-white no-underline",
};

/** The page frame every screen shares: header, content, and the credits line. */
export function Page({
  header,
  children,
  gap = "gap-4",
  credits,
}: {
  header: ReactNode;
  children: ReactNode;
  gap?: string;
  /** Replaces the usual credits where they would not be true, such as the scripted run. */
  credits?: string;
}) {
  return (
    <div className={`flex min-h-screen flex-col ${gap} bg-bg px-7 pt-5 pb-6 text-ink max-sm:px-4`}>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">{header}</header>
      {children}
      <Credits text={credits} />
    </div>
  );
}

/**
 * Credits only the tools that really run. Add Anam or Adaption here once they are wired,
 * not before: the credits must be true.
 */
export function Credits({ text }: { text?: string }) {
  return (
    <footer className="text-[13px] text-muted">{text ?? "Voice by ElevenLabs. Drawing by fal. Brain by Claude."}</footer>
  );
}

/** Milo at one of his four ages. The pictures are real fal output, see scripts/gen_milo.py. */
export function MiloPic({ level }: { level: Level }) {
  const info = levelInfo(level);
  return (
    <img
      key={level}
      src={info.miloImage}
      alt={`Milo, age ${info.miloAge}`}
      className="block h-full w-full animate-rise object-cover object-[50%_25%]"
    />
  );
}
