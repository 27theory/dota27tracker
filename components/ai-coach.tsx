"use client";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Compass,
  Crosshair,
  LoaderCircle,
  Package,
  Terminal,
  Trophy,
} from "lucide-react";
import type { AiCoachReport, Match, Session } from "@/lib/types";
import { heroName } from "@/lib/format";

const STAGES = [
  "Сбор телеметрии лайнинга (10/20 мин), таймингов и драфта 10 героев…",
  "Анализ матчапа на линии, пиков силы и ключевых ошибок…",
  "Формирование вердикта и плана на следующую игру…",
];

function normalizeClientCoach(data: {
  coach?: Partial<AiCoachReport>;
  analysis?: string;
}): AiCoachReport | null {
  if (
    data.coach &&
    typeof data.coach.verdict === "string" &&
    data.coach.verdict.trim()
  ) {
    return {
      verdict: data.coach.verdict,
      laning: data.coach.laning || "Данные лайнинга обработаны.",
      build: data.coach.build || "Данные по предметам и таймингам обработаны.",
      mistakes:
        Array.isArray(data.coach.mistakes) && data.coach.mistakes.length
          ? data.coach.mistakes
          : ["Нет критических отклонений по доступной статистике."],
      nextGamePlan:
        Array.isArray(data.coach.nextGamePlan) && data.coach.nextGamePlan.length
          ? data.coach.nextGamePlan
          : ["Следовать таймингам ключевых предметов по драфту."],
    };
  }
  if (typeof data.analysis === "string" && data.analysis.trim()) {
    return {
      verdict: data.analysis.trim(),
      laning: "Оценка по доступной статистике матча.",
      build: "Оценка по итоговым слотам и таймингам.",
      mistakes: ["Проверьте тайминги ключевых артефактов и позиционирование."],
      nextGamePlan: ["Синхронизировать пики силы с командой."],
    };
  }
  return null;
}

export function AiCoach({ match: m }: { match: Match }) {
  const [target, setTarget] = useState("");
  const [report, setReport] = useState<AiCoachReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s: Session | null) => {
        if (active && s && m.players.some((p) => p.accountId === s.accountId)) {
          setTarget(String(s.accountId));
        } else if (active && m.players[0]?.accountId) {
          setTarget(String(m.players[0].accountId));
        }
      })
      .catch(() => {
        if (active && m.players[0]?.accountId) {
          setTarget(String(m.players[0].accountId));
        }
      });
    return () => {
      active = false;
    };
  }, [m]);

  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const timer = setInterval(
      () => setStage((s) => Math.min(STAGES.length - 1, s + 1)),
      3200,
    );
    return () => clearInterval(timer);
  }, [busy]);

  async function analyze() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const r = await fetch("/api/analyze-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: m.id,
          ...(target ? { targetAccountId: Number(target) } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const parsed = normalizeClientCoach(data);
      if (!parsed) throw new Error("Не удалось распознать ответ AI-тренера");
      setReport(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка AI-сервиса");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="coach" className="panel coach">
      <div className="coach-header">
        <div className="coach-heading">
          <span>
            <Terminal size={18} />
          </span>
          <div>
            <h2>Аналитический разбор матча</h2>
            <p>
              Драфт 10 героев, лайнинг 10/20м, тайминги ключевых слотов и
              приоритеты по карте.
            </p>
          </div>
        </div>
        <div className="coach-actions">
          <select
            disabled={busy}
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setReport(null);
            }}
            aria-label="Перспектива разбора"
          >
            <option value="">Общий разбор (фокус на MVP)</option>
            {m.players
              .filter((p) => p.accountId)
              .map((p) => (
                <option key={p.accountId} value={p.accountId!}>
                  {p.name} · {heroName(p.heroId)}
                </option>
              ))}
          </select>
          <button
            disabled={busy}
            className="button button-gold"
            onClick={analyze}
          >
            {busy ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <Activity size={14} />
            )}{" "}
            {busy ? "Расчёт…" : "Запустить разбор"}
          </button>
        </div>
      </div>

      {busy && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="loading-coach tabular-nums">
            <LoaderCircle size={14} className="spin" />
            <span>{STAGES[stage]}</span>
            <span className="ml-auto text-[10px] dim">
              {stage + 1}/{STAGES.length}
            </span>
          </div>
          <div className="h-1 w-full bg-[#1c232d] rounded overflow-hidden mt-2">
            <div
              className="h-full bg-[#d9b86c] transition-all duration-700"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
          <div className="mt-3 space-y-2.5 animate-pulse">
            <div className="rounded border border-[#262c33] bg-[#11161c] p-3 space-y-2">
              <div className="skeleton h-3 w-36" />
              <div className="skeleton h-2.5 w-full" />
              <div className="skeleton h-2.5 w-4/5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="rounded border border-[#262c33] bg-[#11161c] p-3 space-y-2"
                >
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-2.5 w-full" />
                  <div className="skeleton h-2.5 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}

      {report && !busy && (
        <div className="mt-4 pt-3.5 border-t border-[#262c33] space-y-2.5 tabular-nums">
          <div className="rounded border border-[#3a3322] bg-[#171917] p-3.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#d9b86c] uppercase mb-1.5">
              <Trophy size={12} /> 1. Вердикт по матчу
            </div>
            <p className="text-xs leading-relaxed text-[#eceef0] m-0">
              {report.verdict}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="rounded border border-[#262c33] bg-[#11161c] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#61c6a0] uppercase mb-1.5">
                <Crosshair size={12} /> 2. Лайнинг (0–10 мин)
              </div>
              <p className="text-xs leading-relaxed text-[#c6d0db] m-0">
                {report.laning}
              </p>
            </div>

            <div className="rounded border border-[#262c33] bg-[#11161c] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#d9b86c] uppercase mb-1.5">
                <Package size={12} /> 3. Тайминги и билд
              </div>
              <p className="text-xs leading-relaxed text-[#c6d0db] m-0">
                {report.build}
              </p>
            </div>

            <div className="rounded border border-[#3d262c] bg-[#171317] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#e77c8e] uppercase mb-2">
                <AlertTriangle size={12} /> 4. Ключевые ошибки
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-xs leading-relaxed text-[#d7c4c9] m-0">
                {report.mistakes.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded border border-[#243832] bg-[#111918] p-3.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#61c6a0] uppercase mb-2">
                <Compass size={12} /> 5. План на следующую игру
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-xs leading-relaxed text-[#c4dbd3] m-0">
                {report.nextGamePlan.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
