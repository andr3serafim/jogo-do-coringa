# Estado do projeto

> Sobrescrito a cada atualização. **Última: 2026-10-30**, pela conta que assumiu depois do limite semanal da anterior.
> Antes de seguir, confira se não há versão mais nova em outra branch (regra 1 da seção "Memória compartilhada" do `CLAUDE.md`).

## Agora

- **Branch:** `feat/memoria`, no checkout principal `D:\andr3\jogo-coringa`, a partir da `main` em `af6b827`.
- **Em curso:** criação da memória compartilhada; registro da Fase E (respostas ajustadas) e da Fase F (anotações de 30/10)
  na spec do sub-projeto 5; investigação da falha do workerd nesta máquina.
- **Próximo passo exato:** fazer os testes do workerd voltarem a rodar nesta máquina (abaixo). Depois, merge desta branch na
  `main` por fast-forward, com a CI verde, e então começar a **E1** (remover o anti-travamento) numa branch `feat/sem-anti-travamento`.

## A `main`

`af6b827`, CI verde (check + e2e). Sub-projetos 1 a 4 concluídos; sub-projeto 5 com as Fases A a D (`8d7f078`, `a5a76c5`,
`bba8377`, `8cdf0a1`). Regras em vigor: spec 1 (`docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md`), com
os ajustes da spec do sub-projeto 5 (`2026-10-27-ajustes-design.md`).

## Fila (sub-projeto 5)

1. **Workerd nesta máquina** (bloqueia o push: o pre-push roda o `pnpm check` completo, e `--no-verify` é proibido).
2. **E1:** sem anti-travamento e sem limite de rodadas. `RULES_VERSION`/`STATE_SCHEMA` 3, partidas de referência regravadas,
   portão do Difícil do zero.
3. **E2:** Equipar livre.
4. **F1** (apagar o histórico) e **F5** (tabuleiro quebrado com buffs e o aviso de Ressurreição): só web.
5. **E3 + F2 + F3:** roubo, cura pela Defesa, limite de especiais, Reflect reativo e Devastação, medidos juntos no simulador
   antes de virar regra. Depende das respostas abaixo.

## Esperando o autor (lote de 2026-10-30)

Responder como sempre ("1 ok, 2 não…"). As propostas são recomendação, não estão aprovadas.

**Reflect reativo (nota 3)**

1. **Quando e o quê.** O Reflect (K+J+Q da mão) deixa de ser lançado na sua vez e de ficar armado. Passa a ser jogado só na
   janela de reação, quando o oponente declara um ataque (ou lança a Devastação), e vale só para aquele golpe: o dano volta na
   hora, e as 3 cartas vão ao cemitério. Contra um ataque, o efeito continua o de hoje: todos os Q e K do atacante quebram, ele
   leva ATK − ⌊DEF_base / 2⌋, quem refletiu leva 0, e a 1ª carta do Ataque dele e a 1ª da Defesa de quem refletiu saem
   normalmente. Ok?
