// POST /api/case
// Opens a case: turns the incident an investigator typed into a title, Nolan's opening question
// and the five details every account is checked for. Input: { incident }. Output: { title, opener, details }.

import { z } from "zod";

import { askClaude } from "@/lib/brain";
import { NewCaseSchema } from "@/lib/nolan";
import { NEW_CASE_PROMPT } from "@/lib/prompts";
import { investigatorOnly } from "@/lib/server-store";

const BodySchema = z.object({ incident: z.string().trim().min(3).max(160) });

export async function POST(request: Request) {
  const refused = investigatorOnly(request);
  if (refused) return refused;
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Say what happened in a few words." }, { status: 400 });
  }

  const asked = await askClaude(NewCaseSchema, NEW_CASE_PROMPT, `The investigator typed: "${body.data.incident}"`);
  if (!asked.ok) return Response.json({ error: asked.error }, { status: asked.status });

  const made = asked.data;
  const details = made.details.filter((detail) => detail.ask.trim() && detail.label.trim()).slice(0, 5);
  if (!made.ok || details.length < 3 || !made.opener.trim()) {
    return Response.json(
      { error: "Nolan can't take that one. Describe an incident people saw, like a bike theft outside the library." },
      { status: 422 },
    );
  }
  // Ids must be unique, because notes are filed by detail id.
  return Response.json({
    title: made.title,
    opener: made.opener,
    details: details.map((detail, i) => ({ ...detail, id: `d${i + 1}-${detail.id}`.slice(0, 40) })),
  });
}
