// O mapa batida → pista dos sons (Fase C, fatia 1): qual som soa em cada batida da linha do tempo, ou nenhum. Puro: sem
// React, DOM nem Audio. Quem toca é a interface (o `Stage`, que chama `cueOf` na hora de tocar a batida); o que cada pista
// é (síntese, volume, quando fica mudo) é problema do player de áudio, não deste módulo.
import type { PlayerId } from '@coringa/engine';
import { impactForce } from './impact.ts';
import type { Beat } from './timeline.ts';

/** Uma pista de som: o nome é o do gesto do jogo, não o do arquivo ou do sintetizador. */
export type Cue =
  | 'carta'
  | 'pouso'
  | 'momento'
  | 'compra'
  | 'quebra'
  | 'golpe-leve'
  | 'golpe-medio'
  | 'golpe-forte'
  | 'vez'
  | 'vitoria'
  | 'derrota'
  | 'urgencia'
  | 'espada'
  | 'fita'
  | 'quadra'
  | 'ataque-absoluto'
  | 'defesa-absoluta'
  | 'exodia'
  | 'devastacao'
  | 'devastacao-cancelada'
  | 'reflect-armado'
  | 'reflect-cometa'
  | 'reflect-segurado'
  | 'reflect-cancelado'
  | 'ressurreicao'
  | 'golpe-final';

/** A pista do golpe de `damage` pontos, pelo peso dele (`impactForce`, o mesmo do tremor); dano zero (a defesa segurou tudo) é mudo. */
function strikeCue(damage: number): Cue | null {
  const force = impactForce(damage);
  return force === null ? null : `golpe-${force}`;
}

/**
 * A pista da batida, ou `null` se ela é muda. Só alguns eventos soam; o resto (distribuir cartas, a limpeza da fileira de
 * ataque...) passa em silêncio. A decisão da iniciativa soa (sub-projeto 6 §10): a espada que voa e crava quando muda de mão, o
 * estalo da fita quando fica; a quadra formada, um acorde curto. `me` é o jogador deste lado da tela: a vez e a janela
 * de reação só soam para quem tem de jogar, e o fim da partida soa como vitória ou derrota conforme o lado.
 *
 * A pista `urgencia` não vem de nenhuma batida (é o relógio, quando falta pouco): quem a toca é o player.
 */
export function cueOf(beat: Beat, me: PlayerId): Cue | null {
  const { event } = beat;
  // O golpe que a cena do Ataque Absoluto absorveu soa dentro dela, no impacto do feixe.
  if (beat.absorbed) return null;
  // O golpe final (bloco B dos pontos do playtest, ponto 15): a pista da cena, que segue o corte, o impacto e o carimbo, no lugar do golpe comum.
  if (beat.scene === 'FINAL_BLOW') return 'golpe-final';
  // O momento da especial do oponente (bloco A dos pontos do playtest, ponto 1): a virada da carta no começo. O impacto (o pouso ou a
  // quebra) soa na camada do momento, no instante em que a carta grande chega.
  if (beat.kind === 'moment') return 'momento';
  switch (event.type) {
    // Sub-projeto 6 §8 (fatia 5): a sua carta voa da mão (o sopro e a batida no pouso); a do Bot e as do Equipar caem no destino e assentam.
    case 'BuffPlayed':
    case 'GuardPlayed':
      return event.player === me ? 'carta' : 'pouso';
    case 'CardsPlaced':
      return 'pouso';
    case 'CardsDealt':
      return event.player === me ? 'compra' : null;
    case 'GuardBroken':
    case 'TrapUsed':
    case 'Sacrificed':
    case 'DevastationCast':
      return 'quebra';
    case 'CardsRemovedFromRow':
      // Só a defesa que cai é uma quebra; a fileira de ataque é gasta no golpe, que já tem o som dele.
      return event.row === 'DEF' ? 'quebra' : null;
    case 'DamageDealt':
      return strikeCue(event.damage);
    case 'StealDamage':
      return strikeCue(event.damage);
    // As cenas refeitas no sub-projeto 6 (fatias 2 a 4b) têm a pista delas, que segue o pico de cada uma (§10).
    case 'ReflectPlayed':
      return 'reflect-armado';
    case 'ReflectTriggered':
      // Sem dano de volta, o cometa se desfaz no espelho: a pista não tem a volta nem o baque no retrato.
      return event.damage > 0 ? 'reflect-cometa' : 'reflect-segurado';
    case 'ReflectCanceled':
      return 'reflect-cancelado';
    case 'Resurrected':
      return 'ressurreicao';
    case 'AbsoluteAttack':
      return 'ataque-absoluto';
    case 'AbsoluteDefenseStarted':
      return 'defesa-absoluta';
    case 'Exodia':
      return 'exodia';
    case 'RowDevastated':
      return 'devastacao';
    case 'DevastationCanceled':
      return 'devastacao-cancelada';
    case 'TurnStarted':
      return event.player === me ? 'vez' : null;
    case 'ReactionWindowOpened':
      return event.responder === me ? 'vez' : null;
    case 'GameOver':
      return event.result.winner === me ? 'vitoria' : 'derrota';
    case 'InitiativeDecided':
      return event.changed ? 'espada' : 'fita';
    case 'QuadFormed':
      return 'quadra';
    default:
      return null;
  }
}
