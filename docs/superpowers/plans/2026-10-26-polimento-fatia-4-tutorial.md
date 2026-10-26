# Polimento, fatia 4: tutorial — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/tutorial`, uma partida de treino de verdade contra o bot Fácil, numa semente em que as especiais aparecem cedo, com
dicas por situação num painel não modal; e a prévia do ataque que diz quando o golpe derruba (follow-up §8.1).

**Architecture:** um modelo puro `tutorialHint(view, events, seen)` escolhe, a cada `state`, a primeira dica cuja situação
aconteceu e que ainda não foi vista. A tela `/tutorial` (por `import()`) monta a mesma mesa do treino (`LocalRoom` com
`level: 'facil'` e a semente do tutorial) e um painel de dica que o `Table` posiciona: no alto da coluna do histórico no PC, no
fluxo acima dos campos no celular e no tablet. A zona de que a dica fala ganha um contorno parado. A semente sai de um script
do simulador que procura uma distribuição com as especiais nas primeiras rodadas. A prévia letal sai do `previewAttack`.

**Tech Stack:** TypeScript (Node 24 puro nos pacotes, Vite na web), React 19, Tailwind 4, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§1, §5, §8.1).

## Global Constraints

- Sem regra na interface: a situação de cada dica sai da `view`, dos eventos e das ações legais (motor); a prévia letal, do
  `previewAttack`, nunca de ATK − DEF.
- O tutorial entra por `import()`; JS inicial ≤ 200 KB gzip (o smoke confere).
- Painel não modal, sem prender o foco, anunciado por região `polite`; fica abaixo das camadas da cena e da faixa; nunca cobre a
  mão nem a barra. Destaque parado (ouro com borda de tinta), sem piscar; nada de flash nem movimento novo.
- Textos das dicas: os revisados pela sessão principal (rascunho em
  `C:\Users\User\AppData\Roaming\Claude\side-session-notes\local_5a6f8935-10df-4551-89d9-04ae6d2bc3c1\tutorial-dicas-rascunho.md`);
  a dica 9 tem a frase da Pressão isolada (sai inteira quando a Pressão for removida) e o número do anti-travamento vem de
  `config.antiStallRounds`.
- Nenhum efeito, texto ou cena nova ligado à Pressão da mesa além da frase isolada da dica 9.
- Textos em pt-BR; identificadores em inglês. `pnpm check` verde antes de cada commit; nunca `--no-verify`.

## Review Focus

1. **Duas dicas ao mesmo tempo** (o primeiro turno de ataque com J na mão): aparece uma, na ordem da lista; a outra fica para o
   próximo `state` em que a situação ainda valer. Teste na Tarefa 2.
2. **Dica de uma situação que já passou** (o jogador clicou "Entendi" tarde): a dica não volta nem aparece fora de hora. Teste na
   Tarefa 2.
3. **Recarregar `/tutorial` no meio:** a partida recomeça na semente do tutorial, as dicas recomeçam; "Pular" e "concluído"
   ficam guardados (`coringa:tutorial`). Teste na Tarefa 4.
4. **Celular de 360 × 640:** o painel empurra os campos e não cobre a mão nem a barra. Teste na Tarefa 5 (E2E).
5. **Prévia letal com Guarda, Defesa Absoluta e Reflect:** nunca "derruba" quando a Guarda ou a Defesa Absoluta absorvem;
   contra Reflect, o desfecho de quem ataca. Teste na Tarefa 3.

---

### Task 1: a semente do tutorial

**Files:**
- Create: `packages/sim/src/cli/tutorial-seed.ts` (procura e imprime), `packages/sim/src/tutorial-seed.ts` (`TUTORIAL_SEED` e a
  regra `tutorialDeal(seed): TutorialDeal`); Modify: `package.json` da raiz (`"sim:tutorial": "node packages/sim/src/cli/tutorial-seed.ts"`),
  `packages/sim/package.json` (export `"./tutorial": "./src/tutorial-seed.ts"`, que a web importa no chunk do tutorial) e
  `eslint.config.js` (o arquivo entra na regra de navegador: nada de `node:*` nem `testing`)
- Test: `packages/sim/test/tutorial-seed.test.ts`

