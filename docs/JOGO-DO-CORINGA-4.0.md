# Jogo do Coringa 4.0: as regras

> **Escrito em 2026-11-14 a partir do que o motor faz hoje
> (`packages/engine`, `RULES_VERSION` 5, `main` em `8368eb1`) e do resumo de regras da mesa (`RULES_SECTIONS`, em
> `packages/web/src/model/copy.ts`). Substitui os textos antigos (`JOGO DO CORINGA.txt`, `2.0`, `3.0`), que ficaram para trás.
> Se este texto e o motor discordarem, quem manda é o motor, e o texto é corrigido.
>
> As regras são numeradas para a revisão em lote ("1.2 ok, 7.4 não…"). As seis leituras que o código tinha feito sozinho (seção 14)
> foram confirmadas pelo autor em 2026-11-15 (`docs/memoria/decisoes.md` 2026-11-15 (1)); o resto do texto descreve o motor e
> não foi revisado regra a regra.

---

## 1. Objetivo

1.1. Dois jogadores. Cada um é um Coringa com vida inicial de **500** (quem cria a sala, ou começa o treino, pode escolher **300**, **500** ou **800**).

1.2. Vence quem zerar a vida do oponente, montar a **Exódia** (11.7) ou ganhar por W.O. (13.4).

1.3. Não há limite de rodadas nem empate: a partida só acaba pela vida, pela Exódia ou por W.O.

## 2. O baralho

2.1. São 100 cartas, de dois baralhos comuns:

| Cartas | Cópias de cada | Total |
| --- | --- | --- |
| Numéricas de 2 a 10 | 8 (os 4 naipes dos 2 baralhos) | 72 |
| J, Q e K | 6 (dos 2 baralhos saem 2 de cada) | 18 |
| A | 8 (todos os Ás dos 2 baralhos) | 8 |
| Coringa Selvagem | — | 2 |

2.2. O **naipe não conta** para nenhuma regra. Só o valor da numérica e o tipo da especial importam.

2.3. As **numéricas** (2 a 10) vão para o campo. As **especiais** (J, Q, K, A e Selvagem) vão para a mão.

2.4. O monte é embaralhado no começo. Quando acaba, o cemitério inteiro é embaralhado e vira o monte novo.

## 3. A mesa de cada jogador

3.1. **Vida:** nunca passa da vida inicial (as curas param nela).

3.2. **Mão:** só especiais, no máximo **4** (5.3).

3.3. **Fileira de Ataque** e **Fileira de Defesa:** só numéricas, no máximo **8** em cada. A primeira carta que entra numa fileira
fica na **frente**. É a da frente que sai depois de um ataque (7.4), e as trocas mexem na **última** (5.6, 11.5).

3.4. **Bônus de Ataque** (os J, até 4), **Bônus de Defesa** (os Q, até 4) e **Guarda** (os K, sem limite).

3.5. **Cemitério:** um só, dos dois jogadores. É aberto: os dois veem tudo o que está nele.

## 4. As rodadas

4.1. O ciclo é: **Equipar, Equipar, Ataque, Equipar, Ataque, Equipar, Ataque…** (duas de Equipar no começo, depois alternando).

4.2. As especiais só se jogam nas rodadas de **Ataque**. No Equipar elas ficam na mão.

## 5. A rodada de Equipar

5.1. Cada jogador recebe **4 cartas**, uma de cada vez, alternando, começando por quem tem a iniciativa (6.1).

5.2. As especiais vão para a mão. As numéricas ficam esperando o seu destino.

5.3. **Limite da mão:** a especial que chegaria com a mão já tendo 4 vai **direto para o cemitério**.

5.4. Você vê todas as numéricas recebidas de uma vez e escolhe, **na ordem que quiser**, a fileira de cada uma: Ataque ou
Defesa. A que entra primeiro numa fileira fica à frente das que entram depois.

5.5. Só se põe carta em fileira que **não está cheia**.

5.6. **Com as duas fileiras cheias** (8 e 8), cada carta que sobra tem três destinos: **substituir a última do Ataque**,
**substituir a última da Defesa** (a carta antiga vai para o cemitério) ou ser **descartada**. Trocar ou descartar só vale
com as duas cheias.

