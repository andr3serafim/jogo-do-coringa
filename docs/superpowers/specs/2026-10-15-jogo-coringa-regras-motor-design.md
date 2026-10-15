# Jogo do Coringa — Regras v2 + Motor + Simulador (Sub-projeto 1)

- **Data:** 2026-10-15
- **Status:** design aprovado em conversa; aguardando revisão desta spec
- **Origem:** regras originais em `JOGO DO CORINGA 2.0.txt` (criado pelo autor quando mais novo)

---

## 0. Contexto e escopo

### 0.1 Objetivo do produto

Versão web multiplayer online do Jogo do Coringa, jogo de cartas 1v1 com baralho comum. Público: **amigos, em salas privadas por link** — sem contas, ranking ou matchmaking. Meta de qualidade: alta (jogo polido, animado, jogável no celular).

### 0.2 Decomposição em sub-projetos

Cada sub-projeto tem seu próprio ciclo spec → plano → implementação.

| # | Sub-projeto | Entrega |
|---|---|---|
| **1** | **Regras v2 + Motor + Simulador** (esta spec) | Regras fechadas; motor TS puro e testado; simulador com bots; jogo no terminal para playtest |
| 2 | Servidor multiplayer | Durable Object por sala, link de convite, apelido + token de reconexão, timers, protocolo, deploy |
| 3 | Interface | Mesa, cartas, animações, mobile, pt-BR |
| 4 | Polimento | Tutorial, jogar solo contra bot, sons, revanche, histórico |

### 0.3 Stack (decidida para todos os sub-projetos)

- **Monorepo pnpm** em TypeScript.
- **Servidor:** Cloudflare Workers + Durable Objects (1 sala = 1 objeto; WebSocket Hibernation; alarmes para timers).
- **Web:** React + Vite + Tailwind + Motion.
- **Motor:** pacote TS puro, compartilhado entre servidor (autoridade) e web (dicas de UI).

Alternativas descartadas: Node + Colyseus (custo de servidor; sincronização de estado briga com informação oculta por jogador) e Supabase (sem processo vivo por sala — timers e janela de reação viram gambiarra).

---

## 1. Regras v2

Legenda das marcações: **[O]** original · **[I]** interpretação aprovada · **[M]** mudança aprovada · **[P]** proposta feita nesta spec — **aguardando confirmação**.

### 1.0 Decisões novas para confirmar ([P])

Surgiram ao fechar casos de borda durante a escrita; não foram discutidas em conversa.

1. **Reflect e a fila:** o dono do Reflect também perde a 1ª carta de Defesa quando o Reflect dispara (regra uniforme: todo ataque remove as duas cartas).
2. **K contra dano refletido:** o K do atacante absorve o dano refletido; atacante sob Defesa Absoluta leva 0 e não perde os Q.
3. **A contra Reflect:** o Ás não pode mirar as cartas de um Reflect ativo (ele só cai pelas contra-jogadas próprias).
4. **Defesa Absoluta contra Sacrifício:** a Defesa Absoluta também bloqueia Sacrifício.
5. **Ataque Absoluto contra Reflect:** o Reflect intercepta tudo — os K do dono do Reflect não quebram; o ×5 volta para o atacante.
6. **Um Reflect por vez:** máximo de 1 Reflect ativo por jogador; Reflect que expira sem disparar vai para o cemitério.
7. **Dano refletido conta** como dano causado pelo dono do Reflect (iniciativa e anti-travamento).
8. **Distribuição:** cartas dadas uma a uma, alternando, começando por quem tem a iniciativa.
9. **Monte e cemitério vazios:** a compra para (o jogador recebe menos cartas).
10. **Quadra refeita:** se uma quadra se desfaz e se forma de novo, gera nova Ressurreição.
11. **Timeout no Equipar:** com as duas fileiras do mesmo tamanho, a carta vai para a Defesa.

### 1.1 Componentes

- **Baralho [I]:** 2 baralhos franceses, retirando 2 de cada figura. Total **96 cartas**:
  - 72 numéricas: valores 2 a 10, **8 cópias de cada valor**;
  - 6 **J**, 6 **Q**, 6 **K**, 6 **A**.
  - Naipes são apenas visuais.
