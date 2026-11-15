// POST /api/v2/elevenlabs/setup
// Development helper. Creates Milo v2's ElevenLabs agent and its update_board tool from
// src/lib/v2/agent.ts, or updates them if they already exist. Run it again after changing the prompt.
//
//   curl -X POST http://localhost:3000/api/v2/elevenlabs/setup
//
// A second agent, "Milo v2 words", accepts speech-to-text keywords per conversation (&agent=words):
//
//   curl -X POST "http://localhost:3000/api/v2/elevenlabs/setup?variant=words"

import { UPDATE_BOARD, UPDATE_BOARD_TOOL, v2AgentBody } from "@/lib/v2/agent";

import { eleven, findV2AgentId, readVariant } from "../elevenlabs";

type Tool = { id: string; tool_config?: { name?: string } };

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Setup only runs in development." }, { status: 403 });
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY is not set. Add it to .env.local." }, { status: 500 });
  }

  // ?variant=words sets up the second agent, "Milo v2 words". It shares Milo v2's tool and must not
  // change it, or the tested agent, in any way: it only reads the tool's id.
  const variant = readVariant(new URL(request.url).searchParams.get("variant"));

  // 1. The update_board tool: update it if it exists, create it otherwise.
  const tools = await eleven(apiKey, "/tools");
  if (!tools.ok) {
    return Response.json({ error: `Could not list tools (${tools.status}).`, detail: tools.data }, { status: 502 });
  }
  const existingTool = ((tools.data?.tools as Tool[] | undefined) ?? []).find(
    (tool) => tool.tool_config?.name === UPDATE_BOARD,
  );
  let toolId: string;
  if (variant) {
    if (!existingTool) {
      return Response.json({ error: "Set up Milo v2 first: POST /api/v2/elevenlabs/setup." }, { status: 409 });
    }
    toolId = existingTool.id;
  } else if (existingTool) {
    const updated = await eleven(apiKey, `/tools/${existingTool.id}`, "PATCH", { tool_config: UPDATE_BOARD_TOOL });
    if (!updated.ok) {
      return Response.json({ error: `Could not update the tool (${updated.status}).`, detail: updated.data }, { status: 502 });
    }
    toolId = existingTool.id;
  } else {
    const created = await eleven(apiKey, "/tools", "POST", { tool_config: UPDATE_BOARD_TOOL });
    const id = created.data?.id;
    if (!created.ok || typeof id !== "string") {
      return Response.json({ error: `Could not create the tool (${created.status}).`, detail: created.data }, { status: 502 });
    }
    toolId = id;
  }

  // 2. The agent: update it if it exists, create it otherwise.
  const body = v2AgentBody(toolId, process.env.ELEVENLABS_VOICE_ID, variant);
  const existingAgentId = await findV2AgentId(apiKey, variant);
  if (existingAgentId) {
    const updated = await eleven(apiKey, `/agents/${existingAgentId}`, "PATCH", body);
    if (!updated.ok) {
      return Response.json({ error: `Could not update the agent (${updated.status}).`, detail: updated.data }, { status: 502 });
    }
    return Response.json({ agentId: existingAgentId, toolId, agent: "updated" });
  }
  const created = await eleven(apiKey, "/agents/create", "POST", body);
  const agentId = created.data?.agent_id;
  if (!created.ok || typeof agentId !== "string") {
    return Response.json({ error: `Could not create the agent (${created.status}).`, detail: created.data }, { status: 502 });
  }
  return Response.json({ agentId, toolId, agent: "created" });
}
