# Decks e raças do Coringa, fatia 3: o online — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **De onde vem este plano:** escrito no Claude Code, no checkout principal, com o código da `main` em `b6c2caf` (as fatias 1 e 2
> inteiras), na branch `feat/decks-fatia-3`. Os nomes de arquivo, de função e de teste foram lidos do código. **Esperando a aprovação do
> autor**, com as escolhas H1 a H7 abaixo; nada de código antes dela.

**Goal:** na sala online, cada lado da mesa veste a aparência do dono:
- **Quem cria a sala ou entra nela leva a sua aparência** (a das preferências), e o servidor a guarda no assento.
- **A mensagem `room` traz a aparência de cada assento.** As duas telas vestem cada lado com a do dono, e a sua também vem do assento: é
  a que o outro vê.
- **A aparência da sala fica fixa:** mudar a preferência com a sala aberta não muda a mesa.
- **A partida online guardada leva as aparências**, e o replay as mostra (como o do treino, desde a fatia 2).
- **O Cordel não muda:** quem está no padrão não manda nada, o servidor não grava nada, e a mensagem fica a de hoje.

**Architecture:**
- **Um campo opcional, como o `hp` da sala.** O protocolo ganha `SeatInfo.look?` e o `look?` nos corpos de criar e de entrar; o cliente
  só põe a chave no corpo quando a recebe. Nada sobe de versão (spec §8.4).
- **O servidor normaliza no núcleo.** O roteador só confere a forma (dois textos curtos); o `room-core` grava `normalizeLook(look)` no
  assento, e id desconhecido vira o padrão, sem erro. É o lugar da conferência de posse da loja, mais tarde (§8.2). O `roomMessage`
  copia a aparência do assento.
- **A web lê os assentos.** Um modelo puro (`roomLooks`) tira as duas aparências do `room.seats`; a `PlayTable` o usa no online, no lugar
  da preferência. O provedor, o `LookZone` e a carta não mudam: a fatia 2 já veste cada lado pelos `owners`.
- **Os pacotes vêm cedo.** A tela da sala pede os pacotes das duas aparências assim que a mensagem `room` as traz (ainda no lobby), para
  a mesa não nascer em Cordel.

