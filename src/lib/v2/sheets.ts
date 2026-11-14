// "Your revision sheets": finished sheets the student chose to keep, in this browser's localStorage
// under milo.v2.sheets. Only the link to the picture is stored, not the picture, so a sheet stays
// small. Storage can be blocked or full, so every call is guarded.

import type { Level } from "@/lib/levels";

import type { Mode } from "./contract";

export type SavedSheet = {
  /** One sheet per topic and mode. Saving again replaces it. */
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
  /** Names the topic and mode in an address, to explain it again. */
  query: string;
};

const KEY = "milo.v2.sheets";
const MAX_SHEETS = 30;

export function sheetId(topicId: string, mode: Mode): string {
  return `${topicId}.${mode}`;
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

/** False when the browser's storage is full or blocked. */
export function saveSheet(sheet: SavedSheet): boolean {
  try {
    const others = loadSheets().filter((entry) => entry.id !== sheet.id);
    window.localStorage.setItem(KEY, JSON.stringify([sheet, ...others].slice(0, MAX_SHEETS)));
    return true;
  } catch {
    return false;
  }
}

export function removeSheet(id: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loadSheets().filter((sheet) => sheet.id !== id)));
  } catch {
    // Nothing to remove.
  }
}
