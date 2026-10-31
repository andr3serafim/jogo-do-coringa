# Sub-projeto 6, fatia 1: a base (placar de luta, espada, golpe, mesa viva, folga de cena e sons) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** levar à mesa a base aprovada da direção visual: o placar de jogo de luta no topo, a espada da iniciativa com a fita de
cordel, o golpe comum com peso, a mesa viva (grão, cartas que respiram e inclinam, quadra marcada), o relógio que para durante as
cenas raras e os sons dessas peças.

**Architecture:** a folga de cena é uma tabela única em `@coringa/protocol` (lida pelo núcleo do servidor, que estende o prazo, e
pela linha do tempo da web); o prazo ganha `runsFrom`, e o `RoomClient` segura o relógio até lá. Na web, um componente novo
(`FightHud`) concentra retratos, vidas, relógio e espada; o `PlayerField` e a `CenterBand` perdem o que foi para ele; os efeitos do
golpe e a fita saem do modelo puro (`model/effects.ts`, `model/copy.ts`) e são desenhados em `ui/anim`.

**Tech Stack:** TypeScript (Node 24, type stripping), React 19 + `motion` + Tailwind 4 na web, Vitest, Playwright, Web Audio.

**Spec:** `docs/superpowers/specs/2026-10-31-direcao-visual-design.md` (aprovada, `decisoes.md` 2026-10-31 (11) a (13)); protótipo
de referência ao lado (`2026-10-31-direcao-visual-prototipo.html`).

## Global Constraints

