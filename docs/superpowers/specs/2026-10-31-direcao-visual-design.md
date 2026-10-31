# Jogo do Coringa — Direção de arte e sensação de jogo (sub-projeto 6)

- **Data:** 2026-10-31. **Estado:** escrita depois do brainstorming com o autor; espera a aprovação dele.
- **Depende de:** a spec da web (`2026-10-17-interface-web-design.md`, sobretudo §4 animações, §10 direção visual), a do polimento
  (`2026-10-22-polimento-recursos-design.md`, sons) e as regras em vigor (spec 1 com os ajustes do sub-projeto 5).
- **Protótipo aprovado:** `docs/superpowers/specs/2026-10-31-direcao-visual-prototipo.html` (o rascunho 5). Vale o que se vê e o
  ritmo; o código dele é descartável. Para as fontes carregarem, sirva a raiz do repositório num servidor estático (ex.:
  `npx serve .`) e abra `/docs/superpowers/specs/2026-10-31-direcao-visual-prototipo.html`; aberto direto do disco, o navegador
  pode recusar as fontes e cair nas do sistema, o que não muda o movimento. Os botões abaixo da mesa tocam cada cena;
  "Recomeçar" volta a mesa ao início; a caixa "Movimento reduzido" mostra a versão sem tremor nem inversão.
- **Registro da conversa:** `docs/memoria/notas/direcao-visual.md` (as falas do autor, rascunho por rascunho).
- **Legenda:** **[A]** o autor decidiu ou aprovou vendo o rascunho; **[I]** decisão de quem escreveu, para o autor conferir;
  **[OBRIGATÓRIO]** restrição que já vale no projeto e não se negocia aqui.

---

## 0. Por quê, e o que é sucesso

O autor, depois de jogar (2026-10-31):

> Em momentos em que usei jogadas especiais e que virou o jogo não foi transmitido emoção e empolgação. O jogo tbm não está
> fluído e com movimentos suaves e com efeitos visuais marcantes. Em momentos de posse de inciativa eu não via.

E sobre a meta: "um polimento visual a nível de jogo Balatro", com "barras de HP no topo simulando jogos de arcade de luta", "o
visual completo mais intuitivo [...] como um jogo indie indicado ao melhor jogo do ano". As referências de emoção que ele deu
são as transformações e os golpes especiais de animes de luta (as cinemáticas que viram a batalha no momento-chave).

Três dores, três respostas:

1. **As especiais sem clímax** → cada uma das seis (Ataque Absoluto, Defesa Absoluta, Exódia, Devastação, Reflect,
   Ressurreição) ganha uma cena própria, com preparação, transformação, nome carimbado e impacto (§7).
2. **Sem fluidez nem peso** → o golpe comum com peso, a mesa com textura e cartas vivas (§5, §6), e um passe de fluidez nas
   jogadas comuns (§8).
3. **A iniciativa invisível** → ela sai da faixa do meio e vai para onde o olho está: uma espada presa ao retrato de quem ataca
   primeiro, no placar do topo (§3, §4).

### Objetivos

- O placar de jogo de luta no topo, a espada da iniciativa, o golpe comum, a mesa viva e as seis cenas, como no protótipo
  aprovado, no celular (360–430 px), no tablet e no PC, no treino e no jogo online.
- A mesma identidade de cordel (papel, tinta, a segunda cor vermelha, o ouro), agora com profundidade, luz e textura.

### Não-objetivos

- Mudar regra. Nenhum resultado de partida muda; `RULES_VERSION` e as partidas de referência ficam como estão.
- Arte desenhada à mão por artista, música de fundo, telas fora da mesa (início, lobby, partidas anteriores), o desenho do naipe
  (pergunta em aberto desde 2026-10-31 (8), outra tarefa).

### Anti-objetivos (falhas mesmo que "funcionem")

- Cena que não dá para pular com um toque, ou que tira tempo de decisão de alguém (§9).
- Flash fora dos limites de fotossensibilidade (§1).
- Copiar o desenho de qualquer anime ou jogo: as referências entram pela estrutura da cena, nunca pelo traço (§1).
- Efeito que trave o celular (cena abaixo de ~50 quadros por segundo num aparelho médio, §11).
- Perder legibilidade: vida, totais, prévia e relógio continuam lidos de relance, em texto, com algarismos tabulares.

