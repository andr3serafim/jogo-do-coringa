// O histórico da partida (spec §3.1, §7 e §10.5): uma região `aria-live="polite"` com os textos de
// `@coringa/sim/text`. Em toda tela é uma gaveta que o botão do campo do oponente abre, com a contagem do que é novo: no celular e
// no tablet (< 1024 px) sobe de baixo; no PC entra pela direita, por cima da mesa (decisoes.md 2026-11-26 (8), D1; antes era uma coluna
// sempre à vista). A árvore é uma só: fechada, a gaveta fica fora da vista mas dentro
// da árvore de acessibilidade (`sr-only`), porque uma região `display: none` não anuncia nada ao leitor de tela.
import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { HistoryLine } from '../../model/history.ts';
import { historyButtonName } from './labels.ts';

export interface HistoryButtonProps {
  panelId: string;
  open: boolean;
  /** Quantas linhas são novas (spec §10.5). */
  count: number;
  onToggle: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}

/** O botão do histórico, no campo do oponente, ao lado do menu (em toda tela). */
export function HistoryButton({ panelId, open, count, onToggle, buttonRef }: HistoryButtonProps) {
  return (
    <button
      type="button"
      ref={buttonRef}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={historyButtonName(count)}
      onClick={onToggle}
      className="relative grid size-11 place-items-center border-2 border-papel/60 bg-transparent"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-5">
        <path d="M4 7h16M4 12h16M4 17h10" className="stroke-papel" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </svg>
      {count > 0 ? (
        <span
          aria-hidden="true"
          data-numero
          className="absolute -right-2 -top-2 min-w-5 border-2 border-tinta bg-papel px-1 text-center font-texto text-xs font-bold leading-tight tabular-nums text-vermelho"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export interface HistoryPanelProps {
  id: string;
  open: boolean;
  onClose: () => void;
  lines: readonly HistoryLine[];
  /** As linhas com `seq` maior levam "novo"; `null` sem base de marcas. */
  baseSeq: number | null;
  /** Sala e placar, ao pé da gaveta. */
  footer?: ReactNode;
}

/** Até onde do fim da lista ainda conta como "no fim". */
const NEAR_END_PX = 24;

/**
 * O ponto `pc` do tema (`--breakpoint-pc` em `styles.css`): a partir dele a gaveta do histórico entra pela direita. O Tailwind inlina o
 * valor nas media queries (não deixa a variável no CSS final), então o número é repetido aqui, e um teste confere que é o mesmo.
 */
export const PC_QUERY = '(min-width: 1024px)';

const CLOSED = 'sr-only';
const OPEN =
  'fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] border-t-4 border-ouro pb-[max(1rem,env(safe-area-inset-bottom))] pc:inset-x-auto pc:inset-y-0 pc:right-0 pc:max-h-none pc:w-[400px] pc:max-w-[90vw] pc:border-l-4 pc:border-t-0 pc:px-6 pc:py-[22px]';

export function HistoryPanel({ id, open, onClose, lines, baseSeq, footer }: HistoryPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** A lista está no fim (ou perto): só então uma linha nova a puxa para baixo. Quem lê o que ficou para cima não é interrompido. */
  const atEnd = useRef(true);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // Abrir a gaveta mostra o que há de mais novo.
  useEffect(() => {
    const el = scrollRef.current;
    atEnd.current = true;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open]);

  // Linha nova: a lista rola até o fim, onde ela chega, se já estava lá.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atEnd.current) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_END_PX;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open || event.key !== 'Escape') return;
    // Tratado aqui: o Esc que cancela a escolha da mão (um ouvinte do documento) olha `defaultPrevented` e deixa passar.
    event.preventDefault();
    onClose();
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={onClose}
          className="fixed inset-0 z-30 cursor-default bg-tinta/50"
        />
      ) : null}
      <aside
        id={id}
        aria-label="Histórico da partida"
        onKeyDown={onKeyDown}
        className={`flex min-h-0 flex-col gap-3.5 madeira-escura p-4 text-papel ${open ? OPEN : CLOSED}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="textura font-madeira text-[22px] uppercase">Histórico</h2>
          <button
            type="button"
            ref={closeRef}
            aria-label="Fechar o histórico"
            tabIndex={open ? 0 : -1}
            onClick={onClose}
            className="min-h-11 border-2 border-papel/60 bg-transparent px-4 font-bold text-papel"
          >
            Fechar
          </button>
        </div>
        {/* A lista rola, então o teclado precisa chegar nela (axe: scrollable-region-focusable). Gaveta fechada é só
            texto para o leitor de tela: sem rolagem e fora do Tab, para não sobrar parada invisível. */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          tabIndex={open ? 0 : undefined}
          role="region"
          aria-label="Linhas do histórico"
          className={`min-h-0 flex-1 select-text pr-1 ${open ? 'overflow-y-auto' : 'overflow-hidden'}`}
        >
          <ol role="list" aria-live="polite" className="flex list-none flex-col gap-[7px] text-sm leading-[1.35] pc:text-[14px]">
            {lines.map((line, index) => (
              <li
                key={index}
                className={
                  line.kind === 'round'
                    ? 'mt-2 font-madeira text-[13px] uppercase tracking-[0.04em] text-ouro'
                    : line.kind === 'note'
                      ? 'font-bold italic text-ouro'
                      : ''
                }
              >
                {line.text}
                {baseSeq !== null && line.seq > baseSeq ? (
                  <>
                    {' '}
                    <span className="inline-block bg-papel px-1 align-middle font-texto text-[10px] font-bold uppercase leading-tight not-italic text-vermelho">
                      novo
                    </span>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
        {footer ? (
          <div className="flex flex-col gap-1 border-t border-papel/25 pt-3 text-sm">{footer}</div>
        ) : null}
      </aside>
    </>
  );
}
