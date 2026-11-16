# Medição do Roubo com o buff da fileira (RULES_VERSION 6, 2026-11-16)

A regra: `decisoes.md` 2026-11-16 (1), item 8, e (3). Medido no worktree `.claude/worktrees/roubo`, branch `feat/roubo-buff`, sobre o
código de `e248b45` (Node 26.13, i7-10750H). Os relatórios completos: `packages/sim/reports/e3.md`, `calibracao.md` e `dificil.md`. O
"antes" é o relatório da `main` (RULES_VERSION 5).

## O Roubo em si (`pnpm sim:e3`, 1000 partidas por série, limite BURN 4)

| greedy × greedy | Antes | Depois |
| --- | --- | --- |
| Roubos por partida | 7,27 | 9,84 |
| Dano do roubo por partida | 54,3 | 199,9 |
| Cura do roubo por partida | 59,6 | 186,7 |
| Dano anulado por K | 19,5% dos roubos | não existe mais |

**O número que o autor queria ver:** o greedy que rouba contra o greedy que não rouba fez **39,5% (±3,0)**; antes, 39,2%. Não mudou.

| O greedy só rouba com valor ≥ | Antes | Depois |
| --- | --- | --- |
| 12 (o padrão) | 40,4% | 39,5% |
| 25 | 42,0% | 40,9% |
| 40 | 43,2% | 40,4% |
| 60 | 48,5% | 43,6% |

**Leitura [I]:** o Roubo ficou cerca de 3,5 vezes maior em dano e cura, mas o greedy que o usa segue perdendo para o que guarda o A. Em
todos os limiares, roubar menos é melhor. O A vale mais como Armadilha (sobretudo na janela de reação, contra o J de quem ataca, e contra
os K de quem junta Guarda) do que como Roubo. O greedy compara o Roubo só com a Armadilha da fase principal e não conta o valor de guardar
o A para a reação: parte da perda é da decisão do bot, não só da regra.

## A calibração (`pnpm sim:calibrate`)

| Medida | greedy × greedy antes | depois | turtle × greedy antes | depois |
| --- | --- | --- | --- | --- |
| Rodadas de Ataque (mediana) | 14 | 12 | 20 | 18 |
| Vitória de quem começa com a iniciativa | 52,7% | 50,9% | 49,2% | 48,3% |
| **Exódia** (meta 1–3%) | 1,9% | **3,6%** | 7,5% | **15,7%** |
| Fallen is Back (meta 10–25%, já reprovava) | 75,2% | 73,8% | 85,2% | 84,6% |

**Achado:** a Exódia quase dobrou. **[I]** O greedy passou a gastar o A no Roubo (que agora vale mais) em vez de usá-lo como Armadilha nos
K de quem junta a Guarda; com menos K destruídos, mais partidas chegam aos 4 K. No turtle × greedy (o acumulador contra o greedy) o efeito
é o maior. O random × random não mudou (11,4%).

## O portão do Difícil (`pnpm sim:dificil --recomecar`)

APROVADO na rodada 1, sem ajuste: (a) hard × greedy 67,5% (limiar 58%; antes 69,0%); (b) greedy × easy 73,5% (limiar 65%; antes 81,5%);
p95 136 ms (limiar 300 ms).

## O que o autor decide

1. **Manter a regra como está.** O Roubo ficou forte no efeito; a Exódia mais frequente vem do bot que troca a Armadilha pelo Roubo.
2. **Ensinar o bot** a não trocar a Armadilha num K pelo Roubo quando o oponente junta Guarda (mudança só no greedy, sem mexer na regra).
3. **Mexer na regra** de novo (por exemplo, o Roubo também quebrar 1 K, ou o A como Armadilha valer mais).
