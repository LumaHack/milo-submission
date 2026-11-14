"use client";

// Reads the topic and mode from the address, for example /v2/session?topic=ww2&mode=exam.
// Adding &voice=off opens the session without connecting Milo's voice, to test with typed turns.

import { useSearchParams } from "next/navigation";

import type { Mode } from "@/lib/v2/contract";

import { LiveSessionV2 } from "./live-session-v2";

export function SessionFromUrl() {
  const params = useSearchParams();
  const topicId = params.get("topic") ?? "cell";
  const mode: Mode = params.get("mode") === "exam" ? "exam" : "coach";
  const voice = params.get("voice") !== "off";
  return <LiveSessionV2 key={`${topicId}-${mode}`} topicId={topicId} mode={mode} voice={voice} />;
}
