import "server-only";
import { z } from "zod";
import { analyzeImpact } from "./impact-analyzer";
import type { Match, MatchPlayer, PlayerProfile, Role } from "./types";
import { itemId, itemName, rankName } from "./format";
import { demoMatch, demoProfile } from "./demo";
const cache = new Map<string, { until: number; value: unknown }>();
export async function cached<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const found = cache.get(key);
  if (found && found.until > Date.now()) return found.value as T;
  const value = await load();
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 120000, value });
  return value;
}
export function clearCache(key: string) {
  cache.delete(key);
  if (key.startsWith("player:"))
    cache.delete(key.replace("player:", "steam-profile:"));
}
export class DataError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function requestJson(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok)
    throw new DataError(
      res.status === 429
        ? "Источник данных ограничил частоту запросов. Попробуйте через минуту."
        : res.status === 404
          ? "Данные не найдены. Проверьте ID."
          : "Источник данных временно недоступен.",
      res.status === 404 ? 404 : 502,
    );
  return res.json();
}
async function graphql(query: string, variables: Record<string, unknown>) {
  if (!process.env.STRATZ_API_TOKEN)
    throw new DataError("STRATZ token missing");
  const raw = z
    .object({
      data: z.record(z.string(), z.unknown()).nullable().optional(),
      errors: z.array(z.object({ message: z.string() })).optional(),
    })
    .parse(
      await requestJson("https://api.stratz.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.STRATZ_API_TOKEN}`,
        },
        body: JSON.stringify({ query, variables }),
      }),
    );
  if (raw.errors?.length || !raw.data)
    throw new DataError("STRATZ не вернул данные");
  return raw.data;
}
const n = z
  .number()
  .nullish()
  .transform((v) => v ?? 0);
const maybeN = z
  .number()
  .nullish()
  .transform((v) => v ?? null);
