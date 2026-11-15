"use client";

// The browser's side of reading a course (docs/COURSES.md): shrink photos, send the files, and follow
// the progress lines the server streams back.

import { CourseSchema, type Course } from "./courses";

/** The same limits the server checks (src/lib/v2/course-files.ts), shown before anything is uploaded. */
export const UPLOAD = {
  files: 5,
  photos: 8,
  totalBytes: 20 * 1024 * 1024,
  pdfPages: 120,
  photoEdge: 1600,
  accept: ".pdf,.pptx,.docx,image/jpeg,image/png,image/webp",
} as const;

export function isPhoto(file: File): boolean {
  return /^image\/(jpeg|png|webp)$/.test(file.type);
}

/** Shrinks a photo to 1,600 px on its long side and saves it as a JPEG. A photo of notes stays readable at that size. */
export async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, UPLOAD.photoEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    // The server checks the size anyway.
    return file;
  }
}

export type ReadingEvent = { type: "status"; text: string } | { type: "part"; title: string };

/** Something went wrong, in words for the student. */
export class ReadingFailed extends Error {}

const DROPPED = "The connection dropped while Claude was reading. Try again.";

/**
 * Sends the files and follows the server's progress lines. Resolves with the finished course,
 * or throws ReadingFailed. Nothing is saved here.
 */
export async function readCourse(
  input: { name: string; files: File[] },
  onEvent: (event: ReadingEvent) => void,
  signal: AbortSignal,
): Promise<Course> {
  const form = new FormData();
  form.set("name", input.name);
  for (const file of input.files) form.append("files", isPhoto(file) ? await shrinkPhoto(file) : file, file.name);

  let response: Response;
  try {
    response = await fetch("/api/v2/courses/analyze", { method: "POST", body: form, signal });
  } catch {
    throw new ReadingFailed(signal.aborted ? "Stopped." : "Milo could not reach the server. Check your connection and try again.");
  }
  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ReadingFailed(data?.error ?? "Milo could not read these files. Try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as ReadingEvent | { type: "done"; course: unknown } | { type: "error"; message: string };
        if (event.type === "error") throw new ReadingFailed(event.message);
        if (event.type === "done") {
          const course = CourseSchema.safeParse(event.course);
          if (!course.success) throw new ReadingFailed("Claude could not sort this course into parts. Try again in a moment.");
          return course.data;
        }
        onEvent(event);
      }
    }
  } catch (error) {
    if (error instanceof ReadingFailed) throw error;
    throw new ReadingFailed(signal.aborted ? "Stopped." : DROPPED);
  }
  // The stream ended without a course.
  throw new ReadingFailed(DROPPED);
}