5.7. Os dois montam **ao mesmo tempo, em segredo**. Quando os dois confirmam, as duas montagens aparecem juntas.

5.8. Depois da revelação, quem formou uma **quadra** (11.4) pode usar a Ressurreição na hora (11.5). Quem tem a iniciativa
decide primeiro.

## 6. A rodada de Ataque

6.1. **Iniciativa:** na primeira rodada, ela é sorteada. No fim de cada rodada de Ataque, fica com **quem causou mais dano
nela**. O dano devolvido por um Reflect conta para quem o lançou, e o do Roubo não conta. No empate, incluindo 0 a 0, ela não
muda de mão.

6.2. No começo da rodada de Ataque, quem tem a iniciativa escolhe **atacar primeiro ou em segundo**.

6.3. Cada jogador tem **um turno**. No seu turno você joga as especiais que quiser, quantas quiser e na ordem que quiser
(J, Q, K, Armadilha, Roubo, Sacrifício, Ressurreição, Devastação).

6.4. O turno termina com o **ataque**, que é **obrigatório** se a sua Fileira de Ataque tiver cartas. Com ela vazia, o turno
termina sem ataque. É um ataque por turno.

## 7. A conta do ataque

7.1. **ATK** = (soma da Fileira de Ataque + bônus de quadra) × (1 + número de J).

7.2. **DEF** = (soma da Fileira de Defesa + bônus de quadra) × (1 + número de Q).

7.3. **Dano** = ATK − DEF, no mínimo 0.

7.4. A ordem de um ataque:

1. Quem defende ganha a janela de reação (12): pode usar Ás e, se quiser, lançar um Reflect (10.1).
2. Calcula-se o ATK de quem ataca e a DEF de quem defende.
3. **Guarda:** se o dano for maior que 0 e o defensor tiver K na Guarda, **1 K** (o mais antigo) quebra e absorve **todo** o
   dano. Com dano 0, a Guarda fica intacta. O Ataque Absoluto muda isso (11.2).
4. O dano sai da vida. Vida em 0 ou menos **perde na hora**, e o resto do ataque não acontece.
5. A carta da **frente** da Fileira de Ataque de quem atacou vai para o cemitério.
6. A carta da **frente** da Fileira de Defesa de quem defendeu vai para o cemitério, a não ser que ele esteja sob Defesa
   Absoluta (11.1). Se ele tiver a cura passiva (11.3), ela cura.
7. Se foi um Ataque Absoluto, 1 J de quem atacou vai para o cemitério.
8. As quadras dos dois são conferidas de novo: as desfeitas somem, e as novas dão Ressurreição.
9. Fim do turno. Se o defensor estava sob Defesa Absoluta, ela acaba (11.1).

**Exemplo.** Você tem 7, 5 e 3 no Ataque (15) e 2 J: o ATK é 15 × 3 = 45. Ele tem 6 e 4 na Defesa (10) e 1 Q: a DEF é
10 × 2 = 20. O dano é 25.
- Se ele não tem K, perde 25 de vida. Depois o seu 7 e o 6 dele vão para o cemitério.
- Se ele tem 1 K, o K quebra e ele não perde nada. O 7 e o 6 vão para o cemitério do mesmo jeito.

## 8. As cartas especiais

8.1. **J (Bônus de Ataque):** no seu turno, vai para os seus Bônus de Ataque e soma 1 ao multiplicador do ATK. Cabem 4.

8.2. **Q (Bônus de Defesa):** no seu turno, vai para os seus Bônus de Defesa e soma 1 ao multiplicador da DEF. Cabem 4. O
quarto Q liga a Defesa Absoluta (11.1).

8.3. **K (Guarda):** no seu turno, você põe na Guarda **um ou vários K de uma vez**. Cada jogada de K abre a janela de reação
do oponente (12.1). O K absorve dano (7.4, passo 3), liga a cura passiva com 2 ou mais (11.3) e leva à Exódia com 4 (11.7).

