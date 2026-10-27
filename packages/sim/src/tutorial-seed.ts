/**
 * A semente do tutorial (`/tutorial`): uma partida de treino de verdade, numa semente em que as especiais caem cedo na mão do
 * jogador. Este arquivo roda no navegador (a web importa `TUTORIAL_SEED` por `@coringa/sim/tutorial`): nada de `node:*`.
 *
 * A distribuição é calculada, não jogada: o monte é fixo pela semente e o motor reparte `cardsPerEquip` cartas por Equipar,
 * uma a uma, a começar por quem tem a iniciativa. Os dois primeiros Equipares não têm ataque no meio (ciclo Equipar, Equipar,
 * Ataque, Equipar, …), então a iniciativa deles é a da criação e só depende da semente. O 3º vem depois do ataque da rodada 3,
 * e quem faz mais dano ali toma a iniciativa: de que lado do monte p1 recebe as cartas do 3º Equipar depende de como se joga.
 * Por isso o 3º Equipar só conta um especial que chega com qualquer das duas iniciativas. Sem reembaralhar (98 cartas, 24
 * compradas até o 3º Equipar), é só o Equipar que compra do monte.
 */
import { type Card, createGame, DEFAULT_CONFIG, type PlayerId, type SpecialKind } from '@coringa/engine';

/** Os dois assentos do treino: o mesmo par que a `LocalRoom` da web usa (`p1` é o jogador, `p2` o bot). */
const ME: PlayerId = 'p1';
const BOT: PlayerId = 'p2';

/** Até que Equipar a procura olha. */
export const TUTORIAL_EQUIPS = 3;

/** Equipar 1 a `TUTORIAL_EQUIPS`. */
type EquipNo = 1 | 2 | 3;

/**
 * Em que Equipar o jogador `p1` recebe pela primeira vez cada especial (e em que Equipar já tem K + J + Q juntos na mão, sem
 * ter jogado nada). `null`: não chega até o 3º Equipar, ou não chega com certeza (o 3º só conta se vale nas duas iniciativas).
 */
export interface TutorialDeal {
  firstEquipWithSpecial: Record<SpecialKind, number | null>;
  reflectByEquip: number | null;
  /** Quantas numéricas `p1` recebe no 1º Equipar: sem nenhuma, o Equipar dele sai sozinho e a dica 1 não aparece. */
  numericsInEquip1: number;
  /** `p1` começa com a iniciativa: na rodada 3 é ele quem escolhe a ordem (a dica 3). */
  initiativeIsMine: boolean;
}

const SPECIALS: readonly SpecialKind[] = ['J', 'Q', 'K', 'A', 'WILD'];
const REFLECT_TRIO: readonly SpecialKind[] = ['K', 'J', 'Q'];

/** A `n`-ésima semente candidata, na ordem da procura (`pnpm sim:tutorial`). */
export function tutorialSeedAt(index: number): string {
  return `tutorial-${index}`;
}

/** O monte e a iniciativa da partida de treino (rodada 1 já distribuída). */
function startOfGame(seed: string): {
  equip1: SpecialKind[];
  numerics1: number;
  deck: readonly Card[];
  initiative: PlayerId;
  perEquip: number;
} {
  const created = createGame(DEFAULT_CONFIG, seed, [ME, BOT]);
  if (!created.ok) throw new Error(`configuração inválida: ${created.error.message}`);
  const state = created.state;
  const me = state.players.find((p) => p.id === ME);
  if (!me) throw new Error('o jogador p1 não está na partida');
  return {
    equip1: me.hand.map((card) => card.kind),
    numerics1: me.pending.length,
    deck: state.deck,
    initiative: state.initiative,
    perEquip: state.config.cardsPerEquip,
  };
}

/**
 * Os especiais que `p1` tem na mão (ordenados por nome) depois do Equipar `equip`, sem ter jogado nenhum. `equip3Holder` é quem
 * tem a iniciativa quando o 3º Equipar é distribuído; nos dois primeiros ela é a da criação e o argumento não conta.
 */
export function tutorialHand(seed: string, equip: EquipNo, equip3Holder: PlayerId): SpecialKind[] {
  const { equip1, deck, initiative, perEquip } = startOfGame(seed);
  const hand: SpecialKind[] = [...equip1];
  for (let n = 2; n <= equip; n += 1) {
    const holder = n >= 3 ? equip3Holder : initiative;
    // Quem tem a iniciativa compra primeiro: as posições pares do bloco são dela, as ímpares do outro.
    const mine = holder === ME ? 0 : 1;
    const block = deck.slice((n - 2) * 2 * perEquip, (n - 1) * 2 * perEquip);
    block.forEach((card, i) => {
      if (i % 2 === mine && card.kind !== 'NUM') hand.push(card.kind as SpecialKind);
    });
  }
  return hand.sort();
}

/** A primeira vez (Equipar) em que `ok` vale em todas as iniciativas possíveis do 3º Equipar; `null` se não vale até lá. */
function firstEquipWhere(seed: string, ok: (hand: readonly SpecialKind[]) => boolean): number | null {
  for (let equip = 1; equip <= TUTORIAL_EQUIPS; equip += 1) {
    const holders: PlayerId[] = equip >= 3 ? [ME, BOT] : [ME];
    if (holders.every((holder) => ok(tutorialHand(seed, equip as EquipNo, holder)))) return equip;
  }
  return null;
}

export function tutorialDeal(seed: string): TutorialDeal {
  const firstEquipWithSpecial = {} as Record<SpecialKind, number | null>;
  for (const kind of SPECIALS) firstEquipWithSpecial[kind] = firstEquipWhere(seed, (hand) => hand.includes(kind));
  return {
    firstEquipWithSpecial,
    reflectByEquip: firstEquipWhere(seed, (hand) => REFLECT_TRIO.every((kind) => hand.includes(kind))),
    numericsInEquip1: startOfGame(seed).numerics1,
    initiativeIsMine: startOfGame(seed).initiative === ME,
  };
}

/** A iniciativa com o jogador (a dica 3 é a escolha da ordem), ao menos uma numérica no 1º Equipar (a dica 1 é a do Equipar), J, Q, K e A até o 2º Equipar, o Selvagem até o 3º e K + J + Q até o 3º. */
export function meetsTutorialCriterion(result: TutorialDeal): boolean {
  const first = result.firstEquipWithSpecial;
  const by = (equip: number | null, limit: number): boolean => equip !== null && equip <= limit;
  return (
    result.initiativeIsMine &&
    result.numericsInEquip1 >= 1 &&
    by(first.J, 2) &&
    by(first.Q, 2) && by(first.K, 2) && by(first.A, 2) && by(first.WILD, 3) && by(result.reflectByEquip, 3)
  );
}

/** A semente do tutorial: a de menor índice na ordem de `tutorialSeedAt` que cumpre `meetsTutorialCriterion` (`pnpm sim:tutorial`). */
export const TUTORIAL_SEED = 'tutorial-2431';