- **Coringas [I]:** 2 coringas são os **avatares** dos jogadores (fora do monte); os outros 2 não são usados.
- **Monte** único compartilhado. **Cemitério** único compartilhado, público (face para cima).
- **Vida:** **100** por jogador **[M]** (original: 1000 — partidas longas demais com cartas 2–10). Valor final calibrado pelo simulador.

### 1.2 Zonas de cada jogador

| Zona | Conteúdo | Limite | Visibilidade |
|---|---|---|---|
| **Coringa** | vida + **Guarda** (cartas K) | sem limite (4+ = Exódia) | pública |
| **Fileira de Ataque** | fila de numéricas | **7** **[M]** (ajustável) | pública |
| **Buffs de Ataque** | cartas J | 4 **[O]** | pública |
| **Fileira de Defesa** | fila de numéricas | **7** **[M]** (ajustável) | pública |
| **Buffs de Defesa** | cartas Q | 4 **[O]** | pública |
| **Mão** | **somente especiais** (J, Q, K, A) **[I]** | sem limite | oculta (oponente vê só a quantidade) |

- Buffs ficam em espaço próprio, **fora da fila** — não são removidos pelo consumo da fila **[M]**.
- As fileiras são **filas**: cartas entram pelo fim; a "1ª carta" é a da frente (a mais antiga).

### 1.3 Preparação e ciclo de rodadas

- O servidor embaralha o monte (semente secreta) e sorteia quem tem a **iniciativa** inicial **[O: "qualquer método"]**.
- Ciclo **[O]**: `Equipar → Equipar → Ataque → Equipar → Ataque → Equipar → Ataque → …`
- O contador de **rodadas** incrementa a cada rodada (de Equipar ou de Ataque).

### 1.4 Rodada de Equipar

1. Cada jogador recebe **4 cartas**, distribuídas alternadamente uma a uma, começando por quem tem a iniciativa **[P]**.
2. **Especiais** (J, Q, K, A) vão para a **mão**.
3. **Numéricas vão obrigatoriamente para o campo [I]**, **na ordem em que foram compradas** — o jogador **não organiza** a ordem **[O]**. Para cada numérica ele escolhe apenas o destino:
   - Fileira de Ataque ou de Defesa (só pode escolher uma fileira que não esteja cheia);
   - se **as duas estiverem cheias** **[O]**: substituir a **última carta** (a do fim da fila) de qualquer fileira — a carta antiga vai para o cemitério — **ou** descartar a nova no cemitério **[I]**.
4. Os dois jogadores montam **ao mesmo tempo, em segredo**; o resultado é revelado junto quando ambos confirmam (ou o tempo acaba) **[M]**.
5. Especiais **não** podem ser jogados na rodada de Equipar **[O]**.
6. **Monte vazio [O]:** ao precisar comprar com o monte vazio, o **cemitério inteiro é embaralhado e vira o novo monte**. Se monte e cemitério estiverem vazios, a compra para (o jogador recebe menos cartas) **[P]**.
7. Após a revelação, verificam-se as quadras (Fallen is Back, §1.8).

### 1.5 Rodada de Ataque

1. Joga primeiro quem tem a iniciativa; depois, o outro. Cada um tem **um turno de ataque**.
2. **Fase principal do turno** — em qualquer ordem e quantidade, o jogador pode:
   - jogar **J** (Buff de Ataque) ou **Q** (Buff de Defesa), respeitando o limite de 4;
   - jogar **K** — um ou vários em uma única jogada **[M]** → abre **janela de reação** do oponente (§1.7);
   - usar **A** (Armadilha) — §1.6;
   - fazer **Sacrifício** — §1.6;
   - lançar **Reflect** (K+J+Q da mão) → abre janela de reação do oponente — §1.6;
   - **proteger-se de um Reflect** do oponente sacrificando J+Q+K do próprio campo — §1.6;
   - usar uma **Ressurreição** disponível — §1.8.
3. **Encerramento do turno:**
   - se a Fileira de Ataque tiver cartas, o jogador **declara o ataque** (obrigatório) → janela de reação do oponente → resolução do dano (§1.9);
   - se estiver vazia, o turno termina sem ataque e **nenhuma carta é removida**.
4. **Ao fim de cada turno de ataque** (com ou sem ataque), expiram os efeitos do **outro** jogador que duravam "até o fim do próximo turno de ataque do oponente": Reflect não disparado vai para o cemitério; Defesa Absoluta termina e 1 Q vai para o cemitério (§1.8).
5. Ao fim da rodada de Ataque, define-se a iniciativa (§1.10) e atualiza-se o anti-travamento (§1.11).