8.4. **A, como Armadilha:** destrói **1 J, Q ou K** do oponente, e o Ás e o alvo vão para o cemitério.
- No seu turno: qualquer J, Q ou K dele.
- Na sua janela contra um ataque: qualquer J, Q ou K de quem atacou.
- Na sua janela contra uma jogada de K: só um K da Guarda.
- Não responde à Devastação nem a um Reflect.

8.5. **A, como Roubo** (só no seu turno):
1. Leve **uma numérica de qualquer fileira do oponente** para o **fim** da fileira sua que você escolher. Se a sua fileira
   estiver cheia, a última dela vai para o cemitério (e cura, se for a Defesa e você tiver a cura passiva).
2. O oponente perde de vida o **valor seco** da carta, sem J, Q nem quadra. Se ele tiver **pelo menos 1 K** na Guarda, o dano
   é anulado e o K fica. O Roubo **nunca mata**: a vida dele fica em no mínimo 1.
3. Você cura o mesmo valor, até a vida inicial.
4. O dano do Roubo não conta para a iniciativa. O Roubo não abre janela de reação.

**Exemplo.** Você rouba um 9 da Defesa dele e põe no seu Ataque. Ele perde 9 de vida, ou nada se tiver um K, e você ganha 9.
Se o 9 completar uma quadra no seu Ataque, você ganha uma Ressurreição.

8.6. **Sacrifício** (só no seu turno): descarte um **J** da mão para destruir um **J** dos Bônus de Ataque do oponente, ou um
**Q** para destruir um **Q** dos Bônus de Defesa dele. As duas cartas vão para o cemitério.

8.7. **Coringa Selvagem:** faz o papel de **J, Q ou A**, nunca o de K. O papel sai da jogada: nos Bônus de Ataque ele é J, nos
de Defesa é Q, como Armadilha ou Roubo é A. Dentro de um combo, ele pode fazer o J, o Q ou o A, um papel por carta.

8.8. Nada da seção 8 alcança quem está sob **Defesa Absoluta**: nem Armadilha, nem Roubo, nem Sacrifício (11.1).

## 9. Ordem da fila

9.1. Sempre sai **a carta mais antiga** da pilha: a K da Guarda que quebra, o J do Ataque Absoluto, o Q do fim da Defesa
Absoluta e a numérica da frente da fileira depois do ataque.

9.2. A carta que entra (pelo Equipar, pela Ressurreição ou pelo Roubo) vai para o **fim** da fileira.

## 10. Combos da mão

10.1. **Reflect (K + J + Q da mão):** só na sua janela de reação, contra um **ataque** ou uma **Devastação**.
1. As três cartas ficam na mesa, e quem foi refletido ganha uma resposta: **passar** (o golpe volta) ou lançar **outro
   Reflect**.
2. **Reflect contra Reflect:** os dois se anulam, as 6 cartas vão para o cemitério e o golpe não acontece. Contra um ataque, o
   turno acaba sem ataque (e a Defesa Absoluta do outro continua). Contra a Devastação, veja 10.2.
3. **O ataque refletido:** quem atacou leva de volta **ATK − ⌊DEF base dele ÷ 2⌋**, no mínimo 0. A DEF base é a soma da Fileira
   de Defesa dele mais o bônus de quadra, **sem** o multiplicador dos Q. Ele também perde **todos** os K da Guarda e **todos**
   os Q. Quem refletiu não leva nada, e esse dano conta para a iniciativa dele.
4. Depois disso o ataque termina como os outros (7.4, passos 5 a 9). A carta da frente do Ataque de quem atacou sai, e também a
   da frente da Defesa de quem refletiu (salvo sob Defesa Absoluta). Se era um Ataque Absoluto, 1 J sai.
5. Se quem atacou está sob **Defesa Absoluta**, o Reflect só segura o golpe: ninguém leva dano e nada quebra.
6. Os Ás que você usou na mesma janela, antes do Reflect, valem.

