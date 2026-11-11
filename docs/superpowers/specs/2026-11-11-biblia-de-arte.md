# Bíblia de arte dos decks e das raças: como refazer a arte fora daqui

> Escrita em 2026-11-11 a pedido do autor (`decisoes.md` 2026-11-11 (3)): a arte de hoje é **provisória**, em SVG, e ele quer poder
> levá-la a uma ferramenta de IA de desenho ou a um ilustrador **sem depender de quem a fez**. Este documento é o que essa pessoa ou
> ferramenta precisa. Não muda código: é o contrato dos arquivos e a descrição de cada carta.

- **A spec do recurso:** `docs/superpowers/specs/2026-11-10-decks-e-racas-design.md` (§4 a face da carta, §5 os arquivos).
- **A arte de hoje, numa folha:** `docs/superpowers/specs/2026-11-10-decks-e-racas-arte.webp`.
- **As origens:** `packages/web/art/` (SVG, com o `LEIAME.md`). **O que o jogo carrega:** `packages/web/src/looks/` (WebP).

## 1. O que é de quem

- Os 23 SVG e os 24 WebP são arquivos comuns, em formatos abertos, **no repositório do autor**. Abrem em qualquer editor de vetor
  (Inkscape, Illustrator, Figma, Affinity) e em qualquer navegador. Nada neles depende de uma conta, de um serviço ou de um programa
  específico.
- Os SVG foram desenhados por código numa conversa com o Claude. O programa que os gerou **não** está no repositório e não é preciso:
  o SVG é a origem.
- Os arquivos gravados por aquela conversa levam uma credencial de conteúdo (C2PA) embutida, dizendo que o Claude forneceu o arquivo.
  É metadado: não muda o desenho, e some quando a arte for reexportada por outra ferramenta.

## 2. O contrato de uma carta (vale para qualquer arte nova)

Quem refizer uma carta entrega um arquivo que obedece a isto, e o jogo o aceita sem mudar código:

1. **Proporção 5:7**, em pé. O jogo usa WebP de **416 × 582 px**, qualidade perto de 82. Guardar a origem maior (ou em vetor) em
   `packages/web/art/`.
2. **O mesmo nome de arquivo** da carta que substitui (a tabela da §4).
3. **Nada escrito na imagem:** nem número, nem letra, nem naipe, nem assinatura, nem marca d'água. O valor e o naipe são postos pelo
   jogo, por cima.
4. **Dois cantos calmos e escuros:** o de cima à esquerda e o de baixo à direita, cada um com cerca de 40% da largura e 35% da altura.
   É ali que ficam o número e o naipe, numa cor clara de metal. Detalhe claro nesses cantos apaga o número.
5. **Uma figura só, no centro, reconhecida de relance.** A carta aparece com 44 a 56 px de largura na mesa: reduzir a imagem a 44 px e
   conferir se ainda se sabe o que é. Silhueta forte vale mais que detalhe.
6. **Uma criatura por valor:** os quatro naipes do 7 usam a mesma imagem.
7. **A moldura.** Hoje a moldura da faixa de raridade vem desenhada na imagem (um fio simples na faixa 1, cantos e gemas na 4, ouro
   com luz na 5). A arte nova mantém uma moldura do mesmo peso **ou** vem sem moldura nenhuma; nesse caso avisar, para o jogo desenhar
   a dele. Não misturar dentro de um deck.
8. **A cor de metal.** Cada carta tem uma cor clara (a tabela da §4) usada no número, no naipe, no anel e na aura. Se a paleta da arte
   nova mudar, escolher outra cor de metal que contraste com os dois cantos e avisar: ela mora em `packages/web/src/looks/catalog.ts`.
9. **A escada de raridade** se vê sem texto: da faixa 1 à 5 crescem o tamanho e a imponência da criatura, o ornamento, a luz.

| Faixa | Cartas | O que o autor pediu |
|---|---|---|
| 1 | 2 e 3 | Criaturas menores, anatomia simples |
| 2 | 4 e 5 | Criaturas maiores, formas mais elaboradas |
| 3 | 6 e 7 | Seres ancestrais, poderes sobrenaturais |
| 4 | 8 e 9 | Criaturas colossais e extraordinárias |
| 5 | 10 | Entidade única, visual quase divino |