- Branch própria (`feat/direcao-visual-fatia-1`, a partir da `feat/direcao-visual` ou da `main` depois do merge dela); `pnpm check`
  no pre-push; `pnpm e2e` e as duas CI verdes antes do fast-forward. Nunca `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- Fotossensibilidade (spec da web §10.4, spec 6 §1): nenhuma peça desta fatia cria transição claro ↔ escuro de tela; o tremor é
  deslocamento, não luz. Com movimento reduzido: sem tremor, sem voo da espada, sem respirar, sem inclinar, sem brilho da quadra.
- Números de jogo (vida, dano, relógio, placar de dano) em Archivo com `tabular-nums`, nunca em Alfa Slab One nem com textura.
- Sem regra na interface: iniciativa, dano, quadra e prazo vêm do motor e do servidor.
- JavaScript inicial ≤ 200 KB gzip (o smoke da web confere).
- Textos em pt-BR; identificadores em inglês; imports relativos com `.ts`/`.tsx` como o resto do pacote.
- `RULES_VERSION` e `STATE_SCHEMA` não mudam (o campo novo do servidor é opcional; estado antigo continua servindo).
- `E2E_SEED` fica vazia; deploy é do autor.
- Contratos que os testes de hoje usam e que ficam: `role="meter"` com nome "Vida de André" (e ", novo"), o número com `data-hp`,
  a marca da iniciativa com `data-iniciativa="voce" | "oponente"`, a região "Situação da rodada" (agora sem relógio, rodada e
  iniciativa).

## Review Focus

1. **Cena no meio do próprio turno** (Defesa Absoluta jogada no turno, sem troca de fase): o prazo tem de crescer pela folga e o
   relógio ficar parado durante a cena → teste "folga de cena na mesma fase" (Task 1).
2. **Reconexão no meio da folga** (`catchUp` com `runsFrom` no futuro ou já vencido): o tempo mostrado nunca passa do tempo da
   decisão e nunca fica negativo → testes de `remainingMs` com `runsFrom` (Task 1).
3. **Celular de 360 px com vidas de 3 dígitos** (800/800 contra 8/800): o placar cabe sem rolar de lado → E2E móvel (Task 7).
4. **Movimento reduzido**: nada treme, a espada pula sem voar, a mão não respira → testes da Task 3, 4 e 5.
5. **Replay e tutorial** usam a mesma mesa: sem prazo, a placa mostra a rodada grande; a espada aparece no dono → teste do replay
   (Task 2).

---

### Task 1: Folga de cena (o relógio para durante as cenas raras)

**Files:**
- Create: `packages/protocol/src/scenes.ts`; Modify: `packages/protocol/src/index.ts`, `packages/protocol/src/messages.ts`
  (`Deadline`), `packages/protocol/src/client.ts` (`remainingMs`)
- Modify: `packages/server/src/core/types.ts` (o jogo da sala), `packages/server/src/core/timing.ts`, `packages/server/src/core/views.ts`
- Modify: `packages/web/src/model/timeline.ts` (`RARE_SCENE_MS` e `BEAT_MS.scene` vêm da tabela)
- Test: `packages/protocol/test/scenes.test.ts` (novo), `packages/protocol/test/client.test.ts`,
  `packages/server/test/core/timers.test.ts`, `packages/web/test/model/timeline.test.ts`

**Interfaces:**
- Produces (`@coringa/protocol`):
  - `SCENE_MS: Readonly<Partial<Record<GameEvent['type'], number>>>` com os valores de hoje (as cenas desta fatia ainda são as
    antigas; cada fatia seguinte atualiza o valor da sua): `{ Exodia: 4_200, AbsoluteAttack: 3_000, AbsoluteDefenseStarted: 3_000,
    DevastationCast: 3_000, ReflectPlayed: 1_500, ReflectTriggered: 1_500 }`.
  - `SCENE_ALLOWANCE_CAP_MS = 8_000`.
  - `sceneAllowanceMs(events: readonly { type: string }[]): number` — soma `SCENE_MS` dos eventos, até o teto.
  - `Deadline.runsFrom?: number` — instante (relógio do servidor) em que o relógio começa a correr; antes dele, o tempo mostrado
    fica parado.
- Produces (servidor): `RoomGame.clockRunsFrom?: number | null` (opcional: registro antigo sem o campo vale `null`).

- [ ] **Step 1: Testes que falham**
  - `scenes.test.ts`: `sceneAllowanceMs([{ type: 'AbsoluteAttack' }])` é `3_000`; `[{ type: 'DamageDealt' }]` é `0`;
    `[{ type: 'ReflectTriggered' }, { type: 'DevastationCast' }]` é `4_500`; seis `Exodia` somam no máximo `8_000`.
  - `client.test.ts`: com o relógio do servidor em `t`, `remainingMs({ kind: 'TURN', at: t + 33_000, players: [], runsFrom: t + 3_000 })`
    é `30_000` em `t` e em `t + 2_000`, e `29_000` em `t + 4_000`; com `runsFrom` no passado vale o de hoje (`at − agora`); nunca
    negativo.
  - `timers.test.ts`, describe "folga de cena (sub-projeto 6 §9)":
    - "ataque com 4 J: o turno seguinte começa com 30 s mais a folga do Ataque Absoluto" — `deadline.at − serverNow` é
      `TIMERS.turnMs + SCENE_MS.AbsoluteAttack` e `deadline.runsFrom` é `serverNow + SCENE_MS.AbsoluteAttack`;
    - "folga de cena na mesma fase" — o 4º Q jogado no próprio turno (`AbsoluteDefenseStarted`, sem troca de fase) estende o prazo
      que já existia em `SCENE_MS.AbsoluteDefenseStarted`, a época não muda, e o alarme da agenda acompanha (o `TIMEOUT` só vem
      no prazo novo mais `graceMs`);
    - "passo sem cena não ganha folga" — o prazo de um ataque comum segue `TIMERS.turnMs` e sem `runsFrom`.
  - `timeline.test.ts`: `RARE_SCENE_MS.EXODIA === SCENE_MS.Exodia` (e os outros três) e `BEAT_MS.scene === SCENE_MS.ReflectPlayed`.

- [ ] **Step 2: Rodar e ver falhar**
  Run: `pnpm --filter @coringa/protocol exec vitest run test/scenes.test.ts test/client.test.ts` e
  `pnpm --filter @coringa/server exec vitest run test/core/timers.test.ts` e
  `pnpm --filter @coringa/web exec vitest run test/model/timeline.test.ts`
  Expected: FAIL (`sceneAllowanceMs` não existe; prazos sem folga; tabela da web solta).

- [ ] **Step 3: Implementar**
  - `scenes.ts` (com `import type { GameEvent } from '@coringa/engine'`), exportado em `index.ts`. Fica fora de `schemas`.
  - `schedulePhase` calcula `allowance = sceneAllowanceMs(events)` antes do retorno antecipado. Mesma fase com `allowance > 0` e
    prazo: `phaseDeadlineAt += allowance`, `clockRunsFrom = max(now, clockRunsFrom ?? now) + allowance`, e o item `phase` da
    agenda é trocado pelo do prazo novo (mesma época). Fase nova: `durationMs += allowance` e `clockRunsFrom = allowance > 0 ?
    now + allowance : null`. `GAME_OVER` zera os dois.
  - `stateFor` põe `runsFrom` no prazo quando `clockRunsFrom` é maior que `now`.
  - `remainingMs`: `max(0, at − max(agoraNoServidor, runsFrom ?? −∞))`.
  - **Desvio deliberado da spec §9** ("começa a correr quando ela acaba ou é pulada"): o relógio fica parado até `runsFrom` mesmo
    com a cena pulada. O prazo do servidor não encurta com o pulo, então correr antes mostraria menos tempo do que o jogador tem.
  - `timeline.ts` monta `RARE_SCENE_MS` e `BEAT_MS.scene` a partir de `SCENE_MS`.

- [ ] **Step 4: Rodar e ver passar** (os mesmos três comandos) — Expected: PASS, e os testes antigos de prazo seguem verdes.

- [ ] **Step 5: Commit** — `feat(servidor): o relógio para durante as cenas raras (folga de cena, sub-projeto 6 §9)`

---

### Task 2: O placar de luta no topo

**Files:**
- Create: `packages/web/src/ui/table/FightHud.tsx`
- Modify: `packages/web/src/ui/table/Table.tsx` (o placar acima dos campos; `useClock` sobe para cá), `PlayerField.tsx` (o
  `Info` perde avatar, apelido, número e barra de vida, e fica com a mão do oponente, "fora da sala", o Equipar e a ferramenta),
  `CenterBand.tsx` (perde a rodada, o relógio e a iniciativa; fica com a linha da fase, o texto do treino/replay/tutorial, a região
  viva, o monte e o cemitério), `labels.ts`, `packages/web/src/styles.css` (o arranjo novo de `.campo-info` e o do placar)
- Test: `packages/web/test/ui/table.test.tsx`, `phases.test.tsx`, `animation.test.tsx`, `replay-screen.test.tsx`,
  `table-hint.test.tsx`, `training.test.tsx`, `tutorial.test.tsx`, `end-and-menu.test.tsx` (os que procuravam relógio, rodada ou
  iniciativa na faixa passam a procurar no placar)

**Interfaces:**
- Consumes: `Deadline.runsFrom` (Task 1, via `remainingMs`), `useClock` e `ClockFace` de hoje.
- Produces:
  - `FightHud(props: { view: PlayerView; names: { self: string; opponent: string }; face: ClockFace | null; deadline: Deadline |
    null; children?: ReactNode })` — `section` com `aria-label="Placar"`; à esquerda você, à direita o oponente; cada lado com o
    retrato (`data-retrato="voce" | "oponente"`, e `data-dono` no de quem tem a iniciativa), o apelido (com "(você)" como hoje), a
    barra (`role="meter"`, os mesmos nomes de hoje) e o número (`data-hp`, contado com `useCountedNumber`), com a marca "novo" da
    vida (`NovoChip`, as zonas `selfHp`/`opponentHp` e o `onSeen` de hoje, que saem do `Info`); no meio, a placa:
    `h2` "Rodada N", o relógio (`ClockBlock` que sai da `CenterBand`) ou, sem prazo, o número da rodada grande, a fase curta
    ("ATAQUE", "EQUIPAR", "ORDEM") e, no Ataque, o placar de dano da iniciativa (`data-placar-iniciativa`, "37 × 0": você × o
    oponente). O som de urgência do relógio sai da `CenterBand` e vem para cá.
  - `HpBar({ hp, max, side })` (no mesmo arquivo): preenchimento ouro que encolhe na direção do retrato; rastro vermelho
    (`data-rastro`) que fica no valor anterior e escorre até o novo 450 ms depois, em 600 ms; com movimento reduzido, sem rastro.
  - `CenterBand` recebe `live` (de `useClock`) em vez de `deadline`/`remainingMs`/`pausedTurnMs`/`turn`.

- [ ] **Step 1: Testes que falham** (em `table.test.tsx`, describe "mesa: o placar de luta (sub-projeto 6 §3)")
  - "o placar mostra os dois lados, você à esquerda": `within(placar).getAllByRole('meter')` na ordem André, Duda; os `data-hp` com
    as vidas da `view`; `data-retrato="voce"` vem antes de `data-retrato="oponente"` no DOM.
  - "os campos não têm mais vida nem apelido": `within(region('Seu campo')).queryByRole('meter')` é `null`.
  - "o relógio mora no placar; sem prazo, a rodada grande": com prazo, `within(placar).getByRole('timer')` (o papel que o
    `ClockBlock` já usa) e a faixa sem ele; sem prazo, `within(placar).getByText('7')` com `data-rodada-grande`.
  - "o placar de dano da iniciativa só no Ataque": `data-placar-iniciativa` com "37 × 0" no `ATTACK_MAIN` e ausente no Equipar.
  - "o rastro fica no valor velho e escorre": depois da batida do dano, `data-rastro` com a largura velha e, avançando 1,1 s, a
    nova; com movimento reduzido, sem `data-rastro`.
  - `replay-screen.test.tsx`: "o replay mostra o placar sem relógio e a espada no dono".
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/web exec vitest run test/ui/table.test.tsx test/ui/replay-screen.test.tsx`; Expected: FAIL.
- [ ] **Step 3: Implementar** o `FightHud`, a poda do `PlayerField` e da `CenterBand`, e o CSS. Tamanhos de partida: PC ~96 px
  de altura (retrato 76, barra 26 × 310); celular ≤ 64 px (retrato ~40, barras ~110, placa ~56), sem rolagem de lado a 360 px.
  O `DamageNumber` e o `ShieldBreak` passam a ser desenhados no retrato do placar. Ajustar os testes da lista acima ao endereço
  novo (o comportamento não muda).