---

## 1. Restrições que valem para tudo

- **[OBRIGATÓRIO] Fotossensibilidade** (spec da web §10.4): no máximo 1 inversão de tela inteira por cena, mantida por ≥ 300 ms;
  nunca mais de 3 transições claro ↔ escuro numa janela de 1 s; com movimento reduzido, nenhuma inversão. Os testes da linha do
  tempo cobrem isso e não se afrouxam. **[I]** Os raios pequenos em volta das auras (§7.1, §7.3) não contam como transição de
  tela: cada um ocupa menos de 3% da tela e dura 70–110 ms; nenhuma cena acende uma área maior que 25% da tela fora da sua
  única inversão.
- **[OBRIGATÓRIO] Arte original** (spec da web §10.6): tudo desenhado em código (SVG, CSS, `feTurbulence`) ou à mão pelo
  projeto. Nada decalcado de anime, de jogo ou de xilogravura existente.
- **[OBRIGATÓRIO] Números de jogo sem textura** (spec da web §10.7): vida, totais, dano, prévia e relógio na fonte de texto
  (Archivo), com `tabular-nums`; o tipo de madeira (Alfa Slab One) só nos títulos e carimbos.
- **[OBRIGATÓRIO] Sem regra na interface:** quem decide a iniciativa, a quadra, o dano e o alvo continua sendo o motor; as cenas
  só leem eventos e a visão.
- **[OBRIGATÓRIO] Movimento reduzido** (sistema ou menu do jogo): cada cena tem a versão reduzida do protótipo (sem tremor, sem
  inversão, sem voo: as peças aparecem e somem; as auras param de "ferver"; os títulos só esmaecem). A informação é a mesma.
- **[OBRIGATÓRIO] Orçamento:** JavaScript inicial ≤ 200 KB gzip (hoje ~150 KB). As cenas carregam sob demanda (§12).
- **[OBRIGATÓRIO] Toque e teclado** seguem iguais (WCAG 2.5.7); nada novo depende de passar o mouse.

---

## 2. O que o autor aprovou, e com quais mudanças

| Peça | Rascunho | Aprovação [A] |
|---|---|---|
| Placar de luta no topo, golpe comum | 1 e 2 | "Golpe comum está bom"; o placar não teve objeção em nenhum rascunho |
| Iniciativa: a espada e a fita | 2 | pediu a espada no lugar do círculo no rascunho 1; seguiu sem objeção do 2 ao 5 |
| Ataque Absoluto | 3 | "aprovado" |
| Defesa Absoluta | 3 | "aprovado", **sem a cúpula** (o arco dourado do fim) |
| Exódia | 4 | "aprovado", **sem os feixes** de energia dos K até o Coringa |
| Devastação | 5 | "aprovado" (o terremoto, depois de recusar o rasgo de tinta do 4) |
| Reflect | 5 | "aprovado" (espelho maior e o cometa, depois do 4) |
| Ressurreição | 5 | "aprovado" (mais celestial, com a quadra marcada) |

O protótipo guardado no repositório já tem as mudanças pedidas (sem a cúpula, sem os feixes).

---

## 3. O placar de luta no topo [A]

Substitui o nome e a barra de vida que hoje ficam em cada campo. É uma faixa de tinta no topo da mesa, de ponta a ponta:

- **Os lados:** você à esquerda, o oponente à direita **[I]** (como o primeiro jogador num jogo de luta; os campos continuam
  com você embaixo). Cada lado tem o retrato (o Coringa sobre a cor da capa do jogador: rosa para você, verde para o oponente),
  o apelido em tipo de madeira, a barra de vida e o número "319 /500".
- **A barra:** espelhada, encolhe na direção do retrato (o dano come do meio para fora). O preenchimento é ouro com brilho no
  alto; a vida perdida aparece hachurada, como já é hoje. **O rastro:** no golpe, a vida cai na hora e um segmento vermelho
  fica no lugar e escorre até a vida nova depois de ~0,5 s (no protótipo, 1,1 s no total). A cura faz o contrário: a barra cresce
  e o "+N" sobe (o que já existe).
