# Decisões do autor

A mais nova em cima. Cada entrada traz a data, o texto do autor entre aspas (ou em bloco, quando é longo) e depois a leitura de
quem registrou: **[I]** marca interpretação que ele não disse com essas palavras. Só se acrescenta; uma decisão que substitui
outra diz qual. As specs (`docs/superpowers/specs/`) guardam a regra já escrita; aqui fica a origem dela.

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
