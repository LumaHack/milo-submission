"use client";

// Milo v2's session screen ("New look"). Layout from Antoine's mockups, look from the v3 design:
// what Milo gets on the left, the board in the middle and biggest, Milo beside it, the voice bar
// under the board, and the timeline at the bottom. It only shows state; live-session-v2.tsx runs it.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Page, pill } from "@/components/ui";
import { formatClock } from "@/lib/demo";
import { LEVELS, levelInfo, type Level } from "@/lib/levels";
import type { IdeaStatus, MiloStatus } from "@/lib/turn";
import type { Step } from "@/lib/use-milo-session";
import type { Mode } from "@/lib/v2/contract";
import { MILO_POSES, poseBox, posePicture, type MiloPose } from "@/lib/v2/milo-poses";
import type { V2Topic } from "@/lib/v2/topics";
import type { V2Frame, V2Live } from "@/lib/v2/use-milo-v2";

export type ViewStatus = MiloStatus | "paused";

const STATUS: Record<ViewStatus, { text: string; dot: string; busy: boolean; motion: string; ring: string }> = {
  off: { text: "Mic is off", dot: "bg-miss", busy: false, motion: "animate-breathe", ring: "" },
  connecting: { text: "Waking Milo up", dot: "bg-faint", busy: true, motion: "animate-breathe", ring: "" },
  listening: { text: "Listening", dot: "bg-ok animate-pulse-dot", busy: false, motion: "animate-listen", ring: "var(--color-ok)" },
  thinking: { text: "Thinking", dot: "bg-faint", busy: true, motion: "animate-ponder", ring: "" },
  drawing: { text: "Drawing", dot: "bg-faint", busy: true, motion: "animate-ponder", ring: "" },
  speaking: { text: "Milo is talking", dot: "bg-ink", busy: false, motion: "animate-breathe", ring: "var(--color-ink)" },
  paused: { text: "Paused", dot: "bg-faint", busy: false, motion: "animate-breathe", ring: "" },
};

export const IDEA_WORD: Record<IdeaStatus, string> = {
  missing: "Not yet",
  vague: "Getting there",
  clear: "Got it",
  wrong: "Check this",
};

const BAR_HEIGHTS = [8, 16, 26, 34, 20, 12, 28, 36, 22, 14, 30, 18, 10, 24, 32, 16, 26, 12, 20, 30];

export type SessionViewV2Props = {
  topic: V2Topic;
  mode: Mode;
  /** "History, how World War II started, exam mode". */
  subjectLine: string;
  frames: V2Frame[];
  live: V2Live;
  /** What Milo is saying or last said. */
  spokenLine: string | null;
  /** What the student said last, as Milo heard it. */
  lastHeard: string | null;
  status: ViewStatus;
  drawing: boolean;
  error: string | null;
  seconds: number;
  steps: Step[];
  hintsUsed: number;
  micOn: boolean;
  micLabel: string;
  /** Shown in the voice bar instead of what was said, for example before Milo connects. */
  micHint: string | null;
  paused: boolean;
  onMic: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onClassic: () => void;
  /** Leaving without the end page: save and hang up. */
  onEnd: () => void;
  /** "End session" and "See your sheet": wait for the last drawing, save, then open the end page. */
  onFinish: () => void;
  finishing: boolean;
  /** Voice level from 0 to 1: the microphone while listening, Milo's own voice while he talks. */
  getVoiceLevel?: () => number;
};

