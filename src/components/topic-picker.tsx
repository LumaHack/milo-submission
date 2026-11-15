"use client";

// Start screen: upload your own notes, or pick a subject and one of four topics, or type your own.
// "How a cell works" is the tested preset and opens at once. Any other topic goes to /api/topic,
// which works out the key ideas Milo should be taught. Notes go to /api/notes, which sets up topics
// from the notes alone; those topics are kept in this browser until the student goes back.

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { pill } from "@/components/ui";
import { chooseTopic, clearNotes, saveNotes, useNotes, type StoredNotes } from "@/lib/history";
import { SUBJECTS, SUGGESTIONS, TOPICS, type Topic } from "@/lib/topics";

type Subject = (typeof SUBJECTS)[number];

const topicCard =
  "press flex min-h-[168px] flex-[1_1_260px] flex-col justify-between gap-5 rounded-card bg-card p-6 text-left text-ink disabled:opacity-50";

/** Set NEXT_PUBLIC_MILO_NOTES=0 in .env.local to hide the notes row, if it ever misbehaves. */
const NOTES_ON = process.env.NEXT_PUBLIC_MILO_NOTES !== "0";

/** What /api/notes reads. The server checks again; checking here saves uploading a file it will refuse. */
const ACCEPT = ".pdf,.txt,.md,.vtt,.srt,.png,.jpg,.jpeg,.webp";
const READABLE = new Set(["pdf", "txt", "md", "markdown", "vtt", "srt", "png", "jpg", "jpeg", "webp"]);
const SAVE_AS_PDF = new Set(["ppt", "pptx", "key", "odp", "doc", "docx", "pages", "odt", "rtf"]);
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function checkFiles(files: File[]): string | null {
  if (files.length === 0) return "Pick at least one file to upload.";
  if (files.length > MAX_FILES) return `Milo can read up to ${MAX_FILES} files at once.`;
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return "That is more than 20 MB. Upload one lecture at a time.";
  }
  for (const file of files) {
    const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
    if (SAVE_AS_PDF.has(extension)) return "Save your slides as a PDF first, then upload that.";
    if (!READABLE.has(extension)) {
      return "Milo can read PDFs, text files, transcripts and photos of slides. Save slides as a PDF first.";
    }
  }
  return null;
}

