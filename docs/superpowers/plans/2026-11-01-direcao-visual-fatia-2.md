# Sub-projeto 6, fatia 2: Ataque e Defesa Absolutos (as cenas, a gramática comum, a insígnia e os sons) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar o painel simples das cenas raras do Ataque Absoluto e da Defesa Absoluta pelas cenas aprovadas no protótipo
(spec 6 §7.1 e §7.2), com a gramática comum das cenas (§7: faixas de cinema, mesa escurecida, nome carimbado), o golpe do Ataque
Absoluto dentro da cena, a insígnia da Defesa Absoluta no retrato e os sons das duas.

**Architecture:**
- **Instantes:** as durações e os instantes de cada cena (título, inversão, golpe, insígnia) moram numa tabela pura,
  `model/scene-moments.ts`. Leem dela a linha do tempo (a inversão), o palco (o golpe), os desenhos e os sons.
- **O golpe dentro da cena:** o `DamageDealt` que vem logo depois do `AbsoluteAttack` deixa de ser batida própria e vira o
  `hit` da batida da cena. O `useBeatPlayer` o "acende" no instante do impacto, como já faz com a inversão; a partir dali, o
  número, os respingos, o tremor e a contagem da vida são os do golpe comum.
- **Os desenhos:** num módulo de cenas carregado sob demanda (`ui/scenes/`), pré-carregado quando a mesa monta. Enquanto não
  chega, vale o painel de hoje.

**Tech Stack:** TypeScript (Node 24, type stripping), React 19 + `motion` + Tailwind 4 na web, SVG, Web Animations, Vitest,
Playwright, Web Audio.

**Spec:** `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` (§1, §7 "Gramática comum", §7.1, §7.2, §10, §11, §12,
§13). A referência visual é o protótipo ao lado (`2026-10-31-direcao-visual-prototipo.html`):
- Ataque Absoluto: o desenho nas linhas 364–397 e 584–645, o estilo nas linhas 84–132;
- Defesa Absoluta: o desenho nas linhas 399–458 e 647–713.

## Global Constraints

