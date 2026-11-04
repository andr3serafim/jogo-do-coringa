// A metade da mesa de um jogador, na capa colorida dele (spec §3.1 e §10.1): a Guarda e os buffs, as marcas de estado e as
// duas fileiras; no do oponente, a mão dele (o verso das cartas), a presença e o Equipar. O Coringa, o apelido e a vida moram no
// placar do topo (sub-projeto 6 §3). Em cima o oponente (verde), embaixo você (rosa); os dois se distinguem por posição e por
// rótulo, nunca só pela cor. O arranjo (celular em coluna, PC em colunas) é de CSS: a árvore é uma só.
import { absoluteAttackArmed, defenseHealActive, type PlayerView, type PublicPlayer, type SpecialCard } from '@coringa/engine';
import { useId, type ReactNode } from 'react';
import { cardDropKey, DROP, type DropKey } from '../../model/drag.ts';
import { rowKey } from '../../model/effects.ts';
import { useAnim } from '../anim/context.ts';
import { CardBack } from '../cards/Card.tsx';
import { useTableUi } from './context.ts';
import {
  AbsoluteAttackIcon,
  AbsoluteDefenseIcon,
  AttackBuffIcon,
  DefenseBuffIcon,
  GuardIcon,
  HealIcon,
  ReflectIcon,
} from './icons.tsx';
import { plateLine } from '../../model/copy.ts';
import { handCountText } from './labels.ts';
import { ResurrectIcon } from './ResurrectIcon.tsx';
import { Row } from './Row.tsx';
import { TableCard } from './TableCard.tsx';
import { MirrorMark } from './MirrorMark.tsx';
import { StatePlate } from './StatePlate.tsx';

export interface PlayerFieldProps {
  side: 'self' | 'opponent';
  view: PlayerView;
  player: PublicPlayer;
  /** Apelido (os nomes dos grupos e das listas do campo; o apelido visível mora no placar). */
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
  const { hintZone, desolated: desolatedRows } = useTableUi();
  const anim = useAnim();
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
  // O campo com uma fileira desolada perde a cor (sub-projeto 6 §7.4).
  const apagado = (['ATK', 'DEF'] as const).some((kind) => {
    const key = rowKey(player.id, kind);
    return anim.desolated(key, desolatedRows.has(key));
  });
  // No seu campo não sobra nada do Coringa: a mão é a de baixo e a vida mora no placar.
  const info = self ? null : <Info player={player} name={name} away={away} equip={equip} tool={tool} />;
  const zones = <Zones player={player} name={name} view={view} self={self} />;

