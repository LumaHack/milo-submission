"use client";

// "Your revision sheets": the finished sheets the student saved from the end page, kept in this
// browser (src/lib/v2/sheets.ts). A list of cards; clicking one opens it big, with the student's own
// words beside it. Layout from the v3 revision sheet (design/claude-design/SheetV3.dc.html).

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { browser } from "react-dom";

import { MiloPic, Page, pill } from "@/components/ui";
import { levelInfo } from "@/lib/levels";
import { loadSheets, removeSheet, type SavedSheet } from "@/lib/v2/sheets";

function savedOn(sheet: SavedSheet): string {
  return new Date(sheet.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function SheetsView() {
  // The sheets live in this browser's storage, so this only renders in the browser.
  use(browser("Saved sheets are kept in localStorage."));
  const [sheets, setSheets] = useState(() => loadSheets());
  const [openId, setOpenId] = useState<string | null>(null);
  const open = sheets.find((sheet) => sheet.id === openId) ?? null;

  return (
    <Page
      header={
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <Link href="/v2" className="inline-flex min-h-11 items-center text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
              Milo
            </Link>
            <span className="text-[15px] text-muted">Your revision sheets</span>
          </div>
          <Link href="/v2" className={pill.dark}>
            Explain a topic
          </Link>
        </>
      }
    >
      <main className="flex flex-1 flex-col gap-3 rounded-panel bg-panel p-3">
        {sheets.length === 0 ? (
          <section className="flex w-full max-w-[720px] flex-col gap-2 self-center rounded-card bg-card p-7 max-sm:p-5">
            <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">No revision sheets yet</h1>
            <p className="m-0 text-base leading-normal text-muted">
              Explain a topic to Milo. When the session ends, press “Save sheet” and it is kept here.
            </p>
          </section>
        ) : (
          <>
            {open && (
              <OpenSheet
                key={open.id}
                sheet={open}
                onClose={() => setOpenId(null)}
                onRemove={() => {
                  removeSheet(open.id);
                  setSheets(loadSheets());
                  setOpenId(null);
                }}
              />
            )}
            <section aria-label="Saved sheets" className="flex flex-wrap gap-3">
              {sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  aria-pressed={sheet.id === openId}
                  onClick={() => {
                    setOpenId(sheet.id === openId ? null : sheet.id);
                    window.scrollTo({ top: 0 });
                  }}
                  className={`press flex max-w-[460px] min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-card border-2 bg-card p-4 text-left text-ink ${
                    sheet.id === openId ? "border-ink" : "border-card"
                  }`}
                >
                  <span className="block overflow-hidden rounded-tile border border-line bg-paper">
                    <SheetPicture src={sheet.imageUrl} alt="" />
                  </span>
                  <span className="flex flex-col gap-1 px-1">
                    <span className="text-lg leading-[1.3] font-semibold tracking-[-0.01em]">{sheet.title}</span>
                    <span className="text-[13px] leading-[1.4] text-muted">
                      {sheet.subject}, {sheet.clear} of {sheet.total} explained, {sheet.mode === "exam" ? "exam mode" : "coach mode"},
                      saved {savedOn(sheet)}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          </>
        )}
      </main>
    </Page>
  );
}

/** The saved picture. If its link has died, the paper says so instead of showing a broken image. */
function SheetPicture({ src, alt }: { src: string; alt: string }) {
  const [gone, setGone] = useState(false);
  if (gone) {
    return (
      <span className="flex aspect-video w-full items-center justify-center bg-paper p-4 text-center text-[13px] leading-normal text-muted">
        This picture is no longer online. Explain the topic again to draw a new one.
      </span>
    );
  }
  return <img src={src} alt={alt} onError={() => setGone(true)} className="block aspect-video w-full bg-paper object-cover" />;
}

function OpenSheet({ sheet, onClose, onRemove }: { sheet: SavedSheet; onClose: () => void; onRemove: () => void }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    if (!confirmRemove) return;
    const timer = setTimeout(() => setConfirmRemove(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmRemove]);
  const milo = levelInfo(sheet.level);
  const turns = sheet.turns ?? [];

  return (
    <div className="flex animate-rise flex-wrap items-start gap-3">
      <section aria-label={sheet.title} className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[40px] leading-[1.08] font-medium tracking-[-0.035em]">{sheet.title}</h1>
            <p className="m-0 text-base text-muted">Your revision sheet, built in the order you explained it.</p>
          </div>
          <button type="button" className={pill.light} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="flex items-center justify-center rounded-well bg-panel p-5 max-sm:p-3">
          <div className="w-full max-w-[820px] -rotate-[0.6deg] overflow-hidden rounded-[10px] shadow-paper">
            <SheetPicture src={sheet.imageUrl} alt={`Your revision sheet for ${sheet.title}`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* A plain link, so the session page loads from scratch. */}
          <a href={`/v2/session?${sheet.query}`} className={pill.dark}>
            Explain it again
          </a>
          <a href={sheet.imageUrl} target="_blank" rel="noreferrer" className={pill.light}>
            Open the picture
          </a>
          <button
            type="button"
            className={confirmRemove ? pill.dark : pill.light}
            onClick={() => {
              if (confirmRemove) onRemove();
              else setConfirmRemove(true);
            }}
          >
            {confirmRemove ? "Sure? Remove it" : "Remove"}
          </button>
        </div>
      </section>

      <aside className="flex max-w-[420px] min-w-0 flex-[1_1_320px] flex-col gap-3 max-md:max-w-none">
        <section className="flex flex-col gap-4 rounded-card bg-card p-6">
          <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">In your words</h2>
          {sheet.nailed.length > 0 ? (
            <ol className="m-0 flex list-decimal flex-col gap-3 pl-[22px] text-[15px] leading-normal">
              {sheet.nailed.map((entry) => (
                <li key={entry.question}>
                  {/* The student's own words lead. The question they answer sits under them. */}
                  <span className="block">{entry.words ? `“${entry.words}”` : entry.question}</span>
                  {entry.words && <span className="block text-sm leading-[1.4] text-muted">{entry.question}</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-[15px] leading-normal text-muted">No idea was fully explained in this session yet.</p>
          )}
        </section>

        {turns.length > 0 && (
          <section className="flex flex-col gap-3.5 rounded-card bg-card p-6">
            <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">How you got here</h2>
            <div className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-x-3 gap-y-2.5 text-sm">
              {turns.map((turn, i) => {
                const last = i === turns.length - 1;
                return (
                  <div key={i} className="contents">
                    <span className="text-muted">Turn {i + 1}</span>
                    <span className="h-1.5 rounded bg-panel">
                      <span className={`block h-full rounded ${last ? "bg-ink" : "bg-faint"}`} style={{ width: `${turn.level * 25}%` }} />
                    </span>
                    <span className={last ? "font-semibold" : ""}>{levelInfo(turn.level).label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="flex items-center gap-4 rounded-card bg-card px-6 py-5">
          <div aria-hidden="true" className="h-[52px] w-[52px] flex-none overflow-hidden rounded-full bg-milo">
            <MiloPic level={sheet.level} />
          </div>
          <p className="m-0 text-[15px] leading-normal text-muted">
            {sheet.level === 4
              ? "Milo is 18 now. He has stopped asking the dumb questions."
              : `Milo is ${milo.miloAge} now. He still has questions.`}
          </p>
        </section>
      </aside>
    </div>
  );
}
