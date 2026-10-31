/** Tipos centrais do motor do Jogo do Coringa (spec §1 e §2). */

export type PlayerId = string;
export type Suit = 'copas' | 'ouros' | 'espadas' | 'paus';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type FaceKind = 'J' | 'Q' | 'K' | 'A';
export type RowName = 'ATK' | 'DEF';

export interface NumCard {
  id: string;
  kind: 'NUM';
  value: Rank;
  suit: Suit;
}

export interface FaceCard {
  id: string;
  kind: FaceKind;
  suit: Suit;
}

/** Coringa Selvagem: assume o papel de J, Q ou A — nunca K. O papel é implícito pela zona. */
export interface WildCard {
  id: string;
  kind: 'WILD';
}

export type SpecialCard = FaceCard | WildCard;
export type SpecialKind = SpecialCard['kind'];
export type Card = NumCard | SpecialCard;

export interface RulesConfig {
  hp: number;
  rowLimit: number;
  /** Limite de J (e de Q). Atingi-lo ativa Ataque/Defesa Absoluta. */
  buffLimit: number;
  cardsPerEquip: number;
  exodiaGuard: number;
  resurrectMinRounds: number;
  /**
   * Cópias de cada numérica e de cada figura (J, Q, K), e dos Ás. Sem `aceCopies` (replays de antes do sub-projeto 5), os Ás têm
   * `faceCopies` cópias, como as outras figuras.
   */
  deck: { numericCopies: number; faceCopies: number; aceCopies?: number };
  initiativeChoice: boolean;
  wildJokers: boolean;
  /**
   * Cura passiva (E3 do sub-projeto 5): com pelo menos este número de K na Guarda, cada numérica da própria Fileira de Defesa que
   * vai ao cemitério cura valor × (1 + nº de Q). Sem o campo (replays de antes da E3, ou a medição sem cura), nada cura.
   */
  defenseHealGuard?: number;
  /**
   * Limite de especiais na mão (E3), com a penalidade na compra: `BURN`, a especial que passa do limite vai direto ao cemitério;
   * `CHOOSE`, o jogador descarta o excesso (`DISCARD`) antes de confirmar o Equipar; `FEWER`, quem passou do limite compra menos
   * no Equipar seguinte. Sem o campo (replays antigos), nada limita. A forma fica com o autor, depois da medição.
   */
  specialLimit?: { max: number; penalty: 'BURN' | 'CHOOSE' | 'FEWER' };
}

export type Destination = 'ATK' | 'DEF' | 'REPLACE_LAST_ATK' | 'REPLACE_LAST_DEF' | 'DISCARD';

export interface Placement {
  card: NumCard;
  destination: Destination;
  replaced?: NumCard;
}

export interface ReflectState {
  k: SpecialCard;
  j: SpecialCard;
  q: SpecialCard;
}

export interface Quad {
  row: RowName;
  value: Rank;
}

export interface Resurrection {
  row: RowName;
  value: Rank;
  formedAtRound: number;
}

export interface PlayerState {
  id: PlayerId;
  hp: number;
  /** Só especiais (J, Q, K, A, Selvagem). */
  hand: SpecialCard[];
  /** Numéricas recebidas no Equipar, na ordem de compra, aguardando destino (depois de confirmar, na ordem escolhida). */
  pending: NumCard[];
  equipSubmitted: boolean;
  submittedDestinations: Destination[] | null;
  attackRow: NumCard[];
  defenseRow: NumCard[];
  /** J ou Selvagem no papel de J. */
  attackBuffs: SpecialCard[];
  /** Q ou Selvagem no papel de Q. */
  defenseBuffs: SpecialCard[];
  guard: SpecialCard[];
  /**
   * O Reflect lançado e ainda não resolvido (F2 do sub-projeto 5): ele só existe entre o lançamento, na reação a um golpe, e a
   * resposta de quem é refletido. Nunca fica armado de um turno para outro.
   */
  reflect: ReflectState | null;
  absoluteDefense: boolean;
  quads: Quad[];
  resurrections: Resurrection[];
  damageThisRound: number;
}

/** `REFLECT_PLAYED`: a resposta de quem foi refletido (F2). `DEVASTATION`: a janela aberta pela Devastação (F3). */
export type ReactionTrigger = 'ATTACK' | 'K_PLAYED' | 'DEVASTATION' | 'REFLECT_PLAYED';

