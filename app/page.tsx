import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  BrainCircuit,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Crosshair,
  Flame,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { SearchBox } from "@/components/search";
import { SteamIcon } from "@/components/header";
import { HeroPortrait, ImpactBar } from "@/components/ui";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const { authError } = await searchParams;
  return (
    <div className="home-shell">
      {authError && (
        <div className="notice error" role="alert">
          {authError === "config"
            ? "Для входа через Steam настройте JWT_SECRET (минимум 32 символа) и адрес NEXT_PUBLIC_APP_URL в .env.local."
            : "Steam не подтвердил вход. Попробуйте войти снова."}
        </div>
      )}
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> ТВОЙ СЛЕДУЮЩИЙ УРОВЕНЬ В DOTA 2
          </div>
          <h1>
            За цифрами —<br />
            причина <span>победы.</span>
          </h1>
          <p>
            Узнай, кто действительно затащил.
            <br />
            Найди свои ошибки. Стань сильнее с AI-тренером.
          </p>
          <div className="hero-buttons">
            <a className="button button-gold" href="/api/auth/steam">
              <SteamIcon /> Войти через Steam <ArrowUpRight size={17} />
            </a>
            <Link className="button button-ghost" href="/match/demo">
              Посмотреть демо <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-trust">
            <span>
              <Check size={13} /> Бесплатная аналитика
            </span>
            <span>
              <ShieldCheck size={13} /> Безопасный вход
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Пример анализа матча">
          <img
            src="/phantom-assassin.jpg"
            alt="Phantom Assassin из Dota 2"
            className="hero-art"
          />
          <div className="visual-grid" />
          <span className="scan-corner tl" />
          <span className="scan-corner br" />
          <div className="visual-label">
            <ScanLine size={15} /> MATCH INTELLIGENCE <span>V.01</span>
          </div>
          <div className="hero-floating">
            <div className="flex items-center gap-2 text-xs muted">
              <span className="status-dot" /> АНАЛИЗ ЗАВЕРШЕН{" "}
              <span className="ml-auto text-[10px] dim">ДЕМО</span>
            </div>
            <div className="floating-player">
              <HeroPortrait id={44} />
              <div>
                <b>Phantom Assassin</b>
                <span>Керри · Легкая линия</span>
              </div>
              <span className="mvp-tag">
                <Trophy size={12} /> MVP
              </span>
            </div>
            <div className="floating-stats">
              <div>
                <small>K / D / A</small>
                <b>
                  18 <i>/</i> 3 <i>/</i> 12
                </b>
              </div>
              <div>
                <small>GPM</small>
                <b>782</b>
              </div>
              <div>
                <small>IMPACT SCORE</small>
                <b className="text-emerald-400">
                  +42 <Activity size={15} />
                </b>
              </div>
            </div>
            <div className="floating-bottom">
              <Sparkles size={14} />
              <span>Твой вклад — больше, чем KDA.</span>
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="art-caption">
            <span>ДАННЫЕ. КОНТЕКСТ. ПРЕИМУЩЕСТВО.</span>
            <span>01 — 05</span>
          </div>
        </div>
      </section>
      <SearchBox />
      <div className="pro-players">
        <span>Попробуй на профи</span>
        {[
          { name: "Yatoro", id: 321580662, hero: 44, team: "Team Spirit" },
          { name: "Collapse", id: 302214028, hero: 129, team: "Team Spirit" },
          { name: "Miracle-", id: 105248644, hero: 74, team: "Nigma Galaxy" },
        ].map((p) => (
          <Link key={p.id} href={`/player/${p.id}`}>
            <HeroPortrait id={p.hero} />
            <b>{p.name}</b>
            <span>{p.team}</span>
            <ArrowUpRight size={13} />
          </Link>
        ))}
      </div>
      <section className="features-section" id="features">
        <div className="section-heading">
          <div>
            <div className="eyebrow subtle">ПОНИМАЙ ИГРУ ГЛУБЖЕ</div>
            <h2>
              Не просто статистика. <span>Понимание игры.</span>
            </h2>
          </div>
          <span className="small-label">
            Всё, что нужно для следующей победы <ArrowRight size={15} />
          </span>
        </div>
        <div className="feature-grid">
          <Link href="/match/demo#impact" className="feature-card">
            <span className="feature-icon green">
              <Crosshair size={23} />
            </span>
            <span className="feature-num">01</span>
            <h3>Настоящий импакт</h3>
            <p>
              KDA не расскажет всю историю.
              <br />
              Узнай, кто сделал разницу в матче.
            </p>
            <div className="feature-sample">
              <span className="tag gold">
                <Trophy size={11} /> MVP матча
              </span>
              <span className="tag red">
                <Flame size={11} /> Ruiner Alert
              </span>
            </div>
            <ArrowUpRight className="feature-arrow" size={18} />
          </Link>
          <Link href="/match/demo#teams" className="feature-card">
            <span className="feature-icon gold">
              <ChartNoAxesCombined size={23} />
            </span>
            <span className="feature-num">02</span>
            <h3>Каждая минута на счету</h3>
            <p>
              Лайнинг, экономика и тайминги билдов.
              <br />
              Найди момент, когда всё изменилось.
            </p>
            <div className="mini-timeline">
              <span>
                13:20 <b>Battle Fury</b>
              </span>
              <i />
              <span>
                22:10 <b>BKB</b>
              </span>
            </div>
            <ArrowUpRight className="feature-arrow" size={18} />
          </Link>
          <Link href="/match/demo#coach" className="feature-card ai-feature">
            <span className="feature-icon purple">
              <BrainCircuit size={23} />
            </span>
            <span className="feature-num">03</span>
            <h3>Твой персональный AI-тренер</h3>
            <p>
              Причины поражения и конкретные советы.
              <br />
              По фактам твоего матча, без воды.
            </p>
            <div className="ai-sample">
              <Sparkles size={14} /> Меньше тильта. Больше прогресса.
            </div>
            <ArrowUpRight className="feature-arrow" size={18} />
          </Link>
        </div>
      </section>
      <section className="demo-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow subtle">ОТКРОЙ И ПОСМОТРИ</div>
            <h2>
              Весь матч. <span>В одном разборе.</span>
            </h2>
          </div>
          <Link href="/match/demo" className="text-link">
            Открыть демоматч <ArrowUpRight size={16} />
          </Link>
        </div>
        <Link href="/match/demo" className="demo-match">
          <div className="demo-match-title">
            <span className="match-icon">
              <Swords size={21} />
            </span>
            <div>
              <b>
                Radiant <span className="text-emerald-400">40</span>
                <span className="dim">:</span>
                <span className="text-rose-400">25</span> Dire
              </b>
              <p>
                All Pick <span>·</span> 40:18 <span>·</span> Титан{" "}
                <span className="demo-chip">ДЕМО</span>
              </p>
            </div>
          </div>
          <div className="demo-team">
            {[44, 74, 129, 26, 5].map((id) => (
              <HeroPortrait id={id} key={id} />
            ))}
            <span>VS</span>
            {[1, 13, 2, 86, 66].map((id) => (
              <HeroPortrait id={id} key={id} />
            ))}
          </div>
          <div className="demo-winner">
            <span className="status-dot" /> Победа Radiant{" "}
            <ChevronRight size={18} />
          </div>
        </Link>
      </section>
      <div className="home-bottom">
        <ShieldCheck size={17} />
        <span>
          Вход через официальный Steam OpenID. Мы не получаем доступ к твоему
          паролю и инвентарю.
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="status-dot" /> Готов к игре
        </span>
      </div>
    </div>
  );
}
