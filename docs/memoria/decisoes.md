# Decisões do autor

A mais nova em cima. Cada entrada traz a data, o texto do autor entre aspas (ou em bloco, quando é longo) e depois a leitura de
quem registrou: **[I]** marca interpretação que ele não disse com essas palavras. Só se acrescenta; uma decisão que substitui
outra diz qual. As specs (`docs/superpowers/specs/`) guardam a regra já escrita; aqui fica a origem dela.

---

## 2026-11-23 (2): o Cordel escuro é um deck novo; o bot veste o oposto

À pergunta sobre o que seria o "Cordel tema escuro", ele respondeu:

> cordel tema escuro me refiro ao deck de cartas no tema escuro. cartas de baralho fundo claro já existe, quero que exista também a do tema
> escuro e quando for jogar contra bot usar o oposto do usuário, como é feito com o deck celestial x bestiário.

Entre três caminhos (A: um deck novo na lista; B: um "tom" claro/escuro à parte do deck; C: arte pintada nova), ele escolheu:

> Deck novo (A)

**Leitura:**
- **Um quarto deck, o Cordel Escuro**, na lista do protocolo (`DECK_IDS`), preso ao Bufão como o Cordel. A carta é a de cordel de hoje com
  o papel e a tinta trocados só dentro dela; sem imagem nova, sem peso no pacote inicial.
- **O bot do treino veste o oposto** (substitui a G1 da fatia 2, "o treino padrão fica idêntico ao de hoje"): Cordel → Cordel Escuro,
  Cordel Escuro → Cordel, sempre com o Bufão; os decks de arte seguem como estão (Bestiário ↔ Celestial, com o Egípcio).
- **[I]** O Coringa Bufão (J, Q, K, A) também escurece no deck escuro; o Selvagem segue dourado; o tutorial fica no Cordel claro dos dois
  lados. No online, o deck escuro só aparece para o adversário depois do deploy (até lá o servidor o normaliza para o Cordel, sem erro).

---

## 2026-11-23 (1): cinco tarefas da produção

Ele escreveu:

> Tasks a implementar mantendo o altíssimo nível do projeto que está em produçao.
> [ ] Cordel tema escuro;
> [ ] [BUG] - as cartas especiais ficam escuras como se estivesse bloqueadas em momentos em que estão livres para serem usadas;
> [ ] Limpar memórias velhas. Otimizar contextos persistentes sem comprometer o story;
> [ ] Favicon do jogo;
> [ ] botões fileira de ataque e defesa estão quebrando quando há muitas cartas. ficaram da espessura de um palito quando estava jogando
> online com um amigo (produção); e esses botões vão ficando mais largos a medida que vão diminuindo a quantidade de cartas (aumentam e
> diminuem de tamanho). quero que esse botão seja mais discreto e intuitivo, com tamanho fixo, indicado por ícones (imagens) com menos
> texto. atente-se ao responsivo;

**Leitura:**
- **[I]** Os "botões fileira de ataque e defesa" são os destinos do painel do Equipar (`EquipPanel.tsx`): no PC a lista das cartas não
  encolhe e a coluna dos destinos fica com a sobra.
- **[I]** "Limpar memórias velhas" não apaga história: o `estado.md` fica só com o presente, e as entradas antigas vão para `arquivo/`.
  Mexer no `decisoes.md` (que só cresce) pede o "sim" dele à parte.

---

## 2026-11-19 (7): o merge da abertura sem a logo (PR #6)

Depois de ver a abertura no navegador, à pergunta "Faço o merge do PR #6 quando as duas CI ficarem verdes?", ele respondeu:

> Sim, merge

**Leitura:**
- O merge do PR #6 na `main` com o `check` e o `e2e` verdes. **[I]** Por fast-forward, como nos PRs #2 a #5; os commits depois do código
  (`7d32d37`) são só de memória.
- **[I]** O "sim" vale também como aceite das leituras [I] de 2026-11-19 (6): ~3,15 s de abertura, a versão curta com o Coringa e o título
  parados e muda, a marca LUSACAN mantida fora do jogo. O deploy segue dele. A `feat/intro-dragao-frente` e a pasta solta
  `2026-11-19-intro-lusacan/` seguem à espera da resposta dele.

---

## 2026-11-19 (6): a abertura sem a logo LUSACAN, só a parte do jogo

Ele escreveu:

> remova lusacan productions da intro, deixe apenas a parte do jogo do coringa

**Leitura:**
- **A logo "LUSACAN productions" sai da abertura** (substitui a logo na abertura de 2026-11-16 (5) e 2026-11-17 (3)): fica só a intro do
  jogo (as quatro cartas sobem, juntam-se, o maço vira no Coringa e o título é carimbado), até o menu. Onde ela toca, o pulo, a capa e o
  pedaço à parte seguem iguais.
- **[I]** O ritmo da parte do jogo não muda: ela só vem para o começo. A abertura passa de 5,35 s para ~3,1 s, abaixo da faixa de 4 a 6 s
  de 2026-11-16 (5), que cai junto com a logo (esticar a parte do jogo seria outra decisão, dele).
- **[I]** Com movimento reduzido, no lugar da logo parada, o Coringa e o título parados, com o esmaecer; o som dela, o baque das asas,
  sai (fica mudo).
- **[I]** Sai do jogo só o que era da abertura: o componente da logo, o voo do dragão e as pistas de som dele. A marca da produtora fica no
  repositório (`src/assets/lusacan/`, o `lusacan-shapes.ts` e o gerador `pnpm --filter @coringa/web logo`), para uso fora do jogo.
- **[I]** O vídeo do dragão para a logo (2026-11-19 (1) e (2), na branch parada `feat/intro-dragao-frente`) perde o objeto; a branch e a
  pasta solta `docs/superpowers/specs/2026-11-19-intro-lusacan/` ficam até ele dizer o que fazer com elas.

---

## 2026-11-19 (5): o merge da mesa no Feltro (PR #5)

À pergunta "Faço o merge do PR #5 quando as duas CI ficarem verdes?", ele respondeu:

> Sim, merge

**Leitura:**
- O merge do PR #5 na `main`, com o `check` e o `e2e` verdes. **[I]** Por fast-forward, como nos PRs #2 a #4 (o auto-merge do GitHub não está
  liberado no repositório: "Auto merge is not allowed for this repository").
- **[I]** O "sim" vale também como conferência das escolhas [C] da spec da mesa no Feltro e das `Ruling:` do diário 2026-11-19 (2), como
  em 2026-11-18 (7). O deploy segue dele.

---

## 2026-11-19 (4): a mesa no Feltro (B), com o rosa mais claro; seguir com a implementação

Depois de ver as três direções (A · Capa, B · Feltro, C · Tinta), ele escreveu:

> Seguir com B, pode deixar a cor rosa um pouco mais claro e prosseguir com a implementação

**Leitura:**
- **A B · Feltro está aprovada** como direção da mesa: os panos de feltro com o filete de ouro e a costura, o trilho de madeira no
  centro, a madeira escura no placar, no histórico e no fundo da mão, as barras de vida em trilho, os botões de contorno em carimbo.
  A A e a C saem (ficam no git, na pasta `2026-11-19-mesa-direcoes/`).
- **O rosa um pouco mais claro** que o rosa-vinho do rascunho. **[I]** O quanto: o mais claro que ainda deixa as marcas pequenas em papel
  legíveis (contraste de texto pequeno ≥ 4,5 : 1 onde elas ficam), para ele conferir nas fotos.
- **"Prosseguir com a implementação":** **[I]** como em 2026-11-18 (5), a spec e o plano saem curtos e o código segue sem parar para
  aprovação de cada um; as escolhas em aberto são do Claude por delegação, marcadas na spec, para ele conferir no merge. O merge e o
  deploy seguem dele.

---

## 2026-11-19 (3): a mesa com a identidade nova dos menus; três direções

(As entradas 2026-11-19 (1) e (2), da logo LUSACAN em vídeo, estão na branch `feat/intro-dragao-frente`.)

Ele escreveu, numa conversa nova:

> os menus do jogo e visual e interface foram redesenhados e está em produção. essa nova identidade refinada e melhorada deve refletir
> também in game, para coerência. menu do jogo está melhorado e quando entra para jogar está no visual antigo.
> Quero melhorar a mesa, deixar com textura sem exagero também. crie 3 direções. vamos deixar esse jogo ainda mais incrivel in game

**Leitura:**
- O pedido é de três direções para ele escolher; nada vira spec nem código antes da escolha (como em 2026-11-18 (1)).
- **[I]** É a continuação anunciada em 2026-11-18 (4) ("futuramente essa identidade será replicada para botões e tipografia in game"):
  a identidade do Folheto (o grão, a moldura dupla com os losangos, o filete de ouro com a costura, os carimbos, os títulos em tipo de
  madeira com a textura áspera) chega à mesa, ao placar, à faixa do centro, à barra de jogadas, à mão, ao histórico e aos controles do
  replay.
- **[I] "Textura sem exagero":** grão de papel ou de feltro parado, de baixo contraste, só no fundo dos campos e das faixas; nada que se
  mexa (como nos menus, "sem enjoo visual"), nada sobre as cartas, e os números de jogo seguem sem textura (spec da web §10.7).
- **[I] Só a camada visual,** como nos menus: o arranjo da mesa, as regras, o fluxo e os handlers ficam. Rosa é você, verde é o
  oponente. Uma direção que pedir mudança de arranjo vem marcada como "pede o OK dele".

---

## 2026-11-18 (11): o merge do Coringa menor no Início (PR #4)

Com o PR #4 aberto e a pergunta "Faço o merge do PR #4 quando a CI ficar verde?", ele respondeu:

> Sim, merge

**Leitura:** a `main` vai por fast-forward até o topo de `feat/inicio-emblema-altura` quando as duas CI estiverem verdes no último commit
de código (`e0878f6`); a branch sai depois do push da `main` (no mesmo push, o GitHub fecha o PR em vez de marcá-lo mesclado, como no
PR #3). O deploy é dele.

---

## 2026-11-18 (10): o Coringa do Início menor no notebook

Com uma foto do Início no notebook dele (o Coringa grande e a barra de rolagem; a foto tem 1917 × 865 px de tela, e com a escala de 125%
do Windows a página tem ~1534 × 692 px de CSS), ele pediu:

> diminua um pouco a arte do coringa porque está sendo exibida o scroll no meu notebook.

**Leitura:**
- O Início tem de caber na tela sem rolar; o emblema é o que encolhe (a lista fica como está).
- **[I]** "Um pouco" não basta nessa altura: para não rolar a 692 px, o emblema vai de 340 para ~253 px. Para ele encolher menos, as
  folgas e o vão do Início apertam antes, só em tela abaixo de 760 px de altura. Em tela alta (1440 × 900, 1918 × 866, os celulares de
  hoje), nada muda.

---

## 2026-11-18 (9): "Aprender jogando" sem a linha curta; o bloco dos menus encerrado

Depois do deploy, ele pediu:

> apague a branch feat/menus-visual. finalizado.

O push que apagava a branch remota foi barrado pelo pre-push: no meio dele, o `copy.ts` tinha a linha do `LEARN_LINE` comentada (o
typecheck quebrava). Perguntado de quem era a mudança, ele respondeu:

> eu que estou fazendo esse ajuste pontual, aceite essas alterações, suba e faz o merge.

e deixou a linha como `export const LEARN_LINE = '';`.

**Leitura:**
- Em Treinar, "Aprender jogando" fica sem a linha curta ("Uma partida com dicas, contra o Fácil" sai); "Jogar com o bot" mantém a dele.
- O ajuste entra como ele o deixou (o texto vazio, o `Practice.tsx` igual), numa branch com PR, e o merge segue com as duas CI verdes. O
  "suba e faz o merge" é o "sim" do merge deste ajuste.
- **[I]** Com o texto vazio, a linha continua no DOM, vazia (a margem de 4 px dela fica): não se vê; tirá-la de vez é outro ajuste, se ele
  quiser.
- "finalizado": o bloco dos menus está encerrado; a `feat/menus-visual` sai, local e remota.

---

## 2026-11-18 (8): o deploy dos menus, rodado pelo Claude a pedido

Com os menus na `main` (`9f10887`; o `check` do push da `main` verde, o `e2e` ainda rodando, verde no mesmo código em `ee77578`), ele
tentou rodar o deploy pela caixa da conversa (o `!` foi junto para o PowerShell e nada rodou) e depois escreveu:

> rode o deploy para mim

**Leitura:**
- O Claude roda o `pnpm deploy:server` desta vez, na `main`, com o `wrangler login` que já estava feito nesta máquina.
- **[I]** Vale só para este deploy: a regra de sempre segue ("o deploy é só dele", `decisoes.md` 2026-11-17 (2) e o `CLAUDE.md`); o
  Claude não publica sem um pedido assim, a cada vez.

---

## 2026-11-18 (7): o merge dos menus no Folheto

Com o PR #2 aberto (as duas CI verdes no último commit de código, `ee77578`; os seguintes só mexem em docs) e a pergunta "Posso fazer o
merge do PR #2 na main?", ele respondeu:

> Sim, merge

**Leitura:**
- A `main` vai por fast-forward até o topo de `feat/menus-visual` (o histórico limpo, como nos merges de antes), e o GitHub fecha o PR #2
  como mesclado.
- **[I]** O "sim" do merge vale também como conferência das escolhas [C] da spec dos menus e das `Ruling:` do diário 2026-11-18 (5) e (6),
  que estavam listadas no PR e na conversa; nenhuma vira [A] uma a uma, e mudam se ele pedir depois de usar.
- O deploy continua dele (`pnpm deploy:server`), quando pedir.

---

## 2026-11-18 (6): os links de criar sala levam a `/jogar`

No PR #2 (os menus no Folheto), a pergunta foi se os cinco links de criar sala ("Criar sala" da sala que não existe e da partida parada,
"Criar outra sala" da sala cheia, "Nova sala" no fim da partida online e "Jogar com um amigo" no fim do tutorial) podem levar direto ao
formulário (`/jogar`), e não ao Início, que virou menu. Ele respondeu:

> Concordo

**Leitura:**
- O [C] da spec dos menus (§2, o último item) passa a [A]: os cinco links levam a `/jogar`; "Voltar ao início" segue em `/`.
- **[I]** Vale só para esse item. As outras escolhas [C] da spec e as `Ruling:` do diário 2026-11-18 (5) e (6) seguem por conferir no
  merge, que espera o "sim" dele.

---

## 2026-11-18 (5): a A4 aprovada; o tema rosa (padrão) ou verde; seguir com spec, plano e código

Depois de ver a rodada 4 (A4), ele escreveu:

> gostei muito do rosa e gostei muito da arte fundo verde. as telas de menus adentrado ficaram muito boas, gostei também.
>
> Adicione uma espécie de toggle para o player alternar entre cor rosa e verde de forma discreta. A cor rosa deve ser o tema pré
> settado em produçao.
>
> Prossiga com o design, plano e implementaçao.

**Leitura:**
- **A A4 · Folheto está aprovada** como direção: o Início com o Coringa maior que o disco e o menu em lista de mini cartas (o hover da
  mão do jogo), as telas Jogar online, Treinar e Opções com os carimbos de madeira da mesa. O vinho sai.
- **Dois temas de fundo nos menus:** rosa (a moldura dupla da capa) e verde (o filete e a costura da mesa). **O rosa é o padrão**; um
  controle discreto deixa a pessoa trocar, e a escolha fica guardada. **[I]** O controle mora no canto do Início (uma bolinha com a
  outra cor) e vale para todas as telas fora da mesa; a mesa não muda.
- **"Prossiga com o design, plano e implementação":** a spec e o plano saem agora e o código segue sem parar para aprovação de cada um.
  **[I]** As escolhas em aberto (a navegação do menu, o lugar de "Partidas anteriores", as chaves novas nas Opções, o resto das telas
  fora da mesa) são do Claude por delegação, marcadas na spec, para ele conferir no merge, como no bloco D (`decisoes.md` 2026-11-14
  (1)). **[I]** Os botões e a tipografia **dentro da partida** ficam para depois ("futuramente", 2026-11-18 (4)): esta entrega não muda a
  mesa nem os diálogos da partida.

---

## 2026-11-18 (4): o menu em lista de mini cartas; o Coringa maior, saindo do círculo; três fundos novos; as telas com a identidade do jogo

Depois de ver a rodada 3 (A3), ele escreveu:

> Faça uma adaptação em A2 - Folheto com menu;
>
> modelo deve ser: imagem do coringa e menus abaixo dela, não ao lado.
>
> Gostei desse efeito de hover nos menus, mantenha. Mas o menu deve ser diferente:
> [mini carta de baralho com efeito hover atual com símbolo de globo de internet] Jogar online
> [... símbolo de duas espadas cruzadas] Treinar
> [... símbolo de ampulheta] Partidas anteriores
> [... símbolo de regulagem (mesmo que está)] Opções
>
> Background reprovado, crie mais 3 direções com cores  e arte (pode voltar com rosa numa das cores no lugar do papel e outro verde
> padrão mesa de poker /baralho). O background deve ser algo minimalista que não provoque enjoo visual mas que tenha identidade. crie 3
> direções seja criativo ou pegue referencias.
>
> Remova as quatro cartas de cima do coringa, ficou esquisito. aumente a imagem do coringa a ponto de sair do circulo, para
> preenchimento visual na tela adequada.
>
> Refinar os menus adentrados, deixar menos arredondados e com mais identidade real do jogo. Menos colorido. Futuramente essa
> identidade será replicada para botões e tipografia in game.

