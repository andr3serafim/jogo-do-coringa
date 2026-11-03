# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-03**, com as respostas do autor ao desenho do playtest registradas e o desenho
> virado spec, na branch `feat/playtest-spec`. Antes de seguir, confira se não há versão mais nova em outra branch (regra 1
> da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Branch:** `feat/playtest-bloco-a`, no checkout principal, saída da `feat/playtest-spec` em `0bd8d72` (CI verde). A `main` está em `d35a241`. **O plano do bloco A foi aprovado como está** (`decisoes.md` 2026-11-03 (5)), e a execução está em curso (`diario.md` 2026-11-03 (6)).
- **Feito no bloco A:** Task 1 (o momento na linha do tempo e no protocolo), Task 2 (o momento na mesa: o pouso, a saída, o véu e o online que segura) e Task 3 (o prazo do servidor e o bot do treino esperam o momento).
- **Feito também:** Task 4 (a carta grande que vira, a placa, o voo e o som do momento: `ui/anim/Moment.tsx`).
- **Feito também:** Task 5 (a mão que apaga as cartas sem jogada agora).
- **Feito também:** Task 6 (as placas de estado com medalhão e os gestos lentos).
- **Feito também:** Task 7 (a cura passiva que se explica: o halo dos K, a essência, a faixa da primeira vez e a dica).
- **Em curso na Task 8:** o E2E novo (`packages/web/e2e/moment.spec.ts`, sem commit até passar), com os passos achados na `especiais.json`: o J do Bot nos passos 10→11 e 11→12 (rodada 3, os dois no mesmo turno), o Roubo em 35 (rodada 9), a Guarda em 51 (rodada 13), a Armadilha em 109 (rodada 23) e uma cura sua em 137 (rodada 29). O script que acha os passos ficou no scratchpad; a receita: o motor reexecuta `replay.steps` e anota o quadro de antes de cada evento.
- **Próximo passo exato do bloco A:** a Task 8 do plano (`docs/superpowers/plans/2026-11-03-playtest-bloco-a.md`): achar os passos nas fixtures, o E2E, a medição e as fotos com o `medir-cena.ts` (nota `notas/medicao-bloco-a.md`), a revisão final num subagente (A8), as specs e o fechamento (as duas CI, o fast-forward na `main`).
- **O online muda com este bloco:** o prazo do servidor ganha a folga do momento. Só vale online depois do deploy do autor.
- **Feito por último** (`diario.md` 2026-11-03 (5)): as respostas do autor às 8 perguntas, em `decisoes.md` 2026-11-03 (4):
  - **a fatia 5 está aprovada:** o sub-projeto 6 fechou;
  - aprovados: a ordem dos blocos (A: 1, 2, 6, 9; B: 15; C: 10, 11, 13; D: 5, 14; o E, a regra do 16, em paralelo numa sessão própria), a variante A em todos os pontos e as perguntas 5 a 7;
  - **o ponto 4 mudou:** os 3 K na Guarda sem texto, só a aura nas cartas;
  - **a regra do 16 é a dele** (a §7.2 da spec, com as leituras [I]): a Ressurreição antes do ataque, ao formar a quadra; com as duas fileiras cheias, a última carta vai ao cemitério, a não ser que seja carta de quadra; a troca vale também na Ressurreição usada depois;
  - o desenho virou **spec**: `docs/superpowers/specs/2026-11-03-playtest-design.md`; o protótipo diz as respostas (os 3 K só com a brasa);
  - **a sessão do online foi apagada,** como ele pediu, com o worktree; a branch mesclada `sync/online-equipar-vazio` também. Sobrou a local `feat/online-equipar-vazio` (um rebase não publicado, com 2 commits fora da `main`): não foi apagada.
- **Antes, na `main`:**
  - **o rascunho do desenho e o protótipo** (`diario.md` 2026-11-03 (4)), feitos com o autor fora; os números do 16 em `notas/medicao-ponto-16.md`;
  - **o online do Equipar vazio** (`diario.md` 2026-11-03 (3), a sessão que o autor abriu): o golpe que fecha a rodada não é mais cortado pelo Equipar vazio que o servidor aplica logo depois dele. **Ruling:** na mesa, não no servidor: um `state` ao vivo, na mesma `epoch` e só com eventos quietos (`quietOnly`) não troca a linha do tempo em curso (`useBeatPlayer`); vale também para o oponente que confirma o Equipar no meio do golpe. **Para o autor:** só muda no online depois do `pnpm deploy:server` dele;
  - **ponto 18, ajustado** e **ponto 17, fechado** (`diario.md` 2026-11-03 (1) e (2));
  - a fatia 5 do sub-projeto 6 e os pontos diretos 3, 4, 7, 8 e 12 (`diario.md` 2026-11-02 (8)), **aprovada** em 2026-11-03 (4).
- **Ajuste depois da aprovação da 4b:** as cartas da quadra perderam o losango de ouro do canto (`decisoes.md` 2026-11-02 (6)); o fundo dourado, a moldura, o brilho e o selo ficam. Não mude isso de volta seguindo a letra antiga do §6.
- **Também feito:** o **plano do bloco A** (pontos 1, 2, 6 e 9): `docs/superpowers/plans/2026-11-03-playtest-bloco-a.md`, com 8 tarefas e as escolhas A1 a A9 para o autor aprovar (a A9 é a mais importante: online, a especial seguinte de quem joga cortaria o momento que o oponente vê). **Não aprovado ainda.**
- **Em paralelo:** a sessão do **bloco E** (a regra do 16), aberta em 2026-11-03 num worktree próprio (`.claude/worktrees/ressurreicao-quadra-f59247`, branch `claude/ressurreicao-quadra-f59247`, saída da `feat/playtest-spec` em `d35a241`). Ela escreve a regra na spec das regras e o plano, e leva o plano ao autor nela mesma. Ela escreve o estado dela numa seção própria, `## Bloco E (sessão paralela)`. Terminada e conferida, a sessão sai (`decisoes.md` 2026-11-03 (4)).
- **Próximo passo exato:**
  1. Esperar as duas CI da `feat/playtest-spec` e mesclar na `main` por fast-forward.
  2. O autor aprova (ou ajusta) o plano do bloco A e as escolhas A1 a A9. O que ele disser entra no `decisoes.md`, com o texto dele.
  3. Aprovado: branch `feat/playtest-bloco-a` saída da `main`, e a execução tarefa por tarefa (A8), teste primeiro.
  4. O deploy e o playtest online são dele (`notas/playtest.md`). O deploy leva o conserto do Equipar vazio do online.
- **Para medir uma cena com a 8787 ocupada:** `MEDIR_PORTA=8797` no `medir-cena.ts`. Para o E2E inteiro numa porta livre, a receita está no `diario.md` 2026-11-02 (8) (uma configuração que importa o `playwright.config.ts` e troca a porta).
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
  - não há Python nesta máquina, e heredoc grande no shell às vezes quebra (crase, aspas): para editar vários arquivos, escreva um
    script `.mjs` com a ferramenta de escrita e rode com `node`;
  - o ledger `.superpowers/sdd/…` fica fora do git: vale o `diario.md` e o `git log` (regra 6 do `CLAUDE.md`);
  - **tire fotos das cenas:** o jsdom não tem layout. Nas fatias 4 e 4b, só as fotos do Playwright acharam o cometa fora do lugar, a cena sem cortina e as cópias colapsadas. O `packages/web/e2e/medir-cena.ts` tira as fotos e mede a cena com a CPU 4× (o uso está no começo dele; o resultado vai para `notas/medicao-*.md`);
  - **em `test/ui`, todo teste é `.test.tsx`:** o Vitest da web não roda `.test.ts` ali, nem na CI, e nada avisa;
  - **`animation.test.tsx`** usa a sonda `installFlashProbe` (`test/ui/anim-harness.tsx`): as cenas do Reflect e da Ressurreição seguem com o painel de reserva nesse arquivo;
  - uma marca que dura menos de meio segundo escapa do `toHaveCount` do Playwright: quem procura é a própria página, a cada quadro (`e2e/scenes.spec.ts`).

## O plano da fatia 5, em resumo

O mapa que estava aqui virou o plano (`docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`), **aprovado** em 2026-11-02 (`decisoes.md` 2026-11-02 (9)). Em nove tarefas:

1. a linha de base: medir os passos comuns e o quadro da chegada (100 a 225 ms com a CPU 4×), com o perfil; consertar só se a causa for nossa e local (E1);
2. o modelo (`model/table-motion.ts`): recuo, pouso, saída, estouro, as vizinhas que esperam a batida da saída (`shiftDelaysOf`) e os tempos, com teste que trava as durações da linha do tempo;
3. as partículas saem de `ui/scenes/` para `ui/anim/particles.ts`, e a mesa ganha a camada dos efeitos (`FxLayer`);
4. a jogada: recuo de 90 ms, voo na mola e pouso com achatamento (1,06 → 1) e poeira; a carta do Bot cai na batida dela (E3);
5. a saída e os estilhaços: cópias lidas no `getSnapshotBeforeUpdate` seguram as cartas que saem até a batida delas (E2), e as que quebram estouram em cacos (E5);
6. o leque da compra e do Equipar, do monte, 40 ms uma da outra (E6);
7. os sons (`carta` no pouso, `pouso`, `quebra` no estouro, `compra`) e os dois pequenos (o replay corta o som da cena; dois golpes colados tremem duas vezes) (E7, E8);
8. os pontos diretos do playtest: sem seleção de texto, sem a "Ameaça de X", sem a ordem automática, "Bônus" no lugar de "Buff" e o total da fileira que cresce quando sobe;
9. E2E, medição, fotos e documentação.

**Achados do código que o §8 não dizia** (detalhes no `diario.md` 2026-11-02 (7)): a carta que vai ao cemitério sem ser a de cima some na chegada do `state`, antes da batida; a carta do Bot aparece também antes da batida; as numéricas do Equipar nem esmaecem; o `transform` da carta é do Motion, e o recuo e o achatamento vão para as propriedades CSS `translate` e `scale`.

## A `main`

E1, E2, F1 (2026-10-30), o bloco E3 + F2 + F3 (2026-10-31), a marca "Cura passiva", as fatias 1, 2 e 3 do sub-projeto 6, os ajustes da fatia 1 (2026-11-01) e as fatias 4 e 4b (2026-11-02) mesclados. Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D
(`8d7f078`, `a5a76c5`, `bba8377`, `8cdf0a1`), a memória compartilhada, a E1, a E2, a F1 e o bloco E3 + F2 + F3 (o Reflect
reativo, a Devastação, o Roubo sem naipe, a cura pela Defesa, o limite de 4 especiais com a BURN e a iniciativa com o placar na
tela). Regras em vigor: spec 1 (`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes da
spec do sub-projeto 5 (`2026-10-27-ajustes-design.md`).

## Fila (sub-projeto 5)

Vazia: o bloco E3 + F2 + F3 era o último item.

## Esperando o autor

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
- **Branches que sobraram:** todas as locais já estão mescladas na `main` (conferido em 2026-11-01), inclusive
  `claude/inspiring-sammet-387417` e `feat/ajustes-fase-a`. Só o trabalho novo precisa de branch nova.
  O worktree `.claude/worktrees/dreamy-engelbart-4a4876` (a sessão do online) foi apagado com a sessão, em 2026-11-03, e a branch `sync/online-equipar-vazio` (mesclada) também. Sobrou a local `feat/online-equipar-vazio`, que ficou num rebase não publicado (o force-push foi barrado) e pode ser apagada pelo autor (`git branch -D`). A remota `feat/online-equipar-vazio` está mesclada.
- **Arquivo solto:** o `jogar-treino.bat` na raiz é o lançador do autor. Não mexer nem commitar.
