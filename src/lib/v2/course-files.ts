// Checks a student's uploaded course files and turns them into what Claude can read
// (docs/COURSES.md, "Files and limits"). Server only. Nothing here is stored: the files live in
// memory for the length of one request.
// - PDF: sent as it is. Claude sees each page as text and as a picture.
// - PowerPoint and Word: unzipped here, and only the text is kept.
// - Photos: sent as images. The browser has already shrunk them.

import { inflateSync } from "node:zlib";

import { strFromU8, unzipSync } from "fflate";

export const LIMITS = {
  /** Files that are not photos. */
  files: 5,
  photos: 8,
  /** All files that are not photos, together. The Claude API takes 32 MB per request, and encoding adds a third. */
  totalBytes: 20 * 1024 * 1024,
  officeBytes: 10 * 1024 * 1024,
  /** The Claude API's limit for one image. */
  photoBytes: 5 * 1024 * 1024,
  pdfPages: 120,
  /** Text kept from PowerPoint and Word files, in characters. About 100,000 tokens. */
  officeChars: 400_000,
} as const;

/** Something is wrong with what the student uploaded. The message is written for them. */
export class FileProblem extends Error {}

export type ReadFile =
  | { kind: "pdf"; name: string; pages: number | null; base64: string }
  | { kind: "text"; name: string; pages: number | null; text: string }
  | { kind: "photo"; name: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

/** A file name is text from outside too: one line, no control characters, not too long. */
export function safeName(name: string): string {
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (clean || "file").slice(0, 80);
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** What a file really is, from its first bytes. The name and the browser's label are not trusted. */
function sniff(bytes: Uint8Array): "pdf" | "zip" | "image/jpeg" | "image/png" | "image/webp" | "old-office" | null {
  // "%PDF-" can sit a little way in.
  const head = strFromU8(bytes.subarray(0, 1024), true);
  if (head.includes("%PDF-")) return "pdf";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "zip";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) return "old-office";
  return null;
}

/**
 * Counts the pages of a PDF without a PDF library. Page objects are either written plainly in the
 * file or packed inside compressed object streams, so both places are searched.
 * Null when the count cannot be found. The file is then let through and the size limit still holds.
 */
export function countPdfPages(bytes: Uint8Array): number | null {
  const text = Buffer.from(bytes).toString("latin1");
  const PAGE = /\/Type\s*\/Page(?![A-Za-z])/g;
  let pages = (text.match(PAGE) ?? []).length;

  // Object streams: "<< … /Type /ObjStm … >> stream … endstream", usually deflated.
  const STREAM = /\/Type\s*\/ObjStm[\s\S]{0,400}?stream\r?\n/g;
  for (let match = STREAM.exec(text); match; match = STREAM.exec(text)) {
    const start = match.index + match[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) break;
    try {
      const inflated = inflateSync(Buffer.from(bytes.subarray(start, end))).toString("latin1");
      pages += (inflated.match(PAGE) ?? []).length;
    } catch {
      // Not deflate, or damaged. The plain count still stands.
    }
    STREAM.lastIndex = end;
  }
  if (pages > 0) return pages;

  // Last resort: the biggest /Count in the page tree.
  const counts = [...text.matchAll(/\/Count\s+(\d{1,5})/g)].map((found) => Number(found[1]));
  return counts.length > 0 ? Math.max(...counts) : null;
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

/** The text of one XML part of a PowerPoint or Word file: one line per paragraph. */
function paragraphs(xml: string, paragraphTag: string, textTag: string): string[] {
  const run = new RegExp(`<${textTag}(?:\\s[^>]*)?>([^<]*)</${textTag}>`, "g");
  return xml
    .split(`</${paragraphTag}>`)
    .map((chunk) => decodeXml([...chunk.matchAll(run)].map((found) => found[1]).join("")).trim())
    .filter(Boolean);
}

const numberIn = (name: string) => Number(/(\d+)\.xml$/.exec(name)?.[1] ?? 0);

/** Slide by slide, with speaker notes. Pictures and diagrams inside the file are not seen. */
function readOffice(bytes: Uint8Array, name: string): { text: string; pages: number | null } {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      // Only the parts that hold text, and none big enough to be a trap.
      filter: (file) =>
        file.originalSize < 8 * 1024 * 1024 &&
        (/^ppt\/slides\/slide\d+\.xml$/.test(file.name) ||
          /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(file.name) ||
          file.name === "word/document.xml"),
    });
  } catch {
    throw new FileProblem(`Milo could not open “${name}”. Save it as a PDF and add that.`);
  }

  const slides = Object.keys(entries)
    .filter((entry) => entry.startsWith("ppt/slides/"))
    .sort((a, b) => numberIn(a) - numberIn(b));
  if (slides.length > 0) {
    const notes = new Map(
      Object.keys(entries)
        .filter((entry) => entry.startsWith("ppt/notesSlides/"))
        .map((entry) => [numberIn(entry), paragraphs(strFromU8(entries[entry]), "a:p", "a:t")] as const),
    );
    const text = slides
      .map((entry, index) => {
        const lines = paragraphs(strFromU8(entries[entry]), "a:p", "a:t");
        // A notes page repeats the slide number as its last line.
        const said = (notes.get(numberIn(entry)) ?? []).filter((line) => !/^\d+$/.test(line));
        return [`Slide ${index + 1}`, ...lines, ...(said.length > 0 ? ["Speaker notes:", ...said] : [])].join("\n");
      })
      .join("\n\n");
    return { text: text.slice(0, LIMITS.officeChars), pages: slides.length };
  }

  const document = entries["word/document.xml"];
  if (document) {
    const text = paragraphs(strFromU8(document), "w:p", "w:t").join("\n");
    return { text: text.slice(0, LIMITS.officeChars), pages: null };
  }
  throw new FileProblem(`Milo can't read “${name}”. Save it as a PDF and add that.`);
}

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;

