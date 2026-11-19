# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-18**, os menus no Folheto, bloco encerrado; vieram da branch `feat/menus-visual` (já apagada; saída da
> `main` em `97a1a6b`; `decisoes.md` 2026-11-18 (1) a (6)), na `main` por fast-forward com o "Sim, merge" do autor (2026-11-18 (7));
> o PR #2 mesclado, as duas CI verdes no push da `main`; **no ar** em `https://jogodocoringa.com.br` desde o deploy `5f5821f`, rodado pelo
> Claude a pedido (2026-11-18 (8)). Antes dele estava no ar `97a1a6b` (a `main` com a abertura do jogo e a logo do dragão).
> Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **O redesenho visual dos menus, na `main`** (`decisoes.md` 2026-11-18 (1) a (7)): só a camada visual das telas fora da mesa e dos diálogos da
  partida; nada de regra, fluxo, estado, rede ou handler (se algo visual pedir lógica, parar e perguntar). Branch `feat/menus-visual`,
  no checkout principal (sem worktree).
  - **Feito:** as três direções em rascunho, mandadas ao autor: **A · Folheto** (a capa de cordel pendurada no barbante, sobre o rosa),
    **B · Matriz** (o taco entalhado: tinta com veio de madeira, título em ouro com a sombra de madeira; a recomendada) e **C · Noite**
    (a lua e a silhueta do Coringa, Cinzel e ouro, continuando a logo LUSACAN). Cada uma com o Início no celular e no PC e o menu da
    partida; mais as fotos de hoje. Os arquivos: `docs/superpowers/specs/2026-11-18-menus-direcoes/project/` (as pranchetas `.dc.html`,
    `base.css`, `a.css`, `b.css`, `c.css`, o `canvas.json`); o canvas privado do autor: `https://claude.ai/artifact/9cuwRLquhG6Hhu1AcjzEgy`.
    Como abrir sem o canvas: o diário 2026-11-18 (1).
  - **Segunda rodada, publicada** (`decisoes.md` 2026-11-18 (2)): **A2 · Folheto com menu** (o Início em três entradas, Jogar online,
    Treinar e Opções, mais Partidas anteriores num item menor; a capa sem o título grande, com o Coringa novo: piscando, com o leque dos
    quatro naipes atrás do chapéu) e **D · Mesa** (feltro à noite, o Coringa colorido dá as cartas, e as três entradas são cartas que
    balançam; botões grossos de cor; o Balatro só pela estrutura). Cada uma com o Início no celular e no PC e as telas Jogar online,
    Treinar e Opções no celular, ligadas por links (o Play do canvas navega). A rodada 1 ficou embaixo, no mesmo canvas.
  - **Terceira rodada, publicada** (`decisoes.md` 2026-11-18 (3): só o Folheto; a B, a C e a D saíram do canvas e da pasta, ficam no
    git): **A3 · Folheto** — o Coringa do jogo num disco de papel com o leque dos quatro naipes atrás da cabeça (sem raios, sem texto,
    sem varal); o menu em três mini cartas que respiram e inclinam em 3D sob o mouse, como a mão do jogo (`Hand.tsx`), e entram dando-se;
    as telas na cor da entrada (vermelho, verde, ouro), com painéis de papel arredondados. O Início em três fundos para ele escolher
    (tinta, anil, papel); o PC e as telas no fundo tinta. `a3.css` e as pranchetas `A3-*.dc.html`; a rodada 2 (A2) e a 1 (A) embaixo.
  - **Quarta rodada, publicada** (`decisoes.md` 2026-11-18 (4)): **A4 · Folheto** — o modelo da A2 (o Coringa em cima, o menu embaixo,
    também no PC) com o hover da A3; o Coringa do jogo maior que o disco, sem o leque; o menu em lista de quatro linhas (Jogar online,
    Treinar, Partidas anteriores, Opções), cada uma com a mini carta e o símbolo; três fundos parados para escolher (rosa com a moldura
    da capa, verde mesa com o filete e a costura, vinho com a treliça do verso); as telas internas com os carimbos de madeira da mesa.
    O PC e as telas internas no verde. `a4.css` e `A4-*.dc.html`; a A3, a A2 e a A embaixo.
  - **A4 aprovada, nos fundos rosa (padrão) e verde, com um controle discreto do tema** (`decisoes.md` 2026-11-18 (5)); ele pediu spec,
    plano e código sem parar. **Spec:** `docs/superpowers/specs/2026-11-18-menus-folheto-design.md`. **Plano:**
    `docs/superpowers/plans/2026-11-18-menus-folheto.md` (Tasks 1 a 6). **Feito e commitado:** Task 1 (`eafcf78`), Tasks 2 a 4
    (`cb35e32`), Task 5 (`1e4fcaa`), os E2E (`b723fe6`), o conserto do nome dos links que o `pnpm e2e` pegou (`1b8ce40`). A suíte inteira
    da web verde e o smoke (JavaScript inicial 191,4 de 200 KB). O `pnpm e2e` inteiro: 128 verdes e 2 do axe, consertados (os dois specs
    de novo: 8 verdes). Conferido no app de verdade (fotos do dev server): o Início rosa e verde a 390, 360 e 1440 px, Jogar online,
    Treinar, Opções, a escolha do nível, as partidas anteriores e o erro da sala. As decisões técnicas: o diário 2026-11-18 (5) e (6).
  - **No GitHub, PR #2 para a `main`** (`https://github.com/andr3serafim/jogo-do-coringa/pull/2`), com as duas CI verdes no push de
    `ee77578` (`check` 209 s; `e2e` 677 s). As fotos e o resumo foram mandados ao autor.
  - **O destino dos cinco links de criar sala (`/jogar`) está aprovado** ("Concordo", `decisoes.md` 2026-11-18 (6)).
  - **Na `main`** ("Sim, merge", `decisoes.md` 2026-11-18 (7)), por fast-forward até o topo de `feat/menus-visual` (este commit).
  - **CI do push da `main`** (`9f10887`): `check` (365 s) e `e2e` (617 s) verdes.
  - **No ar** (o deploy rodado pelo Claude a pedido, `decisoes.md` 2026-11-18 (8)): `pnpm deploy:server` na `main` em `5f5821f`, verde
    (web 2997 testes, o smoke, 17 arquivos novos subidos; versão do Worker `1fc2dd91-f600-4f60-919d-ec1b16d5235d`). O `/api/health`
    devolve `5f5821f` (no primeiro minuto, misturado com `97a1a6b`: as instâncias trocam aos poucos). Conferido no navegador: o Início
    rosa com as quatro mini cartas; no console, só o `beacon.min.js` barrado pela CSP (o ruído conhecido, abaixo).
  - **Próximo passo exato:** nenhum de código. O próximo trabalho vem do autor (o que ele achar usando os menus; os botões e a tipografia
    dentro da partida, quando ele pedir). **O bloco está encerrado** ("apague a branch feat/menus-visual. finalizado.", 2026-11-18): a
    branch `feat/menus-visual`, local e remota, foi apagada (estava toda na `main`, em `9f10887`).
    **Não visto no navegador:** a sala de espera (Lobby) com a roupa nova (precisa do `wrangler dev`); os E2E online passam por ela.
  - **O que não pode regredir:** o rosa por padrão sem gravar nada (`menuTheme` ausente); o tema não se perde quando o menu da partida
    grava as preferências (ele espalha `prefs`); o menu da partida, o fim e a dica com a roupa de antes (`useInMenu()` é falso fora da
    `MenuScreen`); o CSS do menu fora do `styles.css` (o `phases.test.tsx` conta as animações sem fim de lá); o JavaScript inicial ≤ 200 KB.

