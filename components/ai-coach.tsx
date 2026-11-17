"use client";
import { useEffect, useState } from "react";
import { BrainCircuit, LoaderCircle, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Match, Session } from "@/lib/types";
import { heroName } from "@/lib/format";
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
    const timer = setInterval(() => setStage((s) => Math.min(2, s + 1)), 3500);
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
      setAnalysis(data.analysis);
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
        <div aria-live="polite">
          <div className="loading-coach">
            <LoaderCircle size={16} className="spin" />
            {
              [
                "Собираем статистику и тайминги…",
                "Сравниваем вклад игроков…",
                "Формируем вердикт и советы…",
              ][stage]
            }
          </div>
          <div className="animate-pulse space-y-3 mt-5">
            <div className="skeleton h-3 w-5/6" />
            <div className="skeleton h-3 w-full" />
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
        <div className="markdown">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
