# Decks e raças do Coringa: desenho

> **Spec aprovada pelo autor em conversa** (`decisoes.md` 2026-11-10 (2)); **ele ainda não leu este arquivo**. Nasceu num brainstorming
> pelo app, sem shell na pasta: nada daqui foi commitado nem testado. A arte é provisória (SVG), para os testes. Cada fatia da §11 vira
> um plano, que ele aprova antes da execução, como nos blocos do playtest. A arte dos três decks e da raça Egípcia está aprovada como
> provisória (2026-11-10 (2) e 2026-11-11 (1)) e já está nos caminhos da §5.

- **Origem:** o pedido e as dez respostas do autor em `decisoes.md` 2026-11-10 (2).
- **Depende de:** a spec da web (`2026-10-17-interface-web-design.md`, §3 a carta, §10 a direção visual), a da direção visual
  (`2026-10-31-direcao-visual-design.md`, que não muda) e a do servidor (`2026-10-16-servidor-multiplayer-design.md`, §3 e §4).
- **A arte aprovada, numa folha:** `docs/superpowers/specs/2026-11-10-decks-e-racas-arte.webp` (o Bestiário, o Celestial e a raça
  Egípcia, nessa ordem). Os rascunhos com as cartas montadas ficaram num canvas privado do autor, fora do repositório.
- **Fora do motor:** nenhuma regra muda. `RULES_VERSION`, `STATE_SCHEMA` e `PROTOCOL_VERSION` ficam como estão (§8.4).

## 0. Por quê, e o que é sucesso

O autor quer vender decks e raças do Coringa na loja quando o jogo for para a Steam, e quer que as cartas com ilustração de criatura
sejam um diferencial sem deixarem de ser cartas de baralho. Esta spec entrega a **estrutura** disso e uma arte provisória para testar:

- o jogador escolhe um **deck** (a aparência das numéricas, do 2 ao 10) e uma **raça do Coringa** (a aparência de J, Q, K, A, do
  Selvagem e do retrato);
- a mesa mostra, de cada lado, o deck e a raça do dono daquele lado, também no online;
- a raridade da numérica se vê pela moldura e pela aura, sem texto.

**Sucesso:** com a aparência padrão, o jogo fica idêntico ao de hoje (nenhum teste existente muda); com um deck fantasy, o valor e o
naipe se leem tão depressa quanto no cordel nos três tamanhos de carta; dois jogadores com aparências diferentes veem cada um o lado do
outro como o outro escolheu; trocar a arte provisória pela pintada depois é trocar arquivos, sem tocar em código.

**Fracasso mesmo funcionando:** a carta fantasy virar um quadro bonito que não se lê na fileira de 44 px; a mesa cair abaixo de
50 quadros/s com a CPU 4×; o JavaScript inicial passar de 200 KB; o Cordel mudar de cara.

## 1. O que o autor decidiu

| Assunto | Decisão |
|---|---|
| Convivência com o cordel | Decks são skins: o baralho atual é o deck **Cordel**; mesa, placar e cenas não mudam |
| Decks nos testes | Três: **Cordel** (padrão), **Bestiário** e **Celestial** |
| Raças nos testes | Duas: **Bufão** (as especiais de cordel) e **Egípcia** (Coringa Anúbis). **[I]** Ele corrigiu a conta dos decks, não a das raças |
| Especiais | Artefatos lendários da raça: J a arma, Q a proteção, K a insígnia de realeza, A o objeto da trapaça, o Selvagem é o Coringa |
| Arte | SVG provisório agora; a pintada (modelo de imagem ou ilustrador) depois, no mesmo formato de arquivo |
| Número e naipe | Sobre a arte, os dois na mesma cor de metal da carta; em jogo, o número 10% menor que no rascunho 2 |
| Raridade | Cinco faixas pelo valor, vistas na moldura e na aura; nenhum texto na carta |
| Criaturas | Reconhecidas de relance ("seja mais intuitivo"): nada de ser inventado |
| Quem vê o quê | Cada lado da mesa com a aparência do dono; o cemitério com a de quem olha; vale para deck e raça |
| Dependência | `@fontsource/cinzel` autorizada |

As faixas, nas palavras dele: 2–3 criaturas menores, de anatomia simples; 4–5 criaturas maiores, de formas mais elaboradas; 6–7 seres
ancestrais, de poderes sobrenaturais; 8–9 criaturas colossais; 10 entidade única, de visual quase divino.

## 2. O modelo

Mora em `@coringa/protocol` (sem Zod), porque a web e o servidor usam os dois:

