# Jogo do Coringa — Interface web (Sub-projeto 3)

- **Data:** 2026-10-17
- **Status:** **aprovada** pelo autor em 2026-10-17. A aprovação veio pela sessão principal, com permissão dele, e inclui a direção visual A e os acréscimos de §10.
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
- **[P]** proposta desta spec; aprovada junto com ela.
- **[OBRIGATÓRIO]** acréscimo exigido na aprovação (§10.4, §10.6, §10.7).

### 0.3 Já decidido [D]

- React + Vite + Tailwind + Motion. Textos em pt-BR. Jogável no celular.
- Salas por link `<origem>/s/<CÓDIGO>`, com apelido e sem conta. O token de reconexão fica no navegador, por sala (spec 2 §2.2).
- A interface só envia intenções; o servidor é a autoridade.
- O mesmo Worker serve a interface (static assets), na mesma origem e sem CORS (spec 2 §3 e §10.3). Cloudflare Pages fica descartado: seria outra origem, com CORS e mudança em `ALLOWED_ORIGINS`.
- **Escolha da iniciativa:** "atacar primeiro" vem pré-selecionado, sem travar a rodada, e a regra está mantida (decisão de 2026-10-19, por delegação do autor), desligável pela chave `initiativeChoice` (spec 1 §3).
- **Passe automático:** a decisão é deste sub-projeto e precisa respeitar o piso de 2 s da janela de reação (spec 2 §6.3 e §14).

### 0.4 Decidido pelo autor [A]

1. **Direção visual:** entre três rascunhos, o autor escolheu "A Peleja do Coringa" (xilogravura de cordel), com as fileiras de Ataque frente a frente no centro e o "fica aceso até você ver" trazido de outra direção (§10).
2. **Aparelho principal:** celular em pé (retrato), com o PC adaptado a partir dele. No celular deitado a mesa funciona, mas sem layout próprio.
3. **Jogar uma carta:** toca na carta, aparecem as jogadas possíveis, toca no alvo. O mesmo gesto vale no celular e no PC, e tudo funciona pelo teclado. Arrastar a carta até a zona entrou depois, no polimento, como um caminho a mais: o toque e o teclado seguem como estão (§3.4, e a spec do polimento, §6).
4. **Jogadas automáticas levam a marca `auto`.** O servidor não zera a contagem de estouros por elas (§5). Com essa marca:
   - a) a janela de reação **passa sozinha** quando não há resposta possível. A chave vem ligada e pode ser desligada (para blefar);
   - b) a Escolha da iniciativa **confirma "atacar primeiro" sozinha** depois de ~3 s sem interação.
5. **Equipar:**
   - todas as numéricas à vista, em qualquer ordem (E2 do sub-projeto 5), com prévia de ATK/DEF, Desfazer e Confirmar;
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
- Vibração e notificação do sistema: polimento (sub-projeto 4). Arrastar cartas também era do polimento e entrou lá, como um caminho a mais além do toque (§3.4).
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
- Hoje ninguém importa `@coringa/sim` pelo nome: o motor e o servidor usam caminhos relativos nos testes (`../../sim/src/...`), que o mapa de `exports` não afeta. O mapa só precisa de uma entrada `.` se alguém passar a importar a raiz do pacote.
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
| `/` | Início: **Aprender jogando** (em destaque, no alto, até o tutorial ser concluído ou pulado; depois, um botão comum entre os do treino), **Criar sala**, **Entrar com código ou link**, **Treinar contra o bot**, **Partidas anteriores**. O apelido fica lembrado. |
| `/s/:code` | Sala: entrada, lobby, mesa ou fim, conforme o status da sala |
| `/treino` | Partida local contra o bot (§2.6) |
| `/tutorial` | Partida local contra o bot Fácil, numa semente fixa, com dicas por situação (§2.7) |
| `/partidas` | Lista local das partidas terminadas neste navegador (§6.1), do treino e online, com **Rever** nas que têm replay |
| `/partidas/:id` | Replay de uma partida da lista: a mesa só de vista, do assento de quem a guardou, com os controles (início, passo anterior, próximo passo, tocar/pausar e o seletor de rodada). Id que não está mais no navegador ou partida sem replay mostram o motivo e o caminho de volta à lista |
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

**Criar sala:** `POST /api/rooms` → guarda o token → vai para `/s/<CÓDIGO>`. O formulário tem a **Vida inicial** (sub-projeto 5): 300, 500 (padrão, já marcada) ou 800, como botões de rádio grandes; a escolhida vai no corpo (`hp`).

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
- **Resumo das regras**: uma página estática, curta, sobre o que cada carta faz. O texto sai da spec 1 §1.6–§1.8, revisado pela sessão principal em 2026-10-21, por delegação do autor [P];
- **Desistir**, com confirmação ("Você perde esta partida por W.O.") → `concede`.

### 2.5 Fim de partida e revanche [P]

- Um painel sobre a mesa final, que continua visível e só para ver.
- O painel mostra:
  - o resultado: "Você venceu", "Duda venceu", "Empate" ou "Partida sem resultado". Desde o sub-projeto 5 (U5) ele é grande, em
    estilo HQ: "VOCÊ VENCEU!" em Alfa Slab One sobre um "estouro" desenhado no código (estrela de pontas irregulares, ouro com
    contorno de tinta), com um "pop" de mola na entrada (parado com movimento reduzido). A exclamação é só desenho: o nome do
    diálogo segue "Você venceu";
  - a duração da partida ("Duração 12:34"), do `outcome.durationMs` que o servidor e o treino mandam (sem ele, a linha não aparece);
  - o motivo:
    - pelo motor: vida zerada ou Exódia (o anti-travamento saiu na E1 do sub-projeto 5; as partidas guardadas com ele ainda aparecem na lista, com "Empate" quando for o caso);
    - pelo `outcome.cause` do servidor: caiu e não voltou em 60 s, três tempos estourados, desistência ou os dois saíram;
  - o placar da sala.
- Botões:
  - **Revanche**, que alterna. O painel mostra "esperando Duda" ou "Duda quer revanche".
  - **Ver a mesa**, que recolhe o painel.
  - **Rever a partida**, que abre o replay dela (`/partidas/<id>`). Só existe quando a partida ficou guardada com replay: o treino, e a partida online depois que o servidor manda o `replay` (logo depois do `room` em `FINISHED`; o botão aparece quando ele chega).
  - **Nova sala**, que fecha a conexão e volta ao início.
- Com os dois pedindo e conectados, o servidor começa outra partida (`gameNo` novo). A mesa recomeça com a animação da distribuição.

### 2.6 Treino contra o bot (`LocalRoom`) [A + P]

