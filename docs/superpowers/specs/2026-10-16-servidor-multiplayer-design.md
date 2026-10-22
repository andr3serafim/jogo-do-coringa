# Jogo do Coringa — Servidor multiplayer (Sub-projeto 2)

- **Data:** 2026-10-16
- **Status:** **aprovada** pelo autor em 2026-10-16 (inclusive as mudanças pós-lote: abandono com os dois fora, 50 passos na reconexão, `pnpm deploy:server`). Atualizada em 2026-10-17 pela spec 3 (interface web): marca `auto` no `act` (§4.3, §7.3).
- **Depende de:** spec do sub-projeto 1, `docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md` (§1.7 janela de reação, §1.11 W.O., §1.12 tempos, §2 API do motor)

---

## 0. Contexto e escopo

### 0.1 Objetivo

Dois amigos jogam uma partida 1v1 em tempo real a partir de um link, sem conta. O servidor é a autoridade: guarda o estado, aplica as regras pelo motor (`@coringa/engine`), controla os tempos e manda a cada jogador só o que ele pode ver. A interface (sub-projeto 3) ainda não existe. Neste sub-projeto, o jogo é testado por um cliente de terminal e por um bot que entra na sala (§10.2).

### 0.2 Legenda das marcações

- **[D]** decidido antes desta spec (spec do sub-projeto 1 ou sessão de origem); não se rediscute.
- **[A]** decidido pelo autor em 2026-10-16, no lote de 12 perguntas desta spec.
- **[P]** proposta desta spec; o autor confere na revisão.

### 0.3 Já decidido [D]

- Cloudflare Workers + Durable Objects: **1 sala = 1 objeto**, WebSocket Hibernation, alarmes para os tempos.
- Sem contas: **apelido + token de reconexão** guardado no navegador.
- **Servidor autoritativo:** o navegador só envia intenções.
- Cada jogador recebe o próprio `viewFor` e os eventos redigidos por `viewEvents`.
- A **semente nunca vai para o navegador** (ver §8.6 para o log da conta).
- O estado é salvo no storage do objeto **a cada passo**.
- Tempos da spec 1 §1.12: Equipar 40 s, Escolha da ordem 10 s, Turno 30 s, Janela de reação 8 s (mínimo 2 s), Reconexão 60 s. W.O. por 60 s sem voltar ou 3 turnos estourados seguidos (§1.11).

### 0.4 Não-objetivos

Espectadores, chat, matchmaking, contas, ranking, regras ou tempos escolhidos por sala, pausa, histórico além da vida da sala, painel de administração, deploy automático pela CI, domínio próprio, interface web (sub-projeto 3), jogar contra bot no navegador (sub-projeto 4).

### 0.5 Anti-objetivos (falhas mesmo que "funcione")

- Qualquer informação oculta chegando ao outro jogador: mão, numéricas pendentes, ordem do monte, semente — inclusive pelo **tempo** de uma resposta.
- O servidor aceitar do cliente algo além de uma intenção do próprio jogador.
- Um prazo de uma fase que já passou virar jogada na fase seguinte.
- Uma partida corromper ou travar por causa de um deploy, de uma queda ou de uma mensagem repetida.

---

## 1. Arquitetura

### 1.1 Peças

```
navegador / terminal ──HTTP──▶ Worker (rotas /api, limite por IP) ──RPC──▶ DO Room (1 por sala)
                     ──WS────▶ Worker ──fetch (upgrade)───────────────────▶ DO Room
                                                                            │
                                                     núcleo puro RoomCore ◀─┘ (sem API da Cloudflare)
                                                                            │
                                                                  @coringa/engine
```

- **Worker** (`packages/server/src/worker/`): valida o código da sala, aplica o limite por IP, encaminha para o objeto da sala. Sem estado.
- **Durable Object `Room`** (`packages/server/src/worker/`): casca fina. Aceita WebSockets com hibernação, lê e grava o storage, programa o alarme, entrega ao núcleo as entradas e executa as saídas.
- **`RoomCore`** (`packages/server/src/core/`): toda a lógica da sala — lobby, protocolo, passos do jogo, prazos, presença, W.O. **[P]** É TypeScript puro: recebe entradas com o instante atual (`now`) e um gerador de aleatoriedade injetado, e devolve saídas (mensagens por destinatário, o que gravar, o próximo alarme, sockets a fechar, linhas de log). Não importa nada de `cloudflare:*` (o ESLint barra), não lê relógio e não sorteia sozinho. Roda no Node puro, como o motor, e é onde ficam quase todos os testes.

### 1.2 Pacotes [P]

| Pacote | Conteúdo | Roda em |
|---|---|---|
| `packages/protocol` (`@coringa/protocol`) | versão do protocolo; tipos das mensagens; esquemas de validação (Zod 4) num subpath só do servidor; formato do código e do link; `RoomClient` (cliente sem framework, com reconexão) | Node, navegador, workerd |
| `packages/server` (`@coringa/server`) | `src/core/` (RoomCore, agenda de prazos, presença, limite por conexão), `src/worker/` (Worker e DO), `wrangler.jsonc` | núcleo: Node e workerd; casca: workerd |
| `packages/sim` (já existe) | `pnpm play --online` e `pnpm bot` usando o `RoomClient` (§10.2) | Node |

- O cliente web (sub-projeto 3) importa só os tipos e o `RoomClient`; o Zod não entra no bundle dele.
- Os tipos `PlayerView`, `GameEvent`, `Action` vêm do motor (`import type`). O esquema da ação aceita exatamente a união `Action` do motor **menos** `TIMEOUT` e `FORFEIT`; um teste de tipos garante que o esquema e o tipo do motor não divergem.
- Evitar ciclo de dependência entre pacotes: o servidor pode ter o simulador como devDependency (bots nos testes); o simulador depende só do protocolo.

---

## 2. Sala

### 2.1 Código e link [A]

- Código de **6 caracteres** do alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 símbolos, sem 0/O, 1/I/L). ~887 milhões de combinações.
- Entrada sem diferença de maiúsculas: o servidor normaliza para maiúsculas e rejeita (404) qualquer código fora do formato **sem tocar no objeto**.
- Objeto da sala: `idFromName(código)` (ou `getByName`).
- **Link:** `<origem>/s/<CÓDIGO>`. A rota `/s/...` será servida pela interface (sub-projeto 3); o cliente de terminal já aceita o link, o código ou a URL do servidor (§10.2).
- Colisão na criação: o objeto recusa se já houver sala; o Worker tenta outro código (até 5 vezes).

