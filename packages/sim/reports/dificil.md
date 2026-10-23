# Portão do Difícil

**Veredito: APROVADO.** (a) 59.0% (limiar 58.0%), (b) 65.0% (limiar 65.0%), p95 152 ms (limiar 300 ms).

> **Os números foram medidos COM a Pressão da mesa (`tablePressure: true`), que será removida no sub-projeto 5; nessa hora o portão tem que ser medido de novo, sem ela.**

## Como foi medido

- Config: a padrão, `makeConfig()` (Pressão da mesa ligada): `{"hp":300,"rowLimit":7,"buffLimit":4,"cardsPerEquip":4,"antiStallRounds":5,"exodiaGuard":4,"resurrectMinRounds":3,"deck":{"numericCopies":8,"faceCopies":6},"initiativeChoice":true,"tablePressure":true,"wildJokers":true}`.
- Sementes: `dificil-0 … dificil-99` (100 sementes), cada uma jogada duas vezes com os assentos trocados: 200 partidas por medida. O mesmo monte e a mesma iniciativa sorteada em cada par: o bot medido fica com a iniciativa em exatamente uma das duas.
- Difícil medido (`HARD_DEFAULTS`): `{"rolloutsPerCandidate":8,"maxCandidates":4,"horizon":{"EQUIP":2,"ATTACK_MAIN":3}}`.
- Máquina: Node v24.19.0, win32 x64, Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz (12 núcleos). O tempo por decisão depende dela.
- Pontuação: vitória 1, empate ½, derrota ou partida sem fim 0. Erro-padrão (EP) da taxa: sqrt(p(1−p)/n), com as partidas tratadas como independentes; a margem diz a quantos EP a taxa está do limiar. O veredito usa só os limiares.
- Tempo por decisão: do Difícil, nas partidas de (a), só nas decisões com 2 ou mais ações legais (as de uma ação só são instantâneas e puxariam o p95 para baixo). Mede a ação inteira de um passo (visão, ações legais, busca, motor). Percentil pelo posto mais próximo.

## Resultado

| Medida | Valor | EP | Limiar | Margem | Passa |
| --- | --- | --- | --- | --- | --- |
| (a) hard × greedy: pontuação do hard | 59.0% | 3.5% | ≥ 58.0% | 0.3 EP | sim |
| (b) greedy × easy: pontuação do greedy | 65.0% | 3.4% | ≥ 65.0% | 0.0 EP | sim |
| (c) p95 do tempo por decisão do hard | 152 ms |  | ≤ 300 ms |  | sim |

- (a) hard: vitórias/empates/derrotas/sem fim 118/0/82/0; com a iniciativa 54.0% (100 partidas), sem ela 64.0% (100).
- (b) greedy: vitórias/empates/derrotas/sem fim 130/0/70/0; com a iniciativa 66.0% (100 partidas), sem ela 64.0% (100).

### Tempo por decisão do hard

| Decisões (≥ 2 ações) | p50 | p95 | Máx |
| --- | --- | --- | --- |
| 5348 | 82 ms | 152 ms | 253 ms |

## Rodadas de ajuste

| Rodada | O que mudou | Rollouts | Candidatas | Horizonte (rodadas de Ataque) | (a) | (b) | p95 | Veredito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | padrão (`HARD_DEFAULTS`) | 8 | 4 | EQUIP 1, ORDER_CHOICE 1, ATTACK_MAIN 1, REACTION 1 (as outras fases: greedy, sem busca) | 53.5% ± 3.5% | 65.0% ± 3.4% | 64 ms | reprovado |
| 2 | horizonte por fase: Equipar 2, fase principal 3; ordem e reação com o greedy | 8 | 4 | EQUIP 2, ATTACK_MAIN 3 (as outras fases: greedy, sem busca) | 59.0% ± 3.5% | 65.0% ± 3.4% | 152 ms | aprovado |

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

## Por que estes valores

A rodada 2 é a primeira que aprova os três limiares; as anteriores reprovaram: rodada 1 ((a) 53.5% < 58.0%). Os valores finais são os dela.

Para repetir: `pnpm sim:dificil` (a execução completa leva alguns minutos).