- [ ] **Step 4: Rodar e ver passar** — `pnpm --filter @coringa/web exec vitest run`; Expected: PASS em todos.
- [ ] **Step 5: Commit** — `feat(web): o placar de luta no topo (sub-projeto 6 §3)`

---

### Task 3: A espada da iniciativa e a fita de cordel

**Files:**
- Create: `packages/web/src/ui/table/InitiativeSword.tsx`
- Modify: `packages/web/src/ui/table/FightHud.tsx` (a espada no retrato do dono), `packages/web/src/model/copy.ts`
  (`initiativeRibbon`), `packages/web/src/model/effects.ts` (`bannerRibbon`), `packages/web/src/ui/anim/Scene.tsx` (`BannerLayer`
  vira a fita), `packages/web/src/ui/anim/Stage.tsx` (o tempo de leitura usa a fita), `CenterBand.tsx` (o `InitiativeMark` sai)
- Test: `packages/web/test/model/effects.test.ts`, `packages/web/test/ui/animation.test.tsx`, `packages/web/test/ui/table.test.tsx`

**Interfaces:**
- Consumes: `INITIATIVE_ID` e o atraso da batida em `effects.ts` (o mesmo mecanismo do losango de hoje).
- Produces:
  - `interface Ribbon { title: string; reason: string | null }`.
  - `initiativeRibbon(event: Extract<GameEvent, { type: 'InitiativeDecided' }>, names: Names): Ribbon`:
    - mudou para você: `{ title: 'Você ataca primeiro', reason: 'causou mais dano na rodada · 50 × 37' }` (o seu dano primeiro);
    - mudou para o outro: `{ title: 'Duda ataca primeiro', reason: 'causou mais dano na rodada · 50 × 37' }` (o dele primeiro);
    - não mudou: `'Você segue atacando primeiro'` / `'Duda segue atacando primeiro'`, com o mesmo motivo;
    - empate: o título de "não mudou" e `reason: 'empate em dano · 40 × 40'`.
  - `bannerRibbon(event: GameEvent, names: Names): Ribbon | null` — `InitiativeDecided` usa `initiativeRibbon`; os outros,
    `{ title: bannerText(...), reason: null }`.
  - `InitiativeSword({ holder, delayMs, reduced }: { holder: 'voce' | 'oponente'; delayMs: number; reduced: boolean })` —
    `data-iniciativa={holder}` e `data-espada`; cruzada no canto do retrato do dono, ponta para o oponente; lampejo a cada 3,4 s.
    Na troca: sobe, gira duas voltas num arco que passa pelo meio da mesa, com rastro, e crava no outro retrato em ~850 ms,
    soltando faíscas; com `reduced`, pula sem voo. Na batida que não muda: salto curto e brilho no mesmo retrato.
  - `BannerLayer` desenha a fita (papel, pontas recortadas, borda de tinta; título em Alfa maiúsculo, motivo em Archivo menor),
    com `data-fita` e `data-faixa` = título e, se houver, `" · "` e o motivo. Vale para todas as faixas (spec 6 §4).

