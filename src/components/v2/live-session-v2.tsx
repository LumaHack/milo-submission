"use client";

// The v2 live session (approach B, docs/V2.md).
// Milo is an ElevenLabs agent. When the student finishes a point he calls the update_board tool,
// which runs in this page: Claude scores the turn, the line comes straight back for Milo to say,
// and the board redraws in the background.
// Safety net: if Milo has not called update_board a few seconds after the student stopped, the page
// scores the turn itself, so the board always redraws, and passes Milo his line as a note.
// Pause hangs up the voice and keeps everything else. The session is saved after every turn.
// Two looks run on the same engine: the new screen, and Ali's classic one.

import { ConversationProvider, useConversation, useConversationClientTool } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SessionView } from "@/components/session-view";
import { pill } from "@/components/ui";
import type { MiloStatus } from "@/lib/turn";
import { UPDATE_BOARD, type AgentVariant } from "@/lib/v2/agent";
import { cleanMiloLine } from "@/lib/v2/prompts";
import { clearSession, loadLook, saveLook, type Look, type SavedSession } from "@/lib/v2/storage";
import type { Target } from "@/lib/v2/target";
import { useMiloV2 } from "@/lib/v2/use-milo-v2";

import { SessionViewV2, type ViewStatus } from "./session-view-v2";

/** How long after the student stops the page waits for Milo to call update_board before drawing itself. */
const SAFETY_NET_MS = 6000;

/** "on" is the real thing. "text" is a typed chat with Milo, "off" has no Milo at all: both are for testing. */
export type VoiceMode = "on" | "text" | "off";

type Props = {
  /** The topic and mode, from the address: a built-in topic or a part of the student's own course. */
  target: Target;
  /** Where "End session" and "See your sheet" go. */
  endHref: string;
  voice?: VoiceMode;
  /** "words" talks to the second agent, which is given this topic's hard words to listen for (&agent=words). */
  agent?: AgentVariant | null;
  /** A saved session to pick up from. */
  initial?: SavedSession | null;
  onRestart?: () => void;
};

export function LiveSessionV2({ target, endHref, voice = "on", agent = null, initial = null, onRestart = () => {} }: Props) {
  return (
    <ConversationProvider>
      <Live target={target} endHref={endHref} voice={voice} agent={agent} initial={initial} onRestart={onRestart} />
    </ConversationProvider>
  );
}

