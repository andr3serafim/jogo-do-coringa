# Portão do Difícil

**Veredito da rodada 3, a mais recente: APROVADO.** (a) 59.0% (limiar 58.0%), (b) 74.0% (limiar 65.0%), p95 198 ms (limiar 300 ms).

> **Os números foram medidos COM a Pressão da mesa (`tablePressure: true`), que será removida no sub-projeto 5; nessa hora o portão tem que ser medido de novo, sem ela.**

## Como foi medido

- Config: a padrão, `makeConfig()` (Pressão da mesa ligada): `{"hp":300,"rowLimit":7,"buffLimit":4,"cardsPerEquip":4,"antiStallRounds":5,"exodiaGuard":4,"resurrectMinRounds":3,"deck":{"numericCopies":8,"faceCopies":6},"initiativeChoice":true,"tablePressure":true,"wildJokers":true}`.
- Sementes: `dificil-0 … dificil-99` (100 sementes), cada uma jogada duas vezes com os assentos trocados: 200 partidas por medida. O mesmo monte e a mesma iniciativa sorteada em cada par: o bot medido fica com a iniciativa em exatamente uma das duas.
- Bots da rodada 3 (os `HARD_DEFAULTS` e o `EASY_BLUNDER` de então): Difícil `{"rolloutsPerCandidate":8,"maxCandidates":4,"horizon":{"EQUIP":2,"ATTACK_MAIN":3}}`; Fácil erra com probabilidade `0.7`.
- Máquina: Node v24.19.0, win32 x64, Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz (12 núcleos). O tempo por decisão depende dela.
- Pontuação: vitória 1, empate ½, derrota ou partida sem fim 0. Erro-padrão (EP) da taxa: sqrt(p(1−p)/n), com as partidas tratadas como independentes; a margem diz a quantos EP a taxa está do limiar. O veredito usa só os limiares.
- Tempo por decisão: do Difícil, nas partidas de (a), só nas decisões com 2 ou mais ações legais (as de uma ação só são instantâneas e puxariam o p95 para baixo). Mede a ação inteira de um passo (visão, ações legais, busca, motor). Percentil pelo posto mais próximo. O limiar vale para todas as fases; a segunda linha da tabela mostra só as fases em que há busca, que são as que o jogador espera.

## Resultado

| Medida | Valor | EP | Limiar | Margem | Passa |
| --- | --- | --- | --- | --- | --- |
| (a) hard × greedy: pontuação do hard | 59.0% | 3.5% | ≥ 58.0% | 0.3 EP | sim |
| (b) greedy × easy: pontuação do greedy | 74.0% | 3.1% | ≥ 65.0% | 2.9 EP | sim |
| (c) p95 do tempo por decisão do hard | 198 ms |  | ≤ 300 ms |  | sim |

- (a) hard: vitórias/empates/derrotas/sem fim 118/0/82/0; com a iniciativa 54.0% (100 partidas), sem ela 64.0% (100).
- (b) greedy: vitórias/empates/derrotas/sem fim 148/0/52/0; com a iniciativa 74.0% (100 partidas), sem ela 74.0% (100).

### Tempo por decisão do hard

| Decisões com 2 ou mais ações | Nº | p50 | p95 | Máx |
| --- | --- | --- | --- | --- |
| todas as fases | 5348 | 97 ms | 198 ms | 367 ms |
| só as fases com busca (EQUIP, ATTACK_MAIN) | 3943 | 117 ms | 207 ms | 367 ms |

## Rodadas

| Rodada | O que mudou | Rollouts | Candidatas | Horizonte | Fácil (erro) | (a) | (b) | p95 | Veredito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | inicial: os valores da Tarefa 6 (8 rollouts × 4 candidatas, horizonte de uma rodada de Ataque em toda fase) | 8 | 4 | EQUIP 1, ORDER_CHOICE 1, ATTACK_MAIN 1, REACTION 1 | 0.50 | 53.5% ± 3.5% | 65.0% ± 3.4% | 64 ms | reprovado |
| 2 | horizonte por fase: Equipar 2, fase principal 3; ordem e reação com o greedy | 8 | 4 | EQUIP 2, ATTACK_MAIN 3 | 0.50 | 59.0% ± 3.5% | 65.0% ± 3.4% | 152 ms | aprovado |
| 3 | ajuste do Fácil: EASY_BLUNDER 0,50 → 0,70; o Difícil não muda | 8 | 4 | EQUIP 2, ATTACK_MAIN 3 | 0.70 | 59.0% ± 3.5% | 74.0% ± 3.1% | 198 ms | aprovado |

Horizonte: por fase da decisão, as rodadas de Ataque que terminam no rollout, contando a atual quando a decisão é na fase principal do Ataque; a fase que não consta não busca (vale a escolha do greedy). Fácil (erro): o `EASY_BLUNDER`, a chance de jogar uma ação legal qualquer em vez da escolha do greedy.

