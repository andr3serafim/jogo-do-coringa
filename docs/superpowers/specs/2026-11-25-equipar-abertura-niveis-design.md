# O Equipar sem texto, a abertura sem título e os níveis com identidade

> Spec de 2026-11-25. Origem: `docs/memoria/decisoes.md` 2026-11-25 (1) a (7). Fotos aprovadas (fora do git):
> `docs/superpowers/specs/2026-11-25-equipar-y/` (a Y, o mostruário das artes, a mão) e `2026-11-25-niveis-direcoes/a-*.png`.
> O protótipo que gerou as fotos está em `2026-11-25-equipar-y/prototipo.patch` (+ `EquipArt.tsx.txt`): é ponto de partida, não o código final.

## 1. Por quê

O autor joga no celular e achou o Equipar poluído: muito texto ("Faltam 3 cartas", legendas, a lista da montagem, "Tudo no lugar…"), um
Confirmar de largura cheia e os botões encostados na borda. Ele quer o painel limpo, só com figuras que se entendem, tudo centrado e alinhado.
A abertura tem elementos de que ele não gosta (o título, o anel e a aura de ouro). Os botões de nível são iguais entre si.

Não-objetivos: mexer na barra da fase de ataque (o Atacar e o Encerrar turno ficam como estão), na largura da mão no PC (fica como hoje,
2026-11-25 (7)), na ordem das cartas (nenhuma ordenação, 2026-11-25 (2)) e em regras do motor.

Anti-objetivos: perder informação para quem usa leitor de tela; botões menores que 44 px; regressão nos E2E, no smoke (JavaScript inicial
≤ 200 KB, a abertura fora do inicial) e na regra de fotossensibilidade.

## 2. Abordagens consideradas

- **Equipar:** A e B com texto (reprovadas, 2026-11-25 (3)); X (cartas em cima, botões numa linha embaixo, também no PC) e **Y** (no PC uma
  linha só; no celular, duas). Medido: na Y os botões deslizam no PC a cada carta posta (~45 px), na X ficam parados mas o painel cresce
  ~60 px no PC. **Escolhida a Y** (2026-11-25 (4)), sabendo do deslize.
- **Mão no PC:** como hoje × aproximada do painel. **Como hoje** (2026-11-25 (7)).
- **Passar:** seta em arco (reprovada); mão espalmada, **setas de pular** (escolhida, 2026-11-25 (5)), carta que desliza.
- **Níveis:** **A** (papel, faixa de cor, o rosto do Coringa) × B (face na cor, naipes). **A** (2026-11-25 (3)).

## 3. O Equipar (tarefas 1, 2 e 4) — PR 1

### 3.1 Disposição

- **PC (≥ 1024 px):** uma linha centrada no painel: `[cartas que faltam] [↶] [destinos] [↻]`, com tudo posto `[↶] [Confirmar] [↻]`. Sem vão
  interno: a lista das cartas tem a largura natural delas (`n × --hand-w + (n−1) × 8 px`), limitada a 100 % do painel, e só se sobrepõe
  quando não cabe. O conteúdo fica centrado no espaço que a mão deixa (a mão segue com `clamp(360px, 50%, 600px)`).
- **Celular e tablet:** sempre duas linhas centradas: as cartas em cima, `[↶] [destinos] [↻]` embaixo. Nunca junta numa linha (na última
  carta, a medida do protótipo mostrou os botões pulando para a linha das cartas: isso não pode acontecer).
- Alvos de toque ≥ 44 px; o destino e o Confirmar com 56 × 56 no celular e 64 × 64 no PC (o Confirmar e o Passar, mais largos pela palavra).
- O foco segue como hoje: depois de cada escolha, o primeiro destino; com tudo posto, o Confirmar (`data-foco`).

### 3.2 Botões

