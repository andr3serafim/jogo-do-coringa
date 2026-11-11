# Decks e raças do Coringa, fatia 1: a carta com arte e o seletor, no treino — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **De onde vem este plano:** escrito numa conversa do app, por uma conta sem shell na pasta (lendo os arquivos por cópia). Nada aqui foi
> rodado: os nomes de arquivo, de função e de teste foram lidos do código em 2026-11-11, na árvore onde está o bloco C. Quem executa confere
> cada um antes de usar, e para e pergunta se a `main` depois do merge do bloco C estiver diferente do que o plano descreve.

**Goal:** no treino, o jogador escolhe um deck (Cordel, Bestiário, Celestial) e a raça do Coringa (Bufão, Egípcia) e joga com as cartas
ilustradas:
- **A carta com arte:** a numérica de um deck fantasy e a especial de uma raça fantasy mostram a ilustração, com o valor e o naipe por
  cima, os dois na mesma cor de metal, e o anel e a aura da faixa de raridade.
- **O seletor:** um painel "Aparência" no Início e, no treino, no menu da partida. A escolha fica em `coringa:prefs`.
- **O Cordel não muda:** com a aparência padrão, a mesa, o DOM da carta e todos os testes de hoje ficam como estão.

Nesta fatia a aparência é **a minha, dos dois lados da mesa, só no treino e no replay**. O dono por lado é da fatia 2; o online, da 3.

**Architecture:**
- **O modelo é do protocolo.** `Look`, os ids e `normalizeLook` nascem em `@coringa/protocol` (sem Zod), porque a fatia 3 os usa no
  servidor. A web guarda a aparência em `Prefs.look`, opcional: sem o campo vale o padrão, e nenhum teste das preferências muda.
- **O catálogo é da web, em duas metades.** O que é pequeno (nomes, cores de metal, a faixa) é síncrono. As URLs das imagens de cada deck
  e de cada raça ficam num módulo por pacote, pedido por `import()` quando uma aparência o cita, junto com a fonte Cinzel. Nada disso
  entra no JavaScript nem no CSS inicial.
- **A carta não sabe de aparência.** Um contexto (`LooksProvider`, `useCardArt`) diz se a carta daquele lugar tem arte e qual. Sem
  provedor, ou com o pacote ainda por chegar, ou com o `import()` falhado, a carta é a de cordel. Nesta fatia há um provedor só, no alto
  da mesa; o `LookZone` por lado chega na fatia 2 sem mexer na carta.
- **A face nova mora num arquivo novo** (`ui/cards/ArtFace.tsx`): o `Card.tsx` ganha a escolha da face e as três classes que dependem
  dela (o fundo, o véu da quadra), e a `Face` de cordel não é tocada.

**Tech Stack:** React 19, Tailwind 4 (as classes de sempre, mais `--font-cinzel` no `@theme`), Vite (`import.meta.glob` com `?url`), Vitest
(`model` no Node, `ui` no jsdom), Playwright, `@fontsource/cinzel` (dependência nova, autorizada).

**Spec:** `docs/superpowers/specs/2026-11-10-decks-e-racas-design.md` §2 (o modelo), §4 (a face), §5 (os arquivos), §6 (o seletor), §7.1 e
§7.2 (treino e tutorial), §9 (as restrições), §10 (os testes) e §11 (a fatia 1). A arte: `docs/superpowers/specs/2026-11-10-decks-e-racas-arte.webp`.
As decisões: `decisoes.md` 2026-11-10 (2) e 2026-11-11 (1) e (2).

## Escolhas do plano (aprovadas)

**O autor aprovou as sete como recomendadas** (`decisoes.md` 2026-11-11 (3)). A execução é no Claude Code local, não na conversa do app.

- **F1. O online fica em Cordel até a fatia 3.**
  - **Como funciona:** nesta fatia a aparência vale no treino e no replay. Numa sala online, a mesa segue em Cordel para os dois, e o menu
    da partida não mostra o seletor.
  - **No Início:** o painel "Aparência" ganha uma linha, "Por enquanto vale no treino.", que sai na fatia 3.
  - **Por quê:** mostrar a minha aparência dos dois lados numa sala contradiz a regra final (cada lado com a do dono).
  - **Recomendo** assim.
- **F2. A sombra do número e do naipe sem filtro.**
  - **O que muda do rascunho:** lá o número tinha uma sombra desfocada e o naipe um `drop-shadow`. Aqui o número leva um contorno escuro
    de 1 px nas quatro direções mais um halo curto (`text-shadow`, que não é filtro), e o naipe leva um traço escuro no próprio SVG
    (`stroke` com `paint-order: stroke`).
  - **Por quê:** a regra de desempenho do projeto evita `drop-shadow` e `filter` em coisa que se move, e a carta voa.
  - **O olho vê** quase o mesmo; as fotos da Task 6 mostram.
  - **Recomendo** assim.
- **F3. Se o pacote da arte não carregar** (sem rede, chunk antigo depois de um deploy), a mesa cai no Cordel, sem tela de erro e sem
  aviso. A partida não pode depender de enfeite. **Recomendo** assim.
- **F4. O replay usa a aparência de agora, dos dois lados,** nesta fatia. A fatia 2 a troca pela gravada com a partida. Sem isso não há
  como medir a mesa cheia com arte, porque a medição toca um replay. **Recomendo** assim.