### 2.2 Assentos, apelido e token

- Dois assentos com ids fixos **`p1`** (quem criou) e **`p2`** [P]. Esses são os `PlayerId` do motor; são públicos e aparecem nos eventos dos dois lados. **O id nunca é o token.**
- **Apelido** [P]: normalizado (NFC, espaços nas pontas removidos), 1 a 20 caracteres, sem caracteres de controle. Apelido repetido é permitido.
- **Token** [D]: 32 bytes aleatórios em base64url, entregue **uma vez** no corpo da resposta HTTP que ocupa o assento. O objeto guarda só o **SHA-256**. O cliente guarda o token (no navegador, em `localStorage`, por código de sala).
- O token vai na **primeira mensagem do WebSocket**, nunca na URL (a URL vai para os logs).

### 2.3 Estados da sala

```
LOBBY ──(2 assentos, os dois conectados e prontos)──▶ PLAYING ──(GAME_OVER)──▶ FINISHED
                                                         ▲                         │
                                                         └──(os dois pedem revanche, conectados)
```

- **LOBBY:** existe só antes da primeira partida.
  - Quem chega pelo link ocupa o assento livre (HTTP, §3).
  - Cada um marca **pronto**. A partida começa quando os dois assentos estão ocupados, **os dois conectados** e **os dois prontos**.
  - Cair no lobby desmarca o pronto daquele jogador [P]. Isso evita a partida começar com alguém fora e o relógio de W.O. já correndo.
  - `leave` libera o assento (só no lobby) [P]. O assento não é liberado sozinho por queda; a sala some pela expiração (§2.5).
- **PLAYING:** a partida corre (§5–§7).
- **FINISHED:** o estado final continua disponível (retrato da mesa com o resultado). Também se chega aqui por partida abandonada (§7.2), sem `GAME_OVER` no motor.
  - **Revanche** [A]: cada um pede; com os dois pedindo e conectados, começa outra partida na mesma sala, com **semente nova**, mesmos assentos e mesma config. A iniciativa é sorteada pelo motor, como sempre.
  - Depois da primeira partida, não há como trocar de oponente na mesma sala: cria-se outra sala [P].
- **Placar da sala** [A]: `{ p1: vitórias, p2: vitórias, empates }`, mostrado no lobby e no fim. W.O. e desistência contam como vitória do outro. Some com a sala; não vira ranking.

### 2.4 Configuração da partida [P]

`DEFAULT_CONFIG` do motor, fixa para todas as salas. Mudar regra é mudar o padrão do motor (com deploy). Tempos fixos (§6.1).

### 2.5 Expiração [A]

- **Ociosa:** 30 min sem nenhum jogador conectado (vale no lobby, no meio da partida e depois do fim) → a sala é apagada.
- **Teto:** 24 h depois da criação → a sala é apagada, mesmo no meio de uma partida (registrada no log como abandonada).
- Apagar = fechar os sockets com o código 4000 ("sala encerrada") e chamar `storage.deleteAll()`. Com a data de compatibilidade ≥ 2026-02-24, `deleteAll` também apaga o alarme.
- Uma sala criada em que ninguém chega a conectar expira pela regra de 30 min.

### 2.6 Duas abas com o mesmo token [P]

A conexão nova vence: a antiga é fechada com 4009 ("aberta em outra aba").

---

## 3. API HTTP (Worker)

Todas as rotas ficam sob `/api`. Corpo JSON de até 1 KiB. As rotas que não são `/api` ficam para os assets da interface (sub-projeto 3) e respondem 404 por enquanto.

| Rota | Faz | Respostas |
|---|---|---|
| `POST /api/rooms` `{ nickname }` | cria a sala e ocupa `p1` | 201 `{ code, token, playerId }` · 400 apelido inválido · 429 |
| `POST /api/rooms/:code/join` `{ nickname }` | ocupa o assento livre | 200 `{ token, playerId }` · 404 sala não existe · 409 sala cheia · 429 |
| `GET /api/rooms/:code` | dados públicos para a tela de convite | 200 `{ code, status, nicknames, full }` · 404 |
| `GET /api/rooms/:code/ws` (Upgrade) | abre o WebSocket da sala | 101 sempre que houver `Upgrade`; recusas viram fechamento com código (abaixo) · 426 sem `Upgrade` |
| `GET /api/health` | saúde e versão publicada | 200 `{ ok: true, version }` |

- Sala que não existe: nas rotas HTTP, o objeto responde 404 **sem gravar nada** no storage; no WebSocket, fechamento 4000 (abaixo).
- **Upgrade recusado** [P]: o WebSocket do navegador (e o do Node) não mostra o status HTTP de um upgrade recusado; o cliente veria só 1006 e tentaria de novo para sempre. Por isso o upgrade é sempre aceito e, quando há recusa, fechado na hora com o código da tabela de §4.2: sala inexistente ou apagada → 4000; origem fora da lista → 4003 (o próprio Worker aceita e fecha, sem chegar ao objeto); limite por IP ou sockets demais na sala → 4029. Aceitar um socket não grava nada no storage.
- O Worker conversa com o objeto por RPC (`create`, `join`, `info`) e por `fetch` no upgrade do WebSocket [P].
- Mesma origem que a interface, servida pelo mesmo Worker: sem CORS [A].

---

## 4. Protocolo WebSocket

### 4.1 Transporte e limites

- Frames de **texto** com JSON; frame binário → fechamento 1003.
- Frame de no máximo **4 KiB**; maior → fechamento 1009.
- **Ping:** o cliente manda o texto literal `ping` a cada 15 s. O objeto responde `pong` por auto-resposta (`setWebSocketAutoResponse`), sem acordar da hibernação. A presença usa o instante da última auto-resposta (§7.1).
- No máximo 8 sockets abertos por sala e 4 sem autenticação; acima disso, o socket novo é fechado com 4029 [P].

### 4.2 Autenticação

- A primeira mensagem tem que ser `hello` com o token. Sem `hello` em 10 s → fechamento 4008. Token inválido → fechamento 4003.
- Depois do `hello`, o socket guarda no attachment (`serializeAttachment`) só `{ playerId, connectedAt }`. O `playerId` de cada mensagem vem **daí**, nunca do conteúdo da mensagem.

**Códigos de fechamento** [P] (o cliente decide se reconecta por eles):

