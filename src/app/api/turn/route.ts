// POST /api/turn
// Scores the explanation so far and writes the next drawing instruction.
// Input: TurnRequest. Output: TurnResult. Both are defined in src/lib/turn.ts.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { checkLines } from "@/lib/line-check";
import { turnSystemPrompt, turnUserMessage } from "@/lib/prompts";
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

  // In development a model can be tried with ?model=..., to compare speed without touching .env.local.
  const trial = process.env.NODE_ENV !== "production" ? new URL(request.url).searchParams.get("model") : null;
  const model = trial || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  // Fast mode: the same model at a higher output speed, for a higher price. On by default because the
  // student is waiting on this call. Set MILO_FAST=0 to turn it off.
  const fast = model === DEFAULT_MODEL && process.env.MILO_FAST !== "0" && new URL(request.url).searchParams.get("speed") !== "standard";
  const client = new Anthropic();
  const started = Date.now();

  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // Low effort keeps the turn fast. Thinking cannot be switched off on this model.
      output_config: { effort: "low", format: betaZodOutputFormat(TurnResultSchema) },
      ...(fast ? { speed: "fast" as const } : {}),
      // If a safety filter declines the request, the API retries it on a fallback model
      // inside the same call. Only sent for the default model, which supports it.
      ...(model === DEFAULT_MODEL
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      // The instructions are the same on every turn, so they are cached: later turns read them back
      // instead of paying for them again. There are two versions, with and without notes.
      system: [
        { type: "text", text: turnSystemPrompt({ notes: Boolean(body.data.topic.notes) }), cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: turnUserMessage(body.data),
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "The model declined this turn." }, { status: 502 });
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return Response.json({ error: "The model did not return a complete result." }, { status: 502 });
    }

    const result: TurnResult = response.parsed_output;

    // An off-topic turn is not part of the explanation: nothing is flagged, drawn, hinted or wrapped up.
    if (result.offTopic) {
      result.changed = false;
      result.wrongClaims = [];
      result.help = false;
      result.stuck = false;
    }

    // Milo may not say a word that gives the answer away before the student has said it.
    result.checked = checkLines(result, body.data);

    // Milo never shrinks. A weaker turn leaves the level where it was.
    if (body.data.previousLevel && result.level < body.data.previousLevel) {
      result.level = body.data.previousLevel;
    }
    // Nothing new to draw means the board stays exactly as it is.
    if (!result.changed && body.data.previousDrawPrompt) {
      result.drawPrompt = body.data.previousDrawPrompt;
    }

    const usage = {
      input: response.usage.input_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
      output: response.usage.output_tokens,
    };
    return Response.json({ ...result, model: response.model, seconds: (Date.now() - started) / 1000, usage });
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
