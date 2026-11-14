// Start screen: pick a subject and a topic. Port of design/claude-design/StartV3.dc.html.

import Link from "next/link";

import { DetailPicker } from "@/components/detail-picker";
import { TopicPicker } from "@/components/topic-picker";
import { MiloPic, Page, pill } from "@/components/ui";

export default function StartPage() {
  return (
    <Page
      gap="gap-6"
      header={
        <>
          <span className="text-xl font-semibold tracking-[-0.02em]">Milo</span>
          <Link href="/sheets" className={pill.light}>
            Your revision sheets
          </Link>
        </>
      }
    >
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-7 pt-3">
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

        <DetailPicker />

        <TopicPicker />
      </main>
    </Page>
  );
}
