# Bloco D do playtest: os botões de carimbo e a lápide no centro — plano

> **De onde vem:** os pontos 5 e 14 do playtest, spec `docs/superpowers/specs/2026-11-03-playtest-design.md` §6 e §8; a variante A nos dois
> pontos é do autor (`decisoes.md` 2026-11-03 (4)). **As escolhas deste plano são do Claude, por delegação** ("5. decida por mim",
> `decisoes.md` 2026-11-14 (1)): estão marcadas **[D]** e **não foram aprovadas pelo autor**. O merge pede o "sim" dele; o deploy é dele.
> Branch `feat/playtest-bloco-d`, saída da `main` em `8368eb1`. Execução na mesma sessão (`executing-plans`), teste primeiro.

## Tarefa 1 (§6.1): os botões de carimbo

**Arquivos:** `src/styles.css`, `src/ui/table/controls.tsx`, `ActionBar.tsx`, `EquipPanel.tsx`, `OrderPanel.tsx`, `ReactionPanel.tsx`,
`Table.tsx` (só o invólucro da barra), `src/ui/table/stamp-ink.ts` (novo), `src/ui/anim/Stage.tsx` (só a marca do movimento reduzido).

- **A classe `.carimbo`** (`styles.css`): borda de 3 px de tinta, sombra dura e a face na cor da variante. As constantes de
  `controls.tsx` passam a compô-la: `SECONDARY` (papel, pequeno), `PRIMARY` (ouro, grande: Confirmar, "Atacar primeiro", a Ressurreição da
  janela), e as novas `ATTACK` (vermelho, o maior), `PAPER_BIG` (Passar e Encerrar turno) e `SEAL` (os selos redondos).
- **[D] A sombra é da cor da madeira** (`--color-madeira`, um castanho novo no tema): a barra é de tinta, e a sombra de tinta do protótipo
  (desenhado sobre o campo rosa) sumiria nela. A borda de tinta separa a face da madeira.
- **[D] O grão de papel só nos carimbos grandes** (Atacar, Passar, Encerrar turno, Confirmar e os selos), como segunda camada do fundo. Os
  pequenos (jogadas, alvos, destinos) levam prévias e contas, que não podem ter textura (§10.7); a prévia do Atacar vai numa **tira de papel
  lisa**, por cima do grão.
- **O Atacar:** vermelho, com a espada (`AttackIcon`) à esquerda, o título em tipo de madeira e a prévia na tira. Com o Ataque Absoluto
  armado (`previews.mine.absolute`, do motor): borda de ouro por dentro, a etiqueta "Ataque Absoluto" no canto e uma faísca de ouro que
  corre a borda (`offset-path`; onde o navegador não o tem, a faísca fica parada no canto).
  - **[D] A etiqueta é irmã do botão**, `aria-hidden`: o nome do botão já diz "Ataque Absoluto" na prévia, e o texto visível do botão tem
    de seguir trecho contínuo do nome (WCAG 2.5.3).
  - **[D] "Encerrar turno" é de papel**, não vermelho: "o Atacar é o único vermelho".
- **Desfazer e Recomeçar:** selos redondos com um desenho próprio (seta de volta, seta em círculo) e a legenda embaixo, dentro do botão (o
  nome continua "Desfazer" e "Recomeçar"). No toque o desenho gira.
- **O toque:** `:active` afunda o carimbo (desloca pela sombra, que some). **[D] Os pingos são da cor da face** (tinta sobre tinta não se
  vê): `stamp-ink.ts`, um ouvinte só no invólucro da barra (`pointerup` num `.carimbo` ligado), 7 gotas `position: fixed` (não mexem na
  rolagem), animadas com `transform` e `opacity`, removidas ao fim.
- **Movimento reduzido:** o palco ganha `data-movimento-reduzido`; com ele (ou com `prefers-reduced-motion`), nada desloca nem gira: o
  toque só escurece a face; sem pingos e sem faísca (a mesa não põe a marca `data-faisca`).
