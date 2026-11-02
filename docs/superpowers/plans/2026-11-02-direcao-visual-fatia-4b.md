# Sub-projeto 6, fatia 4b: a Ressurreição (com os sons) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar a carta que só volta do cemitério pela cena aprovada no protótipo (spec 6 §7.6): a quadra acende e chama o céu, o portal abre sobre o cemitério, uma carta sobe sem cor com a auréola, a cor volta no alto, o nome carimba, e ela voa para o fim da fileira. Sem inversão, e com o som dela.

**Architecture:**
- **O que as fatias anteriores deixaram e esta usa:** `SCENE_MOMENTS`, o chunk `ui/scenes/`, `useMeasuredBox`, `revealRow`, `spawn`, `Stamp`, `NO_INVERT`, a cortina que tenta de novo e as pistas com corte no pulo.
- **Uma cena, `RESURRECTED`, de 4,6 s**, no evento `Resurrected`. Como no protótipo, sem tarjas: a cortina escurece a mesa.
- **Qual quadra acende, sem mudar o motor:** o evento é `{ player, card, row }`. Dizer a quadra nele mudaria as partidas de referência e obrigaria a subir o `RULES_VERSION` (4 → 5), com aviso em todo replay guardado, por um detalhe visual. A interface lê a mesa: acende a quadra que estiver lá, sem contar a carta que volta (`resurrectionInfo`, puro). Sem quadra, os fios saem da fileira de destino, sem cartas acesas (a saída que o §7.6 já prevê).
- **A carta de verdade fica escondida até a cópia pousar:** o `state` a põe na fileira no mesmo commit em que a cena começa. A cena esconde o elemento dela e o devolve ao pousar ou ao ser pulada.

