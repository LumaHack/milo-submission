"use client";

// The interview: the only screen a witness sees. From design/Main.dc.html.
// Nolan is an ElevenLabs agent in a live conversation. The browser reads what the witness said from
// the agent's transcript and has Claude keep the written notes. No picture is ever shown here.

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Dots, Empty, Page } from "@/components/ui";
import { formatClock, witnessLabel, type CaseFile, type Fact, type Turn, type Witness } from "@/lib/nolan";
import { NOLAN_COVERED_NOTE, nolanCatchUpNote, nolanFirstMessage, nolanVariables } from "@/lib/prompts";
import { updateCase, updateWitness, useOpenCase } from "@/lib/store";

const BAR_HEIGHTS = [10, 18, 28, 38, 22, 12, 30, 40, 24, 14, 32, 20, 10, 26, 36, 16, 28, 12, 22, 34];

export function InterviewScreen() {
  const file = useOpenCase();
  if (file === undefined) return null;
  const witness = file?.witnesses.find((entry) => entry.id === file.interviewingId);
  if (!file || !witness) {
    return <Empty title="No interview is open" text="Start an interview from the case file." />;
  }
  return (
    <ConversationProvider>
      <Interview key={witness.id} file={file} witness={witness} />
    </ConversationProvider>
  );
}

type Phase = "consent" | "live" | "break";

