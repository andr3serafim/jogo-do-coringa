# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

---

## 2026-11-01 (4): sub-projeto 6, fatia 3 em execução (a Exódia e a Devastação), Tasks 1 a 4 feitas

- **Pedido do autor** (`decisoes.md` 2026-11-01 (4) e (5)): "ok, pode seguir o plano da fatia 3", e que a outra conta consiga
  retomar sem perda nenhuma. Plano em `docs/superpowers/plans/2026-11-01-direcao-visual-fatia-3.md`, na branch
  `feat/direcao-visual-fatia-3`.
- **Task 1, os tempos e as batidas** (`d0458b8`):
  - `SCENE_MS`: Exódia 5,8 s, `RowDevastated` 3,1 s, `DevastationCanceled` 1,4 s; o `DevastationCast` saiu da tabela;
  - `SCENE_MOMENTS` ganhou `EXODIA`, `DEVASTATION` e `DEVASTATION_CANCELED`; a inversão é na coroa e no chão que se abre;
  - o `RowDevastated` é a cena `DEVASTATION`, sem cartas de movimento; a cancelada é cena sem inversão (`NO_INVERT`); o
    lançamento é faixa com as três cartas e soa `quebra`;
  - **Escolhas:**
    - a fita da cancelada pela Defesa Absoluta dizia "Os Reflects se anularam", errado para esse motivo. Agora: "A sua Defesa
      Absoluta / A Defesa Absoluta de X segurou a Devastação devolvida". O plano dizia para manter o texto, mas o texto só servia
      ao outro motivo;
    - as pistas novas soam como `absoluto` até a Task 5, porque o `synth.test` exige pista não vazia (o plano dizia receitas vazias);
    - o painel antigo da Devastação perdeu o trio de cartas (o `RowDevastated` não traz K, A e X);
    - o teste do servidor do Reflect contra a Devastação ganhou a folga de 3,1 s: a resposta derruba a fileira.
- **Task 2, a Exódia** (`7cd2a48`):
  - `ui/scenes/Exodia.tsx`: os 4 K e os pilares (até 45% de opacidade), a aura `auraVariants(EXODIA_AURA, 401)`, a coroa, a onda e os
    raios por `boltTimes`, sem feixes. O carimbo é de ouro sobre tinta, com filete de ouro e sombra vermelha;
  - o `aura.ts` passou a ter `AuraSpec` (`ATTACK_AURA`, `EXODIA_AURA`), e o `rng` é exportado;
  - **Escolhas:**
    - além de `Anim.defeated` (a rachadura em `crackAt`), entrou `Anim.drained`: a vida escorre a 0 a partir de `drainAt`, em 500 ms,
      pelo `useCountedLife(player, value, drained)`. O protótipo escorre antes de rachar, e o plano só previa o `defeated`;
    - o medidor diz 0 também para o leitor de tela (`lost` vem da `view`: `GAME_OVER`, `EXODIA`, outro vencedor);
    - a tela não treme na Exódia, e a coroa tem a sombra desenhada (sem `drop-shadow`, §11). O autor confere se falta peso;
    - os testes do painel antigo da Exódia foram para o caso "sem o módulo das cenas" (`scene-frame.test.tsx`), onde ele ainda vale.
- **Task 3, a Devastação** (`4f58fb5`):
  - `ui/scenes/Devastation.tsx` e `chasm.ts` (`chasmEdges`, `crackBranch`, `chasmBranches`, `chasmPaths`); `FIELD_SCENES` não sobe a
    cortina; `SceneBox.row` (`{ rect, slots, field }`) e `revealRow` (rola os campos até a fileira); `data-campo` no `PlayerField`;
    `Stamp` exportado do `SceneFrame`, com `top`; as cartas do `RowDevastated` chegam ao cemitério sem voar (`busy && fallen` no
    `instant`);
  - **Escolhas:**
    - **a cancelada não traz a fileira no evento:** ela vem de `phase.devastation` da `view` de antes, guardada no `Stage` (`lastCast`),
      e o `fieldTarget` (`model/effects.ts`) acha o dono: o alvo nos Reflects, quem lançou na Defesa Absoluta. Sem isso (raro: abrir
      o replay exatamente nesse passo), só a fita aparece. O plano não dizia de onde vinha;
    - `SceneProps` ganhou `field` (`null` nas cenas de faixa);
    - **desempenho:** a fenda corre por `scaleX`, as rachaduras acendem por opacidade, sem filtro e sem `stroke-dashoffset`, e a poeira
      não tem `blur`. O filtro só existe no abismo, num `<svg>` próprio animado por fora. Custo: as rachaduras ficam menos ásperas
      que no protótipo;
    - a fita da cancelada aparece durante a cena (o `useBeatPlayer` não a bloqueia), e o painel de reserva não mostra essa cena.
- **Task 4, a desolação** (`7c3b011`):
  - `model/desolation.ts` (`desolationAfter`), `SessionSnapshot.desolated`, `desolationShown` e `Anim.desolated` (aparece em `settleAt`; o
    pulo a mostra na hora), `ui/table/RowDesolation.tsx` (a fenda, a terra em `multiply` e as pedras) e `data-apagado` no campo;
  - **Escolhas:**
    - **a partida nova zera a desolação** (`#syncGame`), e o replay a calcula dobrando os quadros até o atual: o salto também a mostra,
      e voltar para antes da queda a tira. O plano não falava desses dois casos;
    - a desolação mora num `<li aria-hidden>` absoluto sobre todas as colunas da grade, porque assim a fenda acompanha as vagas no
      celular e no PC. A `SceneBox.row` não o conta como vaga. Ela passa 40 px de cada lado, como a da cena: a Task 6 confere que
      nada rola de lado a 360 × 640;
    - a fenda da fileira usa as mesmas sementes da cena num quadro de 1000 × 100 esticado, com 42% da altura para cada lado, para não
      haver salto quando a cena acaba;
    - a cor do campo volta por `transition: filter 600ms` no `.campo`. É o único `filter` que anima na fatia, uma vez por fileira, e o
      Chrome o faz no compositor. A Task 6 mede se pesa.
