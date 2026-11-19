# A abertura LUSACAN nova: a prévia

A decisão é a de `docs/memoria/decisoes.md` 2026-11-19 (1). O autor mandou um vídeo de referência e pediu para ver antes de implementar.
O vídeo ficou fora do git: o repositório é público e o vídeo não é do projeto. Nele, um dragão roxo entra pelo alto à direita, contorna a
lua entre nuvens e pousa de frente, de asas abertas, e o nome aparece.

Nada do jogo mudou ainda. Esta pasta guarda só a prévia.

## O que tem aqui

- `dragao-frente.ts`: o dragão de frente, em vetor feito à mão. Só a metade esquerda é desenhada; a direita é o espelho. Quando a
  prévia for aprovada, a geometria vai para o `packages/web/src/ui/intro/lusacan-shapes.ts`.
- `gerar-prototipo.ts`: grava o projeto HyperFrames em `prototipo/`. Usa as letras Cinzel e a silhueta de perfil da logo de hoje
  (`lusacan-shapes.ts`) e o dragão de frente. O voo é amostrado quadro a quadro (30 por segundo) em poses de deslocamento, giro e
  escala, a mesma forma da Web Animations do jogo (`dragon-flight.ts`). Rode da raiz:
  `node docs/superpowers/specs/2026-11-19-intro-lusacan/gerar-prototipo.ts`.
- `prototipo/`: o projeto HyperFrames (1920 × 1080, 30 fps, 3,5 s). Os arquivos `index.html` e `compositions/logo.html` saem do
  gerador: mude o gerador, não eles.
- `quadros/`: as folhas de quadros da prévia, de 0,3 s a 2,95 s.

## Abrir a prévia

- **Studio do HyperFrames:** `npx hyperframes preview` dentro de `prototipo/`, ou o comando que o `hyperframes` do skill der.
- **Render em MP4:** precisa do FFmpeg, que esta máquina não tem. Quem instala é o autor.

## O ritmo (segundos)

| Instante    | O que acontece                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| 0 a 0,45    | O céu sai do escuro e o halo da lua acende.                                                            |
| 0,15 a 2,06 | O dragão de perfil entra pelo alto à direita, cruza a metade de baixo da lua e sobe pela esquerda      |
|             | (rolando o corpo). Depois cruza por cima da lua e mergulha no meio, recolhendo as asas.                |
| 2,06        | Ele vira de frente (troca de desenho em 2 quadros, no meio do mergulho).                              |
| 2,12 a 2,7  | As asas abrem de uma vez, passam um pouco do ponto e assentam. A direita vem um quadro depois da       |
|             | esquerda. Os olhos e os veios acendem, e o halo da lua cresce num brilho local, sem clarear a tela.    |
| 2,3 a 2,95  | O nome sobe letra a letra; "PRODUCTIONS" e os filetes vêm no fim.                                      |
| 3,0 a 3,3   | Esmaece para o escuro. No jogo, as cartas entram aqui.                                                 |

## O que falta decidir (com o autor)

- O desenho do dragão de frente e as cores (o céu azul-petróleo da referência, o roxo das asas).
- No jogo, o tempo da parte das cartas encolhe para a abertura inteira ficar abaixo dos 6 s.
- A versão de movimento reduzido: a pose final parada, com um esmaecer.
- O som: as batidas de asa do `synth.ts` mudam de lugar.
- O celular (retrato): a cena é larga, e no jogo o céu ocupa a tela toda, com a logo centrada.
