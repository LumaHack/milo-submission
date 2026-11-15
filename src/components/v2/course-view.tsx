"use client";

// One course (docs/COURSES.md): its parts as topic cards, the coach or exam choice, the
// "I want to work on…" box that builds one more part, what Claude left out, and "Remove this course".
// The course lives in this browser's storage, so the page only renders in the browser.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { browser } from "react-dom";

import { Page, pill } from "@/components/ui";
import type { Mode } from "@/lib/v2/contract";
import { getCourse, MAX_PARTS, partTopicId, removeCourse, saveCourse, type Course, type CoursePart } from "@/lib/v2/courses";
import { clearSession } from "@/lib/v2/storage";
import { storedChanged } from "@/lib/v2/use-stored";

import { MiloSays, ModeChoice, TopicCard, useMode, useProgress } from "./pick-bits";

export function CourseFromUrl() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return <CourseGate key={id} id={id} />;
}

function CourseGate({ id }: { id: string }) {
  use(browser("Courses are kept in localStorage."));
  const [course, setCourse] = useState(() => getCourse(id));
  if (!course) {
    return (
      <Page header={<Wordmark />}>
        <main className="flex flex-1 items-start justify-center rounded-panel bg-panel p-3">
          <section className="flex w-full max-w-[720px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-5">
            <div className="flex flex-col gap-2">
              <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">Milo can&apos;t find this course</h1>
              <p className="m-0 text-base leading-normal text-muted">
                Courses are kept in the browser they were made in. This one is not here, or it was removed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/v2#courses" className={pill.dark}>
                Your courses
              </Link>
            </div>
          </section>
        </main>
      </Page>
    );
  }
  return <CourseView course={course} onChange={setCourse} />;
}

function Wordmark() {
  return (
    <Link href="/v2" className="inline-flex min-h-11 items-center text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
      Milo
    </Link>
  );
}

function filesLine(course: Course): string {
  if (course.sample) return "A sample course, built ahead of time from our own test slides.";
  const names = course.files.map((file) => (file.pages ? `${file.name} (${file.pages} pages)` : file.name));
  return names.length > 0 ? `Read from ${names.join(", ")}.` : "";
}

