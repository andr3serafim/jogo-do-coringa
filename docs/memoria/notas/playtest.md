# O que só o autor pode fazer, e o que olhar no playtest

Juntado em 2026-10-30 da memória e das notas de sessão da conta anterior (que não estão no repositório). Quem resolver um item
risca aqui e diz no `diario.md`.

## Só o autor

- **Playtest online:** um no celular e um no PC, pelo link publicado; cair e voltar; revanche. Incluir Firefox e iOS Safari: a
  CI só tem Chromium, e o `pointerdown` que pula as batidas e o arrasto com o dedo não são cobertos lá.
- **Primeiro deploy:** `wrangler login` e depois `pnpm deploy:server` (roda o `pnpm check`, constrói a web e publica). Conferir
  se o plano Free aceita o binding `ratelimits`.
- **GitHub:** proteção da `main`; instalar o `gh` (opcional, para PRs); apagar as branches remotas que sobraram
  (`origin/feat/web`, `origin/feat/polish`, `origin/feat/ajustes-fase-a`): o modo automático barrou o `push --delete`.
- **Tartaruga:** ele disse que testa depois do jogo pronto (`tartaruga.md`).
- **Critério final do MVP:** jogar com um amigo pelo link publicado.

## O que olhar

- **Celular:**
  - o tranco nas animações do Equipar contra o Difícil (a busca roda em fatias de ~20–35 ms no p95);
  - a dica 4 do tutorial a 320 × 568;
  - o replay a 360 × 640/740 com o bloco das cartas recebidas e os dois avisos (versão e divergência) no quadro 0, cuja altura
    não tem teste;
  - a 390 × 844 com a mão cheia, a mão cobre a Guarda e os buffs durante o arrasto até os campos rolarem;
  - fileiras de 8 a 360 px (as cartas passaram de 34 para 29 px).
- **Arrastar:** só o cursor anuncia que a carta arrasta (nada no celular). O E2E do dedo usa o CDP do Chromium: conferir no iOS
  Safari e no Firefox. Um toque que escorrega entre 8 px e a folga do navegador e volta sobre a carta escolhe no `pointerup`.
- **Reconexão:** logo depois de uma reconexão fora do anel (`resync`), o rascunho do Equipar reordena a fileira sem deslizar até
  o próximo `state` (`Stage.tsx`).
- **Cenas raras:** Ataque e Defesa Absoluta (2,6 s) e Exódia (4,2 s) não encolhem quando há decisão esperando (decisão da
  conta anterior, por delegação); um toque na mesa pula a cena.
- **E2E na CI:** a falha intermitente de 27/10 foi corrigida em `af6b827` (o botão "Atacar" sumia entre o `isVisible` e o
  `isEnabled`). Se `e2e/drag.spec.ts` ficar instável, esperar duas leituras iguais da rolagem antes de comparar.
- **Futuro (opcional):** uma fase pós-fim no `simulate` da propriedade do servidor (revanche, `hello` em FINISHED, expiração).