- **F5. O portão da medição.**
  - **O que se mede:** a fixture `exodia-devastacao` (a mesa mais cheia que o projeto já mede), com `{ bestiario, egipcio }` e com o Cordel,
    na mesma máquina e na mesma hora.
  - **Passa se** a mesa com arte fica em ≥ 50 quadros/s com a CPU 4×, **ou**, se o próprio Cordel ficar abaixo de 50 naquela medida, se
    ela perde no máximo 2 quadros/s para ele.
  - **Se não passar,** na ordem: o halo do número sai e fica só o contorno; a aura vira uma camada desenhada; entra uma segunda largura
    de imagem (208 px) com `srcset`. A troca é de quem executa, registrada no diário e na nota da medição.
  - **Recomendo** assim.
- **F6. `Prefs.look` é opcional.** Sem o campo, vale `DEFAULT_LOOK`. O `DEFAULT_PREFS` não muda, e os testes das preferências de hoje
  ficam intocados. **Recomendo** assim.
- **F7. A execução.**
  - **Recomendo:** no Claude Code local, com o Opus 5.5, tarefa por tarefa, teste primeiro, na branch `feat/decks-fatia-1`, saída da
    `main` **depois do merge do bloco C**; no fim, um revisor novo, num subagente, lendo a branch inteira, como nos blocos do playtest.
  - **O primeiro commit** leva o que está sem commit desde 2026-11-10: a spec e a folha da arte, este plano, as entradas do
    `decisoes.md`, e a arte (`packages/web/art/` e `packages/web/src/looks/`).
  - **Alternativa:** um subagente por tarefa, com revisor a cada uma.

## Global Constraints

- **O Cordel não muda:** nenhum teste existente é editado para passar. Se um teste de hoje falhar, a causa é corrigida no código novo.
  A `Card` sem provedor rende o mesmo DOM de hoje.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip. Os módulos de URLs de cada pacote, as imagens e a fonte Cinzel não podem ser
  alcançados por um `import` estático a partir do `main.tsx` (só pelo `loadPack`). O `ArtFace` e o `catalog.ts` (nomes e cores) são
  pequenos e podem ficar no inicial. O smoke confere (Task 6).
- **Ritmo:** F5. Nada novo anima `box-shadow`, `filter` nem `blur`; a aura e o anel são parados.
- **Fotossensibilidade:** nada novo pisca nem inverte.
- **Telas:** 360 × 640 no celular e 1366 × 657 no PC baixo, sem rolar de lado. O painel "Aparência" cabe nas duas.
- **Sem regra na interface:** a aparência é desenho. Nenhuma jogada, total ou prévia passa por ela.
- **Acesso:** o nome acessível da carta não muda; a imagem é decorativa (`alt=""`). O seletor é um par de grupos de rádio, por teclado e
  toque, com alvo ≥ 44 px, como o `HpChoice`. O axe fica limpo no Início e na mesa.
- **O `box-shadow` da carta** continua sendo só do halo de foco e do `anel-ouro` (comentário no topo do `Card.tsx`): o anel e a aura da
  arte são elementos filhos.
- **CSP:** `style-src 'self'` e `img-src 'self' data:` não mudam. A cor de metal entra por `style` do React (CSSOM), não por atributo
  escrito em HTML; o E2E roda sobre o `wrangler dev` com a CSP de verdade e falha com erro no console.
- **ESLint da web:** import relativo só termina em `.ts`, `.tsx` ou `.css`. As imagens entram por `import.meta.glob`, nunca por
  `import x from './a.webp'`. A config do ESLint não muda.
- **Node puro fora da web:** o arquivo novo do protocolo usa só sintaxe apagável e imports com `.ts`.
- **Partidas de referência:** `RULES_VERSION`, `STATE_SCHEMA` e `PROTOCOL_VERSION` não mudam. `E2E_SEED` fica vazia. O deploy é do autor.
- **Arte original** (`CLAUDE.md`, §10.6): a arte provisória é desenho próprio (`packages/web/art/LEIAME.md`). **Fonte nova** com licença
  que permite embutir, listada no `packages/web/LICENSES.md`.
- **Testes:** em `test/ui`, todo arquivo é `.test.tsx`; em `test/model`, `.test.ts`, com 90% de linhas e de branches em `src/model`.
  O jsdom não tem layout nem carrega imagem: o tamanho e a leitura se conferem nas fotos da Task 6.
- **Memória:** `estado.md` e `diario.md` a cada tarefa, como manda o `CLAUDE.md` (regras 2, 4 e 6). `pnpm check` antes de cada commit
  de código; nunca `--no-verify`.

## Review Focus

1. **O Cordel intocado:** nenhum arquivo de teste existente no diff, fora os que ganham casos novos; a `Card` sem provedor igual a
   hoje → teste da Task 4.
2. **O que entra no pacote inicial:** nem o nome de um `.webp`, nem o arquivo da Cinzel; e quanto o `ArtFace` e o `catalog.ts` pesaram
   nele → smoke da Task 6.
3. **Os estados da carta sobre a arte** (quadra, cemitério, rascunho, selecionada, alvo, travada, o Selvagem com papel): cada um se vê e
   nenhum disputa o `box-shadow` → testes da Task 4 e fotos da Task 6.