  return (
    <section
      aria-label={self ? 'Seu campo' : `Campo de ${name}`}
      data-campo={player.id}
      data-apagado={apagado ? '' : undefined}
      className={`campo relative isolate px-3 py-2.5 pc:min-h-[286px] pc:px-6 pc:py-5 pc-baixo:min-h-0 pc-baixo:py-2.5 ${self ? 'bg-capa-voce' : 'pc:flex pc:flex-col pc:justify-end bg-capa-oponente'}`}
    >
      <span aria-hidden="true" data-grao className="grao pointer-events-none absolute inset-0 -z-10 opacity-45 mix-blend-multiply" />
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
// O oponente: a mão (o verso das cartas), a presença, o Equipar e os botões do celular

interface InfoProps {
  player: PublicPlayer;
  name: string;
  away: boolean;
  equip: string | undefined;
  tool: ReactNode;
}

function Info({ player, name, away, equip, tool }: InfoProps) {
  const anim = useAnim();
  const dealtBacks = anim.backs(player.id);
  const flyingBacks = anim.backsAt(player.id);
  /** O atraso do verso `index` (os que chegam são os últimos da mão), em leque; `null` para os que já estavam. */
  const backAt = (deal: { count: number; delay: number; stagger: number } | null, index: number): number | null => {
    // A compra pode contar mais cartas que os versos novos (as numéricas vão para o painel dele): o leque conta dos versos que há.
    const first = Math.max(0, player.handCount - (deal?.count ?? 0));
    // Arredondado ao milissegundo: a soma em segundos deixa resto de ponto flutuante (0,7799… em vez de 0,78).
    return deal === null || index < first ? null : Math.round((deal.delay + (index - first) * deal.stagger) * 1000) / 1000;
  };
  return (
    <div className="campo-info">
      <div className="area-mao flex items-center gap-1.5">
        <span aria-hidden="true" className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">
          Mão
        </span>
        <span role="img" aria-label={handCountText(name, player.handCount)} className="flex items-center gap-[3px]">
          {Array.from({ length: player.handCount }, (_, index) => (
            // As cartas que o `CardsDealt` traz (as últimas da mão) esmaecem na batida dela, em leque, e voam do monte (fatia 5).
            <CardBack key={index} enter={backAt(dealtBacks, index)} fly={backAt(flyingBacks, index)} />
          ))}
        </span>
      </div>
      {away || equip ? (
        <div className="area-nome min-w-0">
          {away ? <p className="text-xs font-bold">fora da sala</p> : null}
          {equip ? <p className="text-xs font-bold">{equip}</p> : null}
        </div>
      ) : null}
      {tool ? <div className="area-ferr">{tool}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Guarda, buffs, Reflect e as marcas de estado

function Zones({ player, name, view, self }: { player: PublicPlayer; name: string; view: PlayerView; self: boolean }) {
  // Cada marca é uma placa com medalhão (bloco A dos pontos do playtest, ponto 6): a figura (decisoes.md 2026-11-01 (1)), o nome e a
  // linha do que ela faz, do lado de quem a vê.
  const plates: ReactNode[] = [];
  const icon = 'size-4 pc:size-[18px]';
  if (player.absoluteDefense) {
    plates.push(<StatePlate key="def" kind="defesa" does={plateLine('defesa', self, view)} icon={<AbsoluteDefenseIcon className={icon} />} />);
  }
  // Enquanto houver 2 K ou mais na Guarda (a regra é do motor): as numéricas da Defesa que caem curam o dono.
  if (defenseHealActive(player, view.config)) {
    plates.push(<StatePlate key="cura" kind="cura" does={plateLine('cura', self, view)} icon={<HealIcon className={icon} />} />);
  }
  if (player.resurrectionCount > 0) {
    plates.push(
      <StatePlate key="res" kind="res" does={plateLine('res', self, view)} count={player.resurrectionCount} icon={<ResurrectIcon className={icon} />} />,
    );
  }
  if (absoluteAttackArmed(player, view.config)) {
    plates.push(<StatePlate key="atk" kind="ataque" does={plateLine('ataque', self, view)} icon={<AbsoluteAttackIcon className={icon} />} />);
  }

  return (
    <div className="campo-zonas">
      {/* No seu campo, a zona inteira recebe a carta da mão (J, Q, K); no do oponente, cada carta é um alvo possível (A, Selvagem, Sacrifício). */}
      <Zone label="Guarda" icon={<GuardIcon className={ZONE_ICON} />} cards={player.guard} count drop={self ? DROP.guard : 'targets'} />
      <Zone
        label="Bônus de ataque"
        icon={<AttackBuffIcon className={ZONE_ICON} />}
        cards={player.attackBuffs}
        wildAs="J"
        drop={self ? DROP.attackBuffs : 'targets'}
      />
      <Zone
        label="Bônus de defesa"
        icon={<DefenseBuffIcon className={ZONE_ICON} />}
        cards={player.defenseBuffs}
        wildAs="Q"
        drop={self ? DROP.defenseBuffs : 'targets'}
      />
      {player.reflect ? (
        <Zone
          label="Reflect ativo"
          does={plateLine('reflect', self, view)}
          icon={<ReflectIcon className={ZONE_ICON} />}
          listLabel="Cartas do Reflect"
          mark={<MirrorMark owner={player.id} />}
          cards={[player.reflect.k, player.reflect.j, player.reflect.q]}
          wildAs={{ 1: 'J', 2: 'Q' }}
        />
      ) : null}
      {plates.length > 0 ? (
        <ul role="list" aria-label={`Estado do Coringa de ${name}`} className="campo-estado">
          {plates}
        </ul>
      ) : null}
    </div>
  );
}

/** O tamanho da figura no título de uma zona. */
const ZONE_ICON = 'size-3.5 pc:size-4';

interface ZoneProps {
  label: string;
  /** A figura antes do rótulo (decisoes.md 2026-11-01 (1)). */
  icon: ReactNode;
  /** Nome da lista, quando difere do rótulo visível. */
  listLabel?: string;
  cards: SpecialCard[];
  /** Papel que o Selvagem assume nesta zona: um só, ou um por posição (o Reflect tem K, J e Q). */
  wildAs?: 'J' | 'Q' | Record<number, 'J' | 'Q'>;
  /** Mostra a contagem ao lado do rótulo. */
  count?: boolean;
  /** O que fica no canto da zona, sem mudar a altura dela (o espelho do Reflect). */
  mark?: ReactNode;
  /** O que a zona faz, numa linha embaixo do título (o Reflect; bloco A dos pontos do playtest, ponto 6). Some abaixo de 600 px. */
  does?: string;
  /** O arrasto: a chave da zona inteira (a sua), `'targets'` (cada carta é uma zona `carta:<id>`, a do oponente) ou nada (o Reflect). */
  drop?: DropKey | 'targets';
}

function Zone({ label, icon, listLabel, cards, wildAs, count = false, mark, drop, does }: ZoneProps) {
  const labelId = useId();
  // Só uma Guarda grande (muitos K) precisa de cartas sobrepostas para caber na linha.
  const overlap = cards.length > 4;
  const roleAt = (index: number) => (typeof wildAs === 'object' ? wildAs[index] : wildAs);
  return (
    <div
      className={`campo-zona [--soltar-folga:-4px] ${mark ? 'relative' : ''}`}
      data-soltar={drop !== undefined && drop !== 'targets' ? drop : undefined}
    >
      {mark}
      {/* A linha do que a zona faz (o Reflect) fica embaixo do título, na largura dele: ao lado, no PC, ela se espremia entre o título e
          as cartas, uma ou duas palavras por linha. */}
      <div className="zona-titulo flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          {icon}
          <span id={labelId} className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">
            {label}
          </span>
          {count && cards.length > 0 ? (
            <span data-numero className="font-texto text-[11px] font-bold tabular-nums">
              {cards.length}
            </span>
          ) : null}
        </div>
        {does ? (
          <p data-placa-faz className="placa-faz font-texto text-[10px] leading-tight pc:text-[11px]">
            {does}
          </p>
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
