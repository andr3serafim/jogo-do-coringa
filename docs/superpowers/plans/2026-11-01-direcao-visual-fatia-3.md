# Sub-projeto 6, fatia 3: Exódia e Devastação (com a desolação e os sons) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar o painel simples da Exódia e da Devastação pelas cenas aprovadas no protótipo (spec 6 §7.3 e §7.4). A Exódia
traz os 4 K, os pilares de luz, a coroa e o retrato do perdedor que racha. A Devastação é o terremoto que abre a fileira do alvo,
com as variantes refletida e cancelada. O campo devastado fica desolado até uma carta voltar à fileira. Cada cena sai com os
seus sons.

**Architecture:**
- **O que a fatia 2 deixou e esta usa:**
  - a tabela de instantes (`model/scene-moments.ts`);
  - o chunk das cenas (`ui/scenes/`, pré-carregado pela mesa);
  - a moldura comum (`SceneFrame`) e a caixa medida (`useSceneBox`);
  - as pistas de som com corte no pulo.
- **Exódia:** cena de faixa, como os Absolutos.
- **Devastação:** acontece **no campo, sobre a fileira atingida**, como no protótipo (sem faixa nem tarjas). Ela se prende ao
  `RowDevastated` (a fileira cai de fato) e não ao `DevastationCast` (que só abre a janela de reação do alvo).
- **Desolação:** estado da mesa, guardado pela sessão a partir dos eventos.

**Tech Stack:** TypeScript (Node 24, type stripping), React 19 + `motion` + Tailwind 4 na web, SVG (`feTurbulence`,
`feDisplacementMap`), Web Animations, Vitest, Playwright, Web Audio.

**Spec:** `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` (§1, §7 "Gramática comum", §7.3, §7.4, §10, §11, §12,
§13). A referência visual é o protótipo (`2026-10-31-direcao-visual-prototipo.html`):
- Exódia: as linhas 742–823;
- Devastação: as linhas 825–953;
- o estilo: as linhas 133–160.

## Global Constraints

- **Branch e portões:** branch `feat/direcao-visual-fatia-3`, a partir da `main`. `pnpm check` no pre-push; o E2E e as duas CI
  verdes antes do fast-forward. Nunca `--no-verify`. Não edite arquivos enquanto o pre-push roda.
- **Fotossensibilidade:**
  - uma inversão por cena (na Exódia, quando a coroa crava; na Devastação, quando o chão se abre; nenhuma na cancelada),
    mantida ≥ 300 ms, e nunca mais de 3 trocas em 1 s;
  - os raios em volta da aura da Exódia seguem `boltTimes` (até 3/s, entrando e saindo em 100 ms);
  - os pilares de luz e a aura não acendem mais de 25% da tela fora da inversão: cada pilar com até 45% de opacidade, a aura com
    as cores do protótipo;
  - com movimento reduzido: nenhuma inversão, tremor, queda nem voo; as peças aparecem e somem.
- **Desempenho:** no máximo ~60 partículas vivas (poeira, entulho, pedrinhas e riscos somados); `feTurbulence` e
  `feDisplacementMap` desenhados uma vez, nunca animados quadro a quadro; só `transform` e `opacity` animam; no celular, sem
  `drop-shadow`.
- **Números** em Archivo com `tabular-nums`; **arte original**; **sem regra na interface** (o alvo, a fileira e o vencedor vêm
  dos eventos e da `view`); **JavaScript inicial ≤ 200 KB gzip**, com as cenas no chunk.
- **O que não muda:** `RULES_VERSION` e `STATE_SCHEMA` (muda só a tabela da folga de cena). `E2E_SEED` fica vazia, e o deploy é
  do autor.
- **Contratos que ficam:**
  - `data-cena`, `data-cortina` e o pulo por toque e Esc;
  - `aria-hidden` nas cenas;
  - o painel de fim só depois da mesa parada;
  - o nome do medidor de vida ("Vida de André").

## Review Focus

1. **Devastação refletida** (`RowDevastated` com `reflected`): a fenda abre na fileira de **quem lançou**. A cena do Reflect
   (ainda o painel antigo, até a fatia 4) vem antes, e as duas inversões respeitam a trava de 2 s → testes das Tasks 1 e 3.
