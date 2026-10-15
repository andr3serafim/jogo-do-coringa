# Motor do Jogo do Coringa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `@coringa/engine`, o motor de regras puro, determinístico e testado do Jogo do Coringa (Regras v2), pronto para ser usado pelo servidor, pela interface, pelo simulador e pelo jogo no terminal.

**Architecture:** Pacote TypeScript sem dependências de runtime dentro de um monorepo pnpm. `applyAction(state, player, action)` clona o estado, aplica a ação num rascunho e devolve `{ ok, state, events }` ou `{ ok: false, error }`. Violações de regra são lançadas internamente como `RuleViolation` e convertidas em valor no `applyAction`. Uma máquina de fases explícita (`EQUIP → ORDER_CHOICE → ATTACK_MAIN ⇄ REACTION → … → GAME_OVER`) conduz a partida. `viewFor` e `viewEvents` escondem a informação oculta, e `legalActions` lista jogadas canônicas a partir da visão do jogador.

**Tech Stack:** Node 24, pnpm 11.9, TypeScript ~6.0.3, Vitest ^5.0.5 (com vite ^8.3.4 e @vitest/coverage-v8), fast-check ^4.10.2, ESLint ^10.12 com typescript-eslint ^8.71.2.

**Spec:** `docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`. Leia as §1 (regras) e §2 (motor) antes de qualquer tarefa.

**Escopo deste plano:** as §1, §2 e §5 da spec, que cobrem as regras, o motor e os testes. O **simulador** (§3) e o **jogo no terminal** (§4) ficam no Plano 2, que será escrito sobre a API real deste motor. Execute em uma branch própria (ex.: `feat/motor`), nunca direto na `main`.

## Global Constraints

- Node ≥ 24 e pnpm 11.9.0 (campo `packageManager`).
- TypeScript **~6.0.3**. O typescript-eslint 8.71 só suporta TS < 6.1, então não suba para TS 7.
- ESLint ^10.12.0, @eslint/js ^10.0.1, typescript-eslint ^8.71.2, Vitest ^5.0.5, @vitest/coverage-v8 ^5.0.5, vite ^8.3.4 (peer do Vitest 5), fast-check ^4.10.2, @types/node ^24.
- **Motor sem dependências de runtime, sem I/O e sem relógio.** Nada de `Math.random`: toda aleatoriedade vem do PRNG guardado no estado (`state.rng`).
- **Entrada inválida vira valor**: `applyAction` devolve `{ ok: false, error: { code, message } }` e nunca lança exceção por culpa do jogador. `applyAction` **nunca muta** o estado recebido.
- Mensagens de erro e comentários em **pt-BR**; identificadores de código em inglês.
- Config padrão (spec §2.7): `hp 100, rowLimit 7, buffLimit 4, cardsPerEquip 4, antiStallRounds 5 (3 quando tablePressure = false), exodiaGuard 4, resurrectMinRounds 3, deck { numericCopies 8, faceCopies 6 }, initiativeChoice true, tablePressure true, wildJokers true`.
- O baralho tem **96 cartas, ou 98 com `wildJokers`**. O total sempre é derivado da config, nunca fixado no código.
- Cobertura do motor ≥ **90% de linhas e de branches** (gate da Tarefa 13).

## Review Focus

1. **Payload forjado ou malformado** (id de carta que não está na mão, id da mão do *oponente*, ids repetidos, destino de Equipar desconhecido, `type` de ação inexistente) → `RuleError` com código claro e estado intacto. *Testado nas Tarefas 5, 7 e 8.*
2. **Jogador agindo fora da vez ou da fase** (oponente no turno alheio, `PASS` sem janela, `EQUIP` repetido, qualquer ação após `GAME_OVER`) → erro (`NOT_YOUR_TURN`, `WRONG_PHASE`, `ALREADY_SUBMITTED`, `GAME_OVER`). *Testado nas Tarefas 5 e 7.*
3. **Vazamento de informação oculta** pela visão ou pelos eventos (mão do oponente, numéricas recebidas por ele no Equipar, ordem do monte, semente) → nunca aparece para quem não deve. *Testado nas Tarefas 11 e 13.*
4. **Monte acabando no meio de uma distribuição** → o cemitério é reembaralhado, a distribuição continua, e nenhuma carta some ou se duplica. *Testado na Tarefa 4.*
5. **Mutação do estado de entrada** (o servidor reaproveita o estado anterior quando uma ação falha) → o estado recebido fica idêntico, tanto em sucesso quanto em erro. *Testado nas Tarefas 5 e 13.*

---

## Estrutura de arquivos

```
package.json                    # scripts do monorepo (lint, typecheck, test, check)
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
.gitignore
packages/engine/
  package.json                  # @coringa/engine (exporta src/index.ts direto, sem build)
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                    # API pública
    types.ts                    # todos os tipos (estado, ações, eventos, visão, erros)
    errors.ts                   # RuleViolation + fail()
    config.ts                   # DEFAULT_CONFIG, makeConfig, validateConfig
    rng.ts                      # PRNG determinístico (cyrb128 + sfc32) e shuffle
    deck.ts                     # buildDeck, totalCards
    quads.ts                    # quadras (Fallen is Back) e Ressurreições
    state.ts                    # helpers de estado: jogadores, mão, cemitério, compra, fim de jogo
    flow.ts                     # transições de rodada/turno/janela, expiração de efeitos
    combat.ts                   # ATK/DEF e resolução de um ataque (spec §1.9)
    create-game.ts              # createGame
    actions/equip.ts            # EQUIP + timeout do Equipar
    actions/order.ts            # CHOOSE_ORDER (Escolha da iniciativa)
    actions/main.ts             # jogadas da fase principal
    actions/reaction.ts         # janela de reação
    apply-action.ts             # despachante + TIMEOUT/FORFEIT
    view.ts                     # viewFor, viewEvents
    legal-actions.ts            # legalActions
  test/
    helpers.ts                  # setup() de cenários, act/actErr/steps, utilitários
    playout.ts                  # partidas aleatórias para testes de propriedade
    *.test.ts
```

Convenções usadas em todas as tarefas:
- O estado é dado puro (JSON-compatível). `applyAction` faz `structuredClone` e só muta o clone.
- Um Coringa Selvagem não guarda o papel em um campo: o papel é **implícito pela zona** em que ele está (Buffs de Ataque → J; Buffs de Defesa → Q; componente `j`/`q` do Reflect). Isso cumpre a §2.3 da spec ("guarda o papel assumido").
- Topo do monte = índice 0. "1ª carta" de uma fileira = índice 0. O K/J/Q "mais antigo" = índice 0.

---

### Task 1: Monorepo, tooling, tipos e configuração

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.gitignore`
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/vitest.config.ts`
- Create: `packages/engine/src/types.ts`, `packages/engine/src/errors.ts`, `packages/engine/src/config.ts`, `packages/engine/src/index.ts`
- Test: `packages/engine/test/config.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: todos os tipos de `types.ts` (usados por todas as tarefas); `RuleViolation`, `fail(code, message): never`; `DEFAULT_CONFIG`, `makeConfig(overrides?: ConfigOverrides): RulesConfig`, `validateConfig(config): ConfigError | null`, `type ConfigOverrides`.

- [ ] **Step 1: Criar os arquivos do monorepo**

`package.json`:
```json
{
  "name": "jogo-coringa",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.9.0",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "lint": "eslint .",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "check": "pnpm lint && pnpm typecheck && pnpm test"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.12.0",
    "typescript": "~6.0.3",
    "typescript-eslint": "^8.71.2"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - packages/*
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`eslint.config.js`:
```js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
);
```

`.gitignore`:
```
node_modules/
coverage/
dist/
*.log
```

`packages/engine/package.json`:
```json
{
  "name": "@coringa/engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@vitest/coverage-v8": "^5.0.5",
    "fast-check": "^4.10.2",
    "typescript": "~6.0.3",
    "vite": "^8.3.4",
    "vitest": "^5.0.5"
  }
}
```

`packages/engine/tsconfig.json` (o TS 6 não inclui `@types` automaticamente, então `types: ["node"]` é obrigatório para `structuredClone`):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "test", "vitest.config.ts"]
}
```

`packages/engine/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts'],
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
```

- [ ] **Step 2: Instalar dependências**

Run: `pnpm install`
Expected: cria `pnpm-lock.yaml` e `node_modules/` sem erros. Se o pnpm avisar que ignorou build scripts (ex.: esbuild), siga em frente: não afeta os testes.

- [ ] **Step 3: Escrever o teste da configuração (falhando)**

`packages/engine/test/config.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, makeConfig, validateConfig } from '../src/config';

describe('config', () => {
  it('makeConfig sem argumentos devolve o padrão da spec', () => {
    expect(makeConfig()).toEqual(DEFAULT_CONFIG);
    expect(DEFAULT_CONFIG).toEqual({
      hp: 100,
      rowLimit: 7,
      buffLimit: 4,
      cardsPerEquip: 4,
      antiStallRounds: 5,
      exodiaGuard: 4,
      resurrectMinRounds: 3,
      deck: { numericCopies: 8, faceCopies: 6 },
      initiativeChoice: true,
      tablePressure: true,
      wildJokers: true,
    });
  });

  it('sem Pressão da mesa, o anti-travamento padrão cai para 3', () => {
    expect(makeConfig({ tablePressure: false }).antiStallRounds).toBe(3);
    expect(makeConfig({ tablePressure: false, antiStallRounds: 4 }).antiStallRounds).toBe(4);
  });

  it('mescla o baralho parcialmente', () => {
    expect(makeConfig({ deck: { faceCopies: 4 } }).deck).toEqual({ numericCopies: 8, faceCopies: 4 });
  });

  it('aceita o padrão e limites válidos', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toBeNull();
    expect(validateConfig(makeConfig({ rowLimit: 16 }))).toBeNull();
    expect(validateConfig(makeConfig({ resurrectMinRounds: 0 }))).toBeNull();
  });

  it('rejeita limite de fileira que quebra a garantia de compra', () => {
    expect(validateConfig(makeConfig({ rowLimit: 17 }))?.code).toBe('INVALID_CONFIG');
  });

  it('rejeita valores fora do domínio', () => {
    expect(validateConfig(makeConfig({ hp: 0 }))?.code).toBe('INVALID_CONFIG');
    expect(validateConfig(makeConfig({ buffLimit: 1.5 }))?.code).toBe('INVALID_CONFIG');
    expect(validateConfig(makeConfig({ deck: { numericCopies: 9 } }))?.code).toBe('INVALID_CONFIG');
    expect(validateConfig(makeConfig({ deck: { faceCopies: -1 } }))?.code).toBe('INVALID_CONFIG');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/config.test.ts`
Expected: FAIL. O Vitest não consegue resolver `../src/config`.

- [ ] **Step 5: Implementar tipos, erros e configuração**

`packages/engine/src/types.ts`:
```ts
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
  deck: { numericCopies: number; faceCopies: number };
  initiativeChoice: boolean;
  tablePressure: boolean;
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
  /** Bônus da Pressão da mesa, fixado no início de cada rodada de Ataque. */
  pressure: number;
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
  | { type: 'TrapUsed'; player: PlayerId; card: SpecialCard; target: SpecialCard; targetOwner: PlayerId }
  | { type: 'Sacrificed'; player: PlayerId; card: SpecialCard; target: SpecialCard; targetOwner: PlayerId }
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
  | { type: 'PressureChanged'; pressure: number }
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
  pressure: number;
  noDamageStreak: number;
  phase: Phase;
  deckCount: number;
  graveyard: Card[];
  self: SelfView;
  opponent: PublicPlayer;
}
```

`packages/engine/src/errors.ts`:
```ts
import type { RuleErrorCode } from './types';

/** Violação de regra causada por uma ação do jogador. `applyAction` converte em `{ ok: false }`. */
export class RuleViolation extends Error {
  readonly code: RuleErrorCode;

  constructor(code: RuleErrorCode, message: string) {
    super(message);
    this.name = 'RuleViolation';
    this.code = code;
  }
}

export function fail(code: RuleErrorCode, message: string): never {
  throw new RuleViolation(code, message);
}
```

`packages/engine/src/config.ts`:
```ts
import type { ConfigError, RulesConfig } from './types';

export const DEFAULT_CONFIG: RulesConfig = {
  hp: 100,
  rowLimit: 7,
  buffLimit: 4,
  cardsPerEquip: 4,
  antiStallRounds: 5,
  exodiaGuard: 4,
  resurrectMinRounds: 3,
  deck: { numericCopies: 8, faceCopies: 6 },
  initiativeChoice: true,
  tablePressure: true,
  wildJokers: true,
};

export type ConfigOverrides = Partial<Omit<RulesConfig, 'deck'>> & {
  deck?: Partial<RulesConfig['deck']>;
};

/** Monta uma config a partir do padrão. Sem Pressão da mesa, o anti-travamento padrão é 3 (spec §1.11). */
export function makeConfig(overrides: ConfigOverrides = {}): RulesConfig {
  const antiStallRounds = overrides.tablePressure === false ? 3 : DEFAULT_CONFIG.antiStallRounds;
  return {
    ...DEFAULT_CONFIG,
    antiStallRounds,
    ...overrides,
    deck: { ...DEFAULT_CONFIG.deck, ...overrides.deck },
  };
}

const isInt = (n: number, min: number, max = Number.MAX_SAFE_INTEGER): boolean =>
  Number.isInteger(n) && n >= min && n <= max;

export function validateConfig(c: RulesConfig): ConfigError | null {
  const checks: Array<[boolean, string]> = [
    [isInt(c.hp, 1), 'hp deve ser um inteiro ≥ 1'],
    [isInt(c.rowLimit, 1), 'rowLimit deve ser um inteiro ≥ 1'],
    [isInt(c.buffLimit, 1), 'buffLimit deve ser um inteiro ≥ 1'],
    [isInt(c.cardsPerEquip, 1), 'cardsPerEquip deve ser um inteiro ≥ 1'],
    [isInt(c.antiStallRounds, 1), 'antiStallRounds deve ser um inteiro ≥ 1'],
    [isInt(c.exodiaGuard, 1), 'exodiaGuard deve ser um inteiro ≥ 1'],
    [isInt(c.resurrectMinRounds, 0), 'resurrectMinRounds deve ser um inteiro ≥ 0'],
    [isInt(c.deck.numericCopies, 1, 8), 'deck.numericCopies deve ser um inteiro entre 1 e 8'],
    [isInt(c.deck.faceCopies, 0, 8), 'deck.faceCopies deve ser um inteiro entre 0 e 8'],
  ];
  for (const [ok, message] of checks) {
    if (!ok) return { code: 'INVALID_CONFIG', message };
  }
  // Garantia de compra (spec §1.4): numéricas nunca ficam na mão; o campo comporta 4 × rowLimit.
  const maxOnField = 4 * c.rowLimit;
  const budget = 9 * c.deck.numericCopies - 2 * c.cardsPerEquip;
  if (maxOnField > budget) {
    return {
      code: 'INVALID_CONFIG',
      message: `rowLimit ${c.rowLimit} quebra a garantia de compra: 4 × rowLimit deve ser ≤ ${budget}`,
    };
  }
  return null;
}
```

`packages/engine/src/index.ts`:
```ts
export * from './types';
export { DEFAULT_CONFIG, makeConfig, validateConfig, type ConfigOverrides } from './config';
```

- [ ] **Step 6: Rodar os testes e o check completo**

Run: `pnpm --filter @coringa/engine test test/config.test.ts`
Expected: PASS (6 testes).

Run: `pnpm check`
Expected: lint, typecheck e testes passam sem erros.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json eslint.config.js .gitignore packages/engine
git commit -m "chore: monorepo pnpm e pacote @coringa/engine com tipos e config" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: PRNG determinístico e baralho

**Files:**
- Create: `packages/engine/src/rng.ts`, `packages/engine/src/deck.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/rng-deck.test.ts`

**Interfaces:**
- Consumes: `RngState`, `Card`, `FaceKind`, `Rank`, `RulesConfig`, `Suit` (Tarefa 1).
- Produces: `seedRng(seed: string): RngState`, `nextFloat(rng: RngState): number` (muta `rng`), `nextInt(rng, max): number`, `shuffle<T>(rng, items: readonly T[]): T[]` (não muta `items`), `buildDeck(config): Card[]`, `totalCards(config): number`.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/rng-deck.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/config';
import { buildDeck, totalCards } from '../src/deck';
import { nextFloat, seedRng, shuffle } from '../src/rng';

describe('rng', () => {
  it('a mesma semente gera a mesma sequência', () => {
    const a = seedRng('coringa');
    const b = seedRng('coringa');
    const seqA = Array.from({ length: 5 }, () => nextFloat(a));
    const seqB = Array.from({ length: 5 }, () => nextFloat(b));
    expect(seqA).toEqual(seqB);
  });

  it('sementes diferentes geram sequências diferentes', () => {
    expect(nextFloat(seedRng('a'))).not.toBe(nextFloat(seedRng('b')));
  });

  it('gera números em [0, 1)', () => {
    const rng = seedRng('faixa');
    for (let i = 0; i < 1000; i += 1) {
      const x = nextFloat(rng);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('shuffle devolve uma permutação determinística sem mutar a entrada', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(seedRng('x'), input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(shuffle(seedRng('x'), input)).toEqual(out);
  });
});

describe('baralho', () => {
  it('padrão: 72 numéricas, 6 de cada figura e 2 Coringas Selvagens', () => {
    const deck = buildDeck(makeConfig());
    expect(deck).toHaveLength(98);
    expect(deck.filter((c) => c.kind === 'NUM')).toHaveLength(72);
    for (const kind of ['J', 'Q', 'K', 'A'] as const) {
      expect(deck.filter((c) => c.kind === kind)).toHaveLength(6);
    }
    expect(deck.filter((c) => c.kind === 'WILD')).toHaveLength(2);
    for (let v = 2; v <= 10; v += 1) {
      expect(deck.filter((c) => c.kind === 'NUM' && c.value === v)).toHaveLength(8);
    }
    expect(new Set(deck.map((c) => c.id)).size).toBe(98);
    expect(totalCards(makeConfig())).toBe(98);
  });

  it('sem Coringas Selvagens tem 96 cartas', () => {
    const config = makeConfig({ wildJokers: false });
    expect(buildDeck(config)).toHaveLength(96);
    expect(totalCards(config)).toBe(96);
  });

  it('as figuras retiradas são as 2 últimas cópias do segundo baralho', () => {
    const ids = buildDeck(makeConfig()).map((c) => c.id);
    expect(ids).toContain('b1-copas-7');
    expect(ids).toContain('b2-ouros-K');
    expect(ids).not.toContain('b2-espadas-K');
    expect(ids).not.toContain('b2-paus-A');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/rng-deck.test.ts`
Expected: FAIL. Não resolve `../src/deck` nem `../src/rng`.

- [ ] **Step 3: Implementar**

