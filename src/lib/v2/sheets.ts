// "Your revision sheets": one sheet per attempt at a topic, in this browser's localStorage under
// milo.v2.sheets. A finished explanation is a revision sheet; an attempt the student started over
// from is kept too, as an earlier try (src/lib/v2/keep-sheet.ts). Explaining a topic again never
// replaces an older sheet. Only the link to the picture is stored, not the picture, so a sheet stays
// small. Storage can be blocked or full, so every call is guarded.

import type { Level } from "@/lib/levels";

import type { Mode } from "./contract";

export type SavedSheet = {
  /** One sheet per attempt. Saving the same attempt again replaces it. Sheets from before Sun 15 Nov are "<topic>.<mode>". */
  id: string;
  title: string;
  subject: string;
  mode: Mode;
  imageUrl: string;
  savedAt: number;
  level: Level;
  clear: number;
  total: number;
  /** Each idea the student explained, as its question, with their own words for it. */
  nailed: { question: string; words: string | null }[];
  /**
   * One entry per board, in order: the level reached and what the student said. Older sheets have none.
   * A sheet saved since Sun 15 Nov also keeps each board's picture link and name, for the timeline.
   */
  turns?: { level: Level; said: string; imageUrl?: string; label?: string }[];
  /** Names the topic and mode in an address, to explain it again. */
  query: string;
};

const KEY = "milo.v2.sheets";
const MAX_SHEETS = 30;

type Attempt = Pick<SavedSheet, "query" | "turns">;

/** The same attempt: the same topic and mode, the same number of boards, starting with the same words. */
function sameAttempt(a: Attempt, b: Attempt): boolean {
  const first = a.turns?.[0]?.said;
  return a.query === b.query && first !== undefined && a.turns?.length === b.turns?.length && first === b.turns?.[0]?.said;
}

/** The sheet already kept for this attempt, or null. */
export function findSheet(sheet: Attempt): SavedSheet | null {
  return loadSheets().find((entry) => sameAttempt(entry, sheet)) ?? null;
}

export function loadSheets(): SavedSheet[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as SavedSheet[]).filter((sheet) => sheet && typeof sheet.imageUrl === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Adds a sheet at the front, or replaces the one already kept for the same attempt and keeps its id.
 * Returns the sheet's id, or null when the browser's storage is full or blocked.
 */
export function saveSheet(sheet: Omit<SavedSheet, "savedAt">): string | null {
  try {
    const all = loadSheets();
    const id = all.find((entry) => sameAttempt(entry, sheet))?.id ?? sheet.id;
    const others = all.filter((entry) => entry.id !== id && !sameAttempt(entry, sheet));
    window.localStorage.setItem(KEY, JSON.stringify([{ ...sheet, id, savedAt: Date.now() }, ...others].slice(0, MAX_SHEETS)));
    return id;
  } catch {
    return null;
  }
}

export function removeSheet(id: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loadSheets().filter((sheet) => sheet.id !== id)));
  } catch {
    // Nothing to remove.
  }
}
