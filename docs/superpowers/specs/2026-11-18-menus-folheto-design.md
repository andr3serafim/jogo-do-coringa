# Jogo do Coringa — Os menus no Folheto (redesenho visual das telas fora da mesa)

- **Data:** 2026-11-18. **Origem:** `decisoes.md` 2026-11-18 (1) a (5). **Direção aprovada:** A4 · Folheto, nos fundos rosa e verde
  ("gostei muito do rosa e gostei muito da arte fundo verde. as telas de menus adentrado ficaram muito boas", 2026-11-18 (5)).
- **Rascunhos:** `docs/superpowers/specs/2026-11-18-menus-direcoes/project/` (`a4.css`, `A4-*.dc.html`; como abrir: diário 2026-11-18
  (1)). Vale o que se vê; o código deles é descartável.
- **Legenda:** **[A]** o autor decidiu ou aprovou vendo; **[C]** escolha do Claude por delegação ("Prossiga com o design, plano e
  implementação", 2026-11-18 (5)), para ele conferir no merge; **[OBRIGATÓRIO]** regra que já vale no projeto.

## 1. O que é, e o que não é

**Objetivo.** As telas fora da mesa ganham a identidade aprovada: o Início com o Coringa do jogo saindo de um disco de papel e o menu em
lista de mini cartas que respiram e inclinam como a mão; as telas de cada entrada com os carimbos de madeira da mesa; dois temas de fundo,
rosa (padrão) e verde, trocados por um controle discreto.

**Não-objetivos.** A mesa, as cartas, o placar, as cenas e os diálogos da partida (o menu da partida, a confirmação, o resumo das regras,
o fim, a dica do tutorial) não mudam: os botões e a tipografia dentro da partida ficam para depois ("futuramente", 2026-11-18 (4)).
Nenhuma regra, rede, protocolo ou estado de partida muda.

**Anti-objetivos.** Um fundo que se mexe (o "enjoo visual" de 2026-11-18 (4)); um flash; uma tela que só funcione com mouse; o tema
apagado quando a pessoa mexe numa chave dentro da partida; o JavaScript inicial acima de 200 KB.

## 2. A navegação [A] com o como [C]

O Início vira um menu de quatro entradas, cada uma com a sua rota (o Voltar do navegador e o gesto do celular voltam ao Início) **[C]**:

| Rota | Tela | O que tem |
|---|---|---|
| `/` | Início | o emblema; a lista: **Jogar online**, **Treinar**, **Partidas anteriores**, **Opções**; o controle do tema |
| `/jogar` (nova) | Jogar online | os painéis **Criar sala** (apelido, vida inicial, Criar sala) e **Entrar numa sala** (código ou link, Entrar) |
| `/treinar` (nova) | Treinar | **Jogar com o bot** (leva a `/treino`) e **Aprender jogando** (leva a `/tutorial`) |
| `/opcoes` (nova) | Opções | **Aparência** (deck e Coringa, a amostra) e **Preferências** (Som, Reduzir animações, Passar sozinho quando não tenho resposta) |
| `/treino`, `/partidas`, `/s/<código>`, … | as de hoje | a mesma lógica, com a roupa nova (§5) |

- Cada tela de entrada tem o carimbo **Início** no alto (leva a `/`). O que cada formulário faz, os erros e os textos são os do Início de
  hoje (`Home.tsx`), só mudam de tela.
- **[C]** "Partidas anteriores" é a terceira linha (o autor a pôs na lista, 2026-11-18 (4)).
- **[C]** As Opções trazem as três preferências que o jogo já guarda (`Prefs`); hoje o Início só tinha o Som. São as mesmas chaves do
  menu da partida, gravadas no mesmo `coringa:prefs`.
- **[C]** O tutorial por fazer: o selo vermelho na mini carta do Treinar e, dentro de Treinar, "Aprender jogando" em ouro com o selo. Feito
  ou pulado, os dois somem e "Aprender jogando" fica de papel.
- A abertura continua só quando a página abre em `/` (`main.tsx`, `App.tsx`): abrir `/jogar` direto não a toca.
- **[A]** (era [C]; "Concordo", `decisoes.md` 2026-11-18 (6)) O que promete criar uma sala leva direto a `/jogar` (o formulário), e não
  ao Início, que virou um menu: "Criar sala" da sala que
  não existe e da partida parada, "Criar outra sala" da sala cheia, "Nova sala" no fim da partida online e "Jogar com um amigo" no fim
  do tutorial. "Voltar ao início" continua indo a `/`.

## 3. O tema [A]

- **Rosa** (a cor da capa da mesa, `#ee9db5`, com a moldura dupla de folheto e os losangos vermelhos nos cantos) é o **padrão**; **verde**
  (o feltro, com o filete de ouro da borda da mesa e a costura) é a outra opção. Os dois são parados.
- **[C]** Guardado em `coringa:prefs` como `menuTheme?: 'pink' | 'green'`, opcional como o `look`: ausente é rosa, e nada se grava até a
  pessoa trocar. Quem lê usa `prefs.menuTheme ?? 'pink'`.
- **[C]** O controle: um `<button>` no canto do alto do Início, com uma bolinha da outra cor (~18 px), área de toque de 44 px, `aria-pressed`
  e o nome "Fundo verde" (ou "Fundo rosa"); a troca é na hora, sem recarregar. Vale para todas as telas fora da mesa (um contexto do
  `App`); a mesa não muda.
- **[OBRIGATÓRIO]** O tema não pode se perder quando a pessoa muda uma chave dentro da partida (o `PlayTable.changePrefs` grava o objeto
  do menu da partida): um teste cobre.

## 4. A aparência [A]

- **Tokens:** os de hoje (`tinta`, `papel`, `ouro`, `vermelho`, `madeira`, `capa-voce`) não mudam de valor. O verde do fundo e os tons do
  rosa são novos, só do menu, num arquivo próprio: `src/ui/menu/menu.css` **[C]** (fora do `styles.css`, que o teste das animações sem
  fim lê, `phases.test.tsx`).
- **O emblema:** o `Coringa.tsx` do jogo (nada de desenho novo), numa variante grande, num disco de papel com o anel pontilhado; os guizos,
  as pontas do chapéu e a gola passam da borda, com um contorno de papel e um fio de tinta por fora. **[C]** É a exceção à regra "ilustração
  entra por arquivo": o desenho já está no JavaScript inicial.
- **A lista:** cada linha é um link (`<a href>` com o roteador, como o `AppLink`), com a mini carta (papel, índice do naipe nos cantos:
  ♥ Jogar online, ♠ Treinar, ♣ Partidas anteriores, ♦ Opções; o símbolo no meio: globo, espadas cruzadas, ampulheta, regulagem), o nome em
  tipo de madeira, uma linha curta e a seta. Fio entre as linhas; no hover, um realce suave.
- **Os carimbos** (as telas de entrada e as outras telas): o `.carimbo` da mesa (`styles.css`): borda de tinta de 3 px, cantos retos,
  sombra dura da madeira (3 px; 4 px nos grandes, com o grão), face de papel ou de ouro, e no toque afunda. A opção marcada (vida, deck,
  Coringa) é o carimbo afundado, de tinta. Os títulos em tipo de madeira com a textura áspera da mesa (o filtro `#textura-aspera`, um
  `<svg>` com o filtro no próprio menu). Painéis de papel com borda de tinta e sombra dura.
- **Texto e números:** Archivo nos rótulos, nas dicas e nos números (`tabular-nums` na vida); tipo de madeira só em títulos, nomes e
  botões **[OBRIGATÓRIO]** (spec da web §10.7).
- **PC:** o Início com o emblema em cima e a lista embaixo, no meio da tela [A]; as telas de entrada numa coluna central **[C]** (até ~480
  px), no mesmo fundo.

## 5. As outras telas fora da mesa [C]

Ganham o fundo do tema e as peças novas, sem mudar o que fazem: a escolha do nível do treino (`/treino` antes da mesa), a sala de espera
(Lobby), a entrada pelo link (RoomGate), as partidas anteriores (a lista), a partida parada, a página não achada, o "carregando" e a falha
das telas sob demanda e do treino (`local-game.tsx`, `lazy-screen.tsx`, `App`). O replay: só os estados sem mesa (partida não achada); o
visualizador fica como está. As peças de `parts.tsx` seguem como estão para a partida (`EndPanel`, `HintPanel`, `GameMenu`); o
`LookChoice` e o `HpChoice` ganham uma pele de menu (`skin="menu"`), e o menu da partida usa a de hoje.

## 6. Movimento [A] e os limites [OBRIGATÓRIO]

- **A mini carta respira** (sobe 3 px num ciclo de 3,6 s, cada uma num tempo) e, **sob o mouse, inclina em 3D** com a conta da mão do jogo
  (`Hand.tsx`: até 13°, `perspective(600px)`, a sombra acompanhando), sobe 6 px; **no toque**, sobe 8 px e inclina para o lado do dedo.
  O ponteiro vale para a linha inteira; a inclinação é escrita no estilo do invólucro da carta, sem redesenhar.
- **Entradas:** o emblema e as linhas sobem ao abrir a tela (0,5 a 0,7 s, uma depois da outra); o emblema flutua 3 px num ciclo de 7 s.
- **Movimento reduzido** (sistema ou a chave do menu): nada respira, flutua, entra ou inclina; o hover só realça. A raiz do menu leva o
  `data-movimento-reduzido` quando a chave está ligada.
- Nenhum flash, nenhuma troca de luminância da tela (spec da web §10.4). Nada se mexe no fundo.

## 7. Acessibilidade [OBRIGATÓRIO]

Um `<h1>` por tela (o do Início, "Jogo do Coringa", só para o leitor de tela; nas telas que a rota troca, o foco vai a ele ao abrir, como o
`Title` de hoje); a lista num `<nav aria-label="Menu">`; alvos de toque de 44 px ou mais; campos de 16 px; o contorno de foco ouro com a
borda de tinta; contraste AA (tinta sobre o rosa; papel sobre o verde, ~6,6:1); a chave com `role="switch"` e o estado escrito; o selo e a
mini carta decorativos (`aria-hidden`). O nome de cada link é o texto visível inteiro, a entrada e a linha curta (WCAG 2.5.3: o axe
dos E2E barra o nome que não contém o texto que se vê; na primeira versão, a linha ia na descrição e o `pnpm e2e` reprovou).

## 8. Orçamento e desempenho [OBRIGATÓRIO]

- JavaScript inicial ≤ 200 KB gzip (hoje 187,4): o Início e as três telas de entrada ficam no inicial (são leves); o smoke confere. Sem
  imagem: o grão é o SVG em `data:` que a mesa já usa (CSP `img-src data:`).
- As animações sem fim do menu (a respiração das cartas, o flutuar do emblema) são pequenas, locais e param com movimento reduzido.

## 9. Testes

- **Unidade (antes do código, vistos vermelhos):** a preferência do tema (ausente é rosa, a troca grava, ler valor inválido volta a rosa);
  as rotas novas; o Início (as quatro linhas e os destinos, o selo do tutorial, o controle do tema troca o fundo e grava); Jogar online
  (os testes de criar e entrar que hoje são do Início); Treinar (os destinos, o ouro e o selo com o tutorial por fazer); Opções (a aparência
  e as três chaves gravam, o Som avisa o controlador); a inclinação (o ponteiro escreve a inclinação; com movimento reduzido, não); o tema
  sobrevive a uma troca de chave no menu da partida.
- **Os que mudam:** `home.test.tsx` (vira o do Início e o das telas novas), o que olhar classe que saiu (`bg-ouro`, `text-base`: a garantia
  segue, a classe muda), `router.test.tsx`, `app.test.tsx` onde passar pelo Início.
- **E2E:** os que abrem `/` para criar sala vão direto a `/jogar`; um passa pelo menu (Início → Jogar online); o `tutorial.spec` reescreve a
  ordem "Aprender jogando antes de Criar sala" (agora é o selo do Treinar); o `abertura.spec` clica no link "Partidas anteriores".
- **Smoke:** o orçamento do JavaScript inicial.

## 10. Ordem de entrega

1. Esta spec e o plano (`docs/superpowers/plans/2026-11-18-menus-folheto.md`).
2. O tema, as peças do menu, o Início, as rotas e as três telas de entrada, com os testes.
3. As outras telas fora da mesa (§5).
4. Os E2E, a conferência no navegador (rosa e verde, 360 e 1440 px), o `pnpm check`, o `pnpm e2e`, o PR.

## 11. Fica para depois

Os botões e a tipografia dentro da partida (a mesma identidade, quando o autor pedir); as telas de entrada com um arranjo próprio de PC; um
tema por aparelho que siga o sistema.
