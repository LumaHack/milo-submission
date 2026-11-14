// The four crayon levels. A level is how good the explanation is so far.
// It sets how neat the board is, how old Milo looks, and which fal model draws.

export type Level = 1 | 2 | 3 | 4;

export const LEVELS: { level: Level; label: string; miloAge: number; miloImage: string }[] = [
  { level: 1, label: "Crayon", miloAge: 4, miloImage: "/milo/stage-1.jpg" },
  { level: 2, label: "Sketching", miloAge: 7, miloImage: "/milo/stage-2.jpg" },
  { level: 3, label: "Clearer", miloAge: 11, miloImage: "/milo/stage-3.jpg" },
  { level: 4, label: "Mastered", miloAge: 18, miloImage: "/milo/stage-4.jpg" },
];

export function levelInfo(level: Level) {
  return LEVELS[level - 1];
}

// fal endpoints, chosen from our own timing test on Sat 14 Nov (one run each):
//   new board, fast model   5.2 s
//   edit, fast model        7.5 to 9.2 s, labels spelled right, but it mislabelled the final sheet
//   edit, careful model    22.1 s, final sheet correct
// fal-ai/flux-2/flash/edit was faster (4.9 s) but redrew the whole picture and misspelled labels.
export const FAL_FIRST_BOARD = "google/nano-banana-2-lite";
export const FAL_FAST_EDIT = "google/nano-banana-2-lite/edit";
export const FAL_CAREFUL_EDIT = "fal-ai/nano-banana-pro/edit";

/** The first board is a new image. Every later board is an edit of the one before. */
export function falEndpointFor(level: Level, hasPreviousBoard: boolean): string {
  if (!hasPreviousBoard) return FAL_FIRST_BOARD;
  return level === 4 ? FAL_CAREFUL_EDIT : FAL_FAST_EDIT;
}
