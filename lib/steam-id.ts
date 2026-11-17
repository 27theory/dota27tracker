const OFFSET = 76561197960265728n;
export function toAccountId(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error("Неверный Steam ID");
  const id = BigInt(value);
  const account = id > 4294967295n ? id - OFFSET : id;
  if (account <= 0n || account > 4294967295n)
    throw new Error("Steam ID вне допустимого диапазона");
  return Number(account);
}
export function parseSearch(
  value: string,
  kind: "player" | "match",
): { type: "player" | "match" | "vanity"; id: string } {
  const input = value.trim();
  const matchUrl = input.match(
    /^https?:\/\/(?:www\.)?(?:opendota\.com|dotabuff\.com|stratz\.com)\/matches\/(\d+)\/?(?:\?.*)?$/,
  );
  if (matchUrl) return { type: "match", id: matchUrl[1] };
  if (/^https?:\/\//.test(input)) {
    const url = new URL(input);
    if (
      url.hostname !== "steamcommunity.com" &&
      url.hostname !== "www.steamcommunity.com"
    )
      throw new Error(
        "Используйте ссылку steamcommunity.com/profiles/… или /id/…",
      );
    const path = url.pathname.match(/^\/(profiles|id)\/([\w-]+)\/?$/);
    if (!path) throw new Error("Не удалось распознать ссылку Steam");
    return path[1] === "id"
      ? { type: "vanity", id: path[2] }
      : { type: "player", id: String(toAccountId(path[2])) };
  }
  if (kind === "match") {
    if (!/^\d{1,12}$/.test(input) || BigInt(input) === 0n)
      throw new Error("Введите корректный Match ID");
    return { type: "match", id: input };
  }
  return { type: "player", id: String(toAccountId(input)) };
}
