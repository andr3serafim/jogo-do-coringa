# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

---

## 2026-11-02 (8): sub-projeto 6, fatia 5 em execução (a fluidez)

- **Pedido do autor** (`decisoes.md` 2026-11-02 (9)): "Aprovado, execute", com 14 pontos do playtest. Ele escolheu encaixar os diretos (3, 4, 7, 8 e 12) nesta fatia e deixar os nove de desenho para depois, com protótipo; "Bônus" no lugar de "Buff"; e tirar a escolha automática da ordem junto com a barra.
- **Feito:** a branch `feat/direcao-visual-fatia-5`, a partir da `main` (`35b4660`). No plano, a Task 8 nova (os pontos diretos, com as leituras [I] de `decisoes.md`), e o E2E e a medição passaram a ser a Task 9.
- **Antes de escrever a Task 8, conferido no código:** a "Ameaça de X" mora em `ActionBar.tsx:171` (`threatLabel`), e a prévia do alvo também fala da ameaça (`copy.ts`, perto da linha 245); a ordem automática passa por `automation.ts`, `session.ts`, `replay-track.ts`, `OrderPanel.tsx`, `PlayTable.tsx`, `local-game.tsx` e `Tutorial.tsx`; "Buff" aparece em `copy.ts`, `labels.ts`, `tutorial-copy.ts`, no `HINT` do `Card.tsx`, nos títulos do `PlayerField.tsx` e no histórico, que vem de `packages/sim/src/play/text.ts`.
- **Task 1, a linha de base e o quadro da chegada** (números em `notas/medicao-fatia-5.md`):
  - o `medir-cena.ts` ganhou o `MEDIR_PERFIL` (o perfil do Chromium, com as amostras de JS e o rastreamento de invalidação de estilo) e a medida `chegada`; o `medir.config.ts` ganhou o `MEDIR_PORTA`, porque o `wrangler dev` do autor ocupava a 8787 e não serve o replay;
  - **armadilha:** abrir o rastreamento dentro da janela medida travava a página por ~1 s e estragava os números. O perfil abre antes da medida, e com ele os números não valem: o perfil serve só para ver do que cada quadro é feito;
  - os passos são da fixture `especiais`. Nenhuma fixture tem 2 K quebrando fora de cena, então a armadilha ficou no lugar dela;
  - **a chegada pesa de 83 a 200 ms** com a CPU 4×, e o ataque comum já ficava abaixo da meta (48 e 49 quadros/s) antes de qualquer efeito;
  - **causa local achada e consertada (E1):** o palco recebia `--tremor` no estilo inline a cada golpe. Variável CSS é herdada, então a mesa inteira recalculava o estilo (530 elementos, ~100 ms). O tremor virou uma Web Animation no `translate` do placar e dos campos, disparada pelo `Stage` a cada batida com golpe, e a regra do CSS saiu. No ataque, a chegada no PC caiu de 183–200 para 117 ms, e os quadros/s subiram de 38–41 para 45–48 (três execuções de cada lado);
  - **de quebra:** dois golpes seguidos do mesmo peso tremem duas vezes. Era um item da Task 7, que agora só tem os sons e o replay;
  - **o resto não é local:** o desenho do React com a mesa inteira e as projeções do Motion em toda carta com `layoutId`. Mexer nisso é mudar a forma da mesa: fica registrado para o autor decidir, como a E1 previa. A meta de ≤ 100 ms não foi atingida no ataque.
- **Task 2, o modelo** (`model/table-motion.ts`, puro): `TABLE_MOTION`, `recoilsOf`, `landingsOf` (com `draftShown`), `leavingOf`, `shardsPerCard` e `shiftDelaysOf`, com 17 testes, entre eles o que trava as durações de uma jogada seguida do golpe sob o teto de 1 s.
  - **Escolhas:** as batidas de cena ficam de fora de tudo (as cenas desenham as próprias cópias). Na saída do Bônus (`BuffRemoved`), o J espera só na zona de ataque e o Q só na de defesa; o Selvagem, que o evento não diz em que papel estava, faz esperar as duas. Com duas saídas no mesmo lugar, vale a última batida: a carta desliza uma vez só, até o lugar final.
