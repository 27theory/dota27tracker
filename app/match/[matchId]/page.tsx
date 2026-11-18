import { Suspense } from "react";
import { MatchView } from "@/components/match-view";
import { MatchSkeleton } from "@/components/ui";

export default async function Page({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return (
    <Suspense fallback={<MatchSkeleton />}>
      <MatchView id={matchId} />
    </Suspense>
  );
}
