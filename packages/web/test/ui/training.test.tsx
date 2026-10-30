// Treino contra o bot (spec §2.6, §12): `/treino` monta a mesa sobre uma `LocalRoom`, sem servidor e sem relógio. O bot joga
// por timers, então os testes usam timers falsos; a semente é fixa (`?semente=`), para a partida ser sempre a mesma.
//
// O módulo da sala local é importado aqui, no topo, antes de qualquer timer falso: o `import()` da tela então sai do cache
// de módulos na hora, em vez de depender do carregador com o relógio parado.
import { equipLeftText } from '../../src/model/copy.ts';
import { legalActions, RULES_VERSION } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { TUTORIAL_SEED } from '@coringa/sim/tutorial';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { openStore } from '../../src/app/browser-store.ts';
import { getDiagnosticContext } from '../../src/app/diagnostic-context.ts';
import { navigate } from '../../src/app/router.ts';
import * as localRoomModule from '../../src/model/local-room.ts';
import { loadPastGames } from '../../src/model/past-games.ts';
import { Training, type LocalRoomModule } from '../../src/ui/screens/Training.tsx';
import { fakeApi, memoryStore, seriousViolations } from './support.tsx';

/** A semente fixa e o nível Médio na URL: o `?nivel=` pula a escolha, e a mesa dos testes nasce direto. */
const SEED = '?semente=t1&nivel=medio';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  // Toda tela de treino dos testes nasce com a semente fixa: sem `?semente=` a partida seria sorteada (e, em cerca de 1% delas,
  // o jogador não recebe numéricas e o Equipar dele sai sozinho). Quem testa o sorteio troca a URL e o `crypto`. Sem `?nivel=`
  // a tela pergunta o nível antes da mesa: quem testa a escolha também troca a URL.
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

/** Uma `load` que guarda as salas criadas e o nível de cada uma (a tela não os expõe). Tem que ser estável: é dependência do efeito. */
function capture() {
  const rooms: localRoomModule.LocalRoom[] = [];
  const levels: Array<localRoomModule.TrainingLevel | undefined> = [];
  class Spy extends localRoomModule.LocalRoom {
    constructor(options: localRoomModule.LocalRoomOptions) {
      super(options);
      rooms.push(this);
      levels.push(options.level);
    }
  }
  const load = (): Promise<LocalRoomModule> => Promise.resolve({ ...localRoomModule, LocalRoom: Spy });
  return { rooms, levels, load };
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
  it('abre com "Preparando o treino…" e logo desenha a mesa contra o Bot, com a faixa "Treino · Médio, sem relógio"', async () => {
    fakeClock();
    window.history.replaceState(null, '', `/treino${SEED}`);
    render(<App api={fakeApi()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparando o treino…');
    await settle();

    expect(screen.queryByText('Preparando o treino…')).not.toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Campo de Bot' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Seu campo' })).toBeInTheDocument();
    expect(band().getByText('Treino · Médio, sem relógio')).toBeInTheDocument();
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
    expect(equipPanel().getByText(equipLeftText(placed.length))).toBeInTheDocument();

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
    expect(await hands('?semente=outra&nivel=medio')).not.toEqual(first);
  });

  it('sem semente na URL, a partida é sorteada pelo navegador', async () => {
    fakeClock();
    // Sorteio fixo, como todo o aleatório dos testes: a mesma entrada de `crypto` dá a mesma partida.
    const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
      array[0] = 123_456_789;
      return array;
    }) as typeof crypto.getRandomValues);
    const { rooms, load } = capture();
    window.history.replaceState(null, '', '/treino?nivel=medio');
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    expect(rooms).toHaveLength(1);
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(rooms[0]!.room?.status).toBe('PLAYING');
  });
});

