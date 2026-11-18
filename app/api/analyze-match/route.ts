import { NextResponse } from "next/server";
import { z } from "zod";
import { getMatch, DataError } from "@/lib/dota-api";
import { apiError, guardMutation } from "@/lib/http";
import {
  buildMatchPromptSummary,
  parseCoachResponse,
  SYSTEM_PROMPT,
} from "@/lib/ai";
import { getAiCoachCache, setAiCoachCache } from "@/lib/cache";

export const maxDuration = 60;

const OPENROUTER_FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
];

const LLM_TIMEOUT_MS = 12000;

interface ProviderAttempt {
  url: string;
  apiKey: string;
  model: string;
  fallbackModels?: string[];
  isOpenRouter: boolean;
}

function extractRawContent(rawJson: unknown): string | null {
  if (!rawJson || typeof rawJson !== "object") return null;
  const obj = rawJson as {
    error?: { message?: string };
    choices?: { message?: { content?: unknown } }[];
  };
  if (obj.error) return null;
  const content = obj.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }
  return null;
}

async function callChatCompletion(
  attempt: ProviderAttempt,
  userContent: string,
): Promise<{ content: string | null; status: number; errText: string }> {
  try {
    const bodyPayload: Record<string, unknown> = {
      model: attempt.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.25,
      max_tokens: 2200,
    };
    if (
      attempt.isOpenRouter &&
      attempt.fallbackModels &&
      attempt.fallbackModels.length > 0
    ) {
      bodyPayload.models = [attempt.model, ...attempt.fallbackModels];
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${attempt.apiKey}`,
      "Content-Type": "application/json",
    };
    if (attempt.isOpenRouter) {
      headers["HTTP-Referer"] = "https://dota27tracker.vercel.app";
      headers["X-Title"] = "DotaScope";
    }

    const response = await fetch(attempt.url, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        content: null,
        status: response.status,
        errText: errText.slice(0, 200),
      };
    }

    const rawJson = await response.json();
    const content = extractRawContent(rawJson);
    if (!content) {
      return {
        content: null,
        status: 502,
        errText: "Модель вернула пустой ответ",
      };
    }
    return { content, status: 200, errText: "" };
  } catch (e) {
    const isTimeout =
      e instanceof Error &&
      (e.name === "TimeoutError" || e.name === "AbortError");
    return {
      content: null,
      status: isTimeout ? 504 : 503,
      errText: isTimeout ? "Таймаут 12с" : "Сетевая ошибка провайдера",
    };
  }
}

export async function POST(req: Request) {
  try {
    guardMutation(req, "ai", 4);
    const aiKey = process.env.AI_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!aiKey && !geminiKey) {
      throw new DataError(
        "AI-тренер пока не подключен. Добавьте AI_API_KEY или GEMINI_API_KEY в .env.local и перезапустите приложение.",
        503,
      );
    }

    const text = await req.text();
    if (text.length > 2000) {
      throw new DataError("Слишком большой запрос", 400);
    }

    const input = z
      .object({
        matchId: z.string().regex(/^(demo|\d{1,12})$/),
        targetAccountId: z.number().int().positive().max(4294967295).optional(),
        refresh: z.boolean().optional(),
      })
      .safeParse(JSON.parse(text));

    if (!input.success) {
      throw new DataError("Неверные параметры анализа", 400);
    }

    const m = await getMatch(input.data.matchId);
    if (
      input.data.targetAccountId &&
      !m.players.some((p) => p.accountId === input.data.targetAccountId)
    ) {
      throw new DataError("Игрок не найден в матче", 400);
    }

    if (!input.data.refresh) {
      const cachedResult = await getAiCoachCache(
        input.data.matchId,
        input.data.targetAccountId,
      );
      if (cachedResult) {
        return NextResponse.json({
          analysis: cachedResult.analysis,
          coach: cachedResult.coach,
          cached: true,
        });
      }
    }

    const userPrompt = buildMatchPromptSummary(m, input.data.targetAccountId);
    const configuredBase = (
      process.env.AI_BASE_URL ??
      (aiKey
        ? "https://openrouter.ai/api/v1/"
        : "https://generativelanguage.googleapis.com/v1beta/openai/")
    ).replace(/\/$/, "");
    const isOpenRouterBase = configuredBase.includes("openrouter.ai");
    const primaryModel =
      process.env.AI_MODEL?.trim() ||
      (isOpenRouterBase ? OPENROUTER_FREE_MODELS[0] : "gemini-2.5-flash");

    const attempts: ProviderAttempt[] = [];

    if (aiKey) {
      if (isOpenRouterBase) {
        const candidateModels = [
          primaryModel,
          ...OPENROUTER_FREE_MODELS.filter((x) => x !== primaryModel),
        ];
        attempts.push({
          url: `${configuredBase}/chat/completions`,
          apiKey: aiKey,
          model: candidateModels[0],
          fallbackModels: candidateModels.slice(1, 3),
          isOpenRouter: true,
        });
        for (const fallbackModel of candidateModels.slice(1)) {
          attempts.push({
            url: `${configuredBase}/chat/completions`,
            apiKey: aiKey,
            model: fallbackModel,
            isOpenRouter: true,
          });
        }
      } else {
        attempts.push({
          url: `${configuredBase}/chat/completions`,
          apiKey: aiKey,
          model: primaryModel,
          isOpenRouter: false,
        });
      }
    }

    if (geminiKey) {
      attempts.push({
        url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        apiKey: geminiKey,
        model: "gemini-2.5-flash",
        isOpenRouter: false,
      });
    }

    let rawContent: string | null = null;
    let lastStatus = 502;
    let lastError = "нет ответа";

    for (const attempt of attempts) {
      const res = await callChatCompletion(attempt, userPrompt);
      if (res.content) {
        rawContent = res.content;
        break;
      }
      lastStatus = res.status;
      lastError = res.errText || `HTTP ${res.status}`;
      if (
        res.status !== 429 &&
        res.status !== 502 &&
        res.status !== 503 &&
        res.status !== 504
      ) {
        continue;
      }
    }

    if (!rawContent) {
      throw new DataError(
        `AI-сервис временно недоступен (${lastStatus}: ${lastError}). Попробуйте повторить запрос.`,
        502,
      );
    }

    const parsed = parseCoachResponse(
      rawContent,
      m,
      input.data.targetAccountId,
    );
    await setAiCoachCache(
      input.data.matchId,
      input.data.targetAccountId,
      parsed,
    );

    return NextResponse.json({
      analysis: parsed.analysis,
      coach: parsed.coach,
      cached: false,
    });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return apiError(new DataError("Некорректный JSON", 400));
    }
    return apiError(e);
  }
}
