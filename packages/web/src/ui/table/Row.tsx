// Uma fileira de até `limit` cartas (spec §3.1): as cartas na ordem (a da frente sai primeiro), as vagas vazias
// desenhadas até o limite e, ao lado, o total e a conta. Os números vêm do motor: o total de `attackPower` /
// `defensePower`, a base de `attackBase` / `defenseBase` e as quadras de `quadValues`. A conta "38 × 4" é a base
// vezes o multiplicador, que sai da divisão do total pela base (nenhuma regra repetida aqui).
//
// A grade usa `minmax(0, var(--card-w))` por coluna: com `limit` cartas a fileira cabe em qualquer largura de
// celular sem rolar de lado, e as cartas só encolhem se faltar espaço. Nada aqui corta com `overflow: hidden`,
// para o anel de foco (6 px) de uma carta focável passar por cima das vizinhas.
import {
  attackBase,
  attackPower,
  defenseBase,
  defensePower,
  quadValues,
  type NumCard,
  type PublicPlayer,
} from '@coringa/engine';
import { rowKey } from '../../model/effects.ts';
import { useAnim } from '../anim/context.ts';
import { LitRow } from '../anim/Effects.tsx';
import { useCountedNumber } from '../anim/useCountedNumber.ts';
import { TableCard } from './TableCard.tsx';

export interface RowProps {
  /** Nome acessível do grupo: "Sua fileira de ataque". */
  label: string;
  kind: 'ATK' | 'DEF';
  side: PublicPlayer;
  pressure: number;
  limit: number;
  /** Para onde a fileira de Ataque aponta quando acende (o Coringa do outro). */
  aim?: 'up' | 'down';
}

const CAPTION = { ATK: 'Ataque', DEF: 'Defesa' } as const;

export function Row({ label, kind, side, pressure, limit, aim }: RowProps) {
  const anim = useAnim();
  const cards: NumCard[] = kind === 'ATK' ? side.attackRow : side.defenseRow;
  const total = kind === 'ATK' ? attackPower(side, pressure) : defensePower(side);
  const base = kind === 'ATK' ? attackBase(side) : defenseBase(side);
  const quads = quadValues(cards);
  const vacancies = Math.max(0, limit - cards.length);
  // O total mostrado espera a batida do dano e conta até o valor do motor.
  const shownTotal = useCountedNumber(total);
  const lit = anim.fx.rows.has(rowKey(side.id, kind));

  return (
    <div role="group" aria-label={label} data-aceso={lit ? 'true' : undefined} className="relative flex items-center gap-2">
      {lit ? <LitRow aim={kind === 'ATK' ? aim : undefined} ms={anim.beatMs} /> : null}
      <ul
        role="list"
        className="grid min-w-0 flex-1 list-none gap-1 p-0 pl-[10px] pc:gap-1.5 pc:pl-[14px]"
        style={{ gridTemplateColumns: `repeat(${limit}, minmax(0, var(--card-w)))` }}
      >
        {cards.map((card, index) => (
          <li key={card.id} className="relative min-w-0">
            <TableCard card={card} size="field" front={index === 0} quad={quads.includes(card.value)} />
          </li>
        ))}
        {Array.from({ length: vacancies }, (_, index) => (
          <li
            key={`vaga-${index}`}
            aria-hidden="true"
            data-vaga
            className="aspect-[0.72] min-w-0 rounded-[4px] border-[1.5px] border-dashed border-tinta/40 pc:border-2"
          />
        ))}
      </ul>
      <div className="flex w-[52px] shrink-0 flex-col items-end text-right pc:w-24">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">{CAPTION[kind]}</span>
        <span data-total className="font-texto text-[22px] font-extrabold leading-[1.1] tabular-nums pc:text-3xl">
          {shownTotal}
        </span>
        {base > 0 ? (
          <span data-conta className="font-texto text-[11px] font-semibold tabular-nums pc:text-[13px]">
            {base} × {Math.round(shownTotal / base)}
          </span>
        ) : null}
        {quads.length > 0 ? (
          <span
            data-quadra
            className="mt-0.5 border-[1.5px] border-tinta bg-ouro px-1 font-texto text-[10px] font-bold uppercase leading-tight tabular-nums"
          >
            quadra {quads.map((value) => `+${value}`).join(' ')}
          </span>
        ) : null}
      </div>
    </div>
  );
}
