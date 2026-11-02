# Sub-projeto 6, fatia 4: o Reflect (com os sons) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar o painel simples do Reflect pelas cenas aprovadas no protótipo (spec 6 §7.5): o espelho que se forma quando o Reflect é jogado, o cometa que bate nele e volta dourado até o retrato de quem atacou, e os dois espelhos que trincam no Reflect contra Reflect. Cada cena sai com os seus sons.

**Architecture:**
- **O que as fatias 2 e 3 deixaram e esta usa:** `model/scene-moments.ts`, o chunk `ui/scenes/`, a caixa medida (`useSceneBox`), `Beat.hit` (o golpe que acende dentro da cena), `Stamp`, `NO_INVERT`, `FIELD_SCENES` e as pistas de som com corte no pulo.
- **Três cenas, uma por evento do motor**, porque entre elas há uma decisão de verdade (quem foi refletido pode responder):
  - `ReflectPlayed` → `REFLECT_PLAYED`, 1,5 s: as cópias do K, do J e do Q voam às pontas, o espelho grande se forma e encolhe até a zona "Reflect ativo". Sem inversão e sem nome.
  - `ReflectTriggered` → `REFLECT_TRIGGERED`, 3,8 s: a carga, o cometa, o tempo que quase para, a batida no espelho (a inversão), a volta dourada, os cacos e o nome.
  - `ReflectCanceled` → `REFLECT_CANCELED`, 1,4 s: dois espelhos, um diante de cada campo, trincam e somem. Sem inversão, sem nome; a fita diz o motivo.
- **O espelho pequeno na zona** é da `PlayerField`, e sai de `player.reflect`: vale no replay, na reconexão e depois de recarregar a página.
- **Como no protótipo, sem tarjas:** a cortina escurece a mesa nas duas primeiras cenas, e o espelho fica entre os campos. A cancelada é cena de campo (`FIELD_SCENES`).

