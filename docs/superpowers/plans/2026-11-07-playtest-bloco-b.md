# Pontos do playtest, bloco B: o golpe final (ponto 15) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** quando o ataque comum leva a vida do outro a zero, a partida acaba com uma cena curta de clímax: as tarjas descem, a fileira de
Ataque de quem bate acende carta a carta, o corte atravessa a mesa até o retrato do outro, a tela inverte uma vez e treme, a vida zera, o
retrato racha e o carimbo cai: **GOLPE FINAL!** para quem bate, **DERROTA** para quem leva. Depois, a faixa e o painel do fim de hoje.

**Architecture:**
- **Nenhum evento novo, nenhuma regra nova.** O motor já emite `DamageDealt` e logo depois `GameOver` (`resolveAttack` → `loseHp` →
  `finishGame`), e encerra antes de tirar as cartas das fileiras. A linha do tempo da web reconhece o par e transforma o `DamageDealt` numa
  cena, `FINAL_BLOW`, que carrega o próprio golpe (`hit`), como o Reflect que devolve dano. O golpe que mata dentro do Ataque Absoluto (o
  `DamageDealt` absorvido) e o dano devolvido pelo Reflect seguem com as cenas deles.
- **Sem cortina:** a cena acontece na mesa, à vista (a fileira que acende precisa aparecer). Ela entra em `FIELD_SCENES`, e só as tarjas de
  cinema descem, abaixo do placar. As tarjas e o carimbo são os de `SceneFrame`, extraídos para as duas usarem.
- **O impacto é o de sempre:** a inversão vem da linha do tempo (`SCENE_INVERT_LEAD_MS`, a `FlashLock`), o tremor forte e a vida que desce
  vêm do `hit` (`effectsOf`, `HIT_COUNT_MS`), e o número do golpe é o `HitNumber` do Ataque Absoluto.
- **O retrato racha em toda derrota pela vida** (escolha B2): hoje só a Exódia racha. A conta de quando racha sai de uma função pura, que
  troca o `exodiaStage` do `Stage`.

