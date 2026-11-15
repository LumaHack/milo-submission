// POST /api/turn
// Scores the explanation so far and writes the next drawing instruction.
// Input: TurnRequest. Output: two lines of JSON. First { part: "line", ...TurnLine } as soon as Milo's
// reply is written, then { part: "full", ...TurnResult }. { part: "error", error } replaces either.
// The shapes are defined in src/lib/turn.ts.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { turnSystemPrompt, turnUserMessage } from "@/lib/prompts";
import { TurnLineSchema, TurnRequestSchema, TurnResultSchema, type TurnResult } from "@/lib/turn";

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

  // Milo never shrinks. A weaker turn leaves the level where it was.
  const keepLevel = <T extends { level: TurnResult["level"] }>(part: T): T =>
    body.data.previousLevel && part.level < body.data.previousLevel ? { ...part, level: body.data.previousLevel } : part;

  try {
    const stream = client.beta.messages.stream({
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
      system: turnSystemPrompt(),
      messages: [
        {
          role: "user",
          content: turnUserMessage(body.data),
        },
      ],
    });

    // The answer goes out in two lines of JSON. The first is everything Milo needs to reply (the marks
    // and his line), sent the moment the model has written it. The second is the whole result, with
    // the drawing instruction. His reply must not wait for the drawing instruction to be written.
    const encoder = new TextEncoder();
    const out = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
        let early = false;
        stream.on("text", (_delta, snapshot) => {
          if (early) return;
          // The fields arrive in the order of the schema. Once "said" starts, the marks and the line are complete.
          const cut = snapshot.search(/,\s*"said"\s*:/);
          if (cut < 0) return;
          try {
            const part = TurnLineSchema.parse(JSON.parse(`${snapshot.slice(0, cut)}}`));
            early = true;
            send({ part: "line", ...keepLevel(part), seconds: (Date.now() - started) / 1000 });
          } catch {
            // Not a complete object yet. The full result still follows.
          }
        });
        try {
          const message = await stream.finalMessage();
          const text = message.content.find((block) => block.type === "text")?.text ?? "";
          const parsed = message.stop_reason === "refusal" || message.stop_reason === "max_tokens" ? null : TurnResultSchema.safeParse(JSON.parse(text));
          if (!parsed?.success) {
            send({ part: "error", error: message.stop_reason === "refusal" ? "The model declined this turn." : "The model did not return a complete result." });
          } else {
            const result = keepLevel(parsed.data);
            // Nothing new to draw means the board stays exactly as it is.
            if (!result.changed && body.data.previousDrawPrompt) result.drawPrompt = body.data.previousDrawPrompt;
            send({ part: "full", ...result, model: message.model, seconds: (Date.now() - started) / 1000 });
          }
        } catch (error) {
          const reason =
            error instanceof Anthropic.AuthenticationError
              ? "ANTHROPIC_API_KEY was rejected."
              : error instanceof Anthropic.RateLimitError
                ? "Rate limited by Anthropic. Try again in a moment."
                : error instanceof Anthropic.APIError
                  ? `Anthropic API error ${error.status}: ${error.message}`
                  : "The model call failed.";
          send({ part: "error", error: reason });
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });
    return new Response(out, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
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