- **Branch e portões:** branch própria `feat/direcao-visual-fatia-2`, a partir da `main`. `pnpm check` no pre-push; `pnpm e2e`
  e as duas CI verdes antes do fast-forward. Nunca `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- **Fotossensibilidade** (spec da web §10.4, spec 6 §1):
  - uma inversão por cena: no impacto do feixe (Ataque) e na trava (Defesa), mantida ≥ 300 ms;
  - nunca mais de 3 trocas claro ↔ escuro em 1 s;
  - os raios em volta da aura: no máximo 3 por segundo, cada um entrando e saindo em ≥ 100 ms;
  - nenhuma área acima de 25% da tela acende fora da inversão. **O clarão do protótipo (700 px, opacidade até 1) não vai**: no
    lugar dele, um brilho de ouro de no máximo 45% de opacidade e diâmetro de até 40% da largura da faixa;
  - com movimento reduzido: nenhuma inversão, nenhum tremor, nenhum voo, a aura parada, o título só esmaece.
- **Desempenho** (spec 6 §11):
  - no máximo ~60 partículas vivas;
  - a aura "ferve" trocando o `d` de 3 caminhos entre 4 variantes pré-calculadas, por atributo e sem estado do React;
  - só `transform` e `opacity` animam;
  - no celular (largura < 600), sem `drop-shadow`.
- **Números de jogo** em Archivo com `tabular-nums`; Alfa Slab One só no nome carimbado.
- **Arte original:** tudo em SVG, CSS e código; nada decalcado.
- **Sem regra na interface:** a cena lê eventos e a `view`. O dano, o alvo e a Defesa Absoluta vêm do motor.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip, e as cenas fora dele (o smoke da web confere).
- **O que não muda:** `RULES_VERSION` e `STATE_SCHEMA` (só a duração da folga de cena muda, e o prazo antigo continua valendo).
  `E2E_SEED` fica vazia, e o deploy é do autor.
- **Contratos que ficam:**
  - `data-cena` na camada da cena;
  - `data-cortina` e `data-ativa`;
  - `data-dano` e `data-cura`;
  - `data-respingo` e `data-tremor`;
  - o pulo por toque e Esc;
  - `aria-hidden` em tudo o que é cena (o histórico é o registro).

## Review Focus

1. **Ataque Absoluto contra Reflect** (`AbsoluteAttack`, depois `ReflectTriggered`): não há golpe para absorver. A cena toca
   inteira sem número de dano, e a do Reflect perde a inversão pela trava de 2 s → teste "Ataque Absoluto refletido" (Task 1).
2. **Ataque Absoluto contra uma Guarda** (o motor quebra a Guarda inteira, `preview.ts:68`, e emite `GuardBroken` entre o
   `AbsoluteAttack` e o `DamageDealt`): o golpe tem de ser absorvido mesmo assim, e a vida conta uma vez só → testes das Tasks 1 e
   2. Contra a Defesa Absoluta, o Ataque Absoluto causa dano normal (`preview.ts:69-71`).
3. **O oponente joga** (o espelho): a aura sai do lado dele, o feixe vai para o seu retrato, e a insígnia fica no retrato dele
   → testes das Tasks 4 e 5.
4. **Pular no meio** (toque, Esc, "Passo anterior" no replay, `resync`): a mesa mostra o estado final (a vida final, a insígnia
   no lugar), e o som da cena para → testes das Tasks 2, 5 e 6.
5. **Celular em pé, 360 × 640:** a faixa da cena fica entre o placar e a mão, o feixe sobe até o retrato do alvo, e nada rola de
   lado durante a cena → E2E da Task 7.

---

### Task 1: Os instantes das cenas e o golpe que a cena absorve

**Files:**
- Create: `packages/web/src/model/scene-moments.ts`
- Modify:
  - `packages/protocol/src/scenes.ts` (`AbsoluteAttack: 4_500`, `AbsoluteDefenseStarted: 4_800`);
  - `packages/web/src/model/timeline.ts`;
  - `packages/web/src/model/sound.ts` (o golpe absorvido não soa);
  - `packages/web/src/model/effects.ts` (`damageBeatIndex` ignora o absorvido).
- Test:
  - `packages/protocol/test/scenes.test.ts`;
  - `packages/server/test/core/timers.test.ts` (a folga nova sai da tabela, sem número fixo);
  - `packages/web/test/model/timeline.test.ts`, `packages/web/test/model/sound.test.ts`.

**Interfaces:**
- Produces:
  - `SCENE_MOMENTS: { ABSOLUTE_ATTACK: AttackMoments; ABSOLUTE_DEFENSE: DefenseMoments }`, em ms desde o começo da cena.
    Valores medidos no protótipo e arredondados:
    - `AttackMoments`: `{ barsIn: 280, transformAt: 1_430, titleAt: 1_700, ballAt: 2_740, hitAt: 3_200, bandOut: 4_050 }`;
    - `DefenseMoments`: `{ barsIn: 280, shieldLandsAt: 1_180, queensAt: [1_630, 1_850, 2_070, 2_290], lockAt: 2_700, titleAt:
      3_000, insigniaAt: 4_300 }`;
    - `TITLE_MS = 1_500`.
  - `Beat.hit: { event: Extract<GameEvent, { type: 'DamageDealt' }>; atMs: number } | null`. `atMs` é absoluto, como `startMs`.
    Sempre `null`, salvo na batida `ABSOLUTE_ATTACK`.
  - `Beat.absorbed: boolean`. É o `DamageDealt` que virou o `hit` da cena: batida `quiet` de 0 ms, sem som e sem efeito.
  - `SCENE_INVERT_LEAD_MS.ABSOLUTE_ATTACK = SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt` e `.ABSOLUTE_DEFENSE =
    SCENE_MOMENTS.ABSOLUTE_DEFENSE.lockAt`. As outras cenas não mudam.

- [ ] **Step 1: Testes que falham**
  - `scenes.test.ts`: `sceneAllowanceMs([{ type: 'AbsoluteAttack' }])` é `4_500`; `[{ type: 'AbsoluteDefenseStarted' }]` é `4_800`.
  - `timeline.test.ts`, describe "o golpe dentro do Ataque Absoluto (sub-projeto 6 §7.1)":
    - **"o DamageDealt logo depois vira o golpe da cena":** com `[AbsoluteAttack p1, DamageDealt p1→p2 dano 154,
      CardsRemovedFromRow]` em `live`, a batida da cena tem `hit.event.damage === 154` e
      `hit.atMs === startMs + 3_200`. O `DamageDealt` fica `kind: 'quiet'`, `durationMs: 0` e `absorbed: true`, e a duração total
      é a da cena mais a da remoção.
    - **"a inversão é no impacto":** `invert.atMs === hit.atMs`.
    - **"Ataque Absoluto refletido":** com `[AbsoluteAttack, GuardBroken, BuffRemoved, ReflectTriggered]`, `hit` é `null`,
      nada fica `absorbed`, e no máximo uma inversão começa em cada janela de 2 s.
    - **"no catchUp nada é absorvido":** a cena vira faixa, e o `DamageDealt` volta a ser batida de dano.
    - **"outro atacante não é absorvido":** o `DamageDealt` de p2 depois do `AbsoluteAttack` de p1 segue batida própria.
    - **"a Guarda quebrada no meio não impede":** com `[AbsoluteAttack p1, GuardBroken p2 (2 K), DamageDealt p1→p2]`, o
      `DamageDealt` é absorvido pela cena, e o `GuardBroken` fica como batida de movimento logo depois dela (os K racham e vão ao
      cemitério depois do impacto).
    - **"Defesa Absoluta: a inversão é na trava":** `invert.atMs === startMs + 2_700`.
    - **Durações:** `RARE_SCENE_MS.ABSOLUTE_ATTACK` é `4_500` e `RARE_SCENE_MS.ABSOLUTE_DEFENSE` é `4_800`, e os testes de
      fotossensibilidade que já existem seguem valendo, sem afrouxar.
  - `sound.test.ts`: `cueOf` da batida absorvida é `null`.
  - `timers.test.ts`: os casos de folga já escritos com `SCENE_MS.AbsoluteAttack` passam sem mudança. Se algum número estiver
    fixo, troque pela tabela.

- [ ] **Step 2: Rodar e ver falhar**
  Run:
  - `pnpm --filter @coringa/protocol exec vitest run test/scenes.test.ts`
  - `pnpm --filter @coringa/web exec vitest run test/model/timeline.test.ts test/model/sound.test.ts`

  Expected: FAIL (as durações de 3 s, e `hit` e `absorbed` não existem).

- [ ] **Step 3: Implementar**
  - **Na `buildTimeline`, no passo 1:**
    - um `DamageDealt` é absorvido quando a última batida não quieta antes dele, pulando os `GuardBroken`, é uma cena
      `ABSOLUTE_ATTACK` do mesmo `attacker`, e o modo não é `catchUp` nem `resync`. O motor quebra a Guarda inteira entre os
      dois (`preview.ts:68`, `combat.ts` `resolveAttack`);
    - o absorvido vira `quiet`, com `baseMs` 0, e a cena guarda o evento.
  - **No passo 3:** `hit.atMs = start + SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt`.
  - **`damageBeatIndex`** já pula batidas `quiet`: o absorvido fica de fora sem mudança. Confira com um teste.

- [ ] **Step 4: Rodar e ver passar** (os mesmos comandos, mais `pnpm --filter @coringa/server exec vitest run
  test/core/timers.test.ts`). Expected: PASS.

- [ ] **Step 5: Commit** — `feat(web): os instantes das cenas absolutas e o golpe dentro do Ataque Absoluto (sub-projeto 6 §7.1)`

---

### Task 2: O golpe acende no impacto; a insígnia na hora certa

**Files:**
- Modify:
  - `packages/web/src/ui/anim/useBeatPlayer.ts` (`hitLanded`);
  - `packages/web/src/ui/anim/Stage.tsx` (efeitos e vida do golpe absorvido);
  - `packages/web/src/model/effects.ts` (`effectsOf` com o golpe; `lifeChange` da cena; `insigniaShown`);
  - `packages/web/src/ui/anim/context.ts` (`insignia(player)`).
- Test: `packages/web/test/ui/animation.test.tsx`, `packages/web/test/model/effects.test.ts`.

**Interfaces:**
- Consumes: `Beat.hit` e `Beat.absorbed` (Task 1); `life()` e `useCountedLife` (os ajustes da fatia 1, `73b4e1f`).
- Produces:
  - `useBeatPlayer(...).hitLanded: boolean` — liga em `hit.atMs` (o mesmo agendamento da inversão) e desliga na troca de batida.
    Com movimento reduzido, também liga: o número e a vida são informação.
  - `effectsOf(beat, view, landed = false)`: numa cena com `hit` e `landed`, soma os efeitos de `effectsOfEvent(hit.event)` (o
    número, os respingos, as fileiras acesas). O golpe absorvido treme **forte** com qualquer dano > 0 (spec 6 §7.1: "tremor
    forte"), e não pelo peso do dano.
  - **A vida (`life()` do `Stage`).** As mudanças por batida (`lifeSteps`) dão à batida da cena com `hit` o
    `lifeChange(hit.event)`, e à batida `absorbed` o `null`: o golpe conta **uma vez só** no `done` e no `total`. Contado em dobro,
    o `before + total` não fecharia com a vida da `view`, e o recurso do `useCountedLife` entraria em todo Ataque Absoluto. O
    `step` da batida da cena vale 0 até `hitLanded`; depois, a mudança, contada em `ms = 700`.
  - `insigniaShown(beats, index, player, active): boolean` (puro). `active` é o `absoluteDefense` da `view`:
    - com `active`, a insígnia aparece salvo se a linha do tempo ainda vai tocar o `AbsoluteDefenseStarted` desse jogador (no
      índice atual ou depois);
    - sem `active`, ela aparece se ainda vai tocar o `AbsoluteDefenseEnded` dele (depois do índice atual).
  - `Anim.insignia(player: PlayerId): boolean` — o `insigniaShown` da batida de agora (parado: `active`).

- [ ] **Step 1: Testes que falham**
  - `animation.test.tsx`, describe "o golpe do Ataque Absoluto (sub-projeto 6 §7.1)", com `THEIRS` e
    `[AbsoluteAttack p2, DamageDealt p2→p1 dano 50]`:
    - antes de 3 200 ms: nenhum `[data-dano]`, nenhum `data-tremor`, e a vida mostrada é 187;
    - depois de 3 200 ms (use `advance(3_200)`, `advance(1)` e depois o resto): `[data-dano]` com "−50", `data-tremor="forte"`,
      `[data-respingo]`, e a vida desce até 137 em 700 ms;
    - um número só em toda a linha do tempo (o absorvido não repete);
    - o pulo aos 1 000 ms mostra 137 na hora.
  - "golpe de 0 (a Defesa cobre a conta)": com dano 0, nada de número, tremor ou respingo, e a vida segue 187.
  - "com a Guarda quebrada no meio, a vida conta uma vez só": com `[AbsoluteAttack p2, GuardBroken p1, DamageDealt p2→p1 dano
    50]`, a vida mostrada nunca fica abaixo de 137 nem volta acima do valor que já mostrou.
  - "com movimento reduzido o número aparece no impacto, sem tremor".
  - `effects.test.ts`, os casos de `insigniaShown`:
    - a Defesa começa nesta linha do tempo: `false` até a batida dela passar, `true` depois;
    - a Defesa já estava ativa: `true`;
    - ela termina nesta linha do tempo: `true` até a batida do `AbsoluteDefenseEnded`, `false` depois;
    - outro jogador: não conta.

- [ ] **Step 2: Rodar e ver falhar**
  Run: `pnpm --filter @coringa/web exec vitest run test/ui/animation.test.tsx test/model/effects.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implementar.** O `hitLanded` usa o mesmo relógio e o mesmo `startedAt` da inversão no `useBeatPlayer`. O tremor
  continua no `data-palco`, ligado pelo `fx.impact`.

