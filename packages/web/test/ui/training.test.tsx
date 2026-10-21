// Treino contra o bot (spec §2.6, §12): `/treino` monta a mesa sobre uma `LocalRoom`, sem servidor e sem relógio. O bot joga
// por timers, então os testes usam timers falsos; a semente é fixa (`?semente=`), para a partida ser sempre a mesma.
//
// O módulo da sala local é importado aqui, no topo, antes de qualquer timer falso: o `import()` da tela então sai do cache
// de módulos na hora, em vez de depender do carregador com o relógio parado.
import { legalActions } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { navigate } from '../../src/app/router.ts';
import * as localRoomModule from '../../src/model/local-room.ts';
import { Training, type LocalRoomModule } from '../../src/ui/screens/Training.tsx';
import { fakeApi, memoryStore, seriousViolations } from './support.tsx';

const SEED = '?semente=t1';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Toda tela de treino dos testes nasce com a semente fixa: sem `?semente=` a partida seria sorteada (e, em cerca de 1% delas,
  // o jogador não recebe numéricas e o Equipar dele sai sozinho). Quem testa o sorteio troca a URL e o `crypto`.
  window.history.replaceState(null, '', `/treino${SEED}`);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

/** Timers falsos, com o `jest` global que a Testing Library e o user-event usam para andar o relógio dentro do `act`. */
function fakeClock() {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  const advance = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };
  vi.stubGlobal('jest', { advanceTimersByTime: advance });
  return { advance, user: userEvent.setup({ advanceTimers: advance }) };
}

/** Deixa o `import()` dinâmico e a criação da sala acontecerem. */
const settle = () => act(async () => vi.dynamicImportSettled());

/** Uma `load` que guarda as salas criadas (a tela não as expõe). Tem que ser estável: é dependência do efeito. */
function capture() {
  const rooms: localRoomModule.LocalRoom[] = [];
  class Spy extends localRoomModule.LocalRoom {
    constructor(options: localRoomModule.LocalRoomOptions) {
      super(options);
      rooms.push(this);
    }
  }
  const load = (): Promise<LocalRoomModule> => Promise.resolve({ ...localRoomModule, LocalRoom: Spy });
  return { rooms, load };
}

async function openTraining(search = SEED) {
  window.history.replaceState(null, '', `/treino${search}`);
  const rendered = render(<App api={fakeApi()} />);
  await settle();
  return rendered;
}

const band = () => within(screen.getByRole('region', { name: 'Situação da rodada' }));
const equipPanel = () => within(screen.getByRole('region', { name: 'Equipar' }));
const live = () => document.querySelector('[aria-live="assertive"]') as HTMLElement;
const menuButton = () => screen.getAllByRole('button', { name: 'Menu da partida' })[0]!;

/** Equipar pela interface: o primeiro destino de cada carta e Confirmar. */
async function equipByUi(user: ReturnType<typeof fakeClock>['user']) {
  for (let i = 0; i < 8; i++) {
    const list = equipPanel().queryByRole('list', { name: 'Destinos' });
    if (list === null) break;
    await user.click(within(list).getAllByRole('button')[0]!);
  }
  await user.click(equipPanel().getByRole('button', { name: 'Confirmar' }));
}

