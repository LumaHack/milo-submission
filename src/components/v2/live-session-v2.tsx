"use client";

// The v2 live session (approach B, docs/V2.md).
// Milo is an ElevenLabs agent. When the student finishes a point he calls the update_board tool,
// which runs in this page: Claude scores the turn, the line comes straight back for Milo to say,
// and the board redraws in the background.
// Safety net: if Milo has not called update_board a few seconds after the student stopped, the page
// scores the turn itself, so the board always redraws, and passes Milo his line as a note.
// For now it reuses Ali's session screen unchanged. Phase 3 gives v2 its own screen.

import { ConversationProvider, useConversation, useConversationClientTool } from "@elevenlabs/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { SessionView } from "@/components/session-view";
import { Page, pill } from "@/components/ui";
import type { MiloStatus } from "@/lib/turn";
import { UPDATE_BOARD } from "@/lib/v2/agent";
import type { Mode } from "@/lib/v2/contract";
import { cleanMiloLine } from "@/lib/v2/prompts";
import { getV2Topic, type V2Topic } from "@/lib/v2/topics";
import { useMiloV2 } from "@/lib/v2/use-milo-v2";

/** How long after the student stops the page waits for Milo to call update_board before drawing itself. */
const SAFETY_NET_MS = 6000;

/** "on" is the real thing. "text" is a typed chat with Milo, "off" has no Milo at all: both are for testing. */
export type VoiceMode = "on" | "text" | "off";

export function LiveSessionV2({ topicId, mode, voice = "on" }: { topicId: string; mode: Mode; voice?: VoiceMode }) {
  const topic = getV2Topic(topicId);
  if (!topic || !topic.ready) {
    return (
      <Page header={<span className="text-xl font-semibold tracking-[-0.02em]">Milo</span>}>
        <main className="flex flex-1 flex-col items-start gap-4 pt-7">
          <p className="m-0 text-[18px]">This topic is not ready yet.</p>
          <Link href="/v2" className={pill.dark}>
            Pick another topic
          </Link>
        </main>
      </Page>
    );
  }
  return (
    <ConversationProvider>
      <Live topic={topic} mode={mode} voice={voice} />
    </ConversationProvider>
  );
}

