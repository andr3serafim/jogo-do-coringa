# Jogo do Coringa — Polimento: recursos (sub-projeto 4, Fase C)

Data: 2026-10-22. Desenho dos cinco recursos do polimento: sons, níveis de bot no treino, histórico e replay de partidas,
tutorial e arrastar cartas. As Fases A (mesa no PC de pouca altura, faixa pela `FlashLock`) e B (dívida técnica) já estão na
`main`, ou entram antes desta.

O autor delegou as decisões à sessão principal ("decida e prossiga"). O que está marcado **[decisão minha]** foi escolhido por
quem escreveu esta spec; o resto segue regras já aprovadas (CLAUDE.md, specs 1 a 3). **Aprovada em 2026-10-22** pela sessão
principal, por delegação do autor, com a semente pós-partida (§4.2) e cinco condições, já incorporadas: o momento da mensagem
`replay` e a semente nova a cada partida (§4.2), a ativação do áudio (§2.2), o Difícil sem trapaça e a contagem do portão
(§3.2), a prévia letal pelo `previewAttack` (§8.1) e o abandono terminal (§4.2). O texto das dicas do tutorial vai para a
sessão principal revisar na fatia 4.

---

## 0. Por quê, e o que é sucesso

O MVP joga, mas ainda é um jogo para quem já sabe as regras e tem um amigo do outro lado. O polimento quer:
- que alguém que nunca viu o jogo aprenda jogando, sem ler o resumo das regras antes (tutorial);
- que o treino sirva a quem começa e a quem já joga bem (níveis);
- que a partida tenha peso e ritmo também pelo som (sons);
- que dê para rever uma partida boa ou entender uma derrota (histórico e replay);
- que jogar uma carta no celular e no PC seja tão natural quanto pôr a carta na mesa (arrastar).

**Sucesso:** os cinco recursos na `main`, cada um testado, sem quebrar nenhuma garantia das specs anteriores.

### Objetivos
- Os cinco recursos acima, em pt-BR, no celular (360–430 px), no tablet e no PC.

### Não-objetivos
- Contas, ranking, histórico no servidor ou compartilhado entre aparelhos.
- Bot difícil no jogo online (`pnpm bot`): os níveis são do treino.
- Música de fundo, sons de ambiente ou volume por canal.
- Arrastar como único caminho para jogar.

### Anti-objetivos (falhas mesmo que "funcionem")
- Qualquer som antes de um gesto do usuário, ou som que não dá para desligar.
- Flash: nenhum recurso novo cria troca claro ↔ escuro fora da `FlashLock` (spec 3 §10.4).
- JS inicial acima de 200 KB gzip: sons, tutorial, replay e o bot difícil carregam sob demanda.
- Um bot "difícil" que espia a mão do jogador ou o monte.
- Perder o caminho por botões e teclado em qualquer jogada (WCAG 2.5.7).
- Arte, fonte ou som copiados: tudo original, gerado por código ou com licença conferida.

---

## 1. Restrições que valem para todos

- **Pacotes:** motor, protocolo, simulador e núcleo do servidor seguem em Node puro (imports `.ts`, só sintaxe apagável). A web é
  o único pacote com bundler.
- **Sem regra na interface:** o que é jogada legal, total, prévia e destino vem do motor (`legalActions`, `previewAttack`,
  `nextEquipDestinations`, `absoluteAttackArmed`).
- **Carregamento sob demanda:** cada recurso pesado entra por `import()`: o motor de som, o tutorial, as telas de histórico e
  replay, e o bot difícil. O smoke da web confere os 200 KB.
- **Movimento reduzido** (sistema ou menu): nenhum recurso novo anima deslocamento; o arrastar não voa de volta, só reaparece.
- **Números de jogo** sem textura, com `tabular-nums` (spec 3 §10.7), inclusive no replay.
- **Acessibilidade:** zero violações sérias do axe nas telas novas; tudo alcançável por teclado; anúncios por região viva
  `polite`, salvo onde a spec 3 já usa `assertive`.
- **Testes:** TDD; modelo puro testado no Node; componentes no jsdom; um E2E por recurso no Chromium.

---

## 2. Sons

### 2.1 O que toca
Sons curtos ligados às batidas da linha do tempo (spec 3 §4), um por tipo de evento. Mapa puro `cueOf(beat): Cue | null` no
modelo da web. **[decisão minha]** As pistas:

