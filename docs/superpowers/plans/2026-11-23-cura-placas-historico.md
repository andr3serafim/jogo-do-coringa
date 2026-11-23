# A cura que se vê, as placas só com a figura e o histórico legível: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a cura passiva e a do Roubo viram uma animação com som (a carta vira vida e sobe até a barra, o carimbo com o bruto e a conta),
as marcas do Coringa viram figuras com dica, e a lista de partidas fica legível no tema verde com vitória e derrota em cor.

**Architecture:** o motor não muda. O protocolo ganha a folga da cura (`HEAL_MS`) na conta do relógio que o servidor, a web e o Bot do
treino já leem. Na web, a linha do tempo dá ao `Healed` uma batida própria (`kind: 'heal'`, sem teto), os efeitos levam o bruto, o
líquido, a conta e a origem, e uma camada nova no `Stage` (`HealLayer`) desenha o brilho, a gota, as faíscas e o carimbo, que vive além
da batida. As placas viram um componente de figura com dica num portal.

**Tech Stack:** TypeScript (Node 24 puro nos pacotes; Vite, React 19, Tailwind 4 e Motion na web), Vitest, Playwright, Web Audio.

**Spec:** `docs/superpowers/specs/2026-11-23-cura-placas-historico-design.md` (aprovada, `decisoes.md` 2026-11-23 (10)). Protótipo:
`docs/superpowers/specs/2026-11-23-cura-direcoes/prototipo.html` (a direção A).

## Global Constraints

- Imports relativos terminam em `.ts`/`.tsx`; só sintaxe apagável; `import type` para tipos; nada de `@coringa/protocol/schemas` nem `node:*` em `packages/web/src`.
- Sem regra na interface: o bruto da cura passiva sai de `defenseHealOf` (motor); o do Roubo, do `value` do `StealDamage` do mesmo passo.
- Animação só com `transform` e `opacity`; nada de `filter` nem sombra com desfoque; nenhum flash de tela.
- Movimento reduzido: nada voa nem pisca; o carimbo e o verde só aparecem (esmaecer de 200 ms) no instante da chegada.
- Números de jogo (o carimbo, a vida) na fonte de texto com `tabular-nums`, sem textura.
- Textos do jogo em pt-BR; identificadores em inglês.
- `HEAL_MS = 1_400`; os instantes da batida: brilho 420 ms, a gota sai a 120 ms e voa 640 ms, a chegada a 760 ms, a conta da vida 520 ms, o brilho da barra 620 ms, as faíscas 520 ms; o carimbo fica 1.200 ms depois do fim da batida e sai em 300 ms.
- O carimbo: o bruto em cima ("+28"), a conta embaixo ("7♥ × 4"; com o multiplicador 1, só "7♥"); PC ~40 px, celular ~22 px; papel sobre `--color-cura`, contorno de tinta, sombra dura.
- Sem `RULES_VERSION`, sem `STATE_SCHEMA`, sem mexer nas partidas de referência.
- Nunca `--no-verify`. `pnpm check` antes de cada commit de código (o pre-commit roda a versão rápida); `pnpm e2e` no fim.
- A memória (`docs/memoria/estado.md`, `diario.md`) é atualizada e commitada depois de cada tarefa e antes de cada job longo (regra do `CLAUDE.md`).

## Review Focus

1. **A cura do oponente:** espelhada, o carimbo sob a barra dele, sem cobrir o centro do placar nem o botão do menu da partida no celular. (Tarefa 6, teste de lado; Tarefa 9, foto.)
2. **Duas curas no mesmo passo** (a troca do Equipar ou da Ressurreição, mais a cura passiva): duas batidas seguidas, duas folgas, e o segundo carimbo substitui o primeiro. (Tarefas 2, 4 e 6.)
3. **O pulo no meio da cura** (toque na mesa ou Esc): a gota, as faíscas e o carimbo somem, e a vida fica no valor final. (Tarefa 6.)
4. **A cura e o fim da partida** (o golpe final ou a Exódia logo depois): o carimbo some quando a cena ou o `GAME_OVER` entram. (Tarefa 6.)
5. **A vida já cheia** (o líquido 0): a cura toca, o carimbo mostra o bruto, a barra e o número não se mexem, e essa batida não vira a "batida do dano" da contagem dos totais. (Tarefas 4 e 5.)