- **A abertura do jogo, com a logo do dragão, está na `main`** ("Sim, merge", `decisoes.md` 2026-11-17 (4)), por fast-forward até o topo de
  `feat/abertura` (`52452c0`), com as duas CI verdes no push da `main` (`check` 365 s; `e2e` 630 s de job, que o teto antigo de 600 s no
  Playwright não comportaria). **No ar:** o `/api/health` dava `97a1a6b` em 2026-11-18 (o deploy do autor). O worktree foi removido; ficam a branch
  local e a remota `feat/abertura` (mescladas; o autor pode apagá-las) e a tag local `abertura-antes-do-rebase`. A branch, de antes do merge:
  `feat/abertura` (worktree `.claude/worktrees/abertura`), refeita sobre a `main`
  em 2026-11-17 (a memória renumerada: a abertura é a 2026-11-16 (5); os commits de antes na tag local `abertura-antes-do-rebase`).
  `decisoes.md` 2026-11-16 (5) (a abertura) e 2026-11-17 (3) (a logo nova); o diário 2026-11-17 (2). O código em `b47a2af`. A abertura
  dura 5,35 s de desenho (5,6 a 5,8 s da capa ao menu); fica num pedaço à parte (o inicial em 187,4 KB).
  - **Verificado:** os testes relacionados no pre-commit; o smoke; a medição com a CPU 4× (57 e 59,5 quadros/s na logo); o E2E em
    partes (a execução inteira parou no teto antigo de 600 s, sem falha; o resto rodou à parte, verde; o `abertura.spec` verde no build
    final). O teto agora é 780 s (`0b2250e`): a CI da `main` já levava 545 s.
  - **O autor viu** a pose parada do dragão (as duas versões, mandadas na conversa); **não viu** a animação.
  - **No GitHub, com as duas CI verdes em `ee2ff6e`** (`check` 240 s; `e2e` 605 s de job, com o teto novo; o pre-push com o `pnpm check`
    inteiro verde, web 2960 testes). Os quadros do voo foram mandados ao autor, e a animação ficou aberta no painel (`web-abertura`, 5174).
  - **Próximo passo exato:** nenhum de código. O deploy (dele) leva a abertura ao ar; o próximo trabalho vem do autor.
  - **O que não pode regredir:** a abertura fora do JavaScript inicial (o smoke confere a marca `data-dragao-voo`); a capa que pula com
    clique e tecla; da capa ao menu ≤ 6 s (o `abertura.spec` mede); a marca `coringa:abertura = pular` só nos E2E; nenhum flash de tela. **O deploy é só quando ele pedir** (`decisoes.md` 2026-11-17 (2)).
