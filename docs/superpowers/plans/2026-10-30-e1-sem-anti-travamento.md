# E1: sem anti-travamento, Defesa Absoluta até o ataque, Absolutos em 3 s — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans,
> tarefa por tarefa. Os passos usam caixas (`- [ ]`) para o acompanhamento.

**Objetivo:** a partida deixa de acabar por anti-travamento (sem limite de rodadas, sem empate). A Defesa Absoluta passa a durar
até o oponente atacar de fato. As cenas do Ataque Absoluto e da Defesa Absoluta passam a ter 3 s.

**Arquitetura:** o motor perde `antiStallRounds`, `noDamageStreak`, `hpLostThisRound` e o resultado `DRAW`. O `endTurn` passa a
saber se houve ataque no turno, e só então encerra a Defesa Absoluta do outro. O simulador ganha um teto próprio de 400 rodadas,
que vira "sem fim" nos relatórios e nunca é regra. A web tira o contador "Sem dano", a dica 9 e o item do resumo, e continua
lendo as partidas antigas guardadas no navegador (anti-travamento e empate).

**Stack:** TypeScript no Node 24 puro (motor, protocolo, simulador, servidor), Vite + React na web, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-ajustes-design.md`, seção E1. A origem está em `docs/memoria/decisoes.md`:
2026-10-30 (item 6 do lote) e 2026-10-30 (4).

## Restrições globais

- Rode `pnpm check` antes de commitar (os hooks rodam). **Nunca** `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- Imports relativos terminam em `.ts`. Só sintaxe apagável. `import type` para tipos.
- Textos, comentários e mensagens de commit em pt-BR; identificadores em inglês.
- Mudar uma partida de referência exige `RULES_VERSION` 3 e o digest novo em `RULES_DIGESTS`. O `-u` dos snapshots só depois de
  revisar o diff, e o commit diz qual regra mudou.
- Mudou a forma do `GameState`: `STATE_SCHEMA` 3 (`packages/server/src/core/timers.ts`).
- Na web, nada de regra: o que a mesa mostra vem do motor. Nada de `@coringa/protocol/schemas` nem `node:*` em `packages/web/src`.
- Fotossensibilidade (spec da web §10.4): no máximo 1 inversão por cena, de ≥ 300 ms; nunca mais de 3 trocas claro ↔ escuro em
  1 s. Não afrouxe os testes da linha do tempo.
- Antes de cada job longo (`pnpm check`, `pnpm e2e`, `sim:calibrate`, `sim:dificil`), commite o `docs/memoria/estado.md` com o
  próximo passo (regra 2 do `CLAUDE.md`).
- Branch `feat/sem-anti-travamento`, a partir da `main` com a `feat/memoria-espera` mesclada.
- **Cada commit que muda regra regrava as partidas de referência e o digest no mesmo commit.** O pre-commit roda os testes
  ligados aos arquivos em stage, e o teste das partidas de referência e o do digest falham se o resultado mudar sem eles. A
  `RULES_VERSION` sobe para 3 uma vez só, no primeiro desses commits. Os seguintes, na mesma branch, só trocam o digest: a
  versão 3 só sai no merge.
- Ordem dos commits: tarefa 1 → tarefas 2 e 3 (juntas) → 4 → 5 → 6 → 7.

## Foco da revisão

1. **Partidas antigas no navegador** (`coringa:partidas`) com resultado `ANTI_STALL` (vitória ou empate) e placar com `draws`
   continuam na lista, com o texto antigo, e o replay abre com o aviso de versão. Nada some da lista do jogador. Teste na
   tarefa 3.
2. **Configs antigas com `antiStallRounds`** (replays guardados, partidas de referência antigas) continuam passando no
   `validateConfig`. A chave a mais é ignorada. Teste na tarefa 2.
3. **Ninguém ataca nunca** (os dois com o Ataque vazio): o motor segue sem fim. No simulador, a partida para no teto e conta
   como "sem fim", nunca como empate. Teste na tarefa 4.
4. **Defesa Absoluta contra um oponente de Ataque vazio** por vários turnos: continua ativa, com os 4 Q. Nenhum Q sai sem
   ataque. Teste na tarefa 1.
5. **Faixa central no celular**: hoje a segunda linha tem "Sem dano" e a iniciativa. Sem o contador, a iniciativa não pode
   ficar órfã nem quebrar a faixa. Os testes da mesa e o `mobile.spec.ts` cobrem; conferir também a 390 × 844 no navegador.
   Tarefa 3.

---

### Tarefa 1: Defesa Absoluta até o ataque (motor)