| Pista | Quando |
|---|---|
| `carta` | `CardsPlaced`, `BuffPlayed`, `GuardPlayed`, `Resurrected` (a carta chega na mesa) |
| `quebra` | `GuardBroken`, `TrapUsed`, `Sacrificed`, `CardsRemovedFromRow` do defensor |
| `golpe` | `DamageDealt` com dano > 0 (mais grave quanto maior o dano, em 3 faixas) |
| `escudo` | `ReflectPlayed`, `ReflectTriggered`, `AbsoluteDefenseStarted` |
| `absoluto` | `AbsoluteAttack`, `Exodia` |
| `vez` | `TurnStarted` seu e `ReactionWindowOpened` com você respondendo |
| `fim` | `GameOver` (vitória e derrota têm variações) |
| `urgencia` | uma vez, quando o seu relógio entra nos últimos 5 s (spec 3 §3.8) |

### 2.2 Regras
- **Nada antes de um gesto:** o `AudioContext` só é criado num gesto que o navegador conta como ativação do usuário:
  `pointerup`, `touchend`, `click` ou `keydown` (um `pointerdown` de toque não conta no Chrome nem no Safari). O módulo de som só
  é importado nessa hora, e a cada gesto, enquanto o contexto não está `running`, ele chama `resume()`. Antes disso, nenhuma
  pista toca nem fica na fila.
- **Mudo:** preferência `sound` em `coringa:prefs`, **ligada por padrão [decisão minha]**, com um interruptor "Som" no menu da
  partida e na tela inicial. Desligado, o `AudioContext` é suspenso.
- **Sem som** no `catchUp` e no `resync` (seria uma rajada). Nada é agendado adiante: cada pista toca na hora em que a batida a
  pede, e as vozes de uma pista já iniciada terminam sozinhas, sem que um pulo das batidas as corte.
- **Volume fixo e moderado**, sem picos (limitador no fim da cadeia).
- **Originais:** os sons são sintetizados por código (osciladores, ruído filtrado e envelopes do Web Audio). Nenhum arquivo de
  áudio, então não há licença a conferir.
- **Porta injetável:** a mesa fala com uma interface `SoundApi` (`ui/sound-context.ts`) com duas operações, `play(cue)` e `setEnabled(on)`. O jsdom não
  tem `AudioContext`; os testes usam uma porta falsa.

### 2.3 Testes
- O mapa `cueOf` para cada tipo de evento, e nenhuma pista em `catchUp`/`resync`.
- A pista toca na batida do evento, e só ao vivo: no `catchUp` e no `resync` nenhuma pista sai.
- Com a porta falsa: um contexto que nasce suspenso é retomado no próprio gesto que o criou (e nos seguintes, enquanto não estiver tocando).
- E2E: um espião no `addInitScript` confere que nenhum `AudioContext` nasce antes do primeiro gesto e que nasce depois dele.

---

## 3. Níveis de bot no treino

### 3.1 Os níveis [decisão minha]
- **Fácil ("distraído"):** joga como o `greedy`, mas, com probabilidade fixa (semente do bot), escolhe uma jogada legal ao
  acaso. Nunca o `random` puro, que nem monta fileiras.
- **Médio:** o `greedy` de hoje. É o padrão.
- **Difícil:** o `greedy` com busca por *rollouts* nas decisões que têm mais de uma opção. Para cada candidata, simula algumas
  continuações `greedy × greedy` a partir de um estado **determinizado** (`determinize`, do simulador: a mão e as pendentes do
  oponente e o monte são resorteados do que o bot não vê) e escolhe a de melhor resultado. Nunca olha a mão real nem o monte.
  **[decisão minha]** Para caber no navegador, os rollouts são **truncados** e avaliados pela heurística do `eval.ts` (vida e
  mesa), e as candidatas são **podadas**. Os valores saíram do portão (§3.2; medidas em `packages/sim/reports/dificil.md`):
  - o rollout vai até o fim da 2ª rodada de Ataque, quando a decisão é no Equipar, e até o fim da 3ª, contando a atual,
    quando é na fase principal do Ataque. O horizonte de uma só rodada de Ataque, o primeiro tentado, não passava do `greedy`;
  - são 4 candidatas, com a escolha do `greedy` em primeiro, e 8 rollouts por candidata, nos mesmos mundos sorteados para todas;
  - na escolha da ordem do ataque e na reação não há busca: vale a jogada do `greedy`, porque buscar ali não melhorou nada.

  Medido no Node: uma partida inteira `greedy × greedy` leva ~20 ms, um assento tem ~26 decisões com mais de uma opção (até
  30 opções no Equipar), e a decisão do Difícil leva 97 ms na mediana e 198 ms no p95 (rodada 3 do portão, as decisões com 2 ou
  mais ações; só nas fases com busca, 117 e 207 ms). Esses tempos variam com a carga da máquina: a confirmação em sementes novas,
  rodada junto com outra carga, deu p95 de 172 ms e máximo de 752 ms.

