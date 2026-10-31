# Jogo do Coringa — Regras v2 + Motor + Simulador (Sub-projeto 1)

- **Data:** 2026-10-15
- **Status:** **aprovada** pelo autor em 2026-10-15
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

Legenda das marcações: **[O]** original · **[I]** interpretação aprovada · **[M]** mudança aprovada · **[N]** regra nova aprovada (com chave liga/desliga na config, §2.7).

### 1.0 Pendências resolvidas

Todas as decisões abaixo foram confirmadas pelo autor e estão marcadas como **[I]** no texto.

1. **Reflect × K (leitura do item 2):** quem é refletido tem **todos os K quebrados** e **leva o dano refletido inteiro** — o K não absorve.
2. **Reflect × atacante sob Defesa Absoluta:** ~~os K do atacante quebram~~ — **substituído pelo autor em 2026-10-30 (F2 do sub-projeto 5):** o Reflect contra um atacante sob Defesa Absoluta é anulado. **[I], a confirmar:** ele segura o golpe (o dono leva 0), mas não devolve dano e não quebra Q nem K do atacante.
3. **Rodada sem dano × K:** ~~dano absorvido por K não conta como dano~~ — sem efeito desde a E1 do sub-projeto 5: a Pressão da mesa e o anti-travamento, que contavam rodadas sem dano, saíram (§1.11). O bot `turtle` continua jogando K.
4. ~~**Pressão da mesa fixa na rodada.**~~ Removido com a Pressão da mesa (sub-projeto 5).
5. ~~**Defesa Absoluta × proteção contra Reflect (decidido em 2026-10-16).**~~ Sem efeito: a Proteção por sacrifício saiu do jogo com o Reflect reativo (F2 do sub-projeto 5, autor em 2026-10-30).

### 1.1 Componentes

- **Baralho [I]:** 2 baralhos franceses, retirando 2 de cada figura J, Q e K. Total **98 cartas**:
  - 72 numéricas: valores 2 a 10, **8 cópias de cada valor**;
  - 6 **J**, 6 **Q**, 6 **K** e os **8 A** dos dois baralhos (sub-projeto 5, pedido do autor: antes eram 6; `deck.aceCopies`);
  - naipes são apenas visuais.
- **Coringas:** 2 coringas são os **avatares** dos jogadores (fora do monte) **[I]**. Os outros 2 entram no monte como **Coringas Selvagens** (§1.6) **[N]** → **100 cartas** no monte com a regra ligada.
- **Monte** único compartilhado. **Cemitério** único compartilhado, público (face para cima).
- **Vida:** **500** por jogador, e a sala escolhe entre 300, 500 e 800 na criação (o treino também) **[M]** (original: 1000 — partidas longas demais com cartas 2–10). Era 300, calibrado em 2026-10-16 (mediana de 9 rodadas de Ataque; com 100, eram 4); o autor pediu 500 ajustável no sub-projeto 5.

### 1.2 Zonas de cada jogador

| Zona | Conteúdo | Limite | Visibilidade |
|---|---|---|---|
| **Coringa** | vida + **Guarda** (cartas K) | sem limite (4+ = Exódia) | pública |
| **Fileira de Ataque** | fila de numéricas | **8** **[M]** (ajustável; era 7 até o sub-projeto 5) | pública |
| **Buffs de Ataque** | cartas J | 4 **[O]** | pública |
| **Fileira de Defesa** | fila de numéricas | **8** **[M]** (ajustável; era 7 até o sub-projeto 5) | pública |
| **Buffs de Defesa** | cartas Q | 4 **[O]** | pública |
| **Mão** | **somente especiais** (J, Q, K, A, Selvagem) **[I]** | 4 (a que passaria vai ao cemitério, §1.4) | oculta (oponente vê só a quantidade) |

- Buffs ficam em espaço próprio, **fora da fila** — não são removidos pelo consumo da fila **[M]**.
- As fileiras são **filas**: cartas entram pelo fim; a "1ª carta" é a da frente (a mais antiga).

### 1.3 Preparação e ciclo de rodadas

- O servidor embaralha o monte (semente secreta) e sorteia quem tem a **iniciativa** inicial **[O: "qualquer método"]**.
- Ciclo **[O]**: `Equipar → Equipar → Ataque → Equipar → Ataque → Equipar → Ataque → …`
- O contador de **rodadas** incrementa a cada rodada (de Equipar ou de Ataque).

### 1.4 Rodada de Equipar

1. Cada jogador recebe **4 cartas**, distribuídas alternadamente uma a uma, começando por quem tem a iniciativa **[I]**.
2. **Especiais** (J, Q, K, A, Selvagem) vão para a **mão**.
   - **Limite de especiais na mão [autor, 2026-10-30; forma escolhida em 2026-10-31; E3 do sub-projeto 5]:** no máximo **4**
     (o motivo dele: sem limite, o jogador junta K até a Exódia). A forma é a **BURN**: a especial comprada que passaria do limite
     vai **direto ao cemitério**, sem decisão nem tela a mais. O motor guarda as duas outras formas medidas, fora do padrão:
     **CHOOSE** (o jogador descarta o excesso antes de confirmar o Equipar; no tempo esgotado saem as compradas por último **[I]**)
     e **FEWER** (com mais especiais que o limite, ele compra `4 − excesso` cartas, no mínimo 0 **[I]**) (`specialLimit` na
     config, §2.7).
3. **Numéricas vão obrigatoriamente para o campo [I]**. **Equipar livre (sub-projeto 5, E2; antes: na ordem de compra, sem o jogador organizar [O]):** o jogador vê todas as numéricas recebidas de uma vez e escolhe, para cada uma, o destino e a ordem em que entram (a primeira posta numa fileira fica na frente da fila). Os destinos possíveis:
   - Fileira de Ataque ou de Defesa (só pode escolher uma fileira que não esteja cheia);
   - se **as duas estiverem cheias** **[O]**: substituir a **última carta** (a do fim da fila) de qualquer fileira — a carta antiga vai para o cemitério — **ou** descartar a nova no cemitério **[I]**.
