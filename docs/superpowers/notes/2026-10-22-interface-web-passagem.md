# Interface web → polimento: passagem

Resumo versionado da passagem do sub-projeto 3 (interface web, mesclada na `main` em `4b0b55c`) para o sub-projeto 4
(polimento). As notas originais ficaram fora do git, na pasta da sessão principal. Aqui ficam os follow-ups, os itens menores
adiados que ainda valem e as decisões da execução que continuam de pé.

## 1. Follow-ups (saídos da revisão final da `feat/web`)

Nenhum bloqueou o merge. Os dois primeiros vêm antes do playtest do autor no PC (Fase A do polimento).

1. **PC de pouca altura** (1366×657, 1440×800, 1536×730). Na sua vez, o foco vai para o painel de baixo, a mesa rola, e a vida
   e o nome do oponente e o botão do menu saem da vista. Medido em `/treino?semente=e2e-1`:
   - 1366×657: a vida fica em −47..9 no Equipar, −35..21 no Ataque e cortada na reação; o menu chega a y = −127;
   - 1440×800: sobram 52 px, e o menu fica em y = −30;
   - 1536×730: sobram 93 px, e o menu fica em y = −70.

   De quem é a vez, o relógio, a prévia, a mão e o botão principal já ficam à vista. Pede um E2E a 1366×657 que confira a vida
   do oponente e o menu à vista na sua vez (Equipar, Ataque e reação).
2. **A faixa pela `FlashLock`** (§10.4). Um `catchUp` que chega logo depois de uma cena ao vivo (Exódia, Absolutos, Reflect)
   faz a faixa subir no instante em que a cortina desce: 4 trocas em ~850 ms. É raro e o efeito é fraco, mas fere a contagem
   estrita. Conserto mínimo: a faixa ganha estado próprio no `useBeatPlayer` e sobe e desce por `lock.toggle`; recusada, segura
   com `lock.nextAllowed`. Teste: `catchUp` de 100 a 900 ms depois de um `AbsoluteAttack` ao vivo, com `expectFlashSafe` sobre a
   faixa, a cortina e a inversão.
3. **Celular baixo (360×640):** a mão e a barra ocupam ~400 px, e o seu campo fica abaixo da dobra na hora de atacar (a prévia
   do dano está no botão).
4. **Marcas "novo" a mais** (nunca escondem, só marcam demais): `resync` sem eventos; carta trocada pelo seu próprio Equipar;
   o Q da Defesa Absoluta; o J do Ataque Absoluto contra um Reflect (o motor não emite `AbsoluteAttack` nesse ramo).
5. **Contador do histórico aceso:** abrir a gaveta no celular devia contar como "visto" (§10.5, "quando você toca, foca…").
6. **Motor:** exportar "Ataque Absoluto armado" por lado, no lugar da conta da UI (`PlayerField.tsx`, `buffs >= buffLimit`) e
   do `isAbsoluteAttack` morto em `combat.ts`.
7. **Firefox e Safari:** conferir o `pointerdown` que pula as batidas sem virar clique (o E2E roda só no Chromium).

## 2. Itens menores adiados que ainda valem

Cada um ficou de fora por ser pequeno ou de baixo risco; o motivo vem quando não é óbvio.

**Motor e simulador**
- `equip.ts`: comentário de `autoDestinations` fala só do estouro; sem teste direto de que `timeoutEquip` passa os argumentos
  certos (as partidas de referência cobrem).
- `combat.ts`: `isAbsoluteAttack` morto (a regra mora em `preview.ts`); `throw` só para estreitar tipo; ciclo de import
  `combat.ts` ↔ `preview.ts` (carrega nas duas ordens).

**Protocolo e servidor**
- Linha longa do `act` em `schemas.ts`; teste do `wake` em CONNECTING não afirma ausência de ping; `if (!ws) return` de
  `#dropDeadSocket` sem cobertura.
- Guarda do ESLint não pega import dinâmico, `fs` sem prefixo nem import relativo para um irmão não guardado.
- `buildWeb`/abort do deploy sem teste unitário; o placeholder do `dist` não impede um `wrangler deploy` manual.

**Web: modelo**
- `storage.ts`: um `remove` que lança depois da sonda faz o valor velho voltar; `available` fica fixo no resultado da sonda.
- `clock.ts`: `expired` usa `=== 0` (`<= 0` seria mais robusto).
- `session.ts`: timers da ordem e do Equipar não reconferem a época ao disparar (seguro pelas invariantes de cancelamento); ação
  automática perdida se houver jogada pendente na hora do disparo; aviso `autoPass` fica mesmo se o passe não sair.
- `local-room.ts`: `#botPlay` sem reconferência de `actingPlayers` (seguro com um timer só); `phaseKey` copiado do servidor sem
  teste de deriva.
- `plays.ts`: `group.targets!`; `equip.ts`: `pop()!` que depende de `chosen` vir de `nextDestinations`.