describe('/treino', () => {
  it('abre com "Preparando o treino…" e logo desenha a mesa contra o Bot, com a faixa "Treino, sem relógio"', async () => {
    fakeClock();
    window.history.replaceState(null, '', `/treino${SEED}`);
    render(<App api={fakeApi()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparando o treino…');
    await settle();

    expect(screen.queryByText('Preparando o treino…')).not.toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Campo de Bot' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Seu campo' })).toBeInTheDocument();
    expect(band().getByText('Treino, sem relógio')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText('Tempo esgotado')).not.toBeInTheDocument();
  });

  it('a primeira jogada legal escolhida pela interface leva a um state novo', async () => {
    const { advance, user } = fakeClock();
    const { rooms, load } = capture();
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    expect(rooms).toHaveLength(1);
    const room = rooms[0]!;

    // O Equipar é simultâneo: o bot confirma o dele sozinho; a mesa espera o jogador, sem relógio nenhum.
    advance(5_000);
    const before = room.state!.seq;
    const placed = room.state!.view.self.pending.map((card) => card.id);
    expect(placed.length).toBeGreaterThan(0);
    expect(equipPanel().getByText(`Carta 1 de ${placed.length}`)).toBeInTheDocument();

    await equipByUi(user);
    // O state novo traz a jogada do jogador: as cartas que ele montou pela interface já estão nas suas fileiras.
    expect(room.state!.seq).toBeGreaterThan(before);
    expect(room.state!.events.length).toBeGreaterThan(0);
    const { attackRow, defenseRow } = room.state!.view.self;
    expect([...attackRow, ...defenseRow].map((card) => card.id)).toEqual(expect.arrayContaining(placed));
  });

  it('o bot joga sozinho depois de thinkMs (600 ms), sem esperar o jogador', async () => {
    const { advance } = fakeClock();
    const { rooms, load } = capture();
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    const room = rooms[0]!;
    const start = room.state!.seq;

    advance(599);
    expect(room.state!.seq).toBe(start);
    advance(1);
    expect(room.state!.seq).toBeGreaterThan(start);
    // O estado novo chegou à mesa: o campo do Bot já diz que ele terminou de montar.
    expect(room.state!.view.opponent.equipSubmitted).toBe(true);
  });

  it('a mesma semente dá a mesma mão; a semente vem da URL', async () => {
    const hands = async (search: string): Promise<string[]> => {
      fakeClock();
      const { rooms, load } = capture();
      window.history.replaceState(null, '', `/treino${search}`);
      const view = render(<Training store={memoryStore()} load={load} />);
      await settle();
      const mine = rooms[0]!.state!.view.self.pending.map((card) => card.id);
      view.unmount();
      vi.useRealTimers();
      return mine;
    };
    const first = await hands(SEED);
    expect(first.length).toBeGreaterThan(0);
    expect(await hands(SEED)).toEqual(first);
    expect(await hands('?semente=outra')).not.toEqual(first);
  });

  it('sem semente na URL, a partida é sorteada pelo navegador', async () => {
    fakeClock();
    // Sorteio fixo, como todo o aleatório dos testes: a mesma entrada de `crypto` dá a mesma partida.
    const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
      array[0] = 123_456_789;
      return array;
    }) as typeof crypto.getRandomValues);
    const { rooms, load } = capture();
    window.history.replaceState(null, '', '/treino');
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    expect(rooms).toHaveLength(1);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(rooms[0]!.room?.status).toBe('PLAYING');
  });
});

/** O jogador joga a primeira jogada legal (direto na sala) até abrir uma janela de reação em que só há `PASS`. */
async function playUntilPassOnlyWindow(room: localRoomModule.LocalRoom, advance: (ms: number) => void) {
  for (let i = 0; i < 300; i++) {
    const view = room.state!.view;
    const legal = legalActions(view);
    if (view.phase.kind === 'REACTION' && view.phase.responder === 'p1' && legal.length === 1 && legal[0]!.type === 'PASS') return;
    const mine =
      view.phase.kind === 'EQUIP'
        ? !view.self.equipSubmitted
        : view.phase.kind === 'ORDER_CHOICE' || view.phase.kind === 'ATTACK_MAIN'
          ? view.phase.player === 'p1'
          : view.phase.kind === 'REACTION' && view.phase.responder === 'p1';
    if (mine) await act(async () => void (await room.act(legal[0] as PlayerAction)));
    else advance(700);
  }
  throw new Error('a partida não abriu uma janela de reação em que só há PASS');
}

describe('/treino: o que o §2.6 exclui (passe automático e envio antecipado do Equipar)', () => {
  it('numa janela de reação em que só há PASS, nenhum PASS sai sozinho: o jogador passa à mão', async () => {
    const { advance, user } = fakeClock();
    const { rooms, load } = capture();
    // A chave ligada (padrão) não muda nada: no treino o passe automático não se aplica.
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    const room = rooms[0]!;
    await playUntilPassOnlyWindow(room, advance);

    const seq = room.state!.seq;
    advance(10_000);
    expect(room.state!.seq).toBe(seq);
    expect(room.state!.view.phase).toMatchObject({ kind: 'REACTION', responder: 'p1' });
    expect(screen.queryByText('Sem resposta possível; passando')).not.toBeInTheDocument();

    await user.click(within(screen.getByRole('region', { name: 'Ações' })).getByRole('button', { name: 'Passar' }));
    expect(room.state!.seq).toBeGreaterThan(seq);
  });

  it('o menu do treino não tem a chave "Passar sozinho"; a de movimento reduzido continua', async () => {
    const { user } = fakeClock();
    render(<Training store={memoryStore()} load={capture().load} />);
    await settle();
    await user.click(menuButton());
    const menu = within(screen.getByRole('dialog', { name: 'Menu da partida' }));
    expect(menu.queryByRole('switch', { name: /Passar sozinho/ })).not.toBeInTheDocument();
    expect(menu.getByRole('switch', { name: 'Reduzir animações' })).toBeInTheDocument();
  });

  it.each([true, false])('trocar "Reduzir animações" no treino não mexe no passe automático guardado (%s)', async (autoPass) => {
    const { user } = fakeClock();
    const store = memoryStore();
    store.set('coringa:prefs', JSON.stringify({ autoPass, reduceMotion: false }));
    render(<Training store={store} load={capture().load} />);
    await settle();
    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('switch', { name: 'Reduzir animações' }));
    expect(JSON.parse(store.get('coringa:prefs')!)).toEqual({ autoPass, reduceMotion: true });
  });

  it('com cartas já posicionadas no Equipar, o tempo passa e nada é enviado antes do Confirmar', async () => {
    const { advance, user } = fakeClock();
    const { rooms, load } = capture();
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    const room = rooms[0]!;
    advance(5_000);
    const before = room.state!.seq;
    const total = room.state!.view.self.pending.length;
    expect(total).toBeGreaterThan(1);

    await user.click(within(equipPanel().getByRole('list', { name: 'Destinos' })).getAllByRole('button')[0]!);
    advance(10 * 60_000);
    expect(room.state!.seq).toBe(before);
    expect(equipPanel().getByText(`Carta 2 de ${total}`)).toBeInTheDocument();
    expect(equipPanel().queryByText(/Você já confirmou|Esperando/)).not.toBeInTheDocument();
  });
});

