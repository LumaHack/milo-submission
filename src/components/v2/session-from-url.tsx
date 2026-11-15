"use client";

// Reads the topic and mode from the address: a built-in topic (/v2/session?topic=ww2&mode=exam) or a
// part of the student's own course (/v2/session?course=…&part=…&mode=coach). See src/lib/v2/target.ts.
// If this topic has a saved session, it first asks: pick up where you left off, or start fresh.
// For testing without a microphone: &voice=text runs a typed chat with Milo's agent,
// &voice=off runs with no Milo at all. See window.miloSay in live-session-v2.tsx.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";

import { Page, pill } from "@/components/ui";
import { formatClock } from "@/lib/demo";
import type { AgentVariant } from "@/lib/v2/agent";
import { retireSession } from "@/lib/v2/keep-sheet";
import { loadSession, type SavedSession } from "@/lib/v2/storage";
import { readTarget, voiceSuffix, type Target } from "@/lib/v2/target";

import { LiveSessionV2, type VoiceMode } from "./live-session-v2";
import { TopicMissing } from "./topic-missing";

export function SessionFromUrl() {
  const params = useSearchParams();
  const voiceParam = params.get("voice");
  const voice: VoiceMode = voiceParam === "off" ? "off" : voiceParam === "text" ? "text" : "on";
  // &agent=words talks to the second agent, "Milo v2 words". See src/lib/v2/agent.ts.
  const agent: AgentVariant | null = params.get("agent") === "words" ? "words" : null;
  return <SessionGate key={params.toString()} voice={voice} agent={agent} />;
}

function SessionGate({ voice, agent }: { voice: VoiceMode; agent: AgentVariant | null }) {
  // The saved session and the student's courses live in this browser's storage, so this only renders in the browser.
  use(browser("The saved session is kept in localStorage."));
  const params = useSearchParams();
  const [target] = useState(() => readTarget(params));
  const [saved] = useState(() => (target ? loadSession(target.topic.id, target.mode) : null));
  const [decision, setDecision] = useState<"resume" | "fresh" | null>(
    saved && saved.frames.length > 0 ? null : "fresh",
  );
  // Bumped by "Start again", so the session starts over from nothing.
  const [run, setRun] = useState(0);

  if (!target) return <TopicMissing />;

  if (decision === null && saved) {
    return (
      <ResumeChoice
        target={target}
        saved={saved}
        onResume={() => setDecision("resume")}
        onFresh={() => {
          // The old boards go to "Your revision sheets" before the session is cleared.
          retireSession(target);
          setDecision("fresh");
        }}
      />
    );
  }
  return (
    <LiveSessionV2
      key={run}
      target={target}
      voice={voice}
      agent={agent}
      endHref={`/v2/end?${target.query}${voiceSuffix(params)}`}
      initial={decision === "resume" && run === 0 ? saved : null}
      onRestart={() => {
        setDecision("fresh");
        setRun((value) => value + 1);
      }}
    />
  );
}

function ResumeChoice({
  target,
  saved,
  onResume,
  onFresh,
}: {
  target: Target;
  saved: SavedSession;
  onResume: () => void;
  onFresh: () => void;
}) {
  const { topic } = target;
  const last = saved.frames.at(-1);
  const clear = saved.live.ideas?.filter((status) => status === "clear").length ?? 0;
  const total = topic.keyIdeas.length;
  return (
    <Page header={<span className="text-xl font-semibold tracking-[-0.02em]">Milo</span>}>
      <main className="flex flex-1 items-start justify-center rounded-panel bg-panel p-3">
        <section className="flex w-full max-w-[720px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">Pick up where you left off?</h1>
            <p className="m-0 text-base leading-normal text-muted">
              {topic.title}: {clear} of {total} ideas explained, {saved.frames.length}{" "}
              {saved.frames.length === 1 ? "board" : "boards"}, {formatClock(saved.elapsed)} of explaining.
            </p>
          </div>
          {last && (
            <div className="rounded-well bg-panel p-4">
              <img
                src={last.imageUrl}
                alt={`Your last board: ${last.said}`}
                className="block aspect-video w-full -rotate-[0.6deg] rounded-[10px] bg-paper object-cover shadow-paper"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pill.dark} onClick={onResume}>
              Pick up where I left off
            </button>
            <button type="button" className={pill.light} onClick={onFresh}>
              Start fresh
            </button>
            <Link href={target.homeHref} className={pill.light}>
              Pick another topic
            </Link>
          </div>
          <p className="m-0 text-[13px] leading-normal text-muted">
            Starting fresh keeps these boards: you will find them in your revision sheets.
          </p>
        </section>
      </main>
    </Page>
  );
}
