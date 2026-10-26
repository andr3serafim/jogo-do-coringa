# Polimento, fatia 5: arrastar cartas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** jogar uma carta arrastando-a até a zona da jogada, na fase principal e no Equipar, no celular e no PC, sem tirar os
botões nem o teclado.

**Architecture:** um modelo puro diz, para a carta segurada, quais zonas aceitam a soltura e o que cada uma faz — na fase
principal a partir das jogadas da mesa (`tablePlays`), no Equipar a partir dos destinos (`nextDestinations`, que vêm do motor).
Um gancho de ponteiro transforma o toque em arrasto depois de ~8 px, desenha um fantasma numa camada fixa e acha a zona sob o
dedo por `elementFromPoint` + `data-soltar`. A soltura passa pelo mesmo caminho do toque: a jogada única vai pelo `send` (que
confere `isLegal`), a escolha abre a barra como o toque abre, e o destino do Equipar entra no rascunho como o botão.

**Tech Stack:** TypeScript, React 19, Pointer Events, Tailwind 4, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§1, §6).

## Global Constraints

- Sem regra na interface: as zonas válidas saem de `tablePlays` e de `nextDestinations`; a soltura só manda o que o toque
  mandaria, pelo mesmo `send` com `isLegal`.
- Os botões e o teclado continuam exatamente como hoje (WCAG 2.5.7). Arrastar é um caminho a mais, nunca o único.
- Travado não arrasta (batidas em curso, jogada em voo, conexão caída); o `pointerdown` que pula as batidas não começa arrasto.
- Fotossensibilidade e movimento: o contorno das zonas válidas é parado (sem piscar); o fantasma segue o dedo e some na soltura,
  sem voo de volta (nem com movimento normal: decisão de quem constrói, §9 da spec), e nada de flash.
- JS inicial ≤ 200 KB gzip (o arrasto faz parte da mesa e fica pequeno).
- Nenhum efeito, texto ou cena nova ligado à Pressão da mesa. Textos em pt-BR; identificadores em inglês. `pnpm check` verde
  antes de cada commit; nunca `--no-verify`.

## Review Focus

1. **Toque trêmulo no celular:** um toque com menos de ~8 px de movimento continua escolhendo a carta como hoje; nada arrasta
   nem é mandado. Teste na Tarefa 2.
2. **Arrasto durante as batidas** ou com jogada em voo: não começa; o toque que pula as batidas não vira arrasto. Teste na
   Tarefa 3.
3. **Soltar fora de qualquer zona:** a carta volta à mão, nada é mandado, nada fica selecionado por engano. Teste na Tarefa 3.
4. **A jogada deixou de valer no meio do arrasto** (um `state` novo chegou): a soltura não manda nada (o `isLegal` recusa) e o
   fantasma some. Teste na Tarefa 3.
5. **Rolagem no celular:** arrastar uma carta da mão não rola a página; tocar fora das cartas ainda rola os campos. Teste na
   Tarefa 4 (E2E no celular).

---

### Task 1: as zonas de soltura (modelo)

**Files:**
- Create: `packages/web/src/model/drag.ts`
- Test: `packages/web/test/model/drag.test.ts`

**Interfaces:**
- Produces:
  - `export type DropKey = string` — o valor do atributo `data-soltar` de uma zona: `buffs:ATK`, `buffs:DEF`, `guarda`,
    `carta:<id>` (uma carta do oponente que é alvo), `fileira:ATK`, `fileira:DEF`, `ultima:ATK`, `ultima:DEF`, `cemiterio`;
  - `export interface PlayDrop { play: CardPlay; targetId?: string }`;
  - `export function playDropZones(cardId: string, plays: TablePlays): Map<DropKey, PlayDrop[]>` — cada jogada da carta vai
    para a zona dela: sem alvo, `PLAY_J` → `buffs:ATK`, `PLAY_Q` → `buffs:DEF`, `PLAY_K…` → `guarda`; com alvo, cada alvo
    → `carta:<id>`;
  - `export function resolvePlayDrop(drops: PlayDrop[] | undefined): { kind: 'send'; action: PlayerAction } | { kind: 'choose' } | null`
    — uma jogada: manda (`play.make(targetId)`); mais de uma: abre a escolha; nenhuma: `null`;
  - `export function equipDropZones(view: PlayerView, legal: PlayerAction[], chosen: Destination[]): Map<DropKey, Destination>`
    — de `nextDestinations`: `ATK` → `fileira:ATK`, `DEF` → `fileira:DEF`, `REPLACE_LAST_ATK` → `ultima:ATK`,
    `REPLACE_LAST_DEF` → `ultima:DEF`, `DISCARD` → `cemiterio`.