- **O jogo está no ar em `https://jogodocoringa.com.br`** (o deploy do autor, 2026-11-17, `8266a4f`, sem a abertura; o diário 2026-11-17
  (1)): o bloco D, o conserto da Devastação, o das cenas que repetiam, o Roubo novo, o bot que barra a Exódia e o domínio. O `/api/health`
  devolve a versão; o `www` redireciona com 301 (regra no painel). **O próximo deploy** é o mesmo `pnpm deploy:server`; a conta já tem o
  subdomínio `workers.dev` (sem ele, o deploy falha com o código 10063).
  - **Ruído conhecido, não é erro do jogo:** o console mostra o `beacon.min.js` da Cloudflare Web Analytics barrado pela CSP
    (`script-src 'self'`). É a injeção automática da zona; desligar no painel (Web Analytics) ou deixar. Não afrouxe a CSP por ele.
- **O greedy barra a Exódia está na `main`** ("Sim, merge", `decisoes.md` 2026-11-17 (1)), por fast-forward de `feat/bot-exodia` até
  `2caeb5a`, com as duas CI verdes no topo da branch (`2caeb5a`) e no push da `main` (`355f2e6`). `GREEDY.exodiaWatch` = 2: o A vai num K da Guarda do oponente a 2 K da Exódia, na fase principal e na reação ao K
  jogado. A Exódia volta à meta (greedy × greedy 1,3%, turtle × greedy 6,3%); o portão do Difícil aprovado do zero (72,5% · 73,5% · p95
  140 ms). O diário 2026-11-16 (4); `notas/medicao-roubo-buff.md`, "Depois".
