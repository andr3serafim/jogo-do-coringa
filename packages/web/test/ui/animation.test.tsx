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
import { BEAT_MS, INVERT_COOLDOWN_MS, INVERT_MIN_HOLD_MS, NO_INVERT, RARE_SCENE_MS, type SceneKind } from '../../src/model/timeline.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { useAnim, useBoardBusy } from '../../src/ui/anim/context.ts';
import { HIT_COUNT_MS, Stage } from '../../src/ui/anim/Stage.tsx';
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
  installFlashProbe,
} from './anim-harness.tsx';
import { ATTACK_BUTTON, roomMessage, seriousViolations } from './support.tsx';

afterEach(cleanup);

// ---------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------

/** A coroa crava na Exódia: o instante da inversão dela (sub-projeto 6 §7.3). */
const CROWN = SCENE_MOMENTS.EXODIA.crownAt;

installFlashProbe();

describe('palco: a cena inverte a tela inteira uma vez (spec §10.1, §10.4)', () => {
  it('Exódia: o palco recebe a inversão uma vez e a retira depois de ≥ 300 ms', () => {
    const m = mount(THEIRS);
    expect(busy(m.container)).toBe(false);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(busy(m.container)).toBe(true);
    const trace = watchInversion(m.container);
    trace.run(RARE_SCENE_MS.EXODIA + 100);
    // Liga quando a coroa crava, desliga 600 ms depois: uma inversão só, mantida bem mais que o piso de 300 ms.
    expect(trace.flips).toEqual([CROWN, CROWN + 600]);
    expect(trace.flips[1]! - trace.flips[0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expect(busy(m.container)).toBe(false);
  });

  it('a inversão é o `filter: invert(1)` do palco, e só dura enquanto está ligada', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(stage(m.container).style.filter).toBe('');
    advance(CROWN);
    expect(stage(m.container).style.filter).toBe('invert(1)');
    expect(inverted(m.container)).toBe(true);
    advance(599);
    expect(inverted(m.container)).toBe(true);
    advance(1);
    expect(inverted(m.container)).toBe(false);
    expect(stage(m.container).style.filter).toBe('');
  });

  it('a cena carimba o título no instante dele e some no fim da batida', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'EXODIA');
    expect(scene(m.container)).not.toHaveTextContent('EXÓDIA!');
    advance(SCENE_MOMENTS.EXODIA.titleAt);
    expect(scene(m.container)).toHaveTextContent('EXÓDIA!');
    advance(RARE_SCENE_MS.EXODIA - SCENE_MOMENTS.EXODIA.titleAt - 1);
    expect(scene(m.container)).not.toBeNull();
    advance(1);
    expect(scene(m.container)).toBeNull();
  });

  it('a sobreposição fica escondida do leitor de tela (o histórico é o registro)', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('com uma decisão esperando, a cena não encolhe: inverte uma vez, por 600 ms, e a mesa só libera no fim dela', () => {
    const m = mount(MINE);
    emit(m, MINE, [SCENE]);
    const trace = watchInversion(m.container);
    trace.run(1_400);
    expect(trace.flips).toEqual([150, 750]);
    expect(trace.flips[1]! - trace.flips[0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expect(busy(m.container)).toBe(true);
    trace.run(200);
    expect(busy(m.container)).toBe(false);
  });
});

describe('o gatilho do Reflect na mesa (sub-projeto 6 §7.5)', () => {
  const T = SCENE_MOMENTS.REFLECT_TRIGGERED;
  const hp = (container: HTMLElement) => Number(container.querySelector('[data-lado="voce"] [data-hp]')!.textContent);
  const trigger: GameEvent = { type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 37 };

  it('a vida de quem atacou só desce depois de a volta do cometa acertar', () => {
    const m = mount(THEIRS);
    const start = hp(m.container);
    emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: start - 37 } }, [trigger]);
    advance(T.returnHitAt - 1);
    expect(hp(m.container)).toBe(start);
    advance(1);
    // A contagem parte no desenho seguinte, como a do golpe.
    advance(HIT_COUNT_MS + 100);
    expect(hp(m.container)).toBe(start - 37);
  });

  it('na partida que acaba com o dano devolvido, a mesa só libera depois da cena', () => {
    const m = mount(THEIRS);
    const result = { kind: 'WIN', winner: 'p2', reason: 'HP' } as const;
    emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 0 }, phase: { kind: 'GAME_OVER', result } }, [trigger, { type: 'GameOver', result }]);
    advance(RARE_SCENE_MS.REFLECT_TRIGGERED - 1);
    expect(busy(m.container)).toBe(true);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'REFLECT_TRIGGERED');
    advance(BEAT_MS.banner + 100);
    expect(busy(m.container)).toBe(false);
  });

  it('na reconexão (catchUp) não há cena: vira faixa, e o espelho pequeno sai com a `view`', () => {
    const m = mount({ ...THEIRS, opponent: { ...THEIRS.opponent, reflect: true } });
    expect(m.container.querySelector('[data-espelho-zona="p2"]')).not.toBeNull();
    emit(m, THEIRS, [trigger], { catchUp: true });
    expect(scene(m.container)).toBeNull();
    expect(banner(m.container)).not.toBeNull();
    expect(m.container.querySelector('[data-espelho-zona]')).toBeNull();
  });
});

describe('a Ressurreição na mesa (sub-projeto 6 §7.6)', () => {
  const REVIVED: GameEvent = { type: 'Resurrected', player: 'p2', card: { id: 'volta', kind: 'NUM', value: 9, suit: 'copas' }, row: 'DEF' };

  it('a cena nunca inverte a tela, e a cortina sobe e desce uma vez', () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, THEIRS, [REVIVED]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'RESURRECTED');
    trace.sample();
    trace.run(RARE_SCENE_MS.RESURRECTED + 1_000);
    expect(trace.flips[1]).toEqual([]);
    expect(trace.flips[0]).toHaveLength(2);
    expectFlashSafe(trace.all);
  });

  it('na reconexão (catchUp) não há cena: vira faixa', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [REVIVED], { catchUp: true });
    expect(scene(m.container)).toBeNull();
    expect(banner(m.container)).toHaveTextContent('ressuscitou');
  });
});

describe('o retrato do perdedor na Exódia (sub-projeto 6 §7.3)', () => {
  const cracked = (container: HTMLElement) => container.querySelector('[data-retrato="voce"][data-derrotado]') !== null;
  const hp = (container: HTMLElement) => container.querySelector('[data-lado="voce"] [data-hp]')!.textContent;

  it('racha só no instante dele, dentro da cena; antes, a vida escorre até 0', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    advance(SCENE_MOMENTS.EXODIA.drainAt - 1);
    expect(cracked(m.container)).toBe(false);
    expect(hp(m.container)).not.toBe('0');
    advance(1);
    advance(SCENE_MOMENTS.EXODIA.crackAt - SCENE_MOMENTS.EXODIA.drainAt - 1);
    expect(cracked(m.container)).toBe(false);
    // A vida já escorre (a contagem parte no desenho seguinte: uma folga de alguns quadros, como a do golpe).
    expect(Number(hp(m.container))).toBeLessThan(187);
    advance(1);
    expect(cracked(m.container)).toBe(true);
    advance(100);
    expect(hp(m.container)).toBe('0');
    advance(RARE_SCENE_MS.EXODIA);
    expect(cracked(m.container)).toBe(true);
  });

  it('o pulo mostra o retrato rachado na hora', async () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    advance(500);
    expect(cracked(m.container)).toBe(false);
    await m.user.click(stage(m.container));
    expect(cracked(m.container)).toBe(true);
    expect(hp(m.container)).toBe('0');
  });
});