`packages/engine/src/rng.ts`:
```ts
import type { RngState } from './types';

/** Hash cyrb128: transforma a semente textual em 4 inteiros de 32 bits. */
export function seedRng(seed: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i += 1) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** sfc32: devolve um número em [0, 1) e avança o estado `rng` no lugar. */
export function nextFloat(rng: RngState): number {
  let [a, b, c, d] = rng;
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  rng[0] = a >>> 0;
  rng[1] = b >>> 0;
  rng[2] = c >>> 0;
  rng[3] = d >>> 0;
  return (t >>> 0) / 4294967296;
}

export function nextInt(rng: RngState, max: number): number {
  return Math.floor(nextFloat(rng) * max);
}

/** Fisher–Yates determinístico. Não muta `items`. */
export function shuffle<T>(rng: RngState, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = nextInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

`packages/engine/src/deck.ts`:
```ts
import type { Card, FaceKind, Rank, RulesConfig, Suit } from './types';

const SUITS: readonly Suit[] = ['copas', 'ouros', 'espadas', 'paus'];
const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const FACES: readonly FaceKind[] = ['J', 'Q', 'K', 'A'];

/** As 8 cópias possíveis de uma carta (2 baralhos × 4 naipes), na ordem em que são mantidas. */
function copies(count: number): Array<{ deckNo: number; suit: Suit }> {
  const all = [1, 2].flatMap((deckNo) => SUITS.map((suit) => ({ deckNo, suit })));
  return all.slice(0, count);
}

/** Baralho da spec §1.1: 2 baralhos sem 2 cópias de cada figura, mais 2 Selvagens com `wildJokers`. */
export function buildDeck(config: RulesConfig): Card[] {
  const cards: Card[] = [];
  for (const value of RANKS) {
    for (const { deckNo, suit } of copies(config.deck.numericCopies)) {
      cards.push({ id: `b${deckNo}-${suit}-${value}`, kind: 'NUM', value, suit });
    }
  }
  for (const kind of FACES) {
    for (const { deckNo, suit } of copies(config.deck.faceCopies)) {
      cards.push({ id: `b${deckNo}-${suit}-${kind}`, kind, suit });
    }
  }
  if (config.wildJokers) {
    cards.push({ id: 'selvagem-1', kind: 'WILD' }, { id: 'selvagem-2', kind: 'WILD' });
  }
  return cards;
}

export function totalCards(config: RulesConfig): number {
  return 9 * config.deck.numericCopies + 4 * config.deck.faceCopies + (config.wildJokers ? 2 : 0);
}
```

Acrescente ao fim de `packages/engine/src/index.ts`:
```ts
export { buildDeck, totalCards } from './deck';
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test test/rng-deck.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/rng.ts packages/engine/src/deck.ts packages/engine/src/index.ts packages/engine/test/rng-deck.test.ts
git commit -m "feat(engine): PRNG determinístico e montagem do baralho" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Quadras (Fallen is Back) e Ressurreições

**Files:**
- Create: `packages/engine/src/quads.ts`
- Test: `packages/engine/test/quads.test.ts`

**Interfaces:**
- Consumes: tipos da Tarefa 1.
- Produces: `rowCards(p, row): NumCard[]` (devolve o array vivo da fileira), `quadValues(cards): Rank[]`, `quadBonus(cards): number`, `currentQuads(p): Quad[]`, `reevaluateQuads(s, p, ev): void`, `isResurrectionValid(s, p, r): boolean`, `validResurrections(s, p): Resurrection[]` (devolve os mesmos objetos de `p.resurrections`), `pruneResurrections(s, p): void`.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/quads.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/config';
import {
  currentQuads,
  isResurrectionValid,
  pruneResurrections,
  quadBonus,
  quadValues,
  reevaluateQuads,
} from '../src/quads';
import type { GameEvent, GameState, NumCard, PlayerState, Rank } from '../src/types';

let counter = 0;
const n = (value: Rank): NumCard => ({ id: `n-${value}-${counter++}`, kind: 'NUM', value, suit: 'copas' });
const row = (...vals: Rank[]): NumCard[] => vals.map(n);

function makePlayer(attack: Rank[], defense: Rank[]): PlayerState {
  return {
    id: 'p',
    hp: 100,
    hand: [],
    pending: [],
    equipSubmitted: false,
    submittedDestinations: null,
    attackRow: row(...attack),
    defenseRow: row(...defense),
    attackBuffs: [],
    defenseBuffs: [],
    guard: [],
    reflect: null,
    absoluteDefense: false,
    quads: [],
    resurrections: [],
    damageThisRound: 0,
  };
}

const stateAt = (round: number): GameState => ({ round, config: makeConfig() }) as unknown as GameState;

describe('quadras', () => {
  it('4 ou mais iguais na mesma fileira formam quadra, sem precisar estar seguidas', () => {
    expect(quadValues(row(7, 7, 3, 7, 7))).toEqual([7]);
    expect(quadValues(row(7, 7, 7))).toEqual([]);
    expect(quadValues(row(5, 5, 5, 5, 5))).toEqual([5]);
  });

  it('bônus = valor da carta, uma vez por quadra (exemplo 4 da spec)', () => {
    expect(quadBonus(row(10, 3, 10, 10, 10))).toBe(10);
    expect(quadBonus(row(5, 5, 5, 5, 5))).toBe(5);
  });

  it('currentQuads lista Ataque e Defesa', () => {
    expect(currentQuads(makePlayer([2, 2, 2, 2], [9, 9, 9, 9]))).toEqual([
      { row: 'ATK', value: 2 },
      { row: 'DEF', value: 9 },
    ]);
  });

  it('formar, manter, desfazer e refazer quadra', () => {
    const p = makePlayer([7, 7, 7, 7], []);
    const ev: GameEvent[] = [];
    reevaluateQuads(stateAt(5), p, ev);
    expect(ev).toEqual([{ type: 'QuadFormed', player: 'p', quad: { row: 'ATK', value: 7 } }]);
    expect(p.resurrections).toEqual([{ row: 'ATK', value: 7, formedAtRound: 5 }]);

    const again: GameEvent[] = [];
    reevaluateQuads(stateAt(6), p, again);
    expect(again).toEqual([]);

    p.attackRow.shift();
    const broken: GameEvent[] = [];
    reevaluateQuads(stateAt(6), p, broken);
    expect(broken).toEqual([{ type: 'QuadBroken', player: 'p', quad: { row: 'ATK', value: 7 } }]);
    expect(p.quads).toEqual([]);

    p.attackRow.push(n(7));
    const reformed: GameEvent[] = [];
    reevaluateQuads(stateAt(7), p, reformed);
    expect(reformed).toEqual([{ type: 'QuadFormed', player: 'p', quad: { row: 'ATK', value: 7 } }]);
    expect(p.resurrections).toHaveLength(2);
  });
});

