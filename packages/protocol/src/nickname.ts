/** Apelido do jogador (spec §2.2): NFC, sem espaços nas pontas, 1 a 20 pontos de código, sem controle. */
import { LIMITS } from './constants.ts';

export function normalizeNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const nickname = raw.normalize('NFC').trim();
  const length = [...nickname].length;
  if (length < 1 || length > LIMITS.nicknameLength) return null;
  if (/\p{Cc}/u.test(nickname)) return null;
  return nickname;
}
