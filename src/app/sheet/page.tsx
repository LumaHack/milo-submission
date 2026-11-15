"use client";

// Revision sheet: the final board, the explanation in the student's words, and how the level climbed.
// From here the session can be played as a slideshow or turned into a short film by fal.
// It shows the session last opened from the history, or the newest one.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";

import { Slideshow } from "@/components/slideshow";
import { MiloPic, Page, pill } from "@/components/ui";
import { saveSession, useOpenSession } from "@/lib/history";
import { levelInfo } from "@/lib/levels";

export default function SheetPage() {
  const session = useOpenSession();
  const [playing, setPlaying] = useState(false);
  const [filmError, setFilmError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  // A film takes a few minutes. While one is being made, check on it every five seconds.
  // The job is stored with the session, so this carries on after a reload.
  const job = session?.filmJob;
  useEffect(() => {
    if (!session || !job) return;
    let stopped = false;
    let failures = 0;
    const check = async () => {
      setNow(Date.now());
      // fal has never taken this long. Stop waiting so the button comes back.
      if (Date.now() - job.startedAt > 8 * 60 * 1000) {
        setFilmError("The film is taking too long. Try making it again.");
        saveSession({ ...session, filmJob: undefined });
        return;
      }
      try {
        const response = await fetch(`/api/film?id=${encodeURIComponent(job.requestId)}`);
        const data = (await response.json().catch(() => null)) as { status?: string; videoUrl?: string; error?: string } | null;
        if (stopped) return;
        if (!response.ok || !data) throw new Error(data?.error ?? "The film could not be made.");
        failures = 0;
        if (data.status === "done" && data.videoUrl) {
          saveSession({ ...session, filmJob: undefined, filmUrl: data.videoUrl });
        }
      } catch (caught) {
        if (stopped) return;
        // One failed check is usually the network. fal is still making the film, so keep asking.
        failures += 1;
        if (failures < 3) return;
        setFilmError(caught instanceof Error ? caught.message : "The film could not be made.");
        saveSession({ ...session, filmJob: undefined });
      }
    };
    const timer = setInterval(check, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [session, job]);

  // Storage has not been read yet.
  if (session === undefined) return null;

  const frames = session?.frames ?? [];
  const final = frames[frames.length - 1];
  const milo = final ? levelInfo(final.level) : null;
  const filming = Boolean(job);
  const waited = job && now > job.startedAt ? Math.floor((now - job.startedAt) / 1000) : 0;

  const makeFilm = async () => {
    if (!session || frames.length < 2 || filming) return;
    setFilmError(null);
    try {
      const response = await fetch("/api/film", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstImageUrl: frames[0].imageUrl, lastImageUrl: final.imageUrl }),
      });
      const data = (await response.json().catch(() => null)) as { requestId?: string; error?: string } | null;
      if (!response.ok || !data?.requestId) throw new Error(data?.error ?? "The film could not be started.");
      saveSession({ ...session, filmJob: { requestId: data.requestId, startedAt: Date.now() } });
    } catch (caught) {
      setFilmError(caught instanceof Error ? caught.message : "The film could not be started.");
    }
  };

  // Films need boards that fal can fetch. The scripted run uses local files, so it only gets the slideshow.
  const canFilm = frames.length >= 2 && frames.every((frame) => frame.imageUrl.startsWith("http"));

  return (
    <Page
      header={
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <Link href="/" className="text-xl font-semibold tracking-[-0.02em] text-ink no-underline">
              Milo
            </Link>
            <span className="text-[15px] text-muted">
              Revision sheet{session ? `, ${session.subject.toLowerCase()}` : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/sheets" className={pill.light}>
              Your revision sheets
            </Link>
            <Link href="/" className={pill.dark}>
              Explain something
            </Link>
          </div>
        </>
      }
    >
      <main className="flex flex-1 flex-wrap gap-3 rounded-panel bg-panel p-3">
        <section aria-label="Your drawing" className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0 text-[40px] leading-[1.08] font-medium tracking-[-0.035em]">
                {session?.topicTitle ?? "Revision sheet"}
              </h1>
              <p className="m-0 text-base text-muted">
                {final
                  ? "Your revision sheet, built in the order you explained it."
                  : "You have not finished a session in this browser yet."}
              </p>
            </div>
            {final && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPlaying(true)} disabled={frames.length < 2} className={`${pill.light} gap-2 disabled:opacity-40`}>
                  <svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14">
                    <path d="M1 1 L11 7 L1 13 Z" fill="currentColor" />
                  </svg>
                  Play slideshow
                </button>
                {canFilm && !session?.filmUrl && (
                  <button type="button" onClick={makeFilm} disabled={filming} className={`${pill.light} disabled:opacity-60`}>
                    {filming
                      ? `Making the film, ${Math.floor(waited / 60)}:${String(waited % 60).padStart(2, "0")} of about 4 minutes`
                      : "Make a film"}
                  </button>
                )}
                <a href={final.imageUrl} download="milo-revision-sheet.jpg" target="_blank" rel="noreferrer" className={pill.light}>
                  Save sheet
                </a>
              </div>
            )}
          </div>

          {filmError && (
            <p role="alert" className="m-0 animate-rise rounded-tile border border-line px-4 py-3 text-sm text-ink">
              {filmError}
            </p>
          )}

          <div className="flex min-h-80 flex-1 flex-col items-center justify-center gap-5 rounded-well bg-panel p-5">
            {final ? (
              <div className="w-full max-w-[820px] -rotate-[0.6deg] overflow-hidden rounded-[10px] shadow-paper">
                <img
                  src={final.imageUrl}
                  alt={`Your revision sheet for ${session?.topicTitle ?? "this topic"}`}
                  className="block aspect-video w-full bg-paper object-cover"
                />
              </div>
            ) : (
              <p className="m-0 max-w-[36ch] text-center text-[15px] text-muted">
                Explain a topic to Milo and the last drawing lands here.
              </p>
            )}
            {session?.filmUrl && (
              <figure className="m-0 flex w-full max-w-[820px] animate-rise flex-col gap-2">
                <video src={session.filmUrl} controls loop playsInline className="block aspect-video w-full rounded-[10px] bg-ink" />
                <figcaption className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
                  <span>Your first drawing turning into your last. Made by fal from the two boards.</span>
                  <a href={session.filmUrl} download="milo-film.mp4" target="_blank" rel="noreferrer" className={pill.light}>
                    Save film
                  </a>
                </figcaption>
              </figure>
            )}
          </div>
        </section>

        {final && milo && (
          <section aria-label="What you said" className="flex max-w-[420px] min-w-0 flex-[1_1_320px] flex-col gap-3 max-md:max-w-none">
            <div className="flex flex-col gap-4 rounded-card bg-card p-6">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">In your words</h2>
              <ol className="m-0 flex list-decimal flex-col gap-3 pl-[22px] text-[15px] leading-normal">
                {frames.map((frame) => (
                  <li key={frame.turn}>{frame.said}</li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-3.5 rounded-card bg-card p-6">
              <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">How you got here</h2>
              <div className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-x-3 gap-y-2.5 text-sm">
                {frames.map((frame, i) => {
                  const last = i === frames.length - 1;
                  return (
                    <div key={frame.turn} className="contents">
                      <span className="text-muted">Turn {frame.turn}</span>
                      <span className="h-1.5 rounded bg-panel">
                        <span className={`block h-full rounded ${last ? "bg-ink" : "bg-faint"}`} style={{ width: `${frame.level * 25}%` }} />
                      </span>
                      <span className={last ? "font-semibold" : ""}>{levelInfo(frame.level).label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {final.gaps.length > 0 && (
              <div className="flex flex-col gap-3 rounded-card bg-card p-6">
                <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]">Look these up next</h2>
                <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px] leading-normal">
                  {final.gaps.map((gap, i) => (
                    <li key={gap} className="flex items-center gap-2.5">
                      <span aria-hidden="true" className={`h-2 w-2 flex-none rounded-full ${i === 0 ? "bg-miss" : "bg-faint"}`} />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto flex items-center gap-4 rounded-card bg-card px-6 py-5">
              <div aria-hidden="true" className="h-[52px] w-[52px] flex-none overflow-hidden rounded-full bg-milo">
                <MiloPic level={final.level} />
              </div>
              <p className="m-0 text-[15px] leading-normal text-muted">
                {final.level === 4
                  ? "Milo is 18 now. He has stopped asking the dumb questions."
                  : `Milo is ${milo.miloAge} now. He still has questions.`}
              </p>
            </div>
          </section>
        )}
      </main>

      {playing && session && <Slideshow title={session.topicTitle} frames={frames} onClose={() => setPlaying(false)} />}
    </Page>
  );
}
