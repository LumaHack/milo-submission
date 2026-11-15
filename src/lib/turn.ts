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
      .array(
        z.object({
          id: z.string(),
          idea: z.string(),
          gap: z.string().optional(),
          /** Where the student's notes say it, such as "slide 6". Only for topics made from notes. */
          where: z.string().max(40).optional(),
          /** Words that would give this idea away. Milo may only use them once the student has. */
          terms: z.array(z.string().max(40)).max(12).optional(),
        }),
      )
      .min(1)
      .max(8),
    /** Facts from the student's own notes. When present, the notes are the marking scheme. */
    notes: z
      .object({
        facts: z.array(z.object({ text: z.string().max(300), where: z.string().max(40) })).max(40),
      })
      .optional(),
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
  wantsToStop: z
    .boolean()
    .describe("True when the student's latest turn clearly asks to stop or says they have nothing more to add."),
  offTopic: z
    .boolean()
    .describe("True only when the latest turn is clearly not about this topic: small talk, a joke, another subject, or asking for the answer."),
  said: z.string().describe("The student's latest turn as one sentence of at most 20 words, in their own words."),
  changed: z
    .boolean()
    .describe("False when the latest turn added nothing that can be drawn. The board is then left as it is."),
  drawPrompt: z.string().describe("Instruction for the image model. Repeats the previous one when changed is false."),
  drew: z
    .string()
    .describe("One short spoken sentence in which Milo says what he just drew, in the student's words. Empty when changed is false."),
});
export type TurnResult = z.infer<typeof TurnResultSchema> & {
  /** Filled in by /api/turn, not the model: words in Milo's lines that would have given the answer away. */
  checked?: { leaks: string[]; fallback: boolean };
};

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
        terms: z
          .array(z.string())
          .describe("Proper names and technical words that would give this idea away, singular and plural. Never everyday words. Up to six."),
      }),
    )
    .describe("Exactly five, from most basic to most detailed. Exactly three are core."),
});
export type NewTopic = z.infer<typeof NewTopicSchema>;

/** What /api/notes asks Claude for: the topics in the student's own notes, built only from what the notes say. */
export const NotesResultSchema = z.object({
  ok: z.boolean().describe("False when these are not study notes, there is too little to draw, or drawing it is not safe."),
  reason: z.string().describe("When ok is false, one plain sentence for the student saying why. Otherwise empty."),
  subject: z.string().describe("One word: the school or university subject."),
  topics: z
    .array(
      z.object({
        title: z.string().describe("The topic as a short title in sentence case, at most six words."),
        blurb: z.string().describe("Where the topic is in the notes, for example: Slides 3 to 9."),
        about: z.string().describe("Finishes Milo's sentence 'I know nothing about ...'. Lower case, a few words."),
        opener: z.string().describe("Milo's first question, lower case, easy to answer."),
        keyIdeas: z
          .array(
            z.object({
              id: z.string().describe("A short lower-case slug."),
              idea: z.string().describe("One sentence of what the notes say, in the notes' own terms."),
              gapLabel: z.string().describe("A short phrase naming the gap as a question, without the answer."),
              core: z.boolean().describe("True for the three most basic ideas."),
              where: z.string().describe("Where the notes say it: 'slide 4', 'page 2' or 'transcript 12:40'."),
              terms: z
                .array(z.string())
                .describe("Proper names and technical words that would give this idea away, singular and plural. Never everyday words. Up to six."),
            }),
          )
          .describe("Exactly five, from most basic to most detailed. Exactly three are core."),
        facts: z
          .array(
            z.object({
              text: z.string().describe("One short statement the notes make about this topic."),
              where: z.string().describe("Where the notes say it."),
            }),
          )
          .describe("Up to 30 statements from the notes about this topic: definitions, names, numbers, causes."),
      }),
    )
    .describe("One to four topics, most important first. Empty when ok is false."),
});
export type NotesResult = z.infer<typeof NotesResultSchema>;
