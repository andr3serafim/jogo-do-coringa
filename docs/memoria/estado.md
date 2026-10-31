# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-10-31**, pela conta que assumiu depois do limite semanal da anterior.
> Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Branch:** `feat/cura-passiva`, no checkout principal `D:andr3jogo-coringa`, a partir da `main` (`dfeb083`).
- **Em curso:** a marca "Cura passiva" no campo enquanto houver 2 K ou mais na Guarda (`decisoes.md` 2026-10-31 (10)). O
  autor também respondeu que o dano do Roubo fica fora da iniciativa (nada muda no código).
- **Próximo passo exato:** `pnpm check` e `pnpm e2e` passaram; falta o push da branch, as duas CI verdes e o fast-forward da `main`, depois este arquivo com "nada em curso".
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app, `pnpm dev:web`) e o
  `jogar-treino.bat` do autor.

## A `main`

E1, E2, F1 (2026-10-30) e o bloco E3 + F2 + F3 (2026-10-31) mesclados. Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D
(`8d7f078`, `a5a76c5`, `bba8377`, `8cdf0a1`), a memória compartilhada, a E1, a E2, a F1 e o bloco E3 + F2 + F3 (o Reflect
reativo, a Devastação, o Roubo sem naipe, a cura pela Defesa, o limite de 4 especiais com a BURN e a iniciativa com o placar na
tela). Regras em vigor: spec 1 (`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes da
spec do sub-projeto 5 (`2026-10-27-ajustes-design.md`).

## Fila (sub-projeto 5)

Vazia: o bloco E3 + F2 + F3 era o último item.

## Esperando o autor

- **Bloco E3 + F2 + F3, para o playtest** (números em `notas/medicao-e3.md` §5 e §6):
  - **O Roubo segue fraco:** mesmo com dano e cura, o bot que rouba vence 39% contra o que não rouba (o A vale mais como
    Armadilha contra um K). A regra é a que ele pediu; se ele quiser o Roubo competitivo, as alavancas são o dano contar para a
    iniciativa, o K não anular ou o Roubo valer mais.
  - **O desenho do naipe:** a regra não tem mais naipe, mas as cartas seguem desenhadas com ele ([I] em `decisoes.md` 2026-10-31
    (8)). Tirar o desenho é outra tarefa, se ele quiser.
  - **As [I] do plano 2:** o placar da iniciativa na faixa do centro e o motivo na pergunta da ordem; a faixa do fim de rodada
    sempre, por 1,2 s fora do teto de decisão; o Roubo como duas jogadas do A ("para o seu Ataque", "para a sua Defesa"); a cena
    rara da Devastação; a faixa da queimada; as três dicas novas do tutorial (Roubo, Devastação, limite) e a semente nova
    (`tutorial-381`).
  - as 10 leituras [I] do plano 1 (`notas/medicao-e3.md`, seção 4), vistas sem comentário.
  - **Para ele saber:** o `RULES_VERSION` ficou em 4 nas mudanças de 2026-10-31 (a produção vai de 3 para 4 de uma vez); partidas
    de treino guardadas no navegador dele com builds desta branch (o `jogar-treino.bat` roda o checkout) abrem sem aviso de
    versão, mas o replay delas pode divergir (o Roubo mudou). Apagar o histórico em `/partidas` resolve.
  - **Pequenos ajustes deixados para depois** (nenhum quebra o jogo): soltar o A numa numérica do Bot abre as jogadas e não lembra
    a carta (é preciso escolher o alvo de novo); com um A na mão, o Selvagem não oferece o Roubo (a mesa segue a fonte única que o
    motor lista); a carta A da mão ainda diz "Armadilha" no rótulo curto; a vida conta antes de o "+N" da cura subir.
  - **O deploy** das regras novas é dele (`pnpm deploy:server`).

- **Achados da E1, para ele saber (não pedem decisão agora):**
  - sem o anti-travamento, quem se fecha na Defesa e joga todos os K chega à **Exódia em 25,5%** das partidas `turtle` ×
    `greedy` (era 1,7%). É o caso que ele previu; o limite de 4 especiais (E3) responde. A tartaruga deixou de compensar: o
    líder que se fecha pontua 25 pp menos que o que segue jogando. Com o bloco E3 (o limite com a BURN e o A que rouba), a Exódia
    do turtle caiu para **7,9%** (calibração de 2026-10-31);
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
- **[I] da E1 e do Reflect, para o playtest (sem resposta dele até aqui):**
  - Defesa Absoluta até o ataque: o Ataque Absoluto e o ataque devolvido por Reflect contam como ataque; Reflect contra Reflect,
    Armadilha, Sacrifício, Roubo e Devastação não a encerram; ao acabar, sai 1 Q como hoje (`decisoes.md` 2026-10-30 (4)).
  - Defesa Absoluta contra o Reflect: o Reflect segura o golpe (o dono leva 0), mas não devolve dano nem quebra Q e K do
    atacante?
  - Reflect contra Reflect: o golpe não acontece, nenhuma carta sai das fileiras e ninguém leva dano?
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
