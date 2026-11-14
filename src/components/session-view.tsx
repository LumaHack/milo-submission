"use client";

// The session screen. Layout from design/claude-design/MainV3.dc.html.
// It only shows state. The live engine and the scripted run both render through it.
// The left column is Milo as a living agent: he breathes, leans in while listening, moves with his
// own voice, and a feed shows what he is doing behind the scenes.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Page, pill } from "@/components/ui";
import { formatClock } from "@/lib/demo";
import { LEVELS, levelInfo, type Level } from "@/lib/levels";
import type { Frame, IdeaStatus, MiloStatus } from "@/lib/turn";
import type { Step } from "@/lib/use-milo-session";

const STATUS: Record<MiloStatus, { text: string; dot: string; busy: boolean; motion: string; ring: string }> = {
  off: { text: "Mic is off", dot: "bg-miss", busy: false, motion: "animate-breathe", ring: "" },
  listening: { text: "Listening", dot: "bg-ok animate-pulse-dot", busy: false, motion: "animate-listen", ring: "var(--color-ok)" },
  thinking: { text: "Thinking", dot: "bg-faint", busy: true, motion: "animate-ponder", ring: "" },
  drawing: { text: "Drawing", dot: "bg-faint", busy: true, motion: "animate-ponder", ring: "" },
  speaking: { text: "Milo is talking", dot: "bg-ink", busy: false, motion: "animate-breathe", ring: "var(--color-ink)" },
};

const BAR_HEIGHTS = [8, 16, 26, 34, 20, 12, 28, 36, 22, 14, 30, 18, 10, 24, 32, 16, 26, 12, 20, 30, 14, 22, 10, 18];

const IDEA_COLOR: Record<IdeaStatus, string> = {
  missing: "bg-panel",
  vague: "bg-faint",
  clear: "bg-ink",
  wrong: "bg-miss",
};

export type SessionViewProps = {
  topicTitle: string;
  subjectLine: string;
  frames: Frame[];
  /** State after the newest scored turn. Shown when the newest frame (or none) is selected. */
  live: { level: Level | null; hint: string | null; gaps: string[]; ideas?: IdeaStatus[] | null };
  /** What Milo is saying or last said, when it comes from the voice agent. Overrides the hint. */
  spokenLine?: string | null;
  status: MiloStatus;
  drawing: boolean;
  error: string | null;
  seconds: number;
  /** What the agent has been doing, oldest first. */
  steps: Step[];
  micOn: boolean;
  micLabel: string;
  /** Shown in the mic bar instead of the waveform, for example before the session starts. */
  micHint?: string | null;
  onMic: () => void;
  /** Voice level from 0 to 1: the microphone while listening, Milo's own voice while he talks. */
  getVoiceLevel?: () => number;
  onEnd?: () => void;
};

