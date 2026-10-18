# Jogo do Coringa — Interface web (Sub-projeto 3)

- **Data:** 2026-10-17
- **Status:** rascunho, aguardando a revisão do autor (a direção visual, §10, está em aberto)
- **Depende de:**
  - spec do sub-projeto 1, `docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md` (regras, API do motor, eventos);
  - spec do sub-projeto 2, `docs/superpowers/specs/2026-10-16-servidor-multiplayer-design.md` (protocolo, tempos, presença, W.O., deploy).

---

## 0. Contexto e escopo

### 0.1 Objetivo

Fechar o MVP: dois amigos jogam uma partida online pelo navegador, entrando por um link, sem conta. O teste de sucesso:

- os dois abrem o link e entendem a mesa sem tutorial;
- jogam a partida inteira sem dúvida sobre de quem é a vez e quanto tempo falta;
- sabem quanto dano o ataque vai causar antes de atacar;
- pedem revanche.

### 0.2 Legenda das marcações

- **[D]** decidido antes desta spec (specs 1 e 2 ou sessão de origem); não se rediscute.
- **[A]** decidido pelo autor em 2026-10-17, no lote de 11 perguntas desta spec (aprovou todas as recomendações).
- **[P]** proposta desta spec; o autor confere na revisão.

### 0.3 Já decidido [D]

- React + Vite + Tailwind + Motion. Textos em pt-BR. Jogável no celular.
- Salas por link `<origem>/s/<CÓDIGO>`, com apelido e sem conta. O token de reconexão fica no navegador, por sala (spec 2 §2.2).
- A interface só envia intenções; o servidor é a autoridade.
- O mesmo Worker serve a interface (static assets), na mesma origem e sem CORS (spec 2 §3 e §10.3). Cloudflare Pages fica descartado: seria outra origem, com CORS e mudança em `ALLOWED_ORIGINS`.
- **Escolha da iniciativa:** "atacar primeiro" vem pré-selecionado, sem travar a rodada, e a regra continua desligável pela chave `initiativeChoice` até o playtest do autor (spec 1 §3).
- **Passe automático:** a decisão é deste sub-projeto e precisa respeitar o piso de 2 s da janela de reação (spec 2 §6.3 e §14).

### 0.4 Decidido pelo autor [A]

1. **Direção visual:** eu monto rascunhos e o autor reage. Estado atual em §10.
2. **Aparelho principal:** celular em pé (retrato), com o PC adaptado a partir dele. No celular deitado a mesa funciona, mas sem layout próprio.
3. **Jogar uma carta:** toca na carta, aparecem as jogadas possíveis, toca no alvo. O mesmo gesto vale no celular e no PC, e tudo funciona pelo teclado. Arrastar fica para o polimento.
4. **Jogadas automáticas levam a marca `auto`.** O servidor não zera a contagem de estouros por elas (§5). Com essa marca:
   - a) a janela de reação **passa sozinha** quando não há resposta possível. A chave vem ligada e pode ser desligada (para blefar);
   - b) a Escolha da iniciativa **confirma "atacar primeiro" sozinha** depois de ~3 s sem interação.
5. **Equipar:**
   - carta a carta, com prévia de ATK/DEF, Desfazer e Confirmar;
   - 1,5 s antes do prazo, o navegador envia o que o jogador escolheu e completa o resto pela regra de estouro;
   - quem não escolheu nada não envia nada (o estouro conta).
6. **Prévia do dano:** mostra o desfecho previsto (K absorve, Reflect devolve, Defesa Absoluta zera), por uma função nova do motor, testada contra a resolução real. Vale também para a ameaça do oponente.
7. **Animações:** rápidas (um ataque inteiro em ~2 s) e puláveis com um toque. Cenas especiais só para Exódia, os Absolutos e o Reflect. O "reduzir movimento" do sistema é respeitado.
8. **Lobby:** botão "Pronto" explícito.
9. **E2E:** Playwright com dois navegadores contra o servidor local, num job separado da CI, fora do `pnpm check`. O check ganha os testes de unidade e de componentes e o build da interface.
10. **Treino contra o bot no navegador:** sala local, sem servidor, numa rota simples e sem polimento. A versão caprichada continua no sub-projeto 4.
11. **Celular em segundo plano:** ficam os 60 s até o W.O. A interface reconecta assim que o jogador volta e avisa da regra no lobby.

### 0.5 Não-objetivos

- Som, tutorial interativo, chat, espectadores, histórico ou replay entre salas, contas, ranking.
- Arrastar cartas, vibração e notificação do sistema: polimento (sub-projeto 4).
- Instalação como app (PWA), modo offline, outros idiomas.
- Escolher regras ou tempos por sala; deploy automático pela CI.
- Treino contra o bot com relógio, níveis de dificuldade ou tutorial (sub-projeto 4).

### 0.6 Anti-objetivos (falhas mesmo que "funcione")

- A interface **decidir** uma regra, ou mostrar um número que diverge do motor. Totais e prévias vêm de funções do motor, nunca de conta própria da interface.
- Um botão clicável sobre uma mesa velha enquanto o relógio corre. Os controles valem sempre sobre a última `view` recebida.
- Vazar informação oculta pela interface: no DOM, no console, nos logs ou no tempo, além do que o piso de 2 s já cobre.
- Uma animação que esconde o estado, ou que segura uma decisão por mais de ~1 s com o relógio correndo.
- Uma jogada automática que zere a contagem de ausência.
- Mesa que não cabe em 360 px de largura sem rolagem horizontal.

---

## 1. Arquitetura

### 1.1 Pacote `packages/web` (`@coringa/web`) [P]

- Vite + React 19 + TypeScript + Tailwind 4 + Motion (`motion/react`). Versões com `^`, por causa do `minimumReleaseAge` do pnpm 11.
- **Exceção ao "Node puro" do `CLAUDE.md`:** é o único pacote com bundler. Motor, protocolo, simulador e núcleo do servidor continuam rodando no Node sem bundler. A web nunca empurra para eles algo que só funcione com bundler.
- O smoke da web é o `vite build`.
- Dependências de workspace:
  - `@coringa/engine`: `legalActions`, `attackPower`/`defensePower`, as funções novas de §8.2 e os tipos;
  - `@coringa/protocol`: `RoomClient`, `createRoom`/`joinRoom`/`roomInfo`, código e link, apelido, constantes e tipos. **Nunca** `@coringa/protocol/schemas` (o Zod fica fora do bundle; o ESLint barra);
  - `@coringa/sim`: só pelos subpaths `./bots` e `./text`, que rodam no navegador (§1.4).
