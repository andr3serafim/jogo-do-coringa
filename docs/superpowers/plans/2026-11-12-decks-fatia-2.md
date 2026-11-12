# Decks e raças do Coringa, fatia 2: o dono por lado — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **De onde vem este plano:** escrito no Claude Code, no checkout principal, com o código da `main` em `2f2aa51` (a fatia 1 inteira), na
> branch `feat/decks-fatia-2`. Os nomes de arquivo, de função e de teste foram lidos do código. A medição da Devastação com arte, pedida pelo
> `estado.md` para este plano, foi feita antes dele (`docs/memoria/notas/medicao-decks-fatia-1.md`, seção "Antes da fatia 2"). **O autor
> aprovou as escolhas G1 a G8 como recomendadas** (`decisoes.md` 2026-11-12 (1)); a execução é em outra sessão, a partir da Task 0.

**Goal:** no treino, cada lado da mesa veste a aparência do dono:
- **O bot tem a aparência dele:** as cartas dos campos, a Guarda e os bônus dele, o verso das cartas da mão dele e o retrato dele no placar.
- **O que é de quem olha** (a mão, o Equipar, o fantasma do arrasto, o cemitério) veste a sua.
- **O momento da especial do oponente e as cópias das cartas nas cenas** vestem a de quem a cena fala.
- **A partida guardada leva as aparências**, e o replay as mostra.
- **O Cordel não muda:** com a aparência padrão, a mesa, o DOM e os testes de hoje ficam como estão.

O online segue em Cordel até a fatia 3, como manda a F1.

**Architecture:**
- **Um provedor só, e zonas sem DOM.** O `LooksProvider` passa a conhecer a aparência de cada dono (`owners`) e pede a união dos pacotes de
  todos. O `LookZone owner={id}` não pede nada e não põe nó no DOM: só troca, para os filhos, a aparência do lugar. Fora de um `LookZone`, o
  lugar veste a de quem olha (`look`, como na fatia 1). Provedores por zona multiplicariam o "cordel pisca" da fatia 1.
- **A carta continua sem saber de dono.** O `useCardArt` lê a aparência do lugar, como hoje; o `Card.tsx` e o `ArtFace.tsx` não mudam.
- **O verso e o retrato leem a aparência do lugar** (`useLook()`): o verso pela cor do deck (CSS, sem imagem), o retrato pela raça.
- **A regra do bot é do modelo** (`botLook`, em `model/looks.ts`), pura e testada no Node.
- **A partida guardada ganha `looks`**, opcional e lido campo a campo, como o resto do `past-games.ts`.

