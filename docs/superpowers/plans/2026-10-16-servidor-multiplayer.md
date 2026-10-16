# Servidor multiplayer — Plano de Implementação (Plano 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o sub-projeto 2: salas privadas por link, partida 1v1 em tempo real num Durable Object por sala, protocolo WebSocket validado, tempos e W.O., deploy na Cloudflare e um cliente de terminal (mais um bot) para jogar pelo servidor antes da interface existir.

**Architecture:** Três peças.
- `@coringa/protocol` (novo): tipos e esquemas das mensagens, código da sala e `RoomClient`, compartilhados entre servidor, terminal e, depois, a web.
- `@coringa/server` (novo): um núcleo puro, `RoomCore` em `src/core`, que recebe entradas com `now` e devolve `Effects`, testado no Node com cobertura. Por cima dele, uma casca fina para a Cloudflare em `src/worker`: o Worker com o roteador HTTP e o Durable Object `Room`, testada no workerd.
- `@coringa/sim` (já existe): ganha `pnpm play --online`, `pnpm bot` e `pnpm sim:replay`.

**Tech Stack:**

| Ferramenta | Versão |
|---|---|
| Node | 24 |
| pnpm | 11.9 |
| TypeScript | ~6.0.3 |
| Vitest | ^5 (cobertura v8 no Node) |
| Wrangler | ^4.151 |
| `@cloudflare/vitest-plugin` | ^1.4 (testes no workerd) |
| Zod | ^4.6 |
| Durable Objects | backend SQLite, API `ctx.storage.kv` |

**Spec:** `docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (aprovada em 2026-10-16). Leia inteira; cada tarefa cita as seções que implementa. Contexto do motor: `docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md` §1.7, §1.11, §1.12 e §2.

**Onde executar:**
- Branch `feat/server`, criada a partir de `claude/trusting-kowalevski-33f2d3` (que tem a spec e este plano), num worktree de **caminho curto**, por exemplo `D:\andr3\jogo-coringa-server`.
- Motivo do caminho curto: no Windows, o `workerd.exe` fica em `node_modules\.pnpm\@cloudflare+workerd-windows-64@…\node_modules\@cloudflare\workerd-windows-64\bin\` (~140 caracteres a mais). Com a pasta base longa, ele passa de 260 caracteres e o Vitest falha com "Timeout starting cloudflare-pool runner" (visto no protótipo).
- Rode `pnpm install` no worktree antes do primeiro commit: os hooks do `.git/hooks` comum rodam `pnpm check` em todas as pastas.
- Push e PR estão autorizados aos agentes até o MVP. O `gh` não está instalado, então o PR abre pelo link `https://github.com/andr3serafim/jogo-do-coringa/pull/new/feat/server`.
- Merge só com `pnpm check` e a CI verdes, por squash no GitHub ou fast-forward.
- Credenciais da Cloudflare (`wrangler login`, deploy) são só do autor.

## O que o protótipo já mostrou

Um projeto descartável fora do repositório (2026-10-16) confirmou o que o plano dá como certo:

- **Instalação:**
  - com faixas (`^`), o pnpm 11 respeita a idade mínima de publicação sem mexer em `minimumReleaseAgeExclude`, e resolveu `wrangler@4.151.0`, `@cloudflare/vitest-plugin@1.4.3` e `zod@4.6.5`;
  - ele barra os scripts de instalação de **`esbuild` e `workerd`**, e os dois precisam de `true` em `allowBuilds`.
- **`@cloudflare/vitest-plugin` com Vitest 5:** a configuração é `plugins: [cloudflareTest({ wrangler: { configPath } })]`, e os helpers vêm de `cloudflare:test` (`env`, `SELF`, `runInDurableObject`, `runDurableObjectAlarm`, `evictAllDurableObjects`). Três testes rodaram em 2,7 s, cobrindo:
  - WebSocket com hibernação: o socket sobrevive ao `evictAllDurableObjects`;
  - auto-resposta `ping`/`pong`;
  - `ctx.storage.kv` síncrono e alarme;
  - RPC num stub;
  - `deleteAll()` apagando o alarme (com `compatibility_date` 2026-10-01);
  - upgrade aceito e fechado na hora chegando ao cliente como 4000/4003;
  - rate limit simulado (201, 201, 429).
- **Código no workerd:** o motor real joga uma partida inteira dentro do workerd, e Zod e imports `.ts` relativos funcionam lá.
- **Tipos:**
  - `wrangler types` gera `worker-configuration.d.ts` em ~2 s, com `Cloudflare.Env` e os tipos do runtime, e o `tsc` passa com `types: ["@cloudflare/vitest-plugin/types"]`;
  - sem o arquivo gerado, `env.ROOMS` não existe no tipo;
  - `wrangler types --check` existe.
- **`wrangler deploy --dry-run --outdir`** funciona **sem login**, em ~2 s. O bundle tem 771 KiB (120 KiB com gzip), com o Zod inteiro.
- **`pnpm check` atual:** ~30 s.

## Global Constraints

- Node ≥ 24, pnpm 11.9.0, TypeScript ~6.0.3.
- **Protocolo e núcleo rodam no Node puro:** imports relativos com `.ts`, só sintaxe apagável, `import type` para tipos. Nunca `--preserve-symlinks`.
- O núcleo (`packages/server/src/core/**`) e o protocolo não importam `cloudflare:*` (o ESLint barra), não leem relógio nem sorteiam sozinhos: `now` vem por parâmetro e a aleatoriedade por `CoreDeps.randomBytes`.
- Do jogo, para o jogador X só sai `viewFor(estado, X)` e `viewEvents(eventos, X)`. A semente não aparece em nenhuma mensagem; só na linha `game.replay` do log, depois do fim (spec §8.6).
- O `playerId` vem do socket autenticado, nunca da mensagem. O cliente nunca envia `TIMEOUT` nem `FORFEIT`.
- **Valores fixos da spec:**
  - código de 6 caracteres do alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ`;
  - apelido de 1 a 20 caracteres (pontos de código);
  - token de 32 bytes em base64url (43 caracteres), guardado como SHA-256 hex;
  - assentos `p1`/`p2`;
  - `PROTOCOL_VERSION = 1` e `STATE_SCHEMA = 1`.
- **Tempos (spec §6.1):**
  - Equipar 40 s, Escolha da ordem 10 s, Turno 30 s, Janela de reação 8 s com piso de 2 s;
  - reconexão 60 s; 3 estouros;
  - margem de rede de 500 ms;
  - varredura de presença a cada 20 s, queda silenciosa aos 45 s, `hello` em até 10 s;
  - sala ociosa expira em 30 min, teto de 24 h.
- **Limites (spec §4, §8):**
  - frame de 4 KiB, corpo HTTP de 1 KiB;
  - `id` com até 64 caracteres, id de carta com até 32, até 16 destinos, até 8 K;
  - balde de 20 mensagens reposto a 10/s; mais de 100 descartes → 1008; mais de 20 mensagens malformadas → 1008;
  - até 8 sockets por sala e 4 sem autenticação;
  - por IP: criar sala 10/min, demais rotas 60/min;
  - anel de 50 passos e 64 `ack` por jogador.
- **Códigos de fechamento (spec §4.2):**
  - 1000 `leave`; 1003 frame binário; 1008 abuso; 1009 frame grande;
  - 4000 sala inexistente ou apagada; 4001 protocolo; 4003 token ou origem;
  - 4008 sem `hello` ou sem sinal; 4009 outra aba; 4029 limite.
- Textos, mensagens e comentários em **pt-BR**; identificadores em inglês.
- **Cobertura v8 ≥ 90% de linhas e branches:** em `packages/protocol/src` (sem `index.ts` e `messages.ts`) e em `packages/server/src/core` (sem `types.ts`). A casca no workerd não tem meta (o workerd só aceita Istanbul).
- `pnpm check` = lint + typecheck + testes com cobertura + smoke. Todo commit passa pelo hook. Nunca `--no-verify` nem `SKIP_SIMPLE_GIT_HOOKS`.
- O script de publicação **não se chama `deploy`** na raiz (`pnpm deploy` é comando do pnpm): é `deploy:server`.

## Review Focus

1. **Relógio do cliente errado** (celular com minutos de diferença) → a contagem mostra o tempo do servidor, não o do aparelho. *Teste na Tarefa 2: `remainingMs` usa a diferença estimada por `serverNow`, com `Date.now()` adiantado 3 min.*
2. **Partida muito longa** (anti-travamento perto do limite, vários reembaralhamentos) → nenhuma gravação estoura o tamanho de valor do storage.
   - A doc da Cloudflare só dá o limite do backend KV antigo (128 KiB por valor), não o do SQLite. Por isso o plano não depende dele: o registro é gravado em quatro chaves limitadas (`splitRecord`, Tarefa 3).
   - *Teste na Tarefa 9: cada parte de `splitRecord` fica < 100 KiB na maior partida.*
3. **Mensagem chegando a uma sala já apagada** (socket ainda aberto depois do `deleteAll`) → fechamento 4000, sem recriar nada no storage. *Teste na Tarefa 8.*
4. **Apelido com emoji, acento combinado ou só espaços** → normalizado em NFC e contado por ponto de código ("😀" vale 1; `"  "` é inválido; 21 emojis é inválido). *Teste na Tarefa 1.*
5. **Clique duplo na mesma jogada** (dois `act` com ids diferentes e o mesmo conteúdo, ou o mesmo id duas vezes) → o segundo recebe o erro do motor (ex.: `CARD_NOT_IN_HAND`) ou o mesmo `ack` guardado, sem efeito duplo. *Teste na Tarefa 6.*

---

## Estrutura de arquivos

```
pnpm-workspace.yaml                      # + allowBuilds esbuild/workerd (Tarefa 3)
eslint.config.js                         # + ignores gerados; cloudflare:* barrado no núcleo e no protocolo (Tarefa 3)
.gitignore                               # + .wrangler/, worker-configuration.d.ts (Tarefa 3)
package.json                             # + dev:server, deploy:server, bot, sim:replay (Tarefa 12)
CLAUDE.md                                # + regras do servidor (Tarefa 12)
packages/protocol/
  package.json  tsconfig.json  vitest.config.ts  scripts/smoke.ts
  src/index.ts          # reexporta tudo menos schemas
  src/constants.ts      # PROTOCOL_VERSION, LIMITS, CLOSE, tempos do cliente
  src/messages.ts       # tipos das mensagens e respostas HTTP (só tipos)
  src/code.ts           # alfabeto, normalizeCode, generateCode, roomLink, parseTarget
  src/nickname.ts       # normalizeNickname
  src/schemas.ts        # Zod (subpath ./schemas, só o servidor importa)
  src/client.ts         # RoomClient + createRoom/joinRoom/roomInfo + RoomConnection
  test/code.test.ts  test/nickname.test.ts  test/schemas.test.ts  test/client.test.ts
