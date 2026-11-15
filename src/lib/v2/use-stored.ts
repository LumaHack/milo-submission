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

/** Tells every useStored on this page that storage changed. Call it after writing. */
export function storedChanged(): void {
  window.dispatchEvent(new Event(CHANGED));
}
