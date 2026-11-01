# Medição das cenas absolutas (sub-projeto 6, fatia 2)

Spec 6 §11: meta de ≥ 50 quadros por segundo nas cenas com a CPU 4× mais lenta no Chromium; no máximo ~60 partículas vivas.

## Como foi medido (2026-11-01)

- **Build:** o de produção (`vite build` + `vite preview` na porta 4173), sem o servidor: o replay roda no navegador.
- **Navegador:** Chromium do Chrome DevTools MCP, CPU 4× mais lenta (`Emulation.setCPUThrottlingRate`).
- **Partida:** o replay da fixture do E2E (`packages/web/e2e/fixtures/absolutos.json`, semente `absolutos-40`):
  - o passo 50 (rodada 11) é o Ataque Absoluto do Bot, que acerta você;
  - o passo 58 (rodada 13) é a sua Defesa Absoluta.
- **Medida:** um laço de `requestAnimationFrame` desde o clique em "Próximo passo" até o fim da cena (4,6 s e 4,9 s). Ele conta
  os quadros, o maior intervalo, o p95, os quadros acima de 50 ms e o pico de `[data-particula]` vivas.

## Resultado

| Tela | Cena | Quadros/s | Maior quadro | p95 | Quadros > 50 ms | Partículas no pico |
|---|---|---|---|---|---|---|
| PC 1366 × 768 | Ataque Absoluto | 52,0 | 270 ms | 38 ms | 6 | 25 |
| PC 1366 × 768 | Defesa Absoluta | 89,0 | 139 ms | 19 ms | 3 | 0 |
| Celular 390 × 844 (2×, toque) | Ataque Absoluto | 52,8 | 251 ms | 38 ms | 6 | 24 |
| Celular 390 × 844 (2×, toque) | Defesa Absoluta | 88,2 | 115 ms | 19 ms | 4 | 0 |

- **Meta:** as duas cenas passam de 50 quadros por segundo nas duas telas, e as partículas ficam bem abaixo do teto de 60.
- **Mais de 60 quadros por segundo:** a tela do Chromium da medição desenha a mais de 60 Hz.
- **O maior quadro (115 a 270 ms):** é o da chegada do passo, quando a mesa troca de estado e a cena monta. É o mesmo quadro
  pesado que a fatia 1 já registrou (~200 ms com a CPU 4×), candidato à fatia 5 (fluidez). Os outros quadros longos são o impacto
  do feixe (o número, os respingos, o tremor e a vida que começa a contar).
- **Não precisou de corte:** nenhuma partícula nem `drop-shadow` saiu. O celular já roda sem `drop-shadow` nas cenas, e o brilho
  do Ataque é um gradiente.