- **Task 3, as partículas, a camada e o palco:**
  - `ui/scenes/particles.ts` mudou para `ui/anim/particles.ts`, junto com o `rng` da `aura.ts`. **Achado:** o `RowDesolation` (da mesa, no JavaScript inicial) importava o `rng` de `ui/scenes/aura.ts`; agora importa de `ui/anim/particles.ts`;
  - `ui/anim/bursts.ts` (a poeira e os cacos de papel) e `ui/anim/FxLayer.tsx` (a camada `data-camada-fx`, entre a mesa e a cena, com `useFxLayer().burst`);
  - o `Run` ganhou `recoils`, `landings` e `leaving`, só ao vivo, e o `useBeatPlayer` diz se a linha do tempo foi pulada (`cut`). O `Anim` ganhou `recoilAt` e `landAt`: o pouso vale além do fim natural das batidas (a mola assenta depois delas), e o pulo o apaga;
  - **Escolhas:**
    - o `Run` separa as cartas movidas (`moved`, que o pulo remonta) das vizinhas que só esperam a batida da saída. Remontar as vizinhas tiraria o foco do teclado da mão, contrato que um teste guarda. Depois de um pulo, uma vizinha pode deslizar no tempo original dela, até o fim da batida;
    - o `draftShown` vem do `equipConfirmed` do desenho anterior, num estado (o lint barra ler `ref` no desenho), como o `lastCast` do `Stage`;
    - dois testes de layout mudaram para o contrato novo: a carta que sai da sua mão espera também o recuo (0,49 s em vez de 0,4), e a vizinha da mão espera a batida da saída.
- **Task 4, a jogada:** `useTableMotion` no `Card`. O recuo (`translate`, 6 px, 90 ms, no começo da batida), a queda da carta sem origem (`translate` de −14 px a 0 em 220 ms, com a carta apagada até a batida pelo mesmo `data-entra` da compra) e o pouso (`scale` 1 → 1,06 → 1 em 160 ms e 5 poeiras), tudo pela Web Animations nas propriedades CSS `translate` e `scale`.
  - **Escolhas:**
    - o pouso é por tempo (`landAt`), e não pelo `onLayoutAnimationComplete`. Nas fotos do PC (a sua jogada de K na Guarda, fixture `especiais`, rodada 3, passo 6), a carta voa e assenta na vaga, sem deslocamento do `scale`: a troca prevista no plano não foi preciso;
    - o tremor e o traço da rachadura do `crack` ficam na carta até a Task 5, que os passa para a cópia (cada commit fica coerente);
    - nos testes, o `animate` falso mora em `HTMLElement.prototype`: o Motion decide usar a Web Animations olhando só o `Element.prototype` (`supportsWaapi`), e lá ele trocaria de modo.
  - **Medida da jogada, depois:** 60 quadros/s nas duas telas, chegada de 50 ms no PC e 33 ms a 360 px, e 5 partículas no pico.
  - **No celular,** nesse passo o seu campo está rolado para fora da vista: o pouso não aparece na foto. É o layout de hoje.
- **Task 5, a saída e os estilhaços:** `ui/anim/Leaving.tsx`, um componente de classe dentro da `FxLayer`.
  - No `getSnapshotBeforeUpdate` (o DOM ainda é o de antes), ele lê o lugar e um clone de cada carta de `run.leaving`. No `componentDidUpdate`, põe a cópia na camada para cada carta que sumiu da mesa e para as que estouram, mesmo as que ficaram (o topo do cemitério). A cópia segura o lugar até a batida e então voa ao cemitério ou racha, treme 120 ms e estoura em `shardsPerCard(n)` cacos;
  - o topo do cemitério que estoura entra no `instant` do `Stage` e fica `visibility: hidden` até o estouro;
  - o `crack` saiu do `CardFx`, e o tremor e o traço saíram da carta: a cópia desenha a rachadura (`data-rachadura`);
  - **Escolhas:**
    - a cópia é o clone da carta sem `data-card-id` (vira `data-saindo-id`), com largura e altura explícitas (a lição da 4b) e sem o `transform` que o Motion deixou;
    - o voo ao cemitério mede o `[data-cemiterio]` uma vez, na chegada do `state`;
    - com movimento reduzido, a rachadura aparece e a cópia esmaece em 200 ms, sem tremor nem cacos;
    - dois testes antigos (o K e a Armadilha "racham" pelo `data-fx`) passaram a conferir a cópia e a carta escondida.
  - **Visto nas fotos** (fixture `especiais`): a cópia do J♥ rachada no lugar, os cacos aos 160 ms, o J♥ no topo do cemitério depois, e a cópia do seu A♣ indo ao cemitério. No ataque, o 8♠ gasto e o 9♣ do Bot seguram o lugar até a batida deles: antes, a fileira sumia antes do golpe.
  - **Medidas, depois das Tasks 4 e 5:** a armadilha com 57–58 quadros/s, chegada de 50–67 ms e 10 cacos no pico; o ataque com 55–58 quadros/s e chegada de 67–83 ms.