- [ ] **Step 4: Rodar e ver passar**, mais a suíte da web inteira (`pnpm --filter @coringa/web exec vitest run`). Expected: PASS.

- [ ] **Step 5: Commit** — `feat(web): o golpe do Ataque Absoluto acende no impacto do feixe`

---

### Task 3: A moldura comum das cenas e o módulo sob demanda

**Files:**
- Create:
  - `packages/web/src/ui/scenes/index.ts` (o mapa `SceneKind` → componente; é a porta do chunk);
  - `packages/web/src/ui/scenes/SceneFrame.tsx` (as tarjas, a faixa e o nome carimbado);
  - `packages/web/src/ui/scenes/useSceneBox.ts` (mede a faixa e os retratos).
- Modify:
  - `packages/web/src/ui/anim/Scene.tsx`: as raras com componente próprio usam o módulo; enquanto ele não carrega, vale o painel
    de hoje. A cortina passa a começar embaixo do placar;
  - `packages/web/src/ui/table/Table.tsx` (pré-carrega o módulo quando monta);
  - `packages/web/src/styles.css`.
- Test: `packages/web/test/ui/scene-frame.test.tsx` (novo), `packages/web/test/ui/animation.test.tsx`; o smoke da web, sem
  mudança.

**Interfaces:**
- Produces:
  - `loadScenes(): Promise<SceneModule>` — um `import()` memorizado, que a `Table` chama num `useEffect`.
  - `SceneModule = Partial<Record<SceneKind, ComponentType<SceneProps>>>`.
  - `SceneProps = { beat: Beat; names: Names; reduced: boolean; me: PlayerId; hitLanded: boolean }`.
  - `useSceneBox(): { band: DOMRect; target: (side: 'voce' | 'oponente') => { x: number; y: number }; hudBottom: number } |
    null`:
    - mede, relativo ao `[data-palco]`, o `[data-campos]` (a faixa), o `[data-placar]` (fim do placar) e o centro de cada
      `[data-retrato]`;
    - usa `ResizeObserver` num `useEffect`, como a espada da fatia 1;
    - vale `null` até medir.
  - `SceneFrame({ kind, titleAt, reduced, children })`:
    - as tarjas pretas entram em 260 ms no alto (logo abaixo do placar) e embaixo da faixa;
    - a faixa diagonal (`clip-path`) recebe `children`;
    - o nome carimbado (escala 3 → 1 com quique, segura ~1,2 s, sai crescendo; total `TITLE_MS`) tem as cores do §7: Ataque com
      papel sobre vermelho, inclinado −3°; Defesa com tinta sobre papel e filete de ouro, inclinado 2°;
    - sem legenda: o `detail` do `sceneText` não aparece nessas duas cenas.
  - Coordenadas: a faixa é desenhada num quadro de 1000 × 360 unidades (o do protótipo), escalado por `min(w/1000, h/360)` e
    centrado. Com largura < 600, o personagem fica no meio da faixa, e não a 30% dela.

