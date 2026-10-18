# Interface web — Plano de Implementação (Plano 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o sub-projeto 3, que fecha o MVP: dois amigos jogam uma partida online pelo navegador, entrando por um link, com a mesa da direção "A Peleja do Coringa", jogável no celular em pé e no PC, mais um treino local contra o bot.

**Architecture:**
- Primeiro, as peças que a web consome nos pacotes que já existem:
  - o motor exporta a prévia de ataque, o preenchimento do Equipar e as quadras de uma fileira;
  - o protocolo ganha a marca `auto`, o `wake()` e o prazo de `ack`;
  - o servidor não zera os estouros por jogada `auto`;
  - o simulador exporta bots e textos para o navegador.
- Depois, o pacote novo `@coringa/web`. É um núcleo puro em `src/model` (sessão, jogadas, Equipar, marcas, relógio, linha do tempo, sala local), testado no Node com cobertura, e uma casca React em `src/ui` e `src/app`.
- O mesmo Worker serve a web construída (static assets). O E2E roda num job próprio da CI.

**Tech Stack:**

| Ferramenta | Versão |
|---|---|
| Node | ≥ 24.2 |
| pnpm | 11.9 |
| TypeScript | ~6.0.3 |
| Vite | ^8 |
| Vitest | ^5 (v8 no Node; jsdom para componentes) |
| React / React DOM | ^19 |
| `@vitejs/plugin-react` | a versão que declara suporte a Vite 8 (conferir no npm na hora) |
| Tailwind CSS | ^4, com `@tailwindcss/vite` |
| Motion | ^12 (`motion/react`, com `LazyMotion` + `domAnimation`) |
| Testing Library | `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` |
| jsdom | a versão aceita pelo Vitest 5 |
| `axe-core` | ^4 (componentes); `@axe-core/playwright` ^4 (E2E) |
| Playwright | `@playwright/test` ^1, só Chromium |
| Fontes | `@fontsource/alfa-slab-one`, `@fontsource-variable/archivo` (SIL OFL) |
| Wrangler | ^4.151 (já no servidor) |

**Spec:** `docs/superpowers/specs/2026-10-17-interface-web-design.md`, aprovada em 2026-10-17. Leia inteira: cada tarefa cita as seções que implementa. A spec do servidor (`2026-10-16-servidor-multiplayer-design.md`) foi atualizada na §4.3 e na §7.3 (marca `auto`). A do motor (`2026-10-15-…`) dá as regras de §1.6–§1.9 que a prévia reproduz.

**Onde executar:**
- Branch `feat/web`, criada a partir de `claude/hungry-cannon-77b7e8` (que tem a spec e este plano), num worktree de **caminho curto**, por exemplo `D:\andr3\jogo-coringa-web`. O `workerd.exe` dos testes do servidor precisa caber em 260 caracteres (`CLAUDE.md`).
- Rode `pnpm install` no worktree antes do primeiro commit: os hooks do `.git/hooks` comum rodam em todas as pastas.
- **Push, PR e merge** estão autorizados aos agentes até o MVP, com `pnpm check` e a CI verdes.
  - O `gh` não está instalado. O PR abre por `https://github.com/andr3serafim/jogo-do-coringa/pull/new/feat/web`, ou o merge é por fast-forward na `main`, conferindo a CI pela API pública.
  - Com o job `e2e` (Tarefa 25), o merge exige os dois jobs verdes.
- Credenciais da Cloudflare (`wrangler login`, deploy) são só do autor.

## Global Constraints

**Versões e pacotes**
- Node ≥ 24.2, pnpm 11.9.0, TypeScript ~6.0.3.
- Toda versão nova entra com `^`: o `minimumReleaseAge` do pnpm 11 recusa versão publicada há pouco e escreveria exceções no workspace. Se o pnpm barrar um script de instalação novo, revise e libere em `allowBuilds` com um comentário.

**Node puro e bundler**
- Motor, protocolo, simulador e núcleo do servidor continuam rodando no **Node puro**:
  - imports relativos com `.ts`;
  - só sintaxe apagável;
  - `import type` para tipos;
  - nunca `--preserve-symlinks`.
- `packages/web` é a única exceção com bundler, e nunca empurra para os outros pacotes algo que só funcione com bundler.
- A web nunca importa `@coringa/protocol/schemas` nem `node:*` (o ESLint barra).

**Textos**
- Textos e comentários em pt-BR, identificadores em inglês.

**Sem regra na interface**
- Totais vêm de `attackPower`/`defensePower`; a prévia, de `previewAttack`; o preenchimento do Equipar, de `autoDestinations`; as quadras, de `quadValues`; as jogadas, de `legalActions`.

**Valores fixos da spec**
- **Jogadas automáticas** (`auto`):
  - o passe automático só existe quando `PASS` é a única jogada legal e a preferência está ligada (padrão: ligada);
  - a confirmação automática da ordem dispara 3000 ms depois de o painel aparecer, contados de quando o `state` chega mais a duração das batidas;
  - o envio antecipado do Equipar acontece quando faltam 1500 ms, só com ≥ 1 escolha, e **sem** `auto`.
- **Conexão:** `pong` em até 2000 ms na volta da aba; `ack` em até 5000 ms.
- **Batidas da linha do tempo:**
  - mover 300 ms, número de dano 600 ms, faixa 400 ms, cena até 1500 ms;
  - se uma decisão do jogador espera, tudo cabe em 1000 ms;
  - `catchUp` em velocidade dobrada, sem cenas, com teto de 3000 ms;
  - `resync` sem batidas.
- **Fotossensibilidade:**
  - no máximo 1 inversão por cena, mantida por ≥ 300 ms;
  - nunca mais de 3 transições claro ↔ escuro numa janela de 1 s;
  - com movimento reduzido, nenhuma inversão.
- **Layout:**
  - celular de 360 a 430 px, tablet de 600 a 1023, PC a partir de 1024;
  - 7 cartas por fileira cabem em 360 px sem rolagem de lado;
  - alvo de toque ≥ 44 px.
- **Paleta (spec §10.3):** `tinta #17120F`, `papel #F1F0EA`, `capa-oponente #6FA86C`, `capa-voce #EE9DB5`, `vermelho #B8261C`, `ouro #F5C238`.
- **Fontes:**
  - Alfa Slab One (títulos, botões, valor das cartas);
  - Archivo (texto e números de jogo, com `tabular-nums`);
  - a textura nunca entra em vida, ATK/DEF, conta das fileiras, prévia, relógio ou placar.

**Segurança e reprodutibilidade**
- O token nunca vai para a URL, o console, uma mensagem de erro ou o diagnóstico.
- **Sementes fixas em tudo o que for aleatório nos testes:** partidas, bots, ids. A CI da `main` já falhou uma vez sem log legível por causa de um teste dependente do sorteio.
- As partidas de referência do motor não mudam: nenhum `vitest -u` neste plano.

**Cobertura**
- v8 ≥ 90% de linhas e branches em `packages/web/src/model`. As metas atuais do motor, do protocolo e do núcleo do servidor continuam. Componentes não têm meta.

