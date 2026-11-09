# Pontos do playtest, bloco C: o poder que cresce (pontos 10, 11 e 13) — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o poder acumulado passa a se ver na mesa:
- **Bônus em escala (ponto 10):** as zonas de bônus e a Guarda crescem com a quantidade de cartas. As cartas acendem, saem faíscas entre os J,
  a muralha se ergue atrás dos Q, a brasa aparece nos K, e o Absoluto tem aura.
- **Aura da iniciativa (ponto 11):** quem segura a iniciativa por várias rodadas seguidas ganha uma aura no retrato: brasa com 3, chama com
  5, super aura com 10. Um selo "×N" mostra a conta.
- **Espada e escudo de quem lidera (ponto 13):** a figura do total ganha o ouro do lado do Ataque maior, e o mesmo com a Defesa maior.

**Architecture:**
- **O motor conta a sequência; nenhuma regra muda.** A decisão da iniciativa (`InitiativeDecision`) ganha `streak`, e com ela o estado
  (`lastInitiative`), a `view` e o evento `InitiativeDecided`. O jeito de cada partida e os `RULES_DIGESTS` (contam os eventos por tipo) não
  mudam, então `RULES_VERSION` também não. Muda a forma do estado guardado: `STATE_SCHEMA` vai de 5 a 6.
- **Um relógio só e um agendador de raios só para a mesa inteira.** As auras que fervem (os 4 J armados e a super aura) trocam de forma pelo
  mesmo relógio. Os raios (os J com faíscas e a super aura) saem de um agendador com no máximo 3 por segundo na tela inteira. Os dois param
  durante as batidas e as cenas, e com movimento reduzido nem ligam. As formas da aura (`aura.ts`) saem do chunk das cenas para
  `ui/anim/`, como as partículas, para a mesa não puxar o chunk.
- **A aura da iniciativa muda na batida da decisão,** pelo mesmo caminho da espada (`useSword`). O `fx.initiative` passa a levar o `streak`;
  com a mesa parada, vale a `view`.
- **Os níveis das zonas saem do motor:** a config (`buffLimit`, `exodiaGuard`, `defenseHealGuard`) e as marcas (`absoluteAttackArmed`,
  `absoluteDefense`, `defenseHealActive`). Nenhum número fixo.
- **A liderança compara os totais que as fileiras mostram,** os que esperam o pouso (fatia 5). Eles ficam num armazém pequeno da mesa, com
  uma assinatura por fileira: só as fileiras envolvidas redesenham.

**Tech Stack:** o motor no Node puro, React 19, Web Animations (só `transform`, `translate`, `scale` e `opacity` animam), Vitest (jsdom),
Playwright.

**Spec:** `docs/superpowers/specs/2026-11-03-playtest-design.md` §5 (os pontos), §8 (as restrições) e §10 (as escolhas). Protótipo:
`docs/superpowers/specs/2026-11-03-playtest-prototipo.html`, quadros `p10`, `p11` e `p13` (`decisoes.md` 2026-11-03 (4): a escada como está,
os 3 K só com a aura, a aura da iniciativa contada pelo motor, Ataque com Ataque e Defesa com Defesa).

## Escolhas para o autor aprovar

Cada uma tem a recomendação de quem escreveu. Nada do código muda antes da aprovação dele.

- **C1. A sequência mora na decisão da iniciativa.**
  - **Como funciona:** `streak` entra no `InitiativeDecision`, em vez de um campo `initiativeStreak` à parte; dá o mesmo resultado com menos
    código. A conta é `changed ? 1 : (anterior?.streak ?? 0) + 1`.
  - **O que muda no deploy:** o `STATE_SCHEMA` vai a 6, e as salas abertas fecham no deploy, como você já aprovou. O `PROTOCOL_VERSION` não
    sobe: a `view` só ganha um campo, que um cliente antigo ignora, e ele nunca subiu nas mudanças de estado anteriores.
  - **Spec:** a frase "sobe o esquema do protocolo" da §5.2 é corrigida na Task 5.
  - **Recomendo** assim.
