// Board layouts (docs/V2.md, "Board layouts"). A cell, a process, the causes of a war and an event
// each need a different drawing. Every topic names one layout, and the brain prompt uses that
// layout's paragraph and examples when the topic has no tested examples of its own.

import { z } from "zod";

export const LAYOUT_KINDS = ["structure", "process", "causes", "event", "comparison"] as const;
export const LayoutKindSchema = z.enum(LAYOUT_KINDS);
export type LayoutKind = z.infer<typeof LayoutKindSchema>;
