// O painel da dica do tutorial (spec do polimento, §5): a dica do momento, com "Entendi" (marca vista) e "Pular o tutorial". Não é
// modal e não prende o foco: são botões comuns, na ordem do documento, e nada leva o foco para cá (nem `autoFocus`). Quem o põe no
// lugar (no alto da coluna do histórico no PC, no fluxo acima dos campos no celular e no tablet) é a `Table`, sem `z-index` nem
// posição fixa: fica abaixo das camadas da cena e da faixa e nunca cobre a mão nem a barra.
//
// A região viva (`polite`) fica sempre montada, como a dos anúncios da faixa: uma região criada já preenchida pode não ser lida. Ela
// nasce VAZIA (o primeiro desenho não traz dica nenhuma) e a dica entra no desenho seguinte, já com a região na página; sem dica
// ela fica vazia e fora da vista (`sr-only`). Só o texto está na região viva (os botões, não): o leitor de tela lê a dica, e não a
// lista de botões a cada troca. O conteúdo não é chaveado pela dica: na troca de uma para a próxima os botões são os mesmos, e o
// foco que estava em "Entendi" continua lá. Quando o painel esvazia com o foco nele ("Entendi" na última dica) ou some ("Pular"),
// o foco vai ao painel de baixo da mesa (`[data-painel]`) ou, sem ele, ao título da mesa: nunca cai na página.
//
// No celular e no tablet o painel é o primeiro filho dos campos, que rolam por dentro: uma dica nova leva o painel à vista
// (`scrollIntoView`, instantâneo e só o que falta), senão ela chegaria fora da janela se os campos já estivessem rolados.
//
// `data-sem-pulo`: o painel mora dentro do palco, que termina as batidas com um toque na mesa e engole o clique desse gesto. Os
// botões daqui não mandam jogada nenhuma, então o toque neles é só deles (como nos controles do replay).
//
// A dica do fim não passa por aqui: o painel de fim (`EndPanel`) é um `<dialog>` modal, que deixa o resto da página inerte (sem
// clique, sem foco, fora da árvore de acessibilidade), e a dica ficaria atrás dele. Ela vai dentro do diálogo (`EndHintNote`).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  END_HINT,
  HINT_FRIEND_LABEL,
  HINT_GOT_IT_LABEL,
  HINT_PANEL_LABEL,
  HINT_SKIP_LABEL,
  hintParagraphs,
} from '../../model/tutorial-copy.ts';
import type { HintId } from '../../model/tutorial.ts';
import { AppLink, Button } from '../parts.tsx';

export interface HintPanelProps {
  /** A dica no painel; `null`: nada a mostrar (a região viva segue montada, vazia). A do fim vai no painel de fim, e não aqui. */
  hint: Exclude<HintId, 'end'> | null;
  /** "Entendi": a dica fica vista, e a próxima que valer ocupa o painel. */
  onGotIt: () => void;
  /** "Pular o tutorial": grava `skipped` e esconde o painel; a partida segue. */
  onSkip: () => void;
}

/** Para onde o foco vai quando o botão que o tinha sai da página: o painel de baixo da mesa (o do Equipar, a barra ou a ordem) ou, sem ele, o título dela. */
function focusTable(): void {
  const target =
    document.querySelector<HTMLElement>('[data-painel]') ?? document.querySelector<HTMLElement>('main[aria-label="Mesa"] h1');
  target?.focus({ preventScroll: true });
}

export function HintPanel({ hint, onGotIt, onSkip }: HintPanelProps) {
  const focusInside = useRef(false);
  const root = useRef<HTMLElement>(null);
  // O primeiro desenho vai sem dica: a região viva já está na página quando o texto entra.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- é a ideia: o desenho seguinte ao primeiro (com a região viva já na página) leva a dica
    setReady(true);
  }, []);
  const shown = ready ? hint : null;

  // Uma dica nova toma o painel: ele vem à vista (os campos podem estar rolados). Uma vez por dica, e nunca com o painel vazio.
  useLayoutEffect(() => {
    if (shown !== null) root.current?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
  }, [shown]);

  // O painel esvaziou com o foco nele: o botão que o tinha saiu da página.
  useLayoutEffect(() => {
    if (shown !== null || !focusInside.current) return;
    focusInside.current = false;
    focusTable();
  }, [shown]);
  // O painel inteiro saiu ("Pular"): o mesmo. A limpeza roda depois de o botão sair da página, e a ref guarda onde o foco estava.
  useEffect(
    () => () => {
      if (focusInside.current) focusTable();
    },
    [],
  );

  return (
    <section
      ref={root}
      aria-label={HINT_PANEL_LABEL}
      data-dica-painel
      data-sem-pulo
      onFocus={() => (focusInside.current = true)}
      onBlur={() => (focusInside.current = false)}
      className={
        shown === null
          ? 'sr-only'
          : 'flex flex-col gap-2 border-4 border-tinta bg-papel p-3 text-tinta max-pc:mx-3 max-pc:mb-1 max-pc:mt-2'
      }
    >
      <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-2">
        {shown === null ? null : (
          <>
            <p aria-hidden="true" className="font-madeira text-sm uppercase leading-none tracking-wide">
              {HINT_PANEL_LABEL}
            </p>
            {hintParagraphs(shown).map((text) => (
              <p key={text} className="text-[14px] leading-snug">
                {text}
              </p>
            ))}
          </>
        )}
      </div>
      {shown === null ? null : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button onClick={onGotIt}>{HINT_GOT_IT_LABEL}</Button>
          <button type="button" onClick={onSkip} className="min-h-11 px-1 text-sm font-bold underline">
            {HINT_SKIP_LABEL}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * A dica do fim, dentro do painel de fim (`EndPanel`, no `note`): o texto e o link "Jogar com um amigo" para a tela inicial. Sem
 * "Entendi" nem "Pular": o tutorial acabou, e `onShown` avisa que a dica apareceu (o tutorial fica concluído aí).
 */
export function EndHintNote({ onShown }: { onShown: () => void }) {
  useEffect(() => {
    onShown();
  }, [onShown]);
  return (
    <div data-dica-nota className="flex flex-col gap-1">
      <p aria-hidden="true" className="font-madeira text-sm uppercase leading-none tracking-wide">
        {HINT_PANEL_LABEL}
      </p>
      <p>{END_HINT}</p>
      <div>
        <AppLink to="/">{HINT_FRIEND_LABEL}</AppLink>
      </div>
    </div>
  );
}
