// Nolan, the witness-interview mode. These shapes are shared by the brain routes under /api/nolan
// and the three Nolan screens. They match "Nolan" in docs/SPEC.md. Change both together.

import { z } from "zod";

/** One of the five questions every witness is asked. The fifth is always about how it felt. */
export const QuestionSchema = z.object({
  id: z.string().describe("A short lower-case slug. The fifth question's id is always 'mood'."),
  label: z.string().describe("The row heading when accounts are compared, at most three words. For example: Room."),
  ask: z.string().describe("The question Nolan asks out loud. Open, with no possible answer inside it."),
});
export type Question = z.infer<typeof QuestionSchema>;

/** The id of the question about how the moment felt. It sets the light of a reconstruction and is never compared. */
export const MOOD_ID = "mood";

/** What /api/nolan/case returns for a moment someone typed. */
export const NewCaseSchema = z.object({
  ok: z.boolean().describe("False when this is not a moment several people could have witnessed, or it is not safe to draw."),
  title: z.string().describe("The moment as a short title in sentence case, at most six words. For example: The opening ceremony."),
  questions: z.array(QuestionSchema).describe("Exactly five. The fifth is the mood question."),
});

/** How sure the witness sounded, judged from their words only. */
export const SureSchema = z.enum(["sure", "fairly", "unsure"]);
export type Sure = z.infer<typeof SureSchema>;

/** One thing the witness stated, tied to the question it answers. */
export const FactSchema = z.object({
  questionId: z.string(),
  value: z.string().describe("The answer in at most five of the witness's own words. For example: packed."),
  quote: z.string().describe("The words it came from, exactly as said, at most 20 words."),
  sure: SureSchema,
  doubt: z.string().describe("The doubt words that were heard, for example: um, I think. Empty when sure."),
  struck: z.array(z.string()).describe("Earlier answers to this question that the witness took back, oldest first."),
});
export type Fact = z.infer<typeof FactSchema>;

export const TurnSchema = z.object({ who: z.enum(["nolan", "witness"]), text: z.string() });
export type Turn = z.infer<typeof TurnSchema>;

/** What the browser sends after each thing the witness says. */
export const ExtractRequestSchema = z.object({
  moment: z.string().min(1).max(120),
  questions: z.array(QuestionSchema).min(1).max(8),
  /** The interview so far, oldest first. */
  turns: z.array(TurnSchema).min(1),
  /** What earlier witnesses answered, so a clash can be spotted. Never shown to this witness. */
  others: z.array(z.object({ questionId: z.string(), values: z.array(z.string()) })),
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

export const ExtractResultSchema = z.object({
  facts: z.array(FactSchema).describe("One per question answered so far, in question order. Never one for the mood question."),
  mood: z.string().describe("One lower-case word for how the moment felt to the witness, from their own words. Empty until they have said."),
  clashQuestionId: z
    .string()
    .nullable()
    .describe("The question where this witness's answer cannot be true together with an earlier witness's. Null when there is none."),
});
export type ExtractResult = z.infer<typeof ExtractResultSchema>;

/** One witness's finished account. */
export const WitnessSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  facts: z.array(FactSchema),
  mood: z.string(),
});

export const CompareRequestSchema = z.object({
  moment: z.string().min(1).max(120),
  questions: z.array(QuestionSchema).min(1).max(8),
  witnesses: z.array(WitnessSchema).min(2).max(6),
});
export type CompareRequest = z.infer<typeof CompareRequestSchema>;

export const VerdictSchema = z.enum(["agree", "close", "clash", "alone", "unasked"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const CompareResultSchema = z.object({
  rows: z
    .array(
      z.object({
        questionId: z.string(),
        verdict: VerdictSchema,
        shared: z.string().describe("What goes into the shared scene. Empty unless the verdict is agree or close."),
        note: z.string().describe("What differs, in at most 12 words. Empty when they agree."),
      }),
    )
    .describe("One per question except the mood question, in question order."),
  finding: z.string().describe("Nolan's finding in one dry sentence."),
  sharedPrompt: z.string().describe("Instruction for the image model: the scene drawn only from what the accounts share."),
  versions: z
    .array(
      z.object({
        witnessId: z.string(),
        changes: z.array(z.string()).describe("The details only this version shows, each a short phrase. For example: room, half empty."),
        light: z.string().describe("How this witness's mood sets the light, in a few words."),
        prompt: z.string().describe("Instruction that edits the shared scene into this witness's version."),
      }),
    )
    .describe("One per witness, in the order given."),
});
export type CompareResult = z.infer<typeof CompareResultSchema>;

// ---------------------------------------------------------------------------
// What the browser keeps. There is no database: a case lives in localStorage.
// ---------------------------------------------------------------------------

export type Witness = {
  id: string;
  name: string;
  turns: Turn[];
  facts: Fact[];
  mood: string;
  /** Questions where Nolan stopped the witness because another account says otherwise. */
  checked: string[];
  seconds: number;
  savedAt: number;
};

export type Film = { url?: string; job?: { requestId: string; startedAt: number } };

export type Reconstruction = CompareResult & {
  /** The witnesses this comparison covers. A new or removed witness makes it out of date. */
  witnessIds: string[];
  sharedImageUrl: string | null;
  /** Each witness's version, by witness id. */
  images: Record<string, string>;
  films: Record<string, Film>;
};

export type CaseFile = {
  id: string;
  title: string;
  questions: Question[];
  witnesses: Witness[];
  /** The witness being interviewed right now, between the case screen and the interview. */
  interviewing: { id: string; name: string } | null;
  reconstruction: Reconstruction | null;
  createdAt: number;
};

/** Which of the five questions this witness has answered. Mood counts once they have said how it felt. */
export function answeredIds(questions: Question[], facts: Fact[], mood: string): string[] {
  return questions
    .filter((question) => (question.id === MOOD_ID ? mood.trim().length > 0 : facts.some((fact) => fact.questionId === question.id)))
    .map((question) => question.id);
}

/** What earlier witnesses said, question by question, for clash spotting. */
export function othersFor(file: CaseFile, witnessId: string): ExtractRequest["others"] {
  return file.questions
    .filter((question) => question.id !== MOOD_ID)
    .map((question) => ({
      questionId: question.id,
      values: file.witnesses
        .filter((witness) => witness.id !== witnessId)
        .flatMap((witness) => witness.facts.filter((fact) => fact.questionId === question.id).map((fact) => fact.value)),
    }))
    .filter((entry) => entry.values.length > 0);
}

/** True when the stored comparison still covers exactly the witnesses on file. */
export function reconstructionIsCurrent(file: CaseFile): boolean {
  const ids = file.witnesses.map((witness) => witness.id);
  const done = file.reconstruction?.witnessIds ?? [];
  return done.length === ids.length && ids.every((id) => done.includes(id));
}

export const SURE_LABEL: Record<Sure, string> = { sure: "Sure", fairly: "Fairly sure", unsure: "Unsure" };