describe('Ressurreição', () => {
  const token = { row: 'ATK' as const, value: 7 as const, formedAtRound: 5 };

  it('vale enquanto a quadra existir', () => {
    const p = makePlayer([7, 7, 7, 7], []);
    p.quads = currentQuads(p);
    expect(isResurrectionValid(stateAt(20), p, token)).toBe(true);
  });

  it('sem a quadra, vale por 3 rodadas após a formação', () => {
    const p = makePlayer([], []);
    expect(isResurrectionValid(stateAt(8), p, token)).toBe(true);
    expect(isResurrectionValid(stateAt(9), p, token)).toBe(false);
  });

  it('pruneResurrections remove as vencidas', () => {
    const p = makePlayer([], []);
    p.resurrections = [token, { row: 'DEF', value: 4, formedAtRound: 8 }];
    pruneResurrections(stateAt(9), p);
    expect(p.resurrections).toEqual([{ row: 'DEF', value: 4, formedAtRound: 8 }]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/quads.test.ts`
Expected: FAIL. Não resolve `../src/quads`.

- [ ] **Step 3: Implementar**

`packages/engine/src/quads.ts`:
```ts
import type { GameEvent, GameState, NumCard, PlayerState, Quad, Rank, Resurrection, RowName } from './types';

export function rowCards(p: PlayerState, row: RowName): NumCard[] {
  return row === 'ATK' ? p.attackRow : p.defenseRow;
}

/** Valores com 4+ cópias na fileira (spec §1.8: não precisam estar seguidas). */
export function quadValues(cards: NumCard[]): Rank[] {
  const counts = new Map<Rank, number>();
  for (const c of cards) counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .map(([value]) => value)
    .sort((a, b) => a - b);
}

/** Bônus de quadra: + valor da carta, uma vez por quadra. */
export function quadBonus(cards: NumCard[]): number {
  return quadValues(cards).reduce((sum, value) => sum + value, 0);
}

export function currentQuads(p: PlayerState): Quad[] {
  return (['ATK', 'DEF'] as const).flatMap((row) => quadValues(rowCards(p, row)).map((value) => ({ row, value })));
}

const quadKey = (q: Quad): string => `${q.row}:${q.value}`;

/** Compara as quadras atuais com as anteriores: emite eventos e concede Ressurreições a quadras novas. */
export function reevaluateQuads(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  const now = currentQuads(p);
  const before = new Set(p.quads.map(quadKey));
  const after = new Set(now.map(quadKey));
  for (const quad of p.quads) {
    if (!after.has(quadKey(quad))) ev.push({ type: 'QuadBroken', player: p.id, quad });
  }
  for (const quad of now) {
    if (!before.has(quadKey(quad))) {
      ev.push({ type: 'QuadFormed', player: p.id, quad });
      p.resurrections.push({ row: quad.row, value: quad.value, formedAtRound: s.round });
    }
  }
  p.quads = now;
}

/** Vale enquanto a quadra existir, com garantia mínima de `resurrectMinRounds` rodadas (spec §1.8). */
export function isResurrectionValid(s: GameState, p: PlayerState, r: Resurrection): boolean {
  const quadPresent = p.quads.some((q) => q.row === r.row && q.value === r.value);
  return quadPresent || s.round <= r.formedAtRound + s.config.resurrectMinRounds;
}

export function validResurrections(s: GameState, p: PlayerState): Resurrection[] {
  return p.resurrections.filter((r) => isResurrectionValid(s, p, r));
}

export function pruneResurrections(s: GameState, p: PlayerState): void {
  p.resurrections = validResurrections(s, p);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test test/quads.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/quads.ts packages/engine/test/quads.test.ts
git commit -m "feat(engine): quadras do Fallen is Back e Ressurreições" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Estado, fluxo de rodadas e `createGame`

**Files:**
- Create: `packages/engine/src/state.ts`, `packages/engine/src/flow.ts`, `packages/engine/src/create-game.ts`
- Create: `packages/engine/test/helpers.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/create-game.test.ts`

**Interfaces:**
- Consumes: `fail` (T1); `seedRng`, `nextFloat`, `shuffle`, `buildDeck` (T2); `pruneResurrections`, `currentQuads` (T3); `validateConfig` (T1).
- Produces (`state.ts`): `getPlayer(s, id): PlayerState` (lança `UNKNOWN_PLAYER`), `opponentOf(s, id): PlayerState`, `removeById<T>(cards, id): T | undefined`, `takeFromHand(p, cardId, kinds): SpecialCard`, `assertDistinct(ids): void`, `toGraveyard(s, cards): void`, `draw(s, ev): Card`, `finishGame(s, result, ev): void`, `isGameOver(s): boolean`.
- Produces (`flow.ts`): `startRound(s, ev)`, `setTurnOrder(s, initiativeFirst: boolean)`, `startTurn(s, index: 0 | 1, ev)`, `openReaction(s, responder, trigger, ev)`, `endTurn(s, ev)`. `endTurn` só é exercitado a partir da Tarefa 7.
- Produces (`create-game.ts`): `createGame(config, seed, players): CreateGameResult`.
- Produces (`test/helpers.ts`): `P1`, `P2`, `setup(spec?: Setup): GameState`, `player(s, id)`, `handId(s, id, kind, nth?)`, `values(cards)`, `allCards(s)`, `type PlayerSetup`, `type Setup`.

- [ ] **Step 1: Escrever os helpers de teste**

`packages/engine/test/helpers.ts`:
```ts
import { makeConfig, type ConfigOverrides } from '../src/config';
import { createGame } from '../src/create-game';
import { currentQuads } from '../src/quads';
import { getPlayer } from '../src/state';
import type {
  Card,
  GameState,
  NumCard,
  Phase,
  PlayerId,
  PlayerState,
  Rank,
  SpecialCard,
  SpecialKind,
} from '../src/types';

export const P1 = 'p1';
export const P2 = 'p2';

export type SpecialSpec = 'J' | 'Q' | 'K' | 'A' | 'W';
export type CardSpec = Rank | SpecialSpec;

export interface PlayerSetup {
  hp?: number;
  hand?: SpecialSpec[];
  pending?: Rank[];
  attack?: Rank[];
  defense?: Rank[];
  attackBuffs?: Array<'J' | 'W'>;
  defenseBuffs?: Array<'Q' | 'W'>;
  guard?: number;
  reflect?: boolean;
  absoluteDefense?: boolean;
  equipSubmitted?: boolean;
}

export interface Setup {
  config?: ConfigOverrides;
  p1?: PlayerSetup;
  p2?: PlayerSetup;
  graveyard?: CardSpec[];
  phase?: Phase;
  round?: number;
  roundKind?: 'EQUIP' | 'ATTACK';
  initiative?: PlayerId;
  turnOrder?: [PlayerId, PlayerId];
  pressure?: number;
  noDamageStreak?: number;
}

function matches(card: Card, spec: CardSpec): boolean {
  if (typeof spec === 'number') return card.kind === 'NUM' && card.value === spec;
  if (spec === 'W') return card.kind === 'WILD';
  return card.kind === spec;
}

/**
 * Monta um cenário a partir de uma partida real: devolve todas as cartas ao monte e
 * retira dele as cartas pedidas. Assim nenhuma carta é inventada e o total se conserva.
 * Padrão: rodada 3 de Ataque, fase principal de P1, ordem [P1, P2], iniciativa de P1.
 */
export function setup(spec: Setup = {}): GameState {
  const created = createGame(makeConfig(spec.config), 'seed-teste', [P1, P2]);
  if (!created.ok) throw new Error(created.error.message);
  const s = created.state;
  for (const p of s.players) {
    s.deck.push(...p.hand, ...p.pending);
    p.hand = [];
    p.pending = [];
  }
  const take = (cs: CardSpec): Card => {
    const index = s.deck.findIndex((c) => matches(c, cs));
    if (index < 0) throw new Error(`carta indisponível no monte: ${String(cs)}`);
    return s.deck.splice(index, 1)[0];
  };
  const takeNum = (v: Rank): NumCard => take(v) as NumCard;
  const takeSpecial = (cs: SpecialSpec): SpecialCard => take(cs) as SpecialCard;

  const entries: Array<[PlayerId, PlayerSetup]> = [
    [P1, spec.p1 ?? {}],
    [P2, spec.p2 ?? {}],
  ];
  for (const [id, ps] of entries) {
    const p = getPlayer(s, id);
    p.hp = ps.hp ?? s.config.hp;
    p.hand = (ps.hand ?? []).map(takeSpecial);
    p.pending = (ps.pending ?? []).map(takeNum);
    p.attackRow = (ps.attack ?? []).map(takeNum);
    p.defenseRow = (ps.defense ?? []).map(takeNum);
    p.attackBuffs = (ps.attackBuffs ?? []).map(takeSpecial);
    p.defenseBuffs = (ps.defenseBuffs ?? []).map(takeSpecial);
    p.guard = Array.from({ length: ps.guard ?? 0 }, () => takeSpecial('K'));
    p.reflect = ps.reflect ? { k: takeSpecial('K'), j: takeSpecial('J'), q: takeSpecial('Q') } : null;
    p.absoluteDefense = ps.absoluteDefense ?? false;
    p.equipSubmitted = ps.equipSubmitted ?? false;
    p.submittedDestinations = null;
    p.quads = currentQuads(p);
    p.resurrections = [];
    p.damageThisRound = 0;
  }
  s.graveyard = (spec.graveyard ?? []).map(take);
  s.round = spec.round ?? 3;
  s.roundKind = spec.roundKind ?? 'ATTACK';
  s.initiative = spec.initiative ?? P1;
  const turnOrder: [PlayerId, PlayerId] = spec.turnOrder ?? [P1, P2];
  s.turnOrder = turnOrder;
  s.phase = spec.phase ?? { kind: 'ATTACK_MAIN', player: turnOrder[0] };
  const phase = s.phase;
  s.turnIndex = phase.kind === 'ATTACK_MAIN' && phase.player === turnOrder[1] ? 1 : 0;
  s.pressure = spec.pressure ?? 0;
  s.noDamageStreak = spec.noDamageStreak ?? 0;
  s.hpLostThisRound = false;
  return s;
}

export function player(s: GameState, id: PlayerId): PlayerState {
  return getPlayer(s, id);
}

export function handId(s: GameState, id: PlayerId, kind: SpecialKind, nth = 0): string {
  const card = getPlayer(s, id).hand.filter((c) => c.kind === kind)[nth];
  if (!card) throw new Error(`sem ${kind} (#${nth}) na mão de ${id}`);
  return card.id;
}

export function values(cards: NumCard[]): number[] {
  return cards.map((c) => c.value);
}

export function allCards(s: GameState): Card[] {
  const cards: Card[] = [...s.deck, ...s.graveyard];
  for (const p of s.players) {
    cards.push(...p.hand, ...p.pending, ...p.attackRow, ...p.defenseRow, ...p.attackBuffs, ...p.defenseBuffs, ...p.guard);
    if (p.reflect) cards.push(p.reflect.k, p.reflect.j, p.reflect.q);
  }
  return cards;
}
```

- [ ] **Step 2: Escrever o teste (falhando)**

`packages/engine/test/create-game.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/config';
import { createGame } from '../src/create-game';
import { totalCards } from '../src/deck';
import { startRound } from '../src/flow';
import { draw } from '../src/state';
import type { GameEvent } from '../src/types';
import { P1, P2, allCards, setup } from './helpers';

describe('createGame', () => {
  it('rejeita config inválida e jogadores repetidos', () => {
    expect(createGame(makeConfig({ hp: 0 }), 's', [P1, P2]).ok).toBe(false);
    const same = createGame(makeConfig(), 's', [P1, P1]);
    expect(same.ok ? null : same.error.code).toBe('INVALID_PLAYERS');
  });

  it('começa na rodada 1 de Equipar com 4 cartas para cada', () => {
    const result = createGame(makeConfig(), 'abc', [P1, P2]);
    if (!result.ok) throw new Error(result.error.message);
    const s = result.state;
    expect(s.round).toBe(1);
    expect(s.roundKind).toBe('EQUIP');
    expect(s.phase).toEqual({ kind: 'EQUIP' });
    for (const p of s.players) {
      expect(p.hp).toBe(100);
      expect(p.hand.length + p.pending.length).toBe(4);
      expect(p.hand.every((c) => c.kind !== 'NUM')).toBe(true);
      expect(p.pending.every((c) => c.kind === 'NUM')).toBe(true);
    }
    expect(s.deck).toHaveLength(98 - 8);
    expect(allCards(s)).toHaveLength(totalCards(s.config));
    expect([P1, P2]).toContain(s.initiative);
  });

  it('é determinístico pela semente', () => {
    expect(createGame(makeConfig(), 'mesma', [P1, P2])).toEqual(createGame(makeConfig(), 'mesma', [P1, P2]));
  });
});

describe('monte', () => {
  it('reembaralha o cemitério quando o monte acaba', () => {
    const s = setup();
    s.graveyard = s.deck.splice(0);
    const before = s.graveyard.length;
    const ev: GameEvent[] = [];
    draw(s, ev);
    expect(ev).toEqual([{ type: 'DeckReshuffled', count: before }]);
    expect(s.graveyard).toHaveLength(0);
    expect(s.deck).toHaveLength(before - 1);
  });

  it('continua a distribuição quando o monte acaba no meio (review focus 4)', () => {
    const s = setup({ round: 3, roundKind: 'ATTACK' });
    s.graveyard = s.deck.splice(3);
    const ev: GameEvent[] = [];
    startRound(s, ev);
    expect(s.round).toBe(4);
    expect(s.phase).toEqual({ kind: 'EQUIP' });
    expect(ev.filter((e) => e.type === 'DeckReshuffled')).toHaveLength(1);
    expect(s.players.reduce((total, p) => total + p.hand.length + p.pending.length, 0)).toBe(8);
    expect(allCards(s)).toHaveLength(totalCards(s.config));
    expect(new Set(allCards(s).map((c) => c.id)).size).toBe(totalCards(s.config));
  });
});

describe('início da rodada de Ataque', () => {
  it('com Escolha da iniciativa, espera a escolha de quem tem a iniciativa', () => {
    const s = setup({ round: 2, roundKind: 'EQUIP', initiative: P2 });
    startRound(s, []);
    expect(s.roundKind).toBe('ATTACK');
    expect(s.phase).toEqual({ kind: 'ORDER_CHOICE', player: P2 });
  });

  it('sem a regra, quem tem a iniciativa ataca primeiro', () => {
    const s = setup({ round: 2, roundKind: 'EQUIP', initiative: P2, config: { initiativeChoice: false } });
    startRound(s, []);
    expect(s.turnOrder).toEqual([P2, P1]);
    expect(s.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });

  it('fixa a pressão pela sequência de rodadas sem dano', () => {
    const s = setup({ round: 4, roundKind: 'EQUIP', noDamageStreak: 2 });
    const ev: GameEvent[] = [];
    startRound(s, ev);
    expect(s.pressure).toBe(2);
    expect(ev).toContainEqual({ type: 'PressureChanged', pressure: 2 });
  });

  it('sem Pressão da mesa a pressão fica em 0', () => {
    const s = setup({ round: 4, roundKind: 'EQUIP', noDamageStreak: 2, config: { tablePressure: false } });
    startRound(s, []);
    expect(s.pressure).toBe(0);
  });

  it('segue o ciclo Equipar → Equipar → Ataque → Equipar', () => {
    const s = setup({ round: 0, roundKind: 'EQUIP' });
    const kinds: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      startRound(s, []);
      kinds.push(s.roundKind);
    }
    expect(kinds).toEqual(['EQUIP', 'EQUIP', 'ATTACK', 'EQUIP']);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/create-game.test.ts`
Expected: FAIL. Não resolve `../src/create-game`.

- [ ] **Step 4: Implementar `state.ts`**

`packages/engine/src/state.ts`:
```ts
import { fail } from './errors';
import { shuffle } from './rng';
import type {
  Card,
  GameEvent,
  GameResult,
  GameState,
  PlayerId,
  PlayerState,
  SpecialCard,
  SpecialKind,
} from './types';

export function getPlayer(s: GameState, id: PlayerId): PlayerState {
  const found = s.players.find((p) => p.id === id);
  if (!found) fail('UNKNOWN_PLAYER', `jogador desconhecido: ${id}`);
  return found;
}

export function opponentOf(s: GameState, id: PlayerId): PlayerState {
  return s.players[0].id === id ? s.players[1] : s.players[0];
}

export function removeById<T extends { id: string }>(cards: T[], id: string): T | undefined {
  const index = cards.findIndex((c) => c.id === id);
  return index < 0 ? undefined : cards.splice(index, 1)[0];
}

/** Tira uma carta da mão conferindo o tipo. Só usar dentro de `applyAction` (rascunho clonado). */
export function takeFromHand(p: PlayerState, cardId: string, kinds: readonly SpecialKind[]): SpecialCard {
  const card = removeById(p.hand, cardId);
  if (!card) fail('CARD_NOT_IN_HAND', `a carta ${cardId} não está na sua mão`);
  if (!kinds.includes(card.kind)) fail('INVALID_CARD', `a carta ${cardId} não serve para esta jogada`);
  return card;
}

export function assertDistinct(ids: string[]): void {
  if (new Set(ids).size !== ids.length) fail('DUPLICATE_CARDS', 'a mesma carta foi indicada mais de uma vez');
}

export function toGraveyard(s: GameState, cards: Card[]): void {
  s.graveyard.push(...cards);
}

/** Compra do topo; com o monte vazio, o cemitério inteiro é embaralhado e vira o novo monte (spec §1.4). */
export function draw(s: GameState, ev: GameEvent[]): Card {
  if (s.deck.length === 0) {
    if (s.graveyard.length === 0) throw new Error('invariante violada: monte e cemitério vazios');
    s.deck = shuffle(s.rng, s.graveyard);
    s.graveyard = [];
    ev.push({ type: 'DeckReshuffled', count: s.deck.length });
  }
  return s.deck.shift() as Card;
}

export function finishGame(s: GameState, result: GameResult, ev: GameEvent[]): void {
  s.phase = { kind: 'GAME_OVER', result };
  ev.push({ type: 'GameOver', result });
}

/** Use esta função depois de chamadas que mudam `s.phase`: o TS não desfaz o estreitamento de `s.phase.kind`. */
export function isGameOver(s: GameState): boolean {
  return s.phase.kind === 'GAME_OVER';
}
```

- [ ] **Step 5: Implementar `flow.ts`**

`packages/engine/src/flow.ts`:
```ts
import { pruneResurrections } from './quads';
import { draw, finishGame, getPlayer, opponentOf, toGraveyard } from './state';
import type { Card, GameEvent, GameResult, GameState, PlayerId, PlayerState, ReactionTrigger } from './types';

/** Ciclo da spec §1.3: Equipar, Equipar, Ataque, Equipar, Ataque, … */
export function startRound(s: GameState, ev: GameEvent[]): void {
  const kind = s.round <= 1 ? 'EQUIP' : s.roundKind === 'EQUIP' ? 'ATTACK' : 'EQUIP';
  s.round += 1;
  s.roundKind = kind;
  ev.push({ type: 'RoundStarted', round: s.round, kind });
  for (const p of s.players) pruneResurrections(s, p);
  if (kind === 'EQUIP') startEquipRound(s, ev);
  else startAttackRound(s, ev);
}

/** Distribui `cardsPerEquip` cartas, uma a uma, alternando a partir de quem tem a iniciativa (spec §1.4). */
function startEquipRound(s: GameState, ev: GameEvent[]): void {
  const order: PlayerState[] = [getPlayer(s, s.initiative), opponentOf(s, s.initiative)];
  const dealt: Card[][] = [[], []];
  for (const p of s.players) {
    p.equipSubmitted = false;
    p.submittedDestinations = null;
  }
  for (let i = 0; i < s.config.cardsPerEquip; i += 1) {
    for (let idx = 0; idx < order.length; idx += 1) dealt[idx].push(draw(s, ev));
  }
  order.forEach((p, idx) => {
    for (const card of dealt[idx]) {
      if (card.kind === 'NUM') p.pending.push(card);
      else p.hand.push(card);
    }
    ev.push({ type: 'CardsDealt', player: p.id, count: dealt[idx].length, cards: dealt[idx] });
  });
  s.phase = { kind: 'EQUIP' };
}

function startAttackRound(s: GameState, ev: GameEvent[]): void {
  const pressure = s.config.tablePressure ? s.noDamageStreak : 0;
  if (pressure !== s.pressure) ev.push({ type: 'PressureChanged', pressure });
  s.pressure = pressure;
  s.hpLostThisRound = false;
  for (const p of s.players) p.damageThisRound = 0;
  if (s.config.initiativeChoice) {
    s.phase = { kind: 'ORDER_CHOICE', player: s.initiative };
  } else {
    setTurnOrder(s, true);
    startTurn(s, 0, ev);
  }
}

export function setTurnOrder(s: GameState, initiativeFirst: boolean): void {
  const other = opponentOf(s, s.initiative).id;
  s.turnOrder = initiativeFirst ? [s.initiative, other] : [other, s.initiative];
}

export function startTurn(s: GameState, index: 0 | 1, ev: GameEvent[]): void {
  s.turnIndex = index;
  const current = s.turnOrder[index];
  s.phase = { kind: 'ATTACK_MAIN', player: current };
  ev.push({ type: 'TurnStarted', player: current });
}

export function openReaction(s: GameState, responder: PlayerId, trigger: ReactionTrigger, ev: GameEvent[]): void {
  s.phase = { kind: 'REACTION', responder, trigger };
  ev.push({ type: 'ReactionWindowOpened', responder, trigger });
}

/** Fim de um turno de ataque: expira os efeitos do OUTRO jogador (spec §1.5 item 4) e avança. */
export function endTurn(s: GameState, ev: GameEvent[]): void {
  const current = s.turnOrder[s.turnIndex];
  expireEffects(s, opponentOf(s, current), ev);
  if (s.turnIndex === 0) startTurn(s, 1, ev);
  else endAttackRound(s, ev);
}

function expireEffects(s: GameState, owner: PlayerState, ev: GameEvent[]): void {
  if (owner.reflect) {
    toGraveyard(s, [owner.reflect.k, owner.reflect.j, owner.reflect.q]);
    owner.reflect = null;
    ev.push({ type: 'ReflectExpired', owner: owner.id });
  }
  if (owner.absoluteDefense) {
    owner.absoluteDefense = false;
    const consumed = owner.defenseBuffs.splice(0, 1);
    toGraveyard(s, consumed);
    ev.push({ type: 'AbsoluteDefenseEnded', player: owner.id });
    if (consumed.length > 0) ev.push({ type: 'BuffRemoved', player: owner.id, cards: consumed });
  }
}

/** Iniciativa (spec §1.10), sequência sem dano e anti-travamento (spec §1.11). */
function endAttackRound(s: GameState, ev: GameEvent[]): void {
  const [a, b] = s.players;
  const leader = a.damageThisRound > b.damageThisRound ? a : b.damageThisRound > a.damageThisRound ? b : null;
  if (leader && leader.id !== s.initiative) {
    s.initiative = leader.id;
    ev.push({ type: 'InitiativeChanged', player: leader.id });
  }
  s.noDamageStreak = s.hpLostThisRound ? 0 : s.noDamageStreak + 1;
  if (s.noDamageStreak >= s.config.antiStallRounds) {
    const result: GameResult =
      a.hp === b.hp
        ? { kind: 'DRAW', reason: 'ANTI_STALL' }
        : { kind: 'WIN', winner: a.hp > b.hp ? a.id : b.id, reason: 'ANTI_STALL' };
    finishGame(s, result, ev);
    return;
  }
  startRound(s, ev);
}
```

- [ ] **Step 6: Implementar `create-game.ts` e exportar**

`packages/engine/src/create-game.ts`:
```ts
import { validateConfig } from './config';
import { buildDeck } from './deck';
import { startRound } from './flow';
import { nextFloat, seedRng, shuffle } from './rng';
import type { CreateGameResult, GameState, PlayerId, PlayerState, RulesConfig } from './types';

function newPlayer(id: PlayerId, hp: number): PlayerState {
  return {
    id,
    hp,
    hand: [],
    pending: [],
    equipSubmitted: false,
    submittedDestinations: null,
    attackRow: [],
    defenseRow: [],
    attackBuffs: [],
    defenseBuffs: [],
    guard: [],
    reflect: null,
    absoluteDefense: false,
    quads: [],
    resurrections: [],
    damageThisRound: 0,
  };
}

/** Cria a partida já na rodada 1 de Equipar, com as cartas distribuídas. A semente nunca sai do servidor. */
export function createGame(config: RulesConfig, seed: string, players: [PlayerId, PlayerId]): CreateGameResult {
  const configError = validateConfig(config);
  if (configError) return { ok: false, error: configError };
  const [a, b] = players;
  if (!a || !b || a === b) {
    return { ok: false, error: { code: 'INVALID_PLAYERS', message: 'são necessários dois jogadores com ids diferentes' } };
  }
  const rng = seedRng(seed);
  const deck = shuffle(rng, buildDeck(config));
  const initiative = nextFloat(rng) < 0.5 ? a : b;
  const state: GameState = {
    config: structuredClone(config),
    rng,
    players: [newPlayer(a, config.hp), newPlayer(b, config.hp)],
    deck,
    graveyard: [],
    round: 0,
    roundKind: 'EQUIP',
    initiative,
    turnOrder: [a, b],
    turnIndex: 0,
    pressure: 0,
    noDamageStreak: 0,
    hpLostThisRound: false,
    phase: { kind: 'EQUIP' },
  };
  startRound(state, []);
  return { ok: true, state };
}
```

Acrescente ao fim de `packages/engine/src/index.ts`:
```ts
export { createGame } from './create-game';
```

- [ ] **Step 7: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test test/create-game.test.ts`
Expected: PASS (10 testes).

Run: `pnpm check`
Expected: tudo passa.

- [ ] **Step 8: Commit**

```bash
git add packages/engine/src/state.ts packages/engine/src/flow.ts packages/engine/src/create-game.ts packages/engine/src/index.ts packages/engine/test/helpers.ts packages/engine/test/create-game.test.ts
git commit -m "feat(engine): estado, fluxo de rodadas e createGame" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `applyAction`, Equipar e Escolha da iniciativa

**Files:**
- Create: `packages/engine/src/actions/equip.ts`, `packages/engine/src/actions/order.ts`, `packages/engine/src/apply-action.ts`
- Modify: `packages/engine/test/helpers.ts` (acrescentar `act`, `actErr`, `steps`), `packages/engine/src/index.ts`
- Test: `packages/engine/test/equip-order.test.ts`

**Interfaces:**
- Consumes: `state.ts`, `flow.ts`, `quads.ts` (T3, T4).
- Produces: `applyAction(state, player: PlayerId | 'system', action): ActionResult`; `validateDestinations(config, p, destinations)`, `autoDestinations(config, p): Destination[]`, `handleEquip(s, playerId, destinations, ev)`, `timeoutEquip(s, ev)`; `chooseOrder(s, first, ev)`, `handleChooseOrder(s, playerId, first, ev)`. Nos helpers: `act(s, who, action): { state; events }` (lança se der erro), `actErr(s, who, action): RuleErrorCode` (lança se der certo), `steps(s, list)`.

- [ ] **Step 1: Acrescentar os helpers de ação**

Acrescente ao início de `packages/engine/test/helpers.ts`, junto dos outros imports:
```ts
import { applyAction } from '../src/apply-action';
import type { Action, GameEvent, RuleErrorCode } from '../src/types';
```

Acrescente ao fim de `packages/engine/test/helpers.ts`:
```ts
export function act(s: GameState, who: PlayerId | 'system', action: Action): { state: GameState; events: GameEvent[] } {
  const result = applyAction(s, who, action);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return { state: result.state, events: result.events };
}

export function actErr(s: GameState, who: PlayerId | 'system', action: Action): RuleErrorCode {
  const result = applyAction(s, who, action);
  if (result.ok) throw new Error(`esperava erro em ${JSON.stringify(action)}`);
  return result.error.code;
}

export function steps(
  s: GameState,
  list: Array<[PlayerId | 'system', Action]>,
): { state: GameState; events: GameEvent[] } {
  let state = s;
  const events: GameEvent[] = [];
  for (const [who, action] of list) {
    const result = act(state, who, action);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}
```

- [ ] **Step 2: Escrever o teste (falhando)**

`packages/engine/test/equip-order.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Action, Destination } from '../src/types';
import { P1, P2, act, actErr, player, setup, steps, values, type PlayerSetup } from './helpers';

const equipSetup = (p1: PlayerSetup, p2: PlayerSetup, round = 1) =>
  setup({ round, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1, p2 });

describe('Equipar', () => {
  it('guarda a escolha em segredo e revela quando os dois confirmam', () => {
    const s = equipSetup({ pending: [3, 7, 9] }, { pending: [5] });
    const a = act(s, P1, { type: 'EQUIP', destinations: ['ATK', 'DEF', 'ATK'] });
    expect(a.events).toEqual([{ type: 'EquipSubmitted', player: P1 }]);
    expect(player(a.state, P1).attackRow).toHaveLength(0);

    const b = act(a.state, P2, { type: 'EQUIP', destinations: ['DEF'] });
    expect(values(player(b.state, P1).attackRow)).toEqual([3, 9]);
    expect(values(player(b.state, P1).defenseRow)).toEqual([7]);
    expect(values(player(b.state, P2).defenseRow)).toEqual([5]);
    expect(b.events.filter((e) => e.type === 'CardsPlaced')).toHaveLength(2);
    expect(b.state.round).toBe(2);
    expect(b.state.phase).toEqual({ kind: 'EQUIP' });
  });

  it('rejeita destinos inválidos e confirmação repetida', () => {
    const s = equipSetup({ pending: [3, 4] }, {});
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK'] })).toBe('INVALID_DESTINATIONS');
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK', 'DISCARD'] })).toBe('INVALID_DESTINATIONS');
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK', 'XYZ' as Destination] })).toBe('INVALID_DESTINATIONS');
    const a = act(s, P1, { type: 'EQUIP', destinations: ['ATK', 'ATK'] });
    expect(actErr(a.state, P1, { type: 'EQUIP', destinations: ['ATK', 'ATK'] })).toBe('ALREADY_SUBMITTED');
  });

  it('com uma fileira cheia, só aceita a outra', () => {
    const s = equipSetup({ attack: [2, 2, 3, 3, 4, 4, 5], pending: [6] }, {});
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK'] })).toBe('INVALID_DESTINATIONS');
    act(s, P1, { type: 'EQUIP', destinations: ['DEF'] });
  });

  it('com as duas cheias, substitui a última carta ou descarta a nova', () => {
    const s = equipSetup(
      { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 9], pending: [10, 10] },
      {},
    );
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: ['REPLACE_LAST_ATK', 'DISCARD'] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    expect(values(player(r.state, P1).attackRow)).toEqual([2, 2, 3, 3, 4, 4, 10]);
    const grave = r.state.graveyard.map((c) => (c.kind === 'NUM' ? c.value : c.kind));
    expect(grave).toContain(5);
    expect(grave).toContain(10);
  });

  it('TIMEOUT completa quem não confirmou: fileira com menos cartas, empate → Defesa', () => {
    const s = equipSetup({ pending: [3] }, { attack: [2], pending: [3, 4, 5] });
    const a = act(s, P1, { type: 'EQUIP', destinations: ['ATK'] });
    const b = act(a.state, 'system', { type: 'TIMEOUT' });
    expect(values(player(b.state, P2).defenseRow)).toEqual([3, 4]);
    expect(values(player(b.state, P2).attackRow)).toEqual([2, 5]);
  });

  it('avalia quadras na revelação', () => {
    const s = equipSetup({ attack: [7, 7, 7], pending: [7] }, {});
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: ['ATK'] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    expect(r.events).toContainEqual({ type: 'QuadFormed', player: P1, quad: { row: 'ATK', value: 7 } });
    expect(player(r.state, P1).resurrections).toEqual([{ row: 'ATK', value: 7, formedAtRound: 1 }]);
  });

  it('a 2ª rodada de Equipar leva à rodada de Ataque', () => {
    const s = equipSetup({}, {}, 2);
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: [] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    expect(r.state.round).toBe(3);
    expect(r.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
  });
});

describe('Escolha da iniciativa', () => {
  const orderSetup = () => setup({ phase: { kind: 'ORDER_CHOICE', player: P1 }, initiative: P1 });

  it('quem tem a iniciativa pode atacar em segundo', () => {
    const r = act(orderSetup(), P1, { type: 'CHOOSE_ORDER', first: false });
    expect(r.state.turnOrder).toEqual([P2, P1]);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
    expect(r.events).toContainEqual({ type: 'OrderChosen', player: P1, first: false, turnOrder: [P2, P1] });
  });

  it('só quem tem a iniciativa escolhe, e só nessa fase', () => {
    expect(actErr(orderSetup(), P2, { type: 'CHOOSE_ORDER', first: true })).toBe('NOT_YOUR_TURN');
    expect(actErr(setup(), P1, { type: 'CHOOSE_ORDER', first: true })).toBe('WRONG_PHASE');
  });

  it('TIMEOUT escolhe atacar primeiro', () => {
    const r = act(orderSetup(), 'system', { type: 'TIMEOUT' });
    expect(r.state.turnOrder).toEqual([P1, P2]);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });
});

describe('entradas inválidas (review focus 1, 2 e 5)', () => {
  it('não muta o estado de entrada, nem em erro nem em sucesso', () => {
    const s = setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3] } });
    const snapshot = structuredClone(s);
    actErr(s, P1, { type: 'EQUIP', destinations: [] });
    act(s, P1, { type: 'EQUIP', destinations: ['ATK'] });
    expect(s).toEqual(snapshot);
  });

  it('rejeita jogador desconhecido, ação de sistema vinda de jogador e ação desconhecida', () => {
    const s = setup();
    expect(actErr(s, 'p3', { type: 'END_TURN' })).toBe('UNKNOWN_PLAYER');
    expect(actErr(s, P1, { type: 'TIMEOUT' })).toBe('SYSTEM_ONLY');
    expect(actErr(s, 'system', { type: 'END_TURN' })).toBe('PLAYER_ONLY');
    expect(actErr(s, P1, { type: 'HACK' } as unknown as Action)).toBe('INVALID_ACTION');
  });

  it('FORFEIT encerra a partida e nada mais é aceito', () => {
    const r = act(setup(), 'system', { type: 'FORFEIT', loser: P1 });
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P2, reason: 'FORFEIT' } });
    expect(actErr(r.state, P2, { type: 'END_TURN' })).toBe('GAME_OVER');
    expect(actErr(r.state, 'system', { type: 'TIMEOUT' })).toBe('GAME_OVER');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/equip-order.test.ts`
Expected: FAIL. Não resolve `../src/apply-action`.

- [ ] **Step 4: Implementar Equipar**

`packages/engine/src/actions/equip.ts`:
```ts
import { fail } from '../errors';
import { startRound } from '../flow';
import { reevaluateQuads } from '../quads';
import { getPlayer, toGraveyard } from '../state';
import type { Destination, GameEvent, GameState, NumCard, Placement, PlayerId, PlayerState, RulesConfig } from '../types';

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
export function autoDestinations(config: RulesConfig, p: PlayerState): Destination[] {
  let atk = p.attackRow.length;
  let def = p.defenseRow.length;
  const limit = config.rowLimit;
  return p.pending.map((): Destination => {
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
    if (!p.equipSubmitted) submit(p, autoDestinations(s.config, p), ev);
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
```

- [ ] **Step 5: Implementar a Escolha da iniciativa**

`packages/engine/src/actions/order.ts`:
```ts
import { fail } from '../errors';
import { setTurnOrder, startTurn } from '../flow';
import type { GameEvent, GameState, PlayerId } from '../types';

export function chooseOrder(s: GameState, first: boolean, ev: GameEvent[]): void {
  setTurnOrder(s, first);
  ev.push({ type: 'OrderChosen', player: s.initiative, first, turnOrder: [...s.turnOrder] });
  startTurn(s, 0, ev);
}

export function handleChooseOrder(s: GameState, playerId: PlayerId, first: boolean, ev: GameEvent[]): void {
  const phase = s.phase;
  if (phase.kind !== 'ORDER_CHOICE') fail('WRONG_PHASE', 'não há escolha de ordem pendente');
  if (phase.player !== playerId) fail('NOT_YOUR_TURN', 'só quem tem a iniciativa escolhe a ordem');
  chooseOrder(s, first === true, ev);
}
```

- [ ] **Step 6: Implementar `applyAction` (versão inicial)**

`packages/engine/src/apply-action.ts`:
```ts
import { handleEquip, timeoutEquip } from './actions/equip';
import { chooseOrder, handleChooseOrder } from './actions/order';
import { fail, RuleViolation } from './errors';
import { finishGame, getPlayer, opponentOf } from './state';
import type { Action, ActionResult, GameEvent, GameState, PlayerId } from './types';

/** Ponto único de entrada. Nunca muta `state`; erros de regra viram `{ ok: false }`. */
export function applyAction(state: GameState, player: PlayerId | 'system', action: Action): ActionResult {
  if (state.phase.kind === 'GAME_OVER') {
    return { ok: false, error: { code: 'GAME_OVER', message: 'a partida já terminou' } };
  }
  const s = structuredClone(state);
  const ev: GameEvent[] = [];
  try {
    if (player === 'system') {
      applySystem(s, action, ev);
    } else {
      getPlayer(s, player);
      applyPlayer(s, player, action, ev);
    }
  } catch (e) {
    if (e instanceof RuleViolation) return { ok: false, error: { code: e.code, message: e.message } };
    throw e;
  }
  return { ok: true, state: s, events: ev };
}

function applySystem(s: GameState, action: Action, ev: GameEvent[]): void {
  if (action.type === 'FORFEIT') {
    const loser = getPlayer(s, action.loser);
    finishGame(s, { kind: 'WIN', winner: opponentOf(s, loser.id).id, reason: 'FORFEIT' }, ev);
    return;
  }
  if (action.type !== 'TIMEOUT') fail('PLAYER_ONLY', 'o sistema só envia TIMEOUT ou FORFEIT');
  const phase = s.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return timeoutEquip(s, ev);
    case 'ORDER_CHOICE':
      return chooseOrder(s, true, ev);
    case 'ATTACK_MAIN':
    case 'REACTION':
    case 'GAME_OVER':
      return fail('WRONG_PHASE', 'TIMEOUT desta fase entra na Tarefa 7');
  }
}

function applyPlayer(s: GameState, player: PlayerId, action: Action, ev: GameEvent[]): void {
  switch (action.type) {
    case 'EQUIP':
      return handleEquip(s, player, action.destinations, ev);
    case 'CHOOSE_ORDER':
      return handleChooseOrder(s, player, action.first, ev);
    case 'TIMEOUT':
    case 'FORFEIT':
      return fail('SYSTEM_ONLY', 'apenas o sistema envia esta ação');
    default:
      return fail('INVALID_ACTION', `ação desconhecida: ${String((action as { type?: unknown }).type)}`);
  }
}
```

Acrescente ao fim de `packages/engine/src/index.ts`:
```ts
export { applyAction } from './apply-action';
```

- [ ] **Step 7: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test test/equip-order.test.ts`
Expected: PASS (13 testes).

Run: `pnpm check`
Expected: tudo passa.

- [ ] **Step 8: Commit**

```bash
git add packages/engine/src/actions packages/engine/src/apply-action.ts packages/engine/src/index.ts packages/engine/test/helpers.ts packages/engine/test/equip-order.test.ts
git commit -m "feat(engine): applyAction, Equipar simultâneo e Escolha da iniciativa" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Resolução de um ataque (spec §1.9)

**Files:**
- Create: `packages/engine/src/combat.ts`
- Test: `packages/engine/test/combat.test.ts`

**Interfaces:**
- Consumes: `quadBonus`, `reevaluateQuads` (T3); `finishGame`, `getPlayer`, `isGameOver`, `opponentOf`, `toGraveyard` (T4).
- Produces: `attackBase(p)`, `defenseBase(p)`, `attackValue(s, p)`, `defenseValue(p)`, `isAbsoluteAttack(s, p)`, `resolveAttack(s, attackerId, ev): void`. `resolveAttack` não mexe na fase, exceto ao encerrar a partida via `finishGame`.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/combat.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { attackValue, defenseValue, resolveAttack } from '../src/combat';
import type { GameEvent, GameState } from '../src/types';
import { P1, P2, player, setup, values } from './helpers';

function attackP1(s: GameState): GameEvent[] {
  const ev: GameEvent[] = [];
  resolveAttack(s, P1, ev);
  return ev;
}

const graveSummary = (s: GameState) => s.graveyard.map((c) => (c.kind === 'NUM' ? c.value : c.kind));

describe('valores de ATK e DEF', () => {
  it('Q multiplica a defesa de forma linear', () => {
    const s = setup({ p2: { defense: [5, 5], defenseBuffs: ['Q', 'Q'] } });
    expect(defenseValue(player(s, P2))).toBe(30);
  });

  it('Pressão da mesa soma ao multiplicador de ataque (exemplo 6)', () => {
    const s = setup({ pressure: 2, p1: { attack: [4, 6], attackBuffs: ['J'] } });
    expect(attackValue(s, player(s, P1))).toBe(40);
  });

  it('quadra soma o valor da carta antes do multiplicador (exemplo 4)', () => {
    const s = setup({ p1: { attack: [5, 5, 5, 5] }, p2: { defense: [10, 3, 10, 10, 10], defenseBuffs: ['Q'] } });
    expect(defenseValue(player(s, P2))).toBe(106);
    expect(attackValue(s, player(s, P1))).toBe(25);
  });
});

describe('resolveAttack', () => {
  it('dano simples e remoção das primeiras cartas (exemplo 1)', () => {
    const s = setup({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8] } });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'DamageDealt', attacker: P1, defender: P2, attack: 38, defense: 13, damage: 25 });
    expect(player(s, P2).hp).toBe(75);
    expect(values(player(s, P1).attackRow)).toEqual([7, 9]);
    expect(values(player(s, P2).defenseRow)).toEqual([8]);
    expect(graveSummary(s)).toEqual([3, 5]);
    expect(player(s, P1).damageThisRound).toBe(25);
    expect(s.hpLostThisRound).toBe(true);
  });

  it('defesa maior que o ataque: dano 0, mas as cartas saem', () => {
    const s = setup({ p1: { attack: [4] }, p2: { defense: [9] } });
    attackP1(s);
    expect(player(s, P2).hp).toBe(100);
    expect(player(s, P1).attackRow).toHaveLength(0);
    expect(player(s, P2).defenseRow).toHaveLength(0);
    expect(s.hpLostThisRound).toBe(false);
  });

  it('K absorve todo o dano de um ataque e quebra (exemplo 2)', () => {
    const s = setup({ p1: { attack: [10, 10, 10] }, p2: { defense: [10, 10], guard: 2 } });
    const ev = attackP1(s);
    expect(player(s, P2).hp).toBe(100);
    expect(player(s, P2).guard).toHaveLength(1);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'GuardBroken', player: P2 }));
    expect(ev).toContainEqual(expect.objectContaining({ type: 'DamageDealt', damage: 0 }));
    expect(graveSummary(s)).toEqual(['K', 10, 10]);
    expect(s.hpLostThisRound).toBe(false);
  });

  it('com a Defesa vazia o dano entra cheio e nada sai dela', () => {
    const s = setup({ p1: { attack: [6] } });
    const ev = attackP1(s);
    expect(player(s, P2).hp).toBe(94);
    expect(ev.filter((e) => e.type === 'CardsRemovedFromRow')).toHaveLength(1);
  });

  it('Ataque Absoluto quebra todos os K e consome 1 J', () => {
    const s = setup({ p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'] }, p2: { defense: [8, 9], guard: 2 } });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'AbsoluteAttack', player: P1 });
    expect(ev).toContainEqual(expect.objectContaining({ type: 'DamageDealt', attack: 90, defense: 17, damage: 73 }));
    expect(player(s, P2).hp).toBe(27);
    expect(player(s, P2).guard).toHaveLength(0);
    expect(player(s, P1).attackBuffs).toHaveLength(3);
  });

  it('Defesa Absoluta zera o dano e protege a fileira de Defesa', () => {
    const s = setup({
      p1: { attack: [10, 10] },
      p2: { defense: [2], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true },
    });
    attackP1(s);
    expect(player(s, P2).hp).toBe(100);
    expect(values(player(s, P2).defenseRow)).toEqual([2]);
    expect(values(player(s, P1).attackRow)).toEqual([10]);
  });

  it('Absoluto contra Absoluto: conta normal (exemplo 5)', () => {
    const s = setup({
      p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'] },
      p2: { defense: [8, 9], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true, guard: 1 },
    });
    attackP1(s);
    expect(player(s, P2).hp).toBe(95);
    expect(player(s, P2).guard).toHaveLength(0);
    expect(values(player(s, P2).defenseRow)).toEqual([8, 9]);
    expect(values(player(s, P1).attackRow)).toEqual([6, 7]);
    expect(player(s, P1).attackBuffs).toHaveLength(3);
  });

  it('Reflect: quebra K e Q do atacante e devolve o dano (exemplo 3)', () => {
    const s = setup({
      p1: { attack: [6, 8, 9], attackBuffs: ['J'], defense: [4, 10], defenseBuffs: ['Q'], guard: 2 },
      p2: { reflect: true, defense: [2, 3] },
    });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'ReflectTriggered', owner: P2, attacker: P1, damage: 39 });
    expect(player(s, P1).hp).toBe(61);
    expect(player(s, P1).guard).toHaveLength(0);
    expect(player(s, P1).defenseBuffs).toHaveLength(0);
    expect(values(player(s, P1).defenseRow)).toEqual([4, 10]);
    expect(player(s, P2).hp).toBe(100);
    expect(player(s, P2).reflect).toBeNull();
    expect(values(player(s, P1).attackRow)).toEqual([8, 9]);
    expect(values(player(s, P2).defenseRow)).toEqual([3]);
    expect(player(s, P2).damageThisRound).toBe(39);
  });

  it('Reflect contra atacante sob Defesa Absoluta: K quebram, dano 0, Q intactos', () => {
    const s = setup({
      p1: { attack: [10], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true, guard: 1 },
      p2: { reflect: true },
    });
    const ev = attackP1(s);
    expect(player(s, P1).hp).toBe(100);
    expect(player(s, P1).guard).toHaveLength(0);
    expect(player(s, P1).defenseBuffs).toHaveLength(4);
    expect(ev).toContainEqual({ type: 'ReflectTriggered', owner: P2, attacker: P1, damage: 0 });
  });

  it('Reflect intercepta o Ataque Absoluto: o ×5 volta e os K do dono ficam', () => {
    const s = setup({
      p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'] },
      p2: { reflect: true, guard: 1 },
    });
    attackP1(s);
    expect(player(s, P1).hp).toBe(10);
    expect(player(s, P2).guard).toHaveLength(1);
    expect(player(s, P1).attackBuffs).toHaveLength(3);
  });

  it('dano letal encerra a partida na hora', () => {
    const s = setup({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { hp: 10, defense: [5, 8] } });
    const ev = attackP1(s);
    expect(s.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'HP' } });
    expect(ev).toContainEqual({ type: 'GameOver', result: { kind: 'WIN', winner: P1, reason: 'HP' } });
    expect(values(player(s, P1).attackRow)).toEqual([3, 7, 9]);
  });

  it('dano refletido letal também encerra a partida', () => {
    const s = setup({ p1: { hp: 5, attack: [10] }, p2: { reflect: true } });
    attackP1(s);
    expect(s.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P2, reason: 'HP' } });
  });

  it('reavalia as quadras após a remoção', () => {
    const s = setup({ p1: { attack: [2] }, p2: { defense: [5, 5, 5, 5, 9] } });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'QuadBroken', player: P2, quad: { row: 'DEF', value: 5 } });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/combat.test.ts`
Expected: FAIL. Não resolve `../src/combat`.

- [ ] **Step 3: Implementar**

`packages/engine/src/combat.ts`:
```ts
import { quadBonus, reevaluateQuads } from './quads';
import { finishGame, getPlayer, isGameOver, opponentOf, toGraveyard } from './state';
import type { GameEvent, GameState, NumCard, PlayerId, PlayerState } from './types';

const sum = (cards: NumCard[]): number => cards.reduce((total, c) => total + c.value, 0);

export function attackBase(p: PlayerState): number {
  return sum(p.attackRow) + quadBonus(p.attackRow);
}

export function defenseBase(p: PlayerState): number {
  return sum(p.defenseRow) + quadBonus(p.defenseRow);
}

/** ATK = (soma + bônus) × (1 + nJ + pressão) — spec §1.9. */
export function attackValue(s: GameState, p: PlayerState): number {
  return attackBase(p) * (1 + p.attackBuffs.length + s.pressure);
}

/** DEF = (soma + bônus) × (1 + nQ). */
export function defenseValue(p: PlayerState): number {
  return defenseBase(p) * (1 + p.defenseBuffs.length);
}

export function isAbsoluteAttack(s: GameState, p: PlayerState): boolean {
  return p.attackBuffs.length >= s.config.buffLimit;
}

function loseHp(s: GameState, victim: PlayerState, amount: number, dealer: PlayerState, ev: GameEvent[]): void {
  if (amount <= 0) return;
  victim.hp -= amount;
  dealer.damageThisRound += amount;
  s.hpLostThisRound = true;
  if (victim.hp <= 0) finishGame(s, { kind: 'WIN', winner: dealer.id, reason: 'HP' }, ev);
}

function breakAllGuards(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  if (p.guard.length === 0) return;
  const broken = p.guard.splice(0);
  toGraveyard(s, broken);
  ev.push({ type: 'GuardBroken', player: p.id, cards: broken });
}

/** Passos 2 a 10 da spec §1.9. A janela de reação (passo 1) já aconteceu. */
export function resolveAttack(s: GameState, attackerId: PlayerId, ev: GameEvent[]): void {
  const attacker = getPlayer(s, attackerId);
  const defender = opponentOf(s, attackerId);
  const absolute = isAbsoluteAttack(s, attacker);
  const atk = attackValue(s, attacker);

  if (defender.reflect) {
    const reflect = defender.reflect;
    defender.reflect = null;
    breakAllGuards(s, attacker, ev);
    let damage = 0;
    if (!attacker.absoluteDefense) {
      if (attacker.defenseBuffs.length > 0) {
        const queens = attacker.defenseBuffs.splice(0);
        toGraveyard(s, queens);
        ev.push({ type: 'BuffRemoved', player: attacker.id, cards: queens });
      }
      damage = Math.max(0, atk - Math.floor(defenseBase(attacker) / 2));
    }
    toGraveyard(s, [reflect.k, reflect.j, reflect.q]);
    ev.push({ type: 'ReflectTriggered', owner: defender.id, attacker: attacker.id, damage });
    loseHp(s, attacker, damage, defender, ev);
  } else {
    const def = defenseValue(defender);
    if (absolute) {
      ev.push({ type: 'AbsoluteAttack', player: attacker.id });
      breakAllGuards(s, defender, ev);
    }
    let damage: number;
    if (defender.absoluteDefense) {
      damage = absolute ? Math.max(0, atk - def) : 0;
    } else {
      const net = Math.max(0, atk - def);
      if (net > 0 && defender.guard.length > 0) {
        const absorbed = defender.guard.splice(0, 1);
        toGraveyard(s, absorbed);
        ev.push({ type: 'GuardBroken', player: defender.id, cards: absorbed });
        damage = 0;
      } else {
        damage = net;
      }
    }
    ev.push({ type: 'DamageDealt', attacker: attacker.id, defender: defender.id, attack: atk, defense: def, damage });
    loseHp(s, defender, damage, attacker, ev);
  }
  if (isGameOver(s)) return;

  const removedAtk = attacker.attackRow.splice(0, 1);
  toGraveyard(s, removedAtk);
  ev.push({ type: 'CardsRemovedFromRow', player: attacker.id, row: 'ATK', cards: removedAtk });
  if (!defender.absoluteDefense && defender.defenseRow.length > 0) {
    const removedDef = defender.defenseRow.splice(0, 1);
    toGraveyard(s, removedDef);
    ev.push({ type: 'CardsRemovedFromRow', player: defender.id, row: 'DEF', cards: removedDef });
  }
  if (absolute) {
    const consumed = attacker.attackBuffs.splice(0, 1);
    toGraveyard(s, consumed);
    ev.push({ type: 'BuffRemoved', player: attacker.id, cards: consumed });
  }
  reevaluateQuads(s, attacker, ev);
  reevaluateQuads(s, defender, ev);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test test/combat.test.ts`
Expected: PASS (16 testes).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/combat.ts packages/engine/test/combat.test.ts
git commit -m "feat(engine): resolução do ataque com K, Absolutos e Reflect" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Turno de ataque: buffs, ataque, janela, fim de turno e de rodada

**Files:**
- Create: `packages/engine/src/actions/main.ts`, `packages/engine/src/actions/reaction.ts`
- Modify: `packages/engine/src/apply-action.ts`
- Test: `packages/engine/test/turn-flow.test.ts`

**Interfaces:**
- Consumes: `endTurn`, `openReaction` (T4); `resolveAttack` (T6); `fail`, `getPlayer`, `opponentOf`, `takeFromHand`, `finishGame`, `isGameOver` (T1, T4).
- Produces (`main.ts`): `requireMain(s, playerId): PlayerState`, `playJ(s, p, cardId, ev)`, `playQ(s, p, cardId, ev)`, `declareAttack(s, p, ev)`, `endTurnAction(s, p, ev)`.
- Produces (`reaction.ts`): `requireReaction(s, playerId): { responder; actor; trigger }`, `pass(s, playerId, ev)`, `closeReaction(s, ev)`. `closeReaction` já trata os gatilhos `K_PLAYED` (Exódia) e `REFLECT_PLAYED`, testados nas Tarefas 8 e 9.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/turn-flow.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { P1, P2, act, actErr, handId, player, setup, steps } from './helpers';

describe('buffs na fase principal', () => {
  it('J vai para os Buffs de Ataque; Selvagem também serve como J', () => {
    const s = setup({ p1: { hand: ['J', 'W'] } });
    const a = act(s, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'J') });
    expect(a.events).toContainEqual(expect.objectContaining({ type: 'BuffPlayed', player: P1, as: 'J' }));
    const b = act(a.state, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'WILD') });
    expect(player(b.state, P1).attackBuffs).toHaveLength(2);
    expect(player(b.state, P1).hand).toHaveLength(0);
  });

  it('respeita o limite de 4 J', () => {
    const s = setup({ p1: { hand: ['J'], attackBuffs: ['J', 'J', 'J', 'J'] } });
    expect(actErr(s, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'J') })).toBe('BUFF_LIMIT');
  });

  it('rejeita carta da mão do oponente e carta do tipo errado (review focus 1)', () => {
    const s = setup({ p1: { hand: ['K'] }, p2: { hand: ['J'] } });
    expect(actErr(s, P1, { type: 'PLAY_J', cardId: handId(s, P2, 'J') })).toBe('CARD_NOT_IN_HAND');
    expect(actErr(s, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'K') })).toBe('INVALID_CARD');
  });

  it('o 4º Q ativa a Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['Q'], defenseBuffs: ['Q', 'Q', 'Q'] } });
    const r = act(s, P1, { type: 'PLAY_Q', cardId: handId(s, P1, 'Q') });
    expect(r.events).toContainEqual({ type: 'AbsoluteDefenseStarted', player: P1 });
    expect(player(r.state, P1).absoluteDefense).toBe(true);
  });

  it('o Selvagem como 4º J torna o ataque Absoluto (exemplo 7)', () => {
    const s = setup({ p1: { hand: ['W'], attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J'] }, p2: { guard: 1 } });
    const r = steps(s, [
      [P1, { type: 'PLAY_J', cardId: handId(s, P1, 'WILD') }],
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
    ]);
    expect(r.events).toContainEqual({ type: 'AbsoluteAttack', player: P1 });
    expect(player(r.state, P2).guard).toHaveLength(0);
    expect(player(r.state, P2).hp).toBe(10);
  });

  it('o oponente não age no turno alheio (review focus 2)', () => {
    const s = setup({ p2: { hand: ['J'] } });
    expect(actErr(s, P2, { type: 'PLAY_J', cardId: handId(s, P2, 'J') })).toBe('NOT_YOUR_TURN');
    expect(actErr(s, P2, { type: 'PASS' })).toBe('WRONG_PHASE');
  });
});

describe('ataque e janela de reação', () => {
  it('declarar abre a janela do oponente; passar resolve e passa o turno', () => {
    const s = setup({ p1: { attack: [6] }, p2: { attack: [2] } });
    const a = act(s, P1, { type: 'DECLARE_ATTACK' });
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'ATTACK' });
    expect(actErr(a.state, P1, { type: 'END_TURN' })).toBe('WRONG_PHASE');
    expect(actErr(a.state, P1, { type: 'PASS' })).toBe('NOT_YOUR_TURN');
    const b = act(a.state, P2, { type: 'PASS' });
    expect(player(b.state, P2).hp).toBe(94);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });

  it('com Ataque vazio o turno termina sem atacar; com cartas, é obrigatório atacar', () => {
    const empty = setup();
    expect(actErr(empty, P1, { type: 'DECLARE_ATTACK' })).toBe('ATTACK_ROW_EMPTY');
    expect(act(empty, P1, { type: 'END_TURN' }).state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
    expect(actErr(setup({ p1: { attack: [3] } }), P1, { type: 'END_TURN' })).toBe('ATTACK_ROW_NOT_EMPTY');
  });
});

describe('fim da rodada de Ataque', () => {
  it('quem causou mais dano fica com a iniciativa e a rodada de Equipar começa', () => {
    const s = setup({ initiative: P2, p1: { attack: [10] }, p2: { attack: [2] } });
    const r = steps(s, [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
      [P2, { type: 'DECLARE_ATTACK' }],
      [P1, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).hp).toBe(90);
    expect(player(r.state, P1).hp).toBe(98);
    expect(r.events).toContainEqual({ type: 'InitiativeChanged', player: P1 });
    expect(r.state.initiative).toBe(P1);
    expect(r.state.noDamageStreak).toBe(0);
    expect(r.state.round).toBe(4);
    expect(r.state.phase).toEqual({ kind: 'EQUIP' });
  });

  it('empate de dano mantém a iniciativa', () => {
    const s = setup({ initiative: P2 });
    const r = steps(s, [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.initiative).toBe(P2);
  });

  it('anti-travamento: 5 rodadas sem dano → vence quem tem mais vida', () => {
    const s = setup({ noDamageStreak: 4, p2: { hp: 90 } });
    const r = steps(s, [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'ANTI_STALL' } });
  });

  it('anti-travamento com vida igual é empate; sem Pressão da mesa bastam 3 rodadas', () => {
    const r = steps(setup({ noDamageStreak: 2, config: { tablePressure: false } }), [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'DRAW', reason: 'ANTI_STALL' } });
  });

  it('Pressão da mesa: rodadas sem dano aumentam o multiplicador da rodada seguinte', () => {
    const r1 = steps(setup({ noDamageStreak: 1 }), [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r1.state.noDamageStreak).toBe(2);
    const r2 = act(r1.state, 'system', { type: 'TIMEOUT' });
    expect(r2.state.round).toBe(5);
    expect(r2.state.pressure).toBe(2);
    expect(r2.events).toContainEqual({ type: 'PressureChanged', pressure: 2 });
  });

  it('qualquer perda de vida zera a sequência sem dano', () => {
    const r = steps(setup({ noDamageStreak: 3, p1: { attack: [5] } }), [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.noDamageStreak).toBe(0);
  });
});

describe('expiração de efeitos', () => {
  it('a Defesa Absoluta termina no fim do turno do oponente e consome 1 Q', () => {
    const s = setup({ p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const r = act(s, P1, { type: 'END_TURN' });
    expect(r.events).toContainEqual({ type: 'AbsoluteDefenseEnded', player: P2 });
    expect(player(r.state, P2).absoluteDefense).toBe(false);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(3);
  });
});

describe('TIMEOUT no turno de ataque', () => {
  it('declara o ataque e, na janela, passa', () => {
    const s = setup({ p1: { attack: [4] } });
    const a = act(s, 'system', { type: 'TIMEOUT' });
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'ATTACK' });
    const b = act(a.state, 'system', { type: 'TIMEOUT' });
    expect(player(b.state, P2).hp).toBe(96);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });

  it('com Ataque vazio, encerra o turno', () => {
    const r = act(setup(), 'system', { type: 'TIMEOUT' });
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/turn-flow.test.ts`
Expected: FAIL. `PLAY_J` e as outras ações ainda caem em `INVALID_ACTION`, e o TIMEOUT dessas fases ainda devolve `WRONG_PHASE`.

- [ ] **Step 3: Implementar `actions/main.ts`**

`packages/engine/src/actions/main.ts`:
```ts
import { fail } from '../errors';
import { endTurn, openReaction } from '../flow';
import { getPlayer, opponentOf, takeFromHand } from '../state';
import type { GameEvent, GameState, PlayerId, PlayerState } from '../types';

export function requireMain(s: GameState, playerId: PlayerId): PlayerState {
  const phase = s.phase;
  if (phase.kind !== 'ATTACK_MAIN') fail('WRONG_PHASE', 'não é a fase principal de um turno de ataque');
  if (phase.player !== playerId) fail('NOT_YOUR_TURN', 'não é o seu turno');
  return getPlayer(s, playerId);
}

export function playJ(s: GameState, p: PlayerState, cardId: string, ev: GameEvent[]): void {
  if (p.attackBuffs.length >= s.config.buffLimit) fail('BUFF_LIMIT', 'limite de J atingido');
  const card = takeFromHand(p, cardId, ['J', 'WILD']);
  p.attackBuffs.push(card);
  ev.push({ type: 'BuffPlayed', player: p.id, card, as: 'J' });
}

export function playQ(s: GameState, p: PlayerState, cardId: string, ev: GameEvent[]): void {
  if (p.defenseBuffs.length >= s.config.buffLimit) fail('BUFF_LIMIT', 'limite de Q atingido');
  const card = takeFromHand(p, cardId, ['Q', 'WILD']);
  p.defenseBuffs.push(card);
  ev.push({ type: 'BuffPlayed', player: p.id, card, as: 'Q' });
  if (p.defenseBuffs.length >= s.config.buffLimit && !p.absoluteDefense) {
    p.absoluteDefense = true;
    ev.push({ type: 'AbsoluteDefenseStarted', player: p.id });
  }
}

export function declareAttack(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  if (p.attackRow.length === 0) fail('ATTACK_ROW_EMPTY', 'sua fileira de Ataque está vazia');
  ev.push({ type: 'AttackDeclared', player: p.id });
  openReaction(s, opponentOf(s, p.id).id, 'ATTACK', ev);
}

export function endTurnAction(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  if (p.attackRow.length > 0) fail('ATTACK_ROW_NOT_EMPTY', 'com cartas no Ataque, o turno termina declarando o ataque');
  endTurn(s, ev);
}
```

- [ ] **Step 4: Implementar `actions/reaction.ts`**

`packages/engine/src/actions/reaction.ts`:
```ts
import { resolveAttack } from '../combat';
import { fail } from '../errors';
import { endTurn } from '../flow';
import { finishGame, getPlayer, isGameOver, opponentOf } from '../state';
import type { GameEvent, GameState, PlayerId, PlayerState, ReactionTrigger } from '../types';

export function requireReaction(
  s: GameState,
  playerId: PlayerId,
): { responder: PlayerState; actor: PlayerState; trigger: ReactionTrigger } {
  const phase = s.phase;
  if (phase.kind !== 'REACTION') fail('WRONG_PHASE', 'não há janela de reação aberta');
  if (phase.responder !== playerId) fail('NOT_YOUR_TURN', 'a janela de reação é do oponente');
  return { responder: getPlayer(s, playerId), actor: opponentOf(s, playerId), trigger: phase.trigger };
}

export function pass(s: GameState, playerId: PlayerId, ev: GameEvent[]): void {
  requireReaction(s, playerId);
  closeReaction(s, ev);
}

/** Fecha a janela e segue conforme o gatilho (spec §1.7, §1.8 Exódia, §1.9). */
export function closeReaction(s: GameState, ev: GameEvent[]): void {
  const phase = s.phase;
  if (phase.kind !== 'REACTION') throw new Error('closeReaction chamado fora de REACTION');
  const actor = opponentOf(s, phase.responder);
  ev.push({ type: 'ReactionWindowClosed', responder: phase.responder, trigger: phase.trigger });
  if (phase.trigger === 'ATTACK') {
    resolveAttack(s, actor.id, ev);
    if (!isGameOver(s)) endTurn(s, ev);
  } else if (phase.trigger === 'K_PLAYED' && actor.guard.length >= s.config.exodiaGuard) {
    ev.push({ type: 'Exodia', player: actor.id });
    finishGame(s, { kind: 'WIN', winner: actor.id, reason: 'EXODIA' }, ev);
  } else {
    s.phase = { kind: 'ATTACK_MAIN', player: actor.id };
  }
}
```

- [ ] **Step 5: Atualizar `apply-action.ts`**

Substitua o bloco de imports de `packages/engine/src/apply-action.ts` por:
```ts
import { handleEquip, timeoutEquip } from './actions/equip';
import { declareAttack, endTurnAction, playJ, playQ, requireMain } from './actions/main';
import { chooseOrder, handleChooseOrder } from './actions/order';
import { closeReaction, pass } from './actions/reaction';
import { fail, RuleViolation } from './errors';
import { endTurn } from './flow';
import { finishGame, getPlayer, opponentOf } from './state';
import type { Action, ActionResult, GameEvent, GameState, PlayerId } from './types';
```

Substitua a função `applySystem` por:
```ts
function applySystem(s: GameState, action: Action, ev: GameEvent[]): void {
  if (action.type === 'FORFEIT') {
    const loser = getPlayer(s, action.loser);
    finishGame(s, { kind: 'WIN', winner: opponentOf(s, loser.id).id, reason: 'FORFEIT' }, ev);
    return;
  }
  if (action.type !== 'TIMEOUT') fail('PLAYER_ONLY', 'o sistema só envia TIMEOUT ou FORFEIT');
  const phase = s.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return timeoutEquip(s, ev);
    case 'ORDER_CHOICE':
      return chooseOrder(s, true, ev);
    case 'ATTACK_MAIN': {
      const p = getPlayer(s, phase.player);
      if (p.attackRow.length > 0) return declareAttack(s, p, ev);
      return endTurn(s, ev);
    }
    case 'REACTION':
      return closeReaction(s, ev);
    case 'GAME_OVER':
      return;
  }
}
```

Substitua a função `applyPlayer` por:
```ts
function applyPlayer(s: GameState, player: PlayerId, action: Action, ev: GameEvent[]): void {
  switch (action.type) {
    case 'EQUIP':
      return handleEquip(s, player, action.destinations, ev);
    case 'CHOOSE_ORDER':
      return handleChooseOrder(s, player, action.first, ev);
    case 'PLAY_J':
      return playJ(s, requireMain(s, player), action.cardId, ev);
    case 'PLAY_Q':
      return playQ(s, requireMain(s, player), action.cardId, ev);
    case 'DECLARE_ATTACK':
      return declareAttack(s, requireMain(s, player), ev);
    case 'END_TURN':
      return endTurnAction(s, requireMain(s, player), ev);
    case 'PASS':
      return pass(s, player, ev);
    case 'TIMEOUT':
    case 'FORFEIT':
      return fail('SYSTEM_ONLY', 'apenas o sistema envia esta ação');
    default:
      return fail('INVALID_ACTION', `ação desconhecida: ${String((action as { type?: unknown }).type)}`);
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test`
Expected: PASS em todos os arquivos, incluindo os 17 testes de `turn-flow.test.ts`.

Run: `pnpm check`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/actions/main.ts packages/engine/src/actions/reaction.ts packages/engine/src/apply-action.ts packages/engine/test/turn-flow.test.ts
git commit -m "feat(engine): turno de ataque, janela de reação, iniciativa, pressão e anti-travamento" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: K e Exódia, Armadilha (Ás) e Sacrifício

**Files:**
- Modify: `packages/engine/src/actions/main.ts`, `packages/engine/src/actions/reaction.ts`, `packages/engine/src/apply-action.ts`
- Test: `packages/engine/test/specials.test.ts`

**Interfaces:**
- Consumes: `assertDistinct`, `removeById`, `toGraveyard` (T4); `openReaction` (T4); `requireReaction` (T7).
- Produces (`main.ts`): `type TargetZone = 'attackBuffs' | 'defenseBuffs' | 'guard'`, `playK(s, p, cardIds, ev)`, `useTrap(s, p, cardId, targetId, zones: TargetZone[], ev)`, `sacrifice(s, p, cardId, targetId, ev)`.
- Produces (`reaction.ts`): `reactTrap(s, playerId, cardId, targetId, ev)`.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/specials.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { P1, P2, act, actErr, handId, player, setup, steps } from './helpers';

describe('K e Exódia', () => {
  it('jogar K abre a janela de reação e depois volta ao turno', () => {
    const s = setup({ p1: { hand: ['K', 'K'] } });
    const a = act(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K', 0), handId(s, P1, 'K', 1)] });
    expect(player(a.state, P1).guard).toHaveLength(2);
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'K_PLAYED' });
    const b = act(a.state, P2, { type: 'PASS' });
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('4 K na Guarda depois da janela = Exódia', () => {
    const s = setup({ p1: { guard: 2, hand: ['K', 'K'] } });
    const r = steps(s, [
      [P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K', 0), handId(s, P1, 'K', 1)] }],
      [P2, { type: 'PASS' }],
    ]);
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'EXODIA' } });
    expect(r.events).toContainEqual({ type: 'Exodia', player: P1 });
  });

  it('o Ás na janela impede a Exódia', () => {
    const s = setup({ p1: { guard: 2, hand: ['K', 'K'] }, p2: { hand: ['A'] } });
    const a = act(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K', 0), handId(s, P1, 'K', 1)] });
    const target = player(a.state, P1).guard[0].id;
    const r = steps(a.state, [
      [P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: target }],
      [P2, { type: 'PASS' }],
    ]);
    expect(player(r.state, P1).guard).toHaveLength(3);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('na janela de K, o Ás só mira K', () => {
    const s = setup({ p1: { hand: ['K'], attackBuffs: ['J'] }, p2: { hand: ['A'] } });
    const a = act(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K')] });
    const jId = player(s, P1).attackBuffs[0].id;
    expect(actErr(a.state, P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: jId })).toBe('INVALID_TARGET');
  });

  it('rejeita K repetido, lista vazia e Selvagem como K (review focus 1)', () => {
    const s = setup({ p1: { hand: ['K', 'W'] } });
    const k = handId(s, P1, 'K');
    expect(actErr(s, P1, { type: 'PLAY_K', cardIds: [k, k] })).toBe('DUPLICATE_CARDS');
    expect(actErr(s, P1, { type: 'PLAY_K', cardIds: [] })).toBe('INVALID_CARD');
    expect(actErr(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'WILD')] })).toBe('INVALID_CARD');
  });
});

describe('Armadilha (Ás)', () => {
  it('destrói um especial do oponente no seu turno', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { defenseBuffs: ['Q'] } });
    const r = act(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: player(s, P2).defenseBuffs[0].id });
    expect(player(r.state, P2).defenseBuffs).toHaveLength(0);
    expect(r.state.graveyard.map((c) => c.kind)).toEqual(['A', 'Q']);
  });

  it('o Coringa Selvagem funciona como Ás', () => {
    const s = setup({ p1: { hand: ['W'] }, p2: { guard: 1 } });
    const r = act(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'WILD'), targetId: player(s, P2).guard[0].id });
    expect(player(r.state, P2).guard).toHaveLength(0);
  });

  it('não atravessa a Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const target = player(s, P2).defenseBuffs[0].id;
    expect(actErr(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: target })).toBe('TARGET_PROTECTED');
  });

  it('não mira as cartas de um Reflect ativo', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { reflect: true } });
    const target = player(s, P2).reflect?.k.id ?? '';
    expect(actErr(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: target })).toBe('INVALID_TARGET');
  });

  it('na janela de ataque, o Ás quebra um J antes do dano', () => {
    const s = setup({ p1: { attack: [10], attackBuffs: ['J', 'J'] }, p2: { hand: ['A'] } });
    const r = steps(s, [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: player(s, P1).attackBuffs[0].id }],
      [P2, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).hp).toBe(80);
  });
});

describe('Sacrifício', () => {
  it('J da mão abate J do oponente', () => {
    const s = setup({ p1: { hand: ['J'] }, p2: { attackBuffs: ['J'] } });
    const r = act(s, P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'J'), targetId: player(s, P2).attackBuffs[0].id });
    expect(player(r.state, P2).attackBuffs).toHaveLength(0);
    expect(r.state.graveyard).toHaveLength(2);
  });

  it('Q abate Q, e o Selvagem serve como Q', () => {
    const s = setup({ p1: { hand: ['Q', 'W'] }, p2: { defenseBuffs: ['Q', 'Q'] } });
    const [q1, q2] = player(s, P2).defenseBuffs.map((c) => c.id);
    const r = steps(s, [
      [P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'Q'), targetId: q1 }],
      [P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'WILD'), targetId: q2 }],
    ]);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(0);
  });

  it('J não abate Q, e K não é alvo', () => {
    const s = setup({ p1: { hand: ['J'] }, p2: { defenseBuffs: ['Q'], guard: 1 } });
    const jId = handId(s, P1, 'J');
    expect(actErr(s, P1, { type: 'SACRIFICE', cardId: jId, targetId: player(s, P2).defenseBuffs[0].id })).toBe('INVALID_CARD');
    expect(actErr(s, P1, { type: 'SACRIFICE', cardId: jId, targetId: player(s, P2).guard[0].id })).toBe('INVALID_TARGET');
  });

  it('é bloqueado pela Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['Q'] }, p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const target = player(s, P2).defenseBuffs[0].id;
    expect(actErr(s, P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'Q'), targetId: target })).toBe('TARGET_PROTECTED');
  });

  it('não vale como reação', () => {
    const s = setup({ p1: { attack: [5], attackBuffs: ['J'] }, p2: { hand: ['J'] } });
    const a = act(s, P1, { type: 'DECLARE_ATTACK' });
    const target = player(s, P1).attackBuffs[0].id;
    expect(actErr(a.state, P2, { type: 'SACRIFICE', cardId: handId(s, P2, 'J'), targetId: target })).toBe('WRONG_PHASE');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/specials.test.ts`
Expected: FAIL. `PLAY_K`, `TRAP` e `SACRIFICE` ainda caem em `INVALID_ACTION`.

- [ ] **Step 3: Estender `actions/main.ts`**

Substitua o bloco de imports de `packages/engine/src/actions/main.ts` por:
```ts
import { fail } from '../errors';
import { endTurn, openReaction } from '../flow';
import { assertDistinct, getPlayer, opponentOf, removeById, takeFromHand, toGraveyard } from '../state';
import type { GameEvent, GameState, PlayerId, PlayerState, SpecialCard } from '../types';
```

Acrescente ao fim de `packages/engine/src/actions/main.ts`:
```ts
export type TargetZone = 'attackBuffs' | 'defenseBuffs' | 'guard';

export function playK(s: GameState, p: PlayerState, cardIds: string[], ev: GameEvent[]): void {
  if (!Array.isArray(cardIds) || cardIds.length === 0) fail('INVALID_CARD', 'escolha pelo menos um K');
  assertDistinct(cardIds);
  const cards = cardIds.map((id) => takeFromHand(p, id, ['K']));
  p.guard.push(...cards);
  ev.push({ type: 'GuardPlayed', player: p.id, cards });
  openReaction(s, opponentOf(s, p.id).id, 'K_PLAYED', ev);
}

function takeTarget(owner: PlayerState, targetId: string, zones: TargetZone[]): SpecialCard {
  for (const zone of zones) {
    const found = removeById(owner[zone], targetId);
    if (found) return found;
  }
  fail('INVALID_TARGET', 'alvo inválido para esta jogada');
}

/** Armadilha (spec §1.6): destrói 1 J, Q ou K do oponente. Nunca mira cartas de Reflect. */
export function useTrap(
  s: GameState,
  p: PlayerState,
  cardId: string,
  targetId: string,
  zones: TargetZone[],
  ev: GameEvent[],
): void {
  const owner = opponentOf(s, p.id);
  if (owner.absoluteDefense) fail('TARGET_PROTECTED', 'o oponente está sob Defesa Absoluta');
  const card = takeFromHand(p, cardId, ['A', 'WILD']);
  const target = takeTarget(owner, targetId, zones);
  toGraveyard(s, [card, target]);
  ev.push({ type: 'TrapUsed', player: p.id, card, target, targetOwner: owner.id });
}

/** Sacrifício (spec §1.6): J da mão abate J do oponente; Q abate Q. Só na fase principal. */
export function sacrifice(s: GameState, p: PlayerState, cardId: string, targetId: string, ev: GameEvent[]): void {
  const owner = opponentOf(s, p.id);
  if (owner.absoluteDefense) fail('TARGET_PROTECTED', 'o oponente está sob Defesa Absoluta');
  let target = removeById(owner.attackBuffs, targetId);
  let card: SpecialCard;
  if (target) {
    card = takeFromHand(p, cardId, ['J', 'WILD']);
  } else {
    target = removeById(owner.defenseBuffs, targetId);
    if (!target) fail('INVALID_TARGET', 'o Sacrifício só abate J ou Q do oponente');
    card = takeFromHand(p, cardId, ['Q', 'WILD']);
  }
  toGraveyard(s, [card, target]);
  ev.push({ type: 'Sacrificed', player: p.id, card, target, targetOwner: owner.id });
}
```

- [ ] **Step 4: Estender `actions/reaction.ts`**

Acrescente aos imports de `packages/engine/src/actions/reaction.ts`:
```ts
import { useTrap, type TargetZone } from './main';
```

Acrescente ao fim de `packages/engine/src/actions/reaction.ts`:
```ts
/** Ás como reação: contra ataque mira J, Q ou K; contra jogada de K, só K (spec §1.7). */
export function reactTrap(s: GameState, playerId: PlayerId, cardId: string, targetId: string, ev: GameEvent[]): void {
  const { responder, trigger } = requireReaction(s, playerId);
  if (trigger === 'REFLECT_PLAYED') fail('WRONG_PHASE', 'o Ás não responde a um Reflect');
  const zones: TargetZone[] = trigger === 'K_PLAYED' ? ['guard'] : ['attackBuffs', 'defenseBuffs', 'guard'];
  useTrap(s, responder, cardId, targetId, zones, ev);
}
```

- [ ] **Step 5: Atualizar `apply-action.ts`**

Substitua as linhas de import de `./actions/main` e `./actions/reaction` em `packages/engine/src/apply-action.ts` por:
```ts
import { declareAttack, endTurnAction, playJ, playK, playQ, requireMain, sacrifice, useTrap } from './actions/main';
import { closeReaction, pass, reactTrap } from './actions/reaction';
```

Em `applyPlayer`, acrescente estes casos logo antes de `case 'PASS':`:
```ts
    case 'PLAY_K':
      return playK(s, requireMain(s, player), action.cardIds, ev);
    case 'SACRIFICE':
      return sacrifice(s, requireMain(s, player), action.cardId, action.targetId, ev);
    case 'TRAP':
      if (s.phase.kind === 'REACTION') return reactTrap(s, player, action.cardId, action.targetId, ev);
      return useTrap(s, requireMain(s, player), action.cardId, action.targetId, ['attackBuffs', 'defenseBuffs', 'guard'], ev);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test`
Expected: PASS em todos os arquivos, incluindo os 15 testes de `specials.test.ts`.

Run: `pnpm check`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/actions packages/engine/src/apply-action.ts packages/engine/test/specials.test.ts
git commit -m "feat(engine): K e Exódia, Armadilha como reação e Sacrifício" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Reflect, anulação e proteção por sacrifício

**Files:**
- Modify: `packages/engine/src/actions/main.ts`, `packages/engine/src/actions/reaction.ts`, `packages/engine/src/apply-action.ts`
- Test: `packages/engine/test/reflect.test.ts`

**Interfaces:**
- Consumes: `takeFromHand`, `assertDistinct`, `removeById`, `toGraveyard` (T4); `openReaction` (T4); `requireReaction`, `closeReaction` (T7).
- Produces (`main.ts`): `takeReflectCards(p, kId, jId, qId): ReflectState`, `castReflect(s, p, kId, jId, qId, ev)`, `protectFromReflect(s, p, jId, qId, kId, ev)`.
- Produces (`reaction.ts`): `cancelReflect(s, playerId, kId, jId, qId, ev)`, `reactProtect(s, playerId, jId, qId, kId, ev)`.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/reflect.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Action, GameState } from '../src/types';
import { P1, P2, act, actErr, handId, player, setup, steps } from './helpers';

const reflectOf = (s: GameState, id: string, j: 'J' | 'WILD' = 'J'): Action => ({
  type: 'REFLECT',
  kId: handId(s, id, 'K'),
  jId: handId(s, id, j),
  qId: handId(s, id, 'Q'),
});

describe('Reflect', () => {
  it('lançar abre a janela; passar volta ao turno de quem lançou', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    const a = act(s, P1, reflectOf(s, P1));
    expect(player(a.state, P1).reflect).not.toBeNull();
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'REFLECT_PLAYED' });
    expect(act(a.state, P2, { type: 'PASS' }).state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('só um Reflect ativo por jogador', () => {
    const s = setup({ p1: { reflect: true, hand: ['K', 'J', 'Q'] } });
    expect(actErr(s, P1, reflectOf(s, P1))).toBe('REFLECT_ALREADY_ACTIVE');
  });

  it('o Selvagem serve como J do Reflect, mas nunca como K', () => {
    const s = setup({ p1: { hand: ['K', 'W', 'Q'] } });
    act(s, P1, reflectOf(s, P1, 'WILD'));
    const bad = setup({ p1: { hand: ['W', 'J', 'Q'] } });
    const action: Action = { type: 'REFLECT', kId: handId(bad, P1, 'WILD'), jId: handId(bad, P1, 'J'), qId: handId(bad, P1, 'Q') };
    expect(actErr(bad, P1, action)).toBe('INVALID_CARD');
  });

  it('dispara quando o oponente ataca: quebra K e Q dele e devolve o dano (exemplo 3)', () => {
    const s = setup({
      p1: { hand: ['K', 'J', 'Q'] },
      p2: { attack: [6, 8, 9], attackBuffs: ['J'], defense: [4, 10], defenseBuffs: ['Q'], guard: 2 },
    });
    const r = steps(s, [
      [P1, reflectOf(s, P1)],
      [P2, { type: 'PASS' }],
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'DECLARE_ATTACK' }],
      [P1, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).hp).toBe(61);
    expect(player(r.state, P1).hp).toBe(100);
    expect(player(r.state, P2).guard).toHaveLength(0);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(0);
    expect(player(r.state, P1).reflect).toBeNull();
    expect(r.events).toContainEqual({ type: 'ReflectTriggered', owner: P1, attacker: P2, damage: 39 });
  });

  it('expira no fim do turno do oponente se ele não atacar', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    const r = steps(s, [
      [P1, reflectOf(s, P1)],
      [P2, { type: 'PASS' }],
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.events).toContainEqual({ type: 'ReflectExpired', owner: P1 });
    expect(player(r.state, P1).reflect).toBeNull();
    expect(r.state.graveyard).toHaveLength(3);
  });
});

describe('contra-jogadas', () => {
  it('anular com K+J+Q da mão na janela: os dois conjuntos vão para o cemitério', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] }, p2: { hand: ['K', 'W', 'Q'] } });
    const a = act(s, P1, reflectOf(s, P1));
    const b = act(a.state, P2, { type: 'CANCEL_REFLECT', kId: handId(s, P2, 'K'), jId: handId(s, P2, 'WILD'), qId: handId(s, P2, 'Q') });
    expect(player(b.state, P1).reflect).toBeNull();
    expect(b.state.graveyard).toHaveLength(6);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
    expect(b.events).toContainEqual({ type: 'ReflectCanceled', player: P2, owner: P1 });
  });

  it('anular só vale na janela do lançamento', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] }, p2: { reflect: true } });
    const cancel: Action = { type: 'CANCEL_REFLECT', kId: handId(s, P1, 'K'), jId: handId(s, P1, 'J'), qId: handId(s, P1, 'Q') };
    expect(actErr(s, P1, cancel)).toBe('WRONG_PHASE');
  });

  it('proteger sacrificando J+Q+K do campo, na janela', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] }, p2: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } });
    const p2 = player(s, P2);
    const a = act(s, P1, reflectOf(s, P1));
    const b = act(a.state, P2, {
      type: 'PROTECT_FROM_REFLECT',
      jId: p2.attackBuffs[0].id,
      qId: p2.defenseBuffs[0].id,
      kId: p2.guard[0].id,
    });
    expect(player(b.state, P1).reflect).toBeNull();
    expect(player(b.state, P2).attackBuffs).toHaveLength(0);
    expect(player(b.state, P2).defenseBuffs).toHaveLength(0);
    expect(player(b.state, P2).guard).toHaveLength(0);
    expect(b.state.graveyard).toHaveLength(6);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('proteger também no próprio turno, antes de atacar', () => {
    const s = setup({
      p1: { hand: ['K', 'J', 'Q'] },
      p2: { attack: [5], attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 },
    });
    const p2 = player(s, P2);
    const r = steps(s, [
      [P1, reflectOf(s, P1)],
      [P2, { type: 'PASS' }],
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'PROTECT_FROM_REFLECT', jId: p2.attackBuffs[0].id, qId: p2.defenseBuffs[0].id, kId: p2.guard[0].id }],
      [P2, { type: 'DECLARE_ATTACK' }],
      [P1, { type: 'PASS' }],
    ]);
    expect(player(r.state, P1).hp).toBe(95);
  });

  it('proteger exige Reflect do oponente e as três cartas equipadas', () => {
    const noReflect = setup({ p1: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } });
    const mine = player(noReflect, P1);
    const protect: Action = { type: 'PROTECT_FROM_REFLECT', jId: mine.attackBuffs[0].id, qId: mine.defenseBuffs[0].id, kId: mine.guard[0].id };
    expect(actErr(noReflect, P1, protect)).toBe('NO_REFLECT');
    const missing = setup({ p1: { attackBuffs: ['J'], defenseBuffs: ['Q'] }, p2: { reflect: true } });
    const m = player(missing, P1);
    expect(actErr(missing, P1, { type: 'PROTECT_FROM_REFLECT', jId: m.attackBuffs[0].id, qId: m.defenseBuffs[0].id, kId: 'nada' })).toBe('INVALID_CARD');
  });

  it('o Ás não responde a um Reflect', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'], attackBuffs: ['J'] }, p2: { hand: ['A'] } });
    const a = act(s, P1, reflectOf(s, P1));
    const target = player(s, P1).attackBuffs[0].id;
    expect(actErr(a.state, P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: target })).toBe('WRONG_PHASE');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/reflect.test.ts`
Expected: FAIL. `REFLECT`, `CANCEL_REFLECT` e `PROTECT_FROM_REFLECT` ainda caem em `INVALID_ACTION`.

- [ ] **Step 3: Estender `actions/main.ts`**

Substitua o import de tipos de `packages/engine/src/actions/main.ts` por:
```ts
import type { GameEvent, GameState, PlayerId, PlayerState, ReflectState, SpecialCard } from '../types';
```

Acrescente ao fim de `packages/engine/src/actions/main.ts`:
```ts
export function takeReflectCards(p: PlayerState, kId: string, jId: string, qId: string): ReflectState {
  assertDistinct([kId, jId, qId]);
  return {
    k: takeFromHand(p, kId, ['K']),
    j: takeFromHand(p, jId, ['J', 'WILD']),
    q: takeFromHand(p, qId, ['Q', 'WILD']),
  };
}