2. **Anular e Proteção.** Hoje, quando alguém lança o Reflect, o outro pode anular com K+J+Q da mão (regra original sua: "vc
   pode fazer o mesmo na mesma hora e cancelar") ou se proteger sacrificando J+Q+K do campo. Com o Reflect virando resposta,
   as duas seriam resposta de uma resposta, e o jogo não tem cadeia. Proposta: **fica só o Anular**, como a única exceção (o
   atacante, na hora em que o Reflect cai, pode cancelá-lo com K+J+Q da mão; as 6 cartas vão ao cemitério e o ataque segue
   normal), e a Proteção por sacrifício sai. Alternativa: as duas saem.

**Devastação (nota 2)**

3. **Jogada.** K+A+J (ou K+A+Q) sai da mão na fase principal da sua vez e esvazia a Fileira de Ataque (ou de Defesa) **do
   oponente**: todas as numéricas dela vão ao cemitério, os buffs ficam, e a quadra que estava ali se desfaz. As 3 cartas vão
   ao cemitério. Ok?
4. **Resposta.** A Devastação abre a janela de reação do oponente, e a única resposta é o Reflect, que devolve: quem lançou
   perde a própria fileira do mesmo tipo. Contra a Devastação, o Reflect só devolve e não quebra os Q e K de quem lançou. A
   Armadilha não responde a ela. Ok?
5. **Defesa Absoluta.** Ela anula as duas Devastações. Proposta: **não dá para lançar a Devastação contra quem está sob Defesa
   Absoluta** (como a Armadilha hoje), para ninguém gastar 3 cartas à toa. Alternativa: dá para lançar, nada acontece e as 3
   cartas vão ao cemitério.
6. **Selvagem.** Pode fazer o papel do A, do J ou do Q na Devastação (nunca do K, como sempre)? Proposta: sim, como no
   Reflect.
7. **Devastação × cura.** K+A+Q contra quem tem 2 K ou mais manda a Defesa inteira dele ao cemitério, e pela cura passiva ele
   curaria tudo de uma vez (ex.: 8 cartas somando 45 com 2 Q = 135 de vida). Proposta: **carta destruída pela Devastação não
   cura**.

**Roubo**

8. **Defesa Absoluta × Roubo.** Em 28/10 você aprovou "a Defesa Absoluta bloqueia o roubo" (nada é roubado, como acontece com a
   Armadilha); hoje escreveu "defesa absoluta anula o dano" (a carta seria roubada e só o dano seria zero). Proposta: **bloqueia
   o roubo inteiro**, porque é a mesma carta (o Ás) e a Defesa Absoluta já é imune a ela.

**O que você viu no jogo**

9. **Notas 4, 6, 7 e 8.** A nota 4 (Ataque vazio não ataca e não tira carta da Defesa) já é a regra e tem teste. A 7 e a 8
   (Absolutos de 2,6 s, Exódia de 4,2 s com a cruz de K, movimentos com mola) entraram em 27/10. A 6 é o Equipar livre (E2).
   Você jogou uma versão de depois de 27/10? O `jogar-treino.bat` roda o checkout atual. Se sim: em que momento a carta da
   Defesa saiu sem ataque, e o que ainda ficou rápido ou seco?
10. **Nota 5.** Em que tela o tabuleiro quebrou com buffs e o aviso da Ressurreição: celular ou PC, e qual tamanho? Um print
    ajuda. Vou tentar reproduzir de qualquer jeito.

**Vai ser medido (não precisa responder agora):**

- se o K que anula o roubo sem quebrar deixa o roubo preto inútil;
- 2 ou 3 formas de penalidade do limite de 4 especiais, com a recomendação;
- a duração das partidas sem limite de rodadas.

## Só o autor

Playtest online, `wrangler login` + `pnpm deploy:server`, proteção da `main`, `gh`, branches remotas velhas: lista completa em
`notas/playtest.md`.

## Ambiente (máquina do autor, formatada em 2026-10-28)

- **Ferramentas:** Node 26.13 e pnpm 11.9. Não há `gh` nem a CLI `claude` no PATH. O Ubuntu do WSL sumiu.
- **E2E:** precisa de `pnpm --filter @coringa/web exec playwright install chromium` na primeira vez.
- **Workerd:** o `pnpm check` (2026-10-30) passa no lint, no typecheck, nos testes do motor (189), do protocolo (93), do núcleo
  do servidor (272), do simulador (142) e da web (1971), e no smoke. Os testes do servidor no workerd
  (`vitest.worker.config.ts`) não sobem: o `workerd.exe` cai ao iniciar com `access violation` e
  `thread 'main' has overflowed its stack`.
- **Worktrees:**
  - `D:\andr3\jogo-coringa`: checkout principal.
  - `.claude/worktrees/inspiring-sammet-387417` (`feat/ajustes`, limpo): o da conta anterior.
  - `D:\andr3\jogo-coringa-v5` (HEAD solto, limpo): era o checkout limpo dos pushes da conta anterior.
- **Branches que sobraram:** `claude/inspiring-sammet-387417` e `feat/ajustes-fase-a` (local e remota).
- **Arquivo solto:** o `jogar-treino.bat` na raiz é o lançador do autor. Não mexer nem commitar.
