// Milo v2's live session. The topic and mode come from the address, see SessionFromUrl.

import { Suspense } from "react";

import { SessionFromUrl } from "@/components/v2/session-from-url";

export default function V2SessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <SessionFromUrl />
    </Suspense>
  );
}