- [ ] **Step 1: Testes** (com `view` reais dos fixtures da web e `tablePlays`/`nextDestinations` de verdade): J vai a
  `buffs:ATK`; Q a `buffs:DEF`; K a `guarda` (com dois K na mão, duas jogadas na mesma zona → escolha); A a cada alvo; o
  Selvagem a `buffs:ATK`, `buffs:DEF` e aos alvos; o Selvagem sobre um J do oponente que é alvo de Armadilha e de Sacrifício →
  escolha; carta sem jogada → mapa vazio; Equipar com vaga (ATK e DEF), com as duas fileiras cheias (`ultima:*` e `cemiterio`).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): as zonas de soltura do arrasto, das jogadas da mesa e do Equipar`.

### Task 2: o gesto de arrastar e o fantasma

**Files:**
- Create: `packages/web/src/ui/table/useCardDrag.ts`, `packages/web/src/ui/table/DragGhost.tsx`
- Modify: `packages/web/src/styles.css` (o contorno parado das zonas válidas: `[data-soltar][data-soltar-ativo]`, e a zona sob o
  dedo, um pouco mais forte)
- Test: `packages/web/test/ui/card-drag.test.tsx`

**Interfaces:**
- Produces: `export function useCardDrag(options: { enabled: boolean; zones: () => ReadonlySet<DropKey>; onDrop: (key: DropKey | null) => void; onTap: () => void }): { bind: (el: HTMLElement | null) => void; dragging: boolean; ghost: GhostState | null; overKey: DropKey | null }`
  (ou forma equivalente que a Tarefa 3 consiga ligar à mão e à carta da vez do Equipar); `DragGhost` desenha a cópia da carta
  numa camada `position: fixed`, `pointer-events: none`, fora do contêiner dos campos.

Regras: `pointerdown` guarda o ponto; só depois de ~8 px de movimento vira arrasto (antes disso o `pointerup` é o toque de hoje,
`onTap`); no arrasto, `setPointerCapture`, o fantasma segue o ponteiro, a zona sob ele sai de `elementFromPoint` +
`closest('[data-soltar]')` e só conta se estiver em `zones()`; as zonas válidas ganham `data-soltar-ativo` enquanto a carta está
no ar; a soltura chama `onDrop(key | null)` e o clique que o navegador dispara depois de um arrasto é engolido; `pointercancel`
e `Escape` cancelam sem soltar; com `enabled` falso, nada começa. As cartas arrastáveis têm `touch-action: none`.

- [ ] **Step 1: Testes** (jsdom com eventos de ponteiro e `elementFromPoint` simulado): menos de 8 px é toque (chama `onTap`, não
  arrasta); mais de 8 px arrasta e mostra o fantasma; soltar sobre uma zona válida chama `onDrop` com a chave; sobre zona fora de
  `zones()` ou fora de qualquer zona, `onDrop(null)`; o clique depois do arrasto não vira toque; `pointercancel` e `Escape`
  cancelam; `enabled` falso não arrasta; as zonas válidas recebem e perdem `data-soltar-ativo`; o contorno não anima (CSS).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check`; commit `feat(web): o gesto de arrastar carta, com limiar e fantasma`.

