"use client";

// The engine of a live session. Give it what the student said, one turn at a time.
// It asks the brain to score the explanation, has fal redraw the board, and keeps the history.
// It also keeps a short log of what the agent is doing, so the screen can show its work.
// It knows nothing about voice: the session screen feeds it the transcript.

import { useEffect, useRef, useState } from "react";

import { saveSession } from "./history";
import { levelInfo, type Level } from "./levels";
import { MILO_SKETCHING_LINE, miloFirstMessage } from "./prompts";
import { ideasFor, type Detail, type Topic } from "./topics";
import type { DrawRequest, DrawResult, Frame, IdeaStatus, TurnLine, TurnRequest, TurnResult } from "./turn";

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
  /** The student has run out of things to say. Milo has wrapped up and named what to look up. */
  stuck: boolean;
};

/** What Milo says in reply to one student turn. Over means the lesson has ended. */
export type MiloLine = { line: string; over: boolean; /** Over because nothing is left to ask, not because every idea is clear. */ stuck: boolean };

export type MiloCallbacks = {
  /** The final board is on screen. The text is what Milo can say about it. */
  onFinalBoard?: (drew: string) => void;
  /** A board with Milo's hint sketch is on screen. The text is his teacher line. */
  onHelpBoard?: (line: string) => void;
};

/** Sounds people make while thinking. A turn made only of these is not an answer and is not scored. */
const FILLER = new Set(["uh", "um", "er", "erm", "ah", "oh", "hmm", "mm", "mhm", "okay", "ok", "yeah", "yep", "right", "so", "well", "like"]);

/** A short burst over Milo's picture when something happens: an idea clicks, he is lost, he grows up. */
export type Reaction = { id: number; text: string };

const MAX_STEPS = 3;

/** What a finished redraw needs to know about the turn that asked for it. */
type Owed = {
  /** Instructions not on the board yet, oldest first. Each one builds on the one before. */
  prompts: string[];
  said: string;
  drew: string;
  level: Level;
  line: string;
  gaps: string[];
  /** Milo's teacher line, and the gap it is for, when one of these instructions adds his hint sketch. */
  help: { line: string; gapId: string } | null;
  final: boolean;
};


async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Nothing may hang forever: a stuck request would leave the screen on "Thinking" or "Drawing".
    signal: AbortSignal.timeout(60000),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? `${url} failed (${response.status}).`);
  }
  return data;
}

/**
 * Asks the brain about a turn. The answer comes in two lines: first the marks and Milo's reply, which
 * is handed to `onLine` at once, then the whole result with the drawing instruction.
 */
async function postTurn(request: TurnRequest, onLine: (part: TurnLine) => void): Promise<TurnResult> {
  const response = await fetch("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `/api/turn failed (${response.status}).`);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let full: TurnResult | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    buffer += value ?? "";
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const text of lines) {
      if (!text.trim()) continue;
      const message = JSON.parse(text) as { part: "line" | "full" | "error"; error?: string };
      if (message.part === "error") throw new Error(message.error ?? "The brain failed.");
      if (message.part === "line") onLine(message as unknown as TurnLine);
      else full = message as unknown as TurnResult;
    }
    if (done) break;
  }
  if (!full) throw new Error("The brain did not finish its answer.");
  return full;
}

