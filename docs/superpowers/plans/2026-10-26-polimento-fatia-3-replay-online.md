# Polimento, fatia 3: replay online — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o servidor manda o replay da partida online quando ela não pode mais continuar, a lista local o anexa à linha da
partida e "Rever" passa a valer para partidas online; de quebra, o visualizador ganha os acertos de UX que a revisão da fatia 2
deixou.

**Architecture:** a mensagem `{ t: 'replay', gameNo, replay }` já existe no protocolo e a `Session` já a guarda (fatia 2). Aqui o
`RoomClient` passa a repassá-la, e o núcleo do servidor ganha um `sendReplay` chamado nos pontos em que a partida acabou de vez:
o fim (motor ou W.O.), o `hello` com a sala em `FINISHED` e a sala encerrada no meio da partida. O gravador da web anexa um
replay que chega depois da linha gravada. O visualizador mostra as pendentes do Equipar, abre o cemitério, troca a mesa sem
deslizar no salto e confere se a partida reexecutada terminou igual à guardada.

**Tech Stack:** TypeScript (Node 24 puro nos pacotes, Vite na web), React 19, Vitest 5, Playwright, Cloudflare Workers
(Durable Objects).

**Spec:** `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§4.2, §4.3, §4.4, §8). Spec 2:
`docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (§8.4, regra da semente já aprovada).

## Global Constraints

- O núcleo do servidor (`packages/server/src/core`) é puro: nada de `cloudflare:*`, relógio ou sorteio próprio (`now` e
  `randomBytes` por parâmetro). A casca `src/worker` não muda.
- A semente de uma partida só sai depois do fim dela, no `replay`; nenhuma mensagem de uma partida que ainda pode continuar
  traz a semente ou dado oculto (spec 2 §8.4). Nunca durante uma partida viva, nem durante a revanche em curso.
- O `replay` é aditivo: `PROTOCOL_VERSION` não muda; clientes antigos o ignoram (o `switch` do `RoomClient` não tem `default`).
- `STATE_SCHEMA` não muda (nada na forma do `GameState`).
- `packages/web/src` sem `node:*`, `@coringa/protocol/schemas` nem `@coringa/engine/testing`; JS inicial ≤ 200 KB gzip.
- Fotossensibilidade (spec 3 §10.4) e movimento reduzido valem no visualizador; nunca afrouxar os testes da linha do tempo.
- Nenhum efeito, texto ou cena nova ligado à Pressão da mesa (será removida no sub-projeto 5).
- Textos em pt-BR; identificadores em inglês. `pnpm check` verde antes de cada commit; nunca `--no-verify`.

## Review Focus

1. **Recarregar a página com a sala em `FINISHED`:** o `hello` reenvia `room` e depois `replay`; a lista não duplica a linha e
   anexa o replay se ele faltava. Teste na Tarefa 2 (servidor) e na Tarefa 3 (web).
2. **Revanche pedida por um só:** a sala segue `FINISHED` e o `hello` manda o replay da partida terminada; quando a revanche
   começa (`PLAYING`), nenhum `replay` sai, nem no `hello`. Teste na Tarefa 2.
3. **Sala encerrada no meio da partida** (os dois somem e a sala expira, ou um fica e o outro não volta): o replay vai até onde a
   partida foi, para quem ainda estiver conectado, antes do fechamento. Teste na Tarefa 2.
4. **Partida reexecutada que termina diferente da guardada** (servidor e navegador em versões diferentes das regras): o
   visualizador avisa em vez de mostrar outro desfecho calado. Teste na Tarefa 4.
5. **Chunk das telas que sumiu depois de um deploy:** abrir "Partidas anteriores" ou "Rever" numa aba velha mostra uma tela
   própria ("atualize a página"), não o erro genérico da sala. Teste na Tarefa 4.
6. **O salto sem deslize na mesa ao vivo:** um `resync` de verdade (reconexão fora do anel) troca a mesa sem animar, e um passo
   ao vivo continua animando. Teste na Tarefa 5.

