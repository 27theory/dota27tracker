import { NextResponse } from "next/server";
import { appUrl, cookieOptions, secret } from "@/lib/auth";
import { randomBytes } from "node:crypto";
export async function GET() {
  try {
    secret();
    const state = randomBytes(32).toString("hex");
    const returnTo = `${appUrl()}/api/auth/steam/callback?state=${state}`;
    const url = new URL("https://steamcommunity.com/openid/login");
    url.search = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": returnTo,
      "openid.realm": appUrl(),
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set("steam_state", state, {
      ...cookieOptions,
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(`${appUrl()}/?authError=config`);
  }
}
