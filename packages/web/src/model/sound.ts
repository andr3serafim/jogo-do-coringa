// O mapa batida → pista dos sons (Fase C, fatia 1): qual som soa em cada batida da linha do tempo, ou nenhum. Puro: sem
// React, DOM nem Audio. Quem toca é a interface (o `Stage`, que chama `cueOf` na hora de tocar a batida); o que cada pista
// é (síntese, volume, quando fica mudo) é problema do player de áudio, não deste módulo.
import type { PlayerId } from '@coringa/engine';
import { impactForce } from './impact.ts';
import type { Beat } from './timeline.ts';

/** Uma pista de som: o nome é o do gesto do jogo, não o do arquivo ou do sintetizador. */
export type Cue =
  | 'carta'
  | 'quebra'
  | 'golpe-leve'
  | 'golpe-medio'
  | 'golpe-forte'
  | 'escudo'
  | 'absoluto'
  | 'vez'
  | 'vitoria'
  | 'derrota'
  | 'urgencia';

/** A pista do golpe de `damage` pontos, pelo peso dele (`impactForce`, o mesmo do tremor); dano zero (a defesa segurou tudo) é mudo. */
function strikeCue(damage: number): Cue | null {
  const force = impactForce(damage);
  return force === null ? null : `golpe-${force}`;
}

/**
 * A pista da batida, ou `null` se ela é muda. Só alguns eventos soam; o resto (distribuir cartas, a limpeza da fileira de
 * ataque, o aviso de iniciativa...) passa em silêncio. `me` é o jogador deste lado da tela: a vez e a janela
 * de reação só soam para quem tem de jogar, e o fim da partida soa como vitória ou derrota conforme o lado.
 *
 * A pista `urgencia` não vem de nenhuma batida (é o relógio, quando falta pouco): quem a toca é o player.
 */
export function cueOf(beat: Beat, me: PlayerId): Cue | null {
  const { event } = beat;
  switch (event.type) {
    case 'CardsPlaced':
    case 'BuffPlayed':
    case 'GuardPlayed':
    case 'Resurrected':
      return 'carta';
    case 'GuardBroken':
    case 'TrapUsed':
    case 'Sacrificed':
    case 'RowDevastated':
      return 'quebra';
    case 'CardsRemovedFromRow':
      // Só a defesa que cai é uma quebra; a fileira de ataque é gasta no golpe, que já tem o som dele.
      return event.row === 'DEF' ? 'quebra' : null;
    case 'DamageDealt':
      return strikeCue(event.damage);
    case 'StealDamage':
      return strikeCue(event.damage);
    case 'ReflectPlayed':
    case 'ReflectTriggered':
    case 'AbsoluteDefenseStarted':
      return 'escudo';
    case 'AbsoluteAttack':
    case 'Exodia':
    case 'DevastationCast':
      return 'absoluto';
    case 'TurnStarted':
      return event.player === me ? 'vez' : null;
    case 'ReactionWindowOpened':
      return event.responder === me ? 'vez' : null;
    case 'GameOver':
      return event.result.winner === me ? 'vitoria' : 'derrota';
    default:
      return null;
  }
}
