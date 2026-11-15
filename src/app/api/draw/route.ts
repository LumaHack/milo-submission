// POST /api/draw
// Draws the board with fal. The first board is a new image, every later one edits the board before it.
// Input: DrawRequest. Output: DrawResult. Both are defined in src/lib/turn.ts.
// The fal key stays on the server. The browser never sees it.

import { fal } from "@fal-ai/client";

import { falEndpointFor } from "@/lib/levels";
import { DrawRequestSchema, type DrawResult } from "@/lib/turn";

type FalImages = { images?: { url?: string }[] };

export async function POST(request: Request) {
  if (!process.env.FAL_KEY) {
    return Response.json({ error: "FAL_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const body = DrawRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match DrawRequest.", issues: body.error.issues }, { status: 400 });
  }

  const { prompt, previousImageUrl, level, detail } = body.data;
  const endpoint = falEndpointFor(level, previousImageUrl !== null, detail !== "basics");
  const input = {
    prompt,
    aspect_ratio: "16:9",
    output_format: "jpeg",
    ...(previousImageUrl ? { image_urls: [previousImageUrl] } : {}),
  };

  fal.config({ credentials: process.env.FAL_KEY });
  const started = Date.now();

  try {
    const result = await fal.subscribe(endpoint, { input });
    const imageUrl = (result.data as FalImages).images?.[0]?.url;
    if (!imageUrl) {
      return Response.json({ error: `fal returned no image from ${endpoint}.` }, { status: 502 });
    }
    const drawn: DrawResult = { imageUrl, endpoint, seconds: (Date.now() - started) / 1000 };
    return Response.json(drawn);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `fal failed on ${endpoint}: ${message}` }, { status: 502 });
  }
}