```ts
export const DECK_IDS = ['cordel', 'bestiario', 'celestial'] as const;
export const RACE_IDS = ['bufao', 'egipcio'] as const;
export type DeckId = (typeof DECK_IDS)[number];
export type RaceId = (typeof RACE_IDS)[number];
export interface Look { deck: DeckId; race: RaceId }
export const DEFAULT_LOOK: Look = { deck: 'cordel', race: 'bufao' };
/** Qualquer coisa → uma aparência válida: id desconhecido vira o padrão, e a trava da §2.1 é aplicada. */
export function normalizeLook(input: unknown): Look;
```

### 2.1 A trava

O deck `cordel` só anda com a raça `bufao`: numéricas de papel com artefatos dourados do mesmo lado da mesa ficam incoerentes. Os outros
decks aceitam as duas raças. `normalizeLook({ deck: 'cordel', race: 'egipcio' })` devolve `{ deck: 'cordel', race: 'bufao' }`.

### 2.2 A faixa

`tierOf(value)`: 2–3 → 1, 4–5 → 2, 6–7 → 3, 8–9 → 4, 10 → 5. É só um número, na web; não há nome de raridade em lugar nenhum.

### 2.3 Os conteúdos

| Deck | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|
| `bestiario` | Morcego | Aranha | Lobo | Urso | Grifo | Fênix | Hidra | Kraken | Dragão Ancestral |
| `celestial` | Borboleta | Beija-flor | Cervo Branco | Unicórnio | Pégaso | Leão Alado | Águia Gigante | Baleia Celeste | Arcanjo |

| Raça | K (Guarda) | J (bônus de ataque) | Q (bônus de defesa) | A (Armadilha ou Roubo) | Selvagem e retrato |
|---|---|---|---|---|---|
| `bufao` | as cartas de cordel de hoje | idem | idem | idem | o Coringa de hoje |
| `egipcio` | Máscara do Faraó | Khopesh de Rá | Escudo de Hórus | Adaga de Set | Coringa Anúbis |

Uma criatura por valor: os quatro naipes do 7 mostram a mesma Fênix, e o naipe vem do símbolo.

## 3. Quem veste cada carta

A aparência é do **lugar** onde a carta está, não da carta (os dois jogadores compram do mesmo monte):

| Onde | Aparência |
|---|---|
| Fileiras de ataque e defesa, Guarda e bônus de um jogador | a desse jogador |
| A minha mão, o painel do Equipar, o fantasma do arrasto | a minha |
| A mão do oponente (os versos) | o verso do deck dele |
| O cemitério (a prévia no centro e o diálogo) e o monte | a de quem olha |
| O retrato do Coringa no placar | a raça de cada jogador |
| A carta grande do momento da especial do oponente (`Moment.tsx`) | a de quem jogou |
| As cópias de carta dentro das cenas (`Resurrection.tsx`, `Devastation.tsx`) | a do jogador de quem a cena fala |

- **A carta que muda de lado** (o Roubo, a Ressurreição que sai do cemitério) troca de aparência ao ser montada no lugar novo, no
  começo do voo. O autor foi avisado e aceitou conferir no playtest.
- **As seis cenas** seguem em cordel, com o Coringa de cordel (`Exodia.tsx`, `AbsoluteAttack.tsx`), para qualquer raça. Cena por raça é
  outro projeto.
- **O replay** mostra as aparências gravadas com a partida (§7.3).

Na interface isso é um contexto, para a carta não saber de dono nem de regra:

- `LooksProvider` (em `PlayTable` e no `ReplayViewer`): guarda `{ viewer: PlayerId, looks: Record<PlayerId, Look> }`.
- `LookZone owner={playerId}`: envolve cada lado (`PlayerField`) e os lugares do que olha (a mão, o cemitério, o Equipar).
- `useLook()`: a aparência do `LookZone` mais próximo. **Sem provedor, devolve `DEFAULT_LOOK`**: todo teste e toda tela que não
  conhecem aparência continuam em cordel.

## 4. A face nova da carta

`Card.tsx` continua sendo o único componente de carta. A face de cordel (`Face`) não é tocada. Quando a aparência do lugar pede arte
(numérica com deck diferente de `cordel`; J, Q, K, A ou Selvagem com raça diferente de `bufao`), entra a `ArtFace`:

- **A imagem** cobre a carta inteira (`<img alt="" decoding="async">`, decorativa: o nome acessível continua na carta). A moldura da
  faixa já vem desenhada na imagem.
