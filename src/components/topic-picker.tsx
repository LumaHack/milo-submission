"use client";

// Start screen: pick one of the four topics, or type your own.
// A typed topic goes to /api/topic, which works out the key ideas Milo should be taught.

import { useRouter } from "next/navigation";
import { useState } from "react";

import { pill } from "@/components/ui";
import { chooseTopic } from "@/lib/history";
import { TOPICS, type Topic } from "@/lib/topics";

const topicCard =
  "flex min-h-[190px] flex-[1_1_260px] flex-col justify-between gap-5 rounded-card bg-card p-6 text-left text-ink";

export function TopicPicker() {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [making, setMaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = (topic: Topic) => {
    chooseTopic(topic);
    router.push("/session");
  };

  const makeTopic = async () => {
    const title = typed.trim();
    if (title.length < 2 || making) return;
    setMaking(true);
    setError(null);
    try {
      const response = await fetch("/api/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json().catch(() => null)) as (Topic & { error?: string }) | null;
      if (!response.ok || !data || data.error) throw new Error(data?.error ?? "That topic could not be set up.");
      begin(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That topic could not be set up.");
      setMaking(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-[15px] font-semibold">Four topics to choose from</span>
        <button type="button" className={`${pill.light} !px-[18px] !text-sm`}>
          Give me four others
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-panel bg-panel p-3">
        <div className="flex flex-wrap gap-3">
          {TOPICS.map((topic) => {
            const body = (
              <>
                <span className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">{topic.title}</span>
                <span className="text-[15px] leading-normal text-muted">{topic.blurb}</span>
              </>
            );
            // Only ready topics open a session. The others look the same but go nowhere yet.
            return topic.ready ? (
              <button key={topic.id} type="button" onClick={() => begin(topic)} className={`press ${topicCard}`}>
                {body}
              </button>
            ) : (
              <div key={topic.id} className={topicCard}>
                {body}
              </div>
            );
          })}
        </div>

        <form
          className="flex flex-wrap items-center gap-2 rounded-card bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void makeTopic();
          }}
        >
          <label htmlFor="own-topic" className="px-2 text-[15px] font-semibold">
            Or your own
          </label>
          <input
            id="own-topic"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={making}
            placeholder="How a volcano erupts, the water cycle, how vaccines work…"
            className="min-h-11 min-w-0 flex-[1_1_260px] rounded-full border border-line bg-card px-4 text-[15px] text-ink placeholder:text-faint"
          />
          <button type="submit" disabled={making || typed.trim().length < 2} className={`${pill.dark} disabled:opacity-40`}>
            {making ? "Setting it up…" : "Explain this"}
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="m-0 animate-rise text-sm text-miss">
          {error}
        </p>
      )}
    </div>
  );
}
