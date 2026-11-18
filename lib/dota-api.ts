import "server-only";
import { z } from "zod";
import type { Match, MatchPlayer, PlayerProfile, Role } from "./types";
import { itemId, itemName, rankName } from "./format";
import { demoMatch, demoProfile } from "./demo";
import {
  cached,
  clearCache,
  MATCH_TTL,
  PLAYER_TTL,
} from "./cache";

export { cached, clearCache, MATCH_TTL, PLAYER_TTL };

export const INITIAL_PROFILE_MATCHES = 150;
export const PROFILE_PAGE_STEP = 50;

export class DataError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export async function runBatched<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = 5,
): Promise<PromiseSettledResult<R>[]> {
  const step = Math.max(1, Math.min(10, concurrency));
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += step) {
    const slice = items.slice(i, i + step);
    const settled = await Promise.allSettled(slice.map((item) => worker(item)));
    results.push(...settled);
  }
  return results;
}

export async function requestJson(
  url: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
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

async function graphql(
  query: string,
  variables: Record<string, unknown>,
  timeoutMs = 15000,
) {
  if (!process.env.STRATZ_API_TOKEN)
    throw new DataError("STRATZ token missing");
  const raw = z
    .object({
      data: z.record(z.string(), z.unknown()).nullable().optional(),
      errors: z.array(z.object({ message: z.string() })).optional(),
    })
    .parse(
      await requestJson(
        "https://api.stratz.com/graphql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "STRATZ_API",
            Authorization: `Bearer ${process.env.STRATZ_API_TOKEN}`,
          },
          body: JSON.stringify({ query, variables }),
        },
        timeoutMs,
      ),
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
  teamfight_participation: maybeN,
  lh_t: z.array(z.number()).nullish(),
  dn_t: z.array(z.number()).nullish(),
  gold_t: z.array(z.number()).nullish(),
  xp_t: z.array(z.number()).nullish(),
  purchase: z
    .object({
      ward_observer: n,
      ward_sentry: n,
      smoke_of_deceit: n,
      dust: n,
    })
    .nullish(),
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

function atMinute(arr: number[] | null | undefined, minute: number): number | null {
  if (!arr || !arr.length) return null;
  if (arr.length > minute) return arr[minute];
  return null;
}

function sumUntilMinute(arr: number[] | null | undefined, minute: number): number | null {
  if (!arr || !arr.length) return null;
  const end = Math.min(arr.length, minute + 1);
  if (end <= 1) return null;
  let total = 0;
  for (let i = 1; i < end; i++) total += arr[i] ?? 0;
  return total;
}

export function normalizeOpenDota(data: unknown): Match {
  const m = odMatch.parse(data);
  const radiantKills =
    m.radiant_score ??
    m.players
      .filter((p) => p.player_slot < 128)
      .reduce((s, p) => s + p.kills, 0);
  const direKills =
    m.dire_score ??
    m.players
      .filter((p) => p.player_slot >= 128)
      .reduce((s, p) => s + p.kills, 0);

  const players: MatchPlayer[] = m.players.map((p) => {
    const isRadiant = p.player_slot < 128;
    const teamKills = Math.max(1, isRadiant ? radiantKills : direKills);
    const tfPct =
      p.teamfight_participation !== null
        ? Math.round(
            p.teamfight_participation <= 1
              ? p.teamfight_participation * 100
              : p.teamfight_participation,
          )
        : Math.min(100, Math.round(((p.kills + p.assists) / teamKills) * 100));
    return {
      accountId: p.account_id,
      name: p.personaname ?? p.name ?? "Аноним",
      heroId: p.hero_id,
      team: isRadiant ? "radiant" : "dire",
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
      smokes: p.purchase ? p.purchase.smoke_of_deceit : null,
      dusts: p.purchase ? p.purchase.dust : null,
      teamfightParticipation: tfPct,
      lh10: atMinute(p.lh_t, 10),
      dn10: atMinute(p.dn_t, 10),
      lh20: atMinute(p.lh_t, 20),
      dn20: atMinute(p.dn_t, 20),
      gold10: atMinute(p.gold_t, 10),
      xp10: atMinute(p.xp_t, 10),
      deathsBefore15m: null,
      deathsAfter35m: null,
      imp: null,
      items: [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5],
      neutralItem: p.item_neutral,
      purchases: (p.purchase_log ?? []).map((e) => ({
        id: itemId(e.key),
        name: itemName(itemId(e.key)),
        time: e.time,
      })),
    };
  });
  return {
    id: String(m.match_id),
    duration: m.duration,
    startTime: m.start_time,
    radiantWin: m.radiant_win,
    radiantScore: radiantKills,
    direScore: direKills,
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

function parseRole(pos: string | null | undefined): Role | null {
  return /^POSITION_[1-5]$|^POS_[1-5]$/.test(pos ?? "")
    ? (Number(pos!.slice(-1)) as Role)
    : null;
}

function parseLane(lane: string | null | undefined): string | null {
  return (
    (
      {
        SAFE_LANE: "Легкая",
        MID_LANE: "Мид",
        OFF_LANE: "Сложная",
        JUNGLE: "Лес",
      } as Record<string, string>
    )[lane ?? ""] ??
    lane ??
    null
  );
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
      lastHitPerMinute: z.array(z.number()).nullish(),
      deniesPerMinute: z.array(z.number()).nullish(),
      networthPerMinute: z.array(z.number()).nullish(),
      experiencePerMinute: z.array(z.number()).nullish(),
      deathEvents: z.array(z.object({ time: z.number() })).nullish(),
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

const ST_FIELDS = `id durationSeconds startDateTime didRadiantWin gameMode rank averageRank topLaneOutcome midLaneOutcome bottomLaneOutcome radiantNetworthLeads radiantExperienceLeads players { steamAccountId steamAccount { name } heroId isRadiant position lane kills deaths assists goldPerMinute experiencePerMinute numLastHits numDenies networth heroDamage towerDamage heroHealing imp item0Id item1Id item2Id item3Id item4Id item5Id neutral0Id stats { itemPurchases { itemId time } lastHitPerMinute deniesPerMinute networthPerMinute experiencePerMinute deathEvents { time } } }`;

const ST_PROFILE_MATCH_FIELDS = `id durationSeconds startDateTime didRadiantWin gameMode players(steamAccountId: $id) { steamAccountId heroId isRadiant position lane kills deaths assists goldPerMinute experiencePerMinute imp }`;

const stProfilePlayer = z.object({
  steamAccountId: maybeN,
  heroId: n,
  isRadiant: z.boolean(),
  position: z.string().nullish(),
  lane: z.string().nullish(),
  kills: n,
  deaths: n,
  assists: n,
  goldPerMinute: maybeN,
  experiencePerMinute: maybeN,
  imp: maybeN,
});

const stProfileMatch = z.object({
  id: z.number(),
  durationSeconds: n,
  startDateTime: n,
  didRadiantWin: z.boolean(),
  gameMode: z.union([z.string(), z.number()]).nullish(),
  players: z.array(stProfilePlayer),
});

export function normalizeStratz(raw: unknown): Match {
  const m = stMatch.parse(raw);
  const radiantKills = m.players
    .filter((p) => p.isRadiant)
    .reduce((s, p) => s + p.kills, 0);
  const direKills = m.players
    .filter((p) => !p.isRadiant)
    .reduce((s, p) => s + p.kills, 0);

  const players: MatchPlayer[] = m.players.map((p) => {
    const teamKills = Math.max(1, p.isRadiant ? radiantKills : direKills);
    const purchasesRaw = p.stats?.itemPurchases ?? null;
    const deathEvents = p.stats?.deathEvents ?? null;
    return {
      accountId: p.steamAccountId,
      name: p.steamAccount?.name ?? "Аноним",
      heroId: p.heroId,
      team: p.isRadiant ? "radiant" : "dire",
      role: parseRole(p.position),
      lane: parseLane(p.lane),
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
      wards: purchasesRaw
        ? purchasesRaw.filter((e) => [42, 43, 218].includes(e.itemId)).length
        : null,
      smokes: purchasesRaw
        ? purchasesRaw.filter((e) => e.itemId === 188).length
        : null,
      dusts: purchasesRaw
        ? purchasesRaw.filter((e) => e.itemId === 40).length
        : null,
      teamfightParticipation: Math.min(
        100,
        Math.round(((p.kills + p.assists) / teamKills) * 100),
      ),
      lh10: sumUntilMinute(p.stats?.lastHitPerMinute, 10),
      dn10: sumUntilMinute(p.stats?.deniesPerMinute, 10),
      lh20: sumUntilMinute(p.stats?.lastHitPerMinute, 20),
      dn20: sumUntilMinute(p.stats?.deniesPerMinute, 20),
      gold10: atMinute(p.stats?.networthPerMinute, 10),
      xp10: sumUntilMinute(p.stats?.experiencePerMinute, 10),
      deathsBefore15m: deathEvents
        ? deathEvents.filter((d) => d.time < 900).length
        : null,
      deathsAfter35m: deathEvents
        ? deathEvents.filter((d) => d.time >= 2100).length
        : null,
      imp: p.imp,
      items: [p.item0Id, p.item1Id, p.item2Id, p.item3Id, p.item4Id, p.item5Id],
      neutralItem: p.neutral0Id,
      purchases: (purchasesRaw ?? []).map((e) => ({
        id: e.itemId,
        name: itemName(e.itemId),
        time: e.time,
      })),
    };
  });
  return {
    id: String(m.id),
    duration: m.durationSeconds,
    startTime: m.startDateTime,
    radiantWin: m.didRadiantWin,
    radiantScore: radiantKills,
    direScore: direKills,
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

export async function getMatch(
  id: string,
  forceRefresh = false,
): Promise<Match> {
  if (id === "demo") return demoMatch();
  if (!/^\d{1,12}$/.test(id) || BigInt(id) === 0n)
    throw new DataError("Некорректный Match ID", 400);
  return cached(
    `match:${id}`,
    async () => {
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
    },
    MATCH_TTL,
    forceRefresh,
  );
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

function aggregateHeroes(
  matches: { heroId: number; won: boolean }[],
): { heroId: number; games: number; wins: number }[] {
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
    heroMap.set(m.heroId, h);
  }
  return [...heroMap.values()].sort((a, b) => b.games - a.games).slice(0, 3);
}

async function openProfile(
  id: number,
  offset = 0,
  limit = INITIAL_PROFILE_MATCHES,
): Promise<PlayerProfile> {
  const projectFields = [
    "hero_id",
    "player_slot",
    "radiant_win",
    "kills",
    "deaths",
    "assists",
    "duration",
    "start_time",
    "gold_per_min",
    "xp_per_min",
    "lane_role",
  ]
    .map((f) => `project=${f}`)
    .join("&");

  const tasks: (() => Promise<unknown>)[] = [
    () => requestJson(`https://api.opendota.com/api/players/${id}`),
    () =>
      requestJson(
        `https://api.opendota.com/api/players/${id}/matches?limit=${limit}&offset=${offset}&${projectFields}`,
      ).catch(() =>
        offset === 0
          ? requestJson(
              `https://api.opendota.com/api/players/${id}/recentMatches`,
            )
          : [],
      ),
    () => requestJson(`https://api.opendota.com/api/players/${id}/wl`),
    () => requestJson(`https://api.opendota.com/api/players/${id}/heroes`),
  ];

  const [rawRes, recentRes, wlRes, heroStatsRes] = await runBatched(
    tasks,
    (fn) => fn(),
    5,
  );

  if (rawRes.status === "rejected") throw rawRes.reason;
  if (recentRes.status === "rejected") throw recentRes.reason;

  const raw = rawRes.value;
  const recent = recentRes.value;
  const wl = wlRes.status === "fulfilled" ? wlRes.value : null;
  const heroStats =
    heroStatsRes.status === "fulfilled" ? heroStatsRes.value : [];

  const p = z
    .object({
      profile: z
        .object({ personaname: z.string(), avatarfull: z.string().nullish() })
        .nullish(),
      rank_tier: maybeN,
    })
    .parse(raw);

  const parsedRecent = z.array(odRecent).parse(recent);
  const matches = parsedRecent.slice(0, limit).map((m) => ({
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
    .catch(null)
    .parse(wl);

  const parsedHeroes = z
    .array(
      z.object({ hero_id: z.number(), games: z.number(), win: z.number() }),
    )
    .catch([])
    .parse(heroStats)
    .filter((h) => h.games > 0)
    .slice(0, 3)
    .map((h) => ({ heroId: h.hero_id, games: h.games, wins: h.win }));

  return {
    accountId: id,
    name: p.profile?.personaname ?? `Игрок ${id}`,
    avatar: p.profile?.avatarfull ?? null,
    rank: rankName(p.rank_tier),
    wins: record?.win ?? null,
    losses: record?.lose ?? null,
    matches,
    heroes: parsedHeroes.length ? parsedHeroes : aggregateHeroes(matches),
    private: offset === 0 && !matches.length,
    hasMore: matches.length >= limit,
    source: "opendota",
  };
}

function profileBadge(imp: number | null, won: boolean): string | undefined {
  if (imp === null) return undefined;
  if (imp <= -30) return "Руинер";
  if (imp <= -15) return "Близок к руину";
  if (!won && imp > 15) return "Тащил 1v9";
  if (imp > 15) return "Высокий импакт";
  return "Стабильно";
}

async function loadProfile(
  id: string,
  offset = 0,
  limit = INITIAL_PROFILE_MATCHES,
  forceRefresh = false,
): Promise<PlayerProfile> {
  if (id === "demo") return demoProfile(offset, limit);
  if (!/^\d{1,10}$/.test(id) || Number(id) <= 0 || Number(id) > 4294967295)
    throw new DataError("Некорректный Account ID", 400);
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  return cached(
    `player:${id}:${safeOffset}:${safeLimit}`,
    async () => {
      if (process.env.STRATZ_API_TOKEN) {
        try {
          const targetId = Number(id);
          const chunks: { skip: number; take: number }[] = [];
          let remaining = safeLimit;
          let currentSkip = safeOffset;
          while (remaining > 0) {
            const take = Math.min(100, remaining);
            chunks.push({ skip: currentSkip, take });
            currentSkip += take;
            remaining -= take;
          }

          const settled = await runBatched(
            chunks.map((c, idx) => ({ ...c, idx })),
            (c) =>
              c.idx === 0
                ? graphql(
                    `query($id:Long!,$take:Int!,$skip:Int!){player(steamAccountId:$id){winCount matchCount heroesPerformance(take:3){heroId matchCount winCount} steamAccount{name avatar seasonRank} matches(request:{take:$take,skip:$skip}){${ST_PROFILE_MATCH_FIELDS}}}}`,
                    { id: targetId, take: c.take, skip: c.skip },
                    5000,
                  )
                : graphql(
                    `query($id:Long!,$take:Int!,$skip:Int!){player(steamAccountId:$id){matches(request:{take:$take,skip:$skip}){${ST_PROFILE_MATCH_FIELDS}}}}`,
                    { id: targetId, take: c.take, skip: c.skip },
                    5000,
                  ),
            5,
          );

          const first = settled[0];
          if (!first || first.status === "rejected") {
            throw first?.status === "rejected"
              ? first.reason
              : new DataError("STRATZ failed");
          }

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
              matches: z.array(stProfileMatch),
            })
            .parse(first.value.player);

          const allRawMatches = [...p.matches];
          for (let i = 1; i < settled.length; i++) {
            const item = settled[i];
            if (item.status === "fulfilled") {
              const extra = z
                .object({ matches: z.array(stProfileMatch) })
                .safeParse(item.value.player);
              if (extra.success) allRawMatches.push(...extra.data.matches);
            }
          }

          const matches = allRawMatches.slice(0, safeLimit).flatMap((m) => {
            const a =
              m.players.find((pl) => pl.steamAccountId === targetId) ??
              m.players[0];
            if (!a) return [];
            const won = a.isRadiant === m.didRadiantWin;
            return [
              {
                id: String(m.id),
                heroId: a.heroId,
                won,
                kills: a.kills,
                deaths: a.deaths,
                assists: a.assists,
                gpm: a.goldPerMinute,
                xpm: a.experiencePerMinute,
                imp: a.imp,
                badge: profileBadge(a.imp, won),
                role: parseRole(a.position),
                lane: parseLane(a.lane),
                duration: m.durationSeconds,
                startTime: m.startDateTime,
              },
            ];
          });

          return {
            accountId: targetId,
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
              })) ?? aggregateHeroes(matches),
            private: safeOffset === 0 && !matches.length,
            hasMore: matches.length >= safeLimit,
            source: "stratz",
          } satisfies PlayerProfile;
        } catch {}
      }
      return openProfile(Number(id), safeOffset, safeLimit);
    },
    PLAYER_TTL,
    forceRefresh,
  );
}

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

export async function getProfile(
  id: string,
  options?: { offset?: number; limit?: number; refresh?: boolean },
): Promise<PlayerProfile> {
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? INITIAL_PROFILE_MATCHES;
  const refresh = options?.refresh ?? false;
  if (refresh) {
    await clearCache(`player:${id}`);
  }
  const profile = await loadProfile(id, offset, limit, refresh);
  if (id === "demo" || !process.env.STEAM_API_KEY) return profile;
  try {
    const steam = await cached(
      `steam-profile:${id}`,
      async () => {
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
        return raw.response.players[0] ?? null;
      },
      PLAYER_TTL,
      refresh,
    );
    return steam
      ? {
          ...profile,
          name: steam.personaname,
          avatar: steam.avatarfull ?? profile.avatar,
        }
      : profile;
  } catch {
    return profile;
  }
}
