"use client";

// Compare accounts: where the witnesses agree and differ, detail by detail. From design/Compare.dc.html.

import Link from "next/link";

import { Dots, Empty, Page } from "@/components/ui";
import { finished, scenesAllowed, tally, witnessLabel, type CaseFile, type Comparison, type Result } from "@/lib/nolan";
import { useOpenCase } from "@/lib/store";
import { useComparison } from "@/lib/use-case-work";

const RESULT: Record<Result, { text: string; dot: string }> = {
  agree: { text: "They agree", dot: "ok" },
  same: { text: "Same, in different words", dot: "ok" },
  close: { text: "Close enough", dot: "ok" },
  differ: { text: "They differ", dot: "" },
  alone: { text: "Only one said", dot: "" },
  none: { text: "Nobody said", dot: "" },
};

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

export function caseLine(file: CaseFile): string {
  return `Case ${file.number}, ${file.title.charAt(0).toLowerCase()}${file.title.slice(1)}`;
}

export function CompareScreen() {
  const file = useOpenCase();
  if (file === undefined) return null;
  if (!file) return <Empty title="No case is open" text="Open a case to compare its accounts." />;
  if (finished(file).length < 2) {
    return <Empty title="Not enough accounts yet" text="Comparing needs at least two finished interviews." sub={caseLine(file)} />;
  }
  return <Compare file={file} />;
}

function Compare({ file }: { file: CaseFile }) {
  const { comparison, busy, error, retry } = useComparison(file);
  const done = finished(file);
  const counts = comparison ? tally(comparison.rows) : null;
  const word = (count: number) => NUMBER_WORDS[count] ?? String(count);

  return (
    <Page
      sub={caseLine(file)}
      actions={
        <Link href="/scenes" className="pill dark" aria-disabled={!scenesAllowed(file) || !comparison}>
          Open the scenes
        </Link>
      }
    >
      <div className="hero">
        <h1>Where the accounts agree and differ</h1>
        <p>
          {word(done.length)} witnesses, each interviewed alone. Nolan lines up what they said, detail by detail.
        </p>
      </div>

      <main className="panel">
        <section aria-label="Comparison" className="card" style={{ flex: "999 1 620px", padding: "12px 28px 24px" }}>
          <ComparisonTable file={file} comparison={comparison} />
          {busy && (
            <p className="status" style={{ paddingTop: 16 }} aria-live="polite">
              Nolan is lining the accounts up <Dots />
            </p>
          )}
          {error && (
            <div role="alert" className="alert" style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              {error}
              <button type="button" className="pill small" onClick={retry}>
                Try again
              </button>
            </div>
          )}
        </section>

        <section aria-label="Next steps" className="side-col" style={{ maxWidth: 420 }}>
          <div className="card stack" style={{ gap: 6 }}>
            <span className="big-number">{counts ? `${counts.agree} and ${counts.differ}` : "–"}</span>
            <span className="small">
              {counts
                ? `${word(counts.agree)} ${counts.agree === 1 ? "detail goes" : "details go"} into the shared scene. ${word(counts.differ)} ${counts.differ === 1 ? "is" : "are"} disputed.`
                : "Agreed details go into the shared scene. The rest are disputed."}
            </span>
          </div>
          <div className="card stack" style={{ flex: 1, padding: "24px 28px", gap: 14 }}>
            <h2 className="h3">Worth asking next</h2>
            {comparison ? (
              <ul className="list" style={{ gap: 12 }}>
                {comparison.askNext.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="small">Nolan suggests what to ask or check once the accounts are lined up.</p>
            )}
            <p className="tiny">These are suggestions from the accounts. The investigator decides.</p>
          </div>
        </section>
      </main>
    </Page>
  );
}

/** The table itself. Before the comparison is back it already shows what each witness said. */
export function ComparisonTable({ file, comparison }: { file: CaseFile; comparison: Comparison | null }) {
  const done = finished(file);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Detail</th>
            {done.map((witness) => (
              <th key={witness.id} scope="col">
                {witnessLabel(file, witness.id)}
              </th>
            ))}
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {file.details.map((detail, i) => {
            const row = comparison?.rows.find((entry) => entry.detailId === detail.id);
            const differs = row?.result === "differ";
            const result = row ? RESULT[row.result] : null;
            return (
              <tr key={detail.id} style={{ animationDelay: `${i * 60}ms` }}>
                <th scope="row">{detail.label}</th>
                {done.map((witness) => {
                  const fact = witness.facts.find((entry) => entry.detailId === detail.id);
                  return (
                    <td key={witness.id} className={fact ? (differs ? "differ" : "") : "blank"}>
                      {fact ? fact.value : "Did not say"}
                      {fact?.sure === "unsure" && <span className="tiny">sounded unsure</span>}
                    </td>
                  );
                })}
                <td>
                  {result && (
                    <span key={result.text} className={`status ${differs ? "differ" : ""}`}>
                      <span aria-hidden="true" className={`dot ${result.dot}`} />
                      {result.text}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