- **O Roubo mais forte está na `main`** ("Sim, faça o merge dos dois", `decisoes.md` 2026-11-16 (4); a regra em 2026-11-16 (1) e (3)):
  o valor da carta × (1 + J) do Ataque ou × (1 + Q) da Defesa, sem a quadra; o K não anula nem quebra; segue sem matar, sem contar para a
  iniciativa, bloqueado pela Defesa Absoluta. `RULES_VERSION` 6. A regra mora na chave `stealBuffed` (ligada no `makeConfig()`): os
  replays de antes, sem a chave, reproduzem o Roubo de antes, e a sala online aberta antes do deploy termina com ele. O diário 2026-11-16 (3).
  - **O que não pode regredir:** a chave `stealBuffed` (tirar o ramo das regras de antes quebra as fixtures do E2E e as partidas guardadas).
- **O domínio `jogodocoringa.com.br` está na `main`** (`decisoes.md` 2026-11-16 (3) e (4); o diário 2026-11-16 (2)): a rota
  `custom_domain` no `wrangler.jsonc`, no ar desde o deploy de 2026-11-17.
- **O conserto das cenas que repetiam está na `main`** ("Sim, merge", `decisoes.md` 2026-11-16 (2)): o véu do momento do oponente não
  traz mais de volta a última cena (`Stage.tsx`). O diário 2026-11-16 (1).
  - **O que não pode regredir:** a última cena só fica com a cortina **da cena** (`veil === 'scene'`); o véu do momento nunca a mostra.
- **A arte do cemitério saiu da fila** ("Todas as direções reprovadas. ignore esta demanda", `decisoes.md` 2026-11-16 (3)).
- **A config do pnpm desta máquina foi corrigida**: `storeDir: D:\.pnpm-store`, o mesmo store de todos os projetos dele.
- **As regras 4.0 estão na `main`** ("finalize", `decisoes.md` 2026-11-15 (1)), por fast-forward de `feat/regras-4-0b` até `b5f93e3` (a branch e o worktree já apagados),
  com as duas CI verdes no topo da branch e no push da `main` (`aa2a6b1`). O texto das regras é o `docs/JOGO-DO-CORINGA-4.0.md` (`decisoes.md` 2026-11-14 (4)); o diário 2026-11-15 (1).
  - **A §14 está confirmada** ("ok" às seis leituras): virou "Leituras confirmadas", e os comentários delas no motor dizem "confirmado
    pelo autor, 2026-11-15". Nada mudou regra (`RULES_VERSION` 5). O resto do texto descreve o motor e não foi revisado regra a regra:
    se o texto e o motor discordarem, vale o motor, e o texto é corrigido.
  - **Verificado:** `pnpm check` verde no pre-push da branch (web 2819 testes); `check` e `e2e` verdes em `b5f93e3`.
  - **Próximo passo exato:** nenhum de código. O próximo trabalho vem do autor (o que ele achar jogando o bloco D, ou uma resposta em
    lote às regras numeradas). Só docs e comentários: o deploy não muda nada no ar.
- **O bloco D está na `main`** ("Sim, merge", `decisoes.md` 2026-11-14 (3)), por fast-forward de `feat/playtest-bloco-d` (pontos 5 e 14: os
  botões de carimbo; o monte e o cemitério no centro, com a lápide). O código em `6359b60`. O plano `docs/superpowers/plans/2026-11-14-playtest-bloco-d.md`;
  o diário 2026-11-14 (2); as doze escolhas na §6.3 da spec do playtest; as telas e a A/B em `notas/medicao-bloco-d.md`.
  - **As escolhas são do Claude por delegação** (`decisoes.md` 2026-11-14 (1)): o autor as viu só resumidas, ao dar o "sim" do merge. Nunca
    as rotule como aprovadas uma a uma; mudam se ele pedir depois de jogar.
  - **Verificado:** `pnpm check` verde (web 2819 testes; JavaScript inicial 185,7 KB); `pnpm e2e` inteiro verde (115, 4 pulados); a revisão
    num subagente novo (nenhum Critical; os 2 Important corrigidos). A A/B passa o portão e **custa ~2 quadros/s na troca de mão**.
  - **A branch está no GitHub, com as duas CI (`check` e `e2e`) verdes em `08f728f`** (o commit seguinte só mexe nesta memória).
  - **CI do push da `main`** (`302bbaf`): `check` e `e2e` verdes.
  - **Próximo passo exato:** nenhum de código. O deploy é dele (`pnpm deploy:server`): leva o bloco D e o conserto da Devastação ao ar. O
    próximo trabalho sai do que ele achar jogando (as escolhas da §6.3, o Atacar com o Absoluto armado).
  - **O que não pode regredir:** a poeira é do `Leaving` e sai da página ao fim (uma animação presa no fim derruba os E2E que esperam a tela
    parar); só uma carta de verdade (`data-card-id`) na lápide; a faixa do PC com ≤ 70 px (mais que isso e os campos rolam em 1440 × 900);
    a etiqueta e a faísca do Absoluto fora do botão; a prévia do Atacar na tira lisa.
