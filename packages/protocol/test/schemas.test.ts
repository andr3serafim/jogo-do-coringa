import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import type { PlayerAction } from '../src/messages.ts';
import { NicknameBodySchema, parseClientMessage, type PlayerActionSchema } from '../src/schemas.ts';

describe('esquemas do cliente', () => {
  it('aceita cada ação do jogador e recusa TIMEOUT/FORFEIT', () => {
    const ok: PlayerAction[] = [
      { type: 'EQUIP', destinations: ['ATK', 'DEF', 'DISCARD'] },
      { type: 'CHOOSE_ORDER', first: true },
      { type: 'PLAY_J', cardId: 'b1-copas-J' },
      { type: 'PLAY_Q', cardId: 'b1-copas-Q' },
      { type: 'PLAY_K', cardIds: ['b1-copas-K'] },
      { type: 'TRAP', cardId: 'a', targetId: 'b' },
      { type: 'SACRIFICE', cardId: 'a', targetId: 'b' },
      { type: 'REFLECT', kId: 'k', jId: 'j', qId: 'q' },
      { type: 'CANCEL_REFLECT', kId: 'k', jId: 'j', qId: 'q' },
      { type: 'PROTECT_FROM_REFLECT', jId: 'j', qId: 'q', kId: 'k' },
      { type: 'RESURRECT', cardId: 'n', row: 'ATK' },
      { type: 'DECLARE_ATTACK' },
      { type: 'END_TURN' },
      { type: 'PASS' },
    ];
    for (const action of ok)
      expect(parseClientMessage(JSON.stringify({ t: 'act', id: 'x1', epoch: 3, action }))).not.toBeNull();
    for (const action of [{ type: 'TIMEOUT' }, { type: 'FORFEIT', loser: 'p2' }])
      expect(parseClientMessage(JSON.stringify({ t: 'act', id: 'x1', epoch: 3, action }))).toBeNull();
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
