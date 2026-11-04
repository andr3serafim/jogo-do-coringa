# Calibração do simulador

1000 partidas por série; sementes pareadas entre variantes.

## Séries base (config padrão)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 7–14–25 · 29 · 41 | 52.7% | 1.9% | 75.2% | 2.06 · 5 · 12 · 33.2% | 100.0% | 0.0% (0.0%) | 3/4 |
| random × random | 11–20–34 · 40 · 65 | 49.1% | 11.7% | 61.1% | 1.19 · 3 · 8 · 15.0% | 100.0% | 0.0% (0.0%) | 1/4 |
| turtle × greedy | 9–20–45 · 59 · 136 | 49.2% | 7.5% | 85.2% | 3.56 · 8 · 24 · 52.4% | 100.0% | 0.0% (0.0%) | 1/4 |

### Metas — greedy × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 14 | 8–14 | sim |
| Vitória de quem começa com a iniciativa | 52.7% | 45–55% | sim |
| Exódia | 1.9% | 1–3% | sim |
| Fallen is Back | 75.2% | 10–25% | NÃO |

### Metas — random × random

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 20 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 49.1% | 45–55% | sim |
| Exódia | 11.7% | 1–3% | NÃO |
| Fallen is Back | 61.1% | 10–25% | NÃO |

### Metas — turtle × greedy

| Métrica | Valor | Meta | Ok |
| --- | --- | --- | --- |
| Duração (mediana de rodadas de Ataque) | 20 | 8–14 | NÃO |
| Vitória de quem começa com a iniciativa | 49.2% | 45–55% | sim |
| Exódia | 7.5% | 1–3% | NÃO |
| Fallen is Back | 85.2% | 10–25% | NÃO |

### Uso das mecânicas (média por partida)

| Série | BuffPlayed | GuardPlayed | TrapUsed | Sacrificed | ReflectPlayed | ReflectTriggered | ReflectCanceled | Resurrected | HandLimitPenalty | CardStolen | StealDamage | Healed | DevastationCast | RowDevastated | DevastationCanceled | QuadFormed | AbsoluteAttack | AbsoluteDefenseStarted | GuardBroken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| greedy × greedy | 12.17 | 6.65 | 6.18 | 2.56 | 0.15 | 0.15 | 0 | 2.06 | 0.11 | 7.38 | 7.38 | 8.54 | 0.41 | 0.41 | 0 | 2.10 | 0.17 | 0.34 | 5.80 |
| random × random | 14.34 | 8.63 | 7.51 | 4.94 | 0.60 | 0.60 | 0 | 1.19 | 1.30 | 12.86 | 12.86 | 17.03 | 0.15 | 0.15 | 0 | 1.21 | 0.25 | 0.34 | 5.67 |
| turtle × greedy | 19.38 | 10.55 | 11.97 | 4.05 | 0.35 | 0.35 | 0 | 3.56 | 1.33 | 10.23 | 10.23 | 16.08 | 0.58 | 0.58 | 0 | 3.61 | 0.24 | 0.61 | 9.05 |

## Regras novas liga/desliga (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok | 1º escolhido |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| padrão | 7–14–25 · 29 · 41 | 52.7% | 1.9% | 75.2% | 2.06 · 5 · 12 · 33.2% | 100.0% | 0.0% (0.0%) | 3/4 | 29.3% |
| sem Escolha da iniciativa | 7–14–25 · 29 · 49 | 49.3% | 2.6% | 75.5% | 2.07 · 5 · 13 · 32.9% | 100.0% | 0.0% (0.0%) | 3/4 | n/a |
| sem Coringas Selvagens | 7–13–24 · 28 · 48 | 48.9% | 3.2% | 77.5% | 2.15 · 5 · 15 · 31.7% | 100.0% | 0.0% (0.0%) | 2/4 | 29.1% |
| sem a Ressurreição da quadra | 7–13–25 · 29 · 47 | 52.9% | 1.4% | 75.2% | 1.78 · 4 · 11 · 27.3% | 100.0% | 0.0% (0.0%) | 3/4 | 29.0% |

