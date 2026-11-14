// Development only: a running list of what each v2 route spent, so a night of testing can be added
// up afterwards (docs/OVERNIGHT.md). One JSON line per call in node_modules/.cache/milo/usage.jsonl,
// which git ignores. It never holds keys, prompts or anything a student said. Server only.

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type TokenCount = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** Dollars per million tokens for claude-opus-5-5, read on Sat 14 Nov 2026. Fast mode costs twice as much. */
const OPUS_PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };

/** What one Claude call cost, or null for a model whose prices are not listed here. */
export function claudeDollars(model: string, usage: TokenCount, fast: boolean): number | null {
  if (!model.startsWith("claude-opus-5-5")) return null;
  const dollars =
    (usage.input_tokens * OPUS_PRICE.input +
      usage.output_tokens * OPUS_PRICE.output +
      (usage.cache_creation_input_tokens ?? 0) * OPUS_PRICE.cacheWrite +
      (usage.cache_read_input_tokens ?? 0) * OPUS_PRICE.cacheRead) /
    1_000_000;
  return Number((fast ? dollars * 2 : dollars).toFixed(5));
}

export function logUsage(entry: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  const file = path.join(process.cwd(), "node_modules", ".cache", "milo", "usage.jsonl");
  void mkdir(path.dirname(file), { recursive: true })
    .then(() => appendFile(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`))
    .catch(() => {
      // The log is a convenience. A route never fails because of it.
    });
}
