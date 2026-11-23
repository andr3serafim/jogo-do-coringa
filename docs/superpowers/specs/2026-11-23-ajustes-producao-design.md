# Ajustes da produção (2026-11-23): Cordel Escuro, destinos do Equipar, favicon e o bug da mão apagada

Origem: `docs/memoria/decisoes.md` 2026-11-23 (1) e (2). Branch `feat/ajustes-producao`, saída da `main` em `6382a33`. A limpeza da
memória é um bloco à parte (só documentos), depois deste.

## 1. O deck Cordel Escuro

**Por quê:** hoje o Cordel só existe em papel claro. O autor quer o mesmo baralho no escuro e, no treino, o bot vestindo o oposto do
jogador, como já acontece entre o Bestiário e o Celestial.

**Caminhos considerados** (o autor escolheu o A):
- **A · Um deck novo na lista** (`DECK_IDS`): a carta de cordel com o papel e a tinta trocados só dentro dela. Sem imagem, sem peso no
  pacote inicial; o protocolo, o servidor, a partida guardada e o replay já o carregam.
- B · Um "tom" claro/escuro à parte do deck: muda a forma do `Look` (protocolo, armazenamento, servidor) para servir a um deck só.
- C · Arte pintada nova (WebP): pesa e foge de "o mesmo Cordel, no escuro".

**Desenho:**
- `DECK_IDS = ['cordel', 'cordel-escuro', 'bestiario', 'celestial']`; `DECK_LABEL['cordel-escuro'] = 'Cordel Escuro'`. O `normalizeLook`
  prende o Bufão aos dois Cordel (a trava do §2.1 vale para "deck sem arte"). O `LookChoice` trava o Coringa nos dois, com a mesma linha.
- A carta: com o deck do lugar no Cordel Escuro, a numérica e as especiais do Bufão ganham `data-tom="escuro"`, e o CSS troca, só dentro
  dela, `--color-papel` ↔ `--color-tinta` e põe um vermelho mais claro (contraste ≥ 4,5 : 1 sobre a tinta). O Selvagem fica dourado (não
  troca). A carta da quadra (`QUAD_FACE`) e o rascunho seguem legíveis no escuro (conferir nas fotos).
- O verso (`BACK_CLASS`, `.momento-verso`): as listras de tinta e papel invertidas, com a borda em papel.
- `botLook`: Cordel → Cordel Escuro, Cordel Escuro → Cordel, sempre com o Bufão; os decks de arte como estão. O tutorial segue em Cordel
  claro dos dois lados.
- `packsOf` e `artOf` tratam o Cordel Escuro como o Cordel (nenhum pacote).
- Online: o servidor (o `normalizeLook` do protocolo) passa a aceitar o id depois do deploy; antes dele, o servidor em produção o vira
  Cordel, sem erro.

**Não-objetivos:** tema escuro dos menus; mudar a mesa (o Feltro) ou as cenas raras (`CORDEL_LOOKS`, sempre claras).

## 2. Os destinos do Equipar

**O defeito:** no PC (`pc:flex-row`), a lista das cartas por pôr é `flex-none` e a coluna dos destinos `flex-1 min-w-0`: com muitas
cartas, a coluna fica com quase nada (o "palito"); a cada carta posta ela alarga. No celular, com 3 ou mais cartas, os destinos vão para
baixo com meia largura cada, e o texto longo ("Trocar a última carta do Ataque, sai 9♠") quebra em várias linhas.

**Desenho:**
- Cada destino vira um **carimbo de tamanho fixo** (56 × 56 px no celular, 64 × 64 no PC), no molde do selo do Desfazer: a figura no meio
  e uma palavra embaixo. Ataque (espada), Defesa (escudo), Trocar no Ataque e Trocar na Defesa (a figura da fileira com a seta de troca e,
  embaixo, a carta que sai: "sai 9♠"), Descartar (a lápide do cemitério).
- O nome inteiro de hoje (`DESTINATION_TEXT` + a carta que sai) fica no `aria-label` e na dica (`title`): o leitor de tela e o mouse
  continuam com a frase completa.
- O layout: a lista das cartas fica com o espaço que sobra e quebra linha (`min-w-0 flex-1 flex-wrap`); os destinos, uma fileira
  `flex-none` de carimbos fixos. No celular, os carimbos ficam embaixo das cartas, numa linha só (no máximo 3 destinos ao mesmo tempo
  cabem em 390 px); no PC, à direita das cartas.

Esboço (celular, 3 cartas por pôr):

```
Faltam 3 cartas                    (↶) (⟲)
 [7♠] [9♥] [4♣]
 ┌────┐ ┌────┐ ┌────┐
 │ ⚔  │ │ 🛡 │ │ ⇄⚔ │
 │Ataq│ │Def.│ │sai │
 └────┘ └────┘ └9♠─┘
```

**Não muda:** a ordem livre, o arrasto, o foco no primeiro destino (`data-foco`), o Desfazer e o Recomeçar, o Confirmar.

## 3. O favicon

- Um `public/favicon.svg` com o Coringa do jogo (o chapéu e o rosto de `ui/cards/Coringa.tsx`, desenho original do projeto) sobre um
  quadrado de tinta de cantos arredondados, legível em 16 px; um `apple-touch-icon.png` de 180 px tirado dele; os dois `<link>` no
  `index.html`. Sem `.ico` (os navegadores de hoje leem o SVG).
- O smoke confere que o `index.html` aponta para os dois e que os arquivos existem no `dist`.

## 4. O bug da mão apagada

**Relato:** as especiais ficam escuras, como travadas, quando estão livres para jogar (online, em produção).

**O que apaga uma carta da mão hoje:** (a) o cadeado da mão que diz o que joga (`liveHandIds`, da lista legal; filtro parado, cadeado,
`data-sem-jogada`); (b) a trava dos controles (`locked`: jogada em voo, reconexão, prazo vencido, batidas), que põe `opacity-60` e o cursor
de espera. **O caminho:** reproduzir antes de mexer (o treino e uma sala local, nas janelas de reação, na vez do oponente e logo depois
das batidas), achar a causa e corrigir com um teste que falha antes. Sem reprodução, nada muda no código, e o autor é avisado.

## Portões

- `pnpm check` verde; `pnpm e2e` local nas telas mexidas (o Equipar, o treino); fotos do dev server a 1440 × 900 e 390 × 844 (o Equipar
  com 1 e com 5 cartas; o treino nas duas combinações de Cordel).
- Sem mudança de regra: nenhuma partida de referência muda, sem `RULES_VERSION` nem `STATE_SCHEMA`.
