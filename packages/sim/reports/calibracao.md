# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 7–13–20 | 49.8% | 0.9% | 62.7% | 1.09 · 3 · 8 · 13.2% | 16.7% | 100.0% | 3/6 |
| random × random | 3–11–22 | 42.9% | 1.3% | 27.9% | 0.35 · 1 · 4 · 2.1% | 63.0% | 100.0% | 3/6 |
| turtle × greedy | 6–11–20 | 50.5% | 1.7% | 53.8% | 0.91 · 3 · 9 · 10.9% | 60.8% | 100.0% | 4/6 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 13 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 49.8% | 45–55% | sim |
| Exódia | 0.9% | 1–3% | NÃO |
| Fallen is Back | 62.7% | 10–25% | NÃO |
| Fim por anti-travamento | 16.7% | < 5% | NÃO |
| Partidas que terminam | 100.0% | 100% | sim |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 11 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 42.9% | 45–55% | NÃO |
| Exódia | 1.3% | 1–3% | sim |
| Fallen is Back | 27.9% | 10–25% | NÃO |
| Fim por anti-travamento | 63.0% | < 5% | NÃO |
| Partidas que terminam | 100.0% | 100% | sim |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 11 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 50.5% | 45–55% | sim |
| Exódia | 1.7% | 1–3% | sim |
| Fallen is Back | 53.8% | 10–25% | NÃO |
| Fim por anti-travamento | 60.8% | < 5% | NÃO |
| Partidas que terminam | 100.0% | 100% | sim |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectExpired | ReflectCanceled | ReflectProtected | Resurrected | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 13.45 | 6.24 | 10.21 | 1.53 | 0.27 | 0.24 | 0 | 0.00 | 0.02 | 1.09 | 1.40 | 0.07 | 0.16 | 4.31 |
| random × random | 10.12 | 5.04 | 8.72 | 1.98 | 0.36 | 0.32 | 0.00 | 0.01 | 0.01 | 0.35 | 0.43 | 0.07 | 0.08 | 1.86 |
| turtle × greedy | 12.05 | 5.89 | 9.19 | 1.40 | 0.18 | 0.17 | 0 | 0.00 | 0.01 | 0.91 | 1.15 | 0.05 | 0.17 | 3.81 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 7–13–20 | 49.8% | 0.9% | 62.7% | 1.09 · 3 · 8 · 13.2% | 16.7% | 100.0% | 3/6 | 28.7% |
| sem Escolha da iniciativa | 7–12–21 | 49.2% | 1.0% | 63.7% | 1.08 · 3 · 8 · 12.3% | 15.5% | 100.0% | 4/6 | n/a |
| sem Coringas Selvagens | 7–13–21 | 47.5% | 2.3% | 71.5% | 1.20 · 3 · 9 · 14.3% | 23.2% | 100.0% | 4/6 | 27.6% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 999 | 63.4% | 57.4% | 6.1% | NÃO | {"ANTI_STALL":595,"LOSS":364,"HP":31,"EXODIA":6,"DRAW":3} |
| 20 | 997 | 66.6% | 60.4% | 6.3% | NÃO | {"ANTI_STALL":613,"LOSS":332,"HP":44,"EXODIA":7,"DRAW":1} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 3.5% | 28.6% | -0.7% | 35.3% | 27.5% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 300 | 5–9–14 | 51.0% | 0.2% | 41.9% | 0.58 · 2 · 5 · 4.3% | 7.4% | 100.0% | 3/6 |
| hp 400 | 6–11–18 | 49.3% | 0.5% | 53.9% | 0.86 · 2 · 7 · 8.9% | 13.0% | 100.0% | 3/6 |
| hp 600 | 8–14–23 | 49.8% | 1.8% | 68.5% | 1.29 · 3 · 8 · 18.3% | 20.5% | 100.0% | 4/6 |
| hp 800 | 10–17–28 | 50.0% | 4.4% | 77.0% | 1.62 · 4 · 10 · 23.8% | 28.4% | 100.0% | 2/6 |
| fileira 6 | 8–15–25 | 49.8% | 2.6% | 46.6% | 0.58 · 2 · 5 · 5.2% | 26.0% | 100.0% | 3/6 |
| fileira 7 | 8–13–22 | 50.3% | 1.6% | 60.3% | 0.93 · 3 · 7 · 10.7% | 22.3% | 100.0% | 4/6 |
| fileira 9 | 7–12–19 | 49.9% | 0.8% | 68.9% | 1.34 · 3 · 9 · 19.0% | 12.7% | 100.0% | 3/6 |
| fileira 10 | 6–11–18 | 51.4% | 0.6% | 70.2% | 1.46 · 3 · 11 · 21.1% | 10.4% | 100.0% | 3/6 |
| 6 Ás | 6–11–19 | 47.4% | 1.9% | 66.8% | 1.03 · 3 · 7 · 11.1% | 16.9% | 100.0% | 4/6 |
| 4 de cada figura | 8–14–24 | 49.4% | 0.1% | 78.6% | 1.51 · 4 · 8 · 22.7% | 9.5% | 100.0% | 3/6 |
| 8 de cada figura | 7–12–19 | 51.8% | 2.7% | 57.2% | 0.89 · 2 · 6 · 9.3% | 18.9% | 100.0% | 4/6 |
| 6 de cada numérica | 7–14–21 | 49.1% | 0.8% | 45.2% | 0.67 · 2 · 6 · 5.7% | 15.9% | 100.0% | 3/6 |
| 7 de cada numérica | 7–13–21 | 47.8% | 1.4% | 61.3% | 0.93 · 2 · 7 · 9.7% | 18.6% | 100.0% | 4/6 |