/** Reflect (spec §1.6): K+J+Q da mão; ativo até o fim do próximo turno de ataque do oponente. */
export function castReflect(s: GameState, p: PlayerState, kId: string, jId: string, qId: string, ev: GameEvent[]): void {
  if (p.reflect) fail('REFLECT_ALREADY_ACTIVE', 'você já tem um Reflect ativo');
  const reflect = takeReflectCards(p, kId, jId, qId);
  p.reflect = reflect;
  ev.push({ type: 'ReflectPlayed', player: p.id, reflect });
  openReaction(s, opponentOf(s, p.id).id, 'REFLECT_PLAYED', ev);
}

/** Proteção por sacrifício: 1 J, 1 Q e 1 K equipados anulam o Reflect do oponente. */
export function protectFromReflect(
  s: GameState,
  p: PlayerState,
  jId: string,
  qId: string,
  kId: string,
  ev: GameEvent[],
): void {
  const owner = opponentOf(s, p.id);
  const reflect = owner.reflect;
  if (!reflect) fail('NO_REFLECT', 'o oponente não tem Reflect ativo');
  const j = removeById(p.attackBuffs, jId);
  const q = removeById(p.defenseBuffs, qId);
  const k = removeById(p.guard, kId);
  if (!j || !q || !k) fail('INVALID_CARD', 'a proteção exige 1 J, 1 Q e 1 K equipados');
  owner.reflect = null;
  toGraveyard(s, [j, q, k, reflect.k, reflect.j, reflect.q]);
  ev.push({ type: 'ReflectProtected', player: p.id, owner: owner.id });
}
```

- [ ] **Step 4: Estender `actions/reaction.ts`**

Substitua os imports de `packages/engine/src/actions/reaction.ts` por:
```ts
import { resolveAttack } from '../combat';
import { fail } from '../errors';
import { endTurn } from '../flow';
import { finishGame, getPlayer, isGameOver, opponentOf, toGraveyard } from '../state';
import type { GameEvent, GameState, PlayerId, PlayerState, ReactionTrigger } from '../types';
import { protectFromReflect, takeReflectCards, useTrap, type TargetZone } from './main';
```

Acrescente ao fim de `packages/engine/src/actions/reaction.ts`:
```ts
/** Anular (spec §1.6): K+J+Q da mão, só na janela aberta pelo lançamento do Reflect. */
export function cancelReflect(s: GameState, playerId: PlayerId, kId: string, jId: string, qId: string, ev: GameEvent[]): void {
  const { responder, actor, trigger } = requireReaction(s, playerId);
  if (trigger !== 'REFLECT_PLAYED') fail('WRONG_PHASE', 'só dá para anular um Reflect logo após ele ser lançado');
  const reflect = actor.reflect;
  if (!reflect) fail('NO_REFLECT', 'o oponente não tem Reflect ativo');
  const mine = takeReflectCards(responder, kId, jId, qId);
  actor.reflect = null;
  toGraveyard(s, [mine.k, mine.j, mine.q, reflect.k, reflect.j, reflect.q]);
  ev.push({ type: 'ReflectCanceled', player: responder.id, owner: actor.id });
  closeReaction(s, ev);
}