**Arquivos:**
- Modificar: `packages/engine/src/flow.ts`, `packages/engine/src/actions/reaction.ts`, `packages/engine/src/actions/main.ts`,
  `packages/engine/src/apply-action.ts`
- Modificar: `packages/web/src/model/copy.ts:561` (o resumo das regras)
- Modificar: `docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md` (§1.5 item 4, §1.8 "Ao terminar")
- Testes: `packages/engine/test/turn-flow.test.ts` (o `describe('expiração de efeitos')`), `packages/web/test/model/rules-copy.test.ts`

**Interfaces:**
- Produz: `endTurn(s: GameState, ev: GameEvent[], attacked: boolean): void` em `flow.ts`.
  - Passa `true` o `closeReaction` depois do `resolveAttack`.
  - Passa `false` o `endTurnAction` e o `TIMEOUT` com o Ataque vazio.
  - O `expireEffects` encerra a Defesa Absoluta do outro jogador só com `attacked`. O Reflect não disparado continua expirando
    em todo fim de turno: a F2 muda isso depois.

- [x] **Passo 1: testes que falham.** Troque o teste `a Defesa Absoluta termina no fim do turno do oponente e consome 1 Q` por:
  - `a Defesa Absoluta continua depois de um turno do oponente sem ataque`. Use `setup({ p2: { defenseBuffs: ['Q','Q','Q','Q'],
    absoluteDefense: true } })` e `act(s, P1, { type: 'END_TURN' })`. Espere `absoluteDefense === true`, `defenseBuffs` com 4 e
    nenhum `AbsoluteDefenseEnded` nos eventos.
  - `continua por vários turnos sem ataque e não perde Q`: três rodadas de `END_TURN` dos dois (foco da revisão 4).
  - `acaba depois do ataque do oponente e consome 1 Q`: P1 com `attack: [5]`, depois `DECLARE_ATTACK` e o `PASS` de P2. Espere
    `AbsoluteDefenseEnded` de P2, `absoluteDefense === false`, 3 Q, e a vida de P2 intacta.
  - `um Ataque Absoluto também a encerra`: P1 com 4 J. É o exemplo 5 da spec 1: o dano é a conta normal e sobra com 3 Q.
  - `um ataque devolvido pelo Reflect também a encerra`: P2 com a Defesa Absoluta e um Reflect ativo.
- [x] **Passo 2:** `pnpm --filter @coringa/engine exec vitest run test/turn-flow.test.ts`. Os dois testes "continua" falham.
- [x] **Passo 3:** implemente a assinatura acima. Atualize o comentário do `endTurn` (spec §1.5 item 4).
- [x] **Passo 4:** a suíte do motor passa, menos as partidas de referência e o digest.
- [x] **Passo 4b: partidas de referência e versão.**
  - `RULES_VERSION = 3` em `packages/engine/src/version.ts`.
  - `pnpm --filter @coringa/sim record-golden`.
  - Leia o diff dos snapshots (`pnpm --filter @coringa/engine exec vitest run`). Toda mudança tem que vir de uma Defesa
    Absoluta que não acabou sem ataque.
  - Depois `vitest run -u` e o digest novo em `RULES_DIGESTS` (`packages/engine/test/rules-version.test.ts`).
- [x] **Passo 5: textos.**
  - **Resumo das regras (`copy.ts:561`):** "Defesa Absoluta (4 Q): até o oponente atacar, você é imune a dano, a Armadilha e a
    Sacrifício, e a fileira de Defesa não perde cartas. Só o Ataque Absoluto fura a imunidade a dano: quebra os seus K e causa
    o dano normal. Depois do primeiro ataque do oponente, ela acaba e 1 Q vai para o cemitério."
  - **Spec 1:** §1.5 item 4 tira a Defesa Absoluta da lista do que expira em todo fim de turno. §1.8 "Ao terminar" diz "depois
    do primeiro ataque do oponente", com a data de 2026-10-30 e a referência ao `decisoes.md`.
  - **Nota de risco da spec E1, corrigida:** com cartas no Ataque, o ataque é obrigatório (`endTurnAction` recusa
    `END_TURN`). A Defesa Absoluta só sobrevive contra quem está de Ataque vazio, como a tartaruga. O risco do teto fica nas
    partidas com a tartaruga, não no greedy nem no Difícil.
- [x] **Passo 6:** commit `feat(engine): a Defesa Absoluta dura até o oponente atacar`, com a versão 3. O corpo cita a regra
  e lista as partidas de referência que mudaram.

