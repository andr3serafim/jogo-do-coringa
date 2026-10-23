# Polimento, fatia 1: sons e níveis de bot — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sons sintetizados ligados às batidas (com mudo e sem tocar antes de um gesto) e três níveis de bot no treino (Fácil,
Médio e, se o portão fechar, Difícil).

**Architecture:** o mapa batida → pista é puro (`model/sound.ts`); um controlador pequeno no bundle inicial guarda a
preferência e liga o áudio no primeiro gesto que o navegador conta como ativação, importando o sintetizador por `import()`. O
`Stage` toca a pista de cada batida ao vivo. Os bots novos moram em `@coringa/sim/bots`: o Fácil é uma `Bot` comum; o Difícil é
uma `StateBot`, uma busca por rollouts truncados e determinizados escrita como gerador, que o simulador roda de uma vez e o
`LocalRoom` roda em fatias de ~8 ms.

**Tech Stack:** TypeScript (Node 24 puro nos pacotes, Vite na web), React 19, Web Audio API, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§1, §2, §3, §7).

## Global Constraints

- Imports relativos com `.ts`/`.tsx`; só sintaxe apagável; `import type` para tipos (CLAUDE.md).
- `packages/sim/src/bots/**`, `rng.ts` e `play/text.ts` vão para o navegador: nada de `node:*` (o ESLint barra).
- `packages/web/src` nunca importa `node:*`, `@coringa/protocol/schemas` nem `@coringa/engine/testing`.
- JS inicial da web ≤ 200 KB gzip (o smoke confere): o sintetizador e o bot difícil entram por `import()`.
- Textos em pt-BR; identificadores em inglês.
- `pnpm check` verde antes de cada commit; um commit por tarefa; nunca `--no-verify`.
- Nenhum som antes de um gesto; nenhum som em `catchUp` nem em `resync`.
- O Difícil nunca usa a mão real do oponente, as pendentes dele, a ordem do monte nem o `submittedDestinations` dele.
- Partidas de referência do motor não mudam nesta fatia (nenhuma tarefa mexe no motor).

## Review Focus

1. **Toque no celular:** um `pointerdown` de toque não ativa o áudio no Chrome/Safari; o primeiro toque que solta (`pointerup`,
   `touchend`) liga. Teste na Tarefa 2 (`pointerdown` sozinho não cria contexto).
2. **Contexto suspenso:** o navegador pode criar o `AudioContext` suspenso, ou suspendê-lo ao trocar de aba; o próximo gesto
   retoma. Teste na Tarefa 2.
3. **Desligar no meio:** desligar o som com pistas no ar não deixa nada tocando nem cria contexto novo. Teste na Tarefa 2.
4. **Bot difícil e a reação:** o Difícil decide em fatias também na janela de reação, e um `state` novo (o jogador agiu) no meio
   da busca a cancela sem jogar uma ação velha. Teste na Tarefa 7.
5. **Nível na revanche:** a revanche do treino mantém o nível escolhido, e `?semente=` continua repetindo a partida. Teste na
   Tarefa 8.

---

### Task 1: O mapa batida → pista

**Files:**
- Create: `packages/web/src/model/sound.ts`
- Test: `packages/web/test/model/sound.test.ts`

**Interfaces:**
- Produces:
  - `export type Cue = 'carta' | 'quebra' | 'golpe-leve' | 'golpe-medio' | 'golpe-forte' | 'escudo' | 'absoluto' | 'vez' | 'vitoria' | 'derrota' | 'urgencia';`
  - `export function cueOf(beat: Beat, me: PlayerId): Cue | null`
  - `export const DAMAGE_BANDS = { medio: 40, forte: 100 } as const;` (dano < 40 leve; < 100 médio; ≥ 100 forte)