export function reactProtect(s: GameState, playerId: PlayerId, jId: string, qId: string, kId: string, ev: GameEvent[]): void {
  const { responder, trigger } = requireReaction(s, playerId);
  if (trigger !== 'REFLECT_PLAYED') fail('WRONG_PHASE', 'não há Reflect sendo lançado');
  protectFromReflect(s, responder, jId, qId, kId, ev);
  closeReaction(s, ev);
}
```

- [ ] **Step 5: Atualizar `apply-action.ts`**

Substitua as linhas de import de `./actions/main` e `./actions/reaction` por:
```ts
import {
  castReflect,
  declareAttack,
  endTurnAction,
  playJ,
  playK,
  playQ,
  protectFromReflect,
  requireMain,
  sacrifice,
  useTrap,
} from './actions/main';
import { cancelReflect, closeReaction, pass, reactProtect, reactTrap } from './actions/reaction';
```

Em `applyPlayer`, acrescente estes casos logo antes de `case 'PASS':`:
```ts
    case 'REFLECT':
      return castReflect(s, requireMain(s, player), action.kId, action.jId, action.qId, ev);
    case 'CANCEL_REFLECT':
      return cancelReflect(s, player, action.kId, action.jId, action.qId, ev);
    case 'PROTECT_FROM_REFLECT':
      if (s.phase.kind === 'REACTION') return reactProtect(s, player, action.jId, action.qId, action.kId, ev);
      return protectFromReflect(s, requireMain(s, player), action.jId, action.qId, action.kId, ev);
