"use client";

// "New course" (docs/COURSES.md): a name, the student's files, and "Read my course". While Claude
// reads, the screen says what is really happening and shows each part's title as it is written.
// The finished course is saved in this browser and its page opens. The files are never kept.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Page, pill } from "@/components/ui";
import { formatClock } from "@/lib/demo";
import { isPhoto, readCourse, ReadingFailed, UPLOAD } from "@/lib/v2/course-client";
import { saveCourse } from "@/lib/v2/courses";
import { storedChanged } from "@/lib/v2/use-stored";

import { MiloSays } from "./pick-bits";

const megabytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;

/** What is wrong with the chosen files, in words for the student, or null. The server checks again. */
function problemWith(files: File[]): string | null {
  const photos = files.filter(isPhoto);
  const documents = files.filter((file) => !isPhoto(file));
  const odd = documents.find((file) => !/\.(pdf|pptx|docx)$/i.test(file.name));
  if (odd) return `Milo can't read “${odd.name}”. Save it as a PDF and add that.`;
  if (documents.length > UPLOAD.files) return `Milo reads up to ${UPLOAD.files} files per course, plus photos. Remove ${documents.length - UPLOAD.files}.`;
  if (photos.length > UPLOAD.photos) return `Milo reads up to ${UPLOAD.photos} photos per course. Remove ${photos.length - UPLOAD.photos}.`;
  const bytes = documents.reduce((sum, file) => sum + file.size, 0);
  if (bytes > UPLOAD.totalBytes) return `These files are ${megabytes(bytes)} together. Milo reads up to ${megabytes(UPLOAD.totalBytes)} per course. Upload one chapter at a time.`;
  return null;
}