- [ ] **Step 1: Escrever os testes** (`sound.test.ts`), com batidas de `buildTimeline(events, LIVE)`:
  - `carta` para `CardsPlaced`, `BuffPlayed`, `GuardPlayed`, `Resurrected`;
  - `quebra` para `GuardBroken`, `TrapUsed`, `Sacrificed` e `CardsRemovedFromRow` com `row: 'DEF'`; `null` para o de `row: 'ATK'`;
  - `golpe-leve` com dano 39, `golpe-medio` com 40 e 99, `golpe-forte` com 100; `null` com dano 0;
  - `escudo` para `ReflectPlayed`, `ReflectTriggered`, `AbsoluteDefenseStarted`; `absoluto` para `AbsoluteAttack` e `Exodia`;
  - `vez` para `TurnStarted` com `player === me` e para `ReactionWindowOpened` com `responder === me`; `null` para os do outro;
  - `vitoria`/`derrota` para `GameOver` com `WIN` meu/do outro; `null` para `DRAW`;
  - nenhum outro evento tem pista (percorrer a lista de tipos do teste de mapeamento de `timeline.test.ts`).
- [ ] **Step 2:** `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts` → FAIL (módulo ausente).
- [ ] **Step 3:** implementar `cueOf` (um `switch` em `beat.event.type`).
- [ ] **Step 4:** rodar de novo → PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): o mapa batida → pista dos sons`.

### Task 2: O controlador de som e o sintetizador

**Files:**
- Create: `packages/web/src/sound/controller.ts` (no bundle inicial; pequeno)
- Create: `packages/web/src/sound/synth.ts` (só por `import()`)
- Test: `packages/web/test/model/sound-controller.test.ts`, `packages/web/test/model/synth.test.ts`

**Interfaces:**
- Consumes: `Cue` (Tarefa 1).
- Produces:
  - `export interface AudioContextLike { readonly state: 'suspended' | 'running' | 'closed'; resume(): Promise<void>; suspend(): Promise<void>; }`
  - `export interface Synth { play(cue: Cue): void }`
  - `export interface SoundControllerDeps { createContext(): AudioContextLike; loadSynth(ctx: AudioContextLike): Promise<Synth>; }`
  - `export class SoundController { constructor(deps: SoundControllerDeps, enabled: boolean); attach(target: EventTarget): () => void; setEnabled(on: boolean): void; play(cue: Cue): void; }`
  - `export const ACTIVATION_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;`
  - `export function createSynth(ctx: AudioContext): Synth` em `synth.ts` (padrão do módulo: `export default createSynth`).
  - `export const browserSoundDeps: SoundControllerDeps` em `controller.ts`: `createContext` = `new AudioContext()`;
    `loadSynth` = `import('./synth.ts')`.

Regras do controlador: nenhum contexto até o primeiro evento de `ACTIVATION_EVENTS` com o som ligado; em todo gesto, se o
contexto existe e `state !== 'running'`, `resume()`; `play` antes de o sintetizador carregar descarta a pista (sem fila);
`setEnabled(false)` suspende o contexto e faz `play` descartar; `setEnabled(true)` não cria contexto (espera o próximo gesto).

- [ ] **Step 1: Testes do controlador** com um `AudioContextLike` falso (estado controlável, contadores de `resume`) e um
  `Synth` falso que grava as pistas:
  - `nenhum contexto antes de um gesto, e um pointerdown sozinho não conta`;
  - `o primeiro pointerup (ou touchend, click, keydown) cria o contexto e carrega o sintetizador`;
  - `um contexto que nasce suspenso é retomado no gesto seguinte` (falso começa `suspended`; segundo `click` → `resume` chamado);
  - `play antes de o sintetizador carregar descarta; depois, toca`;
  - `desligado, o gesto não cria contexto e play não toca; desligar com o contexto vivo o suspende`;
  - `attach devolve a função que remove os ouvintes`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar `SoundController` e `browserSoundDeps`.
- [ ] **Step 4: Sintetizador.** Teste `synth.test.ts` com um `AudioContext` falso mínimo (fábricas de oscilador, ganho, filtro
  e buffer que contam conexões): toda pista de `Cue` cria nós e liga ao destino passando por um `DynamicsCompressorNode`
  (limitador); nenhuma lança. Implementar `createSynth` com osciladores, ruído filtrado e envelopes curtos (≤ 600 ms; o
  `absoluto`, ≤ 1,2 s). Timbres livres (spec §9).
- [ ] **Step 5:** rodar os dois arquivos → PASS; `pnpm --filter @coringa/web smoke` → JS inicial ≤ 200 KB e o `synth` num chunk à
  parte (conferir na saída do smoke que há um `.js` novo fora do inicial).
- [ ] **Step 6:** `pnpm check`; commit `feat(web): controlador de som e sintetizador, sem som antes de um gesto`.

### Task 3: Ligar os sons à mesa e a preferência "Som"

**Files:**
- Modify: `packages/web/src/model/storage.ts` (`Prefs.sound`, padrão `true`, `loadPrefs`)
- Create: `packages/web/src/ui/sound-context.ts` (`SoundContext`, `useSound()`; padrão: um `play` que não faz nada)
- Modify: `packages/web/src/app/App.tsx` (cria o `SoundController` com `browserSoundDeps` e `loadPrefs(store).sound`, `attach(document)`, provê o contexto)
- Modify: `packages/web/src/ui/anim/Stage.tsx` (toca `cueOf(beat, me)` quando a batida muda, só com `run` ao vivo)
- Modify: `packages/web/src/ui/table/CenterBand.tsx` (toca `urgencia` uma vez por prazo, quando o seu relógio entra na urgência)
- Modify: `packages/web/src/ui/table/GameMenu.tsx` (chave "Som"), `packages/web/src/ui/table/PlayTable.tsx` (`setEnabled(prefs.sound)`)
- Modify: `packages/web/src/ui/screens/Home.tsx` (chave "Som", grava em `coringa:prefs`)
- Test: `packages/web/test/ui/sound.test.tsx`, `packages/web/test/model/storage.test.ts`, `packages/web/e2e/sound.spec.ts`

**Interfaces:**
- Consumes: `cueOf` (Tarefa 1), `SoundController` (Tarefa 2).
- Produces: `Prefs.sound: boolean`; `useSound(): { play(cue: Cue): void; setEnabled(on: boolean): void }`.

Regras: o `Stage` toca na mudança de batida (identidade da `beat`), nunca para `run.catchUp` nem num `state` de `resync` (que
não tem batidas); o pulo não toca o resto (não há mais batidas). A chave "Som" fica no menu da partida (também no treino) e na
tela inicial; o texto diz o estado ("Som: ligado").

- [ ] **Step 1: Testes**:
  - `storage.test.ts`: `loadPrefs` sem chave → `sound: true`; com `sound: false` → `false`; valor não booleano → `true`.
  - `sound.test.tsx` (harness de `anim-harness.tsx`, com um `SoundContext` falso que grava): ao vivo `[TURN de p1, DamageDealt 120]`
    toca `['vez', 'golpe-forte']` nas batidas; `catchUp` com os mesmos eventos não toca nada; pular depois da primeira batida não
    toca a segunda; a urgência toca uma vez quando o relógio do seu prazo passa de 6 s para 5 s, e não de novo no mesmo prazo;
    a chave "Som" do menu chama `setEnabled(false)` e grava `sound: false`.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4: E2E** `e2e/sound.spec.ts` (projeto `desktop`): um `addInitScript` troca `window.AudioContext` por uma classe que
  conta instâncias em `window.__audioContexts`; abrir `/treino?semente=e2e-1&nivel=medio` → 0 contextos; um `page.mouse.down()`
  sem `up` → 0; um clique num destino do Equipar → 1; abrir o menu → a chave "Som" marcada.
  Incluir o arquivo no `testMatch` do projeto `desktop` em `playwright.config.ts`.
- [ ] **Step 5:** `pnpm check`; `pnpm e2e` (todos verdes); commit `feat(web): sons nas batidas, com a chave "Som" no menu e na entrada`.

### Task 4: O bot Fácil

**Files:**
- Create: `packages/sim/src/bots/easy.ts`
- Modify: `packages/sim/src/bots/types.ts` (`BOT_NAMES` ganha `'easy'`), `packages/sim/src/bots/index.ts` (`BOTS.easy`)
- Test: `packages/sim/test/bots.test.ts`

**Interfaces:**
- Produces: `export const EASY_BLUNDER = 0.35;` e `export const easyBot: Bot` — com probabilidade `EASY_BLUNDER` (sorteada por
  `rng.next()`) joga `rng.pick(legal)`; senão, `greedyBot(view, legal, rng)`.

- [ ] **Step 1: Testes:** sempre devolve uma ação da lista legal (100 partidas `runSeries` com `easy` × `greedy`, sem exceção);
  determinístico para a mesma semente; numa série de 200 partidas com semente fixa, o `greedy` pontua ≥ 65% contra o `easy`
  (vitória 1, empate ½), alternando assentos.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** PASS. Se a margem de 65% não fechar, subir `EASY_BLUNDER`
  em passos de 0,05 até fechar (no máximo 0,6) e anotar o valor no commit.
- [ ] **Step 5:** `pnpm check`; commit `feat(sim): bot Fácil (greedy distraído)`.

### Task 5: `determinize` sem vazamento

**Files:**
- Modify: `packages/sim/src/experiments/determinize.ts`
- Test: `packages/sim/test/experiments.test.ts`

**Interfaces:**
- Produces: `determinize(state, viewer, seed)` com a mesma assinatura, agora: o conjunto oculto (mão + pendentes do oponente +
  monte) é **ordenado por id antes de embaralhar**; se o oponente já confirmou o Equipar, `equipSubmitted` volta a `false` e
  `submittedDestinations` a `null` (nos rollouts ele decide de novo).

- [ ] **Step 1: Teste** `o resultado não depende da informação oculta real`: dois estados com a mesma visão do `viewer` mas mãos
  do oponente trocadas com cartas do monte, e o monte em outra ordem, e um terceiro com o oponente já tendo confirmado o
  Equipar com outros destinos → `determinize(a, v, 's')` e `determinize(b, v, 's')` dão a mesma mão e as mesmas pendentes do
  oponente, o mesmo monte e o mesmo `submittedDestinations === null`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS (os testes de `experiments` que já existem seguem verdes; o
  `pnpm sim:calibrate` não roda no `check` e pode mudar de número: anotar no commit).
- [ ] **Step 5:** `pnpm check`; commit `fix(sim): determinize não depende da ordem da informação oculta nem do Equipar do oponente`.

### Task 6: O bot Difícil (busca por rollouts)

**Files:**
- Create: `packages/sim/src/bots/hard.ts`
- Modify: `packages/sim/src/bots/types.ts` (`StateBot`), `packages/sim/src/bots/index.ts` (exporta `hardSearch`, `runHard`)
- Modify: `packages/sim/src/match.ts` e `packages/sim/src/series.ts` (aceitam `'hard'` como bot, via `runHard`)
- Test: `packages/sim/test/hard.test.ts`

**Interfaces:**
- Consumes: `determinize` (Tarefa 5), `greedyBot`, `eval.ts`.
- Produces:
  - `export type StateBot = (state: GameState, seat: PlayerId, legal: Action[], rng: Rng) => Action;`
  - `export interface HardOptions { rolloutsPerCandidate: number; maxCandidates: number; }` e
    `export const HARD_DEFAULTS: HardOptions` (valores do portão, Tarefa 7);
  - `export function* hardSearch(state: GameState, seat: PlayerId, legal: Action[], rng: Rng, options?: HardOptions): Generator<void, Action>`
    — cede (`yield`) depois de cada rollout;
  - `export const runHard: StateBot` — roda `hardSearch` até o fim, de uma vez;
  - `HARD_BOT = 'hard'` aceito por `match.ts`/`series.ts` (não entra em `BOT_NAMES`: ele não serve ao `pnpm bot` online).

Algoritmo (decisões que a spec deixa ao construtor, fixadas aqui): com uma ação legal, devolve-a sem busca. As candidatas são as
`maxCandidates` melhores pela ordem do `greedy` (a escolha dele primeiro; as outras pela avaliação de `eval.ts` quando houver;
senão, na ordem da lista). Para cada candidata, `rolloutsPerCandidate` rollouts: `determinize(state, seat, <semente do rng>)`,
aplica a candidata, e joga `greedy × greedy` até o fim da próxima rodada de Ataque (ou o fim da partida). Valor do rollout:
vitória +1000, derrota −1000, senão (vida minha − vida dele) + `boardScore` do `eval.ts`. Escolhe a maior média; empate, a
primeira na ordem das candidatas.

- [ ] **Step 1: Testes** (`hard.test.ts`):
  - `sem trapaça: a decisão é a mesma quando só muda a informação oculta` — o mesmo par de estados da Tarefa 5, a mesma semente
    do bot → `runHard` devolve a mesma ação;
  - `determinístico para a mesma semente`;
  - `com uma ação legal, devolve-a sem rollout` (o gerador termina sem ceder);
  - `o gerador cede uma vez por rollout` (conta os `yield`: `min(candidatas, maxCandidates) × rolloutsPerCandidate`);
  - `sempre devolve uma ação da lista legal` (20 partidas `hard × greedy` curtas, semente fixa, `rolloutsPerCandidate: 2`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(sim): bot Difícil por rollouts determinizados e truncados`.

