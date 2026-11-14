// POST /api/compare
// Lines the accounts up detail by detail and writes the scene instructions: one shared scene from
// what the accounts have in common, and one per witness that changes only what they said differently.
// Input: CompareRequest. Output: CompareResult. Both are defined in src/lib/nolan.ts.

import { askClaude } from "@/lib/brain";
import { CompareRequestSchema, CompareResultSchema, type CompareResult } from "@/lib/nolan";
import { COMPARE_PROMPT, asJson } from "@/lib/prompts";
import { investigatorOnly } from "@/lib/server-store";

export async function POST(request: Request) {
  const refused = investigatorOnly(request);
  if (refused) return refused;
  const body = CompareRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Comparing needs at least two finished interviews.", issues: body.error.issues }, { status: 400 });
  }
  const { title, details, witnesses } = body.data;

  // Fast mode: the investigator is watching the screen while this runs.
  const asked = await askClaude(CompareResultSchema, COMPARE_PROMPT, asJson({ incident: title, details, witnesses }), { fast: true });
  if (!asked.ok) return Response.json({ error: asked.error }, { status: asked.status });

  const made: CompareResult = asked.data;
  // One row per detail and one version per witness, in our order, whatever the model returned.
  const rows = details
    .map((detail) => made.rows.find((row) => row.detailId === detail.id))
    .filter((row) => row !== undefined)
    .map((row) => {
      // How many witnesses covered a detail is a fact we can count, so the count overrules the model.
      const covered = witnesses.filter((witness) => witness.facts.some((fact) => fact.detailId === row.detailId)).length;
      if (covered === 0) return { ...row, result: "none" as const, shared: "" };
      if (covered === 1) return { ...row, result: "alone" as const, shared: "" };
      if (row.result === "alone" || row.result === "none") return { ...row, result: "differ" as const, shared: "" };
      return row;
    });
  const versions = witnesses
    .map((witness) => made.versions.find((version) => version.witnessId === witness.id))
    .filter((version) => version !== undefined);
  if (rows.length !== details.length || versions.length !== witnesses.length || !made.sharedPrompt.trim()) {
    return Response.json({ error: "The comparison came back incomplete. Try again." }, { status: 502 });
  }

  return Response.json({ ...made, rows, versions, askNext: made.askNext.slice(0, 3), seconds: asked.seconds });
}
