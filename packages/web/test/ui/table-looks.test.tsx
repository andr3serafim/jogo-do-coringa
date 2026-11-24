// Cada lado da mesa com a aparência do dono (decks e raças, fatia 2, Task 4; a tabela "O que vai onde" do plano e a §3 da spec). No treino, o
// bot veste a dele (`botLook`, G1), calculada da sua a cada desenho (G2): os campos dele, a Guarda e os bônus, os versos da mão e o retrato; a
// mão, o Equipar e o cemitério vestem a de quem olha; o momento da especial e as cópias das cenas, a de quem a cena fala. Com o padrão, nada
// muda (nenhuma imagem, os versos de listras, o Coringa no placar). O tutorial e o online seguem em cordel (G4).
import type { DevastationState, GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import type { Look } from '@coringa/protocol';
import { act, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { urls as bestiario } from '../../src/looks/bestiario/index.ts';
import { urls as celestial } from '../../src/looks/celestial/index.ts';
import { portrait, urls as egipcio } from '../../src/looks/egipcio/index.ts';
import { loadPack, resetPacks } from '../../src/looks/load.ts';
import { fieldTarget, type RisingInfo } from '../../src/model/effects.ts';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { BeatOverlay } from '../../src/ui/anim/Scene.tsx';
import { LooksProvider } from '../../src/ui/cards/LooksProvider.tsx';
import { Devastation } from '../../src/ui/scenes/Devastation.tsx';
import { Resurrection } from '../../src/ui/scenes/Resurrection.tsx';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { stateMessage } from '../fixtures.ts';
import { cleanup, connect, emit, MINE, mount, THEIRS } from './anim-harness.tsx';
import { seriousViolations } from './support.tsx';

const BESTIARIO_EGIPCIO: Look = { deck: 'bestiario', race: 'egipcio' };
const BESTIARIO_BUFAO: Look = { deck: 'bestiario', race: 'bufao' };
const CELESTIAL_EGIPCIO: Look = { deck: 'celestial', race: 'egipcio' };

/** As URLs de cada pacote (as de verdade, pelo mesmo caminho do Vite). */
const ofPack = (urls: Record<string, string | undefined>) => new Set(Object.values(urls).filter((url): url is string => url !== undefined));
const BESTIARIO = ofPack(bestiario);
const CELESTIAL = ofPack(celestial);
const EGIPCIO = ofPack(egipcio);

const srcs = (root: ParentNode | null | undefined, selector = '[data-card-id] img'): string[] =>
  [...(root?.querySelectorAll(selector) ?? [])].map((img) => img.getAttribute('src') ?? '');
/** Toda imagem é de um dos pacotes, e há ao menos uma. */
function expectFrom(found: string[], ...packs: Array<Set<string>>) {
  expect(found.length).toBeGreaterThan(0);
  for (const src of found) expect(packs.some((pack) => pack.has(src)), src).toBe(true);
}

const theirField = () => screen.getByRole('region', { name: 'Campo de Duda' });
const myField = () => screen.getByRole('region', { name: 'Seu campo' });
const hand = () => screen.getByRole('list', { name: 'Sua mão' });
const backs = () => [...theirField().querySelectorAll<HTMLElement>('[data-verso]')];
const portraitOf = (side: 'voce' | 'oponente') => document.querySelector<HTMLElement>(`[data-retrato="${side}"]`)!;
/** O Coringa de cordel do placar é um `svg`; o retrato da raça, um `img` decorativo. */
const portraitImage = (side: 'voce' | 'oponente') => portraitOf(side).querySelector('img');
/** O botão do menu existe duas vezes (celular e PC); o CSS esconde um deles, e o jsdom não tem CSS. */
const menuButton = () => screen.getAllByRole('button', { name: 'Menu da partida' })[0]!;

/** Os três pacotes prontos antes da mesa: o primeiro desenho já tem a arte (o pedido do provedor está nos testes do `LookZone`). */
async function allPacks() {
  await Promise.all([loadPack('bestiario'), loadPack('celestial'), loadPack('egipcio')]);
}

beforeEach(() => resetPacks());
afterEach(cleanup);
afterAll(() => resetPacks());

describe('o treino com Bestiário + Egípcio (o bot em Celestial + Egípcio)', () => {
  it('os campos do bot (fileiras, Guarda, bônus) vestem a Celestial; os seus, a mão e o cemitério, o Bestiário', async () => {
    await allPacks();
    mount(MINE, { training: 'medio', prefs: { look: BESTIARIO_EGIPCIO } });
    // O lado do bot: as numéricas da Celestial e as especiais (Guarda, bônus) do Egípcio dele.
    const theirs = srcs(theirField());
    expectFrom(theirs, CELESTIAL, EGIPCIO);
    expect(theirs.some((src) => CELESTIAL.has(src))).toBe(true);
    expect(theirs.some((src) => EGIPCIO.has(src))).toBe(true);
    // O seu lado: as numéricas do Bestiário.
    const mine = srcs(myField());
    expectFrom(mine, BESTIARIO, EGIPCIO);
    expect(mine.some((src) => BESTIARIO.has(src))).toBe(true);
    // A mão (K, A, Q) é sua, do seu Egípcio; o cemitério (3, 5, 8, a de cima é o 8) também é seu.
    expectFrom(srcs(hand()), EGIPCIO);
    expectFrom(srcs(document.querySelector('[data-cemiterio]')?.parentElement, 'img'), BESTIARIO);
  });

  it('os versos da mão do bot têm o deck dele; os dois retratos são o Anúbis', async () => {
    await allPacks();
    mount(MINE, { training: 'medio', prefs: { look: BESTIARIO_EGIPCIO } });
    expect(backs().length).toBeGreaterThan(0);
    for (const back of backs()) expect(back).toHaveAttribute('data-verso-deck', 'celestial');
    expect(portraitImage('voce')).toHaveAttribute('src', portrait);
    expect(portraitImage('oponente')).toHaveAttribute('src', portrait);
    expect(portraitImage('oponente')).toHaveAttribute('alt', '');
  });

  it('o axe limpo na mesa com os dois decks', async () => {
    await allPacks();
    const m = mount(MINE, { training: 'medio', prefs: { look: BESTIARIO_EGIPCIO } });
    // O axe espera por timers de verdade.
    vi.useRealTimers();
    expect(await seriousViolations(m.container)).toEqual([]);
  });
});

describe('o treino com Bestiário + Bufão', () => {
  it('o seu retrato é o Coringa de cordel; o do bot, o Anúbis', async () => {
    await allPacks();
    mount(MINE, { training: 'medio', prefs: { look: BESTIARIO_BUFAO } });
    expect(portraitImage('voce')).toBeNull();
    expect(portraitOf('voce').querySelector('svg')).not.toBeNull();
    expect(portraitImage('oponente')).toHaveAttribute('src', portrait);
    // A sua mão (K, A, Q) é do Bufão: de cordel.
    expect(srcs(hand())).toEqual([]);
  });
});

describe('o treino padrão fica como hoje', () => {
  it('nenhum img de carta, os versos de listras sem deck, o Coringa nos dois retratos, e nenhum pacote pedido', async () => {
    const calls = { bestiario: 0, celestial: 0, egipcio: 0 };
    resetPacks({
      bestiario: () => (calls.bestiario++, Promise.resolve({ urls: bestiario })),
      celestial: () => (calls.celestial++, Promise.resolve({ urls: celestial })),
      egipcio: () => (calls.egipcio++, Promise.resolve({ urls: egipcio, portrait })),
    });
    const m = mount(MINE, { training: 'medio' });
    await act(async () => vi.dynamicImportSettled());
    expect(m.container.querySelectorAll('img')).toHaveLength(0);
    expect(backs().length).toBeGreaterThan(0);
    for (const back of backs()) expect(back).not.toHaveAttribute('data-verso-deck');
    expect(portraitOf('voce').querySelector('svg')).not.toBeNull();
    expect(portraitOf('oponente').querySelector('svg')).not.toBeNull();
    expect(calls).toEqual({ bestiario: 0, celestial: 0, egipcio: 0 });
  });
});

describe('a troca no menu (G2): o bot acompanha a sua', () => {
  it('de Bestiário para Celestial, o lado do bot passa ao Bestiário, sem remontar a mesa nem tocar batida; no Cordel, tudo em cordel', async () => {
    await allPacks();
    const m = mount(MINE, { training: 'medio', prefs: { look: BESTIARIO_EGIPCIO } });
    const table = screen.getByRole('main', { name: 'Mesa' });
    const card = theirField().querySelector('[data-card-id]');
    const seq = m.session.snapshot().state!.seq;
    await m.user.click(menuButton());
    const menu = within(screen.getByRole('dialog', { name: 'Menu da partida' }));
    await m.user.click(menu.getByRole('radio', { name: 'Celestial' }));
    expectFrom(srcs(theirField()), BESTIARIO, EGIPCIO);
    expect(srcs(theirField()).some((src) => BESTIARIO.has(src))).toBe(true);
    expectFrom(srcs(myField()), CELESTIAL, EGIPCIO);
    for (const back of backs()) expect(back).toHaveAttribute('data-verso-deck', 'bestiario');
    expect(screen.getByRole('main', { name: 'Mesa' })).toBe(table);
    expect(theirField().querySelector('[data-card-id]')).toBe(card);
    expect(m.session.snapshot().state!.seq).toBe(seq);

    await m.user.click(menu.getByRole('radio', { name: 'Cordel' }));
    expect(m.container.querySelectorAll('[data-card-id] img')).toHaveLength(0);
    for (const back of backs()) expect(back).not.toHaveAttribute('data-verso-deck');
    expect(portraitImage('oponente')).toBeNull();
  });
});

describe('a carta que muda de lado (o Roubo)', () => {
  it('a mesma carta (o mesmo id) sai do seu campo com a sua e entra no do bot com a dele', async () => {
    await allPacks();
    const m = mount(THEIRS, { training: 'medio', prefs: { look: BESTIARIO_EGIPCIO } });
    const { view } = m;
    const ten = view.self.attackRow.find((card) => card.value === 10)!;
    const face = (root: ParentNode) => root.querySelector(`[data-card-id="${ten.id}"] img`)?.getAttribute('src');
    expect(face(myField())).toBe(bestiario['10']);
    // O 10 da sua fileira de ataque vai para a fileira de ataque do bot, com o mesmo id.
    const moved = {
      ...view,
      self: { ...view.self, attackRow: view.self.attackRow.filter((card) => card.id !== ten.id) },
      opponent: { ...view.opponent, attackRow: [...view.opponent.attackRow, ten] },
    };
    act(() => m.connection.emitState(stateMessage(moved, { seq: 50, events: [] })));
    expect(face(theirField())).toBe(celestial['10']);
  });
});

describe('o momento da especial do bot (G6)', () => {
  const JB: SpecialCard = { id: 'jb', kind: 'J', suit: 'paus' };
  const botBuff: GameEvent = { type: 'BuffPlayed', player: 'p2', card: JB, as: 'J' };
  const withJ = { ...THEIRS, opponent: { ...THEIRS.opponent, attackBuffs: [JB] } };

  it('a carta grande veste a aparência do bot, e o verso que vira tem o deck dele', async () => {
    await allPacks();
    // Você com o Bufão: o J de cordel seria o seu; o do bot é o do Egípcio dele.
    const m = mount(THEIRS, { training: 'medio', prefs: { look: BESTIARIO_BUFAO } });
    emit(m, withJ, [botBuff]);
    const layer = m.container.querySelector('[data-momento]')!;
    expect(srcs(layer, 'img')).toEqual([egipcio.J]);
    expect(layer.querySelector('[data-momento-verso]')).toHaveAttribute('data-verso-deck', 'celestial');
  });

  it('no padrão, a carta grande é de cordel e o verso não tem deck', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, withJ, [botBuff]);
    const layer = m.container.querySelector('[data-momento]')!;
    expect(layer.querySelector('img')).toBeNull();
    expect(layer.querySelector('[data-momento-verso]')).not.toHaveAttribute('data-verso-deck');
  });
});

