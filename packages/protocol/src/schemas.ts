/** Esquemas Zod estritos das mensagens do cliente e do corpo HTTP (spec §4.3, §8.1). Só o servidor importa. */
import { z } from 'zod';
import { LIMITS } from './constants.ts';
import type { ClientMessage } from './messages.ts';

const cardId = z.string().min(1).max(LIMITS.cardIdLength);
const destination = z.enum(['ATK', 'DEF', 'REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD']);
const row = z.enum(['ATK', 'DEF']);

/** Todas as ações do motor menos `TIMEOUT` e `FORFEIT`, que só o servidor injeta. */
export const PlayerActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('EQUIP'), destinations: z.array(destination).max(LIMITS.destinations) }),
  z.strictObject({ type: z.literal('CHOOSE_ORDER'), first: z.boolean() }),
  z.strictObject({ type: z.literal('PLAY_J'), cardId }),
  z.strictObject({ type: z.literal('PLAY_Q'), cardId }),
  z.strictObject({ type: z.literal('PLAY_K'), cardIds: z.array(cardId).min(1).max(LIMITS.kCards) }),
  z.strictObject({ type: z.literal('TRAP'), cardId, targetId: cardId }),
  z.strictObject({ type: z.literal('SACRIFICE'), cardId, targetId: cardId }),
  z.strictObject({ type: z.literal('REFLECT'), kId: cardId, jId: cardId, qId: cardId }),
  z.strictObject({ type: z.literal('CANCEL_REFLECT'), kId: cardId, jId: cardId, qId: cardId }),
  z.strictObject({ type: z.literal('PROTECT_FROM_REFLECT'), jId: cardId, qId: cardId, kId: cardId }),
  z.strictObject({ type: z.literal('RESURRECT'), cardId, row }),
  z.strictObject({ type: z.literal('DECLARE_ATTACK') }),
  z.strictObject({ type: z.literal('END_TURN') }),
  z.strictObject({ type: z.literal('PASS') }),
]);

const messageId = z.string().min(1).max(LIMITS.idLength);
const counter = z.number().int().nonnegative();
const token = z.string().length(LIMITS.tokenLength).regex(/^[A-Za-z0-9_-]+$/);

export const ClientMessageSchema = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('hello'), protocol: counter, token, lastSeq: counter.optional() }),
  z.strictObject({ t: z.literal('ready'), ready: z.boolean() }),
  z.strictObject({ t: z.literal('leave') }),
  z.strictObject({ t: z.literal('act'), id: messageId, epoch: counter, action: PlayerActionSchema, auto: z.literal(true).optional() }),
  z.strictObject({ t: z.literal('concede'), id: messageId }),
  z.strictObject({ t: z.literal('rematch'), want: z.boolean() }),
]);

/** Corpo de `POST /api/rooms` e de `POST /api/rooms/:code/join`; o apelido é normalizado depois. */
export const NicknameBodySchema = z.strictObject({ nickname: z.string().max(64) });

/** O corpo da criação da sala: o apelido e, se quiser, a vida inicial (uma de `HP_CHOICES`, sub-projeto 5). */
export const CreateRoomBodySchema = z.strictObject({ nickname: z.string().max(64), hp: z.number().int().optional() });

/** Texto de um frame → mensagem validada, ou `null` para JSON quebrado ou fora do esquema. */
export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const parsed = ClientMessageSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
