"use client";

// Reads the topic and mode from the address, for example /v2/session?topic=ww2&mode=exam.
// For testing without a microphone: &voice=text runs a typed chat with Milo's agent,
// &voice=off runs with no Milo at all. See window.miloSay in live-session-v2.tsx.

import { useSearchParams } from "next/navigation";

import type { Mode } from "@/lib/v2/contract";

import { LiveSessionV2, type VoiceMode } from "./live-session-v2";

export function SessionFromUrl() {
  const params = useSearchParams();
  const topicId = params.get("topic") ?? "cell";
  const mode: Mode = params.get("mode") === "exam" ? "exam" : "coach";
  const voiceParam = params.get("voice");
  const voice: VoiceMode = voiceParam === "off" ? "off" : voiceParam === "text" ? "text" : "on";
  return <LiveSessionV2 key={`${topicId}-${mode}-${voice}`} topicId={topicId} mode={mode} voice={voice} />;
}
