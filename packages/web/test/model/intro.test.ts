// A abertura do jogo (decisoes.md 2026-11-16 (5); sem a logo LUSACAN desde 2026-11-19 (6); sem o título, a aura, o anel e as faíscas desde
// 2026-11-25 (2)): os tempos, as pistas de som e o que pula. O
// que a pessoa vê (a ordem das cenas, o aviso, o esmaecer) sai destes números: o CSS da abertura só lê as variáveis que o componente
// monta a partir daqui.
import { describe, expect, it } from 'vitest';
import { INTRO, INTRO_REDUCED, SKIP_FADE_MS, introPlan, skipsIntro, type IntroKey } from '../../src/model/intro.ts';

const key = (name: string, mods: Partial<IntroKey> = {}): IntroKey => ({ key: name, ctrlKey: false, metaKey: false, altKey: false, ...mods });

describe('a abertura: os tempos', () => {
  it('é só a intro do jogo, mais curta sem o título (2026-11-25 (2)): de 2 a 2,7 segundos (2026-11-26 (3): acaba em 2,65 s)', () => {
    expect(INTRO.total).toBeGreaterThanOrEqual(2000);
    expect(INTRO.total).toBeLessThanOrEqual(2700);
  });

  it('a primeira carta sobe logo, com um respiro curto depois da capa escura', () => {
    expect(INTRO.themeAt).toBeGreaterThan(0);
    expect(INTRO.themeAt).toBeLessThanOrEqual(300);
  });

  it('as cenas vêm em ordem: as cartas, a junção, a virada no Coringa, o menu', () => {
    const order = [0, INTRO.themeAt, INTRO.gatherAt, INTRO.flipAt, INTRO.fadeAt, INTRO.total];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });

  it('a pista do som começa na junção (ou depois) e antes da virada, onde cai a chamada', () => {
    expect(INTRO.revealCueAt).toBeGreaterThanOrEqual(INTRO.gatherAt);
    expect(INTRO.revealCueAt).toBeLessThan(INTRO.flipAt);
    expect(INTRO).not.toHaveProperty('titleAt');
    expect(INTRO).not.toHaveProperty('titleCueAt');
  });

  it('as quatro cartas sobem uma depois da outra, cada vez mais depressa, e todas pousam antes de se juntarem', () => {
    expect(INTRO.cardDelays).toHaveLength(4);
    const gaps = INTRO.cardDelays.slice(1).map((delay, i) => delay - INTRO.cardDelays[i]!);
    expect(gaps.every((gap) => gap > 0)).toBe(true);
    expect([...gaps].sort((a, b) => b - a)).toEqual(gaps);
    expect(INTRO.themeAt + INTRO.cardDelays[3]! + INTRO.cardRiseMs).toBeLessThanOrEqual(INTRO.gatherAt);
  });

  it('o Coringa entra quando o maço termina de sair (150 ms) e pousa 240 ms depois, os gestos do CSS', () => {
    expect(INTRO.coringaInAt).toBe(INTRO.flipAt + 150);
    expect(INTRO.revealAt).toBe(INTRO.coringaInAt + 240);
  });

  it('o Coringa pousado fica parado antes do esmaecer pelo menos meio segundo (2026-11-26 (3))', () => {
    expect(INTRO.fadeAt - INTRO.revealAt).toBeGreaterThanOrEqual(500);
  });

  it('o aviso de pular entra aos 0,5 s, nas duas versões', () => {
    expect(INTRO.hintAt).toBe(500);
    expect(INTRO_REDUCED.hintAt).toBe(500);
  });

  it('a passagem do escuro para o menu é um esmaecer só, de pelo menos 300 ms (fotossensibilidade, spec §10.4)', () => {
    expect(INTRO.total - INTRO.fadeAt).toBeGreaterThanOrEqual(300);
    expect(INTRO_REDUCED.total - INTRO_REDUCED.fadeAt).toBeGreaterThanOrEqual(300);
  });

  it('com movimento reduzido é curta: o Coringa parado e o esmaecer, em menos de 2 s', () => {
    expect(INTRO_REDUCED.total).toBeLessThan(2000);
    expect(INTRO_REDUCED.fadeAt).toBeGreaterThan(INTRO_REDUCED.hintAt);
  });

  it('o pulo esmaece depressa', () => {
    expect(SKIP_FADE_MS).toBeGreaterThan(0);
    expect(SKIP_FADE_MS).toBeLessThanOrEqual(200);
  });
});

describe('a abertura: o plano de cada versão', () => {
  it('a completa toca a chamada, com a pista começando antes da virada', () => {
    expect(introPlan(false)).toEqual({
      variant: 'completa',
      hintAt: INTRO.hintAt,
      fadeAt: INTRO.fadeAt,
      total: INTRO.total,
      cues: [{ at: INTRO.revealCueAt, cue: 'abertura-titulo' }],
    });
  });

  it('a curta, parada, é muda', () => {
    expect(introPlan(true)).toEqual({
      variant: 'curta',
      hintAt: INTRO_REDUCED.hintAt,
      fadeAt: INTRO_REDUCED.fadeAt,
      total: INTRO_REDUCED.total,
      cues: [],
    });
  });
});

describe('a abertura: o que pula', () => {
  it.each(['Enter', ' ', 'Escape', 'a', 'Z', '5', 'ArrowDown', 'Tab', 'Backspace'])('a tecla %j pula', (name) => {
    expect(skipsIntro(key(name))).toBe(true);
  });

  it.each(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'NumLock', 'ScrollLock', 'Fn', 'OS'])('a tecla de modificador %j sozinha não pula', (name) => {
    expect(skipsIntro(key(name))).toBe(false);
  });

  it('um atalho do navegador ou do sistema não pula (Ctrl+R, Cmd+L, Alt+Tab)', () => {
    expect(skipsIntro(key('r', { ctrlKey: true }))).toBe(false);
    expect(skipsIntro(key('l', { metaKey: true }))).toBe(false);
    expect(skipsIntro(key('Tab', { altKey: true }))).toBe(false);
  });

  it.each(['F5', 'F11', 'F12', 'AudioVolumeUp', 'AudioVolumeMute', 'MediaPlayPause', 'PrintScreen', 'ContextMenu', 'Unidentified', 'Dead', 'Process'])(
    'a tecla %j (função, mídia, sem nome) não pula',
    (name) => {
      expect(skipsIntro(key(name))).toBe(false);
    },
  );

  it('Enter, Espaço e Esc pulam mesmo com o Shift (que não está entre os modificadores de atalho)', () => {
    expect(skipsIntro({ key: 'Enter', ctrlKey: false, metaKey: false, altKey: false })).toBe(true);
  });
});
