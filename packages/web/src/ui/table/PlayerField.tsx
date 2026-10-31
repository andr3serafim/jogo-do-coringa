// A metade da mesa de um jogador, na capa colorida dele (spec §3.1 e §10.1): o Coringa com vida, a Guarda e os
// buffs, as marcas de estado e as duas fileiras. Em cima o oponente (verde), embaixo você (rosa); os dois se
// distinguem por posição e por rótulo, nunca só pela cor. O arranjo (celular em coluna, PC em três colunas)
// é de CSS: a árvore é uma só.
import { absoluteAttackArmed, type PlayerView, type PublicPlayer, type SpecialCard } from '@coringa/engine';
import { useId, type ReactNode } from 'react';
import { cardDropKey, DROP, type DropKey } from '../../model/drag.ts';
import { zoneKey, type MarkZone } from '../../model/marks.ts';
import { useAnim } from '../anim/context.ts';
import { DamageNumber, ShieldBreak } from '../anim/Effects.tsx';
import { useCountedNumber } from '../anim/useCountedNumber.ts';
import { CardBack } from '../cards/Card.tsx';
import { Coringa } from '../cards/Coringa.tsx';
import { useTableUi } from './context.ts';
import { handCountText, resurrectionsText } from './labels.ts';
import { NovoChip } from './NovoChip.tsx';
import { Row } from './Row.tsx';
import { TableCard } from './TableCard.tsx';

export interface PlayerFieldProps {
  side: 'self' | 'opponent';
  view: PlayerView;
  player: PublicPlayer;
  /** Apelido; no seu campo, o rótulo "(você)" vem junto. */
  name: string;
  /** Oponente fora da sala (só no campo dele). */
  away?: boolean;
  /** O que ele faz no Equipar: "montando 3 cartas…" ou "pronto" (só no campo dele, só na rodada de Equipar). */
  equip?: string;
  /** Controles do cabeçalho do oponente no celular (o botão do histórico). */
  tool?: ReactNode;
}

