// Topics for v2. The cell reuses Ali's key ideas and tested board prompts as they are.
// History is new in v2: how World War II started, drawn as a chain of falling dominoes, so the
// board never needs people, flags, symbols or war scenes.

import { BOARD_EXAMPLES, BOARD_STYLE } from "@/lib/prompts";
import { getTopic, TOPICS, type KeyIdea } from "@/lib/topics";

export type BoardExample = { level: 1 | 2 | 3 | 4; said: string; drawPrompt: string };

export type Subject = "Biology" | "History";
export const V2_SUBJECTS: Subject[] = ["Biology", "History"];

/** A key idea, plus what "close enough" means for it. */
export type V2KeyIdea = KeyIdea & {
  /** What the student must get across for the idea to count as clear. Anything beyond it is bonus. */
  core: string;
  /** The proper word or words. Exam mode wants the student to use them. */
  term: string;
};

export type V2Topic = {
  id: string;
  subject: Subject;
  title: string;
  blurb: string;
  /** What Milo knows nothing about, in a few words: "how a cell works". */
  about: string;
  /** Milo's first line when a session starts. */
  firstMessage: string;
  /** Extra guidance on tone, for serious topics. */
  tone?: string;
  /** Words speech-to-text should listen out for, such as hard names. */
  keywords: string[];
  keyIdeas: V2KeyIdea[];
  /** Tested board prompts for this topic, one per level. Claude matches their style. */
  boardExamples: BoardExample[];
  /** Only ready topics can start a session. The others are shown on the start screen and do nothing. */
  ready: boolean;
};

/** What "close enough" means for each of the cell's key ideas. */
const CELL_GRADING: Record<string, { core: string; term: string }> = {
  membrane: { core: "The outer layer of the cell controls what goes in and out.", term: "membrane" },
  energy: { core: "The mitochondria make the cell's energy. ATP is a bonus.", term: "mitochondria" },
  nucleus: { core: "The nucleus holds the DNA, the cell's instructions.", term: "nucleus, DNA" },
  ribosomes: { core: "Ribosomes make proteins. Following the instructions is a bonus.", term: "ribosomes" },
  golgi: {
    core: "The Golgi, with the rough ER, packs the proteins and sends them where they are needed.",
    term: "Golgi",
  },
};

/** Ali's key ideas for the cell, unchanged, plus what "close enough" means for each. */
function cellIdeas(): V2KeyIdea[] {
  const cell = getTopic("cell");
  if (!cell) throw new Error("The cell topic is missing from src/lib/topics.ts.");
  return cell.keyIdeas.map((idea) => ({ ...idea, ...(CELL_GRADING[idea.id] ?? { core: idea.idea, term: "" }) }));
}

const NO_PEOPLE = "No people, faces, flags or symbols.";
const END = "Do not add any other parts, shapes or words.";

