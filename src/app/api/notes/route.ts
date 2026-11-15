// POST /api/notes
// Reads the student's own notes (slides saved as PDF, notes, a transcript, photos of slides) and sets up
// to four topics from them alone. Input: multipart form data, one or more "files". Output:
// { files, topics: Topic[], seconds }. See src/lib/topics.ts for Topic.
//
// The files are only held in memory for this one call. They are never written to disk and never logged.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { NOTES_PROMPT } from "@/lib/prompts";
import type { KeyIdea, NoteFact, Topic } from "@/lib/topics";
import { NotesResultSchema } from "@/lib/turn";

const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_FILES = 5;
/** Raw bytes across all files. Base64 adds a third, which keeps the request under Claude's 32 MB. */
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
/** Claude's limit for one image. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** About 100,000 tokens of text per file, far more than a lecture transcript. */
const MAX_TEXT_CHARS = 400_000;

const TEXT_TYPES = new Set(["txt", "md", "markdown", "vtt", "srt"]);
const IMAGE_TYPES: Record<string, "image/png" | "image/jpeg" | "image/webp"> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const SAVE_AS_PDF = new Set(["ppt", "pptx", "key", "odp", "doc", "docx", "pages", "odt", "rtf"]);

const MESSAGES = {
  none: "Pick at least one file to upload.",
  tooMany: `Milo can read up to ${MAX_FILES} files at once.`,
  tooBig: "That is more than 20 MB. Upload one lecture at a time.",
  saveAsPdf: "Save your slides as a PDF first, then upload that.",
  unsupported: "Milo can read PDFs, text files, transcripts and photos of slides. Save slides as a PDF first.",
  broken: "One of those files could not be read. Try saving it again.",
  unreadable: "Milo could not read those notes. Try again.",
} as const;

type Block = Anthropic.Beta.BetaRequestDocumentBlock | Anthropic.Beta.BetaImageBlockParam;

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, i) => bytes[offset + i] === value);
}

/** Checks the file is what its name says, by its first bytes. */
function looksRight(extension: string, bytes: Uint8Array): boolean {
  if (extension === "pdf") {
    // "%PDF" near the start. Some writers put a few bytes in front of it.
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
    return head.includes("%PDF");
  }
  if (extension === "png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  if (extension === "jpg" || extension === "jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === "webp") return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  // Text: no NUL bytes near the start, so it is not a binary file renamed.
  return !bytes.subarray(0, 4096).includes(0);
}

