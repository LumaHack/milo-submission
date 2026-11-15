"use client";

// History: every session saved in this browser, newest first. Pick one to open its revision sheet.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Page, pill } from "@/components/ui";
import { openSession, useHistory } from "@/lib/history";
import { levelInfo } from "@/lib/levels";
import { DETAILS } from "@/lib/topics";

function when(savedAt: number): string {
  return new Date(savedAt).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export default function SheetsPage() {
  const router = useRouter();
  const history = useHistory();

  // Storage has not been read yet.
  if (history === undefined) return null;

  return (
    <Page
      gap="gap-6"
      header={
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <Link href="/" className="text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
              Milo
            </Link>
            <span className="text-[15px] text-muted">Your revision sheets</span>
          </div>
          <Link href="/" className={pill.dark}>
            Explain something
          </Link>
        </>
      }
    >
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 pt-4">
        <h1 className="m-0 text-[40px] leading-[1.08] font-medium tracking-[-0.035em]">Everything you have explained</h1>

        {history.length === 0 ? (
          <p className="m-0 text-base text-muted">Nothing yet. Explain a topic to Milo and its sheet will be kept here.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 rounded-panel bg-panel p-3">
            {history.map((session, i) => {
              const final = session.frames[session.frames.length - 1];
              if (!final) return null;
              const detail = DETAILS.find((entry) => entry.id === session.detail)?.label ?? session.detail;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => {
                    openSession(session.id);
                    router.push("/sheet");
                  }}
                  className="press flex animate-rise flex-col gap-3 rounded-card bg-card p-3 text-left text-ink"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <span className="block overflow-hidden rounded-tile border border-line bg-paper">
                    <img src={final.imageUrl} alt="" className="block aspect-video w-full object-cover" />
                  </span>
                  <span className="flex flex-col gap-1 px-1 pb-1">
                    <span className="text-lg leading-[1.2] font-medium tracking-[-0.02em]">{session.topicTitle}</span>
                    <span className="text-[13px] text-muted">
                      {levelInfo(final.level).label}, {session.frames.length} {session.frames.length === 1 ? "turn" : "turns"}, {detail.toLowerCase()}
                      {session.filmUrl ? ", with a film" : ""}
                    </span>
                    <span className="text-[13px] text-muted">{when(session.savedAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </Page>
  );
}
