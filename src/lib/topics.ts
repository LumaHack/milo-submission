// Topics a student can explain to Milo, and the key ideas a full explanation covers.
// The key ideas are the marking scheme: Claude scores each one every turn.
// A topic is either one of the presets below or made on the spot by /api/topic from what the student typed.

export type KeyIdea = {
  id: string;
  /** What a complete explanation says. Never shown to the student. */
  idea: string;
  /** How the gap is named on screen. A question, so it never gives the answer away. */
  gapLabel: string;
  /** Core ideas are the ones asked for at the Basics level of detail. */
  core: boolean;
  /** Where the student's own notes say this, such as "slide 6". Only for topics made from notes. */
  where?: string;
  /**
   * The proper names and technical words that would give this idea away if Milo said them first.
   * Milo's lines are checked against them (src/lib/line-check.ts).
   */
  terms?: string[];
};

/** One short statement taken from the student's notes, and where it is. The fact check uses these. */
export type NoteFact = { text: string; where: string };

/** What a topic made from the student's notes carries along: the file names and the facts in them. */
export type TopicNotes = { files: string[]; facts: NoteFact[] };

export type Topic = {
  id: string;
  subject: string;
  title: string;
  blurb: string;
  /** Finishes Milo's "I know nothing about ...". For example "cells". */
  about: string;
  /** Milo's first question, so the student knows where to start. For example "what even is a cell?". */
  opener: string;
  /** Only ready topics have key ideas and can start a session. */
  ready: boolean;
  keyIdeas: KeyIdea[];
  /** Set when the topic was made from the student's own notes. Then only the notes count as right. */
  notes?: TopicNotes;
};

export const SUBJECTS = ["Biology", "History", "Chemistry", "Physics"] as const;

export const TOPICS: Topic[] = [
  {
    id: "cell",
    subject: "Biology",
    title: "How a cell works",
    blurb: "Every part, and what each one does.",
    about: "cells",
    opener: "what even is a cell?",
    ready: true,
    keyIdeas: [
      {
        id: "membrane",
        idea: "The cell membrane surrounds the cell and controls what enters and leaves.",
        gapLabel: "What lets things in",
        core: true,
        terms: ["membrane", "cell membrane"],
      },
      {
        id: "energy",
        idea: "Mitochondria release the cell's energy, as ATP.",
        gapLabel: "Where the energy comes from",
        core: true,
        terms: ["mitochondria", "mitochondrion", "ATP"],
      },
      {
        id: "nucleus",
        idea: "The nucleus holds the DNA, which carries the instructions for the cell.",
        gapLabel: "Who gives the instructions",
        core: true,
        terms: ["nucleus", "nuclei", "DNA"],
      },
      {
        id: "ribosomes",
        idea: "Ribosomes build proteins by following those instructions.",
        gapLabel: "How proteins get made",
        core: false,
        terms: ["ribosome"],
      },
      {
        id: "golgi",
        idea: "The rough ER and the Golgi process, pack and send the proteins where they are needed.",
        gapLabel: "Where the proteins go next",
        core: false,
        terms: ["Golgi", "endoplasmic reticulum", "rough ER"],
      },
    ],
  },
  {
    id: "heart",
    subject: "Biology",
    title: "How the heart pumps blood",
    blurb: "Four chambers and two loops.",
    about: "hearts",
    opener: "what does a heart actually do?",
    ready: false,
    keyIdeas: [],
  },
  {
    id: "neuron",
    subject: "Biology",
    title: "How a neuron fires",
    blurb: "From a touch to a signal in the brain.",
    about: "neurons",
    opener: "what even is a neuron?",
    ready: false,
    keyIdeas: [],
  },
  {
    id: "photosynthesis",
    subject: "Biology",
    title: "Photosynthesis",
    blurb: "How a leaf turns light into sugar.",
    about: "photosynthesis",
    opener: "what is a leaf actually doing all day?",
    ready: false,
    keyIdeas: [],
  },
];

export const DEFAULT_TOPIC = TOPICS[0];