## 3. A direção

- **As referências do autor:** Dark Fantasy, Celestial Fantasy, Mythic Fantasy. Ele pediu **mais detalhe e realismo** do que o vetor
  provisório alcança, e criaturas **intuitivas**: nada de ser inventado ("muito fantasioso e esquisito até de imaginar" foi o motivo de
  uma carta reprovada).
- **Bestiário:** sombrio, noturno, luz de lua, de fogo e de relâmpago.
- **Celestial:** claro, azul, lilás e ouro, luz de aurora e de sol.
- **Raça Egípcia:** não são personagens, são **artefatos lendários** sobre um pedestal, numa tumba de lápis-lazúli e ouro, com
  hieróglifos apagados ao fundo. As cinco cartas dividem fundo e moldura, para a raça ser reconhecida como conjunto.
- **A regra dos papéis, para qualquer raça futura:** J é a arma, Q é a proteção, K é a insígnia de realeza, A é o objeto da trapaça, e
  o Selvagem é o próprio Coringa da raça.
- **Coerência dentro de um deck:** as nove cartas com a mesma ferramenta, o mesmo modelo, a mesma referência de estilo e a mesma
  sessão. Um deck com nove estilos parece nove decks.

## 4. As cartas

A composição descrita é a da arte provisória, que o autor aprovou; a arte nova pode melhorá-la, mantendo a criatura e a leitura.

### Bestiário (`bestiario/`)

| Arquivo | Carta | Faixa | Metal | A cena |
|---|---|---|---|---|
| `02-morcego` | 2 | 1 | `#d9cdb8` | Morcego de frente, asas abertas, contra a lua cheia, na boca de uma caverna com estalactites; violeta do crepúsculo |
| `03-aranha` | 3 | 1 | `#cfdad6` | Viúva-negra vista de cima, numa teia com orvalho; a ampulheta vermelha; preto e verde-azulado |
| `04-lobo` | 4 | 2 | `#d6e2f2` | Lobo cinzento de frente, cabeça e ombros, olhos âmbar; pinheiros e neve caindo; azul frio |
| `05-urso` | 5 | 2 | `#ead9a8` | Urso pardo de pé, rugindo, braços erguidos; floresta com feixes de luz; ocre e marrom |
| `06-grifo` | 6 | 3 | `#ffe9b8` | Grifo de perfil, sentado num penhasco, asas erguidas; nascer do sol sobre montanhas |
| `07-fenix` | 7 | 3 | `#ffe2b0` | Fênix subindo, asas para o alto, cauda em leque, brasas; carmim e preto com fogo dourado |
| `08-hidra` | 8 | 4 | `#f0e0a0` | Hidra de cinco cabeças saindo de um pântano, brilho verde tóxico, árvores mortas |
| `09-kraken` | 9 | 4 | `#f0d995` | Kraken saindo do mar em tempestade ao entardecer, tentáculos em volta de um veleiro pequeno |
| `10-dragao` | 10 | 5 | `#ffd75a` | Dragão dourado de frente, asas abertas, pousado num pico acima das nuvens, um halo de luz; azul da meia-noite |

### Celestial (`celestial/`)

| Arquivo | Carta | Faixa | Metal | A cena |
|---|---|---|---|---|
| `02-borboleta` | 2 | 1 | `#d6e6ff` | Borboleta azul luminosa vista de cima, sobre um campo de flores ao anoitecer |
| `03-beija-flor` | 3 | 1 | `#d9f2e6` | Beija-flor de perfil, parado no ar diante de uma flor rosa; corpo esmeralda, garganta rubi |
| `04-cervo-branco` | 4 | 2 | `#f0e6b8` | Cervo branco de frente, galhada dourada que brilha; clareira com feixes de luz e vaga-lumes |
| `05-unicornio` | 5 | 2 | `#f2e0ff` | Unicórnio branco, cabeça e pescoço de perfil, chifre dourado em espiral, crina em tons pastel; céu lilás |
| `06-pegaso` | 6 | 3 | `#f2f6ff` | Cavalo alado branco voando, de lado, subindo; sol e nuvens. **Fundo claro: cuidar dos dois cantos** |
| `07-leao-alado` | 7 | 3 | `#ffe9a8` | Leão alado de frente, juba dourada, asas brancas e douradas abertas; céu azul-real com estrelas |
| `08-aguia-gigante` | 8 | 4 | `#ffe9b8` | Águia colossal planando para quem olha; montanhas e um castelo minúsculos embaixo; o sol atrás |
| `09-baleia-celeste` | 9 | 4 | `#dfe9ff` | Baleia nadando no céu noturno entre nuvens, uma constelação no dorso, um barquinho embaixo, lua crescente |
| `10-arcanjo` | 10 | 5 | `#ffe27a` | Arcanjo de frente, grandes asas brancas e douradas, auréola, armadura dourada, espada com a ponta para baixo. **Fundo claro: cuidar dos dois cantos** |

