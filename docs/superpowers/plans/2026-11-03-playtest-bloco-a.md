# Pontos do playtest, bloco A: a mesa que se explica (pontos 1, 2, 6 e 9) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a mesa conta o que aconteceu. Cada especial do oponente vira um momento legível (a carta grande no centro, com uma placa
que diz o que ela fez, com os números do motor). As cartas da mão sem jogada agora ficam apagadas. As marcas de estado viram placas com
medalhão, e a cura passiva mostra a causa.

**Architecture:**
- **Uma batida nova, `moment`:** a especial do oponente (`BuffPlayed`, `GuardPlayed`, `TrapUsed`, `Sacrificed`, `CardStolen` de quem não
  é o jogador desta tela) deixa de ser `move` e vira `moment`, que não encolhe no teto de decisão. A primeira do turno dura 1,6 s, e as
  seguintes do mesmo turno 1,1 s. A batida carrega dois instantes: o voo (`flyAtMs`) e o impacto (`impactAtMs`). O pouso, a saída das
  cartas e os atrasos de layout da fatia 5 passam a contar do impacto nessas batidas.
- **A conta dos momentos do turno** é uma função pura do protocolo (`momentsMs`), lida por três lugares: a linha do tempo da web (que
  encolhe a segunda), o bot do treino (que espera o momento como espera as cenas) e o servidor (que estende o prazo de quem decide
  depois, e para o relógio dele, como faz com as cenas). O servidor não guarda a conta do turno: ele dá sempre a folga cheia (1,6 s).
- **O véu de 35%** é uma cortina leve: passa pela mesma `FlashLock` das cenas. Se a trava recusar, o momento toca sem véu.
- **A mão apagada** sai da lista legal (`legalFor`), não do `locked`: durante as batidas a mão está travada, mas não apaga e acende a cada
  batida.
- **As placas** trocam as etiquetas de hoje (`campo-estado`, em `PlayerField.tsx`) e ganham três gestos lentos sem fim (cura, alma,
  espelho), a lista de animações sem fim que um teste trava passa de 2 para 5.
- **A cura que se explica** junta três peças que já existem: a batida do `Healed` (`reason` DEFENSE), a cópia da carta que sai
  (`Leaving.tsx`) e o "+N" do placar (`Effects.tsx`). A conta da faixa sai de uma função nova do motor (`defenseHealOf`), que a cura
  passa a usar, sem mudar regra.

**Tech Stack:** React 19, Motion (`layoutId`), Web Animations (só `transform`, `translate`, `scale` e `opacity` animam), Vitest (jsdom),
Playwright, o núcleo do servidor no Node puro.

**Spec:** `docs/superpowers/specs/2026-11-03-playtest-design.md` §3 (os pontos), §8 (as restrições) e §10 (as escolhas). Protótipo:
`docs/superpowers/specs/2026-11-03-playtest-prototipo.html`, quadros `p1`, `p2`, `p6` e `p9`, variante **A** em todos (`decisoes.md`
2026-11-03 (4)).

## Escolhas para o autor aprovar

Cada uma tem a recomendação de quem escreveu. Nada do código muda antes da aprovação dele.

- **A1. A folga do servidor é sempre a cheia.** Online, o prazo de quem decide depois de uma especial do oponente cresce 1,6 s, mesmo na
  segunda do turno (que toca em 1,1 s). Contar o turno no servidor pediria estado novo na sala (e subir o `STATE_SCHEMA`) só para
  economizar meio segundo do relógio parado. **Recomendo** a folga cheia. O treino conta certo (a sala local sabe o turno).
- **A2. As suas especiais não alongam o seu prazo** (vale com a A9 (b) ou (c); com a A9 (a), online a folga vale para os dois). A folga
  vale só para quem vê o momento: o J que você joga no seu turno não para o seu relógio; o K que você joga para o relógio da reação do
  oponente, que vê o momento. É a leitura literal da pergunta 7 que ele aprovou.
- **A3. O véu passa pela trava de flash.** Um véu escuro de 35% sobre a mesa inteira é uma troca de luminância (spec da web §10.4). Ele
  sobe e desce pela mesma `FlashLock` da cortina das cenas; recusado, o momento toca sem véu. Com movimento reduzido, nunca há véu.
- **A4. A placa não vai para o leitor de tela.** A §3.1 da spec dizia "a placa vai para a região viva da mesa, como as faixas", mas as
  faixas são `aria-hidden`: o registro acessível é o histórico, que já tem a linha de cada especial. **Recomendo** seguir as faixas
  (a placa `aria-hidden`), e corrigir a frase da spec na Task 8.
