// As animações pela linha do tempo (spec §4, §10.1, §10.4): o palco (`Stage`) toca as batidas do último `state`, inverte a
// tela inteira nas cenas, respeita a trava global de flash, pula no toque e no Esc e desliga os controles enquanto toca.
// No jsdom o Motion não anima (sem layout nem WAAPI): os testes conferem a máquina do palco com timers falsos (batidas
// agendadas, inversão ligada e desligada no tempo certo, busy, pulo, movimento reduzido, catchUp, resync, trava) e os
// efeitos pelos atributos que a mesa deixa no DOM, não os pixels. O harness está em `anim-harness.tsx`.
import type { GameEvent } from '@coringa/engine';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FLASH_WINDOW_MS } from '../../src/model/flash.ts';
import { bannerReadMs, readingMs } from '../../src/model/reading.ts';
import { Session } from '../../src/model/session.ts';
import { DEFAULT_PREFS } from '../../src/model/storage.ts';
import { INVERT_COOLDOWN_MS, INVERT_MIN_HOLD_MS, RARE_SCENE_MS } from '../../src/model/timeline.ts';
import { useBoardBusy } from '../../src/ui/anim/context.ts';
import { Stage } from '../../src/ui/anim/Stage.tsx';
import { deferredAck, scenarioAt, type ViewSpec } from '../fixtures.ts';
import {
  ABSOLUTE,
  SCENE,
  SCENE_2,
  advance,
  ATTACK,
  banner,
  bar,
  busy,
  cleanup,
  connect,
  curtainUp,
  emit,
  EXODIA,
  EXODIA_OVER,
  expectFlashSafe,
  handList,
  HIT,
  inverted,
  MINE,
  mount,
  SAMPLE_MS,
  scene,
  seatOf,
  stage,
  THEIRS,
  TURN,
  watchInversion,
  watchMany,
} from './anim-harness.tsx';
import { ATTACK_BUTTON, roomMessage, seriousViolations } from './support.tsx';

afterEach(cleanup);

// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------

describe('palco: a cena inverte a tela inteira uma vez (spec §10.1, §10.4)', () => {
  it('Exódia: o palco recebe a inversão uma vez e a retira depois de ≥ 300 ms', () => {
    const m = mount(THEIRS);
    expect(busy(m.container)).toBe(false);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(busy(m.container)).toBe(true);
    const trace = watchInversion(m.container);
    trace.run(4_300);
    // Liga aos 1400 ms (a chegada do quarto K), desliga 600 ms depois: uma inversão só, mantida bem mais que o piso de 300 ms.
    expect(trace.flips).toEqual([1_400, 2_000]);
    expect(trace.flips[1]! - trace.flips[0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expect(busy(m.container)).toBe(false);
  });

  it('a inversão é o `filter: invert(1)` do palco, e só dura enquanto está ligada', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(stage(m.container).style.filter).toBe('');
    advance(1_400);
    expect(stage(m.container).style.filter).toBe('invert(1)');
    expect(inverted(m.container)).toBe(true);
    advance(599);
    expect(inverted(m.container)).toBe(true);
    advance(1);
    expect(inverted(m.container)).toBe(false);
    expect(stage(m.container).style.filter).toBe('');
  });

  it('a cena mostra o título e some no fim da batida', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'EXODIA');
    expect(scene(m.container)).toHaveTextContent('EXÓDIA!');
    expect(scene(m.container)).toHaveTextContent('Duda reuniu os quatro K');
    advance(4_199);
    expect(scene(m.container)).not.toBeNull();
    advance(1);
    expect(scene(m.container)).toBeNull();
  });

  it('a sobreposição fica escondida do leitor de tela (o histórico é o registro)', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('uma cena comum dentro do teto de 1 s (decisão esperando) inverte uma vez, por 400 ms (a escala 2/3 de 150 e 600)', () => {
    const m = mount(MINE);
    emit(m, MINE, [SCENE]);
    const trace = watchInversion(m.container);
    trace.run(1_100);
    expect(trace.flips).toEqual([100, 500]);
    expect(trace.flips[1]! - trace.flips[0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expect(busy(m.container)).toBe(false);
  });
});

describe('cenas raras (U3): a figura, o título que carimba e os raios', () => {
  const figure = (container: HTMLElement) => container.querySelector('[data-figura]');
  const figureCards = (container: HTMLElement) => [...container.querySelectorAll('[data-figura] [data-card-id]')];

  it('a Exódia: os quatro K em cruz, os raios girando, e o título com "e vence!"', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(figure(m.container)).toHaveAttribute('data-figura', 'cross');
    expect(figureCards(m.container).map((card) => card.getAttribute('data-card-id'))).toEqual(['cena-K-0', 'cena-K-1', 'cena-K-2', 'cena-K-3']);
    expect(m.container.querySelector('[data-raios]')!.getAttribute('class')).toContain('animate-[spin');
    expect(scene(m.container)).toHaveTextContent('Duda reuniu os quatro K e vence!');
  });

  it('o Ataque Absoluto abre os J em leque, e a Defesa Absoluta faz um muro de Q', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [ABSOLUTE]);
    expect(figure(m.container)).toHaveAttribute('data-figura', 'fan');
    expect(figureCards(m.container)).toHaveLength(4);
    advance(RARE_SCENE_MS.ABSOLUTE_ATTACK + 1_100);
    emit(m, THEIRS, [{ type: 'AbsoluteDefenseStarted', player: 'p2' }]);
    expect(figure(m.container)).toHaveAttribute('data-figura', 'wall');
    expect(figureCards(m.container).every((card) => card.getAttribute('data-card-id')!.startsWith('cena-Q-'))).toBe(true);
  });

  it('a cena comum (o Reflect) não tem figura nem raios', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [SCENE]);
    expect(scene(m.container)).not.toBeNull();
    expect(figure(m.container)).toBeNull();
    expect(m.container.querySelector('[data-raios]')).toBeNull();
  });

  it('com movimento reduzido, a figura já parada e os raios parados', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(figureCards(m.container)).toHaveLength(4);
    expect(m.container.querySelector('[data-raios]')!.getAttribute('class')).not.toContain('animate-');
  });
});

describe('palco: movimento reduzido (spec §4.1, §10.4)', () => {
  it('pela preferência do menu: a cena vira texto parado com esmaecimento, sem inversão', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('data-reduzido', 'true');
    expect(scene(m.container)).toHaveTextContent('EXÓDIA!');
    const trace = watchInversion(m.container);
    trace.run(4_300);
    expect(trace.flips).toEqual([]);
    expect(stage(m.container).style.filter).toBe('');
  });

  it('pelo sistema (matchMedia): também sem inversão', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    const trace = watchInversion(m.container);
    trace.run(4_300);
    expect(trace.flips).toEqual([]);
    expect(scene(m.container)).toBeNull();
  });

  it('sem nenhum dos dois, a inversão acontece', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    const trace = watchInversion(m.container);
    trace.run(4_300);
    expect(trace.flips).toEqual([1_400, 2_000]);
  });

  it('o sistema que liga o movimento reduzido com a partida aberta vale no `state` seguinte', () => {
    let listener: (() => void) | undefined;
    const list = {
      matches: false,
      media: '',
      addEventListener: (_type: string, fn: () => void) => {
        listener = fn;
      },
      removeEventListener: () => undefined,
    };
    vi.stubGlobal('matchMedia', () => list);
    const m = mount(THEIRS);
    act(() => {
      list.matches = true;
      listener?.();
    });
    emit(m, EXODIA_OVER, [EXODIA]);
    const trace = watchInversion(m.container);
    trace.run(4_300);
    expect(trace.flips).toEqual([]);
  });

  it('o menu que liga "reduzir animações" com a partida aberta vale no `state` seguinte', () => {
    const m = mount(THEIRS);
    act(() => m.session.setPrefs({ ...DEFAULT_PREFS, reduceMotion: true }));
    emit(m, EXODIA_OVER, [EXODIA]);
    const trace = watchInversion(m.container);
    trace.run(4_300);
    expect(trace.flips).toEqual([]);
  });
});

