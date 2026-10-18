import { fail } from '../errors.ts';
import { startRound } from '../flow.ts';
import { reevaluateQuads } from '../quads.ts';
import { getPlayer, toGraveyard } from '../state.ts';
import type { Destination, GameEvent, GameState, NumCard, Placement, PlayerId, PlayerState, RulesConfig } from '../types.ts';

const DESTINATIONS: readonly Destination[] = ['ATK', 'DEF', 'REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD'];

/** Spec §1.4: só fileira não cheia; substituir/descartar só com as duas cheias. */
export function validateDestinations(config: RulesConfig, p: PlayerState, destinations: Destination[]): void {
  if (!Array.isArray(destinations) || destinations.length !== p.pending.length) {
    fail('INVALID_DESTINATIONS', `esperava ${p.pending.length} destino(s)`);
  }
  let atk = p.attackRow.length;
  let def = p.defenseRow.length;
  const limit = config.rowLimit;
  for (const d of destinations) {
    if (!DESTINATIONS.includes(d)) fail('INVALID_DESTINATIONS', `destino desconhecido: ${String(d)}`);
    const bothFull = atk >= limit && def >= limit;
    if (d === 'ATK') {
      if (atk >= limit) fail('INVALID_DESTINATIONS', 'a fileira de Ataque está cheia');
      atk += 1;
    } else if (d === 'DEF') {
      if (def >= limit) fail('INVALID_DESTINATIONS', 'a fileira de Defesa está cheia');
      def += 1;
    } else if (!bothFull) {
      fail('INVALID_DESTINATIONS', 'só dá para substituir ou descartar com as duas fileiras cheias');
    }
  }
}

/** Timeout (spec §1.12): fileira com menos cartas, empate → Defesa; as duas cheias → cemitério. */
export function autoDestinations(config: Pick<RulesConfig, 'rowLimit'>, rows: { attack: number; defense: number }, count: number): Destination[] {
  let atk = rows.attack;
  let def = rows.defense;
  const limit = config.rowLimit;
  return Array.from({ length: count }, (): Destination => {
    if (atk >= limit && def >= limit) return 'DISCARD';
    if (atk >= limit) {
      def += 1;
      return 'DEF';
    }
    if (def >= limit || atk < def) {
      atk += 1;
      return 'ATK';
    }
    def += 1;
    return 'DEF';
  });
}

function submit(p: PlayerState, destinations: Destination[], ev: GameEvent[]): void {
  p.submittedDestinations = [...destinations];
  p.equipSubmitted = true;
  ev.push({ type: 'EquipSubmitted', player: p.id });
}

export function handleEquip(s: GameState, playerId: PlayerId, destinations: Destination[], ev: GameEvent[]): void {
  if (s.phase.kind !== 'EQUIP') fail('WRONG_PHASE', 'não é a rodada de Equipar');
  const p = getPlayer(s, playerId);
  if (p.equipSubmitted) fail('ALREADY_SUBMITTED', 'você já confirmou o Equipar desta rodada');
  validateDestinations(s.config, p, destinations);
  submit(p, destinations, ev);
  if (s.players.every((pl) => pl.equipSubmitted)) resolveEquip(s, ev);
}

export function timeoutEquip(s: GameState, ev: GameEvent[]): void {
  for (const p of s.players) {
    if (!p.equipSubmitted) submit(p, autoDestinations(s.config, { attack: p.attackRow.length, defense: p.defenseRow.length }, p.pending.length), ev);
  }
  resolveEquip(s, ev);
}

/** Revela as duas montagens ao mesmo tempo (spec §1.4 item 4). */
function resolveEquip(s: GameState, ev: GameEvent[]): void {
  for (const p of s.players) {
    const destinations = p.submittedDestinations ?? [];
    const placements: Placement[] = [];
    p.pending.forEach((card, i) => {
      const destination = destinations[i];
      let replaced: NumCard | undefined;
      switch (destination) {
        case 'ATK':
          p.attackRow.push(card);
          break;
        case 'DEF':
          p.defenseRow.push(card);
          break;
        case 'REPLACE_LAST_ATK':
          replaced = p.attackRow.pop();
          p.attackRow.push(card);
          break;
        case 'REPLACE_LAST_DEF':
          replaced = p.defenseRow.pop();
          p.defenseRow.push(card);
          break;
        case 'DISCARD':
          toGraveyard(s, [card]);
          break;
      }
      if (replaced) toGraveyard(s, [replaced]);
      placements.push(replaced ? { card, destination, replaced } : { card, destination });
    });
    p.pending = [];
    p.submittedDestinations = null;
    ev.push({ type: 'CardsPlaced', player: p.id, placements });
  }
  for (const p of s.players) reevaluateQuads(s, p, ev);
  startRound(s, ev);
}