```

- [ ] **Step 6: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test`
Expected: PASS em todos os arquivos, incluindo os 11 testes de `reflect.test.ts`.

Run: `pnpm check`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/actions packages/engine/src/apply-action.ts packages/engine/test/reflect.test.ts
git commit -m "feat(engine): Reflect, anulação e proteção por sacrifício" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Ressurreição (Fallen is Back)

**Files:**
- Modify: `packages/engine/src/actions/main.ts`, `packages/engine/src/apply-action.ts`
- Test: `packages/engine/test/resurrect.test.ts`

**Interfaces:**
- Consumes: `reevaluateQuads`, `rowCards`, `validResurrections` (T3).
- Produces (`main.ts`): `resurrect(s, p, cardId, row: RowName, ev)`.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/resurrect.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Resurrection } from '../src/types';
import { P1, act, actErr, player, setup, values } from './helpers';

const token: Resurrection = { row: 'ATK', value: 7, formedAtRound: 3 };

describe('Ressurreição', () => {
  it('pega uma numérica do cemitério e consome a Ressurreição', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7] }, graveyard: [5] });
    player(s, P1).resurrections = [token];
    const r = act(s, P1, { type: 'RESURRECT', cardId: s.graveyard[0].id, row: 'DEF' });
    expect(values(player(r.state, P1).defenseRow)).toEqual([5]);
    expect(player(r.state, P1).resurrections).toEqual([]);
    expect(r.state.graveyard).toHaveLength(0);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'Resurrected', player: P1, row: 'DEF' }));
  });

  it('sem Ressurreição válida não dá', () => {
    const s = setup({ graveyard: [5] });
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: s.graveyard[0].id, row: 'ATK' })).toBe('NO_RESURRECTION');
  });

  it('sem a quadra, vale até 3 rodadas após a formação', () => {
    const inTime = setup({ round: 6, graveyard: [5] });
    player(inTime, P1).resurrections = [token];
    act(inTime, P1, { type: 'RESURRECT', cardId: inTime.graveyard[0].id, row: 'ATK' });
    const late = setup({ round: 7, graveyard: [5] });
    player(late, P1).resurrections = [token];
    expect(actErr(late, P1, { type: 'RESURRECT', cardId: late.graveyard[0].id, row: 'ATK' })).toBe('NO_RESURRECTION');
  });

  it('só numéricas, que estejam no cemitério, em fileira com espaço', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7], defense: [2, 2, 3, 3, 4, 4, 5] }, graveyard: ['K', 6] });
    player(s, P1).resurrections = [token];
    const [kId, sixId] = s.graveyard.map((c) => c.id);
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: kId, row: 'ATK' })).toBe('INVALID_CARD');
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: 'inexistente', row: 'ATK' })).toBe('CARD_NOT_IN_GRAVEYARD');
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: sixId, row: 'DEF' })).toBe('ROW_FULL');
  });

  it('reviver pode formar nova quadra e gerar nova Ressurreição', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7], defense: [9, 9, 9] }, graveyard: [9] });
    player(s, P1).resurrections = [token];
    const r = act(s, P1, { type: 'RESURRECT', cardId: s.graveyard[0].id, row: 'DEF' });
    expect(r.events).toContainEqual({ type: 'QuadFormed', player: P1, quad: { row: 'DEF', value: 9 } });
    expect(player(r.state, P1).resurrections).toEqual([{ row: 'DEF', value: 9, formedAtRound: 3 }]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/resurrect.test.ts`
Expected: FAIL. `RESURRECT` ainda cai em `INVALID_ACTION`.

- [ ] **Step 3: Estender `actions/main.ts`**

Acrescente aos imports de `packages/engine/src/actions/main.ts`:
```ts
import { reevaluateQuads, rowCards, validResurrections } from '../quads';
```

Substitua o import de tipos de `packages/engine/src/actions/main.ts` por:
```ts
import type { GameEvent, GameState, PlayerId, PlayerState, ReflectState, RowName, SpecialCard } from '../types';
```

Acrescente ao fim de `packages/engine/src/actions/main.ts`:
```ts
/** Ressurreição (spec §1.8): 1 numérica do cemitério para o fim de uma fileira com espaço. */
export function resurrect(s: GameState, p: PlayerState, cardId: string, row: RowName, ev: GameEvent[]): void {
  const tokens = validResurrections(s, p);
  if (tokens.length === 0) fail('NO_RESURRECTION', 'você não tem Ressurreição disponível');
  if (row !== 'ATK' && row !== 'DEF') fail('INVALID_TARGET', 'fileira inválida');
  const target = rowCards(p, row);
  if (target.length >= s.config.rowLimit) fail('ROW_FULL', 'a fileira escolhida está cheia');
  const index = s.graveyard.findIndex((c) => c.id === cardId);
  if (index < 0) fail('CARD_NOT_IN_GRAVEYARD', `a carta ${cardId} não está no cemitério`);
  const card = s.graveyard[index];
  if (card.kind !== 'NUM') fail('INVALID_CARD', 'só cartas numéricas podem ser revividas');
  s.graveyard.splice(index, 1);
  const used = tokens[0];
  p.resurrections = p.resurrections.filter((r) => r !== used);
  target.push(card);
  ev.push({ type: 'Resurrected', player: p.id, card, row });
  reevaluateQuads(s, p, ev);
}
```

- [ ] **Step 4: Atualizar `apply-action.ts`**

Substitua o import de `./actions/main` em `packages/engine/src/apply-action.ts` por:
```ts
import {
  castReflect,
  declareAttack,
  endTurnAction,
  playJ,
  playK,
  playQ,
  protectFromReflect,
  requireMain,
  resurrect,
  sacrifice,
  useTrap,
} from './actions/main';
```

Em `applyPlayer`, acrescente logo antes de `case 'PASS':`:
```ts
    case 'RESURRECT':
      return resurrect(s, requireMain(s, player), action.cardId, action.row, ev);
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test`
Expected: PASS em todos os arquivos, incluindo os 5 testes de `resurrect.test.ts`.

Run: `pnpm check`
Expected: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/actions/main.ts packages/engine/src/apply-action.ts packages/engine/test/resurrect.test.ts
git commit -m "feat(engine): Ressurreição do Fallen is Back" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Visão do jogador e redação de eventos

**Files:**
- Create: `packages/engine/src/view.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/view.test.ts`

**Interfaces:**
- Consumes: `validResurrections` (T3); `getPlayer`, `opponentOf` (T4).
- Produces: `viewFor(s, playerId): PlayerView` (cópia profunda, sem `rng`, sem monte, sem mão nem pendentes do oponente); `viewEvents(events, playerId): GameEvent[]` (tira `cards` dos `CardsDealt` do oponente).

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/view.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { viewEvents, viewFor } from '../src/view';
import { P1, P2, player, setup, steps, values } from './helpers';

describe('viewFor (review focus 3)', () => {
  it('mostra a própria mão e só a quantidade da mão do oponente', () => {
    const s = setup({ p1: { hand: ['J', 'K'] }, p2: { hand: ['A', 'Q', 'W'] } });
    const v = viewFor(s, P1);
    expect(v.self.hand.map((c) => c.kind)).toEqual(['J', 'K']);
    expect(v.opponent.handCount).toBe(3);
    expect('hand' in v.opponent).toBe(false);
    const json = JSON.stringify(v);
    for (const c of player(s, P2).hand) expect(json).not.toContain(`"${c.id}"`);
    for (const c of s.deck) expect(json).not.toContain(`"${c.id}"`);
    expect(json).not.toContain('"rng"');
    expect(v.deckCount).toBe(s.deck.length);
  });

  it('no Equipar, esconde as numéricas recebidas pelo oponente', () => {
    const s = setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3] }, p2: { pending: [8, 9] } });
    const v = viewFor(s, P1);
    expect(values(v.self.pending)).toEqual([3]);
    expect(v.opponent.pendingCount).toBe(2);
    expect(JSON.stringify(v)).not.toContain(`"${player(s, P2).pending[0].id}"`);
  });

  it('é uma cópia: mexer na visão não muda o estado', () => {
    const s = setup({ p1: { hand: ['J'] } });
    viewFor(s, P1).self.hand.pop();
    expect(player(s, P1).hand).toHaveLength(1);
  });

  it('lista só Ressurreições válidas', () => {
    const s = setup({ round: 9 });
    player(s, P1).resurrections = [{ row: 'ATK', value: 7, formedAtRound: 3 }];
    expect(viewFor(s, P1).self.resurrections).toEqual([]);
    expect(viewFor(s, P2).opponent.resurrectionCount).toBe(0);
  });
});

describe('viewEvents (review focus 3)', () => {
  it('esconde as cartas distribuídas ao oponente', () => {
    const s = setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' } });
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: [] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    const forP1 = viewEvents(r.events, P1);
    expect(forP1.find((e) => e.type === 'CardsDealt' && e.player === P2)).toEqual({ type: 'CardsDealt', player: P2, count: 4 });
    const own = forP1.find((e) => e.type === 'CardsDealt' && e.player === P1) as { cards?: unknown[] } | undefined;
    expect(own?.cards).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/view.test.ts`
Expected: FAIL. Não resolve `../src/view`.

- [ ] **Step 3: Implementar**

`packages/engine/src/view.ts`:
```ts
import { validResurrections } from './quads';
import { getPlayer, opponentOf } from './state';
import type { GameEvent, GameState, PlayerId, PlayerState, PlayerView, PublicPlayer } from './types';

function publicPart(s: GameState, p: PlayerState): PublicPlayer {
  return {
    id: p.id,
    hp: p.hp,
    attackRow: p.attackRow,
    defenseRow: p.defenseRow,
    attackBuffs: p.attackBuffs,
    defenseBuffs: p.defenseBuffs,
    guard: p.guard,
    reflect: p.reflect,
    absoluteDefense: p.absoluteDefense,
    quads: p.quads,
    resurrectionCount: validResurrections(s, p).length,
    handCount: p.hand.length,
    pendingCount: p.pending.length,
    equipSubmitted: p.equipSubmitted,
  };
}

/** Visão de um jogador (spec §2.6): nunca inclui semente, monte, mão ou pendentes do oponente. */
export function viewFor(s: GameState, playerId: PlayerId): PlayerView {
  const me = getPlayer(s, playerId);
  const view: PlayerView = {
    me: me.id,
    config: s.config,
    round: s.round,
    roundKind: s.roundKind,
    initiative: s.initiative,
    turnOrder: s.turnOrder,
    turnIndex: s.turnIndex,
    pressure: s.pressure,
    noDamageStreak: s.noDamageStreak,
    phase: s.phase,
    deckCount: s.deck.length,
    graveyard: s.graveyard,
    self: { ...publicPart(s, me), hand: me.hand, pending: me.pending, resurrections: validResurrections(s, me) },
    opponent: publicPart(s, opponentOf(s, playerId)),
  };
  return structuredClone(view);
}

/** O oponente vê "comprou N cartas", nunca quais. */
export function viewEvents(events: GameEvent[], playerId: PlayerId): GameEvent[] {
  return events.map(
    (e): GameEvent =>
      e.type === 'CardsDealt' && e.player !== playerId ? { type: 'CardsDealt', player: e.player, count: e.count } : e,
  );
}
```

Acrescente ao fim de `packages/engine/src/index.ts`:
```ts
export { viewEvents, viewFor } from './view';
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test test/view.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/view.ts packages/engine/src/index.ts packages/engine/test/view.test.ts
git commit -m "feat(engine): visão do jogador com informação oculta" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Ações legais

**Files:**
- Create: `packages/engine/src/legal-actions.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/legal-actions.test.ts`

**Interfaces:**
- Consumes: só tipos (`PlayerView`, `Action`, etc.). Trabalha **apenas** sobre a visão.
- Produces: `legalActions(view: PlayerView): Action[]`. Devolve representantes canônicos: K em prefixos (1, 2, … K), para cada papel a primeira carta real e o primeiro Selvagem, e um RESURRECT por valor distinto. A última ação da fase principal é sempre `DECLARE_ATTACK` ou `END_TURN`. Na janela de reação, a primeira é sempre `PASS`.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/legal-actions.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action';
import { legalActions } from '../src/legal-actions';
import { viewFor } from '../src/view';
import type { GameState, PlayerId } from '../src/types';
import { P1, P2, act, handId, player, setup } from './helpers';

const equipPhase = { round: 1, roundKind: 'EQUIP' as const, phase: { kind: 'EQUIP' as const } };

function reflectState(): GameState {
  const s = setup({
    p1: { hand: ['K', 'J', 'Q'] },
    p2: { hand: ['K', 'J', 'Q'], attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 },
  });
  return act(s, P1, { type: 'REFLECT', kId: handId(s, P1, 'K'), jId: handId(s, P1, 'J'), qId: handId(s, P1, 'Q') }).state;
}

describe('legalActions', () => {
  it('Equipar: todas as combinações de fileira', () => {
    const s = setup({ ...equipPhase, p1: { pending: [3, 4] } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal).toHaveLength(4);
    expect(legal).toContainEqual({ type: 'EQUIP', destinations: ['ATK', 'DEF'] });
  });

  it('Equipar com as duas fileiras cheias: substituir ou descartar', () => {
    const s = setup({ ...equipPhase, p1: { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 9], pending: [10] } });
    expect(legalActions(viewFor(s, P1))).toEqual([
      { type: 'EQUIP', destinations: ['REPLACE_LAST_ATK'] },
      { type: 'EQUIP', destinations: ['REPLACE_LAST_DEF'] },
      { type: 'EQUIP', destinations: ['DISCARD'] },
    ]);
  });

  it('fora da vez não há ações', () => {
    expect(legalActions(viewFor(setup(), P2))).toEqual([]);
  });

  it('turno: K em prefixos, Ás por alvo e o ataque por último', () => {
    const s = setup({ p1: { hand: ['K', 'K', 'A'], attack: [5] }, p2: { defenseBuffs: ['Q'], guard: 1 } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal.filter((a) => a.type === 'PLAY_K')).toHaveLength(2);
    expect(legal.filter((a) => a.type === 'TRAP')).toHaveLength(2);
    expect(legal[legal.length - 1]).toEqual({ type: 'DECLARE_ATTACK' });
  });

  it('sem Ás contra Defesa Absoluta; END_TURN com Ataque vazio', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal.some((a) => a.type === 'TRAP')).toBe(false);
    expect(legal).toContainEqual({ type: 'END_TURN' });
  });

  it('janela de Reflect: passar, anular ou proteger', () => {
    const legal = legalActions(viewFor(reflectState(), P2));
    expect(legal[0]).toEqual({ type: 'PASS' });
    expect(legal.some((a) => a.type === 'CANCEL_REFLECT')).toBe(true);
    expect(legal.some((a) => a.type === 'PROTECT_FROM_REFLECT')).toBe(true);
  });

  it('toda ação listada é aceita pelo motor', () => {
    const resurrection = setup({ p1: { attack: [7, 7, 7, 7], hand: ['W', 'J', 'Q', 'K'] }, graveyard: [5, 5, 6] });
    player(resurrection, P1).resurrections = [{ row: 'ATK', value: 7, formedAtRound: 3 }];
    const attackWindow = act(setup({ p1: { attack: [9], attackBuffs: ['J'], guard: 1 }, p2: { hand: ['A', 'W'] } }), P1, {
      type: 'DECLARE_ATTACK',
    }).state;
    const cases: Array<[GameState, PlayerId]> = [
      [setup({ ...equipPhase, p1: { pending: [3, 4, 5] } }), P1],
      [setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }), P1],
      [setup({ p1: { hand: ['K', 'K', 'A', 'J', 'Q', 'W'], attack: [5] }, p2: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } }), P1],
      [resurrection, P1],
      [attackWindow, P2],
      [reflectState(), P2],
    ];
    for (const [s, who] of cases) {
      const legal = legalActions(viewFor(s, who));
      expect(legal.length).toBeGreaterThan(0);
      for (const action of legal) {
        const result = applyAction(s, who, action);
        expect(result.ok, JSON.stringify(action)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine test test/legal-actions.test.ts`
Expected: FAIL. Não resolve `../src/legal-actions`.

- [ ] **Step 3: Implementar**

`packages/engine/src/legal-actions.ts`:
```ts
import type { Action, Destination, PlayerView, ReactionTrigger, SpecialCard, SpecialKind } from './types';

const firstOf = (cards: SpecialCard[], kind: SpecialKind): SpecialCard | undefined => cards.find((c) => c.kind === kind);
const defined = (c: SpecialCard | undefined): c is SpecialCard => c !== undefined;

/** Representantes canônicos para um papel: a primeira carta real do tipo e o primeiro Selvagem. */
function sources(hand: SpecialCard[], kind: 'J' | 'Q' | 'A'): SpecialCard[] {
  return [firstOf(hand, kind), firstOf(hand, 'WILD')].filter(defined);
}

function reflectCombos(hand: SpecialCard[]): Array<{ k: string; j: string; q: string }> {
  const k = firstOf(hand, 'K');
  if (!k) return [];
  const wilds = hand.filter((c) => c.kind === 'WILD').slice(0, 2);
  const js = [firstOf(hand, 'J'), ...wilds].filter(defined);
  const qs = [firstOf(hand, 'Q'), ...wilds].filter(defined);
  const combos: Array<{ k: string; j: string; q: string }> = [];
  for (const j of js) {
    for (const q of qs) {
      if (j.id !== q.id) combos.push({ k: k.id, j: j.id, q: q.id });
    }
  }
  return combos;
}

function equipOptions(view: PlayerView): Destination[][] {
  const limit = view.config.rowLimit;
  const results: Destination[][] = [];
  const walk = (i: number, atk: number, def: number, acc: Destination[]): void => {
    if (i === view.self.pending.length) {
      results.push(acc);
      return;
    }
    if (atk >= limit && def >= limit) {
      for (const d of ['REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD'] as const) walk(i + 1, atk, def, [...acc, d]);
      return;
    }
    if (atk < limit) walk(i + 1, atk + 1, def, [...acc, 'ATK']);
    if (def < limit) walk(i + 1, atk, def + 1, [...acc, 'DEF']);
  };
  walk(0, view.self.attackRow.length, view.self.defenseRow.length, []);
  return results;
}

function protectAction(view: PlayerView): Action[] {
  const j = view.self.attackBuffs.at(0);
  const q = view.self.defenseBuffs.at(0);
  const k = view.self.guard.at(0);
  return j && q && k ? [{ type: 'PROTECT_FROM_REFLECT', jId: j.id, qId: q.id, kId: k.id }] : [];
}

function mainOptions(view: PlayerView): Action[] {
  const { self, opponent, config, graveyard } = view;
  const actions: Action[] = [];
  if (self.attackBuffs.length < config.buffLimit) {
    for (const c of sources(self.hand, 'J')) actions.push({ type: 'PLAY_J', cardId: c.id });
  }
  if (self.defenseBuffs.length < config.buffLimit) {
    for (const c of sources(self.hand, 'Q')) actions.push({ type: 'PLAY_Q', cardId: c.id });
  }
  const kings = self.hand.filter((c) => c.kind === 'K');
  for (let n = 1; n <= kings.length; n += 1) {
    actions.push({ type: 'PLAY_K', cardIds: kings.slice(0, n).map((c) => c.id) });
  }
  if (!opponent.absoluteDefense) {
    const targets = [...opponent.attackBuffs, ...opponent.defenseBuffs, ...opponent.guard];
    for (const c of sources(self.hand, 'A')) {
      for (const t of targets) actions.push({ type: 'TRAP', cardId: c.id, targetId: t.id });
    }
    for (const c of sources(self.hand, 'J')) {
      for (const t of opponent.attackBuffs) actions.push({ type: 'SACRIFICE', cardId: c.id, targetId: t.id });
    }
    for (const c of sources(self.hand, 'Q')) {
      for (const t of opponent.defenseBuffs) actions.push({ type: 'SACRIFICE', cardId: c.id, targetId: t.id });
    }
  }
  if (!self.reflect) {
    for (const c of reflectCombos(self.hand)) actions.push({ type: 'REFLECT', kId: c.k, jId: c.j, qId: c.q });
  }
  if (opponent.reflect) actions.push(...protectAction(view));
  if (self.resurrections.length > 0) {
    const seen = new Set<number>();
    for (const card of graveyard) {
      if (card.kind !== 'NUM' || seen.has(card.value)) continue;
      seen.add(card.value);
      if (self.attackRow.length < config.rowLimit) actions.push({ type: 'RESURRECT', cardId: card.id, row: 'ATK' });
      if (self.defenseRow.length < config.rowLimit) actions.push({ type: 'RESURRECT', cardId: card.id, row: 'DEF' });
    }
  }
  actions.push(self.attackRow.length > 0 ? { type: 'DECLARE_ATTACK' } : { type: 'END_TURN' });
  return actions;
}

function reactionOptions(view: PlayerView, trigger: ReactionTrigger): Action[] {
  const { self, opponent } = view;
  const actions: Action[] = [{ type: 'PASS' }];
  if (trigger === 'REFLECT_PLAYED') {
    for (const c of reflectCombos(self.hand)) actions.push({ type: 'CANCEL_REFLECT', kId: c.k, jId: c.j, qId: c.q });
    actions.push(...protectAction(view));
    return actions;
  }
  if (opponent.absoluteDefense) return actions;
  const targets =
    trigger === 'K_PLAYED' ? opponent.guard : [...opponent.attackBuffs, ...opponent.defenseBuffs, ...opponent.guard];
  for (const c of sources(self.hand, 'A')) {
    for (const t of targets) actions.push({ type: 'TRAP', cardId: c.id, targetId: t.id });
  }
  return actions;
}

/** Jogadas canônicas disponíveis para quem vê `view`. Lista vazia = não é a vez dele. */
export function legalActions(view: PlayerView): Action[] {
  const phase = view.phase;
  switch (phase.kind) {
    case 'GAME_OVER':
      return [];
    case 'EQUIP':
      return view.self.equipSubmitted ? [] : equipOptions(view).map((destinations): Action => ({ type: 'EQUIP', destinations }));
    case 'ORDER_CHOICE':
      return phase.player === view.me
        ? [
            { type: 'CHOOSE_ORDER', first: true },
            { type: 'CHOOSE_ORDER', first: false },
          ]
        : [];
    case 'ATTACK_MAIN':
      return phase.player === view.me ? mainOptions(view) : [];
    case 'REACTION':
      return phase.responder === view.me ? reactionOptions(view, phase.trigger) : [];
  }
}
```

Acrescente ao fim de `packages/engine/src/index.ts`:
```ts
export { legalActions } from './legal-actions';
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm --filter @coringa/engine test test/legal-actions.test.ts`
Expected: PASS (7 testes).

Run: `pnpm check`
Expected: tudo passa.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/legal-actions.ts packages/engine/src/index.ts packages/engine/test/legal-actions.test.ts
git commit -m "feat(engine): lista de ações legais a partir da visão" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Testes de propriedade e gate de cobertura

**Files:**
- Create: `packages/engine/test/playout.ts`, `packages/engine/test/properties.test.ts`
- Modify: `package.json` (raiz), script `check`

**Interfaces:**
- Consumes: `createGame`, `applyAction`, `legalActions`, `viewFor`, `viewEvents`, `totalCards`, `makeConfig` e os helpers `P1`, `P2`, `allCards`.
- Produces: `actingPlayers(s): PlayerId[]` e `playout(options): { state; steps }` em `test/playout.ts`. São reaproveitáveis pelo simulador do Plano 2.

- [ ] **Step 1: Escrever o gerador de partidas aleatórias**

`packages/engine/test/playout.ts`:
```ts
import { applyAction } from '../src/apply-action';
import { makeConfig, type ConfigOverrides } from '../src/config';
import { createGame } from '../src/create-game';
import { legalActions } from '../src/legal-actions';
import { viewFor } from '../src/view';
import type { Action, GameEvent, GameState, PlayerId } from '../src/types';
import { P1, P2 } from './helpers';

export interface PlayoutOptions {
  seed: string;
  /** Escolhas pseudo-aleatórias, reutilizadas em ciclo. */
  choices: number[];
  config?: ConfigOverrides;
  maxSteps?: number;
  /** A cada N passos o sistema envia TIMEOUT (0 = nunca). */
  timeoutEvery?: number;
  checkImmutability?: boolean;
  onStep?: (before: GameState, after: GameState, events: GameEvent[]) => void;
}

/** Quem pode agir agora (no Equipar, quem ainda não confirmou). */
export function actingPlayers(s: GameState): PlayerId[] {
  const phase = s.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return s.players.filter((p) => !p.equipSubmitted).map((p) => p.id);
    case 'ORDER_CHOICE':
      return [phase.player];
    case 'ATTACK_MAIN':
      return [phase.player];
    case 'REACTION':
      return [phase.responder];
    case 'GAME_OVER':
      return [];
  }
}

export function playout(options: PlayoutOptions): { state: GameState; steps: number } {
  const created = createGame(makeConfig(options.config), options.seed, [P1, P2]);
  if (!created.ok) throw new Error(created.error.message);
  let s = created.state;
  const maxSteps = options.maxSteps ?? 20_000;
  const every = options.timeoutEvery ?? 0;
  let step = 0;
  while (s.phase.kind !== 'GAME_OVER' && step < maxSteps) {
    const choice = options.choices.length > 0 ? options.choices[step % options.choices.length] : step;
    let actor: PlayerId | 'system';
    let action: Action;
    if (every > 0 && step % every === every - 1) {
      actor = 'system';
      action = { type: 'TIMEOUT' };
    } else {
      const actors = actingPlayers(s);
      actor = actors[choice % actors.length];
      const legal = legalActions(viewFor(s, actor));
      action = legal[Math.floor(choice / actors.length) % legal.length];
    }
    const snapshot = options.checkImmutability ? JSON.stringify(s) : '';
    const result = applyAction(s, actor, action);
    if (options.checkImmutability && JSON.stringify(s) !== snapshot) {
      throw new Error('applyAction mutou o estado de entrada');
    }
    if (!result.ok) throw new Error(`ação legal rejeitada (${result.error.code}): ${JSON.stringify(action)}`);
    options.onStep?.(s, result.state, result.events);
    s = result.state;
    step += 1;
  }
  return { state: s, steps: step };
}
```

- [ ] **Step 2: Escrever os testes de propriedade**

`packages/engine/test/properties.test.ts`:
```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action';
import { totalCards } from '../src/deck';
import { legalActions } from '../src/legal-actions';
import { viewEvents, viewFor } from '../src/view';
import type { GameEvent, GameState } from '../src/types';
import { allCards } from './helpers';
import { actingPlayers, playout } from './playout';

const arbConfig = fc.record({
  initiativeChoice: fc.boolean(),
  tablePressure: fc.boolean(),
  wildJokers: fc.boolean(),
});
const arbChoices = fc.array(fc.nat(), { minLength: 1, maxLength: 64 });

/** Invariantes da spec §5. Usa checagens simples (sem `expect`) porque roda em todo passo. */
function checkInvariants(before: GameState, after: GameState, events: GameEvent[]): void {
  const cards = allCards(after);
  if (cards.length !== totalCards(after.config)) throw new Error(`cartas: ${cards.length}`);
  if (new Set(cards.map((c) => c.id)).size !== cards.length) throw new Error('carta duplicada');
  after.players.forEach((p, i) => {
    if (p.hp > before.players[i].hp) throw new Error('a vida aumentou');
  });
  for (const viewer of after.players) {
    const opponent = after.players.find((p) => p.id !== viewer.id);
    if (!opponent) throw new Error('sem oponente');
    const json = JSON.stringify(viewFor(after, viewer.id));
    if (json.includes('"rng"')) throw new Error('a visão expõe a semente');
    for (const c of [...opponent.hand, ...opponent.pending, ...after.deck]) {
      if (json.includes(`"${c.id}"`)) throw new Error(`vazamento na visão de ${viewer.id}: ${c.id}`);
    }
    for (const e of viewEvents(events, viewer.id)) {
      if (e.type === 'CardsDealt' && e.player !== viewer.id && e.cards) throw new Error('vazamento em CardsDealt');
    }
  }
}

describe('propriedades do motor (spec §5)', () => {
  it('partidas aleatórias terminam e respeitam conservação, vida e sigilo', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, fc.integer({ min: 0, max: 9 }), (seed, choices, config, timeoutEvery) => {
        const { state } = playout({ seed, choices, config, timeoutEvery, onStep: checkInvariants });
        expect(state.phase.kind).toBe('GAME_OVER');
      }),
      { numRuns: 60 },
    );
  });

  it('determinismo: mesma semente e mesmas escolhas → mesmo estado final', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, (seed, choices, config) => {
        expect(playout({ seed, choices, config }).state).toEqual(playout({ seed, choices, config }).state);
      }),
      { numRuns: 20 },
    );
  });

  it('applyAction nunca muta o estado de entrada (review focus 5)', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, (seed, choices) => {
        playout({ seed, choices, checkImmutability: true, maxSteps: 600 });
      }),
      { numRuns: 15 },
    );
  });

  it('toda ação listada por legalActions é aceita', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, (seed, choices, config) => {
        playout({
          seed,
          choices,
          config,
          maxSteps: 400,
          onStep: (_before, after) => {
            for (const who of actingPlayers(after)) {
              for (const action of legalActions(viewFor(after, who))) {
                const result = applyAction(after, who, action);
                if (!result.ok) throw new Error(`${result.error.code} em ${JSON.stringify(action)}`);
              }
            }
          },
        });
      }),
      { numRuns: 10 },
    );
  });
});
```

- [ ] **Step 3: Rodar as propriedades**

Run: `pnpm --filter @coringa/engine test test/properties.test.ts`
Expected: PASS (4 testes). Se alguma propriedade falhar, o fast-check imprime a semente e as escolhas mínimas que reproduzem a falha.
- Transforme esse contraexemplo em um teste de cenário no arquivo da tarefa responsável pela regra.
- Corrija o motor e rode de novo.
- Uma falha aqui é um bug do motor (ou do plano). Não afrouxe a propriedade.

- [ ] **Step 4: Ligar o gate de cobertura no `check`**

No `package.json` da raiz, troque o script `check` por:
```json
    "check": "pnpm lint && pnpm typecheck && pnpm -r test:coverage"
```

Run: `pnpm check`
Expected: lint, typecheck e testes passam, e a cobertura do motor fica ≥ 90% de linhas e branches. Se algum arquivo ficar abaixo:
- Abra `packages/engine/coverage/index.html`.
- Escreva testes de cenário para os ramos sem cobertura, no arquivo de teste da regra correspondente.
- Não baixe o threshold.

- [ ] **Step 5: Commit**

```bash
git add package.json packages/engine/test/playout.ts packages/engine/test/properties.test.ts
git commit -m "test(engine): propriedades (conservação, sigilo, determinismo, imutabilidade) e gate de cobertura" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cobertura da spec

| Spec | Tarefa |
|---|---|
| §1.1 baralho, Selvagens, vida | 1, 2 |
| §1.2 zonas e limites | 1, 4, 5, 7 |
| §1.3 ciclo de rodadas e iniciativa inicial | 4 |
| §1.4 Equipar, fileiras cheias, monte vazio, garantia de compra | 1, 4, 5 |
| §1.5 turno de ataque e expiração de efeitos | 7 |
| §1.6 J, Q, K, A, Sacrifício, Selvagem, Reflect | 7, 8, 9 |
| §1.7 janela de reação | 7, 8, 9 |
| §1.8 Fallen is Back, Absolutos, Exódia | 3, 6, 7, 8, 10 |
| §1.9 resolução do ataque | 6 |
| §1.10 iniciativa e Escolha da iniciativa | 5, 7 |
| §1.11 Pressão da mesa, anti-travamento, fim de jogo | 4, 6, 7 |
| §1.12 TIMEOUT (os timers ficam no servidor, Plano 3) | 5, 7 |
| §1.13 exemplos 1 a 7 | 3, 6, 7, 9 |
| §2 API, estado, fases, ações, eventos, informação oculta, config | 1–13 |
| §5 testes de cenário e invariantes | todas; propriedades na 13 |
| §3 simulador e §4 jogo no terminal | **Plano 2** |