4. Os dois jogadores montam **ao mesmo tempo, em segredo**; o resultado é revelado junto quando ambos confirmam (ou o tempo acaba) **[M]**.
5. Especiais **não** podem ser jogados na rodada de Equipar **[O]**.
6. **Monte vazio [O]:** quando o monte acaba (inclusive no meio de uma distribuição), o **cemitério inteiro é embaralhado e vira o novo monte**, e a distribuição continua.
   - **A compra nunca para [I]:** numéricas nunca ficam na mão e o campo comporta no máximo 4 × 8 = 32 delas; logo, pelo menos 72 − 32 = **40 cartas** estão sempre no monte ou no cemitério — mais que as 8 de uma distribuição. A config é validada para manter essa garantia (§2.7).
7. Após a revelação, verificam-se as quadras (Fallen is Back, §1.8).

### 1.5 Rodada de Ataque

1. **Ordem [N — Escolha da iniciativa]:** no início da rodada, quem tem a iniciativa **escolhe atacar primeiro ou segundo**. (Com a regra desligada, quem tem a iniciativa joga primeiro **[O]**.) Cada jogador tem **um turno de ataque**.
2. **Fase principal do turno** — em qualquer ordem e quantidade, o jogador pode:
   - jogar **J** (Buff de Ataque) ou **Q** (Buff de Defesa), respeitando o limite de 4;
   - jogar **K** — um ou vários em uma única jogada **[M]** → abre **janela de reação** do oponente (§1.7);
   - usar **A** (Armadilha) — §1.6;
   - fazer **Sacrifício** — §1.6;
   - usar uma **Ressurreição** disponível — §1.8.
   - O **Coringa Selvagem** pode ser usado em qualquer dessas jogadas no papel de J, Q ou A (§1.6).
3. **Encerramento do turno:**
   - se a Fileira de Ataque tiver cartas, o jogador **declara o ataque** (obrigatório) → janela de reação do oponente → resolução do dano (§1.9);
   - se estiver vazia, o turno termina sem ataque e **nenhuma carta é removida**.
4. **Ao fim de cada turno de ataque**, a Defesa Absoluta do **outro** jogador termina só se houve ataque neste turno, e então 1 Q vai para o cemitério (§1.8; autor, 2026-10-30). (O Reflect não fica mais armado de um turno para outro: F2 do sub-projeto 5.)
5. Ao fim da rodada de Ataque, define-se a iniciativa (§1.10). (O anti-travamento, que também se atualizava aqui, saiu na E1 do sub-projeto 5, §1.11.)

### 1.6 Cartas especiais

**J — Buff de Ataque [O]**
- Vai para os Buffs de Ataque. Multiplicador do ataque = **1 + nº de J** (1 J = 2×, 2 J = 3×, 3 J = 4×) — acúmulo linear, não exponencial **[O]**. Nada mais entra nesse multiplicador (a Pressão da mesa, que somava a ele, saiu no sub-projeto 5).
- Permanece até ser destruído (A, Sacrifício, Reflect) ou consumido (Ataque Absoluto).

**Q — Buff de Defesa [O]**
- Mesma lógica do J, aplicada à defesa: multiplicador = **1 + nº de Q**.

**K — Guarda do Coringa [M]**
- Vai para a Guarda. Quando um ataque causaria dano (> 0) ao Coringa, **1 K absorve todo o dano e quebra** (vai para o cemitério; quebra o K mais antigo).
- Se o dano líquido for 0, nenhum K é consumido.
- **Não protege contra Reflect [I]:** quem é refletido tem **todos os K quebrados** e leva o dano refletido inteiro (§1.6, Reflect).
- Podem ser jogados **vários K por turno** **[M]**; cada jogada de K abre a janela de reação do oponente.
- **Cura passiva [autor, 2026-10-30; E3 do sub-projeto 5]:** com **2 K ou mais** na Guarda **[I: "2 K" = pelo menos 2]**, cada
  numérica da **própria Fileira de Defesa** que vai para o cemitério, de qualquer naipe, **cura valor × (1 + nº de Q)**. A vida
  nunca passa da inicial. Vale para a carta da frente que sai depois de um ataque (também para o dono de um Reflect), para a
  carta trocada no Equipar (`REPLACE_LAST_DEF`) **[I]** e para a que o ladrão perde na própria Defesa cheia. As cartas
  destruídas pela Devastação **não** curam. A conta dos K é feita quando a carta chega ao cemitério, depois dos K que o mesmo golpe
  quebrou **[I]**: com exatamente 2 K e um ataque absorvido, sobra 1 K e a carta não cura.

**A — Armadilha [M]**
- **Destrói 1 J, Q ou K** do campo do oponente (buff ou guarda) → cemitério.
- Pode ser usado na **fase principal do seu turno** ou na **janela de reação** quando o oponente **declara ataque** ou **joga K**.
- **Não** pode mirar as cartas de um Reflect **[I]** (o Reflect só cai por outro Reflect). Também não responde a um Reflect.
- **Não** pode mirar um jogador sob Defesa Absoluta **[O]**.

**A — Roubo [autor, 2026-10-30; sem naipe desde 2026-10-31; E3 do sub-projeto 5]**
- O Ás serve, à escolha na hora, de **Armadilha** ou de **Roubo**, de qualquer naipe. O Coringa Selvagem no papel de A também.
- Só na **fase principal do seu turno** (não abre janela de reação **[I]**). Pega **uma numérica** de qualquer fileira do oponente
  (em qualquer posição **[I]**) e a põe **no fim da fileira que o ladrão escolher**; com ela cheia, a **última** dela vai para o
  cemitério antes. O Ás vai para o cemitério. As quadras dos dois lados se refazem.
