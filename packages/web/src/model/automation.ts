// Jogadas automáticas (spec §3.6, §3.7 e §5). Puro: só decide; quem agenda e envia é a sessão.
import type { PlayerView } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import type { Prefs } from './storage.ts';

/** A ordem escolhida sozinha: 3 s depois de o painel aparecer (spec §3.6). */
export const ORDER_AUTO_MS = 3_000;

/**
 * Passe automático (spec §3.7): só numa janela de reação em que `PASS` é a única jogada legal, com a
 * chave ligada e sem ter mandado um nesta época. Quem tem resposta possível decide sozinho.
 */
export function shouldAutoPass(view: PlayerView, legal: PlayerAction[], prefs: Prefs, alreadySent: boolean): boolean {
  return (
    prefs.autoPass &&
    !alreadySent &&
    view.phase.kind === 'REACTION' &&
    legal.length === 1 &&
    legal[0]!.type === 'PASS'
  );
}