describe('/treino: a vez do jogador é anunciada (spec §7), sem prazo', () => {
  it('"Monte suas cartas" no Equipar, sem segundos, e uma região só', async () => {
    const { advance } = fakeClock();
    await openTraining();
    advance(1);
    expect(document.querySelectorAll('[aria-live="assertive"]')).toHaveLength(1);
    expect(live().textContent).toBe('Monte suas cartas');
  });

  it('a próxima vez do jogador é anunciada de novo, num nó novo', async () => {
    const { advance, user } = fakeClock();
    const { rooms, load } = capture();
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    advance(5_000);
    const first = live().firstElementChild;
    expect(first).toHaveTextContent('Monte suas cartas');

    await equipByUi(user);
    advance(5_000);
    // Outra época: ou o Equipar seguinte, ou a fase de ataque, mas sempre anunciada, e com o texto de uma vez do jogador.
    expect(rooms[0]!.state!.epoch).toBeGreaterThan(1);
    expect(live().firstElementChild).not.toBe(first);
    expect(live().textContent).toMatch(/^(Monte suas cartas|Sua vez|Sua reação|Escolha a ordem)$/);
  });
});

describe('/treino: sair, fim e revanche', () => {
  it('"Sair do treino", no menu, volta ao início e fecha a sala: o bot para', async () => {
    const { advance, user } = fakeClock();
    window.history.replaceState(null, '', '/');
    render(<App api={fakeApi()} />);
    // Do início para o treino pela navegação do app, como o botão "Treinar contra o bot" faz.
    act(() => navigate(`/treino${SEED}`));
    await settle();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();

    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Sair do treino' }));
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Jogo do Coringa' })).toBeInTheDocument();
    // Nada ficou agendado: nem o bot, nem o relógio da mesa.
    advance(10_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('desistir mostra o fim com "Voltar ao início" (e não "Nova sala"); a revanche começa outra partida', async () => {
    const { advance, user } = fakeClock();
    const { rooms, load } = capture();
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    const room = rooms[0]!;
    advance(5_000);

    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Desistir' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
    advance(5_000);
    expect(room.room!.status).toBe('FINISHED');

    const end = screen.getByRole('dialog', { name: 'Bot venceu' });
    expect(within(end).getByText('Você desistiu')).toBeInTheDocument();
    expect(within(end).queryByRole('button', { name: 'Nova sala' })).not.toBeInTheDocument();
    expect(within(end).getByRole('button', { name: 'Voltar ao início' })).toBeInTheDocument();
    const firstSeed = room.state!.view.self.pending.map((card) => card.id);

    await user.click(within(end).getByRole('button', { name: 'Revanche' }));
    advance(5_000);
    expect(room.room).toMatchObject({ status: 'PLAYING', gameNo: 2, score: { p1: 0, p2: 1, draws: 0 } });
    expect(screen.queryByRole('dialog', { name: 'Bot venceu' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Equipar' })).toBeInTheDocument();
    // Outra semente (`<semente>-2`): outra partida.
    expect(room.state!.view.self.pending.map((card) => card.id)).not.toEqual(firstSeed);
  });

  it('"Voltar ao início", no painel de fim, volta ao início', async () => {
    const { advance, user } = fakeClock();
    window.history.replaceState(null, '', `/treino${SEED}`);
    render(<App api={fakeApi()} />);
    await settle();
    advance(5_000);
    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Desistir' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
    advance(5_000);
    await user.click(within(screen.getByRole('dialog', { name: 'Bot venceu' })).getByRole('button', { name: 'Voltar ao início' }));
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Jogo do Coringa' })).toBeInTheDocument();
  });
});

describe('/treino: a sala nasce e morre com a tela', () => {
  it('sair da tela fecha a sala: o bot deixa de jogar e a jogada seguinte é recusada', async () => {
    const { advance } = fakeClock();
    const { rooms, load } = capture();
    const view = render(<Training store={memoryStore()} load={load} />);
    await settle();
    const room = rooms[0]!;
    view.unmount();
    advance(10_000);
    // O timer do bot (600 ms) foi cancelado: nenhuma jogada, e nada mais agendado.
    expect(room.state!.seq).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    await expect(room.act({ type: 'END_TURN' })).resolves.toMatchObject({ ok: false, code: 'DISCONNECTED' });
  });

  it('o módulo que chega depois de a tela sair não cria sala, e nada fica agendado', async () => {
    fakeClock();
    let release!: (module: LocalRoomModule) => void;
    const load = () => new Promise<LocalRoomModule>((resolve) => (release = resolve));
    const { rooms, load: loaded } = capture();
    const view = render(<Training store={memoryStore()} load={load} />);
    view.unmount();
    release(await loaded());
    await settle();
    expect(rooms).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no modo estrito (monta, desmonta e monta) vive uma sala só', async () => {
    fakeClock();
    const { rooms, load } = capture();
    render(
      <StrictMode>
        <Training store={memoryStore()} load={load} />
      </StrictMode>,
    );
    await settle();
    expect(rooms).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    // A sala viva é a única: não foi fechada pelo efeito descartado (uma sala fechada recusa tudo com DISCONNECTED).
    const ack = await rooms[0]!.act({ type: 'END_TURN' });
    expect(ack).toMatchObject({ ok: false });
    expect(ack.ok === false && ack.code).not.toBe('DISCONNECTED');
  });

  it('as preferências do menu vêm do armazenamento: movimento reduzido ligado aparece ligado', async () => {
    const { user } = fakeClock();
    const store = memoryStore();
    store.set('coringa:prefs', JSON.stringify({ autoPass: true, reduceMotion: true }));
    render(<Training store={store} load={capture().load} />);
    await settle();
    await user.click(menuButton());
    expect(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('switch', { name: 'Reduzir animações' })).toBeChecked();
  });

  it.each(['o construtor da sala', 'o connect da sala'])(
    'uma exceção em %s cai na tela de falha, e a sala que chegou a nascer não deixa timer',
    async (where) => {
      fakeClock();
      class Broken extends localRoomModule.LocalRoom {
        constructor(options: localRoomModule.LocalRoomOptions) {
          super(options);
          if (where === 'o construtor da sala') throw new Error('boom');
        }

        override connect(): void {
          super.connect();
          throw new Error('boom');
        }
      }
      const load = (): Promise<LocalRoomModule> => Promise.resolve({ ...localRoomModule, LocalRoom: Broken });
      render(<Training store={memoryStore()} load={load} />);
      await settle();
      expect(screen.getByRole('heading', { name: 'Não deu para carregar o treino' })).toBeInTheDocument();
      expect(screen.queryByText('Preparando o treino…')).not.toBeInTheDocument();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('se o módulo não carrega, diz isso, recarrega ou volta ao início', async () => {
    const reload = vi.fn();
    const load = () => Promise.reject<LocalRoomModule>(new Error('sem rede'));
    const { user } = fakeClock();
    render(<Training store={memoryStore()} load={load} reload={reload} />);
    await settle();
    expect(screen.getByRole('heading', { name: 'Não deu para carregar o treino' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(reload).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(window.location.pathname).toBe('/');
  });
});

describe('/treino: acessibilidade', () => {
  it('axe: a mesa do treino não tem violações sérias', async () => {
    // O axe usa timers de verdade; o bot joga por eles (600 ms), e a mesa continua válida.
    window.history.replaceState(null, '', `/treino${SEED}`);
    const { container } = render(<App api={fakeApi()} />);
    await screen.findByRole('main', { name: 'Mesa' });
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: a tela de falha não tem violações sérias', async () => {
    const load = () => Promise.reject<LocalRoomModule>(new Error('sem rede'));
    const { container } = render(<Training store={memoryStore()} load={load} />);
    await screen.findByRole('heading', { name: 'Não deu para carregar o treino' });
    expect(await seriousViolations(container)).toEqual([]);
  });
});