- **A placa do meio:** "RODADA 7" e a fase ("ATAQUE"). **[I]** O placar de dano da iniciativa ("37 × 0", do bloco E3) mora logo
  abaixo da fase, em letra pequena, durante o Ataque.
- **Acessibilidade:** cada barra mantém o papel de medidor que já tem (`role="meter"`, valor e texto "319 de 500"); a placa é
  texto. A marca "novo" (spec da web §10.5) continua valendo para a vida.
- **Celular [I]:** a mesma estrutura, comprimida: retrato de ~40 px, barras de ~110 px, placa de ~56 px, apelido e número em
  letra menor. Nada rola de lado a 360 px, e o placar não passa de ~64 px de altura. No PC, ~96 px como no protótipo.
- **O que sai dos campos:** o nome, a barra e o número de vida de cada campo (o resto do campo fica). As marcas de estado (Defesa
  Absoluta, Cura passiva, Ressurreição, Ataque Absoluto armado) continuam no campo. **[I]** A Defesa Absoluta ativa também
  aparece no placar como uma insígnia de escudo no canto do retrato (§7.2).
- **O relógio [I]:** sai da faixa do meio e vai para a placa do placar, como o cronômetro entre as barras de um jogo de luta: o
  número grande no meio, "RODADA 7" em cima, a fase embaixo. Sem relógio (treino), o número da rodada fica grande no lugar dele.
  A urgência dos últimos 5 s segue a de hoje (cor e forma, sem piscar).
- **A faixa do meio [I]:** fica com o monte, o cemitério e a linha da fase por extenso ("Ataque · sua vez"). A marca e o texto da
  iniciativa saem dela (a espada os substitui, §4); o anúncio para leitor de tela (`aria-live`) continua, com o mesmo texto.
- **Os controles da mesa** (menu, histórico, som) ficam onde estão hoje.

## 4. A iniciativa: a espada e a fita [A]

- **Em repouso:** uma espada (lâmina de papel, guarda e pomo de ouro, punho de tinta) cruzada no canto do retrato de quem ataca
  primeiro, com a ponta virada para o oponente. A moldura desse retrato fica dourada. A cada ~3,4 s um lampejo corre pela
  lâmina (sem lampejo com movimento reduzido).
- **Quando a iniciativa muda** (evento `InitiativeDecided` com `changed`): a espada sobe, gira duas voltas num arco que passa
  pelo meio da mesa, com rastro, e crava no outro retrato, soltando faíscas e um tremor pequeno (~0,85 s). A moldura dourada
  troca de dono. Uma **fita de cordel** (faixa de papel com as pontas recortadas) desce do placar com "O BOT ATACA PRIMEIRO" (ou
  "VOCÊ ATACA PRIMEIRO") e o motivo em letra menor ("causou mais dano na rodada · 50 × 37").
- **Quando não muda [I]:** a espada dá um salto curto no mesmo retrato e brilha; a fita diz "VOCÊ SEGUE ATACANDO PRIMEIRO" com
  o motivo (ou o empate: "empate em dano · 40 × 40").
- **Substitui** a faixa do fim da rodada de Ataque do bloco E3 ("Bot causou mais dano (50 × 37) e segue com a iniciativa"). O
  tempo segurado na linha do tempo continua ~1,2 s fora do teto de decisão (o voo de 0,85 s mais a leitura da fita); a fita pode
  ficar até ~2,2 s enquanto a fase seguinte começa.
- **[I]** A fita é o padrão das faixas da mesa daqui em diante: as outras faixas curtas (Roubo, queimada, quadra formada) passam a
  usar a mesma forma, para a mesa ter uma voz só.

## 5. O golpe comum [A]

O dano de um ataque comum: um tremor curto da mesa (~4 px, 0,2 s), respingos de tinta no retrato de quem levou, o número do dano
carimbado (entra grande e girado, assenta e sobe), a barra com o rastro vermelho. É o patamar de baixo: as especiais têm de
parecer muito maiores que ele.

## 6. A mesa viva

- **Textura de papel [A]** (vista em todos os rascunhos desde o 2): um grão de papel impresso sobre os campos, feito com
  `feTurbulence` num SVG estático, em `multiply`. Não se mexe e não pesa.
