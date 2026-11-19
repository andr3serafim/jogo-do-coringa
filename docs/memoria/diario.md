# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

---

## 2026-11-19 (2): o vídeo do dragão como logo LUSACAN: decisão, otimização e medição

- **Pedido** (`decisoes.md` 2026-11-19 (2)): trocar a logo LUSACAN pelo vídeo do autor, medindo rede e desempenho e otimizando; versão
  9:16 para o celular em pé (ele gera); a prévia HyperFrames abandonada.
- **Feito** (branch `feat/intro-dragao-frente`): a decisão e o estado (`0a29cf4`, que também apaga os três arquivos da prévia que ele
  apagou); o FFmpeg 9.0.2 instalado pelo winget; as variantes e a medição em `notas/medicao-video-intro.md`. Escolhida a H.264 720p CRF
  27 sem áudio e com `+faststart` (557 KB; no 3G com CPU 4×, primeiro quadro em 0,66 s, sem travar). Nada do código do jogo mudou.
- **Armadilhas:**
  - O Chromium do Playwright não toca H.264: medir com `channel: 'msedge'`.
  - O Edge do Playwright às vezes trava no `browser.close()` (e o `page.setContent` com `file://` não carrega mídia): abrir uma página
    `.html` ao lado do arquivo, ou servir por HTTP, e encerrar o processo com prazo.
  - O FFmpeg do winget só entra no `PATH` de um shell novo; o binário fica em
    `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-9.0.2-full_build\bin`.
  - O VMAF do AV1 em WebM sai ~65 em qualquer CRF (medição, não compressão); ficou de fora.
- **Ficou:** o porte para o jogo (a lista no `estado.md`) e a versão 9:16 do autor.

---

## 2026-11-19 (1): a prévia da abertura LUSACAN nova (o dragão de frente)

- **Pedido** (`decisoes.md` 2026-11-19 (1)): melhorar a abertura LUSACAN a partir de um vídeo de referência do autor, vendo antes de
  implementar. Ele escolheu o dragão de frente e a logo com ~3 s (as cartas encolhem).
- **Feito** (branch `feat/intro-dragao-frente`): a prévia HyperFrames em `docs/superpowers/specs/2026-11-19-intro-lusacan/`, com o
  gerador (`gerar-prototipo.ts`), o dragão de frente (`dragao-frente.ts`), o projeto (`prototipo/`) e as folhas de quadros. O
  `hyperframes check` passa (só o aviso de não ter som).
- **Armadilhas:**
  - O `svgOrigin` do GSAP desloca peças que mudam de escala: a prévia anima o atributo `transform` do SVG (a string inteira), que
    é também o que o jogo faz.
  - O giro positivo levanta a ponta da asa esquerda (o y cresce para baixo).
  - Sem FFmpeg na máquina, não há render em MP4; o `snapshot` funciona.
  - O vídeo de referência fica fora do git.
- **Ficou:** a opinião do autor sobre a prévia, e só depois o porte para o jogo (a lista está no `estado.md`).

---

## 2026-11-18 (9): o Coringa do Início menor no notebook

- **Pedido:** `decisoes.md` 2026-11-18 (10). A foto dele tem pixels de tela: com a escala de 125% do Windows, a página tem ~1534 × 692 px
  de CSS (as linhas do menu, 123 px na foto, têm 99 px de CSS). Ali o Início pedia 779 px.
- **Feito:** no `menu.css`, a coluna do Início ganhou `--inicio-folga`, `--inicio-vao` e `--emblema-alto` (100dvh menos as folgas, o vão
  e 404 px da lista com margem); a largura do emblema é `clamp(200px, alto × 300/264, min(286px, 76vw))`, e no PC
  `clamp(220px, …, 340px)`. Abaixo de 760 px de altura, as folgas vão de 34 para 22 px e o vão de 18 para 10 px.
- **Ruling:** o emblema encolhe pela altura com `clamp`, e não com o emblema num item flexível que a coluna encolhe — custo: o número da
  lista (404 px) mora no CSS e precisa mudar se a lista crescer; em troca, a coluna segue com `min-height` (a tela baixa demais ainda
  rola, sem cortar o alto do conteúdo, o que o `justify-content: center` com altura fixa faria).
- **Verificado:** no navegador (o dev server), as medidas no estado. **Falta:** o `pnpm check` do pre-push e as duas CI.
- **Armadilhas:** a foto que o autor manda do Windows vem em pixels de tela; divida pela escala (125%) antes de medir. O `.claude/launch.json`
  foi recriado só com o `web` (sumiu em 2026-11-18; fora do git).

---

## 2026-11-18 (8): o ajuste do autor no Treinar ("Aprender jogando" sem a linha)

- **Pedido:** `decisoes.md` 2026-11-18 (9). O push que apagava a `feat/menus-visual` remota (junto com a memória na `main`) foi barrado
  pelo pre-push: o autor editava o `copy.ts` ao mesmo tempo (a linha do `LEARN_LINE` comentada e no stage; o typecheck da web quebrou).
  Nada subiu. Perguntado, ele disse que o ajuste era dele e deixou `LEARN_LINE = ''`.
- **Feito:** a branch `feat/treinar-sem-linha` (da `main` local, com o commit da memória que não tinha subido), o ajuste dele como está,
  e a memória; o push apagou a `feat/menus-visual` remota no mesmo comando. O `git commit` dele (com o pre-commit, que demora) terminou
  depois do `git checkout -b`, e o commit dele (`c87aa47`) caiu na branch nova: o resultado certo, por sorte.
- **PR #3**, mesclado por fast-forward até `7273b1d` ("Conferir e mesclar"): `check` e `e2e` verdes no push da branch nesse commit; o
  `pnpm e2e` local verde (130, 4 pulados, 10,6 min). O deploy do ajuste é dele.
- **Armadilhas:** o pre-push confere a árvore de trabalho, não o commit: uma edição feita durante o push barra um commit que estava bom.
  Antes de concluir que o código quebrou, `git status` e a hora do arquivo (`stat`). A `main` não tem proteção e o repositório não liga o
  auto-merge: o `set_auto_merge` mesclaria na hora, sem esperar a CI.

---

## 2026-11-18 (7): os menus no Folheto na `main` e no ar

- **PR #2** (`https://github.com/andr3serafim/jogo-do-coringa/pull/2`), aberto com o `gh` (agora instalado nesta máquina). O autor
  concordou com os links de criar sala em `/jogar` (`decisoes.md` 2026-11-18 (6)) e deu o "Sim, merge" (2026-11-18 (7)): a `main` por
  fast-forward até `9f10887`; o GitHub fechou o PR como mesclado. CI do push da `main`: `check` 365 s e `e2e` 617 s, verdes.
- **O deploy, rodado pelo Claude a pedido** ("rode o deploy para mim", 2026-11-18 (8); a tentativa dele pela caixa da conversa levou o
  `!` junto para o PowerShell e nada rodou): `pnpm deploy:server` em `5f5821f` (o commit da memória que registrou o deploy em curso),
  verde. O `/api/health` devolve `5f5821f`.
- **Armadilhas:** logo depois do deploy, o `/api/health` responde as duas versões, conforme a instância; espere um minuto antes de dizer que
  caiu. O site já estava em `97a1a6b` antes (o autor tinha publicado a abertura depois do merge dela, e a memória dizia que faltava): olhe o
  `/api/health` antes de afirmar o que está no ar.

---

## 2026-11-18 (6): os menus no Folheto, o `pnpm e2e` e o conserto do nome dos links

- **O `pnpm e2e` inteiro:** 128 passaram e 2 falharam, os dois no axe (`label-content-name-mismatch`, WCAG 2.5.3): o nome das linhas do
  Início e das escolhas de Treinar era só a entrada ("Jogar online"), e o texto visível tem também a linha curta.
- **Feito (`1b8ce40`):** o nome do link é o texto visível inteiro (a entrada, um espaço, a linha); saíram o `aria-labelledby` e o
  `aria-describedby`. Os testes de unidade procuram o nome pelo começo (`/^Jogar online/`) e um confere o nome inteiro. A spec §7 corrigida.
