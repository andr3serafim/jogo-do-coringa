# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-08**, o bloco C feito, na revisão da branch inteira, na `feat/playtest-bloco-c`. Antes de seguir,
> confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Em curso (2026-11-08): a execução do bloco C** (pontos 10, 11 e 13), com o plano aprovado como estava ("Aprovo como está", `decisoes.md`
  2026-11-08 (2)): `docs/superpowers/plans/2026-11-08-playtest-bloco-c.md`, na branch `feat/playtest-bloco-c` (saída da `main` em
  `792bd62`), no checkout principal, aqui mesmo, tarefa por tarefa, com um revisor novo no fim. Cinco tarefas: o motor conta a sequência
  (`streak` no `InitiativeDecision`, `STATE_SCHEMA` 6, `RULES_VERSION` igual), o relógio da mesa e a aura da iniciativa, os bônus em escala, a
  liderança, e o E2E com as fotos, a medição e o portão do Difícil. **As cinco tarefas estão feitas** (`e241da8`, `9bd8e19` + `3fe5db3`,
  `0bf2f85`, `f2c0129`, `de654f7` + `3e5fb23` + `5510071`): o E2E (`e2e/power.spec.ts` + layout, 18 de 18, medindo em repouso), a medição
  (`notas/medicao-bloco-c.md`), o portão do Difícil (rodada 4: 69,0% e 81,5%, p95 146 ms, aprovado), a spec §5.2 corrigida e a §5.4 nova, e
  o ouro de quem lidera 4 px menor no PC (o E2E pegou 1,5 px fora da fileira). **Próximo passo exato:** a revisão da branch inteira num
  subagente (`792bd62..HEAD`, em curso), corrigir o que for Critical ou Important, depois o push (o pre-push roda o `pnpm check`), as duas
  CI (`check` e `e2e`) e o fast-forward da `main`. Achados do mapeamento: a `especiais.json` tem todos os
  níveis (3 Q no passo 68, 3 J no 90, 4 J no 99, a sequência 3/5/10 nos 92/111/161, 3 K no 174, a liderança do Ataque no 78); o
  `PROTOCOL_VERSION` (1) nunca subiu com mudança de estado; as formas da aura (`ui/scenes/aura.ts`) precisam sair do chunk das cenas.

- **Onde está:** a `main` tem tudo (fast-forward até este commit; as duas CI verdes no commit antes deste, `a8aa55b`, run
  `42348114555`). O checkout principal está na `feat/playtest-bloco-b`, igual à `main`. **Trabalho novo sai de uma branch nova da
  `main`** (prefixo `feat/`, para a CI rodar). Nada sem commit além do de sempre (abaixo). Nenhuma sessão paralela aberta.
- **Feito em 2026-11-07: o bloco B, o golpe final (ponto 15).** Plano aprovado como estava (`decisoes.md` 2026-11-07 (3)); execução, revisão
  da branch inteira e consertos no `diario.md` 2026-11-07 (2); medição em `notas/medicao-bloco-b.md`; o que a execução decidiu na §4.1 da
  spec do playtest. O ataque comum que leva a vida do outro a zero vira uma cena de 2,4 s na mesa (as tarjas, a fileira que acende, o corte
  até o retrato, a inversão, "GOLPE FINAL!" ou "DERROTA"); o retrato racha em toda derrota pela vida; a vida do derrotado para em 0 no
  placar; com movimento reduzido, a vida salta quando o golpe da cena acende. Nada mudou no motor nem no servidor.
- **Feito em 2026-11-06 e 07:**
  - o quinto caso de placa ("Sim, aplique", `decisoes.md` 2026-11-06 (1); `diario.md` 2026-11-06 (1)): a placa "Cura passiva" diz "o
    Ataque Absoluto dele quebra os K antes da cura" contra o Ataque Absoluto armado do outro, e "com 2 K depois do golpe, a sua Defesa
    que cai vira vida" com exatamente 2 K. Código em `2b26577`;
  - a placa do momento da Guarda com a mesma linha, com 2 K ("Sim, aplique", `decisoes.md` 2026-11-07 (1); `diario.md` 2026-11-07 (1)).
    Código em `51b7945`.