/** Checks every file against the limits and reads it. Throws FileProblem with a sentence for the student. */
export async function readCourseFiles(files: File[]): Promise<ReadFile[]> {
  if (files.length === 0) throw new FileProblem("Add at least one file: your slides, your notes or a photo of them.");

  const read: ReadFile[] = [];
  let documents = 0;
  let photos = 0;
  let documentBytes = 0;
  let pdfPages = 0;

  for (const file of files) {
    const name = safeName(file.name);
    if (file.size === 0) throw new FileProblem(`“${name}” is empty.`);
    // Nothing bigger than the whole allowance is even read into memory.
    if (file.size > LIMITS.totalBytes) {
      throw new FileProblem(`“${name}” is ${megabytes(file.size)}. Milo reads up to ${megabytes(LIMITS.totalBytes)} per course. Upload one chapter at a time.`);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniff(bytes);

    if (kind === "image/jpeg" || kind === "image/png" || kind === "image/webp") {
      photos += 1;
      if (photos > LIMITS.photos) throw new FileProblem(`Milo reads up to ${LIMITS.photos} photos per course.`);
      if (bytes.length > LIMITS.photoBytes) throw new FileProblem(`The photo “${name}” is too big. Take it again at a lower quality.`);
      read.push({ kind: "photo", name, mediaType: kind, base64: Buffer.from(bytes).toString("base64") });
      continue;
    }

    documents += 1;
    documentBytes += bytes.length;
    if (documents > LIMITS.files) throw new FileProblem(`Milo reads up to ${LIMITS.files} files per course, plus photos.`);
    if (documentBytes > LIMITS.totalBytes) {
      throw new FileProblem(`These files are ${megabytes(documentBytes)} together. Milo reads up to ${megabytes(LIMITS.totalBytes)} per course. Upload one chapter at a time.`);
    }

    if (kind === "pdf") {
      const text = Buffer.from(bytes).toString("latin1");
      if (/\/Encrypt\s/.test(text)) {
        throw new FileProblem(`“${name}” is locked with a password. Save an unlocked copy and add that.`);
      }
      const pages = countPdfPages(bytes);
      pdfPages += pages ?? 0;
      if (pdfPages > LIMITS.pdfPages) {
        throw new FileProblem(
          pages && pages > LIMITS.pdfPages
            ? `“${name}” has ${pages} pages. Milo reads up to ${LIMITS.pdfPages} pages per course. Upload one chapter at a time.`
            : `These files have ${pdfPages} pages together. Milo reads up to ${LIMITS.pdfPages} pages per course. Upload one chapter at a time.`,
        );
      }
      read.push({ kind: "pdf", name, pages, base64: Buffer.from(bytes).toString("base64") });
      continue;
    }

    if (kind === "zip") {
      if (bytes.length > LIMITS.officeBytes) {
        throw new FileProblem(`“${name}” is ${megabytes(bytes.length)}. Milo reads PowerPoint and Word files up to ${megabytes(LIMITS.officeBytes)}. Save it as a PDF and add that.`);
      }
      const office = readOffice(bytes, name);
      if (office.text.trim().length < 40) {
        throw new FileProblem(`Milo found no text in “${name}”. If it is mostly pictures, save it as a PDF and add that.`);
      }
      read.push({ kind: "text", name, pages: office.pages, text: office.text });
      continue;
    }

    throw new FileProblem(`Milo can't read “${name}”. Save it as a PDF and add that.`);
  }
  return read;
}

/** "your 21 slides", "your 3 files": how the progress line names what Claude is reading. */
export function describeFiles(files: ReadFile[]): string {
  const pages = files.reduce((sum, file) => sum + (file.kind === "photo" ? 0 : (file.pages ?? 0)), 0);
  const photos = files.filter((file) => file.kind === "photo").length;
  const countable = files.every((file) => file.kind === "photo" || file.pages !== null);
  const parts: string[] = [];
  if (pages > 0 && countable) parts.push(`${pages} ${pages === 1 ? "page" : "pages"}`);
  else if (files.length - photos > 0) parts.push(`${files.length - photos} ${files.length - photos === 1 ? "file" : "files"}`);
  if (photos > 0) parts.push(`${photos} ${photos === 1 ? "photo" : "photos"}`);
  return `your ${parts.join(" and ")}`;
}