- **Task 6, o leque:** o `dealsOf` põe as cartas em leque (`min(40 ms, batida / quantas)`), e os versos levam o intervalo. O `useDealIn` voa do `[data-monte]` (o número do monte, na faixa do meio) até o lugar da carta, na mão, nas numéricas do painel do Equipar e nos versos do Bot.
  - **Escolhas:**
    - o voo tem acesso próprio no `Anim` (`dealAt`, `backsAt`), que dura além do fim natural das batidas (o voo passa dele) e cai no pulo, no `catchUp`, no `resync` e com movimento reduzido. O `enterDelay` e o `backs`, que acabam com as batidas, seguem para o esmaecer;
    - **defeito achado só nas fotos, com teste que falhou antes:** um verso que já estava na mão do Bot ficava parado, visível, sobre o número do monte enquanto esperava (o `initial` do Motion só vale na montagem). O voo agora apaga e acende a carta (`fill: 'backwards'`);
    - **e um segundo, do mesmo caso:** a compra conta as numéricas que vão para o painel do Bot, e a mão dele não diz quais versos são novos. O leque conta dos versos que há (`max(0, mão − compra)`), e só voa o verso montado agora (`onlyNew`); os antigos ficam no lugar;
    - o painel próprio do replay (`ReplayEquip`) não tem leque: as numéricas dele aparecem de uma vez, como antes. O painel do jogo ao vivo tem.
  - **Medidas da compra, depois:** 57–60 quadros/s, chegada de 50–67 ms (era 183–200), 30 partículas no pico (a poeira das 6 cartas do Equipar que assentam no mesmo passo).
- **Task 7, os sons e o replay:**
  - `carta` (a sua carta da mão): o sopro do papel no voo, e o estalo e a batida seca no pouso, aos 510 ms; `pouso` (nova: a carta do Bot e as do Equipar) aos 220 ms; `quebra` agora estala no estouro (120 ms), com o papel que rasga; `compra` (nova: só na sua compra) com quatro estalos a 40 ms. A poeira e a saída ao cemitério são mudas;
  - os controles do replay ("Início", "Passo anterior", "Próximo passo" e a rodada) cortam o som da cena, como o pulo. "Tocar" e "Pausar" não: a cena segue tocando. Era o pendente desde a fatia 2;
  - os dois golpes colados já tinham entrado na Task 1;
  - **não conferidos de ouvido:** os testes medem os instantes e o volume.
- **Task 8, os pontos diretos do playtest** (`decisoes.md` 2026-11-02 (9)):
  - **3:** `select-none` no palco; o histórico e os diálogos (`Modal`) ficam com `select-text`;
  - **4:** a linha "Ameaça de X" saiu da barra (e o grupo "Prévias", que só a tinha), e a prévia do alvo não fala mais da ameaça: diz "sem mudança no seu ataque" quando o alvo não muda a sua conta. **Escolha:** a conta da ameaça (`threatPreviewText`) fica no modelo, porque os testes de nocaute contra o motor a usam como uma das direções; a direção do ataque do Bot segue coberta pelo aviso da janela de reação, que fica;
  - **7:** saíram a ordem automática da `Session` (`autoOrder`, `orderAutoAt`, `interact`), o `ORDER_AUTO_MS`, a barra (`AutoBar`), a frase e o `onInteract` da mesa e do painel, que só a cancelavam. O painel diz "Escolha quando quiser" (com "dentro do prazo" no online). O E2E do jogo online agora escolhe "Atacar primeiro" com um clique. O `CLAUDE.md` foi corrigido (o tutorial nascia com `autoOrder: false`);
  - **8:** "Bônus de ataque" e "Bônus de defesa" em todo texto (na mão, nas zonas, nas jogadas, nos motivos, nos alvos, no `HINT`, nas regras, nas dicas, no histórico e no terminal do `pnpm play`). Os identificadores ficam. Um teste varre os arquivos de texto atrás de "Buff". **O digest da saída do `pnpm play`** (`sim/test/online.test.ts`) mudou só pelo texto: as jogadas seguem com o mesmo digest;
  - **12:** o `Row` calcula o total (pelo motor) sem as cartas que ainda vão pousar, na fileira e nos bônus dela (`useLandingHold`), e no pouso o número cresce até 1,3 e volta em 320 ms, em ouro (`data-subiu`). Com movimento reduzido, só a troca do número e a cor. **Escolha:** vale também para o J ou o Q que sobe o total, pela coerência que o autor pediu no ponto 10; a marca "quadra +N" do total segue a mesma conta.
- **Task 9 (pela metade, cortada pelo limite de uso):**
  - `e2e/fluidez.spec.ts`: a poeira da jogada, a cópia e os cacos da Armadilha e o voo da compra, no PC e a 360 × 640, vigiados pela página a cada quadro; 6 de 6 verdes; entrou na lista `testMatch` do PC;
  - **os E2E que contavam com a ordem automática** falharam (3 de 79) e foram ajustados: o `training` e o `mobile` escolhem "Atacar primeiro" na rodada 3; o `playUntil` trocou `order: 'wait'` por `order: 'leave'` (deixa o painel para o teste);
  - **a medida dos alvos de toque** (`mobile.spec.ts`) espera as animações finitas acabarem: o voo da compra encolhia a numérica do Equipar (41 px) no meio do voo;
  - as specs: a 6 §8 e §14 com o que a execução decidiu; a da interface com notas da ordem (§3.6), do "Bônus" e do `GuardBroken`;
  - **para rodar o E2E com a 8787 ocupada:** uma configuração no scratchpad importava o `playwright.config.ts` por caminho absoluto e trocava a porta para 8797 (`testDir` e `cwd` absolutos, `reuseExistingServer: false`);
  - **falta:** o E2E inteiro de novo, a medição "Depois", o `pnpm check`, o push, a CI, a revisão e o fast-forward.