describe('o retrato de quem perde pela vida (bloco B do playtest, ponto 15; decisoes.md 2026-11-07 (3), B2)', () => {
  const cracked = (container: HTMLElement) => container.querySelector('[data-retrato="voce"][data-derrotado]') !== null;
  const hp = (container: HTMLElement) => container.querySelector('[data-lado="voce"] [data-hp]')!.textContent;
  const result = { kind: 'WIN', winner: 'p2', reason: 'HP' } as const;
  const HP_OVER: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, hp: 0 }, phase: { kind: 'GAME_OVER', result } };
  const KILL: GameEvent = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 237, defense: 50, damage: 187 };
  const END: GameEvent = { type: 'GameOver', result };
  const T = SCENE_MOMENTS.FINAL_BLOW;

  it('no golpe final, antes do impacto a vida é a de antes e o retrato está inteiro; no impacto racha, e a vida desce a 0', () => {
    const m = mount(THEIRS);
    emit(m, HP_OVER, [KILL, END]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'FINAL_BLOW');
    advance(T.hitAt - 1);
    expect(cracked(m.container)).toBe(false);
    expect(hp(m.container)).toBe('187');
    advance(1);
    expect(cracked(m.container)).toBe(true);
    advance(HIT_COUNT_MS + 100);
    expect(hp(m.container)).toBe('0');
    advance(RARE_SCENE_MS.FINAL_BLOW);
    expect(cracked(m.container)).toBe(true);
  });

  it('com movimento reduzido, a vida e o retrato mudam juntos, no impacto (e não a vida no começo da cena)', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    emit(m, HP_OVER, [KILL, END]);
    advance(T.hitAt - 1);
    expect(hp(m.container)).toBe('187');
    expect(cracked(m.container)).toBe(false);
    advance(1);
    expect(cracked(m.container)).toBe(true);
    advance(50);
    expect(hp(m.container)).toBe('0');
  });

  it('com movimento reduzido, o Ataque Absoluto também segura a vida até o feixe acertar (a mesma regra em toda cena com golpe)', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 137 } }, [ABSOLUTE, HIT]);
    advance(SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt - 1);
    expect(hp(m.container)).toBe('187');
    // O golpe acende num avanço, e o salto da vida corre no desenho seguinte.
    advance(1);
    advance(50);
    expect(hp(m.container)).toBe('137');
  });

  it('o pulo no meio: rachado e 0 na hora, e a mesa libera', async () => {
    const m = mount(THEIRS);
    emit(m, HP_OVER, [KILL, END]);
    advance(300);
    expect(cracked(m.container)).toBe(false);
    await m.user.click(stage(m.container));
    expect(cracked(m.container)).toBe(true);
    expect(hp(m.container)).toBe('0');
    expect(busy(m.container)).toBe(false);
  });

  it('a cena desenhada acontece na mesa: nenhuma cortina, e a tela inverte uma vez, no impacto', () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, HP_OVER, [KILL, END]);
    expect(m.container.querySelector('[data-golpe-final]')).not.toBeNull();
    trace.sample();
    trace.run(RARE_SCENE_MS.FINAL_BLOW + 1_000);
    expect(trace.flips[0]).toEqual([]);
    expect(trace.flips[1]).toHaveLength(2);
    expectFlashSafe(trace.all);
  });

  it('o Ataque Absoluto que mata fica com a cena dele: o retrato só racha na faixa do fim, depois dela', () => {
    const m = mount(THEIRS);
    emit(m, HP_OVER, [ABSOLUTE, KILL, END]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'ABSOLUTE_ATTACK');
    advance(SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt + 100);
    expect(cracked(m.container)).toBe(false);
    advance(RARE_SCENE_MS.ABSOLUTE_ATTACK - SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt);
    expect(cracked(m.container)).toBe(true);
  });
});

describe('cenas raras (U3): a figura, o título que carimba e os raios', () => {
  const figure = (container: HTMLElement) => container.querySelector('[data-figura]');

  it('a Exódia tem desenho próprio (sub-projeto 6, fatia 3): a faixa da cena no lugar do painel', () => {
    const m = mount(THEIRS);
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(m.container.querySelector('[data-faixa-cena="EXODIA"]')).not.toBeNull();
    expect(m.container.querySelector('[data-painel-cena][data-ativo]')).toBeNull();
  });

  it('o Ataque e a Defesa Absolutos têm desenho próprio (sub-projeto 6, fatia 2): a faixa da cena no lugar do painel', () => {
    const m = mount(THEIRS);
    const panelOn = () => m.container.querySelector('[data-painel-cena][data-ativo]');
    emit(m, THEIRS, [ABSOLUTE]);
    expect(m.container.querySelector('[data-faixa-cena="ABSOLUTE_ATTACK"]')).not.toBeNull();
    expect(panelOn()).toBeNull();
    advance(RARE_SCENE_MS.ABSOLUTE_ATTACK + 1_100);
    emit(m, THEIRS, [{ type: 'AbsoluteDefenseStarted', player: 'p2' }]);
    expect(m.container.querySelector('[data-faixa-cena="ABSOLUTE_DEFENSE"]')).not.toBeNull();
    expect(panelOn()).toBeNull();
  });

  it('a Devastação (sub-projeto 6 fatia 3): o lançamento é a fita, sem cena; a cena é a da fileira que cai', () => {
    const m = mount(THEIRS);
    const k = { id: 'dk', kind: 'K', suit: 'copas' } as const;
    const a = { id: 'da', kind: 'A', suit: 'paus' } as const;
    const j = { id: 'dj', kind: 'J', suit: 'ouros' } as const;
    emit(m, THEIRS, [{ type: 'DevastationCast', player: 'p2', target: 'p1', row: 'ATK', k, a, x: j }]);
    expect(scene(m.container)).toBeNull();
    expect(banner(m.container)).toHaveTextContent('DEVASTAÇÃO de Duda!');
    advance(3_000);
    emit(m, THEIRS, [{ type: 'RowDevastated', player: 'p1', row: 'ATK', cards: [], reflected: false }]);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'DEVASTATION');
    expect(m.container.querySelector('[data-campo-cena="DEVASTATION"]')).not.toBeNull();
    advance(SCENE_MOMENTS.DEVASTATION.titleAt);
    expect(scene(m.container)).toHaveTextContent('DEVASTAÇÃO!');
  });

  it('a Devastação é no campo: a cortina não sobe e o painel não aparece', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [{ type: 'RowDevastated', player: 'p1', row: 'ATK', cards: [], reflected: false }]);
    advance(100);
    expect(curtainUp(m.container)).toBe(false);
    expect(m.container.querySelector('[data-painel-cena][data-ativo]')).toBeNull();
  });

  it('a desolação aparece quando a poeira assenta; o pulo a mostra na hora', async () => {
    const emptied: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, defenseRow: [] } };
    const fell: GameEvent = { type: 'RowDevastated', player: 'p1', row: 'DEF', cards: [{ id: 'n-d', kind: 'NUM', value: 5, suit: 'copas' }], reflected: false };
    const desolate = (container: HTMLElement) => container.querySelector('[data-fileira="p1:DEF"][data-desolada]') !== null;
    const m = mount(THEIRS);
    emit(m, emptied, [fell]);
    advance(SCENE_MOMENTS.DEVASTATION.settleAt - 1);
    expect(desolate(m.container)).toBe(false);
    expect(m.container.querySelector('[data-campo="p1"][data-apagado]')).toBeNull();
    advance(1);
    expect(desolate(m.container)).toBe(true);
    expect(m.container.querySelector('[data-campo="p1"][data-apagado]')).not.toBeNull();
    cleanup();
    const again = mount(THEIRS);
    emit(again, emptied, [fell]);
    advance(100);
    expect(desolate(again.container)).toBe(false);
    await again.user.click(stage(again.container));
    expect(desolate(again.container)).toBe(true);
  });

  it('a cancelada: sem cortina nem painel, e a fita diz o motivo durante a cena', () => {
    const m = mount(THEIRS);
    const reaction: ViewSpec = { ...THEIRS, phase: { kind: 'REACTION', responder: 'p2', trigger: 'REFLECT_PLAYED', devastation: { player: 'p1', row: 'DEF', k: { id: 'dk', kind: 'K', suit: 'copas' }, a: { id: 'da', kind: 'A', suit: 'paus' }, x: { id: 'dq', kind: 'Q', suit: 'ouros' } } } };
    emit(m, reaction, [TURN]);
    advance(3_000);
    emit(m, THEIRS, [{ type: 'DevastationCanceled', player: 'p1', reason: 'REFLECT_CLASH' }]);
    advance(250);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'DEVASTATION_CANCELED');
    expect(curtainUp(m.container)).toBe(false);
    expect(m.container.querySelector('[data-painel-cena][data-ativo]')).toBeNull();
    expect(banner(m.container)).toHaveTextContent('Os Reflects se anularam: a Devastação não aconteceu');
    // A fileira da cancelada vem da Devastação em curso no `state` de antes.
    advance(SCENE_MOMENTS.DEVASTATION_CANCELED.crackAt);
    expect(m.container.querySelector('[data-fenda]')).not.toBeNull();
  });

  it('as cartas da fileira vão ao cemitério sem voar: instantâneas (sub-projeto 6 §7.4)', () => {
    const seen: boolean[] = [];
    const Probe = () => {
      seen.push(useAnim().instant('n-caida'));
      return null;
    };
    const { session, connection } = connect(THEIRS);
    const ui = () => (
      <Stage snapshot={session.snapshot()} reducedMotion={false}>
        <Probe />
      </Stage>
    );
    const view = render(ui());
    expect(seen.at(-1)).toBe(false);
    emit({ connection }, THEIRS, [{ type: 'RowDevastated', player: 'p1', row: 'ATK', cards: [{ id: 'n-caida', kind: 'NUM', value: 5, suit: 'copas' }], reflected: false }]);
    view.rerender(ui());
    expect(seen.at(-1)).toBe(true);
    advance(RARE_SCENE_MS.DEVASTATION + 100);
    view.rerender(ui());
    expect(seen.at(-1)).toBe(false);
  });

  it('no celular, a cena rola os campos até a fileira atingida, na hora, e nada rola de lado', () => {
    const m = mount(THEIRS);
    const fields = m.container.querySelector<HTMLElement>('[data-campos]')!;
    fields.scrollTop = 0;
    fields.scrollLeft = 0;
    const row = m.container.querySelector('[data-fileira="p1:DEF"]')!;
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this === fields) return new DOMRect(0, 100, 360, 300);
      if (this === row) return new DOMRect(0, 500 - fields.scrollTop, 360, 100);
      return new DOMRect(0, 0, 360, 0);
    });
    emit(m, THEIRS, [{ type: 'RowDevastated', player: 'p1', row: 'DEF', cards: [], reflected: false }]);
    expect(fields.scrollTop).toBeGreaterThanOrEqual(200);
    expect(fields.scrollLeft).toBe(0);
    spy.mockRestore();
  });

  it('a cena comum (o Reflect) não tem figura nem raios', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [SCENE]);
    expect(scene(m.container)).not.toBeNull();
    expect(figure(m.container)).toBeNull();
    expect(m.container.querySelector('[data-raios]')).toBeNull();
  });

});

