// O painel da dica do tutorial (spec do polimento, §5): a dica do momento, com "Entendi" (marca vista) e "Pular o tutorial". Não é
// modal e não prende o foco: são botões comuns, na ordem do documento, e nada leva o foco para cá (nem `autoFocus`). Quem o põe no
// lugar (no alto da coluna do histórico no PC, no fluxo acima dos campos no celular e no tablet) é a `Table`, sem `z-index` nem
// posição fixa: fica abaixo das camadas da cena e da faixa e nunca cobre a mão nem a barra.
//
// A região viva (`polite`) fica sempre montada, como a dos anúncios da faixa: uma região criada já preenchida pode não ser lida.
// Sem dica ela fica vazia e fora da vista (`sr-only`), e ao chegar uma o texto entra nela. Só o texto está na região viva (os
// botões, não): o leitor de tela lê a dica, e não a lista de botões a cada troca. O conteúdo não é chaveado pela dica: na troca de
// uma para a próxima os botões são os mesmos, e o foco que estava em "Entendi" continua lá. Quando o painel esvazia com o foco nele
// ("Entendi" na última dica) ou some ("Pular"), o foco vai ao painel de baixo da mesa (`[data-painel]`), e não cai na página.
//
// `data-sem-pulo`: o painel mora dentro do palco, que termina as batidas com um toque na mesa e engole o clique desse gesto. Os
// botões daqui não mandam jogada nenhuma, então o toque neles é só deles (como nos controles do replay).
import { useEffect, useLayoutEffect, useRef } from 'react';
import { hintParagraphs, HINT_FRIEND_LABEL, HINT_GOT_IT_LABEL, HINT_PANEL_LABEL, HINT_SKIP_LABEL } from '../../model/tutorial-copy.ts';
import type { HintId } from '../../model/tutorial.ts';
import { AppLink, Button } from '../parts.tsx';

export interface HintPanelProps {
  /** A dica no painel; `null`: nada a mostrar (a região viva segue montada, vazia). */
  hint: HintId | null;
  /** `config.antiStallRounds` da partida: a dica 9 diz quantas rodadas sem dano encerram a partida. */
  antiStallRounds: number;
  /** "Entendi": a dica fica vista, e a próxima que valer ocupa o painel. */
  onGotIt: () => void;
  /** "Pular o tutorial": grava `skipped` e esconde o painel; a partida segue. */
  onSkip: () => void;
}

/** O foco vai para o painel de baixo da mesa (o do Equipar, a barra ou a ordem), que o recebe por código. */
function focusTablePanel(): void {
  document.querySelector<HTMLElement>('[data-painel]')?.focus({ preventScroll: true });
}

export function HintPanel({ hint, antiStallRounds, onGotIt, onSkip }: HintPanelProps) {
  const focusInside = useRef(false);

  // O painel esvaziou com o foco nele: o botão que o tinha saiu da página.
  useLayoutEffect(() => {
    if (hint !== null || !focusInside.current) return;
    focusInside.current = false;
    focusTablePanel();
  }, [hint]);
  // O painel inteiro saiu ("Pular"): o mesmo. A limpeza roda depois de o botão sair da página, e a ref guarda onde o foco estava.
  useEffect(
    () => () => {
      if (focusInside.current) focusTablePanel();
    },
    [],
  );

  const ended = hint === 'end';
  return (
    <section
      aria-label={HINT_PANEL_LABEL}
      data-dica-painel
      data-sem-pulo
      onFocus={() => (focusInside.current = true)}
      onBlur={() => (focusInside.current = false)}
      className={
        hint === null
          ? 'sr-only'
          : 'flex flex-col gap-2 border-4 border-tinta bg-papel p-3 text-tinta max-pc:mx-3 max-pc:mb-1 max-pc:mt-2'
      }
    >
      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-2">
        {hint === null ? null : (
          <>
            <p aria-hidden="true" className="font-madeira text-sm uppercase leading-none tracking-wide">
              {HINT_PANEL_LABEL}
            </p>
            {hintParagraphs(hint, antiStallRounds).map((text) => (
              <p key={text} className="text-[14px] leading-snug">
                {text}
              </p>
            ))}
          </>
        )}
      </div>
      {hint === null ? null : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button onClick={onGotIt}>{HINT_GOT_IT_LABEL}</Button>
          {ended ? <AppLink to="/">{HINT_FRIEND_LABEL}</AppLink> : null}
          {ended ? null : (
            <button type="button" onClick={onSkip} className="min-h-11 px-1 text-sm font-bold underline">
              {HINT_SKIP_LABEL}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
