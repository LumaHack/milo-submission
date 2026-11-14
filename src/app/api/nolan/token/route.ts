// POST /api/nolan/token
// Returns a short-lived conversation token so the browser can talk to Nolan's ElevenLabs agent
// over WebRTC without ever seeing the API key. The agent is created on first use, see src/lib/nolan-agent.ts.

import { nolanAgentId } from "@/lib/nolan-agent";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  let agentId: string;
  try {
    agentId = await nolanAgentId(apiKey);
  } catch (error) {
    console.error("Nolan's agent:", error);
    return Response.json({ error: "Nolan's voice could not be set up. Check the ElevenLabs key, then try again." }, { status: 502 });
  }

  // Text-only interviews run over a WebSocket and need a signed URL instead of a token. Development only.
  if (new URL(request.url).searchParams.get("text") === "1") {
    const signed = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey }, cache: "no-store" },
    );
    const body = (await signed.json().catch(() => null)) as { signed_url?: string } | null;
    if (!signed.ok || !body?.signed_url) {
      return Response.json({ error: `ElevenLabs refused the signed URL request (${signed.status}).` }, { status: 502 });
    }
    return Response.json({ signedUrl: body.signed_url });
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": apiKey }, cache: "no-store" },
  );
  if (response.status === 429) {
    // Too many calls open at once on this ElevenLabs workspace. Old ones close by themselves within a minute or two.
    return Response.json({ error: "Nolan is busy: too many calls are open. Wait a minute, then press the button under him." }, { status: 429 });
  }
  if (!response.ok) {
    return Response.json({ error: `ElevenLabs refused the token request (${response.status}).` }, { status: 502 });
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    return Response.json({ error: "ElevenLabs returned no token." }, { status: 502 });
  }
  return Response.json({ token: data.token });
}