describe('palco: movimento reduzido (spec §4.1, §10.4)', () => {
  it('pela preferência do menu: a cena reduzida (o nome só esmaece), sem inversão', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    emit(m, EXODIA_OVER, [EXODIA]);
    expect(scene(m.container)).toHaveAttribute('data-reduzido', 'true');
    advance(SCENE_MOMENTS.EXODIA.titleAt);
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
    trace.run(RARE_SCENE_MS.EXODIA + 100);
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
    trace.run(RARE_SCENE_MS.EXODIA + 100);
    expect(trace.flips).toEqual([CROWN, CROWN + 600]);
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
    emit(m, THEIRS, [TURN, { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 }, streak: 1 }], { catchUp: true });
    expect(banner(m.container)).toHaveTextContent('Vez de Duda');
    advance(199);
    expect(busy(m.container)).toBe(true);
    advance(1);
    expect(banner(m.container)).toHaveAttribute('data-faixa', 'Duda ataca primeiro · causou mais dano na rodada · 9 × 3');
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
    advance(CROWN + 100);
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
    // Estado 1: uma cena sem inversão (o espelho que se forma); a cortina sobe em 0 e desce em 1500.
    const silent = NO_INVERT as Set<SceneKind>;
    silent.add('REFLECT_PLAYED');
    emit(m, MINE, [SCENE]);
    silent.delete('REFLECT_PLAYED');
    trace.sample();
    trace.run(1_750);
    // Estado 2: a cortina sobe em 1750 e a inversão liga em 1900, por 600 ms.
    emit(m, THEIRS, [SCENE]);
    trace.run(250);
    expect(inverted(m.container)).toBe(true);
    // O jogador pula aos 2000: desligar agora faria 4 trocas em 500 ms (1500, 1750, 1900, 2000).
    await m.user.click(stage(m.container));
    trace.sample();
    expect(busy(m.container)).toBe(false);
    expect(inverted(m.container)).toBe(true); // a mesa já está livre, só o visual segura
    trace.run(2_500);
    expect(trace.flips[1]).toEqual([1_910, 2_510]);
    expect(trace.flips[0]).toHaveLength(4); // 0 sobe, 1500 desce, 1750 sobe, e a descida depois do pulo
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

describe('a cortina das cenas deixa o placar à vista (sub-projeto 6 §7)', () => {
  it('a cortina começa no fim do placar medido', () => {
    const rect = (top: number, height: number) =>
      ({ x: 0, y: top, top, left: 0, width: 800, height, right: 800, bottom: top + height, toJSON: () => ({}) }) as DOMRect;
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.matches('[data-placar]')) return rect(0, 96);
      if (this.matches('[data-campos]')) return rect(96, 400);
      return rect(0, 0);
    });
    const m = mount(THEIRS);
    emit(m, THEIRS, [SCENE]);
    advance(1);
    expect(m.container.querySelector<HTMLElement>('[data-cortina]')!.style.top).toBe('96px');
    spy.mockRestore();
  });

  it('a caixa já é medida quando a mesa monta, antes da primeira cena (sem ela, a primeira cena cairia no painel por um quadro)', () => {
    const rect = (top: number, height: number) =>
      ({ x: 0, y: top, top, left: 0, width: 800, height, right: 800, bottom: top + height, toJSON: () => ({}) }) as DOMRect;
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.matches('[data-placar]')) return rect(0, 96);
      if (this.matches('[data-campos]')) return rect(96, 400);
      return rect(0, 0);
    });
    const m = mount(THEIRS);
    advance(1);
    expect(m.container.querySelector<HTMLElement>('[data-cortina]')!.style.top).toBe('96px');
    spy.mockRestore();
  });
});