packages/server/
  package.json  tsconfig.json  tsconfig.worker.json  vitest.config.ts  vitest.worker.config.ts  wrangler.jsonc
  scripts/smoke.ts  scripts/deploy.ts
  src/core/types.ts     # RoomRecord, SeatRecord, GameRecord, AgendaItem, SocketInfo, Effects, LogLine, CoreDeps
  src/core/timers.ts    # TIMERS, STATE_SCHEMA, ROOM_LIMITS
  src/core/agenda.ts    # agenda de prazos (alarme único)
  src/core/epoch.ts     # phaseKey
  src/core/limiter.ts   # TokenBucket
  src/core/tokens.ts    # base64url, hex, sha256Hex (Web Crypto)
  src/core/effects.ts   # emptyEffects, helpers de envio
  src/core/storage-layout.ts # splitRecord/joinRecord: quatro chaves limitadas no storage
  src/core/views.ts     # stateFor, roomMessage
  src/core/game.ts      # início de partida, passo, prazos de fase, estouros, fim
  src/core/presence.ts  # conectado, varredura, reconciliação, W.O. por reconexão
  src/core/room-core.ts # RoomCore: entradas → Effects
  src/worker/index.ts   # export default { fetch } + export { Room }
  src/worker/router.ts  # rotas /api, limite por IP, origem, aceitar-e-fechar
  src/worker/room.ts    # Durable Object Room (casca)
  test/core/harness.ts  # relógio falso, sockets falsos, deps determinísticas
  test/core/*.test.ts   # Node, cobertura v8
  test/worker/*.test.ts # workerd
packages/sim/
  package.json          # + dependência @coringa/protocol
  src/play/io.ts        # ask/askChoice aceitam AbortSignal
  src/play/game.ts      # exporta askAction
  src/online/session.ts # partida online no terminal
  src/online/bot.ts     # bot online
  src/online/sessions.ts # token salvo por sala (packages/sim/sessions/, fora do git)
  src/cli/play.ts       # + --online, --servidor, --apelido
  src/cli/bot.ts        # pnpm bot
  src/cli/replay.ts     # pnpm sim:replay
  test/online.test.ts  test/replay.test.ts
```

---

### Tarefa 1: Pacote `@coringa/protocol` — constantes, código, apelido, mensagens e esquemas

Spec §2.1, §2.2, §4.1–§4.4, §8.1.

**Files:**
- Create: `packages/protocol/package.json`, `tsconfig.json`, `vitest.config.ts`, `scripts/smoke.ts`, `src/index.ts`, `src/constants.ts`, `src/messages.ts`, `src/code.ts`, `src/nickname.ts`, `src/schemas.ts`
- Test: `packages/protocol/test/code.test.ts`, `test/nickname.test.ts`, `test/schemas.test.ts`

**Interfaces:**
- Consumes: tipos `Action`, `GameEvent`, `GameResult`, `PlayerId`, `PlayerView`, `RuleErrorCode`, `Destination`, `RowName` de `@coringa/engine`.
- Produces:
  - `src/constants.ts`:
    - `PROTOCOL_VERSION = 1`;
    - `LIMITS = { frameBytes: 4096, httpBodyBytes: 1024, idLength: 64, cardIdLength: 32, destinations: 16, kCards: 8, nicknameLength: 20, tokenLength: 43 } as const`;
    - `CLOSE = { LEAVE: 1000, BINARY: 1003, ABUSE: 1008, TOO_BIG: 1009, ROOM_GONE: 4000, PROTOCOL: 4001, AUTH: 4003, HELLO: 4008, OTHER_TAB: 4009, LIMITED: 4029 } as const`;
    - `FINAL_CLOSE_CODES: readonly number[] = [1000, 4000, 4001, 4003, 4009]`;
    - `SLOW_RETRY_CODES: readonly number[] = [1008, 4029]`;
    - `PING_INTERVAL_MS = 15_000`;
    - `RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 5000] as const`;
    - `RECONNECT_JITTER = 0.2`;
    - `SLOW_RETRY_MS = 30_000`.
  - `src/messages.ts` (só tipos):
    - `PlayerAction = Exclude<Action, { type: 'TIMEOUT' } | { type: 'FORFEIT' }>`;
    - `RoomStatus = 'LOBBY' | 'PLAYING' | 'FINISHED'`;
    - `OutcomeCause = 'NORMAL' | 'RECONNECT_TIMEOUT' | 'AFK' | 'CONCEDE' | 'ABANDONED'`;
    - `Outcome { gameNo: number; result: GameResult | null; cause: OutcomeCause }`;
    - `SeatInfo { playerId: PlayerId; nickname: string; connected: boolean; ready: boolean; wantsRematch: boolean; woAt?: number }`;
    - `Score { p1: number; p2: number; draws: number }`;
    - `DeadlineKind = 'EQUIP' | 'ORDER' | 'TURN' | 'REACTION'`;
    - `Deadline { kind: DeadlineKind; at: number; players: PlayerId[] }`;
    - `ClientMessage`: a união de §4.3, com os campos exatos da spec (`hello { protocol, token, lastSeq? }`, `ready { ready }`, `leave`, `act { id, epoch, action: PlayerAction }`, `concede { id }`, `rematch { want }`);
    - `WelcomeMessage`, `RoomMessage`, `StateMessage`, `AckMessage`, `ErrorMessage`, `ServerMessage`: §4.4. Em `StateMessage`, `catchUp?: true` e `resync?: true`;
    - `AckCode = RuleErrorCode | 'RATE_LIMITED' | 'BAD_MESSAGE' | 'NOT_PLAYING' | 'STALE_EPOCH' | 'ALREADY_PASSED' | 'DISCONNECTED'`;
    - `AckMessage = { t: 'ack'; id: string; ok: true; seq?: number; held?: true } | { t: 'ack'; id: string; ok: false; code: AckCode; message: string }`;
    - `ErrorCode = 'BAD_MESSAGE' | 'PROTOCOL_MISMATCH' | 'RATE_LIMITED' | 'WRONG_STATUS'`;
    - respostas HTTP: `CreateRoomResponse { code; token; playerId }`, `JoinRoomResponse { token; playerId }`, `RoomInfoResponse { code; status; nicknames: string[]; full: boolean }`.
  - `src/code.ts`:
    - `CODE_ALPHABET`, `CODE_LENGTH = 6`;
    - `normalizeCode(input: string): string | null`;
    - `generateCode(randomBytes: (n: number) => Uint8Array): string`;
    - `roomLink(origin: string, code: string): string`;
    - `parseTarget(input: string | undefined, defaultServer: string): { server: string; code: string | null }`.
  - `src/nickname.ts`: `normalizeNickname(raw: unknown): string | null`.
  - `src/schemas.ts`:
    - `PlayerActionSchema`, `ClientMessageSchema`, `NicknameBodySchema = z.strictObject({ nickname: z.string().max(64) })`;
    - `parseClientMessage(raw: string): ClientMessage | null`.
  - `package.json`: `"exports": { ".": "./src/index.ts", "./schemas": "./src/schemas.ts" }`; dependências `@coringa/engine: workspace:*` e `zod: ^4.6.0`; scripts `typecheck`, `test`, `test:coverage`, `smoke` (`node scripts/smoke.ts`), iguais aos do motor.

- [ ] **Step 1: Escrever os testes**

`test/code.test.ts`:

```ts
it('normaliza: minúsculas e espaços viram o código; fora do alfabeto é null', () => {
  expect(normalizeCode(' k7m2qx ')).toBe('K7M2QX');
  expect(normalizeCode('K7M2Q')).toBeNull();      // curto
  expect(normalizeCode('K7M2Q0')).toBeNull();     // 0 não existe
  expect(normalizeCode('K7M2QI')).toBeNull();     // I não existe
});
it('gera só do alfabeto, sem viés de módulo (bytes ≥ 248 são descartados)', () => {
  const bytes = [255, 249, 248, 0, 30, 31, 61, 247];
  let i = 0;
  const code = generateCode((n) => Uint8Array.from({ length: n }, () => bytes[i++ % bytes.length]));
  // lote 1: 255, 249, 248 descartados; 0→'2', 30→'Z', 31→'2', 61→'Z', 247→'Z'; lote 2: descarta três, 0→'2'
  expect(code).toBe('2Z2ZZ2');
});
it('link e alvo', () => {
  expect(roomLink('https://h.dev', 'K7M2QX')).toBe('https://h.dev/s/K7M2QX');
  expect(parseTarget(undefined, 'http://localhost:8787')).toEqual({ server: 'http://localhost:8787', code: null });
  expect(parseTarget('k7m2qx', 'http://localhost:8787')).toEqual({ server: 'http://localhost:8787', code: 'K7M2QX' });
  expect(parseTarget('https://h.dev/s/K7M2QX', 'x')).toEqual({ server: 'https://h.dev', code: 'K7M2QX' });
  expect(parseTarget('http://localhost:8787', 'x')).toEqual({ server: 'http://localhost:8787', code: null });
  expect(() => parseTarget('???', 'x')).toThrow('alvo inválido');
});
```

`test/nickname.test.ts`:

```ts
it.each([
  ['  Ana  ', 'Ana'],
  ['Jose\u0301', 'José'],          // NFC junta o acento combinado
  ['😀', '😀'],
  ['a'.repeat(20), 'a'.repeat(20)],
])('aceita %j', (raw, out) => expect(normalizeNickname(raw)).toBe(out));
it.each([['   '], [''], ['a'.repeat(21)], ['😀'.repeat(21)], ['ana\u0007'], [42], [null]])('recusa %j', (raw) =>
  expect(normalizeNickname(raw)).toBeNull());
```

`test/schemas.test.ts`:

```ts
it('aceita cada ação do jogador e recusa TIMEOUT/FORFEIT', () => {
  const ok: PlayerAction[] = [
    { type: 'EQUIP', destinations: ['ATK', 'DEF', 'DISCARD'] }, { type: 'CHOOSE_ORDER', first: true },
    { type: 'PLAY_J', cardId: 'b1-copas-J' }, { type: 'PLAY_Q', cardId: 'b1-copas-Q' }, { type: 'PLAY_K', cardIds: ['b1-copas-K'] },
    { type: 'TRAP', cardId: 'a', targetId: 'b' }, { type: 'SACRIFICE', cardId: 'a', targetId: 'b' },
    { type: 'REFLECT', kId: 'k', jId: 'j', qId: 'q' }, { type: 'CANCEL_REFLECT', kId: 'k', jId: 'j', qId: 'q' },
    { type: 'PROTECT_FROM_REFLECT', jId: 'j', qId: 'q', kId: 'k' }, { type: 'RESURRECT', cardId: 'n', row: 'ATK' },
    { type: 'DECLARE_ATTACK' }, { type: 'END_TURN' }, { type: 'PASS' },
  ];
  for (const action of ok) expect(parseClientMessage(JSON.stringify({ t: 'act', id: 'x1', epoch: 3, action }))).not.toBeNull();
  for (const action of [{ type: 'TIMEOUT' }, { type: 'FORFEIT', loser: 'p2' }])
    expect(parseClientMessage(JSON.stringify({ t: 'act', id: 'x1', epoch: 3, action }))).toBeNull();
});
it('recusa campo extra, tamanhos acima do limite e JSON quebrado', () => {
  const bad = [
    '{', '[]', JSON.stringify({ t: 'ready', ready: true, extra: 1 }),
    JSON.stringify({ t: 'act', id: 'x'.repeat(65), epoch: 1, action: { type: 'PASS' } }),
    JSON.stringify({ t: 'act', id: '', epoch: 1, action: { type: 'PASS' } }),
    JSON.stringify({ t: 'act', id: 'a', epoch: -1, action: { type: 'PASS' } }),
    JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'PLAY_J', cardId: 'c'.repeat(33) } }),
    JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'EQUIP', destinations: Array(17).fill('ATK') } }),
    JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'PLAY_K', cardIds: Array(9).fill('k') } }),
    JSON.stringify({ t: 'act', id: 'a', epoch: 1, action: { type: 'PLAY_K', cardIds: [] } }),
    JSON.stringify({ t: 'hello', protocol: 1, token: 'curto' }),
  ];
  for (const raw of bad) expect(parseClientMessage(raw)).toBeNull();
  expect(parseClientMessage(JSON.stringify({ t: 'hello', protocol: 1, token: 'a'.repeat(43), lastSeq: 7 }))).toEqual(
    { t: 'hello', protocol: 1, token: 'a'.repeat(43), lastSeq: 7 });
});
it('o esquema da ação e o tipo do motor não divergem', () => {
  expectTypeOf<z.infer<typeof PlayerActionSchema>>().toEqualTypeOf<PlayerAction>();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/protocol test`
Expected: FAIL (módulos não existem)

- [ ] **Step 3: Implementar**

- `generateCode`: lê bytes em lotes de 8 e aceita só `b < 248` (8 × 31), com índice `b % 31`, até ter 6 símbolos.
- `normalizeNickname`: `String.prototype.normalize('NFC')`, depois `trim()`. Conta com `[...s].length` e recusa `/\p{Cc}/u`.
- `parseTarget`: o código passa por `normalizeCode`. Uma URL `http(s)` com caminho `/s/<código>` vira `{ server: origin, code }`; uma URL sem caminho vira `{ server: origin, code: null }`. Qualquer outra coisa lança `Error('alvo inválido: <entrada>')`.
- Esquemas:
  - `z.strictObject` em tudo e `z.discriminatedUnion('type' | 't')`;
  - ids de carta `z.string().min(1).max(32)`;
  - `PLAY_K.cardIds` com `.min(1).max(8)`; `EQUIP.destinations` com `.max(16)`;
  - `epoch` e `lastSeq`: `z.number().int().nonnegative()`;
  - token: `z.string().length(43).regex(/^[A-Za-z0-9_-]+$/)`.
- `parseClientMessage` faz `try { JSON.parse }` e `safeParse`. Qualquer falha devolve `null`.
- `src/index.ts` reexporta `constants`, `messages` (tipos), `code`, `nickname` e `client` (Tarefa 2). **Não** reexporta `schemas`.
- `vitest.config.ts` é igual ao do motor, com `exclude: ['src/index.ts', 'src/messages.ts']`.
- `scripts/smoke.ts` (Node puro): importa `../src/index.ts` e `../src/schemas.ts`, valida um `hello` e um `act`, e imprime `smoke do protocolo ok`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm install && pnpm --filter @coringa/protocol test:coverage && pnpm --filter @coringa/protocol smoke && pnpm --filter @coringa/protocol typecheck`
Expected: PASS; cobertura ≥ 90%; `smoke do protocolo ok`.

- [ ] **Step 5: Commit**

```bash
git add packages/protocol pnpm-lock.yaml
git commit -m "feat(protocol): mensagens, esquemas, código da sala e apelido"
```

---

### Tarefa 2: `RoomClient` e chamadas HTTP

Spec §3, §4.2, §4.5–§4.7, §10.2.

**Files:**
- Create: `packages/protocol/src/client.ts`
- Modify: `packages/protocol/src/index.ts` (reexportar)
- Test: `packages/protocol/test/client.test.ts`

**Interfaces:**
- Consumes: Tarefa 1 (`CLOSE`, `FINAL_CLOSE_CODES`, `SLOW_RETRY_CODES`, tempos, tipos de mensagem).
- Produces (`src/client.ts`):
  - `type ConnectionEvent = { type: 'open' } | { type: 'room'; room: RoomMessage } | { type: 'state'; state: StateMessage } | { type: 'error'; error: ErrorMessage } | { type: 'closed'; code: number; final: boolean }`.
  - `interface RoomConnection`:
    - `readonly playerId: PlayerId | null; readonly room: RoomMessage | null; readonly state: StateMessage | null`;
    - `subscribe(listener: (e: ConnectionEvent) => void): () => void`;
    - `ready(value: boolean): void; leave(): void; rematch(want: boolean): void; close(): void`;
    - `act(action: PlayerAction): Promise<AckMessage>; concede(): Promise<AckMessage>`;
    - `remainingMs(deadline: Deadline): number`.
  - `interface RoomClientOptions { server: string; code: string; token: string; WebSocketImpl?: typeof WebSocket; random?: () => number; setTimer?: (fn: () => void, ms: number) => unknown; clearTimer?: (h: unknown) => void; now?: () => number }`.
  - `class RoomClient implements RoomConnection`, com `constructor(options: RoomClientOptions)` e `connect(): void`.
  - Chamadas HTTP, todas lançando `HttpError { status: number }` quando a resposta não é 2xx:
    - `createRoom(server: string, nickname: string, fetchImpl?: typeof fetch): Promise<CreateRoomResponse>`;
    - `joinRoom(server: string, code: string, nickname: string, fetchImpl?): Promise<JoinRoomResponse>`;
    - `roomInfo(server: string, code: string, fetchImpl?): Promise<RoomInfoResponse>`.

- [ ] **Step 1: Escrever os testes** (com um `FakeWebSocket` no próprio arquivo de teste, que registra `sent` e permite `serverSend(msg)` e `serverClose(code)`, e relógio/timers falsos injetados)

```ts
it('conecta em ws(s)://…/api/rooms/:code/ws e manda hello com lastSeq', () => { /* open → sent[0] = { t:'hello', protocol:1, token, } sem lastSeq; depois de um state seq 9, reconexão manda lastSeq: 9 */ });
it('ping a cada 15 s enquanto aberto', () => { /* avança 15_000 → sent inclui 'ping' */ });
it('act usa a época do último state e um id novo; resolve com o ack do mesmo id', async () => {
  // state { seq: 5, epoch: 7 } → act(PASS) → sent { t:'act', id: <string 1..64>, epoch: 7, action: {type:'PASS'} }
  // serverSend({ t:'ack', id, ok:true, seq:6 }) → promessa resolve com esse ack
});
it('descarta state com seq menor que o último; aceita igual (reconexão)', () => { /* seq 9 depois seq 8 → client.state.seq === 9; seq 9 de novo → aceito */ });
it('queda: reconecta com 500, 1000, 2000, 4000, 5000, 5000 ms (±20%)', () => { /* random = () => 0.5 → sem variação; conta os tempos agendados */ });
it.each([1000, 4000, 4001, 4003, 4009])('fechamento %i é final: não reconecta e emite closed final', (code) => { /* … */ });
it.each([1008, 4029])('fechamento %i espera 30 s antes de reconectar', (code) => { /* … */ });
it('pendências de act rejeitam com DISCONNECTED na queda', async () => {
  // act pendente; serverClose(1006) → resolve { ok:false, code:'DISCONNECTED' }
});
it('remainingMs usa o relógio do servidor (relógio local adiantado 3 min)', () => {
  // now() local = 1_000_000 + 180_000; state.serverNow = 1_000_000 recebido nesse instante;
  // deadline.at = 1_030_000 → remainingMs = 30_000
});
it('createRoom/joinRoom/roomInfo: POST/GET com JSON; status não 2xx vira HttpError', async () => { /* fetch falso: 201 → objeto; 409 → HttpError status 409 */ });
```

- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/protocol test` → FAIL.