/** A Devastação em curso (F3): quem lançou, a fileira do oponente que ela esvazia e as 3 cartas (K, o A e o J ou o Q). */
export interface DevastationState {
  player: PlayerId;
  row: RowName;
  k: SpecialCard;
  a: SpecialCard;
  x: SpecialCard;
}

/** Sem anti-travamento (E1 do sub-projeto 5) não há empate: a partida acaba por vida, Exódia ou W.O. */
export type GameResult = { kind: 'WIN'; winner: PlayerId; reason: 'HP' | 'EXODIA' | 'FORFEIT' };

export type Phase =
  | { kind: 'EQUIP' }
  | { kind: 'ORDER_CHOICE'; player: PlayerId }
  | { kind: 'ATTACK_MAIN'; player: PlayerId }
  /** `devastation`: a Devastação em curso, na janela dela e na resposta ao Reflect que a devolve. */
  | { kind: 'REACTION'; responder: PlayerId; trigger: ReactionTrigger; devastation?: DevastationState }
  | { kind: 'GAME_OVER'; result: GameResult };

export type RngState = [number, number, number, number];

export interface GameState {
  config: RulesConfig;
  rng: RngState;
  players: [PlayerState, PlayerState];
  /** Topo do monte = índice 0. */
  deck: Card[];
  graveyard: Card[];
  round: number;
  roundKind: 'EQUIP' | 'ATTACK';
  initiative: PlayerId;
  /** A última decisão da iniciativa (spec §1.10); `null` enquanto ela é a sorteada na criação. */
  lastInitiative: InitiativeDecision | null;
  turnOrder: [PlayerId, PlayerId];
  turnIndex: 0 | 1;
  phase: Phase;
}

/**
 * O fim de uma rodada de Ataque (spec §1.10): com quem a iniciativa ficou, se mudou de mão e o dano de cada um na rodada (o que
 * decidiu). Sai sempre, mudando ou não, para a tela dizer o porquê (autor, 2026-10-31).
 */
export interface InitiativeDecision {
  player: PlayerId;
  changed: boolean;
  damage: Record<PlayerId, number>;
}

export type Action =
  /**
   * `destinations[i]` vale para a carta `order[i]` (ids das numéricas pendentes, na ordem em que entram: E2 do sub-projeto 5).
   * Sem `order`, a ordem de compra.
   */
  | { type: 'EQUIP'; destinations: Destination[]; order?: string[] }
  | { type: 'CHOOSE_ORDER'; first: boolean }
  | { type: 'PLAY_J'; cardId: string }
  | { type: 'PLAY_Q'; cardId: string }
  | { type: 'PLAY_K'; cardIds: string[] }
  | { type: 'TRAP'; cardId: string; targetId: string }
  | { type: 'SACRIFICE'; cardId: string; targetId: string }
  /** Só na reação a um golpe (F2): K + J + Q da mão. */
  | { type: 'REFLECT'; kId: string; jId: string; qId: string }
  /** Reflect contra Reflect: só na resposta a um Reflect, com K + J + Q da mão. */
  | { type: 'CANCEL_REFLECT'; kId: string; jId: string; qId: string }
  | { type: 'RESURRECT'; cardId: string; row: RowName }
  /**
   * Devastação (F3): K + A + J esvazia a Fileira de Ataque do oponente, K + A + Q a de Defesa. `row` é a fileira **do oponente**;
   * `xId` é o J (Ataque) ou o Q (Defesa). O Selvagem vale como A, J ou Q.
   */
  | { type: 'DEVASTATE'; kId: string; aId: string; xId: string; row: RowName }
  /** Limite de especiais com a penalidade `CHOOSE` (E3): descarta exatamente o excesso da mão, na rodada de Equipar. */
  | { type: 'DISCARD'; cardIds: string[] }
  /** Roubo (E3): o Ás (ou o Selvagem como A) leva a numérica `targetId` do oponente para o fim da fileira `row` do ladrão. */
  | { type: 'STEAL'; cardId: string; targetId: string; row: RowName }
  | { type: 'DECLARE_ATTACK' }
  | { type: 'END_TURN' }
  | { type: 'PASS' }
  | { type: 'TIMEOUT' }
  | { type: 'FORFEIT'; loser: PlayerId };

