// POST /api/nolan/extract
// Keeps Nolan's notepad: reads the interview so far and returns the facts this witness has stated,
// how sure they sounded, their mood, and whether an answer clashes with an earlier account.
// Input: ExtractRequest. Output: ExtractResult. Both are defined in src/lib/nolan.ts.

import { ExtractRequestSchema, ExtractResultSchema, MOOD_ID, type ExtractResult } from "@/lib/nolan";
import { askClaude } from "@/lib/nolan-brain";
import { EXTRACT_PROMPT, asJson } from "@/lib/nolan-prompts";

export async function POST(request: Request) {
  const body = ExtractRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match ExtractRequest.", issues: body.error.issues }, { status: 400 });
  }
  const { moment, questions, turns, others } = body.data;

  // The witness is mid-conversation, so this call runs in fast mode like Milo's turn.
  const asked = await askClaude(
    ExtractResultSchema,
    EXTRACT_PROMPT,
    asJson({ moment, questions, interviewSoFar: turns, earlierWitnessesAnswered: others }),
    { fast: true },
  );
  if (!asked.ok) return Response.json({ error: asked.error }, { status: asked.status });

  const known = new Set(questions.map((question) => question.id));
  const result: ExtractResult = asked.data;
  // Only facts for real questions, one per question, never one for the mood question.
  const seen = new Set<string>();
  result.facts = result.facts.filter((fact) => {
    if (!known.has(fact.questionId) || fact.questionId === MOOD_ID || seen.has(fact.questionId) || !fact.value.trim()) return false;
    seen.add(fact.questionId);
    return true;
  });
  // A clash needs an earlier answer to clash with, and an answer from this witness.
  const clash = result.clashQuestionId;
  if (!clash || !seen.has(clash) || !others.some((entry) => entry.questionId === clash)) {
    result.clashQuestionId = null;
  }
  result.mood = result.mood.trim().toLowerCase();

  return Response.json({ ...result, seconds: asked.seconds });
}