2. **Devastação cancelada** (`DevastationCanceled`, por Reflect contra Reflect ou pela Defesa Absoluta): a terra ronca e para,
   sem abismo, sem nome e sem inversão, e a fita diz o motivo → testes das Tasks 1 e 3.
3. **O lado:** a fileira atingida pode ser sua ou do oponente, de Ataque ou de Defesa → teste da Task 3 com as quatro
   combinações.
4. **Celular em pé, 360 × 640:** a fileira atingida pode estar fora da janela dos campos. A cena rola os campos até ela (na
   hora, sem rolagem suave) e nada rola de lado → teste da Task 3 e E2E da Task 6.
5. **Pular no meio:** a mesa mostra o estado final na hora. Na Exódia, o retrato rachado. Na Devastação, as cartas no cemitério
   sem voar e a desolação no campo. O som da cena para → testes das Tasks 2, 3 e 4.

---

### Task 1: Os tempos e as batidas das duas cenas

**Files:**
- Modify:
  - `packages/protocol/src/scenes.ts`: `Exodia: 5_800`, `RowDevastated: 3_100` e `DevastationCanceled: 1_400` entram;
    `DevastationCast` sai;
  - `packages/web/src/model/scene-moments.ts`;
  - `packages/web/src/model/timeline.ts`;
  - `packages/web/src/model/effects.ts` (`sceneText`, `bannerRibbon`);
  - `packages/web/src/model/sound.ts`.
- Test: `packages/protocol/test/scenes.test.ts`, `packages/web/test/model/timeline.test.ts`,
  `packages/web/test/model/effects.test.ts`, `packages/web/test/model/sound.test.ts`; `packages/server/test/core/timers.test.ts`
  (os casos de folga seguem a tabela).

**Interfaces:**
- Produces:
  - **`SCENE_MOMENTS.EXODIA`:** `{ barsIn: 280, kingsAt: [480, 770, 1_060, 1_350], crownAt: 2_550, titleAt: 2_850,
    drainAt: 3_800, crackAt: 4_300, bandOut: 5_200 }`. São os instantes do protótipo arredondados: cada K leva 200 ms mais
    90 ms; a coroa cai em 380 ms e crava em `crownAt`.
  - **`SCENE_MOMENTS.DEVASTATION`:** `{ rumbleUntil: 950, crackAt: 950, openAt: 1_170, titleAt: 1_520, settleAt: 1_600 }`.
  - **`SCENE_MOMENTS.DEVASTATION_CANCELED`:** `{ rumbleUntil: 950, crackAt: 950, stopAt: 1_100 }`.
  - **`SceneKind` ganha `DEVASTATION_CANCELED`.** `RARE_SCENE_MS` ganha `DEVASTATION_CANCELED` (1 400 ms), e
    `DEVASTATION` passa a vir de `SCENE_MS.RowDevastated`.
  - **Classificação:**
    - `RowDevastated` vira cena `DEVASTATION`, sem cartas de movimento. As cartas vão ao cemitério na hora (`instant`), e a cena
      desenha as cópias caindo;
    - `DevastationCanceled` vira cena `DEVASTATION_CANCELED`;
    - `DevastationCast` vira faixa com movimento das três cartas (`bannerMoving([k, a, x])`), com o texto de hoje. O alvo fica
      sabendo, e a reação continua na barra.
  - **Inversão:** `SCENE_INVERT_LEAD_MS.EXODIA = crownAt`, `.DEVASTATION = openAt`. Uma `NO_INVERT: ReadonlySet<SceneKind>`
    com `DEVASTATION_CANCELED`: a linha do tempo não põe inversão nela.
  - **A fita da cancelada:** `bannerBeatAt` também devolve a batida `DEVASTATION_CANCELED`, para a fita dizer o motivo (o texto
    que já existe) durante a cena.