- **C2. O selo "×N" aparece a partir de 2 rodadas seguidas,** como no protótipo; a aura começa em 3. **Recomendo** assim.
- **C3. A aura muda na batida da decisão,** junto com a espada, e não quando o passo chega. Quando a iniciativa troca de mão, a aura apaga
  com um sopro de fumaça. Vale para os dois lados (a do Bot também). **Recomendo** assim.
- **C4. As auras que fervem e os raios na mesa.**
  - **Na mesa:** os 4 J armados e a super aura podem ficar na mesa por muitos turnos. Elas fervem como na cena, trocando de forma a cada 70
    ms, por um relógio único que para durante as batidas e as cenas. Os raios, somando os dois campos, ficam em no máximo 3 por segundo.
  - **O portão:** ≥ 50 quadros/s com a CPU 4×, na mesa mais cheia.
  - **Se não passar:** as formas param e só a opacidade pulsa. Essa troca é do executor, registrada no diário.
  - **Recomendo** assim.
- **C5. Os brilhos ficam desenhados.** O protótipo anima `box-shadow`, que a regra de desempenho (§11) proíbe. O aceso, o pulso verde dos 2 K,
  a brasa dos 3 K e o brilho que passa no ouro do líder viram camadas desenhadas que só mudam a opacidade. O olho vê o mesmo. **Recomendo**
  assim.
- **C6. Os níveis seguem a config do motor:**
  - J e Q: o aceso com 2, as faíscas e a muralha a um do limite (`buffLimit` − 1), o Absoluto no limite;
  - K: o pulso verde com a cura passiva (`defenseHealActive`), a brasa a um da Exódia (`exodiaGuard` − 1).

  Com a regra de hoje dá a sua escada (2, 3, 4). Com outra config, a escada acompanha sem mexer na mesa. **Recomendo** assim.
- **C7. A liderança troca no pouso.**
  - **O que compara:** os totais que as fileiras mostram, os que esperam a carta pousar.
  - **Empate:** ninguém lidera, inclusive 0 × 0 (os dois Ataques vazios).
  - **Na troca:** o ouro troca no pouso, com um sopro; quando o total cai no golpe, troca na batida do golpe.
  - **Recomendo** assim.
- **C8. O histórico e o texto do `pnpm play` não mudam.** O leitor de tela ouve a sequência no placar ("3 rodadas seguidas com a iniciativa"),
  como a Ressurreição. As auras, os brilhos e o ouro são decorativos. **Recomendo** assim.
- **C9. A execução.**
  - **Recomendo:** aqui mesmo, tarefa por tarefa, na branch `feat/playtest-bloco-c`, teste primeiro, e no fim um revisor novo, num subagente,
    lendo a branch inteira, como nos blocos A e B. As tarefas são encadeadas (o motor alimenta a aura; o relógio serve a aura e as zonas),
    então um revisor por tarefa custaria mais sem pegar mais.
  - **Alternativa:** um subagente por tarefa, com revisor a cada uma.

## Global Constraints

- **Fotossensibilidade** (spec da web §10.4): os raios são pequenos e não passam de 3 por segundo na tela inteira (um agendador só); nada
  acende mais de 25% da tela; nenhuma inversão nova. Com movimento reduzido, nenhum raio.
- **Movimento reduzido:** nenhuma aura fervendo, chama, brasa subindo, raio, brilho que passa, sopro nem pulso; ficam as cores, o aceso
  parado, a muralha e o escudo de ouro parados, o selo e o ouro do líder.
- **Ritmo:** ≥ 50 quadros/s com a CPU 4× (`e2e/medir-cena.ts`), medido na mesa mais cheia; ≤ 60 partículas vivas; sem `drop-shadow`,
  `box-shadow` animado, `blur` nem `filter` animado.
