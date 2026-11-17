import { NextResponse } from "next/server";
import { z } from "zod";
import { getMatch, DataError } from "@/lib/dota-api";
import { apiError, guardMutation } from "@/lib/http";
import { buildMatchPromptSummary, SYSTEM_PROMPT } from "@/lib/ai";
export async function POST(req: Request) {
  try {
    guardMutation(req, "ai", 4);
    if (!process.env.AI_API_KEY)
      throw new DataError(
        "AI-тренер пока не подключен. Добавьте AI_API_KEY в .env.local и перезапустите приложение.",
        503,
      );
    const text = await req.text();
    if (text.length > 2000) throw new DataError("Слишком большой запрос", 400);
    const input = z
      .object({
        matchId: z.string().regex(/^(demo|\d{1,12})$/),
        targetAccountId: z.number().int().positive().max(4294967295).optional(),
      })
      .safeParse(JSON.parse(text));
    if (!input.success) throw new DataError("Неверные параметры анализа", 400);
    const m = await getMatch(input.data.matchId);
    if (
      input.data.targetAccountId &&
      !m.players.some((p) => p.accountId === input.data.targetAccountId)
    )
      throw new DataError("Игрок не найден в матче", 400);
    const base =
      process.env.AI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta/openai/";
    const response = await fetch(
      `${base.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
  Authorization: `Bearer ${process.env.AI_API_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "https://dota27tracker.vercel.app",
  "X-Title": "DotaScope",
},
        body: JSON.stringify({
          model: process.env.AI_MODEL ?? "gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: buildMatchPromptSummary(m, input.data.targetAccountId),
            },
          ],
          temperature: 0.35,
          max_tokens: 1800,
        }),
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new DataError(
        `OpenRouter (${response.status}): ${errText.slice(0, 200) || "нет ответа"}`,
        502,
      );
    const result = z
      .object({
        choices: z
          .array(z.object({ message: z.object({ content: z.string() }) }))
          .min(1),
      })
      .parse(await response.json());
    return NextResponse.json({ analysis: result.choices[0].message.content });
  } catch (e) {
    if (e instanceof SyntaxError)
      return apiError(new DataError("Некорректный JSON", 400));
    return apiError(e);
  }
}
