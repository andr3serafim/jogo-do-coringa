# Medição da fatia 1 dos decks (as cartas com arte, F5)

- **Data:** 2026-11-11, na branch `feat/decks-fatia-1`, com a web de produção construída pelo `medir.config.ts` a cada execução.
- **Script:** `packages/web/e2e/medir-cena.ts` com `MEDIR_APARENCIA` (a aparência gravada em `coringa:prefs`; o replay a veste dos dois lados, F4),
  na porta 8787. Chromium do Playwright, CPU 4×, telas de 1366 × 768 e 360 × 640 (as do script). A medida espera as imagens carregarem.
- **A máquina:** o notebook do autor **na bateria** (descarregando, 89%): a CPU anda mais devagar, e o próprio Cordel fica bem abaixo das medições
  anteriores (a troca de mão deu 42 e 48 quadros/s no bloco C; aqui, 23 e 31). Por isso vale a regra relativa da F5: com o Cordel abaixo de 50
  na mesma medida, a mesa com arte passa se perder no máximo 2 quadros/s para ele.
- **O portão (F5):** ≥ 50 quadros/s com a CPU 4×, ou, com o Cordel abaixo de 50, no máximo 2 quadros/s a menos que ele.

## Primeira rodada (as seis combinações em sequência: Cordel primeiro, depois as duas com arte)

`chegada` é o maior intervalo nos 300 ms depois do toque; `> 300` quer dizer que nenhum quadro caiu dentro da janela (o primeiro depois do
toque passou de 300 ms).

| Cena | Aparência | Tela | Quadros/s | p95 (ms) | Maior intervalo (ms) | Chegada (ms) | Partículas |
|---|---|---|---|---|---|---|---|
| A Ressurreição (`exodia-devastacao`, rodada 7, passo 27, 4,6 s) | Cordel | 1366 | 30 | 67 | 283 | 283 | 45 |
| | | 360 | 36 | 67 | 200 | 200 | 44 |
| | Bestiário + Egípcio | 1366 | 31 | 67 | 250 | 250 | 45 |
| | | 360 | 30 | 67 | 367 | 367 | 45 |
| | Celestial + Egípcio | 1366 | 28 | 67 | 250 | 250 | 45 |
| | | 360 | 34 | 83 | 267 | 267 | 44 |
| A troca de mão (`exodia-devastacao`, rodada 47, passo 236→237, 3 s) | Cordel | 1366 | 23 | 117 | 250 | 250 | 6 |
| | | 360 | 31 | 83 | 300 | 300 | 6 |
| | Bestiário + Egípcio | 1366 | 17 | 150 | 400 | > 300 | 6 |
| | | 360 | 20 | 133 | 417 | > 300 | 6 |
| | Celestial + Egípcio | 1366 | 18 | 150 | 417 | > 300 | 6 |
| | | 360 | 23 | 100 | 383 | > 300 | 6 |

**Leitura da primeira rodada:** na Ressurreição as diferenças vão para os dois lados (de +1 a −6), o que parece ruído. Na troca de mão (a mesa
mais cheia da fixture, com a rodada nova e as cartas distribuídas) as quatro comparações pioram de 5 a 11 quadros/s: **a F5 não passa ali**.
Mas o Cordel rodou sempre primeiro e as duas com arte depois, na bateria: o aquecimento e a carga pesam contra a arte. Próximos passos: o perfil
da troca de mão (Cordel e Bestiário + Egípcio) para achar a causa, e a medição de novo em ordem ABBA (Cordel, arte, arte, Cordel), com medianas.

## O perfil da troca de mão (1366, com o rastreamento: os quadros/s não valem)

Soma do tempo por evento do trace (`MEDIR_PERFIL=1`), Cordel → Bestiário + Egípcio: rasterização (`RasterTask`) 126 → 252 ms; recálculo de estilo
(`UpdateLayoutTree`) 387 → 501 ms; `Layerize` 201 → 245 ms; `Commit` 56 → 82 ms; decodificação de imagem (`ImageDecodeTask`) 0 → 4 ms; o JavaScript
não sobe. **A arte custa na pintura e no estilo, não na decodificação das imagens:** os suspeitos são o desfoque (a aura em `box-shadow` e o
halo do número) em dezenas de cartas que se movem, e a imagem grande reduzida a cada pintura.

## A troca de mão em ABBA (Bestiário + Egípcio, na bateria a 82%)