### Task 7: O portão do Difícil

**Files:**
- Create: `packages/sim/src/cli/hard-gate.ts`; Modify: `package.json` da raiz (`"sim:dificil": "node packages/sim/src/cli/hard-gate.ts"`)
- Create: `packages/sim/reports/dificil.md` (o resultado, versionado como o da calibração)
- Modify: `packages/sim/src/bots/hard.ts` (`HARD_DEFAULTS` finais)

O script mede, com semente fixa, cada semente jogada duas vezes com os assentos trocados (o mesmo monte e a mesma iniciativa
sorteada: o bot medido fica com a iniciativa em exatamente uma das duas): (a) `hard × greedy` em 200 partidas (100 sementes),
pontuação do `hard` (vitória 1, empate ½); (b) `greedy × easy` em 200 partidas; (c) o tempo por decisão do `hard` (p50, p95, máx) no Node.
Escreve `reports/dificil.md` com os números e o veredito: aprovado se (a) ≥ 58%, (b) ≥ 65% e p95 ≤ 300 ms.

- [ ] **Step 1:** escrever o script (sem teste unitário: é medição; ele usa as funções já testadas).
- [ ] **Step 2:** rodar `pnpm sim:dificil` em segundo plano e ler o relatório.
- [ ] **Step 3:** se não aprovar, até duas rodadas de ajuste (`rolloutsPerCandidate`, `maxCandidates`, horizonte, avaliação),
  cada uma com o relatório anotado. Se ainda não aprovar: o nível Difícil não entra (a Tarefa 8 oferece só Fácil e Médio, e o
  relatório registra as medidas e o motivo).
