// Os textos do tutorial (plano da fatia 4, "Textos finais das dicas", revisados pela sessão principal em 2026-10-26). Moram aqui, e
// não no `copy.ts`, porque só a tela do tutorial os importa: o `copy.ts` é do JavaScript inicial, e este arquivo vai no pedaço
// do tutorial (`scripts/smoke.ts` confere). Os rótulos que o resto do site também usa (o "Aprender jogando" da tela inicial, a faixa
// "Tutorial") ficam no `copy.ts`.
import type { HintId } from './tutorial.ts';

/** Enquanto o módulo da sala local (o bot) chega, e se ele não chegar (o diálogo é o mesmo do treino: "Recarregar" e "Voltar ao início"). */
export const TUTORIAL_LOADING_TEXT = 'Preparando o tutorial…';
export const TUTORIAL_FAILED_TITLE = 'Não deu para carregar o tutorial';

/** O nome do painel (região da dica). */
export const HINT_PANEL_LABEL = 'Dica';
/** Marca a dica como vista. */
export const HINT_GOT_IT_LABEL = 'Entendi';
/** Esconde o painel e grava `skipped`; a partida segue. */
export const HINT_SKIP_LABEL = 'Pular o tutorial';
/** O link da dica do fim, para a tela inicial. */
export const HINT_FRIEND_LABEL = 'Jogar com um amigo';

/** A última dica, o fim (a do anti-travamento saiu na E1 do sub-projeto 5): mora no painel de fim da partida (`EndHintNote`), e o link "Jogar com um amigo" é da tela. */
export const END_HINT =
  'A partida acaba quando um Coringa chega a 0 de vida, ou quando alguém monta a Exódia: 4 K na Guarda. Gostou? Chame alguém para uma sala.';

/** Os parágrafos de cada dica. */
const HINT_TEXT: Record<HintId, string> = {
  equip:
    'Suas numéricas vão para o campo na ordem que quiser: toque numa carta e depois no destino, Ataque ou Defesa (ou arraste a carta até a fileira). Cada fileira é uma fila: quando você ataca, a primeira carta do seu Ataque vai para o cemitério; quando defende, a primeira da sua Defesa.',
  quad: 'Quadra: quatro ou mais numéricas do mesmo valor na mesma fileira, seguidas ou não, somam esse valor à fileira e dão uma Ressurreição, que traz uma numérica do cemitério de volta.',
  order:
    'Quem tem a iniciativa escolhe atacar primeiro ou em segundo. Depois de cada rodada de Ataque, ela fica com quem causou mais dano; no empate, não muda. Durante o Ataque, a faixa do centro mostra o dano de cada um na rodada.',
  firstAttack:
    'Sua vez de atacar: o dano é o seu ATK menos a DEF do oponente, no mínimo 0. Com cartas no Ataque, atacar é obrigatório. O botão mostra a conta antes de você confirmar.',
  buffs:
    'Cada J soma 1 ao multiplicador do seu ataque, e cada Q ao da sua defesa (até 4 de cada). Um K na Guarda absorve um golpe inteiro e quebra; com 2 K ou mais, cada numérica que sai da sua Defesa cura você.',
  steal:
    'O A também rouba, no seu turno: leva uma numérica do oponente para a fileira que você escolher. Ele perde o valor dela de vida (um K na Guarda dele anula esse dano, e o roubo nunca mata), e você cura o mesmo valor. O botão do alvo mostra a conta.',
  trap: 'Janela de reação: quando o oponente ataca, você pode responder com um A, que destrói um J, Q ou K dele; quando ele joga K, o A só destrói um K da Guarda. Ou passar. No seu turno, o A vale como Armadilha ou como Roubo.',
  wild: 'O Coringa Selvagem vale como J, Q ou A, à sua escolha. Nunca como K.',
  devastation:
    'Devastação: K + A + J da mão esvazia a fileira de Ataque do oponente; K + A + Q, a de Defesa. As numéricas dela vão para o cemitério, e os buffs ficam. Ele só pode responder com um Reflect, que devolve a Devastação para você.',
  reflect:
    'Reflect é K + J + Q da mão, jogado quando o oponente ataca ou lança uma Devastação. O ataque volta para ele, que perde os K e Q, e você não leva nada; a Devastação volta para quem a lançou. Se ele responder com outro Reflect, os dois se anulam.',
  limit:
    'Sua mão guarda no máximo 4 especiais: a que passaria disso vai direto para o cemitério. Jogue as especiais para abrir espaço.',
  end: END_HINT,
};

/** Os parágrafos da dica `id`. */
export function hintParagraphs(id: HintId): readonly string[] {
  return [HINT_TEXT[id]];
}