- **Feito nesta leva (2026-11-03 e 04), na ordem:**
  - **o desenho dos pontos do playtest virou spec** (`docs/superpowers/specs/2026-11-03-playtest-design.md`), com as respostas do autor às
    8 perguntas (`decisoes.md` 2026-11-03 (4)): a fatia 5 aprovada, a ordem dos blocos, a regra do 16 dele e os 3 K só com a aura;
  - **bloco A** (pontos 1, 2, 6 e 9: o momento da especial do oponente, a mão que apaga as cartas sem jogada, as placas de estado, a cura
    passiva que se explica): plano aprovado como estava (`decisoes.md` 2026-11-03 (5)), execução, revisão final e consertos no `diario.md`
    2026-11-03 (6); medição em `notas/medicao-bloco-a.md`; o que a execução decidiu na §3.5 da spec do playtest;
  - **bloco E** (ponto 16, a Ressurreição no instante da quadra), numa sessão paralela: plano aprovado com 15 s na janela (`decisoes.md`
    2026-11-03 (6)), execução e medição no `diario.md` 2026-11-03 (7) e na seção "Bloco E" abaixo; `RULES_VERSION` 5 e `STATE_SCHEMA` 5;
  - **os quatro textos de placa no caso de borda** ("Corrija os quatro", `decisoes.md` 2026-11-04 (1); `diario.md` 2026-11-04 (1)).
- **Próximo passo exato:** é a vez do autor (abaixo). Quando ele voltar:
  1. o que ele disser do playtest entra no `decisoes.md`, com o texto dele, antes de virar código;
  2. depois, os blocos que faltam da spec do playtest, nesta ordem (`decisoes.md` 2026-11-03 (4)): **C** (pontos 10, 11 e 13) e **D**
     (pontos 5 e 14). Cada um com plano escrito e aprovado por ele antes da execução, como os blocos A, B e E.
- **Esperando o autor:**
  - **jogar o golpe final** (bloco B): no treino, derrubar o Bot com um ataque comum, e perder para ele; ou, sem esperar, o replay
    `especiais.json` do passo 178 para o 179 e o `absolutos.json` do 99 para o 100 (a receita das fixtures está abaixo). Conferir as cores
    dos dois carimbos (a derrota de tinta, com sombra vermelha, é escolha de quem escreveu) e o som. O online só depois do deploy dele;
  - **os menores do bloco B** (`diario.md` 2026-11-07 (2), "Menores, para depois"): a descida da vida mais curta quando o golpe passa
    de zero, o cinza do retrato por `filter`, dois buracos do E2E, o afundar não cancelado no pulo, o corte sem esmaecer com movimento
    reduzido, textos antigos e dois testes que faltam;
  - **jogar** os blocos A e E e as placas novas. O treino já mostra tudo; o online só depois do `pnpm deploy:server` dele, que leva a folga
    do momento no prazo, o PASS guardado depois do Ás, o conserto do Equipar vazio e a janela da Ressurreição. O deploy fecha as salas
    abertas (`STATE_SCHEMA` 5), e as partidas guardadas abrem com o aviso de versão (`RULES_VERSION` 5);
  - **as frases novas das placas são de quem escreveu** (ele aprovou corrigir, não as palavras): conferir no playtest;
  - **o quinto caso de placa e a placa do momento da Guarda:** feitos em 2026-11-06 e 07 (acima). As frases novas ("o Ataque Absoluto
    dele quebra os K antes da cura", "com 2 K depois do golpe, a sua Defesa que cai vira vida", também no momento em que o Bot põe K na
    Guarda) entram na conferência do playtest com as outras;
  - **os pequenos do bloco A, não feitos** (`diario.md` 2026-11-03 (6), "menores"): a explicação da cura passiva se perde na partida se a
    primeira cura for pulada ou chegar num `catchUp`; as placas "Cura passiva" e "Ataque Absoluto armado" aparecem 1,6 s antes de o K ou o J
    pousar; o `copy.ts` segue fora da cobertura;
  - **o não conferido do bloco E** (seção "Bloco E" abaixo): a troca no navegador, o relógio de 15 s online e o som.
