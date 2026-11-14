// POST /api/extract
// Keeps Nolan's notes: reads the interview so far and returns what this witness has stated,
// detail by detail, with how sure they sounded and what they took back.
// Input: ExtractRequest. Output: ExtractResult. Both are defined in src/lib/nolan.ts.

import { askClaude } from "@/lib/brain";
import { ExtractRequestSchema, ExtractResultSchema, type ExtractResult } from "@/lib/nolan";
import { EXTRACT_PROMPT, asJson } from "@/lib/prompts";

export async function POST(request: Request) {
  const body = ExtractRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match ExtractRequest.", issues: body.error.issues }, { status: 400 });
  }
  const { title, details, turns } = body.data;

  // The witness is mid-conversation and watching the notes, so this call runs in fast mode.
  const asked = await askClaude(ExtractResultSchema, EXTRACT_PROMPT, asJson({ incident: title, details, interviewSoFar: turns }), {
    fast: true,
  });
  if (!asked.ok) return Response.json({ error: asked.error }, { status: asked.status });

  // Only notes for real details, one per detail, in the order of the details.
  const result: ExtractResult = {
    facts: details
      .map((detail) => asked.data.facts.find((fact) => fact.detailId === detail.id && fact.value.trim()))
      .filter((fact) => fact !== undefined),
  };
  return Response.json({ ...result, seconds: asked.seconds });
}
