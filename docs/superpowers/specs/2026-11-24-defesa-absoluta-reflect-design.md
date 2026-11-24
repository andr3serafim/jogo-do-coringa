# A Defesa Absoluta em duas fases e o Reflect novo — spec

> **Estado:** rascunho para o autor. Origem: `docs/memoria/decisoes.md` 2026-11-24 (3) (a Defesa Absoluta) e (4) (o Reflect). Nada aqui
> vira código antes do "sim" dele. **[I]** marca o que ele não disse com essas palavras.

## 1. As regras novas

### 1.1 Defesa Absoluta (4 Q), substitui o 11.1

**Fase 1, o escudo.** O 4º Q que entra liga o escudo, com tudo o que a Defesa Absoluta faz hoje:
- o dano dos ataques é 0 (só o Ataque Absoluto fura, e quebra todos os K);
- imune a Armadilha, Sacrifício, Roubo e Devastação;
- o Reflect contra quem está no escudo só segura o golpe (ninguém perde nada);
- a Devastação refletida contra ele não tira nada.

O escudo acaba no fim do primeiro turno do oponente que termina **com ataque** (como hoje), mas **nenhum Q sai**.

**Fase 2, enquanto houver 4 Q.** Sem imunidade nenhuma:
- a DEF é a de sempre, × 5 (1 + 4 Q);
- o dano entra normalmente, e a Guarda funciona como sempre;
- os Q podem sair por Armadilha e Sacrifício (o Reflect novo não tira Q, 1.2);
- **depois de um ataque, a carta da frente da Defesa não sai**;
- a Devastação, o Roubo, a troca do Equipar e a troca da Ressurreição tiram cartas da Defesa normalmente.

Com 3 Q a fase 2 acaba. Quando o 4º Q volta, o escudo liga de novo.

**Atenção, o Roubo na fase 2.** O Roubo tira de vida o valor da carta com o bônus da fileira de onde ela sai (× (1 + Q) na Defesa), e
quem rouba cura o mesmo. Hoje isso nunca acontece contra 4 Q (o escudo é imune). Na fase 2 acontece, com × 5: roubar o 9 da sua Defesa
com 4 Q tira **45** da sua vida e cura **45** dele (e o 9 vai para a fileira dele). É a regra escrita valendo onde antes não chegava;
digo para a aprovação ser informada.

**Exemplo (as duas fases).** Você tem 8 e 6 na Defesa (14) e põe o 4º Q no seu turno. DEF = 14 × 5 = 70.
1. No turno dele, ele ataca com ATK 90. Você está no escudo: dano 0, e o 8 fica. No fim desse turno o escudo acaba, e os 4 Q ficam.
2. No turno seguinte dele, ele ataca de novo com ATK 90. Agora o dano é 90 − 70 = 20 (ou 1 K quebra e segura, se você tiver K). O 8
   fica na frente da Defesa.
3. Ele usa uma Armadilha no seu Q. Você fica com 3 Q: DEF = 14 × 4 = 56, e no próximo ataque o 8 sai, como sempre.
4. No seu turno você põe outro Q: 4 de novo, e o escudo volta (passo 1).

### 1.2 Reflect, substitui o 10.1, item 3

Contra um ataque, quem atacou:
- leva de volta **ATK − DEF base dele** (a soma da Fileira de Defesa dele mais a quadra, **sem** os Q), no mínimo 0. Sem o ÷ 2;
- perde **todos os K** da Guarda, e leva o dano mesmo assim (os K não seguram o dano refletido);
- **fica com os Q**.

Quem refletiu não leva nada. O resto não muda: Reflect contra Reflect, a Devastação refletida, a iniciativa (o dano refletido conta
para quem refletiu), os Ás da mesma janela e o fim do ataque (7.4, passos 5 a 9).

**Exemplo.** Ele ataca com 8 e 6 (14) e 1 J: ATK 28. A Defesa dele tem 5, 4 e 3 (12), com 2 Q e 2 K. Você reflete. Ele leva
28 − 12 = **16**, perde os 2 K e fica com os 2 Q. (Hoje: 28 − 6 = 22, e perderia os 2 K e os 2 Q.)

**O que muda de verdade, frente a hoje:** só duas coisas. (1) Sai o ÷ 2: o dano devolvido fica **menor** (no exemplo, 16 em vez de 22).
(2) Os Q **ficam**. Os K já quebram todos hoje, e o dano já entra mesmo com K; isso não muda. O Reflect fica mais fraco nas duas pontas.

**Contra quem está no escudo** (fase 1): o Reflect segue anulado (só segura o golpe), porque o escudo é imune a dano. **Na fase 2**,
o Reflect vale como acima. **[I]** Quando quem tem 4 Q reflete, a carta da frente da Defesa dele também fica (é carta saindo depois de
ataque), na fase 1 e na 2.

