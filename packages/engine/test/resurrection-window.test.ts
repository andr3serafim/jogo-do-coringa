import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { legalActions } from '../src/legal-actions.ts';
import { noPlayReason } from '../src/no-play.ts';
import type { Action, GameState, PlayerId, Replay, RowName } from '../src/types.ts';
import { viewFor } from '../src/view.ts';
import { P1, P2, act, actErr, player, setup, steps, values, type PlayerSetup, type Setup } from './helpers.ts';
import { runReplay } from './replay.ts';

/** A revelação do Equipar da rodada `round`: os dois confirmam, cada numérica pendente no Ataque. */
function reveal(spec: Setup & { p1?: PlayerSetup; p2?: PlayerSetup }, round = 2): { state: GameState; events: ReturnType<typeof act>['events'] } {
  const s = setup({ phase: { kind: 'EQUIP' }, round, roundKind: 'EQUIP', ...spec });
  const equip = (id: PlayerId): Action => ({ type: 'EQUIP', destinations: player(s, id).pending.map(() => 'ATK' as const) });
  return steps(s, [
    [P1, equip(P1)],
    [P2, equip(P2)],
  ]);
}

const resurrectFirst = (s: GameState, row: RowName, nth = 0): Action => ({
  type: 'RESURRECT',
  cardId: s.graveyard.filter((c) => c.kind === 'NUM')[nth].id,
  row,
});