- [ ] **Step 1: Testes que falham**
  - `scene-frame.test.tsx`, com `ResizeObserver` e `getBoundingClientRect` falsos:
    - as tarjas (`data-tarja="cima" | "baixo"`) ficam dentro da faixa medida;
    - o nome aparece com `data-carimbo="ABSOLUTE_ATTACK"` no `titleAt`;
    - com `reduced`, as tarjas já estão no lugar e o nome só esmaece (sem `scale` no estilo);
    - antes da medida, nada desenha.
  - `animation.test.tsx`:
    - **"a cortina não cobre o placar":** o `[data-cortina]` começa no `--fim-do-placar` medido;
    - **"sem o módulo carregado, a cena rara mostra o painel de hoje":** sem chamar `loadScenes`, `[data-painel-cena]` com o
      título.

- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm --filter @coringa/web exec vitest run test/ui/scene-frame.test.tsx
  test/ui/animation.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implementar.** O carimbo e as tarjas usam Web Animations (`el.animate`), como os respingos da fatia 1.

- [ ] **Step 4: Rodar e ver passar**, mais `pnpm --filter @coringa/web smoke` (que já constrói) (o JavaScript
  inicial segue ≤ 200 KB, e o chunk das cenas fica à parte). Expected: PASS.

- [ ] **Step 5: Commit** — `feat(web): a moldura comum das cenas (tarjas, faixa, nome carimbado) num módulo sob demanda`

