# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-01**, ao fechar a fatia 3. A conta que escreveu isto está no fim do limite semanal, e a
> próxima assume daqui. Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do
> `CLAUDE.md`).

## Agora

- **Branch:** `main`, no checkout principal, sem trabalho em curso. Não existe branch, plano nem arquivo da fatia 4.
- **Feito por último:** a **fatia 3 do sub-projeto 6** (a Exódia e a Devastação, com a desolação e os sons), na `main` com as duas CI verdes
  (run `41346331555`, em `b8171a8`), **jogada e aprovada pelo autor, sem ajustes** (`decisoes.md` 2026-11-01 (6)). Plano em
  `docs/superpowers/plans/2026-11-01-direcao-visual-fatia-3.md`; cada escolha técnica no `diario.md` 2026-11-01 (4); medição em
  `notas/medicao-fatia-3.md`.
- **Esperando o autor:** nada agora. Ele volta pela outra conta.
- **Próximo passo exato: escrever o plano da fatia 4** (o Reflect e a Ressurreição, com os sons):
  1. Leia a spec `docs/superpowers/specs/2026-10-31-direcao-visual-design.md`: §1, a gramática do §7, §7.5, §7.6, §9 a §11, §13 e §14. Veja
     as duas cenas no protótipo aprovado (`2026-10-31-direcao-visual-prototipo.html`; a linha 9 da spec diz como abrir). Use o plano da
     fatia 3 como modelo de formato.
  2. Escreva o plano com `superpowers:writing-plans`, em `docs/superpowers/plans/AAAA-MM-DD-direcao-visual-fatia-4.md`. Commite assim que
     estiver pronto, e entregue ao autor com as escolhas listadas. **Nada de código antes da aprovação,** que entra em `decisoes.md`.
  3. Execute como nas fatias 2 e 3: branch `feat/direcao-visual-fatia-4`, aqui mesmo, tarefa por tarefa (`superpowers:executing-plans`), sem
     subagente salvo pedido dele. As escolhas vão para o diário a cada tarefa (regra 6), e o fast-forward na `main` exige as duas CI verdes.
     Depois, ele joga.
  4. Por último, a fatia 5 (a fluidez das jogadas comuns, §8), que fecha o sub-projeto 6.
- **Para ver as cenas da fatia 3 sem esperar no treino:** importe a fixture `packages/web/e2e/fixtures/exodia-devastacao.json` para a chave
  `coringa:partidas` e abra `/partidas/exodia-devastacao`. No passo 210, "Próximo passo" toca a Devastação (a sua, na Defesa do Bot); no
  passo 407, a Exódia do Bot.
- **Para ver as cenas da fatia 2 sem esperar um Ataque Absoluto no treino:** importe a partida da fixture do E2E
  (`packages/web/e2e/fixtures/absolutos.json`) e abra `/partidas/absolutos`, rodada 11 (o Ataque Absoluto do Bot) e rodada 13 (a
  sua Defesa Absoluta).
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app, `pnpm dev:web`) e o
  `jogar-treino.bat` do autor.
- **Para quem assumir:**
  - um `wrangler dev` do autor pode estar na porta 8787. O Playwright o reaproveita, e o E2E falha (o online pela semente; o das
    cenas porque ele não serve `/partidas/...`). Com ele aberto, rode o E2E pela CI ou troque a porta só naquela execução;
  - não edite nada enquanto o pre-push roda;
  - não há Python nesta máquina, e heredoc grande no shell às vezes quebra (crase, aspas): para editar vários arquivos, escreva um
    script `.mjs` com a ferramenta de escrita e rode com `node`;
  - o ledger `.superpowers/sdd/…` fica fora do git: vale o `diario.md` e o `git log` (regra 6 do `CLAUDE.md`).

## O que o plano da fatia 4 precisa decidir (mapa, não plano)

Levantado do código e da spec ao fechar a fatia 3, para poupar a releitura. **Nada aqui foi aprovado pelo autor.**

- **Os tempos:** o `SCENE_MS` (`packages/protocol/src/scenes.ts`) dá 1,5 s a `ReflectPlayed` e a `ReflectTriggered`, e não tem `Resurrected`.
  A spec pede ~3,7 s no Reflect (falta dividir entre os dois eventos) e ~4,9 s na Ressurreição. Cuidados:
  - o `BEAT_MS.scene` (`model/timeline.ts:16`) sai do `ReflectPlayed`, então mudar esse tempo mexe nele;
  - duas cenas no mesmo passo somam até o teto de 8 s (§9);
  - a tabela vive também nos testes `timers.test.ts` (servidor) e `scenes.test.ts` (protocolo). Na fatia 3, mudá-la não subiu o `STATE_SCHEMA`.