- **A5. A consequência diz o total, não o multiplicador.** O exemplo da spec dizia "o seu Ataque cai para ×2". O multiplicador sairia de
  uma conta na interface (a regra 1 + J); o total sai do motor (`attackPower`, `defensePower`). **Recomendo** o total ("o seu Ataque
  cai para 76"). Com um Selvagem como alvo, a placa só diz o título: o evento não diz de que zona ele saiu.
- **A6. O Reflect fica na zona dele.** A zona "Reflect ativo" já tem as três cartas e o espelho da fatia 4. Ela ganha a linha do que faz
  ("o próximo golpe volta para ele") e o brilho lento no espelho; não vira uma placa a mais. O "Ataque Absoluto armado" vira placa, como
  as outras três.
- **A7. A primeira cura da partida é de qualquer lado.** A faixa que explica a regra toca na primeira cura passiva da partida, sua ou do
  oponente, uma vez. Recarregar a página esquece (como a desolação da fileira), e a faixa pode tocar de novo uma vez.
- **A9. Online, a sua jogada seguinte não pode cortar o momento que o oponente vê.** Quem joga não vê o momento das próprias especiais,
  então nada o segura: um J, um Q e um K em um segundo chegam ao outro como três `state`s, e cada um troca a linha do tempo dele
  (`useBeatPlayer`), cortando o momento no meio. No treino isso não acontece (o Bot espera, Task 3). As saídas:
  - **(a) quem joga espera o momento do outro** (recomendo): online, a batida da sua especial dura o mesmo que o momento que o oponente vê
    (1,6 s, e 1,1 s a partir da segunda do turno), sem a carta grande: a sua carta voa e pousa como hoje, e os controles ficam travados até
    o fim. O servidor dá a folga aos dois (a A2 muda: o seu relógio também para). É o que o treino já faz com o Bot, e os dois lados ficam
    no mesmo ritmo; o custo é esperar ~1,1 a 1,6 s depois de cada especial sua, online;
  - **(b) a mesa enfileira:** o `state` que chega no meio de um momento espera o fim dele. Ninguém espera, mas a mesa já desenha a carta
    seguinte antes da vez dela, e o `useBeatPlayer` ganha uma fila;
  - **(c) aceitar o corte:** o momento cortado some, e o histórico guarda a linha.

  As linhas marcadas **(A9a)** nas Tasks 1, 2 e 3 são da saída (a); com outra escolha, o plano muda nelas antes da execução.
- **A8. A execução:** aqui mesmo, tarefa por tarefa, na branch `feat/playtest-bloco-a` (saída da `main` com a spec), teste primeiro, e
  no fim um revisor novo, num subagente, lendo a branch inteira (as fatias 4 a 5 tiveram só a revisão de quem escreveu). **Recomendo**
  assim: as tarefas dependem umas das interfaces das outras (a batida nova passa por todas), e um erro no ritmo custa o playtest.

## Global Constraints

- **Fotossensibilidade** (spec da web §10.4): no máximo 1 inversão por cena, ≥ 300 ms; nunca mais de 3 trocas claro ↔ escuro em 1 s;
  com movimento reduzido, nenhuma inversão. O véu do momento conta como troca. Não afrouxe os limites para uma cena passar.
- **Movimento reduzido:** o momento é a carta que aparece e some no centro, com a placa, sem virada, voo nem véu; a mão apagada não
  desce animando; as placas não fazem gesto; a essência da cura não voa (a faixa e o "+N" ficam).
- **Desempenho (§11 da direção visual):** ≥ 50 quadros/s com a CPU 4×; ≤ 60 partículas vivas; só `transform`, `translate`, `scale` e
  `opacity` animam. O filtro da carta apagada é parado; o brilho dos K e o halo usam um pseudo-elemento com `opacity`, nunca
  `box-shadow` (o `box-shadow` da carta é do foco e do anel de ouro).
- **Telas:** 360 × 640 no celular e 1366 × 657 no PC baixo, sem rolagem de lado.
- **Sem regra na interface:** totais de `attackPower` e `defensePower`; jogadas de `legalFor`; a cura de `defenseHealOf`; a cura passiva
  de `defenseHealActive`; o Ataque Absoluto de `absoluteAttackArmed`.
- **Partidas de referência intactas:** `RULES_VERSION`, `RULES_DIGESTS` e os snapshots golden não mudam (a Task 7 só extrai uma função
  do motor). `STATE_SCHEMA` e `E2E_SEED` (vazia) não mudam. O servidor muda o prazo: o deploy é do autor.
- **Teto de decisão:** `DECISION_CAP_MS` (1 s) segue valendo para as batidas comuns; o momento fica fora dele, como as cenas e a faixa
  da iniciativa.
- **As cópias** (a carta grande do momento, a essência) nunca têm `data-card-id` e são `aria-hidden`.
- **Arte original** (§10.6): o medalhão, o cadeado, a essência e a placa são desenhados em código. **Números sem textura** (§10.7): a
  placa e a faixa da cura usam a fonte de texto com `tabular-nums`.
- **O histórico continua** com todas as linhas; os momentos e as placas não o substituem.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip (o smoke confere). O momento é do pedaço inicial (é frequente); as cenas seguem fora.
- **Testes:** em `test/ui`, todo arquivo é `.test.tsx`. O jsdom não tem layout: a posição se confere nas fotos da Task 8.
- **Contratos que ficam:** o toque e o teclado (WCAG 2.5.7), o arrasto (`useCardDrag`), o `data-sem-pulo`, o pulo por toque e Esc.

## Review Focus

0. **Online, três especiais seguidas de quem joga** (J, Q e K em um segundo): o oponente vê os três momentos inteiros, o segundo e o
   terceiro em 1,1 s, e o relógio de quem jogou não corre durante a espera (A9a) → testes das Tasks 1 e 3.
1. **Duas especiais do Bot no mesmo turno, com a sua reação no meio** (o K dele abre a sua janela, você passa, ele joga um J): a segunda
   toca em 1,1 s; o `TurnStarted` seguinte zera a conta; o servidor dá a folga cheia nas duas → testes das Tasks 1 e 3.
2. **A Armadilha dele no seu J na janela do seu ataque:** o momento vem antes do golpe, o J estoura no impacto, e o golpe vem depois, já
   sem o J → testes da Task 1 (a linha do tempo com `TrapUsed` e depois `DamageDealt`) e da Task 2 (o J sai no impacto, com estouro).
3. **O pulo e o `state` novo no meio do momento:** nenhuma cópia órfã, a carta de verdade aparece, o véu desce pela trava, o som do
   impacto não toca depois → testes das Tasks 2 e 4.
4. **A mão no Equipar, na vez do Bot e depois do seu passe:** todas apagadas (depois do passe a lista legal ainda traz a Armadilha, mas o
   servidor segura o passe e a mão não escolhe), sem piscar a cada batida, e o toque segue mostrando o motivo → teste da Task 5.
5. **A primeira cura com a vida cheia** (`amount` 0: a batida é quieta, sem faixa, e a próxima cura de verdade é a primeira) **e a cura
   capada** (`amount` menor que o bruto: a faixa diz a conta e "até a vida cheia") → testes da Task 7.

---

### Task 1: O momento na linha do tempo e no protocolo

**Files:**
- Modify: `packages/protocol/src/scenes.ts` (e o `index.ts` do pacote, se ele reexporta por nome)
- Modify: `packages/web/src/model/timeline.ts`
- Test: `packages/protocol/test/scenes.test.ts`, `packages/web/test/model/timeline.test.ts`

**Interfaces:**
- Produces (protocolo):
  - `SPECIAL_MOMENT_MS = { first: 1_600, next: 1_100 } as const`.
  - `MOMENT_PLAYS: ReadonlySet<GameEvent['type']>` = `BuffPlayed`, `GuardPlayed`, `TrapUsed`, `Sacrificed`, `CardStolen`.
  - `momentsMs(events: readonly GameEvent[], viewer: PlayerId | null, before?: number): { ms: number; count: number }`: percorre os
    eventos em ordem; `TurnStarted` zera a conta; cada evento de `MOMENT_PLAYS` com `player !== viewer` (com `viewer` `null`, todos) soma
    `first` se a conta está em 0 e `next` se não, e sobe a conta. `count` é a conta depois dos eventos.
  - `stepAllowanceMs(events: readonly GameEvent[], viewer: PlayerId | null, before?: number): number` = `min(SCENE_ALLOWANCE_CAP_MS,
    sceneAllowanceMs(events) + momentsMs(events, viewer, before).ms)`.
- Produces (web, `timeline.ts`):
  - `MOMENT_MS = { first: { flipMs: 300, plateMs: 1_000, flyMs: 300 }, next: { flipMs: 250, plateMs: 600, flyMs: 250 } } as const`.
  - `Beat.kind` ganha `'moment'`; `Beat.moment: { flyAtMs: number; impactAtMs: number } | null` (absolutos, como `startMs`):
    `flyAtMs = startMs + flipMs + plateMs`, `impactAtMs = startMs + durationMs`. `null` fora do momento.
  - `TimelineOptions` ganha `viewer?: PlayerId | null` (sem ele, nenhum momento: os testes e o replay antigos seguem iguais) e
    `momentsBefore?: number` (padrão 0).
  - **(A9a)** `TimelineOptions.holdOwnMoments?: boolean` e `ownMomentsBefore?: number`: com ele (só online), a sua especial segue `move`,
    mas com a duração do momento que o oponente vê (a conta de `momentsMs` do lado dele, a partir de `ownMomentsBefore`) e fora do teto.
  - **O encaixe com o bloco E:** o `never` do `classify` pega os eventos novos da regra do 16 (a janela da Ressurreição). Quem mesclar por
    último classifica os dele; nenhum deles é especial do oponente.

- [ ] **Step 1: Escrever os testes que falham**
  - `momentsMs`: um `BuffPlayed` de `p2` visto por `p1` → `{ ms: 1600, count: 1 }`; com `before: 1` → `{ ms: 1100, count: 2 }`; o de
    `p1` visto por `p1` → `{ ms: 0, count: 0 }`; `[GuardPlayed p2, TurnStarted, BuffPlayed p2]` → `{ ms: 3200, count: 1 }`; com
    `viewer: null`, os dois lados contam; um `GuardPlayed` com 3 K é um momento só.
  - `stepAllowanceMs`: `Resurrected` (4,6 s) e duas especiais (1,6 + 1,1) → `min(8000, 7300)` = 7300; três cenas longas → 8000.
  - As somas batem: `flipMs + plateMs + flyMs` de `MOMENT_MS.first` = `SPECIAL_MOMENT_MS.first`, e o mesmo com `next`.
  - `buildTimeline` com `viewer: 'p1'`: o `GuardPlayed` de `p2` vira `moment` de 1600 ms, com `flyAtMs = startMs + 1300` e
    `impactAtMs = startMs + 1600`; dois `BuffPlayed` de `p2` no mesmo `state` → 1600 e 1100; com `momentsBefore: 1` → o primeiro já é
    1100; o `BuffPlayed` de `p1` segue `move` de 300 ms; no `catchUp` nada vira `moment`; sem `viewer`, nada vira `moment`.
  - **O teto:** `[BuffPlayed p2, DamageDealt]` com `decisionPending` → o momento fica com 1600 ms e o dano encolhe sozinho até 1000 ms
    (o momento não conta no teto); com `reducedMotion` o momento tem as mesmas durações (é informação).
  - `[TrapUsed p2 (alvo o J de p1), DamageDealt p1]` → `moment` e depois `damage`, nessa ordem, e o `impactAtMs` do momento é o
    `startMs` do dano.
  - **(A9a)** com `holdOwnMoments` e `viewer: 'p1'`: o `BuffPlayed` de `p1` é `move` de 1600 ms, sem `moment`; o segundo do turno, 1100;
    com `decisionPending`, não encolhe; sem `holdOwnMoments`, 300 ms como hoje.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/protocol exec vitest run test/scenes.test.ts` e `pnpm --filter @coringa/web exec vitest run test/model/timeline.test.ts`
Expected: FAIL (`momentsMs` inexistente; a batida segue `move`).

- [ ] **Step 3: Implementar** as funções do protocolo e, no `timeline.ts`, a classificação: as cinco jogadas viram `moment` só ao vivo
  (fora do `catchUp`), com `options.viewer` não nulo e `event.player !== viewer`. A duração vem de uma conta que começa em
  `momentsBefore` e segue a mesma regra de `momentsMs` (o `TurnStarted` zera): use `momentsMs` evento a evento, sem repetir a regra.
  O momento é `uncapped`, como as cenas. Atualize o comentário do topo do `scenes.ts` (a tabela agora é das cenas e dos momentos).
- [ ] **Step 4: Rodar os dois arquivos e o resto do pacote**

Run: `pnpm --filter @coringa/protocol test` e `pnpm --filter @coringa/web exec vitest run test/model`
Expected: PASS, sem mudar os testes antigos da linha do tempo.

- [ ] **Step 5: Commit**: `feat(web): o momento da especial do oponente na linha do tempo (ponto 1)`, com o diário e o `estado.md` (regra 6).

### Task 2: O momento na mesa: atrasos, pouso, saída e véu

**Files:**
- Modify: `packages/web/src/model/table-motion.ts`, `packages/web/src/model/effects.ts` (`delaysOf`)
- Modify: `packages/web/src/ui/anim/useBeatPlayer.ts`, `packages/web/src/ui/anim/Stage.tsx`, `packages/web/src/ui/anim/Scene.tsx`
- Modify: `packages/web/src/ui/cards/Card.tsx`
- Test: `packages/web/test/model/table-motion.test.ts`, `packages/web/test/model/effects.test.ts`, `packages/web/test/ui/animation.test.tsx`, `packages/web/test/ui/table-motion.test.tsx`

**Interfaces:**
- Consumes: `Beat.moment`, `TimelineOptions.viewer` e `momentsBefore`, `momentsMs` (Task 1).
- Produces:
  - `Landing` ganha `snap?: true`: a carta não tinha de onde voar e é a cópia do momento que chega nela; fica escondida até `atMs` e
    aparece de uma vez, com o achatamento e a poeira.
  - Nas batidas `moment`: `landingsOf` dá às cartas do `BuffPlayed` e do `GuardPlayed` `{ atMs: impactAtMs, drop: false, snap: true }`, e
    à numérica do `CardStolen` `{ atMs: impactAtMs + landAfterMs, drop: false }`; `leavingOf` dá ao alvo do `TrapUsed` e do `Sacrificed`
    `{ startMs: impactAtMs, shatter: true }` (a carta usada pelo oponente não está na mesa: nada); `delaysOf` e `shiftDelaysOf` usam
    `impactAtMs` no lugar de `startMs`.
  - `BeatPlayer.veil: 'scene' | 'moment'`: o tipo da batida que subiu a cortina que está no ar (`'scene'` sem cortina). O `curtained`
    passa a valer também para `moment`.
  - A `Machine` guarda `moments: number` (a `count` de `momentsMs` depois da linha do tempo dela). A máquina nova recebe
    `momentsBefore` da anterior; o `resync` zera. `viewer` é `state.view.me`.
  - `BeatOverlay` ganha `veil: 'scene' | 'moment'`: com `'moment'`, a cortina é de 35% (`bg-tinta/35`), sem o painel de cena.

- [ ] **Step 1: Escrever os testes que falham**
  - `landingsOf`, `leavingOf`, `delaysOf` e `shiftDelaysOf` numa linha do tempo com `viewer: 'p1'`: os valores acima, com números
    escritos no teste (um `GuardPlayed` de `p2` no começo → `snap` em 1600; um `TrapUsed` de `p2` no J de `p1` → o J sai em 1600 com
    estouro; um `CardStolen` de `p2` → a numérica com atraso 1600 e pouso em 2020).
  - `useBeatPlayer` (pela mesa do `animation.test.tsx`): dois `state`s seguidos com um `BuffPlayed` de `p2` cada → a segunda batida dura
    1100; um `state` com `TurnStarted` no meio → volta a 1600; um `resync` no meio → volta a 1600.
  - **O véu:** a batida `moment` sobe a cortina com `data-veu="momento"` e a desce no fim, pela `FlashLock` (use a sonda
    `installFlashProbe`, de `test/ui/anim-harness.tsx`); com a trava cheia (uma faixa e uma cortina de antes), o momento toca sem véu e a
    batida não espera; com movimento reduzido, nenhum véu.
  - **O pulo** no meio do momento: o véu desce pela trava, e a carta de verdade (`snap`) fica visível na hora.
  - `Card` com `snap`: `opacity` 0 até o `at`, e visível depois dele (o `useTableMotion` achata nele).
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/table-motion.test.ts test/model/effects.test.ts test/ui/animation.test.tsx test/ui/table-motion.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** No `Card.tsx`, a carta com `snap` entra como a que cai (`enter` no `at`), com 50 ms de esmaecimento e
  sem a queda de `dropPx`. No `useBeatPlayer`, a cortina guarda o tipo da batida que a subiu (`veil`). No `Stage`, passe `veil` ao
  `BeatOverlay`. **(A9a)** O `Stage` ganha a prop `online` (a `PlayTable` a passa: a partida não é treino nem tutorial; o replay não a
  passa) e a leva ao `useBeatPlayer` como `holdOwnMoments`; a `Machine` guarda também a conta das suas (`ownMoments`).
- [ ] **Step 4: Rodar** o comando do Step 2 e depois `pnpm --filter @coringa/web test`.
Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): o momento na mesa (o pouso, a saída e o véu pela trava)`, com o diário e o `estado.md`.

### Task 3: O momento no servidor e no treino

**Files:**
- Modify: `packages/server/src/core/timing.ts`
- Modify: `packages/web/src/model/local-room.ts`
- Test: `packages/server/test/core/timers.test.ts`, `packages/web/test/model/local-room.test.ts`

**Interfaces:**
- Consumes: `stepAllowanceMs`, `momentsMs` (Task 1).
- Produces:
  - `schedulePhase` usa `stepAllowanceMs(events, decider)` no lugar de `sceneAllowanceMs(events)`. `decider` é quem decide na fase de
    depois do passo: `ATTACK_MAIN.player`, `REACTION.responder`, `ORDER_CHOICE.player`; no `EQUIP` e no `GAME_OVER`, `null` (todos
    contam). Sem `before`: a folga é sempre a cheia (A1). **(A9a)** O `decider` passa a ser sempre `null`: online, quem jogou também
    espera o momento, e o relógio dele para junto.
  - **O encaixe com o bloco E:** a fase nova da janela da Ressurreição, de um jogador só, dá o `decider` dela. Quem mesclar por último
    acrescenta o caso e confere de novo os testes do prazo.
  - `LocalRoom` guarda `#momentsInTurn` (zera na revanche e no `TurnStarted`, pela própria `momentsMs`) e soma ao `#sceneUntil`
    `momentsMs(events, HUMAN_SEAT, #momentsInTurn).ms` além das cenas.

- [ ] **Step 1: Escrever os testes que falham**
  - Servidor: `p2` joga K no turno dele e abre a janela de `p1` → o prazo da reação é `TIMERS.reactionMs + 1600` e o relógio de `p1`
    fica parado até `now + 1600`; **(A9a)** `p1` joga um J no próprio turno → o prazo dele cresce 1600 e o relógio dele para (sem a
    A9a: não muda); um `Resurrected` no mesmo passo de uma especial soma as duas, até 8000.
  - Treino: depois do `BuffPlayed` do Bot, o próximo timer dele é `1600 + 600`; depois do segundo, no mesmo turno, `1100 + 600`; o K que o
    jogador joga abre a janela do Bot, e o timer do Bot na reação é 0 (o jogador não vê momento das próprias jogadas); a revanche zera a
    conta.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/server exec vitest run test/core/timers.test.ts` e `pnpm --filter @coringa/web exec vitest run test/model/local-room.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar.** Atualize o comentário de `schedulePhase` (a folga agora é das cenas e dos momentos) e o do `#commit`.
- [ ] **Step 4: Rodar** os dois arquivos, depois `pnpm --filter @coringa/server test` (inclui o workerd) e `pnpm --filter @coringa/web test`.
Expected: PASS.
- [ ] **Step 5: Commit**: `feat(server, web): o prazo e o bot do treino esperam o momento da especial`, com o diário e o `estado.md`
  (anotando que o online só muda com o deploy do autor).

### Task 4: O desenho do momento: a carta grande, a placa e o som

**Files:**
- Create: `packages/web/src/ui/anim/Moment.tsx`
- Modify: `packages/web/src/ui/anim/Stage.tsx`, `packages/web/src/ui/cards/Card.tsx` (`ghost`)
- Modify: `packages/web/src/model/copy.ts` (`momentPlate`), `packages/web/src/model/sound.ts`, `packages/web/src/sound/synth.ts`
- Modify: `packages/web/src/styles.css`
- Test: `packages/web/test/model/copy.test.ts`, `packages/web/test/ui/moment.test.tsx`, `packages/web/test/ui/sound.test.tsx`

**Interfaces:**
- Consumes: `Beat.moment`, `BeatPlayer.veil` (Tasks 1 e 2); `attackPower`, `defensePower`, `defenseHealActive`, `absoluteAttackArmed` do motor.
- Produces:
  - `momentPlate(event: GameEvent, view: PlayerView, names: Names): { title: string; consequence: string | null } | null` (`null` para
    eventos fora de `MOMENT_PLAYS`). `view` é a de depois do passo; os números são os dela.
  - `MomentLayer({ beat, view, names, reduced }: { beat: Beat | null; view: PlayerView; names: Names; reduced: boolean })`, montada pelo
    `Stage` dentro da `FxLayer`, com `data-momento` e `aria-hidden`. Só desenha com `beat?.kind === 'moment'`.
  - `Card` ganha `ghost?: boolean`: sem `data-card-id`, sem `onSelect`, `aria-hidden` (a cópia que nenhum seletor da carta de verdade pega).
  - `Cue` ganha `'momento'` (a virada de papel, no começo) e `cueOf` a devolve para toda batida `moment`. O impacto soa no `MomentLayer`,
    no `impactAtMs`: `'pouso'` para o `BuffPlayed` e o `GuardPlayed`, `'quebra'` para o `TrapUsed` e o `Sacrificed`, nenhum para o
    `CardStolen` (o dano do roubo já soa). O timer do impacto sai com o pulo, o `state` novo e a desmontagem.

**O texto da placa** (`nome` = `names.of(event.player)`; "dele" é o oponente desta tela; o alvo é seu):

| Evento | Título | Consequência |
|---|---|---|
| `BuffPlayed` J | `${nome} pôs 1 J nos Bônus de ataque` | armado: `4 J: o próximo ataque dele é Absoluto`; senão `o Ataque dele vai a ${attackPower}` |
| `BuffPlayed` Q | `${nome} pôs 1 Q nos Bônus de defesa` | com `absoluteDefense`: `4 Q: a Defesa Absoluta começa`; senão `a Defesa dele vai a ${defensePower}` |
| `GuardPlayed` | `${nome} pôs ${n} K na Guarda` | cura ativa: `com ${g} K, a Defesa dele que cai o cura`; senão `o K absorve o próximo golpe inteiro` (`n` > 1: `cada K absorve um golpe inteiro`) |
| `TrapUsed` | `${nome} quebra 1 ${J\|Q\|K} seu` | J: `o seu Ataque cai para ${attackPower}`; Q: `a sua Defesa cai para ${defensePower}`; K: `a sua Guarda fica com ${n} K` (0: `a sua Guarda ficou vazia`) |
| `Sacrificed` | `${nome} sacrifica 1 ${J\|Q} e quebra 1 ${J\|Q} seu` | a mesma do `TrapUsed` |
| `CardStolen` | `${nome} rouba o seu ${valor} do Ataque` / `da Defesa` | `o seu Ataque cai para ${attackPower}` / `a sua Defesa cai para ${defensePower}` |

Com o Selvagem jogado, o "1 J" (ou Q, A) vira "o Selvagem como J". Com o Selvagem como alvo, `quebra o seu Selvagem` e a consequência é
`null` (A5). Nenhuma placa fala da Exódia, nem com 3 K (`decisoes.md` 2026-11-03 (4), ponto 4).

- [ ] **Step 1: Escrever os testes que falham**
  - `momentPlate`: uma linha por linha da tabela, com a `view` montada no teste e os números escritos (por exemplo, o `TrapUsed` no seu J
    com o seu Ataque em 76 → `{ title: 'Bot quebra 1 J seu', consequence: 'o seu Ataque cai para 76' }`); o Selvagem como alvo → `null`
    na consequência; 3 K na Guarda dele → a consequência é a da cura, sem a palavra "Exódia".
  - `moment.test.tsx` (a mesa com a sonda de tempo dos outros testes de animação):
    - a batida `moment` monta `[data-momento]` com a carta (`ghost`, sem `data-card-id`) e a placa (o título e a consequência);
    - a placa some no `flyAtMs`, e a camada no fim da batida; as cartas do Trap, do Sacrifício e do Roubo seguem ao cemitério depois do
      impacto e somem em `exitMs`;
    - o som: `'momento'` no começo e `'pouso'` (ou `'quebra'`) no impacto; pulado no meio, o impacto não soa;
    - com movimento reduzido: a carta e a placa aparecem e somem no lugar, sem `transform` animado;
    - nenhum elemento do momento tem `data-card-id`, e a camada é `aria-hidden`.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/copy.test.ts test/ui/moment.test.tsx test/ui/sound.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.**
  - A virada (`flipMs`): a carta sai da mão dele (o centro de `[data-campo="<oponente>"] .area-mao`), de costas, gira em `rotateY` e cresce
    até o centro da mesa (o tamanho `hand`, escala 1,6 no PC e 1,25 no celular). O `GuardPlayed` com mais de um K abre em leque, 18 px um do
    outro.
  - A placa (`plateMs`): papel com a borda de tinta, embaixo da carta; o título em `font-madeira`, a consequência em `font-texto` com
    `tabular-nums`. No celular cabe em 360 px (quebra em duas linhas, nunca rola).
  - O voo (`flyMs`): até o retângulo da carta de verdade (`[data-card-id]`, escondida até o `snap`) ou do alvo (a cópia da `Leaving`,
    `[data-saindo-id]`). Medido no começo do voo, depois de a mesa assentar.
  - A pista `momento` no `synth.ts`: uma virada de papel curta (ruído filtrado, ~120 ms), no volume do `carta`.
- [ ] **Step 4: Rodar** o comando do Step 2 e `pnpm --filter @coringa/web test`. Confira o orçamento: `pnpm --filter @coringa/web smoke`.
Expected: PASS, e o JavaScript inicial ≤ 200 KB gzip.
- [ ] **Step 5: Commit**: `feat(web): a carta grande e a placa do momento, com o som`, com o diário e o `estado.md`.

### Task 5: A mão que diz o que joga agora (ponto 2)

**Files:**
- Modify: `packages/web/src/model/plays.ts`
- Modify: `packages/web/src/ui/table/context.ts`, `packages/web/src/ui/table/Table.tsx`, `packages/web/src/ui/table/PlayTable.tsx`
- Modify: `packages/web/src/ui/table/Hand.tsx`, `packages/web/src/ui/table/TableCard.tsx`, `packages/web/src/ui/cards/Card.tsx`, `packages/web/src/ui/table/icons.tsx`, `packages/web/src/styles.css`
- Test: `packages/web/test/model/plays.test.ts`, `packages/web/test/ui/table.test.tsx`

**Interfaces:**
- Produces:
  - `liveHandIds(view: PlayerView, legal: PlayerAction[], plays: TablePlays): ReadonlySet<string>`: as cartas da mão com jogada agora. São
    as chaves de `plays.byCard`, mais as cartas da mão cujo tipo aparece numa combinação legal (`REFLECT`, `CANCEL_REFLECT`, `DEVASTATE`,
    pela regra do `roleKey`: qualquer carta do mesmo tipo vale) e as cartas de um `DISCARD` legal.
  - `TableUi.liveCards: ReadonlySet<string> | null`: `null` não apaga nada (o replay, o fim da partida, fora da `PlayTable`). Depois do
    seu passe na janela de reação (`passed`, na `PlayTable`), o conjunto é vazio: a lista legal ainda traz a Armadilha, mas a mão não escolhe.
  - `Card` ganha `idle?: boolean`: o nome acessível ganha ", sem jogada agora".
  - `LockIcon` em `icons.tsx` (um cadeado de traço de tinta, 24 × 24).

- [ ] **Step 1: Escrever os testes que falham**
  - `liveHandIds`: na sua vez com `[K, J, Q, A, W]` e o limite de J cheio, o J fica de fora; com o Reflect legal (K + J + Q), o J volta
    (o Sacrifício ou o Reflect o usam); na janela de reação ao ataque dele com `[J, Q, A]`, só o A; no Equipar e na vez do Bot, nenhuma.
  - Na mesa: a carta sem jogada tem `data-sem-jogada`, não tem `data-respira`, mostra o cadeado e o nome acessível termina em ", sem
    jogada agora"; a que joga tem `data-joga`; depois do seu passe, com a Armadilha ainda na lista legal, o A fica apagado; o toque na
    apagada mostra o motivo de hoje (`noPlayReason`); durante as batidas
    (`locked`), o conjunto não muda de uma batida para a outra (um `state` com batidas e a mesma lista legal: as mesmas marcas antes,
    durante e depois); com `liveCards` `null`, nenhuma marca.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/plays.test.ts test/ui/table.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** Na `<li>` da mão: `data-sem-jogada` com `translate: 0 8px` (transição de 200 ms, nenhuma com movimento
  reduzido) e o filtro parado `saturate(0.35) brightness(0.82)`; o cadeado no canto de cima, à direita, `aria-hidden`; `data-joga`
  com o fio de ouro de 3 px embaixo da carta (um `::after`). A apagada continua botão: o toque e o teclado seguem, e o arrasto já não
  pega (ela não tem zona).
- [ ] **Step 4: Rodar** o comando do Step 2 e `pnpm --filter @coringa/web test`.
Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): a mão apaga as cartas sem jogada agora (ponto 2)`, com o diário e o `estado.md`.

### Task 6: As placas de estado (ponto 6)

**Files:**
- Create: `packages/web/src/ui/table/StatePlate.tsx`
- Modify: `packages/web/src/ui/table/PlayerField.tsx` (`Zones`), `packages/web/src/ui/table/MirrorMark.tsx`, `packages/web/src/model/copy.ts`, `packages/web/src/styles.css`
- Test: `packages/web/test/ui/table.test.tsx`, `packages/web/test/ui/phases.test.tsx`

**Interfaces:**
- Produces:
  - `StatePlate({ kind, self, count }: { kind: 'cura' | 'res' | 'defesa' | 'ataque'; self: boolean; count?: number })`: o medalhão (a
    figura de hoje em 28 px, num disco da cor da marca), o nome e a linha do que faz. `count` só na Ressurreição, num selo.
  - `plateLine(kind: 'cura' | 'res' | 'defesa' | 'ataque' | 'reflect', self: boolean): string` em `copy.ts`:
    - `cura`: `a sua Defesa que cai vira vida` / `a Defesa dele que cai vira vida`;
    - `res`: `traz 1 numérica do cemitério`;
    - `defesa`: `imune até o golpe dele` / `imune até o seu golpe`;
    - `ataque`: `o seu próximo ataque quebra todos os K` / `o próximo ataque dele quebra todos os K`;
    - `reflect`: `o próximo golpe volta para ele` / `o seu próximo golpe volta para você`.
  - Os gestos: `data-gesto="cura"` (a cruz bate e solta um "+"), `"alma"` (a carta-alma sobe do túmulo) e `"espelho"` (o brilho passa no
    `MirrorMark`), um a cada ~3 s, com `@keyframes gesto-cura`, `gesto-alma` e `gesto-espelho` (só `transform` e `opacity`, área do
    medalhão). Com movimento reduzido, a mesa não põe o `data-gesto`.

- [ ] **Step 1: Escrever os testes que falham**
  - As quatro placas aparecem com o nome e a linha, nos dois campos, com a linha de cada lado; a Ressurreição mostra o selo com o número;
    a zona "Reflect ativo" ganha a linha (A6) e o `MirrorMark` o `data-gesto="espelho"`; com movimento reduzido, nenhum `data-gesto`.
  - No `phases.test.tsx`, a lista das animações sem fim passa a ser `['brilho-quadra', 'gesto-alma', 'gesto-cura', 'gesto-espelho',
    'respira']`, e `infinite` aparece 5 vezes na folha.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/table.test.tsx test/ui/phases.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** A linha do que faz some abaixo de 600 px de largura (`@media (max-width: 599px)`), e o nome fica. Atualize o
  comentário do `phases.test.tsx` e o do `styles.css` (a lista das animações sem fim).
- [ ] **Step 4: Rodar** o comando do Step 2 e `pnpm --filter @coringa/web test`.
Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): as marcas de estado viram placas com medalhão (ponto 6)`, com o diário e o `estado.md`.

