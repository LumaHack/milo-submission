// The scripted run from the v3 design: four turns on "How a cell works".
// The boards are real fal output from our test (public/boards). Nothing here calls an API.
// It drives /demo, the fallback for when the network is down. Say so in the video if you film it.

import type { Frame } from "./turn";

export const DEMO_TOPIC_ID = "cell";

export const DEMO_FRAMES: Frame[] = [
  {
    turn: 1,
    level: 1,
    said: "The cell does stuff and keeps the body alive.",
    imageUrl: "/boards/level-1.jpg",
    at: 20,
    hint: "Mmhh… but what is the cell actually doing?",
    gaps: ["What the cell is made of", "What lets things in", "Where the energy comes from", "Who gives the instructions"],
  },
  {
    turn: 2,
    level: 2,
    said: "The cell takes in things and makes energy.",
    imageUrl: "/boards/level-2.jpg",
    at: 55,
    hint: "Mmhh… but what lets things in, and where does the energy come from?",
    gaps: ["What lets things in", "How the energy is made", "Who gives the instructions"],
  },
  {
    turn: 3,
    level: 3,
    said: "The membrane controls what enters, and mitochondria make the energy.",
    imageUrl: "/boards/level-3.jpg",
    at: 100,
    hint: "Mmhh… but who gives the instructions, and how do proteins get made?",
    gaps: ["Who gives the instructions", "How proteins get made"],
  },
  {
    turn: 4,
    level: 4,
    said: "DNA gives the instructions, ribosomes build the proteins, and the Golgi sends them out.",
    imageUrl: "/boards/level-4.jpg",
    at: 150,
    hint: "That is all of it. I have nothing left to ask.",
    gaps: [],
  },
];

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