- **As cartas da mão respiram [A]:** sobem e descem ~3 px num ciclo de ~3,6 s, cada uma num tempo; no PC, inclinam em 3D sob o
  ponteiro (até ~13°), com a sombra acompanhando. No toque, **[I]** a carta tocada sobe e se inclina levemente para o dedo. Sem
  nada disso com movimento reduzido.
- **A quadra marcada [A]:** as quatro cartas de uma quadra ficam diferentes das outras o tempo todo: moldura de ouro, fundo
  dourado claro, um losango de ouro no canto e um brilho que passa a cada ~3,2 s. Substitui o destaque atual da quadra (spec da
  web §3, "a quadra aparece destacada nas quatro cartas"); o "+V" no total continua.

## 7. As seis cenas especiais

### Gramática comum [A]

As referências do autor viram uma estrutura, não um desenho: **preparação** (a energia junta) → **transformação** (algo muda de
forma) → **nome carimbado** → **impacto** → **o rastro que fica na mesa**. Em todas:

- **Faixas de cinema:** tarjas pretas entram em cima (logo abaixo do placar) e embaixo; o placar continua visível, para ver a vida
  cair. A mesa escurece por baixo da cena.
- **Nome carimbado:** o nome da especial entra grande (escala 3 → 1 com um quique), fica ~1,2 s e sai crescendo. Cada uma tem a
  sua cor de carimbo (vermelho no Ataque, papel com filete de ouro na Defesa, ouro sobre tinta na Exódia, papel sobre tinta com
  sombra vermelha na Devastação, papel com filete de tinta no Reflect, papel com filete de ouro na Ressurreição). Sem legenda
  embaixo do nome [A].
- **O lado de quem joga [I]:** o protótipo mostra você jogando (e o Bot atacando no Reflect). Quando é o oponente, a cena se
  espelha: o personagem e a aura saem do lado dele, os golpes vão para o seu retrato, a insígnia e o rastro ficam no campo dele.
- **Pular:** um toque na mesa encerra a cena e mostra o estado final (o que já existe para as cenas raras).
- **Uma inversão por cena**, no instante indicado em cada uma (na Ressurreição, nenhuma).
- **As cartas da cena são cópias [I]:** os J que entram no Coringa, os Q que cravam no escudo, os K dos pilares e o K, o J e o Q
  do espelho são desenhos da cena. Quando ela acaba, cada carta de verdade está onde o motor diz (o J gasto pelo Ataque Absoluto
  no cemitério e os outros nos buffs; os Q nos buffs; as cartas do Reflect no cemitério), pelas batidas de movimento que já
  existem.
- **No celular em pé [I]:** a faixa da cena ocupa a altura entre o placar e a mão; o personagem fica no meio, na horizontal; o
  feixe, o cometa e os golpes sobem até o retrato do alvo no placar, num ângulo mais fechado. Os tamanhos encolhem na proporção da
  largura (o protótipo é um palco de 1000 × 560 px), mas a ordem dos passos e os instantes da inversão não mudam.

As durações abaixo são as do protótipo e entram em `RARE_SCENE_MS`; ajustes de até ~15% são do construtor.

### 7.1 Ataque Absoluto (~4,5 s) [A]

1. O Coringa de quem ataca entra numa faixa diagonal escura e é envolvido por uma **aura de energia** colada ao corpo: três
   camadas (ouro com contorno de tinta, ouro claro, branco-quente), pontas viradas para cima, maiores no alto, que trocam de
   forma a cada ~70 ms (a aura "ferve") e pulsam. Pedras saem do chão e flutuam; riscos de energia correm para cima.
2. Os 4 J giram em volta e entram no Coringa. Na entrada, os olhos acendem em ouro, a aura explode de tamanho, sai uma onda de
   choque, o chão racha em ouro dos dois lados, as pedras são arremessadas e raios pequenos estalam em volta até o fim.
3. "ATAQUE ABSOLUTO".
4. Uma bola de energia se forma na frente do Coringa e dela sai um **feixe grosso** (~176 px no protótipo, miolo branco, ouro,
   vermelho e tinta nas bordas) que atravessa a tela até o retrato do alvo no placar e segura o golpe por ~0,9 s, vibrando.
   **Inversão** no impacto; tremor forte; respingos; o dano carimbado; a barra com o rastro.

### 7.2 Defesa Absoluta (~4,8 s) [A]

