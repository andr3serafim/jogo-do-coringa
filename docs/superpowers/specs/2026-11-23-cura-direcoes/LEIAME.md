# Cura passiva: as direções

Protótipo descartável das direções da cura passiva e das placas só com a figura (`decisoes.md` 2026-11-23 (7) e (8)). Vale o que se vê
e o ritmo; o código não é para reaproveitar.

- `prototipo.html`: as três direções (A · Seiva, B · Gotas, C · Coração) e a de hoje, tocando sobre as fotos do jogo de verdade, no PC e
  no celular, com câmera lenta e movimento reduzido; embaixo, as placas só com a figura (passe o mouse ou toque).
- `prancha-pc.png` e `prancha-celular.png`: os quadros de cada direção (a câmera lenta do protótipo; o tempo na legenda é o do jogo).
- As fotos (`pc-antes.jpg`, `pc-depois.jpg`, `celular-*.jpg`) e as caixas das peças (`caixas.json`): a fixture `especiais`, rodada 29,
  passo 137 → 138 (o 7♥ cai da sua Defesa com 2 K na Guarda e 3 Q: 7 × 4 = +28), com os controles do replay escondidos.

**Como abrir:** com o `pnpm dev:web` rodando, copie a pasta para `packages/web/public/tmp-cura/` (fora do git: está no
`.git/info/exclude` desta máquina) e abra `http://localhost:5173/tmp-cura/prototipo.html`. Aberto direto do disco (`file://`), o navegador
pode recusar as fontes.

**Os scripts** (pedem o dev server da web): `fotos-cura.mjs <pasta>` tira as fotos e mede as caixas; `quadros.mjs <pasta> [pc|celular]`
tira os quadros das direções do protótipo servido em `tmp-cura/` e monta as pranchas. Rodam com `node <script> <pasta>`.