## Turtle na mesma situação (desenho pareado)

O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.

| Vantagem | Ramos | Líder turtle | Líder greedy | Diferença | Meta (≤ 0) | Fins do turtle |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | 1000 | 32.5% | 54.1% | -21.6% | sim | {"HP":282,"LOSS":675,"EXODIA":43} |
| 20 | 999 | 33.0% | 57.7% | -24.6% | sim | {"HP":282,"LOSS":669,"EXODIA":48} |

## Escolha da ordem (contrafactual)

| Pontos | Decisivos | 1º melhor (entre decisivos) | Diferença média | Tamanho médio (decisivos) | Greedy escolhe 1º (info) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- |
| 200 | 3.0% | 50.0% | -1.1% | 30.2% | 26.5% | NÃO |

## Varredura (greedy × greedy)

| Série | Rodadas ATK (p10–med–p90 · p95 · máx) | Iniciativa vence | Exódia | Quadra | Ressurreições por partida (méd · p90 · máx · ≥3) | Terminam | No teto (com Def. Absoluta) | Metas ok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hp 300 | 4–8–16 · 19 · 40 | 53.2% | 0.6% | 50.9% | 1.00 · 3 · 9 · 12.4% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 400 | 6–11–21 · 25 · 41 | 52.9% | 1.3% | 66.3% | 1.54 · 4 · 11 · 23.0% | 100.0% | 0.0% (0.0%) | 3/4 |
| hp 600 | 8–16–28 · 32 · 51 | 53.5% | 2.7% | 80.0% | 2.51 · 6 · 14 · 40.9% | 100.0% | 0.0% (0.0%) | 2/4 |
| hp 800 | 10–20–36 · 41 · 58 | 54.3% | 6.1% | 89.3% | 3.61 · 7 · 17 · 56.3% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 6 | 8–16–31 · 37 · 63 | 53.4% | 4.1% | 63.5% | 1.43 · 4 · 16 · 19.7% | 100.0% | 0.0% (0.0%) | 1/4 |
| fileira 7 | 7–15–27 · 31 · 56 | 51.0% | 2.4% | 70.3% | 1.79 · 4 · 11 · 29.4% | 100.0% | 0.0% (0.0%) | 2/4 |
| fileira 9 | 7–13–23 · 27 · 45 | 52.3% | 2.1% | 76.1% | 2.24 · 5 · 12 · 35.4% | 100.0% | 0.0% (0.0%) | 3/4 |
| fileira 10 | 6–12–22 · 26 · 44 | 51.5% | 1.7% | 78.1% | 2.31 · 5 · 18 · 36.2% | 100.0% | 0.0% (0.0%) | 3/4 |
| 6 Ás | 7–13–24 · 28 · 48 | 49.4% | 3.0% | 76.6% | 2.10 · 5 · 14 · 31.1% | 100.0% | 0.0% (0.0%) | 2/4 |
| 4 de cada figura | 7–15–26 · 29 · 41 | 49.3% | 0.2% | 84.1% | 2.86 · 7 · 20 · 45.5% | 100.0% | 0.0% (0.0%) | 1/4 |
| 8 de cada figura | 7–13–25 · 28 · 49 | 53.2% | 5.8% | 69.6% | 1.60 · 4 · 17 · 22.6% | 100.0% | 0.0% (0.0%) | 2/4 |
| 6 de cada numérica | 7–13–25 · 28 · 41 | 48.2% | 1.7% | 62.9% | 1.24 · 3 · 11 · 15.8% | 100.0% | 0.0% (0.0%) | 3/4 |
| 7 de cada numérica | 7–14–25 · 28 · 44 | 51.8% | 1.6% | 70.4% | 1.72 · 4 · 12 · 26.4% | 100.0% | 0.0% (0.0%) | 3/4 |

