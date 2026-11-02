# Sub-projeto 6, fatia 5: a fluidez das jogadas comuns (com os sons) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar às jogadas comuns o peso e a continuidade do §8: a carta jogada recua, voa e assenta com um achatamento e um sopro de poeira; a carta que quebra (K, Armadilha, Sacrifício) estoura em estilhaços; a compra e o Equipar chegam do monte em leque. Antes de somar efeitos, medir o quadro pesado da chegada do passo, o único problema de fluidez já medido. É a última fatia do sub-projeto 6.

**Architecture:**
- **Nada muda na linha do tempo:** as batidas e as durações do `buildTimeline` ficam como estão (há teste que as trava), e o `DECISION_CAP_MS` (1 s) também. Os efeitos correm por cima das batidas, presos ao início de cada uma. O pouso já acontece depois da batida hoje (a mola `LAYOUT_SPRING` assenta em ~0,42 s, e a batida comum tem 0,3 s).
- **O `transform` da carta é do Motion** (a projeção do `layoutId`, que também corrige o tamanho de mão → mini). O recuo e o achatamento usam as propriedades CSS próprias `translate` e `scale`, pela Web Animations: elas se compõem com o `transform` sem disputá-lo. O `translate` é um deslocamento de tela, e vale mesmo no meio do voo. O `scale` só entra depois do pouso, quando a projeção já voltou à identidade.
- **O que o código mostrou, e o §8 não diz:**
  - a carta que sai da mesa sem ir para o topo do cemitério desmonta na chegada do `state`, antes da batida dela. O motivo é que não há `AnimatePresence`, e o cemitério só desenha a carta de cima. Uma Guarda de 4 K quebrada mostra 1 K voando; os outros 3 já sumiram. A fileira de Ataque gasta some antes do golpe;
  - a carta do Bot não tem de onde voar (a mão dele são versos sem id) e aparece na chegada do `state`, também antes da batida;
  - as numéricas do Equipar (`PendingCard`, `animated={false}`) nem esmaecem: não passam pelo `enterDelay`.
- **As cópias de saída:** um componente de classe no palco lê, no `getSnapshotBeforeUpdate` (o DOM ainda é o de antes), o lugar e um clone de cada carta que a linha do tempo nova tira da mesa. Uma cópia fica no lugar dela até a batida. Na batida, ela voa ao cemitério ou estoura em cacos. É o mesmo recurso das cenas (cópias com outro id), agora fora delas.
- **As partículas** saem de `ui/scenes/particles.ts` para `ui/anim/particles.ts`, que não importa nada. A mesa as usa sem puxar o chunk das cenas.