**Portão**
- `pnpm check` antes de commitar. Nunca `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- **Orçamento:** JavaScript inicial ≤ 200 KB comprimido (gzip). O bot do treino é carregado por `import()`.

## Review Focus

1. **Toque duplo em "Atacar" no celular** → um único `act` sai; o segundo toque não faz nada enquanto a jogada está pendente. *Teste na Tarefa 14: `play` chamado duas vezes seguidas manda uma mensagem só.*
2. **Link colado com espaços, minúsculas ou a URL inteira** no campo "Entrar" (`"  https://x.dev/s/7kq2md "`) → vira o código `7KQ2MD` e abre a sala. *Teste na Tarefa 17.*
3. **Apelido só com espaços, com emoji ou com 21 caracteres** → o erro aparece no campo antes de qualquer chamada HTTP, pelas mesmas regras do servidor (`normalizeNickname`). *Teste na Tarefa 17.*
4. **Relógio do celular com minutos de diferença** → o relógio da mesa mostra o tempo do servidor. *Teste na Tarefa 9: `clockFace` usa o `remainingMs` da conexão, com o `Date.now` local adiantado 3 min.*
5. **Página recarregada depois de confirmar o Equipar e antes da revelação** → a mesa mostra "Você já confirmou; esperando Duda", sem rascunho e sem oferecer destinos de novo. *Teste na Tarefa 15.*

---

## Estrutura de arquivos

```
eslint.config.js                 # .tsx, react-hooks, extensões na web, node:* barrado (Tarefas 5 e 6)
scripts/check-fast.ts            # isSource aceita .tsx (Tarefa 6)
package.json                     # dev:web, e2e (Tarefas 6, 7, 25)
.github/workflows/check.yml      # job e2e (Tarefa 25)
CLAUDE.md                        # regras da web (Tarefa 26)
packages/engine/src/actions/equip.ts   # autoDestinations exportada, nova assinatura (Tarefa 1)
packages/engine/src/preview.ts         # previewAttack/previewBetween (Tarefa 2)
packages/engine/src/combat.ts          # resolveAttack usa previewBetween (Tarefa 2)
packages/engine/src/index.ts           # novas exportações (Tarefas 1 e 2)
packages/protocol/src/{messages,schemas,constants,client}.ts  # auto, wake, pong, prazo de ack (Tarefa 3)
packages/server/src/core/{types,game}.ts                      # auto não zera estouros (Tarefa 4)
packages/server/wrangler.jsonc, package.json, scripts/        # assets da web (Tarefa 7)
packages/sim/package.json              # exports ./bots ./rng ./text (Tarefa 5)
packages/web/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  index.html  LICENSES.md
  playwright.config.ts  scripts/smoke.ts  public/_headers
  src/main.tsx  src/styles.css
  src/model/storage.ts      # token, lastSeq, apelido, preferências, diagnóstico
  src/model/clock.ts        # face do relógio
  src/model/copy.ts         # textos de interface em pt-BR
  src/model/plays.ts        # jogadas por carta, combinações, alvos, comparação com legalActions
  src/model/equip.ts        # rascunho do Equipar
  src/model/marks.ts        # "fica aceso até você ver"
  src/model/timeline.ts     # eventos → batidas, cenas, fotossensibilidade
  src/model/session.ts      # conexão, sala, state, pendência, acks, fechamentos
  src/model/automation.ts   # passe automático, ordem automática, envio do Equipar
  src/model/local-room.ts   # LocalRoom (treino)
  src/app/{App,router,ErrorBoundary}.tsx
  src/ui/useSession.ts
  src/ui/cards/{Suit,Coringa,Card}.tsx
  src/ui/screens/{Home,RoomGate,Lobby,Stopped,NotFound,Training}.tsx
  src/ui/table/{Table,PlayerField,Row,CenterBand,Hand,History,ActionBar,EquipPanel,OrderPanel,ReactionPanel,Banners,EndPanel,GameMenu,GraveyardDialog,RulesDialog}.tsx
  src/ui/anim/{Stage,Scene}.tsx
  test/fixtures.ts          # partidas com semente fixa, FakeConnection, HTTP falso
  test/model/*.test.ts      # Node
  test/ui/*.test.tsx        # jsdom
  e2e/*.spec.ts             # Playwright
```

---

### Tarefa 1: Motor — `autoDestinations` e `quadValues` exportadas

Spec §3.5 (envio antecipado), §8.2.

**Files:**
- Modify: `packages/engine/src/actions/equip.ts` (`autoDestinations` e `timeoutEquip`), `packages/engine/src/index.ts`
- Test: `packages/engine/test/equip-order.test.ts`, `packages/engine/test/exports.test.ts`

**Interfaces:**
- Produces:
  - `autoDestinations(config: Pick<RulesConfig, 'rowLimit'>, rows: { attack: number; defense: number }, count: number): Destination[]`, exportada no `index.ts`. A regra é a de hoje: a fileira com menos cartas; empate → `DEF`; uma cheia → a outra; as duas cheias → `DISCARD`.
  - `quadValues(cards: NumCard[]): Rank[]` (já existe em `quads.ts`), exportada no `index.ts`.

- [ ] **Step 1: Testes que falham** em `equip-order.test.ts`, `describe('autoDestinations')`, com `rowLimit` 7:
  - `{3,5}` com 4 → `['ATK','ATK','DEF','ATK']`;
  - `{2,2}` com 1 → `['DEF']`;
  - `{7,3}` com 2 → `['DEF','DEF']`;
  - `{3,7}` com 1 → `['ATK']`;
  - `{6,7}` com 3 → `['ATK','DISCARD','DISCARD']`;
  - `{7,7}` com 2 → `['DISCARD','DISCARD']`.

  Em `exports.test.ts`, inclua `'autoDestinations'` e `'quadValues'` na lista de funções exportadas.
- [ ] **Step 2:** `pnpm --filter @coringa/engine exec vitest run test/equip-order.test.ts test/exports.test.ts` → FAIL (não exportadas, assinatura diferente).
- [ ] **Step 3:** Mude a assinatura de `autoDestinations`. `timeoutEquip` passa a chamar `autoDestinations(s.config, { attack: p.attackRow.length, defense: p.defenseRow.length }, p.pending.length)`. Exporte as duas no `index.ts`.
- [ ] **Step 4:** `pnpm --filter @coringa/engine test` → PASS, com as partidas de referência (`golden.test.ts`) iguais, sem `-u`.
- [ ] **Step 5:** Commit `feat(engine): exporta autoDestinations e quadValues para a interface`.

---

### Tarefa 2: Motor — `previewAttack`, com `resolveAttack` usando a mesma conta

Spec §8.2, §3.4 (prévia no Atacar), §3.7 (prévia na reação); regras na spec 1 §1.6 (Reflect), §1.8 (Absolutos) e §1.9 (resolução).

**Files:**
- Create: `packages/engine/src/preview.ts`
- Modify: `packages/engine/src/combat.ts` (`resolveAttack`), `packages/engine/src/index.ts`
- Test: `packages/engine/test/preview.test.ts`, `packages/engine/test/exports.test.ts`

**Interfaces:**
- Consumes: `attackPower`, `defensePower`, `defenseBase` (`combat.ts`).
- Produces (`preview.ts`, exportados no `index.ts`):
  ```ts
  export type AttackOutcome = 'NO_ATTACK' | 'DAMAGE' | 'GUARD_ABSORBS' | 'ABSOLUTE_DEFENSE' | 'REFLECTED';
  export interface CombatSide extends AttackSide, DefenseSide { guard: readonly unknown[]; reflect: unknown | null; absoluteDefense: boolean }
  export interface AttackPreview {
    outcome: AttackOutcome;
    attack: number;     // ATK do atacante (com multiplicador e pressão)
    defense: number;    // DEF usada na conta; no Reflect, ⌊DEF_base do atacante / 2⌋
    net: number;        // max(0, attack − defense)
    damage: number;     // dano na vida do defensor
    reflected: number;  // dano na vida do atacante (Reflect)
    absolute: boolean;  // Ataque Absoluto (nJ ≥ buffLimit)
    breaks: { defenderGuard: number; attackerGuard: number; attackerQueens: number };
  }
  export function previewBetween(attacker: CombatSide, defender: CombatSide, pressure: number, config: Pick<RulesConfig, 'buffLimit'>): AttackPreview;
  export function previewAttack(view: PlayerView, attacker: 'self' | 'opponent'): AttackPreview;
  ```
- A conta segue a ordem de `resolveAttack` hoje:
  1. Ataque vazio → `NO_ATTACK`, tudo zero.
  2. Reflect no defensor:
     - quebram todos os K do atacante;
     - sem Defesa Absoluta no atacante, quebram também todas as Q dele, e `reflected = max(0, attack − ⌊defenseBase(atacante)/2⌋)`;
     - com Defesa Absoluta no atacante, `reflected = 0` e as Q ficam.
  3. Ataque Absoluto → quebram todos os K do defensor.
  4. Defesa Absoluta no defensor:
     - sem Ataque Absoluto → `ABSOLUTE_DEFENSE`, dano 0;
     - com Ataque Absoluto → `DAMAGE`, com `max(0, attack − defense)`.
  5. Caso geral: `net > 0` com K restante → `GUARD_ABSORBS` (1 K) e dano 0; senão `DAMAGE` com `net`, que pode ser 0.

- [ ] **Step 1: Testes literais que falham** em `preview.test.ts`, montados com `setup` de `helpers.ts` e lidos pela `view` de P1 (`previewAttack(view, 'self')`):
  - **exemplo 1 da spec 1 §1.13:** `attack [3,7,9]` + 1 J contra `defense [5,8]` → `{ outcome: 'DAMAGE', attack: 38, defense: 13, damage: 25 }`;
  - **exemplo 2:** `attack [10,10,10]` contra `defense [10,10]` com `guard: 2` → `GUARD_ABSORBS`, `damage 0`, `breaks.defenderGuard 1`;
  - **exemplo 3:**
    - montagem: P1 com `attack [6,8,9]`, 1 J, `defense [4,10]`, 1 Q e `guard 2`, contra P2 com `reflect: true`;
    - resultado: `REFLECTED`, `attack 46`, `defense 7`, `reflected 39`, `damage 0`, `breaks { attackerGuard: 2, attackerQueens: 1, defenderGuard: 0 }`;
  - **exemplo 5:** `attack [5,6,7]` com 4 J contra `defense [8,9]` com 4 Q, `absoluteDefense` e `guard 1` → `DAMAGE`, `attack 90`, `defense 85`, `damage 5`, `absolute true`, `breaks.defenderGuard 1`;
  - **exemplo 6:** `pressure 2`, `attack [4,6]` + 1 J → `attack 40`;
  - **Defesa Absoluta sem Ataque Absoluto** → `ABSOLUTE_DEFENSE`, `damage 0`;
  - **Ataque vazio** → `NO_ATTACK`;
  - **atacante sob Defesa Absoluta contra Reflect** → `REFLECTED`, `reflected 0`, `attackerQueens 0`, `attackerGuard` igual aos K dele;
  - **`previewAttack(view, 'opponent')`:** a ameaça do oponente sobre a sua Defesa dá o mesmo número que `previewBetween(opponent, self, …)`.
- [ ] **Step 2: Teste de propriedade que falha**, `preview bate com a resolução`:
  - 40 partidas por `playout` (`playout.ts`), com sementes `preview-0` … `preview-39`;
  - o `chooser` escolhe pelas `choices`, mas sempre responde `PASS` numa janela com gatilho `ATTACK`;
  - antes de cada `DECLARE_ATTACK`, guarda `previewAttack(viewFor(s, atacante), 'self')`;
  - no passo do `PASS` seguinte, confere:
    - `DamageDealt.damage === preview.damage`, ou `ReflectTriggered.damage === preview.reflected`;
    - a soma dos `GuardBroken.cards.length` = `defenderGuard + attackerGuard`.

  Exige ao menos 100 ataques conferidos no total e pelo menos 1 de cada desfecho `DAMAGE`, `GUARD_ABSORBS` e `REFLECTED`. Se faltar algum, aumente as partidas, nunca afrouxe a conferência.
- [ ] **Step 3:** `pnpm --filter @coringa/engine exec vitest run test/preview.test.ts` → FAIL.
- [ ] **Step 4:** Implemente `preview.ts`. Refatore `resolveAttack` para calcular `previewBetween(attacker, defender, s.pressure, s.config)` no começo e aplicar os efeitos a partir dele, emitindo os mesmos eventos, na mesma ordem.
- [ ] **Step 5:** `pnpm --filter @coringa/engine test` → PASS, **com `golden.test.ts` e os snapshots iguais** (sem `-u`). Se um snapshot mudar, a refatoração mudou regra: desfaça e corrija.
- [ ] **Step 6:** Commit `feat(engine): previewAttack e resolveAttack sobre a mesma conta`.

---

### Tarefa 3: Protocolo — marca `auto`, `wake()`, `pong` com prazo e prazo de `ack`

Spec §5 (protocolo), §6.2 e §8.1; spec 2 §4.3.

**Files:**
- Modify: `packages/protocol/src/messages.ts`, `schemas.ts`, `constants.ts`, `client.ts`
- Modify: `packages/sim/test/online.test.ts` (o `FakeConnection` ganha `connect`/`wake` vazios)
- Test: `packages/protocol/test/schemas.test.ts`, `packages/protocol/test/client.test.ts`

**Interfaces:**
- Produces:
  - em `ClientMessage`, o `act` vira `{ t: 'act'; id; epoch; action: PlayerAction; auto?: true }`; no esquema, `auto: z.literal(true).optional()`;
  - `PONG_TIMEOUT_MS = 2_000` e `ACK_TIMEOUT_MS = 5_000` em `constants.ts`;
  - em `RoomConnection` (e no `RoomClient`):
    - `connect(): void`;
    - `wake(): void`;
    - `act(action: PlayerAction, options?: { auto?: boolean }): Promise<AckMessage>`, que só põe `auto: true` na mensagem quando `options.auto` é verdadeiro.
- **`wake()`:**
  - com reconexão agendada → cancela a espera e abre o socket na hora;
  - com socket aberto → manda `ping` e arma o prazo de `pong`;
  - fechado de vez → nada.
- **Socket morto:** sem `pong` no prazo, ou um `act`/`concede` sem `ack` em `ACK_TIMEOUT_MS`:
  - o cliente solta o socket (desliga os handlers e fecha);
  - emite `{ type: 'closed', code: 1006, final: false }`;
  - resolve as pendências com `DISCONNECTED`;
  - abre outro socket na hora (sem espera).
  - O `pong` que chega desarma o prazo.

- [ ] **Step 1: Testes que falham.**
  - **`schemas.test.ts`:**
    - `act` com `auto: true` é aceito;
    - com `auto: false` ou `auto: 1` é recusado;
    - sem `auto` continua aceito.
  - **`client.test.ts`** (relógio e WebSocket falsos que o arquivo já usa):
    - `act(PASS, { auto: true })` manda `"auto":true`, e `act(PASS)` não manda a chave;
    - `wake()` com reconexão agendada abre o socket sem esperar o atraso;
    - `wake()` com socket aberto manda `ping`; sem `pong` em 2000 ms → evento `closed` com `final: false` e um socket novo aberto na hora;
    - com `pong` em 1500 ms, nada acontece;
    - `act` sem `ack` em 5000 ms → resolve `{ ok: false, code: 'DISCONNECTED' }` e reconecta.
- [ ] **Step 2:** `pnpm --filter @coringa/protocol test` → FAIL.
- [ ] **Step 3:** Implemente. Os timers de `pong` e de `ack` usam `setTimer`/`clearTimer` injetados, como o resto do cliente. Ajuste o `FakeConnection` do sim.
- [ ] **Step 4:** `pnpm --filter @coringa/protocol test` e `pnpm --filter @coringa/sim test` → PASS, com a cobertura do protocolo ≥ 90%.
- [ ] **Step 5:** Commit `feat(protocol): marca auto, wake() e prazos de pong e ack no RoomClient`.

---

### Tarefa 4: Servidor — jogada `auto` não zera os estouros, inclusive no PASS guardado

Spec §5; spec 2 §7.3.

**Files:**
- Modify: `packages/server/src/core/types.ts` (`heldPass`), `packages/server/src/core/game.ts` (`playerAct`, `applyHeldPass`)
- Test: `packages/server/test/core/timers.test.ts`

**Interfaces:**
- Consumes: `act.auto` (Tarefa 3).
- Produces:
  - `heldPass: { epoch: number; id: string; auto?: true } | null`;
  - `playerAct(record, seat, msg: { id; epoch; action: PlayerAction; auto?: true }, now)`:
    - passa `{ automatic: msg.auto === true }` ao `commitStep`;
    - guarda `auto` no `heldPass`;
  - `applyHeldPass` passa `{ automatic: held.auto === true }` ao `injectStep`.
- **Esquema:** `STATE_SCHEMA` não muda. Um registro antigo sem `auto` vale como manual.

- [ ] **Step 1: Testes que falham** em `timers.test.ts`, `describe('marca auto')`, com o `Harness` e semente fixa:
  - três estouros de turno de p2, com um PASS `auto` de p2 numa janela entre eles → W.O. com causa `AFK`. Faça duas versões:
    - o PASS chega a 0,5 s da abertura (guardado e aplicado pelo alarme `reactionMin`);
    - o PASS chega a 3 s (aplicado na hora);
  - um PASS sem `auto` no mesmo ponto zera a contagem (`strikes.p2 === 0`);
  - `CHOOSE_ORDER` com `auto` não zera; sem `auto`, zera.
- [ ] **Step 2:** `pnpm --filter @coringa/server exec vitest run test/core/timers.test.ts` → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `pnpm --filter @coringa/server test` → PASS (Node e workerd), com a cobertura do núcleo ≥ 90%.
- [ ] **Step 5:** Commit `feat(server): jogada auto não zera os estouros, inclusive no PASS guardado`.

---

### Tarefa 5: Simulador — `exports` para o navegador

Spec §1.4.

**Files:**
- Modify: `packages/sim/package.json`, `eslint.config.js`
- Test: `packages/sim/test/exports.test.ts` (novo)

**Interfaces:**
- Produces:
  - `@coringa/sim/bots` → `src/bots/index.ts` (`BOTS`, `BotName`, `Bot`);
  - `@coringa/sim/rng` → `src/rng.ts` (`createRng`, `Rng`);
  - `@coringa/sim/text` → `src/play/text.ts` (`cardText`, `actionText`, `eventText`, `resultText`, `namesFor`, `Names`, `ROW_NAME`, `DESTINATION_TEXT`, `findCard`).

- [ ] **Step 1: Teste que falha.** `exports.test.ts` importa pelos três subpaths (pelo nome do pacote, como a web vai importar) e confere que:
  - `BOTS.greedy` é função;
  - `createRng('x')` é determinístico;
  - `cardText` de um 7 de copas é `'7♥'`.
- [ ] **Step 2:** `pnpm --filter @coringa/sim exec vitest run test/exports.test.ts` → FAIL (o pacote não resolve os subpaths por nome).
- [ ] **Step 3:** Ajuste o pacote e o ESLint.
  - Acrescente `"exports": { "./bots": "./src/bots/index.ts", "./rng": "./src/rng.ts", "./text": "./src/play/text.ts" }`. Ninguém importa a raiz do pacote hoje (spec §1.4).
  - Para o sim resolver o próprio nome, acrescente `"@coringa/sim": "workspace:*"` nas `devDependencies` dele. Se o pnpm recusar a autorreferência, troque o teste para importar pelos caminhos dos `exports`.
  - No `eslint.config.js`, acrescente um bloco que barra `node:*` (`no-restricted-imports`) em `packages/sim/src/bots/**`, `packages/sim/src/rng.ts` e `packages/sim/src/play/text.ts`.
- [ ] **Step 4:** `pnpm lint` e `pnpm --filter @coringa/sim test` → PASS.
- [ ] **Step 5:** Commit `feat(sim): exports bots, rng e text para o navegador`.

---

### Tarefa 6: Pacote `@coringa/web` — esqueleto, tema da Peleja, ferramentas e portão

Spec §1.1, §1.2, §9.1, §9.3, §10.2, §10.3, §10.6, §12.

**Files:**
- Create:
  - `packages/web/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `LICENSES.md`, `scripts/smoke.ts`;
  - `src/main.tsx`, `src/styles.css`, `src/app/App.tsx`;
  - `test/ui/app.test.tsx`, `test/model/smoke.test.ts`.
- Modify: `eslint.config.js`, `scripts/check-fast.ts`, `packages/sim/test/check-fast.test.ts`, `package.json` (raiz)

**Interfaces:**
- **Scripts de `packages/web/package.json`:**
  - `dev` (`vite`);
  - `build` (`vite build`);
  - `typecheck` (`tsc -p tsconfig.json`);
  - `test` (`vitest run`);
  - `test:coverage` (`vitest run --coverage`);
  - `smoke` (`vite build && node scripts/smoke.ts`).
- Na raiz, `dev:web` → `pnpm --filter @coringa/web dev`.
- **Dependências de workspace:** `@coringa/engine`, `@coringa/protocol` e `@coringa/sim`.
- **`tsconfig.json`:** estende `../../tsconfig.base.json` com `jsx: "react-jsx"`, `lib: ["ES2023", "DOM", "DOM.Iterable"]` e `types: ["vite/client"]`. Inclui `src`, `test`, `e2e`, `scripts` e as configurações.
- **`vitest.config.ts`:**
  - dois projetos: `model` (Node, `test/model/**/*.test.ts`) e `ui` (jsdom, `test/ui/**/*.test.tsx`, com `@testing-library/jest-dom`);
  - cobertura v8 com `include: ['src/model/**/*.ts']`, `exclude: ['src/model/copy.ts']` e `thresholds: { lines: 90, branches: 90 }`.
- **`styles.css`:**
  - `@import "tailwindcss"`;
  - um `@theme` com as cores de §10.3 (`--color-tinta`, `--color-papel`, `--color-capa-oponente`, `--color-capa-voce`, `--color-vermelho`, `--color-ouro`);
  - `--font-madeira: 'Alfa Slab One'`, `--font-texto: 'Archivo Variable'`;
  - os pontos de quebra `tablet: 600px` e `pc: 1024px`;
  - `::selection`, `caret-color`, `:focus-visible` (contorno ouro) e a barra de rolagem, na paleta.
- **Fontes:** importadas em `main.tsx` dos pacotes `@fontsource/alfa-slab-one` e `@fontsource-variable/archivo`, só o subconjunto latino (confira os nomes dos CSS de subconjunto dentro de cada pacote). O Vite empacota os `woff2` no `dist`: nada do Google em tempo de execução.
- **`LICENSES.md`:** fonte, versão, licença (SIL OFL 1.1) e o caminho do arquivo de licença dentro do pacote.

- [ ] **Step 1: Testes que falham.**
  - `test/ui/app.test.tsx`: `<App />` desenha o título "Jogo do Coringa" (`getByRole('heading', { name: /Jogo do Coringa/ })`).
  - `test/model/smoke.test.ts`: importa `legalActions` do motor e `normalizeCode` do protocolo (prova que os pacotes resolvem na web).
  - `packages/sim/test/check-fast.test.ts`: `groupByPackage(['packages/web/src/ui/Card.tsx'])` → `[{ dir: 'packages/web', files: ['src/ui/Card.tsx'] }]`.
- [ ] **Step 2:** `pnpm --filter @coringa/sim exec vitest run test/check-fast.test.ts` → FAIL (`.tsx` ignorado).
- [ ] **Step 3: Crie o pacote e ajuste as ferramentas.**
  - Crie o pacote com as dependências de Tech Stack, todas com `^`.
  - No `scripts/check-fast.ts`, o `isSource` passa a aceitar `.ts` e `.tsx` (fora `.d.ts`).
  - No `eslint.config.js`:
    - o bloco de `**/*.ts` passa a `**/*.{ts,tsx}`;
    - em `packages/web/**`, o seletor de import relativo passa a exigir `.ts`, `.tsx` ou `.css` (`/\.(ts|tsx|css)$/`);
    - entra o `eslint-plugin-react-hooks` (regras recomendadas) nos `.tsx`;
    - `no-restricted-imports` barra `@coringa/protocol/schemas` e `node:*` em `packages/web/src/**`;
    - `packages/web/dist/**`, `playwright-report/**` e `test-results/**` vão para os ignores.
- [ ] **Step 4: `scripts/smoke.ts` da web** roda depois do `vite build`:
  - lê o `dist/index.html` e os `.js` iniciais (os que o HTML referencia e os `modulepreload`);
  - falha se a soma gzip (`node:zlib`) passar de 200 KB;
  - falha se algum `.js` do `dist` contém a marca do Zod (`ZodError`);
  - imprime os tamanhos.
- [ ] **Step 5:** `pnpm install`, depois `pnpm --filter @coringa/web test`, `pnpm --filter @coringa/web smoke` e `pnpm check` → PASS. Anote no commit o tempo do `pnpm check` antes e depois.
- [ ] **Step 6:** Commit `feat(web): esqueleto do pacote, tema da Peleja e portão de testes`.

---

### Tarefa 7: O Worker serve a web

Spec §11.

**Files:**
- Modify: `packages/server/wrangler.jsonc`, `packages/server/package.json` (scripts `typecheck`, `test`, `test:coverage`, `smoke`, `dev`, `deploy`), `packages/server/scripts/deploy.ts`
- Create:
  - `packages/web/public/_headers`;
  - `packages/server/scripts/ensure-assets.ts` (só se o Step 2 mostrar que precisa);
  - `packages/server/test/worker/assets.test.ts`.
- Modify: `packages/web/vite.config.ts` (proxy)

**Interfaces:**
- No `wrangler.jsonc`, `"assets": { "directory": "../web/dist", "not_found_handling": "single-page-application", "run_worker_first": ["/api/*"] }`, sem `binding`.
- **`_headers`**, para `/*`:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
  - `Referrer-Policy: same-origin`;
  - `X-Content-Type-Options: nosniff`.
  - Para `/assets/*`, `Cache-Control: public, max-age=31536000, immutable`.
- **Proxy do Vite:** `server.proxy` com `'/api': { target: 'http://localhost:8787', ws: true }`.

- [ ] **Step 1: Teste que falha** em `assets.test.ts` (workerd), com o `dist` reservado ou construído:
  - `SELF.fetch('http://x/s/7KQ2MD')` → 200 com `text/html`;
  - `SELF.fetch('http://x/api/health')` continua `{ ok: true }`;
  - `SELF.fetch('http://x/api/nada')` continua 404 JSON.

  Se o projeto de testes no workerd não servir static assets pelo `SELF`, confira o comportamento: rode `wrangler dev` e faça as três chamadas por `fetch` num teste do E2E (Tarefa 25). Registre no commit qual caminho ficou.
- [ ] **Step 2: Confira o comportamento com a pasta ausente.** Apague `packages/web/dist` e rode, um de cada vez:
  - `pnpm --filter @coringa/server typecheck`;
  - `pnpm --filter @coringa/server exec vitest run -c vitest.worker.config.ts`;
  - `pnpm --filter @coringa/server exec wrangler deploy --dry-run --outdir .wrangler/dry-run`.

  Anote no commit o que cada um faz.
  - Se algum falhar, crie `scripts/ensure-assets.ts`: se `../web/dist/index.html` não existe, cria a pasta com um `index.html` mínimo ("Construa a web: pnpm --filter @coringa/web build"). Chame-o antes do `wrangler` em `typecheck`, `test`, `test:coverage`, `smoke` e `dev`.
  - Se nenhum falhar, não crie o script e registre que a tolerância foi conferida.
- [ ] **Step 3: Implemente.**
  - Configure o `wrangler.jsonc`, o `_headers` e o proxy.
  - O `deploy.ts` passa a construir a web (`pnpm --filter @coringa/web build`) antes do `wrangler deploy`, e para se o build falhar.
  - Teste de `deployArgs` existente: não muda.
- [ ] **Step 4: Confira.**
  - `pnpm --filter @coringa/server test` e `pnpm check` → PASS num clone sem `packages/web/dist`: apague a pasta antes de rodar.
  - Depois, `pnpm --filter @coringa/web build`, `pnpm dev:server` e abra `http://localhost:8787/s/7KQ2MD` → a página da web carrega.
- [ ] **Step 5:** Commit `feat(server): o Worker serve a web (static assets) com fallback de SPA`.

---

### Tarefa 8: Model — persistência no navegador

Spec §6.1, §6.5.

**Files:**
- Create: `packages/web/src/model/storage.ts`
- Test: `packages/web/test/model/storage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface KeyValueStore { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }
  export function safeStore(raw: Storage | undefined): { store: KeyValueStore; available: boolean }
  export interface SeatSession { token: string; playerId: PlayerId; nickname: string; lastSeq?: number }
  export function loadSeat(store: KeyValueStore, code: string): SeatSession | null
  export function saveSeat(store: KeyValueStore, code: string, seat: SeatSession): void
  export function saveLastSeq(store: KeyValueStore, code: string, seq: number): void
  export function forgetSeat(store: KeyValueStore, code: string): void
  export interface Prefs { autoPass: boolean; reduceMotion: boolean }
  export const DEFAULT_PREFS: Prefs // { autoPass: true, reduceMotion: false }
  export function loadPrefs(store: KeyValueStore): Prefs
  export function savePrefs(store: KeyValueStore, prefs: Prefs): void
  export function loadNickname(store: KeyValueStore): string
  export function saveNickname(store: KeyValueStore, nickname: string): void
  export function diagnostic(info: { code: string | null; seq: number | null; epoch: number | null; version: string; message: string }): string
  ```
- **Chaves:** `coringa:sala:<CÓDIGO>`, `coringa:apelido`, `coringa:prefs`.
- **Tolerância:** JSON corrompido → `null` ou os padrões. Toda operação num `try/catch`. Um `Storage` que lança vira um armazenamento em memória com `available: false`.

- [ ] **Step 1: Testes que falham:**
  - ida e volta de `SeatSession`, com `saveLastSeq` mantendo o token;
  - `forgetSeat`;
  - JSON quebrado → `null`;
  - `Storage` que lança em `getItem`/`setItem` → `available: false` e as operações funcionam em memória;
  - preferências com campo faltando → completam com os padrões;
  - `diagnostic` com uma mensagem que contém um token (43 caracteres base64url) não devolve o token. Ele é mascarado por regex `[A-Za-z0-9_-]{43}`.
- [ ] **Step 2:** `pnpm --filter @coringa/web exec vitest run test/model/storage.test.ts` → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** O mesmo comando → PASS.
- [ ] **Step 5:** Commit `feat(web): persistência local de assento, preferências e diagnóstico`.

---

### Tarefa 9: Model — face do relógio

Spec §3.8, §7 (anúncios).

**Files:**
- Create: `packages/web/src/model/clock.ts`
- Test: `packages/web/test/model/clock.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const URGENT_MS = 5_000;
  export interface ClockFace { kind: DeadlineKind; seconds: number; urgent: boolean; expired: boolean; mine: boolean; pausedTurnSeconds: number | null }
  export function clockFace(deadline: Deadline | null, remainingMs: number, me: PlayerId, pausedTurnMs?: number): ClockFace | null
  export function clockAnnouncement(previousSeconds: number | null, face: ClockFace | null): 'start' | 'ten' | 'five' | null
  ```
- **Regras:**
  - `seconds = Math.ceil(remainingMs / 1000)`;
  - `urgent` com `0 < remainingMs ≤ 5000`;
  - `expired` com `remainingMs === 0`;
  - `mine` quando `deadline.players` contém `me`;
  - o anúncio só sai para prazo `mine`: `'start'` no primeiro, `'ten'` ao cruzar 10 s, `'five'` ao cruzar 5 s.

- [ ] **Step 1: Testes que falham:**
  - 8000 ms → 8 s, sem urgência;
  - 4200 ms → 5 s e urgente;
  - 0 → `expired`;
  - prazo de outro → `mine: false` e nenhum anúncio;
  - `pausedTurnMs: 21400` → `pausedTurnSeconds: 22`;
  - a sequência 30 → 11 → 10 → 6 → 5 dá `start`, `null`, `ten`, `null`, `five`.
  - **Review Focus 4:** com um `RoomClient` de relógio falso cujo `now` local está 3 min adiantado e com `serverNow` no `state`, `clockFace(d, client.remainingMs(d), me)` dá os segundos certos.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): face do relógio pelo tempo do servidor`.

---

### Tarefa 10: Model — jogadas por carta, combinações e alvos

Spec §1.5 (passo 2), §3.4.

**Files:**
- Create: `packages/web/src/model/plays.ts`, `packages/web/src/model/copy.ts`, `packages/web/test/fixtures.ts`
- Test: `packages/web/test/model/plays.test.ts`

**Interfaces:**
- Consumes: `legalActions`, `PlayerView`, `SpecialCard`; `PlayerAction` do protocolo.
- Produces (`plays.ts`):
  ```ts
  export interface Target { id: string; zone: 'attackBuffs' | 'defenseBuffs' | 'guard'; label: string }
  export interface CardPlay { key: string; label: string; targets: Target[] | null; make(targetId?: string): PlayerAction }
  export interface TablePlays {
    byCard: Map<string, CardPlay[]>;   // id da carta da mão → jogadas
    reflect: PlayerAction | null; cancelReflect: PlayerAction | null; protect: PlayerAction | null;
    resurrect: { cardId: string; value: Rank; rows: RowName[] }[];  // um por valor
    finish: { type: 'DECLARE_ATTACK' } | { type: 'END_TURN' } | null;
    pass: boolean;
  }
  export function tablePlays(view: PlayerView, legal: PlayerAction[]): TablePlays
  export function roleKey(action: PlayerAction, view: PlayerView): string
  export function isLegal(action: PlayerAction, legal: PlayerAction[], view: PlayerView): boolean
  ```
- **Regras:**
  - `roleKey` troca cada id da mão pelo `kind` da carta (`J`, `Q`, `K`, `A`, `WILD`) e cada id do cemitério por `NUM:<valor>`. Mantém os ids de alvo (cartas do oponente) e de campo.
  - Um K tocado oferece "Pôr 1 K" … "Pôr N K", começando pelo tocado.
  - Um Selvagem oferece cada papel numa entrada própria (rótulos "como J: Buff de ataque", "como A: Armadilha", …).
  - Reflect, anular e proteger preferem cartas reais ao Selvagem: entre as combinações legais, a de menos Selvagens.
  - Os rótulos ficam em `copy.ts` (pt-BR).
- **`test/fixtures.ts`** (usado pelas tarefas seguintes):
  - `seededViews(seed: string, steps: number): PlayerView[]`, uma partida greedy × greedy (`@coringa/sim/bots`) com semente fixa, guardando a `view` de quem age a cada passo;
  - `viewAt(spec)`, que monta uma `view` de cenário por `createGame` mais ações, sem acessar os helpers internos do motor;
  - `FakeConnection`, que implementa `RoomConnection` (com `emitState`, `emitRoom`, `emitClosed`, `acks` roteirizados e a lista `sent`).

- [ ] **Step 1: Testes que falham:**
  - numa `view` com `hand: [J, W]` e Buffs de Ataque com espaço:
    - o J dá "Buff de ataque";
    - o W dá "como J: Buff de ataque", "como Q: Buff de defesa" e, com alvo, "como A: Armadilha";
  - Armadilha com 2 A na mão: a segunda A (não canônica) também é `isLegal`, e `make('id-do-K')` gera `TRAP { cardId: segunda A, targetId }`;
  - 2 K na mão → "Pôr 1 K" e "Pôr 2 K", com o tocado primeiro em `cardIds`;
  - Reflect com J, Q, K e W na mão usa J e Q reais;
  - Ressurreição: um item por valor no cemitério, `rows` só com fileiras de vaga;
  - Ataque vazio → `finish.type === 'END_TURN'`;
  - **propriedade:** em `seededViews('plays-0'…'plays-9', 400)`, toda jogada gerada por `tablePlays` (cada `CardPlay.make` com cada alvo, os combos, `finish`, `pass`) é aceita pelo motor. Confira com `applyAction` sobre o estado da partida de fixture.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): jogadas por carta, combinações e alvos a partir de legalActions`.

---

### Tarefa 11: Model — rascunho do Equipar

Spec §3.5.

**Files:**
- Create: `packages/web/src/model/equip.ts`
- Test: `packages/web/test/model/equip.test.ts`

**Interfaces:**
- Consumes: `autoDestinations`, `quadValues`, `attackPower`, `defensePower` (Tarefa 1).
- Produces:
  ```ts
  export const EQUIP_AUTO_SEND_MS = 1_500;
  export function nextDestinations(view: PlayerView, legal: PlayerAction[], chosen: Destination[]): Destination[]
  export interface DraftBoard { attackRow: NumCard[]; defenseRow: NumCard[]; toGraveyard: NumCard[]; attack: number; defense: number; newQuads: { row: RowName; value: Rank }[] }
  export function draftBoard(view: PlayerView, chosen: Destination[]): DraftBoard
  export function completeDraft(view: PlayerView, chosen: Destination[]): Destination[]
  export function shouldAutoSendEquip(input: { remainingMs: number; chosen: number; submitted: boolean; sent: boolean }): boolean
  ```
- **Regras:**
  - `nextDestinations` filtra os `EQUIP` legais pelo prefixo `chosen` e devolve os destinos possíveis da próxima carta, como o `askEquip` do terminal;
  - `completeDraft` = `chosen` + `autoDestinations` das contagens depois do rascunho;
  - `shouldAutoSendEquip` só vale com `remainingMs ≤ 1500`, `chosen ≥ 1`, `!submitted` e `!sent`.

- [ ] **Step 1: Testes que falham:**
  - fileiras com vaga → `['ATK', 'DEF']`;
  - com a Defesa cheia e o Ataque com 1 vaga, para 2 cartas: a primeira só `['ATK']`; depois `['REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD']`;
  - `draftBoard`:
    - troca a última do Ataque e põe a velha em `toGraveyard`;
    - `attack` e `defense` iguais a `attackPower`/`defensePower` das fileiras do rascunho;
    - uma quarta carta de 7 na Defesa → `newQuads` `[{ row: 'DEF', value: 7 }]`;
  - `completeDraft` com 1 de 3 escolhida completa igual a `autoDestinations`;
  - `shouldAutoSendEquip` fica falso com 0 escolhas, com 1600 ms, depois de confirmar e depois de já enviado.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): rascunho do Equipar com prévia e preenchimento do motor`.

---

### Tarefa 12: Model — "fica aceso até você ver"

Spec §10.5.

**Files:**
- Create: `packages/web/src/model/marks.ts`
- Test: `packages/web/test/model/marks.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type MarkZone = 'selfHp' | 'opponentHp' | 'pressure';
  export interface Marks { cards: ReadonlySet<string>; zones: ReadonlySet<MarkZone> }
  export const NO_MARKS: Marks;
  export function computeMarks(base: PlayerView | null, current: PlayerView, seen: ReadonlySet<string>): Marks
  ```
- **O que marca:**
  - cartas do oponente (fileiras, buffs, Guarda, Reflect) que não estavam em `base`;
  - cartas que estavam no seu campo em `base` e agora estão no cemitério (marcadas pelo id no cemitério);
  - vida que mudou;
  - pressão que mudou.
- `base === null` → nenhuma marca. Ids e zonas em `seen` saem do resultado (zonas entram em `seen` como `zone:<nome>`).

- [ ] **Step 1: Testes que falham**, com `views` de uma partida de fixture:
  - o J que o oponente jogou depois da `base` aparece marcado;
  - o seu K quebrado aparece marcado no cemitério;
  - vida do oponente menor → `opponentHp`;
  - nada muda → vazio;
  - `seen` com o id → o id some;
  - `seen` com `zone:pressure` → a zona some.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): marcas do que mudou desde a sua última jogada`.

---

### Tarefa 13: Model — linha do tempo das animações e fotossensibilidade

Spec §4, §10.4.

**Files:**
- Create: `packages/web/src/model/timeline.ts`
- Test: `packages/web/test/model/timeline.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BEAT_MS = { move: 300, damage: 600, banner: 400, scene: 1_500 } as const;
  export const DECISION_CAP_MS = 1_000; export const CATCH_UP_CAP_MS = 3_000; export const INVERT_MIN_HOLD_MS = 300;
  export type SceneKind = 'EXODIA' | 'ABSOLUTE_ATTACK' | 'ABSOLUTE_DEFENSE' | 'REFLECT_PLAYED' | 'REFLECT_TRIGGERED';
  export interface Beat { event: GameEvent; kind: 'move' | 'damage' | 'banner' | 'scene' | 'quiet'; startMs: number; durationMs: number; cards: string[]; scene: SceneKind | null; invert: { atMs: number; holdMs: number } | null }
  export interface TimelineOptions { mode: 'live' | 'catchUp' | 'resync'; reducedMotion: boolean; decisionPending: boolean }
  export function buildTimeline(events: GameEvent[], options: TimelineOptions): Beat[]
  export function timelineMs(beats: Beat[]): number
  export function luminanceSwitches(beats: Beat[]): number[]   // instantes de cada troca claro↔escuro
  ```
- **O mapeamento evento → tipo de batida** é a tabela de spec §4.2:
  - cenas: `Exodia`, `AbsoluteAttack`, `AbsoluteDefenseStarted`, `ReflectPlayed`, `ReflectTriggered`;
  - `DamageDealt` → `damage`;
  - `RoundStarted`, `PressureChanged`, `TurnStarted`, `ReactionWindowOpened`, `OrderChosen` → `banner`;
  - as que movem cartas → `move`, com `cards` = ids envolvidos;
  - `ReactionWindowClosed` e `EquipSubmitted` → `quiet` (0 ms).
- **Regras:**
  - cada cena inverte uma vez, com `holdMs ≥ 300`;
  - `catchUp`:
    - durações pela metade;
    - cenas viram `banner`;
    - teto de 3000 ms (escala proporcional);
  - `resync` → `[]`;
  - `reducedMotion` → nenhuma `invert`;
  - `decisionPending` → escala para caber em 1000 ms, e uma inversão que ficaria com menos de 300 ms é descartada.

- [ ] **Step 1: Testes que falham:**
  - um ataque comum (`AttackDeclared`, `ReactionWindowOpened`/`Closed`, `DamageDealt`, `CardsRemovedFromRow` ×2) fica em ≤ 2000 ms;
  - `Exodia` gera 1 cena com 1 inversão de ≥ 300 ms;
  - `catchUp` com 60 eventos ≤ 3000 ms, sem cena;
  - `resync` → vazio;
  - `decisionPending` com `ReflectPlayed` → total ≤ 1000 ms e inversão mantida;
  - **propriedade de fotossensibilidade:**
    - para 200 sequências de eventos tiradas de `seededViews` (eventos reais de partidas com semente), em todo modo, nenhuma janela de 1000 ms tem mais de 3 entradas em `luminanceSwitches`;
    - cada cena tem no máximo 1 inversão;
    - com `reducedMotion`, `luminanceSwitches` é sempre vazio.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente. Se duas cenas seguidas colidirem com o limite de 3 trocas por segundo, a segunda perde a inversão: a regra de fotossensibilidade vence a cena.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): linha do tempo das animações com limites de fotossensibilidade`.

---

### Tarefa 14: Model — sessão (conexão, sala, jogadas pendentes, acks e fechamentos)

Spec §1.5, §6.2–§6.4, §3.9.

**Files:**
- Create: `packages/web/src/model/session.ts`
- Test: `packages/web/test/model/session.test.ts`

**Interfaces:**
- Consumes: `RoomConnection` (Tarefa 3), `storage.ts` (Tarefa 8).
- Produces:
  ```ts
  export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'stopped';
  export type StopReason = 'ROOM_GONE' | 'PROTOCOL' | 'AUTH' | 'OTHER_TAB' | 'LEFT';
  export interface Notice { kind: 'rate' | 'rule' | 'autoPass' | 'storage'; text: string }
  export interface SessionSnapshot {
    status: ConnStatus; stop: StopReason | null; slowRetry: boolean;
    me: PlayerId | null; room: RoomMessage | null; state: StateMessage | null;
    legal: PlayerAction[]; pending: boolean; notice: Notice | null; receivedAt: number;
  }
  export interface SessionDeps { now(): number; setTimer(fn: () => void, ms: number): unknown; clearTimer(h: unknown): void; onSeq?(seq: number): void }
  export class Session {
    constructor(connection: RoomConnection, deps: SessionDeps);
    subscribe(listener: () => void): () => void;
    snapshot(): SessionSnapshot;
    play(action: PlayerAction, options?: { auto?: boolean }): Promise<void>;
    ready(value: boolean): void; leave(): void; rematch(want: boolean): void; concede(): Promise<void>;
    wake(): void; dispose(): void;
  }
  export function stopReasonFor(code: number): StopReason | null;     // 4000, 4001, 4003, 4009, 1000
  export function ackOutcome(ack: AckMessage): 'ok' | 'wait' | 'rate' | 'rule';
  ```
- **Regras:**
  - `legal` = `legalActions(state.view)` sem `TIMEOUT`/`FORFEIT`;
  - `play` com `pending` já verdadeiro não manda nada;
  - `pending` vale de `play` até o `ack`;
  - um `state` novo mantém `pending` até o `ack`;
  - `ackOutcome` segue a tabela de spec §6.4;
  - `closed` não final → `reconnecting`; `slowRetry` para 1008/4029; final → `stopped` com `stopReasonFor`;
  - cada `state` chama `deps.onSeq(seq)`;
  - o snapshot é imutável por versão: `useSyncExternalStore` compara por referência.

- [ ] **Step 1: Testes que falham**, com o `FakeConnection`:
  - **Review Focus 1:** dois `play` seguidos → `sent.length === 1`;
  - os 8 códigos de "espera" → sem aviso;
  - `RATE_LIMITED` → aviso `rate`;
  - erro de regra → aviso `rule`, com a mensagem do motor;
  - fechamento 1006 → `reconnecting`; 4029 → `slowRetry`; 4000, 4001, 4003 e 4009 → `stopped` com o motivo certo;
  - 1000 depois de `leave()` → `LEFT`;
  - `onSeq` recebe cada `seq`;
  - `wake()` repassa à conexão.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): sessão da sala com pendência, acks e fechamentos`.

---

### Tarefa 15: Model — automações e rascunho do Equipar na sessão

Spec §3.5, §3.6, §3.7, §5, §10.5 (marcas na sessão).

**Files:**
- Create: `packages/web/src/model/automation.ts`
- Modify: `packages/web/src/model/session.ts`
- Test: `packages/web/test/model/automation.test.ts`

**Interfaces:**
- Consumes: `buildTimeline`/`timelineMs` (Tarefa 13), `shouldAutoSendEquip`/`completeDraft`/`nextDestinations` (Tarefa 11), `computeMarks` (Tarefa 12), `Prefs` (Tarefa 8).
- Produces:
  - em `automation.ts`:
    - `ORDER_AUTO_MS = 3_000`;
    - `shouldAutoPass(view: PlayerView, legal: PlayerAction[], prefs: Prefs, alreadySent: boolean): boolean`;
  - a `Session` ganha:
    - os métodos `setPrefs(p: Prefs)`, `interact(): void` (cancela a ordem automática), `equipChoose(d: Destination)`, `equipUndo()`, `equipReset()`, `equipConfirm(): Promise<void>` e `markSeen(key: string)`;
    - no `SessionSnapshot`, os campos `equipDraft: Destination[]`, `equipConfirmed: 'none' | 'thisPage' | 'earlier'`, `orderAutoAt: number | null` e `marks: Marks`.
- **Regras:**
  - **Passe automático:** sai com `auto: true` assim que chega o `state` da janela, uma vez por época.
  - **Ordem automática:** agendada para `receivedAt + timelineMs + 3000`, com `auto: true`; `interact()` cancela. O `timelineMs` vem de `buildTimeline(state.events, { mode, reducedMotion: prefs.reduceMotion, decisionPending: true })`, a mesma conta que o palco usa.
  - **Envio antecipado do Equipar:** agendado para quando `remainingMs` chega a 1500. Manda `completeDraft`, **sem** `auto`.
  - **Rascunho:**
    - sobrevive a `state` da mesma época;
    - zera quando a época muda;
    - `equipConfirmed: 'earlier'` quando a `view` diz `equipSubmitted` e esta página não confirmou.
  - **Marcas:**
    - a `base` é a `view` no momento da última jogada **sem** `auto`;
    - `markSeen` acrescenta a `seen`;
    - uma jogada voluntária zera `seen` e troca a `base`.

- [ ] **Step 1: Testes que falham** (relógio falso):
  - **passe automático:**
    - com só `PASS` legal e a preferência ligada → 1 `act` com `auto`;
    - com a preferência desligada → nada;
    - com resposta possível → nada;
  - **ordem automática:**
    - sai aos `timelineMs + 3000` com `auto`;
    - `interact()` antes disso → nada sai;
  - **envio do Equipar:**
    - com 1 escolha e 1499 ms restantes → `EQUIP` igual a `completeDraft`, sem `auto`;
    - com 0 escolhas → nada;
  - **rascunho:** sobrevive ao `state` com `EquipSubmitted` do oponente (mesma época);
  - **Review Focus 5:** sessão nova, com o primeiro `state` dizendo `self.equipSubmitted` → `equipConfirmed: 'earlier'` e rascunho vazio;
  - **marcas:**
    - o J jogado pelo oponente depois da sua última jogada aparece em `marks`;
    - um passe `auto` não troca a `base`;
    - uma jogada voluntária limpa as marcas.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** `pnpm --filter @coringa/web test:coverage` → PASS, com `src/model` ≥ 90%.
- [ ] **Step 5:** Commit `feat(web): passe automático, ordem automática, envio do Equipar e marcas na sessão`.

---

### Tarefa 16: Model — `LocalRoom` (treino)

Spec §2.6.

**Files:**
- Create: `packages/web/src/model/local-room.ts`
- Test: `packages/web/test/model/local-room.test.ts`

**Interfaces:**
- Consumes: motor (`createGame`, `applyAction`, `viewFor`, `viewEvents`, `legalActions`, `DEFAULT_CONFIG`), `BOTS` e `createRng` (Tarefa 5).
- Produces:
  ```ts
  export interface LocalRoomOptions { seed: string; bot?: BotName; thinkMs?: number; setTimer(fn: () => void, ms: number): unknown; clearTimer(h: unknown): void; now(): number }
  export class LocalRoom implements RoomConnection { constructor(options: LocalRoomOptions) }
  export const LOCAL_ME: PlayerId;  // 'p1'
  export function trainingSeed(search: string, random: () => number): string   // ?semente=… ou sorteio
  ```
- **Regras:**
  - assentos `p1` (você) e `p2` (Bot);
  - `deadline` sempre `null`;
  - o bot (`greedy` por padrão) joga depois de `thinkMs` (padrão 600) e responde às janelas sem esperar;
  - `act` aplica no motor, emite `state` (com `seq`/`epoch` crescentes) e resolve `ack` ok; erro do motor → `ack` com o código;
  - `room` sintético `PLAYING`/`FINISHED`, com placar local;
  - `rematch(true)` começa partida nova com a semente `<semente>-<n>`;
  - `concede` → `FORFEIT` de `p1`;
  - `wake` e `connect` são no-op depois do primeiro `connect`.

- [ ] **Step 1: Testes que falham:**
  - uma partida inteira com o jogador escolhendo sempre a primeira jogada legal termina em `FINISHED`;
  - a mesma semente → a mesma sequência de `seq` e eventos;
  - uma jogada ilegal → `ack` com o código do motor;
  - `trainingSeed('?semente=abc', …)` → `'abc'`.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): sala local de treino contra o bot`.

---

### Tarefa 17: UI — aplicação, rotas, início e entrada na sala

Spec §2.1, §2.2, §6.3, §6.5.

**Files:**
- Create:
  - `src/app/router.ts`, `src/app/App.tsx` (substitui o da Tarefa 6), `src/app/ErrorBoundary.tsx`;
  - `src/ui/useSession.ts`;
  - `src/ui/screens/Home.tsx`, `src/ui/screens/RoomGate.tsx`, `src/ui/screens/Stopped.tsx`, `src/ui/screens/NotFound.tsx`.
- Test: `test/ui/home.test.tsx`, `test/ui/room-gate.test.tsx`

**Interfaces:**
- Consumes: `createRoom`, `joinRoom`, `roomInfo`, `normalizeCode`, `parseTarget`, `normalizeNickname`, `RoomClient` (protocolo); `Session` (Tarefa 14); `storage.ts`.
- Produces:
  - `router.ts`:
    - `type Route = { name: 'home' } | { name: 'room'; code: string | null } | { name: 'training' } | { name: 'notFound' }`;
    - `parseRoute(pathname: string): Route`;
    - `navigate(path: string): void` (`history.pushState`);
    - `useRoute(): Route`;
  - `useSession(session: Session): SessionSnapshot` (`useSyncExternalStore`);
  - `RoomGate` recebe `{ code: string | null; api: RoomApi; store: KeyValueStore }`, com `RoomApi = { create; join; info; connect(code, seat): Session }`, para os testes trocarem o HTTP e a conexão.
- O servidor é `location.origin`.
- O `connect` de verdade monta:
  - `new RoomClient({ server: location.origin, code, token: seat.token, lastSeq: seat.lastSeq })`;
  - `new Session(client, { …, onSeq: (seq) => saveLastSeq(store, code, seq) })`;
  - e chama `client.connect()`.

  Assim, a página recarregada recebe os eventos perdidos em `catchUp` (spec §6.1).
- A sessão online liga os eventos `visibilitychange` (quando visível) e `online` a `session.wake()`.
- Com `safeStore(localStorage).available === false`, aparece uma vez o aviso "Seu navegador não guarda dados desta página: se recarregar, você perde o lugar na sala".

- [ ] **Step 1: Testes que falham** (`user-event`, HTTP falso):
  - **início:**
    - criar com apelido `"Duda"` → `create` chamado → navega para `/s/<CÓDIGO>` → o token salvo;
    - **Review Focus 3:** apelido `"   "`, `"😀"×21` ou 21 letras → erro no campo e nenhuma chamada;
    - **Review Focus 2:** entrar com `"  https://x.dev/s/7kq2md "` → navega para `/s/7KQ2MD`;
  - **entrada:**
    - código inválido → "Código inválido";
    - token salvo → conecta sem chamar `info`;
    - sem token e `info` em `LOBBY` com vaga → formulário de apelido → `join` → conecta;
    - `info` 404 → "Essa sala não existe ou já expirou";
    - cheia → "Essa sala já está com dois jogadores";
    - `join` 409 → igual a cheia; 429 → "Muitas tentativas; espere um minuto"; falha de rede → "Tentar de novo";
  - **parada:**
    - `stopped` com `ROOM_GONE` → apaga o token e mostra "Criar sala";
    - `OTHER_TAB` → "Usar aqui" chama `wake()`;
    - `PROTOCOL` → `location.reload` chamado uma vez (marca no `sessionStorage`);
  - **erro:** um componente que lança dentro da fronteira mostra "Algo deu errado", e o diagnóstico copiado não contém o token;
  - **reconexão:**
    - com `lastSeq: 41` salvo, o `RoomClient` é criado com `lastSeq: 41`;
    - cada `state` grava o `seq` no armazenamento;
    - um `Storage` que lança mostra o aviso uma única vez;
  - **axe** (`axe-core` sobre o `container`) sem violações `serious`/`critical` no início e na entrada.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente as telas com o tema da Peleja: capa rosa, tinta, título em tipo de madeira e botões ouro. Os campos de texto usam fonte ≥ 16 px.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): início, rotas e entrada na sala por link`.

---

### Tarefa 18: UI — lobby

Spec §2.3.

**Files:**
- Create: `src/ui/screens/Lobby.tsx`
- Test: `test/ui/lobby.test.tsx`

**Interfaces:**
- Consumes: `Session`, `roomLink`.
- Produces: `<Lobby session={…} />`.

- [ ] **Step 1: Testes que falham:**
  - mostra o código e o link `<origem>/s/<CÓDIGO>`;
  - "Copiar link" chama `navigator.clipboard.writeText` com o link;
  - "Compartilhar" só aparece com `navigator.share`;
  - dois assentos com presença e pronto;
  - "Estou pronto" chama `ready(true)` e depois `ready(false)`;
  - o aviso de W.O. está visível;
  - um `room` em que você caiu (pronto desmarcado depois de ter estado marcado) mostra "você saiu da sala; marque pronto de novo";
  - "Sair da sala" chama `leave()`;
  - axe sem violação séria.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): lobby com link, presença e pronto`.

---

### Tarefa 19: UI — a mesa desenhada (cartas, campos, faixa central, mão e histórico)

Spec §3.1, §3.2, §3.3, §7, §10.1, §10.5, §10.7.

**Files:**
- Create:
  - `src/ui/cards/Suit.tsx`, `src/ui/cards/Coringa.tsx`, `src/ui/cards/Card.tsx`;
  - `src/ui/table/Table.tsx`, `PlayerField.tsx`, `Row.tsx`, `CenterBand.tsx`, `Hand.tsx`, `History.tsx`.
- Test: `test/ui/table.test.tsx`

**Interfaces:**
- Consumes: `SessionSnapshot` (`state.view`, `room`, `marks`), `clockFace`, `eventText`/`namesFor` (sim/text), `attackPower`/`defensePower`/`quadValues`, `previewAttack`.
- Produces:
  - `<Card card size: 'field' | 'mini' | 'hand' marked? selected? target? front? onSelect? />`, com nome acessível `"7 de copas"`, mais `", sai primeiro"` e `", novo"`;
  - `<Table snapshot onSelectCard onSelectTarget … />`, que monta a ordem de spec §3.2;
  - `Suit` e `Coringa` são SVGs desenhados para o projeto (§10.6). Os paths do rascunho servem de ponto de partida, por serem originais.
- **Regras visuais:**
  - **Tamanho das cartas de fileira:** por `clamp`, ~34 × 48 px a 360 e ~38 × 52 a 390. No PC, ~56 × 78.
  - **Vagas vazias** desenhadas até `config.rowLimit`.
  - **Marcas:** a carta da frente leva a marca "sai primeiro". A marca "novo" fica no vermelho sobre o papel.
  - **Números de jogo:** vida, totais, conta, relógio e placar em Archivo `tabular-nums`, sem filtro de textura. A textura (`feTurbulence`) só vai em títulos e no fundo, por baixo do conteúdo.
  - **Histórico:** `aria-live="polite"`. No PC fica numa coluna; no celular e no tablet (600–1023 px), numa gaveta com a contagem do que é novo.
  - **Marcas de estado no Coringa:** Reflect ativo (com as três cartas, que são públicas), Defesa Absoluta, Ressurreições disponíveis (contagem) e Ataque Absoluto armado (4 J). As quatro cartas de uma quadra ficam destacadas, com "+V" no total.
  - **No PC,** o `title` ou dica de cada carta diz o papel e o efeito. É ajuda extra, nunca o único caminho para a informação.
  - **Na página:** `100dvh`, margens seguras (`env(safe-area-inset-*)`) e `overscroll-behavior: none` na mesa.

- [ ] **Step 1: Testes que falham**, com `view`s de fixture:
  - as quatro fileiras mostram as cartas na ordem, com as vagas até 7;
  - os totais e a conta iguais a `attackPower`/`defensePower` (ex.: `"152"` e `"38 × 4"` no cenário do rascunho);
  - a mão do oponente mostra `handCount` versos, sem nomes de carta;
  - nenhum id de carta da mão do oponente aparece no DOM. Monte uma `view` cujo `opponent.handCount` é 3 e confira que o DOM não tem ids além dos públicos;
  - a faixa central mostra rodada, de quem é a vez, pressão (com "faltam N rodadas…" quando `noDamageStreak ≥ antiStallRounds − 2`), monte e cemitério;
  - uma carta marcada tem nome acessível com `", novo"`;
  - as marcas de estado (Reflect, Defesa Absoluta, Ressurreições, Ataque Absoluto armado) aparecem com texto, em `view`s montadas para cada uma;
  - a quadra destaca as quatro cartas;
  - os números de jogo não têm a classe ou o filtro de textura;
  - axe sem violação séria.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS. Abra `pnpm dev:web` em `/treino?semente=mesa` (depois da Tarefa 24) ou num componente de demonstração local, nas larguras 360, 390 e 1440, e confira que nada rola de lado.
- [ ] **Step 5:** Commit `feat(web): mesa da Peleja desenhada a partir da view`.

---

### Tarefa 20: UI — barra de ação: tocar → jogadas → alvo, prévia e teclado

Spec §3.4, §7 (foco e teclado).

**Files:**
- Create: `src/ui/table/ActionBar.tsx`, `src/ui/table/GraveyardDialog.tsx`
- Modify: `src/ui/table/Table.tsx`
- Test: `test/ui/action-bar.test.tsx`

**Interfaces:**
- Consumes: `tablePlays` (Tarefa 10), `previewAttack` (Tarefa 2), `Session.play`/`interact`/`markSeen`.
- Produces: a seleção fica em estado local da mesa, `{ cardId: string | null; play: CardPlay | null }`. Ela zera quando a época muda ou a carta sai da mão.
- **Comportamento:**
  - Tocar uma carta da mão lista as jogadas dela.
  - Uma jogada com alvo destaca os alvos na mesa **e** os lista como botões grandes ("K♣ da Guarda de Duda").
  - **Prévias:**
    - apontar um alvo de Armadilha recalcula a prévia com `previewAttack` sobre a `view` sem esse alvo;
    - o botão principal **Atacar** mostra a prévia ("152 × 42 · o K de Duda absorve, dano 0"), ou vira **Encerrar turno** com o Ataque vazio;
    - os textos de cada desfecho ficam em `copy.ts`;
    - a ameaça do oponente (`previewAttack(view, 'opponent')`) aparece junto da sua Defesa.
  - **Botões próprios:** Reflect, Anular, Proteger e Ressuscitar. Ressuscitar abre o `<dialog>` do cemitério, filtrado nas numéricas.
  - **Teclado e foco:**
    - Esc cancela;
    - quando a vez passa a ser sua, o foco vai para a barra, sem roubar foco de um campo de texto;
    - qualquer clique ou foco chama `interact()` e `markSeen(id)`.

- [ ] **Step 1: Testes que falham**, com `user-event` e `FakeConnection`:
  - tocar A → "Armadilha" → tocar o botão do alvo K → `act` com `TRAP { cardId, targetId }`;
  - a mesma jogada só pelo teclado (Tab, Enter, Enter);
  - Esc limpa a seleção;
  - Selvagem → "como J: Buff de ataque" → `PLAY_J` com o id do Selvagem;
  - "Pôr 2 K" → `PLAY_K` com os dois;
  - Atacar → `DECLARE_ATTACK`, com o texto da prévia igual ao de `previewAttack`;
  - Ataque vazio → "Encerrar turno" → `END_TURN`;
  - Ressuscitar → escolher o 7 → escolher Ataque → `RESURRECT`;
  - com `pending`, os botões ficam desabilitados;
  - o foco vai para a barra quando chega o `state` da sua vez;
  - axe sem violação séria.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): barra de ação com jogadas, alvos, prévia e teclado`.

---

### Tarefa 21: UI — Equipar, escolha da ordem, janela de reação, relógios e avisos

Spec §3.5–§3.9, §6.2.

**Files:**
- Create: `src/ui/table/EquipPanel.tsx`, `OrderPanel.tsx`, `ReactionPanel.tsx`, `Banners.tsx`
- Modify: `src/ui/table/Table.tsx`, `CenterBand.tsx`
- Test: `test/ui/phases.test.tsx`

**Interfaces:**
- Consumes: `nextDestinations`/`draftBoard` (Tarefa 11), métodos `equip*`/`interact`/`play` da `Session` (Tarefa 15), `clockFace`/`clockAnnouncement` (Tarefa 9).
- **Comportamento:**
  - **Equipar:**
    - "Carta 1 de 3", com a carta grande e os destinos de `nextDestinations`, nos rótulos de `DESTINATION_TEXT` (com "(sai 9♠)" na troca);
    - rascunho translúcido nas fileiras e totais do `draftBoard`;
    - "forma quadra de 7: +7 e 1 Ressurreição";
    - Desfazer, Recomeçar e Confirmar;
    - "Esperando Duda montar…";
    - "Você já confirmou; esperando Duda" (`earlier`);
    - "Você não recebeu numéricas nesta rodada";
    - o oponente aparece como "montando N cartas…" ou "pronto".
  - **Ordem:**
    - o painel mostra "Atacar primeiro" pré-selecionado e uma barra de 3 s (até `orderAutoAt`);
    - toque, foco ou mouse sobre o painel chamam `interact()`;
    - o outro jogador vê "Duda está escolhendo a ordem…".
  - **Reação:**
    - gatilho e prévia ("Duda declarou ataque: 84 contra sua Defesa 46 → seu K absorve");
    - as respostas, **Passar** e o relógio de 8 s grande;
    - "Sem resposta possível; passando" quando o passe automático saiu;
    - quem espera vê "Duda pode reagir…" e o próprio turno pausado (`pausedTurnSeconds`).
  - **Relógio:** na faixa central. Urgência nos últimos 5 s, com disco vermelho e número em papel (sem piscar). "Tempo esgotado" quando expira. Os anúncios saem por uma região `assertive` escondida.
  - **Avisos:**
    - "Reconectando…" (`reconnecting`), com os controles desligados;
    - "Duda caiu. Se não voltar em 0:43, você vence por W.O." (contagem a partir de `woAt`);
    - "Duda voltou" no histórico.

- [ ] **Step 1: Testes que falham:**
  - **Equipar:**
    - escolher ATK, ATK, DEF e Confirmar → `EQUIP` com esses destinos;
    - Desfazer volta um passo;
    - com as fileiras cheias aparecem as três opções de troca;
  - **ordem:** um clique no painel cancela o automático (`orderAutoAt` some do snapshot);
  - **reação:**
    - o relógio mostra 8;
    - `Passar` → `PASS` sem `auto`;
  - **aviso de W.O.** com `woAt` = agora + 43 s mostra "0:43";
  - **relógio:**
    - mostra a classe e o rótulo de urgência com 4 s;
    - não há animação de piscar em modo nenhum (nenhum `animation-iteration-count` infinito nos estilos do relógio);
  - axe sem violação séria.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): Equipar carta a carta, escolha da ordem, reação, relógios e avisos`.

---

### Tarefa 22: UI — animações pela linha do tempo, cenas e movimento reduzido

Spec §4, §10.1 (cenas), §10.4.

**Files:**
- Create: `src/ui/anim/Stage.tsx`, `src/ui/anim/Scene.tsx`
- Modify: `src/ui/cards/Card.tsx` (`layoutId`), `src/ui/table/Table.tsx`
- Test: `test/ui/animation.test.tsx`

**Interfaces:**
- Consumes: `buildTimeline` (Tarefa 13), `Prefs.reduceMotion`, `matchMedia('(prefers-reduced-motion: reduce)')`.
- Produces:
  - `<Stage snapshot reducedMotion onSettled />`, que toca as batidas do último `state`;
  - `useBoardBusy(): boolean`, verdadeiro enquanto há batida.
- **Comportamento:**
  - cada `Card` tem `layoutId={card.id}`, com transição atrasada até o `startMs` da batida que a moveu;
  - a vida e os totais contam até o valor novo na batida do `DamageDealt`;
  - sobreposições: número do dano, faixas e as cenas;
  - o efeito de cada evento segue a tabela de spec §4.2 (escudo do Reflect, fileira de Ataque acesa no ataque, K rachando, quadra acendendo, marca da iniciativa trocando de lado);
  - **cena:** inverte a tela inteira uma vez (`filter: invert(1)` no palco) pelo `holdMs` da batida. Com movimento reduzido, a cena vira texto parado com esmaecimento, sem inversão;
  - **pular:** um toque na mesa durante as batidas termina tudo na hora, e o mesmo vale para Esc;
  - os controles ficam desligados enquanto `useBoardBusy()`;
  - Motion carregado com `LazyMotion features={domAnimation}`.

- [ ] **Step 1: Testes que falham** (jsdom, timers falsos):
  - com um `state` de Exódia, o palco recebe a inversão uma vez e a retira depois de ≥ 300 ms;
  - com movimento reduzido (preferência ou `matchMedia` falso), a inversão não é aplicada;
  - um clique no palco termina as batidas (`useBoardBusy()` falso na hora);
  - os botões da barra ficam desabilitados durante as batidas e voltam depois;
  - `catchUp` não mostra cena;
  - `resync` não cria batida.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): animações por eventos, cenas e movimento reduzido`.

---

### Tarefa 23: UI — fim de partida, revanche e menu da partida

Spec §2.4, §2.5.

**Files:**
- Create: `src/ui/table/EndPanel.tsx`, `src/ui/table/GameMenu.tsx`, `src/ui/table/RulesDialog.tsx`
- Modify: `src/model/copy.ts` (textos de resultado, causa e resumo das regras)
- Test: `test/ui/end-and-menu.test.tsx`

**Interfaces:**
- Consumes: `room.outcome`, `room.score`, `seats[].wantsRematch`; `resultText` (sim/text); `Session.rematch`/`concede`/`setPrefs`.
- **Comportamento:**
  - **Fim:**
    - o resultado: "Você venceu", "Duda venceu", "Empate" ou "Partida sem resultado";
    - o motivo, pelo motor (vida, Exódia, anti-travamento) ou por `cause` (as quatro frases de spec §2.5);
    - o placar;
    - "Revanche" alterna, mostrando "esperando Duda" ou "Duda quer revanche";
    - "Ver a mesa" recolhe; "Nova sala" fecha e volta ao início.
  - **Menu:**
    - Copiar link;
    - as chaves "Passar sozinho quando não tenho resposta" e "Reduzir animações", que gravam as preferências;
    - Resumo das regras, num `<dialog>` com o texto de `copy.ts` tirado da spec 1 §1.6–§1.8;
    - Desistir, com confirmação → `concede`;
    - a versão publicada (de `/api/health`, em `fetch` uma vez ao abrir o menu).

- [ ] **Step 1: Testes que falham:**
  - cada uma das causas `NORMAL` (vida, Exódia, anti-travamento, empate), `RECONNECT_TIMEOUT`, `AFK`, `CONCEDE` e `ABANDONED` mostra a frase certa;
  - "Revanche" chama `rematch(true)`; com o outro pedindo, mostra "Duda quer revanche";
  - "Desistir" pede confirmação, e só "Confirmar" chama `concede`;
  - desligar "Passar sozinho" grava `autoPass: false`;
  - o `<dialog>` das regras prende o foco e o devolve ao fechar;
  - axe sem violação séria.
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode → PASS.
- [ ] **Step 5:** Commit `feat(web): fim de partida, revanche e menu da partida`.

---

### Tarefa 24: UI — rota de treino

Spec §2.6, §12.

**Files:**
- Create: `src/ui/screens/Training.tsx`
- Modify: `src/app/App.tsx`
- Test: `test/ui/training.test.tsx`

**Interfaces:**
- Consumes: `LocalRoom` e `trainingSeed` (Tarefa 16), com `import()` dinâmico do módulo (que puxa `@coringa/sim/bots`). Mesa, fim e menu das Tarefas 19–23.
- **Comportamento:**
  - `/treino` mostra a mesa contra o "Bot" com a faixa "Treino, sem relógio";
  - a revanche começa outra partida;
  - "Sair do treino" volta ao início;
  - o início tem o botão "Treinar contra o bot".

- [ ] **Step 1: Testes que falham:**
  - `/treino?semente=t1` desenha a mesa, e a primeira jogada legal escolhida pela interface leva a um `state` novo;
  - o bot joga sozinho depois de `thinkMs` (timers falsos);
  - o módulo do bot não está no chunk inicial (`scripts/smoke.ts` passa a conferir que o nome `greedyBot` não aparece nos `.js` iniciais).
- [ ] **Step 2:** Rode → FAIL.
- [ ] **Step 3:** Implemente.
- [ ] **Step 4:** Rode, mais `pnpm --filter @coringa/web smoke` → PASS.
- [ ] **Step 5:** Commit `feat(web): treino contra o bot no navegador`.

---

### Tarefa 25: E2E com Playwright e job na CI

Spec §9.2 (E2E), §9.3, §7, §10.7.

**Files:**
- Create: `packages/web/playwright.config.ts`, `packages/web/e2e/online.spec.ts`, `packages/web/e2e/mobile.spec.ts`, `packages/web/e2e/training.spec.ts`, `packages/web/e2e/helpers.ts`
- Modify: `packages/web/package.json` (`e2e`), `package.json` (raiz, `e2e`), `.github/workflows/check.yml`

**Interfaces:**
- **`playwright.config.ts`:**
  - só Chromium; `retries: 0`;
  - `webServer` com `command: 'pnpm --filter @coringa/web build && pnpm --filter @coringa/server exec wrangler dev --port 8787'`, `url: 'http://localhost:8787/api/health'`, `reuseExistingServer: !process.env.CI` e `env: { WRANGLER_SEND_METRICS: 'false' }`;
  - projetos `desktop` (1440 × 900) e `mobile` (390 × 844).
- **`helpers.ts`:**
  - `failOnConsoleErrors(page)` (inclusive CSP);
  - `expectNoHorizontalScroll(page)` (`scrollWidth <= clientWidth`);
  - `axe(page)` (`@axe-core/playwright`, sem `serious`/`critical`);
  - `playUntil(page, predicate)`, que joga escolhendo a primeira jogada oferecida pela interface. O sorteio online não é controlável, então os testes reagem ao que está na tela.

- [ ] **Step 1: Escreva os testes:**
  - **`online.spec.ts`** (dois `browser.newContext()`):
    - A cria a sala; B abre o link e entra com apelido; os dois marcam pronto;
    - os dois equipam (destinos oferecidos, Confirmar);
    - quem tem a iniciativa vê a escolha da ordem e espera a confirmação automática;
    - o atacante ataca; quem responde tem o passe automático ou passa;
    - `context.setOffline(true)` em B por 3 s e depois `false` → B volta para a mesma partida (o aviso "Reconectando…" aparece e some);
    - A desiste → os dois veem o painel de fim com a causa certa;
    - os dois pedem revanche → partida nova (a rodada volta a 1);
    - axe em cada tela.
  - **`mobile.spec.ts`:** a entrada e a mesa em 390 × 844 e em 360 × 740, com `expectNoHorizontalScroll` na mesa e alvos de toque ≥ 44 px nos botões da barra (`boundingBox`).
  - **`training.spec.ts`:**
    - `/treino?semente=e2e-1`: algumas rodadas determinísticas pela interface;
    - **algarismos tabulares:** a largura do relógio ou da vida com "111" é igual à com "888" (confere o `tnum` da fonte, spec §10.3). Se falhar, troque a fonte de texto por uma OFL com `tnum` e registre no `LICENSES.md`.
- [ ] **Step 2:** `pnpm --filter @coringa/web exec playwright install chromium` e `pnpm e2e` → PASS localmente.
- [ ] **Step 3:** No `check.yml`, um job `e2e` em paralelo ao `check`:
  - checkout, pnpm, Node 24 e `pnpm install --frozen-lockfile`;
  - `pnpm --filter @coringa/web exec playwright install --with-deps chromium`;
  - `pnpm e2e`, com `timeout-minutes: 15`;
  - envio do relatório do Playwright como artefato só em falha.
- [ ] **Step 4:** Push da branch → os dois jobs verdes na CI.
- [ ] **Step 5:** Commit `test(web): E2E com Playwright e job na CI`.

---

### Tarefa 26: Fechamento — medições, daltonismo, `CLAUDE.md` e critérios de pronto

Spec §9.3, §10.7, §14.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-17-interface-web-design.md` (§9.3 e §10.7, com as medições), `CLAUDE.md`

- [ ] **Step 1: Meça e registre** na §9.3 da spec:
  - o tempo do `pnpm check` (três rodadas, a mediana), antes (o do commit da Tarefa 6) e agora;
  - o tamanho inicial comprimido do `scripts/smoke.ts`.
- [ ] **Step 2: Confira o daltonismo.** Abra a mesa (`/treino?semente=cor`) no Chrome com a emulação de deficiência de visão do DevTools: deuteranopia, protanopia, tritanopia e acromatopsia. Registre na §10.7 se as duas metades se distinguem por posição e rótulo e se os naipes vermelho e preto se distinguem pela forma. Na mesma passada, confira o zoom de 200% no PC (spec §7).
- [ ] **Step 3: Atualize o `CLAUDE.md`:**
  - `packages/web` é a exceção ao Node puro (bundler, nunca `@coringa/protocol/schemas` nem `node:*`);
  - `pnpm dev:web` com `pnpm dev:server`;
  - `pnpm e2e` (job próprio da CI, exigido no merge);
  - `pnpm deploy:server` agora constrói a web;
  - a regra de fotossensibilidade e a de arte original (spec §10.4 e §10.6).
- [ ] **Step 4:** `pnpm check` e `pnpm e2e` → PASS.
- [ ] **Step 5:** Commit `docs: medições da interface e regras da web no CLAUDE.md`.
- [ ] **Step 6:** Push, PR (ou fast-forward na `main`) com os dois jobs verdes. O que fica para o autor, pela spec §14:
  - `pnpm deploy:server`;
  - jogar uma partida com um amigo pelo link publicado, um no celular e outro no PC, com queda e volta e com revanche.