describe('palco: catchUp e resync (spec §4.1)', () => {
  it('catchUp não mostra cena: vira faixa, em velocidade dobrada, sem inversão', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA], { catchUp: true });
    expect(scene(m.container)).toBeNull();
    expect(banner(m.container)).toHaveTextContent('EXÓDIA de Duda!');
    const trace = watchInversion(m.container);
    trace.run(1_600);
    expect(trace.flips).toEqual([]);
    expect(busy(m.container)).toBe(false);
  });

  it('catchUp toca as faixas na metade do tempo', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 } }], { catchUp: true });
    expect(banner(m.container)).toHaveTextContent('Vez de Duda');
    advance(199);
    expect(busy(m.container)).toBe(true);
    advance(1);
    expect(banner(m.container)).toHaveTextContent('Duda causou mais dano (9 × 3) e ficou com a iniciativa');
    advance(200);
    expect(busy(m.container)).toBe(false);
  });

  it('catchUp com muitas batidas cabe em 3 s', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, Array.from({ length: 40 }, () => TURN), { catchUp: true });
    expect(busy(m.container)).toBe(true);
    advance(2_999);
    expect(busy(m.container)).toBe(true);
    advance(1);
    expect(busy(m.container)).toBe(false);
  });

  it('resync não cria batida: a mesa troca de uma vez', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA], { resync: true });
    expect(busy(m.container)).toBe(false);
    expect(scene(m.container)).toBeNull();
    const trace = watchInversion(m.container);
    trace.run(1_600);
    expect(trace.flips).toEqual([]);
  });
});

describe('palco: pular as batidas (spec §4.1)', () => {
  it('um clique no palco termina as batidas na hora', async () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    expect(busy(m.container)).toBe(true);
    await m.user.click(stage(m.container));
    expect(busy(m.container)).toBe(false);
    expect(banner(m.container)).toBeNull();
  });

  it('um clique solto (sem toque antes, como o do teclado) também pula', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    fireEvent.click(stage(m.container));
    expect(busy(m.container)).toBe(false);
  });

  it('Esc termina as batidas na hora', async () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    expect(busy(m.container)).toBe(true);
    await m.user.keyboard('{Escape}');
    expect(busy(m.container)).toBe(false);
  });

  it('o Esc que a gaveta do histórico já tratou não pula as batidas', async () => {
    const m = mount(THEIRS);
    await m.user.click(screen.getByRole('button', { name: 'Histórico' }));
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    expect(busy(m.container)).toBe(true);
    await m.user.keyboard('{Escape}');
    expect(busy(m.container)).toBe(true);
  });

  it('pular com a inversão no ar a desliga na hora', async () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    advance(1_500);
    expect(inverted(m.container)).toBe(true);
    await m.user.click(stage(m.container));
    expect(inverted(m.container)).toBe(false);
    expect(busy(m.container)).toBe(false);
    // Nada religa depois: o pulo cancelou os timers da linha do tempo (a inversão já tinha ligado e foi cortada).
    advance(2_000);
    expect(inverted(m.container)).toBe(false);
  });

  it('o pulo com a inversão no ar depois de uma cena anterior não a desliga antes de a conta deixar', async () => {
    const m = mount(MINE);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    // Estado 1: cena, faixa e cena sob o teto de 1 s. A inversão fica suprimida; a cortina sobe em 0 e desce em 1000.
    emit(m, MINE, [SCENE, TURN, SCENE_2]);
    trace.sample();
    trace.run(1_250);
    // Estado 2, sem teto: a cortina sobe em 1250 e a inversão liga em 1400, por 600 ms (a quarta troca a exatos 1 s da primeira).
    emit(m, THEIRS, [SCENE]);
    trace.run(250);
    expect(inverted(m.container)).toBe(true);
    // O jogador pula aos 1500: desligar agora faria 4 trocas em 500 ms (1000, 1250, 1400, 1500).
    await m.user.click(stage(m.container));
    trace.sample();
    expect(busy(m.container)).toBe(false);
    expect(inverted(m.container)).toBe(true); // a mesa já está livre, só o visual segura
    trace.run(2_500);
    expect(trace.flips[1]).toEqual([1_400, 2_000]);
    expect(trace.flips[0]).toHaveLength(4); // 0 sobe, 1000 desce, 1250 sobe, e a descida depois do pulo
    expectFlashSafe(trace.all);
  });

  it('pular com a conta folgada desliga a inversão na hora (3 trocas: 0, 150 e 500)', async () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, THEIRS, [SCENE]);
    trace.sample();
    trace.run(500);
    await m.user.click(stage(m.container)); // a inversão ligou em 150: desligar aos 500 faz 3 trocas (0, 150, 500)
    trace.sample();
    expect(inverted(m.container)).toBe(false);
    trace.run(2_000);
    expectFlashSafe(trace.all);
  });

  it('pular ANTES de a inversão ligar a cancela: ela não liga depois, com a mesa já livre', async () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    advance(100);
    expect(inverted(m.container)).toBe(false);
    await m.user.click(stage(m.container));
    expect(busy(m.container)).toBe(false);
    const trace = watchInversion(m.container);
    trace.run(2_000);
    expect(trace.flips).toEqual([]);
    expect(scene(m.container)).toBeNull();
  });

  it('o pulo cancela os timers da linha do tempo (a inversão e a cortina agendadas não ficam esperando)', async () => {
    const m = mount(THEIRS);
    const baseline = vi.getTimerCount();
    emit(m, EXODIA_OVER, [EXODIA]);
    advance(50);
    await m.user.click(stage(m.container));
    advance(10); // a descida da cortina, que o pulo marca, dispara
    // Nada da linha do tempo velha (batida seguinte, inversão aos 150 ms, fim da cena, fim da linha) sobrou agendado.
    expect(vi.getTimerCount()).toBeLessThanOrEqual(baseline);
  });

  it('ligar "reduzir animações" com a cena no ar vale na hora de ligar a inversão', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    advance(50);
    act(() => m.session.setPrefs({ ...DEFAULT_PREFS, reduceMotion: true }));
    const trace = watchInversion(m.container);
    trace.run(1_600);
    expect(trace.flips).toEqual([]);
  });

  it('o toque que pulou não vira clique: a mão não escolhe carta no mesmo gesto', async () => {
    const m = mount(MINE);
    emit(m, MINE, [TURN, ATTACK, HIT, TURN, ATTACK, HIT]);
    const card = handList().getByRole('button', { name: /^A, Armadilha, de / });
    expect(busy(m.container)).toBe(true);
    await m.user.click(card);
    expect(busy(m.container)).toBe(false);
    expect(card).toHaveAttribute('aria-pressed', 'false');
    // O gesto seguinte, já sem batidas, escolhe a carta.
    await m.user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('o toque que pulou não manda jogada nenhuma', async () => {
    const m = mount(MINE);
    emit(m, MINE, [TURN, ATTACK, HIT, TURN, ATTACK, HIT]);
    await m.user.click(within(bar()).getByRole('button', { name: ATTACK_BUTTON }));
    expect(m.connection.sent).toEqual([]);
  });

  it('um toque sem batida não é engolido', async () => {
    const m = mount(MINE);
    await m.user.click(handList().getByRole('button', { name: /^A, Armadilha, de / }));
    expect(handList().getByRole('button', { name: /^A, Armadilha, de / })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('palco: os controles durante as batidas (spec §4.1)', () => {
  it('a barra fica desabilitada durante as batidas e volta depois (teto de 1 s com decisão esperando)', () => {
    const m = mount(MINE);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
    // Cinco faixas (2 s de batidas) cabem em 1 s porque uma decisão minha espera.
    emit(m, MINE, [TURN, TURN, TURN, TURN, TURN]);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeDisabled();
    advance(999);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeDisabled();
    advance(1);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('a mão fica apagada (aria-disabled) e focável durante as batidas, e volta depois', () => {
    const m = mount(MINE);
    const card = () => handList().getByRole('button', { name: /^A, Armadilha, de / });
    expect(card()).not.toHaveAttribute('aria-disabled');
    emit(m, MINE, [TURN, ATTACK]);
    expect(card()).toHaveAttribute('aria-disabled', 'true');
    expect(card().className).toContain('opacity-60');
    expect(card()).not.toBeDisabled();
    card().focus();
    expect(card()).toHaveFocus();
    advance(700);
    expect(card()).not.toHaveAttribute('aria-disabled');
    expect(card().className).not.toContain('opacity-60');
  });

  it('pular devolve os controles na hora', async () => {
    const m = mount(MINE);
    emit(m, MINE, [TURN, TURN, TURN, TURN, TURN]);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeDisabled();
    await m.user.keyboard('{Escape}');
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('com a jogada em voo, a mão também apaga e o toque numa carta não escolhe nada', async () => {
    const m = mount(MINE);
    const ack = deferredAck();
    m.connection.acks = [ack.promise];
    await m.user.click(within(bar()).getByRole('button', { name: ATTACK_BUTTON }));
    const card = handList().getByRole('button', { name: /^A, Armadilha, de / });
    expect(card).toHaveAttribute('aria-disabled', 'true');
    await m.user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'false');
    await act(async () => ack.resolve({ ok: true, seq: 9 }));
    expect(card).not.toHaveAttribute('aria-disabled');
  });

  it('o `state` da mesa de abertura não toca batida: não há de onde animar', () => {
    const m = mount(MINE, { events: [TURN, ATTACK, HIT] });
    expect(busy(m.container)).toBe(false);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('um `state` novo no meio das batidas troca a linha do tempo, e os controles seguem a nova', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, TURN, TURN, TURN]); // 1600 ms
    advance(500);
    emit(m, THEIRS, [TURN]); // 400 ms
    advance(399);
    expect(busy(m.container)).toBe(true);
    advance(1);
    expect(busy(m.container)).toBe(false);
    // O fim da linha velha (aos 1600 ms) não deixa nada para trás.
    advance(2_000);
    expect(busy(m.container)).toBe(false);
  });
});

describe('palco: trava global de flash (spec §10.4)', () => {
  it('dois `state`s com cena a 200 ms: a segunda cena não inverte, e nenhuma janela de 1 s passa de 3 trocas', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [SCENE]);
    trace.run(200);
    emit(m, THEIRS, [{ type: 'AbsoluteDefenseStarted', player: 'p2' }]);
    // A segunda cena toca (título na tela), mas sem inversão.
    expect(scene(m.container)).toHaveAttribute('data-cena', 'ABSOLUTE_DEFENSE');
    trace.run(4_000);
    // Uma inversão só: liga aos 150 ms e desliga aos 750 ms, a da primeira cena.
    expect(trace.flips).toEqual([150, 750]);
    expectFlashSafe(trace.flips);
  });

  it('a inversão que já está no ar não é cortada nem esquecida pelo `state` novo', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [SCENE]);
    trace.run(200);
    expect(inverted(m.container)).toBe(true);
    emit(m, THEIRS, [TURN]); // outro `state`, sem cena
    trace.run(1_000);
    expect(trace.flips).toEqual([150, 750]);
    expect(inverted(m.container)).toBe(false);
  });

  it('seis cenas coladas, uma a cada 200 ms: no máximo uma inversão a cada resfriamento', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    for (let i = 0; i < 6; i++) {
      emit(m, THEIRS, [SCENE]);
      trace.run(200);
    }
    trace.run(4_000);
    expectFlashSafe(trace.flips);
    expect(trace.flips).toEqual([150, 750]);
  });

  it('depois do resfriamento, a cena seguinte inverte de novo', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [SCENE]);
    trace.run(750 + INVERT_COOLDOWN_MS - 150); // a próxima inversão liga 150 ms depois do `state`
    emit(m, THEIRS, [SCENE]);
    trace.run(1_600);
    expect(trace.flips).toEqual([150, 750, 750 + INVERT_COOLDOWN_MS, 750 + INVERT_COOLDOWN_MS + 600]);
    expectFlashSafe(trace.flips);
  });

  it('um pouco antes do resfriamento acabar, a cena não inverte', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [SCENE]);
    trace.run(750 + INVERT_COOLDOWN_MS - 150 - 10);
    emit(m, THEIRS, [SCENE]);
    trace.run(1_600);
    expect(trace.flips).toEqual([150, 750]);
  });

  it('pular a inversão no ar não zera o resfriamento: ele conta do instante real do desligar', async () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [SCENE]);
    trace.run(300);
    await m.user.click(stage(m.container)); // desliga aos 300 ms
    trace.sample();
    // Uma cena nova 1 s depois liga aos 1150 ms: ainda dentro dos 2 s do desligar real (300 + 2000).
    trace.run(700);
    emit(m, THEIRS, [SCENE]);
    trace.run(1_600);
    expect(trace.flips).toEqual([150, 300]);
  });
});

