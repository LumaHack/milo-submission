// GET /api/face
// Says whether Nolan's live face is set up, so the interview knows whether to ask for one.
// It needs an Anam key and the id of an Anam avatar.

export async function GET() {
  return Response.json({ anam: Boolean(process.env.ANAM_API_KEY && process.env.ANAM_AVATAR_ID) });
}
