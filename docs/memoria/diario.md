# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

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
