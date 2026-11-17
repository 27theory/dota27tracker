"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Search,
  LoaderCircle,
  UserRound,
  Swords,
} from "lucide-react";
export function SearchBox() {
  const [kind, setKind] = useState<"player" | "match">("player");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await fetch(
        `/api/search?q=${encodeURIComponent(value)}&kind=${kind}`,
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      router.push(data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка поиска");
      setBusy(false);
    }
  }
  return (
    <div className="search-card">
      <div className="search-tabs">
        <button
          className={kind === "player" ? "selected" : ""}
          onClick={() => {
            setKind("player");
            setError("");
          }}
        >
          <UserRound size={15} /> Найти игрока
        </button>
        <button
          className={kind === "match" ? "selected" : ""}
          onClick={() => {
            setKind("match");
            setError("");
          }}
        >
          <Swords size={15} /> Найти матч
        </button>
        <span className="search-hint">Для анализа не нужен аккаунт</span>
      </div>
      <form onSubmit={search} className="search-form">
        <Search size={21} className="muted" />
        <input
          aria-label={
            kind === "player" ? "Steam ID или ссылка на профиль" : "Match ID"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          maxLength={200}
          placeholder={
            kind === "player"
              ? "Steam ID, SteamID64 или ссылка на профиль"
              : "Введите Match ID, например 8123456789"
          }
        />
        <button className="button button-gold" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              Анализировать <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <p className="search-note">
        SteamID32 / SteamID64 / steamcommunity.com/profiles/…{" "}
        <span>Открытые профили · Бесплатно</span>
      </p>
    </div>
  );
}