- Todo roubo, de qualquer naipe (o naipe não muda nada), tem dois efeitos, sempre pelo **valor seco** da carta roubada (sem
  buffs nem bônus de quadra):
  - **o dano:** o oponente leva dano igual ao valor. Um **K na Guarda** dele **anula** esse dano e **não quebra**. O dano do roubo
    **não conta para a iniciativa** **[I]** e **não mata**: a vida do oponente fica em no mínimo 1;
  - **a cura:** quem roubou **cura** o valor, até a vida inicial. A cura é o valor cheio mesmo quando o K anula o dano ou o "não
    mata" o corta **[I]**.
- Antes (2026-10-30), o naipe decidia: ♣ ♠ davam só o dano, ♥ ♦ só a cura. O autor tirou o efeito do naipe em 2026-10-31, e o
  naipe voltou a ser só visual (§1.1).
- A **Defesa Absoluta** do oponente **bloqueia o roubo inteiro**: nada é roubado.

**Sacrifício (regra nova do autor) [M]**
- Na **fase principal do seu turno** (nunca como reação), descarte um **J** da mão para destruir 1 **J** do oponente, ou um **Q** da mão para destruir 1 **Q** do oponente. Ambos vão para o cemitério.
- **Não** funciona contra jogador sob Defesa Absoluta, enquanto ela durar **[I]**.

**Coringa Selvagem [N]**
- Especial (vai para a mão). Ao ser jogado, assume o papel de **J, Q ou A** — **nunca K** (a Exódia não pode ser completada por sorte).
- O papel é definido pela jogada em que é usado: como buff (J/Q), Armadilha (A), Sacrifício (como J ou Q), componente J ou Q de um Reflect (também do Reflect contra Reflect).
- Em campo, vale **exatamente como a carta cujo papel assumiu**: conta para multiplicadores e Absolutos e pode ser destruído por A/Sacrifício como J ou Q.
- Ao ir para o cemitério ou voltar ao monte, volta a ser um Coringa Selvagem.

**Reflect — K + J + Q jogados juntos da mão [O, refinado; reativo desde a F2 do sub-projeto 5, autor em 2026-10-30]**
- **Só como reação** a um golpe: na janela aberta quando o oponente **declara um ataque** (e, com a F3, quando ele lança uma
  Devastação). Nunca na fase principal, e nunca fica armado: atacado → lança → o dano volta na hora → acabou. A Armadilha jogada
  antes, na mesma janela, vale.
- Lançado o Reflect, **quem foi refletido** ganha uma resposta (§1.7): passar (o golpe volta) ou responder com **outro Reflect**.
- **Se o golpe volta** (contra um ataque):
  1. todos os **Q** do atacante quebram **[O]**;
  2. todos os **K** do atacante quebram **[I]**;
  3. o atacante recebe **dano refletido = max(0, ATK_atacante − ⌊DEF_base_atacante / 2⌋)** **[O]**, onde ATK é o ataque completo (com multiplicador) e DEF_base é a soma da Defesa do atacante + bônus de quadra, **sem multiplicador**;
  4. o dono do Reflect recebe **0**; nenhum outro efeito do ataque se aplica a ele (nem quebra de K por Ataque Absoluto) **[I]**;
  5. a remoção de cartas da fila ocorre normalmente (§1.9 passo 8) — inclusive a 1ª da Defesa do dono do Reflect **[I]**;
  6. as 3 cartas do Reflect vão para o cemitério, e o turno do atacante acaba (o ataque aconteceu).
- **Atacante sob Defesa Absoluta:** o Reflect é anulado (autor, 2026-10-30). **[I], a confirmar:** segura o golpe (o dono leva 0),
  mas não devolve dano e não quebra Q nem K do atacante.
- O dano refletido **conta como dano causado pelo dono do Reflect** para a iniciativa **[I]**.
- **Reflect contra Reflect [autor, 2026-10-30; é o Anular de antes]:** quem é refletido responde com **K+J+Q da mão**. Os dois se
  anulam, as 6 cartas vão para o cemitério e **o atacante passa o turno**: o golpe não acontece **[I: nenhuma carta sai das
  fileiras, ninguém leva dano e a Defesa Absoluta do outro continua, porque não houve ataque]**. É a única resposta a uma resposta.
- **A Proteção por sacrifício (J+Q+K do campo) saiu do jogo** (autor, 2026-10-30).

**Devastação — K + A + J ou K + A + Q jogados juntos da mão [autor, 2026-10-30; F3 do sub-projeto 5]**
- Na **fase principal do seu turno**. **K + A + J** esvazia a **Fileira de Ataque do oponente**; **K + A + Q**, a **Fileira de
  Defesa** dele. Todas as numéricas da fileira vão para o cemitério; os buffs ficam e a quadra se desfaz. As 3 cartas vão para o
  cemitério. Não encerra o turno.
- O Coringa Selvagem faz o papel do **A**, do **J** ou do **Q**, nunca do K.
- **Não pode** ser lançada contra quem está sob Defesa Absoluta, nem contra uma fileira vazia **[I]**.
- Abre a janela de reação do oponente, e a **única resposta é o Reflect**: ele devolve a Devastação, e quem a lançou perde a
  própria fileira do mesmo tipo, **sem quebrar Q nem K**. A Armadilha não responde.
- **Reflect contra Reflect** na Devastação **[I]:** os dois se anulam, a Devastação não acontece (as 9 cartas vão para o cemitério)
  e quem a lançou segue na fase principal.
- **Quem lançou sob Defesa Absoluta [I]:** o Reflect é anulado, como contra um atacante sob Defesa Absoluta; ninguém perde fileira.
- As cartas destruídas pela Devastação **não curam** (E3).

### 1.7 Janela de reação

