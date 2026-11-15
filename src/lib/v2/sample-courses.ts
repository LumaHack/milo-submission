// The sample courses behind "Try a sample course" (docs/COURSES.md). They were built ahead of time
// by /api/v2/courses/analyze from our own test decks in test-data/, then read through by hand, so
// loading one needs no upload and no call to Claude: a demo never waits on the network.

import type { Course } from "./courses";

export const SAMPLE_COURSES: Course[] = [];
