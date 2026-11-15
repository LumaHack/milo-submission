// Turns what Claude wrote about a course into what Milo keeps (docs/COURSES.md). Nothing Claude
// returns is trusted as it is: every field is flattened to one line and cut to size, ids are made
// safe and unique, Milo's opening line is written here, and a question that gives its own answer
// away is blanked. Used by the analyze and focus routes.

import { CoursePartSchema, CourseSchema, type Course, type CoursePart } from "./courses";
import type { CourseAnalysis, PartOut } from "./course-prompts";

const MAX_PARTS = 8;
const MAX_IDEAS = 6;
const MIN_IDEAS = 2;

function oneLine(text: string, max: number): string {
  return text
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

export function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
  return slug || fallback;
}

/** Makes `wanted` different from every id already taken. */
function unique(wanted: string, taken: Set<string>): string {
  let id = wanted;
  for (let n = 2; taken.has(id); n++) id = `${wanted.slice(0, 28)}-${n}`;
  taken.add(id);
  return id;
}

/**
 * A gap label is on screen while the idea is still missing, so it must not hold the idea's own term.
 * A term found whole in the label is blanked: "What the membrane does" becomes "What the … does".
 * A term of several words only counts as a whole ("water potential" does not blank "water"), and a
 * term that lists several names ("turgid, cell wall") is checked name by name.
 */
export function withoutTerm(gapLabel: string, term: string): string {
  const names = term
    .split(/,|;|\/|\band\b|\bor\b/i)
    .map((name) => name.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim())
    // A single short word such as "ATP" or "DNA" still counts. Anything shorter than three letters does not.
    .filter((name) => name.length >= 3);
  let label = gapLabel;
  for (const name of names) {
    const words = name.split(" ").map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // Whole words only, with an optional plural on the last one.
    const pattern = new RegExp(`\\b${words.join("\\W+")}(?:e?s)?\\b`, "gi");
    label = label.replace(pattern, "…");
  }
  return label.replace(/\s+/g, " ").trim();
}

/** Milo's opening line for a part. Written here, so text from a file is never spoken as it stands. */
export function openingLine(about: string): string {
  return `Hi, I'm Milo! I don't know anything about ${about}. Can you explain it to me? I'll draw what you say.`;
}

/** One part, checked and cut to size. Null if too little is left of it to explain. */
export function buildPart(out: PartOut, origin: CoursePart["origin"], takenIds: Set<string>): CoursePart | null {
  const title = oneLine(out.title, 80);
  const about = oneLine(out.about, 110).replace(/[.!?]+$/, "") || title.toLowerCase();
  if (!title) return null;

  const ideaIds = new Set<string>();
  const keyIdeas = out.keyIdeas
    .map((idea, index) => {
      const term = oneLine(idea.term, 80);
      const text = oneLine(idea.idea, 400);
      const core = oneLine(idea.core, 300) || text;
      const gapLabel = withoutTerm(oneLine(idea.gapLabel, 90).replace(/\?+$/, ""), term);
      if (!text || !gapLabel) return null;
      return { id: unique(slugify(idea.id || term, `idea-${index + 1}`), ideaIds), idea: text, core, term, gapLabel };
    })
    .filter((idea) => idea !== null)
    .slice(0, MAX_IDEAS);
  if (keyIdeas.length < MIN_IDEAS) return null;

  const tone = oneLine(out.tone, 200);
  const part = CoursePartSchema.safeParse({
    id: unique(slugify(out.id || title, "part"), takenIds),
    origin,
    title,
    blurb: oneLine(out.blurb, 140),
    about,
    firstMessage: openingLine(about),
    ...(tone ? { tone } : {}),
    keywords: [...new Set(out.keywords.map((word) => oneLine(word, 40)).filter(Boolean))].slice(0, 12),
    layout: out.layout,
    keyIdeas,
  });
  return part.success ? part.data : null;
}

/** The whole course, ready to be stored. Null if no part survived the checks. */
export function buildCourse(
  analysis: CourseAnalysis,
  given: { name: string; files: Course["files"] },
): Course | null {
  const taken = new Set<string>();
  const parts = analysis.parts
    .map((part) => buildPart(part, "course", taken))
    .filter((part) => part !== null)
    .slice(0, MAX_PARTS);
  if (parts.length === 0) return null;

  const title = oneLine(given.name, 80) || oneLine(analysis.courseTitle, 80) || "My course";
  const course = CourseSchema.safeParse({
    id: `${slugify(title, "course").slice(0, 24).replace(/-+$/g, "")}-${Date.now().toString(36)}`,
    title,
    createdAt: Date.now(),
    files: given.files.slice(0, 12),
    parts,
    skipped: analysis.skipped.map((line) => oneLine(line, 160)).filter(Boolean).slice(0, 8),
    outline: analysis.outline
      .map((entry) => ({
        heading: oneLine(entry.heading, 120),
        facts: entry.facts.map((fact) => oneLine(fact, 220)).filter(Boolean).slice(0, 8),
      }))
      .filter((entry) => entry.heading)
      .slice(0, 40),
  });
  return course.success ? course.data : null;
}
