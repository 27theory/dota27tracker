import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Session } from "./types";
export const SESSION_COOKIE = "dota27_session";
export function appUrl() {
  const url = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  );
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Некорректный APP_URL");
  return url.origin;
}
export function secret() {
  const key = process.env.JWT_SECRET;
  if (!key || key.length < 32)
    throw new Error("Для входа задайте JWT_SECRET длиной не менее 32 символов");
  return new TextEncoder().encode(key);
}
export const cookieOptions = {
  httpOnly: true,
  secure: appUrl().startsWith("https:"),
  sameSite: "lax" as const,
  path: "/",
};
export async function signSession(session: Session) {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer(appUrl())
    .setAudience("dota27")
    .sign(secret());
}
export async function getSession(): Promise<Session | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: appUrl(),
      audience: "dota27",
    });
    return typeof payload.accountId === "number" &&
      typeof payload.steamId === "string"
      ? { accountId: payload.accountId, steamId: payload.steamId }
      : null;
  } catch {
    return null;
  }
}
