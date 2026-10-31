import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action.ts';
import { legalActions, nextEquipDestinations } from '../src/legal-actions.ts';
import { viewFor } from '../src/view.ts';
import type { Destination, GameState, PlayerId, Rank } from '../src/types.ts';
import { P1, P2, act, handId, player, setup, type PlayerSetup } from './helpers.ts';

const equipPhase = { round: 1, roundKind: 'EQUIP' as const, phase: { kind: 'EQUIP' as const } };

/** P2 ataca e P1 responde com um Reflect: a resposta agora é de P2 (F2). */
function reflectState(): GameState {
  const s = setup({
    p1: { hand: ['K', 'J', 'Q'] },
    p2: { hand: ['K', 'J', 'Q', 'A'], attack: [5], attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 },
    turnOrder: [P2, P1],
    phase: { kind: 'ATTACK_MAIN', player: P2 },
  });
  const attack = act(s, P2, { type: 'DECLARE_ATTACK' }).state;
  return act(attack, P1, { type: 'REFLECT', kId: handId(s, P1, 'K'), jId: handId(s, P1, 'J'), qId: handId(s, P1, 'Q') }).state;
}

describe('legalActions', () => {
  it('Equipar: todas as combinações de fileira', () => {
    const s = setup({ ...equipPhase, p1: { pending: [3, 4] } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal).toHaveLength(4);
    expect(legal).toContainEqual({ type: 'EQUIP', destinations: ['ATK', 'DEF'] });
  });

  it('Equipar livre (E2): a lista legal é a canônica, na ordem de compra, sem order (a busca do Difícil não cresce k!)', () => {
    const s = setup({ ...equipPhase, p1: { pending: [3, 4, 5, 6] } });
    const equips = legalActions(viewFor(s, P1)).filter((a) => a.type === 'EQUIP');
    expect(equips).toHaveLength(16);
    expect(equips.every((a) => !('order' in a))).toBe(true);
  });

  it('Equipar com as duas fileiras cheias: substituir ou descartar', () => {
    const s = setup({ ...equipPhase, p1: { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 9], pending: [10] } });
    expect(legalActions(viewFor(s, P1))).toEqual([
      { type: 'EQUIP', destinations: ['REPLACE_LAST_ATK'] },
      { type: 'EQUIP', destinations: ['REPLACE_LAST_DEF'] },
      { type: 'EQUIP', destinations: ['DISCARD'] },
    ]);
  });

  it('Equipar com as fileiras cheias: só as sequências canônicas (no máximo uma troca por fileira), k² + k + 1 e não 3^k', () => {
    const full = { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 9] } satisfies Partial<PlayerSetup>;
    for (const k of [1, 2, 4]) {
      const pending = Array.from({ length: k }, (): Rank => 10);
      expect(legalActions(viewFor(setup({ ...equipPhase, p1: { ...full, pending } }), P1))).toHaveLength(k * k + k + 1);
    }
    // Com muitas cartas (o `pnpm sim` aceita `cardsPerEquip` alto), a lista continua pequena.
    const pending = Array.from({ length: 12 }, (_, i): Rank => (i % 2 === 0 ? 10 : 9));
    expect(legalActions(viewFor(setup({ ...equipPhase, p1: { ...full, pending } }), P1))).toHaveLength(12 * 12 + 12 + 1);
  });

  it('a lista canônica cobre todo resultado que uma montagem válida qualquer alcança (as fileiras e o cemitério)', () => {
    // Uma vaga no Ataque: a primeira carta pode ir para lá, e as fileiras enchem no meio da montagem.
    const s = setup({ ...equipPhase, p1: { attack: [2, 2, 3, 3, 4, 4], defense: [6, 6, 7, 7, 8, 8, 9], pending: [10, 9, 8, 7] } });
    const me = player(s, P1);
    /** As fileiras e o cemitério que a montagem deixa, como o `resolveEquip` aplica. */
    const result = (destinations: readonly Destination[]): string => {
      const atk = me.attackRow.map((c) => c.id);
      const def = me.defenseRow.map((c) => c.id);
      const gone: string[] = [];
      me.pending.forEach((card, i) => {
        const d = destinations[i];
        if (d === 'ATK') atk.push(card.id);
        else if (d === 'DEF') def.push(card.id);
        else if (d === 'DISCARD') gone.push(card.id);
        else {
          const row = d === 'REPLACE_LAST_ATK' ? atk : def;
          gone.push(row.pop()!);
          row.push(card.id);
        }
      });
      return JSON.stringify([atk, def, gone.sort()]);
    };
    let all: Destination[][] = [[]];
    for (let i = 0; i < me.pending.length; i++) {
      all = all.flatMap((prefix) => (['ATK', 'DEF', 'REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD'] as const).map((d) => [...prefix, d]));
    }
    const valid = all.filter((destinations) => applyAction(s, P1, { type: 'EQUIP', destinations }).ok);
    const canonical = legalActions(viewFor(s, P1)).flatMap((action) => (action.type === 'EQUIP' ? [action.destinations] : []));
    expect(valid.length).toBeGreaterThan(canonical.length);
    expect(new Set(canonical.map(result))).toEqual(new Set(valid.map(result)));
  });

  it('nextEquipDestinations: os destinos da próxima carta pela regra, e trocar duas vezes a mesma fileira continua possível', () => {
    const s = setup({ ...equipPhase, p1: { attack: [2, 2, 3, 3, 4, 4], defense: [6, 6, 7, 7, 8, 8, 9], pending: [10, 9, 8] } });
    const view = viewFor(s, P1);
    expect(nextEquipDestinations(view, [])).toEqual(['ATK']);
    expect(nextEquipDestinations(view, ['ATK'])).toEqual(['REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD']);
    expect(nextEquipDestinations(view, ['ATK', 'REPLACE_LAST_ATK'])).toEqual(['REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD']);
    expect(nextEquipDestinations(view, ['ATK', 'REPLACE_LAST_ATK', 'REPLACE_LAST_ATK'])).toEqual([]);
    // A sequência fora da lista canônica é aceita pelo motor.
    expect(applyAction(s, P1, { type: 'EQUIP', destinations: ['ATK', 'REPLACE_LAST_ATK', 'REPLACE_LAST_ATK'] }).ok).toBe(true);
    // Um prefixo que a regra recusa não tem continuação.
    expect(nextEquipDestinations(view, ['DEF'])).toEqual([]);
    expect(nextEquipDestinations(viewFor(setup({ ...equipPhase, p1: { pending: [3] } }), P1), [])).toEqual(['ATK', 'DEF']);
  });

  it('fora da vez não há ações', () => {
    expect(legalActions(viewFor(setup(), P2))).toEqual([]);
  });

  it('turno: K em prefixos, Ás por alvo e o ataque por último', () => {
    const s = setup({ p1: { hand: ['K', 'K', 'A'], attack: [5] }, p2: { defenseBuffs: ['Q'], guard: 1 } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal.filter((a) => a.type === 'PLAY_K')).toHaveLength(2);
    expect(legal.filter((a) => a.type === 'TRAP')).toHaveLength(2);
    expect(legal[legal.length - 1]).toEqual({ type: 'DECLARE_ATTACK' });
  });

  it('sem Ás contra Defesa Absoluta; END_TURN com Ataque vazio', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal.some((a) => a.type === 'TRAP')).toBe(false);
    expect(legal).toContainEqual({ type: 'END_TURN' });
  });

  it('resposta ao Reflect: passar ou outro Reflect, e nada mais (nem o A)', () => {
    const legal = legalActions(viewFor(reflectState(), P2));
    expect(legal[0]).toEqual({ type: 'PASS' });
    expect(legal.some((a) => a.type === 'CANCEL_REFLECT')).toBe(true);
    expect(legal.every((a) => a.type === 'PASS' || a.type === 'CANCEL_REFLECT')).toBe(true);
  });

  it('o Reflect só aparece na janela do ataque, nunca na fase principal', () => {
    const main = setup({ p1: { hand: ['K', 'J', 'Q'], attack: [5] } });
    expect(legalActions(viewFor(main, P1)).some((a) => a.type === 'REFLECT')).toBe(false);
    const window = act(setup({ p1: { attack: [5] }, p2: { hand: ['K', 'J', 'Q'] } }), P1, { type: 'DECLARE_ATTACK' }).state;
    expect(legalActions(viewFor(window, P2)).some((a) => a.type === 'REFLECT')).toBe(true);
    // Contra um atacante sob Defesa Absoluta, o A não tem alvo, mas o Reflect segue possível (ele segura o golpe).
    const absolute = act(
      setup({ p1: { attack: [5], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true }, p2: { hand: ['K', 'J', 'Q', 'A'] } }),
      P1,
      { type: 'DECLARE_ATTACK' },
    ).state;
    const legal = legalActions(viewFor(absolute, P2));
    expect(legal.some((a) => a.type === 'TRAP')).toBe(false);
    expect(legal.some((a) => a.type === 'REFLECT')).toBe(true);
  });

  it('toda ação listada é aceita pelo motor', () => {
    const resurrection = setup({ p1: { attack: [7, 7, 7, 7], hand: ['W', 'J', 'Q', 'K'] }, graveyard: [5, 5, 6] });
    player(resurrection, P1).resurrections = [{ row: 'ATK', value: 7, formedAtRound: 3 }];
    const attackWindow = act(setup({ p1: { attack: [9], attackBuffs: ['J'], guard: 1 }, p2: { hand: ['A', 'W', 'K', 'Q'] } }), P1, {
      type: 'DECLARE_ATTACK',
    }).state;
    const cases: Array<[GameState, PlayerId]> = [
      [setup({ ...equipPhase, p1: { pending: [3, 4, 5] } }), P1],
      [setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }), P1],
      [setup({ p1: { hand: ['K', 'K', 'A', 'J', 'Q', 'W'], attack: [5] }, p2: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } }), P1],
      [resurrection, P1],
      [attackWindow, P2],
      [reflectState(), P2],
    ];
    for (const [s, who] of cases) {
      const legal = legalActions(viewFor(s, who));
      expect(legal.length).toBeGreaterThan(0);
      for (const action of legal) {
        const result = applyAction(s, who, action);
        expect(result.ok, JSON.stringify(action)).toBe(true);
      }
    }
  });
});