- [ ] **Step 1: Testes que falham**
  - `effects.test.ts`: os quatro casos de `initiativeRibbon` acima, com os valores exatos; `bannerRibbon` de um `CardStolen` tem
    `reason: null` e o título de hoje.
  - `animation.test.tsx`: "a espada troca de retrato na batida da iniciativa" (`[data-iniciativa]` de `voce` para `oponente` só
    quando a batida toca; o retrato novo ganha `data-dono`); "com movimento reduzido a espada pula sem voo" (nenhuma animação de
    trajetória: o elemento não tem `data-voando`); "a fita diz quem ataca primeiro e por quê" (`data-faixa` igual a
    `Duda ataca primeiro · causou mais dano na rodada · 9 × 3`).
  - `table.test.tsx`: "a faixa do meio não tem mais a iniciativa" (`within(band).queryByText('Iniciativa')` é `null`).
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/web exec vitest run test/model/effects.test.ts test/ui/animation.test.tsx test/ui/table.test.tsx`; Expected: FAIL.
- [ ] **Step 3: Implementar.** O tempo segurado da batida continua `INITIATIVE_BANNER_MS` (1,2 s). Atualizar os textos esperados
  dos testes que liam a faixa antiga da iniciativa.
- [ ] **Step 4: Rodar e ver passar** — o mesmo comando; Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): a espada da iniciativa e a fita de cordel (sub-projeto 6 §4)`

