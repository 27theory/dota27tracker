"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ChevronRight,
  Clock3,
  Download,
  Flame,
  RefreshCw,
  Shield,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import type { Match, MatchPlayer, Team } from "@/lib/types";
import { heroName, number, roles, time } from "@/lib/format";
import { analyzeImpact, type Impact } from "@/lib/impact-analyzer";
import { HeroPortrait, ImpactBar, ItemIcon, MatchSkeleton } from "./ui";
import { useData } from "./use-data";
import { ErrorState } from "./error-state";
import { AiCoach } from "./ai-coach";
import { MatchCharts } from "./charts";

export function MatchView({ id }: { id: string }) {
  const {
    data: m,
    error,
    loading,
    refresh,
  } = useData<Match>(`/api/matches/${id}`);
  const [parseStatus, setParseStatus] = useState("");
  const [parsing, setParsing] = useState(false);
  const impacts = useMemo(
    () => (m ? analyzeImpact(m) : new Map<MatchPlayer, Impact>()),
    [m],
  );
  if (loading && !m) return <MatchSkeleton />;
  if (error && !m) return <ErrorState message={error} retry={refresh} />;
  if (!m) return null;
  const winners = m.players.filter(
    (p) => (p.team === "radiant") === m.radiantWin,
  );
  const losers = m.players.filter(
    (p) => (p.team === "radiant") !== m.radiantWin,
  );
  const mvp = [...winners].sort(
    (a, b) => impacts.get(b)!.score - impacts.get(a)!.score,
  )[0];
  const worst = [...losers].sort(
    (a, b) => impacts.get(a)!.score - impacts.get(b)!.score,
  )[0];
  const under = m.players.find(
    (p) => p !== worst && impacts.get(p)!.score <= -15,
  );
  const solo = losers.find((p) => impacts.get(p)!.badge === "Тащил 1v9");
  const third = under ?? solo;
  const tower = (team: Team) =>
    m.players
      .filter((p) => p.team === team)
      .reduce((s, p) => s + p.towerDamage, 0);
  async function requestParse() {
    setParsing(true);
    setParseStatus("");
    try {
      const r = await fetch(`/api/matches/${id}/parse`, { method: "POST" });
      const data = await r.json();
      setParseStatus(data.message ?? data.error);
    } catch {
      setParseStatus("Не удалось отправить запрос. Попробуйте позже.");
    } finally {
      setParsing(false);
    }
  }
  return (
    <div className="page-shell">
      <div className="breadcrumb">
        <Link href="/">Обзор</Link>
        <ChevronRight size={12} /> Анализ матча <ChevronRight size={12} />{" "}
        <span className="tabular-nums">
          {m.id === "demo" ? "Демоматч" : `#${m.id}`}
        </span>
      </div>
      {m.source === "demo" && (
        <div className="notice demo">
          Демонстрационный матч: синтетические данные для проверки таблиц и
          оценок импакта.
        </div>
      )}
      {m.notice && <div className="notice">{m.notice}</div>}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="page-top">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-title tabular-nums">
              {m.id === "demo" ? "Разбор демоматча" : `Матч #${m.id}`}
            </h1>
            <span className="tag gold">
              {m.mode} ·{" "}
              {m.source === "demo" ? "DEMO" : m.source.toUpperCase()}
            </span>
          </div>
          <div className="match-score tabular-nums">
            <span className="green">Radiant</span>
            <b className="green">{m.radiantScore}</b>
            <span className="dim">:</span>
            <b className="red">{m.direScore}</b>
            <span className="red">Dire</span>
            <span className="dim text-xs ml-2 flex gap-1.5 items-center">
              <Clock3 size={12} />
              {time(m.duration)}
            </span>
            <span className="dim text-xs flex gap-1.5 items-center">
              <Shield size={12} /> {m.rank}
            </span>
            <span className="green text-xs font-medium">
              Победа {m.radiantWin ? "Radiant" : "Dire"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={loading}
            className="button button-ghost"
            onClick={refresh}
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Обновить
          </button>
          {m.source !== "demo" && (
            <button
              disabled={parsing}
              className="button button-ghost"
              onClick={requestParse}
            >
              <Download size={13} />{" "}
              {parsing ? "Отправляем…" : "Запросить парсинг"}
            </button>
          )}
        </div>
      </div>
      {parseStatus && (
        <div className="notice" role="status">
          {parseStatus}
        </div>
      )}
      <section id="impact">
        <div className="section-heading">
          <h2>Сводка импакта</h2>
          <span className="muted text-[10px]">
            {m.source === "demo"
              ? "Демо-телеметрия"
              : m.source === "opendota"
                ? "Расчёт ≈ локально"
                : "STRATZ IMP"}
          </span>
        </div>
        <div className="highlight-grid tabular-nums">
          <PlayerHighlight
            title="MVP МАТЧА"
            player={mvp}
            impact={impacts.get(mvp)!}
            kind="gold"
          />
          <PlayerHighlight
            title={
              impacts.get(worst)!.badge === "Руинер"
                ? "КРИТИЧЕСКИЙ СПАД"
                : "СЛАБОЕ ЗВЕНО"
            }
            player={worst}
            impact={impacts.get(worst)!}
            kind="red"
          />
          {third ? (
            <PlayerHighlight
              title={under ? "ПРОСАДКА ПО ИМПАКТУ" : "ТАЩИЛ 1v9"}
              player={third}
              impact={impacts.get(third)!}
              kind={under ? "red" : "green"}
            />
          ) : (
            <div className="highlight">
              <div className="highlight-title">
                <Shield size={12} /> СТАБИЛЬНОСТЬ
              </div>
              <div className="highlight-value">Без просадок</div>
              <div className="highlight-reason">
                Других игроков с импактом ниже −15 нет.
              </div>
            </div>
          )}
          <div className="highlight">
            <div className="highlight-title">
              <Target size={12} /> УРОН ПО СТРОЕНИЯМ
            </div>
            <div className="highlight-value gold tabular-nums">
              {number(tower("radiant"))}{" "}
              <span className="dim text-sm">/ {number(tower("dire"))}</span>
            </div>
            <div className="highlight-reason">
              Сумма урона по вышкам · Radiant / Dire
            </div>
          </div>
        </div>
      </section>
      <AiCoach key={m.id} match={m} />
      <section id="teams">
        <div className="section-heading mt-5">
          <h2>Таблица матча</h2>
          <span className="muted text-[10px] tabular-nums">
            IMP: −100 … +100 · «—» нет данных в реплее
          </span>
        </div>
        {(["radiant", "dire"] as Team[]).map((team) => (
          <div key={team}>
            <div className="team-heading">
              <Swords
                className={team === "radiant" ? "green" : "red"}
                size={16}
              />
              <h2>{team === "radiant" ? "Radiant" : "Dire"}</h2>
              <span
                className={
                  (team === "radiant") === m.radiantWin
                    ? "!text-emerald-400"
                    : ""
                }
              >
                {(team === "radiant") === m.radiantWin ? "ПОБЕДА" : "ПОРАЖЕНИЕ"}
              </span>
            </div>
            <div className="table-scroll overflow-x-auto w-full max-w-full">
              <table className="min-w-[940px] tabular-nums">
                <thead>
                  <tr>
                    <th className="min-w-[160px] max-w-[200px] px-3">
                      ИГРОК / ГЕРОЙ
                    </th>
                    <th className="px-3">РОЛЬ / ЛАЙН</th>
                    <th className="px-3">K / D / A</th>
                    <th className="px-3">LH / DN</th>
                    <th className="px-3">GPM / XPM</th>
                    <th className="px-3">НЕТВОРС</th>
                    <th className="px-3">УРОН / ВЫШКИ</th>
                    <th className="px-3">ЛЕЧЕНИЕ / ВАРДЫ</th>
                    <th className="px-3">IMP</th>
                    <th className="px-3">БИЛД / ТАЙМИНГИ</th>
                  </tr>
                </thead>
                <tbody>
                  {m.players
                    .filter((p) => p.team === team)
                    .map((p, i) => (
                      <tr key={i}>
                        <td className="min-w-[160px] max-w-[200px] px-3">
                          <div className="player-cell gap-2.5 min-w-0">
                            <HeroPortrait id={p.heroId} className="shrink-0" />
                            <div className="min-w-0 flex-1">
                              {p.accountId ? (
                                <Link
                                  className="account-link block truncate"
                                  href={`/player/${m.source === "demo" ? "demo" : p.accountId}`}
                                  title={p.name}
                                >
                                  <b className="truncate">{p.name}</b>
                                </Link>
                              ) : (
                                <b className="truncate" title={p.name}>
                                  {p.name}
                                </b>
                              )}
                              <small className="truncate">
                                {heroName(p.heroId)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          {p.role ? roles[p.role] : "—"}
                          <small
                            className={`block mt-0.5 text-[9px] ${p.laneOutcome?.includes("победа") ? "green" : p.laneOutcome ? "red" : "dim"}`}
                          >
                            {p.lane ?? "—"}{" "}
                            {p.laneOutcome ? `· ${p.laneOutcome}` : ""}
                          </small>
                        </td>
                        <td className="px-3 text-white whitespace-nowrap">
                          {p.kills} <span className="dim">/</span>{" "}
                          <span className="red">{p.deaths}</span>{" "}
                          <span className="dim">/</span> {p.assists}
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          {p.lastHits} <span className="dim">/ {p.denies}</span>
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          {p.gpm} <span className="dim">/ {p.xpm}</span>
                        </td>
                        <td className="px-3 gold whitespace-nowrap">
                          {number(p.networth)}
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          {number(p.heroDamage)}{" "}
                          <span className="dim">/ {number(p.towerDamage)}</span>
                        </td>
                        <td className="px-3 whitespace-nowrap">
                          {number(p.healing)}{" "}
                          <span className="dim">/ {p.wards ?? "—"}</span>
                        </td>
                        <td className="px-3">
                          <div className="flex items-center gap-2">
                            <ImpactBar
                              score={impacts.get(p)!.score}
                              estimated={impacts.get(p)!.estimated}
                            />
                            <span className={`tag ${impacts.get(p)!.tone}`}>
                              {impacts.get(p)!.badge}
                            </span>
                          </div>
                          <small className="block dim text-[8px] mt-1">
                            {impacts.get(p)!.reasons[0]}
                          </small>
                        </td>
                        <td className="px-3">
                          <div className="items">
                            {p.items.map((item, i) => (
                              <ItemIcon id={item} key={i} />
                            ))}
                            <span className="ml-1">
                              <ItemIcon id={p.neutralItem ?? 0} />
                            </span>
                          </div>
                          <div className="purchase-times tabular-nums">
                            {p.purchases
                              .filter((i) =>
                                [
                                  1, 48, 108, 116, 119, 139, 145, 147, 208,
                                ].includes(i.id),
                              )
                              .slice(0, 3)
                              .map((item, i) => (
                                <span key={i} title={item.name}>
                                  {item.id === 116
                                    ? "BKB"
                                    : item.id === 145
                                      ? "BF"
                                      : item.name}{" "}
                                  {time(item.time)}
                                </span>
                              ))}
                            {!p.purchases.length && (
                              <span className="dim">Тайминги недоступны</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
      <MatchCharts match={m} />
    </div>
  );
}

function PlayerHighlight({
  title,
  player: p,
  impact,
  kind,
}: {
  title: string;
  player: MatchPlayer;
  impact: Impact;
  kind: "gold" | "red" | "green";
}) {
  return (
    <div
      className={`highlight ${kind === "gold" ? "gold-highlight" : kind === "red" ? "red-highlight" : ""}`}
    >
      <div className={`highlight-title ${kind}`}>
        {kind === "gold" ? (
          <Trophy size={12} />
        ) : kind === "red" ? (
          <Flame size={12} />
        ) : (
          <Activity size={12} />
        )}{" "}
        {title}
      </div>
      <div className="player-cell gap-2.5 min-w-0">
        <HeroPortrait id={p.heroId} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <b className="truncate" title={p.name}>
            {p.name}
          </b>
          <small className="truncate">{heroName(p.heroId)}</small>
        </div>
        <b className={`ml-auto shrink-0 tabular-nums ${kind}`}>
          {impact.estimated ? "≈" : ""}
          {impact.score > 0 ? "+" : ""}
          {impact.score}
        </b>
      </div>
      <div className="highlight-reason">{impact.reasons.join(" · ")}</div>
    </div>
  );
}
