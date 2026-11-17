# Logo "LUSACAN productions"

Desenho original do projeto (`docs/memoria/decisoes.md`, 2026-11-16 (5)): o olho de um dragão antigo que guarda a noite. A lua é a
íris, a pupila é uma fenda, e a pálpebra de cima é um capuz pesado que sobe para fora como um chifre. Nada foi copiado nem decalcado
de jogo, marca ou arte de terceiros.

| Arquivo | Para quê |
|---|---|
| `lusacan-logo-fundo-escuro.svg` | o conjunto (símbolo, nome, "PRODUCTIONS") sobre fundo escuro |
| `lusacan-logo-fundo-claro.svg` | o conjunto sobre fundo claro |
| `lusacan-simbolo-fundo-escuro.svg` | só o olho, para tamanhos pequenos (abaixo de ~100 px de largura, "PRODUCTIONS" some) |
| `lusacan-simbolo-fundo-claro.svg` | só o olho, sobre fundo claro |

- **Saem do jogo sozinhos:** as letras são desenhadas (traço e forma), sem fonte, sem folha de estilo e sem arquivo de fora. Abrem em
  qualquer navegador e editor de vetor; um PNG sai exportando pelo editor ou abrindo no navegador.
- **Cores:** tinta `#17120f`, papel `#f1f0ea`, ouro `#f5c238` (as do jogo).
- **Respiro:** deixe em volta pelo menos a altura de uma letra do nome.
- **A origem dos traçados** é `src/ui/intro/lusacan-shapes.ts`, que a abertura do jogo anima (`LusacanLogo.tsx`). Um teste
  (`test/ui/lusacan-logo.test.tsx`) confere que estes arquivos e o módulo trazem os mesmos traçados: quem mudar o desenho muda os
  dois. O jogo não importa estes SVG.