export function PlayerField({ side, view, player, name, away = false, equip, tool }: PlayerFieldProps) {
  const self = side === 'self';
  const { hintZone } = useTableUi();
  const zone: MarkZone = self ? 'selfHp' : 'opponentHp';
  const rowLabel = (kind: 'ataque' | 'defesa') => (self ? `Sua fileira de ${kind}` : `Fileira de ${kind} de ${name}`);
  const limit = view.config.rowLimit;
  const attack = (
    <Row
      label={rowLabel('ataque')}
      kind="ATK"
      side={player}
      limit={limit}
      aim={self ? 'up' : 'down'}
      droppable={self}
      targets={!self}
    />
  );
  const defense = <Row label={rowLabel('defesa')} kind="DEF" side={player} limit={limit} droppable={self} targets={!self} />;
  const info = <Info side={side} view={view} player={player} name={name} away={away} equip={equip} zone={zone} tool={tool} />;
  const zones = <Zones player={player} name={name} view={view} self={self} />;

  return (
    <section
      aria-label={self ? 'Seu campo' : `Campo de ${name}`}
      className={`campo relative isolate px-3 py-2.5 pc:min-h-[286px] pc:px-6 pc:py-5 pc-baixo:min-h-0 pc-baixo:py-2.5 ${self ? 'bg-capa-voce' : 'pc:flex pc:flex-col pc:justify-end bg-capa-oponente'}`}
    >
      <span aria-hidden="true" data-grao className="grao pointer-events-none absolute inset-0 -z-10 opacity-20" />
      <div className={`campo-grade ${self ? 'campo-grade--voce' : 'campo-grade--oponente'}`}>
        {self ? (
          <>
            {/* As fileiras da dica do tutorial (as do oponente não: a dica fala das suas). */}
            <div className="campo-filas" data-dica={hintZone === 'rows' ? 'rows' : undefined}>
              {attack}
              {defense}
            </div>
            {zones}
            {info}
          </>
        ) : (
          <>
            {info}
            {zones}
            <div className="campo-filas">
              {defense}
              {attack}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Coringa: avatar, apelido, vida e mão

interface InfoProps {
  side: 'self' | 'opponent';
  view: PlayerView;
  player: PublicPlayer;
  name: string;
  away: boolean;
  equip: string | undefined;
  zone: MarkZone;
  tool: ReactNode;
}

function Info({ side, view, player, name, away, equip, zone, tool }: InfoProps) {
  const self = side === 'self';
  const { zones, onSeen } = useTableUi();
  const marked = zones.has(zone);
  const seen = onSeen && marked ? () => onSeen(zoneKey(zone)) : undefined;
  const max = view.config.hp;
  const anim = useAnim();
  // A vida mostrada espera a batida do dano e conta até o valor da `view`, que é a verdade (aria-valuenow).
  const shownHp = useCountedNumber(player.hp);
  const damage = anim.fx.damage?.target === player.id ? anim.fx.damage : null;
  const dealtBacks = anim.backs(player.id);
  const percent = Math.max(0, Math.min(100, (shownHp / max) * 100));
  const hpName = `Vida de ${name}`;

  return (
    <div className={`campo-info ${self ? 'campo-info--voce' : 'campo-info--oponente'}`}>
      <span className="area-avatar relative size-10 shrink-0 pc:size-16 pc-baixo:size-12">
        <Coringa className="size-full" />
        {anim.fx.shieldBreak === player.id ? <ShieldBreak ms={anim.beatMs} reduced={anim.reduced} /> : null}
      </span>
      <div className="area-nome min-w-0">
        <h2 className="truncate text-[17px] font-bold leading-tight pc:text-2xl">
          {name}
          {self && name !== 'Você' ? <span className="text-sm font-normal pc:text-lg"> (você)</span> : null}
        </h2>
        {away ? <p className="text-xs font-bold">fora da sala</p> : null}
        {equip ? <p className="text-xs font-bold">{equip}</p> : null}
      </div>
      {self ? null : (
        <div className="area-mao flex items-center gap-1.5">
          <span aria-hidden="true" className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">
            Mão
          </span>
          <span role="img" aria-label={handCountText(name, player.handCount)} className="flex items-center gap-[3px]">
            {Array.from({ length: player.handCount }, (_, index) => (
              // As cartas que o `CardsDealt` traz (as últimas da mão) esmaecem na batida dela.
              <CardBack key={index} enter={dealtBacks !== null && index >= player.handCount - dealtBacks.count ? dealtBacks.delay : null} />
            ))}
          </span>
        </div>
      )}
      <span className="area-vida relative flex items-baseline gap-0.5" onPointerEnter={seen} onPointerDown={seen}>
        <span data-hp className="font-texto text-[34px] font-extrabold leading-none tabular-nums pc:text-[56px] pc-baixo:text-[44px]">
          {shownHp}
        </span>
        <span aria-hidden="true" className="font-texto text-[13px] font-semibold tabular-nums pc:text-lg">
          /{max}
        </span>
        {damage ? <DamageNumber amount={damage.amount} ms={anim.beatMs} reduced={anim.reduced} /> : null}
        {marked ? (
          <span className="absolute -bottom-3 left-0">
            <NovoChip />
          </span>
        ) : null}
      </span>
      <div
        role="meter"
        aria-label={marked ? `${hpName}, novo` : hpName}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={player.hp}
        aria-valuetext={`${player.hp} de ${max}`}
        onPointerEnter={seen}
        onPointerDown={seen}
        className="area-barra box-border h-3 min-w-0 rounded-[2px] border-[2.5px] border-tinta bg-[repeating-linear-gradient(135deg,var(--color-tinta)_0_1.5px,transparent_1.5px_5px)] pc:h-3.5 pc:border-[3px]"
      >
        <div className="h-full bg-tinta" style={{ width: `${percent}%` }} />
      </div>
      {tool ? <div className="area-ferr">{tool}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Guarda, buffs, Reflect e as marcas de estado

function Zones({ player, name, view, self }: { player: PublicPlayer; name: string; view: PlayerView; self: boolean }) {
  const chips: Array<{ key: string; text: string; strong: boolean }> = [];
  if (player.absoluteDefense) chips.push({ key: 'def', text: 'Defesa Absoluta', strong: true });
  if (player.resurrectionCount > 0) {
    chips.push({ key: 'res', text: resurrectionsText(player.resurrectionCount), strong: false });
  }
  if (absoluteAttackArmed(player, view.config)) {
    chips.push({ key: 'atk', text: 'Ataque Absoluto armado', strong: true });
  }

  return (
    <div className="campo-zonas">
      {/* No seu campo, a zona inteira recebe a carta da mão (J, Q, K); no do oponente, cada carta é um alvo possível (A, Selvagem, Sacrifício). */}
      <Zone label="Guarda" cards={player.guard} count drop={self ? DROP.guard : 'targets'} />
      <Zone label="Buffs de ataque" cards={player.attackBuffs} wildAs="J" drop={self ? DROP.attackBuffs : 'targets'} />
      <Zone label="Buffs de defesa" cards={player.defenseBuffs} wildAs="Q" drop={self ? DROP.defenseBuffs : 'targets'} />
      {player.reflect ? (
        <Zone
          label="Reflect ativo"
          listLabel="Cartas do Reflect"
          cards={[player.reflect.k, player.reflect.j, player.reflect.q]}
          wildAs={{ 1: 'J', 2: 'Q' }}
        />
      ) : null}
      {chips.length > 0 ? (
        <ul role="list" aria-label={`Estado do Coringa de ${name}`} className="campo-estado">
          {chips.map((chip) => (
            <li
              key={chip.key}
              className={`border-2 border-tinta px-1.5 py-0.5 text-[11px] font-bold uppercase leading-tight pc:text-xs ${chip.strong ? 'bg-ouro' : 'bg-papel'}`}
            >
              {chip.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface ZoneProps {
  label: string;
  /** Nome da lista, quando difere do rótulo visível. */
  listLabel?: string;
  cards: SpecialCard[];
  /** Papel que o Selvagem assume nesta zona: um só, ou um por posição (o Reflect tem K, J e Q). */
  wildAs?: 'J' | 'Q' | Record<number, 'J' | 'Q'>;
  /** Mostra a contagem ao lado do rótulo. */
  count?: boolean;
  /** O arrasto: a chave da zona inteira (a sua), `'targets'` (cada carta é uma zona `carta:<id>`, a do oponente) ou nada (o Reflect). */
  drop?: DropKey | 'targets';
}

function Zone({ label, listLabel, cards, wildAs, count = false, drop }: ZoneProps) {
  const labelId = useId();
  // Só uma Guarda grande (muitos K) precisa de cartas sobrepostas para caber na linha.
  const overlap = cards.length > 4;
  const roleAt = (index: number) => (typeof wildAs === 'object' ? wildAs[index] : wildAs);
  return (
    <div
      className="campo-zona [--soltar-folga:-4px]"
      data-soltar={drop !== undefined && drop !== 'targets' ? drop : undefined}
    >
      <div className="zona-titulo flex items-baseline gap-1">
        <span id={labelId} className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">
          {label}
        </span>
        {count && cards.length > 0 ? (
          <span data-numero className="font-texto text-[11px] font-bold tabular-nums">
            {cards.length}
          </span>
        ) : null}
      </div>
      <ul
        role="list"
        aria-label={listLabel}
        aria-labelledby={listLabel ? undefined : labelId}
        className="flex min-h-(--mini-h) list-none items-center p-0"
      >
        {cards.map((card, index) => (
          <li
            key={card.id}
            data-soltar={drop === 'targets' ? cardDropKey(card.id) : undefined}
            className="relative flex-none [--soltar-folga:-4px]"
            style={index > 0 ? { marginLeft: overlap ? 'calc(var(--mini-w) * -0.34)' : '3px' } : undefined}
          >
            <TableCard card={card} size="mini" as={card.kind === 'WILD' ? roleAt(index) : undefined} />
          </li>
        ))}
        {cards.length === 0 ? (
          <li
            aria-hidden="true"
            data-vaga
            className="h-(--mini-h) w-(--mini-w) rounded-[3px] border-[1.5px] border-dashed border-tinta/40"
          />
        ) : null}
      </ul>
    </div>
  );
}
