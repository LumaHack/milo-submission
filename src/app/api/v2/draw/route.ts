// POST /api/v2/draw
// Draws the board with fal. The fast model draws every live board, so a turn stays quick.
// The careful model redraws only the last board, once, for the polished sheet on the end page.
// Input: src/lib/v2/contract.ts. Output: DrawResult from src/lib/turn.ts. The fal key stays on the server.

import { fal } from "@fal-ai/client";

import { FAL_CAREFUL_EDIT, FAL_FAST_EDIT, FAL_FIRST_BOARD } from "@/lib/levels";
import type { DrawResult } from "@/lib/turn";
import { V2DrawRequestSchema } from "@/lib/v2/contract";

type FalImages = { images?: { url?: string }[] };

export async function POST(request: Request) {
  if (!process.env.FAL_KEY) {
    return Response.json({ error: "FAL_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const body = V2DrawRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match the v2 DrawRequest.", issues: body.error.issues }, { status: 400 });
  }

  const { prompt, previousImageUrl, final } = body.data;
  if (final && !previousImageUrl) {
    return Response.json({ error: "The final sheet needs a board to redraw." }, { status: 400 });
  }
  const endpoint = !previousImageUrl ? FAL_FIRST_BOARD : final ? FAL_CAREFUL_EDIT : FAL_FAST_EDIT;
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
