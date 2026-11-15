// The shared contract between the brain (/api/turn), the drawing (/api/draw) and the screen.
// It matches "The turn contract" in docs/SPEC.md. Change both together.

import { z } from "zod";

import type { Level } from "./levels";

/** How well the student has covered one key idea, across everything said so far. */
export const IdeaStatusSchema = z.enum(["missing", "vague", "clear", "wrong"]);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const LevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

/** How much detail the student is asked for. It sets which key ideas count and how strict "clear" is. */
export const DetailSchema = z.enum(["basics", "exam", "deep"]);

/** What the browser sends after the student finishes a turn. */
export const TurnRequestSchema = z.object({
  /** The topic and the key ideas to mark at the chosen level of detail. Sent by the browser, so topics the student typed work too. */
  topic: z.object({
    title: z.string().min(1).max(120),
    keyIdeas: z
      .array(z.object({ id: z.string(), idea: z.string(), gap: z.string().optional() }))
      .min(1)
      .max(8),
  }),
  detail: DetailSchema,
  /** Every student turn so far, oldest first. The last one is the new turn. */
  studentTurns: z.array(z.string()).min(1),
  /** Gaps Milo has already sketched a hint for. He helps once per gap. */
  helpedGapIds: z.array(z.string()),
  /** How many scored turns the student has had since Milo's last hint. Null if he has not given one. */
  turnsSinceHint: z.number().int().nullable(),
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
  wrongClaims: z
    .array(z.string())
    .describe("The fact check: statements in the latest turn that are clearly false, in the student's words. Empty when none."),
  hint: z.string().describe("Milo's next spoken line. One short sentence. Never contains the answer."),
  help: z
    .boolean()
    .describe("True when the student has tried the biggest gap twice without getting there, so Milo sketches a hint and teaches a little."),
  stuck: z.boolean().describe("True when the student has run out of things to say and the session should wrap up."),
  said: z.string().describe("The student's latest turn as one sentence of at most 20 words, in their own words."),
  changed: z
    .boolean()
    .describe("False when the latest turn added nothing that can be drawn. The board is then left as it is."),
  drawPrompt: z.string().describe("Instruction for the image model. Repeats the previous one when changed is false."),
  drew: z
    .string()
    .describe("One short spoken sentence in which Milo says what he just drew, in the student's words. Empty when changed is false."),
});
export type TurnResult = z.infer<typeof TurnResultSchema>;

/** What the browser sends to get a board drawn. */
export const DrawRequestSchema = z.object({
  prompt: z.string().min(1),
  /** The board to edit. Null draws a new one. */
  previousImageUrl: z.url().nullable(),
  level: LevelSchema,
  /** Picks the careful model for a dense final sheet. Basics never needs it. */
  detail: DetailSchema,
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
  /** True when this board carries a hint sketch from Milo, not only what the student said. */
  hinted?: boolean;
};

export type MiloStatus = "off" | "connecting" | "listening" | "thinking" | "drawing" | "speaking";

/** What /api/topic returns for a topic the student typed. The same shape as a preset topic. */
export const NewTopicSchema = z.object({
  ok: z.boolean().describe("False when this is not something a school student would explain, or it is not safe to draw."),
  title: z.string().describe("The topic as a short title in sentence case, at most six words. For example: How a volcano erupts."),
  subject: z.string().describe("One word: the school subject."),
  about: z.string().describe("Finishes Milo's sentence 'I know nothing about ...'. Lower case, a few words. For example: volcanoes."),
  opener: z.string().describe("Milo's first question, lower case, easy to answer. For example: what even is a volcano?"),
  keyIdeas: z
    .array(
      z.object({
        id: z.string().describe("A short lower-case slug."),
        idea: z.string().describe("One sentence a complete explanation says."),
        gapLabel: z.string().describe("A short phrase naming the gap as a question, without the answer. For example: What lets things in."),
        core: z.boolean().describe("True for the three most basic ideas."),
      }),
    )
    .describe("Exactly five, from most basic to most detailed. Exactly three are core."),
});
export type NewTopic = z.infer<typeof NewTopicSchema>;
