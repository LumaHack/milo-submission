// Board layouts (docs/V2.md, "Board layouts"). A cell, a process, the causes of a war and an event
// each need a different drawing. Every topic names one layout. A built-in topic brings its own tested
// drawing instructions; a part of a student's course has none, so the brain prompt gives Claude that
// layout's paragraph and its four tested examples instead (src/lib/v2/prompts.ts).
//
// The examples were drawn with fal in order, each editing the board before it, the way a session
// does. Results and timings are in docs/V2.md. Change a layout's examples and you must draw them again.

import { z } from "zod";

import { BOARD_EXAMPLES, BOARD_STYLE } from "@/lib/prompts";

export const LAYOUT_KINDS = ["structure", "process", "causes", "event", "comparison"] as const;
export const LayoutKindSchema = z.enum(LAYOUT_KINDS);
export type LayoutKind = z.infer<typeof LayoutKindSchema>;

export type BoardExample = { level: 1 | 2 | 3 | 4; said: string; drawPrompt: string };

export type Layout = {
  kind: LayoutKind;
  /** For Claude when it reads a course: which topics this layout suits. */
  suits: string;
  /** How the paper is organised, for the brain prompt. */
  organisation: string;
  /** What a hint looks like on this layout: how Milo points at it, and how it is drawn and removed. */
  hint: { pointAt: string; milo: string; draw: string; remove: string };
  /** The topic the examples were written for. */
  sample: string;
  examples: BoardExample[];
};

const NO_PEOPLE = "No people, faces, flags or symbols.";
const END = "Do not add any other parts, shapes or words.";

/** The hint wording the cell and World War II prompts were tested with. Built-in topics keep it word for word. */
export const TESTED_HINT: Layout["hint"] = {
  pointAt: "the empty dotted outline with a question mark that the board now shows where the missing part goes",
  milo: "See the empty dotted circle in the middle? Something lives there. What is it?",
  draw: "an empty dotted outline with a big question mark where the missing part would go",
  remove: "the dotted outline",
};

