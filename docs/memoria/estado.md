# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-23.** Só o presente: o histórico dos blocos está no `diario.md` (e no
> `arquivo/`), e o estado longo de antes desta limpeza em `arquivo/estado-ate-2026-11-23.md`. Antes de seguir, confira se não há versão
> mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Cinco tarefas da produção** (`decisoes.md` 2026-11-23 (1) a (5); o diário 2026-11-23 (1) e (2)). Branch `feat/ajustes-producao`,
  saída da `main` em `6382a33`, no checkout principal. Design `docs/superpowers/specs/2026-11-23-ajustes-producao-design.md`; plano
  `docs/superpowers/plans/2026-11-23-ajustes-producao.md`.
  - **Feito e commitado:** o deck Cordel Escuro (a versão aprovada, `cca2263`: a geometria do claro, fundo `#2a2a2a` com grão e luz,
    vermelho `#e53935` com degradê no valor; o bot do treino veste o Cordel oposto); os destinos do Equipar em carimbos fixos (`daa453f`);
    o favicon (`9c930f5`); a carta que ficava presa quase transparente (`811c872` e `85b0d7a`); o seletor de deck em 2 × 2 e o `CLAUDE.md`.
  - **A limpeza da memória** (o item 3): este `estado.md` enxuto; o diário antigo no `arquivo/`. O `decisoes.md` (125 KB) só se arquiva
    com o "sim" do autor (a regra é que ele só cresce).
  - **Próximo passo exato:** com o `pnpm e2e` verde, o push e o PR para a `main`; depois o "sim" do merge (dele).
  - **Espera o autor:** confirmar se a carta presa era o que ele viu (ele não disse o momento; o outro suspeito é o `opacity-60` da mão
    travada durante as batidas e o `pending`); o arquivamento do `decisoes.md`; o merge; o deploy.

## No ar e na `main`

- **No ar** em `https://jogodocoringa.com.br`: `5f5821f` (o deploy de 2026-11-18, os menus no Folheto). O `/api/health` devolve a versão.
- **Na `main` e ainda não no ar** (o deploy, `pnpm deploy:server`, é dele): o "Aprender jogando" sem a linha (PR #3), o Coringa do Início
  menor no notebook (PR #4), a mesa no Feltro (PR #5), a abertura sem a logo LUSACAN (PR #6). Este bloco entra junto quando mesclado.
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
