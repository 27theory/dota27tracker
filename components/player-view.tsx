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
    setHasMore(Boolean(p?.hasMore ?? (p ? p.matches.length >= INITIAL_LIMIT : false)));
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
        <div className="flex items-center gap-5 min-w-0">
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
            <div className="eyebrow subtle">ПРОФИЛЬ ИГРОКА · {p.accountId}</div>
            <h1 className="page-title truncate" title={p.name}>
              {p.name}
            </h1>
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
          className="button button-ghost shrink-0"
          onClick={handleRefresh}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Обновить
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
          <div className="table-scroll overflow-x-auto w-full max-w-full">
            <table className="min-w-[680px]">
              <thead>
                <tr>
                  <th className="min-w-[160px] max-w-[200px] px-3">
                    ГЕРОЙ / РЕЗУЛЬТАТ
                  </th>
                  <th className="px-3">РОЛЬ / ЛАЙН</th>
                  <th className="px-3">K / D / A</th>
                  <th className="px-3">GPM / XPM</th>
                  <th className="px-3">IMPACT</th>
                  <th className="px-3">ДЛИТЕЛЬНОСТЬ</th>
                  <th className="px-3">КОГДА</th>
                  <th className="px-3" />
                </tr>
              </thead>
              <tbody>
                {ms.map((m, i) => (
                  <tr key={`${m.id}-${m.startTime}-${i}`}>
                    <td className="min-w-[160px] max-w-[200px] px-3">
                      <Link
                        className="player-cell gap-3 account-link min-w-0"
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
                      {m.role ? roles[m.role] : "Неизвестно"}
                      <small className="block dim mt-1">
                        {m.lane ?? "Нет данных"}
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
                            <small className="block text-[8px] muted mt-1">
                              {m.badge}
                            </small>
                          )}
                        </>
                      ) : (
                        <span className="dim">Нет IMP</span>
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
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {moreError && (
            <div className="notice error mt-4" role="alert">
              {moreError}
            </div>
          )}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={loadMore}
                className="button button-ghost"
              >
                {loadingMore ? (
                  <>
                    <LoaderCircle size={15} className="spin" /> Загружаем ещё{" "}
                    {PAGE_STEP} матчей…
                  </>
                ) : (
                  <>
                    <ChevronDown size={15} /> Загрузить ещё
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