- [ ] **Step 4:** `pnpm check`; commit `chore(sim): portão do Difícil (<aprovado|reprovado>: <números>)`.

### Task 8: Níveis no treino (sala local e tela)

**Files:**
- Modify: `packages/web/src/model/local-room.ts` (`LocalRoomOptions.level`, o Difícil em fatias)
- Modify: `packages/web/src/ui/screens/Training.tsx` (escolha do nível), `packages/web/src/model/copy.ts` (textos),
  `packages/web/src/model/storage.ts` (`loadLevel`/`saveLevel`, chave `coringa:nivel`), `packages/web/src/ui/table/CenterBand.tsx`,
  `packages/web/src/ui/table/GameMenu.tsx` e `PlayTable.tsx` (o menu do treino mostra "Treino · Médio")
- Test: `packages/web/test/model/local-room.test.ts`, `packages/web/test/ui/training.test.tsx`, `packages/web/e2e/training.spec.ts`

**Interfaces:**
- Consumes: `easyBot`, `greedyBot`, `hardSearch` (Tarefas 4 e 6).
- Produces:
  - `export type TrainingLevel = 'facil' | 'medio' | 'dificil';` e `export const TRAINING_LEVELS: readonly TrainingLevel[]`
    (sem `'dificil'` se o portão reprovou);
  - `LocalRoomOptions.level?: TrainingLevel` (padrão `'medio'`; substitui `bot`);
  - `export function trainingLevel(search: string): TrainingLevel | null` (`?nivel=`);
  - `export const LEVEL_NAME: Record<TrainingLevel, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };`
  - `export function trainingBandText(level: TrainingLevel): string` → `"Treino · Médio, sem relógio"` (substitui `TRAINING_BAND_TEXT`).

