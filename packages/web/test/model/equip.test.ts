import { attackPower, autoDestinations, defensePower, quadValues, viewFor, type Destination, type NumCard, type PlayerView, type Rank } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { completeDraft, draftBoard, EQUIP_AUTO_SEND_MS, nextDestinations, shouldAutoSendEquip } from '../../src/model/equip.ts';
import { legalFor } from '../../src/model/plays.ts';
import { scenarioAt, seededSteps } from '../fixtures.ts';

/** Fase de Equipar de `p1`, com as fileiras e as numéricas pendentes (em ordem de compra) dadas. */
function equipView(options: { attackRow?: Rank[]; defenseRow?: Rank[]; pending: Rank[]; attackBuffs?: 'J'[] }): PlayerView {
  const { state } = scenarioAt({
    phase: { kind: 'EQUIP' },
    self: { attackRow: options.attackRow, defenseRow: options.defenseRow, attackBuffs: options.attackBuffs },
  });
  const me = state.players.find((p) => p.id === 'p1')!;
  me.equipSubmitted = false;
  me.pending = options.pending.map((value, i): NumCard => ({ id: `pend-${i}`, kind: 'NUM', value, suit: 'copas' }));
  return viewFor(state, 'p1');
}

const next = (view: PlayerView, chosen: Destination[]) => nextDestinations(view, legalFor(view), chosen);

const FULL_ATK: Rank[] = [2, 3, 4, 5, 6, 7, 8];

describe('nextDestinations: destinos possíveis da próxima carta', () => {
  it('com vaga nas duas fileiras: Ataque ou Defesa', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3], pending: [5, 6] });
    expect(next(view, [])).toEqual(['ATK', 'DEF']);
  });

  it('Defesa cheia e Ataque com 1 vaga: a primeira só vai para o Ataque; a segunda, trocar ou descartar', () => {
    const view = equipView({ attackRow: [2, 3, 4, 5, 6, 7], defenseRow: FULL_ATK, pending: [8, 9] });
    expect(next(view, [])).toEqual(['ATK']);
    expect(next(view, ['ATK'])).toEqual(['REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD']);
  });

  it('sem carta restante, não sobra destino', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3], pending: [5] });
    expect(next(view, ['ATK'])).toEqual([]);
  });

  it('trocar a última do Ataque e depois trocar de novo a mesma fileira continua possível (a regra aceita, mesmo fora da lista canônica)', () => {
    const view = equipView({ attackRow: FULL_ATK, defenseRow: FULL_ATK, pending: [8, 9, 10] });
    expect(next(view, ['REPLACE_LAST_ATK'])).toContain('REPLACE_LAST_ATK');
    expect(next(view, ['REPLACE_LAST_ATK', 'REPLACE_LAST_ATK'])).toContain('REPLACE_LAST_ATK');
    // A montagem completa é a que o jogador escolheu, sem a regra de estouro mexer nela.
    expect(completeDraft(view, ['REPLACE_LAST_ATK', 'REPLACE_LAST_ATK'])).toEqual(['REPLACE_LAST_ATK', 'REPLACE_LAST_ATK', 'DISCARD']);
  });

  it('sem EQUIP na lista legal (já confirmou, ou não é a sua vez), não há destino', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3], pending: [5] });
    expect(nextDestinations(view, [], [])).toEqual([]);
  });

  it('uma escolha que não leva a montagem legal não dá destinos', () => {
    const view = equipView({ attackRow: [2, 3, 4, 5, 6, 7], defenseRow: FULL_ATK, pending: [8] });
    expect(next(view, ['DEF'])).toEqual([]);
  });
});

