import { MatchView } from "@/components/match-view";
export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <MatchView id={matchId} />;
}
