# Simulador, bots e jogo no terminal — Plano de Implementação (Plano 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a segunda metade do sub-projeto 1: o simulador com bots `random`, `greedy` e `turtle` que mede as metas da spec §3, o jogo no terminal contra o bot (spec §4) e um portão automático de testes contra regressões.

**Architecture:** Novo pacote `packages/sim` (`@coringa/sim`), que só usa a API pública do `@coringa/engine`. O motor passa a rodar no Node 24 puro (type stripping), sem bundler nem loader: imports relativos com `.ts`. Os bots são funções puras `(view, legal, rng) => Action`. O runner `runGame` joga partidas bot × bot com sementes reprodutíveis. Métricas, experimentos (turtle pareado e ordem contrafactual) e a calibração são camadas por cima do runner. O jogo no terminal usa o mesmo motor com IO injetável. Hooks versionados e a CI rodam `pnpm check` a cada mudança. Partidas de referência gravadas congelam o comportamento do motor.

**Tech Stack:** Node 24 (type stripping nativo), pnpm 11.9, TypeScript ~6.0.3, Vitest ^5 (+ `toMatchFileSnapshot`), ESLint 10, simple-git-hooks ^2.14, GitHub Actions (checkout v7, setup-node v7, pnpm/action-setup v6).

**Spec:** `docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md` — leia §1 (regras), §3 (simulador, metas e definições das métricas), §4 (terminal) e §5 (testes e portão). Plano anterior, já executado: `docs/superpowers/plans/2026-10-15-motor-do-jogo.md`.

**Onde executar:** branch `feat/sim`, na pasta à parte `D:\andr3\jogo-coringa-sim` (worktree já criado; este plano é o primeiro commit dela). Nunca trabalhe direto na `main` nem troque de branch em `D:\andr3\jogo-coringa`, que é compartilhada com outras sessões. Push e PR estão autorizados aos agentes até o MVP (palavras do autor em 2026-10-16: "pode fazer esses push, autorizado a você fazer até o mvp ficar pronto"). Merge na `main` só com `pnpm check` verde e a CI verde no PR, por squash no GitHub ou fast-forward. Configuração do repositório (proteção da `main`) continua com o autor. Decisões novas de regra ou de design de jogo sobem para ele.

## Decisões (brainstorming de 2026-10-16)

Decididas pela sessão principal por delegação do autor; o plano não as rediscute.

1. **Node carrega o motor com `.ts` nos imports, sem tsx.** Testado: com `./types.ts` nos imports, o Node 24.19 roda o motor sem flag e sem aviso, inclusive pelo link do workspace. O tsx traria o esbuild (binário nativo; o pnpm 11 exige aprovar o build script) e o motor seguiria sem rodar em Node puro (spec §2.1). Entram `rewriteRelativeImportExtensions`, `verbatimModuleSyntax` e `erasableSyntaxOnly` no tsconfig base, uma regra de ESLint contra import relativo sem `.ts` e um smoke via `node` no `pnpm check`.
2. **API do motor para os bots, com escopo estreito:** o PRNG com semente, `actingPlayers` (saindo de `test/`) e `attackPower`/`defensePower` sobre tipos estruturais (`{ attackRow, attackBuffs }`, `{ defenseRow, defenseBuffs }`) mais a pressão. Assim o mesmo cálculo serve ao motor, aos bots e, depois, à prévia de dano da interface. O `resolveAttack` revisado não é refatorado. Os bots recebem o próprio RNG, nunca o da partida.
3. **Playouts enviesados nos testes do motor** (3 perfis: Exódia, Absolutos, Reflect expirado), com as invariantes a cada passo, sementes fixas, e falha se o evento-alvo não acontecer em nenhuma semente.
4. **Turtle:** na frente em vida, Defesa enquanto couber; com a Defesa cheia, Ataque (forçado pela regra do Equipar); com as duas cheias, troca a última da Defesa se a nova for maior, senão descarta; joga todos os K e todos os Q. Relatório separa as vitórias por motivo.
5. **Turtle "na mesma situação":** desenho pareado a partir do estado em que alguém abre 10+ de vida (e 20+, sensibilidade), com e sem Pressão.
6. **Escolha da ordem:** métrica principal contrafactual (spec §3); a frequência de escolha do greedy é só informativa. Rollouts reamostram a informação oculta com semente própria; "primeiro" e "segundo" usam as mesmas sementes. Só no job de calibração.
7. **Calibração e varreduras em script à parte** (`pnpm sim:calibrate`); no `pnpm check` só entra um smoke do simulador.
8. **Portão automático:** simple-git-hooks (pre-commit e pre-push rodam `pnpm check`), CI no GitHub (validada de verdade no PR da `feat/sim`), `.gitattributes` com LF, `CLAUDE.md` do projeto com as regras, e **partidas de referência como replays gravados** (semente + ações) reexecutados no motor, com snapshot de um resumo.
9. **`pnpm play`** salva a partida (semente + ações) e aceita `--bot` e `--semente`.

Calls tomadas na escrita do plano (o autor pode vetar na revisão; as três primeiras estão marcadas **[P]** na §3 da spec):

- As metas da §3 são medidas em `greedy` × `greedy`; `random` × `random` e `turtle` × `greedy` aparecem para comparação.
- Na métrica da ordem, "decisivo" = diferença média maior que 2 erros padrão.
- Na métrica da ordem, exige-se que ao menos 20% dos pontos sejam decisivos.
- Os testes de cenário do simulador importam o builder `setup` de `packages/engine/test/helpers.ts`, para montar estados reais sem inventar cartas.
- Varredura: vida 60, 150, 200, 300 e 400; fileira 5, 6, 8 e 9; 4 ou 8 de cada figura; 6 ou 7 de cada numérica. Partidas por série: 1000 (margem de cerca de ±3 pp numa taxa de 50%).
- As fixtures das partidas de referência guardam a config completa: mudar o `DEFAULT_CONFIG` (calibração) não as quebra; o `config.test.ts` do motor já trava o padrão.
- Os hooks do simple-git-hooks ficam no `.git/hooks` comum: valem para **todas** as pastas deste repositório (inclusive `D:\andr3\jogo-coringa`) a partir do `pnpm install` da Tarefa 2. Na `main`, o hook roda o `pnpm check` que existir lá.

## O que o protótipo já mostrou (prévia, não é o relatório)

Todo o código deste plano foi rodado num clone de rascunho, fora do repositório: `pnpm check` verde em ~18 s (149 testes no motor, 59 no simulador, smokes ok), o hook barrando um commit com teste quebrado e a calibração completa (`pnpm sim:calibrate`, 1000 partidas por série) em **249 s**. O que ela mostrou, para orientar a Tarefa 13 (a decisão sobre parâmetros é do autor):

- **Duração:** `greedy` × `greedy` com vida 100 termina na mediana de **4 rodadas de Ataque** (p10–p90: 2–6); meta 8–14. Vida 300 dá 9 (5–13) e 400 dá 11. O tamanho da fileira quase não muda isso (5 → 5; 9 → 3). O `random` × `random` dá 7.
- **Tensão entre metas:** mais vida alonga a partida, mas o Fallen is Back sobe junto (15% com vida 100; 44% com 300; 53% com 400; meta 10–25%).
- **Exódia:** 0,1% (meta 1–3%). Os K quase sempre viram Guarda e quebram absorvendo dano.
- **Iniciativa:** 49% (ok). Anti-travamento: 0% (1,9% sem Pressão). Todas terminam.
- **Turtle pareado:** com Pressão, o líder turtle pontua ~27 pp **menos** que o líder greedy (meta ok, com vantagem 10 e 20). Sem Pressão, a diferença cai para 6–9 pp e 25–35% das partidas do turtle terminam no anti-travamento: a brecha que a regra fecha aparece.
- **Escolha da ordem (200 pontos × 16 rollouts):** só 16,5% dos pontos são decisivos (meta ≥ 20%) e, entre eles, ir primeiro é melhor em 78,8% (meta 30–70%). Ou seja: a escolha raramente importa, e quando importa, ir primeiro tende a dominar. O `greedy` escolhe ir primeiro em ~31%.

## Global Constraints

- Node ≥ 24 e pnpm 11.9.0 (`packageManager`). TypeScript **~6.0.3** (typescript-eslint 8.71 só suporta TS < 6.1).
- **Motor e simulador rodam no Node puro:** imports relativos terminam em `.ts`; só sintaxe apagável (nada de `enum`, `namespace`, parameter properties); import só de tipo com `import type` ou `type` inline. Nunca use `--preserve-symlinks` (o Node recusa type stripping dentro de `node_modules`; o pacote do workspace funciona porque o symlink resolve para `packages/engine/src`).
- **Nada de `Math.random` nem `Date` em lógica de jogo, bots ou experimentos.** Toda aleatoriedade vem de `createRng(seed)` (simulador) ou do PRNG do estado (motor). Exceção única: a semente padrão do `pnpm play`, mostrada na tela.
- O motor continua sem dependências de runtime e sem I/O. `applyAction` continua a única forma de mudar o estado de uma partida (exceto `determinize`, que reamostra a informação oculta num clone para os rollouts).
- Bots só recebem `PlayerView`, a lista de ações legais e o próprio `Rng`; devolvem um elemento da lista legal.
- Textos, mensagens e comentários em **pt-BR**; identificadores em inglês.
- Cobertura: motor ≥ 90% de linhas e branches (já existente); simulador ≥ 90% de linhas e ≥ 80% de branches, sem contar `src/cli/**` e `src/smoke.ts`.
- `pnpm check` = lint + typecheck + testes com cobertura + smoke no Node puro. Calibração nunca entra nele. Orçamento: se passar de ~45 s, aplicar a regra de evolução do `CLAUDE.md` (pre-commit rápido).
- A partir da Tarefa 2, todo commit passa pelo hook (`pnpm check`). Nunca `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.

## Review Focus

1. **Bot devolvendo ação fora da lista legal** em estados raros (mão só com Selvagens, fileiras cheias com até 81 combinações de Equipar, Reflect ativo dos dois lados) → `runGame` lança exceção. *Testado nas Tarefas 6 e 7 (cada bot em 20 partidas, conferindo cada ação contra a lista legal) e no `runGame` (Tarefa 5).*
2. **Vazamento de informação oculta pelo simulador ou pelo terminal:** bot usando algo fora da visão, rollout espiando o monte real, mesa do terminal mostrando a mão do bot → nunca. *Testado nas Tarefas 10 (`determinize` não muda a visão de quem escolhe e muda o monte) e 12 (a mesa não mostra Q da mão do oponente).*
3. **Execução não reprodutível** (mesma semente, resultado diferente) → quebra a comparação pareada e as partidas de referência. *Testado nas Tarefas 5, 6, 8 e 10 (mesma semente → mesmo estado/relatório).*
4. **Regressão de carregamento no Node puro** (import sem `.ts`, sintaxe não apagável) passando nos testes do Vitest → `pnpm play` quebra. *Barrado na Tarefa 1 (regra de ESLint + `erasableSyntaxOnly` + smoke via `node`).*
5. **Entrada inválida no terminal** (letra, número fora da faixa, linha vazia) → repete a pergunta, nunca trava nem aceita jogada ilegal. *Testado na Tarefa 12 (`askChoice` e partida roteirizada até o fim).*

---

## Estrutura de arquivos

```
.gitattributes                         # LF no repositório (Tarefa 2)
.github/workflows/check.yml            # CI: pnpm check em push e PR (Tarefa 2)
CLAUDE.md                              # regras do portão e do Node puro (Tarefa 2)
eslint.config.js                       # + regra contra import relativo sem .ts (Tarefa 1)
tsconfig.base.json                     # + rewriteRelativeImportExtensions, verbatimModuleSyntax, erasableSyntaxOnly
package.json                           # scripts smoke/check/sim/sim:calibrate/play + simple-git-hooks
pnpm-workspace.yaml                    # + allowBuilds (simple-git-hooks: false)
packages/engine/
  scripts/smoke.ts                     # partida via `node`, sem bundler (Tarefa 1)
  src/acting.ts                        # actingPlayers (saiu de test/) (Tarefa 3)
  src/combat.ts                        # + AttackSide, DefenseSide, attackPower, defensePower (Tarefa 3)
  src/index.ts                         # + exports para bots e interface (Tarefa 3)
  test/exports.test.ts                 # API nova + prévia de ATK/DEF = DamageDealt (Tarefa 3)
  test/invariants.ts                   # checkInvariants (saiu de properties.test.ts) (Tarefa 4)
  test/playout.ts                      # + chooser e initial (Tarefa 4)
  test/biased.ts / biased.test.ts      # perfis enviesados (Tarefa 4)
  test/replay.ts / golden.test.ts      # partidas de referência (Tarefa 8)
  test/fixtures/golden-replays.json    # replays gravados (Tarefa 8)
  test/__snapshots__/golden/*.json     # resumos (Tarefa 8)
packages/sim/
  package.json, tsconfig.json, vitest.config.ts
  reports/                             # relatórios (sim-*.json fora do git; calibracao.* commitados)
  replays/                             # partidas do pnpm play (fora do git)
  src/rng.ts                           # createRng (Rng dos bots e experimentos)
  src/match.ts                         # runGame, GameRecord, PLAYERS, attackRoundsUpTo, newGame
  src/bots/types.ts, random.ts, eval.ts, greedy.ts, turtle.ts, index.ts
  src/replay.ts, golden.ts             # formato de replay e partidas de referência
  src/metrics.ts, report.ts, series.ts # métricas, metas da §3, tabelas e JSON
  src/experiments/outcome.ts, determinize.ts, turtle.ts, order.ts
  src/calibrate.ts                     # seções da calibração + Markdown
  src/play/text.ts, board.ts, io.ts, game.ts   # jogo no terminal
  src/cli/args.ts, sim.ts, calibrate.ts, play.ts, record-golden.ts
  src/smoke.ts                         # smoke do pnpm check
  test/*.test.ts
```

Convenções: `PLAYERS = ['p1', 'p2']` nas simulações (`bots[0]` joga como p1); no terminal, `'voce'` e `'bot'`. Sementes de série: `${prefixo}-${i}`; RNG dos bots: `${botSeed}/p1` e `${botSeed}/p2`, com `botSeed = ${seed}/bots` por padrão.

---

### Task 1: Motor carregável no Node puro

**Files:**
- Create: `packages/engine/scripts/smoke.ts`
- Modify: todos os `.ts` de `packages/engine/src` e `packages/engine/test` (só os imports relativos), `tsconfig.base.json`, `eslint.config.js`, `packages/engine/tsconfig.json`, `packages/engine/package.json`, `package.json`

**Interfaces:**
- Consumes: API pública atual do motor.
- Produces: o motor carrega com `node arquivo.ts`; scripts `smoke` (motor) e `pnpm smoke` (raiz, roda o `smoke` de cada pacote); `pnpm check` termina com o smoke.

- [ ] **Step 0: Trazer a `main` atual e instalar**

O worktree nasce sem `node_modules`, e a `main` pode ter andado desde o plano (já andou uma vez: c40097c). Os playouts enviesados e as partidas de referência só valem contra o motor em que rodam. Na pasta `D:\andr3\jogo-coringa-sim`:
```bash
git merge --no-edit main
pnpm install --frozen-lockfile
pnpm check
```
Expected: merge sem conflito (ou conflito resolvido), instalação sem erro e `pnpm check` verde, ainda sem as mudanças deste plano. O sync de branch do app não serve aqui: este worktree não foi criado pelo app.

- [ ] **Step 1: Escrever o smoke (o "teste" que falha)**

`packages/engine/scripts/smoke.ts`:
```ts
/**
 * Smoke do Node puro: carrega o motor sem bundler nem loader (type stripping do Node 24)
 * e joga partidas até o fim com a primeira ação legal. Roda no `pnpm check`.
 */
import { applyAction, createGame, legalActions, makeConfig, viewFor, type GameState } from '../src/index.ts';

const GAMES = 3;
const MAX_STEPS = 5_000;

for (let g = 0; g < GAMES; g += 1) {
  const created = createGame(makeConfig(), `smoke-${g}`, ['p1', 'p2']);
  if (!created.ok) throw new Error(created.error.message);
  let s: GameState = created.state;
  let steps = 0;
  while (s.phase.kind !== 'GAME_OVER') {
    if (steps >= MAX_STEPS) throw new Error(`a partida smoke-${g} não terminou em ${MAX_STEPS} passos`);
    const actor = s.players.map((p) => p.id).find((id) => legalActions(viewFor(s, id)).length > 0);
    if (!actor) throw new Error('ninguém pode agir');
    const result = applyAction(s, actor, legalActions(viewFor(s, actor))[0]);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    s = result.state;
    steps += 1;
  }
}
console.log(`smoke do motor ok: ${GAMES} partidas no Node puro`);
```

- [ ] **Step 2: Ver falhar no Node puro**

Run: `node packages/engine/scripts/smoke.ts`
Expected: FAIL com `ERR_MODULE_NOT_FOUND ... packages\engine\src\types` (o import sem extensão não resolve).

- [ ] **Step 3: Regra de ESLint contra import relativo sem `.ts` (ver falhar)**

`eslint.config.js`:
```js
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Import relativo sem `.ts` passa nos testes (Vite resolve) mas quebra o Node puro, que carrega os pacotes sem bundler. */
const relativeWithoutTs = String.raw`[source.value=/^\./]:not([source.value=/\.ts$/])`;

export default defineConfig(
  { ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].map((node) => ({
          selector: `${node}${relativeWithoutTs}`,
          message: 'Imports relativos precisam terminar em .ts (o Node carrega o código sem bundler).',
        })),
      ],
    },
  },
);
```

Run: `pnpm lint`
Expected: FAIL com dezenas de `Imports relativos precisam terminar em .ts`.

- [ ] **Step 4: Reescrever os imports relativos do motor**

Run (Git Bash, na raiz do worktree):
```bash
find packages/engine/src packages/engine/test -name '*.ts' -exec sed -i -E "s#(from '\.{1,2}/[^']+)';#\1.ts';#" {} +
```
Confira: `pnpm lint` passa sem erros. Imports de pacote (`vitest`, `fast-check`) não mudam.

- [ ] **Step 5: Flags do TypeScript**

`tsconfig.base.json` (substitui o arquivo):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "rewriteRelativeImportExtensions": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Em `packages/engine/tsconfig.json`, `"include"` passa a ser `["src", "test", "scripts", "vitest.config.ts"]`.

- [ ] **Step 6: Scripts de smoke e o check**

Em `packages/engine/package.json`, acrescente ao `scripts`: `"smoke": "node scripts/smoke.ts"`.
Em `package.json` (raiz), acrescente `"smoke": "pnpm -r smoke"` e troque o `check` por:
```json
"check": "pnpm lint && pnpm typecheck && pnpm -r test:coverage && pnpm smoke"
```

- [ ] **Step 7: Rodar tudo**

Run: `pnpm check`
Expected: lint e typecheck limpos, todos os testes do motor verdes (eram 128 na `main` de 2026-10-16), cobertura ≥ 90%, e a última linha `smoke do motor ok: 3 partidas no Node puro`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(engine): imports .ts e smoke no Node puro, sem bundler"
```

---

### Task 2: Portão automático (hooks, LF, CI e regras do repositório)

**Files:**
- Create: `.gitattributes`, `.github/workflows/check.yml`, `CLAUDE.md`
- Modify: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `pnpm check` da Tarefa 1.
- Produces: pre-commit e pre-push rodando `pnpm check`; CI `check` no GitHub; regras no `CLAUDE.md` que as próximas tarefas seguem.

- [ ] **Step 1: Fim de linha LF (commit próprio)**

```bash
printf '* text=auto eol=lf\n' > .gitattributes
git add .gitattributes
git add --renormalize .
git commit -m "chore: fim de linha LF no repositório"
```
Se o `--renormalize` não encontrar nada (o índice já está em LF), o commit leva só o `.gitattributes`. Por quê: o Git deste Windows usa `autocrlf=true`; sem isso, os snapshots das partidas de referência teriam CRLF aqui e LF na CI.

- [ ] **Step 2: Permitir o pacote no pnpm 11 e instalar o simple-git-hooks**

Acrescente ao fim de `pnpm-workspace.yaml`:
```yaml

# pnpm 11 recusa scripts de instalação não revisados (strictDepBuilds). Os hooks são instalados
# pelo `prepare` da raiz, então o postinstall do simple-git-hooks fica desligado.
allowBuilds:
  simple-git-hooks: false
```
Run: `pnpm add -D -w simple-git-hooks@^2.14.0`
Expected: instala sem `ERR_PNPM_IGNORED_BUILDS` (o `minimumReleaseAge` de 1 dia do pnpm 11 resolve para uma versão madura).

- [ ] **Step 3: Configurar os hooks**

Em `package.json` (raiz): acrescente `"prepare": "simple-git-hooks"` como primeiro script e, no nível de topo:
```json
"simple-git-hooks": {
  "pre-commit": "pnpm check",
  "pre-push": "pnpm check"
}
```
Run: `pnpm install`
Expected: `prepare: [INFO] Successfully set all git hooks`. Os hooks vão para o `.git/hooks` comum e valem para todas as pastas do repositório.

- [ ] **Step 4: Provar que o hook barra (teste negativo local)**

```bash
printf "import { expect, it } from 'vitest';\nit('quebrado de propósito', () => expect(1).toBe(2));\n" > packages/engine/test/quebrado.test.ts
git add packages/engine/test/quebrado.test.ts
git commit -m "não deve entrar"   # Expected: FAIL — o hook roda o check e o commit é abortado
git rm --cached -q packages/engine/test/quebrado.test.ts
rm packages/engine/test/quebrado.test.ts
git log --oneline -1               # Expected: o commit "não deve entrar" não existe
```

