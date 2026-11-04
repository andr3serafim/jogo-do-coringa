// O momento da especial do oponente na mesa (bloco A dos pontos do playtest, ponto 1): a conta do turno entre um `state` e outro, o véu
// leve pela mesma trava de flash da cortina e, online, a sua especial que segura o tempo do momento que o oponente vê (decisoes.md
// 2026-11-03 (5), A9a).
import type { GameEvent, SpecialCard } from '@coringa/engine';
import { MOMENT_TAIL_MS, SPECIAL_MOMENT_MS } from '@coringa/protocol';
import { act, render } from '@testing-library/react';
import { namesFor } from '@coringa/sim/text';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTimeline } from '../../src/model/timeline.ts';
import { MomentLayer } from '../../src/ui/anim/Moment.tsx';
import type { Run } from '../../src/ui/anim/useBeatPlayer.ts';
import type { Cue } from '../../src/model/sound.ts';
import { TABLE_MOTION } from '../../src/model/table-motion.ts';
import { SoundContext, type SoundApi } from '../../src/ui/sound-context.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { advance, busy, cleanup, connect, emit, MINE, mount, stage, THEIRS, TURN } from './anim-harness.tsx';
import { scenarioAt, type ViewSpec } from '../fixtures.ts';

afterEach(cleanup);

const JB: SpecialCard = { id: 'jb', kind: 'J', suit: 'paus' };
const JB2: SpecialCard = { id: 'jb2', kind: 'J', suit: 'copas' };
const botBuff = (card: SpecialCard): GameEvent => ({ type: 'BuffPlayed', player: 'p2', card, as: 'J' });
const BOT_ONE: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, attackBuffs: [JB] } };
const BOT_TWO: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, attackBuffs: [JB, JB2] } };

/** Quanto tempo as batidas ficam no ar, em passos de 50 ms (o palco tira `data-ocupado` no fim). */
function busyFor(container: HTMLElement): number {
  let ms = 0;
  while (busy(container) && ms < 10_000) {
    advance(50);
    ms += 50;
  }
  return ms;
}

const veil = (container: HTMLElement) => container.querySelector('[data-cortina][data-ativa][data-veu="momento"]');

describe('a conta do turno, de um state para o outro', () => {
  it('a segunda especial do Bot no mesmo turno é mais curta; o TurnStarted zera', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [TURN, botBuff(JB)]);
    expect(busyFor(m.container)).toBe(400 + SPECIAL_MOMENT_MS.first);
    emit(m, BOT_TWO, [botBuff(JB2)]);
    expect(busyFor(m.container)).toBe(SPECIAL_MOMENT_MS.next);
    emit(m, BOT_ONE, [TURN, botBuff(JB)]);
    expect(busyFor(m.container)).toBe(400 + SPECIAL_MOMENT_MS.first);
  });

  it('o resync zera a conta', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [TURN, botBuff(JB)]);
    busyFor(m.container);
    emit(m, BOT_ONE, [], { resync: true });
    emit(m, BOT_TWO, [botBuff(JB2)]);
    expect(busyFor(m.container)).toBe(SPECIAL_MOMENT_MS.first);
  });
});

describe('o véu do momento', () => {
  it('sobe com o momento, é o leve, e desce no fim dele', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [botBuff(JB)]);
    // A cortina sobe no timer da batida (0 ms), como a das cenas.
    advance(10);
    expect(veil(m.container)).not.toBeNull();
    advance(SPECIAL_MOMENT_MS.first + 400);
    expect(m.container.querySelector('[data-cortina][data-ativa]')).toBeNull();
  });

  it('o Q do Bot que abre a Defesa Absoluta: o véu vira a cortina da cena sem descer, e o fundo esmaece de um para o outro', () => {
    const m = mount(THEIRS, { training: 'medio' });
    const QB: SpecialCard = { id: 'qb', kind: 'Q', suit: 'paus' };
    emit(m, { ...THEIRS, opponent: { ...THEIRS.opponent, defenseBuffs: [QB], absoluteDefense: true } }, [
      { type: 'BuffPlayed', player: 'p2', card: QB, as: 'Q' },
      { type: 'AbsoluteDefenseStarted', player: 'p2' },
    ]);
    advance(10);
    expect(veil(m.container)).not.toBeNull();
    advance(SPECIAL_MOMENT_MS.first + 10);
    const curtain = m.container.querySelector('[data-cortina][data-ativa]');
    expect(curtain).not.toBeNull();
    expect(curtain).not.toHaveAttribute('data-veu');
    // A troca de 35% para 60% é uma subida de luminância sem a trava: esmaece junto com a opacidade, nunca de uma vez.
    expect(curtain!.className).toContain('transition-[opacity,background-color]');
  });

  it('com movimento reduzido, nenhum véu', () => {
    const m = mount(THEIRS, { training: 'medio', prefs: { reduceMotion: true } });
    emit(m, BOT_ONE, [botBuff(JB)]);
    expect(m.container.querySelector('[data-cortina][data-ativa]')).toBeNull();
  });

  it('o pulo no meio: o véu desce e a carta de verdade aparece na hora', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [botBuff(JB)]);
    advance(300);
    expect(m.container.querySelector('[data-card-id="jb"]')).toHaveAttribute('data-entra');
    act(() => stage(m.container).click());
    expect(m.container.querySelector('[data-card-id="jb"]')).not.toHaveAttribute('data-entra');
    advance(1_100);
    expect(m.container.querySelector('[data-cortina][data-ativa]')).toBeNull();
  });
});