const odPlayer = z.object({
  account_id: maybeN,
  personaname: z.string().nullish(),
  name: z.string().nullish(),
  hero_id: n,
  player_slot: n,
  kills: n,
  deaths: n,
  assists: n,
  gold_per_min: n,
  xp_per_min: n,
  last_hits: n,
  denies: n,
  net_worth: n,
  hero_damage: n,
  tower_damage: n,
  hero_healing: n,
  obs_placed: maybeN,
  rank_tier: maybeN,
  purchase: z.object({ ward_observer: n, ward_sentry: n }).nullish(),
  sen_placed: maybeN,
  lane_role: maybeN,
  lane_efficiency_pct: maybeN,
  item_0: n,
  item_1: n,
  item_2: n,
  item_3: n,
  item_4: n,
  item_5: n,
  item_neutral: maybeN,
  purchase_log: z
    .array(z.object({ key: z.string(), time: z.number() }))
    .nullish(),
});
const odMatch = z.object({
  match_id: z.number(),
  duration: z.number(),
  start_time: z.number(),
  radiant_win: z.boolean(),
  radiant_score: maybeN,
  dire_score: maybeN,
  game_mode: n,
  rank_tier: maybeN,
  radiant_gold_adv: z.array(z.number()).nullish(),
  radiant_xp_adv: z.array(z.number()).nullish(),
  players: z.array(odPlayer).length(10),
  version: maybeN,
});
export function normalizeOpenDota(data: unknown): Match {
  const m = odMatch.parse(data);
  const players: MatchPlayer[] = m.players.map((p) => ({
    accountId: p.account_id,
    name: p.personaname ?? p.name ?? "Аноним",
    heroId: p.hero_id,
    team: p.player_slot < 128 ? "radiant" : "dire",
    role: p.lane_role === 2 ? 2 : null,
    lane:
      (
        { 1: "Легкая", 2: "Мид", 3: "Сложная", 4: "Лес" } as Record<
          number,
          string
        >
      )[p.lane_role ?? 0] ?? null,
    laneOutcome: null,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    gpm: p.gold_per_min,
    xpm: p.xp_per_min,
    lastHits: p.last_hits,
    denies: p.denies,
    networth: p.net_worth,
    heroDamage: p.hero_damage,
    towerDamage: p.tower_damage,
    healing: p.hero_healing,
    wards: p.purchase
      ? p.purchase.ward_observer + p.purchase.ward_sentry
      : null,
    imp: null,
    items: [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5],
    neutralItem: p.item_neutral,
    purchases: (p.purchase_log ?? []).map((e) => ({
      id: itemId(e.key),
      name: itemName(itemId(e.key)),
      time: e.time,
    })),
  }));
  return {
    id: String(m.match_id),
    duration: m.duration,
    startTime: m.start_time,
    radiantWin: m.radiant_win,
    radiantScore:
      m.radiant_score ??
      players
        .filter((p) => p.team === "radiant")
        .reduce((s, p) => s + p.kills, 0),
    direScore:
      m.dire_score ??
      players.filter((p) => p.team === "dire").reduce((s, p) => s + p.kills, 0),
    mode:
      m.game_mode === 22 ? "Рейтинговый · All Pick" : `Режим ${m.game_mode}`,
    rank: m.rank_tier
      ? rankName(m.rank_tier)
      : m.players.some((p) => p.rank_tier !== null)
        ? `≈ ${rankName(Math.round(m.players.reduce((sum, p) => sum + (p.rank_tier ?? 0), 0) / m.players.filter((p) => p.rank_tier !== null).length))}`
        : "Ранг недоступен",
    players,
    goldLeads: m.radiant_gold_adv ?? [],
    xpLeads: m.radiant_xp_adv ?? [],
    parsed: m.version !== null,
    source: "opendota",
    notice:
      "Данные OpenDota. IMP рассчитан локально; неизвестные позиции и лайнинг не оцениваются.",
  };
}
const stPlayer = z.object({
  steamAccountId: maybeN,
  steamAccount: z.object({ name: z.string().nullish() }).nullish(),
  heroId: n,
  isRadiant: z.boolean(),
  position: z.string().nullish(),
  lane: z.string().nullish(),
  kills: n,
  deaths: n,
  assists: n,
  goldPerMinute: n,
  experiencePerMinute: n,
  numLastHits: n,
  numDenies: n,
  networth: n,
  heroDamage: n,
  towerDamage: n,
  heroHealing: n,
  imp: maybeN,
  item0Id: n,
  item1Id: n,
  item2Id: n,
  item3Id: n,
  item4Id: n,
  item5Id: n,
  neutral0Id: maybeN,
  stats: z
    .object({
      itemPurchases: z
        .array(z.object({ itemId: z.number(), time: z.number() }))
        .nullish(),
    })
    .nullish(),
});
const stMatch = z.object({
  id: z.number(),
  durationSeconds: z.number(),
  startDateTime: z.number(),
  didRadiantWin: z.boolean(),
  gameMode: z.union([z.string(), z.number()]).nullish(),
  rank: maybeN,
  averageRank: maybeN,
  topLaneOutcome: z.string().nullish(),
  midLaneOutcome: z.string().nullish(),
  bottomLaneOutcome: z.string().nullish(),
  radiantNetworthLeads: z.array(z.number()).nullish(),
  radiantExperienceLeads: z.array(z.number()).nullish(),
  players: z.array(stPlayer).length(10),
});
const ST_FIELDS = `id durationSeconds startDateTime didRadiantWin gameMode rank averageRank topLaneOutcome midLaneOutcome bottomLaneOutcome radiantNetworthLeads radiantExperienceLeads players { steamAccountId steamAccount { name } heroId isRadiant position lane kills deaths assists goldPerMinute experiencePerMinute numLastHits numDenies networth heroDamage towerDamage heroHealing imp item0Id item1Id item2Id item3Id item4Id item5Id neutral0Id stats { itemPurchases { itemId time } } }`;
export function normalizeStratz(raw: unknown): Match {
  const m = stMatch.parse(raw);
  const players: MatchPlayer[] = m.players.map((p) => ({
    accountId: p.steamAccountId,
    name: p.steamAccount?.name ?? "Аноним",
    heroId: p.heroId,
    team: p.isRadiant ? "radiant" : "dire",
    role: /^POSITION_[1-5]$|^POS_[1-5]$/.test(p.position ?? "")
      ? (Number(p.position!.slice(-1)) as Role)
      : null,
    lane:
      (
        {
          SAFE_LANE: "Легкая",
          MID_LANE: "Мид",
          OFF_LANE: "Сложная",
          JUNGLE: "Лес",
        } as Record<string, string>
      )[p.lane ?? ""] ??
      p.lane ??
      null,
    laneOutcome: laneOutcome(p.lane, p.isRadiant, m),
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    gpm: p.goldPerMinute,
    xpm: p.experiencePerMinute,
    lastHits: p.numLastHits,
    denies: p.numDenies,
    networth: p.networth,
    heroDamage: p.heroDamage,
    towerDamage: p.towerDamage,
    healing: p.heroHealing,
    wards: p.stats?.itemPurchases
      ? p.stats.itemPurchases.filter((e) => [42, 43, 218].includes(e.itemId))
          .length
      : null,
    imp: p.imp,
    items: [p.item0Id, p.item1Id, p.item2Id, p.item3Id, p.item4Id, p.item5Id],
    neutralItem: p.neutral0Id,
    purchases: (p.stats?.itemPurchases ?? []).map((e) => ({
      id: e.itemId,
      name: itemName(e.itemId),
      time: e.time,
    })),
  }));
  return {
    id: String(m.id),
    duration: m.durationSeconds,
    startTime: m.startDateTime,
    radiantWin: m.didRadiantWin,
    radiantScore: players
      .filter((p) => p.team === "radiant")
      .reduce((s, p) => s + p.kills, 0),
    direScore: players
      .filter((p) => p.team === "dire")
      .reduce((s, p) => s + p.kills, 0),
    mode:
      m.gameMode === "ALL_PICK_RANKED"
        ? "Рейтинговый · All Pick"
        : m.gameMode === "ALL_PICK"
          ? "All Pick"
          : `Режим ${m.gameMode ?? "неизвестен"}`,
    rank: rankName(m.averageRank ?? m.rank),
    players,
    goldLeads: (m.radiantNetworthLeads ?? []).slice(1),
    xpLeads: (m.radiantExperienceLeads ?? []).slice(1),
    source: "stratz",
    parsed: players.some((p) => p.purchases.length > 0),
  };
}
export async function getMatch(id: string): Promise<Match> {
  if (id === "demo") return demoMatch();
  if (!/^\d{1,12}$/.test(id) || BigInt(id) === 0n)
    throw new DataError("Некорректный Match ID", 400);
  return cached(`match:${id}`, async () => {
    try {
      const data = await graphql(
        `query($id:Long!){match(id:$id){${ST_FIELDS}}}`,
        { id: Number(id) },
      );
      return normalizeStratz(data.match);
    } catch {
      return normalizeOpenDota(
        await requestJson(`https://api.opendota.com/api/matches/${id}`),
      );
    }
  });
}
const odRecent = z.object({
  match_id: z.number(),
  hero_id: n,
  player_slot: n,
  radiant_win: z.boolean(),
  kills: n,
  deaths: n,
  assists: n,
  duration: n,
  start_time: n,
  gold_per_min: maybeN,
  xp_per_min: maybeN,
  lane_role: maybeN,
});
async function openProfile(id: number): Promise<PlayerProfile> {
  const [raw, recent, wl, heroStats] = await Promise.all([
    requestJson(`https://api.opendota.com/api/players/${id}`),
    requestJson(
      `https://api.opendota.com/api/players/${id}/matches?limit=20&project=gold_per_min&project=xp_per_min&project=lane_role`,
    ).catch(() =>
      requestJson(`https://api.opendota.com/api/players/${id}/recentMatches`),
    ),
    requestJson(`https://api.opendota.com/api/players/${id}/wl`).catch(
      () => null,
    ),
    requestJson(`https://api.opendota.com/api/players/${id}/heroes`).catch(
      () => [],
    ),
  ]);
  const p = z
    .object({
      profile: z
        .object({ personaname: z.string(), avatarfull: z.string().nullish() })
        .nullish(),
      rank_tier: maybeN,
    })
    .parse(raw);
  const matches = z
    .array(odRecent)
    .parse(recent)
    .slice(0, 20)
    .map((m) => ({
      id: String(m.match_id),
      heroId: m.hero_id,
      won: m.player_slot < 128 === m.radiant_win,
      kills: m.kills,
      deaths: m.deaths,
      assists: m.assists,
      gpm: m.gold_per_min,
      xpm: m.xp_per_min,
      imp: null,
      role: m.lane_role === 2 ? (2 as const) : null,
      lane:
        ({ 1: "Легкая", 2: "Мид", 3: "Сложная" } as Record<number, string>)[
          m.lane_role ?? 0
        ] ?? null,
      duration: m.duration,
      startTime: m.start_time,
    }));
  const record = z
    .object({ win: z.number(), lose: z.number() })
    .nullable()
    .parse(wl);
  return {
    accountId: id,
    name: p.profile?.personaname ?? `Игрок ${id}`,
    avatar: p.profile?.avatarfull ?? null,
    rank: rankName(p.rank_tier),
    wins: record?.win ?? null,
    losses: record?.lose ?? null,
    matches,
    heroes: z
      .array(
        z.object({ hero_id: z.number(), games: z.number(), win: z.number() }),
      )
      .parse(heroStats)
      .slice(0, 3)
      .map((h) => ({ heroId: h.hero_id, games: h.games, wins: h.win })),
    private: !matches.length,
    source: "opendota",
  };
}
async function loadProfile(id: string): Promise<PlayerProfile> {
  if (id === "demo") return demoProfile();
  if (!/^\d{1,10}$/.test(id) || Number(id) <= 0 || Number(id) > 4294967295)
    throw new DataError("Некорректный Account ID", 400);
  return cached(`player:${id}`, async () => {
    if (process.env.STRATZ_API_TOKEN)
      try {
        const data = await graphql(
          `query($id:Long!){player(steamAccountId:$id){winCount matchCount heroesPerformance(take:3){heroId matchCount winCount} steamAccount{name avatar seasonRank} matches(request:{take:20}){${ST_FIELDS}}}}`,
          { id: Number(id) },
        );
        const p = z
          .object({
            winCount: maybeN,
            matchCount: maybeN,
            heroesPerformance: z
              .array(
                z.object({
                  heroId: z.number(),
                  matchCount: z.number(),
                  winCount: z.number(),
                }),
              )
              .nullish(),
            steamAccount: z.object({
              name: z.string().nullish(),
              avatar: z.string().nullish(),
              seasonRank: maybeN,
            }),
            matches: z.array(z.unknown()),
          })
          .parse(data.player);
        const matches = p.matches.map(normalizeStratz).flatMap((m) => {
          const a = m.players.find((p) => p.accountId === Number(id));
          return a
            ? [
                {
                  id: m.id,
                  heroId: a.heroId,
                  won: (a.team === "radiant") === m.radiantWin,
                  kills: a.kills,
                  deaths: a.deaths,
                  assists: a.assists,
                  gpm: a.gpm,
                  xpm: a.xpm,
                  imp: a.imp,
                  badge: analyzeImpact(m).get(a)?.badge,
                  role: a.role,
                  lane: a.lane,
                  duration: m.duration,
                  startTime: m.startTime,
                },
              ]
            : [];
        });
        const heroMap = new Map<
          number,
          { heroId: number; games: number; wins: number }
        >();
        for (const m of matches) {
          const h = heroMap.get(m.heroId) ?? {
            heroId: m.heroId,
            games: 0,
            wins: 0,
          };
          h.games++;
          h.wins += Number(m.won);
          heroMap.set(h.heroId, h);
        }
        return {
          accountId: Number(id),
          name: p.steamAccount.name ?? `Игрок ${id}`,
          avatar: p.steamAccount.avatar ?? null,
          rank: rankName(p.steamAccount.seasonRank),
          wins: p.winCount,
          losses:
            p.matchCount !== null && p.winCount !== null
              ? p.matchCount - p.winCount
              : null,
          matches,
          heroes:
            p.heroesPerformance?.map((h) => ({
              heroId: h.heroId,
              games: h.matchCount,
              wins: h.winCount,
            })) ??
            [...heroMap.values()].sort((a, b) => b.games - a.games).slice(0, 3),
          private: !matches.length,
          source: "stratz",
        } satisfies PlayerProfile;
      } catch {
        /* OpenDota is the public fallback. */
      }
    return openProfile(Number(id));
  });
}

