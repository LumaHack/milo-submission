// GET /api/face
// Says whether a live face is set up, so the interview knows whether to ask for one.

export async function GET() {
  return Response.json({ anam: Boolean(process.env.ANAM_API_KEY) });
}