### Task 7: A cura passiva que se explica (ponto 9)

**Files:**
- Modify: `packages/engine/src/combat.ts` (e o `index.ts` do motor)
- Modify: `packages/web/src/model/session.ts`, `packages/web/src/model/timeline.ts`, `packages/web/src/model/effects.ts`, `packages/web/src/model/table-motion.ts`, `packages/web/src/model/copy.ts`, `packages/web/src/model/tutorial-copy.ts`
- Modify: `packages/web/src/ui/anim/Leaving.tsx`, `packages/web/src/ui/anim/useBeatPlayer.ts`, `packages/web/src/ui/anim/Stage.tsx`, `packages/web/src/ui/cards/Card.tsx`, `packages/web/src/styles.css`
- Test: `packages/engine/test/combat.test.ts`, `packages/web/test/model/session.test.ts`, `packages/web/test/model/timeline.test.ts`, `packages/web/test/model/table-motion.test.ts`, `packages/web/test/ui/leaving.test.tsx`

**Interfaces:**
- Produces:
  - Motor: `defenseHealOf(card: NumCard, side: { defenseBuffs: readonly SpecialCard[] }): number` (o bruto da cura de uma carta);
    `healFromDefense` passa a usá-la. Nenhuma partida muda.
  - `SessionSnapshot.firstHealSeq: number | null`: o `seq` do `state` desta partida que trouxe a primeira cura passiva com `amount` > 0;
    zera na partida nova e é derivado (entra na lista `Derived`).
  - `TimelineOptions.teachHeal?: boolean` e `Beat.teach: boolean`: com `teachHeal`, o primeiro `Healed` de `source` DEFENSE com
    `amount` > 0 da linha do tempo tem `teach`. A batida segue `damage`, e a faixa dela vale (`hasBanner`).
  - `healRibbon(event: Extract<GameEvent, { type: 'Healed' }>, view: PlayerView): Ribbon` em `copy.ts`: título `Cura passiva`; motivo
    `${g} K na Guarda: a Defesa que cai vira vida · ${valor} × (1 + ${q} Q) = ${bruto}`, e `· até a vida cheia` quando `amount` < bruto.
    `bruto` = `defenseHealOf`; `q` = `bruto / valor - 1` (a conta é a do motor, dividida, como a da fileira).
  - `healsOf(beats: readonly Beat[]): ReadonlyMap<string, { fromMs: number; atMs: number; player: PlayerId }>` em `table-motion.ts`:
    cada carta que curou, com o início da batida em que ela saiu da Defesa (`CardsRemovedFromRow`) e o da batida da cura. `Run.heals`.
  - `CardFx.cause?: true`: os K da Guarda de quem curou, na batida da cura (`effectsOf`); a `Card` mostra o halo verde por um
    `::after` com `opacity` (`data-causa`).
  - Na `Leaving`, a carta que curou solta a essência: uma gota verde de 14 px que sai da cópia em `fromMs` e chega ao
    `[data-retrato="self"|"opponent"]` de quem curou em `atMs` (no mínimo 120 ms de voo), e some.