describe('a janela da Ressurreição (ponto 16)', () => {
  it('a revelação forma a quadra de P1: a janela dele abre antes da rodada seguinte, e passar guarda a Ressurreição', () => {
    const r = reveal({ p1: { attack: [7, 7, 7], pending: [7] }, graveyard: [5] });
    expect(r.state.phase).toEqual({ kind: 'RESURRECTION', player: P1, next: null });
    expect(r.state.round).toBe(2);
    expect(r.events.some((e) => e.type === 'RoundStarted')).toBe(false);
    expect(legalActions(viewFor(r.state, P1))[0]).toEqual({ type: 'PASS' });
    const passed = act(r.state, P1, { type: 'PASS' });
    expect(passed.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
    expect(passed.state.round).toBe(3);
    expect(viewFor(passed.state, P1).self.resurrections).toEqual([{ row: 'ATK', value: 7, formedAtRound: 2 }]);
  });

  it('a Ressurreição na janela põe a carta e, sem outra, a rodada segue', () => {
    const r = reveal({ p1: { attack: [7, 7, 7], pending: [7] }, graveyard: [5] });
    const done = act(r.state, P1, resurrectFirst(r.state, 'DEF'));
    expect(values(player(done.state, P1).defenseRow)).toEqual([5]);
    expect(done.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
  });

  it('sem numérica no cemitério, a revelação vai direto à rodada seguinte, sem janela', () => {
    const r = reveal({ p1: { attack: [7, 7, 7], pending: [7] }, graveyard: ['K'] });
    expect(r.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
  });

  it('os dois formam quadra: decide primeiro quem tem a iniciativa, depois o outro', () => {
    const r = reveal({ initiative: P2, p1: { attack: [7, 7, 7], pending: [7] }, p2: { attack: [8, 8, 8], pending: [8] }, graveyard: [5, 6] });
    expect(r.state.phase).toEqual({ kind: 'RESURRECTION', player: P2, next: P1 });
    expect(legalActions(viewFor(r.state, P1))).toEqual([]);
    const passed = act(r.state, P2, { type: 'PASS' });
    expect(passed.state.phase).toEqual({ kind: 'RESURRECTION', player: P1, next: null });
  });

  it('a jogada do primeiro tira a única numérica do cemitério: o segundo não ganha a vez', () => {
    const r = reveal({ initiative: P2, p1: { attack: [7, 7, 7], pending: [7] }, p2: { attack: [8, 8, 8], pending: [8] }, graveyard: [5] });
    const done = act(r.state, P2, resurrectFirst(r.state, 'DEF'));
    expect(done.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P2 });
  });

  it('o segundo decide vendo a jogada do primeiro: a carta que a troca dele tirou pode voltar pelo outro', () => {
    const r = reveal({
      initiative: P2,
      p1: { attack: [7, 7, 7], pending: [7] },
      p2: { attack: [8, 8, 8, 2, 3, 4], defense: [2, 3, 4, 5, 6, 9, 10], pending: [8] },
      graveyard: [5],
    });
    const leaving = player(r.state, P2).defenseRow[6];
    const first = act(r.state, P2, resurrectFirst(r.state, 'DEF'));
    expect(first.state.phase).toEqual({ kind: 'RESURRECTION', player: P1, next: null });
    expect(first.state.graveyard.map((c) => c.id)).toEqual([leaving.id]);
    const second = act(first.state, P1, { type: 'RESURRECT', cardId: leaving.id, row: 'DEF' });
    expect(player(second.state, P1).defenseRow.map((c) => c.id)).toEqual([leaving.id]);
  });

  it('em cadeia: a ressuscitada forma outra quadra e o jogador segue na janela até não ter mais jogada', () => {
    const r = reveal({ p1: { attack: [7, 7, 7], pending: [7], defense: [9, 9, 9] }, graveyard: [9, 5] });
    const chained = act(r.state, P1, resurrectFirst(r.state, 'DEF'));
    expect(chained.events).toContainEqual({ type: 'QuadFormed', player: P1, quad: { row: 'DEF', value: 9 } });
    expect(chained.state.phase).toEqual({ kind: 'RESURRECTION', player: P1, next: null });
    const last = act(chained.state, P1, resurrectFirst(chained.state, 'ATK'));
    expect(last.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
  });

  it('o tempo esgotado passa só quem decide agora; o segundo da fila ainda decide', () => {
    const r = reveal({ initiative: P2, p1: { attack: [7, 7, 7], pending: [7] }, p2: { attack: [8, 8, 8], pending: [8] }, graveyard: [5] });
    const timedOut = act(r.state, 'system', { type: 'TIMEOUT' });
    expect(timedOut.state.phase).toEqual({ kind: 'RESURRECTION', player: P1, next: null });
    expect(viewFor(timedOut.state, P2).self.resurrections).toHaveLength(1);
    expect(act(timedOut.state, 'system', { type: 'TIMEOUT' }).state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P2 });
  });

  it('depois do 1º Equipar, a janela leva ao 2º Equipar', () => {
    const r = reveal({ p1: { attack: [7, 7, 7], pending: [7] }, graveyard: [5] }, 1);
    expect(r.state.phase).toEqual({ kind: 'RESURRECTION', player: P1, next: null });
    const passed = act(r.state, P1, { type: 'PASS' });
    expect(passed.state.phase).toEqual({ kind: 'EQUIP' });
    expect(passed.state.round).toBe(2);
  });

  it('na janela as especiais esperam (EQUIP_ROUND), e só quem decide joga', () => {
    const r = reveal({ p1: { attack: [7, 7, 7], pending: [7], hand: ['J'] }, graveyard: [5] });
    const j = player(r.state, P1).hand[0];
    expect(actErr(r.state, P1, { type: 'PLAY_J', cardId: j.id })).toBe('WRONG_PHASE');
    expect(actErr(r.state, P2, { type: 'PASS' })).toBe('NOT_YOUR_TURN');
    expect(actErr(r.state, P2, resurrectFirst(r.state, 'DEF'))).toBe('NOT_YOUR_TURN');
    expect(noPlayReason(viewFor(r.state, P1), j)).toBe('EQUIP_ROUND');
  });

  it('sem resurrectOnQuad, a mesma revelação vai direto à rodada seguinte', () => {
    const r = reveal({ config: { resurrectOnQuad: undefined }, p1: { attack: [7, 7, 7], pending: [7] }, graveyard: [5] });
    expect(r.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
  });

  it('o replay guardado sem a chave (a fixture das cenas do E2E, com quadras na revelação) reproduz até o fim', () => {
    const [fixture] = JSON.parse(readFileSync(new URL('../../web/e2e/fixtures/exodia-devastacao.json', import.meta.url), 'utf8')) as Array<{
      replay: Replay;
    }>;
    expect(fixture.replay.config.resurrectOnQuad).toBeUndefined();
    expect(runReplay(fixture.replay).state.phase.kind).toBe('GAME_OVER');
  });
});