**Tech Stack:** React 19, Tailwind 4, Vite, Vitest (`model` no Node, `ui` no jsdom), Playwright. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-10-decks-e-racas-design.md` §3 (quem veste cada carta), §4.3 (o verso e o retrato), §7.1 (o bot),
§7.3 (o replay), §9, §10 e §11 (a fatia 2); a §15 (o que a fatia 1 decidiu). As decisões: `decisoes.md` 2026-11-10 (2), 2026-11-11 (1) a (3)
e 2026-11-12 (1) (a aprovação deste plano).
O que a fatia 1 deixou: `diario.md` 2026-11-11 (1) (os rulings e os 8 Minor).

## O que este plano não traz

- **A Devastação no celular.** Medida para este plano, ela fica em 46 e 47 quadros/s com arte, contra 55 do Cordel: a F5 não passa nessa cena
  a 360. É um defeito da fatia 1, que já está na `main`, e vai ao autor como achado à parte (a nota da medição e o `estado.md`). O custo é o
  recálculo de estilo das cartas da mesa inteira, que já acontece no Cordel e dobra com a face com arte; as saídas da F5 não o atacam.
- **Mais arte na mesa.** A fatia 1 já veste os dois lados com arte no treino (a sua, dos dois lados). Esta fatia troca a do lado do bot pela
  dele e acrescenta o retrato (uma imagem de 256 px por lado) e as cores do verso (CSS). O número de cartas com arte na mesa não muda.
- **O online** (a fatia 3), as cenas por raça e a carta ampliada (spec §12).

## Escolhas do plano (aprovadas)

**O autor aprovou as oito como recomendadas** (`decisoes.md` 2026-11-12 (1)). Onde a spec diz outra coisa, vale o plano: a G1 substitui a
regra do bot da §7.1 (o deck seguinte), e a G3 tira a F4 da fatia 1 (o replay com a aparência de agora). A seção "O que a execução decidiu
(fatia 2)" da spec registra isso na Task 6. **A Devastação no celular** ficou sem ordem de consertar antes: vale o caminho da G7 (o portão
relativo), e o conserto segue esperando o autor (`estado.md`).

- **G1. O deck do bot.**
  - **O conflito:** a §7.1 da spec põe o bot no deck seguinte ao seu (Cordel → Bestiário → Celestial → Cordel). Com a aparência padrão (o
    Cordel), o bot jogaria de Bestiário. Isso quebra a promessa da §0 e da §14 ("com a aparência padrão, o jogo fica idêntico ao de hoje,
    nenhum teste existente muda"): os testes e os E2E do treino rodam com a preferência padrão, e todo jogador de treino passaria a ver arte
    (e o custo dela, a Devastação acima) sem ter escolhido.
  - **Recomendo:** com o Cordel, o bot também fica no Cordel (com o Bufão). Com um deck de arte, o bot joga com o **outro** deck de arte, com
    a raça Egípcia. Bestiário → Celestial; Celestial → Bestiário. É o "o que você não escolheu" da conversa, entre os decks de arte.
  - **Alternativa:** a regra da spec como está (o deck seguinte), aceitando que o treino padrão mude e que os testes do treino mudem junto.
- **G2. O bot acompanha a sua troca no meio da partida.**
  - **Recomendo:** a aparência do bot é calculada da sua a cada desenho (`botLook(sua)`), sem guardar nada: trocar o seu deck no menu troca
    o do bot também (você em Celestial, ele em Bestiário). A regra fica a mesma em qualquer instante, e a partida guardada leva a do fim.
  - **Alternativa:** fixar a do bot no começo da partida. Custa guardar estado na mesa (e decidir o que a revanche faz); a vantagem é o lado
    dele não mudar quando você mexe no seu.
- **G3. O replay mostra as aparências gravadas.**
  - **Como fica:** a partida guardada ganha `looks: { me, opponent }`; o replay veste o seu lado e o lugar de quem olha com o `me`, e o lado
    do oponente com o `opponent`. **Partida sem `looks`** (as de antes desta fatia, as online e as do tutorial): Cordel dos dois lados, como a
    §7.3 manda.
  - **O que isso troca da fatia 1:** a F4 (o replay com a aparência de agora, dos dois lados) sai. As partidas de treino gravadas entre o
    merge da fatia 1 e o desta voltam a abrir em Cordel. O teste da fatia 1 que conferia a F4 (`replay-screen.test.tsx`, "com a preferência
    fantasy, o replay mostra as cartas com arte") passa a conferir a gravada: é o único teste existente que muda por desenho.
  - **A medição** (`medir-cena.ts`) passa a gravar as aparências na própria partida da fixture, e não nas preferências.
  - **Recomendo** assim. **Alternativa:** partida sem `looks` abre com a aparência de agora (a F4 continua para as antigas).
- **G4. O tutorial e o online seguem em Cordel** (a F1 até a fatia 3), e só o treino fora do tutorial grava `looks`. **Recomendo** assim.
- **G5. Os 8 Minor da revisão da fatia 1 entram aqui** (Task 1), cada um com o teste que falha antes. São todos pequenos e quase todos em
  arquivos que esta fatia mexe. Um deles muda uma `Ruling:` da fatia 1: o pacote que falha deixa de ficar falho até recarregar, e uma nova
  montagem o pede de novo (a carta segue em Cordel enquanto isso, sem erro: a F3 continua). **Recomendo** os oito. **Alternativa:** dizer
  quais ficam de fora.
- **G6. O verso da carta que vira no momento** (o `momento-verso`, antes de a especial do oponente se mostrar) **acompanha o deck de quem
  jogou**, como o verso da mão dele. A spec só fala do verso da mão (§4.3); é a mesma carta, do mesmo dono. **Recomendo** assim.
- **G7. O portão da medição desta fatia.**
  - **O que se mede:** a troca de mão (236→237) e a Devastação (210→211) da `exodia-devastacao`, com o Cordel e com dois decks diferentes na
    mesa (você Bestiário + Egípcio, o oponente Celestial + Egípcio), alternados numa build só, 3 repetições, na tomada.
  - **O portão é relativo, dentro da mesma medição** (como a F5 da fatia 1): o que conta é quanto a arte perde para o Cordel na mesma rodada
    alternada, comparado com o que ela já perde na `main`. Números absolutos de outro dia não decidem: o próprio Cordel variou de 43 a 55 numa
    mesma sessão, e a tolerância é de 2.
  - **A perda da `main`** (medianas, Cordel menos arte): na troca de mão, ~6 quadros/s no PC (56 → 50) e ~3 no celular (58 → 55); na
    Devastação, ~0 no PC (50 → 50) e ~8 no celular (55 → 47).
  - **Passa se** a perda de cada cena, em cada largura, não crescer mais de 2 quadros/s. Se a dúvida ficar no limite, medir a `main` e a branch
    na mesma sessão, uma depois da outra.
  - **Se o autor mandar consertar a Devastação antes** (o achado acima), esta fatia começa depois desse conserto, e a perda de referência é a
    da `main` consertada.
  - **Recomendo** assim.
- **G8. A execução.** No Claude Code local, com o Opus 5.5, tarefa por tarefa, teste primeiro, na branch `feat/decks-fatia-2` (já aberta, com
  a medição e este plano); no fim, um revisor novo, num subagente, lendo a branch inteira, como na fatia 1. **Recomendo** assim.

## Global Constraints

- **O Cordel não muda:** com a aparência padrão, nenhum teste existente muda. Os testes da fatia 1 que conferem "a sua aparência dos dois
  lados" no treino continuam valendo enquanto só olham o seu lado e o seu lugar; se um deles passar a ver as cartas do bot e falhar, a mudança
  é a desta fatia (a §3) e vai no diário com o porquê. Qualquer outro teste que precise mudar: para e pergunta.
  - **Por que os testes da troca no menu seguem verdes** (o `training.test.tsx` "trocar o deck no menu…" e o E2E "a troca no menu do
    treino…"): eles afirmam "nenhuma imagem do Bestiário" depois de trocar para Celestial, e com a G2 o bot vai para o Bestiário. Passam só
    porque, no começo da partida (o Equipar), o bot não tem carta virada na mesa. Se um deles quebrar porque a partida do teste mudou, o
    conserto é no teste (olhar só o seu lado), nunca na regra do bot.
- **O `LookZone` não põe nó no DOM:** é só um provedor de contexto. Os seletores de hoje (`[data-campos] > *`, `[data-campo]`, as fileiras)
  ficam como estão.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip. O retrato do Anúbis, como as outras imagens, só chega pelo pacote da raça (por `import()`); o
  smoke confere (Task 1, Minor 5).
- **Ritmo:** G7. Nada novo anima `box-shadow`, `filter` nem `blur`; o verso e o retrato são parados.
- **Fotossensibilidade:** nada novo pisca nem inverte.
- **Sem regra na interface:** a aparência é desenho. O bot escolhe jogadas como hoje; `botLook` só diz o desenho dele.
- **Acesso:** o nome acessível de toda carta, do verso e do retrato não muda; as imagens são decorativas (`alt=""`). O axe fica limpo.
- **CSP:** as cores do verso entram por classes do Tailwind (ou por `style` do React, pelo CSSOM), nunca por atributo escrito em HTML.
- **Node puro fora da web:** nada muda em `@coringa/protocol` nesta fatia.
- **Partidas de referência:** `RULES_VERSION`, `STATE_SCHEMA` e `PROTOCOL_VERSION` não mudam. `E2E_SEED` fica vazia. O deploy é do autor.
- **Testes:** em `test/ui`, todo arquivo é `.test.tsx`; em `test/model`, `.test.ts`, com 90% de linhas e de branches em `src/model`. O jsdom
  não tem layout: o tamanho e a leitura se conferem nas fotos da Task 6.
- **Memória:** `estado.md` e `diario.md` a cada tarefa, como manda o `CLAUDE.md` (regras 2, 4 e 6), com as `Ruling:`. `pnpm check` antes de
  cada commit de código; nunca `--no-verify`.

## Review Focus

1. **Cada lugar com o dono certo** (a tabela da §3): os campos, a Guarda e os bônus de cada lado; a mão, o Equipar, o arrasto e o cemitério
   com a de quem olha; o momento e as cópias das cenas com a de quem a cena fala → testes das Tasks 3 e 4.
2. **O padrão intocado:** com a preferência padrão, o bot em Cordel, nenhum `img` de carta, o verso de listras e o Coringa no placar → teste
   da Task 4 e os testes de hoje sem mudança.
3. **Um provedor só:** os pacotes dos dois lados pedidos uma vez, e o `LookZone` sem DOM → teste da Task 3.
4. **A partida guardada:** `looks` gravado no treino, ausente no tutorial e no online, lido com `normalizeLook`, e a partida antiga sem ele →
   testes das Tasks 2 e 5.
5. **O retrato fora do pacote inicial** e o smoke que pega qualquer `.webp` → Task 1 e Task 6.
6. **A medição** contra a `main` (G7) → Task 6.

---

### Task 0: O começo

**Files:** nenhum de código.

- [ ] **Step 1: A regra 1 do `CLAUDE.md`** (o `estado.md` mais novo, `git worktree list`, `git status --short`). Confirmar que a aprovação
  deste plano está no `decisoes.md`, com o texto do autor e as escolhas G1 a G8 como ficaram. Se não estiver, parar.
- [ ] **Step 2: A branch.** `feat/decks-fatia-2` já existe, saída da `main` em `2f2aa51`, com os commits da medição e deste plano. Se a `main`
  andou, trazê-la (`git rebase main` sem nada publicado; com a branch já no GitHub, `git merge main`). Se o autor mandou consertar a Devastação
  antes (G7), esta fatia sai da `main` depois desse conserto.
- [ ] **Step 3: Rodar** `pnpm check`. Expected: PASS. Commit da memória (`docs(memoria): a fatia 2 dos decks, em curso`).

---

### Task 1: Os 8 Minor da fatia 1 (G5)

**Files:**
- Modify: `packages/web/src/looks/load.ts`, `packages/web/src/ui/cards/LooksProvider.tsx` (Minor 1 e 3)
- Modify: `packages/web/src/ui/screens/Training.tsx`, `packages/web/src/ui/screens/ReplayScreen.tsx` (Minor 1: o pedido adiantado)
- Modify: `packages/web/src/ui/table/PlayTable.tsx` (Minor 2)
- Modify: `packages/web/src/ui/LookChoice.tsx` (Minor 6 e 7)
- Modify: `packages/web/scripts/smoke.ts` (Minor 5)
- Modify: `packages/web/e2e/looks.spec.ts` (Minor 4)
- Test: casos novos em `test/model/looks-catalog.test.ts`, `test/ui/card-art.test.tsx`, `test/ui/look-choice.test.tsx` e no teste da sala
  online do `end-and-menu.test.tsx` (Minor 8)

**Interfaces:**
- `load.ts`:
  ```ts
  /** As URLs do pacote, se ele já chegou (sem esperar); `undefined` se ainda não chegou ou falhou. */
  export function readyPack(id: PackId): PackUrls | undefined;
  ```
  O `loadPack` guarda o que resolveu num mapa síncrono. **Rejeição:** a promessa sai do mapa de pedidos, e o próximo `loadPack` do mesmo
  pacote tenta de novo (muda a `Ruling:` da Task 3 da fatia 1; a F3 continua: quem chama cai no Cordel, sem erro).
- `LooksProvider`: o estado inicial vem do `readyPack` de cada pacote pedido. Com o pacote já pronto, a primeira renderização já tem a arte.
- **O cache é do módulo e vaza entre os testes do mesmo arquivo:** um teste que espera o Cordel enquanto o pacote chega pode ver a arte de
  cara, conforme a ordem. O `load.ts` ganha um reset só para os testes (ou eles usam `vi.resetModules`), chamado no `beforeEach` dos arquivos
  que dependem disso.

Os oito, cada um com o teste que falha antes:
1. **O cordel pisca antes da arte** (cada provedor começa vazio). O provedor começa com os pacotes já prontos (`readyPack`). O `Training`
   pede os pacotes da aparência junto com o módulo da sala local, e o `ReplayScreen` assim que acha a partida (`findPastGame`), os dois sem
   esperar por eles e sem falhar se rejeitarem. Teste: um provedor montado depois de o pacote chegar desenha a arte no primeiro `render`, sem passar pelo Cordel.
2. **O JSDoc órfão** acima do `chosenLook` no `PlayTable.tsx`: cada comentário em cima da função dele. Sem teste (só comentário).
3. **A promessa rejeitada sem teste, e a falha passageira que desliga a arte até recarregar:** o teste do `loadPack` que rejeita uma vez e
   resolve na segunda (o `import()` do pacote trocado por um falso, como no `training-looks-fail.test.tsx`).
4. **O negativo do tutorial no E2E espera 500 ms:** passa a conferir as requisições (nenhum pedido de `.webp` nem do chunk de um pacote
   durante o tutorial), sem `waitForTimeout`.
5. **O smoke procura três nomes de `.webp`:** passa a reprovar qualquer nome de arquivo de `src/looks/**/*.webp` no JavaScript inicial (o
   `retrato-anubis` incluído), lendo a pasta, e continua conferindo que cada pacote está num chunk.
6. **Passar pelo Cordel desfaz a escolha de raça:** o `LookChoice` lembra a última raça escolhida fora do Cordel enquanto está aberto, e a
   devolve quando o deck sai do Cordel. Teste: Bestiário + Egípcio → Cordel → Celestial dá Celestial + Egípcio.
7. **A linha da trava sem ligação ao grupo Coringa:** `aria-describedby` do grupo (o `fieldset`) aponta para a linha `LOOK_LOCK_NOTE`, quando
   ela aparece. Teste: a descrição acessível do grupo traz a frase.
8. **O teste da sala online não espia o console:** o caso da sala online com a preferência fantasy confere que nenhum erro foi ao console.

- [ ] **Step 1: Escrever os testes que falham** (1, 3, 6, 7 e 8; o 4 e o 5 se conferem rodando o E2E e o smoke).
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/looks-catalog.test.ts test/ui/card-art.test.tsx test/ui/look-choice.test.tsx test/ui/end-and-menu.test.tsx`
Expected: FAIL nos casos novos; os antigos passando.