4. **A leitura a 360 px:** o valor e o naipe nas cartas de fundo claro (Pégaso, Arcanjo) e nas minis de 30 px → fotos da Task 6.
5. **A falha do pacote, o tutorial e a sala online:** os três em Cordel, sem erro no console → testes da Task 5.
6. **A troca no meio do treino:** mudar o deck no menu troca as cartas na hora, sem remontar a mesa nem tocar batida → teste da Task 5.

---

### Task 0: A branch, o que está sem commit e a fonte

**Files:**
- Create (já gravados, sem commit): `docs/superpowers/specs/2026-11-10-decks-e-racas-design.md`, `…-arte.webp`,
  `docs/superpowers/specs/2026-11-11-biblia-de-arte.md`, este plano,
  `packages/web/art/**` (23 SVG e o `LEIAME.md`), `packages/web/src/looks/**` (24 WebP)
- Modify (já gravados, sem commit): `docs/memoria/decisoes.md`, `docs/memoria/estado.md`
- Modify: `packages/web/package.json`, `pnpm-lock.yaml`, `packages/web/LICENSES.md`

- [ ] **Step 1: Começar pela regra 1 do `CLAUDE.md`** (o `estado.md` mais novo, `git worktree list`, `git status --short`). Confirmar que
  o bloco C está na `main`. Se não estiver, parar: esta fatia sai da `main` com ele.
- [ ] **Step 2: Abrir `feat/decks-fatia-1` a partir da `main`** levando os arquivos sem commit (os novos acompanham a troca de branch; os
  dois da memória também, se a `main` não os mudou; se mudou, `git stash` antes e resolver à mão, mantendo as entradas 2026-11-10 (2),
  2026-11-11 (1) e (2) no alto do `decisoes.md`).
- [ ] **Step 3: Commits de entrada**, nesta ordem: `docs(memoria): as decisões dos decks e raças`; `docs(spec): decks e raças do Coringa`
  (a spec, a folha, a bíblia de arte e este plano); `feat(web): a arte provisória dos decks e da raça egípcia` (os SVG, o `LEIAME.md` e os WebP).
- [ ] **Step 4: A fonte.** `pnpm --filter @coringa/web add @fontsource/cinzel`. Conferir que existe
  `packages/web/node_modules/@fontsource/cinzel/latin-900.css` e que ele aponta para um `woff2` do subconjunto latino. Acrescentar a
  linha da Cinzel (SIL OFL 1.1, o pacote, o peso 900, o uso: "o valor das cartas com arte") no `packages/web/LICENSES.md`, no formato das
  duas que já estão lá.
- [ ] **Step 5: Rodar** `pnpm check`. Expected: PASS (os WebP em `src/looks/` ainda não são importados por ninguém).
- [ ] **Step 6: Commit**: `chore(web): a fonte Cinzel para as cartas com arte`, com o `estado.md`.

---

### Task 1: A aparência no protocolo

**Files:**
- Create: `packages/protocol/src/looks.ts`
- Modify: `packages/protocol/src/index.ts` (`export * from './looks.ts';`)
- Test: `packages/protocol/test/looks.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const DECK_IDS = ['cordel', 'bestiario', 'celestial'] as const;
  export const RACE_IDS = ['bufao', 'egipcio'] as const;
  export type DeckId = (typeof DECK_IDS)[number];
  export type RaceId = (typeof RACE_IDS)[number];
  export interface Look { deck: DeckId; race: RaceId }
  export const DEFAULT_LOOK: Look;            // { deck: 'cordel', race: 'bufao' }, congelado
  export function normalizeLook(input: unknown): Look;   // sempre um objeto novo
  ```
- `normalizeLook`: o que não é objeto → o padrão; `deck` ou `race` fora da lista → o padrão **daquele campo**; depois a trava da spec §2.1
  (`deck === 'cordel'` força `race: 'bufao'`). Campos a mais são ignorados.