**Tech Stack:** TypeScript no Node 24 (protocolo, núcleo do servidor), Zod (só no servidor, `@coringa/protocol/schemas`), Cloudflare
Workers com Durable Objects (os testes do `worker` no pool do workerd), React 19, Tailwind 4, Vitest, Playwright. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-10-decks-e-racas-design.md` §8 (o online), §6 (o menu na sala), §7.3 (o replay online), §10, §11
(a fatia 3) e §14; a §15 e a §16 (o que as fatias 1 e 2 decidiram). As decisões: `decisoes.md` 2026-11-10 (2), 2026-11-11 (1) a (3) e
2026-11-12 (1). O que a fatia 2 deixou: `diario.md` 2026-11-12 (2).

## O que este plano não traz

- **A Devastação no celular** (46 e 47 quadros/s com arte, contra 55 do Cordel): segue esperando a decisão do autor (`estado.md`). Esta
  fatia não põe arte nova na mesa: a mesa online com dois decks é a mesma do treino com dois decks.
- **A loja e a posse** (spec §12): o servidor só confere que o id existe.
- **Trocar de aparência no meio de uma partida online** (spec §12) e mostrar a aparência do outro no lobby (a spec não pede).
- **O tutorial** segue em Cordel (§7.2).

## Escolhas do plano (para o autor aprovar)

- **H1. O que vai pelo fio com a aparência padrão.**
  - **Recomendo:** quem está no padrão (o Cordel, que sempre anda com o Bufão) não manda o campo. O servidor só grava a aparência quando o
    corpo a traz (normalizada), e a mensagem `room` só a devolve para o assento que a tem; a web lê o assento sem ela como o padrão.
  - **Por quê:** é a §8.4 ao pé da letra (tudo opcional). Com o padrão, o pedido, o registro da sala e a mensagem ficam iguais aos de hoje, e
    os testes de hoje que conferem o corpo exato do POST (`client.test.ts`), o assento gravado e o da mensagem (`room.test.ts`, com
    `toEqual`) e as chamadas da `RoomApi` (`home.test.tsx`, `room-gate.test.tsx`) seguem verdes sem mudar.
  - **O que afina na spec:** a §8.2 diz "o núcleo grava `normalizeLook(body.look)`"; fica "grava quando o corpo trouxe".
  - **Alternativa:** mandar e gravar sempre (o padrão explícito em toda sala), mudando esses testes.
- **H2. A sua aparência na sala vem do assento** (a spec já diz, §8.3; é o item 4 das "Escolhas minhas" da §13): a mesa usa a que você
  tinha ao criar ou entrar, também no seu lado, e a preferência mudada depois (no Início, noutra aba) não vale para a sala aberta. A
  revanche mantém os assentos, logo as aparências; recarregar a página com o assento salvo não faz um novo `join` e também as mantém.
  **Recomendo confirmar.**
- **H3. O menu da partida online.**
  - **O conflito:** a §6 pede o painel "apagado", com a frase "a aparência da sala é a que você tinha ao entrar"; a F1 da fatia 1 tirou o
    painel do online, e um teste confere isso (`end-and-menu.test.tsx`, "na sala online, o menu não mostra o seletor…").
  - **Recomendo:** sem o seletor (como hoje), com uma linha no lugar dele: **"A aparência desta sala é a que você tinha ao entrar."** Um
    grupo de opções desabilitado é pior no teclado e no leitor de tela (o foco para em algo que não responde), e a linha diz o mesmo. O
    teste de hoje segue verde (ele só confere que o grupo "Deck" não aparece).
  - **Alternativa:** o painel apagado da §6, ou nenhuma linha (a F1 como está).
- **H4. A nota do Início.** A linha "Por enquanto vale no treino." (`LOOK_TRAINING_ONLY`), embaixo do painel "Aparência", deixa de ser
  verdade. **Recomendo:** **"Na sala online, vale a que você tinha ao entrar."** O teste do Início que confere a nota
  (`home.test.tsx`, "o painel Aparência…") muda por desenho: passa a conferir a frase nova. **Alternativa:** tirar a nota, ou outra frase.
- **H5. A partida online guardada.**
  - **O conflito:** a G4 da fatia 2 deixou o online sem `looks`; a §7.3 manda o replay online usar o que a mensagem `room` trazia no fim da
    partida.
  - **Recomendo:** a linha online leva `looks: { me, opponent }` dos assentos do `room` do fim (normalizados), **só quando algum dos dois
    não é o padrão**: a mesma regra do treino, onde o Cordel não grava. Com os dois em Cordel, a linha fica a de hoje (o teste da fatia 2
    que confere a online sem `looks` segue verde), e o replay a abre em Cordel. O replay já veste as gravadas (G3).
- **H6. Sem medição nova.** A mesa online desenha os mesmos componentes da mesa do treino com dois decks, que a G7 mediu na fatia 2 (a
  `exodia-devastacao` com `looks` gravado); só muda de onde vêm as aparências. O smoke confere o orçamento. **Recomendo** assim.
  **Alternativa:** medir duas abas online (o `medir-cena.ts` só abre replays; seria ferramenta nova).
- **H7. A execução.** No Claude Code local, com o Opus 5.5, tarefa por tarefa, teste primeiro, na branch `feat/decks-fatia-3` (já aberta,
  com este plano); no fim, um revisor novo, num subagente, lendo a branch inteira, como nas fatias 1 e 2. **Recomendo** assim.

**O deploy, depois do merge** (é do autor): o `STATE_SCHEMA` não sobe, então o deploy **não** fecha as salas abertas; elas seguem sem
`look`, em Cordel. A página aberta antes do deploy (o JavaScript antigo) não manda o campo e fica em Cordel. O contrário (o cliente novo
contra o servidor antigo, que recusaria o campo novo com 400) não acontece: o Worker serve a interface, e os dois saem do mesmo deploy.

## Global Constraints

- **O Cordel não muda (H1):** com a aparência padrão, o corpo do POST, o assento gravado e a mensagem `room` são os de hoje, e nenhum teste
  existente muda, menos os dois por desenho: o da nota do Início (H4) e o do `NicknameBodySchema`, que passa a ser do `JoinRoomBodySchema`
  (Task 1). Qualquer outro teste que precise mudar: para e pergunta.
- **Nenhum código de erro novo** (§8.2): id de deck ou de raça desconhecido não é erro, vira o padrão. O `look` fora da forma (de outro tipo,
  sem um dos dois campos, com campo a mais, com texto de mais de 32 caracteres) é corpo fora do esquema: **400 `BAD_NICKNAME`**, como hoje
  o `hp` de outro tipo (o `readCreate` trata qualquer falha de esquema assim). A web nunca manda um desses.
- **Nada sobe de versão:** `RULES_VERSION`, `STATE_SCHEMA` (6) e `PROTOCOL_VERSION` ficam como estão (§8.4); nenhuma partida de referência
  muda. Se aparecer um motivo para subir um deles, para e pergunta.
- **O núcleo é puro** (`src/core`, nada de `cloudflare:*`): a normalização mora nele, não no roteador. O Zod só no servidor
  (`@coringa/protocol/schemas`); a web nunca importa esquema.
- **Node puro fora da web:** imports relativos em `.ts`, só sintaxe apagável, `import type` para tipo (`messages.ts` importa `Look` de
  `./looks.ts` só como tipo).
- **Corpo ≤ 1 KiB:** o apelido (64) mais o `hp` mais a aparência (2 × 32) cabem com folga; o limite não muda.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip. O `roomLooks` e a linha do menu são pequenos; as imagens seguem nos pacotes.
- **Acesso e fotossensibilidade:** o nome acessível das cartas, dos versos e dos retratos não muda; as imagens são decorativas; o axe fica
  limpo; nada novo pisca nem inverte.
- **E2E:** o limite é de 10 salas novas por minuto por IP, e esta fatia cria mais uma. Para repetir, rode a execução inteira de novo,
  nunca `--repeat-each`.
- **Testes:** em `packages/web/test/ui`, `.test.tsx`; em `test/model`, `.test.ts`, com 90% de linhas e de branches em `src/model`. Os do
  `worker` do servidor rodam no workerd (`http.test.ts`, `socket.test.ts`); os do núcleo, no Node (`test/core`).
- **Memória:** `estado.md` e `diario.md` a cada tarefa, como manda o `CLAUDE.md` (regras 2, 4 e 6), com as `Ruling:`. `pnpm check` antes de
  cada commit de código; nunca `--no-verify`.

## Review Focus

1. **A preferência mudada com a sala aberta** (noutra aba, no Início) não muda a mesa, nem o seu lado nem o do outro → teste da Task 4.
2. **Sala ou assento sem `look`** (gravado antes do deploy, ou quem está no padrão) vira Cordel, sem erro e sem aviso no console →
   testes das Tasks 2 e 4.
3. **A revanche e a reconexão mantêm as aparências** (o núcleo guarda o assento; a web relê a mesma mensagem) → testes das Tasks 2 e 4.
4. **Cada mensagem `room` de presença** (o `connected`, o pronto, o `woAt`) não troca o contexto das cartas quando as aparências não
   mudam: a imagem da carta é o mesmo nó, e nenhum pacote é pedido de novo → teste da Task 4.
5. **Os dois sentidos:** cada tela vê a sua no seu lado e a do outro no lado do outro (os versos, o retrato e as fileiras depois da
   revelação) → teste da Task 4 (as duas cadeiras) e o E2E da Task 5.
6. **O corpo malformado:** `look` de outro tipo ou com campo a mais dá 400, e entrar com `hp` continua dando 400 → teste da Task 2.

---

### Task 0: O começo

**Files:** nenhum de código.

- [ ] **Step 1: A regra 1 do `CLAUDE.md`** (o `estado.md` mais novo, `git worktree list`, `git status --short`). Confirmar que a aprovação
  deste plano está no `decisoes.md`, com o texto do autor e as escolhas H1 a H7 como ficaram. Se não estiver, parar.
- [ ] **Step 2: A branch.** `feat/decks-fatia-3` já existe, saída da `main` em `b6c2caf`, com o commit deste plano. Se a `main` andou,
  trazê-la (`git merge main`, a branch já está no GitHub).
- [ ] **Step 3: Rodar** `pnpm check`. Expected: PASS. Commit da memória (`docs(memoria): a fatia 3 dos decks, em curso`).

---

### Task 1: O protocolo: o campo no assento, nos corpos e no cliente

**Files:**
- Modify: `packages/protocol/src/messages.ts` (`SeatInfo.look?`)
- Modify: `packages/protocol/src/schemas.ts` (`LookBodySchema`, `CreateRoomBodySchema`, `JoinRoomBodySchema` no lugar do
  `NicknameBodySchema`)
- Modify: `packages/protocol/src/client.ts` (`createRoom`, `joinRoom` e o corpo do `call`)
- Modify: `packages/server/src/worker/router.ts`, só o import: o `readNickname` passa a usar o `JoinRoomBodySchema` (o `look` só é lido
  na Task 2), para o typecheck do pre-commit passar sem o `NicknameBodySchema`
- Test: `packages/protocol/test/schemas.test.ts`, `packages/protocol/test/client.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // messages.ts
  import type { Look } from './looks.ts';
  export interface SeatInfo {
    /* …os campos de hoje… */
    /** A aparência que o jogador trouxe ao criar a sala ou ao entrar (decks e raças, fatia 3); sem ela, o padrão. */
    look?: Look;
  }

  // schemas.ts
  /** A aparência no corpo: dois textos curtos. O núcleo normaliza (id desconhecido vira o padrão, sem erro). */
  export const LookBodySchema = z.strictObject({ deck: z.string().max(32), race: z.string().max(32) });
  export const CreateRoomBodySchema = z.strictObject({
    nickname: z.string().max(64),
    hp: z.number().int().optional(),
    look: LookBodySchema.optional(),
  });
  /** O corpo da entrada: o apelido e, se quiser, a aparência. Sem `hp` (a vida é da sala). */
  export const JoinRoomBodySchema = z.strictObject({ nickname: z.string().max(64), look: LookBodySchema.optional() });

  // client.ts (o `look` por último, como o `hp`: as chamadas de hoje não mudam)
  export function createRoom(server: string, nickname: string, fetchImpl?: typeof fetch, hp?: number, look?: Look): Promise<CreateRoomResponse>;
  export function joinRoom(server: string, code: string, nickname: string, fetchImpl?: typeof fetch, look?: Look): Promise<JoinRoomResponse>;
  ```
  O `call` monta o corpo só com as chaves que vieram: `{ nickname }`, mais `hp` se veio, mais `look` se veio.
- O `NicknameBodySchema` sai (o roteador era o único uso e passa ao `JoinRoomBodySchema` nesta tarefa); o teste dele passa a ser do
  `JoinRoomBodySchema`, com as mesmas três conferências (é uma das duas mudanças de teste por desenho).

- [ ] **Step 1: Escrever os testes que falham.**
  - `schemas.test.ts`: `CreateRoomBodySchema` aceita `{ nickname, look: { deck: 'bestiario', race: 'egipcio' } }` e
    `{ nickname, look: { deck: 'xyz', race: 'abc' } }` (a forma vale; o id é o núcleo que normaliza); recusa `look: 'bestiario'`,
    `look: { deck: 'bestiario' }`, `look: { deck: 'bestiario', race: 'egipcio', extra: 1 }` e `look: { deck: 'x'.repeat(33), race: 'bufao' }`.
    `JoinRoomBodySchema`: as três de hoje (`{ nickname: 'Ana' }` passa, 65 caracteres não, campo a mais não), mais `look` válido passa e
    `hp: 800` não passa.
  - `client.test.ts`: `createRoom('http://s', 'Ana', impl, undefined, { deck: 'bestiario', race: 'egipcio' })` manda
    `{ nickname: 'Ana', look: { deck: 'bestiario', race: 'egipcio' } }`; com `hp` 800 e a aparência, os três; `joinRoom('http://s', 'ABC234',
    'Beto', impl, look)` manda `{ nickname: 'Beto', look }`. Os casos de hoje (sem aparência: o corpo exato `{ nickname }`) não mudam.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/protocol exec vitest run test/schemas.test.ts test/client.test.ts`
