// A aparência por dono (decks e raças, fatia 2, Task 3): um provedor só, que conhece a aparência de cada dono e pede a união dos pacotes, e
// o `LookZone`, que troca a aparência do lugar para os filhos sem pôr nó no DOM. Fora de zona, o lugar veste a de quem olha.
import type { Card as EngineCard } from '@coringa/engine';
import { DEFAULT_LOOK, type Look } from '@coringa/protocol';
import { act, render } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { urls as bestiario } from '../../src/looks/bestiario/index.ts';
import { urls as celestial } from '../../src/looks/celestial/index.ts';
import { portrait, urls as egipcio } from '../../src/looks/egipcio/index.ts';
import { loadPack, resetPacks } from '../../src/looks/load.ts';
import { markReady } from '../../src/looks/ready.ts';
import { Card } from '../../src/ui/cards/Card.tsx';
import { LooksProvider, LookZone } from '../../src/ui/cards/LooksProvider.tsx';
import type { LooksValue } from '../../src/ui/cards/looks-context.ts';
import { useLook, usePortrait } from '../../src/ui/cards/looks-context.ts';

const seven: EngineCard = { id: 'n7', kind: 'NUM', value: 7, suit: 'copas' };

const PACKS: LooksValue['packs'] = {
  bestiario: { '07': '/arte/07-fenix.webp' },
  celestial: { '07': '/arte/07-leao-alado.webp' },
  egipcio: { K: '/arte/k-mascara.webp' },
};
const MINE: Look = { deck: 'bestiario', race: 'egipcio' };
const THEIRS: Look = { deck: 'celestial', race: 'egipcio' };
const OWNERS = { p1: MINE, p2: THEIRS };

const srcOf = (el: Element | null | undefined): string | null => el?.querySelector('img')?.getAttribute('src') ?? null;

/** Mostra a aparência do lugar e o retrato dele, como texto. */
function Probe({ id }: { id: string }) {
  const look = useLook();
  const url = usePortrait();
  return <span data-sonda={id} data-deck={look.deck} data-raca={look.race} data-retrato={url ?? ''} />;
}
const probe = (container: HTMLElement, id: string) => container.querySelector<HTMLElement>(`[data-sonda="${id}"]`)!.dataset;

beforeEach(() => resetPacks());
afterAll(() => resetPacks());

describe('o LookZone: o lugar de um dono', () => {
  it('dentro da zona, a carta veste a aparência do dono; fora, a de quem olha; um dono sem aparência, a de quem olha', () => {
    const { container } = render(
      <LooksProvider look={MINE} owners={OWNERS} packs={PACKS}>
        <div data-fora>
          <Card card={seven} size="field" />
        </div>
        <LookZone owner="p2">
          <div data-zona-p2>
            <Card card={seven} size="field" />
          </div>
        </LookZone>
        <LooksProvider look={MINE} owners={{ p2: THEIRS }} packs={PACKS}>
          <LookZone owner="p1">
            <div data-sem-dono>
              <Card card={seven} size="field" />
            </div>
          </LookZone>
        </LooksProvider>
      </LooksProvider>,
    );
    expect(srcOf(container.querySelector('[data-fora]'))).toBe('/arte/07-fenix.webp');
    expect(srcOf(container.querySelector('[data-zona-p2]'))).toBe('/arte/07-leao-alado.webp');
    expect(srcOf(container.querySelector('[data-sem-dono]'))).toBe('/arte/07-fenix.webp');
  });

  it('uma zona dentro de outra veste o próprio dono, e não o da zona de fora', () => {
    const { container } = render(
      <LooksProvider look={MINE} owners={OWNERS} packs={PACKS}>
        <LookZone owner="p2">
          <LookZone owner="p1">
            <div data-dentro>
              <Card card={seven} size="field" />
            </div>
          </LookZone>
        </LookZone>
      </LooksProvider>,
    );
    expect(srcOf(container.querySelector('[data-dentro]'))).toBe('/arte/07-fenix.webp');
  });

  it('sem dono (null), o lugar fica como está: dentro de outra zona, a dela', () => {
    const { container } = render(
      <LooksProvider look={MINE} owners={OWNERS} packs={PACKS}>
        <LookZone owner="p2">
          <LookZone owner={null}>
            <div data-sem-dono>
              <Card card={seven} size="field" />
            </div>
          </LookZone>
        </LookZone>
      </LooksProvider>,
    );
    expect(srcOf(container.querySelector('[data-sem-dono]'))).toBe('/arte/07-leao-alado.webp');
  });

  it('não põe nó no DOM: o filho dele é filho direto do pai', () => {
    const { container } = render(
      <LooksProvider look={MINE} owners={OWNERS} packs={PACKS}>
        <section data-pai>
          <LookZone owner="p2">
            <p data-filho>a</p>
          </LookZone>
        </section>
      </LooksProvider>,
    );
    expect(container.querySelector('[data-filho]')!.parentElement).toBe(container.querySelector('[data-pai]'));
  });
});

describe('o useLook', () => {
  it('sem provedor, o padrão; fora de zona, a de quem olha; na zona, a do dono', () => {
    const alone = render(<Probe id="sozinha" />);
    expect(probe(alone.container, 'sozinha')).toMatchObject({ deck: DEFAULT_LOOK.deck, raca: DEFAULT_LOOK.race });
    const { container } = render(
      <LooksProvider look={{ deck: 'bestiario', race: 'bufao' }} owners={{ p2: THEIRS }} packs={PACKS}>
        <Probe id="fora" />
        <LookZone owner="p2">
          <Probe id="p2" />
        </LookZone>
      </LooksProvider>,
    );
    expect(probe(container, 'fora')).toMatchObject({ deck: 'bestiario', raca: 'bufao' });
    expect(probe(container, 'p2')).toMatchObject({ deck: 'celestial', raca: 'egipcio' });
  });
});