| Código | Motivo | O cliente |
|---|---|---|
| 1000 | `leave` do próprio jogador | não reconecta |
| 1003 / 1009 | frame binário / frame maior que 4 KiB | reconecta |
| 1008 | abuso (limite ou mensagens malformadas, §8) | reconecta depois de 30 s |
| 4000 | sala inexistente, expirada ou encerrada | **para** |
| 4001 | protocolo incompatível | **para** e recarrega |
| 4003 | token ou origem inválidos | **para** |
| 4008 | sem `hello` em 10 s | reconecta |
| 4009 | a mesma sessão abriu em outra aba | **para** (senão as duas abas se derrubariam sem fim) |
| 4029 | limite por IP ou sockets demais na sala | reconecta depois de 30 s |

### 4.3 Cliente → servidor

| `t` | Campos | Quando | Efeito |
|---|---|---|---|
| `hello` | `protocol`, `token`, `lastSeq?` | primeira mensagem | autentica; responde `welcome`, `room` e, se houver partida, `state` (§4.7) |
| `ready` | `ready: boolean` | LOBBY | marca ou desmarca o pronto |
| `leave` | — | LOBBY | libera o assento e fecha o socket |
| `act` | `id`, `epoch`, `action`, `auto?` | PLAYING | intenção de jogada (§4.6). `auto: true` marca a jogada que a interface fez sozinha (spec 3 §5), que não zera os estouros (§7.3) |
| `concede` | `id` | PLAYING | desistência: o servidor injeta `FORFEIT { loser: quem pediu }` [A] |
| `rematch` | `want: boolean` | FINISHED | pede ou retira o pedido de revanche |

- `id`: string de 1 a 64 caracteres, única por jogador (ex.: prefixo aleatório da aba + contador).
- `action`: a união `Action` do motor sem `TIMEOUT` e `FORFEIT`. Strings de id de carta com até 32 caracteres; `EQUIP.destinations` com até 16 itens; `PLAY_K.cardIds` com até 8. Campos desconhecidos são rejeitados.

### 4.4 Servidor → cliente

| `t` | Campos | Quando |
|---|---|---|
| `welcome` | `protocol`, `playerId`, `serverNow` | após um `hello` válido |
| `room` | `code`, `status`, `seats[]` (`playerId`, `nickname`, `connected`, `ready`, `wantsRematch`, `woAt?`), `score`, `gameNo`, `outcome?`, `expiresAt` | após o `hello` e a cada mudança de lobby, presença, placar ou fim de partida |
| `state` | `seq`, `epoch`, `view`, `events`, `deadline`, `pausedTurnMs?`, `serverNow`, `catchUp?`, `resync?` | após cada passo aplicado (§5) e na reconexão |
| `ack` | `id`, `ok`, `seq?`, `held?`, `code?`, `message?` | resposta a `act` e `concede` |
| `error` | `code`, `message` | erro fora de uma jogada (mensagem malformada, protocolo incompatível) |

- `view` = `viewFor(estado, quem recebe)`; `events` = `viewEvents(eventos do passo, quem recebe)`. **Nada mais do `GameState` sai do servidor.**
- `deadline` = `{ kind: 'EQUIP' | 'ORDER' | 'TURN' | 'REACTION', at, players }` ou `null`. `at` é o instante (relógio do servidor, em ms) que a interface mostra. `pausedTurnMs` aparece durante uma janela de reação aberta no meio do turno de quem espera (§6.2).
- `serverNow` permite ao cliente estimar a diferença de relógio.
- `outcome` = `{ gameNo, result, cause }`, com `cause` igual a `NORMAL`, `RECONNECT_TIMEOUT`, `AFK`, `CONCEDE` ou `ABANDONED`. O motor só conhece `reason: 'FORFEIT'`; a causa é do servidor. Em `ABANDONED` (§7.2), `result` é `null`: a partida acabou sem resultado.
- `woAt` aparece no assento de quem caiu no meio da partida (§7.2), para a interface mostrar a contagem.

### 4.5 `seq` e `epoch`

- **`seq`:** contador da sala, que só sobe (nunca zera, nem na revanche). Cada passo aplicado (jogada, prazo, passo automático) soma 1. Serve para o cliente ordenar e descartar `state` repetido e para pedir os eventos perdidos.
- **`epoch` (época da fase):** sobe só quando muda a **chave da fase** = `{ round, phase.kind, phase.player | phase.responder, phase.trigger }`. Também só sobe, nunca zera.
  - No **Equipar simultâneo**, a confirmação de um jogador não muda a chave; a do outro continua válida.
  - Na fase principal do turno, as jogadas seguidas do mesmo jogador (J, depois Q) não mudam a chave.
  - Jogar K abre a janela (`REACTION`) e, ao fechar, volta a `ATTACK_MAIN`: a época sobe duas vezes. Uma jogada enviada antes da reação do oponente chega com época velha e é recusada — o jogador decide de novo vendo o que mudou.
- A época é a mesma chave usada nos prazos (§6.4).

### 4.6 Jogada: validação, ordem e idempotência

O servidor trata cada `act` nesta ordem; a primeira falha responde `ack { ok: false, code }` sem mudar nada:

1. Limite por conexão (§8.2) → `RATE_LIMITED`.
2. Esquema (§4.3) → `BAD_MESSAGE`.
3. **Repetida:** se o `id` está entre os últimos 64 do jogador, reenvia o mesmo `ack` guardado e não aplica de novo.
4. Sala fora de `PLAYING` → `NOT_PLAYING`.
5. `epoch` diferente da atual → `STALE_EPOCH`.
6. Passo já guardado nesta janela (§6.3) → `ALREADY_PASSED`.
7. Motor: `applyAction(estado, playerId, action)`; erro → o `code` do motor (`NOT_YOUR_TURN`, `CARD_NOT_IN_HAND`, …).
8. Sucesso → passo aplicado (§5); o `state` vai para os dois e depois o `ack { ok: true, seq }` para quem jogou.

- A ordem entre mensagens de uma conexão é a do WebSocket. Entre as duas conexões, o objeto processa uma entrada por vez (não há concorrência dentro da sala).
- As mensagens de erro do motor falam só da jogada de quem enviou e vão só para ele.

### 4.7 Reconexão e eventos perdidos [A]

- O `hello` leva `lastSeq` (o último `seq` que o cliente aplicou).
- Se a diferença para o `seq` atual for de até **50 passos** e todos estiverem no anel de passos recentes (§9.1), o servidor manda um `state` com o retrato atual e, em `events`, os eventos redigidos de todos os passos perdidos, em ordem, com `catchUp: true`. A interface pode animá-los.
- Senão, manda o retrato com `events: []` e `resync: true`; a interface só redesenha.
- Sem partida (LOBBY), manda só `welcome` e `room`. Em FINISHED, manda também o retrato final.
- O cliente reconecta sozinho, com espera crescente (0,5 s, 1 s, 2 s, 4 s, teto de 5 s, ±20% de variação), e segue a tabela de códigos de §4.2 para parar ou esperar mais.