1. Uma muralha de tijolos com ameias sobe do chão.
2. Um escudo-fortaleza (ameias no topo, aro de metal dourado gravado, campo esquartelado em papel e vermelho) **despenca do alto
   e crava** no chão: achata com o peso, levanta poeira dos dois lados e racha o chão.
3. Os 4 Q vêm voando e cravam um em cada quarto do brasão, cada um com o seu baque.
4. **A trava:** 22 rebites acendem em sequência na borda, o emblema da coroa crava no centro, um lampejo corre pelo escudo, uma
   onda de choque sai e raios suaves de ouro abrem por trás. **Inversão** na trava. **Sem a cúpula** [A].
5. "DEFESA ABSOLUTA"; o escudo encolhe e vira a **insígnia** no canto do retrato, que fica enquanto a Defesa Absoluta durar
   (até `AbsoluteDefenseEnded`).

### 7.3 Exódia (~5,8 s) [A]

1. Os 4 K saem da Guarda e chegam um por um, girando, e cada um ergue um **pilar de luz** do chão. **Sem feixes** de energia dos K até o
   Coringa [A].
2. O Coringa no centro ganha uma aura vermelha e dourada (a mesma técnica do Ataque, nas cores da Exódia), que cresce.
3. Uma **coroa** de metal desce do alto e crava na cabeça dele: a aura explode, os pilares estouram para os lados, uma onda de
   choque grande, raios em volta. **Inversão** na coroa.
4. "EXÓDIA", grande. A vida do perdedor escorre até zero e o retrato dele **racha** e perde a cor. Em seguida, o fim da partida
   (o painel de fim que já existe).

### 7.4 Devastação: o terremoto (~3,1 s) [A]

0. As cartas usadas para lançar (`DevastationCast`) vão ao cemitério como hoje, antes da cena.
1. **A terra ronca:** o campo do alvo escurece um pouco, o tremor cresce durante ~1 s, pedrinhas pulam na mesa e as cartas da
   fileira-alvo sacodem. O retrato de quem lançou brilha em vermelho.
2. Uma fenda corre ao longo da fileira.
3. **O chão se abre:** um abismo de verdade, com bordas irregulares (`feDisplacementMap`), a parede do fundo iluminada, escuro na
   profundidade; rachaduras correm pelo campo (as que descem não passam para o campo do outro). As cartas da fileira tombam,
   encolhem e escurecem para dentro do abismo. Sobem nuvens de poeira e voa entulho. **Inversão** na abertura.
4. "DEVASTAÇÃO".
5. **O campo desolado:** terra revirada em volta da fenda (textura de `feTurbulence`), pedras soltas e o campo do alvo com as
   cores apagadas (menos saturação, um tom de sépia). **[I]** A desolação fica enquanto a fileira devastada estiver vazia; quando
   uma carta volta a entrar nela, a fenda se fecha devagar (~0,6 s) e a cor do campo volta.
- **Refletida [I]** (`RowDevastated` com `reflected`): a mesma cena, mas a fenda se abre na fileira de quem lançou, logo depois
  do espelho do Reflect (§7.5).
- **Cancelada [I]** (`DevastationCanceled`, por Reflect contra Reflect ou Defesa Absoluta): a terra ronca, a fenda começa a
  correr e para; o tremor morre, sem abismo, sem nome. Uma fita diz o motivo (o texto que já existe).

### 7.5 Reflect: o espelho e o cometa (~3,7 s) [A]

No jogo, o Reflect acontece em dois momentos: quando o defensor o joga na janela de reação (`ReflectPlayed`) e quando o ataque
bate nele (`ReflectTriggered`). **[I]** A cena se divide assim:

- **Ao ser jogado:** o K, o J e o Q voam da mão para as três pontas de um **espelho triangular grande** (~300 px no PC), com
  moldura de ouro e reflexos no vidro, que se forma diante do campo do defensor com um tinido, faíscas nas pontas e um lampejo.
  O espelho fica ali (no lugar da zona "Reflect ativo") até o ataque.