---

## 2026-11-02 (7): o plano da fluidez (a fatia 5), na outra conta

- **Pedido do autor** (`decisoes.md` 2026-11-02 (8)): continuar do `estado.md`, que pedia o plano da fatia 5.
- **Feito:** o plano, `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`, esperando a aprovação, com as escolhas E1 a E9 no começo dele. Nenhum código, e nenhuma branch.
- **O que a leitura do código deu ao plano** (nada disso estava no §8):
  - **as cartas que saem antes da hora:** a mesa não tem `AnimatePresence`, e o cemitério só desenha a carta de cima. Toda carta que vai ao cemitério sem ser a de cima desmonta na chegada do `state`, antes da batida dela: de uma Guarda de 4 K quebrada, só 1 K voa, e a fileira de Ataque gasta some antes do golpe. A Task 1 confirma pelas fotos. O plano segura cópias delas, lidas no `getSnapshotBeforeUpdate`, até a batida;
  - **a carta do Bot** não tem de onde voar (a mão dele são versos sem id) e aparece na chegada do `state`;
  - **as numéricas do Equipar** (`PendingCard`, `animated={false}`) não passam pelo `enterDelay`: nem esmaecem;
  - **o `transform` da carta é do Motion** (a projeção do `layoutId`, com a correção de tamanho mão → mini). O recuo e o achatamento vão para as propriedades CSS `translate` e `scale`, que se compõem com ele. O `scale` só depois do pouso, e a Task 4 confere nas fotos antes de seguir;
  - **o tremor de dois golpes colados:** a animação do CSS não recomeça quando o valor de `data-tremor` se repete;
  - **o orçamento:** `ui/scenes/particles.ts` não importa nada; o plano o move, com o `rng` da `aura.ts`, para `ui/anim/particles.ts`;
  - **a compra:** o Equipar compra 4 cartas por jogador (`cardsPerEquip`), e o leque cabe na batida dele.
- **O conselho de um revisor** (sem subagente; o modelo de apoio da sessão) mudou a ordem do plano. A Task 1 mede os passos comuns e o quadro da chegada antes de qualquer efeito, porque os efeitos novos disparam nesse mesmo quadro. Na revisão do plano pronto, ele achou dois furos na Task 5, corrigidos num segundo commit:
  - **as vizinhas deslizariam por baixo da cópia:** quem fica no lugar de onde uma carta sai desliza na hora (`delayOf` = 0), o que só funciona porque a que sai some. Com a cópia segurada até a batida, elas esperam a mesma batida (`shiftDelaysOf`, Task 2);
  - **o topo do cemitério que estoura** precisa entrar no `instant`, como o `fallen` da Devastação. Só escondido, o Motion o faria voar do lugar antigo, e ele reapareceria no meio do voo;
  - **o rascunho do Equipar** só fica à vista depois de confirmar nesta página (`Table.tsx:153`). Confirmadas antes de recarregar, as suas numéricas também chegam sem origem e caem como as do Bot (`draftShown`).
- **O ESLint reprovava todos os arquivos** no pre-commit (705 erros de "multiple candidate TSConfigRootDirs"). A causa é o worktree `.claude/worktrees/youthful-elgamal-3d5e8a`, criado em 2026-11-02 às 17:00 sem `pnpm install`, provavelmente por outra sessão do app: o ESLint 10 lê a config dele, que resolve o `typescript-eslint` no `node_modules` da raiz, e o pacote passa a ver duas raízes. **Conserto:** `.claude/**` nos `ignores` do `eslint.config.js` (`6103b52`), direto na `main`, sem branch e PR, por ser de 3 linhas. O worktree não foi apagado.
- **Fica:** o autor aprova o plano (ou muda as escolhas); depois, a execução na branch `feat/direcao-visual-fatia-5`.

---

## 2026-11-02 (6): a quadra sem o losango

