// POST /api/topic
// Turns a topic the student typed into something Milo can be taught: a title, Milo's opening
// question, and five key ideas to mark. Input: { title }. Output: a Topic (see src/lib/topics.ts).

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { NEW_TOPIC_PROMPT } from "@/lib/prompts";
import type { Topic } from "@/lib/topics";
import { NewTopicSchema } from "@/lib/turn";

const BodySchema = z.object({ title: z.string().trim().min(2).max(120) });

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "Type a topic of a few words." }, { status: 400 });
  }

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low", format: betaZodOutputFormat(NewTopicSchema) },
      system: NEW_TOPIC_PROMPT,
      messages: [{ role: "user", content: `The student typed: "${body.data.title}"` }],
    });

    const made = response.parsed_output;
    if (response.stop_reason === "refusal" || !made || !made.ok || made.keyIdeas.length < 3) {
      return Response.json({ error: "Milo can't take that one. Try a school topic, like how a volcano erupts." }, { status: 422 });
    }

    // Exactly three core ideas, whatever the model marked, so Basics always has the same size.
    const keyIdeas = made.keyIdeas.slice(0, 5).map((idea, i) => ({
      ...idea,
      core: i < 3,
      terms: (idea.terms ?? []).map((term) => term.trim().slice(0, 40)).filter(Boolean).slice(0, 8),
    }));
    const topic: Topic = {
      id: `custom-${Date.now().toString(36)}`,
      subject: made.subject,
      title: made.title,
      blurb: "",
      about: made.about,
      opener: made.opener,
      ready: true,
      keyIdeas,
    };
    return Response.json(topic);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Too many requests. Try again in a moment." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Anthropic API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    throw error;
  }
}
