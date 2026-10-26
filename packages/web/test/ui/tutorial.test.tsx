// O tutorial (`/tutorial`, spec do polimento, fatia 4): a mesa do treino contra o Fácil na semente do tutorial, com o painel da dica
// e o contorno da zona. O bot joga por timers, então os testes usam timers falsos; a semente é a do tutorial, sempre a mesma partida.
//
// O módulo da sala local é importado aqui, no topo, antes de qualquer timer falso (como no `training.test.tsx`): o `import()` da tela
// sai do cache de módulos na hora. Os testes da tela passam o `load` (um `Spy` que guarda a sala e as opções); o da rota usa o `App`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TUTORIAL_SEED } from '@coringa/sim/tutorial';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { getDiagnosticContext } from '../../src/app/diagnostic-context.ts';
import * as localRoomModule from '../../src/model/local-room.ts';
import { loadTutorialState } from '../../src/model/storage.ts';
import { PC_QUERY } from '../../src/ui/table/History.tsx';
import Tutorial from '../../src/ui/screens/Tutorial.tsx';
import type { LocalRoomModule } from '../../src/ui/screens/local-game.tsx';
import { ATTACK_BUTTON, fakeApi, memoryStore, seriousViolations, startsWith } from './support.tsx';

const EQUIP_HINT = /^Suas numéricas vão para o campo na ordem em que saíram/;
const ORDER_HINT = /^Quem tem a iniciativa escolhe atacar primeiro ou em segundo/;
const ATTACK_HINT = /^Sua vez de atacar: o dano é o seu ATK menos a DEF do oponente/;
const BUFFS_HINT = /^Cada J soma 1 ao multiplicador do seu ataque/;
const END_HINT = /^A partida acaba quando um Coringa chega a 0 de vida/;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/tutorial');
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

/** Uma `load` que guarda as salas criadas e as opções de cada uma. Tem que ser estável: é dependência do efeito. */
function capture() {
  const rooms: localRoomModule.LocalRoom[] = [];
  const options: localRoomModule.LocalRoomOptions[] = [];
  class Spy extends localRoomModule.LocalRoom {
    constructor(opts: localRoomModule.LocalRoomOptions) {
      super(opts);
      rooms.push(this);
      options.push(opts);
    }
  }
  const load = (): Promise<LocalRoomModule> => Promise.resolve({ ...localRoomModule, LocalRoom: Spy });
  return { rooms, options, load };
}

/** Abre o tutorial direto (sem rota), com a sala observada. */
async function openTutorial(store = memoryStore()) {
  const clock = fakeClock();
  const captured = capture();
  const view = render(<Tutorial store={store} load={captured.load} />);
  await settle();
  return { ...clock, ...captured, store, view };
}

type User = ReturnType<typeof fakeClock>['user'];

const hintPanel = () => screen.getByRole('region', { name: 'Dica' });
const hint = () => within(hintPanel());
const equipPanel = () => within(screen.getByRole('region', { name: 'Equipar' }));
/** As zonas contornadas agora (o valor do `data-dica`), na ordem do documento. */
const outlined = () => [...document.querySelectorAll('[data-dica]')].map((el) => el.getAttribute('data-dica'));
const band = () => within(screen.getByRole('region', { name: 'Situação da rodada' }));

/** Equipar pela interface: o primeiro destino de cada carta e Confirmar. */
async function equipByUi(user: User) {
  for (let i = 0; i < 8; i++) {
    const list = equipPanel().queryByRole('list', { name: 'Destinos' });
    if (list === null) break;
    await user.click(within(list).getAllByRole('button')[0]!);
  }
  await user.click(equipPanel().getByRole('button', { name: 'Confirmar' }));
}

/** Os dois Equipares do começo (o bot confirma o dele sozinho), até a escolha da ordem. */
async function toOrder({ advance, user }: Pick<ReturnType<typeof fakeClock>, 'advance' | 'user'>) {
  await equipByUi(user);
  advance(2_000);
  await equipByUi(user);
  advance(2_000);
  expect(screen.getByRole('region', { name: 'Escolha da ordem' })).toBeInTheDocument();
}

/** Escolhe "Atacar primeiro" e deixa as batidas passarem: a vez de atacar. */
async function toAttack(clock: Pick<ReturnType<typeof fakeClock>, 'advance' | 'user'>) {
  await clock.user.click(screen.getByRole('button', { name: startsWith('Atacar primeiro') }));
  clock.advance(5_000);
  expect(screen.getByRole('button', { name: ATTACK_BUTTON })).toBeInTheDocument();
}

