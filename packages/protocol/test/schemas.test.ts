import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import type { PlayerAction } from '../src/messages.ts';
import { NicknameBodySchema, parseClientMessage, type PlayerActionSchema } from '../src/schemas.ts';

describe('esquemas do cliente', () => {
  it('aceita cada ação do jogador e recusa TIMEOUT/FORFEIT', () => {
    const ok: PlayerAction[] = [
      { type: 'EQUIP', destinations: ['ATK', 'DEF', 'DISCARD'] },
      { type: 'EQUIP', destinations: ['ATK', 'DEF'], order: ['b1-copas-7', 'b1-ouros-3'] },
      { type: 'CHOOSE_ORDER', first: true },
      { type: 'PLAY_J', cardId: 'b1-copas-J' },
      { type: 'PLAY_Q', cardId: 'b1-copas-Q' },
      { type: 'PLAY_K', cardIds: ['b1-copas-K'] },
      { type: 'TRAP', cardId: 'a', targetId: 'b' },
      { type: 'SACRIFICE', cardId: 'a', targetId: 'b' },
      { type: 'REFLECT', kId: 'k', jId: 'j', qId: 'q' },
      { type: 'CANCEL_REFLECT', kId: 'k', jId: 'j', qId: 'q' },
      { type: 'RESURRECT', cardId: 'n', row: 'ATK' },
      { type: 'DEVASTATE', kId: 'k', aId: 'a', xId: 'j', row: 'ATK' },
      { type: 'STEAL', cardId: 'a', targetId: 'n', row: 'DEF' },
      { type: 'DECLARE_ATTACK' },
      { type: 'END_TURN' },
      { type: 'PASS' },
    ];
    for (const action of ok)
      expect(parseClientMessage(JSON.stringify({ t: 'act', id: 'x1', epoch: 3, action }))).not.toBeNull();
    // A Proteção por sacrifício saiu do jogo (F2 do sub-projeto 5): o servidor recusa a ação antes do motor.
    for (const action of [{ type: 'TIMEOUT' }, { type: 'FORFEIT', loser: 'p2' }, { type: 'PROTECT_FROM_REFLECT', jId: 'j', qId: 'q', kId: 'k' }])
      expect(parseClientMessage(JSON.stringify({ t: 'act', id: 'x1', epoch: 3, action }))).toBeNull();
  });

  it('act aceita auto: true; recusa auto: false e auto: 1; sem auto continua aceito', () => {
    const act = (extra: Record<string, unknown>) =>
      parseClientMessage(JSON.stringify({ t: 'act', id: 'x1', epoch: 3, action: { type: 'PASS' }, ...extra }));
    expect(act({ auto: true })).toMatchObject({ t: 'act', auto: true });
    expect(act({ auto: false })).toBeNull();
    expect(act({ auto: 1 })).toBeNull();
    expect(act({})).not.toBeNull();
  });

  it('recusa campo extra, tamanhos acima do limite e JSON quebrado', () => {
    const bad = [
      '{',
      '[]',
      JSON.stringify({ t: 'ready', ready: true, extra: 1 }),
      JSON.stringify({ t: 'act', id: 'x'.repeat(65), epoch: 1, action: { type: 'PASS' } }),
      JSON.stringify({ t: 'act', id: '', epoch: 1, action: { type: 'PASS' } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: -1, action: { type: 'PASS' } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'PLAY_J', cardId: 'c'.repeat(33) } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'EQUIP', destinations: Array(17).fill('ATK') } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'EQUIP', destinations: ['ATK'], order: Array(17).fill('n') } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'EQUIP', destinations: ['ATK'], order: [''] } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'EQUIP', destinations: ['ATK'], order: 'n' } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'EQUIP', destinations: ['ATK'], ordem: ['n'] } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'PLAY_K', cardIds: Array(9).fill('k') } }),
      JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'PLAY_K', cardIds: [] } }),
      JSON.stringify({ t: 'hello', protocol: 1, token: 'curto' }),
    ];
    for (const raw of bad) expect(parseClientMessage(raw)).toBeNull();
    expect(
      parseClientMessage(JSON.stringify({ t: 'hello', protocol: 1, token: 'a'.repeat(43), lastSeq: 7 })),
    ).toEqual({ t: 'hello', protocol: 1, token: 'a'.repeat(43), lastSeq: 7 });
  });

  it('aceita as demais mensagens do cliente', () => {
    const cases: unknown[] = [
      { t: 'ready', ready: false },
      { t: 'leave' },
      { t: 'concede', id: 'c1' },
      { t: 'rematch', want: true },
      { t: 'hello', protocol: 1, token: 'b'.repeat(43) },
    ];
    for (const msg of cases) expect(parseClientMessage(JSON.stringify(msg))).toEqual(msg);
  });

  it('valida o corpo do apelido', () => {
    expect(NicknameBodySchema.safeParse({ nickname: 'Ana' }).success).toBe(true);
    expect(NicknameBodySchema.safeParse({ nickname: 'a'.repeat(65) }).success).toBe(false);
    expect(NicknameBodySchema.safeParse({ nickname: 'Ana', extra: 1 }).success).toBe(false);
  });

  it('o esquema da ação e o tipo do motor não divergem', () => {
    expectTypeOf<z.infer<typeof PlayerActionSchema>>().toEqualTypeOf<PlayerAction>();
  });
});