**Tech Stack:** React 19, Web Animations para as partículas (só `transform` e `opacity`), Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` §1, §7 (gramática), §7.6, §9, §10, §11 e §13. Referência visual: `2026-10-31-direcao-visual-prototipo.html`, função `ressurreicao()` (linhas 1053 a 1115).

## Global Constraints

- **Fotossensibilidade:** nenhuma inversão nesta cena (§7), e nada acima de 25% da tela acende: os raios ficam em cunhas de baixa opacidade, que aparecem devagar.
- **Desempenho (§11):** ≤ 60 partículas vivas; só `transform` e `opacity` animam; sem `drop-shadow`, `box-shadow` animado, `blur` nem `filter` animado. Fora do protótipo, portanto: a cor volta pela troca de opacidade entre a cópia cinza e a colorida, e o brilho das cartas é um halo desenhado.
- **Movimento reduzido:** sem voo, tremor, subida nem partícula; o portal, a coluna, a carta e o nome aparecem e somem nos mesmos instantes, e a informação é a mesma.
- **Sem regra na interface:** a quadra sai de `quadValues` do motor, sobre as fileiras da `view`. `RULES_VERSION` e `STATE_SCHEMA` não mudam (só a tabela da folga). `E2E_SEED` fica vazia, e o deploy é do autor.
- **Números** em Archivo com `tabular-nums`; **arte original**; **JavaScript inicial ≤ 200 KB gzip**, com a cena no chunk.
- **Repetição:** a cena toca sempre inteira (`decisoes.md` 2026-10-31 (12)), e o toque pula.
- **Contratos que ficam:** `data-cena`, `data-cortina`, o pulo por toque e Esc, `aria-hidden` nas cenas, o histórico como registro acessível e o painel como reserva enquanto o chunk não chega.

## Review Focus

1. **A quadra já desfeita** (a Ressurreição vale por 3 rodadas mesmo sem a quadra): nenhuma carta acesa, e os fios saem da fileira de destino → testes das Tasks 1 e 2.
2. **A carta que forma uma quadra nova ao voltar:** ela não conta como a quadra que chamou o céu, porque ainda nem pousou → teste da Task 1.
3. **Os dois lados:** a sua e a do Bot, nas duas fileiras: a cópia pousa na vaga certa, a última da fileira → testes das Tasks 1 e 2.
4. **Celular em pé:** o cemitério e a fileira podem estar fora da janela. O céu se prende à faixa medida, e os campos rolam até a fileira → testes da Task 2 e E2E da Task 4.
5. **O pulo no meio da cena:** a carta de verdade volta a aparecer na hora, e na reconexão (`catchUp`) ela nunca fica escondida → testes da Task 2.

---

### Task 1: Os tempos, as batidas e o que a mesa diz

**Files:**
- Modify: `packages/protocol/src/scenes.ts`, `packages/protocol/test/scenes.test.ts`
- Modify: `packages/web/src/model/scene-moments.ts`, `model/timeline.ts`, `model/effects.ts`, `model/copy.ts`
- Test: `packages/web/test/model/timeline.test.ts`, `test/model/effects.test.ts`, `packages/server/test/core/timers.test.ts`

**Interfaces:**
- Produces:
  - `SCENE_MS.Resurrected: 4_600`.
  - `SCENE_MOMENTS.RESURRECTED: { threadsAt: 200, portalAt: 620, columnAt: 1_000, riseAt: 1_380, colorAt: 2_360, titleAt: 2_360, flightAt: 3_010, landAt: 3_530, fadeAt: 4_030 }`.
  - `SceneKind` ganha `RESURRECTED`; `RARE_SCENE_MS.RESURRECTED`; `NO_INVERT` a inclui.
  - `resurrectionInfo(event, view): { landIndex: number; quad: { row: RowName; indices: number[]; cards: NumCard[] } | null } | null`, em `model/effects.ts`.

- [ ] **Step 1: Escrever os testes que falham**
  - `timeline.test`: `Resurrected` → `scene` `RESURRECTED`, com `cards: [id]`, 4_600 ms, sem inversão; `decisionPending` não encolhe; `catchUp` vira faixa; movimento reduzido e muitas Ressurreições seguidas ficam dentro dos limites.
  - `effects.test`, `resurrectionInfo`:
    - quatro 8 na fileira de destino: `quad` com os 4 índices e as 4 cartas, e `landIndex` no fim da fileira;
    - a quadra na outra fileira: acende a de lá;
    - nas duas fileiras: a de destino;
    - nenhuma quadra: `quad: null`;
    - três 8 e a carta que volta é o quarto 8: `quad: null`, porque ela não conta;
    - cinco cartas iguais depois da volta: 4 índices, sem a que volta;
    - do Bot (`view.opponent`); evento de outro tipo: `null`.
  - `sceneText` e `bannerText` do `Resurrected`: o nome e o texto do evento.
  - `scenes.test` (protocolo): a tabela nova. `timers.test` (servidor): a Ressurreição no próprio turno estende o prazo em 4_600.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/timeline.test.ts test/model/effects.test.ts`
Expected: FAIL nos tempos e em `resurrectionInfo`.