### 4.8 Versão do protocolo

`PROTOCOL_VERSION = 1` no `@coringa/protocol`. `hello` com outra versão → `error { code: 'PROTOCOL_MISMATCH' }` e fechamento 4001. A interface recarrega a página.

### 4.9 Exemplo

```
cliente p2 → { "t": "act", "id": "k3f-41", "epoch": 18, "action": { "type": "PLAY_K", "cardIds": ["b2-paus-K"] } }
servidor → p1 e p2: { "t": "state", "seq": 133, "epoch": 19, "deadline": { "kind": "REACTION", "at": …, "players": ["p1"] }, "pausedTurnMs": 21400, … }
servidor → p2:      { "t": "ack", "id": "k3f-41", "ok": true, "seq": 133 }
cliente p1 → { "t": "act", "id": "x9a-07", "epoch": 19, "action": { "type": "PASS" } }   (aos 0,6 s da janela)
servidor → p1:      { "t": "ack", "id": "x9a-07", "ok": true, "held": true }
… aos 2 s da janela: passo aplicado; state seq 134, epoch 20, deadline TURN de p2 com 21,4 s
```

---

## 5. Passo do jogo

Um **passo** é uma chamada bem-sucedida de `applyAction`, de um jogador ou do sistema. Todo passo segue o mesmo caminho:

1. Guarda a chave da fase de antes e quem estava para agir (`actingPlayers`).
2. `seq += 1`; recalcula a `epoch` (§4.5).
3. Acrescenta `{ player | 'system', action }` ao registro da partida e os eventos (sem redação) ao anel de passos recentes.
4. Atualiza a contagem de estouros (§7.3).
5. Recalcula os prazos (§6) e o alarme.
6. Se a fase virou `GAME_OVER`: status `FINISHED`, placar, `outcome`, linhas de log (§10.4).
7. Grava tudo de uma vez (§9.1).
8. Manda `state` para cada jogador conectado (com a própria visão e os eventos redigidos) e depois o `ack`, se houver.

**Passos automáticos** (feitos pelo servidor logo depois de um passo, cada um como um passo próprio) [P]:

- **Equipar sem numéricas:** no começo de cada rodada de Equipar, quem recebeu zero numéricas tem `EQUIP { destinations: [] }` aplicado em seu nome. A quantidade de pendentes já é pública (`pendingCount`), então isso não revela nada. Não conta como jogada voluntária nem como estouro.
- **W.O. por 3 estouros:** quando a contagem de alguém chega a 3, `FORFEIT { loser }` (§7.3).

---

## 6. Tempos

### 6.1 `TimerConfig` [D, valores da spec 1 §1.12]

```ts
const TIMERS = {
  equipMs: 40_000, orderMs: 10_000, turnMs: 30_000,
  reactionMs: 8_000, reactionMinMs: 2_000,
  reconnectMs: 60_000, afkStrikes: 3,
  graceMs: 500,            // [P] margem de rede, §6.6
  presenceSweepMs: 20_000, // [P] §7.1
  silentDropMs: 45_000,    // [P] §7.1
  helloTimeoutMs: 10_000,  // [P] §4.2
  idleExpiryMs: 30 * 60_000, hardExpiryMs: 24 * 3_600_000, // [A] §2.5
};
```

Fica no núcleo do servidor, fixo para todas as salas [A]. O motor continua sem relógio.

### 6.2 Prazo de cada fase

| Fase | Prazo ao entrar | Estouro injeta `TIMEOUT` e o motor faz |
|---|---|---|
| `EQUIP` | 40 s | numéricas restantes na fileira com menos cartas (spec 1 §1.12) |
| `ORDER_CHOICE` | 10 s | ataca primeiro |
| `ATTACK_MAIN` | 30 s **por turno** | declara o ataque (ou encerra, com Ataque vazio) |
| `REACTION` | 8 s | passa |

- **O turno pausa durante a janela do oponente** [A]. Quando o dono do turno joga K ou Reflect e a janela abre, o servidor guarda o que sobrou do turno (`prazo − agora`). Quando a janela fecha e o turno do mesmo jogador continua (o passo não tem evento `TurnStarted`), o novo prazo é `agora + o que sobrou`. Sem piso: quem jogou K com 0,3 s restante volta com 0,3 s [P].
- Turno novo (evento `TurnStarted`) começa com 30 s cheios.
- O relógio **não pausa** quando alguém cai [A] (§7.2).

### 6.3 Janela de reação: duração mínima [A]

Leitura aprovada de "8 s (mínimo 2 s)":

- A janela fica aberta por até 8 s.
- Respostas que revelam a carta (A, anular, proteger) valem **na hora**. O A não fecha a janela (o motor permite várias respostas); anular e proteger fecham.
- Um **PASS** que chega antes de 2 s desde a abertura **fica guardado**: o servidor responde `ack { ok: true, held: true }` e aplica o PASS quando os 2 s vencem. Depois de um PASS guardado, outra jogada do respondente nesta janela recebe `ALREADY_PASSED`.
- O servidor **nunca passa sozinho** com base na mão do respondente. A janela fecha por PASS (respeitado o piso) ou por estouro.
- Efeito: de fora, uma janela fechada "na hora" e uma sem resposta possível ficam iguais (mínimo 2 s). Se a interface vai oferecer passe automático é decisão do sub-projeto 3, e ela deve respeitar o mesmo piso.

### 6.4 `TIMEOUT` sem fase: a pendência [D]

O `TIMEOUT` do motor não diz a que fase se refere; um alarme atrasado poderia virar jogada na fase seguinte. Regra:

- Todo prazo de fase é guardado com a `epoch` em que foi criado.
- Ao vencer, o servidor compara com a `epoch` atual: **diferente → descarta** (prazo obsoleto, sem efeito e sem log de erro); igual → injeta `applyAction(estado, 'system', { type: 'TIMEOUT' })` como um passo.
- O PASS guardado (§6.3) usa a mesma checagem.
- Teste de regressão obrigatório: um alarme que dispara depois que a fase mudou não altera nada (§11.2).

### 6.5 Agenda de prazos (alarme único)

Um Durable Object tem **um alarme só**. O núcleo mantém uma agenda persistida e programa o alarme para o item mais cedo:

