# Medição da Ressurreição no instante da quadra (ponto 16, bloco E)

2026-11-03, com a regra do autor no motor (`decisoes.md` 2026-11-03 (4) e (6); plano `docs/superpowers/plans/2026-11-03-ressurreicao-quadra.md`,
Tarefa 8). A medição de antes da regra, que levou ao desenho, é a `medicao-ponto-16.md`.

## 1. A contagem do uso (2.000 partidas greedy × greedy)

- **Como:** as sementes da `medicao-ponto-16.md` (`m16-0` a `m16-1999`), `DEFAULT_CONFIG`, o `runGame` do simulador com o gancho
  `onStep`, uma vez com a regra (`resurrectOnQuad: true`, o padrão) e outra sem ela (o campo ausente, a regra de antes). O greedy é o
  mesmo nas duas (o desta branch). O script ficou fora do repositório; a receita é esta: a cada passo, olhar a fase de antes
  (`RESURRECTION`, `ATTACK_MAIN`) e os eventos (`QuadFormed`, `Resurrected`, `CardsRemovedFromRow`, `OrderChosen`).
- "Fase principal parada": quem está na própria fase principal tem uma Ressurreição válida e numérica no cemitério, mas nenhuma jogada
  de Ressurreição (com a regra, só a proteção da quadra nas duas fileiras faz isso; sem ela, as duas fileiras cheias).

| O que | Sem a regra | Com a regra |
|---|---|---|
| Quadras formadas | 4.191 | 4.295 |
| Ressurreições usadas | 3.430 (81,8% das quadras) | 4.211 (98,0%) |
| Janelas abertas | — | 2.908 |
| Ressurreições na janela / guardadas na janela | — | 2.824 / 126 |
| Cadeias (duas na mesma janela) | — | 34 |
| Trocas da última carta: na janela / na fase principal | — | 1.247 / 302 |
| Fase principal parada (com Ressurreição e numérica no cemitério) | 2.686 de 6.118 (43,9%) | 183 de 1.734 (10,6%) |
| Quem usou a janela e atacou em segundo na rodada seguinte | — | 1.539 de 2.790 (55,2%) |
| Vitória de quem começou com a iniciativa | 52,0% | 52,8% |
| Exódia | 45 (2,3%) | 56 (2,8%) |
| Rodadas por partida (mediana, Equipar e Ataque) | 29 | 29 |

## 2. A calibração (`pnpm sim:calibrate`, 1.000 partidas por série)

O relatório inteiro está em `packages/sim/reports/calibracao.md`. A série nova "sem a Ressurreição da quadra" é a mesma config com o
campo desligado, nas mesmas sementes.

| Série (greedy × greedy) | Rodadas ATK (p10–med–p90) | Iniciativa vence | Exódia | Ressurreições por partida (méd · ≥3) | Metas |
|---|---|---|---|---|---|
| padrão (com a regra) | 7–14–25 | 52,7% | 1,9% | 2,06 · 33,2% | 3/4 |
| sem a Ressurreição da quadra | 7–13–25 | 52,9% | 1,4% | 1,78 · 27,3% | 3/4 |
| a calibração de 2026-10-31 (antes, com o greedy de então) | 7–13–25 | 51,1% | 1,8% | 1,74 · 28,0% | 3/4 |

A meta que falha é a de sempre ("Fallen is Back" em 75%, a meta é 10–25%): a quadra é comum com as fileiras de 8, e o autor nunca pediu
para mexer nisso.

## 3. O portão do Difícil (`pnpm sim:dificil --recomecar`)

Medido do zero (`--recomecar`, porque a regra mudou), 200 partidas por medida (`dificil-0` a `dificil-99`, assentos trocados). O
relatório inteiro, com as três rodadas, está em `packages/sim/reports/dificil.md`.

| Rodada | O Difícil | (a) hard × greedy | (b) greedy × easy | p95 por decisão |
|---|---|---|---|---|
| antes (2026-10-31, sem a regra) | horizonte EQUIP 2, ATTACK_MAIN 3 | 66,5% | 82,0% | 129 ms |
| 1 | o mesmo | 69,0% | 81,5% | 168 ms |
| 2 | com a busca também na janela (RESURRECTION 3) | 67,5% | 81,5% | 149 ms |
| 3 | de volta sem a busca na janela | 69,0% | 81,5% | 189 ms |

Limiares: (a) ≥ 58%, (b) ≥ 65%, p95 ≤ 300 ms. **Aprovado nas três.**

- **A busca na janela não ficou:** a rodada 2 pontuou menos (dentro de um erro-padrão, 3,3%), e o empate vai para a mais barata. Na janela, o
  Difícil decide como o greedy (ressuscita a opção que não piora a mesa).
- **O tempo varia de uma rodada para outra:** as pontuações são as mesmas a cada rodada (as sementes fixam tudo), mas o p95 foi de 149 a
  189 ms. A rodada 3 existiu porque uma medição da outra sessão (`medir-cena`, uns 20 s) coincidiu com o começo da rodada 1 e poderia ter
  inflado o tempo dela; a 3, sem nada mais na máquina, deu 189 ms. A variação é da máquina, não da regra. O máximo de uma decisão passou de
  235 ms para cerca de 600 ms (o limiar é do p95).

## 4. Leitura

- **O que o ponto 16 pediu, aconteceu:** a Ressurreição quase nunca fica parada (de 44% para 11% das vezes na fase principal), e 98% das
  quadras viram Ressurreição usada. A janela é usada em 96% das vezes em que abre (o greedy só guarda quando a troca pioraria a mesa).
- **O instante muda o jogo, e não só o ritmo:** 55% de quem usa a janela ataca em segundo, e agora a carta já está na mesa antes do
  golpe do outro.
- **Sem desequilibrar:** a vantagem de quem começa com a iniciativa quase não muda (52,0% → 52,8%), as partidas duram uma rodada de
  Ataque a mais na mediana (13 → 14, ainda dentro da meta de 8 a 14), e a Exódia sobe pouco (1,4% → 1,9% na calibração).
- **O Difícil segue forte:** 69,0% contra o greedy (era 66,5%), e o greedy contra o Fácil quase não muda (82,0% → 81,5%).
- **A troca é frequente:** 1.549 trocas em 2.000 partidas. A proteção da quadra ainda bloqueia nas duas fileiras em 183 vezes (o caso em
  que a Ressurreição fica guardada).