## 2. O motor (`packages/engine`)

Sem campo novo no estado. `absoluteDefense` passa a ser **só o escudo**; "4 Q" é a conta `defenseBuffs.length >= config.buffLimit`
(uma função `fullDefense(p, config)` em `combat.ts`, exportada, para a web e o simulador não repetirem a conta).

| Onde | Hoje | Depois |
|---|---|---|
| `flow.ts` `expireEffects` | escudo acaba e o Q mais antigo sai (`BuffRemoved`) | escudo acaba, `AbsoluteDefenseEnded`, **nenhum Q sai** |
| `combat.ts:137` (a frente da Defesa de quem foi atacado ou refletiu) | fica com `absoluteDefense` | fica com `fullDefense` (as duas fases) |
| `preview.ts` Reflect | `ATK − ⌊DEF base ÷ 2⌋`; quebra K e Q | `ATK − DEF base`; quebra K; `attackerQueens` sempre 0 |
| `preview.ts` Reflect contra o escudo | anulado | igual (lê `absoluteDefense`) |
| `actions/main.ts` (Armadilha, Sacrifício, Roubo, Devastação: `TARGET_PROTECTED`) | lê `absoluteDefense` | igual: só o escudo protege |
| `actions/main.ts:28` (o 4º Q liga) | liga se não está ligado | igual (rearma a cada 4º Q) |
| `legal-actions.ts`, `no-play.ts`, `reaction.ts` | leem `absoluteDefense` | iguais |

O campo `breaks.attackerQueens` sai do `AttackPreview` (sempre 0), e o ramo que o usa em `resolveAttack` também. **[I]** Sai em vez de
ficar zerado: menos código morto; o compilador mostra cada leitura.

## 3. Versões, golden e salas

- `RULES_VERSION` 6 → 7, digest novo em `RULES_DIGESTS`. As partidas guardadas pela versão 6 abrem com o aviso de sempre (o replay
  re-simula no motor de agora e pode parar ou dar outro resultado).
- Golden: `pnpm --filter @coringa/sim record-golden`, `-u` dos snapshots só depois de ler o diff, e o commit diz quais regras mudaram.
- **Recomendo `STATE_SCHEMA` 6 → 7** (`packages/server/src/core/timers.ts`): uma sala no meio da partida na hora do deploy trocaria o
  Reflect e a Defesa Absoluta no meio do jogo. Com o 7, as salas abertas no deploy são encerradas. **Pergunta ao autor (P2).**
- **A aba aberta com a versão velha.** O servidor não confere a `RULES_VERSION`; confere o `PROTOCOL_VERSION` no `hello`, e a web
  recarrega sozinha uma vez quando recebe o 4001 (`RoomGate.tsx`). Sem isso, uma aba aberta antes do deploy mostraria a prévia do
  Reflect com a conta velha (o resultado é o do servidor, mas o número na tela mentiria). **Recomendo subir `PROTOCOL_VERSION` 1 → 2
  junto** (parte da P2): a aba velha recarrega e pega a interface nova.

## 4. Os bots e o simulador (`packages/sim`)

- `bots/eval.ts` `reflectedDamage`: a conta nova (`ATK − defenseBase`). `hpDamage` não muda (já lê `absoluteDefense`, que agora é o
  escudo). Os bots que pesam "perder os Q num Reflect" deixam de pesar.
- `play/board.ts` e `play/text.ts` (o jogo no terminal): a fase 2 aparece como "4 Q (a Defesa não perde a frente)".
- **O portão do Difícil** (`pnpm sim:dificil --recomecar`, a regra mudou): roda depois do motor e dos bots. Se reprovar, paro e levo o
  relatório ao autor; nada de afrouxar o portão.
- **O teto de rodadas do simulador** (`capped`, `cappedWithAbsoluteDefense`): a fase 2 deixa a Defesa mais dura; a calibração
  (`pnpm sim:calibrate`) mostra se as partidas ficaram longas demais. O número entra no relatório para o autor.

## 5. A web (`packages/web`)