- **Pedido do autor** (`decisoes.md` 2026-11-02 (6)): tirar o losango amarelo das cartas da quadra, e nada mais.
- **Feito:** `QuadMarks` (`ui/cards/Card.tsx`) perdeu o losango; a spec 6 §6 foi atualizada. O teste da mesa falhou antes (4 losangos, contra 0) e passa depois.
- **O script de medição** (`decisoes.md` 2026-11-02 (7)): as fotos e a medida de uma cena, por variáveis de ambiente, viraram `packages/web/e2e/medir-cena.ts`, com `medir.config.ts`. Ele fica fora do `pnpm e2e` e da CI, porque a configuração padrão lista os arquivos que roda, e foi testado na Ressurreição (59 quadros/s com a CPU 4× nas duas telas).
- **O que a outra conta não vê, de propósito:** os rascunhos 1 a 4 do protótipo (`.superpowers/brainstorm/`, só nesta máquina). O aprovado, o 5, está no repositório, e nenhum artefato foi publicado.
- **O próximo passo não mudou:** o plano da fatia 5, no `estado.md`.

---

## 2026-11-02 (5): a Ressurreição aprovada, e a passagem para a outra conta

- **Pedido do autor** (`decisoes.md` 2026-11-02 (5)): "Joguei, aprovado. vou continuar da outra conta".
- **Feito, só memória, nenhum código:** a aprovação em `decisoes.md`; o `estado.md` com o próximo passo e o mapa da fatia 5, lido do §8 da spec e do código.
- **Não feito, de propósito:** o plano da fatia 5. Não existe branch, plano nem arquivo dela.
- **Conferido:** as duas CI verdes no último commit de código e no de memória (runs `41465757404` e `41467788759`).

---

## 2026-11-02 (4): sub-projeto 6, fatia 4b em execução (a Ressurreição)

- **Pedido do autor** (`decisoes.md` 2026-11-02 (4)): "Aprovado, execute". Plano em `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4b.md`, na branch
  `feat/direcao-visual-fatia-4b`.
- **Task 1, os tempos e o que a mesa diz:**
  - `SCENE_MS.Resurrected`: 4,6 s; os instantes moram em `SCENE_MOMENTS.RESURRECTED`; o `Resurrected` virou cena rara, sem inversão;
  - `resurrectionInfo` (`model/effects.ts`) lê da `view` a vaga da carta e a quadra que acende, primeiro na fileira de destino, a de maior valor, sem contar a carta que volta;
  - **Escolha:** com duas quadras na mesma fileira, a de maior valor: é a que mais soma na conta que o jogador vê.

- **Task 2, a cena:**
  - `ui/scenes/sky.ts` (o portal, o chão e o alto, presos à faixa) e `ui/scenes/Resurrection.tsx`. O `SceneBox` mede o cemitério (`[data-cemiterio]`), e o `Stage` passa `rising` às cenas;
  - **Escolhas:**
    - a carta de verdade fica com `visibility: hidden` por um `useLayoutEffect` da cena, que a devolve ao pousar ou ao desmontar (o pulo). As cópias usam ids `cena-…`, para esse seletor nunca pegar uma delas;
    - a carta cinza é o `Card` com `grave`, o mesmo desenho do cemitério, e a cor volta por opacidade;
    - as cópias da quadra ficam até o céu sumir: se saíssem antes, a carta "apagaria" de repente sob a cortina;
    - o `useMeasuredBox` ganhou `before`, para rolar os campos antes de medir;
  - **Achado:** o Vitest da web só roda `test/ui/**/*.test.tsx`. O `scenes-mirror.test.ts` da fatia 4 **nunca tinha rodado**, nem na CI, e o `scenes-sky` também não rodaria. Os dois viraram `.tsx` e passam: o Reflect não tinha defeito escondido ali.

- **Task 3, o som:** a pista `ressurreicao`: o brilho dos fios, o sopro do portal, a escala que sobe com a carta, o acorde maior na cor e o toque ao pousar. **Não conferida de ouvido:** os testes medem os instantes e o volume. No caminho, as funções de apoio do Reflect subiram para antes do comentário das receitas.

- **Task 4, E2E, medição e documentação:**
  - nenhuma partida nova: a `exodia-devastacao.json` tem a sua com a quadra (passo 27), a do Bot com a quadra na outra fileira (107) e a do Bot sem quadra (182);
  - o E2E das cenas passou a 18 testes, no PC e a 360 × 640: a cena, a cortina sem tarjas, a carta de verdade escondida e depois visível, o portal e a carta na janela, nenhuma inversão (a própria página vigia a cada quadro) e o pulo;
  - medição em `notas/medicao-fatia-4b.md`: 57 a 60 quadros/s com a CPU 4×, pico de 45 partículas;
  - **Defeito achado pelas fotos, com o teste que falhou antes (6 px contra > 20):** as cópias da quadra colapsavam num ponto, porque a carta usa `w-full` e o elemento em volta encolhia até o conteúdo.
- **Não visto de verdade:** o som; o movimento reduzido e o caso de duas quadras na mesa só têm testes de unidade.
- **Pequeno, para depois:** o total da fileira já conta a carta no começo da cena (o autor viu essa escolha no plano); os controles do replay no meio de uma cena não cortam o som dela (o mesmo das fatias anteriores).

