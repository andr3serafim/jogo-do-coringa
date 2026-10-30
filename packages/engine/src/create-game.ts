import { validateConfig } from './config.ts';
import { buildDeck } from './deck.ts';
import { startRound } from './flow.ts';
import { nextFloat, seedRng, shuffle } from './rng.ts';
import type { CreateGameResult, GameState, PlayerId, PlayerState, RulesConfig } from './types.ts';

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

/**
 * Cria a partida já na rodada 1 de Equipar, com as cartas distribuídas. A semente decide tudo o que está oculto: no online ela
 * só sai do servidor depois do fim da partida, no `replay` (spec 2 §8.4).
 */
export function createGame(config: RulesConfig, seed: string, players: [PlayerId, PlayerId]): CreateGameResult {
  const configError = validateConfig(config);
  if (configError) return { ok: false, error: configError };
  const [a, b] = players;
  if (!a || !b || a === b || a === 'system' || b === 'system') {
    return {
      ok: false,
      error: { code: 'INVALID_PLAYERS', message: "são necessários dois jogadores com ids diferentes (e diferentes de 'system')" },
    };
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
    phase: { kind: 'EQUIP' },
  };
  startRound(state, []);
  return { ok: true, state };
}
