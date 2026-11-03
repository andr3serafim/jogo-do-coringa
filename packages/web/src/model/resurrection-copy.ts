// Os textos da Ressurreição no instante da quadra (ponto 16 do playtest): o painel da janela depois da revelação do Equipar e o passo
// da fileira no cemitério, com a troca da última carta e a carta da quadra que não sai. Moram aqui, e não no `copy.ts`, para a sessão
// do bloco A (que mexe no `copy.ts`) e esta não se cruzarem; os rótulos que já existiam ("Ressuscitar", o título do cemitério) ficam lá.
import type { Card, RowName } from '@coringa/engine';
import { cardText, ROW_NAME } from '@coringa/sim/text';

/** O título do painel da janela. */
export const RESURRECTION_WINDOW_TITLE = 'Ressurreição agora';
/** O texto do painel, para quem decide. */
export const RESURRECTION_WINDOW_TEXT =
  'Você formou quadra na revelação: pode ressuscitar agora, antes do ataque, ou guardar a Ressurreição para depois.';
/** O texto do painel, para quem espera o outro decidir. */
export const resurrectionWaitingText = (name: string): string => `${name} formou quadra e decide se ressuscita agora`;
/** O botão que passa a janela: a Ressurreição fica guardada. */
export const KEEP_RESURRECTION_LABEL = 'Guardar';

/** A linha de baixo da fileira, quando a ressuscitada entra no lugar da última. */
export const resurrectReplaceDetail = (card: Card): string => `no lugar de ${cardText(card)}, que vai ao cemitério`;
/** O total da fileira, antes e depois da Ressurreição (o mesmo número que a mesa mostra). */
export const resurrectTotalText = (before: number, after: number): string => `total ${before} → ${after}`;
/** A fileira que não aceita: a última carta é da quadra. */
export const resurrectProtectedText = (row: RowName, card: Card): string =>
  `${ROW_NAME[row]}: a última, ${cardText(card)}, é da quadra e não sai`;
/** Sem opção nenhuma, com as duas fileiras protegidas. */
export const RESURRECT_ALL_PROTECTED_TEXT =
  'As duas fileiras estão cheias e a última de cada uma é da quadra: a Ressurreição fica guardada.';