---

### Task 1: o `RoomClient` repassa o `replay`

**Files:**
- Modify: `packages/protocol/src/messages.ts` (`ServerMessage` inclui `ReplayMessage`; o comentário de `ReplayMessage` deixa de
  prometer "antes do `room`": o treino manda antes, o servidor depois, e a `Session` aceita os dois desde que o `room` da partida
  já exista), `packages/protocol/src/client.ts` (`case 'replay'`)
- Test: o arquivo de testes do `RoomClient` em `packages/protocol/test/`

**Interfaces:**
- Produces: o `RoomClient` emite `{ type: 'replay'; replay: ReplayMessage }` para cada mensagem `replay` recebida, sem guardar
  estado; o cliente de terminal (`packages/sim/src/online`) continua ignorando o evento.

- [ ] **Step 1: Testes:** `repassa o replay como evento`; `um replay malformado (sem gameNo numérico ou sem replay objeto) é
  ignorado`; `o replay não mexe no room nem no state guardados`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(protocol): o cliente repassa a mensagem replay`.

### Task 2: o servidor manda o replay quando a partida acabou de vez

**Files:**
- Modify: `packages/server/src/core/views.ts` (`sendReplay`), `packages/server/src/core/room-core.ts`,
  `packages/server/src/core/lobby.ts`, `packages/server/src/core/presence.ts` (onde a partida termina ou a sala fecha)
- Modify: `docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (§8.4 sem "a partir da fatia 3"; a mensagem
  `replay` na lista de mensagens do servidor)
- Test: `packages/server/test/core/game.test.ts` (ou um arquivo novo `replay.test.ts` na mesma pasta), `seed-seam.test.ts`

**Interfaces:**
- Consumes: `Replay` do motor; `finishGame` monta o mesmo replay da linha `game.replay` (reaproveitar, não duplicar).
- Produces: `export function sendReplay(effects: Effects, record: RoomRecord, live: SocketInfo[]): void` — manda
  `{ t: 'replay', gameNo, replay }` a cada socket com assento de `live`, só com a sala `FINISHED` e um `outcome` da partida
  `record.gameNo`, QUALQUER que seja a fase do motor (o `ABANDONED` não tem `GAME_OVER` e também manda, até o último passo); com
  qualquer outro status não manda nada.

Regras: o `replay` sai sempre DEPOIS do `room` em `FINISHED` daquela partida (a `Session` só aceita o replay da partida do
`room`). Não fixe a lista de pontos pelo plano: enumere TODA transição para `FINISHED` (`finishGame` em `game.ts`, o caminho do
abandono em `game.ts` e o `expire` em `presence.ts`, e o que mais a busca achar), e em cada uma vem `room` e depois `replay`, com
um teste por caminho. No `hello` com a sala `FINISHED` (revanche não começou), o replay vai só ao socket que acabou de entrar (os
outros já o têm). Na sala encerrada (expiração) com a partida em `PLAYING`, que vira `ABANDONED`, o replay vai até o último passo
para os sockets ainda abertos, antes do fechamento: confira em `packages/server/src/worker/room.ts` (e no
`test/core/shell-contract.test.ts`) que a casca aplica `send` antes de `close` e de `deleteAll`; se não houver asserção disso no
contrato da casca, acrescente uma. `name` do replay: `sala-<código>-<gameNo>` (o mesmo da linha de log; reaproveite a montagem
do `finishGame`).

Propriedade (spec 2 §8.4): a semente e o registro inteiro de passos só aparecem em mensagens `replay`, e um socket só recebe o
`replay` de uma partida depois de ter recebido o `room` em `FINISHED` daquela partida. Se `properties.test.ts` já confere que
nenhuma mensagem leva a semente, ESTENDA a propriedade para essa regra (nunca a afrouxe), e ela tem de seguir valendo nas
execuções aleatórias que já existem.