- Saída do build em `packages/web/dist` (no `.gitignore`).

### 1.2 Camadas: núcleo puro e casca fina [P]

Mesmo padrão do servidor: a lógica fica em TypeScript puro, testável no Node, e o React só desenha.

| Pasta | Conteúdo | Depende de |
|---|---|---|
| `src/model/` | sessão (estado da conexão, sala, último `state`, jogada pendente), derivações da mesa (jogadas possíveis por carta, alvos, Equipar passo a passo, prévias), relógio, linha do tempo das animações, persistência local, sala local de treino | motor, protocolo, `@coringa/sim/bots`, `@coringa/sim/text`; **sem** React e sem DOM (o `localStorage` entra por parâmetro) |
| `src/ui/` | componentes da mesa, cartas, lobby, telas, animações | `src/model`, React, Motion |
| `src/app/` | rotas, montagem da sessão, fronteira de erro | os dois acima |

- O estado da sessão é um *store* externo lido com `useSyncExternalStore` (ou uma biblioteca equivalente, à escolha de quem constrói).
- Um único `RoomConnection` por aba.

### 1.3 Conexão: `RoomConnection` [D + P]

A interface conversa com a sala pela interface `RoomConnection` que o `@coringa/protocol` já exporta. Há duas implementações:

- `RoomClient` (online, já existe);
- `LocalRoom` (treino, §2.6), nova, em `packages/web/src/model`.

O resto da interface não sabe qual das duas está usando.

### 1.4 Reaproveitamento do simulador [P]

- `@coringa/sim` ganha `exports` para `./bots` (`src/bots/index.ts`), `./rng` (`src/rng.ts`, o `createRng` de que os bots precisam) e `./text` (`src/play/text.ts`). Esses arquivos já não importam nada de `node:*`. Uma regra do ESLint passa a barrar `node:*` neles e em `packages/web/src`.
- `text.ts` dá os textos em pt-BR de cartas, ações, eventos e resultados, já usados no terminal. A interface monta o `Names` com "Você" e o apelido do oponente. O histórico da mesa e os anúncios para leitor de tela saem daí, iguais ao terminal.
- Não há ciclo: a web depende do simulador, e o simulador não depende da web.
- Alternativa que quem constrói pode escolher: extrair esses arquivos para um pacote próprio. O que não pode é a web manter uma cópia dos textos.

### 1.5 Fluxo de uma jogada [P]

1. A mesa desenha a `view` do último `state` e calcula as jogadas pela lista de `legalActions(view)`.
2. O jogador escolhe. A interface monta a `PlayerAction` com a carta que ele tocou.
   - `legalActions` devolve representantes canônicos: a primeira carta de cada tipo.
   - O motor aceita qualquer carta da mão do mesmo tipo (`takeFromHand` confere só o tipo).
   - Por isso a interface compara a jogada com a lista **pelo papel** (tipo de jogada, tipo de carta, alvo), não pelo id. Um teste garante que toda jogada montada pela interface é aceita pelo motor.
3. `connection.act(action)` leva a época do último `state`. Enquanto o `ack` não chega, os controles ficam desabilitados e a jogada mostra "enviando".
4. O `state` novo chega antes do `ack` (spec 2 §5, passo 8) e redesenha a mesa. Uma seleção em andamento só sobrevive se a época não mudou e a carta ainda estiver na mão.
   - O rascunho do Equipar sobrevive ao `state` em que o oponente confirma (a época é a mesma).
   - Depois de confirmar, a `view` não traz os destinos enviados (só `equipSubmitted`). A interface guarda o rascunho confirmado em memória até a revelação. Se a página recarregar nesse intervalo, aparece só "Você já confirmou; esperando Duda".
5. Um `ack` recusado segue a tabela de §6.4.

O endereço do servidor é `location.origin`, para o `RoomClient` e para as chamadas HTTP, tanto em produção quanto no ambiente local com o proxy do Vite.

---

## 2. Telas e fluxo

### 2.1 Rotas [P]

| Rota | Tela |
|---|---|
| `/` | Início: **Criar sala**, **Entrar com código ou link**, **Treinar contra o bot**. O apelido fica lembrado. |
| `/s/:code` | Sala: entrada, lobby, mesa ou fim, conforme o status da sala |
| `/treino` | Partida local contra o bot (§2.6) |
| qualquer outra | "Página não encontrada", com link para o início |

- Roteamento simples por `history` (sem framework de rotas pesado; a biblioteca fica a critério de quem constrói).
- O código vai na URL, o token nunca.

### 2.2 Entrar numa sala (`/s/:code`) [P]

1. Código fora do formato (`normalizeCode`) → tela "Código inválido", com um campo para digitar outro.
2. Há token salvo para esse código → conecta direto e mostra a tela que o status da sala pedir.
3. Não há token → `GET /api/rooms/:code`:
   - 404 → "Essa sala não existe ou já expirou", com o botão **Criar sala**;
   - `LOBBY` com assento livre → pede o apelido (com o lembrado já preenchido) → `POST /join` → guarda o token → conecta;
   - cheia ou fora do `LOBBY` → "Essa sala já está com dois jogadores", com o botão **Criar outra sala** (não há espectador).
4. Erros do HTTP:
   - 400 → apelido inválido, mostrado no campo (1 a 20 caracteres, sem controle; `normalizeNickname`);
   - 409 (corrida pelo assento) → igual a sala cheia;
   - 429 → "Muitas tentativas; espere um minuto";
   - falha de rede → "Sem conexão", com o botão **Tentar de novo**.

**Criar sala:** `POST /api/rooms` → guarda o token → vai para `/s/<CÓDIGO>`.

### 2.3 Lobby [A + P]

- Código grande e link, com os botões **Copiar link** e **Compartilhar**. O segundo usa a Web Share API, que no celular abre o WhatsApp e afins, e só aparece onde ela existe.
- Dois assentos com apelido, presença (conectado ou fora) e pronto.
- Botão **Estou pronto** (alterna) [A]. O servidor começa a partida com os dois prontos e conectados.
- **Aviso fixo [A]:** "Durante a partida, se você sair do navegador por mais de 1 minuto, perde por W.O."
- Cair no lobby desmarca o pronto (spec 2 §2.3). Na volta, o botão aparece desmarcado com a explicação "você saiu da sala; marque pronto de novo".
- **Sair da sala** → `leave` → volta ao início.

### 2.4 Mesa

A mesa está em §3 e §4. O menu da partida tem:

