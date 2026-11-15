"use client";

// Remembers how much detail the student asked for, between the Start screen and the session.
// Kept in this browser only. There are no accounts.

import { useSyncExternalStore } from "react";

import { DEFAULT_DETAIL, isDetail, type Detail } from "./topics";

const KEY = "milo.detail";
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(): Detail {
  try {
    const stored = window.localStorage.getItem(KEY);
    return isDetail(stored) ? stored : DEFAULT_DETAIL;
  } catch {
    return DEFAULT_DETAIL;
  }
}

export function writeDetail(detail: Detail) {
  try {
    window.localStorage.setItem(KEY, detail);
  } catch {
    // Storage can be blocked. The choice then lasts until the page reloads.
  }
  listeners.forEach((listener) => listener());
}

/** The chosen level of detail. Null on the server and during the first paint, before storage is read. */
export function useDetail(): Detail | null {
  return useSyncExternalStore<Detail | null>(subscribe, read, () => null);
}