- **Para medir uma cena com a 8787 ocupada:** `MEDIR_PORTA=8797` no `medir-cena.ts`. Para o E2E inteiro numa porta livre, a receita está no `diario.md` 2026-11-02 (8) (uma configuração que importa o `playwright.config.ts` e troca a porta).
- **Para ver o momento do bloco A sem esperar no treino:** importe a fixture `packages/web/e2e/fixtures/especiais.json` para a chave
  `coringa:partidas` e abra `/partidas/especiais`. "Próximo passo" a partir do passo 10 (rodada 3) toca o J do Bot e, no 11, o segundo J do
  turno (mais curto); no 35 (rodada 9), o Roubo; no 51 (rodada 13), a Guarda; no 109 (rodada 23), a Armadilha; no 137 (rodada 29), a sua
  cura passiva. A linha da zona do Reflect aparece no `/partidas/reflect`, rodada 37, passo 176.
- **Para ver a Ressurreição sem esperar no treino:** importe a fixture `packages/web/e2e/fixtures/exodia-devastacao.json` para a chave `coringa:partidas` e abra `/partidas/exodia-devastacao`. "Próximo
  passo" na rodada 7, passo 27, mostra a sua, com a quadra; na rodada 23, passo 107, a do Bot, com a quadra na outra fileira; na rodada 37, passo 182, a do Bot sem quadra.
- **Para ver as cenas do Reflect sem esperar no treino:** importe a fixture `packages/web/e2e/fixtures/reflect.json` para a chave `coringa:partidas` e abra
  `/partidas/reflect`. Na rodada 37, "Próximo passo" no passo 175 mostra o espelho do Bot, e no passo 176 o cometa; na rodada 73, no passo 358, a Devastação refletida.
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
  - **ao levar ao autor um caso de borda** (a ordem do motor, um texto que o motor contradiz): passos numerados e um exemplo de mesa, curto,
    com a proposta numa linha à parte. A frase compacta ele não entendeu (2026-11-04, o quinto caso de placa);
  - não há Python nesta máquina, e heredoc grande no shell às vezes quebra (crase, aspas): para editar vários arquivos, escreva um
    script `.mjs` com a ferramenta de escrita e rode com `node`;
  - o ledger `.superpowers/sdd/…` fica fora do git: vale o `diario.md` e o `git log` (regra 6 do `CLAUDE.md`);
  - **tire fotos das cenas:** o jsdom não tem layout. Nas fatias 4 e 4b, só as fotos do Playwright acharam o cometa fora do lugar, a cena sem cortina e as cópias colapsadas. O `packages/web/e2e/medir-cena.ts` tira as fotos e mede a cena com a CPU 4× (o uso está no começo dele; o resultado vai para `notas/medicao-*.md`);
  - **em `test/ui`, todo teste é `.test.tsx`:** o Vitest da web não roda `.test.ts` ali, nem na CI, e nada avisa;
  - **`animation.test.tsx`** usa a sonda `installFlashProbe` (`test/ui/anim-harness.tsx`): as cenas do Reflect e da Ressurreição seguem com o painel de reserva nesse arquivo;
  - uma marca que dura menos de meio segundo escapa do `toHaveCount` do Playwright: quem procura é a própria página, a cada quadro (`e2e/scenes.spec.ts`).

## Bloco E (sessão paralela)

> Registro do bloco E (a regra do ponto 16), feito numa sessão paralela que terminou em 2026-11-04. A sessão, o worktree
> (`.claude/worktrees/ressurreicao-quadra-f59247`) e a branch local foram apagados depois de conferido que tudo estava na `main`; as
> remotas `claude/ressurreicao-quadra-f59247` e `feat/ressurreicao-quadra` (mescladas) ficam para o autor, com as outras velhas.

- **Feito (2026-11-03), o plano inteiro** (`docs/superpowers/plans/2026-11-03-ressurreicao-quadra.md`, aprovado com 15 s na janela,
  `decisoes.md` 2026-11-03 (6)); detalhes, commits e rulings no `diario.md` 2026-11-03 (7):
  - a regra na spec das regras (§1.4, §1.8, §1.12, §1.14, §2.3 a §2.7) e na spec da web (§3.4 e §3.5b);
  - motor (a janela `RESURRECTION`, a troca com a proteção da quadra, a chave `resurrectOnQuad`), bots, `RULES_VERSION` 5, servidor (15 s,
    `STATE_SCHEMA` 5), web (o painel, o cemitério com a troca e o total, a fileira protegida, a dica do tutorial), E2E (79 de 79);
  - a medição em `notas/medicao-ressurreicao-quadra.md`: 98% das quadras viram Ressurreição usada (eram 82%), a iniciativa quase não
    muda, a mediana de rodadas de Ataque vai a 14 (meta 8–14); o portão do Difícil aprovado do zero (69,0% / 81,5% / p95 até 189 ms).
