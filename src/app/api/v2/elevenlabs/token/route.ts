// POST /api/v2/elevenlabs/token
// Returns a short-lived credential for Milo v2's agent, so the browser talks to it without ever
// seeing the API key. The agent is found by name; see ../elevenlabs.ts.
// - Default: a conversation token, for the live voice session over WebRTC.
// - Body { "transport": "websocket" }: a signed URL, for the typed chat test (?voice=text),
//   which only runs over a websocket.

import { eleven, findV2AgentId } from "../elevenlabs";

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as { transport?: string } | null;
  const agent = encodeURIComponent(agentId);

  if (body?.transport === "websocket") {
    const result = await eleven(apiKey, `/conversation/get-signed-url?agent_id=${agent}`);
    const signedUrl = result.data?.signed_url;
    if (!result.ok || typeof signedUrl !== "string") {
      return Response.json({ error: `ElevenLabs refused the signed URL request (${result.status}).` }, { status: 502 });
    }
    return Response.json({ signedUrl });
  }

  const result = await eleven(apiKey, `/conversation/token?agent_id=${agent}`);
  const token = result.data?.token;
  if (!result.ok || typeof token !== "string") {
    return Response.json({ error: `ElevenLabs refused the token request (${result.status}).` }, { status: 502 });
  }
  return Response.json({ token });
}