function Live({ topic, mode, voice }: { topic: V2Topic; mode: Mode; voice: VoiceMode }) {
  const session = useMiloV2(topic, mode);
  const { addTranscript, scoreNow, hasUnscored, takeLine, peekLine } = session;
  const [spoken, setSpoken] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Whether Milo has called update_board since the student's last turn.
  const toolCalled = useRef(true);
  const safetyNet = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendNote = useRef<(line: string) => void>(() => {});

  const clearSafetyNet = () => {
    if (safetyNet.current) clearTimeout(safetyNet.current);
    safetyNet.current = null;
  };
  const armSafetyNet = () => {
    clearSafetyNet();
    safetyNet.current = setTimeout(() => {
      safetyNet.current = null;
      if (toolCalled.current || !hasUnscored()) return;
      toolCalled.current = true;
      void scoreNow().then(() => {
        // If Milo asked for the line in the meantime, he already has it.
        const line = peekLine();
        if (line) sendNote.current(line);
      });
    }, SAFETY_NET_MS);
  };

  /** What the student said, as the voice agent heard it. */
  const heard = (text: string) => {
    if (!addTranscript(text)) return;
    toolCalled.current = false;
    armSafetyNet();
  };

  const conversation = useConversation({
    onMessage: (payload) => {
      if (payload.role === "user") heard(payload.message);
      else setSpoken(cleanMiloLine(payload.message));
    },
    onError: (message) =>
      setVoiceError(
        /permission|notallowed/i.test(message)
          ? "Milo needs your microphone. Allow it in the browser, then tap anywhere."
          : `Milo's voice hit a problem: ${message}`,
      ),
    // Say so when the line drops, instead of leaving the student waiting for an answer.
    onDisconnect: (details) => {
      if (details.reason !== "user") setVoiceError("Milo's voice dropped. Tap anywhere to wake him up again.");
    },
  });
  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting";
  const { sendContextualUpdate, sendUserMessage, endSession, getInputVolume, getOutputVolume, isSpeaking } =
    conversation;

  useConversationClientTool(UPDATE_BOARD, async (params: { point?: string }) => {
    toolCalled.current = true;
    clearSafetyNet();
    await scoreNow(params?.point);
    // The newest line, from this call or from the safety net if it already scored this turn.
    const line = takeLine();
    return line
      ? `Say exactly this, word for word: "${line}"`
      : "Nothing new to draw. Say one short, kind sentence inviting them to keep going.";
  });

  useEffect(() => {
    sendNote.current = (line) => {
      if (connected) sendContextualUpdate(`APP NOTE: The next time you speak, say exactly: "${line}"`);
    };
  }, [connected, sendContextualUpdate]);

  // Hang up when the student leaves the page.
  const endRef = useRef(endSession);
  useEffect(() => {
    endRef.current = endSession;
  }, [endSession]);
  useEffect(
    () => () => {
      if (safetyNet.current) clearTimeout(safetyNet.current);
      endRef.current();
    },
    [],
  );

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setSeconds((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const begin = () => {
    session.start();
    setStartedAt((value) => value ?? Date.now());
  };

  // Development only, from the browser console:
  //   window.miloSay("...")   says something to Milo. In a typed chat (?voice=text) it goes to the agent;
  //                           with no Milo (?voice=off) the page scores it directly.
  //   window.miloHear("...")  acts as if the voice agent heard it and Milo then said nothing,
  //                           to test the safety net.
  const devRef = useRef<{ say: (text: string) => void; hear: (text: string) => void }>({
    say: () => {},
    hear: () => {},
  });
  useEffect(() => {
    devRef.current = {
      say: (text) => {
        begin();
        if (connected) {
          sendUserMessage(text);
          return;
        }
        if (!addTranscript(text)) return;
        void scoreNow().then(() => setSpoken(takeLine()));
      },
      hear: (text) => {
        begin();
        heard(text);
      },
    };
  });
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const target = window as unknown as { miloSay?: (text: string) => void; miloHear?: (text: string) => void };
    target.miloSay = (text) => devRef.current.say(text);
    target.miloHear = (text) => devRef.current.hear(text);
    return () => {
      delete target.miloSay;
      delete target.miloHear;
    };
  }, []);

  const connect = async () => {
    setVoiceError(null);
    try {
      // The typed chat test only runs over a websocket, which needs a signed URL instead of a token.
      const typed = voice === "text";
      const response = await fetch("/api/v2/elevenlabs/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typed ? { transport: "websocket" } : {}),
      });
      const data = (await response.json()) as { token?: string; signedUrl?: string; error?: string };
      if (!response.ok || !(typed ? data.signedUrl : data.token)) {
        throw new Error(data.error ?? "Could not get a voice token.");
      }
      begin();
      const shared = {
        dynamicVariables: { opening_line: topic.firstMessage, topic_about: topic.about },
        // Expressive tags such as "[curious]" never reach the screen.
        stripAudioTags: true,
      };
      if (typed && data.signedUrl) {
        conversation.startSession({ ...shared, signedUrl: data.signedUrl, connectionType: "websocket", textOnly: true });
      } else if (data.token) {
        conversation.startSession({ ...shared, conversationToken: data.token, connectionType: "webrtc" });
      }
    } catch (caught) {
      setVoiceError(caught instanceof Error ? caught.message : "Could not start Milo's voice.");
    }
  };

  // The session goes live as soon as the page opens. After a refresh the browser blocks sound
  // until the student interacts, so the first tap anywhere starts Milo instead.
  const connectRef = useRef(connect);
  useEffect(() => {
    connectRef.current = connect;
  });
  const idle = conversation.status === "disconnected" || conversation.status === "error";
  const tried = useRef(false);
  useEffect(() => {
    if (voice !== "off" && !tried.current) {
      tried.current = true;
      void connectRef.current();
    }
  }, [voice]);
  useEffect(() => {
    if (voice === "off" || !idle) return;
    const wake = () => void connectRef.current();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
  }, [voice, idle]);

  const onMic = () => {
    if (connected) conversation.setMuted(!conversation.isMuted);
  };

  const micOn = connected && !conversation.isMuted;
  let status: MiloStatus = "off";
  if (connecting) status = "connecting";
  else if (connected && isSpeaking) status = "speaking";
  else if (session.drawing) status = "drawing";
  else if (session.thinking) status = "thinking";
  else if (micOn) status = "listening";

  const micLabel = !connected
    ? "Milo is not connected yet"
    : conversation.isMuted
      ? "Unmute your microphone"
      : "Mute your microphone";
  const micHint =
    voice === "off"
      ? "Voice is off for this test"
      : voice === "text" && connected
        ? "Typed chat test"
        : connected
          ? conversation.isMuted
            ? "You are muted"
            : null
          : connecting
            ? "Waking Milo up…"
            : "Tap anywhere to wake Milo";

  const getVoiceLevel = useCallback(
    () => (isSpeaking ? getOutputVolume() : getInputVolume()),
    [isSpeaking, getInputVolume, getOutputVolume],
  );

  const about = `${topic.title.charAt(0).toLowerCase()}${topic.title.slice(1)}`;
  return (
    <SessionView
      topicTitle={topic.title}
      subjectLine={`${topic.subject}, ${about}, ${mode === "exam" ? "exam mode" : "coach mode"}`}
      frames={session.frames}
      live={{ level: session.live.level, hint: session.live.miloLine, gaps: session.gaps, ideas: session.live.ideas }}
      spokenLine={spoken ?? session.live.miloLine}
      status={status}
      drawing={session.drawing}
      error={voiceError ?? session.error}
      seconds={seconds}
      steps={session.steps}
      micOn={micOn}
      micLabel={micLabel}
      micHint={micHint}
      onMic={onMic}
      getVoiceLevel={connected && voice === "on" ? getVoiceLevel : undefined}
      onEnd={() => endSession()}
    />
  );
}