- **Copiar link da sala**;
- **Passar sozinho quando não tenho resposta** (chave, ligada por padrão) [A];
- **Reduzir animações** (chave; liga sozinha com `prefers-reduced-motion`) [P];
- **Resumo das regras**: uma página estática, curta, sobre o que cada carta faz. O texto sai da spec 1 §1.6–§1.8, e o autor o revisa no PR [P];
- **Desistir**, com confirmação ("Você perde esta partida por W.O.") → `concede`.

### 2.5 Fim de partida e revanche [P]

- Um painel sobre a mesa final, que continua visível e só para ver.
- O painel mostra:
  - o resultado: "Você venceu", "Duda venceu", "Empate" ou "Partida sem resultado";
  - o motivo:
    - pelo motor: vida zerada, Exódia ou anti-travamento;
    - pelo `outcome.cause` do servidor: caiu e não voltou em 60 s, três tempos estourados, desistência ou os dois saíram;
  - o placar da sala.
- Botões:
  - **Revanche**, que alterna. O painel mostra "esperando Duda" ou "Duda quer revanche".
  - **Ver a mesa**, que recolhe o painel.
  - **Nova sala**, que fecha a conexão e volta ao início.
- Com os dois pedindo e conectados, o servidor começa outra partida (`gameNo` novo). A mesa recomeça com a animação da distribuição.

### 2.6 Treino contra o bot (`LocalRoom`) [A + P]

- `LocalRoom` implementa `RoomConnection` com o motor (`createGame`, `applyAction`, `viewFor`, `viewEvents`, `legalActions`) e o bot `greedy` de `@coringa/sim/bots`.
- A semente vem de `crypto.getRandomValues`. Com `?semente=<texto>` na URL, a partida se repete, o que serve aos testes.
- **Sem relógio:** `deadline` é sempre `null`, e a faixa central diz "Treino, sem relógio". O passe automático e o envio antecipado do Equipar não se aplicam.
- O bot "pensa" ~600 ms antes de cada jogada, para dar para acompanhar. Na janela de reação, ele responde na hora.
- Emite um `room` sintético: assentos "Você" e "Bot", status `PLAYING` e `FINISHED`, placar local. A revanche começa outra partida com outra semente.
- Usa as mesmas telas da mesa e do fim. Não tem lobby.
- Também é a base dos testes de componentes e de um E2E determinístico (§9).

---

## 3. A mesa

### 3.1 O que aparece (para cada jogador) [P]

- **Coringa:** avatar, apelido, vida (número e barra), presença do oponente.
- **Guarda:** os K, com a contagem.
- **Buffs de Ataque** (J, até 4) e **Buffs de Defesa** (Q, até 4). O Selvagem aparece com o papel que assumiu.
- **Fileira de Ataque** e **Fileira de Defesa**:
  - até 7 cartas, com as vagas vazias desenhadas até o limite;
  - a carta da frente traz a marca "sai primeiro" (as fileiras são filas, spec 1 §1.2);
  - cada fileira mostra o total e a conta: "152 · 38 × 4", "42 · 14 × 3". O total vem de `attackPower` e `defensePower`;
  - a quadra aparece destacada nas quatro cartas, com "+V" no total.
- **Marcas de estado no Coringa:** Reflect ativo, Defesa Absoluta, Ressurreições disponíveis (com contagem), Ataque Absoluto armado (4 J).
- **Mão:**
  - a própria, com o papel escrito em cada carta (Guarda, Buff de ataque, Buff de defesa, Armadilha, Selvagem);
  - a do oponente, só a quantidade de versos.
- **Faixa central:**
  - rodada e tipo (Equipar ou Ataque);
  - de quem é a vez e o relógio;
  - Pressão da mesa: +N e as rodadas sem dano. Faltando 2 ou menos para o anti-travamento, aparece "faltam N rodadas sem dano para o fim por anti-travamento";
  - iniciativa, com a ordem escolhida na rodada;
  - monte (quantidade);
  - cemitério: a carta de cima e a quantidade. Um toque abre a lista inteira, que é pública.
- **No Equipar:** o oponente aparece como "montando 3 cartas…" (`pendingCount`, que é público) ou "pronto".
- **Histórico:** os textos de `@coringa/sim/text`. No PC fica numa coluna lateral; no celular, numa gaveta com a contagem do que é novo.

### 3.2 Celular em pé (360–430 px) [A + P]

- **Ordem, de cima para baixo:**
  1. o oponente: cabeçalho (Coringa, vida, mão, menu), Guarda e buffs, Defesa e Ataque;
  2. a faixa central;
  3. você: Ataque e Defesa, Guarda e buffs, vida;
  4. a mão;
  5. a barra de ação.
- As duas fileiras de Ataque ficam junto da faixa central, frente a frente. Esse é o arranjo dos rascunhos e pode mudar na reação do autor.
- **Sete cartas cabem em 360 px.** O tamanho das cartas acompanha a largura: ~34 × 48 px a 360, ~38 × 52 a 390. Nada rola de lado.
- **Alvo de toque ≥ 44 px:**
  - cartas da mesa menores que isso ganham área de toque invisível, sem sobrepor a vizinha;
  - na escolha de alvo, a barra de ação também lista os alvos válidos como botões grandes ("K♣ da Guarda de Duda", "J♠ dos Buffs de Ataque…"). Isso serve ao toque, ao teclado e ao leitor de tela.
- `100dvh`, as margens seguras (`env(safe-area-inset-*)`) e `overscroll-behavior: none` na mesa, para o puxar-para-atualizar não recarregar a página no meio da partida.
- Campos de texto com fonte ≥ 16 px, para o iPhone não dar zoom.

### 3.3 PC e tablet [P]

- **≥ 1024 px:** a mesa fica no centro, com cartas maiores. Uma coluna lateral leva o histórico, a sala, o placar e o menu. A barra de ação mostra a prévia completa (§4.6).
- **600–1023 px:** o layout do celular, ampliado, com o histórico em gaveta.
- Passar o mouse sobre uma carta mostra o papel e o efeito. É ajuda, nunca o único caminho para a informação.

### 3.4 Jogar uma carta: tocar → jogadas → alvo [A]

**Tocar uma carta da mão** mostra, na barra de ação, as jogadas possíveis com ela, tiradas de `legalActions`:

| Carta | Jogadas |
|---|---|
| K | **Pôr na Guarda**. Com mais de um K na mão: "Pôr 1 K", "Pôr 2 K"… Vários K numa jogada só abrem uma janela de reação. |
| J | **Buff de ataque**; **Sacrifício** (destruir um J de Duda), se houver alvo |
| Q | **Buff de defesa**; **Sacrifício** (destruir uma Q de Duda), se houver alvo |
| A | **Armadilha** → escolher o alvo (J, Q ou K de Duda) |
| Selvagem | escolher o papel (J, Q ou A) → segue como a carta escolhida |

