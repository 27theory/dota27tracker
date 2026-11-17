import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
export async function GET() {
  return NextResponse.json(await getSession(), {
    headers: { "Cache-Control": "no-store" },
  });
}