Expected: FAIL nos casos novos; os antigos passando.

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm check`. Expected: PASS (o roteador já usa o esquema novo; os testes do servidor seguem verdes, porque nada
  muda para o corpo sem `look`).
- [ ] **Step 5: Commit**: `feat(protocol): a aparência no assento e nos corpos de criar e de entrar`.

---

### Task 2: O servidor: o assento guarda, a mensagem devolve

**Files:**
- Modify: `packages/server/src/core/types.ts` (`SeatRecord.look?`)
- Modify: `packages/server/src/core/room-core.ts` (`create`, `join`)
- Modify: `packages/server/src/core/views.ts` (`roomMessage`)
- Modify: `packages/server/src/worker/room.ts` (os RPC `create` e `join`)
- Modify: `packages/server/src/worker/router.ts` (`readCreate` devolve o `look`; `readNickname` vira `readJoin` e também o devolve)
- Modify: `packages/server/test/core/harness.ts` (`create` e `join` aceitam a aparência)
- Test: `packages/server/test/core/room.test.ts`, `packages/server/test/core/lobby.test.ts`, `packages/server/test/worker/http.test.ts`

**Interfaces:**
- Consumes: `LookBodySchema`, `CreateRoomBodySchema`, `JoinRoomBodySchema` e `SeatInfo.look` (Task 1); `normalizeLook` e `Look`
  (`@coringa/protocol`).
- Produces:
  ```ts
  // core/types.ts
  export interface SeatRecord {
    /* …os campos de hoje… */
    /** A aparência normalizada que o corpo trouxe (fatia 3). Sem ela (o padrão, ou o registro de antes do deploy), o Cordel. */
    look?: Look;
  }
  /** A aparência como o corpo a traz (a forma já conferida pelo esquema; o id ainda não). */
  export interface LookInput { deck: string; race: string }

  // core/room-core.ts (o `look` por último: as chamadas de hoje não mudam)
  create(code: string, nickname: string, now: number, hp?: number, look?: LookInput): Promise<CoreResult<CreateRoomResponse, 'EXISTS' | 'BAD_NICKNAME'>>;
  join(nickname: string, sockets: SocketInfo[], now: number, look?: LookInput): Promise<CoreResult<JoinRoomResponse, 'NOT_FOUND' | 'FULL' | 'BAD_NICKNAME'>>;

  // worker/room.ts
  create(code: string, nickname: string, hp?: number, look?: LookInput): Promise<RpcResult<…>>;
  join(nickname: string, look?: LookInput): Promise<RpcResult<…>>;
  ```
  O assento novo leva `...(look === undefined ? {} : { look: normalizeLook(look) })`: sem o campo no corpo, nenhuma chave `look` no
  assento (H1). O `roomMessage` faz `if (seat.look) info.look = { ...seat.look }` (cópia: a mensagem fica nos efeitos até a casca
  serializar). O `info()` (a tela de convite) não muda.

- [ ] **Step 1: Escrever os testes que falham.**
  - **O núcleo** (`room.test.ts`): criar com `{ deck: 'bestiario', race: 'egipcio' }` grava essa no assento `p1`; com
    `{ deck: 'cordel', race: 'egipcio' }`, grava `{ deck: 'cordel', race: 'bufao' }` (a trava); com `{ deck: 'xyz', race: 'abc' }`, o
    padrão; sem aparência, o assento não tem a chave `look` (`'look' in seat` é falso). Entrar com `{ deck: 'celestial', race: 'bufao' }`
    grava no `p2`. A mensagem `room` que a entrada manda traz o `look` de cada assento que o tem, e nenhum no que não tem.
  - **A revanche** (`lobby.test.ts`): depois da revanche, os dois assentos seguem com as aparências, e a mensagem `room` da partida 2 as traz.
  - **O registro antigo:** um registro montado sem `look` nos assentos (como os de antes do deploy) produz uma mensagem `room` sem `look`, sem
    erro.
  - **O HTTP** (`http.test.ts`): criar com aparência dá 201, entrar com aparência dá 200; criar com id desconhecido dá 201; o `look` de
    outro tipo (`'bestiario'`), sem `race`, com campo a mais ou com 33 caracteres dá 400 com `error: 'BAD_NICKNAME'`, na criação e na
    entrada; entrar com `hp` continua 400 (o caso de hoje).
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/server exec vitest run test/core/room.test.ts test/core/lobby.test.ts test/worker/http.test.ts`
Expected: FAIL nos casos novos; os antigos passando (o `toEqual` do assento de hoje, sem `look`, continua verde: H1).

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm check`. Expected: PASS, sem mudar teste do servidor que já existe.
- [ ] **Step 5: Commit**: `feat(server): o assento guarda a aparência, e a mensagem room a devolve`.

---

### Task 3: A web: quem cria e quem entra levam a aparência

**Files:**
- Modify: `packages/web/src/model/looks.ts` (`sentLook`)
- Modify: `packages/web/src/app/room-api.ts` (`RoomApi.create`, `RoomApi.join`)
- Modify: `packages/web/src/ui/screens/Home.tsx` (a criação e a nota, H4)
- Modify: `packages/web/src/ui/screens/RoomGate.tsx` (a entrada por link)
- Modify: `packages/web/src/model/copy.ts` (`LOOK_TRAINING_ONLY` vira `LOOK_ONLINE_NOTE`, H4)
- Test: `packages/web/test/model/looks.test.ts`, `packages/web/test/ui/home.test.tsx`, `packages/web/test/ui/room-gate.test.tsx`

**Interfaces:**
- Consumes: `createRoom` e `joinRoom` com o `look` (Task 1).
- Produces:
  ```ts
  // model/looks.ts
  /** A aparência que vai pelo fio ao criar ou entrar (H1): `undefined` no padrão (o Cordel), para o pedido ficar o de hoje. */
  export function sentLook(look: Look): Look | undefined;

  // app/room-api.ts
  export interface RoomApi {
    create(nickname: string, hp?: number, look?: Look): Promise<CreateRoomResponse>;
    join(code: string, nickname: string, look?: Look): Promise<JoinRoomResponse>;
    /* …o resto como está… */
  }

  // model/copy.ts (H4)
  export const LOOK_ONLINE_NOTE = 'Na sala online, vale a que você tinha ao entrar.';
  ```
  O Início chama `api.create(valid, hp)` quando `sentLook(look)` é `undefined`, e `api.create(valid, hp, sentLook(look))` quando não é
  (nunca um `undefined` a mais nos argumentos: os testes de hoje conferem as chamadas exatas). A entrada por link lê a aparência na hora
  de entrar (`loadPrefs(store).look ?? DEFAULT_LOOK`), com a mesma regra para o `api.join`.

- [ ] **Step 1: Escrever os testes que falham.**
  - `sentLook`: o padrão dá `undefined`; Bestiário + Egípcio e Celestial + Bufão voltam iguais (um objeto novo).
  - **O Início:** com a preferência Bestiário + Egípcio, criar a sala chama `api.create('Duda', 500, { deck: 'bestiario', race: 'egipcio' })`;
    trocar a aparência no painel antes de criar manda a nova. A nota do painel é `LOOK_ONLINE_NOTE` (o teste da nota muda por desenho).
  - **A entrada por link:** com a preferência Celestial + Bufão, `api.join(CODE, 'Duda', { deck: 'celestial', race: 'bufao' })`. Os casos de
    hoje, com o padrão (`toHaveBeenCalledExactlyOnceWith('Duda', 500)` e `(CODE, 'Duda')`), não mudam.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/looks.test.ts test/ui/home.test.tsx test/ui/room-gate.test.tsx`
