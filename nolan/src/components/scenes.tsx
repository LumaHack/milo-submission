"use client";

// Scenes: each account as a diagram, for the investigator only. From design/Scenes.dc.html.
// fal draws them, and only after every interview has finished.

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import { caseLine } from "@/components/compare";
import { Dots, Empty, Page } from "@/components/ui";
import { finished, joinAnd, scenesAllowed, witnessLabel, type CaseFile, type Comparison } from "@/lib/nolan";
import { useOpenCase } from "@/lib/store";
import { useComparison, useScenes } from "@/lib/use-case-work";

export function ScenesScreen() {
  const file = useOpenCase();
  if (file === undefined) return null;
  if (!file) return <Empty title="No case is open" text="Open a case to see its scenes." />;
  if (!scenesAllowed(file)) {
    return (
      <Empty
        title="No scenes yet"
        text="No pictures exist until every interview is finished. Finish the interviews, or remove a witness who will not be interviewed."
        sub={caseLine(file)}
      />
    );
  }
  return <Scenes file={file} />;
}

function Scenes({ file }: { file: CaseFile }) {
  const compared = useComparison(file);
  const scenes = useScenes(file, compared.comparison);
  const error = compared.error ?? scenes.error;
  const retry = compared.error ? compared.retry : scenes.retry;

  return (
    <Page
      sub={caseLine(file)}
      footer="Scenes built with fal after the last interview ended. Circled details are the ones in dispute."
      actions={
        <>
          <Link href="/compare" className="pill">
            Back to the comparison
          </Link>
          <Link href="/report" className="pill dark" aria-disabled={!compared.comparison}>
            Add to the case report
          </Link>
        </>
      }
    >
      <div className="hero">
        <h1>Each account as a scene</h1>
        <p style={{ flexBasis: 400 }}>Reconstructions of what each witness said. They are not evidence, and a witness never sees one.</p>
      </div>

      {error && (
        <div role="alert" className="alert" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {error}
          <button type="button" className="pill small" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      <main style={{ flex: 1, display: "flex" }}>
        <SceneGrid file={file} comparison={compared.comparison} working={compared.busy || scenes.busy} />
      </main>
    </Page>
  );
}

/** The shared scene and one scene per witness. Used by the scenes screen and the case report. */
export function SceneGrid({ file, comparison, working }: { file: CaseFile; comparison: Comparison | null; working: boolean }) {
  const done = finished(file);
  return (
    <div className="panel">
      <section aria-label="Shared scene" className="card scene-card" style={{ flex: "1 1 380px" }}>
        <SceneFrame
          url={comparison?.sharedImageUrl ?? null}
          alt={comparison ? `Shared scene. ${comparison.sharedCaption}` : "Shared scene"}
          working={working}
          waiting={comparison ? "Nolan is drawing" : "Nolan is lining the accounts up"}
        />
        <div className="stack" style={{ gap: 4 }}>
          <h2 className="scene-title">What everyone agrees on</h2>
          <p className="small">{comparison?.sharedCaption ?? "Drawn once, only from the details the accounts share."}</p>
        </div>
      </section>

      <section aria-label="Accounts" className="scenes-row">
        {done.map((witness, i) => {
          const version = comparison?.versions.find((entry) => entry.witnessId === witness.id);
          const label = witnessLabel(file, witness.id);
          return (
            <article key={witness.id} className="card scene-card" style={{ animationDelay: `${i * 80}ms` }}>
              <SceneFrame
                url={comparison?.images[witness.id] ?? null}
                alt={version ? `${label}: ${version.caption}` : label}
                working={working}
                waiting={comparison?.sharedImageUrl ? "Nolan is drawing" : "Waiting for the shared scene"}
              />
              <div className="stack" style={{ gap: 4 }}>
                <h2 className="scene-title small-title">{label}</h2>
                <p className="small">{witness.where}</p>
                {version && <p className="small" style={{ color: "var(--ink)" }}>{version.caption}</p>}
              </div>
              {version && <Standing version={version} />}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Standing({ version }: { version: Comparison["versions"][number] }) {
  if (version.differsOn.length > 0) {
    return (
      <span className="status differ">
        <span aria-hidden="true" className="dot" />
        Differs on {joinAnd(version.differsOn)}
      </span>
    );
  }
  if (version.matches.length > 0) {
    return (
      <span className="status">
        <span aria-hidden="true" className="dot ok" />
        Matches {joinAnd(version.matches.map((label) => label.toLowerCase()))}
      </span>
    );
  }
  return (
    <span className="status">
      <span aria-hidden="true" className="dot" />
      Nothing disputed
    </span>
  );
}

/** One scene. Until the picture has arrived it says what is happening, never an empty box. */
function SceneFrame({ url, alt, working, waiting }: { url: string | null; alt: string; working: boolean; waiting: string }) {
  return (
    <div className="scene-frame">
      {url ? (
        <img key={url} src={url} alt={alt} />
      ) : (
        <div className="scene-wait">
          {working ? (
            <span className="scene-pill" aria-live="polite">
              {waiting} <Dots />
            </span>
          ) : (
            "This scene has not been drawn."
          )}
        </div>
      )}
    </div>
  );
}