- **Revisão final:** de quem escreveu o código, sem subagente, como o autor aprovou: o diff por arquivo e os cinco itens do Review Focus contra os testes. Não sobrou achado grande.
- **Na `main` por fast-forward,** com o `pnpm check` completo no pre-push e as duas CI verdes na branch (run `41465757404`). Com ela, as seis cenas especiais do §7 estão entregues.
- **Fica:** o autor joga. Depois, o plano da fatia 5 (a fluidez), a última do sub-projeto 6.

---

## 2026-11-02 (3): o Reflect aprovado, e o plano da Ressurreição

- **Pedido do autor** (`decisoes.md` 2026-11-02 (3)): "aprovado, prossiga para ressureição", com a memória consolidada.
- **Feito:** o plano, `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4b.md`, esperando a aprovação. Nenhum código, e nenhuma branch.
- **O que a leitura do código deu ao plano:**
  - **qual quadra acende:** o motor gasta a Ressurreição mais antiga ainda válida (`tokens[0]`, `actions/main.ts`), mas o evento `Resurrected` não diz qual é, e a `view` só tem `resurrectionCount`. As partidas de referência guardam os eventos e entram no digest do `RULES_VERSION` (`rules-version.test.ts`): pôr a quadra no evento obrigaria a subir a versão de 4 para 5, com aviso em todo replay guardado, sem mudar nenhuma regra. O plano escolhe a quadra pela mesa (`resurrectionInfo`). **O custo:** com duas quadras na mesa, pode acender a outra. Se o autor quiser a exata, é a mudança no evento;
  - **a carta de verdade aparece cedo demais:** o `state` a põe na fileira no commit em que a cena começa, e a cópia ainda vai subir. A cena esconde o elemento dela (`[data-card-id]`) até pousar;
  - **4,6 s, e não ~4,9 s:** o `wait` do protótipo soma 4,55 s; a spec permite ajustes de até 15%;
  - **as fixtures bastam:** `exodia-devastacao.json` tem 13 Ressurreições.
- **Ao ler:** o Reflect foi aprovado sem ajustes; o que não foi conferido segue no `estado.md`.

---

## 2026-11-02 (2): sub-projeto 6, fatia 4 em execução (o Reflect)

- **Pedido do autor** (`decisoes.md` 2026-11-02 (2)): "Aprovado, execute". Plano em `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4.md`, na
  branch `feat/direcao-visual-fatia-4`.
- **Task 1, os tempos e as batidas:**
  - `SCENE_MS`: `ReflectTriggered` 3,8 s e `ReflectCanceled` 1,4 s (o `ReflectPlayed` fica em 1,5 s). Os instantes moram em `SCENE_MOMENTS`;
  - as três cenas são raras (não encolhem no teto de decisão), e `BEAT_MS.scene` saiu;
  - `Beat.hit` também guarda o próprio `ReflectTriggered`, com dano; `Beat.intercepted` marca o Ataque Absoluto que bate num Reflect;
  - `RIBBON_SCENES` junta as canceladas (sem nome, com fita), e a fita "Os Reflects se anularam" entrou;
  - **Escolhas:**
    - **a sonda dos testes de flash:** o `animation.test` usava o Reflect como "cena de 1,5 s que inverte aos 150 ms", e nenhuma cena real inverte tão
      cedo agora. Para não perder esses testes da trava, `installFlashProbe` (`test/ui/anim-harness.tsx`) ajusta a tabela só neles, com o `ReflectPlayed`;
    - **o exemplo do resfriamento na linha do tempo** passou a ser `[AbsoluteAttack, RowDevastated]`, cujas inversões ficam a 1,87 s;
    - **sem cena encolhida no teto de decisão,** os testes "sob o teto de 1 s" viraram: a cena fica inteira, e a cortina desce e sobe entre duas cenas
      separadas por uma faixa. Entrou o caso real do Ataque Absoluto contra Reflect, com uma inversão só;
    - **o golpe de cena treme sempre forte,** também o dano devolvido, como o do Ataque Absoluto.
- **Task 2, o espelho:**
  - `ui/scenes/mirror.ts`: o tamanho (300 px no PC, na proporção da faixa no celular, nunca menos de 140), o centro a 60% do caminho, as pontas e as paradas do cometa, tudo preso à faixa;
  - `ui/scenes/ReflectPlayed.tsx`: as cópias voam às pontas, o espelho se forma com faíscas e lampejo e encolhe até a zona. `ui/table/MirrorMark.tsx` é o espelho pequeno, que sai de `player.reflect`;
  - **Escolhas:**
    - a `spawn` e o `shakeFrames` passaram para `ui/scenes/particles.ts`, com as faíscas (a Exódia e a Devastação tinham cópias);
    - as cópias são a carta pequena com a letra, como a dos K da Exódia, e não o `Card`;
    - as cartas saem da sua mão (de baixo da faixa) ou do retrato do oponente, que não mostra a dele;
    - o `MirrorMark` fica no canto da zona, em posição absoluta, para não mudar a altura dela no celular;
    - o `SCENE_INVERT_LEAD_MS` do lançamento é 0, porque a tabela exige a chave, e ele está em `NO_INVERT`.
