# Revisão das notas do autor contra o jogo (2026-10-30)

O autor jogou a versão de depois de 27/10 e escreveu que "nem todos os pontos levantados foram feitos ou concluídos"
(decisões, 2026-10-30 (2), item 9). Aqui fica cada nota, o que existe hoje na `main` e onde está. Quem mexer num item
atualiza a linha dele.

Legenda: **feito** (está no jogo, com o commit); **corrigido agora** (nesta revisão); **na fila** (aprovado, ainda não
feito); **descartado** (pelo autor); **investigado** (sem bug encontrado; volta ao autor).

## Notas de 2026-10-23

| # | Nota (resumo) | Situação | Onde |
| --- | --- | --- | --- |
| 1 | Healer × Steal | **na fila (E3)**: virou Roubo com o Ás e cura pela Defesa com 2 K (regras de 30/10) | spec do sub-projeto 5, E3 |
| 2 | Liberar os 8 Ás | **feito** (`8cdf0a1`) | `DEFAULT_CONFIG.deck.aceCopies = 8` |
| 3 | Ver todas as cartas e escolher qual jogar primeiro | **na fila (E2, Equipar livre)**: o autor explicou que são as numéricas recebidas na compra | spec, E2 |
| 4 | Textos rápidos demais para ler | **feito** (`bba8377`): a faixa fica pelo menos 600 ms + 30 ms por caractere (1 a 2 s); o balão do motivo, 1,2 s + 55 ms por caractere (2,5 a 8 s) | `model/reading.ts` |
| 5 | Botão de Ressurreição que lembre ressurreição | **feito** (`bba8377`): carta subindo de uma lápide, no botão e no diálogo do cemitério | `ui/table/ResurrectIcon.tsx` |
| 6 | Absolutos e Exódia mais demorados e empolgantes | **feito** (`bba8377`): Absolutos de 1,5 s para 2,6 s (leque de J ou Q, título que carimba, raios); Exódia 4,2 s (os K em cruz, uma inversão, título grande). Não encolhem quando há decisão esperando. Um toque na mesa pula a cena | `model/timeline.ts` (`RARE_SCENE_MS`), `ui/anim/Scene.tsx` |
| 7 | Manter a carta na mão | **descartado** pelo autor (30/10, item 9) | — |
| 8 | BUG: buffs contados fora da mesa | **feito** (`8d7f078` e `a5a76c5`): a conta "base × N" mostrava um multiplicador velho durante o golpe, e a Pressão da mesa somava ao multiplicador; as duas causas saíram | spec, Fase A |
| 9 | Fileiras de 8, vida 500 ajustável no menu | **feito** (`8cdf0a1`): vida 300/500/800 ao criar a sala e no treino | `ui/HpChoice.tsx` |
| 10 | BUG: tenho buff, K ou A e não consigo jogar | **feito** (`8d7f078`): não era bug de regra; a carta sem jogada agora diz o motivo (balão) | motor `noPlayReason` |
| 11 | Movimentos mais suaves | **feito** (`bba8377`): cartas com mola (0,42 s), esmaecimentos de 220 ms | `ui/anim/motion.ts` |
| 12 | Fim de partida com tempo e "NOME VENCEU!" estilo HQ | **feito** (`bba8377`) | `ui/table/EndPanel.tsx` |
| 13 | Remover a Pressão da mesa por completo | **feito** (`a5a76c5`) | spec, Fase B |

Itens 4, 6 e 11: as animações dependem do "movimento reduzido" (do sistema ou do menu do jogo). Com ele ligado, as cenas
viram um esmaecimento curto e as cartas não deslizam. As animações do Windows desta máquina estão ligadas (conferido em
2026-10-30); o menu do jogo tem a própria chave.

## Notas de 2026-10-30

| # | Nota (resumo) | Situação | Onde |
| --- | --- | --- | --- |
| 1 | Apagar a lista de partidas | **na fila (F1)** | spec, F1 |
| 2 | Devastação | **na fila (F3)**: regras aprovadas em 30/10 | spec, F3 |
| 3 | Reflect reativo | **na fila (F2)**: regras aprovadas em 30/10 | spec, F2 |
| 4 | Ataque vazio ainda tira carta da Defesa | **investigado**. O motor não deixa atacar com o Ataque vazio (`declareAttack` recusa; o turno só termina com `END_TURN`). Em 2.000 partidas simuladas (49 mil turnos), nenhuma Defesa perdeu carta num turno sem ataque, e numa partida de treino jogada de tartaruga no navegador também não. Duas explicações para o que ele viu: (a) a Defesa Absoluta acaba no fim do próximo turno do oponente **mesmo sem ataque** e gasta 1 Q, que é carta de defesa; (b) um atacante com uma carta só ataca, e as duas cartas saem juntas, então depois do golpe o Ataque dele está vazio. **O autor confirmou a (a) e mudou a regra** (`decisoes.md`, 2026-10-30 (4)): a Defesa Absoluta dura até o oponente atacar de fato. Entra com a E1 | `flow.ts` (`expireEffects`) |
| 5 | Tabuleiro quebrado com os avisos (PC 1536 × 695) | **corrigido agora**: na mesa compacta, as zonas dos especiais se espremiam (`min-height: 0`) e a lista das marcas ocupava a altura inteira da coluna (`flex-basis: 100%`). E2E novo em 1536 × 695, 1366 × 657 e 1440 × 900 | `styles.css`, `e2e/layout.spec.ts` |
| 6 | Ver todas as cartas | = nota 3 de 23/10 (**E2**) | — |
| 7 | Absolutos e Exódia | = nota 6 de 23/10 (**feito**). O autor pediu 3 s para os Absolutos (eram 2,6 s); a Exódia fica em 4,2 s. Entra com a E1 | `model/timeline.ts` (`RARE_SCENE_MS`) |
| 8 | Movimentos suaves | = nota 11 de 23/10 (**feito**) | — |

Também nesta revisão: o histórico escrevia "Saiu 3♣ **do** Defesa" e "quadra de 6 **no** Defesa"; agora é "da Defesa" e "na
Defesa" (`sim/src/play/text.ts`, com teste).