- **O valor** (ou a letra), em Cinzel 900, na cor de metal da carta, com sombra escura para o contraste. Fica onde o cordel o põe: em
  cima à esquerda.
- **O naipe**, na **mesma cor de metal**, com a mesma sombra: embaixo à direita na carta de campo e na mini, em cima à direita na mão.
- **O Selvagem** não tem valor nem naipe; em campo ganha a letra do papel (`as`), como hoje.
- **O papel escrito na mão** (`roleText`, "Guarda", "Bônus de ataque"…) continua, no metal, sobre uma faixa escura embaixo.

| Tamanho | Valor | Naipe |
|---|---|---|
| `field` | 40% da largura (`40cqw`; o cordel usa 47) | 34% da largura |
| `mini` | 40% de `--mini-w` | 34% de `--mini-w` |
| `hand` | 31% de `--hand-w` (o cordel usa 38,5) | 21% de `--hand-w` |

Esses números são os do rascunho 3, que ele aprovou, já com os 10% a menos.

### 4.1 A aura e o anel

- **O anel:** um fio de 1,5 px na cor de metal, por dentro da borda de tinta, nas cartas `field`, `mini` e `hand`.
- **A aura:** um brilho por fora, na cor de metal, que cresce com a faixa: nenhum na 1; 5 px a 35% na 2; 8 px a 50% na 3; 10 px a 60% na
  4; 14 px a 80% na 5. As especiais de raça usam a da faixa 3.
- **Os dois são elementos filhos** (`data-anel-arte`, `data-aura`), como o `data-anel-quadra`: o `box-shadow` da carta é só do halo de
  foco e do anel ouro (comentário no topo do `Card.tsx`), e isso não muda.
- A aura é parada (nada pisca); não entra na conta de fotossensibilidade.

### 4.2 Os estados que a carta já tem

| Estado | Na `ArtFace` |
|---|---|
| `quad` | o anel e o brilho da quadra de hoje (`QuadMarks`) por cima; no lugar do fundo `QUAD_FACE`, um véu de ouro a 25% sobre a imagem |
| `grave` | `grayscale` e a opacidade de hoje (valem para a imagem) |
| `draft` | borda tracejada e 70% de opacidade, como hoje |
| `marked`, `front`, `selected`, `target`, `disabled`, `idle` | iguais: são da carta, não da face |
| `FxOverlay`, a queda, o recuo, o pouso | iguais |

### 4.3 O verso e o retrato

- **O verso** (`CardBack`, 18 × 26 px na mão do oponente): duas cores e uma borda por deck, em CSS, sem imagem. Cordel: as listras de
  hoje. Bestiário: violeta escuro com fio de ouro. Celestial: azul com fio de ouro.
- **O retrato** (`FightHud`): `bufao` usa o `<Coringa>` de hoje; `egipcio`, uma imagem quadrada do Anúbis no mesmo lugar e tamanho
  (`size-[82%]`). A rachadura, a insígnia e os efeitos do retrato ficam por cima, como estão.

### 4.4 As cores de metal

Cada carta com arte tem uma cor de metal no catálogo (§5). As do Bestiário: Morcego `#d9cdb8`, Aranha `#cfdad6`, Lobo `#d6e2f2`, Urso
`#ead9a8`, Grifo `#ffe9b8`, Fênix `#ffe2b0`, Hidra `#f0e0a0`, Kraken `#f0d995`, Dragão `#ffd75a`. A raça Egípcia: `#ffd98a` nas cinco. As do
Celestial: Borboleta `#d6e6ff`, Beija-flor `#d9f2e6`, Cervo Branco `#f0e6b8`, Unicórnio `#f2e0ff`, Pégaso `#f2f6ff`, Leão Alado `#ffe9a8`,
Águia Gigante `#ffe9b8`, Baleia Celeste `#dfe9ff`, Arcanjo `#ffe27a`. São as cores dos rascunhos que ele aprovou.

O Pégaso e o Arcanjo têm o fundo mais claro do conjunto: são as duas cartas em que o número depende mais da sombra, e as primeiras a
olhar nas fotos da §9.

Com o naipe na cor do número, copas e ouros deixam de ser vermelhos nas cartas com arte: quem separa os naipes é a forma, que no jogo já
é distinta para cada um (`Suit.tsx`). O autor decidiu assim.

## 5. O catálogo e os arquivos

