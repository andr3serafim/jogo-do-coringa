// A sala online veste cada lado com a aparência do assento (decks e raças, fatia 3, Task 4; spec §8.3, H2, H3 e H5). A sua também vem do
// assento, nunca da preferência; o assento sem `look` é o Cordel. O menu online mostra a linha da aparência fixa no lugar do seletor, e a
// partida terminada guarda as aparências dos assentos quando alguma não é o padrão. As mensagens `room` de presença não trocam as aparências
// da mesa (o memo é pelo conteúdo).
import type { PlayerId } from '@coringa/engine';
import { DEFAULT_LOOK, type Look, type RoomMessage, type SeatInfo } from '@coringa/protocol';
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { urls as bestiario } from '../../src/looks/bestiario/index.ts';
import { urls as celestial } from '../../src/looks/celestial/index.ts';
import { portrait, urls as egipcio } from '../../src/looks/egipcio/index.ts';
import { loadPack, resetPacks } from '../../src/looks/load.ts';
import { LOOK_ROOM_FIXED } from '../../src/model/copy.ts';
import { loadPastGames } from '../../src/model/past-games.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { useTableLooks, type TableLooksMode } from '../../src/ui/table/useTableLooks.ts';
import { cleanup, connect, MINE, seatOf, THEIRS } from './anim-harness.tsx';
import { memoryStore, roomMessage, seriousViolations } from './support.tsx';

const BESTIARIO_EGIPCIO: Look = { deck: 'bestiario', race: 'egipcio' };
const CELESTIAL_BUFAO: Look = { deck: 'celestial', race: 'bufao' };
const CELESTIAL_EGIPCIO: Look = { deck: 'celestial', race: 'egipcio' };

const ofPack = (urls: Record<string, string | undefined>) => new Set(Object.values(urls).filter((url): url is string => url !== undefined));
const BESTIARIO = ofPack(bestiario);
const CELESTIAL = ofPack(celestial);
const EGIPCIO = ofPack(egipcio);

const srcs = (root: ParentNode | null | undefined, selector = '[data-card-id] img'): string[] =>
  [...(root?.querySelectorAll(selector) ?? [])].map((img) => img.getAttribute('src') ?? '');
function expectFrom(found: string[], ...packs: Array<Set<string>>) {
  expect(found.length).toBeGreaterThan(0);
  for (const src of found) expect(packs.some((pack) => pack.has(src)), src).toBe(true);
}

const myField = () => screen.getByRole('region', { name: 'Seu campo' });
const fieldOf = (nickname: string) => screen.getByRole('region', { name: `Campo de ${nickname}` });
const hand = () => screen.getByRole('list', { name: 'Sua mão' });
const backsIn = (field: HTMLElement) => [...field.querySelectorAll<HTMLElement>('[data-verso]')];
const portraitOf = (side: 'voce' | 'oponente') => document.querySelector<HTMLElement>(`[data-retrato="${side}"]`)!;
const portraitImage = (side: 'voce' | 'oponente') => portraitOf(side).querySelector('img');
const menuButton = () => screen.getAllByRole('button', { name: 'Menu da partida' })[0]!;

/** Os assentos da sala: André (p1) em Bestiário + Egípcio, Duda (p2) em Celestial + Bufão. */
const SEATS_WITH_LOOKS: RoomMessage['seats'] = [
  { ...seatOf('p1', 'André'), look: BESTIARIO_EGIPCIO },
  { ...seatOf('p2', 'Duda'), look: CELESTIAL_BUFAO },
];

async function allPacks() {
  await Promise.all([loadPack('bestiario'), loadPack('celestial'), loadPack('egipcio')]);
}

beforeEach(() => resetPacks());
afterEach(cleanup);
afterAll(() => resetPacks());