export function SessionViewV2(props: SessionViewV2Props) {
  const { topic, frames, live } = props;
  // null follows the newest frame. A number pins an older frame the student clicked.
  const [picked, setPicked] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const miloRef = useRef<HTMLElement>(null);

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

  // Feed the voice level to CSS as --vol, so Milo, his ring and the waveform move with it.
  const { getVoiceLevel } = props;
  const voiceActive = Boolean(getVoiceLevel) && (props.status === "listening" || props.status === "speaking");
  useEffect(() => {
    const node = miloRef.current;
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

  const level: Level = live.level ?? frame?.level ?? 1;
  const shownLevel: Level = (onNewest ? live.level : null) ?? frame?.level ?? 1;
  const line = (onNewest ? (props.spokenLine ?? live.miloLine) : frame?.hint) ?? topic.firstMessage;
  const scored = live.level !== null || frames.length > 0;

  // Load every pose and age up front, so a pose change never shows a gap.
  useEffect(() => {
    for (const entry of LEVELS) for (const pose of MILO_POSES) new Image().src = posePicture(pose, entry.level);
  }, []);

  // When he grows up a level, Milo cheers for a moment.
  const [seenLevel, setSeenLevel] = useState(live.level);
  const [cheerRun, setCheerRun] = useState(0);
  if (live.level !== seenLevel) {
    setSeenLevel(live.level);
    if (seenLevel !== null && live.level !== null && live.level > seenLevel) setCheerRun((run) => run + 1);
  }
  const [cheering, setCheering] = useState(false);
  useEffect(() => {
    if (cheerRun === 0) return;
    const on = setTimeout(() => setCheering(true), 0);
    const off = setTimeout(() => setCheering(false), 2600);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [cheerRun]);

  const finished = live.level === 4 && live.gapId === null;
  const pose: MiloPose =
    cheering || (finished && props.status === "speaking")
      ? "cheer"
      : props.status === "speaking"
        ? props.mode === "coach" && live.hintStep >= 1
          ? "point"
          : "talk"
        : props.status === "thinking" || props.status === "drawing" || props.status === "connecting"
          ? "think"
          : "listen";

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
            <Link href="/v2" className="text-xl font-semibold tracking-[-0.02em] text-ink no-underline" onClick={props.onEnd}>
              Milo
            </Link>
            <span className="text-[15px] text-muted">{props.subjectLine}</span>
          </div>
          <LevelSteps level={level} scored={scored} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill.light} onClick={props.onClassic}>
              Classic look
            </button>
            <button type="button" className={`${pill.dark} disabled:opacity-60`} onClick={props.onFinish} disabled={props.finishing}>
              {props.finishing ? "Finishing the drawing…" : "End session"}
            </button>
          </div>
        </>
      }
    >
      <main className="grid flex-1 grid-cols-1 gap-3 rounded-panel bg-panel p-3 lg:grid-cols-[minmax(220px,250px)_minmax(0,1fr)_minmax(250px,290px)] lg:items-start">
        <Checklist
          topic={topic}
          mode={props.mode}
          live={live}
          hintsUsed={props.hintsUsed}
          className="order-3 lg:order-none lg:row-span-2"
        />

        <section
          aria-label="Whiteboard"
          className="order-1 flex min-w-0 flex-col gap-4 rounded-card bg-card px-6 py-5 max-sm:px-4 lg:order-none"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
            <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">{topic.title}</h1>
            <span className="text-sm text-muted">
              {frame && !onNewest ? `Looking back at turn ${frame.turn}` : "Redrawn after every turn"}
            </span>
          </div>
          <div className="flex items-center justify-center rounded-well bg-panel p-4">
            <div
              key={frame?.imageUrl ?? "empty"}
              className="relative w-full max-w-[860px] -rotate-[0.6deg] animate-board-in overflow-hidden rounded-[10px] shadow-paper"
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
                <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 animate-rise items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium">
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
        </section>

        <section
          ref={miloRef}
          aria-label="Milo"
          className="relative z-10 order-2 flex min-w-0 flex-col gap-3 lg:order-none lg:-ml-10 lg:self-stretch lg:pt-16"
        >
          <p
            key={line}
            className="m-0 animate-rise rounded-[18px_18px_18px_4px] bg-card px-[18px] py-4 text-lg leading-normal font-medium"
          >
            <Words text={line} />
          </p>
          <LatestStep steps={props.steps} />
          <MiloFigure level={shownLevel} status={props.status} pose={pose} />
        </section>

        <VoiceBar {...props} className="order-4 lg:order-none lg:col-span-2 lg:col-start-2" />

        <Timeline
          frames={frames}
          index={index}
          onPick={(i) => {
            stopReplay();
            setPicked(i === frames.length - 1 ? null : i);
          }}
          onReplay={replay}
          className="order-5 lg:order-none lg:col-span-3"
        />
      </main>
    </Page>
  );
}

