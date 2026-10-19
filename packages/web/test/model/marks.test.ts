import { describe, expect, it } from 'vitest';
import type { PlayerView } from '@coringa/engine';
import { computeMarks, NO_MARKS, zoneKey } from '../../src/model/marks.ts';
import { seededSteps, viewAt } from '../fixtures.ts';

// Partida de referência (semente fixa): as `view`s de p1 antes de cada jogada dele.
const mine = seededSteps('marks-a', 400)
  .filter((s) => s.actor === 'p1')
  .map((s) => s.view);

const none: ReadonlySet<string> = new Set();

describe('computeMarks', () => {
  it('sem base (nenhuma jogada voluntária ainda) não marca nada', () => {
    expect(computeMarks(null, mine[9]!, none)).toBe(NO_MARKS);
  });

  it('nada mudou: vazio', () => {
    const marks = computeMarks(mine[3]!, mine[3]!, none);
    expect(marks.cards.size).toBe(0);
    expect(marks.zones.size).toBe(0);
  });

  it('o J e o Q que o oponente jogou depois da base aparecem marcados, e o seu 8 destruído', () => {
    const marks = computeMarks(mine[9]!, mine[10]!, none);
    expect([...marks.cards].sort()).toEqual(['b1-copas-J', 'b1-paus-8', 'b2-ouros-Q']);
  });

  it('cartas novas nas fileiras e o K do oponente também', () => {
    expect([...computeMarks(mine[0]!, mine[1]!, none).cards].sort()).toEqual(['b2-copas-4', 'b2-paus-9', 'b1-paus-2'].sort());
    expect([...computeMarks(mine[2]!, mine[3]!, none).cards]).toEqual(['b1-ouros-K']);
  });

  it('o seu K quebrado aparece marcado no cemitério', () => {
    const marks = computeMarks(mine[10]!, mine[11]!, none);
    expect(marks.cards.has('b1-paus-K')).toBe(true);
    expect(mine[11]!.graveyard.some((c) => c.id === 'b1-paus-K')).toBe(true);
  });

  it('vida do oponente menor: opponentHp', () => {
    const marks = computeMarks(mine[9]!, mine[10]!, none);
    expect([...marks.zones]).toEqual(['opponentHp']);
  });

  it('vida sua e pressão que mudaram', () => {
    const base = viewAt({});
    const next: PlayerView = { ...base, pressure: base.pressure + 1, self: { ...base.self, hp: base.self.hp - 5 } };
    expect([...computeMarks(base, next, none).zones].sort()).toEqual(['pressure', 'selfHp']);
  });

  it('seen com o id: o id some, os outros ficam', () => {
    const marks = computeMarks(mine[9]!, mine[10]!, new Set(['b1-copas-J']));
    expect([...marks.cards].sort()).toEqual(['b1-paus-8', 'b2-ouros-Q']);
  });

  it('seen com zone:pressure: a zona some, as outras ficam', () => {
    const base = viewAt({});
    const next: PlayerView = { ...base, pressure: base.pressure + 2, self: { ...base.self, hp: base.self.hp - 1 } };
    const marks = computeMarks(base, next, new Set([zoneKey('pressure')]));
    expect([...marks.zones]).toEqual(['selfHp']);
  });

  it('tudo visto: volta ao vazio compartilhado', () => {
    const marks = computeMarks(mine[9]!, mine[10]!, new Set(['b1-copas-J', 'b1-paus-8', 'b2-ouros-Q', 'zone:opponentHp']));
    expect(marks).toBe(NO_MARKS);
  });

  it('Guarda, buffs de defesa e Reflect do oponente contam; o que já estava na base, não', () => {
    const base = viewAt({ opponent: { defenseRow: [3] } });
    const next = viewAt({
      opponent: { defenseRow: [3], guard: ['J'], defenseBuffs: ['Q'], attackBuffs: ['K'], reflect: true },
    });
    // Os ids de cartas numéricas do cenário são estáveis; os especiais são novos.
    const marks = computeMarks(base, next, none);
    const fresh = [...marks.cards];
    expect(fresh).toHaveLength(6);
    expect(fresh).not.toContain('x-p2-DEF-0');
  });

  it('cartas suas que foram para o cemitério: campo e Reflect contam, mão não', () => {
    const base = viewAt({ self: { hand: ['J'], guard: ['Q'], reflect: true, attackRow: [5] } });
    const ids = [...base.self.guard, ...base.self.hand].map((c) => c.id);
    const reflectIds = [base.self.reflect!.k.id, base.self.reflect!.j.id, base.self.reflect!.q.id];
    const next: PlayerView = {
      ...base,
      graveyard: [
        { id: 'x-p1-ATK-0', kind: 'NUM', value: 5, suit: 'copas' },
        ...base.self.guard,
        ...base.self.hand,
        base.self.reflect!.k,
        base.self.reflect!.j,
      ],
    };
    const marks = computeMarks(base, next, none);
    expect([...marks.cards].sort()).toEqual(['x-p1-ATK-0', ids[0]!, reflectIds[0]!, reflectIds[1]!].sort());
  });
});
