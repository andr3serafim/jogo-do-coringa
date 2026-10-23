# Polimento, fatia 2: histórico e replay do treino — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a lista local das últimas partidas terminadas (treino e online) em `/partidas` e o replay das partidas de treino em
`/partidas/<id>`, numa mesa só de vista com início, passo anterior, próximo passo, tocar/pausar e seletor de rodada.

**Architecture:** o motor passa a exportar `RULES_VERSION` e o tipo `Replay` (hoje copiado no simulador, no servidor e nos
testes). O replay chega à mesa por um evento novo da conexão, `{ type: 'replay' }`, que o `LocalRoom` emite no fim da partida
(na fatia 3 o servidor emite o mesmo); a `Session` o guarda no snapshot. Um gancho da `PlayTable` grava a partida em
`coringa:partidas` quando a sala vira `FINISHED`. O visualizador é um modelo puro (`replay-track.ts`) que reexecuta o replay no
motor e devolve, para cada passo, o `state` da vista do seu assento e o histórico até ali; a tela monta a `Table` e o `Stage` de
sempre com esse snapshot, sem barra de jogadas. As duas telas novas entram por `import()`.

**Tech Stack:** TypeScript (Node 24 puro nos pacotes, Vite na web), React 19, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§1, §4, §7, §8). O replay online (mensagem do
servidor, semente pós-partida, spec 2) é a fatia 3: aqui as partidas online entram na lista sem "Rever".

## Global Constraints

- Imports relativos com `.ts`/`.tsx`; só sintaxe apagável; `import type` para tipos (CLAUDE.md).
- `packages/web/src` nunca importa `node:*`, `@coringa/protocol/schemas` nem `@coringa/engine/testing`. Sem Zod na web: a lista
  guardada é validada à mão.
- JS inicial da web ≤ 200 KB gzip: as telas `/partidas` e `/partidas/<id>` entram por `import()` (o smoke confere).
- Sem regra na interface: o replay é reexecutado pelo motor (`createGame`, `applyAction`, `viewFor`, `viewEvents`).
- Números de jogo (passo, rodada, placar, vida) com a fonte de texto e `tabular-nums`.
- Zero violações sérias do axe nas telas novas; tudo por teclado; controles são botões, sem atalho de uma tecla.
- Movimento reduzido e a `FlashLock` valem no replay como ao vivo (o `Stage` de sempre toca as batidas).
- Nenhum efeito, texto ou cena nova ligado à Pressão da mesa (será removida no sub-projeto 5).
- Textos em pt-BR; identificadores em inglês. `pnpm check` verde antes de cada commit; nunca `--no-verify`.
- As partidas de referência do motor não mudam nesta fatia (`RULES_VERSION` começa em 1).

## Review Focus

1. **Armazenamento cheio ou bloqueado** (aba anônima do Safari, cota estourada): gravar a partida nunca quebra o fim da partida
   nem a tela; a lista lê o que der. Teste na Tarefa 3 (`setItem` que lança).
2. **Lista estragada ou de outra forma** (`coringa:partidas` editado à mão, de uma versão antiga do app): a lista mostra as
   entradas válidas e ignora o resto, sem quebrar. Teste na Tarefa 3.
3. **Replay que o motor recusa** (regra mudou, arquivo adulterado): o visualizador para no passo recusado e diz por quê. Teste
   na Tarefa 4 e na Tarefa 6.
4. **Clicar rápido** em próximo/anterior durante as batidas: nada de cena velha, nada de erro, o foco fica no controle. Teste
   na Tarefa 6.
5. **A mesma partida gravada duas vezes** (efeito duplo do StrictMode, novo desenho, recarregar a página com a sala online em
   `FINISHED`): uma linha só. Teste na Tarefa 3 e na Tarefa 5.

---

### Task 1: `RULES_VERSION` e o tipo `Replay` no motor

**Files:**
- Create: `packages/engine/src/version.ts`; Modify: `packages/engine/src/types.ts` (`Replay`, `ReplayStep`), `packages/engine/src/index.ts`
- Modify: `packages/engine/test/replay.ts`, `packages/sim/src/match.ts`, `packages/sim/src/replay.ts`, `packages/server/src/core/types.ts` (usam o tipo do motor em vez das cópias)
- Test: `packages/engine/test/rules-version.test.ts`; Modify: `CLAUDE.md` (seção "Partidas de referência")

**Interfaces:**
- Produces:
  - `export const RULES_VERSION = 1;`
  - `export interface ReplayStep { player: PlayerId | 'system'; action: Action }`
  - `export interface Replay { name: string; config: RulesConfig; seed: string; players: [PlayerId, PlayerId]; steps: ReplayStep[] }`
  - o simulador e o servidor reexportam ou importam esses tipos; nenhum formato muda (as fixtures continuam válidas).