/** The four crayon levels as a row of steps: where the explanation stands. */
function LevelSteps({ level, scored }: { level: Level; scored: boolean }) {
  return (
    <ol aria-label="Crayon level" className="m-0 flex list-none items-center gap-1.5 p-0">
      {LEVELS.map((entry) => {
        const current = scored && entry.level === level;
        const reached = scored && entry.level < level;
        return (
          <li
            key={`${entry.level}-${current}`}
            aria-current={current ? "step" : undefined}
            className={`rounded-[10px] px-3 py-1.5 text-[13px] font-medium ${
              current ? "animate-pop bg-ink text-white" : reached ? "bg-panel text-ink" : "bg-panel text-muted"
            }`}
          >
            {entry.label}
          </li>
        );
      })}
    </ol>
  );
}

/** Scrambles a label, so a hidden gap gives nothing away even when zoomed in. */
function scramble(text: string): string {
  const letters = "xvbnrtmolsyhkw";
  return text.replace(/[a-z]/gi, (_, i: number) => letters[(i * 7) % letters.length]);
}

function Checklist({
  topic,
  mode,
  live,
  hintsUsed,
  className,
}: {
  topic: V2Topic;
  mode: Mode;
  live: V2Live;
  hintsUsed: number;
  className: string;
}) {
  // Exam mode starts with what is left hidden. The student can flip it either way.
  const [hideLeft, setHideLeft] = useState(mode === "exam");
  const statuses = topic.keyIdeas.map((_, i) => live.ideas?.[i] ?? "missing");
  const clear = statuses.filter((status) => status === "clear").length;
  const hidden = hideLeft ? statuses.filter((status) => status === "missing").length : 0;

  return (
    <section aria-label="What Milo gets" className={`flex flex-col gap-3 rounded-card bg-card px-4 py-[18px] ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">What Milo gets</span>
        <span className="text-[13px] text-muted tabular-nums">
          {clear} of {statuses.length}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {topic.keyIdeas.map((idea, i) => {
          const status = statuses[i];
          const isHidden = hideLeft && status === "missing";
          const asking = mode === "coach" && idea.id === live.gapId && !isHidden;
          return (
            <li
              key={idea.id}
              className={`flex items-start gap-2.5 rounded-[10px] px-2 py-2 ${asking ? "bg-panel" : ""}`}
            >
              <span className="mt-0.5 flex-none">
                <IdeaIcon status={status} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                {isHidden ? (
                  <>
                    <span aria-hidden="true" className="v2-hidden-label text-[15px] leading-[1.35]">
                      {scramble(idea.gapLabel)}
                    </span>
                    <span className="sr-only">Hidden until you explain it</span>
                  </>
                ) : (
                  <span className="text-[15px] leading-[1.35]">{idea.gapLabel}</span>
                )}
                <span className="text-[13px] text-muted">
                  {asking ? "Milo is asking about this" : IDEA_WORD[status]}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        aria-pressed={hideLeft}
        onClick={() => setHideLeft((value) => !value)}
        className={`${pill.light} gap-2 self-start !px-4 !text-sm`}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {hideLeft && <path d="M4 4l16 16" />}
        </svg>
        {hideLeft ? "Show what's left" : "Hide what's left"}
      </button>
      <p className="m-0 text-[13px] leading-normal text-muted">
        {hidden > 0
          ? `${hidden} still hidden. They show once you start explaining them.`
          : mode === "exam"
            ? "Exam mode: Milo only asks questions."
            : `Hints used: ${hintsUsed}`}
      </p>
    </section>
  );
}

/** The mark beside a key idea. It pops when the idea changes status; `still` shows it without the pop. */
export function IdeaIcon({ status, still = false }: { status: IdeaStatus; still?: boolean }) {
  const pop = still ? "" : "animate-pop";
  if (status === "clear") {
    return (
      <span aria-hidden="true" className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink text-white ${pop}`}>
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
        </svg>
      </span>
    );
  }
  if (status === "wrong") {
    return <span aria-hidden="true" className={`block h-4 w-4 rounded-full border-[5px] border-miss ${pop}`} />;
  }
  if (status === "vague") {
    return (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className={`text-faint ${pop}`}>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 1 A7 7 0 0 0 8 15 Z" fill="currentColor" />
      </svg>
    );
  }
  return <span aria-hidden="true" className="block h-4 w-4 rounded-full border-2 border-line" />;
}

/**
 * Milo himself: a 3D cut-out standing beside the board, at his current age and in the pose for what he
 * is doing. Poses cross-fade, never morph. The box clips only at the bottom, like a desk in front of
 * him, so a pointing arm can reach over the board's edge.
 */
