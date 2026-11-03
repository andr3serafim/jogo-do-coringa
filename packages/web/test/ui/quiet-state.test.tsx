// O `state` quieto no meio das batidas (decisoes.md 2026-11-03 (1), ponto 17, o online): o servidor aplica o Equipar vazio de quem
// recebeu zero numéricas logo depois do passo que deu as cartas (`autoSteps`), e os dois `state`s chegam em mensagens seguidas. O
// segundo só traz `EquipSubmitted`, que não tem batida: ele não corta o golpe que fecha a rodada, com a cena do Ataque Absoluto
// junto. O mesmo vale para o oponente que confirma o Equipar no meio do golpe. Um `state` com batidas, de outra época, o `resync` e o
// `catchUp` seguem trocando a linha do tempo, como sempre.
import type { GameEvent, SpecialCard } from '@coringa/engine';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline, timelineMs } from '../../src/model/timeline.ts';
import { useAnim } from '../../src/ui/anim/context.ts';
import { HIT_COUNT_MS, Stage } from '../../src/ui/anim/Stage.tsx';
import type { ViewSpec } from '../fixtures.ts';
import { ABSOLUTE, advance, busy, cleanup, connect, emit, mount, scene, THEIRS } from './anim-harness.tsx';

afterEach(cleanup);

const hp = () => Number(screen.getByRole('region', { name: 'Placar' }).querySelector('[data-lado="voce"] [data-hp]')!.textContent);

/** As duas especiais que eu recebi no Equipar novo: nenhuma numérica. */
const DEALT: SpecialCard[] = [
  { id: 'novo-k', kind: 'K', suit: 'copas' },
  { id: 'novo-a', kind: 'A', suit: 'paus' },
];

/** A mesa depois do golpe que fechou a rodada: Equipar novo, eu sem numéricas (ainda sem confirmar) e Duda com duas. */
const AFTER_BLOW: ViewSpec = {
  ...THEIRS,
  round: 11,
  phase: { kind: 'EQUIP' },
  self: { ...THEIRS.self, hp: 137, hand: [...(THEIRS.self?.hand ?? []), ...DEALT], pending: [] },
  opponent: { ...THEIRS.opponent, pending: [4, 7] },
};
/** O Equipar vazio que o servidor aplica em meu nome. */
const AUTO_EQUIPPED: ViewSpec = { ...AFTER_BLOW, self: { ...AFTER_BLOW.self, equipSubmitted: true } };

const HIT_50: GameEvent = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 100, defense: 50, damage: 50 };
/** O fim da rodada de Ataque e a compra do Equipar seguinte, no mesmo passo do golpe. */
const ROUND_END: GameEvent[] = [
  { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 0, p2: 50 } },
  { type: 'RoundStarted', round: 11, kind: 'EQUIP' },
  { type: 'CardsDealt', player: 'p2', count: 2 },
  { type: 'CardsDealt', player: 'p1', count: 2, cards: DEALT },
];
const CLOSED: GameEvent = { type: 'ReactionWindowClosed', responder: 'p1', trigger: 'ATTACK' };
/** O Ataque Absoluto de Duda que fecha a rodada. */
const ABSOLUTE_BLOW: GameEvent[] = [CLOSED, ABSOLUTE, HIT_50, ...ROUND_END];
/** Um golpe comum que fecha a rodada. */
const PLAIN_BLOW: GameEvent[] = [CLOSED, HIT_50, ...ROUND_END];
const MY_EMPTY_EQUIP: GameEvent[] = [{ type: 'EquipSubmitted', player: 'p1' }];

/** A duração da linha do tempo do golpe, como a mesa a monta: eu tenho o Equipar (vazio) para confirmar, então há decisão esperando. */
const blowMs = (events: GameEvent[]) => timelineMs(buildTimeline(events, { mode: 'live', reducedMotion: false, decisionPending: true }));