### 3.2 Portão do Difícil (medido no simulador, semente fixa)
- Contra o `greedy`, alternando os assentos e a iniciativa inicial: pontuação ≥ 58% em 200 partidas (≈ 2 erros-padrão acima de
  50%), com vitória = 1 ponto, empate = ½ e derrota = 0.
- **Sem trapaça, com teste:** para a mesma vista e a mesma semente do bot, a decisão é idêntica quando muda só a mão real do
  oponente e a ordem do monte (o `determinize` não vaza a informação oculta).
- Fácil < Médio: o Médio vence o Fácil em ≥ 65% das partidas.
- Tempo **[decisão minha]**: o orçamento protege o navegador. O número de rollouts por decisão é fixo e dimensionado para ≤ 300 ms
  no p95 no Node (um celular modesto, 3 a 5 vezes mais lento, leva até ~1,5 s, mostrado como o bot "pensando"). A busca roda em
  fatias de no máximo ~8 ms na thread principal, uma por tarefa do navegador, para não travar as batidas nem os timers da
  `FlashLock`. A fatia mira ~8 ms, mas a menor unidade dela é **um rollout** (o gerador cede depois de cada um): no Node ele leva
  poucos ms, e num celular modesto, 3 a 5 vezes mais. Então uma fatia pode passar de 8 ms, e é só um alvo, não um teto. O
  playtest no celular confere se há engasgo no Equipar contra o Difícil (a busca mais pesada, com até 30 opções); se houver, o
  seguimento conhecido é ceder dentro do rollout.
- O portão roda num script à parte do simulador (como o `sim:calibrate`), nunca no `pnpm check`: cada rodada leva dezenas de
  minutos.
- A busca é determinística para a mesma semente: o número de rollouts é fixo, e o tempo só decide quando ela termina, não o
  resultado.
- **Se o portão não fechar** depois de duas rodadas de ajuste (número de rollouts, horizonte, candidatas, avaliação), o Difícil
  não entra: o treino oferece Fácil e Médio, e a lacuna fica registrada com as medidas. O risco é real: com rollouts truncados
  num orçamento de navegador, vencer o `greedy` por 8 pontos não é garantido.

### 3.3 Interface
- `/treino` mostra antes da mesa a escolha do nível: três botões grandes com uma linha cada. O último nível escolhido fica em
  `coringa:nivel` e vem focado. `/treino?nivel=facil|medio|dificil` pula a escolha (o E2E usa).
- A semente do treino continua em `?semente=`.
- A faixa central e o menu mostram o nível ("Treino · Médio").

### 3.4 Onde mora
- Os bots em `@coringa/sim/bots`. O Difícil precisa do estado inteiro para determinizar: ganha um tipo próprio
  (`StateBot`: estado, assento, jogadas legais, rng), usado só onde o estado existe (o `LocalRoom` e as séries do simulador).
- O bot difícil entra no chunk do treino, que já é carregado por `import()`.

---

## 4. Histórico e replay de partidas

### 4.1 O que se guarda
- **Lista local** em `coringa:partidas`: as últimas 20 partidas terminadas neste navegador, do treino e online, da mais nova para
  a mais velha. Cada uma: id, data, modo (treino com o nível, ou online com o código da sala), os apelidos, o seu assento, o
  resultado e a causa, rodadas, o placar da sala, a versão das regras e, quando houver, o replay.
- **Replay** no formato do simulador: config, semente, jogadores e as jogadas na ordem (~10 KB por partida). Teto de 1 MB para a
  lista inteira: passando, saem os replays mais velhos (a linha da partida fica).
- **Versão das regras:** o motor exporta `RULES_VERSION`, que sobe quando uma regra muda o resultado das partidas de referência.
  Um replay de outra versão abre com um aviso; se uma jogada for recusada pelo motor, o replay para ali e diz por quê, sem quebrar
  a tela.

### 4.2 De onde vem o replay
- **Treino:** o `LocalRoom` já tem a semente e as jogadas; no fim da partida ele emite o evento `replay` da conexão
  (`{ t: 'replay', gameNo, replay }`, a mesma mensagem que o servidor manda online na fatia 3), logo antes do `room` em
  `FINISHED`. A sessão só guarda o replay cujo `gameNo` é o da sala, e a mesa grava a partida na lista assim que a sala vira
  `FINISHED` (com o replay, quando ele chegou); o painel de fim oferece "Rever a partida" quando a partida ficou guardada com
  replay.
