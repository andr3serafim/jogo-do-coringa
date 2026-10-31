// Uma fileira de até `limit` cartas (spec §3.1): as cartas na ordem (a da frente sai primeiro), as vagas vazias
// desenhadas até o limite e, ao lado, o total e a conta. Os números vêm do motor: o total de `attackPower` /
// `defensePower`, a base de `attackBase` / `defenseBase` e as quadras de `quadValues`. A conta "38 × 4" é a base
// vezes o multiplicador, que sai da divisão do total pela base (nenhuma regra repetida aqui). A divisão é sempre entre
// números do mesmo quadro: enquanto o total espera e conta na batida do dano, a conta fica a de antes, e só troca quando a
// contagem acaba. Dividir o total velho pela base nova (o golpe já tirou a carta da frente) inventava um J ou um Q que não
// estava na mesa (B1).
//
// A grade usa `minmax(0, var(--card-w))` por coluna: com `limit` cartas a fileira cabe em qualquer largura de
// celular sem rolar de lado, e as cartas só encolhem se faltar espaço. Nada aqui corta com `overflow: hidden`,
// para o anel de foco (6 px) de uma carta focável passar por cima das vizinhas.
//
// Na sua fileira (`droppable`), o arrasto do Equipar (fatia 5) solta a carta na fileira inteira (um lugar vago) ou na última carta
// dela (a troca): `data-soltar`, com as chaves de `model/drag.ts`. A zona de dentro só vale quando o motor deixa trocar; sem isso o
// gesto sobe até a fileira. Na do oponente (`targets`), cada carta é uma zona `carta:<id>`: o A solta ali para roubá-la (E3).
import {
  attackBase,
  attackPower,
  defenseBase,
  defensePower,
  quadValues,
  type NumCard,
  type PublicPlayer,
} from '@coringa/engine';
import { useState } from 'react';
import { cardDropKey, ROW_DROP } from '../../model/drag.ts';
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
  limit: number;
  /** Para onde a fileira de Ataque aponta quando acende (o Coringa do outro). */
  aim?: 'up' | 'down';
  /** A fileira é sua: o arrasto do Equipar pode soltar a carta nela. */
  droppable?: boolean;
  /** A fileira é do oponente: cada carta é alvo de arrasto (o Roubo). */
  targets?: boolean;
}

const CAPTION = { ATK: 'Ataque', DEF: 'Defesa' } as const;

interface Conta {
  base: number;
  multiplier: number;
}

/** A conta do mesmo quadro do total mostrado: a de antes enquanto o total espera ou conta, a de agora com a mesa parada. */
function useShownConta(base: number, total: number): Conta {
  const { count } = useAnim();
  const now: Conta = { base, multiplier: base > 0 ? total / base : 0 };
  const [before, setBefore] = useState(now);
  if (count === 'idle' && (before.base !== now.base || before.multiplier !== now.multiplier)) setBefore(now);
  return count === 'idle' ? now : before;
}

export function Row({ label, kind, side, limit, aim, droppable = false, targets = false }: RowProps) {
  const anim = useAnim();
  const cards: NumCard[] = kind === 'ATK' ? side.attackRow : side.defenseRow;
  const total = kind === 'ATK' ? attackPower(side) : defensePower(side);
  const base = kind === 'ATK' ? attackBase(side) : defenseBase(side);
  const quads = quadValues(cards);
  const vacancies = Math.max(0, limit - cards.length);
  // O total mostrado espera a batida do dano e conta até o valor do motor.
  const shownTotal = useCountedNumber(total);
  const conta = useShownConta(base, total);
  const lit = anim.fx.rows.has(rowKey(side.id, kind));

  return (
    <div
      role="group"
      aria-label={label}
      data-fileira={rowKey(side.id, kind)}
      data-aceso={lit ? 'true' : undefined}
      data-soltar={droppable ? ROW_DROP[kind].row : undefined}
      className="relative flex items-center gap-2 [--soltar-folga:-2px]"
    >
      {lit ? <LitRow aim={kind === 'ATK' ? aim : undefined} ms={anim.beatMs} /> : null}
      <ul
        role="list"
        className="grid min-w-0 flex-1 list-none gap-1 p-0 pl-[10px] pc:gap-1.5 pc:pl-[14px]"
        style={{ gridTemplateColumns: `repeat(${limit}, minmax(0, var(--card-w)))` }}
      >
        {cards.map((card, index) => (
          <li
            key={card.id}
            data-soltar={
              droppable && index === cards.length - 1 ? ROW_DROP[kind].last : targets ? cardDropKey(card.id) : undefined
            }
            className="relative min-w-0 [--soltar-folga:-4px]"
          >
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
        {conta.base > 0 ? (
          <span data-conta className="font-texto text-[11px] font-semibold tabular-nums pc:text-[13px]">
            {conta.base} × {conta.multiplier}
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