- [ ] **Step 3: Implementar os oito.**
- [ ] **Step 4: Rodar** `pnpm check` e `pnpm --filter @coringa/web exec playwright test e2e/looks.spec.ts`. Expected: PASS. O smoke reprova um
  `.webp` posto de propósito no `index.html` e um nome de `.webp` no JavaScript inicial (conferir uma vez, à mão, e desfazer).
- [ ] **Step 5: Commit**: `fix(web): os menores da fatia 1 dos decks (o cordel que pisca, a nova tentativa, a trava acessível)`.

---

### Task 2: O modelo: o bot e a partida guardada

**Files:**
- Modify: `packages/web/src/model/looks.ts` (`botLook`)
- Modify: `packages/web/src/model/past-games.ts` (`PastGame.looks?`, a leitura)
- Test: casos novos em `packages/web/test/model/looks.test.ts` e `packages/web/test/model/past-games.test.ts`

**Interfaces:**
- `model/looks.ts`:
  ```ts
  /** A aparência do bot no treino (G1): com o Cordel, o Cordel com o Bufão; com um deck de arte, o outro deck de arte, com a raça Egípcia. */
  export function botLook(mine: Look): Look;
  ```
- `past-games.ts`:
  ```ts
  export interface PastLooks { me: Look; opponent: Look }
  export interface PastGame { /* …os campos de hoje… */ looks?: PastLooks }
  ```
  A leitura (`parsePastGame`): com `looks` objeto, `{ me: normalizeLook(looks.me), opponent: normalizeLook(looks.opponent) }`; sem o campo,
  ou com um valor que não é objeto, o campo fica ausente e a entrada vale (nunca derruba a linha). A gravação (`recordPastGame`) leva o campo
  quando vem, e só ele: nada mais muda na lista.