/**
 * Topics offered on the Start screen, eight per subject, shown four at a time.
 * "How a cell works" is the tested preset above and opens at once. Every other one is set up by
 * /api/topic when the student picks it, the same way as a topic they type.
 */
export const SUGGESTIONS: Record<(typeof SUBJECTS)[number], { title: string; blurb: string }[]> = {
  Biology: [
    { title: "How a cell works", blurb: "Every part, and what each one does." },
    { title: "How the heart pumps blood", blurb: "Four chambers and two loops." },
    { title: "How a neuron fires", blurb: "From a touch to a signal in the brain." },
    { title: "Photosynthesis", blurb: "How a leaf turns light into sugar." },
    { title: "How vaccines work", blurb: "Training the body before the real thing." },
    { title: "How we digest food", blurb: "From a bite to energy in the blood." },
    { title: "How DNA is copied", blurb: "One strand becomes two." },
    { title: "Natural selection", blurb: "Why living things fit where they live." },
  ],
  History: [
    { title: "How the pyramids were built", blurb: "Stone, ramps and thousands of workers." },
    { title: "How Roman aqueducts worked", blurb: "Water carried for miles by a gentle slope." },
    { title: "How the printing press changed Europe", blurb: "Books for everyone, suddenly." },
    { title: "What caused the Industrial Revolution", blurb: "Coal, steam and factories." },
    { title: "How the Silk Road worked", blurb: "Goods and ideas across a continent." },
    { title: "How a medieval castle was built", blurb: "Stone, timber and years of work." },
    { title: "How the first cities began", blurb: "Farming, surplus and writing." },
    { title: "How writing was invented", blurb: "From counting tokens to an alphabet." },
  ],
  Chemistry: [
    { title: "How an atom is built", blurb: "A tiny centre and a cloud around it." },
    { title: "Why ice floats", blurb: "What water does when it freezes." },
    { title: "How a battery works", blurb: "Chemicals pushing electrons round a loop." },
    { title: "What happens when things burn", blurb: "Fuel, oxygen and heat." },
    { title: "How soap cleans", blurb: "One end loves water, the other loves grease." },
    { title: "Acids and alkalis", blurb: "What the pH scale measures." },
    { title: "How rust forms", blurb: "Iron, water and air." },
    { title: "The states of matter", blurb: "Solid, liquid, gas, and why they change." },
  ],
  Physics: [
    { title: "How a rainbow forms", blurb: "Sunlight split by raindrops." },
    { title: "Why the sky is blue", blurb: "What air does to sunlight." },
    { title: "How a plane stays up", blurb: "Wings, air and lift." },
    { title: "How an electric circuit works", blurb: "A loop, a push and something to power." },
    { title: "How magnets work", blurb: "Two poles and an invisible field." },
    { title: "How sound travels", blurb: "A push passed from one bit of air to the next." },
    { title: "Why the Moon has phases", blurb: "Sun, Earth and Moon lining up." },
    { title: "How gravity keeps planets in orbit", blurb: "Always falling, never landing." },
  ],
};

/** How much detail the student is asked for. Chosen on the Start screen. */
export type Detail = "basics" | "exam" | "deep";

export const DEFAULT_DETAIL: Detail = "basics";

export const DETAILS: { id: Detail; label: string; blurb: string }[] = [
  { id: "basics", label: "Basics", blurb: "The main parts, in your own words." },
  { id: "exam", label: "Exam", blurb: "Every part, named, with its job." },
  { id: "deep", label: "Deep", blurb: "Every part, and how they connect." },
];

export function isDetail(value: unknown): value is Detail {
  return value === "basics" || value === "exam" || value === "deep";
}

/** The key ideas a student is marked on at this level of detail. */
export function ideasFor(topic: Topic, detail: Detail): KeyIdea[] {
  return detail === "basics" ? topic.keyIdeas.filter((idea) => idea.core) : topic.keyIdeas;
}

export function getTopic(id: string): Topic | undefined {
  return TOPICS.find((topic) => topic.id === id);
}