- **Quando o ataque bate:** o golpe do atacante vem como um **cometa** — antes, uma esfera vermelha junta energia (fios que
  convergem) na fileira dele; depois sai com cabeça brilhante, cauda dupla, dois anéis girando e um rastro de brasas. Perto do
  espelho, o tempo quase para (o cometa se arrasta ~1 s). Ele bate: a superfície do espelho **ondula**, **inversão**, faíscas, e
  o cometa volta **dourado e maior** até o retrato do atacante, com o dano devolvido. O espelho se quebra em cacos e as três
  cartas caem.
- **Cancelado** (`ReflectCanceled`, Reflect contra Reflect): os dois espelhos se trincam e somem, sem cometa.
- **Contra a Defesa Absoluta** (o Reflect segura, mas não devolve): o cometa bate e se desfaz no espelho, sem voltar.

### 7.6 Ressurreição: a quadra chama o céu (~4,9 s) [A]

1. **A quadra responde:** as quatro cartas da quadra que deu a Ressurreição (§6) acendem, sobem um pouco e soltam fios de luz até
   o alto da mesa.
2. **O céu se abre** sobre o cemitério: um portal de luz, raios suaves que giram devagar e plumas que descem.
3. Uma coluna de luz desce até o cemitério, com estrelinhas.
4. **Uma carta** sobe do cemitério ainda sem cor, com uma auréola em cima; no alto, a cor volta, com um anel de luz e uma chuva
   de estrelas. (Cada quadra dá uma Ressurreição, de uma carta numérica: spec 1.)
5. "RESSURREIÇÃO"; a carta voa para o fim da fileira escolhida e assenta com um brilho. **Sem inversão.**
- **[I]** Qual quadra acende: a que gerou a Ressurreição usada. Se a quadra já se desfez (a Ressurreição continua disponível), os
  fios saem do lugar onde ela estava, sem cartas acesas.

## 8. Fluidez das jogadas comuns [I]

O autor reclamou de falta de fluidez em geral, e os rascunhos cobriram as especiais, o golpe comum e a mesa viva. Para o resto,
os mesmos princípios, sem cena nova:

- **Antecipação e assentamento:** a carta jogada sai da mão com um recuo curto, voa na mola que já existe (`LAYOUT_SPRING`) e
  assenta com um achatamento leve (escala ~1,06 → 1) e um sopro de poeira pequeno.
- **Quebras:** K que quebra, Armadilha e Sacrifício ganham estilhaços de carta (os cacos do protótipo da Devastação, em menor
  escala), em vez do só tremer.
- **Compra e Equipar:** as cartas chegam do monte em leque, uma depois da outra (~40 ms de diferença), não juntas.
- **Teto:** nada disso aumenta o teto de decisão (`DECISION_CAP_MS`); o que não couber encurta.
- Como não houve rascunho, este item fecha com o autor jogando a primeira fatia que o tiver (§14), não por protótipo.

## 9. O relógio durante as cenas [I]

As cenas aprovadas duram de 3 a 6 s, e o servidor hoje não para o relógio (30 s por turno, 8 s na janela de reação, 40 s no
Equipar). Uma cena de 5 s comeria 1/6 do turno de quem joga em seguida, sem culpa dele. A proposta:

- **O servidor dá folga de cena:** quando um passo produz um evento de cena rara (os seis acima), o prazo da decisão seguinte
  ganha a duração dessa cena (a mesma tabela de durações, num lugar só, lida pelo servidor e pela web). Pular a cena não dá tempo
  extra a ninguém: a folga é fixa. Duas cenas no mesmo passo (ex.: a Devastação refletida) somam, até um teto de 8 s. A decisão
  que ganha a folga é a que tem o prazo calculado nesse passo (o turno seguinte, a janela de reação ou o Equipar).
- **O relógio na tela:** durante a cena, o relógio mostra o tempo da decisão sem a folga, parado, e começa a correr quando ela
  acaba (ou é pulada), para ninguém ver "35 s" num turno de 30.
- Isso é mudança no núcleo do servidor (`timing.ts`) e na forma do prazo que a sala guarda; se estado antigo não servir, sobe
  `STATE_SCHEMA` (as salas abertas encerram no deploy, como já é a regra).
- No treino (sem relógio), nada muda.

## 10. Som [I]

