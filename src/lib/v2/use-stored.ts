"use client";

// Reads one key of this browser's localStorage in a way that is safe to render on the server:
// the server and the first paint see null, then the stored value arrives. It also follows changes
// made in another tab. Used by the start screen and the course pages for saved progress.

import { useSyncExternalStore } from "react";

/** Fired by write() below, because the browser's own "storage" event skips the tab that wrote. */
const CHANGED = "milo:stored";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** The raw stored text, or null. Parse it with useMemo where it is used. */
export function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/**
 * A short text worked out from storage, for when one key is not enough (progress over a whole course).
 * `read` runs on every render and on every change, so it must be cheap and return the same text for
 * the same storage. The server and the first paint see `fallback`.
 */
export function useStoredText(read: () => string, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return read();
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
}

/** Tells every useStored on this page that storage changed. Call it after writing. */
export function storedChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}
