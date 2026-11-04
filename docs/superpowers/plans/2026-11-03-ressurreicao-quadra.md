# Bloco E: a Ressurreição no instante da quadra (ponto 16) — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans,
> tarefa por tarefa. Os passos usam caixas (`- [ ]`) para o acompanhamento.
>
> **Estado:** **aprovado** pelo autor em 2026-11-03, com 15 s na janela (`decisoes.md` 2026-11-03 (6)).

**Objetivo:** pôr no jogo a regra do ponto 16, escrita pelo autor: a Ressurreição usada já na revelação do Equipar, antes do ataque,
e a troca da última carta quando as duas fileiras estão cheias, com a carta da quadra protegida, também na fase principal.

**Arquitetura:** uma fase nova no motor, `RESURRECTION`, aberta pelo `resolveEquip` entre a revelação e a rodada seguinte, só para
quem formou quadra ali e tem jogada. A troca não pede campo novo na ação: o motor deriva de `row` se a carta entra no fim ou troca a
última, por uma função só (`resurrectionRows`), que a web e os bots também usam. Tudo fica atrás de um campo opcional da config,
`resurrectOnQuad`, ligado no `DEFAULT_CONFIG`: sem ele, a regra de antes. Ele existe pelos replays guardados: as quatro fixtures do
E2E têm quadra na revelação (nos passos 24, 49, 25 e 142) e divergiriam no passo seguinte, como as partidas no navegador do autor.

**Stack:** TypeScript no Node 24+ puro (motor, protocolo, simulador, servidor), Vitest, Playwright; a web em Vite + React.

**Spec:** `docs/superpowers/specs/2026-11-03-playtest-design.md` §7 e a spec das regras
(`2026-10-15-jogo-coringa-regras-motor-design.md`, §1.4 passo 7, §1.8 "Ressurreição no instante da quadra", §1.12, §2.3 a §2.7).
Origem: `docs/memoria/decisoes.md` 2026-11-03 (4).

## Restrições globais