describe('efeitos da batida (spec §4.2)', () => {
  it('AttackDeclared acende a fileira de Ataque de quem atacou; o ataque seguinte põe ATK contra DEF', () => {
    const m = mount(MINE);
    emit(m, MINE, [ATTACK, HIT]);
    const theirsAtk = screen.getByRole('group', { name: 'Fileira de ataque de Duda' });
    expect(theirsAtk).toHaveAttribute('data-aceso', 'true');
    expect(theirsAtk.querySelector('[data-fileira-acesa]')).toHaveTextContent('▼');
    expect(screen.getByRole('group', { name: 'Sua fileira de defesa' })).not.toHaveAttribute('data-aceso');
    advance(300);
    expect(screen.getByRole('group', { name: 'Sua fileira de defesa' })).toHaveAttribute('data-aceso', 'true');
    expect(theirsAtk).toHaveAttribute('data-aceso', 'true');
    expect(screen.getByRole('group', { name: 'Sua fileira de ataque' })).not.toHaveAttribute('data-aceso');
    advance(600);
    expect(theirsAtk).not.toHaveAttribute('data-aceso');
  });

  it('o número do dano sobe no Coringa que apanhou, na batida do dano', () => {
    const m = mount(MINE);
    const field = () => within(screen.getByRole('region', { name: 'Seu campo' }));
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    expect(m.container.querySelector('[data-dano]')).toBeNull();
    advance(300);
    expect(field().getByText('−50')).toBeInTheDocument();
    expect(m.container.querySelectorAll('[data-dano]')).toHaveLength(1);
    advance(600);
    expect(m.container.querySelector('[data-dano]')).toBeNull();
  });

  it('a vida espera a batida do dano, conta até o valor novo, e o leitor de tela já tem o valor da view', () => {
    const m = mount(MINE);
    const hp = () => Number(screen.getByRole('region', { name: 'Seu campo' }).querySelector('[data-hp]')!.textContent);
    const meter = () => screen.getByRole('meter', { name: 'Vida de André' });
    expect(hp()).toBe(187);
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    // A view já é a verdade para o leitor de tela e para a barra de ação...
    expect(meter()).toHaveAttribute('aria-valuenow', '137');
    // ...mas o número na tela espera o dano.
    expect(hp()).toBe(187);
    advance(299);
    expect(hp()).toBe(187);
    // O `act` só desenha no fim: um passo até o início da batida do dano, e então a contagem anda.
    advance(1);
    advance(150);
    expect(hp()).toBeLessThan(187);
    expect(hp()).toBeGreaterThan(137);
    advance(450);
    expect(hp()).toBe(137);
    advance(1_000);
    expect(hp()).toBe(137);
  });

  it('pular mostra a vida nova na hora', async () => {
    const m = mount(MINE);
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    await m.user.click(stage(m.container));
    expect(screen.getByRole('region', { name: 'Seu campo' }).querySelector('[data-hp]')).toHaveTextContent('137');
  });

  it('com movimento reduzido a vida troca direto', () => {
    const m = mount(MINE, { prefs: { reduceMotion: true } });
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    expect(screen.getByRole('region', { name: 'Seu campo' }).querySelector('[data-hp]')).toHaveTextContent('137');
  });

  it('o total da fileira também espera o dano e conta até o valor do motor', () => {
    const m = mount(MINE);
    const total = () => Number(screen.getByRole('group', { name: 'Sua fileira de defesa' }).querySelector('[data-total]')!.textContent);
    const before = total();
    emit(m, { ...MINE, self: { ...MINE.self, defenseRow: [3, 6, 9] } }, [ATTACK, HIT]);
    expect(total()).toBe(before);
    advance(900);
    expect(total()).toBeLessThan(before);
  });

  it('GuardBroken racha o K que foi para o cemitério', () => {
    const k = { id: 'k-quebrado', kind: 'K', suit: 'ouros' } as const;
    const m = mount(MINE);
    emit(m, { ...MINE, graveyard: [3, 5, 8, k] }, [{ type: 'GuardBroken', player: 'p1', cards: [k] }]);
    const card = m.container.querySelector('[data-card-id="k-quebrado"]')!;
    expect(card).toHaveAttribute('data-fx', 'crack');
    expect(card.querySelector('[data-fx-overlay="crack"]')).not.toBeNull();
    advance(400);
    expect(card).not.toHaveAttribute('data-fx');
    expect(card.querySelector('[data-fx-overlay]')).toBeNull();
  });

  it('Armadilha: a carta usada vai até o alvo e o alvo racha ao chegar no cemitério', () => {
    const trap = { id: 'a-usada', kind: 'A', suit: 'paus' } as const;
    const target = { id: 'k-alvo', kind: 'K', suit: 'copas' } as const;
    const m = mount(MINE);
    emit(m, { ...MINE, graveyard: [3, 5, 8, trap, target] }, [
      { type: 'TrapUsed', player: 'p1', card: trap, target, targetOwner: 'p2' },
    ]);
    expect(m.container.querySelector('[data-card-id="k-alvo"]')).toHaveAttribute('data-fx', 'crack');
  });

  it('QuadFormed acende as quatro cartas da quadra', () => {
    const m = mount(MINE);
    const spec: ViewSpec = { ...MINE, self: { ...MINE.self, attackRow: [7, 7, 7, 7, 3] } };
    emit(m, spec, [{ type: 'QuadFormed', player: 'p1', quad: { row: 'ATK', value: 7 } }]);
    const lit = screen.getByRole('group', { name: 'Sua fileira de ataque' }).querySelectorAll('[data-fx="light"]');
    expect(lit).toHaveLength(4);
    expect(banner(m.container)).toHaveTextContent('+7 e 1 Ressurreição');
    advance(400);
    expect(screen.getByRole('group', { name: 'Sua fileira de ataque' }).querySelectorAll('[data-fx]')).toHaveLength(0);
  });

  it('ReflectPlayed: cena do escudo, com as três cartas do Reflect em destaque', () => {
    const m = mount(MINE);
    const spec: ViewSpec = { ...MINE, self: { ...MINE.self, reflect: true } };
    const reflect = scenarioAt(spec).view.self.reflect!;
    emit(m, spec, [{ type: 'ReflectPlayed', player: 'p1', reflect, against: 'ATTACK' }]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'REFLECT_PLAYED');
    expect(scene(m.container)?.querySelector('svg')).not.toBeNull();
    const zone = within(screen.getByRole('list', { name: 'Cartas do Reflect' }));
    expect(zone.getAllByRole('img').filter((card) => card.getAttribute('data-fx') === 'shield')).toHaveLength(3);
  });

  it('ReflectTriggered: cena do ataque que volta, com o dano no atacante', () => {
    const m = mount(MINE);
    emit(m, { ...MINE, self: { ...MINE.self, hp: 150 } }, [{ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 37 }]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'REFLECT_TRIGGERED');
    expect(scene(m.container)).toHaveTextContent('O ataque voltou: 37 de dano em você');
    advance(0);
    expect(m.container.querySelector('[data-dano]')).toHaveTextContent('−37');
  });

  it('InitiativeDecided: a marca troca de lado (a view já é a nova)', () => {
    const m = mount(THEIRS);
    expect(m.container.querySelector('[data-iniciativa]')).toHaveAttribute('data-iniciativa', 'voce');
    emit(m, { ...THEIRS, initiative: 'opponent' }, [{ type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 } }]);
    expect(m.container.querySelector('[data-iniciativa]')).toHaveAttribute('data-iniciativa', 'oponente');
    expect(banner(m.container)).toHaveTextContent('Duda causou mais dano (9 × 3) e ficou com a iniciativa');
  });

  it('cada faixa mostra o texto do seu evento', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [{ type: 'RoundStarted', round: 8, kind: 'EQUIP' }]);
    expect(banner(m.container)).toHaveTextContent('Rodada 8 · Equipar');
    advance(400);
    emit(m, THEIRS, [{ type: 'DeckReshuffled', count: 9 }]);
    expect(banner(m.container)).toHaveTextContent('O cemitério virou o monte');
  });
});