- **Online:** o servidor já monta o replay no fim da partida (hoje só para o log). Ele passa a mandar uma mensagem nova,
  `{ t: 'replay', gameNo, replay }`, aos dois assentos quando a partida termina, e de novo no `hello` com a sala em `FINISHED`
  (só a da partida terminada, nunca a de uma revanche em curso).
  - É aditiva: o `RoomClient` (web e terminal) ignora tipos que não conhece. O `PROTOCOL_VERSION` não muda.
  - **Ponto para aprovação explícita:** a spec 2 diz que a semente nunca sai do servidor. A regra passa a ser "a semente de uma
    partida só sai depois do fim dela, no replay". Cada partida sorteia a sua (`randomBytes(16)`), então a semente de uma partida
    não diz nada sobre a seguinte. O replay em si contém a mão do oponente na partida inteira (quem ler o armazenamento a vê),
    mas o visualizador mostra só a vista do seu assento, sem botão para ver as cartas do outro **[decisão minha]**.
  - **Se a mudança for recusada:** a fatia 3 sai. As partidas online ficam na lista, sem "Rever"; só o treino tem replay.
  - A mensagem só sai quando a partida não pode mais continuar: sala `FINISHED` (fim do motor ou W.O.) ou sala encerrada. Nunca
    durante uma partida viva, nem durante a revanche em curso. Uma desconexão com volta possível não conta; o abandono só conta
    quando é terminal (a sala acabou), e aí o replay vai até onde a partida foi.
  - Um teste do núcleo prova que cada partida nova, inclusive a revanche, pede `randomBytes` para a semente e nunca a deriva da
    anterior.

