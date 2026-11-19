import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock3,
  Shield,
  Swords,
  Terminal,
  Trophy,
} from "lucide-react";
import { demoMatch } from "@/lib/demo";
import { heroName, number, roles, time } from "@/lib/format";
import { analyzeImpact } from "@/lib/impact-analyzer";
import { SteamIcon } from "@/components/header";
import { SearchBox } from "@/components/search";
import { HeroPortrait, ImpactBar, ItemIcon } from "@/components/ui";

const PROS = [
  {
    name: "Yatoro",
    team: "Team Spirit",
    role: "Керри (Pos 1)",
    hero: 44,
    id: 321580662,
  },
  {
    name: "Collapse",
    team: "Team Spirit",
    role: "Оффлейн (Pos 3)",
    hero: 97,
    id: 302214028,
  },
  {
    name: "Miracle-",
    team: "Nigma Galaxy",
    role: "Мид / Керри",
    hero: 74,
    id: 105248644,
  },
];

export default function HomePage() {
  const m = demoMatch();
  const impacts = analyzeImpact(m);
  const winners = m.players.filter(
    (p) => (p.team === "radiant") === m.radiantWin,
  );
  const mvp = [...winners].sort(
    (a, b) => impacts.get(b)!.score - impacts.get(a)!.score,
  )[0];

  return (
    <div className="home-shell">
      <section className="tracker-top">
        <div className="tracker-bar">
          <div>
            <h1 className="tracker-title">
              Трекер матчей и телеметрия <span>Dota 2</span>
            </h1>
            <p className="tracker-sub">
              STRATZ + OpenDota API · Лайнинг 10/20м, тайминги предметов, IMP и
              разбор по 10 героям
            </p>
          </div>
          <div className="tracker-actions">
            <a className="button button-gold" href="/api/auth/steam">
              <SteamIcon /> Войти через Steam
            </a>
            <Link className="button button-ghost" href="/match/demo">
              Открыть разбор <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <SearchBox />

        <div className="pro-grid">
          {PROS.map((p) => (
            <Link
              key={p.id}
              href={`/player/${p.id}`}
              className="pro-card"
            >
              <HeroPortrait id={p.hero} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <b className="truncate">{p.name}</b>
                  <span className="tabular-nums dim text-[10px]">#{p.id}</span>
                </div>
                <small className="truncate">
                  {p.team} · {p.role}
                </small>
              </div>
              <ArrowRight size={13} className="dim shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      <section className="preview-section">
        <div className="section-heading">
          <div className="flex items-center gap-3 flex-wrap">
            <h2>Превью разбора матча</h2>
            <span className="tag gold tabular-nums">
              {m.mode} · {m.rank}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-link" href="/match/demo#coach">
              <Terminal size={13} /> AI-разбор матча
            </Link>
            <Link className="text-link" href="/match/demo">
              Полный отчёт <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="preview-summary">
          <div className="preview-score tabular-nums">
            <span className="green font-semibold">Radiant</span>
            <b className="green">{m.radiantScore}</b>
            <span className="dim">:</span>
            <b className="red">{m.direScore}</b>
            <span className="red font-semibold">Dire</span>
            <span className="preview-meta">
              <Clock3 size={12} /> {time(m.duration)}
            </span>
            <span className="preview-meta">
              <Shield size={12} /> Победа {m.radiantWin ? "Radiant" : "Dire"}
            </span>
          </div>
          {mvp && (
            <div className="preview-mvp tabular-nums">
              <Trophy size={13} className="gold" />
              <span className="dim">MVP:</span>
              <b>{mvp.name}</b>
              <span className="muted">({heroName(mvp.heroId)})</span>
              <span className="gold font-semibold">
                +{impacts.get(mvp)!.score} IMP
              </span>
            </div>
          )}
        </div>

        <div className="table-scroll">
          <table className="min-w-[880px] tabular-nums">
            <thead>
              <tr>
                <th className="px-3">КОМАНДА / ИГРОК</th>
                <th className="px-3">РОЛЬ / ЛАЙН</th>
                <th className="px-3">K / D / A</th>
                <th className="px-3">LH / DN</th>
                <th className="px-3">GPM / XPM</th>
                <th className="px-3">НЕТВОРС</th>
                <th className="px-3">УРОН / ВЫШКИ</th>
                <th className="px-3">IMP</th>
                <th className="px-3">ПРЕДМЕТЫ</th>
              </tr>
            </thead>
            <tbody>
              {m.players.map((p, i) => {
                const imp = impacts.get(p)!;
                return (
                  <tr key={i}>
                    <td className="px-3">
                      <div className="player-cell">
                        <span
                          className={`team-pill ${p.team === "radiant" ? "green" : "red"}`}
                        >
                          {p.team === "radiant" ? "R" : "D"}
                        </span>
                        <HeroPortrait id={p.heroId} className="shrink-0" />
                        <div className="min-w-0">
                          <Link
                            href={`/player/${p.accountId ?? "demo"}`}
                            className="account-link block truncate"
                          >
                            <b>{p.name}</b>
                          </Link>
                          <small className="truncate">{heroName(p.heroId)}</small>
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      {p.role ? roles[p.role] : "—"}
                      <small className="block dim mt-0.5">
                        {p.lane ?? "—"}
                      </small>
                    </td>
                    <td className="px-3 text-white">
                      {p.kills} <span className="dim">/</span>{" "}
                      <span className="red">{p.deaths}</span>{" "}
                      <span className="dim">/</span> {p.assists}
                    </td>
                    <td className="px-3">
                      {p.lastHits} <span className="dim">/ {p.denies}</span>
                    </td>
                    <td className="px-3">
                      {p.gpm} <span className="dim">/ {p.xpm}</span>
                    </td>
                    <td className="px-3 gold">{number(p.networth)}</td>
                    <td className="px-3">
                      {number(p.heroDamage)}{" "}
                      <span className="dim">/ {number(p.towerDamage)}</span>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <ImpactBar score={imp.score} estimated={imp.estimated} />
                        <span className={`tag ${imp.tone}`}>{imp.badge}</span>
                      </div>
                    </td>
                    <td className="px-3">
                      <div className="items">
                        {p.items.slice(0, 4).map((item, idx) => (
                          <ItemIcon id={item} key={idx} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="home-bottom">
        <Activity size={13} />
        <span>
          Открытая история матчей: Настройки → Сообщество → «Общедоступная
          история матчей» (Expose Public Match Data).
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Swords size={12} /> STRATZ GraphQL + OpenDota REST
        </span>
      </div>
    </div>
  );
}
