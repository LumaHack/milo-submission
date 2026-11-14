// POST /api/elevenlabs/setup
// One-off helper for development. Creates Milo's ElevenLabs agent from the prompt in src/lib/prompts.ts
// and returns its id. Put the id in .env.local as ELEVENLABS_AGENT_ID and restart the dev server.
// It refuses to run once an agent id is set, so it cannot create a second agent by accident.
//
//   curl -X POST http://localhost:3000/api/elevenlabs/setup

import { MILO_AGENT_PROMPT, MILO_FIRST_MESSAGE } from "@/lib/prompts";

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  if (process.env.ELEVENLABS_AGENT_ID) {
    return Response.json({ error: "ELEVENLABS_AGENT_ID is already set. Milo's agent exists." }, { status: 409 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const response = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({
      name: "Milo",
      conversation_config: {
        agent: {
          first_message: MILO_FIRST_MESSAGE,
          language: "en",
          prompt: {
            prompt: MILO_AGENT_PROMPT,
            // Milo says one short sentence at a time, so a fast model keeps the conversation live.
            llm: process.env.ELEVENLABS_AGENT_LLM || "claude-haiku-5-5",
          },
        },
        ...(voiceId ? { tts: { voice_id: voiceId } } : {}),
        // Patient: students pause, restart and correct themselves mid-sentence.
        turn: { turn_eagerness: "patient" },
      },
      // Private agent: a conversation needs the token from /api/elevenlabs/token.
      platform_settings: { auth: { enable_auth: true } },
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as { agent_id?: string; detail?: unknown } | null;
  if (!response.ok || !data?.agent_id) {
    return Response.json(
      { error: `ElevenLabs did not create the agent (${response.status}).`, detail: data?.detail ?? null },
      { status: 502 },
    );
  }
  return Response.json({ agentId: data.agent_id, next: "Add ELEVENLABS_AGENT_ID to .env.local and restart." });
}
