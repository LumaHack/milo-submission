// POST /api/v2/courses/focus
// "I want to work on…": builds one new part of a course about what the student asked for
// (docs/COURSES.md). It works from the outline Claude wrote when it first read the course, which
// the browser sends along, so the files are never needed twice.
// Returns { found: true, part } or { found: false, message }.

import { askClaude, claudeErrorResponse } from "@/lib/v2/claude";
import { buildPart } from "@/lib/v2/course-build";
import { focusSystemPrompt, focusUserMessage, FocusRequestSchema, FocusResultSchema } from "@/lib/v2/course-prompts";

const NOT_COVERED = "This course does not seem to cover that. Try naming something from your slides.";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const body = FocusRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match the focus request.", issues: body.error.issues }, { status: 400 });
  }

  try {
    const { output, meta } = await askClaude({
      route: "courses/focus",
      schema: FocusResultSchema,
      system: focusSystemPrompt(),
      content: focusUserMessage(body.data),
      effort: "low",
      maxTokens: 8000,
    });
    // The browser makes the part's id unique inside its course.
    const part = output.found && output.parts[0] ? buildPart(output.parts[0], "focus", new Set()) : null;
    if (!part) {
      const message = output.message.replace(/\s+/g, " ").trim().slice(0, 240);
      return Response.json({ found: false, message: (!output.found && message) || NOT_COVERED, seconds: meta.seconds });
    }
    return Response.json({ found: true, part, seconds: meta.seconds, tokens: meta.tokens });
  } catch (error) {
    return claudeErrorResponse(error);
  }
}
