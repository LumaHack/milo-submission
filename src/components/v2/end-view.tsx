"use client";

// Milo v2's end page, the "Aha!" moment (docs/V2.md, "The end page"). It reads the session saved in
// this browser and shows: the final board, tidied once by fal's careful model; Milo at his final age;
// a summary; what the student nailed, in their own words; what to work on, as questions only; and
// every board in order, to click through or replay. Milo never gives an answer here either.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Page, pill } from "@/components/ui";
import { formatClock } from "@/lib/demo";
import { levelInfo, type Level } from "@/lib/levels";
import type { DrawResult, IdeaStatus } from "@/lib/turn";
import { topicToPart } from "@/lib/v2/part";
import { saveSheet, sheetId } from "@/lib/v2/sheets";
import { clearSession, updateSession, type SavedSession } from "@/lib/v2/storage";
import type { V2SummaryResult } from "@/lib/v2/summary";
import type { Target } from "@/lib/v2/target";

import { MiloStill } from "./milo-still";
import { frameLabel, IDEA_WORD, IdeaIcon } from "./session-view-v2";

/**
 * The instruction for the careful model. It tidies the last board and must not change what it says.
 * - The title is given word for word: left to itself, the model made one up, with dates the student never said.
 * - The labels are given too, when the summary could list them: the fast model sometimes leaves a
 *   garbled or leftover word on a live board, and "change nothing" would keep it on the finished sheet.
 */
function polishPrompt(title: string, labels: string[]): string {
  const quote = (text: string) => `'${text.replace(/'/g, "’")}'`;
  const writing =
    labels.length >= 2
      ? `The sheet must carry exactly these labels, in this order, each one written once and in full, spelled exactly as given: ${labels.map(quote).join(", ")}. ` +
        "Erase the old writing and write each label again, straight and horizontal, never sideways, in the place " +
        "where it was. Nothing else is written on the paper: no repeated or leftover words and no question marks. "
      : "Do not add, remove or change any label or word. ";
  return (
    "Keep the same drawing, the same layout and the same colours. Make it clean and organised like a finished revision sheet: " +
    `neat lines, label boxes, and one title top left, spelled exactly: ${quote(title)}. ` +
    "Give every part the same care: labels the same size, all easy to read. " +
    writing +
    "Do not add parts, shapes, dates or numbers that are not already on the paper. " +
    "No people, faces, flags, symbols or weapons."
  );
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // A call that never answers must not leave the page waiting for ever.
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error ?? `${url} failed (${response.status}).`);
  return data;
}

/** Resolves once the browser has the image, so the old board stays up until the new one can show. */
function preload(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The drawing did not load."));
    image.src = url;
  });
}

/** What to work on comes in this order: what to check, what is half there, what is not started. */
const WORK_ORDER: IdeaStatus[] = ["wrong", "vague", "missing"];

export function EndView({ target, saved, voice }: { target: Target; saved: SavedSession | null; voice: string }) {
  const { topic } = target;
  const sessionHref = `/v2/session?${target.query}${voice}`;

  if (!saved || (saved.frames.length === 0 && saved.turns.length === 0)) {
    return (
      <Page header={<Wordmark subject={target.subjectLine} />}>
        <main className="flex flex-1 items-start justify-center rounded-panel bg-panel p-3">
          <section className="flex w-full max-w-[720px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-5">
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">Nothing to show yet</h1>
              <p className="m-0 text-base leading-normal text-muted">
                This page shows your drawing and how it grew, once you have explained {topic.about} to Milo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FreshSessionLink href={sessionHref}>Explain it to Milo</FreshSessionLink>
              <Link href={target.homeHref} className={pill.light}>
                Pick another topic
              </Link>
            </div>
          </section>
        </main>
      </Page>
    );
  }
  return <Ended target={target} saved={saved} sessionHref={sessionHref} />;
}