---

### Tarefa 1: O histórico e as telas do menu legíveis no verde, com o resultado em cor

**Files:**
- Modify: `packages/web/src/ui/screens/PastGames.tsx` (o `Row`)
- Modify: `packages/web/src/ui/screens/Lobby.tsx:143,157,172`
- Modify: `packages/web/src/ui/menu/menu.css` (as regras da linha da partida)
- Modify: `packages/web/src/model/past-games-copy.ts` (a função do resultado)
- Test: `packages/web/test/ui/past-games.test.tsx` (existente; acrescenta), `packages/web/e2e/menu-verde.spec.ts` (novo), `packages/web/e2e/online.spec.ts` (a Duda no verde)

**Interfaces:**
- Produces: `pastGameResultKind(outcome: StoredOutcome, seat: PlayerId): 'vitoria' | 'derrota' | 'neutro'` em `past-games-copy.ts`; a linha ganha `data-resultado` com esse valor.

- [ ] **Step 1: Teste da função e da linha**

```ts
it('o resultado vira o tom da linha: vitória, derrota e neutro', () => {
  expect(pastGameResultKind(win('p1'), 'p1')).toBe('vitoria');
  expect(pastGameResultKind(win('p2'), 'p1')).toBe('derrota');
  expect(pastGameResultKind(draw(), 'p1')).toBe('neutro');
  expect(pastGameResultKind({ ...draw(), result: null }, 'p1')).toBe('neutro');
});
it('cada linha tem a cor do texto da tinta e o data-resultado', () => {
  // render <PastGames> com uma vitória e uma derrota guardadas
  const rows = screen.getAllByRole('listitem');
  expect(rows.map((r) => r.getAttribute('data-resultado'))).toEqual(['vitoria', 'derrota']);
  for (const r of rows) expect(r.className).toContain('text-tinta');
});
```

- [ ] **Step 2: Rodar e ver falhar:** `pnpm --filter @coringa/web exec vitest run test/ui/past-games.test.tsx` → FAIL (`pastGameResultKind` não existe).
- [ ] **Step 3: Implementar** `pastGameResultKind`; no `Row`, `text-tinta`, a classe `partida-linha` e `data-resultado`; no Lobby, `text-tinta` nas linhas 143, 157 e 172. No `menu.css`, a opção 1 · Faixa (o `historico-fotos.mjs` da pasta do protótipo tem o CSS de referência), com estas cores: a faixa de 10 px em `--color-cura` / `--color-vermelho`; o degradê de 18 % da cor para o papel até 60 % da largura; a palavra do resultado em `#1f5c2c` (vitória) e `#9a1f16` (derrota), que passam de 4,5:1 sobre o degradê (≈5,6 e 5,4); `neutro` sem faixa nem degradê.
- [ ] **Step 4: E2E no verde** (`e2e/menu-verde.spec.ts`): grava `coringa:prefs = {"menuTheme":"green"}` e três partidas (vitória, derrota, empate) no `addInitScript`; roda `axe(page)` (o helper já checa o contraste) em `/`, `/jogar`, `/treinar`, `/opcoes`, `/treino` sem `nivel` (a escolha do nível) e `/partidas`, sem criar sala. **O Lobby e a tela de entrar:** no `online.spec.ts`, a Duda grava `menuTheme: green` antes de abrir o link; os `axe` que já rodam na tela de entrar e na Sala de espera dela passam a cobrir o verde (o limite é de 10 salas por minuto por IP: nada de sala nova).
- [ ] **Step 5: Rodar:** `pnpm --filter @coringa/web exec vitest run test/ui/past-games.test.tsx` → PASS; `pnpm --filter @coringa/web exec playwright test e2e/menu-verde.spec.ts e2e/online.spec.ts` → PASS (sem violação do axe). Se o axe achar outra tela, consertar a cor do texto nela no mesmo passo.
- [ ] **Step 6: Commit** `fix(web): o histórico e as telas do menu legíveis no verde; vitória e derrota em cor` e a memória.

### Tarefa 2: A folga da cura no relógio (protocolo)

**Files:**
- Modify: `packages/protocol/src/scenes.ts`
- Test: `packages/protocol/test/scenes.test.ts`; conferir `packages/server/test/core/` (o timing) e `packages/web/test/model/local-room.test.ts`