### 1.6 Cartas especiais

**J — Buff de Ataque [O]**
- Vai para os Buffs de Ataque. Multiplicador do ataque = **1 + nº de J** (1 J = 2×, 2 J = 3×, 3 J = 4×) — acúmulo linear, não exponencial **[O]**.
- Permanece até ser destruído (A, Sacrifício, Reflect) ou consumido (Ataque Absoluto).

**Q — Buff de Defesa [O]**
- Mesma lógica do J, aplicada à defesa: multiplicador = **1 + nº de Q**.

**K — Guarda do Coringa [M]**
- Vai para a Guarda. Quando um ataque causaria dano (> 0) ao Coringa, **1 K absorve todo o dano e quebra** (vai para o cemitério; quebra o K mais antigo).
- Se o dano líquido for 0, nenhum K é consumido.
- Absorve também dano refletido (Reflect) **[P]** — "bloqueia qualquer dano" **[O]**.
- Podem ser jogados **vários K por turno** **[M aprovado]**; cada jogada de K abre a janela de reação do oponente.

**A — Armadilha [M]**
- **Destrói 1 J, Q ou K** do campo do oponente (buff ou guarda) → cemitério.
- Pode ser usado na **fase principal do seu turno** ou na **janela de reação** quando o oponente **declara ataque** ou **joga K**.
- **Não** pode mirar as cartas de um Reflect ativo **[P]** (o Reflect tem contra-jogadas próprias).
- **Não** pode mirar um jogador sob Defesa Absoluta **[O]**.

**Sacrifício (regra nova do autor) [M]**
- Na **fase principal do seu turno** (nunca como reação), descarte um **J** da mão para destruir 1 **J** do oponente, ou um **Q** da mão para destruir 1 **Q** do oponente. Ambos vão para o cemitério.
- **Não** funciona contra jogador sob Defesa Absoluta **[P]**.

**Reflect — K + J + Q jogados juntos da mão [O, refinado]**
- Lançado na fase principal do seu turno. Fica **ativo até o fim do próximo turno de ataque do oponente**. Máximo de 1 Reflect ativo por jogador **[P]**.
- **Se o oponente atacar enquanto o Reflect estiver ativo:**
  1. Todos os **Q** do atacante quebram (cemitério) **[O]**;
  2. o atacante recebe **dano refletido = max(0, ATK_atacante − ⌊DEF_base_atacante / 2⌋)** **[O]**, onde ATK é o ataque completo (com multiplicador de J) e DEF_base é a soma da Defesa do atacante + bônus de quadra, **sem multiplicador**;
  3. o defensor (dono do Reflect) recebe **0**; nenhum efeito do ataque se aplica a ele (nem quebra de K por Ataque Absoluto) **[P]**;
  4. remoção de cartas da fila ocorre normalmente (§1.9 passo 8) — inclusive a 1ª da Defesa do dono do Reflect **[P]**;
  5. as 3 cartas do Reflect vão para o cemitério.
- O dano refletido pode ser absorvido por um **K** do atacante; contra atacante sob **Defesa Absoluta** o dano é 0 e seus Q não quebram **[P]**.
- O dano refletido **conta como dano causado pelo dono do Reflect** para iniciativa e anti-travamento **[P]**.
- Se o oponente não atacar (Fileira de Ataque vazia), o Reflect expira ao fim do turno dele e vai para o cemitério **[P]**.
- **Contra-jogadas:**
  - **Anular [O]:** na janela de reação aberta quando o Reflect é lançado, o oponente joga **K+J+Q da mão** → os dois conjuntos (6 cartas) vão para o cemitério.
  - **Proteção por sacrifício [O do autor]:** o oponente que tiver **1 J, 1 Q e 1 K equipados** pode sacrificá-los para anular o Reflect — na janela de reação do lançamento **ou** na fase principal do próprio turno, antes de declarar o ataque **[I]**. O Reflect e as 3 cartas sacrificadas vão para o cemitério.

### 1.7 Janela de reação

| O oponente… | Quem responde pode |
|---|---|
| declara ataque | usar **A** (quebrar J, Q ou K do atacante antes do dano) |
| joga K (um ou vários, inclusive o que completa a Exódia) | usar **A** (quebrar K) |
| lança Reflect | **anular** (K+J+Q da mão) ou **proteger** (sacrificar J+Q+K do campo) |

