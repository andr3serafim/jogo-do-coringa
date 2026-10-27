# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 5–9–14 | 47.6% | 0.8% | 44.6% | 0.56 · 2 · 5 · 3.5% | 10.7% | 100.0% | 3/6 |
| random × random | 3–9–17 | 41.4% | 1.4% | 16.3% | 0.15 · 1 · 3 · 0.2% | 54.4% | 100.0% | 4/6 |
| turtle × greedy | 5–9–15 | 46.7% | 1.2% | 38.9% | 0.47 · 2 · 5 · 2.9% | 51.4% | 100.0% | 4/6 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 9 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 47.6% | 45–55% | sim |
| Exódia | 0.8% | 1–3% | NÃO |
| Fallen is Back | 44.6% | 10–25% | NÃO |
| Fim por anti-travamento | 10.7% | < 5% | NÃO |
| Partidas que terminam | 100.0% | 100% | sim |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 9 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 41.4% | 45–55% | NÃO |
| Exódia | 1.4% | 1–3% | sim |
| Fallen is Back | 16.3% | 10–25% | sim |
| Fim por anti-travamento | 54.4% | < 5% | NÃO |
| Partidas que terminam | 100.0% | 100% | sim |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 9 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 46.7% | 45–55% | sim |
| Exódia | 1.2% | 1–3% | sim |
| Fallen is Back | 38.9% | 10–25% | NÃO |
| Fim por anti-travamento | 51.4% | < 5% | NÃO |
| Partidas que terminam | 100.0% | 100% | sim |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectExpired | ReflectCanceled | ReflectProtected | Resurrected | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 9.07 | 4.17 | 5.45 | 1.20 | 0.19 | 0.18 | 0 | 0 | 0.01 | 0.56 | 0.71 | 0.05 | 0.12 | 3.02 |
| random × random | 8.00 | 4.00 | 5.49 | 1.72 | 0.26 | 0.24 | 0.00 | 0.01 | 0.01 | 0.15 | 0.21 | 0.05 | 0.08 | 1.73 |
| turtle × greedy | 8.92 | 4.43 | 5.47 | 1.28 | 0.16 | 0.15 | 0 | 0.00 | 0.01 | 0.47 | 0.63 | 0.04 | 0.10 | 2.95 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 5–9–14 | 47.6% | 0.8% | 44.6% | 0.56 · 2 · 5 · 3.5% | 10.7% | 100.0% | 3/6 | 29.2% |
| sem Escolha da iniciativa | 5–8–14 | 46.3% | 0.3% | 38.9% | 0.48 · 2 · 5 · 2.6% | 9.5% | 100.0% | 3/6 | n/a |
| sem Coringas Selvagens | 5–9–15 | 50.4% | 0.9% | 42.8% | 0.51 · 2 · 6 · 3.1% | 17.2% | 100.0% | 3/6 | 29.8% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 1000 | 61.8% | 58.7% | 3.1% | NÃO | {"ANTI_STALL":530,"HP":79,"LOSS":382,"EXODIA":8,"DRAW":1} |
| 20 | 995 | 64.9% | 64.5% | 0.4% | NÃO | {"ANTI_STALL":555,"HP":80,"LOSS":349,"EXODIA":10,"DRAW":1} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 5.5% | 54.5% | -1.0% | 31.8% | 25.0% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Anti-trav. | Terminam | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 100 | 2–4–6 | 48.0% | 0.1% | 16.3% | 0.15 · 1 · 3 · 0.2% | 1.9% | 100.0% | 4/6 |
| hp 200 | 3–6–11 | 48.8% | 0.3% | 31.1% | 0.37 · 1 · 5 · 1.6% | 6.1% | 100.0% | 2/6 |
| hp 250 | 4–8–12 | 48.1% | 0.5% | 38.3% | 0.47 · 2 · 5 · 2.5% | 8.5% | 100.0% | 3/6 |
| hp 350 | 5–9–16 | 48.0% | 1.0% | 50.1% | 0.63 · 2 · 5 · 4.4% | 13.9% | 100.0% | 4/6 |
| hp 400 | 6–10–17 | 48.4% | 1.2% | 53.1% | 0.70 · 2 · 7 · 5.3% | 16.5% | 100.0% | 4/6 |
| fileira 5 | 6–10–17 | 46.3% | 1.3% | 20.8% | 0.18 · 1 · 3 · 0.4% | 21.4% | 100.0% | 5/6 |
| fileira 6 | 5–9–16 | 48.4% | 0.5% | 35.2% | 0.39 · 1 · 6 · 1.7% | 15.7% | 100.0% | 3/6 |
| fileira 8 | 4–8–13 | 46.2% | 0.4% | 46.5% | 0.61 · 2 · 4 · 4.3% | 8.2% | 100.0% | 3/6 |
| fileira 9 | 4–7–12 | 46.2% | 0.1% | 47.5% | 0.69 · 2 · 6 · 5.4% | 5.7% | 100.0% | 2/6 |
| 4 de cada figura | 5–9–15 | 49.6% | 0.2% | 46.1% | 0.53 · 2 · 5 · 3.7% | 8.0% | 100.0% | 3/6 |
| 8 de cada figura | 5–9–15 | 50.0% | 1.3% | 36.9% | 0.45 · 1 · 6 · 2.5% | 11.3% | 100.0% | 4/6 |
| 6 de cada numérica | 5–9–15 | 49.6% | 0.8% | 26.6% | 0.29 · 1 · 4 · 1.6% | 11.5% | 100.0% | 3/6 |
| 7 de cada numérica | 5–9–14 | 46.6% | 0.5% | 34.7% | 0.39 · 1 · 5 · 1.0% | 11.3% | 100.0% | 3/6 |