**Exemplo.** Ele ataca com 8 e 6 (14) e 1 J: ATK 28. A Defesa dele tem 5, 4 e 3 (12), com 2 Q e 1 K. Você responde com
Reflect. Ele leva 28 − ⌊12 ÷ 2⌋ = 28 − 6 = **22**, perde o K e os 2 Q, e você não perde vida. Depois saem o 8 dele e a carta da
frente da sua Defesa.

10.2. **Devastação (K + A + J, ou K + A + Q, da mão, no seu turno):** com o **J**, esvazia a **Fileira de Ataque** do oponente;
com o **Q**, a **de Defesa**.
1. Abre a janela dele, onde **só o Reflect** responde.
2. Se ele passa, as numéricas da fileira vão para o cemitério. Os bônus dele ficam, as quadras dela se desfazem e essas cartas
   **não curam**. Você continua o turno.
3. Se ele reflete e você passa, a Devastação volta: **você** perde a sua fileira do mesmo tipo. Ela não quebra Q nem K. Se você
   estiver sob Defesa Absoluta, ninguém perde nada. Você continua o turno.
4. Se ele reflete e você responde com outro Reflect, os dois se anulam, a Devastação não acontece e você continua o turno.
5. Não vale contra **fileira vazia** nem contra quem está sob **Defesa Absoluta**.
6. O Selvagem faz o A, o J ou o Q, nunca o K.

## 11. Estados e combos da mesa

11.1. **Defesa Absoluta (4 Q nos Bônus de Defesa):**
- Começa quando o quarto Q entra.
- Enquanto dura, o dano dos ataques é **0** (só o Ataque Absoluto fura, 11.2) e a sua Fileira de Defesa **não perde a carta da
  frente** depois dos ataques, nem contra o Ataque Absoluto.
- Você fica **imune** a Armadilha, Sacrifício, Roubo e Devastação.
- Ela acaba no fim do **primeiro turno do oponente que termina com ataque**, e o Q mais antigo vai para o cemitério. O turno
  que termina sem ataque, ou com o ataque anulado por Reflect contra Reflect, não a encerra.

11.2. **Ataque Absoluto (4 J nos Bônus de Ataque):**
- O multiplicador é 5×.
- Quebra **todos** os K da Guarda do alvo e causa o dano normal, **também contra a Defesa Absoluta**.
- Depois do ataque, o J mais antigo vai para o cemitério.

**Exemplo (Ataque Absoluto contra Defesa Absoluta).** Você tem 4 J e 10 no Ataque: ATK 50. Ele tem 4 Q, 8 na Defesa e 2 K:
DEF 40.
1. Os 2 K dele quebram.
2. Ele perde 10 de vida.
3. O seu 10 sai do Ataque, mas a Defesa dele **fica** inteira.
4. Você perde 1 J (fica com 3).
5. No fim do seu turno, a Defesa Absoluta dele acaba e ele perde 1 Q (fica com 3).

11.3. **Cura passiva (2 K ou mais na Guarda):** cada numérica da **sua Fileira de Defesa** que vai para o cemitério cura você
**valor × (1 + número de Q)**, até a vida inicial. Conta quando a carta sai:
- da frente da Defesa, depois de um ataque;
- da última posição da Defesa, trocada no Equipar (5.6), pelo Roubo (8.5) ou pela Ressurreição (11.5).

As cartas destruídas pela **Devastação não curam**.

A ordem num ataque (a cura conta os K que **sobram**):
1. A Guarda quebra (7.4, passo 3).
2. A carta da frente da Defesa cai.
3. A cura confere a Guarda que ficou.

**Exemplo.** Você tem 2 K, 1 Q e um 6 na frente da Defesa, e o ataque dele causaria dano.
- Com 2 K: um quebra, sobra 1, e o 6 sai **sem curar**.
- Com 3 K: um quebra, sobram 2, e o 6 cura 6 × 2 = **12**.
- Contra o Ataque Absoluto: todos os K quebram, e o 6 não cura.

11.4. **Quadra:** 4 ou mais numéricas do **mesmo valor** na **mesma fileira**, seguidas ou não.
- Somam esse valor uma vez à fileira (quatro 7 valem 28 + 7 = 35). A quinta carta igual não soma de novo.
- Uma fileira pode ter duas quadras de valores diferentes, e cada uma conta.
- Cada quadra **nova** dá **1 Ressurreição**.

