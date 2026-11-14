// /api/film
// Makes a short video of the first board turning into the last one, with fal.
// A film takes about three and a half minutes, so it is a job the browser starts and then checks on.
//   POST { firstImageUrl, lastImageUrl }  starts it and returns { requestId }
//   GET  ?id=<requestId>                  returns { status: "working" } or { status: "done", videoUrl }

import { fal } from "@fal-ai/client";
import { z } from "zod";

const FILM_MODEL = "bytedance/seedance-2.0/fast/image-to-video";

const BodySchema = z.object({ firstImageUrl: z.url(), lastImageUrl: z.url() });

const PROMPT =
  "A sheet of paper seen from directly above, static camera. The rough crayon scribble redraws itself: " +
  "crayon and pencil lines appear stroke by stroke, shapes get coloured in, handwritten labels are written on, " +
  "until it becomes the finished, neat, labelled drawing. Only the drawing changes. No hands, no camera movement.";

function configure(): Response | null {
  if (!process.env.FAL_KEY) {
    return Response.json({ error: "FAL_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  fal.config({ credentials: process.env.FAL_KEY });
  return null;
}

export async function POST(request: Request) {
  const missing = configure();
  if (missing) return missing;

  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "A film needs the first and the last board." }, { status: 400 });
  }

  try {
    const job = await fal.queue.submit(FILM_MODEL, {
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
    return Response.json({ requestId: job.request_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `fal could not start the film: ${message}` }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const missing = configure();
  if (missing) return missing;

  const requestId = new URL(request.url).searchParams.get("id");
  if (!requestId) {
    return Response.json({ error: "Which film? Pass ?id=." }, { status: 400 });
  }

  try {
    const status = await fal.queue.status(FILM_MODEL, { requestId });
    if (status.status !== "COMPLETED") {
      return Response.json({ status: "working" });
    }
    const result = await fal.queue.result(FILM_MODEL, { requestId });
    const videoUrl = (result.data as { video?: { url?: string } }).video?.url;
    if (!videoUrl) {
      return Response.json({ error: "fal finished but returned no video." }, { status: 502 });
    }
    return Response.json({ status: "done", videoUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `fal could not make the film: ${message}` }, { status: 502 });
  }
}