- Dentro da janela, o respondente pode fazer quantas respostas válidas quiser; a janela fecha quando ele passa ou o tempo acaba.
- **Sem cadeia [M]:** não existe resposta a uma resposta.
- **A janela sempre abre** — mesmo que o respondente não tenha resposta válida — e tem **duração mínima fixa** imposta pelo servidor **[M]**. Abrir só quando há resposta (ou fechar instantaneamente) vazaria a mão pelo tempo.

### 1.8 Combos

**Fallen is Back [O, simplificado]**
- **Quadra:** 4 ou mais numéricas **do mesmo valor na mesma fileira ao mesmo tempo** — não precisam estar seguidas **[I]** (sem organização, "seguidas" seria quase impossível).
- **Bônus [O]:** enquanto a quadra existir, a fileira soma **+ valor da carta** antes do multiplicador **[I]** (quadra de 10 → +10). Cada quadra dá bônus uma única vez, mesmo com 5+ cartas iguais. Com limite de 7 cartas cabe no máximo uma quadra por fileira; se o limite subir, cada quadra conta separadamente.
- **Ressurreição [M]:** ao formar uma quadra, o jogador ganha **1 Ressurreição**: na fase principal de um turno seu, pega **1 carta numérica** do cemitério **[O do autor: só numéricas]** e a coloca no **fim de uma fileira à escolha** (que tenha espaço).
  - Validade: enquanto a quadra existir, com **garantia mínima de 3 rodadas** após a formação **[O]**.
  - Uso único por quadra. Se a quadra se desfizer e se formar de novo depois, gera nova Ressurreição **[P]**.

**Defesa Absoluta — 4 Q nos Buffs de Defesa**
- Ativa ao colocar o 4º Q. Dura **até o fim do próximo turno de ataque do oponente** ("1 rodada") **[O]**.
- Enquanto ativa **[O]**: imune a dano, a **A**, a **Sacrifício** **[P]** e à quebra de Q do Reflect **[P]**; **nenhuma carta da Fileira de Defesa vai para o cemitério**.
- Ao terminar: **apenas 1 Q** (o mais antigo) vai para o cemitério **[O do autor]**; os outros 3 continuam (multiplicador 4×). Novo Q → nova Defesa Absoluta.

**Ataque Absoluto — 4 J nos Buffs de Ataque**
- Vale no ataque declarado com 4 J (multiplicador natural 1 + 4 = **5×**).
- **Quebra todos os K** do alvo e o dano é calculado **normalmente**: ATK − DEF **[O do autor]**.
- Após o ataque: **apenas 1 J** (o mais antigo) vai para o cemitério **[O do autor]**.
- **Absoluto contra Absoluto [I]:** se o alvo estiver sob Defesa Absoluta, os K dele quebram e o dano é a conta normal (ATK×5 − DEF×5). A fileira de Defesa dele continua protegida.
- Contra Reflect ativo: o Reflect intercepta tudo (o ×5 volta para o atacante; os K do dono do Reflect não quebram **[P]**).

**Exódia — 4 K na Guarda [O + contra-jogo M]**
- Após a janela de reação da jogada de K, se a Guarda tiver **4 ou mais K**, **o jogo acaba na hora** e quem a montou vence.
- Contra-jogo: a janela de reação permite ao oponente quebrar K com **A**. Fora isso, K quebra ao absorver dano.

### 1.9 Resolução de um ataque

Notação: `soma(fila)` = soma dos valores das numéricas; `bônus` = bônus de quadra da fileira; `nJ`, `nQ` = quantidade de buffs.

```
ATK = (soma(Ataque do atacante) + bônus) × (1 + nJ)
DEF = (soma(Defesa do defensor) + bônus) × (1 + nQ)
```

