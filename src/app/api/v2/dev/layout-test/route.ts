// GET /api/v2/dev/layout-test?kind=process
// Development helper. Draws a layout's four example instructions in order with fal, each one editing
// the board before it, the way a session does, and returns the pictures and how long each took.
// Look at every picture before trusting a layout: see "Board layouts" in docs/V2.md.
// To redraw one level only, on top of a board you already have: &level=4&previous=<that board's url>.

import type { DrawResult } from "@/lib/turn";
import { LAYOUTS, LayoutKindSchema } from "@/lib/v2/layouts";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "This helper only runs in development." }, { status: 403 });
  }
  const kind = LayoutKindSchema.safeParse(new URL(request.url).searchParams.get("kind"));
  if (!kind.success) {
    return Response.json({ error: `kind must be one of: ${LayoutKindSchema.options.join(", ")}.` }, { status: 400 });
  }

  const layout = LAYOUTS[kind.data];
  const params = new URL(request.url).searchParams;
  const onlyLevel = Number(params.get("level")) || null;
  const boards: { level: number; said: string; imageUrl: string; seconds: number }[] = [];
  let previousImageUrl: string | null = onlyLevel ? params.get("previous") : null;
  for (const example of layout.examples) {
    if (onlyLevel && example.level !== onlyLevel) continue;
    const response = await fetch(new URL("/api/v2/draw", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: example.drawPrompt, previousImageUrl }),
    });
    const drawn = (await response.json()) as DrawResult & { error?: string };
    if (!response.ok) {
      return Response.json({ kind: kind.data, boards, failedAt: example.level, error: drawn.error }, { status: 502 });
    }
    boards.push({ level: example.level, said: example.said, imageUrl: drawn.imageUrl, seconds: drawn.seconds });
    previousImageUrl = drawn.imageUrl;
  }
  return Response.json({ kind: kind.data, sample: layout.sample, boards });
}
