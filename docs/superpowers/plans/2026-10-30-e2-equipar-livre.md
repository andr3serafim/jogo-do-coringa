# E2: Equipar livre — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans,
> tarefa por tarefa. Os passos usam caixas (`- [ ]`) para o acompanhamento.

**Objetivo:** depois da compra, o jogador vê todas as numéricas recebidas de uma vez e as põe na fileira que quiser, na ordem que
quiser (a ordem define quem fica na frente da fila).

**Arquitetura:** a ação `EQUIP` ganha um campo opcional `order` (os ids das numéricas pendentes, na ordem em que entram);
`destinations[i]` vale para a carta `order[i]`. Sem `order`, vale a ordem de compra, como hoje: os bots, o tempo esgotado, o
terminal e os replays guardados não mudam. O motor confere que `order` é uma permutação das pendentes e, ao confirmar, reordena
`pending`; o resto (`validateDestinations`, `resolveEquip`, `autoDestinations`, `nextEquipDestinations`) fica igual, porque os
destinos possíveis só dependem de quantas cartas cada fileira tem. A web troca o rascunho de "um destino por posição" para
"carta + destino", mostra todas as pendentes no painel do Equipar e deixa escolher qualquer uma (toque ou arraste).

**Stack:** TypeScript no Node 24 puro (motor, protocolo, simulador, servidor), Vite + React na web, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-ajustes-design.md`, seção E2. Origem: `docs/memoria/decisoes.md`, 2026-10-30 (2), item 8
("ver todas as numéricas de vez após a compra e equipa-las livremente, ao invés de uma por vez em fila").

## Restrições globais

- Rode `pnpm check` antes de commitar (os hooks rodam). **Nunca** `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- Imports relativos terminam em `.ts`. Só sintaxe apagável. `import type` para tipos.
- Textos, comentários e mensagens de commit em pt-BR; identificadores em inglês.
- **Sem subida de `RULES_VERSION` nem de `STATE_SCHEMA`:** as partidas de referência não mudam (os bots não mandam `order`), e o
  `GameState` não ganha campo. A prova é regravar as partidas de referência e ver o digest 3 igual.
- `legalActions` continua canônica, **sem `order`** (sem isso o Difícil busca 4! vezes mais lances e o portão de latência cai).
- Na web, nada de regra: os destinos vêm de `nextEquipDestinations`, o estouro de `autoDestinations`. Nada de
  `@coringa/protocol/schemas` nem `node:*` em `packages/web/src`.
- Antes de cada job longo (`pnpm check`, `pnpm e2e`, `sim:dificil`), commite o `docs/memoria/estado.md` com o próximo passo.
- Branch `feat/equipar-livre`, a partir da `main` (`0136e47`).

## Foco da revisão

1. **Destino ligado à carta pela posição:** todo lugar que casa `destinations[i]` com `pending[i]` erra a carta quando há `order`
   (a prévia da mesa, `draftIds`, o `actionText` do simulador). Esperado: cada destino vai para a carta de `order[i]`.
2. **`order` malformada vinda do cliente:** comprimento diferente, id repetido, id de outra carta, id da mão. Esperado: o motor
   recusa sem mutar o estado; o Zod recusa mais de 16 ids.
3. **Envio antecipado parcial** (faltam 1,5 s, só algumas cartas escolhidas): as escolhidas entram na ordem escolhida, e as que
   faltam depois, na ordem de compra, pela regra de estouro.
4. **Desfazer depois de escolher fora de ordem:** volta a última escolha, e a carta volta para as pendentes no lugar dela.
5. **Celular (375 px) com 4 numéricas:** as quatro cabem sem rolagem horizontal, e os destinos seguem à vista.

---

### Tarefa 1: a ordem no motor e no protocolo

**Arquivos:**
- Modificar: `packages/engine/src/types.ts` (a ação `EQUIP`), `packages/engine/src/actions/equip.ts`,
  `packages/engine/src/apply-action.ts`, `packages/protocol/src/schemas.ts`, `packages/sim/src/play/text.ts` (`actionText`).
- Testes: `packages/engine/test/equip-order.test.ts`, `packages/engine/test/legal-actions.test.ts`,
  `packages/protocol/test/schemas.test.ts`, o teste do `actionText` no simulador.

