// As placas de estado do Coringa (bloco A dos pontos do playtest, ponto 6; spec `2026-11-03-playtest-design.md` §3.3): cada marca vira uma
// placa com medalhão (a figura de hoje num disco), o nome e uma linha do que ela faz, do lado de quem a vê. Três gestos lentos se repetem,
// a cada ~3 s: a cruz da cura bate e solta um "+", a alma sobe do túmulo da Ressurreição (e o número vira um selo), e o espelho do Reflect
// brilha (`MirrorMark`). Área pequena, só `transform` e `opacity`, nada que acenda a tela; com movimento reduzido, nenhum gesto. Abaixo de
// 600 px a linha do que faz some (`placa-faz`, no `styles.css`), e o nome fica.
import type { ReactNode } from 'react';
import { useAnim } from '../anim/context.ts';
import { resurrectionsText } from './labels.ts';

export type StateKind = 'cura' | 'res' | 'defesa' | 'ataque';

/** O disco do medalhão, na cor da marca. */
const MEDAL: Record<StateKind, string> = {
  cura: 'bg-cura',
  res: 'bg-tinta',
  defesa: 'bg-tinta',
  ataque: 'bg-tinta',
};

/** As fortes (os Absolutos) ficam no ouro; as outras, no papel. */
const STRONG: ReadonlySet<StateKind> = new Set(['defesa', 'ataque']);

const NAME: Record<Exclude<StateKind, 'res'>, string> = {
  cura: 'Cura passiva',
  defesa: 'Defesa Absoluta',
  ataque: 'Ataque Absoluto armado',
};

export interface StatePlateProps {
  kind: StateKind;
  /** A linha do que a marca faz, do lado de quem a vê (`plateLine`). */
  does: string;
  /** A figura da marca (`icons.tsx`). */
  icon: ReactNode;
  /** Quantas Ressurreições (só na Ressurreição). */
  count?: number;
}

export function StatePlate({ kind, does, icon, count = 1 }: StatePlateProps) {
  const { reduced } = useAnim();
  const name = kind === 'res' ? (count > 1 ? 'Ressurreições' : 'Ressurreição') : NAME[kind];
  return (
    <li
      data-placa-estado={kind}
      className={`flex items-center gap-1.5 border-2 border-tinta py-0.5 pl-0.5 pr-2 ${STRONG.has(kind) ? 'bg-ouro' : 'bg-papel'}`}
    >
      <span
        aria-hidden="true"
        data-medalhao
        className={`relative grid size-7 shrink-0 place-items-center rounded-full border-2 border-tinta pc:size-8 ${MEDAL[kind]}`}
      >
        <span data-gesto={!reduced && kind === 'cura' ? 'cura' : undefined} className="grid place-items-center">
          {icon}
        </span>
        {!reduced && kind === 'cura' ? (
          <span data-gesto-mais className="absolute -top-1.5 right-0 font-texto text-[11px] font-extrabold leading-none text-cura">
            +
          </span>
        ) : null}
        {!reduced && kind === 'res' ? (
          <span data-gesto="alma" className="absolute left-1/2 top-0.5 h-2.5 w-2 -translate-x-1/2 rounded-[1px] border border-tinta bg-papel" />
        ) : null}
        {kind === 'res' ? (
          <span
            aria-hidden="true"
            data-selo
            className="absolute -bottom-1 -right-1.5 grid size-4 place-items-center rounded-full border-[1.5px] border-tinta bg-ouro font-texto text-[10px] font-extrabold leading-none tabular-nums text-tinta"
          >
            {count}
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span data-placa-nome aria-hidden={kind === 'res' ? true : undefined} className="text-[11px] font-bold uppercase pc:text-xs">
          {name}
        </span>
        <span data-placa-faz className="placa-faz font-texto text-[10px] pc:text-[11px]">
          {does}
        </span>
      </span>
      {kind === 'res' ? <span className="sr-only">{resurrectionsText(count)}</span> : null}
    </li>
  );
}
