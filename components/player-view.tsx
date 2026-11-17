"use client";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Coins,
  RefreshCw,
  Shield,
  Trophy,
  UserRound,
} from "lucide-react";
import type { PlayerProfile } from "@/lib/types";
import { ago, heroName, number, roles, time } from "@/lib/format";
import { HeroPortrait, ImpactBar, Skeleton } from "./ui";
import { useData } from "./use-data";
import { ErrorState } from "./error-state";
export function PlayerView({ id }: { id: string }) {
  const {
    data: p,
    error,
    loading,
    refresh,
  } = useData<PlayerProfile>(`/api/players/${id}`);
  if (loading && !p) return <Skeleton />;
  if (error && !p) return <ErrorState message={error} retry={refresh} />;
  if (!p) return null;
  const ms = p.matches;
  const avg = (key: "gpm" | "xpm" | "imp") => {
    const vals = ms.map((m) => m[key]).filter((v): v is number => v !== null);
    return vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : null;
  };
  const wins = ms.filter((m) => m.won).length;
  const kda =
    ms.reduce((a, m) => a + m.kills + m.assists, 0) /
    Math.max(
      1,
      ms.reduce((a, m) => a + m.deaths, 0),
    );
  const roleCounts = new Map<number, number>();
  ms.forEach((m) => {
    if (m.role) roleCounts.set(m.role, (roleCounts.get(m.role) ?? 0) + 1);
  });
  const favorite = [...roleCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    <div className="page-shell">
      <div className="breadcrumb">
        <Link href="/">Обзор</Link>
        <ChevronRight size={12} /> Профиль игрока <ChevronRight size={12} />{" "}
        {p.name}
      </div>
      {p.source === "demo" && (
        <div className="notice demo">
          Демонстрационный профиль. Матчи и статистика — синтетические примеры.
          Для реальных данных найдите игрока на главной.
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="page-top">
        <div className="flex items-center gap-5">
          {p.avatar ? (
            <img
              src={p.avatar}
              className="profile-avatar"
              alt={`Аватар ${p.name}`}
            />
          ) : (
            <div className="profile-avatar avatar-placeholder">{p.name[0]}</div>
          )}
          <div>
            <div className="eyebrow subtle">ПРОФИЛЬ ИГРОКА · {p.accountId}</div>
            <h1 className="page-title">{p.name}</h1>
            <div className="rank-badge">
              <Shield size={16} /> {p.rank}
            </div>
            {p.wins !== null && p.losses !== null && p.wins + p.losses > 0 && (
              <p>
                {p.wins} побед · {p.losses} поражений ·{" "}
                {Math.round((p.wins / (p.wins + p.losses)) * 100)}% за всё время
              </p>
            )}
          </div>
        </div>
        <button
          disabled={loading}
          className="button button-ghost"
          onClick={refresh}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Обновить
          данные
        </button>
      </div>
      <div className="stat-grid">
        {[
          {
            label: "Винрейт",
            value: ms.length ? `${Math.round((wins / ms.length) * 100)}%` : "—",
            sub: `${wins} побед · ${ms.length - wins} поражений`,
            icon: Trophy,
            gold: true,
          },
          {
            label: "Средний KDA",
            value: ms.length ? kda.toFixed(2) : "—",
            sub: "(Убийства + помощь) / смерти",
            icon: UserRound,
          },
          {
            label: "Средний GPM",
            value: avg("gpm") ?? "—",
            sub: "Золото в минуту",
            icon: Coins,
          },
          {
            label: "Средний XPM",
            value: avg("xpm") ?? "—",
            sub: "Опыт в минуту",
            icon: Activity,
          },
          {
            label: "Средний IMP",
            value:
              avg("imp") !== null
                ? `${avg("imp")! > 0 ? "+" : ""}${avg("imp")}`
                : "—",
            sub:
              avg("imp") === null ? "Недоступен в OpenDota" : "Оценка STRATZ",
            icon: Activity,
          },
          {
            label: "Любимая роль",
            value: favorite ? roles[favorite] : "—",
            sub: "По доступным позициям",
            icon: Shield,
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-label">
              <s.icon size={13} />
              {s.label}
            </span>
            <strong
              className={s.gold ? "gold" : ""}
              style={s.label === "Любимая роль" ? { fontSize: 21 } : undefined}
            >
              {s.value}
            </strong>
            <small>{s.sub}</small>
          </div>
        ))}
      </div>
      {p.private ? (
        <div className="panel">
          <h2>Нет доступной истории матчей</h2>
          <p className="muted text-sm leading-7 mt-3">
            История может быть скрыта или ещё не загружена. В Dota 2 откройте{" "}
            <b>
              Настройки → Сообщество → «Общедоступная история матчей» (Expose
              Public Match Data)
            </b>
            . После новой игры обновите страницу. Старые закрытые матчи могут
            остаться недоступны.
          </p>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <h2>Сигнатурные герои</h2>
            <span className="muted text-[10px]">
              {p.source === "demo" ? "Демо" : "За всё время"}
            </span>
          </div>
          <div className="signature-list">
            {p.heroes.map((h) => (
              <div className="signature" key={h.heroId}>
                <HeroPortrait id={h.heroId} />
                <div>
                  <b>{heroName(h.heroId)}</b>
                  <p>
                    {h.games} игр ·{" "}
                    <span className="green">
                      {h.games ? Math.round((h.wins / h.games) * 100) : 0}%
                      побед
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <h2>
              Последние матчи <span className="text-sm ml-2">{ms.length}</span>
            </h2>
            <span className="muted text-[10px]">
              Источник:{" "}
              {p.source === "demo"
                ? "Демо"
                : p.source === "stratz"
                  ? "STRATZ"
                  : "OpenDota"}
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ГЕРОЙ / РЕЗУЛЬТАТ</th>
                  <th>РОЛЬ / ЛАЙН</th>
                  <th>K / D / A</th>
                  <th>GPM / XPM</th>
                  <th>IMPACT</th>
                  <th>ДЛИТЕЛЬНОСТЬ</th>
                  <th>КОГДА</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ms.map((m, i) => (
                  <tr key={`${m.id}-${i}`}>
                    <td>
                      <Link
                        className="player-cell account-link"
                        href={`/match/${m.id}`}
                      >
                        <HeroPortrait id={m.heroId} />
                        <div>
                          <b>{heroName(m.heroId)}</b>
                          <small
                            className={
                              m.won ? "!text-emerald-400" : "!text-rose-400"
                            }
                          >
                            {m.won ? "Победа" : "Поражение"}
                          </small>
                        </div>
                      </Link>
                    </td>
                    <td>
                      {m.role ? roles[m.role] : "Неизвестно"}
                      <small className="block dim mt-1">
                        {m.lane ?? "Нет данных"}
                      </small>
                    </td>
                    <td>
                      <span className="text-white">{m.kills}</span> /{" "}
                      <span className="text-rose-300">{m.deaths}</span> /{" "}
                      {m.assists}
                    </td>
                    <td>
                      {m.gpm ?? "—"}{" "}
                      <span className="dim">/ {m.xpm ?? "—"}</span>
                    </td>
                    <td>
                      {m.imp !== null ? (
                        <>
                          <ImpactBar score={m.imp} />
                          {m.badge && (
                            <small className="block text-[8px] muted mt-1">
                              {m.badge}
                            </small>
                          )}
                        </>
                      ) : (
                        <span className="dim">Нет IMP</span>
                      )}
                    </td>
                    <td>{time(m.duration)}</td>
                    <td className="dim">{ago(m.startTime)}</td>
                    <td>
                      <Link
                        href={`/match/${m.id}`}
                        aria-label={`Разобрать матч ${m.id}`}
                        className="icon-button inline-flex"
                      >
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