```
packages/web/art/                    as origens (SVG), fora do bundle, com o LEIAME.md de como viraram WebP
  bestiario/   02-morcego, 03-aranha, 04-lobo, 05-urso, 06-grifo, 07-fenix, 08-hidra, 09-kraken, 10-dragao (.svg)
  celestial/   02-borboleta, 03-beija-flor, 04-cervo-branco, 05-unicornio, 06-pegaso, 07-leao-alado, 08-aguia-gigante,
               09-baleia-celeste, 10-arcanjo (.svg)
  egipcio/     k-mascara, j-khopesh, q-escudo, a-adaga, coringa-anubis (.svg)
packages/web/src/looks/
  catalog.ts                         o que é pequeno e síncrono: nomes, cores de metal, cores do verso   (a fazer, fatia 1)
  bestiario/   os nove .webp, com os nomes das origens; o index.ts com as URLs (import.meta.glob) é da fatia 1
  celestial/   idem
  egipcio/     os cinco .webp e o retrato-anubis.webp (256 × 256)
  art.css                            a fonte Cinzel e os estilos da ArtFace, no chunk das aparências    (a fazer, fatia 1)
```

- **Uma imagem por carta**, WebP de 416 × 582 px (a carta da mão do computador a 3×, com folga). Medido nos arquivos como estão no disco: o
  Bestiário inteiro tem 182 KB, o Celestial 234 KB e a raça Egípcia 108 KB (com o retrato); a carta mais pesada tem 35 KB. Cada
  arquivo leva cerca de 6 KB de credencial de conteúdo (C2PA), embutida quando a conversa do app o gravou; sem ela seriam 131, 182 e
  74 KB. Não muda o desenho e some quando a arte for reexportada.
- **Carregamento:** o chunk de um deck ou de uma raça é pedido por `import()` quando a sala (ou as preferências, no treino) o cita. A
  mesa espera o chunk, que é pequeno; as imagens entram por cima de um fundo escuro do tamanho da carta, sem pulo de layout, e são
  aquecidas (`new Image()`) assim que o chunk chega. **Nada disso entra no JavaScript inicial.**
- **CSP:** `img-src 'self' data:` já serve; nada muda no `_headers`.
- **A fonte:** `@fontsource/cinzel`, só o peso 900 e o subconjunto latino, importada no `art.css` (fora do CSS inicial), com a linha nova
  no `packages/web/LICENSES.md`.
- **A troca pela arte pintada**, depois: substituir os `.webp` com os mesmos nomes e ajustar as cores de metal no `catalog.ts`.
- **A regra "Arte original" do `CLAUDE.md`** continua valendo para a arte provisória (desenho próprio, em SVG). Quando a pintada vier de
  um modelo de imagem, a regra precisa de uma decisão do autor; não é desta spec.

## 6. O seletor

- **No Início** (`Home.tsx`), um painel "Aparência" com dois grupos de opção (`radiogroup`, por toque e teclado): **Deck** (Cordel,
  Bestiário, Celestial) e **Coringa** (Bufão, Egípcio). Ao lado, três cartas de amostra do que está escolhido (uma baixa, uma alta, uma
  especial).
- Com o deck Cordel, o grupo do Coringa fica travado no Bufão, com uma linha dizendo por quê.
- A escolha mora em `coringa:prefs` (`Prefs.look`, lida com `normalizeLook`: quem não tem o campo fica no padrão).
- **No menu da partida** (`GameMenu.tsx`), o mesmo painel, **só no treino**. No online ele aparece apagado, com "a aparência da sala é
  a que você tinha ao entrar".

## 7. Treino, tutorial e replay

### 7.1 Treino

A minha aparência vem das preferências e pode mudar no meio da partida (é só desenho). O bot usa o **deck seguinte** ao meu na lista
(`cordel → bestiario → celestial → cordel`), com a raça natural dele (`cordel` com `bufao`, os outros com `egipcio`): toda partida de
treino mostra dois estilos na mesa, que é o que os testes querem ver. **[I]** A regra do bot é minha.

> **Substituída pelo plano da fatia 2, aprovado** (`decisoes.md` 2026-11-12 (1), escolha G1): com o Cordel, o bot também fica no Cordel
> (com o Bufão), para a aparência padrão não mudar o treino (§0, §14); com um deck de arte, o bot joga com o **outro** deck de arte, com a
> raça Egípcia. A aparência do bot acompanha a sua troca no meio da partida (G2).

### 7.2 Tutorial

Sempre em `DEFAULT_LOOK`, dos dois lados: as dicas falam das cartas como elas são no cordel, e a semente fixa e os E2E não mudam.

### 7.3 Replay

