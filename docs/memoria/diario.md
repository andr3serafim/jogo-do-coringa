# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

---

## 2026-11-27 (4): o PR #18 mesclado

- **Merge** por squash (`c1c1798`), com os quatro jobs verdes na ponta `1d4dd66` e o E2E local inteiro (139 passaram, 4 pulados),
  aprovado por ele para esta sessão (`decisoes.md` 2026-11-27 (4)). O deploy é dele.
- **Os limites conhecidos** foram para o `estado.md` (a quebra do Confirmar abaixo de 1280 px, as especiais acima do Atacar na coluna de 30%,
  a altura das especiais no celular, a mão sobreposta a 1024 com 4 especiais, a moldura que encolhe, a faixa da dica com 2 a 3 linhas).

## 2026-11-27 (3): a moldura limitada, os E2E e o merge

- **E2E da CI (rodada `bf97577`):** `online.spec` esperava "Duda voltou" à vista no histórico do PC (agora gaveta: `toBeAttached`);
  `tutorial.spec` a 360 × 640: com dois Devastar e o Atacar empilhados, a dica 5 saía da janela dos campos (168 px para 179): o título das
  especiais com 20 px no celular (cabe numa linha; 216 px). `ae14f12`.
- **E2E local (`CI=true pnpm e2e`):** 138 passaram e 1 falhou: o `training.spec` pedia o destino por `/Defesa/` e o nome agora é
  "Equipar defesa" (`/defesa/i`).
- **Achado do advisor:** a moldura de 7% apertava a coluna dos botões (o Confirmar quebrava até a 1440). `decisoes.md` 2026-11-27 (5): a
  moldura limitada e o vão de 4 px; medido (`colunas.mjs`, 1024 a 1920): os quatro botões numa linha em todas; o Confirmar numa linha a
  partir de 1280.
- **Conferido no código:** a cena (`BeatOverlay`, `z-50`) e a camada de efeitos (`z-40`) são irmãs da mesa no palco; a faixa da dica
  (`z-20`, dentro do `main` `isolate`) fica abaixo delas.

## 2026-11-27 (2): as três colunas e a moldura (`decisoes.md` 2026-11-27 (2) e (3))

- **Pedido:** "Estou insatisfeito com o resultado", com os prints riscados; as respostas viraram a grade de três colunas no PC.
- **`e59ada5`:** a faixa de baixo em `pc:grid-cols-[35fr_65fr]`; a barra, o Equipar (o `data-disposicao` com `pc:col-span-2`, porque o
  `Panel` também é grade), a ordem e a Ressurreição em `pc:grid-cols-[35fr_30fr]`, os botões em `pc:col-start-2`; a mão
  `pc:justify-self-center`; sai a `pc:min-w-[640px]` da barra (as colunas fixas resolvem a mão cheia). Os destinos de fileira com a palavra
  (`.carimbo-destino-palavra`, 72/76 px) e o desenho marcado (`AttackIcon`/`DefenseIcon` com `marked`; `--color-azul`); o nome acessível é
  a palavra (o `title` guarda o nome do terminal). `MAIN_SIZE` com `pc:min-w-[260px]`.
- **A moldura:** `pc:px-[7vw]` no `main` e `pc:border-x-[6px] pc:border-madeira` na coluna da mesa.
- **Medido (`colunas.mjs`):** a 1378, 1280 e 1024 px, o centro da mão, das numéricas e dos botões coincide com o da sua coluna (±1 px);
  os botões do Equipar ficam parados a cada carta posta e só mudam quando o Confirmar entra. **A 1024 px o Confirmar entre os selos não cabe
  na coluna de 30%** e a linha quebra (o Desfazer em cima, o Recomeçar embaixo): levado ao autor. Na vez de atacar, o Devastar e o Atacar
  empilham na coluna dos botões (lado a lado não cabem em 30%).
- **Conferido:** a faixa da dica (`z-20`, dentro do `main` `isolate`) fica abaixo da cena (`z-50`, fora do `main`).

## 2026-11-27 (1): a mão cheia, a dica do tutorial no PC e a Ressurreição em tinta

- **Achados do advisor, medidos (`mao-cheia.mjs`, `conferir.mjs`):** (1) com 4 especiais na mão a 1024 px, a mão do tamanho das cartas
  tomava a largura (a barra era `flex-1`, base 0) e as numéricas ficavam abaixo do mínimo; (2) no tutorial do PC, a dica no alto dos campos
  cortava a sua última fileira (~44 px a 1378 × 800), e no PC nada rola de volta; (3) a gaveta real no PC: 400 px pela direita, o foco no
  Fechar e de volta ao botão no Esc (certo); (4) o tablet (960 × 700): as especiais em retângulo ocupam ~30 px a mais (os campos rolam).
- **`0d61307`:** a barra com `pc:min-w-[640px]` e a coluna da mesa com `min-w-0` (sem ela, a largura definida da mão alargava a mesa além
  da tela, com os retratos do placar cortados). Medido: a 1024 a mão cede para 308 px; a última numérica termina antes do grupo.
- **`debb17f`** (`decisoes.md` 2026-11-27 (1)): no PC a dica é a faixa por cima do placar (`data-dica-faixa`, `absolute`, `z-20`, o
  `HintPanel` em linha no PC); medido: a última fileira à vista a 1378 e a 1024. O Ressuscitar da janela da Ressurreição em `SPECIAL`.
- **E2E:** o `tutorial.spec` procura a dica na página (não nos campos nem no histórico).

## 2026-11-26 (5): a D1 e as especiais de tinta (`decisoes.md` 2026-11-26 (8))

- **Achado do advisor (bloqueio):** as medições dos itens 1 e 2 usaram a semente `quatro8`, de mão vazia, o único caso em que a mão não
  reservava metade da faixa. Com especiais na mão e a coluna do histórico, as numéricas caíam sobre o Desfazer (58 px a 1378, 0 px a 1024;
  `c-aperto-ajuste1-1378.png`). O PR não podia sair sem o item 7; as fotos levaram a medida, e D2 (mão como hoje) foi mostrada como a que
  invade a 1024.
- **`5a709d3`:** a D1 (o histórico em gaveta também no PC, pela direita: `CLOSED` vira `sr-only` em toda tela, a folha do PC com
  `pc:right-0 pc:inset-y-0 pc:w-[400px]`; saem as props `top` e `tool` do `HistoryPanel`; o botão e o menu no campo do oponente; a dica
  do tutorial nos campos; a mesa com `pc:flex-[0_1_1600px]`; a mão com `--mao-natural` e `pc:flex-[0_1_auto]`) e o item 4 (`SPECIAL`,
  `SPECIAL_TITLE`, `.carimbo-tinta`, `DevastateIcon` e `CancelReflectIcon`; as especiais saem da área de informação para o grupo
  `data-botoes-principais`, num `flex-wrap` à esquerda do Atacar no PC e acima dele no celular).
- **Ruling:** o teto de 1600 px para a mesa (as fotos eram a 1378; sem teto, numa tela de 2560 a mesa esticaria) — marcado **[I]** na decisão.
- **Ruling:** sem espaço, as especiais quebram em linhas à esquerda do Atacar, e o título delas quebra (a 1024 px, "DEVASTAR A / DEFESA") —
  o Atacar nunca sai da ponta direita (x = 700 a 1024, x = 1054 a 1378, com ou sem carta escolhida). Marcado **[I]** na decisão.
