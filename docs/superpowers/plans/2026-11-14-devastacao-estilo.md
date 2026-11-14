# A Devastação com arte no celular: o recálculo de estilo da mesa inteira — plano curto

> **De onde vem:** "3. aprovado." (o autor, `decisoes.md` 2026-11-14 (1)), sobre a recomendação de um bloco curto que estanque a
> invalidação de estilo das cartas da mesa inteira. As escolhas técnicas são de quem executa, como `Ruling:` no `diario.md`. Branch
> `feat/devastacao-estilo`, saída da `main` em `5f1c1fb`.

## O diagnóstico (2026-11-14, nesta máquina)

- **O sintoma** (`notas/medicao-decks-fatia-1.md`, "Antes da fatia 2"): na Devastação (`exodia-devastacao`, rodada 43, passo 210→211) a 360
  com a CPU 4×, a arte dá 46 e 47 quadros/s contra 55 do Cordel; no PC empata. O perfil: ~70 recálculos de estilo da mesa inteira na cena,
  ~1000 "Inline CSS style declaration was mutated" na raiz das cartas.
- **O perfil de agora** (a mesma cena, Bestiário + Egípcio contra Celestial + Egípcio, `MEDIR_PERFIL=1`): 88 recálculos de ~230 elementos
  (as cartas com arte); 617 mutações do `style` da raiz das cartas, todas de `applyProjectionStyles` (a projeção de layout do Motion).
- **A sonda** (um `MutationObserver` no palco durante a cena): o Motion reescreve o `transform` de **29 cartas a cada quadro, por ~800 ms**,
  todas com o mesmo deslocamento inicial (`translate3d(0–1px, ~59px, 0)`). O tremor dos campos (WAAPI) não pesa: sozinho, cada recálculo toca
  no máximo 22 elementos.
- **A causa:** a cena rola os campos para mostrar a fileira atingida (`revealRow`, `ui/anim/scene-box.ts`). A 360 os campos rolam por dentro
  (`[data-campos]`, `Table.tsx`); no PC não rolam, por isso só o celular perde. O contêiner não está declarado ao Motion como área de rolagem
  (`layoutScroll`): o Motion mede as cartas pela janela, lê a rolagem como "todas mudaram de lugar" e as anima de volta, uma a uma, pela
  thread principal. Cada reescrita do `transform` na raiz recalcula a carta inteira, e a carta com arte tem uns 4 elementos a mais. É também
  um defeito visível: depois da rolagem instantânea, as cartas escorregam ~59 px até o lugar.

## O conserto

- **O `[data-campos]` vira `m.div` com `layoutScroll`** (`Table.tsx`): o Motion passa a descontar a rolagem dele, e rolar não anima mais
  carta nenhuma. Vale para todas as rolagens dos campos: a da cena (`revealRow`), a da sua vez de atacar (`PlayTable.tsx`) e a do Equipar.
- **Ruling:** o conserto é na causa (a rolagem lida como mudança de layout), não na face com arte (menos elementos por carta) — a outra saída
  do perfil da fatia 1 só baratearia cada recálculo, e a animação errada continuaria — custo: nenhum para o Cordel, que também deixa de
  escorregar.

## O teste (primeiro, vermelho)

- **E2E** (`e2e/fluidez.spec.ts`, o jsdom não tem layout nem rolagem): a 360 × 640, o replay da `exodia-devastacao` no passo 210 com as
  aparências gravadas; durante a Devastação, um `MutationObserver` no palco anota as cartas (`[data-card-id]`) cujo `style` ganha um
  `translate3d`. **Esperado:** os campos rolaram (o `scrollTop` mudou) e nenhuma carta foi animada pela rolagem. Hoje: 29.

## O portão

- `pnpm check` e `pnpm e2e` verdes.
- **Medição A/B na mesma sessão** (a `main` e a branch, `MEDIR_APARENCIAS=cordel,bestiario:egipcio/celestial:egipcio`, 3 repetições
  alternadas): a Devastação com arte a 360 ≥ 50 quadros/s; o Cordel e a troca de mão (236→237) sem piorar. Os resultados em
  `docs/memoria/notas/medicao-devastacao-estilo.md`.
- Os testes de fotossensibilidade e da linha do tempo intocados.