| Ordem | Aparência | 1366: quadros/s · p95 · maior | 360: quadros/s · p95 · maior |
|---|---|---|---|
| 1 | Cordel | 17 · 150 · 467 | 31 · 83 · 300 |
| 2 | Bestiário + Egípcio | 13 · 183 · 550 | 21 · 133 · 400 |
| 3 | Bestiário + Egípcio | 14 · 183 · 483 | 25 · 117 · 333 |
| 4 | Cordel | 19 · 150 · 450 | 29 · 100 · 333 |

**Medianas:** no PC, Cordel 18 e arte 13,5 (−4,5); no celular, Cordel 30 e arte 23 (−7). A diferença é real e passa dos 2 da F5: **as
saídas entram, na ordem do plano, medindo depois de cada uma.**

## Primeira saída: o número sem o halo (só o contorno de 1 px), ABBA na bateria a 80%

| Ordem | Aparência | 1366: quadros/s · p95 · maior | 360: quadros/s · p95 · maior |
|---|---|---|---|
| 1 | Cordel | 21 · 150 · 383 | 28 · 100 · 317 |
| 2 | Bestiário + Egípcio | 17 · 117 · 400 | 22 · 117 · 383 |
| 3 | Bestiário + Egípcio | 11 · 217 · 500 | 22 · 117 · 450 |
| 4 | Cordel | 18 · 150 · 433 | 25 · 117 · 317 |

**Medianas:** no PC, Cordel 19,5 e arte 14 (−5,5); no celular, Cordel 26,5 e arte 22 (−4,5). **Não passa**; o ruído entre execuções iguais
chega a 6 quadros/s (a arte deu 17 e 11 no PC). A segunda saída entra.

## Segunda saída: a aura desenhada (três anéis sem desfoque), ABBA na bateria a 77%

| Ordem | Aparência | 1366: quadros/s · p95 · maior | 360: quadros/s · p95 · maior |
|---|---|---|---|
| 1 | Cordel | 26 · 117 · 350 | 29 · 100 · 367 |
| 2 | Bestiário + Egípcio | 12 · 200 · 433 | 20 · 150 · 417 |
| 3 | Bestiário + Egípcio | 16 · 133 · 533 | 21 · 117 · 433 |
| 4 | Cordel | 22 · 100 · 350 | 27 · 117 · 400 |

**Medianas:** no PC, Cordel 24 e arte 14 (−10); no celular, Cordel 28 e arte 20,5 (−7,5). **Não passa**, e não melhora: o desfoque (o halo e a
aura) não era o custo principal. Antes da terceira saída (a imagem de 208 px), um experimento: a mesma arte com um GIF de 1 px no lugar da
imagem, para saber se é a imagem que custa.

## Sonda descartada: o GIF de 1 px no lugar da imagem (bateria a 75%)

Cordel 13 e 26 no PC (31 e 35 no celular); a arte com o GIF, 7 e 6 (9 e 14). **Não vale como controle:** trocou um desenho de imagem por
outro, provavelmente mais caro (1 px esticado à carta inteira). Só confirma o perfil: desenhar o `<img>` enquanto a carta se move é caro. E o
próprio Cordel variou de 13 a 26 na mesma ABBA.

## O que fica, e o que falta

- **Na bateria a medição não decide:** o ruído entre duas execuções iguais (13 contra 26 quadros/s no mesmo Cordel) é várias vezes a
  tolerância de 2 da F5. Nem as saídas 1 e 2 se provam boas ou ruins. As duas estão no código, como "medição pendente": ficam só se a medição
  limpa mostrar que ajudam.
- **A medição limpa** (com o notebook na tomada): `MEDIR_APARENCIAS=cordel,bestiario:egipcio MEDIR_REPETICOES=3` (as aparências em
  alternância, na mesma build e no mesmo servidor), e dois controles antes de decidir a terceira saída: a imagem carregada mas escondida
  (`<img hidden>`: se ficar perto do Cordel, o custo é desenhar a imagem) e a imagem numa camada própria (`will-change: transform` no
  invólucro: se recuperar a diferença, a carta com arte era repintada a cada quadro do voo). Conferir os dois a 360 (camadas a mais pesam no
  celular).

## A medição limpa, na tomada (a troca de mão, alternada, 3 repetições, uma build só)