**Interfaces:**
- Produces: `export const HEAL_MS = 1_400;` e `export function healsMs(events: readonly { type: string }[]): number` (`HEAL_MS` × nº de `Healed`); `stepAllowanceMs` = `min(SCENE_ALLOWANCE_CAP_MS, sceneAllowanceMs + momentsMs.ms + healsMs)`.

- [ ] **Step 1: Testes**

```ts
it('cada Healed dá HEAL_MS de folga, também o de vida cheia', () => {
  expect(healsMs([healed(28), healed(0)])).toBe(2 * HEAL_MS);
  expect(stepAllowanceMs([healed(10)], null)).toBe(HEAL_MS);
});
it('a folga da cura soma às cenas, até o teto', () => {
  expect(stepAllowanceMs([{ type: 'Resurrected' }, healed(5)] as GameEvent[], null)).toBe(SCENE_MS.Resurrected! + HEAL_MS);
  expect(stepAllowanceMs([{ type: 'Exodia' }, healed(5), healed(5)] as GameEvent[], null)).toBe(SCENE_ALLOWANCE_CAP_MS);
});
```

- [ ] **Step 2: Falhar:** `pnpm --filter @coringa/protocol exec vitest run` → FAIL.
- [ ] **Step 3: Implementar** `HEAL_MS`, `healsMs` e a soma; exportar pelo índice do protocolo como os outros.
- [ ] **Step 4: Rodar** o protocolo, o servidor e o `local-room` da web: `pnpm --filter @coringa/protocol exec vitest run`, `pnpm --filter @coringa/server exec vitest run`, `pnpm --filter @coringa/web exec vitest run test/model/local-room.test.ts` → PASS. Um teste que fixava a folga de um passo com cura muda o valor esperado (dizer no commit qual), nunca é apagado.
- [ ] **Step 5: Commit** `feat(protocol): a cura dá folga ao relógio (HEAL_MS)` e a memória.

### Tarefa 3: O motor garante o bruto da cura passiva

**Files:**
- Create: `packages/engine/test/heal-gross.test.ts`

- [ ] **Step 1: O teste** (só teste; o motor não muda). Em cada passo (um `applyAction`), para cada `Healed` com `source: 'DEFENSE'`: nenhum `BuffRemoved`, `BuffPlayed` nem `AbsoluteDefenseEnded` de quem curou depois dele no mesmo passo, e `defenseHealOf(event.card, ladoDeQuemCurouNoFimDoPasso) >= event.amount`. Rodar sobre as 11 partidas de `test/fixtures/golden-replays.json` (passo a passo, como `test/replay.ts`) **e** sobre algumas centenas de partidas sorteadas com o `playout` (como o `properties.test.ts`), afirmando que a soma vista tem `Healed` de Defesa (o teste não pode passar vazio). Conferido no plano: uma mensagem `state` leva os eventos de um `applyAction` só, no servidor (`core/game.ts`) e no treino (`local-room.ts`, `#commit` por ação); a reconexão (`catchUp`) junta vários, e por isso nela a cura fica curta, sem bruto.
- [ ] **Step 2: Rodar:** `pnpm --filter @coringa/engine exec vitest run test/heal-gross.test.ts` → PASS (é a garantia da spec §4.1; se falhar, parar e levar o caso ao autor).
- [ ] **Step 3: Commit** `test(engine): o bruto da cura passiva vale com o lado do fim do passo` e a memória.

### Tarefa 4: A batida da cura e os efeitos dela (modelo da web)

**Files:**
- Create: `packages/web/src/model/heal-motion.ts`
- Modify: `packages/web/src/model/timeline.ts`, `packages/web/src/model/effects.ts`, `packages/web/src/model/copy.ts`
- Test: `packages/web/test/model/timeline.test.ts`, `packages/web/test/model/effects.test.ts`, `packages/web/test/model/heal-motion.test.ts` (novo)