**Interfaces:**
- Produces: `export const TUTORIAL_SEED: string`; `export function tutorialDeal(seed: string): { firstEquipWithSpecial: Record<'J' | 'Q' | 'K' | 'A' | 'WILD', number | null>; reflectByEquip: number | null }`
  — em que Equipar (1, 2, 3…) o jogador `p1` recebe pela primeira vez cada especial, e em que Equipar ele já pode ter K + J + Q
  juntos na mão (sem jogar nada antes).

Regra da procura: a distribuição só depende da semente (o monte é fixo por ela). Critério: J, Q, K e A até o 2º Equipar, o
Selvagem até o 3º e K + J + Q até o 3º; entre as que passam, a de menor índice na ordem `tutorial-0`, `tutorial-1`, …

- [ ] **Step 1: Teste** `a semente do tutorial cumpre o critério` (com `tutorialDeal(TUTORIAL_SEED)`); `tutorialDeal é
  determinística`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar e rodar `pnpm sim:tutorial` para achar a semente. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(sim): a semente do tutorial (especiais nas primeiras rodadas)`.

### Task 2: o modelo das dicas

**Files:**
- Create: `packages/web/src/model/tutorial.ts`
- Test: `packages/web/test/model/tutorial.test.ts`

**Interfaces:**
- Produces:
  - `export type HintId = 'equip' | 'quad' | 'order' | 'firstAttack' | 'buffs' | 'trap' | 'wild' | 'reflect' | 'pressure' | 'end'`
    (a ordem da lista é a prioridade);
  - `export type HintZone = 'equip' | 'rows' | 'order' | 'actionBar' | 'hand' | 'reaction' | 'center' | 'end'` (a zona destacada);
  - `export interface Hint { id: HintId; zone: HintZone }`;
  - `export function tutorialHint(view: PlayerView, events: readonly GameEvent[], seen: ReadonlySet<HintId>): Hint | null` (a
    assinatura da spec; as ações legais saem por dentro, de `legalActions(view)` do motor).

Situações (do ponto de vista de `view.me`; uma dica só se ainda não está em `seen`; a primeira da lista que vale):
1. `equip`: fase EQUIP, com numéricas pendentes e o Equipar ainda não confirmado → zona `equip`;
2. `quad`: um `QuadFormed` (de qualquer lado) nos eventos, ou uma quadra no seu campo → `rows`;
3. `order`: fase ORDER_CHOICE e `CHOOSE_ORDER` nas legais → `order`;
4. `firstAttack`: ATTACK_MAIN com `DECLARE_ATTACK` nas legais → `actionBar`;
5. `buffs`: ATTACK_MAIN, sua vez, com J, Q ou K jogável nas legais → `hand`;
6. `trap`: REACTION com uma `TRAP` nas legais → `reaction`;
7. `wild`: o Coringa Selvagem na sua mão na sua vez → `hand`;
8. `reflect`: `REFLECT` nas legais, ou um `ReflectPlayed` do oponente nos eventos → `hand`;
9. `pressure`: `view.pressure ≥ 1` ou uma rodada de Ataque sem dano (`noDamageStreak ≥ 1`) → `center`;
10. `end`: GAME_OVER → `end`.

- [ ] **Step 1: Testes** (estados reais com o builder do motor ou partidas do `LocalRoom` na semente do tutorial): cada dica na
  sua situação; nenhuma fora dela; a primeira da lista ganha quando duas valem; uma vista não volta; nada depois de todas vistas.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): modelo das dicas do tutorial`.

### Task 3: a prévia diz quando o golpe derruba (§8.1)

**Files:**
- Modify: `packages/web/src/model/copy.ts` (`attackOutcomeText` e o texto do ataque do oponente)
- Test: o teste dos textos da barra (`test/ui/action-bar.test.tsx` e/ou o teste do `copy.ts`)

Regras: o texto do botão Atacar acrescenta `· derruba <apelido>` quando `p.damage ≥` a vida do oponente; contra Reflect,
`· derruba você` quando `p.reflected ≥` a sua vida (mantendo o texto de hoje antes); com Guarda ou Defesa Absoluta que absorvem
(dano 0), nada. O texto do ataque do oponente contra você ganha `· derruba você` quando `damage ≥` a sua vida, e `· derruba
<apelido>` quando o seu Reflect devolve o suficiente. Sempre do `previewAttack` (`damage`, `reflected`), nunca de ATK − DEF.

