// POST /api/nolan/compare
// Lines the accounts up question by question and writes the drawing instructions: one shared scene
// from what the accounts have in common, and one version per witness that changes only what they
// said differently. Input: CompareRequest. Output: CompareResult. Both are defined in src/lib/nolan.ts.

import { CompareRequestSchema, CompareResultSchema, MOOD_ID, type CompareResult } from "@/lib/nolan";
import { askClaude } from "@/lib/nolan-brain";
import { COMPARE_PROMPT, asJson } from "@/lib/nolan-prompts";

export async function POST(request: Request) {
  const body = CompareRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Comparing needs at least two accounts.", issues: body.error.issues }, { status: 400 });
  }
  const { moment, questions, witnesses } = body.data;

  // Fast mode: people are watching the screen while this runs. It took about 15 s at standard speed.
  const asked = await askClaude(CompareResultSchema, COMPARE_PROMPT, asJson({ moment, questions, witnesses }), { fast: true });
  if (!asked.ok) return Response.json({ error: asked.error }, { status: asked.status });

  const result: CompareResult = asked.data;
  // One row per compared question and one version per witness, in our order, whatever the model returned.
  const rows = questions
    .filter((question) => question.id !== MOOD_ID)
    .map((question) => result.rows.find((row) => row.questionId === question.id))
    .filter((row) => row !== undefined);
  const versions = witnesses
    .map((witness) => result.versions.find((version) => version.witnessId === witness.id))
    .filter((version) => version !== undefined);
  if (versions.length !== witnesses.length || !result.sharedPrompt.trim()) {
    return Response.json({ error: "The comparison came back incomplete. Try again." }, { status: 502 });
  }

  return Response.json({ ...result, rows, versions, seconds: asked.seconds });
}
