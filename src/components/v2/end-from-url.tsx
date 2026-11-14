"use client";

// Reads which session the end page is about from its address, for example /v2/end?topic=ww2&mode=exam,
// and loads that session from this browser's storage. See src/lib/v2/target.ts.

import { useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { browser } from "react-dom";

import { loadSession } from "@/lib/v2/storage";
import { readTarget, voiceSuffix } from "@/lib/v2/target";

import { EndView } from "./end-view";
import { TopicMissing } from "./topic-missing";

export function EndFromUrl() {
  const params = useSearchParams();
  return <EndGate key={params.toString()} />;
}

function EndGate() {
  // The saved session lives in this browser's storage, so this only renders in the browser.
  use(browser("The saved session is kept in localStorage."));
  const params = useSearchParams();
  const [target] = useState(() => readTarget(params));
  const [saved] = useState(() => (target ? loadSession(target.topic.id, target.mode) : null));
  if (!target) return <TopicMissing />;
  return <EndView target={target} saved={saved} voice={voiceSuffix(params)} />;
}