- [ ] **Step 1: Escrever os testes que falham**
  - Motor: `defenseHealOf` de um 6 com 2 Q → 18; os testes da cura de hoje seguem verdes, e os snapshots golden não mudam.
  - Sessão: o `state` com a primeira cura de `p2` dá `firstHealSeq` = o `seq` dele; uma cura depois não muda; a cura com `amount` 0 não
    conta; a revanche zera.
  - Linha do tempo: com `teachHeal`, só o primeiro `Healed` DEFENSE com `amount` > 0 tem `teach`; sem `teachHeal`, nenhum; no `catchUp`,
    nenhum.
  - `healRibbon`: 6 com 2 Q e `amount` 18 → `2 K na Guarda: a Defesa que cai vira vida · 6 × (1 + 2 Q) = 18`; `amount` 5 → termina em
    `· até a vida cheia`.
  - `healsOf`: `[CardsRemovedFromRow DEF (a carta 6), Healed (6)]` → `{ fromMs: 0, atMs: 300 }`.
  - `leaving.test.tsx`: a essência nasce em `fromMs`, voa até o retrato e some em `atMs`; com movimento reduzido não nasce; o pulo a tira.
  - Na mesa: os K de quem curou ganham `data-causa` na batida da cura e o perdem depois.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine exec vitest run test/combat.test.ts` e `pnpm --filter @coringa/web exec vitest run test/model test/ui/leaving.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** O `Stage` passa `teachHeal: snapshot.firstHealSeq === state.seq` ao `useBeatPlayer` (um campo novo de
  `BeatPlayerOptions`), e a fita e o tempo de leitura dela (`ribbonNow` e `readBanner`) saem de `healRibbon(event, state.view)` quando a
  batida da faixa tem `teach`, e de `bannerRibbon` nas outras. A dica `buffs` do
  tutorial ganha, no fim: `A cura é o valor da carta vezes (1 + o número de Q).`