**Tech Stack:** React 19, Motion (`layoutId`), Web Animations (só `translate`, `scale`, `transform` e `opacity`), Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` §1, §8, §10, §11 e §13. O §8 não teve rascunho: fecha com o autor jogando. Referências de desenho no protótipo (`2026-10-31-direcao-visual-prototipo.html`): `dust()` (linha 530) e o entulho da `devastacao()` (linhas 921 a 927).

## Escolhas para o autor aprovar

Cada uma tem a recomendação de quem escreveu. **Aprovadas em 2026-11-02, como recomendadas** (`decisoes.md` 2026-11-02 (9)). Ele acrescentou os pontos diretos do playtest (3, 4, 7, 8 e 12), que são a Task 8.

- **E1. O quadro da chegada entra?** Ele pesa de 100 a 225 ms com a CPU 4× em todas as medições (`notas/medicao-fatia-*.md`), e o §8 não o cita. A Task 1 mede sempre: os efeitos novos disparam nesse mesmo quadro, e somar efeito ao pior quadro sem uma linha de base é arriscado. **Recomendo:** consertar se a causa for nossa e local, com a meta de ≤ 100 ms com a CPU 4×. Se a causa for o próprio Motion, ou se o conserto pedir mudar a forma da mesa, a Task 1 para, registra e volta a você.
- **E2. As cartas que saem antes da hora.** **Recomendo:** segurar as cópias até a batida delas e levá-las ao cemitério nela. As vizinhas que deslizam para a vaga esperam a mesma batida. É o mesmo mecanismo dos estilhaços, e sem ele os K que não são o de cima nem teriam o que estourar. A Task 1 confirma pelas fotos antes de qualquer código.
- **E3. A carta do Bot.** **Recomendo:** ela espera a batida dela e cai no destino, de 14 px acima, com o achatamento e a poeira. A outra opção era voar dos versos da mão dele, no placar: custa a medida de mais um lugar e de longe se lê pouco.
- **E4. O recuo, na batida e não no toque.** A carta escolhida já sobe na mão (`selected`). O recuo de 90 ms (6 px para baixo e de volta) acontece quando a jogada volta do motor, e o voo começa logo depois.
- **E5. Os estilhaços no lugar do tremor.** A cópia mostra o traço da rachadura que já existe, treme 120 ms e estoura em até 10 cacos de papel, no máximo 40 por batida (4 K, 10 cada). A carta de verdade vai direto ao cemitério e fica escondida até o estouro.
- **E6. O leque sai do monte.** As cartas voam do número do monte, na faixa do meio, até a mão e até o painel do Equipar, 40 ms uma depois da outra. O intervalo encolhe se a batida for curta: o leque inteiro cabe nela. Os versos da mão do Bot entram do mesmo jeito.
- **E7. Os sons.** `carta` ganha o sopro do voo e a batida seca vai para o pouso (510 ms). Uma pista nova, `pouso`, para a carta do Bot e as do Equipar (a batida aos 220 ms). `quebra` estala no estouro (120 ms), com papel rasgando. Uma pista nova, `compra`, com quatro estalos de papel a 40 ms, só na sua compra. A poeira e a saída ao cemitério são mudas.
- **E8. Os pequenos anotados.** **Entram:** os controles do replay cortam o som da cena, pendente desde a fatia 2, e dois golpes colados tremem duas vezes. **Fica de fora:** o leitor de tela que anuncia o relógio de novo quando a Defesa Absoluta estende o prazo. É acessibilidade do relógio, não fluidez, e pede conferência com leitor de tela. Os outros pequenos de "Esperando o autor" seguem lá.
- **E9. A execução.** Aqui mesmo, tarefa por tarefa, na branch `feat/direcao-visual-fatia-5`, com a revisão final de quem escreveu o código, como nas fatias 4 e 4b.

## Global Constraints

- **Teto:** o `DECISION_CAP_MS` (1 s) e as durações do `buildTimeline` não mudam; nada do que entra aqui alonga uma batida (§8).
- **Desempenho (§11):**
  - ≥ 50 quadros/s com a CPU 4× e ≤ 60 partículas vivas;
  - só `translate`, `scale`, `transform` e `opacity` animam, sem `filter`, `drop-shadow` nem `box-shadow` animados;
  - partículas pela Web Animations (`spawn`), nunca pelo Motion quadro a quadro (o comentário do `InkSplat` registra o custo);
  - o quadro da chegada não piora mais de 10% sobre a linha de base da Task 1 (ou sobre a nova, se o conserto da E1 entrar).
- **Movimento reduzido:** só opacidade. Nada de recuo, voo, achatamento, poeira, cacos nem tremor; a informação é a mesma.
- **`catchUp` e `resync`:** nenhum efeito novo e nenhuma cópia. As cartas trocam como hoje.
- **Fotossensibilidade:** nada acende nem pisca; nenhum efeito desta fatia mexe na luminância da tela.
- **Sem regra na interface:** tudo sai dos eventos e da `view`. `RULES_VERSION`, `STATE_SCHEMA`, `SCENE_MS` e `E2E_SEED` (vazia) não mudam; o deploy é do autor.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip. O smoke segue provando que o chunk das cenas e o sintetizador ficam fora do inicial.
- **As cópias nunca têm `data-card-id`** (o seletor da carta de verdade não pode pegar uma), e todas têm `aria-hidden`.
- **Arte original:** a poeira e os cacos são desenhados em código. Os números seguem em Archivo com `tabular-nums`.
- **Testes:** em `test/ui`, todo arquivo é `.test.tsx` (outra extensão não roda, e nada avisa). O jsdom não tem layout: a posição se confere nas fotos.
- **Contratos que ficam:** o toque e o teclado (WCAG 2.5.7), o arrasto (`useCardDrag`), o `data-sem-pulo`, o pulo por toque e Esc, e o histórico como registro acessível.

## Review Focus

1. **4 K quebrando juntos** (o Ataque Absoluto quebra a Guarda inteira, num `GuardBroken` que é batida própria, depois da cena): 4 cópias que estouram, ≤ 60 partículas no pico → teste da Task 5.
2. **A jogada do Bot contra a sua:** a carta dele nunca aparece antes da batida dela, e o seu J que voa não achata a carta dele → testes da Task 4.
3. **A carta que só desliza** (outra saiu da frente dela): desliza na batida da carta que saiu, nunca por baixo da cópia, e sem achatar nem soltar poeira → testes das Tasks 2 e 4.
4. **O pulo, o `state` novo no meio, o `catchUp` e o `resync`:** nenhuma cópia órfã, nenhum timer que dispara depois, e a carta de verdade nunca fica escondida → testes das Tasks 4 e 5.
5. **O celular a 360 px:** o monte, a mão e o cemitério longe um do outro; as cópias e os cacos presos à camada; nada rola de lado → E2E da Task 9.

---

### Task 1: A linha de base e o quadro da chegada

**Files:**
- Modify: `packages/web/e2e/medir-cena.ts`
- Create: `docs/memoria/notas/medicao-fatia-5.md`
- Modify (só com a E1 e a causa local): os arquivos que o perfil apontar

- [ ] **Step 1: Achar os passos.** Por script no scratchpad, sobre as fixtures de `e2e/fixtures/`, escolher quatro passos e anotar fixture, rodada e passo:
  - uma jogada sua da mão (`BuffPlayed` ou `GuardPlayed`);
  - um `GuardBroken` com 2 K ou mais (ou, sem ele, um `TrapUsed`);
  - um ataque comum com `CardsRemovedFromRow`;
  - um `RoundStarted` do Equipar com `CardsDealt`.
- [ ] **Step 2: Estender o `medir-cena.ts`.**
  - `MEDIR_PERFIL=1` grava o perfil do Chromium (`browser.startTracing` / `stopTracing`) em `<saida>/<largura>-perfil.json`, só em volta do clique;
  - a medida ganha `chegada`: o maior intervalo nos 300 ms depois do `pointerdown` do clique. A própria página guarda o instante, num ouvinte em captura;
  - o resto do script fica como está, e o uso no começo do arquivo ganha as duas linhas.
- [ ] **Step 3: Medir e fotografar** os quatro passos nas duas telas, com `MEDIR_MS=1500` e `MEDIR_FOTOS=0,100,250,500,800`. Registrar na nota, em "Antes", os quadros/s, o p95, o maior quadro e a `chegada`. Nas fotos, conferir a E2: os K que não são o de cima e a fileira de Ataque somem já na primeira foto?
- [ ] **Step 4: Ler o perfil** do quadro da chegada e escrever na nota quanto pesa cada parte: o desenho do React, a medida de layout do Motion, o estilo e a pintura. Escrever a causa, sem palpite: só o que o perfil mostra.
- [ ] **Step 5: O ponto de decisão** (só com a E1 aprovada):
  - **se a causa for nossa e local:** consertar, com um teste que a trave (por exemplo, quantas vezes a mesa desenha ou mede num `state`) e medir de novo. A meta é `chegada` ≤ 100 ms com a CPU 4× nas duas telas;
  - **se a causa for o Motion, ou se o conserto mudar a forma da mesa:** parar, registrar na nota e no `estado.md` e levar ao autor. As Tasks 2 em diante seguem.
- [ ] **Step 6: Commit**: `chore(web): a medição dos passos comuns e o quadro da chegada`, com o diário e o `estado.md` (regra 6).

### Task 2: O movimento da mesa, no modelo

**Files:**
- Create: `packages/web/src/model/table-motion.ts`
- Test: `packages/web/test/model/table-motion.test.ts`

**Interfaces:**
- Produces:
  - `TABLE_MOTION = { recoilMs: 90, recoilPx: 6, landAfterMs: 420, squash: 1.06, squashMs: 160, dropPx: 14, dropMs: 220, dust: 5, dustMs: 520, crackShakeMs: 120, shards: 10, shardBudget: 40, shardMs: 650, exitMs: 360, fanStaggerMs: 40, dealFlightMs: 320 }`.
  - `recoilsOf(beats: readonly Beat[], me: PlayerId): ReadonlyMap<string, number>`: id → início da batida, para as suas cartas que saem da sua mão (`BuffPlayed.card`, `GuardPlayed.cards`, `TrapUsed.card`, `Sacrificed.card`, `CardStolen.ace`, `DevastationCast` k, a e x, com `player === me`).
  - `landingsOf(beats: readonly Beat[], me: PlayerId, draftShown: boolean): ReadonlyMap<string, { atMs: number; drop: boolean }>`:
    - a sua carta que voa da mão (`BuffPlayed`, `GuardPlayed`) e a numérica roubada (`CardStolen.card`): `startMs + recoilMs + landAfterMs` (a roubada sem o `recoilMs`), sem queda;
    - a carta do Bot (`BuffPlayed`, `GuardPlayed`): `startMs + dropMs`, com queda;
    - as do Equipar (`CardsPlaced`, a `card` de cada `placement`): `startMs + dropMs`. As do Bot caem. As suas só achatam se o rascunho estava à vista, ou seja, se você confirmou nesta página (`Table.tsx:153`). `draftShown` é o `equipConfirmed === 'thisPage'` do snapshot de antes do `state` da revelação, que o `Stage` guarda. Confirmadas antes de recarregar, não há rascunho, e elas caem como as do Bot.
  - `shiftDelaysOf(beats: readonly Beat[], view: PlayerView): ReadonlyMap<string, number>`: as cartas que ficam no lugar de onde outra sai (a mesma fileira, a Guarda, a zona de buffs ou a sua mão) esperam o `startMs` da batida da saída para deslizar. O lugar vem do evento (`CardsRemovedFromRow.row`, `GuardBroken`, `BuffRemoved`, o alvo de `TrapUsed` e `Sacrificed`, o `replaced` de `CardsPlaced`, as suas cartas que saem da mão), e as que ficam vêm da `view`. Sem isso, com as cópias da E2 seguradas até a batida, as vizinhas deslizariam para a vaga por baixo delas. O `run.delays` junta os dois mapas; vale o do `delaysOf` quando a carta está nos dois.
  - `leavingOf(beats: readonly Beat[]): ReadonlyMap<string, { startMs: number; shatter: boolean }>`: as cartas que vão ao cemitério numa batida que não é cena.
    - `CardsRemovedFromRow`, `BuffRemoved`, `HandLimitPenalty`, o `replaced` dos `CardsPlaced`, `DevastationCast` (k, a, x), `CardStolen.ace` e as cartas usadas de `TrapUsed` e `Sacrificed`: sem estouro;
    - `GuardBroken` e os alvos de `TrapUsed` e `Sacrificed` (os mesmos do `crack` de hoje): com estouro.
  - `shardsPerCard(count: number): number` = `min(shards, floor(shardBudget / count))`.

- [ ] **Step 1: Escrever os testes que falham**
  - `recoilsOf`: o seu `BuffPlayed` dá o id no `startMs` da batida; o do Bot, nada; o seu `DevastationCast`, os três ids.
  - `landingsOf`: o seu `BuffPlayed` em `startMs + 510`, sem queda; o do Bot em `startMs + 220`, com queda; os seus `CardsPlaced` em `startMs + 220`, sem queda com `draftShown` e com queda sem ele; os do Bot, com queda; a numérica do `CardStolen` em `startMs + 420`.
  - `shiftDelaysOf`: a carta da frente da Defesa sai (`CardsRemovedFromRow`), e as outras da Defesa esperam o início dessa batida; uma carta do Ataque não espera; o seu J sai da mão (`BuffPlayed`), e as outras da mão esperam; 2 K de 4 quebram, e os 2 que ficam na Guarda esperam.
  - `leavingOf`: `GuardBroken` com 4 K dá 4 com estouro; `TrapUsed` dá a carta sem estouro e o alvo com; `CardsRemovedFromRow`, sem estouro; `RowDevastated` e `ReflectPlayed` (cenas) não dão nada.
  - `shardsPerCard`: 1 → 10, 4 → 10, 5 → 8.
  - **O teto:** para uma jogada comum seguida do golpe, com `decisionPending`, as durações do `buildTimeline` são as de hoje (valores escritos no teste), e `timelineMs` ≤ `DECISION_CAP_MS`.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/table-motion.test.ts`
