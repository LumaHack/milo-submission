"use client";

// The session screen. Port of design/claude-design/MainV3.dc.html.
// It only shows state. The live engine and the scripted run both render through it.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { MiloPic, Page, pill } from "@/components/ui";
import { formatClock } from "@/lib/demo";
import { LEVELS, levelInfo, type Level } from "@/lib/levels";
import type { Frame, MiloStatus } from "@/lib/turn";

const STATUS: Record<MiloStatus, { text: string; dot: string }> = {
  off: { text: "Mic is off", dot: "bg-miss" },
  listening: { text: "Listening", dot: "bg-ok animate-pulse-dot" },
  thinking: { text: "Thinking", dot: "bg-faint" },
  drawing: { text: "Drawing", dot: "bg-faint" },
  speaking: { text: "Milo is talking", dot: "bg-ink" },
};

const BAR_HEIGHTS = [8, 16, 26, 34, 20, 12, 28, 36, 22, 14, 30, 18, 10, 24, 32, 16, 26, 12, 20, 30, 14, 22, 10, 18];

export type SessionViewProps = {
  topicTitle: string;
  subjectLine: string;
  frames: Frame[];
  /** State after the newest scored turn. Shown when the newest frame (or none) is selected. */
  live: { level: Level | null; hint: string | null; gaps: string[] };
  /** What Milo is saying or last said, when it comes from the voice agent. Overrides the hint. */
  spokenLine?: string | null;
  status: MiloStatus;
  drawing: boolean;
  error: string | null;
  seconds: number;
  micOn: boolean;
  micLabel: string;
  onMic: () => void;
  /** Microphone level from 0 to 1. Without it the bars animate on their own while listening. */
  getMicLevel?: () => number;
  onEnd?: () => void;
  /** Extra controls under the mic card, for example the typing box used in testing. */
  extra?: ReactNode;
};