/** Uma ação da partida gravada: quem agiu e o quê. */
export interface ReplayStep {
  player: PlayerId | 'system';
  action: Action;
}

/**
 * Partida gravada: semente + config completa + ações. Mesmo formato das fixtures de
 * `test/fixtures/golden-replays.json`, dos arquivos salvos pelo `pnpm play` e do log do servidor.
 */
export interface Replay {
  name: string;
  config: RulesConfig;
  seed: string;
  players: [PlayerId, PlayerId];
  steps: ReplayStep[];
}

export type GameEvent =
  | { type: 'RoundStarted'; round: number; kind: 'EQUIP' | 'ATTACK' }
  | { type: 'DeckReshuffled'; count: number }
  | { type: 'CardsDealt'; player: PlayerId; count: number; cards?: Card[] }
  | { type: 'EquipSubmitted'; player: PlayerId }
  | { type: 'CardsPlaced'; player: PlayerId; placements: Placement[] }
  | { type: 'OrderChosen'; player: PlayerId; first: boolean; turnOrder: [PlayerId, PlayerId] }
  | { type: 'TurnStarted'; player: PlayerId }
  | { type: 'BuffPlayed'; player: PlayerId; card: SpecialCard; as: 'J' | 'Q' }
  | { type: 'GuardPlayed'; player: PlayerId; cards: SpecialCard[] }
  /** `as` só quando a carta usada é um Selvagem (no papel de A). */
  | { type: 'TrapUsed'; player: PlayerId; card: SpecialCard; as?: 'A'; target: SpecialCard; targetOwner: PlayerId }
  /** `as` só quando a carta sacrificada é um Selvagem (no papel de J ou de Q, o do alvo). */
  | { type: 'Sacrificed'; player: PlayerId; card: SpecialCard; as?: 'J' | 'Q'; target: SpecialCard; targetOwner: PlayerId }
  /** `against`: o golpe que o Reflect responde. */
  | { type: 'ReflectPlayed'; player: PlayerId; reflect: ReflectState; against: 'ATTACK' | 'DEVASTATION' }
  /** Reflect contra Reflect: `player` respondeu ao Reflect de `owner`; os dois se anulam e o golpe não acontece. */
  | { type: 'ReflectCanceled'; player: PlayerId; owner: PlayerId }
  | { type: 'ReflectTriggered'; owner: PlayerId; attacker: PlayerId; damage: number }
  /** `target`: o dono da fileira que a Devastação esvazia, se ninguém responder. */
  | { type: 'DevastationCast'; player: PlayerId; target: PlayerId; row: RowName; k: SpecialCard; a: SpecialCard; x: SpecialCard }
  /** `player` perdeu a fileira inteira; `reflected`: foi a própria Devastação, devolvida por um Reflect. */
  | { type: 'RowDevastated'; player: PlayerId; row: RowName; cards: NumCard[]; reflected: boolean }
  /** A Devastação de `player` não aconteceu: Reflect contra Reflect, ou o Reflect contra quem está sob Defesa Absoluta. */
  | { type: 'DevastationCanceled'; player: PlayerId; reason: 'REFLECT_CLASH' | 'ABSOLUTE_DEFENSE' }
  /** Roubo (E3): `player` levou `card` da fileira `fromRow` de `from` para a própria `toRow`, gastando `ace` (`as` com o Selvagem). */
  | { type: 'CardStolen'; player: PlayerId; from: PlayerId; card: NumCard; fromRow: RowName; toRow: RowName; ace: SpecialCard; as?: 'A' }
  /** O dano do roubo de uma carta ♣ ♠: `value` é o valor seco; `damage`, o que saiu da vida (a vida fica em no mínimo 1). */
  | { type: 'StealDamage'; player: PlayerId; victim: PlayerId; value: number; damage: number; blocked: boolean }
  /** Cura (E3): `amount` é o que entrou na vida (nunca passa da inicial); `card`, a carta que curou. */
  | { type: 'Healed'; player: PlayerId; amount: number; source: 'STEAL' | 'DEFENSE'; card: NumCard }
  /** Penalidade do limite de especiais (E3): `cards` foram ao cemitério (BURN, CHOOSE); `fewer`, as cartas a menos na compra (FEWER). */
  | { type: 'HandLimitPenalty'; player: PlayerId; penalty: 'BURN' | 'CHOOSE' | 'FEWER'; cards: SpecialCard[]; fewer: number }
  | { type: 'ReactionWindowOpened'; responder: PlayerId; trigger: ReactionTrigger }
  | { type: 'ReactionWindowClosed'; responder: PlayerId; trigger: ReactionTrigger }
  | { type: 'AttackDeclared'; player: PlayerId }
  | { type: 'AbsoluteAttack'; player: PlayerId }
  | { type: 'DamageDealt'; attacker: PlayerId; defender: PlayerId; attack: number; defense: number; damage: number }
  | { type: 'GuardBroken'; player: PlayerId; cards: SpecialCard[] }
  | { type: 'BuffRemoved'; player: PlayerId; cards: SpecialCard[] }
  | { type: 'CardsRemovedFromRow'; player: PlayerId; row: RowName; cards: NumCard[] }
  | { type: 'QuadFormed'; player: PlayerId; quad: Quad }
  | { type: 'QuadBroken'; player: PlayerId; quad: Quad }
  | { type: 'Resurrected'; player: PlayerId; card: NumCard; row: RowName }
  | { type: 'AbsoluteDefenseStarted'; player: PlayerId }
  | { type: 'AbsoluteDefenseEnded'; player: PlayerId }
  | ({ type: 'InitiativeDecided' } & InitiativeDecision)
  | { type: 'Exodia'; player: PlayerId }
  | { type: 'GameOver'; result: GameResult };