---

### Task 4: O golpe comum com peso

**Files:**
- Create: `packages/web/src/model/impact.ts`
- Modify: `packages/web/src/model/sound.ts` (`strikeCue` usa `impactForce`), `packages/web/src/model/effects.ts` (`impact` nos
  efeitos), `packages/web/src/ui/anim/Stage.tsx` (o tremor), `packages/web/src/ui/anim/Effects.tsx` (`InkSplat`; o `DamageNumber`
  carimbado), `FightHud.tsx` (os respingos no retrato de quem apanhou)
- Test: `packages/web/test/model/effects.test.ts`, `packages/web/test/model/sound.test.ts`, `packages/web/test/ui/animation.test.tsx`

**Interfaces:**
- Produces:
  - `impactForce(damage: number): 'leve' | 'medio' | 'forte' | null` — as faixas de hoje (`DAMAGE_BANDS`: médio a partir de 40,
    forte a partir de 100; zero é `null`). `DAMAGE_BANDS` muda para `impact.ts` e o `sound.ts` o importa de lá.
  - `BeatEffects.impact: { target: PlayerId; force: 'leve' | 'medio' | 'forte' } | null` — no `DamageDealt`, no `StealDamage` e
    no `ReflectTriggered` com dano > 0.
  - `SHAKE_PX = { leve: 3, medio: 4, forte: 6 }` e o tremor de 200 ms (260 ms no forte), em `Stage.tsx`, marcado com
    `data-tremor` enquanto dura; nada com movimento reduzido.
  - `InkSplat({ force, reduced })`: 5 (leve), 7 (médio) ou 10 (forte) pingos de tinta que saem do retrato e caem; nada com
    `reduced`.
  - `DamageNumber`: entra carimbado (escala 2,4 → 0,92 → 1, girado −8° → −3°) e sobe; com `reduced`, só esmaece.

