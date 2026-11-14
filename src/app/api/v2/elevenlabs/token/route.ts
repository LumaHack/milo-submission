// POST /api/v2/elevenlabs/token
// Returns a short-lived conversation token for Milo v2's agent, so the browser talks to it over
// WebRTC without ever seeing the API key. The agent is found by name; see ../elevenlabs.ts.

import { eleven, findV2AgentId } from "../elevenlabs";

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  const agentId = await findV2AgentId(apiKey);
  if (!agentId) {
    return Response.json(
      { error: "Milo v2's agent does not exist yet. Create it with POST /api/v2/elevenlabs/setup." },
      { status: 500 },
    );
  }
  const result = await eleven(apiKey, `/conversation/token?agent_id=${encodeURIComponent(agentId)}`);
  const token = result.data?.token;
  if (!result.ok || typeof token !== "string") {
    return Response.json({ error: `ElevenLabs refused the token request (${result.status}).` }, { status: 502 });
  }
  return Response.json({ token });
}