- **Na `main`:** a `main` com o bloco A (`f8755bc`) foi mesclada aqui em `9125328` (conflitos só na memória e no `testMatch` do
  `playwright.config.ts`; as entradas do bloco E renumeradas: `decisoes.md` 2026-11-03 (6), `diario.md` (7)); as duas CI passaram nele
  (run `41764020751`), e a `main` foi por fast-forward até este commit, que só mexe na memória. Nada mais da sessão do bloco E em curso; ela foi apagada em 2026-11-04.
- **Para o autor** (o deploy é dele, `pnpm deploy:server`):
  - **jogue a janela:** ela aparece depois da revelação do Equipar quando você forma quadra e há numérica no cemitério; com as duas
    fileiras cheias, o cemitério mostra a troca (a carta que sai e o total);
  - o deploy fecha as salas online abertas (`STATE_SCHEMA` 5) e as partidas guardadas de antes abrem com o aviso de versão (`RULES_VERSION`
    5), mas reproduzem igual (a chave `resurrectOnQuad` fica ausente nelas);
  - **não conferido de verdade:** a troca no navegador (o E2E não chega a ela; só os testes da mesa, sem layout), o relógio de 15 s online
    e o som.
- **Convivência:** dos arquivos do bloco A, só o `copy.ts` mudou aqui (o `CLOCK_START_TEXT` e a linha da Ressurreição no resumo das
  regras). No merge, o `timing.ts` ficou com o `stepAllowanceMs` do bloco A e o caso `RESURRECTION` (15 s); o `passHeldUntil` só vale na
  `REACTION`, e a Ressurreição não entra nos momentos do bloco A.

## A fatia 5

Feita e aprovada (`decisoes.md` 2026-11-03 (4)): o plano é `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`, e a execução,
com os achados do código, está no `diario.md` 2026-11-02 (7) e (8).

## A `main`

- **Até 2026-11-02:** E1, E2, F1 (2026-10-30), o bloco E3 + F2 + F3 (2026-10-31), a marca "Cura passiva", as fatias 1 a 5 e a 4b do
  sub-projeto 6 (a direção visual). Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D (`8d7f078`, `a5a76c5`, `bba8377`,
  `8cdf0a1`), a memória compartilhada e o bloco E3 + F2 + F3 (o Reflect reativo, a Devastação, o Roubo sem naipe, a cura pela Defesa, o
  limite de 4 especiais com a BURN e a iniciativa com o placar na tela).