Com o autor ligando o notebook na tomada (status 2, CPU a 19% em repouso). `MEDIR_APARENCIAS=cordel,bestiario:egipcio MEDIR_REPETICOES=3`,
com as saídas 1 e 2 no código. O ruído caiu para 1 a 2 quadros/s entre execuções iguais.

| Aparência | Tela | Quadros/s (as três) | Mediana | p95 (ms) | Maior intervalo (ms) | Chegada (ms) |
|---|---|---|---|---|---|---|
| Cordel | 1366 | 56, 56, 58 | 56 | 17 | 83 | 83 |
| | 360 | 58, 58, 59 | 58 | 17 | 50 | 83 a 100 |
| Bestiário + Egípcio | 1366 | 50, 50, 49 | 50 | 33 | 133 | 133 |
| | 360 | 54, 55, 55 | 55 | 33 | 117 | 117 a 133 |

**Leitura:** com o Cordel acima de 50, vale a primeira regra da F5 (≥ 50 quadros/s): **passa, no limite no PC** (mediana 50, uma das três
em 49) e com folga no celular (55). A chegada do passo à mesa fica 50 ms mais lenta com arte (133 contra 83).

**As saídas 1 e 2 contra a carta de antes delas** (a mesma medição, com o `ArtFace.tsx` de `dd1d9bd`, o halo e a aura desfocada): Cordel 53,
56, 56 e 57, 58, 58 (medianas 56 e 58); arte 50, 50, 49 e 55, 50, 55 (medianas 50 e 55). **Iguais às com as saídas:** o desfoque não
custava nada que se meça. As duas saíram (`git revert` de `2eeba72`), e a carta volta ao desenho aprovado. **Ruling:** uma saída só fica se a
medição limpa mostrar que ajuda; não ajudou, e ela pioraria a arte de graça.

## A medida final (a carta aprovada, as três aparências alternadas, 3 repetições, na tomada)

| Aparência | Tela | Quadros/s (as três) | Mediana | p95 (ms) | Maior intervalo (ms) | Chegada (ms) |
|---|---|---|---|---|---|---|
| Cordel | 1366 | 56, 56, 58 | 56 | 17 | 83 | 83 a 100 |
| | 360 | 58, 58, 58 | 58 | 17 | 83 | 83 |
| Bestiário + Egípcio | 1366 | 49, 50, 50 | 50 | 33 | 133 | 133 |
| | 360 | 55, 55, 55 | 55 | 33 | 117 | 117 a 133 |
| Celestial + Egípcio | 1366 | 50, 50, 50 | 50 | 33 | 133 | 117 a 133 |
| | 360 | 55, 55, 55 | 55 | 33 | 117 | 117 |

**A Ressurreição** (rodada 7, passo 27, 4,6 s; 2 repetições, alternadas): 60 quadros/s nas três aparências e nas duas telas (o Celestial a 360,
59 e 60), p95 de 17 ms, maior intervalo de 17 a 33 ms, chegada de 83 (Cordel) a 100 ms (arte), pico de 44 a 45 partículas.

## Veredito da F5

- **Passa pela primeira regra (≥ 50 quadros/s com a CPU 4×), no limite no PC** (mediana 50 nas duas aparências, uma execução em 49) e com
  folga no celular (55). O Bestiário e o Celestial custam o mesmo, apesar das imagens do Celestial pesarem mais no disco.
- **O custo da arte na mesa cheia:** 6 quadros/s no PC (56 → 50) e 3 no celular (58 → 55); o p95 sobe de 17 para 33 ms (mais quadros de 2
  intervalos), e o passo chega à mesa 30 a 50 ms depois. O perfil diz onde: a pintura dobra, e não a decodificação das imagens.
- **Nenhuma saída ficou no código:** as saídas 1 e 2 não mudaram a medida e saíram; a terceira (a imagem de 208 px) não foi preciso tentar.
  Se a arte pintada ou mais efeitos baixarem a mesa de 50, os próximos a medir são a imagem numa camada própria (`will-change: transform` no
  invólucro da imagem, que evitaria repintá-la a cada quadro do voo; conferir as camadas a mais no celular) e a imagem de 208 px.
- **Para o autor:** a medição só decide na tomada. Na bateria, a CPU desta máquina varia demais (o mesmo Cordel deu 13 e 26 quadros/s).

## Antes da fatia 2: a Devastação com arte (2026-11-12, na tomada)

