"use client";

// Reads the topic and mode from the address, for example /v2/session?topic=ww2&mode=exam.
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
import type { Mode } from "@/lib/v2/contract";
import { clearSession, loadSession, type SavedSession } from "@/lib/v2/storage";
import { getV2Topic } from "@/lib/v2/topics";

import { LiveSessionV2, type VoiceMode } from "./live-session-v2";

export function SessionFromUrl() {
  const params = useSearchParams();
  const topicId = params.get("topic") ?? "cell";
  const mode: Mode = params.get("mode") === "exam" ? "exam" : "coach";
  const voiceParam = params.get("voice");
  const voice: VoiceMode = voiceParam === "off" ? "off" : voiceParam === "text" ? "text" : "on";
  return <SessionGate key={`${topicId}-${mode}-${voice}`} topicId={topicId} mode={mode} voice={voice} />;
}

function SessionGate({ topicId, mode, voice }: { topicId: string; mode: Mode; voice: VoiceMode }) {
  // The saved session lives in this browser's storage, so this only renders in the browser.
  use(browser("The saved session is kept in localStorage."));
  const [saved] = useState(() => loadSession(topicId, mode));
  const [decision, setDecision] = useState<"resume" | "fresh" | null>(
    saved && saved.frames.length > 0 ? null : "fresh",
  );
  // Bumped by "Start again", so the session starts over from nothing.
  const [run, setRun] = useState(0);

  if (decision === null && saved) {
    return (
      <ResumeChoice
        saved={saved}
        onResume={() => setDecision("resume")}
        onFresh={() => {
          clearSession(topicId, mode);
          setDecision("fresh");
        }}
      />
    );
  }
  return (
    <LiveSessionV2
      key={run}
      topicId={topicId}
      mode={mode}
      voice={voice}
      initial={decision === "resume" && run === 0 ? saved : null}
      onRestart={() => {
        setDecision("fresh");
        setRun((value) => value + 1);
      }}
    />
  );
}

function ResumeChoice({
  saved,
  onResume,
  onFresh,
}: {
  saved: SavedSession;
  onResume: () => void;
  onFresh: () => void;
}) {
  const topic = getV2Topic(saved.topicId);
  const last = saved.frames.at(-1);
  const clear = saved.live.ideas?.filter((status) => status === "clear").length ?? 0;
  const total = topic?.keyIdeas.length ?? 0;
  return (
    <Page header={<span className="text-xl font-semibold tracking-[-0.02em]">Milo</span>}>
      <main className="flex flex-1 items-start justify-center rounded-panel bg-panel p-3">
        <section className="flex w-full max-w-[720px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">Pick up where you left off?</h1>
            <p className="m-0 text-base leading-normal text-muted">
              {topic?.title ?? "Your last session"}: {clear} of {total} ideas explained, {saved.frames.length}{" "}
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
            <Link href="/v2" className={pill.light}>
              Pick another topic
            </Link>
          </div>
        </section>
      </main>
    </Page>
  );
}