describe('a mesa online veste cada lado com a aparência do assento', () => {
  it('vista do p1: as suas cartas do Bestiário e do Egípcio; o lado de Duda da Celestial, com os versos dela e o Coringa', async () => {
    await allPacks();
    const base = connect(MINE, { room: { seats: SEATS_WITH_LOOKS } });
    render(<PlayTable session={base.session} />);
    const mine = srcs(myField());
    expectFrom(mine, BESTIARIO, EGIPCIO);
    expect(mine.some((src) => BESTIARIO.has(src))).toBe(true);
    // A mão (K, A, Q) é do seu Egípcio.
    expectFrom(srcs(hand()), EGIPCIO);
    // As fileiras de Duda, já reveladas: as numéricas da Celestial; as especiais dela são do Bufão (de cordel, sem imagem).
    expectFrom(srcs(fieldOf('Duda')), CELESTIAL);
    const backs = backsIn(fieldOf('Duda'));
    expect(backs.length).toBeGreaterThan(0);
    for (const back of backs) expect(back).toHaveAttribute('data-verso-deck', 'celestial');
    expect(portraitImage('voce')).toHaveAttribute('src', portrait);
    expect(portraitImage('oponente')).toBeNull();
    expect(portraitOf('oponente').querySelector('svg')).not.toBeNull();
  });

  it('a mesma sala vista do p2: o contrário', async () => {
    await allPacks();
    const base = connect({ ...MINE, me: 'p2' }, { room: { seats: SEATS_WITH_LOOKS }, playerId: 'p2' });
    render(<PlayTable session={base.session} />);
    expectFrom(srcs(myField()), CELESTIAL);
    // A sua mão é do Bufão: de cordel.
    expect(srcs(hand())).toEqual([]);
    const theirs = srcs(fieldOf('André'));
    expectFrom(theirs, BESTIARIO, EGIPCIO);
    expect(theirs.some((src) => BESTIARIO.has(src))).toBe(true);
    const backs = backsIn(fieldOf('André'));
    expect(backs.length).toBeGreaterThan(0);
    for (const back of backs) expect(back).toHaveAttribute('data-verso-deck', 'bestiario');
    expect(portraitImage('oponente')).toHaveAttribute('src', portrait);
    expect(portraitImage('voce')).toBeNull();
    expect(portraitOf('voce').querySelector('svg')).not.toBeNull();
  });

  it('a preferência não entra (H2): o seu lado é o do assento, e mudar a preferência no meio da partida não muda nada', async () => {
    await allPacks();
    const base = connect(MINE, {
      prefs: { look: CELESTIAL_EGIPCIO },
      room: { seats: [{ ...seatOf('p1', 'André'), look: BESTIARIO_EGIPCIO }, seatOf('p2', 'Duda')] },
    });
    render(<PlayTable session={base.session} />);
    const before = srcs(myField());
    expect(before.some((src) => BESTIARIO.has(src))).toBe(true);
    expect(before.some((src) => CELESTIAL.has(src))).toBe(false);
    act(() => base.session.setPrefs({ ...base.session.snapshot().prefs, look: CELESTIAL_BUFAO }));
    expect(srcs(myField())).toEqual(before);
    // O lado de Duda (sem look no assento) segue em cordel.
    expect(srcs(fieldOf('Duda'))).toEqual([]);
  });

  it('o assento sem look é o Cordel, sem pedir pacote nenhum e sem nada no console', () => {
    const calls = { bestiario: 0, celestial: 0, egipcio: 0 };
    resetPacks({
      bestiario: () => (calls.bestiario++, Promise.resolve({ urls: bestiario })),
      celestial: () => (calls.celestial++, Promise.resolve({ urls: celestial })),
      egipcio: () => (calls.egipcio++, Promise.resolve({ urls: egipcio, portrait })),
    });
    const errors = vi.spyOn(console, 'error');
    const warnings = vi.spyOn(console, 'warn');
    const base = connect(MINE, { prefs: { look: BESTIARIO_EGIPCIO } });
    const { container } = render(<PlayTable session={base.session} />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(calls).toEqual({ bestiario: 0, celestial: 0, egipcio: 0 });
    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
  });

  it('a mensagem room de presença (o outro caiu) não troca a imagem nem pede pacote de novo', async () => {
    const calls = { bestiario: 0, celestial: 0, egipcio: 0 };
    resetPacks({
      bestiario: () => (calls.bestiario++, Promise.resolve({ urls: bestiario })),
      celestial: () => (calls.celestial++, Promise.resolve({ urls: celestial })),
      egipcio: () => (calls.egipcio++, Promise.resolve({ urls: egipcio, portrait })),
    });
    await allPacks();
    const base = connect(MINE, { room: { seats: SEATS_WITH_LOOKS } });
    render(<PlayTable session={base.session} />);
    const img = myField().querySelector('[data-card-id] img');
    expect(img).not.toBeNull();
    const room = base.connection.room!;
    act(() =>
      base.connection.emitRoom({
        ...room,
        seats: room.seats.map((seat) => (seat.playerId === 'p2' ? { ...seat, connected: false, woAt: 99_000 } : { ...seat })),
      }),
    );
    expect(myField().querySelector('[data-card-id] img')).toBe(img);
    expect(calls).toEqual({ bestiario: 1, celestial: 1, egipcio: 1 });
  });

  it('o axe limpo na mesa online com os dois decks', async () => {
    await allPacks();
    const base = connect(MINE, { room: { seats: SEATS_WITH_LOOKS } });
    const { container } = render(<PlayTable session={base.session} />);
    vi.useRealTimers();
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('as aparências da mesa, memoizadas pelo conteúdo', () => {
  type Props = { mode: TableLooksMode; preferred: Look; seats: readonly Pick<SeatInfo, 'playerId' | 'look'>[] | undefined; me?: PlayerId; opponent?: PlayerId };
  const hook = (initial: Props) =>
    renderHook((props: Props) => useTableLooks(props.mode, props.preferred, props.seats, props.me, props.opponent), { initialProps: initial });

  it('online: um seats novo com as mesmas aparências devolve o mesmo objeto; outra aparência, um objeto novo', () => {
    const seats = (look: Look) => [
      { playerId: 'p1' as const, look: { ...BESTIARIO_EGIPCIO } },
      { playerId: 'p2' as const, look: { ...look } },
    ];
    const { result, rerender } = hook({ mode: 'online', preferred: DEFAULT_LOOK, seats: seats(CELESTIAL_BUFAO), me: 'p1', opponent: 'p2' });
    const first = result.current;
    expect(first).toEqual({
      mine: BESTIARIO_EGIPCIO,
      owners: { p1: BESTIARIO_EGIPCIO, p2: CELESTIAL_BUFAO },
      recorded: { me: BESTIARIO_EGIPCIO, opponent: CELESTIAL_BUFAO },
    });
    rerender({ mode: 'online', preferred: CELESTIAL_EGIPCIO, seats: seats(CELESTIAL_BUFAO), me: 'p1', opponent: 'p2' });
    expect(result.current).toBe(first);
    rerender({ mode: 'online', preferred: DEFAULT_LOOK, seats: seats(CELESTIAL_EGIPCIO), me: 'p1', opponent: 'p2' });
    expect(result.current).not.toBe(first);
    expect(result.current!.owners.p2).toEqual(CELESTIAL_EGIPCIO);
  });

  it('online sem look nos assentos: o padrão dos dois lados, sem nada gravado', () => {
    const { result } = hook({ mode: 'online', preferred: BESTIARIO_EGIPCIO, seats: [{ playerId: 'p1' }, { playerId: 'p2' }], me: 'p1', opponent: 'p2' });
    expect(result.current).toEqual({ mine: DEFAULT_LOOK, owners: { p1: DEFAULT_LOOK, p2: DEFAULT_LOOK }, recorded: undefined });
  });

  it('o treino como antes: a sua da preferência e a do bot; o Cordel não grava', () => {
    const { result, rerender } = hook({ mode: 'training', preferred: BESTIARIO_EGIPCIO, seats: undefined, me: 'p1', opponent: 'p2' });
    expect(result.current).toEqual({
      mine: BESTIARIO_EGIPCIO,
      owners: { p1: BESTIARIO_EGIPCIO, p2: CELESTIAL_EGIPCIO },
      recorded: { me: BESTIARIO_EGIPCIO, opponent: CELESTIAL_EGIPCIO },
    });
    const first = result.current;
    rerender({ mode: 'training', preferred: { ...BESTIARIO_EGIPCIO }, seats: undefined, me: 'p1', opponent: 'p2' });
    expect(result.current).toBe(first);
    rerender({ mode: 'training', preferred: DEFAULT_LOOK, seats: undefined, me: 'p1', opponent: 'p2' });
    expect(result.current!.recorded).toBeUndefined();
  });

  it('o tutorial, e a mesa sem estado ainda: nenhuma', () => {
    expect(hook({ mode: 'none', preferred: BESTIARIO_EGIPCIO, seats: undefined, me: 'p1', opponent: 'p2' }).result.current).toBeNull();
    expect(hook({ mode: 'online', preferred: DEFAULT_LOOK, seats: [], me: undefined, opponent: undefined }).result.current).toBeNull();
  });
});

describe('o menu da partida (H3)', () => {
  it('no online, sem o seletor e com a linha da aparência fixa', async () => {
    const base = connect(MINE, { room: { seats: SEATS_WITH_LOOKS } });
    render(<PlayTable session={base.session} />);
    await base.user.click(menuButton());
    expect(screen.queryByRole('group', { name: 'Deck' })).toBeNull();
    expect(screen.getByText(LOOK_ROOM_FIXED)).toBeInTheDocument();
  });

  it('no treino, o seletor e nenhuma linha', async () => {
    const base = connect(MINE);
    render(<PlayTable session={base.session} training="medio" />);
    await base.user.click(menuButton());
    expect(screen.getByRole('group', { name: 'Deck' })).toBeInTheDocument();
    expect(screen.queryByText(LOOK_ROOM_FIXED)).toBeNull();
  });
});

describe('a partida online guardada (H5)', () => {
  function finishWith(seats: RoomMessage['seats']) {
    const base = connect(THEIRS, { room: { seats } });
    const store = memoryStore();
    render(<PlayTable session={base.session} store={store} onNewRoom={() => undefined} />);
    act(() =>
      base.connection.emitRoom(
        roomMessage({
          status: 'FINISHED',
          gameNo: 1,
          seats,
          score: { p1: 1, p2: 0 },
          outcome: { gameNo: 1, result: { kind: 'WIN', winner: 'p1', reason: 'HP' }, cause: 'NORMAL' },
        }),
      ),
    );
    return loadPastGames(store);
  }

  it('leva as aparências dos assentos do fim, vistas de quem guardou', () => {
    const rows = finishWith(SEATS_WITH_LOOKS);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.looks).toEqual({ me: BESTIARIO_EGIPCIO, opponent: CELESTIAL_BUFAO });
  });

  it('só um fora do padrão: as duas, com o padrão do outro lado', () => {
    const rows = finishWith([seatOf('p1', 'André'), { ...seatOf('p2', 'Duda'), look: CELESTIAL_EGIPCIO }]);
    expect(rows[0]!.looks).toEqual({ me: DEFAULT_LOOK, opponent: CELESTIAL_EGIPCIO });
  });

  it('os dois sem look: a linha de hoje, sem aparências', () => {
    const rows = finishWith([seatOf('p1', 'André'), seatOf('p2', 'Duda')]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('looks');
  });
});
