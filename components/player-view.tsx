"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Coins,
  LoaderCircle,
  RefreshCw,
  Shield,
  Trophy,
  UserRound,
} from "lucide-react";
import type { PlayerMatch, PlayerProfile } from "@/lib/types";
import { ago, heroName, roles, time } from "@/lib/format";
import { HeroPortrait, ImpactBar, ProfileSkeleton } from "./ui";
import { useData } from "./use-data";
import { ErrorState } from "./error-state";

const INITIAL_LIMIT = 150;
const PAGE_STEP = 50;

export function PlayerView({ id }: { id: string }) {
  const {
    data: p,
    error,
    loading,
    refresh,
  } = useData<PlayerProfile>(
    `/api/players/${id}?offset=0&limit=${INITIAL_LIMIT}`,
  );
  const [extraMatches, setExtraMatches] = useState<PlayerMatch[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  useEffect(() => {
    setExtraMatches([]);
    setMoreError("");
    setHasMore(
      Boolean(p?.hasMore ?? (p ? p.matches.length >= INITIAL_LIMIT : false)),
    );
  }, [p]);

  if (loading && !p) return <ProfileSkeleton />;
  if (error && !p) return <ErrorState message={error} retry={refresh} />;
  if (!p) return null;

  const ms = [...p.matches, ...extraMatches];

  async function handleRefresh() {
    setExtraMatches([]);
    setMoreError("");
    await refresh();
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setMoreError("");
    try {
      const offset = ms.length;
      const r = await fetch(
        `/api/players/${id}?offset=${offset}&limit=${PAGE_STEP}`,
      );
      const next: PlayerProfile & { error?: string } = await r.json();
      if (!r.ok) throw new Error(next.error ?? "Не удалось загрузить матчи");
      const batch = next.matches ?? [];
      setExtraMatches((prev) => {
        const existing = new Set(
          [...p!.matches, ...prev].map((m) => `${m.id}:${m.startTime}`),
        );
        const unique = batch.filter(
          (m) => !existing.has(`${m.id}:${m.startTime}`),
        );
        return [...prev, ...unique];
      });
      setHasMore(Boolean(next.hasMore ?? batch.length >= PAGE_STEP));
    } catch (e) {
      setMoreError(
        e instanceof Error ? e.message : "Ошибка подгрузки матчей",
      );
    } finally {
      setLoadingMore(false);
    }
  }

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
        <span className="truncate max-w-[180px] sm:max-w-none">{p.name}</span>
      </div>
      {p.source === "demo" && (
        <div className="notice demo">
          Демонстрационный профиль. Для реальной статистики введите SteamID на
          главной странице.
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="page-top">
        <div className="flex items-center gap-4 min-w-0">
          {p.avatar ? (
            <img
              src={p.avatar}
              className="profile-avatar shrink-0"
              alt={`Аватар ${p.name}`}
            />
          ) : (
            <div className="profile-avatar avatar-placeholder shrink-0">
              {p.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="page-title truncate" title={p.name}>
                {p.name}
              </h1>
              <span className="tag muted tabular-nums">ID {p.accountId}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-1.5 text-xs tabular-nums">
              <span className="rank-badge">
                <Shield size={13} /> {p.rank}
              </span>
              {p.wins !== null &&
                p.losses !== null &&
                p.wins + p.losses > 0 && (
                  <span className="muted">
                    <span className="green">{p.wins}W</span> ·{" "}
                    <span className="red">{p.losses}L</span> ·{" "}
                    {Math.round((p.wins / (p.wins + p.losses)) * 100)}% за всё
                    время
                  </span>
                )}
            </div>
          </div>
        </div>
        <button
          disabled={loading}
          className="button button-ghost shrink-0"
          onClick={handleRefresh}
        >
          <RefreshCw size={13} className={loading ? "spin" : ""} /> Обновить
        </button>
      </div>
      <div className="stat-grid tabular-nums">
        {[
          {
            label: "Винрейт",
            value: ms.length ? `${Math.round((wins / ms.length) * 100)}%` : "—",
            sub: `${wins}W · ${ms.length - wins}L (${ms.length})`,
            icon: Trophy,
            gold: true,
          },
          {
            label: "Средний KDA",
            value: ms.length ? kda.toFixed(2) : "—",
            sub: "(K + A) / D",
            icon: UserRound,
          },
          {
            label: "Средний GPM",
            value: avg("gpm") ?? "—",
            sub: "Золото / мин",
            icon: Coins,
          },
          {
            label: "Средний XPM",
            value: avg("xpm") ?? "—",
            sub: "Опыт / мин",
            icon: Activity,
          },
          {
            label: "Средний IMP",
            value:
              avg("imp") !== null
                ? `${avg("imp")! > 0 ? "+" : ""}${avg("imp")}`
                : "—",
            sub: avg("imp") === null ? "Нет в OpenDota" : "STRATZ IMP",
            icon: Activity,
          },
          {
            label: "Основная роль",
            value: favorite ? roles[favorite] : "—",
            sub: "По истории матчей",
            icon: Shield,
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-label">
              <s.icon size={12} />
              {s.label}
            </span>
            <strong
              className={`tabular-nums ${s.gold ? "gold" : ""}`}
              style={s.label === "Основная роль" ? { fontSize: 18 } : undefined}
            >
              {s.value}
            </strong>
            <small className="tabular-nums">{s.sub}</small>
          </div>
        ))}
      </div>
      {p.private ? (
        <div className="panel">
          <h2>Нет доступной истории матчей</h2>
          <p className="muted text-xs leading-6 mt-2">
            История скрыта или ещё не загружена. В Dota 2 откройте{" "}
            <b>
              Настройки → Сообщество → «Общедоступная история матчей» (Expose
              Public Match Data)
            </b>
            .
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
          <div className="signature-list tabular-nums">
            {p.heroes.map((h) => (
              <div className="signature" key={h.heroId}>
                <HeroPortrait id={h.heroId} />
                <div>
                  <b>{heroName(h.heroId)}</b>
                  <p>
                    {h.games} игр ·{" "}
                    <span className="green">
                      {h.games ? Math.round((h.wins / h.games) * 100) : 0}% WR
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="section-heading">
            <h2>
              История матчей{" "}
              <span className="text-xs ml-1.5 tabular-nums">({ms.length})</span>
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
          <div className="table-scroll overflow-x-auto w-full max-w-full">
            <table className="min-w-[680px] tabular-nums">
              <thead>
                <tr>
                  <th className="min-w-[160px] max-w-[200px] px-3">
                    ГЕРОЙ / ИТОГ
                  </th>
                  <th className="px-3">РОЛЬ / ЛАЙН</th>
                  <th className="px-3">K / D / A</th>
                  <th className="px-3">GPM / XPM</th>
                  <th className="px-3">IMP</th>
                  <th className="px-3">ВРЕМЯ</th>
                  <th className="px-3">ДАТА</th>
                  <th className="px-3" />
                </tr>
              </thead>
              <tbody>
                {ms.map((m, i) => (
                  <tr key={`${m.id}-${m.startTime}-${i}`}>
                    <td className="min-w-[160px] max-w-[200px] px-3">
                      <Link
                        className="player-cell gap-2.5 account-link min-w-0"
                        href={`/match/${m.id}`}
                      >
                        <HeroPortrait id={m.heroId} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <b className="truncate">{heroName(m.heroId)}</b>
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
                    <td className="px-3 whitespace-nowrap">
                      {m.role ? roles[m.role] : "—"}
                      <small className="block dim mt-0.5">
                        {m.lane ?? "—"}
                      </small>
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      <span className="text-white">{m.kills}</span> /{" "}
                      <span className="text-rose-300">{m.deaths}</span> /{" "}
                      {m.assists}
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      {m.gpm ?? "—"}{" "}
                      <span className="dim">/ {m.xpm ?? "—"}</span>
                    </td>
                    <td className="px-3">
                      {m.imp !== null ? (
                        <>
                          <ImpactBar score={m.imp} />
                          {m.badge && (
                            <small className="block text-[8px] muted mt-0.5">
                              {m.badge}
                            </small>
                          )}
                        </>
                      ) : (
                        <span className="dim">—</span>
                      )}
                    </td>
                    <td className="px-3 whitespace-nowrap">
                      {time(m.duration)}
                    </td>
                    <td className="px-3 dim whitespace-nowrap">
                      {ago(m.startTime)}
                    </td>
                    <td className="px-3">
                      <Link
                        href={`/match/${m.id}`}
                        aria-label={`Разобрать матч ${m.id}`}
                        className="icon-button inline-flex"
                      >
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {moreError && (
            <div className="notice error mt-3" role="alert">
              {moreError}
            </div>
          )}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={loadMore}
                className="button button-ghost tabular-nums"
              >
                {loadingMore ? (
                  <>
                    <LoaderCircle size={14} className="spin" /> Загружаем ещё{" "}
                    {PAGE_STEP} матчей…
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Загрузить ещё {PAGE_STEP}
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
