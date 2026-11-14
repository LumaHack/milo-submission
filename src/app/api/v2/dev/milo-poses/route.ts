// POST /api/v2/dev/milo-poses
// Development helper. Draws Milo v2's poses once with fal and saves them as cut-outs in public/milo-v2.
// For each of Milo's four ages (public/milo/stage-N.jpg) and each pose, fal's careful image model redraws
// the same boy in that pose, then fal's background-removal model cuts him out as a transparent PNG.
//
//   curl -X POST http://localhost:3000/api/v2/dev/milo-poses
//   curl -X POST http://localhost:3000/api/v2/dev/milo-poses -d '{"stages":[2],"poses":["point"]}'

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { fal } from "@fal-ai/client";

import { MILO_POSES, type MiloPose } from "@/lib/v2/milo-poses";

const EDIT = "fal-ai/nano-banana-pro/edit";
const CUT_OUT = "fal-ai/birefnet/v2";

const SAME =
  "Same character as in the picture: same face, same age, same messy curly brown hair, same navy blue hoodie, " +
  "and the same glasses, cap or pencil if he has them. Same 3D animated film style and soft studio lighting. " +
  "Show him from the waist up, centred, with empty space around him. Plain flat white background. No text.";

const POSE_PROMPT: Record<MiloPose, string> = {
  listen:
    "He is listening closely, facing the viewer, head slightly tilted, eyebrows raised, with a warm, curious smile. His whole upper body fits inside the picture with space on both sides.",
  think: "He is thinking hard, looking up and to the side, one finger on his chin, lips pursed.",
  point:
    "He turns a little and points with one arm stretched out toward the left edge of the picture, as if pointing at a whiteboard beside him, with a curious, questioning face.",
  talk: "He is talking, mouth open mid-word, one hand raised palm up as if asking a question, friendly and puzzled.",
  cheer: "He is cheering with both fists raised in the air and a huge happy smile.",
};

type FalImages = { images?: { url?: string }[] };
type FalImage = { image?: { url?: string } };

async function makePose(stage: number, pose: MiloPose, sourceUrl: string, outDir: string) {
  const started = Date.now();
  const edited = await fal.subscribe(EDIT, {
    input: {
      prompt: `${POSE_PROMPT[pose]} ${SAME}`,
      image_urls: [sourceUrl],
      aspect_ratio: "3:4",
      output_format: "png",
    },
  });
  const editedUrl = (edited.data as FalImages).images?.[0]?.url;
  if (!editedUrl) throw new Error(`no image from ${EDIT}`);

  const cut = await fal.subscribe(CUT_OUT, {
    input: { image_url: editedUrl, model: "Matting", output_format: "png", refine_foreground: true },
  });
  const cutUrl = (cut.data as FalImage).image?.url;
  if (!cutUrl) throw new Error(`no image from ${CUT_OUT}`);

  const response = await fetch(cutUrl);
  if (!response.ok) throw new Error(`could not download the cut-out (${response.status})`);
  const file = `${pose}-${stage}.png`;
  await writeFile(path.join(outDir, file), Buffer.from(await response.arrayBuffer()));
  return { file, editedUrl, seconds: (Date.now() - started) / 1000 };
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "This helper only runs in development." }, { status: 403 });
  }
  if (!process.env.FAL_KEY) {
    return Response.json({ error: "FAL_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  fal.config({ credentials: process.env.FAL_KEY });

  const body = (await request.json().catch(() => null)) as { stages?: number[]; poses?: MiloPose[] } | null;
  const stages = (body?.stages ?? [1, 2, 3, 4]).filter((stage) => stage >= 1 && stage <= 4);
  const poses = (body?.poses ?? [...MILO_POSES]).filter((pose) => MILO_POSES.includes(pose));

  const outDir = path.join(process.cwd(), "public", "milo-v2");
  await mkdir(outDir, { recursive: true });

  // Upload each age's picture once, so fal can edit it.
  const sources = new Map<number, string>();
  for (const stage of stages) {
    const bytes = await readFile(path.join(process.cwd(), "public", "milo", `stage-${stage}.jpg`));
    sources.set(stage, await fal.storage.upload(new Blob([bytes], { type: "image/jpeg" })));
  }

  // A few at a time, so fal's queue is not flooded.
  const jobs = stages.flatMap((stage) => poses.map((pose) => ({ stage, pose })));
  const results: { stage: number; pose: MiloPose; file?: string; editedUrl?: string; seconds?: number; error?: string }[] = [];
  const queue = [...jobs];
  const workers = Array.from({ length: 5 }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        results.push({ ...job, ...(await makePose(job.stage, job.pose, sources.get(job.stage) ?? "", outDir)) });
      } catch (error) {
        results.push({ ...job, error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
  await Promise.all(workers);

  results.sort((a, b) => a.stage - b.stage || MILO_POSES.indexOf(a.pose) - MILO_POSES.indexOf(b.pose));
  return Response.json({ results });
}
