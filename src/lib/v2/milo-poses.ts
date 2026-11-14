// Milo v2's poses: one cut-out picture per pose and age, in public/milo-v2/<pose>-<stage>.png.
// They are drawn once by /api/v2/dev/milo-poses. Stage N is Milo at crayon level N (ages 4, 7, 11, 18).
//
// Each picture frames Milo a little differently (pointing makes him smaller, cheering lower), so the
// screen lines up his head instead of the pictures: same size, same place, whatever the pose. Then a
// pose change looks like Milo moving, not jumping. HEAD holds where his head is in each picture, in
// picture pixels, measured with a canvas script on Sat 14 Nov. Measure again after redrawing a pose.

import type { Level } from "@/lib/levels";

export const MILO_POSES = ["listen", "think", "point", "talk", "cheer"] as const;
export type MiloPose = (typeof MILO_POSES)[number];

/** Every pose picture is this size. */
const PICTURE = { width: 896, height: 1200 };

/** Top of his hair, width of his head (hair included), and the middle of his head, in picture pixels. */
const HEAD: Record<`${MiloPose}-${Level}`, { top: number; width: number; centerX: number }> = {
  "listen-1": { top: 125, width: 518, centerX: 478 },
  "think-1": { top: 61, width: 549, centerX: 488 },
  "point-1": { top: 254, width: 443, centerX: 603 },
  "talk-1": { top: 74, width: 525, centerX: 524 },
  "cheer-1": { top: 294, width: 416, centerX: 470 },
  "listen-2": { top: 65, width: 557, centerX: 489 },
  "think-2": { top: 112, width: 506, centerX: 421 },
  "point-2": { top: 272, width: 416, centerX: 654 },
  "talk-2": { top: 151, width: 486, centerX: 495 },
  "cheer-2": { top: 192, width: 432, centerX: 468 },
  "listen-3": { top: 113, width: 524, centerX: 409 },
  "think-3": { top: 52, width: 501, centerX: 483 },
  "point-3": { top: 140, width: 372, centerX: 635 },
  "talk-3": { top: 204, width: 414, centerX: 479 },
  "cheer-3": { top: 176, width: 444, centerX: 443 },
  "listen-4": { top: 53, width: 506, centerX: 450 },
  "think-4": { top: 58, width: 603, centerX: 463 },
  "point-4": { top: 185, width: 475, centerX: 636 },
  "talk-4": { top: 180, width: 574, centerX: 447 },
  "cheer-4": { top: 127, width: 493, centerX: 450 },
};

/** In Milo's square box: how wide his head is and where its top sits, as fractions of the box. */
const HEAD_WIDTH = 0.5;
const HEAD_TOP = 0.12;

export function posePicture(pose: MiloPose, level: Level): string {
  return `/milo-v2/${pose}-${level}.png`;
}

/**
 * Where to draw a pose picture inside Milo's square box, as CSS percentages of the box.
 * His head is centred, except when pointing: then it sits right of centre so his arm reaches the board.
 * Every picture reaches below the box, so the waist cut is always hidden by the box's bottom edge.
 */
export function poseBox(pose: MiloPose, level: Level): { width: string; left: string; top: string } {
  const head = HEAD[`${pose}-${level}`];
  const scale = HEAD_WIDTH / head.width;
  const anchor = pose === "point" ? 0.62 : 0.5;
  return {
    width: `${(PICTURE.width * scale * 100).toFixed(2)}%`,
    left: `${((anchor - head.centerX * scale) * 100).toFixed(2)}%`,
    top: `${((HEAD_TOP - head.top * scale) * 100).toFixed(2)}%`,
  };
}
