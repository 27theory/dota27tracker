import { PlayerView } from "@/components/player-view";
export default async function Page({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <PlayerView id={accountId} />;
}
