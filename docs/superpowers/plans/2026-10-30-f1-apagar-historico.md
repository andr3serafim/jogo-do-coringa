# F1: apagar o histórico de partidas — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans,
> tarefa por tarefa. Os passos usam caixas (`- [ ]`) para o acompanhamento.

**Objetivo:** na tela `/partidas`, apagar a lista inteira das partidas guardadas (`coringa:partidas`) ou uma partida só, sempre
com confirmação.

**Arquitetura:** o modelo da lista (`model/past-games.ts`) ganha duas operações puras que releem o armazenamento e nunca lançam:
`deletePastGame` e `clearPastGames`. As duas desfazem a cópia em memória do `safeStore` quando o navegador recusa (o mesmo
cuidado do `recordPastGame` e do `attachReplay`), e dizem se deu certo. A confirmação do Desistir (`ConcedeDialog`, no
`GameMenu.tsx`) vira um `ConfirmDialog` compartilhado. A tela relê a lista depois de cada ação, mostra o que ficou guardado de
verdade, avisa num `role="status"` e leva o foco a um lugar que ainda existe.

**Stack:** Vite + React 19 + Tailwind v4 na web, Vitest (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-ajustes-design.md`, F1 ("Na tela `/partidas`, uma ação de apagar a lista guardada
(`coringa:partidas`), com confirmação. Apagar uma partida só também cabe."). A lista em si: spec do polimento §4.1 e §4.3. Origem:
`docs/memoria/decisoes.md`, 2026-10-30 (2), item 1, e 2026-10-30 (6).

## Restrições globais

- Rode `pnpm check` antes de commitar (os hooks rodam). **Nunca** `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- **Só a web.** Nada muda no motor, no protocolo, no simulador ou no servidor: sem `RULES_VERSION`, sem `STATE_SCHEMA`, sem
  regravar as partidas de referência e sem o portão do Difícil.
- Os textos novos moram em `model/past-games-copy.ts` (só as telas carregadas sob demanda o importam), nunca no `copy.ts`; o
  smoke da web confere que a lista continua fora do JavaScript inicial. Reaproveitar `CANCEL_LABEL` do `copy.ts` vale.
- Apagar tudo tira só a chave `coringa:partidas`: o assento das salas, as preferências, o apelido, o nível e o tutorial ficam.
- Textos, comentários e mensagens de commit em pt-BR; identificadores em inglês. Imports relativos com `.ts`.
- Antes de cada job longo (`pnpm check`, `pnpm e2e`), commite o `docs/memoria/estado.md` com o próximo passo.
- Branch `feat/apagar-historico`, a partir da `main` (`8146986`).

## Decisões de interface [I] (vão ao autor no `estado.md`)

1. Apagar uma partida só **também pede confirmação** (é irreversível; desfazer seria mais maquinaria do que a F1 pede).
2. Cada linha ganha "Apagar" ao lado de "Rever" (o leitor de tela ouve a linha como descrição, como no "Rever"); abaixo da
   lista, "Apagar o histórico", só quando há partida. Os dois no vermelho do Desistir.
3. O texto da confirmação de uma partida diz qual é (resultado, adversário, data); o de todas, quantas são.
4. Depois de apagar uma, o foco vai ao "Apagar" da linha que tomou o lugar dela (ou da anterior, se era a última); sem linha
   nenhuma, ao título da tela. Depois de apagar tudo, ao título.
5. Uma partida online apagada volta à lista se a pessoa reabrir o link daquela sala terminada em até 24 h (a sala manda o
   desfecho de novo, e a junção pela `key` não acha mais a linha). Fica assim: é a mesma partida aparecendo de novo.

## Foco da revisão

1. **Navegador que recusa a escrita** (aba privada cheia, bloqueio): o `set` do `safeStore` guarda a tentativa em memória e
   relança. Esperado: nada some da tela que o disco ainda tem, e um recarregar mostra a mesma lista.
2. **`removeItem` que falha:** o `safeStore.remove` engole o erro depois de tirar a cópia em memória, e a leitura cai no disco.
   Esperado: `clearPastGames` relê e diz que não apagou; a tela avisa.
3. **Foco depois de apagar:** o botão que abriu o diálogo saiu da página, e o `<dialog>` não tem a quem devolver o foco.
   Esperado: o foco vai ao lugar da decisão 4, nunca ao `<body>`.
4. **Celular (390 px) com os dois botões na linha:** sem rolagem horizontal, e "Rever" e "Apagar" inteiros.
5. **Recarregar a página depois de apagar:** a partida não volta (a gravação foi para o disco), e `/partidas/<id>` da partida
   apagada diz que ela não está mais no navegador.

---

### Tarefa 1: apagar no modelo

**Arquivos:**
- Modificar: `packages/web/src/model/past-games.ts`.
- Testes: `packages/web/test/model/past-games.test.ts` (o `refusingStorage` ganha `control.remove`, que faz o `removeItem` da
  lista lançar).

**Interfaces:**
- Produz: `deletePastGame(store: KeyValueStore, id: string): boolean` e `clearPastGames(store: KeyValueStore): boolean`.
  `true` quando, depois da chamada, a lista lida não tem mais a partida (ou não tem mais nenhuma). Nunca lançam.

- [ ] **Passo 1: testes que falham** (`describe('apagar')`):
  - `apaga só a partida do id; as outras ficam na ordem, com os replays`: três gravadas (a do meio sem replay), apaga a de
    cima; a leitura traz as outras duas, na ordem, com `hasReplay` igual ao de antes.
  - `apagar a última que sobrou tira a chave`: `store.get(PAST_GAMES_KEY)` é `null`.
  - `id desconhecido não grava nada e devolve true`: `sets` não muda.
  - `JSON estragado: devolve true sem lançar` (a lista lida é `[]`; nada é gravado).
  - `com o safeStore e o Storage recusando a escrita: devolve false, e a memória fica igual ao disco` (`store.get` igual a
    `disk.get`, a partida continua na leitura).
  - `clearPastGames tira só a lista`: com `coringa:prefs` e `coringa:tutorial` guardados, eles ficam.
  - `clearPastGames com o removeItem recusando: devolve false, e a lista continua legível igual ao disco`.
  - `clearPastGames sem nada guardado devolve true`.
- [ ] **Passo 2:** rodar `pnpm --filter @coringa/web exec vitest run test/model/past-games.test.ts`. Esperado: falham por
  `deletePastGame`/`clearPastGames` não existirem.
- [ ] **Passo 3:** implementar. `deletePastGame` lê o texto cru (`readRaw`), filtra a lista lida (`parseList`), grava a que
  sobrou (ou `remove`, se ficou vazia) e, se o `set` lançar, `restoreRaw(store, raw)` e `false`. `clearPastGames` faz o `remove`
  e devolve `readRaw(store) === null`.
- [ ] **Passo 4:** os testes do passo 2 passam.
- [ ] **Passo 5:** commit `feat(web): apagar uma partida ou a lista inteira no modelo das partidas anteriores`.

### Tarefa 2: o diálogo de confirmação compartilhado

**Arquivos:**
- Criar: `packages/web/src/ui/table/ConfirmDialog.tsx` (ao lado do `Modal.tsx`).
- Modificar: `packages/web/src/ui/table/GameMenu.tsx` (o `ConcedeDialog` sai e o menu usa o `ConfirmDialog`).
- Testes: os do Desistir em `packages/web/test/ui/end-and-menu.test.tsx` (sem mudança: são a guarda da extração).

**Interfaces:**
- Produz: `ConfirmDialog({ open, title, text, confirmLabel, onCancel, onConfirm })`. "Cancelar" primeiro, onde o foco cai ao
  abrir; o botão de confirmar no vermelho cheio de hoje.

- [ ] **Passo 1:** extrair, com a mesma marcação e as mesmas classes.
- [ ] **Passo 2:** `pnpm --filter @coringa/web exec vitest run test/ui/end-and-menu.test.tsx`. Esperado: verdes, sem mudar teste.
- [ ] **Passo 3:** commit `refactor(web): a confirmação do Desistir vira um diálogo de confirmação compartilhado`.

### Tarefa 3: a tela `/partidas`

**Arquivos:**
- Modificar: `packages/web/src/ui/screens/PastGames.tsx`, `packages/web/src/model/past-games-copy.ts`,
  `packages/web/src/ui/parts.tsx` (o `Button` ganha `variant="danger"`, borda e texto vermelhos sobre o papel; o `Title` aceita
  `ref`, do React 19).
- Testes: `packages/web/test/ui/past-games.test.tsx` (`describe('<PastGames />: apagar')`), `packages/web/test/model/past-games-copy.test.ts`.

**Interfaces:**
- Consome: `deletePastGame`, `clearPastGames` (Tarefa 1); `ConfirmDialog` (Tarefa 2).
- Produz (textos): `DELETE_LABEL = 'Apagar'`, `CLEAR_PAST_GAMES_LABEL = 'Apagar o histórico'`,
  `CLEAR_PAST_GAMES_TITLE = 'Apagar o histórico?'`, `clearPastGamesText(count)`, `DELETE_PAST_GAME_TITLE = 'Apagar esta
  partida?'`, `deletePastGameText(game)`, `PAST_GAME_DELETED_TEXT = 'Partida apagada.'`, `PAST_GAMES_CLEARED_TEXT = 'Histórico
  apagado.'`, `DELETE_FAILED_TEXT` (o navegador não deixou apagar).

- [ ] **Passo 1: testes que falham:**
  - textos: `clearPastGamesText(1)` e `(5)` no singular e no plural; `deletePastGameText` diz o resultado, o adversário e a
    data, e "com o replay" só quando a partida tem replay.
  - tela: "Apagar o histórico" não existe com a lista vazia; cada linha tem "Apagar", descrito pela linha.
  - `Cancelar não apaga nada, e o foco volta ao Apagar da linha`.
  - `confirmar apaga só aquela partida, avisa "Partida apagada." e leva o foco ao Apagar da linha seguinte` (e, na última
    linha, ao da anterior; a única, ao título).
  - `apagar o histórico: confirmar esvazia a lista, mostra o texto de vazia, avisa e leva o foco ao título`; o armazenamento
    fica sem a chave.
  - `o navegador que recusa: a partida continua na tela e o aviso diz que não deu para apagar` (com o `safeStore` sobre um
    `Storage` que recusa a escrita).
  - axe sem violações sérias com o diálogo aberto.
- [ ] **Passo 2:** rodar os dois arquivos de teste. Esperado: falham pelos textos e botões ausentes.
- [ ] **Passo 3:** implementar. A linha: as informações à esquerda e, à direita, "Rever" e "Apagar" um sobre o outro
  (`flex-col`), para caber no celular. O alvo do diálogo é `{ kind: 'all' } | { kind: 'one'; game } | null`. O foco depois da
  ação: um efeito da tela, que roda depois do `close()` do diálogo (o efeito do filho vem antes).
- [ ] **Passo 4:** os testes passam, e os de antes da tela também.
- [ ] **Passo 5:** commit `feat(web): apagar uma partida ou o histórico inteiro na tela das partidas anteriores`.

### Tarefa 4: E2E e docs

**Arquivos:**
- Modificar: `packages/web/e2e/replay.spec.ts` (teste novo, com a lista semeada a partir de `fixtures/especiais.json`).
- Docs: spec do polimento §4.3 e §4.4, spec do sub-projeto 5 (F1 "[feita]", com "Como ficou" e os [I]), `CLAUDE.md` (o
  parágrafo da web), `docs/memoria/` (estado, diário).

- [ ] **Passo 1: E2E** `apagar uma partida e o histórico inteiro, e o recarregar não traz nada de volta`:
  - semear com `page.evaluate` depois do primeiro `goto` (não com `addInitScript`, que rodaria de novo no `reload` e
    repovoaria a lista): duas cópias da entrada da fixture, com ids diferentes;
  - apagar uma (axe com o diálogo aberto), recarregar: fica uma; `/partidas/<id apagado>` diz "Esta partida não está mais neste
    navegador.";
  - "Apagar o histórico" → Cancelar: fica uma; → Apagar: o texto de vazia; recarregar: vazia.
  - no celular (390 × 844), a lista com as duas linhas sem rolagem horizontal e com os dois botões inteiros à vista.
- [ ] **Passo 2:** `pnpm e2e` (commitar o `estado.md` antes). Esperado: todos verdes.
- [ ] **Passo 3:** docs e memória; commit.
