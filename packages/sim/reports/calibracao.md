# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 7–13–25 · 28 · 42 | 51.1% | 1.8% | 75.2% | 1.74 · 4 · 9 · 28.0% | 100.0% | 0.0% (0.0%) | 3/4 |
| random × random | 11–20–35 · 41 · 74 | 50.6% | 13.4% | 61.1% | 0.96 · 3 · 10 · 10.6% | 100.0% | 0.0% (0.0%) | 1/4 |
| turtle × greedy | 9–19–44 · 53 · 128 | 47.6% | 7.9% | 85.2% | 2.65 · 6 · 20 · 41.8% | 100.0% | 0.0% (0.0%) | 1/4 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 13 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 51.1% | 45–55% | sim |
| Exódia | 1.8% | 1–3% | sim |
| Fallen is Back | 75.2% | 10–25% | NÃO |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 20 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 50.6% | 45–55% | sim |
| Exódia | 13.4% | 1–3% | NÃO |
| Fallen is Back | 61.1% | 10–25% | NÃO |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 19 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 47.6% | 45–55% | sim |
| Exódia | 7.9% | 1–3% | NÃO |
| Fallen is Back | 85.2% | 10–25% | NÃO |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectCanceled | Resurrected | HandLimitPenalty | CardStolen | StealDamage | Healed | DevastationCast | RowDevastated | DevastationCanceled | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 12.05 | 6.55 | 6.12 | 2.51 | 0.17 | 0.17 | 0 | 1.74 | 0.11 | 7.30 | 7.30 | 8.27 | 0.39 | 0.39 | 0 | 2.12 | 0.16 | 0.34 | 5.78 |
| random × random | 14.47 | 8.77 | 7.61 | 5.05 | 0.59 | 0.59 | 0 | 0.96 | 1.31 | 12.94 | 12.94 | 17.21 | 0.14 | 0.14 | 0 | 1.25 | 0.26 | 0.33 | 5.75 |
| turtle × greedy | 18.63 | 10.09 | 11.32 | 3.84 | 0.32 | 0.31 | 0 | 2.65 | 1.23 | 9.85 | 9.85 | 15.32 | 0.56 | 0.56 | 0 | 3.43 | 0.23 | 0.58 | 8.63 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 7–13–25 · 28 · 42 | 51.1% | 1.8% | 75.2% | 1.74 · 4 · 9 · 28.0% | 100.0% | 0.0% (0.0%) | 3/4 | 28.9% |
| sem Escolha da iniciativa | 7–14–25 · 29 · 53 | 49.2% | 3.0% | 75.5% | 1.58 · 4 · 11 · 24.1% | 100.0% | 0.0% (0.0%) | 2/4 | n/a |
| sem Coringas Selvagens | 7–13–25 · 28 · 40 | 48.7% | 3.7% | 77.5% | 1.66 · 4 · 9 · 24.9% | 100.0% | 0.0% (0.0%) | 2/4 | 29.0% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 1000 | 31.4% | 53.3% | -21.9% | sim | {"HP":268,"EXODIA":46,"LOSS":686} |
| 20 | 999 | 31.8% | 56.8% | -24.9% | sim | {"HP":277,"LOSS":681,"EXODIA":41} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 4.0% | 25.0% | -1.7% | 32.8% | 24.5% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 300 | 4–8–16 · 19 · 36 | 52.9% | 0.6% | 50.9% | 0.88 · 3 · 7 · 10.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 400 | 6–11–20 · 23 · 37 | 52.8% | 1.4% | 66.3% | 1.29 · 3 · 8 · 18.2% | 100.0% | 0.0% (0.0%) | 3/4 |
| hp 600 | 8–16–28 · 33 · 54 | 52.1% | 3.1% | 80.0% | 2.12 · 5 · 11 · 35.2% | 100.0% | 0.0% (0.0%) | 1/4 |
| hp 800 | 10–20–37 · 42 · 66 | 52.1% | 5.8% | 89.3% | 2.98 · 6 · 14 · 48.9% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 6 | 8–16–31 · 35 · 52 | 53.1% | 4.1% | 63.5% | 1.07 · 3 · 12 · 12.9% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 7 | 7–15–27 · 31 · 47 | 50.0% | 2.2% | 70.3% | 1.42 · 3 · 9 · 21.7% | 100.0% | 0.0% (0.0%) | 2/4 |
| fileira 9 | 7–13–23 · 27 · 49 | 52.9% | 2.0% | 76.1% | 1.98 · 5 · 11 · 29.2% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 10 | 6–12–21 · 24 · 41 | 52.2% | 1.6% | 78.1% | 2.09 · 5 · 14 · 33.6% | 100.0% | 0.0% (0.0%) | 3/4 |
| 6 Ás | 7–13–25 · 28 · 48 | 49.1% | 3.2% | 76.6% | 1.63 · 4 · 9 · 24.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| 4 de cada figura | 7–14–26 · 29 · 43 | 48.6% | 0.3% | 84.1% | 2.28 · 5 · 11 · 36.8% | 100.0% | 0.0% (0.0%) | 2/4 |
| 8 de cada figura | 7–13–24 · 27 · 46 | 52.6% | 5.5% | 69.6% | 1.38 · 3 · 9 · 18.8% | 100.0% | 0.0% (0.0%) | 2/4 |
| 6 de cada numérica | 7–13–24 · 29 · 51 | 47.6% | 1.3% | 62.9% | 1.17 · 3 · 10 · 14.1% | 100.0% | 0.0% (0.0%) | 3/4 |
| 7 de cada numérica | 7–14–25 · 28 · 45 | 52.9% | 1.7% | 70.4% | 1.51 · 4 · 10 · 22.7% | 100.0% | 0.0% (0.0%) | 3/4 |

