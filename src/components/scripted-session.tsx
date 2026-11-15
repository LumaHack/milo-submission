"use client";

// The scripted run: the four turns from the design, using stored fal images. No network, no keys.
// It is the fallback if the venue wifi dies. The header says "Scripted run" so nobody mistakes it for live.

import { useEffect, useRef, useState } from "react";

import { SessionView } from "@/components/session-view";
import { DEMO_FRAMES, DEMO_TOPIC_ID } from "@/lib/demo";
import { getTopic } from "@/lib/topics";
import type { MiloStatus } from "@/lib/turn";
import { saveSession } from "@/lib/history";
import { miloFirstMessage } from "@/lib/prompts";
import type { Step } from "@/lib/use-milo-session";

export function ScriptedSession() {
  const topic = getTopic(DEMO_TOPIC_ID);
  const [shown, setShown] = useState(0);
  const [drawingSince, setDrawingSince] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const drawing = drawingSince !== null;

  // Each press of the mic button plays the next scripted turn.
  const next = () => {
    if (drawing || shown >= DEMO_FRAMES.length) return;
    setDrawingSince(Date.now());
    timer.current = setTimeout(() => {
      const count = shown + 1;
      setShown(count);
      setDrawingSince(null);
      saveSession({
        id: "scripted",
        topicTitle: "How a cell works (scripted run)",
        subject: "Biology",
        detail: "exam",
        frames: DEMO_FRAMES.slice(0, count),
        savedAt: Date.now(),
      });
    }, 1600);
  };

  if (!topic) return null;

  const frames = DEMO_FRAMES.slice(0, shown);
  const latest = frames[frames.length - 1];
  const upcoming = DEMO_FRAMES[shown];
  const done = shown >= DEMO_FRAMES.length;
  const status: MiloStatus = drawing ? "drawing" : done ? "off" : "listening";

  // The feed for a scripted run only says what the screen is replaying. It claims no live work.
  const steps: Step[] = [];
  if (latest) {
    steps.push({ id: latest.turn * 2, label: "Replayed turn", detail: `“${latest.said}”`, state: "done", startedAt: 0 });
  }
  if (drawing && upcoming) {
    steps.push({ id: upcoming.turn * 2 + 1, label: "Showing the stored board", detail: "Scripted", state: "active", startedAt: drawingSince });
  }

  return (
    <SessionView
      topicTitle={topic.title}
      openingLine={miloFirstMessage(topic)}
      subjectLine="Biology, how a cell works. Scripted run"
      frames={frames}
      live={{
        level: latest?.level ?? null,
        hint: latest?.hint ?? null,
        gaps: latest ? latest.gaps : topic.keyIdeas.map((idea) => idea.gapLabel),
      }}
      status={status}
      drawing={drawing}
      error={null}
      seconds={latest?.at ?? 0}
      steps={steps}
      micOn={!done}
      micLabel={done ? "The scripted run is finished" : "Play the next scripted turn"}
      micHint={shown === 0 && !drawing ? "Press the mic to play the first turn" : null}
      onMic={next}
      credits="Scripted run. Nothing here is live. The boards were drawn earlier by fal."
    />
  );
}
