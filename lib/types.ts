export type Team = "radiant" | "dire";
export type Role = 1 | 2 | 3 | 4 | 5;
export type Source = "stratz" | "opendota" | "demo";
export interface Purchase {
  id: number;
  name: string;
  time: number;
}
export interface MatchPlayer {
  accountId: number | null;
  name: string;
  heroId: number;
  team: Team;
  role: Role | null;
  lane: string | null;
  laneOutcome: string | null;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number;
  xpm: number;
  lastHits: number;
  denies: number;
  networth: number;
  heroDamage: number;
  towerDamage: number;
  healing: number;
  wards: number | null;
  imp: number | null;
  items: number[];
  neutralItem: number | null;
  purchases: Purchase[];
}
export interface Match {
  id: string;
  duration: number;
  startTime: number;
  radiantWin: boolean;
  radiantScore: number;
  direScore: number;
  mode: string;
  rank: string;
  players: MatchPlayer[];
  goldLeads: number[];
  xpLeads: number[];
  source: Source;
  parsed: boolean;
  notice?: string;
}
export interface PlayerProfile {
  accountId: number;
  name: string;
  avatar: string | null;
  rank: string;
  wins: number | null;
  losses: number | null;
  matches: PlayerMatch[];
  heroes: { heroId: number; games: number; wins: number }[];
  source: Source;
  private: boolean;
  notice?: string;
}
export interface PlayerMatch {
  badge?: string;
  id: string;
  heroId: number;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number | null;
  xpm: number | null;
  imp: number | null;
  role: Role | null;
  lane: string | null;
  duration: number;
  startTime: number;
}
export interface Session {
  accountId: number;
  steamId: string;
}
