# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-13**, a fatia 3 dos decks (o online) executada e revisada na branch
> `feat/decks-fatia-3`, esperando a CI e o "sim" do autor para o merge.
> Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **A fatia 3 dos decks e raças (o online): executada e revisada, na branch `feat/decks-fatia-3`** ("execute o plano da fatia 3 dos
  decks", o autor, 2026-11-13). Na sala online, cada lado veste a aparência do assento: quem cria leva a do painel do Início, quem entra pelo
  link leva a das preferências; o servidor a grava no assento (normalizada, só quando o corpo traz) e a mensagem `room` a devolve; a sua na
  sala é a que você tinha ao entrar (a preferência mudada depois não vale); a partida online guardada leva `looks`. Com o padrão, nada muda
  (o pedido, o assento e a mensagem são os de antes). Plano `docs/superpowers/plans/2026-11-12-decks-fatia-3.md` (H1 a H7, `decisoes.md`
  2026-11-12 (2)); a execução, as `Ruling:`, a revisão e as armadilhas no `diario.md` 2026-11-13 (1); o que a execução decidiu na §17 da
  spec. `RULES_VERSION`, `STATE_SCHEMA` (6) e `PROTOCOL_VERSION` não mudaram.
  - **Verificado:** `pnpm check` verde (web 2795 testes; JavaScript inicial 183,9 → 184,3 KB); `pnpm e2e` inteiro verde (114, 4 pulados),
    com o teste novo de duas pessoas no `looks.spec.ts`. A revisão da branch inteira (H7, um subagente novo): nenhum Critical nem
    Important, "pronto para merge: sim"; os Minor de comentário e de memória corrigidos (`ead82e5` e o commit desta memória).
  - **Próximo passo exato:** conferir a CI das duas (`check` e `e2e`) no topo da branch (pela API pública do GitHub, com `curl`) e
    levar ao autor o merge (fast-forward da `main` até o topo, como nas fatias 1 e 2); merge só com o "sim" dele. Depois do merge: a CI do
    push da `main`, apagar o ledger `.superpowers/sdd/2026-11-12-decks-fatia-3/` e o deploy (dele), que leva as aparências ao online.
  - **O que não pode regredir:** com o padrão, o corpo do POST é `{ nickname }` (mais o `hp`), o assento não tem a chave `look` e a mensagem
    `room` também não; o assento sem `look` (as salas de antes do deploy) é Cordel, sem erro. O `useTableLooks` é memoizado pelos textos
    do deck e da raça, nunca pelo `seats`. A preferência não entra na mesa online.
- **A fatia 2 dos decks e raças (o dono por lado) está na `main`** ("sim", o autor, 2026-11-12), por fast-forward de `feat/decks-fatia-2`
  até `bb186ef`, com as duas CI verdes (`check` e `e2e`) no topo da branch e no push da `main` (`56efcbc`). No treino com um deck de
  arte, o bot veste o outro deck com o Egípcio (G1); cada lado da mesa, do placar (o retrato do Anúbis), do momento e das cópias das cenas veste o deck do dono, com o verso na
  cor do deck; a partida guardada leva `looks`, e o replay veste as gravadas. Com a aparência padrão nada muda; o tutorial fica em
  Cordel (o online ganhou as aparências na fatia 3, acima). Plano `docs/superpowers/plans/2026-11-12-decks-fatia-2.md` (G1 a G8, `decisoes.md` 2026-11-12 (1)); a
  execução, as `Ruling:`, a revisão (nenhum Critical nem Important; os 6 Minor corrigidos com teste) e as armadilhas no `diario.md`
  2026-11-12 (2); a medição G7 em `notas/medicao-decks-fatia-2.md` (passa nas quatro); o que a execução decidiu na §16 da spec.
  `RULES_VERSION`, `STATE_SCHEMA` e `PROTOCOL_VERSION` não mudaram (só a web mudou).
  - O ledger da fatia foi apagado (as `Ruling:` estão no diário).
  - **O que não pode regredir:** com a preferência padrão, o bot em Cordel (G1), nenhum `img` de carta, o verso de listras sem
    `data-verso-deck` e o `<Coringa>` no placar; o treino em Cordel não grava `looks`. O `LookZone` não põe nó no DOM, e há um provedor
    só. O que chegou mora na loja do `ready.ts`, que o provedor assina (`useSyncExternalStore`); o provedor e o placar só importam
    `loadPack` do `load.ts`. Nos testes, `resetPacks()` no `beforeEach`. As cenas raras (a figura) ficam em cordel.
- **A Devastação com arte não passa no celular** (medida em 2026-11-12, na tomada): 46 e 47 quadros/s com arte, contra 55 do Cordel; no PC,
  50 e 51 contra 50. O perfil: o recálculo de estilo das cartas da mesa inteira, umas 70 vezes na cena, já acontece no Cordel e dobra com a face
  com arte; a imagem numa camada própria foi medida e não muda nada. Tudo em `notas/medicao-decks-fatia-1.md`, seção "Antes da fatia 2", e
  na §15 da spec. **O autor não decidiu o conserto** (a recomendação: um bloco curto que corte esse recálculo, sem segurar o deploy); a fatia 2
  passou pelo portão relativo da G7 (`Esperando o autor`). Na medição A/B da fatia 2 (mais tarde no mesmo dia, a máquina
  mais rápida), a Devastação com arte deu 52 a 360 nas duas builds, contra 57 e 59 do Cordel: a perda segue (`notas/medicao-decks-fatia-2.md`).
- **A fatia 1 dos decks e raças está na `main`** ("Sim, merge", o autor, 2026-11-12), por fast-forward de `feat/decks-fatia-1` até `bf6c335`,
  com as duas CI verdes no topo da branch e no push da `main`. No treino (fora do tutorial) e no replay, a carta veste a aparência escolhida
  (Cordel, Bestiário ou Celestial; Bufão ou Egípcio), a sua dos dois lados; o online fica em Cordel até a fatia 3. Plano
  `docs/superpowers/plans/2026-11-11-decks-fatia-1.md`; a execução, as `Ruling:`, a revisão (0 Critical, 3 Important corrigidos com teste,
  8 Minor adiados) e as armadilhas no `diario.md` 2026-11-11 (1); a medição em `notas/medicao-decks-fatia-1.md` (a F5 passou na troca de mão,
  no limite no PC: 50 quadros/s com arte contra 56 do Cordel; **mas a Devastação, medida depois, não passa no celular**: o item dela acima); o que
  a execução decidiu na §15 da spec. O ledger da fatia foi apagado.
  `RULES_VERSION`, `STATE_SCHEMA` e `PROTOCOL_VERSION` não mudaram.
- **O bloco C está na `main`** (pontos 10, 11 e 13: a aura da iniciativa, os bônus em escala, o ouro de quem lidera), por fast-forward de
  `feat/playtest-bloco-c` até `21d1387`, com as duas CI verdes (`check` e `e2e`) no topo do código (`75d35c8`) e no push da `main`
  (`21d1387`). Plano `docs/superpowers/plans/2026-11-08-playtest-bloco-c.md`; a revisão da branch inteira e a segunda, só das correções
  (nenhum Critical nem Important), os rulings e os menores adiados no `diario.md` 2026-11-08 (1); a medição em `notas/medicao-bloco-c.md`;
  o que a execução decidiu na §5.4 da spec do playtest. `STATE_SCHEMA` 6, `RULES_VERSION` 5 (igual). O ledger do bloco foi apagado.
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app) e o `jogar-treino.bat` do autor.

