import { NextResponse } from "next/server";
import { appUrl, cookieOptions, SESSION_COOKIE } from "@/lib/auth";
export async function GET() {
  const r = NextResponse.redirect(appUrl());
  r.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return r;
}
