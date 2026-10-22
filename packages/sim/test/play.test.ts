import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyAction, createGame, legalActions, makeConfig, viewFor, type GameEvent } from '@coringa/engine';
import { P1, P2, setup } from '@coringa/engine/testing';
import { renderBoard } from '../src/play/board.ts';
import { BOT, HUMAN, playGame, REPLAYS_DIR } from '../src/play/game.ts';
import { askChoice, QuitSignal, scriptedIo } from '../src/play/io.ts';
import { actionText, cardText, eventText, namesFor } from '../src/play/text.ts';

const names = namesFor(P1, 'Bot');

describe('textos em pt-BR', () => {
  it('cartas com naipe; Selvagem pelo nome', () => {
    expect(cardText({ id: 'x', kind: 'NUM', value: 7, suit: 'copas' })).toBe('7♥');
    expect(cardText({ id: 'y', kind: 'J', suit: 'espadas' })).toBe('J♠');
    expect(cardText({ id: 'z', kind: 'WILD' })).toBe('Selvagem');
  });

  it('toda ação legal tem texto, e o ataque mostra ATK contra DEF (exemplo 1 da §1.13)', () => {
    const s = setup({ p1: { hand: ['J', 'Q', 'K', 'A', 'W'], attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8], defenseBuffs: ['Q'], guard: 1 } });
    const view = viewFor(s, P1);
    const texts = legalActions(view).map((a) => actionText(a, view));
    expect(texts.every((t) => t.length > 0 && !t.includes('undefined'))).toBe(true);
    expect(texts).toContain('Declarar o ataque (ATK 38 contra DEF 26)');
  });

  it('eventos viram frases; janelas de reação não aparecem', () => {
    const e = (event: GameEvent) => eventText(event, names);
    expect(e({ type: 'DamageDealt', attacker: P1, defender: P2, attack: 38, defense: 13, damage: 25 })).toBe('Ataque de você: 38 contra 13 → 25 de dano');
    expect(e({ type: 'ReactionWindowOpened', responder: P2, trigger: 'ATTACK' })).toBeNull();
    expect(e({ type: 'CardsDealt', player: P2, count: 4 })).toBe('Bot recebeu 4 cartas');
    expect(e({ type: 'GameOver', result: { kind: 'DRAW', reason: 'ANTI_STALL' } })).toContain('empate');
  });

  it('o Selvagem na Armadilha e no Sacrifício diz o papel', () => {
    const e = (event: GameEvent) => eventText(event, names);
    const wild = { id: 'w', kind: 'WILD' } as const;
    const ace = { id: 'a', kind: 'A', suit: 'paus' } as const;
    const jack = { id: 'j', kind: 'J', suit: 'espadas' } as const;
    const queen = { id: 'q', kind: 'Q', suit: 'copas' } as const;
    expect(e({ type: 'TrapUsed', player: P1, card: wild, as: 'A', target: jack, targetOwner: P2 })).toBe(
      'Você usou Armadilha com Selvagem (como A) e destruiu J♠ do Bot',
    );
    expect(e({ type: 'TrapUsed', player: P1, card: ace, target: jack, targetOwner: P2 })).toBe('Você usou Armadilha (A♣) e destruiu J♠ do Bot');
    expect(e({ type: 'Sacrificed', player: P2, card: wild, as: 'Q', target: queen, targetOwner: P1 })).toBe(
      'Bot sacrificou Selvagem (como Q) e destruiu Q♥ de você',
    );
  });

  it('todo tipo de evento de uma partida real tem tratamento', () => {
    const created = createGame(makeConfig(), 'eventos', [P1, P2]);
    if (!created.ok) throw new Error(created.error.message);
    let s = created.state;
    for (let i = 0; i < 400 && s.phase.kind !== 'GAME_OVER'; i += 1) {
      const actor = s.players.map((p) => p.id).find((id) => legalActions(viewFor(s, id)).length > 0)!;
      const result = applyAction(s, actor, legalActions(viewFor(s, actor))[0]);
      if (!result.ok) throw new Error(result.error.message);
      for (const ev of result.events) expect(() => eventText(ev, names)).not.toThrow();
      s = result.state;
    }
  });
});