| O oponente… | Quem responde pode |
|---|---|
| declara ataque | usar **A** (quebrar J, Q ou K do atacante antes do dano) e lançar **Reflect** (K+J+Q da mão) |
| joga K (um ou vários, inclusive o que completa a Exódia) | usar **A** (quebrar K) |
| lança uma Devastação | só o **Reflect** (K+J+Q da mão), que a devolve |
| responde ao seu golpe com um Reflect | responder com **outro Reflect** (K+J+Q da mão); o A não responde |

- O Coringa Selvagem vale como A ou como o J/Q de um Reflect.
- Dentro da janela, o respondente pode fazer quantas respostas válidas quiser; a janela fecha quando ele passa ou o tempo acaba.
- **Sem cadeia [M]**, com uma exceção: o Reflect contra Reflect é a única resposta a uma resposta (F2 do sub-projeto 5). Lançado o Reflect, a janela do respondente fecha e a de quem foi refletido abre.
- **A janela sempre abre** — mesmo que o respondente não tenha resposta válida — e tem **duração mínima fixa** imposta pelo servidor **[M]**. Abrir só quando há resposta (ou fechar instantaneamente) vazaria a mão pelo tempo.

### 1.8 Combos

**Fallen is Back [O, simplificado]**
- **Quadra:** 4 ou mais numéricas **do mesmo valor na mesma fileira ao mesmo tempo** — não precisam estar seguidas **[I]** (sem organização, "seguidas" seria quase impossível).
- **Bônus [O]:** enquanto a quadra existir, a fileira soma **+ valor da carta** antes do multiplicador **[I]** (quadra de 10 → +10). Cada quadra dá bônus uma única vez, mesmo com 5+ cartas iguais. Com o limite de 8 cartas (sub-projeto 5) cabem duas quadras de valores diferentes na mesma fileira, e cada uma conta separadamente: o bônus soma as duas e cada uma dá a sua Ressurreição. Oito cartas iguais continuam sendo uma quadra só.
- **Ressurreição [M]:** ao formar uma quadra, o jogador ganha **1 Ressurreição**: na fase principal de um turno seu, pega **1 carta numérica** do cemitério **[O do autor: só numéricas]** e a coloca no **fim de uma fileira à escolha** (que tenha espaço).
  - Validade: enquanto a quadra existir, com **garantia mínima de 3 rodadas** após a formação **[O]**.
  - Uso único por quadra. Se a quadra se desfizer e se formar de novo depois, gera nova Ressurreição **[I]**.

**Defesa Absoluta — 4 Q nos Buffs de Defesa**
- Ativa ao colocar o 4º Q. Dura **até o oponente atacar de fato**: acaba no fim do turno em que ele ataca, e um turno dele sem
  ataque (Ataque vazio) não a encerra **[autor, 2026-10-30; substitui "até o fim do próximo turno de ataque do oponente", de
  2026-10-15]**. O Ataque Absoluto e o ataque devolvido por um Reflect contam como ataque **[I]**.
- Enquanto ativa: imune a dano **[O]**, a **A** **[O]** e a **Sacrifício** **[I]**; **nenhuma carta da Fileira de Defesa vai para o cemitério** **[O]**.
- Ao terminar (depois do ataque do oponente): **apenas 1 Q** (o mais antigo) vai para o cemitério **[O do autor]**; os outros 3 continuam (multiplicador 4×). Novo Q → nova Defesa Absoluta.

**Ataque Absoluto — 4 J nos Buffs de Ataque**
- Vale no ataque declarado com 4 J (multiplicador 1 + 4 = **5×**).
- **Quebra todos os K** do alvo e o dano é calculado **normalmente**: ATK − DEF **[O do autor]**.
- Após o ataque: **apenas 1 J** (o mais antigo) vai para o cemitério **[O do autor]**.
- **Absoluto contra Absoluto [I]:** se o alvo estiver sob Defesa Absoluta, os K dele quebram e o dano é a conta normal (ATK×5 − DEF×5). A Fileira de Defesa dele continua protegida.
- Contra um Reflect: o Reflect intercepta tudo — o ×5 volta para o atacante e os K do dono do Reflect não quebram **[I]**.

**Exódia — 4 K na Guarda [O + contra-jogo M]**
- Após a janela de reação da jogada de K, se a Guarda tiver **4 ou mais K**, **o jogo acaba na hora** e quem a montou vence.
- Contra-jogo: a janela de reação permite ao oponente quebrar K com **A**. Fora isso, K quebra ao absorver dano ou ao ser refletido.
- O Coringa Selvagem **nunca** conta como K.

### 1.9 Resolução de um ataque

Notação: `soma(fila)` = soma dos valores das numéricas; `bônus` = bônus de quadra da fileira; `nJ`, `nQ` = quantidade de buffs.

```
ATK = (soma(Ataque do atacante) + bônus) × (1 + nJ)
DEF = (soma(Defesa do defensor) + bônus) × (1 + nQ)
```

1. Janela de reação do defensor (pode usar A e lançar Reflect; contra o Reflect, a resposta do atacante) — o estado resultante é o usado no cálculo. Reflect contra Reflect: não há golpe e o turno passa.
2. Calcula ATK e DEF.
3. **Reflect lançado pelo defensor** → resolve como em §1.6, aplica o dano refletido ao atacante (vida ≤ 0 → fim de jogo imediato) e pula para o passo 8.
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
- **Na tela [autor, 2026-10-31: "às vezes a iniciativa muda pro adversário, eu também não vejo o momento, não sei por quê"]:** a visão traz o dano de cada um na rodada (`damageThisRound`) e a última decisão (`lastInitiative`, `null` enquanto é a sorteada), e o fim de **toda** rodada de Ataque emite `InitiativeDecided`, mudando ou não, com os dois danos. O dano do Roubo não conta **[I]**.
- **Escolha da iniciativa [N]:** quem tem a iniciativa escolhe, no início de cada rodada de Ataque, se ataca primeiro ou segundo. Ir primeiro vence corridas de dano letal; ir segundo dá informação completa antes de agir.
- A iniciativa também define quem recebe a primeira carta na distribuição (§1.4).