/** Desiste pelo menu: a partida acaba na hora, com a vitória do Bot. */
async function concede(clock: Pick<ReturnType<typeof fakeClock>, 'advance' | 'user'>) {
  await clock.user.click(screen.getAllByRole('button', { name: 'Menu da partida' })[0]!);
  const menu = within(screen.getByRole('dialog', { name: 'Menu da partida' }));
  await clock.user.click(menu.getByRole('button', { name: 'Desistir' }));
  await clock.user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
  clock.advance(5_000);
  expect(screen.getByRole('dialog', { name: 'Bot venceu' })).toBeInTheDocument();
}

describe('/tutorial: a rota e a partida', () => {
  it('abre por import() sob demanda, com "Carregando…" até a tela chegar, e desenha a mesa com a faixa "Tutorial, sem relógio"', async () => {
    fakeClock();
    render(<App api={fakeApi()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    await settle();
    expect(await screen.findByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Campo de Bot' })).toBeInTheDocument();
    expect(band().getByText('Tutorial, sem relógio')).toBeInTheDocument();
    expect(screen.queryByText(/^Treino/)).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('a primeira partida é a da semente do tutorial contra o Fácil, mesmo com ?semente= e ?nivel= na URL', async () => {
    window.history.replaceState(null, '', '/tutorial?semente=outra&nivel=dificil');
    const { rooms, options } = await openTutorial();
    expect(rooms).toHaveLength(1);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ seed: TUTORIAL_SEED, level: 'facil' });
    // É a mesma mão de um treino aberto direto na semente do tutorial.
    const direct = new localRoomModule.LocalRoom({ seed: TUTORIAL_SEED, level: 'facil', now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
    direct.connect();
    expect(rooms[0]!.state!.view.self.pending.map((card) => card.id)).toEqual(direct.state!.view.self.pending.map((card) => card.id));
    direct.close();
  });

  it('o menu da partida diz "Tutorial", e o diagnóstico leva a semente do tutorial', async () => {
    const { user } = await openTutorial();
    await user.click(screen.getAllByRole('button', { name: 'Menu da partida' })[0]!);
    expect(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByText('Tutorial')).toBeInTheDocument();
    expect(getDiagnosticContext()?.code).toBe(`TUTORIAL, semente ${TUTORIAL_SEED}, nivel facil, partida 1`);
  });

  it('o import da sala local que não chega mostra a falha, com "Recarregar" e "Voltar ao início", e não deixa timer', async () => {
    const { user } = fakeClock();
    const reload = vi.fn();
    render(<Tutorial store={memoryStore()} load={() => Promise.reject<LocalRoomModule>(new Error('sem rede'))} reload={reload} />);
    await settle();
    expect(screen.getByRole('heading', { name: 'Não deu para carregar o tutorial' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(reload).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(window.location.pathname).toBe('/');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no modo estrito a sala é uma só, e sair da tela solta a sala: o bot não joga mais', async () => {
    const { advance } = fakeClock();
    const { rooms, load } = capture();
    const view = render(
      <StrictMode>
        <Tutorial store={memoryStore()} load={load} />
      </StrictMode>,
    );
    await settle();
    expect(screen.getAllByRole('region', { name: 'Dica' })).toHaveLength(1);
    expect(rooms.filter((room) => room.room?.status === 'PLAYING')).toHaveLength(1);
    const room = rooms.find((candidate) => candidate.room?.status === 'PLAYING')!;
    view.unmount();
    const seq = room.state!.seq;
    advance(10_000);
    // O bot teria confirmado o Equipar dele em 600 ms.
    expect(room.state!.seq).toBe(seq);
  });
});

describe('/tutorial: o painel da dica', () => {
  it('abre com a dica do Equipar, com "Entendi" e "Pular o tutorial", e o painel do Equipar contornado', async () => {
    await openTutorial();
    expect(hint().getByText(EQUIP_HINT)).toBeInTheDocument();
    expect(hint().getByRole('button', { name: 'Entendi' })).toBeInTheDocument();
    expect(hint().getByRole('button', { name: 'Pular o tutorial' })).toBeInTheDocument();
    // O contorno vai no recipiente do painel de baixo, e só nele.
    expect(outlined()).toEqual(['equip']);
    expect(screen.getByRole('region', { name: 'Equipar' }).closest('[data-dica]')).toBe(document.querySelector('[data-dica]'));
  });

  it('a região é aria-live="polite", montada mesmo sem dica (vazia e fora da vista), e só o texto está nela', async () => {
    const { user } = await openTutorial();
    const live = hintPanel().querySelector('[aria-live]')!;
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Suas numéricas vão para o campo na ordem em que saíram');
    expect(live).not.toContainElement(hint().getByRole('button', { name: 'Entendi' }));

    await user.click(hint().getByRole('button', { name: 'Entendi' }));
    // Sem dica valendo, a região segue lá, vazia: o texto da próxima entra numa região que o leitor de tela já conhece.
    expect(hintPanel().querySelector('[aria-live]')).toBe(live);
    expect(live).toBeEmptyDOMElement();
    expect(hintPanel()).toHaveClass('sr-only');
  });

  it('"Entendi" esconde a dica e o contorno; a próxima aparece quando a situação dela vale', async () => {
    const clock = await openTutorial();
    await clock.user.click(hint().getByRole('button', { name: 'Entendi' }));
    expect(hint().queryByText(EQUIP_HINT)).not.toBeInTheDocument();
    expect(outlined()).toEqual([]);

    await toOrder(clock);
    expect(hint().getByText(ORDER_HINT)).toBeInTheDocument();
    expect(outlined()).toEqual(['order']);
  });

  it('a dica que ninguém marcou fica na tela até outra a tomar, e o contorno só vale enquanto a situação dela vale', async () => {
    const clock = await openTutorial();
    await equipByUi(clock.user);
    // O Equipar foi confirmado: a dica segue (ninguém deu "Entendi"), mas o painel do Equipar já não é a situação dela.
    expect(hint().getByText(EQUIP_HINT)).toBeInTheDocument();
    expect(outlined()).toEqual([]);
    clock.advance(2_000);
    await equipByUi(clock.user);
    clock.advance(2_000);
    // A escolha da ordem tomou o painel, com o contorno da ordem.
    expect(hint().queryByText(EQUIP_HINT)).not.toBeInTheDocument();
    expect(hint().getByText(ORDER_HINT)).toBeInTheDocument();
    expect(outlined()).toEqual(['order']);
  });

  it('o primeiro turno de ataque: a dica da barra (contorno na barra) e, com "Entendi", a dos buffs no mesmo estado (contorno na mão)', async () => {
    const clock = await openTutorial();
    await toOrder(clock);
    await toAttack(clock);
    expect(hint().getByText(ATTACK_HINT)).toBeInTheDocument();
    expect(outlined()).toEqual(['actionBar']);
    expect(screen.getByRole('region', { name: 'Ações' }).closest('[data-dica]')).toBe(document.querySelector('[data-dica]'));

    await clock.user.click(hint().getByRole('button', { name: 'Entendi' }));
    expect(hint().getByText(BUFFS_HINT)).toBeInTheDocument();
    expect(outlined()).toEqual(['hand']);
    expect(screen.getByRole('list', { name: 'Sua mão' })).toHaveAttribute('data-dica', 'hand');
  });

  it('uma dica já vista não volta quando a situação se repete', async () => {
    const clock = await openTutorial();
    await clock.user.click(hint().getByRole('button', { name: 'Entendi' }));
    await equipByUi(clock.user);
    clock.advance(2_000);
    // O segundo Equipar é a mesma situação da dica já vista: nada no painel.
    expect(screen.getByRole('region', { name: 'Equipar' })).toBeInTheDocument();
    expect(hint().queryByText(EQUIP_HINT)).not.toBeInTheDocument();
    expect(outlined()).toEqual([]);
  });

  it('"Pular o tutorial" esconde o painel e o contorno, grava skipped e a partida segue sem dicas', async () => {
    const clock = await openTutorial();
    await clock.user.click(hint().getByRole('button', { name: 'Pular o tutorial' }));
    expect(screen.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();
    expect(outlined()).toEqual([]);
    expect(loadTutorialState(clock.store)).toBe('skipped');

    // A partida segue: o Equipar confirma, a escolha da ordem vem e o ataque também, e nenhuma dica reaparece.
    await toOrder(clock);
    expect(screen.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();
    await toAttack(clock);
    expect(screen.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();
    expect(outlined()).toEqual([]);
    expect(loadTutorialState(clock.store)).toBe('skipped');
  });

  it('a dica do fim vai DENTRO do painel de fim (o diálogo modal deixa o resto da página inerte): o texto e o link, e done já gravado', async () => {
    const clock = await openTutorial();
    expect(loadTutorialState(clock.store)).toBeNull();
    await concede(clock);
    const dialog = within(screen.getByRole('dialog', { name: 'Bot venceu' }));
    expect(dialog.getByText(END_HINT)).toBeInTheDocument();
    const friend = dialog.getByRole('link', { name: 'Jogar com um amigo' });
    expect(friend).toHaveAttribute('href', '/');
    // Fora do diálogo (onde, no navegador, tudo fica inerte) não há dica nenhuma: nem a do Equipar, que ninguém marcou, nem a do fim.
    expect(hint().queryByText(END_HINT)).not.toBeInTheDocument();
    expect(hint().queryByText(EQUIP_HINT)).not.toBeInTheDocument();
    expect(hint().queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-dica-nota]')).toHaveLength(1);
    expect(outlined()).toEqual([]);
    expect(loadTutorialState(clock.store)).toBe('done');
  });

  it('a dica do fim entra na descrição do diálogo: o leitor de tela a lê junto com o motivo ao abrir', async () => {
    const clock = await openTutorial();
    await concede(clock);
    const dialog = screen.getByRole('dialog', { name: 'Bot venceu' });
    expect(dialog).toHaveAccessibleDescription(/Você desistiu.*A partida acaba quando um Coringa chega a 0 de vida/);
  });

  it('o tutorial só fica concluído quando a dica do fim aparece no diálogo (nem antes, nem se foi pulado)', async () => {
    const clock = await openTutorial();
    await clock.user.click(screen.getAllByRole('button', { name: 'Menu da partida' })[0]!);
    await clock.user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Desistir' }));
    await clock.user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
    // As batidas do fim ainda tocam: o painel de fim (e a dica dentro dele) espera a mesa ficar quieta.
    expect(screen.queryByRole('dialog', { name: 'Bot venceu' })).not.toBeInTheDocument();
    expect(loadTutorialState(clock.store)).toBeNull();
    clock.advance(5_000);
    expect(screen.getByRole('dialog', { name: 'Bot venceu' })).toBeInTheDocument();
    expect(loadTutorialState(clock.store)).toBe('done');
  });

  it('pulado, a dica do fim não aparece e o valor guardado segue skipped', async () => {
    const clock = await openTutorial();
    await clock.user.click(hint().getByRole('button', { name: 'Pular o tutorial' }));
    await concede(clock);
    expect(document.querySelector('[data-dica-nota]')).toBeNull();
    expect(loadTutorialState(clock.store)).toBe('skipped');
  });

  it('recolher o painel de fim ("Ver a mesa") leva a nota junto, e nenhuma dica volta', async () => {
    const clock = await openTutorial();
    await concede(clock);
    await clock.user.click(within(screen.getByRole('dialog', { name: 'Bot venceu' })).getByRole('button', { name: 'Ver a mesa' }));
    expect(document.querySelector('[data-dica-nota]')).toBeNull();
    expect(hint().queryByRole('button')).not.toBeInTheDocument();
    expect(loadTutorialState(clock.store)).toBe('done');
  });

  it('depois da dica do fim, nem a revanche traz dica nenhuma', async () => {
    const clock = await openTutorial();
    await concede(clock);
    await clock.user.click(within(screen.getByRole('dialog', { name: 'Bot venceu' })).getByRole('button', { name: 'Revanche' }));
    clock.advance(5_000);
    expect(screen.getByRole('region', { name: 'Equipar' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();
    expect(outlined()).toEqual([]);
  });

  it('"Jogar com um amigo", dentro do painel de fim, leva à tela inicial', async () => {
    const clock = await openTutorial();
    await concede(clock);
    await clock.user.click(within(screen.getByRole('dialog', { name: 'Bot venceu' })).getByRole('link', { name: 'Jogar com um amigo' }));
    expect(window.location.pathname).toBe('/');
  });

  it('uma dica nova leva o painel à vista (os campos rolam por dentro no celular e no tablet)', async () => {
    const scrolled = vi.fn<(this: Element, arg?: boolean | ScrollIntoViewOptions) => void>();
    Element.prototype.scrollIntoView = scrolled;
    try {
      const clock = await openTutorial();
      const panelAt = (call: number) => scrolled.mock.contexts[call];
      // A primeira dica (a do Equipar) já vem à vista; um novo desenho com ela não rola de novo.
      expect(scrolled).toHaveBeenCalledOnce();
      expect(panelAt(0)).toBe(hintPanel());
      await clock.user.click(hint().getByRole('button', { name: 'Entendi' }));
      expect(scrolled).toHaveBeenCalledOnce();
      // A escolha da ordem toma o painel: ele vem à vista de novo.
      await toOrder(clock);
      expect(hint().getByText(ORDER_HINT)).toBeInTheDocument();
      expect(scrolled.mock.contexts.filter((el) => el === hintPanel()).length).toBe(2);
      expect(scrolled).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'auto' });
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('recarregar recomeça as dicas na mesma partida e mantém o coringa:tutorial', async () => {
    const store = memoryStore();
    const first = await openTutorial(store);
    await first.user.click(hint().getByRole('button', { name: 'Pular o tutorial' }));
    expect(loadTutorialState(store)).toBe('skipped');
    first.view.unmount();
    vi.useRealTimers();

    const second = await openTutorial(store);
    expect(second.options[0]).toMatchObject({ seed: TUTORIAL_SEED });
    expect(hint().getByText(EQUIP_HINT)).toBeInTheDocument();
    expect(outlined()).toEqual(['equip']);
    // O que ficou guardado segue valendo até o fim da próxima rodada do tutorial.
    expect(loadTutorialState(store)).toBe('skipped');
  });

  it('o painel não prende o foco: nada o recebe ao abrir, e o Tab sai dele nos dois sentidos', async () => {
    const { user } = await openTutorial();
    // O foco da vez vai ao painel de baixo (o Equipar), e não à dica.
    expect(hintPanel()).not.toContainElement(document.activeElement as HTMLElement);
    const gotIt = hint().getByRole('button', { name: 'Entendi' });
    const skip = hint().getByRole('button', { name: 'Pular o tutorial' });
    gotIt.focus();
    await user.tab();
    expect(skip).toHaveFocus();
    await user.tab();
    expect(hintPanel()).not.toContainElement(document.activeElement as HTMLElement);
    gotIt.focus();
    await user.tab({ shift: true });
    expect(hintPanel()).not.toContainElement(document.activeElement as HTMLElement);
    expect(hintPanel().closest('dialog')).toBeNull();
    expect(hintPanel()).not.toHaveAttribute('aria-modal');
  });

  it('"Entendi" na última dica do painel devolve o foco ao painel de baixo, e não o deixa cair na página', async () => {
    const { user } = await openTutorial();
    const gotIt = hint().getByRole('button', { name: 'Entendi' });
    await user.click(gotIt);
    expect(gotIt).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Equipar' })).toHaveFocus();
  });

  it('"Entendi" que traz a próxima dica no mesmo estado mantém o foco no botão', async () => {
    const clock = await openTutorial();
    await toOrder(clock);
    await toAttack(clock);
    const gotIt = hint().getByRole('button', { name: 'Entendi' });
    await clock.user.click(gotIt);
    expect(hint().getByText(BUFFS_HINT)).toBeInTheDocument();
    expect(hint().getByRole('button', { name: 'Entendi' })).toBe(gotIt);
    expect(gotIt).toHaveFocus();
  });

  it('"Pular" devolve o foco ao painel de baixo', async () => {
    const { user } = await openTutorial();
    await user.click(hint().getByRole('button', { name: 'Pular o tutorial' }));
    expect(screen.getByRole('region', { name: 'Equipar' })).toHaveFocus();
  });

  it('um clique em "Entendi" no meio das batidas é só dele: a dica some e as batidas seguem', async () => {
    const clock = await openTutorial();
    await equipByUi(clock.user);
    clock.advance(2_000);
    await equipByUi(clock.user);
    // A escolha da ordem chegou, com a cena do começo da rodada ainda em curso.
    expect(hint().getByText(ORDER_HINT)).toBeInTheDocument();
    const stage = document.querySelector('[data-palco]')!;
    expect(stage).toHaveAttribute('data-ocupado', 'true');
    expect(hintPanel()).toHaveAttribute('data-sem-pulo');

    await clock.user.click(hint().getByRole('button', { name: 'Entendi' }));
    expect(hint().queryByText(ORDER_HINT)).not.toBeInTheDocument();
    expect(stage).toHaveAttribute('data-ocupado', 'true');
  });
});

describe('/tutorial: o lugar do painel', () => {
  it('celular e tablet: o painel é o primeiro filho dos campos (o contêiner que rola), no fluxo, sem camada nem posição fixa, e é um só', async () => {
    await openTutorial();
    const panel = hintPanel();
    const fields = document.querySelector('[data-campos]')!;
    expect(screen.getAllByRole('region', { name: 'Dica' })).toHaveLength(1);
    expect(panel.parentElement).toBe(fields);
    expect(fields.firstElementChild).toBe(panel);
    expect(panel.closest('aside')).toBeNull();
    // Nada de camada: nenhuma classe de posição ou de z-index (ele empurra os campos, não cobre a mão nem a barra).
    expect(panel.className).not.toMatch(/\b(?:max-pc:|pc:)?(?:fixed|absolute|sticky|z-)/);
    // O painel do Equipar (embaixo) e a mão moram fora dos campos que rolam: o painel só empurra os campos.
    expect(fields).not.toContainElement(screen.getByRole('region', { name: 'Equipar' }));
    expect(fields).not.toContainElement(screen.getByRole('list', { name: 'Sua mão' }));
  });

  it('PC: o painel vai no alto da coluna do histórico (abaixo do cabeçalho, acima da lista), e não nos campos', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === PC_QUERY, addEventListener() {}, removeEventListener() {} }));
    await openTutorial();
    const aside = screen.getByRole('complementary', { name: 'Histórico da partida' });
    const panel = hintPanel();
    expect(screen.getAllByRole('region', { name: 'Dica' })).toHaveLength(1);
    expect(aside).toContainElement(panel);
    expect(document.querySelector('[data-campos]')).not.toContainElement(panel);
    const children = [...aside.children];
    expect(children.indexOf(panel)).toBe(1);
    expect(children[2]).toBe(screen.getByRole('region', { name: 'Linhas do histórico' }));
  });

  it('o painel não tem nenhuma aria-live aninhada na lista do histórico (cada região é uma)', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === PC_QUERY, addEventListener() {}, removeEventListener() {} }));
    await openTutorial();
    const lists = within(screen.getByRole('region', { name: 'Linhas do histórico' }));
    expect(lists.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();
  });
});

describe('/tutorial: o contorno é parado', () => {
  it('as regras do [data-dica] não têm animação nem transição, nem @keyframes, e não dependem de movimento reduzido', async () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../src/styles.css'), 'utf8');
    const start = css.indexOf('[data-dica] {');
    expect(start).toBeGreaterThan(-1);
    // O bloco do destaque vai até o comentário do arranjo dos campos, que vem logo depois.
    const block = css.slice(start, css.indexOf('Arranjo dos campos', start));
    expect(block).toContain('[data-dica]::after');
    expect(block).not.toMatch(/animation|transition|@keyframes|prefers-reduced-motion/);
  });
});

describe('/tutorial: acessibilidade', () => {
  // O axe usa timers de verdade (o bot joga por eles, 600 ms, e a mesa continua válida): estes testes não usam o relógio falso.
  it('axe: a mesa com a dica do Equipar não tem violações sérias', async () => {
    const { container } = render(<Tutorial store={memoryStore()} load={capture().load} />);
    await screen.findByRole('main', { name: 'Mesa' });
    // A dica entra no desenho seguinte ao primeiro: a região viva já está na página.
    expect(await hint().findByText(EQUIP_HINT)).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: a mesa com a dica do fim (dentro do painel de fim, com o link) não tem violações sérias', async () => {
    const user = userEvent.setup();
    const { container } = render(<Tutorial store={memoryStore()} load={capture().load} />);
    await screen.findByRole('main', { name: 'Mesa' });
    await user.click(screen.getAllByRole('button', { name: 'Menu da partida' })[0]!);
    await user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('button', { name: 'Desistir' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Bot venceu' }, { timeout: 10_000 });
    expect(within(dialog).getByText(END_HINT)).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: a tela de falha não tem violações sérias', async () => {
    const { container } = render(
      <Tutorial store={memoryStore()} load={() => Promise.reject<LocalRoomModule>(new Error('sem rede'))} />,
    );
    await screen.findByRole('heading', { name: 'Não deu para carregar o tutorial' });
    expect(await seriousViolations(container)).toEqual([]);
  });
});