Regra do teste: o resumo das partidas de referência (`test/__snapshots__/golden/*.json`, em ordem de nome) tem um digest
SHA-256 do conteúdo NORMALIZADO (cada arquivo como `JSON.stringify(JSON.parse(texto))`, juntos com o nome do arquivo), para o
mesmo resultado dar o mesmo digest no Windows e no Linux da CI, com ou sem CRLF; o teste guarda um mapa `RULES_DIGESTS: Record<number, string>` e exige `RULES_DIGESTS[RULES_VERSION] === digest`.
Mudou um resultado (snapshot aceito com `-u`)? O teste falha até alguém subir `RULES_VERSION` e acrescentar a linha nova ao
mapa; o `-u` não o conserta sozinho.

- [ ] **Step 1: Teste** `rules-version.test.ts`: `a versão das regras corresponde às partidas de referência` (com mensagem de
  falha que diz o que fazer: "subiu o resultado de uma partida de referência: suba RULES_VERSION e registre o digest novo").
- [ ] **Step 2:** FAIL (`RULES_VERSION` não existe). **Step 3:** implementar; trocar as cópias do tipo. **Step 4:** PASS, com
  as partidas de referência e os testes do simulador e do servidor verdes.
- [ ] **Step 5:** CLAUDE.md, "Partidas de referência": uma linha dizendo que mudar o resultado exige subir `RULES_VERSION` (os
  replays guardados no navegador abrem com aviso). `pnpm check`; commit `feat(engine): RULES_VERSION e o tipo Replay no motor`.

### Task 2: o replay chega pela conexão (`LocalRoom` → `Session`)

**Files:**
- Modify: `packages/protocol/src/messages.ts` (`ReplayMessage`), `packages/protocol/src/client.ts` (`ConnectionEvent`); os outros
  consumidores de `ConnectionEvent` que o typecheck apontar (o cliente de terminal em `packages/sim/src/online`, que ignora o tipo)
- Modify: `packages/web/src/model/local-room.ts` (grava os passos e emite o replay), `packages/web/src/model/session.ts` (`snapshot.replay`)
- Test: `packages/web/test/model/local-room.test.ts`, `packages/web/test/model/session.test.ts`

**Interfaces:**
- Consumes: `Replay`, `ReplayStep` (Tarefa 1).
- Produces:
  - `export interface ReplayMessage { t: 'replay'; gameNo: number; replay: Replay }`;
  - `ConnectionEvent` ganha `{ type: 'replay'; replay: ReplayMessage }` (o `RoomClient` ainda não o emite: é a fatia 3);
  - `SessionSnapshot.replay: ReplayMessage | null` — o da partida em curso na sala (`gameNo` igual ao do `room`); volta a
    `null` quando começa outra partida.

Regras: o `LocalRoom` guarda cada ação aplicada na partida, na ordem, como `ReplayStep` (as do jogador, as do bot, o Equipar
vazio automático e o `FORFEIT` de `system` da desistência), zera a lista em cada partida nova, e emite o `replay` logo ANTES do
`room` em `FINISHED` (quem vê a sala terminar já tem o replay; o `gameNo` do `room` ainda é o da partida). O replay tem `name: treino-<semente da partida>`, a `config`, a semente da partida (`gameSeed`) e
`players: ['p1', 'p2']`. Um replay de outra partida (`gameNo` diferente) é ignorado pela `Session`.

