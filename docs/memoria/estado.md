# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-23.** Só o presente: o histórico dos blocos está no `diario.md` (e no
> `arquivo/`), e o estado longo de antes desta limpeza em `arquivo/estado-ate-2026-11-23.md`. Antes de seguir, confira se não há versão
> mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Cinco tarefas novas** (`decisoes.md` 2026-11-23 (7)): o histórico em branco, a cura passiva explicada, as placas em figura, o "+N"
  mais visível e os visitantes. Branch `feat/cura-historico-visitantes`, saída da `main` em `14adfff`, no checkout principal. Nada de
  código ainda (brainstorming; o advisor revisa spec, plano e implementação).
  - **Achado do histórico:** no tema verde, a linha de `/partidas` (`PastGames.tsx`, `Row`) é `bg-papel` sem cor de texto e herda o
    `--menu-texto` (papel). Conserto: `text-tinta` na linha; o mesmo no `Lobby.tsx` (linhas 143 e 157). Um teste que reprove o verde.
  - **Como a cura aparece hoje** (fixture `especiais`, rodada 29, passo 137→138: o 7♥ cai da sua Defesa, 3 Q, +28): o "+28" pequeno sob o
    retrato, ~1 s; o trecho verde da barra; os K da Guarda acendem de leve; a linha "Você curou 28 pela Defesa". Nada liga a carta que cai à
    vida. A cura também vem do Roubo (`Healed.source`).
  - **Respostas dele** (`decisoes.md` 2026-11-23 (8)): a carta que cai vira vida **e** o "+N" maior, junto da barra; placas só com a
    figura (o texto ao passar o mouse, focar ou tocar); visitantes fora (painel da Cloudflare). O Reflect nas figuras: sem resposta.
  - **Protótipo das direções:** `docs/superpowers/specs/2026-11-23-cura-direcoes/` (A · Seiva, B · Gotas, C · Coração, e as placas;
    `LEIAME.md` diz como abrir: a cópia em `packages/web/public/tmp-cura/`, fora do git pelo `.git/info/exclude`).
  - **Achados do advisor, conferidos:** a cura para na vida inicial (`heal` em `combat.ts`: `Healed.amount` é o que entrou; o bruto é
    `defenseHealOf`); o Roubo cura o valor × o bônus da fileira **do oponente** de onde a carta sai (`stealAmount`); com uma decisão
    esperando, a linha do tempo inteira cabe em 1 s (`DECISION_CAP_MS`), por isso a cura de hoje quase não aparece. Para a cura ter tempo,
    ela sai do teto como as cenas, com a folga do relógio na tabela do protocolo (`SCENE_MS`, lida pelo servidor e pela web). O
    `Lobby.tsx:172` (`bg-ouro` sem cor de texto) também sofre no verde.
  - **Respostas** (`decisoes.md` 2026-11-23 (9)): a direção A; o bruto no carimbo e o líquido na vida; a cura do oponente igual; o tempo
    aceito; o Reflect também só figura; o histórico consertado, vitória em verde e derrota em vermelho ("tipo CS2").
  - **Spec escrita** (rascunho): `docs/superpowers/specs/2026-11-23-cura-placas-historico-design.md`; as fotos do histórico em
    `2026-11-23-cura-direcoes/prancha-historico.png` (1 · Faixa, 2 · Selo).
  - **Spec aprovada** (`decisoes.md` 2026-11-23 (10)): com som de cura; histórico na opção 1 · Faixa; a cura toca com a vida cheia.
  - **Plano:** `docs/superpowers/plans/2026-11-23-cura-placas-historico.md` (9 tarefas).
  - **Execução:** nativa com o advisor depois das tarefas 3, 6 e 8 (escolha do autor). Ledger fora do git em
    `.superpowers/sdd/2026-11-23-cura-placas-historico/progress.md`; o diário leva as `Ruling:`.
  - **Feito:** Tarefa 1 (o histórico e o Lobby legíveis no verde; vitória e derrota em cor; `e2e/menu-verde.spec.ts`; a Duda do
    `online.spec.ts` no verde); Tarefa 2 (`HEAL_MS` = 1.400 e `healsMs` na `stepAllowanceMs`: o servidor, a web e o Bot
    do treino dão folga a cada `Healed`); Tarefa 3 (`engine/test/heal-gross.test.ts`: as Q de quem cura não mudam depois do
    `Healed` no mesmo passo, nas 11 de referência e em 90 sorteadas).
  - **Advisor nas tarefas 1 a 3:** feito; os reforços (a Duda no verde conferida, a medição do contraste, as Q antes e depois) neste
    commit. O diário 2026-11-23 (3) tem as `Ruling:`.
  - **Feito:** tarefas 4 e 5 num commit (a batida `heal` sem teto, o `HealFx` com o bruto, a conta e a origem; a vida conta na chegada
    da gota, pela marca própria `healArrived`; o brilho na barra e o pulso do número). O "+N" sob o retrato some ao vivo: o carimbo é da
    Tarefa 6.
  - **Feito:** Tarefa 6 (`ui/anim/Heal.tsx`, a `HealLayer` no `FxLayer`: a origem acende, a gota sobe com o rastro, as faíscas e o carimbo
    "+28 · 7♥ × 4" sob a barra, que fica 1,2 s além da batida; a essência antiga do `Leaving` saiu). Vista no replay (PC e celular).
  - **Advisor nas tarefas 4 a 6:** feito (consertos em `67b6de7`). O `pnpm e2e` completo depois da Tarefa 6: 133 verdes, 4 pulados.
  - **Feito:** Tarefa 7 (`cabdf72`, o som `cura`); Tarefa 8 (`8f86965`, as marcas e o Reflect só com a figura, `MarkFigure` e a dica;
    o `StatePlate` saiu; a regra do `data-sem-pulo` no `CLAUDE.md`). E2E de layout, celular e treino verdes depois da 8.
  - **Advisor nas tarefas 7 e 8:** feito (a dica não fecha quando o histórico rola: `b0e8a02`).
  - **Tarefa 9 em curso:** fotos finais em `docs/superpowers/specs/2026-11-23-cura-direcoes/final/`; a cópia `public/tmp-cura` apagada.
  - **Medição A/B (CPU 4×, mesma sessão, 2 repetições):** a cura da branch fica igual ou acima da `main` (com arte: 33 a 41 contra 34 a 40
    quadros/s; Cordel: 40 a 48 contra 39 a 45) e acima da Devastação de hoje com arte no celular (40 a 44). A Devastação não mudou. A primeira
    rodada saiu inválida (1 a 2 quadros/s nos dois lados: a máquina com 6% de bateria, estrangulada); refeita depois de uma sonda normal.
  - **Feito:** o `CLAUDE.md`, o `LEIAME.md`, o `pnpm e2e` completo (verde depois da troca do seletor do `resurrection.spec.ts`), a revisão
    final do advisor (o conserto do carimbo no `resync` do replay; ver o diário 2026-11-23 (3)).
  - **PR #8 aberto** (https://github.com/andr3serafim/jogo-do-coringa/pull/8), com o Auto-fix ligado. Depois de jogar, o autor pediu dois
    ajustes (`decisoes.md` 2026-11-23 (11): o som só no enchimento da vida e o medalhão da cura do tamanho do disco do ataque), feitos e
    enviados no PR.
  - **Próximo passo exato:** esperar o autor. Já entregue a ele: as pranchas de `final/`, a lista das
    `Ruling:` do diário 2026-11-23 (3) e o menor adiado (o `aria-expanded`), e pedir que teste no treino antes do merge.
