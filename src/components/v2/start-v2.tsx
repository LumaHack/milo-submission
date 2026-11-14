"use client";

// Milo v2's start screen: pick a subject, how Milo should help, then a topic.
// Same layout and tokens as Ali's start screen (design/claude-design/StartV3.dc.html), plus the mode choice.

import Link from "next/link";
import { useState } from "react";

import { MiloPic, Page, pill } from "@/components/ui";
import type { Mode } from "@/lib/v2/contract";
import { V2_SUBJECTS, V2_TOPICS, type Subject } from "@/lib/v2/topics";

const topicCard =
  "flex min-h-[190px] flex-[1_1_260px] flex-col justify-between gap-5 rounded-card bg-card p-6 text-ink no-underline";

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: "coach", label: "Coach me", description: "When you are stuck, Milo gives you a hint, one small step at a time." },
  { id: "exam", label: "Exam mode", description: "The night before the exam. Milo only asks questions and never helps." },
];

export function StartV2() {
  const [subject, setSubject] = useState<Subject>("Biology");
  const [mode, setMode] = useState<Mode>("coach");
  const topics = V2_TOPICS.filter((topic) => topic.subject === subject);
  const chosenMode = MODES.find((entry) => entry.id === mode) ?? MODES[0];

  return (
    <Page gap="gap-6" header={<span className="text-xl font-semibold tracking-[-0.02em]">Milo</span>}>
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-9 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
          <h1 className="m-0 flex-[1_1_520px] text-[68px] leading-[1.02] font-medium tracking-[-0.04em] max-sm:text-[44px]">
            What do you want to explain?
          </h1>
          <div className="flex max-w-[420px] flex-[1_1_320px] items-center gap-[18px]">
            <div aria-hidden="true" className="h-32 w-32 flex-none overflow-hidden rounded-full bg-milo">
              <MiloPic level={1} />
            </div>
            <p className="m-0 text-base leading-[1.55] text-muted">
              Explain it out loud, like you would to a friend who knows nothing. Milo draws what you say and grows up
              as you get it right.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-16 gap-y-7">
          <div className="flex flex-col gap-3.5">
            <span className="text-[15px] font-semibold">Subject</span>
            <div className="flex flex-wrap gap-2">
              {V2_SUBJECTS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  aria-pressed={entry === subject}
                  className={entry === subject ? pill.dark : pill.light}
                  onClick={() => setSubject(entry)}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>

          <div className="flex max-w-[460px] flex-col gap-3.5">
            <span className="text-[15px] font-semibold">How should Milo help?</span>
            <div className="flex flex-wrap gap-2">
              {MODES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={entry.id === mode}
                  className={entry.id === mode ? pill.dark : pill.light}
                  onClick={() => setMode(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <p className="m-0 text-[15px] leading-normal text-muted">{chosenMode.description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <span className="text-[15px] font-semibold">Four topics to choose from</span>
          <div className="flex flex-wrap gap-3 rounded-panel bg-panel p-3">
            {topics.map((topic) => {
              const body = (
                <>
                  <span className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">{topic.title}</span>
                  <span className="text-[15px] leading-normal text-muted">{topic.blurb}</span>
                </>
              );
              // Only ready topics open a session. The others look the same but go nowhere yet.
              return topic.ready ? (
                <Link
                  key={topic.id}
                  href={`/v2/session?topic=${topic.id}&mode=${mode}`}
                  className={`press ${topicCard}`}
                >
                  {body}
                </Link>
              ) : (
                <div key={topic.id} className={topicCard}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </Page>
  );
}