- [ ] **Step 3: Implementar `RoomClient`**

- A URL do WebSocket troca `http`→`ws` e `https`→`wss` em `${server}/api/rooms/${code}/ws`.
- Diferença de relógio: `offset = state.serverNow − now()` na chegada de cada `state`/`welcome`. `remainingMs(d) = max(0, d.at − (now() + offset))`.
- Reconexão segue `RECONNECT_DELAYS_MS` com variação de `±RECONNECT_JITTER` sobre `random()`. O índice volta a 0 a cada `open`.
- O `id` de jogada é um prefixo aleatório da instância (6 caracteres de `random()`) + `-` + contador.

- [ ] **Step 4: Rodar e ver passar** — `pnpm --filter @coringa/protocol test:coverage` → PASS, ≥ 90%.

- [ ] **Step 5: Commit** — `git commit -m "feat(protocol): RoomClient com reconexão, ping, ack e relógio do servidor"`

---

### Tarefa 3: Esqueleto do `@coringa/server`, ferramental Cloudflare e primitivas do núcleo

Spec §1, §6.1, §6.5, §8.2, §9.1, §10.1, §11.1.

**Files:**
- Create: `packages/server/package.json`, `tsconfig.json`, `tsconfig.worker.json`, `vitest.config.ts`, `vitest.worker.config.ts`, `wrangler.jsonc`, `src/core/types.ts`, `src/core/timers.ts`, `src/core/agenda.ts`, `src/core/epoch.ts`, `src/core/limiter.ts`, `src/core/tokens.ts`, `src/core/effects.ts`, `src/core/storage-layout.ts`, `src/worker/index.ts`, `src/worker/room.ts` (classe vazia por enquanto)
- Modify: `pnpm-workspace.yaml`, `eslint.config.js`, `.gitignore`
- Test: `packages/server/test/core/primitives.test.ts`, `packages/server/test/worker/health.test.ts`

**Interfaces:**
- Consumes: `@coringa/engine` (`GameState`, `GameEvent`, `Action`, `PlayerId`, `RulesConfig`), `@coringa/protocol`.
- Produces:
  - `src/core/timers.ts`:
    - `TIMERS = { equipMs: 40_000, orderMs: 10_000, turnMs: 30_000, reactionMs: 8_000, reactionMinMs: 2_000, reconnectMs: 60_000, afkStrikes: 3, graceMs: 500, presenceSweepMs: 20_000, silentDropMs: 45_000, helloTimeoutMs: 10_000, idleExpiryMs: 1_800_000, hardExpiryMs: 86_400_000 } as const`;
    - `STATE_SCHEMA = 1`;
    - `ROOM_LIMITS = { sockets: 8, unauthSockets: 4, bucketCapacity: 20, bucketRefillPerSec: 10, maxDrops: 100, maxMalformed: 20, recentSteps: 50, ackHistory: 64, createAttempts: 5 } as const`.
  - `src/core/types.ts`:
    - `SeatId = 'p1' | 'p2'`;
    - `SeatRecord { id: SeatId; nickname: string; tokenHash: string; ready: boolean; wantsRematch: boolean; offlineSince: number | null }`;
    - `ReplayStep { player: PlayerId | 'system'; action: Action }`;
    - `Replay { name: string; config: RulesConfig; seed: string; players: [PlayerId, PlayerId]; steps: ReplayStep[] }` (mesmo formato de `packages/sim/src/replay.ts`);
    - `StepRecord { seq: number; events: GameEvent[] }`;
    - `GameRecord { gameNo: number; seed: string; state: GameState; startedAt: number; steps: ReplayStep[]; recent: StepRecord[]; phaseStartedAt: number; phaseDeadlineAt: number | null; pausedTurnMs: number | null; heldPass: { epoch: number; id: string } | null; strikes: Record<SeatId, number>; acks: Record<SeatId, AckMessage[]>; cause: OutcomeCause | null }`;
    - `AgendaItem`: `{ kind: 'phase'; at: number; epoch: number }` · `{ kind: 'reactionMin'; at: number; epoch: number }` · `{ kind: 'reconnect'; at: number; seat: SeatId; gameNo: number }` · `{ kind: 'presenceSweep'; at: number; gameNo: number }` · `{ kind: 'idleExpiry'; at: number }` · `{ kind: 'hardExpiry'; at: number }`;
    - `RoomRecord { schema: number; code: string; createdAt: number; status: RoomStatus; seats: SeatRecord[]; score: Score; gameNo: number; outcome: Outcome | null; seq: number; epoch: number; game: GameRecord | null; agenda: AgendaItem[] }`;
    - `SocketInfo { socketId: string; seat: SeatId | null; connectedAt: number; lastSeenAt: number }`;
    - `LogLine`: a união das linhas de spec §10.4, com `evt` literal e os campos da tabela; `protocol.violation` tem `kind: 'MALFORMED' | 'RATE' | 'ORIGIN' | 'AUTH'`;
    - `Effects { send: { socketId: string; message: ServerMessage }[]; close: { socketId: string; code: number; reason: string }[]; attach: { socketId: string; seat: SeatId }[]; persist: boolean; alarm: number | null; deleteAll: boolean; logs: LogLine[] }`. Todo método do `RoomCore` devolve `alarm = nextAlarm(record.agenda)` (ou `null` sem registro): é o alarme **desejado**, e a casca só chama `setAlarm` quando ele muda;
    - `CoreDeps { randomBytes(n: number): Uint8Array; newSeed?(): string }`;
    - `CoreResult<T, E extends string> = { ok: true; value: T; effects: Effects } | { ok: false; error: E; effects: Effects }`.
  - `src/core/agenda.ts`:
    - `nextAlarm(agenda: AgendaItem[]): number | null` (o menor `at`);
    - `dueItems(agenda: AgendaItem[], now: number): AgendaItem[]` (com `at ≤ now`, em ordem de `at`; empate pela ordem de inserção);
    - `withItem(agenda, item)`, que substitui o item de mesma identidade: `phase`, `reactionMin`, `presenceSweep`, `idleExpiry` e `hardExpiry` são únicos; `reconnect` é único por `seat`;
    - `withoutKinds(agenda, kinds: AgendaItem['kind'][], seat?: SeatId)`.
  - `src/core/epoch.ts`: `phaseKey(state: GameState): string` = `JSON.stringify([state.round, kind, player | responder | null, trigger | null])` (GAME_OVER: `[round, 'GAME_OVER', null, null]`).
  - `src/core/limiter.ts`: `class TokenBucket` com `constructor(capacity: number, refillPerSec: number, now: number)` e `take(now: number): boolean`.
  - `src/core/tokens.ts`:
    - `base64url(bytes: Uint8Array): string`;
    - `hex(bytes: Uint8Array): string`;
    - `sha256Hex(text: string): Promise<string>`, via `crypto.subtle.digest`, global no Node 24 e no workerd.
  - `src/core/effects.ts`: `emptyEffects(): Effects` e `mergeEffects(a: Effects, b: Effects): Effects` (concatena listas; `persist`/`deleteAll` por OU; `alarm` fica com o de `b`).
  - `src/core/storage-layout.ts`:
    - `STORAGE_KEYS = ['room', 'game', 'recent', 'log'] as const`;
    - `splitRecord(record: RoomRecord): { room: Omit<RoomRecord, 'game'> & { hasGame: boolean }; game: Omit<GameRecord, 'steps' | 'recent'> | null; recent: StepRecord[]; log: ReplayStep[] }`;
    - `joinRecord(parts: Partial<ReturnType<typeof splitRecord>>): RoomRecord | null`, que dá `null` sem `room`.
    - Cada chave fica limitada: `recent` tem no máximo 50 passos, e `log` só cresce até o fim da partida, que o anti-travamento limita.
  - `src/worker/index.ts`: por enquanto, `GET /api/health` → `{ ok: true, version: env.VERSION }` e o resto → 404. Exporta `Room`.