function MiloFigure({ level, status, pose }: { level: Level; status: ViewStatus; pose: MiloPose }) {
  const info = levelInfo(level);
  const look = STATUS[status];
  return (
    <div
      className="relative mt-auto aspect-square w-full max-w-[320px] self-center lg:max-w-none"
      style={{ clipPath: "inset(-100% -100% 0 -100%)" }}
    >
      {/* Outer layer moves with the voice. */}
      <div
        className="absolute inset-0 origin-bottom will-change-transform"
        style={{ transform: "scale(calc(1 + var(--vol, 0) * 0.04)) translateY(calc(var(--vol, 0) * -4px))" }}
      >
        {/* Growing up plays again whenever his age changes. */}
        <div key={level} className="absolute inset-0 origin-bottom animate-grow-up">
          {/* The idle motion for the current state. */}
          <div className={`absolute inset-0 origin-bottom ${look.motion}`}>
            {MILO_POSES.map((entry) => (
              <img
                key={entry}
                src={posePicture(entry, level)}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute h-auto max-w-none transition-opacity duration-200 ease-out select-none"
                style={{ ...poseBox(entry, level), opacity: entry === pose ? 1 : 0 }}
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Milo, age {info.miloAge}</span>
      <span
        key={status}
        aria-live="polite"
        className="absolute top-3 left-3 inline-flex animate-rise items-center gap-[7px] rounded-full bg-card px-[11px] py-[5px] text-[13px] font-medium"
      >
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${look.dot}`} />
        {look.text}
        {look.busy && <Dots />}
      </span>
      <span
        key={info.miloAge}
        className="absolute bottom-3 left-3 animate-pop rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-white"
      >
        Milo, age {info.miloAge}
      </span>
    </div>
  );
}

/** One quiet line about what Milo is doing right now. The full feed lives in the classic look. */
function LatestStep({ steps }: { steps: Step[] }) {
  const step = steps.at(-1);
  if (!step) {
    return <p className="m-0 px-1 text-[13px] text-muted">Milo gives a hint at your biggest gap. He never gives the answer.</p>;
  }
  return (
    <p key={step.id} className="m-0 flex animate-rise items-center gap-2 px-1 text-[13px] text-muted">
      {step.state === "active" ? (
        <span aria-hidden="true" className="h-3 w-3 flex-none animate-spin rounded-full border-2 border-line border-t-ink" />
      ) : (
        <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${step.state === "error" ? "bg-miss" : "bg-faint"}`} />
      )}
      <span className="truncate">
        {step.label}
        {step.state === "done" && step.seconds ? `, ${step.seconds.toFixed(1)}s` : ""}
      </span>
    </p>
  );
}

