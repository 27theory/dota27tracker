import { NextRequest, NextResponse } from "next/server";
import { getMatch, clearCache } from "@/lib/dota-api";
import { apiError } from "@/lib/http";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (req.nextUrl.searchParams.get("refresh") === "1")
      clearCache(`match:${id}`);
    return NextResponse.json(await getMatch(id));
  } catch (e) {
    return apiError(e);
  }
}