- **O que quem continua precisa saber:**
  - **Task 5 (os sons):** troque as três receitas provisórias do `synth.ts` (`exodia`, `devastacao`, `devastacao-cancelada`, que hoje
    chamam `RECIPES.absoluto`). A pista `absoluto` fica sem uso depois: tire do `Cue`, do `synth.ts` e do `synth.test.ts`
    (`ALL_CUES`, `LONG` e o teste do ruído);
  - **Task 6:** falta ver tudo no navegador. Confira a Exódia e a Devastação com a fixture, a 1366 × 768 e a 360 × 640, e meça a CPU 4×;
  - **a revisão final** (tarefa do `executing-plans`) foi feita por quem escreveu o código nas fatias anteriores, sem subagente, e isso
    é dito ao autor;
  - **nos testes:** o `act` agrupa um `advance` inteiro, e a contagem por quadros só parte no fim dele. Para ver a vida descer, avance
    em dois passos (como o teste do golpe). As cenas de faixa recebem `field={null}`, e as caixas falsas têm `row: () => null`.
- **Sem pendência escondida:** todo o trabalho acima está commitado, sem arquivo solto (fora o `.claude/launch.json` e o
  `jogar-treino.bat`, de propósito).

---

## 2026-11-01 (3): a cena do Ataque Absoluto cortada pela jogada do bot

- **Pedido do autor** (`decisoes.md` 2026-11-01 (3)): na mesma partida, a Defesa Absoluta tocou inteira, mas o Ataque Absoluto
  começou e foi cortado antes do fim.
- **Causa:**
  - o bot do treino joga 600 ms depois de a vez chegar a ele, e cada `state` novo troca a linha do tempo da mesa no meio das
    batidas (regra do `useBeatPlayer`);
  - depois do seu ataque, a vez passa ao bot, e a jogada dele cortava a cena;
  - a Defesa não foi cortada porque, depois dela, a vez continuou sua.
- **Conserto** (`f21f9ff`, branch `feat/cena-ataque-cortada`, CI verde, fast-forward):
  - a sala do treino guarda até quando vão as cenas raras publicadas, com a mesma `sceneAllowanceMs` que estende o prazo no
    online;
  - o bot espera esse fim antes dos 600 ms de pensar (e antes de responder numa janela de reação);
  - quando o jogador joga, a espera zera: ele já viu ou pulou a cena;
  - vale para as seis cenas.
- **Teste:** a partida da semente `cena-74` (o jogador jogando como o greedy) tem um Ataque Absoluto e um Reflect seguidos de
  uma jogada do bot. O bot esperava 600 ms e agora espera a folga mais 600 ms. O teste antigo da reação agora também prova que a
  espera zera.
- **Armadilha:** a CI só roda na `main`, nas `feat/**` e nos PRs. Uma branch `fix/` não roda (renomeei).
- **Fica para o online:** um oponente humano que pula a cena e joga corta a sua, como antes. O prazo do servidor já dá a folga a
  ele; só pular de propósito corta.

---

## 2026-11-01 (2): sub-projeto 6, fatia 2 (as cenas do Ataque e da Defesa Absolutos, a insígnia e os sons)

- **Pedido do autor** (`decisoes.md` 2026-11-01 (2)): "Aprovado, siga". Plano em
  `docs/superpowers/plans/2026-11-01-direcao-visual-fatia-2.md`, executado aqui mesmo, tarefa por tarefa, com teste primeiro.
  O ledger com cada decisão técnica ficou em `.superpowers/sdd/2026-11-01-direcao-visual-fatia-2/` (fora do git).
- **O que entrou (branch `feat/direcao-visual-fatia-2`):**
  - **Os instantes** (`909502a`): `model/scene-moments.ts` é a fonte única. A folga de cena passa a 4,5 s (Ataque) e 4,8 s
    (Defesa). A inversão cai no impacto do feixe (3,2 s) e na trava do escudo (2,7 s). O `DamageDealt` que vem depois do Ataque
    Absoluto vira o golpe da cena (`Beat.hit`), mesmo com a Guarda quebrada no meio, porque o motor quebra a Guarda inteira.
  - **O golpe no impacto** (`94bedf2`): o `useBeatPlayer` acende o golpe no instante dele, como a inversão. O tremor é sempre
    forte, a vida desce em 700 ms, e o golpe conta uma vez só. A insígnia segue a linha do tempo (`insigniaShown`).
  - **A moldura comum** (`4fe825d`): as tarjas, a faixa (um quadro de 1000 × 360 escalado para a área dos campos) e o nome
    carimbado. O módulo das cenas é carregado sob demanda e pré-carregado pela mesa. A cortina começa embaixo do placar.
  - **As cenas e os sons:** o Ataque Absoluto (`ee1ae26`), a Defesa Absoluta com a insígnia no retrato (`d4c2f13`) e os sons
    das duas, com o corte no pulo (`5e6e1a7`).
  - **Task 7:** o E2E (`e2e/scenes.spec.ts`, com a fixture `absolutos.json`), a medição (`notas/medicao-fatia-2.md`) e as
    notas nas specs.
- **Achados no caminho (corrigidos):**
  - **O número do golpe ficava embaixo da cena.** A mesa (`main`) é `isolate`, para o grão ficar atrás dela, e nada dela passa
    por cima da camada da cena. O número do Ataque Absoluto passou a ser desenhado pela cena, como no protótipo.
  - **Laço de desenho na sobreposição:** com a cena desenhada, o contador da cena remontava sem parar.
  - **Timers de partícula** que sobravam depois de a cena desmontar.
  - **A camada da cena ganhou `overflow-hidden`:** o feixe que passa do retrato da direita faria a página rolar de lado.
- **Medição** (CPU 4×, build de produção): o Ataque roda a 52 quadros/s e a Defesa a 88–89, no PC e no celular. As partículas
  ficam em até 25 no pico.