A partida guardada (`past-games.ts`) ganha `looks?: { me: Look; opponent: Look }`, montado campo a campo como o resto e lido com
`normalizeLook`. Partida antiga, sem o campo: padrão dos dois lados. O replay online usa o que a mensagem `room` trazia no fim da partida.

## 8. Online

### 8.1 Protocolo

- `SeatInfo.look?: Look` (em `messages.ts`).
- Os corpos de `POST /api/rooms` e de `POST /api/rooms/:code/join` aceitam `look?: { deck: string; race: string }` (textos de até
  32 caracteres, objeto estrito). O `join` ganha um esquema próprio (`JoinRoomBodySchema`); o de criação, o campo novo.
- `createRoom` e `joinRoom` (`client.ts`) e a `RoomApi` da web ganham o parâmetro opcional.

### 8.2 Servidor

- `SeatRecord.look?: Look`. O roteador passa o corpo; o núcleo grava `normalizeLook(body.look)`. **Id desconhecido não é erro**: vira o
  padrão. Não há código de erro novo.
- `roomMessage` (`views.ts`) devolve o `look` de cada assento.
- A revanche mantém os assentos, logo a aparência.
- **A posse fica para a loja:** hoje o servidor só confere se o id existe. O lugar da conferência futura é o `normalizeLook` do núcleo.

### 8.3 Web

- O Início e a entrada por link (`RoomGate.tsx`) mandam a aparência das preferências ao criar e ao entrar.
- Na sala, as aparências dos **dois** lados vêm dos assentos da mensagem `room` (a minha também: é a que o oponente vê). Mudar a
  preferência com a sala aberta não muda a sala.

### 8.4 Compatibilidade

Tudo é campo opcional, como o `hp` da sala e o `clockRunsFrom` da partida: sala gravada antes do deploy não tem `look` e vale o padrão;
cliente e servidor saem do mesmo deploy. Por isso `STATE_SCHEMA` (6) e `PROTOCOL_VERSION` não sobem, e nenhuma partida de referência
muda. Se o plano da fatia 3 achar um motivo para subir um deles, para e pergunta.

## 9. Restrições que valem para tudo

- **Orçamento:** JavaScript inicial ≤ 200 KB gzip (o smoke confere). Catálogo, imagens, fonte e `art.css` ficam em chunks pedidos depois.
- **Desempenho:** a meta do projeto, 50 quadros/s com a CPU 4×. A mesa cheia de cartas com arte é medida com o `e2e/medir-cena.ts` na
  fatia 1 (a fixture `exodia-devastacao`, com a aparência forçada). Se a sombra do número e do naipe custar caro, a saída é trocar o
  desfoque por um contorno de 1 px; se a imagem custar, uma segunda largura (208 px) com `srcset`.
- **Leitura:** o valor e o naipe se leem nos três tamanhos e nas duas larguras de mesa (360 px e computador), conferidos em fotos. Os
  cantos de cima à esquerda e de baixo à direita de toda imagem já vêm escurecidos para isso; a arte pintada tem de manter.
- **Acesso:** o nome acessível da carta não muda ("7 de copas, sai primeiro, novo"); a imagem é decorativa. O seletor funciona por
  teclado e toque, com rótulo no nome. O axe continua limpo.
- **Fotossensibilidade:** nada novo pisca nem inverte.
- **Sem regra na interface** e **Node puro fora da web:** o que entra em `@coringa/protocol` é sintaxe apagável, com imports em `.ts`.
- **Idioma:** textos em pt-BR, identificadores em inglês.

## 10. Testes

- **Protocolo:** `normalizeLook` (padrão, id desconhecido, a trava, entrada que não é objeto); os esquemas com e sem `look`.
- **Servidor:** a sala criada e a entrada gravam a aparência normalizada; `roomMessage` a devolve; registro antigo sem o campo; a
  revanche a mantém.
- **Web, modelo:** `tierOf`; as preferências com e sem `look`; a aparência do bot; a partida guardada com e sem `looks`.
- **Web, interface:** a `Card` sem provedor desenha o cordel de hoje (os testes atuais não mudam); com aparência, desenha a `ArtFace`
  com o valor, o naipe, o anel e a aura da faixa; cada estado da §4.2; `LookZone` por lado; o cemitério e a mão com a de quem olha; o
  retrato por raça; o seletor (a trava do Cordel, o teclado, o menu apagado no online).
- **E2E:** um treino com o Bestiário (a mesa, a mão e o cemitério, com foto a 360 px e no computador); duas abas com aparências
  diferentes, cada uma vendo a do outro no lado do outro; o axe nas telas novas.
