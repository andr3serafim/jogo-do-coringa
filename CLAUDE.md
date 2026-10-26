# Jogo do Coringa — regras do repositório

## Portão de testes (sempre ligado)

- Rode `pnpm check` antes de commitar: lint, typecheck, testes com cobertura e o smoke no Node puro. O hook de pre-push (simple-git-hooks) roda o mesmo comando; o de pre-commit é a versão rápida (abaixo).
- **Nunca** use `git commit --no-verify`, `git push --no-verify` nem `SKIP_SIMPLE_GIT_HOOKS=1`. Se o check falhar, corrija a causa.
- Trabalho em branch própria com PR para a `main`. A CI (`.github/workflows/check.yml`) tem dois jobs em paralelo, `check` (`pnpm check`) e `e2e` (`pnpm e2e`), e os dois têm que estar verdes antes do merge, que é feito por squash no GitHub ou fast-forward (histórico limpo). O workflow roda nos pushes de `main` e de `feat/**` e nos PRs; o E2E não faz parte do `pnpm check` nem dos hooks.
- **Pre-commit rápido (em vigor):** o `pnpm check` passou de ~2 min (mediana de 122 s, medida na spec da web §9.3), então o pre-commit roda `scripts/check-fast.ts`: lint, typecheck e `vitest related --run` nos pacotes com arquivos em stage (sem o projeto workerd do servidor). O pre-push mantém o `pnpm check` completo, e a CI também. O hook cai para `pnpm check` se o script não existir (a pasta `.git/hooks` é compartilhada por todos os worktrees).
- Calibração (`pnpm sim:calibrate`) e o portão do Difícil (`pnpm sim:dificil`, relatório em `packages/sim/reports/dificil.md`) são jobs à parte e nunca entram no `pnpm check`. Remeça o portão quando mudar um bot, o `eval` ou o motor, e no sub-projeto 5, sem a Pressão da mesa, com `--recomecar`.

## Node puro, sem bundler

O motor, o protocolo, o simulador e o núcleo do servidor rodam direto no Node 24 (≥ 24.2: type stripping e `import.meta.main` dos scripts). A única exceção é `packages/web` (abaixo). Por isso:

- Imports relativos terminam em `.ts`. O ESLint barra os que não terminam.
- Só sintaxe apagável (`erasableSyntaxOnly`): nada de `enum`, `namespace` ou parameter properties.
- Import só de tipo usa `import type` ou `type` inline (`verbatimModuleSyntax`).
- O Node recusa type stripping em arquivos dentro de `node_modules`. O `@coringa/engine` funciona porque o pnpm liga o pacote do workspace por symlink e o Node resolve o caminho real (`packages/engine/src/...`). **Nunca use `--preserve-symlinks`.**

## Partidas de referência

- Replays em `packages/engine/test/fixtures/golden-replays.json`; resumos em `packages/engine/test/__snapshots__/golden/`.
- Mudou o resultado de uma partida? Só aceite com `pnpm --filter @coringa/engine exec vitest run -u` depois de revisar o diff dos snapshots, e diga no commit qual regra mudou.
- Mudar o resultado de uma partida de referência exige subir `RULES_VERSION` (`packages/engine/src/version.ts`) e registrar o digest novo em `RULES_DIGESTS` (`packages/engine/test/rules-version.test.ts`, a mensagem de falha imprime a linha pronta): os replays guardados no navegador pela versão antiga abrem com aviso. O `-u` sozinho não basta.
- Regravar os replays (ex.: depois de mudar a lista em `packages/sim/src/golden.ts`): `pnpm --filter @coringa/sim record-golden`.

## Servidor (packages/server)

