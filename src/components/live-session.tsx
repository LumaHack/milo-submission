"use client";

// The live session (approach A in docs/BACKLOG.md).
// Milo is an ElevenLabs agent in a live, interruptible conversation. The browser reads what the
// student said from the agent's transcript, has Claude score it and fal redraw the board, and
// sends Claude's hint back to the agent so Milo's next question matches the board.

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SessionView } from "@/components/session-view";
import { miloAppNote } from "@/lib/prompts";
import { getTopic } from "@/lib/topics";
import type { MiloStatus } from "@/lib/turn";
import { useMiloSession } from "@/lib/use-milo-session";

const TOPIC_ID = "cell";

export function LiveSession() {
  return (
    <ConversationProvider>
      <Live />
    </ConversationProvider>
  );
}

function Live() {
  const topic = getTopic(TOPIC_ID);
  const [spoken, setSpoken] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  // The engine calls this after each scored turn. It is filled in once the conversation exists.
  const sendNote = useRef<(hint: string, nothingLeft: boolean) => boolean>(() => false);
  const onHint = useCallback((hint: string, nothingLeft: boolean) => sendNote.current(hint, nothingLeft), []);
  const session = useMiloSession(TOPIC_ID, onHint);
  const { addTurn } = session;

  const conversation = useConversation({
    onMessage: (payload) => {
      if (payload.role === "user") addTurn(payload.message);
      else setSpoken(payload.message);
    },
    onError: (message) =>
      setVoiceError(
        /permission|notallowed/i.test(message)
          ? "Milo needs your microphone. Allow it in the browser, then press the mic button again."
          : `Milo's voice hit a problem: ${message}`,
      ),
  });
  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting";
  const { sendContextualUpdate, endSession, getInputVolume, getOutputVolume, isSpeaking } = conversation;

  useEffect(() => {
    sendNote.current = (hint, nothingLeft) => {
      if (!connected) return false;
      sendContextualUpdate(miloAppNote(hint, nothingLeft));
      return true;
    };
  }, [connected, sendContextualUpdate]);

  // Hang up when the student leaves the page.
  const endRef = useRef(endSession);
  useEffect(() => {
    endRef.current = endSession;
  }, [endSession]);
  useEffect(() => () => endRef.current(), []);

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setSeconds((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const begin = () => {
    session.start();
    setStartedAt((value) => value ?? Date.now());
  };

  // Development only: lets a turn be injected from the browser console, with no microphone.
  //   window.miloSay("The cell takes in things and makes energy.")
  const sayRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    sayRef.current = (text) => {
      begin();
      addTurn(text);
    };
  });
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const target = window as unknown as { miloSay?: (text: string) => void };
    target.miloSay = (text) => sayRef.current(text);
    return () => {
      delete target.miloSay;
    };
  }, []);

  const connect = async () => {
    setVoiceError(null);
    try {
      const response = await fetch("/api/elevenlabs/token", { method: "POST" });
      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !data.token) throw new Error(data.error ?? "Could not get a voice token.");
      begin();
      conversation.startSession({ conversationToken: data.token, connectionType: "webrtc" });
    } catch (caught) {
      setVoiceError(caught instanceof Error ? caught.message : "Could not start Milo's voice.");
    }
  };

  const onMic = () => {
    if (connecting) return;
    if (!connected) void connect();
    else conversation.setMuted(!conversation.isMuted);
  };

  const micOn = connected && !conversation.isMuted;
  let status: MiloStatus = "off";
  if (connected && isSpeaking) status = "speaking";
  else if (session.busy === "drawing") status = "drawing";
  else if (session.busy === "thinking") status = "thinking";
  else if (micOn) status = "listening";

  const micLabel = !connected
    ? connecting
      ? "Connecting to Milo"
      : "Start talking to Milo"
    : conversation.isMuted
      ? "Unmute your microphone"
      : "Mute your microphone";
  const micHint = connected ? null : connecting ? "Connecting to Milo…" : "Press the mic to start";

  // Milo's own voice while he talks, the student's microphone the rest of the time.
  const getVoiceLevel = useCallback(
    () => (isSpeaking ? getOutputVolume() : getInputVolume()),
    [isSpeaking, getInputVolume, getOutputVolume],
  );

  if (!topic) return null;

  return (
    <SessionView
      topicTitle={topic.title}
      subjectLine={`${topic.subject}, ${topic.title.charAt(0).toLowerCase()}${topic.title.slice(1)}`}
      frames={session.frames}
      live={session.live}
      spokenLine={connected ? spoken : null}
      status={status}
      drawing={session.busy === "drawing"}
      error={voiceError ?? session.error}
      seconds={seconds}
      steps={session.steps}
      micOn={micOn}
      micLabel={micLabel}
      micHint={micHint}
      onMic={onMic}
      getVoiceLevel={connected ? getVoiceLevel : undefined}
      onEnd={() => endSession()}
    />
  );
}
