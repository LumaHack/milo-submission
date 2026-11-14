"use client";

// The case file: the investigator's home screen. From design/Case.dc.html.
// With no case open it shows the form for a new one and the earlier cases.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Dots, Page } from "@/components/ui";
import {
  currentComparison,
  finished,
  formatClock,
  plural,
  scenesAllowed,
  tally,
  type CaseFile,
  type Detail,
  type Witness,
} from "@/lib/nolan";
import { deleteCase, newId, newToken, openCase, saveCase, updateCase, useCases, useInterviewLink, useOpenCase, useRefused } from "@/lib/store";

const PROTECTS = [
  "Each witness is interviewed alone.",
  "Nolan asks open questions and never suggests an answer.",
  "No pictures exist until every interview is finished.",
  "Scenes are for the investigator. A witness never sees one.",
];

export function CaseFileScreen() {
  const file = useOpenCase();
  const cases = useCases();
  const refused = useRefused();
  if (file === undefined || cases === undefined) return null;
  if (refused) return <NotHere />;
  return file ? <OpenCase file={file} /> : <NewCase cases={cases} />;
}

function reportedLine(file: CaseFile): string {
  const when = new Date(file.createdAt);
  const date = when.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const time = when.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  const count = file.witnesses.length;
  const saw = count === 0 ? "No witnesses listed yet." : `${plural(count, "person", "people")} saw it.`;
  return `Case ${file.number}. Opened on ${date} at ${time}. ${saw}`;
}

function minutes(seconds: number): string {
  const whole = Math.max(1, Math.round(seconds / 60));
  return plural(whole, "minute");
}

function OpenCase({ file }: { file: CaseFile }) {
  const router = useRouter();
  const [where, setWhere] = useState("");
  const [sent, setSent] = useState<{ id: string; link: string; copied: boolean } | null>(null);
  const linkFor = useInterviewLink();
  const done = finished(file);
  const underway = file.witnesses.filter((witness) => witness.status === "underway").length;
  const comparison = currentComparison(file);
  const canCompare = done.length >= 2;
  const canScenes = scenesAllowed(file);

  const addWitness = (event: React.FormEvent) => {
    event.preventDefault();
    const text = where.trim();
    if (!text || file.witnesses.length >= 6) return;
    const witness: Witness = { id: newId("w"), token: newToken(), where: text, status: "waiting", turns: [], facts: [], seconds: 0 };
    updateCase(file.id, (current) => ({ ...current, witnesses: [...current.witnesses, witness] }));
    setWhere("");
  };

  // The interview opens on this device. The flag lets it offer a way back here when it ends.
  const interview = (witness: Witness) => {
    try {
      window.sessionStorage.setItem("nolan.investigator", "1");
    } catch {
      // Without it the interview simply ends on its thank-you screen.
    }
    router.push(`/interview/${witness.token}`);
  };

  // The link opens this witness's interview on their own device, and nothing else.
  const send = async (witness: Witness, position: number) => {
    const link = linkFor(witness.token);
    let copied = false;
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Nolan interview", text: `Your interview link, witness ${position}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch {
      // Sharing was cancelled or the clipboard is blocked. The link is shown so it can be copied by hand.
    }
    setSent({ id: witness.id, link, copied });
  };

  const remove = (witness: Witness) => {
    updateCase(file.id, (current) => ({
      ...current,
      witnesses: current.witnesses.filter((entry) => entry.id !== witness.id),
    }));
  };

  let summary = "Compare the accounts once two interviews are finished.";
  if (comparison) summary = tally(comparison.rows).line;
  else if (canCompare) summary = `${plural(done.length, "interview")} finished. Their accounts have not been compared yet.`;

  return (
    <Page
      sub="Cases"
      actions={
        <button type="button" className="pill" onClick={() => openCase(null)}>
          New case
        </button>
      }
    >
      <div className="hero">
        <h1 className="big">{file.title}</h1>
        <p>{reportedLine(file)}</p>
      </div>

      <main className="panel">
        <section aria-label="Witnesses" className="card main-col stack" style={{ gap: 8 }}>
          <h2 className="h2" style={{ marginBottom: 8 }}>
            Witnesses
          </h2>

          <div className="rows">
          {file.witnesses.map((witness, i) => (
            <div key={witness.id} className="row">
              <div className="stack" style={{ gap: 2 }}>
                <span className="row-name">Witness {i + 1}</span>
                <span className="meta">{witness.where}</span>
              </div>
              <div className="row-actions">
                {witness.status === "done" && (
                  <>
                    <span className="status">
                      <span aria-hidden="true" className="dot ok" />
                      Interviewed, {minutes(witness.seconds)}
                    </span>
                    <button type="button" className="link-button" onClick={() => interview(witness)}>
                      Reopen
                    </button>
                  </>
                )}
                {witness.status === "underway" && (
                  <button type="button" className="pill dark small" onClick={() => interview(witness)}>
                    Interview in progress, {formatClock(witness.seconds)}
                  </button>
                )}
                {witness.status === "waiting" && (
                  <>
                    <button type="button" className="pill small" onClick={() => void send(witness, i + 1)}>
                      {sent?.id === witness.id && sent.copied ? "Link copied" : "Send interview link"}
                    </button>
                    <button type="button" className="link-button" onClick={() => interview(witness)}>
                      Interview here
                    </button>
                  </>
                )}
                {witness.status !== "done" && (
                  <button type="button" className="link-button" onClick={() => remove(witness)} aria-label={`Remove witness ${i + 1}`}>
                    Remove
                  </button>
                )}
              </div>
              {sent?.id === witness.id && witness.status === "waiting" && (
                <p className="tiny" style={{ flexBasis: "100%", wordBreak: "break-all" }}>
                  {sent.link}
                  {sent.link.startsWith("http://") && !sent.link.includes("//localhost") && (
                    <>
                      <br />This link is not https, so the witness&rsquo;s browser will refuse the microphone. Set NOLAN_PUBLIC_URL to an https address for this machine (see the README), or use Interview here.
                    </>
                  )}
                </p>
              )}
            </div>
          ))}
          </div>

          {file.witnesses.length < 6 && (
            <form onSubmit={addWitness} className="field-row" style={{ paddingTop: 18 }}>
              <input
                className="field"
                value={where}
                onChange={(event) => setWhere(event.target.value)}
                placeholder="Where was the next witness? For example: was across the road"
                aria-label="Where the next witness was"
                maxLength={80}
              />
              <button type="submit" className="pill" disabled={!where.trim()}>
                Add witness
              </button>
            </form>
          )}
          <p className="tiny" style={{ paddingTop: 6 }}>
            Send each witness their own link, or hand them this device one at a time. A link opens that interview and nothing else. Accounts carry no names.
          </p>
        </section>

        <section aria-label="Summary" className="side-col">
          <div className="card stack" style={{ gap: 18 }}>
            <div className="stack" style={{ gap: 4 }}>
              <span className="big-number">
                {done.length + underway} of {file.witnesses.length}
              </span>
              <span className="small">{underway > 0 ? "interviews finished or under way" : "interviews finished"}</span>
            </div>
            <p className="body">{summary}</p>
            <div className="header-right">
              <Link href="/compare" className="pill dark" aria-disabled={!canCompare}>
                Compare accounts
              </Link>
              <Link href="/scenes" className="pill" aria-disabled={!canScenes}>
                Open the scenes
              </Link>
            </div>
            {!canScenes && canCompare && (
              <p className="tiny">Scenes open once every listed witness has been interviewed. Remove a witness who will not be.</p>
            )}
          </div>
          <div className="card stack" style={{ flex: 1, padding: "24px 28px", gap: 12 }}>
            <h2 className="h3">How Nolan protects an account</h2>
            <ul className="list muted">
              {PROTECTS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </Page>
  );
}