- **Ruling:** o que promete criar uma sala leva direto a `/jogar` ("Criar sala" da sala que não existe e da partida parada, "Criar outra
  sala" da sala cheia, "Nova sala" no fim da partida online, "Jogar com um amigo" no fim do tutorial), e não ao Início, que virou menu —
  custo: muda o destino de cinco links (é o [C] da spec §2); em troca, o link cumpre o que diz. "Voltar ao início" segue em `/`.
- **Verificado:** depois do conserto, o `online.spec` e o `tutorial.spec` de novo: 8 passaram. A suíte da web verde no pre-commit.
  **Falta:** o `pnpm check` do pre-push, as duas CI do PR.

---

## 2026-11-18 (5): os menus no Folheto, no código (spec, plano e as Tasks 1 a 6)

- **Pedido:** `decisoes.md` 2026-11-18 (5) (a A4 aprovada nos fundos rosa e verde; o controle discreto do tema; spec, plano e código).
- **Spec e plano:** `docs/superpowers/specs/2026-11-18-menus-folheto-design.md` e `docs/superpowers/plans/2026-11-18-menus-folheto.md`
  (`60d6d46`). Sem o leitor de spec em subagente (a sessão não abre agentes sem pedido): a spec foi relida como quem constrói.
- **Feito:**
  - **Task 1 (`eafcf78`):** `Prefs.menuTheme?: 'pink' | 'green'` (ausente é rosa; valor estranho some) e `menuThemeOf`; o provedor
    `MenuThemeProvider` (`src/ui/menu/menu-theme.tsx`), com o tema e o movimento do menu.
  - **Tasks 2 a 4 (`cb35e32`):** as rotas `/jogar`, `/treinar`, `/opcoes`; `src/ui/menu/` (`menu.css`, `MenuScreen`, `Emblem` com os
    traçados exportados do `Coringa.tsx`, `MiniCard` e `MenuItem` com a inclinação da mão, `ThemeToggle`, `parts.tsx` com o título, o
    painel, os carimbos, o campo e a chave); o Início novo; `PlayOnline` (os formulários que eram do Início), `Practice`, `Options`; o
    `skin="menu"` no `HpChoice` e no `LookChoice`; a copy nova no `copy.ts`.
  - **Task 5 (`1e4fcaa`):** a `Screen` de `ui/parts.tsx` virou a `MenuScreen`; dentro dela (`InMenuContext`), o `Title`, o `Panel`, o
    `Button`, o `TextField` e o `Switch` vestem o Folheto; a escolha do nível do treino em carimbos de ouro.
  - **Task 6 (`b723fe6`):** os E2E pelo menu novo (um passa por Início → Jogar online; o tutorial pelo selo do Treinar e o ouro do
    "Aprender jogando"; a aparência nas Opções; "Partidas anteriores" como link).
- **Ruling:** as entradas são rotas próprias (`/jogar`, `/treinar`, `/opcoes`), e não estado do Início — custo: três rotas a mais; em
  troca, o Voltar do navegador e o gesto do celular voltam ao Início, e o link direto abre a tela (sem a abertura).
- **Ruling:** as telas que já existiam vestem o Folheto pelo contexto (`useInMenu()` nas peças de `ui/parts.tsx`), e não reescritas uma a
  uma — custo: uma peça com dois ramos; em troca, a partida (o fim, a dica, o menu dela) fica igual sem tocar nela, e a mudança é pequena.
- **Ruling:** o movimento reduzido do menu é lido do armazenamento a cada desenho (`useMenuMotion`), e não guardado no provedor — custo:
  um `JSON.parse` pequeno por desenho; em troca, a chave mudada no menu da partida vale ao voltar ao menu.
- **Ruling:** o controle do tema tem o nome fixo "Fundo verde" e o estado no `aria-pressed` (o plano dizia nome trocando) — custo: nenhum;
  é o padrão do botão de alternar.
- **Ruling:** o degradê do fundo mora na camada fixa (`.menu-fundo`), e não no `background-attachment: fixed` — custo: nenhum; rola mais
  leve e a foto de página inteira não mostra a faixa clara.
- **Ruling:** o título que recebe o foco ao abrir (`tabIndex=-1`, fora do Tab) não mostra o anel no menu — custo: o foco programático não
  se vê; ele serve ao leitor de tela.
- **A ordem dos testes (honesta):** Tasks 1 e 2, os testes antes e vistos vermelhos. **Tasks 3 e 4: o código antes dos testes** (as peças,
  o CSS e as telas saíram juntos; os testes do Início, de Jogar online, Treinar, Opções e da inclinação vieram depois, e passaram de
  primeira, menos o do Som pelo `App`). Task 5: a suíte de antes como guarda (2 falhas do foco do título nas partidas, consertadas).
- **Verificado:** a suíte inteira da web (2994), o lint, o typecheck, o smoke (191,4 KB); as fotos do app no dev server. **Falta:** o
  `pnpm e2e` inteiro, o `pnpm check` do pre-push, as duas CI.
- **Armadilhas:** um `useImperativeHandle` na peça de fora e outro na de dentro sobre o mesmo `ref`: o de fora (que roda depois) apagava o
  de dentro (`useImperativeHandle(inMenu ? undefined : outer, …)`). Em `node -e`, a barra de `/\/jogar$/` se perde na fuga: gravar o
  texto com `String.fromCharCode(92)` ou editar o arquivo. Um `cat > arquivo` sem entrada trava o shell.

---

## 2026-11-18 (4): a rodada 4 dos menus (A4 · Folheto)

- **Pedido:** `decisoes.md` 2026-11-18 (4).
- **Feito:** `a4.css` e sete pranchetas: o Início no celular em três fundos (`A4-inicio-rosa`, `-verde`, `-vinho`), o Início no PC
  (verde) e as telas Jogar online, Treinar e Opções (verde). A A3 desceu para a linha da rodada 3.
  - **O emblema:** o Coringa do `Coringa.tsx` em escala 3,4 num disco de raio 92: os guizos, as pontas do chapéu e a gola passam da
    borda. Onde sai do disco, um contorno de papel com fio de tinta por fora (o chapéu e a gola desenhados duas vezes, `paint-order`),
    para ler sobre qualquer fundo.
  - **O menu:** quatro linhas (globo, espadas cruzadas, ampulheta, regulagem; os índices ♥ ♠ ♣ ♦), divididas por um fio; a linha toda é
    o link, e o ponteiro dela inclina a mini carta (o mesmo cálculo da mão, preso entre -0,5 e 0,5); sem o manipulador, a regra de hover
    inclina e sobe a carta (conferido: `matrix3d` e -6 px).
  - **Os fundos, parados:** rosa da capa com a moldura dupla e os losangos vermelhos nos cantos; verde de mesa com o filete de ouro e a
    costura tracejada; vinho com a treliça fina e a margem dupla de verso de carta. Saiu o desenho de naipes que deslizava.
  - **As telas internas:** os carimbos do `styles.css` do jogo (borda de 3 px, cantos retos, sombra de madeira de 3 a 4 px, o grão nos
    grandes, afundam no toque); a opção marcada é o carimbo afundado (tinta); títulos em tipo de madeira com a textura áspera
    (`#a4-textura`, o mesmo filtro do `#textura-aspera` da mesa); a chave retangular, com o pino de tinta e o trilho em ouro ligado.
- **Ruling:** o terceiro fundo é o vinho do verso de baralho — custo: é a única cor fora da paleta da mesa; a treliça fica em 4,5% para
  não tremer.
- **Ruling:** o PC e as telas internas foram desenhados só no verde (o pedido dele de "verde padrão mesa de poker") — custo: com outro
  fundo escolhido, refazer essas quatro pranchetas.

---

## 2026-11-18 (3): a rodada 3 dos menus (A3 · Folheto)

- **Pedido:** `decisoes.md` 2026-11-18 (3).
- **Feito:** `a3.css` e sete pranchetas: o Início no celular em três fundos (`A3-inicio-tinta`, `-anil`, `-papel`), o Início no PC
  (tinta) e as telas Jogar online, Treinar e Opções (tinta). A B, a C e a D saíram do canvas e da pasta (`git rm`); a A2 e a A ficaram
  embaixo como rodadas anteriores.
  - **O emblema:** o Coringa do `Coringa.tsx` (o da capa da rodada 1, gola vermelha) num disco de papel com o anel pontilhado, e o leque
    das quatro cartas (♥ ♠ ♦ ♣) saindo de trás da cabeça. Primeiro saiu numa carta grande (5:7); sobrava papel e era mais um retângulo,
    então virou o disco, que também segura o chapéu preto no fundo tinta.
  - **O menu:** três mini cartas em leque (Jogar online ♥ no vermelho, Treinar ♠ no verde da cura, Opções ♦ no ouro: "ouros"), com o
    medalhão do ícone e o nome num carimbo de cor levemente torto. Respiram (3 px, 3,6 s, cada uma num tempo, como a mão); sob o mouse
    inclinam em 3D até 13° com a sombra acompanhando (o mesmo cálculo do `Hand.tsx`, num manipulador do canvas); no toque, sobem 8 px;
    entram dando-se ao abrir a tela.
  - **As telas:** a faixa de título na cor da entrada, com a mini carta dela; painéis de papel arredondados com a ficha de cor por cima;
    botões com a cor da ação e sombra dura que afunda; em Treinar, "Jogar com o bot" em papel (o verde já é da faixa) e "Aprender
    jogando" em ouro com o selo.
- **Ruling:** a entrada das cartas anima `transform` com `backwards`, e a respiração anima `translate` — custo: nenhum, mas um
  `both`/`forwards` na entrada prenderia o `transform` e mataria o hover (foi o erro da D na rodada 2).
- **Ruling:** os títulos em Alfa Slab dentro de `h1`/`h2` levam `font-weight: 400` — a fonte só tem um peso, e o negrito do navegador a
  borra (as fichas saíram borradas na primeira foto).
- **Não conferido:** a inclinação 3D roda no canvas (o manipulador `onPointerMove` da prancheta); localmente só se vê o subir do hover.
- **Armadilhas:** o `fotos.mjs` agora espera 1,6 s (as entradas animadas); uma página do Playwright aberta com `setContent` não carrega
  `file://` (a folha lado a lado saiu vazia).

---

## 2026-11-18 (2): a rodada 2 dos menus (A2 · Folheto com menu e D · Mesa)

- **Pedido:** `decisoes.md` 2026-11-18 (2) (o Folheto fica; o Início vira menu de três entradas; o Coringa da capa repaginado e sem o
  título grande; uma direção nova com o Balatro de referência).
- **O Coringa novo** (um desenho só, nas duas direções): o busto com o chapéu de três pontas e guizos, a piscadela, o sorriso torto, as
  bochechas, o losango sob o olho, a gola em zigue-zague e o peito de losangos (arlequim). Na A2 é xilo de duas cores (tinta e vermelho,
  hachura no gomo do meio) diante do sol de raios, com o leque dos quatro naipes atrás do chapéu; na D é colorido, de contorno grosso.
  Conferido sozinho antes de entrar nas telas (rosto aumentado na segunda passada).
- **A2:** `a2.css` (herda o `a.css`); o menu de carimbos grandes (a gravura num bloco de tinta, o nome e a linha do que tem dentro), o
  selo vermelho no Treinar (tutorial por fazer), Partidas anteriores num item menor; as telas com o Voltar e o nome numa placa
  pendurada no barbante.
- **D:** `d.css`; o feltro com o desenho dos naipes que desliza devagar, a luz quente no alto, a costura da mesa; o Coringa atrás da
  borda de madeira; as três cartas do menu balançam, cada uma no seu tempo (no toque, sobem); fichas de cor no feltro; botões grossos
  com sombra dura; as telas com a fita de título na cor da carta.
- **Ruling:** o "texto grande" é o título da capa; sai, e o `<h1>` fica só para o leitor de tela — custo: o nome do jogo não aparece
  escrito no Início (a abertura o carimba antes).
- **Ruling:** o Treinar segue a ordem dele (Jogar com o bot, Aprender jogando); com o tutorial por fazer, o Aprender vai em ouro com o
  selo, e o Treinar do menu também leva o selo — custo: quem chega pela primeira vez dá um toque a mais até o tutorial.
- **Ruling:** do Balatro, só a estrutura (cartas no centro, movimento com peso, botões de cor por ação); nada do desenho dele (spec da
  web §10.6) — custo: não "parece Balatro", de propósito.
- **Em aberto, para a spec depois da escolha:** a navegação nova (rotas ou estado; o Voltar; os E2E de "Criar sala"), o lugar de
  "Partidas anteriores", e as chaves Reduzir animações e Passar sozinho nas Opções do Início (fiação nova para preferências que já
  existem).
- **Armadilhas:** o scratchpad da sessão mudou de pasta no meio do trabalho (o `.claude/launch.json` aponta o servidor `menus-rascunhos`
  para o novo); o `fotos.mjs` grava `<nome>.png` só para `.dc.html`. Uma publicação no canvas foi recusada por versão mais nova (era o
  próprio tipo do canvas que tinha atualizado): ler o `canvas.json` de novo e publicar por cima.

---

## 2026-11-18 (1): três direções para o redesenho visual dos menus

- **Pedido:** redesenhar a camada visual dos menus (fundos, painéis, botões, tipos, ícones, efeitos, arte), sem mexer em regra, fluxo,
  estado, rede ou handler; três direções para ele escolher (`decisoes.md` 2026-11-18 (1)).
- **Feito:** a branch `feat/menus-visual`; as fotos das telas de hoje (Início, escolha do nível, menu da partida, no celular); as três
  direções em pranchetas de canvas (Início no celular e no PC, o menu da partida), com os mesmos controles e a mesma ordem de hoje:
  - **A · Folheto:** o Início é a capa de um folheto de cordel pendurada no barbante (pregadores de madeira); o título em tipo de madeira
    impresso fora de registro (tinta + vermelho), a xilo do Coringa num sol de raios; painéis de papel com a faixa de tinta cortada como
    fita; botões de carimbo com o bloco de madeira por baixo; fundo rosa com fibra de papel. Nenhuma fonte nova.
  - **B · Matriz** (a recomendada): o Início é o taco entalhado; fundo de tinta com veio de madeira (`feTurbulence`), traços de goiva
    em papel saindo do Coringa entalhado (hachura em papel, guizos de ouro); o título em ouro com a sombra de madeira, igual ao quadro
    final da abertura; tacos com marcas de goiva nos cantos; a opção marcada vira "papel impresso". Nenhuma fonte nova (o Archivo largo,
    `font-stretch: 125%`, nos títulos dos painéis).
  - **C · Noite:** o céu índigo, a lua de prata e a silhueta do Coringa diante dela com veios violeta (a rima com o dragão da logo),
    ruínas no chão, Cinzel e metal de ouro, estrelas que cintilam devagar. A Cinzel entraria no primeiro carregamento (fonte, não JS).
- **Ruling:** os rascunhos são HTML e CSS estáticos (sem React), com a arte do jogo (o `Coringa.tsx` e os naipes do `Suit.tsx`) — custo:
  o efeito de movimento (o brilho do título, o reflexo do botão, as estrelas) só se vê no navegador, não na foto.
- **Ruling:** no PC as três usam a mesma grade (herói à esquerda, painéis em duas colunas na ordem do DOM); um layout centrado com três
  colunas não cabe em 900 px de altura sem mudar a ordem da Aparência e das Preferências — custo: os três PCs parecem parentes no arranjo.
- **Ruling:** os títulos visíveis dos painéis ("Criar sala"…) repetem o `aria-label` que o `Panel` já tem; no código, viram um `<h2>`
  (muda a árvore de títulos, não a lógica).
- **Para abrir sem o canvas:** sirva a pasta `docs/superpowers/specs/2026-11-18-menus-direcoes/project/` num servidor estático (ex.:
  `npx serve`) e abra cada `.dc.html`; aberto direto do disco, os CSS relativos não carregam. As fontes vêm do Google Fonts (só no
  rascunho; o jogo as serve do próprio Worker).
- **O que não pode passar para o código** (achado ao mapear): os testes que olham classe (`bg-ouro` no "Aprender jogando" em destaque,
  `text-base` nos campos, `tabular-nums`) guardam garantias; a direção escolhida mantém a garantia mesmo que a classe mude. O `Switch`,
  o `Button` e o `Panel` do `parts.tsx` também vestem o menu da partida e o fim (`GameMenu`, `EndPanel`): mudar a peça muda os dois.
- **Armadilhas:** o painel do navegador abre `file://` como foto estática (sem CSS relativo): para conferir, um servidor
  (`.claude/launch.json`, entrada `menus-rascunhos`, porta 8798) e as fotos em tamanho real pelo Playwright do projeto (um script no
  scratchpad que importa o `@playwright/test` do `packages/web`).

---

## 2026-11-17 (2): a logo LUSACAN redesenhada (o dragão) e a abertura sobre a `main`

- **Pedido:** a logo redesenhada a partir de uma imagem de referência (um dragão de asas abertas diante da lua), com a animação de um
  dragão que voa, gira, volta, abre as asas e para na pose; "PRODUCTIONS" no plural, "LUSACAN" menos extravagante; liberdade criativa
  (`decisoes.md` 2026-11-17 (3)).
- **Antes:** a `feat/abertura` refeita sobre a `main` (o código de antes aplicado de uma vez, sem conflito; a memória reescrita: a
  decisão e o diário da abertura viraram 2026-11-16 (5)), e os três títulos quebrados da `decisoes.md` da `main` consertados (as
  entradas 2026-11-17 (1), 2026-11-16 (4) e (3) tinham perdido o `## data`). Commits `e011403` e `b0b3143`.
- **Feito** (`1473c43`):
  - **As letras:** os contornos da Cinzel 600 ("LUSACAN") e 500 ("PRODUCTIONS"), tirados do `.woff` do `@fontsource/cinzel` pelo
    `scripts/cinzel-contornos.ts` (zlib do Node, sem dependência nova), conferidos contra a fonte de verdade no navegador. Com espaço
    largo entre as letras, sem o metal e o brilho da referência.
  - **O desenho:** `ui/intro/lusacan-shapes.ts` (a lua com crateras e halo; o dragão por peças, com o pivô na origem de cada uma: a asa no
    ombro, o corpo no peito; os veios de raio; o rabo curto enrolado acima do nome, para não aparecer entre as letras; os filetes de
    "PRODUCTIONS"), a paleta da noite (escura) e a de tinta (clara). Quatro iterações no navegador (o corpo de coluna, o gancho do
    pescoço, a cabeça pequena), com a pose mandada ao autor antes da animação.
  - **Os SVG:** `scripts/gerar-logo-lusacan.ts` (`pnpm --filter @coringa/web logo`), no repositório, lendo o módulo de formas.
  - **O voo:** `ui/intro/dragon-flight.ts` (as poses: entra pequeno no alto à esquerda, cruza por cima da lua, desce pela direita e passa
    girando na frente dela, volta de asas recolhidas maior que a pose, abre as asas e assenta) e as três batidas de asa; Web Animations
    ligada num `useLayoutEffect` do `Intro.tsx`. O CSS faz a lua, o halo e os veios que acendem, o nome letra a letra e os filetes.
  - **Os tempos:** a logo ~2,3 s (de 1,5 s), as cartas em 3,0 s, o desenho inteiro em 5,35 s (era 5,6 s no `1473c43`; ver "Depois",
    abaixo); a logo inteira fica parada 500 ms antes de sair.
  - **O som:** `abertura-logo` virou o voo (três batidas abafadas, o sopro do giro, o mergulho, as asas que se abrem); a versão curta toca
    `abertura-logo-curta` (só as asas).
  - **O orçamento:** com o dragão e as letras, o JavaScript inicial ia a 193,9 de 200 KB. A abertura saiu do inicial (`intro-loader.ts`,
    como as cenas; o smoke confere com a marca `data-dragao-voo`): 186,9 KB. Até o pedaço chegar, uma capa escura; se falhar, o menu abre
    (`app-chunk-intro-fails.test.tsx`). A `IntroBoundary` foi para um arquivo próprio, no inicial.
- **Ruling:** o voo é Web Animations, e não CSS, porque tem várias fases e os instantes têm de sair do modelo (keyframes de CSS não leem
  variáveis nas porcentagens) — custo: o jsdom não anima; o teste confere as poses e a ligação, e o resto é o navegador.
- **Ruling:** o rabo longo da referência (por baixo do texto) saiu: aparecia entre as letras na versão clara — custo: a cauda é curta.
- **Ruling:** o contorno de luz do dragão no componente tem espessura fixa na tela (`non-scaling-stroke`, 1,8 px), para não sumir quando
  ele está pequeno no voo; nos SVG de `assets`, o traço escala (1,2 da caixa) — custo: a logo do jogo e a dos arquivos diferem nesse traço.
- **Ruling:** a abertura num pedaço à parte custa uma ida à rede antes do dragão (a capa escura cobre) — em troca, 7 KB de folga no
  orçamento do inicial.
- **A ordem dos testes:** os do modelo (os tempos novos, a pista curta) e o do pedaço que falha foram escritos antes e vistos vermelhos;
  os da logo, do voo (`dragon-flight.test.tsx`) e da ligação das animações foram escritos depois do código, olhando o navegador.
- **Verificado:** o pre-commit (1856 testes relacionados); o `abertura.spec.ts` (15) verde no build de produção, com a CSP e o console
  limpo; o smoke (186,9 KB); a medição temporária com a CPU 4× (a logo a 57 quadros/s no PC e 59,5 no celular, o pior quadro 33 ms; as
  cartas a 58 e 59). Os quadros no navegador, no PC e no celular, e a versão curta.
- **Depois** (`0b2250e`, `b47a2af`, achados numa revisão por subagente):
  - **A capa só fechava com o clique:** com a rede lenta, Enter, Espaço e Esc não faziam nada até o pedaço chegar. Agora as teclas do
    `skipsIntro` fecham a capa também (testes no `app.test.tsx`, com o `forgetIntro()` do carregador, só para testes).
  - **O E2E mede da capa ao menu**, como a pessoa vê; assim a abertura dava 6,0 s (a capa somava ~0,4 s aos 5,6 s). O desenho foi a
    5,35 s (o voo começa 100 ms antes; as cartas em 3,0 s), e o `main.tsx` pede o pedaço antes do primeiro desenho. Medido da capa ao
    menu, três vezes: 5,82 s (a primeira, sem cache: a capa em 0,44 s), 5,61 e 5,61 s (a capa em 0,25 s).
  - **A ordem dos testes:** os da capa com teclas foram escritos depois do código (o da capa que falha, antes).
  - **O teto do E2E:** a execução inteira parou duas vezes nos 600 s do `globalTimeout`, sem falha (114 verdes e 16 por rodar, com a
    máquina livre), e a CI da `main` já levava 545 s no `pnpm e2e` (2026-11-17, pela API). O teto foi a 780 s (o job tem 15 min).
- **O E2E, ao fim:** a execução inteira (com o teto antigo) deu 114 verdes, 4 pulados, nenhuma falha e 16 por rodar; os que faltaram
  (`mobile.spec` e `drag.spec`, nos dois projetos) rodaram à parte, verdes (39, 4 pulados); o `abertura.spec` (15) verde no build final.
- **CI:** as duas verdes em `ee2ff6e` (`check` 240 s, `e2e` 605 s de job).
- **O merge:** "Sim, merge" (`decisoes.md` 2026-11-17 (4)): a `main` andou por fast-forward até `52452c0`, com as duas CI verdes no
  push (`check` 365 s, `e2e` 630 s de job). O worktree foi removido (a pasta, com o `Remove-Item` de caminho longo); a entrada
  `web-abertura` saiu do `.claude/launch.json`.
- **Armadilhas:**
  - **Um teste com `userEvent` na capa** acha a abertura no lugar dela: o pedaço já carregado chega enquanto o `userEvent` espera. Na capa,
    use o evento síncrono (`fireEvent`, `dispatchEvent`).
  - O Vite reescreve `new URL(..., import.meta.url)`; e um `.mjs` que gera TS com crases dentro de um template quebra: depois de gerado,
    o `lusacan-shapes.ts` é editado direto.
  - Uma letra da Cinzel tem quadráticas de TrueType com pontos de controle seguidos (o ponto do meio é implícito): o extrator os trata.
  - O `preview_start` lê o `.claude/launch.json` do checkout principal (a entrada `web-abertura`, porta 5174).

---

## 2026-11-17 (1): o deploy no ar

- **Feito pelo autor:** `pnpm deploy:server` na `main` em `8266a4f` (sem a abertura, "Deploy sem ela", `decisoes.md` 2026-11-17 (2)).
- **A primeira tentativa falhou** com o código 10063 ("You need a workers.dev subdomain"): a conta nunca tinha criado o subdomínio
  `workers.dev`. O `wrangler` 4 não tem comando para isso; o autor o criou no painel (Workers & Pages, "Your subdomain") e o deploy passou.
- **Conferido depois:** `https://jogodocoringa.com.br/api/health` → `{"ok":true,"version":"8266a4f"}`; a página inicial e o treino
  (`/treino?semente=prod-1&nivel=medio`) abrem e o bot joga; `https://www.jogodocoringa.com.br/treino?semente=x` → 301 para a raiz com a
  query preservada.
- **Armadilhas:** o `ALLOWED_ORIGINS` de produção é `http://localhost:*`, e está certo: o upgrade aceita sempre a própria origem
  (`router.ts`). O console mostra o beacon da Cloudflare Web Analytics barrado pela CSP; é a injeção automática da zona, não o jogo.
- **O que ficou:** a abertura na `feat/abertura` (o `estado.md`); o playtest do autor no ar.
- **Limpeza ("Sim, limpe"):** removidos os worktrees `inspiring-sammet-387417` e `youthful-elgamal-3d5e8a` e as branches locais
  `feat/ajustes` e `claude/inspiring-sammet-387417` (já na `main`, nada sem commit). Fica só o worktree da abertura. A nota
  `notas/playtest.md` risca o primeiro deploy.

---

## 2026-11-16 (5): a abertura do jogo (a logo LUSACAN e a intro)

- **Pedido:** a sequência de abertura ao iniciar o jogo: a logo "LUSACAN productions" (~1,5 s) e a intro do jogo (~3 a 4 s), com som,
  pulo, movimento reduzido e a logo em SVG (`decisoes.md` 2026-11-16 (5), com o pedido e as três respostas ao plano).
- **Rebase (2026-11-17):** registrada na branch como 2026-11-16 (2); a `main` já usava o número, e no rebase sobre ela (o código
  aplicado de uma vez, sem conflito; a memória reescrita) a entrada virou esta. Os commits de antes ficaram na tag local
  `abertura-antes-do-rebase` (`3aae1de`).
- **Onde (antes do rebase):** a branch `feat/abertura`, no worktree `.claude/worktrees/abertura`, **saída da `feat/cenas-repetidas` (`1d92cd7`)**, e não
  da `main`: o checkout principal estava com aquele conserto em curso (outra sessão o commitou e subiu durante este trabalho), e sair
  dela evita o conflito no topo do `estado.md`, do `diario.md` e do `decisoes.md`. A `feat/cenas-repetidas` entra na `main` antes ou junto.
- **Feito** (`085e043`):
  - **A logo:** um olho de dragão (o nome vem de um dragão antigo, guardião da noite): a lua é a íris, a pupila é uma fenda, a pálpebra
    de cima é um capuz que sobe como um chifre. Desenho original, com as letras desenhadas (sem fonte). Os traçados moram em
    `ui/intro/lusacan-shapes.ts`; os quatro SVG (o conjunto e o símbolo, para fundo escuro e claro) em `src/assets/lusacan/`, com `LEIAME.md`.
  - **A abertura** (`ui/intro/Intro.tsx`, `intro.css`, `model/intro.ts`): a logo entra por partes (o capuz corta, a lua acende, a
    pupila fecha na fenda, as letras sobem em fila), as quatro cartas dos naipes sobem em leque, juntam-se com a aura, o maço vira no
    Coringa e o título é carimbado (onda, faíscas, um brilho); esmaece para o menu. 5,2 s; com movimento reduzido, a logo parada, 1,8 s.
  - **O som:** as pistas `abertura-logo` e `abertura-titulo` no `synth.ts`; o `SoundController.prime()` tenta o áudio sem gesto.
  - **O `App`:** `<App intro />` (só o `main.tsx`); a camada fica por cima do app inteiro, que já monta, dentro de um `div` `contents` com `inert`.
- **Ruling:** os SVG de assets e o componente partilham os traçados por um teste, e não por um arquivo só — custo: quem muda o desenho
  mexe no módulo e regrava os SVG (o programa que os gravou não está no repositório; são 4 arquivos de ~3 KB, editáveis à mão).
- **Ruling:** o contexto de áudio criado sem gesto fica guardado, suspenso, e o primeiro gesto o retoma (o caminho que já existia para o
  contexto interrompido) — custo: no Chrome, um aviso no console (não um erro) a cada abertura com o som ligado.
- **Ruling:** a abertura é desligada nos E2E por uma chave do armazenamento (`coringa:abertura = pular`, pelo `storageState` do
  `playwright.config.ts`) — custo: quem gravar essa chave à mão no navegador não vê a abertura. O jogo nunca a grava.
- **Ruling:** o `div` com `inert` em volta das rotas fica sempre no DOM (com `display: contents`), para o Início não remontar quando a
  abertura sai — custo: um nó a mais na árvore, sem caixa.
- **Ruling:** sem spec nem plano em `docs/superpowers/`: o autor pediu plano curto na conversa, aprovou e mandou implementar. A regra do
  que foi decidido está no `decisoes.md`; o como, no `CLAUDE.md` e nos comentários do código.
- **A ordem dos testes:** os testes do modelo, do componente, da logo, do controlador, do armazenamento e do `App` foram escritos antes
  e vistos vermelhos (18 falhas e 4 arquivos sem o módulo); o `abertura.spec.ts` foi escrito depois do código.
- **Verificado:** ver o `estado.md` (o que rodou e o que falta).
- **Armadilhas:**
  - **O E2E com a 8787 ocupada** (o `wrangler dev` do autor): um config temporário ao lado do `playwright.config.ts`, que troca a porta
    em `use` (o `baseURL` e a origem do `storageState`) e no `webServer`, como o `onPort` do `medir.config.ts`, com
    `reuseExistingServer: false`; rodar com `pnpm exec playwright test -c <config>`. Não commitar.
  - O `preview_start` do app lê o `.claude/launch.json` do checkout **principal**, mesmo com a sessão num worktree: a entrada
    `web-abertura` (Vite do worktree, porta 5174) foi acrescentada lá.
  - O Vite reescreve `new URL('…', import.meta.url)` nos testes do jsdom: para ler um arquivo do disco, `resolve(import.meta.dirname, …)`.
  - Uma animação de CSS com `transform` apaga o `transform` do atributo do SVG: nas letras da logo, anime `translate` e `scale`.
  - Para olhar um instante da abertura: montar o `Intro` sozinho numa página temporária e, com `document.getAnimations()`, pausar
    todas e pôr `currentTime` no instante (o `onDone` vazio deixa a camada na tela).

---

## 2026-11-16 (4): o merge do domínio e do Roubo; o greedy barra a Exódia

- **Pedido:** "manter como está mas ensina o bot pois deveria usar o A pra remover o K quando tiver perto de formar o exódia (4k)" e "Sim,
  faça o merge dos dois" (`decisoes.md` 2026-11-16 (4)).
- **O merge:** a `main` andou por fast-forward até `426de18` (o topo da `feat/roubo-buff`, que contém a `feat/dominio`); com a memória,
  `6070478`. O push da `main` passou no `pnpm check`, e as duas CI ficaram verdes em `6070478`.
- **O bot** (`feat/bot-exodia`, saída da `main` em `6070478`, no mesmo worktree `.claude/worktrees/roubo`):
  - **O diagnóstico:** o greedy já mirava o K a 1 da Exódia (o alvo valia 1000, acima de qualquer Roubo, e a reação ao K jogado também). O
    que mudou com o Roubo mais forte foi antes disso: ele gastava os A roubando com o oponente a 2 K e chegava ao terceiro sem nenhum. Uma
    sonda de 1000 partidas (script fora do git, com o `measureSeries` do `e3`): todas as Exódias foram montadas aos poucos, nenhuma de
    uma vez, então o A podia barrar.
  - **O conserto** (`6536e9c`): `GREEDY.exodiaWatch` = 2 (o A num K a 2 K da Exódia, na fase principal e na reação), com dois testes no
    `greedy.test.ts` (vermelhos com 1, verdes com 2). Os testes do simulador e da web não mudaram (o roteiro offline não passa por isso).
  - **A medição** (`notas/medicao-roubo-buff.md`, seção "Depois"): a Exódia no greedy × greedy de 3,6% para 1,3% (dentro da meta), no
    turtle × greedy de 15,7% para 6,3%; o portão do Difícil aprovado (72,5% · 73,5% · p95 140 ms).
- **Ruling:** o limiar é 2 (a sonda: 1 não muda nada; 2 resolve) — custo: o greedy gasta um A a mais em K que talvez nunca virassem Exódia.
- **Ruling:** o portão foi medido do zero (`--recomecar`): o `--ajuste` recusou porque a config ganhou a chave `stealBuffed` — custo:
  o histórico de rodadas do relatório recomeça.

---

## 2026-11-16 (3): o Roubo com o buff da fileira (RULES_VERSION 6)

- **Pedido:** a regra nova do Roubo (`decisoes.md` 2026-11-16 (1), item 8) com as três [I] confirmadas ("Ok nas três", 2026-11-16 (3)), e
  "prossiga com as pendências para o deploy e finalização". **Sem plano à parte:** a regra veio fechada do autor; as escolhas técnicas abaixo
  são `Ruling:` de quem executou.
- **Feito,** na `feat/roubo-buff` (worktree `.claude/worktrees/roubo`, saída da `feat/dominio` em `e1c12b1`, para a memória seguir linear):
  - `e248b45`: `stealAmount(card, fromRow, victim)` no motor (valor × (1 + J) ou × (1 + Q), sem a quadra, contado antes de a carta sair);
    `stealOutcome` sem o K; o `StealDamage` sem `blocked` e com o valor do roubo; a cura pelo mesmo valor; o `stealPreview` acha a
    fileira da carta. Os testes do Roubo e da prévia foram reescritos antes (3 vermelhos, depois verdes). O `eval.ts` do greedy avalia o
    Roubo pela conta nova; o texto do histórico e o experimento `e3` perderam o caso do K. Os replays de referência foram regravados
    (`record-golden`), os resumos revistos (o greedy rouba mais: no `greedy-0`, de 8 para 16) e o `RULES_VERSION` foi a 6, com o digest.
    Na web: a prévia do alvo ("−27 para Duda · +27 para você"), o resumo das regras e a dica do tutorial; o teste do Equipar vazio trocou a
    semente `diag-12` pela `diag-3` (as partidas mudaram). O livro de regras (8.5 e 14.1).
  - Depois: a spec das regras (§ do Roubo) e o comentário do `StealDamage`; a medição.
- **A CI reprovou o primeiro push** (`350f4c9`, o `e2e`): as fixtures de replay do E2E (`absolutos`, `especiais`) foram gravadas com a
  regra de antes, e o replay roda no motor de agora: a vida e o fim das partidas mudavam (345 virou 364, a rodada do golpe final sumiu).
  As partidas que o autor guardou no navegador divergiriam do mesmo jeito.
- **Ruling (o conserto):** a regra nova fica atrás da chave `stealBuffed` do `RulesConfig`, ligada no `makeConfig()`, como a
  `resurrectOnQuad` do ponto 16. Sem a chave (os replays de antes, as fixtures, as partidas guardadas), vale o Roubo de antes: o valor
  seco, e o K anula. Por isso o `blocked` **voltou** ao `StealDamage` e ao `StealOutcome` (sempre `false` com a chave), a prévia da web
  voltou a saber do K, e o texto do histórico do simulador e os testes da web que só tiravam o `blocked` voltaram ao de antes. Os replays
  de referência foram regravados de novo, e os resumos e o digest da versão 6 não mudaram — custo: um ramo a mais no motor para as regras
  antigas.
- **Ruling:** `STATE_SCHEMA` e `PROTOCOL_VERSION` não sobem: a forma do estado não muda, e a sala online guarda a config no estado: a
  aberta antes do deploy segue até o fim com o Roubo de antes (sem a chave) — custo: nenhum visto.
- **Ruling:** o greedy não foi reajustado à regra nova além da conta do `stealValue` (o limiar `stealMain` segue 12) — custo: o achado da
  Exódia abaixo fica para o autor decidir.
- **Medição** (`notas/medicao-roubo-buff.md`): o dano do roubo por partida foi de 54 para 200 e a cura de 60 para 187, mas o greedy que
  rouba segue fazendo **39,5%** contra o que não rouba (antes, 39,2%). **A Exódia quase dobrou** (greedy × greedy 1,9% → 3,6%, fora da
  meta de 1–3%; turtle × greedy 7,5% → 15,7%): o greedy gasta o A no Roubo em vez de destruir os K de quem junta Guarda. O portão do
  Difícil aprovou de primeira (67,5% · 73,5% · p95 136 ms).
- **Armadilha (de novo):** um `node -e "…"` com crases dentro das aspas duplas executou os comandos entre crases (`pnpm sim:e3`,
  `pnpm sim:calibrate`, `pnpm sim:dificil --recomecar\`). Só o último chegou a rodar e parou no argumento errado; nada foi gravado. **Todo
  texto com crases vai por script em arquivo.**

---

## 2026-11-16 (2): o domínio jogodocoringa.com.br

- **Pedido:** "já comprei o domínio jogodocoringa.com.br e está criado na cloudflare", com o `www` redirecionando (`decisoes.md` 2026-11-16 (3)).
- **Feito,** na `feat/dominio` (saída da `main` em `ca2b4d0`): a rota `{ pattern: 'jogodocoringa.com.br', custom_domain: true }` no
  `wrangler.jsonc`, com o teste no `assets-config.test.ts` (vermelho antes, verde depois). O `wrangler deploy --dry-run` aceita a rota.
- **Por que só isso:** a interface e a API saem do mesmo Worker, e o servidor aceita sempre a própria origem (`isOriginAllowed`); o
  `ALLOWED_ORIGINS` só serve a outras origens (o Vite local). O CSP do `_headers` é `'self'`. Nenhum endereço do `workers.dev` está no
  código: o link da sala sai da origem da página.
- **Ruling:** o `www` não entra no Worker: com `run_worker_first` só em `/api/*`, o Worker não vê os pedidos dos assets e não teria como
  redirecionar a página. O redirecionamento é a regra da zona, no painel (o autor faz) — custo: um passo fora do repositório.
- **Ruling:** o `workers.dev` fica ligado (reserva; não divide nada, porque ninguém o usa como endereço do jogo) — custo: dois endereços
  respondem.
- **O que o autor faz no painel da Cloudflare** (zona `jogodocoringa.com.br`), antes ou depois do deploy:
  1. **DNS:** um registro `CNAME` `www` → `jogodocoringa.com.br`, com o proxy ligado (nuvem laranja).
  2. **Rules → Redirect Rules → "Redirect from WWW to Root"** (o modelo pronto), com 301 e a query mantida.
  3. O `pnpm deploy:server` cria sozinho o registro do domínio sem `www` e o certificado (o `custom_domain`). Se a zona já tiver um
     registro `A`/`AAAA`/`CNAME` na raiz, o deploy recusa: apague-o antes.

---

## 2026-11-16 (1): o lote respondido, a config do pnpm e o bug das cenas que repetiam

- **Pedido:** as respostas ao lote de doze perguntas e o bug visto no treino (`decisoes.md` 2026-11-16 (1)). O Roubo mais forte e a arte do
  cemitério ficaram para blocos próprios (abaixo, "O que ficou").
- **A config do pnpm (12):** o `%LOCALAPPDATA%\pnpm\config\config.yaml` tinha `storeDir: D:.pnpm-store` (caminho relativo ao drive). Todos os
  projetos com `node_modules` em `D:` (os do trabalho e os pessoais, conferidos pelo `.modules.yaml` de cada um) já usavam `D:\.pnpm-store`
  (v10 ou v11, conforme a versão do pnpm que instalou). A linha virou `storeDir: D:\.pnpm-store` (sem BOM); o backup ficou em
  `config.yaml.bak-2026-11-16`. O `pnpm store path` dá `D:\.pnpm-store\v11` aqui e nos projetos do trabalho, como antes.
- **O bug das cenas:** depois de uma cena (a Devastação, o Ataque Absoluto…), o momento seguinte da especial do oponente mostrava a cena de
  novo, sem efeito de jogo, até numa partida nova.
  - **A causa:** o `Stage` segura a última cena enquanto a cortina está no ar (`curtain && busy ? lastScene : null`, de 2026-10-21), e o
    véu do momento (bloco A, 2026-11-03) sobe a mesma cortina, com `veil = 'moment'`. Com o véu no ar, a camada recebia o `lastScene` (que
    nunca é limpo, nem entre partidas, porque o `Stage` fica montado), e o desenho da cena remontava e tocava. A Devastação, que não tem
    cortina própria, voltava do mesmo jeito.
  - **O conserto** (`523adcc`): a última cena só fica com a cortina **da cena** (`curtain && veil === 'scene' && busy`). O teste novo no
    `moment.test.tsx` (a Defesa Absoluta do Bot e depois um J dele) falhou antes (a camada voltava a `ABSOLUTE_DEFENSE`) e passa depois.
  - **A/B no navegador:** o replay da fixture `exodia-devastacao`, rodada 43, com um `MutationObserver` na camada: sem o conserto, a
    sequência foi `DEVASTATION` → o momento `BuffPlayed` do Bot → `DEVASTATION` com o véu; com ele, o véu sobe sem a cena. O `Stage` é o
    mesmo no treino, no online e no replay: a leitura [I] "o online pode ter o mesmo" fica coberta, e a partida nova sai pelo mesmo caminho.
  - **Ruling:** um conserto só (a condição do véu), sem limpar o `lastScene` ao baixar a cortina — custo: nenhum visto; a cortina da cena
    nunca sobe sem uma cena em curso.
- **O que ficou:**
  - **O Roubo mais forte** (`decisoes.md` 2026-11-16 (1), item 8): bloco próprio, num worktree separado (o dev server e o `jogar-treino.bat`
    do autor servem o checkout principal, e uma regra em obra ali misturaria `RULES_VERSION`). Antes da calibração e do portão do Difícil, as
    três [I] dele vão ao autor (o K não quebra no Roubo; a Defesa Absoluta segue bloqueando; o buff conta antes de a carta sair).
  - **A arte do cemitério** (item 10): a direção vai ao autor antes do código.
- **Armadilhas:**
  - A CI só roda em `main`, em `feat/**` e nos PRs: uma branch `fix/…` sobe sem CI. Use `feat/…`.
  - O replay serve para reproduzir cenas no navegador (o mesmo `Stage`), mas escolha um trecho com momento do oponente **depois** da cena:
    na `absolutos`, rodada 11, os momentos do Bot vêm antes do Ataque Absoluto, e o bug não aparece.
  - O painel do navegador escondido tem tela 0 × 0: o `resize_window` com um tamanho resolve.

---

## 2026-11-15 (1): as regras 4.0, a §14 confirmada e a branch nova

- **Achado ao retomar:** a `feat/regras-4-0` (as regras 4.0, de uma sessão paralela ao bloco D) estava no GitHub sem merge e fora do
  `estado.md` da `main`, com números de entrada repetidos (a decisão (3) e o diário (2), que a `main` já usava para o bloco D).
- **Feito:** o rebase sobre a `main` (`d3f65a9`), com a decisão renumerada (4) e a entrada do diário (3); o `estado.md` com a
  pendência. O `--force-with-lease` da branch foi barrado pelo modo automático; o autor mandou usar uma branch nova
  (`feat/regras-4-0b`) e confirmou as seis leituras da §14 (`decisoes.md` 2026-11-15 (1)). A §14 virou "Leituras confirmadas", o
  cabeçalho do documento deixou de dizer "rascunho" (diz que só a §14 foi revista), e os seis comentários `[I]` do motor
  (`actions/main.ts`, `reaction.ts`, `equip.ts`) dizem "confirmado pelo autor, 2026-11-15". Só comentários: nada muda regra.
- **Ruling:** os dois `[I]` do motor fora da §14 (o tempo esgotado do Equipar em `equip.ts` e a conferência da cura em `combat.ts`)
  ficam como estão — custo: seguem sem o "ok" dele.
- **O merge:** "finalize" (`decisoes.md` 2026-11-15 (1)): a `feat/regras-4-0b` subiu com o `pnpm check` verde no pre-push e as duas CI
  verdes em `b5f93e3`; a `main` andou por fast-forward até ela, e o push da `main` (`aa2a6b1`) teve as duas CI verdes.
- **Armadilha:** o worktree `regras-4` não tinha as DLLs do paliativo do workerd; sem elas os testes do servidor caem. Copiadas do principal.

---

## 2026-11-14 (3): as regras 4.0 (`docs/JOGO-DO-CORINGA-4.0.md`)

- **Pedido:** ignorar os `.txt` antigos e escrever um `JOGO-DO-CORINGA-4.0.md` em `docs/` (`decisoes.md` 2026-11-14 (4)).
- **Feito:** o livro de regras, a partir da leitura inteira do motor (`config`, `flow`, `combat`, `preview`, `quads`, `actions/*`,
  `legal-actions`), do `RULES_SECTIONS` da mesa e dos tempos do servidor (`TIMERS`). Regras numeradas (1.1, 1.2…), exemplos de mesa nos
  casos difíceis (o ataque, o Reflect, o Ataque Absoluto contra a Defesa Absoluta, a cura passiva) e a seção 14 com as seis leituras
  **[I]** do motor ainda sem o "ok" dele.
- **Onde:** a branch `feat/regras-4-0`, num worktree próprio saído da `main` (`8368eb1`), porque o checkout principal tem o bloco D em
  curso, sem commit. O `estado.md` **não** foi mexido aqui: o mais novo é o do bloco D (`f37ae09`), e um commit dele nesta branch
  esconderia aquele da regra 1.
- **O que ficou:** a revisão do autor, ponto a ponto; o merge, com o "sim" dele. No merge, `decisoes.md` e `diario.md` podem conflitar
  no topo com o bloco D (as duas entradas ficam, a mais nova em cima).
- **Rebase (2026-11-15):** a branch foi refeita sobre a `main` (`d3f65a9`, com o bloco D). As entradas ganharam os números
  seguintes aos da `main`: esta é a (3) do diário, e a decisão é a (4).

---

## 2026-11-14 (2): o bloco D (os botões de carimbo e a lápide no centro), a execução

- **Pedido:** "execute o bloco D" (o autor). As escolhas são do Claude **por delegação** (`decisoes.md` 2026-11-14 (1)): **o autor não as viu**.
- **Feito**, na `feat/playtest-bloco-d` (saída da `main` em `8368eb1`): o plano (`f37ae09`); a Tarefa 1, os carimbos (`b8aa957`); a
  Tarefa 2, a faixa de três colunas com o monte em pilha e a lápide (`0cf538c`); as correções da revisão (`6359b60`).
- **Ruling (por delegação):** as doze escolhas estão na §6.3 da spec do playtest (a sombra de madeira, o grão só nos grandes, o que é de papel e
  o que é de ouro, a etiqueta irmã do botão, os pingos da cor da face, sem levantar no ponteiro, sem inclinar, o replay como está, a faixa que
  não engordou, a carta do topo em pé, o "Monte" só para o leitor de tela no celular, a poeira no `Leaving`).
- **Desvios do plano:** a faixa do PC ficou compacta nas duas alturas (o plano dizia ~96 px no PC: com isso os campos rolavam em 1440 × 900);
  a carta do topo ficou em pé (o plano dizia inclinada); a poeira saiu da faixa e foi para o `Leaving`.
- **A ordem dos testes:** na Tarefa 1 o teste foi escrito antes do código, mas **não foi rodado vermelho** antes de implementar; na Tarefa 2
  foi (8 de 11 vermelhos).
- **Verificado:** `pnpm check` verde (web 2819 testes; JavaScript inicial 183,9 → 185,7 KB); `pnpm e2e` inteiro verde (115, 4 pulados). As
  fotos das quatro telas e a A/B em `notas/medicao-bloco-d.md`: passa o portão, **custa ~2 quadros/s na troca de mão** (de onde vêm, não
  investigado), e uma repetição isolada deu 48 a 1366.
- **A revisão** (um subagente novo, só leitura): nenhum Critical; 2 Important, os dois corrigidos (a poeira com atraso fixo, que tocava antes
  de a carta chegar quando havia cena; o toque do Atacar armado sem retorno com movimento reduzido); dos Minor, corrigidos: palavra comprida nas
  laterais da faixa, pingos só no botão principal do mouse, a faísca parada com o botão desligado, um teste dos pingos de ouro.
- **O merge:** "Sim, merge" (`decisoes.md` 2026-11-14 (3)): a `main` andou por fast-forward até o topo da branch, com as duas CI verdes em `08f728f`.
- **Adiados (Minor):** o punho vermelho da espada some no Atacar vermelho, e os raios de ouro do Ressuscitar ficam fracos no papel (desenho);
  "Cemitério" a 9 px no celular (o contraste passa, o tamanho está no limite); o grão do carimbo repete o SVG do `grao` (~400 bytes); as
  formas paradas do `:active` não têm teste (são CSS puro); a etiqueta do Absoluto não afunda com o botão.
- **Armadilhas:**
  - Uma animação CSS com `fill` para a frente num nó que fica na página **nunca termina** para o `helpers.ts` do E2E (o `axe` espera
    `document.getAnimations()` só com as sem fim): a poeira assim derrubou 10 testes. Efeito de uma vez só: `backwards`, e o nó sai ao fim.
  - `data-verso` já é dos versos da mão do oponente (um teste conta todos): os da pilha do monte são `data-monte-verso`.
  - `CI=true pnpm e2e` nesta máquina faz o pnpm tentar um `install` e bater na config quebrada do store; com a 8787 livre, rode sem o `CI=true`.
  - O painel do navegador do app não segura o tamanho da tela entre chamadas: as fotos saíram de um script do Playwright contra o Vite (5173).

---

## 2026-11-14 (1): a Devastação no celular (a rolagem dos campos e o Motion)

- **Pedido:** "3. aprovado." (o autor, `decisoes.md` 2026-11-14 (1)), sobre o bloco curto que estanque o recálculo de estilo da mesa inteira.
  Na mesma entrada ele deu o deploy por feito, mandou ignorar a virada de rodada lenta e delegou as escolhas do bloco D.
- **Diagnóstico:** o perfil apontou o Motion (`applyProjectionStyles`, 617 mutações do `style` da raiz das cartas); uma sonda temporária
  (fora do git) mostrou que o tremor não pesava e que o Motion animava 29 cartas a cada quadro, a partir de ~59 px, porque a cena rola os
  campos (`revealRow`) e o `[data-campos]` não estava declarado como área de rolagem. Detalhes em `notas/medicao-devastacao-estilo.md`.
- **Feito:** o plano curto (`a97ff4f`); o conserto, `layoutScroll` no `[data-campos]` (`194d710`), com o E2E no `fluidez.spec.ts`
  (vermelho antes: 29 cartas; verde depois); a medição A/B (Devastação com arte a 360: 53 → 56; o resto igual).
- **Ruling:** o conserto é na causa (a rolagem lida como mudança de layout), não na face com arte — custo: nenhum. **Ruling:** o deslize
  subpixel que sobra (0,42 px, ~26 cartas por ~330 ms, a mesa que muda menos de 1 px de altura quando a fileira cai) fica: um atraso de 1 ms
  no ronco não o tirou, e o portão já passa — custo: ~330 ms de recálculos grandes na cena. **Ruling:** o E2E olha deslocamentos de 2 px ou
  mais (o salto da rolagem), não o subpixel. **Ruling:** sem revisor novo (o conserto é uma linha e o teste prova o efeito no navegador).
- **O merge:** "Sim, merge" (`decisoes.md` 2026-11-14 (2)): a `main` andou por fast-forward até `0402869`, com as duas CI verdes no topo. O push da `main` (`491687c`, com a memória) teve as duas CI verdes.
- **Armadilha nova:** um `node -e "…"` com crases dentro das aspas duplas executa o que está entre crases (aqui, um `pnpm check` e um
  `pnpm e2e` de verdade, que foram parados). Script de edição sempre em arquivo, rodado com `node`.
- **Armadilhas:** um `MutationObserver` no palco com `attributeFilter: ['style']` mostra o que o Motion reescreve, carta por carta; o
  perfil sozinho só dizia "Inline CSS style declaration was mutated". A máquina variou entre sessões: só a A/B na mesma sessão decide.

---

## 2026-11-13 (1): a fatia 3 dos decks (o online), a execução

- **Pedido:** "execute o plano da fatia 3 dos decks" (o autor, 2026-11-13), numa sessão nova do Claude Code. O plano
  `docs/superpowers/plans/2026-11-12-decks-fatia-3.md`, aprovado com as H1 a H7 (`decisoes.md` 2026-11-12 (2)). Inline
  (`superpowers:executing-plans`), tarefa por tarefa, teste primeiro, na branch `feat/decks-fatia-3`; o revisor novo, num subagente, no fim
  (H7).
- **Andamento** (uma linha por tarefa, com os commits e as `Ruling:`):
  - **Task 0 (o começo):** a `main` não andou (`b6c2caf`); a aprovação está no `decisoes.md`; nada sem commit além do `.claude/` e do
    `jogar-treino.bat` do autor.
    `pnpm check` verde (com parte da Task 1 já no disco: as duas foram escritas enquanto ele rodava).
  - **Task 1 (o protocolo): feita** (`1e4e1d1`). `SeatInfo.look?`, `LookBodySchema` (dois textos de até 32), `CreateRoomBodySchema` com
    `look?`, `JoinRoomBodySchema` no lugar do `NicknameBodySchema` (o teste dele mudou por desenho: as três conferências de antes, mais
    `look` válido e `hp` recusado); `createRoom(…, hp?, look?)` e `joinRoom(…, look?)`, e o `call` só põe no corpo as chaves que vieram.
    **Ruling:** o commit da Task 1 leva o `router.ts` só com a troca do esquema (montado do `HEAD`), e o `pnpm check` completo roda depois
    da Task 2, cobrindo as duas (o pre-commit já roda lint, typecheck e os testes relacionados) — custo: se a Task 1 sozinha quebrasse algo
    fora dos relacionados, o check não diria de qual commit veio.
  - **Task 2 (o servidor): feita** (`57a6d79`). `SeatRecord.look?` e `LookInput` (`core/types.ts`); o `seatLook` do `room-core.ts` grava
    `normalizeLook(look)` só quando o corpo trouxe (H1); o `roomMessage` copia o `look` do assento; os RPC e o roteador (`readCreate`,
    `readJoin` no lugar do `readNickname`) levam o `look`. Testes novos: o núcleo (a normalização com a trava e o id desconhecido, a cópia,
    a entrada, a mensagem só com o `look` de quem tem, o registro antigo sem `look`), a revanche e a reconexão (`lobby.test.ts`) e o HTTP (os
    códigos, e o `look` do corpo chegando à mensagem `room` por um socket de verdade: vermelho com o roteador sem passar o `look`). Nenhum
    teste existente mudou.
    `pnpm check` verde depois da Task 2 (web 2762 testes, servidor 289 e 37 no workerd).
  - **Task 3 (a web: criar e entrar levam a aparência): feita** (`f6ea153`). `sentLook` e `isDefaultLook` em `model/looks.ts` (o padrão dá
    `undefined`; fora dele, uma cópia); a `RoomApi` passa o `look`; o Início manda a do painel e a entrada por link a das preferências
    (`loadPrefs(store).look ?? DEFAULT_LOOK`), cada um com a chamada de hoje no padrão. `LOOK_TRAINING_ONLY` virou `LOOK_ONLINE_NOTE`
    ("Na sala online, vale a que você tinha ao entrar.", H4; o teste da nota mudou por desenho). Testes novos em `looks.test.ts`,
    `home.test.tsx` (a preferência, a troca no painel, a volta ao Cordel), `room-gate.test.tsx` e `room-api.test.tsx` (a API de verdade
    leva o `look` ao corpo). **Ruling:** o `pnpm check` completo da Task 3 rodou junto com o da Task 4 (o pre-commit rodou os 2228
    relacionados) — custo: uma quebra fora deles só apareceria no da Task 4. **Ruling:** o `look-choice.test.tsx` usa a frase antiga como
    texto de exemplo da prop `note`; fica (não confere o Início).
  - **Task 4 (a web: a sala veste os assentos): feita** (`0df6e94`). `roomLooks` e `recordedLooks` em `model/looks.ts`; o `useTableLooks`
    saiu do `PlayTable` para `ui/table/useTableLooks.ts` (modos `training`, `online` e `none`), memoizado pelos textos do deck e da raça de
    cada lado e pelos dois ids; o `recorded` dos dois caminhos é o `recordedLooks` (no treino, o mesmo de antes). O menu ganhou `lookNote`
    (a linha `LOOK_ROOM_FIXED` no online, H3). O `OnlineRoom` pede os pacotes dos assentos num efeito com o texto das aparências como
    dependência (vale no lobby e na mesa). Testes: `room-looks.test.tsx` (novo: as duas cadeiras, a preferência que não entra, o assento sem
    `look`, a presença, o axe, o memo, o menu, a gravação), `looks.test.ts`, os pacotes no lobby no `room-gate.test.tsx`; o `anim-harness`
    ganhou a opção `playerId`. Os testes da fatia 2 sobre o online (`table-looks`, `end-and-menu`, `past-games-record`) seguiram verdes sem
    mudar. **Ruling:** o `useTableLooks` mora num arquivo próprio e exportado, e o memo pelo conteúdo é provado com `renderHook` (o mesmo
    objeto para um `seats` novo com as mesmas aparências): a identidade do nó da imagem, que o plano pede, não pegaria uma troca de contexto,
    porque o React reaproveita o nó — custo: um arquivo a mais. **Ruling:** primeiro só a extração do hook (os testes da fatia 2 verdes, os
    novos vermelhos), depois o online, para ver os testes da mesa falharem de verdade.
    `pnpm check` verde depois da Task 4 (web 2795 testes; servidor 289 e 37 no workerd).
  - **Task 5 (E2E, smoke, documentação): em curso.** O E2E de duas pessoas no `looks.spec.ts` (`e50246d`): Ana escolhe Bestiário + Egípcio
    no painel do Início e cria a sala; Duda, com Celestial + Bufão nas preferências (`addInitScript`), entra pelo link; no Equipar e depois
    da revelação, cada tela veste cada lado com a do assento, o axe nas duas, e o menu com a linha `LOOK_ROOM_FIXED`. Passou sozinho. O smoke:
    JavaScript inicial 183,9 KB (a branch antes do código, igual à `main` com a fatia 2) → 184,3 KB. O `CLAUDE.md` (o item "Aparências") e a
    §17 da spec (`1868280`). **Ruling:** os versos do outro no E2E se conferem só quando existem: com a semente do servidor de teste
    (`e2e2631`), no Equipar da rodada 1 a mão de Duda está toda "montando 4 cartas" (nenhum verso à mostra; a foto da primeira rodada do E2E
    mostra isso), e o plano supôs versos ali; os versos de cada deck por assento estão provados no `room-looks.test.tsx` — custo: o E2E não
    prova o verso no navegador de verdade.
    `pnpm e2e` inteiro: 114 passaram, 4 pulados (9,4 min; eram 113 na fatia 2, o novo é o de duas pessoas). A branch subiu em `23cb2d3` (o
    pre-push verde: web 2795 testes, JavaScript inicial 184,3 KB).
  - **A revisão da branch inteira (H7; subagente novo, Opus, `b6c2caf..23cb2d3`): "pronto para merge: sim"** — nenhum Critical nem
    Important, 4 Minor. O Step 6 do plano manda o achado virar correção nesta branch:
    - (M1) o `seatLook` tinha entrado entre o docblock do `RoomCore` e a classe: subiu para antes dele (`ead82e5`).
    - (M2) cinco comentários que a fatia deixou falsos (o `copy.ts` em cima do `LOOK_ONLINE_NOTE`, o `GameMenu`, o `past-games`, o
      `useRecordPastGame`, o `PlayTable`): reescritos para o estado da fatia 3 (`ead82e5`). Nenhum comportamento mudou, e por isso nenhum
      teste novo.
    - (M3) o `estado.md` tinha dois próximos passos (o da fatia 2, velho) e a Fila dizia que a fatia 3 esperava a execução: reescrito.
    - (M4) os versos do outro no E2E podem passar sem conferir nada (a `Ruling:` da Task 5). **Final: Ruling:** fica como está: na semente do
      servidor de teste não há verso à mostra no Equipar da rodada 1, e um ponto com verso garantido pediria jogar até o Ataque; os versos por
      assento estão no `room-looks.test.tsx` — custo: o atributo `data-verso-deck` no navegador de verdade só é provado pelo E2E do treino
      (fatia 2), que usa o mesmo componente.
    - O revisor deixou de lado (e eu confirmo, sem mudança): o lobby não mostra as aparências (fora do plano); a entrada por link não mostra a
      aparência que vai (o plano diz que ela não tem o painel); a revanche não pega uma preferência trocada depois (H2); a posse (a loja); a aba
      sem armazenamento (o Início cria com a do painel em memória, a entrada por link cai no Cordel: pequeno, num caminho sem painel); a linha
      online regravada muito depois do fim (o assento só sai no lobby); "apelido inválido" para um `look` malformado (o plano pede nenhum
      código novo, e a web nunca o manda).
- **O merge:** "Sim, merge" (o autor, `decisoes.md` 2026-11-13 (1)): a `main` andou por fast-forward até `d885c84`, com as duas CI verdes
  no topo da branch. O push da `main` (`399e454`, com a memória) teve as duas CI verdes; o ledger da fatia foi apagado.
- **Armadilhas:**
  - Heredoc grande no Bash quebrou de novo (aspas e crases dentro): os scripts de edição foram gravados com a ferramenta de escrita e rodados
    com `node`.
  - O `pnpm check` leva uns 4 minutos nesta máquina (a web com cobertura é o grosso); dá para escrever os testes da tarefa seguinte num
    rascunho fora do repositório enquanto ele roda, e aplicar depois.
  - A identidade do nó do DOM não prova que o contexto do React não mudou (o React reaproveita o nó): para provar um memo, `renderHook` com
    `toBe`.
  - Na sala online de teste (`E2E_SEED=e2e2631`), a mão de Duda no Equipar da rodada 1 está toda montando: nenhum verso à mostra.

---

## 2026-11-12 (3): o plano da fatia 3 dos decks (o online)

- **Pedido:** "escreva o plano da fatia 3 dos decks" (o autor, 2026-11-12), na mesma sessão que executou a fatia 2 e fez o merge dela.
- **Feito:** o plano `docs/superpowers/plans/2026-11-12-decks-fatia-3.md`, na branch `feat/decks-fatia-3` (saída da `main` em `b6c2caf`),
  com os nomes lidos do código (o protocolo, o núcleo e o roteador do servidor, a `RoomApi`, o Início, a entrada por link, a `PlayTable`, o
  menu). Seis tarefas: o começo, o protocolo, o servidor, a entrada da web, a mesa online e o E2E com a documentação e o revisor. Sete
  escolhas para o autor (H1 a H7).
- **O que guiou o desenho:** os testes de hoje conferem o corpo exato do POST (`client.test.ts`), o assento gravado e o da mensagem com
  `toEqual` (`room.test.ts`) e as chamadas exatas da `RoomApi` (`home.test.tsx`, `room-gate.test.tsx`). Gravar ou mandar sempre a
  aparência os quebraria; por isso a H1: o padrão não vai pelo fio, o servidor só grava o que veio, e a mensagem só devolve o que o assento
  tem. Só dois testes mudam por desenho: a nota do Início (H4) e o do `NicknameBodySchema`, que vira `JoinRoomBodySchema`.
- **Armadilha para quem executa:** cada mensagem `room` traz um `seats` novo (presença, pronto, `woAt`); o memo das aparências da mesa tem
  de ser pelos textos do deck e da raça, ou o contexto de toda carta muda a cada mensagem de presença.
- **A aprovação:** "Aprovo como está" (`decisoes.md` 2026-11-12 (2)), com as H1 a H7 e as duas frases como recomendadas. A execução: "Em
  outra sessão", pela Task 0. Nada de código nesta.

---

## 2026-11-12 (2): a fatia 2 dos decks (o dono por lado), a execução

- **Pedido:** "execute o plano da fatia 2 dos decks" (o autor, 2026-11-12), numa sessão nova do Claude Code. O plano
  `docs/superpowers/plans/2026-11-12-decks-fatia-2.md`, aprovado com as G1 a G8 (`decisoes.md` 2026-11-12 (1)). Inline
  (`superpowers:executing-plans`), tarefa por tarefa, teste primeiro, na branch `feat/decks-fatia-2`; o revisor novo, num subagente, no fim
  (G8). A Devastação no celular segue sem ordem de conserto: a fatia vai pela G7.
- **Andamento** (uma linha por tarefa, com os commits e as `Ruling:`):
  - **Task 0 (o começo): feita.** A `main` não andou (`2f2aa51`); a aprovação está no `decisoes.md`; nada sem commit além do
    `.claude/` e do `jogar-treino.bat` do autor. `pnpm check` verde (web: 2697 testes; JS inicial 182,7 KB). **Armadilha:** a primeira
    rodada caiu no vitest da web com um "Failed" seco, sem nenhum teste vermelho; sozinha, a web passou inteira, e a segunda rodada do
    `pnpm check` também. Se voltar, rode a web sozinha antes de caçar um teste.
  - **Task 1 (os 8 Minor da fatia 1, G5): feita** (`31791b2`; `pnpm check` verde, web 2710 testes, JS inicial 183,0 KB; o E2E
    `looks.spec.ts` 3 de 3; o smoke reprova à mão um nome de `.webp` no JS inicial e um `.webp` no `index.html`; um controle temporário
    provou que o filtro do E2E do tutorial pega o `font-*.css`, os `.webp` e a Cinzel no treino). O cache síncrono num módulo à parte,
    `src/looks/ready.ts` (`readyPack`), que o `loadPack` preenche e o `load.ts` reexporta; a promessa rejeitada sai do mapa e o pedido
    seguinte tenta de novo (muda a `Ruling:` da Task 3 da fatia 1, como a G5 manda); `resetPacks(fake?)` só para os testes. O provedor lê o
    pronto a cada desenho (o que nasce depois do pacote e a troca para um deck já carregado não passam pelo cordel). `requestLook` (no
    `LooksProvider.tsx`) pede os pacotes no `Training`, junto com o módulo da sala, e no `ReplayScreen`, ao achar a partida. O seletor lembra
    a raça ao passar pelo Cordel e liga a linha da trava ao grupo Coringa (`aria-describedby`). O smoke lê os nomes de `src/looks/*/*.webp`;
    o E2E do tutorial confere as requisições (`networkidle`) em vez de esperar 500 ms; a sala online confere o console. Testes novos em
    `looks-catalog`, `card-art`, `look-choice`, `end-and-menu`, `training` e `replay-prefetch.test.tsx` (novo: o visualizador trocado por
    um vazio, para o pedido só poder vir da tela). **Ruling:** o `readyPack` mora no `ready.ts`, e o provedor só importa `loadPack` do
    `load.ts`, porque o `training-looks-fail.test.tsx` troca o `load.ts` inteiro por um mock com só o `loadPack` (o vitest lança na exportação
    ausente) e o plano manda não mexer nesse teste — custo: um módulo minúsculo a mais. **Ruling:** o commit vai antes do `pnpm check`
    completo (como na fatia 1), para o estado ficar commitado antes do job longo; o pre-commit já roda lint, typecheck e os testes
    relacionados. **Ruling:** o Minor 8 é só teste (passou de primeira: não havia erro, faltava a conferência). **Ruling:** o pedido do
    `ReplayScreen` fica no `load()` (o inicializador do estado, antes de a mesa desenhar): num efeito da tela ele viria depois do efeito do
    provedor (os filhos rodam primeiro) e não adiantaria nada — custo: um efeito idempotente durante o desenho.
  - **Task 2 (o modelo: o bot e a partida guardada): feita.** `botLook` em `model/looks.ts` (G1: Cordel → Cordel + Bufão; Bestiário ↔
    Celestial, sempre com o Egípcio; sempre um objeto novo) e `PastGame.looks?: { me, opponent }` (`PastLooks`) no `past-games.ts`: lido com
    `normalizeLook` em cada lado quando é objeto; fora disso o campo fica de fora e a linha vale (nunca a derruba). O `attachReplay` passa pelo
    mesmo `parsePastGame` e guarda o campo. Testes novos em `looks.test.ts` (as seis aparências) e `past-games.test.ts`; modelo 1256 testes.
  - **Task 3 (o contexto: os donos, a zona e o retrato): feita.** O `LooksValue` ganhou `viewer` (a de quem olha), `owners` e `portraits`;
    o `look` continua sendo a do lugar, que o `useCardArt` lê como antes. `useLook()` e `usePortrait()` no `looks-context.ts`. O
    `LooksProvider` recebe `owners` (estável: quem chama memoiza) e pede a união dos pacotes de todos (em texto, ordenada, uma vez cada); o
    `LookZone owner` não pede nada, não põe nó no DOM e, numa zona dentro de outra, veste o próprio dono (cai na de quem olha, nunca na da zona
    de fora). Testes em `look-zone.test.tsx` (novo) e no `looks-catalog`. **Ruling:** sem `loadPortrait`: o retrato chega no próprio `import()`
    do pacote de raça (`m.portrait`, o caminho que o plano deixa escolher), fica no `ready.ts` (`readyPortrait`) e é aquecido com as imagens —
    uma função só para o teste chamar seria código morto; custo: se um dia o retrato precisar chegar sem o pacote da raça, ela volta.
  - **Task 4 (a mesa: cada lado com o seu dono): feita.** Um `LookZone` em volta de cada `PlayerField` (`Table.tsx`) e de cada lado do
    placar (`FightHud.tsx`, com o `PortraitFace`: o Anúbis, `img` decorativo `size-[82%] object-cover`, ou o `<Coringa>`); o `CardBack` lê
    `BACK_CLASS[deck]` (`catalog.ts`) e ganha `data-verso-deck` fora do Cordel; o momento (`Moment.tsx`) fica no `LookZone` de quem jogou, e o
    verso que vira (`MomentBack`) leva o deck dele (G6; as cores no `styles.css`, `.momento-verso[data-verso-deck]`); as cópias da Devastação
    (o dono da fileira) e da Ressurreição (quem ressuscita) também. A `PlayTable` calcula as aparências (`useTableLooks`, memoizado pelo
    conteúdo: o `botLook` devolve objeto novo) e passa `owners` ao provedor e as aparências ao `useRecordPastGame` (novo parâmetro `looks`). O
    `Training` também pede os pacotes do bot. Testes: `table-looks.test.tsx` (novo: os dois lados, os versos, os retratos, o padrão sem nenhum
    pacote pedido, a troca no menu sem remontar, o Roubo, o momento, as cenas, o tutorial e o online em cordel, o axe), a gravação no
    `past-games-record.test.tsx`, o pedido do bot no `training.test.tsx`, a zona sem dono no `look-zone.test.tsx`. Web: 2753 testes; **nenhum
    teste existente mudou** (os da troca no menu da fatia 1 seguem verdes). **Ruling:** o treino em Cordel não grava `looks` (só com um deck de
    arte): um teste de hoje compara a linha inteira do treino, e sem `looks` o replay já é Cordel dos dois lados (o mesmo que o bot em Cordel
    da G1) — custo: uma partida de treino em Cordel não se distingue de uma de antes da fatia 2, o que não muda nada na tela. **Ruling:** o
    `data-verso-deck` só existe fora do Cordel (o DOM do padrão fica o de hoje). **Ruling:** o `LookZone` aceita `owner={null}` (o evento sem
    dono, a Devastação sem campo): o lugar fica como está, sem duplicar o bloco das cópias — custo: nenhum. **Ruling:** as cores do verso
    (Bestiário `#2b1640`/`#4a2a6b`, Celestial `#14305c`/`#2c5a96`, o fio `#d9b25a`) e o retrato a 82% se conferem nas fotos da Task 6.
    `pnpm check` verde depois dela (web 2753; JS inicial 183,9 KB).
  - **Task 5 (o replay com as aparências gravadas, G3): feita** (a medição da Ressurreição com
    `MEDIR_APARENCIA=bestiario:egipcio/celestial:egipcio` passa nas duas larguras, com as imagens carregadas). **Achado ao rodar a medição
    (um defeito da Task 1):** a primeira rodada falhou na espera pelas imagens. A causa: o pedido adiantado do `ReplayScreen` resolvia
    **depois** do desenho do provedor e **antes** do efeito dele; o efeito via o `readyPack` e pulava o pacote, e o `useMemo` ficava com a
    lista de antes, sem arte, para sempre. No jsdom o `act` roda o efeito colado ao desenho, e nenhum teste pegava. Conserto: o efeito sempre
    passa pelo `loadPack(...).then` (o pacote pronto resolve logo e acorda o desenho); o teste novo (`look-zone.test.tsx`, "a corrida…") deixa
    o pacote pronto durante o desenho de um filho e falhava antes. **Armadilha:** um estado de módulo lido no desenho precisa de um gatilho
    de estado do React para cada mudança; "já está pronto, então pulo" esquece o intervalo entre o desenho e o efeito. O `ReplayViewer` veste
    `game.looks` (`replayLooks`: o seu lado e o lugar de quem olha com o `me`, o do oponente com o `opponent`; sem `looks`, Cordel dos dois
    lados) e não lê mais a preferência; o `ReplayScreen` pede os pacotes das gravadas. O `medir-cena.ts` grava `looks` na primeira partida da
    fixture (`MEDIR_APARENCIA=bestiario:egipcio/celestial:egipcio`; sem barra, a mesma dos dois lados; o prefixo troca `:` e `/` por `-`), e
    não mais o `coringa:prefs`. Testes: três casos novos no `replay-screen.test.tsx` (os dois lados e o Equipar, a preferência que não entra,
    a partida sem `looks` em Cordel) e o `replay-prefetch.test.tsx` pelas gravadas. **O teste que mudou por desenho (G3):** o caso da F4
    ("com a preferência fantasy, o replay mostra as cartas com arte") passou a gravar `looks` na partida em vez da preferência, e confere o
    mesmo.
  - **Task 6 (smoke, E2E, fotos, medição, documentação): feita, menos o `pnpm e2e` inteiro e o revisor.** O smoke: JS inicial 182,7 KB na
    `main` → 183,8 KB. O `e2e/looks.spec.ts` ganhou o bot no treino (os versos da Celestial, os dois retratos do Anúbis carregados, as
    fileiras de cada lado depois da revelação, o axe) e o replay da `especiais` com `looks` gravado, no PC e a 360, sem rolar de lado: 6 de 6.
    As fotos em `.superpowers/fotos-decks-fatia-2/` (nesta máquina, fora do git): nada ilegível, nenhum ajuste. **A medição G7**
    (`notas/medicao-decks-fatia-2.md`): a primeira rodada deu +3 na troca de mão; a segunda isolou o retrato (~1 quadro/s no PC, nada no
    celular); a `main` e a branch medidas na mesma sessão **passam nas quatro** (a perda cresce −1, 0, +2 e +2). O `CLAUDE.md` (o item
    "Aparências") e a §16 da spec. **Ruling:** a A/B foi feita trocando o checkout para a `main` (`git checkout --detach 2f2aa51`) com os
    documentos sem commit guardados no `stash`, e não num worktree novo: o `node_modules` é o mesmo (a fatia não muda dependência) e um
    worktree pediria um `pnpm install` com a config quebrada do pnpm desta máquina — custo: nenhum (o script volta à branch e devolve o stash).
    **Armadilha:** na medição a CPU desta máquina variou o Cordel de 53 a 59 entre rodadas; com a tolerância de 2, só a A/B na mesma sessão
    decide. `pnpm e2e` inteiro: 113 passaram, 4 pulados. A branch subiu em `5c16dff` (o pre-push verde).
  - **A revisão da branch inteira (G8; subagente novo, Opus, `2f2aa51..5c16dff`): "pronto para merge: sim"** — nenhum Critical nem
    Important, 6 Minor. Como o Step 8 do plano manda, entraram nesta branch, cada um com o teste:
    - (M4, o de mais efeito) depois de uma falha passageira, a mesa podia ficar em Cordel enquanto a amostra do menu, que pediu de novo, já
      mostrava a arte. O `ready.ts` virou uma loja assinável (`readyState`, `subscribeReady`), e o provedor a lê com `useSyncExternalStore`:
      sem o `useState` de antes, todo pacote que chega acorda a mesa, também no intervalo entre o desenho e o efeito (a corrida da Task 5
      fica coberta pelo mesmo caminho). Teste "a falha passageira" (`look-zone.test.tsx`): vermelho antes.
    - (M1) a figura da cena rara (o painel de reserva) vestia a aparência de quem olha; a §3 manda as cenas em cordel. Ela ganhou o contexto
      sem aparência (`CORDEL_LOOKS`, no `looks-context.ts`). Teste no `table-looks.test.tsx`: vermelho antes.
    - (M2) o teste do Roubo mudava o id da carta (os ids do fixture são por posição) e não provava nada: agora a mesma carta (o mesmo id) sai
      do seu campo e entra no do bot. Passou de primeira (o comportamento já estava certo; faltava a prova).
    - (M3) o teste do replay podia não conferir nada: agora exige cartas no Equipar e confere o cemitério numa rodada que o tem.
    - (M5) as cores do verso moravam em dois lugares: agora em variáveis do `styles.css` (`--verso-*`), que o `BACK_CLASS` e o
      `.momento-verso` usam (teste no `looks-catalog`: vermelho antes); e a Ressurreição usa `owner={null}` em vez do resto `props.me`.
    - (M6) o `estado.md` atualizado.
    - **Deixado ao autor pelo revisor:** o commit da Task 1 foi antes do `pnpm check` completo (a `Ruling:` da Task 1), contra o texto do
      plano e do `CLAUDE.md` ("`pnpm check` antes de cada commit"); o pre-commit rodou a versão rápida, o check completo passou logo depois, e
      o squash apaga esses commits. Vai na mensagem final como desvio.
  - **2026-11-12, o merge ("sim"):** com as duas CI verdes em `bb186ef` (o topo da branch, com as correções da revisão), fast-forward
    da `main` e push (o pre-push com o `pnpm check`). A CI da `main` passou em `56efcbc` (`check` e `e2e`), e o ledger
    `.superpowers/sdd/2026-11-12-decks-fatia-2/` foi apagado (as `Ruling:` estão aqui); as fotos ficam em
    `.superpowers/fotos-decks-fatia-2/`. Ao fechar, a descrição da Task 5 (o replay), que tinha ido parar no fim desta entrada, voltou ao
    item dela.

---

## 2026-11-12 (1): a Devastação com arte medida, e o plano da fatia 2 dos decks

- **Pedido:** depois do merge da fatia 1, "ok, prossiga" (o autor). Lido como o próximo passo da Fila que não depende dele: medir a
  Devastação com arte (o "Para o plano da 2") e escrever o plano da fatia 2 para ele aprovar. Branch `feat/decks-fatia-2`, saída da `main`
  em `2f2aa51`. Nada de código de produção.
- **A medição** (na tomada, `notas/medicao-decks-fatia-1.md`, seção "Antes da fatia 2"): a Devastação (210→211) com arte fica em 46 e 47
  quadros/s a 360, contra 55 do Cordel; no PC, 50 e 51 contra 50. **A F5 não passa nessa cena no celular.** A camada própria
  (`will-change: transform` no invólucro da imagem) foi medida e não mudou nada (desfeita, sem commit). O perfil: o compositor desenha o
  mesmo número de quadros; a thread principal perde (140 → 114 quadros); a rasterização e a decodificação quase não mudam; o recálculo de
  estilo dobra nos recálculos grandes (a mesa inteira, ~70 vezes na cena, até 59 elementos no Cordel e ~230 na arte). Commit `925879c`; a §15
  da spec e o `estado.md` dizem que o "passa" da fatia 1 vale só para a troca de mão.
- **O plano** (`docs/superpowers/plans/2026-11-12-decks-fatia-2.md`): o dono por lado com um provedor só e o `LookZone` sem DOM; o bot; o
  verso por deck; o retrato por raça; o momento e as cópias das cenas; a partida guardada com `looks` e o replay com as gravadas; os 8 Minor
  da fatia 1. Oito escolhas (G1 a G8) para o autor. **Ruling:** a Devastação no celular não entra no plano: é defeito da fatia 1, já na
  `main`, e vai ao autor como achado à parte (a fatia 2 não põe mais carta com arte na mesa). **Ruling:** a regra do bot da spec (§7.1, o
  deck seguinte) punha o Bestiário no treino padrão e quebrava a §0; o plano recomenda o bot em Cordel quando você está em Cordel (G1).
- **A revisão do plano** (um conselheiro, antes de subir): o portão da G7 comparava números absolutos de outro dia, com ruído maior que a
  tolerância, e virou relativo (a perda da arte para o Cordel na mesma medição contra a da `main`); duas linhas para quem executa (por que os
  testes da troca no menu seguem verdes; o cache síncrono do `loadPack` vaza entre testes). Commit `c33550a`.
- **A aprovação:** "Aprovo como está mas irei implementar em outra sessão" (o autor; `decisoes.md` 2026-11-12 (1)). O plano e a spec dizem
  que estão aprovados e o que substituem (a §7.1 da spec, pela G1); o `estado.md` traz o próximo passo exato e o que não pode regredir. A
  Devastação ficou sem ordem de conserto: segue em "Esperando o autor", e a fatia 2 vai pela G7.
- **Fora do git, nesta máquina:** os dois rastros da Devastação a 360 (Cordel e Bestiário + Egípcio) e os scripts que os leram
  (`trace-sum.mjs`, a soma por evento; `frames.mjs`, os quadros; `invalida.mjs`, os elementos por recálculo e quem invalida), em
  `.superpowers/perfil-devastacao-2026-11-12/`, para o bloco do conserto, se o autor o pedir.
- **Armadilhas:** o rastro do `medir-cena.ts` (`MEDIR_PERFIL=1`) já traz o `invalidationTracking` e a contagem de elementos de cada
  `UpdateLayoutTree` (`args.elementCount`): dá para achar o recálculo grande sem outra medição. Os quadros do compositor (`DrawFrame`) e os da
  thread principal (`BeginMainThreadFrame`) se contam à parte; a medida do projeto conta os da thread principal (`requestAnimationFrame`).

---

## 2026-11-11 (1): a fatia 1 dos decks e raças (a carta com arte e o seletor, no treino)

- **Pedido:** o plano `docs/superpowers/plans/2026-11-11-decks-fatia-1.md` aprovado com as F1 a F7 (`decisoes.md` 2026-11-11 (3)); depois do
  bloco C na `main`, "prossiga por aqui" (o autor, 2026-11-11) levou à execução: no checkout principal, branch `feat/decks-fatia-1` (saída
  de `fe9a507`), tarefa por tarefa, teste primeiro, com um revisor novo no fim (F7).
- **Pre-flight:** as interfaces entre as tarefas batem (T1 → T2 → T3/T4 → T5). **Ruling:** a spec §6 queria o seletor apagado no online e
  a §5 um `art.css`; vale o plano (a F1 tira o seletor do online, e a fonte vai num `font.css`), aprovado depois da spec.
- **Andamento** (uma linha por tarefa, com os commits e as escolhas da execução):
  - **Task 0 (a branch, o que estava sem commit, a fonte): feita.** Commits de entrada `a159c3b` (as decisões), `dcaa266` (a spec, a folha,
    a bíblia e o plano) e `2f5e0da` (23 SVG, o `LEIAME.md` e 24 WebP; nenhum dado pessoal neles); a Cinzel 5.3.0 (SIL OFL 1.1) no
    `packages/web/package.json` e no `LICENSES.md`. **Armadilha:** o `config.yaml` global do pnpm desta máquina
    (`%LOCALAPPDATA%\pnpm\config\config.yaml`) tem `storeDir: D:.pnpm-store`, sem a barra, e o `pnpm add` falha com `ENOENT` (`mkdir
    'D:\andr3\jogo-coringa\D:.pnpm-store\v11'`); o `node_modules` foi instalado com `D:\.pnpm-store\v11`. Até o autor corrigir a config,
    passe `--store-dir 'D:\.pnpm-store'`. As DLLs do paliativo do `workerd` sobreviveram ao `pnpm add`. **Ruling:** o commit da fonte
    foi antes do `pnpm check` (o plano tem o contrário), para o estado ficar commitado antes do job longo (regra 2); o pre-commit já roda
    o lint e o typecheck. **Armadilha:** o `node_modules` desta máquina estava fora do lockfile (o `tough-cookie` ligado ao `tldts@7.4.19`
    e o `jsdom` ao `undici@7.30.1`, quando o lockfile pede 7.4.18 e 7.29.1); o `pnpm add` apagou as pastas órfãs e os 52 arquivos de teste
    `ui` da web pararam com `Cannot find module 'tldts'`. O `pnpm install --frozen-lockfile` (até com `--force`) diz "Already up to date" e
    não refaz o link: os dois links foram refeitos à mão (junção do PowerShell) para as versões do lockfile, e o `pnpm check` passou. Se
    voltar: `find node_modules/.pnpm -mindepth 3 -maxdepth 4 -type l ! -exec test -e {} \; -print` acha os links quebrados.
  - **Task 1 (a aparência no protocolo): feita.** `packages/protocol/src/looks.ts` (`DECK_IDS`, `RACE_IDS`, `Look`, `DEFAULT_LOOK`
    congelado, `normalizeLook`) e o `export` no `index.ts`; 18 testes, cobertura de 100% no arquivo. **Ruling:** `DEFAULT_LOOK` tem o tipo
    `Readonly<Look>` (o plano diz `Look`, congelado): o tipo diz o que o `Object.freeze` faz, e um `Readonly<Look>` entra onde se pede um
    `Look`. **Ruling:** um id que só existe no protótipo (`toString`) não vale (o teste a mais), porque a busca é na lista, não por chave.
  - **Task 2 (o modelo da web e as preferências): feita.** `packages/web/src/model/looks.ts` (`tierOf`, `PackId`, `ArtKey`, `artOf`,
    `packsOf`, `AURA`, `RACE_TIER`) e `Prefs.look?` no `storage.ts` (`'look' in value` → `normalizeLook`; sem o campo, ausente; o
    `DEFAULT_PREFS` igual). Nenhum teste existente mudou: casos novos num `describe` à parte do `storage.test.ts`. Web: 2646 testes,
    cobertura do modelo 98,98% de linhas. **Ruling:** `tierOf` recebe `Rank` (o plano diz `number`): quem chama passa `card.value`, e o
    tipo barra um 11 — custo: um `as Rank` se alguém tiver um `number` solto. **Ruling:** um `look` guardado como `null` ou texto conta
    como "tem o campo" e sai normalizado no padrão (o plano fala de "inválido"; `null` é inválido).
  - **Task 3 (o catálogo e os pacotes da arte): feita.** `src/looks/catalog.ts` (`DECK_LABEL`, `RACE_LABEL`, `ART_META` com os 23 nomes e
    cores da spec), um `index.ts` por pacote (`import.meta.glob` com `?url` e a tabela arquivo → chave; o `egipcio` exporta o `portrait`),
    `load.ts` (`loadPack`: o pacote e o `font.css` por `import()`, a promessa guardada, o aquecimento com `new Image()` só onde existe) e o
    `--font-cinzel` no `@theme`. O teste ficou no projeto `model` (o Node): o `import.meta.glob` com `?url` e o `import()` do CSS funcionam
    lá. **Ruling:** um `src/looks/pack-urls.ts` (`urlsByKey`) a mais, que os três pacotes dividem, em vez de repetir o laço em cada um —
    custo: um chunk minúsculo a mais. **Ruling:** a promessa rejeitada do `loadPack` também fica guardada (a F3 diz "para sempre" no
    cordel) — custo: sem nova tentativa até recarregar. **Armadilha:** a chave `'10'` é índice inteiro, e o `Object.values` a põe antes de
    `'02'`: leia o catálogo pela lista das chaves, nunca pela ordem do objeto.
  - **Task 4 (a face com arte): feita.** `ui/cards/looks-context.ts` (`LooksContext`, `useCardArt`), `LooksProvider.tsx` (pede os pacotes de
    `packsOf`, rende os filhos sempre, engole a rejeição: F3; com `packs` de fora não pede nada) e `ArtFace.tsx`; o `Card.tsx` só escolhe a
    face e o fundo (`bg-tinta` com arte). 16 testes novos em `test/ui/card-art.test.tsx`; nenhum teste existente mudou (2671 na web).
    **Ruling:** o `Suit` ganhou um `style` opcional, para a cor de metal ir no próprio SVG pelo CSSOM (a forma não muda) — custo: uma prop
    a mais num componente comum. **Ruling:** o anel é uma borda de 1,5 px com a cor no `style` (sem `box-shadow`); a aura é o único
    `box-shadow`, num filho, com a cor `rgba` tirada do metal. **Ruling:** o véu de ouro da quadra fica dentro do invólucro da imagem, por
    baixo do valor e do naipe, que seguem no metal. **Ruling:** o traço do naipe é de 2,5 unidades do `viewBox` 24, por fora
    (`paint-order: stroke`); o contorno do número, 1 px de tinta a 90% nas quatro direções mais um halo de 4 px — os dois se conferem nas
    fotos da Task 6. **Ruling:** o teste também barra, na carta com arte, a segunda classe `bg-*` e o `shadow-*` na raiz (as duas regras
    da carta de hoje).
  - **Task 5 (o seletor, o treino e o replay): feita.** `ui/LookChoice.tsx` (os grupos Deck e Coringa no molde do `HpChoice`, a trava do
    Cordel com a linha `LOOK_LOCK_NOTE`, a amostra 3, 10 e K num `LooksProvider` próprio), os textos no `copy.ts`, o painel "Aparência"
    no `Home` (antes de "Preferências", com a nota da F1), o seletor no `GameMenu` (prop `look`, só no treino fora do tutorial), o
    `LooksProvider` no `PlayTable` e no `ReplayViewer` (F4). Testes novos em `look-choice.test.tsx`, `home`, `end-and-menu`, `training`,
    `tutorial`, `replay-screen` e `training-looks-fail.test.tsx`; nenhum caso existente mudou (só imports acrescentados). **Ruling:** o
    provedor envolve o `Stage` inteiro, e não só o `PlayTableView` (o plano): o `MomentLayer` e o `Leaving` (as cópias das cartas que
    saem) moram no `Stage`, fora do `PlayTableView`, e ficariam de cordel com a mesa em arte — custo: nenhum visto (as cenas que desenham o
    Coringa não usam a `Card`). **Ruling:** o `LookChoice` ganhou `packs?` (repassado ao provedor da amostra), para o teste da amostra não
    depender do `import()`. **Ruling:** a amostra é `aria-hidden` (decorativa; a escolha está nos rádios). **Ruling:** o caso do pacote
    que falha (F3) mora num arquivo à parte, `training-looks-fail.test.tsx`, porque o `vi.mock` vale para o arquivo inteiro (como os
    `app-chunk-*-fails`). **Ruling:** "sem tocar batida" se confere pelo mesmo nó da mesa e da carta e pelo `seq` igual da sala; a sala
    online com a preferência fantasy é a do `mount` do `end-and-menu` (a `PlayTable` sem `training`).
  - **Task 6 (smoke, E2E, fotos, medição, documentação): feita, menos o E2E inteiro, o push e o revisor.** O smoke confere os três pacotes
    fora do inicial (cada um num chunk), nenhum `.webp` no `index.html` e a Cinzel só num CSS de chunk (conferido também que ele reprova um
    `.webp` posto no `index.html`). O `e2e/looks.spec.ts` (na lista do Playwright): o painel por teclado e guardado, a mesa do treino com as
    imagens carregadas sob a CSP, sem rolar de lado a 360 e a 1366 × 657, o axe, a troca no menu, a trava do Cordel e o tutorial em cordel —
    3 de 3. O `medir-cena.ts` ganhou `MEDIR_APARENCIA` e `MEDIR_APARENCIAS` + `MEDIR_REPETICOES` (as aparências alternadas numa build só). A
    medição e o veredito da F5 (passa: 50 e 55 quadros/s com arte contra 56 e 58 do Cordel na troca de mão) em `notas/medicao-decks-fatia-1.md`;
    a spec ganhou a §15; o `CLAUDE.md`, o item "Aparências". As fotos (20 + 8 dos campos) estão em `.superpowers/fotos-decks-fatia-1/`, nesta
    máquina, fora do git: o valor e o naipe se leem em todas, inclusive no Pégaso, no Arcanjo e nas minis de 30 px. **Ruling:** a medição
    foi também na mesa mais cheia da fixture (236→237), e não só no exemplo do cabeçalho (a Ressurreição, rodada 7), que fica em 60 nas três.
    **Ruling:** as saídas 1 e 2 entraram (`2eeba72`) e saíram (`2c47f24`): na medição limpa não mudaram nada, e uma saída só fica se ajudar.
    **Ruling:** o `.check()` do Playwright no rádio `sr-only` esbarra no rótulo; o E2E clica no rótulo. **Armadilha:** na bateria esta máquina
    não mede (o mesmo Cordel deu 13 e 26 quadros/s); meça na tomada, alternando as aparências na mesma build. **Armadilha:** a sonda do GIF de
    1 px no lugar da imagem não serve de controle (troca um desenho de imagem por outro mais caro). **Armadilha:** o Playwright e o pre-commit
    leem tudo em `packages/web/e2e/` e `*.config.ts` (lint e typecheck): spec temporário fica fora do repositório entre as execuções.
    `pnpm e2e` inteiro: 110 passed, 4 skipped. A branch subiu em `699e647` (o pre-push com o `pnpm check` verde).
  - **Revisão da branch inteira (subagente novo, Opus, `fe9a507..699e647`): "com correções"** — nenhum Critical, 3 Important, 8 Minor.
    Corrigido em `0ac348d`, cada um com o teste que falhou antes (web: 2697 testes):
    - (Important) a aura, um filho posicionado, pintava por cima do `box-shadow` da raiz (o anel ouro de alvo e de seleção, o halo do
      foco) e da seta da frente: num 10 dourado, a carta-alvo parecia comum. Agora não há aura com o anel ouro (`ringed`), ela some no
      `:focus-visible` (a carta é o `group/carta`), e a seta vem depois da face com arte. Fotos conferidas: a selecionada e a focada.
    - (Important) com o fundo de tinta até a borda, o rascunho com arte perdia o tracejado: `bg-clip-padding` no ramo com arte. Foto
      conferida.
    - (Important) as cartas da amostra do seletor tinham `data-card-id`, e o teste da troca no treino podia passar só por elas: a amostra
      agora é de cópias (`ghost`).
    - **Adiados (Minor):** o cordel pisca um quadro antes da arte (cada provedor começa vazio; na troca de deck, arte → cordel → arte); um
      JSDoc órfão acima do `chosenLook` no `PlayTable.tsx`; a promessa rejeitada do `loadPack` sem teste (e uma falha passageira desliga a arte
      até recarregar); o negativo do tutorial no E2E espera 500 ms em vez de conferir as requisições; o smoke procura três nomes de `.webp`, não
      qualquer `.webp` (o retrato do Anúbis da fatia 2 escaparia); passar pelo Cordel desfaz a escolha de raça; a linha da trava não está ligada
      ao grupo Coringa (`aria-describedby`); o teste da sala online não espia o console.
    - **O que o revisor deixou de lado, e a decisão:** **Ruling:** a leitura a 360 fica com as fotos, que conferi. **Ruling:** a beleza da aura é
      do autor. **Ruling:** as fatias 2 e 3, a §6 apagada e o `art.css` ficam como o plano mandou. **Ruling:** a nota "Por enquanto vale no
      treino." não cita o replay (o replay de partida online também veste a arte, F4): o texto é do plano; fica, e vai ao autor. **Ruling:** a
      Cinzel chega depois do primeiro desenho (`font-display: swap`): um quadro com a serifa de reserva, aceitável. **Ruling:** o Início de quem
      já escolheu um deck fantasy pede o pacote e aquece as imagens, como a §5 manda. **Ruling:** a F5 passou com margem zero no PC: fica
      registrado e vai ao autor como recomendação para a fatia 2 (medir a Devastação com arte, ter pronta a imagem de 208 px ou a camada
      própria). **Ruling:** o clone do fantasma do arrasto leva o `style` com o metal; os E2E do arrasto já clonam cartas com `style` sob a CSP
      sem erro, então fica.
  - **2026-11-12, o merge ("Sim, merge"):** com as duas CI verdes em `bf6c335` (o topo da branch, com as correções), fast-forward da `main` e
    push (o pre-push com o `pnpm check` verde); a CI da `main` também passou. O ledger `.superpowers/sdd/2026-11-11-decks-fatia-1` foi apagado
    (os rulings e os Minor estão aqui); as fotos ficam em `.superpowers/fotos-decks-fatia-1/`.

---

## 2026-11-08 (1): o bloco C, o poder que cresce (pontos 10, 11 e 13)

- **Pedido:** "Sim, escreva" levou ao plano (`docs/superpowers/plans/2026-11-08-playtest-bloco-c.md`), e "Aprovo como está" (`decisoes.md`
  2026-11-08 (2)) à execução: aqui mesmo, tarefa por tarefa, na branch `feat/playtest-bloco-c`, com um revisor novo no fim.
- **Andamento** (uma linha por tarefa, com os commits e as escolhas da execução):
  - **Task 1 (o motor conta a sequência): feita.** `InitiativeDecision.streak` (obrigatório), `changed ? 1 : (anterior?.streak ?? 0) + 1`;
    o empate soma. `STATE_SCHEMA` 6. O motor inteiro passou sem `-u` (os golden e os `RULES_DIGESTS` iguais), e o digest do texto do
    `pnpm play` também: nenhuma partida mudou, `RULES_VERSION` fica. Os `InitiativeDecided` literais dos testes da web ganharam
    `streak: 1`, e a `scenarioAt` aceita `lastInitiative.streak` (padrão 1).
  - **Task 2 (o relógio e a aura da iniciativa): feita.** O `aura.ts` foi para `ui/anim/` (a mesa não puxa o chunk das cenas);
    `table-clock.ts` (um intervalo só para as auras que fervem, um agendador só para os raios, ≤ 3 por segundo na mesa inteira);
    `initiative-aura.ts` (os níveis 3, 5 e 10 e o selo a partir de 2); `InitiativeAura.tsx` (as camadas de cada nível, as brasas, os raios
    da super aura, o sopro) e o `StreakSeal` (o "×N" `aria-hidden` e a frase do leitor de tela); `useInitiativeAura` no `FightHud`, pelo
    caminho da espada. **Ruling:** o relógio entrega o quadro por chamada (`useAuraBoil(active, onFrame)`), não por estado (`useAuraFrame`
    do plano): a forma troca por atributo, fora do React, como nas cenas, e nada redesenha a cada 70 ms. **Ruling:** um invólucro em volta do
    retrato põe a aura atrás dele (vem antes) e o selo no canto de cima, por fora; a capa do retrato não fica coberta. **Ruling:** as brasas
    sobem a cada 2 quadros do relógio (140 ms, ~8 no ar), sem intervalo próprio. O teste do efeito da decisão ganhou o `streak`.
    **Achado na foto, consertado (`3fe5db3`):** posicionada, a aura cobria o nome e o começo da barra (no celular, o V de VOCÊ); o bloco do
    nome e da barra ficou posicionado e por cima. Foto da super aura em 1366 e 360: 58 a 59 quadros/s com a CPU 4×.
  - **Task 3 (os bônus em escala): feita.** `zoneLevel` (`model/zone-level.ts`, pela config e pelas marcas do motor), `ZonePower.tsx` (os
    raios entre J vizinhos no nível 2 e 3, a aura do Ataque Absoluto no 3, a muralha que respira atrás dos Q no 2, o escudo de ouro no 3) e o
    CSS das camadas das cartas (o aceso de ouro e de papel, o pulso verde dos K da cura e a brasa dos K da ameaça, só com opacidade). A lista
    das animações sem fim passou de 6 para 9, de propósito. **Ruling:** uma carta só nunca acende, nem com o limite em 2 (o nível 2 pede
    `max(2, limite − 1)`). **Ruling:** a camada de poder fica num invólucro posicionado em volta da lista (um filho não-`li` dentro do `ul`
    quebraria a lista para o leitor de tela). **Ruling (foto):** as cartas de todas as zonas ficam por cima das camadas de poder (`z-[1]`):
    a aura dos 4 J sobe até a Guarda de cima. Foto dos 4 J armados (`especiais.json`, 98→99): 57 quadros/s.
  - **Task 4 (a espada e o escudo de quem lidera): feita.** `lead-store.ts` (`leaderOf`, o `LeadProvider` em volta dos dois campos, sem nó no
    DOM; `useReportTotal` e `useLead`, com uma assinatura por tipo de fileira) e o `LeadFigure` da `Row` (o medalhão de ouro atrás da figura,
    sem mudar o espaço da coluna do total, com o brilho que passa e o sopro quando passa a liderar). A lista das animações sem fim foi a 10.
    **Ruling:** a fileira informa o total que mostra (`shownTotal`, o contado), e não o alvo (`total`): o alvo muda quando o passo chega, e a C7
    pede a troca no pouso e na batida do golpe. **Ruling:** o sopro não toca no primeiro desenho da mesa, só quando a liderança troca.
  - **Task 5 (E2E, fotos, medição, portão): feita.** `e2e/power.spec.ts` (na lista do Playwright), nas três telas, com os passos contados pelo
    motor (`especiais.json` 78, 99, 111, 161 e 174; `exodia-devastacao.json` 236→237, a troca de mão do Bot depois de 10 rodadas): 15 + o de
    layout, 18 de 18. Medição em `notas/medicao-bloco-c.md`: a mesa mais cheia a 50 e 55 quadros/s com a CPU 4× (a `main`: 53 e 55), os 4 J a 53
    e 55; a troca de mão a 42 e 48, como já estava na `main` (41 e 47, medida em seguida pondo a web da `main` no lugar e restaurando). A spec
    ganhou a §5.4 e a correção do protocolo (C1). Portão do Difícil, rodada 4: 69,0% e 81,5% (iguais às rodadas 1 e 3), p95 146 ms, aprovado.
    **Ruling:** o passo da troca de mão do plano (239→240) era outro: a troca é no 236→237 (contado com o motor). **Ruling:** a troca de mão
    abaixo de 50 quadros/s fica como achado para o autor, fora do bloco (a `main` já mede o mesmo). **Ruling:** o E2E do ouro passava por
    sorte (media no meio do sopro de entrada, com o `scale` abaixo de 1); medindo em repouso (o teste espera as animações do elemento), o
    medalhão do PC (anel de 6 px, 36 px) passava 1,5 px da fileira por cima e por baixo. O anel ficou 4 px no PC também (32 px, dentro dos 33
    px da linha do total), como no celular.
  - **Revisão da branch inteira (subagente novo, `792bd62..81697a6`): "com correções".** Corrigido, com teste antes:
    - (Critical, `f6cf1f9`) o `[data-muralha]` da respiração dos 3 Q pegava a muralha da cena da Defesa Absoluta (que já tinha esse
      atributo): ela pulsava durante a cena, até com movimento reduzido. A zona usa `data-muralha-zona`, e um teste barra o seletor antigo.
    - (Important, `2331e02`) o nível da zona saía da `view` crua: acendia quando o passo chegava, com a vaga da carta ainda voando contornada,
      e o escudo de ouro dos Q mudava antes da insígnia. O `useLandingHold` e o `withoutCards` foram para `ui/table/landing-hold.ts` (que
      tira também a Guarda); a zona conta só o que pousou, a Defesa Absoluta dela segue o `anim.insignia`, e a vaga em pouso
      (`data-pousando`) fica sem anel e sem raio.
    - (Minor, `972e890`) o ouro soprava no primeiro desenho (o armazém vazio até os efeitos): `useLead` devolve `null` até ter os dois
      totais, e o sopro só vale de `false` para `true`. Os testes que o plano pedia e faltavam: as auras param nas batidas (conferido
      quadro a quadro, que o relógio tem 4, e por mutação) e o ouro sem sopro com movimento reduzido.
    - (Minor, `6df073d`) no celular a aura dos 4 J cobria os títulos das zonas (foto do passo 99 em 360): o título fica por cima das
      camadas. O sopro da iniciativa tocava de novo ao desligar o movimento reduzido e deixava fumaça órfã. O comentário da folha.
    **Ruling:** o anel do arrasto com o `z-[1]` por carta ficou (fotos 4× da junta dos 2 K do Bot: os dois anéis já se fundem numa faixa
    só, com ou sem a mudança). **Ruling:** "a mesa mais cheia" medida foi a do plano (Task 5), sem os 4 J; nenhuma fixture tem os 4 J armados
    com sequência ≥ 5, então as duas auras de 3 camadas juntas não foram medidas: vai ao autor (`notas/medicao-bloco-c.md`). **Adiados
    (Minor):** as placas de estado ("Ataque Absoluto armado", "Cura passiva") ainda aparecem quando o passo chega, antes do pouso que acende
    a zona (tempo do bloco A); o texto do leitor de tela do selo fica antes do nome no seu lado ("3 rodadas seguidas…", depois "Você").
  - **2026-11-09 e 10, a passagem:** o autor aceitou a medição sem os 4 J (`decisoes.md` 2026-11-10 (1)). O `pnpm e2e` inteiro, aqui, deu
    101 passed mas saiu com código 1, sem teste falho listado (causa não vista). A segunda revisão, só das correções, foi interrompida pelo
    limite de uso. A branch subiu para a CI rodar; o que falta está no `estado.md`. A memória foi enxugada: o histórico do estado foi para
    `notas/playtest.md`, e o diário até 2026-11-02 (8) para `arquivo/diario-ate-2026-11-02.md`.
  - **2026-11-11, o fechamento ("continue o bloco C"):** a CI do topo (`75d35c8`) passou nos dois jobs, `check` e `e2e`: o "101 passed,
    código 1" do E2E local não se repetiu na CI e fica sem causa achada (a CI é o portão). A segunda revisão, só das correções
    (`81697a6..6df073d`), foi feita na sessão, lendo o diff, sem subagente: **nenhum Critical nem Important**. Conferido: o `null` do
    `useLead` só chega ao `LeadFigure`, que o trata como "não lidera"; os hooks novos das `Zones` vêm antes de qualquer retorno; a `Row`
    nunca põe a Guarda no `pending` (o `withoutCards` tirar a Guarda não muda o total dela); o `played` do sopro e a limpeza da fumaça; cada
    correção tem o teste dela. O único Minor (as placas de estado lendo a `view` crua) já estava nos adiados acima. **Armadilha:** a memória
    dos decks, sem commit, de outra conta (`decisoes.md` e `estado.md`), foi para um `git stash` durante o merge, para não entrar nos commits
    do bloco C, e voltou ao fim, como manda a Task 0 do plano `2026-11-11-decks-fatia-1.md`.

---

## 2026-11-07 (2): o bloco B, o golpe final (ponto 15)

- **Pedido:** "aprovado, prossiga." levou ao plano (`docs/superpowers/plans/2026-11-07-playtest-bloco-b.md`), e "Aprovo como está"
  (`decisoes.md` 2026-11-07 (3)) à execução: aqui mesmo, tarefa por tarefa, na branch `feat/playtest-bloco-b`, com um revisor novo no fim.
- **O plano, em uma linha por escolha:** sem folga no relógio (B1); o retrato racha em toda derrota pela vida (B2); 2,4 s de cena (B3);
  a inversão de 600 ms (B4); a faixa e o som do fim depois da cena (B5).
- **Andamento** (uma linha por tarefa, com os commits e as escolhas da execução):
  - **Task 1 (a batida): feita.** `FINAL_BLOW` na linha do tempo (o `DamageDealt` do vencedor, a batida não quieta mais perto antes do
    `GameOver` pela vida, só ao vivo), `SCENE_MOMENTS.FINAL_BLOW`, `FINAL_BLOW_MS` (2,4 s), `finalBlowTitle`, `finalBlowInfo` e o
    `sceneText`. **Ruling:** os testes que listam todas as cenas (`RARE_SCENE_MS`, a tabela do protocolo e `FIELD_SCENES`) mudaram de
    propósito; o da tabela do protocolo passou a comparar só as cenas com folga, e confere que o golpe final não está no `SCENE_MS` (B1).
  - **Task 2 (o retrato que racha): feita.** `defeatShown` (`effects.ts`) troca o `exodiaStage` no `defeated` do `Stage`; o `FightHud` racha
    na derrota pela vida e na Exódia (a W.O. não), e a vida a 0 e o `drained` seguem só da Exódia. O teste "o fim pela vida não racha
    retrato nenhum" virou "racha o de quem perdeu" (B2). **Ruling:** a batida fatal (a Exódia ou o golpe final) vale sozinha, sem exigir o
    `GameOver` na mesma linha do tempo: os testes antigos da Exódia emitem só o `Exodia` (o motor sempre emite os dois juntos).
  - **Task 3 (a cena): feita.** `ui/scenes/FinalBlow.tsx` (os halos na fileira de quem bate, o corte até o retrato, as faíscas, o `HitNumber`,
    o carimbo e os respingos), `CinemaBars` extraído do `SceneFrame` (as duas usam), `Stamp` com `text`, e o `blow` (`finalBlowInfo`) do
    `Stage` até a cena. **Ruling:** o afundar dos campos no `thudAt` usa `transform` no `[data-campos]`, como a Ressurreição; o `translate` é
    do tremor do palco no impacto (640 ms), e os dois não se cruzam. **Ruling:** o carimbo da derrota é de tinta, com letra de papel e sombra
    vermelha (o ouro fica com a vitória e os Absolutos). O teste do palco ("sem cortina, uma inversão") foi escrito depois da cena; ele falha
    com o golpe final fora das cenas sem cortina (conferido) e passa com ele.
  - **Task 4 (o som): feita.** A pista `golpe-final` (o sopro do corte em `cutAt`, o baque do impacto em `hitAt`, mais fundo que o golpe
    forte, e a batida do carimbo em `thudAt`), no lugar do `golpe-*` na batida da cena; a faixa do fim segue com `vitoria` ou `derrota` (B5).
    Não conferido de verdade: o ouvido (os testes conferem os instantes e os picos).
  - **Achado no caminho, consertado (`aa34530`):** o golpe que passa da vida que restava deixa o motor com vida negativa, e o placar mostrava
    "-118/500" no fim. **Ruling:** a vida mostrada (o número e o medidor) para em 0, na contagem e em repouso; o protótipo aprovado mostra 0.
    O teste antigo "o golpe que mata conta até a vida do motor, mesmo abaixo de 0" (de `f16057a`, uma escolha de execução, não do autor)
    mudou de propósito: o motivo dele era o salto do 0 à vida da `view` no fim, que não volta com o corte também em repouso.
  - **Task 5 (E2E, fotos e medição): feita.** Dois E2E novos em `e2e/scenes.spec.ts`, nos dois tamanhos: o seu golpe final na
    `especiais.json` (178→179: as tarjas sem cortina, a fileira acesa, o corte até o retrato do Bot, a inversão, "GOLPE FINAL!", o retrato
    dele rachado e a vida 0) e o do Bot na `absolutos.json` (99→100: "DERROTA", o corte até o seu retrato, e o toque pula para o retrato
    rachado e a vida 0); 22 de 22 no `scenes.spec.ts`. Medição e fotos em `notas/medicao-bloco-b.md`: 58 a 60 quadros/s com a CPU 4×, pico de
    21 partículas. **Ruling:** os E2E e as fotos usam 1366 × 768 e 360 × 640, os tamanhos do `scenes.spec.ts` e do `medir-cena.ts` (o plano
    dizia 1366 × 657, que é o tamanho do E2E de layout, e esta cena não passa por ele). A spec ganhou a §4.1 e a correção da folga (B1).
- **Revisão da branch inteira** (um subagente novo, só leitura, `8b6ee88..0927176`): pronta com correções; nenhum crítico, dois importantes,
  sete menores. O revisor concordou com as escolhas das Tasks 1 a 4 e com a vida em 0, e discordou da Ruling do 1366 × 768.
  - **Consertado (`9f97d6e`):** com movimento reduzido, a vida zerava no começo da cena, antes do corte (o retrato e o número só no
    impacto). Numa linha do tempo com golpe de cena (o golpe final, o Ataque Absoluto, o dano devolvido pelo Reflect), a vida agora salta
    quando o golpe acende. **Ruling:** vale para as três cenas com golpe, e não só a nova: a mesma informação no mesmo instante.
  - **Consertado (neste commit):** o E2E do golpe final roda também no PC baixo (1366 × 657), com o carimbo à vista e sem rolar de lado: 24
    de 24. A Ruling da Task 5 caiu: outras cenas também rodam nesse tamanho (`resurrection.spec.ts`, `moment.spec.ts`).
  - **Menores, para depois** (nenhum quebra a partida):
    - o corte em 0 encurta a descida da vida (77 de vida e 195 de dano: a barra chega a 0 em ~276 ms, não em 700); o conserto é cortar as
      pontas do tween no `useCountedLife`;
    - o retrato derrotado tem `transition: filter` (cinza), que já existia na Exódia e agora vale em toda derrota pela vida, junto da inversão;
    - no E2E, o toque do golpe do Bot vem depois do carimbo (o pulo na hora fica só no teste de unidade), e nada confere que a fileira de quem
      bate fica à vista no celular (só as fotos);
    - o afundar dos campos não é cancelado se a cena desmonta entre 1.040 e 1.200 ms;
    - com movimento reduzido, o corte aparece de uma vez, sem esmaecer;
    - o `attacker` repetido em `FinalBlow.tsx`, a §4 da spec ainda com "~2,2 s" (a §4.1 diz 2,4 s), e dois comentários antigos (o do
      `PortraitCrack` e o do `drained`);
    - sem teste o painel de reserva do golpe final (o chunk das cenas ainda não carregado) e a posição das tarjas.
  - **O que o revisor deixou de julgar** (fica como está): o corte inteiro por um quadro antes de crescer, os halos que não acompanham o
    tremor, o chunk das cenas que chega no meio da cena e o pulo que corta o som da faixa do fim (o mesmo padrão das outras cenas); as tarjas
    sobre a mesa clara (troca de luz parcial, dentro do limite de 3 por segundo); o online com dois clientes (conferido só lendo o código: sem
    prazo depois do `GameOver`, a revanche vem pelo `room` e o painel espera a mesa parar); as cores dos carimbos (do autor, no playtest).

---

## 2026-11-07 (1): a placa do momento da Guarda com a linha do quinto caso

- **Pedido:** "Sim, aplique" à pergunta "Aplico a mesma linha na placa do momento da Guarda?" (`decisoes.md` 2026-11-07 (1)). Branch
  `feat/placa-momento-guarda`, saída da `main` em `b2f1087`, no checkout principal.
- **Feito (`51b7945`):** no `momentPlate` (`GuardPlayed`, `model/copy.ts`), com exatamente `config.defenseHealGuard` K a consequência é
  a própria `plateLine('cura', …)`: "com 2 K depois do golpe, a Defesa dele que cai vira vida". As duas placas não se separam mais.
  - **Ruling:** o teste do mínimo virou o `healAtMinimum`, que a placa de estado e a do momento usam;
  - **Ruling:** com 3 K fica "com 3 K, a Defesa dele que cai o cura" (verdadeira: o K que absorve deixa 2, e a cura vale); o caso do seu
    Ataque Absoluto armado ("o seu Ataque Absoluto quebra todos os K") já estava certo e vem antes.
- **Testes:** `moment-copy.test.ts` confere contra a prévia do motor que o golpe comum seguinte deixa 1 K sem cura com 2 K, e 2 K com cura
  com 3 K; a placa do momento com 2 K é igual à `plateLine` do mesmo campo.
- **Medida (o painel do navegador estava escondido, e as fotos saíam velhas: valeu o DOM):** no replay `especiais.json`, do passo 73 para o
  74 (rodada 17, o Bot põe 2 K), a placa no celular de 360 × 640 vai de 16 a 344 px, com 71 px de altura (a frase quebra linha), sem rolagem
  lateral; no PC de 1366 × 657, de 340 a 760 px, numa linha. O E2E do momento (`moment.spec.ts`) usa a Guarda do passo 51→52, de 1 K, e não
  muda.
- **Armadilha:** com o painel escondido, a página roda em segundo plano; as transições não andam (a placa fica com `opacity` 0) e o
  `screenshot` devolve um quadro velho. Para ver uma camada passageira, peça ao autor para mostrar o painel, ou meça pelo DOM.
- **Achado no caminho:** a fixture `especiais.json` tem o Bot com exatamente 2 K nos passos 74 (rodada 17) e 115 (rodada 25); a
  `exodia-devastacao.json`, nos 60, 191, 202 e 343; a `reflect.json`, no 188; a `absolutos.json`, no 97 (um script com o motor sobre os
  `steps` de cada replay).
- **Verificado:** `pnpm check` verde antes do commit.

---

## 2026-11-06 (1): o quinto caso de placa (a cura passiva)

- **Pedido:** o autor perguntou "O que está pendente para produção?"; na resposta, o quinto caso de placa era o único texto conhecido que
  o motor contradiz, e ele respondeu "Sim, aplique" (`decisoes.md` 2026-11-06 (1)). Branch `feat/placa-cura-passiva`, saída da `main` em
  `9a902de`, no checkout principal.
- **Feito (`2b26577`):** `plateLine('cura', …)` (`model/copy.ts`) troca a linha em dois casos, lidos da mesa na ordem do `resolveAttack` (a
  Guarda quebra, a Defesa cai, a cura conta os K que sobram):
  - **Ruling:** o caso do Absoluto usa a mesma condição da placa da Defesa Absoluta (o Ataque Absoluto do outro armado, sem o Reflect de
    quem tem a marca: o Reflect segura o golpe com os K inteiros, e a Defesa dele cai e cura); entrou no `PLATE_EDGE` ao lado dela;
  - **Ruling:** a linha de 2 K só com exatamente `config.defenseHealGuard` K (o mínimo da cura vem do motor, e a frase usa a conta da
    Guarda); com 3 K o golpe que um K absorve deixa 2 e cura, e fica a linha de sempre;
  - **Ruling:** o Absoluto vem antes do caso de 2 K (ele quebra a Guarda inteira);
  - **Ruling:** o "sua"/"dele" da linha de sempre entrou na frase que o autor viu ("com 2 K depois do golpe, a Defesa que cai vira vida").
- **Testes:** `moment-copy.test.ts` confere cada caso contra a prévia do motor (os K que sobram do golpe e o `defenseHealActive` deles),
  com o Reflect que segura o Absoluto e o mínimo da cura trocado na config; `table.test.tsx` mostra as duas linhas novas nos dois campos
  (o teste da linha de sempre passou a usar 3 K).
- **Foto (o jsdom não tem layout):** no replay `especiais.json`, passo 133 (rodada 29: você com 2 K), a linha de 2 K ocupa duas linhas na
  coluna de 228 px do PC de 1366 × 657 (a placa tem 52 px; com a linha de sempre, de uma linha só, a placa era mais baixa); no tablet de
  768, uma linha, sem rolagem lateral. O passo 99 do E2E de layout não tem a placa da cura (as duas Guardas com 1 K): as colunas seguem com
  40 e 68 px, abaixo dos 88.
- **Para o autor (não mexido, ele aprovou só a placa de estado):** a placa do momento da Guarda (`momentPlate`, `GuardPlayed`) diz "com 2
  K, a Defesa dele que cai o cura", e tem a mesma imprecisão: no golpe comum seguinte, um K absorve, sobra 1 e aquele golpe não cura. As
  duas placas agora falam do mesmo caso com palavras diferentes.
- **Verificado:** `pnpm check` verde antes do commit.

---

## 2026-11-04 (1): os quatro textos de placa no caso de borda

- **Pedido:** "Corrija os quatro" (`decisoes.md` 2026-11-04 (1)). Branch `feat/playtest-placas`, saída da `main` em `f8755bc`.
- **Feito:** `plateLine(kind, self, view)` (`model/copy.ts`) troca a linha só no caso de borda, lido da mesa na ordem do `previewBetween`
  (o Reflect antes de tudo, depois a Defesa Absoluta, que só o Ataque Absoluto fura); o texto de sempre ficou como o autor aprovou. A
  `StatePlate` recebe a linha pronta (`does`), e a `PlayerField` a calcula com a `view`.
  - **Ruling:** na placa do momento do K, o seu Ataque Absoluto armado (sem o Reflect dele) vem antes da cura: o motor quebra a Guarda
    antes de a Defesa cair (`resolveAttack`), e a cura conta os K que sobram; a frase da cura também era falsa nesse caso;
  - **Ruling:** "o K absorve o próximo golpe inteiro" virou "o K absorve um golpe inteiro" (a de 2 K ou mais já dizia "um golpe"): com a
    Defesa Absoluta dele, o próximo golpe é segurado por ela;
  - cada caso de borda tem teste contra a prévia do motor no mesmo cenário (`moment-copy.test.ts`), e a mesa tem as duas Defesas
    Absolutas com os dois Ataques Absolutos armados (o caso que a revisão achou contraditório) e o Reflect dele contra a sua Defesa
    Absoluta (`table.test.tsx`).
- **Achado na tela, consertado:** no PC, a linha da zona do Reflect ficava entre o título e as cartas, numa coluna de 40 px (6 linhas de
  uma ou duas palavras; já era assim no bloco A). Agora fica embaixo do título, na largura dele (5,9 rem): 3 linhas com o texto de
  sempre e com o mais longo novo, a zona caiu de 83 para 76 px, sem sobrepor nem rolar de lado (1366 × 768 e 1366 × 657, no replay
  `reflect.json`, passo 176).
- **Para o autor (um quinto caso, achado no motor):** a placa "Cura passiva" ("a Defesa dele que cai vira vida") também falha: contra o
  Ataque Absoluto armado do outro, todos os K quebram antes da cura, e com exatamente 2 K o golpe que um K absorve deixa 1 K, sem cura
  naquele golpe. Não mexido: ele pediu os quatro.
- **Fechamento:** a sessão do bloco E levou a `main` a `d04dc0b`; mesclada aqui em `9c25133` (conflitos só na memória: as entradas das
  duas branches juntas, a mais nova em cima). As duas CI verdes no merge (run `41837134228`) e no `2d9774e`; a `main` por fast-forward até
  o commit da memória logo depois. A sessão do bloco E foi apagada (a branch estava na `main`, o worktree limpo).
- **O quinto caso, explicado:** o autor pediu "me explique de forma rápida e entendível o quinto caso" e, depois do exemplo (a ordem do
  motor: a Guarda quebra, a Defesa cai, a cura conta os K que sobram), respondeu "Ok, entendi", sem decidir. As duas propostas que ele viu
  estão no `estado.md` ("Esperando o autor"). Nada mudou no código.
- **Armadilha (Windows):** o app apagou a sessão do bloco E, mas o worktree dela seguiu registrado. O `git worktree remove` tirou o
  registro e falhou na pasta ("Filename too long", dentro do `node_modules`); ela saiu no PowerShell com o prefixo de caminho longo
  (`Remove-Item -LiteralPath ('\\?\' + $p) -Recurse -Force`). A branch local saiu com `git branch -d` (mesclada); as remotas ficam para o autor.
- **Consolidação para a próxima sessão (2026-11-04):** o autor encerra esta sessão e continua em outra. O `estado.md` foi reescrito
  para isso: onde está tudo, o que esta leva fez, o próximo passo (a vez dele; depois os blocos B, C e D), o que espera por ele e as
  receitas para ver o momento e a zona do Reflect sem jogar. Nada em curso, nenhuma sessão paralela aberta.

---

## 2026-11-03 (7): bloco E, a Ressurreição no instante da quadra (ponto 16), da spec à medição

- **Sessão paralela** do bloco E (worktree `.claude/worktrees/ressurreicao-quadra-f59247`, branch `claude/ressurreicao-quadra-f59247`, saída
  de `d35a241`). O autor aprovou o plano com 15 s na janela (`decisoes.md` 2026-11-03 (6)).
- **Feito, por tarefa do plano** (`docs/superpowers/plans/2026-11-03-ressurreicao-quadra.md`):
  1. a troca e a proteção no motor (`41a3cc2`): `resurrectionRows` é a fonte única (motor, lista legal, bots, web), `QUAD_PROTECTED`, a chave
     `resurrectOnQuad` (ausente = a regra de antes);
  2. a janela (`2124c9a`): a fase `RESURRECTION { player, next }` aberta no `resolveEquip`, invariantes novas (a janela só com jogada, a
     Ressurreição nunca desfaz quadra, nenhuma fileira acima do limite); uma mutação conferiu que a invariante pega a janela sem jogada;
  3. os bots (`1158b2f`): `resurrectionGain` (mesa, depois soma), o greedy só ressuscita sem piorar a mesa, o turtle não põe no Ataque;
     `RULES_VERSION` 5, 4 das 11 partidas de referência mudaram (15 Ressurreições na janela, 1 guardada, 9 trocas nelas);
  4. o servidor (`b696b2e`): 15 s por jogador, sem estouro, a vez do segundo é época nova; `STATE_SCHEMA` 5; `DeadlineKind` `RESURRECTION`;
  5. o modelo da web (`802f8ff`): a troca e o total no `plays.ts`, a carta trocada é sua (`marks.ts`), o anúncio; textos em
     `model/resurrection-copy.ts`; no `copy.ts`, só a linha do resumo e o `CLOCK_START_TEXT`;
  6. a mesa (`e9799cc`): o `ResurrectionPanel`, o passo da fileira com a troca, o total e a fileira protegida; a dica do tutorial;
  7. o E2E (`1b1c023`): `resurrection.spec.ts` na semente `e2e-quadra-36` (a janela do jogador na rodada 4), fotos em 360 × 640 e 1366 × 657;
     o `pnpm e2e` inteiro, 79 de 79 (na porta 8797);
  8. a medição: calibração e portão do Difícil (`e8660f1`, `071626f`), números em `notas/medicao-ressurreicao-quadra.md`.
- **Para a `main` (2026-11-04):** as duas CI passaram em `21e4c43`; a `main` com o bloco A (`f8755bc`) foi mesclada em `9125328`
  (conflitos só na memória e no `testMatch` do `playwright.config.ts`; as entradas renumeradas), e as duas CI passaram de novo nele
  (run `41764020751`); a `main` foi por fast-forward até o commit da memória. A revisão final foi de quem escreveu o código, sem subagente.
- **Rulings** (as escolhas da execução, além das 9 do plano que ele aprovou):
  - a troca sai como no Roubo (`CardsRemovedFromRow`, `Healed`, `Resurrected`): a linha do tempo, a saída na mesa, o som e o histórico já a
    tratam, e o `timeline.ts` (do bloco A) ficou intocado;
  - o greedy desempata as Ressurreições no fim pela soma (antes, sorteio): ele muda um pouco também com a chave desligada;
  - o total da fileira entra na mesma linha do detalhe ("no fim da fileira · 5 de 7 · total 152 → 180"), para o nome acessível seguir o texto;
  - **o E2E não mostra a troca:** o `playOnce` põe toda numérica no Ataque e ataca todo turno, e as duas fileiras nunca ficam cheias juntas
    (0 janelas com troca em 200 sementes). A troca e a fileira protegida ficam nos testes da mesa (`resurrection-window.test.tsx`), sem layout;
  - o "segundo da fila ganha a jogada pela troca do primeiro", do Foco da revisão, é impossível (a mesma numérica daria jogada aos dois):
    o teste cobre o segundo trazendo a carta que a troca do primeiro tirou;
  - as sementes do teste do Equipar vazio da `LocalRoom` (ponto 17) e a partida do terminal (roteiro, 90 → 131 passos) foram refeitas para o
    greedy novo.
- **Números** (detalhes na nota): 98% das quadras viram Ressurreição usada (eram 82%); a Ressurreição parada na fase principal cai de 44% para
  11%; 55% de quem usa a janela ataca em segundo; a iniciativa quase não muda (52,0% → 52,8%); a mediana de rodadas de Ataque passa de 13 para
  14 (meta 8–14). Portão do Difícil aprovado do zero nas três rodadas: (a) 69,0%, (b) 81,5%, p95 168 / 149 / 189 ms; a busca na janela
  (rodada 2: 67,5%) não ficou.
- **Não conferido de verdade:** a troca no navegador (só no jsdom); o relógio de 15 s online e a cena com o prazo (só nos testes do servidor);
  a janela do Bot no treino vista a olho (só no E2E inteiro, que passa por ela sem quebrar); o som.
- **Armadilhas desta sessão:**
  - **dois `pnpm check` ao mesmo tempo:** achei que o primeiro tinha sido cortado pelo limite de uso (o log ainda estava no typecheck) e abri
    outro; os dois derrubaram o `workerd` e disputaram a pasta de cobertura da web. Antes de rodar de novo, confira se o job acabou;
  - **o ESLint lê a pasta `.superpowers/`:** um script `.ts` deixado ali reprova o pre-commit. Scripts de rascunho vão para o scratchpad;
  - **o Playwright carrega a configuração como CommonJS:** a do E2E na porta livre importa a de verdade pelo caminho absoluto
    (`D:/…/playwright.config.ts`), não por `file:///`;
  - **redimensionar a página no meio da partida** deixou o `<main>` com 681 px de rolagem lateral (artefato): o teste de cada tamanho abre a
    partida já nele, como o `layout.spec.ts`;
  - a 8787 estava ocupada por um `workerd` de fora: o E2E rodou na 8797 (receita do (8) de 2026-11-02);
  - **o p95 do portão do Difícil varia entre rodadas** (149 a 189 ms com os mesmos bots e sementes): não leia uma diferença de 40 ms como
    efeito de uma mudança. As pontuações, essas, se repetem;
  - **a CI só roda nos pushes de `main` e `feat/**` e nos PRs:** a branch `claude/…` não dispara nada. Ela subiu também como
    `feat/ressurreicao-quadra` para as duas CI.

---

## 2026-11-03 (6): o bloco A do playtest, a execução

- **Pedido:** o plano do bloco A aprovado como está (`decisoes.md` 2026-11-03 (5)). Branch `feat/playtest-bloco-a`, saída da
  `feat/playtest-spec` em `0bd8d72` (a `main` está em `d35a241`; ela vai até o fim do bloco junto com ele, por fast-forward).
- **Armadilha:** o pre-push do fast-forward da `main` para o `0bd8d72` falhou uma vez no `pnpm check`, com a sessão do bloco E rodando
  ao mesmo tempo, e o `| tail` do comando escondeu qual teste foi. Rodado de novo, sozinho, passou. Não encadeie `git push | tail` com
  `&&`: o `tail` engole o código de saída (o `git branch -f main` andou mesmo com o push recusado, e foi desfeito).
- **Task 1 (o momento na linha do tempo e no protocolo):**
  - protocolo: `SPECIAL_MOMENT_MS` (1,6 s e 1,1 s), `MOMENT_PLAYS`, `isMomentFor`, `momentsMs` e `stepAllowanceMs` em `scenes.ts`;
  - web: a batida `moment` (com `Beat.moment`, o voo e o impacto), `MOMENT_MS` (as três fases), e nas opções `viewer`, `momentsBefore`,
    `holdOwnMoments` e `ownMomentsBefore` (A9a). Sem `viewer` nada muda (os testes e o replay de antes);
  - **Ruling:** o `classify` não devolve `moment` (o tipo dele exclui): o momento é decidido depois, com o `viewer`, e as contas seguem
    `momentsMs` evento a evento, sem repetir a regra;
  - **Ruling:** a A9a mantém a sua especial como `move` (com o voo e o pouso de hoje), só com a duração do momento do oponente.
- **Task 2 (o momento na mesa):**
  - `touchMs(beat)` (o impacto no momento, o início nas outras) nos atrasos, na saída e nas vizinhas; a carta do Bot ganha o pouso
    `snap` (escondida até o impacto, 50 ms de esmaecimento, sem a queda); o A do oponente não vira cópia (vem de versos sem id);
  - a máquina das batidas guarda `moments` e `ownMoments` (a conta do turno) para a seguinte, e o `resync` zera; o véu é a cortina
    com `veil: 'moment'` (35% de tinta, `data-veu="momento"`), pela mesma trava; com movimento reduzido, não sobe;
  - `Stage` ganha `online` (a `PlayTable` passa `training === undefined`) e o leva como `holdOwnMoments`;
  - **testes mudados de propósito:** a carta do Bot não cai mais de 14 px na batida dela (`table-motion.test.tsx`): ela aparece no
    impacto do momento. Os três testes de layout (`animation-layout.test.tsx`) montam a mesa do treino, porque o harness é online e lá
    a sua especial segura 1,6 s (A9a). O harness ganhou `training`;
  - **não conferido de verdade:** a recusa do véu pela trava cheia não tem teste próprio: ela usa a mesma `raiseCurtain` da cortina das
    cenas, que os testes da cortina cobrem.
- **Task 3 (o servidor e o treino esperam o momento):**
  - servidor: `schedulePhase` usa `stepAllowanceMs(events, null)`: a folga do momento vale para os dois lados (A9a) e é sempre a
    inteira (A1). Três testes do prazo mudaram de propósito: o K abre a janela com +1,6 s, o Ás na reação soma +1,6 s, e o 4º Q soma a
    cena e o momento. Um teste novo: duas especiais seguidas no próprio turno dão +1,6 s cada;
  - treino: a sala local conta os momentos do Bot no turno (`#momentsInTurn`, zera na partida nova e no `TurnStarted`) e soma
    `stepAllowanceMs(events, LOCAL_ME, conta)` ao `#sceneUntil`: o Bot espera 1,6 s + 600 ms depois da primeira especial do turno e
    1,1 s + 600 ms depois das seguintes; o K do jogador abre a janela do Bot, que responde na hora;
  - **armadilha (minha):** um script de edição pôs o zerar da conta no `act()` do jogador, e não na partida nova; o teste novo, que conta
    os momentos à parte, achou na hora. Os scripts de troca de texto pegam a primeira ocorrência: confira o lugar.
  - **testes mudados de propósito:** a reação do Bot pode esperar o momento da Armadilha dele (ele joga de novo na mesma janela), e o
    Fácil tem esperas de momento além de 0 e 600 ms (o teste segue barrando as fatias curtas).
- **Corte pelo limite de uso** no meio da Task 4 (as duas sessões, a do bloco E também). Nada se perdeu: o que estava sem commit (o texto
  da placa e a pista) estava inteiro, e foi o primeiro commit da volta (`2ae674f`).
- **Task 4 (a carta grande, a placa e o som):**
  - `momentPlate` em `copy.ts` (a tabela do plano; o Selvagem como alvo dá só o título; nenhuma placa fala da Exódia); a pista
    `momento` (a virada de papel) no começo da batida; o impacto soa na camada (`pouso` `dropMs` antes do impacto, `quebra` no impacto);
  - `ui/anim/Moment.tsx` (`MomentLayer`, no `Stage`, z-55, por cima do véu): a carta (`Card` com `ghost`, sem `data-card-id` e
    `aria-hidden`) sai da mão dele de costas e vira em 3D (o verso é `.momento-verso`, no `styles.css`), a placa embaixo, o voo medido no
    começo dele, e depois do impacto a Armadilha, o Sacrifício e o Roubo seguem ao cemitério (`exitMs`). As fases moram em `data-fase`;
  - **Ruling:** a camada guarda o último momento até a carta terminar (a ida ao cemitério passa do fim da batida); o pulo e a linha do
    tempo que não tem mais a batida a tiram;
  - **Ruling:** o atributo da placa é `data-placa-momento`: `data-placa` já é a placa do placar (o seletor do teste pegou a errada);
  - JavaScript inicial: 170,6 KB de 200 KB (gzip);
  - **não conferido de verdade:** a posição, a virada em 3D e o voo (o jsdom não tem layout nem `animate`): só nas fotos da Task 8.
- **Task 5 (a mão que diz o que joga agora):**
  - `liveHandIds(view, legal, plays)` em `plays.ts`: as de `byCard` e as cartas da mão cujo tipo entra numa combinação legal (Reflect,
    Devastação, a escolha do que queimar), pela regra do `roleKey`;
  - a `PlayTable` passa `liveCards` (vazio depois do passe, `null` no fim da partida) pela `Table` ao contexto; a `<li>` da carta
    apagada tem `data-sem-jogada` (desce 8 px, filtro parado, sem respirar, o `LockIcon`), a que joga `data-joga` (o fio de ouro);
    com movimento reduzido, `data-parado` tira a transição. O nome acessível da apagada termina em "sem jogada agora";
  - **achados nos testes, que eram meus e não do motor:** sem carta no campo do oponente o A não tem alvo; com K, A e J na mão a
    Devastação acende o J mesmo com o limite de J cheio.
- **Task 6 (as placas de estado):**
  - `StatePlate.tsx` (o medalhão com a figura de hoje num disco, o nome e a linha de `plateLine`, do lado de quem vê); a Ressurreição
    mostra "Ressurreição(ões)" e o número num selo, e o leitor de tela segue ouvindo "N Ressurreições disponíveis" (`sr-only`);
  - a zona do Reflect ganha a linha (A6) e o `MirrorMark` o brilho (`data-gesto="espelho"`, um retângulo recortado pelo espelho);
  - **desvio do plano (pequeno):** as animações sem fim ficaram **6**, não 5: a cura tem dois gestos (a cruz que bate e o "+" que sobe),
    e cada elemento precisa da sua animação. O teste das animações sem fim trava as seis;
  - abaixo de 600 px a linha do que faz some (`.placa-faz`); o nome fica;
  - **não conferido de verdade:** o tamanho das placas no campo (a zona do Reflect ganhou uma linha no PC) e os gestos: nas fotos da
    Task 8.
- **Task 7 (a cura passiva que se explica):**
  - motor: `defenseHealOf(card, side)` exportado, e o `healFromDefense` passa a usá-lo; os snapshots golden não mudaram (sem `-u`);
  - sessão: `firstHealSeq` (o `seq` da primeira cura passiva que curou algo, de qualquer lado; zera na partida nova; o replay dá
    `null`, sem faixa); linha do tempo: `teachHeal` e `Beat.teach`; a faixa dessa batida é a `healRibbon` ("Cura passiva" · "2 K na
    Guarda: a Defesa que cai vira vida · 6 × (1 + 2 Q) = 18", e "· até a vida cheia" quando entrou menos), no `Stage`;
  - os K da Guarda de quem curou acendem na batida da cura: o `CardFx` ganhou `cause` (o halo verde pela opacidade, como o `light` da
    quadra). **Desvio do plano:** ele dizia `CardFx.cause?: true` e `data-causa`; ficou um valor a mais do `CardFx` que já existe
    (`data-fx="cause"`), o padrão da casa;
  - a essência: `healsOf(beats)` (da batida em que a carta saiu da Defesa à da cura) e a gota `.essencia-cura` na `Leaving`, até o
    `[data-retrato="voce"|"oponente"]` (o plano dizia `self`/`opponent`; os valores de verdade do placar são esses);
  - a dica `buffs` do tutorial ganhou a conta ("A cura é o valor da carta vezes (1 + o número de Q).").
- **Task 8, o E2E (`e2e/moment.spec.ts`, no projeto `desktop`, a 1366 × 657 e a 360 × 640):** a Guarda do Bot (a placa à vista, nada
  rola de lado, o K aparece no fim), o segundo J do turno mais curto (a página mede cada vez que a camada fica montada), o pulo pelo toque
  e a mão toda apagada no Equipar do treino. **Defeito achado por ele, consertado com teste:** o timer do fim do momento e o do fim da
  batida vencem no mesmo instante; se o do momento chegasse antes (o filho roda o efeito antes do pai), a batida ainda era o momento, a
  camada o mostrava de novo e reaproveitava o componente parado na fase `exit`, para sempre (invisível, mas montado). Agora o momento
  terminado fica anotado (`done`) e não volta. O teste de unidade reproduz a corrida (falha sem o conserto). Depois: 3 execuções de 7/7.
- **A CI do `e194d58` reprovou 3 E2E de layout** (`layout.spec.ts`, "especiais no PC", nas três telas): o bloco das marcas tinha 67,5 px,
  e o teste aceitava 56 (duas linhas de etiqueta). As placas são mais altas por desenho (o medalhão e a linha do que faz): o limite passou a
  88 (duas linhas de placa), e o resto do teste (as zonas sem se sobrepor, a coluna cabendo no campo) passou nas três telas, localmente.
- **Armadilha:** `-g "360 × 640 › ..."` não acha o teste no Playwright do Windows (o `×` e o `›` do título); filtre por um pedaço sem eles.
- **Task 8, a revisão final (A8, um revisor novo, a branch inteira contra a spec e o plano).** Consertado com teste (`256d69d`):
  - **online, o passe automático cortava o momento do Ás na janela:** ele sai no ack do Ás do respondente, e o servidor o aplicava na
    hora quando os 2 s já tinham passado; o atacante via a placa por 100 a 300 ms. A trava da A9a segura a mão, não a sessão.
    **Ruling:** o servidor guarda o PASS até o fim do momento do Ás mais o impacto (`passHeldUntil`, opcional no registro, sem subir o
    `STATE_SCHEMA`; a época nova o esquece). Só o Ás do respondente na janela o arma: o K que abre a janela segue com o piso de 2 s.
    O teste do piso que usava um Ás aos 300 ms mudou de propósito (o PASS dele vale aos 2.380 ms, não aos 2 s);
  - **no treino, o Bot na janela jogava no fim exato do momento do Ás dele:** o `state` novo cortava o racha, o tremor e a ida do Ás ao
    cemitério (e o som da quebra). **Ruling:** `MOMENT_TAIL_MS` (480 ms, no protocolo; um teste da web confere que cobre
    `crackShakeMs + exitMs`) entra só depois das especiais que quebram ou levam uma carta (`MOMENT_TAIL_PLAYS`: o Ás, o Sacrifício e o
    Roubo) e só onde a jogada seguinte não pensa: o PASS guardado, o Bot na janela (`#tailUntil`, só depois de um momento dele com
    cauda: uma cena sua no ar não o atrasa) e, online, a sua jogada depois da sua especial com cauda (a trava da A9a passa de 1,6 s a
    2,08 s; um clique rápido logo depois cortava o alvo quebrando na tela do oponente). Fora da janela o Bot já pensa 600 ms depois do
    momento, e a folga do prazo (`stepAllowanceMs`) ficou como estava: o relógio do servidor para 1,6 s, e os 480 ms da trava correm no
    relógio de quem jogou. Os cacos vão para a camada das partículas, que o `state` novo não limpa: a cópia que racha vive 120 ms e a ida
    do Ás ao cemitério 360 ms, os dois dentro dos 480;
  - **o Ás do Roubo do oponente aparecia duas vezes** (no topo do cemitério, sem numérica deslocada, e grande no centro): ganhou o pouso
    `snap` quando a cópia chega ao cemitério (impacto + `exitMs`). Com movimento reduzido ele aparece 360 ms depois do fim do momento;
  - o "4 J" e o "4 Q" da placa vêm de `config.buffLimit`; o véu do momento passa para a cortina da cena (o 4º Q, com a Defesa
    Absoluta) esmaecendo o fundo, sem o pulo de 35% para 60% fora da trava; um comentário da linha do tempo sobre o replay corrigido
    (o replay mostra os momentos, do lado de quem gravou: é o que o E2E e a medição usam).
- **Da revisão, para o autor decidir (textos que ele viu na spec §3 e no protótipo):** "imune até o golpe dele" (o Ataque Absoluto fura
  a Defesa Absoluta, e a ajuda do jogo diz isso), "quebra todos os K" (contra um Reflect ativo, os K ficam), "o K absorve o próximo golpe
  inteiro" (não contra o Ataque Absoluto armado de quem vê) e "o próximo golpe volta para ele" (com o atacante sob Defesa Absoluta, o
  Reflect só segura). Ficaram como ele aprovou.
- **Da revisão, menores, não feitos:** a primeira cura passiva que chega num `catchUp` ou é pulada gasta o `firstHealSeq` sem a faixa;
  as placas "Cura passiva" e "Ataque Absoluto armado" aparecem na chegada do `state`, 1,6 s antes de o K ou o J pousar; o `copy.ts`
  segue fora da cobertura (`vitest.config.ts`), agora com lógica (`momentPlate`, `healRibbon`) que o portão de 90% não vê.
- **Fechamento:** as duas CI verdes no último commit de código (`540e3d4`, run `41760616250`); a `main` por fast-forward até o commit da
  memória que vem logo depois. A sessão do bloco E mescla a `main` em seguida (conflitos só na memória e no `testMatch` do
  `playwright.config.ts`, pela simulação dela) e renumera as entradas dela.

---

## 2026-11-03 (5): as respostas do autor; o desenho vira spec

- **Respostas** (`decisoes.md` 2026-11-03 (4)): a fatia 5 aprovada (o sub-projeto 6 fecha); a ordem dos blocos, a variante A em todos os
  pontos e as perguntas 5 a 7 aprovadas; o ponto 4 sem texto (só a aura nos 3 K); a regra do 16 escrita por ele, com uma pergunta de
  seguimento (a troca vale também depois, na fase principal).
- **Feito** (branch `feat/playtest-spec`, só documentos):
  - `decisoes.md` 2026-11-03 (4), com o texto dele e as leituras **[I]** da regra do 16;
  - a spec `2026-11-03-playtest-design.md`: o cabeçalho deixa de ser rascunho, as variantes escolhidas, os 3 K sem texto e sem a coroa,
    a §7.2 com a regra dele (10 itens, as [I] marcadas), a §9 com as respostas, a §10 com as minhas leituras;
  - o protótipo: o selo e as caixas dizem as respostas; os 3 K só com a brasa nas cartas (a coroa ficou só na Exódia, com 4 K).
- **Conferido no motor, para a regra do 16:** `resurrect` (`actions/main.ts`) recusa a fileira cheia (`ROW_FULL`), e `legal-actions.ts`
  só lista a fileira com vaga; a troca do Equipar (`actions/equip.ts`) e o Roubo (`actions/main.ts`) já mandam a última carta ao
  cemitério e chamam `healFromDefense`: a cura da carta que sai na Ressurreição é a regra geral, não regra nova. A quadra é por fileira
  (`quadValues`, 4+ iguais), e cada Ressurreição guarda a quadra que a deu (`row`, `value`, `formedAtRound`).
- **Sessões:** a do online ("Equipar vazio não pode cortar o golpe final") foi apagada, como ele pediu. O app apagou a sessão, mas a
  pasta do worktree ficou pela metade (`Filename too long` no `node_modules`): o `Remove-Item` com o prefixo `\\?\` terminou, e o
  `git worktree prune` limpou o registro (e o do `jogo-coringa-v5`, que já não tinha pasta). A branch `sync/online-equipar-vazio`
  (mesclada) saiu; a `feat/online-equipar-vazio` (rebase não publicado, 2 commits fora da `main`) ficou.
- **Armadilha:** um `cd` para dentro do worktree de outra sessão faz o app tratar o worktree como a pasta desta sessão. Volte com `cd`
  para o checkout principal antes de apagar a outra sessão.
- **A sessão do bloco E** foi aberta (worktree próprio, branch `ressurreicao-quadra`, saída da `feat/playtest-spec`), com a regra do 16
  no brief: spec das regras, plano, aprovação do autor nela, execução. Combinado com ela: o estado dela numa seção própria do
  `estado.md`, só acréscimos no diário e nas decisões, e aviso antes de tocar nos arquivos da web do bloco A.
- **O plano do bloco A** (`docs/superpowers/plans/2026-11-03-playtest-bloco-a.md`), escrito a partir da leitura do código:
  - **o momento** é uma batida nova (`moment`) da linha do tempo, fora do teto de decisão, com o voo e o impacto dentro dela; a conta
    dos momentos do turno é uma função pura do protocolo (`momentsMs`), lida pela linha do tempo, pelo bot do treino e pelo servidor;
  - **achados que a spec não dizia:** as faixas são `aria-hidden` (o registro acessível é o histórico), então a placa também (A4); o
    véu de 35% é troca de luminância e passa pela `FlashLock` (A3); a consequência usa o total do motor, não o multiplicador (A5); o
    Selvagem como alvo não diz de que zona saiu, e a placa fica só com o título; o bot do treino não pode esperar o momento das jogadas
    do próprio jogador (o K dele abriria a janela do Bot 1,6 s depois);
  - **escolhas para ele:** A1 a A9 no começo do plano, com a recomendação em cada uma;
  - **achado da revisão do plano:** online, quem joga não vê o próprio momento, então um J, um Q e um K em um segundo chegariam ao
    oponente como três `state`s, e cada um cortaria o momento anterior (o `useBeatPlayer` troca a linha do tempo). Virou a A9, com a
    recomendação de quem joga esperar o momento do outro (como o Bot no treino). Também da revisão: a mão depois do passe fica apagada
    (a lista legal ainda traz a Armadilha); o encaixe com o bloco E (a fase e os eventos novos) fica com quem mesclar por último.
- **Próximo:** a CI e a `main`; o autor aprova o plano do bloco A.

---

## 2026-11-03 (4): o rascunho do desenho dos pontos do playtest, com o autor fora

- **Pedido do autor** (`decisoes.md` 2026-11-03 (3)): adiantar tudo o que não precisa dele e deixar as perguntas para o fim.
- **Feito** (branch `feat/desenho-playtest`, só documentos; nenhum código do jogo mudou):
  - **o levantamento:** as especiais do oponente (`BuffPlayed`, `GuardPlayed`, `TrapUsed`, `Sacrificed`) são batidas `move` sem faixa
    (`timeline.ts`), e é por isso que o autor se perde; a mão já sabe o que joga (as zonas do `handDrag`, o `locked`, o `noPlayReason`), só
    não mostra; as marcas são as `chips` do `Zones` (`PlayerField.tsx`); a cura passiva é o `Healed` com `reason: 'DEFENSE'`; a quadra se
    forma na revelação do Equipar (`actions/equip.ts`), no Roubo e na própria Ressurreição (`quads.ts`);
  - **a medição do 16** (`notas/medicao-ponto-16.md`): 2.000 partidas greedy × greedy com o `runGame` e o gancho `onStep`, num script fora
    do repositório (a receita está na nota);
  - **o protótipo** (`specs/2026-11-03-playtest-prototipo.html`): um quadro por ponto, com as variantes. A aura dos pontos 10 e 11 usa a
    mesma conta de `ui/scenes/aura.ts`, portada para o protótipo;
  - **o rascunho** (`specs/2026-11-03-playtest-design.md`): a intenção, cinco blocos (A a mesa que se explica, B o golpe final, C o poder
    que cresce, D identidade, E a regra do 16), cada ponto com o que muda e onde, as restrições, as minhas escolhas (§10) e as 8 perguntas
    dele (§9).
- **Armadilhas desta sessão:**
  - **o painel do navegador escondido congela as animações** (a página roda em segundo plano): as fotos saíam no instante errado e uma
    animação ficou presa no meio. As fotos do protótipo saíram do Chromium do Playwright em modo headless (`@playwright/test` de
    `packages/web`, num script fora do repositório), que anda no tempo de verdade;
  - **o Vite do autor (5173) caiu no meio**: o protótipo foi servido por um servidor estático de rascunho na 8799, com a raiz no
    repositório (as fontes vêm de `packages/web/node_modules`); a configuração `prototipo` do `.claude/launch.json` (fora do git) aponta
    para ele;
  - **a `main` andou durante o bloco** (a sessão do online, `4f7621e`): mesclada na branch; o conflito foi só no `estado.md`.
- **Revisão antes de entregar (advisor):**
  - a caixa do ponto 14 dizia "medi que cabe" sem medir: agora diz que as fotos de 360 × 640 e 1366 × 657 vêm no plano;
  - o cenário de reação do ponto 2 contradizia a regra (com K, J e Q na mão o Reflect joga): cada momento tem agora a sua mão, e o
    rascunho diz que "joga agora" é a lista legal do motor, com as jogadas em combinação;
  - **o ritmo do ponto 1, medido** (1.000 partidas, 14.508 turnos do Bot): 1,12 especial por turno; 25% dos turnos com duas, 6,6% com três
    ou mais. O rascunho ganhou a compressão (a 2ª especial em diante no mesmo turno em ~1,1 s);
  - o protótipo abre direto pelo arquivo (conferido no Chromium: fontes carregadas, nenhum erro); as fontes ficaram só com o caminho relativo;
  - o `initiativeStreak` não muda o digest das partidas de referência (ele conta eventos por tipo); anotado na §5.2.
- **Não conferido:** o protótipo no celular de verdade (os quadros escalam, mas os botões de controle não foram medidos) e o som (não há).

---

## 2026-11-03 (3): o online do ponto 17 (o Equipar vazio que cortava o golpe), consertado na mesa

- **Pedido:** a sessão que o autor abriu ("Online: Equipar vazio não pode cortar o golpe final"), para fechar o buraco do online que o
  (1) deixou anotado. O ponto 17 em si foi fechado (era a Armadilha), mas o defeito do Equipar vazio fica: `decisoes.md` 2026-11-03 (2).
- **Feito:** a branch `feat/online-equipar-vazio` (worktree `.claude/worktrees/dreamy-engelbart-4a4876`), a partir da `main` (`6165d57`),
  commit de código `105b8ba`. A `main` andou para `5b5b34f` (o ajuste do ponto 18, sem conflito no código) e entrou por merge: o
  rebase pedia force-push da branch já publicada, que o modo automático barrou, e o `sync_with_base_branch` do app falhou no host
  ("Committer identity unknown"). Fica um commit de merge na `main` depois do fast-forward.
- **Ruling: na web, não no servidor.**
  - adiar o passo automático pelo alarme da sala obrigaria o servidor a adivinhar quanto dura a animação do cliente: além da folga
    de cena (`sceneAllowanceMs`) há o teto de decisão de 1 s e a faixa da iniciativa de 1,2 s (fora do teto), que só a web conhece;
  - o mesmo corte acontecia com o oponente humano que pula a cena e confirma o Equipar no meio do golpe: o `state` dele só traz
    `EquipSubmitted`. O conserto no servidor não pegava esse caso;
  - no servidor seriam ainda um tipo novo na agenda, um `setAlarm` a mais por rodada e a pergunta de o que fazer quando o oponente
    confirma antes do alarme (mudança visível no online, para o autor aprovar). Na web não muda regra, prazo nem estouro: não pede
    aprovação.
- **Conferido antes:** a conexão (`packages/protocol/src/client.ts`) entrega cada mensagem no seu `onmessage`, sem fila; o golpe chega a
  ser desenhado e o `state` seguinte o corta (no treino os dois vinham na mesma tarefa, e o golpe nem desenhava).
- **A regra** (`useBeatPlayer`, `absorbs`): um `state` ao vivo, na mesma `epoch` da linha do tempo que toca e só com eventos de batida
  quieta (`quietOnly`, em `timeline.ts`) não troca a máquina; ela anota o `state` (`absorbed`) e segue até o fim. A `view` nova é
  desenhada na hora (a mesa desenha sempre a última).
  - **Ruling:** a mesma `epoch` limita a regra a "a mesa de decisões não mudou". Um `ReactionWindowClosed` sozinho que devolve o turno
    muda a `epoch` e segue cortando, para a decisão não esperar a animação velha;
  - **Ruling:** lista vazia não é quieta: um `state` sem evento é o começo de uma partida (a revanche), que troca a mesa inteira;
  - **Ruling:** o `layoutKey` das cartas (`Stage`) usa o `seq` da linha do tempo que toca, não o do último `state`: trocá-lo no meio do
    voo faria o Motion medir e partir de novo (o `layoutDependency` da carta).
  - **O replay não absorve nada:** cada quadro tem `epoch` própria (`epoch` = índice, em `replay-track.ts`, travado no
    `replay-track.test.ts`). O "Próximo passo" e o "Tocar" no meio de uma cena seguem cortando como antes, mesmo num passo só com
    `EquipSubmitted`. Se um dia o replay passar a repetir a `epoch` do servidor, a absorção chega a ele e o "Próximo passo" deixa uma
    cena tocando muda (os controles cortam o som): desligue a absorção ali.
- **Testes** (`test/ui/quiet-state.test.tsx`, 8; e o `quietOnly` em `test/model/timeline.test.ts`): o Ataque Absoluto que fecha a
  rodada toca inteiro (a cena, a vida descendo no feixe e a mesa ocupada até o fim da compra) com o Equipar vazio colado; o golpe comum,
  também com a confirmação do oponente no meio; o `layoutKey` que não muda; e o contrário: um `state` com batidas, outra `epoch`, o
  `resync` e o `catchUp` trocam como antes. Sem o código, os 3 do caso falham; a suíte da web inteira passa (2.438).
- **Medido** (rascunho com o motor, fora do repositório): em 1.500 partidas greedy × greedy, 21.177 golpes de fim de rodada; um jogador
  sem numéricas no Equipar seguinte em 308 (1,45%, perto de uma partida em cinco), os dois juntos em 0. **Fica de fora** esse caso dos
  dois: o segundo Equipar vazio resolve o Equipar e tem batidas, então ainda cortaria.
- **De quebra, no treino:** o Equipar do bot (também só `EquipSubmitted`) não corta mais a faixa da iniciativa e a compra do fim de
  rodada. O timer do Equipar vazio do treino (`#scheduleAutoEquip`, do (1)) fica como está.
- **Não conferido de verdade:** uma partida online com alguém sem numéricas depois do golpe final (é o playtest do autor, depois do
  deploy dele) e o Motion durante a absorção no navegador: o jsdom não tem layout, e o que garante as cartas é o `layoutKey` igual.
- Specs: a da web §2.6 (a nota do online) e §4.1 (a regra do `state` quieto).

---

## 2026-11-03 (2): o ponto 18 sem o vermelho; o 17 fechado

- **Pedido do autor** (`decisoes.md` 2026-11-03 (2)): o 17 foi a Armadilha (engano dele), ignorar; no 18, a descida na cor padrão,
  mantendo a animação, e o contorno do ouro mais fino.
- **Feito** (branch `feat/ponto-18-ajuste`, a partir da `main` `6165d57`):
  - `styles.css`: só `.total-fileira[data-subiu]` pinta (ouro, contorno de 2,5 px com `paint-order`, ou seja ~1,25 px por fora, e sombra
    de 1 px; antes 4 px e 2 px). A regra do `[data-desceu]` saiu; o atributo fica como marca do encolher (os testes o usam);
  - `playtest-direct.test.tsx`: os testes da descida falam da marca, e um novo lê a folha e confere que só a subida tem cor;
  - foto no navegador (replay da fixture `absolutos`, rodada 5, atributos postos à mão): o 16 em ouro com o contorno fino, o 74 na cor de sempre.
- **Ruling:** a sombra de carimbo também afinou (2 → 1 px), porque ela soma com o contorno na espessura que ele viu.
- **Fica:** o conserto do Equipar vazio colado ao golpe no treino (`09fc360`), que é defeito de verdade; o do online está na sessão
  que o autor abriu ("Online: Equipar vazio não pode cortar o golpe final").

---

## 2026-11-03 (1): os pontos 16, 17 e 18 do playtest

- **Pedido do autor** (`decisoes.md` 2026-11-03 (1)): "ok, prossiga", com três pontos novos. O 16 muda regra (desenho); o 17 é defeito; o 18 é direto.
- **Feito:** a branch `feat/playtest-pontos-17-18`, a partir da `main` (`6759914`), com as duas CI verdes no último commit de código
  (`35ad7bd`, run `41576601116`) e fast-forward na `main`. Para ver a CI sem o `gh` (não está instalado nesta máquina): a API pública,
  `curl -s https://api.github.com/repos/andr3serafim/jogo-do-coringa/actions/runs?branch=<branch>`.
- **Ponto 17 (a cena do Ataque Absoluto que não aparece): a cena em si funciona; um caminho em que o golpe inteiro some foi achado e
  consertado no treino (o Equipar vazio colado); o caso exato do autor não foi reproduzido.**
  - **Diagnóstico** (testes temporários, apagados; o código ficou na pasta de rascunho da sessão): 300 partidas de treino na `LocalRoom` de verdade, com o
    jogador jogando como o greedy e esperando 5 s antes de cada jogada. 48 Ataques Absolutos (dos dois lados, 15 deles encerrando a partida);
    nenhum `state` da sala chega no meio da cena (a folga de cena de `decisoes.md` 2026-11-01 (3) segura o bot).
  - **No navegador** (o Vite do autor na 5173, sem mexer nele): a cena aparece inteira no replay (o seu Ataque Absoluto que encerra a
    partida, semente `diag-35`) e **ao vivo**, nos dois lados: o seu, clicando no Atacar de verdade (semente `diag-35`, rodada 17), e o
    do Bot, clicando no Passar (semente `diag-136`, rodada 5). Para jogar ao vivo até lá, um script na página trocou o `connect` da
    `LocalRoom` (pelo `import('/src/model/local-room.ts')` do Vite, o mesmo módulo da tela) para guardar a sala, e jogou o seu lado com
    o greedy até o ataque; o clique final foi na tela.
  - **O caminho em que a cena some de verdade:** em 59 ataques declarados com 4 J (o "Ataque Absoluto armado"), 11 não viraram
    Ataque Absoluto. Em todos, quem defendia quebrou um J (ou o Selvagem no papel de J) com uma Armadilha na janela de reação. Pela regra
    não há cena, mas a mesa não diz que o Ataque Absoluto desarmou: a barra prometia "Ataque Absoluto", e o golpe sai comum. É a mesma
    falta de leitura do ponto 1.
  - **Os dois Ataques Absolutos do jogador desarmados** na amostra: as sementes `diag-9` e `diag-73` (jogador greedy com o
    sorteio `<semente>/me`, esperando 5 s antes de cada jogada, Médio). Para reproduzir sem o rascunho: o laço do teste
    "o EQUIP vazio nunca sai no mesmo instante..." do `local-room.test.ts` é o mesmo.
  - **A leitura do advisor que achou o defeito de verdade:** o `#autoEquip` da `LocalRoom` aplicava o Equipar vazio do jogador (zero
    numéricas) dentro do `#commit` do passo que deu as cartas, no mesmo instante. Os dois `state`s chegavam ao `useSyncExternalStore`
    da sessão na mesma tarefa, e o React desenhava só o último: o golpe que fecha a rodada nunca tocava, com cena e tudo. Em 300
    partidas, 11 golpes de fim de rodada saíram colados assim (nenhum Absoluto, por acaso). **No navegador, antes:** semente `diag-236`,
    rodada 9, o seu Atacar: a mesa não ficou ocupada nem um quadro, e a vida do Bot pulou de 380 para 353. **Depois:** a mesa fica
    ocupada, a vida desce dentro das batidas, e o Equipar vazio sai em ~800 ms, junto com o do Bot.
  - **Conserto** (`local-room.ts`): o Equipar vazio sai num timer próprio (`#scheduleAutoEquip`), com a espera do bot (folga de cena +
    tempo de pensar); revanche, fechar e o fim da partida o soltam. A ordem dos passos no replay não muda (o timer dele nasce antes
    do do bot, com o mesmo atraso). Testes: os quatro do Equipar vazio esperam o timer, e um novo joga as três sementes com o caso
    e confere que nenhum Equipar vazio sai antes da folga mais 600 ms.
  - **O online tem o mesmo buraco:** o `autoSteps` do servidor aplica o Equipar vazio logo depois do passo, e o segundo `state` corta
    as batidas do primeiro (lá eles chegam em mensagens separadas, então o golpe começa e é cortado). Mexer no servidor (o prazo, o
    alarme) é outro trabalho; ficou anotado na spec da web §2.6.
  - **Ainda perguntar ao autor** em que jogada a cena faltou, para saber se foi este caso, o da Armadilha ou outro.
- **Ponto 18 (as cores do total):** `useRise` virou `useTrend` (`Row.tsx`). O total que sobe no pouso fica em ouro e cresce (1,3×),
  como no ponto 12; o número mostrado que desce com a mesa tocando (o golpe que conta, a carta que sai) fica vermelho e encolhe (0,85×)
  uma vez só, mesmo com a contagem descendo a cada quadro. A cor fica até 900 ms depois da última mudança e sai esmaecendo (280 ms). Os dois
  com contorno de tinta por fora do número (`-webkit-text-stroke` com `paint-order: stroke fill`) e uma sombra de carimbo de 2 px
  (`.total-fileira`, `styles.css`). No pulo e fora das batidas (`busy` falso), nada pinta. Com movimento reduzido, só a cor.
  - **Ruling:** a descida também tem o micro movimento (encolhe), pela coerência com a subida; ele só falou da cor.
  - **Ruling:** a cor da descida segue o número mostrado, então cai quando o número cai: no golpe, na batida do dano; numa carta que
    sai sem golpe (Armadilha, Roubo, Sacrifício), quando o passo chega, como o total sempre fez. Segurar o total até a batida da saída,
    como a fatia 5 faz com o pouso, fica para depois, se ele notar.
  - **Testes** (`playtest-direct.test.tsx`): a subida em ouro até 900 ms; o golpe em vermelho, encolhendo uma vez; a Armadilha num J seu;
    o pulo sem cor; o movimento reduzido sem encolher. Conferido que os da descida falham sem o código. Foto no navegador: o 31 e o 8
    em vermelho e o 22 em ouro, com contorno, no replay `diag-35`, rodada 3 (atributos postos à mão para a foto, porque a cor dura 900 ms).

---

As entradas de 2026-10-15 a 2026-11-02 (8) estão em `arquivo/diario-ate-2026-11-02.md`.