### 1.11 Fim de jogo (sem anti-travamento)

- **Sem limite de rodadas** (autor, 2026-10-28/30: "este jogo não deve ter limite de rodadas"): o anti-travamento saiu por completo na E1 do sub-projeto 5, e com ele o empate. A partida acaba só pelos três motivos abaixo.
- **Pressão da mesa: removida no sub-projeto 5** (pedido do autor em 2026-10-23, "remoção completa da implementação"). Ela dava +1 no multiplicador de ataque dos dois jogadores por rodada de Ataque seguida sem dano, para fechar a brecha da "tartaruga" (quem está na frente põe tudo na Defesa, deixa o Ataque vazio e espera o anti-travamento). Sem ela, a brecha volta: no desenho pareado (§3), o líder que se fecha ganha +3,1 pp com vantagem de 10 e +0,4 pp com 20 (a meta é ≤ 0), e 62–65% das partidas dele acabam no anti-travamento. **Decisão do autor (2026-10-27): nenhuma regra nova.** Ele lembrou que quem não põe nenhuma carta no Ataque não ataca, e a Defesa do oponente não perde carta (§1.5, item 3, já é assim e tem teste), e vai testar a tartaruga no playtest dele depois do jogo pronto. Medido com as regras da Fase D (vida 500, fileiras de 8, 8 Ás): o líder que se fecha ganha +6,1 pp, e 16,7% das partidas acabam no anti-travamento.
- ~~**Anti-travamento [M]:** 3 rodadas de Ataque seguidas sem dano → vence quem tiver mais vida; vida igual → empate.~~ Removido na E1 (`RULES_VERSION` 3).
- **Vida ≤ 0** → perde na hora, mesmo no meio da rodada **[O]**.
- **Exódia** → vence na hora (após a janela de reação) **[O]**.
- **W.O.** (aplicado pelo servidor): desconexão sem retorno em 60 s ou 3 turnos estourados seguidos.
- **Sem terminação garantida:** dois jogadores que nunca atacam (Ataque vazio) jogam para sempre. Com cartas no Ataque, atacar é obrigatório. O servidor encerra a sala pelo tempo (W.O. e expiração), e o simulador tem um teto próprio de 400 rodadas, que conta como "sem fim" nos relatórios e nunca vira regra.

### 1.12 Tempo (aplicado pelo servidor; valores iniciais)

| Momento | Tempo | Se estourar |
|---|---|---|
| Equipar (simultâneo) | 40 s | cada numérica restante vai para a fileira com menos cartas (empate → Defesa **[I]**); ambas cheias → cemitério |
| Escolha da ordem (iniciativa) | 10 s | ataca primeiro |
| Turno de ataque | 30 s | declara o ataque sem jogar mais especiais (ou passa, se Ataque vazio) |
| Janela de reação | 8 s (mínimo 2 s) | passa |
| Reconexão | 60 s | W.O. |

### 1.13 Exemplos

1. **Dano simples.** Ataque [3, 7, 9] + 1 J → 19 × 2 = **38**. Defesa do alvo [5, 8], sem Q → **13**. Dano **25**. Saem o 3 do atacante e o 5 do defensor.
2. **Guarda.** ATK 30 contra DEF 20 → líquido 10. O defensor tem 2 K → 1 K quebra, dano 0.
3. **Reflect.** O oponente, com 2 K na Guarda, ataca com [6, 8, 9] + 1 J = **46**, e o defensor responde com um Reflect. Os 2 K e o Q dele quebram; Defesa [4, 10] → ⌊14 / 2⌋ = 7. **Ele leva 39**. O dono do Reflect leva 0; saem o 6 do atacante e a 1ª carta da Defesa do dono do Reflect.
4. **Quadra.** Defesa [10, 3, 10, 10, 10] → 43 + bônus 10 = 53; com 1 Q → **106**.
5. **Absoluto × Absoluto.** Ataque [5, 6, 7] com 4 J → 18 × 5 = **90**. Defesa [8, 9] com 4 Q → 17 × 5 = **85**. Os K do defensor quebram; dano **5**; o defensor não perde carta de Defesa; o atacante perde o 5 e 1 J. Ao fim do turno, a Defesa Absoluta expira e 1 Q do defensor vai para o cemitério.
6. **Só os J multiplicam.** Ataque [4, 6] + 1 J → 10 × (1 + 1) = **20** (com a Pressão da mesa, removida no sub-projeto 5, eram 40).
7. **Coringa Selvagem.** Com 3 J nos Buffs de Ataque, o jogador joga um Coringa Selvagem como J → 4 J → o ataque deste turno é **Absoluto**.

### 1.14 Original × v2 (resumo das mudanças)

| Tema | Original | v2 |
|---|---|---|
| Vida | 1000 | 500, escolhível entre 300, 500 e 800 (sub-projeto 5) |
| Coringas | nome do jogo; sem função nas regras | 2 avatares + 2 Coringas Selvagens no monte (J, Q ou A) |
| Fileiras | sem limite | 7 numéricas cada (calibrável) |
| Equipar | — | simultâneo e secreto; numéricas obrigatórias, na ordem que o jogador escolher (E2) |
| Iniciativa | quem causou mais dano começa | quem causou mais dano **escolhe** atacar 1º ou 2º |
| K | bloqueia todo dano enquanto equipado | absorve 1 ataque com dano e quebra; todos quebram quando o dono é refletido |
| A | elimina um especial | armadilha: também como reação a ataque ou jogada de K |
| Sacrifício | — | J/Q da mão abate J/Q do oponente (só no seu turno) |
| Reflect | "em aprovação" | só como reação a um golpe; quebra Q e K de quem é refletido; Reflect contra Reflect anula os dois |
| Fallen is Back | qualquer carta do cemitério | só numéricas; "juntas" = mesma fileira |
| Absolutos | sem custo definido | consomem 1 Q / 1 J ao terminar |
| Exódia | instantânea | instantânea após janela de reação (A) |
| Fim do monte | — | cemitério embaralhado vira novo monte; a compra nunca para |
| Travamento | — | sem regra: o anti-travamento saiu na E1 (sem limite de rodadas); a tartaruga fica para o playtest do autor |

