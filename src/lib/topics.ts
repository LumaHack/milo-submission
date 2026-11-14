// Topics a student can explain to Milo, and the key ideas a full explanation covers.
// The key ideas are the marking scheme: Claude scores each one every turn.

export type KeyIdea = {
  id: string;
  /** What a complete explanation says. Never shown to the student. */
  idea: string;
  /** How the gap is named on screen. A question, so it never gives the answer away. */
  gapLabel: string;
};

export type Topic = {
  id: string;
  subject: string;
  title: string;
  blurb: string;
  /** Only ready topics have key ideas and can start a session. */
  ready: boolean;
  keyIdeas: KeyIdea[];
};

export const SUBJECTS = ["Biology", "History", "Chemistry", "Physics"] as const;

export const TOPICS: Topic[] = [
  {
    id: "cell",
    subject: "Biology",
    title: "How a cell works",
    blurb: "Every part, and what each one does.",
    ready: true,
    keyIdeas: [
      {
        id: "membrane",
        idea: "The cell membrane surrounds the cell and controls what enters and leaves.",
        gapLabel: "What lets things in",
      },
      {
        id: "energy",
        idea: "Mitochondria release the cell's energy, as ATP.",
        gapLabel: "Where the energy comes from",
      },
      {
        id: "nucleus",
        idea: "The nucleus holds the DNA, which carries the instructions for the cell.",
        gapLabel: "Who gives the instructions",
      },
      {
        id: "ribosomes",
        idea: "Ribosomes build proteins by following those instructions.",
        gapLabel: "How proteins get made",
      },
      {
        id: "golgi",
        idea: "The rough ER and the Golgi process, pack and send the proteins where they are needed.",
        gapLabel: "Where the proteins go next",
      },
    ],
  },
  {
    id: "heart",
    subject: "Biology",
    title: "How the heart pumps blood",
    blurb: "Four chambers and two loops.",
    ready: false,
    keyIdeas: [],
  },
  {
    id: "neuron",
    subject: "Biology",
    title: "How a neuron fires",
    blurb: "From a touch to a signal in the brain.",
    ready: false,
    keyIdeas: [],
  },
  {
    id: "photosynthesis",
    subject: "Biology",
    title: "Photosynthesis",
    blurb: "How a leaf turns light into sugar.",
    ready: false,
    keyIdeas: [],
  },
];

export function getTopic(id: string): Topic | undefined {
  return TOPICS.find((topic) => topic.id === id);
}
