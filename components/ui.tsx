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
    <div className="impact-wrap">
      <span className={score >= 0 ? "text-emerald-400" : "text-rose-400"}>
        {estimated ? "≈ " : ""}
        {score > 0 ? "+" : ""}
        {score}
      </span>
      <div className="impact-track">
        <i
          style={{
            width: `${Math.abs(score)}%`,
            background: score >= 0 ? "#50c99f" : "#e47685",
          }}
        />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="page-shell animate-pulse" aria-busy="true">
      <div className="skeleton h-4 w-48 mb-6" />
      <div className="flex items-center justify-between gap-4 mb-7 flex-wrap">
        <div className="flex items-center gap-5">
          <div className="skeleton w-20 h-20 rounded-[9px]" />
          <div className="space-y-2.5">
            <div className="skeleton h-3 w-36" />
            <div className="skeleton h-8 w-52" />
            <div className="skeleton h-4 w-28" />
          </div>
        </div>
        <div className="skeleton h-10 w-36" />
      </div>
      <div className="stat-grid">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div className="skeleton h-28" key={n} />
        ))}
      </div>
      <div className="skeleton h-6 w-48 mb-4" />
      <div className="flex gap-3 mb-7 overflow-hidden">
        {[1, 2, 3].map((n) => (
          <div className="skeleton h-14 w-48 shrink-0" key={n} />
        ))}
      </div>
      <div className="skeleton h-6 w-44 mb-4" />
      <div className="skeleton h-96 w-full" />
    </div>
  );
}

export function MatchSkeleton() {
  return (
    <div className="page-shell animate-pulse" aria-busy="true">
      <div className="skeleton h-4 w-52 mb-6" />
      <div className="flex items-center justify-between gap-4 mb-7 flex-wrap">
        <div className="space-y-3">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-9 w-56" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-10 w-28" />
          <div className="skeleton h-10 w-40" />
        </div>
      </div>
      <div className="highlight-grid">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton h-32" key={n} />
        ))}
      </div>
      <div className="skeleton h-28 w-full mb-7" />
      <div className="skeleton h-80 w-full mb-7" />
      <div className="skeleton h-72 w-full" />
    </div>
  );
}

export function Skeleton() {
  return <ProfileSkeleton />;
}