**Jogadas de várias cartas** aparecem como botões próprios quando são possíveis:

- **Lançar Reflect** (K + J + Q da mão).
- **Anular o Reflect** (K + J + Q da mão, na janela de reação).
- **Proteger-se do Reflect** (sacrificando J + Q + K do próprio campo).
- Em todas elas, a interface prefere cartas reais ao Selvagem e diz quais cartas vão sair ("sai J♥ + Q♣ + K♥ do seu campo").

**Ressuscitar:** abre o cemitério filtrado nas numéricas → escolhe a carta → escolhe a fileira (só as que têm vaga).

**Atacar ou encerrar o turno:**

- o botão principal está sempre visível na fase principal: **Atacar**, com a prévia, ou **Encerrar turno**, quando o Ataque está vazio;
- não há confirmação, mas o botão fica longe da mão, para evitar toque sem querer.

**Cancelar:** botão **Cancelar** ou a tecla Esc.

**Escolher o alvo:**

- os alvos válidos ganham destaque na mesa e aparecem em lista na barra;
- ao apontar um alvo, a prévia mostra o efeito ("quebrando o K: 110 de dano").

**Teclado:**

- Tab segue a ordem mão → alvos → barra de ação;
- Enter e Espaço escolhem, Esc cancela;
- sem atalhos de uma tecla no MVP, para evitar jogada sem querer.

### 3.5 Equipar carta a carta [A + P]

- As numéricas pendentes (`self.pending`, na ordem de compra) aparecem como fila: "Carta 1 de 3". A carta da vez aparece grande, com os destinos:
  - **Ataque** e **Defesa** (só as fileiras com vaga);
  - com as duas cheias: **Trocar a última do Ataque (sai 9♠)**, **Trocar a última da Defesa (sai 5♥)** e **Descartar**.
- Só aparecem destinos que levam a uma montagem legal: o mesmo filtro do `askEquip` do terminal, sobre os `EQUIP` de `legalActions`.
- A escolha aparece na fileira como rascunho (carta translúcida), e os totais e a quadra se atualizam. Exemplo: "forma quadra de 7: +7 e 1 Ressurreição".
- **Desfazer** volta um passo; **Recomeçar** volta ao início.
- Com todas posicionadas, aparece **Confirmar**, sem envio automático na hora. Depois de confirmar, aparece "Esperando Duda montar…".
- Especiais recebidas vão para a mão e aparecem chegando lá.
- Quem não recebeu numéricas tem o Equipar enviado pelo servidor (spec 2 §5). A interface mostra "Você não recebeu numéricas nesta rodada".
- **Envio antecipado [A]:**
  - quando faltam 1,5 s pelo relógio do servidor (`remainingMs`), se o jogador escolheu ao menos uma carta e não confirmou, a interface envia `EQUIP` com as escolhas feitas;
  - o resto é completado pela regra de estouro do motor, a fileira com menos cartas (empate → Defesa; as duas cheias → descarte). A conta vem de `autoDestinations` exportada (§8.2), nunca de uma cópia;
  - é uma jogada voluntária (o jogador escolheu) e vai **sem** a marca `auto`;
  - com nenhuma escolha feita, nada é enviado: o servidor aplica o estouro, que conta para o W.O. por ausência.

### 3.6 Escolha da iniciativa [D + A]

- Para quem tem a iniciativa, a barra de ação mostra: "Você tem a iniciativa: atacar primeiro ou em segundo?".
  - **Atacar primeiro** vem pré-selecionado, com uma barra de 3 s. Os 3 s contam a partir de quando o painel aparece, depois das batidas da revelação do Equipar (§4.1).
  - Qualquer interação com o painel (toque, foco, mouse por cima) cancela a confirmação automática. Aí vale o prazo do servidor (10 s).
  - Sem interação, a interface envia `CHOOSE_ORDER { first: true }` com a marca `auto`.
- O outro vê "Duda está escolhendo a ordem…".
- Com `initiativeChoice` desligada, a fase não existe e nada aparece.

### 3.7 Janela de reação [A + P]

**Quem responde:**

- Um aviso diz o gatilho e a prévia. Exemplos:
  - "Duda declarou ataque: 84 contra sua Defesa 46 → seu K absorve";
  - "Duda pôs 2 K na Guarda";
  - "Duda lançou um Reflect".
- Abaixo, as respostas possíveis, o botão **Passar** e o relógio de 8 s, grande.
- Depois de uma Armadilha a janela continua aberta (o motor aceita várias), e as respostas seguem disponíveis.

**Passe automático [A]:**

- Acontece quando `legalActions` só tem `PASS` e a chave do menu está ligada.
- A interface envia `PASS` com a marca `auto` assim que recebe o `state` da janela aberta, sem esperar as batidas da animação, e mostra "Sem resposta possível; passando".
- O servidor segura o passe até completar 2 s (`ack.held`).
- Com a chave desligada, o jogador clica em **Passar** ou espera o prazo.

**Quem espera:**

- O aviso é "Duda pode reagir…", com o relógio da janela.
- O próprio turno aparece pausado com o que sobrou (`pausedTurnMs`): "seu turno: 21 s, pausado".

**Risco aceito:** com o passe automático, uma janela que fecha em exatos 2 s sugere que o outro não tinha resposta. A chave existe para quem quiser blefar. Entre amigos, o risco é aceito.

### 3.8 Relógio [P]

- **A fonte é o servidor:** `deadline.at`, mais o deslocamento de relógio do `RoomClient` (`remainingMs`).
- O relógio aparece em segundos inteiros. Faltando 5 s, entra em urgência (cor e forma). Os anúncios para leitor de tela saem no começo do prazo e aos 10 e 5 s, só nos prazos do próprio jogador.
- `deadline.players` diz de quem é o prazo. No Equipar são os dois.
- **Fim do prazo:** o servidor injeta o estouro em `at + 500 ms`. Até chegar o `state`, a interface mostra "tempo esgotado" e mantém os controles desligados.
- O relógio local só decide duas coisas: o envio antecipado do Equipar e a confirmação automática da ordem. Nada mais.

### 3.9 Presença do oponente [P]

- Assento com `connected: false` durante a partida → aviso "Duda caiu. Se não voltar em 0:43, você vence por W.O.", com a contagem a partir de `woAt`.
- A volta dele apaga o aviso e registra "Duda voltou" no histórico.

---

## 4. Animações dirigidas por eventos [A + P]

### 4.1 Princípios

