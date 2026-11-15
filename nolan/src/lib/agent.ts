// Server only. Nolan's voice is an ElevenLabs agent.
// There is nothing to set up by hand: the first interview finds the agent by name in the workspace,
// creates it if it is missing, and brings its prompt up to date from src/lib/prompts.ts.
// Set ELEVENLABS_NOLAN_AGENT_ID to skip the lookup and pin one agent.

import { NOLAN_AGENT_NAME, NOLAN_AGENT_OLD_NAMES, NOLAN_AGENT_PROMPT, NOLAN_FIRST_MESSAGE } from "@/lib/prompts";

const API = "https://api.elevenlabs.io/v1/convai";

/** The agent id, once this server process has made sure the agent matches the prompt in the code. */
let synced: Promise<string> | null = null;

function conversationConfig() {
  const voiceId = process.env.ELEVENLABS_NOLAN_VOICE_ID;
  return {
    agent: {
      first_message: NOLAN_FIRST_MESSAGE,
      // Defaults for the blanks in the prompt and first line. A live interview always sends its own.
      dynamic_variables: {
        dynamic_variable_placeholders: {
          case_title: "An incident",
          witness_where: "saw it",
          details: '- What happened: "What happened next?"',
          nolan_first_line: "Hello, I'm Nolan. I'm here to take your account. Tell me what you saw, from the moment you first noticed something.",
        },
      },
      language: "en",
      prompt: {
        prompt: NOLAN_AGENT_PROMPT,
        // Nolan says a sentence at a time, so a fast model keeps the interview live.
        llm: process.env.ELEVENLABS_AGENT_LLM || "claude-haiku-5-5",
      },
    },
    ...(voiceId ? { tts: { voice_id: voiceId } } : {}),
    // Patient: a witness who is remembering gets time. Nolan waits while they think and never talks over them.
    // Turn timeout: after twelve quiet seconds he says "Take your time."
    turn: { turn_eagerness: "patient", turn_timeout: 12 },
  };
}

async function call(apiKey: string, path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: response.ok, status: response.status, data };
}

async function sync(apiKey: string): Promise<string> {
  let agentId = process.env.ELEVENLABS_NOLAN_AGENT_ID || null;

  if (!agentId) {
    const found = await call(apiKey, `/agents?search=${encodeURIComponent("Nolan")}&page_size=100`);
    if (!found.ok) throw new Error(`ElevenLabs refused the agent list (${found.status}).`);
    const agents = (found.data?.agents ?? []) as { agent_id?: string; name?: string }[];
    agentId =
      agents.find((agent) => agent.name === NOLAN_AGENT_NAME)?.agent_id ??
      agents.find((agent) => NOLAN_AGENT_OLD_NAMES.includes(agent.name ?? ""))?.agent_id ??
      null;
  }

  if (!agentId) {
    const created = await call(apiKey, "/agents/create", {
      method: "POST",
      body: JSON.stringify({
        name: NOLAN_AGENT_NAME,
        conversation_config: conversationConfig(),
        platform_settings: {
          // Private agent: an interview needs a token from /api/token.
          auth: { enable_auth: true },
          // A witness's voice is not stored. Only the words are, as text.
          privacy: { record_voice: false },
        },
      }),
    });
    const id = created.data?.agent_id;
    if (!created.ok || typeof id !== "string") throw new Error(`ElevenLabs did not create Nolan's agent (${created.status}).`);
    return id;
  }

  const updated = await call(apiKey, `/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: NOLAN_AGENT_NAME,
      conversation_config: conversationConfig(),
      platform_settings: { privacy: { record_voice: false } },
    }),
  });
  if (!updated.ok) throw new Error(`ElevenLabs did not update Nolan's agent (${updated.status}).`);
  return agentId;
}

/** The id of Nolan's agent, created or updated on the first call in this server process. */
export function nolanAgentId(apiKey: string): Promise<string> {
  synced ??= sync(apiKey).catch((error) => {
    // Let the next interview try again instead of remembering the failure.
    synced = null;
    throw error;
  });
  return synced;
}