Expected: FAIL, módulo inexistente.

- [ ] **Step 3: Implementar** `table-motion.ts`, puro (sem React nem DOM), como `effects.ts`.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): o movimento das jogadas comuns, no modelo`, com o diário.

### Task 3: As partículas, a camada e o palco

**Files:**
- Move: `packages/web/src/ui/scenes/particles.ts` → `ui/anim/particles.ts`, junto com o `rng` de `ui/scenes/aura.ts`. As seis cenas e a `aura.ts` passam a importar de lá.
- Create: `ui/anim/bursts.ts`, `ui/anim/FxLayer.tsx`
- Modify: `ui/anim/useBeatPlayer.ts`, `ui/anim/context.ts`, `ui/anim/Stage.tsx`
- Test: `packages/web/test/ui/bursts.test.tsx`

**Interfaces:**
- Consumes: `TABLE_MOTION`, `recoilsOf`, `landingsOf`, `leavingOf`, `shardsPerCard` (Task 2).
- Produces:
  - `dust(timers: number[], layer: Element, box: SceneRect, count: number, random: () => number): void` (o `SceneRect` de `ui/anim/scene-box.ts`): puffs que saem da borda de baixo de `box`, cada um com `data-poeira` e `data-particula`, e que saem sozinhos em até `dustMs`;
  - `shards(timers: number[], layer: Element, box: SceneRect, count: number, random: () => number): void`: cacos de papel com borda de tinta, recortados como o entulho do protótipo, com `data-caco` e `data-particula`, que saem em até `shardMs`;
  - `FxLayer`: `<div data-camada-fx aria-hidden>`, absoluta sobre a mesa, sem toque, abaixo da cena (`BeatOverlay`), e `useFxLayer(): { burst(kind: 'dust' | 'shards', el: Element, count: number): void; layer: HTMLElement | null }`. O `burst` converte o retângulo do elemento para a camada e, com movimento reduzido, não faz nada;
  - `Run` ganha `recoils`, `landings` e `leaving`, vazios no `catchUp` e no `resync`; `run.delays` junta o `shiftDelaysOf` e soma o `recoilMs` às cartas de `recoils` (o voo espera o recuo);
  - `Anim` ganha `recoilAt(id): number | null` e `landAt(id): { at: number; drop: boolean } | null`, em segundos, como o `delayOf`.

- [ ] **Step 1: Escrever os testes que falham** (`bursts.test.tsx`, com timers falsos):
  - `dust` põe `count` `[data-poeira]`, e eles somem depois de `dustMs`; o mesmo com `shards` e `[data-caco]`;
  - o `burst` com movimento reduzido não põe nada;
  - 4 K (`shardsPerCard(4)` cacos cada) mais duas poeiras ficam com ≤ 60 `[data-particula]`;
  - o `Anim` de um `catchUp` não tem recuo nem pouso.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/bursts.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** Mover as partículas primeiro, rodar as cenas, e só então escrever o resto. O sorteio é o `rng`, semeado pelo id da carta, para o desenho se repetir.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui; pnpm --filter @coringa/web smoke`
