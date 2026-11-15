// GET /api/cases
// Every case on file, newest first, and the address interview links start with.
// For the investigator only.

import { investigatorOnly, linkBase, listCases } from "@/lib/server-store";

export async function GET(request: Request) {
  const refused = investigatorOnly(request);
  if (refused) return refused;
  return Response.json({ cases: listCases(), linkBase: linkBase(request) });
}
