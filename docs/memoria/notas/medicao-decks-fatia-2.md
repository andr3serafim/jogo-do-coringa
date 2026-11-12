# Medição da fatia 2 dos decks (o dono por lado)

Plano `docs/superpowers/plans/2026-11-12-decks-fatia-2.md`, Task 6, escolha **G7**: o portão é **relativo**. O que conta é quanto a arte perde
para o Cordel na mesma rodada alternada, comparado com o que ela já perde na `main`; passa se a perda de cada cena, em cada largura, não
crescer mais de 2 quadros/s.

- **Como:** `packages/web/e2e/medir-cena.ts` (`medir.config.ts`), a CPU 4× mais lenta, a fixture `exodia-devastacao`: a troca de mão
  (rodada 47, passo 236→237, `MEDIR_MS=3000`) e a Devastação (rodada 43, passo 210→211, `MEDIR_MS=3200`). As aparências alternadas numa
  build só (`MEDIR_APARENCIAS`), 3 repetições cada, nas duas larguras (1366 × 768 e 360 × 640). **Na tomada** (`Win32_Battery.BatteryStatus`
  = 2 nas três rodadas). Os números crus estão em `.superpowers/medicao-decks-fatia-2/` (nesta máquina, fora do git).
- **A arte da branch:** você Bestiário + Egípcio, o Bot Celestial + Egípcio (`MEDIR_APARENCIA=bestiario:egipcio/celestial:egipcio`, gravada
  na partida da fixture: G3). **A da `main`:** Bestiário + Egípcio dos dois lados, pela preferência (a F4 da fatia 1, que o `medir-cena.ts` da
  `main` grava em `coringa:prefs`). O número de cartas com arte na mesa é o mesmo; a branch acrescenta os dois retratos do Anúbis e os versos
  com a cor do deck.

## Rodada 1 (só a branch)

Medianas de 3, em quadros/s (Cordel → arte, e a perda):

| Cena | Largura | Branch | Perda da `main` (fatia 1, outro dia) | Cresceu |
|---|---|---|---|---|
| Troca de mão | PC | 54 → 45 (9) | ~6 | **+3** |
| Troca de mão | 360 | 58 → 52 (6) | ~3 | **+3** |
| Devastação | PC | 54 → 52 (2) | ~0 | +2 |
| Devastação | 360 | 59 → 52 (7) | ~8 | −1 |

A troca de mão passou da tolerância por 1. Como o plano manda, antes de seguir: achar a causa.

## Rodada 2 (a causa: o retrato?)

**A hipótese:** na troca de mão a iniciativa muda de dono; a espada voa entre os retratos, e a moldura de ouro tem uma transição de
`box-shadow` de 250 ms que repinta o retrato (agora uma imagem) a cada quadro. Na Devastação a iniciativa não muda, e ela não piorou.
**O teste:** a troca de mão com os dois decks e o Bufão dos dois lados (sem retrato) contra os dois decks com o Egípcio (com ele).

| Largura | Cordel | 2 decks + Bufão | 2 decks + Egípcio |
|---|---|---|---|
| PC | 54 (54, 56, 54) | 49 (49, 49, 49) | 48 (46, 48, 48) |
| 360 | 57 (57, 59, 57) | 53 (53, 53, 54) | 53 (53, 52, 54) |

O retrato custa ~1 quadro/s no PC e nada no celular. Nesta rodada, a perda da arte com o Egípcio foi 6 no PC e 4 a 360: dentro. Somando as
duas rodadas (6 medidas de cada), a perda cresce +1,5 no PC e **+2 a 360**: no limite. O plano manda, nesse caso, medir a `main` e a branch
na mesma sessão, uma depois da outra.

## Rodada 3: a `main` e a branch na mesma sessão (o veredito)

A `main` (`2f2aa51`) construída e medida, e logo depois a branch (`9687966` + os documentos), sem nada entre elas. Medianas de 3:

| Cena | Largura | `main`: Cordel → arte (perda) | Branch: Cordel → arte (perda) | Cresceu |
|---|---|---|---|---|
| Troca de mão | PC | 55 → 47 (8) | 54 → 47 (7) | −1 |
| Troca de mão | 360 | 57 → 53 (4) | 57 → 53 (4) | 0 |
| Devastação | PC | 54 → 54 (0) | 54 → 52 (2) | +2 |
| Devastação | 360 | 57 → 52 (5) | 59 → 52 (7) | +2 |

Os valores de cada medida: troca PC `main` arte 47, 45, 48 / Cordel 55, 56, 55; branch arte 48, 47, 47 / Cordel 54, 54, 55. Troca 360 `main`
arte 53, 53, 53 / Cordel 57, 57, 58; branch arte 54, 53, 53 / Cordel 57, 59, 57. Devastação PC `main` arte 53, 54, 55 / Cordel 55, 53, 54;
branch arte 51, 52, 54 / Cordel 54, 54, 54. Devastação 360 `main` arte 52, 50, 54 / Cordel 59, 57, 57; branch arte 53, 52, 52 / Cordel 59, 59, 59.

**A G7 passa nas quatro**: nenhuma perda cresce mais de 2. Em quadros/s absolutos, a arte da branch fica igual à da `main` em três das quatro
e 2 abaixo na Devastação do PC. A rodada 1 era ruído (o próprio Cordel variou de 53 a 59 nas três rodadas).

- **A Devastação no celular**, que não passava a meta de 50 na medida de 2026-11-12 (46 e 47), deu 52 com arte nas duas builds nesta sessão:
  a máquina estava mais rápida hoje, e o achado continua de pé (a perda para o Cordel segue de 5 a 7 quadros/s). A decisão de consertar
  continua do autor.

## O JavaScript inicial

182,7 KB (gzip) na `main` → 183,8 KB na branch (o contexto por dono, o `LookZone`, o `ready.ts`, as cores do verso no catálogo e o retrato
no placar). As imagens, o retrato incluído, ficam fora; o smoke reprova qualquer nome de `.webp` de `src/looks/` no inicial.

## As fotos

Em `.superpowers/fotos-decks-fatia-2/` (nesta máquina, fora do git), pelo `medir-cena.ts` com as aparências gravadas: o momento do J do Bot
(fixture `especiais`, rodada 3, passo 10; você Bestiário + Bufão, o Bot Celestial + Egípcio), os versos do Bestiário na mão do Bot (você
Celestial + Egípcio), a Devastação (rodada 43, passo 210) e a Ressurreição do Bot (rodada 23, passo 107), nas duas larguras. O que se viu:

- O J grande do Bot é o do Egípcio dele (a khopesh); a sua Guarda (K, Bufão) segue de cordel. O verso azul da Celestial e o violeta do
  Bestiário se distinguem até a 360 (18 × 26 px).
- O Anúbis cabe no retrato a 360 e no PC, com a espada da iniciativa por cima; o Coringa de cordel no lado do Bufão.
- As cópias que caem na Devastação (a Defesa do Bot) e as da quadra na Ressurreição do Bot vestem a Celestial dele.
- Nada ilegível: nenhum ajuste saiu das fotos.