/** Resolves once the browser has the image, so the old board stays up until the new one can show. */
function preload(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => reject(new Error("The drawing took too long to load.")), 20000);
    image.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("The drawing did not load."));
    };
    image.src = url;
  });
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function useMiloSession(topic: Topic, detail: Detail, callbacks: MiloCallbacks = {}) {
  const keyIdeas = ideasFor(topic, detail);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [live, setLive] = useState<Live>({
    level: null,
    hint: null,
    gaps: keyIdeas.map((idea) => idea.gapLabel),
    ideas: null,
    stuck: false,
  });
  const [thinking, setThinking] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  // What Milo jots on the paper while the real drawing is being made, so the board reacts within
  // a couple of seconds instead of sitting still until fal answers.
  const [note, setNote] = useState<string | null>(null);

  const turns = useRef<string[]>([]);
  const scored = useRef(0);
  const running = useRef(false);
  const drawingNow = useRef(false);
  const level = useRef<Level | null>(null);
  const board = useRef<{ url: string | null; prompt: string | null }>({ url: null, prompt: null });
  // What the brain has asked for that is not on the board yet. Null when the board is up to date.
  const wanted = useRef<Owed | null>(null);
  // Gaps Milo has already sketched a hint for. He helps once per gap.
  const helped = useRef<string[]>([]);
  // The gap whose hint sketch is on the paper and has not been tried yet. One miss and he lets it go.
  const justHelped = useRef<string | null>(null);
  // Gaps he has let go of. He never asks about them again.
  const parked = useRef<string[]>([]);
  // How many times he has asked about each gap. A third question is nagging, so he hints instead.
  const asked = useRef<Record<string, number>>({});
  const lastAsked = useRef<string | null>(null);
  // Everything Milo has said, so the brain can read the new turn as an answer and never repeat a question.
  const miloLines = useRef<string[]>([miloFirstMessage(topic)]);
  // Milo's reply to the newest scored turn, and whoever is waiting for one. The voice side waits here,
  // so he never answers a turn with the question that was written for the turn before.
  const latestLine = useRef<{ count: number; reply: MiloLine | null } | null>(null);
  const waiters = useRef<{ count: number; resolve: (reply: MiloLine | null) => void }[]>([]);
  const finished = useRef(false);
  const framesRef = useRef<Frame[]>([]);
  const startedAt = useRef<number | null>(null);
  const sessionId = useRef<string | null>(null);
  const nextStepId = useRef(1);
  const callbacksRef = useRef(callbacks);
  const ideasBefore = useRef<IdeaStatus[] | null>(null);
  const nextReactionId = useRef(1);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const react = (text: string) => setReaction({ id: nextReactionId.current++, text });

  /** Hands Milo's reply for the first `count` turns to everyone waiting on it. Null means the brain failed. */
  const settle = (count: number, reply: MiloLine | null) => {
    latestLine.current = { count, reply };
    const ready = waiters.current.filter((waiter) => waiter.count <= count);
    waiters.current = waiters.current.filter((waiter) => waiter.count > count);
    for (const waiter of ready) waiter.resolve(reply);
  };

  const beginStep = (label: string, detailText?: string): number => {
    const id = nextStepId.current++;
    setSteps((list) =>
      [...list, { id, label, detail: detailText, state: "active" as const, startedAt: Date.now() }].slice(-MAX_STEPS),
    );
    return id;
  };
  const endStep = (id: number, patch: Partial<Step> = {}) => {
    setSteps((list) =>
      list.map((step) =>
        step.id === id ? { ...step, state: "done", seconds: (Date.now() - step.startedAt) / 1000, ...patch } : step,
      ),
    );
  };
  const logStep = (label: string, detailText?: string) => {
    const id = nextStepId.current++;
    setSteps((list) =>
      [...list, { id, label, detail: detailText, state: "done" as const, startedAt: Date.now() }].slice(-MAX_STEPS),
    );
  };

  // Drawing runs beside the scoring, never in front of it: Milo's reply must not wait for a picture.
  // One redraw is in flight at a time. Instructions that arrive meanwhile are drawn together next.
  const draw = async () => {
    if (drawingNow.current) return;
    drawingNow.current = true;
    let openStep: number | null = null;
    try {
      while (wanted.current && wanted.current.prompts.length > 0) {
        const owed = wanted.current;
        const count = owed.prompts.length;
        setDrawing(true);
        setNote(owed.said);
        openStep = beginStep(
          owed.help ? "Sketching a hint for you" : "Redrawing the board",
          owed.level === 4 && detail !== "basics" ? "fal, careful model" : "fal, fast model",
        );
        const request: DrawRequest = {
          prompt: owed.prompts.join(" Then, on the same paper: "),
          previousImageUrl: board.current.url,
          level: owed.level,
          detail,
        };
        // One retry: a single failed redraw should not leave an old board up while Milo says he gets it.
        let drawn: DrawResult | null = null;
        for (let attempt = 0; attempt < 2 && !drawn; attempt++) {
          try {
            const tried = await postJson<DrawResult>("/api/draw", request);
            await preload(tried.imageUrl);
            drawn = tried;
          } catch (caught) {
            if (attempt === 1) throw caught;
          }
        }
        if (!drawn) break;
        endStep(openStep, { label: owed.help ? "Hint sketched" : "Board redrawn" });
        openStep = null;

        board.current = { url: drawn.imageUrl, prompt: owed.prompts[count - 1] };
        // Anything the brain asked for while fal was drawing is still owed.
        const newer = wanted.current;
        wanted.current = newer && newer.prompts.length > count ? { ...newer, prompts: newer.prompts.slice(count), help: newer.help === owed.help ? null : newer.help } : null;

        const frame: Frame = {
          turn: framesRef.current.length + 1,
          level: owed.level,
          said: owed.said,
          imageUrl: drawn.imageUrl,
          at: startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0,
          hint: owed.line,
          gaps: owed.gaps,
          hinted: Boolean(owed.help),
        };
        framesRef.current = [...framesRef.current, frame];
        setFrames(framesRef.current);
        setNote(null);

        // Every new board updates this session's entry in the history. Saved before Milo is told,
        // so a dropped voice call cannot lose the frame.
        sessionId.current ??= Date.now().toString(36);
        saveSession({
          id: sessionId.current,
          topicTitle: topic.title,
          subject: topic.subject,
          detail,
          frames: framesRef.current,
          savedAt: Date.now(),
        });
        try {
          if (owed.help) {
            // The student can see the hint from now. Their next turn is their one try at it.
            justHelped.current = owed.help.gapId;
            callbacksRef.current.onHelpBoard?.(owed.help.line);
          } else if (owed.final && !wanted.current) callbacksRef.current.onFinalBoard?.(owed.drew);
        } catch {
          // Milo does not say it out loud. The board is still on screen.
        }
      }
    } catch (caught) {
      console.error("Milo's drawing failed:", caught);
      if (openStep !== null) endStep(openStep, { state: "error", detail: "Did not finish" });
      setError("The drawing did not come back. Keep talking, Milo will try again on your next turn.");
    } finally {
      drawingNow.current = false;
      setNote(null);
      setDrawing(false);
    }
  };

  const run = async () => {
    // One scoring pass at a time. Turns that arrive meanwhile are scored together in the next pass.
    if (running.current) return;
    running.current = true;
    let openStep: number | null = null;
    try {
      while (scored.current < turns.current.length) {
        const studentTurns = turns.current.slice();
        scored.current = studentTurns.length;
        setError(null);

        setThinking(true);
        const total = keyIdeas.length;
        openStep = beginStep(`Checking it against ${total} key ideas`, "Claude");
        const basePrompt = wanted.current?.prompts.at(-1) ?? board.current.prompt;
        const request: TurnRequest = {
          topic: {
            title: topic.title,
            keyIdeas: keyIdeas.map((idea) => ({ id: idea.id, idea: idea.idea, gap: idea.gapLabel })),
          },
          detail,
          studentTurns,
          miloLines: miloLines.current,
          helpedGapIds: helped.current,
          // Asked twice already and never helped: one more miss gets a hint, not a third question.
          helpGapId:
            lastAsked.current && (asked.current[lastAsked.current] ?? 0) >= 2 && !helped.current.includes(lastAsked.current)
              ? lastAsked.current
              : null,
          leaveGapId: justHelped.current,
          parkedGapIds: parked.current,
          previousLevel: level.current,
          // The newest instruction, drawn or not, so each one builds on the one before.
          previousDrawPrompt: basePrompt,
        };
        // The first half of the answer is enough for Milo to reply: the marks and his line.
        const mark = openStep;
        const judge = (part: TurnLine) => {
          const statusOf = (id: string): IdeaStatus => part.ideas.find((idea) => idea.id === id)?.status ?? "missing";
          const ideas = keyIdeas.map((idea) => statusOf(idea.id));
          const clear = ideas.filter((status) => status === "clear").length;

          // The gap he hinted at gets one try. Still not there: he lets it go for good.
          const leaving = request.leaveGapId;
          if (leaving) {
            if (justHelped.current === leaving) justHelped.current = null;
            if (statusOf(leaving) !== "clear" && !parked.current.includes(leaving)) parked.current = [...parked.current, leaving];
          }

          // Gap labels still open. The ones he can still ask about come first, biggest first.
          const open = keyIdeas.filter((idea) => statusOf(idea.id) !== "clear");
          const askable = open.filter((idea) => !parked.current.includes(idea.id));
          const target = askable.find((idea) => idea.id === part.biggestGapId) ?? askable[0] ?? null;
          const gaps = [
            ...askable.filter((idea) => idea === target),
            ...askable.filter((idea) => idea !== target),
            ...open.filter((idea) => parked.current.includes(idea.id)),
          ].map((idea) => idea.gapLabel);

          endStep(mark, {
            label: `Checked ${total} key ideas`,
            detail: `${clear} of ${total} clear. ${levelInfo(part.level).label}`,
          });

          // The fact check runs in the same call, before anything is drawn. A wrong claim is drawn as a
          // grey question, never as a fact.
          const wrongClaims = part.wrongClaims ?? [];
          if (wrongClaims.length > 0) {
            logStep("Fact check: something to check", `“${shorten(wrongClaims[0], 56)}”`);
          }

          // The lesson ends when every idea is clear, or when every gap still open has been let go.
          // That is decided here, not by the model, so he cannot give up early or carry on asking.
          const done = open.length === 0;
          const stuck = !done && askable.length === 0;
          finished.current = done || stuck;
          // He helps once per gap, never on the first turn, and only with a gap he has not let go.
          const helping = part.help && target !== null && !helped.current.includes(target.id) && studentTurns.length > 1;
          if (helping && target) helped.current = [...helped.current, target.id];

          // Milo reacts to what changed: he grew up, an idea clicked, something is wrong, or nothing landed.
          const before = ideasBefore.current;
          const clicked = ideas.some((status, i) => status === "clear" && before?.[i] !== "clear");
          const grewUp = level.current !== null && part.level > level.current;
          if (done) react("I get it!");
          else if (helping) react("A hint!");
          else if (grewUp) react("I'm growing!");
          else if (ideas.includes("wrong") || wrongClaims.length > 0) react("Huh?!");
          else if (clicked) react("Ohh!");
          ideasBefore.current = ideas;
          level.current = part.level;

          const lookUp = open[0]?.gapLabel ?? "";
          let line = part.hint;
          if (stuck && !part.stuck) {
            line = `This is as far as we got today, and that's okay. The bit to look up is ${lookUp.charAt(0).toLowerCase()}${lookUp.slice(1)}. Your sheet is ready.`;
          } else if (part.stuck && !stuck) {
            // A wrap-up line that came too early must not be spoken.
            line = done ? "I finally get it. That all fits together now." : "Tell me a bit more about that?";
          }
          setLive({ level: part.level, hint: line, gaps, ideas, stuck });

          // What Milo says back. On a helping turn he only says he is sketching: the teacher line waits
          // for the sketch to be on the paper.
          if (!helping && !done && !stuck && target) {
            asked.current = { ...asked.current, [target.id]: (asked.current[target.id] ?? 0) + 1 };
            lastAsked.current = target.id;
          }
          miloLines.current = [...miloLines.current, line];
          settle(studentTurns.length, { line: helping ? MILO_SKETCHING_LINE : line, over: done || stuck, stuck });
          logStep(
            stuck ? "Wrapping up" : done ? "Nothing left to ask" : helping ? "Time for a hint" : "Worked out what to ask next",
            target?.gapLabel,
          );
          setThinking(false);
          return { line, gaps, done, helping, target };

        };
        let early: ReturnType<typeof judge> | null = null;
        const result = await postTurn(request, (part) => {
          early ??= judge(part);
        });
        openStep = null;
        const { line, gaps, done, helping, target } = early ?? judge(result);

        if (result.changed || helping) {
          const earlier = wanted.current;
          wanted.current = {
            prompts: [...(earlier?.prompts ?? []), result.drawPrompt],
            said: result.said,
            drew: result.drew,
            level: result.level,
            line,
            gaps,
            help: helping && target ? { line: result.hint, gapId: target.id } : (earlier?.help ?? null),
            final: done,
          };
        } else if (wanted.current) {
          // Nothing new, but a redraw is still owed. It carries the newest level and gaps.
          wanted.current = { ...wanted.current, level: result.level, line, gaps, final: done };
        } else {
          logStep("Nothing new to draw", "The board stays as it is");
          // The last board is already up, so Milo can show it straight away.
          if (done && board.current.url) {
            try {
              callbacksRef.current.onFinalBoard?.(result.drew || "the finished sheet");
            } catch {
              // Milo does not say it out loud. The board is still on screen.
            }
          }
        }
        void draw();
      }
    } catch (caught) {
      // The technical reason goes to the console. The student gets a plain line.
      console.error("Milo's turn failed:", caught);
      if (openStep !== null) endStep(openStep, { state: "error", detail: "Did not finish" });
      // Nobody may wait on a line that is not coming.
      settle(turns.current.length, null);
      setError("Milo could not check that. Keep talking, he will try again on your next turn.");
    } finally {
      running.current = false;
      setThinking(false);
    }
  };

  /** Call once when the session starts, so frame times count from there. */
  const start = () => {
    if (startedAt.current === null) startedAt.current = Date.now();
  };

  /** Add what the student just said. */
  const addTurn = (text: string) => {
    const said = text.trim();
    // "Uh" or "Okay" is not an answer. A short real answer ("Wheels.", "I don't know") is, and gets scored.
    const words = said.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
    if (words.length === 0 || words.every((word) => FILLER.has(word))) return;
    // The lesson has ended. Anything said after the goodbye is not part of the explanation.
    if (finished.current) return;
    start();
    turns.current = [...turns.current, said];
    setHeard(said);
    logStep("Heard you", `“${shorten(said, 64)}”`);
    void run();
  };

  /** Everything the student has said so far, oldest first. */
  const said = () => turns.current.slice();

  /** How many turns the student has had. */
  const turnCount = () => turns.current.length;

  /** True once the lesson has ended: every idea is clear, or there is nothing left to ask. */
  const isOver = () => finished.current;

  /** Milo's reply to the first `count` turns, as soon as the brain has it. Null if the brain failed. */
  const lineFor = (count: number): Promise<MiloLine | null> => {
    const latest = latestLine.current;
    if (latest && latest.count >= count) return Promise.resolve(latest.reply);
    return new Promise((resolve) => {
      waiters.current = [...waiters.current, { count, resolve }];
    });
  };

  const busy: "idle" | "thinking" | "drawing" = thinking ? "thinking" : drawing ? "drawing" : "idle";

  return { frames, live, busy, drawing, error, steps, reaction, heard, note, addTurn, start, said, turnCount, isOver, lineFor };
}