**Rodada 2.** Antes de gastar a rodada, os valores foram escolhidos numa exploração fora do portão: hard × greedy, 400 partidas por célula (200 sementes × 2 assentos) em sementes que não são as do portão (`explora` e `explora2`), erro-padrão de cerca de 2,5 pp por célula (então diferenças de 2 a 3 pp não se distinguem). Pontuação do hard, em %:

| Variante | `explora` | `explora2` |
| --- | --- | --- |
| base: horizonte 1 em toda fase, 8 rollouts, 4 candidatas | 53,0 | |
| 24 rollouts · 8 candidatas · sempre incluir DECLARE_ATTACK/END_TURN/PASS | 52,8 · 52,8 · 53,3 | |
| só troca de ação se superar a do greedy por 15 · por 40 pontos por rollout | 54,5 · 50,5 | |
| horizonte 2 | 61,8 | 55,5 |
| horizonte 2 com 16 rollouts | 60,8 | |
| horizonte 3 · horizonte 4 | 57,5 · 53,8 | 57,3 · |
| busca só no Equipar, horizonte 1 · 2 · 3 · 4 | 50,0 · 55,0 · 52,5 · 49,8 | |
| busca só na fase principal, horizonte 1 · 2 · 3 | 52,8 · 54,0 · 57,3 | |
| busca só na ordem do ataque · só na reação (horizonte 2) | 49,8 · 48,5 | |
| Equipar 2 e fase principal 2, sem busca na ordem e na reação | 59,0 | 58,5 |
| todas as fases (Equipar 2, principal 3, ordem 2, reação 2) | 60,8 | 55,3 |
| **Equipar 2 e fase principal 3, sem busca na ordem e na reação (esta rodada)** | 62,0 | 58,3 |

Leitura: o que muda a força é o horizonte (olhar mais de uma rodada de Ataque), e não o número de rollouts nem de candidatas; a busca na ordem do ataque e na reação não melhorou nada, então elas ficam com o greedy. A melhor combinação medida (média de 60,1% em 800 partidas, erro-padrão de 1,7 pp) fica perto do limiar de 58%, sem folga confortável: esta rodada pode passar ou não só pela sorte das sementes.

**Rodada 2.** Confirmação do Difícil em sementes novas, feita depois do portão e fora dele (`--prefixo confirma --sementes 200`, 400 partidas, execução parcial que não grava; `EASY_BLUNDER` 0,50): (a) hard × greedy 60,8% ± 2,4 (243/400; 62,0% com a iniciativa e 59,5% sem), p95 172 ms (parte dela rodou junto com outra carga na máquina), máx 752 ms; (b) greedy × easy 64,0% ± 2,4 (256/400), abaixo dos 65%, o que motivou a rodada 3. Estimativa agrupada do hard (portão + confirmação): 361/600 = 60,2% ± 2,0.

**Rodada 3.** Ajuste do Fácil. Com `EASY_BLUNDER` 0,50, o (b) ficou no limiar (65,0% no portão, 64,0% nas sementes novas da rodada 2), sem margem. O valor novo foi escolhido fora do portão: greedy × easy em 400 sementes `explora-facil` × 2 assentos = 800 partidas por valor (erro-padrão de cerca de 1,6 pp), sem tocar nas sementes `dificil-*` nem `confirma`. Pontuação do greedy contra o Fácil, em %:

| `EASY_BLUNDER` | Greedy contra o Fácil (800 partidas) |
| --- | --- |
| 0,50 | 67,1 ± 1,7 |
| 0,60 | 69,3 ± 1,6 |
| 0,70 | 72,5 ± 1,6 |
| 0,80 | 76,5 ± 1,5 |

Escolhido 0,70, o menor valor com média acima de 70% (meta: margem clara sobre os 65%, com erro-padrão de até 1,7 pp). O Difícil não muda nesta rodada, e o (a) não envolve o Fácil: ele serve de verificação de determinismo (tem que repetir o resultado da rodada 2). O teste de `bots.test.ts` segue com o limiar de 65%.

## Por que estes valores

A rodada 2 é a primeira que aprova os três limiares; as anteriores reprovaram: rodada 1 ((a) 53.5% < 58.0%). Os valores do Difícil são os dela. Rodada 3 (ajuste do Fácil: EASY_BLUNDER 0,50 → 0,70; o Difícil não muda): o Difícil igual ao da rodada 2; aprovou os três limiares.

Para medir de novo (leva alguns minutos): `pnpm sim:dificil --ajuste "<o que mudou>"` acrescenta uma rodada a este relatório; `pnpm sim:dificil --recomecar` joga o histórico fora e mede do zero. Sem uma das duas, o script se recusa a sobrescrever este relatório.
