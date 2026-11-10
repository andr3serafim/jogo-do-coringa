# O que só o autor pode fazer, e o que olhar no playtest

Juntado em 2026-10-30 da memória e das notas de sessão da conta anterior (que não estão no repositório). Quem resolver um item
risca aqui e diz no `diario.md`.

## Só o autor

- **Playtest online:** um no celular e um no PC, pelo link publicado; cair e voltar; revanche. Incluir Firefox e iOS Safari: a
  CI só tem Chromium, e o `pointerdown` que pula as batidas e o arrasto com o dedo não são cobertos lá.
- **Primeiro deploy:** `wrangler login` e depois `pnpm deploy:server` (roda o `pnpm check`, constrói a web e publica). Conferir
  se o plano Free aceita o binding `ratelimits`.
- **GitHub:** proteção da `main`; instalar o `gh` (opcional, para PRs); apagar as branches remotas que sobraram
  (`origin/feat/web`, `origin/feat/polish`, `origin/feat/ajustes-fase-a`): o modo automático barrou o `push --delete`.
- **Tartaruga:** ele disse que testa depois do jogo pronto (`tartaruga.md`).
- **Critério final do MVP:** jogar com um amigo pelo link publicado.

## O que olhar

- **Celular:**
  - o tranco nas animações do Equipar contra o Difícil (a busca roda em fatias de ~20–35 ms no p95);
  - a dica 4 do tutorial a 320 × 568;
  - o replay a 360 × 640/740 com o bloco das cartas recebidas e os dois avisos (versão e divergência) no quadro 0, cuja altura
    não tem teste;
  - a 390 × 844 com a mão cheia, a mão cobre a Guarda e os buffs durante o arrasto até os campos rolarem;
  - fileiras de 8 a 360 px (as cartas passaram de 34 para 29 px).
- **Arrastar:** só o cursor anuncia que a carta arrasta (nada no celular). O E2E do dedo usa o CDP do Chromium: conferir no iOS
  Safari e no Firefox. Um toque que escorrega entre 8 px e a folga do navegador e volta sobre a carta escolhe no `pointerup`.
- **Reconexão:** logo depois de uma reconexão fora do anel (`resync`), o rascunho do Equipar reordena a fileira sem deslizar até
  o próximo `state` (`Stage.tsx`).
- **Cenas raras:** Ataque Absoluto (4,5 s), Defesa Absoluta (4,8 s) e Exódia (5,8 s) não encolhem quando há decisão esperando (decisão da
  conta anterior, por delegação); um toque na mesa pula a cena.
- **E2E na CI:** a falha intermitente de 27/10 foi corrigida em `af6b827` (o botão "Atacar" sumia entre o `isVisible` e o
  `isEnabled`). Se `e2e/drag.spec.ts` ficar instável, esperar duas leituras iguais da rolagem antes de comparar.
- **Futuro (opcional):** uma fase pós-fim no `simulate` da propriedade do servidor (revanche, `hello` em FINISHED, expiração).

## O que olhar no playtest, por fatia e bloco (do `estado.md` até 2026-11-08)

Movido do `estado.md` na passagem de 2026-11-10, como estava, para o estado ficar só com o que vale agora. As leituras [I] por confirmar, os
achados para o autor e os pequenos deixados para depois de cada fatia e bloco antigos moram aqui.

### Bloco E (sessão paralela)

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

### A fatia 5

Feita e aprovada (`decisoes.md` 2026-11-03 (4)): o plano é `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`, e a execução,
com os achados do código, está no `diario.md` 2026-11-02 (7) e (8).

### A `main`

- **Até 2026-11-02:** E1, E2, F1 (2026-10-30), o bloco E3 + F2 + F3 (2026-10-31), a marca "Cura passiva", as fatias 1 a 5 e a 4b do
  sub-projeto 6 (a direção visual). Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D (`8d7f078`, `a5a76c5`, `bba8377`,
  `8cdf0a1`), a memória compartilhada e o bloco E3 + F2 + F3 (o Reflect reativo, a Devastação, o Roubo sem naipe, a cura pela Defesa, o
  limite de 4 especiais com a BURN e a iniciativa com o placar na tela).
- **2026-11-03 e 04:** os pontos 16 a 18 do playtest (o 17 também online), a spec do playtest, o bloco A, o bloco E e os textos de placa.
- **2026-11-06 e 07:** o quinto caso de placa, a placa do momento da Guarda e o bloco B (o golpe final).
- **Regras em vigor:** a spec 1 (`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com os ajustes do sub-projeto 5
  (`2026-10-27-ajustes-design.md`) e a regra do 16 (a Ressurreição no instante da quadra, §1.12 e vizinhas). `RULES_VERSION` 5,
  `STATE_SCHEMA` 5.

### Fila

Os blocos C e D da spec do playtest (`2026-11-03-playtest-design.md`), nessa ordem, cada um com plano aprovado antes ("Agora").

### Esperando o autor (histórico das fatias e dos blocos anteriores)

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
