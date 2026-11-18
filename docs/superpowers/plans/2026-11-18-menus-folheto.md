# Os menus no Folheto — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As telas fora da mesa com a identidade A4 · Folheto: o Início em lista de mini cartas, as entradas Jogar online / Treinar / Opções
em rotas próprias, os carimbos da mesa e o tema rosa (padrão) ou verde.

**Architecture:** Peças novas de menu em `src/ui/menu/` (tela, título, painel, carimbo, campo, chave, mini carta, emblema, controle do tema)
com o CSS em `src/ui/menu/menu.css`; o tema mora em `Prefs.menuTheme` e chega às telas por um contexto do `App`. As peças de `parts.tsx`
ficam para a partida. Rotas novas no roteador de `history` que já existe.

**Tech Stack:** React 19, Vite, Tailwind 4 (só nos componentes que já o usam), Vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-menus-folheto-design.md`. Rascunhos: `docs/superpowers/specs/2026-11-18-menus-direcoes/project/a4.css`
e `A4-*.dc.html` (o CSS do menu porta deles).

## Global Constraints

- Nada de regra, rede, protocolo ou estado de partida muda; a mesa e os diálogos da partida não mudam (spec §1).
- JavaScript inicial ≤ 200 KB gzip (`pnpm --filter @coringa/web smoke`).
- Os tokens de `styles.css` não mudam de valor; o CSS do menu fica em `src/ui/menu/menu.css`, nunca em `styles.css` (o `phases.test.tsx` conta
  as animações sem fim de lá).
- Imports relativos com `.ts`/`.tsx`; textos em pt-BR no `model/copy.ts`; identificadores em inglês.
- Movimento reduzido (sistema ou `prefs.reduceMotion`): nenhuma animação nem inclinação no menu.
- Alvos ≥ 44 px; campos de 16 px; um `<h1>` por tela; o foco no título ao trocar de rota (`focusOnMount`).
- `pnpm check` antes de cada commit de código (o pre-commit roda a versão rápida); nunca `--no-verify`.

## Review Focus

- **O tema depois de mexer numa chave dentro da partida:** a pessoa troca para verde, joga, liga o "Reduzir animações" no menu da partida e volta:
  o fundo segue verde (Task 1).
- **Valor estranho guardado** (`menuTheme: "azul"`, ou `coringa:prefs` corrompido): o menu abre rosa, sem erro (Task 1).
- **360 px de largura:** "Partidas anteriores" quebra em duas linhas sem empurrar a seta para fora (Task 3, conferência no navegador).
- **Link aberto direto** (`/jogar`, `/opcoes` colados na barra): a tela abre sem a abertura, com o foco no título e o "Início" funcionando (Tasks 2 e 4).
- **Movimento reduzido ligado no menu do jogo** (não no sistema): as cartas do Início param de respirar e não inclinam (Task 3).

---

### Task 1: A preferência do tema e o contexto

**Files:**
- Modify: `src/model/storage.ts` (o `Prefs` e o `loadPrefs`)
- Create: `src/ui/menu/menu-theme.ts`
- Modify: `src/app/App.tsx` (o provedor)
- Test: `test/model/storage.test.ts` (ou o arquivo que já testa `loadPrefs`), `test/ui/menu-theme.test.tsx`

**Interfaces:**
- Produces: `type MenuTheme = 'pink' | 'green'`; `Prefs.menuTheme?: MenuTheme`; `menuThemeOf(prefs: Prefs): MenuTheme` (ausente → `'pink'`);
  `MenuThemeContext` e `useMenuTheme(): { theme: MenuTheme; setTheme(next: MenuTheme): void }` (fora do provedor: rosa e `setTheme` que não faz
  nada). O `App` lê `loadPrefs(store)`, e o `setTheme` grava `{ ...loadPrefs(store), menuTheme: next }`.

- [ ] **Step 1: Testes vermelhos.** `loadPrefs` sem `menuTheme` → a chave ausente; com `'green'` → `'green'`; com `'azul'` ou número → ausente;
  `menuThemeOf({...DEFAULT_PREFS})` → `'pink'`. No `menu-theme.test.tsx`: um componente que lê `useMenuTheme()` mostra `pink` sem provedor; dentro
  do `App` (rota `/`), trocar para verde grava `menuTheme: 'green'` no `coringa:prefs`; depois, gravar `{ ...loadPrefs(store), reduceMotion: true }`
  (o que o `PlayTable.changePrefs` faz) mantém `menuTheme: 'green'`.
- [ ] **Step 2:** `pnpm --filter @coringa/web exec vitest run <os dois arquivos>` → falha (sem o campo, sem o módulo).
- [ ] **Step 3:** Implementar o campo opcional (como o `look`), `menuThemeOf`, o contexto e o provedor no `App` (estado inicial de `loadPrefs`).
- [ ] **Step 4:** Os mesmos testes → passam.
- [ ] **Step 5:** Commit `feat(web): o tema do menu (rosa ou verde) nas preferências`.

### Task 2: As rotas novas

**Files:** Modify `src/app/router.ts`, `src/app/App.tsx`; Test `test/ui/router.test.tsx`.

**Interfaces:**
- Produces: `Route` com `{ name: 'play' }` (`/jogar`), `{ name: 'practice' }` (`/treinar`), `{ name: 'options' }` (`/opcoes`). O `App` as liga a
  `PlayOnline`, `Practice` e `Options` (Task 4); até lá, um esboço que mostra o título.

- [ ] **Step 1:** Testes vermelhos: `parseRoute('/jogar')` → `{ name: 'play' }`; `'/treinar/'` → `practice`; `'/opcoes'` → `options`;
  `'/jogar/x'` → `notFound`.
- [ ] **Step 2:** Rodar → falha. **Step 3:** Implementar. **Step 4:** Rodar → passa. **Step 5:** Commit `feat(web): as rotas do menu`.

### Task 3: As peças do menu e o Início

**Files:**
- Create: `src/ui/menu/menu.css` (porta do `a4.css`: fundos `[data-tema='pink'|'green']` com a moldura e o trilho; o emblema; a lista; a mini
  carta; os carimbos; os painéis; os títulos; as opções; a chave; as animações, desligadas sob `[data-movimento-reduzido]` e no
  `prefers-reduced-motion`), `src/ui/menu/MenuScreen.tsx`, `src/ui/menu/MiniCard.tsx`, `src/ui/menu/Emblem.tsx`, `src/ui/menu/ThemeToggle.tsx`,
  `src/ui/menu/parts.tsx`
- Modify: `src/ui/cards/Coringa.tsx` (exporta os traçados), `src/ui/screens/Home.tsx` (vira o menu), `src/model/copy.ts`
- Test: `test/ui/home.test.tsx` (reescrito), `test/ui/menu-parts.test.tsx`

**Interfaces:**
- Consumes: `useMenuTheme` (Task 1); `navigate` (`router.ts`); `useReducedMotion(menuPref)` (`ui/anim/useReducedMotion.ts`).
- Produces:
  - `MenuScreen({ children, align?: 'center' | 'top' })`: a raiz `.menu` com `data-tema`, `data-movimento-reduzido` (quando `prefs.reduceMotion`),
    as camadas do fundo (`aria-hidden`), o `<svg>` com o filtro `#menu-textura` e a coluna (`max-width` ~480 px; o Início, ~520).
  - `MenuTitle({ children, sub?, card?: MiniCardKind, focusOnMount? })` — `<h1>` com a textura.
  - `MenuPanel({ title, icon?: ReactNode, children })` — `<section aria-label={title}>` com o `<h2>`.
  - `StampButton(props & { tone?: 'paper' | 'gold'; size?: 'small' | 'big' })`, `StampLink({ to, tone?, size?, children, className? })` (o clique
    simples navega, como o `AppLink`), `BackHome()` (o `StampLink` pequeno "Início" para `/`).
  - `MenuField` (a mesma API do `TextField`), `MenuSwitch` (a mesma API do `Switch`).
  - `type MiniCardKind = 'online' | 'practice' | 'pastGames' | 'options'`; `MiniCard({ kind, seal? })` (decorativa).
  - `MenuItem({ to, kind, name, sub, seal?, index })` — o link da lista; ponteiro: `pointermove` (mouse) escreve
    `perspective(600px) rotateX(${-y*26}deg) rotateY(${x*26}deg)` e o `drop-shadow` no `[data-inclina]` da carta (x, y em −0,5…0,5 da linha);
    `pointerdown` (toque): `translateY(-8px) … rotateY(${x*12}deg)`; `pointerleave`/fim do toque limpam; nada disso com movimento reduzido.
  - `Emblem()` — o `<svg>` decorativo: o disco e o `Coringa` em escala 3,4, com o contorno de papel no chapéu e na gola (`Coringa.tsx` exporta
    `CORINGA_HAT`, `CORINGA_STRIPES`, `CORINGA_COLLAR`, `CORINGA_FACE_LINES`).
  - `ThemeToggle()` — `<button aria-pressed>` com o nome "Fundo verde"/"Fundo rosa" (a outra cor), 44 px de alvo.
  - Copy nova: `PLAY_ONLINE_LABEL` 'Jogar online', `PLAY_ONLINE_LINE` 'Criar sala ou entrar numa sala', `PRACTICE_LABEL` 'Treinar',
    `PRACTICE_LINE` 'Jogar com o bot ou aprender jogando', `PAST_GAMES_LINE` 'Reveja as partidas jogadas', `OPTIONS_LABEL` 'Opções',
    `OPTIONS_LINE` 'Aparência e preferências', `MENU_NAV_LABEL` 'Menu', `HOME_LABEL` 'Início', `THEME_GREEN_LABEL` 'Fundo verde',
    `THEME_PINK_LABEL` 'Fundo rosa'.