1. Janela de reação do defensor (pode usar A) — o estado resultante é o usado no cálculo.
2. Calcula ATK e DEF.
3. **Reflect ativo no defensor** → resolve como em §1.6, aplica o dano refletido ao atacante (vida ≤ 0 → fim de jogo imediato) e pula para o passo 8.
4. **Ataque Absoluto** (nJ = 4) → todos os K do defensor quebram.
5. **Defesa Absoluta no defensor:** sem Ataque Absoluto → dano = 0; com Ataque Absoluto → `dano = max(0, ATK − DEF)`. Segue para o passo 7.
6. **Caso geral** (sem Reflect e sem Defesa Absoluta): `líquido = max(0, ATK − DEF)`. Se `líquido > 0` e o defensor ainda tiver K → 1 K quebra e dano = 0; senão dano = líquido.
7. Aplica o dano à vida. **Vida ≤ 0 → fim de jogo imediato.**
8. **Remoção da fila [O]:** a 1ª carta da Fileira de Ataque do atacante e a 1ª da Fileira de Defesa do defensor vão para o cemitério (a do defensor não sai se ele estiver sob Defesa Absoluta). Fileira de Defesa vazia → nada sai dela.
9. Se houve Ataque Absoluto → 1 J do atacante vai para o cemitério.
10. Reavalia quadras (bônus e Ressurreições).

### 1.10 Iniciativa

- Ao fim de cada rodada de Ataque, quem **causou mais dano** naquela rodada (incluindo dano refletido) fica com a iniciativa da próxima **[O]**.
- Empate (inclusive 0 × 0) → a iniciativa não muda **[I]**.

### 1.11 Fim de jogo

- **Vida ≤ 0** → perde na hora, mesmo no meio da rodada **[O]**.
- **Exódia** → vence na hora (após a janela de reação) **[O]**.
- **Anti-travamento [M]:** **3 rodadas de Ataque seguidas** sem dano para ninguém → vence quem tiver mais vida; vida igual → **empate**.
- **W.O.** (aplicado pelo servidor): desconexão sem retorno em 60 s ou 3 turnos estourados seguidos.
- Terminação garantida: não existe cura; todo dano reduz a vida em ≥ 1; o anti-travamento limita sequências sem dano.

### 1.12 Tempo (aplicado pelo servidor; valores iniciais)

| Momento | Tempo | Se estourar |
|---|---|---|
| Equipar (simultâneo) | 40 s | cada numérica restante vai para a fileira com menos cartas (empate → Defesa **[P]**); ambas cheias → cemitério |
| Turno de ataque | 30 s | declara o ataque sem jogar mais especiais (ou passa, se Ataque vazio) |
| Janela de reação | 8 s (mínimo 2 s) | passa |
| Reconexão | 60 s | W.O. |

### 1.13 Exemplos

1. **Dano simples.** Ataque [3, 7, 9] + 1 J → 19 × 2 = **38**. Defesa do alvo [5, 8], sem Q → **13**. Dano **25**. Saem o 3 do atacante e o 5 do defensor.
2. **Guarda.** ATK 30 contra DEF 20 → líquido 10. O defensor tem 2 K → 1 K quebra, dano 0.
3. **Reflect.** O oponente ataca com [6, 8, 9] + 1 J = **46** contra um Reflect ativo. A Defesa dele é [4, 10] com 1 Q → o Q quebra; ⌊14 / 2⌋ = 7. **Ele leva 39**; o dono do Reflect leva 0.
4. **Quadra.** Defesa [10, 3, 10, 10, 10] → 43 + bônus 10 = 53; com 1 Q → **106**.
5. **Absoluto × Absoluto.** Ataque [5, 6, 7] com 4 J → 18 × 5 = **90**. Defesa [8, 9] com 4 Q → 17 × 5 = **85**. Os K do defensor quebram; dano **5**; o defensor não perde carta de Defesa; o atacante perde o 5 e 1 J. Ao fim do turno, a Defesa Absoluta expira e 1 Q do defensor vai para o cemitério.

### 1.14 Original × v2 (resumo das mudanças)

| Tema | Original | v2 |
|---|---|---|
| Vida | 1000 | 100 (calibrável) |
| Fileiras | sem limite | 7 numéricas cada (calibrável) |
| Equipar | — | simultâneo e secreto; numéricas obrigatórias, na ordem de compra |
| K | bloqueia todo dano enquanto equipado | absorve 1 ataque com dano e quebra |
| A | elimina um especial | armadilha: também como reação a ataque ou jogada de K |
| Sacrifício | — | J/Q da mão abate J/Q do oponente (só no seu turno) |
| Reflect | "em aprovação" | regras fechadas + proteção por sacrifício de J+Q+K do campo |
| Fallen is Back | qualquer carta do cemitério | só numéricas; "juntas" = mesma fileira |
| Absolutos | sem custo definido | consomem 1 Q / 1 J ao terminar |
| Exódia | instantânea | instantânea após janela de reação (A) |
| Fim do monte | — | cemitério embaralhado vira novo monte |
| Travamento | — | 3 rodadas sem dano → mais vida vence |

