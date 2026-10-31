# Medição do bloco E3 + F2 + F3 (plano 1)

Relatório completo: `packages/sim/reports/e3.md` (gerado por `pnpm sim:e3`, 1000 partidas por série, sementes pareadas). Aqui fica
a leitura que vai ao autor, com a recomendação. Medido em 2026-10-31, na branch `feat/regras-e3`, com as regras novas no motor:
Reflect reativo, Devastação, Roubo, cura passiva e o limite de especiais com as três formas.

## 1. A forma da penalidade do limite (a decisão que é do autor)

Os bots de sempre jogam os K assim que podem: com eles, a Exódia nunca sai da mão, e as três formas quase não mudam nada
(greedy × greedy: Exódia de 2,0% a 2,2%; turtle × greedy: de 10,0% a 11,9%). Para medir o caso que o autor descreveu ("o player
fica juntando K até fazer o exódia"), entrou um bot **acumulador**: o greedy que só põe K na Guarda quando fecha a Exódia de uma
vez. Contra o greedy:

| Limite | Exódia | Pontos do acumulador |
| --- | --- | --- |
| sem limite | 29,7% | 59,2% |
| **BURN 4** | **18,6%** | **45,8%** |
| CHOOSE 4 | 29,1% | 52,3% |
| FEWER 4 | 29,4% | 59,2% |
| BURN 3 | 0,3% | 14,1% |
| CHOOSE 3 | 0,5% | 12,3% |

- Sem limite, acumular K **compensa**: o acumulador vence 59% e chega à Exódia em quase 30% das partidas. A preocupação do autor
  se confirma.
- **BURN 4** é a única forma com limite 4 que faz acumular **deixar de compensar** (46%, abaixo do greedy).
- **CHOOSE 4** quase não muda: o jogador escolhe descartar outras cartas e guarda os K. E toda vez pede uma tela a mais de
  descarte.
- **FEWER 4** não muda nada: compra menos, mas a mão não tem teto.
- **Com limite 3**, a Exódia da mão some (0,3%) e acumular vira suicídio (14%). Mas a mão passa a caber só um Reflect ou uma
  Devastação inteiros, sem nenhuma outra carta.
- **Recomendação: BURN com limite 4.** É a mais simples (sem decisão nem tela a mais; a carta que passaria do limite vai direto
  ao cemitério), é a única de limite 4 que tira a vantagem de acumular, e mantém Reflect e Devastação com folga na mão. Se o autor
  quiser acabar de vez com a Exódia vinda da mão, a alternativa é **BURN 3**.
- **Risco anotado da BURN:** com a mão cheia de especiais que o jogador não usa, toda especial nova queima. Num perfil artificial
  (só joga J e Q) a partida travou; um jogador de verdade sempre pode jogar K e o A, então o risco é pequeno.

## 2. O Roubo vale menos que guardar o A para a Armadilha

- O greedy que rouba perde para o que não rouba: **38,3% (±3,0)**. Roubando só quando o Roubo vale mais (limiares de 12 a 60), a
  melhor marca é **48,7%**: nenhum limiar passa de 50%. O A guardado para a Armadilha (na reação a um ataque ou a um K) vale mais
  que o Roubo, com as regras de hoje (o dano não conta para a iniciativa, não mata e um K anula).
- O K anula pouco do Roubo de ♣ ♠: **7% a 9%** dos roubos pretos dos bots (26% no aleatório). O K não torna o roubo preto inútil.
- Roubos por partida: 6,7 (greedy × greedy), 9,8 (turtle × greedy). Dano do roubo: ~27 de vida por partida; cura do roubo: ~30.
- **Leitura:** a regra é coerente, mas é a jogada mais fraca do A. Recomendo manter como está e olhar no playtest; se o autor
  quiser o Roubo mais forte, a alavanca natural é uma das três restrições dele (o dano contar para a iniciativa, por exemplo).

## 3. O resto, sem alarme

- **Duração:** greedy × greedy com mediana de 14 rodadas de Ataque (igual à E1); turtle × greedy, 21. **Nenhuma partida chegou
  ao teto** de 400 rodadas em nenhuma série.
- **Exódia:** turtle × greedy caiu de 25,5% (E1) para ~12% com as regras novas (o A e a Devastação a quebram mais); greedy ×
  greedy, ~2%.
- **Devastação:** neutra no pareado (**49,0% ±3,1**); 0,4 por partida no greedy, quase nunca refletida.
- **Reflect:** pouco usado (0,15 por partida no greedy, 0,5 no turtle); Reflect contra Reflect quase nunca.
- **Cura passiva:** não muda a duração nem o teto (ligada e desligada, as mesmas medianas). Ela acontece em 30% das partidas do
  greedy (63% com o turtle), com ~15 de vida por partida (63 com o turtle). A parte da troca do Equipar é pequena (~2 por partida;
  ~9 com o turtle). **A "fazenda de cura" não apareceu.**

## 4. As leituras [I] do plano 1 (para o autor confirmar)

1. O Roubo não abre janela de reação (a Armadilha não responde a ele).
2. O Roubo pega qualquer numérica, em qualquer posição da fileira.
3. A cura conta os K quando a carta chega ao cemitério: com exatamente 2 K e um ataque absorvido, sobra 1 K e não cura.
4. A troca da última da Defesa no Equipar cura (medido: pouco).
5. Reflect contra Reflect na Devastação: nada acontece, as 9 cartas vão ao cemitério e quem lançou segue no turno.
6. A Devastação refletida contra quem está sob Defesa Absoluta é anulada.
7. A Devastação exige a fileira-alvo com carta.
8. O Reflect contra um atacante sob Defesa Absoluta segura o golpe, sem devolver dano nem quebrar Q e K (já era [I]).
9. Na CHOOSE, no tempo esgotado saem as especiais compradas por último.
10. Na FEWER, quem tem mais especiais que o limite compra `4 − excesso`.

## 5. Remedição depois das respostas de 2026-10-31 (BURN 4 no padrão, o Roubo sem naipe)

Mesmo `pnpm sim:e3` (1000 partidas por série), com o Roubo novo (todo roubo dá dano e cura) e o bot avaliando os dois efeitos.
Relatório em `packages/sim/reports/e3.md`. A parada combinada (`decisoes.md` 2026-10-31 (8)) **não disparou**.

- **O Roubo continua a jogada mais fraca do A:** o greedy que rouba vence **39,2% (±3,0)** contra o que não rouba (antes, 38,3%).
  Roubando só acima de um limiar, a melhor marca é 48,5% (limiar 60, quase nunca roubar). Cada roubo agora mexe ~15 de vida (o
  dano médio de ~54 e a cura de ~60 por partida, em ~7 roubos), mas o A guardado para a Armadilha contra um K da Guarda (que
  absorve um ataque inteiro) vale mais. O K anula o dano em 19% a 29% dos roubos. **Leitura:** a regra é a que o autor pediu e
  fica; vai a ele como aviso. Se ele quiser o Roubo competitivo, as alavancas são o dano contar para a iniciativa, o K não
  anular, ou o Roubo valer o dobro.
- **Duração e teto sem mudança:** greedy × greedy com mediana de 13 a 14 rodadas de Ataque, turtle × greedy de 19 a 21; nenhuma
  partida no teto.
- **BURN 4 contra o acumulador de K:** o acumulador vence 44,7% e chega à Exódia em 20,6% (sem limite: 56,2% e 29,6%). A BURN
  segue a única forma de limite 4 que faz acumular deixar de compensar.
- **Queimadas:** 0,1 por partida no greedy; 1,8 no turtle e 1,6 no aleatório, que seguram especiais.
- **O resto:** a Devastação segue neutra (49,7%); a cura passiva não muda a duração; a Exódia do turtle × greedy fica em ~10%.

## 6. Portão do Difícil e calibração nas regras finais do bloco (2026-10-31)

- **Portão do Difícil, do zero (`pnpm sim:dificil --recomecar`): APROVADO** na rodada 1. (a) hard × greedy 66,5% (limiar 58%),
  (b) greedy × easy 82,0% (limiar 65%), p95 129 ms por decisão (limiar 300 ms).
- **Calibração (`pnpm sim:calibrate`):** as mesmas metas passam e as mesmas falham de antes (greedy × greedy 3/4; random e turtle
  1/4; a escolha da ordem segue sem pontos decisivos suficientes, 4% contra a meta de 20%). O que mudou: a Exódia do turtle ×
  greedy caiu de 25,5% para 7,9% (o limite e o A a quebram), a do random × random subiu de 6,9% para 13,4% (o aleatório não gasta
  K de propósito e a mão cheia de K fica), a quadra ("Fallen is Back") subiu de 67,5% para 75,2% no greedy (o Roubo põe numéricas
  nas fileiras do ladrão). Duração: mediana 13 (greedy), 20 (random), 19 (turtle); nada no teto.
