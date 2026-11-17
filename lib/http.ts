import "server-only";
import { NextResponse } from "next/server";
import { DataError } from "./dota-api";
import { appUrl } from "./auth";
export function apiError(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof DataError
          ? error.message
          : "Не удалось получить данные. Попробуйте позже.",
    },
    { status: error instanceof DataError ? error.status : 502 },
  );
}
const limits = new Map<string, { count: number; until: number }>();
export function guardMutation(req: Request, scope: string, max = 5) {
  if (req.headers.get("origin") !== appUrl())
    throw new DataError(
      "Запрос разрешен только с адреса приложения (NEXT_PUBLIC_APP_URL)",
      403,
    );
  const key = `${scope}:${req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"}`;
  const now = Date.now();
  if (limits.size > 1000)
    for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  const item = limits.get(key);
  if (item && item.until > now) {
    if (item.count >= max)
      throw new DataError("Слишком много запросов. Подождите минуту.", 429);
    item.count++;
  } else limits.set(key, { count: 1, until: now + 60000 });
}
