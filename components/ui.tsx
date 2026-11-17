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
export function Skeleton() {
  return (
    <div className="page-shell animate-pulse">
      <div className="skeleton h-10 w-64 mb-7" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {[1, 2, 3, 4].map((n) => (
          <div className="skeleton h-28" key={n} />
        ))}
      </div>
      <div className="skeleton h-96" />
    </div>
  );
}