---

## 2. Motor (`packages/engine`)

### 2.1 Princípios

- **TypeScript puro**, sem dependências de runtime, sem I/O e **sem relógio**.
- **Determinístico:** mesma semente + mesma sequência de ações = mesmo estado. PRNG com semente guardada no estado (embaralhamentos iniciais e reembaralhamentos do cemitério).
- **Imutável na interface:** cada ação retorna um novo estado.
- Funciona igual no Worker (servidor), no navegador e no Node (simulador/CLI).

### 2.2 API pública

```ts
createGame(config: RulesConfig, seed: string, players: [PlayerId, PlayerId]): GameState
applyAction(state: GameState, player: PlayerId | 'system', action: Action)
  : { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: RuleError }
viewFor(state: GameState, player: PlayerId): PlayerView
viewEvents(events: GameEvent[], player: PlayerId): GameEvent[]  // redige informação oculta
legalActions(view: PlayerView): Action[]
```

- `legalActions` opera sobre a **PlayerView** (mão própria + campo público bastam), o que permite usá-la no navegador e nos bots sem acesso ao estado completo.
- Erros são valores (`RuleError` com código), nunca exceções, para entradas inválidas de jogadores.

### 2.3 Estado e fases

- **Cartas** têm id único (ex.: `b1-copas-7`), valor e naipe.
- **Fases** (máquina de estados explícita):
  - `EQUIP` — aguardando as submissões dos dois jogadores;
  - `ATTACK_MAIN(jogador)` — fase principal do turno;
  - `REACTION(respondente, gatilho)` — gatilho: `ATTACK` | `K_PLAYED` | `REFLECT_PLAYED`;
  - `GAME_OVER(resultado)`.
- Além das zonas: vida, iniciativa, contador de rodadas, contador do anti-travamento, dano por jogador na rodada atual, efeitos com duração (Reflect, Defesa Absoluta, Ressurreições com rodada de expiração).

### 2.4 Ações

| Ação | Quando |
|---|---|
| `EQUIP { destinations[] }` — um destino por numérica recebida, na ordem de compra: `ATK` \| `DEF` \| `REPLACE_LAST_ATK` \| `REPLACE_LAST_DEF` \| `DISCARD` | `EQUIP` |
| `PLAY_J`, `PLAY_Q { cardId }` | `ATTACK_MAIN` |
| `PLAY_K { cardIds[] }` | `ATTACK_MAIN` |
| `TRAP { cardId, targetId }` | `ATTACK_MAIN`, `REACTION` (gatilho ATTACK ou K_PLAYED) |
| `SACRIFICE { cardId, targetId }` | `ATTACK_MAIN` |
| `REFLECT { kId, jId, qId }` | `ATTACK_MAIN` |
| `CANCEL_REFLECT { kId, jId, qId }` (da mão) | `REACTION` (gatilho REFLECT_PLAYED) |
| `PROTECT_FROM_REFLECT { jId, qId, kId }` (do campo) | `ATTACK_MAIN`, `REACTION` (gatilho REFLECT_PLAYED) |
| `RESURRECT { cardId, row }` | `ATTACK_MAIN` |
| `DECLARE_ATTACK` / `END_TURN` (Ataque vazio) | `ATTACK_MAIN` |
| `PASS` | `REACTION` |
| `TIMEOUT` (`system`) | qualquer fase com prazo |
| `FORFEIT` (`system`) | qualquer fase |

### 2.5 Eventos

Lista ordenada por ação, base para animações e histórico: `CardsDealt`, `DeckReshuffled`, `CardsPlaced`, `CardReplaced`, `BuffPlayed`, `GuardPlayed`, `TrapUsed`, `Sacrificed`, `ReflectPlayed`, `ReflectCanceled`, `ReflectProtected`, `ReflectTriggered`, `ReactionWindowOpened/Closed`, `AttackDeclared`, `DamageDealt`, `GuardBroken`, `CardsRemovedFromRow`, `QuadFormed`, `QuadBroken`, `Resurrected`, `AbsoluteDefenseStarted/Ended`, `AbsoluteAttack`, `Exodia`, `InitiativeChanged`, `RoundStarted`, `GameOver`.

