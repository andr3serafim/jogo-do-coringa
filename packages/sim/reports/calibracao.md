# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 5–9–13 | 48.9% | 0.5% | 43.6% | 0.53 · 2 · 5 · 3.4% | 0.0% | 100.0% | 4/6 |
| random × random | 9–13–19 | 47.9% | 2.0% | 28.6% | 0.25 · 1 · 4 · 0.5% | 0.5% | 100.0% | 5/6 |
| turtle × greedy | 6–11–18 | 48.3% | 2.1% | 50.8% | 0.62 · 2 · 7 · 4.7% | 0.6% | 100.0% | 5/6 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 9 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 48.9% | 45–55% | sim |
| Exódia | 0.5% | 1–3% | NÃO |
| Fallen is Back | 43.6% | 10–25% | NÃO |
| Fim por anti-travamento | 0.0% | < 5% | sim |
| Partidas que terminam | 100.0% | 100% | sim |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 13 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 47.9% | 45–55% | sim |
| Exódia | 2.0% | 1–3% | sim |
| Fallen is Back | 28.6% | 10–25% | NÃO |
| Fim por anti-travamento | 0.5% | < 5% | sim |
| Partidas que terminam | 100.0% | 100% | sim |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 11 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 48.3% | 45–55% | sim |
| Exódia | 2.1% | 1–3% | sim |
| Fallen is Back | 50.8% | 10–25% | NÃO |
| Fim por anti-travamento | 0.6% | < 5% | sim |
| Partidas que terminam | 100.0% | 100% | sim |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectExpired | ReflectCanceled | ReflectProtected | Resurrected | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 8.70 | 4.00 | 5.20 | 1.17 | 0.19 | 0.19 | 0 | 0 | 0.01 | 0.53 | 0.69 | 0.05 | 0.12 | 2.97 |
| random × random | 11.30 | 5.66 | 8.05 | 2.65 | 0.37 | 0.34 | 0.00 | 0.01 | 0.01 | 0.25 | 0.36 | 0.08 | 0.18 | 2.99 |
| turtle × greedy | 11.03 | 5.53 | 7.14 | 1.62 | 0.20 | 0.18 | 0 | 0.00 | 0.01 | 0.62 | 0.89 | 0.09 | 0.21 | 4.21 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 5–9–13 | 48.9% | 0.5% | 43.6% | 0.53 · 2 · 5 · 3.4% | 0.0% | 100.0% | 4/6 | 30.9% |
| sem Escolha da iniciativa | 5–8–13 | 47.2% | 0.2% | 39.3% | 0.46 · 1 · 5 · 2.4% | 0.0% | 100.0% | 4/6 | n/a |
| sem Pressão da mesa | 5–9–14 | 47.8% | 0.7% | 44.8% | 0.56 · 2 · 5 · 3.5% | 10.8% | 100.0% | 3/6 | 29.3% |
| sem Coringas Selvagens | 5–9–14 | 50.0% | 0.4% | 43.8% | 0.54 · 2 · 7 · 4.2% | 0.0% | 100.0% | 4/6 | 30.7% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Pressão | Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ligada | 10 | 1000 | 42.8% | 58.6% | -15.8% | sim | {"LOSS":572,"HP":410,"EXODIA":13,"ANTI_STALL":5} |
| ligada | 20 | 999 | 47.4% | 63.7% | -16.2% | sim | {"LOSS":525,"HP":456,"EXODIA":14,"ANTI_STALL":4} |
| desligada | 10 | 1000 | 62.0% | 58.4% | 3.6% | NÃO | {"ANTI_STALL":525,"HP":86,"LOSS":380,"EXODIA":8,"DRAW":1} |
| desligada | 20 | 995 | 65.1% | 64.3% | 0.8% | NÃO | {"ANTI_STALL":552,"HP":86,"LOSS":347,"EXODIA":9,"DRAW":1} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 4.0% | 75.0% | 0.3% | 43.8% | 28.5% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 100 | 2–4–6 | 49.0% | 0.1% | 15.3% | 0.14 · 1 · 2 · 0.0% | 0.0% | 100.0% | 4/6 |
| hp 200 | 3–6–10 | 49.1% | 0.1% | 30.6% | 0.33 · 1 · 4 · 0.9% | 0.0% | 100.0% | 3/6 |
| hp 250 | 4–7–12 | 48.3% | 0.2% | 37.5% | 0.44 · 1 · 5 · 2.0% | 0.0% | 100.0% | 3/6 |
| hp 350 | 5–9–15 | 48.9% | 0.6% | 48.7% | 0.60 · 2 · 5 · 4.3% | 0.0% | 100.0% | 4/6 |
| hp 400 | 6–11–17 | 49.7% | 0.8% | 53.3% | 0.70 · 2 · 6 · 5.8% | 0.0% | 100.0% | 4/6 |
| fileira 5 | 6–10–17 | 46.6% | 0.6% | 23.2% | 0.20 · 1 · 3 · 0.9% | 0.0% | 100.0% | 5/6 |
| fileira 6 | 5–9–15 | 46.3% | 0.3% | 34.5% | 0.36 · 1 · 4 · 1.9% | 0.0% | 100.0% | 4/6 |
| fileira 8 | 4–8–13 | 47.4% | 0.1% | 45.7% | 0.58 · 2 · 5 · 3.5% | 0.0% | 100.0% | 4/6 |
| fileira 9 | 4–7–12 | 47.5% | 0.1% | 45.8% | 0.65 · 2 · 6 · 4.8% | 0.0% | 100.0% | 3/6 |
| 4 de cada figura | 5–9–14 | 49.2% | 0.1% | 45.4% | 0.53 · 2 · 6 · 3.6% | 0.0% | 100.0% | 4/6 |
| 8 de cada figura | 5–9–14 | 51.3% | 0.7% | 33.9% | 0.42 · 1 · 6 · 2.4% | 0.1% | 100.0% | 4/6 |
| 6 de cada numérica | 5–8–14 | 50.6% | 0.3% | 23.7% | 0.25 · 1 · 4 · 0.9% | 0.1% | 100.0% | 5/6 |
| 7 de cada numérica | 5–8–14 | 49.0% | 0.1% | 34.1% | 0.37 · 1 · 4 · 0.8% | 0.0% | 100.0% | 4/6 |