describe('palco: Stage sozinho', () => {
  function Probe() {
    return <output data-testid="busy">{String(useBoardBusy())}</output>;
  }

  function stageOf(session: Session, reduced = false, onSettled?: () => void): ReactNode {
    return (
      <Stage snapshot={session.snapshot()} reducedMotion={reduced} onSettled={onSettled}>
        <Probe />
      </Stage>
    );
  }

  it('useBoardBusy é verdadeiro enquanto há batida e falso depois', () => {
    const { session, connection } = connect(THEIRS);
    const view = render(stageOf(session));
    expect(screen.getByTestId('busy')).toHaveTextContent('false');
    emit({ connection }, THEIRS, [TURN, ATTACK]);
    view.rerender(stageOf(session));
    expect(screen.getByTestId('busy')).toHaveTextContent('true');
    advance(700);
    expect(screen.getByTestId('busy')).toHaveTextContent('false');
  });

  it('fora de um palco, a mesa nunca está ocupada', () => {
    render(<Probe />);
    expect(screen.getByTestId('busy')).toHaveTextContent('false');
  });

  it('onSettled avisa uma vez no fim natural das batidas', () => {
    const { session, connection } = connect(THEIRS);
    const onSettled = vi.fn();
    const view = render(stageOf(session, false, onSettled));
    emit({ connection }, THEIRS, [TURN, ATTACK]);
    view.rerender(stageOf(session, false, onSettled));
    expect(onSettled).not.toHaveBeenCalled();
    advance(699);
    expect(onSettled).not.toHaveBeenCalled();
    advance(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
    advance(5_000);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  // O contrato do `data-sem-pulo` (só os controles do replay o usam): o que está dentro do elemento marcado não pula as batidas e o
  // clique nele chega; o que está fora continua pulando, e o toque que pulou continua não virando clique.
  it('data-sem-pulo: o controle marcado não pula as batidas e o clique chega; o sem marca pula e é engolido, como sempre', async () => {
    const { session, connection, user } = connect(THEIRS);
    const own = vi.fn();
    const table = vi.fn();
    const ui = () => (
      <Stage snapshot={session.snapshot()} reducedMotion={false}>
        <section data-sem-pulo>
          <button type="button" onClick={own}>
            Controle do replay
          </button>
        </section>
        <button type="button" onClick={table}>
          Botão da mesa
        </button>
      </Stage>
    );
    const view = render(ui());
    emit({ connection }, THEIRS, [TURN, ATTACK, HIT]);
    view.rerender(ui());
    expect(busy(view.container)).toBe(true);

    // Marcado (o botão está DENTRO do elemento marcado): as batidas seguem, e o clique é dele, uma vez por clique.
    await user.click(screen.getByRole('button', { name: 'Controle do replay' }));
    expect(own).toHaveBeenCalledTimes(1);
    expect(busy(view.container)).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Controle do replay' }));
    expect(own).toHaveBeenCalledTimes(2);
    expect(busy(view.container)).toBe(true);

    // Sem marca: o toque pula as batidas, e o clique do mesmo gesto não chega ao botão. O gesto seguinte, já sem batidas, chega.
    await user.click(screen.getByRole('button', { name: 'Botão da mesa' }));
    expect(busy(view.container)).toBe(false);
    expect(table).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Botão da mesa' }));
    expect(table).toHaveBeenCalledTimes(1);
    expect(own).toHaveBeenCalledTimes(2);
  });

  it('onSettled também avisa no pulo, e não avisa quando não houve batida', async () => {
    const { session, connection, user } = connect(THEIRS);
    const onSettled = vi.fn();
    const view = render(stageOf(session, false, onSettled));
    emit({ connection }, THEIRS, []);
    view.rerender(stageOf(session, false, onSettled));
    expect(onSettled).not.toHaveBeenCalled();
    emit({ connection }, THEIRS, [TURN, ATTACK]);
    view.rerender(stageOf(session, false, onSettled));
    await user.click(stage(view.container));
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});

describe('sobreposições sem pisca-pisca (spec §10.4: somando tudo o que estiver na tela)', () => {
  const strip = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-camada-faixa]')!;
  const layer = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-camada-cena]')!;
  const curtain = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-cortina]')!;
  // Uma faixa qualquer entre duas vezes (era a da Pressão da mesa, que saiu no sub-projeto 5).
  const BANNER: GameEvent = { type: 'OrderChosen', player: 'p2', first: true, turnOrder: ['p2', 'p1'] };

  it('as camadas ficam montadas e apagadas quando não há batida com sobreposição', () => {
    const m = mount(THEIRS);
    expect(strip(m.container).className).toContain('opacity-0');
    expect(curtain(m.container).className).toContain('opacity-0');
    expect(strip(m.container)).not.toHaveAttribute('data-faixa');
    expect(layer(m.container)).not.toHaveAttribute('data-cena');
    expect(curtain(m.container)).not.toHaveAttribute('data-ativa');
  });

  it('faixas seguidas são uma subida e uma descida: a mesma camada, sem piscar entre as batidas', () => {
    const m = mount(THEIRS);
    const first = strip(m.container);
    const trace = watchMany([() => banner(m.container) !== null]);
    emit(m, THEIRS, [TURN, BANNER, TURN, { type: 'RoundStarted', round: 8, kind: 'ATTACK' }]);
    trace.sample();
    trace.run(3_000);
    // A última faixa começa aos 1200 ms e fica o tempo de leitura dela (U1), além do fim das batidas (1600 ms).
    expect(trace.flips[0]).toEqual([0, 1_200 + bannerReadMs('Rodada 8 · Ataque')]);
    expect(strip(m.container)).toBe(first);
  });

  it('o catchUp toca dezenas de faixas (uma a cada ~75 ms) sem piscar: uma subida e uma descida em 3 s', () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => banner(m.container) !== null]);
    emit(m, THEIRS, Array.from({ length: 40 }, () => TURN), { catchUp: true });
    trace.sample();
    trace.run(3_200);
    expect(trace.flips[0]).toEqual([0, 3_000]);
  });

  it('o catchUp com eventos intercalados (a revisão final mediu 4 trocas em ~700 ms) é uma subida e uma descida só', () => {
    // Três faixas (TurnStarted, ReactionWindowOpened) entre batidas de movimento: antes, a camada subia e descia a cada
    // faixa, por fora da trava. No `catchUp` (velocidade dobrada) as batidas caem em 150, 150, 200, 150, 150 e 200 ms.
    const num = { id: 'n-5', kind: 'NUM', value: 5, suit: 'copas' } as const;
    const buff = { id: 'j-1', kind: 'J', suit: 'ouros' } as const;
    const target = { id: 'j-2', kind: 'J', suit: 'paus' } as const;
    const guard = { id: 'k-1', kind: 'K', suit: 'copas' } as const;
    const backlog: GameEvent[] = [
      { type: 'CardsRemovedFromRow', player: 'p2', row: 'ATK', cards: [num] },
      { type: 'CardsRemovedFromRow', player: 'p1', row: 'DEF', cards: [{ ...num, id: 'n-6', value: 6 }] },
      TURN,
      { type: 'Sacrificed', player: 'p2', card: buff, target, targetOwner: 'p1' },
      { type: 'GuardPlayed', player: 'p2', cards: [guard] },
      { type: 'ReactionWindowOpened', responder: 'p1', trigger: 'ATTACK' },
    ];
    const m = mount(THEIRS);
    const trace = watchMany([() => banner(m.container) !== null, () => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, THEIRS, backlog, { catchUp: true });
    trace.sample();
    trace.run(1_500);
    expectFlashSafe(trace.all);
    // Sobe na primeira faixa (300 ms) e desce no fim da última (1000 ms): nada de descer e subir no meio.
    expect(trace.flips[0]).toEqual([300, 1_000]);
    expect(trace.flips[1]).toEqual([]);
    expect(trace.flips[2]).toEqual([]);
  });

  it('faixas de dois `state`s colados são uma subida só, e a camada é a mesma', () => {
    const m = mount(THEIRS);
    const first = strip(m.container);
    const trace = watchMany([() => banner(m.container) !== null]);
    emit(m, THEIRS, [TURN, BANNER]);
    trace.sample();
    trace.run(200);
    emit(m, THEIRS, [TURN]);
    trace.run(1_500);
    // A faixa do segundo `state` fica o tempo de leitura dela (U1).
    expect(trace.flips[0]).toEqual([0, 200 + bannerReadMs('Vez de Duda')]);
    expect(strip(m.container)).toBe(first);
  });

  it('a faixa fica o tempo de leitura dela (U1), e os controles voltam antes, no fim das batidas', () => {
    const m = mount(MINE);
    emit(m, MINE, [{ type: 'TurnStarted', player: 'p1' }]);
    expect(banner(m.container)).toHaveTextContent('Sua vez');
    advance(450);
    expect(busy(m.container)).toBe(false);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
    expect(banner(m.container)).toHaveTextContent('Sua vez');
    advance(bannerReadMs('Sua vez') - 450 - 50);
    expect(banner(m.container)).not.toBeNull();
    advance(100);
    expect(banner(m.container)).toBeNull();
  });

  it('o pulo tira a faixa que ainda estava no tempo de leitura', async () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    expect(banner(m.container)).toHaveTextContent('Vez de Duda');
    await m.user.click(stage(m.container));
    advance(200);
    expect(banner(m.container)).toBeNull();
  });

  it('uma cena tira a faixa que ainda estava no tempo de leitura (as duas juntas repetiriam o texto)', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, SCENE]);
    advance(450);
    expect(scene(m.container)).not.toBeNull();
    expect(banner(m.container)).toBeNull();
    advance(2_000);
    expect(banner(m.container)).toBeNull();
  });

  it('duas cenas de `state`s colados: o escurecimento não solta entre elas, e tudo somado respeita as 3 trocas por segundo', () => {
    const m = mount(THEIRS);
    const first = layer(m.container);
    const trace = watchMany([() => scene(m.container) !== null, () => inverted(m.container)]);
    emit(m, THEIRS, [SCENE]);
    trace.sample();
    trace.run(200);
    emit(m, THEIRS, [SCENE_2]);
    trace.run(3_000);
    // O painel da cena: sobe com a primeira cena e desce no fim da segunda (aos 1700 ms), uma vez.
    expect(trace.flips[0]).toEqual([0, 1_700]);
    // A inversão: a da primeira cena, liga em 150 e desliga em 750.
    expect(trace.flips[1]).toEqual([150, 750]);
    expect(layer(m.container)).toBe(first);
    expectFlashSafe(trace.all);
  });

  it('com movimento reduzido a cena é o mesmo escurecimento com texto parado, sem inversão e sem piscar', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    const trace = watchMany([() => scene(m.container) !== null, () => inverted(m.container)]);
    emit(m, THEIRS, [SCENE]);
    trace.sample();
    emit(m, THEIRS, [SCENE_2]);
    trace.run(2_000);
    expect(trace.flips[1]).toEqual([]);
    expect(trace.flips[0]).toEqual([0, 1_500]);
  });
});

