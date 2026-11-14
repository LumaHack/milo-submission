// Shown when a page's address names a topic that is not ready, or a part of a course that is no
// longer in this browser (another browser, or the course was removed).

import Link from "next/link";

import { Page, pill } from "@/components/ui";

export function TopicMissing() {
  return (
    <Page header={<span className="text-xl font-semibold tracking-[-0.02em]">Milo</span>}>
      <main className="flex flex-1 items-start justify-center rounded-panel bg-panel p-3">
        <section className="flex w-full max-w-[720px] flex-col gap-5 rounded-card bg-card p-7 max-sm:p-5">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-[28px] leading-[1.15] font-medium tracking-[-0.03em]">Milo can&apos;t find this topic</h1>
            <p className="m-0 text-base leading-normal text-muted">
              It is not ready yet, or it belongs to a course that is not saved in this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/v2" className={pill.dark}>
              Pick another topic
            </Link>
          </div>
        </section>
      </main>
    </Page>
  );
}