- [ ] **Step 1: Testes que falham**
  - `scenes.test.ts`:
    - `sceneAllowanceMs([{ type: 'RowDevastated' }])` é `3_100`;
    - `[{ type: 'DevastationCanceled' }]` é `1_400`;
    - `[{ type: 'Exodia' }]` é `5_800`;
    - `[{ type: 'DevastationCast' }]` é `0`;
    - a tabela inteira com esses valores.
  - `timeline.test.ts`, describe "a Exódia e a Devastação (sub-projeto 6 §7.3, §7.4)":
    - a Exódia dura 5 800 ms e inverte em `crownAt`;
    - o `RowDevastated` é cena `DEVASTATION` de 3 100 ms, com `cards: []`, e inverte em `openAt`;
    - o `DevastationCast` é `banner`, com as três cartas;
    - o `DevastationCanceled` é cena `DEVASTATION_CANCELED` de 1 400 ms, sem inversão;
    - **refletida:** `[ReflectPlayed (contra a Devastação), RowDevastated reflected]` passa no `expectPhotosafe`;
    - os testes de fotossensibilidade que já existem seguem valendo.
  - `effects.test.ts`:
    - `bannerBeatAt` na batida da cancelada devolve ela, e o texto da fita é o de hoje para `REFLECT_CLASH` e para
      `ABSOLUTE_DEFENSE`;
    - `delaysOf` não lista as cartas do `RowDevastated`.
  - `sound.test.ts`: `cueOf` do `Exodia` é `exodia`, do `RowDevastated` é `devastacao`, do `DevastationCanceled` é
    `devastacao-cancelada`, e do `DevastationCast` é `quebra` (as cartas da mão saem).
- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm --filter @coringa/protocol exec vitest run test/scenes.test.ts` e `pnpm
  --filter @coringa/web exec vitest run test/model/timeline.test.ts test/model/effects.test.ts test/model/sound.test.ts`.
  Expected: FAIL.
- [ ] **Step 3: Implementar.** As pistas novas do `Cue` entram aqui, com receitas vazias. As receitas de verdade são da Task 5.
- [ ] **Step 4: Rodar e ver passar**, mais `pnpm --filter @coringa/server exec vitest run test/core/timers.test.ts` e a suíte da
  web inteira. Os testes da cena antiga da Devastação no `animation.test.tsx` (o trio de cartas no painel) passam a olhar a faixa
  do `DevastationCast`. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): a Devastação acontece quando a fileira cai, e as durações da fatia 3 (sub-projeto 6 §7.3, §7.4)`

---

### Task 2: A cena da Exódia e o retrato do perdedor

**Files:**
- Create: `packages/web/src/ui/scenes/Exodia.tsx`.
- Modify:
  - `packages/web/src/ui/scenes/aura.ts` (`auraVariants` aceita as camadas e as sementes; as da Exódia são as do protótipo);
  - `packages/web/src/ui/scenes/index.ts`;
  - `packages/web/src/ui/table/FightHud.tsx` (o retrato rachado e a vida a zero);
  - `packages/web/src/ui/anim/context.ts` e `Stage.tsx` (`Anim.defeated(player, lost)`);
  - `packages/web/src/ui/scenes/SceneFrame.tsx` (o carimbo da Exódia).
- Test: `packages/web/test/ui/scene-exodia.test.tsx` (novo), `packages/web/test/ui/scenes-aura.test.tsx`,
  `packages/web/test/ui/table.test.tsx`, `packages/web/test/ui/animation.test.tsx`.

**Interfaces:**
- **Consumes:** `SceneFrame`, `useSceneBox`, `SCENE_MOMENTS.EXODIA`, `boltTimes`.
- **Produces:**
  - **`auraVariants(layers = ATTACK_AURA, seedBase = 211)`** e **`EXODIA_AURA`**: camadas vermelho com contorno de tinta, ouro
    e papel, `rx`/`ry`/`n`/`L` do protótipo (linhas 743–747), semente-base 401, passo 53 entre camadas e 17 entre quadros.
  - **`Anim.defeated(player, lost): boolean`**, em que `lost` vale `true` quando a `view` está em `GAME_OVER` com
    `reason: 'EXODIA'` e outro vencedor:
    - parado, vale `lost`;
    - com a batida da Exódia tocando, só a partir de `crackAt`.
  - **O retrato derrotado** (`data-derrotado`):
    - a fenda de tinta (o desenho do protótipo, linha 763), em tons de cinza;
    - a barra e o número da vida mostram 0;
    - o medidor também diz 0 (`aria-valuenow` e "0 de 500"), porque a partida acabou pela Exódia;
    - o nome do medidor não muda.
  - **O carimbo da Exódia** (§7): ouro sobre tinta, filete de ouro, sombra vermelha, maior que os outros (o `.titulo.exo` do
    protótipo, linha 149).