export function SessionView(props: SessionViewProps) {
  const { frames, live } = props;
  // null follows the newest frame. A number pins an older frame the student clicked.
  const [picked, setPicked] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const columnRef = useRef<HTMLElement>(null);

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

  // Feed the voice level to CSS as --vol, so Milo, his ring and the waveform all move with it.
  const { getVoiceLevel } = props;
  const voiceActive = Boolean(getVoiceLevel) && (props.status === "listening" || props.status === "speaking");
  useEffect(() => {
    const node = columnRef.current;
    if (!node) return;
    if (!voiceActive || !getVoiceLevel) {
      node.style.setProperty("--vol", "0");
      return;
    }
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      const level = Math.min(1, Math.max(0, getVoiceLevel() * 2.2));
      // Rise fast, fall slowly, like a level meter.
      smooth = level > smooth ? level : smooth * 0.88 + level * 0.12;
      node.style.setProperty("--vol", smooth.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [voiceActive, getVoiceLevel]);

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
  const ideas = live.ideas ?? null;

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
        <section
          ref={columnRef}
          aria-label="Milo"
          className="flex max-w-[400px] min-w-0 flex-[1_1_320px] flex-col gap-3 max-md:max-w-none"
        >
          <div className="flex flex-col gap-4 rounded-card bg-card p-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-tile bg-milo">
              {/* Outer layer moves with the voice. Inner layer carries the idle motion for the current state. */}
              <div
                className="h-full w-full will-change-transform"
                style={{ transform: "scale(calc(1 + var(--vol, 0) * 0.06)) translateY(calc(var(--vol, 0) * -5px))" }}
              >
                <div className={`h-full w-full ${status.motion}`}>
                  <img
                    key={level}
                    src={info.miloImage}
                    alt={`Milo, age ${info.miloAge}`}
                    className="block h-full w-full animate-grow-up object-cover object-[50%_25%]"
                  />
                </div>
              </div>
              {/* A white flash when he grows up. */}
              <span key={`flash-${level}`} aria-hidden="true" className="pointer-events-none absolute inset-0 animate-flash bg-card" />
              {/* The ring thickens with the voice: green while he listens, black while he talks. */}
              {status.ring && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-tile"
                  style={{ boxShadow: `inset 0 0 0 calc(2px + var(--vol, 0) * 9px) ${status.ring}` }}
                />
              )}
              <span
                key={props.status}
                aria-live="polite"
                className="absolute top-3 left-3 inline-flex animate-rise items-center gap-[7px] rounded-full bg-card px-[11px] py-[5px] text-[13px] font-medium"
              >
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dot}`} />
                {status.text}
                {status.busy && <Dots />}
              </span>
              <span
                key={info.miloAge}
                className="absolute bottom-3 left-3 animate-pop rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-white"
              >
                Milo, age {info.miloAge}
              </span>
            </div>

            <p className="m-0 rounded-[18px_18px_18px_4px] bg-panel px-[18px] py-4 text-lg leading-normal font-medium">
              <Words key={line} text={line} />
            </p>
            <p className="m-0 text-sm leading-normal text-muted">
              Milo gives a hint at your biggest gap. He never gives the answer.
            </p>
          </div>

          <AgentFeed steps={props.steps} />

          <div className="flex flex-col gap-3 rounded-card bg-card px-4 py-[18px]">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold">Crayon level</span>
              <span className="text-[13px] text-muted">{frame ? `Turn ${frame.turn} of about 4` : "Not started"}</span>
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
            {ideas && onNewest && (
              <div className="flex items-center gap-3">
                <div className="flex flex-1 gap-1" aria-hidden="true">
                  {ideas.map((idea, i) => (
                    <span
                      key={`${i}-${idea}`}
                      className={`h-1.5 flex-1 rounded-full ${IDEA_COLOR[idea]} ${idea === "missing" ? "" : "animate-pop"}`}
                    />
                  ))}
                </div>
                <span className="text-[13px] text-muted tabular-nums">
                  {ideas.filter((idea) => idea === "clear").length} of {ideas.length} ideas clear
                </span>
              </div>
            )}
          </div>

          <div className="sticky bottom-3 z-10 mt-auto flex items-center gap-3.5 rounded-card bg-card px-4 py-3.5 shadow-paper">
            <span className="relative flex-none">
              {!props.micOn && props.micHint && (
                <span aria-hidden="true" className="absolute inset-0 animate-ping-ring rounded-full bg-ink" />
              )}
              <button
                type="button"
                onClick={props.onMic}
                aria-label={props.micLabel}
                aria-pressed={props.micOn}
                title={props.micLabel}
                className="press relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-ink bg-ink text-white"
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <path d="M12 18v3" />
                  {!props.micOn && !props.micHint && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </span>
            {props.micHint ? (
              <span key={props.micHint} className="min-w-0 flex-1 animate-rise text-[15px] font-medium">
                {props.micHint}
              </span>
            ) : (
              <Waveform active={props.micOn && props.status === "listening"} followsVoice={voiceActive} />
            )}
            <span className="flex-none text-sm text-muted tabular-nums">{formatClock(props.seconds)}</span>
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
                <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 animate-rise items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium shadow-paper">
                  Milo is drawing
                  <Dots />
                </span>
              )}
            </div>
          </div>

          {props.error && (
            <p role="alert" className="m-0 animate-rise rounded-tile border border-line px-4 py-3 text-sm text-miss">
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
                    key={`${gap}-${i === 0}`}
                    className="inline-flex animate-rise items-center gap-[9px] rounded-full border border-line px-3.5 py-2 text-sm"
                    style={{ animationDelay: `${i * 60}ms` }}
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

/** Milo's line arrives word by word, the way he says it. */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block animate-word whitespace-pre"
          style={{ animationDelay: `${Math.min(i * 45, 900)}ms` }}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/** What the agent is doing behind the scenes: hearing, checking, telling Milo, drawing. */
function AgentFeed({ steps }: { steps: Step[] }) {
  const working = steps.some((step) => step.state === "active");
  return (
    <div className="flex flex-col gap-2.5 rounded-card bg-card px-4 py-[18px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold">What Milo is doing</span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${working ? "animate-pulse-dot bg-ink" : "bg-faint"}`} />
          {working ? "Working" : "Idle"}
        </span>
      </div>
      {steps.length === 0 ? (
        <p className="m-0 text-[13px] leading-normal text-muted">
          Nothing yet. When you speak, you will see him check what you said and redraw the board.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite">
          {steps.map((step) => (
            <li key={step.id} className="flex animate-step-in items-start gap-2.5">
              <span className="mt-0.5 flex-none">
                <StepIcon state={step.state} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-sm leading-[1.35]">
                <span className="font-medium">{step.label}</span>
                {step.detail && <span className="truncate text-[13px] text-muted">{step.detail}</span>}
              </span>
              <span className="flex-none text-[13px] leading-[1.45] text-muted tabular-nums">
                {step.state === "active" ? <Elapsed since={step.startedAt} /> : step.seconds ? `${step.seconds.toFixed(1)}s` : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StepIcon({ state }: { state: Step["state"] }) {
  if (state === "active") {
    return <span aria-hidden="true" className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-line border-t-ink" />;
  }
  if (state === "error") {
    return <span aria-hidden="true" className="h-4 w-4 flex-none rounded-full bg-miss" />;
  }
  return (
    <span aria-hidden="true" className="inline-flex h-4 w-4 flex-none animate-pop items-center justify-center rounded-full bg-ink text-white">
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
      </svg>
    </span>
  );
}

/** A running timer for a step that is still going. */
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return <>{Math.max(0, (now - since) / 1000).toFixed(1)}s</>;
}

/** The mic waveform. It follows the real voice level when there is one. */
function Waveform({ active, followsVoice }: { active: boolean; followsVoice: boolean }) {
  return (
    <div aria-hidden="true" className="flex h-9 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          className={`w-[3px] flex-none rounded-sm bg-ink ${active && !followsVoice ? "animate-bar" : ""}`}
          style={{
            height,
            opacity: active || followsVoice ? 1 : 0.25,
            transform: followsVoice ? "scaleY(calc(0.2 + var(--vol, 0) * 0.8))" : active ? undefined : "scaleY(0.3)",
            animationDelay: `${(i % 6) * 110}ms`,
          }}
        />
      ))}
    </div>
  );
}
