// O visualizador do replay (`/partidas/<id>`, spec do polimento §4.3): a mesa só de vista, os controles, o "Tocar" que espera as
// batidas, o aviso de versão, a parada no passo que o motor recusa e os casos sem partida ou sem replay. A partida de teste é uma
// de verdade (greedy × greedy, semente fixa); a cena de Ataque Absoluto em passos seguidos vem de uma trilha montada à mão.
import { RULES_VERSION, type PlayerId } from '@coringa/engine';
import { act, cleanup as unmountAll, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_HISTORY, roomNames } from '../../src/model/history.ts';
import { recordPastGame, type PastGame } from '../../src/model/past-games.ts';
import { buildTrack, type ReplayTrack } from '../../src/model/replay-track.ts';
import { DEFAULT_PREFS } from '../../src/model/storage.ts';
import { buildTimeline, timelineMs } from '../../src/model/timeline.ts';
import ReplayScreen from '../../src/ui/screens/ReplayScreen.tsx';
import { ReplayViewer } from '../../src/ui/screens/ReplayViewer.tsx';
import { realReplay, scenarioAt, stateMessage, withStep } from '../fixtures.ts';
import {
  ABSOLUTE,
  advance,
  banner,
  busy,
  cleanup,
  curtainUp,
  expectFlashSafe,
  inverted,
  stage,
  THEIRS,
  watchMany,
} from './anim-harness.tsx';
import { memoryStore, seriousViolations } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/partidas');
});

afterEach(cleanup);

const NAMES = roomNames('p1', [
  { playerId: 'p1', nickname: 'Ana' },
  { playerId: 'p2', nickname: 'Duda' },
]);
const REPLAY = realReplay('ui-1');
const TOTAL = REPLAY.steps.length;
const TRACK = buildTrack(REPLAY, 'p1', NAMES);

/** A duração das batidas de um quadro, pelo mesmo cálculo do palco (ao vivo, sem decisão esperando). */
const beatMs = (frame: number) =>
  timelineMs(buildTimeline(TRACK.frames[frame]!.state.events, { mode: 'live', reducedMotion: false, decisionPending: false }));

type Entry = Omit<PastGame, 'id'>;

const entry = (extra: Partial<Entry> = {}): Entry => ({
  date: new Date(2026, 9, 25, 14, 30).getTime(),
  mode: { kind: 'training', level: 'medio' },
  seat: 'p1',
  names: { me: 'Ana', opponent: 'Duda' },
  outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p1', reason: 'HP' } },
  rounds: 19,
  score: { p1: 1, p2: 0, draws: 0 },
  rulesVersion: RULES_VERSION,
  replay: REPLAY,
  ...extra,
});

/** Timers falsos (a Testing Library só avança os de um `jest` global) e o `user-event` que os avança dentro do `act`. */
function fakeUi() {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  const advanceInAct = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };
  vi.stubGlobal('jest', { advanceTimersByTime: advanceInAct });
  return userEvent.setup({ advanceTimers: advanceInAct });
}

/**
 * Grava a partida e abre a tela dela, como a rota `/partidas/<id>`. O axe usa timers: os testes dele abrem com os timers de
 * verdade (`fake: false`).
 */
function open(extra: Partial<Entry> = {}, { fake = true }: { fake?: boolean } = {}) {
  const user = fake ? fakeUi() : userEvent.setup();
  const store = memoryStore();
  const game = recordPastGame(store, entry(extra), 1_000)!;
  const view = render(<ReplayScreen store={store} id={game.id} />);
  return { user, store, game, ...view };
}

