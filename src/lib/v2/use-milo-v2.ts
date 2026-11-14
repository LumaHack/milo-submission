"use client";

// The v2 session engine (approach B, docs/V2.md). It knows nothing about voice.
// - addTranscript records what the student said. Silences and "um" are never scored.
// - scoreNow has Claude score everything said so far and returns Milo's next line at once.
//   The voice agent's update_board tool calls it, so Milo's line always matches the board.
// - The board redraws in the background: one redraw in flight, the newest result waiting behind it.

import { useMemo, useRef, useState } from "react";

import { levelInfo, type Level } from "@/lib/levels";
import type { DrawResult, Frame, IdeaStatus } from "@/lib/turn";
import type { Step } from "@/lib/use-milo-session";

import type { HintStep, Mode, V2TurnRequest, V2TurnResult } from "./contract";
import type { V2Topic } from "./topics";

const MAX_STEPS = 3;
/** Said by Milo when Claude does not answer, so the conversation carries on. */
export const CRAYON_SLIPPED = "Oops, my crayon slipped! Can you say that again?";

/** Silences and noise that the voice agent reports as a turn. */
export function isFiller(text: string): boolean {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .trim();
  return words.length === 0 || /^((um+|uh+|hm+|mm+|erm?)\s*)+$/.test(words);
}

type ScoredTurn = V2TurnResult & { seconds: number };

