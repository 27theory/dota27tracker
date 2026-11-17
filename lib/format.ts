import heroes from "./heroes.json";
import items from "./items.json";
const heroMap = heroes as Record<
  string,
  { localized_name: string; name: string }
>;
const itemMap = items as Record<
  string,
  { id: number; dname?: string; img?: string }
>;
const itemsById = new Map(
  Object.entries(itemMap).map(([key, item]) => [item.id, { ...item, key }]),
);
export const CDN =
  "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";
export function heroName(id: number) {
  return heroMap[String(id)]?.localized_name ?? `Герой ${id}`;
}
export function heroImage(id: number) {
  const name = heroMap[String(id)]?.name.replace("npc_dota_hero_", "");
  return name ? `${CDN}/heroes/${name}.png` : "";
}
export function itemName(id: number) {
  return itemsById.get(id)?.dname ?? `Предмет ${id}`;
}
export function itemImage(id: number) {
  const item = itemsById.get(id);
  return item ? `${CDN}/items/${item.key}.png` : "";
}
export function itemId(key: string) {
  return itemMap[key]?.id ?? 0;
}
export function time(seconds: number) {
  const s = Math.abs(Math.round(seconds));
  return `${seconds < 0 ? "−" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function number(n: number) {
  return Intl.NumberFormat("ru-RU", {
    notation: n >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}
export const roles: Record<number, string> = {
  1: "Керри",
  2: "Мидер",
  3: "Офлейнер",
  4: "Саппорт",
  5: "Фулл-саппорт",
};
export function rankName(rank: number | null | undefined) {
  if (!rank) return "Без ранга";
  const medals = [
    "",
    "Рекрут",
    "Страж",
    "Рыцарь",
    "Герой",
    "Легенда",
    "Властелин",
    "Божество",
    "Титан",
  ];
  return `${medals[Math.floor(rank / 10)] ?? "Без ранга"}${Math.floor(rank / 10) < 8 ? ` ${rank % 10} ★` : ""}`;
}
export function ago(timestamp: number) {
  const hours = Math.max(0, Math.floor((Date.now() / 1000 - timestamp) / 3600));
  return hours < 1
    ? "только что"
    : hours < 24
      ? `${hours} ч. назад`
      : `${Math.floor(hours / 24)} дн. назад`;
}
