import { Suspense } from "react";
import { PlayerView } from "@/components/player-view";
import { ProfileSkeleton } from "@/components/ui";

export default async function Page({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PlayerView id={accountId} />
    </Suspense>
  );
}
