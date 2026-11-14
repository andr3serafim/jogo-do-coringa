# Bloco D do playtest: as telas e a medição (2026-11-14)

Branch `feat/playtest-bloco-d` (o código em `6359b60`), contra a `main` em `8368eb1`. O plano:
`docs/superpowers/plans/2026-11-14-playtest-bloco-d.md`.

## As quatro telas (treino, semente `e2e2631`, nível Médio; um script temporário do Playwright, fora do git)

| Tela | Faixa do centro na `main` | Na branch | Os campos rolam mais? |
|---|---|---|---|
| 360 × 640 | 88 px (o conteúdo quebrava em duas linhas) | 67 px | não (rolavam antes, e seguem) |
| 390 × 844 | — | 66 px | não: no Ataque os campos cabem inteiros |
| 1366 × 657 | 70 px | 68 px | não |
| 1440 × 900 | 70 px | 68 px | não: no Ataque os campos cabem inteiros, como antes |

- A primeira versão tinha a faixa do PC com 96 px, e os campos passaram a rolar em 1440 × 900 (antes cabiam). Por isso a faixa do PC ficou
  compacta nas duas alturas: cartas de 31 × 44 na faixa, lápide de 146 × 60.
- Nenhuma tela rola de lado. Nenhum botão da barra ou dos painéis mede menos de 44 × 44 px (os selos: 44 de largura no mínimo, 48 de altura).
- A lápide: 112 × 54 px no celular, 146 × 60 no PC.
- **Já era assim na `main`:** em 1366 × 657 e em 1440 × 900, no Ataque, a mão sobe 3 px ao respirar e o `main` da mesa mede 1 a 3 px a mais que
  a janela; não é do bloco.

## A medição A/B (a mesma sessão, CPU 4×, Cordel, 3 repetições, quadros/s; a branch medida antes, depois a `main`)

Fixture `exodia-devastacao`.

| Cena | Tela | `main` | branch |
|---|---|---|---|
| Devastação (210→211, 3,2 s) | 360 | 58, 57, 57 | 56, 56, 59 |
| | 1366 | 58, 56, 55 | 55, 56, 56 |
| Troca de mão (236→237, 3 s) | 360 | 59, 57, 57 | 56, 55, 55 · de novo: 55, 56, 54 |
| | 1366 | 54, 55, 54 | 53, **48**, 53 · de novo: 52, 52, 52 |

- **Passa o portão** (≥ 50 quadros/s) nas medianas das quatro. **Custa ~2 quadros/s** na troca de mão (53 → 52 a 1366; 57 → 55 a 360); uma
  repetição isolada deu 48 a 1366, e a série repetida deu 52, 52, 52.
- **Não investigado:** de onde vêm os ~2 quadros/s. O replay não tem a barra de ação (os carimbos não entram nesta medida): o que mudou ali
  é a faixa (a pilha do monte, a lápide com gradiente e sombras) e o ponto de onde a compra voa (o centro do monte mudou de lugar).
- A arte (Bestiário, Celestial) não foi medida neste bloco: nada das cartas mudou. A troca de mão com arte a 1366 já ficava em 47–48 na
  `main` (`medicao-devastacao-estilo.md`); com os ~2 quadros/s a menos, convém medir antes do merge se isso importar.
