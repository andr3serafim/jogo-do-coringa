# Decisões do autor

A mais nova em cima. Cada entrada traz a data, o texto do autor entre aspas (ou em bloco, quando é longo) e depois a leitura de
quem registrou: **[I]** marca interpretação que ele não disse com essas palavras. Só se acrescenta; uma decisão que substitui
outra diz qual. As specs (`docs/superpowers/specs/`) guardam a regra já escrita; aqui fica a origem dela.

---

## 2026-11-07 (1): a placa do momento da Guarda com a linha do quinto caso

Perguntado "Aplico a mesma linha na placa do momento da Guarda?", depois de saber que a placa do momento em que o oponente põe K na Guarda
("com 2 K, a Defesa dele que cai o cura") tem a mesma imprecisão do quinto caso (no golpe comum seguinte, um K absorve, sobra 1 e aquele
golpe não cura; `diario.md` 2026-11-06 (1)), ele escolheu:

> Sim, aplique

**Leitura:**
- Com exatamente 2 K (o mínimo da cura, `config.defenseHealGuard`), a consequência da placa do momento passa a ser a mesma linha da placa
  de estado: "com 2 K depois do golpe, a Defesa dele que cai vira vida".
- **[I]** Com 3 K fica "com 3 K, a Defesa dele que cai o cura": o golpe que um K absorve deixa 2 e cura, a frase é verdadeira, e ele
  aprovou corrigir a imprecisão, não reescrever o caso que funciona.
- **[I]** O caso do seu Ataque Absoluto armado ("o seu Ataque Absoluto quebra todos os K") já estava certo e não muda.

---

## 2026-11-06 (1): o quinto caso de placa, as duas propostas aplicadas