- [ ] **Step 1: Escrever os testes que falham.** `botLook`: as seis aparências possíveis (Cordel → Cordel + Bufão; Bestiário com as duas
  raças → Celestial + Egípcio; Celestial com as duas → Bestiário + Egípcio); a saída nunca é o mesmo objeto de `DEFAULT_LOOK`.
  `past-games`: a entrada sem `looks` carrega sem o campo e igual a hoje; com `looks` válido, com ele; com um id desconhecido ou
  `{ cordel, egipcio }`, normalizado; com `looks: 'x'` ou `looks: null`, sem o campo e com a linha inteira; gravar e ler devolve o campo.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run --project model test/model/looks.test.ts test/model/past-games.test.ts`
Expected: FAIL nos casos novos; os antigos passando.

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/web exec vitest run --project model; pnpm --filter @coringa/web typecheck`. Expected: PASS, com a
  cobertura de `src/model` nos 90%.
- [ ] **Step 5: Commit**: `feat(web): a aparência do bot e as aparências na partida guardada`.

---

### Task 3: O contexto: os donos, a zona e o retrato

**Files:**
- Modify: `packages/web/src/ui/cards/looks-context.ts` (`owners`, `useLook`)
- Modify: `packages/web/src/ui/cards/LooksProvider.tsx` (`owners`, a união dos pacotes, `LookZone`)
- Modify: `packages/web/src/looks/load.ts` (`loadPortrait`)
- Test: casos novos em `packages/web/test/ui/card-art.test.tsx` (ou um `look-zone.test.tsx` novo, à escolha de quem executa)