## Fila

- **A arte pintada dos decks**, quando o autor quiser: segue a bíblia de arte (`docs/superpowers/specs/2026-11-11-biblia-de-arte.md`).
- **Bloco D** (pontos 5 e 14, spec do playtest §6: os botões de carimbo e o 14), com plano escrito e aprovado pelo autor antes da execução,
  como os blocos A, B, C e E.

## Esperando o autor

- **O merge da fatia 3 dos decks** (`feat/decks-fatia-3`), com as duas CI verdes no topo: o "sim" é dele.
- **Jogar a fatia 3** depois do deploy: uma sala online com cada um num deck de arte (os dois lados, os versos, os retratos, o replay da
  partida online com as aparências).
- **A Devastação com arte no celular** (46 e 47 quadros/s, a meta é 50): consertar (a recomendação: um bloco curto para cortar o recálculo
  de estilo da mesa inteira, que ajuda o Cordel também) ou não. A fatia 2 passou pela G7 e já está na `main`. Não segura o deploy: só sente
  quem escolheu um deck de arte, no celular, nessa cena.
- **Jogar a fatia 2 dos decks** no treino, com um deck de arte: o bot no outro deck, com o Egípcio; os versos e o retrato dele; o
  replay com as aparências gravadas.
- **O deploy** (`pnpm deploy:server`, só ele), agora que o bloco C está na `main`: fecha as salas online abertas (`STATE_SCHEMA` 6), e as
  partidas guardadas de antes abrem com o aviso de versão (`RULES_VERSION` 5).
- **Jogar** os blocos A, B, C e E e as placas novas. O treino mostra tudo; o online só depois do deploy. As frases novas das placas são de
  quem escreveu (ele aprovou corrigir, não as palavras): conferir no playtest.
- **Jogar a fatia 1 dos decks** no treino (o painel "Aparência" no Início e no menu da partida) e dizer se serve para os testes (a §14 da
  spec). As fotos de conferência estão em `.superpowers/fotos-decks-fatia-1/` (nesta máquina, fora do git). Os 8 Minor adiados da revisão
  entraram na fatia 2 (G5).
