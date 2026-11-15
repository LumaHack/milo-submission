// One of the student's own courses: its parts, the mode choice and the "I want to work on…" box.
// The course's id comes from the address, see CourseFromUrl. docs/COURSES.md has the whole feature.

import { Suspense } from "react";

import { CourseFromUrl } from "@/components/v2/course-view";

export default function V2CoursePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <CourseFromUrl />
    </Suspense>
  );
}