**Interfaces:**
- Produz: `Action` `{ type: 'EQUIP'; destinations: Destination[]; order?: string[] }`. `handleEquip(s, playerId, destinations,
  order, ev)`.

- [ ] **Passo 1: testes que falham** (motor, em `describe('Equipar livre (E2)')`):
  - `com order, cada destino vai para a carta de order[i]`: pendentes 3, 7, 9; `order` = [id do 9, id do 3, id do 7],
    `destinations` = ['ATK', 'ATK', 'DEF'] → Ataque [9, 3], Defesa [7]; o `CardsPlaced` traz as cartas nessa ordem.
  - `a ordem define a frente da fila`: Ataque vazio, pendentes 3 e 9, `order` = [9, 3], os dois no Ataque → Ataque [9, 3].
  - `com as duas fileiras cheias, a troca usa a carta de order`: a última do Ataque sai e entra a carta de `order[0]`.
  - `sem order, vale a ordem de compra` (o caso de hoje, explícito).
  - `rejeita order que não é permutação das pendentes`: comprimento menor → `INVALID_DESTINATIONS`; id repetido →
    `DUPLICATE_CARDS`; id fora das pendentes (da mão, de outra fileira, inventado) → `INVALID_CARD`; não é array →
    `INVALID_DESTINATIONS`. Nenhum muta o estado (o `act` do helper já confere?, senão `deepFreeze`/comparação).
  - `o tempo esgotado depois de um order confirmado mantém a ordem confirmada` (P1 confirma com `order`, P2 por `TIMEOUT`).
  - Em `legal-actions.test.ts`: `nenhum EQUIP da lista legal traz order`.
  - Protocolo: `EQUIP` com `order` passa; `order` com 17 ids e `order` com id vazio são recusados; outra chave extra continua
    recusada.
  - `actionText` do `EQUIP` com `order`: "Equipar: 9♠ → Fileira de Ataque, 3♥ → …" na ordem de `order`.
- [ ] **Passo 2:** rodar e ver falhar pelo motivo certo.
- [ ] **Passo 3:** implementar. `validateOrder(p, order)` em `equip.ts`; no `submit`, reordenar `p.pending` pela `order`. O
  `apply-action` passa `action.order`. Zod: `order: z.array(cardId).max(LIMITS.destinations).optional()`.
- [ ] **Passo 4:** rodar os testes do motor, do protocolo e do simulador; regravar as partidas de referência
  (`pnpm --filter @coringa/sim record-golden`) e conferir que nada mudou (`git status` limpo nos snapshots, digest 3 igual).
- [ ] **Passo 5:** commit `feat(engine): Equipar livre — a ação EQUIP diz a ordem das numéricas`.

### Tarefa 2: o rascunho por carta na web (modelo e sessão)

**Arquivos:**
- Modificar: `packages/web/src/model/equip.ts`, `packages/web/src/model/session.ts`, `packages/web/src/model/drag.ts`,
  `packages/web/src/ui/table/Table.tsx` (`moves`, `draftIds`, `draftKey`).
- Testes: `packages/web/test/model/equip.test.ts`, `automation.test.ts`, `drag.test.ts`, `session.test.ts`.

**Interfaces:**
- Produz:
  - `interface EquipPick { cardId: string; destination: Destination }`.
  - `draftBoard(view, picks: EquipPick[]): DraftBoard` (aplica pela carta, não pela posição).
  - `completeDraft(view, picks): EquipPick[]` (as escolhidas, depois as que faltam na ordem de compra, com `autoDestinations`).
  - `equipAction(picks: EquipPick[]): PlayerAction` → `{ type: 'EQUIP', destinations, order }`.
  - `remainingCards(view, picks): NumCard[]` (as pendentes ainda sem destino, na ordem de compra).
  - Sessão: `equipChoose(destination: Destination, cardId?: string)`; sem `cardId`, a primeira que falta (ordem de compra).
    `snapshot.equipDraft: EquipPick[]`.
  - `equipDropZones(view, legal, picks)` (os destinos só dependem da contagem: mesma lista para qualquer carta).