- **Telas:** 360 × 640 no celular e 1366 × 657 no PC baixo (e 1366 × 768), sem rolar de lado.
- **Sem regra na interface:** os níveis vêm da config e das marcas do motor (C6); os totais, de `attackPower` e `defensePower` (pela
  fileira, como hoje); a sequência, do `streak` do motor.
- **Partidas de referência:** `RULES_VERSION`, `RULES_DIGESTS` e os snapshots golden não mudam (a Task 1 prova), nem o digest do texto do
  `pnpm play` (`sim/test/online.test.ts`). `STATE_SCHEMA` vai a 6. `E2E_SEED` fica vazia. O deploy é do autor.
- **O portão do Difícil** (`CLAUDE.md`: remeça quando o motor muda): `pnpm sim:dificil --ajuste "a sequência da iniciativa no estado, sem
  mudança de regra"`, em segundo plano, com o `estado.md` commitado antes, e o relatório commitado.
- **Arte original** (§10.6): a aura, a chama, as faíscas, a muralha e o ouro são desenhados em código. **Números sem textura** (§10.7): o
  selo "×N" usa a fonte de texto com `tabular-nums`.
- **Orçamento:** JavaScript inicial ≤ 200 KB gzip. O que a mesa usa mora fora de `ui/scenes/`.
- **Testes:** em `test/ui`, todo arquivo é `.test.tsx`. O jsdom não tem layout: a posição se confere nas fotos da Task 5. A contagem de
  animações sem fim do `phases.test.tsx` muda de propósito na tarefa que as acrescenta.
- **Contratos que ficam:** a espada da iniciativa, as placas de estado, o arrasto (as zonas `data-soltar`), o histórico como registro
  acessível, as cenas e a `FlashLock`.

## Review Focus

1. **A iniciativa que troca de mão depois de uma sequência longa (×10):** a aura apaga na batida da decisão, com o sopro, e não quando o
   passo chega; o selo some junto → teste da Task 2.
2. **A reconexão e o replay voltando um passo** (o `resync`): a aura e o selo saem da `view`, sem sopro nem voo → teste da Task 2.
3. **A mesa mais cheia** (4 J armados, 3 Q, 3 K, a sequência ≥ 10 e os dois ouros de líder): um relógio só, os raios em ≤ 3 por segundo
   somando tudo, nada fervendo durante uma cena → testes das Tasks 2 e 3 e a medição da Task 5.
4. **Os Selvagens nos bônus** (contam como J ou Q no nível) **e a Defesa Absoluta que acaba** (sai 1 Q: o nível desce de 3 para 2) → teste
   da Task 3.
5. **A liderança no empate, com o Ataque vazio e com a carta que ainda vai pousar:** ninguém no empate (0 × 0 inclusive); o ouro troca no
   pouso, não quando o passo chega → testes da Task 4.

---

### Task 1: O motor conta a sequência da iniciativa

**Files:**
- Modify: `packages/engine/src/types.ts` (`InitiativeDecision`), `packages/engine/src/flow.ts` (`endAttackRound`)
- Modify: `packages/server/src/core/timers.ts` (`STATE_SCHEMA = 6`, com o motivo no comentário)
- Modify: `packages/web/test/fixtures.ts` (`lastInitiative` ganha `streak?`, padrão 1) e os testes da web com `InitiativeDecided` literal
- Test: `packages/engine/test/turn-flow.test.ts`, `packages/engine/test/view.test.ts`, `packages/server/test/core/primitives.test.ts`

**Interfaces:**
- Produces: `InitiativeDecision.streak: number`: quantas rodadas de Ataque seguidas terminaram com a iniciativa em `player`, contando
  esta; `changed ? 1 : (s.lastInitiative?.streak ?? 0) + 1`. Obrigatório (o estado novo sempre o tem: `STATE_SCHEMA` 6).