export function CourseNew() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [reading, setReading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [parts, setParts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  // Stop reading if the student leaves the page.
  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    if (!reading) return;
    const since = Date.now();
    const timer = setInterval(() => setSeconds((Date.now() - since) / 1000), 1000);
    return () => clearInterval(timer);
  }, [reading]);

  const add = (list: FileList | File[] | null) => {
    if (!list) return;
    setError(null);
    setFiles((current) => {
      // The same file picked twice counts once.
      const known = new Set(current.map((file) => `${file.name}:${file.size}`));
      return [...current, ...Array.from(list).filter((file) => !known.has(`${file.name}:${file.size}`))];
    });
  };

  const problem = problemWith(files);

  const start = async () => {
    if (files.length === 0 || problem || reading) return;
    setReading(true);
    setError(null);
    setStatus("Sending your files");
    setParts([]);
    setSeconds(0);
    abort.current = new AbortController();
    try {
      const course = await readCourse(
        { name: name.trim(), files },
        (event) => {
          if (event.type === "status") setStatus(event.text);
          else setParts((current) => [...current, event.title]);
        },
        abort.current.signal,
      );
      if (!saveCourse(course)) {
        setError("Your browser could not save this course. Its storage is full or blocked. Remove an old course and try again.");
        return;
      }
      storedChanged();
      router.push(`/v2/course?id=${course.id}`);
    } catch (caught) {
      const message = caught instanceof ReadingFailed ? caught.message : "Something went wrong while reading. Try again.";
      // Pressing Stop is not an error to report.
      setError(message === "Stopped." ? null : message);
    } finally {
      setReading(false);
      setStatus(null);
    }
  };

  return (
    <Page
      gap="gap-6"
      header={
        <>
          <Link href="/v2" className="inline-flex min-h-11 items-center text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
            Milo
          </Link>
          <Link href="/v2#courses" className={pill.light}>
            Your courses
          </Link>
        </>
      }
    >
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-7 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
          <h1 className="m-0 flex-[1_1_420px] text-[68px] leading-[1.02] font-medium tracking-[-0.04em] max-sm:text-[44px]">
            New course
          </h1>
          <MiloSays
            line={
              reading
                ? "Claude is reading your course for me. I still won't know a thing, so you'll have to explain it!"
                : "Add your slides or notes. Claude sorts them into parts, then you explain them to me."
            }
          />
        </div>

        <div className="flex flex-col gap-3 rounded-panel bg-panel p-3">
          {reading ? (
            <section aria-live="polite" className="flex flex-col gap-5 rounded-card bg-card p-7 max-sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="m-0 flex items-center gap-3 text-lg font-medium">
                  <span aria-hidden="true" className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-line border-t-ink" />
                  {status ?? "Reading"}
                </p>
                <span className="text-sm text-muted tabular-nums">{formatClock(seconds)}</span>
              </div>
              <p className="m-0 text-[15px] leading-normal text-muted">
                A deck of 20 to 30 slides takes about a minute. You can leave this page open and wait.
              </p>
              {parts.length > 0 && (
                <ol className="m-0 flex list-none flex-col gap-2 p-0">
                  {parts.map((title, index) => (
                    <li key={`${index}-${title}`} className="flex animate-rise items-center gap-3 rounded-tile bg-panel px-4 py-3 text-[15px] font-medium">
                      <span className="text-muted tabular-nums">{index + 1}</span>
                      {title}
                    </li>
                  ))}
                </ol>
              )}
              <div>
                <button type="button" className={pill.light} onClick={() => abort.current?.abort()}>
                  Stop
                </button>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-6 rounded-card bg-card p-7 max-sm:p-5">
              <label className="flex max-w-[520px] flex-col gap-2.5">
                <span className="text-[15px] font-semibold">Course name</span>
                <input
                  type="text"
                  value={name}
                  maxLength={60}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="For example: Cell biology, week 3"
                  className="min-h-11 rounded-full border border-line bg-card px-5 text-[15px] text-ink placeholder:text-faint"
                />
                <span className="text-[13px] text-muted">Leave it empty and the course is named after your slides.</span>
              </label>

              <div className="flex flex-col gap-2.5">
                <span className="text-[15px] font-semibold">Your files</span>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOver(true);
                  }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setOver(false);
                    add(event.dataTransfer.files);
                  }}
                  className={`flex flex-col items-start gap-3 rounded-well border bg-panel p-5 ${over ? "border-ink" : "border-panel"}`}
                >
                  <p className="m-0 text-[15px] leading-normal">Drop your slides or notes here, or choose them.</p>
                  <button type="button" className={pill.light} onClick={() => picker.current?.click()}>
                    Choose files
                  </button>
                  <input
                    ref={picker}
                    type="file"
                    multiple
                    accept={UPLOAD.accept}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Choose your course files"
                    onChange={(event) => {
                      add(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </div>
                {files.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {files.map((file) => (
                      <li key={`${file.name}:${file.size}`} className="flex animate-rise items-center justify-between gap-3 rounded-tile border border-line py-1.5 pr-1.5 pl-4">
                        <span className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                          <span className="truncate text-[15px] font-medium">{file.name}</span>
                          <span className="text-[13px] text-muted tabular-nums">{megabytes(file.size)}</span>
                        </span>
                        <button
                          type="button"
                          className={`${pill.light} !px-4 !text-sm`}
                          onClick={() => setFiles((current) => current.filter((entry) => entry !== file))}
                          aria-label={`Remove ${file.name}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="m-0 max-w-[70ch] text-[13px] leading-normal text-muted">
                  PDF, PowerPoint, Word, or photos of your notes. Up to {UPLOAD.files} files and {megabytes(UPLOAD.totalBytes)},{" "}
                  {UPLOAD.pdfPages} PDF pages, {UPLOAD.photos} photos. Your files are sent to Claude to be read once. Milo
                  does not keep them.
                </p>
              </div>

              {(problem ?? error) && (
                <p role="alert" className="m-0 animate-rise rounded-tile border border-line px-4 py-3 text-sm text-miss">
                  {problem ?? error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${pill.dark} disabled:opacity-40`}
                  onClick={() => void start()}
                  disabled={files.length === 0 || Boolean(problem)}
                >
                  {error ? "Try again" : "Read my course"}
                </button>
                <Link href="/v2#courses" className={pill.light}>
                  Cancel
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </Page>
  );
}