**Interfaces:**
- `looks-context.ts`: o `LooksValue` ganha o que a zona precisa para achar o dono (os `owners` e a aparência de quem olha); o `look` continua
  sendo a aparência **deste lugar**, que o `useCardArt` lê como hoje.
  ```ts
  /** A aparência do lugar: a do `LookZone` mais próximo; fora de zona, a de quem olha; sem provedor, `DEFAULT_LOOK`. */
  export function useLook(): Look;
  ```
- `LooksProvider.tsx`:
  ```tsx
  export function LooksProvider(props: {
    /** A aparência de quem olha: a mão, o Equipar, o cemitério, e todo lugar fora de um `LookZone`. */
    look: Look;
    /** A aparência de cada dono (o lado da mesa, o retrato). Sem ela, toda zona veste `look`. */
    owners?: Partial<Record<PlayerId, Look>>;
    packs?: LooksValue['packs'];
    children: ReactNode;
  }): JSX.Element;

  /** O lugar de um dono: os filhos vestem a aparência dele (`owners[owner]`, ou a de quem olha se ele não está lá). Não põe nó no DOM. */
  export function LookZone(props: { owner: PlayerId; children: ReactNode }): JSX.Element;
  ```
  O provedor pede a **união** dos `packsOf` de `look` e de cada aparência de `owners`, uma vez cada (a lista em texto, como hoje, para o efeito
  não rodar de novo a cada objeto novo). A zona não pede nada.
- `load.ts`:
  ```ts
  /** O retrato quadrado da raça (só a Egípcia tem), do mesmo chunk do pacote dela. Rejeita como o `loadPack`. */
  export function loadPortrait(race: Exclude<RaceId, 'bufao'>): Promise<string>;
  ```
  O `PackUrls` e a forma do `packs` não mudam (os testes da fatia 1 os montam à mão). O retrato pode chegar pelo mesmo `import()` do pacote
  (`m.portrait`) ou por um campo à parte no provedor: escolha de quem executa, desde que fique fora do inicial e que o retrato tenha o mesmo
  `readyPack` síncrono da Task 1 (sem piscar o Coringa de cordel quando o pacote já chegou).

- [ ] **Step 1: Escrever os testes que falham.**
  - **A zona:** com `look` = Bestiário + Egípcio e `owners` = { p1: Bestiário + Egípcio, p2: Celestial + Egípcio }, uma carta 7 dentro do
    `LookZone owner="p2"` tem a imagem da Celestial; a mesma carta fora de zona tem a do Bestiário; um dono que não está em `owners` veste a
    de quem olha.
  - **Sem DOM:** o `LookZone` não acrescenta elemento (o filho dele é filho direto do pai no DOM).
  - **A união dos pacotes:** com os dois lados de decks diferentes, o `loadPack` é chamado uma vez para cada um dos três pacotes, e nenhuma
    vez para um pacote que ninguém cita.
  - **O padrão:** sem `owners` e com `look` padrão, nenhum pacote pedido e toda carta de cordel (o comportamento de hoje).
  - **`useLook`:** sem provedor, `DEFAULT_LOOK`; dentro de zona, a do dono.
  - **`loadPortrait('egipcio')`:** uma URL que termina em `retrato-anubis` e `.webp` (teste no `model`, junto do `looks-catalog.test.ts`).
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/card-art.test.tsx test/model/looks-catalog.test.ts`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm --filter @coringa/web test; pnpm --filter @coringa/web typecheck; pnpm lint`. Expected: PASS, sem editar teste
  existente.
