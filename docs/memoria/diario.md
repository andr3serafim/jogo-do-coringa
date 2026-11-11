# Diário de trabalho

Uma entrada por bloco de trabalho, a mais nova em cima: data, conta/sessão, o que foi feito, commits, o que ficou e as
armadilhas. O estado de agora fica em `estado.md`; as decisões do autor, em `decisoes.md`.

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
