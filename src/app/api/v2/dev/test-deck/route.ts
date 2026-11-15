// GET /api/v2/dev/test-deck?name=photosynthesis.pdf
// Development helper. Serves one of the test decks in test-data/, so a browser test can put it into
// the "New course" file picker without a person choosing the file. Only plain file names from that
// one folder, and only in development.

import { readFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "This helper only runs in development." }, { status: 403 });
  }
  const name = new URL(request.url).searchParams.get("name") ?? "";
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || !type) {
    return Response.json({ error: "Give the name of a file in test-data/." }, { status: 400 });
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), "test-data", name));
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: `test-data/${name} does not exist.` }, { status: 404 });
  }
}
