"use client";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Compass,
  Crosshair,
  LoaderCircle,
  Package,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { AiCoachReport, Match, Session } from "@/lib/types";
import { heroName } from "@/lib/format";

const STAGES = [
  "Собираем лайнинг (10/20 мин), тайминги предметов и драфт 10 героев…",
  "Анализируем матчап на линии, пики силы и ключевые ошибки…",
  "Формируем вердикт и план на следующую игру…",
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
            <BrainCircuit size={25} />
          </span>
          <div>
            <h2>
              Твой AI-тренер <span className="mini-ai ml-2">AI</span>
            </h2>
            <p>
              Детальный разбор драфта, лайнинга, таймингов артефактов и ключевых
              ошибок по цифрам матча.
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
            aria-label="Перспектива AI-разбора"
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
            className="button button-purple"
            onClick={analyze}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Sparkles size={15} />
            )}{" "}
            {busy ? "Анализируем…" : "Разобрать матч с AI"}
          </button>
        </div>
      </div>

      {busy && (
        <div className="mt-5" role="status" aria-live="polite">
          <div className="loading-coach">
            <LoaderCircle size={16} className="spin" />
            <span>{STAGES[stage]}</span>
            <span className="ml-auto text-[10px] dim">
              Шаг {stage + 1} из {STAGES.length}
            </span>
          </div>
          <div className="h-1 w-full bg-[#241f31] rounded overflow-hidden mt-3">
            <div
              className="h-full bg-[#aa8bda] transition-all duration-700"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
          <div className="mt-5 space-y-3 animate-pulse">
            <div className="rounded-md border border-[#3a314c] bg-[#181c26] p-4 space-y-2.5">
              <div className="skeleton h-3.5 w-40" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-4/5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-[#2b3340] bg-[#161c24] p-4 space-y-2.5"
                >
                  <div className="skeleton h-3.5 w-36" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-5/6" />
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
        <div className="mt-6 pt-5 border-t border-[#3b314c] space-y-3.5">
          <div className="rounded-md border border-[#544470] bg-[#1a1829]/80 p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#c5aee8] uppercase mb-2">
              <Trophy size={13} /> 1. Вердикт по матчу
            </div>
            <p className="text-xs leading-relaxed text-[#eceef0] m-0">
              {report.verdict}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="rounded-md border border-[#2a3340] bg-[#161c24] p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#61c6a0] uppercase mb-2">
                <Crosshair size={13} /> 2. Лайнинг (0–10 мин)
              </div>
              <p className="text-xs leading-relaxed text-[#c6d0db] m-0">
                {report.laning}
              </p>
            </div>

            <div className="rounded-md border border-[#2a3340] bg-[#161c24] p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#d9b86c] uppercase mb-2">
                <Package size={13} /> 3. Тайминги и билд
              </div>
              <p className="text-xs leading-relaxed text-[#c6d0db] m-0">
                {report.build}
              </p>
            </div>

            <div className="rounded-md border border-[#4a2c36] bg-[#1c161d] p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#e77c8e] uppercase mb-2.5">
                <AlertTriangle size={13} /> 4. Ключевые ошибки
              </div>
              <ul className="list-disc pl-4 space-y-2 text-xs leading-relaxed text-[#d7c4c9] m-0">
                {report.mistakes.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-[#2c443d] bg-[#141f1e] p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#61c6a0] uppercase mb-2.5">
                <Compass size={13} /> 5. План на следующую игру
              </div>
              <ol className="list-decimal pl-4 space-y-2 text-xs leading-relaxed text-[#c4dbd3] m-0">
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
