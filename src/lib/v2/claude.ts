// One structured Claude call, the way every new v2 route makes it (docs/V2.md). Server only.
// The Anthropic SDK, structured output through output_config.format, stop_reason checked before
// the result is read, and a refusal retried on a fallback model inside the same call.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import { claudeDollars, logUsage } from "./usage";

export const DEFAULT_MODEL = "claude-opus-5-5";
// Models that accept the server-side refusal fallback in its "default" form.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** The model did not give a usable answer. `message` is safe to show to the student. */
export class ClaudeGaveNothing extends Error {}

export function v2Model(): string {
  return process.env.V2_ANTHROPIC_MODEL || DEFAULT_MODEL;
}

/** Fast mode is on unless V2_FAST_MODE=0. It answers about three times faster at twice the price. */
export function v2FastMode(): boolean {
  return process.env.V2_FAST_MODE !== "0";
}

export function fallbackParams(model: string) {
  return FALLBACK_MODELS.has(model) ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {};
}

export type ClaudeMeta = {
  model: string;
  fast: boolean;
  seconds: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  dollars: number | null;
};

export function metaFrom(
  response: { model: string; usage: Anthropic.Beta.BetaUsage },
  fast: boolean,
  started: number,
): ClaudeMeta {
  return {
    model: response.model,
    fast,
    seconds: (Date.now() - started) / 1000,
    tokens: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
    },
    dollars: claudeDollars(response.model, response.usage, fast),
  };
}

/**
 * Asks Claude for one object that matches `schema`. Throws ClaudeGaveNothing when the model declines
 * or runs out of room, and the SDK's own errors for everything else: see claudeErrorResponse.
 */
export async function askClaude<Schema extends z.ZodType>(options: {
  /** Names the call in the usage log, for example "summary". */
  route: string;
  schema: Schema;
  system: string;
  content: string | Anthropic.Beta.BetaContentBlockParam[];
  effort: Effort;
  /** Defaults to the v2 setting: fast unless V2_FAST_MODE=0. */
  fast?: boolean;
  maxTokens?: number;
}): Promise<{ output: z.infer<Schema>; meta: ClaudeMeta }> {
  const client = new Anthropic();
  const model = v2Model();
  const wantFast = options.fast ?? v2FastMode();
  const started = Date.now();

  const ask = (withFastMode: boolean) =>
    client.beta.messages.parse({
      model,
      max_tokens: options.maxTokens ?? 16000,
      // Thinking cannot be switched off on Opus 5.5. Effort is the only control.
      output_config: { effort: options.effort, format: betaZodOutputFormat(options.schema) },
      ...(withFastMode ? { speed: "fast" as const } : {}),
      ...fallbackParams(model),
      system: [{ type: "text", text: options.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: options.content }],
    });

  let usedFastMode = wantFast;
  let response;
  try {
    response = await ask(wantFast);
  } catch (error) {
    // Fast mode has its own rate limit. When it is full, answer at standard speed instead of failing.
    if (!wantFast || !(error instanceof Anthropic.RateLimitError)) throw error;
    usedFastMode = false;
    response = await ask(false);
  }

  const meta = metaFrom(response, usedFastMode, started);
  logUsage({ route: options.route, stop: response.stop_reason, ...meta });

  if (response.stop_reason === "refusal") throw new ClaudeGaveNothing("The model declined this request.");
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new ClaudeGaveNothing("The model did not return a complete result.");
  }
  return { output: response.parsed_output as z.infer<Schema>, meta };
}

/** Turns anything a Claude call threw into a plain JSON error the browser can show. */
export function claudeErrorResponse(error: unknown): Response {
  if (error instanceof ClaudeGaveNothing) {
    return Response.json({ error: error.message }, { status: 502 });
  }
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