describe('cortina e inversão contam juntas (spec §10.4: no máximo 3 trocas por segundo, tudo somado)', () => {
  it.each([200, 600, 800])(
    'uma cena e, %i ms depois, um `state` sem cena: a cortina espera, e tudo somado respeita as 3 trocas por segundo',
    (gap) => {
      const m = mount(THEIRS);
      const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
      emit(m, THEIRS, [SCENE]);
      trace.sample();
      trace.run(gap);
      emit(m, THEIRS, [TURN]);
      trace.run(4_000);
      // A inversão da primeira cena liga aos 150 ms e desliga 600 ms depois: uma só.
      expect(trace.flips[1]).toEqual([150, 750]);
      // A cortina sobe com a cena e desce uma vez, nunca antes de 1 s no ar, mesmo com o `state` sem cena chegando antes.
      expect(trace.flips[0]).toHaveLength(2);
      expect(trace.flips[0]![1]! - trace.flips[0]![0]!).toBeGreaterThanOrEqual(FLASH_WINDOW_MS - SAMPLE_MS);
      expectFlashSafe(trace.all);
    },
  );

  it('a cortina desce depois da inversão apagar, não no meio dela (quatro trocas em 750 ms nunca)', () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, THEIRS, [SCENE]);
    trace.sample();
    trace.run(600);
    emit(m, THEIRS, [TURN]); // o bot responde aos 600 ms
    trace.run(2_000);
    expect(trace.all).toHaveLength(4);
    expect(trace.all[3]! - trace.all[0]!).toBeGreaterThanOrEqual(FLASH_WINDOW_MS - SAMPLE_MS);
  });

  it('cena, faixa e cena sob o teto de 1 s: uma subida e uma descida da cortina, o painel fica, e nada passa de 3 por segundo', () => {
    const m = mount(MINE);
    const trace = watchMany([
      () => curtainUp(m.container),
      () => scene(m.container) !== null,
      () => banner(m.container) !== null,
      () => inverted(m.container),
    ]);
    emit(m, MINE, [SCENE, TURN, SCENE_2]);
    trace.sample();
    trace.run(2_000);
    expect(trace.flips[0]).toHaveLength(2); // a cortina
    expect(trace.flips[1]).toHaveLength(2); // o painel da cena: não some na faixa do meio
    expect(trace.flips[2]).toEqual([]); // a faixa do meio espera a cortina
    expect(trace.flips[0]![1]! - trace.flips[0]![0]!).toBeGreaterThanOrEqual(FLASH_WINDOW_MS - SAMPLE_MS);
    expectFlashSafe(trace.all);
  });

  it('o pulo antes de a inversão ligar deixa só a subida e a descida da cortina, que nunca fica presa', async () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, EXODIA_OVER, [EXODIA]);
    trace.sample();
    trace.run(100);
    await m.user.click(stage(m.container));
    trace.sample();
    trace.run(3_000);
    expect(trace.flips[1]).toEqual([]);
    expect(trace.flips[0]).toHaveLength(2);
    expect(curtainUp(m.container)).toBe(false);
  });

  it('a regra cheia: a cena aparece sem a cortina (só o painel) e sem inversão', async () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, THEIRS, [SCENE]); // a cortina sobe em 0 e a inversão liga em 150
    trace.sample();
    trace.run(400);
    await m.user.click(stage(m.container)); // pulo aos 400: a inversão corta, e a cortina espera a regra deixar (1000)
    trace.sample();
    trace.run(700); // 1100: a cortina desceu aos 1000, e as três últimas trocas ainda estão dentro de 1 s
    expect(curtainUp(m.container)).toBe(false);
    emit(m, THEIRS, [{ type: 'AbsoluteDefenseStarted', player: 'p2' }]);
    trace.sample();
    trace.run(1_700);
    // A segunda cena não ganha cortina (quebraria o limite) nem inversão (resfriamento), mas o painel aparece.
    expect(trace.flips[0]).toHaveLength(2);
    expect(trace.flips[1]).toEqual([150, 400]);
    expectFlashSafe(trace.all);
  });

  // A faixa também conta (spec §10.4: tudo o que estiver na tela, somado). Um `catchUp` que chega logo depois de uma cena ao vivo
  // (a reconexão cai no meio dela) tem faixa esperando a cortina: ela subia no instante em que a cortina descia, por fora da trava
  // (a revisão final mediu 4 trocas em ~850 ms). Agora ela sobe e desce pela mesma `FlashLock`, e segura quando a regra não deixa.
  it.each([100, 200, 300, 400, 500, 600, 700, 800, 900])(
    'um catchUp %i ms depois de uma cena ao vivo: faixa, cortina e inversão somadas respeitam as 3 trocas por segundo',
    (gap) => {
      const m = mount(THEIRS);
      const trace = watchMany([() => banner(m.container) !== null, () => curtainUp(m.container), () => inverted(m.container)]);
      emit(m, THEIRS, [SCENE]);
      trace.sample();
      trace.run(gap);
      emit(m, THEIRS, Array.from({ length: 6 }, () => TURN), { catchUp: true });
      trace.sample();
      trace.run(4_000);
      expectFlashSafe(trace.all);
      // A cena ao vivo segue invertendo como antes (o `catchUp` que chega antes dos 150 ms a encerra antes da inversão ligar).
      if (gap >= 200) expect(trace.flips[2]).toEqual([150, 750]);
      // A cortina sobe com a cena e desce uma vez; a faixa sobe e desce no máximo uma vez, e nada fica no ar.
      expect(trace.flips[1]).toHaveLength(2);
      expect(trace.flips[0]!.length).toBeLessThanOrEqual(2);
      expect(banner(m.container)).toBeNull();
      expect(curtainUp(m.container)).toBe(false);
    },
  );

  // A faixa ao vivo gasta trocas da janela (sobe e desce), e a cena que vem logo depois (o Ataque Absoluto, o Reflect ou a Exódia
  // saem de uma janela de reação, depois da faixa "X pode reagir") encontra a conta cheia. A inversão espera, dentro da cena, o
  // primeiro instante em que cabe inteira, em vez de não acontecer.
  const expectInvertedWithinScene = (flips: number[], sceneStart: number, sceneEnd: number) => {
    expect(flips).toHaveLength(2);
    expect(flips[0]!).toBeGreaterThanOrEqual(sceneStart);
    expect(flips[1]!).toBeLessThanOrEqual(sceneEnd + SAMPLE_MS);
    expect(flips[1]! - flips[0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
  };

  it.each([300, 500, 700, 1_000])(
    'faixa ao vivo e, %i ms depois, uma cena ao vivo: a inversão espera a conta deixar, dentro da cena, e tudo somado respeita as 3 trocas',
    (gap) => {
      const m = mount(THEIRS);
      const trace = watchMany([() => banner(m.container) !== null, () => curtainUp(m.container), () => inverted(m.container)]);
      emit(m, THEIRS, [TURN]);
      trace.sample();
      trace.run(gap);
      emit(m, THEIRS, [SCENE]);
      trace.sample();
      trace.run(3_000);
      expectFlashSafe(trace.all);
      expectInvertedWithinScene(trace.flips[2]!, gap, gap + 1_500);
    },
  );

  it('defensor: a faixa "Você pode reagir", o passe assim que os controles voltam e o Ataque Absoluto: a cena ainda inverte', () => {
    const m = mount(MINE);
    const trace = watchMany([() => banner(m.container) !== null, () => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, MINE, [ATTACK, { type: 'ReactionWindowOpened', responder: 'p1', trigger: 'ATTACK' }]);
    trace.sample();
    let elapsed = 0;
    while (busy(m.container)) {
      trace.run(10);
      elapsed += 10;
    }
    emit(m, MINE, [{ type: 'ReactionWindowClosed', responder: 'p1', trigger: 'ATTACK' }, ABSOLUTE]);
    trace.sample();
    trace.run(3_000);
    expectFlashSafe(trace.all);
    // Mesmo com uma decisão minha esperando, a cena rara não encolhe (U3): a inversão cabe dentro dela.
    expectInvertedWithinScene(trace.flips[2]!, elapsed, elapsed + RARE_SCENE_MS.ABSOLUTE_ATTACK);
  });

  it('a faixa que a trava segura não segura os controles: a decisão chega no teto de 1 s', () => {
    const m = mount(MINE);
    emit(m, MINE, [SCENE]);
    advance(300);
    // O `catchUp` chega com a cortina da cena no ar e uma decisão minha esperando.
    emit(m, MINE, Array.from({ length: 6 }, () => TURN), { catchUp: true });
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeDisabled();
    // De 10 em 10 ms, como num navegador: a faixa sobe e desce pelos efeitos de cada desenho.
    watchMany([]).run(1_000);
    // A premissa: a faixa ainda está no ar, segura pela trava, quando os controles voltam.
    expect(banner(m.container)).not.toBeNull();
    expect(busy(m.container)).toBe(false);
    expect(within(bar()).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('com a cortina negada, o painel da cena ainda aparece', async () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [SCENE]);
    advance(400);
    await m.user.click(stage(m.container));
    advance(700);
    emit(m, THEIRS, [{ type: 'AbsoluteDefenseStarted', player: 'p2' }]);
    advance(50);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'ABSOLUTE_DEFENSE');
    expect(curtainUp(m.container)).toBe(false);
    expect(inverted(m.container)).toBe(false);
  });
});

describe('CardsDealt e Reflect (spec §4.2)', () => {
  const newCard = { id: 'n-novo', kind: 'K', suit: 'copas' } as const;
  const dealt: ViewSpec = {
    ...MINE,
    self: { ...MINE.self, hand: ['K', 'A', 'Q', newCard] },
    opponent: { ...MINE.opponent, hand: ['A', 'K', 'WILD', 'A'] },
  };
  const DEALS: GameEvent[] = [
    TURN,
    { type: 'CardsDealt', player: 'p1', count: 1, cards: [newCard] },
    { type: 'CardsDealt', player: 'p2', count: 1 },
  ];

  it('a carta que chega fica apagada até a batida dela e esmaece nela (só opacidade)', () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    const card = () => m.container.querySelector<HTMLElement>('[data-card-id="n-novo"]')!;
    expect(card()).toHaveAttribute('data-entra', '0.4');
    // As outras cartas da mão não entram.
    expect(m.container.querySelectorAll('[data-card-id][data-entra]')).toHaveLength(1);
    advance(1_000);
    expect(card()).not.toHaveAttribute('data-entra');
  });

  it('o verso da mão do oponente: só os que chegam esmaecem, na batida deles', () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    const backs = [...screen.getByRole('region', { name: 'Campo de Duda' }).querySelectorAll('[data-verso]')];
    expect(backs).toHaveLength(4);
    expect(backs.map((back) => back.getAttribute('data-entra'))).toEqual([null, null, null, '0.7']);
    advance(1_000);
    expect(m.container.querySelectorAll('[data-verso][data-entra]')).toHaveLength(0);
  });

  it('pular mostra as cartas que chegam na hora', async () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    await m.user.click(stage(m.container));
    expect(m.container.querySelectorAll('[data-entra]')).toHaveLength(0);
  });

  it('o foco numa carta que o pulo remonta volta para ela', async () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    const before = m.container.querySelector<HTMLElement>('[data-card-id="n-novo"]')!;
    before.focus();
    expect(document.activeElement).toBe(before);
    await m.user.keyboard('{Escape}');
    const after = m.container.querySelector<HTMLElement>('[data-card-id="n-novo"]')!;
    expect(after).not.toBe(before);
    expect(document.activeElement).toBe(after);
  });

  it('devolver o foco depois da remontagem não conta como interação do jogador nem apaga a marca "novo"', async () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    const card = () => m.container.querySelector<HTMLElement>('[data-card-id="n-novo"]')!;
    card().focus();
    const interact = vi.spyOn(m.session, 'interact');
    const markSeen = vi.spyOn(m.session, 'markSeen');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await m.user.keyboard('{Escape}');
    expect(document.activeElement).toBe(card());
    expect(interact).not.toHaveBeenCalled();
    expect(markSeen).not.toHaveBeenCalled();
    // E sem rolar a mesa.
    expect(focus.mock.calls.some(([options]) => options?.preventScroll === true)).toBe(true);
    focus.mockRestore();
  });

  it('o foco que o jogador tirou da carta não volta num encerramento seguinte', async () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    const card = () => m.container.querySelector<HTMLElement>('[data-card-id="n-novo"]')!;
    card().focus();
    await m.user.keyboard('{Escape}'); // pulo: a carta remonta e recebe o foco de volta
    expect(document.activeElement).toBe(card());
    card().blur(); // o jogador tirou o foco da carta
    emit(m, dealt, DEALS);
    await m.user.keyboard('{Escape}'); // outro pulo remonta a mesma carta
    expect(document.activeElement).toBe(document.body);
  });

  it('só a carta remontada por ESTE encerramento recebe o foco de volta: uma carta que ninguém remontou fica como está', async () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    const other = handList().getByRole('button', { name: /^A, Armadilha, de / });
    other.focus();
    await m.user.keyboard('{Escape}');
    expect(document.activeElement).toBe(other);
  });

  it('uma carta que saiu da mesa com o foco não puxa o foco de volta num encerramento posterior', async () => {
    const m = mount(MINE);
    handList().getByRole('button', { name: /^A, Armadilha, de / }).focus();
    // O `state` seguinte tira a carta da mão sem batida nenhuma: o foco cai no corpo da página.
    emit(m, { ...MINE, self: { ...MINE.self, hand: ['K', 'Q'] } }, []);
    expect(document.activeElement).toBe(document.body);
    // Um pulo depois, de outra linha do tempo (que não remonta essa carta), não leva o foco a lugar nenhum.
    emit(m, dealt, DEALS);
    await m.user.keyboard('{Escape}');
    expect(document.activeElement).toBe(document.body);
  });

  it('se a carta que tinha o foco deixou de ser um botão, o foco vai para o painel de baixo', async () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    m.container.querySelector<HTMLElement>('[data-card-id="n-novo"]')!.focus();
    // Um `state` novo tira a carta da mão no meio das batidas: o foco que ela tinha cai no painel.
    emit(m, MINE, []);
    expect(document.activeElement).toBe(m.container.querySelector('[data-painel]'));
  });

  it('o Reflect contra Reflect quebra o escudo no Coringa do dono, na batida', () => {
    const m = mount(MINE);
    emit(m, MINE, [TURN, { type: 'ReflectCanceled', player: 'p1', owner: 'p2' }]);
    const theirs = () => screen.getByRole('region', { name: 'Campo de Duda' });
    const mine = () => screen.getByRole('region', { name: 'Seu campo' });
    expect(theirs().querySelector('[data-escudo-quebra]')).toBeNull();
    advance(400);
    expect(theirs().querySelector('[data-escudo-quebra]')).not.toBeNull();
    expect(mine().querySelector('[data-escudo-quebra]')).toBeNull();
    advance(300);
    expect(theirs().querySelector('[data-escudo-quebra]')).toBeNull();
  });

  it('o escudo que quebra também aparece no Coringa do próprio dono, com movimento reduzido só esmaecendo', () => {
    const m = mount(MINE, { prefs: { reduceMotion: true } });
    emit(m, MINE, [{ type: 'ReflectCanceled', player: 'p2', owner: 'p1' }]);
    expect(screen.getByRole('region', { name: 'Seu campo' }).querySelector('[data-escudo-quebra]')).not.toBeNull();
  });

  it('a conta da fileira acompanha o total mostrado: não mostra o multiplicador novo com o total velho', () => {
    const m = mount(THEIRS);
    const row = () => screen.getByRole('group', { name: 'Sua fileira de defesa' });
    expect(row().querySelector('[data-total]')).toHaveTextContent('46');
    expect(row().querySelector('[data-conta]')).toHaveTextContent('23 × 2');
    // O Q dos buffs de defesa some: o total do motor cai para 23 (23 × 1), mas só na batida do dano.
    emit(m, { ...THEIRS, self: { ...THEIRS.self, defenseBuffs: [] } }, [TURN, ATTACK, HIT]);
    expect(row().querySelector('[data-total]')).toHaveTextContent('46');
    expect(row().querySelector('[data-conta]')).toHaveTextContent('23 × 2');
    advance(1_300);
    expect(row().querySelector('[data-total]')).toHaveTextContent('23');
    expect(row().querySelector('[data-conta]')).toHaveTextContent('23 × 1');
  });

  it('o balão do motivo (fora da sua vez) fica o tempo de leitura e some sozinho (B2)', async () => {
    const m = mount(THEIRS);
    await m.user.click(handList().getAllByRole('button')[0]!);
    const note = () => document.querySelector('[data-motivo]');
    const text = note()!.textContent!;
    expect(text).toMatch(/: espere a sua vez/);
    advance(readingMs(text) - 100);
    expect(note()).not.toBeNull();
    advance(200);
    expect(note()).toBeNull();
  });

  it('a carta da frente que sai no ataque não inventa multiplicador: base e multiplicador esperam juntos (B1)', () => {
    // Defesa 9 + 3 + 6 + 5 = 23 com 1 Q: 46 (23 × 2). O golpe tira o 9 da frente: 14 × 2 = 28. Dividir o total velho pela base nova
    // dava "14 × 3", um Q que não está na mesa.
    const spec: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, defenseRow: [9, 3, 6, 5] } };
    const m = mount(spec);
    const row = () => screen.getByRole('group', { name: 'Sua fileira de defesa' });
    expect(row().querySelector('[data-conta]')).toHaveTextContent('23 × 2');
    emit(m, { ...spec, self: { ...spec.self, defenseRow: [3, 6, 5] } }, [TURN, ATTACK, HIT]);
    expect(row().querySelector('[data-total]')).toHaveTextContent('46');
    expect(row().querySelector('[data-conta]')).toHaveTextContent('23 × 2');
    for (let elapsed = 0; elapsed < 1_300; elapsed += 50) {
      advance(50);
      expect(row().querySelector('[data-conta]')?.textContent).toMatch(/^(23|14) × 2$/);
    }
    expect(row().querySelector('[data-total]')).toHaveTextContent('28');
    expect(row().querySelector('[data-conta]')).toHaveTextContent('14 × 2');
  });
});

