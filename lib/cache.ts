import "server-only";
import { Redis } from "@upstash/redis";
import type { AiCoachReport } from "./types";

export const MATCH_TTL = 604800;
export const PLAYER_TTL = 900;
export const AI_COACH_TTL = 604800;

const mem = new Map<string, { until: number; value: unknown }>();

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    redisClient = new Redis({ url, token });
  } else {
    redisClient = null;
  }
  return redisClient;
}

function getMem<T>(key: string): T | null {
  const entry = mem.get(key);
  if (!entry) return null;
  if (entry.until <= Date.now()) {
    mem.delete(key);
    return null;
  }
  return entry.value as T;
}

function setMem<T>(key: string, value: T, ttlSeconds: number) {
  if (mem.size > 500) {
    const now = Date.now();
    for (const [k, v] of mem) {
      if (v.until <= now) mem.delete(k);
    }
    if (mem.size > 500) {
      const oldest = mem.keys().next().value;
      if (oldest) mem.delete(oldest);
    }
  }
  mem.set(key, { until: Date.now() + ttlSeconds * 1000, value });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (client) {
    try {
      const val = await client.get<T>(key);
      if (val !== null && val !== undefined) return val;
    } catch {}
  }
  return getMem<T>(key);
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  setMem(key, value, ttlSeconds);
  const client = getRedis();
  if (client) {
    try {
      await client.set(key, value, { ex: ttlSeconds });
    } catch {}
  }
}

export function aiCoachCacheKey(
  matchId: string,
  accountId?: number | null,
): string {
  return `ai_coach:${matchId}:${accountId ?? "all"}`;
}

export function isValidCoachReport(
  report: AiCoachReport | null | undefined,
): report is AiCoachReport {
  if (!report) return false;
  return (
    typeof report.verdict === "string" &&
    report.verdict.trim().length >= 10 &&
    typeof report.laning === "string" &&
    report.laning.trim().length >= 5 &&
    typeof report.build === "string" &&
    report.build.trim().length >= 5 &&
    Array.isArray(report.mistakes) &&
    report.mistakes.length >= 1 &&
    report.mistakes.every((m) => typeof m === "string" && m.trim().length > 0) &&
    Array.isArray(report.nextGamePlan) &&
    report.nextGamePlan.length >= 1 &&
    report.nextGamePlan.every((p) => typeof p === "string" && p.trim().length > 0)
  );
}

export async function getAiCoachCache(
  matchId: string,
  accountId?: number | null,
): Promise<{ analysis: string; coach: AiCoachReport } | null> {
  const hit = await getCache<{ analysis: string; coach: AiCoachReport }>(
    aiCoachCacheKey(matchId, accountId),
  );
  if (!hit || !hit.analysis?.trim() || !isValidCoachReport(hit.coach)) {
    return null;
  }
  return hit;
}

export async function setAiCoachCache(
  matchId: string,
  accountId: number | null | undefined,
  payload: { analysis: string; coach: AiCoachReport },
): Promise<void> {
  if (!payload.analysis?.trim() || !isValidCoachReport(payload.coach)) return;
  await setCache(aiCoachCacheKey(matchId, accountId), payload, AI_COACH_TTL);
}

export async function clearCache(keyOrPrefix: string): Promise<void> {
  const prefixes = [keyOrPrefix];
  if (keyOrPrefix.startsWith("player:")) {
    const accountId = keyOrPrefix.split(":")[1];
    if (accountId) {
      prefixes.push(`player:${accountId}`);
      prefixes.push(`steam-profile:${accountId}`);
    }
  }
  const keysToDelete = new Set<string>(prefixes);
  for (const k of mem.keys()) {
    if (prefixes.some((p) => k === p || k.startsWith(`${p}:`))) {
      mem.delete(k);
      keysToDelete.add(k);
    }
  }
  const client = getRedis();
  if (client) {
    try {
      for (const p of prefixes) {
        if (p.startsWith("player:")) {
          const id = p.split(":")[1];
          if (id) {
            keysToDelete.add(`player:${id}:0:150`);
            keysToDelete.add(`player:${id}:0:50`);
            keysToDelete.add(`player:${id}:150:50`);
            keysToDelete.add(`player:${id}:200:50`);
            keysToDelete.add(`player:${id}:250:50`);
            keysToDelete.add(`steam-profile:${id}`);
          }
        }
      }
      const list = [...keysToDelete];
      if (list.length) await client.del(...list);
    } catch {}
  }
}

export async function cached<T>(
  key: string,
  load: () => Promise<T>,
  ttlSeconds = PLAYER_TTL,
  forceRefresh = false,
): Promise<T> {
  if (!forceRefresh) {
    const hit = await getCache<T>(key);
    if (hit !== null) return hit;
  }
  const value = await load();
  await setCache(key, value, ttlSeconds);
  return value;
}