Expected: PASS, e o smoke (que já constrói a web) ainda acha o chunk das cenas fora do JavaScript inicial.

- [ ] **Step 5: Commit**: `refactor(web): as partículas saem das cenas, e a mesa ganha a camada dos efeitos`, com o diário.

### Task 4: A jogada: recuo, voo e assentamento

**Files:**
- Modify: `packages/web/src/ui/cards/Card.tsx`, `ui/table/TableCard.tsx` (se for preciso)
- Test: `packages/web/test/ui/table-motion.test.tsx`

**Interfaces:**
- Consumes: `Anim.recoilAt`, `Anim.landAt`, `useFxLayer` (Task 3).

O que a carta faz:
- **Recuo:** em `recoilAt`, uma Web Animation no `translate` da carta, de 0 a `0 6px` e de volta em 90 ms. O voo do `layoutId` começa 90 ms depois (o `delayOf` já soma).
- **Pouso:** em `landAt`, uma Web Animation no `scale`, de 1,06 a 1 em 160 ms, e `burst('dust', el, 5)`.
- **Queda (`drop`):** a carta fica apagada até a batida, como as que o `CardsDealt` traz (`data-entra`). Na batida, entra com `translate` de `0 -14px` a 0 e opacidade em 220 ms; depois, o pouso.
- **O tremor do `crack` sai da carta.** O traço da rachadura também: os dois vão para a cópia (Task 5).

