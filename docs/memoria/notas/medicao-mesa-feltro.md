# A mesa no Feltro: a Devastação (2026-11-19)

A A/B da spec `2026-11-19-mesa-feltro-design.md` §6 (a Devastação com arte já estava no limite no celular). Mesma sessão, CPU 4×,
alternada (`main`, branch, `main`, branch), 3 repetições em cada, quadros/s / pior intervalo (ms). `main` = `3fd5565`; branch = `49fa579`.

O comando (de `packages/web`, com a porta 8797 porque o dev server ocupava outras):

    MEDIR_FIXTURE=exodia-devastacao MEDIR_RODADA=43 MEDIR_PASSO=210 MEDIR_MS=3200 \
      MEDIR_APARENCIAS=bestiario:egipcio/celestial:egipcio,cordel MEDIR_REPETICOES=3 MEDIR_PORTA=8797 MEDIR_SAIDA=<pasta> \
      pnpm exec playwright test --config medir.config.ts

| Aparência | Tela | `main` (1ª) | branch (1ª) | `main` (2ª) | branch (2ª) |
|---|---|---|---|---|---|
| arte | 360 | 50/183 49/183 49/200 | 54/67 48/217 51/183 | 52/167 50/200 50/183 | 56/50 52/183 56/50 |
| arte | 1366 | 52/150 49/150 52/67 | 49/167 51/83 52/67 | 50/150 47/167 46/167 | 51/167 51/183 55/50 |
| Cordel | 360 | 55/133 55/133 55/133 | 55/133 57/67 58/50 | 54/167 57/67 50/250 | 57/133 59/33 59/33 |
| Cordel | 1366 | 53/133 52/133 52/133 | 49/133 52/133 52/150 | 45/150 51/133 38/300 | 53/150 53/150 54/150 |

**Leitura:** a branch fica igual ou acima da `main` nos quatro casos (as médias: arte a 360, 50 → 53; arte a 1366, 49 → 52; Cordel a
360, 54 → 58; Cordel a 1366, 49 → 52). O material novo é fundo parado e não pesa; a diferença a favor está dentro do ruído da máquina
(uma primeira rodada, sem a `main` ao lado, deu de 28 a 54 com o dev server da web aberto: só a A/B na mesma sessão decide).
