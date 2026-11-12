# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-11-12**, a execução da fatia 2 dos decks começou (Task 0). Antes de
> seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **A fatia 2 dos decks (o dono por lado): em execução** desde 2026-11-12, numa sessão nova do Claude Code ("execute o plano da fatia 2 dos
  decks", o autor), inline (`superpowers:executing-plans`), tarefa por tarefa, teste primeiro. **Feitas: as Tasks 0 a 5. Em curso: a Task 6** (feito: o E2E `looks.spec.ts`, 6 de 6, e as fotos, em `.superpowers/fotos-decks-fatia-2/`; em curso: a medição G7 na tomada, com os números em `.superpowers/medicao-decks-fatia-2/`; falta: o `pnpm e2e` inteiro, a documentação; depois o revisor)
  (o replay com as aparências gravadas, G3, e o `medir-cena.ts` gravando `looks` na partida da fixture). O andamento de cada tarefa, com as `Ruling:`, vai no `diario.md` 2026-11-12 (2). O ledger
  está em `.superpowers/sdd/2026-11-12-decks-fatia-2/` (fora do git). Quem assumir: retome na primeira tarefa sem "feita" no diário.
- **O plano aprovado:** "Aprovo como está mas irei implementar em outra sessão"
  (o autor, 2026-11-12; `decisoes.md` 2026-11-12 (1)): as escolhas G1 a G8 como recomendadas.
  - **Branch:** `feat/decks-fatia-2`, no checkout principal (`D:\andr3\jogo-coringa`), saída da `main` em `2f2aa51`, já no GitHub. Ela
    só tem documentos: a medição da Devastação, o plano, a memória e as notas na spec que o plano substitui.
  - **Plano:** `docs/superpowers/plans/2026-11-12-decks-fatia-2.md` (Task 0 a Task 6, com o revisor no fim).
  - **Próximo passo exato (a sessão nova):** ler este arquivo, o `decisoes.md` 2026-11-12 (1), o plano inteiro e o `diario.md` 2026-11-12
    (1) e 2026-11-11 (1); depois executar a partir da **Task 0** (a regra 1 do `CLAUDE.md`, a branch, o `pnpm check`), tarefa por tarefa,
    teste primeiro, com a skill `superpowers:executing-plans` (ou a `subagent-driven-development`). A cada tarefa: commit, a `Ruling:` no
    diário, o `estado.md` (regras 2 e 6).
  - **O que não pode regredir** (está no plano; repetido aqui porque quebra calado):
    - **O padrão fica igual:** com a preferência padrão, o bot em Cordel (G1, e não o "deck seguinte" da §7.1 da spec, substituída), nenhum
      `img` de carta, o verso de listras e o `<Coringa>` no placar. Nenhum teste existente muda, fora os dois que o plano cita (o caso da F4
      no `replay-screen.test.tsx`, por desenho, e algum da fatia 1 que passe a ver as cartas do bot).
    - **Os testes da troca no menu** (o `training.test.tsx` e o E2E `looks.spec.ts`) só passam porque, no Equipar, o bot não tem carta
      virada. Se quebrarem, o conserto é no teste, nunca na regra do bot.
    - **O `LookZone` não põe nó no DOM**, e há **um provedor só** (a união dos pacotes dos dois lados).
    - **O cache síncrono do `loadPack`** (Task 1) vaza entre testes do mesmo arquivo: reset no `beforeEach`.
    - **A medição** é só na tomada (na bateria esta máquina não decide), alternando as aparências numa build só, e o portão é **relativo**
      (G7): a perda da arte para o Cordel não cresce mais de 2 quadros/s sobre a da `main`.
    - **O `medir-cena.ts`** passa a gravar `looks` na partida da fixture (G3): o replay deixa de ler a preferência, e sem isso a medição com
      aparência não acha imagem e falha na espera por elas.
- **A Devastação com arte não passa no celular** (medida em 2026-11-12, na tomada): 46 e 47 quadros/s com arte, contra 55 do Cordel; no PC,
  50 e 51 contra 50. O perfil: o recálculo de estilo das cartas da mesa inteira, umas 70 vezes na cena, já acontece no Cordel e dobra com a face
  com arte; a imagem numa camada própria foi medida e não muda nada. Tudo em `notas/medicao-decks-fatia-1.md`, seção "Antes da fatia 2", e
  na §15 da spec. **O autor não decidiu o conserto** (a recomendação: um bloco curto que corte esse recálculo, antes da fatia 2, sem segurar o
  deploy); a fatia 2 segue pelo portão relativo da G7 (`Esperando o autor`).
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

- **Decks e raças do Coringa, a fatia 3** (o online; spec §8 e §11): plano escrito e aprovado pelo autor antes da execução, depois da
  fatia 2. A arte pintada, quando o autor quiser, segue a bíblia de arte (`docs/superpowers/specs/2026-11-11-biblia-de-arte.md`).
- **Bloco D** (pontos 5 e 14, spec do playtest §6: os botões de carimbo e o 14), com plano escrito e aprovado pelo autor antes da execução,
  como os blocos A, B, C e E.

## Esperando o autor

- **A Devastação com arte no celular** (46 e 47 quadros/s, a meta é 50): consertar antes da fatia 2 (a recomendação: um bloco curto para
  cortar o recálculo de estilo da mesa inteira, que ajuda o Cordel também) ou não. Sem resposta, a fatia 2 segue pela G7. Não segura o deploy:
  só sente quem escolheu um deck de arte, no celular, nessa cena.
- **Jogar a fatia 2** quando ela chegar à `main` (o bot com a aparência dele no treino).
- **O deploy** (`pnpm deploy:server`, só ele), agora que o bloco C está na `main`: fecha as salas online abertas (`STATE_SCHEMA` 6), e as
  partidas guardadas de antes abrem com o aviso de versão (`RULES_VERSION` 5).
- **Jogar** os blocos A, B, C e E e as placas novas. O treino mostra tudo; o online só depois do deploy. As frases novas das placas são de
  quem escreveu (ele aprovou corrigir, não as palavras): conferir no playtest.
- **Jogar a fatia 1 dos decks** no treino (o painel "Aparência" no Início e no menu da partida) e dizer se serve para os testes (a §14 da
  spec). As fotos de conferência estão em `.superpowers/fotos-decks-fatia-1/` (nesta máquina, fora do git). Os 8 Minor adiados da revisão
  já estão decididos: entram na fatia 2 (G5, a Task 1 do plano).
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