- `pnpm check` antes de cada commit (os hooks rodam). **Nunca** `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- Imports relativos com `.ts`, só sintaxe apagável, `import type` para tipos. Textos, comentários e commits em pt-BR; identificadores
  em inglês.
- **Versões, uma vez cada, nesta branch:** `RULES_VERSION` 4 → 5 (Tarefa 3, com as partidas de referência regravadas e o digest em
  `RULES_DIGESTS`); `STATE_SCHEMA` 4 → 5 (Tarefa 4).
- **Sem regra na interface:** a web lê `legalActions` e `resurrectionRows`; nada de `@coringa/protocol/schemas` nem `node:*` em
  `packages/web/src`. Em `packages/web/test/ui`, todo teste é `.test.tsx`.
- **A outra sessão (bloco A) mexe em `timeline.ts`, `Hand.tsx`, `TableCard.tsx`, `PlayerField.tsx`, `copy.ts`, `ui/anim/*` e
  `protocol/src/scenes.ts`.** Este plano não toca em nenhum deles, salvo `copy.ts` em dois lugares (o `CLOCK_START_TEXT`, por causa do
  `DeadlineKind` novo, e a linha da Ressurreição no resumo das regras). Os textos novos vão para um arquivo próprio,
  `model/resurrection-copy.ts`. Antes de mesclar na `main`, mesclar a `main` aqui.
- Antes de cada job longo (`pnpm e2e`, `sim:calibrate`, `sim:dificil`), commitar o `docs/memoria/estado.md` (seção
  `## Bloco E (sessão paralela)`) com o próximo passo. O `sim:dificil` mede tempo: roda sozinho, sem E2E nem medição da outra sessão
  na mesma CPU.
- Branch `claude/ressurreicao-quadra-f59247`, a partir de `d35a241` (`feat/playtest-spec`).

## Escolhas minhas (à vista do autor; nenhuma muda o que ele escreveu)

1. **A chave `resurrectOnQuad`** na config, pelos replays (acima). É o padrão do `defenseHealGuard` e do `specialLimit` (E3).
2. **A janela só abre com jogada.** Formou quadra mas não pode ressuscitar (cemitério sem numérica, ou as duas últimas cartas da
   quadra)? Não há janela. Diferente da janela de reação, tudo aqui é público: pular não revela nada.
3. **O jogador fica na janela até passar ou até não ter mais Ressurreição que possa usar.** É o que faz a cadeia sem regra a mais.
4. **O tempo esgotado na janela passa só quem decide agora** e guarda a Ressurreição; o segundo da fila ainda decide. Não conta como
   turno estourado (como a escolha da ordem).
5. **Depois do 1º Equipar** (seguido de outro Equipar, sem ataque), a janela abre do mesmo jeito.
6. **A troca sai como no Roubo:** `CardsRemovedFromRow` (a carta que vai ao cemitério), o `Healed` dela se curar, e então
   `Resurrected`. Sem evento novo nem campo novo no `Resurrected`: a linha do tempo, a saída da carta na mesa, o som e o texto do
   histórico já tratam o `CardsRemovedFromRow`, e assim o `timeline.ts` da outra sessão fica intocado. A janela também não tem evento:
   é a fase.
7. **Sob Defesa Absoluta, a troca na própria Defesa vale,** como a troca do Equipar e o Roubo, que já fazem isso.
8. **As especiais da mão não jogam na janela** (é a rodada de Equipar): o motivo é o `EQUIP_ROUND` de hoje, com o texto de hoje.
9. **Os bots:** o greedy ressuscita (na janela e na fase principal) quando a melhor opção não piora a mesa (a avaliação de mesa e,
   no empate, a soma das fileiras); senão, guarda. O Difícil mede no portão se a busca na janela vale o tempo.

## Pergunta ao autor (respondida: 15 s)

1. **O prazo online da janela**, por jogador: **15 s** (recomendo: abrir o cemitério, escolher a carta e a fileira, com a prévia da
   troca para ler; no celular, 10 s é apertado) ou 10 s, como a escolha da ordem. O tempo esgotado guarda a Ressurreição. No treino
   não há relógio.

## Foco da revisão

1. **As duas fileiras bloqueadas pela proteção:** o jogador tem a Ressurreição (o chip diz "1 Ressurreição disponível") e nada
   acontece. Esperado: na fase principal o botão Ressuscitar continua e o diálogo diz por quê; na janela, ela não abre (escolha 2).
   Teste na Tarefa 6.
2. **O segundo da fila depois de uma troca do primeiro:** a carta que saiu entrou no cemitério e pode dar jogada a quem não tinha;
   a que o primeiro levou pode tirá-la. Esperado: a jogada do segundo é conferida quando a vez dele chega. Teste na Tarefa 2.
3. **A troca que formaria a quadra com a própria carta que sai** (a ressuscitada não pode ser a que sai na mesma jogada): esperado,
   a ressuscitada sai do cemitério antes da troca. Teste na Tarefa 1.
4. **O replay antigo:** uma fixture do E2E (`exodia-devastacao.json`) e uma partida gravada sem `resurrectOnQuad` reproduzem igual,
   sem janela. Teste na Tarefa 2.
5. **O prazo online depois da cena:** a ressuscitada na janela toca a cena (4,6 s); o relógio da janela (mesmo jogador seguindo na
   cadeia) ou o da escolha da ordem (a janela fechou) conta a folga. Teste na Tarefa 4.

---

### Tarefa 1: a troca e a proteção (motor)

**Arquivos:** `packages/engine/src/types.ts` (config, erro), `config.ts` (padrão e validação), `quads.ts` (`resurrectionRows`,
`hasResurrectPlay`), `actions/main.ts` (`resurrect`), `legal-actions.ts` (a lista da fase principal), `index.ts` (exportar).
Testes: `packages/engine/test/resurrect.test.ts`, `config.test.ts`, `legal-actions.test.ts`.

**Interfaces (produz):**
- `RulesConfig.resurrectOnQuad?: boolean`; `DEFAULT_CONFIG.resurrectOnQuad = true`; `validateConfig` recusa o que não for `boolean`
  nem ausente (`'resurrectOnQuad deve ser verdadeiro ou falso'`).
- `RuleErrorCode` ganha `'QUAD_PROTECTED'`.
- `type ResurrectionRow = { kind: 'APPEND' } | { kind: 'REPLACE'; leaving: NumCard } | { kind: 'BLOCKED'; reason: 'FULL' | 'QUAD'; last: NumCard }`.
- `resurrectionRows(config: Pick<RulesConfig, 'rowLimit' | 'resurrectOnQuad'>, rows: { attackRow: readonly NumCard[]; defenseRow: readonly NumCard[] }): Record<RowName, ResurrectionRow>`:
  com vaga, `APPEND`; cheia com vaga na outra, ou as duas cheias sem a chave, `BLOCKED FULL`; as duas cheias com a chave, `BLOCKED QUAD`
  se `last.value` está em `quadValues` daquela fileira, senão `REPLACE` com a última. Exportada pelo `index.ts`.
- `hasResurrectPlay(s: GameState, p: PlayerState): boolean`: Ressurreição válida, numérica no cemitério e uma fileira não `BLOCKED`.

- [ ] **Passo 1: testes que falham** (`describe('a troca e a proteção (ponto 16)')` em `resurrect.test.ts`; fileiras de 8, `setup`):
  - as duas cheias, `RESURRECT` na Defesa: a última da Defesa vai ao cemitério, a ressuscitada fica no fim, a fileira segue com 8, e os
    eventos são, nesta ordem, `CardsRemovedFromRow { row: 'DEF', cards: [a última] }` e `Resurrected`;
  - com 2 K na Guarda e 1 Q, a que sai da Defesa cura `valor × 2` (`Healed`, `source: 'DEFENSE'`, entre os dois eventos); a que sai do
    Ataque não cura;
  - a última do Ataque é um 7 e há quatro 7 no Ataque: `RESURRECT` no Ataque recusa com `QUAD_PROTECTED`; na Defesa, troca;
  - com 5 iguais, a última é da quadra mesmo sendo a 5ª; uma quadra de 3 em outra posição da fileira não protege uma última de outro
    valor;
  - as duas últimas da quadra: as duas fileiras recusam, a Ressurreição continua com o jogador e `legalActions` não lista `RESURRECT`;
  - a ressuscitada não é a que sai: o cemitério tem só um 5, a última da Defesa é um 5; depois da jogada, a Defesa termina com o 5 que
    estava no cemitério e o cemitério tem o 5 que saiu (ids diferentes);
  - uma cheia e a outra com vaga: a cheia recusa com `ROW_FULL`, como hoje;
  - sem `resurrectOnQuad` (`config: { resurrectOnQuad: undefined }`): as duas cheias recusam com `ROW_FULL`, como antes;
  - sob Defesa Absoluta, a troca na própria Defesa vale;
  - `resurrectionRows` direto: os quatro casos, com a `last` certa;
  - `legalActions` na fase principal: um `RESURRECT` por valor do cemitério e por fileira não bloqueada (as duas cheias: as duas
    fileiras; uma protegida: só a outra).
- [ ] **Passo 2:** `pnpm --filter @coringa/engine exec vitest run test/resurrect.test.ts test/legal-actions.test.ts test/config.test.ts`.
  Esperado: os novos falham (`ROW_FULL` onde se espera a troca; `resurrectionRows` não existe).
- [ ] **Passo 3:** implementar. Em `resurrect`, a ordem: conferir a Ressurreição, a fileira (`resurrectionRows`: `BLOCKED FULL` →
  `ROW_FULL`, `BLOCKED QUAD` → `QUAD_PROTECTED`) e a carta; tirar a carta do cemitério; com `REPLACE`, tirar a última, mandá-la ao
  cemitério, emitir `CardsRemovedFromRow` e, na Defesa, `healFromDefense`; então consumir a Ressurreição, pôr a carta no fim,
  `Resurrected` e `reevaluateQuads`. O `mainOptions` usa `resurrectionRows` no lugar do `length < rowLimit`. Os testes antigos de
  "fileira com espaço" que dependiam da recusa com as duas cheias passam a usar `resurrectOnQuad: undefined`.
- [ ] **Passo 4:** os testes da Tarefa passam; `pnpm --filter @coringa/engine exec vitest run` verde (as partidas de referência não
  mudam: as fixtures guardam a config sem a chave).
- [ ] **Passo 5:** `pnpm check`; commit `feat(engine): a troca da última carta na Ressurreição, com a quadra protegida (ponto 16)`.

### Tarefa 2: a janela da Ressurreição (motor)

**Arquivos:** `types.ts` (fase), `flow.ts` ou um novo `actions/resurrection.ts` (abrir, seguir), `actions/equip.ts`
(`resolveEquip`), `apply-action.ts` (`RESURRECT`, `PASS`, `TIMEOUT` na fase nova), `acting.ts`, `legal-actions.ts`, `no-play.ts`.
A web e o simulador onde os `switch` exaustivos deixam de compilar (só o mínimo: a fase nova com o texto da Tarefa 5 e um painel vazio;
a interface de verdade é a Tarefa 6). Testes: `packages/engine/test/resurrection-window.test.ts` (novo), `invariants.ts`,
`properties.test.ts`, `no-play.test.ts`, `golden.test.ts` (a fixture antiga).

**Interfaces:**
- Consome: `resurrectionRows`, `hasResurrectPlay` (Tarefa 1).
- Produz: `Phase` ganha `{ kind: 'RESURRECTION'; player: PlayerId; next: PlayerId | null }`. `legalActions` na fase, para `player`:
  `[{ type: 'PASS' }, ...]` e os `RESURRECT` canônicos da Tarefa 1 (o mesmo gerador da fase principal); para o outro, `[]`.
  `actingPlayers`: `[phase.player]`. `noPlayReason`: `EQUIP_ROUND`.
- `openResurrectionWindow(s: GameState, formed: PlayerId[], ev: GameEvent[]): void` (com `formed` na ordem da iniciativa) e
  `advanceResurrection(s: GameState, ev: GameEvent[]): void` (o próximo da fila que ainda tem jogada, ou `startRound`).

- [ ] **Passo 1: testes que falham** (`resurrection-window.test.ts`, montando a revelação com `setup({ phase: { kind: 'EQUIP' }, … })`
  e as duas confirmações):
  - a revelação forma a quadra de P1, com numérica no cemitério: a fase é `RESURRECTION { player: P1, next: null }`, a rodada é a do
    Equipar e `RoundStarted` ainda não saiu; `PASS` segue para a rodada seguinte (`ORDER_CHOICE` na rodada de Ataque) e P1 continua
    com a Ressurreição válida;
  - `RESURRECT` na janela põe a carta e a rodada segue; com o cemitério sem numérica, a revelação vai direto à rodada seguinte, sem
    janela;
  - os dois formam quadra: decide primeiro quem tem a iniciativa (P2, com `initiative: P2`), `next: P1`; depois do `PASS` de P2, a fase é
    a de P1; se a jogada de P2 tirou a única numérica do cemitério, P1 não ganha a vez e a rodada segue;
  - o contrário: P1 não tinha numérica para trazer, a troca de P2 manda uma ao cemitério e P1 ganha a vez;
  - cadeia: a ressuscitada forma outra quadra, e P1 continua na janela com uma Ressurreição a mais; sem mais jogada, a janela fecha
    sozinha;
  - `TIMEOUT` (`system`) na janela é o `PASS` de quem decide; o segundo da fila ainda decide;
  - a janela depois do 1º Equipar (rodada 1) leva ao 2º Equipar;
  - `PLAY_J` na janela recusa com `WRONG_PHASE`; o oponente que manda `PASS` recusa com `NOT_YOUR_TURN`; `noPlayReason` dá
    `EQUIP_ROUND`;
  - sem `resurrectOnQuad`, a mesma revelação vai direto à rodada seguinte;
  - a fixture `packages/web/e2e/fixtures/exodia-devastacao.json` reproduz até o fim sem erro (a config dela não tem a chave);
  - `checkInvariants` ganha: na fase `RESURRECTION`, quem decide tem jogada (`hasResurrectPlay`); nenhum `RESURRECT` diminui o número
    de quadras de quem joga; as fileiras nunca passam de `rowLimit`. O `properties.test.ts` roda com a config padrão (a janela aparece
    nas partidas aleatórias).
- [ ] **Passo 2:** rodar os testes do motor. Esperado: os novos falham (a fase não existe).
- [ ] **Passo 3:** implementar. No `resolveEquip`, com a chave: depois do `reevaluateQuads` dos dois, `formed` são os que têm
  `QuadFormed` nos eventos desta revelação, quem tem a iniciativa primeiro; `openResurrectionWindow` no lugar do `startRound`. Depois
  de um `RESURRECT` na janela: se quem decide ainda tem jogada, fica; senão `advanceResurrection`. No `apply-action`: `RESURRECT` e
  `PASS` olham a fase (`RESURRECTION` ou a de hoje); o `TIMEOUT` da fase nova é `advanceResurrection`. Na web e no simulador, o mínimo
  para compilar.
- [ ] **Passo 4:** `pnpm --filter @coringa/engine exec vitest run` verde; `pnpm check` verde (as partidas de referência seguem iguais).
- [ ] **Passo 5:** commit `feat(engine): a janela da Ressurreição depois da revelação do Equipar (ponto 16)`.

### Tarefa 3: os bots, o terminal e as partidas de referência

**Arquivos:** `packages/sim/src/bots/eval.ts`, `greedy.ts`, `turtle.ts`, `hard.ts` (só a fase na lista do horizonte, se a medição da
Tarefa 8 pedir), `play/board.ts` (`phaseText`), `play/text.ts` (o texto do `PASS` na janela), `packages/engine/src/version.ts`,
`packages/engine/test/rules-version.test.ts`, `packages/engine/test/fixtures/golden-replays.json` e os resumos. Testes:
`packages/sim/test/greedy.test.ts` (também o turtle), `hard.test.ts`, `play.test.ts` (o terminal).

**Interfaces (produz):**
- `resurrectPlace<T extends PublicPlayer>(p: T, card: NumCard, row: RowName, config: RulesConfig): T` (em `eval.ts`): o campo depois da
  Ressurreição, pela `resurrectionRows` (no fim ou no lugar da última).
- `resurrectionGain(view: PlayerView, action: Extract<Action, { type: 'RESURRECT' }>): [board: number, sum: number]`: a mudança na
  avaliação de mesa e na soma das duas fileiras.

- [ ] **Passo 1: testes que falham** (`greedy.test.ts`):
  - na janela, com uma opção que melhora a mesa, o greedy ressuscita a melhor; com só trocas que pioram (sai um 10, só há 2 no
    cemitério, sem mudar a avaliação de mesa), `PASS`;
  - na fase principal, a troca que piora não é feita e o greedy segue para o resto (ataca); a Ressurreição no fim, com vaga, continua
    "sempre" (o comportamento de hoje);
  - a avaliação usa a fileira de 8 com a troca, não uma de 9 (o `placeAll` com `[row]` de hoje);
  - o turtle na janela não ressuscita no Ataque;
  - `hard.test.ts`: um rollout que passa pela janela termina sem ação ilegal; com uma só ação legal, a busca não roda.
- [ ] **Passo 2:** `pnpm --filter @coringa/sim exec vitest run`. Esperado: os novos falham.
- [ ] **Passo 3:** implementar. O greedy escolhe pela `resurrectionGain` em ordem lexicográfica (mesa, depois soma; empate, sorteio,
  como hoje) e usa a escolhida se `board > 0`, ou `board === 0 && sum >= 0`. O `phaseText` do terminal: `Janela da Ressurreição:
  ${quem} decide`; o `PASS` da janela no terminal: `Guardar a Ressurreição`.
- [ ] **Passo 4:** `RULES_VERSION` 5; `pnpm --filter @coringa/sim record-golden`; revisar o diff dos resumos (só partidas com quadra na
  revelação ou com as duas fileiras cheias mudam; conferir uma janela e uma troca no resumo); `pnpm --filter @coringa/engine exec
  vitest run -u`; registrar o digest que o `rules-version.test.ts` imprime. `pnpm check` verde.
- [ ] **Passo 5:** commit `feat(sim): os bots na janela e na troca da Ressurreição; partidas de referência regravadas (RULES_VERSION 5)`,
  dizendo no corpo qual regra mudou.
- [ ] **Passo 6:** atualizar e commitar o `estado.md`; rodar `pnpm e2e` uma vez (o treino `e2e2631` contra o Médio pode tomar outro
  caminho com o greedy novo). Falha que venha da janela fica para a Tarefa 7; falha de outra causa se conserta aqui.

### Tarefa 4: o servidor e o protocolo

**Arquivos:** `packages/protocol/src/messages.ts` (`DeadlineKind`), `packages/server/src/core/timers.ts` (`resurrectionMs`,
`STATE_SCHEMA`), `epoch.ts` (`phaseKey`), `timing.ts` (`schedulePhase`), `views.ts` (`DEADLINE_KINDS`), `game.ts` (`applyTimeout`:
sem estouro na janela). Testes: `packages/server/test/core/timers.test.ts`, `primitives.test.ts`, `properties.test.ts`.

**Interfaces (produz):**
- `DeadlineKind = 'EQUIP' | 'ORDER' | 'TURN' | 'REACTION' | 'RESURRECTION'`.
- `TIMERS.resurrectionMs = 15_000` (autor, 2026-11-03 (6)).
- `phaseKey` da janela: `[round, 'RESURRECTION', player, null]` (a vez do segundo da fila é época nova).
- `STATE_SCHEMA = 5`, com a linha do comentário: "5: a fase `RESURRECTION` e a troca da Ressurreição (ponto 16)".

- [ ] **Passo 1: testes que falham:** a revelação que abre a janela dá o prazo `RESURRECTION` de `TIMERS.resurrectionMs`; o `TIMEOUT`
  passa só quem decide, e a vez do segundo tem prazo cheio e época nova; o tempo esgotado na janela não soma estouro; `RESURRECT` que
  continua a cadeia mantém a época e estende o prazo pela cena (`sceneAllowanceMs`, 4,6 s); a que fecha a janela dá à escolha da ordem
  10 s mais a folga; um estado gravado com `STATE_SCHEMA` 4 é encerrado no carregamento (o teste de hoje, com o número novo).
- [ ] **Passo 2:** `pnpm --filter @coringa/server exec vitest run` (e o projeto workerd, `vitest.worker.config.ts`). Esperado: falham.
- [ ] **Passo 3:** implementar; o `DEADLINE_KINDS` e a web onde o `Record<DeadlineKind, …>` deixa de compilar (o texto entra na
  Tarefa 5).
- [ ] **Passo 4:** os testes do servidor passam; `pnpm check` verde.
- [ ] **Passo 5:** commit `feat(server): o prazo da janela da Ressurreição; STATE_SCHEMA 5`.

### Tarefa 5: a web, o modelo

**Arquivos:** novo `packages/web/src/model/resurrection-copy.ts`; `model/plays.ts` (as opções da Ressurreição), `model/marks.ts`
(`ownSpentIds`), `model/clock.ts` (`CUE_KIND`), `model/local-room.ts` (`phaseKey`), `ui/table/labels.ts` (`turnText`,
`initiativeText`, `PHASE_SHORT`), `model/copy.ts` (só o `CLOCK_START_TEXT` e a linha do resumo). Testes:
`packages/web/test/model/plays.test.ts`, `marks.test.ts`, `rules-copy.test.ts`, `clock.test.ts`,
`local-room.test.ts`, `packages/web/test/ui/table.test.tsx` (os textos da faixa).

**Interfaces (produz):**
- `TablePlays['resurrect']`: `{ cardId: string; value: Rank; rows: { row: RowName; leaving: NumCard | null; total: { before: number; after: number } }[] }[]`
  (o total é o da fileira na mesa, pelo `attackPower`/`defensePower` do motor sobre o campo de depois).
- `TablePlays['resurrectBlocked']: { row: RowName; last: NumCard }[]`: as fileiras com `BLOCKED QUAD` (só elas: a cheia com vaga na
  outra continua sem aparecer, como hoje).
- `ownSpentIds`: o `CardsRemovedFromRow` seu seguido do seu `Resurrected` (com no máximo um `Healed` entre os dois) é seu.
- Os textos (em `resurrection-copy.ts`, com estas palavras):
  - `RESURRECTION_WINDOW_TITLE = 'Ressurreição agora'`;
  - `RESURRECTION_WINDOW_TEXT = 'Você formou quadra na revelação: pode ressuscitar agora, antes do ataque, ou guardar a Ressurreição para depois.'`;
  - `resurrectionWaitingText = (name: string) => `${name} formou quadra e decide se ressuscita agora``;
  - `KEEP_RESURRECTION_LABEL = 'Guardar'`;
  - `resurrectReplaceDetail = (card: Card) => `no lugar de ${cardText(card)}, que vai ao cemitério``;
  - `resurrectTotalText = (before: number, after: number) => `total ${before} → ${after}``;
  - `resurrectProtectedText = (row: RowName, card: Card) => `${ROW_NAME[row]}: a última, ${cardText(card)}, é da quadra e não sai``;
  - `RESURRECT_ALL_PROTECTED_TEXT = 'As duas fileiras estão cheias e a última de cada uma é da quadra: a Ressurreição fica guardada.'`.
- `turnText` na janela: `Equipar · sua Ressurreição` / `Equipar · ${opponent} decide a Ressurreição`; `PHASE_SHORT.RESURRECTION = 'Quadra'`;
  `initiativeText` na janela: só quem tem a iniciativa (como no Equipar). `CLOCK_START_TEXT.RESURRECTION = 'Sua Ressurreição'` (o
  anúncio do leitor de tela fica "Sua Ressurreição: 15 segundos").
- A linha do resumo das regras (`copy.ts`, a da Ressurreição), com estas palavras: "Ressurreição: traz 1 numérica do cemitério para o
  fim de uma fileira. Vale no seu turno e, quando a quadra se forma no Equipar, logo depois da revelação, antes do ataque. Com as duas
  fileiras cheias, ela entra no lugar da última, que vai ao cemitério; a última que é da quadra não sai. Vale uma vez por quadra e
  fica disponível enquanto a quadra existir, com garantia de 3 rodadas depois de formada."

- [ ] **Passo 1: testes que falham:** `tablePlays` com as duas fileiras cheias dá `leaving` e os totais; com a última do Ataque da
  quadra, `resurrect` só traz a Defesa e `resurrectBlocked` traz o Ataque com a carta; `ownSpentIds` marca a carta que a sua troca
  tirou e não marca a que o golpe do oponente tirou; o `turnCue` anuncia a janela; a `phaseKey` da `LocalRoom` muda entre os dois da
  fila; a faixa central diz os textos da janela.
- [ ] **Passo 2:** `pnpm --filter @coringa/web exec vitest run test/model`. Esperado: falham.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** os testes passam; `pnpm check` verde.
- [ ] **Passo 5:** commit `feat(web): o modelo da janela e da troca da Ressurreição`.

### Tarefa 6: a web, a janela na mesa e o diálogo

**Arquivos:** novo `packages/web/src/ui/table/ResurrectionPanel.tsx`; `ui/table/PlayTable.tsx` (o painel na fase `RESURRECTION`, como
o `OrderPanel`), `ui/table/GraveyardDialog.tsx` (a troca, o total e a fileira protegida), `ui/table/ActionBar.tsx` (o botão
Ressuscitar também com as duas fileiras protegidas), `model/tutorial.ts` e `model/tutorial-copy.ts` (a dica). Testes:
`packages/web/test/ui/resurrection-window.test.tsx` (novo), `phases.test.tsx`, `tutorial.test.tsx`.

**Interfaces:**
- Consome: as opções e os textos da Tarefa 5.
- `ResurrectionPanel` (props): `view`, `names`, `deciding: boolean`, `disabled: boolean`, `onResurrect: () => void` (abre o
  `GraveyardDialog` em `resurrect`), `onKeep: () => void` (manda `PASS`), `panelRef`. Quem não decide vê o `resurrectionWaitingText`, sem
  botões.
- O passo da fileira no `GraveyardDialog`: cada fileira válida é um botão com duas linhas (a de cima, o nome; a de baixo, "no fim da
  fileira · 3 de 8" ou `resurrectReplaceDetail`, e o `resurrectTotalText`); a fileira protegida aparece como item sem botão, com a
  mini carta da última e o `resurrectProtectedText`. Sem opção e com `resurrectBlocked` nas duas, o texto é o
  `RESURRECT_ALL_PROTECTED_TEXT`.
- A dica do tutorial: `{ id: 'resurrectionWindow', zone: 'actionBar', holds: ({ view, legal }) => view.phase.kind === 'RESURRECTION' && canDo(legal, 'RESURRECT') }`,
  com o texto em `tutorial-copy.ts`: "Você formou uma quadra: a Ressurreição já vale agora, antes do ataque. Com as fileiras cheias, a
  carta entra no lugar da última, menos a que é da quadra."

- [ ] **Passo 1: testes que falham** (`resurrection-window.test.tsx`, com um `state` montado na fase da janela): o painel aparece com o
  título e os dois botões, e o foco vai para ele quando a vez chega; "Guardar" manda `PASS`; "Ressuscitar" abre o cemitério; escolher a
  carta e a fileira manda `RESURRECT` com a fileira; o passo da fileira mostra a troca e o total; a fileira protegida não tem botão e
  diz a carta; o oponente vê o texto de espera e nenhum botão; o axe não acha nada; na fase principal com as duas fileiras
  protegidas, o botão Ressuscitar abre o diálogo com o `RESURRECT_ALL_PROTECTED_TEXT`; a dica do tutorial aparece na janela.
- [ ] **Passo 2:** `pnpm --filter @coringa/web exec vitest run test/ui/resurrection-window.test.tsx`. Esperado: falham.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** os testes passam; `pnpm check` verde (o orçamento de 200 KB do JavaScript inicial incluso).
- [ ] **Passo 5:** commit `feat(web): a janela da Ressurreição na mesa e a troca no cemitério`.

### Tarefa 7: E2E e fotos

**Arquivos:** `packages/web/e2e/helpers.ts` (`playOnce`: "Guardar" antes de "Passar"), novo `packages/web/e2e/resurrection.spec.ts`,
novo `packages/web/test/model/resurrection-seed.test.ts` (confere a semente do E2E).

- [ ] **Passo 1:** achar a semente: o `resurrection-seed.test.ts` dirige a `LocalRoom` (como o `local-room.test.ts`, com o relógio
  falso e o nível Médio) com a política do `playOnce` (o primeiro destino de cada carta, a primeira ordem, passar, atacar) e confere
  que a semente `RESURRECTION_E2E_SEED` abre a janela para o jogador até a rodada 30, com as duas fileiras cheias. A procura é o mesmo
  laço com as sementes `e2e-quadra-<n>`, rodado à mão uma vez; a semente achada vira a constante. Se não houver uma em 2.000, o E2E
  fica com o que dá (a janela sem a troca) e a troca fica no teste de unidade, dito no diário.
- [ ] **Passo 2:** o `resurrection.spec.ts`: o treino na semente, `playUntil` até o painel; o axe; sem rolagem de lado e o painel e o
  botão principal à vista (`expectWhollyInView`) em 360 × 640 e 1366 × 657, com as fotos anexadas; "Ressuscitar", a carta, a fileira com
  a troca; a cena toca e a escolha da ordem vem depois. Um segundo teste: "Guardar" leva à escolha da ordem e o chip segue com a
  Ressurreição.
- [ ] **Passo 3:** atualizar e commitar o `estado.md`; `pnpm e2e` inteiro verde. Olhar as fotos (o jsdom não tem layout).
- [ ] **Passo 4:** commit `test(e2e): a janela da Ressurreição no treino`.

### Tarefa 8: a medição

**Arquivos:** `packages/sim/src/calibrate.ts` (`TOGGLES`: a série "sem a Ressurreição da quadra", `{ resurrectOnQuad: false }`),
`packages/sim/test/calibrate.test.ts`, `packages/sim/reports/calibracao.*`, `packages/sim/reports/dificil.*`, novo `docs/memoria/notas/medicao-ressurreicao-quadra.md`.

- [ ] **Passo 1:** `estado.md` commitado; `pnpm sim:calibrate`. Anotar, na nota, as duas séries lado a lado (duração, iniciativa,
  Exódia, Ressurreições por partida).
- [ ] **Passo 2:** a contagem do uso, com o `runGame` e o `onStep` (2.000 partidas greedy × greedy, sementes `m16-0` a `m16-1999`, as
  mesmas da `medicao-ponto-16.md`, num script fora do repositório, com a receita na nota): janelas abertas, usadas e guardadas, trocas
  (na janela e na fase principal), fileiras bloqueadas pela proteção, cadeias, Ressurreições nunca usadas, e quem usou a janela
  atacando em segundo.
- [ ] **Passo 3:** `pnpm sim:dificil --recomecar` sozinho na máquina. Se passar, `pnpm sim:dificil --ajuste "a busca na janela da
  Ressurreição (horizonte 3)"` com `RESURRECTION: 3` no `HARD_DEFAULTS.horizon`; fica a que tiver a pontuação (a) maior com o p95 ≤ 300 ms
  (empate: sem a busca, que é mais barata). Se reprovar, parar e levar ao autor com os números.
- [ ] **Passo 4:** commit `docs(memoria): a medição da Ressurreição da quadra` (com os relatórios e, se ficou, o horizonte).

### Tarefa 9: o fechamento

- [ ] **Passo 1:** a spec da web (`docs/superpowers/specs/2026-10-17-interface-web-design.md`): o painel da janela e o passo da fileira
  do cemitério, onde os painéis de fase e o cemitério estão descritos.
- [ ] **Passo 2:** `diario.md` (com as escolhas da execução, os números e o que não foi conferido) e a seção do bloco E no `estado.md`.
- [ ] **Passo 3:** mesclar a `main` (com o que a outra sessão tiver posto lá); `pnpm check`; subir a branch; as duas CI (`check` e
  `e2e`) verdes; a `main` por fast-forward. O deploy é do autor (`pnpm deploy:server`).