describe('palco: trava global de flash (spec §10.4)', () => {
  it('dois `state`s com cena a 200 ms: a segunda cena não inverte, e nenhuma janela de 1 s passa de 3 trocas', () => {
    const m = mount(THEIRS);
    const trace = watchInversion(m.container);
    emit(m, THEIRS, [SCENE]);
    trace.run(200);
    // A Devastação inverte quando o chão se abre (1,17 s), dentro dos 2 s de espera da trava. (Os Absolutos da fatia 2 invertem
    // a 2,7 s e a 3,2 s, depois da espera: a trava não teria o que segurar.)
    const devastation: GameEvent = { type: 'RowDevastated', player: 'p1', row: 'DEF', cards: [], reflected: false };
    emit(m, THEIRS, [devastation]);
    // A segunda cena toca (título na tela), mas sem inversão.
    expect(scene(m.container)).toHaveAttribute('data-cena', 'DEVASTATION');
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

  it('o número do dano sobe no Coringa que apanhou (o retrato dele no placar), na batida do dano', () => {
    const m = mount(MINE);
    const field = () => within(m.container.querySelector<HTMLElement>('[data-retrato="voce"]')!);
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
    const hp = () => Number(screen.getByRole('region', { name: 'Placar' }).querySelector('[data-hp]')!.textContent);
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
    expect(screen.getByRole('region', { name: 'Placar' }).querySelector('[data-hp]')).toHaveTextContent('137');
  });

  it('com movimento reduzido a vida troca direto', () => {
    const m = mount(MINE, { prefs: { reduceMotion: true } });
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    expect(screen.getByRole('region', { name: 'Placar' }).querySelector('[data-hp]')).toHaveTextContent('137');
  });

  it('o golpe treme a mesa e respinga no retrato de quem apanhou (sub-projeto 6 §5)', () => {
    const m = mount(MINE);
    const hit: GameEvent = { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 100, defense: 50, damage: 50 };
    emit(m, { ...MINE, opponent: { ...MINE.opponent, hp: 164 } }, [hit]);
    expect(stage(m.container)).toHaveAttribute('data-tremor', 'medio');
    const theirs = m.container.querySelector('[data-retrato="oponente"]')!;
    expect(theirs.querySelectorAll('[data-respingo] [data-pingo]')).toHaveLength(7);
    expect(m.container.querySelector('[data-retrato="voce"] [data-respingo]')).toBeNull();
    advance(700);
    expect(stage(m.container)).not.toHaveAttribute('data-tremor');
    expect(m.container.querySelector('[data-respingo]')).toBeNull();
  });

  it('o número do dano fica preso à borda de dentro do retrato: não sai da tela no canto (sub-projeto 6 §5)', () => {
    const m = mount(MINE);
    emit(m, { ...MINE, self: { ...MINE.self, hp: 30 } }, [{ type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 200, defense: 43, damage: 157 }]);
    const mine = m.container.querySelector('[data-retrato="voce"] [data-dano]')!;
    expect(mine.className).toMatch(/(^| )left-0( |$)/);
    expect(mine.className).not.toContain('left-1/2');
    const theirs = mount(MINE);
    emit(theirs, { ...MINE, opponent: { ...MINE.opponent, hp: 60 } }, [{ type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 200, defense: 46, damage: 154 }]);
    expect(theirs.container.querySelector('[data-retrato="oponente"] [data-dano]')!.className).toMatch(/(^| )right-0( |$)/);
  });

  it('durante as batidas a mão para de respirar (pausa onde está) e volta quando a mesa para (sub-projeto 6 §6)', () => {
    const m = mount(MINE);
    const cards = () => [...screen.getByRole('list', { name: 'Sua mão' }).querySelectorAll<HTMLElement>(':scope > li')];
    expect(cards().every((li) => li.hasAttribute('data-respira') && !li.hasAttribute('data-respira-pausa'))).toBe(true);
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    expect(busy(m.container)).toBe(true);
    expect(cards().every((li) => li.hasAttribute('data-respira') && li.hasAttribute('data-respira-pausa'))).toBe(true);
    advance(3_000);
    expect(busy(m.container)).toBe(false);
    expect(cards().some((li) => li.hasAttribute('data-respira-pausa'))).toBe(false);
  });

  it('o lampejo da espada some durante as batidas e volta quando a mesa para (sub-projeto 6 §4)', () => {
    const m = mount(MINE);
    const flash = () => m.container.querySelector('[data-espada] [data-lampejo]');
    expect(flash()).not.toBeNull();
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    expect(flash()).toBeNull();
    advance(3_000);
    expect(flash()).not.toBeNull();
  });

  it('o golpe forte treme mais e respinga mais', () => {
    const m = mount(MINE);
    emit(m, { ...MINE, self: { ...MINE.self, hp: 30 } }, [{ type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 200, defense: 43, damage: 157 }]);
    advance(300);
    expect(stage(m.container)).toHaveAttribute('data-tremor', 'forte');
    expect(m.container.querySelectorAll('[data-retrato="voce"] [data-respingo] [data-pingo]')).toHaveLength(10);
  });

  it('com movimento reduzido, nem tremor nem respingo', () => {
    const m = mount(MINE, { prefs: { reduceMotion: true } });
    const hit: GameEvent = { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 100, defense: 50, damage: 50 };
    emit(m, { ...MINE, opponent: { ...MINE.opponent, hp: 164 } }, [hit]);
    expect(stage(m.container)).not.toHaveAttribute('data-tremor');
    expect(m.container.querySelector('[data-respingo]')).toBeNull();
    // O número do dano continua (só esmaece).
    expect(m.container.querySelector('[data-dano]')).toHaveTextContent('−50');
  });

  describe('o tremor sem recalcular a mesa (fatia 5, Task 1)', () => {
    /** Grava as animações do placar e dos campos (o jsdom não tem `animate`; no protótipo global ele mudaria o modo do Motion). */
    const recordShakes = (container: HTMLElement) => {
      const calls: Array<{ target: 'placar' | 'campos'; frames: Keyframe[]; options: KeyframeAnimationOptions }> = [];
      for (const el of container.querySelectorAll<HTMLElement>('[data-placar], [data-campos]')) {
        el.animate = ((frames: Keyframe[], options: KeyframeAnimationOptions) => {
          calls.push({ target: el.hasAttribute('data-placar') ? 'placar' : 'campos', frames, options });
          return { cancel() {} } as Animation;
        }) as HTMLElement['animate'];
      }
      return calls;
    };
    const medium = (damage = 50): GameEvent => ({ type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 100, defense: 50, damage });

    it('o golpe treme o placar e os campos pelo translate, e o palco nunca recebe variável CSS (ela recalcularia a mesa inteira)', () => {
      const m = mount(MINE);
      const calls = recordShakes(m.container);
      emit(m, { ...MINE, opponent: { ...MINE.opponent, hp: 164 } }, [medium()]);
      expect(stage(m.container).getAttribute('style') ?? '').not.toContain('--tremor');
      expect(calls.map((call) => call.target)).toEqual(['placar', 'campos']);
      expect(calls[0]!.frames[1]).toMatchObject({ translate: '-4px 2px' });
      expect(calls[0]!.options).toMatchObject({ duration: 200 });
    });

    it('dois golpes seguidos do mesmo peso tremem duas vezes', () => {
      const m = mount(MINE);
      const calls = recordShakes(m.container);
      emit(m, { ...MINE, opponent: { ...MINE.opponent, hp: 114 } }, [medium(), medium()]);
      expect(calls).toHaveLength(2);
      advance(BEAT_MS.damage);
      expect(calls).toHaveLength(4);
    });

    it('com movimento reduzido, nada treme', () => {
      const m = mount(MINE, { prefs: { reduceMotion: true } });
      const calls = recordShakes(m.container);
      emit(m, { ...MINE, opponent: { ...MINE.opponent, hp: 164 } }, [medium()]);
      expect(calls).toHaveLength(0);
    });
  });

  it('o rastro vermelho fica na vida velha e escorre até a nova depois do golpe (sub-projeto 6 §3)', () => {
    const m = mount(MINE);
    const meter = () => screen.getByRole('meter', { name: 'Vida de André' });
    // A largura desenhada, em % da barra: a barra encolhe por `scaleX` (sem layout a cada quadro).
    const width = (selector: string) => {
      const scale = /scaleX\(([\d.]+)\)/.exec(meter().querySelector<HTMLElement>(selector)!.style.transform)?.[1];
      return Number(scale) * 100;
    };
    const pct = (hp: number) => (hp / Number(meter().getAttribute('aria-valuemax'))) * 100;
    expect(width('[data-rastro]')).toBeCloseTo(pct(187));
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    advance(300);
    advance(1);
    advance(300);
    // A vida já caiu (conta na batida do dano); o rastro ainda marca a vida de antes.
    expect(width('[data-vida]')).toBeLessThan(pct(187));
    expect(width('[data-rastro]')).toBeCloseTo(pct(187));
    advance(1_100);
    expect(width('[data-vida]')).toBeCloseTo(pct(137));
    expect(width('[data-rastro]')).toBeCloseTo(pct(137));
  });

  it('com movimento reduzido, a barra não tem rastro', () => {
    const m = mount(MINE, { prefs: { reduceMotion: true } });
    emit(m, { ...MINE, self: { ...MINE.self, hp: 137 } }, [ATTACK, HIT]);
    expect(screen.getByRole('meter', { name: 'Vida de André' }).querySelector('[data-rastro]')).toBeNull();
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

  it('GuardBroken: o K que foi para o topo do cemitério fica escondido, e a cópia dele racha no lugar antigo (fatia 5)', () => {
    const k = { id: 'k-quebrado', kind: 'K', suit: 'ouros' } as const;
    const m = mount({ ...MINE, self: { ...MINE.self, guard: [k] } });
    emit(m, { ...MINE, self: { ...MINE.self, guard: [] }, graveyard: [3, 5, 8, k] }, [{ type: 'GuardBroken', player: 'p1', cards: [k] }]);
    const card = m.container.querySelector<HTMLElement>('[data-card-id="k-quebrado"]')!;
    expect(card).not.toHaveAttribute('data-fx');
    expect(card.style.visibility).toBe('hidden');
    // A rachadura aparece no começo da batida (aqui, a primeira).
    advance(1);
    expect(m.container.querySelector('[data-camada-fx] [data-saindo-id="k-quebrado"] [data-rachadura]')).not.toBeNull();
    advance(400);
    expect(card.style.visibility).toBe('');
  });

  it('Armadilha: o alvo que foi para o topo do cemitério estoura na cópia dele', () => {
    const trap = { id: 'a-usada', kind: 'A', suit: 'paus' } as const;
    const target = { id: 'k-alvo', kind: 'K', suit: 'copas' } as const;
    const m = mount({ ...MINE, self: { ...MINE.self, hand: [trap] }, opponent: { ...MINE.opponent, guard: [target] } });
    emit(m, { ...MINE, self: { ...MINE.self, hand: [] }, opponent: { ...MINE.opponent, guard: [] }, graveyard: [3, 5, 8, trap, target] }, [
      { type: 'TrapUsed', player: 'p1', card: trap, target, targetOwner: 'p2' },
    ]);
    expect(m.container.querySelector('[data-card-id="k-alvo"]')).not.toHaveAttribute('data-fx');
    expect(m.container.querySelector('[data-camada-fx] [data-saindo-id="k-alvo"]')).not.toBeNull();
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
    // O número espera a volta do cometa acertar o retrato.
    advance(SCENE_MOMENTS.REFLECT_TRIGGERED.returnHitAt - 1);
    expect(m.container.querySelector('[data-dano]')).toBeNull();
    advance(1);
    expect(m.container.querySelector('[data-dano]')).toHaveTextContent('−37');
  });

  describe('o golpe do Ataque Absoluto (sub-projeto 6 §7.1)', () => {
    const blast = (damage: number): GameEvent => ({ type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 100, defense: 50, damage });
    const hp = () => Number(screen.getByRole('region', { name: 'Placar' }).querySelector('[data-lado="voce"] [data-hp]')!.textContent);
    /** Chega ao impacto do feixe (3,2 s) e deixa a contagem partir (o `act` à parte). */
    const toImpact = () => {
      advance(3_100);
      advance(100);
      advance(1);
    };

    it('nada do golpe antes do impacto; no impacto, o número, o tremor forte, os respingos, e a vida desce em 700 ms', () => {
      const m = mount(THEIRS);
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 137 } }, [ABSOLUTE, blast(50)]);
      advance(3_100);
      expect(m.container.querySelector('[data-dano]')).toBeNull();
      expect(stage(m.container)).not.toHaveAttribute('data-tremor');
      expect(hp()).toBe(187);
      advance(100);
      advance(1);
      expect(m.container.querySelector('[data-dano]')).toHaveTextContent('−50');
      expect(stage(m.container)).toHaveAttribute('data-tremor', 'forte');
      expect(m.container.querySelector('[data-respingo]')).not.toBeNull();
      // A contagem (700 ms) parte no desenho seguinte ao impacto: uma folga de alguns quadros.
      advance(760);
      expect(hp()).toBe(137);
      // O golpe absorvido não repete o número depois da cena.
      advance(1_400);
      expect(m.container.querySelector('[data-dano]')).toBeNull();
      expect(busy(m.container)).toBe(false);
    });

    it('com a cena desenhada, o número do golpe é o dela, acima de tudo, e o placar não repete', () => {
      // A mesa é um contexto de empilhamento próprio (o grão de papel atrás dela): nada do placar passa por cima da cena, que cobre a
      // área dos campos, onde o número do placar fica pendurado. Como no protótipo, o número grande do Ataque Absoluto é da cena.
      const m = mount(THEIRS);
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 137 } }, [ABSOLUTE, blast(50)]);
      toImpact();
      const numbers = m.container.querySelectorAll('[data-dano]');
      expect(numbers).toHaveLength(1);
      expect(numbers[0]!.closest('[data-camada-cena]')).not.toBeNull();
    });

    it('o pulo no meio da cena mostra a vida final na hora', () => {
      const m = mount(THEIRS);
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 137 } }, [ABSOLUTE, blast(50)]);
      advance(1_000);
      fireEvent.click(stage(m.container));
      expect(busy(m.container)).toBe(false);
      expect(hp()).toBe(137);
    });

    it('golpe de 0 (a Defesa cobre a conta): nada de número, tremor ou respingo, e a vida não mexe', () => {
      const m = mount(THEIRS);
      emit(m, THEIRS, [ABSOLUTE, blast(0)]);
      toImpact();
      expect(m.container.querySelector('[data-dano]')).toBeNull();
      expect(stage(m.container)).not.toHaveAttribute('data-tremor');
      expect(m.container.querySelector('[data-respingo]')).toBeNull();
      expect(hp()).toBe(187);
    });

    it('com a Guarda quebrada no meio, a vida conta uma vez só: nunca abaixo de 137, nunca de volta para cima', () => {
      const m = mount(THEIRS);
      const broken: GameEvent = { type: 'GuardBroken', player: 'p1', cards: [{ id: 'gk-1', kind: 'K', suit: 'ouros' }] };
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 137, guard: [] } }, [ABSOLUTE, broken, blast(50)]);
      const seen: number[] = [];
      for (let t = 0; t < 5_200; t += 50) {
        advance(50);
        seen.push(hp());
      }
      expect(Math.min(...seen)).toBe(137);
      expect(seen.every((v, i) => i === 0 || v <= seen[i - 1]!)).toBe(true);
    });

    it('com movimento reduzido, o número aparece no impacto, sem tremor', () => {
      const m = mount(THEIRS, { prefs: { reduceMotion: true } });
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 137 } }, [ABSOLUTE, blast(50)]);
      toImpact();
      expect(m.container.querySelector('[data-dano]')).toHaveTextContent('−50');
      expect(stage(m.container)).not.toHaveAttribute('data-tremor');
    });
  });

  describe('a insígnia da Defesa Absoluta no placar (sub-projeto 6 §7.2)', () => {
    const insignia = () => screen.getByRole('region', { name: 'Placar' }).querySelector('[data-retrato="voce"] [data-insignia]');

    it('espera o fim da cena', () => {
      const m = mount(THEIRS);
      emit(m, { ...THEIRS, self: { ...THEIRS.self, absoluteDefense: true } }, [{ type: 'AbsoluteDefenseStarted', player: 'p1' }]);
      advance(RARE_SCENE_MS.ABSOLUTE_DEFENSE - 100);
      expect(insignia()).toBeNull();
      advance(200);
      expect(busy(m.container)).toBe(false);
      expect(insignia()).not.toBeNull();
    });

    it('o pulo no meio da cena mostra a insígnia na hora', () => {
      const m = mount(THEIRS);
      emit(m, { ...THEIRS, self: { ...THEIRS.self, absoluteDefense: true } }, [{ type: 'AbsoluteDefenseStarted', player: 'p1' }]);
      advance(1_000);
      expect(insignia()).toBeNull();
      fireEvent.click(stage(m.container));
      expect(insignia()).not.toBeNull();
    });
  });

  describe('a cura em verde, na batida dela (decisoes.md 2026-11-01 (1))', () => {
    const six = { id: 'n-6', kind: 'NUM', value: 6, suit: 'paus' } as const;
    const removed: GameEvent = { type: 'CardsRemovedFromRow', player: 'p1', row: 'DEF', cards: [six] };
    const healed: GameEvent = { type: 'Healed', player: 'p1', amount: 6, source: 'DEFENSE', card: six };
    const hp = () => Number(screen.getByRole('region', { name: 'Placar' }).querySelector('[data-lado="voce"] [data-hp]')!.textContent);
    const meter = () => screen.getByRole('meter', { name: 'Vida de André' });
    const scaleOf = (selector: string) => Number(/scaleX\(([\d.]+)\)/.exec(meter().querySelector<HTMLElement>(selector)!.style.transform)?.[1]);
    const max = () => Number(meter().getAttribute('aria-valuemax'));

    it('a cura pela Defesa depois de um golpe sem dano: a vida espera a batida da cura e sobe com o "+N" verde', () => {
      // A mesa parada: a batida do golpe (0 a 300 a declaração, 300 a 900 o golpe), a carta que cai (900 a 1200), a cura (1200 a 1800).
      const m = mount(THEIRS);
      const blocked: GameEvent = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 40, defense: 50, damage: 0 };
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 193 } }, [ATTACK, blocked, removed, healed]);
      advance(1_150);
      expect(hp()).toBe(187);
      expect(meter().querySelector('[data-cura-barra]')).toBeNull();
      // A batida da cura começa aos 1200 ms; o `act` à parte deixa a contagem partir antes de o tempo correr.
      advance(50);
      advance(1);
      advance(300);
      const heal = m.container.querySelector('[data-cura]');
      expect(heal).toHaveTextContent('+6');
      expect(heal!.className).toContain('bg-cura');
      // O trecho que a cura devolve aparece em verde à frente do ouro, que enche atrás dele.
      expect(scaleOf('[data-cura-barra]')).toBeCloseTo(193 / max());
      expect(hp()).toBeGreaterThan(187);
      advance(400);
      expect(hp()).toBe(193);
      expect(meter().querySelector('[data-cura-barra]')).toBeNull();
    });

    it('golpe e cura no mesmo jogador: a vida desce no golpe e sobe na cura', () => {
      const m = mount(THEIRS);
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 143 } }, [ATTACK, HIT, removed, healed]);
      advance(1_150);
      expect(hp()).toBe(137);
      advance(700);
      expect(hp()).toBe(143);
    });

    it('um state novo no meio da contagem: a vida segue de onde a conta fecha, sem voltar à de antes', () => {
      const m = mount(THEIRS);
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 137 } }, [ATTACK, HIT]);
      advance(300);
      advance(1);
      advance(300);
      const midway = hp();
      expect(midway).toBeLessThan(187);
      // O segundo golpe chega com a mesa ainda tocando o primeiro (o bot responde logo).
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 87 } }, [ATTACK, HIT]);
      expect(hp()).toBeLessThanOrEqual(midway);
      advance(300);
      advance(1);
      advance(600);
      expect(hp()).toBe(87);
    });

    it('o golpe que mata conta até 0 e para ali, sem saltar depois (o motor fica com a vida negativa; o protótipo do golpe final mostra 0)', () => {
      const m = mount(THEIRS);
      const kill: GameEvent = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 300, defense: 100, damage: 200 };
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: -13 } }, [ATTACK, kill]);
      advance(300);
      advance(1);
      // Perto do fim da batida a contagem já chegou a 0; a vida em repouso também é 0, então nada salta no fim (o que tirou o primeiro corte, f16057a).
      advance(580);
      expect(hp()).toBe(0);
      advance(100);
      expect(hp()).toBe(0);
    });

    it('com movimento reduzido, a vida vai direto à nova, sem o trecho verde', () => {
      const m = mount(THEIRS, { prefs: { reduceMotion: true } });
      emit(m, { ...THEIRS, self: { ...THEIRS.self, hp: 193 } }, [ATTACK, removed, healed]);
      expect(hp()).toBe(193);
      expect(meter().querySelector('[data-cura-barra]')).toBeNull();
    });
  });

  it('o Roubo: o dano sobe no Coringa de quem foi roubado e a cura, "+N" em verde, no de quem roubou', () => {
    const m = mount(MINE);
    const nine = { id: 'n-9', kind: 'NUM', value: 9, suit: 'copas' } as const;
    emit(m, MINE, [
      { type: 'StealDamage', player: 'p1', victim: 'p2', value: 9, damage: 9, blocked: false },
      { type: 'Healed', player: 'p1', amount: 9, source: 'STEAL', card: nine },
    ]);
    advance(0);
    expect(m.container.querySelector('[data-dano]')).toHaveTextContent('−9');
    advance(BEAT_MS.damage);
    const heal = m.container.querySelector('[data-cura]');
    expect(heal).toHaveTextContent('+9');
    expect(heal!.className).toContain('bg-cura');
    expect(heal!.className).toContain('tabular-nums');
  });

  it('a espada troca de retrato na batida da iniciativa, e a moldura de ouro vai junto (sub-projeto 6 §4)', () => {
    const m = mount(THEIRS);
    const sword = () => m.container.querySelector('[data-espada]')!;
    const owner = (side: string) => m.container.querySelector(`[data-retrato="${side}"]`)!;
    expect(sword()).toHaveAttribute('data-iniciativa', 'voce');
    emit(m, { ...THEIRS, initiative: 'opponent' }, [TURN, { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 }, streak: 1 }]);
    // A view já é a nova, mas a espada espera a batida dela.
    expect(sword()).toHaveAttribute('data-iniciativa', 'voce');
    expect(owner('voce')).toHaveAttribute('data-dono');
    advance(400);
    expect(sword()).toHaveAttribute('data-iniciativa', 'oponente');
    expect(sword()).toHaveAttribute('data-voando');
    expect(owner('oponente')).toHaveAttribute('data-dono');
    expect(owner('voce')).not.toHaveAttribute('data-dono');
    expect(m.container.querySelectorAll('[data-iniciativa]')).toHaveLength(1);
  });

  it('a aura da iniciativa (bloco C, ponto 11): depois de 10 rodadas, segue acesa até a batida da decisão e apaga nela, com o sopro', () => {
    const before = { ...THEIRS, initiative: 'self', lastInitiative: { holder: 'self', changed: false, self: 9, opponent: 3, streak: 10 } } as const;
    const m = mount(before);
    const aura = () => m.container.querySelector('[data-lado="voce"] [data-aura-iniciativa]')?.getAttribute('data-aura-iniciativa') ?? null;
    expect(aura()).toBe('3');
    const after = { ...THEIRS, initiative: 'opponent', lastInitiative: { holder: 'opponent', changed: true, self: 3, opponent: 9, streak: 1 } } as const;
    emit(m, after, [TURN, { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 }, streak: 1 }]);
    advance(BEAT_MS.banner - 50);
    expect(aura()).toBe('3');
    expect(m.container.querySelector('[data-sopro]')).toBeNull();
    advance(100);
    expect(aura()).toBeNull();
    expect(m.container.querySelector('[data-lado="voce"] [data-sopro]')).not.toBeNull();
  });

  it('a aura sobe na batida da decisão que mantém a iniciativa', () => {
    const before = { ...THEIRS, initiative: 'self', lastInitiative: { holder: 'self', changed: false, self: 9, opponent: 3, streak: 4 } } as const;
    const m = mount(before);
    const aura = () => m.container.querySelector('[data-lado="voce"] [data-aura-iniciativa]')?.getAttribute('data-aura-iniciativa') ?? null;
    expect(aura()).toBe('1');
    emit(m, { ...before, lastInitiative: { ...before.lastInitiative, streak: 5 } }, [TURN, { type: 'InitiativeDecided', player: 'p1', changed: false, damage: { p1: 9, p2: 3 }, streak: 5 }]);
    advance(BEAT_MS.banner - 50);
    expect(aura()).toBe('1');
    advance(100);
    expect(aura()).toBe('2');
    expect(m.container.querySelector('[data-sopro]')).toBeNull();
  });

  it('num salto (resync) a aura e o selo vêm direto da view, sem sopro', () => {
    const m = mount({ ...THEIRS, initiative: 'self', lastInitiative: { holder: 'self', changed: false, self: 9, opponent: 3, streak: 10 } });
    emit(m, { ...THEIRS, initiative: 'opponent', lastInitiative: { holder: 'opponent', changed: false, self: 0, opponent: 9, streak: 6 } }, [], { resync: true });
    expect(m.container.querySelector('[data-lado="voce"] [data-aura-iniciativa]')).toBeNull();
    expect(m.container.querySelector('[data-lado="oponente"] [data-aura-iniciativa]')).toHaveAttribute('data-aura-iniciativa', '2');
    expect(m.container.querySelector('[data-sopro]')).toBeNull();
  });

  it('com movimento reduzido a aura fica parada: nenhuma partícula, e a forma não troca', () => {
    const m = mount({ ...THEIRS, initiative: 'self', lastInitiative: { holder: 'self', changed: false, self: 9, opponent: 3, streak: 10 } }, { prefs: { reduceMotion: true } });
    const shape = () => m.container.querySelector('[data-aura-iniciativa] path')?.getAttribute('d');
    const first = shape();
    advance(1_000);
    expect(shape()).toBe(first);
    expect(m.container.querySelectorAll('[data-particula]')).toHaveLength(0);
  });

  it('o voo segue o relógio dele: o state seguinte (o bot responde logo) não corta a espada no ar', () => {
    const m = mount(THEIRS);
    const after = { ...THEIRS, initiative: 'opponent' } as const;
    emit(m, after, [TURN, { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 }, streak: 1 }]);
    advance(400);
    expect(m.container.querySelector('[data-voando]')).not.toBeNull();
    emit(m, after, []);
    advance(100);
    expect(m.container.querySelector('[data-voando]')).toHaveAttribute('data-iniciativa', 'oponente');
    advance(1_000);
    expect(m.container.querySelector('[data-voando]')).toBeNull();
    expect(m.container.querySelector('[data-espada]')).toHaveAttribute('data-iniciativa', 'oponente');
  });

  it('com movimento reduzido a espada pula sem voo', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    emit(m, { ...THEIRS, initiative: 'opponent' }, [TURN, { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 }, streak: 1 }]);
    advance(400);
    expect(m.container.querySelector('[data-espada]')).toHaveAttribute('data-iniciativa', 'oponente');
    expect(m.container.querySelector('[data-voando]')).toBeNull();
  });

  it('num salto (resync) a espada troca de retrato de uma vez, sem voo', () => {
    const m = mount(THEIRS);
    emit(m, { ...THEIRS, initiative: 'opponent' }, [], { resync: true });
    expect(m.container.querySelector('[data-espada]')).toHaveAttribute('data-iniciativa', 'oponente');
    expect(m.container.querySelector('[data-voando]')).toBeNull();
  });

  it('a fita diz quem ataca primeiro e por quê', () => {
    const m = mount(THEIRS);
    emit(m, { ...THEIRS, initiative: 'opponent' }, [{ type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 }, streak: 1 }]);
    expect(banner(m.container)).toHaveAttribute('data-faixa', 'Duda ataca primeiro · causou mais dano na rodada · 9 × 3');
    expect(banner(m.container)).toHaveAttribute('data-fita');
  });

  it('a decisão que não muda: a espada salta no mesmo retrato, e a fita diz que segue', () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [{ type: 'InitiativeDecided', player: 'p1', changed: false, damage: { p1: 14, p2: 9 }, streak: 1 }]);
    const sword = m.container.querySelector('[data-espada]')!;
    expect(sword).toHaveAttribute('data-iniciativa', 'voce');
    expect(sword).toHaveAttribute('data-salto');
    expect(sword).not.toHaveAttribute('data-voando');
    expect(banner(m.container)).toHaveAttribute('data-faixa', 'Você segue atacando primeiro · causou mais dano na rodada · 14 × 9');
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

  it('cena, faixa e cena no mesmo `state`: a cortina desce e sobe entre elas, a segunda perde a inversão e nada passa de 3 por segundo', () => {
    const m = mount(MINE);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, MINE, [SCENE, TURN, SCENE_2]);
    trace.sample();
    trace.run(4_500);
    expect(trace.flips[0]).toHaveLength(4);
    expect(trace.flips[1]).toEqual([150, 750]);
    expectFlashSafe(trace.all);
  });

  it('numa cena longa, a cortina que a conta recusou sobe assim que a regra deixa, e nada passa de 3 por segundo', () => {
    // O espelho, a faixa da janela de reação e o gatilho logo depois (visto no navegador, 2026-11-02): a cortina desceu, a faixa subiu e
    // desceu, e a subida de agora seria a quarta troca em 1 s.
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    const silent = NO_INVERT as Set<SceneKind>;
    silent.add('REFLECT_PLAYED');
    emit(m, THEIRS, [SCENE, TURN]);
    silent.delete('REFLECT_PLAYED');
    trace.sample();
    trace.run(1_950);
    expect(curtainUp(m.container)).toBe(false);
    emit(m, THEIRS, [{ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 40 }]);
    trace.sample();
    expect(curtainUp(m.container)).toBe(false);
    trace.run(1_000);
    expect(curtainUp(m.container)).toBe(true);
    trace.run(RARE_SCENE_MS.REFLECT_TRIGGERED + 1_500);
    expect(curtainUp(m.container)).toBe(false);
    expectFlashSafe(trace.all);
  });

  it('numa cena curta demais para ela valer a pena, a cortina recusada não sobe', () => {
    const m = mount(THEIRS);
    const trace = watchMany([() => curtainUp(m.container)]);
    const silent = NO_INVERT as Set<SceneKind>;
    silent.add('REFLECT_PLAYED');
    emit(m, THEIRS, [SCENE, TURN]);
    trace.sample();
    trace.run(1_950);
    emit(m, THEIRS, [SCENE]);
    silent.delete('REFLECT_PLAYED');
    trace.run(1_490);
    expect(curtainUp(m.container)).toBe(false);
  });

  it('o Ataque Absoluto que bate num Reflect: uma inversão só, a do cometa, e nada passa de 3 por segundo', () => {
    const m = mount(MINE);
    const trace = watchMany([() => curtainUp(m.container), () => inverted(m.container)]);
    emit(m, MINE, [ABSOLUTE, { type: 'GuardBroken', player: 'p2', cards: [] }, { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 40 }]);
    trace.sample();
    trace.run(RARE_SCENE_MS.ABSOLUTE_ATTACK + RARE_SCENE_MS.REFLECT_TRIGGERED + 1_500);
    expect(trace.flips[1]).toHaveLength(2);
    expect(trace.flips[1]![1]! - trace.flips[1]![0]!).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
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

  it('a regra cheia: a cena longa começa sem a cortina e sem inversão, e a cortina sobe quando a regra deixa', async () => {
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
    expect(curtainUp(m.container)).toBe(false);
    trace.run(1_700);
    // A cortina da segunda cena espera a conta (subir na hora quebraria o limite); a inversão, não: o resfriamento a tira.
    expect(trace.flips[0]).toHaveLength(3);
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
    trace.run(RARE_SCENE_MS.ABSOLUTE_ATTACK);
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
    advance(0);
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

  it('devolver o foco depois da remontagem não apaga a marca "novo"', async () => {
    const m = mount(MINE);
    emit(m, dealt, DEALS);
    const card = () => m.container.querySelector<HTMLElement>('[data-card-id="n-novo"]')!;
    card().focus();
    const markSeen = vi.spyOn(m.session, 'markSeen');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await m.user.keyboard('{Escape}');
    expect(document.activeElement).toBe(card());
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
    // O Coringa de cada um mora no retrato do placar (sub-projeto 6 §3).
    const theirs = () => m.container.querySelector('[data-retrato="oponente"]')!;
    const mine = () => m.container.querySelector('[data-retrato="voce"]')!;
    expect(theirs().querySelector('[data-escudo-quebra]')).toBeNull();
    advance(400);
    expect(theirs().querySelector('[data-escudo-quebra]')).not.toBeNull();
    expect(mine().querySelector('[data-escudo-quebra]')).toBeNull();
    advance(RARE_SCENE_MS.REFLECT_CANCELED);
    expect(theirs().querySelector('[data-escudo-quebra]')).toBeNull();
  });

  it('o escudo que quebra também aparece no Coringa do próprio dono, com movimento reduzido só esmaecendo', () => {
    const m = mount(MINE, { prefs: { reduceMotion: true } });
    emit(m, MINE, [{ type: 'ReflectCanceled', player: 'p2', owner: 'p1' }]);
    expect(m.container.querySelector('[data-retrato="voce"] [data-escudo-quebra]')).not.toBeNull();
  });

  it('o ouro de quem lidera troca no pouso da carta que vira a liderança, e não quando o passo chega (bloco C, ponto 13)', () => {
    // A sua Defesa: 23 × 2 = 46; a dele: 14 × 3 = 42. O terceiro Q dele (o momento da especial do oponente) leva a dele a 14 × 4 = 56.
    const m = mount(THEIRS);
    const leads = (key: string) => m.container.querySelector(`[data-fileira="${key}"] [data-lider]`) !== null;
    expect(leads('p1:DEF')).toBe(true);
    const after: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, defenseBuffs: ['Q', 'Q', 'Q'] } };
    const queen = scenarioAt(after).view.opponent.defenseBuffs.at(-1)!;
    emit(m, after, [{ type: 'BuffPlayed', player: 'p2', card: queen, as: 'Q' }]);
    advance(800);
    expect(leads('p1:DEF')).toBe(true);
    expect(leads('p2:DEF')).toBe(false);
    advance(2_000);
    expect(leads('p1:DEF')).toBe(false);
    expect(leads('p2:DEF')).toBe(true);
  });

  it('o nível da zona sobe no pouso da carta, como o total e o ouro, e não quando o passo chega (bloco C, ponto 10)', () => {
    // Os 2 Q dele acendem (nível 1); o terceiro (o momento da especial do oponente) é a muralha (nível 2), mas só quando pousa.
    const m = mount(THEIRS);
    const zone = () => m.container.querySelector('[data-campo="p2"] [data-poder="Q"]')!;
    expect(zone()).toHaveAttribute('data-nivel', '1');
    const after: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, defenseBuffs: ['Q', 'Q', 'Q'] } };
    const queen = scenarioAt(after).view.opponent.defenseBuffs.at(-1)!;
    emit(m, after, [{ type: 'BuffPlayed', player: 'p2', card: queen, as: 'Q' }]);
    advance(800);
    expect(zone()).toHaveAttribute('data-nivel', '1');
    expect(zone().querySelector('[data-poder-camada]')).toHaveAttribute('data-poder-camada', 'Q1');
    // A vaga da carta que ainda voa não acende (o anel é da `li`, que já está no lugar).
    expect(zone().querySelectorAll('ul > li[data-pousando]')).toHaveLength(1);
    advance(2_000);
    expect(zone()).toHaveAttribute('data-nivel', '2');
    expect(zone().querySelector('[data-poder-camada]')).toHaveAttribute('data-poder-camada', 'Q2');
    expect(zone().querySelectorAll('ul > li[data-pousando]')).toHaveLength(0);
  });

  it('o escudo de ouro da zona dos Q chega com a insígnia do retrato, depois da cena da Defesa Absoluta', () => {
    const m = mount(THEIRS);
    const zone = () => m.container.querySelector('[data-campo="p1"] [data-poder="Q"]')!;
    emit(m, { ...THEIRS, self: { ...THEIRS.self, defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } }, [{ type: 'AbsoluteDefenseStarted', player: 'p1' }]);
    advance(RARE_SCENE_MS.ABSOLUTE_DEFENSE - 100);
    expect(zone()).toHaveAttribute('data-nivel', '2');
    advance(200);
    expect(zone()).toHaveAttribute('data-nivel', '3');
  });

  it('a conta da fileira acompanha o total mostrado: não mostra o multiplicador novo com o total velho', () => {
    const m = mount(THEIRS);
    const row = () => screen.getByRole('group', { name: 'Sua fileira de defesa' });
    expect(row().querySelector('[data-total]')).toHaveTextContent('46');
    expect(row().querySelector('[data-conta]')).toHaveTextContent('23 × 2');
    // O Q dos bônus de defesa some: o total do motor cai para 23 (23 × 1), mas só na batida do dano.
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
    // O Reflect segue com o painel; o Ataque Absoluto ganhou desenho próprio no sub-projeto 6 (fatia 2).
    emit(m, THEIRS, [SCENE]);
    expect(panel(m.container)).toBe(first);
    expect(first.className).toContain('opacity-100');
    expect(first.className).not.toContain('opacity-0');
    expect(first).toHaveAttribute('data-ativo', 'true');
    advance(RARE_SCENE_MS.REFLECT_PLAYED + 100);
    // No fim da cena o painel continua na página, com o texto dela, só apagado.
    expect(panel(m.container)).toBe(first);
    expect(first.className).toContain('opacity-0');
    expect(first.className).toContain('transition-opacity');
    expect(first).not.toHaveAttribute('data-ativo');
    expect(first).toHaveTextContent('REFLECT');
  });

  it('com a cortina negada o painel também esmaece, e nenhuma cortina sobe', async () => {
    const m = mount(THEIRS);
    emit(m, THEIRS, [SCENE]);
    advance(400);
    await m.user.click(stage(m.container));
    advance(700);
    // Uma cena que segue com o painel (a Defesa Absoluta ganhou desenho próprio no sub-projeto 6).
    emit(m, THEIRS, [SCENE_2]);
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
