import { describe, expect, it } from 'vitest';
import { BOTS } from '@coringa/sim/bots';
import { createRng } from '@coringa/sim/rng';
import { cardText } from '@coringa/sim/text';

// A web importa os três pedaços pelo nome do pacote; este teste trava o mapa `exports`.
describe('exports do pacote para o navegador', () => {
  it('@coringa/sim/bots expõe os bots', () => {
    expect(typeof BOTS.greedy).toBe('function');
  });

  it('@coringa/sim/rng é determinístico por semente', () => {
    const a = createRng('x');
    const b = createRng('x');
    expect([a.next(), a.int(100), a.next()]).toEqual([b.next(), b.int(100), b.next()]);
  });

  it('@coringa/sim/text formata cartas', () => {
    expect(cardText({ id: 'c', kind: 'NUM', suit: 'copas', value: 7 })).toBe('7♥');
  });
});