- **Hoje, na linha do tempo:** `Resurrected` e `ReflectCanceled` são batidas de movimento (`move`), não cenas; `ReflectPlayed` já leva o K, o J
  e o Q, e os dois Reflects ainda usam o painel antigo (`ui/anim/Scene.tsx`).
- **O espelho fica na mesa** entre o `ReflectPlayed` e o `ReflectTriggered`, no lugar da zona "Reflect ativo": é estado na mesa, não só cena.
  Deve sair da `view` (nada de regra na interface).
- **Os casos do Reflect:**
  - cancelado (`ReflectCanceled`): os dois espelhos trincam, sem cometa;
  - contra a Defesa Absoluta: o cometa se desfaz, sem voltar;
  - o Ataque Absoluto que bate num Reflect já cede a inversão à cena do Reflect (`timeline.ts:244`);
  - a Devastação refletida vem logo depois da cena do Reflect: as inversões respeitam a trava de 2 s.
- **A Ressurreição não diz de qual quadra veio:** o evento é `{ player, card, row }` (`packages/engine/src/types.ts:257`), e o §7.6 acende "a
  que gerou a Ressurreição usada". O plano precisa dizer como saber isso, ou usar a saída que o próprio §7.6 prevê para a quadra desfeita (os
  fios saem do lugar, sem cartas acesas). **Sem inversão** nessa cena.
- **A fixture de E2E:** as três atuais (`packages/web/e2e/fixtures/`) guardam jogadas, não eventos. Todas têm `RESURRECT` (`exodia-devastacao.json`
  tem 13), e nenhuma tem `REFLECT` nem `CANCEL_REFLECT`: para o Reflect, falta procurar uma partida com bots. A mesma busca pode achar a
  Devastação refletida e a cancelada, e isso fecha o que a fatia 3 não conferiu no navegador.
- **Os sons:** as receitas moram em `sound/synth.ts` e as pistas em `model/sound.ts`, nos instantes de `model/scene-moments.ts`.

## A `main`