**Interfaces:**
- Consumes: `HEAL_MS` (Tarefa 2).
- Produces:
  - `HEAL_MOTION = { glowMs: 420, dropAt: 120, flightMs: 640, arriveAt: 760, countMs: 520, shineMs: 620, sparksMs: 520, stampHoldMs: 1200, stampOutMs: 300, beatMs: HEAL_MS } as const` em `heal-motion.ts`.
  - `Beat.kind` ganha `'heal'`; `Beat.heal: { arriveAtMs: number; stealValue: number | null } | null` (absoluto, como `hit.atMs`).
  - `BeatEffects.heal: HealFx | null`, com `interface HealFx { target: PlayerId; card: NumCard; gross: number; net: number; caption: string; origin: { kind: 'graveyard' } | { kind: 'card'; id: string } }` (`card` é a carta do `Healed`: no Equipar, outra carta pode cair no cemitério depois dela no mesmo passo, `equip.ts`, a revelação dos dois).
  - `healCaption(card: NumCard, gross: number): string` em `copy.ts` (`cardText(card)` + ` × ${gross / card.value}` quando o multiplicador passa de 1).

- [ ] **Step 1: Testes**

```ts
// heal-motion.test.ts
it('a gota chega quando a conta começa, e tudo cabe na batida', () => {
  expect(HEAL_MOTION.dropAt + HEAL_MOTION.flightMs).toBe(HEAL_MOTION.arriveAt);
  expect(HEAL_MOTION.arriveAt + HEAL_MOTION.countMs).toBeLessThanOrEqual(HEAL_MOTION.beatMs);
});
// timeline.test.ts
it('ao vivo, o Healed é batida de cura, sem teto, também com o líquido 0', () => {
  const beats = buildTimeline([removedDef, healed(28), turnStarted], { mode: 'live', reducedMotion: false, decisionPending: true });
  const heal = beats.find((b) => b.event.type === 'Healed')!;
  expect(heal.kind).toBe('heal');
  expect(heal.durationMs).toBe(HEAL_MS);
  expect(heal.heal).toEqual({ arriveAtMs: heal.startMs + HEAL_MOTION.arriveAt, stealValue: null });
  expect(buildTimeline([healed(0)], live).find((b) => b.event.type === 'Healed')!.kind).toBe('heal');
});
it('no Roubo, a batida guarda o value do StealDamage do passo', () => {/* stealValue === 14 */});
it('na reconexão, a cura fica como hoje: damage com teto, e a de 0 quieta', () => {/* kind 'damage' / 'quiet', heal null */});
it('a cura de 0 não é a batida que conta os totais', () => {/* damageBeatIndex ignora Healed com amount 0 */});
it('duas curas no mesmo passo: duas batidas seguidas', () => {/* duas 'heal', a segunda começa no fim da primeira */});
// effects.test.ts
it('a cura passiva: o bruto do motor, o líquido do evento, a conta e a origem no cemitério', () => {
  expect(effectsOf(healBeat(7, 10), viewWith3Q, false).heal).toEqual({ target: 'p1', gross: 28, net: 10, caption: '7♥ × 4', origin: { kind: 'graveyard' } });
});
it('o Roubo: o bruto é o stealValue, a origem é a carta roubada', () => {/* origin { kind: 'card', id } */});
it('sem Q, a conta é só a carta', () => {/* caption '7♥' */});
it('a batida de cura não põe o número de dano; a da reconexão põe o "+N" de hoje', () => {/* damage null vs { heal: true } */});
it('a faixa da primeira cura segue na batida heal ao vivo', () => {/* teachHeal: o beat heal tem teach, e ribbonOf o mostra */});
```

- [ ] **Step 2: Falhar:** `pnpm --filter @coringa/web exec vitest run test/model/timeline.test.ts test/model/effects.test.ts test/model/heal-motion.test.ts` → FAIL.
- [ ] **Step 3: Implementar.** Antes, conferir quem lê `beat.kind` (hoje: `BEAT_MS[kind]` e o `quietOnly` em `timeline.ts`, o `damageBeatIndex` e a faixa em `effects.ts`; um grep por `kind ===` e `'damage'` em `web/src`) e decidir cada um para a `'heal'`: a duração vem de `HEAL_MS`; não é quieta; não treme a mesa (sem `impact`). Em `buildTimeline`, fora do `catchUp`: o `Healed` vira `kind: 'heal'`, `baseMs = HEAL_MS`, `uncapped = true`, e `heal.stealValue` vem do `StealDamage` mais perto antes dele no mesmo `events` (só com `source: 'STEAL'`). `damageBeatIndex` passa a exigir `amount > 0` no `Healed`. Em `effectsOf`, a batida `heal` dá `heal` (o lado de quem cura para o `defenseHealOf`; o `cause` dos K continua, só na Defesa) e `damage: null`; a `damage` da reconexão segue como hoje. O `teach` (a faixa da primeira cura) não muda.
- [ ] **Step 4: Rodar** os três arquivos → PASS; depois `pnpm --filter @coringa/web exec vitest run test/model` → PASS (os testes antigos que esperavam `kind: 'damage'` ao vivo são reescritos para a decisão nova, com o motivo no commit).
- [ ] **Step 5: Commit** `feat(web): a batida da cura, sem teto, com o bruto, a conta e a origem` e a memória.

