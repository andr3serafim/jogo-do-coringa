# Jogo do Coringa — regras do repositório

## Portão de testes (sempre ligado)

- Rode `pnpm check` antes de commitar: lint, typecheck, testes com cobertura e o smoke no Node puro. O hook de pre-push (simple-git-hooks) roda o mesmo comando; o de pre-commit é a versão rápida (abaixo).
- **Nunca** use `git commit --no-verify`, `git push --no-verify` nem `SKIP_SIMPLE_GIT_HOOKS=1`. Se o check falhar, corrija a causa.
- Trabalho em branch própria com PR para a `main`. A CI (`.github/workflows/check.yml`) roda `pnpm check` e tem que estar verde antes do merge, que é feito por squash no GitHub ou fast-forward (histórico limpo).
- **Pre-commit rápido (em vigor):** o `pnpm check` passou de ~45 s, então o pre-commit roda `scripts/check-fast.ts`: lint, typecheck e `vitest related --run` nos pacotes com arquivos em stage (sem o projeto workerd do servidor). O pre-push mantém o `pnpm check` completo, e a CI também. O hook cai para `pnpm check` se o script não existir (a pasta `.git/hooks` é compartilhada por todos os worktrees).
- Calibração (`pnpm sim:calibrate`) é job à parte e nunca entra no `pnpm check`.

## Node puro, sem bundler

O motor e o simulador rodam direto no Node 24 (≥ 24.2: type stripping e `import.meta.main` dos scripts). Por isso:

- Imports relativos terminam em `.ts`. O ESLint barra os que não terminam.
- Só sintaxe apagável (`erasableSyntaxOnly`): nada de `enum`, `namespace` ou parameter properties.
- Import só de tipo usa `import type` ou `type` inline (`verbatimModuleSyntax`).
- O Node recusa type stripping em arquivos dentro de `node_modules`. O `@coringa/engine` funciona porque o pnpm liga o pacote do workspace por symlink e o Node resolve o caminho real (`packages/engine/src/...`). **Nunca use `--preserve-symlinks`.**

## Partidas de referência

- Replays em `packages/engine/test/fixtures/golden-replays.json`; resumos em `packages/engine/test/__snapshots__/golden/`.
- Mudou o resultado de uma partida? Só aceite com `pnpm --filter @coringa/engine exec vitest run -u` depois de revisar o diff dos snapshots, e diga no commit qual regra mudou.
- Regravar os replays (ex.: depois de mudar a lista em `packages/sim/src/golden.ts`): `pnpm --filter @coringa/sim record-golden`.

## Servidor (packages/server)

- O núcleo `src/core` é puro e roda no Node: nada de `cloudflare:*`, relógio ou sorteio próprio (`now` e `randomBytes` vêm por parâmetro). A casca `src/worker` é fina.
- `pnpm dev:server` sobe o `wrangler dev`.
- `pnpm deploy:server` publica, e só o autor roda (precisa do `wrangler login`). **Nunca** `pnpm deploy`, que é comando do pnpm.
- O `worker-configuration.d.ts` é gerado pelo `typecheck` e não vai para o git.
- Mudou a forma do `GameState` ou o sentido de uma regra a ponto de estado antigo não servir? Suba `STATE_SCHEMA` (`src/core/timers.ts`): salas antigas são encerradas no deploy.
- No Windows, mantenha o worktree num caminho curto: o caminho do `workerd.exe` precisa caber em 260 caracteres.

## Idioma

- Mensagens, comentários e textos do jogo em pt-BR; identificadores de código em inglês.
