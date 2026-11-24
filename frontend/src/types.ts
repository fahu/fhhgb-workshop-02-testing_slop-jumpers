export interface Progress { distance: number; tokens: number; elapsedMs: number; collisionId?: string | null }
export interface Nationality { code: string; name: string }
export interface PlayerProfile { playerId: string; alias: string; nationalityCode: string }
export interface Run extends Progress {
  id: string; playerId: string; alias: string; finished: boolean; createdAt: number;
  nationalityCode: string; courseVersion: string; levelLength: number;
}
export interface Receipt { distance: number; checkpoint: number; duplicate: boolean; finished: boolean }
export interface Leaderboard {
  generatedAt: number;
  entries: { alias: string; distance: number; tokens: number; nationality: Nationality; finished: boolean; collisionId: string | null }[];
}
export interface Obstacle { distance: number; width: number; height: number; slopId: string }
export interface Level {
  number: number; courseVersion: string; start: number; end: number;
  obstacles: Obstacle[];
  // The level API keeps the existing field name for collectible positions.
  stars: { id: number; distance: number; height: number }[];
}