**Tech Stack:** React 19, Web Animations para as partículas (só `transform` e `opacity`), SVG, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` §1, §7 (gramática), §7.5, §9, §10, §11 e §13. Referência visual: `2026-10-31-direcao-visual-prototipo.html`, função `reflect()` (linhas 940 a 1044). A Ressurreição (§7.6) ficou para a fatia 4b (`decisoes.md` 2026-11-02 (1)).

## Global Constraints

- **Fotossensibilidade:** 1 inversão por cena, mantida por ≥ 300 ms; ≤ 3 trocas claro ↔ escuro por segundo; nada com movimento reduzido. Os testes da linha do tempo não se afrouxam: os que usavam `REFLECT_PLAYED` como exemplo de cena com inversão passam a usar `REFLECT_TRIGGERED`, com os mesmos limites.
- **Desempenho (§11):** ≤ 60 partículas vivas; só `transform` e `opacity` animam; sem `drop-shadow` nem `blur`. Fora do protótipo, portanto: a ondulação é escala de anel, não o atributo `r`; o cometa anda por `transform`, não por `left` e `top`; a borda de luz é desenhada.
- **Movimento reduzido:** sem voo, tremor, inversão nem partícula; as peças aparecem e somem, e a informação é a mesma (o número, a vida e o nome).
- **Sem regra na interface:** o dono, o atacante e o dano vêm dos eventos.
- **As cartas da cena são cópias:** K, J e Q genéricos (ids `cena-…`, como a `figureCards`); as de verdade seguem o motor.
- **Números** em Archivo com `tabular-nums`; **arte original**; **JavaScript inicial ≤ 200 KB gzip**, com as cenas no chunk.
- **O que não muda:** `RULES_VERSION` e `STATE_SCHEMA` (muda só a tabela da folga, como na fatia 3). `E2E_SEED` fica vazia, e o deploy é do autor.
- **Contratos que ficam:** `data-cena`, `data-cortina`, o pulo por toque e Esc, `aria-hidden` nas cenas, o painel de fim só depois da mesa parada e a lista "Cartas do Reflect" na zona.

## Review Focus

1. **Dano 0 no gatilho** (`ReflectTriggered` com `damage: 0`, sob Defesa Absoluta ou por metade da DEF maior que o ataque): o cometa se desfaz no espelho, sem voltar, sem número e sem a vida mexer → testes das Tasks 1 e 3.
2. **Ataque Absoluto contra Reflect:** o feixe não dispara no retrato do alvo (nada o acerta), a inversão fica com o Reflect, e a folga soma 8,3 s com teto de 8 s → testes das Tasks 1 e 3.
3. **Os dois lados:** o seu Reflect contra o ataque do Bot e o Reflect do Bot contra o seu ataque; o cometa sai da fileira de quem atacou e volta ao retrato dele → testes das Tasks 2 e 3.
4. **Celular em pé:** a fileira de quem atacou pode estar fora da janela, e o espelho de 300 px não cabe: a origem e o espelho se prendem à faixa medida → testes da Task 2 e E2E da Task 5.
5. **O espelho sem cena:** na reconexão (`catchUp`, a cena vira faixa), no replay e na partida que acaba com o dano devolvido, o espelho pequeno some ou fica conforme a `view`, e o painel de fim espera a mesa → testes das Tasks 2 e 3.

---

### Task 1: Os tempos e as batidas

**Files:**
- Modify: `packages/protocol/src/scenes.ts`, `packages/protocol/test/scenes.test.ts`
- Modify: `packages/web/src/model/scene-moments.ts`, `model/timeline.ts`, `model/effects.ts`, `model/copy.ts`
- Modify: `packages/web/src/ui/anim/Scene.tsx`, `ui/anim/Stage.tsx` (se a batida pedir), `ui/anim/useBeatPlayer.ts`
- Test: `packages/web/test/model/timeline.test.ts`, `test/model/effects.test.ts`, `test/ui/animation.test.tsx`, `packages/server/test/core/timers.test.ts`

**Interfaces:**
- Produces:
  - `SCENE_MS`: `ReflectPlayed: 1_500`, `ReflectTriggered: 3_800`, `ReflectCanceled: 1_400`.
  - `SCENE_MOMENTS.REFLECT_PLAYED: { cardsAt: [0, 120, 240], mirrorAt: 440, settledAt: 740, shrinkAt: 1_100, doneAt: 1_400 }`
  - `SCENE_MOMENTS.REFLECT_TRIGGERED: { launchAt: 540, slowAt: 840, slowUntil: 1_890, mirrorHitAt: 1_980, returnHitAt: 2_300, titleAt: 2_300 }`
  - `SCENE_MOMENTS.REFLECT_CANCELED: { crackAt: 500, fadeAt: 900 }`
  - `SceneKind` ganha `REFLECT_CANCELED`. `RARE_SCENE_MS` ganha as três cenas do Reflect; `BEAT_MS.scene` sai, porque nenhuma cena fica de fora das raras.
  - `Beat.hit.event` passa a ser `DamageDealt | ReflectTriggered`; `Beat.intercepted: boolean` (o Ataque Absoluto que bate num Reflect).

- [ ] **Step 1: Escrever os testes que falham**
  - `timeline.test`: as durações acima; `decisionPending` não encolhe nenhuma das três cenas; `REFLECT_PLAYED` e `REFLECT_CANCELED` sem inversão; `REFLECT_TRIGGERED` com inversão em `startMs + 1_980`; `ReflectTriggered` com `damage: 4` tem `hit.atMs === startMs + 2_300`, e com `damage: 0` tem `hit === null`; `[AbsoluteAttack, ReflectTriggered]`: `intercepted` só no primeiro, e sem `intercepted` no Ataque Absoluto comum; no `catchUp` as três viram faixa; 12 × `REFLECT_TRIGGERED` seguem dentro do limite de trocas.
  - `effects.test`: antes do `hit` acender, o `ReflectTriggered` não dá número nem impacto; depois, sim, no atacante. `ReflectCanceled` com a cena desenhada não dá `shieldBreak`; sem ela, dá. Fita do `ReflectCanceled`: "Os Reflects se anularam".
  - `scenes.test` (protocolo): a tabela nova; `[AbsoluteAttack, ReflectTriggered]` dá o teto de 8_000. `timers.test` (servidor): o prazo depois do gatilho ganha 3_800; o da anulação, 1_400.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/timeline.test.ts test/model/effects.test.ts`
Expected: FAIL nos tempos novos e em `intercepted`.