describe('o state quieto não corta as batidas em curso (ponto 17, online)', () => {
  it('o Ataque Absoluto que fecha a rodada toca inteiro, com o Equipar vazio colado a ele', () => {
    const m = mount(THEIRS);
    emit(m, AFTER_BLOW, ABSOLUTE_BLOW);
    // O servidor manda o Equipar vazio logo em seguida, em outra mensagem.
    advance(5);
    emit(m, AUTO_EQUIPPED, MY_EMPTY_EQUIP);
    expect(busy(m.container)).toBe(true);
    advance(1_000);
    expect(scene(m.container)).toHaveAttribute('data-cena', 'ABSOLUTE_ATTACK');
    expect(hp()).toBe(187);
    // A vida desce na cena, quando o feixe acerta (a contagem parte no desenho seguinte ao impacto).
    advance(SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt - 1_005 + 5);
    advance(HIT_COUNT_MS + 100);
    expect(hp()).toBe(137);
    expect(busy(m.container)).toBe(true);
    // A mesa fica ocupada até o fim do golpe (a faixa da iniciativa e a compra), e só então solta.
    const elapsed = SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt + 5 + HIT_COUNT_MS + 100;
    advance(blowMs(ABSOLUTE_BLOW) - elapsed - 20);
    expect(busy(m.container)).toBe(true);
    advance(40);
    expect(busy(m.container)).toBe(false);
    expect(hp()).toBe(137);
  });

  it('o golpe comum também: a vida desce dentro das batidas, e a confirmação do oponente no meio também não corta', () => {
    const m = mount(THEIRS);
    emit(m, AFTER_BLOW, PLAIN_BLOW);
    emit(m, AUTO_EQUIPPED, MY_EMPTY_EQUIP);
    expect(busy(m.container)).toBe(true);
    expect(hp()).toBe(187);
    advance(300);
    expect(hp()).toBeLessThan(187);
    // Duda pulou e confirmou: o `state` dele só traz `EquipSubmitted`.
    emit(m, { ...AUTO_EQUIPPED, opponent: { ...AUTO_EQUIPPED.opponent, equipSubmitted: true } }, [{ type: 'EquipSubmitted', player: 'p2' }]);
    expect(busy(m.container)).toBe(true);
    advance(blowMs(PLAIN_BLOW) - 300 - 20);
    expect(busy(m.container)).toBe(true);
    advance(40);
    expect(busy(m.container)).toBe(false);
    expect(hp()).toBe(137);
  });

  it('as cartas seguem o desenho do golpe: o layoutKey não muda com o state quieto', () => {
    const keys: string[] = [];
    const Probe = () => {
      keys.push(useAnim().layoutKey);
      return null;
    };
    const { session, connection } = connect(THEIRS);
    const ui = () => (
      <Stage snapshot={session.snapshot()} reducedMotion={false}>
        <Probe />
      </Stage>
    );
    const view = render(ui());
    emit({ connection }, AFTER_BLOW, PLAIN_BLOW);
    view.rerender(ui());
    const playing = keys.at(-1)!;
    expect(playing).toMatch(/:tocando$/);
    emit({ connection }, AUTO_EQUIPPED, MY_EMPTY_EQUIP);
    view.rerender(ui());
    // A transição de layout de cada carta depende do `layoutKey`: trocá-lo no meio do voo faria o Motion medir e partir de novo.
    expect(keys.at(-1)).toBe(playing);
  });

  it('um state com batidas troca a linha do tempo, como sempre', () => {
    const m = mount(THEIRS);
    emit(m, AFTER_BLOW, ABSOLUTE_BLOW);
    advance(500);
    emit(m, AFTER_BLOW, [{ type: 'TurnStarted', player: 'p2' }]);
    expect(busy(m.container)).toBe(true);
    // A faixa nova (400 ms) acabou; a linha do golpe ainda teria segundos pela frente.
    advance(500);
    expect(busy(m.container)).toBe(false);
  });

  it('um state quieto de outra época troca a linha do tempo: a mesa de decisões mudou', () => {
    const m = mount(THEIRS);
    emit(m, AFTER_BLOW, ABSOLUTE_BLOW);
    advance(500);
    emit(m, AUTO_EQUIPPED, MY_EMPTY_EQUIP, { epoch: 2 });
    expect(busy(m.container)).toBe(false);
  });

  it.each([
    ['resync', { resync: true }],
    ['catchUp', { catchUp: true }],
  ] as const)('o %s quieto troca a linha do tempo, como sempre', (_name, extra) => {
    const m = mount(THEIRS);
    emit(m, AFTER_BLOW, ABSOLUTE_BLOW);
    advance(500);
    emit(m, AUTO_EQUIPPED, MY_EMPTY_EQUIP, extra);
    expect(busy(m.container)).toBe(false);
  });

  it('o state quieto que chega com a mesa parada não toca nada', () => {
    const m = mount(THEIRS);
    emit(m, AFTER_BLOW, PLAIN_BLOW);
    advance(blowMs(PLAIN_BLOW) + 10);
    expect(busy(m.container)).toBe(false);
    emit(m, AUTO_EQUIPPED, MY_EMPTY_EQUIP);
    expect(busy(m.container)).toBe(false);
  });
});