| Tipo | Chave de validade | Ao vencer |
|---|---|---|
| `phase` | `epoch` | `TIMEOUT` (§6.4) |
| `reactionMin` | `epoch` | aplica o PASS guardado |
| `reconnect` | `playerId` + `gameNo` | W.O. se o jogador ainda estiver fora (§7.2) |
| `presenceSweep` | `gameNo` | varredura de presença (§7.1); existe **só em PLAYING** |
| `idleExpiry` | instante em que o último jogador saiu | apaga a sala (§2.5) |
| `hardExpiry` | — | apaga a sala (§2.5) |

- O alarme pode atrasar e pode ser repetido (a plataforma tenta de novo se o handler lançar erro). Por isso o handler sempre recarrega o estado, processa em ordem de instante **todos** os itens vencidos, confere cada chave, ignora os obsoletos e reprograma o alarme.
- Só reprograma quando o item mais cedo mudou (cada `setAlarm` custa uma linha gravada).

### 6.6 Margem de rede [P]

O `deadline.at` enviado é o que a interface mostra; o servidor só injeta o `TIMEOUT` em `at + 500 ms`. Uma jogada feita no último instante, com atraso de rede, ainda vale.

---

## 7. Presença, reconexão e W.O.

### 7.1 Presença [P]

- O jogador está **conectado** se tem um socket autenticado aberto e com sinal recente (mensagem ou ping respondido há no máximo 45 s).
- **A presença vem dos sockets vivos** (`ctx.getWebSockets()` e o attachment de cada um), nunca de uma marca gravada. Um deploy ou reinício derruba os sockets sem entregar `webSocketClose` ao objeto novo. Por isso, ao acordar, o objeto confere os assentos contra os sockets que existem de fato: quem está marcado como presente sem socket vivo passa a estar fora desde agora, com o prazo de W.O. correndo.
- Queda limpa (aba fechada, rede derrubada com aviso): `webSocketClose`/`webSocketError` marca a saída na hora.
- Queda silenciosa (troca de rede no celular), **só durante PLAYING**: a varredura a cada 20 s fecha sockets sem sinal há mais de 45 s, e a saída conta a partir do último sinal. Fora de partida não há varredura: uma aba esquecida aberta no lobby ou no fim não acorda o objeto (o ping é auto-respondido) e não gasta a cota de §9.4.
- Fora de PLAYING, a mesma conferência de sinal é feita **na hora de começar** uma partida ou uma revanche: se o sinal de alguém tem mais de 45 s, esse socket é fechado, o pronto ou o pedido de revanche cai e a partida não começa.
- Sockets que não mandaram `hello` em 10 s são fechados (4008) na varredura ou na chegada de um socket novo, o que vier primeiro.
- Toda mudança de presença gera um `room` para quem está conectado.

### 7.2 Queda no meio da partida [D + A]

- O relógio do jogo **continua** [A]: as fases de quem caiu estouram com a jogada automática.
- Ao cair, o assento ganha `woAt = saída + 60 s` e um prazo `reconnect`. Voltar antes (um `hello` válido) cancela.
- Ao vencer, ainda fora e com a mesma partida (`gameNo`) em curso → `FORFEIT { loser }`, `cause: 'RECONNECT_TIMEOUT'`.
- **Os dois fora** [P]: W.O. — por reconexão ou por estouros (§7.3) — só vale se o **outro** jogador estiver conectado naquele momento. Se, ao vencer um prazo de W.O., os dois estiverem fora, a partida é **abandonada**: status `FINISHED`, `outcome { result: null, cause: 'ABANDONED' }`, placar sem mudança, revanche possível. Isso resolve o caso de deploy, em que os dois caem no mesmo instante e nenhuma regra de "quem passou primeiro" seria justa. O abandono não é ação do motor: o estado final é o último estado do motor, e o registro da partida termina sem `GAME_OVER`.
- **Deploy** derruba todos os WebSockets: os clientes reconectam sozinhos em segundos (§4.7). É o caminho normal, não exceção.

### 7.3 Três turnos estourados seguidos [A]

- Contador por jogador, zerado no começo de cada partida.
- **Soma 1:** estouro do Equipar com o jogador ainda sem confirmar (e com numéricas pendentes); estouro do Turno de ataque do jogador.
- **Não conta:** estouro da Escolha da ordem (a interface vem com "atacar primeiro" pré-selecionado e deixar o tempo acabar é normal, spec 1 §3) e estouro da janela de reação.
- **Zera:** qualquer jogada voluntária aceita daquele jogador, em qualquer fase (inclusive PASS).
- **Não zera** (acrescentado em 2026-10-17 pela spec 3 §5): jogada com `auto: true`, como o passe automático da janela de reação e a confirmação automática da Escolha da ordem. Vale também para o PASS guardado (§6.3): o registro guarda a marca, e o PASS aplicado pelo alarme `reactionMin` só zera a contagem se não era `auto`.
- Chegou a 3 → `FORFEIT { loser }`, `cause: 'AFK'`, como passo automático (com o outro fora, abandono, §7.2).
- Com o relógio correndo durante a queda, uma queda de 60 s no próprio turno costuma somar 1 ou 2 estouros antes do W.O. por reconexão; vale o que chegar primeiro.

### 7.4 Desistência [A]

`concede` → `FORFEIT { loser: quem pediu }`, `cause: 'CONCEDE'`. Só o próprio jogador desiste por si.

---

## 8. Segurança

### 8.1 Validação

- Esquemas estritos (Zod 4, `strictObject`) para toda mensagem do cliente e todo corpo HTTP; limites de tamanho de §4.1, §4.3 e §3.
- O motor valida a regra; o esquema valida a forma. Mensagem que não passa no esquema nunca chega ao motor.
- Mais de 20 mensagens malformadas numa conexão → fechamento 1008 [P].

### 8.2 Limite de frequência [P]

- **Por conexão** (no objeto, em memória): balde de 20 mensagens, reposto a 10 por segundo. Mensagem acima do limite → `ack`/`error` com `RATE_LIMITED`, sem processar; mais de 100 descartes → fechamento 1008. O ping com auto-resposta não chega ao objeto e não conta. Se o objeto hibernar, o balde recomeça cheio, o que é aceitável: só hiberna quem não está mandando nada.
- **Por IP** (no Worker, binding de Rate Limiting da Cloudflare, janela de 60 s): criar sala 10/min; entrar, consultar e abrir WebSocket 60/min. O binding é simulado no `wrangler dev`. Conferir na implementação se ele está disponível no plano Free; se não estiver, fica sem limite por IP, só com os limites por sala e por conexão.

### 8.3 Ninguém age pelo outro