// Lane outcomes are reported per physical lane; Dire safe lane is top.
function laneOutcome(
  lane: string | null | undefined,
  radiant: boolean,
  m: {
    topLaneOutcome?: string | null;
    midLaneOutcome?: string | null;
    bottomLaneOutcome?: string | null;
  },
) {
  const result =
    lane === "MID_LANE"
      ? m.midLaneOutcome
      : lane === "SAFE_LANE"
        ? radiant
          ? m.bottomLaneOutcome
          : m.topLaneOutcome
        : lane === "OFF_LANE"
          ? radiant
            ? m.topLaneOutcome
            : m.bottomLaneOutcome
          : null;
  if (!result) return null;
  if (result === "TIE") return "ничья";
  const won = result.startsWith(radiant ? "RADIANT" : "DIRE");
  return `${won ? "победа" : "поражение"}${result.endsWith("STOMP") ? " в салат" : ""}`;
}
export async function getProfile(id: string): Promise<PlayerProfile> {
  const profile = await loadProfile(id);
  if (id === "demo" || !process.env.STEAM_API_KEY) return profile;
  try {
    return await cached(`steam-profile:${id}`, async () => {
      const url = new URL(
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
      );
      url.search = new URLSearchParams({
        key: process.env.STEAM_API_KEY!,
        steamids: String(BigInt(id) + 76561197960265728n),
      }).toString();
      const raw = z
        .object({
          response: z.object({
            players: z.array(
              z.object({
                personaname: z.string(),
                avatarfull: z.string().optional(),
              }),
            ),
          }),
        })
        .parse(await requestJson(url.toString()));
      const steam = raw.response.players[0];
      return steam
        ? {
            ...profile,
            name: steam.personaname,
            avatar: steam.avatarfull ?? profile.avatar,
          }
        : profile;
    });
  } catch {
    return profile;
  }
}