- [ ] **Step 5: Commit**: `feat(web): a aparência por dono (o LookZone) e o retrato da raça`.

---

### Task 4: A mesa: cada lado com o seu dono

**Files:**
- Modify: `packages/web/src/ui/table/Table.tsx` (um `LookZone` em volta de cada `PlayerField`)
- Modify: `packages/web/src/ui/table/FightHud.tsx` (o retrato por raça, em `LookZone` por lado)
- Modify: `packages/web/src/ui/cards/Card.tsx` (o `CardBack` pela cor do deck)
- Modify: `packages/web/src/looks/catalog.ts` (as cores do verso por deck)
- Modify: `packages/web/src/ui/anim/Moment.tsx` (o momento e o verso dele no `LookZone` de quem jogou: G6)
- Modify: `packages/web/src/ui/scenes/Resurrection.tsx`, `packages/web/src/ui/scenes/Devastation.tsx` (as cópias no `LookZone` de quem a cena
  fala)
- Modify: `packages/web/src/ui/table/PlayTable.tsx` (`owners` no treino; as aparências para a gravação)
- Modify: `packages/web/src/ui/table/useRecordPastGame.ts` (o parâmetro `looks`)
- Modify: `packages/web/src/styles.css` só se o `momento-verso` precisar de uma variante por deck
- Test: casos novos em `training.test.tsx`, `tutorial.test.tsx`, `end-and-menu.test.tsx` (a sala online), `moment.test.tsx` e nos testes das
  cenas, mais um arquivo novo se ficar mais claro (`table-looks.test.tsx`)

**O que vai onde** (a §3 da spec, com o que o código tem hoje):

| Lugar | Componente | Aparência |
|---|---|---|
| Os campos (fileiras, Guarda, bônus) e a mão do oponente (os versos) | `PlayerField` (`Row`, `TableCard` mini, `CardBack`) | `LookZone owner={player.id}` em volta de cada `PlayerField` no `Table.tsx` |
| O retrato | `FightHud` (`Side`) | `LookZone owner={player.id}` em volta de cada lado; o retrato lê `useLook().race` |
| A mão, o Equipar, o fantasma do arrasto | `Hand`, `EquipPanel`, o clone do `useCardDrag` | fora de zona: a de quem olha (nada muda) |
| O cemitério (a prévia e o diálogo) | `CenterBand`, `GraveyardDialog` | fora de zona: a de quem olha (nada muda) |
| O monte | `CenterBand` (`data-monte`) | só um número: nada a vestir |
| O momento da especial do oponente e o verso dele | `Moment.tsx` (`MomentLayer`) | `LookZone owner={event.player}` |
| As cópias da Ressurreição | `Resurrection.tsx` | `LookZone owner={player}` (quem ressuscita) |
| As cópias da Devastação | `Devastation.tsx` | `LookZone owner={owner}` (o dono da fileira que cai) |
| As cópias das cartas que saem | `Leaving.tsx` (clone do DOM) | o clone leva a face que a carta tinha: nada muda |
| As quatro cartas da figura da cena rara | `Scene.tsx` (`Figure`) | ficam como estão: a cena é do cordel (spec §3, "as seis cenas seguem em cordel") |

**Interfaces:**
- `catalog.ts`:
  ```ts
  /** O verso de cada deck (spec §4.3): duas cores e uma borda, em classes, sem imagem. O do Cordel é o de hoje (as listras). */
  export const BACK_CLASS: Record<DeckId, string>;
  ```
  Bestiário: violeta escuro com fio de ouro; Celestial: azul com fio de ouro (spec §4.3). O tom exato é de quem executa, conferido nas fotos.
- `CardBack`: a classe do fundo vem de `BACK_CLASS[useLook().deck]`, e ganha `data-verso-deck={deck}` (para os testes e o E2E). Com o Cordel, o
  DOM fica igual ao de hoje, menos o atributo novo (conferir que nenhum teste de hoje compara o `CardBack` inteiro; se comparar, o atributo
  só entra fora do Cordel).
- O retrato (`FightHud`): com a raça `egipcio` e o retrato pronto, `<img src alt="" className="size-[82%] …">` no lugar do `<Coringa>`; a
  rachadura, a insígnia, a quebra do escudo e o número de dano ficam por cima, como estão. Sem o retrato (o Bufão, o pacote por chegar ou
  falho), o `<Coringa>` de hoje.
- `PlayTable`: no treino fora do tutorial, `look` = a sua (`prefs.look ?? DEFAULT_LOOK`) e `owners` = `{ [view.me]: sua, [view.opponent.id]:
  botLook(sua) }` (G1, G2); no tutorial e no online, o padrão, sem `owners` (G4). As mesmas duas aparências vão para o `useRecordPastGame`, que
  grava `looks: { me, opponent }` só quando as recebe.

