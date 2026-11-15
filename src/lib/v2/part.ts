// A part of a student's own course (docs/COURSES.md). It has the same shape as a built-in v2 topic,
// but it lives in the browser, so the browser sends it along with every turn. This file is the gate:
// whatever arrives is checked, cut to size and flattened to single lines before it gets near a prompt.

import { z } from "zod";

import { LayoutKindSchema } from "./layouts";
import { getV2Topic, type V2Topic } from "./topics";

/** One line of plain text: no line breaks, no control characters, no runs of spaces. */
function oneLine(max: number) {
  return z
    .string()
    .max(max * 2)
    .transform((text) =>
      text
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max),
    );
}

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/);

export const PartIdeaSchema = z.object({
  id: slug,
  /** What a complete explanation says. Never shown to the student. */
  idea: oneLine(400).pipe(z.string().min(1)),
  /** What the student must get across for the idea to count as clear. */
  core: oneLine(300).pipe(z.string().min(1)),
  /** The proper word or words. Exam mode wants the student to use them. */
  term: oneLine(80),
  /** How the gap is named on screen. A question, so it never gives the answer away. */
  gapLabel: oneLine(90).pipe(z.string().min(1)),
});

export const PartDefinitionSchema = z.object({
  /** Unique in the browser: "course-<course id>-<part id>". Also names the saved session. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
  /** The course's title, shown where a built-in topic shows its subject. */
  subject: oneLine(80),
  title: oneLine(80).pipe(z.string().min(1)),
  blurb: oneLine(140),
  // Milo says this phrase in his first line, and it sits inside the brain's prompt and the voice
  // agent's. So it is held to plain words: no full stops, colons, quotes or brackets to start a new sentence with.
  about: oneLine(120)
    .transform((text) => text.replace(/[^\p{L}\p{N} ,'’&-]/gu, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1)),
  firstMessage: oneLine(260).pipe(z.string().min(1)),
  tone: oneLine(200).optional(),
  keywords: z.array(oneLine(40)).max(24),
  layout: LayoutKindSchema,
  keyIdeas: z.array(PartIdeaSchema).min(2).max(6),
});
export type PartDefinition = z.infer<typeof PartDefinitionSchema>;

/** A checked part, as the topic the session engine and the brain prompt work with. */
export function partToTopic(part: PartDefinition): V2Topic {
  return {
    ...part,
    keywords: part.keywords.filter(Boolean),
    boardExamples: [],
    ready: true,
    custom: true,
  };
}

/** The other way round: what the browser sends with each turn for a part of a course. */
export function topicToPart(topic: V2Topic): PartDefinition {
  return {
    id: topic.id,
    subject: topic.subject,
    title: topic.title,
    blurb: topic.blurb,
    about: topic.about,
    firstMessage: topic.firstMessage,
    ...(topic.tone ? { tone: topic.tone } : {}),
    keywords: topic.keywords,
    layout: topic.layout,
    keyIdeas: topic.keyIdeas.map(({ id, idea, core, term, gapLabel }) => ({ id, idea, core, term, gapLabel })),
  };
}

/** The topic a request is about: the part it carries, or else a built-in topic that is ready. */
export function topicFromRequest(topicId: string, part?: PartDefinition): V2Topic | null {
  if (part) return partToTopic(part);
  const topic = getV2Topic(topicId);
  return topic && topic.ready ? topic : null;
}
