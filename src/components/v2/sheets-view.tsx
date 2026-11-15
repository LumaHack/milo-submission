"use client";

// "Your revision sheets": the finished sheets the student saved from the end page, kept in this
// browser (src/lib/v2/sheets.ts). A list of cards; clicking one opens it big, with the student's own
// words beside it and a timeline to watch it grow. /v2/sheets?open=<sheet id> opens on that sheet.
// Under them, "Still in progress": every session with a board and an idea left, in either mode, to pick up.
// Layout from the v3 revision sheet (design/claude-design/SheetV3.dc.html).

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { browser } from "react-dom";

import { MiloPic, Page, pill } from "@/components/ui";
import { levelInfo } from "@/lib/levels";
import type { Mode } from "@/lib/v2/contract";
import { loadCourses, partTopicId } from "@/lib/v2/courses";
import { loadSheets, removeSheet, type SavedSheet } from "@/lib/v2/sheets";
import { loadSession } from "@/lib/v2/storage";
import { V2_TOPICS } from "@/lib/v2/topics";

import { BoardStack, ScrubTrack, type BoardStep } from "./board-timeline";

type Unfinished = {
  key: string;
  title: string;
  subject: string;
  mode: Mode;
  clear: number;
  total: number;
  imageUrl: string;
  /** Names the topic and mode in an address, to open its session. */
  query: string;
  savedAt: number;
};

/**
 * Every saved session that has a board and still has an idea to explain, newest first: built-in topics
 * and the parts of the student's courses, in both modes. The start screen only shows the chosen mode.
 */
function loadUnfinished(): Unfinished[] {
  const found: Unfinished[] = [];
  const look = (topicId: string, title: string, subject: string, total: number, where: string) => {
    for (const mode of ["coach", "exam"] as const) {
      const saved = loadSession(topicId, mode);
      const last = saved?.frames.at(-1);
      if (!saved || !last || total === 0) continue;
      const clear = saved.live.ideas?.filter((status) => status === "clear").length ?? 0;
      if (clear >= total) continue;
      found.push({ key: `${topicId}.${mode}`, title, subject, mode, clear, total, imageUrl: last.imageUrl, query: `${where}&mode=${mode}`, savedAt: saved.savedAt });
    }
  };
  for (const topic of V2_TOPICS) {
    if (topic.ready) look(topic.id, topic.title, topic.subject, topic.keyIdeas.length, `topic=${encodeURIComponent(topic.id)}`);
  }
  for (const course of loadCourses()) {
    for (const part of course.parts) {
      const where = `course=${encodeURIComponent(course.id)}&part=${encodeURIComponent(part.id)}`;
      look(partTopicId(course.id, part.id), part.title, course.title, part.keyIdeas.length, where);
    }
  }
  return found.sort((a, b) => b.savedAt - a.savedAt);
}

function savedOn(sheet: SavedSheet): string {
  return new Date(sheet.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function SheetsView() {
  // The sheets live in this browser's storage, so this only renders in the browser.
  use(browser("Saved sheets are kept in localStorage."));
  const params = useSearchParams();
  const [sheets, setSheets] = useState(() => loadSheets());
  // The end page links here with the sheet it just saved. With only one sheet, that one opens.
  const [openId, setOpenId] = useState<string | null>(() => params.get("open") ?? (sheets.length === 1 ? sheets[0].id : null));
  const open = sheets.find((sheet) => sheet.id === openId) ?? null;
  const [unfinished] = useState(() => loadUnfinished());

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
              Explain a topic to Milo. Once every idea is explained, your sheet is saved here by itself.
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
        {unfinished.length > 0 && (
          <section aria-label="Still in progress" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-2 pt-3">
              <h2 className="m-0 text-[15px] font-semibold">Still in progress</h2>
              <span className="text-[13px] text-muted">Pick one up where you left off. Milo remembers what you told him.</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {unfinished.map((entry) => (
                // A plain link, so the session page loads from scratch and asks: pick up, or start fresh.
                <a
                  key={entry.key}
                  href={`/v2/session?${entry.query}`}
                  className="press flex max-w-[460px] min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-card border-2 border-card bg-card p-4 text-left text-ink no-underline"
                >
                  <span className="block overflow-hidden rounded-tile border border-line bg-paper">
                    <SheetPicture src={entry.imageUrl} alt="" />
                  </span>
                  <span className="flex flex-col gap-1 px-1">
                    <span className="text-lg leading-[1.3] font-semibold tracking-[-0.01em]">{entry.title}</span>
                    <span className="text-[13px] leading-[1.4] text-muted">
                      {entry.subject}, {entry.clear} of {entry.total} explained, {entry.mode === "exam" ? "exam mode" : "coach mode"}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>
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
  // Every board of the session, when the sheet kept them: the timeline steps through these.
  const last = turns.length - 1;
  const steps: BoardStep[] =
    turns.length > 1 && turns.every((turn) => turn.imageUrl)
      ? turns.map((turn, i) => ({
          imageUrl: i === last ? sheet.imageUrl : (turn.imageUrl ?? sheet.imageUrl),
          label: turn.label ?? `Turn ${i + 1}`,
          said: turn.said,
        }))
      : [];
  // null shows the finished sheet. A number is a board the student chose, or the one under the pointer.
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const index = hovered ?? picked ?? last;
  const step = steps[index] ?? null;

  return (
    <div className="flex flex-wrap items-stretch gap-3">
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
        <div className="flex flex-1 items-center justify-center rounded-well bg-panel p-5 max-sm:p-3">
          <div className="w-full max-w-[820px] -rotate-[0.6deg] overflow-hidden rounded-[10px] shadow-paper">
            {steps.length > 0 ? (
              <BoardStack
                steps={steps}
                index={index}
                alt={index === last ? `Your revision sheet for ${sheet.title}` : `Your drawing after turn ${index + 1}: ${step?.said}`}
              />
            ) : (
              <SheetPicture src={sheet.imageUrl} alt={`Your revision sheet for ${sheet.title}`} />
            )}
          </div>
        </div>
        {step && (
          <>
            <ScrubTrack steps={steps} index={index} onPreview={setHovered} onPick={(i) => setPicked(i === last ? null : i)} />
            {/* Two lines tall whatever is said, so nothing under it moves while the pointer runs along the timeline. */}
            <p className="m-0 line-clamp-2 min-h-[46px] text-[15px] leading-normal text-muted">
              <span className="font-semibold text-ink">{step.label}</span>. “{step.said}”
            </p>
          </>
        )}
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
                const final = i === turns.length - 1;
                return (
                  <div key={i} className="contents">
                    <span className="text-muted">Turn {i + 1}</span>
                    <span className="h-1.5 rounded bg-panel">
                      <span className={`block h-full rounded ${final ? "bg-ink" : "bg-faint"}`} style={{ width: `${turn.level * 25}%` }} />
                    </span>
                    <span className={final ? "font-semibold" : ""}>{levelInfo(turn.level).label}</span>
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
