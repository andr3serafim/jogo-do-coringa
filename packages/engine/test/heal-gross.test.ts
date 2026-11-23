// O bruto da cura passiva no carimbo da mesa (spec `2026-11-23-cura-placas-historico-design.md` §4.1): a interface o calcula com
// `defenseHealOf(carta, lado)`, e o lado que ela tem é o do fim do passo (a `view` que chega com os eventos de um `applyAction`). Isso só vale
// se nada tirar nem puser Q de quem curou depois do `Healed`, no mesmo passo. Este teste trava a garantia: uma regra nova que a quebre
// falha aqui, e não em silêncio no carimbo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action.ts';
import { defenseHealOf } from '../src/combat.ts';
import { makeConfig } from '../src/config.ts';
import { createGame } from '../src/create-game.ts';
import type { GameEvent, GameState, Replay } from '../src/types.ts';
import { exodiaProfile, prefer } from './biased.ts';
import { P1, P2 } from './helpers.ts';
import { playout } from './playout.ts';

/** O que mexe nas Q de quem curou: a Q que entra, a que sai, o fim da Defesa Absoluta. */
const touchesQueens = (event: GameEvent, player: string): boolean =>
  (event.type === 'BuffPlayed' || event.type === 'BuffRemoved' || event.type === 'AbsoluteDefenseEnded') && event.player === player;

/** Confere um passo; devolve quantas curas da Defesa ele teve. */
function checkStep(after: GameState, events: readonly GameEvent[], where: string): number {
  let heals = 0;
  events.forEach((event, i) => {
    if (event.type !== 'Healed' || event.source !== 'DEFENSE') return;
    heals += 1;
    const later = events.slice(i + 1).filter((next) => touchesQueens(next, event.player));
    expect(later, `${where}: as Q de ${event.player} mudam depois da cura`).toEqual([]);
    const side = after.players.find((p) => p.id === event.player)!;
    expect(defenseHealOf(event.card, side), `${where}: o bruto do fim do passo é menor que o que entrou`).toBeGreaterThanOrEqual(event.amount);
  });
  return heals;
}

describe('o bruto da cura passiva vale com o lado do fim do passo', () => {
  it('a conferência pega a Q que sai depois da cura no mesmo passo (o caso que quebraria o carimbo)', () => {
    const created = createGame(makeConfig(), 'x', [P1, P2]);
    if (!created.ok) throw new Error(created.error.message);
    const card = { id: 'n7', kind: 'NUM', value: 7, suit: 'copas' } as const;
    const events: GameEvent[] = [
      { type: 'Healed', player: 'p1', amount: 7, source: 'DEFENSE', card },
      { type: 'BuffRemoved', player: 'p1', cards: [] },
    ];
    expect(() => checkStep(created.state, events, 'sintético')).toThrow(/as Q de p1 mudam depois da cura/);
  });

  it('nas partidas de referência', () => {
    const replays: Replay[] = JSON.parse(readFileSync(new URL('./fixtures/golden-replays.json', import.meta.url), 'utf8'));
    let heals = 0;
    for (const replay of replays) {
      const created = createGame(replay.config, replay.seed, replay.players);
      if (!created.ok) throw new Error(created.error.message);
      let state = created.state;
      replay.steps.forEach(({ player, action }, i) => {
        const result = applyAction(state, player, action);
        if (!result.ok) throw new Error(`${replay.name}, passo ${i}: ${result.error.code}`);
        state = result.state;
        heals += checkStep(state, result.events, `${replay.name}, passo ${i}`);
      });
    }
    expect(heals).toBeGreaterThan(0);
  });

  it('em noventa partidas sorteadas, com as políticas que juntam K e Q', () => {
    const choosers = [undefined, exodiaProfile, prefer(['PLAY_K', 'PLAY_Q', 'STEAL', 'EQUIP', 'CHOOSE_ORDER', 'DECLARE_ATTACK', 'END_TURN', 'PASS'], { allDefense: true })];
    let heals = 0;
    for (let i = 0; i < 90; i++) {
      playout({
        seed: `cura-${i}`,
        choices: [i, i * 7 + 3, i * 13 + 5],
        chooser: choosers[i % choosers.length],
        maxSteps: 1_500,
        onStep: (_before, after, events) => {
          heals += checkStep(after, events, `cura-${i}`);
        },
      });
    }
    expect(heals).toBeGreaterThan(0);
  });
});