- [ ] **Step 3: Implementar.** `classify`: `Resurrected` sai do grupo `move`. `SCENE_TITLE.RESURRECTED: 'RESSURREIÇÃO'`. A busca da quadra começa pela fileira de destino, tira a carta que volta e usa `quadValues` do motor; com mais de uma, a de maior valor.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/protocol exec vitest run; pnpm --filter @coringa/web exec vitest run test/model test/ui/animation.test.tsx; pnpm --filter @coringa/server exec vitest run --config vitest.config.ts test/core/timers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): os tempos e as batidas da Ressurreição`, com o diário e o `estado.md` (regra 6).

### Task 2: A cena

**Files:**
- Create: `packages/web/src/ui/scenes/sky.ts`, `ui/scenes/Resurrection.tsx`
- Modify: `ui/scenes/index.ts`, `ui/anim/scene-box.ts`, `ui/anim/scenes-loader.ts`, `ui/anim/Scene.tsx`, `ui/anim/Stage.tsx`, `ui/scenes/measured-box.ts`, `ui/table/CenterBand.tsx`
- Test: `packages/web/test/ui/scenes-sky.test.ts`, `test/ui/scene-resurrection.test.tsx`

**Interfaces:**
- Consumes: `resurrectionInfo`, `SCENE_MOMENTS.RESURRECTED` (Task 1).
- Produces:
  - `SceneBox.graveyard(): SceneRect | null`, de `[data-cemiterio]` (novo atributo no `CenterBand`).
  - `SceneProps.rising?: ReturnType<typeof resurrectionInfo>`, calculado pelo `Stage`.
  - `skyLayout(graveyard: SceneRect | null, band: SceneRect): { k: number; portal: ScenePoint; ground: ScenePoint; top: ScenePoint }`, puro. `k = clamp(band.w / 1000, 0.36, 1)`. `ground` é o centro do cemitério, preso à faixa (sem cemitério medido, o canto direito de baixo da faixa). `portal` fica 40 px abaixo do topo da faixa, na coluna dele. `top` é onde a carta recebe a cor: até 150 px acima de `ground`, nunca acima do portal.
  - `useMeasuredBox(box, before?)`: `before(palco)` roda antes da medida, para rolar a fileira até a vista.
  - `data-fio`, `data-portal`, `data-raios`, `data-coluna`, `data-carta-cena`, `data-auréola`, `data-colorida`, `data-pousou`, para o teste e o E2E.

Os passos, medidos no protótipo:

| ms | O que acontece |
|---|---|
| 0 | A cortina sobe; as cópias das cartas da quadra acendem e sobem 8 px, cada uma 90 ms depois da anterior, com um halo desenhado |
| 200 | Um fio de luz sai de cada uma até o portal, em 260 ms, cada um 90 ms depois do anterior |
| 620 | O portal abre em 500 ms; os raios aparecem e giram devagar (14° em 3,6 s); as plumas descem até 3.220 |
| 1000 | A coluna de luz desce até o cemitério em 360 ms; sobem estrelinhas até 3.200 |
| 1380 | A carta sobe do cemitério em 900 ms, cinza e meio apagada; a auréola entra aos 1.880 |
| 2360 | A cor volta em 420 ms, com um lampejo; o anel de luz e 14 estrelas; o nome carimba por 1,5 s (papel com filete e sombra de ouro, rotação de -2°) |
| 3010 | A auréola some, e a carta voa em arco até a vaga dela, em 520 ms |
| 3530 | Pousa: a escala cai de 1,35 a 1, com um halo; a carta de verdade reaparece embaixo; os campos tremem 4 px por 160 ms |
| 4030 | O portal, a coluna e os fios somem em até 500 ms; a cortina desce no fim da cena |

- [ ] **Step 1: Escrever os testes que falham**
  - `scenes-sky.test`: `k` a 1536 e a 360 de largura; `portal`, `ground` e `top` dentro da faixa, com o cemitério fora dela e sem ele; `top` entre o portal e `ground`; a mesma entrada dá a mesma saída.
  - `scene-resurrection.test`:
    - as cópias da quadra nas vagas certas, desde o começo, e os 4 `data-fio` a partir de `threadsAt`;
    - `data-portal` em `portalAt`, `data-coluna` em `columnAt`, a `data-carta-cena` em `riseAt`, `data-colorida` e o carimbo em `colorAt`, `data-pousou` em `landAt`; nenhum antes da hora;
    - sem quadra: nenhuma cópia acesa, e os fios ainda saem, da fileira de destino;
    - o valor da carta na cópia é o do evento;
    - a carta de verdade (`[data-card-id]`) fica `visibility: hidden` até `landAt`; desmontada no meio (o pulo), volta a aparecer;
    - a sua e a do Bot pousam na vaga de `landIndex`, medida na fileira do dono;
    - pico de `[data-particula]` ≤ 60, e elas somem sozinhas;
    - reduzido: nenhum `[data-particula]` nem `data-voo`, e as peças nos mesmos instantes;
    - nenhuma inversão: o palco nunca recebe `data-invertido` (`animation.test`), e no `catchUp` nada fica escondido.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/scenes-sky.test.ts test/ui/scene-resurrection.test.tsx`