- [ ] **Step 1: Escrever os testes que falham** (`turn-flow.test`): três rodadas de Ataque com a iniciativa em `p1` → os `InitiativeDecided`
  com `streak` 1, 2 e 3; a quarta com `p2` causando mais dano → `{ player: 'p2', changed: true, streak: 1 }`; o empate não muda nem zera
  (`streak` + 1); a primeira decisão sem troca → 1. `view.test`: `view.lastInitiative.streak` igual ao do estado. `primitives.test`:
  `STATE_SCHEMA` é 6.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/engine exec vitest run test/turn-flow.test.ts test/view.test.ts`
Expected: FAIL (`streak` inexistente).

- [ ] **Step 3: Implementar** a conta em `endAttackRound` e o `STATE_SCHEMA`. Atualizar o `fixtures.ts` da web e os `InitiativeDecided`
  literais dos testes (o `tsc` aponta cada um; `streak: 1` onde o teste não depende dele).
- [ ] **Step 4: Rodar o motor inteiro, o simulador e o typecheck**

Run: `pnpm --filter @coringa/engine test; pnpm --filter @coringa/sim exec vitest run test/online.test.ts; pnpm -r typecheck`
Expected: PASS, **sem** `-u`: os snapshots golden, os `RULES_DIGESTS` e o digest do texto do `pnpm play` iguais (nenhuma partida mudou).

- [ ] **Step 5: Commit**: `feat(engine): a sequência da iniciativa na decisão (ponto 11)`, com o diário e o `estado.md` (regra 6).

### Task 2: O relógio da mesa e a aura da iniciativa (ponto 11)

**Files:**
- Move: `packages/web/src/ui/scenes/aura.ts` → `packages/web/src/ui/anim/aura.ts` (e os imports das cenas)
- Create: `packages/web/src/ui/anim/table-clock.ts`, `packages/web/src/model/initiative-aura.ts`, `packages/web/src/ui/table/InitiativeAura.tsx`
- Modify: `src/model/effects.ts` (`fx.initiative` com `streak`), `src/ui/table/FightHud.tsx`, `src/styles.css`
- Test: `test/ui/table-clock.test.tsx`, `test/model/initiative-aura.test.ts`, `test/ui/table.test.tsx`, `test/ui/animation.test.tsx`

**Interfaces:**
- Consumes: `InitiativeDecision.streak` (Task 1).
- Produces:
  - `useAuraFrame(active: boolean): number` (`table-clock.ts`): o quadro de 0 a 3 das formas (`auraVariants`), de **um** `setInterval` de
    `AURA_BOIL_MS` para todos os assinantes, que só existe com algum assinante ativo; parado (o quadro não anda) enquanto `anim.busy`, e
    nunca ligado com movimento reduzido.
  - `useBoltSlot(active: boolean, onBolt: () => void): void`: um agendador só para a mesa, que chama um assinante ativo por vez, em rodízio,
    a cada `BOLT_GAP_MS` (≤ 3 por segundo somando todos); parado durante `anim.busy` e com movimento reduzido.
  - `INITIATIVE_TIERS = [3, 5, 10] as const`, `initiativeTier(streak: number): 0 | 1 | 2 | 3` e `streakSealShown(streak: number): boolean`
    (≥ 2, C2), em `model/initiative-aura.ts`.
  - `fx.initiative` ganha `streak: number`; `useInitiativeAura(view, anim): { holder: SwordSide; streak: number }` no `FightHud`, com o mesmo
    caminho do `useSword` (muda na batida da decisão; parada, a `view`).
  - `InitiativeAura({ tier, streak, reduced, out })`: as camadas das formas (brasa, chama e super aura, com os raios e as medidas do
    protótipo, menores), as brasas que sobem nos níveis 2 e 3 (≤ 12 vivas), os raios do nível 3 pelo `useBoltSlot`, o sopro de fumaça quando
    `out` (a troca de mão). `data-aura-iniciativa={tier}`. O selo `data-selo-sequencia` "×N" é `aria-hidden`, com um `sr-only` "N rodadas
    seguidas com a iniciativa".

- [ ] **Step 1: Escrever os testes que falham**
  - `table-clock.test`: três assinantes ativos → um intervalo só (espiar `setInterval`); o quadro anda a cada `AURA_BOIL_MS` e para com a
    mesa ocupada; os raios de dois assinantes saem alternados, no máximo 3 em 1 s; sem assinante, nenhum intervalo vivo.
  - `initiative-aura.test`: `initiativeTier` em 0, 2, 3, 4, 5, 9, 10, 13 → 0, 0, 1, 1, 2, 2, 3, 3; o selo a partir de 2.
  - `table.test`: com `lastInitiative` de `p1` e `streak` 5 → o seu retrato com `data-aura-iniciativa="2"` e o selo "×5", com o texto do leitor
    de tela; o do Bot sem aura; `streak` 1 → nem aura nem selo.
  - `animation.test`: uma decisão que troca de mão depois de `streak` 10 → a aura segue no nível 3 até a batida da decisão e apaga nela, com o
    sopro; uma que mantém → sobe na batida; o `resync` → direto na `view`, sem sopro; com movimento reduzido → nenhuma partícula nem raio, e a
    forma não troca.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/table-clock.test.tsx test/model/initiative-aura.test.ts test/ui/table.test.tsx test/ui/animation.test.tsx`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: Implementar.** A aura fica atrás do retrato, dentro do lado dele no placar (`placar-lado`), sem mudar a altura do placar.
  O relógio e o agendador usam `useSyncExternalStore` sobre um armazém de módulo.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model test/ui`
Expected: PASS (as cenas seguem iguais com o `aura.ts` no lugar novo).

- [ ] **Step 5: Commit**: `feat(web): a aura da iniciativa no retrato (ponto 11)`, com o diário.

### Task 3: Os bônus em escala (ponto 10)

**Files:**
- Create: `packages/web/src/model/zone-level.ts`, `packages/web/src/ui/table/ZonePower.tsx`
- Modify: `src/ui/table/PlayerField.tsx` (`Zones`, `Zone`), `src/styles.css`
- Test: `test/model/zone-level.test.ts`, `test/ui/table.test.tsx`, `test/ui/phases.test.tsx` (a contagem de `infinite`, de propósito)

**Interfaces:**
- Consumes: `useAuraFrame`, `useBoltSlot`, `auraVariants` (Task 2).
- Produces:
  - `zoneLevel(kind: 'J' | 'Q' | 'K', player: PublicPlayer, config: RulesConfig): 0 | 1 | 2 | 3` (C6):
    - J: 3 com `absoluteAttackArmed`, 2 com `buffLimit − 1` ou mais, 1 com 2 ou mais;
    - Q: 3 com `absoluteDefense`, 2 com `buffLimit − 1` ou mais, 1 com 2 ou mais;
    - K: 2 com `exodiaGuard − 1` ou mais, 1 com `defenseHealActive`;
    - fora disso, 0. Os Selvagens contam (estão nos bônus).
  - `Zone` ganha `level` e `kind` → `data-nivel={level}` e `data-poder={kind}`.
  - `ZonePower({ kind, level, count, reduced })`, a camada da zona:
    - o J 2 com os raios entre J vizinhos (`useBoltSlot`);
    - o J 3 com a aura das formas do Ataque Absoluto (`ATTACK_AURA`, menor) por `useAuraFrame`;
    - o Q 2 com a muralha (o escudo tracejado que respira);
    - o Q 3 com o escudo de ouro parado.
  - No CSS, as camadas desenhadas das cartas (pseudo-elementos com `opacity`, C5): o aceso dos J (contorno de ouro) e dos Q (papel), o pulso
    verde do K 1 e a brasa do K 2.

- [ ] **Step 1: Escrever os testes que falham**
  - `zone-level.test`: a escada com a config de hoje (1, 2, 3 e 4 J → 0, 1, 2, 3; o mesmo com Q e a Defesa Absoluta; 1, 2 e 3 K → 0, 1, 2);
    com `buffLimit: 3`, 2 J já são o nível 2; os Selvagens contam; 4 Q sem `absoluteDefense` (a Defesa Absoluta acabou e sai 1 Q) → o nível
    do que restar.
  - `table.test`: as três zonas dos dois campos com `data-nivel` certo num cenário com 3 J, 4 Q em Defesa Absoluta e 3 K; nenhum texto novo
    na mesa (os 3 K: só a brasa, decisão do autor); o arrasto (`data-soltar`) igual.
  - `phases.test`: a lista de animações sem fim com as novas (o pulso do K 1, a brasa do K 2, a muralha que respira), e o número novo.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/model/zone-level.test.ts test/ui/table.test.tsx test/ui/phases.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** As camadas não mudam a altura das zonas (no PC baixo, o E2E de layout confere a coluna das zonas em 88 px de
  marcas). Com movimento reduzido, as cores e o aceso ficam parados.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model test/ui`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): os bônus em escala (ponto 10)`, com o diário.

### Task 4: A espada e o escudo de quem lidera (ponto 13)

**Files:**
- Create: `packages/web/src/ui/table/lead-store.ts`
- Modify: `src/ui/table/Row.tsx`, `src/ui/table/Table.tsx` (o provedor do armazém), `src/styles.css`
- Test: `test/ui/lead-store.test.tsx`, `test/ui/table.test.tsx`, `test/ui/animation.test.tsx`, `test/ui/phases.test.tsx`

**Interfaces:**
- Produces:
  - `leaderOf(a: number, b: number): 'a' | 'b' | null`: só o estritamente maior; empate, inclusive 0 × 0, `null` (C7).
  - `LeadProvider` (um armazém por mesa), `useReportTotal(player: PlayerId, kind: RowName, total: number): void` e
    `useLead(player: PlayerId, kind: RowName): boolean`, por `useSyncExternalStore` com um seletor por fileira: um total que muda redesenha só
    as fileiras daquele tipo.
  - A `Row` informa o `total` que já conta o pouso (o mesmo que ela mostra) e, liderando, desenha a figura num medalhão de ouro
    (`data-lider`), com o brilho que passa (um pseudo-elemento com `translate`, sem fim) e o sopro de entrada (`scale` e `opacity`) quando
    passa a liderar.

- [ ] **Step 1: Escrever os testes que falham**
  - `lead-store.test`: `leaderOf` com 74 × 52, 52 × 74, 60 × 60, 0 × 0 e 0 × 5; o armazém notifica só os assinantes do tipo que mudou (conta
    os desenhos de uma fileira de Defesa quando um Ataque muda).
  - `table.test`: o seu Ataque maior e a Defesa dele maior → `data-lider` na sua fileira de Ataque e na Defesa dele, e mais nenhuma; empate →
    nenhuma; os dois Ataques vazios → nenhuma.
  - `animation.test`: uma carta que vai pousar e vira a liderança → o ouro troca no pouso (o `landAt` da fatia 5), não quando o passo chega;
    com movimento reduzido, sem sopro.
  - `phases.test`: o brilho que passa entra na lista das animações sem fim.
- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm --filter @coringa/web exec vitest run test/ui/lead-store.test.tsx test/ui/table.test.tsx test/ui/animation.test.tsx test/ui/phases.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar.** O medalhão cabe na coluna do total (58 px no celular) sem empurrar o número; a figura segue a mesma.
- [ ] **Step 4: Rodar**

Run: `pnpm --filter @coringa/web exec vitest run test/model test/ui`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(web): a espada e o escudo de quem lidera (ponto 13)`, com o diário.