---

## 2. Motor (`packages/engine`)

### 2.1 Princípios

- **TypeScript puro**, sem dependências de runtime, sem I/O e **sem relógio**.
- **Determinístico:** mesma semente + mesma sequência de ações = mesmo estado. PRNG com semente guardada no estado (embaralhamento inicial e reembaralhamentos do cemitério).
- **Imutável na interface:** cada ação retorna um novo estado.
- Funciona igual no Worker (servidor), no navegador e no Node (simulador/CLI).

### 2.2 API pública

```ts
createGame(config: RulesConfig, seed: string, players: [PlayerId, PlayerId])
  : { ok: true; state: GameState } | { ok: false; error: ConfigError }
applyAction(state: GameState, player: PlayerId | 'system', action: Action)
  : { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: RuleError }
viewFor(state: GameState, player: PlayerId): PlayerView
viewEvents(events: GameEvent[], player: PlayerId): GameEvent[]  // redige informação oculta
legalActions(view: PlayerView): Action[]
```

- `legalActions` opera sobre a **PlayerView** (mão própria + campo público bastam), o que permite usá-la no navegador e nos bots sem acesso ao estado completo.
- Erros são valores (`RuleError` / `ConfigError` com código), nunca exceções, para entradas inválidas.

### 2.3 Estado e fases

- **Cartas** têm id único (ex.: `b1-copas-7`, `selvagem-1`), tipo e valor/naipe. Um Coringa Selvagem em campo guarda o papel assumido (J ou Q).
- **Fases** (máquina de estados explícita):
  - `EQUIP` — aguardando as submissões dos dois jogadores;
  - `ORDER_CHOICE(jogador)` — quem tem a iniciativa escolhe a ordem (só com `initiativeChoice`);
  - `ATTACK_MAIN(jogador)` — fase principal do turno;
  - `REACTION(respondente, gatilho, devastação?)` — gatilho: `ATTACK` | `K_PLAYED` | `DEVASTATION` | `REFLECT_PLAYED` (a resposta de quem foi refletido); a Devastação em curso vai junto na janela dela e na resposta ao Reflect que a devolve;
  - `GAME_OVER(resultado)`.
- Além das zonas: vida, iniciativa, ordem da rodada, contador de rodadas, dano por jogador na rodada atual, efeitos com duração (Defesa Absoluta, Ressurreições com rodada de expiração) e o Reflect lançado, só até a resposta.

### 2.4 Ações

| Ação | Quando |
|---|---|
| `EQUIP { destinations[], order? }` — um destino por numérica recebida: `ATK` \| `DEF` \| `REPLACE_LAST_ATK` \| `REPLACE_LAST_DEF` \| `DISCARD`. `order` (E2) traz os ids das numéricas pendentes na ordem em que entram, e `destinations[i]` vale para a carta `order[i]`; precisa ser uma permutação delas (senão `INVALID_DESTINATIONS`, `DUPLICATE_CARDS` ou `INVALID_CARD`). Sem `order`, a ordem de compra. `legalActions` traz só a lista canônica, sem `order` | `EQUIP` |
| `DISCARD { cardIds[] }` — o limite de especiais com a penalidade CHOOSE: exatamente o excesso da mão | `EQUIP` (antes do `EQUIP`) |
| `CHOOSE_ORDER { first: boolean }` | `ORDER_CHOICE` |
| `PLAY_J`, `PLAY_Q { cardId }` | `ATTACK_MAIN` |
| `PLAY_K { cardIds[] }` | `ATTACK_MAIN` |
| `TRAP { cardId, targetId }` | `ATTACK_MAIN`, `REACTION` (gatilho ATTACK ou K_PLAYED) |
| `SACRIFICE { cardId, targetId }` | `ATTACK_MAIN` |
| `REFLECT { kId, jId, qId }` | `REACTION` (gatilho ATTACK ou DEVASTATION) |
| `CANCEL_REFLECT { kId, jId, qId }` (da mão; Reflect contra Reflect) | `REACTION` (gatilho REFLECT_PLAYED) |
| `RESURRECT { cardId, row }` | `ATTACK_MAIN` |
| `STEAL { cardId, targetId, row }` — o Ás (ou Selvagem) da mão, a numérica do oponente e a fileira do ladrão | `ATTACK_MAIN` |
| `DEVASTATE { kId, aId, xId, row }` — `row` é a fileira **do oponente**; `xId` é o J (`ATK`) ou o Q (`DEF`) | `ATTACK_MAIN` |
| `DECLARE_ATTACK` / `END_TURN` (Ataque vazio) | `ATTACK_MAIN` |
| `PASS` | `REACTION` |
| `TIMEOUT` (`system`) | qualquer fase com prazo |
| `FORFEIT` (`system`) | qualquer fase |

- **Coringa Selvagem:** qualquer ação que recebe o id de um J, Q ou A da mão aceita o id de um Selvagem; o papel é deduzido da ação (`PLAY_J` → J; `TRAP` e `STEAL` → A; `SACRIFICE` → tipo do alvo; `REFLECT`/`CANCEL_REFLECT` → posição `jId`/`qId`; `DEVASTATE` → posição `aId`/`xId`). Nunca é aceito como `kId` nem em `PLAY_K`.

### 2.5 Eventos

A união `GameEvent` de `types.ts`, base para animações e histórico. Cada ação devolve os seus, em ordem. Um teste do motor (`test/spec-events.test.ts`) confere que esta lista e a união têm os mesmos nomes.