Expected: FAIL, módulos inexistentes.

- [ ] **Step 3: Implementar** `sky.ts`, `Resurrection.tsx` e o registro no `SCENES`. As cópias e a carta que sobe usam o `Card` (`size="field"`, `animated={false}`). A rolagem é `revealRow` da fileira da quadra e depois da de destino. A carta cinza é uma cópia parada com `grayscale`, por baixo da colorida.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): a cena da Ressurreição`, com o diário.

### Task 3: O som

**Files:**
- Modify: `packages/web/src/model/sound.ts`, `src/sound/synth.ts`
- Test: `packages/web/test/model/sound.test.ts`, `test/model/synth.test.ts`

**Interfaces:**
- Produces: a pista `ressurreicao`; `cueOf` a devolve para `Resurrected`, no lugar de `carta`.

- [ ] **Step 1: Escrever os testes que falham**: `cueOf` do `Resurrected` → `ressurreicao`. `synth.test`: as vozes começam em `threadsAt`, `portalAt`, `riseAt`, `colorAt` e `landAt`; a pista cabe em 4,6 s; nenhuma voz passa de metade da escala.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts test/model/synth.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**, com `tone` e `noise` nos instantes de `SCENE_MOMENTS`: o brilho agudo dos fios, um sopro que abre com o portal, a escala que sobe durante a subida da carta, o acorde maior em `colorAt` (o "acorde que sobe" do §10) e um toque de carta em `landAt`.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts test/model/synth.test.ts test/ui/sound.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): o som da Ressurreição`, com o diário.

### Task 4: E2E, medição e documentação

**Files:**
- Modify: `packages/web/e2e/scenes.spec.ts`
- Create: `docs/memoria/notas/medicao-fatia-4b.md`
- Modify: a spec §7.6 e §14, a spec do servidor §6.2, a tabela da spec da interface, `docs/memoria/estado.md`, `diario.md`

- [ ] **Step 1: Achar os passos.** Nenhuma partida nova: a `exodia-devastacao.json` tem 13 Ressurreições. Por script no scratchpad, escolher um passo seu e um do Bot, um com a quadra na mesa e um sem, se houver.
- [ ] **Step 2: Escrever o E2E**, nos dois tamanhos (PC e 360 × 640): a cena aparece, com a cortina e sem tarjas; o portal e a carta dentro da janela; a página nunca recebe `data-invertido`; nada rola de lado; um toque pula e a carta de verdade fica visível na fileira; sem erro no console.
- [ ] **Step 3: Rodar**

Run: `pnpm --filter @coringa/web build; pnpm --filter @coringa/web exec playwright test e2e/scenes.spec.ts`
Expected: PASS. Com o `wrangler dev` do autor na 8787, usar outra porta só nessa execução.

- [ ] **Step 4: Ver e medir.** Fotos nos dois tamanhos, nos instantes da tabela, e medição com a CPU 4×: meta ≥ 50 quadros/s, ≤ 60 partículas. Registrar em `notas/medicao-fatia-4b.md`. Os testes em jsdom não veem layout: nas fatias anteriores, as fotos acharam o que eles não acharam.
- [ ] **Step 5: Documentar**: spec §14 (o que a execução decidiu) e o §6.2 do servidor; `diario.md` com cada escolha; `estado.md` com o próximo passo.
- [ ] **Step 6: Portão**

Run: `pnpm check`
Expected: verde. Depois, o push da branch `feat/direcao-visual-fatia-4b`, as duas CI verdes, a revisão da branch inteira e o fast-forward na `main`. O autor joga.

## Para quem executa (escolhas deixadas a você)

Os ajustes finos de cor, as sementes das partículas e a curva de cada voo. Ajustes de até ~15% nos tempos são do construtor (§7), e qualquer mudança no `SCENE_MS` vale também para os testes do protocolo e do servidor.
