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
};

const HISTORY_KEY = "milo.history";
const OPEN_KEY = "milo.open";
const TOPIC_KEY = "milo.topic";
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

/** Every stored session, newest first. Undefined until storage has been read. */
export function useHistory(): StoredSession[] | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => read(HISTORY_KEY), () => undefined);
  return useMemo(() => (raw === undefined ? undefined : parse<StoredSession[]>(raw, [])), [raw]);
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