describe('mesa no terminal', () => {
  it('mostra vida, guarda, buffs, fileiras, mão do oponente só como quantidade, monte, cemitério e pressão', () => {
    const s = setup({ pressure: 2, p1: { hand: ['J'], attack: [4, 6], attackBuffs: ['J'] }, p2: { hand: ['Q', 'K'], guard: 2, hp: 70 }, graveyard: [5, 'A'] });
    const board = renderBoard(viewFor(s, P1), names);
    for (const piece of ['Vida 70', 'Guarda: 2 K', 'Mão: 2 cartas', 'Pressão +2', 'Monte', 'Cemitério 2', 'ATK 40', 'Sua vez: fase principal']) {
      expect(board).toContain(piece);
    }
    expect(board).not.toMatch(/Q[♥♦♠♣]/);
  });
});

describe('askChoice', () => {
  it('repete a pergunta até receber um número válido', async () => {
    const io = scriptedIo(['9', 'abc', '2']);
    expect(await askChoice(io, 'Escolha', ['a', 'b'])).toBe(1);
    expect(io.output.filter((l) => l.startsWith('Digite'))).toHaveLength(2);
  });
});

describe('partida no terminal (roteirizada)', () => {
  it('joga até o fim contra o greedy, mostra o resultado e salva um replay reproduzível', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-play-'));
    const io = scriptedIo(() => '1');
    const outcome = await playGame({ io, seed: 'roteiro', bot: 'greedy', config: makeConfig(), saveDir: dir });
    expect(io.output.join('\n')).toContain('Fim de jogo');
    expect(outcome.savedTo).toBe(join(dir, 'roteiro.json'));
    const saved = JSON.parse(readFileSync(outcome.savedTo!, 'utf8'));
    expect(saved.players).toEqual([HUMAN, BOT]);
    let s = (() => {
      const c = createGame(saved.config, saved.seed, saved.players);
      if (!c.ok) throw new Error(c.error.message);
      return c.state;
    })();
    for (const step of saved.steps) {
      const r = applyAction(s, step.player, step.action);
      if (!r.ok) throw new Error(r.error.message);
      s = r.state;
    }
    expect(s.phase).toEqual({ kind: 'GAME_OVER', result: outcome.result });
  });

  it('pergunta o Equipar carta a carta e não pergunta quando só há uma opção', async () => {
    let n = 0;
    const io = scriptedIo(() => (n++ % 2 === 0 ? '2' : '1'));
    await playGame({ io, seed: 'equipar', bot: 'random', config: makeConfig(), saveDir: null });
    const text = io.output.join('\n');
    expect(text).toMatch(/Carta 1\/\d: /);
    expect(text).toContain('Fileira de Defesa');
  });

  it('sair no meio (Ctrl+C ou fim da entrada) encerra sem erro e salva a partida até ali', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-sair-'));
    let n = 0;
    const io = scriptedIo(() => {
      if (n++ >= 10) throw new QuitSignal();
      return '1';
    });
    const outcome = await playGame({ io, seed: 'sair', bot: 'greedy', config: makeConfig(), saveDir: dir });
    expect(outcome.result).toBeNull();
    expect(io.output.join('\n')).toContain('Partida interrompida');
    expect(JSON.parse(readFileSync(outcome.savedTo!, 'utf8')).steps.length).toBeGreaterThan(0);
  });

  it('no terminal de verdade, o fim da entrada encerra com código 0', () => {
    const cli = fileURLToPath(new URL('../src/cli/play.ts', import.meta.url));
    const r = spawnSync(process.execPath, [cli, '--semente', 'teste-fim-da-entrada'], { input: '', encoding: 'utf8' });
    rmSync(join(REPLAYS_DIR, 'teste-fim-da-entrada.json'), { force: true });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Partida interrompida');
  });
});