- O `playerId` vem do socket autenticado (§4.2), nunca da mensagem.
- `TIMEOUT` e `FORFEIT` não existem no esquema do cliente; só o servidor os injeta. `concede` só gera `FORFEIT` de quem pediu.
- O motor ainda confere de quem é a vez (`NOT_YOUR_TURN`).

### 8.4 Nada de informação oculta no fio

- Para o jogador X sai só: `viewFor(estado, X)`, `viewEvents(eventos, X)`, dados públicos da sala e respostas às mensagens do próprio X.
- A semente é gerada no objeto (`crypto.getRandomValues`, 128 bits) e não aparece em nenhuma mensagem.
- Tempo: piso de 2 s na janela de reação (§6.3); o servidor não passa sozinho; o Equipar automático só acontece quando a quantidade já é pública.
- **Erros não viram oráculo:** a resposta a uma jogada recusada depende só da mão de X, do cemitério e do campo público. Isso já vale no motor hoje (os erros só consultam a mão de quem joga, o cemitério e o campo do oponente). A mensagem de erro pode repetir o id que o próprio X enviou.
- Testes obrigatórios (§11.3) [P]:
  - todo `state` para X traz `view` igual a `viewFor(estado, X)` e `events` igual a `viewEvents(eventos do passo, X)` (no `catchUp`, a concatenação dos passos perdidos), e nenhuma mensagem tem outro dado do jogo nem a semente;
  - os invariantes do motor já garantem que `viewFor` e `viewEvents` não expõem mão, pendentes, monte nem semente.

  Um teste do tipo "nenhum id escondido no fio" não serve. Uma carta mostrada em público (descartada no Equipar, removida da fileira) pode voltar ao monte e ser comprada pelo oponente **no mesmo passo**, quando o monte acaba, e então seu id aparece de forma legítima num evento.

### 8.5 Token e origem

- Token só no corpo da resposta HTTP e na primeira mensagem do WebSocket; no objeto, só o hash.
- Upgrade com cabeçalho `Origin` fora da lista `ALLOWED_ORIGINS` (variável do Worker: o domínio publicado e `http://localhost:*`) → fechamento 4003 logo depois de aceitar (§3). Sem `Origin` (cliente de terminal) é aceito: a proteção contra sequestro de WebSocket entre sites só importa para navegadores, que sempre mandam `Origin`.

### 8.6 Logs

- Nunca registrar token, mão, visão, pendentes nem apelido.
- **Exceção aprovada** [A]: depois do fim da partida (`GAME_OVER` ou abandono), uma linha `game.replay` com semente e passos, só nos logs da conta Cloudflare do autor, para reproduzir bugs (§10.4).

---

## 9. Persistência

### 9.1 O que se grava e quando

Durable Object com **backend SQLite** (o único disponível no plano Free; migração `new_sqlite_classes`). API de chave-valor do storage; o layout exato das chaves fica para o plano. Conteúdo:

- **Sala:** versão do esquema, código, criação, status, assentos (`playerId`, apelido, hash do token, pronto, pedido de revanche, saída/`woAt`), placar, `gameNo`, último `outcome`.
- **Partida:** semente, `GameState`, `seq`, `epoch`, prazo de turno pausado, PASS guardado, contador de estouros, últimos 64 `id` de jogada por jogador com o `ack` de cada.
- **Registro da partida:** passos `{ player | 'system', action }` desde o início (para o `game.replay` e para reexecutar no motor).
- **Anel de passos recentes:** os eventos sem redação dos últimos 50 passos, com o `seq` de cada (§4.7).
- **Agenda de prazos** (§6.5).

Regras:

- Cada passo grava tudo o que mudou **numa única operação** (gravação de várias chaves de uma vez).
- O *output gate* do Durable Object segura os `ws.send` até a gravação confirmar: nenhum cliente vê um estado que não foi salvo.
- Cada entrada é processada de forma síncrona, do começo ao fim, sem `await` no meio da lógica: nada se intercala com outro evento da sala.

### 9.2 Hibernação

A hibernação apaga a memória do objeto. Ao acordar (mensagem, fechamento, alarme), o objeto recarrega a sala do storage e reconstrói a presença a partir dos sockets vivos (§7.1) antes de entregar a entrada ao núcleo. O attachment do socket guarda só `playerId` e `connectedAt` (limite de 16 KiB).

### 9.3 Esquema e deploys [P]

- O registro da sala leva `schema` (constante `STATE_SCHEMA = 1` do servidor). Ela sobe quando muda a forma do `GameState` ou o significado das regras de um jeito que estado antigo não sirva.
- Ao carregar uma sala com `schema` diferente: encerra a sala (fechamento 4000, `room.reset` no log) em vez de tentar continuar. Para um jogo entre amigos, perder uma partida em andamento num deploy de regra é aceitável. O ideal é publicar sem partidas em curso.
- Deploy sem mudança de esquema: as partidas continuam depois da reconexão automática.

### 9.4 Custos no plano Free

- O limite que pesa é o de **linhas gravadas: 100 mil por dia**. Cada `put` de chave e cada `setAlarm` contam uma linha.
- Estimativa: ~150 passos por partida (mediana de 9 rodadas de Ataque) × ~3 linhas + varreduras ≈ **500 linhas por partida → ~200 partidas por dia** (a medida abaixo corrige o ~3 para ~6 linhas por passo). Para um grupo de amigos sobra muito.
- Fora de partida o objeto não programa alarmes além dos de expiração (§6.5, §7.1). Uma aba esquecida aberta no lobby não gasta linhas.
- **Medido em 2026-10-17** (teste de propriedades do núcleo, fórmula `4 × gravações + mudanças de alarme`, porque cada gravação reescreve as quatro chaves):
  - greedy × greedy: **388 linhas por partida** (62 passos, 85 gravações, 48 alarmes); em outras cinco sementes, de 299 a 622 (47 a 102 passos);
  - turtle × turtle, a partida mais longa: 713 a 1273 linhas (117 a 211 passos);
  - ~**6 linhas por passo**, o dobro dos ~3 da estimativa acima;
  - maior parte gravada (`maxPartBytes`): 18 280 bytes, contra o limite de 100 KiB por valor; a parte que cresce é o log de passos.
