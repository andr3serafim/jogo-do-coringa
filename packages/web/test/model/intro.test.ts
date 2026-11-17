// A abertura do jogo (decisoes.md 2026-11-16 (5)): os tempos, as pistas de som e o que pula. O que a pessoa vê (a ordem das cenas, o
// aviso, o esmaecer) sai destes números: o CSS da abertura só lê as variáveis que o componente monta a partir daqui.
import { describe, expect, it } from 'vitest';
import { INTRO, INTRO_REDUCED, SKIP_FADE_MS, introPlan, skipsIntro, type IntroKey } from '../../src/model/intro.ts';

const key = (name: string, mods: Partial<IntroKey> = {}): IntroKey => ({ key: name, ctrlKey: false, metaKey: false, altKey: false, ...mods });

describe('a abertura: os tempos', () => {
  it('dura entre 4 e 6 segundos', () => {
    expect(INTRO.total).toBeGreaterThanOrEqual(4000);
    expect(INTRO.total).toBeLessThanOrEqual(6000);
  });

  it('a logo fica na tela cerca de 1,5 s, e a intro do jogo de 3 a 4 s', () => {
    const logo = INTRO.themeAt - INTRO.logoAt;
    expect(logo).toBeGreaterThanOrEqual(1300);
    expect(logo).toBeLessThanOrEqual(1700);
    const theme = INTRO.total - INTRO.themeAt;
    expect(theme).toBeGreaterThanOrEqual(3000);
    expect(theme).toBeLessThanOrEqual(4000);
  });

  it('as cenas vêm em ordem: a logo, o olho que abre, a saída da logo, as cartas, a virada, o título, o menu', () => {
    const order = [0, INTRO.logoAt, INTRO.logoCueAt, INTRO.eyeAt, INTRO.logoOutAt, INTRO.themeAt, INTRO.gatherAt, INTRO.flipAt, INTRO.titleCueAt, INTRO.titleAt, INTRO.fadeAt, INTRO.total];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });

  it('as quatro cartas sobem uma depois da outra, cada vez mais depressa, e todas pousam antes de se juntarem', () => {
    expect(INTRO.cardDelays).toHaveLength(4);
    const gaps = INTRO.cardDelays.slice(1).map((delay, i) => delay - INTRO.cardDelays[i]!);
    expect(gaps.every((gap) => gap > 0)).toBe(true);
    expect([...gaps].sort((a, b) => b - a)).toEqual(gaps);
    expect(INTRO.themeAt + INTRO.cardDelays[3]! + INTRO.cardRiseMs).toBeLessThanOrEqual(INTRO.gatherAt);
  });

  it('o aviso de pular entra aos 0,5 s, nas duas versões', () => {
    expect(INTRO.hintAt).toBe(500);
    expect(INTRO_REDUCED.hintAt).toBe(500);
  });

  it('a passagem do escuro para o menu é um esmaecer só, de pelo menos 300 ms (fotossensibilidade, spec §10.4)', () => {
    expect(INTRO.total - INTRO.fadeAt).toBeGreaterThanOrEqual(300);
    expect(INTRO_REDUCED.total - INTRO_REDUCED.fadeAt).toBeGreaterThanOrEqual(300);
  });

  it('com movimento reduzido é curta: a logo e o esmaecer, em menos de 2 s', () => {
    expect(INTRO_REDUCED.total).toBeLessThan(2000);
    expect(INTRO_REDUCED.fadeAt).toBeGreaterThan(INTRO_REDUCED.hintAt);
  });

  it('o pulo esmaece depressa', () => {
    expect(SKIP_FADE_MS).toBeGreaterThan(0);
    expect(SKIP_FADE_MS).toBeLessThanOrEqual(200);
  });
});

describe('a abertura: o plano de cada versão', () => {
  it('a completa toca o sopro da logo e a chamada do título, nos instantes delas', () => {
    expect(introPlan(false)).toEqual({
      variant: 'completa',
      hintAt: INTRO.hintAt,
      fadeAt: INTRO.fadeAt,
      total: INTRO.total,
      cues: [
        { at: INTRO.logoCueAt, cue: 'abertura-logo' },
        { at: INTRO.titleCueAt, cue: 'abertura-titulo' },
      ],
    });
  });

  it('a curta só toca o sopro da logo', () => {
    expect(introPlan(true)).toEqual({
      variant: 'curta',
      hintAt: INTRO_REDUCED.hintAt,
      fadeAt: INTRO_REDUCED.fadeAt,
      total: INTRO_REDUCED.total,
      cues: [{ at: INTRO_REDUCED.logoCueAt, cue: 'abertura-logo' }],
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