- **Armadilhas:**
  - **Não edite nada enquanto o pre-push roda:** o `pnpm check` lê os arquivos de teste no meio, e uma edição feita durante ele
    reprova o push.
  - **O teste do servidor "hibernação no meio da partida" é instável:** depende da mão sorteada (com o p2 sem numéricas, não há
    Equipar). Falhou uma vez no pre-push e passou 3 de 3 depois.
  - **O E2E local não roda com o `wrangler dev` do autor aberto na 8787:** a porta é fixa. Rodei com a porta trocada para 8788
    só naquela execução e voltei a config.
  - **Os testes de interface já sobem com o módulo das cenas carregado** (`setup-ui.ts`). Sem isso, o que a mesa desenha
    dependia de quando o `import()` resolvia.
  - **Na pasta `test/ui` só entram arquivos `.test.tsx`.**

---

## 2026-11-01 (1): os três ajustes da fatia 1 (o tremor da barra, as figuras, a cura em verde)

- **Pedido do autor** (`decisoes.md` 2026-11-01 (1)): jogou a fatia 1, aprovou e apontou três pontos. Branch
  `feat/ajustes-fatia-1`, a partir da `main` (`b9784d0`).
- **O tremor da barra no PC** (`412d4ed`):
  - **Causa, medida no Chromium a 1366 × 768:** a linha "Quebrando o J antes" entrava nas prévias quando o mouse apontava um
    alvo. A barra crescia 17,5 px e o botão subia 17,5 px. Com o ponteiro no terço de baixo do botão, o ponteiro saía, a linha
    sumia, o botão voltava e o ciclo recomeçava.
  - **O que mudou:** a linha virou uma dica flutuante (`role="tooltip"`) acima da barra, fora do fluxo, ligada ao botão por
    `aria-describedby`.
  - **Conferido:** com o mouse no alvo, o botão ficou em 523 px antes e depois, e a barra manteve a altura.
  - Os textos pequenos dos botões não eram a causa e ficaram: no toque não há hover.
  - **Para reproduzir:** treino `semente=hover1&nivel=facil`; o A♦ chega na rodada 3, e a Armadilha mira o J♣ do Bot.
- **As figuras** (`9956fdc`):
  - **Onde entraram:** `ui/table/icons.tsx`, com 9 desenhos originais no traço do `ResurrectIcon`, que vale nos dois fundos
    (tinta com contorno de papel, papel com contorno de tinta).
  - **Totais:** espadas cruzadas antes do total de Ataque, escudo antes do de Defesa. A palavra virou `sr-only`.
  - **Marcas de estado:** uma figura cada, com o nome curto ao lado; a da Ressurreição reaproveita o `ResurrectIcon`.
  - **Também com figura:** os títulos das zonas e os destinos do Equipar.
  - **Celular:** a coluna do total passou de 52 para 58 px, e a figura tem 14 px. Com "152" a 360 px, figura e número somam
    57 px, sem rolagem de lado.
  - **PC:** o título da zona passou de 4,6 para 5,9 rem, para "Buffs de ataque" seguir em duas linhas.
  - **Conferido:** uma folha de prova com as 10 figuras em 5 fundos, olhada no Chrome.
