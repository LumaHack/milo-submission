// POST /api/face/session
// Starts Nolan's live face (Anam). Anam connects to Nolan's ElevenLabs agent itself, so the witness
// talks to the face and hears the same agent. Input: { variables }, the values for the blanks in Nolan's
// prompt. Output: { sessionToken } for the Anam SDK in the browser. Both keys stay on the server.
//
// NOT RUN: this follows Anam's ElevenLabs guide (anam.ai/docs/third-party-integrations/elevenlabs, read
// Sat 14 Nov), but no Anam key was available when it was written. Without ANAM_API_KEY and ANAM_AVATAR_ID
// the interview never calls it and uses Nolan's voice alone.

import { z } from "zod";

import { nolanAgentId } from "@/lib/agent";
import { witnessOnly } from "@/lib/server-store";

const BodySchema = z.object({ variables: z.record(z.string(), z.string().max(4000)) });

export async function POST(request: Request) {
  const refused = witnessOnly(request);
  if (refused) return refused;

  const anamKey = process.env.ANAM_API_KEY;
  const avatarId = process.env.ANAM_AVATAR_ID;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!anamKey || !avatarId || !elevenLabsKey) {
    return Response.json({ error: "Nolan's face is not set up. It needs ANAM_API_KEY and ANAM_AVATAR_ID." }, { status: 501 });
  }
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "The face needs Nolan's variables." }, { status: 400 });

  try {
    const agentId = await nolanAgentId(elevenLabsKey);
    const signed = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": elevenLabsKey }, cache: "no-store" },
    );
    const signedBody = (await signed.json().catch(() => null)) as { signed_url?: string } | null;
    if (!signed.ok || !signedBody?.signed_url) throw new Error(`ElevenLabs refused the signed URL request (${signed.status}).`);

    const anam = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anamKey}` },
      cache: "no-store",
      body: JSON.stringify({
        personaConfig: { avatarId, avatarModel: process.env.ANAM_AVATAR_MODEL || "cara-4" },
        environment: {
          elevenLabsAgentSettings: { signedUrl: signedBody.signed_url, agentId, dynamicVariables: body.data.variables },
        },
      }),
    });
    const anamBody = (await anam.json().catch(() => null)) as { sessionToken?: string } | null;
    if (!anam.ok || !anamBody?.sessionToken) throw new Error(`Anam refused the session (${anam.status}).`);
    return Response.json({ sessionToken: anamBody.sessionToken });
  } catch (error) {
    console.error("Nolan's face:", error);
    return Response.json({ error: "Nolan's face could not be started." }, { status: 502 });
  }
}