function slug(text: string, fallback: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return cleaned || fallback;
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("ANTHROPIC_API_KEY is not set. Add it to .env.local.", 500);
  }

  const form = await request.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) return fail(MESSAGES.none, 400);
  if (files.length > MAX_FILES) return fail(MESSAGES.tooMany, 400);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) return fail(MESSAGES.tooBig, 413);

  const names: string[] = [];
  const blocks: Block[] = [];
  for (const file of files) {
    const name = clip(file.name.split(/[\\/]/).pop() || "notes", 80);
    const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
    if (SAVE_AS_PDF.has(extension)) return fail(MESSAGES.saveAsPdf, 415);
    const isPdf = extension === "pdf";
    const isText = TEXT_TYPES.has(extension);
    const imageType = IMAGE_TYPES[extension];
    if (!isPdf && !isText && !imageType) return fail(MESSAGES.unsupported, 415);
    if (imageType && file.size > MAX_IMAGE_BYTES) return fail("Each photo has to be under 5 MB.", 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksRight(extension, bytes)) return fail(MESSAGES.broken, 415);
    names.push(name);

    if (isPdf) {
      blocks.push({
        type: "document",
        title: name,
        source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") },
      });
    } else if (isText) {
      const text = new TextDecoder("utf-8").decode(bytes).slice(0, MAX_TEXT_CHARS);
      if (text.trim().length === 0) return fail(MESSAGES.broken, 415);
      blocks.push({ type: "document", title: name, source: { type: "text", media_type: "text/plain", data: text } });
    } else {
      blocks.push({ type: "image", source: { type: "base64", media_type: imageType, data: Buffer.from(bytes).toString("base64") } });
    }
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  // The student waits on this call, so fast mode is on under the same rule as /api/turn.
  const fast = model === DEFAULT_MODEL && process.env.MILO_FAST !== "0";
  const client = new Anthropic();
  const started = Date.now();

  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // Medium effort: this is the marking scheme for the whole session, and it is made once.
      output_config: { effort: "medium", format: betaZodOutputFormat(NotesResultSchema) },
      ...(fast ? { speed: "fast" as const } : {}),
      // A safety filter can decline biology material. The API then retries on a fallback model in the same call.
      ...(model === DEFAULT_MODEL ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      system: NOTES_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...blocks,
            {
              type: "text",
              text: `The student uploaded ${names.length === 1 ? "one file" : `${names.length} files`}. Set up the topics from this material only.`,
            },
          ],
        },
      ],
    });
    const seconds = (Date.now() - started) / 1000;
    console.info(`/api/notes: ${names.length} file(s) read in ${seconds.toFixed(1)} s`);

    if (response.stop_reason === "refusal") {
      return fail("Milo can't use these notes. Try lecture slides or notes for a school or university topic.", 422);
    }
    const made = response.parsed_output;
    if (response.stop_reason === "max_tokens" || !made) return fail(MESSAGES.unreadable, 502);
    if (!made.ok) {
      return fail(made.reason.trim() || "Milo can't use these notes. Try lecture slides or notes for a school or university topic.", 422);
    }

    const stamp = Date.now().toString(36);
    const topics: Topic[] = made.topics
      .filter((topic) => topic.keyIdeas.length >= 3)
      .slice(0, 4)
      .map((topic, t) => {
        const seen = new Set<string>();
        const keyIdeas: KeyIdea[] = topic.keyIdeas.slice(0, 5).map((idea, i) => {
          let id = slug(idea.id, `idea-${i + 1}`);
          while (seen.has(id)) id = `${id}-${i + 1}`;
          seen.add(id);
          return {
            id,
            idea: clip(idea.idea, 400),
            gapLabel: clip(idea.gapLabel, 60),
            // Exactly three core ideas, whatever the model marked, so Basics always has the same size.
            core: i < 3,
            where: clip(idea.where, 40),
          };
        });
        const facts: NoteFact[] = topic.facts
          .slice(0, 30)
          .map((fact) => ({ text: clip(fact.text, 300), where: clip(fact.where, 40) }))
          .filter((fact) => fact.text.length > 0);
        return {
          id: `notes-${stamp}-${t + 1}`,
          subject: clip(made.subject, 30) || "Your notes",
          title: clip(topic.title, 80),
          blurb: clip(topic.blurb, 60),
          about: clip(topic.about, 60),
          opener: clip(topic.opener, 120),
          ready: true,
          keyIdeas,
          notes: { files: names, facts },
        };
      });
    if (topics.length === 0) {
      return fail("Milo couldn't find a topic to explain in those notes. Try notes with more to explain.", 422);
    }

    return Response.json({ files: names, topics, seconds });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("/api/notes: ANTHROPIC_API_KEY was rejected.");
      return fail(MESSAGES.unreadable, 500);
    }
    if (error instanceof Anthropic.RateLimitError) return fail("Too many requests. Try again in a moment.", 429);
    if (error instanceof Anthropic.BadRequestError) {
      // Usually a PDF with too many pages, or a file Claude cannot open.
      console.error("/api/notes: Claude rejected the files:", error.message);
      return fail("Those notes are too big or could not be opened. Upload one lecture at a time, as a PDF.", 400);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`/api/notes: Anthropic API error ${error.status}`);
      return fail(MESSAGES.unreadable, 502);
    }
    throw error;
  }
}
