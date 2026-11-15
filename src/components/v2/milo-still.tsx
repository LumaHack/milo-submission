// Milo as a still 3D cut-out, at one age and in one pose. The session screen animates him
// (session-view-v2.tsx); the start screen, the end page and the course pages show him standing still.
// The box clips only at the bottom, so he looks like he is standing behind the edge under him.

/* eslint-disable @next/next/no-img-element */

import { levelInfo, type Level } from "@/lib/levels";
import { poseBox, posePicture, type MiloPose } from "@/lib/v2/milo-poses";

export function MiloStill({ pose, level, className = "" }: { pose: MiloPose; level: Level; className?: string }) {
  return (
    <div className={`relative aspect-square flex-none ${className}`} style={{ clipPath: "inset(-100% -100% 0 -100%)" }}>
      <img
        key={`${pose}-${level}`}
        src={posePicture(pose, level)}
        alt={`Milo, age ${levelInfo(level).miloAge}`}
        draggable={false}
        className="absolute h-auto max-w-none select-none"
        style={poseBox(pose, level)}
      />
    </div>
  );
}
