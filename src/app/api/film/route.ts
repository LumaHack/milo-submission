// POST /api/film
// Makes a short video of the first board turning into the last one, with fal.
// Input: { firstImageUrl, lastImageUrl }. Output: { videoUrl, seconds }.
// This takes a while, so the revision sheet only asks for it when the student presses the button.

import { fal } from "@fal-ai/client";
import { z } from "zod";

const FILM_MODEL = "bytedance/seedance-2.0/fast/image-to-video";

const BodySchema = z.object({ firstImageUrl: z.url(), lastImageUrl: z.url() });

const PROMPT =
  "A sheet of paper seen from directly above, static camera. The rough crayon scribble redraws itself: " +
  "crayon and pencil lines appear stroke by stroke, shapes get coloured in, handwritten labels are written on, " +
  "until it becomes the finished, neat, labelled drawing. Only the drawing changes. No hands, no camera movement.";

export async function POST(request: Request) {
  if (!process.env.FAL_KEY) {
    return Response.json({ error: "FAL_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "A film needs the first and the last board." }, { status: 400 });
  }

  fal.config({ credentials: process.env.FAL_KEY });
  const started = Date.now();
  try {
    const result = await fal.subscribe(FILM_MODEL, {
      input: {
        prompt: PROMPT,
        image_url: body.data.firstImageUrl,
        end_image_url: body.data.lastImageUrl,
        resolution: "720p",
        duration: "5",
        aspect_ratio: "16:9",
        generate_audio: false,
      },
    });
    const videoUrl = (result.data as { video?: { url?: string } }).video?.url;
    if (!videoUrl) {
      return Response.json({ error: "fal returned no video." }, { status: 502 });
    }
    return Response.json({ videoUrl, seconds: (Date.now() - started) / 1000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `fal could not make the film: ${message}` }, { status: 502 });
  }
}