/** A witness's device that wanders off its interview link lands here. The case file is not served to it. */
function NotHere() {
  return (
    <Page sub="Interviews">
      <div className="hero">
        <h1 className="big">This device is for the interview</h1>
        <p>Open the interview link you were sent. The case file is only shown to the investigator.</p>
      </div>
    </Page>
  );
}

function NewCase({ cases }: { cases: CaseFile[] }) {
  const [incident, setIncident] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = incident.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident: text }),
      });
      const data = (await response.json().catch(() => null)) as { title?: string; opener?: string; details?: Detail[]; error?: string } | null;
      if (!response.ok || !data?.title || !data.opener || !data.details) {
        if (response.status !== 422 && response.status !== 400) console.error("Opening a case failed:", data?.error);
        throw new Error(response.status === 422 || response.status === 400 ? (data?.error ?? "") : "");
      }
      const now = new Date();
      const file: CaseFile = {
        id: newId("case"),
        number: `${String(now.getFullYear()).slice(2)}-${String(1000 + Math.floor(Math.random() * 9000))}`,
        title: data.title,
        opener: data.opener,
        details: data.details,
        witnesses: [],
        comparison: null,
        createdAt: now.getTime(),
      };
      saveCase(file);
      openCase(file.id);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(message || "The case could not be opened. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page sub="Cases">
      <div className="hero">
        <h1 className="big">What happened?</h1>
        <p>Nolan interviews each witness alone, out loud, then shows you where their accounts agree and where they differ.</p>
      </div>

      <main className="panel">
        <section aria-label="New case" className="card main-col stack" style={{ gap: 18 }}>
          <h2 className="h2">New case</h2>
          <form onSubmit={create} className="field-row">
            <input
              className="field"
              value={incident}
              onChange={(event) => setIncident(event.target.value)}
              placeholder="For example: bike theft outside the library"
              aria-label="What happened"
              maxLength={160}
              autoFocus
            />
            <button type="submit" className="pill dark" disabled={!incident.trim() || busy}>
              {busy ? (
                <>
                  Opening the case <Dots />
                </>
              ) : (
                "Open the case"
              )}
            </button>
          </form>
          <p className="small">Say it in a few words. Nolan works out what to ask every witness, and you add the witnesses next.</p>
          {error && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}

          {cases.length > 0 && (
            <div className="stack" style={{ gap: 0, paddingTop: 12 }}>
              <h2 className="h2" style={{ marginBottom: 16 }}>
                Earlier cases
              </h2>
              <div className="rows">
              {cases.map((entry) => (
                <div key={entry.id} className="row">
                  <div className="stack" style={{ gap: 2 }}>
                    <span className="row-name">{entry.title}</span>
                    <span className="meta">
                      Case {entry.number}, {plural(finished(entry).length, "interview")} finished
                    </span>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="pill small" onClick={() => openCase(entry.id)}>
                      Open
                    </button>
                    <button type="button" className="link-button" onClick={() => deleteCase(entry.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </section>

        <section aria-label="How it works" className="side-col">
          <div className="card stack" style={{ flex: 1, padding: "24px 28px", gap: 12 }}>
            <h2 className="h3">How Nolan protects an account</h2>
            <ul className="list muted">
              {PROTECTS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </Page>
  );
}
