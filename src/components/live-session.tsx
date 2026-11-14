"use client";

// The live session (approach A in docs/BACKLOG.md).
// Milo is an ElevenLabs agent in a live, interruptible conversation. The browser reads what the
// student said from the agent's transcript, has Claude score it and fal redraw the board, and
// sends Claude's hint back to the agent so Milo's next question matches the board.

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SessionView } from "@/components/session-view";
import { useDetail } from "@/lib/detail-store";
import { useChosenTopic } from "@/lib/history";
import {
  MILO_SHOW_DRAWING,
  miloAppNote,
  miloCatchUpNote,
  miloDrewNote,
  miloFirstMessage,
  miloVariables,
} from "@/lib/prompts";
import { DETAILS, type Detail, type Topic } from "@/lib/topics";
import type { MiloStatus } from "@/lib/turn";
import { useMiloSession } from "@/lib/use-milo-session";

export function LiveSession() {
  // Wait for the stored choice before starting, so the session never begins at the wrong level.
  const detail = useDetail();
  const topic = useChosenTopic();
  if (!detail || !topic) return null;
  return (
    <ConversationProvider>
      <Live key={topic.id} topic={topic} detail={detail} />
    </ConversationProvider>
  );
}

function Live({ topic, detail }: { topic: Topic; detail: Detail }) {
  const [spoken, setSpoken] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  // Development only: talk to the real agent in text, with no microphone. Set from the console.
  const textMode = useRef(false);
  const typedByUs = useRef<string | null>(null);
  // True once the student has switched Milo off with the button. He then stays off until they switch him on.
  const [switchedOff, setSwitchedOff] = useState(false);

  // The engine calls this after each scored turn. It is filled in once the conversation exists.
  const sendNote = useRef<(hint: string, nothingLeft: boolean) => boolean>(() => false);
  const showDrawing = useRef<(drew: string) => void>(() => {});
  const session = useMiloSession(topic, detail, {
    onHint: (hint, nothingLeft) => sendNote.current(hint, nothingLeft),
    onDrawn: (drew) => showDrawing.current(drew),
  });
  const { addTurn } = session;

  // When the student was last heard speaking, so Milo does not talk over them to show a drawing.
  const lastSpeech = useRef(0);

  const conversation = useConversation({
    onMessage: (payload) => {
      log.current.push({ who: payload.role, text: payload.message });
      if (payload.role !== "user") setSpoken(payload.message);
      // Our own stage direction is not something the student said.
      else if (payload.message.trim() === MILO_SHOW_DRAWING) return;
      // In text mode we add the turn ourselves, so skip the echo of what we just sent.
      else if (payload.message === typedByUs.current) typedByUs.current = null;
      else addTurn(payload.message);
    },
    // Kept in the developer log, so a dropped connection can be explained afterwards.
    onDisconnect: (details) => {
      log.current.push({ who: "disconnect", text: JSON.stringify(details) });
      // A drop that was not the student's doing gets said out loud on screen, never swallowed.
      const info = details as { reason?: string; message?: string };
      if (info.reason === "error") setVoiceError(`Milo dropped out: ${info.message ?? "the connection closed"}. Tap anywhere to wake him.`);
    },
    onVadScore: ({ vadScore }) => {
      if (vadScore > 0.6) lastSpeech.current = Date.now();
    },
    onError: (message) => {
      log.current.push({ who: "error", text: String(message) });
      setVoiceError(
        /permission|notallowed/i.test(message)
          ? "Milo needs your microphone. Allow it in the browser, then tap anywhere."
          : `Milo's voice hit a problem: ${message}`,
      );
    },
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

  const connect = async () => {
    setVoiceError(null);
    try {
      const text = textMode.current;
      const response = await fetch(`/api/elevenlabs/token${text ? "?text=1" : ""}`, { method: "POST" });
      const data = (await response.json()) as { token?: string; signedUrl?: string; error?: string };
      if (!response.ok || !(data.token || data.signedUrl)) throw new Error(data.error ?? "Could not get a voice token.");
      begin();
      // Fills the topic into Milo's prompt and first line.
      // If the student has already said something, Milo is coming back, not starting.
      const dynamicVariables = miloVariables(topic, session.said().length > 0);
      if (text && data.signedUrl) {
        conversation.startSession({ signedUrl: data.signedUrl, connectionType: "websocket", textOnly: true, dynamicVariables });
      } else if (data.token) {
        conversation.startSession({ conversationToken: data.token, connectionType: "webrtc", dynamicVariables });
      }
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
    if (!idle || switchedOff) return;
    const wake = () => void connectRef.current();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
  }, [idle, switchedOff]);

  // Development only. From the browser console:
  //   window.miloSay("The cell takes in things and makes energy.")   a turn, with no microphone
  //   window.miloText()                                              reconnect to the real agent in text mode
  //   window.miloLog                                                 everything Milo and the student said
  const sayRef = useRef<(text: string) => void>(() => {});
  const textRef = useRef<() => void>(() => {});
  const log = useRef<{ who: string; text: string }[]>([]);
  useEffect(() => {
    sayRef.current = (text) => {
      begin();
      if (connected) {
        typedByUs.current = text;
        sendUserMessage(text);
      }
      addTurn(text);
    };
    textRef.current = () => {
      textMode.current = true;
      setSwitchedOff(false);
      if (connected) endSession();
      setTimeout(() => void connectRef.current(), 400);
    };
  });
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const target = window as unknown as {
      miloSay?: (text: string) => void;
      miloText?: () => void;
      miloLog?: { who: string; text: string }[];
    };
    target.miloSay = (text) => sayRef.current(text);
    target.miloText = () => textRef.current();
    target.miloLog = log.current;
    return () => {
      delete target.miloSay;
      delete target.miloText;
      delete target.miloLog;
    };
  }, []);

  // If Milo comes back on mid-session, tell him what he has already heard so he does not start over.
  const saidRef = useRef(session.said);
  useEffect(() => {
    saidRef.current = session.said;
  });
  useEffect(() => {
    if (!connected) return;
    const earlier = saidRef.current();
    if (earlier.length > 0) sendContextualUpdate(miloCatchUpNote(earlier));
  }, [connected, sendContextualUpdate]);

  // The button switches Milo on and off. It is not a mute button.
  const onMic = () => {
    if (connecting) return;
    if (connected) {
      setSwitchedOff(true);
      endSession();
    } else {
      setSwitchedOff(false);
      void connect();
    }
  };

  const micOn = connected;
  let status: MiloStatus = "off";
  if (connecting) status = "connecting";
  else if (connected && isSpeaking) status = "speaking";
  else if (session.busy === "drawing") status = "drawing";
  else if (session.busy === "thinking") status = "thinking";
  else if (micOn) status = "listening";

  const micLabel = connected ? "Switch Milo off" : connecting ? "Milo is waking up" : "Switch Milo on";
  const micHint = connected
    ? null
    : connecting
      ? "Waking Milo up…"
      : switchedOff
        ? "Milo is off. Press to switch him on"
        : "Tap anywhere to wake Milo";

  // Milo's own voice while he talks, the student's microphone the rest of the time.
  const getVoiceLevel = useCallback(
    () => (isSpeaking ? getOutputVolume() : getInputVolume()),
    [isSpeaking, getInputVolume, getOutputVolume],
  );

  return (
    <SessionView
      topicTitle={topic.title}
      openingLine={miloFirstMessage(topic)}
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