- [ ] **Step 1: Escrever os testes que falham**, com timers falsos e o `Element.prototype.animate` gravando as chamadas:
  - o seu `BuffPlayed`: `translate` com `delay` no início da batida; a transição de layout 90 ms depois; em `landAt`, `scale` [1,06 → 1] e 5 `[data-poeira]`;
  - o `BuffPlayed` do Bot: a carta fica com `data-entra` e opacidade 0 até a batida; na batida, a queda; depois, o pouso;
  - os seus `CardsPlaced`: achatam e soltam poeira em `startMs + 220`, sem queda nem voo;
  - a carta que só desliza na fileira: nenhum `scale` e nenhuma poeira;
  - o pulo antes do pouso: nenhuma poeira depois, e nenhuma animação presa;
  - movimento reduzido: nenhuma animação em `translate` nem em `scale`, nenhuma poeira, e a opacidade nos mesmos instantes;
  - `catchUp` e `resync`: nada.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/table-motion.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar** no `Card`, num efeito que depende de `recoilAt`, `landAt` e `markOf(id)`. Cancelar as animações e os timers na limpeza do efeito.
- [ ] **Step 4: Ver nas fotos, antes de seguir.** Com `medir-cena.ts` no passo da jogada da Task 1, tirar fotos a 0, 60, 300, 520 e 700 ms. O recuo deve sair para baixo, o voo começar depois, e o achatamento acontecer no lugar final, sem pulo. **Se o `scale` deslocar a carta** (porque a projeção ainda não acabou), trocar o timer do pouso pelo `onLayoutAnimationComplete` do Motion nas cartas que voam, e registrar no diário.
- [ ] **Step 5: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui`
Expected: PASS.

- [ ] **Step 6: Commit**: `feat(web): a carta jogada recua, voa e assenta`, com o diário.

### Task 5: A saída e os estilhaços

**Files:**
- Create: `packages/web/src/ui/anim/Leaving.tsx`
- Modify: `ui/anim/Stage.tsx`
- Test: `packages/web/test/ui/leaving.test.tsx`

**Interfaces:**
- Consumes: `run.leaving`, `run.recoils`, `shardsPerCard`, `shards`, `useFxLayer` (Tasks 2 e 3).
- Produces: `Leaving`, um componente de classe no palco que recebe `run`, `reduced` e `released`. As cópias levam `data-saindo` e `data-saindo-id` (nunca `data-card-id`), e a carta de verdade escondida leva `data-esperando-estouro`.

O que acontece:
- **Só quando a linha do tempo muda** (`prevProps.run !== this.props.run`): o palco redesenha a cada batida, e as cópias não podem nascer de novo a cada desenho.
- **No `getSnapshotBeforeUpdate`** (o DOM ainda é o de antes): o retângulo e um `cloneNode(true)` de cada carta de `run.leaving` que está na mesa.
- **No `componentDidUpdate`:** a cópia entra na camada, no lugar antigo, para cada carta que já não está na mesa, e também para as que estouram mesmo que estejam (o topo do cemitério).
- **O topo do cemitério que estoura** entra no `instant`, como o `fallen` da Devastação: chega ao cemitério sem transição. Só esconder não basta, porque o Motion o faria voar do lugar antigo a partir da batida, e ele reapareceria no meio do voo. Ele fica com `visibility: hidden` até o estouro, como na Ressurreição.
- **Na batida da carta:**
  - **sem estouro:** a cópia voa até o centro de `[data-cemiterio]` (`translate`, `scale` até 0,5 e opacidade) em 360 ms e sai;
  - **com estouro:** a cópia mostra o traço da rachadura, treme 120 ms (`transform: rotate`, ±4°) e estoura em `shardsPerCard(n)` cacos, sendo `n` o número de cartas que estouram na batida. Depois sai;
  - a sua carta que sai da mão (a Armadilha, o Sacrifício, o A do Roubo, as cartas da Devastação) recua antes, como na Task 4.
- **O pulo, ou um `state` novo:** tira todas as cópias e devolve as cartas escondidas. Com movimento reduzido, a cópia fica até a batida e esmaece em 200 ms, sem voo, tremor nem cacos.

- [ ] **Step 1: Escrever os testes que falham**
  - um K da Guarda quebrada que não é o topo: a cópia está lá desde a chegada, até a batida; na batida, depois de 120 ms, 10 `[data-caco]`, e a cópia sai;
  - 4 K: 4 cópias e 40 cacos, com ≤ 60 `[data-particula]` no pico;
  - o topo do cemitério que estoura: `instant` (sem transição de layout), e `visibility: hidden` até o estouro; com o pulo no meio, volta a aparecer na hora;
  - um `state` que redesenha o palco sem trocar a linha do tempo não cria cópias novas;
  - `CardsRemovedFromRow`: a cópia voa ao cemitério na batida, sem cacos;
  - `RowDevastated` e `ReflectPlayed`: nenhuma cópia, porque a cena desenha as dela;
  - movimento reduzido, `catchUp`, `resync` e o `state` novo no meio: como descrito acima;
  - nenhum `[data-card-id]` dentro de `[data-camada-fx]`.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/leaving.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** O traço da rachadura é o caminho do `FxOverlay` de hoje (`M22 0 L15 15 L26 24 L12 38 L21 56`). Se ficar sem uso no `Card`, o `crack` sai do `CardFx`, e o teste do `effects` muda junto.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui test/model`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): as cartas saem na batida delas, e a que quebra estoura em cacos`, com o diário.

### Task 6: O leque da compra e do Equipar

**Files:**
- Create: `packages/web/src/ui/anim/useDealIn.ts`
- Modify: `model/effects.ts` (`dealsOf`), `ui/cards/Card.tsx`, `ui/table/EquipPanel.tsx` (`PendingCard`), `ui/table/PlayerField.tsx` (`CardBack`), `ui/table/CenterBand.tsx` (`data-monte` no número do monte)
- Test: `packages/web/test/model/effects.test.ts`, `test/ui/deal-fan.test.tsx`

**Interfaces:**
- Produces:
  - `dealsOf`: cada carta entra em `startMs + i × stagger`, com `stagger = min(fanStaggerMs, floor(durationMs / n))`, sendo `i` a ordem dela no evento e `n` quantas o evento traz. Os versos ganham `staggerMs`;
  - `useDealIn(ref: RefObject<HTMLElement | null>, delaySec: number | null, opacity: boolean): void`. Na montagem, lê o retângulo de `[data-monte]` e o do elemento, e anima o `translate` do centro do monte até 0 e o `scale` de 0,6 a 1, em `dealFlightMs`, com o atraso. Com `opacity`, anima também a opacidade (as numéricas do painel e os versos, que não são do Motion). Sem o monte medido, ou com movimento reduzido, só a opacidade.

- [ ] **Step 1: Escrever os testes que falham**
  - `effects.test`: 4 cartas numa batida de 300 ms entram em 0, 40, 80 e 120 ms; numa batida encolhida para 100 ms, em 0, 25, 50 e 75; a última sempre antes do fim da batida.
  - `deal-fan.test`:
    - as suas especiais na mão e as numéricas do painel do Equipar com `data-entra` em leque;
    - os versos do Bot também;
    - o `translate` com o atraso de cada uma;
    - movimento reduzido: só opacidade;
    - `catchUp`: como hoje.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/effects.test.ts test/ui/deal-fan.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** As leituras de retângulo vêm antes de qualquer `animate`, para a chegada não pagar mais de um cálculo de layout.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui test/model`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): a compra e o Equipar chegam do monte em leque`, com o diário.

### Task 7: Os sons e os dois pequenos

**Files:**
- Modify: `packages/web/src/model/sound.ts`, `src/sound/synth.ts`, `ui/anim/Stage.tsx`, `styles.css` (o `@keyframes tremor`), e a tela que tem os controles do replay (`ui/screens/ReplayControls.tsx` ou `ReplayViewer.tsx`)
- Test: `packages/web/test/model/sound.test.ts`, `test/model/synth.test.ts`, `test/ui/sound.test.tsx`, `test/ui/animation.test.tsx`

**Interfaces:**
- Produces: as pistas `pouso` e `compra`. O `cueOf` devolve:
  - `carta` para o seu `BuffPlayed` e o seu `GuardPlayed`;
  - `pouso` para os do Bot e para os `CardsPlaced`;
  - `compra` para o seu `CardsDealt`; o do Bot fica mudo.

- [ ] **Step 1: Escrever os testes que falham**
  - `cueOf`, como acima;
  - `synth.test`:
    - o sopro da `carta` em 0 e a batida em 510 ms;
    - a `pouso` em 220 ms;
    - o estalo da `quebra` em 120 ms;
    - a `compra` com quatro vozes em 0, 40, 80 e 120 ms;
    - nenhuma voz passa de metade da escala;
  - `sound.test.tsx`: "Próximo passo", "Passo anterior" e "Início" no meio de uma cena chamam o `cut` do som;
  - `animation.test.tsx`: dois `DamageDealt` seguidos com o mesmo peso tremem duas vezes (duas animações no `[data-placar]` e nos `[data-campos]`).
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts test/model/synth.test.ts test/ui/sound.test.tsx test/ui/animation.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.**
  - **As receitas:** com `tone` e `noise`, nos instantes de `TABLE_MOTION`.
  - **O tremor de cada golpe:** passa a ser uma Web Animation no `translate` (`shakeFrames`, de `ui/anim/particles.ts`) que recomeça a cada batida com golpe. Hoje é a animação do CSS, que não recomeça quando o valor de `data-tremor` se repete. Os tempos e os px seguem os de `SHAKE_PX` e `SHAKE_MS`, e o `@keyframes tremor` sai do CSS se ficar sem uso.
  - **O corte do som no replay:** a navegação chama o `cut`, como o pulo.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model test/ui`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): os sons das jogadas comuns; o replay corta o som da cena`, com o diário.

### Task 8: Os pontos diretos do playtest (3, 4, 7, 8 e 12)

Pedidos pelo autor junto com a aprovação (`decisoes.md` 2026-11-02 (9)), com as leituras [I] de lá.

**Files:**
- Modify: `packages/web/src/ui/anim/Stage.tsx` e `ui/table/Hand.tsx` (ponto 3); `ui/table/ActionBar.tsx`, `model/copy.ts` (ponto 4); `ui/table/OrderPanel.tsx`, `model/automation.ts`, `model/session.ts`, `model/replay-track.ts`, `ui/screens/local-game.tsx`, `ui/screens/Tutorial.tsx`, `ui/table/PlayTable.tsx` (ponto 7); `model/copy.ts`, `model/tutorial-copy.ts`, `ui/table/labels.ts`, `ui/table/PlayerField.tsx`, `ui/cards/Card.tsx`, `packages/sim/src/play/text.ts` (ponto 8); `ui/table/Row.tsx` (ponto 12)
- Test: os que guardam esses textos e a ordem automática (`test/model/automation.test.ts`, `test/model/replay-track.test.ts`, `test/ui/phases.test.tsx`, `test/ui/training.test.tsx`, `test/ui/tutorial.test.tsx`, `e2e/online.spec.ts`, `e2e/tutorial.spec.ts`, e os do simulador com o texto do histórico); novo `test/ui/playtest-direct.test.tsx`

**Interfaces:**
- Consumes: `Anim.landAt` (Task 3).
- Produces: nada que outra tarefa use.

O que muda:
- **3, sem seleção de texto:** `select-none` no palco (`[data-palco]`) e na mão. Os `input`, o diálogo das regras e o histórico ficam com `select-text`.
- **4, sem a ameaça:** sai a linha `threatLabel` da barra (`ActionBar.tsx:171`) e a parte "ameaça de X cai de A para B" da prévia do alvo (`copy.ts`, perto da linha 245). O que ficar sem uso sai junto.
- **7, sem a ordem automática:**
  - saem `ORDER_AUTO_MS`, o `orderAutoAt`, a `AutoBar`, o `ORDER_AUTO_TEXT`, o `onInteract` que cancelava o automático e a opção `autoOrder` da `Session` (o tutorial já nascia sem ela);
  - o painel fica com a frase da escolha manual: `ORDER_MANUAL_TEXT` com prazo, `ORDER_MANUAL_NO_CLOCK_TEXT` sem;
  - o `shouldAutoPass` (outra automação) fica;
  - a spec da interface §3.6 ganha a nota da mudança.
- **8, "Bônus":** "Buff" vira "Bônus" em todo texto visível: "Bônus de ataque" e "Bônus de defesa", no singular e no plural, na mão, nos títulos das zonas, nas jogadas, nos motivos sem jogada, nos alvos, no `HINT` da carta, no resumo das regras, nas dicas do tutorial e no histórico (`sim/src/play/text.ts`: "nos Bônus de Ataque", "perdeu ... dos bônus"). Os identificadores ficam.
- **12, o total que sobe:**
  - quando o total de uma fileira sobe pela carta que pousa (uma numérica nela, ou um J ou Q na zona de bônus do mesmo lado), o número cresce até 1,3 e volta a 1 em 320 ms, por `scale`, no `landAt` dessa carta. Enquanto cresce, fica em ouro;
  - **até o pouso, o total não conta a carta:** o `Row` passa ao motor (`attackPower`, `defensePower`) o lado sem as cartas cujo pouso ainda não chegou. Sem isso, o número mudaria na chegada do `state`, antes de a carta aparecer;
  - com movimento reduzido, só a cor;
  - o total que cai (o golpe) segue como hoje.

- [ ] **Step 1: Escrever os testes que falham** (`playtest-direct.test.tsx` e os que mudam):
  - o palco tem `select-none`, e o histórico tem `select-text`;
  - a barra do Ataque não tem "Ameaça de", e a prévia do alvo não fala em ameaça;
  - o painel da ordem não tem `[data-auto-barra]`, e com timers falsos a ordem não sai sozinha depois de 3 s;
  - um teste que varre os textos de `copy.ts`, `labels.ts`, `tutorial-copy.ts`, o `HINT` da carta e `sim/src/play/text.ts`: nenhum tem "Buff" nem "buff". Os testes que tinham o texto antigo mudam junto, também os seletores do E2E por nome acessível;
  - os seus `CardsPlaced`: o total da fileira fica o de antes até `startMs + 220` e então anima `scale` [1, 1,3, 1]; um J que pousa sobe o total do Ataque do mesmo jeito; o golpe que derruba o total não anima `scale`; com movimento reduzido, nenhuma animação de `scale`.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/playtest-direct.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**, um ponto por vez, rodando os testes que ele toca.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run; pnpm --filter @coringa/sim exec vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): os pontos diretos do playtest (sem seleção, sem ameaça, sem ordem automática, "Bônus", o total que sobe)`, com o diário.

