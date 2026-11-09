# Portão do Difícil

**Veredito da rodada 4, a mais recente: APROVADO.** (a) 69.0% (limiar 58.0%), (b) 81.5% (limiar 65.0%), p95 146 ms (limiar 300 ms).

## Como foi medido

- Config: a padrão, `makeConfig()`: `{"hp":500,"rowLimit":8,"buffLimit":4,"cardsPerEquip":4,"exodiaGuard":4,"resurrectMinRounds":3,"deck":{"numericCopies":8,"faceCopies":6,"aceCopies":8},"initiativeChoice":true,"wildJokers":true,"defenseHealGuard":2,"specialLimit":{"max":4,"penalty":"BURN"},"resurrectOnQuad":true}`.
- Sementes: `dificil-0 … dificil-99` (100 sementes), cada uma jogada duas vezes com os assentos trocados: 200 partidas por medida. O mesmo monte e a mesma iniciativa sorteada em cada par: o bot medido fica com a iniciativa em exatamente uma das duas.
- Bots da rodada 4 (os `HARD_DEFAULTS` e o `EASY_BLUNDER` de então): Difícil `{"rolloutsPerCandidate":8,"maxCandidates":4,"horizon":{"EQUIP":2,"ATTACK_MAIN":3}}`; Fácil erra com probabilidade `0.7`.
- Máquina: Node v26.13.0, win32 x64, Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz (12 núcleos). O tempo por decisão depende dela.
- Pontuação: vitória 1, derrota ou partida sem fim 0. Erro-padrão (EP) da taxa: sqrt(p(1−p)/n), com as partidas tratadas como independentes; a margem diz a quantos EP a taxa está do limiar. O veredito usa só os limiares.
- Tempo por decisão: do Difícil, nas partidas de (a), só nas decisões com 2 ou mais ações legais (as de uma ação só são instantâneas e puxariam o p95 para baixo). Mede a ação inteira de um passo (visão, ações legais, busca, motor). Percentil pelo posto mais próximo. O limiar vale para todas as fases; a segunda linha da tabela mostra só as fases em que há busca, que são as que o jogador espera.

## Resultado

| Medida | Valor | EP | Limiar | Margem | Passa |
| --- | --- | --- | --- | --- | --- |
| (a) hard × greedy: pontuação do hard | 69.0% | 3.3% | ≥ 58.0% | 3.4 EP | sim |
| (b) greedy × easy: pontuação do greedy | 81.5% | 2.7% | ≥ 65.0% | 6.0 EP | sim |
| (c) p95 do tempo por decisão do hard | 146 ms |  | ≤ 300 ms |  | sim |

- (a) hard: vitórias/derrotas/sem fim 138/62/0; com a iniciativa 72.0% (100 partidas), sem ela 66.0% (100).
- (b) greedy: vitórias/derrotas/sem fim 163/37/0; com a iniciativa 84.0% (100 partidas), sem ela 79.0% (100).

### Tempo por decisão do hard

| Decisões com 2 ou mais ações | Nº | p50 | p95 | Máx |
| --- | --- | --- | --- | --- |
| todas as fases | 8886 | 81 ms | 146 ms | 304 ms |
| só as fases com busca (EQUIP, ATTACK_MAIN) | 6776 | 94 ms | 152 ms | 304 ms |

## Rodadas

| Rodada | O que mudou | Rollouts | Candidatas | Horizonte | Fácil (erro) | (a) | (b) | p95 | Veredito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | inicial | 8 | 4 | EQUIP 2, ATTACK_MAIN 3 | 0.70 | 69.0% ± 3.3% | 81.5% ± 2.7% | 168 ms | aprovado |
| 2 | a busca na janela da Ressurreição (horizonte 3) | 8 | 4 | EQUIP 2, RESURRECTION 3, ATTACK_MAIN 3 | 0.70 | 67.5% ± 3.3% | 81.5% ± 2.7% | 149 ms | aprovado |
| 3 | de volta sem a busca na janela (a rodada 2 pontuou menos), numa máquina sem outra medição | 8 | 4 | EQUIP 2, ATTACK_MAIN 3 | 0.70 | 69.0% ± 3.3% | 81.5% ± 2.7% | 189 ms | aprovado |
| 4 | a sequência da iniciativa no estado (bloco C), sem mudança de regra | 8 | 4 | EQUIP 2, ATTACK_MAIN 3 | 0.70 | 69.0% ± 3.3% | 81.5% ± 2.7% | 146 ms | aprovado |

Horizonte: por fase da decisão, as rodadas de Ataque que terminam no rollout, contando a atual quando a decisão é na fase principal do Ataque; a fase que não consta não busca (vale a escolha do greedy). Fácil (erro): o `EASY_BLUNDER`, a chance de jogar uma ação legal qualquer em vez da escolha do greedy.

## Por que estes valores

A rodada 1 já aprovou os três limiares; nenhum ajuste foi necessário. Rodada 2 (a busca na janela da Ressurreição (horizonte 3)): o Difícil diferente ao da rodada 1; aprovou os três limiares. Rodada 3 (de volta sem a busca na janela (a rodada 2 pontuou menos), numa máquina sem outra medição): o Difícil igual ao da rodada 1; aprovou os três limiares. Rodada 4 (a sequência da iniciativa no estado (bloco C), sem mudança de regra): o Difícil igual ao da rodada 1; aprovou os três limiares.

Para medir de novo (leva alguns minutos): `pnpm sim:dificil --ajuste "<o que mudou>"` acrescenta uma rodada a este relatório; `pnpm sim:dificil --recomecar` joga o histórico fora e mede do zero. Sem uma das duas, o script se recusa a sobrescrever este relatório.