### Tarefa 2: o anti-travamento sai do motor, do servidor e do simulador

Um commit só com a tarefa 3: tirar o `DRAW` do tipo quebra o typecheck dos outros pacotes até a web acompanhar.

**Arquivos:**
- Motor:
  - `config.ts`: sai `antiStallRounds` e a validação dele.
  - `types.ts`:
    - saem `antiStallRounds`, `noDamageStreak` (estado e `PlayerView`) e `hpLostThisRound`;
    - o `GameResult` vira `{ kind: 'WIN'; winner: PlayerId; reason: 'HP' | 'EXODIA' | 'FORFEIT' }`.
  - `flow.ts`: `endAttackRound` só cuida da iniciativa.
  - `combat.ts`, `create-game.ts`, `view.ts`.
  - Testes: `config`, `create-game`, `turn-flow`, `combat`, `preview`, `no-play`, `biased`, `properties` e `helpers.ts` (sai a
    opção `noDamageStreak` do `setup`).
- Protocolo: `packages/protocol/src/messages.ts`: sai `Score.draws`.
- Servidor:
  - `core/game.ts`: sai o empate no placar.
  - `core/room-core.ts`: o placar inicial.
  - Testes: `game`, `primitives`, `timers`.
- Simulador:
  - `metrics.ts`: o `EndReason` vira `'HP' | 'EXODIA' | 'FORFEIT' | 'UNFINISHED'`; sai a métrica "Fim por anti-travamento".
  - `calibrate.ts:120`.
  - `play/text.ts`: saem a linha `ANTI_STALL` e o texto de empate.
  - `play/board.ts`: sai a linha "N de 3 sem dano".
  - `experiments/turtle.ts` e `experiments/outcome.ts`.
  - `bots/hard.ts:40`.
  - `cli/hard-gate.ts`: sai a coluna de empates.
  - `online/session.ts:175`: o placar sem empates.
  - Testes: `play`, `metrics` e `experiments`.
- Specs:
  - Spec 1:
    - §1.11: sai a terminação garantida.
    - §5: "toda partida termina" vira "toda partida que o simulador encerra pelo teto dele é contada e reportada".
    - "A vida nunca aumenta" fica até a E3.
    - §310: sai o contador.
  - Spec da web e do polimento: as menções ao contador e ao fim por anti-travamento.

**Interfaces:**
- Produz:
  - `GameResult` só com `WIN`;
  - `RulesConfig` sem `antiStallRounds`;
  - `PlayerView` sem `noDamageStreak`;
  - `Score = { p1: number; p2: number }`.

- [x] **Passo 1: testes que falham ou mudam.**
  - `turn-flow`:
    - saem `anti-travamento: 3 rodadas sem dano…`, `anti-travamento com vida igual…`, `uma rodada sem dano soma 1…` e
      `qualquer perda de vida zera…`;
    - entra `dez rodadas de Ataque sem dano não encerram a partida`: `END_TURN` dos dois, repetido, com o `TIMEOUT` do Equipar no
      meio, e a fase nunca é `GAME_OVER`;
    - entra `uma rodada sem dano não dá bônus de ataque` (fica a checagem do `PressureChanged`).
  - `config`:
    - `DEFAULT_CONFIG` sem `antiStallRounds`;
    - `validateConfig` aceita uma config com `antiStallRounds: 3` a mais e devolve `null` (foco da revisão 2).
  - `properties`: o teste "partidas aleatórias terminam" passa a jogar com um teto (400 rodadas). Ele confere conservação, vida
    e sigilo nas que acabam e nas que param no teto, e conta quantas pararam (sem exigir zero).
- [x] **Passo 2:** rode o motor e veja os testes novos falharem.
- [x] **Passo 3:** remova do motor; depois do protocolo e do servidor; depois do simulador. Siga os erros do
  `pnpm -r typecheck`.
- [x] **Passo 4:** as suítes do motor, do protocolo, do servidor e do simulador passam, menos as partidas de referência e o
  digest.
- [x] **Passo 5:** `STATE_SCHEMA = 3` em `packages/server/src/core/timers.ts`, porque o `GameState` mudou de forma. Ajuste o
  teste dos timers, se ele fixa o número.
- [x] **Passo 6:** regrave as partidas de referência e o digest (como no passo 4b da tarefa 1). Toda mudança tem que vir de uma
  partida que acabava por anti-travamento e agora segue até a vida, a Exódia ou o `maxSteps`.
- [x] **Passo 7:** sem commit: segue com a tarefa 3.

### Tarefa 3: o anti-travamento sai da web; as partidas antigas continuam lendo