Perguntado "Aplico as duas propostas do quinto caso de placa antes do deploy?", depois de ver na lista do que falta para a produção que
a placa "Cura passiva" ("a Defesa dele que cai vira vida") é o único texto que o motor contradiz (`estado.md` 2026-11-04, "Esperando o
autor"; `diario.md` 2026-11-04 (1)), ele escolheu:

> Sim, aplique

**Leitura:**
- **Contra o Ataque Absoluto armado do outro** (e sem o Reflect de quem tem a Guarda, que seguraria o golpe com os K inteiros), a placa
  troca de linha como nas outras quatro: "o Ataque Absoluto dele quebra os K antes da cura" (no seu campo) / "o seu Ataque Absoluto
  quebra os K antes da cura" (no dele). São as frases que ele viu.
- **Com 2 K na Guarda,** a linha de sempre fica mais clara: "com 2 K depois do golpe, a sua Defesa que cai vira vida" / "com 2 K depois
  do golpe, a Defesa dele que cai vira vida". **[I]** Ele viu "com 2 K depois do golpe, a Defesa que cai vira vida"; o "sua" e o "dele"
  seguem o lado de quem vê, como na linha de sempre. **[I]** Só com exatamente 2 K (o mínimo da cura, `config.defenseHealGuard`): com 3 K,
  o golpe que um K absorve deixa 2 e cura, e a linha de sempre é verdadeira; "com 2 K" ali confundiria quem tem 3.
- **[I]** O Absoluto vem antes do caso de 2 K: ele quebra a Guarda inteira, tenha ela 2 ou 3 K.

---

## 2026-11-04 (1): os quatro textos de placa que o motor contradiz

Perguntado "Corrijo os quatro textos de placa que o motor contradiz em casos de borda?", depois de ver a lista na mensagem de entrega do
bloco A ("imune até o golpe dele", "quebra todos os K", "o K absorve o próximo golpe inteiro" e "o próximo golpe volta para ele", cada um
com o caso em que o motor faz outra coisa; `diario.md` 2026-11-03 (6)), ele escolheu:

> Corrija os quatro

**Leitura:**
- **[I]** O texto de sempre fica como ele aprovou na spec §3; só no caso de borda a placa troca de linha, lida da mesa como o motor
  decide o golpe (`previewBetween`: o Reflect antes de tudo, depois a Defesa Absoluta, que só o Ataque Absoluto fura):
  - Defesa Absoluta, com o Ataque Absoluto do outro armado (e sem o seu Reflect): "o Ataque Absoluto dele fura a imunidade" / "o seu
    Ataque Absoluto fura a imunidade";
  - Ataque Absoluto armado, com o Reflect do alvo ativo: "o Reflect dele segura o seu golpe" / "o seu Reflect segura o golpe dele";
  - Reflect, com quem ataca sob Defesa Absoluta: "segura o próximo golpe dele, sem devolver" / "segura o seu próximo golpe, sem
    devolver";
  - a placa do momento do K, com o seu Ataque Absoluto armado (e sem o Reflect dele): "o seu Ataque Absoluto quebra todos os K"; fora
    disso, "o K absorve um golpe inteiro" (sem o "próximo", que também falhava com a Defesa Absoluta dele no caminho).
- **[I]** As frases novas são de quem escreveu, e ele ainda não as viu: conferir no playtest.

---

## 2026-11-03 (6): o plano do bloco E aprovado, com 15 s na janela

Ao plano `docs/superpowers/plans/2026-11-03-ressurreicao-quadra.md` (as escolhas da seção "Escolhas minhas" e a pergunta do prazo
online da janela, 15 s recomendado ou 10 s):

> Aprovo, 15 s

**Leitura:**
- O plano vale como está, com as 9 escolhas à vista dele: a chave `resurrectOnQuad` na config, a janela só com jogada, o jogador na
  janela até passar ou não ter mais jogada, o tempo esgotado que guarda (sem estouro), a janela também depois do 1º Equipar, a troca
  saindo como no Roubo, a troca sob Defesa Absoluta, as especiais paradas na janela e os bots que só ressuscitam sem piorar a mesa.
- **O prazo online da janela é de 15 s por jogador** (`TIMERS.resurrectionMs`), e a spec das regras §1.12 passa a dizer isso.
- **[I]** "Aprovo" responde também à forma de execução, que a mensagem não perguntou: a execução é desta sessão, tarefa por tarefa, com
  teste primeiro, como nas fatias.

---

## 2026-11-03 (5): o plano do bloco A aprovado

Perguntado "Aprova o plano do bloco A, com as escolhas A1 a A9?", sobre `docs/superpowers/plans/2026-11-03-playtest-bloco-a.md`, ele
escolheu:

> Aprovo como está

**Leitura:**
- As nove escolhas valem como recomendadas: A1 (a folga do servidor sempre cheia), A2 e A9 (a) (online, quem joga também espera o
  momento do outro, e a folga vale para os dois), A3 (o véu pela trava de flash), A4 (a placa fora do leitor de tela, como as faixas), A5
  (o total do motor na consequência), A6 (o Reflect fica na zona dele), A7 (a primeira cura da partida, de qualquer lado) e A8 (a
  execução aqui, tarefa por tarefa, na branch `feat/playtest-bloco-a`, com um revisor novo no fim).
- **[I]** Ele não respondeu à leitura de apagar sessões terminadas sem perguntar (2026-11-03 (4), "Sessões"): ela segue como está,
  e a próxima exclusão é anunciada a ele antes.

---

## 2026-11-03 (4): as respostas às 8 perguntas do desenho; a regra do 16

Às 8 perguntas da §9 do rascunho (`docs/superpowers/specs/2026-11-03-playtest-design.md`), com as recomendações que ele viu na
mensagem de entrega:

> 1. não aprovado. ao fazer a quadra o usuário deve ter opção de usar ressurreição antes do ataque, se as fileiras estiverem cheias, a última carta vai para o cemitério, desde que a última carta não seja uma carta da quadra formada, daí não é possível descarta-la.
> 2. ok.
> 3. ok.
> 4. não aprovado. não exibir texto, apenas uma aura nas cartas já é o suficiente.
> 5. ok.
> 6. ok.
> 7. ok.
> 8. ok aprovada. prossiga.
>
> Não deve ficar sub sessões pendentes, se a sessão do "Online: Equipar vazio não pode coretar o golpe final" estiver finalizada, apague a sessão.

Perguntado em seguida se, com as duas fileiras cheias, a troca da última carta vale só no instante da quadra ou também na Ressurreição
usada depois, na fase principal, ele escolheu a opção **"Também depois"**, cujo texto dizia: "Com as duas fileiras cheias, a Ressurreição
usada mais tarde também manda a última carta ao cemitério, com a mesma proteção: carta da quadra não sai."

**Leitura:**
- **Fatia 5 aprovada:** o sub-projeto 6 fecha.
- **Aprovados como recomendados:** a ordem dos blocos (A: 1, 2, 6 e 9; B: 15; C: 10, 11 e 13; D: 5 e 14; o E, o 16, em paralelo numa
  sessão própria); a variante A nos pontos 1, 2, 5, 14 e 15; a espada e o escudo comparando Ataque com Ataque e Defesa com Defesa; a aura
  da iniciativa contada pelo motor (as rodadas de Ataque seguidas, apagando quando a iniciativa troca; as salas online abertas fecham no
  deploy); o momento da especial do oponente estendendo o prazo online da decisão.
- **"prossiga":** o rascunho vira spec com as respostas, e o plano do bloco A é escrito para ele aprovar antes da execução, como nas
  fatias. **[I]** As escolhas da §10 do rascunho que ele não comentou ficam na spec como escolhas minhas, à vista dele; nenhuma foi
  recusada.
- **Ponto 4 (os 3 K):** nenhum texto. **[I]** Os 3 K na Guarda ganham só a aura (a brasa vermelha), nos dois campos (a Guarda é
  pública); a coroa tracejada do protótipo também sai, porque ele disse "apenas uma aura nas cartas". O resto da escada do ponto 10 fica.
- **A regra do 16** (substitui a §7.2 do rascunho):
  - **Quando:** ao formar a quadra, o dono pode usar a Ressurreição dela antes do ataque. **[I]** Para a quadra da revelação do Equipar,
    é uma janela logo depois da revelação, antes da escolha da ordem do Ataque. A quadra que nasce na fase principal (pelo Roubo ou pela
    própria Ressurreição) já está no turno do dono, antes do ataque dele: ali a Ressurreição já vale, como hoje.
  - **Opcional** ("deve ter opção"): **[I]** quem não usa guarda a Ressurreição, que segue valendo como hoje (na fase principal, enquanto
    a quadra existir, com a garantia de 3 rodadas).
  - **Iniciativa:** com os dois formando quadra na mesma revelação, quem tem a iniciativa decide primeiro (o "respeitando obviamente a
    iniciativa" do ponto 16 original); **[I]** o outro decide vendo a jogada dele.
  - **Fileiras cheias:** a última carta vai ao cemitério e a ressuscitada entra no lugar dela. **[I]** "As fileiras cheias" são as duas,
    como na troca do Equipar (spec das regras §1.4): com vaga numa delas, a carta entra no fim da que tem vaga, como hoje.
  - **A proteção da quadra:** a última carta que é da quadra não sai. **[I]** "A última" é a do fim da fileira escolhida: se a de uma
    fileira é da quadra, a ressuscitada só pode ir para a outra; se as duas são, a Ressurreição não pode ser usada naquele instante e
    fica guardada. **[I]** "Da quadra" é toda numérica da fileira com o valor de uma quadra que está nela (com 5 iguais, as 5 são a
    quadra, como na regra das 8 iguais), não só a quadra que acabou de se formar: a troca nunca desfaz uma quadra.
  - **Também depois:** a troca, com a mesma proteção, vale em toda Ressurreição com as duas fileiras cheias, também na fase principal.
  - **[I] A carta que sai cura** se era da Defesa com 2 K na Guarda: é a regra geral da cura passiva (toda numérica da própria Defesa que
    vai ao cemitério cura; a troca do Equipar e o Roubo já curam assim), não uma regra nova.
  - **[I] Em cadeia:** a ressuscitada que forma outra quadra dá outra Ressurreição, que pode ser usada no mesmo instante (na fase
    principal já é assim). **[I]** A carta que sai não pode ser a ressuscitada na mesma jogada: escolhe-se do cemitério de antes da troca.
- **Sessões:** a do online terminou com o trabalho na `main` (`4f7621e`) e o worktree limpo, e foi apagada. **[I]** Vale daqui em diante:
  sessão que terminou o trabalho dela e teve o resultado conferido sai, sem esperar ele pedir (a do bloco E também).

---

## 2026-11-03 (3): seguir no desenho sozinho por algumas horas

Perguntado se o bloco de desenho podia começar, combinando a ordem dos pontos com ele:

> sim, vamos. Irei me abster por algumas horas portanto peço-lhe que faça e adiante o máximo que puder tudo que não necessita de minha aprovação. reserve para o final as questões que dependem de mim para que assim que eu retornar, responda e dê prosseguimento. autorizo a você prosseguir mantendo o altíssimo nível para este jogo que será vencedor de jogo indie haha.

**Leitura:**
- **[I]** O que não precisa dele: levantar o código de cada ponto, medir no simulador o que a regra nova (ponto 16) mudaria, montar o
  protótipo clicável dos pontos visuais e escrever um **rascunho** do desenho com as recomendações. Tudo marcado como rascunho: nada
  disso está aprovado, e nenhum código do jogo (`packages/*/src`) muda antes da aprovação dele (regra 3 da memória; o portão do
  brainstorming).
- **[I]** A ordem dos pontos, as escolhas de regra do 16 e as escolhas de gosto entre as variantes do protótipo são dele: ficam numa
  lista única no fim, a mais importante em cima.

---

## 2026-11-03 (2): o ponto 17 era a Armadilha; o 18 sem o vermelho

Perguntado se uma Armadilha do Bot tinha quebrado um J dele antes do golpe sem cena:

> sim, houve armadilha, foi um engano meu. está ok. ignore o ponto 17. em relação ao ponto 18 a cor vermelha com bordas ficou estranha. no lugar da cor vermelha deixa a cor padrão mesmo, mantendo as animações. a cor dourada mantém para subida mas reduza um pouco a espessura da borda pois está muito grossa.

**Leitura:**
- **Ponto 17 fechado:** a regra fica como está (a Armadilha na janela de reação desarma o Ataque Absoluto, e não há cena). **[I]** O
  aviso de que o Ataque Absoluto desarmou não foi pedido; se vier, é parte do ponto 1 (a jogada especial do Bot legível).
- **[I]** O conserto do Equipar vazio colado ao golpe (`09fc360`) fica: é um defeito de verdade, achado no caminho, e ele mesmo abriu
  a sessão do conserto online.
- **Ponto 18:** o total que desce fica na cor padrão (tinta), sem contorno, e mantém a animação (encolhe uma vez). O que sobe segue em
  ouro, com o contorno escuro mais fino. **[I]** A sombra de carimbo embaixo também afina, porque soma com o contorno na espessura que
  ele viu.

---

## 2026-11-03 (1): os pontos 16, 17 e 18 do playtest

Depois da entrega da fatia 5 na `main` (`6759914`), que pedia que ele jogasse:

> ok, prossiga.
>
> pontos novos para registrar:
>
> 16. no instante em que forma a quadra deve ser possível usar ressurreição, respeitando obviamente a iniciativa. se as fileiras estiverem cheias, a carta ressuscitada substitui a última da fileira (de ataque ou defesa).
> 17. ataque absoluto não está exibindo a cinemática. revisar, corrigir e conferir.
>
> 18. melhoria: a cor do valor de ataque e defesa quando aumentados estão muito simples e devem ser visualmente melhor trabalhados, a cor quando sobe pode continuar sendo dourada com bordas escuras e quando desce deve ser vermelhas com bordas escuras.

**Leitura:**
- **[I]** "prossiga" é o próximo passo do `estado.md`: o desenho dos pontos que ficaram para depois da fatia 5, com protótipo. Ele não
  disse que a fatia 5 está aprovada; ele jogou e mandou os pontos novos.
- **Ponto 17** é defeito: entra direto, com teste e foto, antes do desenho.
- **[I] Ponto 18** é direto, como o 12 de que ele nasce: o total que sobe fica dourado com contorno escuro, e o que desce fica vermelho
  com contorno escuro. Ele só falou da cor; o tamanho que cresce na subida (ponto 12) fica.
- **[I] Ponto 16 muda regra do motor** (hoje a Ressurreição só vale na fase principal de um turno seu, e só numa fileira com espaço:
  spec das regras §1.8). Vai para o desenho, com perguntas antes da spec: em que momento do Equipar ela vale, o que "respeitando a
  iniciativa" decide quando os dois formam quadra, o que acontece com a carta substituída, e se ela continua valendo depois, na fase
  principal. Mudar a regra muda partidas de referência: sobe `RULES_VERSION` e remede o portão do Difícil.

---

## 2026-11-02 (10): o ponto 15 do playtest

Depois do corte pelo limite de uso, no meio da Task 9 da fatia 5:

> ok, prossiga.
>
> Ponto para incluir na lista de 14 itens que eu enviei.
>
> 15. se o ataque comum for o ataque final, deve haver uma animação cinematic curta do último ataque da partida para dar mais empolgação ao player vitorioso.

**Leitura:**
- "prossiga" é terminar a fatia 5 (a Task 9: a medição de depois, o portão, a CI, a revisão e o fast-forward).
- **[I]** O ponto 15 é de desenho, como os nove de 2026-11-02 (9) que ficaram para depois da fatia 5: entra no mesmo brainstorming, com protótipo, e não nesta fatia. Ele não disse onde encaixar.
- **[I]** "Ataque comum final" é o golpe que derruba a vida a zero (`GameOver` por vida), sem cena especial no mesmo passo. A Exódia e o Ataque Absoluto que encerram já têm cena.

---

## 2026-11-02 (9): o plano da fatia 5 aprovado, e 14 pontos do playtest

À entrega do plano (`docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`), com as escolhas E1 a E9 listadas para ele:

> Aprovado, execute.
>
> Pontos que observei ao testar o jogo jogando:
>
> 1. Fico perdido quando o oponente usa armadilhas, K, J, Q (cartas especiais no geral). Sou limitado apenas ao som "genérico" e ao log de histórico para entender o que aconteceu. Seria interessante enriquecer a experiências de jogar cartas especiais, afinal são especiais, dando assim mais profundidade e alma pro jogo. Deixar tão bom ao ponto do player não precisar ficar olhando o histórico de jogadas para saber o que aconteceu. Isso serve para os dois lados.
> 2. Cartas especiais em mãos que estão bloqueadas no momento da jogada devem ser exibidas de forma em que o usuário entenda que no momento não podem ser usadas, pois as vezes confunde se pode usar ou não. As vezes nem é o momento de usar certas cartas especiais mas fico clicando porque a carta está sendo exibida normal. deve enriquecer este detalhe.
> 3. as vezes arrasto o mouse e seleciono textos. isso deve ser bloqueado no jogo.
> 4. evite exibir o texto "Ameaça de bot" acima do botão atacar, pois é o player quem deve observar esses detalhes do jogo e pensar na melhor estratégia.
> 5. botão de atacar deve ter identidade e personalidade. o botão é simples. Isso serve para todos os botões clicáveis no fluxo de jogadas (até os botões desfazer e recomeçar).
> 6. avisos na mesa de cura passiva, reflect, ressurreição devem ser enriquecidos visualmente. está muito simples.
> 7. remova o contador com barra de regresso que é exibido abaixo do botão "Atacar primeiro" e "Atacar segundo".
> 8. substitua a palavra Buff por outra mais apropriada para jogadores leigos.
> 9. cura passiva ocorre e eu não sei o por que fui curado. talvez um efeito de cartas que vão para o cemitério virando hp e indo pro coringa quando duplo K está ativado. Pense na melhor animação se houver.
> 10. enriquecer o detalhe deixando mais empolgante a medida que o player adicionar cartas de buffs na mesa. (1 J equipado = nenhum efeito, 2 J equipados, as cartas tem um efeito indicando mais poder, 3 J equipados, cartas com efeitos mais poderosos, tipo faícas de raios). isso serve para todas as cartas de buffs equipados. manter a coerência.
> 11. O Player que estiver com Iniciativa 3 rodadas seguidas, o avatar do coringa deve ter uma aura minima de poder, quando tiver 5 rodadas uma aura mais forte, e quando bater 10 rodadas seguidas, deve ter uma super aura de poder - referência de dragon ball.
> 12. quando cartas numéricas forem inseridas nas fileiras, valores de ataque e defesa devem exibir uma micro animação e aumento de tamanho indicando que o ataque ou a defesa aumentaram de valor.
> 13. O Player que tiver o ataque maior, o ícone de espada deve ter uma áura dourada, quase como as são exibidas nas cartas quando completam quadra. O mesmo para a defesa e o ícone de escudo.
> 14. deixar o monte e o cemitério mais centralizado. deixar cemitério com visual mais rico e com mais identidade.

Perguntado como encaixar os pontos, que palavra entra no lugar de "Buff" e o que acontece com a ordem automática sem a barra, ele escolheu:
- "Fatia 5 + diretos": a fatia 5 como aprovada, com uma tarefa a mais para os pontos diretos (3, 4, 7, 8 e 12); os outros nove (1, 2, 5, 6, 9, 10, 11, 13 e 14) num desenho novo, com protótipo, logo depois;
- "Bônus": "Bônus de ataque" (J) e "Bônus de defesa" (Q);
- "Tirar o automático": sai a barra e sai a escolha automática da ordem; online vale o prazo do servidor.

**Leitura:**
- O plano está aprovado como foi entregue, com as recomendações de E1 a E9. **[I]** Vale até o fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.
- A tarefa dos pontos diretos entra no plano como Task 9, antes da Task 8 (o E2E e a medição a cobrem).
- **[I] Ponto 3:** sem seleção de texto na mesa (o palco e a mão). Os campos de texto, os diálogos de regras e o histórico seguem selecionáveis.
- **[I] Ponto 4:** sai a "Ameaça de X" acima do Atacar e também a "ameaça de X cai de A para B" da prévia do alvo, pelo mesmo motivo. A prévia do seu próprio ataque fica.
- **[I] Ponto 8:** só o texto muda. Os identificadores (`BuffPlayed`, `attackBuffs`...) ficam, como manda a regra de idioma do repositório. O plural é "Bônus de ataque".
- **[I] Ponto 12:** o total da fileira cresce e assenta quando sobe, no pouso da carta que o fez subir. Pela coerência que ele pediu no ponto 10, vale também quando um J ou um Q sobe o total, não só uma numérica.
- **[I] Ponto 1 e a E3:** a queda simples da carta do Bot (E3) segue nesta fatia como base. O desenho novo deve deixar a jogada especial do Bot legível sem o histórico, e pode trocar essa queda.
- **[I]** Os nove pontos de desenho não foram desenhados nem aprovados: viram brainstorming e protótipo depois da fatia 5.

---

## 2026-11-02 (8): a outra conta assume a fatia 5

Na outra conta, com a passagem pronta na `main`:

> Siga a regra 1 do CLAUDE.md: ache o estado.md mais novo e continue do próximo passo (o plano da fatia 5). [...] a passagem está pronta na main, você consegue continuar só com o repositório. Não há trabalho pela metade nem branch sem mesclar da outra conta. Vamos prosseguir

**Leitura:**
- O próximo passo do `estado.md`: escrever o plano da fatia 5, entregar com as escolhas listadas e só escrever código depois do ok dele.
- **[I]** O plano é entregue em `docs/superpowers/plans/2026-11-02-direcao-visual-fatia-5.md`, com as escolhas E1 a E9. Nenhuma delas foi aprovada ainda.

---

## 2026-11-02 (7): guardar o script de medição

Perguntado se o script de medição das cenas, que era temporário, deveria ficar no repositório:

> Sim, guarde

**Leitura:** ele fica em `packages/web/e2e/medir-cena.ts`, fora do `pnpm e2e` e da CI. **[I]** Os rascunhos 1 a 4 do protótipo seguem fora do git (`.superpowers/brainstorm/`), como recomendado: ele não pediu para guardá-los, e o aprovado, o 5, já está no repositório.

---

## 2026-11-02 (6): a quadra sem o losango

Com uma foto das cartas da quadra na fileira:

> faça um ajuste pontual: remova apenas esses losangos amarelos de cartas que formam a quadra e ativam a ressurreição.

**Leitura:** sai só o losango do canto de cima. O fundo dourado claro, a moldura de ouro, o brilho e o selo "QUADRA +N" ficam. Muda a spec 6 §6, que ele tinha aprovado com o losango.

---

## 2026-11-02 (5): a Ressurreição aprovada, e a outra conta assume

Depois de jogar a fatia 4b:

> Joguei, aprovado. vou continuar da outra conta. faça o que é necessário para que seja dado continuidade

**Leitura:**
- A fatia 4b está aprovada como foi entregue, sem ajustes: as seis cenas especiais do §7 estão entregues e aprovadas.
- **[I]** "faça o que é necessário" é registrar e subir a memória. O plano da fatia 5 fica para a próxima conta, com o `estado.md` dizendo o passo exato.
- **[I]** Ele jogou, mas não disse quais caminhos viu. O que a execução não conferiu (o som de ouvido, o movimento reduzido, duas quadras na mesa) segue marcado como não conferido por nós.

---

## 2026-11-02 (4): o plano da Ressurreição aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4b.md`), com as escolhas listadas para ele:
- qual quadra acende sai da mesa, sem mudar o motor: com duas quadras, pode acender a outra; sem quadra, os fios saem da fileira de destino. A alternativa, exata, subiria o
  `RULES_VERSION` de 4 para 5, com aviso em todo replay guardado;
- 4,6 s, e não ~4,9 s; a cena inteira a cada vez, como ele decidiu, e o toque pula;
- sem tarjas de cinema; a carta de verdade escondida até a cópia pousar; no celular, o céu preso à área visível;
- o total da fileira já conta a carta no começo da cena;
- a execução aqui mesmo, tarefa por tarefa, com a revisão final de quem escreveu o código.

> Aprovado, execute

**Leitura:** o plano está aprovado como foi entregue, com as escolhas listadas. **[I]** Vale até o fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.

---

## 2026-11-02 (3): o Reflect aprovado; agora a Ressurreição

Depois de jogar a fatia 4:

> aprovado, prossiga para ressureição. lembre que a memória e os arquivos de contexto persistente devem ser devidamente atualizados e consolidados

**Leitura:**
- A fatia 4 está aprovada como foi entregue, sem ajustes.
- **[I]** "prossiga" é o próximo passo do `estado.md`: escrever o plano da fatia 4b, entregar e só escrever código depois do ok dele.
- **[I]** Ele não disse quais caminhos viu. O que a execução não conferiu (o som de ouvido; Reflect contra Reflect, o dano 0, o próprio Reflect, o Ataque Absoluto contra
  Reflect e o movimento reduzido no navegador) segue marcado como não conferido por nós.

---

## 2026-11-02 (2): o plano do Reflect aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-02-direcao-visual-fatia-4.md`), com as escolhas listadas para ele:
- o espelho grande encolhe até a zona "Reflect ativo" e fica lá, pequeno, até o ataque;
- a sequência soma 5,3 s (1,5 s ao jogar e 3,8 s na batida), e o primeiro corte, se ficar longo, é o tempo lento do cometa;
- a inversão e o nome só na batida; sem tarjas de cinema, como no protótipo;
- sem dano de volta, o cometa se desfaz no espelho, que quebra mesmo assim;
- o Ataque Absoluto contra Reflect não dispara o feixe, e a folga para em 8 s;
- a Devastação refletida não tem cometa;
- K, J e Q da cena são desenhos genéricos;
- a execução aqui mesmo, tarefa por tarefa, com a revisão final de quem escreveu o código.

> Aprovado, execute

**Leitura:** o plano está aprovado como foi entregue, com as escolhas listadas. **[I]** Vale até o fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.

---

## 2026-11-02 (1): a fatia 4 se divide: o Reflect agora, a Ressurreição depois

Depois de a passagem para a outra conta ficar pronta:

> prossiga, acredito que dá para fazer pelo menos reflect. vamos fazer ressurreição posteriormente.

**Leitura:**
- Muda a ordem do §14 da spec da direção visual: a fatia 4 é só o Reflect, com os sons.
- **[I]** A Ressurreição vira a fatia 4b, antes da fluidez (a fatia 5, que mantém o número porque as notas já a citam assim). Ele só disse
  "posteriormente".
- **[I]** "prossiga" é o próximo passo do `estado.md`: escrever o plano, entregar e só escrever código depois do ok dele.

---

## 2026-11-01 (6): a fatia 3 aprovada, e a outra conta assume

Depois de jogar a fatia 3:

> ok, testado aprovado. o limite semanal está quase acabando, logo irei continuar de outra conta do claude. encurte tarefas pendentes
> para não correr o risco de ficar preso na metade. é fundamental que a memória e os arquivos de contexto persistente sejam devidamente
> atualizados e consolidados, garantindo que o Claude, na minha outra conta, consiga retomar o trabalho exatamente de onde paramos, com
> todo o histórico, as decisões e os detalhes relevantes preservados. O objetivo é assegurar uma continuidade integral do desenvolvimento
> do projeto, sem perda de contexto, retrabalho, retrocessos ou qualquer impacto negativo sobre o que já foi construído.

**Leitura:**
- A fatia 3 está aprovada como foi entregue, sem ajustes.
- **[I]** "encurte tarefas pendentes": esta conta só registra e sobe a memória. O plano da fatia 4 fica para a próxima conta, porque é
  longo e não pode ficar pela metade.
- **[I]** Ele não disse quais caminhos viu. O que a execução não conferiu (o som de ouvido, a cancelada e a refletida no navegador, o
  movimento reduzido no navegador) segue marcado como não conferido por nós.

---

## 2026-11-01 (5): a continuidade entre as contas é fundamental

No meio da execução da fatia 3:

> É fundamental que a memória e os arquivos de contexto persistente sejam devidamente atualizados e consolidados, garantindo que o
> Claude, na minha outra conta, consiga retomar o trabalho exatamente de onde paramos, com todo o histórico, as decisões e os
> detalhes relevantes preservados. O objetivo é assegurar uma continuidade integral do desenvolvimento do projeto, sem perda de
> contexto, retrabalho, retrocessos ou qualquer impacto negativo sobre o que já foi construído.

**Leitura:**
- Reforça a regra da memória compartilhada (`CLAUDE.md`), e a execução da fatia 3 segue depois da consolidação.
- **[I]** O ledger `.superpowers/sdd/…` fica fora do git, e a outra conta pode não o ver. Por isso, as escolhas técnicas de cada
  tarefa também vão para o `diario.md`, e a branch sobe depois de cada bloco (regra 6, no `CLAUDE.md`).

---

## 2026-11-01 (4): o plano da fatia 3 do sub-projeto 6 aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-01-direcao-visual-fatia-3.md`), com as escolhas listadas para ele:
- a Devastação acontece quando a fileira cai (`RowDevastated`), no próprio campo, sem tarjas nem cortina; o lançamento vira
  faixa;
- a cancelada é uma cena curta (1,4 s, sem inversão nem nome), com a fita do motivo;
- na Exódia, o retrato do perdedor racha e a vida dele mostra 0, também para o leitor de tela;
- a desolação dura até uma carta voltar à fileira, guardada pela sessão;
- no celular, a cena rola os campos até a fileira atingida;
- a recomendação de executar aqui mesmo, tarefa por tarefa, com a revisão no fim.

> ok,  pode seguir o plano da fatia 3

**Leitura:** o plano está aprovado como foi entregue, com as escolhas listadas, e a execução é a recomendada. **[I]** Vale até o
fast-forward na `main` com as duas CI verdes, como nas fatias anteriores.

---

## 2026-11-01 (3): a fatia 2 jogada; a cena do Ataque Absoluto cortada

Depois de jogar a fatia 2:

> A cena da defesa absoluta ocorreu primeiro e estava como esperado, já a cena em seguida do ataque absoluto, na mesma partida,
> iniciou na hora do ataque mas foi cortada precipitadamente. corrija e pode prosseguir. aprovado, siga

**Leitura:**
- A fatia 2 está aprovada, com o conserto do corte, e o próximo passo é o plano da fatia 3.
- **[I]** A causa é a jogada seguinte do bot: ele joga 600 ms depois de a vez chegar a ele, e um `state` novo troca a linha do
  tempo no meio da cena. A Defesa não foi cortada porque, depois dela, a vez seguiu dele.
- **[I]** O conserto: o bot do treino espera a folga da cena (a mesma tabela `sceneAllowanceMs` que estende o prazo no online)
  antes de pensar. Vale para as seis cenas.

---

## 2026-11-01 (2): o plano da fatia 2 do sub-projeto 6 aprovado

À entrega do plano (`docs/superpowers/plans/2026-11-01-direcao-visual-fatia-2.md`), com as escolhas listadas para ele:
- o golpe do Ataque Absoluto dentro da cena, sempre com tremor forte;
- o clarão do protótipo fora, pela regra dos 25%;
- os raios a cada 340 ms;
- a cortina que deixa o placar à vista em todas as cenas;
- o pulo que corta o som;
- a insígnia no canto de baixo do retrato;
- a recomendação de executar aqui mesmo, tarefa por tarefa, com a revisão no fim.

> Aprovado, siga

**Leitura:** o plano está aprovado como foi entregue, inclusive as escolhas listadas, e a execução é a recomendada. **[I]**
"siga" vale até o fast-forward na `main` com as duas CI verdes, como nos blocos anteriores (`decisoes.md` 2026-10-31 (14)).

---

## 2026-11-01 (1): a fatia 1 jogada; três ajustes antes da fatia 2

Depois de jogar a fatia 1 do sub-projeto 6:

> ok, está seguindo como o esperado. apenas pontuei alguns pontos:
>
> 1. "Ataque" e "Defesa" na mesa estão escritos como textos comuns. Seria interessante inserir figuras representativas como um
>    espada cruzada antes do valor de ataque e um escudo antes do valor da defesa para ficar mais intuitivo e visualmente melhor
>    de entender. O mesmo para quando tiver ressurreição disponível, cura passiva e outros.. deve haver uma figura representando
>    cada coisa ao invés de um texto simples. Visão é sempre tem a melhor UX e UI.
> 2. Quando cura passiva está ativada, deve haver uma animação de +[valor] verde curando os pontos de vida do player quando
>    houver cura.
> 3. Em pc, quando eu aciono uma carta coringa para jogar por exemplo, as opções de jogadas são exibidas, essas opções (botões)
>    tem textos pequenos abaixo, que, ao passar o mouse entre os botões, a tela fica tremenda infinitas vezes muito
>    rapidamente, vários flicks, isso é um bug que ocorre desde sempre, seria bom deixar esses textos sendo exibidos via tooltip
>    com hover, ou outra forma que você achar mais adaptável.
>
> pode prosseguir.

**Leitura:** a fatia 1 está aprovada como entrou na `main`, e os três pontos vêm antes da fatia 2, numa branch curta com os
mesmos portões (`pnpm check`, as duas CI, fast-forward).

1. **Figuras no lugar do texto:**
   - Espadas cruzadas antes do total de Ataque e um escudo antes do de Defesa, nas quatro fileiras. **[I]** A palavra "Ataque" e
     a palavra "Defesa" saem da tela e ficam só para o leitor de tela.
   - Uma figura para cada marca de estado: Defesa Absoluta, Cura passiva, Ressurreições, Ataque Absoluto armado. **[I]** O nome
     curto continua ao lado da figura: só a figura não ensina a quem joga pela primeira vez o que é "Cura passiva".
   - **[I]** "e outros" também cobre os títulos das zonas do campo (Guarda, buffs de Ataque e de Defesa, Reflect) e os
     destinos do Equipar (Fileira de Ataque e de Defesa).
   - Os desenhos são originais (spec 6 §1), no traço da mesa.
2. **A cura em verde:**
   - O "+N" já existia, mas em ouro e por ~0,5 s: no replay de uma partida com cura passiva, o "+3" do Bot aparecia e sumia sem
     chamar atenção.
   - O "+N" passa a verde, e a barra de vida mostra em verde o trecho que a cura devolve antes do ouro encher. Vale também para
     a cura do Roubo (o mesmo número).
   - **[I]** O verde é uma cor nova na paleta (`cura`, #2a7339). É diferente do verde da capa do oponente, para não parecer "do
     Bot", e o papel sobre ela tem contraste de 5,1:1. O sinal "+" fica, para o sentido não depender só da cor.
3. **O tremor no PC:**
   - A causa não são os textos pequenos dos botões. É a linha "Quebrando o J antes" que aparece nas prévias quando o mouse
     aponta um alvo.
   - Ela faz a barra crescer 17,5 px (medido no Chromium, 1366 × 768) e empurra o botão para fora do ponteiro. A linha some e o
     botão volta para baixo do ponteiro, sem parar.
   - **[I]** A linha vira uma dica flutuante, fora do layout: apontar não muda mais a altura de nada. A segunda linha dos botões
     fica: no toque não existe hover, e ela é o único lugar onde o celular mostra o efeito do alvo.

---

## 2026-10-31 (14): o plano da fatia 1 do sub-projeto 6 aprovado

À entrega do plano (`docs/superpowers/plans/2026-10-31-direcao-visual-fatia-1.md`), com a recomendação de executar aqui mesmo,
tarefa por tarefa, e o desvio deliberado do relógio (parado até o fim da folga mesmo com a cena pulada):

> Aprovado o plano da fatia 1. prossiga

**Leitura:** o plano está aprovado como foi entregue, inclusive o desvio do relógio; a execução é a recomendada (inline, sem
subagente, com a revisão final feita por quem executou). **[I]** "prossiga" vale até o fast-forward na `main` com as duas CI
verdes, como nos blocos anteriores (`decisoes.md` 2026-10-31 (9)); as decisões técnicas da execução ficam no diário.

---

## 2026-10-31 (13): a spec do sub-projeto 6 aprovada, com os sons

À entrega da spec (`docs/superpowers/specs/2026-10-31-direcao-visual-design.md`, com as 21 decisões [I] listadas para ele):

> aprovado, apenas inclua os sons e prossiga

**Leitura:** a spec está aprovada, inclusive as [I] (ele as viu listadas). **[I]** "inclua os sons" = o som deixa de ser a última
fatia e cada fatia sai com os sons do que ela traz (spec §10 e §14 ajustadas); fora das cenas, os sons do golpe comum, da
espada, da fita e da quadra (§10). "Prossiga" = o plano da fatia 1.

---

## 2026-10-31 (12): as cenas especiais tocam sempre inteiras

Na spec do sub-projeto 6 (§7, "Repetição"), à pergunta "A cena repetida na mesma partida toca inteira sempre?":

> Sempre inteira

**Leitura:** nenhuma versão curta na repetição; a mesma cena (duas Ressurreições, dois Ataques Absolutos) toca inteira toda vez,
e o toque na mesa continua pulando. Com a decisão (11), quem joga em seguida não perde tempo com isso.

---

## 2026-10-31 (11): o relógio para durante as cenas especiais

Na spec do sub-projeto 6 (`docs/superpowers/specs/2026-10-31-direcao-visual-design.md` §9), à pergunta "No online, o relógio para
durante as cenas especiais?":

> Parar o relógio

**Leitura:** muda a regra [A] da spec do servidor §6.2 (o relógio só pausava na janela de reação do oponente). Quando um passo
produz um evento de cena rara (Ataque Absoluto, Defesa Absoluta, Exódia, Devastação, Reflect, Ressurreição), o prazo da decisão
calculada nesse passo ganha a duração da cena; duas cenas no mesmo passo somam, até 8 s **[I]**. Pular a cena não dá tempo extra
(a folga é fixa) **[I]**. A tabela de durações fica num lugar só, na entrada principal de `@coringa/protocol` **[I]**. Se o estado
antigo das salas não servir, sobe `STATE_SCHEMA`. O antes/depois de todo o sub-projeto 6 está em
`docs/memoria/notas/direcao-visual.md`.

---

## 2026-10-31 (10): o dano do Roubo fora da iniciativa; a cura passiva sinalizada

Depois do merge do bloco E3 + F2 + F3 (resposta à pergunta do fechamento e o primeiro ponto do playtest):

> O dano do Roubo não deve contar para a iniciativa. Prossiga.
>
> Pontos meus após jogar:
>
> 1. quando 2 K estiverem equipados, sinalizar ao jogador cura passiva ativa (enquanto durar).

**Leitura:** a regra de 2026-10-30 fica como está: o placar da iniciativa soma só o dano do Ataque, e o Roubo não entra. A cura
passiva (2 K ou mais na Guarda, regra da E3) ganha uma marca de estado no campo, ao lado da Guarda, que aparece quando o segundo
K entra e some quando a Guarda cai abaixo de 2. **[I]** A marca vale para os dois lados (é informação pública, como a Defesa
Absoluta), diz só "Cura passiva" (sem o multiplicador dos Q, que ao lado da contagem da Guarda seria lido como o número de K), e
quem decide se está ligada é o motor, não a tela. O item do resumo das regras passa a se chamar "Cura passiva (pela Defesa)",
para o jogador achar o nome da marca. Nada muda na regra.

---

## 2026-10-31 (9): conduzir sozinho até o fim das pendências

No meio do trabalho das respostas de 2026-10-31 (8):

> Dou autorização para prosseguir até o termino de todos as pendências passadas até agora. estou me abstendo por algumas horas e
> deixo em suas mãos a condução do projeto até concluir o que falta.

**Leitura:** o plano 2 do bloco E3 + F2 + F3 segue até o merge na `main` (com `pnpm check` e as duas CI verdes, como já vale até
o MVP), sem parar para perguntar. **[I]** "as pendências passadas até agora" são as do bloco (o plano 2:
`docs/superpowers/plans/2026-10-31-e3-f2-f3-plano-2.md`), não as que só ele pode fazer (playtest, `wrangler login`, deploy, o
VC++ Redistributable). Decisão de regra continua sendo dele: o que a medição levantar volta como pergunta no fechamento, sem
mudar regra por conta própria. A parada combinada de (8) vira aviso: se o Roubo passar de 65% no pareado, o merge sai assim
mesmo (a regra é a que ele pediu) e o número vai em destaque no fechamento; partida no teto ou duração muito diferente, que
apontariam defeito, ainda param o merge.

---

## 2026-10-31 (8): BURN 4, o Roubo sem naipe e a iniciativa mais clara

Às perguntas da medição do plano 1 do bloco E3 + F2 + F3 (`notas/medicao-e3.md`):

> Forma de penalidade fica para o limite de especiais: BURN com limite de 4;
>
> pontos meus:
>
> 1. Mudança de regra da jogada roubo e cura com Ás: Qualquer carta Ás, independente do naipe, serve para roubar uma carta do
>    oponente agora. Quando essa carta é roubada do oponente, subtrai o valor da carta na vida do adversário e cura quem tá
>    roubando. Aí elimina no jogo o valor do naipe. Não existe mais naipe no jogo. k continua anulando, dano não mata.
> 2. Fiz alguns testes e eu posso dizer que eu estou meio perdido quanto às regras de iniciativa. Às vezes eu tô jogando, eu
>    tenho iniciativa e eu não sei por quê, não tá claro pro jogador, e às vezes a iniciativa muda pro adversário, eu também não
>    vejo o momento, não sei por quê. Isso deveria ficar mais claro pro jogador.

**Leitura:**

- **Limite de especiais:** o padrão passa a ser `specialLimit: { max: 4, penalty: 'BURN' }`. A CHOOSE e a FEWER ficam na config,
  fora do padrão.
- **Roubo (substitui o efeito por naipe de 2026-10-30):** todo Roubo tira o valor seco da carta roubada da vida do oponente **e**
  cura quem roubou o mesmo valor, até a vida inicial. Seguem iguais: o A (ou o Selvagem como A) de qualquer naipe, qualquer
  numérica de qualquer fileira, a Defesa Absoluta bloqueando o roubo inteiro, o dano que não mata e o K na Guarda que anula.
  - **[I]** o K anula **só o dano** (é o que ele anulava antes); quem roubou cura mesmo assim.
  - **[I]** a cura é o valor cheio, mesmo quando o dano sai menor (o "não mata" ou o K).
  - **[I]** "não existe mais naipe" vale para as regras: o naipe volta a ser só visual, como a spec 1 dizia antes do Roubo. As
    cartas seguem desenhadas com o naipe, e os ids (`b1-copas-7`) não mudam.
  - **[I]** o dano do Roubo segue fora da conta da iniciativa (ele não falou disso).
- **Iniciativa:** a regra não muda (spec 1 §1.10: no fim de cada rodada de Ataque, fica com quem causou mais dano; no empate não
  muda). O que muda é a tela. **[I]** o como: o dano de cada um na rodada aparece ao lado da marca da iniciativa durante o Ataque;
  no fim de toda rodada de Ataque, mudando ou não, um aviso diz com quem ela ficou e por quê (os dois danos, e o empate); no
  começo, a tela diz que ela foi sorteada.
- **As 10 leituras [I] do plano 1** (`notas/medicao-e3.md`, seção 4): ele as viu e não comentou. Seguem como estão, para
  confirmar no playtest; não estão aprovadas.
- **Parada combinada:** o Roubo novo é remedido antes da interface. Se ele passar de 65% no pareado contra o bot que não rouba,
  ou se a duração mudar ou aparecer partida no teto, a branch para antes do merge e os números voltam a ele. Senão, o plano 2
  segue sem nova parada.

---

## 2026-10-30 (7): o bloco E3 + F2 + F3 liberado

À pergunta "Posso começar o bloco E3 + F2 + F3 (medição no simulador)?", depois do merge da F1:

> Pode começar

**Leitura:** o bloco segue a spec do sub-projeto 5 (E3, F2 e F3) e as respostas de 2026-10-30 e 2026-10-30 (2). Ele vai em
duas partes, com uma parada no meio:

- **Plano 1:** o motor (Reflect reativo, Devastação, Roubo, cura passiva e o limite de especiais com 3 formas de penalidade na
  config), o protocolo, o servidor, os bots e a medição no simulador. A web só acompanha o necessário para o `pnpm check`
  passar.
- **Parada:** a forma da penalidade do limite e as leituras **[I]** que mudam o comportamento de uma regra voltam a ele, com
  os números e a recomendação, antes da interface.
- **Plano 2, depois da resposta dele:** a interface e as cenas, o tutorial, as docs, as partidas de referência, o portão do
  Difícil e o merge.

Nada do bloco entra na `main` antes da resposta dele.

---

## 2026-10-30 (6): a F1 liberada

À pergunta "Posso começar a F1 (apagar o histórico de partidas)?", depois do merge da E2:

> Pode começar a F1

**Leitura:** a F1 segue a spec do sub-projeto 5 (F1) e a leitura do item 1 das anotações de 2026-10-30: só a web, na tela
`/partidas`, apagar a lista `coringa:partidas` com confirmação, e uma partida só. Não muda regra: sem `RULES_VERSION`, sem
`STATE_SCHEMA` e sem o portão do Difícil. As escolhas que ele não descreveu ficam como **[I]** no `estado.md` ("Esperando o
autor").

---

## 2026-10-30 (5): a E2 liberada

À pergunta "Posso começar a E2 (Equipar livre)?", depois do merge da E1:

> ok, pode começar a E2

**Leitura:** a E2 segue a spec do sub-projeto 5 (E2) e a decisão de 2026-10-30 (2), item 8. As escolhas de interface que ele
não descreveu ficaram como leituras **[I]**, no `estado.md` ("Esperando o autor"): sem tocar numa carta, o destino vale para a
primeira que falta; no envio antecipado e no tempo esgotado, as que faltam entram depois das escolhidas, na ordem de compra; o
terminal do simulador segue na ordem de compra.

---

## 2026-10-30 (4): Defesa Absoluta até o ataque; Absolutos em 3 s

Respostas às duas perguntas do fechamento da revisão das notas (F4 e notas 6 a 8):

> 1. Defesa absoluta dura até o oponente atacar de fato.
> 2. 3 segundos acredito que seja o suficiente para o tempo de animaçao dos absolutos.

**Leitura:**

- As perguntas em aberto foram respondidas: a espera da entrada (3) acabou e a fila segue pela E1.
- **Defesa Absoluta (regra nova, muda a spec 1 §1.5 item 4 e §1.8 "Ao terminar"):** ela não acaba mais no fim do próximo
  turno do oponente. Dura até ele atacar de fato e acaba depois desse ataque. Entra junto com a E1 (mesma subida de
  `RULES_VERSION` e o mesmo portão do Difícil).
  - **[I]** Ao acabar, continua indo 1 Q (o mais antigo) ao cemitério, como hoje; só muda quando.
  - **[I]** O Ataque Absoluto conta como ataque e a encerra.
  - **[I]** Um ataque devolvido por um Reflect conta como ataque.
  - **[I]** Com o Reflect reativo (F2), o Reflect contra Reflect não tem golpe: a Defesa Absoluta continua.
  - **[I]** A Armadilha, o Sacrifício, o Roubo e a Devastação não a encerram, porque ela os bloqueia.
  - Os **[I]** vão ao autor junto com os números da E3.
- **Absolutos:** o Ataque Absoluto e a Defesa Absoluta passam de 2,6 s para 3 s (só a web). **[I]** A Exódia fica em 4,2 s,
  porque ele não falou dela.
- As notas 6 (ver todas as cartas, a E2) e 8 (movimentos suaves) não tiveram comentário novo.

---

## 2026-10-30 (3): a E1 espera as respostas

Depois do fechamento da revisão das notas (F4 e notas 6 a 8 em aberto), à pergunta "Posso começar a E1?":

> Espere minhas respostas

**Leitura:** nada da fila (E1 em diante) começa antes de o autor responder às perguntas do `estado.md` ("Esperando o autor")
e liberar a E1. Substitui o "as perguntas não a bloqueiam" do `estado.md` de `d840f48`.

---

## 2026-10-30 (2): respostas ao lote de perguntas de 2026-10-30

As perguntas estão na entrada seguinte desta lista e no histórico do `estado.md` (commit `755ddc0`). Texto do autor:

> 1. Ok. Observação: Deve haver um limite de cartas especiais em mãos pois nessa é só o player ficar esperando juntar 4x K pro
>    exódia ou cartas para formar lançamentos especiais tipo reflect ou devastação. perde a graça do jogo. (minha sugestão max
>    4 cartas especiais).
> 2. Só se pode anular um reflect com outro reflect ou com defesa absoluta. ambos se anulam quando lançados reflects e o
>    atacante passa o turno.
> 3. Ok.
> 4. Ok.
> 5. Ok.
> 6. Isso já está implementado.
> 7. Ok.
> 8. Ok.
> 9. Revise o 'ataque vazio' pois acredito que não foi implementado. As cartas de defesa ainda estão sendo retiradas após
>    atacantes sem cartas de ataque equipadas. Joguei a versão depois de 27/10 mas parece que nem todos os pontos levantados
>    foram feitos ou concluídos por falta de limite de sessão. revise todos as notas.
> 10. PC. Onde ficam as cartas especiais equipadas fica tudo quebrado quando aviso de ressurreição, absolutos, reflect, etc são
>     exibidos. Tamanho da tela do notebook é 1536x695.20.

**Leitura:**

- **1. Reflect reativo, aprovado:** jogado só na janela de reação a um ataque ou a uma Devastação, vale só para aquele golpe,
  com o efeito de hoje. O limite de 4 especiais na mão segue de pé, agora também contra quem guarda cartas para Reflect e
  Devastação.
- **2. Contra o Reflect:**
  - **Reflect contra Reflect:** quem é refletido pode responder com outro Reflect (K+J+Q da mão; é o Anular de hoje). Os dois
    se anulam, as 6 cartas vão ao cemitério e **o atacante passa o turno**: o golpe não acontece **[I]: nenhuma carta sai das
    fileiras e ninguém leva dano**.
  - **A Proteção por sacrifício (J+Q+K do campo) sai do jogo.**
  - **Defesa Absoluta contra o Reflect:** o Reflect lançado contra um atacante sob Defesa Absoluta é anulado. **[I], a confirmar:**
    o Reflect ainda segura o golpe (o dono leva 0), mas não devolve dano e não quebra Q nem K do atacante. Hoje os K do
    atacante quebram nesse caso, e isso deixa de valer.
- **3 a 5 e 7, Devastação, aprovados como propostos:**
  - sai da mão na fase principal e esvazia a fileira do oponente; os buffs ficam e a quadra se desfaz;
  - abre a janela de reação, e a única resposta é o Reflect, que devolve a fileira do mesmo tipo sem quebrar Q nem K; a
    Armadilha não responde;
  - não pode ser lançada contra quem está sob Defesa Absoluta;
  - carta destruída pela Devastação não cura.
- **6. Selvagem na Devastação:** "já está implementado" (o Selvagem faz o papel de J, Q ou A em qualquer jogada). Vale também
  na Devastação: A, J ou Q, nunca K.
- **8. Defesa Absoluta contra o Roubo:** bloqueia o roubo inteiro (nada é roubado).
- **9. Ataque vazio:** relato de bug. Ele jogou a versão de depois de 27/10 e viu a Defesa perder carta depois de um atacante
  sem cartas no Ataque. Ele pede também que **todas as notas** (23/10 e 30/10) sejam revistas uma a uma contra o jogo.
- **10. Tabuleiro quebrado:** no PC, num notebook de 1536 × 695 (área visível), a área dos especiais equipados (buffs e Guarda)
  quebra quando aparecem os avisos de Ressurreição, dos Absolutos, do Reflect etc.

---

## 2026-10-30: respostas ajustadas da Fase E e anotações novas

Substitui a entrada de 2026-10-28 (as respostas da Fase E repassadas pela sessão principal da conta anterior).

### Respostas ajustadas das perguntas da Fase E (texto do autor)

> 1. O Ás fica com as duas funções: continua podendo ser Armadilha e agora ganha nova funcionalidade: Steal. Descarte o poder
>    do naipe - ♥ e ♦ curam, ♣ e ♠ roubam, regra descartada e explicação mais detalhada está no item 2.
> 2. Ajuste de regra: Descarte a minha proposta de cura ativa e poder do naipe do Ás. Agora qualquer carta de Ás pode roubar.
>    Se a carta roubada for ♣ ou ♠, o oponente recebe o dano da carta roubada e a carta vai para a mesa do player (ele escolhe
>    onde equipar: ataque ou defesa) - observação: mesmo se a fileira estiver com buffs, o valor da carta não muda (ex: tirou
>    10 de ♠ da fileira de ataque com 3 J - o oponente leva 10 de dano, não 30, e a carta 10 vai para mesa do player, não
>    mão, se a fileira estiver cheia descarta a última para o cemitério.) - O K anula o dano mas se mantém equipado - defesa
>    absoluta anula o dano - o dano do roubo não conta para a iniciativa - a carta que o ladrão perde com a fileira cheia é
>    elegível para cura quando necessário. regra complementar: o dano por roubo não mata (o hp mínimo do oponente sempre fica
>    1 caso o roubo tire todos os pontos de vida restantes). Agora se a carta roubada for ♥ ou ♦, o player recebe a cura da
>    carta roubada e a carta vai para sua mesa (ele escolhe onde equipar: ataque ou defesa). mesmo se a fileira estiver com
>    buffs, o valor da carta (cura) não muda. a cura não pode ultrapassar a vida máxima.
> 3. Mudança de regra: Apenas as cartas de defesa que vão para o cemitério, independente do naipe, curam, quando equipado 2 K.
>    (se a fileira estiver buffada com Q a cura é proporcional).
> 4. ok, aprovado (regra deve ser adaptada com mudanças estabelecidas do item 2 - agora é possível roubar com qualquer naipe
>    de Ás)
> 5. ok, aprovado. No papel de A, escolhe na hora entre Armadilha ou roubo.
> 6. ok, aprovado em partes. O HP não deve ultrapassar o teto, ok. Este jogo não deve ter limite de rodadas. Reprovada a
>    proposta de 60 rodadas, o jogo deve seguir pois há dinamismo o suficiente para não travar. Reprovada a proposta da regra
>    das 3 rodadas sem dano que você criou, remova-a do jogo.
> 7. ok.
> 8. Me refiro as cartas numéricas que estão na mão após a compra. Quero a possibilidade de ver todas as numéricas de vez
>    após a compra e equipa-las (por na mesa) livremente, ao invés de uma por vez em fila como está.
> 9. Ignore minha proposta de alteração de regra e mantenha como está. Uma única solicitação minha: o usuário poderá
>    visualizar todas as cartas numéricas antes de equipa-las pois do jeito que está, tenho que ficar tendo que ler o
>    histórico para saber quais cartas numéricas eu tenho em mãos após a compra. Outro ponto é que em testes percebi que o
>    acúmulo de cartas especiais é infinita - deve haver um teto e player deve ser penalizado na compra de novas cartas se
>    acumular x cartas especiais (minha sugestão max 4 cartas especiais). senão o player fica juntando K até fazer o exódia.

As perguntas a que ele respondeu estão em `notas/fase-e-perguntas-2026-10-27.md` (os números batem).

**Leitura:**

- **Ás = Armadilha ou Roubo**, à escolha na hora; qualquer naipe. Não existe cura ativa nem poder por naipe do Ás.
- **Roubo:** só na fase principal do seu turno (item 4, que aprovou a proposta "Só no seu turno"). Pega uma numérica de
  qualquer fileira do oponente e a põe no fim da fileira que o ladrão escolher (Ataque ou Defesa); com a fileira cheia, a
  última dela vai ao cemitério. O naipe da carta roubada passa a ser regra (hoje é só visual):
  - ♣/♠: o oponente leva dano igual ao valor seco da carta (sem buffs nem bônus de quadra). Um K na Guarda anula esse dano e
    **não quebra**. A Defesa Absoluta anula o dano. Esse dano **não conta** para a iniciativa e **não mata**: a vida do
    oponente fica em no mínimo 1.
  - ♥/♦: quem roubou cura o valor seco, até a vida inicial.
  - A carta que o ladrão perde com a fileira cheia cura como qualquer outra, se cumprir a cura passiva (abaixo).
- **Cura passiva:** com 2 K ou mais na Guarda **[I: "2 K" = pelo menos 2]**, cada numérica da **própria Fileira de Defesa**
  que vai ao cemitério, de qualquer naipe, cura valor × (1 + nº de Q), até a vida inicial.
- **Selvagem no papel de A:** escolhe Armadilha ou Roubo.
- **Fim do jogo:** a vida nunca passa da inicial. **Sem limite de rodadas. O anti-travamento sai do jogo por completo**
  (como a Pressão da mesa saiu): o simulador usa um teto só dele, para medir, que nunca vira regra. Desistir segue sendo a
  saída do jogador.
- **Equipar livre (muda a regra original da ordem de compra):** depois da compra, o jogador vê todas as numéricas recebidas
  de uma vez e as põe na fileira que quiser, na ordem que quiser.
- **R5 descartada** (numérica nunca fica na mão). **Novo: limite de 4 especiais na mão**, com penalidade na compra. O motivo
  dele: sem limite, o jogador junta K até a Exódia. A forma da penalidade volta para ele com 2 ou 3 opções medidas no
  simulador.
- **Ainda em aberto:** a Defesa Absoluta contra o Roubo. Em 28/10 ele aprovou a proposta "a Defesa Absoluta do oponente
  bloqueia o Roubo"; hoje escreveu "defesa absoluta anula o dano". Pergunta 7 do lote de 2026-10-30, em `estado.md`.

### Anotações novas (texto do autor)

> 1. Deve haver opção de apagar lista de partidas anteriores salvas;
> 2. Nova funcionalidade: Devastação.
>    O player que ativar as cartas: K + A + J -> invoca a devastação e envia todas as cartas de ataque para o ceminério
>    (mantém buffs equipados e intactos). E ao ativar as cartas: K + A + Q -> é o mesmo só que para fileira de defesa.
>    Reflect repele e devolve a devastação (J ou Q); Nada pode impedir a devastação a não ser o reflect (repele e devolve) e a
>    defesa absoluta (anula).
>    Quando devastação é ativada, deve haver um cinematic (animação) à altura, que empolge e deixe o jogador extasiado de
>    satisfação.
> 3. Correção e ajuste no reflect: Em testes reparei que o oponente ativou o reflect depois que eu ataquei, isso nao pode
>    ocorrer, reflect é jogada de reação. Quando reflect é ativado, o dano volta imediatamente para o adversário na jogada de
>    ataque. (ataque recebido -> ativou -> refletiu -> acabou).
> 4. O player que não tiver nenhuma carta na fileira de ataque equipada não ataca e carta de defesa do adversário não é
>    jogada no ceminério ao fim do turno.
> 5. Mudar a exibição do botão de ressurreição disponível para um uma exibição mais adequada e intuitiva e correspondente à
>    jogada. Algo que remete à ressurreição; o board fica todo quebrado quando tem cartas de buffs e o aviso de resurreição.
> 6. Deve ser possível visualizar todas as cartas da mão (ao invés de uma por vez) e poder escolher qual jogar primeiro. ter
>    mais liberdade de jogada;
> 7. A animação de ataque e defesa absoluta são rápidas demais. Ataques e defesas absolutas devem ser com uma animação um
>    pouco mais demorada pra dar mais empolgação pois é um momento muito difícil de alcançar. O mesmo para Exódia que é ainda
>    mais difícil e deve ocorrer algo cinematográfico e empolgante;
> 8. Enriquecer a experiencia com movimentos mais suaves, está muito seco e rápido;
>
> \* Evite regressões e mantenha o alto nível do projeto;

**Leitura:**

- **1. Apagar o histórico de partidas:** só da web (a lista `coringa:partidas` em `/partidas`). Sem pergunta.
- **2. Devastação:** regra nova. K + A + J esvazia uma Fileira de Ataque e K + A + Q uma Fileira de Defesa; os buffs ficam.
  Só o Reflect (devolve) e a Defesa Absoluta (anula) a impedem. Cena cinematográfica à altura. Detalhes nas perguntas 3 a 6.
- **3. Reflect reativo:** muda o Reflect (hoje é lançado na própria vez e fica armado até o próximo ataque do oponente). Passa
  a ser resposta: atacado → lança → o dano volta na hora → acabou. Detalhes nas perguntas 1 e 2.
- **4. Ataque vazio:** já é a regra (spec 1 §1.5 item 3) e tem teste desde `af6b827` (2026-10-27). Pergunta 8: o que ele viu.
- **5. Ressurreição:** a arte nova do botão entrou na Fase C (`bba8377`). O que é novo: **o tabuleiro quebra quando há buffs e
  o aviso de Ressurreição ao mesmo tempo**. É bug de layout: reproduzir e corrigir. Pergunta 9: tela e momento.
- **6, 7 e 8:** repetem as notas de 23/10. A 7 e a 8 entraram na Fase C (`bba8377`, 27/10), e a 6 é o Equipar livre (item 8
  das respostas acima). Pergunta 8: ele jogou uma versão de depois de 27/10?

---

## 2026-10-28: respostas da Fase E (substituída)

Substituída pela entrada de 2026-10-30, que repete os itens com os ajustes dele. A leitura que a sessão principal da conta
anterior repassou ao sub-projeto 5 está no `diario.md`, entrada de 2026-10-27/28.

## 2026-10-27: a tartaruga

> Nenhuma das opções. O Player que não colocar pelo menos uma carta no ataque, não terá direito de atacar e o oponente não
> perde a carta de defesa. Esse efeito colateral, tartaruga, será testado mais a frente por mim após a finalização do jogo.

Nenhuma regra nova para a tartaruga (morte súbita e empate não entram). Medições em `notas/tartaruga.md`. Com a saída do
anti-travamento (2026-10-30), a tartaruga perde a única forma de vencer parada.

## 2026-10-27: fileiras de 8

> Observação: eu disse que cada fileira de ataque e defesa deveriam ter 10 cartas, corrijo e digo que devem ter 8 cartas.

## 2026-10-23: anotações depois de jogar contra os bots (viraram o sub-projeto 5)

> colocar na fila de pendências assim o sub-projeto 4 (Polimento) for concluído.
>
> Healer x Steal - funcionalidade extra - curar hp e roubar carta;
> - passiva: quando qualquer carta de copas do player for para o cemitério, o valor dela é usada para curar. regra: o player
>   deve estar equipado com 2x ou mais K;
> - ativa: a pessoa pode usar uma carta armadilha (copas ou ouro) pra consumir todas as cartas de copas da própria mesa e se
>   curar, se a fileira estiver buffada (J ou Q, 1x, 2x ou mais) a cura aumenta proporcionalmente; regra: carta Ás de copas ou
>   ouro server para healer - cartas Ás de paus ou espadas serve para steal (roubar) qualquer carta numeral da mesa do
>   oponente e ir para sua mão ou mesa. se a fileira de ataque ou defesa estiver cheia poderá substituir pela última carta. se
>   a mão tiver cheia uma carta deve ser descartada no cemitério. Medir impacto dessas regras para manter o equilíbrio do
>   jogo.
>
> **Liberar as 8 cartas de Ás dos dois baralhos (não lembro se foi reduzida para 6 igual ao K).**
>
> Deve ser possível visualizar todas as cartas da mão (ao invés de uma por vez) e poder escolher qual jogar primeiro. ter mais
> liberdade de jogada;
>
> Mensagens de transição de turno, informações e outros textos são exibidas em tela são muito rápidas e quase não dá pra ler;
>
> Mudar a exibição do botão de ressurreição disponível para um uma exibição mais adequada e intuitiva e correspondente à
> jogada. Algo que remete à ressurreição;
>
> A animação de ataque e defesa absoluta são rápidas demais. Ataques e defesas absolutas devem ser com uma animação um pouco
> mais demorada pra dar mais empolgação pois é um momento muito difícil de alcançar. O mesmo para Exódia que é ainda mais
> difícil e deve ocorrer algo cinematográfico e empolgante;
>
> Ter possibilidade de manter a carta na mão ao invés de ser obrigado a jogar ou descartar pro cemitério quando não tiver mais
> jogada;
>
> BUG no late game: cartas de Buff são computadas mesmo estando na mão do jogador e não na mesa. Cartas de buff que foram pra
> mesa e depois foram pro cemitério continuam bufando. Revisar e corrigir. (bufs de ataque e defesa estão sendo concedidos
> também mesmo o player não tendo as cartas equipadas em mesa);
>
> aumentar de 8 pra 10 o número máximo de cartas (fileiras) de ataque e defesa. aumentar a quantidade de vida padrão para 500;
> deve ser possível ajustar a vida no menu;
>
> BUG: as vezes tenho cartas de bufs, k ou armadilha e não é possível jogar na minha jogada. revise e corrija;
>
> Enriquecer a experiencia com movimentos mais suaves, está muito seco e rápido;
>
> ao fim da partida deve exibir o tempo decorrido e algo como "NOME DO PLAYER" VENCEU! grande e destacado num formato HQ;

E, no mesmo dia: "inclua nas anotações a remoção completa da implementação pressão da mesa."

O que virou cada item está na spec do sub-projeto 5 (`docs/superpowers/specs/2026-10-27-ajustes-design.md`).

## Antes (2026-10-15 a 2026-10-22), em resumo

As palavras dele dessas datas estão nas specs 1 a 4, que ele aprovou. Os marcos:

- **2026-10-15:** pediu a versão web multiplayer do jogo que criou ("te dou liberdade criativa para corrigir, dar novas ideias
  e melhorar"). Aprovou a spec de regras: Reflect quebra todos os K; a compra nunca para (o cemitério vira monte); regras
  novas Escolha da iniciativa, Pressão da mesa (saiu em 2026-10-23) e Coringa Selvagem; **reprovou a Fúria do Coringa**.
- **2026-10-16:** "o jogo deve ter uma switch de testes" (o portão `pnpm check`, hooks e CI). Defesa Absoluta: imunidade de uma
  rodada garantida, mesmo depois de se proteger de um Reflect; o Q sacrificado conta como o consumido. Vida 300 (virou 500 em
  2026-10-27). Fallen is Back e Exódia sem mudança de regra. **Push e merge liberados aos agentes até o MVP** ("pode fazer
  esses push, autorizado a você fazer até o mvp ficar pronto"), com `pnpm check` e CI verdes, por fast-forward ou squash; a
  proteção da `main` e a configuração do GitHub são dele.
- **2026-10-18:** direção visual "A Peleja do Coringa" (xilogravura de cordel); deu à sessão principal permissão de aprovar
  por ele ("responda por mim, lhe dou permissão de aprovação").
- **2026-10-19/20:** delegação total das decisões técnicas e de interface ("não quero sessões, planos ou sub projetos
  pendentes. decida e prossiga"). **Regras do jogo continuam com ele.** A Escolha da iniciativa ficou ligada de vez.