- **Task 3, o cometa e a anulação:**
  - `ui/scenes/ReflectTriggered.tsx`: a carga, o cometa, o tempo lento, a batida, a volta dourada, os cacos, o número e o nome. Sem dano, ele se desfaz no vidro. `ui/scenes/ReflectCanceled.tsx`: dois espelhos que trincam e somem;
  - o Ataque Absoluto com `beat.intercepted` não dispara o feixe;
  - **Escolhas:**
    - o lugar do espelho e do cometa é medido uma vez, na montagem da cena: a janela que muda de tamanho não recomeça o voo;
    - uma brasa a cada 70 ms na ida e a cada 40 ms na volta, numa agenda de sementes fixas (o protótipo soltava 2 a cada 28 ms, lendo o `left` e o `top` do cometa);
    - as trincas reaproveitam o `crackBranch` do abismo; a anulação usa espelhos de 70% do tamanho, porque são dois na mesa;
    - o `HitNumber` do Ataque Absoluto é o mesmo do dano devolvido.
- **Task 4, os sons:** quatro pistas no lugar da `escudo`, que saiu: `reflect-armado` (os tinidos e o sino de vidro), `reflect-cometa` (a ida, a volta, o baque e o vidro), `reflect-segurado` (a mesma ida, e depois só o vidro) e `reflect-cancelado` (dois estalos de vidro). **Não conferidos de ouvido:** os testes medem os instantes e os limites de volume.
- **Task 5, E2E, medição e documentação:**
  - a busca limitada rodou 3.771 partidas: Reflect com dano em 900, Devastação refletida em 40, dano 0 em 5, e **nenhum** Reflect contra Reflect (os bots não usam `CANCEL_REFLECT`). A fixture `e2e/fixtures/reflect.json` é a semente `fatia4-220`, greedy × turtle, com o Reflect do Bot e uma Devastação refletida, que fecha a refletida que a fatia 3 não tinha visto no navegador;
  - o E2E das cenas passou a 14 testes, no PC e a 360 × 640: o espelho inteiro na janela, a volta dourada, o número, o nome, o pulo e a vida final;
  - medição em `notas/medicao-fatia-4.md`: 52 a 56 quadros/s com a CPU 4×, pico de 34 partículas;
  - **Dois defeitos achados pelas fotos, com teste ou correção:**
    - **o espelho e o cometa fora do lugar:** a cena media durante o render, com a mesa velha, e a zona que entra e sai muda a altura dos campos. Agora mede num `useLayoutEffect` (`ui/scenes/measured-box.ts`). **Sem teste de unidade:** o jsdom não tem layout; o E2E só garante o espelho dentro da janela, e o resto foi visto nas fotos;
    - **a cena longa sem cortina:** a trava de flash recusava a subida, e ela não tentava de novo. Agora tenta quando a regra deixa, se faltarem 2 s de cena (`CURTAIN_RETRY_LEFT_MS`). Dois testes antigos, que fixavam a Defesa Absoluta sem cortina depois de um pulo, foram atualizados: o limite de 3 trocas segue valendo;
  - **Escolhas:**
    - a volta dourada dura menos de meio segundo, e as consultas do Playwright a perdiam: o E2E procura dentro da página, a cada quadro;
    - nas Tasks 3 a 5, parte dos testes foi escrita junto com o código; no feixe interceptado, uma mutação confirmou que o teste pega o erro.
- **Não visto de verdade:** o som; Reflect contra Reflect, dano 0, o seu próprio Reflect, o Ataque Absoluto contra Reflect e o movimento reduzido só têm testes de unidade.
- **Pequenos, para depois:** os controles do replay no meio de uma cena não cortam o som dela (o mesmo das fatias 2 e 3).

- **Revisão final:** de quem escreveu o código, sem subagente, como o autor aprovou: o diff inteiro por arquivo e os cinco itens do Review Focus contra os testes. Não sobrou achado grande.
- **Na `main` por fast-forward,** com o `pnpm check` completo no pre-push e as duas CI verdes na branch (run `41390496730`). Os testes da web seguem acima de 99% de linhas.
- **Fica:** o autor joga. Depois, o plano da fatia 4b (a Ressurreição).

---

## 2026-11-02 (1): o plano do Reflect (a fatia 4 dividida)

- **Pedido do autor** (`decisoes.md` 2026-11-02 (1)): "prossiga, acredito que dá para fazer pelo menos reflect. vamos fazer ressurreição
  posteriormente." A spec §14 ganhou a fatia 4b.