describe('online, a sua especial espera o momento que o oponente vê (A9a)', () => {
  const J1: SpecialCard = { id: 'j1', kind: 'J', suit: 'espadas' };
  const J2: SpecialCard = { id: 'j2', kind: 'J', suit: 'ouros' };
  const MY_TURN: GameEvent = { type: 'TurnStarted', player: 'p1' };
  const myBuff = (card: SpecialCard): GameEvent => ({ type: 'BuffPlayed', player: 'p1', card, as: 'J' });
  const HAND: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [J1, J2], attackBuffs: [] } };
  const ONE: ViewSpec = { ...HAND, self: { ...HAND.self, hand: [J2], attackBuffs: [J1] } };
  const TWO: ViewSpec = { ...HAND, self: { ...HAND.self, hand: [], attackBuffs: [J1, J2] } };

  it('a primeira do turno segura 1,6 s, a segunda 1,1 s, sem véu nem carta grande', () => {
    const m = mount(HAND);
    emit(m, ONE, [MY_TURN, myBuff(J1)]);
    expect(veil(m.container)).toBeNull();
    expect(busyFor(m.container)).toBe(400 + SPECIAL_MOMENT_MS.first);
    emit(m, TWO, [myBuff(J2)]);
    expect(busyFor(m.container)).toBe(SPECIAL_MOMENT_MS.next);
  });

  it('o seu Ás espera também o impacto que o oponente vê (o alvo quebrando): 1,6 s e mais a cauda', () => {
    const A1: SpecialCard = { id: 'a1', kind: 'A', suit: 'espadas' };
    const JX: SpecialCard = { id: 'jx', kind: 'J', suit: 'copas' };
    const before: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [A1] }, opponent: { ...MINE.opponent, attackBuffs: [JX] } };
    const after: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [] }, opponent: { ...MINE.opponent, attackBuffs: [] } };
    const m = mount(before);
    emit(m, after, [MY_TURN, { type: 'TrapUsed', player: 'p1', card: A1, target: JX, targetOwner: 'p2' }]);
    advance(400 + SPECIAL_MOMENT_MS.first + MOMENT_TAIL_MS - 1);
    expect(busy(m.container)).toBe(true);
    advance(1);
    expect(busy(m.container)).toBe(false);
  });

  it('no treino, a sua especial é a jogada de sempre', () => {
    const m = mount(HAND, { training: 'medio' });
    emit(m, ONE, [MY_TURN, myBuff(J1)]);
    expect(busyFor(m.container)).toBe(400 + 300);
  });
});