describe('o painel da cena esmaece (spec §4.1 e §10.4: nada de troca brusca de luminância)', () => {
  const panel = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-painel-cena]')!;

  it.each([false, true])('aparece e some com esmaecimento, e fica montado (movimento reduzido: %s)', (reduceMotion) => {
    const m = mount(THEIRS, { prefs: { reduceMotion } });
    const first = panel(m.container);
    // Montado desde o começo, apagado: o primeiro aparecer também é um esmaecimento.
    expect(first.className).toContain('transition-opacity');
    expect(first.className).toContain('opacity-0');
    emit(m, THEIRS, [ABSOLUTE]);
    expect(panel(m.container)).toBe(first);
    expect(first.className).toContain('opacity-100');
    expect(first.className).not.toContain('opacity-0');
    expect(first).toHaveAttribute('data-ativo', 'true');
    advance(RARE_SCENE_MS.ABSOLUTE_ATTACK + 100);
    // No fim da cena o painel continua na página, com o texto dela, só apagado.
    expect(panel(m.container)).toBe(first);
    expect(first.className).toContain('opacity-0');
    expect(first.className).toContain('transition-opacity');
    expect(first).not.toHaveAttribute('data-ativo');
    expect(first).toHaveTextContent('ATAQUE ABSOLUTO');
  });

  it('com a cortina negada o painel também esmaece, e nenhuma cortina sobe', async () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [SCENE]);
    advance(400);
    await m.user.click(stage(m.container));
    advance(700);
    emit(m, THEIRS, [{ type: 'AbsoluteDefenseStarted', player: 'p2' }]);
    expect(curtainUp(m.container)).toBe(false);
    expect(panel(m.container).className).toContain('opacity-100');
    expect(panel(m.container).className).toContain('transition-opacity');
  });
});

