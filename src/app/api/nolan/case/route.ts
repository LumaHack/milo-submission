// POST /api/nolan/case
// Opens a case: turns the moment someone typed into a title and the five questions every witness
// is asked. Input: { moment }. Output: { title, questions }.

import { z } from "zod";

import { MOOD_ID, NewCaseSchema, type Question } from "@/lib/nolan";
import { askClaude } from "@/lib/nolan-brain";
import { NEW_CASE_PROMPT } from "@/lib/nolan-prompts";

const BodySchema = z.object({ moment: z.string().trim().min(3).max(120) });

const MOOD_QUESTION: Question = { id: MOOD_ID, label: "Mood", ask: "How did it feel to be there?" };

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Describe the moment in a few words." }, { status: 400 });
  }

  const asked = await askClaude(NewCaseSchema, NEW_CASE_PROMPT, `Someone typed this moment: "${body.data.moment}"`);
  if (!asked.ok) return Response.json({ error: asked.error }, { status: asked.status });

  const made = asked.data;
  // Four questions about what was seen, whatever the model returned, then the mood question as we word it.
  const seen = made.questions.filter((question) => question.id !== MOOD_ID && question.ask.trim() && question.label.trim()).slice(0, 4);
  if (!made.ok || seen.length < 3) {
    return Response.json(
      { error: "Nolan can't take that one. Try a moment several people were at, like the opening ceremony." },
      { status: 422 },
    );
  }
  // Ids must be unique, because answers are filed by question id.
  const questions = seen.map((question, i) => ({ ...question, id: `q${i + 1}-${question.id}`.slice(0, 40) }));
  return Response.json({ title: made.title, questions: [...questions, MOOD_QUESTION] });
}
