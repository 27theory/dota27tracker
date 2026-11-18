import type { Match, MatchPlayer, PlayerProfile } from "./types";
export const DEMO_ID = "demo";
const specs = [
  [44, "Yatoro", 321580662, 1, 18, 3, 12, 782, 844, 31200, 38642, 14280, 42],
  [74, "Larl", 367920000, 2, 10, 4, 20, 604, 721, 24800, 32800, 4200, 28],
  [129, "Collapse", 302214028, 3, 7, 5, 23, 522, 645, 21300, 27420, 3800, 24],
  [26, "Mira", 113331514, 4, 3, 6, 26, 342, 510, 13200, 18100, 920, 14],
  [5, "Miposhka", 43177086, 5, 2, 7, 28, 298, 426, 11600, 12600, 640, 17],
  [1, "dyrachyo", 116585378, 1, 7, 9, 8, 543, 624, 23400, 24310, 2400, -8],
  [13, "Quinn", 221666230, 2, 8, 8, 9, 561, 680, 24100, 31800, 1400, 19],
  [2, "Ace", 86745912, 3, 3, 12, 7, 352, 419, 15200, 16400, 420, -38],
  [86, "tOfu", 82262664, 4, 4, 6, 11, 310, 412, 12800, 14200, 260, -19],
  [66, "Seleri", 91730177, 5, 3, 5, 13, 268, 366, 10900, 11100, 180, -12],
] as const;
export function demoMatch(): Match {
  const players: MatchPlayer[] = specs.map((s, i) => {
    const isRadiant = i < 5;
    const teamKills = isRadiant ? 40 : 25;
    const core = s[3] <= 3;
    return {
      heroId: s[0],
      name: s[1],
      accountId: s[2],
      role: s[3],
      team: isRadiant ? "radiant" : "dire",
      kills: s[4],
      deaths: s[5],
      assists: s[6],
      gpm: s[7],
      xpm: s[8],
      networth: s[9],
      heroDamage: s[10],
      towerDamage: s[11],
      imp: s[12],
      lastHits: i % 5 < 3 ? 280 + i * 9 : 32 + i * 2,
      denies: 8 + i,
      healing: i % 5 === 4 ? 6400 : 0,
      wards: i % 5 >= 3 ? 14 : 0,
      smokes: i % 5 >= 3 ? 4 : 1,
      dusts: i % 5 >= 3 ? 6 : 0,
      teamfightParticipation: Math.round(((s[4] + s[6]) / teamKills) * 100),
      lh10: core ? (isRadiant ? 68 - (i % 3) * 8 : 52 - (i % 3) * 9) : 12,
      dn10: core ? (isRadiant ? 14 - (i % 3) * 3 : 7 - (i % 3) * 2) : 3,
      lh20: core ? (isRadiant ? 168 - (i % 3) * 18 : 124 - (i % 3) * 16) : 28,
      dn20: core ? (isRadiant ? 22 - (i % 3) * 4 : 11 - (i % 3) * 2) : 5,
      gold10: core ? (isRadiant ? 4850 - (i % 3) * 350 : 3950 - (i % 3) * 420) : 2450,
      xp10: core ? (isRadiant ? 5200 - (i % 3) * 300 : 4400 - (i % 3) * 350) : 2700,
      deathsBefore15m: isRadiant ? (i % 5 >= 3 ? 2 : 1) : i === 7 ? 5 : 2,
      deathsAfter35m: isRadiant ? 1 : i === 7 ? 4 : 2,
      lane:
        s[3] === 2 ? "Мид" : s[3] === 3 || s[3] === 4 ? "Сложная" : "Легкая",
      laneOutcome: isRadiant ? "победа" : "поражение",
      items:
        i % 5 === 0
          ? [145, 116, 147, 208, 63, 139]
          : i % 5 === 1
            ? [48, 116, 108, 29, 119, 1]
            : [180, 36, 79, 254, 218, 1],
      neutralItem: 359,
      purchases:
        i % 5 === 0
          ? [
              { id: 145, name: "Battle Fury", time: 800 + i * 17 },
              { id: 147, name: "Manta Style", time: 1120 + i * 25 },
              { id: 116, name: "Black King Bar", time: 1330 + i * 40 },
              { id: 208, name: "Abyssal Blade", time: 1890 + i * 30 },
            ]
          : i % 5 <= 2
            ? [
                { id: 1, name: "Blink Dagger", time: 740 + i * 17 },
                { id: 108, name: "Aghanim's Scepter", time: 1090 + i * 20 },
                { id: 116, name: "Black King Bar", time: 1330 + i * 40 },
              ]
            : [
                { id: 254, name: "Glimmer Cape", time: 1100 + i * 17 },
                { id: 102, name: "Force Staff", time: 1600 + i * 40 },
              ],
    };
  });
  return {
    id: DEMO_ID,
    duration: 2418,
    startTime: Math.floor(Date.now() / 1000) - 7200,
    radiantWin: true,
    radiantScore: 40,
    direScore: 25,
    mode: "Рейтинговый · All Pick",
    rank: "Титан",
    source: "demo",
    parsed: true,
    players,
    goldLeads: Array.from({ length: 41 }, (_, i) =>
      Math.round(
        i < 12
          ? Math.sin(i * 0.5) * 950
          : i < 24
            ? (i - 12) * 420 + Math.sin(i) * 1600
            : (i - 21) * 920 + Math.sin(i) * 1200,
      ),
    ),
    xpLeads: Array.from({ length: 41 }, (_, i) =>
      Math.round(i * 320 + Math.sin(i) * 1200),
    ),
  };
}
export function demoProfile(offset = 0, limit = 150): PlayerProfile {
  const match = demoMatch();
  const totalDemo = 250;
  const count = Math.max(0, Math.min(limit, totalDemo - offset));
  return {
    accountId: 321580662,
    name: "Yatoro",
    avatar: null,
    rank: "Титан · 27",
    wins: 1248,
    losses: 875,
    source: "demo",
    private: false,
    hasMore: offset + count < totalDemo,
    heroes: [
      { heroId: 44, games: 128, wins: 82 },
      { heroId: 1, games: 96, wins: 59 },
      { heroId: 8, games: 84, wins: 51 },
    ],
    matches: Array.from({ length: count }, (_, idx) => {
      const i = offset + idx;
      return {
        id: DEMO_ID,
        heroId: [44, 1, 8, 10, 67, 44, 6][i % 7],
        won: i % 4 !== 2,
        kills: 18 - (i % 11),
        deaths: 3 + (i % 7),
        assists: 12 + (i % 9),
        gpm: 782 - (i % 20) * 11,
        xpm: 844 - (i % 20) * 8,
        imp: 42 - (i % 25) * 3,
        role: 1,
        lane: "Легкая",
        duration: match.duration - (i % 18) * 22,
        startTime: match.startTime - i * 5300,
      };
    }),
  };
}
