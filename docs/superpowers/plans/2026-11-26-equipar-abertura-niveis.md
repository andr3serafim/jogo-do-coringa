# O Equipar sem texto, a abertura sem título e os níveis com identidade — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o painel do Equipar só com figuras, centrado (a Y), o Passar quadrado, a abertura sem título/aura/anel/faíscas e mais curta, e os
botões de nível com cor e o rosto do Coringa.

**Architecture:** só `packages/web`. O que era texto vira arte em `icons.tsx` (figuras) e `EquipArt.tsx` (composições do painel); o texto
continua para o leitor de tela (`sr-only`, `aria-label`). A dica do aviso recusado reaproveita o comportamento da `MarkFigure`, extraído num
gancho. A abertura muda só no modelo (`model/intro.ts`), no componente e no CSS dela. Três PRs, nesta ordem.

**Tech Stack:** React 19, Tailwind 4, Vitest + Testing Library (jsdom), Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-11-25-equipar-abertura-niveis-design.md` (aprovada, `decisoes.md` 2026-11-26 (1)). O protótipo das
fotos está fora do git em `docs/superpowers/specs/2026-11-25-equipar-y/prototipo.patch` + `EquipArt.tsx.txt`: serve de partida para os
desenhos (os caminhos SVG dos ícones), não para a estrutura.

## Global Constraints

- Imports relativos com `.ts`/`.tsx`; só sintaxe apagável; `import type` para tipos (o `CLAUDE.md`).
- Textos e comentários em pt-BR; identificadores em inglês. Arte original do projeto.
- Alvos de toque ≥ 44 px. Destino e Confirmar: 56 × 56 no celular, 64 × 64 no PC; Confirmar e Passar mais largos pela palavra.
- Números de jogo em `font-texto tabular-nums` (spec §10.7). Nada de `filter` nem sombra com desfoque nas animações.
- Com movimento reduzido (`prefers-reduced-motion` ou `[data-movimento-reduzido]`), nada pulsa.
- JavaScript inicial ≤ 200 KB e a abertura fora dele (o smoke, marca `abertura-palco`).
- `pnpm check` antes de cada commit (o pre-commit roda a versão rápida); `pnpm e2e` verde antes de cada PR. Nunca `--no-verify`.
- A cada tarefa: `estado.md` com o próximo passo e uma entrada (ou linha) no `diario.md` com os `Ruling:` (regras 2 e 6 do `CLAUDE.md`).

## Review Focus

1. **O celular pula de layout:** no celular, com 1 carta por pôr, cartas e botões não podem juntar numa linha (a Y prototipada fazia isso).
   Teste na Tarefa 3: as classes da disposição (`flex-col` sem `pc:` só no celular) não dependem de quantas cartas faltam.
2. **A carta escolhida tapa a vizinha:** com 4 numéricas e a primeira escolhida, a segunda continua com o canto à vista. Teste na Tarefa 3:
   o `<li>` da escolhida não tem `z-[1]` (nem outro `z-`).
3. **O toque no disco recusado pula a cena ou não abre nada no iPhone:** o disco tem `data-sem-pulo`, abre no toque e no foco, fecha no Esc
   (engolido) e no toque fora. Teste na Tarefa 2.
4. **Leitor de tela perde o que sumiu da vista:** "Faltam N cartas", a montagem, a quadra, "Enviando…", "Você não recebeu numéricas…",
   "Esperando X montar…", "Sua mão está vazia" seguem no DOM acessível. Testes nas Tarefas 2, 3 e 4 (`getByText` acha o `sr-only`;
   `getByRole('img', { name })` na mão vazia).
5. **A troca perde a carta que sai:** o destino de troca segue com "sai 9♠" no nome acessível e mostra a carta pequena. Teste na Tarefa 3.

---

## PR 1 — o Equipar e o Passar (branch `feat/ajustes-2026-11-25`, já com a spec)

### Tarefa 1: as figuras novas e o selo sem legenda

**Files:**
- Modify: `packages/web/src/ui/table/icons.tsx` (novas: `ConfirmIcon`, `PassSkipIcon`, `EmptyHandIcon`, `NoCardsIcon`, `WaitingIcon`,
  `RejectedIcon`, no estilo de `Art`; os caminhos SVG vêm do protótipo, com o `EmptyHandIcon` de contornos lisos, `fillOpacity 0.14`)
- Modify: `packages/web/src/ui/table/controls.tsx` (`Seal` sem a legenda: `aria-label={label}` e `title={label}`)
- Modify: `packages/web/src/styles.css` (sai `.carimbo-selo-legenda`; entram `.carimbo-icone` 56/64 px quadrado, coluna, `gap 1px`, e
  `.carimbo-icone-palavra` largura automática, `min-width` 56/64, `padding-inline 10px`, 10/11 px, 800, maiúsculas; `.ponto-enviando` com o
  keyframe e o corte no movimento reduzido)
- Test: `packages/web/test/ui/stamp-buttons.test.tsx`

**Interfaces:**
- Produces: `ConfirmIcon`, `PassSkipIcon`, `EmptyHandIcon`, `NoCardsIcon`, `WaitingIcon`, `RejectedIcon` — `({ className?: string }) => JSX`,
  `aria-hidden`, `data-arte` = `confirmar` | `passar` | `mao-vazia` | `sem-numericas` | `espera` | `recusada`. Classes CSS `carimbo-icone`,
  `carimbo-icone-palavra`, `ponto-enviando`.

- [ ] **Step 1:** no `stamp-buttons.test.tsx`, o teste "no Equipar: … selos redondos com desenho e legenda" vira "…selos redondos só com o
  desenho": para `Desfazer` e `Recomeçar`, `getByRole('button', { name })` existe, tem `title` igual ao nome e `textContent` vazio (sem
  `.carimbo-selo-legenda`).
- [ ] **Step 2:** rodar `pnpm --filter @coringa/web exec vitest run test/ui/stamp-buttons.test.tsx` — FAIL (a legenda ainda existe).
- [ ] **Step 3:** implementar o `Seal`, as figuras e o CSS acima.
- [ ] **Step 4:** o mesmo comando — PASS.
- [ ] **Step 5:** commit `feat(web): as figuras do Equipar sem texto e o selo sem legenda`.

### Tarefa 2: as artes do painel e a dica do aviso recusado

**Files:**
- Create: `packages/web/src/ui/table/EquipArt.tsx`
- Create: `packages/web/src/ui/table/useMarkTip.ts` (o comportamento da dica extraído da `MarkFigure`: abrir no mouse, no foco e no toque;
  fechar no toque fora, no Esc — que ela engole —, ao rolar o que a contém e ao redimensionar; uma por vez pelo `mark-tip.ts`)
- Modify: `packages/web/src/ui/table/MarkFigure.tsx` (passa a usar o `useMarkTip`, sem mudar o que faz)
- Test: `packages/web/test/ui/equip-art.test.tsx` (novo); `packages/web/test/ui/mark-figure.test.tsx` segue verde

**Interfaces:**
- Consumes: as figuras da Tarefa 1; `ResurrectIcon`; `Suit`, `isRedSuit`; `equipQuadText`, `NO_PENDING_TEXT`, `SENDING_TEXT` do `copy.ts`.
- Produces:
  - `useMarkTip(id: string, button: RefObject<HTMLElement | null>): { open: boolean; handlers: { onPointerEnter; onPointerLeave; onFocus; onBlur; onClick } }`
  - `MiniCard({ card }: { card: Card })` — a carta pequena (valor + naipe), `aria-hidden`, presa ao canto do carimbo.
  - `QuadBadge({ value }: { value: number })` — `data-quadra-nova`, o leque de 4 cartas com o valor, `+{value}`, a Ressurreição; o texto
    `equipQuadText(value)` em `sr-only`.
  - `SendingDots()` — `role="status"`, `SENDING_TEXT` em `sr-only`, três pontos `ponto-enviando`.
  - `RejectedNotice({ text }: { text: string })` — `role="status"` com `text` em `sr-only` + o botão do disco (`aria-label={text}`,
    `data-sem-pulo`) que abre a dica (`id` = `'recusa'`) com o `text` num cartão de papel.
  - `NoCardsArt({ waiting, waitingText }: { waiting: boolean; waitingText: string })` e `ConfirmedArt({ text, sending }: { text: string; sending: boolean })`
    — `role="status"`, o texto em `sr-only`.

- [ ] **Step 1:** `equip-art.test.tsx` com: o `QuadBadge` de 7 mostra "+7" e tem o texto "forma quadra de 7: +7 e 1 Ressurreição"; o
  `MiniCard` de 9♠ tem "9" e é `aria-hidden`; `SendingDots` é um status com "Enviando…"; `NoCardsArt` com `waiting` tem os dois textos;
  `ConfirmedArt` com `sending` diz "Enviando…" e sem diz o `text`; `RejectedNotice`: o botão "Calma: uma jogada por vez" tem `data-sem-pulo`,
  o clique abre a dica (o texto fica visível num elemento além do `sr-only`), o Esc fecha e chega com `defaultPrevented` (ou o mesmo sinal que
  a `MarkFigure` usa hoje), o `pointerdown` fora fecha.
- [ ] **Step 2:** rodar `pnpm --filter @coringa/web exec vitest run test/ui/equip-art.test.tsx` — FAIL (o arquivo não existe).
- [ ] **Step 3:** extrair o `useMarkTip` da `MarkFigure` (mesmo comportamento) e escrever o `EquipArt.tsx`. A dica do disco fica presa ao
  painel (`absolute`, acima do disco, `z-40`, como a dica do alvo da `ActionBar`), papel com contorno de tinta e sombra dura.
- [ ] **Step 4:** `pnpm --filter @coringa/web exec vitest run test/ui/equip-art.test.tsx test/ui/mark-figure.test.tsx` — PASS (os testes da `MarkFigure`
  inclusos).
- [ ] **Step 5:** commit `feat(web): as artes do painel do Equipar e a dica do aviso recusado no toque`.

### Tarefa 3: o painel do Equipar na Y

**Files:**
- Modify: `packages/web/src/ui/table/EquipPanel.tsx`
- Test: `packages/web/test/ui/phases.test.tsx`, `packages/web/test/ui/stamp-buttons.test.tsx` (o Confirmar), `test/ui/table-drag.test.tsx`,
  `test/ui/training.test.tsx`, `test/model/equip.test.ts`, `test/model/automation.test.ts`, `test/ui/action-bar.test.tsx` onde citarem algo
  que mudou

**Interfaces:**
- Consumes: Tarefas 1 e 2.
- Produces: o painel com `aria-label="Equipar"` de sempre; a lista `Destinos` (botões com o nome do terminal); o botão `Confirmar` (nome
  acessível "Confirmar", texto visível "CONFIRMAR"); `Desfazer`/`Recomeçar`; a lista `Suas numéricas`; o texto `sr-only` "Faltam N cartas" /
  `EQUIP_READY_TEXT`; a lista `sr-only` "Sua montagem".

- [ ] **Step 1:** ajustar/escrever no `phases.test.tsx`:
  - o "Faltam 3 cartas" e a montagem seguem achados por texto, e o elemento tem a classe `sr-only`;
  - os destinos não têm texto visível (o `textContent` do botão de Ataque é vazio) e têm o nome "Fileira de Ataque";
  - o destino de troca tem o nome com "sai 9♠" (ou a carta da fixture do teste) e contém a carta pequena (`aria-hidden`);
  - o Confirmar tem o nome "Confirmar" e a classe `carimbo-ouro`; não há mais botão de largura cheia (`w-full`);
  - a quadra do rascunho aparece no `QuadBadge` (`[data-quadra-nova]`) e some ao desfazer;
  - "Você não recebeu numéricas nesta rodada", "Você já confirmou; esperando …", "Esperando … montar…" seguem achados (agora em `sr-only`);
  - o `<li>` da numérica escolhida não tem classe `z-*`;
  - a disposição: o contêiner das cartas e dos botões tem `flex-col` e `pc:flex-row` (e nenhuma classe sem `pc:` que o ponha em linha), com
    1 e com 4 cartas por pôr.
- [ ] **Step 2:** `pnpm --filter @coringa/web exec vitest run test/ui/phases.test.tsx` — FAIL.
- [ ] **Step 3:** implementar no `EquipPanel.tsx`: a Y (`flex flex-col items-center gap-3 pc:flex-row pc:justify-center pc:gap-5`); a lista
  das cartas com `style={{ width: calc(n × --hand-w + (n−1) × 8px) }}`, `max-w-full min-w-0 flex-[0_1_auto]`; os botões
  `[Desfazer] [destinos | Confirmar] [Recomeçar]`; o `DestinationStamp` só com a figura (`carimbo-icone`, figura 32/36 px) e o `MiniCard` na
  troca; o Confirmar `carimbo carimbo-ouro carimbo-icone carimbo-icone-palavra` com `ConfirmIcon` e a palavra; o `PendingCard` sem `z-[1]`;
  os estados `NoCardsArt`/`ConfirmedArt`; o `QuadBadge` e o `SendingDots`/`RejectedNotice` flutuando no canto do contêiner, sem empurrar
  nada. Saem os imports que sobrarem (`DESTINATION_SHORT`, `leavingShort`, `NoticeLine`, `TwoLine`, `PRIMARY*`).
- [ ] **Step 4:** `pnpm --filter @coringa/web exec vitest run test/ui test/model` — PASS (corrigir os outros testes que citavam a lista
  visível, as legendas ou o Confirmar largo, trocando por nome acessível; nenhum teste apagado sem dizer no commit qual e por quê).
- [ ] **Step 5:** commit `feat(web): o painel do Equipar na Y, só com figuras`.

### Tarefa 4: o Passar quadrado, a mão vazia e a dica do tutorial

**Files:**
- Modify: `packages/web/src/ui/table/ReactionPanel.tsx` (`PassButton`: `carimbo carimbo-papel carimbo-icone carimbo-icone-palavra` com
  `PassSkipIcon` e a palavra `PASS_LABEL`)
- Modify: `packages/web/src/ui/table/Hand.tsx` (a mão vazia: `role="img"`, `aria-label="Sua mão está vazia"`, `EmptyHandIcon` 56/64 px,
  `text-tinta/60` e `pc:text-papel/50`; sem largura reservada)
- Modify: `packages/web/src/model/tutorial-copy.ts` (a dica do Equipar: "…toque numa carta e depois no destino, a espada (Ataque) ou o
  escudo (Defesa) (ou arraste a carta até a fileira)…")
- Modify: `packages/web/src/ui/table/ActionBar.tsx` só se o `PassButton` pedir outra classe no contêiner (o Cancelar ao lado segue igual)
- Test: `test/ui/action-bar.test.tsx` (ou o teste do `ReactionPanel`), `test/ui/phases.test.tsx` (a mão vazia), `test/ui/tutorial.test.tsx`

**Interfaces:**
- Consumes: Tarefa 1. O nome acessível do Passar segue "Passar" (o E2E e o `answerReaction` dependem dele).

- [ ] **Step 1:** testes: o botão "Passar" tem `carimbo-icone-palavra`, a figura `[data-arte="passar"]` e o texto "Passar"; a mão vazia é
  `getByRole('img', { name: 'Sua mão está vazia' })`; a dica do tutorial do Equipar contém "a espada (Ataque) ou o escudo (Defesa)".
- [ ] **Step 2:** rodar esses testes — FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** os mesmos testes — PASS.
- [ ] **Step 5:** commit `feat(web): o Passar quadrado, a mão vazia em figura e a dica do tutorial`.

### Tarefa 5: E2E, fotos, documentação e o PR 1

**Files:**
- Modify: `packages/web/e2e/helpers.ts` (`equipByUi`: o "Faltam N" pelo texto `sr-only`, que o `getByText` acha; se o `innerText` não o
  trouxer, ler com `textContent`), `e2e/training.spec.ts`, `e2e/mobile.spec.ts`, `e2e/drag.spec.ts`, `e2e/sound.spec.ts` onde citarem o que
  mudou
- Modify: `CLAUDE.md` (a lista do `data-sem-pulo` ganha o disco do aviso recusado no Equipar)
- Delete: `packages/web/e2e/*.tmp.ts`, `packages/web/mostruario.tmp.html`, `packages/web/src/mostruario.tmp.tsx` (fora do git; apagar antes
  do `pnpm check`)

- [ ] **Step 1:** `pnpm check` — PASS.
- [ ] **Step 2:** `pnpm e2e` (atualizar o `estado.md` antes, regra 2) — PASS; o `mobile.spec` confere os alvos ≥ 44 px no painel.
- [ ] **Step 3:** fotos do jogo de verdade (celular 360 e 375, PC 1377 × 768): faltam 4, tudo posto, rodada 2 com especiais, a quadra no
  rascunho e o Passar numa reação (semente `tutorial-2431&nivel=facil` rodada 3, se der). Conferir que o selo da quadra e o disco não cobrem
  carta nem botão.
- [ ] **Step 4:** advisor revisa a implementação; corrigir o que ele achar.
- [ ] **Step 5:** commit, `diario.md` e `estado.md`, push e PR para a `main` com as fotos descritas; os dois jobs da CI verdes. Merge só com o
  sim do autor.

---

## PR 2 — a abertura sem título (branch `feat/abertura-sem-titulo`, da `main` depois do PR 1)

### Tarefa 6: a abertura

**Files:**
- Modify: `packages/web/src/model/intro.ts` (`INTRO`: sai `titleAt` e `titleCueAt`; entra `revealCueAt: 1000`; `fadeAt: 1900`; `total: 2350`;
  o resto igual. `introPlan` completa: `cues: [{ at: INTRO.revealCueAt, cue: 'abertura-titulo' }]`. `INTRO_REDUCED` igual)
- Modify: `packages/web/src/sound/synth.ts` (a chamada cai em `INTRO.flipAt − INTRO.revealCueAt`, 300 ms depois do começo da pista)
- Modify: `packages/web/src/ui/intro/Intro.tsx` (saem `.abertura-aura`, `.abertura-onda`, as faíscas, o `<p className="abertura-titulo">`, o
  `SPARKS` e o `--t-titulo`; o comentário do topo)
- Modify: `packages/web/src/ui/intro/intro.css` (saem as regras e os keyframes da aura, da onda, das faíscas e do título, também na variante
  curta)
- Modify: `packages/web/src/model/copy.ts` (sai `INTRO_TITLE`)
- Modify: `CLAUDE.md` (a seção Abertura: "o maço vira no Coringa", sem "o título é carimbado"; 2,35 s no lugar de 3,15 s)
- Test: `test/model/intro.test.ts`, `test/ui/intro.test.tsx`, `test/model/synth.test.ts`, `e2e/abertura.spec.ts`

- [ ] **Step 1:** testes: `INTRO.total` entre 2000 e 2600; a ordem `0 < themeAt < gatherAt ≤ revealCueAt < flipAt < fadeAt < total`;
  `fadeAt − flipAt ≥ 500`; `total − fadeAt ≥ 300`; o plano completo com a pista em `revealCueAt`; no componente, nenhum `.abertura-titulo`,
  `.abertura-aura`, `.abertura-onda`, `.abertura-faisca` nas duas variantes, e o Coringa presente; no E2E, a espera pelo fim visual passa do
  título para `.abertura-coringa`.
- [ ] **Step 2:** rodar — FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** `pnpm check` e `pnpm --filter @coringa/web exec playwright test e2e/abertura.spec.ts` (com a regra do `wrangler dev` do
  estado) — PASS. Fotos da abertura em 3 instantes (cartas, virada, fim).
- [ ] **Step 5:** advisor, commit, PR, CI verde; merge com o sim do autor.

---

## PR 3 — os níveis (branch `feat/niveis-identidade`, da `main`)

### Tarefa 7: os botões de nível

**Files:**
- Modify: `packages/web/src/ui/table/ResultMedal.tsx` (`ResultMood` ganha `'bravo'`: olhos `M25 33.5l5 2.5M39 33.5l-5 2.5M28 38h.5M35.5 38h.5`,
  boca `M26.5 45.5c4 2 8.5 1.5 11-1.5`, fechada)
- Modify: `packages/web/src/ui/screens/Training.tsx` (`LevelChoice`: o carimbo de papel com `data-nivel`, o medalhão `aria-hidden` com
  `ResultFace` — `facil` feliz, `medio` sério, `dificil` bravo — e o nome e a linha numa coluna; sem `?dir`)
- Modify: `packages/web/src/ui/menu/menu.css` (`.menu-nivel` em linha, `justify-content: flex-start`, `gap 14px`, `border-left-width 14px`
  na cor do nível; `--nivel-cor`/`--nivel-claro` por `data-nivel`: Fácil `capa-oponente`/`#e3f4e1`, Médio `ouro`/`#fdf0c4`, Difícil
  `vermelho`/`#fbe1dc`; `.menu-nivel-medalha` 58 px, borda 3 px de tinta, redondo, fundo `--nivel-claro`; `.menu-nivel .menu-nivel-medalha svg`
  100 %)
- Test: `test/ui/training.test.tsx` (os nomes dos botões não mudam; cada um tem o medalhão com o humor certo), um teste do humor `bravo`

- [ ] **Step 1:** testes acima — FAIL.
- [ ] **Step 2:** implementar.
- [ ] **Step 3:** `pnpm check` — PASS; fotos nos dois temas (rosa e verde), celular e PC; conferir o contraste do texto (tinta sobre papel).
- [ ] **Step 4:** advisor, commit, `diario.md`/`estado.md`, PR, CI verde; merge com o sim do autor.