### Task 5: E2E, fotos, medição, portão do Difícil e documentação

**Files:**
- Create: `packages/web/e2e/power.spec.ts`, `docs/memoria/notas/medicao-bloco-c.md`
- Modify: `packages/sim/reports/dificil.md` (pelo portão), a spec do playtest §5 (a frase do protocolo, C1, e "O que a execução decidiu"),
  `docs/memoria/estado.md`, `diario.md`

As fixtures já têm tudo (contado com o motor sobre os `steps`):
- **`especiais.json` (você, `p1`):**
  - os níveis dos bônus: 3 Q no passo 68 (rodada 15), 3 J no 90, 4 J armados no 99, 3 K no 174 (rodada 37);
  - a sequência da iniciativa: 3 no 92, 5 no 111, 10 no 161 (rodada 34; ela chega a 11 no 169);
  - a cura passiva (2 K) do Bot no 74;
  - a liderança do Ataque que vira para você no 78.
- **`exodia-devastacao.json`:** a sequência de 10 do Bot no 227 (rodada 46) e a troca de mão depois dela.

- [ ] **Step 1: Escrever o E2E** (`power.spec.ts`), em 1366 × 657, 1366 × 768 e 360 × 640, no replay:
  - em cada passo acima, os `data-nivel`, o `data-aura-iniciativa` e o selo "×N", e o `data-lider` certo;
  - nada rola de lado, e o selo e o medalhão ficam dentro do placar e da coluna do total;
  - sem erro no console.
