// POST /api/elevenlabs/setup
// Development helper. Keeps Milo's ElevenLabs agent in step with the prompt in src/lib/prompts.ts.
//  - No ELEVENLABS_AGENT_ID yet: creates the agent and returns its id. Put it in .env.local.
//  - ELEVENLABS_AGENT_ID set: updates that agent's prompt, first line and turn-taking.
// Run it again whenever the prompt changes:
//
//   curl -X POST http://localhost:3000/api/elevenlabs/setup

import { MILO_AGENT_PROMPT, MILO_FIRST_MESSAGE } from "@/lib/prompts";

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const conversationConfig = {
    agent: {
      first_message: MILO_FIRST_MESSAGE,
      // Defaults for the blanks in the prompt and first line. A live session always sends its own.
      dynamic_variables: {
        dynamic_variable_placeholders: {
          topic_title: "How a cell works",
          topic_about: "cells",
          milo_first_line: "Hi, I'm Milo! I know nothing about cells. Go on then, what even is a cell?",
        },
      },
      language: "en",
      prompt: {
        prompt: MILO_AGENT_PROMPT,
        // Milo says a sentence or two at a time, so a fast model keeps the conversation live.
        llm: process.env.ELEVENLABS_AGENT_LLM || "claude-haiku-5-5",
      },
    },
    ...(voiceId ? { tts: { voice_id: voiceId } } : {}),
    // Eager: Milo jumps in at the first small pause instead of waiting politely.
    // Speculative turn: his reply starts generating during the pause, so he answers faster.
    // Turn timeout: if the student goes quiet for five seconds, Milo speaks up instead of waiting.
    turn: { turn_eagerness: "eager", speculative_turn: true, turn_timeout: 5 },
  };

  const response = await fetch(
    agentId
      ? `https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`
      : "https://api.elevenlabs.io/v1/convai/agents/create",
    {
      method: agentId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify(
        agentId
          ? { conversation_config: conversationConfig }
          : {
              name: "Milo",
              conversation_config: conversationConfig,
              // Private agent: a conversation needs the token from /api/elevenlabs/token.
              platform_settings: { auth: { enable_auth: true } },
            },
      ),
      cache: "no-store",
    },
  );

  const data = (await response.json().catch(() => null)) as { agent_id?: string; detail?: unknown } | null;
  if (!response.ok || !data?.agent_id) {
    return Response.json(
      { error: `ElevenLabs did not ${agentId ? "update" : "create"} the agent (${response.status}).`, detail: data?.detail ?? null },
      { status: 502 },
    );
  }
  return Response.json(
    agentId
      ? { agentId: data.agent_id, updated: true, firstMessage: MILO_FIRST_MESSAGE, promptLength: MILO_AGENT_PROMPT.length }
      : { agentId: data.agent_id, created: true, next: "Add ELEVENLABS_AGENT_ID to .env.local." },
  );
}