- [ ] **Step 1: Ferramental** (configuração validada no protótipo; copie)

`pnpm-workspace.yaml` → em `allowBuilds`, além do `simple-git-hooks: false` que já existe: `esbuild: true` e `workerd: true`, com um comentário de que são o bundler do wrangler e o runtime local.

`eslint.config.js`:
- em `ignores`, acrescentar `'**/worker-configuration.d.ts'` e `'**/.wrangler/**'`;
- novo bloco `{ files: ['packages/server/src/core/**/*.ts', 'packages/protocol/src/**/*.ts'], rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['cloudflare:*'], message: 'O núcleo e o protocolo rodam no Node puro: nada de cloudflare:*.' }] }] } }`.

`.gitignore` → `.wrangler/` e `worker-configuration.d.ts`.

`packages/server/wrangler.jsonc`:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "jogo-do-coringa",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-10-01",
  "durable_objects": { "bindings": [{ "name": "ROOMS", "class_name": "Room" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Room"] }],
  "ratelimits": [
    { "name": "CREATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 10, "period": 60 } },
    { "name": "JOIN_LIMITER", "namespace_id": "1002", "simple": { "limit": 60, "period": 60 } }
  ],
  "observability": { "enabled": true },
  "vars": { "ALLOWED_ORIGINS": "http://localhost:*", "VERSION": "dev" }
}
```

`packages/server/package.json`:
- dependências: `@coringa/engine` e `@coringa/protocol` (`workspace:*`);
- devDependencies: `wrangler@^4.151.0`, `@cloudflare/vitest-plugin@^1.4.0`, `@types/node@^24`, `@vitest/coverage-v8@^5.0.0`, `typescript@~6.0.3`, `vite@^8.3.4`, `vitest@^5.0.4`;
- scripts:

```json
"typecheck": "wrangler types && tsc -p tsconfig.json && tsc -p tsconfig.worker.json",
"test": "vitest run && vitest run -c vitest.worker.config.ts",
"test:coverage": "vitest run --coverage && vitest run -c vitest.worker.config.ts",
"smoke": "node scripts/smoke.ts && wrangler deploy --dry-run --outdir .wrangler/dry-run",
"dev": "wrangler dev",
"deploy": "node scripts/deploy.ts"
```

Até a Tarefa 10, `scripts/smoke.ts` só imprime `smoke do servidor: pendente`.

`tsconfig.json`: estende o base, com `types: ["node"]` e `include: ["src/core", "test/core", "scripts", "vitest.config.ts", "vitest.worker.config.ts"]`.

`tsconfig.worker.json`: estende o base, com `types: ["@cloudflare/vitest-plugin/types"]` e `include: ["worker-configuration.d.ts", "src", "test/worker"]`. Ele também checa o núcleo com os tipos do workerd, o que prova que o núcleo não usa API só do Node.

`vitest.config.ts`: `include: ['test/core/**/*.test.ts']`, cobertura v8 com `include: ['src/core/**/*.ts']`, `exclude: ['src/core/types.ts']` e meta de 90/90.

`vitest.worker.config.ts`:

```ts
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
  test: { include: ['test/worker/**/*.test.ts'] },
});
```

- [ ] **Step 2: Escrever os testes**

`test/core/primitives.test.ts`:

```ts
it('agenda: próximo alarme e vencidos em ordem', () => {
  const a = [{ kind: 'hardExpiry', at: 90 }, { kind: 'phase', at: 10, epoch: 1 }, { kind: 'reconnect', at: 10, seat: 'p2', gameNo: 1 }] as AgendaItem[];
  expect(nextAlarm(a)).toBe(10);
  expect(dueItems(a, 10).map((i) => i.kind)).toEqual(['phase', 'reconnect']);
  expect(nextAlarm([])).toBeNull();
  expect(withItem(a, { kind: 'phase', at: 20, epoch: 2 }).filter((i) => i.kind === 'phase')).toEqual([{ kind: 'phase', at: 20, epoch: 2 }]);
  expect(withItem(a, { kind: 'reconnect', at: 5, seat: 'p1', gameNo: 1 }).filter((i) => i.kind === 'reconnect')).toHaveLength(2);
});
it('phaseKey: confirmar o Equipar não muda; jogar K muda e a volta repete a chave de antes', () => {
  // setup() do motor (packages/engine/test/helpers.ts): EQUIP com pendentes nos dois → act p1 EQUIP → expect(keyDepois).toBe(keyAntes)
  // ATTACK_MAIN p1 com K na mão: k0 → PLAY_K → k1 (REACTION p2) → PASS de p2 → k2 (ATTACK_MAIN p1)
  expect(k1).not.toBe(k0);
  expect(k2).not.toBe(k1);
  expect(k2).toBe(k0);
});
it('TokenBucket: 20 de uma vez, depois 10/s', () => {
  const b = new TokenBucket(20, 10, 0);
  expect(Array.from({ length: 21 }, () => b.take(0)).filter(Boolean)).toHaveLength(20);
  expect(b.take(99)).toBe(false);
  expect(b.take(100)).toBe(true); // 0,1 s → 1 ficha
});
it('storage-layout: splitRecord e joinRecord vão e voltam iguais, com e sem partida; sem room → null', () => {
  // registro com game (setup() do motor) e sem game; expect(joinRecord(splitRecord(r))).toEqual(r); expect(joinRecord({})).toBeNull()
});
it('tokens: base64url de 32 bytes tem 43 caracteres; sha256Hex é o hash conhecido', async () => {
  expect(base64url(new Uint8Array(32).fill(255))).toHaveLength(43);
  expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
```

Nota para o `phaseKey`: como `k2 === k0`, a época não pode ser derivada da chave. Ela é um **contador de mudanças**: o núcleo compara a chave depois de cada passo com a de antes **daquele passo** e soma 1 quando difere. Voltar a `ATTACK_MAIN p1` depois da reação conta como mudança, e uma jogada mandada antes do K fica velha (spec §4.5).

`test/worker/health.test.ts`:

```ts
it('GET /api/health', async () => {
  const res = await SELF.fetch('https://x/api/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, version: 'dev' });
  expect((await SELF.fetch('https://x/nada')).status).toBe(404);
});
```

- [ ] **Step 3: Rodar e ver falhar** — `pnpm install && pnpm --filter @coringa/server test` → FAIL.

- [ ] **Step 4: Implementar as primitivas e o Worker mínimo** conforme as interfaces.

- [ ] **Step 5: Rodar tudo**

Run: `pnpm --filter @coringa/server typecheck && pnpm --filter @coringa/server test:coverage && pnpm check`
Expected: PASS; o workerd sobe (sem "Timeout starting cloudflare-pool runner"); cobertura do núcleo ≥ 90%.

- [ ] **Step 6: Commit** — `git commit -m "feat(server): esqueleto Cloudflare, agenda, época, limite e tokens"`

---

### Tarefa 4: Sala — criar, entrar, consultar (núcleo)

Spec §2.1–§2.4, §3.

**Files:**
- Create: `packages/server/src/core/room-core.ts`, `packages/server/src/core/views.ts` (só `roomMessage` nesta tarefa), `packages/server/test/core/harness.ts`
- Test: `packages/server/test/core/room.test.ts`

**Interfaces:**
- Consumes: Tarefas 1 e 3.
- Produces:
  - `class RoomCore` em `src/core/room-core.ts`:
    - `constructor(record: RoomRecord | null, deps: CoreDeps)`;
    - `get record(): RoomRecord | null`;
    - `create(code: string, nickname: string, now: number): Promise<CoreResult<CreateRoomResponse, 'EXISTS' | 'BAD_NICKNAME'>>`;
    - `join(nickname: string, sockets: SocketInfo[], now: number): Promise<CoreResult<JoinRoomResponse, 'NOT_FOUND' | 'FULL' | 'BAD_NICKNAME'>>`;
    - `info(): RoomInfoResponse | null`.
  - `roomMessage(record: RoomRecord, sockets: SocketInfo[], now: number): RoomMessage` em `views.ts`.
    - `connected` = há socket com aquele `seat`.
    - `woAt` = `offlineSince + TIMERS.reconnectMs`, só em PLAYING.
    - `expiresAt` = o menor `at` entre `idleExpiry` e `hardExpiry` da agenda; sem nenhum dos dois, `createdAt + hardExpiryMs`.
  - `class Harness` em `test/core/harness.ts`, que as próximas tarefas estendem:
    - `now: number` (começa em `1_000_000`);
    - `core: RoomCore`; `logs: LogLine[]`; `alarm: number | null`; `deleted: boolean`;
    - `static deps(seed?: string): CoreDeps`: `randomBytes` vem do PRNG do motor (`seedRng`/`nextInt`), e `newSeed` devolve `'semente-1'`, `'semente-2'`, …;
    - `apply(e: Effects): void` guarda logs, alarme, `deleteAll` e entregas;
    - `create(nickname = 'Ana'): Promise<CreateRoomResponse>` usa o código `'K7M2QX'`;
    - `join(nickname = 'Bia'): Promise<JoinRoomResponse>`.

- [ ] **Step 1: Escrever os testes**

```ts
it('criar ocupa p1, grava o hash do token e loga room.created', async () => {
  const h = new Harness();
  const r = await h.create('  Ana ');
  expect(r).toMatchObject({ code: 'K7M2QX', playerId: 'p1' });
  expect(r.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const rec = h.core.record!;
  expect(rec).toMatchObject({ schema: 1, status: 'LOBBY', gameNo: 0, seq: 0, epoch: 0, score: { p1: 0, p2: 0, draws: 0 } });
  expect(rec.seats).toEqual([{ id: 'p1', nickname: 'Ana', tokenHash: await sha256Hex(r.token), ready: false, wantsRematch: false, offlineSince: 1_000_000 }]);
  expect(JSON.stringify(rec)).not.toContain(r.token);
  expect(h.logs).toContainEqual({ evt: 'room.created', code: 'K7M2QX', playerId: 'p1' });
});
it('criar de novo no mesmo objeto → EXISTS; apelido inválido → BAD_NICKNAME sem gravar', async () => { /* … persist false no segundo caso */ });
it('entrar ocupa p2; terceira entrada → FULL; sala vazia → NOT_FOUND sem gravar', async () => {
  const empty = new RoomCore(null, Harness.deps());
  const nf = await empty.join('Bia', [], 0);
  expect(nf).toMatchObject({ ok: false, error: 'NOT_FOUND' });
  expect(nf.effects.persist).toBe(false);
  expect(empty.record).toBeNull();
  // h.create(); h.join() → p2; h.join('Caio') → FULL
});
it('assento livre: depois que p1 sai, quem entra fica com p1', async () => { /* manipula record.seats = [p2] e chama join → playerId 'p1' */ });
it('dois join ao mesmo tempo (Promise.all) → um ok e um FULL', async () => {
  const h = new Harness();
  await h.create();
  const [a, b] = await Promise.all([h.core.join('Bia', [], h.now), h.core.join('Caio', [], h.now)]);
  expect([a.ok, b.ok].sort()).toEqual([false, true]);
  expect(h.core.record!.seats).toHaveLength(2);
});
it('info: dados públicos sem token nem hash', async () => {
  // { code: 'K7M2QX', status: 'LOBBY', nicknames: ['Ana', 'Bia'], full: true }; sala vazia → null
});
```

- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/server test` → FAIL.

- [ ] **Step 3: Implementar**

- O token é `base64url(deps.randomBytes(32))`.
- **Ordem contra corrida:** gerar o token e fazer o `await sha256Hex` **antes** de ler o registro. Depois disso, ler `seats`, escolher o assento e gravar sem nenhum `await` no meio. O Durable Object entrega outros eventos enquanto o `crypto.subtle` roda; lendo antes do `await`, dois cliques em "Entrar" ocupariam o `p2` duas vezes. Vale para `create` e `join`.
- `offlineSince` começa em `now`: o jogador ainda não conectou.
- Todo sucesso retorna `persist: true` e manda `room` aos sockets autenticados (no `join`).

- [ ] **Step 4: Rodar e ver passar** — `pnpm --filter @coringa/server test:coverage` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(server): sala com assentos p1/p2, token com hash e consulta pública"`

---

### Tarefa 5: Sockets, `hello` e lobby (núcleo)

Spec §2.3, §2.6, §4.1–§4.3, §4.8, §7.1 (conferência de sinal na largada), §8.1–§8.3.

**Files:**
- Modify: `packages/server/src/core/room-core.ts`, `src/core/views.ts`
- Create: `packages/server/src/core/game.ts` (só `startGame` nesta tarefa)
- Modify: `packages/server/test/core/harness.ts`
- Test: `packages/server/test/core/lobby.test.ts`

**Interfaces:**
- Consumes: Tarefa 4.
- Produces:
  - em `RoomCore`:
    - `onOpen(socket: SocketInfo, sockets: SocketInfo[], now: number): Effects`;
    - `onMessage(socketId: string, raw: string | ArrayBuffer, sockets: SocketInfo[], now: number): Promise<Effects>`;
    - `onClose(socketId: string, sockets: SocketInfo[], now: number): Effects`. A presença completa vem na Tarefa 8; aqui só marca `offlineSince` e desmarca o pronto no lobby.
  - `startGame(record: RoomRecord, deps: CoreDeps, now: number): StateStep` em `game.ts`. Sobe `gameNo`, cria o `GameRecord` com `createGame(DEFAULT_CONFIG, seed, ['p1', 'p2'])`, põe o status em `PLAYING`, zera `ready`/`wantsRematch`/`outcome`, faz `seq += 1` e `epoch += 1`, e inicia `recent` com `[{ seq, events: [] }]` e `phaseStartedAt = now`.
  - `StateStep = { seq: number; events: GameEvent[]; messages: Record<SeatId, StateMessage> }`, montado por `makeStep(record: RoomRecord, events: GameEvent[], now: number): StateStep` em `game.ts`.
    - As mensagens são montadas **na hora do passo**, com `stateFor`, antes de qualquer passo seguinte.
    - Um estouro seguido de passos automáticos gera vários `StateStep`, e cada um leva a visão daquele instante.
    - O `RoomCore` só roteia `messages[seat]` para o socket de cada assento.
  - `stateFor(record: RoomRecord, seat: SeatId, events: GameEvent[], now: number, flags?: { catchUp?: true; resync?: true }): StateMessage` em `views.ts`. Os prazos ficam `null` até a Tarefa 7.
  - `Harness`:
    - `open(): FakeSocket`;
    - `send(sock: FakeSocket, msg: ClientMessage | string | ArrayBuffer): Promise<void>`;
    - `close(sock: FakeSocket): void`;
    - `silent(sock: FakeSocket): void`, que congela o `lastSeenAt`;
    - `static lobby(): Promise<{ h: Harness; p1: FakeSocket; p2: FakeSocket; tokens: Record<SeatId, string> }>`, com os dois assentos ocupados e autenticados;
    - `static playing(): Promise<…>`, que é o `lobby` com os dois prontos;
    - `messages(sock, t?)`.
  - `FakeSocket { id: string; seat: SeatId | null; open: boolean; inbox: ServerMessage[]; closed: { code: number; reason: string } | null }`.

- [ ] **Step 1: Escrever os testes**

```ts
it('hello válido: welcome, room para todos e attach do assento', async () => {
  const { h, p1 } = await Harness.lobby();
  expect(p1.inbox[0]).toEqual({ t: 'welcome', protocol: 1, playerId: 'p1', serverNow: expect.any(Number) });
  expect(h.messages(p1, 'room').at(-1)).toMatchObject({ status: 'LOBBY', seats: [{ playerId: 'p1', connected: true }, { playerId: 'p2', connected: true }] });
});
it('primeira mensagem não-hello → 4003; protocolo 2 → error PROTOCOL_MISMATCH e 4001; token errado → 4003', async () => { /* … */ });
it('binário → 1003; frame de 4097 bytes → 1009 (conta bytes UTF-8)', async () => { /* 'é'.repeat(2049) tem 4098 bytes */ });
it('nona conexão e quinta sem autenticação → 4029', async () => { /* … */ });
it('sala inexistente: onOpen fecha 4000 e não grava', () => { /* core com record null */ });
it('segunda aba com o mesmo token derruba a primeira com 4009', async () => { /* … */ });
it('ready fora do lobby → error WRONG_STATUS; leave libera o assento e fecha 1000', async () => { /* … */ });
it('começa só com os dois prontos e conectados; state inicial para cada um com a própria mão', async () => {
  const { h, p1, p2 } = await Harness.lobby();
  await h.send(p1, { t: 'ready', ready: true });
  expect(h.core.record!.status).toBe('LOBBY');
  await h.send(p2, { t: 'ready', ready: true });
  const rec = h.core.record!;
  expect(rec).toMatchObject({ status: 'PLAYING', gameNo: 1, seq: 1, epoch: 1 });
  expect(rec.game!.seed).toBe('semente-1');
  const s1 = h.messages(p1, 'state').at(-1)!;
  expect(s1.view).toEqual(viewFor(rec.game!.state, 'p1'));
  expect(JSON.stringify([...p1.inbox, ...p2.inbox])).not.toContain('semente-1');
  expect(h.logs).toContainEqual({ evt: 'game.started', code: 'K7M2QX', gameNo: 1 });
});
it('cair no lobby desmarca o pronto; sinal velho (> 45 s) na largada fecha 4008 e não começa', async () => { /* silent(p2); avança 46 s; p1 ready → p2 fechado 4008 "sem sinal", status LOBBY */ });
it('mensagens malformadas: erro BAD_MESSAGE; a 21ª fecha 1008 e loga protocol.violation MALFORMED', async () => { /* … */ });
it('limite por conexão: 21 mensagens no mesmo instante → a 21ª recebe RATE_LIMITED sem processar; 101 descartes → 1008 e protocol.violation RATE', async () => { /* act com id → ack RATE_LIMITED; outras → error RATE_LIMITED */ });
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar**

- **`onMessage`:**
  - a ordem de checagem é: frame (binário, tamanho), limite por conexão, autenticação, esquema e, por fim, despacho;
  - o único `await` é o `sha256Hex` do token no `hello`, **antes** de ler ou alterar o registro (spec §9.1);
  - os baldes `TokenBucket`, os descartes e as mensagens malformadas ficam num `Map<socketId, …>` em memória.
- **`hello`:**
  - fecha outra conexão do mesmo assento com 4009, devolve `attach`, zera `offlineSince` e manda `welcome`;
  - manda `room` a todos os sockets autenticados;
  - se houver partida, manda `state` com `resync: true`. A volta com eventos perdidos é da Tarefa 8.
- **Largada:** a conferência de sinal usa `SocketInfo.lastSeenAt ≥ now − TIMERS.silentDropMs`. Um socket sem sinal é fechado com 4008, motivo `'sem sinal'`, e o pronto daquele jogador cai.

- [ ] **Step 4: Rodar e ver passar.**

- [ ] **Step 5: Commit** — `git commit -m "feat(server): hello, lobby, pronto e largada da partida"`

---

### Tarefa 6: Jogada, passo, fim de partida, desistência e revanche (núcleo)

Spec §2.3 (revanche, placar), §4.5, §4.6, §5, §7.4, §10.4 (`game.ended`, `game.replay`).

**Files:**
- Modify: `packages/server/src/core/game.ts`, `src/core/room-core.ts`, `src/core/views.ts`
- Test: `packages/server/test/core/game.test.ts`

**Interfaces:**
- Consumes: Tarefas 3–5; `applyAction`, `actingPlayers` e `viewEvents` do motor.
- Produces (em `game.ts`):
  - `commitStep(record: RoomRecord, actor: SeatId | 'system', action: Action, result: { state: GameState; events: GameEvent[] }, now: number): StateStep`. Implementa os itens 1–6 de spec §5: `seq`, `epoch` pela comparação de `phaseKey` antes e depois, `steps`, `recent` cortado em 50, zerar `strikes[actor]` quando `actor` não é `'system'` e, em `GAME_OVER`, chamar `finishGame`.
  - `playerAct(record: RoomRecord, seat: SeatId, msg: { id: string; epoch: number; action: PlayerAction }, now: number): { ack: AckMessage; steps: StateStep[] }`. Cobre as etapas 3–8 de spec §4.6; as etapas 1–2 ficam no `RoomCore`.
  - `autoSteps(record: RoomRecord, now: number): StateStep[]`. Equipar automático para quem tem `pending.length === 0` no começo de uma rodada de Equipar; a Tarefa 7 acrescenta o W.O. por estouros.
  - `finishGame(record: RoomRecord, cause: OutcomeCause, now: number): LogLine[]`.
    - Status `FINISHED` e `outcome`.
    - Placar: vitória soma ao vencedor; `DRAW` soma em `draws`; `ABANDONED` não mexe.
    - Linhas `game.ended` (com `rounds = state.round`, `durationMs = now − startedAt`, `steps = steps.length`) e `game.replay` (`name: 'sala-<código>-<gameNo>'`).
  - `concede(record: RoomRecord, seat: SeatId, id: string, now: number): { ack: AckMessage; steps: StateStep[] }`, que injeta `FORFEIT { loser: seat }` com causa `CONCEDE`.
  - `rematch(record: RoomRecord, seat: SeatId, want: boolean, sockets: SocketInfo[], deps: CoreDeps, now: number): StateStep | null`. Devolve o passo de largada quando a revanche começa, senão `null` (só muda o pedido e o `RoomCore` manda `room`).
  - Na `Harness`:
    - `static fromState(state: GameState): Promise<{ h; p1; p2 }>`;
    - `lastStepEvents(): GameEvent[]` (= `record.game.recent.at(-1).events`);
    - `playToEnd(): Promise<void>`, que manda a primeira ação legal de quem age até `FINISHED`, com limite de 5 000 passos.

- [ ] **Step 1: Escrever os testes**

```ts
it('act válido: state para os dois com a própria visão e os eventos redigidos; depois o ack', async () => {
  const { h, p1, p2 } = await Harness.playing();
  const rec = h.core.record!;
  const action = legalActions(viewFor(rec.game!.state, 'p1')).find((a) => a.type === 'EQUIP')!;
  await h.send(p1, { t: 'act', id: 'a1', epoch: rec.epoch, action });
  const last1 = p1.inbox.slice(-2);
  expect(last1.map((m) => m.t)).toEqual(['state', 'ack']);
  expect(last1[1]).toEqual({ t: 'ack', id: 'a1', ok: true, seq: 2 });
  const st2 = h.messages(p2, 'state').at(-1)!;
  expect(st2.events).toEqual(viewEvents(h.lastStepEvents(), 'p2'));
  expect(st2.view).toEqual(viewFor(h.core.record!.game!.state, 'p2'));
});
it('ordem de recusa: NOT_PLAYING, STALE_EPOCH, erro do motor só para quem jogou, nada gravado', async () => { /* … */ });
it('confirmação do Equipar de um não invalida a do outro (mesma época)', async () => { /* p1 e p2 mandam EQUIP com a mesma epoch → os dois ok */ });
it('mesmo id duas vezes → o mesmo ack, aplicado uma vez (seq não sobe)', async () => { /* … */ });
it('clique duplo: dois ids, mesma jogada → o segundo recebe o erro do motor', async () => {
  // estado montado com setup(): ATTACK_MAIN p1 com um J na mão → PLAY_J id 'a1' ok; PLAY_J id 'a2' mesma carta → ack { ok:false, code:'CARD_NOT_IN_HAND' }
});
it('Equipar automático para quem recebeu zero numéricas (passo próprio, sem zerar estouros)', async () => { /* setup com pending [] para p2 no começo do Equipar */ });
it('fim de partida: FINISHED, placar, outcome NORMAL, logs game.ended e game.replay reexecutável', async () => {
  // joga até GAME_OVER com a primeira ação legal de quem age (helper h.playToEnd())
  // replay = linha game.replay; reexecutar com createGame + applyAction dá o mesmo estado final
});
it('desistência: FORFEIT do próprio jogador, causa CONCEDE, vitória do outro', async () => { /* … */ });
it('revanche: só com os dois pedindo e conectados; semente nova; gameNo 2; placar mantido', async () => { /* … */ });
```

Para montar estados específicos, construa o registro com o `setup` de `packages/engine/test/helpers.ts`, importado com caminho relativo (`../../../engine/test/helpers.ts`, como o simulador já faz). Use `Harness.fromState(state: GameState)`, que monta um `RoomRecord` em PLAYING com os dois sockets autenticados e `GameRecord` coerente (`seq: 1`, `epoch: 1`, `recent: [{ seq: 1, events: [] }]`). Acrescente esse helper nesta tarefa.

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar.**

- [ ] **Step 4: Rodar e ver passar.**

- [ ] **Step 5: Commit** — `git commit -m "feat(server): jogada com época e idempotência, fim, desistência e revanche"`

---

### Tarefa 7: Tempos — prazos de fase, pausa do turno, piso da reação, estouros

Spec §6 inteira, §7.3.

**Files:**
- Modify: `packages/server/src/core/game.ts`, `src/core/room-core.ts`, `src/core/views.ts`
- Test: `packages/server/test/core/timers.test.ts`

**Interfaces:**
- Consumes: Tarefa 6.
- Produces:
  - `onAlarm(sockets: SocketInfo[], now: number): Effects` em `RoomCore`. Processa `dueItems` em ordem, confere a chave de cada item, ignora os obsoletos, reprograma e devolve `alarm = nextAlarm(agenda)`.
  - `schedulePhase(record: RoomRecord, prev: { key: string; phase: Phase; deadlineAt: number | null }, events: GameEvent[], now: number): void` em `game.ts`, chamado pelo `commitStep` e pelo `startGame`. Regras:
    - época sem mudança → mantém o prazo;
    - `EQUIP` → `now + 40_000`; `ORDER_CHOICE` → `now + 10_000`;
    - `ATTACK_MAIN` com `TurnStarted` entre os eventos → `now + 30_000`;
    - `ATTACK_MAIN` sem `TurnStarted` e com `pausedTurnMs` → `now + pausedTurnMs`, depois `pausedTurnMs = null`;
    - `REACTION` vindo de `ATTACK_MAIN` do outro jogador com gatilho `K_PLAYED` ou `REFLECT_PLAYED` → `pausedTurnMs = max(0, prev.deadlineAt − now)`. Para qualquer `REACTION`, o prazo é `now + 8_000`;
    - `GAME_OVER` → sem prazo.
    - O item de agenda é `{ kind: 'phase', at: deadlineAt + 500, epoch }`, e `phaseStartedAt = now`.
  - `stateFor` passa a preencher `deadline = { kind, at: phaseDeadlineAt, players: actingPlayers(state) }`, com `EQUIP`→`EQUIP`, `ORDER_CHOICE`→`ORDER`, `ATTACK_MAIN`→`TURN` e `REACTION`→`REACTION`, e `pausedTurnMs` quando a fase é `REACTION`.
  - `applyTimeout(record, now): StateStep[]`:
    - antes de aplicar, soma 1 nos estouros: em `EQUIP`, para cada jogador em `actingPlayers` com pendentes; em `ATTACK_MAIN`, para o dono do turno;
    - injeta `applyAction(state, 'system', { type: 'TIMEOUT' })` por `commitStep`;
    - roda `autoSteps`, que agora inclui o W.O. por estouros (`FORFEIT`, causa `AFK`, log `wo.applied`). A regra "com o outro fora, abandono" chega na Tarefa 8.
  - **PASS guardado:** em `playerAct`, um `PASS` do respondente com `now < phaseStartedAt + 2_000` grava `heldPass` e agenda `{ kind: 'reactionMin', at: phaseStartedAt + 2_000, epoch }`. Responde `ack { ok: true, held: true }`. Outra jogada do respondente nessa época recebe `ALREADY_PASSED`.
  - `Harness.advance(ms: number): void`: avança `now` e, enquanto `h.alarm !== null && h.alarm ≤ now`, chama `onAlarm` no instante `h.alarm` (assim prazos encadeados disparam na ordem certa).

- [ ] **Step 1: Escrever os testes** (relógio falso: `h.advance(ms)` move `now` e chama `onAlarm` sempre que `now ≥ h.alarm`)

```ts
it('cada fase estoura com o efeito da spec (Equipar automático, ataca primeiro, declara, passa)', async () => { /* um caso por fase, com estados de setup() */ });
it('o prazo enviado é o mostrado; o estouro só vem 500 ms depois', async () => {
  const { h, p1 } = await Harness.playing();
  const at = h.messages(p1, 'state').at(-1)!.deadline!.at;
  expect(at).toBe(h.now + 40_000);
  h.advance(40_400);
  expect(h.core.record!.game!.state.phase.kind).toBe('EQUIP');
  h.advance(100);
  expect(h.core.record!.game!.state.round).toBe(2);
});
it('jogada dentro da margem de rede vale', async () => { /* avança 40_200; manda EQUIP → ok */ });
it('PENDÊNCIA: alarme atrasado depois da troca de fase não muda nada', async () => {
  // p1 e p2 confirmam o Equipar (época muda); força h.core.onAlarm(sockets, oldAt + 500) com o item velho ainda na agenda
  // (insira manualmente { kind:'phase', at: velho, epoch: épocaVelha }) → estado e seq iguais
});
it('alarme repetido (mesmo instante duas vezes) não aplica duas vezes', async () => { /* … */ });
it('turno pausa na janela do K e volta com o que sobrou', async () => {
  // ATTACK_MAIN p1 com K; avança 10_000; PLAY_K → state REACTION com pausedTurnMs 20_000 e deadline REACTION now+8_000
  // avança 3_000 (dentro do piso já passou); PASS de p2 → state ATTACK_MAIN p1 com deadline.at = now + 20_000
});
it('mesmo com Reflect: pausa e volta; turno novo começa com 30 s cheios', async () => { /* … */ });
it('PASS antes de 2 s fica guardado (held) e vale aos 2 s; TRAP antes de 2 s vale na hora', async () => {
  // REACTION aberta em t0; PASS em t0+600 → ack held; estado ainda REACTION; ALREADY_PASSED para outra jogada
  // advance até t0+2_000 → estado sai de REACTION; o oponente recebe o state só agora
});
it('estouros: Equipar + Turno + Turno seguidos → W.O. AFK; jogada voluntária zera', async () => { /* … */ });
it('estouro da Escolha da ordem e da janela de reação não contam', async () => { /* … */ });
it('nenhum TIMEOUT injetado é recusado pelo motor', async () => { /* joga uma partida só por estouros até o fim; todas as chamadas ok */ });
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar.**

- [ ] **Step 4: Rodar e ver passar.**

- [ ] **Step 5: Commit** — `git commit -m "feat(server): prazos por época, pausa do turno, piso da reação e estouros"`

---

### Tarefa 8: Presença, reconexão, W.O., abandono e expiração

Spec §2.5, §4.7, §7.1, §7.2, §9.2, §9.3.

**Files:**
- Create: `packages/server/src/core/presence.ts`
- Modify: `packages/server/src/core/room-core.ts`, `src/core/game.ts`
- Test: `packages/server/test/core/presence.test.ts`

**Interfaces:**
- Consumes: Tarefas 5–7.
- Produces:
  - `reconcile(sockets: SocketInfo[], now: number): Effects` em `RoomCore`. A casca o chama ao acordar, antes da primeira entrada.
    - `schema !== STATE_SCHEMA` → fecha todos os sockets com 4000, `deleteAll: true`, log `room.reset`, registro `null`.
    - Para cada assento sem socket vivo e com `offlineSince === null`: `offlineSince = now`. Em PLAYING, agenda `reconnect`.
    - Ninguém conectado → `idleExpiry` em `now + 30 min`.
    - Em PLAYING, garante que existe um `presenceSweep`.
  - Em `presence.ts`:
    - `markOffline(record, seat, since: number, now: number): LogLine[]`;
    - `markOnline(record, seat, now): LogLine[]`;
    - `sweep(record, sockets, now): { close: Effects['close']; logs: LogLine[] }`.
  - A varredura fecha com 4008:
    - sockets autenticados com `lastSeenAt < now − 45_000`. A saída conta de `lastSeenAt`, então o `reconnect` cai em `lastSeenAt + 60_000`; se esse instante já passou, o W.O. sai no mesmo alarme;
    - sockets sem `hello` com `connectedAt < now − 10_000`. Essa checagem também roda em cada `onOpen`.
  - **Ao vencer `reconnect`** (assento ainda fora, PLAYING, mesmo `gameNo`):
    - com o outro conectado → `FORFEIT`, causa `RECONNECT_TIMEOUT`, log `wo.applied`;
    - senão → `finishGame(…, 'ABANDONED')`.
    - O W.O. por estouros (Tarefa 7) segue a mesma regra do "outro conectado".
  - **`hello` com `lastSeq`:**
    - `lastSeq === seq` → `state` com `events: []` e `catchUp: true`;
    - `lastSeq < seq` e todos os passos de `lastSeq + 1` até `seq` em `recent` → `catchUp: true` com a concatenação de `viewEvents` de cada passo, em ordem;
    - qualquer outro caso (`lastSeq` ausente, maior que `seq` ou fora do anel) → `resync: true`.
  - **Expiração:**
    - `create` passa a agendar `hardExpiry` em `createdAt + 24 h` e `idleExpiry` em `createdAt + 30 min`;
    - um `hello` válido remove o `idleExpiry`; o último assento a sair agenda de novo;
    - ao vencer: fecha todos os sockets com 4000, `deleteAll: true`, log `room.expired` (`reason: 'IDLE' | 'HARD'`) e registro `null`.
    - Depois disso, qualquer entrada vê `record === null`: `onOpen` e `onMessage` fecham com 4000, `join` dá `NOT_FOUND`, e nada é gravado.

- [ ] **Step 1: Escrever os testes**

```ts
it('queda limpa na partida: woAt no room; volta aos 59 s cancela; aos 60 s W.O. RECONNECT_TIMEOUT', async () => { /* … */ });
it('os dois fora quando vence o prazo → abandono: FINISHED, result null, placar igual, logs game.ended ABANDONED e game.replay', async () => { /* … */ });
it('queda silenciosa: varredura (só em PLAYING) fecha 4008 e a saída conta do último sinal', async () => {
  // silent(p2) em t; advance 46_000 → p2 fechado 4008; woAt = t + 60_000
});
it('sem varredura fora de partida: no lobby, a agenda só tem expirações', async () => { /* agenda.kind ⊆ {idleExpiry, hardExpiry} */ });
it('reconciliação depois de reinício: assento sem socket vivo passa a estar fora agora', async () => {
  // registro em PLAYING com offlineSince null para os dois; new RoomCore(rec).reconcile([só p1], now) → p2.offlineSince = now; reconnect agendado
});
it('volta com eventos perdidos: ≤ 50 passos → catchUp em ordem; mais → resync; lastSeq > seq → resync', async () => { /* … */ });
it('expiração ociosa (30 min sem ninguém) e de teto (24 h): 4000, deleteAll, room.expired', async () => { /* … */ });
it('mensagem para sala já apagada → 4000, sem gravar', async () => { /* depois da expiração: onMessage → close 4000, persist false */ });
it('schema diferente ao acordar → room.reset e 4000', () => { /* … */ });
```

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar.**

- [ ] **Step 4: Rodar e ver passar.**

- [ ] **Step 5: Commit** — `git commit -m "feat(server): presença pelos sockets vivos, reconexão com eventos perdidos, W.O., abandono e expiração"`

---

### Tarefa 9: Propriedades com bots pelo núcleo

Spec §8.4, §11.3, §9.4.

**Files:**
- Create: `packages/server/test/core/properties.test.ts`
- Modify: `packages/server/test/core/harness.ts` (clientes simulados)

**Interfaces:**
- Consumes:
  - `RoomCore` (Tarefas 4–8);
  - os bots do simulador, por caminho relativo: `import { BOTS } from '../../../sim/src/bots/index.ts'`;
  - `createRng` de `../../../sim/src/rng.ts`.
- Produces: `Harness.simulateMatch(options: { seed: string; bots: [BotName, BotName]; chaos?: { dropEvery?: number; staleEvery?: number; duplicateEvery?: number }; maxSteps?: number }): Promise<MatchTrace>`. `MatchTrace`:
  - `outbox: Map<SeatId, ServerMessage[]>`;
  - `startSeq: number`, o `seq` da largada;
  - `finalRecord: RoomRecord`;
  - `ended: 'GAME_OVER' | 'ABANDONED'`;
  - `maxPartBytes: number`, o maior `JSON.stringify` entre as quatro partes de `splitRecord(core.record)` (Tarefa 3) depois de cada entrada;
  - `persists: number` e `alarmChanges: number`, contados nos `Effects`.

O estado e os eventos de cada passo **não** são capturados do núcleo. Eles saem da reexecução independente de `finalRecord.game.steps` no motor: o passo `startSeq + k` é o `k`-ésimo `applyAction` (k ≥ 1), e `startSeq` é a largada, sem eventos. Assim, a comparação não depende do código sob teste.

O cliente simulado faz o caminho do JSON de verdade:
- cada mensagem que sai do núcleo passa por `JSON.parse(JSON.stringify(m))`;
- cada mensagem que entra vai como string;
- quando o `state` recebido tem `legalActions(view)` não vazio, o bot escolhe e o cliente manda `act` com a época recebida;
- quando ninguém age, o relógio avança até o próximo alarme;
- com `chaos`:
  - `dropEvery = N`: a cada N passos, um dos sockets cai e volta com `lastSeq` depois de 5 s;
  - `staleEvery`: reenvia uma jogada com época velha;
  - `duplicateEvery`: reenvia o último `act` com o mesmo id.

- [ ] **Step 1: Escrever os testes**

```ts
const SEEDS = Array.from({ length: 12 }, (_, i) => `prop-${i}`);

it.each(SEEDS)('partida %s termina e o que sai para cada jogador é exatamente a redação do motor', async (seed) => {
  const trace = await Harness.simulateMatch({ seed, bots: ['greedy', 'random'], chaos: { dropEvery: 37, staleEvery: 23, duplicateEvery: 19 } });
  expect(['GAME_OVER', 'ABANDONED']).toContain(trace.ended);
  const replayed = replaySteps(trace.finalRecord.game!); // Map<seq, { state, events }>, reexecução no motor
  for (const seat of ['p1', 'p2'] as const) {
    for (const m of trace.outbox.get(seat)!) {
      expect(JSON.stringify(m)).not.toContain(trace.finalRecord.game!.seed);
      if (m.t !== 'state') continue;
      const at = replayed.get(m.seq)!;
      expect(m.view).toEqual(viewFor(at.state, seat));
      if (!m.catchUp && !m.resync) expect(m.events).toEqual(viewEvents(at.events, seat));
    }
  }
});
it.each(SEEDS)('reexecutar o registro no motor dá o mesmo estado final (%s)', async (seed) => { /* createGame(config, seed, ['p1','p2']) + applyAction de cada steps[i] */ });
it('seq e epoch nunca decrescem por cliente; nenhum TIMEOUT recusado', async () => { /* … */ });
it('erro sem oráculo: id escondido (mão do oponente, pendentes, monte) recebe o mesmo código de id inexistente', async () => {
  // em estados aleatórios das partidas: para TRAP/SACRIFICE/PLAY_J/RESURRECT, troca o id por um escondido e por 'nao-existe'
  // e compara o ack.code dos dois
});
it('cada chave gravada fica < 100 KiB na maior partida', async () => { /* max de trace.maxPartBytes entre as sementes */ });
it('linhas gravadas por partida (estimativa da spec §9.4)', async () => {
  // greedy × greedy sem caos: linhas = 4 × trace.persists + trace.alarmChanges; console.log(`linhas por partida: ${linhas}`); afirma < 1_500
});
```

`replaySteps(game: GameRecord): Map<number, { state: GameState; events: GameEvent[] }>` fica na `harness.ts`. Ele usa `createGame(game.state.config, game.seed, ['p1', 'p2'])` e `applyAction` passo a passo. Os `events` do `catchUp` são conferidos em `presence.test.ts` (Tarefa 8).

- [ ] **Step 2: Rodar.** Expected: PASS na primeira vez, se as Tarefas 4–8 estiverem certas. Uma falha aqui é bug de verdade: siga `superpowers:systematic-debugging` e corrija na tarefa dona do código.

- [ ] **Step 3: Medir o tempo** — `pnpm --filter @coringa/server test:coverage`; anote a duração. Se as propriedades passarem de ~8 s, reduza `SEEDS` para 8 e registre isso na mensagem do commit.

- [ ] **Step 4: Commit** — `git commit -m "test(server): propriedades com bots: redação exata, determinismo, oráculo e tamanho"`

---

### Tarefa 10: Casca Cloudflare — Worker, Durable Object, logs e smoke

Spec §3, §4.1, §4.2, §8.2, §8.5, §9.1, §9.2, §10.1, §10.4, §11.2 (casca), §11.4.

**Files:**
- Create: `packages/server/src/worker/router.ts`
- Modify: `packages/server/src/worker/index.ts`, `src/worker/room.ts`, `scripts/smoke.ts`
- Test: `packages/server/test/worker/http.test.ts`, `test/worker/socket.test.ts`

**Interfaces:**
- Consumes: `RoomCore` e tipos (Tarefas 3–8); `generateCode`, `normalizeCode`, `NicknameBodySchema`, `normalizeNickname` e `LIMITS` do protocolo.
- Produces:
  - **`class Room extends DurableObject<Env>`** em `room.ts`:
    - **construtor:** `ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))` e `this.core = new RoomCore(joinRecord(lido de STORAGE_KEYS com ctx.storage.kv.get), deps)`. `deps.randomBytes` vem de `crypto.getRandomValues`;
    - **RPC:** `create(code: string, nickname: string): Promise<RpcResult<CreateRoomResponse, 'EXISTS' | 'BAD_NICKNAME'>>`, `join(nickname: string): Promise<RpcResult<JoinRoomResponse, 'NOT_FOUND' | 'FULL' | 'BAD_NICKNAME'>>` e `info(): RoomInfoResponse | null`. Aplicam os `Effects` e devolvem `RpcResult<T, E> = { ok: true; value: T } | { ok: false; error: E }`, definido em `room.ts`;
    - **`fetch(request)`:** upgrade com `acceptWebSocket`. O attachment é `{ socketId: crypto.randomUUID(), seat: null, connectedAt: now, lastMessageAt: now }`. Depois chama `onOpen` e responde 101;
    - **`webSocketMessage`:** atualiza `lastMessageAt` no attachment e chama `onMessage`;
    - **`webSocketClose`/`webSocketError`:** chamam `onClose`, sem o socket que fechou;
    - **`alarm()`:** chama `onAlarm`;
    - **antes da primeira entrada depois de acordar**, roda `reconcile`, controlado por uma flag em memória.
  - **`sockets(): SocketInfo[]`:** monta a lista a partir de `ctx.getWebSockets()`, com `lastSeenAt = max(lastMessageAt, ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? 0)`.
  - **`apply(effects)`, nesta ordem:**
    1. `attach` → `serializeAttachment` (mantém `connectedAt`/`lastMessageAt`);
    2. `persist` → grava as quatro partes de `splitRecord(core.record)` com `ctx.storage.kv.put`, uma por chave, na mesma entrada. Sem `await` entre elas, ficam no mesmo lote atômico do Durable Object;
    3. `send` → `ws.send(JSON.stringify(m))`;
    4. `close` → `ws.close(code, reason)`;
    5. `deleteAll` → `await ctx.storage.deleteAll()`;
    6. `alarm`: compara com o valor guardado em memória (lido uma vez com `getAlarm()` ao acordar) e chama `setAlarm`/`deleteAlarm` só quando muda;
    7. `logs` → `console.log(JSON.stringify(line))`.
    - Exceção no núcleo → `console.log(JSON.stringify({ evt: 'error', code, message, stack }))`, e a exceção é relançada.
  - **`handle(request: Request, env: Env): Promise<Response>`** em `router.ts`:
    - IP = `cf-connecting-ip` ou `'local'`;
    - `POST /api/rooms` → `CREATE_LIMITER`; o restante de `/api/rooms/*` → `JOIN_LIMITER`;
    - corpo maior que 1 KiB → 413; apelido inválido → 400;
    - código fora do formato → 404, sem tocar no objeto;
    - criação: até 5 tentativas de código em caso de `EXISTS`; esgotadas → 503;
    - upgrade com `Origin` diferente da própria origem da requisição e fora de `ALLOWED_ORIGINS` (lista separada por vírgula; `http://localhost:*` aceita qualquer porta) → `acceptAndClose(4003, 'origem')` e log `protocol.violation` com `kind: 'ORIGIN'`;
    - limite estourado no upgrade → `acceptAndClose(4029, 'limite')`;
    - sem `Upgrade` → 426.
  - **`acceptAndClose(code: number, reason: string): Response`**: cria um `WebSocketPair`, `server.accept()`, `server.close(code, reason)` e devolve 101 com o `client`.

- [ ] **Step 1: Escrever os testes** (no workerd, com `SELF`, `env`, `runDurableObjectAlarm` e `evictAllDurableObjects`, como no protótipo)

`test/worker/http.test.ts`:

```ts
it('cria (201), entra (200), cheia (409), inexistente (404), consulta pública', async () => { /* … */ });
it('apelido inválido 400; corpo > 1 KiB 413; código fora do formato 404', async () => { /* … */ });
it('11ª criação no minuto → 429', async () => { /* CREATE_LIMITER 10/60 */ });
it('upgrade recusado chega como fechamento: sala inexistente 4000; origem 4003', async () => { /* nunca só 1006 */ });
it('sem Upgrade no /ws → 426', async () => { /* … */ });
```

`test/worker/socket.test.ts`:

```ts
it('dois WebSockets jogam alguns passos; ping recebe pong', async () => { /* create + join por HTTP; hello; ready; EQUIP dos dois */ });
it('hibernação no meio da partida (evictAllDurableObjects) não perde nada', async () => { /* manda act depois do evict → ok, seq continua */ });
it('runDurableObjectAlarm aplica o estouro do Equipar', async () => { /* … */ });
it('expiração: deleteAll; getAlarm null; info vira 404', async () => { /* força o alarme de idleExpiry com runInDurableObject ajustando a agenda */ });
it('reinício: assento marcado presente sem socket passa a estar fora (reconcile ao acordar)', async () => { /* … */ });
```

`scripts/smoke.ts` (Node puro): cria um `RoomCore` com `deps` de `crypto.getRandomValues`, abre dois sockets falsos e joga uma partida inteira só com a primeira ação legal de quem age. Imprime `smoke do servidor ok: partida pelo núcleo no Node puro`.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/server test` → FAIL.

- [ ] **Step 3: Implementar.**

- [ ] **Step 4: Rodar tudo**

Run: `pnpm --filter @coringa/server typecheck && pnpm --filter @coringa/server test:coverage && pnpm --filter @coringa/server smoke`
Expected: PASS; `smoke do servidor ok`; `--dry-run: exiting now.`

- [ ] **Step 5: Teste manual rápido** — `pnpm --filter @coringa/server dev`, depois `curl -X POST localhost:8787/api/rooms -H 'content-type: application/json' -d '{"nickname":"Ana"}'` → 201 com `code` e `token`.

- [ ] **Step 6: Commit** — `git commit -m "feat(server): Worker com rotas e limites, Durable Object com hibernação e logs"`

---

### Tarefa 11: Terminal online e bot (simulador)

Spec §10.2.

**Files:**
- Modify: `packages/sim/package.json` (dependência `@coringa/protocol: workspace:*`), `src/play/io.ts`, `src/play/game.ts`, `src/cli/play.ts`, `.gitignore` (+ `packages/sim/sessions/`)
- Create: `packages/sim/src/online/session.ts`, `src/online/bot.ts`, `src/online/sessions.ts`, `src/cli/bot.ts`
- Test: `packages/sim/test/online.test.ts`

**Interfaces:**
- Consumes:
  - `RoomConnection`, `RoomClient`, `createRoom`, `joinRoom`, `parseTarget`, `roomLink` (Tarefas 1–2);
  - `renderBoard`, `eventText`, `resultText`, `namesFor`, `askChoice` e `BOTS` do simulador.
- Produces:
  - `Io.ask(question: string, signal?: AbortSignal): Promise<string>`. No `consoleIo`, isso vira `rl.question(question, { signal })`; no `scriptedIo`, lança `AbortError` se o sinal já estiver abortado.
  - `askChoice(io, title, options, signal?)`.
  - `askAction(io: Io, view: PlayerView, legal: Action[], names: Names, signal?: AbortSignal): Promise<Action>`, exportado de `play/game.ts`. É o antigo `askHuman`, e o `playGame` passa a usá-lo.
  - `playOnline(options: { io: Io; connection: RoomConnection; names: Names }): Promise<{ result: GameResult | null }>` em `online/session.ts`. A cada `state`:
    - aborta a pergunta pendente;
    - imprime os eventos (`eventText`) e os segundos restantes (`remainingMs`);
    - se houver ação legal, mostra a mesa, pergunta e chama `act`.
    - Com `ack` `STALE_EPOCH`, espera o próximo `state`.
    - Em `room.status === 'FINISHED'`, imprime o resultado e a causa e pergunta "Revanche? (s/n)".
    - No lobby, chama `ready(true)` assim que conecta. **[P]**: no terminal, o pronto é automático.
  - `runBot(options: { connection: RoomConnection; bot: BotName; seed: string; thinkMs?: number; setTimer?: … }): Promise<void>` em `online/bot.ts`:
    - marca pronto e aceita revanche;
    - a cada `state` com ação legal, espera `thinkMs` (padrão 600) e joga `bot(view, legal, rng)` sobre o `state` **mais recente**. Se a época mudou durante a espera, descarta a jogada.
  - **Token guardado** em `online/sessions.ts`, para dar para testar a queda e volta (spec §12, item 2). O terminal faz o papel do `localStorage` do navegador:
    - `interface SavedSession { server: string; code: string; token: string; playerId: string; nickname: string }`;
    - `saveSession(s: SavedSession, dir?: string): void` e `loadSession(server: string, code: string, dir?: string): SavedSession | null`;
    - grava em `packages/sim/sessions/<CÓDIGO>.json` por padrão (`dir` serve aos testes), pasta fora do git.
  - **CLIs:**
    - `pnpm play --online [alvo] [--apelido X] [--servidor URL]`. `--online` é booleano e o alvo é posicional.
      - Sem código no alvo, chama `createRoom` e imprime o código e o link.
      - Com código e uma sessão salva para o mesmo servidor e código, **volta** com o token salvo, sem chamar `joinRoom`.
      - Com código e sem sessão salva, chama `joinRoom`.
      - Toda sessão nova é salva.
    - `pnpm bot --online <alvo> [--bot greedy] [--servidor URL]`.
    - Servidor padrão: `--servidor`, depois `CORINGA_SERVIDOR`, depois `http://localhost:8787`.

- [ ] **Step 1: Escrever os testes** (com um `FakeConnection implements RoomConnection` no arquivo de teste, que emite `room`/`state` montados com `viewFor` de estados do `setup`)

```ts
it('askChoice aborta com o sinal e o playGame offline continua igual', async () => { /* … */ });
it('terminal online: pergunta, manda a ação escolhida; state novo no meio cancela a pergunta e redesenha', async () => {
  // scriptedIo responde '1' só na segunda pergunta; o fake emite state A, depois state B (época nova) antes da resposta
  // → act chamado uma vez, com a ação legal da visão B
});
it('terminal online: STALE_EPOCH espera o próximo state; fim mostra resultado e causa, revanche s → rematch(true)', async () => { /* … */ });
it('bot online: joga ação legal sobre o state mais recente; descarta se a época mudou na espera', async () => { /* setTimer falso */ });
it('bot online: marca pronto no lobby e pede revanche no fim', async () => { /* … */ });
it('sessão salva: ida e volta num diretório temporário; outro servidor ou código → null', () => { /* … */ });
```

- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @coringa/sim test` → FAIL.

- [ ] **Step 3: Implementar.**

- [ ] **Step 4: Rodar e ver passar** — `pnpm --filter @coringa/sim test:coverage` → PASS. As metas atuais do simulador ficam mantidas; `src/cli/**` continua fora da cobertura.

- [ ] **Step 5: Partida de verdade (manual, com o `wrangler dev`)**

- Terminal A: `pnpm --filter @coringa/server dev`.
- Terminal B: `pnpm play --online --apelido Ana`, que imprime o código.
- Terminal C: `pnpm bot --online <código>`.
- Jogue algumas rodadas.
- No meio da partida, feche o terminal B (Ctrl+C) e, em menos de 60 s, rode `pnpm play --online <código>`. Ele tem que voltar para a mesma partida pela sessão salva, com os eventos perdidos.
- Repita esperando mais de 60 s: o bot tem que vencer por W.O., com a causa `RECONNECT_TIMEOUT` mostrada no fim.

- [ ] **Step 6: Commit** — `git commit -m "feat(sim): pnpm play --online e pnpm bot pelo servidor"`

---

### Tarefa 12: Fechamento — replay, scripts, deploy, CLAUDE.md, tempo do check e PR

Spec §10.3, §10.4 (replay), §11.4, §12.

**Files:**
- Create: `packages/sim/src/cli/replay.ts`, `packages/sim/test/replay.test.ts`, `packages/server/scripts/deploy.ts`
- Modify: `package.json` (raiz), `CLAUDE.md`, `docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (§9.4, número medido)

**Interfaces:**
- Consumes: `Replay` do simulador; linhas `game.replay` (Tarefa 6).
- Produces:
  - `replayFile(path: string): { ok: true; result: GameResult; steps: number } | { ok: false; step: number; code: string; message: string }` em `src/cli/replay.ts`. Aceita um `Replay` puro ou uma linha de log `{ evt: 'game.replay', replay }`.
  - O CLI imprime o resultado ou `falhou no passo N: CODE — mensagem`, com código de saída 1 na falha.
  - Scripts da raiz:
    - `"dev:server": "pnpm --filter @coringa/server dev"`;
    - `"deploy:server": "pnpm check && pnpm --filter @coringa/server run deploy"`;
    - `"bot": "node packages/sim/src/cli/bot.ts"`;
    - `"sim:replay": "node packages/sim/src/cli/replay.ts"`.
  - `scripts/deploy.ts`: roda `git rev-parse --short HEAD` e depois `wrangler deploy --var VERSION:<hash>` com `spawnSync` e `stdio: 'inherit'`, devolvendo o código de saída do wrangler. Fica em Node, e não em shell, porque o pnpm roda scripts no `cmd` do Windows.

- [ ] **Step 1: Teste do replay**

```ts
it('reexecuta uma linha game.replay até o fim', () => { /* grava em tmp uma partida do runGame como { evt:'game.replay', replay } → ok, result igual */ });
it('aponta o passo exato que falha', () => { /* troca a ação do passo 5 por uma ilegal → { ok:false, step: 5 } */ });
```

- [ ] **Step 2: Rodar e ver falhar; implementar; rodar e ver passar** — `pnpm --filter @coringa/sim test`.

- [ ] **Step 3: `CLAUDE.md`** — acrescente uma seção `## Servidor (packages/server)` com:
  - O núcleo `src/core` é puro e roda no Node: nada de `cloudflare:*`, relógio ou sorteio próprio. A casca `src/worker` é fina.
  - `pnpm dev:server` sobe o `wrangler dev`.
  - `pnpm deploy:server` publica, e só o autor roda. **Nunca** `pnpm deploy`, que é comando do pnpm.
  - O `worker-configuration.d.ts` é gerado pelo `typecheck` e não vai para o git.
  - Mudou a forma do `GameState` ou o sentido de uma regra a ponto de estado antigo não servir? Suba `STATE_SCHEMA` (`src/core/timers.ts`): salas antigas são encerradas no deploy.
  - No Windows, mantenha o worktree num caminho curto: o caminho do `workerd.exe` precisa caber em 260 caracteres.

- [ ] **Step 4: Tempo do check**

Run: `pnpm check`, cronometrado (`Measure-Command { pnpm check }` no PowerShell).

Se passar de ~45 s, aplique a regra de evolução do `CLAUDE.md`:
- crie `scripts/check-fast.ts` na raiz. Ele roda `pnpm lint`, depois `pnpm typecheck`, e para cada pacote com arquivos em `git diff --cached --name-only` roda `pnpm --filter <pacote> exec vitest related --run <arquivos>`;
- troque o `pre-commit` do `simple-git-hooks` por `node scripts/check-fast.ts`, mantendo o `pre-push` com `pnpm check`;
- rode `pnpm exec simple-git-hooks` para reinstalar os hooks;
- registre o tempo medido no commit.

- [ ] **Step 5: Medida de linhas gravadas** — copie o número impresso pelo teste da Tarefa 9 para a spec §9.4 ("medido em 2026-…: N linhas por partida").

- [ ] **Step 6: Commit e PR**

```bash
git add -A
git commit -m "feat: sim:replay, scripts do servidor, deploy com versão e regras no CLAUDE.md"
git push -u origin feat/server
```

- Abrir o PR pelo link `https://github.com/andr3serafim/jogo-do-coringa/pull/new/feat/server`. A descrição traz o resumo, o tempo do `pnpm check` e as linhas por partida, e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Esperar a CI verde.
- Merge por squash no GitHub, ou fast-forward da `main`.

- [ ] **Step 7: Entregar ao autor os critérios de pronto que são dele** (spec §12, itens 2–4). Ele vai:
  1. jogar uma partida completa pelo `wrangler dev` (dois terminais, ou terminal contra bot), derrubando e voltando no meio;
  2. criar a conta Cloudflare e rodar `pnpm --filter @coringa/server exec wrangler login` uma vez, depois `pnpm deploy:server`.
     - Se o deploy recusar o binding `ratelimits` no plano Free (spec §8.2), aplica-se o plano B da spec: um agente remove os dois bindings do `wrangler.jsonc`, e o `router.ts` passa a pular o limite por IP quando o binding não existe (`env.CREATE_LIMITER === undefined`). Ficam os limites por sala e por conexão.
     - Isso vira um commit à parte, e o autor publica de novo;
  3. jogar contra o endereço `https://jogo-do-coringa.<subdomínio>.workers.dev` com `pnpm play --online --servidor <endereço>`;
  4. conferir as linhas de log no painel ou no `wrangler tail`.
