// A student's own courses (docs/COURSES.md), kept in this browser's localStorage. Only the structure
// Claude made from the uploaded files is stored: the course's title, its parts and a short outline.
// The files themselves are sent to Claude once and never stored anywhere.

import { z } from "zod";

import { PartDefinitionSchema, partToTopic } from "./part";
import type { V2Topic } from "./topics";

/** A part as stored: its id is short and only unique inside its course. */
export const CoursePartSchema = PartDefinitionSchema.omit({ id: true, subject: true }).extend({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
  /** "course" for a part Claude found when it read the files, "focus" for one the student asked for. */
  origin: z.enum(["course", "focus"]),
});
export type CoursePart = z.infer<typeof CoursePartSchema>;

export const CourseSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
  title: z.string().min(1).max(80),
  createdAt: z.number(),
  /** What was uploaded, for the course page: names only. */
  files: z.array(z.object({ name: z.string().max(160), pages: z.number().nullable() })).max(12),
  /** True for the built-in sample courses. */
  sample: z.boolean().optional(),
  parts: z.array(CoursePartSchema).min(1).max(16),
  /** What Claude left out on purpose, in its own short lines, for the course page. */
  skipped: z.array(z.string().max(200)).max(8),
  /** Claude's short outline of the whole course, used to build a part the student asks for. */
  outline: z.array(z.object({ heading: z.string().max(120), facts: z.array(z.string().max(220)).max(8) })).max(40),
});
export type Course = z.infer<typeof CourseSchema>;

export const COURSES_KEY = "milo.v2.courses";
const KEY = COURSES_KEY;
export const MAX_COURSES = 12;
/** A course holds the parts Claude found, plus the ones the student asked for, up to this many. */
export const MAX_PARTS = 16;

/** The id a part's saved session and its turns use. Unique across courses. */
export function partTopicId(courseId: string, partId: string): string {
  return `course-${courseId}-${partId}`;
}

export function partAsTopic(course: Course, part: CoursePart): V2Topic {
  const { origin: _origin, ...definition } = part;
  void _origin;
  return partToTopic({ ...definition, id: partTopicId(course.id, part.id), subject: course.title });
}

/** The stored list of courses, from its raw text. A course that no longer matches the shape is skipped, never allowed to break the page. */
export function parseCourses(raw: string | null): Course[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.flatMap((entry) => {
      const parsed = CourseSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export function loadCourses(): Course[] {
  try {
    return parseCourses(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function getCourse(id: string): Course | null {
  return loadCourses().find((course) => course.id === id) ?? null;
}

/** Saves a new course or replaces the one with the same id. False when the browser's storage is full or blocked. */
export function saveCourse(course: Course): boolean {
  try {
    const others = loadCourses().filter((entry) => entry.id !== course.id);
    window.localStorage.setItem(KEY, JSON.stringify([course, ...others].slice(0, MAX_COURSES)));
    return true;
  } catch {
    return false;
  }
}

export function removeCourse(id: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loadCourses().filter((course) => course.id !== id)));
  } catch {
    // Nothing to remove.
  }
}

/** The topic for one part of a stored course, or null if either is gone from this browser. */
export function coursePartTopic(courseId: string, partId: string): V2Topic | null {
  const course = getCourse(courseId);
  const part = course?.parts.find((entry) => entry.id === partId);
  return course && part ? partAsTopic(course, part) : null;
}
