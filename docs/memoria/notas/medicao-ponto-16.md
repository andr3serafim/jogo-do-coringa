# Medição para o ponto 16 (a Ressurreição no instante da quadra)

2026-11-03, sem mudar o motor: o que a regra de hoje faz com as quadras e as Ressurreições, para o autor decidir a regra nova
(`decisoes.md` 2026-11-03 (1), ponto 16). Nada aqui está aprovado.

- **Partidas:** 2.000, greedy × greedy, `DEFAULT_CONFIG` (fileira até 8, `resurrectMinRounds` 3), sementes `m16-0` a `m16-1999`.
- **Como:** um script descartável com o `runGame` do simulador e o gancho `onStep`, lendo os eventos `QuadFormed`, `Resurrected`,
  `OrderChosen` e `CardsPlaced` (o passo da revelação do Equipar) e o tamanho das fileiras no passo da quadra. O script ficou fora do
  repositório; a receita está aqui para refazer.

| O que | Número |
|---|---|
| Quadras formadas | 4.275 (2,14 por partida) |
| Formadas na revelação do Equipar | 3.109 (72,7%) |
| Formadas por Roubo (o A traz a carta) | 916 (21,4%) |
| Formadas pela própria Ressurreição (em cadeia) | 250 (5,8%) |
| Os dois jogadores formando quadra na mesma revelação | 76 |
| Ressurreições usadas | 3.507 (82,0%); 768 nunca usadas |
| Quadras da revelação cujo dono ataca **em segundo** na rodada seguinte | 1.707 (54,9%) |
| Quadras da revelação com a fileira de Ataque cheia | 2.595 (83,5%) |
| Quadras da revelação com a fileira de Defesa cheia | 1.686 (54,2%) |
| Quadras da revelação com **as duas** fileiras cheias | 1.485 (47,8%) |
| Vezes da fase principal com Ressurreição e as duas fileiras cheias (hoje não dá para usar) | 2.894 de 6.533 (44,3%) |

**Leitura (minha, para o desenho):**
- O caso que o ponto 16 resolve é comum: quase metade das quadras da revelação nasce com as duas fileiras cheias, e hoje a Ressurreição
  fica parada até o golpe abrir uma vaga. A troca da última carta destrava esse caso.
- Mais da metade dos donos ataca em segundo: hoje eles só ressuscitam depois de levar o golpe do outro. Usar no instante da quadra põe
  a carta na Defesa **antes** do golpe. É uma mudança de força real, não só de ritmo: precisa do portão do Difícil e da calibração.
- Os dois formando quadra no mesmo passo é raro (76 em 2.000 partidas): a ordem pela iniciativa quase nunca decide, mas precisa existir.