Regras: o Difícil no `LocalRoom` roda `hardSearch` em fatias — a cada tarefa (`setTimer(…, 0)`), avança o gerador até ~8 ms
(`now()`), e só joga quando termina; um `state` novo ou o fim da partida descartam a busca em curso (o mesmo controle de timer de
hoje). O tempo de "pensar" (`thinkMs`) vem antes da busca, como hoje; na reação, a busca começa já. A tela `/treino` sem
`?nivel=` mostra antes da mesa três botões grandes (nome e uma linha: "Joga sem pressa, erra de vez em quando", "Joga direto,
como o bot do simulador", "Pensa nas próximas rodadas") com o último nível (`coringa:nivel`) focado; com `?nivel=` válido vai
direto à mesa. A revanche mantém o nível.

- [ ] **Step 1: Testes:**
  - `local-room.test.ts`: `level: 'facil'` usa o `easyBot` (com a mesma semente, joga o que o `easyBot` jogaria); `level: 'dificil'`
    joga só depois de a busca terminar, em várias tarefas (com timers falsos e `now` que anda 3 ms por chamada, a busca usa mais
    de uma tarefa); um `act` do jogador no meio da busca (na janela de reação) a cancela e a jogada velha nunca é aplicada; a
    revanche mantém o nível.
  - `training.test.tsx`: sem `?nivel=`, a escolha aparece com o nível salvo focado; escolher grava `coringa:nivel` e abre a mesa;
    `?nivel=dificil` vai direto; a faixa diz "Treino · Médio, sem relógio" e o menu da partida, "Treino · Médio".
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5: E2E:** os testes que abrem `/treino?semente=e2e-1` passam a abrir `/treino?semente=e2e-1&nivel=medio` (a partida
  segue igual); a asserção `Treino, sem relógio` vira `Treino · Médio, sem relógio`; um teste novo abre `/treino` sem nível,
  escolhe "Fácil" e confere a faixa.
- [ ] **Step 6:** `pnpm check`; `pnpm e2e`; atualizar a spec 3 §2.6 (níveis) e o resumo do `CLAUDE.md` se ele citar a rota do
  treino; commit `feat(web): níveis do treino (Fácil, Médio, Difícil)`.

---

## Depois da última tarefa

Revisão de código da fatia inteira, `check` e `e2e` verdes na CI da branch, fast-forward na `main`, CI da `main` verde e um
aviso curto à sessão principal (com o veredito do portão do Difícil).
