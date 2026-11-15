// GET /api/witness/[token]    what one witness's interview needs: the questions and their own account so far.
// PATCH /api/witness/[token]  stores their turns, notes, clock and status.
// The token is the interview link. It gives access to that one account and to nothing else:
// no other witness, no comparison, no scene.

import { z } from "zod";

import { FactSchema, TurnSchema, type Invite } from "@/lib/nolan";
import { findWitness, patchWitness } from "@/lib/server-store";

const PatchSchema = z.object({
  turns: z.array(TurnSchema).max(400),
  facts: z.array(FactSchema).max(12),
  seconds: z.number().min(0).max(36000),
  status: z.enum(["waiting", "underway", "done"]),
});

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = findWitness(token);
  if (!found) return Response.json({ error: "This interview link is not on file." }, { status: 404 });
  const { file, witness, position } = found;
  const invite: Invite = {
    token,
    caseNumber: file.number,
    title: file.title,
    opener: file.opener,
    details: file.details,
    position,
    total: file.witnesses.length,
    witness: { where: witness.where, status: witness.status, turns: witness.turns, facts: witness.facts, seconds: witness.seconds },
  };
  return Response.json(invite);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "That is not an account." }, { status: 400 });
  const updated = patchWitness(token, body.data);
  if (!updated) return Response.json({ error: "This interview link is not on file." }, { status: 404 });
  return Response.json({ ok: true });
}