**Leitura:**
- **A base é o modelo da A2** (a imagem do Coringa em cima e o menu embaixo, também no PC: nada ao lado), **com o hover da A3**
  (a mini carta respira, inclina em 3D e sobe). **[I]** O "adaptação em A2" junta as duas: o leque, o círculo e o hover que ele cita são
  da A3.
- **O menu vira uma lista de quatro linhas**, cada uma com a mini carta e o símbolo, e o nome ao lado: Jogar online (globo), Treinar
  (espadas cruzadas), Partidas anteriores (ampulheta), Opções (a regulagem). "Partidas anteriores" deixa de ser o item menor.
- **O Coringa:** sem as quatro cartas de cima; maior, saindo do círculo (os guizos, o chapéu e a gola passam da borda).
- **Os fundos de tinta, anil e papel estão reprovados.** Três novos, minimalistas, parados e com identidade: **[I]** o rosa da capa (no
  lugar do papel), o verde de mesa de baralho e um terceiro à escolha do Claude. **[I]** "Não provoque enjoo visual": nada se mexe no
  fundo (sai o desenho de naipes que deslizava).
- **As telas de cada entrada:** menos arredondadas, menos coloridas e com a identidade real do jogo. **[I]** Os carimbos de madeira da
  mesa (`styles.css`, `.carimbo`: borda de tinta, cantos retos, sombra dura cor de madeira, face de papel ou ouro, o grão nos grandes,
  afundam no toque) e os títulos em tipo de madeira com a textura áspera (`#textura-aspera`). **Ele avisa que essa identidade vai depois
  para os botões e a tipografia dentro da partida.**

---

## 2026-11-18 (3): só o Folheto; o Coringa de antes com o leque; o menu em mini cartas; sem o rosa e sem o varal

Depois de ver a rodada 2 (A2 · Folheto com menu e D · Mesa), ele escreveu:

> Folheto segue como preferencia, descarte todos as outras direções.
>
> A Imagem nova do coringa está reprovada. O coringa anterior estava melhor. só que não gostei da arte de fundo (essas listras preto e
> branca.) Gostei dos baralhos acima da cabeça do coringa. Remover texto abaixo do coringa.
>
> Eu gostei do menu serem no formato de mini cartas de baralho com efeito do design Mesa, mas não copie igual, adapte a identidade do
> jogo. E quando o mouse tiver por cima deve ter o mesmo efeito do jogo (efeito semelhante ao 3D).
>
> Gostei dos menus coloridos (Mesa) ao entrar nos menus. não copie exatamente ou deixar igual mas se aproximar um pouco.
>
> Quero alterar esse background rosa de fundo, esses menus quadrado estão muito brutos. remova esse varal com pregadores.
>
> Tudo deve ser fluído e intuitivo proporcionando uma experiência agradável ao usuário.

**Leitura:**
- **Só o Folheto segue.** A B (Matriz), a C (Noite) e a D (Mesa) saem do canvas e da pasta (ficam no histórico do git).
- **O Coringa:** volta o desenho de antes (o do jogo, `Coringa.tsx`, o da capa da rodada 1), com o leque das quatro cartas acima da
  cabeça (da rodada 2). Saem os raios pretos e brancos do fundo e o texto embaixo do Coringa. O Coringa novo da rodada 2 está reprovado.
- **O menu do Início vira mini cartas de baralho**, no movimento da Mesa (o leque que respira) e na identidade do jogo (papel, tinta,
  carimbo, as cores da mesa), sem copiar a Mesa. **No mouse, o mesmo efeito da mão do jogo** (`Hand.tsx`): a carta inclina em 3D até
  13° seguindo o ponteiro, a sombra acompanha, e respira (3 px, 3,6 s); no toque, sobe 8 px.
- **As telas de cada entrada ficam coloridas**, perto da Mesa sem igualar: **[I]** cada entrada com uma cor da paleta do jogo
  (Jogar online no vermelho, Treinar no verde da cura, Opções no ouro), e os botões com a cor da ação.
- **Sai o fundo rosa**, saem os pregadores e o varal; os menus quadrados ficam mais suaves (**[I]** cantos arredondados, borda mais fina).
  **[I]** O fundo novo não foi dito: três opções lado a lado (tinta, anil, papel) para ele escolher.
- **"Fluído e intuitivo":** **[I]** as cartas entram dando-se na abertura da tela, as telas entram em sequência, tudo com movimento
  reduzido respeitado.

---

## 2026-11-18 (2): o Folheto fica; o Início vira um menu; uma direção nova com o Balatro de referência

Depois de ver as três direções no canvas (A · Folheto, B · Matriz, C · Noite), ele escreveu:

> Gostei do Folheto, os botões e artes estão legais - segue melhorias propostas por mim:
>
> 1. Quero uma página inicial com menu:
>
> Jogar online; (* criar sala; * entrar numa sala)
> Treinar (* Jogar com Bot; * aprender jogando)
> Opções (aparencia e preferencias de jogo)
>
> 2. Dê uma repaginada na imagem principal do coringa e remova esse texto grande.
>
> Além do folheto, gere mais uma direção seguindo minha proposta de menu. tema usando balatro como referencia