- **A config do pnpm desta máquina:** o `%LOCALAPPDATA%\pnpm\config\config.yaml` tem `storeDir: D:.pnpm-store` (sem a barra), e o `pnpm add`
  falha; o `node_modules` usa `D:\.pnpm-store\v11`. Até corrigir, passe `--store-dir 'D:\.pnpm-store'`.
- **Achado da medição do bloco C:** a virada de rodada depois de uma sequência longa (`exodia-devastacao.json` 236→237) fica a 42 e 48
  quadros/s com a CPU 4×, abaixo da meta de 50; a `main` sem o bloco C já media 41 e 47. Fora dos blocos; a decisão de atacar é dele.
  **[I]** Na tomada, na medição da fatia 1 (2026-11-11), a mesma troca de mão deu 56 e 58 no Cordel: o achado do bloco C deve ter sido
  medido com a CPU mais lenta (a bateria). Conferir na tomada antes de atacar.
- **Menores adiados** (nenhum quebra o jogo): bloco C no `diario.md` 2026-11-08 (1) ("Adiados"); bloco B no 2026-11-07 (2) ("Menores, para
  depois"); bloco A no 2026-11-03 (6) ("menores").
- **O resto** (o que olhar no playtest por fatia e bloco, as leituras [I] por confirmar, o Roubo fraco, o que só ele pode fazer: proteção da
  `main`, `wrangler login`, branches remotas velhas): `notas/playtest.md`.

## Para ver sem esperar no treino

Importe a fixture `packages/web/e2e/fixtures/<nome>.json` para a chave `coringa:partidas`, abra `/partidas/<nome>`, escolha a rodada e
toque "Próximo passo" a partir do passo:

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
- Sem Python na máquina, e heredoc grande no shell quebra (crase, aspas): para editar vários arquivos, um script `.mjs` rodado com `node`.
- **Tire fotos:** o jsdom não tem layout. O `packages/web/e2e/medir-cena.ts` tira as fotos e mede com a CPU 4× (uso no começo dele); para
  fotos de outro jeito, um spec temporário com uma config que importa o `playwright.config.ts` (a CSP barra `<style>` injetado: mude o
  estilo pelo CSSOM).
- Um E2E que mede um elemento animado mede no meio da animação: espere `el.getAnimations()` antes (`e2e/power.spec.ts`, `expectInside`).
- Em `test/ui`, todo teste é `.test.tsx` (o Vitest da web não roda `.test.ts` ali, e nada avisa). O `animation.test.tsx` usa a sonda
  `installFlashProbe`. Uma marca que dura menos de meio segundo escapa do `toHaveCount`: quem procura é a página, a cada quadro.
- O ledger `.superpowers/sdd/…` fica fora do git: vale o `diario.md` e o `git log` (regra 6 do `CLAUDE.md`).

## Ambiente (máquina do autor)

- Node 26.13 e pnpm 11.9. Sem `gh`, sem a CLI `claude`, sem Python. A CI se lê pela API pública do GitHub, com `curl`.
- E2E: `pnpm --filter @coringa/web exec playwright install chromium` na primeira vez.
- **Workerd (paliativo; a correção é do autor):** o VC++ Redistributable desta máquina é de 2020 (14.28) e derruba o `workerd.exe`. As
  DLLs `msvcp140.dll`, `vcruntime140.dll` e `vcruntime140_1.dll` do Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\156.0.4314.50\`)
  estão copiadas em `node_modules/.pnpm/@cloudflare+workerd-windows-64@1.20261012.1/node_modules/@cloudflare/workerd-windows-64/bin/`. Um
  `pnpm install` que troque o workerd perde o paliativo. A correção: instalar o VC++ x64 mais recente
  (`https://aka.ms/vs/17/release/vc_redist.x64.exe`) e apagar as três DLLs.
- **Worktrees:** `D:\andr3\jogo-coringa` (o principal); `.claude/worktrees/inspiring-sammet-387417` (`feat/ajustes`, da conta anterior) e
  `.claude/worktrees/youthful-elgamal-3d5e8a` (de 2026-11-02, talvez de uma sessão do app: não apague). Uma pasta de worktree com
  `node_modules` que o `git worktree remove` não apaga ("Filename too long") sai no PowerShell com
  `Remove-Item -LiteralPath ('\\?\' + $p) -Recurse -Force`.
- **Branches:** as locais estão mescladas na `main` (a `feat/playtest-bloco-c` em 2026-11-11 e a `feat/decks-fatia-1` em 2026-11-12), menos a `feat/online-equipar-vazio`
  (um rebase não publicado; o autor pode apagá-la) e a `feat/decks-fatia-2` (a fatia em curso, já no GitHub: o plano aprovado, sem código).
  As remotas velhas, mescladas, são do autor (`notas/playtest.md`).
- O `jogar-treino.bat` na raiz é o lançador do autor: não mexer nem commitar.