**Arquivos:**
- Faixa central:
  - `ui/table/CenterBand.tsx`: sai o bloco "Sem dano N de M" e o aviso. No celular, a iniciativa fica sozinha na segunda linha
    ou sobe para a primeira, o que ficar melhor a 390 px.
  - `ui/table/labels.ts`: saem `streakLabel` e o aviso.
- Textos:
  - `model/copy.ts`: sai o item do resumo (linha 570); os textos de fim `ANTI_STALL` e `DRAW` ficam só para o legado; sai o
    empate do placar (linha 427).
  - `model/past-games.ts` e `model/past-games-copy.ts`: o legado.
- Tutorial: sai a dica 9.
  - `model/tutorial.ts` (`HintId` sem `'stall'`), `model/tutorial-copy.ts` (`stallHint`, e `hintParagraphs(id)` sem o 2º
    parâmetro).
  - `ui/table/HintPanel.tsx` (sai a prop `antiStallRounds`), `ui/screens/Tutorial.tsx`.
- Resto: `model/local-room.ts` (o placar), `model/sound.ts:68`, `test/fixtures.ts`.
- Testes: `table`, `hint-panel`, `tutorial`, `tutorial-copy`, `end-and-menu`, `rules-copy`, `past-games`, `past-games-copy`,
  `past-games-record`, `replay-screen`, `replay-track`, `effects`, `sound` e `fixtures`.

**Interfaces:**
- Consome: os tipos da tarefa 2.
- Produz:
  - `type LegacyResult = { kind: 'WIN'; winner: PlayerId; reason: 'ANTI_STALL' } | { kind: 'DRAW'; reason: 'ANTI_STALL' }`, em
    `past-games.ts`;
  - `PastGame.result: GameResult | LegacyResult | null`;
  - `Score` guardado aceita o `draws` antigo e o ignora.

- [x] **Passo 1: testes que falham.**
  - `past-games`: uma entrada de `RULES_VERSION` 2 com `{ kind: 'DRAW', reason: 'ANTI_STALL' }` e `score.draws: 1` continua
    válida. A lista mostra "Empate" e o motivo "Anti-travamento (regra antiga)…" (foco da revisão 1).
  - `table`: a faixa central não tem mais "Sem dano".
  - `tutorial`: a sequência de dicas não tem mais `stall`, e a dica `end` continua aparecendo.
- [x] **Passo 2:** veja-os falhar.
- [x] **Passo 3:** implemente.
  - O texto de fim do legado diz que a regra saiu: "Anti-travamento (regra antiga): …".
  - Se as dicas forem numeradas na tela, renumere (o "1 de N" sai do tamanho da lista).
- [x] **Passo 4:** `pnpm --filter @coringa/web exec vitest run` passa.
- [x] **Passo 5:** `pnpm lint` e `pnpm -r typecheck` limpos.
- [x] **Passo 6:** confira no navegador, a 1536 × 695 e a 390 × 844, que a faixa central não quebrou.
- [x] **Passo 7:** commit `feat: a partida não acaba mais por anti-travamento` (motor, servidor, simulador e web). O corpo lista
  as partidas de referência que mudaram e por quê.

### Tarefa 4: o teto do simulador e a duração nos relatórios

**Arquivos:**
- `packages/sim/src/match.ts`:
  - `export const SIM_MAX_ROUNDS = 400`;
  - `setup.maxRounds?: number` (padrão `SIM_MAX_ROUNDS`): o laço para quando `s.round > maxRounds`, com o resultado `null`;
  - o `maxSteps` fica como trava de segurança, alto o bastante para não cortar antes do teto (≥ 20 000).
- `packages/sim/src/metrics.ts`:
  - a duração em rodadas (mediana, p95, máx.);
  - a fração "sem fim (teto de 400 rodadas)";
  - a parte dessas paradas com uma Defesa Absoluta ativa no fim.
- O registro da partida ganha `absoluteDefenseAtCap: boolean`.
- `packages/sim/src/calibrate.ts`: as colunas novas no relatório.
- Testes: `packages/sim/test/match.test.ts` e `metrics.test.ts`.

**Interfaces:**
- Produz: `RunRecord.absoluteDefenseAtCap: boolean` e `Metrics.duration: { median: number; p95: number; max: number }`. Também
  `Metrics.capped` e `Metrics.cappedWithAbsoluteDefense`, frações de 0 a 1.

