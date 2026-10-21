// As animações pela linha do tempo (spec §4, §10.1, §10.4): o palco (`Stage`) toca as batidas do último `state`, inverte a
// tela inteira nas cenas, respeita a trava global de flash, pula no toque e no Esc e desliga os controles enquanto toca.
// No jsdom o Motion não anima (sem layout nem WAAPI): os testes conferem a máquina do palco com timers falsos (batidas
// agendadas, inversão ligada e desligada no tempo certo, busy, pulo, movimento reduzido, catchUp, resync, trava) e os
// efeitos pelos atributos que a mesa deixa no DOM, não os pixels. O harness está em `anim-harness.tsx`.
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../../src/model/session.ts';
import { DEFAULT_PREFS } from '../../src/model/storage.ts';
import { INVERT_COOLDOWN_MS, INVERT_MIN_HOLD_MS } from '../../src/model/timeline.ts';
import { useBoardBusy } from '../../src/ui/anim/context.ts';
import { Stage } from '../../src/ui/anim/Stage.tsx';
import { deferredAck, scenarioAt, type ViewSpec } from '../fixtures.ts';
import {
  ABSOLUTE,
  advance,
  ATTACK,
  banner,
  bar,
  busy,
  cleanup,
  connect,
  emit,
  EXODIA,
  EXODIA_OVER,
  expectFlashSafe,
  handList,
  HIT,
  inverted,
  MINE,
  mount,
  scene,
  seatOf,
  stage,
  THEIRS,
  TURN,
  watchInversion,
} from './anim-harness.tsx';
import { roomMessage, seriousViolations } from './support.tsx';

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
    trace.run(1_600);
    // Liga aos 150 ms, desliga 600 ms depois: uma inversão só, e mantida bem mais que o piso de 300 ms.
    expect(trace.flips).toEqual([150, 750]);
    expect(trace.flips[1]! - trace.flips[0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expect(busy(m.container)).toBe(false);
  });

  it('a inversão é o `filter: invert(1)` do palco, e só dura enquanto está ligada', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(stage(m.container).style.filter).toBe('');
    advance(150);
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
    advance(1_499);
    expect(scene(m.container)).not.toBeNull();
    advance(1);
    expect(scene(m.container)).toBeNull();
  });

  it('a sobreposição fica escondida do leitor de tela (o histórico é o registro)', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('uma cena dentro do teto de 1 s (decisão esperando) inverte por ≥ 300 ms ou não inverte', () => {
    const m = mount(MINE);
    emit(m, MINE, [ABSOLUTE]);
    const trace = watchInversion(m.container);
    trace.run(1_100);
    expect(trace.flips.length % 2).toBe(0);
    if (trace.flips.length > 0) {
      expect(trace.flips[1]! - trace.flips[0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    }
    expect(busy(m.container)).toBe(false);
  });
});

describe('palco: movimento reduzido (spec §4.1, §10.4)', () => {
  it('pela preferência do menu: a cena vira texto parado com esmaecimento, sem inversão', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('data-reduzido', 'true');
    expect(scene(m.container)).toHaveTextContent('EXÓDIA!');
    const trace = watchInversion(m.container);
    trace.run(1_600);
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
    trace.run(1_600);
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
    trace.run(1_600);
    expect(trace.flips).toEqual([150, 750]);
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
    trace.run(1_600);
    expect(trace.flips).toEqual([]);
  });

  it('o menu que liga "reduzir animações" com a partida aberta vale no `state` seguinte', () => {
    const m = mount(THEIRS);
    act(() => m.session.setPrefs({ ...DEFAULT_PREFS, reduceMotion: true }));
    emit(m, EXODIA_OVER, [EXODIA]);
    const trace = watchInversion(m.container);
    trace.run(1_600);
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
    emit(m, THEIRS, [TURN, { type: 'PressureChanged', pressure: 2 }], { catchUp: true });
    expect(banner(m.container)).toHaveTextContent('Vez de Duda');
    advance(199);
    expect(busy(m.container)).toBe(true);
    advance(1);
    expect(banner(m.container)).toHaveTextContent('Pressão da mesa: +2');
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
    advance(300);
    expect(inverted(m.container)).toBe(true);
    await m.user.click(stage(m.container));
    expect(inverted(m.container)).toBe(false);
    expect(busy(m.container)).toBe(false);
    // Nada religa depois: os timers da linha do tempo foram cancelados.
    advance(2_000);
    expect(inverted(m.container)).toBe(false);
  });

  it('o toque que pulou não vira clique: a mão não escolhe carta no mesmo gesto', async () => {
    const m = mount(MINE);
    emit(m, MINE, [TURN, ATTACK, HIT, TURN, ATTACK, HIT]);
    const card = handList().getByRole('button', { name: /^A de / });
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
    await m.user.click(within(bar()).getByRole('button', { name: 'Atacar' }));
    expect(m.connection.sent).toEqual([]);
  });

  it('um toque sem batida não é engolido', async () => {
    const m = mount(MINE);
    await m.user.click(handList().getByRole('button', { name: /^A de / }));
    expect(handList().getByRole('button', { name: /^A de / })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('palco: os controles durante as batidas (spec §4.1)', () => {
  it('a barra fica desabilitada durante as batidas e volta depois (teto de 1 s com decisão esperando)', () => {
    const m = mount(MINE);
    expect(within(bar()).getByRole('button', { name: 'Atacar' })).toBeEnabled();
    // Cinco faixas (2 s de batidas) cabem em 1 s porque uma decisão minha espera.
    emit(m, MINE, [TURN, TURN, TURN, TURN, TURN]);
    expect(within(bar()).getByRole('button', { name: 'Atacar' })).toBeDisabled();
    advance(999);
    expect(within(bar()).getByRole('button', { name: 'Atacar' })).toBeDisabled();
    advance(1);
    expect(within(bar()).getByRole('button', { name: 'Atacar' })).toBeEnabled();
  });

  it('a mão fica apagada (aria-disabled) e focável durante as batidas, e volta depois', () => {
    const m = mount(MINE);
    const card = () => handList().getByRole('button', { name: /^A de / });
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
    expect(within(bar()).getByRole('button', { name: 'Atacar' })).toBeDisabled();
    await m.user.keyboard('{Escape}');
    expect(within(bar()).getByRole('button', { name: 'Atacar' })).toBeEnabled();
  });

  it('com a jogada em voo, a mão também apaga e o toque numa carta não escolhe nada', async () => {
    const m = mount(MINE);
    const ack = deferredAck();
    m.connection.acks = [ack.promise];
    await m.user.click(within(bar()).getByRole('button', { name: 'Atacar' }));
    const card = handList().getByRole('button', { name: /^A de / });
    expect(card).toHaveAttribute('aria-disabled', 'true');
    await m.user.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'false');
    await act(async () => ack.resolve({ ok: true, seq: 9 }));
    expect(card).not.toHaveAttribute('aria-disabled');
  });

  it('o `state` da mesa de abertura não toca batida: não há de onde animar', () => {
    const m = mount(MINE, { events: [TURN, ATTACK, HIT] });
    expect(busy(m.container)).toBe(false);
    expect(within(bar()).getByRole('button', { name: 'Atacar' })).toBeEnabled();
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
    emit(m, THEIRS, [ABSOLUTE]);
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
    emit(m, THEIRS, [ABSOLUTE]);
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
      emit(m, THEIRS, [ABSOLUTE]);
      trace.run(200);
    }
    trace.run(4_000);
    expectFlashSafe(trace.flips);
    expect(trace.flips).toEqual([150, 750]);
  });

  it('depois do resfriamento, a cena seguinte inverte de novo', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [ABSOLUTE]);
    trace.run(750 + INVERT_COOLDOWN_MS - 150); // a próxima inversão liga 150 ms depois do `state`
    emit(m, THEIRS, [ABSOLUTE]);
    trace.run(1_600);
    expect(trace.flips).toEqual([150, 750, 750 + INVERT_COOLDOWN_MS, 750 + INVERT_COOLDOWN_MS + 600]);
    expectFlashSafe(trace.flips);
  });

  it('um pouco antes do resfriamento acabar, a cena não inverte', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [ABSOLUTE]);
    trace.run(750 + INVERT_COOLDOWN_MS - 150 - 10);
    emit(m, THEIRS, [ABSOLUTE]);
    trace.run(1_600);
    expect(trace.flips).toEqual([150, 750]);
  });

  it('pular a inversão no ar não zera o resfriamento: ele conta do instante real do desligar', async () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [ABSOLUTE]);
    trace.run(300);
    await m.user.click(stage(m.container)); // desliga aos 300 ms
    trace.sample();
    // Uma cena nova 1 s depois liga aos 1150 ms: ainda dentro dos 2 s do desligar real (300 + 2000).
    trace.run(700);
    emit(m, THEIRS, [ABSOLUTE]);
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
    emit(m, spec, [{ type: 'ReflectPlayed', player: 'p1', reflect }]);
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

  it('InitiativeChanged: a marca troca de lado (a view já é a nova)', () => {
    const m = mount(THEIRS);
    expect(m.container.querySelector('[data-iniciativa]')).toHaveAttribute('data-iniciativa', 'voce');
    emit(m, { ...THEIRS, initiative: 'opponent' }, [{ type: 'InitiativeChanged', player: 'p2' }]);
    expect(m.container.querySelector('[data-iniciativa]')).toHaveAttribute('data-iniciativa', 'oponente');
    expect(banner(m.container)).toHaveTextContent('Duda ficou com a iniciativa');
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

describe('avisos e acessibilidade', () => {
  it('a mão apagada por conexão caída é aria-disabled, não desabilitada, e volta com a conexão', () => {
    const m = mount(MINE);
    const card = () => handList().getByRole('button', { name: /^A de / });
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
        score: { p1: 0, p2: 0, draws: 0 },
      });
    act(() => m.connection.emitRoom(dropped()));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(/^Duda caiu\.$/);
    act(() => m.connection.emitRoom(dropped(43_000)));
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Duda caiu. Se não voltar a tempo, você vence por W.O.');
    act(() =>
      m.connection.emitRoom(
        roomMessage({ status: 'PLAYING', seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda')], score: { p1: 0, p2: 0, draws: 0 } }),
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
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).not.toBeNull();
    expect(await seriousViolations(m.container)).toEqual([]);
    emit(m, THEIRS, [TURN]);
    expect(banner(m.container)).not.toBeNull();
    expect(await seriousViolations(m.container)).toEqual([]);
  });
});
