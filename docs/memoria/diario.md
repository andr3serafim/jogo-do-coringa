# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

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
