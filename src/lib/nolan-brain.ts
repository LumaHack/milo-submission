// Server only. One structured Claude call, shared by the three routes under /api/nolan.
// Same settings as /api/turn: the Anthropic SDK, claude-opus-5-5, low effort, structured output.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

const DEFAULT_MODEL = "claude-opus-5-5";

export type Asked<T> = { ok: true; data: T; seconds: number } | { ok: false; status: number; error: string };

/**
 * Asks Claude for one object in the given shape.
 * `fast` runs the default model in fast mode, for calls a person is waiting on mid-conversation.
 */
export async function askClaude<S extends z.ZodType>(
  schema: S,
  system: string,
  user: string,
  options: { fast?: boolean } = {},
): Promise<Asked<z.infer<S>>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, status: 500, error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." };
  }
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const fast = Boolean(options.fast) && model === DEFAULT_MODEL && process.env.MILO_FAST !== "0";
  const client = new Anthropic();
  const started = Date.now();

  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // Low effort keeps the call quick. Thinking cannot be switched off on this model.
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      ...(fast ? { speed: "fast" as const } : {}),
      // If a safety filter declines the request, the API retries it on a fallback model
      // inside the same call. Only sent for the default model, which supports it.
      ...(model === DEFAULT_MODEL ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      system,
      messages: [{ role: "user", content: user }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, status: 502, error: "The model declined this request." };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return { ok: false, status: 502, error: "The model did not return a complete result." };
    }
    return { ok: true, data: response.parsed_output as z.infer<S>, seconds: (Date.now() - started) / 1000 };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, status: 500, error: "ANTHROPIC_API_KEY was rejected." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, status: 429, error: "Rate limited by Anthropic. Try again in a moment." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, status: 502, error: `Anthropic API error ${error.status}: ${error.message}` };
    }
    throw error;
  }
}
