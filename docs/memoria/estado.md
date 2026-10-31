# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-10-31**, pela conta que assumiu depois do limite semanal da anterior.
> Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Branch:** `feat/regras-e3`, no checkout principal `D:\andr3\jogo-coringa`, a partir da `main` (`f0ac24b`, com a F1:
  apagar uma partida ou o histórico em `/partidas`, sempre com confirmação).
- **Em curso:** o autor respondeu (`decisoes.md` 2026-10-31 (8)): **BURN 4**, o **Roubo sem naipe** (todo roubo dá dano e cura)
  e a **iniciativa mais clara na tela**. Agora: o motor (BURN 4 no padrão e o Roubo novo), o bot e a remedição do Roubo, com a
  parada combinada (acima de 65% no pareado, duração mudando ou partida no teto: para e volta a ele); depois, o plano 2. O plano 1
  está em `docs/superpowers/plans/2026-10-30-e3-f2-f3-plano-1.md`.
- **Feito no plano 1:** Reflect reativo (`d165891`, `RULES_VERSION` 4 e `STATE_SCHEMA` 4), Devastação (`44b6672`), Roubo
  (`40a19ae`), cura passiva (`966960b`, `defenseHealGuard`), limite de especiais com BURN, CHOOSE e FEWER (`76805ba`,
  `specialLimit`; o padrão fica **sem limite** até ele escolher), a medição (`5a1061d`, `e1eff5f`: `pnpm sim:e3`, relatório em
  `packages/sim/reports/e3.md`). A spec 1 já descreve as regras novas. A leitura dos números está em
  `docs/memoria/notas/medicao-e3.md`.
- **Próximo passo exato:** no motor, `DEFAULT_CONFIG.specialLimit = { max: 4, penalty: 'BURN' }` e o Roubo sem naipe
  (`actions/main.ts` `steal`, a chave do `legal-actions`, o `stealValue` do `eval`, o `text.ts`, as métricas da `e3.ts`, a spec 1
  §1 A); regravar as partidas de referência e trocar o digest da v4; remedir com `pnpm sim:e3`. Depois, o **plano 2**: a
  interface (o Roubo com escolha de alvo e fileira, a cena da Devastação, o Reflect na reação, a cura e o dano do roubo na mesa,
  a iniciativa: o dano da rodada ao vivo e o aviso de fim de rodada sempre, com o motivo), o tutorial (rever a semente sob o limite escolhido e as dicas do A, do fim, da Guarda e do Reflect), a fixture
  `e2e/fixtures/especiais.json` (gravada nas regras antigas), o resumo das regras, as specs da web e do polimento, as partidas de
  referência, `pnpm sim:dificil --recomecar`, a calibração, o E2E e o merge.
- **Avisos para o plano 2:** o teste de propriedade das jogadas da mesa (web) pula o `STEAL` até a interface do Roubo existir; o
  previsor da mão do tutorial (`sim/src/tutorial-seed.ts`) só conhece a BURN e falha alto com outra forma; a CI `e2e` desta
  branch pode estar vermelha (a interface ainda não oferece as jogadas novas).
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app, `pnpm dev:web`) e o
  `jogar-treino.bat` do autor.

## A `main`

E1, E2 e F1 mescladas (2026-10-30). Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D (`8d7f078`, `a5a76c5`,
`bba8377`, `8cdf0a1`), a memória compartilhada, a E1, a E2 e a F1. Regras em vigor: spec 1
(`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes da spec do sub-projeto 5
(`2026-10-27-ajustes-design.md`).

## Fila (sub-projeto 5)

1. **E3 + F2 + F3:** roubo, cura pela Defesa, limite de 4 especiais, Reflect reativo e Devastação, medidos juntos no simulador
   antes de virar regra. As regras estão aprovadas (spec do sub-projeto 5); falta a medição e a forma da penalidade do limite.

## Esperando o autor

- **Bloco E3 + F2 + F3 (respondido em 2026-10-31 (8); falta só confirmar no playtest):**
  - as 10 leituras [I] do plano 1 (`notas/medicao-e3.md`, seção 4), vistas sem comentário;
  - as [I] do Roubo novo e da iniciativa na tela (`decisoes.md` 2026-10-31 (8)).

- **Achados da E1, para ele saber (não pedem decisão agora):**
  - sem o anti-travamento, quem se fecha na Defesa e joga todos os K chega à **Exódia em 25,5%** das partidas `turtle` ×
    `greedy` (era 1,7%). É o caso que ele previu; o limite de 4 especiais (E3) responde. A tartaruga deixou de compensar: o
    líder que se fecha pontua 25 pp menos que o que segue jogando;
  - uma partida online sem limite de rodadas faz o log de passos crescer sem teto. O storage aguenta 2 MB por chave (~20 mil
    passos com a margem do teste, cem vezes uma partida típica), e a sala expira em 24 h. Detalhes na spec do servidor §9.4.
- **[I] da E2 (Equipar livre), para ele confirmar no playtest:**
  - sem tocar numa carta, o destino vale para a primeira que falta, na ordem de compra (o fluxo de antes segue em um toque);
  - no envio antecipado (faltam 1,5 s) e no tempo esgotado, as que faltam entram depois das escolhidas, na ordem de compra;
  - o terminal do simulador (`pnpm play`) continua perguntando na ordem de compra.
- **[I] da F1 (apagar o histórico), para ele confirmar no playtest:**
  - apagar uma partida só também pede confirmação;
  - apagar tudo não mexe no tutorial, nas preferências, no apelido nem no nível;
  - uma partida online apagada volta à lista se ele reabrir o link daquela sala terminada em até 24 h (a sala manda o
    desfecho de novo, e a junção pela `key` não acha mais a linha).
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

- **Ferramentas:** Node 26.13 e pnpm 11.9. Não há `gh` nem a CLI `claude` no PATH (a CI se lê pela API pública do GitHub,
  com `curl`). O Ubuntu do WSL sumiu.
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
