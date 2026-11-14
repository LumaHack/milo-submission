// The interview: the only screen a witness sees. The address is their own interview link.

import { InterviewScreen } from "@/components/interview";

export default async function InterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InterviewScreen token={token} />;
}
