# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

---

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