### 4.3 Telas
- `/partidas`: a lista (data, contra quem, resultado, modo) com "Rever" quando há replay. Entrada pela tela inicial ("Partidas
  anteriores") e pelo painel de fim ("Rever a partida").
- `/partidas/<id>`: a mesa só de vista (sem jogadas), do seu assento, com o histórico até o passo atual e os controles
  **[decisão minha]**: início, passo anterior, próximo passo, tocar/pausar (um passo por batida, respeitando as batidas e a
  `FlashLock`), e um seletor de rodada. Teclado: os controles são botões; nada de atalho de uma tecla.
- Avançar um passo toca as batidas daquele passo, como ao vivo; voltar troca a mesa de uma vez, sem animação (como um `resync`).
- As duas telas entram por `import()`.

### 4.4 Testes
- Modelo: gravar, cortar pela quantidade e pelo tamanho, ler arquivo estragado, versão diferente.
- Servidor: a mensagem `replay` no fim, no `hello` em `FINISHED`, nunca durante a partida nem na revanche em curso, e a semente
  nova a cada partida.
- Componente: os controles do replay e o aviso de versão.
- E2E: terminar uma partida de treino (desistindo), abrir "Rever a partida", avançar passos e voltar.

---

## 5. Tutorial

### 5.1 Como é [decisão minha]
- Uma partida de treino de verdade, contra o bot Fácil, numa semente escolhida para as especiais aparecerem cedo, com **dicas
  por situação**. Não é um roteiro rígido: o jogador pode jogar o que quiser, e a dica certa aparece quando a situação acontece.
- Um modelo puro `tutorialHint(view, events, seen): Hint | null` escolhe a dica. Cada uma aparece uma vez. A lista (texto final
  no plano, revisado pela sessão principal):
  1. o Equipar (as numéricas vão para Ataque ou Defesa; a fileira é uma fila);
  2. quadras (quatro do mesmo valor);
  3. a escolha da ordem (quem tem a iniciativa);
  4. o primeiro turno de ataque (ATK contra DEF, a prévia no botão);
  5. J e Q (buffs) e K (Guarda);
  6. o A na janela de reação;
  7. o Selvagem;
  8. o Reflect;
  9. a Pressão da mesa e o anti-travamento;
  10. o fim (vida, Exódia) e o convite para jogar com um amigo.
- **Painel:** não modal, sem prender o foco, anunciado como `polite`, com "Entendi" e "Pular o tutorial". No PC fica no alto da
  coluna do histórico; no celular e no tablet, no fluxo acima dos campos (empurra os campos, nunca cobre a mão nem a barra). Fica
  abaixo das camadas da cena e da faixa.
- **Destaque:** a zona de que a dica fala ganha um contorno parado (ouro com borda de tinta), sem piscar.
- **Entrada:** `/tutorial`. Na tela inicial, "Aprender jogando" em destaque até o tutorial ser concluído ou pulado
  (`coringa:tutorial`), e depois como link comum.
- Entra por `import()`.

### 5.2 Testes
- Modelo: cada dica na situação certa, uma vez só, e nenhuma depois de pular.
- Componente: o painel não prende o foco, "Entendi" e "Pular".
- E2E: abrir `/tutorial`, ver a dica do Equipar, montar, ver a dica seguinte, pular; o axe sem violações sérias.

---

## 6. Arrastar cartas

### 6.1 Onde
- **Fase principal, na sua vez:** arrastar uma carta da mão até a zona da jogada. J para os seus Buffs de ataque; Q para os de
  defesa; K para a Guarda; A ou Selvagem até a carta do oponente que é alvo da Armadilha; J/Q/Selvagem até o J/Q do oponente
  (Sacrifício). Soltar onde há exatamente uma jogada a faz; onde há mais de uma (por exemplo, o Selvagem nos buffs), abre a
  escolha que a barra já mostra. Reflect e Ressuscitar continuam pelos botões.
- **Equipar:** arrastar a carta da vez até a sua fileira de Ataque ou de Defesa (com as duas cheias, até a última carta de uma
  delas para trocar, ou até o cemitério para descartar). Os destinos válidos vêm de `nextEquipDestinations`.

### 6.2 Regras
- **Limiar:** só vira arrasto depois de ~8 px de movimento; antes disso o toque segue sendo o toque de hoje (escolher a carta).
- **Travado não arrasta:** com batidas em curso, jogada em voo ou conexão caída, nada arrasta (o `pointerdown` que pula as
  batidas não começa arrasto).
- **Fantasma:** uma cópia da carta numa camada fixa, fora do contêiner dos campos (que recorta), com `pointer-events: none`. O
  alvo da soltura sai de `elementFromPoint` e de um atributo `data-soltar` nas zonas.
- **Zonas válidas** ganham um contorno parado enquanto a carta está no ar; soltar fora delas devolve a carta à mão (sem voo com
  movimento reduzido).
- **Toque:** as cartas arrastáveis têm `touch-action: none`; a mesa continua rolando por fora delas.
- **Envio:** a soltura passa pelo mesmo caminho do toque (`isLegal` contra a lista do último `state`).
- **Os botões e o teclado continuam** exatamente como hoje (WCAG 2.5.7).

### 6.3 Testes
- Modelo: o mapa carta → zonas a partir das jogadas da mesa (`tablePlays`), e do Equipar a partir de `nextEquipDestinations`.
- Componente: o limiar (toque não arrasta), travado não arrasta, soltar numa zona com uma jogada envia, com duas abre a escolha.
- E2E: no treino, arrastar um K até a Guarda e uma numérica do Equipar até a Defesa, no PC e no celular.

---

## 7. Ordem de entrega

Cada fatia entra na `main` sozinha, com revisão de código e os dois jobs da CI verdes, por fast-forward:

1. **Sons** e **níveis de bot** (autocontidos).
2. **Histórico e replay do treino** (lista local, `RULES_VERSION`, telas).
3. **Replay online** (mensagem `replay` do servidor, a mudança na spec 2).
4. **Tutorial.**
5. **Arrastar cartas.**

---

## 8. Pronto quando

- As cinco fatias na `main`, com `check` e `e2e` verdes na CI da `main`.
- O JS inicial segue ≤ 200 KB gzip.
- Nenhum teste de flash afrouxado; nenhuma violação séria do axe.
- As specs 2 e 3 atualizadas onde esta muda o comportamento (semente pós-partida, menu, tela inicial, rotas).

---

## 8.1 Follow-up recebido da Fase B

- **A prévia do ataque não diz quando derruba o oponente.** O botão principal mostra "27 × 3 · dano 24" mesmo quando o dano
  passa da vida que resta, e no celular de 360 × 640 a vida do oponente fica fora da vista na sua vez de atacar (spec 3 §3.2). A
  prévia passa a dizer o desfecho ("dano 24 · derruba Duda"), a partir do resultado do `previewAttack` (o dano depois da Guarda, da
  Defesa Absoluta e do Reflect), nunca de ATK − DEF: com Guarda, não derruba; contra Reflect, mostra o desfecho para quem ataca
  ("o Reflect devolve 24 · derruba você"). Com teste. Entra na fatia do tutorial, que mexe nos textos da barra.

## 9. Fica para quem constrói

- Os timbres exatos dos sons (desde que curtos, originais e sem picos).
- Os parâmetros do Difícil (rollouts, horizonte, candidatas), desde que o portão feche.
- A semente do tutorial (procurada no simulador: as especiais nas primeiras rodadas).
- O texto final das dicas (vai para a sessão principal revisar, como o resumo das regras).
- O desenho do painel do tutorial, dos controles do replay e do fantasma do arrasto, dentro da direção "A Peleja do Coringa".
