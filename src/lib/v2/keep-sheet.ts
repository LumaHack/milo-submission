// Turning a saved session into a sheet in "Your revision sheets" (src/lib/v2/sheets.ts).
// Two moments do it: the end page, once every idea is explained, and every button that throws a
// session away to start over ("Start fresh", "Start again", "Explain it again"). So starting over
// never loses the boards the student already made: that attempt stays in "Your revision sheets",
// with its timeline, as a finished sheet or as an earlier try.

import type { Level } from "@/lib/levels";

import { findSheet, saveSheet, type SavedSheet } from "./sheets";
import { clearSession, loadSession, type SavedSession, type SavedSummary } from "./storage";
import type { Target } from "./target";
import type { V2Frame } from "./use-milo-v2";

/** A name for each board in the timeline, from what changed in that turn. */
export function frameLabel(frame: V2Frame, previous: V2Frame | undefined, isLast: boolean): string {
  if (isLast && frame.level === 4) return "Final board";
  if (!previous) return "First explanation";
  const gained = frame.clear - previous.clear;
  if (gained === 1) return "One more idea clear";
  if (gained > 1) return `${gained} more ideas clear`;
  if (frame.hintStep > 0) return `Hint ${frame.hintStep}`;
  return "Added detail";
}

type Extra = {
  /** The picture for the sheet. Left out, it is the tidy sheet if the session has one, else the last board. */
  image?: string | null;
  /** The student's own words per idea. Left out, they come from the session's kept summary. */
  words?: SavedSummary["nailed"] | null;
};

/** The sheet a saved session makes, or null when Milo has not drawn anything yet. */
export function sheetFromSession(target: Target, saved: SavedSession, extra: Extra = {}): Omit<SavedSheet, "savedAt"> | null {
  const { topic, mode } = target;
  const frames = saved.frames;
  const last = frames.at(-1);
  if (!last) return null;
  const clearIdeas = topic.keyIdeas.filter((_, i) => saved.live.ideas?.[i] === "clear");
  const tidy = saved.polished?.from === last.imageUrl ? saved.polished.url : null;
  const keptWords = saved.summary && saved.summary.turns === saved.turns.length ? saved.summary.nailed : null;
  const words = extra.words !== undefined ? extra.words : keptWords;
  const level: Level = saved.live.level ?? last.level ?? 1;
  return {
    // Only used when this attempt is not in the list yet. saveSheet keeps the id an attempt already has.
    id: `${topic.id}.${mode}.${saved.savedAt.toString(36)}`,
    title: topic.title,
    subject: topic.subject,
    mode,
    imageUrl: extra.image ?? tidy ?? last.imageUrl,
    level,
    clear: clearIdeas.length,
    total: topic.keyIdeas.length,
    nailed: clearIdeas.map((idea) => ({
      question: idea.gapLabel,
      words: words?.find((entry) => entry.id === idea.id)?.words ?? null,
    })),
    turns: frames.map((entry, i) => ({
      level: entry.level,
      said: entry.said,
      imageUrl: entry.imageUrl,
      label: i === frames.length - 1 ? "Final board" : frameLabel(entry, frames[i - 1], false),
    })),
    query: target.query,
  };
}

/**
 * Throws the saved session for this topic and mode away, so the next one starts from nothing, but
 * first keeps its boards in "Your revision sheets". A session with no board has nothing to keep.
 */
export function retireSession(target: Target): void {
  const { topic, mode } = target;
  const saved = loadSession(topic.id, mode);
  const sheet = saved ? sheetFromSession(target, saved) : null;
  // A finished sheet the student removed from their sheets stays removed.
  const removed = Boolean(saved?.sheetKept) && sheet !== null && findSheet(sheet) === null;
  if (sheet && !removed) saveSheet(sheet);
  clearSession(topic.id, mode);
}
