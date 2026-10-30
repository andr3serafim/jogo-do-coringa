# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-10-30**, pela conta que assumiu depois do limite semanal da anterior.
> Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Branch:** `main`, no checkout principal `D:\andr3\jogo-coringa` (as respostas do autor sobem pela `feat/memoria-espera`
  e entram por fast-forward com a CI verde; se ela ainda não estiver na `main`, é só mesclar). A `feat/revisao-notas` entrou por fast-forward em
  2026-10-30, com a CI verde na branch (run 41008238994: check + e2e). Ela trouxe:
  - as respostas do autor ao lote de 2026-10-30 no `decisoes.md` ("2026-10-30 (2)") e na spec (F2, F3);
  - **F5 corrigido:** o tabuleiro quebrado no PC de 1536 × 695 (CSS), com o E2E `e2e/layout.spec.ts`;
  - **F4 investigado, sem bug** no motor nem na mesa; as explicações voltaram ao autor;
  - a revisão de todas as notas, em `notas/revisao-das-notas.md`;
  - o histórico agora diz "da Defesa" e "na Defesa".
- **Em curso:** a **E1** na branch `feat/sem-anti-travamento` (a partir da `feat/memoria-espera`), pelo plano
  `docs/superpowers/plans/2026-10-30-e1-sem-anti-travamento.md`. As caixas marcadas no plano dizem o que já foi feito.
- **Próximo passo exato:** tarefa 1 do plano da E1 (Defesa Absoluta até o ataque, com `RULES_VERSION` 3 e as partidas de
  referência regravadas no mesmo commit). Se a `feat/memoria-espera` ainda não estiver na `main`, mescle-a por fast-forward
  (CI verde). A E1 leva três coisas: sem anti-travamento, a **Defesa Absoluta até o ataque** e os **Absolutos em 3 s**
  (`decisoes.md` 2026-10-30 (4); spec do sub-projeto 5, E1).
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app, `pnpm dev:web`) e o
  `jogar-treino.bat` do autor.

## A `main`

`feat/revisao-notas` mesclada (2026-10-30), CI verde (check + e2e). Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D (`8d7f078`, `a5a76c5`,
`bba8377`, `8cdf0a1`) e a memória compartilhada. Regras em vigor: spec 1
(`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes da spec do sub-projeto 5
(`2026-10-27-ajustes-design.md`).

## Fila (sub-projeto 5)

1. **E1:** sem anti-travamento e sem limite de rodadas, Defesa Absoluta até o ataque, Absolutos em 3 s.
   `RULES_VERSION`/`STATE_SCHEMA` 3, partidas de referência regravadas, portão do Difícil do zero.
2. **E2:** Equipar livre.
3. **F1:** apagar o histórico (só web).
4. **E3 + F2 + F3:** roubo, cura pela Defesa, limite de 4 especiais, Reflect reativo e Devastação, medidos juntos no simulador
   antes de virar regra. As regras estão aprovadas (spec do sub-projeto 5); falta a medição e a forma da penalidade do limite.

## Esperando o autor

- **[I] a confirmar, junto com os números da E3:**
  - Defesa Absoluta até o ataque: o Ataque Absoluto e o ataque devolvido por Reflect contam como ataque; Reflect contra Reflect,
    Armadilha, Sacrifício, Roubo e Devastação não a encerram; ao acabar, sai 1 Q como hoje (`decisoes.md` 2026-10-30 (4)).
  - Defesa Absoluta contra o Reflect: o Reflect segura o golpe (o dono leva 0), mas não devolve dano nem quebra Q e K do
    atacante?
  - Reflect contra Reflect: o golpe não acontece, nenhuma carta sai das fileiras e ninguém leva dano?
- **Forma da penalidade do limite de 4 especiais:** vai com 2 ou 3 opções medidas.
- O lote de 2026-10-30 e as perguntas da revisão das notas (F4, notas 6 a 8) foram respondidos; tudo no `decisoes.md`.

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