- **Medido no navegador (`aperto.mjs`, `ate-atacar-d.mjs`):** a 1378 e a 1024, com K + A (semente `null`) e com J (`ajuste1`), a última
  numérica termina antes do grupo de botões. Fotos `d-atacar-*.png`.
- **E2E tocados:** o `tutorial.spec` procura a dica nos campos (não mais no histórico); o comentário do `training.spec`. O E2E não rodou
  local nesta sessão (vale a CI).
- **Armadilha:** um heredoc grande com aspas e crases foi recusado pelo shell; roteiros longos vão pelo Write.

## 2026-11-26 (4): ajustes rápidos depois dos testes (`decisoes.md` 2026-11-26 (7))

- **Branch `feat/ajustes-2026-11-26`:** `f3191f3` (a decisão), `3675e22` (itens 3 e 6, e a escolhida na frente do item 5), `9833fa0` (itens
  1 e 2).
- **Itens 3 e 6:** sai o `PICK_CARD_TEXT`; o `ORDER_QUESTION` fica `sr-only`; saem o `ORDER_MANUAL_TEXT`, o `ORDER_MANUAL_NO_CLOCK_TEXT` e a
  prop `hasDeadline` do `OrderPanel`; "A iniciativa foi sorteada…" e "…: a iniciativa não mudou." (esta é leitura minha: a pergunta ao autor
  descreveu por engano uma frase que não existe).
- **Item 5:** `SELECTED_FRONT` (`z-[15]`, no `Hand.tsx`) na `<li>` da escolhida, na mão de especiais e no Equipar: acima do cadeado das
  vizinhas (`z-10`), abaixo do balão do motivo (`z-20`). A 360 px, 4 numéricas já cabem lado a lado (foto `a-escolhida-celular.png`).
- **Itens 1 e 2:** no `controls.tsx`, a `FACE` (o carimbo grande sem a altura), o `MAIN_SIZE` (`min-h-[68px] pc:min-h-[72px]
  pc:min-w-[300px]`) no Atacar, no Encerrar turno, no Confirmar e no Passar, e o `MainButton` (desenho à esquerda e a palavra em tipo de
  madeira). No PC, a barra, a ordem, a Ressurreição e o Equipar separam o que informa (à esquerda) do grupo `data-botoes-principais`
  (`pc:ml-auto`); o Cancelar entra à esquerda do Atacar (`pc:order-first`); no Equipar, a vaga de 300 px guarda os destinos centrados ou o
  Confirmar. Medido a 1378 px: o Recomeçar fica em x = 1032 em todos os passos; o Atacar e o Confirmar com 300 × 72.
- **Ruling:** a 360 px, o Confirmar entre os selos estourava a linha (369 px em 336) e empurrava o Recomeçar para fora da tela; o título dos
  principais sem tira tem 22 px no celular (o Atacar segue com 24) e o vão entre os selos e o Confirmar é de 6 px — custo: 2 px a menos no
  título do Confirmar e do Passar no celular.
- **Fotos dos itens 4 e 7** (fora do git, `docs/superpowers/specs/2026-11-26-ajustes-fotos/`, roteiro `direcoes.mjs`, semente literal `null`):
  item 7 em três direções (D1 o botão no campo do oponente, como no celular, mesa na largura toda e mão do tamanho das cartas; D2 o botão com a
  palavra na faixa do meio, largura toda e a mão como hoje; D3 a aba na borda direita, mesa em 1100 px e mão do tamanho das cartas), todas com
  o histórico numa gaveta por cima da mesa (`7-d1-aberta.png`); item 4 nas identidades A (tinta e título ouro) e B (uma cor por jogada) e nos
  lugares linha, empilhadas e à esquerda. O protótipo (`src/proto.ts`) foi apagado e os arquivos voltaram por `git checkout`.
- **Achados:** a vaga fixa de 300 px deixa um vão entre os selos e os dois destinos; as especiais empilhadas fazem a faixa de baixo crescer e
  cortam o seu campo; no celular, os retângulos grandes das especiais ocupam muita altura. **Correção (2026-11-27):** só o segundo foi levado
  ao autor nas perguntas; o primeiro e o terceiro foram ditos na mensagem final do bloco.
- **Armadilha (de novo):** crases dentro de `node -e "…"` foram executadas pelo shell e apagaram trechos de dois arquivos (refeitos pelo
  Edit). Roteiros com crase: Write e `node arquivo.mjs`. E o grep dos textos tirados tem de varrer `test/` inteiro: dois testes
  (`training`, `tutorial`) escaparam do primeiro grep e só o pre-commit os pegou.

---

## 2026-11-26 (3): o PR #15 mesclado; o PR 3 (os níveis)

- **PR #15 mesclado** (`0e22f94`, `decisoes.md` 2026-11-26 (3) a (5)): esmaece em 2,2 s e acaba em 2,65 s; a chamada do som no pouso do
  Coringa (`revealCueAt` 1390, `revealAt` 1690).
- **PR 3, `feat/niveis-identidade`:** `9718709` (o humor `bravo` no `ResultMedal`; o `LevelChoice` com `data-nivel`, o medalhão
  `aria-hidden` com `data-humor` e o nome e a linha numa coluna; o `menu.css` com a faixa de 14 px na cor do nível e o medalhão de 58 px).
  Fotos em `docs/superpowers/specs/2026-11-26-pr3-niveis/`. Sem decisões novas no caminho: é a direção A do protótipo, um desenho só.
- **PR #16 mesclado** (`20c999b`, `decisoes.md` 2026-11-26 (6)), com os quatro jobs verdes no último commit. O plano terminou; o ledger
  (`.superpowers/sdd/2026-11-26-equipar-abertura-niveis/`) saiu, e as decisões tomadas no caminho ficam nas entradas (1) a (3).
- **O que fica:** o deploy é do autor (o site segue em `9ba36c1`); a tarefa 3 (retomar o treino depois de recarregar) espera a resposta dele.

: o PR #14 mesclado; o PR 2 (a abertura sem título)

- **PR #14 mesclado** (`35d9239`, `decisoes.md` 2026-11-26 (2)): o GitHub recusou o merge automático (o repositório não o permite); o merge
  foi à mão com os quatro jobs verdes.
- **PR 2, `feat/abertura-sem-titulo`:** `f9f54e4` (saem o título, a aura, o anel e as faíscas, o `INTRO_TITLE` e os keyframes; esmaece em
  1,9 s e acaba em 2,35 s; a pista `abertura-titulo` começa em `revealCueAt` 1000 e a chamada cai na virada, `flipAt`), `f112c19` (o
  `abertura.spec` com a duração nova), `0456f25` (o pouso do Coringa no modelo: `coringaInAt` 1450 e `revealAt` 1690; o CSS lê
  `--t-entra` e `--t-pousa`).