describe('o toque que pulou e o clique que não veio', () => {
  const toggle = () => screen.getByRole('button', { name: 'Histórico' });

  it('sem clique depois (rolagem, o navegador descartou), o Enter do teclado que vem depois não é engolido', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    fireEvent.pointerDown(stage(m.container));
    fireEvent.pointerUp(stage(m.container));
    expect(busy(m.container)).toBe(false);
    advance(500);
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('pointercancel solta a marca na hora', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    fireEvent.pointerDown(stage(m.container));
    fireEvent.pointerCancel(stage(m.container));
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('o clique do mesmo gesto, mesmo atrasado até a tolerância, ainda é engolido', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [TURN, ATTACK, HIT]);
    fireEvent.pointerDown(stage(m.container));
    fireEvent.pointerUp(stage(m.container));
    advance(300);
    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('avisos e acessibilidade', () => {
  it('a mão apagada por conexão caída é aria-disabled, não desabilitada, e volta com a conexão', () => {
    const m = mount(MINE);
    const card = () => handList().getByRole('button', { name: /^A, Armadilha, de / });
    act(() => m.connection.emitClosed(1006, false));
    expect(card()).toHaveAttribute('aria-disabled', 'true');
    expect(card()).not.toBeDisabled();
    act(() => m.connection.emit({ type: 'open' }));
    expect(card()).not.toHaveAttribute('aria-disabled');
  });

  it('a região do aviso de W.O. fica sempre montada: é a mesma, e só o texto troca', () => {
    const m = mount(MINE);
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    const dropped = (woAt?: number) =>
      roomMessage({
        status: 'PLAYING',
        seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda', { connected: false, ...(woAt === undefined ? {} : { woAt }) })],
        score: { p1: 0, p2: 0 },
      });
    act(() => m.connection.emitRoom(dropped()));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(/^Duda caiu\.$/);
    act(() => m.connection.emitRoom(dropped(43_000)));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Duda caiu. Se não voltar a tempo, você vence por W.O.');
    act(() =>
      m.connection.emitRoom(
        roomMessage({ status: 'PLAYING', seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda')], score: { p1: 0, p2: 0 } }),
      ),
    );
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toBeEmptyDOMElement();
  });

  it('sem violações sérias do axe: parada, com cena e com faixa', async () => {
    const m = mount(THEIRS);
    // O axe usa timers próprios: volta aos reais antes de rodar (a cena e a faixa seguem no DOM).
    vi.useRealTimers();
    expect(await seriousViolations(m.container)).toEqual([]);
    emit(m, THEIRS, [TURN]);
    expect(banner(m.container)).not.toBeNull();
    expect(await seriousViolations(m.container)).toEqual([]);
    // A cena depois da faixa: a cortina da cena seguraria a faixa seguinte, então a faixa vem primeiro.
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).not.toBeNull();
    expect(await seriousViolations(m.container)).toEqual([]);
  });
});