- **A medida é um mínimo.** Ela roda no ritmo de bot (`thinkMs` 300 ms por jogada): ~1 varredura de presença por partida. No ritmo humano, cada varredura de 20 s grava mais **~5 linhas** (as quatro chaves e o `setAlarm` da próxima). Uma partida de 15 min soma ~45 varreduras, ~225 linhas: a típica vai de 388 para ~610.
- Resultado no plano Free (100 mil linhas por dia): **~250 partidas por dia** na partida típica no ritmo de bot (388 linhas), **~160** na de 622 ou na típica de 15 min no ritmo humano (~610) e **~80** se todas fossem a turtle longa (1273). A faixa realista é de **80 a 250 partidas por dia**, ainda de sobra para um grupo de amigos. A casca de hoje (`room.ts`) regrava as quatro chaves em cada persistência, então a fórmula é o custo real; gravar só as chaves que mudaram seria uma otimização futura.
- **A outra cota a observar** na primeira partida online é a de **duração: 13 000 GB-s por dia** no plano Free. Ela conta o tempo em que o objeto fica acordado (a hibernação dos WebSockets, §9.2, é o que a mantém baixa). Confira no painel depois da primeira partida publicada.
- **CPU por entrada** (medido em 2026-10-17 no Node 24, partida greedy × greedy pelo `Harness`): `onMessage` e `onAlarm` gastam em média 0,2 a 0,4 ms, p95 até ~1,5 ms e máximo de ~3,6 ms (na primeira partida do processo, com o JIT frio). Com a parte da casca que é CPU (`splitRecord` e `JSON.stringify` das partes e dos envios, ~0,1 ms em média), fica bem abaixo dos ~10 ms por invocação que o plano Free pode impor. Não entram as chamadas de storage e de socket do runtime.

---

## 10. Ambiente local, deploy e observabilidade

### 10.1 Local

- `pnpm dev:server` → `wrangler dev` em `http://localhost:8787`. O objeto, o storage (em `.wrangler/state`, no `.gitignore`) e o rate limit rodam localmente.
- Configuração em `packages/server/wrangler.jsonc` (ou no formato que o wrangler recomendar na implementação):
  - nome `jogo-do-coringa`;
  - binding do objeto `ROOMS` → classe `Room`, com a migração `v1` (`new_sqlite_classes`);
  - dois bindings de rate limit (`namespace_id` distintos);
  - `observability.enabled: true`;
  - `vars.ALLOWED_ORIGINS`;
  - `compatibility_date` ≥ 2026-04-07, que inclui `deleteAll` apagando o alarme e a auto-resposta ao fechamento do WebSocket.
- O pnpm 11 recusa scripts de instalação não revisados (`allowBuilds` no `pnpm-workspace.yaml`). O `workerd` e o `esbuild` (dependências do wrangler) vão precisar ser liberados lá depois de revisados.
- O nome do script de publicação **não pode ser `deploy`**: `pnpm deploy` é comando do próprio pnpm. Use `deploy:server`.

### 10.2 Cliente de terminal e bot [A]

- **`pnpm play --online [alvo]`**:
  - sem alvo, ou com a URL do servidor: cria uma sala e mostra o código e o link;
  - com o código ou o link: entra na sala.

  Pede o apelido (ou `--apelido`) e reaproveita a mesa, os textos e as perguntas do `pnpm play`. Mostra os segundos restantes de cada prazo. Quando a fase muda por estouro ou pela jogada do outro, a pergunta pendente é cancelada (`AbortSignal` no readline) e a mesa é redesenhada. No fim, oferece revanche.
- **`pnpm bot --online <código|link> [--bot greedy]`**: entra na sala, marca pronto, joga com um bot do simulador (com uma pausa curta de "pensando" para dar para acompanhar) e aceita a revanche que o oponente pede (nunca pede primeiro: dois bots na mesma sala não se pedem revanche para sempre).
- Servidor padrão: `--servidor` ou a variável `CORINGA_SERVIDOR`; senão `http://localhost:8787`. O link (`https://host/s/CÓDIGO`) já carrega a origem.
- Os dois usam o `RoomClient` do `@coringa/protocol` e o `WebSocket` global do Node 24.
- Uso típico: dois terminais (ou um terminal e o bot) contra o `wrangler dev`; depois, o mesmo contra o endereço publicado.

### 10.3 Deploy [A]

Passos do autor (credenciais nunca passam pelos agentes):

1. Criar a conta Cloudflare (plano Free basta) e rodar `pnpm --filter @coringa/server exec wrangler login` uma vez.
2. `pnpm deploy:server` → roda o `pnpm check` e depois `wrangler deploy`. Publica em `https://jogo-do-coringa.<subdomínio>.workers.dev`.
3. Se algo der errado: `wrangler rollback`.

- A versão publicada (hash do commit) vai para `/api/health`, injetada no deploy.
- Deploy automático pela CI fica para depois, com um token criado pelo autor como segredo do GitHub.
- A interface (sub-projeto 3) será servida pelo mesmo Worker (static assets), na mesma origem.

### 10.4 Observabilidade [P]

- Workers Logs ligado (`observability.enabled`). `wrangler tail` para acompanhar ao vivo.
- Uma linha JSON por fato, sem dado sensível (§8.6):

| `evt` | Campos |
|---|---|
| `room.created` / `room.joined` | `code`, `playerId` |
| `game.started` | `code`, `gameNo` |
| `game.ended` | `code`, `gameNo`, `result`, `cause` (inclusive `ABANDONED`), `rounds`, `durationMs`, `steps` |
| `game.replay` | `code`, `gameNo`, `replay` (formato `Replay` do simulador, `packages/sim/src/replay.ts`: `name`, `config`, `seed`, `players`, `steps`) [A]; também depois de um abandono |
| `player.disconnected` / `player.reconnected` | `code`, `playerId`, `gameNo` |
| `wo.applied` | `code`, `gameNo`, `loser`, `cause` |
| `room.expired` / `room.reset` | `code`, `status`, `reason` |
| `protocol.violation` | `code`, `kind` (malformada, limite, origem), agregado por conexão |
| `error` | `code`, mensagem e pilha de exceções inesperadas |

- Para reproduzir um bug, o autor copia o `replay` da linha de log para um arquivo e o reexecuta no motor. Se ainda não houver um comando para reexecutar um arquivo `Replay`, o plano inclui um pequeno (`pnpm sim:replay <arquivo>`).

---

## 11. Testes

### 11.1 Camadas

