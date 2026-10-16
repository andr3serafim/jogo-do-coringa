import { validateConfig } from './config';
import { buildDeck } from './deck';
import { startRound } from './flow';
import { nextFloat, seedRng, shuffle } from './rng';
import type { CreateGameResult, GameState, PlayerId, PlayerState, RulesConfig } from './types';

function newPlayer(id: PlayerId, hp: number): PlayerState {
  return {
    id,
    hp,
    hand: [],
    pending: [],
    equipSubmitted: false,
    submittedDestinations: null,
    attackRow: [],
    defenseRow: [],
    attackBuffs: [],
    defenseBuffs: [],
    guard: [],
    reflect: null,
    absoluteDefense: false,
    quads: [],
    resurrections: [],
    damageThisRound: 0,
  };
}

/** Cria a partida já na rodada 1 de Equipar, com as cartas distribuídas. A semente nunca sai do servidor. */
export function createGame(config: RulesConfig, seed: string, players: [PlayerId, PlayerId]): CreateGameResult {
  const configError = validateConfig(config);
  if (configError) return { ok: false, error: configError };
  const [a, b] = players;
  if (!a || !b || a === b) {
    return { ok: false, error: { code: 'INVALID_PLAYERS', message: 'são necessários dois jogadores com ids diferentes' } };
  }
  const rng = seedRng(seed);
  const deck = shuffle(rng, buildDeck(config));
  const initiative = nextFloat(rng) < 0.5 ? a : b;
  const state: GameState = {
    config: structuredClone(config),
    rng,
    players: [newPlayer(a, config.hp), newPlayer(b, config.hp)],
    deck,
    graveyard: [],
    round: 0,
    roundKind: 'EQUIP',
    initiative,
    turnOrder: [a, b],
    turnIndex: 0,
    pressure: 0,
    noDamageStreak: 0,
    hpLostThisRound: false,
    phase: { kind: 'EQUIP' },
  };
  startRound(state, []);
  return { ok: true, state };
}
