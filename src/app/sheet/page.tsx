"use client";

// Revision sheet: the final board, the explanation in the student's words, and how the level climbed.
// Port of design/claude-design/SheetV3.dc.html. It shows the last session saved in this browser.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { MiloPic, Page, pill } from "@/components/ui";
import { levelInfo } from "@/lib/levels";
import { getTopic } from "@/lib/topics";
import { STORAGE_KEY, type StoredSession } from "@/lib/use-milo-session";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function SheetPage() {
  const raw = useSyncExternalStore(subscribe, readStored, () => null);
  const stored = useMemo<StoredSession | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }, [raw]);

  const frames = stored?.frames ?? [];
  const final = frames[frames.length - 1];
  const topic = getTopic(stored?.topicId ?? "cell");
  const milo = final ? levelInfo(final.level) : null;

  return (
    <Page
      header={
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <Link href="/" className="text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
              Milo
            </Link>
            <span className="text-[15px] text-muted">Revision sheets, biology</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {final && (
              <a href={final.imageUrl} download="milo-revision-sheet.jpg" target="_blank" rel="noreferrer" className={pill.light}>
                Save sheet
              </a>
            )}
            <Link href="/session" className={pill.dark}>
              {final ? "Explain it again" : "Explain a topic"}
            </Link>
          </div>
        </>
      }
    >
      <main className="flex flex-1 flex-wrap gap-3 rounded-panel bg-panel p-3">
        <section aria-label="Your drawing" className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[40px] leading-[1.08] font-medium tracking-[-0.035em]">{topic?.title ?? "Revision sheet"}</h1>
            <p className="m-0 text-base text-muted">
              {final
                ? "Your revision sheet, built in the order you explained it."
                : "You have not finished a session in this browser yet."}
            </p>
          </div>
          <div className="flex min-h-80 flex-1 items-center justify-center rounded-well bg-panel p-5">
            {final ? (
              <div className="w-full max-w-[820px] -rotate-[0.6deg] overflow-hidden rounded-[10px] shadow-paper">
                <img
                  src={final.imageUrl}
                  alt={`Your revision sheet for ${topic?.title ?? "this topic"}`}
                  className="block aspect-video w-full bg-paper object-cover"
                />
              </div>
            ) : (
              <p className="m-0 max-w-[36ch] text-center text-[15px] text-muted">
                Explain a topic to Milo and the last drawing lands here.
              </p>
            )}
          </div>
        </section>

        {final && milo && (
          <section aria-label="What you said" className="flex max-w-[420px] min-w-0 flex-[1_1_320px] flex-col gap-3 max-md:max-w-none">
            <div className="flex flex-col gap-4 rounded-card bg-card p-6">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">In your words</h2>
              <ol className="m-0 flex list-decimal flex-col gap-3 pl-[22px] text-[15px] leading-normal">
                {frames.map((frame) => (
                  <li key={frame.turn}>{frame.said}</li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-3.5 rounded-card bg-card p-6">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">How you got here</h2>
              <div className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-x-3 gap-y-2.5 text-sm">
                {frames.map((frame, i) => {
                  const last = i === frames.length - 1;
                  return (
                    <div key={frame.turn} className="contents">
                      <span className="text-muted">Turn {frame.turn}</span>
                      <span className="h-1.5 rounded bg-panel">
                        <span
                          className={`block h-full rounded ${last ? "bg-ink" : "bg-faint"}`}
                          style={{ width: `${frame.level * 25}%` }}
                        />
                      </span>
                      <span className={last ? "font-semibold" : ""}>{levelInfo(frame.level).label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto flex items-center gap-4 rounded-card bg-card px-6 py-5">
              <div aria-hidden="true" className="h-[52px] w-[52px] flex-none overflow-hidden rounded-full bg-milo">
                <MiloPic level={final.level} />
              </div>
              <p className="m-0 text-[15px] leading-normal text-muted">
                {final.level === 4
                  ? "Milo is 18 now. He has stopped asking the dumb questions."
                  : `Milo is ${milo.miloAge} now. He still has questions.`}
              </p>
            </div>
          </section>
        )}
      </main>
    </Page>
  );
}
