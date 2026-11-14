// The shared contract between the brain (/api/turn), the drawing (/api/draw) and the screen.
// It matches "The turn contract" in docs/SPEC.md. Change both together.

import { z } from "zod";

import type { Level } from "./levels";

/** How well the student has covered one key idea, across everything said so far. */
export const IdeaStatusSchema = z.enum(["missing", "vague", "clear", "wrong"]);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

/** What the browser sends after the student finishes a turn. */
export const TurnRequestSchema = z.object({
  topicId: z.string(),
  /** Every student turn so far, oldest first. The last one is the new turn. */
  studentTurns: z.array(z.string()).min(1),
  /** The level before this turn. Null on the first turn. */
  previousLevel: LevelSchema.nullable(),
  /** The instruction that produced the board now on screen. Null if there is no board yet. */
  previousDrawPrompt: z.string().nullable(),
});
export type TurnRequest = z.infer<typeof TurnRequestSchema>;

/** What Claude returns. This schema is also the structured-output format, so keep it flat and simple. */
export const TurnResultSchema = z.object({
  ideas: z
    .array(z.object({ id: z.string(), status: IdeaStatusSchema }))
    .describe("One entry for every key idea of the topic, in the order given."),
  level: LevelSchema.describe("Crayon level for the explanation so far."),
  biggestGapId: z
    .string()
    .nullable()
    .describe("Id of the most important key idea that is not clear yet. Null when nothing is left."),
  hint: z.string().describe("Milo's next spoken line. One short sentence. Never contains the answer."),
  said: z.string().describe("The student's latest turn as one sentence of at most 20 words, in their own words."),
  changed: z
    .boolean()
    .describe("False when the latest turn added nothing that can be drawn. The board is then left as it is."),
  drawPrompt: z.string().describe("Instruction for the image model. Repeats the previous one when changed is false."),
});
export type TurnResult = z.infer<typeof TurnResultSchema>;

/** What the browser sends to get a board drawn. */
export const DrawRequestSchema = z.object({
  prompt: z.string().min(1),
  /** The board to edit. Null draws a new one. */
  previousImageUrl: z.url().nullable(),
  level: LevelSchema,
});
export type DrawRequest = z.infer<typeof DrawRequestSchema>;

export type DrawResult = {
  imageUrl: string;
  endpoint: string;
  seconds: number;
};

/** One entry in the history strip: what the student said and what Milo drew from it. */
export type Frame = {
  turn: number;
  level: Level;
  said: string;
  imageUrl: string;
  /** Seconds since the session started. */
  at: number;
  hint: string;
  /** Gap labels still open after this turn, biggest first. */
  gaps: string[];
};

export type MiloStatus = "off" | "connecting" | "listening" | "thinking" | "drawing" | "speaking";