- [ ] **Step 2: Rodar**

Run: `pnpm --filter @coringa/web build; pnpm --filter @coringa/web exec playwright test e2e/power.spec.ts e2e/layout.spec.ts`
Expected: PASS. Com o `wrangler dev` do autor na 8787, usar outra porta só nessa execução.

- [ ] **Step 3: Fotos e medição** com o `e2e/medir-cena.ts`:
  - **a mesa mais cheia:** `especiais.json` entre os passos 161 e 178: a sequência ≥ 10, os 3 K e o ouro dos líderes; o executor confere por
    script o passo com mais efeitos juntos;
  - **a troca de mão depois do ×10:** `exodia-devastacao.json`.

  Meta: ≥ 50 quadros/s com a CPU 4× e ≤ 60 partículas. Se a mesa cheia não passar, vale a saída da C4 (as formas param), registrada.
  Conferir nas fotos se a mesa não vira um carnaval (§1: tudo brilhando ao mesmo tempo). Registrar em `notas/medicao-bloco-c.md`.
- [ ] **Step 4: O portão do Difícil.** Com o `estado.md` commitado, `pnpm sim:dificil --ajuste "a sequência da iniciativa no estado, sem
  mudança de regra"` em segundo plano. Commitar o relatório; um resultado diferente das rodadas anteriores (o que não se espera) vai ao
  autor antes do merge.
- [ ] **Step 5: Documentar** a spec §5 (a frase do protocolo e "O que a execução decidiu"), o `diario.md` com cada escolha e o `estado.md`.
- [ ] **Step 6: Portão**

Run: `pnpm check`
Expected: verde. Depois, o push da branch, as duas CI verdes (`check` e `e2e`), a revisão da branch inteira e o fast-forward na `main`. O
autor joga; o online só depois do `pnpm deploy:server` dele (fecha as salas abertas, `STATE_SCHEMA` 6).

## Para quem executa (escolhas deixadas a você)

São suas:
- as cores finas, as sementes das partículas e das formas;
- o tamanho exato das auras no celular, com a regra de que nada sobe por cima da barra de vida nem empurra o placar;
- o desenho da muralha e do escudo de ouro;
- a curva do sopro.

Ajustes de até ~15% nos tempos também são seus. A contagem de partículas e de raios não.