- **Desfazer e Recomeçar:** o selo redondo sem legenda; o nome no `aria-label` e no `title`.
- **Destinos:** só a figura (espada, escudo; a troca com o disco da troca; o descarte com a lápide), no carimbo quadrado de papel. O nome
  inteiro de hoje (com a carta que sai) fica no `aria-label` e no `title`. Na troca, a carta que sai aparece como uma **carta pequena**
  (valor e naipe) no canto do carimbo, decorativa (`aria-hidden`).
- **Confirmar:** o carimbo de ouro com o visto e a palavra CONFIRMAR embaixo.
- **Passar** (janela de reação, `ReactionPanel`): o carimbo de papel com as setas de pular (`PassSkipIcon`) e a palavra PASSAR embaixo, no
  lugar do carimbo grande de largura cheia. Fica onde está na barra.

### 3.3 Textos que viram arte (o sentido fica para o leitor de tela)

| Hoje (texto à vista) | Agora (arte) | Para o leitor de tela |
|---|---|---|
| "Faltam N cartas" / "Tudo no lugar: confira…" | nada à vista | região viva `sr-only` com o mesmo texto |
| A lista "4♣ → Fileira de Ataque" | nada à vista (as cartas já estão na fileira, como rascunho) | a lista `sr-only` "Sua montagem" |
| "forma quadra de 7: +7 e 1 Ressurreição" | o selo de ouro: quatro cartas em leque com o 7, "+7" e a Ressurreição | o texto `sr-only` dentro do selo, numa região viva |
| "Enviando…" | três pontos de ouro que pulsam (parados com movimento reduzido) | `role="status"` com o texto `sr-only` |
| aviso de jogada recusada (`rate`, `rule`) | o disco vermelho com X | `role="status"` com o texto `sr-only`; o motivo abre **ao tocar, focar ou passar o mouse** (o `title` não existe no iPhone): o padrão das marcas do Coringa (`mark-tip.ts`, uma dica por vez) |
| "Você não recebeu numéricas nesta rodada" (+ "Esperando X montar…") | a carta tracejada riscada (+ a ampulheta) | `role="status"` com os textos `sr-only` |
| "Você já confirmou; esperando X" / "Esperando X montar…" | o visto de ouro + a ampulheta (enviando: + os pontos) | `role="status"` com o texto `sr-only` |
| "Sua mão está vazia" (`Hand.tsx`) | três cartas lisas em leque, apagadas, na cor do texto do lugar | `role="img"` com `aria-label` |

O selo da quadra e o aviso recusado flutuam sobre o painel (fora do fluxo, sem empurrar nada) e não podem cobrir uma carta nem um botão:
conferir com fotos no celular e no PC durante a implementação. Os desenhos novos moram no `icons.tsx` (no traço das figuras da mesa) e as
composições num arquivo do painel (`EquipArt.tsx`). Nada de `filter` nem sombra com desfoque.

### 3.4 Cartas que faltam (tarefa 4)

- A escolhida só sobe (como na mão): perde o `z-[1]`, e a da direita segue por cima. O canto com o valor de cada carta fica sempre à vista
  (hoje, com 4 numéricas no celular, uma some atrás da escolhida).
- A sobreposição só quando não cabe (a regra de hoje, com o limite de `−0,6 × --hand-w`). Nenhuma ordenação.
- A mão das especiais já segue essa regra; o que muda nela é só a arte da mão vazia.

### 3.5 Textos e testes que acompanham

- **Tutorial:** a dica do Equipar ("toque numa carta e depois no destino, Ataque ou Defesa") passa a nomear as figuras: "…no destino, a espada
  (Ataque) ou o escudo (Defesa)…". **[Proposta]** o autor confere o texto no PR.