- **O conserto da Devastação com arte no celular está na `main`** ("Sim, merge", `decisoes.md` 2026-11-14 (2)), por fast-forward até
  `0402869`, com as duas CI verdes no topo da branch e no push da `main` (`491687c`). O `[data-campos]` virou `m.div` com `layoutScroll`
  (`Table.tsx`): a cena rolava os campos e o Motion animava 29 cartas de volta a cada quadro. A A/B (`notas/medicao-devastacao-estilo.md`): a
  Devastação com arte a 360 de 53 para 56 quadros/s (o pior quadro de 167 para 50 ms). O diário: 2026-11-14 (1). O deploy (dele) leva o
  conserto ao ar.
- **A fatia 3 dos decks e raças (o online) está na `main` e no ar** (o deploy do autor, 2026-11-14) ("Sim, merge", o autor, 2026-11-13, `decisoes.md` 2026-11-13 (1)), por
  fast-forward de `feat/decks-fatia-3` até `d885c84`, com as duas CI verdes (`check` e `e2e`) no topo da branch. Na sala online, cada lado veste a aparência do assento: quem cria leva a do painel do Início, quem entra pelo
  link leva a das preferências; o servidor a grava no assento (normalizada, só quando o corpo traz) e a mensagem `room` a devolve; a sua na
  sala é a que você tinha ao entrar (a preferência mudada depois não vale); a partida online guardada leva `looks`. Com o padrão, nada muda
  (o pedido, o assento e a mensagem são os de antes). Plano `docs/superpowers/plans/2026-11-12-decks-fatia-3.md` (H1 a H7, `decisoes.md`
  2026-11-12 (2)); a execução, as `Ruling:`, a revisão e as armadilhas no `diario.md` 2026-11-13 (1); o que a execução decidiu na §17 da
  spec. `RULES_VERSION`, `STATE_SCHEMA` (6) e `PROTOCOL_VERSION` não mudaram.
  - **Verificado:** `pnpm check` verde (web 2795 testes; JavaScript inicial 183,9 → 184,3 KB); `pnpm e2e` inteiro verde (114, 4 pulados),
    com o teste novo de duas pessoas no `looks.spec.ts`. A revisão da branch inteira (H7, um subagente novo): nenhum Critical nem
    Important, "pronto para merge: sim"; os Minor de comentário e de memória corrigidos (`ead82e5` e o commit desta memória).
  - **CI do push da `main`** (`399e454`): `check` e `e2e` verdes. O ledger da fatia foi apagado (as `Ruling:` estão no diário).
  - **O que não pode regredir:** com o padrão, o corpo do POST é `{ nickname }` (mais o `hp`), o assento não tem a chave `look` e a mensagem
    `room` também não; o assento sem `look` (as salas de antes do deploy) é Cordel, sem erro. O `useTableLooks` é memoizado pelos textos
    do deck e da raça, nunca pelo `seats`. A preferência não entra na mesa online.