### 2.6 Informação oculta

- `viewFor` entrega: mão própria completa; do oponente, **só a quantidade** de cartas na mão; monte só como **quantidade**; submissão de Equipar do oponente só como "pronto/montando" até a revelação.
- `viewEvents` redige eventos: o oponente vê "comprou 1 carta", nunca qual especial.
- A semente e a ordem do monte **nunca** saem do servidor.

### 2.7 Configuração

```ts
RulesConfig {
  hp: 100, rowLimit: 7, buffLimit: 4, cardsPerEquip: 4,
  antiStallRounds: 3, exodiaGuard: 4, resurrectMinRounds: 3,
  deck: { numericCopies: 8, faceCopies: 6 }
}
```

Timers (§1.12) **não** fazem parte do motor: ficam numa `TimerConfig` usada pelo servidor (sub-projeto 2), que injeta `TIMEOUT` via alarmes do Durable Object e impõe a duração mínima da janela de reação.

---

## 3. Simulador (`packages/sim`)

- **Bots:** `random` (qualquer ação legal) e `greedy` (heurísticas: destino da numérica que maximiza ATK−DEF esperado; A na maior ameaça; Reflect quando o ATK do oponente é alto; Sacrifício quando o buff do oponente vale mais que o próprio).
- Interface: `Bot = (view: PlayerView, legal: Action[], rng) => Action`.
- **Runner:** N partidas por configuração com sementes reprodutíveis; varredura de parâmetros (`hp`, `rowLimit`, composição do baralho); saída em tabela no terminal + JSON em `packages/sim/reports/`.
- **Métricas e metas iniciais:**

| Métrica | Meta |
|---|---|
| Duração | 8–14 rodadas de Ataque (~10–15 min) |
| Vitória de quem começa com a iniciativa | 45–55% |
| Exódia | 1–3% das partidas |
| Fallen is Back | aparece em 10–25% das partidas |
| Fim por anti-travamento | < 5% |
| Partidas que terminam | 100% |

Bots não jogam como humanos: as metas guiam a calibração inicial; o ajuste fino vem do playtest.

## 4. Jogo no terminal (`pnpm play`)

- Partida contra o bot `greedy` no terminal, sem timers.
- Mostra vida, guarda, buffs, fileiras, quantidade de cartas na mão do oponente, monte e cemitério; lista as ações legais numeradas; janelas de reação aparecem como prompts.
- Objetivo: validar o "feeling" das regras antes da interface.

## 5. Testes e qualidade

- **Vitest.** Cada regra desta spec tem pelo menos um **teste de cenário**, montado com um builder (ex.: `scenario().attack([3,7,9]).buffsJ(1).vs().defense([5,8])` → espera dano 25 e remoções corretas). Os exemplos de §1.13 viram testes literais.
- **Invariantes (property-based, fast-check)** sobre partidas aleatórias:
  - as 96 cartas estão sempre contabilizadas (monte + mãos + campo + cemitério);
  - a vida nunca aumenta;
  - `viewFor`/`viewEvents` nunca expõem mão do oponente, ordem do monte nem semente;
  - determinismo (mesma semente + ações → mesmo estado);
  - toda partida termina.
- **Comando único `pnpm check`:** lint + typecheck + testes com cobertura (meta ≥ 90% de linhas e branches no motor).

## 6. Critérios de pronto (sub-projeto 1)

1. Motor implementa toda a §1; `pnpm check` passa.
2. Relatório do simulador dentro das metas de §3, ou desvios explicados e parâmetros ajustados (registrados nesta spec).
3. O autor jogou partidas no terminal e aprovou o "feeling".

## 7. Fora de escopo (próximas specs) e ideias futuras

- **Sub-projeto 2 — Servidor:** Durable Object por sala, criação de sala e link, apelido + token de reconexão, protocolo WebSocket validado, timers, W.O., deploy.
- **Sub-projeto 3 — Interface:** mesa, cartas e animações dirigidas por eventos, mobile, pt-BR.
- **Sub-projeto 4 — Polimento:** tutorial interativo, jogar solo contra bot, sons, revanche, histórico/replay.
- **Ideias para avaliar depois:** coringas extras como carta selvagem; efeitos por naipe; espectadores.
