"use client";

// The investigator's view of the cases on file. The cases live on the server (see server-store.ts),
// so an interview held on a witness's own device shows up here. This keeps a copy in memory, checks the
// server every few seconds, and sends each change the investigator makes.

import { useSyncExternalStore } from "react";

import type { CaseFile } from "./nolan";

const OPEN_KEY = "nolan.open";
const POLL_MS = 2500;

type Snapshot = {
  /** Undefined until the server has answered once. */
  cases: CaseFile[] | undefined;
  /** True when this device is not the investigator's, so the case file is not served to it. */
  refused: boolean;
  /** The address interview links start with. */
  linkBase: string;
  /** Which case the screens show. Kept in this browser. */
  openId: string | null;
};

let snapshot: Snapshot = { cases: undefined, refused: false, linkBase: "", openId: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
/** Changes on their way to the server. While there are any, what the server says is older than what we have. */
let writing = 0;
let lastWriteDone = 0;
/** Changes are sent one after another, so an older one can never land on top of a newer one. */
let queue: Promise<unknown> = Promise.resolve();

function set(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function readOpen(): string | null {
  try {
    return window.localStorage.getItem(OPEN_KEY);
  } catch {
    return null;
  }
}

async function refresh() {
  const started = Date.now();
  try {
    const response = await fetch("/api/cases", { cache: "no-store" });
    if (response.status === 403) {
      set({ cases: [], refused: true });
      return;
    }
    const data = (await response.json()) as { cases?: CaseFile[]; linkBase?: string };
    if (!response.ok || !Array.isArray(data.cases)) return;
    // A change made here since this request left is newer than its answer.
    if (writing > 0 || started < lastWriteDone) return;
    const same = JSON.stringify(data.cases) === JSON.stringify(snapshot.cases);
    if (!same || data.linkBase !== snapshot.linkBase || snapshot.refused) {
      set({ cases: same ? snapshot.cases : data.cases, linkBase: data.linkBase ?? "", refused: false });
    }
  } catch {
    // The server did not answer. Keep what we have and try again on the next tick.
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (listeners.size === 1) {
    snapshot = { ...snapshot, openId: readOpen() };
    void refresh();
    timer = setInterval(() => void refresh(), POLL_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function send(run: () => Promise<Response>) {
  writing += 1;
  queue = queue
    .then(run)
    .then((response) => {
      if (!response.ok) console.error("Nolan could not save a change:", response.status);
    })
    .catch((error) => console.error("Nolan could not save a change:", error))
    .finally(() => {
      writing -= 1;
      lastWriteDone = Date.now();
    });
}

function put(file: CaseFile) {
  send(() =>
    fetch(`/api/cases/${encodeURIComponent(file.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(file),
    }),
  );
}

/** Adds a case. Newest first. */
export function saveCase(file: CaseFile) {
  set({ cases: [file, ...(snapshot.cases ?? []).filter((entry) => entry.id !== file.id)] });
  put(file);
}

/** Changes one case. What witnesses said is never changed from here: the server keeps its own copy of that. */
export function updateCase(id: string, change: (file: CaseFile) => CaseFile) {
  const current = snapshot.cases?.find((entry) => entry.id === id);
  if (!current) return;
  const next = change(current);
  if (next === current) return;
  set({ cases: (snapshot.cases ?? []).map((entry) => (entry.id === id ? next : entry)) });
  put(next);
}

export function deleteCase(id: string) {
  set({ cases: (snapshot.cases ?? []).filter((entry) => entry.id !== id) });
  send(() => fetch(`/api/cases/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

/** Which case the screens show. Null shows the list of cases and the form for a new one. */
export function openCase(id: string | null) {
  try {
    if (id === null) window.localStorage.removeItem(OPEN_KEY);
    else window.localStorage.setItem(OPEN_KEY, id);
  } catch {
    // Storage can be blocked. The choice then lasts until the page reloads.
  }
  set({ openId: id });
}

const SERVER: Snapshot = { cases: undefined, refused: false, linkBase: "", openId: null };

function useSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
}

/** Every case on file, newest first. Undefined until the server has answered. */
export function useCases(): CaseFile[] | undefined {
  return useSnapshot().cases;
}

/** The open case. Undefined until the server has answered, null when none is open. */
export function useOpenCase(): CaseFile | null | undefined {
  const { cases, openId } = useSnapshot();
  if (cases === undefined) return undefined;
  return cases.find((entry) => entry.id === openId) ?? null;
}

/** True when this device is not the investigator's. */
export function useRefused(): boolean {
  return useSnapshot().refused;
}

/** The full interview link for a witness. */
export function useInterviewLink(): (token: string) => string {
  const { linkBase } = useSnapshot();
  return (token) => `${linkBase || window.location.origin}/interview/${token}`;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** The secret in an interview link. Long and random, because it is the only thing that guards an account. */
export function newToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "").slice(0, 40);
}