- **Smoke:** o orçamento de 200 KB e nenhum `.webp` pré-carregado pelo `index.html`.
- **Medição:** §9, com a tabela em `docs/memoria/notas/`.

## 11. Entrega

**A arte já está nos caminhos da §5** (as origens e os WebP), gravada em 2026-11-11 pela conta que desenhou, **sem commit**: quem abrir a
branch da fatia 1 a commita primeiro (`feat(web): a arte provisória dos decks e da raça egípcia`).

1. **Fatia 1, a carta e o seletor:** `Look` e `normalizeLook` no protocolo; o catálogo e os chunks; a `ArtFace` com os estados; o
   `LooksProvider` com a mesma aparência (a minha) dos dois lados; o painel no Início e no menu do treino; as preferências; a medição.
   Mostra tudo no treino.
2. **Fatia 2, o dono por lado:** `LookZone` em cada lado, a mão, o cemitério, o monte e o Equipar; o bot; o verso por deck; o retrato
   por raça; o momento e as cópias das cenas; a partida guardada e o replay.
3. **Fatia 3, o online:** os esquemas, o roteador, o assento, a mensagem `room`; o Início e a entrada por link; a sala lendo os
   assentos; os testes do servidor e o E2E de duas abas.

Cada fatia: branch própria saída da `main` (depois do merge do bloco C), teste primeiro, `pnpm check`, as duas CI verdes, e a
memória (`estado.md`, `diario.md`) como manda o `CLAUDE.md`.

## 12. Fora desta spec

- A loja, os preços e a conferência de posse no servidor.
- A arte pintada. O caminho para produzi-la fora daqui está em `docs/superpowers/specs/2026-11-11-biblia-de-arte.md` (o contrato de
  cada arquivo, a descrição de cada carta e os pedidos prontos para uma ferramenta de IA de desenho ou um ilustrador).
- As cenas especiais por raça e o Coringa de raça dentro das cenas.
- Uma carta ampliada para ver a arte (toque longo ou passar o mouse). **[I]** Vale a pena antes da loja: na fileira a arte tem 44 a
  56 px, e é na ampliada que um deck comprado se mostra.
- Trocar de aparência no meio de uma partida online.
- Verso ilustrado; nome de raridade; o empacotamento para a Steam.

## 13. Escolhas minhas, para conferir ao ler

O autor aprovou o desenho em seis partes pela conversa. Estes pontos estavam lá em uma linha, ou nasceram ao escrever:

1. **[I]** O bot usa o deck seguinte ao seu (§7.1). Na conversa, com dois decks, era "o que você não escolheu". **Substituída** pela G1 do
   plano da fatia 2 (a nota na §7.1).
2. **[I]** O tutorial fica sempre em cordel (§7.2). Não foi perguntado.
3. **[I]** Id de aparência desconhecido vira o padrão, sem erro (§8.2). Na conversa: "valida contra a lista de ids".
4. **[I]** No online, a minha aparência também vem do assento, e a preferência mudada depois não vale para a sala aberta (§8.3). Na
   conversa: "fixa ao entrar na sala".
5. **[I]** O verso é só cor, sem imagem (§4.3). Na conversa eu disse que entregaria "o verso do Bestiário"; a 18 px uma imagem não se vê.
6. **[I]** Uma largura de imagem só, 416 px (§5), com a segunda como saída se a medição pedir.
7. **[I]** A carta que muda de lado troca de aparência no começo do voo (§3). Ele aceitou conferir no playtest.
8. **[I]** O véu de ouro de 25% na quadra com arte (§4.2). Não foi mostrado.

**O que ele ainda não viu:** as seis outras cartas do Bestiário uma a uma (Aranha, Lobo, Urso, Grifo, Hidra, Kraken: foram mostradas
juntas e ele seguiu sem comentar); o retrato do Anúbis recortado; o painel "Aparência". O deck Celestial ele viu e aprovou como
provisório (2026-11-11 (1)).

## 14. Pronto quando

- Com a aparência padrão, `pnpm check` e `pnpm e2e` passam sem tocar em nenhum teste existente.
- No treino, os três decks e as duas raças se escolhem no Início e no menu, e cada lado da mesa mostra o do seu dono.
- No online, duas pessoas com aparências diferentes veem a mesa como a §3 manda.
- O valor e o naipe se leem nas fotos de 360 px e do computador, nos três tamanhos de carta.
- A medição da §9 está na nota, com a meta cumprida ou a saída aplicada.
- O autor jogou e disse que serve para os testes.