E1, E2, F1 (2026-10-30), o bloco E3 + F2 + F3 (2026-10-31), a marca "Cura passiva", as fatias 1, 2 e 3 do sub-projeto 6 e os ajustes da fatia 1 (2026-11-01) mesclados. Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D
(`8d7f078`, `a5a76c5`, `bba8377`, `8cdf0a1`), a memória compartilhada, a E1, a E2, a F1 e o bloco E3 + F2 + F3 (o Reflect
reativo, a Devastação, o Roubo sem naipe, a cura pela Defesa, o limite de 4 especiais com a BURN e a iniciativa com o placar na
tela). Regras em vigor: spec 1 (`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes da
spec do sub-projeto 5 (`2026-10-27-ajustes-design.md`).

## Fila (sub-projeto 5)

Vazia: o bloco E3 + F2 + F3 era o último item.

## Esperando o autor

- **Sub-projeto 6, fatia 3: jogada e aprovada em 2026-11-01, sem ajustes** (`decisoes.md` 2026-11-01 (6)). O que ele aprovou no plano
  (`decisoes.md` 2026-11-01 (4)) está na spec §14. O que a execução decidiu, e o que muda em relação ao plano:
  - **a fita da cancelada pela Defesa Absoluta tem texto próprio:** "A sua Defesa Absoluta / A Defesa Absoluta de X segurou a Devastação
    devolvida". O plano dizia para manter o texto, mas ele falava dos Reflects, errado para esse motivo;
  - **a vida do perdedor da Exódia escorre a 0 meio segundo antes de o retrato rachar** (como no protótipo; o plano só falava da rachadura);
  - **a Exódia não treme a tela,** e a coroa tem a sombra desenhada, sem `drop-shadow`. Se faltar peso, é fácil pôr o tremor;
  - **o carimbo da Devastação fica ao lado da fileira,** para não cobrir as cartas que caem;
  - **os campos não rolam mais de lado:** o tremor abria uma barra de rolagem (achado só no navegador);
  - **a partida nova zera a desolação,** e o replay a calcula pelos quadros;
  - **a fenda e as rachaduras** correm por escala e opacidade, sem filtro (§11): ficam menos ásperas que as do protótipo;
  - **não conferido de verdade:** o som (só os instantes), a cancelada e a refletida no navegador (só testes: nenhuma partida da busca com
    bots cancelou, e a refletida não foi procurada) e o movimento reduzido no navegador. A revisão final foi de quem escreveu o código, sem
    subagente;
  - **pequenos, para depois:**
    - se a janela mudar de tamanho com o abismo aberto, as cartas voltam a cair do começo;
    - no replay, os controles no meio de uma cena não cortam o som dela (o mesmo da fatia 2).

- **Sub-projeto 6, fatia 2: jogada e aprovada em 2026-11-01, com o conserto do corte da cena** (`decisoes.md` 2026-11-01 (3)). As
  escolhas que ele aprovou no plano e o que a execução decidiu:
  - **o número do golpe do Ataque Absoluto é desenhado pela cena,** perto do retrato do alvo, e não pelo placar. A mesa é um
    contexto de empilhamento próprio (o grão de papel atrás dela), e o número do placar ficaria embaixo da cena;
  - **a cortina deixa o placar à vista em todas as cenas,** inclusive a Exódia, a Devastação e o Reflect, que seguem com o painel
    antigo até as fatias delas;
  - **os raios de luz da trava ficam em 35% de opacidade,** em cunhas finas, e o brilho em volta do Coringa em até 45%: nada passa
    de 25% da tela fora da inversão;
  - **não conferido de verdade:** o som (os testes conferem os instantes das vozes, não o ouvido), o movimento reduzido no
    navegador (só nos testes de unidade) e o Ataque Absoluto que é seu (a fixture tem o do Bot). A revisão final foi de quem
    escreveu o código (sem subagente);
  - **pequenos, para depois:**
    - os controles do replay no meio de uma cena não cortam o som dela;
    - se a janela mudar de tamanho no meio do Ataque Absoluto, as partículas reagendam dali;
    - o teste do servidor "hibernação no meio da partida" é instável (depende da mão sorteada);
    - o quadro da chegada do passo pesa 115 a 270 ms com a CPU 4× (o mesmo da fatia 1; candidato à fatia 5).

- **Sub-projeto 6, fatia 1: jogada e aprovada em 2026-11-01, com três ajustes** (na `main`). O que mudou da letra da spec,
  que ele viu jogando:
  - **o tremor do golpe sacode a mesa (o placar e os campos), não a tela inteira:** a mão, a barra e o histórico ficam parados.
    Sacudir tudo custava ~9 quadros por segundo com a CPU 4× mais lenta, e a mão parada também se joga melhor;
  - **a mão que respira e o lampejo da espada pausam durante as batidas** (os controles estão travados nelas);
  - o relógio fica parado até o fim da folga mesmo com a cena pulada (o desvio que ele aprovou no plano);
  - "Tempo esgotado" e o turno pausado moram na faixa do meio, junto da fase (não cabem na placa do celular);
  - no PC o campo passou a ter duas colunas (fileiras | zonas); a fita de cordel desce do placar, centrada na placa;
  - **não conferido de verdade:** a quadra marcada só foi vista montada na tela (não saiu quadra nas partidas de teste), e o
    movimento reduzido pelo menu só nos testes de unidade; a revisão final foi de quem escreveu o código (sem revisor à parte);
  - **pequenos, para depois:** a Defesa Absoluta que estende o prazo faz o leitor de tela anunciar o relógio de novo; dois golpes
    colados tremem uma vez só; o quadro em que a jogada chega pesa ~200 ms com a CPU 4× mais lenta (a `main` antes: ~83 ms),
    candidato à fatia 5 (fluidez).

- **Bloco E3 + F2 + F3, para o playtest** (números em `notas/medicao-e3.md` §5 e §6):
  - **O Roubo segue fraco:** mesmo com dano e cura, o bot que rouba vence 39% contra o que não rouba (o A vale mais como
    Armadilha contra um K). A regra é a que ele pediu; se ele quiser o Roubo competitivo, as alavancas são o dano contar para a
    iniciativa, o K não anular ou o Roubo valer mais.
  - **A marca "Cura passiva" ([I] de 2026-10-31 (10)):** nos dois campos, fundo de papel (o ouro é dos Absolutos), sem o
    multiplicador dos Q; o item do resumo das regras virou "Cura passiva (pela Defesa)". O histórico segue dizendo "curou N pela
    Defesa".
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
    motor lista); a carta A da mão ainda diz "Armadilha" no rótulo curto. (A vida que contava antes de o "+N" da cura subir foi
    resolvida em 2026-11-01.)
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
- **Branches que sobraram:** todas as locais já estão mescladas na `main` (conferido em 2026-11-01), inclusive
  `claude/inspiring-sammet-387417` e `feat/ajustes-fase-a`. Só o trabalho novo precisa de branch nova.
- **Arquivo solto:** o `jogar-treino.bat` na raiz é o lançador do autor. Não mexer nem commitar.