- [ ] **Step 1: Testes vermelhos (`home.test.tsx`):** o `<h1>` "Jogo do Coringa"; o `nav` "Menu" com quatro links, na ordem, com `href`
  `/jogar`, `/treinar`, `/partidas`, `/opcoes`; o clique simples em "Jogar online" navega sem recarregar; com `coringa:tutorial` ausente, o
  selo (`[data-selo-tutorial]`) dentro do link "Treinar"; com `done`, sem selo; o botão "Fundo verde" (`aria-pressed=false`) troca a raiz para
  `data-tema="green"`, grava `menuTheme: 'green'` e passa a se chamar "Fundo rosa". **(`menu-parts.test.tsx`):** `pointermove` de mouse sobre
  um `MenuItem` escreve um `transform` com `perspective(600px)` no `[data-inclina]`; `pointerleave` o limpa; com `reduceMotion` nas
  preferências, nada é escrito e a raiz tem `data-movimento-reduzido`; `MenuField` liga rótulo, dica e erro (`aria-describedby`) e o campo
  tem a classe que dá 16 px.
- [ ] **Step 2:** Rodar → falha.
- [ ] **Step 3:** Implementar as peças, o CSS e o Início (sem os formulários, que vão para a Task 4).
- [ ] **Step 4:** Rodar → passa; `pnpm --filter @coringa/web smoke` → JavaScript inicial ≤ 200 KB.
- [ ] **Step 5:** Commit `feat(web): o Início do Folheto, em lista de mini cartas, e as peças do menu`.