- **A cura em verde** (`73b4e1f`):
  - **O que não funcionava:** o "+N" existia, mas era ouro e passava despercebido. A vida contava inteira na primeira batida
    de dano da jogada. Na cura pela Defesa, depois de um golpe (mesmo de 0), a barra já subia no golpe, e o "+N" vinha duas
    batidas depois, com a vida parada. Era o "pequeno ajuste" que o `estado.md` já listava ("a vida conta antes de o +N da
    cura subir").
  - **Contagem:** cada jogador conta a vida na batida que mexe nela (`lifeChange` em `model/effects.ts`, `life()` no
    contexto da animação, `useCountedLife`): o golpe desce, a cura sobe.
  - **Vida de antes:** é a última mostrada parada. Se ela não fecha com as mudanças da linha do tempo (um `state` novo com a
    mesa tocando), vale a de depois menos as mudanças.
  - **Visual:** o "+N" da cura é verde (cor nova `cura`, #2a7339, 5,1:1 com o papel), cresce e sobe. A barra mostra em verde
    o trecho devolvido, à frente do ouro.
  - **Não mudou:** os totais das fileiras seguem contando na batida do dano.
  - **Conferido:** no replay da partida `cura-265`, passo 84 (o Bot cura 3 pela Defesa).
  - **Conferido também:** os eventos trazem a mudança exata da vida (as 11 partidas de referência mais a `cura-265`, 2.361
    passos, 427 mudanças de vida: todas batem). O golpe que mata deixa a vida do motor negativa, e a contagem vai até ela, como a
    `view` (um primeiro corte em 0 foi tirado: `f16057a`).
  - **Coberto por teste:** um `state` novo chegando com a mesa tocando segue de onde a conta fecha, sem voltar à vida de antes.
  - **Ninguém mais conta a vida:** o painel do fim e o replay usam o mesmo placar.
- **Testes novos:**
  - a prévia flutuante, que não mexe nas prévias;
  - as figuras dos totais, das marcas, das zonas e do Equipar;
  - a cura que espera a batida dela;
  - golpe e cura no mesmo jogador;
  - a cura com movimento reduzido.
  - A suíte da web passou inteira (2.100 testes) antes do `pnpm check`.
- **Armadilha:** a contagem por `requestAnimationFrame` só parte no desenho seguinte. Nos testes com timers falsos, um único
  `advance` que atravessa a troca de batida não deixa a contagem andar: separe em `advance(até a troca)`, `advance(1)` e depois o
  resto, como já fazia o teste do rastro.

---

## 2026-10-31 (9) a 2026-11-01: sub-projeto 6, fatia 1 (o placar de luta, a espada e a fita, o golpe, a mesa viva, a folga de cena e os sons)

- **Pedido do autor** (`decisoes.md` 2026-10-31 (14)): "Aprovado o plano da fatia 1. prossiga". Executado aqui mesmo, tarefa por
  tarefa, com teste primeiro; o registro de cada decisão técnica ficou no ledger (`.superpowers/sdd/2026-10-31-direcao-visual-fatia-1/`,
  fora do git) e o resumo vai aqui.
- **Commits na `feat/direcao-visual-fatia-1`** (cortada da `feat/direcao-visual`, que tem a spec e o plano): `ea30bbb` (a folga de
  cena), `64332e4` e `c53e756` (o placar), `2493188` (a espada e a fita), `466613f` (o golpe), `49c319e` (a mesa viva), `34af728`
  (os sons), o dos E2E, `1782bca` (os ajustes vistos na tela e nos E2E), `cc60be4` (o desempenho do golpe), `18f7907` (o tempo
  esgotado com folga de cena) e os de memória.
- **Achado na revisão final** (uma segunda opinião sobre o fechamento): o `useDeadlineExpired` agendava o "tempo esgotado" pelo
  relógio parado e travaria os controles até 3 s antes do prazo do servidor depois de uma cena rara. Consertado com teste.
- **Portões:** `pnpm check` completo no pre-push (2092 testes da web; JavaScript inicial 153,9 KB de 200). `pnpm e2e` local: na
  primeira rodada completa caíram os 4 testes de toque (a mão que respira nunca fica "parada" para o Playwright: `force` nos
  cliques nas cartas da mão) e o da dica 5 no celular de 640 px (o painel aperta abaixo de 700 px de altura); na última, 50
  passaram e o online falhou só porque um `wrangler dev` do autor (sem a semente) estava na porta 8787 e o Playwright o
  reaproveitou. O E2E da CI sobe servidor próprio: as duas CI ficaram verdes, e a `main` foi a `063ef46` por fast-forward
  (o push caiu duas vezes por DNS logo depois do hook; na terceira, foi).
- **Decisões técnicas:**
  - a tabela das cenas (`SCENE_MS`) mora no `@coringa/protocol`; o servidor soma a folga ao prazo (na mesma época, estende o prazo
    e o alarme), o `Deadline` leva `runsFrom` e o `RoomClient` mostra o relógio parado até lá. O envio antecipado do Equipar
    agenda pelo tempo de verdade até `at` (pelo relógio parado, sairia a folga inteira antes da hora: achado ao ler o código);
  - o placar (`FightHud`) sai dos campos: o Coringa, o apelido, a vida e o relógio. "Tempo esgotado" e o turno pausado foram para
    a linha da fase na faixa do meio (não cabem na placa do celular). No PC o campo passou a ter duas colunas (fileiras | zonas);
  - a espada troca de retrato pelo efeito da batida da decisão (não pelo `layoutId` do losango): o voo é um arco com duas voltas.
    Ela segue o próprio relógio depois de começar, como a inversão e a cortina: no treino o bot responde logo e cortava o voo em
    60 ms (achado medindo o voo quadro a quadro). A posição em repouso é um `transform` medido dos retratos (`ResizeObserver`);
  - a fita mora sob o placar (centrada na placa), não no palco: no PC, com a coluna do histórico, o centro do palco fica ~200 px
    à direita da placa;
  - o tremor do golpe é CSS (`translate`) no palco com `data-tremor`; o número do dano é carimbado sob o retrato, preso à borda
    de dentro (centrado, um dano de 3 dígitos saía da tela no canto);
  - a mão respira e a quadra brilha em CSS: o teste do relógio que proibia qualquer animação sem fim agora aceita só essas duas.
- **Conferido na tela** (Chrome DevTools, o painel do app estava escondido): PC 1440 × 900 e 1280 × 800, celular de 360 px (o
  placar com 64 px, as barras com 86 px, sem rolagem de lado); o voo da espada gravado quadro a quadro (do seu retrato ao do bot
  passando pelo meio da mesa em ~0,82 s), a fita, o golpe leve e o médio (tremor, pingos, número carimbado), a mão inclinando e
  respirando, a quadra marcada (montada na fileira para a captura: o losango cobria o naipe e foi para o canto de cima).
- **Desempenho (spec 6 §11), medido com a CPU 4× mais lenta no Chromium (Chrome DevTools), na build de produção, num replay
  (sem o bot do treino, que calcula no fio principal e mascara a medida):** a primeira versão derrubava a animação do golpe de 65
  (a `main`, o mesmo replay, num worktree temporário) para 36 quadros por segundo. Achado por eliminação (desligando as peças por
  CSS injetado) e pelo trace: o tremor do palco inteiro (~9 q/s), a mão respirando durante as batidas (~7), o lampejo da espada
  (~2), os pingos animados pelo Motion em JavaScript e o rastro por `width`. Consertos: o tremor desloca só o placar e os campos (a
  mão e a barra ficam paradas), a mão e o lampejo pausam durante as batidas, os pingos viraram Web Animations e a barra encolhe
  por `scaleX`. Resultado: **50 e 53 q/s** em duas medidas (mediana de 17 ms, a mesma da `main`; p90 de 33 ms contra 25). O voo
  da espada: 69 q/s. **Fica:** o quadro em que o passo chega pesa ~200 ms contra ~83 ms na `main` (o React desenha mais coisa, e o
  histórico já forçava um reflow a cada linha nova: `scrollTop = scrollHeight`); candidato à fatia 5 (fluidez).
- **Ficou (miúdo, no ledger):** a extensão do prazo na mesma época faz o leitor de tela anunciar o relógio de novo; dois golpes
  colados sem batida entre eles tremem uma vez só.
- **Armadilhas:** o `useLayoutEffect` do filho roda antes de o React ligar o `ref` do pai (a espada nunca media); o Motion só
  aplica a posição depois de carregar os recursos sob demanda; clique durante as batidas pula as animações (um script que clica
  sem esperar a mesa parar nunca vê o voo).

---

## 2026-10-31 (8): a marca "Cura passiva" (primeiro ponto do playtest)

- **Pedido do autor** (`decisoes.md` 2026-10-31 (10)): sinalizar a cura passiva enquanto houver 2 K na Guarda. Na mesma mensagem,
  o dano do Roubo fica fora da iniciativa (nada mudou no código: já era assim).
- **Commits na `feat/cura-passiva`:** `338f1e8` (o predicado e a marca), mais os de memória.
- **Decisões técnicas:**
  - o motor ganhou `defenseHealActive(side, config)`, no padrão do `absoluteAttackArmed`; o `healFromDefense` passou a usá-lo.
    É refatoração: as partidas de referência e o digest da regra não mudaram;
  - a marca entra na lista de marcas de estado do campo (`Zones`, em `PlayerField.tsx`), nos dois lados, com o fundo de papel (o
    ouro fica para os Absolutos); sem o multiplicador dos Q, que ao lado da contagem da Guarda seria lido como o número de K;
  - o item do resumo das regras virou "Cura passiva (pela Defesa)", para o nome da marca ter onde ser achado.
- **Conferido:** `pnpm check`, `pnpm e2e` (48 passaram) e a mesa no navegador (um replay do simulador, semente `cura-265`
  turtle × greedy, passo 499: Defesa Absoluta, Cura passiva e Ressurreição juntas), no PC (1536 × 695) e no celular (375).
- **Armadilha:** a fixture do E2E de layout (`especiais.json`, passo 99) tem 1 K na Guarda, então a marca nova não muda aquele
  teste; se a fixture for regravada, confira.

---

## 2026-10-31 (7): bloco E3 + F2 + F3, as respostas do autor e o plano 2 (interface, iniciativa clara, tutorial)

- **Respostas do autor** (`decisoes.md` 2026-10-31 (8)): BURN com limite 4; o Roubo sem naipe (todo roubo dá dano e cura; o K
  anula o dano; não mata); a iniciativa mais clara na tela. Depois, a autorização para seguir até o merge sem parar
  (`decisoes.md` 2026-10-31 (9)). Plano 2: `docs/superpowers/plans/2026-10-31-e3-f2-f3-plano-2.md`, executado aqui mesmo.
- **Commits na `feat/regras-e3`:** `e50d625` (BURN 4 no padrão, o Roubo sem naipe, a semente `tutorial-381`), `9152b18`
  (`stealPreview` e a remedição), `3af88bb` (`InitiativeDecided` em toda rodada de Ataque, `lastInitiative`, `damageThisRound` na
  visão), `6c169c9` (o Roubo na mesa), `bb24aab` (a iniciativa na tela), `3a212b8` (o Roubo, a cura, a queimada e a cena rara da
  Devastação), `4e1adf5` (as dicas e o resumo das regras), `d374804` (a fixture do E2E e as specs), `2b1042c` (o portão do Difícil), `a2ef227` (a calibração), `eb36ddf` (os roteiros do E2E), mais os de memória.
- **Decisões técnicas:**
  - `RULES_VERSION` e `STATE_SCHEMA` ficaram em 4 (nada saiu da branch); só o digest da v4 mudou. O `InitiativeChanged` virou
    `InitiativeDecided` (sai sempre, com os dois danos); os resultados das partidas de referência não mudaram com isso;
  - a conta do Roubo mora numa função só (`stealOutcome`), usada pelo motor e pela prévia da mesa;
  - na mesa, o Roubo são duas jogadas do A (uma por destino); o `roleKey` do alvo é `fileira:valor`, então qualquer numérica de
    mesmo valor na mesma fileira vale (o motor lista só uma);
  - a faixa da iniciativa segura 1,2 s fora do teto de decisão: o Equipar que vem depois do fim do Ataque a espremia em poucos ms,
    que era parte do "não vejo o momento" do autor;
  - a semente do tutorial: com a mão limitada a 4, o critério antigo ficou impossível; o novo pede K, A, Selvagem e J ou Q até o
    2º Equipar, sem queimada;
  - a fixture `especiais.json`: com o Reflect reativo nenhuma partida junta a zona do Reflect com a Guarda, 4 J e 3 Q (4 000
    sementes); a zona saiu do teste do arranjo.
- **Medição** (`notas/medicao-e3.md` §5): o Roubo novo vence 39% contra o bot que não rouba (o A vale mais como Armadilha); nada no
  teto; a duração não mudou; o acumulador de K com a BURN 4 vence 45%.
- **Portões:** o Difícil do zero aprovado (66,5% / 82,0% / p95 129 ms); a calibração sem meta pior que antes (`notas/medicao-e3.md` §6);
  o E2E local verde (48 passaram).
- **Armadilhas:**
  - a BURN como padrão quebra a semente do tutorial (o critério supunha a mão sem teto);
  - o teste de propriedade das jogadas da mesa cobre o `STEAL` de novo;
  - a dica do Roubo vem antes da do Selvagem quando o Selvagem pode roubar como A (sem A na mão): um teste do tutorial tirou as
    numéricas do oponente para continuar medindo a do Selvagem.
  - os roteiros do E2E seguem uma semente e quebram com qualquer regra que mude a partida: um simulador do treino como o E2E o
    joga (a primeira jogada de cada painel, Passar nas reações, o greedy do Médio com a semente `<semente>/bot`) reproduz a partida
    exata e acha sementes novas sem tentativa no navegador (o script ficou só na sessão; a ideia está aqui).

---

## 2026-10-30/31 (6): bloco E3 + F2 + F3, plano 1 (motor, bots e medição)

- **Liberação do autor:** "Pode começar" (`decisoes.md` 2026-10-30 (7)). O bloco vai em dois planos; este é o 1, que para na
  medição. Plano: `docs/superpowers/plans/2026-10-30-e3-f2-f3-plano-1.md`.
- **Commits na `feat/regras-e3`:** `d165891` (Reflect reativo), `44b6672` (Devastação), `40a19ae` (Roubo), `966960b` (cura
  passiva), `76805ba` (limite de especiais), `5a1061d` e `e1eff5f` (medição), mais os de memória e o do relatório.
- **Decisões técnicas:**
  - `RULES_VERSION` 4 e `STATE_SCHEMA` 4 subiram na Tarefa 1; as outras tarefas trocaram só o digest da versão 4;
  - o Reflect lançado fica em `PlayerState.reflect` só até a resposta; a fase `REACTION` carrega a Devastação em curso;
  - o servidor guarda o tempo do turno de uma reação para outra (Devastação → Reflect → resposta) e não manda sozinho o Equipar
    de quem ainda deve o descarte do limite;
  - a config ganhou `defenseHealGuard` (2) e `specialLimit` (sem padrão até o autor escolher: a BURN provisória queimava o J que a
    semente do tutorial garante);
  - a web só acompanhou o necessário para o `pnpm check` passar: botões mínimos da Devastação, o texto da janela dela, e o Roubo
    reconhecido sem interface (o teste de propriedade das jogadas da mesa o pula, com o motivo escrito).
- **Medição** (`pnpm sim:e3`, 1000 partidas por série, ~14 min sozinha na CPU; leitura em `notas/medicao-e3.md`): as três formas
  quase não mudam os bots de sempre, porque nenhum deles junta K na mão; contra o acumulador de K, só a BURN 4 tira a vantagem de
  acumular (59% → 46%); o limite 3 acaba com a Exódia da mão. O Roubo vale menos que a Armadilha (38%). Nada chegou ao teto.
- **Armadilhas:**
  - o teste de propriedade do motivo sem jogada ficou lento com os candidatos de Roubo (cada candidato copia o estado): 78 s na
    suíte paralela; ficou só com as numéricas do oponente e um destino;
  - os testes de amostra da web dependem do tamanho das partidas: com o Roubo elas ficaram mais curtas, e o `END_TURN` sumiu das
    20 partidas sorteadas (continua coberto pelo teste direto);
  - o perfil enviesado que só joga J e Q trava com a BURN (a mão cheia de A e K queima todo J e Q novo): roda sem limite;
  - medição com 1000 partidas por série passa dos 10 min do comando: rodar em segundo plano e esperar o aviso.

---

## 2026-10-30 (5): F1, apagar o histórico de partidas

- **Liberação do autor:** "Pode começar a F1" (`decisoes.md` 2026-10-30 (6)).
- **Plano:** `docs/superpowers/plans/2026-10-30-f1-apagar-historico.md`, executado aqui mesmo, com TDD. Commits na
  `feat/apagar-historico`: `5118c80` (modelo), `7bc755e` (o `ConfirmDialog` compartilhado), `492de43` (a tela), `3ea08af` (E2E),
  mais as docs e os de memória. Só a web: sem `RULES_VERSION`, sem `STATE_SCHEMA`, sem o portão do Difícil.
- **Decisões técnicas:**
  - `deletePastGame` e `clearPastGames` (em `model/past-games.ts`) releem o armazenamento, nunca lançam e dizem se deu certo.
    Com o `set` recusado, regravam o texto lido (`restoreRaw`), como a gravação e o anexo. O `remove` do `safeStore` não lança
    (tira a cópia em memória e engole a recusa do `Storage`), então só a releitura diz se a lista saiu;
  - a confirmação do Desistir virou o `ConfirmDialog` (`ui/table/ConfirmDialog.tsx`), com título, texto e rótulo; os 102 testes
    do menu passaram sem mudança;
  - o `Button` ganhou `variant="danger"` e o `Title` aceita `ref` (React 19), para a tela devolver o foco ao título;
  - a tela relê a lista depois de apagar, avisa num `role="status"` e leva o foco ao "Apagar" da linha que tomou o lugar (o
    `<dialog>` não tem a quem devolver o foco: o botão saiu com a linha). O efeito da tela roda depois do `close()` do `Modal`.
- **Conferido no navegador embutido:** 4 partidas semeadas, a 1536 × 695 e a 375 × 812, sem rolagem horizontal; apagar uma
  (foco na linha seguinte, aviso) e apagar tudo (foco no título, a chave sai do `localStorage`).
- **Revisão final (autorrevisão, sem revisor independente):** sem achado que pedisse correção.
- **Armadilhas:**
  - no E2E, semear a lista com `addInitScript` a repovoaria a cada `reload`; o teste novo semeia com `page.evaluate` depois do
    primeiro `goto`;
  - o `expectWhollyInView` dos helpers do E2E espera o palco da mesa (`[data-palco]`) parar e reprova em tela sem mesa (foi a
    única falha do `pnpm e2e` local); fora da mesa, `toBeInViewport({ ratio: 1 })`;
  - um `cat > arquivo` sem entrada prende o comando do Bash até o tempo esgotar (foi parar em segundo plano). Os scripts vão
    para o scratchpad pelo Write.

---

## 2026-10-30 (4): E2, Equipar livre

- **Liberação do autor:** "ok, pode começar a E2" (`decisoes.md` 2026-10-30 (5)).
- **Plano:** `docs/superpowers/plans/2026-10-30-e2-equipar-livre.md`, executado aqui mesmo, com TDD. Commits na
  `feat/equipar-livre`: `3a9a82a` (motor e protocolo), `ce5c897` (rascunho por carta na web), `ea567a8` e `16c56ed` (painel),
  `7ba5bf8` (specs e `CLAUDE.md`), mais o ajuste da revisão e os de memória.
- **Decisões técnicas:**
  - a ação `EQUIP` ganhou `order` **opcional**; sem ela vale a ordem de compra. Os bots, o tempo esgotado, o terminal e os
    replays guardados não mudam, as partidas de referência saíram idênticas (digest 3), e nem `RULES_VERSION` nem
    `STATE_SCHEMA` subiram (o `GameState` não ganhou campo: ao confirmar, o motor só reordena `pending`);
  - `legalActions` segue canônica, sem `order` (um teste amarra isso): com ordem livre seriam até 4! vezes mais lances na
    busca do Difícil;
  - a `order` malformada usa códigos que já existiam (`INVALID_DESTINATIONS`, `DUPLICATE_CARDS`, `INVALID_CARD`);
  - na web, o rascunho virou uma lista de escolhas (carta + destino) e `equipChoose(destino, carta?)`; sem carta, a primeira que
    falta, então o fluxo de um toque por destino, o tutorial e os E2E seguem iguais;
  - o cabeçalho do painel passou de "Carta N de M" a "Faltam N cartas".
- **Conferido no navegador embutido:** semente `e2-1` (4 numéricas na rodada 1), a 1536 × 695 e a 375 × 812, sem rolagem
  horizontal; a 4ª carta escolhida entra na frente do Ataque.
- **Revisão final (autorrevisão, sem revisor independente):** as numéricas do painel não apagavam com a mesa travada (pareciam
  clicáveis); corrigido com teste. O E2E local pegou o painel alto demais no celular com 1 numérica (a fileira de Defesa saía
  da vista): os destinos voltaram para o lado das cartas até 2 numéricas, e só embaixo com 3 ou mais.
- **Medição:** o portão do Difícil remedido com `--ajuste` (os bots não mudaram): aprovado na rodada 2, 65,0% e 78,0%, p95 de
  142 ms. A calibração não foi refeita: as partidas de referência idênticas mostram que nenhum resultado dos bots muda.
- **Armadilha:** um script `node` grande num heredoc do bash quebrou com crases dentro; gravar o script num arquivo do
  scratchpad (ferramenta Write) e rodar `node arquivo` funciona.

## 2026-10-30 (3): E1, sem anti-travamento, Defesa Absoluta até o ataque, Absolutos em 3 s

- **Respostas do autor:** "Espere minhas respostas" (a E1 esperou), depois "Defesa absoluta dura até o oponente atacar de
  fato" e "3 segundos" para os Absolutos (`decisoes.md` 2026-10-30 (3) e (4)). A regra da Defesa Absoluta entrou na E1 para
  dividir a mesma subida de versão e o mesmo portão.
- **Plano:** `docs/superpowers/plans/2026-10-30-e1-sem-anti-travamento.md`, executado aqui mesmo, tarefa por tarefa, com TDD.
  Commits na `feat/sem-anti-travamento`: `4491726` (Defesa Absoluta), `f88e401` (sem anti-travamento nem empate, em todos os
  pacotes), `2bc0b61` (teto do simulador), `b71c033` (fixture do E2E), `18d1ead` (Absolutos em 3 s), `2fd8c95` (ajustes da
  revisão), mais os de memória e os relatórios.
- **Decisões técnicas (tomadas aqui, com o porquê no plano e nos commits):**
  - o empate saiu do tipo do resultado e o placar perdeu `draws`; a lista de partidas guardadas aceita o resultado antigo
    (`LegacyResult`) e o placar com `draws`, para nada sumir da lista do jogador;
  - a `RULES_VERSION` subiu uma vez só (3); os commits seguintes da branch só trocaram o digest;
  - o teste de tamanho por chave do servidor passou de 100 KiB a 1 MiB: o teto real do storage SQLite é de 2 MB (doc da
    Cloudflare); os 100 KiB vinham do backend KV antigo;
  - o simulador tem um teto de 400 rodadas só dele (`SIM_MAX_ROUNDS`), que conta como "sem fim".
- **Medição:** calibração e portão do Difícil de novo. Leitura em `packages/sim/reports/calibracao-leitura.md` (seção E1):
  `greedy` × `greedy` com mediana de 14 rodadas de Ataque e nenhuma no teto; a tartaruga deixou de compensar (−25 pp), mas o
  `turtle` × `greedy` chega à Exódia em 25,5% das partidas, o que o limite de especiais (E3) precisa responder. O portão do
  Difícil passou de primeira, com as mesmas pontuações.
- **Armadilhas:**
  - **crase dentro de string do bash é substituição de comando.** Um `node -e "…"` com `` `jogar-treino.bat` `` no texto
    executou o lançador do autor pelo bash: o `taskkill` dele derrubou o Vite e o wrangler que o autor tinha no ar (nada de
    arquivo mudou). Escreva memória e textos com a ferramenta de edição, nunca por `node -e`/`echo` com crases no bash;
  - medir o portão do Difícil junto com a calibração estraga o tempo por decisão (dividem a CPU): o p95 subiu de 163 para
    272 ms. O portão foi medido de novo sozinho;
  - um `cd` no Bash muda o diretório de trabalho da sessão: volte com `cd /d/andr3/jogo-coringa` ou use caminhos absolutos;
  - o pre-commit roda os testes ligados aos arquivos em stage: mudar uma regra exige regravar as partidas de referência e o
    digest no mesmo commit.

## 2026-10-30 (2): respostas do lote, tabuleiro quebrado, revisão das notas

- **Respostas:** as do autor ao lote de 2026-10-30 estão no `decisoes.md`, e as regras do Reflect reativo (F2) e da
  Devastação (F3) entraram na spec. Ficaram duas leituras [I] para confirmar junto com os números da E3.
- **F5, tabuleiro quebrado (corrigido):** reproduzido no navegador embutido em 1536 × 695, com um replay de partida simulada
  (semente `layout-107`) aberto em `/partidas/<id>`. Na coluna dos especiais do PC compacto, as zonas encolhiam abaixo das
  cartas (`min-height: 0` da mesa baixa) e a lista das marcas ganhava a altura da coluna inteira (`flex-basis: 100%`, do
  celular). O E2E `e2e/layout.spec.ts` falhou antes da correção (1536 × 695 e 1366 × 657) e passa depois, nos três tamanhos.
- **F4, Ataque vazio (sem bug encontrado):** o motor recusa o ataque com o Ataque vazio. Em 2.000 partidas simuladas e numa
  partida de treino jogada de tartaruga no navegador (com JavaScript clicando), nenhuma Defesa perdeu carta sem ataque. As
  explicações prováveis estão em `notas/revisao-das-notas.md` e voltaram ao autor.
- **Revisão das notas:** `notas/revisao-das-notas.md`, item por item. Das notas de 23/10, tudo o que não está na fila (E2, E3)
  ou descartado está no jogo.
- **Histórico:** "Saiu 3♣ do Defesa" virou "da Defesa" (e "quadra no Defesa" virou "na Defesa"), com teste em
  `sim/test/play.test.ts`.
- **Armadilhas:**
  - o `jogar-treino.bat` do autor sobe o Vite na 5173; para o preview do app, use o `.claude/launch.json` (servidor `web`) só
    com a porta livre;
  - o E2E reaproveita um `wrangler dev` que já esteja na 8787, que pode servir um `dist` velho;
  - o Chromium do Playwright foi instalado nesta máquina em 2026-10-30;
  - escreva no `estado.md` como as coisas ficam **depois** do merge antes do último push da branch. Senão a `main` fica com
    um estado velho, ou é preciso mais um ciclo de push e CI só para a memória.
- **Ferramenta útil:** para ver um estado raro da mesa, grave uma entrada de `coringa:partidas` com o replay de uma partida do
  simulador (o formato está em `web/src/model/past-games.ts`) e abra `/partidas/<id>`. A fixture do `layout.spec.ts` é um
  exemplo.

## 2026-10-30: esta conta assume o projeto e cria a memória compartilhada

- A conta anterior bateu no limite semanal em 2026-10-28, às 04:59, com as duas sessões paradas: a principal ("Jogo do Coringa
  multiplayer web") e a do sub-projeto 5. A do sub-projeto 5 tinha acabado de receber as respostas da Fase E e escrito
  "começo mapeando o anti-travamento no código". **Nada da Fase E foi implementado**; o worktree dela
  (`.claude/worktrees/inspiring-sammet-387417`, branch `feat/ajustes` em `af6b827`) está limpo.
- Esta conta leu o backup da anterior: memória pessoal, notas de sessão, a transcrição inteira do sub-projeto 5 e as mensagens
  do autor das sessões principais. Também leu o texto das regras originais, recuperado do anexo da primeira conversa porque o
  arquivo sumiu na formatação, e as specs 1 e 5.
- Criou esta memória (`docs/memoria/`) e a seção "Memória compartilhada" do `CLAUDE.md`, a pedido do autor, e trouxe para
  `notas/` as notas que só existiam no AppData: tartaruga, perguntas da Fase E e lista do playtest.
- Registrou as respostas ajustadas da Fase E e as anotações novas (Devastação, Reflect reativo, apagar histórico, layout da
  Ressurreição) no `decisoes.md` e na spec do sub-projeto 5.
- **Ambiente desta máquina (formatada):**
  - Node 26.13 e pnpm 11.9; não há `gh` nem a CLI `claude`; o Ubuntu do WSL sumiu (só há o `docker-desktop`).
  - O `pnpm check` passava em tudo menos nos testes do servidor no workerd: o `workerd.exe` caía ao iniciar
    (`access violation`, `thread 'main' has overflowed its stack`). A causa é o Visual C++ Redistributable de 2020 desta
    instalação do Windows: com as DLLs novas do Edge copiadas ao lado do `workerd.exe`, os testes passam. A correção
    definitiva é do autor (instalar o redistribuível atual); detalhes em `estado.md`, seção "Ambiente".
  - O git desta máquina estava sem identidade. Ficou configurada só neste repositório, com o mesmo autor dos commits
    anteriores.
  - A pasta `.pnpm` tem um `wrangler@4.154.0` órfão (fora do lockfile), que nenhum pacote usa.
  - O E2E precisa de `pnpm --filter @coringa/web exec playwright install chromium` antes da primeira vez.

## 2026-10-27/28: conta anterior, sub-projeto 5 (Fases A–D) e o fim da semana

- **Sessões:** a principal ficou no checkout `D:\andr3\jogo-coringa`. A do sub-projeto 5 trabalhou no worktree
  `inspiring-sammet-387417`, na branch `feat/ajustes`. Os pushes e os merges por fast-forward saíam do worktree limpo
  `D:\andr3\jogo-coringa-v5` (HEAD solto), para o pre-push rodar numa árvore sem rascunho.
- **Fases na `main`:**
  - A (`8d7f078`): o B1 era um bug da web (a conta "base × N" dividia o total velho pela base nova) somado à Pressão; o B2
    não era bug (o motor ganhou `noPlayReason`, e a mesa mostra um balão com o motivo).
  - B (`a5a76c5`): a Pressão saiu por completo. `RULES_VERSION` e `STATE_SCHEMA` foram para 2, e o portão do Difícil passou
    com 63,5%.
  - C (`bba8377`): U1–U5 (tempo de leitura, arte da Ressurreição, cenas raras de 2,6 s e 4,2 s, mola, fim em estilo HQ).
  - D (`8cdf0a1`): 8 Ás, fileiras de 8 e vida 500 com `HP_CHOICES` 300/500/800. O tutorial passou a `tutorial-2431` e o E2E a
    `e2e2631-1`. Portão do Difícil: 65,0%, 78,0% e 163 ms no p95.
  - `68c608f` e `af6b827`: o teste do Ataque vazio (a Defesa do oponente fica intacta) e a correção da falha intermitente do
    E2E. O reporter `github` do Playwright foi ligado na CI, e a falha apareceu nas anotações públicas.
- **Fase E:** perguntas enviadas em 27/10 e respondidas em 28/10. A sessão planejou três merges: **E1** remover o
  anti-travamento, **E2** o Equipar livre, **E3** roubo, cura pela Defesa e limite de especiais, com medição antes da regra.
  Parou no limite semanal antes de começar.
- **Ficaram:**
  - as partidas de referência ainda usam a config da Fase B (300, 7, 6 Ás);
  - a calibração mostra 16,7% de fins por anti-travamento (meta < 5%), o que deixa de existir com a E1;
  - a branch remota `origin/feat/ajustes-fase-a` e a local `claude/inspiring-sammet-387417` sobraram.

## 2026-10-15 a 2026-10-27: sub-projetos 1 a 4, conta anterior

- **1, regras + motor + simulador:** a spec de 2026-10-15 foi aprovada pelo autor. O motor está na `main` e o simulador
  entrou em `7ec49b1`. Relatório de calibração em `packages/sim/reports/`.
- **2, servidor:** spec e plano de 2026-10-16, na `main` em `0d4a957` (2026-10-17).
- **3, interface web:** spec de 2026-10-17 e plano de 2026-10-18, na `main` em `4b0b55c` (2026-10-22). O ledger completo da
  execução está só no AppData da máquina do autor
  (`side-session-notes/local_5a6f8935-10df-4551-89d9-04ae6d2bc3c1/interface-web-*.md`): é histórico e não bloqueia nada.
- **4, polimento:**
  - Fase A (`ab1ac14`): mesa no PC de pouca altura.
  - Fase B (`8d01ce0`): dívida técnica.
  - Fase C, em cinco fatias, até `7aa922f` (2026-10-27): sons e níveis de bot, histórico e replay do treino, replay online,
    tutorial, arrastar cartas.
- **Padrões que funcionaram:**
  - uma fase por merge, com CI verde na branch antes do fast-forward;
  - perguntas de regra em lote ao autor, respondidas como "1 ok, 2 não…";
  - medir no simulador antes de escrever a regra;
  - quando o limite de uso corta no meio, basta "Tentar novamente".