- **A `view` mais recente é a verdade.** A mesa desenha sempre a última `view` e os controles valem sobre ela. As animações são transição e sobreposição, nunca um estado diferente.
- Cada carta tem id estável. Mudar de zona (mão → buffs, fileira → cemitério, monte → mão) é uma transição de layout, por exemplo com o `layoutId` do Motion.
- **A linha do tempo** (`src/model/timeline.ts`, puro) recebe os eventos de um `state` e devolve **batidas** em ordem. Cada batida tem duração, os elementos que anima e a sobreposição: número de dano, faixa de "ATAQUE ABSOLUTO", tremida do K quebrando.
- As transições de cada carta e as contagens de números, como a vida descendo, esperam a batida do evento que as causou.
- **Orçamento:**
  - batida comum: 250 a 350 ms;
  - número de dano: ~600 ms;
  - cenas especiais (Exódia, Ataque Absoluto, Defesa Absoluta, Reflect lançado e disparado): até ~1,5 s;
  - um ataque inteiro: ~2 s.
- **Decisão não espera animação:**
  - o que leva a uma decisão do jogador (a janela de reação aberta pelo ataque do outro) aparece em no máximo ~1 s;
  - o relógio mostra sempre o tempo real do servidor;
  - um toque em qualquer lugar da mesa termina as batidas na hora.
- Os controles ficam desligados durante as batidas e voltam no fim ou no pulo, com no máximo ~1 s de espera.
- **`catchUp: true`** (eventos perdidos na reconexão): as batidas tocam em velocidade dobrada, sem cenas especiais e com teto de ~3 s. O histórico marca "Enquanto você estava fora".
- **`resync: true`:** a mesa troca de uma vez, sem animação. O histórico registra "Mesa sincronizada".
- **Reduzir movimento** (do sistema ou do menu):
  - sem deslocamento: troca direta ou esmaecimento;
  - as faixas especiais viram texto parado por ~1 s;
  - sem tremida e sem flash. Nada pisca mais de 3 vezes por segundo, em modo nenhum.

### 4.2 Evento → efeito

| Evento | Efeito |
|---|---|
| `RoundStarted` | a faixa central troca para "Rodada N · Equipar/Ataque" |
| `DeckReshuffled` | o cemitério vai para o monte; aviso "o cemitério virou o monte" |
| `CardsDealt` | cartas saem do monte, alternadas; as do oponente vão como verso |
| `EquipSubmitted` | o oponente passa a "pronto" |
| `CardsPlaced` | as cartas vão para as fileiras (as dos dois juntas, na revelação); a trocada e a descartada vão para o cemitério |
| `OrderChosen` | a faixa central mostra a ordem; linha no histórico |
| `TurnStarted` | "Vez de X"; o relógio do turno recomeça |
| `BuffPlayed` | mão → buffs; o Selvagem ganha a etiqueta do papel |
| `GuardPlayed` | mão → Guarda |
| `TrapUsed` / `Sacrificed` | a carta usada vai até o alvo, o alvo quebra, os dois vão para o cemitério |
| `ReflectPlayed` | **cena:** as três cartas formam um escudo no Coringa |
| `ReflectCanceled` / `ReflectProtected` / `ReflectExpired` | o escudo quebra ou some |
| `ReflectTriggered` | **cena:** o ataque volta para o atacante; dano nele |
| `ReactionWindowOpened` / `Closed` | aviso e relógio da janela aparecem e somem |
| `AttackDeclared` | a fileira de Ataque acende e aponta para o Coringa do outro |
| `AbsoluteAttack` | **cena** |
| `DamageDealt` | ATK contra DEF; o número do dano sobe no Coringa; a vida desce |
| `GuardBroken` | o K racha e vai para o cemitério |
| `BuffRemoved` | o buff vai para o cemitério |
| `CardsRemovedFromRow` | a carta da frente vai para o cemitério |
| `QuadFormed` / `QuadBroken` | as quatro cartas acendem e apagam, com "+V e 1 Ressurreição" |
| `Resurrected` | cemitério → fim da fileira |
| `AbsoluteDefenseStarted` | **cena:** escudo na Defesa |
| `AbsoluteDefenseEnded` | o escudo some; 1 Q vai para o cemitério |
| `PressureChanged` | a pressão na faixa central muda, com destaque |
| `InitiativeChanged` | a marca da iniciativa troca de lado |
| `Exodia` | **cena maior:** a partida acaba |
| `GameOver` | o painel de fim aparece depois das batidas |

---

## 5. A marca `auto` (mudança no protocolo e no servidor) [A + P]

- **Protocolo:**
  - `act` ganha o campo opcional `auto?: true`, aceito no esquema como `z.literal(true).optional()`;
  - `RoomClient.act(action, { auto: true })` o envia;
  - `PROTOCOL_VERSION` continua `1`. O campo é opcional, e a interface e o servidor sobem juntos (mesmo Worker).
- **Servidor:**
  - um `act` aceito com `auto: true` **não zera** a contagem de estouros (spec 2 §7.3), como já acontece com os passos automáticos do próprio servidor (`options.automatic` em `core/game.ts`);
  - todo o resto é igual: `ack`, PASS guardado, época, limite por conexão;
  - a spec 2 §7.3 ganha essa exceção na lista do que **não** zera.
- **Usos:** o passe automático (§3.7) e a confirmação automática da ordem (§3.6). Nenhum outro. O envio antecipado do Equipar não é `auto`.
- **Testes do núcleo:**
  - três estouros com passes `auto` no meio ainda dão W.O. por ausência;
  - um PASS manual continua zerando;
  - `auto` em mensagem fora do esquema dá `BAD_MESSAGE`.
- **Honestidade:** um cliente modificado pode omitir a marca. O W.O. por ausência existe contra o jogador que saiu de perto, não contra trapaça: um script já pode jogar de verdade.

---

## 6. Reconexão e erros [P]

### 6.1 Persistência no navegador

- Chave por sala `coringa:sala:<CÓDIGO>` → `{ token, playerId, nickname, lastSeq }`. Também `coringa:apelido` e `coringa:prefs` (passe automático, reduzir animações).
- Toda leitura e escrita fica num `try/catch`. Sem `localStorage` (aba privada, bloqueio), o jogo funciona, mas recarregar a página perde o assento; a interface avisa uma vez.
- O `lastSeq` é atualizado a cada `state`. Na volta da página, ele vai como `lastSeq` no `RoomClient`, e os eventos perdidos chegam em `catchUp`.
- **O token é segredo:** nunca na URL, no console, em mensagem de erro ou no diagnóstico copiável.
- Como o token fica por navegador, a mesma pessoa não ocupa os dois assentos no mesmo navegador: a segunda aba reconecta como o mesmo jogador e derruba a primeira (4009). Para testar sozinho, use uma janela anônima ou outro navegador; o E2E usa contextos separados.

