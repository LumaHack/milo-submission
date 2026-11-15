// POST /api/draw
// Draws one scene with fal. The shared scene is a new image. Each witness's scene is an edit of it,
// so every scene is the same place seen from the same spot.
// Input: { prompt, previousImageUrl }. Output: { imageUrl, endpoint, seconds }.
// The fal key stays on the server. The browser never sees it.

import { fal } from "@fal-ai/client";
import { z } from "zod";
import { investigatorOnly } from "@/lib/server-store";

// The same two models Milo measured on Sat 14 Nov: about 5 s for a new image, 7 to 9 s for an edit.
const NEW_IMAGE = "google/nano-banana-2-lite";
const EDIT_IMAGE = "google/nano-banana-2-lite/edit";

const BodySchema = z.object({ prompt: z.string().min(1).max(2000), previousImageUrl: z.url().nullable() });

export async function POST(request: Request) {
  const refused = investigatorOnly(request);
  if (refused) return refused;
  if (!process.env.FAL_KEY) {
    return Response.json({ error: "FAL_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "A scene needs a drawing instruction." }, { status: 400 });
  }

  const { prompt, previousImageUrl } = body.data;
  const endpoint = previousImageUrl ? EDIT_IMAGE : NEW_IMAGE;
  fal.config({ credentials: process.env.FAL_KEY });
  const started = Date.now();

  try {
    const result = await fal.subscribe(endpoint, {
      input: {
        prompt,
        aspect_ratio: "16:9",
        output_format: "jpeg",
        ...(previousImageUrl ? { image_urls: [previousImageUrl] } : {}),
      },
    });
    const imageUrl = (result.data as { images?: { url?: string }[] }).images?.[0]?.url;
    if (!imageUrl) {
      return Response.json({ error: `fal returned no image from ${endpoint}.` }, { status: 502 });
    }
    return Response.json({ imageUrl, endpoint, seconds: (Date.now() - started) / 1000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `fal failed on ${endpoint}: ${message}` }, { status: 502 });
  }
}
