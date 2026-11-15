"use client";

// Past sessions, kept in this browser. There are no accounts and no database.
// The Start screen stores the chosen topic here too, so the session knows what to explain.

import { useMemo, useSyncExternalStore } from "react";

import { DEFAULT_TOPIC, type Detail, type Topic } from "./topics";
import type { Frame } from "./turn";

export type StoredSession = {
  id: string;
  topicTitle: string;
  subject: string;
  detail: Detail;
  frames: Frame[];
  /** When the newest frame was saved, in milliseconds. */
  savedAt: number;
  /** A fal video of the first board turning into the last one, once the student has made it. */
  filmUrl?: string;
  /** A film that fal is still making. The sheet keeps checking on it, even after a reload. */
  filmJob?: { requestId: string; startedAt: number };
  /** For a topic made from notes: where each gap is in the notes, by gap label, such as "slide 6". */
  sources?: Record<string, string>;
};

/** The topics Milo found in the student's uploaded notes. The files themselves are never kept. */
export type StoredNotes = { files: string[]; topics: Topic[]; savedAt: number };

const HISTORY_KEY = "milo.history";
const OPEN_KEY = "milo.open";
const TOPIC_KEY = "milo.topic";
const NOTES_KEY = "milo.notes";
const MAX_SESSIONS = 24;

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked or full. The session still works without it.
  }
  listeners.forEach((listener) => listener());
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Adds the session, or replaces the stored copy with the same id. Newest first. */
export function saveSession(session: StoredSession) {
  const others = parse<StoredSession[]>(read(HISTORY_KEY), []).filter((entry) => entry.id !== session.id);
  write(HISTORY_KEY, JSON.stringify([session, ...others].slice(0, MAX_SESSIONS)));
  write(OPEN_KEY, session.id);
}

/** Which session the revision sheet should show. */
export function openSession(id: string) {
  write(OPEN_KEY, id);
}

export function chooseTopic(topic: Topic) {
  write(TOPIC_KEY, JSON.stringify(topic));
}

/** Keeps the topics from the student's notes, so they are still there after a reload. */
export function saveNotes(notes: StoredNotes) {
  write(NOTES_KEY, JSON.stringify(notes));
}

/** Back to the suggested topics. */
export function clearNotes() {
  try {
    window.localStorage.removeItem(NOTES_KEY);
  } catch {
    // Storage can be blocked. Nothing was kept then.
  }
  listeners.forEach((listener) => listener());
}

/** The topics from the student's notes. Null when there are none, undefined until storage has been read. */
export function useNotes(): StoredNotes | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => read(NOTES_KEY), () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    const stored = parse<StoredNotes | null>(raw, null);
    const topics = Array.isArray(stored?.topics)
      ? stored.topics.filter((topic) => Boolean(topic) && Array.isArray(topic.keyIdeas) && topic.keyIdeas.length > 0)
      : [];
    return stored && topics.length > 0 ? { ...stored, files: Array.isArray(stored.files) ? stored.files : [], topics } : null;
  }, [raw]);
}

/** Every stored session, newest first. Undefined until storage has been read. */
export function useHistory(): StoredSession[] | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => read(HISTORY_KEY), () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    const stored = parse<unknown>(raw, []);
    // Anything that is not a well-formed session is skipped, so one bad entry cannot break the pages.
    return (Array.isArray(stored) ? stored : []).filter(
      (entry): entry is StoredSession =>
        Boolean(entry) && typeof entry.id === "string" && typeof entry.topicTitle === "string" && Array.isArray(entry.frames),
    );
  }, [raw]);
}

/** The session the revision sheet shows: the one last opened, or the newest. */
export function useOpenSession(): StoredSession | null | undefined {
  const history = useHistory();
  const openId = useSyncExternalStore<string | null | undefined>(subscribe, () => read(OPEN_KEY), () => undefined);
  if (history === undefined || openId === undefined) return undefined;
  return history.find((entry) => entry.id === openId) ?? history[0] ?? null;
}

/** The topic picked on the Start screen. Undefined until storage has been read. */
export function useChosenTopic(): Topic | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => read(TOPIC_KEY), () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    const topic = parse<Topic | null>(raw, null);
    return topic && Array.isArray(topic.keyIdeas) && topic.keyIdeas.length > 0 ? topic : DEFAULT_TOPIC;
  }, [raw]);
}
