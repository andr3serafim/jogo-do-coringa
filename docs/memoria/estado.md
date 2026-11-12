# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-11**, a fatia 1 dos decks em curso (Task 0). Antes de seguir, confira se não há versão
> mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Em curso: a fatia 1 dos decks e raças**, na branch `feat/decks-fatia-1` (saída da `main` em `fe9a507`), no checkout principal. Plano
  `docs/superpowers/plans/2026-11-11-decks-fatia-1.md`, aprovado (`decisoes.md` 2026-11-11 (3)); "prossiga por aqui" (o autor, 2026-11-11)
  começou a execução: aqui mesmo, tarefa por tarefa, teste primeiro, com um revisor novo no fim (F7). O andamento, com as `Ruling:` de cada
  tarefa, vai no `diario.md` 2026-11-11 (1).
- **Task 6 em curso** (retomada depois da pausa: "Tente novamente"). As Tasks 0 a 5 estão feitas e commitadas (o JavaScript inicial foi de
  179,9 para 182,7 KB). Da Task 6: o smoke (passa e reprova um `.webp` no `index.html`), o `e2e/looks.spec.ts` (3 de 3, com o clique no
  rótulo do rádio) e o `MEDIR_APARENCIA` do `e2e/medir-cena.ts` estão commitados. Nada subiu ainda.
- **Próximo passo exato:**
  1. **A medição (F5)**, com a web construída: `exodia-devastacao` em dois passos, o do plano (`MEDIR_RODADA=7 MEDIR_PASSO=27 MEDIR_MS=4600`) e
     a mesa mais cheia dela (`MEDIR_RODADA=47 MEDIR_PASSO=236 MEDIR_MS=3000`, o 236→237 do bloco C), cada um sem `MEDIR_APARENCIA`, com
     `bestiario:egipcio` e com `celestial:egipcio`; a tabela e o veredito em `docs/memoria/notas/medicao-decks-fatia-1.md`.
  2. **As fotos** para o autor (fora do repositório): a mesa do treino a 360 × 640 e a 1366 × 657 com as duas aparências, a mão, o
     cemitério, as minis e o painel "Aparência"; conferir o Pégaso e o Arcanjo e as minis de 30 px.
  3. `pnpm check` e `pnpm e2e` inteiros; a documentação (o `CLAUDE.md`, a seção "O que a execução decidiu (fatia 1)" na spec, o diário);
     subir a branch; o PR; o revisor novo (F7) e as correções.
- **O bloco C está na `main`** (pontos 10, 11 e 13: a aura da iniciativa, os bônus em escala, o ouro de quem lidera), por fast-forward de
  `feat/playtest-bloco-c` até `21d1387`, com as duas CI verdes (`check` e `e2e`) no topo do código (`75d35c8`) e no push da `main`
  (`21d1387`). Plano `docs/superpowers/plans/2026-11-08-playtest-bloco-c.md`; a revisão da branch inteira e a segunda, só das correções
  (nenhum Critical nem Important), os rulings e os menores adiados no `diario.md` 2026-11-08 (1); a medição em `notas/medicao-bloco-c.md`;
  o que a execução decidiu na §5.4 da spec do playtest. `STATE_SCHEMA` 6, `RULES_VERSION` 5 (igual). O ledger do bloco foi apagado.
- **Sem commit, de propósito:** o `.claude/launch.json` (o servidor `web` do preview do app) e o `jogar-treino.bat` do autor.

## Fila

- **Decks e raças do Coringa, depois da fatia 1** (`decisoes.md` 2026-11-10 (2) e 2026-11-11 (1) a (3)): três decks (Cordel, Bestiário,
  Celestial) e duas raças (Bufão, Egípcia), a aparência de cada lado da mesa pelo dono, também no online. Os planos das fatias 2 (o dono por
  lado) e 3 (o online) vêm depois da fatia 1, cada um aprovado antes da execução. A arte pintada, quando o autor quiser, segue a bíblia de
  arte (`docs/superpowers/specs/2026-11-11-biblia-de-arte.md`).
- **Bloco D** (pontos 5 e 14, spec do playtest §6: os botões de carimbo e o 14), com plano escrito e aprovado pelo autor antes da execução,
  como os blocos A, B, C e E.

## Esperando o autor

- **O deploy** (`pnpm deploy:server`, só ele), agora que o bloco C está na `main`: fecha as salas online abertas (`STATE_SCHEMA` 6), e as
  partidas guardadas de antes abrem com o aviso de versão (`RULES_VERSION` 5).
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
- **Branches:** as locais estão mescladas na `main` (a `feat/playtest-bloco-c` também, em 2026-11-11), menos a `feat/online-equipar-vazio`
  (um rebase não publicado; o autor pode apagá-la). As remotas velhas, mescladas, são do autor (`notas/playtest.md`).
- O `jogar-treino.bat` na raiz é o lançador do autor: não mexer nem commitar.
