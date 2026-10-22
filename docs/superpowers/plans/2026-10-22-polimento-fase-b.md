# Polimento, Fase B: dívida técnica (plano curto)

Sub-projeto 4, Fase B. Sem spec: cada item é um conserto pequeno, com teste primeiro (TDD), um commit por tarefa e `pnpm check`
antes de cada commit. Branch `feat/polish`, depois da Fase A. A execução é sequencial, na própria sessão (sem subagentes), para
poupar o limite de uso.

Regras que valem em todas as tarefas (`CLAUDE.md`):
- mudou o resultado de uma partida de referência: só com `pnpm --filter @coringa/engine exec vitest run -u` depois de revisar o
  diff dos snapshots, e o commit diz qual regra mudou;
- mudou a forma do `GameState`: subir `STATE_SCHEMA` (nenhuma tarefa daqui muda o estado; os eventos ganham só campos opcionais);
- textos em pt-BR; identificadores em inglês.

## Motor (`packages/engine`)

**B1. `validateConfig` sem `deck`.** Uma config vinda de JSON ou de outro pacote sem `deck` (ou com `deck: null`) derruba
`validateConfig` com `TypeError` em vez de devolver `INVALID_CONFIG`. Conserto: conferir que `deck` é objeto antes de ler os
campos; idem para a config que não é objeto. Teste em `config.test.ts` e no `createGame`.

**B2. Eventos com referências do estado.** `applyAction` devolve eventos que apontam para objetos do estado novo (`reflect`, as
cartas, `quad`, as listas de `placements`). Quem guardar os eventos e mexer no estado (ou o contrário) altera os dois. Conserto:
os eventos saem como cópia (`structuredClone(ev)` no fim de `applyAction`, e o mesmo em `createGame`). Teste: mexer no estado
devolvido não muda os eventos, e vice-versa. Conferir o custo no `pnpm sim` (500 partidas) antes e depois; se passar de ~10%,
copiar só os campos com objeto.

**B3. `AbsoluteAttack` no caminho do Reflect e o papel do Selvagem nos eventos.**
- Hoje o Ataque Absoluto que bate num Reflect gasta o J (o `BuffRemoved` do fim) sem emitir `AbsoluteAttack`. Conserto: emitir
  `AbsoluteAttack` também no ramo `REFLECTED`, antes do `ReflectTriggered`. A interface ganha a cena do Absoluto antes da do
  Reflect, e a marca "novo" do J gasto deixa de acender (B9).
- `TrapUsed` e `Sacrificed` com Selvagem não dizem o papel (A, J ou Q). Conserto: campo opcional `as` só quando a carta é
  Selvagem (como o `BuffPlayed`), e o texto do histórico (`@coringa/sim/text`) passa a dizer "Selvagem (como A)".
- Partidas de referência: os resultados não mudam (só eventos); se os resumos mudarem, revisar o diff e aceitar com `-u`.

**B4. `equipOptions` cresce 3^n.** As trocas (`REPLACE_LAST_*`, `DISCARD`) só aparecem com as duas fileiras cheias, e aí cada
numérica que sobra tem 3 destinos: 3^k sequências, quase todas com o mesmo resultado (trocar duas vezes a última do Ataque é o
mesmo que descartar a primeira e trocar com a segunda). Na config padrão são no máximo 81; com `cardsPerEquip` alto (o `pnpm sim`
aceita) a lista explode. Conserto: na cauda com as fileiras cheias, só as sequências canônicas (no máximo uma troca por fileira,
as outras cartas descartadas), (k+1)² no lugar de 3^k. O `handleEquip` continua aceitando qualquer sequência válida. A lista
também muda na config padrão: conferir os bots, as partidas de referência e o Equipar carta a carta da web.

**B5. Auxiliar "Ataque Absoluto armado".** Exportar `absoluteAttackArmed(side, config)` do motor (a mesma regra de
`previewBetween`), usá-lo na prévia e no `PlayerField.tsx` (que hoje faz a conta), e apagar o `isAbsoluteAttack` morto de
`combat.ts`.

**B6. Subpath `@coringa/engine/testing`.** `exports["./testing"]` aponta para `test/helpers.ts`; o sim e o servidor trocam os
imports relativos (`../../engine/test/helpers.ts`) pelo subpath. Conferir que o Node puro, o Vitest e o pool do workerd
resolvem.

**B7. Deriva da spec do motor.** A lista de eventos da spec 1 (§ eventos) cita `CardReplaced`, que não existe (é o `replaced` do
`CardsPlaced`), e omite eventos que existem. Conserto: a lista passa a ser a da união `GameEvent` de `types.ts`.

## Simulador e terminal (`packages/sim`)

**B8. CLI.**
- `pnpm sim --partidas abc` vira `NaN` partidas sem aviso: validar inteiro positivo e sair com mensagem clara.
- `--semente ../x` no `pnpm play` grava o replay fora de `replays/`: o nome do arquivo sai da semente saneada (só letras,
  números, `-` e `_`), e o caminho final é conferido dentro da pasta.
- `loadSessions` aceita `lastSeq` que não é inteiro não negativo (o servidor recusa o `hello` e o terminal entra em laço de
  reconexão lenta): validar como a web já faz.
- Revanche infinita: dois `pnpm bot` na mesma sala pedem revanche para sempre. O bot passa a só aceitar a revanche que o
  oponente pediu (nunca pede primeiro).
- "Aguardando o oponente…" sai a cada `state` em que não é a sua vez: passa a sair uma vez por espera.

## Interface (`packages/web`)

**B9. Marcas "novo" a mais** (spec §10.5: só o que o oponente fez). `ownSpentIds` passa a reconhecer também:
- o J do Ataque Absoluto contra um Reflect (com o evento da B3; o J gasto é o `BuffRemoved` seu depois do seu
  `CardsRemovedFromRow` de Ataque, e não o das Q que o Reflect quebra, que é do oponente e segue marcado);
- a carta da sua fileira trocada pelo seu próprio Equipar (`CardsPlaced` seu com `replaced`);
- o Q que a sua Defesa Absoluta gasta ao acabar (`BuffRemoved` seu logo depois do seu `AbsoluteDefenseEnded`).
O `resync` sem eventos segue marcando a mais (não há como saber o que foi seu); fica escrito no comentário.

**B10. Contador do histórico.** Abrir a gaveta (celular e tablet) conta como ver as linhas: o contador do botão passa a contar
só as linhas novas desde a última vez em que a gaveta esteve aberta. As marcas "novo" dentro da lista seguem a regra da §10.5.

**B11. Celular baixo (360×640).** Medir a mesa no Ataque; se a sua fileira de Ataque fica abaixo da dobra, uma variante por
altura no celular (como a `pc-baixo`) reduz a mão e o respiro da barra. E2E a 360×640 conferindo a fileira de Ataque e o botão
principal à vista. Se não couber sem perder os 44 px dos alvos, registrar e parar.

**B12. Menores adiados baratos** do `docs/superpowers/notes/2026-10-22-interface-web-passagem.md` §2, só os de uma linha:
`expired` com `<= 0`, `.gitignore`/favicon se faltarem, `prop banner` sem uso na `Table`, `passed` calculado duas vezes. O resto
fica listado lá, com o motivo.

## Fora da Fase B

- Firefox e Safari (`pointerdown` que pula as batidas): a CI só tem Chromium; fica para o playtest do autor.

## Pronto quando

Todas as tarefas commitadas em `feat/polish`, `pnpm check` verde, revisão de código feita, CI verde (`check` e `e2e`) na branch,
fast-forward na `main` e CI verde na `main`.