O `estado.md` pedia, para o plano da fatia 2, medir a Devastação com arte. Medida na branch `feat/decks-fatia-2`, com o código da `main` em
`2f2aa51` (a fatia 1 inteira), o notebook na tomada (status 2, 97%). `exodia-devastacao`, rodada 43, passo 210→211 (a sua Devastação derruba
a Defesa do Bot, 8 cartas), 3,2 s, `MEDIR_APARENCIAS=cordel,bestiario:egipcio,celestial:egipcio MEDIR_REPETICOES=3`, numa build só. O replay
veste a aparência de agora dos dois lados (F4), então a mesa inteira tem arte. Pico de 30 partículas em todas.

| Aparência | Tela | Quadros/s (as três) | Mediana | p95 (ms) | Maior intervalo (ms) | Chegada (ms) |
|---|---|---|---|---|---|---|
| Cordel | 1366 | 43, 50, 55 | 50 | 33 a 50 | 50 a 133 | 133 |
| | 360 | 55, 55, 57 | 55 | 17 a 33 | 50 a 150 | 133 a 150 |
| Bestiário + Egípcio | 1366 | 48, 52, 50 | 50 | 33 | 167 | 167 |
| | 360 | 47, 46, 49 | 47 | 33 | 67 a 200 | 183 a 200 |
| Celestial + Egípcio | 1366 | 48, 51, 51 | 51 | 33 | 167 a 183 | 167 a 183 |
| | 360 | 45, 47, 46 | 46 | 33 a 50 | 183 a 217 | 183 a 217 |

**Leitura:** no PC a arte empata com o Cordel (50 e 51 contra 50; o próprio Cordel variou de 43 a 55, a primeira execução fria). **No celular a
arte fica em 46 e 47, contra 55 do Cordel: a F5 não passa na Devastação a 360.** A chegada do passo fica 50 a 70 ms mais lenta. A troca de mão
(a mesa mais cheia, medida na fatia 1) segue passando: 55 contra 58.

**A camada própria** (`will-change: transform` no invólucro da imagem, a saída que a fatia 1 deixou para medir), só a 360, 3 repetições
alternadas: Cordel 57, 57 e 58 (57); arte 45, 46 e 49 (46). **Não muda nada:** desfeita, sem commit.

**O perfil** (360, uma execução de cada, `MEDIR_PERFIL=1`; os números da medida não valem com ele):
- **O compositor desenha o mesmo:** 228 e 229 quadros (`DrawFrame`). Quem perde é a thread principal: 140 quadros dela no Cordel, 114 na arte
  (`BeginMainThreadFrame`). As animações que correm no compositor (a queda das cópias, o tremor dos campos) seguem lisas; a medida conta
  `requestAnimationFrame`, que é da thread principal.
- **A imagem não é o custo:** a rasterização quase não muda (137 → 167 ms) e a decodificação é quase zero. A imagem de 208 px mexeria só nisso.
- **O custo é o recálculo de estilo:** 503 → 711 ms. Os recálculos pequenos custam o mesmo nos dois (233 e 206 ms). Os grandes, que passam pelas
  cartas da mesa inteira, acontecem nos dois (77 vezes no Cordel, 64 na arte, ~70 numa cena de 3,2 s), mas tocam até 59 elementos no Cordel e
  até ~230 na arte (a face com arte tem uns 4 elementos por carta a mais: o invólucro, a imagem, o anel, a aura), e custam 270 → 505 ms.
- **Quem invalida:** o mais frequente nos dois é "Inline CSS style declaration was mutated" na raiz das cartas (1037 vezes no Cordel, 533 na
  arte), e as ~30 animações fora do compositor são as mesmas nos dois (as partículas).

**Conclusão:** já no Cordel, algo recalcula o estilo de todas as cartas da mesa umas 70 vezes na cena; com arte cada recálculo custa o dobro.
As saídas da F5 não atacam isso: o halo e a aura saíram na fatia 1 sem efeito, a camada própria agora, e a imagem de 208 px só mexeria na
rasterização. Pela regra do plano da fatia 1 (depois das saídas, para e pergunta), vai ao autor. Os dois caminhos que o perfil aponta:
**estancar essa invalidação** (achar quem muda o `style` de toda carta a cada quadro; ajuda o Cordel também) ou **enxugar a face com arte**
(menos elementos por carta).