### Task 3: arrastar na mesa (mão e Equipar)

**Files:**
- Modify: `packages/web/src/ui/table/PlayTable.tsx`, `Hand.tsx`, `PlayerField.tsx`, `Row.tsx`, `TableCard.tsx` (ou onde
  ficarem as cartas-alvo), `EquipPanel.tsx`, o lugar do cemitério na mesa (`data-soltar` nas zonas)
- Test: `packages/web/test/ui/table-drag.test.tsx`

**Interfaces:**
- Consumes: `playDropZones`, `resolvePlayDrop`, `equipDropZones` (Tarefa 1); `useCardDrag`, `DragGhost` (Tarefa 2).

Regras: cada carta da mão com jogada e a carta da vez do Equipar são arrastáveis quando a mesa não está travada (o mesmo `locked`
que apaga os botões). Na fase principal, a soltura com uma jogada manda pelo `send` da mesa (com o `isLegal` de sempre); com mais
de uma, faz o que o toque na carta faz (seleciona a carta e a barra mostra as jogadas); fora de zona, nada. No Equipar, a soltura
num destino escolhe esse destino no rascunho, como o botão. As zonas ganham `data-soltar` com as chaves da Tarefa 1: os buffs e a
Guarda do seu campo, as cartas do oponente que podem ser alvo, as suas fileiras, a última carta de cada uma e o cemitério.

- [ ] **Step 1: Testes** (mesa de verdade com a `Session` dos testes): arrastar um K até a Guarda manda `PLAY_K`; um J até os
  Buffs de ataque manda `PLAY_J`; um A até o J do oponente manda `TRAP` com o alvo; o Selvagem até os Buffs de ataque manda
  `PLAY_J` como J (uma jogada só nessa zona); com dois K na mão, soltar na Guarda abre a escolha (1 ou 2 K); o Selvagem até um alvo
  de Armadilha e de Sacrifício abre a escolha na barra; soltar fora não manda nada; travado (batidas em curso, jogada em voo) não arrasta; a jogada que deixou de valer
  (`state` novo no meio) não é mandada; no Equipar, arrastar a carta da vez até a Defesa escolhe `DEF` e a próxima carta vira a
  da vez; com as fileiras cheias, até a última carta troca e até o cemitério descarta; os botões e o teclado seguem iguais (um
  teste de toque e um de teclado por fase); axe sem violações sérias.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS.
- [ ] **Step 5:** `pnpm check` (JS inicial ≤ 200 KB); commit `feat(web): arrastar cartas na mesa, da mão e do Equipar`.

### Task 4: E2E e documentos

**Files:**
- Create: `packages/web/e2e/drag.spec.ts` (e listá-lo nos projetos certos do `playwright.config.ts`: PC e celular)
- Modify: `docs/superpowers/specs/2026-10-17-interface-web-design.md` (spec 3: o arrasto como caminho a mais),
  `docs/superpowers/specs/2026-10-22-polimento-recursos-design.md` (§6: o que ficou decidido, o fantasma sem voo),
  `CLAUDE.md` (uma linha na "Interface web", se couber)

- [ ] **Step 1:** E2E no treino com `?semente=tutorial-132&nivel=facil` (o jogador recebe K no 1º Equipar): arrastar uma numérica
  do Equipar até a Defesa; na fase principal, arrastar o K até a Guarda; no PC e no celular (o arrasto com o mouse do Playwright no
  tamanho de celular); no celular, a página não rola com o arrasto; axe.
- [ ] **Step 2:** `pnpm e2e` verde; atualizar os documentos.
- [ ] **Step 3:** `pnpm check`; commit `test(web): E2E do arrasto e as specs`.

---

## Depois da última tarefa

Revisão de código da fatia inteira, `check` e `e2e` verdes na CI da branch, fast-forward na `main`, CI da `main` verde e o
resumo final à sessão principal (o polimento inteiro e o que fica só para o autor).
