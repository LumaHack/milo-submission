// GET /api/v2/dev/prompt?topic=ww2
// Development helper. Returns the brain's system prompt for a built-in topic as plain text, to read it
// or to check that a change to src/lib/v2/prompts.ts left a tested prompt exactly as it was.
// POST with a part of a course (src/lib/v2/part.ts) returns the prompt that part would get.

import { PartDefinitionSchema, partToTopic } from "@/lib/v2/part";
import { v2SystemPrompt } from "@/lib/v2/prompts";
import { getV2Topic } from "@/lib/v2/topics";

function devOnly(): Response | null {
  return process.env.NODE_ENV === "production"
    ? Response.json({ error: "This helper only runs in development." }, { status: 403 })
    : null;
}

export async function GET(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const topic = getV2Topic(new URL(request.url).searchParams.get("topic") ?? "cell");
  if (!topic || !topic.ready) return Response.json({ error: "No such ready topic." }, { status: 404 });
  return new Response(v2SystemPrompt(topic), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const part = PartDefinitionSchema.safeParse(await request.json().catch(() => null));
  if (!part.success) return Response.json({ error: "Not a valid part.", issues: part.error.issues }, { status: 400 });
  return new Response(v2SystemPrompt(partToTopic(part.data)), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
