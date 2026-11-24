// Os bônus em escala (bloco C dos pontos do playtest, ponto 10; spec `2026-11-03-playtest-design.md` §5.1): a mesma escada nas três zonas, cada uma
// com a sua cor. O nível sai da config e das marcas do motor (decisoes.md 2026-11-08 (2), C6), nunca de números fixos: com a regra de hoje, a escada
// do autor (2, 3 e 4 cartas). Puro: sem React nem DOM.
import { absoluteAttackArmed, defenseHealActive, fullDefense, type PublicPlayer, type RulesConfig } from '@coringa/engine';

export type ZoneKind = 'J' | 'Q' | 'K';

/**
 * O nível da zona `kind` de `player`:
 * - J (Bônus de ataque): 1 o aceso (2 cartas), 2 as faíscas (a uma do limite), 3 o Ataque Absoluto armado;
 * - Q (Bônus de defesa): 1 o aceso, 2 a muralha (a uma do limite), 3 o escudo da Defesa Absoluta, 4 a Fortaleza (os Q do limite depois do
 *   escudo, decisoes.md 2026-11-24 (10) e (11): a Defesa não perde a carta da frente). O 4 é um estado à parte, não um degrau acima do 3;
 * - K (Guarda): 1 o pulso verde da cura passiva, 2 a brasa da ameaça (a um da Exódia).
 * Uma carta só nunca acende. Os Selvagens contam (estão nos bônus).
 */
export type ZoneLevel = 0 | 1 | 2 | 3 | 4;

export function zoneLevel(kind: ZoneKind, player: PublicPlayer, config: RulesConfig): ZoneLevel {
  if (kind === 'K') {
    const count = player.guard.length;
    if (count >= Math.max(2, config.exodiaGuard - 1)) return 2;
    return defenseHealActive(player, config) ? 1 : 0;
  }
  const count = kind === 'J' ? player.attackBuffs.length : player.defenseBuffs.length;
  const absolute = kind === 'J' ? absoluteAttackArmed(player, config) : player.absoluteDefense;
  if (absolute) return 3;
  if (kind === 'Q' && fullDefense(player, config)) return 4;
  if (count >= Math.max(2, config.buffLimit - 1)) return 2;
  return count >= 2 ? 1 : 0;
}
