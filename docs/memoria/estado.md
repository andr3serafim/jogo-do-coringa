# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-10-30**, pela conta que assumiu depois do limite semanal da anterior.
> Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Branch:** `feat/revisao-notas`, no checkout principal `D:\andr3\jogo-coringa`, a partir da `main` em `755ddc0`.
- **Em curso:**
  - as respostas do autor ao lote de 2026-10-30 estão no `decisoes.md` ("2026-10-30 (2)") e na spec do sub-projeto 5 (F2, F3);
  - investigação do bug do **Ataque vazio** (F4: a Defesa perde carta depois de um atacante sem cartas no Ataque);
  - depois, o **tabuleiro quebrado** no PC de 1536 × 695 (F5) e a **revisão, no jogo, de todas as notas** de 23/10 e de 30/10,
    a pedido do autor ("nem todos os pontos levantados foram feitos"). O registro da revisão vai em
    `notas/revisao-das-notas.md`.
- **Próximo passo exato:** reproduzir o Ataque vazio. Primeiro no motor (partidas bot × bot, procurando uma Defesa que perde
  carta num turno em que o Ataque do atacante estava vazio), depois na web (o que a mesa mostra).

## A `main`

`755ddc0`, CI verde (check + e2e). Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D (`8d7f078`, `a5a76c5`,
`bba8377`, `8cdf0a1`) e a memória compartilhada. Regras em vigor: spec 1
(`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes da spec do sub-projeto 5
(`2026-10-27-ajustes-design.md`).

## Fila (sub-projeto 5)

1. **Bugs e revisão (esta branch):** F4 Ataque vazio, F5 tabuleiro quebrado, revisão de todas as notas.
2. **E1:** sem anti-travamento e sem limite de rodadas. `RULES_VERSION`/`STATE_SCHEMA` 3, partidas de referência regravadas,
   portão do Difícil do zero.
3. **E2:** Equipar livre.
4. **F1:** apagar o histórico (só web).
5. **E3 + F2 + F3:** roubo, cura pela Defesa, limite de 4 especiais, Reflect reativo e Devastação, medidos juntos no simulador
   antes de virar regra. As regras estão aprovadas (spec do sub-projeto 5); falta a medição e a forma da penalidade do limite.

## Esperando o autor

- **[I] a confirmar, junto com os números da E3:**
  - Defesa Absoluta contra o Reflect: o Reflect segura o golpe (o dono leva 0), mas não devolve dano nem quebra Q e K do
    atacante?
  - Reflect contra Reflect: o golpe não acontece, nenhuma carta sai das fileiras e ninguém leva dano?
- **Forma da penalidade do limite de 4 especiais:** vai com 2 ou 3 opções medidas.
- O lote de 2026-10-30 foi respondido; as perguntas e as respostas estão no `decisoes.md`.

## Só o autor

Playtest online, `wrangler login` + `pnpm deploy:server`, proteção da `main`, `gh`, branches remotas velhas: lista completa em
`notas/playtest.md`.

## Ambiente (máquina do autor, formatada em 2026-10-28)

- **Ferramentas:** Node 26.13 e pnpm 11.9. Não há `gh` nem a CLI `claude` no PATH. O Ubuntu do WSL sumiu.
- **E2E:** precisa de `pnpm --filter @coringa/web exec playwright install chromium` na primeira vez.
- **Workerd (resolvido com um paliativo; a correção definitiva é do autor):**
  - **Sintoma:** os testes do servidor no workerd (`vitest.worker.config.ts`) não subiam. O `workerd.exe` caía ao iniciar com
    `access violation` e `thread 'main' has overflowed its stack`, e o próprio workerd sugeria um Visual C++ Redistributable
    desatualizado.
  - **Causa:** confirmada. O Windows desta máquina veio com o VC++ Redistributable 14.28, de 2020. Com as DLLs 14.51 ao lado do
    `workerd.exe`, os 35 testes do workerd passam.
  - **Paliativo:** `msvcp140.dll`, `vcruntime140.dll` e `vcruntime140_1.dll` copiados do Edge
    (`C:\Program Files (x86)\Microsoft\Edge\Application\156.0.4314.50\`) para
    `node_modules/.pnpm/@cloudflare+workerd-windows-64@1.20261012.1/node_modules/@cloudflare/workerd-windows-64/bin/`.
    É o único workerd que o projeto usa (wrangler 4.151, testes, `wrangler dev` e E2E). Um `pnpm install` que troque o
    workerd perde o paliativo.
  - **Correção definitiva (autor):** instalar o Visual C++ Redistributable x64 mais recente, da Microsoft
    (`https://aka.ms/vs/17/release/vc_redist.x64.exe`). Depois disso, apagar as três DLLs copiadas.
- **Worktrees:**
  - `D:\andr3\jogo-coringa`: checkout principal.
  - `.claude/worktrees/inspiring-sammet-387417` (`feat/ajustes`, limpo): o da conta anterior.
  - `D:\andr3\jogo-coringa-v5` (HEAD solto, limpo): era o checkout limpo dos pushes da conta anterior.
- **Branches que sobraram:** `claude/inspiring-sammet-387417` e `feat/ajustes-fase-a` (local e remota).
- **Arquivo solto:** o `jogar-treino.bat` na raiz é o lançador do autor. Não mexer nem commitar.