describe('as cópias das cenas vestem a aparência de quem a cena fala', () => {
  const PACKS = { bestiario, celestial, egipcio };
  const OWNERS = { p1: BESTIARIO_EGIPCIO, p2: CELESTIAL_EGIPCIO };
  const num = (id: string, value: NumCard['value']): NumCard => ({ id, kind: 'NUM', value, suit: 'copas' });

  /** Uma caixa falsa: o p1 embaixo, o p2 em cima, 8 vagas por fileira. */
  const box: SceneBox = {
    band: { x: 0, y: 90, w: 1000, h: 500 },
    hudBottom: 90,
    portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
    reflectZone: () => null,
    graveyard: () => ({ x: 800, y: 320, w: 120, h: 60 }),
    row: (player) => {
      const y = player === 'p1' ? 400 : 120;
      return {
        rect: { x: 40, y, w: 700, h: 80 },
        slots: Array.from({ length: 8 }, (_, i) => ({ x: 40 + i * 60, y, w: 50, h: 70 })),
        field: { x: 0, y: y - 30, w: 1000, h: 200 },
      };
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a Devastação: as cópias da fileira que cai vestem a do dono dela', () => {
    const cards = [num('d1', 5), num('d2', 7)];
    const event: GameEvent = { type: 'RowDevastated', player: 'p2', row: 'DEF', cards, reflected: false };
    const cast: DevastationState = { player: 'p1', row: 'DEF', k: { id: 'k', kind: 'K', suit: 'copas' }, a: { id: 'a', kind: 'A', suit: 'paus' }, x: { id: 'q', kind: 'Q', suit: 'ouros' } };
    const [beat] = buildTimeline([event], { mode: 'live', reducedMotion: false, decisionPending: false });
    render(
      <LooksProvider look={BESTIARIO_EGIPCIO} owners={OWNERS} packs={PACKS}>
        <div data-palco>
          <section data-campo="p1" />
          <section data-campo="p2" />
          <Devastation beat={beat!} names={roomNames('p1', [])} reduced={false} me="p1" hitLanded={false} box={box} field={fieldTarget(event, cast, 'p1', 'p2')} />
        </div>
      </LooksProvider>,
    );
    expect(srcs(document, '[data-carta-caindo] img')).toEqual([celestial['05'], celestial['07']]);
  });

  // A §3 da spec: as cenas raras seguem em cordel. As quatro cartas da figura (o painel de reserva) não vestem a aparência de ninguém.
  it('a figura da cena rara fica em cordel, mesmo dentro do provedor com arte', () => {
    const [beat] = buildTimeline([{ type: 'Exodia', player: 'p2' }], { mode: 'live', reducedMotion: true, decisionPending: false });
    render(
      <LooksProvider look={BESTIARIO_EGIPCIO} owners={OWNERS} packs={PACKS}>
        <BeatOverlay scene={beat!} curtain names={roomNames('p1', [])} reduced me="p1" hitLanded={false} />
      </LooksProvider>,
    );
    expect(document.querySelectorAll('[data-figura] [data-card-id]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-figura] img')).toHaveLength(0);
  });

  it('a Ressurreição: as cópias da quadra e a carta que volta vestem a de quem ressuscita', () => {
    const quad = [num('q1', 8), num('q2', 8), num('q3', 8), num('q4', 8)];
    const revived = num('volta', 9);
    const event: GameEvent = { type: 'Resurrected', player: 'p2', card: revived, row: 'ATK' };
    const rising: RisingInfo = { landIndex: 5, quad: { row: 'ATK', indices: [0, 1, 2, 3], cards: quad } };
    const [beat] = buildTimeline([event], { mode: 'live', reducedMotion: false, decisionPending: false });
    render(
      <LooksProvider look={BESTIARIO_EGIPCIO} owners={OWNERS} packs={PACKS}>
        <div data-palco>
          <div data-campos />
          <Resurrection beat={beat!} names={roomNames('p1', [])} reduced={false} me="p1" hitLanded={false} box={box} field={null} rising={rising} />
        </div>
      </LooksProvider>,
    );
    expect(srcs(document, '[data-quadra-cena] img')).toEqual(Array(4).fill(celestial['08']));
    act(() => {
      vi.advanceTimersByTime(SCENE_MOMENTS.RESURRECTED.riseAt);
    });
    const risen = srcs(document, '[data-carta-cena] img');
    expect(risen.length).toBeGreaterThan(0);
    for (const src of risen) expect(src).toBe(celestial['09']);
  });
});

describe('o tutorial e a sala online seguem em cordel (G4)', () => {
  it.each([
    ['o tutorial', { training: 'facil', tutorial: true } as const],
    ['a sala online', {} as const],
  ])('%s, com a preferência fantasy: versos de listras, o Coringa, nenhuma imagem e nada no console', async (_, props) => {
    await allPacks();
    const errors = vi.spyOn(console, 'error');
    const warnings = vi.spyOn(console, 'warn');
    const base = connect(MINE, { prefs: { look: BESTIARIO_EGIPCIO } });
    const { container } = render(<PlayTable session={base.session} {...props} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    for (const back of backs()) expect(back).not.toHaveAttribute('data-verso-deck');
    expect(portraitOf('oponente').querySelector('svg')).not.toBeNull();
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
  });
});