/**
 * Opens the session page with a full page load, as a plain link. Next keeps pages it navigated away
 * from alive in the background and brings them back for the same address, so a client-side link
 * could reopen the session that just ended instead of starting a new one.
 */
function FreshSessionLink({ href, onClick, children }: { href: string; onClick?: () => void; children: ReactNode }) {
  return (
    <a href={href} className={pill.dark} onClick={onClick}>
      {children}
    </a>
  );
}

function Wordmark({ subject }: { subject: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
      <Link href="/v2" className="inline-flex min-h-11 items-center text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
        Milo
      </Link>
      <span className="text-[15px] text-muted">{subject}</span>
    </div>
  );
}

function Ended({ target, saved, sessionHref }: { target: Target; saved: SavedSession; sessionHref: string }) {
  const { topic, mode } = target;
  const frames = saved.frames;
  const last = frames.at(-1) ?? null;

  const statuses = topic.keyIdeas.map((_, i) => saved.live.ideas?.[i] ?? "missing");
  const clearIdeas = topic.keyIdeas.filter((_, i) => statuses[i] === "clear");
  const openIdeas = WORK_ORDER.flatMap((status) =>
    topic.keyIdeas.flatMap((idea, i) => (statuses[i] === status ? [{ idea, status }] : [])),
  );
  const total = topic.keyIdeas.length;
  const clear = clearIdeas.length;
  const complete = total > 0 && clear === total;
  const level: Level = saved.live.level ?? last?.level ?? 1;
  // The board is still when the page opens. It only lands with its animation once it changes.
  const [moved, setMoved] = useState(false);

  // The tidy copy of the last board, kept from an earlier visit if it was made from this same board.
  // Only a finished explanation gets one. An unfinished board stays as Milo drew it: asked to tidy
  // one, the careful model filled the gaps with things the student never said (docs/V2.md).
  const kept = complete && last && saved.polished?.from === last.imageUrl ? saved.polished.url : null;
  const willTidy = complete && Boolean(last) && !kept;
  const [polished, setPolished] = useState<string | null>(kept);
  const [tidying, setTidying] = useState(willTidy);

  // The student's own words for what they nailed. Asked once, then kept with the saved session.
  const keptSummary = saved.summary && saved.summary.turns === saved.turns.length ? saved.summary : null;
  const willSummarise = !keptSummary && clear > 0 && saved.turns.length > 0;
  const [nailed, setNailed] = useState<V2SummaryResult["nailed"] | null>(keptSummary?.nailed ?? null);
  const [summarising, setSummarising] = useState(willSummarise);

  // When the page opens: the summary first, then the tidy sheet, which uses the labels the summary found.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const open = async () => {
      let labels = keptSummary?.labels ?? [];
      if (willSummarise) {
        // Every board's drawing instruction, if this session kept them all. They say which labels belong on the sheet.
        const drawPrompts = frames.map((entry) => entry.drawPrompt ?? "");
        try {
          const result = await postJson<V2SummaryResult>(
            "/api/v2/summary",
            {
              topicId: topic.id,
              ...(topic.custom ? { part: topicToPart(topic) } : {}),
              studentTurns: saved.turns,
              ideas: topic.keyIdeas.map((idea, i) => ({ id: idea.id, status: statuses[i] })),
              ...(willTidy && drawPrompts.every(Boolean) ? { drawPrompts } : {}),
            },
            30_000,
          );
          labels = result.labels ?? [];
          setNailed(result.nailed);
          updateSession(topic.id, mode, { summary: { nailed: result.nailed, labels, turns: saved.turns.length } });
        } catch {
          // Without the summary the ideas are still listed, just without the student's words.
        } finally {
          setSummarising(false);
        }
      }
      if (!willTidy || !last) return;
      try {
        const drawn = await postJson<DrawResult>(
          "/api/v2/draw",
          { prompt: polishPrompt(topic.title, labels), previousImageUrl: last.imageUrl, final: true },
          75_000,
        );
        await preload(drawn.imageUrl);
        setMoved(true);
        setPolished(drawn.imageUrl);
        updateSession(topic.id, mode, { polished: { url: drawn.imageUrl, from: last.imageUrl } });
      } catch {
        // The last board is a fine sheet as it is. It stays, and nothing is said.
      } finally {
        setTidying(false);
      }
    };
    void open();
    // Runs once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // null shows the final board. A number shows an earlier board the student clicked.
  const [picked, setPickedState] = useState<number | null>(null);
  const setPicked = (next: number | null) => {
    setMoved(true);
    setPickedState(next);
  };
  const [replaying, setReplaying] = useState(false);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopReplay = () => {
    if (replayTimer.current) clearInterval(replayTimer.current);
    replayTimer.current = null;
    setReplaying(false);
  };
  useEffect(
    () => () => {
      if (replayTimer.current) clearInterval(replayTimer.current);
    },
    [],
  );
  const replay = () => {
    if (frames.length < 2) return;
    stopReplay();
    let step = 0;
    setPicked(0);
    setReplaying(true);
    replayTimer.current = setInterval(() => {
      step += 1;
      if (step >= frames.length) {
        stopReplay();
        setPicked(null);
        return;
      }
      setPicked(step);
    }, 1400);
  };

  const lastIndex = frames.length - 1;
  const index = picked !== null && picked < frames.length ? picked : lastIndex;
  const onFinal = index === lastIndex;
  const frame = index >= 0 ? frames[index] : null;
  const finalImage = polished ?? last?.imageUrl ?? null;
  const shownImage = onFinal ? finalImage : (frame?.imageUrl ?? null);
  const labelOf = (i: number) => (i === lastIndex ? "Final board" : frameLabel(frames[i], frames[i - 1], false));

  const [sheetSaved, setSheetSaved] = useState<"no" | "yes" | "failed">("no");
  const keepSheet = () => {
    if (!finalImage) return;
    const ok = saveSheet({
      id: sheetId(topic.id, mode),
      title: topic.title,
      subject: topic.subject,
      mode,
      imageUrl: finalImage,
      savedAt: Date.now(),
      level,
      clear,
      total,
      nailed: clearIdeas.map((idea) => ({
        question: idea.gapLabel,
        words: nailed?.find((entry) => entry.id === idea.id)?.words ?? null,
      })),
      turns: frames.map((entry) => ({ level: entry.level, said: entry.said })),
      query: target.query,
    });
    setSheetSaved(ok ? "yes" : "failed");
  };

  const left = total - clear;
  const miloLine = complete
    ? "That's all of it! I get it now."
    : `I still wonder about ${left} ${left === 1 ? "thing" : "things"}. Come back and tell me?`;

  return (
    <Page
      header={
        <>
          <Wordmark subject={target.subjectLine} />
          <div className="flex flex-wrap gap-2">
            <Link href={target.homeHref} className={pill.light}>
              Pick another topic
            </Link>
            {/* A fresh session: the saved one is cleared first, so the session page starts from nothing. */}
            <FreshSessionLink href={sessionHref} onClick={() => clearSession(topic.id, mode)}>
              Explain it again
            </FreshSessionLink>
          </div>
        </>
      }
    >
      {/* Two columns that keep their own height: the board never moves when the right column grows. */}
      <main className="flex flex-1 flex-wrap items-start gap-3 rounded-panel bg-panel p-3">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
          <section aria-label="Your final board" className="flex min-w-0 flex-col gap-5 rounded-card bg-card p-7 max-sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1.5">
                <h1 className="m-0 text-[40px] leading-[1.08] font-medium tracking-[-0.035em]">
                  {complete ? "Aha!" : "Nice work"}
                </h1>
                <p className="m-0 text-base text-muted">
                  {complete
                    ? `You explained all ${total} ideas. This is your revision sheet.`
                    : `${clear} of ${total} explained`}
                </p>
              </div>
              {/* Only a finished explanation is a revision sheet worth keeping. An unfinished one stays a session to pick up. */}
              {finalImage && complete && (
                <div className="flex flex-wrap items-center gap-2">
                  {sheetSaved === "yes" ? (
                    <Link href="/v2/sheets" className={`${pill.light} animate-rise`}>
                      Saved. See your revision sheets
                    </Link>
                  ) : (
                    <button type="button" className={`${pill.light} disabled:opacity-40`} onClick={keepSheet} disabled={tidying || summarising}>
                      Save sheet
                    </button>
                  )}
                </div>
              )}
            </div>
            {sheetSaved === "failed" && (
              <p role="alert" className="m-0 animate-rise rounded-tile border border-line px-4 py-3 text-sm text-miss">
                The sheet could not be saved: your browser&apos;s storage is full or blocked. Remove an old sheet and try again.
              </p>
            )}

            <div className="flex items-center justify-center rounded-well bg-panel p-5 max-sm:p-3">
              {shownImage ? (
                <div
                  key={shownImage}
                  className={`relative w-full max-w-[860px] -rotate-[0.6deg] overflow-hidden rounded-[10px] shadow-paper ${
                    moved ? "animate-board-in" : ""
                  }`}
                >
                  <img
                    src={shownImage}
                    alt={
                      onFinal
                        ? `Your final board for ${topic.title}`
                        : `Milo's drawing after turn ${frame?.turn}: ${frame?.said}`
                    }
                    className="block aspect-video w-full bg-paper object-cover"
                  />
                  {tidying && onFinal && (
                    <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 animate-rise items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap">
                      Milo is tidying your sheet
                      <Dots />
                    </span>
                  )}
                </div>
              ) : (
                <p className="m-0 max-w-[40ch] py-10 text-center text-[15px] text-muted">
                  Milo did not get to draw anything this time. Explain it again and a board will land here.
                </p>
              )}
            </div>

            {frame && (
              <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-5 gap-y-2">
                <p className="m-0 min-w-0 flex-1 text-[15px] leading-normal text-muted">
                  <span className="font-semibold text-ink">{labelOf(index)}</span>,{" "}
                  <span className="tabular-nums">{formatClock(frame.at)}</span>. “{frame.said}”
                </p>
                {!onFinal && (
                  <button
                    type="button"
                    className={`${pill.light} !px-[18px] !text-sm`}
                    onClick={() => {
                      stopReplay();
                      setPicked(null);
                    }}
                  >
                    Back to final board
                  </button>
                )}
              </div>
            )}
          </section>

          <section aria-label="How your drawing grew" className="flex flex-col gap-3 rounded-card bg-card px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="m-0 text-[15px] font-semibold">How your drawing grew</h2>
                <span className="text-[13px] text-muted">
                  {frames.length > 0 ? "Every board, in the order you explained it. Click one to look back." : "No boards this time."}
                </span>
              </div>
              <button
                type="button"
                onClick={replay}
                disabled={frames.length < 2}
                aria-pressed={replaying}
                className={`${pill.light} gap-2 !px-[18px] !text-sm disabled:opacity-40`}
              >
                <svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14">
                  <path d="M1 1 L11 7 L1 13 Z" fill="currentColor" />
                </svg>
                Replay
              </button>
            </div>
            {frames.length > 0 && (
              <ol className="m-0 flex list-none items-stretch gap-1.5 overflow-x-auto p-0 pb-1">
                {frames.map((entry, i) => (
                  <li key={entry.turn} className="flex flex-none items-center gap-1.5">
                    {i > 0 && (
                      <svg aria-hidden="true" width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-faint">
                        <path d="M1 6h17M13 1l5 5-5 5" />
                      </svg>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        stopReplay();
                        setPicked(i === lastIndex ? null : i);
                      }}
                      aria-pressed={i === index}
                      className={`press flex h-full w-[200px] flex-col gap-1.5 rounded-tile border-2 bg-card p-2 text-left text-ink ${
                        i === index ? "border-ink" : "border-line"
                      }`}
                    >
                      <span className="pointer-events-none block overflow-hidden rounded-lg border border-line bg-paper">
                        <img
                          src={i === lastIndex ? (finalImage ?? entry.imageUrl) : entry.imageUrl}
                          alt=""
                          className="block aspect-video w-full object-cover"
                        />
                      </span>
                      <span className="flex justify-between gap-2 text-[13px]">
                        <span className="truncate font-semibold">{labelOf(i)}</span>
                        <span className="flex-none text-muted tabular-nums">{formatClock(entry.at)}</span>
                      </span>
                      <span className="line-clamp-2 text-[13px] leading-[1.4] text-muted">“{entry.said}”</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="flex max-w-[420px] min-w-0 flex-[1_1_320px] flex-col gap-3 max-md:max-w-none">
          <section aria-label="Milo" className="flex flex-col gap-2 overflow-hidden rounded-card bg-card px-5 pt-5">
            <p className="m-0 rounded-[18px_18px_18px_4px] bg-panel px-[18px] py-4 text-lg leading-normal font-medium">
              {miloLine}
            </p>
            <div className="flex items-end justify-between gap-3">
              <MiloStill pose={complete ? "cheer" : "listen"} level={level} className="mt-6 w-[150px]" />
              <span className="mb-5 rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-white">
                Milo, age {levelInfo(level).miloAge}
              </span>
            </div>
          </section>

          <section aria-label="Session summary" className="flex flex-col gap-3.5 rounded-card bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">Session summary</h2>
              <span className="rounded-[10px] bg-ink px-3 py-1.5 text-[13px] font-medium text-white">
                {levelInfo(level).label}
              </span>
            </div>
            <dl className="m-0 grid grid-cols-[minmax(0,1fr)_max-content] gap-x-4 gap-y-2.5 text-[15px]">
              <Stat label="Explanations" value={String(saved.turns.length)} />
              <Stat label="Ideas explained" value={`${clear} of ${total}`} />
              <Stat label="Hints used" value={mode === "exam" ? "None, exam mode" : String(saved.hintsUsed)} />
              <Stat label="Time explaining" value={formatClock(saved.elapsed)} />
            </dl>
          </section>

          {clearIdeas.length > 0 && (
            <section aria-label="What you nailed" className="flex flex-col gap-3.5 rounded-card bg-card p-6">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">What you nailed</h2>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {clearIdeas.map((idea) => {
                  const words = nailed?.find((entry) => entry.id === idea.id)?.words;
                  return (
                    <li key={idea.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex-none">
                        <IdeaIcon status="clear" still />
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[15px] leading-[1.35]">{idea.gapLabel}</span>
                        {words && <span className="animate-rise text-sm leading-[1.4] text-muted">You said: “{words}”</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {openIdeas.length > 0 && (
            <section aria-label="What to work on" className="flex flex-col gap-3.5 rounded-card bg-card p-6">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">What to work on</h2>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {openIdeas.map(({ idea, status }) => (
                  <li key={idea.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-none">
                      <IdeaIcon status={status} still />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] leading-[1.35]">{idea.gapLabel}</span>
                      <span className="text-[13px] text-muted">{IDEA_WORD[status]}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="m-0 text-[13px] leading-normal text-muted">
                Milo only asks. Explain these to him next time and he will draw them.
              </p>
            </section>
          )}
        </aside>
      </main>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right font-medium tabular-nums">{value}</dd>
    </>
  );
}

/** Three bouncing dots: something is in progress. */
function Dots() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 animate-dot rounded-full bg-ink" style={{ animationDelay: `${i * 140}ms` }} />
      ))}
    </span>
  );
}
