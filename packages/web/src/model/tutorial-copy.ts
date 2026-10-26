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

/**
 * Dica 9, a frase da Pressão da mesa. É uma frase à parte (um parágrafo só dela): no sub-projeto 5, que remove a Pressão da mesa,
 * ela sai inteira, e a do anti-travamento fica como está.
 */
export const PRESSURE_HINT =
  'Pressão da mesa: cada rodada de Ataque seguida sem ninguém perder vida soma 1 ao multiplicador de ataque dos dois.';

/** Dica 9, a frase do anti-travamento: `rounds` vem de `config.antiStallRounds` da partida (nunca um número escrito aqui). */
export const stallHint = (rounds: number): string =>
  `Anti-travamento: ${rounds} rodadas de Ataque seguidas sem ninguém perder vida encerram a partida. Vence quem tiver mais vida; com vidas iguais, empata.`;

/** Dica 10, o fim: mora no painel de fim da partida (`EndHintNote`), e o link "Jogar com um amigo" é da tela. */
export const END_HINT =
  'A partida acaba quando um Coringa chega a 0 de vida, ou quando alguém monta a Exódia: 4 K na Guarda. Gostou? Chame alguém para uma sala.';

/** Os parágrafos de cada dica, exceto a 9 (que depende da config da partida). */
const HINT_TEXT: Record<Exclude<HintId, 'pressure'>, string> = {
  equip:
    'Suas numéricas vão para o campo na ordem em que saíram, e você só escolhe o destino: Ataque ou Defesa. Cada fileira é uma fila: quando você ataca, a primeira carta do seu Ataque vai para o cemitério; quando defende, a primeira da sua Defesa.',
  quad: 'Quadra: quatro ou mais numéricas do mesmo valor na mesma fileira, seguidas ou não, somam esse valor à fileira e dão uma Ressurreição, que traz uma numérica do cemitério de volta.',
  order:
    'Quem tem a iniciativa escolhe atacar primeiro ou em segundo. Depois de cada rodada de Ataque, ela fica com quem causou mais dano; no empate, não muda.',
  firstAttack:
    'Sua vez de atacar: o dano é o seu ATK menos a DEF do oponente, no mínimo 0. Com cartas no Ataque, atacar é obrigatório. O botão mostra a conta antes de você confirmar.',
  buffs:
    'Cada J soma 1 ao multiplicador do seu ataque, e cada Q ao da sua defesa (até 4 de cada). Um K na Guarda absorve um golpe inteiro e quebra.',
  trap: 'Janela de reação: quando o oponente ataca, você pode responder com um A, que destrói um J, Q ou K dele; quando ele joga K, o A só destrói um K da Guarda. Ou passar. O A também vale no seu turno.',
  wild: 'O Coringa Selvagem vale como J, Q ou A, à sua escolha. Nunca como K.',
  reflect:
    'Reflect é K + J + Q da mão, no seu turno. Se o oponente atacar no turno seguinte, ele perde os K e Q e leva o golpe de volta. Você não leva nada. Se ele não atacar, o Reflect se desfaz.',
  end: END_HINT,
};

/** Os parágrafos da dica `id`; o anti-travamento da dica 9 leva o número de rodadas da partida (`config.antiStallRounds`). */
export function hintParagraphs(id: HintId, antiStallRounds: number): readonly string[] {
  return id === 'pressure' ? [PRESSURE_HINT, stallHint(antiStallRounds)] : [HINT_TEXT[id]];
}