- [ ] **Step 1: Testes que falham**
  - `scenes-aura.test.tsx`: `auraVariants(EXODIA_AURA, 401)` dá 3 × 4 caminhos, diferentes dos do Ataque.
  - `scene-exodia.test.tsx`, com timers falsos e a caixa de 1000 × 360:
    - os 4 K (`data-carta-cena="K"`) chegam um a um, em `kingsAt`, e cada um ergue o seu pilar (`data-pilar`, aceso depois do K
      dele);
    - não há feixes dos K até o Coringa (nenhum `[data-feixe]`);
    - a coroa (`data-coroa`) crava em `crownAt` (`data-cravada`), e os olhos acendem nela;
    - a aura ferve (o `d` muda em 70 ms) e fica parada com `reduced`;
    - partículas ≤ 60 ao longo da cena;
    - com `reduced`, os K e a coroa aparecem no lugar, sem voo.
  - `table.test.tsx`:
    - com a `view` em `GAME_OVER`, Exódia do oponente, o seu retrato tem `[data-derrotado]`;
    - o medidor "Vida de André" tem `aria-valuenow` 0 e o `data-hp` mostra 0;
    - pela vida (`reason: 'HP'`), nada disso.
  - `animation.test.tsx`: na batida da Exódia, o retrato só racha em `crackAt` (antes, `[data-derrotado]` não existe), e o pulo
    o mostra na hora.
- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Implementar**, seguindo o protótipo (linhas 769–823):
  - sem os feixes;
  - a aura com `auraVariants(EXODIA_AURA, 401)`;
  - os raios com `boltTimes(crownAt, bandOut)`;
  - os pilares com até 45% de opacidade.