---

### Task 4: A cena do Ataque Absoluto

**Files:**
- Create: `packages/web/src/ui/scenes/AbsoluteAttack.tsx`, `packages/web/src/ui/scenes/aura.ts` (as variantes pré-calculadas).
- Modify: `packages/web/src/ui/scenes/index.ts`.
- Test: `packages/web/test/ui/scene-absolute-attack.test.tsx` (novo), `packages/web/test/ui/scenes-aura.test.ts` (novo).

**Interfaces:**
- Consumes: `SceneFrame`, `useSceneBox`, `SCENE_MOMENTS.ABSOLUTE_ATTACK` e `hitLanded` (o número e os respingos são do HUD,
  Task 2).
- Produces:
  - `auraVariants(): string[][]` — 3 camadas × 4 caminhos. É a função `auraPath` do protótipo (linhas 367–385), com as sementes
    fixas dele: as mesmas formas sempre.
  - `boltTimes(fromMs: number, toMs: number): number[]` — os instantes dos raios em volta da aura: um a cada ≥ 340 ms, cada um
    entrando em 100 ms, parado 40 ms e saindo em 100 ms.

- [ ] **Step 1: Testes que falham**
  - `scenes-aura.test.ts`:
    - `auraVariants()` tem 3 × 4 caminhos não vazios, e duas chamadas dão o mesmo resultado;
    - em `boltTimes(1_430, 3_130)`, nenhuma janela de 1 000 ms tem mais de 3 instantes.
  - `scene-absolute-attack.test.tsx`, com timers falsos e uma caixa medida de 1000 × 360:
    - **Do seu lado** (`beat.event.player === me`):
      - o personagem (`data-heroi`) fica à esquerda da faixa;
      - a aura (`data-aura`) existe e troca o `d` com o tempo (dois `d` diferentes em 70 ms);
      - quatro J (`data-carta-cena="J"`) aparecem e somem até `transformAt`;
      - os olhos acendem em `transformAt`;
      - o feixe (`data-feixe`) existe de `ballAt` a `hitAt + 900`, apontado para o retrato `oponente`: o ângulo do estilo bate
        com `atan2`.
    - **Do oponente:** o personagem fica à direita, e o feixe aponta para o retrato `voce`.
    - **Com `reduced`:** a aura não troca de `d`, nenhuma carta voa (as quatro já aparecem no lugar e somem), e o feixe aparece e
      some sem `scaleX`.
    - **Partículas:** nunca mais de 60 elementos `[data-particula]` vivos (conte a cada 50 ms ao longo da cena).

- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm --filter @coringa/web exec vitest run test/ui/scene-absolute-attack.test.tsx
  test/ui/scenes-aura.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implementar**, seguindo o protótipo (linhas 584–645). Os desvios obrigatórios:
  - os raios seguem `boltTimes`, e não 140 ms de estalo;
  - o clarão segue o limite das Global Constraints;
  - a aura é trocada por `setAttribute('d')` num `setInterval` de 70 ms, parado com `reduced`;
  - as pedras, os riscos e a onda usam Web Animations, com as partículas removidas no `finished`;
  - os respingos e o número são os do HUD (`InkSplat` e `DamageNumber` com o `fx` do golpe), não os da cena;
  - o tremor forte é o `data-tremor` do palco.

- [ ] **Step 4: Rodar e ver passar.** Expected: PASS.

- [ ] **Step 5: Commit** — `feat(web): a cena do Ataque Absoluto (aura, os 4 J, o feixe; sub-projeto 6 §7.1)`

---

### Task 5: A cena da Defesa Absoluta e a insígnia no retrato

**Files:**
- Create: `packages/web/src/ui/scenes/AbsoluteDefense.tsx`, `packages/web/src/ui/table/Insignia.tsx` (o escudo pequeno, o mesmo
  desenho do escudo da cena).
- Modify: `packages/web/src/ui/scenes/index.ts`, `packages/web/src/ui/table/FightHud.tsx` (a insígnia no canto de baixo, por
  fora, do retrato; a espada fica no de cima).
- Test: `packages/web/test/ui/scene-absolute-defense.test.tsx` (novo), `packages/web/test/ui/table.test.tsx`.

