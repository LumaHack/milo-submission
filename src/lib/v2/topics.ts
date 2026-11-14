// Topics for v2. The cell reuses Ali's key ideas and tested board prompts as they are.

import { BOARD_EXAMPLES } from "@/lib/prompts";
import { getTopic, type KeyIdea } from "@/lib/topics";

export type BoardExample = { level: 1 | 2 | 3 | 4; said: string; drawPrompt: string };

export type V2Topic = {
  id: string;
  subject: "Biology" | "History";
  title: string;
  blurb: string;
  /** What Milo knows nothing about, in a few words: "how a cell works". */
  about: string;
  /** Milo's first line when a session starts. */
  firstMessage: string;
  keyIdeas: KeyIdea[];
  /** Tested board prompts for this topic, one per level. Claude matches their style. */
  boardExamples: BoardExample[];
  /** Only ready topics can start a session. */
  ready: boolean;
};

function cellIdeas(): KeyIdea[] {
  const cell = getTopic("cell");
  if (!cell) throw new Error("The cell topic is missing from src/lib/topics.ts.");
  return cell.keyIdeas;
}

export const V2_TOPICS: V2Topic[] = [
  {
    id: "cell",
    subject: "Biology",
    title: "How a cell works",
    blurb: "Every part, and what each one does.",
    about: "how a cell works",
    firstMessage: "Hi, I'm Milo! I don't know anything about cells. Can you explain how a cell works? I'll draw what you say.",
    keyIdeas: cellIdeas(),
    boardExamples: BOARD_EXAMPLES,
    ready: true,
  },
];

export function getV2Topic(id: string): V2Topic | undefined {
  return V2_TOPICS.find((topic) => topic.id === id);
}
