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
import { useEffect, useRef, useState } from 'react';
import { cardDropKey, ROW_DROP } from '../../model/drag.ts';
import { rowKey } from '../../model/effects.ts';
import { useAnim } from '../anim/context.ts';
import { LitRow } from '../anim/Effects.tsx';
import { useCountedNumber } from '../anim/useCountedNumber.ts';
import { AttackIcon, DefenseIcon } from './icons.tsx';
import { useTableUi } from './context.ts';
import { RowDesolation, useDesolationClosing } from './RowDesolation.tsx';
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
/** A figura antes do total (decisoes.md 2026-11-01 (1)): a palavra fica só para o leitor de tela. */
const FIGURE = { ATK: AttackIcon, DEF: DefenseIcon } as const;

interface Conta {
  base: number;
  multiplier: number;
}

/** Quanto o total cresce quando sobe no pouso de uma carta (decisoes.md 2026-11-02 (9), ponto 12). */
const RISE = { scale: '1.3', ms: 320 } as const;

/**
 * As cartas que ainda vão pousar (sub-projeto 6 §8): enquanto a carta cai ou voa até a fileira (ou até os bônus que a multiplicam), o total
 * não a conta, e ela entra na conta no pouso dela. A conta continua sendo a do motor, sobre o lado sem essas cartas. O pulo apaga os
 * pousos (`landAt`), e o total volta ao da `view` na hora.
 */
function useLandingHold(ids: readonly string[]): { pending: ReadonlySet<string>; landed: number } {
  const anim = useAnim();
  const key = ids.flatMap((id) => {
    const landing = anim.landAt(id);
    return landing === null ? [] : [`${id}@${landing.at}`];
  }).join(',');
  const [done, setDone] = useState<{ key: string; ids: ReadonlySet<string> }>({ key: '', ids: new Set() });
  useEffect(() => {
    if (key === '') return;
    // As cartas que pousam no mesmo instante (as do Equipar) entram juntas: um desenho da fileira por instante, e não um por carta.
    const byInstant = new Map<string, string[]>();
    for (const entry of key.split(',')) {
      const at = entry.lastIndexOf('@');
      const instant = entry.slice(at + 1);
      byInstant.set(instant, [...(byInstant.get(instant) ?? []), entry.slice(0, at)]);
    }
    const timers = [...byInstant].map(([instant, ids]) =>
      window.setTimeout(() => setDone((prev) => ({ key, ids: new Set([...(prev.key === key ? prev.ids : []), ...ids]) })), Number(instant) * 1000),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [key]);
  const landed = done.key === key ? done.ids : new Set<string>();
  const pending = new Set(key === '' ? [] : key.split(',').map((entry) => entry.slice(0, entry.lastIndexOf('@'))).filter((id) => !landed.has(id)));
  return { pending, landed: landed.size };
}

/** O total cresce e assenta, em ouro, quando sobe porque uma carta pousou (com movimento reduzido, só a cor). */
function useRise(total: number, landed: number, reduced: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(total);
  useEffect(() => {
    const before = last.current;
    last.current = total;
    const el = ref.current;
    if (el === null || landed === 0 || total <= before) return;
    const pop = reduced
      ? undefined
      : el.animate?.([{ scale: '1' }, { scale: RISE.scale, offset: 0.35 }, { scale: '1' }], { duration: RISE.ms, easing: 'ease-out' });
    el.setAttribute('data-subiu', '');
    const timer = window.setTimeout(() => el.removeAttribute('data-subiu'), RISE.ms);
    return () => {
      pop?.cancel();
      window.clearTimeout(timer);
      el.removeAttribute('data-subiu');
    };
  }, [total, landed, reduced]);
  return ref;
}

/** A conta do mesmo quadro do total mostrado: a de antes enquanto o total espera ou conta, a de agora com a mesa parada. */
function useShownConta(base: number, total: number): Conta {
  const { count } = useAnim();
  const now: Conta = { base, multiplier: base > 0 ? total / base : 0 };
  const [before, setBefore] = useState(now);
  if (count === 'idle' && (before.base !== now.base || before.multiplier !== now.multiplier)) setBefore(now);
  return count === 'idle' ? now : before;
}

/** O lado sem as cartas `ids` (as que ainda vão pousar). */
function withoutCards(side: PublicPlayer, ids: ReadonlySet<string>): PublicPlayer {
  const keep = <T extends { id: string }>(cards: readonly T[]): T[] => cards.filter((card) => !ids.has(card.id));
  return { ...side, attackRow: keep(side.attackRow), defenseRow: keep(side.defenseRow), attackBuffs: keep(side.attackBuffs), defenseBuffs: keep(side.defenseBuffs) };
}

export function Row({ label, kind, side, limit, aim, droppable = false, targets = false }: RowProps) {
  const anim = useAnim();
  const cards: NumCard[] = kind === 'ATK' ? side.attackRow : side.defenseRow;
  const buffs = kind === 'ATK' ? side.attackBuffs : side.defenseBuffs;
  // O total não conta a carta que ainda vai pousar (na fileira ou nos bônus dela), e sobe no pouso.
  const hold = useLandingHold([...cards, ...buffs].map((card) => card.id));
  const counted = hold.pending.size === 0 ? side : withoutCards(side, hold.pending);
  const total = kind === 'ATK' ? attackPower(counted) : defensePower(counted);
  const base = kind === 'ATK' ? attackBase(counted) : defenseBase(counted);
  const quads = quadValues(kind === 'ATK' ? counted.attackRow : counted.defenseRow);
  const totalRef = useRise(total, hold.landed, anim.reduced);
  const vacancies = Math.max(0, limit - cards.length);
  // O total mostrado espera a batida do dano e conta até o valor do motor.
  const shownTotal = useCountedNumber(total);
  const conta = useShownConta(base, total);
  const key = rowKey(side.id, kind);
  const lit = anim.fx.rows.has(key);
  const Figure = FIGURE[kind];
  const { desolated: desolatedRows } = useTableUi();
  const desolated = anim.desolated(key, desolatedRows.has(key));
  const closing = useDesolationClosing(desolated, anim.reduced);

  return (
    <div
      role="group"
      aria-label={label}
      data-fileira={key}
      data-aceso={lit ? 'true' : undefined}
      data-desolada={desolated ? '' : undefined}
      data-soltar={droppable ? ROW_DROP[kind].row : undefined}
      className="relative flex items-center gap-2 [--soltar-folga:-2px]"
    >
      {lit ? <LitRow aim={kind === 'ATK' ? aim : undefined} ms={anim.beatMs} /> : null}
      <ul
        role="list"
        className="relative grid min-w-0 flex-1 list-none gap-1 p-0 pl-[10px] pc:gap-1.5 pc:pl-[14px]"
        style={{ gridTemplateColumns: `repeat(${limit}, minmax(0, var(--card-w)))` }}
      >
        {desolated || closing ? <RowDesolation closing={closing} /> : null}
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
      <div className="flex w-[58px] shrink-0 flex-col items-end text-right pc:w-24">
        <span className="flex items-center gap-0.5 pc:gap-1.5">
          <Figure className="size-3.5 pc:size-6" />
          <span className="sr-only">{CAPTION[kind]}</span>
          <span
            ref={totalRef}
            data-total
            className="font-texto text-[22px] font-extrabold leading-[1.1] tabular-nums data-subiu:text-ouro pc:text-3xl"
          >
            {shownTotal}
          </span>
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