- [ ] **Step 3: Implementar**
  - `classify`: `ReflectCanceled` → `scene('REFLECT_CANCELED')`, fora do grupo `move()`. `NO_INVERT` ganha `REFLECT_PLAYED` e `REFLECT_CANCELED`; `FIELD_SCENES` ganha `REFLECT_CANCELED`; `SCENE_INVERT_LEAD_MS.REFLECT_TRIGGERED = mirrorHitAt`.
  - O instante do `hit` sai de uma tabela por cena (`ABSOLUTE_ATTACK.hitAt`, `REFLECT_TRIGGERED.returnHitAt`), e o `ReflectTriggered` com dano > 0 acende na própria batida, sem batida absorvida.
  - `effectsOf`: o efeito do evento que é o próprio `hit` só vale depois de acender.
  - `copy`: `SCENE_TITLE.REFLECT_CANCELED: ''`. `Scene.tsx`: a cancelada do Reflect, como a da Devastação, não tem nome no painel. `useBeatPlayer`: a fita no ar também nessa cena.
  - Testes antigos: `BEAT_MS.scene` sai de `animation.test`; os de 427, 436, 446, 486, 519 e 527 de `timeline.test` trocam o exemplo, sem perder os limites.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/protocol exec vitest run; pnpm --filter @coringa/web exec vitest run test/model test/ui/animation.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): os tempos e as batidas das cenas do Reflect`, com o diário e o `estado.md` (regra 6).

### Task 2: O espelho (a cena do lançamento e o espelho na zona)

**Files:**
- Create: `packages/web/src/ui/scenes/mirror.ts`, `ui/scenes/particles.ts`, `ui/scenes/MirrorArt.tsx`, `ui/scenes/ReflectPlayed.tsx`, `ui/table/MirrorMark.tsx`
- Modify: `ui/scenes/Exodia.tsx`, `ui/scenes/Devastation.tsx`, `ui/scenes/index.ts`, `ui/scenes/SceneFrame.tsx` (carimbo do Reflect), `ui/anim/scene-box.ts`, `ui/table/PlayerField.tsx`, `src/styles.css` (se a marca pedir)
- Test: `packages/web/test/ui/scenes-mirror.test.ts`, `test/ui/scene-reflect.test.tsx`, `test/ui/table.test.tsx`

**Interfaces:**
- Produces:
  - `mirrorSize(band): number`: `clamp(140, min(band.w * 0.62, band.h * 0.72), 300)`.
  - `mirrorLayout(origin: ScenePoint, target: ScenePoint, band): { center: ScenePoint; size: number; start: ScenePoint }`. `center` fica a 60% de `start` até `target`, como no protótipo, e o espelho inteiro cabe na faixa; `start` é a origem presa à faixa.
  - `mirrorTips(center, size): [ScenePoint, ScenePoint, ScenePoint]`, nas frações `(0, -0.42)`, `(-0.37, 0.22)` e `(0.37, 0.22)` de `size`.
  - `cometStops(start, center): { p1, p2, hit }`: `p1` a 42% e `p2` a 66% do caminho.
  - `reflectFrom(box, owner): { attacker: PlayerId; origin: ScenePoint; target: ScenePoint }`: o centro da fileira ATK de quem atacou e o do campo do dono, com o retrato como reserva quando não há fileira.
  - `SceneBox.reflectZone(player): SceneRect | null`, de `[data-espelho-zona="<player>"]`.
  - `MirrorArt`: o desenho do protótipo (triângulo `M0 -84 L74 44 L-74 44 Z`, moldura de ouro, filete de tinta, reflexos e lampejo por `transform`), sem `drop-shadow`; props `size`, `flash`.
  - `MirrorMark`: o espelho pequeno da zona, estático, `aria-hidden`.

- [ ] **Step 1: Escrever os testes que falham**
  - `scenes-mirror.test`: a 1536 × 695 o tamanho é 300, e a 360 × 640 fica entre 140 e 224; o espelho cabe na faixa com origem e alvo fora dela; `center` a 60%; as pontas e as paradas nas frações acima; a mesma entrada dá a mesma saída.
  - `scene-reflect.test`, `ReflectPlayed`: as três cópias entram em 0, 120 e 240 ms; `[data-espelho]` aparece em 440; em `shrinkAt` ele anima até a `reflectZone` do dono; sem nome carimbado; o seu Reflect e o do Bot usam o campo certo; reduzido: nenhum `[data-particula]`, as peças já no lugar; pico de partículas ≤ 60.
  - `table.test`: `player.reflect` mostra `[data-espelho-zona]` e `MirrorMark`, a lista "Cartas do Reflect" continua; sem Reflect, nenhum dos dois; o mesmo no replay e depois de um `resync` (`view` pronta, sem cena).
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/scenes-mirror.test.ts test/ui/scene-reflect.test.tsx`
Expected: FAIL, módulos inexistentes.

