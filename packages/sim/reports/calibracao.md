# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 7–12–23 · 27 · 114 | 51.8% | 1.3% | 72.7% | 1.94 · 5 · 13 · 30.0% | 100.0% | 0.0% (0.0%) | 3/4 |
| random × random | 11–20–34 · 40 · 65 | 49.3% | 11.4% | 61.3% | 1.20 · 3 · 8 · 15.0% | 100.0% | 0.0% (0.0%) | 1/4 |
| turtle × greedy | 8–19–42 · 52 · 103 | 48.2% | 6.3% | 85.2% | 3.45 · 8 · 25 · 48.2% | 100.0% | 0.0% (0.0%) | 1/4 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 12 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 51.8% | 45–55% | sim |
| Exódia | 1.3% | 1–3% | sim |
| Fallen is Back | 72.7% | 10–25% | NÃO |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 20 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 49.3% | 45–55% | sim |
| Exódia | 11.4% | 1–3% | NÃO |
| Fallen is Back | 61.3% | 10–25% | NÃO |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 19 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 48.2% | 45–55% | sim |
| Exódia | 6.3% | 1–3% | NÃO |
| Fallen is Back | 85.2% | 10–25% | NÃO |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectCanceled | Resurrected | HandLimitPenalty | CardStolen | StealDamage | Healed | DevastationCast | RowDevastated | DevastationCanceled | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 10.56 | 6.22 | 3.51 | 2.73 | 0.15 | 0.14 | 0 | 1.94 | 0.11 | 9.22 | 9.22 | 10.04 | 0.35 | 0.35 | 0 | 1.98 | 0.25 | 0.47 | 5.05 |
| random × random | 14.35 | 8.63 | 7.50 | 4.94 | 0.60 | 0.60 | 0 | 1.20 | 1.30 | 12.86 | 12.86 | 17.05 | 0.15 | 0.15 | 0 | 1.22 | 0.25 | 0.34 | 5.67 |
| turtle × greedy | 15.63 | 10.18 | 7.01 | 4.28 | 0.28 | 0.27 | 0 | 3.45 | 0.77 | 13.96 | 13.96 | 17.18 | 0.47 | 0.47 | 0 | 3.52 | 0.41 | 1.30 | 7.12 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 7–12–23 · 27 · 114 | 51.8% | 1.3% | 72.7% | 1.94 · 5 · 13 · 30.0% | 100.0% | 0.0% (0.0%) | 3/4 | 31.5% |
| sem Escolha da iniciativa | 7–13–23 · 28 · 47 | 47.4% | 1.8% | 74.1% | 2.04 · 5 · 14 · 31.9% | 100.0% | 0.0% (0.0%) | 3/4 | n/a |
| sem Coringas Selvagens | 7–12–23 · 29 · 76 | 48.5% | 2.4% | 74.6% | 2.02 · 5 · 17 · 30.8% | 100.0% | 0.0% (0.0%) | 3/4 | 29.6% |
| sem a Ressurreição da quadra | 7–12–23 · 28 · 55 | 52.1% | 1.5% | 72.7% | 1.60 · 4 · 10 · 23.4% | 100.0% | 0.0% (0.0%) | 3/4 | 31.6% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 1000 | 32.9% | 57.2% | -24.3% | sim | {"LOSS":671,"HP":286,"EXODIA":43} |
| 20 | 999 | 34.1% | 58.9% | -24.7% | sim | {"LOSS":658,"HP":295,"EXODIA":46} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 6.5% | 53.8% | -2.0% | 32.7% | 29.0% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 300 | 4–8–15 · 19 · 39 | 50.4% | 0.3% | 47.8% | 0.89 · 2 · 9 · 9.6% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 400 | 6–10–20 · 24 · 43 | 51.1% | 0.7% | 62.4% | 1.39 · 4 · 9 · 20.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 600 | 8–14–27 · 31 · 114 | 52.9% | 2.0% | 79.4% | 2.45 · 6 · 18 · 39.2% | 100.0% | 0.0% (0.0%) | 3/4 |
| hp 800 | 10–18–34 · 40 · 118 | 52.3% | 2.9% | 89.5% | 3.45 · 7 · 19 · 56.8% | 100.0% | 0.0% (0.0%) | 2/4 |
| fileira 6 | 8–15–28 · 32 · 69 | 49.5% | 2.5% | 61.8% | 1.31 · 3 · 9 · 17.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| fileira 7 | 7–13–26 · 32 · 63 | 48.5% | 1.4% | 66.8% | 1.75 · 4 · 13 · 26.0% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 9 | 6–11–22 · 27 · 50 | 52.7% | 1.8% | 73.5% | 2.03 · 5 · 16 · 30.6% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 10 | 6–11–20 · 25 · 47 | 51.1% | 1.4% | 73.6% | 2.08 · 5 · 16 · 31.6% | 100.0% | 0.0% (0.0%) | 3/4 |
| 6 Ás | 7–12–23 · 29 · 76 | 48.7% | 2.4% | 73.5% | 1.95 · 5 · 15 · 29.3% | 100.0% | 0.0% (0.0%) | 3/4 |
| 4 de cada figura | 7–14–26 · 30 · 60 | 51.5% | 0.1% | 83.1% | 2.95 · 7 · 17 · 48.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| 8 de cada figura | 7–12–22 · 25 · 51 | 51.9% | 2.8% | 65.2% | 1.45 · 4 · 16 · 19.5% | 100.0% | 0.0% (0.0%) | 3/4 |
| 6 de cada numérica | 7–12–22 · 26 · 57 | 51.4% | 0.8% | 56.8% | 1.12 · 3 · 10 · 14.4% | 100.0% | 0.0% (0.0%) | 2/4 |
| 7 de cada numérica | 7–12–23 · 28 · 56 | 54.3% | 1.5% | 67.5% | 1.61 · 4 · 12 · 23.8% | 100.0% | 0.0% (0.0%) | 3/4 |