### Tarefa 5: A vida conta na chegada; o brilho e o pulso no placar

**Files:**
- Modify: `packages/web/src/ui/anim/useBeatPlayer.ts` (o agendamento do `landed`), `packages/web/src/ui/anim/Stage.tsx` (`life`), `packages/web/src/ui/table/FightHud.tsx` (`HpBar`, o número), `packages/web/src/styles.css`
- Test: `packages/web/test/ui/animation.test.tsx` (com o `anim-harness.tsx`)

**Interfaces:**
- Consumes: `Beat.heal`, `HEAL_MOTION` (Tarefa 4).
- Produces: `data-cura-brilho` (a faixa que corre no verde, `HEAL_MOTION.shineMs`) e `data-vida-pulsa` (o número) no placar de quem cura, a partir da chegada.

- [ ] **Step 1: Testes** (relógio falso do Vitest): numa batida `heal` com líquido 10, a vida mostrada fica no valor antigo até `arriveAt`, chega ao novo em `countMs` depois, e o `data-cura-brilho` aparece na chegada; com o líquido 0, a vida não se mexe e não há contagem; com movimento reduzido, nada de brilho nem pulso (a vida segue a regra de hoje).
- [ ] **Step 2: Falhar.**
- [ ] **Step 3: Implementar.** No `useBeatPlayer`, uma marca própria, `healArrived` (como o `landed`: `{ run, index }` agendado em `beat.heal.arriveAtMs`, exposto no retorno ao lado do `hitLanded`). **Não** reusar o `hitLanded`: o `Stage` o lê também no retrato que racha (`defeated`), no `effectsOf` e na `BeatOverlay`, e uma cura logo antes do golpe final rachara o retrato cedo. No `life` do `Stage`, para a batida com `heal`: `step` só com o `healArrived`, e `ms = HEAL_MOTION.countMs`. Teste: uma cura seguida do golpe final não racha o retrato na chegada da cura. No `HpBar`, o brilho é um filho a mais (`transform` e `opacity`, Web Animations), só com a cura chegada e sem movimento reduzido. O K que acende (`cause`, em `Card.tsx:463`) ganha borda de 4 px mais opaca (`bg-cura/35`).
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/web exec vitest run test/ui` → PASS.
- [ ] **Step 5: Commit** `feat(web): a vida sobe quando a cura chega, com o brilho na barra` e a memória.

### Tarefa 6: A camada da cura: o brilho da origem, a gota, as faíscas e o carimbo

**Files:**
- Create: `packages/web/src/ui/anim/Heal.tsx`
- Modify: `packages/web/src/ui/anim/Stage.tsx` (monta a camada dentro do `FxLayer`, ao lado do `Leaving`)
- Test: `packages/web/test/ui/heal.test.tsx` (novo)

**Interfaces:**
- Consumes: `effectsOf(...).heal` (Tarefa 4), `HEAL_MOTION`, `useFxLayer().layer()`, as âncoras `[data-cemiterio]`, `[data-card-id="<id>"]` e `[data-lado="voce"|"oponente"] [role="meter"]`.
- Produces: `export function HealLayer(props: { run: Run; beat: Beat | null; cut: boolean; fx: HealFx | null; me: PlayerId; reduced: boolean }): null` (põe e tira nós na camada; não desenha pelo React). Marcas: `[data-cura-gota]`, `[data-cura-faisca]`, `[data-cura-carimbo]` (com o texto do bruto e da conta), `[data-cura-origem]`.

- [ ] **Step 1: Testes** (jsdom com o relógio falso; `Element.prototype.animate` falso como no `leaving.test.tsx`):
  - na batida `heal`, `[data-cura-origem]` e `[data-cura-gota]` aparecem; num passo do Equipar em que outra carta cai no cemitério depois da que curou, a origem acesa é o monte (`[data-cemiterio]`), não a carta de cima;
  - o número de um golpe do mesmo lado troca o carimbo (o carimbo sai);
  - um `state` novo (outra `run`) com o carimbo ainda no ar: ele termina a saída ou sai na hora, sem nó órfão;
  - desmontar o `Stage` tira os nós e cancela os timers; na chegada, `[data-cura-carimbo]` com "+28" e "7♥ × 4"; o carimbo do seu lado está dentro do lado `voce` (a âncora da sua barra) e o do oponente na do `oponente`;
  - o carimbo continua depois do fim da batida e sai `stampHoldMs + stampOutMs` depois dela, sem nó sobrando;
  - uma cura nova do mesmo lado troca o carimbo (só um `[data-cura-carimbo]` por lado);
  - uma batida de cena (`kind: 'scene'`) ou um `GameOver` tira o carimbo na hora;
  - o pulo (`cut`) tira a gota, as faíscas e o carimbo;
  - com movimento reduzido, nada de gota nem faísca; o carimbo aparece na chegada.
- [ ] **Step 2: Falhar.**
- [ ] **Step 3: Implementar** com Web Animations sobre nós da camada, os tempos de `HEAL_MOTION`. A origem: na Defesa, a carta `[data-cemiterio] [data-card-id="<fx.card.id>"]` se for ela a de cima, senão o monte `[data-cemiterio]`; no Roubo, a carta `data-card-id` na fileira de quem roubou; o destino é a ponta da vida nova na barra de quem cura (a fração `vida/máx` da largura da barra, do lado do retrato). O carimbo pendura logo abaixo da barra, centrado na ponta, preso para não passar do fim da barra para o centro do placar (o espelho no lado do oponente). Tamanhos do carimbo e da gota pelo `pc:` (a largura que a mesa já usa).
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/web exec vitest run test/ui/heal.test.tsx` e `test/ui` → PASS.
- [ ] **Step 5: Commit** `feat(web): a cura vira vida na mesa: a gota, as faíscas e o carimbo` e a memória.

