import { NextRequest, NextResponse } from "next/server";
import { parseSearch, toAccountId } from "@/lib/steam-id";
import { requestJson } from "@/lib/dota-api";
import { z } from "zod";
export async function GET(req: NextRequest) {
  try {
    const result = parseSearch(
      req.nextUrl.searchParams.get("q") ?? "",
      req.nextUrl.searchParams.get("kind") === "match" ? "match" : "player",
    );
    if (result.type === "vanity") {
      if (!process.env.STEAM_API_KEY)
        return NextResponse.json(
          {
            error:
              "Для коротких ссылок Steam нужен STEAM_API_KEY. Введите SteamID32 или SteamID64.",
          },
          { status: 400 },
        );
      const url = new URL(
        "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/",
      );
      url.search = new URLSearchParams({
        key: process.env.STEAM_API_KEY,
        vanityurl: result.id,
      }).toString();
      const data = z
        .object({
          response: z.object({
            success: z.number(),
            steamid: z.string().optional(),
          }),
        })
        .parse(await requestJson(url.toString()));
      if (data.response.success !== 1 || !data.response.steamid)
        throw new Error("Профиль Steam не найден");
      return NextResponse.json({
        path: `/player/${toAccountId(data.response.steamid)}`,
      });
    }
    return NextResponse.json({ path: `/${result.type}/${result.id}` });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Некорректный запрос" },
      { status: 400 },
    );
  }
}