export type RuleErrorCode =
  | 'GAME_OVER'
  | 'WRONG_PHASE'
  | 'NOT_YOUR_TURN'
  | 'UNKNOWN_PLAYER'
  | 'SYSTEM_ONLY'
  | 'PLAYER_ONLY'
  | 'INVALID_ACTION'
  | 'CARD_NOT_IN_HAND'
  | 'CARD_NOT_IN_GRAVEYARD'
  | 'INVALID_CARD'
  | 'DUPLICATE_CARDS'
  | 'BUFF_LIMIT'
  | 'INVALID_TARGET'
  | 'TARGET_PROTECTED'
  | 'NO_REFLECT'
  | 'INVALID_DESTINATIONS'
  | 'ALREADY_SUBMITTED'
  | 'NO_RESURRECTION'
  | 'ROW_FULL'
  | 'ATTACK_ROW_EMPTY'
  | 'ATTACK_ROW_NOT_EMPTY'
  | 'HAND_LIMIT';

export interface RuleError {
  code: RuleErrorCode;
  message: string;
}

export interface ConfigError {
  code: 'INVALID_CONFIG' | 'INVALID_PLAYERS';
  message: string;
}

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: RuleError };

export type CreateGameResult = { ok: true; state: GameState } | { ok: false; error: ConfigError };

export interface PublicPlayer {
  id: PlayerId;
  hp: number;
  attackRow: NumCard[];
  defenseRow: NumCard[];
  attackBuffs: SpecialCard[];
  defenseBuffs: SpecialCard[];
  guard: SpecialCard[];
  reflect: ReflectState | null;
  absoluteDefense: boolean;
  quads: Quad[];
  resurrectionCount: number;
  handCount: number;
  pendingCount: number;
  equipSubmitted: boolean;
  /** O dano causado nesta rodada de Ataque, que decide a iniciativa (o do Roubo não conta). */
  damageThisRound: number;
}

export interface SelfView extends PublicPlayer {
  hand: SpecialCard[];
  pending: NumCard[];
  resurrections: Resurrection[];
}

export interface PlayerView {
  me: PlayerId;
  config: RulesConfig;
  round: number;
  roundKind: 'EQUIP' | 'ATTACK';
  initiative: PlayerId;
  lastInitiative: InitiativeDecision | null;
  turnOrder: [PlayerId, PlayerId];
  turnIndex: 0 | 1;
  phase: Phase;
  deckCount: number;
  graveyard: Card[];
  self: SelfView;
  opponent: PublicPlayer;
}
