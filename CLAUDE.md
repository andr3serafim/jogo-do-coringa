# Jogo do Coringa — regras do repositório

## Portão de testes (sempre ligado)

- Rode `pnpm check` antes de commitar: lint, typecheck, testes com cobertura e o smoke no Node puro. Os hooks de pre-commit e pre-push (simple-git-hooks) rodam o mesmo comando.
- **Nunca** use `git commit --no-verify`, `git push --no-verify` nem `SKIP_SIMPLE_GIT_HOOKS=1`. Se o check falhar, corrija a causa.
- Trabalho em branch própria com PR para a `main`. A CI (`.github/workflows/check.yml`) roda `pnpm check` e tem que estar verde antes do merge, que é feito por squash no GitHub ou fast-forward (histórico limpo).
- Regra de evolução: quando o `pnpm check` passar de ~45 s, o pre-commit vira a versão rápida (lint, typecheck e `vitest related --run` nos arquivos alterados) e o pre-push mantém o check completo.
- Calibração (`pnpm sim:calibrate`) é job à parte e nunca entra no `pnpm check`.

## Node puro, sem bundler

O motor e o simulador rodam direto no Node 24 (type stripping). Por isso:

- Imports relativos terminam em `.ts`. O ESLint barra os que não terminam.
- Só sintaxe apagável (`erasableSyntaxOnly`): nada de `enum`, `namespace` ou parameter properties.
- Import só de tipo usa `import type` ou `type` inline (`verbatimModuleSyntax`).
- O Node recusa type stripping em arquivos dentro de `node_modules`. O `@coringa/engine` funciona porque o pnpm liga o pacote do workspace por symlink e o Node resolve o caminho real (`packages/engine/src/...`). **Nunca use `--preserve-symlinks`.**

## Partidas de referência

- Replays em `packages/engine/test/fixtures/golden-replays.json`; resumos em `packages/engine/test/__snapshots__/golden/`.
- Mudou o resultado de uma partida? Só aceite com `pnpm --filter @coringa/engine exec vitest run -u` depois de revisar o diff dos snapshots, e diga no commit qual regra mudou.
- Regravar os replays (ex.: depois de mudar a lista em `packages/sim/src/golden.ts`): `pnpm --filter @coringa/sim record-golden`.

## Idioma

- Mensagens, comentários e textos do jogo em pt-BR; identificadores de código em inglês.