- [ ] **Step 1: Escrever os testes que falham:** `undefined`, `null`, um texto, um número e um array → `DEFAULT_LOOK`; cada combinação
  válida passa igual; `{ deck: 'bestiario', race: 'x' }` → `{ deck: 'bestiario', race: 'bufao' }`; `{ deck: 'x', race: 'egipcio' }` →
  `{ deck: 'cordel', race: 'bufao' }` (a trava depois do padrão); `{ deck: 'cordel', race: 'egipcio' }` → a trava; um campo a mais não
  aparece na saída; a saída nunca é o mesmo objeto de `DEFAULT_LOOK` (mudar a saída não muda o padrão).
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/protocol exec vitest run test/looks.test.ts`
Expected: FAIL (o módulo não existe).

- [ ] **Step 3: Implementar** e exportar no `index.ts`.
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/protocol test; pnpm --filter @coringa/protocol smoke; pnpm -r typecheck`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(protocol): a aparência (deck e raça do Coringa) e a sua normalização`.

---

### Task 2: O modelo da web e as preferências

**Files:**
- Create: `packages/web/src/model/looks.ts`
- Modify: `packages/web/src/model/storage.ts` (`Prefs.look?`, `loadPrefs`)
- Test: `packages/web/test/model/looks.test.ts`; casos novos em `packages/web/test/model/storage.test.ts`

**Interfaces:**
- Produces, em `model/looks.ts`:
  ```ts
  export type Tier = 1 | 2 | 3 | 4 | 5;
  /** 2–3 → 1, 4–5 → 2, 6–7 → 3, 8–9 → 4, 10 → 5. */
  export function tierOf(value: number): Tier;
  export type PackId = Exclude<DeckId, 'cordel'> | Exclude<RaceId, 'bufao'>;   // 'bestiario' | 'celestial' | 'egipcio'
  export type ArtKey = '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | 'K' | 'J' | 'Q' | 'A' | 'WILD';
  /** De que pacote e com que chave sai a arte desta carta nesta aparência; `null` = a carta de cordel. */
  export function artOf(card: Card, look: Look): { pack: PackId; key: ArtKey } | null;
  /** Os pacotes que uma aparência pede, sem repetir (nenhum para o padrão). */
  export function packsOf(look: Look): PackId[];
  /** A aura por faixa (spec §4.1): `null` na faixa 1. */
  export const AURA: Record<Tier, { blur: number; spread: number; alpha: number } | null>;
  /** A faixa que a aura e o anel das especiais de raça usam. */
  export const RACE_TIER: Tier;   // 3
  ```
- `artOf`: `NUM` com `look.deck !== 'cordel'` → o deck, com o valor em dois dígitos; `K`, `J`, `Q`, `A` e `WILD` com
  `look.race !== 'bufao'` → a raça; o resto, `null`.
- `AURA`: 1 `null`; 2 `{ blur: 5, spread: 1, alpha: .35 }`; 3 `{ 8, 1, .5 }`; 4 `{ 10, 2, .6 }`; 5 `{ 14, 3, .8 }`.
- `Prefs.look?: Look`. `loadPrefs`: se o valor guardado tem `look`, `prefs.look = normalizeLook(value.look)`; se não tem, o campo fica
  ausente. `DEFAULT_PREFS` não muda (F6). Quem lê usa `prefs.look ?? DEFAULT_LOOK`.

- [ ] **Step 1: Escrever os testes que falham.** `tierOf` de 2 a 10. `artOf`: as cinco espécies de carta nas aparências padrão,
  `{ bestiario, bufao }`, `{ bestiario, egipcio }` e `{ celestial, egipcio }` (a numérica 7 → `{ pack: 'bestiario', key: '07' }`; o 10 →
  `'10'`; o K com `bufao` → `null`; o Selvagem com `egipcio` → `{ pack: 'egipcio', key: 'WILD' }`). `packsOf`: `[]`, `['bestiario']`,
  `['bestiario', 'egipcio']`. `storage`: preferências sem `look` carregam sem o campo e iguais a hoje; com `look` válido, carregam com ele;
  com `look` inválido ou `{ cordel, egipcio }`, normalizado; `savePrefs` seguido de `loadPrefs` devolve a aparência.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run --project model test/model/looks.test.ts test/model/storage.test.ts`
Expected: FAIL nos casos novos; os casos antigos do `storage.test.ts` continuam passando.

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/web exec vitest run --project model; pnpm --filter @coringa/web typecheck`. Expected: PASS,
  com a cobertura de `src/model` nos 90%.
- [ ] **Step 5: Commit**: `feat(web): o modelo da aparência e a preferência guardada`.

---

### Task 3: O catálogo e os pacotes da arte

**Files:**
- Create: `packages/web/src/looks/catalog.ts` (síncrono, pequeno)
- Create: `packages/web/src/looks/bestiario/index.ts`, `…/celestial/index.ts`, `…/egipcio/index.ts`
- Create: `packages/web/src/looks/load.ts` (o `import()` dos pacotes e da fonte)
- Create: `packages/web/src/looks/font.css` (uma linha: o `@import` da Cinzel)
- Modify: `packages/web/src/styles.css` (`--font-cinzel: 'Cinzel', serif;` no `@theme`)
- Test: `packages/web/test/model/looks-catalog.test.ts`

**Interfaces:**
- `catalog.ts`:
  ```ts
  export interface CardMeta { name: string; metal: string }
  export const DECK_LABEL: Record<DeckId, string>;     // 'Cordel', 'Bestiário', 'Celestial'
  export const RACE_LABEL: Record<RaceId, string>;     // 'Bufão', 'Egípcio'
  /** Por pacote e chave: o nome da criatura ou do artefato e a cor de metal (spec §2.3 e §4.4). */
  export const ART_META: Record<PackId, Partial<Record<ArtKey, CardMeta>>>;
  ```
  Os nomes e as cores são os da spec §2.3 e §4.4, copiados ao pé da letra (27 entradas: 9 + 9 + 5, mais nada). `metal` da raça
  Egípcia: `#ffd98a` nas cinco.
- Cada `index.ts` de pacote:
  ```ts
  /** As URLs das imagens deste pacote, por chave. */
  export const urls: Partial<Record<ArtKey, string>>;
  ```
  montado com `import.meta.glob('./*.webp', { eager: true, query: '?url', import: 'default' })` e uma tabela arquivo → chave escrita à
  mão (`'02-morcego' → '02'`, `'k-mascara' → 'K'`, `'coringa-anubis' → 'WILD'`). O `egipcio` exporta também `portrait: string`
  (`retrato-anubis.webp`), que só a fatia 2 usa.