### Task 4: Jogar online, Treinar e Opções

**Files:** Create `src/ui/screens/PlayOnline.tsx`, `src/ui/screens/Practice.tsx`, `src/ui/screens/Options.tsx`; Modify `src/ui/HpChoice.tsx`,
`src/ui/LookChoice.tsx` (`skin?: 'menu'`), `src/app/App.tsx`; Test `test/ui/play-online.test.tsx` (os casos de criar e entrar que eram do
`home.test.tsx`, movidos sem mudar as asserções de comportamento), `test/ui/practice.test.tsx`, `test/ui/options.test.tsx`.

**Interfaces:**
- Consumes: as peças da Task 3; `sentLook`, `normalizeNickname`, `parseTarget`, `saveSeat` (como o `Home.tsx` de antes).
- Produces: `PlayOnline({ api, store })`, `Practice({ store })`, `Options({ store })`; `HpChoice`/`LookChoice` com `skin` (o padrão é o de hoje).

- [ ] **Step 1: Testes vermelhos:** os de criar sala, apelido inválido, 429, offline e entrar por código/link (movidos); Treinar: links "Jogar com o
  bot" (`/treino`) e "Aprender jogando" (`/tutorial`), o de aprender com o selo e a face de ouro (`data-tom="gold"`) só com o tutorial por fazer;
  Opções: o deck escolhido grava `look`; as chaves Som, Reduzir animações e Passar sozinho gravam `sound`, `reduceMotion`, `autoPass` sem perder
  `menuTheme`; o Som chama `sound.setEnabled`; cada tela tem o "Início" e o foco no título.
