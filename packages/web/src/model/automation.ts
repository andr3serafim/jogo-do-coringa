// Jogadas automáticas (spec §3.7 e §5). Puro: só decide; quem agenda e envia é a sessão. A ordem automática da spec §3.6 saiu a pedido do
// autor (decisoes.md 2026-11-02 (9), ponto 7): quem tem a iniciativa escolhe sem pressa; online vale o prazo do servidor.
import type { PlayerView } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import type { Prefs } from './storage.ts';

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