**Interfaces:**
- Consumes: `SceneFrame`, `useSceneBox`, `SCENE_MOMENTS.ABSOLUTE_DEFENSE` e `Anim.insignia` (Task 2).
- Produces: `Insignia({ className })` (SVG, `aria-hidden`, `data-insignia`). O nome do medidor de vida **não muda** (contrato da
  fatia 1). O leitor de tela já sabe da Defesa Absoluta pela marca de estado "Defesa Absoluta", na lista "Estado do Coringa".

- [ ] **Step 1: Testes que falham**
  - `scene-absolute-defense.test.tsx`:
    - a muralha (`data-muralha`) sobe até `shieldLandsAt`;
    - o escudo (`data-escudo`) chega em `shieldLandsAt`;
    - as quatro letras Q (`data-quarto="0..3"`) acendem uma a uma em `queensAt`;
    - os 22 rebites (`data-rebite`) estão acesos em `lockAt + 340`;
    - o emblema (`data-emblema`) aparece em `lockAt`;
    - não há cúpula (nenhum `[data-cupula]`);
    - com `reduced`, as peças aparecem no lugar, sem queda.
  - `table.test.tsx`:
    - **"a insígnia da Defesa Absoluta":** com `absoluteDefense` na `view` parada, `[data-insignia]` dentro de
      `[data-retrato="voce"]`, e o medidor segue "Vida de André";
    - sem ela, nenhum `[data-insignia]`;
    - do lado do oponente, no retrato dele.
  - `animation.test.tsx`:
    - **"a insígnia espera o fim da cena":** com `AbsoluteDefenseStarted` de p1, ela aparece só depois da batida;
    - **"pular mostra a insígnia":** o pulo no meio da cena mostra `[data-insignia]` na hora.

- [ ] **Step 2: Rodar e ver falhar.** Run: `pnpm --filter @coringa/web exec vitest run test/ui/scene-absolute-defense.test.tsx
  test/ui/table.test.tsx test/ui/animation.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implementar**, seguindo o protótipo (linhas 399–458 e 647–713), **sem a cúpula** e com a inversão na trava.
  Fim da cena: o escudo encolhe e voa até o retrato do dono (`target` do `useSceneBox`) a partir de `insigniaAt`; a insígnia do
  placar aparece quando a batida acaba.

- [ ] **Step 4: Rodar e ver passar.** Expected: PASS.

- [ ] **Step 5: Commit** — `feat(web): a cena da Defesa Absoluta e a insígnia no retrato (sub-projeto 6 §7.2)`

---

### Task 6: Os sons das duas cenas

**Files:**
- Modify:
  - `packages/web/src/model/sound.ts` (pistas `ataque-absoluto` e `defesa-absoluta` no lugar de `absoluto` e `escudo` para esses
    eventos; a Exódia e a Devastação seguem com `absoluto`);
  - `packages/web/src/sound/synth.ts` (as receitas, e `cut()`);
  - `packages/web/src/sound/controller.ts` (`cut()`);
  - `packages/web/src/ui/anim/Stage.tsx` (o pulo de uma cena chama `sound.cut()`).
- Test: `packages/web/test/model/sound.test.ts`, `packages/web/test/model/synth.test.ts`, `packages/web/test/model/sound-controller.test.ts`, `packages/web/test/ui/sound.test.tsx`.

**Interfaces:**
- Consumes: `SCENE_MOMENTS` (os instantes das vozes saem da tabela: o som segue o pico da cena).
- Produces:
  - **`ataque-absoluto`:**
    - um ronco que cresce de `barsIn` a `transformAt`;
    - o estrondo da transformação em `transformAt`;
    - a carga da bola de `ballAt` a `hitAt`;
    - o impacto grave em `hitAt`.
  - **`defesa-absoluta`:**
    - o ronco da muralha de `barsIn` a `shieldLandsAt`;
    - o baque do escudo em `shieldLandsAt`;
    - um tinido de metal em cada `queensAt`;
    - o clangor da trava em `lockAt`.
  - Cada pista passa por um ganho próprio. `Synth.cut(): void` leva esse ganho a zero em 80 ms e para as vozes agendadas; o
    controlador repassa o `cut()` (sem sintetizador, não faz nada).

- [ ] **Step 1: Testes que falham**
  - `sound.test.ts`: `cueOf` do `AbsoluteAttack` é `ataque-absoluto`, e o do `AbsoluteDefenseStarted` é `defesa-absoluta`.
  - `synth.test.ts`, com o `AudioContext` falso dos testes de hoje:
    - as vozes da `ataque-absoluto` começam nos instantes da tabela (`start` em `hitAt / 1000`);
    - as da `defesa-absoluta` têm quatro tinidos, em `queensAt`;
    - `cut()` agenda a rampa a zero.
  - `test/ui/sound.test.tsx` (com o controlador falso no contexto, como os testes de hoje desse arquivo): o toque no meio da cena chama `cut`.

- [ ] **Step 2: Rodar e ver falhar** — Expected: FAIL.
- [ ] **Step 3: Implementar.** Respeita o volume, o "sem som" e o primeiro gesto de hoje.
- [ ] **Step 4: Rodar e ver passar** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): os sons do Ataque e da Defesa Absolutos (sub-projeto 6 §10)`

