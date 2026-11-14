"use client";

// The engine of a live session. Give it what the student said, one turn at a time.
// It asks the brain to score the explanation, has fal redraw the board, and keeps the history.
// It also keeps a short log of what the agent is doing, so the screen can show its work.
// It knows nothing about voice: the session screen feeds it the transcript.

import { useEffect, useRef, useState } from "react";

import { levelInfo, type Level } from "./levels";
import { getTopic } from "./topics";
import type { DrawRequest, DrawResult, Frame, IdeaStatus, TurnRequest, TurnResult } from "./turn";

export const STORAGE_KEY = "milo.session";

export type StoredSession = { topicId: string; frames: Frame[] };

/** One line in the "What Milo is doing" feed. */
export type Step = {
  id: number;
  label: string;
  detail?: string;
  state: "active" | "done" | "error";
  /** Wall-clock start, in milliseconds. Used to tick the timer on an active step. */
  startedAt: number;
  /** How long the step took, once it is done. */
  seconds?: number;
};

export type Live = {
  /** Null until the first turn has been scored. */
  level: Level | null;
  hint: string | null;
  gaps: string[];
  /** Status of each key idea, in topic order. Null until the first turn has been scored. */
  ideas: IdeaStatus[] | null;
};

const MAX_STEPS = 3;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? `${url} failed (${response.status}).`);
  }
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

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * onHint is called after each scored turn with Milo's next line. Return true if it was passed
 * on to the voice agent, so the feed can say so.
 */
export function useMiloSession(topicId: string, onHint?: (hint: string, nothingLeft: boolean) => boolean) {
  const topic = getTopic(topicId);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [live, setLive] = useState<Live>({
    level: null,
    hint: null,
    gaps: topic ? topic.keyIdeas.map((idea) => idea.gapLabel) : [],
    ideas: null,
  });
  const [busy, setBusy] = useState<"idle" | "thinking" | "drawing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  const turns = useRef<string[]>([]);
  const scored = useRef(0);
  const running = useRef(false);
  const level = useRef<Level | null>(null);
  const board = useRef<{ url: string | null; prompt: string | null }>({ url: null, prompt: null });
  const framesRef = useRef<Frame[]>([]);
  const startedAt = useRef<number | null>(null);
  const nextStepId = useRef(1);
  const onHintRef = useRef(onHint);

  useEffect(() => {
    onHintRef.current = onHint;
  }, [onHint]);

  const beginStep = (label: string, detail?: string): number => {
    const id = nextStepId.current++;
    setSteps((list) => [...list, { id, label, detail, state: "active" as const, startedAt: Date.now() }].slice(-MAX_STEPS));
    return id;
  };
  const endStep = (id: number, patch: Partial<Step> = {}) => {
    setSteps((list) =>
      list.map((step) =>
        step.id === id
          ? { ...step, state: "done", seconds: (Date.now() - step.startedAt) / 1000, ...patch }
          : step,
      ),
    );
  };
  const logStep = (label: string, detail?: string) => {
    const id = nextStepId.current++;
    setSteps((list) =>
      [...list, { id, label, detail, state: "done" as const, startedAt: Date.now() }].slice(-MAX_STEPS),
    );
  };

  const run = async () => {
    // One run at a time. Turns that arrive meanwhile are scored together in the next pass,
    // so only one redraw is ever in flight and the newest explanation wins.
    if (running.current || !topic) return;
    running.current = true;
    let openStep: number | null = null;
    try {
      while (scored.current < turns.current.length) {
        const studentTurns = turns.current.slice();
        scored.current = studentTurns.length;
        setError(null);

        setBusy("thinking");
        const total = topic.keyIdeas.length;
        openStep = beginStep(`Checking it against ${total} key ideas`, "Claude");
        const request: TurnRequest = {
          topicId,
          studentTurns,
          previousLevel: level.current,
          previousDrawPrompt: board.current.prompt,
        };
        const result = await postJson<TurnResult>("/api/turn", request);

        const statusOf = (id: string): IdeaStatus => result.ideas.find((idea) => idea.id === id)?.status ?? "missing";
        const ideas = topic.keyIdeas.map((idea) => statusOf(idea.id));
        const clear = ideas.filter((status) => status === "clear").length;

        // Gap labels still open, biggest first.
        const open = topic.keyIdeas.filter((idea) => statusOf(idea.id) !== "clear");
        const gaps = [
          ...open.filter((idea) => idea.id === result.biggestGapId),
          ...open.filter((idea) => idea.id !== result.biggestGapId),
        ].map((idea) => idea.gapLabel);

        endStep(openStep, {
          label: `Checked ${total} key ideas`,
          detail: `${clear} of ${total} clear. ${levelInfo(result.level).label}`,
        });
        openStep = null;

        level.current = result.level;
        setLive({ level: result.level, hint: result.hint, gaps, ideas });
        if (onHintRef.current?.(result.hint, gaps.length === 0)) {
          logStep("Told Milo what to ask next", gaps[0] ?? "Nothing left to ask");
        }

        if (!result.changed) {
          logStep("Nothing new to draw", "The board stays as it is");
          continue;
        }

        setBusy("drawing");
        openStep = beginStep("Redrawing the board", result.level === 4 ? "fal, careful model" : "fal, fast model");
        const draw: DrawRequest = {
          prompt: result.drawPrompt,
          previousImageUrl: board.current.url,
          level: result.level,
        };
        const drawn = await postJson<DrawResult>("/api/draw", draw);
        await preload(drawn.imageUrl);
        endStep(openStep, { label: "Board redrawn" });
        openStep = null;

        board.current = { url: drawn.imageUrl, prompt: result.drawPrompt };
        const frame: Frame = {
          turn: framesRef.current.length + 1,
          level: result.level,
          said: result.said,
          imageUrl: drawn.imageUrl,
          at: startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0,
          hint: result.hint,
          gaps,
        };
        framesRef.current = [...framesRef.current, frame];
        setFrames(framesRef.current);
        try {
          const stored: StoredSession = { topicId, frames: framesRef.current };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch {
          // Storage can be blocked. The session still works without it.
        }
      }
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : "Something went wrong.";
      if (openStep !== null) endStep(openStep, { state: "error", detail: "Did not finish" });
      setError(`${reason} Keep talking, Milo will try again.`);
    } finally {
      running.current = false;
      setBusy("idle");
    }
  };

  /** Call once when the session starts, so frame times count from there. */
  const start = () => {
    if (startedAt.current === null) startedAt.current = Date.now();
  };

  /** Add what the student just said. */
  const addTurn = (text: string) => {
    const said = text.trim();
    if (!said) return;
    start();
    turns.current = [...turns.current, said];
    logStep("Heard you", `“${shorten(said, 64)}”`);
    void run();
  };

  return { frames, live, busy, error, steps, addTurn, start };
}
