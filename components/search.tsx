"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LoaderCircle,
  Search,
  Swords,
  UserRound,
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
          type="button"
          className={kind === "player" ? "selected" : ""}
          onClick={() => {
            setKind("player");
            setError("");
          }}
        >
          <UserRound size={14} /> Игрок (SteamID / URL)
        </button>
        <button
          type="button"
          className={kind === "match" ? "selected" : ""}
          onClick={() => {
            setKind("match");
            setError("");
          }}
        >
          <Swords size={14} /> Матч (Match ID)
        </button>
        <span className="search-hint tabular-nums">
          SteamID32 · SteamID64 · steamcommunity.com
        </span>
      </div>
      <form onSubmit={search} className="search-form">
        <Search size={16} className="muted" />
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
              ? "321580662, 76561198281846390 или ссылка на профиль Steam"
              : "Match ID, например 8123456789"
          }
        />
        <button className="button button-gold" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <>
              Найти <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
