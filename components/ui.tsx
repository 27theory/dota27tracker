import { heroImage, heroName, itemImage, itemName } from "@/lib/format";

export function HeroPortrait({
  id,
  className = "",
}: {
  id: number;
  className?: string;
}) {
  return (
    <img
      src={heroImage(id)}
      alt={heroName(id)}
      className={`hero-portrait ${className}`}
      loading="lazy"
    />
  );
}

export function ItemIcon({ id }: { id: number }) {
  return id && itemImage(id) ? (
    <img
      className="item-icon"
      src={itemImage(id)}
      alt={itemName(id)}
      title={itemName(id)}
      loading="lazy"
    />
  ) : (
    <span className="item-empty" />
  );
}

export function ImpactBar({
  score,
  estimated = false,
}: {
  score: number;
  estimated?: boolean;
}) {
  return (
    <div className="impact-wrap tabular-nums">
      <span className={score >= 0 ? "text-emerald-400" : "text-rose-400"}>
        {estimated ? "≈ " : ""}
        {score > 0 ? "+" : ""}
        {score}
      </span>
      <div className="impact-track">
        <i
          style={{
            width: `${Math.abs(score)}%`,
            background: score >= 0 ? "#61c6a0" : "#e77c8e",
          }}
        />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="page-shell animate-pulse" aria-busy="true">
      <div className="skeleton h-3.5 w-44 mb-4" />
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="skeleton w-14 h-14 rounded" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-3.5 w-32" />
          </div>
        </div>
        <div className="skeleton h-8 w-28" />
      </div>
      <div className="stat-grid">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div className="skeleton h-20" key={n} />
        ))}
      </div>
      <div className="skeleton h-5 w-40 mb-3" />
      <div className="flex gap-2.5 mb-5 overflow-hidden">
        {[1, 2, 3].map((n) => (
          <div className="skeleton h-12 w-44 shrink-0" key={n} />
        ))}
      </div>
      <div className="skeleton h-5 w-40 mb-3" />
      <div className="skeleton h-80 w-full" />
    </div>
  );
}

export function MatchSkeleton() {
  return (
    <div className="page-shell animate-pulse" aria-busy="true">
      <div className="skeleton h-3.5 w-48 mb-4" />
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="space-y-2">
          <div className="skeleton h-6 w-56" />
          <div className="skeleton h-7 w-64" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-36" />
        </div>
      </div>
      <div className="highlight-grid">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton h-24" key={n} />
        ))}
      </div>
      <div className="skeleton h-20 w-full mb-5" />
      <div className="skeleton h-72 w-full mb-5" />
      <div className="skeleton h-64 w-full" />
    </div>
  );
}

export function Skeleton() {
  return <ProfileSkeleton />;
}
