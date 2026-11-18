import { NextRequest, NextResponse } from "next/server";
import { getMatch, clearCache } from "@/lib/dota-api";
import { apiError } from "@/lib/http";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (refresh) await clearCache(`match:${id}`);
    return NextResponse.json(await getMatch(id, refresh));
  } catch (e) {
    return apiError(e);
  }
}