- [ ] **Passo 1: testes que falham:**
  - `draftBoard` com picks fora da ordem de compra: a fileira recebe as cartas na ordem das escolhas.
  - `completeDraft` com 1 de 3 escolhida (a 3ª): a 3ª primeiro, depois a 1ª e a 2ª pelo estouro.
  - `equipAction`: `order` = ids na ordem das escolhas.
  - Sessão: `equipChoose('ATK', id da 3ª)` põe a 3ª; `equipChoose('DEF')` sem id põe a 1ª que falta; id já escolhido, id que não
    é pendente ou destino que a regra não deixa → nada muda; Desfazer tira a última escolha; o envio manda `order`.
  - Os testes de hoje que comparam `equipDraft` com destinos passam a comparar os destinos dos picks.
- [ ] **Passo 2:** rodar e ver falhar.
- [ ] **Passo 3:** implementar; `Table.tsx` usa os ids dos picks no `draftIds`.
- [ ] **Passo 4:** rodar os testes da web.
- [ ] **Passo 5:** commit `feat(web): o rascunho do Equipar guarda carta e destino`.

### Tarefa 3: o painel do Equipar com todas as numéricas

**Arquivos:**
- Modificar: `packages/web/src/ui/table/EquipPanel.tsx`, `packages/web/src/ui/table/PlayTable.tsx` (o `onChoose` com carta),
  `packages/web/src/model/copy.ts` (cabeçalho e resumo das regras), `packages/web/src/model/tutorial-copy.ts` (dica `equip`).
- Testes: `packages/web/test/ui/phases.test.tsx`, `table-drag.test.tsx`, `rules-copy.test.ts`; E2E `e2e/helpers.ts`
  (`equipByUi`), `e2e/drag.spec.ts`.

**Desenho:**
- Cabeçalho: "Faltam N de M" (`equipLeftText`), com Desfazer e Recomeçar como hoje; completo, o texto de pronto.
- As pendentes ainda sem destino, em fila (`role="list"`, nome "Suas numéricas"), cada uma um botão (`aria-pressed` na
  escolhida). A escolhida sobe com o anel dourado, como na mão. Sem toque, a escolhida é a primeira que falta.
- Os destinos (lista "Destinos", rótulos de hoje, com "sai 9♠" na troca) valem para a escolhida.
- Toda pendente sem destino arrasta até as zonas de hoje; soltar escolhe aquela carta e aquele destino.
- No celular, as cartas em cima e os destinos embaixo; no PC, lado a lado (conferir no navegador a 375 px e a 1536 × 695).
- Resumo e Confirmar como hoje, na ordem das escolhas.

- [ ] **Passo 1: testes que falham** (phases): as três pendentes à vista; tocar a 3ª e depois "Fileira de Ataque" põe a 3ª
  (o rascunho e a fileira mostram a 3ª); "Faltam 2 de 3"; o foco volta ao primeiro destino; Desfazer devolve a 3ª à fila.
  table-drag: arrastar a 2ª pendente até a Defesa escolhe a 2ª.
- [ ] **Passo 2:** rodar e ver falhar.
- [ ] **Passo 3:** implementar o painel, os textos e a dica.
- [ ] **Passo 4:** rodar os testes da web; E2E: `equipByUi` lê "Faltam N de M"; o teste da "carta da vez" do `drag.spec`
  arrasta uma pendente que não é a primeira.
- [ ] **Passo 5:** commit `feat(web): o Equipar mostra todas as numéricas e aceita qualquer ordem`.

### Tarefa 4: specs, `CLAUDE.md` e verificação

- [ ] Spec 1 §1.4 (a ordem é do jogador), spec da web §3.5 (o painel), spec do polimento §6 e o `CLAUDE.md` (arrastar qualquer
  pendente, não "a carta da vez"), spec do sub-projeto 5 (E2 feita, com as leituras **[I]**).
- [ ] `pnpm check`, `pnpm e2e`, o navegador (375 px e 1536 × 695 com 4 numéricas, sem rolagem horizontal).
- [ ] Portão do Difícil: `pnpm sim:dificil --ajuste "E2: ordem livre no Equipar; bots inalterados"`, sozinho na máquina.
- [ ] Memória (`estado.md`, `diario.md`; os **[I]** no "Esperando o autor"), push, CI verde, merge por fast-forward.

## Leituras [I] (vão ao autor; não estão nas palavras dele)

- O terminal do simulador (`pnpm play`) continua na ordem de compra.
- Sem tocar numa carta, o destino vale para a primeira que falta, na ordem de compra (o fluxo de hoje segue em um toque).
- No envio antecipado (faltam 1,5 s) e no tempo esgotado, as que faltam entram depois das escolhidas, na ordem de compra.