### 6.2 Estados da conexão

- **Conectando:** antes do primeiro `welcome`.
- **Conectado.**
- **Reconectando:** um aviso no topo ("Reconectando…"); a mesa continua visível, com os controles desligados.
- **Parado:** fechamento final, com a tela de §6.3.

**Voltar ao app** (`visibilitychange` para visível) ou à rede (`online`) com o socket fechado → reconecta na hora, sem esperar a espera crescente. Para isso o `RoomClient` ganha `wake()`, que cancela a espera agendada e abre o socket.

### 6.3 Códigos de fechamento → tela

| Código | Tela |
|---|---|
| 4000 | "Essa sala não existe mais (expirou ou foi encerrada)". Apaga o token. Botão **Criar sala**. |
| 4001 | Versão nova publicada: recarrega a página uma vez (com marca no `sessionStorage` contra laço). Se repetir: "Atualize a página". |
| 4003 | Token recusado: apaga o token e volta ao fluxo de entrada (§2.2), que pode oferecer o assento livre ou dizer que a sala está cheia. |
| 4009 | "Esta sala está aberta em outra aba", com o botão **Usar aqui** (reconecta, o que derruba a outra aba). |
| 1008 / 4029 | "Muitas mensagens; reconectando em 30 s" (o `RoomClient` já espera). |
| 1000 depois de `leave` ou `close()` | volta ao início |

### 6.4 `ack` recusado

| Código | A interface |
|---|---|
| `STALE_EPOCH`, `DISCONNECTED`, `ALREADY_PASSED`, `NOT_PLAYING`, `NOT_YOUR_TURN`, `WRONG_PHASE`, `GAME_OVER`, `ALREADY_SUBMITTED` | nada visível: espera o `state` que explica (como o terminal faz) |
| `RATE_LIMITED` | aviso curto "devagar"; os controles voltam |
| erro de regra do motor | aviso com a mensagem do motor; os controles voltam. Não deveria acontecer, porque a interface só monta jogadas legais. Se acontecer, é bug. |

### 6.5 Fronteira de erro

Uma exceção no React mostra "Algo deu errado", com os botões **Recarregar** e **Copiar diagnóstico**. O diagnóstico leva código da sala, `seq`, época, versão publicada e mensagem, nunca o token.

---

## 7. Acessibilidade [P]

- Meta: WCAG 2.2 AA.
- **Contraste:** texto ≥ 4,5:1; texto grande e ícones ≥ 3:1. Vermelho e preto dos naipes também diferem em luminosidade, e cada naipe tem forma própria.
- **Teclado:** a partida inteira é jogável pelo teclado, com foco sempre visível no estilo da direção visual. Quando chega a vez do jogador, o foco vai para a barra de ação, sem roubar foco de um campo de texto.
- **Leitor de tela:**
  - cada carta tem nome acessível ("7 de copas, sai primeiro"), e cada zona é uma região ou lista com rótulo;
  - o histórico é uma região `aria-live="polite"`, com os textos de `@coringa/sim/text`;
  - "Sua vez" e a abertura da janela de reação (com o tempo) são anúncios `assertive`;
  - o relógio não é anunciado a cada segundo (ver §3.8).
- **Diálogos** (desistir, cemitério, resumo das regras): `<dialog>` nativo, com o foco preso dentro e devolvido ao fechar.
- **Movimento:** `prefers-reduced-motion` e a chave do menu (§4.1).
- **Zoom:** até 200% no PC sem quebrar a mesa.
- `lang="pt-BR"`.
- **Verificação:** axe nos testes de componentes (vitest-axe ou equivalente) e no E2E (`@axe-core/playwright`), sem violações sérias nem críticas.

---

## 8. Mudanças em outros pacotes [P]

### 8.1 Visão geral

| Pacote | Mudança |
|---|---|
| `@coringa/engine` | exporta `previewAttack` e `autoDestinations` (§8.2) |
| `@coringa/protocol` | `act.auto?` no tipo e no esquema; `RoomClient.act(action, { auto })`; `RoomClient.wake()` |
| `@coringa/server` | o `auto` não zera estouros; assets no `wrangler.jsonc`; smoke e deploy constroem a web antes (§11) |
| `@coringa/sim` | `exports` `./bots` e `./text`; ESLint barra `node:*` nesses arquivos |
| raiz | ESLint para `.tsx`; `check-fast.ts` aceita `.tsx`; scripts `dev:web` e `e2e`; job de E2E na CI |

### 8.2 Motor

**`previewAttack(view, attacker: 'self' | 'opponent')`**

- É função pura sobre a `PlayerView`. Usa só informação pública: fileiras, buffs, Guarda, Reflect, Defesa Absoluta e pressão.
- Devolve:
  - `atk` e `def`;
  - `net = max(0, atk − def)`;
  - o desfecho: `DAMAGE`, `GUARD_ABSORBS`, `ABSOLUTE_DEFENSE`, `REFLECTED` ou `NO_ATTACK` (Ataque vazio);
  - o dano no defensor, o dano refletido no atacante e as cartas que quebram (K pela absorção ou pelo Ataque Absoluto; Q e K do atacante no Reflect);
  - a marca de Ataque Absoluto.
- A resolução de verdade (`resolveAttack`) passa a usar a mesma conta, para não haver duas versões da regra.
- **Teste de propriedade** (partidas com bots): antes de cada `DECLARE_ATTACK`, guarda a prévia. Se a janela de reação fechar sem mudança no campo (só `PASS`), os eventos `DamageDealt`, `ReflectTriggered` e `GuardBroken` da resolução batem com a prévia. Os exemplos da spec 1 §1.13 viram casos literais.
- Como a prévia é uma função sobre a `view`, a interface também a usa em cenários hipotéticos. Exemplo: a `view` sem o K que a Armadilha vai quebrar, para mostrar "quebrando o K: 110 de dano".

**`autoDestinations`**

- A função que já existe em `actions/equip.ts` passa a ser exportada. Assinatura: as contagens das fileiras, o limite e quantas numéricas faltam (não o `PlayerState` inteiro).
- O estouro do Equipar no motor e o envio antecipado da interface usam essa mesma função.

---

## 9. Testes [A + P]

### 9.1 Camadas