describe('os pacotes: a união dos donos, pedida uma vez', () => {
  /** Os `import()` dos pacotes trocados por contadores, com as URLs de verdade. */
  function countLoaders() {
    const calls = { bestiario: 0, celestial: 0, egipcio: 0 };
    resetPacks({
      bestiario: () => (calls.bestiario++, Promise.resolve({ urls: bestiario })),
      celestial: () => (calls.celestial++, Promise.resolve({ urls: celestial })),
      egipcio: () => (calls.egipcio++, Promise.resolve({ urls: egipcio, portrait })),
    });
    return calls;
  }

  it('com os dois lados de decks diferentes, cada um dos três pacotes é pedido uma vez, e as cartas de cada lado chegam', async () => {
    const calls = countLoaders();
    const { container } = render(
      <LooksProvider look={MINE} owners={OWNERS}>
        <div data-fora>
          <Card card={seven} size="field" />
        </div>
        <LookZone owner="p2">
          <div data-zona-p2>
            <Card card={seven} size="field" />
          </div>
        </LookZone>
      </LooksProvider>,
    );
    await act(async () => vi.dynamicImportSettled());
    expect(calls).toEqual({ bestiario: 1, celestial: 1, egipcio: 1 });
    expect(srcOf(container.querySelector('[data-fora]'))).toMatch(/07-fenix\.webp$/);
    expect(srcOf(container.querySelector('[data-zona-p2]'))).toMatch(/07-leao-alado\.webp$/);
  });

  it('um pacote que ninguém cita não é pedido', async () => {
    const calls = countLoaders();
    render(
      <LooksProvider look={{ deck: 'bestiario', race: 'bufao' }} owners={{ p1: { deck: 'bestiario', race: 'bufao' } }}>
        <Card card={seven} size="field" />
      </LooksProvider>,
    );
    await act(async () => vi.dynamicImportSettled());
    expect(calls).toEqual({ bestiario: 1, celestial: 0, egipcio: 0 });
  });

  it('o padrão: sem donos e com a aparência padrão, nada é pedido e a carta é de cordel', async () => {
    const calls = countLoaders();
    const { container } = render(
      <LooksProvider look={DEFAULT_LOOK}>
        <LookZone owner="p2">
          <Card card={seven} size="field" />
        </LookZone>
      </LooksProvider>,
    );
    await act(async () => vi.dynamicImportSettled());
    expect(calls).toEqual({ bestiario: 0, celestial: 0, egipcio: 0 });
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('a corrida do pacote que fica pronto entre o desenho e o efeito', () => {
  // No navegador, o pedido adiantado (o replay, o treino) pode resolver depois de o provedor desenhar e antes de o efeito dele rodar: o
  // efeito acha o pacote pronto, e o desenho já foi feito sem ele. O filho abaixo deixa o pacote pronto nesse intervalo.
  function ReadyDuringRender() {
    markReady('celestial', { '07': '/arte/07-leao-alado.webp' }, undefined);
    return null;
  }

  it('a arte chega mesmo assim', async () => {
    const { container } = render(
      <LooksProvider look={{ deck: 'celestial', race: 'bufao' }}>
        <ReadyDuringRender />
        <Card card={seven} size="field" />
      </LooksProvider>,
    );
    await act(async () => vi.dynamicImportSettled());
    await vi.waitFor(() => expect(srcOf(container)).toMatch(/07-leao-alado\.webp$/));
  });
});

describe('a falha passageira (fatia 2, revisão)', () => {
  it('o pacote que falhou para a mesa e chegou por outro pedido (a amostra do menu) veste a mesa sem remontar', async () => {
    let calls = 0;
    resetPacks({
      celestial: () => (++calls === 1 ? Promise.reject(new Error('sem rede')) : Promise.resolve({ urls: celestial })),
    });
    const { container } = render(
      <LooksProvider look={{ deck: 'celestial', race: 'bufao' }}>
        <Card card={seven} size="field" />
      </LooksProvider>,
    );
    await act(async () => vi.dynamicImportSettled());
    expect(srcOf(container)).toBeNull();
    await act(async () => {
      await loadPack('celestial');
    });
    expect(srcOf(container)).toMatch(/07-leao-alado\.webp$/);
  });
});

describe('o retrato da raça', () => {
  it('com o pacote egípcio pronto, o lugar egípcio tem o retrato do Anúbis; o do Bufão, nenhum', async () => {
    await loadPack('egipcio');
    const { container } = render(
      <LooksProvider look={{ deck: 'bestiario', race: 'bufao' }} owners={{ p2: THEIRS }}>
        <Probe id="voce" />
        <LookZone owner="p2">
          <Probe id="bot" />
        </LookZone>
      </LooksProvider>,
    );
    expect(probe(container, 'bot').retrato).toMatch(/retrato-anubis\.webp$/);
    expect(probe(container, 'voce').retrato).toBe('');
  });

  it('com o pacote ainda por chegar, nenhum retrato; quando chega, o do Anúbis', async () => {
    const { container } = render(
      <LooksProvider look={THEIRS}>
        <Probe id="voce" />
      </LooksProvider>,
    );
    expect(probe(container, 'voce').retrato).toBe('');
    await act(async () => vi.dynamicImportSettled());
    await vi.waitFor(() => expect(probe(container, 'voce').retrato).toMatch(/retrato-anubis\.webp$/));
  });
});