- **Ruling:** o pulo do Coringa disparava no carimbo do título (`--t-titulo`); sem a variável, a animação inteira do Coringa ficaria
  inválida. Ele passa a disparar no pouso (`revealAt`), que agora mora no modelo (o "+390 ms" que eu tinha posto no CSS feria "o ritmo muda
  no modelo"). — custo: nenhum.
- **Achado do advisor, levado ao autor:** com `fadeAt` 1900 o Coringa pousado fica ~0,2 s parado, não os ~0,6 s da spec (a conta media da
  virada do maço, não do pouso), e a chamada do som (na virada) cai ~390 ms antes do pulo. O teste agora mede do pouso (≥ 200 ms). As opções
  (a) 1,9/2,35 e (b) ~2,2/2,65, e o som no pouso, vão no PR.
- **PR #15 aberto.** O autor escolheu (b) (`decisoes.md` 2026-11-26 (3)): `fadeAt` 2200 e `total` 2650; o teste do tempo parado mede do
  pouso e pede ≥ 500 ms (foi RED com 1900).
- **A chamada no pouso** (`decisoes.md` 2026-11-26 (4)): `revealCueAt` 1390 e o sintetizador conta a chamada a partir de `revealAt`; o
  teste pede `revealAt − revealCueAt = 300` e a pista depois da virada (foi RED com 1000). `abertura.spec` e `sound.spec`: 16/16.
- **Armadilha:** o grep do plano não pegou o literal `toBeGreaterThanOrEqual(3000)` do teste do áudio bloqueado no `abertura.spec`: a
  duração mora em literais dos E2E também. Procure os números, não só os nomes.
- **Armadilha (de novo):** crases dentro de `node -e "…"` foram executadas pelo shell (só "command not found"). Roteiros com template string:
  Write e `node`.

: as seis tarefas de 2026-11-25; o PR 1 (o Equipar sem texto)

- **Pedido:** `decisoes.md` 2026-11-25 (1) a (7) e 2026-11-26 (1). Fotos das direções (fora do git): `2026-11-25-equipar-direcoes/` (A e B,
  reprovadas), `-equipar-sem-texto/` (X e Y), `-equipar-y/` (a Y, o mostruário das artes, a mão aproximada × como hoje), `-niveis-direcoes/`
  (A aprovada). Spec e plano aprovados; execução nativa.
- **Tarefa 3 (a queda no treino), medido:** sem caminho no código que leve à escolha de nível no meio da partida (só abrir `/treino` do zero);
  logo, a página recarregou. No Chromium a 390 × 844 @3×, 8 min cada, o processo da aba: Cordel 186 → 234 MB, `bestiario:egipcio` 247 → 304 MB
  (41 imagens); depois de ~100 s sobe ~3 MB/min com ruído, sem vazamento claro; o heap do JavaScript ~13 a 24 MB. As artes: 24 WebP de
  416 × 582. Não reproduz o iOS. A proteção (retomar o treino) espera o autor.
- **PR 1, `feat/ajustes-2026-11-25`:** `62733a2` (figuras novas, selo sem legenda, `.carimbo-destino` 56/64), `ae37661` (`EquipArt.tsx`;
  o `useMarkTip` extraído da `MarkFigure`, sem mudar o comportamento), `4c2eab2` (o painel na Y; saem `DESTINATION_SHORT` e `leavingShort`),
  `00e3065` (o Passar, a mão vazia, a dica do tutorial), `3712012` (o E2E do tutorial com a dica nova; o `CLAUDE.md`), `9f0e604` e
  `3eb38de` (o selo da quadra fora do painel).
- **Ruling:** os scripts do skill procuram "Task N" e o plano diz "Tarefa N": segui à mão, com a BASE de cada tarefa no ledger — custo:
  nenhum.
- **Ruling:** o catálogo das animações sem fim (`phases.test`, "nunca pisca") ganha `ponto-enviando` (12) — a animação nova da spec,
  parada no movimento reduzido — custo: nenhum.
- **Ruling:** a dica do disco da recusa usa o cartão em portal da `MarkFigure` (`MarkTipCard`, fixo à tela), e não um `absolute` no
  painel — os campos rolam por dentro e cortariam a dica — custo: nenhum.
- **Ruling:** `NoCardsArt` com os dois textos em nós `sr-only` separados (os testes acham cada frase); a carta pequena da troca com
  `data-carta-sai`; o `PassButton` como um `<button>` direto (o `SquareStamp` do protótipo não voltou) — custo: nenhum.
- **Ruling:** o selo da quadra no canto do painel tapava, a 360 px, o índice da numérica da direita. No celular ele fica acima do painel
  (`bottom-full`) e cobre, enquanto a quadra do rascunho existir, a legenda de uma especial da mão (travada no Equipar); no PC fica à esquerda
  das cartas (acima cobria o canto do campo; à direita, o histórico) — custo: o rótulo de uma carta encoberto por instantes no celular.
- **Menores adiados:** a dica do tutorial fica "…o escudo (Defesa) (ou arraste…)", dois parênteses seguidos (texto aprovado); o motivo da
  recusa é lido duas vezes pelo leitor de tela (o status e o nome do botão).
- **Armadilha:** `node -e "…"` com crases dentro de um template de JavaScript executou as crases no shell de novo (só "command not found"):
  roteiros com template string vão por arquivo (Write) e `node`.
- **Armadilha:** a foto de uma janela de reação sai com o véu da cena; espere `[data-palco]:not([data-ocupado])` antes da foto. O Passar
  manual aparece com `coringa:prefs = { "autoPass": false }`.

: o C (o Cordel Escuro sai) e o D (o fim de partida na Faixa de feira)

- **Fecho:** PR #11 mesclado (`1ab7975`, depois de a CI pegar a linha da trava no plural, consertada em `1f98016`) e PR #12 mesclado
  (`67db244`). A primeira versão do D reprovou no smoke (o `past-games-copy.ts` no inicial); o E2E local com troca de branch no meio deu
  uma falha falsa no `mobile.spec` (rodar de novo com a árvore parada passou).
- **Armadilha:** não troque de branch com o `pnpm e2e` rodando: o Playwright lê os specs aos poucos e o resultado não vale.

- **PR #10 mesclado** (`51e9f4b`, `decisoes.md` 2026-11-24 (12)): o repositório não permite o merge automático do GitHub; o merge foi à
  mão, com os dois jobs verdes.
- **C, `feat/sem-cordel-escuro`, PR #11** (`d2aa89d`): o `cordel-escuro` sai do `DECK_IDS`; o bot do treino volta ao Cordel; saem o
  `useCardTone`, o `data-tom="escuro"`, o verso escuro e as regras do `styles.css`; o `CLAUDE.md` acompanha.
- **Ruling (C):** os testes voltaram por `git apply -R` dos trechos de teste do `0c2175a` e do `808e4de` (o `85b0d7a` só mexia no
  esmaecer) — custo: nenhum, aplicou limpo.
- **Ruling (C):** o `isCordelDeck` ficou, com um caso só (`deck === 'cordel'`), para não mexer nos chamadores; o seletor de decks volta à
  fila (o 2 × 2 era por causa do quarto deck).
- **Ruling (C):** o `cordel-escuro` guardado (preferência, sala, replay) vira o Cordel no `normalizeLook`, que todas as entradas já usam;
  um teste do protocolo confere — custo: nenhum aviso ao jogador (a aparência muda sozinha para o Cordel).
- **D, `feat/fim-faixa`** (`23da9ca`, saída da ponta do C): spec `docs/superpowers/specs/2026-11-24-fim-de-partida-faixa-design.md`
  aprovada (2026-11-24 (13)). O `EndPanel` vira a faixa; `ui/table/ResultMedal.tsx` (o Coringa feliz, triste ou sério); o `resultStamp`
  no `copy.ts`; fotos do painel implementado em `2026-11-24-fim-direcoes/implementado-*.png` (por um `.ts` temporário com o Playwright
  do projeto, a derrota no treino e a vitória numa sala com a Duda desistindo).
- **Ruling (D):** a `Modal` ganhou `framed={false}` (sem a borda, o fundo e o respiro de papel) para a faixa ocupar a largura — custo:
  uma opção a mais na `Modal`.
- **Ruling (D):** o medalhão é sempre o Bufão (P1), com as expressões novas desenhadas no traço do `Coringa.tsx`; o `data-resultado` sai de
  uma função própria do `EndPanel` (a mesma conta do `pastGameResultKind`): importar o `past-games-copy.ts` puxava os textos da tela
  `/partidas` para o JavaScript inicial, e o smoke barrou — custo: três linhas repetidas.
- **Ruling (D):** o carimbo é `aria-hidden` e o título de leitura fica em `sr-only` com o `resultTitle`; a frase visível "Duda venceu."
  é `aria-hidden` e o motivo segue sendo a descrição do diálogo — custo: nenhum, o nome e a descrição do diálogo são os de antes.

---

## 2026-11-24 (2): o PR B, a Defesa Absoluta em duas fases e o Reflect novo (regra 7)

- **Branch `feat/regras-4q-reflect`**, rebaseada na `main` depois do #9. Spec `docs/superpowers/specs/2026-11-24-defesa-absoluta-reflect-design.md`
  (aprovada, `decisoes.md` 2026-11-24 (8)); plano `docs/superpowers/plans/2026-11-24-defesa-absoluta-reflect.md` (5 tarefas, nativo, advisor
  depois do motor, do portão e do E2E).
- **Tarefa 1** (`eb5aafa`): `fullDefense` no `combat.ts`; o escudo (`absoluteDefense`) acaba sem tirar Q; com 4 Q a frente da Defesa fica
  (também de quem refletiu); o Reflect devolve `ATK − defenseBase`, quebra todos os K e deixa os Q (sai `breaks.attackerQueens`); o
  `reflectedDamage` dos bots; golden regravado; `RULES_VERSION` 7. **Tarefa 2** (`52db3fd`): `STATE_SCHEMA` 7, `PROTOCOL_VERSION` 2, as
  regras escritas. **Tarefa 3, código** (`31c0892`): o texto e a mesa do terminal, a métrica `absoluteDefenseAtCap` com `fullDefense`.
- **Ruling (T1):** motor, bots, golden e versão num commit só: o pre-commit puxa o `golden.test.ts` e o `rules-version.test.ts` a cada
  mudança em `engine/src`, e o golden joga com bots — custo: um commit grande.
- **Ruling (T1):** a conferência do golden: em 6 das 8 partidas que mudam, o primeiro passo que diverge vem depois de um Reflect ou do fim
  do escudo; `greedy-0` e `greedy-1` divergem por uma Armadilha num K (o `6536e9c`, de 2026-11-16, mudou o greedy depois da última
  gravação, e o golden só reproduz passos, não regrava bots) — custo: nenhum, o desvio era velho.
- **Ruling (T1):** o `resurrection-window.test.ts` lia a fixture `exodia-devastacao` do E2E até o fim; ela diverge no passo 272. Os 200
  primeiros passos (5 Ressurreições, o formato sem `resurrectOnQuad`) foram copiados para `engine/test/fixtures/legacy-no-resurrect-key.json`
  — custo: um arquivo de 13 KB no teste do motor.
- **Ruling (T2):** o `lobby.test.ts` usava `protocol: 2` como a versão errada; virou `PROTOCOL_VERSION + 1`, e os literais `1`, a constante.
- **Ruling (T3):** a métrica `cappedWithAbsoluteDefense` mudou de sentido (conta os 4 Q em qualquer fase): o antes e o depois da
  calibração só comparam o `capped` e a duração. Sem teste próprio (montar uma partida que bate o teto com 4 Q custa mais que a linha).
- **Tarefa 4 (web), até aqui:** 14 testes da conta do Reflect (`copy-lethal*`, `action-bar`, `phases`) com os números novos (o meu Reflect
  contra mim volta 129, era 141; o dele, 70, era 77); a ajuda (`RULES_SECTIONS`) e o motivo `TARGET_PROTECTED` falam do escudo; o
  `ownSpentIds` não liga mais um Q ao fim do escudo.
- **Armadilha:** crases dentro de `node -e "…"` no Bash viram substituição de comando (um título de teste saiu vazio); scripts com
  template string vão por arquivo.
- **Tarefa 4** (`c0fbb83`): a web. **Portão do Difícil** (`0d1190e`): aprovado, mas o (a) caiu de 72,5% para 65,5% (margem 2,2 EP).
  **Calibração** (`b58c493`): nenhuma partida no teto, duração igual (greedy × greedy, mediana 12, p90 23 → 24).
- **Tarefa 5** (`36f6b3d` e `6290884`): `packages/sim/scripts/continuar-fixture.ts` guarda os passos da partida antiga e continua com os
  mesmos bots. absolutos (66 passos + greedy × greedy, golpe final 97→98), reflect (363 + greedy × turtle, o Reflect devolve 21 no
  176→177), exodia-devastacao (272 + turtle × turtle, Exódia 627→628), especiais (85 + greedy × greedy: o 99 segue com 4 J e a sequência
  3, a 5 no 110, a 10 no 160, a Armadilha do Bot no 105→106, o golpe final 168→169). `pnpm e2e`: 130 + os 14 consertados.
- **Ruling (T5):** a especiais guarda só 85 passos (antes do fim do escudo, no 85): com os 99 legais, as continuações não davam a
  sequência 3 com os 4 J no 99. Em 2000 sementes, nenhuma continuação tem os seus 3 K: o teste da brasa olha os 3 K do Bot no passo 618
  da exodia-devastacao — custo: o teste passa a ser do lado do Bot.
- **Ruling (T5):** o `fluidez` (a Devastação rola os campos) dependia da faixa "outra versão" para a fileira do Bot ficar fora de vista no
  celular; agora o teste põe os campos no fim antes do passo — custo: nenhum, a prova (rolou, e nenhuma carta foi animada) é a mesma.
- **A dica do tutorial** (`d5c8003`) ainda dizia "perde os K e Q". **PR #10** aberto como rascunho.
- **As fotos** (fora do git): `docs/superpowers/specs/2026-11-24-cordel-direcoes/` (reprovadas: o Cordel Escuro sai),
  `2026-11-24-fim-direcoes/` (a B ajustada, `prototipo.html?dir=b2`, aprovada) e `2026-11-24-fortaleza/` (o muro de pedra, aprovado).
- **A Fortaleza e o transbordo** (`257a61e`): o nível 4 da zona dos Q (o 3 segue sendo o escudo, que os testes já conferiam); durante a
  cena do começo do escudo a zona fica na muralha (a insígnia ainda não chegou), e só vira Fortaleza na batida do fim do escudo. No PC a
  coluna dos especiais tinha 228 px fixos e a quarta carta passava 13 px do campo, sob o histórico: agora é
  `max(228px, 5,9rem + 0,625rem + 4 cartas + 9px)`. `pnpm e2e`: 133 verdes.
- **Ruling (Fortaleza):** nível 4 e não reordenar (3 Fortaleza, 4 escudo): o 3 do escudo está em testes e E2E — custo: o número do nível
  não segue a força (o 4 é um estado à parte; o comentário do `zone-level.ts` diz isso).
- **Ruling (transbordo):** a conta usa 4 cartas (o `buffLimit` padrão; o CSS não lê a config) — custo: com um limite maior a zona
  sobrepõe as cartas, como já fazia acima de 4.
- **Armadilha:** a mesa no PC só mostra 4 Q por um turno na regra 6; na 7 eles ficam: conferir larguras com o estado que dura.

---

## 2026-11-24 (1): as cinco tarefas depois dos testes; o PR A (a CI e as partidas salvas)

- **Pedido:** `decisoes.md` 2026-11-24 (2) a (7), com três rodadas de perguntas (a regra dos 4 Q em duas fases, o Reflect novo, o
  rearme do escudo, o que incomoda no Cordel Escuro, onde vale o fim de partida, o estilo da arte, as partidas salvas).
- **Achados:** sob a Defesa Absoluta nada tira um Q (por isso a regra pedida, sem a saída no fim do turno, deixaria a Defesa eterna); as
  partidas salvas moram no `localStorage` de cada jogador, sem custo na Cloudflare (o Durable Object da sala sai 30 min depois que todos
  saem, ou 24 h depois de criado: `idleExpiry` e `hardExpiry`, `room-core.ts:114`); o replay re-simula os passos no motor de agora (a
  mudança de regra mexe nas fixtures do E2E).
- **PR A, `feat/ci-salvos`** (`fae2708`): o job `e2e` com `timeout-minutes: 20` (o `check` fica em 15); `MAX_PAST_GAMES` 10 e
  `MAX_PAST_GAME_AGE_MS` 30 dias; o `e2e/fixtures.ts`.
- **Ruling:** a leitura só esconde a vencida; ela sai do disco na gravação seguinte (gravar uma partida, anexar o replay ou apagar
  uma) — custo: a vencida ocupa o `localStorage` até lá, invisível; ler sem efeito colateral mantém o `useState(() => load…)` puro.
- **Ruling:** `now` obrigatório em `loadPastGames`, `findPastGame`, `attachReplay` e `deletePastGame` (o núcleo não lê o relógio) —
  custo: as telas passam `Date.now()`.
- **Ruling:** as fixtures do E2E entram com a data de agora (`fixtureText`, `fixtureGames`); a de 2026-10-30 sumiria da lista em
  2026-11-29 — custo: nenhum, nenhum E2E confere a data.
- **Ruling:** os testes do teto de 1 MB usam replays de 120 mil caracteres (com 10 partidas, os de 60 mil não passavam do teto).
- **Armadilha:** um `cat > arquivo` sem heredoc no Bash espera a entrada e trava o comando: grave scripts com a ferramenta de escrita.

---

## 2026-11-23 (3): a cura que se vê, as placas e o histórico: spec, plano e tarefas 1 a 3

- **Pedido:** `decisoes.md` 2026-11-23 (7) a (10). Branch `feat/cura-historico-visitantes`, saída da `main` em `14adfff`. Protótipo das
  direções em `docs/superpowers/specs/2026-11-23-cura-direcoes/` (A · Seiva, a escolhida); spec
  `docs/superpowers/specs/2026-11-23-cura-placas-historico-design.md` (aprovada, com som); plano
  `docs/superpowers/plans/2026-11-23-cura-placas-historico.md` (9 tarefas; execução nativa, com o advisor depois das tarefas 3, 6 e 8).
- **Achados que mudaram o desenho:** com uma decisão esperando, a linha do tempo inteira cabe em 1 s (`DECISION_CAP_MS`): era por isso
  que a cura quase não aparecia; o motor corta a cura na vida inicial (`Healed.amount` é o líquido); o Roubo cura com o bônus da fileira do
  **oponente**; no Equipar, outra carta pode cair no cemitério depois da que curou.
- **Tarefa 1** (`d9448e7`): a linha de `/partidas` e as do Lobby com `text-tinta`; a lista marca o resultado (`data-resultado`,
  `pastGameResultKind`; a faixa, o degradê e a palavra em `#1f5c2c` / `#9a1f16` no `menu.css`); `e2e/menu-verde.spec.ts` (o axe em `/`,
  `/jogar`, `/treinar`, `/opcoes`, `/treino` e `/partidas` no verde, e a medição do contraste da palavra sobre o degradê); a Duda do
  `online.spec.ts` no verde (a tela de entrar e a Sala de espera).
- **Tarefa 2** (`d723709`): `HEAL_MS = 1_400` e `healsMs` na `stepAllowanceMs` (o servidor, a web e o Bot do treino dão folga a cada
  `Healed`, também o de vida cheia).
- **Tarefa 3** (`fcdae83` e o reforço deste commit): `engine/test/heal-gross.test.ts`: num passo com cura da Defesa, as Q de quem curou são
  as mesmas antes e depois (as 11 de referência e 90 sorteadas).
- **Ruling (T1):** o E2E do verde não foi visto falhar no código velho; o RED foi o do teste de unidade (`data-resultado`, `text-tinta`).
  A medição do contraste foi vista falhar com o verde da mesa (3,98:1) — custo: nenhum, o axe e a medição pegam o texto em branco.
- **Ruling (T1):** o axe não julga texto sobre degradê (fica "incompleto"); a conta do contraste da palavra é feita no E2E, com a cor
  misturada em oklab lida em pixel — custo: se o degradê mudar de forma, a amostra (o ponto mais escuro) precisa acompanhar.
- **Ruling (T3):** 90 partidas sorteadas (10 s) em vez de centenas (50 s no `pnpm check`); a conferência compara as Q antes e depois do
  passo (pega também a Armadilha e o Sacrifício, que não emitem `BuffRemoved`) — custo: um caso raro que só 300 partidas achariam.
- **Ruling (plano):** os títulos das tarefas viraram "Task N (Tarefa N)" porque o script do ledger só reconhece "Task".
- **Armadilha:** o `playwright.config.ts` lista os specs de cada projeto (`testMatch`): um spec novo fora da lista não roda (nem avisa).
- **Tarefas 4 e 5** (`aa00523`): a batida `heal` (sem teto, `HEAL_MS`, também com a vida cheia; a reconexão como antes), o `HealFx` (o
  bruto, o líquido, a conta, a carta e a origem), a marca própria `healArrived` (a vida conta em `countMs` a partir da chegada), o brilho
  na barra e o pulso do número. **Tarefa 6** (`0dd7ee5` e o conserto seguinte): a `HealLayer` (`ui/anim/Heal.tsx`).
- **Ruling (T4/T5):** as duas num commit só: a 4 sozinha deixava 3 testes do placar vermelhos (a batida de cura passa a durar 1,4 s e o
  "+N" vira o carimbo) — custo: um commit maior para revisar.
- **Ruling (T6):** a essência antiga do `Leaving` (até o retrato, bloco A do playtest, ponto 9) saiu; a gota da direção A a substitui, e um
  teste garante que ela não volta — custo: nenhum, a direção A foi escolhida no lugar dela.
- **Ruling (T6):** a origem da gota é a carta do `Healed` se ela estiver na mesa (o topo do cemitério, ou a roubada na fileira), senão o
  monte — uma regra só para o Equipar (outra carta por cima) e o Roubo — custo: nenhum.
- **Ruling (T6):** com movimento reduzido a vida salta no começo da linha do tempo (a regra de antes, `IDLE_LIFE`), e não na chegada como
  diz a spec §4.2; o carimbo aparece na chegada e fica na ponta da vida já final — custo: a vida muda ~0,8 s antes do carimbo, só com
  movimento reduzido.
- **Ruling (T6):** na primeira cura da partida (a faixa que ensina no ar), o carimbo sobe para a ponta da barra, em vez de pender abaixo
  dela: no celular ele encostava na faixa (foto com a faixa forçada em toda cura, edição local desfeita) — custo: nessa cura ele cobre a
  ponta da barra por ~2,6 s.
- **Consertos da revisão (T6):** a saída das faíscas contava a chegada duas vezes; com movimento reduzido, a ponta da vida somava a cura de
  novo. Os dois com teste visto falhar.
- **E2E completo depois da T6:** 133 verdes, 4 pulados (a cura mais longa não quebrou nenhum).
- **Tarefa 7** (`cabdf72`): a pista `cura` (o brilho, o glissando com o sopro, o arpejo de mi maior na chegada), baixa (≤ 0,14), dos dois
  lados, também com movimento reduzido (o `Stage` não corta o som), muda na reconexão.
- **Tarefa 8** (`8f86965` e o conserto seguinte): `ui/table/MarkFigure.tsx` e `mark-tip.ts`; o `StatePlate` saiu; o título do Reflect
  virou a figura dele; o coração da cura em papel; a regra do `data-sem-pulo` no `CLAUDE.md`.
- **Ruling (T7/T8):** a remoção do `StatePlate.tsx` entrou por engano no commit do som (o `git rm` fica em stage); os dois commits locais,
  ainda não enviados, foram refeitos com `reset --soft`, cada um compilando sozinho — custo: nenhum.
- **Ruling (T8):** a dica fecha no rolar só quando o que rolou contém a figura (a página ou o campo): o histórico desce sozinho a cada
  batida e a fechava com o mouse em cima — custo: uma dica que fica no ar se um contêiner que não a contém rolar por baixo dela.
- **Ruling (T8):** o botão da figura leva `aria-expanded` (o plano pedia); a dica é `aria-hidden`, e o nome do botão já diz tudo — custo:
  o leitor de tela anuncia "expandido" sem conteúdo novo (fica como menor adiado).
- **Mesclado** em 2026-11-24: PR #8, squash `eddfeb3` na `main`, com o "sim" do autor. A CI do commit final: `check` verde nos dois
  disparos; `e2e` verde no do PR (11 min 44 s) e cancelado por tempo no de push (passou dos 15 min do job). O deploy é dele.
- **Ajustes do autor depois de jogar** (`decisoes.md` 2026-11-23 (11)): a pista `cura` ficou só com o arpejo e os brilhos da chegada (a
  gota voa muda); o medalhão das marcas passou a 24/32 px (o disco de ouro do ataque, com o mínimo de toque no celular), a cura com o
  acabamento dele em verde (`.marca-cura`), o ícone `size-4 pc:size-[22px]` e o selo da Ressurreição a 15 px. Fotos novas em `final/marcas-*`.
- **Fechamento (T9):** `CLAUDE.md` (a cura passiva e as marcas) e o `LEIAME.md` das direções (`953a61f`). `pnpm e2e` completo: 132 verdes,
  4 pulados, 1 falha da T8 (o `resurrection.spec.ts` procurava o texto da placa velha; agora o botão pelo nome acessível, sem afrouxar),
  que passou depois de trocada (junto com o `replay.spec.ts`, 9 verdes). Revisão final do advisor, sobre as costuras (folga, vida, carimbo,
  replay, CSS): **conserto** do carimbo que ficava ~1,5 s no ar depois do `resync` do replay (voltar, "Início", a rodada): o `Stage` passa
  `cut || jump` à `HealLayer` (teste visto falhar).
- **Ruling (final):** a folga pode passar do teto de 8 s (Ressurreição 4,6 + momento 1,6 + duas curas 2,8 = 9,0); fica assim: o teto é de
  antes e já corta duas cenas juntas — custo: até ~1 s a menos de decisão nesse passo raro (relógio de 8 a 40 s).
- **Tarefa 9:** fotos finais em `2026-11-23-cura-direcoes/final/`; a cópia `public/tmp-cura` apagada (o Vite a levaria ao deploy);
  a medição A/B passou (o estado tem os números). **Armadilha:** com a bateria baixa a máquina estrangula e a medição dá 1 a 2 quadros/s nos
  dois lados; rode uma sonda (a Devastação, uma vez) antes da A/B.
- **Armadilha:** um `git rm` fica em stage e entra no próximo commit, mesmo com `git add` de caminhos explícitos; e o pre-commit rápido
  confere a árvore de trabalho, não o que está em stage: um commit pode não compilar sozinho.

---

## 2026-11-23 (2): a revisão do bloco e o Cordel Escuro refeito

- **Revisão** (`85b0d7a`): o `animate: { opacity: 1 }` em toda carta animada gravava `opacity` inline também nas que nunca entraram
  esmaecendo, por cima das classes da trava, do rascunho e do cemitério; agora só a carta que entrou guarda o alvo (`entered`, estado que
  liga quando o `enter` não é nulo), e o `card-enter.test.tsx` exige `style.opacity === ''` na que não entrou. **Achado à parte, de antes
  deste bloco:** a carta de rascunho do Equipar nas fileiras já mostra `opacity: 1` inline na `main` (o `layoutId` do Motion), e o
  `opacity-70` dela não vale; não mexido. Também: a quadra no escuro legível, o seletor de deck em 2 × 2 (`data-pares`), o `CLAUDE.md`
  (o `botLook` do Cordel oposto; todo treino grava `looks`).
- **O Cordel Escuro reprovado** (`decisoes.md` 2026-11-23 (3)): a inversão lisa era "muito amador". Três direções com grão, luz, filete e
  cantoneiras (`d25e12c`, pranchas no `docs/superpowers/specs/2026-11-23-cordel-escuro-direcoes/`) também caíram (4): o valor e o naipe
  têm de ter o mesmo tamanho nos dois decks, e o enfeite mudava a composição.
- **A versão aprovada** (`cca2263`, `decisoes.md` 2026-11-23 (4) e (5)): a geometria do claro (medida no dev server: as mesmas caixas do
  valor e do naipe, em proporção, e a mesma fonte), o fundo `#2a2a2a` com grão e luz suave, a borda `#141414`, o vermelho `#e53935` com
  degradê recortado no valor (`background-clip: text`; o naipe na cor cheia), o verso em dois tons do fundo e o brilho da quadra em ouro
  fraco (a faixa branca virava um risco no escuro). O contraste do vermelho é 3,4:1, escolha dele (o `#ff5a4e` daria 4,7:1).
- **Ruling:** nada de `filter` nem sombra desfocada na carta escura (a Devastação no celular); a textura é um `background-image` com o
  SVG de `feTurbulence` em data URI, como o `--grao-carimbo`.
- **Armadilha (de novo):** crases dentro de `node -e "…"` no shell; desta vez quase rodou um `pnpm e2e\`. Para texto com crases, use o
  Edit ou um arquivo no scratchpad.
- **Fecho:** o `pnpm e2e` local deu 128 verdes e 2 falhas do `looks.spec.ts` (o nome "Cordel" casava "Cordel Escuro"; `808e4de`, com
  `exact: true`). A memória limpa (`b405887`: o `estado.md` de 37 a 10 KB; o diário de 2026-11-03 a 2026-11-13 no `arquivo/`). PR #7, com
  as duas CI verdes em `808e4de`, mesclado por fast-forward com o "sim" dele (`decisoes.md` 2026-11-23 (6)). Sem deploy (é dele).

---

## 2026-11-23 (1): o Cordel Escuro, os carimbos do Equipar, o favicon e a carta presa quase transparente

- **Pedido:** `decisoes.md` 2026-11-23 (1) (cinco tarefas) e (2) (o Cordel escuro é um deck novo; o bot no oposto). Branch
  `feat/ajustes-producao`, saída da `main` em `6382a33`. Design: `docs/superpowers/specs/2026-11-23-ajustes-producao-design.md`; plano:
  `docs/superpowers/plans/2026-11-23-ajustes-producao.md`.
- **Cordel Escuro** (`0c2175a`): `cordel-escuro` no `DECK_IDS` (o segundo da lista), `isCordelDeck` no protocolo (a trava do Bufão nos
  dois). A carta ganha `data-tom="escuro"` (`useCardTone`, fora do Selvagem e da arte) e o CSS troca `--color-papel` ↔ `--color-tinta`
  só dentro dela, com o vermelho `#ef6a5c` (6,1:1 sobre a tinta); a seta da frente segue em papel. Verso: listras finas de papel na
  tinta, borda de papel (o `BACK_CLASS` e o `.momento-verso`). O `botLook` dá o Cordel oposto; o treino padrão passa a gravar `looks`
  (o bot é escuro, e o replay precisa saber). O `LOOK_LOCK_NOTE` virou "Os decks Cordel jogam com o Coringa Bufão."
- **Ruling:** as cores do tom vêm literais no `[data-tom='escuro']` (um `var()` de si mesmo seria ciclo). Seis testes da G1 antiga
  ("o treino padrão fica como hoje") foram reescritos para a decisão nova, não apagados.
- **Carimbos do Equipar** (`daa453f`): o `DestinationStamp` (64 × 56; 76 × 64 no PC; `.carimbo-destino`), a figura (a troca leva o
  `SwapIcon` no canto; o descarte, o `DiscardIcon`) e a palavra (`DESTINATION_SHORT`; na troca, `leavingShort`, "sai 9♠"); o nome inteiro
  no `aria-label` e no `title`. As cartas por pôr se sobrepõem como as da mão (a mesma conta de `--hand-w`) e o painel quebra linha: os
  carimbos descem em vez de encolher (no celular com 3 destinos; no PC só com 5 cartas e 3 destinos, o máximo do motor).
- **Favicon** (`9c930f5`): `public/favicon.svg` (os traçados do `Coringa.tsx`, chapéu em ouro, num quadrado de tinta) e o
  `apple-touch-icon.png` 180 px (quadrado cheio), tirado do SVG pelo Chromium do Playwright num script do scratchpad (não versionado). O
  smoke confere os dois links e os arquivos no `dist`.
- **A mão apagada** (`811c872`): reproduzida no treino (semente `bug1`, Equipar rápido duas rodadas): a K comprada ficou em 0,02 de
  opacidade, sem animação, escura sobre a barra e com o cadeado. A causa: o `animate` do esmaecer de entrada da `Card` (e do `CardBack`)
  só existia com `enter` não nulo; um `state` no meio da batida da compra troca a linha do tempo e o Motion parava a carta. O alvo fica
  sempre. Teste novo `card-enter.test.tsx` (falha sem o conserto). **[I]** É a leitura mais provável do relato dele; ele não disse em
  que momento viu.
- **Armadilha:** no shell, crases dentro de `node -e "…"` executam (de novo): três trechos do `EquipPanel` saíram vazios e foram
  consertados à mão. Para código com template literal, use o Edit.
- **Ficou:** o `pnpm check` completo, o `pnpm e2e`, o push e o PR; a limpeza da memória (bloco à parte, só documentos).

---

## 2026-11-19 (3): a abertura sem a logo LUSACAN

- **Pedido:** `decisoes.md` 2026-11-19 (6) ("remova lusacan productions da intro, deixe apenas a parte do jogo do coringa"). Branch
  `feat/intro-sem-logo`, saída da `main` em `2050a5d`.
- **Feito:** o `model/intro.ts` só com a parte do jogo, no mesmo ritmo, puxada para o começo (`themeAt` 150, título 1750, menu 3150); a
  curta (movimento reduzido) com o Coringa e o título parados, muda (`cues: []`). O `Intro.tsx` sem a logo nem o `useLayoutEffect` do voo;
  o `.abertura-tema` existe nas duas versões (na curta, só o Coringa e o título; no CSS, `animation: none` neles e um esmaecer no tema).
  Saíram o `LusacanLogo.tsx`, o `dragon-flight.ts`, o `dragon-flight.test.tsx`, as pistas `abertura-logo` e `abertura-logo-curta` e o
  `wingsOpen` do sintetizador. A marca da produtora fica no repositório, fora do jogo: o `lusacan-shapes.ts` foi para `scripts/` (ao lado
  do gerador), e o `lusacan-logo.test.tsx` virou `lusacan-assets.test.ts` (só os SVG byte a byte).
- **Ruling:** a marca do smoke para a abertura é a classe `abertura-palco` (o `data-abertura` não serve: é prefixo do
  `data-abertura-capa`, que está no inicial). No E2E, o total cai para 3 a 4,5 s (com a capa) e o pulo para < 2 s, para ainda separar um
  pulo de uma abertura inteira.
- **Conferido:** typecheck, lint e os testes afetados; no dev server, a completa (as cartas aos 0,6 s, o Coringa e o título aos 2,4 s, sem
  a logo) e a curta (pela preferência `reduceMotion`).
- **Armadilha:** um `git mv`/`git rm` deixa o arquivo em stage, e o commit seguinte (o da memória) o leva junto. Desfeito antes do push
  (`reset --soft`); commite a memória com `git add` de caminhos explícitos **e** sem nada de código em stage.
- **PR #6**, com o "sim" dele depois de ver no navegador (`decisoes.md` 2026-11-19 (7)): na `main` por fast-forward (`95cf2ed`), com o
  `check` e o `e2e` verdes no PR em `72f1414`; a `feat/intro-sem-logo` apagada. Sem deploy (é dele).
- **Ficou com o autor:** a `feat/intro-dragao-frente` (o vídeo da logo) e a pasta solta `docs/superpowers/specs/2026-11-19-intro-lusacan/`.

---

## 2026-11-19 (2): a mesa no Feltro, implementada

- **Pedido:** `decisoes.md` 2026-11-19 (4) (a B, com o rosa mais claro, seguir com a implementação). Spec e plano:
  `docs/superpowers/specs/2026-11-19-mesa-feltro-design.md`; as fotos do resultado em `docs/superpowers/specs/2026-11-19-mesa-feltro/`.
- **Feito** (`c1c08fe`): os tokens `--color-feltro-voce` (`#a45274`), `--color-feltro-oponente` e `--color-madeira-escura`; as utilidades
  `feltro-voce`, `feltro-oponente`, `trilho-madeira`, `madeira-escura` e `filete-ouro-baixo`; o filete e a costura em `.feltro::before` e
  `::after`; a barra de vida em trilho e o retrato com cantos; nos componentes, o campo em feltro com o texto em papel (as vagas, a seta da
  carta da frente e o botão do histórico e o do menu no campo do oponente em papel; as placas de estado e a etiqueta da quadra em tinta,
  porque herdavam a cor), o centro em madeira, o placar, o histórico e o fundo em madeira escura, os botões do replay em `.carimbo`.
- **Ruling:** os materiais são `@utility`, não classes do `@layer components`: só uma utilidade aceita variante (`pc:madeira-escura` no
  `main`, que é rosa no celular e madeira no PC; `pc:bg-none` tira a madeira da barra no PC).
- **Ruling:** o filete embaixo do placar é uma sombra por dentro (`filete-ouro-baixo`), não uma borda: a borda somaria 2 px à altura do
  placar, que o E2E mede (`expectHudFits`).
- **Ruling:** a sombra acolchoada do rascunho (`box-shadow` inset com 48 px de desfoque) saiu; a borda escura do pano é o próprio gradiente
  radial (um desfoque grande repinta caro quando o campo repinta).
- **Ruling:** o rosa: o meio do pano é `#a45274` (4,55 : 1 ao papel, o limite para as marcas pequenas), a luz do alto `#bd6c8b` e a borda
  `#86405f`; o rascunho era `#96496a` no meio. As marcas pequenas do seu campo ficam embaixo (celular) ou na coluna da direita (PC), onde o
  pano é o do meio ou mais escuro. O axe não mede contraste sobre gradiente (fica "incompleto"): a conta é esta.
- **Ruling:** no celular, o fundo atrás da mão é o pano rosa (`feltro-voce` no `main`: a mão é sua), e a barra de baixo é madeira escura.
- **Verificado:** a suíte da web (2997); o pre-commit (lint, typecheck, 1662 relacionados); as fotos no dev server (a jogada com arte e o
  Equipar no PC e no celular, o tutorial no celular).
- **Fica como estava:** as cartas, as cenas, o menu da partida, o fim e a dica; o desenho da desolação (o `filter` do `data-apagado`) vale
  por cima do pano.
- **A A/B:** `notas/medicao-mesa-feltro.md` (igual ou acima da `main`). **O PR #5**, com as duas CI verdes; na `main` por fast-forward com o
  "Sim, merge" (`decisoes.md` 2026-11-19 (5)).
- **Armadilha:** o auto-merge do GitHub não está liberado no repositório (`set_auto_merge` devolve "Auto merge is not allowed"): o merge
  segue por fast-forward, como nos PRs anteriores.

---

## 2026-11-19 (1): três direções para a mesa com a identidade dos menus

(As entradas do diário da logo em vídeo, se houver, estão na branch `feat/intro-dragao-frente`.)

- **Pedido:** `decisoes.md` 2026-11-19 (3): a identidade nova dos menus dentro da partida, a mesa com textura sem exagero, três direções.
- **Feito:** a branch `feat/mesa-visual` (saída da `main` em `3fd5565`); as três direções vestidas no app de verdade, numa folha de CSS
  cada, com as fotos de hoje para comparar:
  - **A · Capa:** cada campo é a capa do folheto (a luz do rosa do Início, o grão, a moldura dupla com os losangos vermelhos); o verde
    na mesma receita; o filete duplo nas faixas de tinta; o histórico num painel de papel com as rodadas em vermelho.
  - **B · Feltro** (a recomendada): o pano de feltro (rosa-vinho seu, verde do oponente) com a sombra acolchoada, o filete de ouro e a
    costura do fundo verde do menu; o centro vira o trilho de madeira com veio; o placar, o histórico e o fundo da mão em madeira escura;
    o texto dos campos em papel.
  - **C · Tinta:** a mesa de tinta com a luz do dono vindo do lado dele e a moldura dupla na cor do dono; filetes de ouro finos.
  - **Nas três:** os botões de contorno (o replay, o Fechar) viram carimbos de papel com a sombra de madeira; o Tocar, o carimbo de ouro.
  - **O placar em cada uma** (a barra amarela chapada era a peça mais antiga na tela): A, a barra e o retrato na moldura dupla e o ouro com
    o grão de papel; B, a barra vira um trilho arredondado com o filete de ouro sobre o feltro e o retrato ganha cantos; C, o ouro liso com
    um filete fino. Só a moldura e o fundo do `[data-vida]`: o `scaleX` dos filhos e os números ficam.
- **Arquivos:** `docs/superpowers/specs/2026-11-19-mesa-direcoes/` (`base.css`, `a-capa.css`, `b-feltro.css`, `c-tinta.css`, o
  `fotos.mjs`, as fotos em WebP e a página `direcoes.html`). A página publicada (privada, do autor):
  `https://claude.ai/artifact/GdD7tfjewgDmVEPLsNua58`. Para abrir sem ela: sirva a pasta num servidor estático e abra `direcoes.html`.
- **Ruling:** as direções são folhas de CSS injetadas por cima do app (no dev server não há CSP), em vez de pranchetas desenhadas à
  mão como nos menus — custo: só mudam o material (cor, grão, moldura, filete), o placar e os botões; o arranjo fica igual nas três,
  o que deixa a comparação justa, mas uma ideia que peça layout não aparece aqui.
- **Ruling:** a mesma jogada nas três (fixture `especiais`, rodada 17, com o oponente no deck Bestiário, para ver a carta de arte sobre o
  material novo) e o Equipar do treino (`semente=foto1`), a 1440 × 900 e a 390 × 844.
- **Para o código (quando ele escolher):** os seletores do rascunho (`section[data-campo]`, `section[aria-label='Situação da rodada']`,
  `aside[aria-label='Histórico da partida']`, os `!important`) não vão para o jogo: viram classes no `styles.css` e tokens novos (os de hoje
  não mudam de valor). Os pseudo-elementos `::before`/`::after` do `.campo` estão livres hoje. O `data-apagado` do campo (o `filter` da
  desolação) segue valendo por cima do material novo. O texto dos campos em papel (B e C) pede conferir o contraste das marcas pequenas e
  os testes que olham classe de cor.
- **Armadilhas:** o painel do navegador do app estava oculto, e as animações de entrada do menu não rodam assim: as fotos são do
  Playwright do projeto. O grão forte (`.grao`, alfa 0,7) com `multiply` deixa o papel cinza nos botões: use o `--grao-carimbo` (alfa 0,2).
  Nas mesas escuras (B e C), o botão do histórico do celular (borda e traço de tinta, no campo do oponente) some: passa a papel.
  O `git checkout` da `feat/intro-dragao-frente` para a `main` deixa sem rastrear os caches do HyperFrames em
  `docs/superpowers/specs/2026-11-19-intro-lusacan/prototipo/` (ignorados lá): não commitar.

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

As entradas de 2026-11-03 a 2026-11-13 estão em `arquivo/diario-2026-11-03-a-2026-11-13.md`; as de antes, em
`arquivo/diario-ate-2026-11-02.md`.