O som segue o pico de cada cena, com o sintetizador que já existe (nada de arquivo de áudio novo): um ronco que cresce na
preparação, o impacto no instante da inversão, o tinido do metal na Defesa e na coroa, o estrondo do chão na Devastação, o sino
de vidro no espelho, um acorde que sobe na Ressurreição. Respeita o volume e o "sem som" que já existem, e nada toca antes de um
gesto do usuário.

## 11. Desempenho [I]

- **Meta:** ≥ 50 quadros por segundo nas cenas num celular médio (perfil de CPU 4× mais lento no Chromium) e 60 no PC.
- **Limites:** no máximo ~60 partículas vivas ao mesmo tempo; texturas de `feTurbulence` desenhadas uma vez (estáticas), nunca
  animadas quadro a quadro; o "ferver" das auras troca o atributo `d` de três caminhos pré-calculados, nada de calcular forma a
  cada quadro; animação por `transform` e `opacity` sempre que der.
- **Mais leve no celular:** se a cena medir abaixo da meta, corta primeiro partículas e o brilho (`drop-shadow`) das auras, nunca
  a estrutura da cena.

## 12. Onde mora

- `packages/web`: o placar substitui a parte de vida do `PlayerField` e entra na `Table`; a espada e a fita no placar; as cenas
  como tipos novos em `SceneKind` e `RARE_SCENE_MS` (`model/timeline.ts`), desenhadas num módulo de cenas carregado sob demanda
  (pré-carregado quando a mesa monta, para a primeira cena não esperar a rede) e fora do JavaScript inicial; a desolação e a
  insígnia como estado da mesa derivado da visão e dos eventos.
- `packages/server` (só para §9): a folga de cena no prazo.
- **O motor não muda**, salvo se faltar informação num evento para a cena (ex.: qual quadra gerou a Ressurreição). Se faltar,
  acrescenta-se o campo no evento, sem mudar resultado de partida; o digest da regra é conferido.

## 13. Testes

- **Linha do tempo:** as durações novas, o pulo, o teto de decisão e os limites de fotossensibilidade (uma inversão por cena, nenhuma
  na Ressurreição, nada com movimento reduzido) para cada cena e para as variações (refletida, cancelada, lado do oponente).
- **Mesa:** o placar (os dois lados, os medidores acessíveis, o rastro), a espada no retrato certo nos dois casos (muda e segue), a
  fita com o motivo, a quadra marcada, a insígnia da Defesa Absoluta e a desolação (entra e sai).
- **E2E:** o placar sem rolagem de lado a 360, 390 e 430 px; uma cena rara pulada por toque; o tempo de decisão depois de uma cena
  (online, com a folga do §9).
- **Servidor:** a folga de cena no prazo, no núcleo com relógio falso.
- **Desempenho:** uma medição registrada (não um teste da CI) das seis cenas no Chromium com CPU 4× mais lenta.
- **Olho do autor:** cada fatia termina com ele jogando no treino; o protótipo é a referência de "pronto".

## 14. Ordem de entrega

Cada fatia é uma branch com `pnpm check`, `pnpm e2e` e as duas CI verdes, e vai para a `main` sozinha:

1. **A base:** o placar de luta, a espada e a fita, o golpe comum, a textura de papel, as cartas vivas, a quadra marcada e a
   folga de cena no servidor (§9).
2. **Ataque e Defesa Absolutos.**
3. **Exódia e Devastação** (com a desolação).
4. **Reflect e Ressurreição.**
5. **Fluidez das jogadas comuns** (§8) e o som das cenas (§10).

## 15. Pronto quando

- As seis cenas, o placar, a espada, o golpe comum e a mesa viva estão na `main`, iguais ao protótipo no que ele mostra, nos dois
  lados e nas variações.
- Os limites do §1 seguem cobertos por teste, e a meta do §11 foi medida.
- O autor jogou cada fatia e não pediu mudança, ou pediu e ela entrou.

## 16. Fica para quem constrói

- Os tamanhos exatos do placar em cada largura, respeitando os limites do §3.
- Ajustes de até ~15% nas durações e as curvas de cada movimento, mantendo a ordem dos passos de cada cena.
- Como o "ferver" é trocado (WAAPI, `requestAnimationFrame` ou SMIL), desde que siga o §11.
- O texto exato das fitas novas (§4, quando a iniciativa segue) dentro da voz que o jogo já tem.