- **2026-11-03 e 04:** os pontos 16 a 18 do playtest (o 17 também online), a spec do playtest, o bloco A, o bloco E e os textos de placa.
- **2026-11-06 e 07:** o quinto caso de placa, a placa do momento da Guarda e o bloco B (o golpe final).
- **Regras em vigor:** a spec 1 (`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes do sub-projeto 5
  (`2026-10-27-ajustes-design.md`) e a regra do 16 (a Ressurreição no instante da quadra, §1.12 e vizinhas). `RULES_VERSION` 5,
  `STATE_SCHEMA` 5.

## Fila

Os blocos C e D da spec do playtest (`2026-11-03-playtest-design.md`), nessa ordem, cada um com plano aprovado antes ("Agora").

## Esperando o autor (histórico das fatias e dos blocos anteriores)

- **Sub-projeto 6, fatia 4b (a Ressurreição): jogada e aprovada em 2026-11-02, sem ajustes** (`decisoes.md` 2026-11-02 (5)). O que ele aprovou no plano está em `decisoes.md` 2026-11-02 (4). O que a execução decidiu:
  - **com duas quadras na mesma fileira, acende a de maior valor:** é a que mais soma na conta que o jogador vê;
  - **as cópias da quadra ficam até o céu sumir,** para a carta não "apagar" de repente sob a cortina;
  - **não conferido de verdade:** o som (só os instantes), o movimento reduzido e o caso de duas quadras na mesa: só nos testes de unidade. A revisão final foi de quem escreveu o código, sem subagente;
  - **a cena inteira a cada vez,** como ele decidiu (`decisoes.md` 2026-10-31 (12)). Uma partida de bots teve 13 Ressurreições; ele jogou e aprovou sem comentar, e mudar isso é decisão dele;
  - **achado no caminho:** o Vitest da web só roda `test/ui/**/*.test.tsx`. O `scenes-mirror.test.ts` da fatia 4 nunca tinha rodado; virou `.tsx` e passa, sem defeito escondido;
  - **pequenos, para depois:** o total da fileira já conta a carta no começo da cena (ele viu no plano); os controles do replay no meio de uma cena não cortam o som dela.

- **Sub-projeto 6, fatia 4 (o Reflect): jogada e aprovada em 2026-11-02, sem ajustes** (`decisoes.md` 2026-11-02 (3)). O que ele aprovou no plano está em `decisoes.md` 2026-11-02 (2). O que a execução decidiu:
  - **a cortina recusada tenta de novo:** numa cena com 2 s ou mais pela frente, ela sobe assim que a trava de flash deixa. Vale também para os Absolutos e a Exódia. O
    limite de 3 trocas por segundo não mudou;
  - **a cena mede depois de a mesa assentar:** sem isso, o cometa saía ~60 px abaixo da fileira. Achado só nas fotos: o jsdom não tem layout, e o teste é o olho;
  - **o que o plano deixou aberto:** as cartas saem da sua mão, ou do retrato do Bot, que não mostra a dele; o espelho pequeno fica no canto da zona, sem mudar a altura dela;
  - **não conferido de verdade:** o som (só os instantes), Reflect contra Reflect (nenhuma das 3.771 partidas de bots anulou), o dano 0, o seu próprio Reflect, o Ataque
    Absoluto contra Reflect e o movimento reduzido: todos só nos testes de unidade. A revisão final foi de quem escreveu o código, sem subagente. Na fixture, ele vê o
    Reflect do Bot e a Devastação refletida;
  - **pequeno, para depois:** no replay, os controles no meio de uma cena não cortam o som dela (o mesmo das fatias 2 e 3).

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
  - `D:\andr3\jogo-coringa-v5`: era o checkout limpo dos pushes da conta anterior; a pasta não existia mais, e o `git worktree prune` de 2026-11-03 tirou o registro.
  - `.claude/worktrees/youthful-elgamal-3d5e8a` (`claude/inspiring-sammet-387417`, num commit de 2026-10-27, limpo): criado em 2026-11-02 às 17:00, sem `pnpm install`, provavelmente por outra sessão do app. **Não apague:** pode ser de uma sessão aberta. Ele reprovava o ESLint, que agora ignora `.claude/**` (`6103b52`).
  - `.claude/worktrees/ressurreicao-quadra-f59247` (o bloco E): apagado em 2026-11-04. O app tirou a sessão, mas o worktree ficou; o
    `git worktree remove` tirou o registro e falhou na pasta ("Filename too long", o `node_modules`), que saiu no PowerShell com o prefixo
    de caminho longo: `Remove-Item -LiteralPath ('\\?\' + $p) -Recurse -Force`.
- **Branches que sobraram:** todas as locais estão mescladas na `main` (conferido em 2026-11-04), menos a `feat/online-equipar-vazio`
  (abaixo). As remotas velhas, mescladas, são do autor (`notas/playtest.md`), agora com `feat/playtest-spec`, `feat/playtest-bloco-a`,
  `feat/playtest-placas`, `feat/ressurreicao-quadra` e `claude/ressurreicao-quadra-f59247`. Só o trabalho novo precisa de branch nova.
  O worktree `.claude/worktrees/dreamy-engelbart-4a4876` (a sessão do online) foi apagado com a sessão, em 2026-11-03, e a branch `sync/online-equipar-vazio` (mesclada) também. Sobrou a local `feat/online-equipar-vazio`, que ficou num rebase não publicado (o force-push foi barrado) e pode ser apagada pelo autor (`git branch -D`). A remota `feat/online-equipar-vazio` está mesclada.
- **Arquivo solto:** o `jogar-treino.bat` na raiz é o lançador do autor. Não mexer nem commitar.
