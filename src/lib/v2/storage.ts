// What v2 keeps in the browser's localStorage: the session, so the student can pick up where they
// left off, and which look they prefer. Storage can be blocked or full, so every call is guarded
// and the app works without it.

import type { Mode } from "./contract";
import type { Memory, V2Frame, V2Live } from "./use-milo-v2";

/** The student's own words for each idea they explained clearly, picked once for the end page. */
export type SavedSummary = {
  nailed: { id: string; words: string | null }[];
  /** The labels the finished sheet should carry, for the tidy sheet. */
  labels?: string[];
  /** How many student turns the summary covers. A later turn makes it out of date. */
  turns: number;
};

export type SavedSession = {
  version: 1;
  topicId: string;
  mode: Mode;
  savedAt: number;
  /** Seconds of session time so far, pauses not counted. */
  elapsed: number;
  turns: string[];
  scored: number;
  memory: Memory;
  board: { url: string | null; prompt: string | null };
  frames: V2Frame[];
  live: V2Live;
  hintsUsed: number;
  /** The end page's tidy copy of the last board, and the board it was made from. */
  polished?: { url: string; from: string };
  /** The end page's summary. Both extras are dropped when the session carries on. */
  summary?: SavedSummary;
};

export type Look = "new" | "classic";

const LOOK_KEY = "milo.v2.look";
const MODE_KEY = "milo.v2.mode";
/** Sessions older than this are not offered back. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const sessionKey = (topicId: string, mode: Mode) => `milo.v2.session.${topicId}.${mode}`;

/** A saved session as it sits in storage, or null if it is missing, damaged or too old. */
export function parseSession(raw: string | null): SavedSession | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SavedSession;
    if (saved.version !== 1 || Date.now() - saved.savedAt > MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveSession(session: SavedSession): void {
  try {
    window.localStorage.setItem(sessionKey(session.topicId, session.mode), JSON.stringify(session));
  } catch {
    // Blocked or full. The session carries on without being saved.
  }
}

export function loadSession(topicId: string, mode: Mode): SavedSession | null {
  try {
    return parseSession(window.localStorage.getItem(sessionKey(topicId, mode)));
  } catch {
    return null;
  }
}

/** Adds the end page's extras to a saved session, if it is still there. */
export function updateSession(topicId: string, mode: Mode, patch: Pick<SavedSession, "polished" | "summary">): void {
  try {
    const key = sessionKey(topicId, mode);
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    window.localStorage.setItem(key, JSON.stringify({ ...(JSON.parse(raw) as SavedSession), ...patch }));
  } catch {
    // Blocked or full. The end page still shows what it has.
  }
}

export function clearSession(topicId: string, mode: Mode): void {
  try {
    window.localStorage.removeItem(sessionKey(topicId, mode));
  } catch {
    // Nothing to clear.
  }
}

export function loadLook(): Look {
  try {
    return window.localStorage.getItem(LOOK_KEY) === "classic" ? "classic" : "new";
  } catch {
    return "new";
  }
}

export function saveLook(look: Look): void {
  try {
    window.localStorage.setItem(LOOK_KEY, look);
  } catch {
    // The look still switches for this visit.
  }
}

/** Coach or exam, as last chosen on the start screen or a course page. */
export function loadMode(): Mode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "exam" ? "exam" : "coach";
  } catch {
    return "coach";
  }
}

export function saveMode(mode: Mode): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // The mode still applies for this visit.
  }
}