---

### Task 7: E2E, medição e documentação

**Files:**
- Create:
  - `packages/web/e2e/fixtures/absolutos.json` (uma entrada de "partidas anteriores" com o replay de uma partida do simulador que
    tenha um Ataque Absoluto que acerta e uma Defesa Absoluta);
  - `packages/web/e2e/scenes.spec.ts`;
  - `docs/memoria/notas/medicao-fatia-2.md`.
- Modify:
  - `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` (§14: a fatia 2 entregue);
  - `docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (§6.2: as folgas novas);
  - `docs/memoria/estado.md` e `docs/memoria/diario.md`.

- [ ] **Step 1: A fixture.**
  - Ache uma semente com `pnpm --filter @coringa/sim` (o `greedy` × `greedy` costuma juntar os 4 J). Pode ser um script de uma
    vez, fora do git.
  - Grave a entrada no formato da `especiais.json` (`layout.spec.ts`).
  - Anote no cabeçalho do spec a semente e os passos das duas cenas.
- [ ] **Step 2: O E2E** (`scenes.spec.ts`), no replay `/partidas/absolutos`, para cada uma das duas cenas:
  - **a 1366 × 768 e a 360 × 640:**
    - vá ao passo da cena e clique "Próximo passo";
    - confira `[data-cena]` e as tarjas;
    - confira `scrollWidth === clientWidth` durante a cena;
  - **um toque na mesa pula:** a vida final no `data-hp` (Ataque) ou o `[data-insignia]` (Defesa) aparece em menos de 500 ms;
  - **`failOnConsoleErrors`.**
- [ ] **Step 3: Rodar** `pnpm e2e` (com o `wrangler dev` do autor fechado na 8787; senão, pela CI). Expected: PASS.
- [ ] **Step 4: A medição.**
  - O que medir: as duas cenas no build de produção (`vite preview`), pelo replay, no Chromium com a CPU 4× mais lenta.
  - Meta: ≥ 50 quadros por segundo, com o maior quadro e o número de partículas vivas no pico.
  - Mesmo procedimento da fatia 1, a 1366 × 768 e a 390 × 844.
  - Abaixo da meta: corte primeiro partículas e `drop-shadow`, nunca a estrutura (spec 6 §11).
- [ ] **Step 5: A documentação.** A spec 6 §14 diz "Entregue em <data>" na fatia 2, a spec do servidor §6.2 cita as folgas de
  4,5 e 4,8 s, e o diário e o estado recebem o que mudou.
- [ ] **Step 6: Commit** — `test(web): E2E das cenas absolutas; docs: a fatia 2 do sub-projeto 6`

---

## Para quem executa (escolhas deixadas a você)

- A forma exata das tarjas e da faixa diagonal em cada largura, dentro do quadro de 1000 × 360.
- O timbre dos sons: só os instantes são fixos.
- Onde, no canto do retrato, a insígnia fica melhor, sem cobrir a espada.
- Os nomes dos atributos `data-*` novos; os testes acima são o contrato, e o teste pode trocar o nome junto.