- [ ] **Step 2:** Rodar → falha. **Step 3:** Implementar (as telas, a pele, as rotas no `App`). **Step 4:** Rodar; `pnpm check` → verde.
- [ ] **Step 5:** Commit `feat(web): as telas Jogar online, Treinar e Opções`; o `estado.md` e o diário com o passo seguinte, commit `docs(memoria)`.

### Task 5: As outras telas fora da mesa

**Files:** Modify `src/ui/screens/Training.tsx` (a escolha do nível), `Lobby.tsx`, `RoomGate.tsx`, `PastGames.tsx`, `Stopped.tsx`, `NotFound.tsx`,
`ReplayScreen.tsx` (só os estados sem mesa), `local-game.tsx` (carregando e falha), `src/app/lazy-screen.tsx`, `src/app/App.tsx` (`ScreenLoading`).

**Interfaces:** Consumes as peças da Task 3. Nenhuma API nova; `parts.tsx` segue para a partida.

- [ ] **Step 1:** Rodar os testes dessas telas (`training`, `lobby`, `room-gate`, `past-games`, `app`, `replay-screen`, `app-chunk*`) como estão →
  verdes (a linha de base).
- [ ] **Step 2:** Trocar `Screen/Title/Panel/Button/TextField` pelas peças do menu, tela a tela; os botões principais (Estou pronto, Entrar,
  os níveis) em carimbo de ouro, os outros de papel; os textos e a ordem iguais.
- [ ] **Step 3:** Rodar os mesmos testes → verdes; ajustar só asserções de classe que saíram (a garantia segue).
- [ ] **Step 4:** `pnpm check` → verde. **Step 5:** Commit `feat(web): as telas de sala, partidas e treino com o Folheto`; memória.

### Task 6: E2E, conferência e PR

**Files:** Modify `e2e/online.spec.ts`, `e2e/looks.spec.ts`, `e2e/mobile.spec.ts`, `e2e/tutorial.spec.ts`, `e2e/replay.spec.ts`,
`e2e/abertura.spec.ts`.

- [ ] **Step 1:** Os que criam sala abrem `/jogar`; um teste passa pelo menu (Início → "Jogar online" → criar); o `tutorial.spec` troca "Aprender
  jogando antes de Criar sala" pelo selo do Treinar e o caminho Início → Treinar → Aprender jogando; o `abertura.spec` clica no **link**
  "Partidas anteriores".
- [ ] **Step 2:** `pnpm --filter @coringa/web build` e conferência no navegador (`preview_start web`): rosa e verde, 360 e 1440 px; trocar o tema,
  entrar no treino, mudar uma chave no menu da partida, voltar: o tema fica. Fotos para o autor.
- [ ] **Step 3:** `pnpm e2e` (em segundo plano, com o `estado.md` commitado antes) → verde.
- [ ] **Step 4:** Commit, push (o pre-push roda o `pnpm check`), PR para a `main`; as duas CI verdes. O merge espera o "sim" do autor.