- `LocalRoom` implementa `RoomConnection` com o motor (`createGame`, `applyAction`, `viewFor`, `viewEvents`, `legalActions`) e o bot do nível escolhido, de `@coringa/sim/bots` (abaixo).
- A semente vem de `crypto.getRandomValues`. Com `?semente=<texto>` na URL, a partida se repete, o que serve aos testes (com o mesmo `?nivel=`).
- **Níveis do bot** (`LocalRoomOptions.level`, padrão `medio`; a revanche o mantém; spec do polimento, §3): Fácil (`easy`, joga uma ação legal ao acaso em boa parte das decisões), Médio (`greedy`, o bot do simulador) e Difícil (`greedy` com busca por rollouts, `hardSearch`). O Difícil roda **em fatias**: depois do "pensar", a busca avança até ~8 ms por tarefa (medidos pelo `now` injetado), cada fatia em seu próprio `setTimer(…, 0)`, e o bot só joga quando ela termina, para as batidas e os timers não esperarem a decisão. Um `state` novo (a jogada do jogador no Equipar), a desistência, a revanche ou fechar a sala soltam a busca em curso, e a jogada velha nunca é aplicada. O sorteio da busca é por decisão do bot: vem da semente da partida e de quantas jogadas ele já aplicou nela (`<semente>/bot/<n>`, zerado a cada partida), e não do momento em que o jogador joga, do `seq` da sala nem do estado. No Equipar simultâneo o bot decide antes, no meio ou depois de o jogador confirmar, e a decisão é a mesma; uma busca descartada recomeça com o mesmo `n`. A partida 2 de uma revanche joga o mesmo que uma sala nova aberta com `?semente=<semente>-2&nivel=<nível>`. Na ordem do ataque e na reação não há busca: a decisão sai na primeira fatia.
- **Escolha do nível:** `/treino` sem `?nivel=<facil|medio|dificil>` mostra, antes da mesa, três botões grandes (nome e uma linha que diz o que o bot faz: "Erra bastante: bom para aprender", "Pensa só na jogada da vez", "Pensa nas próximas rodadas"). O último nível escolhido fica em `coringa:nivel` e vem focado (sem ele, o Médio). Com `?nivel=` válido a tela vai direto à mesa, sem gravar nada. O módulo da sala local (com o bot e a busca) continua num chunk carregado por `import()`.
- **Sem relógio:** `deadline` é sempre `null`, e a faixa central diz "Treino · Médio, sem relógio" (com o nível); o menu da partida mostra "Treino · Médio". O passe automático e o envio antecipado do Equipar não se aplicam.
- O bot "pensa" ~600 ms antes de cada jogada, para dar para acompanhar. Na janela de reação, ele responde na hora.
- Emite um `room` sintético: assentos "Você" e "Bot", status `PLAYING` e `FINISHED`, placar local. A revanche começa outra partida com outra semente.
- Usa as mesmas telas da mesa e do fim. Não tem lobby.
- Também é a base dos testes de componentes e de um E2E determinístico (§9).

### 2.7 Tutorial (`/tutorial`) [A + P]

- É o treino (§2.6) contra o bot **Fácil**, sempre na semente do tutorial (`TUTORIAL_SEED`, de `@coringa/sim/tutorial`): a URL, com
  `?semente=` ou `?nivel=`, é ignorada. As mesmas telas da mesa e do fim, sem relógio; a faixa central e o menu dizem "Tutorial"
  (a faixa, "Tutorial, sem relógio"). A tela entra por `React.lazy` e só ela importa o painel, os textos e a semente (o JS inicial
  não cresce com eles; o smoke confere).
- **Dicas por situação** (spec do polimento, §5): um painel "Dica" com **Entendi** e **Pular o tutorial**, não modal e sem prender o
  foco. A zona de que a dica fala ganha um contorno parado (`data-dica`). Não é um roteiro: a dica certa aparece quando a situação
  acontece, uma vez cada.
- **Onde mora o painel:** no PC, no alto da coluna do histórico, abaixo do cabeçalho; no celular e no tablet, como o primeiro filho
  dos campos (o contêiner que rola, §3.2), então nunca cobre a mão nem a barra de ação. Sem `fixed`, `absolute` nem `z-index`.
- **A dica do fim** vai dentro do painel de fim (§2.5), e não no painel da dica: o painel de fim é um `<dialog>` modal. O texto e o
  link "Jogar com um amigo" (para `/`) entram na descrição do diálogo (`aria-describedby`), e o leitor de tela os lê ao abrir.
- **`coringa:tutorial`** (§6.1): `done` quando a dica do fim aparece, `skipped` no "Pular o tutorial". Sem o valor, o tutorial ainda
  não foi feito, e a tela inicial o põe em destaque. Recarregar a tela recomeça as dicas (só o valor fica guardado).

---

## 3. A mesa

### 3.1 O que aparece (para cada jogador) [P]

- **Coringa:** avatar, apelido, vida (número e barra), presença do oponente.
- **Guarda:** os K, com a contagem.
- **Buffs de Ataque** (J, até 4) e **Buffs de Defesa** (Q, até 4). O Selvagem aparece com o papel que assumiu.
- **Fileira de Ataque** e **Fileira de Defesa**:
  - até 8 cartas (eram 7 até o sub-projeto 5), com as vagas vazias desenhadas até o limite;
  - a carta da frente traz a marca "sai primeiro" (as fileiras são filas, spec 1 §1.2);
  - cada fileira mostra o total e a conta: "152 · 38 × 4", "42 · 14 × 3". O total vem de `attackPower` e `defensePower`. A conta é
    sempre do mesmo quadro do total mostrado: enquanto o total espera e conta na batida do dano, a base e o multiplicador ficam os de
    antes, e só trocam com a mesa parada (sub-projeto 5, B1: dividir o total velho pela base nova inventava um J ou um Q que não
    estava na mesa, porque o golpe já tirou a carta da frente);
  - a quadra aparece destacada nas quatro cartas, com "+V" no total.
- **Marcas de estado no Coringa:** Reflect ativo, Defesa Absoluta, Ressurreições disponíveis (com contagem), Ataque Absoluto armado (4 J).
- **Mão:**
  - a própria, com o papel escrito em cada carta (Guarda, Buff de ataque, Buff de defesa, Armadilha, Selvagem);
  - a do oponente, só a quantidade de versos.
- **Faixa central:**
  - rodada e tipo (Equipar ou Ataque);
  - de quem é a vez e o relógio;
  - ~~as rodadas sem dano, "Sem dano N de 3", e o aviso do anti-travamento~~: saíram com a regra na E1 do sub-projeto 5 (a Pressão da mesa, que também ficava aqui, já tinha saído). No celular, a iniciativa forma sozinha a segunda linha da faixa;
  - iniciativa, com a ordem escolhida na rodada;
  - monte (quantidade);
  - cemitério: a carta de cima e a quantidade. Um toque abre a lista inteira, que é pública.
- **No Equipar:** o oponente aparece como "montando 3 cartas…" (`pendingCount`, que é público) ou "pronto".
- **Histórico:** os textos de `@coringa/sim/text`. No PC fica numa coluna lateral; no celular, numa gaveta com a contagem do que é novo (abrir a gaveta conta como ver: a contagem zera, e as marcas "novo" das linhas seguem a §10.5).