### Raça Egípcia (`egipcio/`), metal `#ffd98a` nas cinco

| Arquivo | Carta | Papel | O artefato |
|---|---|---|---|
| `k-mascara` | K | Guarda | Máscara do Faraó: ouro, o nemes listrado de azul, a naja na testa, a barba trançada |
| `j-khopesh` | J | Bônus de ataque | Khopesh de Rá: a espada-foice em ouro, com um filete turquesa, inclinada |
| `q-escudo` | Q | Bônus de defesa | Escudo de Hórus: topo em arco, campo de lápis-lazúli, o olho de Hórus em ouro |
| `a-adaga` | A | Armadilha ou Roubo | Adaga de Set: lâmina de obsidiana com brilho vermelho, guarda de duas najas, rubi no pomo |
| `coringa-anubis` | Selvagem | o Coringa | Anúbis de perfil: chacal negro, nemes dourado e azul, colar largo |
| `retrato-anubis` | (placar) | o retrato | Recorte quadrado (256 × 256) da cabeça do Anúbis |

## 5. O caminho com uma ferramenta de IA de desenho

Serve para qualquer ferramenta que aceite uma imagem de referência (imagem para imagem, referência de composição ou de estilo).

1. **Tirar um PNG do SVG**, no tamanho que a ferramenta pedir. Três jeitos, do mais simples ao de linha de comando: abrir o `.svg` no
   navegador e salvar uma captura; abrir no Inkscape e exportar; ou `rsvg-convert -w 1248 -h 1746 carta.svg -o carta.png`.
2. **Dar o PNG como referência de composição** (a criatura, a pose, onde ficam os cantos escuros) e o texto da carta como pedido.
3. **Fixar o estilo do deck:** gerar primeiro uma carta (o 10 é a que mais pesa), aprová-la, e usá-la como referência de estilo das
   outras oito.
4. **Conferir o contrato da §2**, sobretudo os itens 3, 4 e 5. Reduzir a 44 px.
5. **Recortar em 5:7, exportar WebP de 416 × 582** e pôr no lugar, com o mesmo nome. Guardar a origem em `packages/web/art/`.
6. **Olhar no jogo** (o treino com o deck escolhido) e nas fotos de 360 px.
7. **Anotar a procedência** num arquivo `packages/web/art/PROCEDENCIA.md`: a ferramenta, o modelo, a data e o pedido de cada carta.

### O pedido, em inglês (as ferramentas respondem melhor)

O molde:

```
[SUBJECT, POSE AND SETTING], [PALETTE], fantasy trading card illustration, painterly, highly detailed, realistic anatomy,
dramatic rim lighting, volumetric light, single centered subject with a strong clear silhouette, vertical 5:7 composition,
dark empty top-left and bottom-right corners, no text, no numbers, no symbols, no border, no watermark
```

O que evitar (para as ferramentas que têm esse campo):

```
text, letters, numbers, playing card suit symbols, logo, watermark, signature, frame, border, multiple subjects,
extra limbs, deformed anatomy, blurry, low detail, photo collage, cartoon, chibi
```

O trecho `[SUBJECT, POSE AND SETTING], [PALETTE]` de cada carta:

- **Bestiário.** Somar ao molde: `dark fantasy, moody night atmosphere`.
  - 2: `a bat flying toward the viewer with wings fully spread, in front of a large full moon, framed by a cave mouth with stalactites, dusk violet and grey`
  - 3: `a black widow spider seen from above on a dew-covered web, red hourglass mark on its abdomen, deep teal and black`
  - 4: `a grey wolf, head and shoulders, facing the viewer, glowing amber eyes, snowy pine forest at night with falling snow, cold blue and silver`
  - 5: `a brown bear standing upright and roaring, paws raised, in an autumn forest with shafts of golden light, ochre and brown`
  - 6: `a griffin in profile sitting on a cliff edge with wings raised, sunrise over distant mountains, deep blue and orange`
  - 7: `a phoenix rising with wings raised and a long fanned tail of fire, embers in the air, crimson and black with golden flames`
  - 8: `a five-headed hydra rising from a misty swamp, toxic green glow, dead trees, olive and sickly green`
  - 9: `a colossal kraken emerging from a stormy sea at dusk, tentacles wrapped around a small sailing ship, crimson creature, teal sea, orange horizon`
  - 10: `an ancient golden dragon facing the viewer with wings spread, perched on a mountain peak above the clouds, a halo of light behind its head, midnight blue starry sky and gold`
- **Celestial.** Somar ao molde: `celestial fantasy, luminous, serene and majestic`.
  - 2: `a luminous blue butterfly seen from above with wings open, over a twilight meadow of small flowers, soft bokeh, blue and violet`
  - 3: `a hummingbird in profile hovering at a pink flower, emerald body and ruby throat, dawn garden, teal and warm gold`
  - 4: `a white stag, head and chest, facing the viewer, glowing golden antlers, a forest glade with god rays and fireflies, green and gold`
  - 5: `a white unicorn, head and neck in profile, golden spiral horn, flowing pastel mane, lilac twilight sky with stars`
  - 6: `a white winged horse in flight seen from the side, ascending, the sun and clouds behind, sky blue and gold`
  - 7: `a winged lion facing the viewer, golden mane, white and gold wings spread, royal blue starry sky, a ring of light behind`
  - 8: `a colossal eagle soaring toward the viewer with wings spread wide, tiny mountains and a tiny castle far below, the sun behind it, blue and warm gold`
  - 9: `a whale swimming through the night sky among clouds, a glowing constellation on its back, a tiny sailing ship below, crescent moon, deep blue and silver`
  - 10: `an archangel facing the viewer, large white and gold wings, a halo, golden armor, holding a sword point-down, a burst of heavenly light, clouds below, gold, white and deep blue`
- **Raça Egípcia.** Somar ao molde: `ancient Egyptian legendary artifact floating above a stone pedestal inside a lapis lazuli and gold tomb, faint hieroglyphs on the walls, a beam of light from above` (e tirar `realistic anatomy`).
  - K: `a golden pharaoh funerary mask with a blue-striped nemes headdress, a cobra on the brow and a braided beard`
  - J: `a golden khopesh sickle-sword with turquoise inlay, tilted, glowing`
  - Q: `an arch-topped shield with a lapis lazuli field and a golden Eye of Horus`
  - A: `an obsidian dagger with a red glow, a golden guard shaped as two cobra heads and a ruby pommel`
  - Selvagem: `the head of Anubis in profile, a black jackal with a gold and blue nemes headdress and a broad jeweled collar` (trocar `artifact floating above a stone pedestal` por `portrait`)

## 6. O que decidir antes de publicar

- **A licença da ferramenta:** conferir se os termos dela permitem uso comercial das imagens, e guardar a página dos termos junto da
  procedência.
- **A Steam:** o formulário de conteúdo do Steamworks tem uma seção de IA generativa, e o conteúdo gerado antes do lançamento que o
  jogador vê entra nela. Conferir a redação em vigor na hora de publicar:
  `https://partner.steamgames.com/doc/gettingstarted/contentsurvey`. A procedência do item 7 da §5 é o que responde a esse formulário.
- **A regra "Arte original" do `CLAUDE.md`** (§10.6: desenho próprio, em código, nada decalcado) foi escrita para o cordel. A arte
  pintada por um modelo de imagem pede uma decisão do autor sobre essa regra, registrada no `decisoes.md`, antes de entrar.
- **Um ilustrador humano** recebe este mesmo documento, a folha da arte e os SVG: o contrato da §2 e as tabelas da §4 são os mesmos.
