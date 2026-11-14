"use client";

// Start screen: pick a subject, then one of four topics, or type your own.
// "How a cell works" is the tested preset and opens at once. Any other topic goes to /api/topic,
// which works out the key ideas Milo should be taught.

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { pill } from "@/components/ui";
import { chooseTopic } from "@/lib/history";
import { SUBJECTS, SUGGESTIONS, TOPICS, type Topic } from "@/lib/topics";

type Subject = (typeof SUBJECTS)[number];

const topicCard =
  "press flex min-h-[168px] flex-[1_1_260px] flex-col justify-between gap-5 rounded-card bg-card p-6 text-left text-ink disabled:opacity-50";

export function TopicPicker({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const [subject, setSubject] = useState<Subject>("Biology");
  const [page, setPage] = useState(0);
  const [typed, setTyped] = useState("");
  /** The title being set up, while /api/topic is working. */
  const [making, setMaking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestions = SUGGESTIONS[subject];
  const shown = suggestions.slice(page * 4, page * 4 + 4);

  const begin = (topic: Topic) => {
    chooseTopic(topic);
    router.push("/session");
  };

  const pick = async (title: string) => {
    const wanted = title.trim();
    if (wanted.length < 2 || making) return;
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

  return (
    <>
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

      {children}

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-[15px] font-semibold">Four topics to choose from</span>
          <button type="button" onClick={() => setPage((value) => (value + 1) % 2)} className={`${pill.light} !px-[18px] !text-sm`}>
            Give me four others
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-panel bg-panel p-3">
          <div key={`${subject}-${page}`} className="flex flex-wrap gap-3">
            {shown.map((topic, i) => (
              <button
                key={topic.title}
                type="button"
                onClick={() => void pick(topic.title)}
                disabled={making !== null && making !== topic.title}
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
            className="flex flex-wrap items-center gap-2 rounded-card bg-card p-3"
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
              disabled={making !== null}
              placeholder="How a volcano erupts, the water cycle, how the internet works…"
              className="min-h-11 min-w-0 flex-[1_1_260px] rounded-full border border-line bg-card px-4 text-[15px] text-ink placeholder:text-muted"
            />
            <button type="submit" disabled={making !== null || typed.trim().length < 2} className={`${pill.dark} disabled:opacity-40`}>
              {making !== null && making === typed.trim() ? "Setting it up…" : "Explain this"}
            </button>
          </form>
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