- `load.ts`:
  ```ts
  export type PackUrls = Partial<Record<ArtKey, string>>;
  /** Pede o pacote (uma vez só por pacote: a promessa fica guardada) e, junto, a fonte. Rejeita se o `import()` falhar. */
  export function loadPack(id: PackId): Promise<PackUrls>;
  ```
  O `import('./font.css')` vai dentro do `loadPack`, para a Cinzel sair do CSS inicial. Depois de resolver, aquece as imagens
  (`new Image().src = url` para cada uma), sem esperar por elas.

- [ ] **Step 1: Escrever os testes que falham** (`looks-catalog.test.ts`, no Node, com as transformações do Vite): cada deck fantasy tem
  as nove chaves `'02'`…`'10'` em `ART_META` e em `urls`, e mais nenhuma; a raça `egipcio` tem `K`, `J`, `Q`, `A` e `WILD` nos dois, e o
  `portrait`; toda cor de metal casa com `/^#[0-9a-f]{6}$/`; toda URL termina em `.webp`; nenhum `.webp` de `src/looks/` fica sem chave
  (um arquivo novo sem entrada reprova); `loadPack('bestiario')` chamado duas vezes devolve a mesma promessa.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run --project model test/model/looks-catalog.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: Implementar.** O aquecimento das imagens só roda onde existe `Image` (o teste do projeto `model` roda no Node). Se o
  `import.meta.glob` com `?url` ou o `import()` do CSS não funcionarem no projeto `model`, mover o teste para
  `test/ui/looks-catalog.test.tsx` (o jsdom) e registrar no diário.
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/web test; pnpm --filter @coringa/web typecheck; pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): o catálogo e os pacotes da arte, fora do pacote inicial`.

---

### Task 4: A face com arte

**Files:**
- Create: `packages/web/src/ui/cards/looks-context.ts` (o contexto e os ganchos; sem JSX)
- Create: `packages/web/src/ui/cards/LooksProvider.tsx`
- Create: `packages/web/src/ui/cards/ArtFace.tsx`
- Modify: `packages/web/src/ui/cards/Card.tsx` (a escolha da face, o fundo, o véu da quadra)
- Modify: `packages/web/src/ui/cards/Suit.tsx` só se for preciso expor o traço (F2); a forma dos naipes não muda
- Test: `packages/web/test/ui/card-art.test.tsx`

**Interfaces:**
- `looks-context.ts`:
  ```ts
  export interface CardArt { url: string; metal: string; tier: Tier }
  export interface LooksValue { look: Look; packs: Partial<Record<PackId, PackUrls>> }
  export const LooksContext: React.Context<LooksValue>;   // padrão: { look: DEFAULT_LOOK, packs: {} }
  /** A arte desta carta no lugar onde ela está; `null` = a face de cordel (sem provedor, sem pacote, ou carta de cordel). */
  export function useCardArt(card: Card): CardArt | null;
  ```
  `useCardArt`: `artOf(card, look)`; sem resultado, `null`; com resultado, a URL de `packs[pack]?.[key]` e o metal de `ART_META`; se a
  URL ainda não chegou, `null`. A faixa: `tierOf(card.value)` na numérica, `RACE_TIER` nas outras.
- `LooksProvider.tsx`:
  ```tsx
  export function LooksProvider(props: { look: Look; children: ReactNode; packs?: LooksValue['packs'] }): JSX.Element;
  ```
  Pede `loadPack` para cada `packsOf(look)` e guarda o que chega; **rende os filhos sempre** (a carta cai no cordel enquanto o pacote não
  chega, e para sempre se ele falhar: F3). `packs` de fora é para os testes e para a amostra do seletor: com ele, nada é pedido. Trocar o
  `look` não remonta os filhos.
- `ArtFace.tsx`: `ArtFace({ card, size, as, roleText, art })`, os filhos da carta no lugar dos da `Face`:
  - `<img src={art.url} alt="" decoding="async" draggable={false} className="absolute inset-0 size-full object-cover">`;
  - o valor (`data-valor`, `font-cinzel font-black leading-none`, a cor por `style={{ color: art.metal }}`) e o naipe (`Suit`, a mesma
    cor), com a sombra da F2;
  - `data-anel-arte`: um filho `absolute inset-0` com um fio de 1,5 px na cor de metal por dentro;
  - `data-aura`: um filho por fora (`absolute -inset-px`, `pointer-events-none`), com a sombra de `AURA[art.tier]`; ausente na faixa 1;
  - o Selvagem: sem valor nem naipe; com `as`, a letra embaixo à direita, no metal;
  - `roleText` (só na mão): o texto no metal sobre uma faixa `bg-tinta/70` embaixo, com o mesmo espaço `{' '}` antes que a `Face` usa
    (o nome acessível depende dele, veja `cardLabel`).

  | Tamanho | Valor | Naipe |
  |---|---|---|
  | `field` | `left-[6%] top-[1%] text-[length:40cqw]` | `right-[5%] bottom-[5%] size-[34cqw]` |
  | `mini` | `left-[8%] top-0 text-[length:calc(var(--mini-w)*0.4)]` | `right-[6%] bottom-[6%] size-[calc(var(--mini-w)*0.34)]` |
  | `hand` | `left-[7%] top-[3%] text-[length:calc(var(--hand-w)*0.31)]` | `right-[7%] top-[8%] size-[calc(var(--hand-w)*0.21)]` |
- `Card.tsx`: `const art = useCardArt(card)`. Com `art`: `<ArtFace>` no lugar de `<Face>`; o fundo é `bg-tinta` (no lugar de `bg-papel`,
  `QUAD_FACE` e `bg-ouro`); `overflow-hidden` **não** entra na carta (a seta da frente, o anel da quadra e a aura ficam por fora): quem
  recorta a imagem é um invólucro `absolute inset-0 overflow-hidden rounded-[inherit]` dentro da `ArtFace`. Com `quad`, além do
  `QuadMarks` de hoje, um véu `data-veu-quadra` (`absolute inset-0 bg-ouro/25`) sobre a imagem. Sem `art`, **nada muda**.

- [ ] **Step 1: Escrever os testes que falham** (`card-art.test.tsx`):
  - **Sem provedor:** a numérica, o K e o Selvagem rendem como hoje (`data-valor` com `font-madeira`, o fundo `bg-papel` ou `bg-ouro`,
    nenhum `img`, nenhum `data-aura`).
  - **Com `LooksProvider` e `packs` prontos, `{ bestiario, egipcio }`:** o 7 de copas tem o `img` com a URL da Fênix e `alt=""`; o
    `data-valor` diz "7" na cor `#ffe2b0` e o naipe tem a mesma cor (nada de `text-vermelho`); há `data-anel-arte`; há `data-aura`; o
    nome acessível é o de hoje ("7 de copas").
  - **A faixa:** o 2 não tem `data-aura`; o 10 tem, com a sombra da faixa 5; o K egípcio tem a da faixa 3.
  - **Os três tamanhos:** `field`, `mini` e `hand` rendem o valor e o naipe (as classes da tabela).
  - **Os estados:** `quad` → `data-anel-quadra` e `data-veu-quadra`; `grave` → `grayscale`; `draft` → `border-dashed`; `selected` e
    `target` → `anel-ouro`; `marked` → a marca "novo"; `front` → a seta; `disabled` com `onSelect` → `aria-disabled`.
  - **O Selvagem egípcio:** sem `data-valor` na mão; em campo com `as="J"`, a letra J; o nome "Coringa Selvagem como J".
  - **`roleText` na mão:** o K egípcio com "Guarda" → nome acessível "K, Guarda, de paus", como hoje.
  - **A mistura:** com `{ bestiario, bufao }`, a numérica tem arte e o K é o de cordel; com `{ celestial, egipcio }` e o pacote
    `celestial` ausente de `packs`, a numérica é a de cordel e o K tem arte.
  - **O provedor que troca:** mudar `look` de `{ bestiario, egipcio }` para o padrão devolve o cordel sem remontar a carta (o mesmo nó).
  - **O axe** limpo numa mesa mínima com as três espécies.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run --project ui test/ui/card-art.test.tsx`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: Implementar.** A `Card` é do pacote inicial e importa o `ArtFace`, o contexto e o `catalog.ts`: (a) eles ficam no
  inicial, por serem pequenos (um `img`, dois textos, dois enfeites, 27 nomes e cores), e só os módulos de URLs, as imagens e a fonte
  ficam fora. (b) Se o smoke da Task 6 reprovar o orçamento, o `ArtFace` passa a chegar pelo `LooksValue` (o provedor o entrega junto
  com o pacote). Começar pela (a) e medir.
- [ ] **Step 4: Rodar a web inteira**

Run: `pnpm --filter @coringa/web test; pnpm --filter @coringa/web typecheck; pnpm lint`
Expected: PASS, **sem editar nenhum teste existente** (a contagem de animações do `phases.test.tsx` não muda: nada novo anima).

- [ ] **Step 5: Commit**: `feat(web): a face com arte da carta (o valor e o naipe no metal, o anel e a aura da faixa)`.

---

### Task 5: O seletor, o treino e o replay

**Files:**
- Create: `packages/web/src/ui/LookChoice.tsx`
- Modify: `packages/web/src/model/copy.ts` (os textos novos)
- Modify: `packages/web/src/ui/screens/Home.tsx` (o painel "Aparência")
- Modify: `packages/web/src/ui/table/GameMenu.tsx` (o seletor, só no treino)
- Modify: `packages/web/src/ui/table/PlayTable.tsx` (o `LooksProvider`)
- Modify: `packages/web/src/ui/screens/ReplayViewer.tsx` (o `LooksProvider`, F4)
- Test: `packages/web/test/ui/look-choice.test.tsx`; casos novos em `home.test.tsx`, `end-and-menu.test.tsx`, `training.test.tsx`,
  `tutorial.test.tsx` e `replay-screen.test.tsx`

**Interfaces:**
- `LookChoice({ value, onChange, note }: { value: Look; onChange: (look: Look) => void; note?: string })`: dois `fieldset` no molde do
  `HpChoice` (rádios escondidos com cara de botão, alvo ≥ 44 px, o foco com o anel ouro): **Deck** (os três de `DECK_IDS`, com
  `DECK_LABEL`) e **Coringa** (os dois de `RACE_IDS`, com `RACE_LABEL`). Toda troca passa por `normalizeLook`. Com o deck `cordel`, o rádio
  "Egípcio" fica `disabled`, e uma linha diz por quê (`LOOK_LOCK_NOTE`). Abaixo, a amostra: três `Card` (`animated={false}`, tamanho
  `hand`) dentro de um `LooksProvider` próprio com o valor escolhido: uma numérica baixa (3), uma alta (10) e o K. `note`, quando vem,
  aparece embaixo (F1).
- `copy.ts`: `LOOK_PANEL_LABEL = 'Aparência'`, `LOOK_DECK_LABEL = 'Deck'`, `LOOK_RACE_LABEL = 'Coringa'`,
  `LOOK_LOCK_NOTE = 'O deck Cordel joga com o Coringa Bufão.'`, `LOOK_TRAINING_ONLY = 'Por enquanto vale no treino.'`.
- `Home`: um `Panel label={LOOK_PANEL_LABEL}` com o `LookChoice` e a nota da F1, antes do painel "Preferências"; a troca grava
  `savePrefs(store, { ...loadPrefs(store), look })`.
- `GameMenu`: prop nova `look?: { value: Look; onChange: (look: Look) => void }`; com ela, o `LookChoice` aparece abaixo das chaves. A
  `PlayTable` só a passa com `training !== undefined && !tutorial`, e a troca vai por `changePrefs({ ...prefs, look })`.
- `PlayTable`: a aparência da mesa é `training !== undefined && !tutorial ? (snapshot.prefs.look ?? DEFAULT_LOOK) : DEFAULT_LOOK`; o
  `LooksProvider` envolve o `PlayTableView` (a mesa, o cemitério, o Equipar e o momento ficam dentro).
- `ReplayViewer`: `LooksProvider look={prefs.look ?? DEFAULT_LOOK}` em volta da mesa (F4).

- [ ] **Step 1: Escrever os testes que falham.**
  - `look-choice`: os dois grupos com os nomes; as setas e o espaço trocam a opção; escolher Bestiário chama `onChange` com
    `{ bestiario, bufao }`; com Cordel, "Egípcio" está desligado e a nota aparece; escolher Cordel com `egipcio` marcado devolve
    `{ cordel, bufao }`; a amostra tem três cartas, com `img` quando os pacotes vêm prontos; o axe limpo.
  - `home`: o painel "Aparência" existe; a troca fica no armazenamento e volta ao reabrir a tela; a nota da F1 aparece.
  - `end-and-menu`: no treino, o menu mostra o seletor e a troca chama `onPrefs` com a aparência; na sala online e no tutorial, não mostra.
  - `training`: com `look: { bestiario, egipcio }` nas preferências, a mesa rende cartas com `img` (esperar por `findBy…`: o pacote chega
    por promessa); trocar no menu troca as cartas sem remontar a mesa (o mesmo nó da mesa) e sem tocar batida; **com o `import()` do
    pacote rejeitando** (`vi.mock('../../src/looks/load.ts')`), a mesa fica em cordel e nenhum erro vai ao console.
  - `tutorial`: com a mesma preferência, o tutorial rende cordel.
  - `replay-screen`: com a preferência, o replay rende as cartas com arte.
  - Uma sala online (`room-gate.test.tsx` ou o teste da mesa que monte a `PlayTable` sem `training`) com a preferência: cordel.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run --project ui test/ui/look-choice.test.tsx test/ui/home.test.tsx test/ui/end-and-menu.test.tsx test/ui/training.test.tsx test/ui/tutorial.test.tsx test/ui/replay-screen.test.tsx`