- [ ] **Step 4: Rodar** o comando do Step 2, `pnpm --filter @coringa/engine test` (os snapshots golden sem `-u`) e
  `pnpm --filter @coringa/web test`.
Expected: PASS, sem nenhum snapshot regravado.
- [ ] **Step 5: Commit**: `feat(web): a cura passiva mostra a causa e explica a conta na primeira vez (ponto 9)`, com o diário e o `estado.md`.

### Task 8: E2E, medição, fotos e documentação

**Files:**
- Modify: `packages/web/e2e/scenes.spec.ts` (ou um `e2e/moment.spec.ts` novo), `packages/web/e2e/medir-cena.ts` (só se faltar um passo)
- Create: `docs/memoria/notas/medicao-bloco-a.md`
- Modify: `docs/superpowers/specs/2026-11-03-playtest-design.md` (§3: o que mudou na execução, e a frase do leitor de tela, A4),
  `docs/superpowers/specs/2026-10-17-interface-web-design.md` (o momento, a mão apagada, as placas e a faixa da cura, onde a spec da web
  fala das batidas e da mão), `docs/memoria/diario.md`, `docs/memoria/estado.md`

- [ ] **Step 1: Achar os passos.** Por script no scratchpad, nas fixtures de `e2e/fixtures/`, anotar fixture, rodada e passo de: um
  `GuardPlayed` do Bot; dois `BuffPlayed` do Bot no mesmo turno; uma Armadilha do Bot num J seu; um Roubo do Bot; uma cura passiva sua.
  Faltando um, achar uma semente do treino que o traga (`/treino?semente=<texto>&nivel=medio`).
