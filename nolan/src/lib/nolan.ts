// The shapes shared by Nolan's server routes and screens. They match docs/SPEC.md. Change both together.

import { z } from "zod";

/** One thing every witness's account is checked for, and the open question that covers it. */
export const DetailSchema = z.object({
  id: z.string().describe("A short lower-case slug."),
  label: z.string().describe("The row heading when accounts are compared, a few words in sentence case. For example: Which way he went."),
  ask: z.string().describe("An open question that covers it. No possible answer inside it."),
});
export type Detail = z.infer<typeof DetailSchema>;

/** What /api/case returns for an incident someone typed. */
export const NewCaseSchema = z.object({
  ok: z.boolean().describe("False when this is not something witnesses could be interviewed about, or it is not safe to draw."),
  title: z.string().describe("The incident as a short title in sentence case, at most seven words. For example: Bike theft outside the library."),
  opener: z.string().describe("Nolan's first question: an open invitation to tell everything they saw, from the start."),
  details: z.array(DetailSchema).describe("Exactly five."),
});

/** How sure the witness sounded, judged from their words only. */
export const SureSchema = z.enum(["sure", "fairly", "unsure"]);
export type Sure = z.infer<typeof SureSchema>;

/** One thing the witness stated, tied to the detail it covers. */
export const FactSchema = z.object({
  detailId: z.string(),
  value: z.string().describe("What they said, as a short note in their own words. For example: Red jacket."),
  quote: z.string().describe("The words it came from, exactly as said, at most 20 words."),
  sure: SureSchema,
  doubt: z.string().describe("The doubt words that were heard, for example: um, I think. Empty when sure."),
  struck: z.array(z.string()).describe("Earlier versions of this note that the witness took back, oldest first."),
});
export type Fact = z.infer<typeof FactSchema>;

export const TurnSchema = z.object({ who: z.enum(["nolan", "witness"]), text: z.string() });
export type Turn = z.infer<typeof TurnSchema>;

/** What the browser sends after each thing the witness says. */
export const ExtractRequestSchema = z.object({
  title: z.string().min(1).max(160),
  details: z.array(DetailSchema).min(1).max(8),
  /** The interview so far, oldest first. */
  turns: z.array(TurnSchema).min(1),
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

export const ExtractResultSchema = z.object({
  facts: z.array(FactSchema).describe("One per detail the witness has covered so far, in the order the details were given."),
});
export type ExtractResult = z.infer<typeof ExtractResultSchema>;

export const CompareRequestSchema = z.object({
  title: z.string().min(1).max(160),
  details: z.array(DetailSchema).min(1).max(8),
  witnesses: z
    .array(
      z.object({
        id: z.string(),
        /** "Witness 1". Accounts carry no names. */
        label: z.string(),
        where: z.string(),
        facts: z.array(FactSchema),
      }),
    )
    .min(2)
    .max(6),
});
export type CompareRequest = z.infer<typeof CompareRequestSchema>;

export const ResultSchema = z.enum(["agree", "same", "close", "differ", "alone", "none"]);
export type Result = z.infer<typeof ResultSchema>;

export const CompareResultSchema = z.object({
  rows: z
    .array(
      z.object({
        detailId: z.string(),
        result: ResultSchema,
        shared: z.string().describe("What goes into the shared scene. Empty unless the result is agree, same or close."),
        subject: z.string().describe("The detail as a short noun phrase for a sentence, such as: the jacket. Lower case."),
      }),
    )
    .describe("One per detail, in the order given."),
  askNext: z.array(z.string()).describe("Two or three things worth asking or checking next, one sentence each."),
  sharedPrompt: z.string().describe("Instruction for the image model: the scene drawn only from what the accounts share."),
  sharedCaption: z.string().describe("One or two sentences: what everyone agrees on, and which details are left blank because the accounts differ."),
  versions: z
    .array(
      z.object({
        witnessId: z.string(),
        caption: z.string().describe("What this version shows where the accounts differ, in a few words. For example: Red jacket, went right to the road."),
        differsOn: z.array(z.string()).describe("The subjects this witness is in the minority on, such as: the jacket. Empty when they side with the majority."),
        matches: z.array(z.string()).describe("Labels of the other witnesses whose account says the same on every disputed detail."),
        prompt: z.string().describe("Instruction that edits the shared scene into this witness's version."),
      }),
    )
    .describe("One per witness, in the order given."),
});
export type CompareResult = z.infer<typeof CompareResultSchema>;

// ---------------------------------------------------------------------------
// What the browser keeps. There is no database: cases live in localStorage.
// ---------------------------------------------------------------------------

export type Witness = {
  id: string;
  /** Where they were, as the investigator noted it. For example: Was across the road. */
  where: string;
  status: "waiting" | "underway" | "done";
  turns: Turn[];
  facts: Fact[];
  /** How long the interview has run, in seconds. */
  seconds: number;
};

export type Comparison = CompareResult & {
  /** Which accounts this comparison was made from. It is out of date once they change. */
  basis: string;
  sharedImageUrl: string | null;
  /** Each witness's scene, by witness id. */
  images: Record<string, string>;
};

export type CaseFile = {
  id: string;
  /** For example 26-1187. */
  number: string;
  title: string;
  opener: string;
  details: Detail[];
  witnesses: Witness[];
  /** The witness whose interview is open on this device. */
  interviewingId: string | null;
  comparison: Comparison | null;
  createdAt: number;
};

/** "Witness 3". Accounts carry no names. */
export function witnessLabel(file: CaseFile, witnessId: string): string {
  return `Witness ${file.witnesses.findIndex((witness) => witness.id === witnessId) + 1}`;
}

/** The witnesses whose interview has finished. */
export function finished(file: CaseFile): Witness[] {
  return file.witnesses.filter((witness) => witness.status === "done");
}

/** A fingerprint of the finished accounts, so a stored comparison knows when it is out of date. */
export function basisOf(file: CaseFile): string {
  return finished(file)
    .map((witness) => `${witness.id}:${witness.facts.map((fact) => `${fact.detailId}=${fact.value}`).join("|")}`)
    .join(";");
}

/** The stored comparison, if it still covers exactly the finished accounts. */
export function currentComparison(file: CaseFile): Comparison | null {
  return file.comparison && file.comparison.basis === basisOf(file) ? file.comparison : null;
}

/** No pictures exist until every interview is finished. */
export function scenesAllowed(file: CaseFile): boolean {
  return file.witnesses.length >= 2 && file.witnesses.every((witness) => witness.status === "done");
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];

/** "Three details agree so far. Two are disputed." */
export function tally(rows: CompareResult["rows"]): { agree: number; differ: number; line: string } {
  const agree = rows.filter((row) => row.result === "agree" || row.result === "same" || row.result === "close").length;
  const differ = rows.filter((row) => row.result === "differ").length;
  const word = (count: number) => NUMBER_WORDS[count] ?? String(count);
  const line = `${word(agree)} ${agree === 1 ? "detail agrees" : "details agree"} so far. ${word(differ)} ${differ === 1 ? "is" : "are"} disputed.`;
  return { agree, differ, line };
}

/** "the jacket and the direction" */
export function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
