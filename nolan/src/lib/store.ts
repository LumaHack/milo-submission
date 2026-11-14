"use client";

// Cases, kept in this browser. There are no accounts and no database.

import { useMemo, useSyncExternalStore } from "react";

import type { CaseFile, Witness } from "./nolan";

const CASES_KEY = "nolan.cases";
const OPEN_KEY = "nolan.open";
const MAX_CASES = 12;

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

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked or full. The page still works until it is reloaded.
  }
  listeners.forEach((listener) => listener());
}

function parseCases(raw: string | null): CaseFile[] {
  if (!raw) return [];
  try {
    const stored = JSON.parse(raw) as unknown;
    // Anything that is not a well-formed case is skipped, so one bad entry cannot break the pages.
    return (Array.isArray(stored) ? stored : []).filter(
      (entry): entry is CaseFile =>
        Boolean(entry) && typeof entry.id === "string" && typeof entry.title === "string" && Array.isArray(entry.witnesses) && Array.isArray(entry.details),
    );
  } catch {
    return [];
  }
}

/** Adds the case, or replaces the stored copy with the same id. Newest first. */
export function saveCase(file: CaseFile) {
  const others = parseCases(read(CASES_KEY)).filter((entry) => entry.id !== file.id);
  write(CASES_KEY, JSON.stringify([file, ...others].slice(0, MAX_CASES)));
}

/** Changes one stored case in place. Reads the newest copy first, so two quick updates cannot overwrite each other. */
export function updateCase(id: string, change: (file: CaseFile) => CaseFile) {
  const cases = parseCases(read(CASES_KEY));
  const index = cases.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  cases[index] = change(cases[index]);
  write(CASES_KEY, JSON.stringify(cases));
}

export function updateWitness(caseId: string, witnessId: string, change: (witness: Witness) => Witness) {
  updateCase(caseId, (file) => ({
    ...file,
    witnesses: file.witnesses.map((witness) => (witness.id === witnessId ? change(witness) : witness)),
  }));
}

/** Which case the screens show. Null shows the list of cases and the form for a new one. */
export function openCase(id: string | null) {
  write(OPEN_KEY, id);
}

export function deleteCase(id: string) {
  write(CASES_KEY, JSON.stringify(parseCases(read(CASES_KEY)).filter((entry) => entry.id !== id)));
}

/** Every stored case, newest first. Undefined until storage has been read. */
export function useCases(): CaseFile[] | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, () => read(CASES_KEY), () => undefined);
  return useMemo(() => (raw === undefined ? undefined : parseCases(raw)), [raw]);
}

/** The open case. Undefined until storage has been read, null when none is open. */
export function useOpenCase(): CaseFile | null | undefined {
  const cases = useCases();
  const openId = useSyncExternalStore<string | null | undefined>(subscribe, () => read(OPEN_KEY), () => undefined);
  if (cases === undefined || openId === undefined) return undefined;
  return cases.find((entry) => entry.id === openId) ?? null;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