function Live({
  target,
  endHref,
  voice,
  agent,
  initial,
  onRestart,
}: {
  target: Target;
  endHref: string;
  voice: VoiceMode;
  agent: AgentVariant | null;
  initial: SavedSession | null;
  onRestart: () => void;
}) {
  const { topic, mode } = target;
  const session = useMiloV2(topic, mode, initial);
  const { addTranscript, scoreNow, hasUnscored, takeLine, peekLine } = session;
  const [spoken, setSpoken] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(initial?.elapsed ?? 0);
  const [paused, setPaused] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [look, setLook] = useState<Look>(() => loadLook());

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

  // Save and hang up when the student leaves the page.
  const leaveRef = useRef(() => {});
  useEffect(() => {
    leaveRef.current = () => {
      session.persist();
      endSession();
    };
  });
  useEffect(
    () => () => {
      if (safetyNet.current) clearTimeout(safetyNet.current);
      leaveRef.current();
    },
    [],
  );

  // The clock counts session time only, so it stops during a pause.
  const elapsedRef = useRef(session.elapsed);
  useEffect(() => {
    elapsedRef.current = session.elapsed;
  });
  useEffect(() => {
    const timer = setInterval(() => setSeconds(elapsedRef.current()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        session.start();
        if (connected) {
          sendUserMessage(text);
          return;
        }
        if (!addTranscript(text)) return;
        void scoreNow().then(() => setSpoken(takeLine()));
      },
      hear: (text) => {
        session.start();
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

  /** Milo's first line: a fresh start, or welcome back with the last thing the student said. */
  const openingLine = () => {
    const last = session.frames.at(-1)?.said;
    if (last) return `Welcome back! Last time you told me: ${last} What comes next?`;
    if (session.lastHeard) return "Welcome back! Keep going, I'm listening.";
    return topic.firstMessage;
  };

  const connect = async () => {
    setVoiceError(null);
    try {
      // The typed chat test only runs over a websocket, which needs a signed URL instead of a token.
      const typed = voice === "text";
      const response = await fetch("/api/v2/elevenlabs/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(typed ? { transport: "websocket" } : {}), ...(agent ? { variant: agent } : {}) }),
      });
      const data = (await response.json()) as { token?: string; signedUrl?: string; error?: string };
      if (!response.ok || !(typed ? data.signedUrl : data.token)) {
        throw new Error(data.error ?? "Could not get a voice token.");
      }
      session.start();
      // Only the "words" agent accepts keywords from the conversation. Sent to the tested agent they would be refused.
      const keywords = agent === "words" ? topic.keywords.slice(0, 24) : [];
      const shared = {
        dynamicVariables: { opening_line: openingLine(), topic_about: topic.about },
        ...(keywords.length > 0 ? { overrides: { asr: { keywords } } } : {}),
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
    if (voice === "off" || !idle || paused) return;
    const wake = () => void connectRef.current();
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
  }, [voice, idle, paused]);

  const pause = () => {
    clearSafetyNet();
    setPaused(true);
    session.pauseClock();
    session.persist();
    endSession();
  };
  const resume = () => {
    setPaused(false);
    setElsewhere(false);
    setVoiceError(null);
    // If the session is still open in another tab, that tab now pauses in turn.
    channel.current?.postMessage("opened");
    if (voice === "off") session.start();
    else void connectRef.current();
  };

  // The same session open in two tabs would have both saving over each other. So a tab that opens
  // a session says so on a channel named after it, and any older tab on that session pauses and
  // saves. The newest tab always wins.
  const [elsewhere, setElsewhere] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const pauseRef = useRef(pause);
  useEffect(() => {
    pauseRef.current = pause;
  });
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const opened = new BroadcastChannel(`milo.v2.session.${topic.id}.${mode}`);
    channel.current = opened;
    opened.onmessage = (event) => {
      if (event.data !== "opened") return;
      pauseRef.current();
      setElsewhere(true);
    };
    opened.postMessage("opened");
    return () => {
      opened.close();
      channel.current = null;
    };
  }, [topic.id, mode]);
  const restart = () => {
    clearSafetyNet();
    session.discard();
    endSession();
    clearSession(topic.id, mode);
    onRestart();
  };
  const switchLook = (next: Look) => {
    setLook(next);
    saveLook(next);
  };

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
  const viewStatus: ViewStatus = paused ? "paused" : status;

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
  const voiceLevel = connected && voice === "on" ? getVoiceLevel : undefined;
  const error = voiceError ?? session.error;
  const onEnd = () => {
    session.persist();
    endSession();
  };
  // "End session" and "See your sheet". The last drawing may still be on its way from fal, and the
  // end page shows what is saved, so wait for it to land before leaving.
  // It leaves with a full page load on purpose. Next keeps a page it navigates away from alive in
  // the background and brings it back for the same address, so "Explain it again" would reopen this
  // finished session instead of starting a new one.
  const finish = () => {
    if (finishing) return;
    setFinishing(true);
    clearSafetyNet();
    session.pauseClock();
    endSession();
    // With nothing said there is no end page to show: go back to where the topic was picked.
    const nothingSaid = session.frames.length === 0 && !session.lastHeard;
    void session.whenIdle().then(() => {
      session.persist();
      window.location.assign(nothingSaid ? target.homeHref : endHref);
    });
  };
  // If the browser brings this page back from its own back-forward cache, the button works again.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setFinishing(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  if (look === "classic") {
    return (
      <>
        <SessionView
          topicTitle={topic.title}
          subjectLine={target.subjectLine}
          frames={session.frames}
          live={{ level: session.live.level, hint: session.live.miloLine, gaps: session.gaps, ideas: session.live.ideas }}
          spokenLine={spoken ?? session.live.miloLine}
          status={status}
          drawing={session.drawing}
          error={error}
          seconds={seconds}
          steps={session.steps}
          micOn={micOn}
          micLabel={micLabel}
          micHint={paused ? (elsewhere ? "Paused: open in another tab" : "Paused") : micHint}
          onMic={onMic}
          getVoiceLevel={voiceLevel}
          onEnd={onEnd}
        />
        <button type="button" className={`${pill.dark} fixed right-6 bottom-6 z-50`} onClick={() => switchLook("new")}>
          New look
        </button>
      </>
    );
  }

  return (
    <SessionViewV2
      topic={topic}
      mode={mode}
      subjectLine={target.subjectLine}
      frames={session.frames}
      live={session.live}
      spokenLine={spoken}
      lastHeard={session.lastHeard}
      status={viewStatus}
      drawing={session.drawing}
      error={error}
      seconds={seconds}
      steps={session.steps}
      hintsUsed={session.hintsUsed}
      micOn={micOn}
      micLabel={micLabel}
      micHint={micHint}
      paused={paused}
      pausedNote={elsewhere ? "Paused: this session is open in another tab." : null}
      onMic={onMic}
      onPause={pause}
      onResume={resume}
      onRestart={restart}
      onClassic={() => switchLook("classic")}
      onEnd={onEnd}
      onFinish={finish}
      finishing={finishing}
      getVoiceLevel={voiceLevel}
    />
  );
}
