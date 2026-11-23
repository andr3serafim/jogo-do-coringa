# Ajustes da produção — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o deck Cordel Escuro (com o bot no oposto), os destinos do Equipar em carimbos fixos, o favicon e o diagnóstico da mão apagada.

**Architecture:** o Cordel Escuro é um id a mais no `DECK_IDS` do protocolo; a carta troca as variáveis de cor só dentro dela
(`data-tom="escuro"`). Os destinos do Equipar viram um componente de carimbo de tamanho fixo, com o nome inteiro no `aria-label`. O
favicon é um SVG estático em `public/`, mais um PNG de 180 px.

**Tech Stack:** TypeScript (Node 24, type stripping), React 19, Tailwind v4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-ajustes-producao-design.md`

## Global Constraints

- Imports relativos com `.ts`; só sintaxe apagável; `import type` para tipo (CLAUDE.md, "Node puro").
- Sem regra na interface; nenhuma partida de referência muda (sem `RULES_VERSION`, sem `STATE_SCHEMA`).
- Textos em pt-BR, identificadores em inglês; números de jogo na fonte de texto com `tabular-nums`.
- JavaScript inicial ≤ 200 KB gzip (o smoke); nada de `.webp` no `index.html`.
- `pnpm check` verde antes de cada commit de código (o pre-commit é a versão rápida; o pre-push, o completo).

## Review Focus

- Replay e partida guardada com `cordel-escuro` abrem no escuro; a lista antiga (sem `looks`) segue clara.
- O servidor de antes do deploy recebe `cordel-escuro` e o vira `cordel` sem erro (`normalizeLook` com id desconhecido) — já coberto.
- O Selvagem no deck escuro continua dourado e legível (sem a troca de cores).
- O Equipar com 5 cartas por pôr no PC (1440) e no celular (390): carimbos do mesmo tamanho que com 1 carta.
- O teclado e o leitor de tela no Equipar: o foco no primeiro carimbo, o nome inteiro ("Trocar a última carta do Ataque, sai 9♠").

---

### Task 1: O id `cordel-escuro` no protocolo e no modelo da web

**Files:** `packages/protocol/src/looks.ts`, `packages/protocol/test/looks.test.ts`, `packages/web/src/model/looks.ts`,
`packages/web/test/model/looks.test.ts`, `packages/web/src/looks/catalog.ts`.

**Interfaces — Produces:** `DECK_IDS = ['cordel', 'cordel-escuro', 'bestiario', 'celestial']`; `isCordelDeck(deck: DeckId): boolean` (protocolo,
exportado); `PackId = Exclude<DeckId, 'cordel' | 'cordel-escuro'> | Exclude<RaceId, 'bufao'>`; `DECK_LABEL['cordel-escuro'] = 'Cordel Escuro'`.

- [ ] Testes: `DECK_IDS` igual à lista acima; `normalizeLook({ deck: 'cordel-escuro', race: 'egipcio' })` → `{ deck: 'cordel-escuro', race: 'bufao' }`;
  `botLook(DEFAULT_LOOK)` → `{ deck: 'cordel-escuro', race: 'bufao' }`; `botLook({ deck: 'cordel-escuro', race: 'bufao' })` → `{ deck: 'cordel', race: 'bufao' }`;
  `packsOf({ deck: 'cordel-escuro', race: 'bufao' })` → `[]`; `artOf(num(7), { deck: 'cordel-escuro', race: 'bufao' })` → `null`.
- [ ] Rodar e ver falhar; implementar (a trava do `normalizeLook` e os ramos `deck === 'cordel'` passam a usar `isCordelDeck`); rodar e ver passar.
- [ ] Ajustar os testes que listam os decks (`look-choice.test.tsx`, servidor) e o `LookChoice` (trava o Coringa nos dois Cordel).

### Task 2: A carta e o verso no escuro

**Files:** `packages/web/src/ui/cards/looks-context.ts` (novo `useCardTone(card: Card): 'escuro' | undefined`), `Card.tsx`, `catalog.ts`
(`BACK_CLASS['cordel-escuro']`), `Moment.tsx` (`data-verso-deck`), `styles.css`, `packages/web/test/ui/card-art.test.tsx`.

- [ ] Testes: num `LookZone`/provedor com `cordel-escuro`, a numérica e o K (Bufão) têm `data-tom="escuro"`; o Selvagem não tem; com `cordel`, nenhuma tem.
- [ ] Implementar: `useCardTone` → `'escuro'` quando `look.deck === 'cordel-escuro'` e a carta não é `WILD` e não há arte. No CSS,
  `[data-tom='escuro'] { --color-papel: <tinta>; --color-tinta: <papel>; --color-vermelho: <vermelho claro ≥ 4,5:1 sobre #17120f> }`
  (o valor da tinta e do papel copiados do `@theme`, não `var()` de si mesmos). Verso: listras invertidas e borda papel.
- [ ] Testes verdes; foto do treino (Cordel × Cordel Escuro) a 1440 e 390.

### Task 3: Os destinos do Equipar em carimbos

**Files:** `packages/web/src/ui/table/EquipPanel.tsx`, `controls.tsx` (novo `DestinationStamp`), `icons.tsx` (troca, descarte),
`styles.css` (`.carimbo-destino`), `model/copy.ts` (`DESTINATION_SHORT`), `test/ui/phases.test.tsx`.

**Interfaces — Produces:** `DESTINATION_SHORT: Record<Destination, string>` = `{ ATK: 'Ataque', DEF: 'Defesa', REPLACE_LAST_ATK: 'Trocar',
REPLACE_LAST_DEF: 'Trocar', DISCARD: 'Descartar' }`.

- [ ] Teste: cada destino é um botão com o nome acessível de hoje (os testes atuais seguem) e `data-destino=<Destination>`; a troca mostra
  a carta que sai no texto visível; o carimbo tem a classe de tamanho fixo.
- [ ] Implementar: o carimbo 56 × 56 (64 × 64 no `pc:`), `flex-none`; a figura (24 px) e a palavra curta (10–11 px); `aria-label` e `title`
  com `destinationLabel`. Layout: cartas `min-w-0 flex-1 flex-wrap`; destinos `flex flex-none flex-wrap gap-2` embaixo no celular, ao lado
  no `pc:`. Some o `besideCards`.
- [ ] Testes verdes; fotos do Equipar com 1 e 5 cartas a 1440 e 390.

### Task 4: O favicon

**Files:** `packages/web/public/favicon.svg`, `packages/web/public/apple-touch-icon.png`, `packages/web/index.html`, `packages/web/scripts/smoke.ts`.

- [ ] Smoke: o `index.html` do `dist` tem `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` e o `apple-touch-icon`, e os dois
  arquivos existem no `dist`.
- [ ] O SVG: os traçados de `Coringa.tsx` (chapéu, guizos, rosto, gola) num quadrado de tinta arredondado, o chapéu em ouro para ler em 16 px.
  O PNG 180 × 180 tirado do SVG pelo Chromium do Playwright (um comando, não script no repositório).

### Task 5: A mão apagada (diagnóstico)

- [ ] Reproduzir no treino (`/treino?semente=…&nivel=medio`) e numa sala local (duas abas): a vez do oponente, a janela de reação, o
  instante depois das batidas, o Equipar. Anotar quando a especial apaga e se o motor tinha jogada para ela.
- [ ] Com a causa achada: um teste que falha antes, o conserto, o teste verde. Sem reprodução: nada no código, e o achado vai ao autor.

### Task 6: Fecho

- [ ] `pnpm check`; `pnpm e2e`; o `estado.md` e o `diario.md`; push da branch; PR para a `main`.