| Camada | Onde roda | Cobertura | No `pnpm check` |
|---|---|---|---|
| `src/model` da web: sessão, derivações, Equipar, relógio, linha do tempo, persistência, `LocalRoom` | Vitest no Node | v8, ≥ 90% de linhas e branches | sim |
| Componentes e telas | Vitest + Testing Library + jsdom; `RoomConnection` falso e roteirizado, com estados reais tirados do motor com semente fixa; axe | sem meta mínima | sim |
| Motor (`previewAttack`, `autoDestinations`) | Vitest no Node, com propriedades | a meta atual do motor (≥ 90%) | sim |
| Protocolo e núcleo do servidor (`auto`, `wake`) | Vitest no Node | as metas atuais | sim |
| Smoke da web | `vite build`; o bundle não contém Zod e respeita o orçamento de tamanho (§12) | — | sim |
| E2E | Playwright (Chromium), job próprio da CI | — | **não** [A] |

### 9.2 Casos obrigatórios

**Model:**

- **Jogadas montadas pela interface:**
  - cada tipo de jogada sai do toque certo (K simples e múltiplo, J/Q buff, Sacrifício, Armadilha, Selvagem em cada papel, Reflect, anular, proteger, Ressuscitar, atacar, encerrar);
  - toda jogada montada é aceita pelo motor, incluindo carta não canônica da mesma espécie.
- **Equipar:**
  - os destinos oferecidos são só os que levam a montagem legal;
  - Desfazer e Recomeçar funcionam;
  - o envio antecipado sai em −1,5 s (pelo relógio do servidor, com deslocamento), completa o resto igual a `autoDestinations` e não acontece com zero escolhas nem depois de confirmar.
- **Iniciativa:** confirma com `auto` aos 3 s e não confirma depois de interação.
- **Passe automático:** só quando `PASS` é a única jogada legal e a chave está ligada; sai com `auto`; não se repete na mesma janela.
- **Relógio:** deslocamento do servidor, `pausedTurnMs`, "tempo esgotado" até o `state`.
- **Linha do tempo:**
  - batidas em ordem para cada evento de §4.2;
  - `catchUp` comprimido, `resync` sem batidas, modo de movimento reduzido;
  - o pulo termina tudo;
  - os controles nunca ficam ligados sobre uma `view` que não é a última.
- **Sessão:**
  - tratamento de cada código de `ack` (§6.4) e de cada código de fechamento (§6.3);
  - `wake()` na volta do app.
- **Persistência:**
  - token e `lastSeq` por sala;
  - sem `localStorage`;
  - o token nunca aparece no diagnóstico.
- **`LocalRoom`:**
  - uma partida inteira contra o bot termina;
  - mesma semente → mesma partida.

**Componentes:**

- início: criar e entrar, com todos os erros de §2.2 (HTTP falso);
- lobby: pronto, presença, copiar link, aviso de W.O.;
- mesa:
  - desenha todas as zonas de §3.1 a partir de uma `view`;
  - tocar carta mostra as jogadas certas;
  - alvo → `act` com a jogada certa;
- janela de reação com relógio e passe automático;
- painel de fim para cada resultado e cada causa;
- aviso de reconexão e contagem de W.O. do oponente;
- axe sem violação séria nas telas principais.

**E2E** (job `e2e` da CI e `pnpm e2e` local):

1. Dois contextos do navegador contra `wrangler dev` servindo a web construída:
   - criar a sala, entrar pelo link, os dois prontos;
   - Equipar, escolha da ordem, ataque com reação (passe automático), uma Armadilha se o sorteio permitir;
   - derrubar a conexão de um lado e voltar;
   - desistir → painel de fim → revanche pedida pelos dois → partida nova.
2. A mesma entrada em viewports de celular, 390 × 844 e 360 × 740, conferindo que a página não rola de lado.
3. Treino com semente fixa: algumas rodadas determinísticas pela interface, sem servidor.
4. axe nas telas visitadas.

O sorteio da partida online não é controlável (a semente nunca sai do servidor). Por isso o E2E online reage ao que aparece na tela, em vez de seguir um roteiro fixo de cartas.

### 9.3 Ferramentas e portão

- **ESLint:**
  - passa a cobrir `**/*.tsx`;
  - nos imports relativos, a regra da extensão aceita `.ts` e `.tsx` (e `.css` na web);
  - entra o `eslint-plugin-react-hooks`;
  - `no-restricted-imports` barra `@coringa/protocol/schemas` e `node:*` em `packages/web/src`.
- **`scripts/check-fast.ts`:** `isSource` passa a aceitar `.tsx`, para o pre-commit rodar os testes relacionados dos componentes.
- **`pnpm check`** ganha lint, typecheck, `test:coverage` e smoke da web. Quem implementa mede o tempo do check antes e depois e registra nesta spec.
- **CI:** `.github/workflows/check.yml` ganha o job `e2e`, em paralelo ao `check`:
  - instala as dependências e o Chromium (`pnpm exec playwright install --with-deps chromium`);
  - constrói a web, sobe o `wrangler dev` e roda o Playwright. O `wrangler dev` local não precisa de login; desligue a telemetria (`WRANGLER_SEND_METRICS=false`) para não haver pergunta interativa;
  - qualquer erro no console do navegador, inclusive violação de CSP, falha o teste;
  - o merge exige os dois jobs verdes.

---

## 10. Direção visual [A, em aberto]

### 10.1 Rascunhos

Três direções, cada uma desenhada no celular e no PC, sobre o **mesmo momento de jogo**: rodada 7, sua vez, a Armadilha selecionada, os alvos de Duda marcados e a prévia "152 × 42, o K absorve, dano 0". Estão no artifact "Jogo do Coringa — rascunhos da mesa": https://claude.ai/artifact/ERTQYecLGcKhTtLArAbBSg.

- **A · A Peleja do Coringa — xilogravura de cordel.**
  - **A ideia:** o duelo 1v1 como a peleja de dois cantadores de cordel.
  - **Materiais:** papel de capa de folheto, uma cor por jogador (verde para o oponente, rosa para você), tinta preta de xilogravura e um vermelho de segunda cor. Os números em tipo de madeira, com borda irregular de carimbo.
  - **Composição:** a faixa central preta concentra o que é dos dois (rodada, relógio, pressão, monte, cemitério).
  - **Detalhes:** a vida perdida aparece hachurada, e as cartas que vão para o cemitério perdem a cor.
  - **Cenas especiais:** inversão do quadro inteiro, como um negativo da gravura.