Expected: FAIL nos casos novos; os antigos passando, menos o da nota (que muda junto com o texto).

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): criar e entrar na sala levam a aparência das preferências`.

---

### Task 4: A web: a sala veste os assentos

**Files:**
- Modify: `packages/web/src/model/looks.ts` (`roomLooks`, `recordedLooks`)
- Modify: `packages/web/src/ui/table/PlayTable.tsx` (`useTableLooks`: o online pelos assentos; a gravação, H5)
- Modify: `packages/web/src/ui/table/GameMenu.tsx` (a linha do online, H3)
- Modify: `packages/web/src/ui/screens/RoomGate.tsx` (`OnlineRoom`: os pacotes pedidos quando o `room` chega)
- Modify: `packages/web/src/model/copy.ts` (`LOOK_ROOM_FIXED`, H3)
- Test: `packages/web/test/model/looks.test.ts`; um arquivo novo `packages/web/test/ui/room-looks.test.tsx` (a mesa online, o menu, a
  gravação); o pedido dos pacotes no `room-gate.test.tsx`

**Interfaces:**
- Consumes: `SeatInfo.look` (Task 1); `LooksProvider`, `LookZone`, `requestLook` e `useRecordPastGame(…, looks)` (fatia 2, sem mudar).
- Produces:
  ```ts
  // model/looks.ts
  /**
   * As aparências da sala online (fatia 3, §8.3): a de cada assento, normalizada (`normalizeLook`); assento ausente ou sem `look`, o
   * padrão. A sua também vem do assento, nunca da preferência (H2).
   */
  export function roomLooks(seats: readonly Pick<SeatInfo, 'playerId' | 'look'>[], me: PlayerId, opponent: PlayerId): { mine: Look; theirs: Look };
  /** As aparências que a partida guardada leva (G3, H5): `undefined` quando as duas são o padrão, para a linha ficar a de hoje. */
  export function recordedLooks(mine: Look, theirs: Look): PastLooks | undefined;

  // model/copy.ts (H3)
  export const LOOK_ROOM_FIXED = 'A aparência desta sala é a que você tinha ao entrar.';

  // GameMenu.tsx: uma prop nova, mostrada (um parágrafo) no lugar do seletor quando `look` não vem
  lookNote?: string;
  ```
- **A `PlayTable`:** no treino fora do tutorial, como hoje (a sua da preferência, a do bot pelo `botLook`); **no online** (sem `training`),
  `roomLooks(snapshot.room?.seats ?? [], view.me, view.opponent.id)`; no tutorial, nenhuma (Cordel). O `recorded` dos dois caminhos passa a
  ser `recordedLooks(mine, theirs)` (no treino dá o mesmo de hoje: com o Cordel, o bot também está nele). **O memo é pelo conteúdo**: as
  dependências são os textos (o deck e a raça de cada lado) e os dois ids, nunca o `seats`, que é um vetor novo a cada mensagem `room`
  (presença, pronto, `woAt`). O seletor do menu continua só no treino fora do tutorial (o `chosenLook` de hoje); no online, o menu recebe
  `lookNote={LOOK_ROOM_FIXED}`.
- **O `OnlineRoom`:** um efeito pede `requestLook(normalizeLook(seat.look))` para cada assento do `room`, com a lista das aparências em texto
  como dependência (pedir de novo a cada mensagem seria inofensivo, porque o `loadPack` guarda o pedido, mas o efeito não precisa rodar). O
  padrão não pede nada (`packsOf` vazio). Vale no lobby e na mesa.

- [ ] **Step 1: Escrever os testes que falham.**
  - **`roomLooks`:** os dois assentos com aparência; um sem `look` dá o padrão daquele lado; o assento do outro ainda ausente (o lobby antes
    de alguém entrar) dá o padrão; um `look` fora da lista no assento (`{ deck: 'xyz', race: 'egipcio' }`) sai normalizado.
    **`recordedLooks`:** os dois no padrão dão `undefined`; um só fora do padrão dá os dois.
  - **A mesa online, vista do `p1`** (`room.seats`: `p1` Bestiário + Egípcio, `p2` Celestial + Bufão): as suas cartas (a mão, as suas
    fileiras) com as imagens do Bestiário; os versos da mão do `p2` com `data-verso-deck="celestial"`; as fileiras dele, depois da
    revelação, com as da Celestial; o seu retrato com o Anúbis e o dele com o `<Coringa>`.
  - **A mesma sala vista do `p2`:** o contrário (as suas da Celestial, os versos do `p1` com `bestiario`, o retrato do `p1` com o Anúbis e o
    seu com o `<Coringa>`).
  - **A preferência não entra (H2):** com a preferência em Celestial + Egípcio e o seu assento em Bestiário + Egípcio, o seu lado fica no
    Bestiário; mudar a preferência durante a partida não muda nada.
  - **A mensagem de presença:** um `room` novo com as mesmas aparências e o `connected` do outro trocado deixa a imagem de uma carta sua no
    mesmo nó (`toBe` o elemento de antes) e não chama o `loadPack` de novo.
  - **O assento sem `look`:** a sala de hoje (os testes que já existem: "na sala online… a mesa fica em cordel", "nada vai ao console")
    segue igual, sem mudar o teste.
  - **O menu:** no online, sem o grupo "Deck" e com a linha `LOOK_ROOM_FIXED`; no treino, o seletor e nenhuma linha.
  - **A gravação (H5):** a partida online terminada com os assentos acima guarda `looks: { me: Bestiário + Egípcio, opponent: Celestial +
    Bufão }` (vista do `p1`); com os dois sem `look`, a linha não tem `looks` (o caso de hoje segue verde).
  - **Os pacotes no lobby** (`room-gate.test.tsx`): o `room` em `LOBBY` com as duas aparências pede `bestiario`, `egipcio` e `celestial` antes
    de qualquer mesa; com os dois no padrão, nenhum.
  - **O axe** limpo na mesa online com os dois decks.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/looks.test.ts test/ui/room-looks.test.tsx test/ui/room-gate.test.tsx`