- [ ] **Step 1: Testes:** dano que derruba; dano que não derruba; Guarda absorve (sem "derruba" mesmo com ATK − DEF maior que a
  vida); Defesa Absoluta; Reflect que derruba quem ataca; Reflect que não derruba; Ataque Absoluto que derruba; os dois textos
  (o seu ataque e o do oponente).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): a prévia do ataque diz quando o golpe derruba`.

### Task 4: a tela `/tutorial`, o painel e o destaque

**Files:**
- Create: `packages/web/src/ui/screens/Tutorial.tsx`, `packages/web/src/ui/table/HintPanel.tsx`, `packages/web/src/model/tutorial-copy.ts`
  (os textos revisados; chunk do tutorial)
- Modify: `packages/web/src/app/router.ts` (`{ name: 'tutorial' }`), `packages/web/src/app/App.tsx` (rota lazy, com a mesma
  fronteira de chunk das telas do histórico), `packages/web/src/ui/screens/Home.tsx` ("Aprender jogando"),
  `packages/web/src/model/storage.ts` (`coringa:tutorial`: `'done' | 'skipped'`), `packages/web/src/ui/table/Table.tsx` e
  `PlayTable.tsx` (o lugar do painel e o destaque da zona), `packages/web/scripts/smoke.ts` (o tutorial fora do JS inicial)
- Test: `packages/web/test/ui/tutorial.test.tsx`, `home.test.tsx`, `router.test.tsx`, `test/model/storage.test.ts`

**Interfaces:**
- Consumes: `TUTORIAL_SEED` (Tarefa 1, de `@coringa/sim`, dentro do chunk do tutorial), `tutorialHint` (Tarefa 2).
- Produces: `TableProps.hint?: { zone: HintZone; panel: ReactNode }` (o painel no lugar certo e o contorno na zona);
  `loadTutorialState(store)`/`saveTutorialState(store, 'done' | 'skipped')`.

Regras: a tela monta a mesa do treino (reaproveitar o caminho do `Training.tsx` que cria a `LocalRoom` e a `Session`, sem
duplicá-lo) com `level: 'facil'` e a semente do tutorial; a faixa diz "Tutorial". O painel mostra a dica atual com "Entendi"
(marca vista) e "Pular o tutorial" (grava `skipped`, esconde o painel, a partida segue). A dica 10 grava `done`. O painel:
região `aria-live="polite"`, sem prender o foco, abaixo das camadas da cena e da faixa; no PC no alto da coluna do histórico, no
celular e no tablet no fluxo acima dos campos. O destaque: contorno parado (ouro com borda de tinta) na zona, sem animação. Na
tela inicial, "Aprender jogando" em destaque enquanto `coringa:tutorial` não existe, e depois como link comum. A dica 9 monta
o texto com o número de `config.antiStallRounds` da partida.

- [ ] **Step 1: Testes:** a rota; a tela começa na semente do tutorial com o Fácil; a dica do Equipar aparece; "Entendi" troca
  para a próxima quando ela vale; "Pular" esconde e grava; a dica 10 grava `done`; o painel não prende o foco (Tab sai dele); a
  região é `polite`; o destaque está na zona certa; recarregar recomeça as dicas e mantém o `coringa:tutorial`; a tela inicial
  com e sem `coringa:tutorial`; axe sem violações sérias.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check` (smoke: tutorial fora do JS inicial); commit `feat(web): o tutorial em /tutorial, com dicas por
  situação`.

### Task 5: E2E e documentos

**Files:**
- Create: `packages/web/e2e/tutorial.spec.ts` (e listá-lo no projeto certo do `playwright.config.ts`)
- Modify: `docs/superpowers/specs/2026-10-17-interface-web-design.md` (spec 3: a rota `/tutorial`, o botão da tela inicial),
  `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§5: a semente e os textos finais; §8.1 entregue), `CLAUDE.md`
  (a rota, se couber)

- [ ] **Step 1:** E2E: abrir `/tutorial`, ver a dica do Equipar, montar, ver a dica seguinte, pular; axe; e um caso de celular
  360 × 640 (o painel não cobre a mão nem a barra).
- [ ] **Step 2:** `pnpm e2e` verde; atualizar os documentos.
- [ ] **Step 3:** `pnpm check`; commit `test(web): E2E do tutorial e as specs`.

---

## Depois da última tarefa

Revisão de código da fatia inteira, `check` e `e2e` verdes na CI da branch, fast-forward na `main`, CI da `main` verde e um
aviso curto à sessão principal.
