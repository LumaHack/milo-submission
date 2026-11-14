"use client";

// The live session (approach A in docs/BACKLOG.md).
// Milo is an ElevenLabs agent in a live, interruptible conversation. The browser reads what the
// student said from the agent's transcript, has Claude score it and fal redraw the board, and
// sends Claude's hint back to the agent so Milo's next question matches the board.

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SessionView } from "@/components/session-view";
import { useDetail } from "@/lib/detail-store";
import { MILO_SHOW_DRAWING, miloAppNote, miloDrewNote } from "@/lib/prompts";
import { DETAILS, getTopic, type Detail } from "@/lib/topics";
import type { MiloStatus } from "@/lib/turn";
import { useMiloSession } from "@/lib/use-milo-session";

const TOPIC_ID = "cell";

export function LiveSession() {
  // Wait for the stored choice before starting, so the session never begins at the wrong level.
  const detail = useDetail();
  if (!detail) return null;
  return (
    <ConversationProvider>
      <Live detail={detail} />
    </ConversationProvider>
  );
}

function Live({ detail }: { detail: Detail }) {
  const topic = getTopic(TOPIC_ID);
  const [spoken, setSpoken] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  // The engine calls this after each scored turn. It is filled in once the conversation exists.
  const sendNote = useRef<(hint: string, nothingLeft: boolean) => boolean>(() => false);
  const showDrawing = useRef<(drew: string) => void>(() => {});
  const session = useMiloSession(TOPIC_ID, detail, {
    onHint: (hint, nothingLeft) => sendNote.current(hint, nothingLeft),
    onDrawn: (drew) => showDrawing.current(drew),
  });
  const { addTurn } = session;

  // When the student was last heard speaking, so Milo does not talk over them to show a drawing.
  const lastSpeech = useRef(0);

  const conversation = useConversation({
    onMessage: (payload) => {
      if (payload.role !== "user") setSpoken(payload.message);
      // Our own stage direction is not something the student said.
      else if (payload.message.trim() !== MILO_SHOW_DRAWING) addTurn(payload.message);
    },
    onVadScore: ({ vadScore }) => {
      if (vadScore > 0.6) lastSpeech.current = Date.now();
    },
    onError: (message) =>
      setVoiceError(
        /permission|notallowed/i.test(message)
          ? "Milo needs your microphone. Allow it in the browser, then tap anywhere."
          : `Milo's voice hit a problem: ${message}`,
      ),
  });
  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting";
  const { sendContextualUpdate, sendUserMessage, endSession, getInputVolume, getOutputVolume, isSpeaking } = conversation;

  useEffect(() => {
    sendNote.current = (hint, nothingLeft) => {
      if (!connected) return false;
      sendContextualUpdate(miloAppNote(hint, nothingLeft));
      return true;
    };
    // A new board is up. Milo gets told what he drew, and if nobody is talking he speaks up about it
    // himself instead of waiting to be asked.
    showDrawing.current = (drew) => {
      if (!connected) return;
      sendContextualUpdate(miloDrewNote(drew));
      const quiet = Date.now() - lastSpeech.current > 1500;
      if (quiet && !isSpeaking) sendUserMessage(MILO_SHOW_DRAWING);
    };
  }, [connected, isSpeaking, sendContextualUpdate, sendUserMessage]);

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

  // The session is live as soon as the page opens. Nobody presses anything to start.
  // Browsers only allow sound after the student has interacted with the page. Arriving from the
  // Start screen counts. After a refresh it does not, so the first tap anywhere starts Milo instead.
  const connectRef = useRef(connect);
  useEffect(() => {
    connectRef.current = connect;
  });
  const idle = conversation.status === "disconnected" || conversation.status === "error";
  const tried = useRef(false);
  useEffect(() => {
    if (!tried.current) {
      tried.current = true;
      void connectRef.current();
    }
  }, []);
  useEffect(() => {
    if (!idle) return;
    const wake = () => void connectRef.current();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
  }, [idle]);

  // The mic button only mutes and unmutes.
  const onMic = () => {
    if (connected) conversation.setMuted(!conversation.isMuted);
  };

  const micOn = connected && !conversation.isMuted;
  let status: MiloStatus = "off";
  if (connecting) status = "connecting";
  else if (connected && isSpeaking) status = "speaking";
  else if (session.busy === "drawing") status = "drawing";
  else if (session.busy === "thinking") status = "thinking";
  else if (micOn) status = "listening";

  const micLabel = !connected
    ? "Milo is not connected yet"
    : conversation.isMuted
      ? "Unmute your microphone"
      : "Mute your microphone";
  const micHint = connected
    ? conversation.isMuted
      ? "You are muted"
      : null
    : connecting
      ? "Waking Milo up…"
      : "Tap anywhere to wake Milo";

  // Milo's own voice while he talks, the student's microphone the rest of the time.
  const getVoiceLevel = useCallback(
    () => (isSpeaking ? getOutputVolume() : getInputVolume()),
    [isSpeaking, getInputVolume, getOutputVolume],
  );

  if (!topic) return null;

  return (
    <SessionView
      topicTitle={topic.title}
      subjectLine={`${topic.subject}, ${topic.title.charAt(0).toLowerCase()}${topic.title.slice(1)}, ${(DETAILS.find((entry) => entry.id === detail)?.label ?? detail).toLowerCase()}`}
      frames={session.frames}
      live={session.live}
      spokenLine={connected ? spoken : null}
      status={status}
      drawing={session.busy === "drawing"}
      error={voiceError ?? session.error}
      seconds={seconds}
      steps={session.steps}
      reaction={session.reaction}
      heard={session.heard}
      micOn={micOn}
      micLabel={micLabel}
      micHint={micHint}
      onMic={onMic}
      getVoiceLevel={connected ? getVoiceLevel : undefined}
      onEnd={() => endSession()}
    />
  );
}
