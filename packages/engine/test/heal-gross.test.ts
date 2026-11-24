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

/** As Q de `player` (os ids, em ordem). */
const queensOf = (state: GameState, player: string): string[] => state.players.find((p) => p.id === player)!.defenseBuffs.map((card) => card.id);

/**
 * Confere um passo; devolve quantas curas da Defesa ele teve. A garantia completa e simples: num passo com cura da Defesa, as Q de quem
 * curou são as mesmas antes e depois do passo (pega a Q que entra, a que sai por evento próprio e a que a Armadilha ou o Sacrifício
 * levam; e, se uma regra nova mexer nelas antes da cura, falha do lado seguro).
 */
function checkStep(before: GameState, after: GameState, events: readonly GameEvent[], where: string): number {
  let heals = 0;
  for (const event of events) {
    if (event.type !== 'Healed' || event.source !== 'DEFENSE') continue;
    heals += 1;
    expect(queensOf(after, event.player), `${where}: as Q de ${event.player} mudam no passo da cura`).toEqual(queensOf(before, event.player));
    const side = after.players.find((p) => p.id === event.player)!;
    expect(defenseHealOf(event.card, side), `${where}: o bruto do fim do passo é menor que o que entrou`).toBeGreaterThanOrEqual(event.amount);
  }
  return heals;
}

describe('o bruto da cura passiva vale com o lado do fim do passo', () => {
  it('a conferência pega a Q que some no passo da cura (o caso que quebraria o carimbo)', () => {
    const created = createGame(makeConfig(), 'x', [P1, P2]);
    if (!created.ok) throw new Error(created.error.message);
    const before = structuredClone(created.state);
    before.players[0]!.defenseBuffs.push({ id: 'q1', kind: 'Q', suit: 'copas' });
    const card = { id: 'n7', kind: 'NUM', value: 7, suit: 'copas' } as const;
    const events: GameEvent[] = [{ type: 'Healed', player: 'p1', amount: 7, source: 'DEFENSE', card }];
    expect(() => checkStep(before, created.state, events, 'sintético')).toThrow(/as Q de p1 mudam no passo da cura/);
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
        heals += checkStep(state, result.state, result.events, `${replay.name}, passo ${i}`);
        state = result.state;
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
        onStep: (before, after, events) => {
          heals += checkStep(before, after, events, `cura-${i}`);
        },
      });
    }
    expect(heals).toBeGreaterThan(0);
  });
});