- [ ] **Step 1: Testes:**
  - `local-room.test.ts`: `no fim da partida emite o replay, que o motor reexecuta até o mesmo estado final` (aplicar os
    passos com `createGame` + `applyAction` e comparar `viewFor` final); `a desistência entra no replay como FORFEIT de system`;
    `a revanche começa um replay novo` (os passos da partida 2 não trazem os da 1); `nada de replay antes do fim`.
  - `session.test.ts`: `guarda o replay da partida em curso`; `ignora o replay de outra partida`; `zera o replay quando começa
    outra partida`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): o treino publica o replay no fim da partida`.

### Task 3: a lista de partidas (`coringa:partidas`)

**Files:**
- Create: `packages/web/src/model/past-games.ts`
- Test: `packages/web/test/model/past-games.test.ts`

**Interfaces:**
- Consumes: `KeyValueStore` (`model/storage.ts`), `Replay`, `RULES_VERSION`, `Outcome`, `Score`.
- Produces:
  - `export const PAST_GAMES_KEY = 'coringa:partidas'`, `MAX_PAST_GAMES = 20`, `MAX_PAST_GAMES_CHARS = 1_000_000`,
    `DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000`;
  - `export type PastGameMode = { kind: 'training'; level: TrainingLevel } | { kind: 'online'; code: string }`;
  - `export interface PastGame { id: string; key?: string; date: number; mode: PastGameMode; seat: PlayerId;
    names: { me: string; opponent: string }; outcome: Outcome; rounds: number; score: Score; rulesVersion: number; replay?: Replay }`;
  - `export function loadPastGames(store: KeyValueStore): PastGame[]` — da mais nova para a mais velha; JSON estragado → `[]`;
    entradas que não passam na validação à mão são descartadas, as outras ficam;
  - `export function recordPastGame(store: KeyValueStore, entry: Omit<PastGame, 'id'>, now: number): PastGame | null` —
    devolve a entrada guardada (com `id`), a já existente quando é repetida, ou `null` se o armazenamento recusou;
  - `export function findPastGame(store: KeyValueStore, id: string): PastGame | null`.

Regras: `TrainingLevel` entra por `import type` (o `local-room.ts` é um chunk à parte, com os bots; este módulo fica no JS
inicial). A nova vai para o topo; passa de 20, saem as mais velhas; o JSON da lista passando de 1 000 000 caracteres, saem os
`replay` das mais velhas (a linha fica) até caber; `setItem` que lança (cota) também tira replays das mais velhas e tenta de
novo, e sem replay nenhum para tirar devolve `null` sem lançar. Repetida = mesma `key` numa entrada de até 24 h (as online usam
`key: sala:<código>:<gameNo>`; o treino não tem `key`). O `id` é curto e seguro para a URL (base 36 do `now` mais um contador).

- [ ] **Step 1: Testes** (`past-games.test.ts`): `grava no topo e lê de volta`; `guarda no máximo 20`; `passando de 1 MB tira os
  replays das mais velhas e mantém as linhas` (com replays de partidas inteiras de verdade, de `runGame`, ~20–30 KB cada);
  `uma entrada de outra versão das regras é lida normalmente` (a validação não exige `rulesVersion === RULES_VERSION`: o aviso é
  da tela); `cota estourada tira replays e tenta de novo`; `armazenamento que sempre recusa
  devolve null sem lançar`; `JSON estragado vira lista vazia`; `entrada com forma errada é descartada e as boas ficam`;
  `online repetida em 24 h devolve a existente`; `a mesma sala depois de 24 h é outra partida`; `o id serve na URL`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): lista local das partidas terminadas`.

### Task 4: o modelo do replay (`replay-track.ts`)

**Files:**
- Create: `packages/web/src/model/replay-track.ts`
- Test: `packages/web/test/model/replay-track.test.ts`

**Interfaces:**
- Consumes: `Replay`, `appendHistory`, `forGame` (`model/history.ts`), `NO_MARKS`, `SessionSnapshot`, `DEFAULT_PREFS`.
- Produces:
  - `export interface ReplayFrame { state: StateMessage; round: number; history: HistoryState }` — o quadro 0 é o começo
    (sem eventos); o quadro `i` é o estado depois do passo `i`, com os eventos dele vistos do assento (`viewEvents`);
  - `export interface ReplayTrack { frames: ReplayFrame[]; stoppedAt: { step: number; message: string } | null; rounds: { round: number; frame: number }[] }`
    — `stoppedAt` quando o motor recusa o passo `step` (o replay vai até o anterior) ou não cria a partida (`step: 0`);
    `rounds` = primeiro quadro de cada rodada;
  - `export function buildTrack(replay: Replay, me: PlayerId, names: Names): ReplayTrack`;
  - `export function frameMessage(track: ReplayTrack, from: number, to: number): StateMessage` — `to === from + 1`: o `state`
    do quadro `to` com os eventos do passo (toca as batidas, como ao vivo); qualquer outro salto: o mesmo `state` com
    `events: []` e `resync: true` (troca a mesa de uma vez). `seq` = índice do quadro + 1;
  - `export function replaySnapshot(track: ReplayTrack, message: StateMessage, frame: number, room: RoomMessage, prefs: Prefs): SessionSnapshot`
    — `status 'open'`, `legal: []`, sem jogada em voo, sem aviso, `marks: NO_MARKS`, `marksBaseSeq: null`, o histórico do
    quadro.

