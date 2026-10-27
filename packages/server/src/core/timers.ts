/** Tempos da sala em milissegundos (spec §6.1). */
export const TIMERS = {
  equipMs: 40_000,
  orderMs: 10_000,
  turnMs: 30_000,
  reactionMs: 8_000,
  reactionMinMs: 2_000,
  reconnectMs: 60_000,
  afkStrikes: 3,
  graceMs: 500,
  presenceSweepMs: 20_000,
  silentDropMs: 45_000,
  helloTimeoutMs: 10_000,
  idleExpiryMs: 1_800_000,
  hardExpiryMs: 86_400_000,
} as const;

/** Versão do formato gravado no storage (spec §9.3). 2: o estado perdeu a `pressure` (a Pressão da mesa saiu no sub-projeto 5). */
export const STATE_SCHEMA = 2;

/** Limites por sala (spec §4, §8). */
export const ROOM_LIMITS = {
  sockets: 8,
  unauthSockets: 4,
  bucketCapacity: 20,
  bucketRefillPerSec: 10,
  maxDrops: 100,
  maxMalformed: 20,
  recentSteps: 50,
  ackHistory: 64,
  createAttempts: 5,
} as const;
