import type { GameState } from '@coringa/engine';

/**
 * Identifica a fase em que o jogo espera uma jogada. A época da sala NÃO é derivada daqui:
 * ela é um contador que sobe quando a chave depois de um passo difere da chave de antes dele.
 * Assim, voltar a `ATTACK_MAIN` do mesmo jogador depois da reação (mesma chave de antes do K)
 * ainda conta como mudança e deixa velha a jogada mandada com a época anterior (spec §4.5).
 */
export function phaseKey(state: GameState): string {
  const phase = state.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return JSON.stringify([state.round, 'EQUIP', null, null]);
    // A janela da Ressurreição (ponto 16) tem a chave de quem decide: a vez do segundo da fila é época nova.
    case 'RESURRECTION':
    case 'ORDER_CHOICE':
    case 'ATTACK_MAIN':
      return JSON.stringify([state.round, phase.kind, phase.player, null]);
    case 'REACTION':
      return JSON.stringify([state.round, 'REACTION', phase.responder, phase.trigger]);
    case 'GAME_OVER':
      return JSON.stringify([state.round, 'GAME_OVER', null, null]);
  }
}