const control = (name: string) => screen.getByRole('button', { name });
const next = () => control('Próximo passo');
const counter = () => screen.getByText(/^Passo \d+ de \d+$/).textContent;
/** Desligado de modo que o foco continue no botão: `aria-disabled`, e não o atributo `disabled`. */
const isOff = (el: HTMLElement) => el.getAttribute('aria-disabled') === 'true';
const lines = () =>
  within(screen.getByRole('region', { name: 'Linhas do histórico' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent);
const frameLines = (frame: number) => TRACK.frames[frame]!.history.lines.map((line) => line.text);

type User = ReturnType<typeof userEvent.setup>;

/** Do começo até o quadro `to`, um clique por passo; depois deixa as batidas acabarem. */
async function walk(user: User, to: number) {
  for (let i = 0; i < to; i++) await user.click(next());
  advance(5_000);
}

/**
 * Deixa o tempo correr, em fatias, até a condição valer. Cada fatia é um `act`: o timer do passo seguinte só nasce depois de o
 * React desenhar o passo, então um `advance` único e longo não toca a partida.
 */
function playUntil(done: () => boolean, maxMs: number) {
  for (let elapsed = 0; elapsed < maxMs && !done(); elapsed += 50) advance(50);
}

describe('a partida de teste', () => {
  it('tem passos sem batida nenhuma (o Equipar de quem vê) e passos com batidas', () => {
    expect(TOTAL).toBeGreaterThan(40);
    expect(TRACK.stoppedAt).toBeNull();
    expect(TRACK.frames[1]!.state.events.length).toBeGreaterThan(0);
    expect(beatMs(1)).toBe(0);
    expect(beatMs(2)).toBe(1_600);
    expect(beatMs(3)).toBe(0);
    expect(beatMs(7)).toBeGreaterThan(0);
    expect(TRACK.frames[12]!.history.lines.length).toBeGreaterThan(TRACK.frames[3]!.history.lines.length);
  });
});

describe('<ReplayScreen />: a mesa de vista e os controles', () => {
  it('abre no começo: "Revendo a partida", sem barra de jogadas, menu nem relógio', () => {
    const { container } = open();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Situação da rodada' })).getByText('Revendo a partida')).toBeInTheDocument();
    expect(screen.queryByText(/sem relógio/)).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu da partida' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Campo de Duda' })).toBeInTheDocument();
    expect(counter()).toBe(`Passo 0 de ${TOTAL}`);
    expect(isOff(control('Início'))).toBe(true);
    expect(isOff(control('Passo anterior'))).toBe(true);
    expect(isOff(next())).toBe(false);
    expect(control('Tocar')).toBeInTheDocument();
    expect(busy(container)).toBe(false);
    expect(lines()).toEqual(frameLines(0));
  });

  it('o contador usa a fonte de texto com algarismos tabulares', () => {
    open();
    expect(screen.getByText(/^Passo \d+ de \d+$/)).toHaveClass('tabular-nums');
  });

  it('vê a mesa do assento de quem guardou a partida', () => {
    open({ seat: 'p2', names: { me: 'Duda', opponent: 'Ana' } });
    expect(screen.getByRole('region', { name: 'Campo de Ana' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Campo de Duda' })).not.toBeInTheDocument();
  });

  it('"Próximo passo" traz os eventos do passo e toca as batidas como ao vivo; o contador anda', async () => {
    const { user, container } = open();
    await user.click(next());
    expect(counter()).toBe(`Passo 1 de ${TOTAL}`);
    expect(busy(container)).toBe(false); // o Equipar de quem vê: eventos, mas nenhuma batida
    expect(lines()).toEqual(frameLines(1));

    await user.click(next());
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
    expect(busy(container)).toBe(true);
    expect(lines()).toEqual(frameLines(2));
    advance(beatMs(2));
    expect(busy(container)).toBe(false);
    expect(isOff(control('Início'))).toBe(false);
    expect(isOff(control('Passo anterior'))).toBe(false);
  });

  it('"Passo anterior" troca a mesa de uma vez, sem batidas, e o histórico encolhe', async () => {
    const { user, container } = open();
    await walk(user, 12);
    expect(lines()).toEqual(frameLines(12));

    await user.click(control('Passo anterior'));
    expect(counter()).toBe(`Passo 11 de ${TOTAL}`);
    expect(busy(container)).toBe(false);
    expect(lines()).toEqual(frameLines(11));
  });

  it('"Início" volta ao começo, sem batidas', async () => {
    const { user, container } = open();
    await walk(user, 12);
    await user.click(control('Início'));
    expect(counter()).toBe(`Passo 0 de ${TOTAL}`);
    expect(busy(container)).toBe(false);
    expect(lines()).toEqual(frameLines(0));
    expect(isOff(control('Início'))).toBe(true);
    expect(control('Início')).toHaveFocus();
  });

  it('o seletor "Rodada" pula para a primeira jogada da rodada, em resync, e acompanha o passo', async () => {
    const { user, container } = open();
    const select = screen.getByLabelText('Rodada');
    expect(select).toHaveValue('1');
    expect(within(select).getAllByRole('option')).toHaveLength(TRACK.rounds.length);

    const third = TRACK.rounds.find((entryRound) => entryRound.round === 3)!;
    await user.selectOptions(select, '3');
    expect(counter()).toBe(`Passo ${third.frame} de ${TOTAL}`);
    expect(busy(container)).toBe(false);
    expect(select).toHaveValue('3');
    expect(lines()).toEqual(frameLines(third.frame));

    // Andar passo a passo para a rodada seguinte também troca a rodada mostrada.
    const fourth = TRACK.rounds.find((entryRound) => entryRound.round === 4)!;
    for (let frame = third.frame; frame < fourth.frame; frame++) await user.click(next());
    expect(select).toHaveValue('4');
  });

  it('a rodada e o "Início" são saltos, sem batidas, mesmo quando o destino é o passo seguinte', async () => {
    const { user, container } = open();
    const second = TRACK.rounds[1]!; // a rodada 2 começa no passo 2, que tem 1600 ms de batidas
    expect(beatMs(second.frame)).toBeGreaterThan(0);
    await walk(user, second.frame - 1);
    await user.selectOptions(screen.getByLabelText('Rodada'), String(second.round));
    expect(counter()).toBe(`Passo ${second.frame} de ${TOTAL}`);
    expect(busy(container)).toBe(false);
    expect(lines()).toEqual(frameLines(second.frame));

    // Um passo à frente, de verdade, toca as batidas do mesmo passo.
    await user.click(control('Início'));
    await user.click(next());
    await user.click(next());
    expect(counter()).toBe(`Passo ${second.frame} de ${TOTAL}`);
    expect(busy(container)).toBe(true);
  });

  it('a mesma sequência 5 → 6, 6 → 5, 5 → 6 toca as batidas do passo 6 de novo', async () => {
    const { user, container } = open();
    await walk(user, 5);
    expect(beatMs(6)).toBeGreaterThan(0);

    await user.click(next());
    expect(counter()).toBe(`Passo 6 de ${TOTAL}`);
    expect(busy(container)).toBe(true);
    advance(5_000);
    expect(busy(container)).toBe(false);

    await user.click(control('Passo anterior'));
    expect(counter()).toBe(`Passo 5 de ${TOTAL}`);
    expect(busy(container)).toBe(false);

    await user.click(next());
    expect(counter()).toBe(`Passo 6 de ${TOTAL}`);
    expect(busy(container)).toBe(true);
    expect(lines()).toEqual(frameLines(6));
  });

  it('o palco (e a trava de flash dele) fica montado entre os passos e os saltos', async () => {
    const { user, container } = open();
    const palco = stage(container);
    await walk(user, 6);
    await user.click(control('Passo anterior'));
    await user.click(control('Início'));
    await user.selectOptions(screen.getByLabelText('Rodada'), '5');
    await user.click(next());
    expect(stage(container)).toBe(palco);
  });

  it('cliques rápidos durante as batidas passam um passo por clique, sem erro, e o foco fica no botão', async () => {
    const { user, container } = open();
    const button = next();
    expect(beatMs(7)).toBeGreaterThan(0);
    for (let i = 0; i < 7; i++) await user.click(button);
    expect(counter()).toBe(`Passo 7 de ${TOTAL}`);
    expect(busy(container)).toBe(true);
    expect(button).toHaveFocus();

    const back = control('Passo anterior');
    for (let i = 0; i < 3; i++) await user.click(back);
    expect(counter()).toBe(`Passo 4 de ${TOTAL}`);
    expect(busy(container)).toBe(false);
    expect(back).toHaveFocus();

    advance(10_000);
    expect(counter()).toBe(`Passo 4 de ${TOTAL}`);
    expect(lines()).toEqual(frameLines(4));
  });

  it('o teclado também anda e volta, e o foco não sai do botão', async () => {
    const { user } = open();
    next().focus();
    await user.keyboard('{Enter}{Enter}{Enter}');
    expect(counter()).toBe(`Passo 3 de ${TOTAL}`);
    await user.keyboard(' ');
    expect(counter()).toBe(`Passo 4 de ${TOTAL}`);
    expect(next()).toHaveFocus();
  });

  it('no fim da partida, "Próximo passo" e "Tocar" ficam desligados e o foco não sai do botão apertado', async () => {
    const { user } = open({ replay: { ...REPLAY, steps: REPLAY.steps.slice(0, 3) } });
    const button = next();
    for (let i = 0; i < 3; i++) await user.click(button);
    expect(counter()).toBe('Passo 3 de 3');
    expect(isOff(button)).toBe(true);
    expect(button).toHaveFocus();
    await user.click(button);
    expect(counter()).toBe('Passo 3 de 3');
    expect(isOff(control('Tocar'))).toBe(true);
    expect(isOff(control('Passo anterior'))).toBe(false);
  });

  it('o último quadro da partida inteira é o fim de jogo, na mesa de vista (nunca o painel de fim)', async () => {
    const { user } = open();
    const lastRound = TRACK.rounds[TRACK.rounds.length - 1]!;
    await user.selectOptions(screen.getByLabelText('Rodada'), String(lastRound.round));
    for (let frame = lastRound.frame; frame < TOTAL; frame++) await user.click(next());
    expect(counter()).toBe(`Passo ${TOTAL} de ${TOTAL}`);
    expect(isOff(next())).toBe(true);
    expect(screen.getAllByText(/Fim de jogo/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Fim da partida')).not.toBeInTheDocument();
    expect(lines()).toEqual(frameLines(TOTAL));
  });

  it('não mostra marca "novo" no histórico, nem velha nem negativa, ao voltar e avançar de novo', async () => {
    // O snapshot do replay tem `marksBaseSeq: null` (`replaySnapshot`): por contrato nenhuma linha é "novo" na mesa do replay, e o
    // contador do botão "Histórico" nunca anda. O teste confere que isso vale em qualquer vai-e-vem, com a gaveta aberta ou fechada.
    const { user } = open();
    const historyButton = () => screen.getByRole('button', { name: /^Histórico/ });
    const checkFrame = (frame: number) => {
      expect(screen.queryByText('novo')).not.toBeInTheDocument();
      expect(historyButton()).toHaveAccessibleName('Histórico');
      expect(lines()).toEqual(frameLines(frame));
    };

    // Gaveta fechada: a contagem não anda.
    await walk(user, 8);
    checkFrame(8);
    await user.click(control('Início'));
    checkFrame(0);
    await user.click(next());
    await user.click(next());
    checkFrame(2);

    // Gaveta aberta: as linhas vistas encolhem com o histórico e voltam a crescer. (Um toque durante as batidas só as pula.)
    advance(5_000);
    await user.click(historyButton());
    expect(historyButton()).toHaveAttribute('aria-expanded', 'true');
    await user.click(control('Início'));
    await walk(user, 9);
    checkFrame(9);
    await user.click(control('Passo anterior'));
    await user.click(control('Passo anterior'));
    checkFrame(7);
    await user.click(next());
    await user.click(next());
    await user.click(next());
    checkFrame(10);
    await user.click(control('Início'));
    checkFrame(0);
    await user.click(historyButton());
    expect(historyButton()).toHaveAttribute('aria-expanded', 'false');
    await user.click(next());
    checkFrame(1);
  });
});

describe('<ReplayScreen />: tocar e pausar', () => {
  it('"Tocar" avança um passo depois de 700 ms e de as batidas acabarem; um passo sem batida não trava', async () => {
    const { user, container } = open();
    await user.click(control('Tocar'));
    expect(control('Pausar')).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Tocar' })).not.toBeInTheDocument();

    advance(699);
    expect(counter()).toBe(`Passo 0 de ${TOTAL}`);
    advance(1); // 700 ms: o passo 1 (o Equipar de quem vê) não tem batida
    expect(counter()).toBe(`Passo 1 de ${TOTAL}`);
    expect(busy(container)).toBe(false);

    advance(700); // 1400 ms: o passo 2 tem 1600 ms de batidas
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
    expect(busy(container)).toBe(true);

    advance(700); // passaram os 700 ms, mas o palco ainda não assentou
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
    advance(899);
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
    advance(1); // 3000 ms: as batidas acabaram
    expect(counter()).toBe(`Passo 3 de ${TOTAL}`);

    advance(700); // o passo 3 também é sem batida
    expect(counter()).toBe(`Passo 4 de ${TOTAL}`);
    expect(control('Pausar')).toHaveFocus();
  });

  it('"Pausar" para na hora e cancela o timer que estava correndo', async () => {
    const { user } = open();
    await user.click(control('Tocar'));
    advance(500);
    await user.click(control('Pausar'));
    expect(control('Tocar')).toHaveFocus();
    advance(10_000);
    expect(counter()).toBe(`Passo 0 de ${TOTAL}`);

    // Tocar de novo conta 700 ms do zero.
    await user.click(control('Tocar'));
    advance(699);
    expect(counter()).toBe(`Passo 0 de ${TOTAL}`);
    advance(1);
    expect(counter()).toBe(`Passo 1 de ${TOTAL}`);
  });

  it('pausar durante as batidas não deixa o passo seguinte sair quando elas acabam', async () => {
    const { user } = open();
    await user.click(next());
    await user.click(control('Tocar'));
    advance(700); // passo 2 (1600 ms de batidas)
    advance(700); // o timer já passou: espera o palco assentar
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
    await user.click(control('Pausar'));
    advance(10_000);
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
  });

  it('navegar na mão enquanto toca pausa', async () => {
    const { user } = open();
    await user.click(control('Tocar'));
    advance(700);
    await user.click(next());
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
    expect(control('Tocar')).toBeInTheDocument();
    advance(10_000);
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);

    await user.click(control('Tocar'));
    await user.click(control('Início'));
    expect(control('Tocar')).toBeInTheDocument();
    await user.click(control('Tocar'));
    await user.selectOptions(screen.getByLabelText('Rodada'), '2');
    expect(control('Tocar')).toBeInTheDocument();
  });

  it('desmontar a tela enquanto espera o palco assentar cancela os timers (nenhum fica para trás)', async () => {
    const user = fakeUi();
    const baseline = vi.getTimerCount();
    const store = memoryStore();
    const game = recordPastGame(store, entry(), 1_000)!;
    const view = render(<ReplayScreen store={store} id={game.id} />);

    await user.click(next());
    await user.click(control('Tocar'));
    advance(700); // passo 2 (1600 ms de batidas)
    advance(700); // os 700 ms do "Tocar" passaram: a tela espera o palco assentar
    expect(counter()).toBe(`Passo 2 de ${TOTAL}`);
    expect(busy(view.container)).toBe(true);
    expect(vi.getTimerCount()).toBeGreaterThan(baseline);

    view.unmount();
    expect(vi.getTimerCount()).toBe(baseline);
    advance(10_000); // nada sobrou para disparar
  });

  it('para no último quadro: o botão volta a "Tocar" (desligado) e nada mais anda', async () => {
    const { user } = open({ replay: { ...REPLAY, steps: REPLAY.steps.slice(0, 4) } });
    await user.click(control('Tocar'));
    playUntil(() => counter() === 'Passo 4 de 4', 20_000);
    expect(counter()).toBe('Passo 4 de 4');
    expect(isOff(control('Tocar'))).toBe(true);
    expect(isOff(next())).toBe(true);
    advance(20_000);
    expect(counter()).toBe('Passo 4 de 4');
  });

  it('toca vários passos seguidos, com e sem batidas, até o último', async () => {
    const steps = 14;
    const { user } = open({ replay: { ...REPLAY, steps: REPLAY.steps.slice(0, steps) } });
    await user.click(control('Tocar'));
    playUntil(() => counter() === `Passo ${steps} de ${steps}`, 5 * 60_000);
    expect(counter()).toBe(`Passo ${steps} de ${steps}`);
    expect(control('Tocar')).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(lines()).toEqual(frameLines(steps));
  });

  it('um toque na mesa durante as batidas as pula, e o "Tocar" segue sem esperar o fim delas', async () => {
    const { user, container } = open();
    await user.click(next());
    await user.click(control('Tocar'));
    advance(700); // passo 2: batidas por 1600 ms
    advance(700);
    expect(busy(container)).toBe(true);
    await user.click(screen.getByRole('region', { name: 'Campo de Duda' }));
    expect(busy(container)).toBe(false);
    expect(counter()).toBe(`Passo 3 de ${TOTAL}`);
  });
});

describe('<ReplayScreen />: avisos', () => {
  const WARNING = 'Esta partida foi gravada com outra versão das regras. Ela pode não se repetir igual.';

  it('uma partida de outra versão das regras abre com o aviso, e a da versão atual, sem ele', () => {
    open({ rulesVersion: RULES_VERSION + 1 });
    expect(screen.getByText(WARNING)).toBeInTheDocument();
    expect(counter()).toBe(`Passo 0 de ${TOTAL}`);
    unmountAll();
    open();
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('um passo que o motor recusa para o replay ali e diz o motivo; os passos de antes seguem navegáveis', async () => {
    const bad = withStep(REPLAY, 6, { ...REPLAY.steps[6]!, player: 'p9' as PlayerId });
    const stopped = buildTrack(bad, 'p1', NAMES).stoppedAt!;
    expect(stopped.step).toBe(7);
    const { user } = open({ replay: bad });

    expect(screen.getByText(/^O replay parou no passo 7: /)).toHaveTextContent(`O replay parou no passo 7: ${stopped.message}`);
    expect(counter()).toBe('Passo 0 de 6');
    expect(screen.getByRole('option', { name: '1' })).toBeInTheDocument();
    for (let i = 0; i < 6; i++) await user.click(next());
    expect(counter()).toBe('Passo 6 de 6');
    expect(isOff(next())).toBe(true);
    expect(lines()).toEqual(frameLines(6));
    // Tocar chega ao último quadro que existe e para.
    await user.click(control('Início'));
    await user.click(control('Tocar'));
    playUntil(() => counter() === 'Passo 6 de 6', 60_000);
    expect(counter()).toBe('Passo 6 de 6');
    expect(isOff(control('Tocar'))).toBe(true);
  });

  it('uma partida que o motor nem cria mostra o motivo, sem mesa, e o caminho de volta', async () => {
    const broken = { ...REPLAY, config: { ...REPLAY.config, hp: -5 } };
    const stopped = buildTrack(broken, 'p1', NAMES).stoppedAt!;
    expect(stopped.step).toBe(0);
    const { user, container } = open({ replay: broken }, { fake: false });

    expect(screen.getByText(/^O replay não pôde começar: /)).toHaveTextContent(stopped.message);
    expect(screen.queryByRole('main', { name: 'Mesa' })).not.toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
    await user.click(screen.getByRole('link', { name: 'Voltar à lista' }));
    expect(window.location.pathname).toBe('/partidas');
  });

  it('um id que não está no armazenamento: "Esta partida não está mais neste navegador."', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReplayScreen store={memoryStore()} id="zzz" />);
    expect(screen.getByText('Esta partida não está mais neste navegador.')).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
    await user.click(screen.getByRole('link', { name: 'Voltar à lista' }));
    expect(window.location.pathname).toBe('/partidas');
  });

  it('uma partida sem replay: "Esta partida não tem replay."', async () => {
    const { container } = open({ replay: undefined }, { fake: false });
    expect(screen.getByText('Esta partida não tem replay.')).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Mesa' })).not.toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('uma entrada estragada, com o assento fora do replay, também é "sem replay", sem quebrar', () => {
    open({ seat: 'p3' as PlayerId });
    expect(screen.getByText('Esta partida não tem replay.')).toBeInTheDocument();
  });

  it('"Voltar à lista" volta à lista', async () => {
    const { user } = open();
    await user.click(screen.getByRole('link', { name: 'Voltar à lista' }));
    expect(window.location.pathname).toBe('/partidas');
  });
});

describe('<ReplayScreen />: acessibilidade', () => {
  it('sem violações sérias do axe: no começo, andando, com a gaveta do histórico, com o aviso de versão e com a parada', async () => {
    const { user, container } = open({ rulesVersion: RULES_VERSION + 1 }, { fake: false });
    expect(await seriousViolations(container)).toEqual([]);
    for (let i = 0; i < 6; i++) await user.click(next());
    await user.click(screen.getByRole('button', { name: /^Histórico/ }));
    expect(await seriousViolations(container)).toEqual([]);
    unmountAll();

    const bad = withStep(REPLAY, 6, { ...REPLAY.steps[6]!, player: 'p9' as PlayerId });
    const stopped = open({ replay: bad }, { fake: false });
    expect(await seriousViolations(stopped.container)).toEqual([]);
  });

  it('o aviso de versão e a parada ficam à vista dentro da mesa, não fora dela', () => {
    open({ rulesVersion: RULES_VERSION + 1 });
    const mesa = screen.getByRole('main', { name: 'Mesa' });
    expect(within(mesa).getByText(/outra versão das regras/)).toBeInTheDocument();
    expect(within(mesa).getByRole('link', { name: 'Voltar à lista' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// A trilha montada à mão: passos seguidos de Ataque Absoluto (uma cena que inverte a tela inteira)

const GAME: PastGame = { id: 'x', ...entry({ replay: undefined }) };

/** Uma trilha de `steps` passos, todos com a cena do Ataque Absoluto, vista do p1. */
function absoluteTrack(steps: number): ReplayTrack {
  const view = scenarioAt(THEIRS).view;
  const frames = Array.from({ length: steps + 1 }, (_, i) => ({
    state: stateMessage(view, { seq: i + 1, epoch: i, events: i === 0 ? [] : [ABSOLUTE] }),
    round: view.round,
    history: EMPTY_HISTORY,
  }));
  return { frames, stoppedAt: null, rounds: [{ round: view.round, frame: 0 }] };
}

describe('<ReplayViewer />: cenas de Ataque Absoluto em passos seguidos', () => {
  it('cliques rápidos em "Próximo passo" por três passos não passam do limite da FlashLock (≤ 3 trocas em 1 s)', async () => {
    const user = fakeUi();
    const { container } = render(<ReplayViewer game={GAME} track={absoluteTrack(3)} prefs={DEFAULT_PREFS} />);
    const trace = watchMany([() => inverted(container), () => curtainUp(container), () => banner(container) !== null]);
    for (let i = 0; i < 3; i++) {
      await user.click(next());
      trace.sample();
      trace.run(100);
    }
    expect(counter()).toBe('Passo 3 de 3');
    trace.run(3_500);
    expect(trace.all.length).toBeGreaterThan(0);
    expectFlashSafe(trace.all);
    // A inversão em si: uma só (liga e desliga), as outras cenas cedem.
    expect(trace.flips[0]).toHaveLength(2);
  });

  it('o mesmo, indo e voltando entre os passos', async () => {
    const user = fakeUi();
    const { container } = render(<ReplayViewer game={GAME} track={absoluteTrack(3)} prefs={DEFAULT_PREFS} />);
    const trace = watchMany([() => inverted(container), () => curtainUp(container), () => banner(container) !== null]);
    for (const name of ['Próximo passo', 'Próximo passo', 'Passo anterior', 'Próximo passo', 'Passo anterior', 'Próximo passo']) {
      await user.click(control(name));
      trace.sample();
      trace.run(100);
    }
    trace.run(4_000);
    expectFlashSafe(trace.all);
    expect(counter()).toBe('Passo 2 de 3');
  });

  it('com movimento reduzido, nenhum passo inverte a tela', async () => {
    const user = fakeUi();
    const { container } = render(
      <ReplayViewer game={GAME} track={absoluteTrack(3)} prefs={{ ...DEFAULT_PREFS, reduceMotion: true }} />,
    );
    const trace = watchMany([() => inverted(container)]);
    for (let i = 0; i < 3; i++) {
      await user.click(next());
      trace.sample();
      trace.run(100);
    }
    trace.run(4_000);
    expect(trace.all).toEqual([]);
  });

  it('o sistema que pede menos movimento também vale no replay', async () => {
    const user = fakeUi();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => undefined, removeEventListener: () => undefined }));
    const { container } = render(<ReplayViewer game={GAME} track={absoluteTrack(3)} prefs={DEFAULT_PREFS} />);
    const trace = watchMany([() => inverted(container)]);
    await user.click(next());
    trace.sample();
    trace.run(3_000);
    expect(trace.all).toEqual([]);
  });

  it('um clique de mouse em "Pausar" no meio da cena pausa na hora: o palco não o engole', async () => {
    const user = fakeUi();
    const { container } = render(<ReplayViewer game={GAME} track={absoluteTrack(3)} prefs={DEFAULT_PREFS} />);
    await user.click(control('Tocar'));
    advance(700); // passo 1: a cena do Ataque Absoluto (1500 ms)
    advance(300);
    expect(counter()).toBe('Passo 1 de 3');
    expect(busy(container)).toBe(true);

    await user.click(control('Pausar'));
    expect(control('Tocar')).toBeInTheDocument();
    expect(busy(container)).toBe(true); // o clique era do botão: as batidas seguem
    advance(10_000);
    expect(counter()).toBe('Passo 1 de 3');
  });

  it('um clique de mouse em "Próximo passo" no meio da cena anda um passo na hora: um clique, um passo', async () => {
    const user = fakeUi();
    const { container } = render(<ReplayViewer game={GAME} track={absoluteTrack(3)} prefs={DEFAULT_PREFS} />);
    await user.click(next());
    advance(300);
    expect(busy(container)).toBe(true);
    await user.click(next());
    expect(counter()).toBe('Passo 2 de 3');
    expect(busy(container)).toBe(true);
  });

  it('desmontar a tela tocando, com a cena no ar (inversão e cortina agendadas), cancela os timers', async () => {
    const user = fakeUi();
    const baseline = vi.getTimerCount();
    const view = render(<ReplayViewer game={GAME} track={absoluteTrack(3)} prefs={DEFAULT_PREFS} />);
    await user.click(control('Tocar'));
    advance(700); // passo 1: a cena do Ataque Absoluto (1500 ms)
    advance(300);
    expect(counter()).toBe('Passo 1 de 3');
    expect(busy(view.container)).toBe(true);
    expect(vi.getTimerCount()).toBeGreaterThan(baseline);

    view.unmount();
    expect(vi.getTimerCount()).toBe(baseline);
    advance(10_000);
  });

  it('um replay sem nenhum quadro de passo é só o começo: sem erro, com tudo desligado', async () => {
    fakeUi();
    render(<ReplayViewer game={GAME} track={absoluteTrack(0)} prefs={DEFAULT_PREFS} />);
    expect(counter()).toBe('Passo 0 de 0');
    for (const name of ['Início', 'Passo anterior', 'Próximo passo', 'Tocar']) expect(isOff(control(name))).toBe(true);
  });
});