describe('/treino: a escolha do nível', () => {
  // O nome do botão é o nível e a linha (WCAG 2.5.3); aqui se acha pelo começo.
  const levelButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
  const choose = async (search = '?semente=t1', store = memoryStore()) => {
    const clock = fakeClock();
    const captured = capture();
    window.history.replaceState(null, '', `/treino${search}`);
    const view = render(<Training store={store} load={captured.load} />);
    await settle();
    return { ...clock, ...captured, store, view };
  };

  it('sem ?nivel=, a escolha vem antes da mesa: três botões com uma linha cada, o Médio focado, e nada de sala nem de timer', async () => {
    const { rooms, advance } = await choose();
    expect(screen.getByRole('heading', { name: 'Treino' })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: 'Nível do bot' });
    // Do mais fácil ao mais difícil, cada um com a sua linha, e o padrão (Médio) é o que vem focado.
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Fácil Erra bastante: bom para aprender',
      'Médio Pensa só na jogada da vez',
      'Difícil Pensa nas próximas rodadas',
    ]);
    expect(levelButton('Fácil')).toHaveAccessibleName('Fácil Erra bastante: bom para aprender');
    expect(levelButton('Médio')).toHaveAccessibleName('Médio Pensa só na jogada da vez');
    expect(levelButton('Difícil')).toHaveAccessibleName('Difícil Pensa nas próximas rodadas');
    expect(levelButton('Médio')).toHaveFocus();
    expect(screen.queryByRole('main', { name: 'Mesa' })).not.toBeInTheDocument();
    expect(screen.queryByText('Preparando o treino…')).not.toBeInTheDocument();
    expect(rooms).toHaveLength(0);
    // Só sobra o que o próprio React agendou: passado o tempo, não há bot nem relógio nenhum.
    advance(10_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('o último nível escolhido (coringa:nivel) vem focado; um valor que não é nível volta ao Médio', async () => {
    const saved = memoryStore();
    saved.set('coringa:nivel', 'dificil');
    const first = await choose('?semente=t1', saved);
    expect(levelButton('Difícil')).toHaveFocus();
    first.view.unmount();

    const broken = memoryStore();
    broken.set('coringa:nivel', 'impossivel');
    await choose('?semente=t1', broken);
    expect(levelButton('Médio')).toHaveFocus();
  });

  it.each([
    ['Fácil', 'facil'],
    ['Médio', 'medio'],
    ['Difícil', 'dificil'],
  ] as const)('escolher "%s" grava coringa:nivel, abre a mesa com a sala nesse nível e a faixa o diz', async (name, level) => {
    const { user, rooms, levels, store } = await choose();
    await user.click(levelButton(name));
    expect(store.get('coringa:nivel')).toBe(level);
    expect(rooms).toHaveLength(1);
    expect(levels).toEqual([level]);
    expect(screen.queryByRole('group', { name: 'Nível do bot' })).not.toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(band().getByText(`Treino · ${name}, sem relógio`)).toBeInTheDocument();
  });

  it('a vida inicial (sub-projeto 5): 500 vem marcada; a escolhida vale na sala, e ?vida= já a marca', async () => {
    const { user, rooms } = await choose();
    const group = screen.getByRole('group', { name: 'Vida inicial' });
    expect(within(group).getByRole('radio', { name: '500 · padrão' })).toBeChecked();
    await user.click(within(group).getByRole('radio', { name: '300' }));
    await user.click(levelButton('Fácil'));
    expect(rooms[0]!.state!.view.self.hp).toBe(300);
  });

  it('?vida= vem marcada na escolha', async () => {
    await choose('?vida=800');
    expect(within(screen.getByRole('group', { name: 'Vida inicial' })).getByRole('radio', { name: '800' })).toBeChecked();
  });

  it('o Enter no botão focado escolhe o nível (teclado)', async () => {
    const { user, levels, store } = await choose();
    expect(levelButton('Médio')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(levels).toEqual(['medio']);
    expect(store.get('coringa:nivel')).toBe('medio');
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
  });

  it('a semente da URL vale depois da escolha: a mesma mão de abrir direto com ?nivel=', async () => {
    const { user, rooms, view } = await choose('?semente=t1');
    await user.click(levelButton('Fácil'));
    const hand = rooms[0]!.state!.view.self.pending.map((card) => card.id);
    view.unmount();
    vi.useRealTimers();

    const direct = await choose('?semente=t1&nivel=facil');
    expect(direct.rooms[0]!.state!.view.self.pending.map((card) => card.id)).toEqual(hand);
  });

  it('?nivel=dificil vai direto à mesa, sem a escolha e sem mexer no nível guardado', async () => {
    const store = memoryStore();
    const { rooms, levels } = await choose('?semente=t1&nivel=dificil', store);
    expect(screen.queryByRole('group', { name: 'Nível do bot' })).not.toBeInTheDocument();
    expect(levels).toEqual(['dificil']);
    expect(rooms).toHaveLength(1);
    expect(band().getByText('Treino · Difícil, sem relógio')).toBeInTheDocument();
    expect(store.get('coringa:nivel')).toBeNull();
  });

  it('um ?nivel= que não é nível cai na escolha', async () => {
    const { rooms } = await choose('?semente=t1&nivel=impossivel');
    expect(screen.getByRole('group', { name: 'Nível do bot' })).toBeInTheDocument();
    expect(rooms).toHaveLength(0);
  });

  it('"Voltar ao início", na escolha, volta ao início sem criar sala', async () => {
    const { user, rooms } = await choose();
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(window.location.pathname).toBe('/');
    expect(rooms).toHaveLength(0);
  });

  it('sair da escolha (a tela desmonta) não deixa sala nem timer', async () => {
    const { rooms, view, advance } = await choose();
    view.unmount();
    advance(10_000);
    expect(rooms).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no modo estrito, a escolha aparece uma vez e a sala escolhida é uma só', async () => {
    fakeClock();
    const { rooms, load } = capture();
    window.history.replaceState(null, '', '/treino?semente=t1');
    const user = userEvent.setup({ advanceTimers: (ms) => act(() => void vi.advanceTimersByTime(ms)) });
    render(
      <StrictMode>
        <Training store={memoryStore()} load={load} />
      </StrictMode>,
    );
    await settle();
    expect(screen.getAllByRole('group', { name: 'Nível do bot' })).toHaveLength(1);
    await user.click(levelButton('Fácil'));
    expect(rooms).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
  });

  it('uma exceção ao criar a sala escolhida cai na tela de falha, sem timer', async () => {
    const clock = fakeClock();
    class Broken extends localRoomModule.LocalRoom {
      constructor(options: localRoomModule.LocalRoomOptions) {
        super(options);
        throw new Error('boom');
      }
    }
    const load = (): Promise<LocalRoomModule> => Promise.resolve({ ...localRoomModule, LocalRoom: Broken });
    window.history.replaceState(null, '', '/treino?semente=t1');
    render(<Training store={memoryStore()} load={load} />);
    await settle();
    await clock.user.click(levelButton('Fácil'));
    expect(screen.getByRole('heading', { name: 'Não deu para carregar o treino' })).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a revanche mantém o nível e a faixa e o menu seguem dizendo o nível', async () => {
    const { user, advance, rooms, levels } = await choose();
    await user.click(levelButton('Difícil'));
    advance(5_000);
    await user.click(menuButton());
    const menu = within(screen.getByRole('dialog', { name: 'Menu da partida' }));
    expect(menu.getByText('Treino · Difícil')).toBeInTheDocument();
    await user.click(menu.getByRole('button', { name: 'Desistir' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
    advance(5_000);
    await user.click(within(screen.getByRole('dialog', { name: 'Bot venceu' })).getByRole('button', { name: 'Revanche' }));
    advance(5_000);
    expect(rooms[0]!.room).toMatchObject({ status: 'PLAYING', gameNo: 2 });
    expect(levels).toEqual(['dificil']);
    expect(band().getByText('Treino · Difícil, sem relógio')).toBeInTheDocument();
  });

  it('o menu do treino diz "Treino · Médio"', async () => {
    const { user } = await choose('?semente=t1&nivel=medio');
    await user.click(menuButton());
    expect(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByText('Treino · Médio')).toBeInTheDocument();
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
    expect(JSON.parse(store.get('coringa:prefs')!)).toEqual({ autoPass, reduceMotion: true, sound: true });
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
    expect(equipPanel().getByText(equipLeftText(total - 1))).toBeInTheDocument();
    expect(equipPanel().queryByText(/Você já confirmou|Esperando/)).not.toBeInTheDocument();
  });
});

describe('/treino: a ordem automática segue valendo (só o tutorial a desliga)', () => {
  it('com a iniciativa na rodada 3 (a semente do tutorial), a barra de 3 s aparece e "Atacar primeiro" sai sozinho', async () => {
    const { advance, user } = fakeClock();
    window.history.replaceState(null, '', `/treino?semente=${TUTORIAL_SEED}&nivel=facil`);
    render(<App api={fakeApi()} />);
    await settle();
    await equipByUi(user);
    advance(2_000);
    await equipByUi(user);
    advance(2_000);
    const order = screen.getByRole('region', { name: 'Escolha da ordem' });
    expect(order.querySelector('[data-auto-barra]')).not.toBeNull();
    expect(within(order).getByText(/sai sozinho/)).toBeInTheDocument();
    expect(within(order).queryByText(/Escolha quando quiser/)).not.toBeInTheDocument();
    advance(6_000);
    expect(screen.queryByRole('region', { name: 'Escolha da ordem' })).not.toBeInTheDocument();
  });

  it('depois de o jogador interagir com o painel, o texto é "Escolha quando quiser." (sem prazo, sem falar em prazo)', async () => {
    const { advance, user } = fakeClock();
    window.history.replaceState(null, '', `/treino?semente=${TUTORIAL_SEED}&nivel=facil`);
    render(<App api={fakeApi()} />);
    await settle();
    await equipByUi(user);
    advance(2_000);
    await equipByUi(user);
    advance(2_000);
    await user.click(screen.getByRole('region', { name: 'Escolha da ordem' }));
    const order = within(screen.getByRole('region', { name: 'Escolha da ordem' }));
    expect(order.getByText('Escolha quando quiser.')).toBeInTheDocument();
    expect(order.queryByText(/prazo/)).not.toBeInTheDocument();
    advance(60_000);
    expect(screen.getByRole('region', { name: 'Escolha da ordem' })).toBeInTheDocument();
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
    expect(room.room).toMatchObject({ status: 'PLAYING', gameNo: 2, score: { p1: 0, p2: 1 } });
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

describe('/treino: diagnóstico e desistência', () => {
  it('o diagnóstico leva a semente, o nível e o número da partida: a partida 2 usa <semente>-2, que abre a mesma partida', async () => {
    const { advance, user } = fakeClock();
    const view = render(<Training store={memoryStore()} load={capture().load} />);
    await settle();
    advance(5_000);
    expect(getDiagnosticContext().code).toBe('TREINO, semente t1, nivel medio, partida 1');

    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Desistir' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
    advance(5_000);
    await user.click(within(screen.getByRole('dialog', { name: 'Bot venceu' })).getByRole('button', { name: 'Revanche' }));
    advance(5_000);
    expect(getDiagnosticContext().code).toBe('TREINO, semente t1-2, nivel medio, partida 2');

    view.unmount();
    expect(getDiagnosticContext().code).toBeNull();
  });

  it('o nível do diagnóstico é o valor da URL (nivel=dificil), o que se cola em /treino?semente=…&nivel=…', async () => {
    fakeClock();
    window.history.replaceState(null, '', '/treino?semente=t1&nivel=dificil');
    render(<Training store={memoryStore()} load={capture().load} />);
    await settle();
    expect(getDiagnosticContext().code).toBe('TREINO, semente t1, nivel dificil, partida 1');
  });

  it('desistir no treino não fala em W.O.: não há ninguém para dar a vitória por ausência', async () => {
    const { user } = fakeClock();
    render(<Training store={memoryStore()} load={capture().load} />);
    await settle();
    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Desistir' }));
    const confirm = screen.getByRole('dialog', { name: 'Desistir da partida?' });
    expect(within(confirm).getByText('Você perde esta partida.')).toBeInTheDocument();
    expect(confirm).not.toHaveTextContent('W.O.');
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

describe('/treino: a partida terminada vai para a lista', () => {
  /** Desiste pelo menu (o treino acaba com o Bot vencendo) e deixa o `room` em FINISHED chegar. */
  async function concede(user: ReturnType<typeof fakeClock>['user'], advance: (ms: number) => void) {
    advance(5_000);
    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Desistir' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
    advance(5_000);
    expect(screen.getByRole('dialog', { name: 'Bot venceu' })).toBeInTheDocument();
  }
  const saved = () => loadPastGames(openStore('local').store);

  it('grava uma linha com o replay da partida, e "Rever a partida" leva a /partidas/<id>', async () => {
    const { advance, user } = fakeClock();
    render(<App api={fakeApi()} />);
    await settle();
    expect(saved()).toEqual([]);

    await concede(user, advance);
    const [row, ...others] = saved();
    expect(others).toEqual([]);
    expect(row).toMatchObject({
      mode: { kind: 'training', level: 'medio' },
      seat: 'p1',
      names: { me: 'Você', opponent: 'Bot' },
      outcome: { gameNo: 1, result: { kind: 'WIN', winner: 'p2', reason: 'FORFEIT' }, cause: 'CONCEDE' },
      score: { p1: 0, p2: 1 },
      rulesVersion: RULES_VERSION,
      replay: { name: 'treino-t1', seed: 't1', players: ['p1', 'p2'] },
    });
    expect(row).not.toHaveProperty('key');
    expect(row!.replay!.steps.length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Rever a partida' }));
    expect(window.location.pathname).toBe(`/partidas/${row!.id}`);
    await settle();
    expect(screen.getByRole('link', { name: 'Voltar à lista' })).toBeInTheDocument();
  });

  it('sob <StrictMode> grava uma só linha', async () => {
    const { advance, user } = fakeClock();
    render(
      <StrictMode>
        <App api={fakeApi()} />
      </StrictMode>,
    );
    await settle();
    await concede(user, advance);
    expect(saved()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Rever a partida' })).toBeInTheDocument();
  });

  it('duas sessões de treino seguidas na mesma página (as duas TREINO, partida 1) gravam duas linhas', async () => {
    const { advance, user } = fakeClock();
    render(<App api={fakeApi()} />);
    await settle();
    await concede(user, advance);
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(window.location.pathname).toBe('/');

    act(() => navigate(`/treino${SEED}`));
    await settle();
    await concede(user, advance);

    const rows = saved();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.outcome.gameNo)).toEqual([1, 1]);
    expect(rows.map((row) => row.mode)).toEqual([
      { kind: 'training', level: 'medio' },
      { kind: 'training', level: 'medio' },
    ]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
    expect(rows.every((row) => row.replay !== undefined)).toBe(true);
  });

  it('a revanche é outra linha, com o replay da sua própria partida', async () => {
    const { advance, user } = fakeClock();
    render(<App api={fakeApi()} />);
    await settle();
    await concede(user, advance);
    await user.click(within(screen.getByRole('dialog', { name: 'Bot venceu' })).getByRole('button', { name: 'Revanche' }));
    await concede(user, advance);

    const rows = saved();
    expect(rows.map((row) => row.outcome.gameNo)).toEqual([2, 1]);
    expect(rows.map((row) => row.replay?.seed)).toEqual(['t1-2', 't1']);
    expect(rows[0]!.score).toEqual({ p1: 0, p2: 2 });
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

  it('axe: a escolha do nível não tem violações sérias', async () => {
    window.history.replaceState(null, '', '/treino?semente=t1');
    const { container } = render(<App api={fakeApi()} />);
    await screen.findByRole('group', { name: 'Nível do bot' });
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: a tela de falha não tem violações sérias', async () => {
    const load = () => Promise.reject<LocalRoomModule>(new Error('sem rede'));
    const { container } = render(<Training store={memoryStore()} load={load} />);
    await screen.findByRole('heading', { name: 'Não deu para carregar o treino' });
    expect(await seriousViolations(container)).toEqual([]);
  });
});
