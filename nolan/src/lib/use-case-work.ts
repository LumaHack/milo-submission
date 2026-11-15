"use client";

// The two jobs that run after the interviews: comparing the accounts (Claude) and drawing the scenes (fal).
// Both store their result on the case, so a reload or a second screen never redoes the work.

import { useEffect, useState } from "react";

import {
  basisOf,
  currentComparison,
  finished,
  scenesAllowed,
  witnessLabel,
  type CaseFile,
  type CompareResult,
  type Comparison,
} from "./nolan";
import { updateCase } from "./store";

// React runs effects twice in development, and two screens can ask for the same work.
// These keep each job to one run at a time.
const comparing = new Set<string>();
const drawing = new Set<string>();

/** The comparison of the finished accounts. Runs it if the stored one is missing or out of date. */
export function useComparison(file: CaseFile): { comparison: Comparison | null; busy: boolean; error: string | null; retry: () => void } {
  const comparison = currentComparison(file);
  const [failed, setFailed] = useState<{ basis: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const basis = basisOf(file);
  const enough = finished(file).length >= 2;
  const error = failed && failed.basis === basis ? failed.message : null;

  useEffect(() => {
    if (comparison || !enough || comparing.has(basis)) return;
    comparing.add(basis);
    const witnesses = finished(file).map((witness) => ({
      id: witness.id,
      label: witnessLabel(file, witness.id),
      where: witness.where,
      facts: witness.facts,
    }));
    void (async () => {
      try {
        const response = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: file.title, details: file.details, witnesses }),
        });
        const data = (await response.json().catch(() => null)) as (CompareResult & { error?: string }) | null;
        if (!response.ok || !data?.rows) throw new Error(data?.error ?? "The comparison did not come back.");
        const { rows, askNext, sharedPrompt, sharedCaption, versions } = data;
        updateCase(file.id, (current) =>
          // The accounts may have changed while this ran. Then this result is already out of date.
          basisOf(current) === basis
            ? { ...current, comparison: { rows, askNext, sharedPrompt, sharedCaption, versions, basis, sharedImageUrl: null, images: {} } }
            : current,
        );
        setFailed(null);
      } catch (caught) {
        console.error("Comparing the accounts:", caught);
        setFailed({ basis, message: "The accounts could not be compared. Check the connection and try again." });
      } finally {
        comparing.delete(basis);
      }
    })();
    // The case is read when the job starts. `basis` changes whenever the accounts do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, enough, Boolean(comparison), attempt]);

  return {
    comparison,
    busy: !comparison && enough && !error,
    error,
    retry: () => {
      setFailed(null);
      setAttempt((value) => value + 1);
    },
  };
}

async function draw(prompt: string, previousImageUrl: string | null): Promise<string> {
  const response = await fetch("/api/draw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, previousImageUrl }),
  });
  const data = (await response.json().catch(() => null)) as { imageUrl?: string; error?: string } | null;
  if (!response.ok || !data?.imageUrl) throw new Error(data?.error ?? "The scene did not come back.");
  return data.imageUrl;
}

/** Waits until the browser has the picture, so a scene never appears half loaded. */
function loaded(url: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(url);
    image.onerror = () => resolve(url);
    image.src = url;
  });
}

/**
 * Draws the scenes for a comparison: the shared scene first, then each witness's version as an edit of it.
 * Nothing is drawn until every listed witness has been interviewed.
 */
export function useScenes(file: CaseFile, comparison: Comparison | null): { busy: boolean; error: string | null; retry: () => void } {
  const [failed, setFailed] = useState<{ basis: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const allowed = scenesAllowed(file);
  const basis = comparison?.basis ?? "";
  const missing = comparison
    ? !comparison.sharedImageUrl || comparison.versions.some((version) => !comparison.images[version.witnessId])
    : false;
  const error = failed && failed.basis === basis ? failed.message : null;

  useEffect(() => {
    if (!comparison || !allowed || !missing) return;
    const key = `${file.id}:${basis}`;
    if (drawing.has(key)) return;
    drawing.add(key);
    const store = (change: (current: Comparison) => Comparison) =>
      updateCase(file.id, (current) =>
        current.comparison && current.comparison.basis === basis ? { ...current, comparison: change(current.comparison) } : current,
      );
    void (async () => {
      try {
        const shared = comparison.sharedImageUrl ?? (await loaded(await draw(comparison.sharedPrompt, null)));
        store((current) => ({ ...current, sharedImageUrl: shared }));
        const results = await Promise.allSettled(
          comparison.versions
            .filter((version) => !comparison.images[version.witnessId])
            .map(async (version) => {
              const url = await loaded(await draw(version.prompt, shared));
              store((current) => ({ ...current, images: { ...current.images, [version.witnessId]: url } }));
            }),
        );
        const broken = results.find((result) => result.status === "rejected");
        if (broken) throw broken.reason;
        setFailed(null);
      } catch (caught) {
        console.error("Drawing the scenes:", caught);
        setFailed({ basis, message: "A scene did not come back. The ones already drawn are kept." });
      } finally {
        drawing.delete(key);
      }
    })();
    // The comparison is read when the job starts. `basis` and `missing` say when there is work to do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basis, allowed, missing, attempt]);

  return {
    busy: Boolean(comparison) && allowed && missing && !error,
    error,
    retry: () => {
      setFailed(null);
      setAttempt((value) => value + 1);
    },
  };
}