- [ ] **Step 1: Testes** (`replay-track.test.ts`, com um replay gerado por `runGame` do simulador ou pelo `LocalRoom`):
  `um quadro por passo mais o começo`; `o último quadro é o fim da partida`; `a vista é a do assento pedido (a mão do outro
  fica escondida)`; `um passo à frente traz os eventos; voltar e saltar vêm em resync sem eventos`; `o histórico do quadro tem
  as linhas até ali`; `rodadas apontam para o primeiro quadro de cada uma`; `um passo adulterado para o replay ali e diz por
  quê`; `um passo malformado (action null, tipo desconhecido) que faz o motor lançar também para ali, sem lançar`; `config
  inválida para no passo 0`. O `buildTrack` embrulha `createGame` e cada `applyAction` num `try/catch`: exceção vira `stoppedAt`.
- O salto em `resync` do replay não é uma ressincronização de verdade: confira quem consome `resync` e `RESYNC_TEXT`
  (`history.ts`, `session.ts`, `useBeatPlayer.ts`). O histórico do quadro vem pronto de `buildTrack`, sem a nota "Mesa
  sincronizada"; teste `voltar não acrescenta "Mesa sincronizada"`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): modelo do replay (quadros, saltos e histórico por passo)`.

### Task 5: gravar no fim da partida e as entradas (rotas, tela inicial, painel de fim)

**Files:**
- Modify: `packages/web/src/app/router.ts` (`{ name: 'pastGames' }`, `{ name: 'pastGame'; id: string }`), `packages/web/src/app/App.tsx`
  (as duas rotas por `React.lazy`, com um `Suspense` simples; as telas da Tarefa 6 entram aqui como esqueletos que a Tarefa 6
  preenche)
- Modify: `packages/web/src/ui/table/PlayTable.tsx` (grava a partida), `packages/web/src/ui/table/EndPanel.tsx` (`onReview`),
  `packages/web/src/ui/screens/Home.tsx` ("Partidas anteriores"), `packages/web/src/model/copy.ts`
- Test: `packages/web/test/app/router.test.ts`, `packages/web/test/ui/play-table.test.tsx` (ou o arquivo da mesa que já cobre o
  fim), `packages/web/test/ui/end-panel.test.tsx`, `packages/web/test/ui/home.test.tsx`

**Interfaces:**
- Consumes: `recordPastGame` (Tarefa 3), `SessionSnapshot.replay` (Tarefa 2).
- Produces: `parseRoute('/partidas')` → `{ name: 'pastGames' }`; `parseRoute('/partidas/<id>')` → `{ name: 'pastGame', id }`;
  `EndPanelProps.onReview?: () => void` (o botão "Rever a partida" só existe com ele).

Regras: a mesa grava uma vez por partida. A guarda é da instância (um `ref` da `PlayTable`, ou da `Session`), por `gameNo`,
contra o efeito duplo e novos desenhos — nunca um conjunto no nível do módulo: o treino é sempre `TREINO` e recomeça no
`gameNo` 1, então /treino → início → /treino na mesma página é outra partida e tem de ser gravada. Grava quando a sala vira `FINISHED` com `outcome`: modo treino (com o nível) ou online (com o código e `key`), seu assento,
os apelidos (`names` da mesa), `outcome`, `rounds` = `view.round`, o placar da sala, `RULES_VERSION` e o `snapshot.replay` se o
`gameNo` bate (no treino ele chega antes do `room` em `FINISHED`; online, nesta fatia, nunca vem). "Rever a partida" aparece quando a
entrada gravada tem replay e leva a `/partidas/<id>`. "Partidas anteriores" na tela inicial leva a `/partidas`.

- Nota para a fatia 3: o servidor manda o replay depois do `room` em `FINISHED` e de novo no `hello`; lá o gravador vai
  anexar um replay que chega tarde à entrada já gravada (por `id`). Nada disso nesta fatia.