- [ ] **Step 5: CI**

`.github/workflows/check.yml`:
```yaml
name: check

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
```

- [ ] **Step 6: `CLAUDE.md` do projeto**

`CLAUDE.md` (raiz):
```markdown
# Jogo do Coringa — regras do repositório

## Portão de testes (sempre ligado)

- Rode `pnpm check` antes de commitar: lint, typecheck, testes com cobertura e o smoke no Node puro. Os hooks de pre-commit e pre-push (simple-git-hooks) rodam o mesmo comando.
- **Nunca** use `git commit --no-verify`, `git push --no-verify` nem `SKIP_SIMPLE_GIT_HOOKS=1`. Se o check falhar, corrija a causa.
- Trabalho em branch própria com PR para a `main`. A CI (`.github/workflows/check.yml`) roda `pnpm check` e tem que estar verde antes do merge, que é feito por squash no GitHub ou fast-forward (histórico limpo).
- Regra de evolução: quando o `pnpm check` passar de ~45 s, o pre-commit vira a versão rápida (lint, typecheck e `vitest related --run` nos arquivos alterados) e o pre-push mantém o check completo.
- Calibração (`pnpm sim:calibrate`) é job à parte e nunca entra no `pnpm check`.

## Node puro, sem bundler

O motor e o simulador rodam direto no Node 24 (type stripping). Por isso:

- Imports relativos terminam em `.ts`. O ESLint barra os que não terminam.
- Só sintaxe apagável (`erasableSyntaxOnly`): nada de `enum`, `namespace` ou parameter properties.
- Import só de tipo usa `import type` ou `type` inline (`verbatimModuleSyntax`).
- O Node recusa type stripping em arquivos dentro de `node_modules`. O `@coringa/engine` funciona porque o pnpm liga o pacote do workspace por symlink e o Node resolve o caminho real (`packages/engine/src/...`). **Nunca use `--preserve-symlinks`.**

## Partidas de referência

- Replays em `packages/engine/test/fixtures/golden-replays.json`; resumos em `packages/engine/test/__snapshots__/golden/`.
- Mudou o resultado de uma partida? Só aceite com `pnpm --filter @coringa/engine exec vitest run -u` depois de revisar o diff dos snapshots, e diga no commit qual regra mudou.
- Regravar os replays (ex.: depois de mudar a lista em `packages/sim/src/golden.ts`): `pnpm --filter @coringa/sim record-golden`.

## Idioma

- Mensagens, comentários e textos do jogo em pt-BR; identificadores de código em inglês.
```

- [ ] **Step 7: Commit (passa pelo hook)**

```bash
git add -A
git commit -m "chore: portão de testes (hooks, CI e regras do repositório)"
```
Expected: o hook roda `pnpm check` (verde) e o commit entra.

- [ ] **Step 8: Validar a CI de verdade**

Envie a branch e abra um PR **draft** para a `main` (autorizado até o MVP):
```bash
git push -u origin feat/sim
gh pr create --draft --base main --title "Simulador, bots e jogo no terminal (Plano 2)" --body "Plano: docs/superpowers/plans/2026-10-16-simulador-e-terminal.md"
```
Expected: o job `check` roda no PR e fica verde. Se falhar só na CI, corrija a causa antes de seguir (não pule a tarefa).

---

### Task 3: API do motor para bots e interface

**Files:**
- Create: `packages/engine/src/acting.ts`, `packages/engine/test/exports.test.ts`
- Modify: `packages/engine/src/combat.ts`, `packages/engine/src/index.ts`, `packages/engine/test/playout.ts` (só o import de `actingPlayers`)

**Interfaces:**
- Consumes: `seedRng`, `nextFloat`, `nextInt`, `shuffle` de `src/rng.ts`; `quadBonus`.
- Produces (exportados por `@coringa/engine`):
  - `actingPlayers(s: GameState): PlayerId[]`
  - `interface AttackSide { attackRow: NumCard[]; attackBuffs: SpecialCard[] }`, `interface DefenseSide { defenseRow: NumCard[]; defenseBuffs: SpecialCard[] }`
  - `attackBase(p: AttackSide): number`, `defenseBase(p: DefenseSide): number`
  - `attackPower(p: AttackSide, pressure: number): number` — `(soma + quadra) × (1 + nJ + pressão)`
  - `defensePower(p: DefenseSide): number` — `(soma + quadra) × (1 + nQ)`
  - `seedRng(seed: string): RngState`, `nextFloat(rng): number`, `nextInt(rng, max): number`, `shuffle<T>(rng, items): T[]`

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/engine/test/exports.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import * as engine from '../src/index.ts';
import { attackPower, defensePower } from '../src/combat.ts';
import { viewFor } from '../src/view.ts';
import type { GameState } from '../src/types.ts';
import { act, P1, P2, setup } from './helpers.ts';
import { playout } from './playout.ts';

