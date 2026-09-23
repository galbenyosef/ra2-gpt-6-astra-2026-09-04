import type { Definition, Effect, Entity, GameEvent, GameMap, PlayerState } from './types';

export interface EngineSnapshot {
  mode: 'skirmish' | 'bootcamp';
  map: GameMap;
  localPlayerId: number;
  fogOfWar: boolean; superweapons: boolean; shortGame: boolean;
  players: PlayerState[]; neutralPlayer: PlayerState;
  entities: Entity[]; effects: Effect[]; events: GameEvent[];
  time: number; paused: boolean; speed: number;
  status: 'playing' | 'victory' | 'defeat'; winnerTeam: number | null; lastMessage: string;
  ore: Float32Array;
  debugRevealPlayers: number[]; instantProductionPlayers: number[]; debugAdjustedCredits: number[];
  nextId: number; nextEffect: number; nextEvent: number; randomState: number;
  visibilityTimer: number; economyTimer: number;
  alarmAt: { base: number | null; miner: number | null };
  // The periodic spatial cache can retain removed entities until its next refresh.
  spatial: [number, number[]][]; spatialRetired: Entity[];
  neutralDefinitions: Definition[];
}

/** Copy data while preserving typed arrays and omitting absent optional properties. */
export function copySaveData<T>(value: T): T {
  if (ArrayBuffer.isView(value)) return structuredClone(value);
  if (Array.isArray(value)) return value.map(copySaveData) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([, item]) => item !== undefined).map(([key, item]) => [key, copySaveData(item)])) as T;
  return value;
}

export function stringifySaveData(value: unknown): string {
  return JSON.stringify(value, (_key, item) => ArrayBuffer.isView(item) ? Array.from(item as unknown as ArrayLike<number>) : item);
}
