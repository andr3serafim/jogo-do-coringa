# Medição: o vídeo do dragão como logo LUSACAN (2026-11-19)

Origem: `decisoes.md` 2026-11-19 (2). O vídeo de origem é do autor (`Dragon_flying_in_night_sky_e8417f02_1080p.mp4`, gerado no Google
Veo: credencial C2PA "Created by Google Generative AI" e marca d'água SynthID) e não está no git; quem assume pede o arquivo a ele.

## O original

- 3,92 s, 24 qps (94 quadros), 1920 × 1080, H.264 High, 5,2 Mb/s; áudio AAC 141 kb/s; 2 647 029 bytes.
- O índice (`moov`) vem depois dos dados (`mdat`): sem `+faststart`.
- Brilho médio por quadro (a cada 1/24 s, luminância relativa): de 0,19 a 0,24, sem salto. A regra de fotossensibilidade passa.
- Celular em pé (390 × 844): cortado (`cover`), o "LUSACAN" sai pelas bordas; inteiro (`contain`), uma faixa de ~1/4 da altura.

## As variantes (todas sem áudio)

Comando (FFmpeg 9.0.2, `winget install Gyan.FFmpeg`), com `<crf>` e `<largura>`:

    ffmpeg -i origem.mp4 -an -vf scale=<largura>:-2:flags=lanczos -c:v libx264 -preset slow -profile:v high -crf <crf> -pix_fmt yuv420p -movflags +faststart saida.mp4

O pôster (o último quadro): `ffmpeg -sseof -0.05 -i origem.mp4 -frames:v 1 -vf scale=1280:-2:flags=lanczos -c:v libwebp -quality 80 poster.webp` (49 KB).

| Variante | Bytes | VMAF (contra o original) | SSIM |
|---|---:|---:|---:|
| original 1080p | 2 647 029 | — | — |
| H.264 720p CRF 24 | 783 931 | 88,0 | 0,986 |
| **H.264 720p CRF 27** | **557 283** | **82,8** | **0,983** |
| H.264 540p CRF 25 | 455 019 | 76,5 | 0,979 |
| AV1 (SVT) 720p CRF 36 | 505 693 | 62,8 | 0,968 |
| AV1 (SVT) 720p CRF 40 | 389 957 | 61,2 | 0,967 |

- O AV1 fica em VMAF ~65 em qualquer CRF (26: 1 005 891 bytes, 65,97; 30: 791 991, 65,15): erro sistemático da medição (provável
  espaço de cor no WebM), não da compressão; os quadros batem (94 em todos). Não foi adiante: o ganho de peso sobre o H.264 é pequeno e o
  H.264 toca com decodificação por hardware em qualquer aparelho (o iPhone antigo inclusive).
- O quadro final do CRF 27 lado a lado com o original (o texto "LUSACAN / PRODUCTIONS", as escamas): sem diferença visível.

## Rede e desempenho

Edge (H.264) pelo Playwright, 390 × 844, cache desligado, CPU 4× mais lenta, servidor local com `Range` (206). "4G" = 9 Mb/s, 85 ms;
"3G" = 1,6 Mb/s, 300 ms. Tempos em ms desde o `src`; "travadas" conta o `waiting` (1 é o do começo).

| Arquivo | Rede | 1º quadro | Fim (3,92 s de vídeo) | Travadas | Quadros perdidos |
|---|---|---:|---:|---:|---:|
| original | 4G | 699 | 4 664 | 1 | 0 |
| original | 3G | 2 080 | **16 221** | 4 | 6 |
| H.264 720p CRF 27 | 4G | 173 | 4 096 | 1 | 0 |
| H.264 720p CRF 27 | 3G | 662 | 4 589 | 1 | 0 |
| H.264 720p CRF 24 | 4G | 177 | 4 096 | 1 | 0 |
| H.264 720p CRF 24 | 3G | 662 | 5 123 | 3 | 2 |

- **Escolha: H.264 720p CRF 27** (557 KB, −79%): no 3G começa em 0,66 s e toca sem travar; o CRF 24 já trava no 3G.
- Para comparar: o pedaço da abertura de hoje (`Intro-*.js`) tem 7,2 KB comprimidos; com o vídeo, a primeira visita a `/` baixa mais
  ~606 KB (o vídeo e o pôster), fora do pacote inicial e sem segurar o menu (o Início monta por baixo).

## A conferir no porte

- Se os static assets do Worker respondem `Range` com 206 (o Safari exige para `<video>`): conferir no `wrangler dev` e no E2E.
- Os tempos: 3,92 s de vídeo + a parte das cartas de hoje (5 350 − 2 150 = 3 200 ms) dá ~7,1 s, acima do teto de 6 s da capa ao menu.