- [ ] **Step 1: Escrever os testes que falham.**
  - **O treino com Bestiário + Egípcio:** as cartas das fileiras do bot (depois da revelação), a Guarda e os bônus dele têm as imagens da
    Celestial; as suas fileiras, a sua mão e o cemitério, as do Bestiário; os versos da mão dele têm `data-verso-deck="celestial"`; os dois
    retratos são a imagem do Anúbis.
  - **O treino com Bestiário + Bufão:** o seu retrato é o `<Coringa>`; o do bot, o Anúbis.
  - **O treino padrão:** nenhum `img` de carta, os versos sem a cor de deck (as listras de hoje), os dois retratos com o `<Coringa>`, e o
    `loadPack` nunca chamado.
  - **A troca no menu (G2):** de Bestiário para Celestial, o lado do bot passa a Bestiário, sem remontar a mesa nem tocar batida (o mesmo nó
    e o mesmo `seq`, como o teste da fatia 1); para o Cordel, o bot também vai ao Cordel e nenhuma carta tem `img`.
  - **O momento:** a especial do bot aparece grande com a aparência dele, e o verso que vira tem o deck dele.
  - **As cenas:** as cópias da Devastação vestem a do dono da fileira; as da Ressurreição, a de quem ressuscita.
  - **A carta que muda de lado** (o Roubo): a carta que sai do seu campo e entra no do bot passa a vestir a dele.
  - **A gravação:** a partida de treino terminada fica com `looks` = { a sua, a do bot }; a do tutorial e a online, sem `looks`.
  - **O tutorial e a sala online** com a preferência fantasy: tudo em Cordel, com os versos de listras e o `<Coringa>`, sem erro no console.
  - **O axe** limpo na mesa com os dois decks.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run --project ui test/ui/training.test.tsx test/ui/tutorial.test.tsx test/ui/end-and-menu.test.tsx`
(mais os arquivos novos)
Expected: FAIL nos casos novos; os antigos passando.

- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar** `pnpm check`. Expected: PASS. Se um teste da fatia 1 falhar porque agora vê as cartas do bot, ver o Global Constraint
  do Cordel: a mudança vai no diário, com o porquê; qualquer outro teste, para e pergunta.
- [ ] **Step 5: Commit**: `feat(web): cada lado da mesa com a aparência do dono, o verso por deck e o retrato por raça`.

---

### Task 5: O replay com as aparências gravadas (G3)

**Files:**
- Modify: `packages/web/src/ui/screens/ReplayViewer.tsx`
- Modify: `packages/web/e2e/medir-cena.ts` (as aparências na partida da fixture)
- Test: casos novos em `packages/web/test/ui/replay-screen.test.tsx`; o caso da F4 da fatia 1 muda (G3)

**Interfaces:**
- `ReplayViewer`: `LooksProvider look={game.looks?.me ?? DEFAULT_LOOK} owners={game.looks ? { [game.seat]: game.looks.me, [o outro]:
  game.looks.opponent } : undefined}`. A preferência de agora não entra mais no replay.
- `medir-cena.ts`: `MEDIR_APARENCIA` e `MEDIR_APARENCIAS` passam a gravar `looks` na primeira partida da fixture, antes de abrir o replay,
  e não mais o `coringa:prefs`. O formato aceita o oponente depois de uma barra: `bestiario:egipcio/celestial:egipcio` (sem a barra, a mesma
  dos dois lados, como na medição da fatia 1). O prefixo dos arquivos troca o `:` e a `/` por `-` (uma `/` no nome criaria pasta). O uso no
  começo do arquivo diz isso.

- [ ] **Step 1: Escrever os testes que falham.**
  - Uma partida guardada com `looks` = { Bestiário + Egípcio, Celestial + Bufão }: o seu lado com o Bestiário, o do oponente com a Celestial,
    o retrato dele com o `<Coringa>`, o cemitério e o Equipar do replay com o Bestiário.
  - A mesma partida com a preferência de agora em Celestial: nada muda (a gravada vale).
  - Uma partida sem `looks` com a preferência fantasy: tudo em Cordel.
  - **O caso da F4** ("com a preferência fantasy, o replay mostra as cartas com arte") passa a gravar `looks` na partida em vez da preferência,
    e a conferir o mesmo. É o teste que muda por desenho (G3); vai no diário.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run --project ui test/ui/replay-screen.test.tsx`
Expected: FAIL nos casos novos.

- [ ] **Step 3: Implementar**, e conferir o `medir-cena.ts` rodando a Ressurreição uma vez com `MEDIR_APARENCIA=bestiario:egipcio` (a medida
  espera as imagens; se ela não vir `img`, a aparência não chegou ao replay).
