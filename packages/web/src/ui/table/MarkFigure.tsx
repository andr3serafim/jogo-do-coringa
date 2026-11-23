// As marcas do Coringa só com a figura (decisoes.md 2026-11-23 (8) a (10); spec `2026-11-23-cura-placas-historico-design.md` §5): no lugar
// da placa com o nome e a linha, o medalhão (36 px; 44 px no PC) com a figura e os gestos lentos de antes (a cruz da cura que bate, a alma
// da Ressurreição; o selo com o número). Ele é um botão: o nome acessível diz o nome e o que a marca faz ("Cura passiva: a sua Defesa que
// cai vira vida"; na Ressurreição, o número visível do selo vai no nome, WCAG 2.5.3). A dica (o mesmo texto, num cartão de papel com
// contorno de tinta e sombra dura) abre ao passar o mouse, ao focar pelo teclado e ao tocar; uma por vez (`mark-tip.ts`); fecha ao tocar
// fora, no Esc (que ela marca, para não pular a cena nem abrir o menu), ao rolar e ao redimensionar. Ela desenha no `body`, presa à tela
// (os campos rolam por dentro e cortariam uma dica presa a eles), e fica escondida do leitor de tela: o nome do botão já diz tudo.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useAnim } from '../anim/context.ts';
import { currentTip, openTip, useOpenTip } from './mark-tip.ts';

export type MarkKind = 'cura' | 'res' | 'defesa' | 'ataque' | 'reflect';

/** O disco do medalhão, na cor da marca: as fortes (os Absolutos) no ouro. */
const DISK: Record<MarkKind, string> = {
  cura: 'bg-cura',
  res: 'bg-tinta',
  defesa: 'bg-ouro',
  ataque: 'bg-ouro',
  reflect: 'bg-tinta',
};

export interface MarkFigureProps {
  kind: MarkKind;
  /** Único na mesa (o dono e a marca): a dica aberta é uma só. */
  id: string;
  /** O nome que a dica mostra e o começo do nome acessível ("Cura passiva"; na Ressurreição, com o número: "2 Ressurreições disponíveis"). */
  name: string;
  /** A linha do que a marca faz, do lado de quem a vê (`plateLine`). */
  does: string;
  icon: ReactNode;
  /** O número do selo (só na Ressurreição). */
  count?: number;
}

export function MarkFigure({ kind, id, name, does, icon, count }: MarkFigureProps) {
  const { reduced } = useAnim();
  const open = useOpenTip() === id;
  const button = useRef<HTMLButtonElement>(null);
  /** Como a dica abriu: o mouse que passou a fecha ao sair; o toque e o foco, não. */
  const how = useRef<'hover' | 'focus' | 'tap' | null>(null);
  /** O foco que veio de um toque ou clique (o clique decide sozinho, e o foco não abre de novo). */
  const pressed = useRef(false);

  // A figura que sai com a dica aberta a fecha.
  useEffect(
    () => () => {
      if (currentTip() === id) openTip(null);
    },
    [id],
  );

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!button.current?.contains(event.target as Node)) openTip(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      openTip(null);
    };
    const close = () => openTip(null);
    // Só o rolar que mexe a figura (a página, ou o campo que a contém) solta a dica dela; o histórico, que desce sozinho a cada batida,
    // não a fecha.
    const scrolled = (event: Event) => {
      const target = event.target;
      if (target === document || (target instanceof Node && button.current !== null && target.contains(button.current))) openTip(null);
    };
    // Na captura: o Esc chega aqui antes dos ouvintes da mesa (o pulo das batidas, o menu), que ignoram o evento já marcado.
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    document.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape, true);
      document.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <button
      ref={button}
      type="button"
      data-marca={kind}
      aria-label={`${name}: ${does}`}
      aria-expanded={open}
      className={`marca-medalhao relative grid size-9 shrink-0 cursor-help place-items-center rounded-full border-2 border-tinta pc:size-11 ${DISK[kind]}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return;
        how.current = 'hover';
        openTip(id);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && how.current === 'hover' && currentTip() === id) openTip(null);
      }}
      onPointerDown={() => {
        pressed.current = true;
      }}
      onFocus={() => {
        if (!pressed.current) {
          how.current = 'focus';
          openTip(id);
        }
        pressed.current = false;
      }}
      onBlur={() => {
        if (how.current === 'focus' && currentTip() === id) openTip(null);
      }}
      onClick={() => {
        // A dica que o mouse abriu fica no clique (agora presa); senão, o toque alterna.
        if (open && how.current === 'hover') {
          how.current = 'tap';
          return;
        }
        if (open) openTip(null);
        else {
          how.current = 'tap';
          openTip(id);
        }
      }}
    >
      <span aria-hidden="true" data-gesto={!reduced && kind === 'cura' ? 'cura' : undefined} className="grid place-items-center">
        {icon}
      </span>
      {!reduced && kind === 'cura' ? (
        <span aria-hidden="true" data-gesto-mais className="absolute -top-1.5 right-0 font-texto text-[11px] font-extrabold leading-none text-cura">
          +
        </span>
      ) : null}
      {!reduced && kind === 'res' ? (
        <span aria-hidden="true" data-gesto="alma" className="absolute left-1/2 top-0.5 h-2.5 w-2 -translate-x-1/2 rounded-[1px] border border-tinta bg-papel" />
      ) : null}
      {count !== undefined ? (
        <span
          aria-hidden="true"
          data-selo
          className="absolute -bottom-1 -right-1.5 grid size-[18px] place-items-center rounded-full border-[1.5px] border-tinta bg-ouro font-texto text-[11px] font-extrabold leading-none tabular-nums text-tinta"
        >
          {count}
        </span>
      ) : null}
      {open ? createPortal(<Tip anchor={button} name={name} does={does} />, document.body) : null}
    </button>
  );
}

/** A distância da dica à figura e à borda da tela. */
const GAP = 8;

/** O cartão da dica, preso à tela pela caixa da figura: embaixo dela, ou em cima perto do pé da tela, sem sair pelos lados. */
function Tip({ anchor, name, does }: { anchor: RefObject<HTMLButtonElement | null>; name: string; does: string }) {
  const card = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const at = anchor.current?.getBoundingClientRect();
    const size = card.current?.getBoundingClientRect();
    if (!at || !size) return;
    const below = at.bottom + GAP;
    const top = below + size.height > window.innerHeight - GAP ? Math.max(GAP, at.top - GAP - size.height) : below;
    const left = Math.min(Math.max(GAP, at.left + at.width / 2 - size.width / 2), Math.max(GAP, window.innerWidth - GAP - size.width));
    setPlace({ left, top });
  }, [anchor]);
  return (
    <div
      ref={card}
      data-dica-marca=""
      aria-hidden="true"
      className="marca-dica pointer-events-none fixed z-50 w-max max-w-[15rem] border-2 border-tinta bg-papel px-2.5 py-1.5 text-tinta shadow-[3px_3px_0_var(--color-tinta)]"
      style={place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <span className="block text-xs font-bold uppercase tracking-[0.04em]">{name}</span>
      <span className="mt-0.5 block font-texto text-xs leading-snug">{does}</span>
    </div>
  );
}