- [x] **Passo 1: testes que falham.**
  - `turtle × turtle para no teto`: `runGame` com dois `turtle` e `maxRounds: 40` termina com `result === null` e `round === 41`
    (foco da revisão 3).
  - `as métricas contam as paradas no teto e a duração`: três registros fabricados (rodadas 10, 20 e o teto), com mediana 20 e a
    fração 1/3.
- [x] **Passo 2:** veja-os falhar.
- [x] **Passo 3:** implemente.
- [x] **Passo 4:** a suíte do simulador passa.
- [x] **Passo 5:** commit `feat(sim): teto de 400 rodadas e a duração das partidas nos relatórios`.

### Tarefa 5: fixture do E2E e semente do tutorial

**Arquivos:**
- `packages/web/e2e/fixtures/especiais.json` e `packages/web/e2e/layout.spec.ts`: só se o replay mudar.
- `packages/sim/src/tutorial-seed.ts`: só se o critério falhar.
- As partidas de referência: regrave só se alguma das que antes acabavam por anti-travamento agora parar no teto da tarefa 4.

- [x] **Passo 1: fixture do E2E.**
  - Rode o replay `layout-107` no motor novo. Se ele quebrar ou o passo 75 não juntar mais a Guarda, os 4 J, os 3 Q, o Reflect e
    uma Ressurreição do Bot, procure outra semente `layout-N` (greedy × greedy, config padrão) que junte tudo.
  - Regrave a entrada e ajuste `STEP` e a rodada do `layout.spec.ts`.
- [x] **Passo 2: semente do tutorial.** O teste do `tutorial-seed` passa com `tutorial-2431`. Se falhar, rode a busca e registre
  a semente nova na spec.
- [x] **Passo 3:** commite o `estado.md`, depois rode o `pnpm check`. Ele tem que passar.
- [x] **Passo 4:** se algo mudou, commit `test: fixture do E2E e semente do tutorial nas regras novas`.

### Tarefa 6: Absolutos em 3 s (web)

**Arquivos:**
- `packages/web/src/model/timeline.ts`:
  - `RARE_SCENE_MS.ABSOLUTE_ATTACK` e `ABSOLUTE_DEFENSE` = `3_000`;
  - `SCENE_INVERT_LEAD_MS.ABSOLUTE_*` = `900`, para o título e a inversão virem depois da última carta.
- `packages/web/src/ui/anim/Scene.tsx`: o `stagger` dos absolutos = `0.18`. A última carta entra a 0,54 s e assenta perto de
  1 s; o título e a inversão vêm a 0,9 s; a cena segura até 3 s.
- Specs: `docs/superpowers/specs/2026-10-17-interface-web-design.md:436` e a U3 da spec do sub-projeto 5.
- Testes: os da linha do tempo e da cena que fixam 2 600 ou 700.

- [x] **Passo 1:** troque as expectativas para 3 000 e 900. Os testes de fotossensibilidade ficam como estão. Veja-os falhar.
- [x] **Passo 2:** implemente.
- [x] **Passo 3:** as suítes passam. A Exódia segue em 4 200.
- [x] **Passo 4:** confira no navegador com um replay que tenha um Ataque Absoluto. A cena não pode ter tempo morto.
- [x] **Passo 5:** commit `feat(web): Ataque e Defesa Absoluta em 3 s`.

### Tarefa 7: medir, revisar e mesclar

- [ ] **Passo 1:** `estado.md` commitado. Depois `pnpm sim:calibrate`. Leia:
  - a duração (mediana, p95, máx.);
  - a fração no teto e a parte dela com Defesa Absoluta.

  Se partidas greedy × greedy ou com o Difícil baterem no teto, é defeito de bot e não de regra: investigue antes de seguir
  (a spec E1, "risco a conferir").
- [ ] **Passo 2:** `estado.md` commitado. Depois
  `pnpm sim:dificil --recomecar --ajuste "E1: sem anti-travamento, Defesa Absoluta até o ataque"`. O portão tem que passar como
  antes. Se cair, investigue o bot (não a regra) e meça de novo com `--ajuste`.
- [ ] **Passo 3:** commite os relatórios (`packages/sim/reports/`) com um resumo da leitura.
- [ ] **Passo 4:** `estado.md` commitado. Depois `pnpm e2e` (todos verdes; o `layout.spec.ts` com a fixture nova).
- [ ] **Passo 5:** revisão do branch inteiro por um revisor novo, contra a spec E1 e o foco da revisão.
- [ ] **Passo 6:** fechamento:
  - suba a branch e espere a CI verde (check + e2e);
  - fast-forward na `main`;
  - entrada no `diario.md` e o `estado.md` com o próximo passo (E2), escritos antes do último push.
