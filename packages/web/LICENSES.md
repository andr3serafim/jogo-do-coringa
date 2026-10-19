# Licenças de terceiros da web

A arte do jogo (o Coringa, os naipes, as cenas e as texturas) é original, feita para o projeto (spec §10.6).
Esta lista cobre o que vem de fora e vai para o `dist`.

## Fontes

As duas são servidas pelo próprio site, só com o subconjunto latino: o Vite copia os arquivos do pacote para o
`dist` (nada do Google em tempo de execução). O texto da licença fica ao lado da fonte, no arquivo `LICENSE` de
cada pacote.

| Fonte | Pacote | Versão | Licença | Arquivo da licença | O que vai para o `dist` |
|---|---|---|---|---|---|
| Alfa Slab One (tipo de madeira: títulos, botões, valor das cartas) | `@fontsource/alfa-slab-one` | 5.3.0 (fonte v21) | SIL Open Font License 1.1 | `node_modules/@fontsource/alfa-slab-one/LICENSE` | `alfa-slab-one-latin-400-normal.woff2` e o `.woff` de reserva, pelo `latin.css` do pacote |
| Archivo, variável (texto e números de jogo) | `@fontsource-variable/archivo` | 5.3.0 (fonte v25) | SIL Open Font License 1.1 | `node_modules/@fontsource-variable/archivo/LICENSE` | `archivo-latin-wdth-normal.woff2` (eixos de peso e de largura), pelo `src/fonts.css` |

- **Alfa Slab One:** Copyright 2016 The Alfa Slab One Project Authors (http://www.jmsole.cl | info@jmsole.cl),
  com o nome reservado (*Reserved Font Name*) "Alfa Slab". O arquivo vai sem modificação nossa, com o nome original.
- **Archivo:** Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo).
- A versão do pacote vem do `pnpm-lock.yaml`; ao atualizar um pacote de fonte, atualize esta tabela.