describe('draftBoard: o rascunho sobre a mesa', () => {
  it('trocar a última do Ataque manda a velha ao cemitério e os totais seguem o motor', () => {
    const view = equipView({ attackRow: [2, 3, 4, 5, 6, 7, 9], defenseRow: FULL_ATK, pending: [8], attackBuffs: ['J'] });
    const draft = draftBoard(view, ['REPLACE_LAST_ATK']);
    expect(draft.attackRow.map((c) => c.value)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(draft.toGraveyard.map((c) => c.value)).toEqual([9]);
    expect(draft.defenseRow).toEqual(view.self.defenseRow);
    expect(draft.attack).toBe(attackPower({ attackRow: draft.attackRow, attackBuffs: view.self.attackBuffs }, view.pressure));
    expect(draft.defense).toBe(defensePower({ defenseRow: draft.defenseRow, defenseBuffs: view.self.defenseBuffs }));
  });

  it('trocar a última da Defesa e descartar também', () => {
    const view = equipView({ attackRow: FULL_ATK, defenseRow: [2, 3, 4, 5, 6, 7, 9], pending: [8, 2] });
    const draft = draftBoard(view, ['REPLACE_LAST_DEF', 'DISCARD']);
    expect(draft.defenseRow.map((c) => c.value)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(draft.toGraveyard.map((c) => c.value)).toEqual([9, 2]);
    expect(draft.attackRow).toEqual(view.self.attackRow);
  });

  it('ATK e DEF acrescentam no fim da fileira, e a mesa de verdade não muda', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3], pending: [5, 6] });
    const draft = draftBoard(view, ['DEF', 'ATK']);
    expect(draft.defenseRow.map((c) => c.value)).toEqual([3, 5]);
    expect(draft.attackRow.map((c) => c.value)).toEqual([2, 6]);
    expect(draft.newQuads).toEqual([]);
    expect(view.self.attackRow.map((c) => c.value)).toEqual([2]);
    expect(view.self.defenseRow.map((c) => c.value)).toEqual([3]);
  });

  it('uma quarta carta de 7 na Defesa forma quadra nova', () => {
    const view = equipView({ attackRow: [2], defenseRow: [7, 7, 7], pending: [7] });
    const draft = draftBoard(view, ['DEF']);
    expect(draft.newQuads).toEqual([{ row: 'DEF', value: 7 }]);
    expect(quadValues(draft.defenseRow)).toEqual([7]);
    expect(draft.defense).toBe(defensePower({ defenseRow: draft.defenseRow, defenseBuffs: view.self.defenseBuffs }));
  });

  it('quadra que já existia não é "nova"', () => {
    const view = equipView({ attackRow: [2], defenseRow: [7, 7, 7, 7], pending: [3] });
    expect(draftBoard(view, ['DEF']).newQuads).toEqual([]);
  });

  it('só olha as escolhas feitas, mesmo se vierem mais do que cartas', () => {
    const view = equipView({ attackRow: [], defenseRow: [], pending: [5] });
    const draft = draftBoard(view, ['ATK', 'DEF']);
    expect(draft.attackRow).toHaveLength(1);
    expect(draft.defenseRow).toEqual([]);
  });
});

describe('completeDraft: o resto vem da regra de estouro do motor', () => {
  it('com 1 de 3 escolhida, completa igual a autoDestinations sobre as fileiras do rascunho', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3, 4], pending: [5, 6, 7] });
    const done = completeDraft(view, ['DEF']);
    expect(done).toHaveLength(3);
    expect(done[0]).toBe('DEF');
    expect(done.slice(1)).toEqual(autoDestinations(view.config, { attack: 1, defense: 3 }, 2));
  });

  it('nada escolhido é só a regra do motor sobre a mesa atual', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3, 4], pending: [5, 6, 7] });
    expect(completeDraft(view, [])).toEqual(autoDestinations(view.config, { attack: 1, defense: 2 }, 3));
  });

  it('trocar não muda a contagem; o resto vira descarte', () => {
    const view = equipView({ attackRow: FULL_ATK, defenseRow: FULL_ATK, pending: [8, 9] });
    expect(completeDraft(view, ['REPLACE_LAST_ATK'])).toEqual(['REPLACE_LAST_ATK', 'DISCARD']);
  });

  it('tudo escolhido volta como está', () => {
    const view = equipView({ attackRow: [], defenseRow: [], pending: [5, 6] });
    expect(completeDraft(view, ['ATK', 'DEF'])).toEqual(['ATK', 'DEF']);
  });

  it('o preenchimento é uma jogada legal de verdade (partidas com semente fixa)', () => {
    const steps = seededSteps('equip-complete', 60).filter((s) => s.view.phase.kind === 'EQUIP' && s.view.self.pending.length > 1);
    expect(steps.length).toBeGreaterThan(0);
    for (const { view } of steps) {
      const done = completeDraft(view, []);
      const equips = legalFor(view).filter((a) => a.type === 'EQUIP');
      expect(equips.some((a) => a.destinations.every((d, i) => d === done[i]))).toBe(true);
    }
  });
});

describe('shouldAutoSendEquip: envio antecipado do Equipar', () => {
  const base = { remainingMs: EQUIP_AUTO_SEND_MS, chosen: 1, submitted: false, sent: false };

  it('vale com 1500 ms, uma escolha, sem confirmar e sem envio', () => {
    expect(EQUIP_AUTO_SEND_MS).toBe(1_500);
    expect(shouldAutoSendEquip(base)).toBe(true);
    expect(shouldAutoSendEquip({ ...base, remainingMs: 0, chosen: 3 })).toBe(true);
  });

  it('fica falso com 0 escolhas, com 1600 ms, depois de confirmar e depois de enviado', () => {
    expect(shouldAutoSendEquip({ ...base, chosen: 0 })).toBe(false);
    expect(shouldAutoSendEquip({ ...base, remainingMs: 1_600 })).toBe(false);
    expect(shouldAutoSendEquip({ ...base, submitted: true })).toBe(false);
    expect(shouldAutoSendEquip({ ...base, sent: true })).toBe(false);
  });
});