function VoiceBar(props: SessionViewV2Props & { className: string }) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  useEffect(() => {
    if (!confirmRestart) return;
    const timer = setTimeout(() => setConfirmRestart(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmRestart]);

  const listening = props.micOn && props.status === "listening";
  // Every idea is clear: the sheet is ready, and this is the next thing to press.
  const allClear = Boolean(props.live.ideas?.length) && (props.live.ideas ?? []).every((status) => status === "clear");
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-card bg-card px-4 py-3 ${props.className}`}>
      <button
        type="button"
        onClick={props.onMic}
        aria-label={props.micLabel}
        aria-pressed={props.micOn}
        title={props.micLabel}
        disabled={props.paused}
        className={`press inline-flex h-12 w-12 flex-none items-center justify-center rounded-full border disabled:opacity-40 ${
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

      <div className="flex min-w-[180px] flex-1 items-center gap-3">
        {props.paused ? (
          <span className="animate-rise text-[15px] font-medium">Paused. Milo will wait for you.</span>
        ) : props.micHint ? (
          <span key={props.micHint} className="animate-rise text-[15px] font-medium">
            {props.micHint}
          </span>
        ) : props.lastHeard ? (
          <span key={props.lastHeard} className="flex min-w-0 animate-rise flex-col">
            <span className="text-[13px] text-muted">You said</span>
            <span className="line-clamp-2 text-[15px] leading-[1.4]">“{props.lastHeard}”</span>
          </span>
        ) : (
          <span className="text-[15px] font-medium">Explain it out loud. Milo is listening.</span>
        )}
        <Waveform active={listening && !props.paused} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {allClear && (
          <button
            type="button"
            className={`${pill.dark} animate-pop disabled:opacity-60`}
            onClick={props.onFinish}
            disabled={props.finishing}
          >
            {props.finishing ? "Finishing the drawing…" : "See your sheet"}
          </button>
        )}
        {props.paused ? (
          <button type="button" className={`${pill.dark} gap-2`} onClick={props.onResume}>
            <svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14">
              <path d="M1 1 L11 7 L1 13 Z" fill="currentColor" />
            </svg>
            Resume
          </button>
        ) : (
          <button type="button" className={`${pill.light} gap-2`} onClick={props.onPause}>
            <svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14">
              <rect x="1" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="7.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
            Pause
          </button>
        )}
        <button
          type="button"
          className={confirmRestart ? pill.dark : pill.light}
          onClick={() => {
            if (confirmRestart) props.onRestart();
            else setConfirmRestart(true);
          }}
        >
          {confirmRestart ? "Sure? Start again" : "Start again"}
        </button>
        <span className="px-1 text-sm text-muted tabular-nums">{formatClock(props.seconds)}</span>
      </div>
    </div>
  );
}

/** A name for each board in the timeline, from what changed in that turn. The end page uses it too. */
export function frameLabel(frame: V2Frame, previous: V2Frame | undefined, isLast: boolean): string {
  if (isLast && frame.level === 4) return "Final board";
  if (!previous) return "First explanation";
  const gained = frame.clear - previous.clear;
  if (gained === 1) return "One more idea clear";
  if (gained > 1) return `${gained} more ideas clear`;
  if (frame.hintStep > 0) return `Hint ${frame.hintStep}`;
  return "Added detail";
}

function Timeline({
  frames,
  index,
  onPick,
  onReplay,
  className,
}: {
  frames: V2Frame[];
  index: number;
  onPick: (index: number) => void;
  onReplay: () => void;
  className: string;
}) {
  return (
    <section aria-label="Timeline" className={`flex flex-col gap-3 rounded-card bg-card px-5 py-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[15px] font-semibold">Timeline</span>
          <span className="text-[13px] text-muted">
            {frames.length > 0 ? "How your drawing grew. Click a board to look back." : "Your boards will line up here, one per turn."}
          </span>
        </div>
        <button
          type="button"
          onClick={onReplay}
          disabled={frames.length < 2}
          className={`${pill.light} gap-2 !px-[18px] !text-sm disabled:opacity-40`}
        >
          <svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14">
            <path d="M1 1 L11 7 L1 13 Z" fill="currentColor" />
          </svg>
          Replay
        </button>
      </div>
      {frames.length > 0 && (
        <ol className="m-0 flex list-none gap-2.5 overflow-x-auto p-0 pb-1">
          {frames.map((frame, i) => (
            <li key={frame.turn} className="flex-none animate-rise">
              <button
                type="button"
                onClick={() => onPick(i)}
                aria-pressed={i === index}
                className={`press flex w-[200px] flex-col gap-1.5 rounded-tile border-2 bg-card p-2 text-left text-ink ${
                  i === index ? "border-ink" : "border-line"
                }`}
              >
                <span className="pointer-events-none block overflow-hidden rounded-lg border border-line bg-paper">
                  <img src={frame.imageUrl} alt="" className="block aspect-video w-full object-cover" />
                </span>
                <span className="flex justify-between gap-2 text-[13px]">
                  <span className="truncate font-semibold">{frameLabel(frame, frames[i - 1], i === frames.length - 1)}</span>
                  <span className="flex-none text-muted tabular-nums">{formatClock(frame.at)}</span>
                </span>
                <span className="line-clamp-2 text-[13px] leading-[1.4] text-muted">“{frame.said}”</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
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

/** The mic waveform. It follows the real voice level when there is one. */
function Waveform({ active }: { active: boolean }) {
  return (
    <div aria-hidden="true" className="hidden h-8 flex-none items-center gap-[3px] sm:flex">
      {BAR_HEIGHTS.map((height, i) => (
        <span
          key={i}
          className="w-[3px] flex-none rounded-sm bg-ink"
          style={{
            height: height * 0.8,
            opacity: active ? 1 : 0.2,
            transform: active ? "scaleY(calc(0.2 + var(--vol, 0) * 0.8))" : "scaleY(0.3)",
          }}
        />
      ))}
    </div>
  );
}
