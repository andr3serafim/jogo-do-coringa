# Portão do Difícil

**Veredito: APROVADO.** (a) 66.5% (limiar 58.0%), (b) 82.0% (limiar 65.0%), p95 129 ms (limiar 300 ms).

## Como foi medido

- Config: a padrão, `makeConfig()`: `{"hp":500,"rowLimit":8,"buffLimit":4,"cardsPerEquip":4,"exodiaGuard":4,"resurrectMinRounds":3,"deck":{"numericCopies":8,"faceCopies":6,"aceCopies":8},"initiativeChoice":true,"wildJokers":true,"defenseHealGuard":2,"specialLimit":{"max":4,"penalty":"BURN"}}`.
- Sementes: `dificil-0 … dificil-99` (100 sementes), cada uma jogada duas vezes com os assentos trocados: 200 partidas por medida. O mesmo monte e a mesma iniciativa sorteada em cada par: o bot medido fica com a iniciativa em exatamente uma das duas.
- Bots da rodada 1 (os `HARD_DEFAULTS` e o `EASY_BLUNDER` de então): Difícil `{"rolloutsPerCandidate":8,"maxCandidates":4,"horizon":{"EQUIP":2,"ATTACK_MAIN":3}}`; Fácil erra com probabilidade `0.7`.
- Máquina: Node v26.13.0, win32 x64, Intel(R) Core(TM) i7-10750H CPU @ 2.60GHz (12 núcleos). O tempo por decisão depende dela.
- Pontuação: vitória 1, derrota ou partida sem fim 0. Erro-padrão (EP) da taxa: sqrt(p(1−p)/n), com as partidas tratadas como independentes; a margem diz a quantos EP a taxa está do limiar. O veredito usa só os limiares.
- Tempo por decisão: do Difícil, nas partidas de (a), só nas decisões com 2 ou mais ações legais (as de uma ação só são instantâneas e puxariam o p95 para baixo). Mede a ação inteira de um passo (visão, ações legais, busca, motor). Percentil pelo posto mais próximo. O limiar vale para todas as fases; a segunda linha da tabela mostra só as fases em que há busca, que são as que o jogador espera.

## Resultado

| Medida | Valor | EP | Limiar | Margem | Passa |
| --- | --- | --- | --- | --- | --- |
| (a) hard × greedy: pontuação do hard | 66.5% | 3.3% | ≥ 58.0% | 2.5 EP | sim |
| (b) greedy × easy: pontuação do greedy | 82.0% | 2.7% | ≥ 65.0% | 6.3 EP | sim |
| (c) p95 do tempo por decisão do hard | 129 ms |  | ≤ 300 ms |  | sim |

- (a) hard: vitórias/derrotas/sem fim 133/67/0; com a iniciativa 67.0% (100 partidas), sem ela 66.0% (100).
- (b) greedy: vitórias/derrotas/sem fim 164/36/0; com a iniciativa 82.0% (100 partidas), sem ela 82.0% (100).

### Tempo por decisão do hard

| Decisões com 2 ou mais ações | Nº | p50 | p95 | Máx |
| --- | --- | --- | --- | --- |
| todas as fases | 8766 | 74 ms | 129 ms | 235 ms |
| só as fases com busca (EQUIP, ATTACK_MAIN) | 6773 | 85 ms | 132 ms | 235 ms |

## Por que estes valores

A rodada 1 já aprovou os três limiares; nenhum ajuste foi necessário.

Para medir de novo (leva alguns minutos): `pnpm sim:dificil --ajuste "<o que mudou>"` acrescenta uma rodada a este relatório; `pnpm sim:dificil --recomecar` joga o histórico fora e mede do zero. Sem uma das duas, o script se recusa a sobrescrever este relatório.