export function TopicPicker({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const [subject, setSubject] = useState<Subject>("Biology");
  const [page, setPage] = useState(0);
  const [typed, setTyped] = useState("");
  /** The title being set up, while /api/topic is working. */
  const [making, setMaking] = useState<string | null>(null);
  /** How many files Milo is reading, while /api/notes is working. */
  const [reading, setReading] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stored = useNotes();
  const notes = NOTES_ON ? stored : null;
  // Storage is only readable in the browser. Until then, nothing that depends on the mode is drawn,
  // so the screen never shows the suggested topics and then jumps to the notes.
  const busy = making !== null || reading !== null;

  const suggestions = SUGGESTIONS[subject];
  const shown = suggestions.slice(page * 4, page * 4 + 4);

  const begin = (topic: Topic) => {
    chooseTopic(topic);
    router.push("/session");
  };

  const pick = async (title: string) => {
    const wanted = title.trim();
    if (wanted.length < 2 || busy) return;
    // The preset has hand-written key ideas and needs no setting up.
    const preset = TOPICS.find((topic) => topic.ready && topic.title === wanted);
    if (preset) return begin(preset);

    setMaking(wanted);
    setError(null);
    try {
      const response = await fetch("/api/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: wanted }),
      });
      const data = (await response.json().catch(() => null)) as (Topic & { error?: string }) | null;
      if (!response.ok || !data || data.error) throw new Error(data?.error ?? "That topic could not be set up.");
      begin(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That topic could not be set up.");
      setMaking(null);
    }
  };

  const upload = async (list: FileList | null) => {
    if (busy || !list) return;
    const files = Array.from(list);
    const problem = checkFiles(files);
    if (problem) {
      setError(problem);
      return;
    }
    setReading(files.length);
    setError(null);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      // A long deck can take a while to read. Never hang forever.
      const response = await fetch("/api/notes", { method: "POST", body: form, signal: AbortSignal.timeout(180000) });
      const data = (await response.json().catch(() => null)) as (Omit<StoredNotes, "savedAt"> & { error?: string }) | null;
      if (!response.ok || !data || data.error || !Array.isArray(data.topics)) {
        console.error("Reading notes failed:", response.status, data?.error);
        // The server's 4xx messages are written for the student. Anything else gets the plain line.
        setError(
          response.status >= 400 && response.status < 500 && data?.error
            ? data.error
            : "Milo could not read those notes. Try again.",
        );
        return;
      }
      saveNotes({ files: data.files, topics: data.topics, savedAt: Date.now() });
    } catch (caught) {
      console.error("Reading notes failed:", caught);
      const timedOut = caught instanceof DOMException && caught.name === "TimeoutError";
      setError(
        timedOut
          ? "Reading those notes took too long. Try fewer pages, or one lecture at a time."
          : "Milo could not read those notes. Try again.",
      );
    } finally {
      setReading(null);
    }
  };

  const fileNames = notes ? notes.files.join(", ") : "";
  const notesLine =
    reading !== null
      ? `Milo is reading ${reading === 1 ? "your file" : `${reading} files`}. This can take half a minute.`
      : notes
        ? `Topics from ${fileNames || "your notes"}. Milo only uses what is in them.`
        : "Slides as a PDF, lecture notes or a transcript. Milo only uses what is in them.";

  if (notes === undefined) return <>{children}</>;

  return (
    <>
      {!notes && (
        <div className="flex flex-col gap-3.5">
          <span className="text-[15px] font-semibold">Subject</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((entry) => (
              <button
                key={entry}
                type="button"
                aria-pressed={entry === subject}
                onClick={() => {
                  setSubject(entry);
                  setPage(0);
                }}
                className={entry === subject ? pill.dark : pill.light}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>
      )}

      {children}

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-[15px] font-semibold">{notes ? "Topics in your notes" : "Four topics to choose from"}</span>
          {notes ? (
            <button
              type="button"
              onClick={() => {
                clearNotes();
                setError(null);
              }}
              disabled={busy}
              className={`${pill.light} !px-[18px] !text-sm disabled:opacity-40`}
            >
              Use suggested topics
            </button>
          ) : (
            <button type="button" onClick={() => setPage((value) => (value + 1) % 2)} className={`${pill.light} !px-[18px] !text-sm`}>
              Give me four others
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-panel bg-panel p-3">
          {NOTES_ON && (
            <div
              className={`flex flex-wrap items-center gap-2 rounded-card bg-card p-4 ${dragging ? "outline-2 outline-offset-2 outline-ink" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void upload(event.dataTransfer.files);
              }}
            >
              <span className="px-2 text-[15px] font-semibold">Your notes</span>
              <span className="min-w-0 flex-[1_1_260px] px-2 text-[15px] leading-normal text-muted">
                {notesLine}
              </span>
              <label
                className={`${notes ? pill.light : pill.dark} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${busy ? "pointer-events-none opacity-40" : ""}`}
              >
                {reading !== null ? "Reading your notes…" : notes ? "Upload other notes" : "Upload notes"}
                <input
                  type="file"
                  multiple
                  accept={ACCEPT}
                  disabled={busy}
                  className="sr-only"
                  onChange={(event) => {
                    void upload(event.target.files);
                    // Lets the same file be picked again after an error.
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {notes ? (
            <div key={`notes-${notes.savedAt}`} className="flex flex-wrap gap-3">
              {notes.topics.map((topic, i) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => begin(topic)}
                  disabled={busy}
                  className={`${topicCard} animate-rise`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">{topic.title}</span>
                  <span className="text-[15px] leading-normal text-muted">{topic.blurb}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div key={`${subject}-${page}`} className="flex flex-wrap gap-3">
                {shown.map((topic, i) => (
                  <button
                    key={topic.title}
                    type="button"
                    onClick={() => void pick(topic.title)}
                    disabled={reading !== null || (making !== null && making !== topic.title)}
                    className={`${topicCard} animate-rise`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">{topic.title}</span>
                    <span className="text-[15px] leading-normal text-muted">
                      {making === topic.title ? "Setting it up…" : topic.blurb}
                    </span>
                  </button>
                ))}
              </div>

              <form
                className="flex flex-wrap items-center gap-2 rounded-card bg-card p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void pick(typed);
                }}
              >
                <label htmlFor="own-topic" className="px-2 text-[15px] font-semibold">
                  Or your own
                </label>
                <input
                  id="own-topic"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  disabled={busy}
                  placeholder="How a volcano erupts, the water cycle, how the internet works…"
                  className="min-h-11 min-w-0 flex-[1_1_260px] rounded-full border border-line bg-card px-4 text-[15px] text-ink placeholder:text-muted"
                />
                <button type="submit" disabled={busy || typed.trim().length < 2} className={`${pill.dark} disabled:opacity-40`}>
                  {making !== null && making === typed.trim() ? "Setting it up…" : "Explain this"}
                </button>
              </form>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="m-0 animate-rise text-sm text-ink">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