- [ ] **Step 3: Implementar** `mirror.ts`, `MirrorArt`, `ReflectPlayed` (faíscas nas três pontas em `mirrorAt`, lampejo entre 600 e 1_060 ms, encolhe até a zona de `shrinkAt` a `doneAt`) e `MirrorMark`, e registrar `REFLECT_PLAYED` no `SCENES`. A `spawn` tem uma cópia na Exódia e outra na Devastação: as duas passam para um módulo comum (`ui/scenes/particles.ts`), e esta cena o usa. Sem `reflectZone` (a zona ainda não mediu): o espelho só esmaece.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/scenes-mirror.test.ts test/ui/scene-reflect.test.tsx test/ui/table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): o espelho do Reflect, na cena do lançamento e na zona`, com o diário.

### Task 3: O cometa (o gatilho) e a anulação

**Files:**
- Create: `packages/web/src/ui/scenes/ReflectTriggered.tsx`, `ui/scenes/ReflectCanceled.tsx`
- Modify: `ui/scenes/index.ts`, `ui/scenes/AbsoluteAttack.tsx`, `ui/scenes/SceneFrame.tsx`
- Test: `packages/web/test/ui/scene-reflect.test.tsx`, `test/ui/animation.test.tsx`, `test/ui/scene-absolute-attack.test.tsx`

**Interfaces:**
- Consumes: `mirrorLayout`, `mirrorTips`, `cometStops`, `reflectFrom`, `MirrorArt` (Task 2); `SCENE_MOMENTS.REFLECT_TRIGGERED`, `REFLECT_CANCELED`, `Beat.hit`, `Beat.intercepted` (Task 1).
- Produces: `data-carga`, `data-cometa` (com `data-volta` na volta dourada), `data-espelho`, `data-cacos` e o número do golpe, para o teste e o E2E.

Os passos do cometa, medidos no protótipo:

| ms | O que acontece |
|---|---|
| 0–540 | O espelho volta a crescer; o retrato de quem atacou brilha; a esfera vermelha cresce na fileira dele, e 12 fios convergem |
| 540–840 | O cometa parte até `p1`, de escala 0,6 a 1,1 (cabeça, cauda dupla, dois anéis girando, brasas por sementes fixas) |
| 840–1890 | O tempo quase para: de `p1` a `p2` em ritmo linear |
| 1890–1980 | Bate no espelho |
| 1980 | Inversão (linha do tempo), três anéis ondulam no vidro, faíscas e onda de choque; os campos tremem 420 ms, como na Devastação |
| 1980–2300 | Volta dourado e maior (1,3 → 1,7) até o retrato de quem atacou |
| 2300 | O número, a vida que desce, os respingos, os cacos (18) e as três cartas que caem; o nome carimba por 1,5 s, em papel com filete de tinta e rotação de 3° |

- [ ] **Step 1: Escrever os testes que falham**
  - `scene-reflect.test`, `ReflectTriggered`: `data-carga` antes de 540 e fora depois; `data-cometa` em 540; `data-volta` em 1_980; `data-cacos` e o número em 2_300, junto com o nome; o Reflect do Bot contra você e o seu contra o Bot terminam no retrato certo.
  - `damage: 0`: em 1_980 o cometa se desfaz, sem `data-volta`, sem número, e o espelho quebra em 2_300.
  - Reduzido: nenhum `[data-particula]`, sem voo; o número e o nome aparecem nos mesmos instantes.
  - `ReflectCanceled`: dois `[data-espelho]`; `[data-trinca]` em 500; somem a partir de 900; sem cometa e sem nome.
  - Pico de `[data-particula]` ≤ 60 no impacto.
  - `animation.test`: a vida do atacante só desce depois do `hit`; na partida que acaba com o dano devolvido, o painel de fim espera a cena; `catchUp` sem `[data-cometa]`.
  - Ataque Absoluto: com `intercepted`, nenhum `[data-feixe]` no `hitAt`; sem ele, o feixe de sempre.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/scene-reflect.test.tsx`
Expected: FAIL, cenas não registradas.