- **A fatia 2 dos decks e raças (o dono por lado) está na `main`** ("sim", o autor, 2026-11-12), por fast-forward de `feat/decks-fatia-2`
  até `bb186ef`, com as duas CI verdes (`check` e `e2e`) no topo da branch e no push da `main` (`56efcbc`). No treino com um deck de
  arte, o bot veste o outro deck com o Egípcio (G1); cada lado da mesa, do placar (o retrato do Anúbis), do momento e das cópias das cenas veste o deck do dono, com o verso na
  cor do deck; a partida guardada leva `looks`, e o replay veste as gravadas. Com a aparência padrão nada muda; o tutorial fica em
  Cordel (o online ganhou as aparências na fatia 3, acima). Plano `docs/superpowers/plans/2026-11-12-decks-fatia-2.md` (G1 a G8, `decisoes.md` 2026-11-12 (1)); a
  execução, as `Ruling:`, a revisão (nenhum Critical nem Important; os 6 Minor corrigidos com teste) e as armadilhas no `diario.md`
  2026-11-12 (2); a medição G7 em `notas/medicao-decks-fatia-2.md` (passa nas quatro); o que a execução decidiu na §16 da spec.
  `RULES_VERSION`, `STATE_SCHEMA` e `PROTOCOL_VERSION` não mudaram (só a web mudou).
  - O ledger da fatia foi apagado (as `Ruling:` estão no diário).
  - **O que não pode regredir:** com a preferência padrão, o bot em Cordel (G1), nenhum `img` de carta, o verso de listras sem
    `data-verso-deck` e o `<Coringa>` no placar; o treino em Cordel não grava `looks`. O `LookZone` não põe nó no DOM, e há um provedor
    só. O que chegou mora na loja do `ready.ts`, que o provedor assina (`useSyncExternalStore`); o provedor e o placar só importam
    `loadPack` do `load.ts`. Nos testes, `resetPacks()` no `beforeEach`. As cenas raras (a figura) ficam em cordel.
- **A Devastação com arte não passa no celular** (medida em 2026-11-12, na tomada): 46 e 47 quadros/s com arte, contra 55 do Cordel; no PC,
  50 e 51 contra 50. O perfil: o recálculo de estilo das cartas da mesa inteira, umas 70 vezes na cena, já acontece no Cordel e dobra com a face
  com arte; a imagem numa camada própria foi medida e não muda nada. Tudo em `notas/medicao-decks-fatia-1.md`, seção "Antes da fatia 2", e
  na §15 da spec. **O autor não decidiu o conserto** (a recomendação: um bloco curto que corte esse recálculo, sem segurar o deploy); a fatia 2
  passou pelo portão relativo da G7 (`Esperando o autor`). Na medição A/B da fatia 2 (mais tarde no mesmo dia, a máquina
  mais rápida), a Devastação com arte deu 52 a 360 nas duas builds, contra 57 e 59 do Cordel: a perda segue (`notas/medicao-decks-fatia-2.md`).
- **A fatia 1 dos decks e raças está na `main`** ("Sim, merge", o autor, 2026-11-12), por fast-forward de `feat/decks-fatia-1` até `bf6c335`,
  com as duas CI verdes no topo da branch e no push da `main`. No treino (fora do tutorial) e no replay, a carta veste a aparência escolhida
  (Cordel, Bestiário ou Celestial; Bufão ou Egípcio), a sua dos dois lados; o online fica em Cordel até a fatia 3. Plano
  `docs/superpowers/plans/2026-11-11-decks-fatia-1.md`; a execução, as `Ruling:`, a revisão (0 Critical, 3 Important corrigidos com teste,
  8 Minor adiados) e as armadilhas no `diario.md` 2026-11-11 (1); a medição em `notas/medicao-decks-fatia-1.md` (a F5 passou na troca de mão,
  no limite no PC: 50 quadros/s com arte contra 56 do Cordel; **mas a Devastação, medida depois, não passa no celular**: o item dela acima); o que
  a execução decidiu na §15 da spec. O ledger da fatia foi apagado.
  `RULES_VERSION`, `STATE_SCHEMA` e `PROTOCOL_VERSION` não mudaram.
