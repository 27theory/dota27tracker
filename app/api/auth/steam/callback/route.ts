import { NextRequest, NextResponse } from "next/server";
import { appUrl, cookieOptions, signSession, SESSION_COOKIE } from "@/lib/auth";
import { toAccountId } from "@/lib/steam-id";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const fail = () => {
    const r = NextResponse.redirect(`${appUrl()}/?authError=steam`);
    r.cookies.set("steam_state", "", { ...cookieOptions, maxAge: 0 });
    return r;
  };
  try {
    const state = p.get("state");
    const expected = `${appUrl()}/api/auth/steam/callback?state=${state}`;
    const signed = new Set((p.get("openid.signed") ?? "").split(","));
    if (
      !state ||
      state !== req.cookies.get("steam_state")?.value ||
      p.get("openid.mode") !== "id_res" ||
      p.get("openid.ns") !== "http://specs.openid.net/auth/2.0" ||
      p.get("openid.op_endpoint") !==
        "https://steamcommunity.com/openid/login" ||
      p.get("openid.return_to") !== expected ||
      ![
        "op_endpoint",
        "claimed_id",
        "identity",
        "return_to",
        "response_nonce",
        "assoc_handle",
      ].every((k) => signed.has(k))
    )
      return fail();
    const identity = p.get("openid.claimed_id") ?? "";
    if (identity !== p.get("openid.identity")) return fail();
    const steamId = identity.match(
      /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/,
    )?.[1];
    if (!steamId) return fail();
    const nonceTime = Date.parse(
      (p.get("openid.response_nonce") ?? "").slice(0, 20),
    );
    if (
      !Number.isFinite(nonceTime) ||
      Math.abs(Date.now() - nonceTime) > 600000
    )
      return fail();
    const body = new URLSearchParams();
    for (const [k, v] of p) if (k.startsWith("openid.")) body.set(k, v);
    body.set("openid.mode", "check_authentication");
    const verified = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!verified.ok || !/^is_valid:true\s*$/m.test(await verified.text()))
      return fail();
    const accountId = toAccountId(steamId);
    const r = NextResponse.redirect(`${appUrl()}/player/${accountId}`);
    r.cookies.set(SESSION_COOKIE, await signSession({ accountId, steamId }), {
      ...cookieOptions,
      maxAge: 604800,
    });
    r.cookies.set("steam_state", "", { ...cookieOptions, maxAge: 0 });
    return r;
  } catch {
    return fail();
  }
}