- **Foco:** `.carimbo:focus-visible` repõe o contorno de ouro com a borda de tinta (a sombra da classe, numa camada acima, apagaria o da base).
- **Alvo:** todos ≥ 44 px (`min-h-11`; os selos, 44 de largura no mínimo).
- **[D] Os controles do replay** (`ReplayControls.tsx`) têm constantes próprias e ficam como estão: a spec lista só a barra e os painéis.

**Testes primeiro (`test/ui/stamp-buttons.test.tsx`, novo):** o Atacar tem `carimbo-atacar`, a espada e a prévia na tira (sem grão, com
`tabular-nums`); armado, a etiqueta fora do botão e a faísca; com movimento reduzido, sem faísca e sem pingos; o Passar e o Encerrar turno
são de papel; o Confirmar é de ouro; os selos têm nome, desenho e alvo; o `pointerup` solta os pingos e eles saem. O teste das animações
sem fim (`phases.test.tsx`) ganha a `faisca-carimbo` (11).

## Tarefa 2 (§6.2): a faixa do centro e a lápide

**Arquivos:** `src/ui/table/CenterBand.tsx`, `src/styles.css`. O `GraveyardDialog.tsx` não muda (o gatilho mora na faixa).

- **A faixa vira uma grade de três colunas** (`1fr auto 1fr`): a situação da rodada à esquerda, o monte e o cemitério no centro, o
  treino/replay à direita (online, a direita fica vazia: o relógio mora no placar).
- **O monte:** uma pilha de até três versos (o xadrez de tinta e papel do verso de cordel; vazio, um contorno tracejado), com "Monte" e o
  número ao lado, na fonte de texto. `data-monte` fica no conjunto.
- **A lápide** é a caixa do cemitério (`data-cemiterio`, `data-soltar`): pedra de topo redondo, com rachas desenhadas, "Cemitério" e a
  conta gravados em papel (contraste ≥ 4,5:1), e a carta do topo encostada, inclinada. A estrutura de acessibilidade é a de hoje: a carta
  é a primeira filha, `aria-hidden`, e o botão cobre a caixa (`after:inset-0`).
  - **[D] A segunda carta é só um canto de papel** atrás da do topo (com 2 ou mais cartas): pôr a carta de verdade criaria outro
    `data-card-id` na mesa, e os voos e as cenas procuram as cartas por ele.
- **A poeira:** quando a conta do cemitério cresce, cinco grãos de poeira sobem do pé da lápide (uma vez, `transform` e `opacity`, com o
  atraso da chegada da carta). Com movimento reduzido, nada.
- **Alturas [D]:** celular ~76 px (era ~56); PC ~96 px (era 68); PC baixo compacto, ≤ 64 px (era 56), para caber em 1366 × 657 sem rolar.
  Os números finais saem das fotos e ficam no diário.

**Testes primeiro (`test/ui/table.test.tsx`, a seção da faixa):** os que existem seguem valendo (nome, texto visível, carta fora do
botão, `min-h-11`); novos: `data-lapide` na caixa, o canto da segunda carta só com 2 ou mais, a pilha do monte (3, 2, 1, vazio), a poeira
quando a conta cresce e a falta dela com movimento reduzido e na montagem.

## Os portões (antes de dar por pronto)

- `pnpm check` e `pnpm e2e` verdes: o E2E de 1366 × 657, o alvo do cemitério (`mobile.spec.ts`) e a rolagem dos campos (`fluidez.spec.ts`).
- As fotos das quatro telas (`e2e/medir-cena.ts`) e a A/B de quadros/s contra a `main` na mesma sessão (≥ 50 com a CPU 4×).
- Um revisor novo (subagente) sobre a branch inteira.
- A memória: as `[D]` e o que a execução decidir no `diario.md` e na §6.3 da spec; o `estado.md` com o próximo passo.