### 3.2 Celular em pé (360–430 px) [A + P]

- **Ordem, de cima para baixo:**
  1. o oponente: cabeçalho (Coringa, vida, mão, menu), Guarda e buffs, Defesa e Ataque;
  2. a faixa central;
  3. você: Ataque e Defesa, Guarda e buffs, vida;
  4. a mão;
  5. a barra de ação.
- As duas fileiras de Ataque ficam junto da faixa central, frente a frente. Esse é o arranjo dos rascunhos e pode mudar na reação do autor.
- **Na sua vez de atacar** (celular e tablet), depois de as batidas pararem, se a sua fileira de Ataque ou a Defesa do oponente (o alvo) não está inteira na janela dos campos, os campos rolam até a sua fileira ficar no pé dela, com a fileira de Ataque do oponente, a faixa e a Defesa dele acima. Uma vez por vez; com tudo à vista, nada rola; se o próprio jogador rolou os campos nesta vez (roda, toque arrastado, teclas de rolagem), nada rola. A rolagem é instantânea (nunca suave, e assim também com movimento reduzido) e não mexe no foco, que segue no painel de baixo. Regra aceita pela sessão principal, por delegação do autor, em 2026-10-22. Num celular baixo (360 × 640) a mesa pede ~660 px e a janela dos campos tem ~320: sem isso, a sua fileira ficava abaixo da mão (a 390 × 844 e a 412 × 915 já cabe, e nada rola). No PC nada rola (§3.3). Um E2E confere a 360 × 640.
- **No tutorial** (§2.7), o painel da dica é o primeiro filho dos campos, acima do campo do oponente: ele rola com os campos, e a mão e
  a barra de ação continuam fora do contêiner, sempre à vista. Uma dica nova que chega com os campos rolados traz o painel de volta à
  vista; a rolagem da vez de atacar espera o painel fechar. A 360 × 640 a dica mais alta (a do Equipar) ocupa ~230 px dos ~338 da janela dos campos.
- **Oito cartas cabem em 360 px.** O tamanho das cartas acompanha a largura: ~29 × 40 px a 360, ~33 × 46 a 390 (eram 34 × 48 com as fileiras de 7). O valor e o naipe da carta de campo seguem a largura real dela (`cqw`): quando a grade a encolhe, eles encolhem junto. Nada rola de lado.
- **Alvo de toque ≥ 44 px:**
  - cartas da mesa menores que isso ganham área de toque invisível, sem sobrepor a vizinha;
  - na escolha de alvo, a barra de ação também lista os alvos válidos como botões grandes ("K♣ da Guarda de Duda", "J♠ dos Buffs de Ataque…"). Isso serve ao toque, ao teclado e ao leitor de tela.
- `100dvh`, as margens seguras (`env(safe-area-inset-*)`) e `overscroll-behavior: none` na mesa, para o puxar-para-atualizar não recarregar a página no meio da partida.
- Campos de texto com fonte ≥ 16 px, para o iPhone não dar zoom.

### 3.3 PC e tablet [P]

- **≥ 1024 px:** a mesa fica no centro, com cartas maiores. Uma coluna lateral leva o histórico, a sala, o placar e o menu. A barra de ação mostra a prévia completa (§4.6).
- **PC de pouca altura** (janela < 900 px; o notebook de 1366 × 768 dá 657 px). A mesa do PC pede ~850 px nos estados comuns, então:
  - abaixo de 900 px ela fica compacta (as cartas do tablet e menos respiro) e cabe inteira em 1366 × 657;
  - quando ainda não cabe, só os campos e a faixa rolam por dentro, como no celular. A mão, a barra de ação e a coluna do histórico (com o menu) ficam sempre à vista, e a chegada da sua vez (o foco no painel de baixo) não rola nada;
  - um E2E confere, a 1366 × 657, 1440 × 800 e 1536 × 730, a vida e o nome do oponente, o menu, a mão e o botão principal à vista por inteiro no Equipar, no Ataque e na reação.
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

**Carta sem jogada agora (sub-projeto 5, B2):** a carta diz por quê. O motivo vem do motor (`noPlayReason`, ao lado de
`legalActions`, preso a ele por um teste de propriedade); a interface só traduz o código:

- na sua vez (fase principal ou janela de reação), tocar a carta mostra na barra "J♥: seus Buffs de ataque já têm 4 J, o limite",
  "A♣: Duda não tem J, Q nem K para a Armadilha (as cartas do Reflect não contam)", "K♥: na janela de reação só o A (ou o Selvagem
  como A) responde", "Duda está sob Defesa Absoluta…" ou, contra um Reflect recém-lançado, "só Anular ou Proteger-se";
