# Sub-projeto 5, Fase B: a brecha da "tartaruga" sem a Pressão da mesa (decisão do autor)

Medido em 2026-10-27 no simulador, com as regras de hoje (vida 300, fileiras de 7, 6 Ás). Desenho pareado, como o de
`packages/sim/src/experiments/turtle.ts`: em 1000 partidas greedy × greedy, o primeiro Equipar em que alguém lidera por 10 (ou
20) de vida vira ponto de ramificação; dali, o líder (ou o atrasado) joga de tartaruga num ramo e segue greedy no outro, com as
mesmas sementes. "Tartaruga" = o bot `turtle`: tudo na Defesa, Ataque vazio, todos os K. As opções 2 e 3 são emuladas (os bots
não sabem da regra; o Difícil, que joga pelo motor, saberia).

Pontos do jogador (vitória 1, empate 0,5). Vantagem 10 / vantagem 20.

| Regra do fim | Líder tartaruga | Líder normal | Ganho da tartaruga | Atrasado tartaruga | Atrasado normal | Ganho |
| --- | --- | --- | --- | --- | --- | --- |
| Hoje: Pressão + anti-travamento em 5 | 42,6 / 46,5% | 58,4 / 63,5% | −15,8 / −17,0 pp | 17,7 / 14,9% | 41,6 / 36,5% | −23,9 / −21,6 |
| 1. Sem Pressão, 3 rodadas, vence quem tem mais vida | 61,8 / 64,9% | 58,7 / 64,5% | **+3,1 / +0,4 pp** | 4,2 / 4,1% | 41,3 / 35,5% | −37,1 / −31,4 |
| 2. Sem Pressão, 3 rodadas, sempre empate | 40,0 / 41,4% | 58,5 / 63,4% | −18,5 / −22,0 pp | 34,0 / 30,3% | 41,5 / 36,6% | −7,5 / −6,3 |
| 3. Sem Pressão, morte súbita depois de 3 rodadas | 37,0 / 38,6% | 56,9 / 62,8% | −19,9 / −24,2 pp | 27,4 / 24,6% | 43,1 / 37,2% | −15,7 / −12,6 |

Outros números:
- Opção 1: 62–65% das partidas da tartaruga-líder acabam no anti-travamento; das partidas normais (greedy), 12%. Na calibração da
  partida inteira (greedy × greedy, sem Pressão) eram 10,8% de fins por anti-travamento, contra 0% com a Pressão.
- Opção 2: os mesmos ~12% de partidas normais que hoje acabam no anti-travamento viram empate.
- Opção 3 (emulada): depois de 3 rodadas de Ataque seguidas sem ninguém perder vida, o próximo dano na vida vence (o do Reflect
  conta para quem o lançou; o que o K absorve não conta). Se chegar a 6 rodadas sem dano, empate. 12% das partidas normais são
  decididas na morte súbita; a duração mediana fica igual (9 rodadas de Ataque).

Recomendação: **opção 3, a morte súbita.** Fecha a brecha com folga nos dois sentidos (líder e atrasado), quase não gera empate
(só no teto de 6 rodadas), mantém um vencedor e tem drama, que combina com o tom de cordel. Custo: uma regra a mais para explicar,
e os bots Fácil/Médio precisam saber que, na morte súbita, qualquer dano é letal (o Difícil já joga pelo motor).
Segunda escolha: opção 2 (empate), mais simples de explicar, mas transforma ~12% das partidas normais em empate.
A opção 1 deixa a brecha aberta (+3,1 pp para quem lidera e se fecha, a meta da spec é ≤ 0).

Os números mudam na Fase D (vida 500, fileiras de 10, 8 Ás): a regra escolhida é medida de novo lá.
Sondas: `probe-turtle.ts` e `probe-sudden.ts`, no scratchpad da sessão do sub-projeto 5 da conta anterior (não estão no repositório; o desenho pareado é o de `packages/sim/src/experiments/turtle.ts`).

## Medido de novo com as regras da Fase D (vida 500, fileiras de 8, 8 Ás), 2026-10-27

Mesmo desenho pareado (1000 partidas por vantagem). Vantagem 10 / 20.

| Regra do fim | Líder tartaruga | Líder normal | Ganho da tartaruga | Atrasado tartaruga | Atrasado normal | Ganho |
| --- | --- | --- | --- | --- | --- | --- |
| 1. 3 rodadas, vence quem tem mais vida (a de hoje) | 63,4 / 66,6% | 57,4 / 60,4% | **+6,1 / +6,2 pp** | 3,9 / 3,3% | 42,6 / 39,6% | −38,7 / −36,3 |
| 2. 3 rodadas, sempre empate | 38,6 / 40,9% | 55,4 / 58,6% | −16,8 / −17,7 pp | 38,7 / 35,3% | 44,6 / 41,4% | −5,9 / −6,1 |
| 3. Morte súbita depois de 3 rodadas (teto de 6) | 32,7 / 35,4% | 55,3 / 58,3% | −22,6 / −22,9 pp | 29,9 / 27,4% | 44,7 / 41,7% | −14,8 / −14,3 |

- Com as regras novas a brecha da opção 1 dobra (+6 pp) e 16–17% das partidas normais acabam no anti-travamento (a calibração
  da partida inteira dá 16,7%). A mediana das partidas normais é 13 rodadas de Ataque.
- As opções 2 e 3 continuam fechando a brecha nos dois sentidos. A recomendação fica a mesma: **morte súbita**.

## Decisão do autor (2026-10-27)

"Nenhuma das opções. O Player que não colocar pelo menos uma carta no ataque, não terá direito de atacar e o oponente não perde a
carta de defesa. Esse efeito colateral, tartaruga, será testado mais a frente por mim após a finalização do jogo."

- Nenhuma regra nova: fica o anti-travamento em 3 rodadas com vitória por vida (na `main` desde a Fase B).
- A regra que ele descreveu é a da spec 1 §1.5, item 3 (Ataque vazio: sem ataque, nenhuma carta sai). O motor já a seguia; agora há
  um teste que confere exatamente isso (`turn-flow.test.ts`: sem `AttackDeclared`, `DamageDealt` nem `CardsRemovedFromRow`, e a
  Defesa e a vida do oponente intactas).
- Fica para o playtest do autor, com os números de hoje: +6,1 pp para quem lidera e se fecha, 16,7% de fins por anti-travamento.
- Morte súbita e empate não serão implementados.

## Depois (2026-10-30)

O autor tirou o anti-travamento do jogo (decisões, 2026-10-30, item 6). Sem ele, a tartaruga perde a única forma de vencer
parada: quem se fecha só vence por vida zerada do oponente, Exódia ou desistência. As tabelas acima medem regras que deixam de
existir e ficam como registro.