- **Feito:** o plano, `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4.md`, esperando a aprovação. Nenhum código, e nenhuma branch.
- **O que a leitura do código deu ao plano:**
  - o motor não solta `ReflectTriggered` na Devastação refletida: depois do espelho vem direto o `RowDevastated`, sem cometa;
  - hoje os Reflects encolhem com uma decisão pendente (não são raras), e a cena de 3,8 s pede que sejam;
  - o Ataque Absoluto contra Reflect dispara o feixe no retrato sem acertar nada: o plano o desliga (`Beat.intercepted`);
  - no gatilho, a vista já não tem o Reflect, e por isso a cena desenha o espelho sozinha;
  - a `spawn` das partículas tem duas cópias, que passam para um módulo comum.
- **O `estado.md`:** o mapa agora é só o da Ressurreição; o que era do Reflect foi para o plano.

---

## 2026-11-01 (5): a fatia 3 aprovada e a passagem para a outra conta

- **Pedido do autor** (`decisoes.md` 2026-11-01 (6)): "testado aprovado"; o limite semanal está acabando, a outra conta assume, e as
  tarefas pendentes devem ser encurtadas para nada ficar pela metade.
- **Feito, só memória, nenhum código:**
  - a aprovação em `decisoes.md`;
  - o `estado.md` com a sequência da retomada e o mapa do que o plano da fatia 4 precisa decidir;
  - a duração atual das cenas em `notas/playtest.md` (dizia 2,6 s e 4,2 s, de antes do sub-projeto 6).
- **Não feito, de propósito:** o plano da fatia 4. Não existe branch, plano nem arquivo dela.
- **Conferido:** todas as branches locais já estão mescladas na `main`, e o `push-merge até o MVP` está em `decisoes.md`, não só na memória
  pessoal desta conta.

---

## 2026-11-01 (4): sub-projeto 6, fatia 3 em execução (a Exódia e a Devastação), entregue

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
- **Task 5, os sons** (`263e6ce`): as receitas `exodia`, `devastacao` e `devastacao-cancelada` nos instantes da tabela. A pista `absoluto`
  ficou sem uso e saiu (`Cue`, `synth.ts` e `synth.test.ts`; o plano não a mencionava). O som só foi conferido pelos instantes das
  vozes, não pelo ouvido.
- **Task 6, o E2E, a medição e os docs:**
  - a fixture `e2e/fixtures/exodia-devastacao.json` é uma só partida com as duas cenas (semente `fatia3-0`, turtle × turtle, achada com um
    script temporário). A Devastação vai do passo 210 para o 211, e a Exódia do 407 para o 408;
  - `e2e/scenes.spec.ts` ganhou os dois casos, a 1366 × 768 e a 360 × 640 (8 testes, verdes);
  - **ver no navegador achou o que os testes não acham** (`58f1157`): o tremor do campo abria uma barra de rolagem de lado nos campos. Os
    campos agora não rolam de lado, e o E2E confere. Também: a fenda corre por cima das cartas, a rolagem até a fileira deixa 12 px de
    folga (o tremor a empurrava para fora da janela), a terra revirada ficou mais visível e o carimbo fica ao lado da fileira, sem cobrir
    as cartas que caem;
  - a medição está em `notas/medicao-fatia-3.md`: ≥ 87 quadros por segundo com a CPU 4×, e no máximo 30 partículas.
- **Revisão final:** feita por quem escreveu o código, sem subagente (a regra do projeto é só com pedido do autor), contra o Review Focus
  do plano. Achou só um comentário desatualizado. **Pequenos, para depois:**
  - se a janela mudar de tamanho com o abismo aberto, as cartas voltam a cair do começo;
  - as rachaduras são menos ásperas que as do protótipo, e a Exódia não treme a tela (o autor confere jogando se falta peso);
  - no replay, os controles no meio de uma cena não cortam o som dela (o mesmo da fatia 2).
- **Entrega:** fast-forward na `main` (`fefcb15`), com as duas CI verdes no último commit da branch (run `41344406298`: `check` e `e2e`). O autor
  ainda vai jogar.
- **O que quem continua precisa saber:**
  - **não conferido de verdade:** o som (só os instantes), a cancelada e a refletida (só testes de unidade: nas 467 Devastações da busca
    com bots, nenhuma foi cancelada, e a refletida não foi procurada) e o movimento reduzido;
  - **para ver as cenas sem esperar no treino:** importe a fixture e abra `/partidas/exodia-devastacao`, passo 210 (a Devastação) e passo
    407 (a Exódia), e clique em "Próximo passo";
  - **a revisão final** (tarefa do `executing-plans`) foi feita por quem escreveu o código nas fatias anteriores, sem subagente, e isso
    é dito ao autor;
  - **no E2E com o `wrangler dev` do autor na 8787:** copie o `playwright.config.ts` para um arquivo temporário com `PORT = 8788`, rode com
    `-c` e apague (não mexa no de verdade);
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
