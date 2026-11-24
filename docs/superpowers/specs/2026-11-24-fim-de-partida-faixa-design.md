# O fim de partida na Faixa de feira — spec

> **Estado:** aprovada pelo autor em 2026-11-24 (`decisoes.md` 2026-11-24 (13)), com P1 (a), P2 e P3 como escritas. Origem: `docs/memoria/decisoes.md` 2026-11-24 (6), (10) e (11). O protótipo aprovado é
> `docs/superpowers/specs/2026-11-24-fim-direcoes/prototipo.html?dir=b2` (fotos `b2-*.png`). **[I]** marca o que ele não disse com essas
> palavras.

## 1. O que muda

O painel do fim (`ui/table/EndPanel.tsx`) troca o cartão com o "estouro" de HQ pela **Faixa de feira**: uma faixa de tinta que atravessa a
mesa, com filete de ouro em cima e embaixo; à esquerda, o **medalhão** com o seu Coringa; à direita, o rótulo "Fim da partida", o
**carimbo** com a palavra, a frase do motivo, a duração, o placar e os botões. Vale no treino e no online (um componente só).

- **Vitória:** o Coringa **feliz** (boca aberta), maior, ocupando o círculo com folga pequena; o fundo do medalhão **verde bem claro**
  (`#e3f4e1`); a palavra **VITÓRIA!** em **verde** (`#6fd07f`, 9:1 sobre a tinta).
- **Derrota:** o Coringa **triste**; o fundo **vermelho bem claro** (`#fbe1dc`); a palavra **DERROTA** em **vermelho** (`#ff6b5a`, 6:1).
- **A borda do medalhão é dourada** nos dois (ouro, anel de tinta e anel de ouro, como no protótipo).
- **O carimbo** tem borda da cor da palavra e entra com uma pequena inclinação (−4°), como um carimbo batido.
- **No celular** a faixa vira coluna: o medalhão em cima (140 px), centralizado, e o resto embaixo (o protótipo, `b2-*-celular.png`).
- Sai o `Burst` (o estouro de HQ) e o título grande de agora.

## 2. O que fica como está

- É um `<dialog>` modal (o `Modal`), com o nome acessível do resultado ("Você venceu", "Duda venceu", "Partida sem resultado"): o carimbo
  é desenho (`aria-hidden`), e o título de leitura de tela segue com o texto do `resultTitle`.
- O rótulo "Fim da partida" (o `endPanel` do E2E acha o diálogo por ele).
- A frase do motivo (`reasonText`, W.O. inclusive), a duração, o placar, a nota do tutorial (dentro do diálogo e na descrição dele).
- Os botões: **Revanche** (o principal, com o estado dela em `role="status"`), **Ver a mesa** (recolhe), **Rever a partida** (só com
  replay), **Nova sala** / **Voltar ao início**.
- A faixa recolhida no pé da tela, com o resultado e o botão que abre de novo.
- Com movimento reduzido: o carimbo e o medalhão só aparecem (sem a batida nem o pulo). Nenhum flash, nenhuma inversão.

## 3. A arte

O medalhão é o Coringa da mesa (`ui/cards/Coringa.tsx`: o mesmo chapéu, guizos e gola), maior, com duas expressões novas desenhadas no
mesmo traço: feliz (a boca aberta em vermelho) e triste (a boca para baixo, os olhos caídos). Desenho original em SVG, sem imagem, fora do
JavaScript inicial só se passar do orçamento (o smoke confere os 200 KB).

## 4. Testes

- `EndPanel`: vitória e derrota com a palavra, as cores (os atributos `data-resultado="vitoria" | "derrota"`), o Coringa feliz ou
  triste; o nome acessível do diálogo segue o `resultTitle`; os botões e a revanche como hoje; a nota do tutorial na descrição.
- Movimento reduzido: sem animação no carimbo.
- E2E: o fim do treino e o do online seguem achando o diálogo; foto no PC e no celular (`medir-cena` ou um `.mjs`), sem rolar de lado.

## 5. Perguntas ao autor

- **P1. Respondida: sempre o Bufão.** O Coringa do medalhão com a raça Egípcia: (a) sempre o Bufão, como no protótipo; (b) o retrato da sua raça, sem a expressão
  (o Egípcio é arte pintada, sem a boca feliz/triste).
- **P2. Respondida: como escrito.** O empate (das partidas velhas) e a "partida sem resultado" (os dois saíram da sala): medalhão com fundo de papel, o
  Coringa sério e a palavra em ouro ("EMPATE" / "SEM RESULTADO").
- **P3. Respondida: como escrito.** No online, quando o oponente vence: o medalhão mostra o **seu** Coringa triste (como no treino) e a frase diz "Duda venceu".
