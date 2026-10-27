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
  antiStallRounds: number;
  exodiaGuard: number;
  resurrectMinRounds: number;
  /**
   * Cópias de cada numérica e de cada figura (J, Q, K), e dos Ás. Sem `aceCopies` (replays de antes do sub-projeto 5), os Ás têm
   * `faceCopies` cópias, como as outras figuras.
   */
  deck: { numericCopies: number; faceCopies: number; aceCopies?: number };
  initiativeChoice: boolean;
  wildJokers: boolean;
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
  /** Numéricas recebidas no Equipar, na ordem de compra, aguardando destino. */
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
  reflect: ReflectState | null;
  absoluteDefense: boolean;
  quads: Quad[];
  resurrections: Resurrection[];
  damageThisRound: number;
}

export type ReactionTrigger = 'ATTACK' | 'K_PLAYED' | 'REFLECT_PLAYED';

export type GameResult =
  | { kind: 'WIN'; winner: PlayerId; reason: 'HP' | 'EXODIA' | 'ANTI_STALL' | 'FORFEIT' }
  | { kind: 'DRAW'; reason: 'ANTI_STALL' };

export type Phase =
  | { kind: 'EQUIP' }
  | { kind: 'ORDER_CHOICE'; player: PlayerId }
  | { kind: 'ATTACK_MAIN'; player: PlayerId }
  | { kind: 'REACTION'; responder: PlayerId; trigger: ReactionTrigger }
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
  turnOrder: [PlayerId, PlayerId];
  turnIndex: 0 | 1;
  /** Rodadas de Ataque seguidas sem ninguém perder vida (o anti-travamento, spec §1.11). */
  noDamageStreak: number;
  hpLostThisRound: boolean;
  phase: Phase;
}

export type Action =
  | { type: 'EQUIP'; destinations: Destination[] }
  | { type: 'CHOOSE_ORDER'; first: boolean }
  | { type: 'PLAY_J'; cardId: string }
  | { type: 'PLAY_Q'; cardId: string }
  | { type: 'PLAY_K'; cardIds: string[] }
  | { type: 'TRAP'; cardId: string; targetId: string }
  | { type: 'SACRIFICE'; cardId: string; targetId: string }
  | { type: 'REFLECT'; kId: string; jId: string; qId: string }
  | { type: 'CANCEL_REFLECT'; kId: string; jId: string; qId: string }
  | { type: 'PROTECT_FROM_REFLECT'; jId: string; qId: string; kId: string }
  | { type: 'RESURRECT'; cardId: string; row: RowName }
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
  | { type: 'ReflectPlayed'; player: PlayerId; reflect: ReflectState }
  | { type: 'ReflectCanceled'; player: PlayerId; owner: PlayerId }
  | { type: 'ReflectProtected'; player: PlayerId; owner: PlayerId }
  | { type: 'ReflectExpired'; owner: PlayerId }
  | { type: 'ReflectTriggered'; owner: PlayerId; attacker: PlayerId; damage: number }
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
  | { type: 'InitiativeChanged'; player: PlayerId }
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
  | 'REFLECT_ALREADY_ACTIVE'
  | 'NO_REFLECT'
  | 'INVALID_DESTINATIONS'
  | 'ALREADY_SUBMITTED'
  | 'NO_RESURRECTION'
  | 'ROW_FULL'
  | 'ATTACK_ROW_EMPTY'
  | 'ATTACK_ROW_NOT_EMPTY';

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
  turnOrder: [PlayerId, PlayerId];
  turnIndex: 0 | 1;
  noDamageStreak: number;
  phase: Phase;
  deckCount: number;
  graveyard: Card[];
  self: SelfView;
  opponent: PublicPlayer;
}