## 15. O que a execução decidiu (fatia 1)

Executada em 2026-11-11 na branch `feat/decks-fatia-1`, pelo plano `docs/superpowers/plans/2026-11-11-decks-fatia-1.md`. As `Ruling:` de cada
tarefa estão no `docs/memoria/diario.md` 2026-11-11 (1).

- **As escolhas F1 a F7, como ficaram:**
  - **F1:** a aparência vale no treino (fora do tutorial) e no replay. Na sala online o menu não mostra o seletor, e a mesa fica em Cordel; no
    Início, o painel "Aparência" diz "Por enquanto vale no treino.". (A §6 pedia o seletor apagado no online; vale a F1, aprovada depois.)
  - **F2:** o número leva um contorno de tinta de 1 px nas quatro direções mais um halo de 4 px (`text-shadow`, sem filtro); o naipe, um traço
    de tinta de 2,5 unidades do `viewBox` por fora (`paint-order: stroke`).
  - **F3:** o pacote que não chega deixa a carta de cordel, sem erro e sem aviso (a promessa rejeitada fica guardada até recarregar).
  - **F4:** o replay usa a aparência de agora, dos dois lados.
  - **F5:** passa (abaixo).
  - **F6:** `Prefs.look` é opcional; o `DEFAULT_PREFS` não mudou.
  - **F7:** no Claude Code local, tarefa por tarefa, teste primeiro, com um revisor novo no fim.
- **O provedor envolve o palco inteiro** (`LooksProvider` em volta do `Stage`, no `PlayTable` e no `ReplayViewer`), e não só a mesa: o
  momento da especial e as cópias das cartas que saem moram no `Stage` e vestem a mesma aparência.
- **A aura e o anel:** o anel é uma borda de 1,5 px na cor de metal; a aura é o único `box-shadow` da face, num filho, com os números da §4.1.
  O véu de ouro da quadra fica por baixo do valor e do naipe.
- **A fonte** chega num CSS de chunk (`src/looks/font.css`), e não num `art.css` (§5): os estilos da `ArtFace` são classes do Tailwind, do CSS
  de sempre.
- **A medição** (`docs/memoria/notas/medicao-decks-fatia-1.md`), na tomada, com a CPU 4×: na troca de mão da `exodia-devastacao` (236→237, a
  mesa mais cheia dela) a arte dá 50 quadros/s no PC e 55 no celular, contra 56 e 58 do Cordel; a Ressurreição fica em 60. **A F5 passa, no
  limite no PC.** O custo é de pintura (o perfil: a rasterização dobra), não de decodificação. As saídas 1 (o número sem halo) e 2 (a aura
  sem desfoque) foram medidas e **não mudaram nada**: foram desfeitas, e a carta é a aprovada. A terceira (a imagem de 208 px) não foi
  preciso tentar. Na bateria, a CPU desta máquina varia demais para a medição decidir.
- **Depois do merge (2026-11-12), a Devastação:** medida para o plano da fatia 2, ela **não passa no celular**: 46 e 47 quadros/s com arte,
  contra 55 do Cordel (no PC, 50 e 51 contra 50). O custo é o recálculo de estilo das cartas da mesa inteira, que já acontece no Cordel e
  dobra com a face com arte; a imagem numa camada própria não mudou nada. A nota da medição (seção "Antes da fatia 2") tem os números e o
  perfil; a decisão é do autor.
- **As fotos** (fora do repositório; o diário diz onde): o valor e o naipe se leem nos três tamanhos, nas duas larguras e nas duas aparências,
  inclusive no Pégaso e no Arcanjo e nas minis de 30 px da Guarda e dos bônus. Nada mudou por causa delas.
- **O JavaScript inicial** foi de 179,9 para 182,7 KB (gzip): a `ArtFace`, o contexto e o catálogo. Os módulos de URLs, as imagens e a fonte
  ficam fora, e o smoke confere.

## 16. O que a execução decidiu (fatia 2)

Executada em 2026-11-12 na branch `feat/decks-fatia-2`, pelo plano `docs/superpowers/plans/2026-11-12-decks-fatia-2.md`, aprovado com as G1 a
G8 (`decisoes.md` 2026-11-12 (1)). As `Ruling:` de cada tarefa estão no `docs/memoria/diario.md` 2026-11-12 (2).