Expected: FAIL nos casos novos; os antigos passando.

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm check`. Expected: PASS, com os testes da fatia 2 sobre o online (`table-looks.test.tsx`, "o tutorial e a sala
  online seguem em cordel"; `end-and-menu.test.tsx`; `past-games-record.test.tsx`) sem mudar: as salas deles não têm `look` nos assentos.
- [ ] **Step 5: Commit**: `feat(web): a sala online veste cada lado com a aparência do assento`.

---

### Task 5: E2E, smoke, documentação e o revisor

**Files:**
- Modify: `packages/web/e2e/looks.spec.ts` (o teste de duas pessoas; a sala segue o molde do `online.spec.ts`)
- Modify: `CLAUDE.md` (o item "Aparências"), a spec (a seção "O que a execução decidiu (fatia 3)"), `docs/memoria/diario.md`,
  `docs/memoria/estado.md`

- [ ] **Step 1: O E2E** (`looks.spec.ts`, com `failOnConsoleErrors` e o `axe`), dois contextos do navegador:
  - **Ana** escolhe Bestiário + Egípcio no painel "Aparência" do Início (o caminho de verdade) e cria a sala. **Duda** já tem
    `coringa:prefs` com Celestial + Bufão (`addInitScript`, antes de abrir o link: a entrada por link não mostra o painel) e entra pelo
    link. Os dois marcam pronto.
  - **No Equipar:** na tela da Ana, a mão dela com as imagens do Bestiário, os versos da Duda com `data-verso-deck="celestial"`, o retrato
    dela com o Anúbis carregado (`naturalWidth > 0`) e o da Duda com o Coringa (sem `img`); na da Duda, o contrário.
  - **Depois da revelação** (os dois equipam pela interface, `equipByUi`): nas duas telas, as fileiras da Ana com o Bestiário e as da Duda
    com a Celestial.
  - O axe nas duas telas. A sala nova conta no limite (Global Constraints).
- [ ] **Step 2: O smoke.** `pnpm --filter @coringa/web smoke`: anotar o JavaScript inicial antes e depois desta fatia (no diário; a fatia 2
  deixou 183,8 KB).
- [ ] **Step 3: `pnpm check` e `pnpm e2e`.** Expected: PASS nos dois. Se o limite de salas barrar, rodar a execução inteira de novo.
- [ ] **Step 4: A documentação.**
  - `CLAUDE.md`, no item **Aparências**: tirar "O tutorial e o online ficam em Cordel até a fatia 3"; dizer que no online a aparência vem do
    assento (`SeatInfo.look`, gravado só quando o corpo traz, normalizado no núcleo), que a web só manda fora do padrão (`sentLook`), que a
    mesa online lê os assentos (`roomLooks`, memo pelo conteúdo) e que a partida online guardada leva `looks` (H5).
  - A spec: a seção "O que a execução decidiu (fatia 3)", com as H1 a H7 como ficaram (a H1 afina a §8.2; a H3, a §6 depois da F1).
  - `diario.md`: a entrada da fatia (os commits, as `Ruling:` de cada tarefa, os dois testes que mudaram por desenho, as armadilhas).
    `estado.md`: o próximo passo (o merge com o "sim" do autor; depois, o deploy dele, que leva as aparências ao online).
- [ ] **Step 5: Commit** (`test(web): o E2E das aparências na sala online`; `docs: a fatia 3 dos decks`), subir a branch quando o pre-push
  passar.
- [ ] **Step 6: O revisor** (H7): um subagente novo lê a branch inteira contra este plano e a spec, com o Review Focus na mão. O que ele
  achar vira correção nesta branch, antes do merge. O merge espera as duas CI verdes e o "sim" do autor.

## Para quem executa (escolhas deixadas a você)

São suas:
- a forma interna do `useTableLooks` (como ele escolhe entre o treino e o online), desde que o memo seja pelo conteúdo e que o treino e o
  tutorial fiquem como estão;
- onde mora o efeito que pede os pacotes (no `OnlineRoom` ou no `Lobby`), desde que valha antes da primeira mesa e depois dela;
- os nomes dos testes e a divisão em arquivos de teste.

Não são suas: o que vai pelo fio e o que o servidor grava (H1), de onde vem a sua aparência na sala (H2), a linha do menu e a nota do Início
(H3, H4, com as frases aprovadas), quando a partida online grava `looks` (H5), as versões que não sobem e o código de erro (Global
Constraints).

**Para e pergunta** se: um teste existente fora dos dois citados precisar mudar; um motivo aparecer para subir o `STATE_SCHEMA`, o
`PROTOCOL_VERSION` ou o `RULES_VERSION`; o orçamento estourar; ou a `main` tiver um `room-core.ts`, um `router.ts`, um `PlayTable.tsx` ou um
`RoomGate.tsx` diferente do que este plano descreve.