describe('API para bots e interface', () => {
  it('exporta PRNG, quem age agora e o cálculo de ATK/DEF', () => {
    for (const name of ['seedRng', 'nextFloat', 'nextInt', 'shuffle', 'actingPlayers', 'attackPower', 'defensePower', 'attackBase', 'defenseBase']) {
      expect(typeof (engine as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('attackPower e defensePower funcionam sobre a visão pública (exemplo 1 da §1.13)', () => {
    const s = setup({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8] } });
    const view = viewFor(s, P1);
    expect(attackPower(view.self, view.pressure)).toBe(38);
    expect(defensePower(view.opponent)).toBe(13);
  });

  it('a pressão entra no multiplicador de ataque (exemplo 6) e a quadra soma antes dele (exemplo 4)', () => {
    const s = setup({ pressure: 2, p1: { attack: [4, 6], attackBuffs: ['J'] }, p2: { defense: [10, 3, 10, 10, 10], defenseBuffs: ['Q'] } });
    const view = viewFor(s, P2);
    expect(attackPower(view.opponent, view.pressure)).toBe(40);
    expect(defensePower(view.self)).toBe(106);
  });

  it('actingPlayers: os dois no Equipar, depois só quem falta; ninguém após o fim', () => {
    const s = setup({ phase: { kind: 'EQUIP' }, roundKind: 'EQUIP', p1: { pending: [5] }, p2: { pending: [6] } });
    expect(engine.actingPlayers(s)).toEqual([P1, P2]);
    const after = act(s, P1, { type: 'EQUIP', destinations: ['ATK'] }).state;
    expect(engine.actingPlayers(after)).toEqual([P2]);
    const over = act(after, 'system', { type: 'FORFEIT', loser: P2 }).state;
    expect(engine.actingPlayers(over)).toEqual([]);
  });

  it('a prévia de ATK/DEF bate com o DamageDealt de partidas reais', () => {
    let checked = 0;
    for (let i = 0; i < 30; i += 1) {
      playout({
        seed: `previa-${i}`,
        choices: [i, 7, 3, 11, 2],
        onStep: (before: GameState, _after, events) => {
          for (const e of events) {
            if (e.type !== 'DamageDealt') continue;
            const view = viewFor(before, e.attacker);
            expect(attackPower(view.self, view.pressure)).toBe(e.attack);
            expect(defensePower(view.opponent)).toBe(e.defense);
            checked += 1;
          }
        },
      });
    }
    expect(checked).toBeGreaterThan(30);
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/engine exec vitest run test/exports.test.ts`
Expected: FAIL — `attackPower` não existe em `../src/combat.ts`.

- [ ] **Step 3: `actingPlayers` no `src`**

`packages/engine/src/acting.ts` (mesma lógica que estava em `test/playout.ts`):
```ts
import type { GameState, PlayerId } from './types.ts';

/** Quem pode agir agora. No Equipar, quem ainda não confirmou; nas outras fases, um jogador ou ninguém. */
export function actingPlayers(s: GameState): PlayerId[] {
  const phase = s.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return s.players.filter((p) => !p.equipSubmitted).map((p) => p.id);
    case 'ORDER_CHOICE':
    case 'ATTACK_MAIN':
      return [phase.player];
    case 'REACTION':
      return [phase.responder];
    case 'GAME_OVER':
      return [];
  }
}
```

Em `packages/engine/test/playout.ts`, apague a função `actingPlayers` local e importe a do `src`, reexportando-a (o `properties.test.ts` importa de `./playout.ts`):
```ts
import { actingPlayers } from '../src/acting.ts';

export { actingPlayers };
```

- [ ] **Step 4: ATK/DEF estruturais em `combat.ts`**

Em `packages/engine/src/combat.ts`, acrescente `SpecialCard` ao `import type` de `./types.ts` e troque `attackBase`, `defenseBase`, `attackValue` e `defenseValue` por (o `resolveAttack` não muda):
```ts
/** Lado que ataca: basta a fileira e os buffs (serve para `PlayerState`, `PublicPlayer` e `SelfView`). */
export interface AttackSide {
  attackRow: NumCard[];
  attackBuffs: SpecialCard[];
}

/** Lado que defende: basta a fileira e os buffs. */
export interface DefenseSide {
  defenseRow: NumCard[];
  defenseBuffs: SpecialCard[];
}

export function attackBase(p: AttackSide): number {
  return sum(p.attackRow) + quadBonus(p.attackRow);
}

export function defenseBase(p: DefenseSide): number {
  return sum(p.defenseRow) + quadBonus(p.defenseRow);
}

/** ATK = (soma + bônus) × (1 + nJ + pressão) — spec §1.9. */
export function attackPower(p: AttackSide, pressure: number): number {
  return attackBase(p) * (1 + p.attackBuffs.length + pressure);
}

/** DEF = (soma + bônus) × (1 + nQ). */
export function defensePower(p: DefenseSide): number {
  return defenseBase(p) * (1 + p.defenseBuffs.length);
}

export function attackValue(s: GameState, p: PlayerState): number {
  return attackPower(p, s.pressure);
}

export function defenseValue(p: PlayerState): number {
  return defensePower(p);
}
```

- [ ] **Step 5: Exportar**

Acrescente ao fim de `packages/engine/src/index.ts`:
```ts
export { actingPlayers } from './acting.ts';
export { attackBase, attackPower, defenseBase, defensePower, type AttackSide, type DefenseSide } from './combat.ts';
export { nextFloat, nextInt, seedRng, shuffle } from './rng.ts';
```

- [ ] **Step 6: Ver passar**

Run: `pnpm --filter @coringa/engine exec vitest run`
Expected: PASS (todos, incluindo os 5 de `exports.test.ts`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(engine): actingPlayers, ATK/DEF estruturais e PRNG na API pública"
```

---

### Task 4: Playouts enviesados (Exódia, Absolutos, Reflect expirado)

**Files:**
- Create: `packages/engine/test/invariants.ts`, `packages/engine/test/biased.ts`, `packages/engine/test/biased.test.ts`
- Modify: `packages/engine/test/playout.ts`, `packages/engine/test/properties.test.ts`

**Interfaces:**
- Consumes: `actingPlayers` (Tarefa 3), `allCards` e `P1`/`P2` de `test/helpers.ts`.
- Produces (só para testes do motor):
  - `type Chooser = (legal: Action[], view: PlayerView, step: number) => Action`
  - `PlayoutOptions` ganha `initial?: GameState` e `chooser?: Chooser`
  - `checkInvariants(before, after, events): void`
  - `prefer(order: Action['type'][], opts?: { allDefense?: boolean }): Chooser`, `exodiaProfile`, `absolutesProfile`, `reflectExpiryProfile(reflector: string)`

- [ ] **Step 1: Extrair as invariantes**

Mova `checkInvariants` de `properties.test.ts` para `packages/engine/test/invariants.ts` (exportada, sem mudar a lógica):
```ts
import { totalCards } from '../src/deck.ts';
import { viewEvents, viewFor } from '../src/view.ts';
import type { GameEvent, GameState } from '../src/types.ts';
import { allCards } from './helpers.ts';

/** Invariantes da spec §5. Usa checagens simples (sem `expect`) porque roda em todo passo. */
export function checkInvariants(before: GameState, after: GameState, events: GameEvent[]): void {
  const cards = allCards(after);
  if (cards.length !== totalCards(after.config)) throw new Error(`cartas: ${cards.length}`);
  if (new Set(cards.map((c) => c.id)).size !== cards.length) throw new Error('carta duplicada');
  after.players.forEach((p, i) => {
    if (p.hp > before.players[i].hp) throw new Error('a vida aumentou');
  });
  for (const viewer of after.players) {
    const opponent = after.players.find((p) => p.id !== viewer.id);
    if (!opponent) throw new Error('sem oponente');
    const json = JSON.stringify(viewFor(after, viewer.id));
    if (json.includes('"rng"')) throw new Error('a visão expõe a semente');
    for (const c of [...opponent.hand, ...opponent.pending, ...after.deck]) {
      if (json.includes(`"${c.id}"`)) throw new Error(`vazamento na visão de ${viewer.id}: ${c.id}`);
    }
    for (const e of viewEvents(events, viewer.id)) {
      if (e.type === 'CardsDealt' && e.player !== viewer.id && e.cards) throw new Error('vazamento em CardsDealt');
    }
  }
}
```

Em `properties.test.ts`, apague a função local e os imports que só ela usava (`totalCards`, `viewEvents`, `GameEvent`, `GameState`, `allCards`), e importe `import { checkInvariants } from './invariants.ts';`.

- [ ] **Step 2: Escrever o teste (falhando)**

`packages/engine/test/biased.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/types.ts';
import { absolutesProfile, exodiaProfile, reflectExpiryProfile } from './biased.ts';
import { checkInvariants } from './invariants.ts';
import { playout, type Chooser } from './playout.ts';
import { P1 } from './helpers.ts';

const SEEDS = 40;

/** Joga SEEDS partidas com a política, checa as invariantes em todo passo e conta em quantas cada evento-alvo aconteceu. */
function reach(name: string, chooser: Chooser, targets: GameEvent['type'][]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(targets.map((t) => [t, 0]));
  for (let i = 0; i < SEEDS; i += 1) {
    const seen = new Set<string>();
    const { state } = playout({
      seed: `vies-${name}-${i}`,
      choices: [],
      chooser,
      onStep: (before, after, events) => {
        checkInvariants(before, after, events);
        for (const e of events) if (targets.includes(e.type)) seen.add(e.type);
      },
    });
    expect(state.phase.kind).toBe('GAME_OVER');
    for (const t of seen) counts[t] += 1;
  }
  return counts;
}

describe('playouts enviesados: caminhos raros sob as invariantes (spec §5)', () => {
  it('Exódia acontece e respeita as invariantes', () => {
    expect(reach('exodia', exodiaProfile, ['Exodia']).Exodia).toBeGreaterThan(0);
  });

  it('Ataque Absoluto e Defesa Absoluta acontecem e expiram', () => {
    const counts = reach('absolutos', absolutesProfile, ['AbsoluteAttack', 'AbsoluteDefenseStarted', 'AbsoluteDefenseEnded']);
    expect(counts.AbsoluteAttack).toBeGreaterThan(0);
    expect(counts.AbsoluteDefenseStarted).toBeGreaterThan(0);
    expect(counts.AbsoluteDefenseEnded).toBeGreaterThan(0);
  });

  it('Reflect expira quando o oponente não ataca', () => {
    expect(reach('reflect', reflectExpiryProfile(P1), ['ReflectExpired']).ReflectExpired).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Ver falhar**

Run: `pnpm --filter @coringa/engine exec vitest run test/biased.test.ts`
Expected: FAIL — `./biased.ts` não existe.

- [ ] **Step 4: `playout` com política e estado inicial**

`packages/engine/test/playout.ts` (substitui o arquivo):
```ts
import { actingPlayers } from '../src/acting.ts';
import { applyAction } from '../src/apply-action.ts';
import { makeConfig, type ConfigOverrides } from '../src/config.ts';
import { createGame } from '../src/create-game.ts';
import { legalActions } from '../src/legal-actions.ts';
import { viewFor } from '../src/view.ts';
import type { Action, GameEvent, GameState, PlayerId, PlayerView } from '../src/types.ts';
import { P1, P2 } from './helpers.ts';

export { actingPlayers };

/** Escolhe a jogada do ator entre as legais. `step` é o número do passo, útil para variar desempates. */
export type Chooser = (legal: Action[], view: PlayerView, step: number) => Action;

export interface PlayoutOptions {
  seed: string;
  /** Escolhas pseudo-aleatórias, reutilizadas em ciclo. */
  choices: number[];
  config?: ConfigOverrides;
  /** Estado inicial (ex.: cenário de `setup`). Sem ele, cria uma partida com `seed` e `config`. */
  initial?: GameState;
  /** Política de jogo. Sem ela, a ação vem de `choices`. */
  chooser?: Chooser;
  maxSteps?: number;
  /** A cada N passos o sistema envia TIMEOUT (0 = nunca). */
  timeoutEvery?: number;
  checkImmutability?: boolean;
  onStep?: (before: GameState, after: GameState, events: GameEvent[]) => void;
}

export function playout(options: PlayoutOptions): { state: GameState; steps: number } {
  let s: GameState;
  if (options.initial) {
    s = options.initial;
  } else {
    const created = createGame(makeConfig(options.config), options.seed, [P1, P2]);
    if (!created.ok) throw new Error(created.error.message);
    s = created.state;
  }
  const maxSteps = options.maxSteps ?? 20_000;
  const every = options.timeoutEvery ?? 0;
  let step = 0;
  while (s.phase.kind !== 'GAME_OVER' && step < maxSteps) {
    const choice = options.choices.length > 0 ? options.choices[step % options.choices.length] : step;
    let actor: PlayerId | 'system';
    let action: Action;
    if (every > 0 && step % every === every - 1) {
      actor = 'system';
      action = { type: 'TIMEOUT' };
    } else {
      const actors = actingPlayers(s);
      actor = actors[choice % actors.length];
      const view = viewFor(s, actor);
      const legal = legalActions(view);
      action = options.chooser ? options.chooser(legal, view, step) : legal[Math.floor(choice / actors.length) % legal.length];
    }
    const snapshot = options.checkImmutability ? JSON.stringify(s) : '';
    const result = applyAction(s, actor, action);
    if (options.checkImmutability && JSON.stringify(s) !== snapshot) {
      throw new Error('applyAction mutou o estado de entrada');
    }
    if (!result.ok) throw new Error(`ação legal rejeitada (${result.error.code}): ${JSON.stringify(action)}`);
    options.onStep?.(s, result.state, result.events);
    s = result.state;
    step += 1;
  }
  return { state: s, steps: step };
}
```

- [ ] **Step 5: Os perfis enviesados**

`packages/engine/test/biased.ts`:
```ts
import type { Action, Destination, PlayerView } from '../src/types.ts';
import type { Chooser } from './playout.ts';

type ActionType = Action['type'];

/** Quantas numéricas o Equipar manda para a Defesa (inclui trocar a última da Defesa). */
const defenseCount = (a: Action): number =>
  a.type === 'EQUIP' ? a.destinations.filter((d: Destination) => d === 'DEF' || d === 'REPLACE_LAST_DEF').length : 0;

/**
 * Política enviesada: joga o primeiro tipo de `order` que estiver disponível. Tipos fora de `order`
 * nunca são jogados; por isso `order` deve conter as ações de fechamento (EQUIP, CHOOSE_ORDER,
 * DECLARE_ATTACK, END_TURN, PASS). Desempates: maior PLAY_K; Equipar pela Defesa se `allDefense`;
 * senão varia com `step`.
 */
export function prefer(order: ActionType[], opts: { allDefense?: boolean } = {}): Chooser {
  return (legal, _view, step) => {
    for (const type of order) {
      const candidates = legal.filter((a) => a.type === type);
      if (candidates.length === 0) continue;
      if (type === 'PLAY_K') {
        return candidates.reduce((best, a) =>
          a.type === 'PLAY_K' && best.type === 'PLAY_K' && a.cardIds.length > best.cardIds.length ? a : best,
        );
      }
      if (type === 'EQUIP' && opts.allDefense) {
        return candidates.reduce((best, a) => (defenseCount(a) > defenseCount(best) ? a : best));
      }
      return candidates[step % candidates.length];
    }
    throw new Error(`nenhuma ação permitida entre: ${legal.map((a) => a.type).join(', ')}`);
  };
}

const CLOSE: ActionType[] = ['EQUIP', 'CHOOSE_ORDER', 'DECLARE_ATTACK', 'END_TURN', 'PASS'];

/** Exódia: ninguém usa A; os K saem todos de uma vez; numéricas na Defesa para os K durarem. */
export const exodiaProfile: Chooser = prefer(['PLAY_K', ...CLOSE], { allDefense: true });

/** Absolutos: J e Q (e Selvagens) sempre que der; ninguém destrói buffs. */
export const absolutesProfile: Chooser = prefer(['PLAY_J', 'PLAY_Q', ...CLOSE]);

/** Reflect expirado: `reflector` lança Reflect sempre que puder; o outro só monta Defesa e nunca anula. */
export function reflectExpiryProfile(reflector: string): Chooser {
  const caster = prefer(['REFLECT', ...CLOSE]);
  const turtle = prefer(CLOSE, { allDefense: true });
  return (legal, view: PlayerView, step) => (view.me === reflector ? caster : turtle)(legal, view, step);
}
```

- [ ] **Step 6: Ver passar e medir o tempo**

Run: `pnpm --filter @coringa/engine exec vitest run`
Expected: PASS. No protótipo, com 40 sementes por perfil: Exódia em 3 partidas, Ataque Absoluto em 5, Defesa Absoluta em 2, Reflect expirado em 4; o arquivo leva ~2–3 s. Se alguma mudança futura zerar um evento, ajuste o perfil, nunca o `toBeGreaterThan(0)`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(engine): playouts enviesados para Exódia, Absolutos e Reflect expirado"
```

---

### Task 5: Pacote `sim`, RNG dos bots, bot `random` e `runGame`

**Files:**
- Create: `packages/sim/package.json`, `packages/sim/tsconfig.json`, `packages/sim/vitest.config.ts`, `packages/sim/src/rng.ts`, `packages/sim/src/bots/types.ts`, `packages/sim/src/bots/random.ts`, `packages/sim/src/match.ts`, `packages/sim/src/smoke.ts`, `packages/sim/test/match.test.ts`
- Modify: `.gitignore`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `actingPlayers`, `applyAction`, `createGame`, `legalActions`, `viewFor`, `seedRng`, `nextFloat`, `nextInt` de `@coringa/engine`.
- Produces:
  - `interface Rng { next(): number; int(max: number): number; pick<T>(items: readonly T[]): T }`, `createRng(seed: string): Rng`
  - `type Bot = (view: PlayerView, legal: Action[], rng: Rng) => Action`; `BOT_NAMES = ['random', 'greedy', 'turtle']`; `type BotName`
  - `randomBot: Bot`
  - `PLAYERS: [PlayerId, PlayerId]` (`['p1', 'p2']`), `newGame(config, seed): GameState`, `attackRoundsUpTo(round): number`
  - `interface ReplayStep { player: PlayerId | 'system'; action: Action }`
  - `interface GameSetup { config; seed; bots: [Bot, Bot]; botSeed?; initial?: GameState; record?: boolean; maxSteps?: number; onStep?: (before, after, events) => void | 'stop' }`
  - `interface GameRecord { seed; initialInitiative; result: GameResult | null; finalState; steps; attackRounds; eventCounts; orderChoices: { first; second }; replay?: ReplayStep[] }`
  - `runGame(setup: GameSetup): GameRecord`

- [ ] **Step 1: Criar o pacote**

`packages/sim/package.json`:
```json
{
  "name": "@coringa/sim",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "smoke": "node src/smoke.ts",
    "record-golden": "node src/cli/record-golden.ts"
  },
  "dependencies": {
    "@coringa/engine": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@vitest/coverage-v8": "^5.0.0",
    "typescript": "~6.0.3",
    "vite": "^8.3.4",
    "vitest": "^5.0.0"
  }
}
```

`packages/sim/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "test", "vitest.config.ts"]
}
```

`packages/sim/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/cli/**', 'src/smoke.ts'],
      thresholds: { lines: 90, branches: 80 },
    },
  },
});
```

Acrescente ao `.gitignore`:
```
packages/sim/reports/sim-*.json
```
Run: `pnpm install` — Expected: liga `@coringa/engine` em `packages/sim/node_modules/@coringa/engine`.

- [ ] **Step 2: Escrever o teste (falhando)**

`packages/sim/test/match.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { makeConfig } from '@coringa/engine';
import { randomBot } from '../src/bots/random.ts';
import { attackRoundsUpTo, PLAYERS, runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';

describe('createRng', () => {
  it('a mesma semente dá a mesma sequência; sementes diferentes, sequências diferentes', () => {
    const seq = (seed: string) => {
      const rng = createRng(seed);
      return Array.from({ length: 5 }, () => rng.int(1000));
    };
    expect(seq('a')).toEqual(seq('a'));
    expect(seq('a')).not.toEqual(seq('b'));
  });

  it('pick escolhe um elemento da lista e recusa lista vazia', () => {
    const rng = createRng('pick');
    for (let i = 0; i < 50; i += 1) expect(['x', 'y', 'z']).toContain(rng.pick(['x', 'y', 'z']));
    expect(() => rng.pick([])).toThrow();
  });
});

describe('runGame', () => {
  const config = makeConfig();

  it('joga até o fim e registra resultado, rodadas e eventos', () => {
    const r = runGame({ config, seed: 's1', bots: [randomBot, randomBot] });
    expect(r.result).not.toBeNull();
    expect(r.finalState.phase.kind).toBe('GAME_OVER');
    expect(r.attackRounds).toBe(attackRoundsUpTo(r.finalState.round));
    expect(r.eventCounts.GameOver).toBe(1);
    expect(PLAYERS).toContain(r.initialInitiative);
  });

  it('é reprodutível: mesma semente de partida e de bots → mesma partida', () => {
    const a = runGame({ config, seed: 's2', bots: [randomBot, randomBot] });
    const b = runGame({ config, seed: 's2', bots: [randomBot, randomBot] });
    expect(b.finalState).toEqual(a.finalState);
    const c = runGame({ config, seed: 's2', bots: [randomBot, randomBot], botSeed: 'outra' });
    expect(c.finalState).not.toEqual(a.finalState);
  });

  it('com record, guarda uma ação por passo', () => {
    const r = runGame({ config, seed: 's3', bots: [randomBot, randomBot], record: true });
    expect(r.replay).toHaveLength(r.steps);
  });

  it("onStep pode parar a simulação ('stop') e o resultado fica null", () => {
    const r = runGame({ config, seed: 's4', bots: [randomBot, randomBot], onStep: () => 'stop' });
    expect(r.steps).toBe(1);
    expect(r.result).toBeNull();
  });

  it('estourar maxSteps conta como partida que não terminou', () => {
    expect(runGame({ config, seed: 's5', bots: [randomBot, randomBot], maxSteps: 3 }).result).toBeNull();
  });

  it('continua de um estado inicial (ramos dos experimentos)', () => {
    const middle = runGame({ config, seed: 's6', bots: [randomBot, randomBot], maxSteps: 10 }).finalState;
    const r = runGame({ config, seed: 's6', bots: [randomBot, randomBot], initial: middle });
    expect(r.finalState.phase.kind).toBe('GAME_OVER');
    expect(r.initialInitiative).toBe(middle.initiative);
  });

  it('ação ilegal de bot é bug e lança exceção', () => {
    expect(() => runGame({ config, seed: 's7', bots: [() => ({ type: 'PASS' }), randomBot] })).toThrow(/ação ilegal/);
  });

  it('attackRoundsUpTo segue o ciclo E, E, A, E, A', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(attackRoundsUpTo)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
});
```

- [ ] **Step 3: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run`
Expected: FAIL — `../src/bots/random.ts` não existe.

- [ ] **Step 4: Implementar**

`packages/sim/src/rng.ts`:
```ts
import { nextFloat, nextInt, seedRng } from '@coringa/engine';

/** Gerador com semente própria dos bots e experimentos. Nunca o da partida, nunca `Math.random`. */
export interface Rng {
  /** Número em [0, 1). */
  next(): number;
  /** Inteiro em [0, max). */
  int(max: number): number;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: string): Rng {
  const state = seedRng(seed);
  return {
    next: () => nextFloat(state),
    int: (max) => nextInt(state, max),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick em lista vazia');
      return items[nextInt(state, items.length)];
    },
  };
}
```

`packages/sim/src/bots/types.ts`:
```ts
import type { Action, PlayerView } from '@coringa/engine';
import type { Rng } from '../rng.ts';

/** Spec §3: um bot só vê a própria visão e a lista de ações legais; devolve uma delas. */
export type Bot = (view: PlayerView, legal: Action[], rng: Rng) => Action;

export const BOT_NAMES = ['random', 'greedy', 'turtle'] as const;
export type BotName = (typeof BOT_NAMES)[number];
```

`packages/sim/src/bots/random.ts`:
```ts
import type { Bot } from './types.ts';

export const randomBot: Bot = (_view, legal, rng) => rng.pick(legal);
```

`packages/sim/src/match.ts`:
```ts
import {
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  viewFor,
  type Action,
  type GameEvent,
  type GameResult,
  type GameState,
  type PlayerId,
  type RulesConfig,
} from '@coringa/engine';
import type { Bot } from './bots/types.ts';
import { createRng, type Rng } from './rng.ts';

export const PLAYERS: [PlayerId, PlayerId] = ['p1', 'p2'];

export interface ReplayStep {
  player: PlayerId | 'system';
  action: Action;
}

export interface GameSetup {
  config: RulesConfig;
  /** Semente da partida (embaralhamento e iniciativa). */
  seed: string;
  /** bots[0] joga como p1, bots[1] como p2. */
  bots: [Bot, Bot];
  /** Semente das escolhas dos bots; padrão `${seed}/bots`. Cada assento recebe a sua. */
  botSeed?: string;
  /** Continua deste estado em vez de criar a partida (ramos dos experimentos). */
  initial?: GameState;
  /** Guarda as ações para replay. */
  record?: boolean;
  /** Padrão 5000. Estourar conta como partida que não terminou. */
  maxSteps?: number;
  /** Chamado a cada ação; devolver 'stop' encerra a simulação ali (resultado null). */
  onStep?: (before: GameState, after: GameState, events: GameEvent[]) => void | 'stop';
}

export interface GameRecord {
  seed: string;
  /** Quem tinha a iniciativa ao criar a partida (sorteio do motor). */
  initialInitiative: PlayerId;
  /** null = não terminou (maxSteps ou parada pelo onStep). */
  result: GameResult | null;
  finalState: GameState;
  steps: number;
  /** Rodadas de Ataque iniciadas (spec §1.3). */
  attackRounds: number;
  eventCounts: Partial<Record<GameEvent['type'], number>>;
  orderChoices: { first: number; second: number };
  replay?: ReplayStep[];
}

/** Rodadas de Ataque até a rodada `round`, pelo ciclo E, E, A, E, A, … */
export const attackRoundsUpTo = (round: number): number => (round < 3 ? 0 : Math.floor((round - 1) / 2));

export function newGame(config: RulesConfig, seed: string): GameState {
  const created = createGame(config, seed, PLAYERS);
  if (!created.ok) throw new Error(`${created.error.code}: ${created.error.message}`);
  return created.state;
}

/** Joga uma partida bot × bot até o fim. Ação ilegal de bot é bug: lança exceção. */
export function runGame(setup: GameSetup): GameRecord {
  let s = setup.initial ?? newGame(setup.config, setup.seed);
  const botSeed = setup.botSeed ?? `${setup.seed}/bots`;
  const rngs: [Rng, Rng] = [createRng(`${botSeed}/p1`), createRng(`${botSeed}/p2`)];
  const maxSteps = setup.maxSteps ?? 5_000;
  const record: GameRecord = {
    seed: setup.seed,
    initialInitiative: s.initiative,
    result: null,
    finalState: s,
    steps: 0,
    attackRounds: 0,
    eventCounts: {},
    orderChoices: { first: 0, second: 0 },
    replay: setup.record ? [] : undefined,
  };
  while (s.phase.kind !== 'GAME_OVER' && record.steps < maxSteps) {
    const actor = actingPlayers(s)[0];
    const seat = actor === PLAYERS[0] ? 0 : 1;
    const view = viewFor(s, actor);
    const action = setup.bots[seat](view, legalActions(view), rngs[seat]);
    const result = applyAction(s, actor, action);
    if (!result.ok) throw new Error(`bot jogou ação ilegal (${result.error.code}): ${JSON.stringify(action)}`);
    record.replay?.push({ player: actor, action });
    for (const e of result.events) {
      record.eventCounts[e.type] = (record.eventCounts[e.type] ?? 0) + 1;
      if (e.type === 'OrderChosen') record.orderChoices[e.first ? 'first' : 'second'] += 1;
    }
    record.steps += 1;
    const stop = setup.onStep?.(s, result.state, result.events);
    s = result.state;
    if (stop === 'stop') break;
  }
  record.finalState = s;
  record.attackRounds = attackRoundsUpTo(s.round);
  record.result = s.phase.kind === 'GAME_OVER' ? s.phase.result : null;
  return record;
}
```

- [ ] **Step 5: Smoke do simulador (versão inicial)**

`packages/sim/src/smoke.ts`:
```ts
/** Smoke do simulador no Node puro (roda no `pnpm check`): carrega os módulos sem bundler e joga partidas. */
import { makeConfig } from '@coringa/engine';
import { randomBot } from './bots/random.ts';
import { runGame } from './match.ts';

const started = performance.now();
for (let i = 0; i < 5; i += 1) {
  const r = runGame({ config: makeConfig(), seed: `smoke-${i}`, bots: [randomBot, randomBot] });
  if (!r.result) throw new Error(`smoke: a partida smoke-${i} não terminou`);
}
console.log(`smoke do simulador ok: 5 partidas em ${((performance.now() - started) / 1000).toFixed(1)} s`);
```

- [ ] **Step 6: Ver passar**

Run: `pnpm check`
Expected: PASS; o smoke imprime `smoke do simulador ok: 5 partidas ...`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sim): pacote do simulador, RNG dos bots, bot random e runGame"
```

---

### Task 6: Bot `greedy`

**Files:**
- Create: `packages/sim/src/bots/eval.ts`, `packages/sim/src/bots/greedy.ts`, `packages/sim/test/greedy.test.ts`

**Interfaces:**
- Consumes: `attackPower`, `defensePower`, `attackBase`, `defenseBase` (Tarefa 3); `Bot`, `Rng` (Tarefa 5); `setup`, `P1`, `P2`, `PlayerSetup` de `packages/engine/test/helpers.ts` (só nos testes: o builder de cenários do motor monta estados reais sem inventar cartas).
- Produces:
  - `eval.ts`: `upcomingPressure(view)`, `net(attacker, defender, pressure)`, `hpDamage(attacker, defender, pressure, buffLimit)`, `reflectedDamage(attacker, pressure)`, `boardScore(self, opponent, pressure)`, `placeAll(p, pending, destinations)`, `without(p, id)`, `count(hand, kind)`, `canCastReflect(view)`, `wildsUsed(action, hand)`, `best(items, score, pickTie)`
  - `greedy.ts`: `GREEDY` (limiares), `prefersFirst(view): boolean`, `targetValue(view, targetId): number`, `greedyBot: Bot`

Prioridades do `greedy` na fase principal (uma ação por chamada; o motor chama de novo até `DECLARE_ATTACK`/`END_TURN`): 1. Exódia; 2. proteção contra Reflect antes de um ataque que doeria; 3. Ressurreição; 4. Reflect contra ataque alto; 5. Armadilha na maior ameaça (com o próprio Reflect ativo, o J do oponente vale 0); 6. Sacrifício quando o buff dele vale mais; 7. K na Guarda (guarda 1 K se ainda dá Reflect); 8. J/Q onde há fileira; 9. fecha o turno. Equipar: maximiza `boardScore` no próximo ataque. Ordem: 1º com letal ou com Reflect contra ataque forte; senão 1º só se estiver atrás em vida.

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/sim/test/greedy.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { legalActions, makeConfig, viewFor, type Action, type GameState, type PlayerId } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P1, P2, setup, type PlayerSetup } from '../../engine/test/helpers.ts';
import { GREEDY, greedyBot, prefersFirst } from '../src/bots/greedy.ts';
import type { Bot } from '../src/bots/types.ts';
import { runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';

const decide = (bot: Bot, s: GameState, who: PlayerId = P1): Action => {
  const view = viewFor(s, who);
  return bot(view, legalActions(view), createRng('teste'));
};

describe('greedy', () => {
  it('só joga ações legais e a partida termina (20 partidas)', () => {
    const checked: Bot = (view, legal, rng) => {
      const action = greedyBot(view, legal, rng);
      expect(legal).toContainEqual(action);
      return action;
    };
    for (let i = 0; i < 20; i += 1) {
      expect(runGame({ config: makeConfig(), seed: `legal-greedy-${i}`, bots: [checked, checked] }).result).not.toBeNull();
    }
  });

  it('completa a Exódia jogando todos os K de uma vez', () => {
    const s = setup({ p1: { hand: ['K', 'K'], guard: 2, attack: [5] } });
    const action = decide(greedyBot, s);
    expect(action.type).toBe('PLAY_K');
    expect(action.type === 'PLAY_K' && action.cardIds).toHaveLength(2);
  });

  it('quebra um K com A na janela da jogada que completaria a Exódia', () => {
    const s = setup({
      p1: { hand: ['A'] },
      p2: { guard: 4 },
      phase: { kind: 'REACTION', responder: P1, trigger: 'K_PLAYED' },
    });
    const action = decide(greedyBot, s);
    expect(action.type).toBe('TRAP');
  });

  it('no Equipar, manda a numérica para a fileira que mais rende (J no Ataque → Ataque; 2 Q na Defesa → Defesa)', () => {
    const opponent: PlayerSetup = { attack: [10, 10], attackBuffs: ['J'] };
    const base = { phase: { kind: 'EQUIP' } as const, roundKind: 'EQUIP' as const, p2: opponent };
    const comJ = setup({ ...base, p1: { pending: [9], attack: [2], attackBuffs: ['J'] } });
    expect(decide(greedyBot, comJ)).toEqual({ type: 'EQUIP', destinations: ['ATK'] });
    const comQ = setup({ ...base, p1: { pending: [9], defense: [2], defenseBuffs: ['Q', 'Q'] } });
    expect(decide(greedyBot, comQ)).toEqual({ type: 'EQUIP', destinations: ['DEF'] });
  });

  it('lança Reflect quando o ataque do oponente é alto', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'], attack: [2] }, p2: { attack: [10, 10, 10], attackBuffs: ['J', 'J'] } });
    expect(decide(greedyBot, s).type).toBe('REFLECT');
  });

  it('sacrifica J quando o J do oponente vale mais que o próprio', () => {
    const s = setup({ p1: { hand: ['J'], attack: [2] }, p2: { attack: [10, 9, 8], attackBuffs: ['J'] } });
    expect(decide(greedyBot, s).type).toBe('SACRIFICE');
  });

  it('na reação a um ataque, usa A no J que mais reduz o dano', () => {
    const s = setup({
      p1: { hand: ['A'], defense: [10] },
      p2: { attack: [10, 10], attackBuffs: ['J'] },
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      turnOrder: [P2, P1],
    });
    const view = viewFor(s, P1);
    const action = decide(greedyBot, s);
    expect(action.type).toBe('TRAP');
    expect(action.type === 'TRAP' && view.opponent.attackBuffs.map((c) => c.id)).toContain(action.type === 'TRAP' && action.targetId);
    expect(GREEDY.trapReaction).toBe(10);
  });

  it('passa na reação quando a Armadilha evitaria pouco dano', () => {
    const s = setup({
      p1: { hand: ['A'], defense: [10] },
      p2: { attack: [3, 2], attackBuffs: ['J'] },
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      turnOrder: [P2, P1],
    });
    expect(decide(greedyBot, s)).toEqual({ type: 'PASS' });
  });

  it('Escolha da ordem: 1º com dano letal; 2º quando à frente sem letal; 1º quando atrás', () => {
    const order = { phase: { kind: 'ORDER_CHOICE', player: P1 } as const };
    expect(prefersFirst(viewFor(setup({ ...order, p1: { attack: [10, 10] }, p2: { hp: 15 } }), P1))).toBe(true);
    expect(prefersFirst(viewFor(setup({ ...order, p1: { hp: 90, attack: [2] }, p2: { hp: 80 } }), P1))).toBe(false);
    expect(prefersFirst(viewFor(setup({ ...order, p1: { hp: 50, attack: [2] }, p2: { hp: 80 } }), P1))).toBe(true);
  });

  it('é determinístico para a mesma semente de bot', () => {
    const a = runGame({ config: makeConfig(), seed: 'det', bots: [greedyBot, greedyBot] });
    const b = runGame({ config: makeConfig(), seed: 'det', bots: [greedyBot, greedyBot] });
    expect(b.finalState).toEqual(a.finalState);
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run test/greedy.test.ts`
Expected: FAIL — `../src/bots/greedy.ts` não existe.

- [ ] **Step 3: Avaliação de mesa**

`packages/sim/src/bots/eval.ts`:
```ts
import {
  attackBase,
  attackPower,
  defenseBase,
  defensePower,
  type Action,
  type Destination,
  type NumCard,
  type PlayerView,
  type PublicPlayer,
  type SpecialCard,
} from '@coringa/engine';

/** Pressão do próximo ataque: a fixada, na rodada de Ataque; no Equipar, a que será fixada (spec §1.11). */
export function upcomingPressure(view: PlayerView): number {
  if (view.roundKind === 'ATTACK') return view.pressure;
  return view.config.tablePressure ? view.noDamageStreak : 0;
}

/** ATK − DEF sem K, Reflect nem Absolutos (o "líquido" da spec §1.9, passo 6). */
export function net(attacker: PublicPlayer, defender: PublicPlayer, pressure: number): number {
  return Math.max(0, attackPower(attacker, pressure) - defensePower(defender));
}

/** Vida que o defensor perderia se o atacante atacasse agora (spec §1.9, passos 3 a 6). */
export function hpDamage(attacker: PublicPlayer, defender: PublicPlayer, pressure: number, buffLimit: number): number {
  if (attacker.attackRow.length === 0 || defender.reflect) return 0;
  const absolute = attacker.attackBuffs.length >= buffLimit;
  if (defender.absoluteDefense && !absolute) return 0;
  if (!absolute && defender.guard.length > 0) return 0;
  return net(attacker, defender, pressure);
}

/** Dano que o atacante levaria batendo num Reflect (spec §1.6). */
export function reflectedDamage(attacker: PublicPlayer, pressure: number): number {
  if (attacker.attackRow.length === 0 || attacker.absoluteDefense) return 0;
  return Math.max(0, attackPower(attacker, pressure) - Math.floor(defenseBase(attacker) / 2));
}

/** Avaliação de mesa: o quanto eu passo da defesa dele menos o quanto ele passa da minha. */
export function boardScore(self: PublicPlayer, opponent: PublicPlayer, pressure: number): number {
  return net(self, opponent, pressure) - net(opponent, self, pressure);
}

/** Campo depois de aplicar os destinos do Equipar às numéricas `pending`, na ordem de compra. */
export function placeAll<T extends PublicPlayer>(p: T, pending: NumCard[], destinations: Destination[]): T {
  const attackRow = [...p.attackRow];
  const defenseRow = [...p.defenseRow];
  pending.forEach((card, i) => {
    const d = destinations[i];
    if (d === 'ATK') attackRow.push(card);
    else if (d === 'DEF') defenseRow.push(card);
    else if (d === 'REPLACE_LAST_ATK') attackRow[attackRow.length - 1] = card;
    else if (d === 'REPLACE_LAST_DEF') defenseRow[defenseRow.length - 1] = card;
  });
  return { ...p, attackRow, defenseRow };
}

/** Sem o card `id` nos buffs e na Guarda (efeito de uma Armadilha ou Sacrifício). */
export function without<T extends PublicPlayer>(p: T, id: string): T {
  const keep = (cards: SpecialCard[]) => cards.filter((c) => c.id !== id);
  return { ...p, attackBuffs: keep(p.attackBuffs), defenseBuffs: keep(p.defenseBuffs), guard: keep(p.guard) };
}

export const count = (hand: SpecialCard[], kind: SpecialCard['kind']): number => hand.filter((c) => c.kind === kind).length;

/** Dá para lançar um Reflect (K + J + Q, com Selvagens no papel de J/Q)? */
export function canCastReflect(view: PlayerView): boolean {
  const hand = view.self.hand;
  const [k, j, q, w] = [count(hand, 'K'), count(hand, 'J'), count(hand, 'Q'), count(hand, 'WILD')];
  return !view.self.reflect && k > 0 && j + w > 0 && q + w > 0 && j + q + w >= 2;
}

/** Quantos Selvagens a jogada gasta: desempate para guardar o Selvagem, que é mais flexível. */
export function wildsUsed(action: Action, hand: SpecialCard[]): number {
  const ids = Object.values(action).flat().filter((v): v is string => typeof v === 'string');
  return hand.filter((c) => c.kind === 'WILD' && ids.includes(c.id)).length;
}

/** O melhor elemento por `score`; empates resolvidos por `pickTie`. */
export function best<T>(items: readonly T[], score: (item: T) => number, pickTie: (ties: T[]) => T): T {
  let top = -Infinity;
  let ties: T[] = [];
  for (const item of items) {
    const value = score(item);
    if (value > top) {
      top = value;
      ties = [item];
    } else if (value === top) {
      ties.push(item);
    }
  }
  return pickTie(ties);
}

export { attackBase, defenseBase };
```

- [ ] **Step 4: O bot**

`packages/sim/src/bots/greedy.ts`:
```ts
import type { Action, PlayerView, ReactionTrigger } from '@coringa/engine';
import type { Rng } from '../rng.ts';
import {
  attackBase,
  best,
  boardScore,
  canCastReflect,
  defenseBase,
  hpDamage,
  placeAll,
  reflectedDamage,
  upcomingPressure,
  wildsUsed,
  without,
} from './eval.ts';
import type { Bot } from './types.ts';

/** Limiares das heurísticas (spec §3). Mudar um deles muda o bot, não a regra. */
export const GREEDY = {
  /** Dano refletido a partir do qual vale anular ou se proteger de um Reflect. */
  reflectThreat: 10,
  /** Valor mínimo do alvo para gastar A na fase principal (abaixo disso, guarda para reação). */
  trapMain: 12,
  /** Dano evitado mínimo para gastar A na reação a um ataque. */
  trapReaction: 10,
  /** Dano que o oponente levaria do próprio ataque a partir do qual vale lançar Reflect. */
  reflectAttack: 30,
} as const;

type Of<T extends Action['type']> = Extract<Action, { type: T }>;
const ofType = <T extends Action['type']>(legal: Action[], type: T): Of<T>[] =>
  legal.filter((a): a is Of<T> => a.type === type);

/** Entre jogadas equivalentes, a que gasta menos Selvagens; depois, sorteio. */
function cheapest<A extends Action>(actions: A[], view: PlayerView, rng: Rng): A {
  return best(actions, (a) => -wildsUsed(a, view.self.hand), (ties) => rng.pick(ties));
}

function closing(legal: Action[]): Action {
  const end = legal.find((a) => a.type === 'DECLARE_ATTACK' || a.type === 'END_TURN');
  if (!end) throw new Error('fase principal sem DECLARE_ATTACK/END_TURN');
  return end;
}

/** Equipar: os destinos que maximizam a avaliação de mesa no próximo ataque. */
function chooseEquip(view: PlayerView, legal: Action[], rng: Rng): Action {
  const pressure = upcomingPressure(view);
  return best(
    ofType(legal, 'EQUIP'),
    (a) => boardScore(placeAll(view.self, view.self.pending, a.destinations), view.opponent, pressure),
    (ties) => rng.pick(ties),
  );
}

/** Escolha da ordem pela situação de vida: 1º com letal ou com Reflect contra um ataque forte; senão, 1º só se estiver atrás. */
export function prefersFirst(view: PlayerView): boolean {
  const { self, opponent, pressure, config } = view;
  if (hpDamage(self, opponent, pressure, config.buffLimit) >= opponent.hp) return true;
  if (canCastReflect(view) && reflectedDamage(opponent, pressure) >= GREEDY.reflectAttack) return true;
  return self.hp < opponent.hp;
}

/** Valor de destruir um J/Q/K do oponente (A na maior ameaça). Com o meu Reflect ativo, o J dele não vale nada: quanto mais forte o ataque, mais ele leva de volta. */
export function targetValue(view: PlayerView, targetId: string): number {
  const { self, opponent, config, pressure } = view;
  if (opponent.guard.some((c) => c.id === targetId)) {
    if (opponent.guard.length >= config.exodiaGuard - 1) return 1000;
    return opponent.guard.length === 1 ? hpDamage(self, without(opponent, targetId), pressure, config.buffLimit) : 0;
  }
  if (opponent.attackBuffs.some((c) => c.id === targetId)) {
    if (self.reflect) return 0;
    return attackBase(opponent) + (opponent.attackBuffs.length >= config.buffLimit ? 100 : 0);
  }
  return defenseBase(opponent);
}

function mainPhase(view: PlayerView, legal: Action[], rng: Rng): Action {
  const { self, opponent, config, pressure } = view;
  const kings = ofType(legal, 'PLAY_K');
  const allKings = kings.at(-1);
  // 1. Exódia: se os K da mão completam a Guarda, joga todos.
  if (allKings && self.guard.length + allKings.cardIds.length >= config.exodiaGuard) return allKings;
  // 2. Proteção contra o Reflect do oponente antes de um ataque que doeria.
  const protect = ofType(legal, 'PROTECT_FROM_REFLECT')[0];
  if (protect && self.attackRow.length > 0) {
    const reflected = reflectedDamage(self, pressure);
    if (reflected >= GREEDY.reflectThreat || reflected >= self.hp) return protect;
  }
  // 3. Ressurreição: sempre, no lugar que mais melhora a mesa.
  const resurrections = ofType(legal, 'RESURRECT');
  if (resurrections.length > 0) {
    return best(
      resurrections,
      (a) => {
        const card = view.graveyard.find((c) => c.id === a.cardId);
        return card?.kind === 'NUM' ? boardScore(placeAll(self, [card], [a.row]), opponent, pressure) : -Infinity;
      },
      (ties) => rng.pick(ties),
    );
  }
  // 4. Reflect quando o ataque do oponente é alto.
  const reflects = ofType(legal, 'REFLECT');
  if (reflects.length > 0 && reflectedDamage(opponent, pressure) >= GREEDY.reflectAttack) return cheapest(reflects, view, rng);
  // 5. Armadilha na maior ameaça, se valer gastar o A agora.
  const traps = ofType(legal, 'TRAP');
  if (traps.length > 0) {
    const trap = best(traps, (a) => targetValue(view, a.targetId) - wildsUsed(a, self.hand) / 2, (ties) => rng.pick(ties));
    if (targetValue(view, trap.targetId) >= GREEDY.trapMain) return trap;
  }
  // 6. Sacrifício quando o buff do oponente vale mais que o meu (nunca o J dele com o meu Reflect ativo).
  const sacrifices = ofType(legal, 'SACRIFICE');
  const worth = sacrifices.filter((s) =>
    opponent.attackBuffs.some((c) => c.id === s.targetId)
      ? !self.reflect && attackBase(opponent) > attackBase(self)
      : defenseBase(opponent) > defenseBase(self),
  );
  if (worth.length > 0) return cheapest(worth, view, rng);
  // 7. Guarda: joga os K, guardando um enquanto der para montar um Reflect.
  const playable = kings.length - (canCastReflect(view) ? 1 : 0);
  if (playable > 0) return kings[playable - 1];
  // 8. Buffs onde há fileira para multiplicar.
  const js = ofType(legal, 'PLAY_J');
  if (js.length > 0 && self.attackRow.length > 0) return cheapest(js, view, rng);
  const qs = ofType(legal, 'PLAY_Q');
  if (qs.length > 0 && self.defenseRow.length > 0) return cheapest(qs, view, rng);
  return closing(legal);
}

function reaction(view: PlayerView, legal: Action[], trigger: ReactionTrigger, rng: Rng): Action {
  const { self, opponent, config, pressure } = view;
  const pass: Action = { type: 'PASS' };
  if (trigger === 'REFLECT_PLAYED') {
    if (self.attackRow.length === 0 || reflectedDamage(self, pressure) < GREEDY.reflectThreat) return pass;
    const cancels = ofType(legal, 'CANCEL_REFLECT');
    if (cancels.length > 0) return cheapest(cancels, view, rng);
    return ofType(legal, 'PROTECT_FROM_REFLECT')[0] ?? pass;
  }
  const traps = ofType(legal, 'TRAP');
  if (traps.length === 0) return pass;
  if (trigger === 'K_PLAYED') {
    return opponent.guard.length >= config.exodiaGuard - 1 ? cheapest(traps, view, rng) : pass;
  }
  // ATTACK: a Armadilha que mais reduz o dano que vou levar.
  const incoming = hpDamage(opponent, self, pressure, config.buffLimit);
  const after = (a: Of<'TRAP'>) => hpDamage(without(opponent, a.targetId), self, pressure, config.buffLimit);
  const trap = best(traps, (a) => incoming - after(a) - wildsUsed(a, self.hand) / 2, (ties) => rng.pick(ties));
  const saved = incoming - after(trap);
  const savesLife = incoming >= self.hp && after(trap) < self.hp;
  return saved >= GREEDY.trapReaction || savesLife ? trap : pass;
}

export const greedyBot: Bot = (view, legal, rng) => {
  const phase = view.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return chooseEquip(view, legal, rng);
    case 'ORDER_CHOICE':
      return { type: 'CHOOSE_ORDER', first: prefersFirst(view) };
    case 'ATTACK_MAIN':
      return mainPhase(view, legal, rng);
    case 'REACTION':
      return reaction(view, legal, phase.trigger, rng);
    case 'GAME_OVER':
      throw new Error('bot chamado depois do fim da partida');
  }
};
```

- [ ] **Step 5: Ver passar**

Run: `pnpm --filter @coringa/sim exec vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(sim): bot greedy com as heurísticas da spec §3"
```

---

### Task 7: Bot `turtle` e registro dos bots

**Files:**
- Create: `packages/sim/src/bots/turtle.ts`, `packages/sim/src/bots/index.ts`, `packages/sim/test/bots.test.ts`

**Interfaces:**
- Consumes: `greedyBot`, `best`, `defenseBase`, `placeAll` (Tarefa 6).
- Produces: `turtleBot: Bot`; `BOTS: Record<BotName, Bot>` (reexporta `BOT_NAMES`, `Bot`, `BotName`).

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/sim/test/bots.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { legalActions, makeConfig, viewFor, type Action, type GameState, type PlayerId } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P1, setup, type PlayerSetup } from '../../engine/test/helpers.ts';
import { BOTS, type BotName } from '../src/bots/index.ts';
import { runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';

const decide = (bot: BotName, s: GameState, who: PlayerId = P1): Action => {
  const view = viewFor(s, who);
  return BOTS[bot](view, legalActions(view), createRng('teste'));
};

describe('todos os bots', () => {
  it.each(['random', 'greedy', 'turtle'] as const)('%s só joga ações legais e a partida termina', (name) => {
    for (let i = 0; i < 20; i += 1) {
      const record = runGame({
        config: makeConfig(),
        seed: `legal-${name}-${i}`,
        bots: [
          (view, legal, rng) => {
            const action = BOTS[name](view, legal, rng);
            expect(legal).toContainEqual(action);
            return action;
          },
          BOTS.greedy,
        ],
      });
      expect(record.result).not.toBeNull();
    }
  });
});

describe('turtle', () => {
  const ahead = { p1: { hp: 90 }, p2: { hp: 60 } };
  const equip = { phase: { kind: 'EQUIP' } as const, roundKind: 'EQUIP' as const };

  it('na frente, manda tudo para a Defesa', () => {
    const s = setup({ ...equip, p1: { ...ahead.p1, pending: [9, 3, 7] }, p2: ahead.p2 });
    expect(decide('turtle', s)).toEqual({ type: 'EQUIP', destinations: ['DEF', 'DEF', 'DEF'] });
  });

  it('com a Defesa cheia e espaço no Ataque, a numérica vai para o Ataque à força (spec §1.4)', () => {
    const s = setup({ ...equip, p1: { ...ahead.p1, pending: [9], defense: [2, 2, 3, 3, 4, 4, 5] }, p2: ahead.p2 });
    expect(decide('turtle', s)).toEqual({ type: 'EQUIP', destinations: ['ATK'] });
  });

  it('com as duas cheias, troca a última da Defesa se a nova for maior; senão descarta', () => {
    const full: PlayerSetup = { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 5] };
    const maior = setup({ ...equip, p1: { ...ahead.p1, ...full, pending: [9] }, p2: ahead.p2 });
    expect(decide('turtle', maior)).toEqual({ type: 'EQUIP', destinations: ['REPLACE_LAST_DEF'] });
    const menor = setup({ ...equip, p1: { ...ahead.p1, ...full, pending: [2] }, p2: ahead.p2 });
    expect(decide('turtle', menor)).toEqual({ type: 'EQUIP', destinations: ['DISCARD'] });
  });

  it('na frente, joga todos os K de uma vez', () => {
    const s = setup({ p1: { ...ahead.p1, hand: ['K', 'K', 'K'] }, p2: ahead.p2 });
    const action = decide('turtle', s);
    expect(action.type === 'PLAY_K' && action.cardIds).toHaveLength(3);
  });

  it('atrás ou empatado em vida, joga exatamente como o greedy', () => {
    const s = setup({ p1: { hp: 50, hand: ['J', 'K'], attack: [5, 6] }, p2: { hp: 70, attack: [4] } });
    expect(decide('turtle', s)).toEqual(decide('greedy', s));
  });
});

describe('random', () => {
  it('escolhe entre as legais usando só o RNG recebido', () => {
    const s = setup({ p1: { hand: ['J', 'Q', 'K'], attack: [5] }, p2: { attack: [4] } });
    expect(decide('random', s)).toEqual(decide('random', s));
    expect(legalActions(viewFor(s, P1))).toContainEqual(decide('random', s));
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run test/bots.test.ts`
Expected: FAIL — `../src/bots/index.ts` não existe.

- [ ] **Step 3: Implementar**

`packages/sim/src/bots/turtle.ts`:
```ts
import type { Action } from '@coringa/engine';
import { best, defenseBase, placeAll } from './eval.ts';
import { greedyBot } from './greedy.ts';
import type { Bot } from './types.ts';

type Equip = Extract<Action, { type: 'EQUIP' }>;
const attackPlacements = (a: Equip): number => a.destinations.filter((d) => d === 'ATK' || d === 'REPLACE_LAST_ATK').length;

/**
 * Spec §3: na frente em vida, põe tudo na Defesa, deixa o Ataque vazio e joga todos os K.
 * O Equipar só permite trocar/descartar com as duas fileiras cheias (spec §1.4): com a Defesa cheia e
 * espaço no Ataque, a numérica vai para o Ataque à força, e o ataque passa a ser obrigatório.
 * Atrás ou empatado em vida, joga como o greedy.
 */
export const turtleBot: Bot = (view, legal, rng) => {
  if (view.self.hp <= view.opponent.hp) return greedyBot(view, legal, rng);
  const phase = view.phase;
  if (phase.kind === 'EQUIP') {
    const options = legal.filter((a): a is Equip => a.type === 'EQUIP');
    return best(
      options,
      (a) => defenseBase(placeAll(view.self, view.self.pending, a.destinations)) - 1000 * attackPlacements(a),
      (ties) => rng.pick(ties),
    );
  }
  if (phase.kind === 'ATTACK_MAIN') {
    const kings = legal.filter((a) => a.type === 'PLAY_K');
    if (kings.length > 0) return kings[kings.length - 1];
    const queen = legal.find((a) => a.type === 'PLAY_Q');
    if (queen) return queen;
    const allowed = legal.filter((a) => a.type !== 'PLAY_J' && !(a.type === 'RESURRECT' && a.row === 'ATK'));
    return greedyBot(view, allowed, rng);
  }
  return greedyBot(view, legal, rng);
};
```

`packages/sim/src/bots/index.ts`:
```ts
import { greedyBot } from './greedy.ts';
import { randomBot } from './random.ts';
import { turtleBot } from './turtle.ts';
import type { Bot, BotName } from './types.ts';

export const BOTS: Record<BotName, Bot> = { random: randomBot, greedy: greedyBot, turtle: turtleBot };
export { BOT_NAMES, type Bot, type BotName } from './types.ts';
```

- [ ] **Step 4: Ver passar**

Run: `pnpm --filter @coringa/sim exec vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sim): bot turtle e registro dos bots"
```

---

### Task 8: Partidas de referência (replays gravados)

**Files:**
- Create: `packages/sim/src/replay.ts`, `packages/sim/src/golden.ts`, `packages/sim/src/cli/record-golden.ts`, `packages/sim/test/golden.test.ts`, `packages/engine/test/replay.ts`, `packages/engine/test/golden.test.ts`, `packages/engine/test/fixtures/golden-replays.json` (gerado), `packages/engine/test/__snapshots__/golden/*.json` (gerados)

**Interfaces:**
- Consumes: `runGame` com `record: true` (Tarefa 5), `BOTS` (Tarefa 7).
- Produces:
  - `interface Replay { name: string; config: RulesConfig; seed: string; players: [PlayerId, PlayerId]; steps: ReplayStep[] }` e `toReplay(name, config, players, record): Replay` (sim)
  - `GOLDEN_GAMES` (12 partidas: 4 greedy, 2 turtle × greedy, 2 random, 3 greedy com uma regra [N] desligada, 1 random com as três desligadas) e `recordGolden(): Replay[]`
  - no motor (testes): `runReplay(replay)` (falha no passo exato) e `summarizeReplay(replay)` (resultado, rodadas, vida final, contagem de eventos por tipo)

- [ ] **Step 1: Escrever os testes (falhando)**

`packages/sim/test/golden.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { GOLDEN_GAMES, recordGolden } from '../src/golden.ts';

describe('partidas de referência', () => {
  it('grava 12 partidas com nomes únicos, todas terminadas, de forma reprodutível', () => {
    const replays = recordGolden();
    expect(replays).toHaveLength(GOLDEN_GAMES.length);
    expect(new Set(replays.map((r) => r.name)).size).toBe(12);
    expect(recordGolden()).toEqual(replays);
  });
});
```

`packages/engine/test/golden.test.ts`:
```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { summarizeReplay, type Replay } from './replay.ts';

/**
 * Partidas de referência: replays gravados (semente + ações) reexecutados no motor.
 * Mudança de regra que torna uma ação ilegal falha no passo exato; mudança de resultado
 * quebra o snapshot até ser aceita com `vitest -u` e o diff revisado.
 * Regravar as fixtures: `pnpm --filter @coringa/sim record-golden`.
 */
const replays: Replay[] = JSON.parse(readFileSync(new URL('./fixtures/golden-replays.json', import.meta.url), 'utf8'));

describe('partidas de referência', () => {
  it('há 12 partidas gravadas', () => {
    expect(replays).toHaveLength(12);
  });

  for (const replay of replays) {
    it(`${replay.name} reproduz o mesmo resultado`, async () => {
      const summary = summarizeReplay(replay);
      expect(summary).toMatchObject({ result: expect.objectContaining({ kind: expect.any(String) }) });
      await expect(`${JSON.stringify(summary, null, 2)}\n`).toMatchFileSnapshot(`./__snapshots__/golden/${replay.name}.json`);
    });
  }
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run test/golden.test.ts`
Expected: FAIL — `../src/golden.ts` não existe.

- [ ] **Step 3: Gravação no simulador**

`packages/sim/src/replay.ts`:
```ts
import type { PlayerId, RulesConfig } from '@coringa/engine';
import type { GameRecord, ReplayStep } from './match.ts';

/**
 * Partida gravada: semente + config completa + ações. Mesmo formato das fixtures de
 * `packages/engine/test/fixtures/golden-replays.json` e dos arquivos salvos pelo `pnpm play`.
 */
export interface Replay {
  name: string;
  config: RulesConfig;
  seed: string;
  players: [PlayerId, PlayerId];
  steps: ReplayStep[];
}

export function toReplay(name: string, config: RulesConfig, players: [PlayerId, PlayerId], record: GameRecord): Replay {
  if (!record.replay) throw new Error('a partida não foi gravada (use record: true)');
  return { name, config, seed: record.seed, players, steps: record.replay };
}
```

`packages/sim/src/golden.ts`:
```ts
import { makeConfig, type ConfigOverrides } from '@coringa/engine';
import { BOTS, type BotName } from './bots/index.ts';
import { PLAYERS, runGame } from './match.ts';
import { toReplay, type Replay } from './replay.ts';

/** As partidas de referência: nome, bots, regras e semente. Mudar esta lista exige regravar as fixtures. */
export const GOLDEN_GAMES: Array<{ name: string; bots: [BotName, BotName]; config: ConfigOverrides; seed: string }> = [
  ...[0, 1, 2, 3].map((i) => ({ name: `greedy-${i}`, bots: ['greedy', 'greedy'] as [BotName, BotName], config: {}, seed: `ouro-g${i}` })),
  ...[0, 1].map((i) => ({ name: `turtle-${i}`, bots: ['turtle', 'greedy'] as [BotName, BotName], config: {}, seed: `ouro-t${i}` })),
  ...[0, 1].map((i) => ({ name: `random-${i}`, bots: ['random', 'random'] as [BotName, BotName], config: {}, seed: `ouro-r${i}` })),
  { name: 'sem-escolha', bots: ['greedy', 'greedy'], config: { initiativeChoice: false }, seed: 'ouro-e' },
  { name: 'sem-pressao', bots: ['greedy', 'greedy'], config: { tablePressure: false }, seed: 'ouro-p' },
  { name: 'sem-selvagens', bots: ['greedy', 'greedy'], config: { wildJokers: false }, seed: 'ouro-s' },
  { name: 'random-tudo-desligado', bots: ['random', 'random'], config: { initiativeChoice: false, tablePressure: false, wildJokers: false }, seed: 'ouro-x' },
];

/** Grava as partidas de referência com a config completa (mudanças no DEFAULT_CONFIG não as afetam). */
export function recordGolden(): Replay[] {
  return GOLDEN_GAMES.map((g) => {
    const config = makeConfig(g.config);
    const record = runGame({ config, seed: g.seed, bots: [BOTS[g.bots[0]], BOTS[g.bots[1]]], record: true });
    if (!record.result) throw new Error(`a partida de referência ${g.name} não terminou`);
    return toReplay(g.name, config, PLAYERS, record);
  });
}
```

`packages/sim/src/cli/record-golden.ts`:
```ts
/** `pnpm --filter @coringa/sim record-golden`: regrava as fixtures das partidas de referência do motor. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recordGolden } from '../golden.ts';

const target = fileURLToPath(new URL('../../../engine/test/fixtures/golden-replays.json', import.meta.url));
const replays = recordGolden();
writeFileSync(target, `${JSON.stringify(replays, null, 1)}\n`);
console.log(`${replays.length} partidas gravadas em ${target}`);
console.log('Rode `pnpm --filter @coringa/engine test -u` e revise o diff dos snapshots antes de commitar.');
```

- [ ] **Step 4: Reexecução no motor**

`packages/engine/test/replay.ts`:
```ts
import { applyAction } from '../src/apply-action.ts';
import { createGame } from '../src/create-game.ts';
import type { Action, GameEvent, GameState, PlayerId, RulesConfig } from '../src/types.ts';

/** Partida gravada (formato gerado por `packages/sim/src/replay.ts`). */
export interface Replay {
  name: string;
  config: RulesConfig;
  seed: string;
  players: [PlayerId, PlayerId];
  steps: Array<{ player: PlayerId | 'system'; action: Action }>;
}

/** Reexecuta a partida no motor. Uma ação recusada falha no passo exato. */
export function runReplay(replay: Replay): { state: GameState; events: GameEvent[] } {
  const created = createGame(replay.config, replay.seed, replay.players);
  if (!created.ok) throw new Error(`${replay.name}: ${created.error.message}`);
  let state = created.state;
  const events: GameEvent[] = [];
  replay.steps.forEach(({ player, action }, i) => {
    const result = applyAction(state, player, action);
    if (!result.ok) {
      throw new Error(`${replay.name}, passo ${i}: ${result.error.code} em ${JSON.stringify(action)}`);
    }
    state = result.state;
    events.push(...result.events);
  });
  return { state, events };
}

/** Resumo comparado no snapshot: resultado, rodadas, vida final e contagem de eventos por tipo. */
export function summarizeReplay(replay: Replay): object {
  const { state, events } = runReplay(replay);
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return {
    name: replay.name,
    result: state.phase.kind === 'GAME_OVER' ? state.phase.result : null,
    rounds: state.round,
    finalHp: Object.fromEntries(state.players.map((p) => [p.id, p.hp])),
    events: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  };
}
```

- [ ] **Step 5: Gravar as fixtures e os snapshots**

Antes de gravar, confirme que a branch tem a `main` atual (a regra da Defesa Absoluta com autoproteção, c40097c, já está nela); se a `main` andou desde o Step 0 da Tarefa 1, rode `git merge --no-edit main` e `pnpm check` primeiro, para não congelar um comportamento antigo.

```bash
mkdir -p packages/engine/test/fixtures
pnpm --filter @coringa/sim record-golden
pnpm --filter @coringa/engine exec vitest run test/golden.test.ts
```
Expected: `12 partidas gravadas em ...golden-replays.json` (~60 KB); depois `Snapshots 12 written` e 13 testes verdes. Rode o `vitest run` de novo: agora compara com os snapshots e passa sem escrever nada.

- [ ] **Step 6: Provar que o snapshot pega mudança de regra**

Troque temporariamente, em `packages/engine/src/combat.ts`, `1 + p.defenseBuffs.length` por `2 + p.defenseBuffs.length` e rode `pnpm --filter @coringa/engine exec vitest run test/golden.test.ts`.
Expected: FAIL em várias partidas (resumo diferente ou ação recusada num passo). Desfaça a troca e confirme que volta a passar.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: partidas de referência gravadas e reexecutadas no motor"
```

---

### Task 9: Métricas, metas da §3 e `pnpm sim`

**Files:**
- Create: `packages/sim/src/metrics.ts`, `packages/sim/src/report.ts`, `packages/sim/src/series.ts`, `packages/sim/src/cli/args.ts`, `packages/sim/src/cli/sim.ts`, `packages/sim/test/metrics.test.ts`
- Modify: `package.json` (raiz)

**Interfaces:**
- Consumes: `GameRecord`, `runGame` (Tarefa 5), `BOTS`, `BotName` (Tarefa 7).
- Produces:
  - `type EndReason = 'HP' | 'EXODIA' | 'ANTI_STALL' | 'FORFEIT' | 'DRAW' | 'UNFINISHED'`, `MECHANICS`
  - `interface Metrics { games; terminated; attackRounds: { median; p10; p90 }; initiativeWin; endReasons: Record<EndReason, number>; quads; orderFirst: number | null; perGame }`
  - `summarize(records: GameRecord[]): Metrics`, `endReason(r): EndReason`
  - `interface TargetCheck { metric; value; target; ok }`, `checkTargets(m: Metrics): TargetCheck[]`
  - `REPORTS_DIR`, `pct(x)`, `textTable(headers, rows)`, `markdownTable(headers, rows)`, `writeReport(name, data, markdown?, dir?): string[]`
  - `runSeries(config, bots: [BotName, BotName], games, seedPrefix = 'jogo'): GameRecord[]`
  - `RULE_OPTIONS`, `configFromArgs(values): ConfigOverrides`, `botName(value): BotName`, `parseArgs` (de `node:util`)

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/sim/test/metrics.test.ts`:
```ts
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameResult } from '@coringa/engine';
import type { GameRecord } from '../src/match.ts';
import { checkTargets, endReason, summarize } from '../src/metrics.ts';
import { markdownTable, pct, textTable, writeReport } from '../src/report.ts';

function rec(result: GameResult | null, attackRounds: number, extra: Partial<GameRecord> = {}): GameRecord {
  return {
    seed: 'x',
    initialInitiative: 'p1',
    result,
    finalState: {} as GameRecord['finalState'],
    steps: 1,
    attackRounds,
    eventCounts: {},
    orderChoices: { first: 0, second: 0 },
    ...extra,
  };
}

const win = (winner: string, reason: 'HP' | 'EXODIA' | 'ANTI_STALL' = 'HP'): GameResult => ({ kind: 'WIN', winner, reason });

describe('summarize', () => {
  const records = [
    rec(win('p1'), 8, { eventCounts: { QuadFormed: 2, TrapUsed: 3 }, orderChoices: { first: 1, second: 3 } }),
    rec(win('p2'), 10),
    rec(win('p1', 'EXODIA'), 12),
    rec({ kind: 'DRAW', reason: 'ANTI_STALL' }, 14),
    rec(null, 20),
  ];
  const m = summarize(records);

  it('duração por percentis das rodadas de Ataque', () => {
    expect(m.attackRounds).toEqual({ median: 12, p10: 8, p90: 20 });
  });

  it('vitória da iniciativa inicial, motivos de fim e partidas que terminam', () => {
    expect(m.initiativeWin).toBeCloseTo(2 / 5);
    expect(m.endReasons).toMatchObject({ HP: 2 / 5, EXODIA: 1 / 5, DRAW: 1 / 5, UNFINISHED: 1 / 5 });
    expect(m.terminated).toBeCloseTo(4 / 5);
    expect(endReason(records[3])).toBe('DRAW');
  });

  it('quadras, escolha da ordem (secundária) e uso de mecânicas por partida', () => {
    expect(m.quads).toBeCloseTo(1 / 5);
    expect(m.orderFirst).toBeCloseTo(1 / 4);
    expect(m.perGame.TrapUsed).toBeCloseTo(3 / 5);
    expect(summarize([rec(win('p1'), 3)]).orderFirst).toBeNull();
  });

  it('recusa lista vazia', () => {
    expect(() => summarize([])).toThrow();
  });
});

describe('checkTargets (metas da spec §3)', () => {
  it('marca dentro e fora de cada meta', () => {
    const inside = summarize(Array.from({ length: 100 }, (_, i) => rec(i < 50 ? win('p1') : win('p2', i < 52 ? 'EXODIA' : 'HP'), 10, { eventCounts: i < 15 ? { QuadFormed: 1 } : {} })));
    expect(checkTargets(inside).every((t) => t.ok)).toBe(true);
    const outside = summarize([rec(win('p2', 'ANTI_STALL'), 3), rec(null, 30)]);
    expect(checkTargets(outside).filter((t) => !t.ok).map((t) => t.metric)).toEqual([
      'Duração (mediana de rodadas de Ataque)',
      'Vitória de quem começa com a iniciativa',
      'Exódia',
      'Fallen is Back',
      'Fim por anti-travamento',
      'Partidas que terminam',
    ]);
  });
});

describe('relatórios', () => {
  it('tabela de texto alinhada e tabela Markdown', () => {
    expect(textTable(['a', 'bb'], [[1, 'x'], [2.5, 'yyy']])).toBe('a     bb\n----  ---\n1     x\n2.50  yyy');
    expect(markdownTable(['a', 'b'], [[1, 'x']])).toBe('| a | b |\n| --- | --- |\n| 1 | x |');
    expect(pct(0.1234)).toBe('12.3%');
  });

  it('grava JSON e Markdown na pasta pedida', () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-'));
    const [json, md] = writeReport('teste', { ok: true }, '# oi\n', dir);
    expect(JSON.parse(readFileSync(json, 'utf8'))).toEqual({ ok: true });
    expect(readFileSync(md, 'utf8')).toBe('# oi\n');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run test/metrics.test.ts`
Expected: FAIL — `../src/metrics.ts` não existe.

- [ ] **Step 3: Implementar**

`packages/sim/src/metrics.ts`:
```ts
import type { GameEvent } from '@coringa/engine';
import type { GameRecord } from './match.ts';

export type EndReason = 'HP' | 'EXODIA' | 'ANTI_STALL' | 'FORFEIT' | 'DRAW' | 'UNFINISHED';

/** Eventos cuja média por partida mostra se os bots usam as mecânicas. */
export const MECHANICS: GameEvent['type'][] = [
  'BuffPlayed',
  'GuardPlayed',
  'TrapUsed',
  'Sacrificed',
  'ReflectPlayed',
  'ReflectTriggered',
  'ReflectExpired',
  'ReflectCanceled',
  'ReflectProtected',
  'Resurrected',
  'QuadFormed',
  'AbsoluteAttack',
  'AbsoluteDefenseStarted',
  'GuardBroken',
];

export interface Metrics {
  games: number;
  /** Frações em [0, 1]. */
  terminated: number;
  attackRounds: { median: number; p10: number; p90: number };
  /** Vitórias de quem o motor sorteou com a iniciativa inicial (empates contam como não-vitória). */
  initiativeWin: number;
  endReasons: Record<EndReason, number>;
  /** Partidas com pelo menos uma quadra (Fallen is Back). */
  quads: number;
  /** Secundária, só informativa: fração de "atacar primeiro" entre as Escolhas da iniciativa; null sem a regra. */
  orderFirst: number | null;
  /** Média por partida de cada evento de MECHANICS. */
  perGame: Partial<Record<GameEvent['type'], number>>;
}

export function endReason(r: GameRecord): EndReason {
  if (!r.result) return 'UNFINISHED';
  return r.result.kind === 'DRAW' ? 'DRAW' : r.result.reason;
}

/** Percentil por posição (sem interpolação) de uma lista já ordenada. */
const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

export function summarize(records: GameRecord[]): Metrics {
  const n = records.length;
  if (n === 0) throw new Error('summarize sem partidas');
  const frac = (pred: (r: GameRecord) => boolean) => records.filter(pred).length / n;
  const rounds = records.map((r) => r.attackRounds).sort((a, b) => a - b);
  const endReasons = { HP: 0, EXODIA: 0, ANTI_STALL: 0, FORFEIT: 0, DRAW: 0, UNFINISHED: 0 };
  for (const r of records) endReasons[endReason(r)] += 1 / n;
  const first = records.reduce((acc, r) => acc + r.orderChoices.first, 0);
  const second = records.reduce((acc, r) => acc + r.orderChoices.second, 0);
  const perGame: Metrics['perGame'] = {};
  for (const type of MECHANICS) perGame[type] = records.reduce((acc, r) => acc + (r.eventCounts[type] ?? 0), 0) / n;
  return {
    games: n,
    terminated: frac((r) => r.result !== null),
    attackRounds: { median: percentile(rounds, 0.5), p10: percentile(rounds, 0.1), p90: percentile(rounds, 0.9) },
    initiativeWin: frac((r) => r.result?.kind === 'WIN' && r.result.winner === r.initialInitiative),
    endReasons,
    quads: frac((r) => (r.eventCounts.QuadFormed ?? 0) > 0),
    orderFirst: first + second === 0 ? null : first / (first + second),
    perGame,
  };
}

export interface TargetCheck {
  metric: string;
  value: number;
  target: string;
  ok: boolean;
}

/** Metas da spec §3 que saem de uma série de partidas. Ordem e turtle têm experimentos próprios. */
export function checkTargets(m: Metrics): TargetCheck[] {
  const within = (x: number, lo: number, hi: number) => x >= lo && x <= hi;
  const antiStall = m.endReasons.ANTI_STALL + m.endReasons.DRAW;
  return [
    { metric: 'Duração (mediana de rodadas de Ataque)', value: m.attackRounds.median, target: '8–14', ok: within(m.attackRounds.median, 8, 14) },
    { metric: 'Vitória de quem começa com a iniciativa', value: m.initiativeWin, target: '45–55%', ok: within(m.initiativeWin, 0.45, 0.55) },
    { metric: 'Exódia', value: m.endReasons.EXODIA, target: '1–3%', ok: within(m.endReasons.EXODIA, 0.01, 0.03) },
    { metric: 'Fallen is Back', value: m.quads, target: '10–25%', ok: within(m.quads, 0.1, 0.25) },
    { metric: 'Fim por anti-travamento', value: antiStall, target: '< 5%', ok: antiStall < 0.05 },
    { metric: 'Partidas que terminam', value: m.terminated, target: '100%', ok: m.terminated === 1 },
  ];
}
```

`packages/sim/src/report.ts`:
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPORTS_DIR = fileURLToPath(new URL('../reports/', import.meta.url));

export const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;

type Cell = string | number;
const cell = (c: Cell): string => (typeof c === 'number' ? (Number.isInteger(c) ? String(c) : c.toFixed(2)) : c);

/** Tabela de texto alinhada para o terminal. */
export function textTable(headers: string[], rows: Cell[][]): string {
  const all = [headers, ...rows.map((r) => r.map(cell))];
  const widths = headers.map((_, i) => Math.max(...all.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  return [line(all[0]), widths.map((w) => '-'.repeat(w)).join('  '), ...all.slice(1).map(line)].join('\n');
}

/** Tabela Markdown (para o relatório de calibração). */
export function markdownTable(headers: string[], rows: Cell[][]): string {
  const line = (r: string[]) => `| ${r.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map((r) => line(r.map(cell)))].join('\n');
}

/** Grava `<name>.json` (e `<name>.md`, se houver) em `packages/sim/reports/`. Devolve os caminhos. */
export function writeReport(name: string, data: unknown, markdown?: string, dir = REPORTS_DIR): string[] {
  mkdirSync(dir, { recursive: true });
  const paths = [join(dir, `${name}.json`)];
  writeFileSync(paths[0], `${JSON.stringify(data, null, 2)}\n`);
  if (markdown !== undefined) {
    paths.push(join(dir, `${name}.md`));
    writeFileSync(paths[1], markdown);
  }
  return paths;
}
```

`packages/sim/src/series.ts`:
```ts
import type { RulesConfig } from '@coringa/engine';
import { BOTS, type BotName } from './bots/index.ts';
import { runGame, type GameRecord } from './match.ts';

/**
 * N partidas com sementes `${seedPrefix}-0 … -(N−1)`. Usar o mesmo prefixo em variantes diferentes
 * deixa as amostras pareadas (mesmas sementes de partida e de bots).
 */
export function runSeries(config: RulesConfig, bots: [BotName, BotName], games: number, seedPrefix = 'jogo'): GameRecord[] {
  return Array.from({ length: games }, (_, i) => runGame({ config, seed: `${seedPrefix}-${i}`, bots: [BOTS[bots[0]], BOTS[bots[1]]] }));
}
```

- [ ] **Step 4: Ver passar**

Run: `pnpm --filter @coringa/sim exec vitest run`
Expected: PASS.

- [ ] **Step 5: CLI `pnpm sim`**

`packages/sim/src/cli/args.ts`:
```ts
import { parseArgs } from 'node:util';
import type { ConfigOverrides } from '@coringa/engine';
import { BOT_NAMES, type BotName } from '../bots/index.ts';

/** Opções de regra aceitas por `pnpm sim` e `pnpm play`. */
export const RULE_OPTIONS = {
  hp: { type: 'string' },
  fileira: { type: 'string' },
  'sem-escolha': { type: 'boolean' },
  'sem-pressao': { type: 'boolean' },
  'sem-selvagens': { type: 'boolean' },
} as const;

export type RuleValues = { hp?: string; fileira?: string; 'sem-escolha'?: boolean; 'sem-pressao'?: boolean; 'sem-selvagens'?: boolean };

export function configFromArgs(v: RuleValues): ConfigOverrides {
  const overrides: ConfigOverrides = {};
  if (v.hp !== undefined) overrides.hp = Number(v.hp);
  if (v.fileira !== undefined) overrides.rowLimit = Number(v.fileira);
  if (v['sem-escolha']) overrides.initiativeChoice = false;
  if (v['sem-pressao']) overrides.tablePressure = false;
  if (v['sem-selvagens']) overrides.wildJokers = false;
  return overrides;
}

export function botName(value: string): BotName {
  if ((BOT_NAMES as readonly string[]).includes(value)) return value as BotName;
  throw new Error(`bot desconhecido: ${value} (use ${BOT_NAMES.join(', ')})`);
}

export { parseArgs };
```

`packages/sim/src/cli/sim.ts`:
```ts
/** `pnpm sim`: uma série de partidas bot × bot com métricas e metas da spec §3. */
import { makeConfig, validateConfig } from '@coringa/engine';
import { checkTargets, summarize } from '../metrics.ts';
import { pct, textTable, writeReport } from '../report.ts';
import { runSeries } from '../series.ts';
import { botName, configFromArgs, parseArgs, RULE_OPTIONS } from './args.ts';

const { values } = parseArgs({
  options: { ...RULE_OPTIONS, bots: { type: 'string', default: 'greedy,greedy' }, partidas: { type: 'string', default: '500' }, semente: { type: 'string', default: 'jogo' } },
});
const [a, b = a] = (values.bots ?? '').split(',');
const bots = [botName(a), botName(b)] as const;
const overrides = configFromArgs(values);
const config = makeConfig(overrides);
const error = validateConfig(config);
if (error) throw new Error(error.message);
const games = Number(values.partidas);

const started = performance.now();
const metrics = summarize(runSeries(config, [bots[0], bots[1]], games, values.semente));
const seconds = ((performance.now() - started) / 1000).toFixed(1);
const targets = checkTargets(metrics);
console.log(`${bots[0]} × ${bots[1]} · ${games} partidas · ${seconds} s · regras ${JSON.stringify(overrides)}`);
console.log(textTable(['Métrica', 'Valor', 'Meta', 'Ok'], targets.map((t) => [t.metric, t.metric.startsWith('Duração') ? t.value : pct(t.value), t.target, t.ok ? 'sim' : 'NÃO'])));
console.log(`\nMotivos de fim: ${Object.entries(metrics.endReasons).map(([k, v]) => `${k} ${pct(v)}`).join(' · ')}`);
const paths = writeReport(`sim-${Date.now()}`, { bots, games, overrides, metrics, targets });
console.log(`\nJSON: ${paths[0]}`);
```

Em `package.json` (raiz), acrescente `"sim": "node packages/sim/src/cli/sim.ts"`.

Run: `pnpm sim --partidas 200`
Expected: tabela `Métrica | Valor | Meta | Ok` com as 6 metas, linha de motivos de fim e `JSON: ...packages\sim\reports\sim-<timestamp>.json` (ignorado pelo git). `pnpm sim --bots turtle,greedy --hp 300 --sem-pressao` também funciona.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(sim): métricas e metas da spec §3, relatórios e pnpm sim"
```

---

### Task 10: Experimentos — turtle pareado e ordem contrafactual

**Files:**
- Create: `packages/sim/src/experiments/outcome.ts`, `packages/sim/src/experiments/determinize.ts`, `packages/sim/src/experiments/turtle.ts`, `packages/sim/src/experiments/order.ts`, `packages/sim/test/experiments.test.ts`

**Interfaces:**
- Consumes: `runGame`, `PLAYERS` (Tarefa 5), `BOTS` (Tarefa 7), `prefersFirst` (Tarefa 6), `seedRng`, `shuffle`, `applyAction`, `viewFor` do motor.
- Produces:
  - `score(result, player): number` (1 / 0,5 / 0), `mean(xs)`, `stdev(xs)`
  - `determinize(state: GameState, viewer: PlayerId, seed: string): GameState` — reamostra mão e pendentes do oponente e o monte; troca o PRNG da partida; não muda a visão do viewer; não muta a entrada
  - `findLead(config, seed, lead): { state; leader } | null`; `turtleExperiment({ config, games, lead, seedPrefix? }): TurtleReport` com `{ lead, games, branches, turtle, greedy, difference, turtleEnds }`
  - `orderExperiment({ config, games, rollouts, seedPrefix? }): OrderReport` com `{ points, firstBetter, decisive, meanDifference, meanDecisiveSize, greedyFirst, detail: OrderPoint[] }`; `OrderPoint = { seed, round, difference, stderr, verdict: 'FIRST' | 'SECOND' | 'TIE' }`

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/sim/test/experiments.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { makeConfig, totalCards, viewFor, type Card, type GameState } from '@coringa/engine';
import { BOTS } from '../src/bots/index.ts';
import { determinize } from '../src/experiments/determinize.ts';
import { orderExperiment } from '../src/experiments/order.ts';
import { mean, score, stdev } from '../src/experiments/outcome.ts';
import { findLead, turtleExperiment } from '../src/experiments/turtle.ts';
import { runGame } from '../src/match.ts';

const config = makeConfig();

function allCards(s: GameState): Card[] {
  const cards: Card[] = [...s.deck, ...s.graveyard];
  for (const p of s.players) {
    cards.push(...p.hand, ...p.pending, ...p.attackRow, ...p.defenseRow, ...p.attackBuffs, ...p.defenseBuffs, ...p.guard);
    if (p.reflect) cards.push(p.reflect.k, p.reflect.j, p.reflect.q);
  }
  return cards;
}

/** Um estado de meio de partida com mão no oponente. */
function middle(): GameState {
  return runGame({ config, seed: 'meio', bots: [BOTS.greedy, BOTS.greedy], maxSteps: 12 }).finalState;
}

describe('determinize', () => {
  const s = middle();
  const viewer = s.players[0].id;

  it('não muda nada do que o viewer vê', () => {
    expect(viewFor(determinize(s, viewer, 'r1'), viewer)).toEqual(viewFor(s, viewer));
  });

  it('conserva as cartas e mantém só especiais na mão do oponente', () => {
    const d = determinize(s, viewer, 'r1');
    const ids = allCards(d).map((c) => c.id);
    expect(ids).toHaveLength(totalCards(config));
    expect(new Set(ids).size).toBe(ids.length);
    expect(d.players[1].hand.map((c): string => c.kind)).not.toContain('NUM');
    expect(d.players[1].hand).toHaveLength(s.players[1].hand.length);
  });

  it('sementes diferentes dão mundos diferentes; a mesma semente, o mesmo mundo', () => {
    expect(determinize(s, viewer, 'r1')).toEqual(determinize(s, viewer, 'r1'));
    expect(determinize(s, viewer, 'r1').deck).not.toEqual(determinize(s, viewer, 'r2').deck);
  });

  it('não muta o estado recebido', () => {
    const before = JSON.stringify(s);
    determinize(s, viewer, 'r3');
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('outcome', () => {
  it('score: vitória 1, empate 0,5, derrota ou sem fim 0', () => {
    expect(score({ kind: 'WIN', winner: 'p1', reason: 'HP' }, 'p1')).toBe(1);
    expect(score({ kind: 'WIN', winner: 'p2', reason: 'HP' }, 'p1')).toBe(0);
    expect(score({ kind: 'DRAW', reason: 'ANTI_STALL' }, 'p1')).toBe(0.5);
    expect(score(null, 'p1')).toBe(0);
  });

  it('mean e stdev', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([])).toBe(0);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(stdev([1])).toBe(0);
  });
});

describe('experimento do turtle (desenho pareado)', () => {
  it('findLead para no início de um Equipar com a vantagem pedida', () => {
    const point = findLead(config, 'turtle-0', 10);
    expect(point).not.toBeNull();
    const [a, b] = point!.state.players;
    expect(Math.abs(a.hp - b.hp)).toBeGreaterThanOrEqual(10);
    expect(point!.state.phase.kind).toBe('EQUIP');
    expect(point!.leader).toBe(a.hp > b.hp ? a.id : b.id);
  });

  it('devolve pontuações em [0, 1], ramos ≤ partidas e é reprodutível', () => {
    const r = turtleExperiment({ config, games: 12, lead: 10 });
    expect(r.branches).toBeGreaterThan(0);
    expect(r.branches).toBeLessThanOrEqual(12);
    for (const x of [r.turtle, r.greedy]) expect(x).toBeGreaterThanOrEqual(0);
    for (const x of [r.turtle, r.greedy]) expect(x).toBeLessThanOrEqual(1);
    expect(r.difference).toBeCloseTo(r.turtle - r.greedy);
    expect(Object.values(r.turtleEnds).reduce((a, b) => a + b, 0)).toBe(r.branches);
    expect(turtleExperiment({ config, games: 12, lead: 10 })).toEqual(r);
  });
});

describe('experimento contrafactual da ordem', () => {
  it('classifica cada ponto e resume direção e tamanho', () => {
    const r = orderExperiment({ config, games: 6, rollouts: 4 });
    expect(r.points).toBeGreaterThan(0);
    for (const p of r.detail) {
      expect(['FIRST', 'SECOND', 'TIE']).toContain(p.verdict);
      if (p.verdict === 'FIRST') expect(p.difference).toBeGreaterThan(0);
      if (p.verdict === 'SECOND') expect(p.difference).toBeLessThan(0);
    }
    expect(r.decisive).toBeGreaterThanOrEqual(0);
    expect(r.decisive).toBeLessThanOrEqual(1);
    expect(orderExperiment({ config, games: 6, rollouts: 4 })).toEqual(r);
  });

  it('sem Escolha da iniciativa não há pontos de decisão', () => {
    expect(orderExperiment({ config: makeConfig({ initiativeChoice: false }), games: 3, rollouts: 2 }).points).toBe(0);
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run test/experiments.test.ts`
Expected: FAIL — módulos de `../src/experiments/` não existem.

- [ ] **Step 3: Implementar**

`packages/sim/src/experiments/outcome.ts`:
```ts
import type { GameResult, PlayerId } from '@coringa/engine';

/** Pontos de `player` numa partida: vitória 1, empate 0,5, derrota ou não terminou 0. */
export function score(result: GameResult | null, player: PlayerId): number {
  if (!result) return 0;
  if (result.kind === 'DRAW') return 0.5;
  return result.winner === player ? 1 : 0;
}

export const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Desvio padrão amostral (0 com menos de 2 valores). */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}
```

`packages/sim/src/experiments/determinize.ts`:
```ts
import { seedRng, shuffle, type Card, type GameState, type NumCard, type PlayerId, type SpecialCard } from '@coringa/engine';

/**
 * Reamostra a informação oculta para `viewer` (rollouts sem espiar o monte real):
 * a mão e as numéricas pendentes do oponente são resorteadas do conjunto que o viewer não vê
 * (mão + pendentes do oponente + monte), respeitando as quantidades e os tipos; o resto vira o
 * monte, embaralhado. O PRNG da partida também é trocado, para os reembaralhamentos futuros
 * do cemitério diferirem entre rollouts. A visão do viewer não muda.
 */
export function determinize(state: GameState, viewer: PlayerId, seed: string): GameState {
  const s = structuredClone(state);
  const rng = seedRng(seed);
  const opponent = s.players[0].id === viewer ? s.players[1] : s.players[0];
  const hidden: Card[] = shuffle(rng, [...opponent.hand, ...opponent.pending, ...s.deck]);
  const specials = hidden.filter((c): c is SpecialCard => c.kind !== 'NUM');
  const numerics = hidden.filter((c): c is NumCard => c.kind === 'NUM');
  const hand = specials.splice(0, opponent.hand.length);
  const pending = numerics.splice(0, opponent.pending.length);
  opponent.hand = hand;
  opponent.pending = pending;
  s.deck = shuffle(rng, [...specials, ...numerics]);
  s.rng = rng;
  return s;
}
```

`packages/sim/src/experiments/turtle.ts`:
```ts
import type { GameResult, GameState, PlayerId, RulesConfig } from '@coringa/engine';
import { BOTS } from '../bots/index.ts';
import type { Bot } from '../bots/types.ts';
import { PLAYERS, runGame } from '../match.ts';
import { mean, score } from './outcome.ts';

export interface TurtleOptions {
  config: RulesConfig;
  games: number;
  /** Vantagem mínima de vida, ao fim de uma rodada de Ataque, que define "estar na frente". */
  lead: number;
  seedPrefix?: string;
}

export interface TurtleBranchResult {
  /** Pontos do líder (vitória 1, empate 0,5) com ele jogando de turtle. */
  turtle: number;
  /** Pontos do líder com ele seguindo greedy. */
  greedy: number;
  /** Como o turtle-líder terminou: HP, EXODIA, ANTI_STALL, DRAW, LOSS, UNFINISHED. */
  turtleEnds: Record<string, number>;
}

export interface TurtleReport extends TurtleBranchResult {
  lead: number;
  games: number;
  /** Partidas em que alguém abriu a vantagem (pontos de ramificação). */
  branches: number;
  /** turtle − greedy; meta da spec §3: ≤ 0. */
  difference: number;
}

/** Primeiro estado, no início de uma rodada de Equipar, em que alguém lidera por `lead` ou mais. */
export function findLead(config: RulesConfig, seed: string, lead: number): { state: GameState; leader: PlayerId } | null {
  let found: { state: GameState; leader: PlayerId } | null = null;
  runGame({
    config,
    seed,
    bots: [BOTS.greedy, BOTS.greedy],
    onStep: (_before, after, events) => {
      const equipStarted = events.some((e) => e.type === 'RoundStarted' && e.kind === 'EQUIP');
      if (!equipStarted || after.phase.kind === 'GAME_OVER') return;
      const [a, b] = after.players;
      if (Math.abs(a.hp - b.hp) < lead) return;
      found = { state: after, leader: a.hp > b.hp ? a.id : b.id };
      return 'stop';
    },
  });
  return found;
}

function endOf(result: GameResult | null, leader: PlayerId): string {
  if (!result) return 'UNFINISHED';
  if (result.kind === 'DRAW') return 'DRAW';
  return result.winner === leader ? result.reason : 'LOSS';
}

/** Desenho pareado (spec §3): do mesmo estado e com as mesmas sementes, o líder vira turtle num ramo e segue greedy no outro. */
export function turtleExperiment(options: TurtleOptions): TurtleReport {
  const prefix = options.seedPrefix ?? 'turtle';
  const turtleScores: number[] = [];
  const greedyScores: number[] = [];
  const turtleEnds: Record<string, number> = {};
  for (let i = 0; i < options.games; i += 1) {
    const seed = `${prefix}-${i}`;
    const point = findLead(options.config, seed, options.lead);
    if (!point) continue;
    const leaderSeat = point.leader === PLAYERS[0] ? 0 : 1;
    const branch = (leaderBot: Bot): GameResult | null => {
      const bots: [Bot, Bot] = [BOTS.greedy, BOTS.greedy];
      bots[leaderSeat] = leaderBot;
      return runGame({ config: options.config, seed, initial: point.state, bots, botSeed: `${seed}/ramo` }).result;
    };
    const asTurtle = branch(BOTS.turtle);
    turtleScores.push(score(asTurtle, point.leader));
    greedyScores.push(score(branch(BOTS.greedy), point.leader));
    const end = endOf(asTurtle, point.leader);
    turtleEnds[end] = (turtleEnds[end] ?? 0) + 1;
  }
  const turtle = mean(turtleScores);
  const greedy = mean(greedyScores);
  return { lead: options.lead, games: options.games, branches: turtleScores.length, turtle, greedy, difference: turtle - greedy, turtleEnds };
}
```

`packages/sim/src/experiments/order.ts`:
```ts
import { applyAction, viewFor, type GameState, type PlayerId, type RulesConfig } from '@coringa/engine';
import { prefersFirst } from '../bots/greedy.ts';
import { BOTS } from '../bots/index.ts';
import { runGame } from '../match.ts';
import { createRng } from '../rng.ts';
import { determinize } from './determinize.ts';
import { mean, score, stdev } from './outcome.ts';

export interface OrderOptions {
  config: RulesConfig;
  /** Partidas greedy × greedy de onde saem os pontos de decisão (1 sorteado por partida). */
  games: number;
  /** Rollouts por opção em cada ponto (os mesmos K para "1º" e "2º"). */
  rollouts: number;
  seedPrefix?: string;
}

export interface OrderPoint {
  seed: string;
  round: number;
  /** Média de (pontos indo 1º − pontos indo 2º) do jogador que escolhe. */
  difference: number;
  /** Erro padrão da diferença pareada. */
  stderr: number;
  verdict: 'FIRST' | 'SECOND' | 'TIE';
}

export interface OrderReport {
  points: number;
  /** Fração dos pontos decisivos (fora do ruído) em que ir 1º é melhor. Meta: 30–70%. */
  firstBetter: number;
  /** Fração dos pontos em que a diferença sai do ruído. Meta: ≥ 20% (senão a escolha não importa). */
  decisive: number;
  /** Diferença média (direção) e média do |diferença| nos pontos decisivos (tamanho). */
  meanDifference: number;
  meanDecisiveSize: number;
  /** Secundária, só informativa: com que frequência o greedy escolhe ir 1º nesses pontos. */
  greedyFirst: number;
  detail: OrderPoint[];
}

/** Estados de Escolha da iniciativa de uma partida greedy × greedy. */
function decisionPoints(config: RulesConfig, seed: string): GameState[] {
  const points: GameState[] = [];
  runGame({
    config,
    seed,
    bots: [BOTS.greedy, BOTS.greedy],
    onStep: (_before, after) => {
      if (after.phase.kind === 'ORDER_CHOICE') points.push(after);
    },
  });
  return points;
}

function rollout(state: GameState, chooser: PlayerId, first: boolean, seed: string, config: RulesConfig): number {
  const chosen = applyAction(state, chooser, { type: 'CHOOSE_ORDER', first });
  if (!chosen.ok) throw new Error(chosen.error.message);
  const result = runGame({ config, seed, initial: chosen.state, bots: [BOTS.greedy, BOTS.greedy], botSeed: `${seed}/bots` }).result;
  return score(result, chooser);
}

/**
 * Métrica contrafactual da Escolha da ordem (spec §3): em cada ponto, K rollouts pareados por opção,
 * cada um com a informação oculta reamostrada pela própria semente (sem espiar o monte real).
 */
export function orderExperiment(options: OrderOptions): OrderReport {
  const prefix = options.seedPrefix ?? 'ordem';
  const detail: OrderPoint[] = [];
  let greedyFirst = 0;
  for (let i = 0; i < options.games; i += 1) {
    const seed = `${prefix}-${i}`;
    const points = decisionPoints(options.config, seed);
    if (points.length === 0) continue;
    const state = createRng(`${seed}/ponto`).pick(points);
    if (state.phase.kind !== 'ORDER_CHOICE') continue;
    const chooser = state.phase.player;
    const diffs: number[] = [];
    for (let k = 0; k < options.rollouts; k += 1) {
      const rolloutSeed = `${seed}/r${k}`;
      const world = determinize(state, chooser, rolloutSeed);
      diffs.push(rollout(world, chooser, true, rolloutSeed, options.config) - rollout(world, chooser, false, rolloutSeed, options.config));
    }
    const difference = mean(diffs);
    const stderr = stdev(diffs) / Math.sqrt(diffs.length);
    const decisive = stderr === 0 ? difference !== 0 : Math.abs(difference) > 2 * stderr;
    const verdict = !decisive ? 'TIE' : difference > 0 ? 'FIRST' : 'SECOND';
    detail.push({ seed, round: state.round, difference, stderr, verdict });
    if (prefersFirst(viewFor(state, chooser))) greedyFirst += 1;
  }
  const decisivePoints = detail.filter((p) => p.verdict !== 'TIE');
  return {
    points: detail.length,
    firstBetter: decisivePoints.length === 0 ? 0 : decisivePoints.filter((p) => p.verdict === 'FIRST').length / decisivePoints.length,
    decisive: detail.length === 0 ? 0 : decisivePoints.length / detail.length,
    meanDifference: mean(detail.map((p) => p.difference)),
    meanDecisiveSize: mean(decisivePoints.map((p) => Math.abs(p.difference))),
    greedyFirst: detail.length === 0 ? 0 : greedyFirst / detail.length,
    detail,
  };
}
```

- [ ] **Step 4: Ver passar**

Run: `pnpm --filter @coringa/sim exec vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sim): turtle pareado e métrica contrafactual da Escolha da ordem"
```

---

### Task 11: Calibração (`pnpm sim:calibrate`)

**Files:**
- Create: `packages/sim/src/calibrate.ts`, `packages/sim/src/cli/calibrate.ts`, `packages/sim/test/calibrate.test.ts`
- Modify: `packages/sim/src/smoke.ts`, `package.json` (raiz)

**Interfaces:**
- Consumes: `runSeries`, `summarize`, `checkTargets`, `markdownTable`, `pct`, `writeReport` (Tarefa 9); `turtleExperiment`, `orderExperiment` (Tarefa 10); `recordGolden` (Tarefa 8, no smoke).
- Produces:
  - `SECTIONS = ['base', 'toggles', 'turtle', 'order', 'sweep']`, `type Section`
  - `interface CalibrationOptions { games; orderGames; rollouts; sections }`, `DEFAULT_CALIBRATION = { games: 1000, orderGames: 200, rollouts: 16, sections: SECTIONS }`
  - `SWEEP: Array<[label, ConfigOverrides]>`
  - `calibrate(options, log?): CalibrationReport` com `{ options, base, toggles, turtle, order, sweep }`
  - `renderMarkdown(report): string`

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/sim/test/calibrate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { makeConfig, validateConfig } from '@coringa/engine';
import { calibrate, renderMarkdown, SECTIONS, SWEEP } from '../src/calibrate.ts';

describe('calibração (miniatura)', () => {
  const report = calibrate({ games: 3, orderGames: 2, rollouts: 2, sections: SECTIONS });

  it('roda todas as seções', () => {
    expect(report.base.map((s) => s.label)).toEqual(['greedy × greedy', 'random × random', 'turtle × greedy']);
    expect(report.toggles.map((s) => s.label)).toEqual(['padrão', 'sem Escolha da iniciativa', 'sem Pressão da mesa', 'sem Coringas Selvagens']);
    expect(report.turtle.map((t) => [t.tablePressure, t.lead])).toEqual([[true, 10], [true, 20], [false, 10], [false, 20]]);
    expect(report.order).not.toBeNull();
    expect(report.sweep).toHaveLength(SWEEP.length);
  });

  it('o Markdown traz todas as seções', () => {
    const md = renderMarkdown(report);
    for (const title of ['Séries base', 'Regras novas liga/desliga', 'Turtle na mesma situação', 'Escolha da ordem', 'Varredura']) expect(md).toContain(title);
  });

  it('só roda as seções pedidas', () => {
    const only = calibrate({ games: 2, orderGames: 1, rollouts: 1, sections: ['base'] });
    expect(only.toggles).toEqual([]);
    expect(only.order).toBeNull();
  });

  it('toda config da varredura é válida', () => {
    for (const [, overrides] of SWEEP) expect(validateConfig(makeConfig(overrides))).toBeNull();
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run test/calibrate.test.ts`
Expected: FAIL — `../src/calibrate.ts` não existe.

- [ ] **Step 3: Implementar**

`packages/sim/src/calibrate.ts`:
```ts
import { makeConfig, type ConfigOverrides } from '@coringa/engine';
import type { BotName } from './bots/index.ts';
import { orderExperiment, type OrderReport } from './experiments/order.ts';
import { turtleExperiment, type TurtleReport } from './experiments/turtle.ts';
import { checkTargets, summarize, type Metrics, type TargetCheck } from './metrics.ts';
import { markdownTable, pct } from './report.ts';
import { runSeries } from './series.ts';

export const SECTIONS = ['base', 'toggles', 'turtle', 'order', 'sweep'] as const;
export type Section = (typeof SECTIONS)[number];

export interface CalibrationOptions {
  /** Partidas por série (1000 → margem de ~±3 pp numa taxa de 50%). */
  games: number;
  /** Partidas de onde saem os pontos de decisão da métrica contrafactual da ordem. */
  orderGames: number;
  /** Rollouts por opção em cada ponto de decisão. */
  rollouts: number;
  sections: readonly Section[];
}

export const DEFAULT_CALIBRATION: CalibrationOptions = { games: 1000, orderGames: 200, rollouts: 16, sections: SECTIONS };

export interface SeriesResult {
  label: string;
  bots: [BotName, BotName];
  config: ConfigOverrides;
  metrics: Metrics;
  targets: TargetCheck[];
}

export interface CalibrationReport {
  options: CalibrationOptions;
  base: SeriesResult[];
  /** Variantes com uma regra [N] desligada por vez, greedy × greedy, mesmas sementes. */
  toggles: SeriesResult[];
  /** Desenho pareado do turtle, com e sem Pressão da mesa. */
  turtle: Array<TurtleReport & { tablePressure: boolean }>;
  order: OrderReport | null;
  sweep: SeriesResult[];
}

const BASE: Array<[string, [BotName, BotName]]> = [
  ['greedy × greedy', ['greedy', 'greedy']],
  ['random × random', ['random', 'random']],
  ['turtle × greedy', ['turtle', 'greedy']],
];

const TOGGLES: Array<[string, ConfigOverrides]> = [
  ['padrão', {}],
  ['sem Escolha da iniciativa', { initiativeChoice: false }],
  ['sem Pressão da mesa', { tablePressure: false }],
  ['sem Coringas Selvagens', { wildJokers: false }],
];

/** Varredura da spec §3: vida, tamanho da fileira e composição do baralho. */
export const SWEEP: Array<[string, ConfigOverrides]> = [
  ...[60, 150, 200, 300, 400].map((hp): [string, ConfigOverrides] => [`hp ${hp}`, { hp }]),
  ...[5, 6, 8, 9].map((rowLimit): [string, ConfigOverrides] => [`fileira ${rowLimit}`, { rowLimit }]),
  ...[4, 8].map((faceCopies): [string, ConfigOverrides] => [`${faceCopies} de cada figura`, { deck: { faceCopies } }]),
  ...[6, 7].map((numericCopies): [string, ConfigOverrides] => [`${numericCopies} de cada numérica`, { deck: { numericCopies } }]),
];

function series(label: string, bots: [BotName, BotName], config: ConfigOverrides, games: number): SeriesResult {
  const metrics = summarize(runSeries(makeConfig(config), bots, games));
  return { label, bots, config, metrics, targets: checkTargets(metrics) };
}

export function calibrate(options: CalibrationOptions, log: (line: string) => void = () => {}): CalibrationReport {
  const has = (s: Section) => options.sections.includes(s);
  const report: CalibrationReport = { options, base: [], toggles: [], turtle: [], order: null, sweep: [] };
  if (has('base')) {
    for (const [label, bots] of BASE) {
      log(`série base: ${label}`);
      report.base.push(series(label, bots, {}, options.games));
    }
  }
  if (has('toggles')) {
    for (const [label, config] of TOGGLES) {
      log(`regras: ${label}`);
      report.toggles.push(series(label, ['greedy', 'greedy'], config, options.games));
    }
  }
  if (has('turtle')) {
    for (const tablePressure of [true, false]) {
      for (const lead of [10, 20]) {
        log(`turtle: vantagem ${lead}, pressão ${tablePressure ? 'ligada' : 'desligada'}`);
        const r = turtleExperiment({ config: makeConfig({ tablePressure }), games: options.games, lead });
        report.turtle.push({ ...r, tablePressure });
      }
    }
  }
  if (has('order')) {
    log(`ordem: ${options.orderGames} pontos × ${options.rollouts} rollouts`);
    report.order = orderExperiment({ config: makeConfig(), games: options.orderGames, rollouts: options.rollouts });
  }
  if (has('sweep')) {
    for (const [label, config] of SWEEP) {
      log(`varredura: ${label}`);
      report.sweep.push(series(label, ['greedy', 'greedy'], config, options.games));
    }
  }
  return report;
}

const METRIC_HEADERS = ['Série', 'Rodadas ATK (p10–med–p90)', 'Iniciativa vence', 'Exódia', 'Quadra', 'Anti-trav.', 'Terminam', 'Metas ok'];

function metricRow(s: SeriesResult): Array<string | number> {
  const m = s.metrics;
  return [
    s.label,
    `${m.attackRounds.p10}–${m.attackRounds.median}–${m.attackRounds.p90}`,
    pct(m.initiativeWin),
    pct(m.endReasons.EXODIA),
    pct(m.quads),
    pct(m.endReasons.ANTI_STALL + m.endReasons.DRAW),
    pct(m.terminated),
    `${s.targets.filter((t) => t.ok).length}/${s.targets.length}`,
  ];
}

export function renderMarkdown(r: CalibrationReport): string {
  const out: string[] = [`# Calibração do simulador`, '', `${r.options.games} partidas por série; sementes pareadas entre variantes.`, ''];
  if (r.base.length > 0) {
    out.push('## Séries base (config padrão)', '', markdownTable(METRIC_HEADERS, r.base.map(metricRow)), '');
    for (const s of r.base) {
      out.push(`### Metas — ${s.label}`, '', markdownTable(['Métrica', 'Valor', 'Meta', 'Ok'], s.targets.map((t) => [t.metric, t.metric.startsWith('Duração') ? t.value : pct(t.value), t.target, t.ok ? 'sim' : 'NÃO'])), '');
    }
    const mechanics = Object.keys(r.base[0].metrics.perGame);
    out.push('### Uso das mecânicas (média por partida)', '', markdownTable(['Série', ...mechanics], r.base.map((s) => [s.label, ...mechanics.map((k) => s.metrics.perGame[k as keyof Metrics['perGame']] ?? 0)])), '');
  }
  if (r.toggles.length > 0) {
    out.push('## Regras novas liga/desliga (greedy × greedy)', '', markdownTable([...METRIC_HEADERS, '1º escolhido'], r.toggles.map((s) => [...metricRow(s), s.metrics.orderFirst === null ? 'n/a' : pct(s.metrics.orderFirst)])), '');
  }
  if (r.turtle.length > 0) {
    out.push(
      '## Turtle na mesma situação (desenho pareado)',
      '',
      'O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.',
      '',
      markdownTable(
        ['Pressão', 'Vantagem', 'Ramos', 'Líder turtle', 'Líder greedy', 'Diferença', 'Meta (≤ 0)', 'Fins do turtle'],
        r.turtle.map((t) => [t.tablePressure ? 'ligada' : 'desligada', t.lead, t.branches, pct(t.turtle), pct(t.greedy), pct(t.difference), t.difference <= 0 ? 'sim' : 'NÃO', JSON.stringify(t.turtleEnds)]),
      ),
      '',
    );
  }
  if (r.order) {
    const o = r.order;
    out.push(
      '## Escolha da ordem (contrafactual)',
      '',
      markdownTable(
        ['Pontos', 'Decisivos', '1º melhor (entre decisivos)', 'Diferença média', 'Tamanho médio (decisivos)', 'Greedy escolhe 1º (info)', 'Metas ok'],
        [[o.points, pct(o.decisive), pct(o.firstBetter), pct(o.meanDifference), pct(o.meanDecisiveSize), pct(o.greedyFirst), o.firstBetter >= 0.3 && o.firstBetter <= 0.7 && o.decisive >= 0.2 ? 'sim' : 'NÃO']],
      ),
      '',
    );
  }
  if (r.sweep.length > 0) {
    out.push('## Varredura (greedy × greedy)', '', markdownTable(METRIC_HEADERS, r.sweep.map(metricRow)), '');
  }
  return `${out.join('\n')}\n`;
}
```

`packages/sim/src/cli/calibrate.ts`:
```ts
/** `pnpm sim:calibrate`: job de calibração (não entra no `pnpm check`). Grava reports/calibracao.{json,md}. */
import { calibrate, DEFAULT_CALIBRATION, renderMarkdown, SECTIONS, type Section } from '../calibrate.ts';
import { writeReport } from '../report.ts';
import { parseArgs } from './args.ts';

const { values } = parseArgs({
  options: {
    partidas: { type: 'string' },
    'pontos-ordem': { type: 'string' },
    rollouts: { type: 'string' },
    so: { type: 'string' },
  },
});
const sections = values.so ? (values.so.split(',') as Section[]) : SECTIONS;
for (const s of sections) if (!(SECTIONS as readonly string[]).includes(s)) throw new Error(`seção desconhecida: ${s} (use ${SECTIONS.join(', ')})`);

const options = {
  games: Number(values.partidas ?? DEFAULT_CALIBRATION.games),
  orderGames: Number(values['pontos-ordem'] ?? DEFAULT_CALIBRATION.orderGames),
  rollouts: Number(values.rollouts ?? DEFAULT_CALIBRATION.rollouts),
  sections,
};
const started = performance.now();
const report = calibrate(options, (line) => console.log(`… ${line}`));
const markdown = renderMarkdown(report);
console.log(`\n${markdown}`);
const paths = writeReport('calibracao', report, markdown);
console.log(`Tempo: ${((performance.now() - started) / 1000).toFixed(0)} s · ${paths.join(' · ')}`);
```

Em `package.json` (raiz), acrescente `"sim:calibrate": "node packages/sim/src/cli/calibrate.ts"`.

- [ ] **Step 4: Smoke cobre a calibração e as partidas de referência**

`packages/sim/src/smoke.ts` (substitui o arquivo):
```ts
/**
 * Smoke do simulador no Node puro (roda no `pnpm check`): carrega todos os módulos sem bundler,
 * roda uma calibração em miniatura e grava as partidas de referência em memória.
 */
import { calibrate, SECTIONS } from './calibrate.ts';
import { recordGolden } from './golden.ts';

const started = performance.now();
const report = calibrate({ games: 3, orderGames: 2, rollouts: 2, sections: SECTIONS });
if (report.base.some((s) => s.metrics.terminated !== 1)) throw new Error('smoke: partida que não terminou');
if (recordGolden().length === 0) throw new Error('smoke: sem partidas de referência');
console.log(`smoke do simulador ok: calibração mínima e partidas de referência em ${((performance.now() - started) / 1000).toFixed(1)} s`);
```

- [ ] **Step 5: Ver passar**

Run: `pnpm check`, depois `pnpm sim:calibrate --partidas 50 --pontos-ordem 10 --rollouts 4`
Expected: check verde; a calibração curta imprime o Markdown com as 5 seções e grava `packages/sim/reports/calibracao.json` e `.md`. Apague esses dois arquivos antes do commit: o relatório de verdade sai na Tarefa 13.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(sim): job de calibração com regras liga/desliga, turtle, ordem e varredura"
```

---

### Task 12: Jogo no terminal (`pnpm play`)

**Files:**
- Create: `packages/sim/src/play/text.ts`, `packages/sim/src/play/board.ts`, `packages/sim/src/play/io.ts`, `packages/sim/src/play/game.ts`, `packages/sim/src/cli/play.ts`, `packages/sim/test/play.test.ts`
- Modify: `packages/sim/src/smoke.ts`, `package.json` (raiz), `.gitignore`

**Interfaces:**
- Consumes: `BOTS`, `BotName` (Tarefa 7), `ReplayStep` (Tarefa 5), `Replay` (Tarefa 8), `createRng`, `RULE_OPTIONS`, `configFromArgs`, `botName` (Tarefa 9), e do motor `actingPlayers`, `viewFor`, `viewEvents`, `legalActions`, `attackPower`, `defensePower`.
- Produces:
  - `text.ts`: `cardText(card)`, `cardsText(cards)`, `ROW_NAME`, `interface Names { me; of(id); de(id) }`, `namesFor(me, botLabel?)`, `findCard(view, id)`, `DESTINATION_TEXT`, `actionText(action, view)`, `resultText(result, names)`, `eventText(event, names): string | null`
  - `board.ts`: `phaseText(view)`, `renderBoard(view, names)`
  - `io.ts`: `interface Io { ask(q): Promise<string>; print(t): void }`, `consoleIo()`, `scriptedIo(answers)`, `askChoice(io, title, options): Promise<number>`
  - `game.ts`: `HUMAN = 'voce'`, `BOT = 'bot'`, `REPLAYS_DIR`, `playGame({ io, seed, bot, config, saveDir? }): Promise<{ result; replay; savedTo }>`

- [ ] **Step 1: Escrever o teste (falhando)**

`packages/sim/test/play.test.ts`:
```ts
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyAction, createGame, legalActions, makeConfig, viewFor, type GameEvent } from '@coringa/engine';
import { P1, P2, setup } from '../../engine/test/helpers.ts';
import { renderBoard } from '../src/play/board.ts';
import { BOT, HUMAN, playGame } from '../src/play/game.ts';
import { askChoice, scriptedIo } from '../src/play/io.ts';
import { actionText, cardText, eventText, namesFor } from '../src/play/text.ts';

const names = namesFor(P1, 'Bot');

describe('textos em pt-BR', () => {
  it('cartas com naipe; Selvagem pelo nome', () => {
    expect(cardText({ id: 'x', kind: 'NUM', value: 7, suit: 'copas' })).toBe('7♥');
    expect(cardText({ id: 'y', kind: 'J', suit: 'espadas' })).toBe('J♠');
    expect(cardText({ id: 'z', kind: 'WILD' })).toBe('Selvagem');
  });

  it('toda ação legal tem texto, e o ataque mostra ATK contra DEF (exemplo 1 da §1.13)', () => {
    const s = setup({ p1: { hand: ['J', 'Q', 'K', 'A', 'W'], attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8], defenseBuffs: ['Q'], guard: 1 } });
    const view = viewFor(s, P1);
    const texts = legalActions(view).map((a) => actionText(a, view));
    expect(texts.every((t) => t.length > 0 && !t.includes('undefined'))).toBe(true);
    expect(texts).toContain('Declarar o ataque (ATK 38 contra DEF 26)');
  });

  it('eventos viram frases; janelas de reação não aparecem', () => {
    const e = (event: GameEvent) => eventText(event, names);
    expect(e({ type: 'DamageDealt', attacker: P1, defender: P2, attack: 38, defense: 13, damage: 25 })).toBe('Ataque de você: 38 contra 13 → 25 de dano');
    expect(e({ type: 'ReactionWindowOpened', responder: P2, trigger: 'ATTACK' })).toBeNull();
    expect(e({ type: 'CardsDealt', player: P2, count: 4 })).toBe('Bot recebeu 4 cartas');
    expect(e({ type: 'GameOver', result: { kind: 'DRAW', reason: 'ANTI_STALL' } })).toContain('empate');
  });

  it('todo tipo de evento de uma partida real tem tratamento', () => {
    const created = createGame(makeConfig(), 'eventos', [P1, P2]);
    if (!created.ok) throw new Error(created.error.message);
    let s = created.state;
    for (let i = 0; i < 400 && s.phase.kind !== 'GAME_OVER'; i += 1) {
      const actor = s.players.map((p) => p.id).find((id) => legalActions(viewFor(s, id)).length > 0)!;
      const result = applyAction(s, actor, legalActions(viewFor(s, actor))[0]);
      if (!result.ok) throw new Error(result.error.message);
      for (const ev of result.events) expect(() => eventText(ev, names)).not.toThrow();
      s = result.state;
    }
  });
});

describe('mesa no terminal', () => {
  it('mostra vida, guarda, buffs, fileiras, mão do oponente só como quantidade, monte, cemitério e pressão', () => {
    const s = setup({ pressure: 2, p1: { hand: ['J'], attack: [4, 6], attackBuffs: ['J'] }, p2: { hand: ['Q', 'K'], guard: 2, hp: 70 }, graveyard: [5, 'A'] });
    const board = renderBoard(viewFor(s, P1), names);
    for (const piece of ['Vida 70', 'Guarda: 2 K', 'Mão: 2 cartas', 'Pressão +2', 'Monte', 'Cemitério 2', 'ATK 40', 'Sua vez: fase principal']) {
      expect(board).toContain(piece);
    }
    expect(board).not.toMatch(/Q[♥♦♠♣]/);
  });
});

describe('askChoice', () => {
  it('repete a pergunta até receber um número válido', async () => {
    const io = scriptedIo(['9', 'abc', '2']);
    expect(await askChoice(io, 'Escolha', ['a', 'b'])).toBe(1);
    expect(io.output.filter((l) => l.startsWith('Digite'))).toHaveLength(2);
  });
});

describe('partida no terminal (roteirizada)', () => {
  it('joga até o fim contra o greedy, mostra o resultado e salva um replay reproduzível', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-play-'));
    const io = scriptedIo(() => '1');
    const outcome = await playGame({ io, seed: 'roteiro', bot: 'greedy', config: makeConfig(), saveDir: dir });
    expect(io.output.join('\n')).toContain('Fim de jogo');
    expect(outcome.savedTo).toBe(join(dir, 'roteiro.json'));
    const saved = JSON.parse(readFileSync(outcome.savedTo!, 'utf8'));
    expect(saved.players).toEqual([HUMAN, BOT]);
    let s = (() => {
      const c = createGame(saved.config, saved.seed, saved.players);
      if (!c.ok) throw new Error(c.error.message);
      return c.state;
    })();
    for (const step of saved.steps) {
      const r = applyAction(s, step.player, step.action);
      if (!r.ok) throw new Error(r.error.message);
      s = r.state;
    }
    expect(s.phase).toEqual({ kind: 'GAME_OVER', result: outcome.result });
  });

  it('pergunta o Equipar carta a carta e não pergunta quando só há uma opção', async () => {
    let n = 0;
    const io = scriptedIo(() => (n++ % 2 === 0 ? '2' : '1'));
    await playGame({ io, seed: 'equipar', bot: 'random', config: makeConfig(), saveDir: null });
    const text = io.output.join('\n');
    expect(text).toMatch(/Carta 1\/\d: /);
    expect(text).toContain('Fileira de Defesa');
  });
});
```

- [ ] **Step 2: Ver falhar**

Run: `pnpm --filter @coringa/sim exec vitest run test/play.test.ts`
Expected: FAIL — módulos de `../src/play/` não existem.

- [ ] **Step 3: Textos em pt-BR**

`packages/sim/src/play/text.ts`:
```ts
import type { Action, Card, Destination, GameEvent, GameResult, PlayerId, PlayerView, RowName } from '@coringa/engine';
import { attackPower, defensePower } from '@coringa/engine';

const SUIT: Record<string, string> = { copas: '♥', ouros: '♦', espadas: '♠', paus: '♣' };

/** "7♥", "J♠", "Selvagem". */
export function cardText(card: Card): string {
  if (card.kind === 'WILD') return 'Selvagem';
  const symbol = SUIT[card.suit];
  return card.kind === 'NUM' ? `${card.value}${symbol}` : `${card.kind}${symbol}`;
}

export const cardsText = (cards: Card[]): string => (cards.length === 0 ? '—' : cards.map(cardText).join(' '));

export const ROW_NAME: Record<RowName, string> = { ATK: 'Ataque', DEF: 'Defesa' };

/** Nomes exibidos: "Você" / "Bot (greedy)", e a forma com "de" ("de você" / "do Bot (greedy)"). */
export interface Names {
  me: PlayerId;
  of(id: PlayerId): string;
  de(id: PlayerId): string;
}

export function namesFor(me: PlayerId, botLabel = 'Bot'): Names {
  return { me, of: (id) => (id === me ? 'Você' : botLabel), de: (id) => (id === me ? 'de você' : `do ${botLabel}`) };
}

/** Procura uma carta pelo id em tudo que a visão mostra. */
export function findCard(view: PlayerView, id: string): Card | undefined {
  const zones: Card[][] = [
    view.self.hand,
    view.self.pending,
    view.graveyard,
    ...[view.self, view.opponent].flatMap((p) => [p.attackRow, p.defenseRow, p.attackBuffs, p.defenseBuffs, p.guard]),
  ];
  return zones.flat().find((c) => c.id === id);
}

const idText = (view: PlayerView, id: string): string => {
  const card = findCard(view, id);
  return card ? cardText(card) : id;
};

export const DESTINATION_TEXT: Record<Destination, string> = {
  ATK: 'Fileira de Ataque',
  DEF: 'Fileira de Defesa',
  REPLACE_LAST_ATK: 'Trocar a última carta do Ataque',
  REPLACE_LAST_DEF: 'Trocar a última carta da Defesa',
  DISCARD: 'Descartar no cemitério',
};

/** Texto de uma ação legal, em pt-BR, como aparece no menu numerado. */
export function actionText(action: Action, view: PlayerView): string {
  const t = (id: string) => idText(view, id);
  switch (action.type) {
    case 'EQUIP':
      return `Equipar: ${view.self.pending.map((c, i) => `${cardText(c)} → ${DESTINATION_TEXT[action.destinations[i]]}`).join(', ')}`;
    case 'CHOOSE_ORDER':
      return action.first ? 'Atacar primeiro' : 'Atacar em segundo';
    case 'PLAY_J':
      return `Jogar ${t(action.cardId)} como J nos Buffs de Ataque`;
    case 'PLAY_Q':
      return `Jogar ${t(action.cardId)} como Q nos Buffs de Defesa`;
    case 'PLAY_K':
      return `Pôr ${action.cardIds.length} K na Guarda (${action.cardIds.map(t).join(' ')})`;
    case 'TRAP':
      return `Armadilha com ${t(action.cardId)}: destruir ${t(action.targetId)} do oponente`;
    case 'SACRIFICE':
      return `Sacrificar ${t(action.cardId)} para destruir ${t(action.targetId)} do oponente`;
    case 'REFLECT':
      return `Lançar Reflect (${t(action.kId)} + ${t(action.jId)} + ${t(action.qId)})`;
    case 'CANCEL_REFLECT':
      return `Anular o Reflect com ${t(action.kId)} + ${t(action.jId)} + ${t(action.qId)} da mão`;
    case 'PROTECT_FROM_REFLECT':
      return `Proteger-se do Reflect sacrificando ${t(action.jId)} + ${t(action.qId)} + ${t(action.kId)} do campo`;
    case 'RESURRECT':
      return `Ressuscitar ${t(action.cardId)} no fim da fileira de ${ROW_NAME[action.row]}`;
    case 'DECLARE_ATTACK':
      return `Declarar o ataque (ATK ${attackPower(view.self, view.pressure)} contra DEF ${defensePower(view.opponent)})`;
    case 'END_TURN':
      return 'Encerrar o turno (Ataque vazio, sem ataque)';
    case 'PASS':
      return 'Passar';
    case 'TIMEOUT':
      return 'Tempo esgotado';
    case 'FORFEIT':
      return 'Desistir';
  }
}

const REASON_TEXT: Record<Extract<GameResult, { kind: 'WIN' }>['reason'], string> = {
  HP: 'vida do oponente chegou a 0',
  EXODIA: 'Exódia',
  ANTI_STALL: 'anti-travamento, com mais vida',
  FORFEIT: 'W.O.',
};

export function resultText(result: GameResult, names: Names): string {
  if (result.kind === 'DRAW') return 'Fim de jogo: empate (anti-travamento, vidas iguais)';
  return `Fim de jogo: ${names.of(result.winner)} venceu (${REASON_TEXT[result.reason]})`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Uma linha de log por evento, já redigido por `viewEvents`. null = evento sem interesse no terminal. */
export function eventText(e: GameEvent, names: Names): string | null {
  const who = (id: PlayerId) => names.of(id);
  const de = (id: PlayerId) => names.de(id);
  switch (e.type) {
    case 'RoundStarted':
      return `\n══ Rodada ${e.round}: ${e.kind === 'EQUIP' ? 'Equipar' : 'Ataque'} ══`;
    case 'DeckReshuffled':
      return `O cemitério (${e.count} cartas) foi embaralhado e virou o novo monte`;
    case 'CardsDealt':
      return e.cards ? `${who(e.player)} recebeu: ${cardsText(e.cards)}` : `${who(e.player)} recebeu ${e.count} cartas`;
    case 'EquipSubmitted':
      return `${who(e.player)} confirmou o Equipar`;
    case 'CardsPlaced': {
      const parts = e.placements.map((p) => {
        const card = cardText(p.card);
        if (p.destination === 'DISCARD') return `${card} descartada`;
        const row = p.destination === 'ATK' || p.destination === 'REPLACE_LAST_ATK' ? 'Ataque' : 'Defesa';
        return p.replaced ? `${card} no lugar de ${cardText(p.replaced)} (${row})` : `${card} → ${row}`;
      });
      return `${who(e.player)} equipou: ${parts.length === 0 ? 'nada' : parts.join(', ')}`;
    }
    case 'OrderChosen':
      return `${who(e.player)} escolheu atacar ${e.first ? 'primeiro' : 'em segundo'}`;
    case 'TurnStarted':
      return `→ Turno de ataque: ${who(e.player)}`;
    case 'BuffPlayed':
      return `${who(e.player)} jogou ${cardText(e.card)}${e.card.kind === 'WILD' ? ` como ${e.as}` : ''} nos Buffs de ${e.as === 'J' ? 'Ataque' : 'Defesa'}`;
    case 'GuardPlayed':
      return `${who(e.player)} pôs ${e.cards.length} K na Guarda`;
    case 'TrapUsed':
      return `${who(e.player)} usou Armadilha (${cardText(e.card)}) e destruiu ${cardText(e.target)} ${de(e.targetOwner)}`;
    case 'Sacrificed':
      return `${who(e.player)} sacrificou ${cardText(e.card)} e destruiu ${cardText(e.target)} ${de(e.targetOwner)}`;
    case 'ReflectPlayed':
      return `${who(e.player)} lançou um Reflect!`;
    case 'ReflectCanceled':
      return `${who(e.player)} anulou o Reflect ${de(e.owner)}`;
    case 'ReflectProtected':
      return `${who(e.player)} se protegeu do Reflect ${de(e.owner)}`;
    case 'ReflectExpired':
      return `O Reflect ${de(e.owner)} expirou`;
    case 'ReflectTriggered':
      return `O Reflect ${de(e.owner)} devolveu ${e.damage} de dano`;
    case 'ReactionWindowOpened':
    case 'ReactionWindowClosed':
      return null;
    case 'AttackDeclared':
      return `${who(e.player)} declarou o ataque`;
    case 'AbsoluteAttack':
      return `ATAQUE ABSOLUTO ${de(e.player)}!`;
    case 'DamageDealt':
      return `Ataque ${de(e.attacker)}: ${e.attack} contra ${e.defense} → ${e.damage} de dano`;
    case 'GuardBroken':
      return `${e.cards.length} ${plural(e.cards.length, 'K quebrou', 'K quebraram')} na Guarda ${de(e.player)}`;
    case 'BuffRemoved':
      return `${who(e.player)} perdeu ${cardsText(e.cards)} dos buffs`;
    case 'CardsRemovedFromRow':
      return e.cards.length === 0 ? null : `Saiu ${cardsText(e.cards)} do ${ROW_NAME[e.row]} ${de(e.player)}`;
    case 'QuadFormed':
      return `${who(e.player)} formou uma quadra de ${e.quad.value} no ${ROW_NAME[e.quad.row]}: +${e.quad.value} e 1 Ressurreição`;
    case 'QuadBroken':
      return `A quadra de ${e.quad.value} ${de(e.player)} se desfez`;
    case 'Resurrected':
      return `${who(e.player)} ressuscitou ${cardText(e.card)} na fileira de ${ROW_NAME[e.row]}`;
    case 'AbsoluteDefenseStarted':
      return `DEFESA ABSOLUTA ${de(e.player)}!`;
    case 'AbsoluteDefenseEnded':
      return `A Defesa Absoluta ${de(e.player)} terminou`;
    case 'PressureChanged':
      return `Pressão da mesa: +${e.pressure}`;
    case 'InitiativeChanged':
      return `${who(e.player)} ficou com a iniciativa`;
    case 'Exodia':
      return `EXÓDIA ${de(e.player)}!`;
    case 'GameOver':
      return resultText(e.result, names);
  }
}
```

- [ ] **Step 4: Mesa, IO e o laço da partida**

`packages/sim/src/play/board.ts`:
```ts
import { attackPower, defensePower, type PlayerView, type PublicPlayer } from '@coringa/engine';
import { cardsText, cardText, type Names } from './text.ts';

const TRIGGER_TEXT = { ATTACK: 'o oponente declarou ataque', K_PLAYED: 'o oponente jogou K', REFLECT_PLAYED: 'o oponente lançou Reflect' } as const;

/** O que o jogador precisa decidir agora. */
export function phaseText(view: PlayerView): string {
  const phase = view.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return 'Sua vez: Equipar (as numéricas vão para o campo na ordem de compra)';
    case 'ORDER_CHOICE':
      return 'Sua vez: Escolha da iniciativa';
    case 'ATTACK_MAIN':
      return 'Sua vez: fase principal do turno de ataque';
    case 'REACTION':
      return `Janela de reação: ${TRIGGER_TEXT[phase.trigger]}`;
    case 'GAME_OVER':
      return 'Fim de jogo';
  }
}

function playerBlock(label: string, p: PublicPlayer, pressure: number, hand: string): string[] {
  const status = [p.reflect ? 'Reflect ativo' : '', p.absoluteDefense ? 'Defesa Absoluta' : '', p.resurrectionCount > 0 ? `Ressurreições: ${p.resurrectionCount}` : '']
    .filter(Boolean)
    .join(' · ');
  return [
    `${label.padEnd(5)} Vida ${p.hp}   Guarda: ${p.guard.length === 0 ? '—' : `${p.guard.length} K`}   Mão: ${hand}${status ? `   [${status}]` : ''}`,
    `      Buffs de Ataque: ${cardsText(p.attackBuffs)}   Buffs de Defesa: ${cardsText(p.defenseBuffs)}`,
    `      Ataque: ${cardsText(p.attackRow).padEnd(28)} ATK ${attackPower(p, pressure)}`,
    `      Defesa: ${cardsText(p.defenseRow).padEnd(28)} DEF ${defensePower(p)}`,
  ];
}

/** A mesa vista por quem joga no terminal: tudo o que a visão pública mostra + a própria mão. */
export function renderBoard(view: PlayerView, names: Names): string {
  const recent = view.graveyard.slice(-5).map(cardText).join(' ');
  const header = [
    `Rodada ${view.round} (${view.roundKind === 'EQUIP' ? 'Equipar' : 'Ataque'})`,
    `Pressão +${view.pressure} (${view.noDamageStreak} sem dano)`,
    `Monte ${view.deckCount}`,
    `Cemitério ${view.graveyard.length}${recent ? ` (últimas: ${recent})` : ''}`,
    `Iniciativa: ${names.of(view.initiative)}`,
  ].join(' · ');
  return [
    header,
    ...playerBlock(names.of(view.opponent.id).toUpperCase(), view.opponent, view.pressure, `${view.opponent.handCount} cartas`),
    ...playerBlock('VOCÊ', view.self, view.pressure, cardsText(view.self.hand)),
    phaseText(view),
  ].join('\n');
}
```

`packages/sim/src/play/io.ts`:
```ts
import { createInterface } from 'node:readline/promises';

/** Entrada e saída do jogo no terminal; os testes usam `scriptedIo` (stdin por pipe perde linhas no readline). */
export interface Io {
  ask(question: string): Promise<string>;
  print(text: string): void;
}

export function consoleIo(): Io & { close(): void } {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return { ask: (q) => rl.question(q), print: (t) => console.log(t), close: () => rl.close() };
}

/** Respostas fixas, na ordem; acabar as respostas é erro (o teste pediu menos do que o jogo perguntou). */
export function scriptedIo(answers: string[] | ((question: string) => string)): Io & { output: string[] } {
  const output: string[] = [];
  let i = 0;
  return {
    output,
    ask: async (q) => {
      output.push(q);
      if (typeof answers === 'function') return answers(q);
      if (i >= answers.length) throw new Error(`respostas esgotadas na pergunta: ${q}`);
      return answers[i++];
    },
    print: (t) => output.push(t),
  };
}

/** Pergunta até receber um número entre 1 e `options.length`. Devolve o índice (base 0). */
export async function askChoice(io: Io, title: string, options: string[]): Promise<number> {
  io.print(`${title}\n${options.map((o, i) => `  ${String(i + 1).padStart(2)}) ${o}`).join('\n')}`);
  for (;;) {
    const answer = Number((await io.ask('> ')).trim());
    if (Number.isInteger(answer) && answer >= 1 && answer <= options.length) return answer - 1;
    io.print(`Digite um número de 1 a ${options.length}.`);
  }
}
```

`packages/sim/src/play/game.ts`:
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  viewEvents,
  viewFor,
  type Action,
  type Destination,
  type GameResult,
  type PlayerId,
  type PlayerView,
  type RulesConfig,
} from '@coringa/engine';
import { BOTS, type BotName } from '../bots/index.ts';
import type { ReplayStep } from '../match.ts';
import type { Replay } from '../replay.ts';
import { createRng } from '../rng.ts';
import { renderBoard } from './board.ts';
import { askChoice, type Io } from './io.ts';
import { actionText, cardText, DESTINATION_TEXT, eventText, namesFor, resultText } from './text.ts';

export const HUMAN: PlayerId = 'voce';
export const BOT: PlayerId = 'bot';
export const REPLAYS_DIR = fileURLToPath(new URL('../../replays/', import.meta.url));

export interface PlayOptions {
  io: Io;
  seed: string;
  bot: BotName;
  config: RulesConfig;
  /** Pasta onde salvar o replay; null = não salvar. Padrão: packages/sim/replays/. */
  saveDir?: string | null;
}

export interface PlayOutcome {
  result: GameResult;
  replay: Replay;
  savedTo: string | null;
}

type Equip = Extract<Action, { type: 'EQUIP' }>;

/** Equipar carta a carta: só oferece destinos que levam a uma combinação legal (com as fileiras cheias seriam até 81). */
async function askEquip(io: Io, view: PlayerView, legal: Action[]): Promise<Action> {
  const options = legal.filter((a): a is Equip => a.type === 'EQUIP');
  const chosen: Destination[] = [];
  for (const [i, card] of view.self.pending.entries()) {
    const fits = options.filter((a) => chosen.every((d, j) => a.destinations[j] === d));
    const destinations = [...new Set(fits.map((a) => a.destinations[i]))];
    if (destinations.length === 1) {
      io.print(`Carta ${i + 1}/${view.self.pending.length}: ${cardText(card)} → ${DESTINATION_TEXT[destinations[0]]} (única opção)`);
      chosen.push(destinations[0]);
      continue;
    }
    const pick = await askChoice(io, `Carta ${i + 1}/${view.self.pending.length}: ${cardText(card)}`, destinations.map((d) => DESTINATION_TEXT[d]));
    chosen.push(destinations[pick]);
  }
  const action = options.find((a) => a.destinations.every((d, j) => d === chosen[j]));
  if (!action) throw new Error('combinação de Equipar fora da lista legal');
  return action;
}

async function askHuman(io: Io, view: PlayerView, legal: Action[], names: ReturnType<typeof namesFor>): Promise<Action> {
  io.print(`\n${renderBoard(view, names)}`);
  if (view.phase.kind === 'EQUIP') return askEquip(io, view, legal);
  return legal[await askChoice(io, 'Ações legais:', legal.map((a) => actionText(a, view)))];
}

function save(replay: Replay, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${replay.seed}.json`);
  writeFileSync(path, `${JSON.stringify(replay, null, 1)}\n`);
  return path;
}

/** Partida no terminal contra um bot, sem timers (spec §4). */
export async function playGame(options: PlayOptions): Promise<PlayOutcome> {
  const { io, seed, config } = options;
  const created = createGame(config, seed, [HUMAN, BOT]);
  if (!created.ok) throw new Error(created.error.message);
  let state = created.state;
  const bot = BOTS[options.bot];
  const rng = createRng(`${seed}/bot`);
  const names = namesFor(HUMAN, `Bot (${options.bot})`);
  const steps: ReplayStep[] = [];
  io.print(`Jogo do Coringa — você contra o bot ${options.bot} · semente "${seed}"`);
  io.print(`Iniciativa inicial: ${names.of(state.initiative)}`);
  for (const p of state.players) {
    if (p.id === HUMAN) io.print(`Você recebeu: ${[...p.hand, ...p.pending].map(cardText).join(' ')}`);
  }
  while (state.phase.kind !== 'GAME_OVER') {
    const actor = actingPlayers(state)[0];
    const view = viewFor(state, actor);
    const legal = legalActions(view);
    const action = actor === HUMAN ? await askHuman(io, view, legal, names) : bot(view, legal, rng);
    const result = applyAction(state, actor, action);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    steps.push({ player: actor, action });
    for (const e of viewEvents(result.events, HUMAN)) {
      const line = eventText(e, names);
      if (line !== null) io.print(line);
    }
    state = result.state;
  }
  const finalResult = state.phase.result;
  io.print(`\n${renderBoard(viewFor(state, HUMAN), names)}\n${resultText(finalResult, names)}`);
  const replay: Replay = { name: `play-${seed}`, config, seed, players: [HUMAN, BOT], steps };
  const dir = options.saveDir === undefined ? REPLAYS_DIR : options.saveDir;
  const savedTo = dir === null ? null : save(replay, dir);
  if (savedTo) io.print(`Partida salva em ${savedTo}`);
  return { result: finalResult, replay, savedTo };
}
```

- [ ] **Step 5: Ver passar**

Run: `pnpm --filter @coringa/sim exec vitest run`
Expected: PASS.

- [ ] **Step 6: CLI, smoke final e scripts**

`packages/sim/src/cli/play.ts`:
```ts
/** `pnpm play`: você contra o bot no terminal (spec §4). */
import { makeConfig, validateConfig } from '@coringa/engine';
import { consoleIo } from '../play/io.ts';
import { playGame } from '../play/game.ts';
import { botName, configFromArgs, parseArgs, RULE_OPTIONS } from './args.ts';

const { values } = parseArgs({ options: { ...RULE_OPTIONS, semente: { type: 'string' }, bot: { type: 'string', default: 'greedy' } } });
const config = makeConfig(configFromArgs(values));
const error = validateConfig(config);
if (error) throw new Error(error.message);
const io = consoleIo();
try {
  await playGame({ io, seed: values.semente ?? Date.now().toString(36), bot: botName(values.bot ?? 'greedy'), config });
} finally {
  io.close();
}
```

`packages/sim/src/smoke.ts` (versão final):
```ts
/**
 * Smoke do simulador no Node puro (roda no `pnpm check`): carrega todos os módulos sem bundler,
 * joga poucas partidas de cada bot, uma calibração em miniatura e uma partida de terminal roteirizada.
 */
import { makeConfig } from '@coringa/engine';
import { calibrate, SECTIONS } from './calibrate.ts';
import { scriptedIo } from './play/io.ts';
import { playGame } from './play/game.ts';
import { recordGolden } from './golden.ts';

const started = performance.now();
const report = calibrate({ games: 3, orderGames: 2, rollouts: 2, sections: SECTIONS });
if (report.base.some((s) => s.metrics.terminated !== 1)) throw new Error('smoke: partida que não terminou');
if (recordGolden().length === 0) throw new Error('smoke: sem partidas de referência');
const { result } = await playGame({ io: scriptedIo(() => '1'), seed: 'smoke', bot: 'greedy', config: makeConfig(), saveDir: null });
console.log(`smoke do simulador ok: calibração mínima, partidas de referência e jogo no terminal (${result.kind}) em ${((performance.now() - started) / 1000).toFixed(1)} s`);
```

Em `package.json` (raiz), acrescente `"play": "node packages/sim/src/cli/play.ts"`. Em `.gitignore`, acrescente `packages/sim/replays/`.

Run: `pnpm check`
Expected: verde; o smoke termina com `smoke do simulador ok: calibração mínima, partidas de referência e jogo no terminal (WIN) ...`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sim): jogo no terminal contra o bot (pnpm play)"
```

- [ ] **Step 8: Teste manual com o autor**

Peça ao autor para rodar, no PowerShell, na pasta `D:\andr3\jogo-coringa-sim`:
```bash
pnpm play
```
e confirmar: acentos e naipes (♥ ♦ ♠ ♣) aparecem certos; entrada inválida repete a pergunta; a partida termina e mostra onde salvou o replay. Se os naipes saírem quebrados no terminal dele, anote para a Tarefa 13 (não é bloqueante para o simulador). O "feeling" das regras (spec §6, item 3) é avaliado nas partidas dele, depois da calibração.

---

### Task 13: Rodar a calibração e levar os resultados ao autor

**Files:**
- Create: `packages/sim/reports/calibracao.json`, `packages/sim/reports/calibracao.md` (gerados)

**Interfaces:**
- Consumes: `pnpm sim:calibrate` (Tarefa 11).
- Produces: o relatório de calibração commitado e uma lista de desvios com propostas de parâmetro para o autor decidir.

- [ ] **Step 1: Rodar a calibração completa**

Run (em segundo plano; no protótipo levou ~4 min): `pnpm sim:calibrate`
Expected: `reports/calibracao.md` com as 5 seções e a linha `Tempo: ... s`.

- [ ] **Step 2: Commit do relatório**

```bash
git add packages/sim/reports/calibracao.json packages/sim/reports/calibracao.md
git commit -m "docs(sim): relatório de calibração com a config padrão"
```

- [ ] **Step 3: Levar ao autor**

Mande ao autor, em lote numerado: cada meta da §3 fora da faixa, o valor medido, a causa provável e uma proposta (por exemplo, o valor de vida da varredura que coloca a duração em 8–14), mais o que o turtle pareado e a métrica da ordem mostraram. **Não mude `DEFAULT_CONFIG` nem a spec sem a aprovação dele.** Uma mudança aprovada vira tarefa nova: altera o padrão, atualiza `config.test.ts`, regrava as partidas de referência (`record-golden` + `vitest run -u`, com o diff revisado) e registra a decisão na spec (§6, item 2).

- [ ] **Step 4: PR pronto e merge**

`git push`, marque o PR como pronto para revisão e confirme que o job `check` está verde. Com o `pnpm check` local e a CI verdes, faça o merge na `main` por squash no GitHub (`gh pr merge --squash`) ou fast-forward, mantendo o histórico limpo. Não use `--delete-branch`: o `gh` tenta trocar o worktree para a `main` antes de apagar a branch local. Apague a branch remota pelo GitHub.

- [ ] **Step 5: Proteção da `main` (decisão do autor)**

Leve ao autor, como passo explícito, a recomendação de ligar a proteção da `main` exigindo o job `check` verde antes do merge (Settings → Branches no GitHub). É configuração do repositório: quem liga é ele, ou você via `gh`, se ele autorizar na hora.

---

## Cobertura da spec

| Spec | Onde |
|---|---|
| §2.1 Funciona igual no Node | Tarefa 1 |
| §3 Bots `random`, `greedy`, `turtle` e interface `Bot` | Tarefas 5, 6, 7 |
| §3 Runner com sementes reprodutíveis, tabela + JSON em `reports/` | Tarefas 5, 9 |
| §3 Comparação liga/desliga das regras [N] e varredura (`hp`, `rowLimit`, baralho) | Tarefa 11 |
| §3 Metas (duração, iniciativa, Exódia, Fallen is Back, anti-travamento, término) | Tarefa 9 (`checkTargets`) |
| §3 Escolha da ordem (contrafactual) e turtle na mesma situação (pareado) | Tarefa 10 |
| §4 `pnpm play` contra o `greedy`, ações numeradas, prompts, replay | Tarefa 12 |
| §5 Portão automático, partidas de referência, playouts enviesados | Tarefas 2, 4, 8 |
| §6 item 2 (relatório dentro das metas ou desvios explicados) | Tarefa 13 |
| §6 item 3 (autor aprova o "feeling") | Tarefa 12, Step 8, e depois da calibração |
