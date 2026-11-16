# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 7–12–25 · 29 · 59 | 50.9% | 3.6% | 73.8% | 2.08 · 5 · 15 · 31.3% | 100.0% | 0.0% (0.0%) | 2/4 |
| random × random | 11–20–34 · 40 · 65 | 49.3% | 11.4% | 61.3% | 1.20 · 3 · 8 · 15.0% | 100.0% | 0.0% (0.0%) | 1/4 |
| turtle × greedy | 8–18–41 · 50 · 84 | 48.3% | 15.7% | 84.6% | 3.36 · 8 · 23 · 48.5% | 100.0% | 0.0% (0.0%) | 1/4 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 12 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 50.9% | 45–55% | sim |
| Exódia | 3.6% | 1–3% | NÃO |
| Fallen is Back | 73.8% | 10–25% | NÃO |

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
| Duração (mediana de rodadas de Ataque) | 18 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 48.3% | 45–55% | sim |
| Exódia | 15.7% | 1–3% | NÃO |
| Fallen is Back | 84.6% | 10–25% | NÃO |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectCanceled | Resurrected | HandLimitPenalty | CardStolen | StealDamage | Healed | DevastationCast | RowDevastated | DevastationCanceled | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 10.81 | 6.33 | 3.19 | 2.77 | 0.15 | 0.15 | 0 | 2.08 | 0.11 | 9.90 | 9.90 | 11.60 | 0.36 | 0.36 | 0 | 2.11 | 0.26 | 0.49 | 5.53 |
| random × random | 14.35 | 8.63 | 7.50 | 4.94 | 0.60 | 0.60 | 0 | 1.20 | 1.30 | 12.86 | 12.86 | 17.05 | 0.15 | 0.15 | 0 | 1.22 | 0.25 | 0.34 | 5.67 |
| turtle × greedy | 15.43 | 9.61 | 5.40 | 4.04 | 0.27 | 0.26 | 0 | 3.36 | 0.75 | 14.64 | 14.64 | 21.35 | 0.46 | 0.46 | 0 | 3.43 | 0.44 | 1.25 | 7.72 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 7–12–25 · 29 · 59 | 50.9% | 3.6% | 73.8% | 2.08 · 5 · 15 · 31.3% | 100.0% | 0.0% (0.0%) | 2/4 | 31.4% |
| sem Escolha da iniciativa | 7–13–25 · 29 · 53 | 48.1% | 3.4% | 75.4% | 2.22 · 5 · 16 · 35.3% | 100.0% | 0.0% (0.0%) | 2/4 | n/a |
| sem Coringas Selvagens | 7–12–24 · 29 · 72 | 49.2% | 4.2% | 75.0% | 2.14 · 5 · 19 · 32.1% | 100.0% | 0.0% (0.0%) | 2/4 | 29.4% |
| sem a Ressurreição da quadra | 7–12–24 · 29 · 78 | 50.7% | 2.9% | 73.8% | 1.74 · 4 · 14 · 25.5% | 100.0% | 0.0% (0.0%) | 3/4 | 31.1% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 1000 | 38.1% | 56.7% | -18.6% | sim | {"LOSS":619,"HP":270,"EXODIA":111} |
| 20 | 999 | 38.2% | 58.5% | -20.2% | sim | {"LOSS":617,"HP":265,"EXODIA":117} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 7.0% | 64.3% | -0.6% | 31.3% | 29.0% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 300 | 4–8–16 · 19 · 44 | 50.3% | 0.6% | 50.0% | 0.98 · 3 · 10 · 11.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 400 | 6–10–20 · 25 · 67 | 50.0% | 1.8% | 63.5% | 1.50 · 4 · 20 · 21.2% | 100.0% | 0.0% (0.0%) | 3/4 |
| hp 600 | 8–15–28 · 33 · 66 | 51.9% | 5.2% | 80.2% | 2.66 · 6 · 18 · 40.1% | 100.0% | 0.0% (0.0%) | 1/4 |
| hp 800 | 10–18–35 · 42 · 80 | 52.2% | 8.1% | 89.3% | 3.74 · 8 · 21 · 57.2% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 6 | 8–15–28 · 32 · 117 | 51.9% | 4.9% | 62.8% | 1.36 · 3 · 14 · 17.5% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 7 | 7–14–27 · 32 · 55 | 48.8% | 3.7% | 69.0% | 1.90 · 5 · 12 · 29.9% | 100.0% | 0.0% (0.0%) | 2/4 |
| fileira 9 | 6–11–23 · 28 · 54 | 53.5% | 2.9% | 74.3% | 2.16 · 5 · 19 · 31.7% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 10 | 6–11–22 · 25 · 53 | 52.1% | 2.7% | 74.7% | 2.26 · 5 · 26 · 32.6% | 100.0% | 0.0% (0.0%) | 3/4 |
| 6 Ás | 7–12–24 · 29 · 56 | 49.2% | 3.8% | 74.0% | 2.09 · 5 · 19 · 31.2% | 100.0% | 0.0% (0.0%) | 2/4 |
| 4 de cada figura | 7–14–27 · 32 · 63 | 52.4% | 0.7% | 84.1% | 3.16 · 7 · 21 · 49.5% | 100.0% | 0.0% (0.0%) | 2/4 |
| 8 de cada figura | 7–12–22 · 26 · 52 | 52.0% | 5.9% | 67.8% | 1.57 · 4 · 15 · 21.7% | 100.0% | 0.0% (0.0%) | 2/4 |
| 6 de cada numérica | 7–13–23 · 27 · 48 | 49.7% | 2.5% | 59.0% | 1.22 · 3 · 13 · 14.5% | 100.0% | 0.0% (0.0%) | 3/4 |
| 7 de cada numérica | 7–12–23 · 27 · 51 | 54.3% | 2.5% | 69.3% | 1.67 · 4 · 11 · 24.5% | 100.0% | 0.0% (0.0%) | 3/4 |