### Tarefa 7: O som da cura

**Files:**
- Modify: `packages/web/src/model/sound.ts` (`Cue`, `cueOf`), `packages/web/src/sound/synth.ts` (a receita)
- Test: `packages/web/test/model/sound.test.ts`, `packages/web/test/model/synth.test.ts`

**Interfaces:**
- Consumes: `HEAL_MOTION` (os instantes), `Beat.kind === 'heal'`.
- Produces: `Cue` ganha `'cura'`; `cueOf` devolve `'cura'` para a batida `heal` (os dois lados).

- [ ] **Step 1: Testes:** `cueOf(healBeat, 'p1')` e `cueOf(healBeatDoOponente, 'p1')` → `'cura'`; a batida `damage` de cura da reconexão segue muda; o teste do sintetizador que exige uma receita por pista passa a cobrir `'cura'`, e as vozes dela têm pico ≤ 0,14.
- [ ] **Step 2: Falhar.**
- [ ] **Step 3: Implementar** a receita (spec §4.5): o brilho a 0 s (seno 1.568 Hz, 0,12 s); o glissando de `dropAt` a `arriveAt` (seno 440 → 880 Hz) com o sopro em banda que sobe junto; na chegada, o arpejo de mi maior (659, 831, 988 Hz, triângulo, de 50 em 50 ms) e os brilhos 1.976 e 2.637 Hz. Os instantes em segundos a partir de `HEAL_MOTION`.
- [ ] **Step 4: Rodar** os dois arquivos → PASS.
- [ ] **Step 5: Commit** `feat(web): o som da cura` e a memória.

### Tarefa 8: As marcas do Coringa só com a figura, com a dica

**Files:**
- Create: `packages/web/src/ui/table/MarkFigure.tsx`, `packages/web/src/ui/table/mark-tip.ts`
- Modify: `packages/web/src/ui/table/PlayerField.tsx` (as placas e o título do Reflect), `packages/web/src/styles.css`; apagar `StatePlate.tsx` quando nada mais o usar; `CLAUDE.md` (a regra do `data-sem-pulo`)
- Test: `packages/web/test/ui/table.test.tsx` (reescrever os testes das placas e do Reflect), `packages/web/test/ui/mark-figure.test.tsx` (novo), `packages/web/e2e/layout.spec.ts` (as marcas pelo nome acessível)

