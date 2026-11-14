// Milo v2's end page, the "Aha!" moment: the final sheet, a summary, and how the drawing grew.
// The topic and mode come from the address, see EndFromUrl.

import { Suspense } from "react";

import { EndFromUrl } from "@/components/v2/end-from-url";

export default function V2EndPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <EndFromUrl />
    </Suspense>
  );
}
