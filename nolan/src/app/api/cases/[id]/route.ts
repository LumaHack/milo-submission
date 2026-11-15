// PUT /api/cases/[id]     stores the case as the investigator's screen has it. What witnesses said is kept as stored.
// DELETE /api/cases/[id]  removes it.
// For the investigator only.

import { z } from "zod";

import { DetailSchema, type CaseFile } from "@/lib/nolan";
import { investigatorOnly, putCase, removeCase } from "@/lib/server-store";

// The shape is checked loosely: enough to refuse something that is not a case at all.
const CaseSchema = z.looseObject({
  id: z.string().min(1).max(60),
  number: z.string().max(20),
  title: z.string().min(1).max(160),
  opener: z.string().max(400),
  details: z.array(DetailSchema).min(1).max(8),
  witnesses: z
    .array(z.looseObject({ id: z.string().min(1).max(60), token: z.string().min(16).max(80), where: z.string().max(120) }))
    .max(6),
  createdAt: z.number(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = investigatorOnly(request);
  if (refused) return refused;
  const { id } = await params;
  const body = CaseSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.id !== id) {
    return Response.json({ error: "That is not a case." }, { status: 400 });
  }
  return Response.json(putCase(body.data as unknown as CaseFile));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = investigatorOnly(request);
  if (refused) return refused;
  const { id } = await params;
  removeCase(id);
  return Response.json({ ok: true });
}
