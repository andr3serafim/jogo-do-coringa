import { describe, expect, it } from 'vitest';
import { resurrectProtectedText, resurrectReplaceDetail, resurrectTotalText, resurrectionWaitingText } from '../../src/model/resurrection-copy.ts';
import { phaseShortText, turnText } from '../../src/ui/table/labels.ts';
import { scenarioAt } from '../fixtures.ts';

const names = { self: 'Você', opponent: 'Bot' };

describe('os textos da janela da Ressurreição (ponto 16)', () => {
  it('a faixa central diz de quem é a janela; a placa diz "Quadra"', () => {
    const mine = scenarioAt({ phase: { kind: 'RESURRECTION', player: 'p1', next: null } }).view;
    const theirs = scenarioAt({ phase: { kind: 'RESURRECTION', player: 'p2', next: null } }).view;
    expect(turnText({ ...mine, roundKind: 'EQUIP' }, names)).toBe('Equipar · sua Ressurreição');
    expect(turnText({ ...theirs, roundKind: 'EQUIP' }, names)).toBe('Equipar · Bot decide a Ressurreição');
    expect(phaseShortText(mine)).toBe('Quadra');
  });

  it('a troca, o total e a fileira protegida', () => {
    const card = { id: 'x', kind: 'NUM', value: 7, suit: 'copas' } as const;
    expect(resurrectionWaitingText('Bot')).toBe('Bot formou quadra e decide se ressuscita agora');
    expect(resurrectReplaceDetail(card)).toBe('no lugar de 7♥, que vai ao cemitério');
    expect(resurrectTotalText(37, 38)).toBe('total 37 → 38');
    expect(resurrectProtectedText('ATK', card)).toBe('Ataque: a última, 7♥, é da quadra e não sai');
  });
});
