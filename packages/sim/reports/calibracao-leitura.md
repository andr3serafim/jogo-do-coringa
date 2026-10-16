# Leitura da calibração — vida 300 (2026-10-16)

Base: `calibracao.md` / `calibracao.json` (1000 partidas por série, `greedy` × `greedy` salvo indicação, sementes pareadas). Só números e leitura da causa; propostas de regra ficam com a sessão principal e o autor.

## Duração

- Mediana de **9 rodadas de Ataque** (p10–p90: **5–13**). Meta 8–14: ok. Com vida 100 eram 4 (2–6).

## Fallen is Back e Ressurreições

- Quadra em **43,6%** das partidas (meta 10–25%; com vida 100 eram 15,3%). Partidas mais longas põem mais numéricas nas fileiras, e uma quadra de 4 iguais numa fileira de 7 fica bem mais provável.
- **Ressurreições por partida:** média **0,53**, p90 **2**, máximo **5**; **3,4%** das partidas têm 3 ou mais. No `turtle` × `greedy`: média 0,62, máximo 7, 4,7% com 3 ou mais.
- Leitura: o laço quadra → Ressurreição → quadra existe na cauda (máximos de 5–7), mas é raro. A métrica conta todas as Ressurreições e não separa as que vêm de uma quadra refeita pela própria Ressurreição; se for preciso isolar o laço, isso pede uma medição própria.

## Exódia

- **0,5%** das partidas (meta 1–3%). `random` × `random` dá 2,0% e `turtle` × `greedy` 2,1%.
- Motivo dominante, por uma análise à parte (1000 partidas `greedy` × `greedy`, vida 300): **os K são gastos como escudo**. Por partida, cerca de 4,5 K entram nas Guardas e cerca de 4 são destruídos: **76% quebram absorvendo dano**, 23% por Armadilha, ~1% por Reflect. Só em **7,6%** das partidas alguém chega a 3 K na Guarda, e em **0,7%** alguém junta 4 K (mão + Guarda). Com só 6 K no baralho divididos entre dois jogadores e um ataque por turno quebrando 1 K, a Guarda raramente acumula.
- Limite: o `greedy` joga os K assim que pode (guarda 1 para Reflect) e só segura todos quando completam a Exódia de uma vez; um jogador humano que acumule K na mão pode chegar mais vezes.

## Escolha da ordem (contrafactual)

- 200 pontos × 16 rollouts por opção: só **4,0%** dos pontos são decisivos (meta ≥ 20%). Entre os decisivos (8 pontos), ir primeiro foi melhor em 75% (meta 30–70%), com tamanho médio de 43,8 pp; a diferença média em todos os pontos é **+0,3 pp** (direção: primeiro, quase nula). O `greedy` escolhe ir primeiro em 28,5% (informativo).
- **Limites da medição:**
  - os rollouts são `greedy` × `greedy`: o `greedy` não explora a informação de quem joga em segundo (ele reage ao estado da mesa, mas não planeja a partir do que viu), então a vantagem de ir segundo tende a ser subestimada;
  - com 16 rollouts por opção, o erro padrão de cada ponto fica em torno de 0,12, então só diferenças de ~25 pp ou mais saem do ruído. "4% decisivos" quer dizer "quase nenhuma diferença grande", não "nenhuma diferença". Mais rollouts por ponto aumentariam a sensibilidade (o custo cresce linearmente).

## Nada piorou com a partida mais longa?

- **Iniciativa:** 48,9% (meta 45–55%): ok.
- **Anti-travamento:** 0,0% com a Pressão (meta < 5%): ok. **Sem a Pressão, sobe para 10,8%.**
- **Turtle pareado:**
  - com a Pressão, o líder turtle pontua **15,8 pp** (vantagem 10) e **16,2 pp** (vantagem 20) **menos** que o líder greedy: meta ok;
  - sem a Pressão, o turtle passa a pontuar **mais** que o greedy (+3,6 pp e +0,8 pp) e mais da metade das partidas dele termina no anti-travamento (525 e 552 de ~1000).
  - Com vida 300, a brecha da tartaruga ficou mais visível, e é a Pressão da mesa que a fecha.
- Todas as partidas terminam.
