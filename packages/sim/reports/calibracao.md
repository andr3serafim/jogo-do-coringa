# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 7–12–24 · 29 · 60 | 51.3% | 1.2% | 72.7% | 1.99 · 5 · 17 · 30.0% | 100.0% | 0.0% (0.0%) | 3/4 |
| random × random | 11–21–37 · 43 · 96 | 47.7% | 11.7% | 60.6% | 1.24 · 3 · 8 · 16.9% | 100.0% | 0.0% (0.0%) | 1/4 |
| turtle × greedy | 8–19–42 · 51 · 107 | 48.5% | 7.2% | 85.8% | 3.50 · 8 · 23 · 49.9% | 100.0% | 0.0% (0.0%) | 1/4 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 12 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 51.3% | 45–55% | sim |
| Exódia | 1.2% | 1–3% | sim |
| Fallen is Back | 72.7% | 10–25% | NÃO |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 21 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 47.7% | 45–55% | sim |
| Exódia | 11.7% | 1–3% | NÃO |
| Fallen is Back | 60.6% | 10–25% | NÃO |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 19 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 48.5% | 45–55% | sim |
| Exódia | 7.2% | 1–3% | NÃO |
| Fallen is Back | 85.8% | 10–25% | NÃO |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectCanceled | Resurrected | HandLimitPenalty | CardStolen | StealDamage | Healed | DevastationCast | RowDevastated | DevastationCanceled | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 10.30 | 6.26 | 3.60 | 2.74 | 0.11 | 0.11 | 0 | 1.99 | 0.14 | 9.30 | 9.30 | 10.07 | 0.41 | 0.41 | 0 | 2.03 | 0.26 | 0.29 | 5.02 |
| random × random | 14.54 | 8.99 | 7.99 | 5.21 | 0.62 | 0.62 | 0 | 1.24 | 1.32 | 13.22 | 13.22 | 17.63 | 0.15 | 0.15 | 0 | 1.26 | 0.29 | 0.37 | 5.89 |
| turtle × greedy | 14.34 | 10.14 | 6.77 | 4.14 | 0.24 | 0.24 | 0 | 3.50 | 0.94 | 14.32 | 14.32 | 17.21 | 0.55 | 0.55 | 0 | 3.60 | 0.48 | 0.63 | 6.91 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 7–12–24 · 29 · 60 | 51.3% | 1.2% | 72.7% | 1.99 · 5 · 17 · 30.0% | 100.0% | 0.0% (0.0%) | 3/4 | 31.9% |
| sem Escolha da iniciativa | 7–13–24 · 29 · 47 | 49.1% | 2.3% | 73.9% | 2.09 · 5 · 14 · 31.4% | 100.0% | 0.0% (0.0%) | 3/4 | n/a |
| sem Coringas Selvagens | 7–12–24 · 29 · 56 | 48.3% | 2.8% | 75.0% | 2.07 · 5 · 13 · 31.6% | 100.0% | 0.0% (0.0%) | 3/4 | 30.7% |
| sem a Ressurreição da quadra | 7–12–23 · 28 · 55 | 51.8% | 1.4% | 72.7% | 1.51 · 4 · 12 · 21.4% | 100.0% | 0.0% (0.0%) | 3/4 | 32.3% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 1000 | 36.0% | 55.5% | -19.5% | sim | {"LOSS":640,"HP":313,"EXODIA":47} |
| 20 | 999 | 37.1% | 56.7% | -19.5% | sim | {"LOSS":628,"HP":327,"EXODIA":44} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 4.5% | 55.6% | -0.8% | 33.3% | 32.0% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 300 | 4–8–14 · 19 · 35 | 50.3% | 0.4% | 47.6% | 0.88 · 3 · 8 · 10.2% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 400 | 6–10–20 · 24 · 39 | 50.0% | 0.8% | 62.3% | 1.43 · 4 · 11 · 20.9% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 600 | 8–14–28 · 33 · 56 | 51.3% | 2.0% | 80.0% | 2.53 · 6 · 13 · 40.7% | 100.0% | 0.0% (0.0%) | 3/4 |
| hp 800 | 10–18–34 · 39 · 86 | 50.9% | 3.1% | 89.0% | 3.50 · 7 · 18 · 57.4% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 6 | 8–15–28 · 34 · 61 | 51.1% | 2.6% | 62.3% | 1.37 · 4 · 9 · 19.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| fileira 7 | 7–13–27 · 31 · 59 | 50.3% | 1.9% | 67.7% | 1.79 · 5 · 14 · 26.6% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 9 | 6–11–23 · 28 · 49 | 52.7% | 1.1% | 73.1% | 2.07 · 5 · 15 · 30.7% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 10 | 6–11–20 · 24 · 57 | 51.7% | 1.7% | 73.8% | 2.09 · 5 · 21 · 30.6% | 100.0% | 0.0% (0.0%) | 3/4 |
| 6 Ás | 7–12–24 · 29 · 57 | 49.0% | 2.2% | 74.6% | 2.02 · 5 · 12 · 31.1% | 100.0% | 0.0% (0.0%) | 3/4 |
| 4 de cada figura | 7–14–26 · 30 · 60 | 51.9% | 0.4% | 83.2% | 3.03 · 7 · 17 · 48.7% | 100.0% | 0.0% (0.0%) | 2/4 |
| 8 de cada figura | 7–12–23 · 27 · 52 | 51.6% | 3.7% | 64.2% | 1.46 · 4 · 14 · 21.0% | 100.0% | 0.0% (0.0%) | 2/4 |
| 6 de cada numérica | 7–12–24 · 28 · 57 | 51.6% | 1.3% | 58.0% | 1.23 · 3 · 10 · 15.9% | 100.0% | 0.0% (0.0%) | 3/4 |
| 7 de cada numérica | 7–12–23 · 28 · 56 | 53.0% | 1.6% | 67.8% | 1.66 · 4 · 10 · 24.5% | 100.0% | 0.0% (0.0%) | 3/4 |

