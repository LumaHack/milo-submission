// What v2 keeps in the browser's localStorage: the session, so the student can pick up where they
// left off, and which look they prefer. Storage can be blocked or full, so every call is guarded
// and the app works without it.

import type { Mode } from "./contract";
import type { Memory, V2Frame, V2Live } from "./use-milo-v2";

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
};

export type Look = "new" | "classic";

const LOOK_KEY = "milo.v2.look";
/** Sessions older than this are not offered back. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const sessionKey = (topicId: string, mode: Mode) => `milo.v2.session.${topicId}.${mode}`;

export function saveSession(session: SavedSession): void {
  try {
    window.localStorage.setItem(sessionKey(session.topicId, session.mode), JSON.stringify(session));
  } catch {
    // Blocked or full. The session carries on without being saved.
  }
}

export function loadSession(topicId: string, mode: Mode): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(sessionKey(topicId, mode));
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedSession;
    if (saved.version !== 1 || Date.now() - saved.savedAt > MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
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
