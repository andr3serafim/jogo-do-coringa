# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 7–14–23 · 28 · 42 | 49.2% | 1.6% | 67.5% | 1.24 · 3 · 10 · 15.7% | 100.0% | 0.0% (0.0%) | 3/4 |
| random × random | 13–21–35 · 40 · 72 | 49.6% | 6.9% | 58.0% | 0.85 · 2 · 8 · 8.4% | 100.0% | 0.0% (0.0%) | 1/4 |
| turtle × greedy | 10–22–64 · 84 · 200 | 50.7% | 25.5% | 82.5% | 3.18 · 8 · 33 · 40.0% | 99.8% | 0.2% (0.0%) | 1/4 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 14 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 49.2% | 45–55% | sim |
| Exódia | 1.6% | 1–3% | sim |
| Fallen is Back | 67.5% | 10–25% | NÃO |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 21 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 49.6% | 45–55% | sim |
| Exódia | 6.9% | 1–3% | NÃO |
| Fallen is Back | 58.0% | 10–25% | NÃO |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 22 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 50.7% | 45–55% | sim |
| Exódia | 25.5% | 1–3% | NÃO |
| Fallen is Back | 82.5% | 10–25% | NÃO |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectExpired | ReflectCanceled | ReflectProtected | Resurrected | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 15.00 | 6.95 | 11.67 | 1.68 | 0.29 | 0.26 | 0 | 0.00 | 0.02 | 1.24 | 1.63 | 0.08 | 0.19 | 4.88 |
| random × random | 19.49 | 9.74 | 17.93 | 4.30 | 0.71 | 0.64 | 0.00 | 0.02 | 0.03 | 0.85 | 1.11 | 0.16 | 0.28 | 3.63 |
| turtle × greedy | 28.58 | 13.74 | 24.90 | 4.08 | 0.25 | 0.21 | 0 | 0.00 | 0.03 | 3.18 | 4.22 | 0.14 | 0.84 | 8.37 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 7–14–23 · 28 · 42 | 49.2% | 1.6% | 67.5% | 1.24 · 3 · 10 · 15.7% | 100.0% | 0.0% (0.0%) | 3/4 | 29.3% |
| sem Escolha da iniciativa | 7–13–23 · 26 · 45 | 49.0% | 1.6% | 66.2% | 1.20 · 3 · 13 · 14.6% | 100.0% | 0.0% (0.0%) | 3/4 | n/a |
| sem Coringas Selvagens | 8–15–26 · 30 · 47 | 47.6% | 4.4% | 75.8% | 1.42 · 3 · 10 · 18.9% | 100.0% | 0.0% (0.0%) | 1/4 | 29.3% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 1000 | 29.7% | 54.7% | -25.0% | sim | {"HP":150,"LOSS":702,"EXODIA":147,"UNFINISHED":1} |
| 20 | 1000 | 31.6% | 58.5% | -26.9% | sim | {"HP":161,"LOSS":682,"EXODIA":155,"UNFINISHED":2} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 2.0% | 50.0% | 0.4% | 35.9% | 25.0% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 300 | 5–9–16 · 18 · 32 | 51.0% | 0.4% | 44.5% | 0.63 · 2 · 7 · 5.4% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 400 | 6–11–20 · 23 · 36 | 48.2% | 0.9% | 57.8% | 0.97 · 3 · 7 · 11.3% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 600 | 8–16–28 · 32 · 46 | 48.4% | 2.8% | 74.2% | 1.50 · 4 · 10 · 22.6% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 800 | 11–21–35 · 40 · 62 | 48.7% | 7.4% | 83.9% | 2.01 · 5 · 10 · 31.8% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 6 | 9–18–30 · 34 · 47 | 49.2% | 4.7% | 53.9% | 0.70 · 2 · 7 · 6.3% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 7 | 8–15–26 · 30 · 50 | 51.9% | 2.8% | 65.3% | 1.04 · 3 · 7 · 12.3% | 100.0% | 0.0% (0.0%) | 2/4 |
| fileira 9 | 7–13–22 · 25 · 43 | 50.6% | 1.4% | 72.2% | 1.48 · 4 · 9 · 22.0% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 10 | 6–12–20 · 23 · 40 | 52.1% | 1.2% | 72.0% | 1.60 · 4 · 13 · 23.5% | 100.0% | 0.0% (0.0%) | 3/4 |
| 6 Ás | 6–12–22 · 26 · 44 | 48.0% | 3.3% | 70.2% | 1.17 · 3 · 8 · 13.8% | 100.0% | 0.0% (0.0%) | 2/4 |
| 4 de cada figura | 8–15–26 · 29 · 46 | 50.2% | 0.2% | 80.4% | 1.61 · 4 · 8 · 25.1% | 100.0% | 0.0% (0.0%) | 1/4 |
| 8 de cada figura | 7–13–24 · 27 · 40 | 51.5% | 4.3% | 61.1% | 1.02 · 3 · 8 · 12.0% | 100.0% | 0.0% (0.0%) | 2/4 |
| 6 de cada numérica | 7–14–25 · 28 · 41 | 50.2% | 1.2% | 48.7% | 0.78 · 2 · 6 · 8.2% | 100.0% | 0.0% (0.0%) | 3/4 |
| 7 de cada numérica | 8–14–25 · 28 · 43 | 48.7% | 1.8% | 64.6% | 1.09 · 3 · 7 · 14.0% | 100.0% | 0.0% (0.0%) | 3/4 |