- **O bloco C está na `main`** (pontos 10, 11 e 13: a aura da iniciativa, os bônus em escala, o ouro de quem lidera), por fast-forward de
  `feat/playtest-bloco-c` até `21d1387`, com as duas CI verdes (`check` e `e2e`) no topo do código (`75d35c8`) e no push da `main`
  (`21d1387`). Plano `docs/superpowers/plans/2026-11-08-playtest-bloco-c.md`; a revisão da branch inteira e a segunda, só das correções
  (nenhum Critical nem Important), os rulings e os menores adiados no `diario.md` 2026-11-08 (1); a medição em `notas/medicao-bloco-c.md`;
  o que a execução decidiu na §5.4 da spec do playtest. `STATE_SCHEMA` 6, `RULES_VERSION` 5 (igual). O ledger do bloco foi apagado.
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app) e o `jogar-treino.bat` do autor.

## Fila

- **Vazia:** os blocos A a E do playtest estão na `main`. O próximo trabalho vem do autor (o que ele achar jogando o bloco D).
- **Fora da fila, a pedido:** a arte pintada dos decks, quando o jogo estiver pronto e online e o autor pedir (segue a bíblia de arte,
  `docs/superpowers/specs/2026-11-11-biblia-de-arte.md`).

## Esperando o autor

- **O bloco D:** ver no navegador o Atacar com o Ataque Absoluto armado (a faísca só foi vista nos testes). As escolhas da
  §6.3 ficaram aprovadas, menos a arte do cemitério (`decisoes.md` 2026-11-16 (1), item 10).