### Task 9: E2E, medição, fotos e documentação

**Files:**
- Create: `packages/web/e2e/fluidez.spec.ts`; Modify: `playwright.config.ts` (a lista `testMatch` do projeto do PC e do celular)
- Modify: `docs/memoria/notas/medicao-fatia-5.md`, a spec 6 §8 e §14, a spec da interface (a tabela das batidas, se citar o tremor do `crack`), `docs/memoria/estado.md`, `diario.md`

- [ ] **Step 1: Escrever o E2E**, no replay das fixtures, nos passos da Task 1, no PC e a 360 × 640:
  - a cópia de um K que quebra aparece e estoura. O estouro dura menos de meio segundo, então quem procura `[data-caco]` é a própria página, a cada quadro, como em `scenes.spec.ts`;
  - a poeira no pouso de uma jogada sua;
  - o leque, com `data-entra` diferentes;
  - nada rola de lado, e o console fica sem erro.
- [ ] **Step 2: Rodar**

Run: `pnpm --filter @coringa/web build; pnpm --filter @coringa/web exec playwright test e2e/fluidez.spec.ts`
Expected: PASS. Com o `wrangler dev` do autor na 8787, usar outra porta só nessa execução.

- [ ] **Step 3: Medir e fotografar de novo** os quatro passos da Task 1, nas duas telas. Registrar em "Depois" na nota. A meta: ≥ 50 quadros/s, ≤ 60 partículas, e a `chegada` dentro dos 10% da linha de base. Olhar as fotos de cada instante: o recuo, o meio do voo, o pouso, o estouro e o leque.
- [ ] **Step 4: Documentar.**
  - **spec §8 e §14:** o que a execução decidiu;
  - **`diario.md`:** cada escolha;
  - **`estado.md`:** o próximo passo, que é o autor jogar.
- [ ] **Step 5: Portão**

Run: `pnpm check`
Expected: verde. Depois, o push da branch `feat/direcao-visual-fatia-5`, as duas CI verdes, a revisão da branch inteira e o fast-forward na `main`. O autor joga; com a aprovação dele, o sub-projeto 6 acaba.

## Para quem executa (escolhas deixadas a você)

- **Os ajustes finos:** a cor e o tamanho dos puffs e dos cacos, as curvas de cada voo, e o recorte de cada caco.
- **Os tempos de `TABLE_MOTION`:** ajustes de até ~15% são seus, desde que o teste do teto siga verde.
- **O que for medido:** se a medição da Task 9 cair abaixo de 50 quadros/s no celular, corte primeiro os cacos e a poeira (§11), nunca o recuo e o pouso.
