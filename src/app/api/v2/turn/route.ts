// POST /api/v2/turn
// Scores the explanation so far, picks the hint step, and writes Milo's next line and the next
// drawing instruction, in one Claude call. Input and output: src/lib/v2/contract.ts.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { V2TurnRequestSchema, V2TurnResultSchema, type V2TurnRequest, type V2TurnResult } from "@/lib/v2/contract";
import { topicFromRequest } from "@/lib/v2/part";
import { cleanMiloLine, v2SystemPrompt, v2UserMessage } from "@/lib/v2/prompts";
import type { V2Topic } from "@/lib/v2/topics";
import { claudeDollars, logUsage } from "@/lib/v2/usage";

const DEFAULT_MODEL = "claude-opus-5-5";
// Models that accept the server-side refusal fallback in its "default" form.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

/** The rules the code enforces, whatever the model returns. */
function enforce(result: V2TurnResult, topic: V2Topic, input: V2TurnRequest): V2TurnResult {
  const statusOf = (id: string) => result.ideas.find((idea) => idea.id === id)?.status ?? "missing";
  const ideas = topic.keyIdeas.map((idea) => ({ id: idea.id, status: statusOf(idea.id) }));
  // Milo never shrinks: a weaker turn leaves the level where it was.
  const level = input.previousLevel && result.level < input.previousLevel ? input.previousLevel : result.level;
  // Nothing new to draw means the board stays exactly as it is.
  const drawPrompt = !result.changed && input.previousDrawPrompt ? input.previousDrawPrompt : result.drawPrompt;
  return {
    ...result,
    ideas,
    level,
    hintStep: input.mode === "exam" ? 0 : result.hintStep,
    miloLine: cleanMiloLine(result.miloLine),
    drawPrompt,
  };
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const body = V2TurnRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match the v2 TurnRequest.", issues: body.error.issues }, { status: 400 });
  }
  const input = body.data;

  // A built-in topic by its id, or the part of the student's own course that came with the request.
  const topic = topicFromRequest(input.topicId, input.part);
  if (!topic) {
    return Response.json({ error: `Topic "${input.topicId}" is not ready yet.` }, { status: 404 });
  }

  // Development only: a timing test can try another model or fast mode on one request.
  const dev = process.env.NODE_ENV === "production" ? undefined : input.dev;
  const model = dev?.model || process.env.V2_ANTHROPIC_MODEL || DEFAULT_MODEL;
  // Fast mode is on by default: 2.4 s a turn instead of 6.8 s on our test (docs/V2.md, Timing).
  const fast = dev?.fast ?? process.env.V2_FAST_MODE !== "0";

  const client = new Anthropic();
  const started = Date.now();

  const ask = (withFastMode: boolean) =>
    client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // Low effort keeps the turn fast. Thinking cannot be switched off on Opus 5.5.
      output_config: { effort: "low", format: betaZodOutputFormat(V2TurnResultSchema) },
      ...(withFastMode ? { speed: "fast" as const } : {}),
      // If a safety filter declines the turn, the API retries it on a fallback model in the same call.
      ...(FALLBACK_MODELS.has(model)
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      system: [{ type: "text", text: v2SystemPrompt(topic), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: v2UserMessage(topic, input) }],
    });

  try {
    let usedFastMode = fast;
    let response;
    try {
      response = await ask(fast);
    } catch (error) {
      // Fast mode has its own rate limit. When it is full, answer at standard speed instead of failing.
      if (!fast || !(error instanceof Anthropic.RateLimitError)) throw error;
      usedFastMode = false;
      response = await ask(false);
    }

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "The model declined this turn." }, { status: 502 });
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return Response.json({ error: "The model did not return a complete result." }, { status: 502 });
    }

    const result = enforce(response.parsed_output, topic, input);
    logUsage({
      route: "turn",
      model: response.model,
      fast: usedFastMode,
      seconds: (Date.now() - started) / 1000,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
        cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
      },
      dollars: claudeDollars(response.model, response.usage, usedFastMode),
    });
    return Response.json({
      ...result,
      model: response.model,
      fast: usedFastMode,
      seconds: (Date.now() - started) / 1000,
      tokens: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    });
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
