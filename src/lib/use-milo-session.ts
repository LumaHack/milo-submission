"use client";

// The engine of a live session. Give it what the student said, one turn at a time.
// It asks the brain to score the explanation, has fal redraw the board, and keeps the history.
// It knows nothing about voice: the session screen feeds it transcripts (or typed text).

import { useEffect, useRef, useState } from "react";

import type { Level } from "./levels";
import { getTopic } from "./topics";
import type { DrawRequest, DrawResult, Frame, TurnRequest, TurnResult } from "./turn";

export const STORAGE_KEY = "milo.session";

export type StoredSession = { topicId: string; frames: Frame[] };

type Live = {
  /** Null until the first turn has been scored. */
  level: Level | null;
  hint: string | null;
  gaps: string[];
};

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

export function useMiloSession(
  topicId: string,
  onHint?: (hint: string, nothingLeft: boolean) => void,
) {
  const topic = getTopic(topicId);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [live, setLive] = useState<Live>({
    level: null,
    hint: null,
    gaps: topic ? topic.keyIdeas.map((idea) => idea.gapLabel) : [],
  });
  const [busy, setBusy] = useState<"idle" | "thinking" | "drawing">("idle");
  const [error, setError] = useState<string | null>(null);

  const turns = useRef<string[]>([]);
  const scored = useRef(0);
  const running = useRef(false);
  const level = useRef<Level | null>(null);
  const board = useRef<{ url: string | null; prompt: string | null }>({ url: null, prompt: null });
  const framesRef = useRef<Frame[]>([]);
  const startedAt = useRef<number | null>(null);
  const onHintRef = useRef(onHint);

  useEffect(() => {
    onHintRef.current = onHint;
  }, [onHint]);

  const run = async () => {
    // One run at a time. Turns that arrive meanwhile are scored together in the next pass,
    // so only one redraw is ever in flight and the newest explanation wins.
    if (running.current || !topic) return;
    running.current = true;
    try {
      while (scored.current < turns.current.length) {
        const studentTurns = turns.current.slice();
        scored.current = studentTurns.length;
        setError(null);

        setBusy("thinking");
        const request: TurnRequest = {
          topicId,
          studentTurns,
          previousLevel: level.current,
          previousDrawPrompt: board.current.prompt,
        };
        const result = await postJson<TurnResult>("/api/turn", request);

        // Gap labels still open, biggest first.
        const open = result.ideas.filter((idea) => idea.status !== "clear").map((idea) => idea.id);
        const ordered = [
          ...open.filter((id) => id === result.biggestGapId),
          ...open.filter((id) => id !== result.biggestGapId),
        ];
        const gaps = ordered
          .map((id) => topic.keyIdeas.find((idea) => idea.id === id)?.gapLabel)
          .filter((label): label is string => Boolean(label));

        level.current = result.level;
        setLive({ level: result.level, hint: result.hint, gaps });
        onHintRef.current?.(result.hint, gaps.length === 0);

        if (!result.changed) continue;

        setBusy("drawing");
        const draw: DrawRequest = {
          prompt: result.drawPrompt,
          previousImageUrl: board.current.url,
          level: result.level,
        };
        const drawn = await postJson<DrawResult>("/api/draw", draw);
        await preload(drawn.imageUrl);

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
    void run();
  };

  return { frames, live, busy, error, addTurn, start };
}