- **As escolhas G1 a G8, como ficaram:**
  - **G1 (substitui a §7.1):** o bot veste `botLook(a sua)`: com o Cordel, o Cordel com o Bufão; com um deck de arte, o outro, com o Egípcio.
  - **G2:** recalculada a cada desenho; trocar a sua no menu troca a dele, sem remontar a mesa.
  - **G3 (tira a F4 da fatia 1):** a partida guardada leva `looks: { me, opponent }`, e o replay veste as gravadas; sem elas, Cordel dos dois
    lados, e a preferência de agora não entra. **O treino em Cordel não grava `looks`:** a linha fica a de hoje, e o replay dela já é Cordel.
  - **G4:** o tutorial e o online seguem em Cordel e não gravam `looks`.
  - **G5:** os 8 Minor da fatia 1 entraram (Task 1). A promessa rejeitada do `loadPack` sai do mapa: uma nova montagem tenta de novo (a F3
    continua: a carta fica de cordel enquanto isso, sem erro).
  - **G6:** o verso da carta que vira no momento leva o deck de quem jogou (`.momento-verso[data-verso-deck]`).
  - **G7:** abaixo.
  - **G8:** inline, tarefa por tarefa, teste primeiro; um revisor novo no fim.
- **Um provedor só e o `LookZone` sem DOM** (§3): em volta de cada campo, de cada lado do placar, do momento e das cópias da Devastação (o
  dono da fileira) e da Ressurreição (quem ressuscita). Fora de zona, a de quem olha. As cópias das cartas que saem (`Leaving`) clonam a face
  que a carta tinha; as quatro cartas da figura da cena rara seguem em cordel.
- **O verso (§4.3):** duas cores e uma borda em classes (`BACK_CLASS`, no `catalog.ts`): o Bestiário violeta escuro com fio de ouro, o
  Celestial azul com fio de ouro; o do Cordel é o de hoje, sem o atributo `data-verso-deck`. Nas fotos, os dois se distinguem a 360 (18 × 26 px).
- **O retrato (§4.3):** o Anúbis (`retrato-anubis.webp`) chega no próprio `import()` do pacote da raça e é aquecido com as imagens; no placar,
  `img` decorativo a 82%, com a rachadura, a insígnia e a espada por cima, como antes. Sem ele (o Bufão, o pacote por chegar ou falho), o
  Coringa de cordel.
- **O que já chegou** fica num módulo à parte (`src/looks/ready.ts`) e entra no próprio desenho: o provedor que nasce depois do pacote, ou a
  troca para um deck já carregado, não passa pelo cordel. As telas (o treino, com o módulo da sala; o replay, ao achar a partida) pedem os
  pacotes antes de a mesa montar.
- **A medição (G7)** (`docs/memoria/notas/medicao-decks-fatia-2.md`), na tomada, com a CPU 4×, a `main` e a branch na mesma sessão: na troca de
  mão (236→237) a perda da arte para o Cordel ficou em 7 e 4 quadros/s (PC e celular), contra 8 e 4 na `main`; na Devastação (210→211), 2 e
  7, contra 0 e 5. **Passa:** nenhuma perda cresce mais de 2. O retrato do Anúbis custa ~1 quadro/s no PC e nada no celular. Uma primeira
  rodada, só da branch, dera +3 na troca de mão: era ruído.
- **Um defeito da Task 1, achado na medição:** o pedido adiantado podia resolver entre o desenho do provedor e o efeito dele, e a carta ficava
  de cordel para sempre; um teste o reproduz. O conserto final (depois da revisão): o provedor assina a loja do `ready.ts`
  (`useSyncExternalStore`), e todo pacote que chega, por qualquer pedido, acorda a mesa (também depois de uma falha passageira, quando outro
  pedido, como o da amostra do menu, o traz).
- **A revisão (G8, um subagente novo):** nenhum Critical nem Important; os 6 Minor entraram nesta fatia: a loja assinada (acima), a figura
  da cena rara em cordel (`CORDEL_LOOKS`, como manda a §3), as cores do verso nas variáveis `--verso-*` do `styles.css` (que o `BACK_CLASS` e
  o `.momento-verso` usam), e três testes que passaram a provar o que dizem (o Roubo com o mesmo id, o Equipar e o cemitério do replay).
- **As fotos** (fora do repositório; o diário diz onde): o J do bot no Egípcio dele, os versos dos dois decks a 360, o Anúbis no retrato com a
  espada por cima, as cópias da Devastação e da Ressurreição do bot na Celestial dele. Nada mudou por causa delas.
- **O JavaScript inicial** foi de 182,7 para 183,8 KB (gzip).
