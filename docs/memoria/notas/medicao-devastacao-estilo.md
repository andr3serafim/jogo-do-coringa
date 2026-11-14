# A Devastação no celular: a rolagem dos campos e o Motion (2026-11-14)

O conserto aprovado em `decisoes.md` 2026-11-14 (1) ("3. aprovado."), na branch `feat/devastacao-estilo`. O plano curto:
`docs/superpowers/plans/2026-11-14-devastacao-estilo.md`.

## O diagnóstico

- **O perfil** (`MEDIR_PERFIL=1`, a Devastação da `exodia-devastacao`, rodada 43, passo 210→211, a 360, Bestiário + Egípcio contra
  Celestial + Egípcio): 88 recálculos de estilo de ~230 elementos (as cartas com arte) em 3,2 s; 617 mutações do `style` da raiz das cartas,
  todas de `applyProjectionStyles` (a projeção de layout do Motion). As ~4800 invalidações "Animation" são das partículas da própria cena.
- **A sonda do tremor** (a mesa parada, uma animação de cada vez, CPU 4×): o tremor de um campo, dos campos inteiros, por `transform` ou por
  `translate`, e uma camada de opacidade — nenhuma passa de 22 elementos por recálculo. O tremor não era o custo.
- **A sonda da cena** (um `MutationObserver` no palco): o Motion reescrevia o `transform` de **29 cartas a cada quadro, por ~800 ms**, todas
  a partir de `translate3d(0–1px, ~59px, 0)`. Os campos rolavam 59 px no mesmo instante (`scrollTop` 0 → 59, `revealRow` do `scene-box.ts`).
- **A causa:** a 360 os campos rolam por dentro (`[data-campos]`); no PC não, por isso só o celular perdia. Sem `layoutScroll` nesse
  contêiner, o Motion media as cartas pela janela, lia a rolagem como mudança de lugar de toda carta e as animava de volta. Também era visível:
  depois da rolagem instantânea, as cartas escorregavam ~59 px até o lugar.

## O conserto

`[data-campos]` vira `m.div` com `layoutScroll` (`Table.tsx`). Depois dele, na mesma sonda, o salto some; sobra um deslize de fração de pixel
(`translate3d(0, 0.42px, 0)`, ~26 cartas por ~330 ms): a mesa muda de altura em menos de 1 px quando a fileira cai, e o primeiro quadro do
ronco (`shakeFrames(1, 7)`, `(-1px, 0.5px)`) entrava na medida do Motion. Um atraso de 1 ms no ronco tirou o 1 px do tremor, mas o deslize
subpixel continuou do mesmo tamanho e pelo mesmo tempo: o atraso foi desfeito (**Ruling:** o resto subpixel fica; o portão já passa sem ele).

## A medição A/B (a mesma sessão, CPU 4×, 3 repetições alternadas, quadros/s)

`main` = `5f1c1fb`; branch = `194d710`. Arte = `bestiario:egipcio/celestial:egipcio`.

| Cena | Aparência | Tela | `main` | branch |
|---|---|---|---|---|
| Devastação (210→211, 3,2 s) | arte | 360 | 51, 53, 54 (53) — pior 167 ms | **56, 56, 56 (56)** — pior 50 ms |
| | arte | 1366 | 52, 54, 53 (53) | 53, 54, 53 (53) |
| | Cordel | 360 | 58, 58, 59 (58) | 57, 58, 59 (58) |
| | Cordel | 1366 | 57, 56, 55 (56) | 56, 56, 56 (56) |
| Troca de mão (236→237, 3 s) | arte | 360 | 53, 54, 53 (53) | 54, 54, 53 (54) |
| | arte | 1366 | 48, 48, 48 (48) | 47, 47, 47 (47) |
| | Cordel | 360 | 57, 57, 57 (57) | 57, 58, 57 (57) |
| | Cordel | 1366 | 53, 55, 55 (55) | 53, 55, 54 (54) |

**Leitura:**
- A Devastação com arte a 360 passou de 53 para 56 (mediana) e ficou estável; o pior quadro caiu de 167 para 50 ms.
- O Cordel e a troca de mão não mudaram além do ruído (a tolerância de 2 da G7 da fatia 2).
- **Hoje a própria `main` já passava de 50** na Devastação com arte (51 a 54), contra 46 e 47 de 2026-11-12: a máquina variou entre as sessões
  (o diário já registrou o Cordel variando de 53 a 59). Por isso só a A/B decide.
- A troca de mão com arte no PC segue em 47–48 nas duas builds: é a virada de rodada lenta do bloco C, que o autor mandou ignorar
  ("4. ignore.", `decisoes.md` 2026-11-14 (1)).
