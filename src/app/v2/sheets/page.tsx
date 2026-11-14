// "Your revision sheets": the finished sheets saved in this browser. See SheetsView.

import { Suspense } from "react";

import { SheetsView } from "@/components/v2/sheets-view";

export default function V2SheetsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <SheetsView />
    </Suspense>
  );
}