- [ ] **Step 1: Testes:** `o fim pelo motor manda room e depois replay aos dois`; `o W.O. (tempo esgotado três vezes e queda sem
  volta) também`; `a desistência também`; `nenhum replay durante a partida (nenhuma mensagem com a semente antes do fim)`; `o
  hello com a sala FINISHED reenvia o replay depois do room`; `revanche pedida por um só: o hello ainda manda o replay da
  terminada`; `revanche começada: nenhum replay, nem no hello`; `sala que expira no meio da partida manda o replay até onde foi a
  quem está conectado, antes de fechar`; `o hello com a sala FINISHED num núcleo reconstruído do armazenamento (como o
  seed-seam faz) manda o replay com a semente e todos os passos`; `no hello, só o socket que entrou recebe o replay`; `o replay reexecutado no motor chega ao estado final guardado`; e, em
  `seed-seam.test.ts` ou `game.test.ts`, `cada partida nova, inclusive a revanche, pede randomBytes(16) para a semente e não a
  deriva da anterior` (sem `newSeed`; conta as chamadas e confere que a semente da revanche é a dos bytes daquela chamada).
- [ ] **Step 2:** FAIL. **Step 3:** implementar; atualizar a spec 2. **Step 4:** PASS (os testes do workerd também).
- [ ] **Step 5:** `pnpm check`; commit `feat(server): o replay da partida online sai quando ela acabou de vez`.

### Task 3: a lista anexa o replay que chega depois

**Files:**
- Modify: `packages/web/src/model/past-games.ts` (`attachReplay`), `packages/web/src/ui/table/useRecordPastGame.ts`
- Test: `packages/web/test/model/past-games.test.ts`, `packages/web/test/ui/past-games-record.test.tsx`

**Interfaces:**
- Produces: `export function attachReplay(store: KeyValueStore, id: string, replay: Replay): PastGame | null` — acrescenta o
  replay à linha `id` que ainda não tem um (com a mesma validação e o mesmo teto de 1 MB, tirando replays das mais velhas se
  preciso); devolve a linha como ficou, ou `null` se ela não existe mais ou o armazenamento recusou; nunca lança.

Regras: o gravador grava a linha no `FINISHED` (como hoje) e, quando o `snapshot.replay` da mesma partida chega depois — ou
quando a gravação devolveu uma linha já existente (recarregar a página) sem replay —, chama `attachReplay` uma vez; então
"Rever a partida" aparece. Um replay de outra partida nunca entra na linha.

- [ ] **Step 1: Testes:** `attachReplay acrescenta o replay e mantém o resto`; `não troca um replay que já existe`; `id que
  sumiu devolve null`; `respeita o teto de 1 MB`; `armazenamento que recusa devolve null sem lançar`; no gravador: `online, o
  replay que chega depois do FINISHED entra na linha e o "Rever" aparece`; `o replay que já está no snapshot no FINISHED entra na
  gravação direto` (as duas ordens de chegada); `recarregar com a sala FINISHED não duplica e anexa o
  replay que faltava`; `um replay de outra partida é ignorado`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): a partida online ganha o replay quando ele chega`.

### Task 4: o visualizador, com o que faltou (só as telas do replay)

**Files:**
- Modify: `packages/web/src/ui/screens/ReplayViewer.tsx`, `ReplayScreen.tsx`, `PastGames.tsx`, `packages/web/src/model/replay-track.ts`,
  `packages/web/src/app/App.tsx` (falha do chunk)
- Test: `packages/web/test/ui/replay-screen.test.tsx`, `past-games.test.tsx`, `test/model/replay-track.test.ts`, `test/ui/app.test.tsx`

Regras (achados da revisão final da fatia 2 que só mexem no visualizador):
1. **Equipar visível:** no Equipar, as suas numéricas recebidas (`view.self.pending`) aparecem num bloco só de leitura (sem
   botões de destino), com o mesmo desenho de carta da mão.
2. **Cemitério:** a mesa do replay abre o cemitério em modo só de ver (o `GraveyardDialog` que a mesa ao vivo já usa).
3. **Foco:** ao abrir `/partidas` e `/partidas/<id>`, o foco vai ao título da tela.
4. **Partida que diverge:** quando a trilha vai até o fim e o resultado do último quadro não bate com `outcome.result`
   guardado, a tela avisa: "Esta partida terminou diferente quando foi reexecutada: as regras mudaram desde que ela foi gravada."
   (vale também com a mesma `rulesVersion`). Sem `outcome.result` (abandono), não confere.
5. **Chunk que falha:** se o `import()` de uma das telas falhar, a rota mostra "Não deu para abrir esta tela. Atualize a página."
   com um botão "Atualizar", em vez do erro genérico.

- [ ] **Step 1: Testes** para cada regra (1 a 5), no arquivo que cobre a peça.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check` (o JS inicial segue ≤ 200 KB); commit `feat(web): o replay mostra o Equipar e o cemitério, e
  avisa quando a partida diverge`.