- [ ] **Step 4: Rodar e ver passar**, mais a suíte da web e `pnpm --filter @coringa/web smoke`. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): a cena da Exódia (os 4 K, os pilares, a coroa) e o retrato que racha (sub-projeto 6 §7.3)`

---

### Task 3: A Devastação no campo (o terremoto, a cancelada e a refletida)

**Files:**
- Create:
  - `packages/web/src/ui/scenes/Devastation.tsx`;
  - `packages/web/src/ui/scenes/chasm.ts` (as bordas do abismo e os ramos das rachaduras, puros e de sementes fixas: `chasmEdges`
    e `crackBranch` do protótipo).
- Modify:
  - `packages/web/src/ui/scenes/index.ts`;
  - `packages/web/src/ui/anim/scene-box.ts` (a caixa ganha `row(player, row)`: o retângulo da fileira e o das vagas dela);
  - `packages/web/src/ui/anim/Stage.tsx` (as cartas do `RowDevastated` vão ao cemitério sem voar: `instant`);
  - `packages/web/src/ui/anim/Scene.tsx` (a cena de campo não sobe a cortina nem as tarjas).
- Test: `packages/web/test/ui/scene-devastation.test.tsx` (novo), `packages/web/test/ui/scenes-chasm.test.tsx` (novo),
  `packages/web/test/ui/animation.test.tsx`.

**Interfaces:**
- **Consumes:** `SCENE_MOMENTS.DEVASTATION` e `.DEVASTATION_CANCELED`; o carimbo (`Stamp`, exportado do `SceneFrame`).
- **Produces:**
  - **`chasmEdges(x0, x1, yc, seed, maxHalf)`:** `{ top: Point[]; bottom: Point[] }`, com 23 pontos cada.
  - **`crackBranch(seed, x, y, dir, len)`:** o `d` de um ramo.
  - **`SceneBox.row(player, row)`:** o retângulo da fileira (`[data-fileira="<id>:<ATK|DEF>"]`) e os retângulos das vagas
    (`[data-vaga]` e as cartas). Relativo ao palco; `null` sem a fileira.
  - **`FIELD_SCENES: ReadonlySet<SceneKind>`** = `DEVASTATION` e `DEVASTATION_CANCELED`. Para elas, a sobreposição não sobe a
    cortina, não desenha a faixa e passa a caixa da fileira.
- **[I] Sem tarjas nem cortina na Devastação:** a cena é no campo, e escurecer a mesa esconderia o que cai. O protótipo também não
  as tem. É desvio da letra do §7 ("Em todas: faixas de cinema"), e o autor confere no fim da fatia.

- [ ] **Step 1: Testes que falham**
  - `scenes-chasm.test.tsx`:
    - `chasmEdges` dá 23 pontos em cima e embaixo, com a borda de cima sempre acima da de baixo, e a mesma semente dá as mesmas
      bordas;
    - `crackBranch` é determinístico.
  - `scene-devastation.test.tsx`, com uma caixa falsa em que a fileira "p2:DEF" tem 4 vagas medidas:
    - **a terra ronca:** até `rumbleUntil`, `data-tremendo` no campo do alvo. O atributo `data-campo`, com o id do dono, é novo
      no `PlayerField`;
    - **a fenda:** corre em `crackAt` (`data-fenda`);
    - **o abismo:** abre em `openAt` (`data-abismo`), e as cópias das cartas da fileira (`data-carta-caindo`, uma por carta do
      evento, na vaga dela) caem;
    - **o nome:** carimba em `titleAt`;
    - **partículas:** ≤ 60;
    - **refletida** (`reflected: true`, o `player` do evento é quem lançou): a fenda abre na fileira dele;
    - **as quatro combinações** (sua ou do oponente, ATK ou DEF): a cena mede a fileira certa;
    - **cancelada:** a fenda começa e para em `stopAt`, sem `data-abismo` e sem carimbo;
    - **com `reduced`:** nenhum tremor nem queda; o abismo aparece e as cópias somem.
  - `animation.test.tsx`:
    - na Devastação, nenhuma cortina sobe (`curtainUp` falso), e as cartas da fileira chegam ao cemitério sem atraso;
    - **no celular** (`matchMedia` do PC falso), com a fileira fora da janela dos campos, o `scrollTop` dos campos muda na
      batida para ela ficar à vista.
- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Implementar**, seguindo o protótipo (linhas 840–953), com as partículas de vida curta removidas no fim e os
  filtros `feTurbulence`/`feDisplacementMap` desenhados uma vez.
- [ ] **Step 4: Rodar e ver passar**, mais a suíte e o smoke. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): a Devastação no campo, o terremoto que abre a fileira (sub-projeto 6 §7.4)`

---

### Task 4: A desolação

**Files:**
- Create: `packages/web/src/model/desolation.ts` (puro).
- Modify:
  - `packages/web/src/model/session.ts` (o conjunto de fileiras desoladas no snapshot);
  - `packages/web/src/ui/table/Row.tsx` e `PlayerField.tsx` (a terra revirada e o campo apagado);
  - `packages/web/src/styles.css`.
- Test: `packages/web/test/model/desolation.test.ts` (novo), `packages/web/test/ui/table.test.tsx`,
  `packages/web/test/model/session.test.ts`.

**Interfaces:**
- **Produces:**
  - `desolationAfter(before: ReadonlySet<string>, events: readonly GameEvent[], view: PlayerView): ReadonlySet<string>`, com as
    chaves `rowKey(player, row)`:
    - o `RowDevastated` acrescenta a fileira dele;
    - sai a fileira que voltou a ter carta na `view`;
    - um `resync` (sem eventos) mantém só as que seguem vazias.
  - `SessionSnapshot.desolated: ReadonlySet<string>`.
  - **Na fileira desolada** (`data-desolada`): a terra revirada (textura de `feTurbulence` estática, em `multiply`), pedras soltas
    e o campo do dono com as cores apagadas (`saturate(.35) sepia(.4)` no `.campo`).
  - **Quando a fileira volta a ter carta:** a fenda se fecha devagar (~0,6 s: opacidade e `scaleY`), e a cor volta. Com
    movimento reduzido, só some.
  - A desolação aparece no fim da cena (`settleAt`), não antes. O pulo a mostra na hora.