- **B · Fliperama — placar de jogo de luta.**
  - **A ideia:** o duelo como um jogo de luta de fliperama dos anos 90. Duas barras de vida amarelas se encontram no relógio do centro, e os K da Guarda viram as "bolinhas" de especial.
  - **Cores e botões:** palco azul com linhas de tela de tubo, cor de P1 e P2 (ciano e magenta), "SUA VEZ!" com contorno, e o botão de atacar redondo, como o do painel do fliperama.
  - **Risco:** é o visual mais familiar dos três.
- **C · Painel de embarque — cartão e quadro de voos.**
  - **A ideia:** cada jogador é um cartão de embarque picotado (vida, Guarda, buffs, mão), e as fileiras são linhas de um quadro de letras que viram.
  - **A cor única:** um âmbar reservado para o que mudou desde a sua última jogada e para os alvos. Fica aceso até você ver.
  - **No PC:** o histórico vira o quadro de avisos, com rodada e status ("novo" ou "visto").
  - **Força:** é o mais legível.
  - **Risco:** é o menos "jogo de cartas".

A saída clássica continua disponível se o autor preferir: feltro verde com cartas realistas.

### 10.2 Regras que valem para qualquer direção [P]

- **Fontes:** servidas pelo próprio Worker (sem Google Fonts em tempo de execução), com subconjunto latino.
- **Tokens:** cores, tipos e espaços em tokens do Tailwind 4 (`@theme`), com uma única fonte de verdade.
- **Os dois jogadores** se distinguem por posição e rótulo, não só por cor.
- **Naipes e o Coringa:** SVG próprio, nunca emoji nem glifo como ícone. O ♥ ♦ ♠ ♣ no texto corrido do histórico é notação, não ícone.
- **Navegador:** seleção de texto, foco, barra de rolagem e números tabulares tematizados pela direção escolhida.

### 10.3 Escolha do autor

*Pendente.* Depois da escolha, esta seção recebe a direção, a paleta e as fontes finais, e os tokens viram parte do plano.

---

## 11. Deploy [D + P]

O mesmo Worker serve a interface. No `packages/server/wrangler.jsonc`:

```jsonc
"assets": {
  "directory": "../web/dist",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/api/*"]
}
```

- **Roteamento:**
  - `/api/*` sempre passa pelo Worker (rotas e WebSocket da spec 2);
  - o resto é arquivo estático;
  - um caminho sem arquivo (`/s/7KQ2MD`, `/treino`) devolve o `index.html` com 200.
- Sem `binding` de assets: o Worker não lê arquivos estáticos.
- **Origem:** em produção, a página e o WebSocket são da mesma origem. O `isOriginAllowed` já aceita a própria origem, então `ALLOWED_ORIGINS` não muda.
- **Cache:** os arquivos com hash do Vite (`/assets/*`) podem ter cache longo; o `index.html` não. O static assets já trata `ETag`.
- **Cabeçalhos:** arquivo `_headers`, que fica em `packages/web/public/` e o Vite copia para o `dist`:
  - `Content-Security-Policy` restrita à própria origem: scripts, estilos, fontes e o `connect-src` do WebSocket da mesma origem. Os estilos que o React e o Motion aplicam por JavaScript não são barrados pela CSP; o E2E confirma que não há violação;
  - `Referrer-Policy: same-origin`;
  - `X-Content-Type-Options: nosniff`.
- **Local:**
  - `pnpm dev:web` sobe o Vite (porta 5173), com proxy de `/api` para o `wrangler dev` (8787), WebSocket incluído (`ws: true`). A origem `http://localhost:5173` já é aceita por `http://localhost:*`;
  - `pnpm dev:server` continua igual;
  - quem constrói pode trocar o proxy pelo plugin da Cloudflare para o Vite, se ficar mais simples.
- **Ordem do build:**
  - o `wrangler deploy --dry-run` do smoke do servidor precisa de `packages/web/dist`, e o `pnpm -r` não põe a web antes do servidor (o servidor não depende dela). Por isso o smoke do servidor constrói a web antes;
  - `pnpm deploy:server` passa a ser `pnpm check` → build da web → `wrangler deploy`. O nome fica, e continua sendo o autor quem roda.
- A versão publicada (hash do commit) já sai em `/api/health`; a interface a mostra no menu.

---

## 12. Desempenho [P]

- **JavaScript inicial ≤ 200 KB** comprimido, com React, Motion (carregado com `LazyMotion` e `domAnimation`), o motor e a interface. O treino carrega o bot sob demanda (`import()` dinâmico).
- A tela de início abre em menos de 2 s num 4G médio.
- **Animações:** só com `transform` e `opacity` no que se repete, e 60 fps num celular intermediário. As cenas especiais podem usar `filter` e `clip-path`, dentro do orçamento de §4.1.

---

## 13. Riscos

- **Celular em segundo plano:** o iPhone derruba o WebSocket em segundo plano. Responder uma mensagem por mais de 60 s no meio da partida dá W.O. [A]. A mitigação é o aviso no lobby e a reconexão na volta.
- **Tempo do passe automático:** ver §3.7.
- **Relógio:** o deslocamento estimado tem erro de meia ida e volta da rede. O envio do Equipar em −1,5 s, mais a margem de 500 ms do servidor, cobre isso com folga.
- **Mesa densa em 360 px:** sete cartas por fileira, quatro fileiras, buffs e Guarda. Os rascunhos mostram que cabe. O teste de layout em 360 px entra no E2E de celular.
- **Tempo do `pnpm check`:** cresce com a web. O pre-commit já é o rápido, e o E2E fica fora.
- **Direção visual ainda em aberto:** os tokens e os componentes de carta dependem dela. O plano só começa depois da escolha.

## 14. Critérios de pronto (sub-projeto 3 e MVP)

1. `pnpm check` e o job `e2e` verdes, na máquina e na CI.
2. O autor jogou uma partida completa com um amigo, pelo link, no endereço publicado:
   - um dos dois no celular em pé e o outro no PC;
   - com uma queda e volta no meio;
   - com uma revanche.
3. O treino contra o bot funciona no celular e no PC.
4. A partida inteira é jogável só pelo teclado, e o axe passa sem violação séria.
5. O tempo do `pnpm check` foi medido e registrado (§9.3).

## 15. Fica para quem constrói

- Biblioteca de rotas (ou nenhuma) e de estado (ou `useSyncExternalStore` puro).
- Organização dos componentes e do CSS, curvas exatas das animações e como as transições de layout são agendadas por batida.
- jsdom ou happy-dom nos testes de componentes.
- Proxy do Vite ou plugin da Cloudflare no ambiente local.
- Extrair `bots` e `text` do simulador para um pacote próprio, em vez dos subpaths (§1.4).
- Detalhes da API de `previewAttack` além do que §8.2 pede.