**Web: interface**
- Lobby sem saída durante a reconexão (Sair desligado); "Link copiado" não é reanunciado num segundo clique; textos soltos no
  `Lobby.tsx` fora de `text.ts`.
- `RoomGate.tsx`: o efeito depende de `reload` (um pai com arrow inline recriaria a sessão); "Usar aqui" sem feedback de
  pendência.
- `Table.tsx`: prop `banner` sem uso; `passed` calculado duas vezes (`PlayTable` e `ActionBar`); `handButton` consulta o documento
  inteiro.
- Histórico: sem cabeçalho de rodada depois de um `resync`; a ref `atEnd` só atualiza na rolagem.
- Cenas: `skip` muda de identidade a cada batida; LitRow/FxOverlay podem não reiniciar entre batidas seguidas no mesmo elemento;
  cena com movimento reduzido dura 1,5 s (a spec diz ~1 s); o painel da cena fica fora do ledger de flash (a faixa entrou nele na Fase A do polimento).
- Wrapper `.area-ferr` vazio no PC largo cria trilhas implícitas (~8–10 px); `GraveyardDialog` tem o mesmo eco de close que o
  `Modal` tinha (não atingido hoje).
- `title` verboso em toda carta; o `title` da carta de cima do cemitério não aparece ao passar o mouse (o `::after` cobre).
- "Encerrar turno Sua fileira…" sem pausa entre título e detalhe no nome acessível.
- Resumo das regras: omite que o dano absorvido por K não conta para a Pressão, a origem da iniciativa, o 5× sem Pressão e a
  exceção da Defesa Absoluta no Reflect.

**Testes e ferramentas**
- `check-fast` ignora `.css`/`.html` (o pre-push cobre); o tsconfig da web vaza tipos do Node para `src` (só o ESLint barra
  `node:*`); `index.html` sem favicon.
- Asserções fracas: `toContain('3')` em `storage.test.ts`; propriedade de cenas com piso `withScene > 0`; teste "nunca pisca"
  varre o `styles.css` inteiro; faltam testes de `timedOut` nos painéis e de `pending` na ordem.
- E2E: `expectGraveyardTarget` sem `scrollIntoViewIfNeeded`; `RowButton` não passa pelo axe no navegador; o passo do ataque
  online não tolera o turno vencer.

## 3. Decisões da execução que continuam valendo

Formato: decisão — por quê.

- Paleta e pontos de quebra só os da spec (`--color-*: initial`, `--breakpoint-*: initial`) — tokens com uma fonte de verdade.
- `INVERT_COOLDOWN_MS = 2000`, uma fonte de verdade para a linha do tempo e a trava global do `Stage` — mais rígido que a §10.4.
- Inversão começa 150 ms depois do início da cena e dura 600 ms; batidas contíguas — ritmo dentro da §4.2.
- O histórico acumula na `Session` (`history.ts` é o redutor puro) e zera pelo `gameNo`; as linhas "novas" só apagam na próxima
  jogada voluntária.
- Os botões próprios (Reflect, Anular, Proteger, Ressuscitar) somem enquanto há carta escolhida — modo de foco na escolha.
- Motion com `domMax` por `import()` — o `layoutId` não existe no `domAnimation`, e o orçamento de 200 KB segue.
- O `state` com que a mesa abre não toca batida.
- Treino: sem passe automático nem Equipar antecipado (§2.6); o `LocalRoom` envia o Equipar vazio de quem não recebeu numéricas;
  a confirmação automática da ordem (3 s) continua; o bot nunca pede revanche.
- Avisos `rate`/`rule` somem em 4 s; `Session.dispose()` só desinscreve e limpa timers (quem cria a conexão a fecha).
- "Nova sala" fecha a conexão e volta ao início mantendo o assento salvo.
- E2E online com semente fixa: `newSeed(gameNo)` no núcleo, `E2E_SEED` vazio no `wrangler.jsonc` (um teste barra valor), só o
  Playwright a liga; tokens e códigos de sala continuam no crypto.
- E2E só no Chromium; o workflow roda também em push de `feat/**` (sem `gh`, não há PR).
- Nome acessível de carta, botão de duas linhas e cemitério contém o texto visível (axe sem exceção, WCAG 2.5.3).
- "Proteger-se do Reflect" usa as cartas de campo canônicas do motor (posição 0), mesmo que seja um Selvagem.
- O trailer `Co-Authored-By` nomeia o modelo que escreveu o commit.

## 4. Só do autor

1. `wrangler login`, depois `pnpm deploy:server` (o deploy constrói a web antes).
2. Jogar com um amigo pelo link publicado, um no celular e outro no PC, com queda e volta e com revanche.
3. Proteção da `main` no GitHub, com `check` e `e2e` como checks exigidos.
4. Conferir se o plano Free da Cloudflare aceita o binding `ratelimits`.