**Interfaces:**
- Produces: `type MarkKind = 'cura' | 'res' | 'defesa' | 'ataque' | 'reflect'`; `MarkFigure(props: { kind: MarkKind; id: string; name: string; does: string; icon: ReactNode; count?: number })` (um `<button type="button" data-marca={kind} aria-label="<nome>: <linha>" aria-expanded>`); `mark-tip.ts`: `openTip(id: string | null): void`, `useOpenTip(): string | null` (`useSyncExternalStore`, uma dica aberta por vez).

- [ ] **Step 1: Testes**
  - `table.test.tsx`: no lugar de `getByText('Cura passiva')`, `getByRole('button', { name: /^Cura passiva: / })` no campo certo; o `line()` lê a parte depois de ": " do nome acessível; os casos de borda de `plateLine` (o mínimo da cura, o Ataque Absoluto do outro) seguem com os mesmos textos; o Reflect pelo botão `/^Reflect ativo: /` e as três cartas na lista "Cartas do Reflect".
  - `mark-figure.test.tsx`: o nome acessível da Ressurreição leva o número visível do selo (WCAG 2.5.3, o rótulo no nome): `resurrectionsText(2)` + ": traz 1 numérica do cemitério"; rolar ou redimensionar fecha a dica (ela é `position: fixed` e os campos rolam por dentro); passar o mouse abre a dica com o nome e a linha; o foco pelo teclado abre; o clique alterna; abrir uma fecha a outra; tocar fora fecha; o Esc fecha e marca o evento (`defaultPrevented`), e o `Stage` não pula; a lista das marcas e o medalhão do Reflect têm `data-sem-pulo`; o selo da Ressurreição mostra o número; com movimento reduzido, sem `data-gesto`.
- [ ] **Step 2: Falhar.**
- [ ] **Step 3: Implementar.** Medalhão de 36 px (`size-9`) e 44 px no PC (`pc:size-11`), com a figura e os gestos de hoje (copiar do `StatePlate`). A dica num portal no `document.body`, `position: fixed`, pela caixa do medalhão, virando para cima ou para o lado perto da borda; `pointer-events: none`; o texto dela fica `aria-hidden` (o nome acessível já diz tudo). O coração da cura em papel com contorno de tinta sobre o disco verde (o contraste da spec §5). No `CLAUDE.md`, a linha do `data-sem-pulo` ganha "e as figuras das marcas do Coringa".
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/web exec vitest run test/ui` → PASS; `pnpm --filter @coringa/web exec playwright test e2e/layout.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): as marcas do Coringa e o Reflect só com a figura, com a dica` e a memória.

### Tarefa 9: Conferir de verdade e fechar

- [ ] **Step 1: Fotos** (o `medir-cena.ts` ou um `.mjs` com o Playwright, como os da pasta do protótipo): a sua cura e a do oponente (PC 1440 × 900 e celular 390 × 844; fixture `especiais`, rodada 29 e as curas do Bot nela), as marcas com a dica aberta, a lista de partidas nos dois temas. Guardar em `docs/superpowers/specs/2026-11-23-cura-direcoes/final/`. Conferir que o carimbo do oponente não cobre o centro nem o botão do menu.
- [ ] **Step 2: Medir** com a CPU 4× (`medir-cena.ts`, `MEDIR_APARENCIA` com a arte no celular): a cura e a Devastação, antes (`main`) e depois, na mesma sessão. A cura não pode derrubar os quadros abaixo da Devastação de hoje.
- [ ] **Step 3: O portão:** atualizar e commitar a memória; `pnpm check` → verde; `pnpm e2e` → verde (os prazos de espera dos E2E podem ganhar folga pela cura; nunca afrouxar asserção).
- [ ] **Step 4: Documentos:** o `CLAUDE.md` (a camada da cura no `Stage`, o `HEAL_MS` na folga, as marcas com dica), o `diario.md` (com os `Ruling:` de cada tarefa), o `estado.md`.
- [ ] **Step 5: Revisão do advisor** sobre o branch inteiro; depois o push, o PR para a `main` e as duas CI. O merge e o deploy são do autor.
