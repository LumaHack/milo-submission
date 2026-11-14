// POST /api/elevenlabs/token
// Returns a short-lived conversation token so the browser can talk to Milo's ElevenLabs agent
// over WebRTC without ever seeing the API key.

export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }
  if (!agentId) {
    return Response.json(
      { error: "ELEVENLABS_AGENT_ID is not set. Create Milo's agent first: POST /api/elevenlabs/setup." },
      { status: 500 },
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": apiKey }, cache: "no-store" },
  );
  if (!response.ok) {
    return Response.json({ error: `ElevenLabs refused the token request (${response.status}).` }, { status: 502 });
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    return Response.json({ error: "ElevenLabs returned no token." }, { status: 502 });
  }
  return Response.json({ token: data.token });
}