**Leitura:**
- A direção A (Folheto) segue, com os botões e a arte; a B e a C saem da mesa. Uma direção nova entra, com o mesmo menu.
- **O Início vira um menu de três entradas**, cada uma com a sua tela: Jogar online (criar sala, entrar numa sala), Treinar (jogar
  com o bot, aprender jogando) e Opções (aparência e preferências). **Isto muda a navegação**, que o pedido 2026-11-18 (1) deixava de
  fora: a proposta é dele, então vale; **[I]** o como (rotas próprias ou estado no Início, o botão Voltar, os E2E que clicam "Criar
  sala" no Início) fica para a spec, depois da escolha.
- **[I] "Esse texto grande"** é o título "JOGO DO CORINGA" na capa do folheto: sai, e a capa fica só com a imagem.
- **[I] O que a lista dele não cita:** "Partidas anteriores" (hoje só se abre pelo Início) entra como um item menor no menu, para
  ele confirmar; as Opções trazem as preferências que o jogo já guarda (Som, Reduzir animações, Passar sozinho), não só o Som.
- **[I] O Balatro entra pela estrutura e pelo acabamento** (cartas como protagonistas, botões grossos de cor que afundam, fundo vivo,
  movimento com peso), nunca pelo desenho: sem o redemoinho, a fonte de pixel, o CRT e a paleta dele (spec da web §10.6 e o
  anti-objetivo da direção visual: "Copiar o desenho de qualquer anime ou jogo").

---

## 2026-11-18 (1): o redesenho visual dos menus

Ele pediu, numa conversa nova:

> Tarefa: redesenhar toda a interface de menus do jogo — backgrounds, painéis, botões, tipografia, ícones, efeitos, artes..
>
> Escopo: SOMENTE camada visual. Não alterar regras do jogo, fluxos de navegação, estado, rede ou lógica de handlers. Se algo visual
> exigir mudança de lógica, pare e me pergunte.
>
> Me apresente 3 direções com design para que eu possa escolher.

**Leitura:**
- O pedido é de três direções para ele escolher; nada vira spec nem código antes da escolha.
- **"Só camada visual":** cores, fundos, painéis, botões, tipos, ícones, efeitos e arte (SVG e CSS originais). Ficam como estão os
  controles, a ordem deles, os destinos, o estado, a rede e os handlers. **[I]** Nada de aba, sanfona ou carrossel novos (todos pedem
  estado); um efeito que dependa de estado que já existe (por exemplo, o menu tingido pelo deck escolhido) vai marcado como "pede o OK
  dele" antes de entrar.
- **[I] O que é "menu":** as telas fora da mesa (Início, a escolha do nível do treino, a entrada pela sala, o lobby, as partidas
  anteriores, a partida parada, a página não achada) e os diálogos da partida (o menu da partida, a confirmação, o resumo das regras, o
  fim). A mesa, as cartas, o placar e as cenas ficam fora.
- **[I] Os tokens de hoje não mudam de valor** (a mesa usa todos): cada direção acrescenta os seus, só para os menus.

---

## 2026-11-17 (4): o merge da abertura

Depois do resumo da logo do dragão e da abertura (os quadros do voo mandados na conversa, a animação aberta no painel do navegador; os
tempos: a logo ~2,3 s, o desenho em 5,35 s, 5,6 a 5,8 s da capa ao menu; a abertura num pedaço à parte, com a capa escura; o teto do E2E
em 780 s; as duas CI verdes em `ee2ff6e`), perguntado "Depois de ver a animação, faço o merge da abertura na main?", ele respondeu:

> Sim, merge

**Leitura:** a `main` anda por fast-forward até o topo de `feat/abertura`. **[I]** O "sim" vale para o merge (e aceita o que o resumo
disse ter mudado além do pedido: os tempos, a capa, o teto do E2E, os títulos consertados); o deploy segue sendo dele
(`decisoes.md` 2026-11-17 (2): "só quando ele pedir").

---

## 2026-11-17 (3): a logo LUSACAN redesenhada: o dragão

Depois de ver os dois SVG da logo do olho (enviados na conversa), ele mandou uma imagem de referência (uma arte de fantasia escura, feita
fora do projeto: um dragão negro de asas abertas com veios violeta, à frente de uma lua cheia, sobre ruínas; "LUSACAN" em letras romanas
de metal e "PRODUCTION" embaixo) e escreveu:

> a logo deve ser redesenhada, irei enviar uma imagem para usar de inspiração e referencia. a animação da logo pode ser de um dragão
> voando, gira, volta, abre as asas e fica na mesma posição da imagem. o texto production deve estar no plural e o texto Lusacan menos
> extravagante. Te dou liberdade criativa.

**Leitura:**
- A logo do olho (2026-11-16 (5)) sai. A nova: um dragão de asas abertas diante de uma lua cheia, "LUSACAN" e, embaixo, "PRODUCTIONS"
  (no plural).
- **A referência é inspiração, não molde:** o dragão é desenho original do projeto (vetor feito à mão, por código), sem decalque nem
  traçado por cima da imagem, que tem autoria fora do projeto (a mesma regra da arte do jogo, spec §10.6).
- **"Menos extravagante":** **[I]** letras romanas com serifa (a Cinzel, já do projeto, SIL OFL), de peso médio, lisas e de uma cor só,
  sem o metal rachado, o brilho e a estrela da referência; elas viram traçado no SVG (não dependem da fonte instalada).
- **A animação:** o dragão entra voando, faz um giro, volta, abre as asas e para na pose da logo. **[I]** O resto é escolha do Claude,
  por "liberdade criativa": a paleta da noite da referência (preto azulado, violeta, a lua de prata), os veios violeta das asas que
  acendem quando elas abrem (um brilho local, sem piscar a tela: a regra de fotossensibilidade vale), o som do bater das asas.
- **[I] O tempo da logo cresce** de ~1,5 s para ~2,3 s, para o voo caber; a intro do jogo encurta, e a abertura inteira segue entre 4 e
  6 s (o critério de aceite do pedido de 2026-11-16 (5)).
- Ele ainda **não viu** o dragão; o desenho e o ritmo mudam se ele pedir.

---

## 2026-11-17 (2): o deploy sem a abertura

Dito que a abertura do jogo (`feat/abertura`, de outra sessão) estava parada pelo limite de uso, sem push, sem o `pnpm check` completo, com
a memória em conflito com a da `main` e sem ele ter visto a animação, e perguntado "Assumo a abertura do jogo para ela entrar no deploy?",
ele respondeu:

> Deploy sem ela

**Leitura:** o deploy sai com o que está na `main` (`9f01d3c` em diante). A abertura fica parada na `feat/abertura`, como está, até ele
pedir; nada nela é apagado. **[I]** Não é uma recusa da abertura, só a ordem: ela não entra neste deploy.

## 2026-11-17 (1): o merge do greedy que barra a Exódia

Depois do resumo do bot (o A num K a 2 K da Exódia; a Exódia de volta à meta: greedy × greedy 1,3%, turtle × greedy 6,3%; o portão do
Difícil aprovado; o `pnpm check` e as duas CI verdes em `2caeb5a`), perguntado "Faço o merge do bot que barra a Exódia na main?", ele
respondeu:

> Sim, merge

**Leitura:** a `main` anda por fast-forward até o topo de `feat/bot-exodia` (`2caeb5a`). **[I]** O "sim" vale para o merge; o deploy segue
sendo dele.

## 2026-11-16 (5): a abertura do jogo (a logo "LUSACAN productions" e a intro)

O pedido (resumido nas partes de regra; o texto dele):

> Tarefa: criar a sequência de abertura exibida ao iniciar o jogo.
> 1. Logo "LUSACAN productions" (você cria) — ~1.5s, fundo escuro, entrada elegante.
> 2. Intro temática do jogo — ~3–4s, com tom de empolgação crescente (ex.: naipes/cartas surgindo, brilho/aura, revelação do título),
> terminando na tela de menu. Duração total: 4–6s.
> Logo: entregar em SVG (versões clara e escura), salva em assets, reutilizável fora do jogo. […] legível em tamanho pequeno.
> Som: um "whoosh"/impacto na logo e um stinger curto na revelação do título. […] Tratar política de autoplay da plataforma; se o áudio
> estiver bloqueado, a intro roda muda sem erro. Respeitar volume/mute global do jogo, se existir.
> Pular: clique, toque, Enter, Espaço ou Esc pulam direto para o menu. Indicação discreta "Pressione qualquer tecla para pular" após
> ~0.5s. Intro completa em toda abertura.
> Acessibilidade/perf: com prefers-reduced-motion: versão estática curta (logo + fade). Sem travar o carregamento: carregar assets do
> menu em paralelo.
> Restrições: NÃO redesenhar os menus nesta tarefa (será outra). Sem novas dependências sem me consultar.

Ao plano (os arquivos, o storyboard de seis quadros em 5,2 s e três perguntas), ele respondeu:

> 1. ok.
> 2. ok.
> 3. ok, seja minimalista mas com impacto. lusacan é meu nick em jogos, eu tirei ele da histório do jogo dragon age inquisition, ele é
> um dragão antigo, guardião da noite

**Leitura:** (registrada na branch `feat/abertura` como 2026-11-16 (2), número que a `main` já usava; renumerada no rebase de
2026-11-17. A logo descrita aqui foi trocada pela do dragão, 2026-11-17 (3).)
- **(1) Onde toca:** só quando a página **abre** em `/` (o menu). Link de sala, reconexão, treino, tutorial e replay abrem direto; voltar
  ao menu por dentro do app não toca de novo; recarregar em `/` toca ("intro completa em toda abertura": sem lembrar que já foi vista).
- **(2) O som:** a abertura tenta tocar e, com o áudio bloqueado pelo navegador (o caso comum: o áudio só destrava com um gesto, e todo
  gesto pula), roda muda, sem erro. Sem tela de "toque para começar". Respeita a chave "Som" (não há volume no jogo).
- **(3) A direção:** a do projeto (cordel: tinta, papel, ouro), "minimalista mas com impacto". A logo sai do nome: um dragão antigo,
  guardião da noite. **[I]** Um olho de dragão (a pupila em fenda) com a lua como íris, sob uma sobrancelha em lâmina; desenho original,
  sem nada do jogo de onde o nome veio (nem o dragão dele, nem marca, nem arte). O "L" vazado num selo, do plano, sai.
- **[I]** "Qualquer tecla" pula, menos as de modificador e os atalhos (Ctrl+R, F5…); no celular o aviso diz "Toque para pular".
- **[I]** Os tempos, o storyboard e os dois sons são os do plano mostrado a ele (5,2 s; com movimento reduzido, a logo com fade, ~1,8 s).
  O desenho da logo e a animação ele ainda **não viu**: mudam se ele pedir.

---

## 2026-11-16 (4): o Roubo fica; o bot barra a Exódia; o merge do domínio e do Roubo

Depois do resumo do domínio e do Roubo novo (as duas CI verdes em cada branch; a medição: o Roubo 3,5 vezes maior, o greedy que rouba ainda
em 39,5%, a Exódia quase dobrando nos bots), com as três opções (1: manter; 2: ensinar o bot a preferir a Armadilha nos K; 3: mexer na
regra) e a pergunta "Faço o merge do domínio e do Roubo na main?", ele respondeu:

> 1. manter como está mas ensina o bot pois deveria usar o A pra remover o K quando tiver perto de formar o exódia (4k)
>
> Sim, faça o merge dos dois

**Leitura:**
- A regra do Roubo fica como está (`RULES_VERSION` 6).
- **O bot:** quando o oponente estiver perto da Exódia, o A vai para a Armadilha num K da Guarda dele, em vez do Roubo. **[I]** "Perto" é
  ter 3 K na Guarda (um a menos que a Exódia, `exodiaGuard` − 1); a mudança é do greedy (o Fácil e o Médio usam o greedy, e o Difícil o
  usa nas simulações). É um bloco à parte, com a calibração e o portão do Difícil de novo, e o merge pede o "sim".
- **O merge:** a `main` anda por fast-forward até o topo de `feat/roubo-buff` (`426de18`), que contém a `feat/dominio`. O deploy é dele.

## 2026-11-16 (3): o cemitério fora; o domínio; as três [I] do Roubo; o www

Depois do esboço das três direções do cemitério (A: campo-santo de cordel; B: pedra antiga; C: cova aberta), ele respondeu:

> Todas as direções reprovadas. ignore esta demanda e prossiga com as pendências para o deploy e finalização. já comprei o domínio
> jogodocoringa.com.br e está criado na cloudflare

Perguntado em seguida se podia seguir com as três leituras do Roubo ((1) o K não quebra no Roubo, a Guarda fica de fora; (2) a Defesa
Absoluta continua bloqueando o Roubo inteiro; (3) o buff conta antes de a carta sair), ele escolheu **"Ok nas três"**; sobre o
`www.jogodocoringa.com.br`, **"www redireciona"** (o `www` manda para o endereço sem `www`).

**Leitura:**
- **O cemitério sai da fila:** a lápide e o diálogo ficam como estão (o bloco D). Substitui o item 10 de 2026-11-16 (1) na parte do
  cemitério; as outras escolhas do bloco D seguem aprovadas.
- **O domínio:** o jogo passa a morar em `https://jogodocoringa.com.br`, servido pelo mesmo Worker (`custom_domain` no `wrangler.jsonc`). A
  zona está na conta Cloudflare dele. **[I]** O `workers.dev` segue ligado (não atrapalha e serve de reserva).
- **O `www`:** redireciona para o endereço sem `www`, com uma origem só (o histórico de partidas fica no `localStorage` de uma origem).
  **[I]** O redirecionamento é uma regra da zona no painel da Cloudflare (o Worker não vê os pedidos dos assets), e é ele quem a cria.
- **O Roubo:** as três [I] de 2026-11-16 (1), item 8, viram regra. O bloco segue com `RULES_VERSION` 6, a calibração e o portão do Difícil.
- **"prossiga com as pendências para o deploy e finalização":** **[I]** o domínio primeiro (é o que o deploy precisa), depois o Roubo. Os
  merges seguem pedindo o "sim" dele; o deploy é dele.

---

## 2026-11-16 (2): o merge do conserto das cenas que repetiam

Depois do resumo do conserto (a cortina do momento trazia de volta a última cena; uma condição no `Stage.tsx`; o teste novo; a A/B no replay
da Devastação; o `pnpm check` e as duas CI verdes em `1d92cd7`), perguntado "Faço o merge do conserto das cenas na main?", ele respondeu:

> Sim, merge

**Leitura:** a `main` anda por fast-forward até o topo de `feat/cenas-repetidas` (`1d92cd7`). **[I]** O "sim" vale para o merge; o deploy
segue sendo dele. As três [I] do Roubo e a direção do cemitério seguem esperando a resposta dele.

---

## 2026-11-16 (1): o lote de 2026-11-15 respondido; o Roubo mais forte; o cemitério; o bug das cenas

Depois da lista de doze perguntas (A: cinco regras que o motor decidiu sozinho; B: o Equipar sem escolha e o apagar do histórico; C: o
Roubo fraco, os naipes, as onze escolhas do bloco D; D: as branches velhas e a config do pnpm), ele respondeu:

> 1. ok
> 2. ok
> 3. ok
> 4. ok
> 5. ok
> 6. ok
> 7. ok
> 8. como forma de deixar o roubo menos fraco, o roubo então passa a curar o valor da carta no seu estado de buff atual (exemplo: roubar
> um 10 de uma fileira com 3 J cura = 30 e tira 30 de dano) e o K passa a não anular o dano do roubo. O dano do roubo ainda NÃO conta para
> a iniciativa. O dano do roubo continua não sendo letal.
> 9. ok, mantenha os naipes.
> 10. ok, alterar apenas a arte do cemitério, deixar mais caracterizado com cemitério, ao abrir uma carta para reviver o deve estar com
> visual com identidade de cemitério também.
> 11. não precisa, ignore-as.
> 12. sim, mas .pnpm-store em D: é o que eu uso nos meus projetos de trabalho. corrija sem compromete-los.
>
> * Identifiquei um bug durantes os treinos.
>
> A cinematic exibida em jogo (ressureição, ataque absoluto, devastação, etc...) fica sempre repetindo em todas as rodadas seguintes.
> exemplo: usei devastação e na rodada do oponente, quando é dado ênfase na jogada (a carta aproxima da tela antes de ir pra mesa), é
> repetida a ultima cinametic exibida . Isso acontece até quando um jogo acaba e eu inicio outro novo. exemplo: terminei o jogo com um
> ataque absoluto, no novo jogo a animação do ataque absoluto é exibida novamente na jogada do oponente, mas sem efeito de ataque
> absoluto, apenas a animação.

Perguntado depois que o exemplo (10 com 3 J = 30) não batia com a conta do jogo (× (1 + J) daria 40), ele escolheu **"× (1 + buffs)"**
(igual ao resto do jogo: 10 com 3 J = 40; da Defesa, com os Q) e, sobre a quadra, **"Não entra"** (só os J ou os Q multiplicam a carta
roubada; o bônus de quadra é da fileira).

**Leitura:**
- **(1 a 5)** Confirmadas como regra: o Roubo pega qualquer numérica em qualquer posição (8.5); a cura passiva conta os K que sobram
  (11.3); o Reflect contra atacante sob Defesa Absoluta só segura (10.1.5); Reflect contra Reflect num ataque (10.1.2); o fim da Defesa
  Absoluta (11.1). Fecham também as leituras [I] 2, 3 e 8 do plano 1 (`notas/medicao-e3.md` §4) e as [I] da E1 e do Reflect
  (`notas/playtest.md`). As 9 e 10 do plano 1 são dos modos CHOOSE e FEWER, fora do padrão (BURN), e não foram perguntadas.
- **(6 e 7)** Confirmadas as [I] da E2 (o Equipar sem escolha, na ordem de compra) e da F1 (o apagar do histórico).
- **(8) Regra nova do Roubo** (muda o resultado de partidas: `RULES_VERSION` novo, os replays de referência regravados, a calibração e o
  portão do Difícil medidos de novo):
  - o valor do Roubo é o da carta **com o buff da fileira de onde sai**: valor × (1 + número de J), se sai do Ataque; valor × (1 + número
    de Q), se sai da Defesa; **sem** o bônus de quadra. Conta a mesa do oponente **no instante do Roubo**, antes de a carta sair. **[I]**
  - o oponente perde esse valor e quem rouba cura o mesmo valor, cheio, até a vida inicial (a 14.1 segue: cura cheia mesmo quando o "nunca
    mata" corta o dano);
  - **o K não anula mais** o dano do Roubo. **[I]** O K também não quebra: a Guarda fica fora do Roubo;
  - segue igual: o dano do Roubo não conta para a iniciativa, nunca mata (a vida fica em no mínimo 1), não abre janela de reação, e a
    Defesa Absoluta do oponente bloqueia o Roubo inteiro (8.8). **[I]** (ele não falou da Defesa Absoluta; fica como está).
  - Exemplo: o oponente tem 10, 4 no Ataque e 3 J; você rouba o 10: ele perde 40 e você cura 40. Do mesmo 10 na Defesa com 2 Q: 30.
- **(9)** Os naipes ficam desenhados nas cartas. Sai da lista o "desenho do naipe" ([I] de 2026-10-31 (8)).
- **(10)** As onze escolhas do bloco D (a §6.3 da spec do playtest) ficam aprovadas, **menos a arte do cemitério**: a lápide e a área do
  cemitério ficam mais caracterizadas como cemitério, e o painel que se abre para reviver uma carta (a Ressurreição) ganha a mesma
  identidade. **[I]** É trabalho de desenho: a direção (o que muda e como) vai a ele antes do código, como nos outros blocos visuais.
- **(11)** As branches remotas velhas ficam como estão: sai da lista de espera.
- **(12)** Corrigir o `storeDir` da config do pnpm desta máquina **sem mudar onde ficam os pacotes dos projetos de trabalho dele**.
- **O bug das cenas:** depois de uma cena rara (a Ressurreição, o Ataque Absoluto, a Devastação…), a mesma animação volta no momento de
  ênfase das jogadas seguintes do oponente, até numa partida nova, sem o efeito de jogo. Vem antes do deploy. **[I]** Visto no treino; o
  online pode ter o mesmo.

---

## 2026-11-15 (1): as seis leituras da §14 das regras 4.0 confirmadas; o fim da branch

Perguntado como enviar a branch das regras 4.0 (o force-push tinha sido barrado), e com as seis leituras da §14 listadas (1: o Roubo cura o
valor cheio, mesmo com o dano anulado; 2: o Roubo não abre janela; 3: a Devastação não vale contra fileira vazia nem contra Defesa
Absoluta; 4: Reflect contra Reflect na Devastação, ela não acontece e quem a lançou segue no turno; 5: a Devastação refletida contra a
Defesa Absoluta, ninguém perde nada; 6: a carta trocada no Equipar cura depois que as novas entram), ele respondeu:

> 1. ok.
> 2. ok.
> 3. ok.
> 4. ok.
> 5. ok.
> 6. ok.
>
> use uma branch nova e finalize

**Leitura:**
- As seis leituras da §14 passam a ser regra confirmada. Nada muda no motor (`RULES_VERSION` segue 5); os comentários `[I]` delas no
  código viram "confirmado pelo autor, 2026-11-15", e a §14 vira "Leituras confirmadas".
- **[I]** O "ok" vale para as seis da §14, não para o documento inteiro, regra a regra: o resto do texto descreve o motor e ele pode
  responder em lote quando quiser.
- A branch vai ao GitHub com nome novo (`feat/regras-4-0b`), sem reescrever a `feat/regras-4-0` remota, que fica velha (apagá-la é dele).
- **[I]** "finalize" é o "sim" do merge: a `main` anda por fast-forward até o topo da branch nova, com o `pnpm check` e as duas CI verdes.

---

## 2026-11-14 (4): as regras 4.0 em `docs/`, no lugar dos textos antigos

*(Registrada às 15h51 do dia 14, na branch `feat/regras-4-0`, como (3), antes do merge do bloco D; renumerada (4) ao
entrar sobre a `main`, que já tinha a (3).)*

Dito que as regras originais estavam em `JOGO DO CORINGA.txt` e `JOGO DO CORINGA 3.0.txt` (o `2.0`, citado na spec do motor, não existe
mais), ele respondeu:

> esses arquivos estão desatualizados. algumas regras foram alteradas ao longo do tempo. pode ignora los e criar um novo
> JOGO-DO-CORINGA-4.0.md em docs

**Leitura:**
- Os `.txt` deixam de ser referência. O texto das regras passa a ser `docs/JOGO-DO-CORINGA-4.0.md`, escrito a partir do motor
  (`RULES_VERSION` 5) e do resumo da mesa (`RULES_SECTIONS`).
- **[I]** O documento é um rascunho até ele revisar: as regras são numeradas para a resposta em lote, e a seção 14 lista as leituras
  **[I]** do motor que ele ainda não confirmou. Nada nele muda regra; se o texto e o motor discordarem, vale o motor.

---

## 2026-11-14 (3): o merge do bloco D

Depois do resumo do bloco D (os botões de carimbo e a lápide no centro; `pnpm check`, `pnpm e2e` e as duas CI verdes em `08f728f`; as doze
escolhas da §6.3 da spec ditas como "minhas, por delegação, e você não as viu", com as quatro que mais fogem do protótipo; a faixa que não
engordou; o custo de ~2 quadros/s na troca de mão; o Ataque Absoluto armado não visto no navegador), perguntado "Faço o merge do bloco D na
main?", ele respondeu:

> Sim, merge

**Leitura:** a `main` anda por fast-forward até o topo de `feat/playtest-bloco-d`. **[I]** O "sim" vale para o merge; **não** é a aprovação,
uma a uma, das doze escolhas da §6.3, que ele só viu resumidas: seguem como escolhas do Claude por delegação, e mudam se ele pedir depois de
jogar. O deploy segue sendo dele.

---

## 2026-11-14 (2): o merge do conserto da Devastação

Depois do resumo do conserto (o `layoutScroll` no `[data-campos]`, a A/B de 53 para 56 quadros/s na Devastação com arte a 360, as duas CI
verdes em `0402869`), perguntado "Faço o merge do conserto da Devastação na main?", ele respondeu:

> Sim, merge

**Leitura:** a `main` andou por fast-forward de `5f1c1fb` até `0402869` (o topo de `feat/devastacao-estilo`). **[I]** O "sim" vale para o merge;
o deploy segue sendo dele.

---

## 2026-11-14 (1): o deploy feito; a Devastação aprovada; o bloco D delegado

Perguntado "há alguma pendência a ser feita?", recebeu a lista numerada do que esperava por ele: (1) o deploy; (2) jogar a fatia 3 online e
o resto no treino; (3) a Devastação com arte no celular (a recomendação: um bloco curto para cortar o recálculo de estilo da mesa inteira);
(4) a virada de rodada lenta do bloco C (medir de novo na tomada antes de atacar); (5) o bloco D, com plano aprovado antes; (6) a arte pintada
dos decks. Ele respondeu:

> 1. feito
> 2. feito
> 3. aprovado.
> 4. ignore.
> 5. decida por mim
> 6. quando o jogo estiver pronto e online irei solicitar para fazer isso.

**Leitura:**
- **(1)** O deploy (`pnpm deploy:server`) foi feito por ele, com o bloco C e as fatias 1 a 3 dos decks: as aparências estão no online, as
  salas abertas antes fecharam (`STATE_SCHEMA` 6).
- **(2)** Ele jogou. **Não trouxe achados**: as leituras **[I]** em aberto do `notas/playtest.md` e as frases novas das placas **não**
  ficam confirmadas por isso; só saem da lista de espera os itens "Jogar …".
- **(3)** Aprovada a recomendação: um bloco curto que estanque a invalidação de estilo das cartas da mesa inteira (a Devastação com arte a
  360 px chegar a ≥ 50 quadros/s, sem piorar o Cordel). **[I]** As escolhas técnicas do bloco são de quem executa, registradas como
  `Ruling:`; o merge segue pedindo o "sim" dele.
- **(4)** A virada de rodada lenta do bloco C (42 e 48 quadros/s, talvez medida na bateria) **não** será atacada. Sai da lista sem ser dada
  por consertada.
- **(5)** **[I] Delegação:** as variantes do bloco D já eram dele (a A nos pontos 5 e 14, `decisoes.md` 2026-11-03 (4)); as escolhas do plano
  do bloco D passam a ser decididas pelo Claude **por delegação**, registradas como tal, nunca como "aprovadas pelo autor". Não cobre o
  merge nem o deploy. Ordem: o bloco D começa depois do merge da Devastação (os dois mexem na mesa, no `styles.css` e no portão de
  ≥ 50 quadros/s da §8 da spec do playtest, que a Devastação muda).
- **(6)** A arte pintada dos decks fica para quando o jogo estiver pronto e online, **a pedido dele**: não entra na fila de trabalho.

---

## 2026-11-13 (1): o merge da fatia 3 dos decks

Depois do resumo da execução da fatia 3 (o online; as `Ruling:`, a revisão sem Critical nem Important, as duas CI verdes em `d885c84`),
perguntado "Faço o merge da fatia 3 na main (fast-forward)?", ele respondeu:

> Sim, merge

**Leitura:**
- A `main` andou por fast-forward de `b6c2caf` até `d885c84` (o topo de `feat/decks-fatia-3`), como nas fatias 1 e 2.
- **[I]** O "sim" vale para o merge, não para o deploy, que segue sendo dele (`pnpm deploy:server`).

---

## 2026-11-12 (2): o plano da fatia 3 aprovado; a execução em outra sessão

Depois do resumo do plano da fatia 3 (o online), perguntado "Aprova o plano da fatia 3 com as H1 a H7 como recomendadas?", ele respondeu:

> Aprovo como está

**Leitura:**
- O plano `docs/superpowers/plans/2026-11-12-decks-fatia-3.md` está aprovado com as H1 a H7 como recomendadas:
  - **H1:** quem está no padrão (o Cordel) não manda a aparência; o servidor só grava a que o corpo trouxe (normalizada), e a mensagem `room`
    só a devolve para o assento que a tem. Afina a §8.2 da spec ("grava quando o corpo trouxe").
  - **H2:** a sua aparência na sala vem do assento; a preferência mudada depois não vale para a sala aberta (a §8.3, confirmada).
  - **H3:** no menu da partida online, sem o seletor, a linha "A aparência desta sala é a que você tinha ao entrar." (no lugar do painel
    apagado da §6).
  - **H4:** a nota do painel "Aparência" do Início passa a ser "Na sala online, vale a que você tinha ao entrar."
  - **H5:** a partida online guardada leva `looks` dos assentos do fim, só quando algum dos dois não é o padrão (tira a G4 da fatia 2 para o
    online, como a §7.3 manda).
  - **H6:** sem medição nova.
  - **H7:** a execução no Claude Code local, tarefa por tarefa, teste primeiro, na branch `feat/decks-fatia-3`, com um revisor novo no fim.
- **[I]** As duas frases (H3 e H4) foram aprovadas com o plano, palavra por palavra.
- **A execução:** perguntado em seguida "Começo a execução da fatia 3 nesta sessão?", ele respondeu "Em outra sessão". A execução é numa
  sessão nova do Claude Code, a partir da Task 0, como a da fatia 2. Nada de código nesta.

---

## 2026-11-12 (1): o plano da fatia 2 aprovado; a execução em outra sessão

Depois de ler o achado da Devastação no celular (46 e 47 quadros/s com arte, contra 55 do Cordel; a minha posição: um bloco curto para
cortar o recálculo de estilo da mesa inteira antes da fatia 2, sem segurar o deploy) e o resumo do plano, perguntado "Aprova o plano da
fatia 2 com as G1 a G8 como recomendadas?", ele respondeu:

> Aprovo como está mas irei implementar em outra sessão pois esta está muito cheia. Deixe tudo preparado para que não haja regressão e a
> outra sessão consiga continuar

**Leitura:**
- O plano `docs/superpowers/plans/2026-11-12-decks-fatia-2.md` está aprovado com as G1 a G8 como recomendadas: o bot em Cordel quando você
  está em Cordel, e no outro deck de arte (com a raça Egípcia) quando você está num (G1); o bot acompanha a sua troca no meio da partida
  (G2); o replay com as aparências gravadas, e a partida sem `looks` em Cordel (G3, que tira a F4 da fatia 1); o tutorial e o online em
  Cordel até a fatia 3 (G4); os 8 Minor da fatia 1 nesta fatia (G5, que muda a `Ruling:` do pacote que falha: uma nova montagem tenta de
  novo); o verso do momento pelo deck de quem jogou (G6); o portão relativo da medição (G7); a execução tarefa por tarefa, com um revisor no
  fim (G8).
- **A execução é em outra sessão do Claude Code**, a partir da Task 0, na branch `feat/decks-fatia-2`. Nada de código nesta.
- **[I] A Devastação no celular:** ele não respondeu à recomendação do bloco curto. "Como está" vale para o plano, cuja G7 cobre o caso: sem
  a ordem de consertar antes, a fatia 2 segue com o portão relativo (a arte não perde para o Cordel mais do que já perde na `main`). O
  conserto continua esperando a decisão dele, no `estado.md`; não foi rotulado como aprovado nem como recusado.

---

## 2026-11-11 (3): o plano da fatia 1 aprovado; a execução é no Claude Code; a arte não pode amarrar

Perguntado "aprova o plano com as escolhas F1 a F7 como recomendadas?", ele respondeu:

> aprovado. não implemente nada ainda. apenas gere planos, specs e atualize a memória e arquivos persistentes se tiver finalizado a
> solicitação desta sessão. a implementação será feita no claude code, não aqui no chat. um dúvida sincera minha: Estes esboços de desenho
> que vc está fazendo serão melhorados por você? esses assets (decks com imagens) ficarão salvos localmente e poderão ser enviadas
> futuramente pra ferramentas de IA exclusiva de desenho e arte para melhoria visual? isso seria importante porque não ficaria amarrado a você

**Leitura:**
- O plano `docs/superpowers/plans/2026-11-11-decks-fatia-1.md` está aprovado com as F1 a F7 como recomendadas. **Ninguém implementa pela
  conversa do app:** a execução é no Claude Code local (com o Opus 5.5, como ele pediu no começo), a partir da Task 0.
- **Requisito novo, dele:** a arte tem de poder sair daqui para uma ferramenta de IA de desenho (ou um ilustrador) sem depender de quem a
  fez. Resposta dada: os SVG e os WebP já são arquivos comuns no repositório; o que faltava era o que acompanha a arte, e virou
  `docs/superpowers/specs/2026-11-11-biblia-de-arte.md` (o contrato de cada arquivo, a descrição de cada carta, os pedidos prontos) e a
  seção nova do `packages/web/art/LEIAME.md`.
- Dito a ele, sem enfeite: o Claude pode seguir retocando o vetor (as mais fracas: Urso, Cervo Branco, Beija-flor), mas não chega ao
  realismo pintado que ele pediu; esse salto é da ferramenta de desenho ou do ilustrador, como combinado em 2026-11-10 (2), resposta 4.
- Achado ao conferir os arquivos: os gravados pela conversa do app levam uma credencial de conteúdo (C2PA) embutida, que diz que o Claude
  forneceu o arquivo. É metadado, sem dado pessoal, e pesa cerca de 6 KB por WebP; os pesos da §5 da spec foram corrigidos para os do
  disco (182, 234 e 108 KB).
- **[I]** Os planos das fatias 2 (o dono por lado) e 3 (o online) **não** foram escritos: dependem do código que a fatia 1 deixar, e o
  costume do projeto é um plano por fatia, aprovado antes da execução. Ficam para depois da fatia 1.

---

## 2026-11-11 (2): a spec dos decks e raças aceita, e o plano da fatia 1

Perguntado "a spec está aprovada como está, ou há algo a mudar antes de eu escrever o plano da fatia 1 para o Opus?", com o aviso de que
as oito escolhas de quem escreveu estão na §13 da spec, ele respondeu:

> ok, pode escrever o plano

**Leitura:**
- A spec `docs/superpowers/specs/2026-11-10-decks-e-racas-design.md` vale como está, com as oito escolhas da §13.
- **[I]** Ele não disse com essas palavras que leu o arquivo: respondeu à pergunta sem pedir mudança. As escolhas da §13 continuam
  marcadas **[I]** na spec, para conferir no playtest.
- O plano da fatia 1 (a carta com arte e o seletor, no treino) é `docs/superpowers/plans/2026-11-11-decks-fatia-1.md`, com sete escolhas
  (F1 a F7) para ele aprovar antes da execução. Nada de código antes. A execução é pelo Opus 5.5, no Claude Code local (o pedido original
  dele: "implementação com modelos mais baratos [opus 5.5]").

---

## 2026-11-11 (1): o deck Celestial aprovado como arte provisória

Depois da entrega da spec dos decks e raças (2026-11-10 (2)), avisado de que o passo seguinte era ele ler o arquivo enquanto o deck
Celestial era desenhado, ele respondeu "ok". Mostradas as nove cartas (Borboleta, Beija-flor, Cervo Branco, Unicórnio, Pégaso, Leão
Alado, Águia Gigante, Baleia Celeste e Arcanjo) e perguntado "o Celestial serve como arte provisória?", ele respondeu:

> sim, aprovado. prossiga

**Leitura:**
- Os três decks (Cordel, Bestiário, Celestial) e a raça Egípcia têm a arte provisória aprovada. Ele foi avisado de que o Pégaso e o
  Arcanjo têm o fundo claro (o número depende mais da sombra) e de que o Beija-flor e o Cervo Branco são as mais fracas, e aprovou assim.
- **[I]** "prossiga" vale para pôr a arte no repositório (as origens em `packages/web/art/`, os WebP em `packages/web/src/looks/`, spec
  §5), o que foi feito, sem commit. **Não vale** como leitura da spec: ele ainda não disse que leu o arquivo, e o plano da fatia 1 espera
  por isso.

---

## 2026-11-10 (2): decks e raças do Coringa (o brainstorming inteiro)

Pedido do autor, numa conversa do app (outra conta; a pasta do repositório estava ligada, sem shell: nada foi commitado por lá):

> As cartas numéricas passarão a ser representadas por ilustrações de monstros ou seres fantásticos, seguindo uma progressão de raridade
> visual, sem qualquer indicação textual de raridade na própria carta. […] Manter característica /identidade de carta de baralho com
> naipe a amostra, pois futuramente este jogo será publicado no Steam e esse será um dos diferenciais. […] A referência que tenho como
> preferencia das artes é Dark Fantasy, Celestial Fantasy, Mythic Fantasy; […] Como possibilidade futura de monetização, pretendo
> disponibilizar decks temáticos para venda na loja do jogo (Store). […] Uma possibilidade seria vincular a aparência das cartas
> especiais à raça do Coringa. […] Caso seja necessário utilizar alguma biblioteca, ferramenta ou serviço externo […] solicite minha
> autorização para realizar a configuração e a instalação.

As respostas dele, na ordem (a pergunta resumida, depois o texto dele):

1. Como a fantasia convive com o cordel: escolheu **"Decks são skins"** (o baralho atual vira o deck Cordel; mesa, placar e cenas ficam).
2. Sobre o rascunho 1 (três cartas em SVG, com uma plaquinha de papel para o valor e o naipe):
   > Quero outras sugestões de artes com mais detalhes e realismo. O número e naipes deve ser incorporados ao background da carta mas se
   > prejudicar a leitura. exemplo o fundo é azul escuro e o número é dourado. o exemplo que dei da vespa e dragão são meramente
   > ilustrativa. fica livre a sua criatividade.

   E a tabela das faixas: 2–3 "Criaturas menores, anatomia simples"; 4–5 "Criaturas maiores, formas mais elaboradas"; 6–7 "Seres
   ancestrais, poderes sobrenaturais"; 8–9 "Criaturas colossais e extraordinárias"; 10 "Entidade única, visual quase divino".
3. Sobre o rascunho 2 (cinco cartas, o número e o naipe sobre a arte):
   > Arte não aprovada. Ficou ok: Número e naipe: direto sobre a arte, no metal de cada carta com visual perceptível de progressão de
   > raridade ficou boa. a aura em volta da carta de acordo com a raridade também ficou boa. a cor do naipe deve ser a mesma do número. em
   > jogo o número pode ser 10% menor; Vc criou um ser na carta 10 muito fantasioso e esquisito até de imaginar. seja mais intuitivo na arte.
4. Como seguir com a arte, já que o vetor não chega ao realismo pedido: escolheu **"SVG provisório, pintura depois"**.
5. "Este nível serve como arte provisória?" (rascunho 3: Morcego, Fênix, Dragão Ancestral): > sim
6. Quantos decks no menu de testes: > pode fazer mais 1 apenas. não precisa ser 3 decks. E depois, corrigindo:
   > talvez me expressei errado, peço desculpas. quero 2 decks customizados + 1 padrão que é o atual.

   O tema do segundo customizado: escolheu **"Celestial"** (Borboleta, Beija-flor, Cervo Branco, Unicórnio, Pégaso, Leão Alado, Águia
   Gigante, Baleia Celeste e Arcanjo).
7. As especiais pertencem à raça ou ao deck: escolheu **"Raça separada do deck"** (nos testes: Bufão de cordel e mais uma, com o Cordel
   travado no Bufão).
8. Sobre as especiais desenhadas como personagens (raça Morto-vivo):
   > cartas especiais poderiam ser representadas por artefatos lendários de acordo com a raça do coringa. se o coringa for um anubis os
   > artefatos serão da raça egípcia e assim por diante.

   E sobre os artefatos egípcios, com a regra "J é a arma, Q é a proteção, K é a insígnia de realeza, A é o objeto da trapaça, e o
   Selvagem é o Coringa": > sim, aprovado. prossiga
9. O que o oponente vê no online:
   > deve ser possível o oponente ver as minhas cartas do meu lado da mesa e eu posso ver o deck dele equipados no lado da mesa dele. o
   > mesmo para raça do coringa. no cemitério eu vejo meu deck e ele ver o deck dele. se não for assim a monetização e venda de deck e
   > raças não farão sentido no futuro quando eu publicar no steam.
10. "Aprova o design e a Cinzel?" (o desenho em seis partes e a dependência `@fontsource/cinzel`): > Sim ok. prossiga

**Leitura:**
- Três decks no menu: **Cordel** (o padrão, como está), **Bestiário** (2 Morcego, 3 Aranha, 4 Lobo, 5 Urso, 6 Grifo, 7 Fênix, 8 Hidra,
  9 Kraken, 10 Dragão Ancestral) e **Celestial** (a lista da resposta 6). Duas raças: **Bufão** (as especiais de cordel de hoje) e
  **Egípcia** (K Máscara do Faraó, J Khopesh de Rá, Q Escudo de Hórus, A Adaga de Set, Selvagem Coringa Anúbis).
- A arte em SVG é **provisória**, para os testes; a final, pintada (modelo de imagem ou ilustrador), entra depois no mesmo formato.
  Aprovados por ele como provisórios: as três cartas do rascunho 3 e os cinco artefatos egípcios. **Ele não viu** as outras seis do
  Bestiário uma a uma (foram mostradas juntas, sem resposta sobre elas), nem o verso, nem o retrato do Anúbis; o deck Celestial tem a
  lista aprovada e a arte por desenhar.
- O número e o naipe ficam sobre a arte, **os dois na mesma cor de metal** da carta, o número 10% menor em jogo que no rascunho 2; a
  moldura e a aura crescem com a faixa (2–3, 4–5, 6–7, 8–9, 10), sem texto de raridade.
- Cada lado da mesa mostra o deck e a raça do **dono daquele lado**; o cemitério (e o monte) mostra os de **quem olha**. Isso pede a
  aparência no protocolo e no servidor.
- Autorizada a dependência `@fontsource/cinzel` (SIL OFL).
- **[I]** As seis cenas especiais seguem em cordel nesta fase (ele leu isso duas vezes e não objetou); a loja, a conferência de posse e a
  carta ampliada ficam fora.
- **[I]** As raças continuam duas: a correção da resposta 6 falou de decks.
- A spec: `docs/superpowers/specs/2026-11-10-decks-e-racas-design.md`. Ele aprovou o desenho pela conversa e **ainda não leu o arquivo**.

---

## 2026-11-10 (1): a mesa com as duas auras grandes fica sem medir

Perguntado "A mesa com as duas auras grandes fervendo juntas (a do retrato e a dos 4 J) nunca foi medida, e a mesa mais cheia que medi
ficou em 50 quadros/s cravado no PC. Você aceita assim, ou quer que eu grave uma partida com essa mesa para medir?", ele respondeu:

> Aceito.

**Leitura:** o bloco C segue para o merge com a medição como está (`notas/medicao-bloco-c.md`): a mesa mais cheia do plano a 50 e 55
quadros/s, os 4 J sozinhos a 53 e 55, sem gravar uma partida nova com os 4 J armados e a sequência ≥ 5 juntos.

---

## 2026-11-08 (2): o plano do bloco C aprovado

Perguntado "Aprova o plano do bloco C com as escolhas C1 a C9?", sobre `docs/superpowers/plans/2026-11-08-playtest-bloco-c.md`, ele escolheu:

> Aprovo como está

**Leitura:**
- As nove escolhas valem como recomendadas:
  - C1: a sequência no `InitiativeDecision` (`streak`), `STATE_SCHEMA` 6, o `PROTOCOL_VERSION` igual, e a frase da spec §5.2 corrigida;
  - C2: o selo a partir de 2, a aura a partir de 3;
  - C3: a aura muda na batida da decisão, com o sopro na troca de mão, dos dois lados;
  - C4: um relógio e um agendador de raios só, com a saída das formas paradas se a medição não passar;
  - C5: os brilhos desenhados, só com opacidade;
  - C6: os níveis pela config do motor;
  - C7: a liderança pelos totais mostrados, ninguém no empate, a troca no pouso;
  - C8: o histórico igual e a sequência para o leitor de tela;
  - C9: a execução aqui, tarefa por tarefa, na branch `feat/playtest-bloco-c`, teste primeiro, com um revisor novo num subagente no fim.

---

## 2026-11-08 (1): o plano do bloco C

Perguntado "Escrevo o plano do bloco C agora?", depois da entrega do bloco B (o golpe final na `main`, `792bd62`), ele escolheu:

> Sim, escreva

**Leitura:**
- O plano do **bloco C** (pontos 10, 11 e 13 da spec do playtest, §5: os bônus em escala, a aura da iniciativa, a espada e o escudo de quem
  lidera) é escrito para ele aprovar antes da execução, como nos blocos A, B e E. Nada de código antes.
- **[I]** Ele não jogou o bloco B antes de pedir o plano: a conferência do golpe final continua na lista dele.

---

## 2026-11-07 (3): o plano do bloco B aprovado

Perguntado "Aprova o plano do bloco B com as escolhas B1 a B6?", sobre `docs/superpowers/plans/2026-11-07-playtest-bloco-b.md`, ele escolheu:

> Aprovo como está

**Leitura:**
- As seis escolhas valem como recomendadas: B1 (sem folga no relógio: o `SCENE_MS` e o servidor não mudam, e a frase da spec §4 é
  corrigida), B2 (o retrato racha em toda derrota pela vida; a W.O. e o abandono não), B3 (a cena de 2,4 s, com o carimbo comum de 1,5 s),
  B4 (a inversão de 600 ms, a regra comum), B5 (a faixa e o som do fim depois da cena, como na Exódia) e B6 (a execução aqui, tarefa por
  tarefa, na branch `feat/playtest-bloco-b`, teste primeiro, com um revisor novo num subagente lendo a branch inteira no fim).

---

## 2026-11-07 (2): as placas aprovadas, e o plano do bloco B

Depois da entrega da placa do momento da Guarda (2026-11-07 (1)), sem pergunta pendente, ele escreveu:

> aprovado, prossiga.

**Leitura:**
- **[I]** "aprovado" vale para o que foi entregue nas placas em 2026-11-06 e 07, como a mensagem descreveu (as frases e os casos em que
  elas aparecem). Ele não as viu jogando: a conferência no playtest continua na lista dele.
- **[I]** "prossiga" é o próximo da fila (`decisoes.md` 2026-11-03 (4)): o plano do **bloco B** (ponto 15, o golpe final, spec do playtest
  §4), escrito para ele aprovar antes da execução, como nos blocos A e E. O deploy e o playtest continuam com ele.

---

## 2026-11-07 (1): a placa do momento da Guarda com a linha do quinto caso

Perguntado "Aplico a mesma linha na placa do momento da Guarda?", depois de saber que a placa do momento em que o oponente põe K na Guarda
("com 2 K, a Defesa dele que cai o cura") tem a mesma imprecisão do quinto caso (no golpe comum seguinte, um K absorve, sobra 1 e aquele
golpe não cura; `diario.md` 2026-11-06 (1)), ele escolheu:

> Sim, aplique

**Leitura:**
- Com exatamente 2 K (o mínimo da cura, `config.defenseHealGuard`), a consequência da placa do momento passa a ser a mesma linha da placa
  de estado: "com 2 K depois do golpe, a Defesa dele que cai vira vida".
- **[I]** Com 3 K fica "com 3 K, a Defesa dele que cai o cura": o golpe que um K absorve deixa 2 e cura, a frase é verdadeira, e ele
  aprovou corrigir a imprecisão, não reescrever o caso que funciona.
- **[I]** O caso do seu Ataque Absoluto armado ("o seu Ataque Absoluto quebra todos os K") já estava certo e não muda.

---

## 2026-11-06 (1): o quinto caso de placa, as duas propostas aplicadas

Perguntado "Aplico as duas propostas do quinto caso de placa antes do deploy?", depois de ver na lista do que falta para a produção que
a placa "Cura passiva" ("a Defesa dele que cai vira vida") é o único texto que o motor contradiz (`estado.md` 2026-11-04, "Esperando o
autor"; `diario.md` 2026-11-04 (1)), ele escolheu:

> Sim, aplique

**Leitura:**
- **Contra o Ataque Absoluto armado do outro** (e sem o Reflect de quem tem a Guarda, que seguraria o golpe com os K inteiros), a placa
  troca de linha como nas outras quatro: "o Ataque Absoluto dele quebra os K antes da cura" (no seu campo) / "o seu Ataque Absoluto
  quebra os K antes da cura" (no dele). São as frases que ele viu.
- **Com 2 K na Guarda,** a linha de sempre fica mais clara: "com 2 K depois do golpe, a sua Defesa que cai vira vida" / "com 2 K depois
  do golpe, a Defesa dele que cai vira vida". **[I]** Ele viu "com 2 K depois do golpe, a Defesa que cai vira vida"; o "sua" e o "dele"
  seguem o lado de quem vê, como na linha de sempre. **[I]** Só com exatamente 2 K (o mínimo da cura, `config.defenseHealGuard`): com 3 K,
  o golpe que um K absorve deixa 2 e cura, e a linha de sempre é verdadeira; "com 2 K" ali confundiria quem tem 3.
- **[I]** O Absoluto vem antes do caso de 2 K: ele quebra a Guarda inteira, tenha ela 2 ou 3 K.

---

## 2026-11-04 (1): os quatro textos de placa que o motor contradiz

Perguntado "Corrijo os quatro textos de placa que o motor contradiz em casos de borda?", depois de ver a lista na mensagem de entrega do
bloco A ("imune até o golpe dele", "quebra todos os K", "o K absorve o próximo golpe inteiro" e "o próximo golpe volta para ele", cada um
com o caso em que o motor faz outra coisa; `diario.md` 2026-11-03 (6)), ele escolheu:

> Corrija os quatro

**Leitura:**
- **[I]** O texto de sempre fica como ele aprovou na spec §3; só no caso de borda a placa troca de linha, lida da mesa como o motor
  decide o golpe (`previewBetween`: o Reflect antes de tudo, depois a Defesa Absoluta, que só o Ataque Absoluto fura):
  - Defesa Absoluta, com o Ataque Absoluto do outro armado (e sem o seu Reflect): "o Ataque Absoluto dele fura a imunidade" / "o seu
    Ataque Absoluto fura a imunidade";
  - Ataque Absoluto armado, com o Reflect do alvo ativo: "o Reflect dele segura o seu golpe" / "o seu Reflect segura o golpe dele";
  - Reflect, com quem ataca sob Defesa Absoluta: "segura o próximo golpe dele, sem devolver" / "segura o seu próximo golpe, sem
    devolver";
  - a placa do momento do K, com o seu Ataque Absoluto armado (e sem o Reflect dele): "o seu Ataque Absoluto quebra todos os K"; fora
    disso, "o K absorve um golpe inteiro" (sem o "próximo", que também falhava com a Defesa Absoluta dele no caminho).
- **[I]** As frases novas são de quem escreveu, e ele ainda não as viu: conferir no playtest.

---

## 2026-11-03 (6): o plano do bloco E aprovado, com 15 s na janela

Ao plano `docs/superpowers/plans/2026-11-03-ressurreicao-quadra.md` (as escolhas da seção "Escolhas minhas" e a pergunta do prazo
online da janela, 15 s recomendado ou 10 s):

> Aprovo, 15 s

**Leitura:**
- O plano vale como está, com as 9 escolhas à vista dele: a chave `resurrectOnQuad` na config, a janela só com jogada, o jogador na
  janela até passar ou não ter mais jogada, o tempo esgotado que guarda (sem estouro), a janela também depois do 1º Equipar, a troca
  saindo como no Roubo, a troca sob Defesa Absoluta, as especiais paradas na janela e os bots que só ressuscitam sem piorar a mesa.
- **O prazo online da janela é de 15 s por jogador** (`TIMERS.resurrectionMs`), e a spec das regras §1.12 passa a dizer isso.
- **[I]** "Aprovo" responde também à forma de execução, que a mensagem não perguntou: a execução é desta sessão, tarefa por tarefa, com
  teste primeiro, como nas fatias.

---

## 2026-11-03 (5): o plano do bloco A aprovado

Perguntado "Aprova o plano do bloco A, com as escolhas A1 a A9?", sobre `docs/superpowers/plans/2026-11-03-playtest-bloco-a.md`, ele
escolheu:

> Aprovo como está

**Leitura:**
- As nove escolhas valem como recomendadas: A1 (a folga do servidor sempre cheia), A2 e A9 (a) (online, quem joga também espera o
  momento do outro, e a folga vale para os dois), A3 (o véu pela trava de flash), A4 (a placa fora do leitor de tela, como as faixas), A5
  (o total do motor na consequência), A6 (o Reflect fica na zona dele), A7 (a primeira cura da partida, de qualquer lado) e A8 (a
  execução aqui, tarefa por tarefa, na branch `feat/playtest-bloco-a`, com um revisor novo no fim).
- **[I]** Ele não respondeu à leitura de apagar sessões terminadas sem perguntar (2026-11-03 (4), "Sessões"): ela segue como está,
  e a próxima exclusão é anunciada a ele antes.

---

## 2026-11-03 (4): as respostas às 8 perguntas do desenho; a regra do 16

Às 8 perguntas da §9 do rascunho (`docs/superpowers/specs/2026-11-03-playtest-design.md`), com as recomendações que ele viu na
mensagem de entrega:

> 1. não aprovado. ao fazer a quadra o usuário deve ter opção de usar ressurreição antes do ataque, se as fileiras estiverem cheias, a última carta vai para o cemitério, desde que a última carta não seja uma carta da quadra formada, daí não é possível descarta-la.
> 2. ok.
> 3. ok.
> 4. não aprovado. não exibir texto, apenas uma aura nas cartas já é o suficiente.
> 5. ok.
> 6. ok.
> 7. ok.
> 8. ok aprovada. prossiga.
>
> Não deve ficar sub sessões pendentes, se a sessão do "Online: Equipar vazio não pode coretar o golpe final" estiver finalizada, apague a sessão.

Perguntado em seguida se, com as duas fileiras cheias, a troca da última carta vale só no instante da quadra ou também na Ressurreição
usada depois, na fase principal, ele escolheu a opção **"Também depois"**, cujo texto dizia: "Com as duas fileiras cheias, a Ressurreição
usada mais tarde também manda a última carta ao cemitério, com a mesma proteção: carta da quadra não sai."

**Leitura:**
- **Fatia 5 aprovada:** o sub-projeto 6 fecha.
- **Aprovados como recomendados:** a ordem dos blocos (A: 1, 2, 6 e 9; B: 15; C: 10, 11 e 13; D: 5 e 14; o E, o 16, em paralelo numa
  sessão própria); a variante A nos pontos 1, 2, 5, 14 e 15; a espada e o escudo comparando Ataque com Ataque e Defesa com Defesa; a aura
  da iniciativa contada pelo motor (as rodadas de Ataque seguidas, apagando quando a iniciativa troca; as salas online abertas fecham no
  deploy); o momento da especial do oponente estendendo o prazo online da decisão.
- **"prossiga":** o rascunho vira spec com as respostas, e o plano do bloco A é escrito para ele aprovar antes da execução, como nas
  fatias. **[I]** As escolhas da §10 do rascunho que ele não comentou ficam na spec como escolhas minhas, à vista dele; nenhuma foi
  recusada.
- **Ponto 4 (os 3 K):** nenhum texto. **[I]** Os 3 K na Guarda ganham só a aura (a brasa vermelha), nos dois campos (a Guarda é
  pública); a coroa tracejada do protótipo também sai, porque ele disse "apenas uma aura nas cartas". O resto da escada do ponto 10 fica.
- **A regra do 16** (substitui a §7.2 do rascunho):
  - **Quando:** ao formar a quadra, o dono pode usar a Ressurreição dela antes do ataque. **[I]** Para a quadra da revelação do Equipar,
    é uma janela logo depois da revelação, antes da escolha da ordem do Ataque. A quadra que nasce na fase principal (pelo Roubo ou pela
    própria Ressurreição) já está no turno do dono, antes do ataque dele: ali a Ressurreição já vale, como hoje.
  - **Opcional** ("deve ter opção"): **[I]** quem não usa guarda a Ressurreição, que segue valendo como hoje (na fase principal, enquanto
    a quadra existir, com a garantia de 3 rodadas).
  - **Iniciativa:** com os dois formando quadra na mesma revelação, quem tem a iniciativa decide primeiro (o "respeitando obviamente a
    iniciativa" do ponto 16 original); **[I]** o outro decide vendo a jogada dele.
  - **Fileiras cheias:** a última carta vai ao cemitério e a ressuscitada entra no lugar dela. **[I]** "As fileiras cheias" são as duas,
    como na troca do Equipar (spec das regras §1.4): com vaga numa delas, a carta entra no fim da que tem vaga, como hoje.
  - **A proteção da quadra:** a última carta que é da quadra não sai. **[I]** "A última" é a do fim da fileira escolhida: se a de uma
    fileira é da quadra, a ressuscitada só pode ir para a outra; se as duas são, a Ressurreição não pode ser usada naquele instante e
    fica guardada. **[I]** "Da quadra" é toda numérica da fileira com o valor de uma quadra que está nela (com 5 iguais, as 5 são a
    quadra, como na regra das 8 iguais), não só a quadra que acabou de se formar: a troca nunca desfaz uma quadra.
  - **Também depois:** a troca, com a mesma proteção, vale em toda Ressurreição com as duas fileiras cheias, também na fase principal.
  - **[I] A carta que sai cura** se era da Defesa com 2 K na Guarda: é a regra geral da cura passiva (toda numérica da própria Defesa que
    vai ao cemitério cura; a troca do Equipar e o Roubo já curam assim), não uma regra nova.
  - **[I] Em cadeia:** a ressuscitada que forma outra quadra dá outra Ressurreição, que pode ser usada no mesmo instante (na fase
    principal já é assim). **[I]** A carta que sai não pode ser a ressuscitada na mesma jogada: escolhe-se do cemitério de antes da troca.
- **Sessões:** a do online terminou com o trabalho na `main` (`4f7621e`) e o worktree limpo, e foi apagada. **[I]** Vale daqui em diante:
  sessão que terminou o trabalho dela e teve o resultado conferido sai, sem esperar ele pedir (a do bloco E também).

---

## 2026-11-03 (3): seguir no desenho sozinho por algumas horas

Perguntado se o bloco de desenho podia começar, combinando a ordem dos pontos com ele:

> sim, vamos. Irei me abster por algumas horas portanto peço-lhe que faça e adiante o máximo que puder tudo que não necessita de minha aprovação. reserve para o final as questões que dependem de mim para que assim que eu retornar, responda e dê prosseguimento. autorizo a você prosseguir mantendo o altíssimo nível para este jogo que será vencedor de jogo indie haha.

**Leitura:**
- **[I]** O que não precisa dele: levantar o código de cada ponto, medir no simulador o que a regra nova (ponto 16) mudaria, montar o
  protótipo clicável dos pontos visuais e escrever um **rascunho** do desenho com as recomendações. Tudo marcado como rascunho: nada
  disso está aprovado, e nenhum código do jogo (`packages/*/src`) muda antes da aprovação dele (regra 3 da memória; o portão do
  brainstorming).
- **[I]** A ordem dos pontos, as escolhas de regra do 16 e as escolhas de gosto entre as variantes do protótipo são dele: ficam numa
  lista única no fim, a mais importante em cima.

---

## 2026-11-03 (2): o ponto 17 era a Armadilha; o 18 sem o vermelho

Perguntado se uma Armadilha do Bot tinha quebrado um J dele antes do golpe sem cena:

> sim, houve armadilha, foi um engano meu. está ok. ignore o ponto 17. em relação ao ponto 18 a cor vermelha com bordas ficou estranha. no lugar da cor vermelha deixa a cor padrão mesmo, mantendo as animações. a cor dourada mantém para subida mas reduza um pouco a espessura da borda pois está muito grossa.

**Leitura:**
- **Ponto 17 fechado:** a regra fica como está (a Armadilha na janela de reação desarma o Ataque Absoluto, e não há cena). **[I]** O
  aviso de que o Ataque Absoluto desarmou não foi pedido; se vier, é parte do ponto 1 (a jogada especial do Bot legível).
- **[I]** O conserto do Equipar vazio colado ao golpe (`09fc360`) fica: é um defeito de verdade, achado no caminho, e ele mesmo abriu
  a sessão do conserto online.
- **Ponto 18:** o total que desce fica na cor padrão (tinta), sem contorno, e mantém a animação (encolhe uma vez). O que sobe segue em
  ouro, com o contorno escuro mais fino. **[I]** A sombra de carimbo embaixo também afina, porque soma com o contorno na espessura que
  ele viu.

---

## 2026-11-03 (1): os pontos 16, 17 e 18 do playtest

Depois da entrega da fatia 5 na `main` (`6759914`), que pedia que ele jogasse:

> ok, prossiga.
>
> pontos novos para registrar:
>
> 16. no instante em que forma a quadra deve ser possível usar ressurreição, respeitando obviamente a iniciativa. se as fileiras estiverem cheias, a carta ressuscitada substitui a última da fileira (de ataque ou defesa).
> 17. ataque absoluto não está exibindo a cinemática. revisar, corrigir e conferir.
>
> 18. melhoria: a cor do valor de ataque e defesa quando aumentados estão muito simples e devem ser visualmente melhor trabalhados, a cor quando sobe pode continuar sendo dourada com bordas escuras e quando desce deve ser vermelhas com bordas escuras.

**Leitura:**
- **[I]** "prossiga" é o próximo passo do `estado.md`: o desenho dos pontos que ficaram para depois da fatia 5, com protótipo. Ele não
  disse que a fatia 5 está aprovada; ele jogou e mandou os pontos novos.
- **Ponto 17** é defeito: entra direto, com teste e foto, antes do desenho.
- **[I] Ponto 18** é direto, como o 12 de que ele nasce: o total que sobe fica dourado com contorno escuro, e o que desce fica vermelho
  com contorno escuro. Ele só falou da cor; o tamanho que cresce na subida (ponto 12) fica.
- **[I] Ponto 16 muda regra do motor** (hoje a Ressurreição só vale na fase principal de um turno seu, e só numa fileira com espaço:
  spec das regras §1.8). Vai para o desenho, com perguntas antes da spec: em que momento do Equipar ela vale, o que "respeitando a
  iniciativa" decide quando os dois formam quadra, o que acontece com a carta substituída, e se ela continua valendo depois, na fase
  principal. Mudar a regra muda partidas de referência: sobe `RULES_VERSION` e remede o portão do Difícil.

---

## 2026-11-02 (10): o ponto 15 do playtest

Depois do corte pelo limite de uso, no meio da Task 9 da fatia 5:

> ok, prossiga.
>
> Ponto para incluir na lista de 14 itens que eu enviei.
>
> 15. se o ataque comum for o ataque final, deve haver uma animação cinematic curta do último ataque da partida para dar mais empolgação ao player vitorioso.

**Leitura:**
- "prossiga" é terminar a fatia 5 (a Task 9: a medição de depois, o portão, a CI, a revisão e o fast-forward).
- **[I]** O ponto 15 é de desenho, como os nove de 2026-11-02 (9) que ficaram para depois da fatia 5: entra no mesmo brainstorming, com protótipo, e não nesta fatia. Ele não disse onde encaixar.
- **[I]** "Ataque comum final" é o golpe que derruba a vida a zero (`GameOver` por vida), sem cena especial no mesmo passo. A Exódia e o Ataque Absoluto que encerram já têm cena.

---

## 2026-11-02 (9): o plano da fatia 5 aprovado, e 14 pontos do playtest

À entrega do plano (`docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`), com as escolhas E1 a E9 listadas para ele:

> Aprovado, execute.
>
> Pontos que observei ao testar o jogo jogando:
>
> 1. Fico perdido quando o oponente usa armadilhas, K, J, Q (cartas especiais no geral). Sou limitado apenas ao som "genérico" e ao log de histórico para entender o que aconteceu. Seria interessante enriquecer a experiências de jogar cartas especiais, afinal são especiais, dando assim mais profundidade e alma pro jogo. Deixar tão bom ao ponto do player não precisar ficar olhando o histórico de jogadas para saber o que aconteceu. Isso serve para os dois lados.
> 2. Cartas especiais em mãos que estão bloqueadas no momento da jogada devem ser exibidas de forma em que o usuário entenda que no momento não podem ser usadas, pois as vezes confunde se pode usar ou não. As vezes nem é o momento de usar certas cartas especiais mas fico clicando porque a carta está sendo exibida normal. deve enriquecer este detalhe.
> 3. as vezes arrasto o mouse e seleciono textos. isso deve ser bloqueado no jogo.
> 4. evite exibir o texto "Ameaça de bot" acima do botão atacar, pois é o player quem deve observar esses detalhes do jogo e pensar na melhor estratégia.
> 5. botão de atacar deve ter identidade e personalidade. o botão é simples. Isso serve para todos os botões clicáveis no fluxo de jogadas (até os botões desfazer e recomeçar).
> 6. avisos na mesa de cura passiva, reflect, ressurreição devem ser enriquecidos visualmente. está muito simples.
> 7. remova o contador com barra de regresso que é exibido abaixo do botão "Atacar primeiro" e "Atacar segundo".
> 8. substitua a palavra Buff por outra mais apropriada para jogadores leigos.
> 9. cura passiva ocorre e eu não sei o por que fui curado. talvez um efeito de cartas que vão para o cemitério virando hp e indo pro coringa quando duplo K está ativado. Pense na melhor animação se houver.
> 10. enriquecer o detalhe deixando mais empolgante a medida que o player adicionar cartas de buffs na mesa. (1 J equipado = nenhum efeito, 2 J equipados, as cartas tem um efeito indicando mais poder, 3 J equipados, cartas com efeitos mais poderosos, tipo faícas de raios). isso serve para todas as cartas de buffs equipados. manter a coerência.
> 11. O Player que estiver com Iniciativa 3 rodadas seguidas, o avatar do coringa deve ter uma aura minima de poder, quando tiver 5 rodadas uma aura mais forte, e quando bater 10 rodadas seguidas, deve ter uma super aura de poder - referência de dragon ball.
> 12. quando cartas numéricas forem inseridas nas fileiras, valores de ataque e defesa devem exibir uma micro animação e aumento de tamanho indicando que o ataque ou a defesa aumentaram de valor.
> 13. O Player que tiver o ataque maior, o ícone de espada deve ter uma áura dourada, quase como as são exibidas nas cartas quando completam quadra. O mesmo para a defesa e o ícone de escudo.
> 14. deixar o monte e o cemitério mais centralizado. deixar cemitério com visual mais rico e com mais identidade.

Perguntado como encaixar os pontos, que palavra entra no lugar de "Buff" e o que acontece com a ordem automática sem a barra, ele escolheu:
- "Fatia 5 + diretos": a fatia 5 como aprovada, com uma tarefa a mais para os pontos diretos (3, 4, 7, 8 e 12); os outros nove (1, 2, 5, 6, 9, 10, 11, 13 e 14) num desenho novo, com protótipo, logo depois;
- "Bônus": "Bônus de ataque" (J) e "Bônus de defesa" (Q);
- "Tirar o automático": sai a barra e sai a escolha automática da ordem; online vale o prazo do servidor.

**Leitura:**
- O plano está aprovado como foi entregue, com as recomendações de E1 a E9. **[I]** Vale até o fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.
- A tarefa dos pontos diretos entra no plano como Task 9, antes da Task 8 (o E2E e a medição a cobrem).
- **[I] Ponto 3:** sem seleção de texto na mesa (o palco e a mão). Os campos de texto, os diálogos de regras e o histórico seguem selecionáveis.
- **[I] Ponto 4:** sai a "Ameaça de X" acima do Atacar e também a "ameaça de X cai de A para B" da prévia do alvo, pelo mesmo motivo. A prévia do seu próprio ataque fica.
- **[I] Ponto 8:** só o texto muda. Os identificadores (`BuffPlayed`, `attackBuffs`...) ficam, como manda a regra de idioma do repositório. O plural é "Bônus de ataque".
- **[I] Ponto 12:** o total da fileira cresce e assenta quando sobe, no pouso da carta que o fez subir. Pela coerência que ele pediu no ponto 10, vale também quando um J ou um Q sobe o total, não só uma numérica.
- **[I] Ponto 1 e a E3:** a queda simples da carta do Bot (E3) segue nesta fatia como base. O desenho novo deve deixar a jogada especial do Bot legível sem o histórico, e pode trocar essa queda.
- **[I]** Os nove pontos de desenho não foram desenhados nem aprovados: viram brainstorming e protótipo depois da fatia 5.

---

## 2026-11-02 (8): a outra conta assume a fatia 5

Na outra conta, com a passagem pronta na `main`:

> Siga a regra 1 do CLAUDE.md: ache o estado.md mais novo e continue do próximo passo (o plano da fatia 5). [...] a passagem está pronta na main, você consegue continuar só com o repositório. Não há trabalho pela metade nem branch sem mesclar da outra conta. Vamos prosseguir

**Leitura:**
- O próximo passo do `estado.md`: escrever o plano da fatia 5, entregar com as escolhas listadas e só escrever código depois do ok dele.
- **[I]** O plano é entregue em `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`, com as escolhas E1 a E9. Nenhuma delas foi aprovada ainda.

---

## 2026-11-02 (7): guardar o script de medição

Perguntado se o script de medição das cenas, que era temporário, deveria ficar no repositório:

> Sim, guarde

**Leitura:** ele fica em `packages/web/e2e/medir-cena.ts`, fora do `pnpm e2e` e da CI. **[I]** Os rascunhos 1 a 4 do protótipo seguem fora do git (`.superpowers/brainstorm/`), como recomendado: ele não pediu para guardá-los, e o aprovado, o 5, já está no repositório.

---

## 2026-11-02 (6): a quadra sem o losango

Com uma foto das cartas da quadra na fileira:

> faça um ajuste pontual: remova apenas esses losangos amarelos de cartas que formam a quadra e ativam a ressurreição.

**Leitura:** sai só o losango do canto de cima. O fundo dourado claro, a moldura de ouro, o brilho e o selo "QUADRA +N" ficam. Muda a spec 6 §6, que ele tinha aprovado com o losango.

---

## 2026-11-02 (5): a Ressurreição aprovada, e a outra conta assume

Depois de jogar a fatia 4b:

> Joguei, aprovado. vou continuar da outra conta. faça o que é necessário para que seja dado continuidade

**Leitura:**
- A fatia 4b está aprovada como foi entregue, sem ajustes: as seis cenas especiais do §7 estão entregues e aprovadas.
- **[I]** "faça o que é necessário" é registrar e subir a memória. O plano da fatia 5 fica para a próxima conta, com o `estado.md` dizendo o passo exato.
- **[I]** Ele jogou, mas não disse quais caminhos viu. O que a execução não conferiu (o som de ouvido, o movimento reduzido, duas quadras na mesa) segue marcado como não conferido por nós.

---

## 2026-11-02 (4): o plano da Ressurreição aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4b.md`), com as escolhas listadas para ele:
- qual quadra acende sai da mesa, sem mudar o motor: com duas quadras, pode acender a outra; sem quadra, os fios saem da fileira de destino. A alternativa, exata, subiria o
  `RULES_VERSION` de 4 para 5, com aviso em todo replay guardado;
- 4,6 s, e não ~4,9 s; a cena inteira a cada vez, como ele decidiu, e o toque pula;
- sem tarjas de cinema; a carta de verdade escondida até a cópia pousar; no celular, o céu preso à área visível;
- o total da fileira já conta a carta no começo da cena;
- a execução aqui mesmo, tarefa por tarefa, com a revisão final de quem escreveu o código.

> Aprovado, execute

**Leitura:** o plano está aprovado como foi entregue, com as escolhas listadas. **[I]** Vale até o fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.

---

## 2026-11-02 (3): o Reflect aprovado; agora a Ressurreição

Depois de jogar a fatia 4:

> aprovado, prossiga para ressureição. lembre que a memória e os arquivos de contexto persistente devem ser devidamente atualizados e consolidados

**Leitura:**
- A fatia 4 está aprovada como foi entregue, sem ajustes.
- **[I]** "prossiga" é o próximo passo do `estado.md`: escrever o plano da fatia 4b, entregar e só escrever código depois do ok dele.
- **[I]** Ele não disse quais caminhos viu. O que a execução não conferiu (o som de ouvido; Reflect contra Reflect, o dano 0, o próprio Reflect, o Ataque Absoluto contra
  Reflect e o movimento reduzido no navegador) segue marcado como não conferido por nós.

---

## 2026-11-02 (2): o plano do Reflect aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4.md`), com as escolhas listadas para ele:
- o espelho grande encolhe até a zona "Reflect ativo" e fica lá, pequeno, até o ataque;
- a sequência soma 5,3 s (1,5 s ao jogar e 3,8 s na batida), e o primeiro corte, se ficar longo, é o tempo lento do cometa;
- a inversão e o nome só na batida; sem tarjas de cinema, como no protótipo;
- sem dano de volta, o cometa se desfaz no espelho, que quebra mesmo assim;
- o Ataque Absoluto contra Reflect não dispara o feixe, e a folga para em 8 s;
- a Devastação refletida não tem cometa;
- K, J e Q da cena são desenhos genéricos;
- a execução aqui mesmo, tarefa por tarefa, com a revisão final de quem escreveu o código.

> Aprovado, execute

**Leitura:** o plano está aprovado como foi entregue, com as escolhas listadas. **[I]** Vale até o fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.

---

## 2026-11-02 (1): a fatia 4 se divide: o Reflect agora, a Ressurreição depois

Depois de a passagem para a outra conta ficar pronta:

> prossiga, acredito que dá para fazer pelo menos reflect. vamos fazer ressurreição posteriormente.

**Leitura:**
- Muda a ordem do §14 da spec da direção visual: a fatia 4 é só o Reflect, com os sons.
- **[I]** A Ressurreição vira a fatia 4b, antes da fluidez (a fatia 5, que mantém o número porque as notas já a citam assim). Ele só disse
  "posteriormente".
- **[I]** "prossiga" é o próximo passo do `estado.md`: escrever o plano, entregar e só escrever código depois do ok dele.

---

## 2026-11-01 (6): a fatia 3 aprovada, e a outra conta assume

Depois de jogar a fatia 3:

> ok, testado aprovado. o limite semanal está quase acabando, logo irei continuar de outra conta do claude. encurte tarefas pendentes
> para não correr o risco de ficar preso na metade. é fundamental que a memória e os arquivos de contexto persistente sejam devidamente
> atualizados e consolidados, garantindo que o Claude, na minha outra conta, consiga retomar o trabalho exatamente de onde paramos, com
> todo o histórico, as decisões e os detalhes relevantes preservados. O objetivo é assegurar uma continuidade integral do desenvolvimento
> do projeto, sem perda de contexto, retrabalho, retrocessos ou qualquer impacto negativo sobre o que já foi construído.

**Leitura:**
- A fatia 3 está aprovada como foi entregue, sem ajustes.
- **[I]** "encurte tarefas pendentes": esta conta só registra e sobe a memória. O plano da fatia 4 fica para a próxima conta, porque é
  longo e não pode ficar pela metade.
- **[I]** Ele não disse quais caminhos viu. O que a execução não conferiu (o som de ouvido, a cancelada e a refletida no navegador, o
  movimento reduzido no navegador) segue marcado como não conferido por nós.

---

## 2026-11-01 (5): a continuidade entre as contas é fundamental

No meio da execução da fatia 3:

> É fundamental que a memória e os arquivos de contexto persistente sejam devidamente atualizados e consolidados, garantindo que o
> Claude, na minha outra conta, consiga retomar o trabalho exatamente de onde paramos, com todo o histórico, as decisões e os
> detalhes relevantes preservados. O objetivo é assegurar uma continuidade integral do desenvolvimento do projeto, sem perda de
> contexto, retrabalho, retrocessos ou qualquer impacto negativo sobre o que já foi construído.

**Leitura:**
- Reforça a regra da memória compartilhada (`CLAUDE.md`), e a execução da fatia 3 segue depois da consolidação.
- **[I]** O ledger `.superpowers/sdd/…` fica fora do git, e a outra conta pode não o ver. Por isso, as escolhas técnicas de cada
  tarefa também vão para o `diario.md`, e a branch sobe depois de cada bloco (regra 6, no `CLAUDE.md`).

---

## 2026-11-01 (4): o plano da fatia 3 do sub-projeto 6 aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-01-direcao-visual-fatia-3.md`), com as escolhas listadas para ele:
- a Devastação acontece quando a fileira cai (`RowDevastated`), no próprio campo, sem tarjas nem cortina; o lançamento vira
  faixa;
- a cancelada é uma cena curta (1,4 s, sem inversão nem nome), com a fita do motivo;
- na Exódia, o retrato do perdedor racha e a vida dele mostra 0, também para o leitor de tela;
- a desolação dura até uma carta voltar à fileira, guardada pela sessão;
- no celular, a cena rola os campos até a fileira atingida;
- a recomendação de executar aqui mesmo, tarefa por tarefa, com a revisão no fim.

> ok,  pode seguir o plano da fatia 3

**Leitura:** o plano está aprovado como foi entregue, com as escolhas listadas, e a execução é a recomendada. **[I]** Vale até o
fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.

---

## 2026-11-01 (3): a fatia 2 jogada; a cena do Ataque Absoluto cortada

Depois de jogar a fatia 2:

> A cena da defesa absoluta ocorreu primeiro e estava como esperado, já a cena em seguida do ataque absoluto, na mesma partida,
> iniciou na hora do ataque mas foi cortada precipitadamente. corrija e pode prosseguir. aprovado, siga

**Leitura:**
- A fatia 2 está aprovada, com o conserto do corte, e o próximo passo é o plano da fatia 3.
- **[I]** A causa é a jogada seguinte do bot: ele joga 600 ms depois de a vez chegar a ele, e um `state` novo troca a linha do
  tempo no meio da cena. A Defesa não foi cortada porque, depois dela, a vez seguiu dele.
- **[I]** O conserto: o bot do treino espera a folga da cena (a mesma tabela `sceneAllowanceMs` que estende o prazo no online)
  antes de pensar. Vale para as seis cenas.

---

## 2026-11-01 (2): o plano da fatia 2 do sub-projeto 6 aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-01-direcao-visual-fatia-2.md`), com as escolhas listadas para ele:
- o golpe do Ataque Absoluto dentro da cena, sempre com tremor forte;
- o clarão do protótipo fora, pela regra dos 25%;
- os raios a cada 340 ms;
- a cortina que deixa o placar à vista em todas as cenas;
- o pulo que corta o som;
- a insígnia no canto de baixo do retrato;
- a recomendação de executar aqui mesmo, tarefa por tarefa, com a revisão no fim.

> Aprovado, siga

**Leitura:** o plano está aprovado como foi entregue, inclusive as escolhas listadas, e a execução é a recomendada. **[I]**
"siga" vale até o fast-forward na `main` com as duas CI verdes, como nos blocos anteriores (`decisoes.md` 2026-10-31 (14)).

---

## 2026-11-01 (1): a fatia 1 jogada; três ajustes antes da fatia 2

Depois de jogar a fatia 1 do sub-projeto 6:

> ok, está seguindo como o esperado. apenas pontuei alguns pontos:
>
> 1. "Ataque" e "Defesa" na mesa estão escritos como textos comuns. Seria interessante inserir figuras representativas como um
>    espada cruzada antes do valor de ataque e um escudo antes do valor da defesa para ficar mais intuitivo e visualmente melhor
>    de entender. O mesmo para quando tiver ressurreição disponível, cura passiva e outros.. deve haver uma figura representando
>    cada coisa ao invés de um texto simples. Visão é sempre tem a melhor UX e UI.
> 2. Quando cura passiva está ativada, deve haver uma animação de +[valor] verde curando os pontos de vida do player quando
>    houver cura.
> 3. Em pc, quando eu aciono uma carta coringa para jogar por exemplo, as opções de jogadas são exibidas, essas opções (botões)
>    tem textos pequenos abaixo, que, ao passar o mouse entre os botões, a tela fica tremenda infinitas vezes muito
>    rapidamente, vários flicks, isso é um bug que ocorre desde sempre, seria bom deixar esses textos sendo exibidos via tooltip
>    com hover, ou outra forma que você achar mais adaptável.
>
> pode prosseguir.

**Leitura:** a fatia 1 está aprovada como entrou na `main`, e os três pontos vêm antes da fatia 2, numa branch curta com os
mesmos portões (`pnpm check`, as duas CI, fast-forward).

1. **Figuras no lugar do texto:**
   - Espadas cruzadas antes do total de Ataque e um escudo antes do de Defesa, nas quatro fileiras. **[I]** A palavra "Ataque" e
     a palavra "Defesa" saem da tela e ficam só para o leitor de tela.
   - Uma figura para cada marca de estado: Defesa Absoluta, Cura passiva, Ressurreições, Ataque Absoluto armado. **[I]** O nome
     curto continua ao lado da figura: só a figura não ensina a quem joga pela primeira vez o que é "Cura passiva".
   - **[I]** "e outros" também cobre os títulos das zonas do campo (Guarda, buffs de Ataque e de Defesa, Reflect) e os
     destinos do Equipar (Fileira de Ataque e de Defesa).
   - Os desenhos são originais (spec 6 §1), no traço da mesa.
2. **A cura em verde:**
   - O "+N" já existia, mas em ouro e por ~0,5 s: no replay de uma partida com cura passiva, o "+3" do Bot aparecia e sumia sem
     chamar atenção.
   - O "+N" passa a verde, e a barra de vida mostra em verde o trecho que a cura devolve antes do ouro encher. Vale também para
     a cura do Roubo (o mesmo número).
   - **[I]** O verde é uma cor nova na paleta (`cura`, #2a7339). É diferente do verde da capa do oponente, para não parecer "do
     Bot", e o papel sobre ela tem contraste de 5,1:1. O sinal "+" fica, para o sentido não depender só da cor.
3. **O tremor no PC:**
   - A causa não são os textos pequenos dos botões. É a linha "Quebrando o J antes" que aparece nas prévias quando o mouse
     aponta um alvo.
   - Ela faz a barra crescer 17,5 px (medido no Chromium, 1366 × 768) e empurra o botão para fora do ponteiro. A linha some e o
     botão volta para baixo do ponteiro, sem parar.
   - **[I]** A linha vira uma dica flutuante, fora do layout: apontar não muda mais a altura de nada. A segunda linha dos botões
     fica: no toque não existe hover, e ela é o único lugar onde o celular mostra o efeito do alvo.

---

## 2026-10-31 (14): o plano da fatia 1 do sub-projeto 6 aprovado

À entrega do plano (`docs/superpowers/plans/2026-10-31-direcao-visual-fatia-1.md`), com a recomendação de executar aqui mesmo,
tarefa por tarefa, e o desvio deliberado do relógio (parado até o fim da folga mesmo com a cena pulada):

> Aprovado o plano da fatia 1. prossiga

**Leitura:** o plano está aprovado como foi entregue, inclusive o desvio do relógio; a execução é a recomendada (inline, sem
subagente, com a revisão final feita por quem executou). **[I]** "prossiga" vale até o fast-forward na `main` com as duas CI
verdes, como nos blocos anteriores (`decisoes.md` 2026-10-31 (9)); as decisões técnicas da execução ficam no diário.

---

## 2026-10-31 (13): a spec do sub-projeto 6 aprovada, com os sons

À entrega da spec (`docs/superpowers/specs/2026-10-31-direcao-visual-design.md`, com as 21 decisões [I] listadas para ele):

> aprovado, apenas inclua os sons e prossiga

**Leitura:** a spec está aprovada, inclusive as [I] (ele as viu listadas). **[I]** "inclua os sons" = o som deixa de ser a última
fatia e cada fatia sai com os sons do que ela traz (spec §10 e §14 ajustadas); fora das cenas, os sons do golpe comum, da
espada, da fita e da quadra (§10). "Prossiga" = o plano da fatia 1.

---

## 2026-10-31 (12): as cenas especiais tocam sempre inteiras

Na spec do sub-projeto 6 (§7, "Repetição"), à pergunta "A cena repetida na mesma partida toca inteira sempre?":

> Sempre inteira

**Leitura:** nenhuma versão curta na repetição; a mesma cena (duas Ressurreições, dois Ataques Absolutos) toca inteira toda vez,
e o toque na mesa continua pulando. Com a decisão (11), quem joga em seguida não perde tempo com isso.

---

## 2026-10-31 (11): o relógio para durante as cenas especiais

Na spec do sub-projeto 6 (`docs/superpowers/specs/2026-10-31-direcao-visual-design.md` §9), à pergunta "No online, o relógio para
durante as cenas especiais?":

> Parar o relógio

**Leitura:** muda a regra [A] da spec do servidor §6.2 (o relógio só pausava na janela de reação do oponente). Quando um passo
produz um evento de cena rara (Ataque Absoluto, Defesa Absoluta, Exódia, Devastação, Reflect, Ressurreição), o prazo da decisão
calculada nesse passo ganha a duração da cena; duas cenas no mesmo passo somam, até 8 s **[I]**. Pular a cena não dá tempo extra
(a folga é fixa) **[I]**. A tabela de durações fica num lugar só, na entrada principal de `@coringa/protocol` **[I]**. Se o estado
antigo das salas não servir, sobe `STATE_SCHEMA`. O antes/depois de todo o sub-projeto 6 está em
`docs/memoria/notas/direcao-visual.md`.

---

## 2026-10-31 (10): o dano do Roubo fora da iniciativa; a cura passiva sinalizada

Depois do merge do bloco E3 + F2 + F3 (resposta à pergunta do fechamento e o primeiro ponto do playtest):

> O dano do Roubo não deve contar para a iniciativa. Prossiga.
>
> Pontos meus após jogar:
>
> 1. quando 2 K estiverem equipados, sinalizar ao jogador cura passiva ativa (enquanto durar).

**Leitura:** a regra de 2026-10-30 fica como está: o placar da iniciativa soma só o dano do Ataque, e o Roubo não entra. A cura
passiva (2 K ou mais na Guarda, regra da E3) ganha uma marca de estado no campo, ao lado da Guarda, que aparece quando o segundo
K entra e some quando a Guarda cai abaixo de 2. **[I]** A marca vale para os dois lados (é informação pública, como a Defesa
Absoluta), diz só "Cura passiva" (sem o multiplicador dos Q, que ao lado da contagem da Guarda seria lido como o número de K), e
quem decide se está ligada é o motor, não a tela. O item do resumo das regras passa a se chamar "Cura passiva (pela Defesa)",
para o jogador achar o nome da marca. Nada muda na regra.

---

## 2026-10-31 (9): conduzir sozinho até o fim das pendências

No meio do trabalho das respostas de 2026-10-31 (8):

> Dou autorização para prosseguir até o termino de todos as pendências passadas até agora. estou me abstendo por algumas horas e
> deixo em suas mãos a condução do projeto até concluir o que falta.

**Leitura:** o plano 2 do bloco E3 + F2 + F3 segue até o merge na `main` (com `pnpm check` e as duas CI verdes, como já vale até
o MVP), sem parar para perguntar. **[I]** "as pendências passadas até agora" são as do bloco (o plano 2:
`docs/superpowers/plans/2026-10-31-e3-f2-f3-plano-2.md`), não as que só ele pode fazer (playtest, `wrangler login`, deploy, o
VC++ Redistributable). Decisão de regra continua sendo dele: o que a medição levantar volta como pergunta no fechamento, sem
mudar regra por conta própria. A parada combinada de (8) vira aviso: se o Roubo passar de 65% no pareado, o merge sai assim
mesmo (a regra é a que ele pediu) e o número vai em destaque no fechamento; partida no teto ou duração muito diferente, que
apontariam defeito, ainda param o merge.

---

## 2026-10-31 (8): BURN 4, o Roubo sem naipe e a iniciativa mais clara

Às perguntas da medição do plano 1 do bloco E3 + F2 + F3 (`notas/medicao-e3.md`):

> Forma de penalidade fica para o limite de especiais: BURN com limite de 4;
>
> pontos meus:
>
> 1. Mudança de regra da jogada roubo e cura com Ás: Qualquer carta Ás, independente do naipe, serve para roubar uma carta do
>    oponente agora. Quando essa carta é roubada do oponente, subtrai o valor da carta na vida do adversário e cura quem tá
>    roubando. Aí elimina no jogo o valor do naipe. Não existe mais naipe no jogo. k continua anulando, dano não mata.
> 2. Fiz alguns testes e eu posso dizer que eu estou meio perdido quanto às regras de iniciativa. Às vezes eu tô jogando, eu
>    tenho iniciativa e eu não sei por quê, não tá claro pro jogador, e às vezes a iniciativa muda pro adversário, eu também não
>    vejo o momento, não sei por quê. Isso deveria ficar mais claro pro jogador.

**Leitura:**

- **Limite de especiais:** o padrão passa a ser `specialLimit: { max: 4, penalty: 'BURN' }`. A CHOOSE e a FEWER ficam na config,
  fora do padrão.
- **Roubo (substitui o efeito por naipe de 2026-10-30):** todo Roubo tira o valor seco da carta roubada da vida do oponente **e**
  cura quem roubou o mesmo valor, até a vida inicial. Seguem iguais: o A (ou o Selvagem como A) de qualquer naipe, qualquer
  numérica de qualquer fileira, a Defesa Absoluta bloqueando o roubo inteiro, o dano que não mata e o K na Guarda que anula.
  - **[I]** o K anula **só o dano** (é o que ele anulava antes); quem roubou cura mesmo assim.
  - **[I]** a cura é o valor cheio, mesmo quando o dano sai menor (o "não mata" ou o K).
  - **[I]** "não existe mais naipe" vale para as regras: o naipe volta a ser só visual, como a spec 1 dizia antes do Roubo. As
    cartas seguem desenhadas com o naipe, e os ids (`b1-copas-7`) não mudam.
  - **[I]** o dano do Roubo segue fora da conta da iniciativa (ele não falou disso).
- **Iniciativa:** a regra não muda (spec 1 §1.10: no fim de cada rodada de Ataque, fica com quem causou mais dano; no empate não
  muda). O que muda é a tela. **[I]** o como: o dano de cada um na rodada aparece ao lado da marca da iniciativa durante o Ataque;
  no fim de toda rodada de Ataque, mudando ou não, um aviso diz com quem ela ficou e por quê (os dois danos, e o empate); no
  começo, a tela diz que ela foi sorteada.
- **As 10 leituras [I] do plano 1** (`notas/medicao-e3.md`, seção 4): ele as viu e não comentou. Seguem como estão, para
  confirmar no playtest; não estão aprovadas.
- **Parada combinada:** o Roubo novo é remedido antes da interface. Se ele passar de 65% no pareado contra o bot que não rouba,
  ou se a duração mudar ou aparecer partida no teto, a branch para antes do merge e os números voltam a ele. Senão, o plano 2
  segue sem nova parada.

---

## 2026-10-30 (7): o bloco E3 + F2 + F3 liberado

À pergunta "Posso começar o bloco E3 + F2 + F3 (medição no simulador)?", depois do merge da F1:

> Pode começar

**Leitura:** o bloco segue a spec do sub-projeto 5 (E3, F2 e F3) e as respostas de 2026-10-30 e 2026-10-30 (2). Ele vai em
duas partes, com uma parada no meio:

- **Plano 1:** o motor (Reflect reativo, Devastação, Roubo, cura passiva e o limite de especiais com 3 formas de penalidade na
  config), o protocolo, o servidor, os bots e a medição no simulador. A web só acompanha o necessário para o `pnpm check`
  passar.
- **Parada:** a forma da penalidade do limite e as leituras **[I]** que mudam o comportamento de uma regra voltam a ele, com
  os números e a recomendação, antes da interface.
- **Plano 2, depois da resposta dele:** a interface e as cenas, o tutorial, as docs, as partidas de referência, o portão do
  Difícil e o merge.

Nada do bloco entra na `main` antes da resposta dele.

---

## 2026-10-30 (6): a F1 liberada

À pergunta "Posso começar a F1 (apagar o histórico de partidas)?", depois do merge da E2:

> Pode começar a F1

**Leitura:** a F1 segue a spec do sub-projeto 5 (F1) e a leitura do item 1 das anotações de 2026-10-30: só a web, na tela
`/partidas`, apagar a lista `coringa:partidas` com confirmação, e uma partida só. Não muda regra: sem `RULES_VERSION`, sem
`STATE_SCHEMA` e sem o portão do Difícil. As escolhas que ele não descreveu ficam como **[I]** no `estado.md` ("Esperando o
autor").

---

## 2026-10-30 (5): a E2 liberada

À pergunta "Posso começar a E2 (Equipar livre)?", depois do merge da E1:

> ok, pode começar a E2

**Leitura:** a E2 segue a spec do sub-projeto 5 (E2) e a decisão de 2026-10-30 (2), item 8. As escolhas de interface que ele
não descreveu ficaram como leituras **[I]**, no `estado.md` ("Esperando o autor"): sem tocar numa carta, o destino vale para a
primeira que falta; no envio antecipado e no tempo esgotado, as que faltam entram depois das escolhidas, na ordem de compra; o
terminal do simulador segue na ordem de compra.

---

## 2026-10-30 (4): Defesa Absoluta até o ataque; Absolutos em 3 s

Respostas às duas perguntas do fechamento da revisão das notas (F4 e notas 6 a 8):

> 1. Defesa absoluta dura até o oponente atacar de fato.
> 2. 3 segundos acredito que seja o suficiente para o tempo de animaçao dos absolutos.

**Leitura:**

- As perguntas em aberto foram respondidas: a espera da entrada (3) acabou e a fila segue pela E1.
- **Defesa Absoluta (regra nova, muda a spec 1 §1.5 item 4 e §1.8 "Ao terminar"):** ela não acaba mais no fim do próximo
  turno do oponente. Dura até ele atacar de fato e acaba depois desse ataque. Entra junto com a E1 (mesma subida de
  `RULES_VERSION` e o mesmo portão do Difícil).
  - **[I]** Ao acabar, continua indo 1 Q (o mais antigo) ao cemitério, como hoje; só muda quando.
  - **[I]** O Ataque Absoluto conta como ataque e a encerra.
  - **[I]** Um ataque devolvido por um Reflect conta como ataque.
  - **[I]** Com o Reflect reativo (F2), o Reflect contra Reflect não tem golpe: a Defesa Absoluta continua.
  - **[I]** A Armadilha, o Sacrifício, o Roubo e a Devastação não a encerram, porque ela os bloqueia.
  - Os **[I]** vão ao autor junto com os números da E3.
- **Absolutos:** o Ataque Absoluto e a Defesa Absoluta passam de 2,6 s para 3 s (só a web). **[I]** A Exódia fica em 4,2 s,
  porque ele não falou dela.
- As notas 6 (ver todas as cartas, a E2) e 8 (movimentos suaves) não tiveram comentário novo.

---

## 2026-10-30 (3): a E1 espera as respostas

Depois do fechamento da revisão das notas (F4 e notas 6 a 8 em aberto), à pergunta "Posso começar a E1?":

> Espere minhas respostas

**Leitura:** nada da fila (E1 em diante) começa antes de o autor responder às perguntas do `estado.md` ("Esperando o autor")
e liberar a E1. Substitui o "as perguntas não a bloqueiam" do `estado.md` de `d840f48`.

---

## 2026-10-30 (2): respostas ao lote de perguntas de 2026-10-30

As perguntas estão na entrada seguinte desta lista e no histórico do `estado.md` (commit `755ddc0`). Texto do autor:

> 1. Ok. Observação: Deve haver um limite de cartas especiais em mãos pois nessa é só o player ficar esperando juntar 4x K pro
>    exódia ou cartas para formar lançamentos especiais tipo reflect ou devastação. perde a graça do jogo. (minha sugestão max
>    4 cartas especiais).
> 2. Só se pode anular um reflect com outro reflect ou com defesa absoluta. ambos se anulam quando lançados reflects e o
>    atacante passa o turno.
> 3. Ok.
> 4. Ok.
> 5. Ok.
> 6. Isso já está implementado.
> 7. Ok.
> 8. Ok.
> 9. Revise o 'ataque vazio' pois acredito que não foi implementado. As cartas de defesa ainda estão sendo retiradas após
>    atacantes sem cartas de ataque equipadas. Joguei a versão depois de 27/10 mas parece que nem todos os pontos levantados
>    foram feitos ou concluídos por falta de limite de sessão. revise todos as notas.
> 10. PC. Onde ficam as cartas especiais equipadas fica tudo quebrado quando aviso de ressurreição, absolutos, reflect, etc são
>     exibidos. Tamanho da tela do notebook é 1536x695.20.

**Leitura:**

- **1. Reflect reativo, aprovado:** jogado só na janela de reação a um ataque ou a uma Devastação, vale só para aquele golpe,
  com o efeito de hoje. O limite de 4 especiais na mão segue de pé, agora também contra quem guarda cartas para Reflect e
  Devastação.
- **2. Contra o Reflect:**
  - **Reflect contra Reflect:** quem é refletido pode responder com outro Reflect (K+J+Q da mão; é o Anular de hoje). Os dois
    se anulam, as 6 cartas vão ao cemitério e **o atacante passa o turno**: o golpe não acontece **[I]: nenhuma carta sai das
    fileiras e ninguém leva dano**.
  - **A Proteção por sacrifício (J+Q+K do campo) sai do jogo.**
  - **Defesa Absoluta contra o Reflect:** o Reflect lançado contra um atacante sob Defesa Absoluta é anulado. **[I], a confirmar:**
    o Reflect ainda segura o golpe (o dono leva 0), mas não devolve dano e não quebra Q nem K do atacante. Hoje os K do
    atacante quebram nesse caso, e isso deixa de valer.
- **3 a 5 e 7, Devastação, aprovados como propostos:**
  - sai da mão na fase principal e esvazia a fileira do oponente; os buffs ficam e a quadra se desfaz;
  - abre a janela de reação, e a única resposta é o Reflect, que devolve a fileira do mesmo tipo sem quebrar Q nem K; a
    Armadilha não responde;
  - não pode ser lançada contra quem está sob Defesa Absoluta;
  - carta destruída pela Devastação não cura.
- **6. Selvagem na Devastação:** "já está implementado" (o Selvagem faz o papel de J, Q ou A em qualquer jogada). Vale também
  na Devastação: A, J ou Q, nunca K.
- **8. Defesa Absoluta contra o Roubo:** bloqueia o roubo inteiro (nada é roubado).
- **9. Ataque vazio:** relato de bug. Ele jogou a versão de depois de 27/10 e viu a Defesa perder carta depois de um atacante
  sem cartas no Ataque. Ele pede também que **todas as notas** (23/10 e 30/10) sejam revistas uma a uma contra o jogo.
- **10. Tabuleiro quebrado:** no PC, num notebook de 1536 × 695 (área visível), a área dos especiais equipados (buffs e Guarda)
  quebra quando aparecem os avisos de Ressurreição, dos Absolutos, do Reflect etc.

---

## 2026-10-30: respostas ajustadas da Fase E e anotações novas

Substitui a entrada de 2026-10-28 (as respostas da Fase E repassadas pela sessão principal da conta anterior).

### Respostas ajustadas das perguntas da Fase E (texto do autor)

> 1. O Ás fica com as duas funções: continua podendo ser Armadilha e agora ganha nova funcionalidade: Steal. Descarte o poder
>    do naipe - ♥ e ♦ curam, ♣ e ♠ roubam, regra descartada e explicação mais detalhada está no item 2.
> 2. Ajuste de regra: Descarte a minha proposta de cura ativa e poder do naipe do Ás. Agora qualquer carta de Ás pode roubar.
>    Se a carta roubada for ♣ ou ♠, o oponente recebe o dano da carta roubada e a carta vai para a mesa do player (ele escolhe
>    onde equipar: ataque ou defesa) - observação: mesmo se a fileira estiver com buffs, o valor da carta não muda (ex: tirou
>    10 de ♠ da fileira de ataque com 3 J - o oponente leva 10 de dano, não 30, e a carta 10 vai para mesa do player, não
>    mão, se a fileira estiver cheia descarta a última para o cemitério.) - O K anula o dano mas se mantém equipado - defesa
>    absoluta anula o dano - o dano do roubo não conta para a iniciativa - a carta que o ladrão perde com a fileira cheia é
>    elegível para cura quando necessário. regra complementar: o dano por roubo não mata (o hp mínimo do oponente sempre fica
>    1 caso o roubo tire todos os pontos de vida restantes). Agora se a carta roubada for ♥ ou ♦, o player recebe a cura da
>    carta roubada e a carta vai para sua mesa (ele escolhe onde equipar: ataque ou defesa). mesmo se a fileira estiver com
>    buffs, o valor da carta (cura) não muda. a cura não pode ultrapassar a vida máxima.
> 3. Mudança de regra: Apenas as cartas de defesa que vão para o cemitério, independente do naipe, curam, quando equipado 2 K.
>    (se a fileira estiver buffada com Q a cura é proporcional).
> 4. ok, aprovado (regra deve ser adaptada com mudanças estabelecidas do item 2 - agora é possível roubar com qualquer naipe
>    de Ás)
> 5. ok, aprovado. No papel de A, escolhe na hora entre Armadilha ou roubo.
> 6. ok, aprovado em partes. O HP não deve ultrapassar o teto, ok. Este jogo não deve ter limite de rodadas. Reprovada a
>    proposta de 60 rodadas, o jogo deve seguir pois há dinamismo o suficiente para não travar. Reprovada a proposta da regra
>    das 3 rodadas sem dano que você criou, remova-a do jogo.
> 7. ok.
> 8. Me refiro as cartas numéricas que estão na mão após a compra. Quero a possibilidade de ver todas as numéricas de vez
>    após a compra e equipa-las (por na mesa) livremente, ao invés de uma por vez em fila como está.
> 9. Ignore minha proposta de alteração de regra e mantenha como está. Uma única solicitação minha: o usuário poderá
>    visualizar todas as cartas numéricas antes de equipa-las pois do jeito que está, tenho que ficar tendo que ler o
>    histórico para saber quais cartas numéricas eu tenho em mãos após a compra. Outro ponto é que em testes percebi que o
>    acúmulo de cartas especiais é infinita - deve haver um teto e player deve ser penalizado na compra de novas cartas se
>    acumular x cartas especiais (minha sugestão max 4 cartas especiais). senão o player fica juntando K até fazer o exódia.

As perguntas a que ele respondeu estão em `notas/fase-e-perguntas-2026-10-27.md` (os números batem).

**Leitura:**

- **Ás = Armadilha ou Roubo**, à escolha na hora; qualquer naipe. Não existe cura ativa nem poder por naipe do Ás.
- **Roubo:** só na fase principal do seu turno (item 4, que aprovou a proposta "Só no seu turno"). Pega uma numérica de
  qualquer fileira do oponente e a põe no fim da fileira que o ladrão escolher (Ataque ou Defesa); com a fileira cheia, a
  última dela vai ao cemitério. O naipe da carta roubada passa a ser regra (hoje é só visual):
  - ♣/♠: o oponente leva dano igual ao valor seco da carta (sem buffs nem bônus de quadra). Um K na Guarda anula esse dano e
    **não quebra**. A Defesa Absoluta anula o dano. Esse dano **não conta** para a iniciativa e **não mata**: a vida do
    oponente fica em no mínimo 1.
  - ♥/♦: quem roubou cura o valor seco, até a vida inicial.
  - A carta que o ladrão perde com a fileira cheia cura como qualquer outra, se cumprir a cura passiva (abaixo).
- **Cura passiva:** com 2 K ou mais na Guarda **[I: "2 K" = pelo menos 2]**, cada numérica da **própria Fileira de Defesa**
  que vai ao cemitério, de qualquer naipe, cura valor × (1 + nº de Q), até a vida inicial.
- **Selvagem no papel de A:** escolhe Armadilha ou Roubo.
- **Fim do jogo:** a vida nunca passa da inicial. **Sem limite de rodadas. O anti-travamento sai do jogo por completo**
  (como a Pressão da mesa saiu): o simulador usa um teto só dele, para medir, que nunca vira regra. Desistir segue sendo a
  saída do jogador.
- **Equipar livre (muda a regra original da ordem de compra):** depois da compra, o jogador vê todas as numéricas recebidas
  de uma vez e as põe na fileira que quiser, na ordem que quiser.
- **R5 descartada** (numérica nunca fica na mão). **Novo: limite de 4 especiais na mão**, com penalidade na compra. O motivo
  dele: sem limite, o jogador junta K até a Exódia. A forma da penalidade volta para ele com 2 ou 3 opções medidas no
  simulador.
- **Ainda em aberto:** a Defesa Absoluta contra o Roubo. Em 28/10 ele aprovou a proposta "a Defesa Absoluta do oponente
  bloqueia o Roubo"; hoje escreveu "defesa absoluta anula o dano". Pergunta 7 do lote de 2026-10-30, em `estado.md`.

### Anotações novas (texto do autor)

> 1. Deve haver opção de apagar lista de partidas anteriores salvas;
> 2. Nova funcionalidade: Devastação.
>    O player que ativar as cartas: K + A + J -> invoca a devastação e envia todas as cartas de ataque para o ceminério
>    (mantém buffs equipados e intactos). E ao ativar as cartas: K + A + Q -> é o mesmo só que para fileira de defesa.
>    Reflect repele e devolve a devastação (J ou Q); Nada pode impedir a devastação a não ser o reflect (repele e devolve) e a
>    defesa absoluta (anula).
>    Quando devastação é ativada, deve haver um cinematic (animação) à altura, que empolge e deixe o jogador extasiado de
>    satisfação.
> 3. Correção e ajuste no reflect: Em testes reparei que o oponente ativou o reflect depois que eu ataquei, isso nao pode
>    ocorrer, reflect é jogada de reação. Quando reflect é ativado, o dano volta imediatamente para o adversário na jogada de
>    ataque. (ataque recebido -> ativou -> refletiu -> acabou).
> 4. O player que não tiver nenhuma carta na fileira de ataque equipada não ataca e carta de defesa do adversário não é
>    jogada no ceminério ao fim do turno.
> 5. Mudar a exibição do botão de ressurreição disponível para um uma exibição mais adequada e intuitiva e correspondente à
>    jogada. Algo que remete à ressurreição; o board fica todo quebrado quando tem cartas de buffs e o aviso de resurreição.
> 6. Deve ser possível visualizar todas as cartas da mão (ao invés de uma por vez) e poder escolher qual jogar primeiro. ter
>    mais liberdade de jogada;
> 7. A animação de ataque e defesa absoluta são rápidas demais. Ataques e defesas absolutas devem ser com uma animação um
>    pouco mais demorada pra dar mais empolgação pois é um momento muito difícil de alcançar. O mesmo para Exódia que é ainda
>    mais difícil e deve ocorrer algo cinematográfico e empolgante;
> 8. Enriquecer a experiencia com movimentos mais suaves, está muito seco e rápido;
>
> \* Evite regressões e mantenha o alto nível do projeto;

**Leitura:**

- **1. Apagar o histórico de partidas:** só da web (a lista `coringa:partidas` em `/partidas`). Sem pergunta.
- **2. Devastação:** regra nova. K + A + J esvazia uma Fileira de Ataque e K + A + Q uma Fileira de Defesa; os buffs ficam.
  Só o Reflect (devolve) e a Defesa Absoluta (anula) a impedem. Cena cinematográfica à altura. Detalhes nas perguntas 3 a 6.
- **3. Reflect reativo:** muda o Reflect (hoje é lançado na própria vez e fica armado até o próximo ataque do oponente). Passa
  a ser resposta: atacado → lança → o dano volta na hora → acabou. Detalhes nas perguntas 1 e 2.
- **4. Ataque vazio:** já é a regra (spec 1 §1.5 item 3) e tem teste desde `af6b827` (2026-10-27). Pergunta 8: o que ele viu.
- **5. Ressurreição:** a arte nova do botão entrou na Fase C (`bba8377`). O que é novo: **o tabuleiro quebra quando há buffs e
  o aviso de Ressurreição ao mesmo tempo**. É bug de layout: reproduzir e corrigir. Pergunta 9: tela e momento.
- **6, 7 e 8:** repetem as notas de 23/10. A 7 e a 8 entraram na Fase C (`bba8377`, 27/10), e a 6 é o Equipar livre (item 8
  das respostas acima). Pergunta 8: ele jogou uma versão de depois de 27/10?

---

## 2026-10-28: respostas da Fase E (substituída)

Substituída pela entrada de 2026-10-30, que repete os itens com os ajustes dele. A leitura que a sessão principal da conta
anterior repassou ao sub-projeto 5 está no `diario.md`, entrada de 2026-10-27/28.

## 2026-10-27: a tartaruga

> Nenhuma das opções. O Player que não colocar pelo menos uma carta no ataque, não terá direito de atacar e o oponente não
> perde a carta de defesa. Esse efeito colateral, tartaruga, será testado mais a frente por mim após a finalização do jogo.

Nenhuma regra nova para a tartaruga (morte súbita e empate não entram). Medições em `notas/tartaruga.md`. Com a saída do
anti-travamento (2026-10-30), a tartaruga perde a única forma de vencer parada.

## 2026-10-27: fileiras de 8

> Observação: eu disse que cada fileira de ataque e defesa deveriam ter 10 cartas, corrijo e digo que devem ter 8 cartas.

## 2026-10-23: anotações depois de jogar contra os bots (viraram o sub-projeto 5)

> colocar na fila de pendências assim o sub-projeto 4 (Polimento) for concluído.
>
> Healer x Steal - funcionalidade extra - curar hp e roubar carta;
> - passiva: quando qualquer carta de copas do player for para o cemitério, o valor dela é usada para curar. regra: o player
>   deve estar equipado com 2x ou mais K;
> - ativa: a pessoa pode usar uma carta armadilha (copas ou ouro) pra consumir todas as cartas de copas da própria mesa e se
>   curar, se a fileira estiver buffada (J ou Q, 1x, 2x ou mais) a cura aumenta proporcionalmente; regra: carta Ás de copas ou
>   ouro server para healer - cartas Ás de paus ou espadas serve para steal (roubar) qualquer carta numeral da mesa do
>   oponente e ir para sua mão ou mesa. se a fileira de ataque ou defesa estiver cheia poderá substituir pela última carta. se
>   a mão tiver cheia uma carta deve ser descartada no cemitério. Medir impacto dessas regras para manter o equilíbrio do
>   jogo.
>
> **Liberar as 8 cartas de Ás dos dois baralhos (não lembro se foi reduzida para 6 igual ao K).**
>
> Deve ser possível visualizar todas as cartas da mão (ao invés de uma por vez) e poder escolher qual jogar primeiro. ter mais
> liberdade de jogada;
>
> Mensagens de transição de turno, informações e outros textos são exibidas em tela são muito rápidas e quase não dá pra ler;
>
> Mudar a exibição do botão de ressurreição disponível para um uma exibição mais adequada e intuitiva e correspondente à
> jogada. Algo que remete à ressurreição;
>
> A animação de ataque e defesa absoluta são rápidas demais. Ataques e defesas absolutas devem ser com uma animação um pouco
> mais demorada pra dar mais empolgação pois é um momento muito difícil de alcançar. O mesmo para Exódia que é ainda mais
> difícil e deve ocorrer algo cinematográfico e empolgante;
>
> Ter possibilidade de manter a carta na mão ao invés de ser obrigado a jogar ou descartar pro cemitério quando não tiver mais
> jogada;
>
> BUG no late game: cartas de Buff são computadas mesmo estando na mão do jogador e não na mesa. Cartas de buff que foram pra
> mesa e depois foram pro cemitério continuam bufando. Revisar e corrigir. (bufs de ataque e defesa estão sendo concedidos
> também mesmo o player não tendo as cartas equipadas em mesa);
>
> aumentar de 8 pra 10 o número máximo de cartas (fileiras) de ataque e defesa. aumentar a quantidade de vida padrão para 500;
> deve ser possível ajustar a vida no menu;
>
> BUG: as vezes tenho cartas de bufs, k ou armadilha e não é possível jogar na minha jogada. revise e corrija;
>
> Enriquecer a experiencia com movimentos mais suaves, está muito seco e rápido;
>
> ao fim da partida deve exibir o tempo decorrido e algo como "NOME DO PLAYER" VENCEU! grande e destacado num formato HQ;

E, no mesmo dia: "inclua nas anotações a remoção completa da implementação pressão da mesa."

O que virou cada item está na spec do sub-projeto 5 (`docs/superpowers/specs/2026-10-27-ajustes-design.md`).

## Antes (2026-10-15 a 2026-10-22), em resumo

As palavras dele dessas datas estão nas specs 1 a 4, que ele aprovou. Os marcos:

- **2026-10-15:** pediu a versão web multiplayer do jogo que criou ("te dou liberdade criativa para corrigir, dar novas ideias
  e melhorar"). Aprovou a spec de regras: Reflect quebra todos os K; a compra nunca para (o cemitério vira monte); regras
  novas Escolha da iniciativa, Pressão da mesa (saiu em 2026-10-23) e Coringa Selvagem; **reprovou a Fúria do Coringa**.
- **2026-10-16:** "o jogo deve ter uma switch de testes" (o portão `pnpm check`, hooks e CI). Defesa Absoluta: imunidade de uma
  rodada garantida, mesmo depois de se proteger de um Reflect; o Q sacrificado conta como o consumido. Vida 300 (virou 500 em
  2026-10-27). Fallen is Back e Exódia sem mudança de regra. **Push e merge liberados aos agentes até o MVP** ("pode fazer
  esses push, autorizado a você fazer até o mvp ficar pronto"), com `pnpm check` e CI verdes, por fast-forward ou squash; a
  proteção da `main` e a configuração do GitHub são dele.
- **2026-10-18:** direção visual "A Peleja do Coringa" (xilogravura de cordel); deu à sessão principal permissão de aprovar
  por ele ("responda por mim, lhe dou permissão de aprovação").
- **2026-10-19/20:** delegação total das decisões técnicas e de interface ("não quero sessões, planos ou sub projetos
  pendentes. decida e prossiga"). **Regras do jogo continuam com ele.** A Escolha da iniciativa ficou ligada de vez.
