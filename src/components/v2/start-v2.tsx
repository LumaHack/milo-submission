"use client";

// Milo v2's start screen: pick a subject or your own courses, how Milo should help, then a topic.
// Same layout and tokens as Ali's start screen (design/claude-design/StartV3.dc.html), plus the mode
// choice, Milo's speech bubble, saved progress on each card, and the student's own courses.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Page, pill } from "@/components/ui";
import type { Mode } from "@/lib/v2/contract";
import { COURSES_KEY, parseCourses, saveCourse, type Course } from "@/lib/v2/courses";
import { SAMPLE_COURSES } from "@/lib/v2/sample-courses";
import { V2_SUBJECTS, V2_TOPICS, type Subject, type V2Topic } from "@/lib/v2/topics";
import { storedChanged, useStored } from "@/lib/v2/use-stored";

import { MiloSays, ModeChoice, previewLine, TopicCard, useCourseProgress, useMode, useProgress } from "./pick-bits";

/** What the grid shows: a built-in subject's topics, or the student's own courses. */
type Shelf = Subject | "courses";

function onHashChange(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** "/v2#courses" opens the screen on the student's courses. Read after the first paint, so the server agrees. */
function useHash(): string {
  return useSyncExternalStore(
    onHashChange,
    () => window.location.hash,
    () => "",
  );
}

export function StartV2() {
  const router = useRouter();
  const [mode, setMode] = useMode();
  const hash = useHash();
  const [picked, setPicked] = useState<Shelf | null>(null);
  const shelf: Shelf = picked ?? (hash === "#courses" ? "courses" : "Biology");
  // What Milo talks about: the card under the pointer, or what is selected.
  const [preview, setPreview] = useState<string | null>(null);

  const stored = useStored(COURSES_KEY);
  const courses = useMemo(() => parseCourses(stored), [stored]);
  const samples = SAMPLE_COURSES.filter((sample) => !courses.some((course) => course.id === sample.id));

  const [sampleProblem, setSampleProblem] = useState(false);
  /** A sample course is copied into this browser like any other course, then opened. */
  const openSample = (sample: Course) => {
    if (!saveCourse(sample)) {
      setSampleProblem(true);
      return;
    }
    storedChanged();
    router.push(`/v2/course?id=${sample.id}`);
  };

  const line = preview
    ? previewLine(preview)
    : shelf === "courses"
      ? "Bring your own course! Claude reads your slides and sorts them into parts. Then you explain them to me."
      : mode === "exam"
        ? "Exam mode: I'll only ask questions, no hints. Pick a topic and show me what you know."
        : "Explain it to me out loud, like to a friend who knows nothing. I'll draw what you say, and I grow up as you get it right.";

  return (
    <Page
      gap="gap-6"
      header={
        <>
          <span className="text-xl font-semibold tracking-[-0.02em]">Milo</span>
          <Link href="/v2/sheets" className={pill.light}>
            Your revision sheets
          </Link>
        </>
      }
    >
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-9 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
          <h1 className="m-0 flex-[1_1_520px] text-[68px] leading-[1.02] font-medium tracking-[-0.04em] max-sm:text-[44px]">
            What do you want to explain?
          </h1>
          <MiloSays line={line} />
        </div>

        <div className="flex flex-wrap gap-x-16 gap-y-7">
          <div className="flex flex-col gap-3.5">
            <span className="text-[15px] font-semibold">Subject</span>
            <div className="flex flex-wrap gap-2">
              {[...V2_SUBJECTS, "courses" as const].map((entry) => (
                <button
                  key={entry}
                  type="button"
                  aria-pressed={entry === shelf}
                  className={entry === shelf ? pill.dark : pill.light}
                  onClick={() => {
                    setPicked(entry);
                    setPreview(null);
                  }}
                >
                  {entry === "courses" ? "Your courses" : entry}
                </button>
              ))}
            </div>
          </div>

          <ModeChoice mode={mode} onChange={setMode} />
        </div>

        <div className="flex flex-col gap-3.5">
          <span className="text-[15px] font-semibold">
            {shelf === "courses" ? "Your courses" : "Four topics to choose from"}
          </span>
          {shelf === "courses" && sampleProblem && (
            <p role="alert" className="m-0 animate-rise rounded-tile border border-line px-4 py-3 text-sm text-miss">
              Your browser could not save this course: its storage is full or blocked. Allow storage for this site and try again.
            </p>
          )}
          <div className="flex flex-wrap gap-3 rounded-panel bg-panel p-3">
            {shelf === "courses" ? (
              <>
                {/* Always first, so adding a course is in the same place however many there are. */}
                <TopicCard
                  title="New course"
                  blurb="Upload your slides or notes. Claude sorts them into parts you can explain."
                  note="PDF, PowerPoint, Word or photos"
                  href="/v2/course/new"
                />
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} mode={mode} />
                ))}
                {samples.map((sample) => (
                  <TopicCard
                    key={sample.id}
                    title={sample.title}
                    blurb="A sample course, ready in one click."
                    note="Try a sample course"
                    onClick={() => openSample(sample)}
                  />
                ))}
              </>
            ) : (
              V2_TOPICS.filter((topic) => topic.subject === shelf).map((topic) => (
                <BuiltInCard key={topic.id} topic={topic} mode={mode} onPreview={(on) => setPreview(on ? topic.about : null)} />
              ))
            )}
          </div>
        </div>
      </main>
    </Page>
  );
}

/** One of the student's courses, with how much of it is explained so far in the chosen mode. */
function CourseCard({ course, mode }: { course: Course; mode: Mode }) {
  const progress = useCourseProgress(course, mode);
  return (
    <TopicCard
      title={course.title}
      blurb={`${course.parts.length} ${course.parts.length === 1 ? "part" : "parts"} to explain.`}
      note={course.sample ? "Sample course" : course.files.map((file) => file.name).join(", ")}
      progress={progress}
      href={`/v2/course?id=${encodeURIComponent(course.id)}`}
    />
  );
}

/** A built-in topic. Only ready topics open a session; the others look the same and go nowhere yet. */
function BuiltInCard({ topic, mode, onPreview }: { topic: V2Topic; mode: Mode; onPreview: (on: boolean) => void }) {
  const progress = useProgress(topic.id, mode, topic.keyIdeas.length);
  // Said on the card, so nobody clicks a topic that does nothing and wonders why.
  if (!topic.ready) return <TopicCard title={topic.title} blurb={topic.blurb} note="Not built yet" />;
  const query = `topic=${topic.id}&mode=${mode}`;
  return (
    <TopicCard
      title={topic.title}
      blurb={topic.blurb}
      progress={progress?.text}
      // A topic that is fully explained opens its sheet. Any other opens the session.
      href={progress?.done ? `/v2/end?${query}` : `/v2/session?${query}`}
      onPreview={onPreview}
    />
  );
}