- [ ] **Step 3: Implementar** as duas cenas e registrar `REFLECT_TRIGGERED` e `REFLECT_CANCELED`. Os tamanhos do cometa do protótipo (cabeça 64, caudas 250 × 52 e 340 × 18, anéis 84 e 108) escalam por `size / 300`. No Ataque Absoluto, `beat.intercepted` não liga o feixe.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): o cometa que volta do espelho, e os Reflects que se anulam`, com o diário.

### Task 4: Os sons

**Files:**
- Modify: `packages/web/src/model/sound.ts`, `src/sound/synth.ts`
- Test: `packages/web/test/model/sound.test.ts`, `test/model/synth.test.ts`, `test/model/sound-controller.test.ts`

**Interfaces:**
- Produces: pistas `reflect-armado`, `reflect-cometa`, `reflect-segurado` e `reflect-cancelado`. A pista `escudo` sai: só o Reflect a usa (o `sound-controller.test` a cita como exemplo e troca de pista).

- [ ] **Step 1: Escrever os testes que falham**: `cueOf`: `ReflectPlayed` → `reflect-armado`; `ReflectTriggered` → `reflect-cometa` com dano, `reflect-segurado` sem; `ReflectCanceled` → `reflect-cancelado`. `synth.test`: as receitas têm vozes, e os picos caem em `mirrorAt`, `mirrorHitAt` e `returnHitAt`.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**, com as vozes de `tone` e `noise` nos instantes de `SCENE_MOMENTS`:
  - **armado:** três tinidos agudos (as pontas) e o sino de vidro em `mirrorAt`;
  - **cometa:** o ronco da carga, o sopro do cometa que fica grave no tempo lento, o sino e o impacto em `mirrorHitAt`, o sopro que sobe na volta, o baque e o vidro que quebra em `returnHitAt`;
  - **segurado:** o mesmo até `mirrorHitAt`, depois só o vidro em `returnHitAt`;
  - **cancelado:** dois estalos de vidro, em `crackAt`.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts test/model/synth.test.ts test/model/sound-controller.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): os sons do Reflect`, com o diário.

### Task 5: E2E, medição e documentação

**Files:**
- Create: `packages/web/e2e/fixtures/reflect.json`, `docs/memoria/notas/medicao-fatia-4.md`
- Modify: `packages/web/e2e/scenes.spec.ts`
- Modify: a spec §7.5 e §14, a spec do servidor §6.2, as tabelas da spec da interface, `docs/memoria/estado.md`, `diario.md`

- [ ] **Step 1: Achar a partida.** Busca limitada com bots, por script no scratchpad, até uma partida com `REFLECT` seguido de gatilho com dano. Se aparecerem, anote também gatilho com dano 0, `CANCEL_REFLECT` e Devastação refletida ou cancelada. A fixture leva o que a mesma partida tiver; o que não aparecer fica só nos testes de unidade, e isso vai dito na entrega.
- [ ] **Step 2: Escrever o E2E**, nos dois tamanhos (PC e 360 × 640): o lançamento mostra `[data-espelho]` e, ao acabar, `[data-espelho-zona]`; o gatilho mostra `[data-cometa]`, depois `[data-volta]` e o número; nada rola de lado; o espelho inteiro dentro da janela; um toque pula e mostra o estado final; sem erro no console.
- [ ] **Step 3: Rodar**

Run: `pnpm --filter @coringa/web build; pnpm e2e -- scenes`
Expected: PASS. Com o `wrangler dev` do autor na 8787, usar outra porta só nessa execução, como na fatia 3.

- [ ] **Step 4: Ver no navegador e medir.** Abrir o replay da fixture, ver as cenas nos dois tamanhos, e medir com a CPU 4×: meta ≥ 50 quadros/s, ≤ 60 partículas. Registrar em `notas/medicao-fatia-4.md`.
- [ ] **Step 5: Documentar**: spec §14 (o que a execução decidiu) e o §6.2 do servidor; `diario.md` com cada escolha; `estado.md` com o próximo passo.
- [ ] **Step 6: Portão**

Run: `pnpm check`
Expected: verde. Depois, o push da branch, as duas CI verdes, uma revisão da branch inteira e o fast-forward na `main`. O autor joga.

## Para quem executa (escolhas deixadas a você)

Os ajustes finos de cor, as sementes das partículas, a curva de cada voo e o desenho exato do `MirrorMark` (desde que não aumente a altura da zona no celular). Ajustes de até ~15% nos tempos são do construtor (§7), e qualquer mudança no `SCENE_MS` vale também para os testes do protocolo e do servidor.