export function SessionView(props: SessionViewProps) {
  const { frames, live } = props;
  // null follows the newest frame. A number pins an older frame the student clicked.
  const [picked, setPicked] = useState<number | null>(null);
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

  // A new board always takes over the view, unless a replay is running.
  const frameCount = frames.length;
  const [seenCount, setSeenCount] = useState(frameCount);
  if (frameCount !== seenCount) {
    setSeenCount(frameCount);
    if (!replaying) setPicked(null);
  }

  const index = picked !== null && picked < frames.length ? picked : frames.length - 1;
  const frame = index >= 0 ? frames[index] : null;
  const onNewest = index === frames.length - 1;

  const level: Level = (onNewest ? live.level : null) ?? frame?.level ?? 1;
  const gaps = onNewest ? live.gaps : (frame?.gaps ?? []);
  const line =
    (onNewest ? (props.spokenLine ?? live.hint) : frame?.hint) ??
    "Hi, I'm Milo. I don't know anything about cells. Can you explain how a cell works?";
  const info = levelInfo(level);
  const status = STATUS[props.status];
  const scored = live.level !== null || frames.length > 0;

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

  return (
    <Page
      header={
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <Link href="/" className="text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
              Milo
            </Link>
            <span className="text-[15px] text-muted">{props.subjectLine}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/sheet" className={pill.light} onClick={props.onEnd}>
              Open revision sheet
            </Link>
            <Link href="/" className={pill.dark} onClick={props.onEnd}>
              End session
            </Link>
          </div>
        </>
      }
    >
      <main className="flex flex-1 flex-wrap gap-3 rounded-panel bg-panel p-3">
        <section aria-label="Milo" className="flex max-w-[400px] min-w-0 flex-[1_1_320px] flex-col gap-3 max-md:max-w-none">
          <div className="flex flex-col gap-4 rounded-card bg-card p-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-tile bg-milo">
              <MiloPic level={level} />
              <span
                aria-live="polite"
                className="absolute top-3 left-3 inline-flex items-center gap-[7px] rounded-full bg-card px-[11px] py-[5px] text-[13px] font-medium"
              >
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dot}`} />
                {status.text}
              </span>
              <span
                key={info.miloAge}
                className="absolute bottom-3 left-3 animate-pop rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-white"
              >
                Milo, age {info.miloAge}
              </span>
            </div>
            <p
              key={line}
              className="m-0 animate-rise rounded-[18px_18px_18px_4px] bg-panel px-[18px] py-4 text-lg leading-normal font-medium"
            >
              {line}
            </p>
            <p className="m-0 text-sm leading-normal text-muted">
              Milo gives a hint at your biggest gap. He never gives the answer.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-card bg-card px-4 py-[18px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold">Crayon level</span>
              <span className="text-[13px] text-muted">
                {frame ? `Turn ${frame.turn} of about 4` : "Not started"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {LEVELS.map((entry) => {
                const current = scored && entry.level === level;
                return (
                  <span
                    key={`${entry.level}-${current}`}
                    className={`rounded-[10px] px-1 py-2.5 text-center text-[13px] font-medium ${
                      current ? "animate-pop bg-ink text-white" : "bg-panel text-muted"
                    }`}
                  >
                    {entry.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            {props.extra}
            <div className="flex items-center gap-3.5 rounded-card bg-card px-4 py-3.5">
              <button
                type="button"
                onClick={props.onMic}
                aria-label={props.micLabel}
                aria-pressed={props.micOn}
                title={props.micLabel}
                className={`press inline-flex h-12 w-12 flex-none items-center justify-center rounded-full border ${
                  props.micOn ? "border-ink bg-ink text-white" : "border-line bg-card text-ink"
                }`}
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <path d="M12 18v3" />
                  {!props.micOn && <path d="M4 4l16 16" />}
                </svg>
              </button>
              <Waveform active={props.micOn && props.status === "listening"} getLevel={props.getMicLevel} />
              <span className="flex-none text-sm text-muted tabular-nums">{formatClock(props.seconds)}</span>
            </div>
          </div>
        </section>

        <section
          aria-label="Whiteboard"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-[18px] rounded-card bg-card px-7 py-6 max-sm:px-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
            <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">{props.topicTitle}</h1>
            <span className="text-sm text-muted">Redrawn after every turn</span>
          </div>

          <div className="flex min-h-80 flex-1 items-center justify-center rounded-well bg-panel p-4">
            <div
              key={frame?.imageUrl ?? "empty"}
              className="relative w-full max-w-[760px] -rotate-[0.6deg] animate-board-in overflow-hidden rounded-[10px] shadow-paper"
            >
              {frame ? (
                <img
                  src={frame.imageUrl}
                  alt={`Milo's drawing after turn ${frame.turn}: ${frame.said}`}
                  className="block aspect-video w-full bg-paper object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-paper p-6 text-center text-[15px] text-muted">
                  Nothing drawn yet. Start explaining and Milo will draw what you say.
                </div>
              )}
              {props.drawing && (
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 animate-rise rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium shadow-paper">
                  Milo is drawing…
                </span>
              )}
            </div>
          </div>

          {props.error && (
            <p role="alert" className="m-0 rounded-tile border border-line px-4 py-3 text-sm text-miss">
              {props.error}
            </p>
          )}

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[15px] font-semibold">History</span>
                <span className="text-[13px] text-muted">Each frame is what you said and what Milo drew from it</span>
              </div>
              <button
                type="button"
                onClick={replay}
                disabled={frames.length < 2}
                className={`${pill.light} gap-2 !px-[18px] !text-sm disabled:opacity-40`}
              >
                <svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14">
                  <path d="M1 1 L11 7 L1 13 Z" fill="currentColor" />
                </svg>
                Replay
              </button>
            </div>
            {frames.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {frames.map((entry, i) => {
                  const last = i === frames.length - 1 && entry.level === 4;
                  return (
                    <button
                      key={entry.turn}
                      type="button"
                      onClick={() => {
                        stopReplay();
                        setPicked(i === frames.length - 1 ? null : i);
                      }}
                      aria-pressed={i === index}
                      className={`press flex w-[calc(25%-7.5px)] min-w-[180px] flex-none animate-rise flex-col gap-2 rounded-tile border-2 bg-card p-2.5 text-left text-ink ${
                        i === index ? "border-ink" : "border-line"
                      }`}
                    >
                      <span className="pointer-events-none block overflow-hidden rounded-lg border border-line bg-paper">
                        <img src={entry.imageUrl} alt="" className="block aspect-video w-full object-cover" />
                      </span>
                      <span className="flex justify-between gap-2 text-[13px]">
                        <span className="font-semibold">{last ? "Final sheet" : `Turn ${entry.turn}`}</span>
                        <span className="text-muted tabular-nums">{formatClock(entry.at)}</span>
                      </span>
                      <span className="text-[13px] leading-[1.4] text-muted">“{entry.said}”</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="m-0 text-[13px] text-muted">Your drawings will line up here, one per turn.</p>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[15px] font-semibold">
              {gaps.length === 0 && scored ? "No gaps left" : "Gaps Milo still hears"}
            </span>
            {gaps.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {gaps.slice(0, 4).map((gap, i) => (
                  <span
                    key={gap}
                    className="inline-flex items-center gap-[9px] rounded-full border border-line px-3.5 py-2 text-sm"
                  >
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${i === 0 ? "bg-miss" : "bg-faint"}`} />
                    {gap}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </Page>
  );
}

/** The mic waveform. It follows the real microphone level when one is given. */
function Waveform({ active, getLevel }: { active: boolean; getLevel?: () => number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active || !getLevel) return;
    let raf = 0;
    const tick = () => {
      const volume = Math.min(1, Math.max(0, getLevel()));
      node.style.setProperty("--vol", String(0.25 + volume * 0.75));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, getLevel]);

  const followsMic = active && Boolean(getLevel);
  return (
    <div ref={ref} aria-hidden="true" className="flex h-9 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          className={`w-[3px] flex-none rounded-sm bg-ink ${active && !followsMic ? "animate-bar" : ""}`}
          style={{
            height,
            opacity: active ? 1 : 0.25,
            transform: followsMic ? "scaleY(var(--vol, 0.25))" : active ? undefined : "scaleY(0.3)",
            animationDelay: `${(i % 6) * 110}ms`,
          }}
        />
      ))}
    </div>
  );
}
