"use client";

// The case report: what each witness said, where the accounts differ, and the scenes, on one page to print.

import Link from "next/link";

import { ComparisonTable, caseLine } from "@/components/compare";
import { Notes } from "@/components/interview";
import { SceneGrid } from "@/components/scenes";
import { Empty, Page } from "@/components/ui";
import { finished, tally, witnessLabel, type CaseFile } from "@/lib/nolan";
import { useOpenCase } from "@/lib/store";
import { useComparison, useScenes } from "@/lib/use-case-work";

export function ReportScreen() {
  const file = useOpenCase();
  if (file === undefined) return null;
  if (!file) return <Empty title="No case is open" text="Open a case to build its report." />;
  if (finished(file).length < 2) {
    return <Empty title="Nothing to report yet" text="A report needs at least two finished interviews." sub={caseLine(file)} />;
  }
  return <Report file={file} />;
}

function Report({ file }: { file: CaseFile }) {
  const { comparison, busy } = useComparison(file);
  const scenes = useScenes(file, comparison);
  const done = finished(file);

  return (
    <Page
      sub={caseLine(file)}
      footer="Notes and comparison by Claude from interviews held with ElevenLabs. Scenes drawn by fal."
      actions={
        <>
          <Link href="/scenes" className="pill">
            Back to the scenes
          </Link>
          <button type="button" className="pill dark" onClick={() => window.print()}>
            Print the report
          </button>
        </>
      }
    >
      <div className="hero">
        <h1>Case report</h1>
        <p>
          {file.title}. {comparison ? tally(comparison.rows).line : ""} Scenes are reconstructions of what was said. They are not evidence.
        </p>
      </div>

      <main className="stack" style={{ gap: 16 }}>
      <div className="panel">
        <section aria-label="Comparison" className="card" style={{ flex: "1 1 100%", padding: "12px 28px 24px" }}>
          <ComparisonTable file={file} comparison={comparison} />
        </section>
      </div>

      <SceneGrid file={file} comparison={comparison} working={busy || scenes.busy} />

      <div className="panel">
        {done.map((witness) => (
          <section key={witness.id} aria-label={witnessLabel(file, witness.id)} className="card stack" style={{ flex: "1 1 300px", padding: 24, gap: 14 }}>
            <div className="stack" style={{ gap: 2 }}>
              <h2 className="h3">{witnessLabel(file, witness.id)}</h2>
              <span className="meta">{witness.where}</span>
            </div>
            <Notes details={file.details} facts={witness.facts} />
          </section>
        ))}
        {comparison && (
          <section aria-label="Worth asking next" className="card stack" style={{ flex: "1 1 300px", padding: "24px 28px", gap: 14 }}>
            <h2 className="h3">Worth asking next</h2>
            <ul className="list" style={{ gap: 12 }}>
              {comparison.askNext.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="tiny">These are suggestions from the accounts. The investigator decides.</p>
          </section>
        )}
      </div>
      </main>
    </Page>
  );
}
