import type { Match, MatchPlayer } from "./types";
export interface Impact {
  score: number;
  estimated: boolean;
  badge: string;
  tone: "gold" | "green" | "red" | "muted";
  reasons: string[];
}
export function impactScore(p: MatchPlayer): number {
  if (p.imp !== null) return p.imp;
  const core = p.role !== null && p.role <= 3;
  return Math.round(
    Math.max(
      -100,
      Math.min(
        100,
        (p.kills + p.assists * 0.55 - p.deaths * 1.8) * 1.8 +
          (p.gpm - (core ? 450 : 300)) / 12 +
          p.towerDamage / 1800,
      ),
    ),
  );
}
export function analyzeImpact(match: Match): Map<MatchPlayer, Impact> {
  const winners = match.players.filter(
    (p) => (p.team === "radiant") === match.radiantWin,
  );
  const mvp = [...winners].sort((a, b) => impactScore(b) - impactScore(a))[0];
  const maxTower = Math.max(...match.players.map((p) => p.towerDamage));
  return new Map(
    match.players.map((p) => {
      const score = impactScore(p);
      const core = p.role !== null && p.role <= 3;
      const teamKills =
        p.team === "radiant" ? match.radiantScore : match.direScore;
      const feeding =
        core &&
        p.deaths >= 12 &&
        (p.kills + p.assists) / Math.max(1, teamKills) < 0.25 &&
        p.towerDamage < 1000;
      const lowFarm =
        core && match.duration >= 1200 && p.gpm < 250 && p.xpm < 300;
      const loser = (p.team === "radiant") !== match.radiantWin;
      let badge = "Стабильно";
      let tone: Impact["tone"] = "muted";
      const reasons: string[] = [];
      if (p === mvp) {
        badge = "MVP";
        tone = "gold";
      } else if (score <= -30 || feeding || lowFarm) {
        badge = "Руинер";
        tone = "red";
        reasons.push(
          feeding
            ? `${p.deaths} смертей · низкое участие`
            : lowFarm
              ? "Критически низкий темп"
              : "Низкий импакт",
        );
      } else if (
        score <= -15 ||
        (core && match.duration >= 1200 && p.gpm < 350 && p.xpm < 400) ||
        (p.laneOutcome === "поражение в салат" && score <= 0)
      ) {
        badge = "Близок к руину";
        tone = "red";
        reasons.push("Просел по темпу");
      } else if (loser && score > 15) {
        badge = "Тащил 1v9";
        tone = "green";
      } else if (score > 15) {
        badge = "Высокий импакт";
        tone = "green";
      }
      if (p.towerDamage === maxTower && maxTower > 0)
        reasons.push("Топ урон по вышкам");
      if (p.laneOutcome?.includes("победа")) reasons.push("Выиграл лайн");
      const bkb = p.purchases.find((i) => i.id === 116);
      if (core && bkb && bkb.time > 27 * 60)
        reasons.push(`BKB на ${Math.floor(bkb.time / 60)} мин`);
      if (!reasons.length)
        reasons.push(`${p.gpm} GPM · ${p.kills + p.assists} участий`);
      return [p, { score, estimated: p.imp === null, badge, tone, reasons }];
    }),
  );
}