const WW2_EXAMPLES: BoardExample[] = [
  {
    level: 1,
    said: "World War Two started because Germany was angry, and then they attacked.",
    drawPrompt:
      `${BOARD_STYLE} Very messy and childish. A wobbly row of red crayon rectangles in the middle, like dominoes, ` +
      "scribbled over. Top left in red crayon handwriting, spelled exactly: 'World War 2 ?'. On the right in red, " +
      `spelled exactly: 'Germany angry ?' and 'attacked ?'. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 2,
    said: "After the First World War Germany had to sign a treaty and lost a lot, and then there was a big money crisis.",
    drawPrompt:
      "Keep the same paper and crayon style. Redraw the scribble as a rough row of five crayon dominoes standing up, " +
      "from left to right. On the first domino in blue crayon, spelled exactly: 'treaty ?'. On the second domino in " +
      "green, spelled exactly: 'money crisis ?'. Leave the other three dominoes blank, with a purple question mark " +
      `above each. Remove 'Germany angry ?' and 'attacked ?'. Keep 'World War 2 ?' top left. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 3,
    said: "The Treaty of Versailles in 1919 punished Germany, the Depression in 1929 left millions without jobs, and then Hitler took power and broke the treaty.",
    drawPrompt:
      "Keep the same drawing and style, a bit neater, in coloured pencil. The first domino now reads, spelled exactly: " +
      "'Versailles 1919', with a blue highlighter patch beside it reading 'punished Germany'. The second domino reads " +
      "'Depression 1929', with a green highlighter patch reading 'no jobs'. The third domino reads 'Hitler in power'. " +
      "Draw small curved arrows from each domino to the next. Remove the question marks above the first three " +
      `dominoes. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 4,
    said: "Britain and France appeased him at Munich in 1938, then after his pact with Stalin he invaded Poland in 1939, so they declared war.",
    drawPrompt:
      "Keep the same drawing and style, now clean and organised like a finished revision sheet. Title top left: " +
      "'How World War II started'. Five neat dominoes falling to the right, each with a yellow label box in black " +
      "handwriting, spelled exactly: 'Versailles 1919', 'Depression 1929', 'Hitler in power 1933', " +
      "'Appeasement 1938', 'Poland invaded 1939'. A red arrow after the last domino. Remove the old highlighter " +
      `patches, the question marks and 'World War 2 ?'. ${NO_PEOPLE} ${END}`,
  },
];

const CELL: V2Topic = {
  id: "cell",
  subject: "Biology",
  title: "How a cell works",
  blurb: "Every part, and what each one does.",
  about: "how a cell works",
  firstMessage: "Hi, I'm Milo! I don't know anything about cells. Can you explain how a cell works? I'll draw what you say.",
  keywords: ["membrane", "mitochondria", "ATP", "nucleus", "DNA", "ribosomes", "endoplasmic reticulum", "Golgi"],
  keyIdeas: cellIdeas(),
  boardExamples: BOARD_EXAMPLES,
  ready: true,
};

const WW2: V2Topic = {
  id: "ww2",
  subject: "History",
  title: "How World War II started",
  blurb: "From the peace of 1919 to the invasion of Poland.",
  about: "how World War Two started",
  firstMessage:
    "Hi, I'm Milo! I don't know anything about how World War Two started. Can you explain it to me? I'll draw what you say.",
  tone: "This is a serious topic about a war. Milo stays curious and kind, and never jokes about war, death or suffering.",
  keywords: [
    "Versailles",
    "reparations",
    "Depression",
    "Hitler",
    "Nazis",
    "Rhineland",
    "Austria",
    "appeasement",
    "Munich",
    "Sudetenland",
    "Nazi-Soviet Pact",
    "Stalin",
    "Poland",
  ],
  keyIdeas: [
    {
      id: "versailles",
      idea: "The Treaty of Versailles (1919) blamed and punished Germany after the First World War: it lost land, its army was cut to 100,000 men and it had to pay reparations, which left Germans angry and humiliated.",
      gapLabel: "What the last war left behind",
      core: "A harsh peace treaty after the First World War punished Germany, and that made Germans angry or resentful. The year, the lost land, the small army and the reparations are bonus.",
      term: "Treaty of Versailles",
    },
    {
      id: "depression",
      idea: "The Great Depression, from 1929, caused mass unemployment in Germany, about 6 million by 1932, so desperate voters turned to extreme parties.",
      gapLabel: "Why people got desperate",
      core: "An economic crisis left many Germans without jobs or money, so people turned to extreme parties. The year and the numbers are bonus.",
      term: "Great Depression",
    },
    {
      id: "hitler",
      idea: "Hitler and the Nazis took power in 1933 and broke the treaty: Germany rearmed, sent troops into the Rhineland (1936) and took over Austria (1938).",
      gapLabel: "Who took over, and what he broke",
      core: "Hitler and the Nazis took power and broke the treaty, by building up the army or taking land. The years and the places are bonus.",
      term: "Hitler, Nazis",
    },
    {
      id: "appeasement",
      idea: "Britain and France followed appeasement, giving Hitler what he wanted to avoid another war, as at Munich in 1938 when Germany was handed the Sudetenland.",
      gapLabel: "Why nobody stopped him",
      core: "Britain and France let Hitler have what he wanted, to avoid another war. Munich and the Sudetenland are bonus.",
      term: "appeasement",
    },
    {
      id: "poland",
      idea: "After the Nazi-Soviet Pact (August 1939), Germany invaded Poland on 1 September 1939, and Britain and France declared war on Germany on 3 September.",
      gapLabel: "What finally started the war",
      core: "Germany invaded Poland in 1939, so Britain and France declared war on Germany. The Nazi-Soviet Pact and the exact days are bonus.",
      term: "invasion of Poland",
    },
  ],
  boardExamples: WW2_EXAMPLES,
  ready: true,
};

/** Shown on the start screen, not built yet. */
function placeholder(id: string, subject: Subject, title: string, blurb: string): V2Topic {
  return {
    id,
    subject,
    title,
    blurb,
    about: "",
    firstMessage: "",
    keywords: [],
    keyIdeas: [],
    boardExamples: [],
    ready: false,
  };
}

export const V2_TOPICS: V2Topic[] = [
  CELL,
  // Ali's other biology topics, shown but not built.
  ...TOPICS.filter((topic) => topic.subject === "Biology" && !topic.ready).map((topic) =>
    placeholder(topic.id, "Biology", topic.title, topic.blurb),
  ),
  WW2,
  placeholder("industrial", "History", "The Industrial Revolution", "Steam, factories and the first big cities."),
  placeholder("silk-road", "History", "The Silk Road", "How goods and ideas crossed Asia."),
  placeholder("rome", "History", "The fall of Rome", "Why a giant empire broke apart."),
];

export function getV2Topic(id: string): V2Topic | undefined {
  return V2_TOPICS.find((topic) => topic.id === id);
}
