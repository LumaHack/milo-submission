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
// Shows a text box so a turn can be typed instead of spoken. For testing without a microphone.
const TYPING = process.env.NEXT_PUBLIC_MILO_TYPING === "1";

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
  const [typed, setTyped] = useState("");

  // The engine calls this after each scored turn. It is filled in once the conversation exists.
  const sendNote = useRef<(hint: string, nothingLeft: boolean) => void>(() => {});
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
  const { sendContextualUpdate, endSession, getInputVolume } = conversation;

  useEffect(() => {
    sendNote.current = (hint, nothingLeft) => {
      if (connected) sendContextualUpdate(miloAppNote(hint, nothingLeft));
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
    if (conversation.status === "connecting") return;
    if (!connected) void connect();
    else conversation.setMuted(!conversation.isMuted);
  };

  const micOn = connected && !conversation.isMuted;
  let status: MiloStatus = "off";
  if (connected && conversation.isSpeaking) status = "speaking";
  else if (session.busy === "drawing") status = "drawing";
  else if (session.busy === "thinking") status = "thinking";
  else if (micOn) status = "listening";

  const micLabel = !connected
    ? conversation.status === "connecting"
      ? "Connecting to Milo"
      : "Start talking to Milo"
    : conversation.isMuted
      ? "Unmute your microphone"
      : "Mute your microphone";

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
      micOn={micOn}
      micLabel={micLabel}
      onMic={onMic}
      getMicLevel={connected ? getInputVolume : undefined}
      onEnd={() => endSession()}
      extra={
        TYPING ? (
          <form
            className="flex gap-2 rounded-card bg-card p-3"
            onSubmit={(event) => {
              event.preventDefault();
              begin();
              addTurn(typed);
              setTyped("");
            }}
          >
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              aria-label="Type what you would say"
              placeholder="Type a turn (testing only)"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-[15px] text-ink placeholder:text-faint"
            />
            <button type="submit" className="press min-h-11 rounded-full border border-ink bg-ink px-5 text-[15px] font-medium text-white">
              Send
            </button>
          </form>
        ) : null
      }
    />
  );
}