- [ ] **Step 1: Testes:** rotas novas (e `/partidas/` com barra, id com caracteres fora do formato → `notFound`); a mesa grava
  uma linha ao terminar o treino, com o replay, e uma só mesmo com StrictMode; duas sessões de treino seguidas na mesma página
  (ambas `TREINO`, `gameNo` 1) gravam duas linhas; a partida online grava sem replay e sem "Rever";
  armazenamento que recusa não quebra o painel de fim; "Rever a partida" navega para `/partidas/<id>`; "Partidas anteriores"
  navega para `/partidas`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check` (o JS inicial segue ≤ 200 KB); commit `feat(web): partidas terminadas gravadas e as entradas do histórico`.

### Task 6: as telas `/partidas` e `/partidas/<id>`

**Files:**
- Create: `packages/web/src/ui/screens/PastGames.tsx`, `packages/web/src/ui/screens/ReplayScreen.tsx`
- Modify: `packages/web/src/ui/table/Table.tsx` e `CenterBand.tsx` (`replay?: true`: a faixa diz "Revendo a partida", sem
  relógio), `packages/web/src/model/copy.ts`, `packages/web/scripts/smoke.ts` (as duas telas fora do JS inicial)
- Test: `packages/web/test/ui/past-games.test.tsx`, `packages/web/test/ui/replay-screen.test.tsx`

**Interfaces:**
- Consumes: `loadPastGames`, `findPastGame` (Tarefa 3), `buildTrack`, `frameMessage`, `replaySnapshot` (Tarefa 4), `Stage`, `Table`.
- Produces: as duas telas, exportadas como `default` para o `React.lazy`.

Textos: lista — título "Partidas anteriores"; vazia "Nenhuma partida terminada neste navegador."; cada linha com a data
(dd/mm, hh:mm), "contra <apelido>", o resultado do seu ponto de vista ("Vitória", "Derrota", "Empate", "Sem resultado"), o modo
("Treino · Médio" ou "Sala <código>") e o botão "Rever" quando há replay; "Voltar ao início". Visualizador — botões "Início",
"Passo anterior", "Próximo passo", "Tocar"/"Pausar", o seletor "Rodada", o contador "Passo 12 de 240" (`tabular-nums`),
"Voltar à lista"; aviso de versão "Esta partida foi gravada com outra versão das regras. Ela pode não se repetir igual.";
parada "O replay parou no passo 37: <motivo do motor>."; id desconhecido "Esta partida não está mais neste navegador."; sem
replay "Esta partida não tem replay.".

Regras: avançar um passo usa `frameMessage(i, i + 1)` (batidas como ao vivo); voltar, "Início" e a rodada usam o salto em
`resync`. "Tocar" avança um passo depois de 700 ms E de o `Stage` assentar; um passo sem batida nenhuma (o Equipar do oponente,
um Equipar vazio) não pode travar o tocar: o timer de 700 ms avança sozinho quando não há batidas a esperar. O `Stage` (e a
`FlashLock` dele) ficam montados entre os passos — nunca remontar por quadro, que zeraria o histórico da trava. O contador de
linhas vistas da `Table` (por índice) tem de aguentar o histórico encolher ao voltar: nada de "novo" negativo nem velho. Os
controles ficam desligados onde não fazem sentido (sem anterior no começo, sem próximo no fim), e o foco fica no botão
apertado. A mesa não tem barra de jogadas nem menu. Os números da mesa e do contador com `tabular-nums`.

- [ ] **Step 1: Testes:** lista (vazia, linhas na ordem, "Rever" só com replay, resultado do ponto de vista do seu assento,
  modo); visualizador (próximo passo traz os eventos e o contador anda; anterior volta em resync; início; rodada; tocar e pausar
  com timers falsos, inclusive atravessando um passo sem eventos visíveis; aviso de versão com `rulesVersion` diferente; parada
  no passo recusado; id desconhecido; sem replay; cliques rápidos durante as batidas não quebram e o foco fica no botão; cliques
  rápidos em "Próximo passo" por dois ou três passos com `ABSOLUTE_ATTACK` não passam do limite da `FlashLock` (≤ 3 trocas
  claro ↔ escuro em 1 s); voltar e avançar de novo não deixa marca "novo" velha nem negativa no histórico; axe sem violações
  sérias nas duas telas).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check` (o smoke confere as telas fora do JS inicial); commit `feat(web): telas das partidas anteriores e do replay`.

### Task 7: E2E e documentos

**Files:**
- Create: `packages/web/e2e/replay.spec.ts`
- Modify: `docs/superpowers/specs/2026-10-17-interface-web-design.md` (spec 3: rotas `/partidas` e `/partidas/<id>`, o botão da
  tela inicial e o do painel de fim), `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§4.2: o replay do treino
  chega à mesa pelo evento `replay` da conexão), `CLAUDE.md` (as rotas novas na linha do treino, se couber)

- [ ] **Step 1:** E2E: abrir `/treino?semente=e2e-1&nivel=medio`, desistir pelo menu, "Rever a partida", conferir o contador no
  começo, "Próximo passo" (o contador anda), "Passo anterior" (volta), "Voltar à lista" (a partida aparece na lista com
  "Rever"); axe nas duas telas.
- [ ] **Step 2:** `pnpm e2e` verde; atualizar os documentos.
- [ ] **Step 3:** `pnpm check`; commit `test(web): E2E do replay do treino e as specs com o histórico`.

---

## Depois da última tarefa

Revisão de código da fatia inteira, `check` e `e2e` verdes na CI da branch, fast-forward na `main`, CI da `main` verde e um
aviso curto à sessão principal.