### Task 5: o que o replay pediu na mesa ao vivo e no armazenamento

**Files:**
- Modify: `packages/web/src/ui/cards/Card.tsx` (deslize no salto), `packages/web/src/ui/table/PlayTable.tsx` (navegação do
  "Rever" no treino), `packages/web/src/model/past-games.ts` (memória depois de recusa total)
- Test: os testes de animação que cobrem o `resync` (`test/ui/animation.test.tsx`), `test/ui/past-games-record.test.tsx` ou
  `end-and-menu.test.tsx`, `test/model/past-games.test.ts`

Regras (achados da revisão final da fatia 2 que mexem em código da mesa ao vivo e no caminho de gravação — revisão própria):
1. **Salto sem deslize:** com `state.resync`, as cartas trocam de lugar sem a animação de layout (duração 0), no replay e na
   mesa ao vivo; o `catchUp` e o ao vivo não mudam. Os testes de fotossensibilidade continuam como estão.
2. **"Rever a partida" no treino** navega com `replace` (o Voltar do navegador leva ao início, não a um treino novo); online
   continua com `push` (Voltar volta à sala).
3. **Recusa total do armazenamento:** quando `recordPastGame`/`attachReplay` desistem, regravam o texto que leram, para a cópia
   em memória do `safeStore` voltar a ser igual ao disco (sem perder replays guardados numa gravação seguinte).

- [ ] **Step 1: Testes** para cada regra (1 a 3); o salto testado na mesa ao vivo também (um `resync` não anima, um passo ao vivo
  anima como antes).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `fix(web): o salto troca a mesa sem deslizar, e o Voltar do replay do treino vai ao início`.

### Task 6: E2E do replay online e documentos

**Files:**
- Modify: `packages/web/e2e/replay.spec.ts` (ou `online.spec.ts`; um teste novo, curto)
- Modify: `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§4.2: como ficou; tirar o "Se a mudança for
  recusada"), `docs/superpowers/specs/2026-10-17-interface-web-design.md` (a lista com replay também online)

- [ ] **Step 1:** E2E: duas pessoas numa sala (como o `online.spec.ts` monta), as duas prontas, uma desiste pelo menu; nas duas
  o painel de fim mostra "Rever a partida"; uma abre o replay, avança um passo e volta à lista, que mostra "Sala <código>" com
  "Rever"; axe. Uma sala só: antes, conte quantas salas a suíte inteira cria (os testes podem rodar em paralelo) e confirme que o
  total fica abaixo do limite de 10 por minuto por IP.
- [ ] **Step 2:** `pnpm e2e` verde; atualizar os documentos.
- [ ] **Step 3:** `pnpm check`; commit `test(web): E2E do replay online e as specs`.

---

## Depois da última tarefa

Revisão de código da fatia inteira, `check` e `e2e` verdes na CI da branch, fast-forward na `main`, CI da `main` verde e um
aviso curto à sessão principal.