**Tech Stack:** React 19, Web Animations (só `transform`, `translate`, `scale` e `opacity` animam), Vitest (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-playtest-design.md` §4 (o ponto), §8 (as restrições) e §10 ("as tarjas do golpe final ficam abaixo
do placar; a derrota usa a mesma cena, espelhada"). Protótipo: `docs/superpowers/specs/2026-11-03-playtest-prototipo.html`, quadro `p15`,
variante **A** (`decisoes.md` 2026-11-03 (4)).

## Escolhas para o autor aprovar

Cada uma tem a recomendação de quem escreveu. Nada do código muda antes da aprovação dele.

- **B1. Sem folga no relógio.** A §4 diz "a folga em `SCENE_MS` (o prazo do servidor e a espera do bot)", mas depois do `GameOver` ninguém
  decide: o servidor não tem prazo, o Bot não joga, e a revanche só sai quando os dois a pedem no painel do fim, que já espera a mesa parar.
  **Recomendo** não mexer no `SCENE_MS` nem no servidor (a duração mora na web), e corrigir a frase da spec na Task 5. O deploy continua
  necessário, mas só pela web.
- **B2. O retrato racha em toda derrota pela vida.** Hoje só a Exódia racha, e um teste diz "o fim pela vida não racha retrato nenhum". A
  cena pede a rachadura no golpe final. Parada, a mesa não sabe se a partida acabou pelo golpe comum, pelo Ataque Absoluto ou pelo Reflect
  (a `view` só diz "pela vida"), então rachar só no golpe final deixaria o retrato inteiro ao abrir a partida terminada. **Recomendo**
  rachar em toda derrota pela vida: no golpe final, no impacto; no Ataque Absoluto e no Reflect que matam (que ficam como estão), na faixa
  do fim, logo depois da cena deles. A W.O. e o abandono não racham.
- **B3. A cena dura 2,4 s, e não ~2,2 s.** O carimbo de todas as cenas fica 1,5 s na tela (`TITLE_MS`), e ele entra 260 ms depois do
  impacto, para a inversão e a vida que cai serem lidas antes. **Recomendo** os 2,4 s. A alternativa é um carimbo de 1,3 s só nesta cena,
  para dar 2,2 s.
- **B4. A inversão dura 600 ms, como em todas as cenas** (o protótipo usava 330 ms). Uma por cena, ≥ 300 ms, com a mesma trava. **Recomendo**
  a regra comum.
- **B5. A faixa do fim e o som de vitória ou derrota seguem depois da cena,** como depois da Exódia: do golpe ao painel são 2,4 s + 0,4 s.
  **Recomendo** manter (o painel do fim de hoje, sem mudança).
- **B6. A execução.** **Recomendo** aqui mesmo, tarefa por tarefa, na branch `feat/playtest-bloco-b`, teste primeiro, e no fim um revisor
  novo, num subagente, lendo a branch inteira (como no bloco A). A alternativa é um subagente por tarefa, com revisor a cada uma.

## Global Constraints

- **Fotossensibilidade** (spec da web §10.4): no máximo 1 inversão por cena, ≥ 300 ms; nunca mais de 3 trocas claro ↔ escuro em 1 s; com
  movimento reduzido, nenhuma inversão. Não afrouxe os limites para a cena passar.
- **Movimento reduzido:** sem inversão, tremor, voo do corte nem faíscas; as tarjas já no lugar; a fileira acende de uma vez; o corte e o
  carimbo aparecem e somem (esmaecimento) nos mesmos instantes; a vida e o retrato mudam no mesmo instante. A informação é a mesma.
- **Ritmo:** ≥ 50 quadros/s com a CPU 4× (`e2e/medir-cena.ts`); ≤ 60 partículas vivas; sem `drop-shadow`, `box-shadow` animado, `blur` nem
  `filter` animado (o brilho do corte e o halo das cartas são desenhados).
- **Telas:** 360 × 640 no celular e 1366 × 657 no PC baixo, sem rolar de lado.
- **Sem regra na interface:** o golpe final é lido dos eventos (`DamageDealt` seguido do `GameOver` pela vida, com o atacante vencedor); as
  cartas da fileira vêm da `view`. `RULES_VERSION`, `RULES_DIGESTS`, os snapshots golden, `STATE_SCHEMA`, `SCENE_MS` e `E2E_SEED` (vazia)
  não mudam.
- **Arte original** (§10.6): o corte, o halo, a rachadura e o carimbo são desenhados em código. **Números sem textura** (§10.7): o número do
  golpe é o `HitNumber`, na fonte de texto com `tabular-nums`.
- **O histórico continua** com todas as linhas; a cena e a faixa do fim não o substituem. A cena é `aria-hidden`.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip; a cena entra no chunk das cenas (`ui/scenes/`), com o painel simples de reserva
  enquanto ele não chega.
- **Testes:** em `test/ui`, todo arquivo é `.test.tsx`. O jsdom não tem layout: a posição se confere nas fotos da Task 5.
- **Contratos que ficam:** `data-cena`, o pulo por toque e Esc, o `data-sem-pulo`, o painel do fim que espera a mesa parar (`showEnd`), a
  dica do fim do tutorial dentro dele.

## Review Focus

1. **O golpe que mata dentro do Ataque Absoluto, ou devolvido pelo Reflect:** nenhuma cena de golpe final; a cena deles fica como está, e o
   retrato racha só na faixa do fim → testes das Tasks 1 e 2.
2. **A vida e o retrato antes do impacto:** na batida do golpe final, antes de `hitAt`, a vida é a de antes e o retrato está inteiro. O
   `exodiaStage` de hoje devolve "já rachou" quando a linha do tempo não tem Exódia: estender a derrota sem trocá-lo racharia no começo →
   teste da Task 2.
3. **O pulo no meio e a reconexão:** o toque leva a vida a 0, racha o retrato e libera o painel na hora; no `catchUp` não há cena (faixa), e
   o retrato já está rachado no fim → testes das Tasks 1 e 2.
4. **Celular em pé, com a fileira de Ataque de quem bate fora da janela:** os campos rolam até ela antes da medida, e o corte sai dela até o
   retrato → teste da Task 3 e E2E da Task 5.
5. **Movimento reduzido:** nenhuma inversão nem tremor, a fileira acende de uma vez, e o carimbo e o retrato chegam nos mesmos instantes →
   testes das Tasks 1 e 3.

---

### Task 1: A batida do golpe final

**Files:**
- Modify: `packages/web/src/model/scene-moments.ts`, `src/model/timeline.ts`, `src/model/copy.ts`, `src/model/effects.ts`
- Test: `packages/web/test/model/timeline.test.ts`, `test/model/effects.test.ts`

**Interfaces:**
- Produces:
  - `FinalBlowMoments { litUntil: number; cutAt: number; hitAt: number; titleAt: number; thudAt: number }` e
    `SCENE_MOMENTS.FINAL_BLOW = { litUntil: 330, cutAt: 490, hitAt: 640, titleAt: 900, thudAt: 1_040 }`.
  - `FINAL_BLOW_MS = 2_400` (`scene-moments.ts`; `titleAt + TITLE_MS`, B3). Fora do `SCENE_MS` do protocolo (B1).
  - `SceneKind` ganha `'FINAL_BLOW'`; `RARE_SCENE_MS.FINAL_BLOW = FINAL_BLOW_MS`; `SCENE_INVERT_LEAD_MS.FINAL_BLOW = hitAt`;
    `HIT_AT.FINAL_BLOW = hitAt`; `FIELD_SCENES` a inclui (sem cortina; o comentário do conjunto passa a dizer isso).
  - `SCENE_TITLE.FINAL_BLOW = 'GOLPE FINAL!'`, `FINAL_BLOW_LOSS_TITLE = 'DERROTA'` e `finalBlowTitle(attacker: PlayerId, me: PlayerId): string`
    (`copy.ts`).
  - `sceneText` do golpe final: o título de `finalBlowTitle(attacker, names.me)`; o detalhe "Você derrubou Bot" ou "Bot derrubou você".
  - `FinalBlowInfo { attacker: PlayerId; target: 'voce' | 'oponente'; cards: number }` e `finalBlowInfo(beat: Beat, view: PlayerView):
    FinalBlowInfo | null` (`effects.ts`): `cards` é o tamanho da fileira de Ataque de quem bate na `view`; `null` fora do `FINAL_BLOW`.

| ms | O que acontece |
|---|---|
| 0 | As tarjas descem abaixo do placar (260 ms); a fileira de Ataque de quem bate começa a acender |
| 0–330 | Cada carta da fileira acende (um halo de ouro desenhado, 120 ms), uma depois da outra, espaçadas por `litUntil / n` |
| 490 | O corte sai do meio da fileira e atravessa a mesa até o retrato do outro, em 150 ms, acelerando |
| 640 | O impacto: a inversão (600 ms), o tremor forte da mesa, 14 faíscas de ouro no retrato, o número do golpe, a vida desce em 700 ms, o retrato racha |
| 840 | O corte some em 400 ms |
| 900 | O carimbo cai (1,5 s, rotação de -4°): GOLPE FINAL! ou DERROTA |
| 1040 | O carimbo assenta: os campos afundam 5 px por 160 ms, com 12 respingos de tinta em volta dele |
| 2120 | As tarjas sobem (280 ms antes do fim, as de `SceneFrame`) |
| 2400 | Fim: a faixa do fim de hoje e depois o painel |

- [ ] **Step 1: Escrever os testes que falham** (`timeline.test`):
  - `[DamageDealt p1→p2 195, GameOver(HP, p1)]` ao vivo → a primeira batida é `scene` `FINAL_BLOW` de 2_400 ms, com `hit` nela mesma em
    `startMs + 640`, `absorbed: false`, e a inversão em `startMs + 640` por 600 ms; o `GameOver` segue `banner`;
  - o mesmo com o Bot batendo (`p2→p1`, vence `p2`) → `FINAL_BLOW` também;
  - com `ReactionWindowClosed` (quieta) antes e entre os dois → `FINAL_BLOW` (vale a batida não quieta mais perto antes do `GameOver`);
  - `[AbsoluteAttack p1, GuardBroken, DamageDealt p1→p2, GameOver(HP, p1)]` → a cena `ABSOLUTE_ATTACK` com o golpe absorvido, e nenhuma
    `FINAL_BLOW`;
  - `[ReflectTriggered (dano 136 em p1), GameOver(HP, p2)]` → só `REFLECT_TRIGGERED`;
  - `[DamageDealt, GameOver(EXODIA)]`, e um `DamageDealt` sem `GameOver` → nada vira `FINAL_BLOW`;
  - `catchUp` → nenhuma cena (`banner` e `damage` em velocidade dobrada, como hoje);
  - `decisionPending` → a cena não encolhe; `reducedMotion` → a mesma duração, `invert: null`;
  - `luminanceSwitches` da linha → 2 trocas; uma inversão anterior a menos de 2 s na mesma linha → a cena perde a dela (a regra de hoje).
  - `effects.test`: `finalBlowInfo` com você batendo (`target: 'oponente'`, `cards` = a sua fileira de Ataque) e com o Bot (`target: 'voce'`);
    `null` noutra batida; `sceneText` → `{ title: 'GOLPE FINAL!', detail: 'Você derrubou Bot' }` e `{ title: 'DERROTA', detail: 'Bot derrubou
    você' }`; `damageBeatIndex` aponta a batida do golpe final (o ataque que mata não muda as fileiras, então a conta delas não mexe).
  - `FINAL_BLOW_MS === SCENE_MOMENTS.FINAL_BLOW.titleAt + TITLE_MS`.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/timeline.test.ts test/model/effects.test.ts`
Expected: FAIL (`FINAL_BLOW` inexistente; o golpe segue `damage`).

- [ ] **Step 3: Implementar.** Em `buildTimeline`, depois do passo do Ataque Absoluto (que marca o absorvido) e só ao vivo: para cada
  `GameOver` com `reason: 'HP'`, a batida não quieta mais perto antes dele, se for um `DamageDealt` do vencedor e não absorvido, vira
  `scene` `FINAL_BLOW` (`uncapped`, `baseMs` de `RARE_SCENE_MS`, `hit` nela mesma com `atMs: 0`, como o Reflect).
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model`
Expected: PASS, sem mudar os testes antigos da linha do tempo.

- [ ] **Step 5: Commit**: `feat(web): a batida do golpe final (ponto 15)`, com o diário e o `estado.md` (regra 6).

### Task 2: O retrato que racha em toda derrota pela vida (B2)

**Files:**
- Modify: `packages/web/src/model/effects.ts`, `src/ui/anim/Stage.tsx`, `src/ui/table/FightHud.tsx`, `src/ui/anim/context.ts` (o comentário)
- Test: `packages/web/test/model/effects.test.ts`, `test/ui/table.test.tsx`, `test/ui/animation.test.tsx`

**Interfaces:**
- Consumes: `FINAL_BLOW` (Task 1).
- Produces: `defeatShown(beats: readonly Beat[], index: number, cracked: boolean): boolean` (`effects.ts`). Sem `GameOver` na linha →
  `true` (a partida acabou antes). Com ele, a batida fatal é a última antes dele com o evento `Exodia` ou a cena `FINAL_BLOW`: antes dela,
  `false`; depois, `true`; nela, `cracked` (no `catchUp`, sem cena, `true`). Sem batida fatal (o Ataque Absoluto e o Reflect que matam),
  racha a partir da batida do `GameOver`. `cracked` vem do `Stage`: na Exódia, `crackAt` (os timers de hoje); no golpe final, `hitLanded`.
  `anim.defeated(player, lost)` = `lost && (parado ? true : defeatShown(...))`.
- No `FightHud`: `lost` (para `defeated`) vale para `reason` `HP` ou `EXODIA` com outro vencedor; a vida a 0 e o `drained` seguem só da
  Exódia (na derrota pela vida a `view` já traz a vida, e a conta do `hit` a desce).

- [ ] **Step 1: Escrever os testes que falham**
  - `effects.test`, `defeatShown`: as batidas antes, na e depois da fatal, com `cracked` falso e verdadeiro; a Exódia no `catchUp`; o Ataque
    Absoluto que mata (racha só no `GameOver`); sem `GameOver` → `true`.
  - `table.test`: o teste "o fim pela vida não racha retrato nenhum" vira "o fim pela vida racha o retrato de quem perdeu" (o seu, com o Bot
    vencendo pela vida, e só ele); a W.O. (`FORFEIT`) não racha.
  - `animation.test`: no golpe final do Bot, antes de `hitAt` a sua vida é a de antes e o retrato está inteiro; depois de `hitAt`, racha, e
    a vida chega a 0 em `HIT_COUNT_MS`; o pulo no meio → rachado e 0 na hora, e a mesa libera; no Ataque Absoluto que mata, o retrato não racha
    antes do golpe absorvido acender.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/effects.test.ts test/ui/table.test.tsx test/ui/animation.test.tsx`
Expected: FAIL (`defeatShown` inexistente; o fim pela vida não racha).

- [ ] **Step 3: Implementar** `defeatShown` e trocar o `exodiaStage` do `Stage` por ele no `defeated`; o `drained` continua com a conta da
  Exódia. Atualizar o comentário de `defeated` no `context.ts`.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model test/ui`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): o retrato racha em toda derrota pela vida`, com o diário.

### Task 3: A cena

**Files:**
- Create: `packages/web/src/ui/scenes/FinalBlow.tsx`
- Modify: `src/ui/scenes/SceneFrame.tsx`, `src/ui/scenes/index.ts`, `src/ui/anim/scenes-loader.ts`, `src/ui/anim/Scene.tsx`,
  `src/ui/anim/Stage.tsx`
- Test: `packages/web/test/ui/scene-final-blow.test.tsx`, `test/ui/scene-frame.test.tsx`, `test/ui/animation.test.tsx`

**Interfaces:**
- Consumes: `SCENE_MOMENTS.FINAL_BLOW`, `FINAL_BLOW_MS`, `finalBlowInfo`, `finalBlowTitle` (Task 1).
- Produces:
  - `CinemaBars({ endMs, reduced }: { endMs: number; reduced: boolean })`, extraído de `SceneFrame` (as duas tarjas, a entrada de 260 ms e
    a saída 280 ms antes de `endMs`), que `SceneFrame` passa a usar; ela se posiciona na faixa dos campos (`box.band`), abaixo do placar.
  - `Stamp` ganha `text?: string` (sem ele, `SCENE_TITLE[kind]`).
  - `SceneProps.blow?: FinalBlowInfo | null` e `BeatOverlayProps.blow`, calculado pelo `Stage` (como o `rising`).
  - `data-golpe-final`, `data-acesa` (cada halo da fileira), `data-corte`, e o `data-carimbo="FINAL_BLOW"` do `Stamp`, para o teste e o E2E.

- [ ] **Step 1: Escrever os testes que falham** (`scene-final-blow.test`, com o padrão da `scene-resurrection.test`):
  - os halos sobre as `cards` primeiras vagas da fileira de Ataque de quem bate (medida por `box.row`), o i-ésimo em `i × litUntil / n`;
  - o `data-corte` em `cutAt`, saindo do meio da fileira e apontando para `box.portrait` do alvo (o ângulo e o comprimento no estilo);
  - o `HitNumber` com o dano em `hitAt` (com `hitLanded`), perto do retrato do alvo; o carimbo em `titleAt`, com "GOLPE FINAL!" quando você
    bate e "DERROTA" quando o Bot bate; nada antes da hora;
  - as tarjas presentes, e nenhuma cortina (`[data-cortina]` nunca `data-ativa` durante a cena, no `animation.test`);
  - pico de `[data-particula]` ≤ 60, e elas somem sozinhas;
  - reduzido: nenhum `[data-particula]`, todos os halos de uma vez, e o carimbo nos mesmos instantes;
  - no celular, a fileira fora da vista é rolada antes da medida (`revealRow` de quem bate, pelo `useMeasuredBox`);
  - `scene-frame.test`: o `SceneFrame` segue com as mesmas tarjas depois da extração.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/scene-final-blow.test.tsx test/ui/scene-frame.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** `FinalBlow.tsx` e o registro no `SCENES`. O corte é um elemento girado (`rotate` do ângulo entre os dois
  pontos, `scaleX` de 0 a 1 com origem na fileira), com a faixa do protótipo (tinta, vermelho, ouro e papel) e o brilho como uma faixa larga
  translúcida atrás, sem `drop-shadow`. As faíscas e os respingos usam `sparks` e `spawn` (`ui/anim/particles.ts`); o afundar dos campos,
  `shakeFrames` no `translate`. O carimbo fica no meio da faixa (`Stamp` com `top`).
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): a cena do golpe final`, com o diário.

### Task 4: O som

**Files:**
- Modify: `packages/web/src/model/sound.ts`, `src/sound/synth.ts`
- Test: `packages/web/test/model/sound.test.ts`, `test/model/synth.test.ts`

**Interfaces:**
- Produces: a pista `golpe-final`; `cueOf` a devolve para a batida de cena `FINAL_BLOW` (no lugar do `golpe-forte` do `DamageDealt`). A
  faixa do fim segue com `vitoria` ou `derrota` (B5).

- [ ] **Step 1: Escrever os testes que falham**: `cueOf` da batida `FINAL_BLOW` → `golpe-final`, dos dois lados; o `DamageDealt` comum segue
  `golpe-*`. `synth.test`: as vozes começam em `cutAt` (um sopro que sobe), `hitAt` (o baque grave com ruído) e `thudAt` (a batida do
  carimbo); a pista cabe em 2,4 s; nenhuma voz passa de metade da escala.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts test/model/synth.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**, com `tone` e `noise` nos instantes de `SCENE_MOMENTS.FINAL_BLOW`.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts test/model/synth.test.ts test/ui/sound.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): o som do golpe final`, com o diário.

### Task 5: E2E, fotos, medição e documentação

**Files:**
- Modify: `packages/web/e2e/scenes.spec.ts` (o comentário do topo e um `describe` novo)
- Create: `docs/memoria/notas/medicao-bloco-b.md`
- Modify: a spec do playtest §4 (a frase do `SCENE_MS`, B1, e "O que a execução decidiu"), `docs/memoria/estado.md`, `diario.md`

- [ ] **Step 1: Escrever o E2E**, nos dois tamanhos (1366 × 657 e 360 × 640), com as fixtures que já existem:
  - `especiais.json`, do passo 178 para o 179 (rodada 37): o seu golpe comum derruba o Bot (195 de dano). A cena `FINAL_BLOW` aparece, com as
    tarjas e sem cortina; o carimbo diz "GOLPE FINAL!"; a página recebe `data-invertido` uma vez; o retrato do Bot racha; nada rola de lado;
  - `absolutos.json`, do 99 para o 100 (rodada 21): o golpe comum do Bot derruba você (184). O carimbo diz "DERROTA" e o seu retrato racha;
  - um toque na mesa pula: a vida mostra 0 e o retrato está rachado na hora; sem erro no console.
- [ ] **Step 2: Rodar**

Run: `pnpm --filter @coringa/web build; pnpm --filter @coringa/web exec playwright test e2e/scenes.spec.ts`
Expected: PASS. Com o `wrangler dev` do autor na 8787, usar outra porta só nessa execução.

- [ ] **Step 3: Fotos e medição** com o `e2e/medir-cena.ts` (o uso está no começo dele; o painel do app pode estar escondido e dar fotos
  velhas): as duas fixtures, nos dois tamanhos, em 300, 640, 1_040 e 2_000 ms; com a CPU 4×, a meta é ≥ 50 quadros/s e ≤ 60 partículas.
  Registrar em `notas/medicao-bloco-b.md`. Conferir nas fotos: o corte chega ao retrato no celular em pé, o carimbo cabe a 360 px, e as
  tarjas não cobrem o placar.
- [ ] **Step 4: Documentar** a spec §4 (B1 e o que a execução decidiu), o `diario.md` com cada escolha e o `estado.md` com o próximo passo.
- [ ] **Step 5: Portão**

Run: `pnpm check`
Expected: verde. Depois, o push da branch, as duas CI verdes (`check` e `e2e`), a revisão da branch inteira e o fast-forward na `main`. O
autor joga; o online só depois do `pnpm deploy:server` dele.

## Para quem executa (escolhas deixadas a você)

Os ajustes finos de cor, as sementes das partículas, a curva do corte e o desenho do carimbo da derrota (a sugestão: fundo de tinta, letra de
papel e sombra vermelha, sem o ouro, que é da vitória e dos Absolutos). Ajustes de até ~15% nos tempos são do construtor, mantendo
`FINAL_BLOW_MS = titleAt + TITLE_MS`.