function Interview({ file, witness }: { file: CaseFile; witness: Witness }) {
  const router = useRouter();
  // A witness who has already said something is coming back, so they are not asked for consent twice.
  const [phase, setPhase] = useState<Phase>(witness.turns.length > 0 ? "break" : "consent");
  const [facts, setFacts] = useState<Fact[]>(witness.facts);
  const [spoken, setSpoken] = useState<string | null>(
    () => [...witness.turns].reverse().find((turn) => turn.who === "nolan")?.text ?? null,
  );
  const [noting, setNoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(witness.seconds);

  const turns = useRef<Turn[]>(witness.turns);
  const secondsRef = useRef(witness.seconds);
  const coveredSent = useRef(false);
  // Development only: talk to the real agent in text, with no microphone. Set from the console.
  const textMode = useRef(false);
  const typedByUs = useRef<string | null>(null);

  const persist = useCallback(
    (next: Partial<Witness>) => {
      updateWitness(file.id, witness.id, (current) => ({
        ...current,
        turns: turns.current,
        seconds: secondsRef.current,
        status: current.status === "done" ? "done" : turns.current.some((turn) => turn.who === "witness") ? "underway" : current.status,
        ...next,
      }));
    },
    [file.id, witness.id],
  );

  // The notes: one extraction in flight. If the witness says more meanwhile, run once more with everything.
  const extracting = useRef(false);
  const extractAgain = useRef(false);
  const sendNote = useRef<(text: string) => void>(() => {});
  const extract = useCallback(async () => {
    if (extracting.current) {
      extractAgain.current = true;
      return;
    }
    extracting.current = true;
    setNoting(true);
    try {
      do {
        extractAgain.current = false;
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: file.title, details: file.details, turns: turns.current }),
        });
        const data = (await response.json().catch(() => null)) as { facts?: Fact[]; error?: string } | null;
        if (!response.ok || !data?.facts) {
          console.error("Nolan's notes:", data?.error);
          setError("Nolan could not write that down. Keep talking, he will catch up on your next answer.");
          continue;
        }
        setError(null);
        setFacts(data.facts);
        persist({ facts: data.facts });
        if (!coveredSent.current && file.details.every((detail) => data.facts?.some((fact) => fact.detailId === detail.id))) {
          coveredSent.current = true;
          sendNote.current(NOLAN_COVERED_NOTE);
        }
      } while (extractAgain.current);
    } catch (caught) {
      console.error("Nolan's notes:", caught);
      setError("Nolan could not write that down. Keep talking, he will catch up on your next answer.");
    } finally {
      extracting.current = false;
      setNoting(false);
    }
  }, [file.title, file.details, persist]);

  const addTurn = useCallback(
    (who: Turn["who"], text: string) => {
      turns.current = [...turns.current, { who, text }];
      persist({});
      if (who === "witness") void extract();
    },
    [extract, persist],
  );

  const conversation = useConversation({
    onMessage: (payload) => {
      // When the witness stays quiet, ElevenLabs reports a turn of "...". That is not something they said.
      if (payload.role === "user" && !/[\p{L}\p{N}]/u.test(payload.message)) return;
      if (payload.role !== "user") {
        // Nolan's lines can carry delivery tags for his voice, such as [calm]. They are not for the screen.
        const line = payload.message.replace(/\[[^\]]{1,24}\]\s*/g, "").trim();
        if (!line) return;
        setSpoken(line);
        addTurn("nolan", line);
      } else if (payload.message === typedByUs.current) {
        // In text mode we add the turn ourselves, so skip the echo of what we just sent.
        typedByUs.current = null;
      } else {
        addTurn("witness", payload.message);
      }
    },
    onConnect: () => setError(null),
    onDisconnect: (details) => {
      const info = details as { reason?: string; message?: string };
      if (info.reason === "error") {
        console.error("Nolan dropped out:", info.message);
        setError("Nolan dropped out. Press Carry on to bring him back. Your notes are safe.");
        setPhase("break");
      }
    },
    onError: (message) => {
      console.error("Nolan's voice:", message);
      setError(
        /permission|notallowed/i.test(String(message))
          ? "Nolan needs the microphone. Allow it in the browser, then press Carry on."
          : "Nolan's voice hit a problem. Press Carry on to try again.",
      );
      setPhase("break");
    },
  });
  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting";
  const { sendContextualUpdate, sendUserMessage, endSession, getInputVolume, getOutputVolume, isSpeaking } = conversation;

  useEffect(() => {
    sendNote.current = (text) => {
      if (connected) sendContextualUpdate(text);
    };
  }, [connected, sendContextualUpdate]);

  // Hang up when the witness leaves the page.
  const endRef = useRef(endSession);
  useEffect(() => {
    endRef.current = endSession;
  }, [endSession]);
  useEffect(() => () => endRef.current(), []);

  // The clock only runs while Nolan is on the line.
  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [connected]);

  const alive = useRef(false);
  const connectingNow = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const connect = async () => {
    // One attempt at a time, and never after the witness has left the page.
    if (connectingNow.current || !alive.current) return;
    connectingNow.current = true;
    setError(null);
    setPhase("live");
    try {
      const text = textMode.current;
      const response = await fetch(`/api/token${text ? "?text=1" : ""}`, { method: "POST" });
      const data = (await response.json()) as { token?: string; signedUrl?: string; error?: string };
      if (!response.ok || !(data.token || data.signedUrl)) throw new Error(data.error ?? "Could not reach Nolan.");
      if (!alive.current) return;
      const resuming = turns.current.length > 0;
      const dynamicVariables = nolanVariables(file.title, witness.where, file.opener, file.details, resuming);
      if (text && data.signedUrl) {
        conversation.startSession({ signedUrl: data.signedUrl, connectionType: "websocket", textOnly: true, dynamicVariables });
      } else if (data.token) {
        conversation.startSession({ conversationToken: data.token, connectionType: "webrtc", dynamicVariables });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reach Nolan.");
      setPhase(turns.current.length > 0 ? "break" : "consent");
    } finally {
      connectingNow.current = false;
    }
  };

  // When the witness comes back from a break, tell Nolan where they were, so he does not start over.
  const factsRef = useRef(facts);
  useEffect(() => {
    factsRef.current = facts;
  }, [facts]);
  useEffect(() => {
    if (!connected || !turns.current.some((turn) => turn.who === "witness")) return;
    const covered = file.details.filter((detail) => factsRef.current.some((fact) => fact.detailId === detail.id));
    const open = file.details.filter((detail) => !covered.includes(detail));
    sendContextualUpdate(
      nolanCatchUpNote(
        covered.map((detail) => detail.label),
        open.map((detail) => detail.label),
      ),
    );
  }, [connected, sendContextualUpdate, file.details]);

  const takeBreak = () => {
    endSession();
    persist({});
    setPhase("break");
  };

  const end = () => {
    endSession();
    const said = turns.current.some((turn) => turn.who === "witness");
    persist({ status: said ? "done" : "waiting" });
    updateCase(file.id, (current) => ({ ...current, interviewingId: null }));
    router.push("/");
  };

  // Development only. From the browser console:
  //   window.nolanText()                        connect to the real agent in text mode, with no microphone
  //   window.nolanSay("I saw one man, alone.")  a witness turn
  const sayRef = useRef<(text: string) => void>(() => {});
  const textRef = useRef<() => void>(() => {});
  const connectRef = useRef(connect);
  useEffect(() => {
    connectRef.current = connect;
    sayRef.current = (text) => {
      if (connected) {
        typedByUs.current = text;
        sendUserMessage(text);
      }
      addTurn("witness", text);
    };
    textRef.current = () => {
      textMode.current = true;
      if (connected) endSession();
      setTimeout(() => void connectRef.current(), 400);
    };
  });
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const target = window as unknown as { nolanSay?: (text: string) => void; nolanText?: () => void };
    target.nolanSay = (text) => sayRef.current(text);
    target.nolanText = () => textRef.current();
    return () => {
      delete target.nolanSay;
      delete target.nolanText;
    };
  }, []);

  // Feed the voice level to CSS as --vol: the microphone while Nolan listens, his own voice while he talks.
  const cardRef = useRef<HTMLElement>(null);
  const voiceActive = connected;
  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!voiceActive || calm) {
      node.style.setProperty("--vol", "0");
      return;
    }
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      const level = Math.min(1, Math.max(0, (isSpeaking ? getOutputVolume() : getInputVolume()) * 2.2));
      // Rise fast, fall slowly, like a level meter.
      smooth = level > smooth ? level : smooth * 0.88 + level * 0.12;
      node.style.setProperty("--vol", smooth.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [voiceActive, isSpeaking, getInputVolume, getOutputVolume]);

  let status: { text: string; dot: string; busy: boolean; ring: string } = { text: "Ready", dot: "", busy: false, ring: "" };
  if (phase === "break") status = { text: "On a break", dot: "miss", busy: false, ring: "" };
  if (phase === "live") {
    if (connecting || !connected) status = { text: "Connecting", dot: "", busy: true, ring: "" };
    else if (isSpeaking) status = { text: "Nolan is talking", dot: "ink", busy: false, ring: "var(--ink)" };
    else if (noting) status = { text: "Writing it down", dot: "", busy: true, ring: "" };
    else status = { text: "Listening", dot: "ok pulse", busy: false, ring: "var(--ok)" };
  }

  const position = file.witnesses.findIndex((entry) => entry.id === witness.id) + 1;
  const question = phase === "consent" ? "Before we start" : (spoken ?? nolanFirstMessage(file.opener));

  return (
    <Page
      sub={`Case ${file.number}, witness ${position} of ${file.witnesses.length}`}
      footer="Voice by ElevenLabs. Notes by Claude."
      actions={
        <>
          {phase !== "consent" && (
            <span className="status" style={{ minHeight: 44, padding: "0 16px", color: "var(--muted)" }}>
              <span aria-hidden="true" className="dot miss" />
              Transcribed with your consent
            </span>
          )}
          {phase === "live" && (
            <button type="button" className="pill" onClick={takeBreak}>
              Take a break
            </button>
          )}
          {phase === "break" && (
            <button type="button" className="pill" onClick={() => void connect()}>
              Carry on
            </button>
          )}
          <button type="button" className="pill dark" onClick={end}>
            {phase === "consent" ? "Back to the case file" : "End interview"}
          </button>
        </>
      }
    >
      <main className="panel">
        <section ref={cardRef} aria-label="Nolan" className="card nolan-card">
          <div className={`orb ${connected && isSpeaking ? "speaking" : ""}`}>
            <div aria-hidden="true" className="orb-swirl" />
            <div aria-hidden="true" className="orb-figure">
              <div className="orb-head" />
              <div className="orb-body" />
            </div>
            {status.ring && (
              <span
                aria-hidden="true"
                className="orb-ring"
                style={{ boxShadow: `inset 0 0 0 calc(2px + var(--vol, 0) * 9px) ${status.ring}` }}
              />
            )}
            <span key={status.text} aria-live="polite" className="badge top">
              <span aria-hidden="true" className={`dot ${status.dot}`} />
              {status.text}
              {status.busy && <Dots />}
            </span>
            <span className="badge bottom">Nolan</span>
          </div>

          <h1 className="question">
            <Words key={question} text={question} />
          </h1>

          {phase === "consent" ? (
            <>
              <ul className="list muted" style={{ textAlign: "left", maxWidth: 520 }}>
                <li>Nolan will ask you to say what you saw, in your own words and your own order.</li>
                <li>What you say is written down as text for the investigator. Your voice is not stored.</li>
                <li>You can take a break or stop at any time.</li>
              </ul>
              <button type="button" className="pill dark" onClick={() => void connect()}>
                I agree, start the interview
              </button>
            </>
          ) : (
            <>
              <p className="body" style={{ color: "var(--muted)" }}>
                {phase === "break" ? "The interview is paused. Nolan is not listening." : "Take your time. Nolan waits while you think."}
              </p>
              <div className="voice-row">
                <div aria-hidden="true" className={`wave ${connected ? "" : "idle"}`}>
                  {BAR_HEIGHTS.map((height, i) => (
                    <span key={i} style={{ height }} />
                  ))}
                </div>
                <span className="clock">{formatClock(seconds)}</span>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="alert" style={{ maxWidth: 520 }}>
              {error}
            </p>
          )}
        </section>

        <section aria-label="Notes" className="side-col">
          <div className="card stack" style={{ flex: 1, padding: 24, gap: 16 }}>
            <h2 className="h3">What Nolan has written down</h2>
            <Notes file={file} facts={facts} />
            <p className="meta">Say “that is wrong” and Nolan crosses the note out.</p>
          </div>
          <div className="card" style={{ padding: "20px 24px" }}>
            <p className="small" style={{ color: "var(--ink)" }}>
              No pictures are shown during an interview, so nothing shapes what you remember.
            </p>
          </div>
        </section>
      </main>
      <span className="tiny no-print" style={{ display: "none" }}>
        {witnessLabel(file, witness.id)}
      </span>
    </Page>
  );
}

/** Nolan's notes in his own hand: what the witness said, what they took back, and where they were not sure. */
export function Notes({ file, facts }: { file: CaseFile; facts: Fact[] }) {
  return (
    <div className="notes" aria-live="polite">
      {facts.length === 0 && <span className="empty">Nothing written yet</span>}
      {facts.map((fact) => {
        const detail = file.details.find((entry) => entry.id === fact.detailId);
        return (
          <span key={`${fact.detailId}-${fact.value}`} className="stack" style={{ gap: 2 }}>
            <span className="line">
              {fact.struck.map((old) => (
                <span key={old}>
                  <s>{old}</s>{" "}
                </span>
              ))}
              {fact.value}
            </span>
            {fact.sure === "unsure" && detail && <span className="line unsure">not sure about {lowerFirst(detail.label)}</span>}
          </span>
        );
      })}
    </div>
  );
}

function lowerFirst(text: string): string {
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/** Nolan's question arrives word by word, the way he says it. */
function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i} className="word" style={{ animationDelay: `${Math.min(i * 40, 900)}ms` }}>
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