- **Rodada e Equipar:** `RoundStarted`, `DeckReshuffled`, `CardsDealt`, `HandLimitPenalty` (o limite de especiais, E3), `EquipSubmitted`, `CardsPlaced` (a carta que troca a última da fileira leva o `replaced`), `OrderChosen`, `TurnStarted`.
- **Fase principal:** `BuffPlayed` (com o papel, `as`), `GuardPlayed`, `TrapUsed` e `Sacrificed` (com `as` quando a carta é um Selvagem), `Resurrected`.
- **Janela de reação:** `ReactionWindowOpened`, `ReactionWindowClosed`, `ReflectPlayed` (com o golpe que responde, `against`), `ReflectCanceled` (Reflect contra Reflect).
- **Roubo e cura (E3):** `CardStolen` (a carta, as duas fileiras e o Ás gasto), `StealDamage` (o valor seco, o dano que saiu e se um K anulou), `Healed` (quanto entrou, de onde e a carta que curou).
- **Devastação (F3):** `DevastationCast` (as 3 cartas, a fileira e o alvo), `RowDevastated` (quem perdeu a fileira, as cartas e se foi refletida), `DevastationCanceled` (Reflect contra Reflect, ou o Reflect contra quem está sob Defesa Absoluta).
- **Ataque:** `AttackDeclared`, `AbsoluteAttack` (antes de tudo, também contra um Reflect), `ReflectTriggered`, `DamageDealt`, `GuardBroken`, `BuffRemoved`, `CardsRemovedFromRow`, `QuadFormed`, `QuadBroken`.
- **Estado da mesa:** `AbsoluteDefenseStarted`, `AbsoluteDefenseEnded`, `InitiativeDecided` (no fim de toda rodada de Ataque: com quem a iniciativa ficou, se mudou de mão e o dano de cada um na rodada).
- **Fim:** `Exodia`, `GameOver`.

### 2.6 Informação oculta

- `viewFor` entrega: mão própria completa; do oponente, **só a quantidade** de cartas na mão; monte só como **quantidade**; submissão de Equipar do oponente só como "pronto/montando" até a revelação.
- `viewEvents` redige eventos: o oponente vê "comprou 1 carta", nunca qual especial.
- A semente e a ordem do monte **nunca** saem do servidor.

### 2.7 Configuração

```ts
RulesConfig {
  hp: 500, rowLimit: 8, buffLimit: 4, cardsPerEquip: 4,
  exodiaGuard: 4, resurrectMinRounds: 3,
  deck: { numericCopies: 8, faceCopies: 6, aceCopies: 8 }, // sem aceCopies (replays antigos), os A têm faceCopies
  // regras novas [N] — ligadas por padrão; o simulador compara com elas desligadas
  initiativeChoice: true,
  wildJokers: true,
  defenseHealGuard: 2, // cura passiva (E3): K na Guarda que a ligam; sem o campo (replays antigos), nada cura
  specialLimit: { max: 4, penalty: 'BURN' } // limite de especiais (E3); CHOOSE e FEWER também valem; sem o campo, nada limita
}
```

- **Validação em `createGame`:** rejeita configs que quebram a garantia de compra (§1.4): `4 × rowLimit ≤ totalNuméricas − 2 × cardsPerEquip` (com o baralho padrão: `rowLimit ≤ 16`).
- O total de cartas do monte é **derivado da config** (98, ou 100 com `wildJokers`).
- Timers (§1.12) **não** fazem parte do motor: ficam numa `TimerConfig` usada pelo servidor (sub-projeto 2), que injeta `TIMEOUT` via alarmes do Durable Object e impõe a duração mínima da janela de reação.

---

## 3. Simulador (`packages/sim`)

- **Bots:**
  - `random` — qualquer ação legal;
  - `greedy` — heurísticas: destino da numérica que maximiza ATK−DEF esperado; A na maior ameaça; Reflect, na reação, quando o golpe refletido doeria bastante; Sacrifício quando o buff do oponente vale mais que o próprio; escolha de ordem pela situação de vida;
  - `turtle` — quando está na frente em vida, põe tudo na Defesa, deixa o Ataque vazio e joga todos os K que tiver (testa a brecha da tartaruga, que a Pressão da mesa fechava antes de sair no sub-projeto 5, inclusive via K). O Equipar só permite trocar/descartar com as duas fileiras cheias (§1.4): com a Defesa cheia e espaço no Ataque, a numérica vai para o Ataque à força e o ataque passa a ser obrigatório. A própria regra já limita a tartaruga; o relatório separa as vitórias dela por motivo (vida, Exódia, sem fim).
- Interface: `Bot = (view: PlayerView, legal: Action[], rng) => Action`. O `rng` é do bot, com semente própria — nunca o da partida, nunca `Math.random`.
- **Runner:** N partidas por configuração com sementes reprodutíveis; varredura de parâmetros (`hp`, `rowLimit`, composição do baralho); **comparação liga/desliga de cada regra [N]**, uma por vez a partir do padrão e com as mesmas sementes; saída em tabela no terminal + JSON em `packages/sim/reports/`.
- Marcação nesta seção: **[I]** = interpretação do Plano 2, aprovada em 2026-10-16.
- **Métricas e metas iniciais** (medidas em partidas `greedy` × `greedy`, salvo indicação; `random` × `random` e `turtle` × `greedy` aparecem no relatório para comparação **[I]**):

| Métrica | Meta |
|---|---|
| Duração | 8–14 rodadas de Ataque (~10–15 min), pela mediana |
| Vitória de quem começa com a iniciativa | 45–55% (iniciativa sorteada pelo motor ao criar a partida; empate não conta como vitória) |
| Escolha da ordem | nenhuma opção dominante — métrica contrafactual, abaixo |
| Vitória do `turtle` quando está na frente | não maior que a do `greedy` na mesma situação — desenho pareado, abaixo |
| Exódia | 1–3% das partidas |
| Fallen is Back | aparece em 10–25% das partidas |
| Partidas que param no teto do simulador (400 rodadas) | reportadas, com a parte que tinha uma Defesa Absoluta ativa (sem meta: sem anti-travamento nada garante o fim) |