- fora da sua vez (Equipar, escolha da ordem, vez do oponente), a carta da mão é um botão que só explica, sem escolha (sem
  `aria-pressed`): um balão sobre a mão diz o motivo ("no Equipar as especiais esperam na mão; elas se jogam nas rodadas de
  Ataque, no seu turno", "espere a sua vez") e some sozinho depois do tempo de leitura (`readingMs`) ou com outro toque na carta.
  O balão não empurra a mão nem pega o toque de nada embaixo dele. Depois do passe e no fim da partida, a mão é só de vista.

**Jogadas de várias cartas** aparecem como botões próprios quando são possíveis:

- **Lançar Reflect** (K + J + Q da mão).
- **Anular o Reflect** (K + J + Q da mão, na janela de reação).
- **Proteger-se do Reflect** (sacrificando J + Q + K do próprio campo).
- Em todas elas, a interface prefere cartas reais ao Selvagem e diz quais cartas vão sair ("sai J♥ + Q♣ + K♥ do seu campo").

**Ressuscitar:** abre o cemitério filtrado nas numéricas → escolhe a carta → escolhe a fileira (só as que têm vaga). O botão tem arte própria (sub-projeto 5, U2): uma carta numérica subindo de uma lápide, com três raios, desenhada no código; a
segunda linha diz de onde vem e o que há ("1 Ressurreição da quadra · 3 numéricas no cemitério"). O diálogo do cemitério, no modo de
ressuscitar, tem o mesmo desenho no título.

**Atacar ou encerrar o turno:**

- o botão principal está sempre visível na fase principal: **Atacar**, com a prévia, ou **Encerrar turno**, quando o Ataque está vazio;
- a prévia diz quando o golpe derruba ("27 × 3 · dano 24 · derruba Duda"): o dano que o motor calculou (depois da Guarda, da Defesa Absoluta e do Reflect, nunca ATK − DEF) alcança a vida de quem o leva, e o empate derruba; contra o Reflect de Duda o sufixo é "derruba você" quando o que volta zera a sua vida. A Ameaça de Duda e o aviso da janela de reação dizem o mesmo ("derruba você"). Um teste prende essa regra ao fim de partida do motor (spec do polimento, §8.1);
- não há confirmação, mas o botão fica longe da mão, para evitar toque sem querer.

**Cancelar:** botão **Cancelar** ou a tecla Esc.

**Arrastar (um caminho a mais, polimento fatia 5):** com o mouse ou o dedo, a carta da mão vai até a zona da jogada (J para os seus
Buffs de ataque, Q para os de defesa, K para a Guarda, A e Selvagem até a carta do oponente que é alvo, e J, Q e Selvagem até o J ou
o Q do oponente no Sacrifício; detalhes na spec do polimento, §6) e a jogada sai ao soltar.
Onde há mais de uma jogada, a soltura escolhe a carta e a barra lista as jogadas, como o toque. Reflect, Ressuscitar, Atacar e
Encerrar turno ficam só nos botões. O toque (tocar a carta, depois a jogada ou o alvo) e o teclado seguem exatamente como acima:
arrastar nunca é o único caminho (WCAG 2.5.7). As regras do gesto estão na spec do polimento, §6.

**Escolher o alvo:**

- os alvos válidos ganham destaque na mesa e aparecem em lista na barra;
- ao apontar um alvo, a prévia mostra o efeito ("quebrando o K: 110 de dano").

**Teclado:**

- Tab segue a ordem mão → alvos → barra de ação;
- Enter e Espaço escolhem, Esc cancela;
- sem atalhos de uma tecla no MVP, para evitar jogada sem querer.

### 3.5 Equipar [A + P; livre desde a E2 do sub-projeto 5]

- Todas as numéricas pendentes (`self.pending`) aparecem juntas, e o cabeçalho diz quantas faltam ("Faltam 3 cartas", "Falta 1
  carta"). O jogador toca numa carta (a escolhida sobe, como na mão; sem toque, é a primeira que falta, na ordem de compra) e
  depois no destino, em qualquer ordem: a ordem das escolhas é a ordem em que as cartas entram (`order` da ação `EQUIP`). O toque
  na carta leva o foco ao primeiro destino. Os destinos valem para a carta escolhida:
  - **Ataque** e **Defesa** (só as fileiras com vaga);
  - com as duas cheias: **Trocar a última do Ataque (sai 9♠)**, **Trocar a última da Defesa (sai 5♥)** e **Descartar**.
- Só aparecem destinos que levam a uma montagem legal: o mesmo filtro do `askEquip` do terminal, sobre os `EQUIP` de `legalActions`.
- A escolha aparece na fileira como rascunho (carta translúcida), e os totais e a quadra se atualizam. Exemplo: "forma quadra de 7: +7 e 1 Ressurreição".
- **Desfazer** volta um passo; **Recomeçar** volta ao início.
- Qualquer numérica que falta também se **arrasta** até a fileira (ou até a última carta de uma fileira cheia, ou o cemitério, que são os destinos que o motor deixa); os botões de destino seguem valendo, e os dois caminhos se misturam carta a carta. Tocar numa carta só a escolhe.
- No celular, as cartas ficam em cima e os destinos embaixo, no máximo dois por linha; no PC, os destinos em coluna ao lado das cartas.
- Com todas posicionadas, aparece **Confirmar**, sem envio automático na hora. Depois de confirmar, aparece "Esperando Duda montar…".
- Especiais recebidas vão para a mão e aparecem chegando lá.
- Quem não recebeu numéricas tem o Equipar enviado pelo servidor (spec 2 §5). A interface mostra "Você não recebeu numéricas nesta rodada".
- **Envio antecipado [A]:**
  - quando faltam 1,5 s pelo relógio do servidor (`remainingMs`), se o jogador escolheu ao menos uma carta e não confirmou, a interface envia `EQUIP` com as escolhas feitas;
  - o resto (as cartas que faltam, depois das escolhidas, na ordem de compra) é completado pela regra de estouro do motor, a fileira com menos cartas (empate → Defesa; as duas cheias → descarte). A conta vem de `autoDestinations` exportada (§8.2), nunca de uma cópia;
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
  - cena comum (Reflect lançado e disparado): ~1,5 s;
  - cenas raras (sub-projeto 5, U3): Ataque Absoluto e Defesa Absoluta 3 s (eram 2,6 s; o autor pediu 3 s em 2026-10-30; os quatro J
    em leque, os quatro Q em muro, 0,18 s entre uma carta e a seguinte, o título e a inversão a 0,9 s), Exódia
    4,2 s (os quatro K sobem um a um até a cruz). O título carimba, com mola, no instante da única inversão da cena; raios de
    xilogravura giram devagar atrás do painel. Elas **não encolhem nem contam no teto de decisão** (o resto da linha do tempo encolhe
    para caber nele): são raras, a Exódia acaba a partida, e o toque ou o Esc pulam na hora. No `catchUp` viram faixa, como as outras;
  - um ataque inteiro: ~2 s.
- **Movimento (sub-projeto 5, U4):** as cartas e a marca da iniciativa deslizam com mola (`type: 'spring'`, `visualDuration` 0,42 s,
  `bounce` 0,15), começando na batida que as move; a mola não atrasa a linha do tempo. Os esmaecimentos das camadas são de 220 ms,
  com `ease-out`, e o número do dano sobe desacelerando.
- **Tempo de leitura da faixa (sub-projeto 5, U1):** ao vivo, a faixa fica no ar ao menos `bannerReadMs(texto)` (600 ms + 30 ms
  por caractere, entre 1 s e 2 s), contado do começo da batida dela, mesmo depois de as batidas acabarem. Só o visual fica: os
  controles voltam no fim da linha do tempo, como sempre, e a faixa não pega toque. Outra faixa recomeça a conta; o pulo, uma cena
  ou a cortina a tiram. No `catchUp` não há esse tempo extra.
- **Decisão não espera animação:**
  - o que leva a uma decisão do jogador (a janela de reação aberta pelo ataque do outro) aparece em no máximo ~1 s;
  - o relógio mostra sempre o tempo real do servidor;
  - um toque em qualquer lugar da mesa termina as batidas na hora.
- Os controles ficam desligados durante as batidas e voltam no fim ou no pulo, com no máximo ~1 s de espera (mais a cena rara, quando
  há uma: ela não encolhe, e o toque a pula).
- **`catchUp: true`** (eventos perdidos na reconexão): as batidas tocam em velocidade dobrada, sem cenas especiais e com teto de ~3 s. A faixa fica no ar da primeira à última batida com faixa, com o texto da última que passou: uma subida e uma descida por reconexão, e não uma por faixa (§10.4). O histórico marca "Enquanto você estava fora".
- **`resync: true`:** a mesa troca de uma vez, sem animação. O histórico registra "Mesa sincronizada".
- **Reduzir movimento** (do sistema ou do menu):
  - sem deslocamento: troca direta ou esmaecimento;
  - as faixas especiais viram texto parado por ~1 s;
  - sem tremida e sem flash: a inversão das cenas vira esmaecimento (§10.4). Em modo nenhum há mais de 3 transições claro ↔ escuro por segundo.

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
  - **o PASS guardado leva a marca.** O passe automático sai assim que a janela abre, então quase sempre chega antes do piso de 2 s e fica guardado (`heldPass`). Quando o prazo `reactionMin` vence e o servidor aplica o PASS guardado, a contagem só pode ser zerada se o PASS **não** era `auto`. Por isso o registro do PASS guardado (`heldPass`, hoje `{ epoch, id }`) passa a guardar `auto`, e o caminho do alarme o repassa à lógica de estouros (a checagem de `options.automatic` em `core/game.ts`). Sem isso, a marca falharia sem aviso justamente no caso para o qual existe;
  - a spec 2 §7.3 ganha essa exceção na lista do que **não** zera. A edição entra no mesmo commit que aprova esta spec.
- **Usos:** o passe automático (§3.7) e a confirmação automática da ordem (§3.6). Nenhum outro. O envio antecipado do Equipar não é `auto`.
- **Testes do núcleo:**
  - três estouros com passes `auto` no meio ainda dão W.O. por ausência, com os passes chegando **antes** dos 2 s (guardados e aplicados pelo alarme) e também depois deles;
  - um PASS manual continua zerando;
  - `auto` em mensagem fora do esquema dá `BAD_MESSAGE`.
- **Honestidade:** um cliente modificado pode omitir a marca. O W.O. por ausência existe contra o jogador que saiu de perto, não contra trapaça: um script já pode jogar de verdade.

---

## 6. Reconexão e erros [P]

### 6.1 Persistência no navegador

- Chave por sala `coringa:sala:<CÓDIGO>` → `{ token, playerId, nickname, lastSeq }`. Também `coringa:apelido` e `coringa:prefs` (passe automático, reduzir animações).
- Chave `coringa:tutorial` → `done` (a dica do fim apareceu) ou `skipped` (a pessoa pulou o tutorial); ausente, o tutorial ainda não foi feito (§2.7).
- Chave `coringa:partidas` → a lista das partidas terminadas, da mais nova para a mais velha: as últimas 20, do treino e online, cada uma com id, data, modo, apelidos, assento, resultado, rodadas, placar, versão das regras e, quando houver, o replay (o treino já o traz; online ele chega depois do `room` em `FINISHED` e é acrescentado à linha, e a lista mostra "Sala <código>" com "Rever"). Teto de 1 MB (1 000 000 caracteres do JSON): passando, saem os replays das mais velhas e a linha fica. Quem grava é a mesa, no instante em que a sala vira `FINISHED`.
- Toda leitura e escrita fica num `try/catch`. Sem `localStorage` (aba privada, bloqueio), o jogo funciona, mas recarregar a página perde o assento; a interface avisa uma vez.
- O `lastSeq` é atualizado a cada `state`. Na volta da página, ele vai como `lastSeq` no `RoomClient`, e os eventos perdidos chegam em `catchUp`.
- **O token é segredo:** nunca na URL, no console, em mensagem de erro ou no diagnóstico copiável.
- Como o token fica por navegador, a mesma pessoa não ocupa os dois assentos no mesmo navegador: a segunda aba reconecta como o mesmo jogador e derruba a primeira (4009). Para testar sozinho, use uma janela anônima ou outro navegador; o E2E usa contextos separados.

### 6.2 Estados da conexão

- **Conectando:** antes do primeiro `welcome`.
- **Conectado.**
- **Reconectando:** um aviso no topo ("Reconectando…"); a mesa continua visível, com os controles desligados.
- **Parado:** fechamento final, com a tela de §6.3.

**Voltar ao app** (`visibilitychange` para visível) ou à rede (`online`):

- Com o socket fechado → reconecta na hora, sem esperar a espera crescente. Para isso o `RoomClient` ganha `wake()`, que cancela a espera agendada e abre o socket. A exceção é a espera lenta dos fechamentos 1008 e 4029 (30 s, §6.3): a tela já disse "reconectando em 30 s", e o `wake()` não a encurta.
- **Com o socket "aberto" depois de a aba ficar escondida:** no iPhone, o socket costuma continuar com `readyState` aberto depois do segundo plano, mas morto. Hoje o `RoomClient` manda `ping` e ignora o `pong`, sem prazo. Então:
  - durante `PLAYING`, a volta de uma aba escondida faz o `RoomClient` mandar um `ping` e esperar o `pong` por ~2 s;
  - sem `pong`, fecha o socket e reconecta na hora;
  - o `lastSeq` e o `catchUp` cobrem os eventos perdidos.
- **Prazo de `ack`:** um `act` ou `concede` sem resposta em ~5 s se resolve como `DISCONNECTED` e força a reconexão. Sem isso, uma jogada num socket morto ficaria em "enviando" para sempre, enquanto o relógio de W.O. corre no servidor.

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

Uma exceção no React mostra "Algo deu errado", com os botões **Recarregar** e **Copiar diagnóstico**. O diagnóstico leva código da sala, `seq`, época, versão e mensagem, nunca o token. A versão do diagnóstico pode ser a do protocolo ("protocolo N"): a versão publicada (hash do commit) aparece no menu (§11) e é o mesmo deploy.

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
- **Arrastar** nunca é o único caminho (WCAG 2.5.7): tudo que se arrasta também sai pelo toque e pelo teclado. O fantasma da carta no ar é só desenho (`aria-hidden`, `inert`, sem id nem rótulo), então o leitor de tela não lê a carta duas vezes.
- **Diálogos** (desistir, cemitério, resumo das regras): `<dialog>` nativo, com o foco preso dentro e devolvido ao fechar.
- **Movimento:** `prefers-reduced-motion` e a chave do menu (§4.1).
- **Zoom:** até 200% no PC sem quebrar a mesa.
  - **Conferido na Tarefa 26 (2026-10-21):** passa, sem perda de conteúdo e sem rolagem de lado. O zoom de 200% numa tela de 1440 × 900 vira uma janela de 720 × 450 px CSS (densidade 2), e numa de 1920 × 1080, de 960 × 540; as duas caem no desenho de tablet. Nas duas, `scrollWidth` do documento é igual ao `clientWidth` (720 e 960), nenhum elemento passa da borda e o botão principal ("Atacar") fica dentro da janela; o menu da partida cabe sem rolar, e o resumo das regras rola por dentro (largura sem estouro). Sem erro de console.
  - **Custo, não defeito:** com 450 px de altura, a barra de ação e a mão ocupam ~250 px e a mesa fica numa janela de ~200 px que rola por dentro (conteúdo de 675 px). Dá para chegar a tudo, mas não se veem os dois campos juntos: a vida do oponente e a sua ficam em posições de rolagem diferentes. Com 540 px a janela da mesa sobe para ~290 px.
- `lang="pt-BR"`.
- **Verificação:** axe nos testes de componentes (vitest-axe ou equivalente) e no E2E (`@axe-core/playwright`), sem violações sérias nem críticas.

---

## 8. Mudanças em outros pacotes [P]

### 8.1 Visão geral

| Pacote | Mudança |
|---|---|
| `@coringa/engine` | exporta `previewAttack` e `autoDestinations` (§8.2) |
| `@coringa/protocol` | `act.auto?` no tipo e no esquema; `RoomClient.act(action, { auto })`; `RoomClient.wake()`; conferência do socket por `ping`/`pong` com prazo na volta da aba; prazo de `ack` (§6.2) |
| `@coringa/server` | o `auto` não zera estouros, inclusive no PASS guardado (§5); assets no `wrangler.jsonc`; os comandos que leem a configuração funcionam sem a web construída ou com ela construída antes (§11) |
| `@coringa/sim` | `exports` `./bots`, `./rng` e `./text`; ESLint barra `node:*` nesses arquivos |
| raiz | ESLint para `.tsx`; `check-fast.ts` aceita `.tsx`; scripts `dev:web` e `e2e`; job de E2E na CI |

### 8.2 Motor

**`previewAttack(view, attacker: 'self' | 'opponent')`**

- É função pura sobre a `PlayerView`. Usa só informação pública: fileiras, buffs, Guarda, Reflect e Defesa Absoluta.
- Devolve:
  - `atk` e `def`;
  - `net = max(0, atk − def)`;
  - o desfecho: `DAMAGE`, `GUARD_ABSORBS`, `ABSOLUTE_DEFENSE`, `REFLECTED` ou `NO_ATTACK` (Ataque vazio);
  - o dano no defensor, o dano refletido no atacante e as cartas que quebram (K pela absorção ou pelo Ataque Absoluto; Q e K do atacante no Reflect);
  - a marca de Ataque Absoluto.
- A resolução de verdade (`resolveAttack`) passa a usar a mesma conta, para não haver duas versões da regra. É uma refatoração sem mudança de regra: todas as partidas de referência e os snapshots continuam iguais (regra do `CLAUDE.md`; nenhum `vitest -u`).
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
  - `wake()` na volta do app;
  - socket "aberto" sem `pong` em ~2 s na volta da aba → fecha e reconecta;
  - `act` sem `ack` em ~5 s → `DISCONNECTED` e reconexão.
- **Persistência:**
  - token e `lastSeq` por sala;
  - sem `localStorage`;
  - o token nunca aparece no diagnóstico.
- **Cenas e marcas:** os limites de fotossensibilidade (§10.4) e a marca "novo" (§10.5).
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
   - O tutorial (`/tutorial`, também sem servidor): a dica do Equipar, a seguinte, "Pular o tutorial", o fim com a dica dentro do painel
     de fim e, a 360 × 640, as dicas mais longas (a 1 e a 4) à vista por inteiro, com a mão e a barra (spec do polimento, §5.3).
4. axe nas telas visitadas.

Na partida online a semente só sai do servidor depois do fim, no `replay` (spec 2 §8.4). O `wrangler dev` do E2E fixa o sorteio com `E2E_SEED`, mas os prazos são reais; por isso o E2E online reage ao que aparece na tela, em vez de seguir um roteiro fixo de cartas.

### 9.3 Ferramentas e portão

- **ESLint:**
  - passa a cobrir `**/*.tsx`;
  - nos imports relativos, a regra da extensão aceita `.ts` e `.tsx` (e `.css` na web);
  - entra o `eslint-plugin-react-hooks`;
  - `no-restricted-imports` barra `@coringa/protocol/schemas` e `node:*` em `packages/web/src`.
- **`scripts/check-fast.ts`:** `isSource` passa a aceitar `.tsx`, para o pre-commit rodar os testes relacionados dos componentes.
- **`pnpm check`** ganha lint, typecheck, `test:coverage` e smoke da web. Quem implementa mede o tempo do check antes e depois e registra nesta spec.
  - **Medições (Tarefa 26, 2026-10-21; Windows 11, 12 núcleos, `pnpm check` completo, três rodadas seguidas e a mediana):**

    | Momento | `pnpm check` (mediana) |
    |---|---|
    | Antes do pacote web | 47 s |
    | Commit da Tarefa 6 (`10dafbc`, o pacote web recém-criado) | 55 s |
    | Agora (`df11d07`, interface e E2E prontos): 132 s, 122 s e 118 s | **122 s** |

  - O que pesa: o projeto de testes da web (1088 testes, 30 arquivos, ~58 s de relógio entre os dois projetos `model` e `ui`), seguido do motor (~13 s) e do servidor (~16 s, Node e workerd). Lint, typecheck e o `vite build` do smoke somam o resto. O pre-commit já é o rápido (`scripts/check-fast.ts`), então o custo cai no pre-push e na CI; o E2E fica fora do `pnpm check`.
  - **JavaScript inicial** medido pelo `packages/web/scripts/smoke.ts`: **127,9 KiB comprimidos (gzip) de 200 KiB** de orçamento (um arquivo; eram 127,5 KiB e 402,0 KiB brutos antes do texto revisado do resumo das regras). Fora do inicial: o chunk do treino com o bot (`local-room`, 7,0 KiB gzip) e as funções do Motion (`motion-features`, 26,9 KiB gzip). Na Tarefa 6 o inicial era de 66,4 KiB.
- **CI:** `.github/workflows/check.yml` ganha o job `e2e`, em paralelo ao `check`:
  - instala as dependências e o Chromium (`pnpm exec playwright install --with-deps chromium`);
  - constrói a web, sobe o `wrangler dev` e roda o Playwright. O `wrangler dev` local não precisa de login; desligue a telemetria (`WRANGLER_SEND_METRICS=false`) para não haver pergunta interativa;
  - qualquer erro no console do navegador, inclusive violação de CSP, falha o teste;
  - o merge exige os dois jobs verdes.

---

## 10. Direção visual [A]

### 10.1 A escolha: "A Peleja do Coringa" (xilogravura de cordel) [A]

O autor escolheu a direção A entre os três rascunhos (celular e PC) do artifact "Jogo do Coringa — rascunhos da mesa" (https://claude.ai/artifact/ERTQYecLGcKhTtLArAbBSg). As outras duas eram "Fliperama" (placar de jogo de luta) e "Painel de embarque" (cartão e quadro de voos). Os rascunhos servem de referência de composição e de acabamento, não de pixel.

- **A ideia:** o duelo 1v1 como a peleja de dois cantadores de cordel. Dá identidade brasileira ao jogo e combina com o duelo.
- **Materiais:**
  - papel de capa de folheto, uma cor por jogador (verde para o oponente, rosa para você), cobrindo a metade da mesa de cada um;
  - tinta preta de xilogravura;
  - um vermelho de segunda cor, como na impressão a duas cores.
- **Composição:**
  - a faixa central preta concentra o que é dos dois: rodada, de quem é a vez, relógio, iniciativa, monte e cemitério;
  - as duas fileiras de Ataque ficam frente a frente junto da faixa [A]. É ali que o "fileira contra fileira" fica legível, e a prévia do dano mora na faixa ou na barra de ação.
- **Cartas:** face em papel, borda preta grossa e irregular de carimbo, valor em tipo de madeira e naipe em SVG próprio.
- **Detalhes:**
  - a vida perdida aparece hachurada na barra;
  - as cartas que vão para o cemitério perdem a cor (escala de cinza);
  - os alvos e a carta selecionada ganham o contorno ouro.
- **Cenas especiais** (Exódia, Absolutos, Reflect): a tela inteira se inverte, como o negativo da gravura, dentro dos limites de §10.4.

### 10.2 Regras que valem para a direção [P]

- **Fontes:** servidas pelo próprio Worker (sem Google Fonts em tempo de execução), com subconjunto latino.
- **Tokens:** cores, tipos e espaços em tokens do Tailwind 4 (`@theme`), com uma única fonte de verdade.
- **Os dois jogadores** se distinguem por posição (você sempre embaixo) e por rótulo (apelido, "você"), nunca só pela cor (§10.6).
- **Naipes, o Coringa e as ilustrações:** SVG próprio, nunca emoji nem glifo como ícone. O ♥ ♦ ♠ ♣ no texto corrido do histórico é notação, não ícone.
- **Navegador:** seleção de texto, cursor, foco, barra de rolagem e sublinhado tematizados pela paleta.

### 10.3 Paleta e tipos [P]

| Token | Cor | Uso |
|---|---|---|
| `tinta` | `#17120F` | traço, texto principal, faixa central, barra de ação |
| `papel` | `#F1F0EA` | face das cartas, texto claro sobre a tinta |
| `capa-oponente` | `#6FA86C` | metade da mesa do oponente |
| `capa-voce` | `#EE9DB5` | a sua metade da mesa |
| `vermelho` | `#B8261C` | naipes vermelhos, marca "novo" (§10.5), urgência do relógio |
| `ouro` | `#F5C238` | seleção, alvos, botão principal, anel do relógio |

- O verde ficou mais escuro que o do rascunho (`#86BC84` → `#6FA86C`) para abrir diferença de luminosidade em relação ao rosa (≈ 0,33 contra ≈ 0,46). Assim, as duas metades não se confundem para quem não distingue verde de rosa.
- **Contrastes conferidos:**
  - tinta sobre as duas capas: ≥ 6,5:1;
  - vermelho sobre o papel: ≈ 5,5:1;
  - ouro e papel sobre a tinta: ≥ 11:1.
- O vermelho sobre a capa do oponente não chega a 3:1. Por isso a marca "novo" e outros sinais vermelhos ficam sobre o papel ou com contorno de tinta.
- **Urgência do relógio** (últimos 5 s): o disco fica vermelho com o número em papel (≈ 5,5:1), e o anel engrossa. A mudança vem por cor **e** forma, sem piscar.
- **Tipos:**
  - **Tipo de madeira:** Alfa Slab One (SIL OFL). Vai nos títulos ("RODADA 7"), nos botões ("ATACAR") e no valor das cartas. A textura de carimbo só entra nos títulos e nas cenas especiais, nunca no valor das cartas pequenas.
  - **Texto e números de jogo:** Archivo (SIL OFL, variável, com eixo de largura para as versões estreitas). Os números de jogo usam algarismos tabulares (`font-variant-numeric: tabular-nums`). Se o arquivo servido não tiver `tnum`, o plano troca por outra fonte OFL que tenha, conferindo antes.

### 10.4 Fotossensibilidade [OBRIGATÓRIO]

A inversão da tela inteira é um flash. Regras:

- no máximo **1 inversão por cena**, mantida por pelo menos **~300 ms**;
- nunca mais de **3 transições claro ↔ escuro por segundo**, somando tudo o que estiver na tela (WCAG 2.3.1);
- a inversão, a cortina escura das cenas e a faixa passam pela mesma trava (`FlashLock`):
  - a inversão que a conta das 3 trocas recusa (a faixa e a cortina de antes encheram a janela) espera o primeiro instante em que cabe inteira, se ainda acabar dentro da cena; a que o resfriamento entre inversões recusa não acontece (a segunda cena seguida fica sem inversão);
  - a cortina e a faixa que não podem subir ou descer esperam o primeiro instante em que a regra deixa;
  - só o visual espera: as batidas e os controles seguem a linha do tempo;
- com "reduzir movimento" (do sistema ou do menu), a inversão vira um esmaecimento curto, sem troca brusca de luminância;
- **testes:**
  - na linha do tempo (puro), toda cena tem no máximo 1 inversão, com duração ≥ 300 ms, e nenhuma janela de 1 s tem mais de 3 trocas;
  - com movimento reduzido, nenhuma cena gera inversão;
  - um teste de componente confere que, com movimento reduzido, a cena não aplica a inversão.

### 10.5 "Fica aceso até você ver", na linguagem da Peleja [A]

Ideia trazida da direção C, e só ela; nada mais de B ou C entra.

- **O que marca:** tudo o que mudou na mesa desde a sua última jogada voluntária. Entram as cartas novas nas fileiras do oponente, os buffs e K que ele jogou, as cartas suas que ele destruiu (na entrada do cemitério), a vida perdida e as linhas do histórico.
- **Como marca:** um carimbo ou sublinhado de goiva no vermelho de segunda cor, sobre a face da carta (papel) ou com contorno de tinta, para ter ≥ 3:1.
- **Quando apaga:** na sua próxima jogada voluntária (as automáticas não contam), ou quando você toca, foca ou passa o mouse sobre o elemento marcado.
- **Por quê:** você olha o celular entre um turno e outro, e precisa achar na hora o que o outro fez.
- **Leitor de tela:** o nome acessível do elemento ganha ", novo".
- **Testes:** o model calcula o conjunto marcado a partir da `view` da sua última jogada e da atual. Cobre marcar, apagar na jogada voluntária, não apagar na automática e apagar no toque ou foco.

### 10.6 Arte original e licenças [OBRIGATÓRIO]

- **A xilogravura é arte popular viva,** e muitas obras têm autor e direitos (a de J. Borges, por exemplo). Todas as ilustrações (o Coringa, os naipes, as cenas) e texturas do jogo são **originais**, feitas para o projeto. Nada é copiado, decalcado ou traçado por cima de obra existente.
- **Texturas** (grão do papel, borda de carimbo) são geradas por código (SVG `feTurbulence`) ou desenhadas para o projeto.
- **Fontes:** só com licença que permita embutir e servir (SIL OFL ou equivalente). O arquivo da licença fica ao lado da fonte no repositório, e um `LICENSES.md` da web lista fonte, versão e licença.

### 10.7 Legibilidade dentro da estética [OBRIGATÓRIO]

- **Textura de papel e borda de carimbo nunca entram nos números de jogo:** vida, ATK e DEF, a conta das fileiras, a prévia, o relógio e o placar. Esses números usam a fonte de texto (§10.3), com algarismos tabulares e contraste AA, e cabem com folga em 360 px.
- O grão do papel é uma camada por baixo do conteúdo, nunca por cima do texto.
- **Daltonismo:** o verde e o rosa nunca são a única pista de quem é quem (posição e rótulo, §10.2). O plano confere as telas principais com simulação de deuteranopia, protanopia e tritanopia (por exemplo, a emulação de deficiência de visão do DevTools) e registra o resultado.
  - **Resultado (Tarefa 26, 2026-10-21): passa nos quatro modos.** Sem DevTools interativo, a conferência usou o Chromium do Playwright com `Emulation.setEmulatedVisionDeficiency` (a mesma emulação do painel Renderização) em `/treino?semente=cor`, com `deuteranopia`, `protanopia`, `tritanopia` e `achromatopsia`, mais um quadro sem deficiência para comparar. Telas: o Equipar da rodada 1 e a mesa da rodada 3 (fileiras cheias nos dois campos, a mão e o painel da escolha da ordem), em 1440 × 900 e em 390 × 844, e um recorte das fileiras a 3× para ver os naipes. Olhei as capturas uma a uma; não conferi o fim de partida, o cemitério nem a janela de reação nesta passada.
  - **As duas metades:**

    | Modo | Campo do oponente (verde) | Seu campo (rosa) | Por cor |
    |---|---|---|---|
    | Deuteranopia | oliva claro | cinza claro | distintos |
    | Protanopia | oliva claro | cinza-azulado | distintos |
    | Tritanopia | verde-azulado | rosa | distintos |
    | Acromatopsia | cinza médio | cinza um pouco mais claro | quase iguais |

    Na acromatopsia a luminosidade dos dois campos é próxima, e o que separa as metades é o que a spec já exige: a posição (o oponente em cima, você embaixo), o rótulo ("Bot" e "Você", com a vida de cada um) e a faixa escura da rodada entre os dois campos. Em nenhum modo a cor é a única pista.
  - **Naipes:** ♥ ♦ ♣ ♠ se distinguem pela forma em todos os modos, no tamanho real e a 3×. O número vermelho vira oliva escuro (deuteranopia e protanopia) ou cinza médio (acromatopsia) e o preto continua preto: a diferença de luminosidade entre os dois é pequena na deuteranopia e na protanopia, então quem garante a leitura é a forma do naipe (e o nome acessível da carta), como a §7 prevê. O sublinhado do "novo" (§10.5) continua sendo uma forma (uma barra), visível nos quatro modos.
- O axe confere o contraste nos testes de componentes e no E2E (§7).

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
- **A pasta de assets na configuração afeta mais que o smoke.** Com `assets.directory` no `wrangler.jsonc`, todo comando que lê a configuração pode depender de `packages/web/dist` existir:
  - o `wrangler types` do `typecheck` do servidor;
  - o projeto de testes no workerd (`configPath`);
  - o `wrangler dev`;
  - o `wrangler deploy --dry-run` do smoke.

  Os quatro precisam funcionar num clone novo e na CI. O `pnpm -r` não põe a web antes do servidor (o servidor não depende dela). O plano escolhe o mecanismo depois de conferir o comportamento do wrangler com a pasta ausente: ordem explícita (construir a web antes), uma pasta reservada com um `index.html` mínimo, ou tolerância comprovada. Não vale supor o comportamento.
- **Ordem do build:**
  - `pnpm deploy:server` passa a ser `pnpm check` → build da web → `wrangler deploy`. O nome fica, e continua sendo o autor quem roda.
- A versão publicada (hash do commit) já sai em `/api/health`; a interface a mostra no menu.

---

## 12. Desempenho [P]

- **JavaScript inicial ≤ 200 KB** comprimido, com React, Motion (carregado com `LazyMotion`; as funções `domMax`, que o recurso de layout das cartas exige, entram por `import()` à parte, fora do inicial), o motor e a interface. O treino carrega o bot sob demanda (`import()` dinâmico).
- A tela de início abre em menos de 2 s num 4G médio.
- **Animações:** só com `transform` e `opacity` no que se repete, e 60 fps num celular intermediário. As cenas especiais podem usar `filter` e `clip-path`, dentro do orçamento de §4.1.

---

## 13. Riscos

- **Celular em segundo plano:** o iPhone derruba o WebSocket em segundo plano. Responder uma mensagem por mais de 60 s no meio da partida dá W.O. [A]. A mitigação é o aviso no lobby e a reconexão na volta.
- **Tempo do passe automático:** ver §3.7.
- **Relógio:** o deslocamento estimado tem erro de meia ida e volta da rede. O envio do Equipar em −1,5 s, mais a margem de 500 ms do servidor, cobre isso com folga.
- **Mesa densa em 360 px:** sete cartas por fileira, quatro fileiras, buffs e Guarda. Os rascunhos mostram que cabe. O teste de layout em 360 px entra no E2E de celular.
- **Tempo do `pnpm check`:** cresce com a web. O pre-commit já é o rápido, e o E2E fica fora.
- **Estética contra legibilidade:** a textura de xilogravura pode cobrar caro no celular. As regras de §10.7 e o axe seguram isso, e os números de jogo nunca levam textura.
- **Fotossensibilidade das cenas:** a inversão da tela é um flash. Os limites e os testes estão em §10.4.

## 14. Critérios de pronto (sub-projeto 3 e MVP)

1. `pnpm check` e o job `e2e` verdes, na máquina e na CI.
2. O autor jogou uma partida completa com um amigo, pelo link, no endereço publicado:
   - um dos dois no celular em pé e o outro no PC;
   - com uma queda e volta no meio;
   - com uma revanche.
3. O treino contra o bot funciona no celular e no PC.
4. A partida inteira é jogável só pelo teclado, e o axe passa sem violação séria.
5. O tempo do `pnpm check` foi medido e registrado (§9.3).

**Fica para o autor:** rodar `pnpm deploy:server` (precisa do `wrangler login`) e jogar o item 2, uma partida com um amigo pelo link publicado, um no celular e outro no PC, com queda e volta e com revanche.

## 15. Fica para quem constrói

- Biblioteca de rotas (ou nenhuma) e de estado (ou `useSyncExternalStore` puro).
- Organização dos componentes e do CSS, curvas exatas das animações e como as transições de layout são agendadas por batida.
- jsdom ou happy-dom nos testes de componentes.
- Proxy do Vite ou plugin da Cloudflare no ambiente local.
- Extrair `bots` e `text` do simulador para um pacote próprio, em vez dos subpaths (§1.4).
- Detalhes da API de `previewAttack` além do que §8.2 pede.