- **Testes de unidade** que procuram texto à vista mudam para o nome acessível (`getByRole(..., { name })`) ou para o texto `sr-only`:
  `stamp-buttons`, `phases`, `training`, `tutorial`, `card-drag`, `table-drag`, `action-bar`, `replay-screen`, `end-and-menu`, `automation`,
  `equip` (onde citarem as legendas, o "Faltam", "Enviando…", "Sua mão está vazia" ou a lista). Novo: o painel na Y (as classes da disposição),
  as artes com o texto do leitor, o selo da quadra, o disco recusado abrindo a dica no toque, a carta pequena da troca, o Passar com o nome.
- **E2E:** `helpers.ts` (`equipByUi`, `equipLeft`, o `playOnce`), `training`, `mobile`, `drag`, `sound`: os seletores passam ao nome
  acessível ou ao texto `sr-only`. O `mobile.spec` confere os alvos ≥ 44 px no painel novo.

## 4. A abertura (tarefa 5) — PR 2

- **Saem:** o título "Jogo do Coringa" (`.abertura-titulo`, o `INTRO_TITLE`), a aura radial (`.abertura-aura`), o anel (`.abertura-onda`) e as
  faíscas (`.abertura-faisca`), com os keyframes deles.
- **Fica:** as quatro cartas sobem, juntam-se e o maço vira no Coringa; a capa, o pulo (clique, toque, tecla), o aviso de pular e o esmaecer.
- **O som** `abertura-titulo` fica (2026-11-25 (2), 5b). **[Proposta]** a chamada dele cai na virada do Coringa (`flipAt`), já que não há
  título: a pista começa 300 ms antes (como hoje começa antes do título).
- **Mais curta** (5c, ok do autor para ~2,3 s). **[Proposta]** `fadeAt` 1900 ms e `total` 2350 ms (o Coringa fica ~600 ms à vista antes de
  esmaecer). A versão curta (movimento reduzido) vira só o Coringa parado, com os tempos de hoje (1,8 s).
- `model/intro.ts` segue sendo a fonte única dos instantes; os testes (`intro.test.ts`, `intro.test.tsx`, `abertura.spec.ts`, `synth.test.ts`)
  mudam para a ordem e as durações novas. O smoke segue com a marca `abertura-palco`. O `CLAUDE.md` (seção Abertura) troca "o título é
  carimbado" e "3,15 s".

## 5. Os níveis (tarefa 6) — PR 3

- A direção A como na foto: cada botão é o carimbo de papel com uma faixa de cor na borda esquerda (Fácil verde `capa-oponente`, Médio ouro,
  Difícil vermelho) e, à esquerda do nome e da linha, o rosto do Coringa num medalhão de fundo claro na cor do nível: **feliz** no Fácil,
  **sério** no Médio, **bravo** no Difícil (o humor novo `bravo` no `ResultMedal.tsx`: sobrancelhas em V e o sorriso de lado).
- O nome acessível segue o texto visível (nível e linha); o medalhão é `aria-hidden`. Nos dois temas do menu (rosa e verde) o contraste do
  texto segue o de hoje (tinta sobre papel).
- Testes: o `training.test.tsx` (o nome dos botões não muda) e um teste do humor `bravo`.

## 6. A queda do treino (tarefa 3) — fora destes PRs

iPhone, deck de arte, no meio de uma partida longa: a página recarregou sozinha. Medido no Chromium (não reproduz o iOS): sem vazamento
claro; o deck de arte soma ~75 MB. Pergunta aberta ao autor: o treino retomar a partida depois de recarregar (a sala local é determinística,
semente e jogadas). Se ele aprovar, spec própria.

## 7. O que fica com quem implementa

- Os tamanhos finos (gaps, a posição exata do selo da quadra e do disco recusado), conferidos com fotos no celular (360 e 375 px) e no PC.
- O nome do componente da dica do aviso recusado (generalizar a `MarkFigure` ou um componente pequeno sobre o `mark-tip.ts`).
- A ordem dos commits dentro de cada PR. Cada PR com `pnpm check` e `pnpm e2e` verdes, e o advisor revisa o plano e a implementação.