- O núcleo `src/core` é puro e roda no Node: nada de `cloudflare:*`, relógio ou sorteio próprio (`now` e `randomBytes` vêm por parâmetro). A casca `src/worker` é fina.
- `pnpm dev:server` sobe o `wrangler dev`.
- `pnpm deploy:server` roda `pnpm check`, constrói a web e publica (`wrangler deploy`), e só o autor roda (precisa do `wrangler login`). **Nunca** `pnpm deploy`, que é comando do pnpm.
- O Worker serve a interface como static assets (`assets.directory` aponta para `packages/web/dist`, no `wrangler.jsonc`). Os scripts do servidor rodam antes `scripts/ensure-assets.ts`, que reserva a pasta com um `index.html` mínimo num clone novo (o `wrangler dev` e o `deploy --dry-run` recusam a pasta ausente); o `vite build` da web a refaz.
- A var `E2E_SEED` do `wrangler.jsonc` **fica vazia**: um teste do servidor barra qualquer valor, para a semente fixa nunca ir para a produção. Só o `webServer` do Playwright a preenche, com `wrangler dev --var E2E_SEED:e2e`.
- O `worker-configuration.d.ts` é gerado pelo `typecheck` e não vai para o git.
- Mudou a forma do `GameState` ou o sentido de uma regra a ponto de estado antigo não servir? Suba `STATE_SCHEMA` (`src/core/timers.ts`): salas antigas são encerradas no deploy.
- No Windows, mantenha o worktree num caminho curto: o caminho do `workerd.exe` precisa caber em 260 caracteres.

## Interface web (packages/web)

- **Exceção ao Node puro:** a web é o único pacote com bundler (Vite, React, Tailwind). Nunca importe `@coringa/protocol/schemas` (o Zod fica só no servidor) nem `node:*` em `packages/web/src`: o ESLint barra, e o smoke reprova um `.js` do `dist` com o Zod. Também não empurre para os outros pacotes algo que só funcione com bundler.
- **Sem regra na interface:** totais, prévia, quadras e jogadas vêm do motor e do simulador (`attackPower`, `previewAttack`, `quadValues`, `legalActions`, `autoDestinations`). A web só envia intenções.
- **Desenvolvimento:** `pnpm dev:web` (Vite, porta 5173, com proxy de `/api` e do WebSocket para a 8787) junto com `pnpm dev:server` (`wrangler dev`) em outro terminal. O treino contra o bot roda sem servidor, em `/treino?semente=<texto>&nivel=<facil|medio|dificil>` (sem `nivel`, a tela pergunta o nível; os testes e o E2E passam `nivel=medio`). As partidas terminadas ficam na lista local `coringa:partidas`, em `/partidas`, e o replay do treino abre em `/partidas/<id>`; as duas telas entram por `React.lazy`.
- **Orçamento:** JavaScript inicial ≤ 200 KB comprimido (gzip), conferido pelo smoke da web dentro do `pnpm check`. O bot do treino entra por `import()` dinâmico.
- **E2E:** `pnpm e2e` roda o Playwright (Chromium) contra o `wrangler dev` servindo a web construída. É o job `e2e` da CI, em paralelo ao `check`: roda em `main`, em `feat/**` e nos PRs, e o merge exige os dois verdes. Fica fora do `pnpm check` e dos hooks. A primeira vez pede `pnpm --filter @coringa/web exec playwright install chromium`. O limite de criação de salas é de 10 por minuto por IP: para repetir, rode a execução inteira de novo, nunca `--repeat-each`. Com `CI=true` ele sobe um servidor novo em vez de reaproveitar o da porta 8787.
- **`data-sem-pulo`:** o `Stage` termina as batidas com um toque na mesa e engole o clique desse gesto. O que está dentro de um elemento com `data-sem-pulo` fica de fora (o toque ali é só dele); só os controles do replay o usam, nunca a barra de jogadas nem a mão.
- **Fotossensibilidade (spec §10.4):** a inversão da tela inteira é um flash. No máximo 1 inversão por cena, mantida por ≥ 300 ms; nunca mais de 3 transições claro ↔ escuro numa janela de 1 s; com movimento reduzido (sistema ou menu), nenhuma inversão, só um esmaecimento. Os testes da linha do tempo cobrem isso: não afrouxe os limites para fazer uma cena passar.
- **Arte original (spec §10.6):** o Coringa, os naipes, as cenas e as texturas são desenhos originais do projeto. Nada de copiar, decalcar ou traçar por cima de xilogravura existente (a de J. Borges, por exemplo, tem autor e direitos). Texturas saem de código (SVG `feTurbulence`) ou de desenho próprio. Fonte nova só com licença que permita embutir (SIL OFL ou equivalente), listada no `packages/web/LICENSES.md`.
- **Números de jogo sem textura (spec §10.7):** vida, ATK/DEF, conta das fileiras, prévia, relógio e placar usam a fonte de texto, com `tabular-nums`, nunca a textura de papel ou de carimbo.

## Idioma

- Mensagens, comentários e textos do jogo em pt-BR; identificadores de código em inglês.
