// POST /api/v2/summary
// One Claude call when the end page opens: for each idea the student explained clearly, their own
// words for it. Every pick is then checked against what the student really said, so the summary
// never holds a fact they did not say. Input and output: src/lib/v2/summary.ts.

import { askClaude, claudeErrorResponse } from "@/lib/v2/claude";
import { topicFromRequest } from "@/lib/v2/part";
import {
  groundPicks,
  summarySystemPrompt,
  summaryUserMessage,
  V2SummaryPicksSchema,
  V2SummaryRequestSchema,
  type V2SummaryResult,
} from "@/lib/v2/summary";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const body = V2SummaryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "The request does not match the v2 SummaryRequest.", issues: body.error.issues }, { status: 400 });
  }
  const input = body.data;

  const topic = topicFromRequest(input.topicId, input.part);
  if (!topic) {
    return Response.json({ error: `Topic "${input.topicId}" is not ready yet.` }, { status: 404 });
  }

  const clearIdeas = topic.keyIdeas.filter(
    (idea) => input.ideas.find((entry) => entry.id === idea.id)?.status === "clear",
  );
  // Nothing clear means nothing to quote, and no call to make.
  if (clearIdeas.length === 0) {
    return Response.json({ nailed: [] } satisfies V2SummaryResult);
  }

  try {
    const { output, meta } = await askClaude({
      route: "summary",
      schema: V2SummaryPicksSchema,
      system: summarySystemPrompt(),
      content: summaryUserMessage({
        topicTitle: topic.title,
        clearIdeas: clearIdeas.map((idea) => ({ id: idea.id, question: idea.gapLabel, idea: idea.idea })),
        studentTurns: input.studentTurns,
      }),
      effort: "low",
      maxTokens: 8000,
    });
    const result = groundPicks(
      output.picks,
      clearIdeas.map((idea) => idea.id),
      input.studentTurns,
    );
    return Response.json({ ...result, model: meta.model, fast: meta.fast, seconds: meta.seconds, tokens: meta.tokens });
  } catch (error) {
    return claudeErrorResponse(error);
  }
}
