# Logo "LUSACAN productions"

Um dragão de asas abertas diante da lua cheia, o nome e "PRODUCTIONS" (`docs/memoria/decisoes.md`, 2026-11-17 (3)). O dragão, a lua e
os filetes são desenho original do projeto, feito à mão em vetor; a imagem de referência que o autor mandou foi inspiração, não molde
(nada decalcado nem traçado por cima).

| Arquivo | Para quê |
|---|---|
| `lusacan-logo-fundo-escuro.svg` | o conjunto sobre fundo escuro (a lua com halo, os veios violeta, o nome em prata) |
| `lusacan-logo-fundo-claro.svg` | o conjunto sobre papel ou branco (o dragão em tinta, a lua clara com contorno) |
| `lusacan-simbolo-fundo-escuro.svg` | só a lua e o dragão, sem os veios, para tamanhos pequenos (abaixo de ~120 px de largura o nome não lê) |
| `lusacan-simbolo-fundo-claro.svg` | só a lua e o dragão, sobre fundo claro |

- **Saem do jogo sozinhos:** as letras já são contornos, sem fonte, sem folha de estilo e sem arquivo de fora; os degradês moram no
  próprio arquivo. Abrem em qualquer navegador e editor de vetor; um PNG sai exportando pelo editor.
- **As letras** são os contornos da **Cinzel** (Copyright 2020 The Cinzel Project Authors, SIL Open Font License 1.1, do pacote
  `@fontsource/cinzel`): "LUSACAN" no peso 600 e "PRODUCTIONS" no 500. A licença permite usar a fonte em arte como esta; o texto dela
  fica em `node_modules/@fontsource/cinzel/LICENSE`.
- **Cores:** a noite (`#0d0a17` no dragão, `#1b1432` nas asas, `#b48cff` nos veios), a lua de prata (`#fbfaff` a `#9f9dbd`), o nome em
  prata (`#f6f5fb` a `#b3b0c8`) e "PRODUCTIONS" em lavanda (`#b8afdc`). Na versão clara: tinta `#17120f` e violeta `#4b3299`.
- **Respiro:** deixe em volta pelo menos a altura de uma letra do nome.

## Mudar o desenho

A fonte única é `src/ui/intro/lusacan-shapes.ts` (as formas, as letras e as cores); a abertura do jogo a anima (`LusacanLogo.tsx` e
`dragon-flight.ts`). O jogo não importa estes SVG. Depois de mudar o desenho, regrave-os:

```
pnpm --filter @coringa/web logo
```

O teste `test/ui/lusacan-logo.test.tsx` reprova os SVG que não forem, byte a byte, o que o gerador grava. Para mudar o texto, o
`scripts/cinzel-contornos.ts` tira os contornos de outras letras da Cinzel (o uso está no começo dele).