describe('a carta grande e a placa (Task 4)', () => {
  const layer = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-momento]');
  const plate = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-placa-momento]');

  it('a cópia da carta e a placa, escondidas do leitor de tela, sem data-card-id', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [botBuff(JB)]);
    const shown = layer(m.container)!;
    expect(shown).toHaveAttribute('data-momento', 'BuffPlayed');
    expect(shown).toHaveAttribute('aria-hidden', 'true');
    expect(shown.querySelector('[data-card-id]')).toBeNull();
    expect(plate(m.container)).toHaveTextContent('Duda pôs 1 J nos Bônus de ataque');
    expect(plate(m.container)).toHaveTextContent('o Ataque dele vai a');
  });

  it('as fases: a virada, a placa, o voo, e a camada some no impacto', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [botBuff(JB)]);
    expect(layer(m.container)).toHaveAttribute('data-fase', 'flip');
    expect(plate(m.container)).not.toHaveAttribute('data-visivel');
    advance(300);
    expect(layer(m.container)).toHaveAttribute('data-fase', 'plate');
    expect(plate(m.container)).toHaveAttribute('data-visivel', 'true');
    advance(1_000);
    expect(layer(m.container)).toHaveAttribute('data-fase', 'fly');
    expect(plate(m.container)).not.toHaveAttribute('data-visivel');
    advance(300);
    expect(layer(m.container)).toBeNull();
  });

  it('a Armadilha dele no seu J: depois do impacto, a carta dele segue ao cemitério e some', () => {
    const J9: SpecialCard = { id: 'j9', kind: 'J', suit: 'ouros' };
    const before: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, attackBuffs: [J9] } };
    const after: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, attackBuffs: [] } };
    const m = mount(before, { training: 'medio' });
    emit(m, after, [{ type: 'TrapUsed', player: 'p2', card: { id: 'a1', kind: 'A', suit: 'paus' }, target: J9, targetOwner: 'p1' }]);
    expect(plate(m.container)).toHaveTextContent('Duda quebra 1 J seu');
    advance(SPECIAL_MOMENT_MS.first);
    expect(layer(m.container)).toHaveAttribute('data-fase', 'exit');
    advance(359);
    expect(layer(m.container)).not.toBeNull();
    advance(1);
    expect(layer(m.container)).toBeNull();
  });

  it('o pulo no meio tira a camada na hora', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [botBuff(JB)]);
    advance(400);
    act(() => stage(m.container).click());
    expect(layer(m.container)).toBeNull();
  });

  it('com movimento reduzido: a carta e a placa já estão no centro, sem o verso', () => {
    const m = mount(THEIRS, { training: 'medio', prefs: { reduceMotion: true } });
    emit(m, BOT_ONE, [botBuff(JB)]);
    expect(layer(m.container)).toHaveAttribute('data-reduzido', 'true');
    expect(plate(m.container)).toHaveAttribute('data-visivel', 'true');
    expect(m.container.querySelector('[data-momento-verso]')).toBeNull();
  });
});

describe('o som do momento (Task 4)', () => {
  function mountWithSound(spec: ViewSpec) {
    const base = connect(spec);
    const played: Cue[] = [];
    const api: SoundApi = { play: (cue) => void played.push(cue), setEnabled: () => {}, cut: () => {} };
    const rendered = render(
      <SoundContext value={api}>
        <PlayTable session={base.session} training="medio" />
      </SoundContext>,
    );
    return { ...base, ...rendered, played };
  }

  it('a virada no começo, o pouso quando a carta chega', () => {
    const m = mountWithSound(THEIRS);
    emit(m, BOT_ONE, [botBuff(JB)]);
    advance(10);
    expect(m.played).toEqual(['momento']);
    advance(SPECIAL_MOMENT_MS.first - TABLE_MOTION.dropMs - 20);
    expect(m.played).toEqual(['momento']);
    advance(20);
    expect(m.played).toEqual(['momento', 'pouso']);
  });

  it('pulado antes, o pouso não soa depois', () => {
    const m = mountWithSound(THEIRS);
    emit(m, BOT_ONE, [botBuff(JB)]);
    advance(400);
    act(() => stage(m.container).click());
    advance(3_000);
    expect(m.played).not.toContain('pouso');
  });
});

describe('o momento que terminou não volta (a corrida dos dois timers, achada no E2E)', () => {
  it('a batida ainda é o momento quando o timer dele vence: a camada sai e não remonta', () => {
    vi.useFakeTimers();
    const view = scenarioAt(BOT_ONE).view;
    const [beat] = buildTimeline([botBuff(JB)], { mode: 'live', reducedMotion: false, decisionPending: false, viewer: 'p1' });
    const run = { beats: [beat!] } as unknown as Run;
    const names = namesFor('p1', 'Bot');
    const shown = render(<MomentLayer run={run} beat={beat!} cut={false} view={view} names={names} reduced={false} />);
    expect(shown.container.querySelector('[data-momento]')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(SPECIAL_MOMENT_MS.first);
    });
    // O palco ainda não encerrou a batida (o mesmo `beat` chega de novo): a camada fica fora.
    shown.rerender(<MomentLayer run={run} beat={beat!} cut={false} view={view} names={names} reduced={false} />);
    expect(shown.container.querySelector('[data-momento]')).toBeNull();
    shown.unmount();
    vi.useRealTimers();
  });
});