- **Do bloco anterior, ainda com o autor:** confirmar se a carta presa era o que ele viu; o arquivamento do `decisoes.md`; o deploy (leva
  o PR #7 e os PRs #3 a #6).

## No ar e na `main`

- **No ar** em `https://jogodocoringa.com.br`: `5f5821f` (o deploy de 2026-11-18, os menus no Folheto). O `/api/health` devolve a versão.
- **Na `main` e ainda não no ar** (o deploy, `pnpm deploy:server`, é dele): o bloco de 2026-11-23 (PR #7), o "Aprender jogando" sem a linha (PR #3), o Coringa do Início
  menor no notebook (PR #4), a mesa no Feltro (PR #5), a abertura sem a logo LUSACAN (PR #6).
- **Online depois do deploy:** o `cordel-escuro` só vale na sala depois do deploy; antes, o servidor o normaliza para o Cordel, sem erro.

## Pendências abertas (fora deste bloco)

- **A `feat/intro-dragao-frente`** (o vídeo do dragão para a logo, parada) e a pasta solta `docs/superpowers/specs/2026-11-19-intro-lusacan/`
  (não versionada): sem objeto desde que a logo saiu da abertura (`decisoes.md` 2026-11-19 (6)); o autor diz se apaga.
- **A Devastação com arte no celular** perde quadros (46 a 52 contra 55 a 59 do Cordel; `notas/medicao-decks-fatia-1.md` e
  `notas/medicao-decks-fatia-2.md`): o autor não decidiu o conserto (a proposta: cortar o recálculo de estilo das cartas da mesa).
- **Achado de 2026-11-23, não mexido:** a carta de rascunho do Equipar nas fileiras mostra `opacity: 1` inline (o `layoutId` do Motion),
  e o `opacity-70` dela não vale.
- **Não visto no navegador:** a sala de espera (Lobby) com a roupa do Folheto (precisa do `wrangler dev`); os E2E online passam por ela.
- **Menores adiados** (nenhum quebra o jogo): bloco D no `diario.md` 2026-11-14 (2); bloco C no `arquivo/` (2026-11-08 (1)); blocos A e B
  também no `arquivo/`. O resto do que olhar no playtest e o que só ele pode fazer (proteção da `main`, `wrangler login`, branches remotas
  velhas): `notas/playtest.md`.
- **Fora da fila, a pedido:** a arte pintada dos decks, quando ele pedir (a bíblia de arte, `docs/superpowers/specs/2026-11-11-biblia-de-arte.md`).

## O que não pode regredir

- **Aparências:** com a preferência padrão, nenhum `img` de carta e o `<Coringa>` no placar; o `LookZone` não põe nó no DOM, há um
  provedor só, e o que chegou mora na loja do `ready.ts` (`useSyncExternalStore`); o `useTableLooks` memoizado pelos textos do deck e da
  raça, nunca pelo `seats`; no online, com o padrão, o POST é `{ nickname }` (mais o `hp`) e o assento não tem `look`; o assento sem
  `look` é Cordel. O Cordel Escuro tem o valor e o naipe do mesmo tamanho e lugar que o claro, e nada de filtro nem sombra desfocada.
- **Mesa no Feltro:** os materiais são `@utility`; o filete do placar é sombra, não borda (o `expectHudFits`); nada de sombra com desfoque
  grande nem filtro novo nos campos (a Devastação no celular); o rosa do pano com ≥ 4,5 : 1 ao papel; as placas com `text-tinta`.
- **Menus:** o rosa por padrão sem gravar nada (`menuTheme` ausente); o menu da partida, o fim e a dica com a roupa de antes (`useInMenu()`
  falso fora da `MenuScreen`); o CSS do menu fora do `styles.css`.
- **Abertura:** fora do JavaScript inicial (a marca do smoke é `abertura-palco`); pula com clique e tecla; a marca `coringa:abertura =
  pular` só nos E2E; nenhum flash de tela.
- **Mesa e cenas:** a última cena só fica com a cortina da cena (`veil === 'scene'`); a poeira é do `Leaving` e sai da página ao fim; só uma
  carta de verdade na lápide; a faixa do PC com ≤ 70 px; a carta que entra esmaecendo só guarda o alvo `opacity: 1` depois de entrar.
- **Regras:** a chave `stealBuffed` (o Roubo de antes nos replays velhos); `RULES_VERSION` 6, `STATE_SCHEMA` 6.
- **Equipar:** os destinos são carimbos de tamanho fixo (`.carimbo-destino`), com o nome inteiro no `aria-label`; eles descem de linha,
  nunca encolhem.
- O JavaScript inicial ≤ 200 KB (o smoke).

## Para ver sem esperar no treino

Importe a fixture `packages/web/e2e/fixtures/<nome>.json` para a chave `coringa:partidas`, abra `/partidas/<nome>`, escolha a rodada e
toque "Próximo passo" a partir do passo (com `looks` na partida, ela abre com as aparências gravadas):

| Fixture | Passo (rodada) → o que toca |
|---|---|
| `especiais` | 10 e 11 (3): o J do Bot e o segundo J (o momento) · 35 (9): o Roubo · 51 (13): a Guarda · 78 (17): o ouro de quem lidera, os Q no nível 2 · 99 (21): os 4 J armados e a sequência 3 · 109 (23): a Armadilha · 111 (24): a sequência 5 · 137 (29): a sua cura passiva · 161 (34): a sequência 10 · 174 (37): os 3 K · 178→179: o seu golpe final |
| `absolutos` | rodada 11: o Ataque Absoluto do Bot · rodada 13: a sua Defesa Absoluta · 99→100: a sua derrota |
| `exodia-devastacao` | 27 (7): a sua Ressurreição · 107 (23) e 182 (37): as do Bot · 210: a Devastação · 236→237 (47–48): a troca de mão depois de 10 rodadas · 407: a Exódia do Bot |
| `reflect` | 175 e 176 (37): o espelho e o cometa · 176: a linha da zona do Reflect · 358 (73): a Devastação refletida |

## Para quem assumir

- Um `wrangler dev` do autor pode estar na 8787: o Playwright o reaproveita e o E2E falha. Com ele aberto, rode o E2E pela CI ou troque a
  porta (`MEDIR_PORTA` no `medir-cena.ts`; para o E2E inteiro, a receita está no `arquivo/diario-ate-2026-11-02.md`, 2026-11-02 (8)).
- Não edite nada enquanto o pre-push roda.
- **Ao levar ao autor um caso de borda:** passos numerados e um exemplo de mesa, curto, com a proposta numa linha à parte.
- **Ao levar ao autor um visual:** fotos do jogo de verdade (dev server ou `medir-cena.ts`), mais de uma direção, e só a escolhida vira
  código.
- **Crases no shell executam** (`node -e "…"` com crases rodou `pnpm check` e `pnpm e2e` de verdade em 2026-11-14, e quase de novo em
  2026-11-23): texto com crases (memória, specs, CSS com comentário) só pelo Edit ou por um arquivo gravado e rodado com `node`. Sem Python
  na máquina.
- **Tire fotos:** o jsdom não tem layout. O `packages/web/e2e/medir-cena.ts` tira as fotos e mede com a CPU 4× (uso no começo dele); para
  fotos rápidas, um `.mjs` com o Playwright contra o dev server (exemplos em `docs/superpowers/specs/2026-11-23-cordel-escuro-direcoes/`).
- Um E2E que mede um elemento animado mede no meio da animação: espere `el.getAnimations()` antes (`e2e/power.spec.ts`, `expectInside`).
- Em `test/ui`, todo teste é `.test.tsx` (o Vitest da web não roda `.test.ts` ali, e nada avisa). O `animation.test.tsx` usa a sonda
  `installFlashProbe`. Uma marca que dura menos de meio segundo escapa do `toHaveCount`: quem procura é a página, a cada quadro.
- O ledger `.superpowers/sdd/…` fica fora do git: vale o `diario.md` e o `git log` (regra 6 do `CLAUDE.md`).
- **Para achar quem mexe no estilo das cartas:** o perfil do `medir-cena.ts` (`MEDIR_PERFIL=1`) diz quanto custa; um `MutationObserver` no
  `[data-palco]` com `attributeFilter: ['style']` diz quem. Detalhes em `notas/medicao-devastacao-estilo.md`.
- **A medição varia entre sessões:** só a A/B na mesma sessão decide (`git checkout --detach <main>` com a árvore limpa, medir, voltar).
- **Ruído conhecido no ar:** o console mostra o `beacon.min.js` da Cloudflare Web Analytics barrado pela CSP. Não afrouxe a CSP por ele.

## Ambiente (máquina do autor)

- Node 26.13 e pnpm 11.9 (`storeDir: D:\.pnpm-store`). O `gh` está instalado e logado. Sem a CLI `claude`, sem Python.
- E2E: `pnpm --filter @coringa/web exec playwright install chromium` na primeira vez.
- **Workerd (paliativo; a correção é do autor):** o VC++ Redistributable desta máquina é de 2020 (14.28) e derruba o `workerd.exe`. As
  DLLs `msvcp140.dll`, `vcruntime140.dll` e `vcruntime140_1.dll` do Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\156.0.4314.50\`)
  estão copiadas em `node_modules/.pnpm/@cloudflare+workerd-windows-64@1.20261012.1/node_modules/@cloudflare/workerd-windows-64/bin/`. Um
  `pnpm install` que troque o workerd perde o paliativo. A correção: instalar o VC++ x64 mais recente
  (`https://aka.ms/vs/17/release/vc_redist.x64.exe`) e apagar as três DLLs.
- **Worktrees:** só o principal, `D:\andr3\jogo-coringa`. Um worktree novo não traz as DLLs do paliativo: copie-as do principal. Uma pasta
  de worktree que o `git worktree remove` não apaga ("Filename too long") sai no PowerShell com
  `Remove-Item -LiteralPath ('\\?\' + $p) -Recurse -Force`.
- **Branches:** quase todas as locais e remotas `feat/*` já estão mescladas na `main`; o autor pode apagá-las. Fora delas: a
  `feat/intro-dragao-frente` (parada, acima) e a `feat/online-equipar-vazio` (um rebase não publicado).
- **O `.claude/launch.json`** (o servidor `web` do preview, `pnpm dev:web` na 5173) fica fora do git, de propósito.