Expected: FAIL nos casos novos; os antigos passando.

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm check`. Expected: PASS, sem editar teste existente.
- [ ] **Step 5: Commit**: `feat(web): o painel Aparência no Início e no menu do treino`.

---

### Task 6: Smoke, E2E, fotos, medição e documentação

**Files:**
- Modify: `packages/web/scripts/smoke.ts` (as marcas dos pacotes e da fonte)
- Create: `packages/web/e2e/looks.spec.ts`
- Modify: `packages/web/e2e/medir-cena.ts` (`MEDIR_APARENCIA`, opcional)
- Create: `docs/memoria/notas/medicao-decks-fatia-1.md`
- Modify: `CLAUDE.md` (um item em "Interface web"), a spec (uma seção "O que a execução decidiu (fatia 1)"), `docs/memoria/diario.md`,
  `docs/memoria/estado.md`

- [ ] **Step 1: O smoke.** No molde das marcas que já existem (cada uma num chunk à parte e em nenhum `.js` inicial): `02-morcego`
  (o Bestiário), `02-borboleta` (o Celestial) e `k-mascara` (a raça Egípcia). Mais duas conferências: o `index.html` não pré-carrega
  nenhum `.webp`; o CSS que o `index.html` pede não contém `cinzel-latin-900` (o `@font-face` da Cinzel só existe num CSS de chunk).
  Rodar `pnpm --filter @coringa/web smoke`. Expected: PASS, com o total do JavaScript inicial impresso; anotar o número antes e depois
  desta fatia na nota da medição. Se passar de 200 KB, aplicar a saída (b) da Task 4.
- [ ] **Step 2: O E2E** (`looks.spec.ts`, com `failOnConsoleErrors` e o `axe` dos `helpers.ts`):
  - No Início, escolher Bestiário e Egípcio por teclado; recarregar; a escolha continua.
  - Abrir `/treino?semente=<uma de seeds.ts>&nivel=medio`: as cartas da mão e da mesa têm `img` com `naturalWidth > 0` (a imagem
    carregou de verdade, sob a CSP do `wrangler dev`); o axe limpo; sem rolagem de lado a 360 × 640 e a 1366 × 657.
  - No menu do treino, trocar para Celestial: as imagens trocam; para Cordel: nenhuma `img` de carta na mesa.
  - Com Cordel escolhido, "Egípcio" não se marca.
  - O tutorial com a preferência fantasy: cordel.
- [ ] **Step 3: As fotos** (para o autor, fora do repositório, numa pasta dita no diário): a mesa do treino a 360 × 640 e a 1366 × 657
  com `{ bestiario, egipcio }` e com `{ celestial, egipcio }`; a mão; o diálogo do cemitério; a Guarda e os bônus com as minis; o painel
  "Aparência" nas duas larguras. Olhar uma a uma: o valor e o naipe se leem em toda carta? O Pégaso e o Arcanjo? As minis de 30 px?
  O que não se ler vira ajuste desta tarefa (o contorno mais forte, o canto mais escuro), e fica dito na nota.
- [ ] **Step 4: A medição** (F5). `medir-cena.ts` ganha `MEDIR_APARENCIA` (`bestiario:egipcio`), que grava `coringa:prefs` com a aparência
  num `addInitScript` antes de abrir o replay; sem a variável, nada muda. Com a web construída:

Run: `MEDIR_FIXTURE=exodia-devastacao MEDIR_RODADA=7 MEDIR_PASSO=27 MEDIR_MS=4600 MEDIR_FOTOS=300,1100,2500 MEDIR_SAIDA=<pasta> pnpm --filter @coringa/web exec playwright test --config medir.config.ts`
  (os parâmetros são os do exemplo no cabeçalho do `medir-cena.ts`; conferir com a medição mais recente dessa fixture em `docs/memoria/notas/`),
  uma vez sem `MEDIR_APARENCIA` e uma com `MEDIR_APARENCIA=bestiario:egipcio`, e de novo com `celestial:egipcio`.
Expected: a tabela (quadros/s, p95, maior intervalo, a chegada) nas duas larguras, na nota `medicao-decks-fatia-1.md`, com o veredito da
  F5. Se não passar, aplicar as saídas na ordem, medir de novo e registrar o que mudou.
- [ ] **Step 5: `pnpm check` e `pnpm e2e`.** Expected: PASS nos dois. Repetir a execução inteira do E2E se o limite de salas barrar
  (nunca `--repeat-each`).
- [ ] **Step 6: A documentação.**
  - `CLAUDE.md`, em "Interface web": um item **Aparências** (onde mora a arte e as origens; que o catálogo, as imagens e a Cinzel ficam
    fora do pacote inicial e o smoke confere; que a `Card` sem provedor é cordel; que as imagens entram por `import.meta.glob`).
  - A spec: a seção "O que a execução decidiu (fatia 1)", com as escolhas F1 a F7 como ficaram, as saídas da medição que foram usadas e
    o que as fotos mudaram.
  - `diario.md`: a entrada do bloco (o que foi feito, os commits, as armadilhas, as `Ruling:` de cada tarefa). `estado.md`: o próximo
    passo (o autor joga o treino com os três decks; depois, o plano da fatia 2).
- [ ] **Step 7: Commit** (`test(web): o E2E, o smoke e a medição das cartas com arte`; `docs: a fatia 1 dos decks`), subir a branch quando o
  pre-push passar e abrir o PR para a `main`. O merge é com as duas CI verdes.
- [ ] **Step 8: O revisor** (F7): um subagente novo lê a branch inteira contra este plano e a spec, com o Review Focus na mão. O que ele
  achar vira correção nesta branch, antes do merge.

## Para quem executa (escolhas deixadas a você)

São suas:
- a posição fina do valor e do naipe dentro de cada tamanho (os percentuais da tabela são o ponto de partida do rascunho aprovado), desde
  que os tamanhos de fonte da spec §4 fiquem como estão;
- a cor e a largura exatas do contorno e do halo do número (F2), desde que não haja `filter`;
- o desenho do anel e a geometria da aura, desde que os números de `AURA` fiquem;
- a ordem e o espaçamento dentro do painel "Aparência", e o tamanho das três cartas da amostra no celular;
- os nomes dos testes e a divisão em arquivos de teste.

Não são suas: os ids e os rótulos dos decks e das raças, as cores de metal, os tamanhos de fonte da spec §4, a regra de que o Cordel
não muda, o orçamento e o portão da F5.

**Para e pergunta** se: um teste existente precisar mudar para passar; o orçamento estourar mesmo com a saída (b); a medição não passar
depois das três saídas; ou a `main` tiver um `Card.tsx`, um `GameMenu.tsx` ou um `PlayTable.tsx` diferente do que este plano descreve.
