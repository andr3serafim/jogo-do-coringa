# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-10**, o bloco C feito, revisado e na branch, antes do merge. Antes de seguir, confira
> se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Em curso: o bloco C** (pontos 10, 11 e 13: a aura da iniciativa, os bônus em escala, o ouro de quem lidera), na branch
  `feat/playtest-bloco-c` (saída da `main` em `792bd62`), no checkout principal. Plano `docs/superpowers/plans/2026-11-08-playtest-bloco-c.md`,
  aprovado como estava (`decisoes.md` 2026-11-08 (2)). As cinco tarefas estão feitas; a revisão da branch inteira (subagente) foi "com
  correções", e tudo foi corrigido com teste (`f6cf1f9`, `2331e02`, `972e890`, `6df073d`). O autor aceitou a medição como está
  (`decisoes.md` 2026-11-10 (1)). Tudo, com os rulings e os menores adiados, no `diario.md` 2026-11-08 (1); a medição em
  `notas/medicao-bloco-c.md`; o que a execução decidiu na §5.4 da spec do playtest. `STATE_SCHEMA` 6, `RULES_VERSION` 5 (igual).
- **Próximo passo exato:**
  1. **Ler a CI** do topo da branch (subiu na passagem de 2026-11-10), os dois jobs, pela API pública:
     `curl -s "https://api.github.com/repos/andr3serafim/jogo-do-coringa/actions/runs?branch=feat/playtest-bloco-c&per_page=3"` (o
     `head_sha` tem de ser o topo; depois `.../runs/<id>/jobs`). Em 2026-11-09 o `pnpm e2e` local deu **101 passed, mas saiu com código 1**,
     sem teste falho listado. Se o job `e2e` da CI passar, segue; se falhar, rode aqui (`pnpm --filter @coringa/web build` e `pnpm e2e`,
     em segundo plano, ~10 min) e ache a causa no relatório inteiro (teste instável? erro fora dos testes?).
  2. **A segunda revisão, só das correções** (`81697a6..6df073d`), num subagente novo: foi interrompida pelo limite de uso. Foco: a
     extração do `useLandingHold`/`withoutCards` para `ui/table/landing-hold.ts` (agora tira também a Guarda); as `Zones` com o
     `anim.insignia` na Defesa Absoluta da zona; o `useLead` que devolve `null`; o sopro da iniciativa com o ref `played`. Critical ou
     Important: corrigir com teste antes.
  3. **O merge:** com as duas CI verdes no topo, `git merge-base --is-ancestor main HEAD`, `git branch -f main HEAD` e o push das duas
     (o pre-push roda o `pnpm check`).
  4. **Fechar:** o `estado.md` com "nada em curso" e a fila só com o bloco D; apagar `.superpowers/sdd/2026-11-08-playtest-bloco-c` (o
     ledger, fora do git: os rulings já estão no diário).
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app) e o `jogar-treino.bat` do autor.

## Fila

- **Bloco D** (pontos 5 e 14, spec do playtest §6: os botões de carimbo e o 14), com plano escrito e aprovado pelo autor antes da execução,
  como os blocos A, B, C e E.

## Esperando o autor

- **O deploy** (`pnpm deploy:server`, só ele), de preferência depois do merge do bloco C: fecha as salas online abertas (`STATE_SCHEMA` 6),
  e as partidas guardadas de antes abrem com o aviso de versão (`RULES_VERSION` 5).
- **Jogar** os blocos A, B, C e E e as placas novas. O treino mostra tudo; o online só depois do deploy. As frases novas das placas são de
  quem escreveu (ele aprovou corrigir, não as palavras): conferir no playtest.
- **Achado da medição do bloco C:** a virada de rodada depois de uma sequência longa (`exodia-devastacao.json` 236→237) fica a 42 e 48
  quadros/s com a CPU 4×, abaixo da meta de 50; a `main` sem o bloco C já media 41 e 47. Fora dos blocos; a decisão de atacar é dele.
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
- **Branches:** as locais estão mescladas na `main`, menos a `feat/online-equipar-vazio` (um rebase não publicado; o autor pode apagá-la)
  e a `feat/playtest-bloco-c` (em curso). As remotas velhas, mescladas, são do autor (`notas/playtest.md`).
- O `jogar-treino.bat` na raiz é o lançador do autor: não mexer nem commitar.