function CourseView({ course, onChange }: { course: Course; onChange: (course: Course) => void }) {
  const router = useRouter();
  const [mode, setMode] = useMode();
  // What Milo says: about the part under the pointer, or about the course.
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  useEffect(() => {
    if (!confirmRemove) return;
    const timer = setTimeout(() => setConfirmRemove(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmRemove]);

  const remove = () => {
    // Its saved sessions go with it.
    for (const part of course.parts) {
      for (const each of ["coach", "exam"] as Mode[]) clearSession(partTopicId(course.id, part.id), each);
    }
    removeCourse(course.id);
    storedChanged();
    router.push("/v2#courses");
  };

  const line = preview
    ? `Great! Explain ${preview} to me in your own words, and I'll draw what I understand.`
    : mode === "exam"
      ? "Exam mode: I'll only ask questions, no hints. Pick a part and show me what you know."
      : "I haven't read any of it, promise. Pick a part and explain it to me. I'll draw what I understand.";

  return (
    <Page
      gap="gap-6"
      header={
        <>
          <Wordmark />
          <div className="flex flex-wrap gap-2">
            <Link href="/v2#courses" className={pill.light}>
              Your courses
            </Link>
            <Link href="/v2/sheets" className={pill.light}>
              Your revision sheets
            </Link>
          </div>
        </>
      }
    >
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-9 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
          <div className="flex flex-[1_1_420px] flex-col gap-3">
            <h1 className="m-0 text-[68px] leading-[1.02] font-medium tracking-[-0.04em] max-sm:text-[44px]">{course.title}</h1>
            <p className="m-0 text-[15px] leading-normal text-muted">
              {course.parts.length} {course.parts.length === 1 ? "part" : "parts"} to explain. {filesLine(course)}
            </p>
          </div>
          <MiloSays line={line} />
        </div>

        <ModeChoice mode={mode} onChange={setMode} />

        <div className="flex flex-col gap-3.5">
          <span className="text-[15px] font-semibold">Pick a part to explain</span>
          <div className="flex flex-wrap gap-3 rounded-panel bg-panel p-3">
            {course.parts.map((part) => (
              <PartCard key={part.id} course={course} part={part} mode={mode} onPreview={(on) => setPreview(on ? part.about : null)} />
            ))}
            <FocusBox course={course} onChange={onChange} />
          </div>
        </div>

        {course.skipped.length > 0 && (
          <div className="flex max-w-[70ch] flex-col gap-2">
            <span className="text-[15px] font-semibold">Left out on purpose</span>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-normal text-muted">
              {course.skipped.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <button
            type="button"
            className={confirmRemove ? pill.dark : pill.light}
            onClick={() => {
              if (confirmRemove) remove();
              else setConfirmRemove(true);
            }}
          >
            {confirmRemove ? "Sure? Remove it" : "Remove this course"}
          </button>
        </div>
      </main>
    </Page>
  );
}

function PartCard({
  course,
  part,
  mode,
  onPreview,
}: {
  course: Course;
  part: CoursePart;
  mode: Mode;
  onPreview: (on: boolean) => void;
}) {
  const progress = useProgress(partTopicId(course.id, part.id), mode, part.keyIdeas.length);
  const query = `course=${encodeURIComponent(course.id)}&part=${encodeURIComponent(part.id)}&mode=${mode}`;
  return (
    <TopicCard
      title={part.title}
      blurb={part.blurb}
      note={`${part.keyIdeas.length} ideas${part.origin === "focus" ? ", made at your request" : ""}`}
      progress={progress?.text}
      // A part that is fully explained opens its sheet. Any other opens the session.
      href={progress?.done ? `/v2/end?${query}` : `/v2/session?${query}`}
      onPreview={onPreview}
    />
  );
}

/** "I want to work on…": asks Claude for one more part, built from the course's outline. */
function FocusBox({ course, onChange }: { course: Course; onChange: (course: Course) => void }) {
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const full = course.parts.length >= MAX_PARTS;

  const ask = async () => {
    const wanted = request.trim();
    if (wanted.length < 2 || busy || full) return;
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/v2/courses/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          outline: course.outline,
          existing: course.parts.map((part) => ({ title: part.title, ideas: part.keyIdeas.map((idea) => idea.term || idea.gapLabel) })),
          request: wanted,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { found?: boolean; part?: CoursePart; message?: string; error?: string }
        | null;
      if (!response.ok || !data) throw new Error(data?.error ?? "failed");
      if (!data.found || !data.part) {
        setNote({ text: data.message ?? "This course does not seem to cover that.", bad: false });
        return;
      }
      // The new part's id must be its own inside this course.
      const taken = new Set(course.parts.map((part) => part.id));
      let id = data.part.id;
      for (let n = 2; taken.has(id); n++) id = `${data.part.id.slice(0, 34)}-${n}`;
      const next: Course = { ...course, parts: [...course.parts, { ...data.part, id }] };
      if (!saveCourse(next)) {
        setNote({ text: "Your browser could not save the new part. Its storage is full or blocked.", bad: true });
        return;
      }
      storedChanged();
      onChange(next);
      setRequest("");
      setNote({ text: `Added “${data.part.title}”. It is with the other parts now.`, bad: false });
    } catch {
      setNote({ text: "Claude could not build that part. Try again in a moment.", bad: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex min-h-[190px] flex-[1_1_260px] flex-col justify-between gap-4 rounded-card bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void ask();
      }}
    >
      <label className="flex flex-col gap-2.5">
        <span className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">I want to work on…</span>
        <input
          type="text"
          value={request}
          maxLength={200}
          onChange={(event) => setRequest(event.target.value)}
          placeholder="Something specific from this course"
          disabled={busy || full}
          className="min-h-11 rounded-full border border-line bg-card px-5 text-[15px] text-ink placeholder:text-faint disabled:opacity-60"
        />
      </label>
      <div className="flex flex-col gap-2.5">
        {busy ? (
          <p aria-live="polite" className="m-0 flex animate-rise items-center gap-2.5 text-[15px] text-muted">
            <span aria-hidden="true" className="h-3 w-3 flex-none animate-spin rounded-full border-2 border-line border-t-ink" />
            Claude is building this part
          </p>
        ) : note ? (
          <p role={note.bad ? "alert" : "status"} className={`m-0 animate-rise text-[15px] leading-normal ${note.bad ? "text-miss" : "text-muted"}`}>
            {note.text}
          </p>
        ) : (
          <p className="m-0 text-[15px] leading-normal text-muted">
            {full ? "This course has as many parts as it can hold." : "Claude builds one more part about it from your course."}
          </p>
        )}
        <div>
          <button type="submit" className={`${pill.dark} disabled:opacity-40`} disabled={busy || full || request.trim().length < 2}>
            Make this part
          </button>
        </div>
      </div>
    </form>
  );
}