- [ ] **Step 1: Testes que falham**
  - `effects.test.ts`: `DamageDealt` de 37 → `impact: { target, force: 'leve' }`; de 154 → `'forte'`; de 0 → `impact: null`.
  - `sound.test.ts`: as pistas do golpe seguem as mesmas de hoje (40 → `golpe-medio`, 100 → `golpe-forte`).
  - `animation.test.tsx`: "o golpe treme a mesa e respinga no retrato de quem apanhou" (`data-tremor` durante a batida;
    `[data-respingo]` dentro do retrato do oponente); "com movimento reduzido, nem tremor nem respingo".
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/web exec vitest run test/model/effects.test.ts test/model/sound.test.ts test/ui/animation.test.tsx`; Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — o mesmo comando; Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): o golpe comum com peso (sub-projeto 6 §5)`

---

### Task 5: A mesa viva (grão, mão que respira, quadra marcada)

**Files:**
- Modify: `packages/web/src/styles.css` (o grão dos campos mais forte: opacidade ~0,45 em `multiply`, como o protótipo; as
  keyframes `respira` e `brilho-quadra`), `packages/web/src/ui/table/Hand.tsx` (respirar, inclinar, levantar no toque),
  `packages/web/src/ui/cards/Card.tsx` (a face da quadra)
- Test: `packages/web/test/ui/table.test.tsx`, `packages/web/test/ui/card-drag.test.tsx`

**Interfaces:**
- Produces:
  - Cada carta da mão com `data-respira` (ciclo de 3,6 s, cada uma com atraso de −0,9 s × índice) quando não há movimento
    reduzido.
  - Inclinação 3D sob o ponteiro de mouse (até 13°, sombra acompanhando), nunca durante um arrasto; no toque, a carta tocada
    sobe ~8 px e inclina até 6° para o lado do dedo enquanto o dedo está nela.
  - Carta de quadra (`data-quad`): moldura de ouro (anel de 2 px por fora da borda), fundo dourado claro, um losango de ouro no
    canto de baixo e um brilho que passa a cada 3,2 s (sem brilho com movimento reduzido). O "+V" do total continua.

