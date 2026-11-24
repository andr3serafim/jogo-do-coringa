# A Defesa Absoluta em duas fases e o Reflect novo — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a Defesa Absoluta em duas fases (o escudo de um turno e os 4 Q que seguram a frente da Defesa) e o Reflect que devolve
`ATK − DEF base`, quebra os K e deixa os Q.

**Architecture:** sem campo novo no estado: `absoluteDefense` passa a ser só o escudo; "4 Q" é `fullDefense(p, config)`. A prévia
(`previewBetween`) e o efeito (`resolveAttack`) seguem sendo a mesma conta. Bots, textos, versões e fixtures acompanham.

**Tech Stack:** TypeScript no Node 24 (motor, simulador, servidor), React na web, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-defesa-absoluta-reflect-design.md` (aprovada, `decisoes.md` 2026-11-24 (8)).

**Execução:** nativa (como no bloco anterior), com o advisor depois da Tarefa 1 (o motor), da Tarefa 3 (o portão do Difícil) e da
Tarefa 5 (o E2E).

## Global Constraints

- Imports relativos com `.ts`; só sintaxe apagável; `import type` para tipos (`CLAUDE.md`, "Node puro").
- Mensagens, comentários e textos em pt-BR; identificadores em inglês.
- `RULES_VERSION` 6 → 7 com o digest novo em `RULES_DIGESTS`; `STATE_SCHEMA` 6 → 7; `PROTOCOL_VERSION` 1 → 2.
- O `-u` dos snapshots golden só depois de ler o diff; o commit diz qual regra mudou.
- **O pre-commit roda `vitest related` e o `typecheck` do workspace:** uma mudança em `engine/src` puxa o `golden.test.ts` e o
  `rules-version.test.ts`. Por isso o motor, o `reflectedDamage` dos bots (o golden joga com bots), o golden regravado e a
  `RULES_VERSION` 7 vão **num commit só** (Tarefa 1).
- Commit do `estado.md` antes de cada job longo (`pnpm check` no push, `pnpm e2e`, `sim:dificil`, `sim:calibrate`).
- Nunca `--no-verify`. O portão do Difícil não se afrouxa: se reprovar, para e leva ao autor.
- A P1 (como a fase 2 aparece na mesa, e o nome dela) **não** entra neste plano: os textos falam "enquanto tiver os 4 Q", sem nome.

## Review Focus

1. **O 4º Q que volta** (4 → 3 → 4): o escudo liga de novo (`AbsoluteDefenseStarted` de novo). Teste na Tarefa 1.
2. **Ataque Absoluto contra a fase 2:** quebra todos os K, o dano entra com DEF × 5, a frente da Defesa fica, 1 J sai. Teste na Tarefa 1.
3. **Reflect com 4 Q dos dois lados:** atacante na fase 2 é refletido normalmente (perde K, fica com Q); quem reflete com 4 Q fica com a
   frente. Teste na Tarefa 1.
4. **A cura passiva de quem tem 4 Q:** a frente não sai depois do ataque, então não cura; a Devastação tira sem curar. Teste na Tarefa 1.
5. **Replays e fixtures gravados na versão 6:** abrem com o aviso; as fixtures do E2E são regravadas (Tarefa 5).

---

### Task 1 (Tarefa 1): o motor, o `reflectedDamage`, o golden e a `RULES_VERSION` 7 (um commit)

**Files:**
- Modify: `packages/engine/src/combat.ts` (nova `fullDefense`; a frente da Defesa em `resolveAttack`; sai o bloco dos `queens` no Reflect)
- Modify: `packages/engine/src/flow.ts` (`expireEffects`: sai o `splice`, o `toGraveyard` e o `BuffRemoved`)
- Modify: `packages/engine/src/preview.ts` (Reflect: `defense = defenseBase(attacker)`, sem o ÷ 2; sai `attackerQueens` de `breaks`)
- Modify: `packages/engine/src/index.ts` (exporta `fullDefense`); `packages/engine/src/version.ts` (7)
- Modify: `packages/sim/src/bots/eval.ts` (`reflectedDamage`: `Math.max(0, attackPower(a) − defenseBase(a))`, 0 no escudo)
- Create: `packages/engine/test/absolute-defense.test.ts`
- Modify: `packages/engine/test/reflect.test.ts`, `preview.test.ts` (o `breaks` sem `attackerQueens`), `rules-version.test.ts`, os testes
  que esperavam o Q sair no fim do escudo; `packages/engine/test/fixtures/golden-replays.json` e `__snapshots__/golden/*`
- Test: o teste do `reflectedDamage` em `packages/sim/test` (o exemplo da spec: 16)

**Interfaces:**
- Produces: `export function fullDefense(p: { defenseBuffs: readonly unknown[] }, config: Pick<RulesConfig, 'buffLimit'>): boolean`
  (`defenseBuffs.length >= config.buffLimit`), exportada do pacote.
- Produces: `AttackPreview['breaks']` = `{ defenderGuard: number; attackerGuard: number }`.

- [ ] **Step 1: testes que falham** (com `setup`, `act`, `player`, `values` de `./helpers.ts`):
  - `absolute-defense.test.ts`:
    - `o escudo acaba no fim do turno do oponente com ataque, e os 4 Q ficam`: `AbsoluteDefenseEnded`, `absoluteDefense === false`,
      4 Q, **nenhum** `BuffRemoved` de P1.
    - `na fase 2 o dano entra com DEF × 5 e a frente da Defesa fica`: P1 `defense: [8, 6]`, 4 Q, sem escudo; ATK 90 → −20 de vida;
      `values(defenseRow)` segue `[8, 6]`.
    - `na fase 2 a Armadilha e o Sacrifício alcançam os Q` (legais; tiram 1 Q; depois, num ataque, a frente sai).
    - `na fase 2 a Devastação esvazia a Defesa e o Roubo tira de vida valor × 5` (roubar o 9: −45 de vida dele, +45 de quem rouba).
    - `o 4º Q de novo liga o escudo`: 3 Q, sem escudo, joga Q → `AbsoluteDefenseStarted`.
    - `Ataque Absoluto contra a fase 2`: 2 K quebram, dano `ATK − DEF×5`, a frente fica, o atacante perde 1 J.
    - `com 4 Q a frente não sai, então não cura` (2 K sobrando: nenhum `Healed`).
  - `reflect.test.ts`: o `EXAMPLE_3` devolve **46 − 14 = 32** (era 39); o exemplo da spec (ATK 28, DEF base 12, 2 Q, 2 K) devolve
    **16**, quebra os 2 K, deixa os 2 Q, nenhum `BuffRemoved`; atacante na fase 2 refletido normalmente; quem reflete com 4 Q (fase 1 e
    fase 2) fica com a frente; contra o escudo segue anulado (o teste de hoje).
  - `sim`: `reflectedDamage` do exemplo da spec = 16.
- [ ] **Step 2:** `pnpm --filter @coringa/engine exec vitest run test/absolute-defense.test.ts test/reflect.test.ts` → FALHA.
- [ ] **Step 3:** implementar no motor e no `eval.ts`; `grep -rn attackerQueens packages` sem resto.
- [ ] **Step 4:** `pnpm --filter @coringa/engine exec vitest run` sem os golden → verde (os testes de regra velha corrigidos para a nova).
- [ ] **Step 5:** `pnpm --filter @coringa/sim record-golden`; ler o diff: em cada partida, o **primeiro** passo que diverge tem de ser
  um Reflect, um fim de escudo, um ataque contra 4 Q ou um `PLAY_Q` (o 4º Q que antes saía). Depois `-u`; `RULES_VERSION = 7` e a
  linha do digest que a falha do `rules-version.test.ts` imprime.
- [ ] **Step 6:** `pnpm --filter @coringa/engine exec vitest run` e `pnpm --filter @coringa/sim exec vitest run` verdes; `pnpm typecheck`
  verde.
- [ ] **Step 7:** commit `feat(engine): a Defesa Absoluta em duas fases e o Reflect novo (RULES_VERSION 7)`, com o corpo dizendo as
  duas regras. Advisor.

### Task 2 (Tarefa 2): as salas, o protocolo e as regras escritas

**Files:**
- Modify: `packages/server/src/core/timers.ts` (`STATE_SCHEMA = 7`); `packages/protocol/src/constants.ts` (`PROTOCOL_VERSION = 2`) e
  os testes que fixam o 1 literal (procure `protocol: 1` em `packages/*/test`)
- Modify: `docs/JOGO-DO-CORINGA-4.0.md` (7.4 passos 6 e 9; 8.2; 8.8; 9.1; 10.1 itens 3 a 5 e o exemplo, que passa a 28 − 12 = 16 com os
  Q ficando; 10.2 item 3; 11.1 com o exemplo das duas fases da spec; 11.2 passo 5 do exemplo; os 14.x que citem o Q do fim)

- [ ] **Step 1:** subir as duas constantes; `pnpm --filter @coringa/server exec vitest run` e `pnpm --filter @coringa/protocol exec
  vitest run` → os testes com o 1 literal falham; trocá-los pela constante; verdes.
- [ ] **Step 2:** o texto das regras.
- [ ] **Step 3:** commit `feat: STATE_SCHEMA 7 e PROTOCOL_VERSION 2; as regras escritas da Defesa Absoluta e do Reflect`.

### Task 3 (Tarefa 3): o simulador e o portão do Difícil

**Files:**
- Modify: `packages/sim/src/play/text.ts:207` ("o escudo da Defesa Absoluta de X acabou; os 4 Q ficam") e `play/board.ts:31` (com 4 Q sem
  escudo: "4 Q (a Defesa não perde a frente)")
- Modify: `packages/sim/src/match.ts:119` (`absoluteDefenseAtCap` passa a contar `fullDefense`: a partida que bate o teto com 4 Q, em
  qualquer fase; o comentário diz que o sentido mudou na regra 7)

- [ ] **Step 1:** testes do texto e da métrica → falham; implementar; `pnpm --filter @coringa/sim exec vitest run` verde; commit
  `feat(sim): o texto e a métrica da Defesa Absoluta em duas fases`.
- [ ] **Step 2:** `estado.md` ("rodando o portão") + commit; `pnpm sim:dificil --recomecar` (em background). Aprovou → o relatório
  `packages/sim/reports/dificil.md` vai num commit. Reprovou → parar e levar o relatório ao autor. Advisor.
- [ ] **Step 3:** `pnpm sim:calibrate`: no `diario.md`, a duração das partidas e o `capped`/`cappedWithAbsoluteDefense` antes (main) e
  depois.

### Task 4 (Tarefa 4): a web

**Files:**
- Modify: `packages/web/src/model/copy.ts` (a ajuda: Armadilha/Roubo 839, Sacrifício 840, Reflect 842, Devastação 843, Defesa Absoluta
  858; o motivo `TARGET_PROTECTED` da linha 140)
- Modify: `packages/web/src/model/marks.ts` (`ownSpentIds`: sai a ligação `defenseEnded`/`afterDefenseEnded`; o comentário das "Q que o
  dano devolvido quebra" sai)
- Test: os testes da cópia e do `marks` em `packages/web/test/model`

Arquivo por arquivo, o que **não** muda (conferido): `ui/scenes/ReflectTriggered.tsx` (não mostra Q quebrando), `ui/scenes/AbsoluteDefense.tsx`
(a cena é a do começo do escudo), `model/timeline.ts` (o `BuffRemoved` é batida genérica; o `AbsoluteDefenseEnded` fica `move()`),
`model/effects.ts` (a insígnia some no fim do escudo), o som `defesa-absoluta` (o do começo).

Textos exatos:
- Reflect: `Reflect (K + J + Q da mão): só na janela de reação, contra um ataque ou uma Devastação. Contra o ataque, quem atacou perde
  todos os K e leva de volta o próprio ataque, com o multiplicador, menos a Defesa base dele, sem o multiplicador dos Q (o dano nunca fica
  abaixo de 0); os Q dele ficam, e você não leva nada. Se ele estiver no escudo da Defesa Absoluta, o Reflect só segura o golpe. Contra a
  Devastação, ela volta para quem a lançou.`
- Defesa Absoluta: `Defesa Absoluta (4 Q): o 4º Q liga o escudo. Até o fim do primeiro turno do oponente que termina com ataque, você é
  imune a dano, a Armadilha, a Sacrifício, a Roubo e a Devastação; só o Ataque Absoluto fura a imunidade a dano (quebra os seus K e causa
  o dano normal). Depois do escudo, enquanto você tiver os 4 Q, a DEF segue × 5 e a fileira de Defesa não perde a carta da frente depois
  dos ataques, mas os Q ficam ao alcance de Armadilha e Sacrifício. Todo 4º Q que entra liga o escudo de novo.`
- Armadilha/Roubo, Sacrifício, Devastação: "Defesa Absoluta" → "o escudo da Defesa Absoluta" nas frases de imunidade.
- Linha 140: `${opponent} está no escudo da Defesa Absoluta: nada de Armadilha nem Sacrifício`.

- [ ] **Step 1:** testes da cópia com os textos novos e do `ownSpentIds` (o `BuffRemoved` depois do `AbsoluteDefenseEnded` não é mais
  "seu") → falham.
- [ ] **Step 2:** implementar; `pnpm --filter @coringa/web exec vitest run test/model` verde.
- [ ] **Step 3:** commit `feat(web): os textos e as marcas da Defesa Absoluta e do Reflect novos`.

### Task 5 (Tarefa 5): as fixtures do E2E, o tutorial e o E2E inteiro

**Files:**
- Modify: `packages/web/e2e/fixtures/{absolutos,reflect,especiais}.json` (contar com a regravação: o `PLAY_Q` depois do fim do escudo
  vira `BUFF_LIMIT`, e o Reflect muda a vida); `exodia-devastacao.json` se divergir; os specs que usam passos fixos delas; a tabela
  "Para ver sem esperar" do `docs/memoria/estado.md`
- Reuse: a busca de semente de `packages/sim/src/experiments/` (a que achou a `fatia4-220`)

- [ ] **Step 1:** re-simular cada fixture no motor novo (script no scratchpad): até onde vai, e se a cena que o spec procura segue no
  passo que ele usa.
- [ ] **Step 2:** regravar as que divergem: mesma dupla de bots, busca de semente até a cena aparecer; `rulesVersion: 7`; passos dos
  specs e a tabela do `estado.md` atualizados.
- [ ] **Step 3:** o tutorial: `pnpm --filter @coringa/sim exec vitest run` (os testes do `tutorial-seed`) e o `tutorial.spec.ts`; ler a
  primeira falha antes de mexer.
- [ ] **Step 4:** `estado.md` + commit; `pnpm e2e` (com a 8787 livre) → verde. Advisor.
- [ ] **Step 5:** commit `test(web): as fixtures do E2E na regra 7`; `diario.md` com as `Ruling:`; push; PR para a `main` (depois do
  merge do #9 e de `git rebase --onto main feat/ci-salvos feat/regras-4q-reflect`).
