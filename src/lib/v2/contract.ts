// The v2 turn contract (docs/V2.md). It adds to the shared contract in src/lib/turn.ts
// without changing it, so Ali's version keeps working untouched.

import { z } from "zod";

import { IdeaStatusSchema, LevelSchema } from "@/lib/turn";

import { PartDefinitionSchema } from "./part";

/** Coach: Milo climbs a hint ladder when the student is stuck. Exam: Milo never hints. */
export const ModeSchema = z.enum(["coach", "exam"]);
export type Mode = z.infer<typeof ModeSchema>;

/** How much help Milo's line gives. 0 is a vague question, 4 is "it's called X, what does it do?". */
export const HintStepSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type HintStep = z.infer<typeof HintStepSchema>;

const IdeaListSchema = z.array(z.object({ id: z.string(), status: IdeaStatusSchema }));

/** What the browser sends to /api/v2/turn after the student finishes a point. */
export const V2TurnRequestSchema = z.object({
  topicId: z.string(),
  /** A part of a student's own course (docs/COURSES.md). Built-in topics leave it out. */
  part: PartDefinitionSchema.optional(),
  mode: ModeSchema,
  /** Every student turn so far, oldest first. The last one is the new turn. */
  studentTurns: z.array(z.string().min(1)).min(1),
  previousLevel: LevelSchema.nullable(),
  previousIdeas: IdeaListSchema.nullable(),
  previousBiggestGapId: z.string().nullable(),
  previousHintStep: HintStepSchema,
  /** The instruction that drew the board now on screen. Null if there is no board yet. */
  previousDrawPrompt: z.string().nullable(),
  /** Milo's last few lines, newest last, so he never opens the same way twice. */
  recentMiloLines: z.array(z.string()).max(6),
  /** Development only, ignored in production: lets a timing test try another model or fast mode. */
  dev: z.object({ model: z.string().optional(), fast: z.boolean().optional() }).optional(),
});
export type V2TurnRequest = z.infer<typeof V2TurnRequestSchema>;

/** What Claude returns. Also the structured-output format, so keep it flat. */
export const V2TurnResultSchema = z.object({
  ideas: IdeaListSchema.describe("One entry for every key idea of the topic, in the order given."),
  level: LevelSchema.describe("Crayon level for the explanation so far."),
  biggestGapId: z
    .string()
    .nullable()
    .describe("Id of the most important key idea that is not clear yet. Null when nothing is left."),
  hintStep: HintStepSchema.describe("Step of the hint ladder that miloLine uses. Always 0 in exam mode."),
  miloLine: z
    .string()
    .describe("What Milo says out loud next. One or two short sentences, plain words, about the drawing."),
  said: z.string().describe("The student's latest turn as one sentence of at most 20 words, in their own words."),
  changed: z
    .boolean()
    .describe("False when the latest turn needs no change to the board. The board is then left as it is."),
  drawPrompt: z.string().describe("Instruction for the image model. Repeats the previous one when changed is false."),
});
export type V2TurnResult = z.infer<typeof V2TurnResultSchema>;

/** What the browser sends to /api/v2/draw. */
export const V2DrawRequestSchema = z.object({
  prompt: z.string().min(1),
  /** The board to edit. Null draws a new one. */
  previousImageUrl: z.url().nullable(),
  /** True redraws the last board with the careful model, for the end page. */
  final: z.boolean().optional(),
});
export type V2DrawRequest = z.infer<typeof V2DrawRequestSchema>;
