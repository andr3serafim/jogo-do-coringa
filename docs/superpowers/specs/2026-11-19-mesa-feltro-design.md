# A mesa no Feltro (design)

Origem: `docs/memoria/decisoes.md` 2026-11-19 (3) (o pedido) e (4) (a B aprovada, com o rosa mais claro, "prosseguir com a
implementação"). O rascunho aprovado: `docs/superpowers/specs/2026-11-19-mesa-direcoes/` (`base.css` + `b-feltro.css`, as fotos `b-*`).
As escolhas marcadas **[C]** são do Claude por delegação, para o autor conferir no merge (como em 2026-11-18 (5)).

## 1. Intenção

A identidade dos menus (o Folheto: o grão, o filete de ouro com a costura do fundo verde, os carimbos de madeira, o tipo de madeira)
chega à partida. Entrar para jogar deixa de cair no visual antigo: a mesa vira uma mesa de baralho, com textura sem exagero.

## 2. Objetivos e não-objetivos

- **Objetivos:** os dois campos em feltro (rosa seu, verde do oponente) com o filete de ouro e a costura; o trilho de madeira no centro;
  a madeira escura no placar, no histórico e no fundo da mão; as barras de vida em trilho; os botões de contorno do replay em carimbo.
- **Não-objetivos:** o arranjo da mesa, a ordem dos controles, as regras, o fluxo, os handlers, as cartas (cordel e arte), as cenas,
  o menu da partida, o fim e a dica (seguem como estão; `decisoes.md` 2026-11-18 (5)).
- **Anti-objetivos:** nada se mexe no fundo (nenhuma animação nova); nada de filtro ou mistura por cima das cartas; os números de jogo
  sem textura (spec da web §10.7); o rosa continua sendo você e o verde o oponente.

## 3. Restrições

- Os tokens de hoje não mudam de valor; entram tokens novos (`--color-feltro-*`, `--color-madeira-*`).
- O orçamento do JavaScript inicial (≤ 200 KB) não muda: é CSS.
- O desempenho: a Devastação com arte já está no limite no celular. Todo material é fundo parado do contêiner (gradientes e um data-URI),
  sem `box-shadow` com desfoque grande nem `filter` novo. **[C]** A sombra acolchoada do rascunho (um `box-shadow` inset de 48 px)
  vira um gradiente radial no próprio fundo.
- Os E2E de layout (a faixa do PC ≤ 70 px, os campos sem rolar a 1440 × 900, `expectWhollyInView`): nenhuma medida muda.

## 4. As abordagens (já escolhidas)

A · Capa (o papel do folheto), B · Feltro (a mesa de baralho) e C · Tinta (a mesa escura). Ele escolheu a **B**, com o rosa um pouco
mais claro que o do rascunho.

## 5. O desenho

- **O rosa mais claro** (**[C]** o quanto): o pano vai de `#bd6c8b` no alto a `#a45274` no meio e `#86405f` na borda (o rascunho:
  `#b0617d`, `#96496a`, `#74334f`). O meio é o mais claro que ainda dá ≥ 4,5 : 1 ao papel (as marcas pequenas: "Guarda", "Mão", a
  conta "37 × 1"). O verde fica o do rascunho (`#2b8a5c`, `#1d6b47`, `#124a31`).
- **Os campos (`.feltro`, `.feltro-voce`, `.feltro-oponente`):** o gradiente do pano (a luz do lado de dentro da mesa: no alto do seu,
  embaixo do do oponente), a vinheta como gradiente, o grão de hoje mais leve (opacidade 0,3); o filete de ouro (`::before`, 6 px
  para dentro, cantos de 22 px) e a costura tracejada de papel (`::after`, 11 px, cantos de 17 px), como a `.menu-trilho`.
- **O texto dos campos em papel** (`text-papel` no campo). O que tem fundo próprio e herdava a cor ganha `text-tinta` (as placas de
  estado, a etiqueta da quadra). As vagas tracejadas em papel (30%). A seta da carta da frente em papel. O botão do histórico e o do
  menu, no campo do oponente (celular), em papel.
- **O trilho do centro (`.trilho-madeira`):** a madeira com o veio parado (data-URI `feTurbulence`) e o filete de ouro em cima e
  embaixo.
- **A borda da mesa (`.madeira-escura`):** o placar, o histórico, o fundo da mão e da barra no PC, a barra de baixo no celular; o grão
  leve; o filete de ouro embaixo do placar e à esquerda do histórico. **[C]** No celular, o fundo atrás da mão é o pano rosa (a mão é
  sua), sem filete.
- **As barras de vida:** o trilho arredondado com a borda de ouro (60%), o fundo de feltro escuro com a hachura leve, o ouro em degradê.
  O retrato com cantos de 10 px. A moldura de ouro de quem ataca primeiro (`data-dono`) e a espada ficam como estão. O `scaleX` dos
  filhos e os números ficam.
- **Os botões do replay:** os de contorno viram `.carimbo` (papel, borda de tinta, sombra de madeira); o Tocar, `.carimbo
  .carimbo-ouro` com o tipo de madeira.

## 6. O que fica para quem constrói

- **[C]** Os valores finos (as opacidades do grão e do filete, o tamanho do veio) podem mudar depois das fotos, sem mudar o desenho.
- A A/B de desempenho da Devastação no celular (`medir-cena.ts`) decide se algum material sai.

## 7. O plano

1. Tokens e classes no `styles.css` (`.feltro*`, `.trilho-madeira`, `.madeira-escura`, a barra de vida, o retrato).
2. Os componentes: `PlayerField` (o pano, o texto, as vagas), `Row` (as vagas, a etiqueta da quadra), `StatePlate` (o texto),
   `Card` (a seta da frente), `Table` (o fundo, a barra do celular, o botão do menu em papel), `History` (a coluna, o botão em papel),
   `CenterBand` (o trilho), `FightHud` (o placar), `ReplayControls` (os carimbos).
3. Os testes da web, o smoke, as fotos (PC e celular, o treino, o replay com arte, o tutorial) e a A/B da Devastação.
4. O `pnpm check`, o E2E pela CI, o PR para a `main`; o merge e o deploy são dele.