- **Escolha da ordem (contrafactual):** em cada partida `greedy` × `greedy` sorteia-se um ponto de Escolha da iniciativa. Dali, o simulador joga o resto da partida K vezes indo primeiro e K vezes indo segundo, com as mesmas sementes de rollout para as duas opções (comparação pareada). Cada rollout reamostra a informação oculta para quem escolhe (mão do oponente e ordem do monte), com semente própria, para não espiar o monte real. O ponto é **decisivo** quando a diferença média de pontos (vitória 1, empate 0,5) passa de 2 erros padrão **[I]**. Metas: entre os pontos decisivos, ir primeiro é melhor em **30–70%**; e pelo menos **20%** dos pontos são decisivos **[I]** (se a diferença some em quase todo lugar, a escolha não importa, o que também falha a intenção da regra). O relatório traz a direção e o tamanho da diferença. A frequência com que o `greedy` escolhe ir primeiro mede a heurística do bot, não a regra: fica só como informação. É job de calibração; nunca entra no `pnpm check`.
  - **Decisão (2026-10-19, por delegação do autor):** a regra fica mantida (ligada); desligável pela chave `initiativeChoice`, da config. Medição atual: 4% de pontos decisivos, com o limite dos rollouts `greedy` × `greedy`. Na interface (sub-projeto 3), a escolha vem com "atacar primeiro" pré-selecionado, sem travar a rodada.
- **Turtle na mesma situação (pareado):** partidas `greedy` × `greedy` até alguém abrir **10 ou mais** de vida de vantagem ao fim de uma rodada de Ataque. Desse estado, a partida continua duas vezes com as mesmas sementes: num ramo o líder vira `turtle`, no outro segue `greedy`. Meta: pontos do líder `turtle` ≤ pontos do líder `greedy`. Repete-se com vantagem de 20+ (sensibilidade).

Bots não jogam como humanos: as metas guiam a calibração inicial; o ajuste fino vem do playtest.

## 4. Jogo no terminal (`pnpm play`)

- Partida contra o bot `greedy` no terminal, sem timers (`--bot` troca o bot; `--semente` repete uma partida).
- Mostra vida, guarda, buffs, fileiras, quantidade de cartas na mão do oponente, monte e cemitério; lista as ações legais numeradas; escolha de ordem e janelas de reação aparecem como prompts. O Equipar é perguntado carta a carta, na ordem de compra (com as duas fileiras cheias seriam até 81 combinações; a ordem livre da E2 fica com a web).
- Ao terminar, salva a partida (semente + ações) em `packages/sim/replays/`, para reproduzir bugs.
- Objetivo: validar o "feeling" das regras antes da interface.

## 5. Testes e qualidade

- **Vitest.** Cada regra desta spec tem pelo menos um **teste de cenário**, montado com um builder (ex.: `scenario().attack([3,7,9]).buffsJ(1).vs().defense([5,8])` → espera dano 25 e remoções corretas). Os exemplos de §1.13 viram testes literais.
- **Cada regra [N]** tem testes com a chave ligada e desligada.
- **Invariantes (property-based, fast-check)** sobre partidas aleatórias:
  - todas as cartas estão sempre contabilizadas (monte + mãos + campo + cemitério), com o total **derivado da config** (98 ou 100);
  - a vida nunca passa da inicial, e só sobe com uma cura (E3);
  - a compra nunca falha por falta de cartas;
  - `viewFor`/`viewEvents` nunca expõem mão do oponente, ordem do monte nem semente;
  - determinismo (mesma semente + ações → mesmo estado);
  - ~~toda partida termina~~ → toda partida que o simulador encerra pelo teto dele é contada e reportada (a E1 tirou a terminação garantida).
- **Comando único `pnpm check`:** lint + typecheck + testes com cobertura (meta ≥ 90% de linhas e branches no motor) + smoke no Node puro (motor e simulador carregados sem bundler).
- **Portão automático contra regressões:** hooks versionados (pre-commit e pre-push) rodam o `pnpm check`; a CI roda o mesmo comando em push e PR, e precisa estar verde antes do merge. Quando o check passar de ~45 s, o pre-commit vira a versão rápida (lint, typecheck e testes relacionados) e o pre-push mantém o completo.
- **Partidas de referência:** replays gravados (semente + ações) reexecutados no motor, com snapshot de um resumo de cada partida. Mudança de regra que torna uma ação ilegal falha no passo exato; mudança de resultado só entra aceitando o snapshot de propósito.
- **Playouts enviesados:** políticas que forçam Exódia e Absolutos, com as invariantes checadas a cada passo; o teste falha se o evento-alvo não acontecer em nenhuma das sementes fixas.

## 6. Critérios de pronto (sub-projeto 1)

1. Motor implementa toda a §1; `pnpm check` passa.
2. Relatório do simulador dentro das metas de §3, ou desvios explicados e parâmetros ajustados (registrados nesta spec).
3. O autor jogou partidas no terminal e aprovou o "feeling".

## 7. Fora de escopo (próximas specs) e ideias

- **Sub-projeto 2 — Servidor:** Durable Object por sala, criação de sala e link, apelido + token de reconexão, protocolo WebSocket validado, timers, W.O., deploy.
- **Sub-projeto 3 — Interface:** mesa, cartas e animações dirigidas por eventos, mobile, pt-BR.
- **Sub-projeto 4 — Polimento:** tutorial interativo, jogar solo contra bot, sons, revanche, histórico/replay.
- **Ideias para avaliar depois:** efeitos por naipe; espectadores.
- **Avaliadas e reprovadas:** Fúria do Coringa (+1 no multiplicador de ataque com vida ≤ 30) — reprovada pelo autor.
