import { NextRequest, NextResponse } from "next/server";
import { getProfile, INITIAL_PROFILE_MATCHES } from "@/lib/dota-api";
import { apiError } from "@/lib/http";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sp = req.nextUrl.searchParams;
    const refresh = sp.get("refresh") === "1";
    const rawOffset = Number(sp.get("offset") ?? "0");
    const rawLimit = Number(sp.get("limit") ?? String(INITIAL_PROFILE_MATCHES));
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(200, Math.floor(rawLimit))
        : INITIAL_PROFILE_MATCHES;
    return NextResponse.json(
      await getProfile(id, { offset, limit, refresh }),
    );
  } catch (e) {
    return apiError(e);
  }
}
