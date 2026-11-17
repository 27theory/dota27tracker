"use client";
import { useEffect, useState } from "react";
import { BrainCircuit, LoaderCircle, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Match, Session } from "@/lib/types";
import { heroName } from "@/lib/format";

const STAGES = [
  "Анализируем тайминги и матчап...",
  "Сравниваем импакт игроков и экономику...",
  "Формируем главный вердикт и персональные советы...",
];

export function AiCoach({ match: m }: { match: Match }) {
  const [target, setTarget] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s: Session | null) => {
        if (active && s && m.players.some((p) => p.accountId === s.accountId))
          setTarget(String(s.accountId));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [m]);
  useEffect(() => {
    if (!busy) return;
    setStage(0);
    const timer = setInterval(
      () => setStage((s) => Math.min(STAGES.length - 1, s + 1)),
      3500,
    );
    return () => clearInterval(timer);
  }, [busy]);
  async function analyze() {
    setBusy(true);
    setError("");
    setAnalysis("");
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
      const cleaned = String(data.analysis ?? "")
        .replace(/^```(?:markdown|md)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      setAnalysis(cleaned);
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
            <p>Что решило исход матча и что можно было сделать лучше.</p>
          </div>
        </div>
        <div className="coach-actions">
          <select
            disabled={busy}
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setAnalysis("");
            }}
            aria-label="Перспектива AI-разбора"
          >
            <option value="">Общий разбор</option>
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
          <div className="animate-pulse space-y-3 mt-5">
            <div className="skeleton h-4 w-2/5" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-11/12" />
            <div className="skeleton h-3 w-3/4" />
          </div>
        </div>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {analysis && (
        <div className="markdown space-y-3">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h3 className="text-base font-semibold text-white mt-4 mb-1">
                  {children}
                </h3>
              ),
              h2: ({ children }) => (
                <h3 className="text-base font-semibold text-white mt-4 mb-1">
                  {children}
                </h3>
              ),
              h3: ({ children }) => (
                <h4 className="text-sm font-semibold text-white mt-3 mb-1">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-xs leading-relaxed text-[#b4bfcb]">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#b4bfcb]">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#b4bfcb]">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-[#eceef0]">
                  {children}
                </strong>
              ),
            }}
          >
            {analysis}
          </ReactMarkdown>
        </div>
      )}
    </section>
  );
}