- [ ] **Step 1: Testes que falham**
  - `table.test.tsx`: "as cartas da mão respiram; com movimento reduzido, não" (`data-respira` presente/ausente);
    "a carta da quadra tem o losango e o brilho" (`[data-quad] [data-losango]` e `[data-brilho-quadra]`; sem o brilho com
    movimento reduzido).
  - `card-drag.test.tsx`: "inclinar não atrapalha o arrasto" (durante o arrasto a carta não tem `transform` de inclinação; o
    fantasma continua um só).
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/web exec vitest run test/ui/table.test.tsx test/ui/card-drag.test.tsx`; Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — o mesmo comando; Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): a mesa viva — grão, mão que respira e quadra marcada (sub-projeto 6 §6)`

---

### Task 6: Os sons da fatia

**Files:**
- Modify: `packages/web/src/model/sound.ts` (pistas novas no `Cue` e no `cueOf`), `packages/web/src/sound/synth.ts` (as receitas)
- Test: `packages/web/test/model/sound.test.ts`, `packages/web/test/model/synth.test.ts`

**Interfaces:**
- Produces: `Cue` ganha `'espada' | 'fita' | 'quadra'`.
  - `cueOf`: `InitiativeDecided` com `changed` → `'espada'`; sem → `'fita'`; `QuadFormed` → `'quadra'`.
  - Receitas (sintetizador de hoje, sem arquivo): `espada` = zunido de ruído em passa-faixa subindo de 400 a 2 200 Hz por 0,45 s
    e, aos 0,8 s, um tinido (1 318 e 1 976 Hz, 0,25 s); `fita` = estalo de papel (ruído passa-altas a 2 500 Hz, 60 ms, e um
    segundo de 40 ms 50 ms depois); `quadra` = acorde curto (523, 659 e 784 Hz em onda triangular, 40 ms entre as vozes, 0,5 s).

- [ ] **Step 1: Testes que falham** — `sound.test.ts`: as três associações acima; `synth.test.ts`: toda `Cue` tem receita (o teste
  que já percorre as pistas pega as novas).
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/web exec vitest run test/model/sound.test.ts test/model/synth.test.ts`; Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar e ver passar** — o mesmo comando; Expected: PASS.
- [ ] **Step 5: Commit** — `feat(web): os sons da espada, da fita e da quadra (sub-projeto 6 §10)`

---

### Task 7: E2E, specs, conferência na tela e merge

**Files:**
- Modify: `packages/web/e2e/*.spec.ts` e `e2e/helpers.ts` (o que procurava relógio, rodada ou iniciativa na faixa passa a procurar
  na região "Placar"); `docs/superpowers/specs/2026-10-17-interface-web-design.md` (§3 e §10: nota apontando para a spec 6);
  `docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (§6.2: nota da folga de cena); a spec 6 (§14: fatia 1
  entregue); `docs/memoria/estado.md` e `diario.md`
- Test: `packages/web/e2e/mobile.spec.ts`, `layout.spec.ts`

- [ ] **Step 1: E2E que falha** — em `mobile.spec.ts`, "o placar cabe a 360, 390 e 430 px com vidas de 3 dígitos, sem rolar de
  lado" (a página sem rolagem horizontal; as duas barras e o relógio dentro da viewport; altura do placar ≤ 64 px).
- [ ] **Step 2: Rodar e ver falhar** — `pnpm e2e`; Expected: FAIL nos seletores que mudaram e no teste novo.
- [ ] **Step 3: Ajustar os seletores e o CSS** até o E2E passar inteiro.
- [ ] **Step 4: Conferir na tela** (`pnpm dev:web`, treino `?nivel=medio`), no PC (1536 × 695) e a 375 px: o placar, a espada
  trocando de retrato, a fita, o golpe tremendo, a mão respirando, a quadra marcada, e com o menu em movimento reduzido. Medir
  as batidas do golpe e da espada no Chromium com CPU 4× mais lenta (≥ 50 quadros por segundo; registrar no `diario.md`).
- [ ] **Step 5: `pnpm check` e `pnpm e2e` verdes; push; as duas CI verdes; fast-forward da `main`; memória com "nada em curso"
  e o próximo passo (a fatia 2).**