- [ ] **Step 2: E2E** (Chromium, `pnpm e2e`): no replay da fixture, "Próximo passo" no `GuardPlayed` do Bot mostra `[data-momento]` com a
  placa, e o K aparece na Guarda dele no fim; o segundo `BuffPlayed` do turno toca mais curto; no treino (`e2e2631`, `nivel=medio`), no
  Equipar todas as cartas da mão têm `data-sem-jogada`, e na sua vez a carta jogável tem `data-joga`; a 360 × 640 e a 1366 × 657, nada
  rola de lado com a placa no ar. Uma marca curta se procura pela própria página, a cada quadro (como em `e2e/scenes.spec.ts`).
- [ ] **Step 3: Medir e fotografar** com o `medir-cena.ts` (o uso está no começo dele; com a 8787 ocupada, `MEDIR_PORTA=8797`), nas duas
  telas: o momento do K (fotos em 0, 300, 900, 1400 e 1700 ms) e a cura passiva (0, 150, 300, 600 ms). Registrar na nota os quadros/s
  com a CPU 4× (≥ 50), o p95 e o maior quadro. Conferir nas fotos: a carta grande centrada, a placa inteira no celular, o voo até a
  carta de verdade, a essência até o retrato, as placas de estado sem estourar a zona.
- [ ] **Step 4: A revisão final** (A8): um revisor novo lê a branch inteira contra a spec e este plano. O que ele achar e for defeito entra
  com teste; o resto vai para o diário.
- [ ] **Step 5: Documentação e fechamento.** As specs, o diário (com as escolhas técnicas e o que não foi conferido de verdade), o
  `estado.md` com o próximo passo (o autor joga o bloco A; o deploy é dele). `pnpm check`, as duas CI verdes, fast-forward na `main` e
  a branch publicada.
- [ ] **Step 6: Commit**: `docs: o bloco A do playtest, com a medição e as fotos`.