| Camada | Onde roda | Cobertura | No `pnpm check` |
|---|---|---|---|
| `@coringa/protocol` (esquemas, código/link, `RoomClient` com WebSocket falso) | Vitest no Node | v8, ≥ 90% de linhas e branches | sim |
| Núcleo do servidor (`src/core`) | Vitest no Node, relógio falso | v8, ≥ 90% de linhas e branches | sim |
| Casca (Worker + DO) | Vitest no workerd (`@cloudflare/vitest-plugin`, que aceita Vitest 5) | sem meta (o workerd não tem cobertura v8, só Istanbul) | sim |
| Smoke | Node puro, sem bundler | — | sim |
| Cliente de terminal e bot (`packages/sim`) | Vitest no Node, servidor falso roteirizado | metas atuais do sim | sim |
| Ponta a ponta manual | dois terminais contra `wrangler dev` e contra o publicado | — | não |

O `test:coverage` do servidor roda o projeto do Node com cobertura e o do workerd sem.

### 11.2 Casos obrigatórios (núcleo, salvo indicação)

- **Sala:** criar, entrar, sala cheia, sala inexistente sem gravação, `leave`, pronto e desmarcar ao cair, começo só com os dois conectados e prontos, revanche (com semente nova e placar), expiração ociosa e de teto.
- **Protocolo:**
  - `hello` primeiro e sua expiração;
  - token inválido;
  - versão incompatível;
  - esquema (campos extras, tamanhos, tipos, `TIMEOUT`/`FORFEIT` vindos do cliente);
  - repetida pelo `id` (mesmo `ack`, sem reaplicar);
  - `STALE_EPOCH`, `NOT_PLAYING`, `ALREADY_PASSED`;
  - erro do motor repassado só a quem jogou;
  - limite por conexão.
- **Época:** a confirmação de Equipar de um não invalida a do outro; a jogada enviada antes de uma reação é recusada depois dela.
- **Tempos:**
  - cada fase estoura com o efeito da tabela §6.2;
  - **alarme atrasado depois da troca de fase não muda nada** (a pendência);
  - alarme repetido não aplica duas vezes;
  - o turno pausa e retoma em volta da janela de K e de Reflect;
  - turno novo começa cheio;
  - PASS antes de 2 s fica guardado e é aplicado aos 2 s;
  - A antes de 2 s vale na hora;
  - jogada dentro da margem de rede vale.
- **Presença e W.O.:**
  - volta aos 59 s cancela o W.O.;
  - aos 60 s, W.O. com `RECONNECT_TIMEOUT`;
  - os dois fora → abandono, sem mudar o placar;
  - queda silenciosa detectada pela varredura (só em PLAYING);
  - conferência de sinal ao começar a partida e a revanche;
  - presença reconstruída a partir dos sockets vivos depois de um reinício (assento marcado como presente sem socket passa a estar fora);
  - segunda aba derruba a primeira.
- **Estouros:** três seguidos misturando Equipar e Turno → W.O. com `AFK`; jogada voluntária zera; Escolha da ordem e janela de reação não contam; Equipar automático (sem numéricas) não conta.
- **Desistência.**
- **Reconexão:** buraco ≤ 50 passos → eventos redigidos em ordem (`catchUp`); maior → `resync`.
- **Casca (workerd):**
  - rotas HTTP e códigos de resposta;
  - upgrade recusado chega ao cliente como fechamento 4000, 4003 ou 4029 (nunca só 1006);
  - origem;
  - dois WebSockets jogando alguns passos;
  - hibernação no meio da partida (`evictAllDurableObjects`) sem perder nada;
  - alarme disparado por `runDurableObjectAlarm` aplicando o estouro;
  - expiração com `deleteAll`;
  - auto-resposta do ping.

### 11.3 Propriedades (núcleo, partidas com bots do simulador)

Partidas completas entre dois clientes simulados que conversam com o núcleo por JSON de verdade (serializa e valida). Um relógio falso avança até o próximo alarme quando ninguém age. Há variações com quedas e voltas aleatórias, jogadas atrasadas (época velha) e mensagens repetidas. Em todas:

- toda partida termina (fim no motor ou abandono);
- **o que vai para X é exatamente a redação do motor** (§8.4): `view` = `viewFor(estado, X)`, `events` = `viewEvents(…, X)`, e a semente não aparece em nenhuma mensagem;
- **erro sem oráculo:** uma jogada de X que cita um id escondido de X (na mão do oponente, nas pendentes ou no monte) recebe o mesmo código de um id inexistente;
- reexecutar no motor o registro da partida (semente + passos) dá o mesmo estado final (o servidor não desvia o motor);
- nenhum `TIMEOUT` injetado é recusado pelo motor;
- `seq` e `epoch` nunca decrescem para um cliente (uma reconexão sem passos perdidos repete o `seq` atual).

### 11.4 Smoke e tempo do check

- Smoke no Node puro: carrega o protocolo e o núcleo sem bundler e joga uma partida curta pelo núcleo. Mais `wrangler deploy --dry-run --outdir <temporária>`, que empacota o Worker sem login, para pegar erro de bundle.
- O `pnpm check` vai ficar mais lento com o workerd. Hoje ele leva ~30 s (medido em 2026-10-16), então sobram uns 15 s. O plano mede o tempo. Se passar de ~45 s, vale a regra do `CLAUDE.md`: o pre-commit vira a versão rápida e o pre-push mantém o check completo.

---

## 12. Critérios de pronto (sub-projeto 2)

1. `pnpm check` verde, na máquina e na CI, com as camadas de §11.
2. O autor jogou uma partida completa pelo `wrangler dev` (dois terminais ou terminal contra bot), incluindo uma queda e volta no meio.
3. O autor publicou (`pnpm deploy:server`) e jogou ao menos uma partida contra o endereço publicado.
4. Linhas de log de §10.4 visíveis no painel ou no `wrangler tail` durante essa partida.
5. Número de linhas gravadas por partida medido e registrado em §9.4.

## 13. Fica para quem constrói

- Layout das chaves no storage e uso da API síncrona ou assíncrona de chave-valor (respeitando §9.1).
- Formato exato do `wrangler` e da geração de tipos dos bindings.
- Detalhes do `RoomClient` além de §4.7 (API, eventos que expõe).
- Organização interna do núcleo e dos testes, mantendo o núcleo sem `cloudflare:*`.
- Dica de localização do objeto (`locationHint`): opcional.

## 14. Ligação com os outros sub-projetos

- **Sub-projeto 3 (interface)** recebe: o `RoomClient`, os tipos do protocolo, `deadline` + `serverNow` para os contadores, `catchUp` para animar os eventos perdidos, `room` para lobby, presença e placar, e a rota `/s/<CÓDIGO>`. Fica com ela decidir sobre o passe automático na janela de reação, respeitando o piso de 2 s.
- **Sub-projeto 4 (polimento)** pode usar o `game.replay` para histórico; jogar solo contra bot continua fora deste servidor.
