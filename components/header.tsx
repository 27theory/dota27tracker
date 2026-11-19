"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Menu,
  Swords,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/types";

export function Header() {
  const path = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(setSession)
      .catch(() => {});
  }, []);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="DotaScope — главная">
          <span className="brand-mark">
            <Swords size={17} />
          </span>
          <span>
            DOTA<span className="brand-light">SCOPE</span>
          </span>
        </Link>
        <nav
          className={menu ? "nav open" : "nav"}
          aria-label="Основная навигация"
        >
          <Link
            className={path === "/" ? "active" : ""}
            href="/"
            onClick={() => setMenu(false)}
          >
            Трекер
          </Link>
          <Link
            className={path.startsWith("/player") ? "active" : ""}
            href="/player/demo"
            onClick={() => setMenu(false)}
          >
            Профиль игрока
          </Link>
          <Link
            className={path.startsWith("/match") ? "active" : ""}
            href="/match/demo"
            onClick={() => setMenu(false)}
          >
            Разбор матча
          </Link>
        </nav>
        <div className="header-actions">
          {session ? (
            <>
              <Link
                className="steam-small tabular-nums"
                href={`/player/${session.accountId}`}
              >
                Профиль #{session.accountId}
              </Link>
              <a className="muted text-xs" href="/api/auth/logout">
                Выйти
              </a>
            </>
          ) : (
            <a className="steam-small" href="/api/auth/steam">
              <SteamIcon /> Войти через Steam <ArrowUpRight size={13} />
            </a>
          )}
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label="Меню"
          >
            {menu ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SteamIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.3 3a5.7 5.7 0 0 0-5.65 6.4l-3.7 5.35a4.3 4.3 0 0 0-2.6.5L1 13.85v4l2 .8a4.3 4.3 0 0 0 8.4-.1l5.3-4.2A5.7 5.7 0 0 0 16.3 3ZM7.2 20.25a2.55 2.55 0 0 1-2.5-2l1.6.65a1.8 1.8 0 0 0 1.4-3.3l-1.5-.65a2.55 2.55 0 1 1 1 5.3Zm9.1-7.85a3.7 3.7 0 1 1 0-7.4 3.7 3.7 0 0 1 0 7.4Zm0-6.5a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="flex items-center gap-2">
        <ChartNoAxesCombined size={15} />
        <span>
          DotaScope <span className="dim">2026</span>
        </span>
      </div>
      <span>
        Телеметрия:{" "}
        <a href="https://stratz.com" target="_blank" rel="noreferrer">
          STRATZ
        </a>{" "}
        &{" "}
        <a href="https://www.opendota.com" target="_blank" rel="noreferrer">
          OpenDota API
        </a>
      </span>
    </footer>
  );
}
