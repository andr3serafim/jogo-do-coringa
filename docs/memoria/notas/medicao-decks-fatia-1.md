# Medição da fatia 1 dos decks (as cartas com arte, F5)

- **Data:** 2026-11-11, na branch `feat/decks-fatia-1`, com a web de produção construída pelo `medir.config.ts` a cada execução.
- **Script:** `packages/web/e2e/medir-cena.ts` com `MEDIR_APARENCIA` (a aparência gravada em `coringa:prefs`; o replay a veste dos dois lados, F4),
  na porta 8787. Chromium do Playwright, CPU 4×, telas de 1366 × 768 e 360 × 640 (as do script). A medida espera as imagens carregarem.
- **A máquina:** o notebook do autor **na bateria** (descarregando, 89%): a CPU anda mais devagar, e o próprio Cordel fica bem abaixo das medições
  anteriores (a troca de mão deu 42 e 48 quadros/s no bloco C; aqui, 23 e 31). Por isso vale a regra relativa da F5: com o Cordel abaixo de 50
  na mesma medida, a mesa com arte passa se perder no máximo 2 quadros/s para ele.
- **O portão (F5):** ≥ 50 quadros/s com a CPU 4×, ou, com o Cordel abaixo de 50, no máximo 2 quadros/s a menos que ele.

## Primeira rodada (as seis combinações em sequência: Cordel primeiro, depois as duas com arte)

`chegada` é o maior intervalo nos 300 ms depois do toque; `> 300` quer dizer que nenhum quadro caiu dentro da janela (o primeiro depois do
toque passou de 300 ms).

| Cena | Aparência | Tela | Quadros/s | p95 (ms) | Maior intervalo (ms) | Chegada (ms) | Partículas |
|---|---|---|---|---|---|---|---|
| A Ressurreição (`exodia-devastacao`, rodada 7, passo 27, 4,6 s) | Cordel | 1366 | 30 | 67 | 283 | 283 | 45 |
| | | 360 | 36 | 67 | 200 | 200 | 44 |
| | Bestiário + Egípcio | 1366 | 31 | 67 | 250 | 250 | 45 |
| | | 360 | 30 | 67 | 367 | 367 | 45 |
| | Celestial + Egípcio | 1366 | 28 | 67 | 250 | 250 | 45 |
| | | 360 | 34 | 83 | 267 | 267 | 44 |
| A troca de mão (`exodia-devastacao`, rodada 47, passo 236→237, 3 s) | Cordel | 1366 | 23 | 117 | 250 | 250 | 6 |
| | | 360 | 31 | 83 | 300 | 300 | 6 |
| | Bestiário + Egípcio | 1366 | 17 | 150 | 400 | > 300 | 6 |
| | | 360 | 20 | 133 | 417 | > 300 | 6 |
| | Celestial + Egípcio | 1366 | 18 | 150 | 417 | > 300 | 6 |
| | | 360 | 23 | 100 | 383 | > 300 | 6 |

**Leitura da primeira rodada:** na Ressurreição as diferenças vão para os dois lados (de +1 a −6), o que parece ruído. Na troca de mão (a mesa
mais cheia da fixture, com a rodada nova e as cartas distribuídas) as quatro comparações pioram de 5 a 11 quadros/s: **a F5 não passa ali**.
Mas o Cordel rodou sempre primeiro e as duas com arte depois, na bateria: o aquecimento e a carga pesam contra a arte. Próximos passos: o perfil
da troca de mão (Cordel e Bestiário + Egípcio) para achar a causa, e a medição de novo em ordem ABBA (Cordel, arte, arte, Cordel), com medianas.
