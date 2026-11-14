// POST /api/turn
// Scores the explanation so far and writes the next drawing instruction.
// Input: TurnRequest. Output: TurnResult. Both are defined in src/lib/turn.ts.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { turnSystemPrompt, turnUserMessage } from "@/lib/prompts";
import { getTopic } from "@/lib/topics";
import { TurnRequestSchema, TurnResultSchema, type TurnResult } from "@/lib/turn";

const DEFAULT_MODEL = "claude-opus-5-5";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const body = TurnRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match TurnRequest.", issues: body.error.issues }, { status: 400 });
  }

  const topic = getTopic(body.data.topicId);
  if (!topic || !topic.ready) {
    return Response.json({ error: `Topic "${body.data.topicId}" has no key ideas yet.` }, { status: 404 });
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const client = new Anthropic();
  const started = Date.now();

  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // Low effort keeps the turn fast. Thinking cannot be switched off on this model.
      output_config: { effort: "low", format: betaZodOutputFormat(TurnResultSchema) },
      // If a safety filter declines the request, the API retries it on a fallback model
      // inside the same call. Only sent for the default model, which supports it.
      ...(model === DEFAULT_MODEL
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      system: turnSystemPrompt(),
      messages: [{ role: "user", content: turnUserMessage({ topic, ...body.data }) }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "The model declined this turn." }, { status: 502 });
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return Response.json({ error: "The model did not return a complete result." }, { status: 502 });
    }

    const result: TurnResult = response.parsed_output;

    // Milo never shrinks. A weaker turn leaves the level where it was.
    if (body.data.previousLevel && result.level < body.data.previousLevel) {
      result.level = body.data.previousLevel;
    }
    // Nothing new to draw means the board stays exactly as it is.
    if (!result.changed && body.data.previousDrawPrompt) {
      result.drawPrompt = body.data.previousDrawPrompt;
    }

    return Response.json({ ...result, model: response.model, seconds: (Date.now() - started) / 1000 });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "ANTHROPIC_API_KEY was rejected." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Rate limited by Anthropic. Try again in a moment." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Anthropic API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    throw error;
  }
}