- **Textos** (`model/copy.ts`): a ajuda do Reflect (linha 842), da Defesa Absoluta (858), do Sacrifício (840, "Não funciona contra
  Defesa Absoluta" passa a "contra o escudo da Defesa Absoluta"), da Armadilha/Roubo (839) e da Devastação (843); as prévias de ataque
  e de Reflect (`previewText` e afins) com a conta nova. Os testes da cópia acompanham.
- **`model/marks.ts`** (`ownSpentIds`): sai a ligação "o Q que a sua Defesa Absoluta gasta ao acabar" (o `BuffRemoved` depois do
  `AbsoluteDefenseEnded` não existe mais).
- **Quem lê o fim do escudo (`AbsoluteDefenseEnded`) na web**, arquivo por arquivo:
  - `model/effects.ts` (a insígnia no retrato, que some na batida do fim): não muda;
  - `model/timeline.ts:258` (a batida `move()` do fim): **fica `move()`**: é a batida em que a insígnia sai, e o Q que andava tinha
    batida própria (o `BuffRemoved`), que deixa de existir;
  - `model/marks.ts` (`ownSpentIds`): sai a ligação "o Q que a sua Defesa Absoluta gasta ao acabar";
  - o som `defesa-absoluta` (`synth.ts:261`) é o do **começo** do escudo (os Q cravando): não muda. O fim não tem som próprio.
  - `sim/play/text.ts:207` (o texto do terminal): diz "o escudo acabou; os 4 Q ficam".
- **A fase 2 precisa aparecer na mesa** (a Defesa não perde a frente). Hoje a zona dos Q com 4 cartas e sem escudo cai no nível 2,
  o mesmo de 3 Q (`zone-level.ts`). **Pergunta ao autor (P1)**, com foto de cada opção antes do código (vai junto com as fotos do
  Cordel e do fim de partida):
  - **(a)** um nível próprio na zona dos Q para os 4 Q sem escudo (entre o 2 e o do escudo) e uma linha na dica da zona;
  - **(b)** uma figura na lista do estado (`MarkFigure`, como a cura passiva), com o nome da fase 2 que ele escolher e a linha "a Defesa
    não perde a carta da frente";
  - **(c)** nada novo além do nível de hoje e da linha na ajuda.
  - Falta um nome para a fase 2 (o texto da ajuda e do histórico usa). "Muralha" já é o nome do nível 2 da zona (3 Q): não serve.
- **O tutorial** (`/tutorial`, semente fixa, Fácil): confiro se a partida dele passa por Reflect ou pelo fim da Defesa Absoluta; se
  passar, a dica daquele passo muda junto.

## 6. As fixtures do E2E e o "ver sem esperar"

O replay re-simula os passos no motor de agora. As fixtures `absolutos`, `reflect`, `especiais` e `exodia-devastacao` são partidas de
bots por semente; com a regra nova a partida gravada pode parar no meio ou mudar.
- Rodo cada fixture no motor novo. A que ainda chega ao fim com a cena que o E2E procura fica (só o `rulesVersion` sobe). A que não
  chega é regravada: busca de semente com os mesmos bots, até achar a cena (como foi feito em `fatia4-220`), e os passos do E2E e da
  tabela "Para ver sem esperar" do `estado.md` são refeitos.
- Os E2E do treino (`e2e2631-1`) e o do tutorial: rodam inteiros (`pnpm e2e`) depois da mudança.

## 7. As regras escritas

`docs/JOGO-DO-CORINGA-4.0.md`: 7.4 (passos 6 e 9), 8.2, 8.8, 9.1 (o Q do fim da Defesa Absoluta sai da lista), 10.1 (itens 3 a 5 e o
exemplo), 10.2 (item 3), 11.1 (as duas fases e o exemplo), 11.2 (passo 5 do exemplo), 11.3 (o caso de quem tem 4 Q), 14.x.

## 8. Testes

- Motor, cada um visto falhar antes: o escudo acaba sem tirar Q; na fase 2 o dano entra, a Armadilha e o Sacrifício alcançam os Q, a
  frente da Defesa fica depois do ataque e sai pela Devastação e pelo Roubo; com 3 Q a frente volta a sair; o 4º Q de novo rearma o
  escudo; o Reflect devolve `ATK − DEF base`, quebra todos os K, não tira Q; o Reflect contra o escudo segue anulado; a frente de quem
  reflete com 4 Q fica.
- `heal-gross.test.ts` e as propriedades sorteadas do motor seguem verdes.
- Prévia = efeito (`previewBetween` é a mesma conta do `resolveAttack`): o teste de propriedade que já existe cobre.
- Web: a cópia, o `ownSpentIds`, a zona dos Q (conforme P1).

## 9. Perguntas ao autor

- **P1.** Como a fase 2 aparece na mesa: (a), (b) ou (c) do §5, e o nome dela. Com fotos, depois da aprovação do resto.
- **P2.** `STATE_SCHEMA` 7 (encerrar as salas abertas no deploy) e `PROTOCOL_VERSION` 2 (a aba velha recarrega): sim ou não.
- **P3.** Confirmar o **[I]** do §1.2: quem tem 4 Q e reflete também fica com a carta da frente da Defesa.

## 10. Fora daqui

O Ataque Absoluto (4 J) não muda. A Exódia, a cura passiva e a Ressurreição não mudam.
