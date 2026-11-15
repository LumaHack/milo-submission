// POST /api/v2/courses/analyze
// Reads a student's course files and sorts them into parts they can explain to Milo (docs/COURSES.md).
// Input: a form with "name" (optional) and "files". The files are checked, sent to Claude once and
// then forgotten: nothing is stored on this server.
// Output: a stream of JSON lines, so the screen can show progress while Claude reads:
//   {"type":"status","text":"…"}   {"type":"part","title":"…"}   {"type":"done","course":{…},"meta":{…}}
//   {"type":"error","message":"…"}
// One Claude call: the Anthropic SDK, streamed, structured output through output_config.format,
// stop_reason checked, and every field checked again by course-build.ts before anything is returned.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { fallbackParams, metaFrom, v2FastMode, v2Model } from "@/lib/v2/claude";
import { buildCourse } from "@/lib/v2/course-build";
import { describeFiles, FileProblem, readCourseFiles, type ReadFile } from "@/lib/v2/course-files";
import { analysisInstruction, analysisSystemPrompt, CourseAnalysisSchema } from "@/lib/v2/course-prompts";
import { logUsage } from "@/lib/v2/usage";

type Line =
  | { type: "status"; text: string }
  | { type: "part"; title: string }
  | { type: "done"; course: unknown; meta: unknown }
  | { type: "error"; message: string };

const TRY_AGAIN = "Claude could not sort this course into parts. Try again in a moment.";

/** The files as Claude reads them, between two markers, with the instruction after them. */
function userContent(files: ReadFile[], name: string): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = files.map((file) => {
    if (file.kind === "pdf") {
      return {
        type: "document",
        title: file.name,
        source: { type: "base64", media_type: "application/pdf", data: file.base64 },
      };
    }
    if (file.kind === "text") {
      return { type: "document", title: file.name, source: { type: "text", media_type: "text/plain", data: file.text } };
    }
    return { type: "image", source: { type: "base64", media_type: file.mediaType, data: file.base64 } };
  });
  // The files are the long, unchanging part of the request, so the cache point sits on the last one.
  const last = blocks.at(-1);
  if (last && (last.type === "document" || last.type === "image")) last.cache_control = { type: "ephemeral" };
  return [
    { type: "text", text: `<course_material>\nThe student uploaded ${files.length} ${files.length === 1 ? "file" : "files"}.` },
    ...blocks,
    { type: "text", text: analysisInstruction(name) },
  ];
}

/** Part titles Claude has finished writing so far, read out of the JSON as it streams in. */
function partTitles(json: string): string[] {
  const start = json.indexOf('"parts"');
  if (start < 0) return [];
  const titles: string[] = [];
  for (const found of json.slice(start).matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
    try {
      titles.push(JSON.parse(`"${found[1]}"`) as string);
    } catch {
      // Half an escape sequence. It will be whole on the next chunk.
    }
  }
  return titles;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Send the course as a form with its files." }, { status: 400 });
  const name = String(form.get("name") ?? "")
    .replace(/[\u0000-\u001f\u007f"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const uploaded = form.getAll("files").filter((entry): entry is File => entry instanceof File);

  let files: ReadFile[];
  try {
    files = await readCourseFiles(uploaded);
  } catch (error) {
    if (error instanceof FileProblem) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: Line) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      const client = new Anthropic();
      const model = v2Model();
      const started = Date.now();

      const read = async (withFastMode: boolean) => {
        const run = client.beta.messages.stream({
          model,
          max_tokens: 32000,
          // Sorting a whole course is the one place v2 asks Claude to think hard.
          output_config: { effort: "high", format: betaZodOutputFormat(CourseAnalysisSchema) },
          ...(withFastMode ? { speed: "fast" as const } : {}),
          ...fallbackParams(model),
          system: [{ type: "text", text: analysisSystemPrompt(), cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userContent(files, name) }],
        });
        let shown = 0;
        let writing = false;
        run.on("text", (_delta, snapshot) => {
          if (!writing) {
            writing = true;
            send({ type: "status", text: "Claude is writing the parts" });
          }
          // The last title may still be growing, so it is only shown once the next one has started.
          const titles = partTitles(snapshot);
          for (; shown < titles.length - 1; shown++) send({ type: "part", title: titles[shown] });
        });
        return run.finalMessage();
      };

      try {
        send({ type: "status", text: `Claude is reading ${describeFiles(files)}` });
        // Development only: ?speed=standard reads without fast mode, to compare time and cost.
        const standard = process.env.NODE_ENV !== "production" && new URL(request.url).searchParams.get("speed") === "standard";
        let fast = v2FastMode() && !standard;
        let message;
        try {
          message = await read(fast);
        } catch (error) {
          // Fast mode has its own rate limit. When it is full, read at standard speed instead of failing.
          if (!fast || !(error instanceof Anthropic.RateLimitError)) throw error;
          fast = false;
          message = await read(false);
        }

        const meta = metaFrom(message, fast, started);
        logUsage({ route: "courses/analyze", stop: message.stop_reason, files: files.length, ...meta });

        if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens" || !message.parsed_output) {
          send({ type: "error", message: TRY_AGAIN });
          return;
        }
        const analysis = message.parsed_output;
        if (!analysis.readable) {
          const problem = analysis.problem.replace(/\s+/g, " ").trim().slice(0, 240);
          send({ type: "error", message: problem || "Milo found nothing to study in these files. Check they are the right ones." });
          return;
        }
        const course = buildCourse(analysis, {
          name,
          files: files.map((file) => ({ name: file.name, pages: file.kind === "photo" ? null : file.pages })),
        });
        if (!course) {
          send({ type: "error", message: TRY_AGAIN });
          return;
        }
        send({ type: "done", course, meta });
      } catch (error) {
        const message =
          error instanceof Anthropic.RateLimitError
            ? "Claude is busy right now. Try again in a moment."
            : error instanceof Anthropic.BadRequestError
              ? "Claude could not open one of these files. Save it as a PDF and try again."
              : TRY_AGAIN;
        logUsage({ route: "courses/analyze", failed: error instanceof Error ? error.message.slice(0, 300) : "unknown" });
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
