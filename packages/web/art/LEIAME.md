# Arte das aparências (decks e raças)

As **origens** das ilustrações dos decks e das raças do Coringa (`docs/superpowers/specs/2026-11-10-decks-e-racas-design.md`, §5). Ficam
fora do bundle: o jogo carrega os `.webp` de `packages/web/src/looks/`.

- **Arte provisória**, para os testes (`decisoes.md` 2026-11-10 (2), resposta 4): desenho original do projeto, feito em SVG por código,
  sem decalque nem imagem de terceiros. A arte final, pintada, substitui os `.webp` com os mesmos nomes.
- Cada SVG tem 300 × 420 de `viewBox`, sem texto: o valor e o naipe são postos pela interface. Os cantos de cima à esquerda e de baixo à
  direita já vêm escurecidos, para o número e o naipe se lerem; a moldura da faixa de raridade vem desenhada.
- `bestiario/` e `celestial/`: uma numérica por valor (`02` a `10`). `egipcio/`: as especiais (`k`, `j`, `q`, `a`) e o Coringa.

## Como os `.webp` foram feitos

Em 2026-11-11, fora deste repositório (a máquina do autor não tem as ferramentas; nada disso roda no `pnpm check`):

```
rsvg-convert -w 416 -h 582 origem.svg -o carta.png      # librsvg
convert carta.png -quality 82 -define webp:method=6 carta.webp   # ImageMagick, libwebp
```

O retrato (`src/looks/egipcio/retrato-anubis.webp`, 256 × 256) é um recorte quadrado de `egipcio/coringa-anubis.svg` (a cabeça).

Os SVG usam filtros (`feGaussianBlur`, `feTurbulence`): por isso o jogo usa a imagem pronta, e não o SVG ao vivo (spec §9, desempenho).

## Levar esta arte para outra ferramenta ou outra pessoa

Estes arquivos são do repositório, em formatos abertos: nada neles depende de quem os desenhou. Abrem em qualquer editor de vetor
(Inkscape, Illustrator, Figma, Affinity) e em qualquer navegador. Para uma ferramenta de IA de desenho ou um ilustrador, o que
acompanha é `docs/superpowers/specs/2026-11-11-biblia-de-arte.md`: o contrato de cada arquivo (proporção, cantos escuros, nada
escrito, o mesmo nome), a descrição de cada carta e os pedidos prontos.

Um PNG de qualquer tamanho sai de um SVG abrindo-o no navegador, exportando pelo Inkscape, ou com
`rsvg-convert -w 1248 -h 1746 carta.svg -o carta.png`.

O programa que gerou os SVG não está aqui e não faz falta: o SVG é a origem. Quando uma carta for refeita, a origem nova entra nesta
pasta com o mesmo nome (em vetor ou em imagem grande), e a procedência (ferramenta, modelo, data, pedido) em `PROCEDENCIA.md`.

## Credencial de conteúdo

Os SVG e os WebP gravados em 2026-11-11 levam uma credencial de conteúdo (C2PA) embutida, que diz que o Claude forneceu o arquivo. É
metadado (cerca de 8 KB em cada SVG e 6 KB em cada WebP): o desenho é o mesmo, e ela some numa reexportação.