- [ ] **Step 4: Rodar** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): o replay com as aparências gravadas na partida`.

---

### Task 6: Smoke, E2E, fotos, medição e documentação

**Files:**
- Modify: `packages/web/e2e/looks.spec.ts`
- Modify: `docs/memoria/notas/medicao-decks-fatia-1.md` (uma seção "Fatia 2") ou uma nota nova `medicao-decks-fatia-2.md`
- Modify: `CLAUDE.md` (o item "Aparências"), a spec (uma seção "O que a execução decidiu (fatia 2)"), `docs/memoria/diario.md`,
  `docs/memoria/estado.md`

- [ ] **Step 1: O smoke.** Rodar `pnpm --filter @coringa/web smoke`: o retrato fora do inicial (a Task 1 já o pega) e o JavaScript inicial
  impresso; anotar o antes e o depois desta fatia na nota.
- [ ] **Step 2: O E2E** (`looks.spec.ts`, com `failOnConsoleErrors` e o `axe`):
  - O treino com Bestiário + Egípcio: os versos da mão do bot com o deck Celestial; os dois retratos com a imagem do Anúbis carregada
    (`naturalWidth > 0`); depois de uma revelação, as cartas das fileiras do bot com imagens da Celestial e as suas com as do Bestiário.
  - O replay de uma fixture com `looks` gravado (a `especiais`, com a partida acrescida de `looks`): cada lado com o seu, no PC e a 360, sem
    rolar de lado.
  - O teste da troca no menu da fatia 1 continua passando (G1 e G2: o Cordel leva o bot ao Cordel).
- [ ] **Step 3: As fotos** (para o autor, fora do repositório, numa pasta dita no diário): a mesa do treino com os dois decks a 360 × 640 e a
  1366 × 657; os versos de cada deck na mão do bot; os retratos (Bufão × Anúbis); o momento da especial do bot (fixture `especiais`, passos
  10 e 11, com `looks`); as cópias da Devastação e da Ressurreição com os dois decks. Olhar uma a uma: o verso de 18 × 26 px se distingue? O
  Anúbis cabe no retrato com a rachadura e a insígnia por cima? O que não se ler vira ajuste desta tarefa, dito na nota.
- [ ] **Step 4: A medição** (G7), na tomada, numa build só, alternando:

Run: `MEDIR_FIXTURE=exodia-devastacao MEDIR_RODADA=47 MEDIR_PASSO=236 MEDIR_MS=3000 MEDIR_APARENCIAS=cordel,bestiario:egipcio/celestial:egipcio MEDIR_REPETICOES=3 MEDIR_SAIDA=<pasta> pnpm --filter @coringa/web exec playwright test --config medir.config.ts`
  e o mesmo com `MEDIR_RODADA=43 MEDIR_PASSO=210 MEDIR_MS=3200` (a Devastação).
Expected: a tabela nas duas larguras, com o veredito da G7: a perda da arte para o Cordel nesta medição contra a perda da `main` (a seção
  "Antes da fatia 2" da nota e a medida final da fatia 1). Se a perda crescer mais de 2 quadros/s, achar a causa (o retrato? o verso?) antes
  de seguir, e registrar.
- [ ] **Step 5: `pnpm check` e `pnpm e2e`.** Expected: PASS nos dois. Repetir a execução inteira do E2E se o limite de salas barrar (nunca
  `--repeat-each`).
- [ ] **Step 6: A documentação.**
  - `CLAUDE.md`, no item **Aparências**: o `LookZone` (sem DOM) e o provedor único; o bot (`botLook`); a partida guardada com `looks`; o
    replay com as gravadas; o `MEDIR_APARENCIA` gravando na partida.
  - A spec: a seção "O que a execução decidiu (fatia 2)", com as G1 a G8 como ficaram e o que as fotos e a medição mudaram.
  - `diario.md`: a entrada da fatia (os commits, as `Ruling:` de cada tarefa, os testes da fatia 1 que mudaram e por quê, as armadilhas).
    `estado.md`: o próximo passo (o autor joga o treino com os dois lados; depois, o plano da fatia 3).
- [ ] **Step 7: Commit** (`test(web): o E2E e a medição da aparência por dono`; `docs: a fatia 2 dos decks`), subir a branch quando o
  pre-push passar. O merge é com as duas CI verdes, depois do revisor.
- [ ] **Step 8: O revisor** (G8): um subagente novo lê a branch inteira contra este plano e a spec, com o Review Focus na mão. O que ele achar
  vira correção nesta branch, antes do merge.

## Para quem executa (escolhas deixadas a você)

São suas:
- a forma interna do `LooksValue` (os campos que a zona usa), desde que o `look` continue sendo a aparência do lugar e o `PackUrls` não mude;
- o caminho do retrato até o placar (pelo `import()` do pacote ou por um campo do provedor), desde que fique fora do inicial e não pisque;
- o tom exato das cores do verso e o desenho do fio de ouro, desde que sejam duas cores e uma borda em CSS, sem imagem;
- os nomes dos testes e a divisão em arquivos de teste.

Não são suas: a regra do bot (G1, G2), o que o replay mostra (G3), quem fica em Cordel (G4), a tabela "O que vai onde", o orçamento e o
portão da medição (G7).

**Para e pergunta** se: um teste existente fora dos citados (os da fatia 1 que passam a ver o bot, o caso da F4) precisar mudar; o orçamento
estourar; a medição piorar mais de 2 quadros/s e a causa não sair; ou a `main` tiver um `Table.tsx`, um `PlayTable.tsx`, um `FightHud.tsx` ou
um `ReplayViewer.tsx` diferente do que este plano descreve.
