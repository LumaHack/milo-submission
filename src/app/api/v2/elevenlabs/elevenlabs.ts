// Small helpers for the ElevenLabs Agents REST API, shared by the v2 setup and token routes.
// Server only: the API key never leaves the server.

import { agentName, type AgentVariant } from "@/lib/v2/agent";

const API = "https://api.elevenlabs.io/v1/convai";

export type ElevenResult = { ok: boolean; status: number; data: Record<string, unknown> | null };

export async function eleven(apiKey: string, path: string, method = "GET", json?: unknown): Promise<ElevenResult> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: response.ok, status: response.status, data };
}

/** Reads ?variant=words or { variant: "words" }. Anything else means the tested Milo v2 agent. */
export function readVariant(value: unknown): AgentVariant | null {
  return value === "words" ? "words" : null;
}

/**
 * Finds Milo v2's agent by name, so nobody has to copy its id into .env.local.
 * With variant "words" it finds the second agent, "Milo v2 words", instead.
 */
export async function findV2AgentId(apiKey: string, variant: AgentVariant | null = null): Promise<string | null> {
  if (!variant && process.env.ELEVENLABS_V2_AGENT_ID) return process.env.ELEVENLABS_V2_AGENT_ID;
  const name = agentName(variant);
  const result = await eleven(apiKey, `/agents?search=${encodeURIComponent(name)}&page_size=30`);
  const agents = (result.data?.agents as { agent_id: string; name: string }[] | undefined) ?? [];
  // The search also returns names that only start the same way, so the name must match exactly.
  return agents.find((agent) => agent.name === name)?.agent_id ?? null;
}
