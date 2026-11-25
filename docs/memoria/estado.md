# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-25.** Só o presente: o histórico dos blocos está no `diario.md` (e no
> `arquivo/`), e o estado longo de antes desta limpeza em `arquivo/estado-ate-2026-11-23.md`. Antes de seguir, confira se não há versão
> mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Em curso: as seis tarefas de 2026-11-25** (`decisoes.md` 2026-11-25 (1) e (2)), na branch `feat/ajustes-2026-11-25` (saída da `main`
  `9ba36c1`). Nada de código ainda. As tarefas: (1) o Confirmar e o Passar no carimbo quadrado; (2) o painel do Equipar centrado, os selos
  sem legenda; (3) o treino que recarregou no celular contra o Difícil (diagnóstico); (4) a mão e as numéricas do Equipar com o canto
  sempre à vista, sem ordenar; (5) a abertura sem título, onda, aura e faíscas, mais curta; (6) os botões de nível com identidade.
- **Fotos das direções, com o autor para escolher** (fora do git, como as anteriores): `docs/superpowers/specs/2026-11-25-equipar-direcoes/`
  (A duas linhas centradas, B uma linha só; `passar-carimbo.png` é de um HTML estático, aproximado; `mao-360-*.png`) e
  `docs/superpowers/specs/2026-11-25-niveis-direcoes/` (A papel com faixa de cor e o rosto do Coringa: feliz, sério, bravo; B a face na cor do
  nível com 1, 2 e 3 naipes). Recomendação levada: A no Equipar; A nos níveis.
- **A árvore tem código de PROTÓTIPO sem commit** (`?dir=` no `EquipPanel` e no `Training`, `data-dir` no `menu.css`, o humor `bravo`): não
  commitar assim. A cópia está em `2026-11-25-equipar-direcoes/prototipo.patch`. Os roteiros das fotos são `packages/web/e2e/*.tmp.ts` (apagar
  no fim). Depois da escolha: um desenho só, sem `?dir`.
- **(3) medição:** `e2e/memoria.tmp.ts` (Chromium 375 × 812, sem acelerar a CPU, `vite preview` na 4174), 13 min de treino contra o Difícil com o
  lado humano passivo (partidas curtas, sem especiais nem cenas raras): heap depois do GC de 4,5 → ~13 MB e estável, nós e animações vivas
  sobem e descem com a partida. Não reproduz a partida longa dele; faltam do autor: iPhone ou Android, navegador, a aparência (Cordel ou deck
  de arte) e como foi a queda (piscou branco, ou puxou a tela para baixo).
- **Próximo passo:** as escolhas do autor (Equipar e níveis) e as respostas da (3); então a spec (o advisor revisa), o plano e o código. A (5)
  já está decidida.
- **Plano dos PRs:** (1), (2) e (4) mexem no `EquipPanel.tsx`: uma branch, em sequência. (5) e (6) pequenas, à parte. (3) só diagnóstico.
- **O que espera o autor:** apagar as branches mescladas (`feat/cura-historico-visitantes`, `feat/ci-salvos`, `feat/regras-4q-reflect`,
  `feat/sem-cordel-escuro`, `feat/fim-faixa`).
- **Do bloco anterior, ainda com o autor:** confirmar se a carta presa era o que ele viu; o arquivamento do `decisoes.md`.

## No ar e na `main`

- **No ar** em `https://jogodocoringa.com.br`: `9ba36c1` (o `/api/health` em 2026-11-25): a `main` inteira, com a regra 7, o
  `STATE_SCHEMA` 7 e o `PROTOCOL_VERSION` 2.

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
  `look` é Cordel. O Cordel Escuro saiu (2026-11-24 (10)): `cordel-escuro` guardado vira o Cordel.
- **Mesa no Feltro:** os materiais são `@utility`; o filete do placar é sombra, não borda (o `expectHudFits`); nada de sombra com desfoque
  grande nem filtro novo nos campos (a Devastação no celular); o rosa do pano com ≥ 4,5 : 1 ao papel; as placas com `text-tinta`.
- **Menus:** o rosa por padrão sem gravar nada (`menuTheme` ausente); o menu da partida, o fim e a dica com a roupa de antes (`useInMenu()`
  falso fora da `MenuScreen`); o CSS do menu fora do `styles.css`.
- **Abertura:** fora do JavaScript inicial (a marca do smoke é `abertura-palco`); pula com clique e tecla; a marca `coringa:abertura =
  pular` só nos E2E; nenhum flash de tela.
- **Mesa e cenas:** a última cena só fica com a cortina da cena (`veil === 'scene'`); a poeira é do `Leaving` e sai da página ao fim; só uma
  carta de verdade na lápide; a faixa do PC com ≤ 70 px; a carta que entra esmaecendo só guarda o alvo `opacity: 1` depois de entrar.
- **Regras:** a chave `stealBuffed` (o Roubo de antes nos replays velhos); `RULES_VERSION` 7, `STATE_SCHEMA` 7, `PROTOCOL_VERSION` 2. A Fortaleza é o nível 4 da zona dos Q (o 3 é o escudo); a coluna dos
  especiais no PC cabe as 4 cartas de um bônus.
- **Equipar:** os destinos são carimbos de tamanho fixo (`.carimbo-destino`), com o nome inteiro no `aria-label`; eles descem de linha,
  nunca encolhem.
- O JavaScript inicial ≤ 200 KB (o smoke).

## Para ver sem esperar no treino

Importe a fixture `packages/web/e2e/fixtures/<nome>.json` para a chave `coringa:partidas`, abra `/partidas/<nome>`, escolha a rodada e
toque "Próximo passo" a partir do passo (com `looks` na partida, ela abre com as aparências gravadas):

| Fixture | Passo (rodada) → o que toca |
|---|---|
| `especiais` | 10 e 11 (3): o J do Bot e o segundo J (o momento) · 35 (9): o Roubo · 51 (13): a Guarda · 78 (17): o ouro de quem lidera, os Q no nível 2 · 85→86: o fim do seu escudo (os 4 Q ficam) · 90 (19): a Fortaleza · 99 (21): os 4 J armados, os 4 Q e a sequência 3 · 110 (24): a sequência 5 · 116→117: a sua Armadilha num Q · 160 (34): a sequência 10 · 166→167: a Devastação do Bot · 168→169 (35): o seu golpe final |
| `absolutos` | rodada 11: o Ataque Absoluto do Bot · rodada 13: a sua Defesa Absoluta · 62→63: o fim do escudo · 97→98: a sua derrota |
| `exodia-devastacao` | 27 (7): a sua Ressurreição · 107 (23) e 182 (37): as do Bot · 210: a Devastação · 236→237 (47–48): a troca de mão depois de 10 rodadas (e o fim do seu escudo) · 331→332: o seu Reflect · 618 (125): os 3 K do Bot · 627→628 (127): a Exódia do Bot |
| `reflect` | 175 e 176 (37): o espelho e o cometa (21 de dano volta, regra 7) · 176: a linha da zona do Reflect · 358 (73): a Devastação refletida · 372→373: a sua derrota |

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
- **O `.claude/launch.json`** (os servidores do preview: `server`, `pnpm dev:server` na 8787, e `web`, `pnpm dev:web` na 5173) fica fora do
  git, de propósito.