- [ ] **Step 1: Testes que falham**
  - `desolation.test.ts`, as regras acima:
    - o `RowDevastated` acrescenta;
    - a carta que volta (`CardsPlaced`, `Resurrected`, `CardStolen` para aquela fileira) tira;
    - a outra fileira do mesmo dono não muda;
    - o `resync` mantém só as que seguem vazias.
  - `table.test.tsx`: com `desolated` na sessão, `[data-desolada]` na fileira certa e o campo dele apagado (`data-apagado`).
  - `session.test.ts`: o `state` com `RowDevastated` deixa a fileira em `desolated`, e o seguinte com a carta de volta a tira.
- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar**, mais a suíte. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): o campo desolado depois da Devastação, até uma carta voltar (sub-projeto 6 §7.4)`

---

### Task 5: Os sons

**Files:**
- Modify: `packages/web/src/sound/synth.ts`.
- Test: `packages/web/test/model/synth.test.ts`.

**Interfaces:**
- **Consumes:** `SCENE_MOMENTS.EXODIA`, `.DEVASTATION`, `.DEVASTATION_CANCELED`.
- **Produces as receitas** (spec §10):
  - **`exodia`:** um baque grave a cada K (`kingsAt`), um ronco que cresce até a coroa, o tinido de metal da coroa e o estrondo
    em `crownAt`, e um acorde grave que desce em `drainAt`;
  - **`devastacao`:** o ronco que cresce até `crackAt`, o estalo da fenda em `crackAt`, o estrondo do chão em `openAt` e o
    entulho (ruído curto) logo depois;
  - **`devastacao-cancelada`:** o ronco que cresce e morre em `stopAt`, sem estrondo.
- [ ] **Step 1: Testes que falham** (`synth.test.ts`):
  - as vozes começam nos instantes da tabela (como os testes das cenas absolutas);
  - a cancelada não tem voz depois de `stopAt`;
  - o teste de duração aceita as três pistas novas até a duração da cena.
- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): os sons da Exódia e da Devastação (sub-projeto 6 §10)`

---

### Task 6: E2E, medição e documentação

**Files:**
- Create:
  - `packages/web/e2e/fixtures/exodia-devastacao.json` (uma entrada de "partidas anteriores" com uma partida do simulador que
    tenha uma Devastação que derruba uma fileira e termine em Exódia; se uma partida só não tiver as duas, duas entradas);
  - `docs/memoria/notas/medicao-fatia-3.md`.
- Modify:
  - `packages/web/e2e/scenes.spec.ts` (os casos novos);
  - `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` (§14: a fatia 3 entregue);
  - `docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (§6.2: a tabela nova);
  - `docs/memoria/estado.md` e `docs/memoria/diario.md`.
- [ ] **Step 1: A fixture**, achada com o simulador como na fatia 2 (`absolutos-40`). Anote a semente e os passos no
  cabeçalho do spec.
- [ ] **Step 2: O E2E**, a 1366 × 768 e a 360 × 640:
  - **Devastação:** a cena aparece sobre a fileira atingida, a fileira fica à vista (no celular, rolada) e nada rola de lado. O
    toque pula, e a fileira fica desolada (`[data-desolada]`).
  - **Exódia:** a cena com as tarjas. O toque pula, o retrato do perdedor fica rachado e o painel de fim aparece.
  - `failOnConsoleErrors`.
- [ ] **Step 3: Rodar** `pnpm e2e`. Com o `wrangler dev` do autor na 8787, troque a porta só naquela execução, como na fatia
  2. Expected: PASS.
- [ ] **Step 4: A medição** (build de produção, CPU 4×, 1366 × 768 e 390 × 844), meta ≥ 50 quadros por segundo.
- [ ] **Step 5: A documentação** e o commit — `test(web): E2E da Exódia e da Devastação; docs: a fatia 3 do sub-projeto 6`

---

## Para quem executa (escolhas deixadas a você)

- O desenho exato da coroa, dos pilares, da terra revirada e das pedras, dentro do protótipo.
- O timbre dos sons: só os instantes são fixos.
- Como a rolagem dos campos chega à fileira no celular (sem rolagem suave), contanto que ela fique inteira à vista.
- Os nomes dos atributos `data-*` novos: os testes acima são o contrato.