export type V2Live = {
  level: Level | null;
  /** Status of each key idea, in topic order. Null until the first turn is scored. */
  ideas: IdeaStatus[] | null;
  gapId: string | null;
  hintStep: HintStep;
  miloLine: string | null;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function useMiloV2(topic: V2Topic, mode: Mode) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [live, setLive] = useState<V2Live>({ level: null, ideas: null, gapId: null, hintStep: 0, miloLine: null });
  const [thinking, setThinking] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  const turns = useRef<string[]>([]);
  const scored = useRef(0);
  const scoring = useRef<Promise<string | null> | null>(null);
  // A turn the agent passed to update_board before its transcript arrived, and when.
  const fromTool = useRef<number | null>(null);
  const memory = useRef<{
    level: Level | null;
    ideas: V2TurnResult["ideas"] | null;
    gapId: string | null;
    hintStep: HintStep;
    lines: string[];
  }>({ level: null, ideas: null, gapId: null, hintStep: 0, lines: [] });
  const board = useRef<{ url: string | null; prompt: string | null }>({ url: null, prompt: null });
  const inFlight = useRef<ScoredTurn | null>(null);
  const waiting = useRef<ScoredTurn | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const startedAt = useRef<number | null>(null);
  const nextStepId = useRef(1);

  const beginStep = (label: string, detail?: string): number => {
    const id = nextStepId.current++;
    setSteps((list) => [...list, { id, label, detail, state: "active" as const, startedAt: Date.now() }].slice(-MAX_STEPS));
    return id;
  };
  const endStep = (id: number, patch: Partial<Step> = {}) => {
    setSteps((list) =>
      list.map((step) =>
        step.id === id ? { ...step, state: "done", seconds: (Date.now() - step.startedAt) / 1000, ...patch } : step,
      ),
    );
  };
  const logStep = (label: string, detail?: string) => {
    const id = nextStepId.current++;
    setSteps((list) => [...list, { id, label, detail, state: "done" as const, startedAt: Date.now() }].slice(-MAX_STEPS));
  };

  const start = () => {
    if (startedAt.current === null) startedAt.current = Date.now();
  };
  const elapsed = () => (startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0);

  /** Gap labels still open after a result, biggest first. */
  const gapsAfter = (result: Pick<V2TurnResult, "ideas" | "biggestGapId">): string[] => {
    const open = topic.keyIdeas.filter(
      (idea) => result.ideas.find((entry) => entry.id === idea.id)?.status !== "clear",
    );
    return [
      ...open.filter((idea) => idea.id === result.biggestGapId),
      ...open.filter((idea) => idea.id !== result.biggestGapId),
    ].map((idea) => idea.gapLabel);
  };

  const draw = async (result: ScoredTurn) => {
    inFlight.current = result;
    setDrawing(true);
    const id = beginStep("Redrawing the board", "fal, fast model");
    try {
      const drawn = await postJson<DrawResult>("/api/v2/draw", {
        prompt: result.drawPrompt,
        previousImageUrl: board.current.url,
      });
      await preload(drawn.imageUrl);
      endStep(id, { label: "Board redrawn" });
      board.current = { url: drawn.imageUrl, prompt: result.drawPrompt };
      const frame: Frame = {
        turn: framesRef.current.length + 1,
        level: result.level,
        said: result.said,
        imageUrl: drawn.imageUrl,
        at: elapsed(),
        hint: result.miloLine,
        gaps: gapsAfter(result),
      };
      framesRef.current = [...framesRef.current, frame];
      setFrames(framesRef.current);
    } catch {
      endStep(id, { state: "error", detail: "Did not finish" });
      setError("The drawing did not come back. Keep talking, Milo will try again.");
    } finally {
      inFlight.current = null;
      const next = waiting.current;
      waiting.current = null;
      if (next) void draw(next);
      else setDrawing(false);
    }
  };

  /** One redraw in flight. A newer result replaces any that was waiting, so the newest wins. */
  const queueDraw = (result: ScoredTurn) => {
    if (inFlight.current) waiting.current = result;
    else void draw(result);
  };

  /** Records what the student said. Returns false for silences and "um", which are never scored. */
  const addTranscript = (text: string): boolean => {
    const said = text.trim();
    if (isFiller(said)) return false;
    start();
    const recentToolTurn = fromTool.current !== null && Date.now() - fromTool.current < 8000;
    // The real transcript replaces the words the agent passed to the tool for the same turn.
    turns.current = recentToolTurn ? [...turns.current.slice(0, -1), said] : [...turns.current, said];
    fromTool.current = null;
    logStep("Heard you", `“${shorten(said, 64)}”`);
    return true;
  };

  const hasUnscored = () => scored.current < turns.current.length;

  /**
   * Scores everything said so far and returns Milo's next line, or null when nothing is new.
   * point is what the agent passed to update_board, used if the transcript has not arrived yet.
   */
  const scoreNow = async (point?: string): Promise<string | null> => {
    // One scoring at a time, so each one builds on the state the previous one left.
    while (scoring.current) await scoring.current.catch(() => null);

    const said = point?.trim();
    if (said && !isFiller(said) && !hasUnscored()) {
      start();
      turns.current = [...turns.current, said];
      fromTool.current = Date.now();
      logStep("Heard you", `“${shorten(said, 64)}”`);
    }
    if (!hasUnscored()) return null;

    const run = (async () => {
      const studentTurns = turns.current.slice();
      setThinking(true);
      setError(null);
      const total = topic.keyIdeas.length;
      const id = beginStep(`Checking it against ${total} key ideas`, "Claude");
      try {
        const before = memory.current;
        const request: V2TurnRequest = {
          topicId: topic.id,
          mode,
          studentTurns,
          previousLevel: before.level,
          previousIdeas: before.ideas,
          previousBiggestGapId: before.gapId,
          previousHintStep: before.hintStep,
          // The board the next drawing will edit: the one being drawn now, or the one on screen.
          previousDrawPrompt: inFlight.current?.drawPrompt ?? board.current.prompt,
          recentMiloLines: before.lines.slice(-4),
        };
        const result = await postJson<ScoredTurn>("/api/v2/turn", request);
        scored.current = Math.max(scored.current, studentTurns.length);
        memory.current = {
          level: result.level,
          ideas: result.ideas,
          gapId: result.biggestGapId,
          hintStep: result.hintStep,
          lines: [...before.lines, result.miloLine].slice(-6),
        };
        const statuses = topic.keyIdeas.map(
          (idea) => result.ideas.find((entry) => entry.id === idea.id)?.status ?? "missing",
        );
        const clear = statuses.filter((status) => status === "clear").length;
        endStep(id, {
          label: `Checked ${total} key ideas`,
          detail: `${clear} of ${total} clear. ${levelInfo(result.level).label}`,
        });
        setLive({
          level: result.level,
          ideas: statuses,
          gapId: result.biggestGapId,
          hintStep: result.hintStep,
          miloLine: result.miloLine,
        });
        if (result.changed) queueDraw(result);
        else logStep("Nothing new to draw", "The board stays as it is");
        return result.miloLine;
      } catch {
        // The turns stay unscored, so the next call tries them again.
        endStep(id, { state: "error", detail: "Did not finish" });
        setError("Milo lost his train of thought. Keep talking, he will try again.");
        return CRAYON_SLIPPED;
      } finally {
        setThinking(false);
      }
    })();

    scoring.current = run;
    try {
      return await run;
    } finally {
      scoring.current = null;
    }
  };

  const gaps = useMemo(() => {
    if (!live.ideas) return topic.keyIdeas.map((idea) => idea.gapLabel);
    const ideas = topic.keyIdeas.map((idea, index) => ({ id: idea.id, status: live.ideas?.[index] ?? "missing" }));
    return gapsAfter({ ideas, biggestGapId: live.gapId });
    // gapsAfter only reads the topic, which never changes during a session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, topic]);

  return { frames, live, gaps, thinking, drawing, error, steps, start, addTranscript, scoreNow, hasUnscored };
}