11.5. **Ressurreição:** traz **1 numérica do cemitério** para o fim de uma fileira sua.
- **Quando:** no seu turno, ou logo depois da revelação do Equipar em que a quadra se formou, antes da rodada seguinte (5.8).
  Passar nessa janela guarda a Ressurreição.
- **Validade:** vale enquanto a quadra existir e, mesmo que ela se desfaça, por **3 rodadas** depois de formada. Cada
  Ressurreição se usa uma vez.
- **Onde entra:** numa fileira com vaga, no fim. Numa fileira cheia com vaga na outra, não entra.
- **Com as duas fileiras cheias:** ela entra no lugar da **última** carta da fileira, que vai para o cemitério (e cura, se for a
  Defesa e você tiver a cura passiva). Se a última tiver o valor de uma quadra daquela fileira, ela **não sai**, e a
  Ressurreição não entra ali.
- A carta que sai na troca não pode ser a que volta na mesma jogada.

11.6. **Iniciativa:** veja 6.1.

11.7. **Exódia (4 K ou mais na Guarda):** você vence na hora, depois que a janela de reação da jogada de K se fecha. Na janela,
o oponente pode quebrar K com Ás e impedir a Exódia.

## 12. A janela de reação

12.1. Ela abre para o oponente quando você **declara o ataque**, **joga K** ou **lança uma Devastação**, mesmo que ele não
tenha resposta.

12.2. Quem responde:
- **Contra o ataque:** usa Ás quantas vezes quiser (8.4) e depois passa, ou lança um Reflect (10.1).
- **Contra a jogada de K:** usa Ás só na Guarda e depois passa.
- **Contra a Devastação:** só o Reflect, ou passa.
- **Contra um Reflect:** só outro Reflect, ou passa.

## 13. A sala online

13.1. **Tempos:**

| Momento | Tempo | Se o tempo acabar |
| --- | --- | --- |
| Equipar | 40 s | A carta vai para a fileira com menos cartas (no empate, a Defesa). Com as duas cheias, é descartada. |
| Escolha da ordem | 10 s | Quem tem a iniciativa ataca primeiro. |
| Janela da Ressurreição | 15 s por jogador | Passa, e a Ressurreição fica guardada. |
| Turno | 30 s | Declara o ataque, se houver carta no Ataque. Senão, termina o turno. |
| Janela de reação | 8 s | Passa. |

13.2. O treino contra o bot e o tutorial não têm relógio.

13.3. **Estouro:** deixar acabar o tempo do Equipar (tendo numéricas para pôr) ou do próprio turno conta 1 estouro. A escolha da
ordem e a janela de reação não contam.

13.4. **W.O.:** perde quem estoura o tempo **3 vezes seguidas** ou fica **mais de 1 minuto** fora da sala. Se os dois chegam a 3
estouros no mesmo passo, a partida é abandonada, sem vencedor.

## 14. Leituras confirmadas

Pontos que o motor tinha decidido sozinho e que o autor confirmou em 2026-11-15 ("ok" a cada um). Cada um diz onde está.

14.1. O Roubo cura quem rouba o valor **cheio**, mesmo quando um K anula o dano ou o "nunca mata" o corta
(`actions/main.ts`, `steal`).

14.2. O Roubo **não abre** janela de reação (`actions/main.ts`, `steal`).

14.3. A Devastação **não vale** contra fileira vazia nem contra Defesa Absoluta (`actions/main.ts`, `devastate`).

14.4. Na Devastação, Reflect contra Reflect: ela não acontece e **quem a lançou segue no turno** (`actions/reaction.ts`,
`cancelReflect`).

14.5. A Devastação refletida contra quem está sob Defesa Absoluta: o Reflect é anulado e **ninguém perde nada**
(`actions/reaction.ts`, `closeReaction`).

14.6. A carta trocada no Equipar que sai da própria Defesa cura **depois** que as cartas novas entram (`actions/equip.ts`,
`resolveEquip`).