- **Menores adiados** (nenhum quebra o jogo): bloco D no `diario.md` 2026-11-14 (2) ("Adiados"); bloco C no `diario.md` 2026-11-08 (1) ("Adiados"); bloco B no 2026-11-07 (2) ("Menores, para
  depois"); bloco A no 2026-11-03 (6) ("menores").
- **O resto** (o que olhar no playtest por fatia e bloco, as leituras [I] por confirmar, o Roubo fraco, o que só ele pode fazer: proteção da
  `main`, `wrangler login`, branches remotas velhas): `notas/playtest.md`.

## Para ver sem esperar no treino

Importe a fixture `packages/web/e2e/fixtures/<nome>.json` para a chave `coringa:partidas`, abra `/partidas/<nome>`, escolha a rodada e
toque "Próximo passo" a partir do passo:

| Fixture | Passo (rodada) → o que toca |
|---|---|
| `especiais` | 10 e 11 (3): o J do Bot e o segundo J (o momento) · 35 (9): o Roubo · 51 (13): a Guarda · 78 (17): o ouro de quem lidera, os Q no nível 2 · 99 (21): os 4 J armados e a sequência 3 · 109 (23): a Armadilha · 111 (24): a sequência 5 · 137 (29): a sua cura passiva · 161 (34): a sequência 10 · 174 (37): os 3 K · 178→179: o seu golpe final |
| `absolutos` | rodada 11: o Ataque Absoluto do Bot · rodada 13: a sua Defesa Absoluta · 99→100: a sua derrota |
| `exodia-devastacao` | 27 (7): a sua Ressurreição · 107 (23) e 182 (37): as do Bot · 210: a Devastação · 236→237 (47–48): a troca de mão depois de 10 rodadas · 407: a Exódia do Bot |
| `reflect` | 175 e 176 (37): o espelho e o cometa · 176: a linha da zona do Reflect · 358 (73): a Devastação refletida |

## Para quem assumir

- Um `wrangler dev` do autor pode estar na 8787: o Playwright o reaproveita e o E2E falha. Com ele aberto, rode o E2E pela CI ou troque a
  porta (`MEDIR_PORTA` no `medir-cena.ts`; para o E2E inteiro, a receita está no `arquivo/diario-ate-2026-11-02.md`, 2026-11-02 (8)).
- Não edite nada enquanto o pre-push roda.
- **Ao levar ao autor um caso de borda:** passos numerados e um exemplo de mesa, curto, com a proposta numa linha à parte.
- Sem Python na máquina, e heredoc grande no shell quebra (crase, aspas): para editar vários arquivos, um script `.mjs` rodado com `node`.
- **Tire fotos:** o jsdom não tem layout. O `packages/web/e2e/medir-cena.ts` tira as fotos e mede com a CPU 4× (uso no começo dele); para
  fotos de outro jeito, um spec temporário com uma config que importa o `playwright.config.ts` (a CSP barra `<style>` injetado: mude o
  estilo pelo CSSOM).
- Um E2E que mede um elemento animado mede no meio da animação: espere `el.getAnimations()` antes (`e2e/power.spec.ts`, `expectInside`).
- Em `test/ui`, todo teste é `.test.tsx` (o Vitest da web não roda `.test.ts` ali, e nada avisa). O `animation.test.tsx` usa a sonda
  `installFlashProbe`. Uma marca que dura menos de meio segundo escapa do `toHaveCount`: quem procura é a página, a cada quadro.
- O ledger `.superpowers/sdd/…` fica fora do git: vale o `diario.md` e o `git log` (regra 6 do `CLAUDE.md`).
- **Crases dentro de aspas duplas no shell executam:** um `node -e "…"` cujo texto tinha `pnpm check` e `pnpm e2e` entre crases rodou os
  dois de verdade (2026-11-14). Texto com crases (memória, specs) só por script gravado em arquivo e rodado com `node`.
- **Para achar quem mexe no estilo das cartas:** o perfil do `medir-cena.ts` (`MEDIR_PERFIL=1`) diz quanto custa; um `MutationObserver` no
  `[data-palco]` com `attributeFilter: ['style']` diz quem (o Motion reescreve o `transform` da raiz das cartas). Detalhes em
  `notas/medicao-devastacao-estilo.md`.
- **A medição varia entre sessões** (o Cordel de 53 a 59, a Devastação com arte de 46 a 54 na mesma build): só a A/B na mesma sessão decide.
  Para a A/B, `git checkout --detach <main>` com a árvore limpa, medir, e voltar à branch (o `medir.config.ts` constrói a web a cada execução).

## Ambiente (máquina do autor)

- Node 26.13 e pnpm 11.9. O `gh` 2.103 está instalado e logado (2026-11-18; abriu o PR #2). Sem a CLI `claude`, sem Python. A CI também
  se lê pela API pública do GitHub, com `curl`.
- E2E: `pnpm --filter @coringa/web exec playwright install chromium` na primeira vez.
- **Workerd (paliativo; a correção é do autor):** o VC++ Redistributable desta máquina é de 2020 (14.28) e derruba o `workerd.exe`. As
  DLLs `msvcp140.dll`, `vcruntime140.dll` e `vcruntime140_1.dll` do Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\156.0.4314.50\`)
  estão copiadas em `node_modules/.pnpm/@cloudflare+workerd-windows-64@1.20261012.1/node_modules/@cloudflare/workerd-windows-64/bin/`. Um
  `pnpm install` que troque o workerd perde o paliativo. A correção: instalar o VC++ x64 mais recente
  (`https://aka.ms/vs/17/release/vc_redist.x64.exe`) e apagar as três DLLs.
- **Worktrees:** só o principal, `D:\andr3\jogo-coringa` (`git worktree list`, 2026-11-17; o da abertura removido depois do merge). Um worktree novo não traz as DLLs do paliativo do workerd no `node_modules`: copie-as do principal. Uma pasta de worktree com
  `node_modules` que o `git worktree remove` não apaga ("Filename too long") sai no PowerShell com
  `Remove-Item -LiteralPath ('\\?\' + $p) -Recurse -Force`.
- **Branches:** as locais estão mescladas na `main` (a `feat/playtest-bloco-c` em 2026-11-11 e a `feat/decks-fatia-1` em 2026-11-12), menos a `feat/online-equipar-vazio`
  (um rebase não publicado; o autor pode apagá-la) e a `feat/decks-fatia-2`, a `feat/decks-fatia-3`, a `feat/devastacao-estilo` e a `feat/playtest-bloco-d` (mescladas na `main` por fast-forward; o autor pode apagá-las).
  As remotas velhas, mescladas, são do autor (`notas/playtest.md`).
- O `jogar-treino.bat` na raiz é o lançador do autor: não mexer nem commitar.