/** How World War II started, drawn as falling dominoes. Tested on Sat 14 Nov: 4.8, 7.1, 6.5 and 6.4 s. */
export const WW2_EXAMPLES: BoardExample[] = [
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

/** Photosynthesis, drawn as a chain of boxes. */
const PROCESS_EXAMPLES: BoardExample[] = [
  {
    level: 1,
    said: "Plants make their food from the sun somehow.",
    drawPrompt:
      `${BOARD_STYLE} Very messy and childish. A wobbly row of three green crayon boxes in the middle, joined by ` +
      "shaky arrows pointing right, scribbled over. Top left in green crayon handwriting, spelled exactly: " +
      "'Photosynthesis ?'. On the right in green, spelled exactly: 'makes food ?' and 'from the sun ?'. " +
      `${NO_PEOPLE} ${END}`,
  },
  {
    level: 2,
    said: "The leaf takes in sunlight and water, something happens inside, and sugar comes out.",
    drawPrompt:
      "Keep the same paper and crayon style. Redraw the scribble as a rough row of four crayon boxes from left to " +
      "right, joined by arrows. In the first box in yellow crayon, spelled exactly: 'sunlight and water in'. In the " +
      "last box in orange, spelled exactly: 'sugar out ?'. Leave the two middle boxes blank, with a purple question " +
      `mark inside each. Remove 'makes food ?' and 'from the sun ?'. Keep 'Photosynthesis ?' top left. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 3,
    said: "In the chloroplast the light reactions split water, which releases oxygen, and they make ATP for the next stage.",
    drawPrompt:
      "Keep the same drawing and style, a bit neater, in coloured pencil. The second box now reads, spelled exactly: " +
      "'Light reactions', with a yellow highlighter patch under it reading 'split water, make ATP'. Draw a blue arrow " +
      "going up out of the second box, labelled 'oxygen'. Remove the question mark in the second box. Keep the third " +
      `box blank with its question mark. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 4,
    said: "Then the Calvin cycle uses that ATP and carbon dioxide from the air to build glucose.",
    drawPrompt:
      "Keep the same drawing and style, now clean and organised like a finished revision sheet. Title top left: " +
      "'Photosynthesis'. Four neat boxes in a row joined by arrows, each with a yellow label box in black " +
      "handwriting, spelled exactly: 'Sunlight, water, CO2 in', 'Light reactions: make ATP', " +
      "'Calvin cycle: builds glucose', 'Glucose out'. Keep the blue arrow labelled 'oxygen' above the second box. " +
      `Remove the old highlighter patch, the question marks and 'Photosynthesis ?'. ${NO_PEOPLE} ${END}`,
  },
];

/** The Great Fire of London, drawn as a timeline of boxes, a simple map and an outcome box. */
const EVENT_EXAMPLES: BoardExample[] = [
  {
    level: 1,
    said: "There was a huge fire in London a long time ago and it burned loads of houses.",
    drawPrompt:
      `${BOARD_STYLE} Very messy and childish. A shaky black crayon line across the top, like a timeline, with one ` +
      "wobbly empty box hanging under it. Below it a rough brown crayon blob for a town, scribbled over in orange. " +
      "Top left in orange crayon handwriting, spelled exactly: 'Great Fire of London ?'. On the right in orange, " +
      `spelled exactly: 'huge fire ?' and 'houses burned ?'. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 2,
    said: "It started in a bakery in 1666 and the wind pushed it across the city.",
    drawPrompt:
      "Keep the same paper and crayon style. Redraw the top as a rough crayon timeline: one long line with exactly " +
      "three small boxes hanging under it, side by side from left to right. In the first box in red crayon, spelled " +
      "exactly: '1666'. Put one purple question mark inside the second box and one inside the third box. Redraw the " +
      "blob as a rough map: a plain brown crayon outline of a city, with a small red square inside it labelled, " +
      "spelled exactly: 'bakery'. Orange arrows spread from the square to the right, labelled 'wind'. Remove " +
      `'huge fire ?' and 'houses burned ?'. Keep 'Great Fire of London ?' top left. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 3,
    said: "It began on the second of September in Pudding Lane, and because the houses were wooden and packed together it burned for four days.",
    drawPrompt:
      "Keep the same drawing and style, a bit neater, in coloured pencil. The first box on the timeline now reads, " +
      "spelled exactly: '2 Sept 1666'. The second box now reads 'burns 4 days' in place of its question mark. The " +
      "third box keeps its question mark. The red square now reads 'Pudding Lane' instead of 'bakery'. Add a yellow " +
      `highlighter patch inside the city reading 'wooden houses, packed together'. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 4,
    said: "People pulled down houses to make gaps and the wind dropped, so it stopped. About thirteen thousand houses were gone, and London was rebuilt in brick and stone.",
    drawPrompt:
      "Keep the same drawing and style, now clean and organised like a finished revision sheet. Title top left: " +
      "'The Great Fire of London'. A neat timeline along the top with exactly three yellow label boxes in black " +
      "handwriting, from left to right, spelled exactly: '2 Sept 1666', 'burns 4 days', 'gaps stop it'. Below " +
      "it the simple map of the city with one labelled zone, 'Pudding Lane', and the orange arrows labelled 'wind'. " +
      "Bottom right an outcome box with a thick black border, spelled exactly: '13,000 houses lost, rebuilt in brick " +
      `and stone'. Remove the old highlighter patch, the question marks and 'Great Fire of London ?'. ${NO_PEOPLE} ${END}`,
  },
];

/** Mitosis and meiosis, drawn as a table with two columns. */
const COMPARISON_EXAMPLES: BoardExample[] = [
  {
    level: 1,
    said: "Mitosis and meiosis are both ways that cells split, but they're different somehow.",
    drawPrompt:
      `${BOARD_STYLE} Very messy and childish. A wobbly purple crayon line down the middle of the paper, splitting ` +
      "it into a left half and a right half. A scribbled blue circle on the left and a scribbled green circle on the " +
      "right. Top left in blue crayon handwriting, spelled exactly: 'Mitosis ?'. Top right in green, spelled exactly: " +
      `'Meiosis ?'. At the bottom in purple, spelled exactly: 'cells split ?'. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 2,
    said: "Mitosis makes two cells and meiosis makes four, I think.",
    drawPrompt:
      "Keep the same paper and crayon style. Redraw it as a rough crayon table with two columns and three rows. In " +
      "the first row on the left in blue, spelled exactly: '2 cells', and on the right in green: '4 cells'. Leave the " +
      "other two rows blank, with a purple question mark in each. Keep 'Mitosis ?' above the left column and " +
      `'Meiosis ?' above the right column. Remove 'cells split ?' and the scribbled circles. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 3,
    said: "The two cells from mitosis are identical copies, for growth and repair. The four from meiosis are all different.",
    drawPrompt:
      "Keep the same drawing and style, a bit neater, in coloured pencil. Keep the first row as it is: '2 cells' and " +
      "'4 cells'. In the second row, in place of its question marks, write on the left in blue, spelled exactly: " +
      "'identical copies', and on the right in green: 'all different'. Beside 'identical copies' add a small blue " +
      `highlighter patch reading 'growth and repair'. Keep the third row blank with its question marks. ${NO_PEOPLE} ${END}`,
  },
  {
    level: 4,
    said: "Meiosis makes sex cells with half the chromosomes, so it divides twice. Mitosis keeps the full set and divides once.",
    drawPrompt:
      "Keep the same drawing and style, now clean and organised like a finished revision sheet. One title across the " +
      "very top, above the table: 'Mitosis and meiosis'. Under it a neat table with two columns headed 'Mitosis' and " +
      "'Meiosis' and three rows, every entry in a yellow label box in black handwriting, spelled exactly: " +
      "'2 identical cells' and '4 different cells'; 'growth and repair' and 'sex cells'; 'full set, divides once' " +
      "and 'half set, divides twice'. Remove the old highlighter patch, every question mark, 'Mitosis ?' and " +
      `'Meiosis ?'. ${NO_PEOPLE} ${END}`,
  },
];

export const LAYOUTS: Record<LayoutKind, Layout> = {
  structure: {
    kind: "structure",
    suits: "a thing and its parts: how a cell works, the heart, an atom, a volcano, a machine",
    organisation:
      "One drawing of the thing itself in the middle of the paper. Its parts are drawn inside or around it, each " +
      "with a handwritten label and an arrow.",
    hint: {
      pointAt: "the empty dotted outline with a question mark that the board now shows where the missing part goes",
      milo: "See the empty dotted shape with the question mark? Something goes there. What is it?",
      draw: "an empty dotted outline with a big question mark where the missing part would go",
      remove: "the dotted outline",
    },
    sample: "How a cell works",
    examples: BOARD_EXAMPLES,
  },
  process: {
    kind: "process",
    suits: "steps that follow one another: photosynthesis, how a bill becomes law, the water cycle, digestion",
    organisation:
      "A chain of boxes joined by arrows, one box per stage, in a row from left to right, or in a loop when the " +
      "last stage leads back to the first. What goes in is on the left, what comes out is on the right.",
    hint: {
      pointAt: "the empty box with a question mark that the board now shows in the chain, where the missing stage goes",
      milo: "See the empty box in my chain, with the question mark? Something happens there. What is it?",
      draw: "an empty box with a big question mark in the chain, where the missing stage would go",
      remove: "the question mark",
    },
    sample: "Photosynthesis",
    examples: PROCESS_EXAMPLES,
  },
  causes: {
    kind: "causes",
    suits: "why something happened, one cause leading to the next: how a war started, why an empire fell, a crisis",
    organisation:
      "A row of dominoes standing up, from left to right, one per cause, each one knocking over the next. The " +
      "outcome comes after the last domino. Never a scene of the events themselves.",
    hint: {
      pointAt: "the blank domino with a question mark that the board now shows, where the missing cause goes",
      milo: "See the blank domino with the question mark? Something knocked the next one over. What was it?",
      draw: "a blank domino with a big question mark above it, where the missing cause would go",
      remove: "the question mark",
    },
    sample: "How World War II started",
    examples: WW2_EXAMPLES,
  },
  event: {
    kind: "event",
    suits: "one event in a place and a time: a battle, a revolution's key day, a disaster, an expedition",
    organisation:
      "A timeline along the top: one line with three or four small boxes hanging under it, in order from left to " +
      "right. Below it a simple map made of plain outlines with labelled zones and arrows, and an outcome box bottom " +
      "right. The map is a diagram, never a scene: no figures, vehicles or weapons.",
    hint: {
      pointAt: "the empty box with a question mark on the timeline, or the unlabelled zone on the map, that the board now shows",
      milo: "See the empty box on my timeline, with the question mark? Something happened there. What was it?",
      draw: "an empty box with a big question mark on the timeline, or an unlabelled dotted zone with a question mark on the map, where the missing part would go",
      remove: "the question mark",
    },
    sample: "The Great Fire of London",
    examples: EVENT_EXAMPLES,
  },
  comparison: {
    kind: "comparison",
    suits: "two things side by side: mitosis and meiosis, arteries and veins, two theories, two systems",
    organisation:
      "A table with two columns, one per thing, its name above each column. Each row compares one point: the same " +
      "point on the left and on the right. A table may hold up to six short entries.",
    hint: {
      pointAt: "the empty row with question marks that the board now shows in the table, where the missing point goes",
      milo: "See the empty row in my table, with the question marks? What goes on each side?",
      draw: "an empty row with a big question mark on each side of the table, where the missing point would go",
      remove: "the question marks",
    },
    sample: "Mitosis and meiosis",
    examples: COMPARISON_EXAMPLES,
  },
};
