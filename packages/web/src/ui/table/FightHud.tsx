// O placar de luta no topo da mesa (sub-projeto 6 §3): você à esquerda, o oponente à direita, como num jogo de luta; os campos
// seguem com você embaixo. Cada lado tem o retrato (o Coringa na cor da capa do jogador; o de quem tem a iniciativa fica com a
// moldura de ouro), o apelido, a barra de vida espelhada (encolhe na direção do retrato) e o número. No meio, a placa: a rodada,
// o relógio (o número grande; sem prazo, a rodada fica grande no lugar dele), a fase curta e, no Ataque, o placar de dano que
// decide a iniciativa. Os números de jogo usam a fonte de texto com algarismos tabulares (spec da web §10.7). O relógio segue o de
// antes (spec da web §3.8): urgência por cor e forma, sem piscar; na reação, maior; a pista `urgencia` toca uma vez por prazo seu.
import type { PlayerView, PublicPlayer } from '@coringa/engine';
import type { Deadline } from '@coringa/protocol';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ClockFace } from '../../model/clock.ts';
import { CLOCK_LABEL, CLOCK_URGENT_LABEL } from '../../model/copy.ts';
import { zoneKey, type MarkZone } from '../../model/marks.ts';
import { useAnim } from '../anim/context.ts';
import { DamageNumber, ShieldBreak } from '../anim/Effects.tsx';
import { useCountedNumber } from '../anim/useCountedNumber.ts';
import { Coringa } from '../cards/Coringa.tsx';
import { useSound } from '../sound-context.ts';
import { useTableUi } from './context.ts';
import { initiativeScore, initiativeScoreText, initiativeText, phaseShortText, type TableNames } from './labels.ts';
import { NovoChip } from './NovoChip.tsx';
import { deadlineKey } from './useClock.ts';

export interface FightHudProps {
  view: PlayerView;
  names: TableNames;
  /** A face do relógio (`useClock`); sem prazo, `null`. */
  face: ClockFace | null;
  /** O prazo da face: identifica o prazo para a pista de urgência tocar uma vez só. */
  deadline: Deadline | null;
  /** O que mora sobre o placar (a espada da iniciativa). */
  children?: ReactNode;
}

export function FightHud({ view, names, face, deadline, children }: FightHudProps) {
  // A urgência soa uma vez por prazo (o `deadlineKey` identifica o prazo), e só no prazo do jogador.
  const sound = useSound();
  const urgentKey = face?.urgent && face.mine ? deadlineKey(deadline) : null;
  const cuedKey = useRef<string | null>(null);
  useEffect(() => {
    if (urgentKey === null || urgentKey === cuedKey.current) return;
    cuedKey.current = urgentKey;
    sound.play('urgencia');
  }, [urgentKey, sound]);

  const mine = view.initiative === view.me;
  const score = initiativeScore(view);
  return (
    <section aria-label="Placar" className="placar relative flex-none bg-tinta text-papel">
      <Side side="voce" view={view} player={view.self} name={names.self} holder={mine} />
      <div data-placa className="placar-placa flex flex-col items-center text-center">
        {/* Letra lisa, como no protótipo: a textura de madeira borra o rótulo nesse tamanho. O número grande é tipo de madeira. */}
        <h2 className="text-[9px] font-bold uppercase leading-[1.15] tracking-[0.16em] text-papel/70 pc:text-xs">
          Rodada{' '}
          {face ? (
            view.round
          ) : (
            <span data-rodada-grande className="block font-madeira text-[26px] leading-none tracking-normal text-papel pc:text-[34px]">
              {view.round}
            </span>
          )}
        </h2>
        {face ? <ClockBlock face={face} /> : null}
        <p data-fase-curta className="text-[9px] font-bold uppercase leading-[1.15] tracking-[0.12em] text-ouro pc:text-xs">
          {phaseShortText(view)}
        </p>
        {score ? (
          <p
            aria-hidden="true"
            data-numero
            data-placar-iniciativa
            className="font-texto text-[10px] font-semibold leading-[1.1] tabular-nums text-papel/85 pc:text-[11px]"
          >
            {score[0]} × {score[1]}
          </p>
        ) : null}
        {/* Para o leitor de tela, quem tem a iniciativa e por quê (na tela, a espada e a moldura de ouro dizem de quem é). */}
        <p className="sr-only">Iniciativa: {initiativeText(view, names)}</p>
        <p className="sr-only">{initiativeScoreText(view, names)}</p>
      </div>
      <Side side="oponente" view={view} player={view.opponent} name={names.opponent} holder={!mine} />
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Um lado: retrato, apelido, barra e número

interface SideProps {
  side: 'voce' | 'oponente';
  view: PlayerView;
  player: PublicPlayer;
  name: string;
  /** Quem tem a iniciativa: o retrato ganha a moldura de ouro (`data-dono`). */
  holder: boolean;
}

function Side({ side, view, player, name, holder }: SideProps) {
  const self = side === 'voce';
  const zone: MarkZone = self ? 'selfHp' : 'opponentHp';
  const { zones, onSeen } = useTableUi();
  const marked = zones.has(zone);
  const seen = onSeen && marked ? () => onSeen(zoneKey(zone)) : undefined;
  const max = view.config.hp;
  const anim = useAnim();
  // A vida mostrada espera a batida do dano e conta até o valor da `view`, que é a verdade (aria-valuenow).
  const shownHp = useCountedNumber(player.hp);
  const damage = anim.fx.damage?.target === player.id ? anim.fx.damage : null;
  const hpName = `Vida de ${name}`;

  return (
    <div data-lado={side} className={`placar-lado placar-lado--${side}`}>
      <span
        data-retrato={side}
        data-dono={holder ? '' : undefined}
        className={`placar-retrato ${self ? 'bg-capa-voce' : 'bg-capa-oponente'}`}
      >
        <Coringa className="size-[82%]" />
        {anim.fx.shieldBreak === player.id ? <ShieldBreak ms={anim.beatMs} reduced={anim.reduced} /> : null}
        {damage ? <DamageNumber amount={damage.amount} heal={damage.heal === true} ms={anim.beatMs} reduced={anim.reduced} /> : null}
      </span>
      <div className="placar-info">
        <h2 className="w-full truncate font-madeira text-xs leading-tight uppercase tracking-[0.02em] pc:text-[17px]">
          {name}
          {self && name !== 'Você' ? <span className="font-texto text-[10px] font-normal normal-case pc:text-sm"> (você)</span> : null}
        </h2>
        <HpBar
          label={marked ? `${hpName}, novo` : hpName}
          hp={player.hp}
          shown={shownHp}
          max={max}
          reduced={anim.reduced}
          onSeen={seen}
        />
        <p className="flex items-baseline gap-1 leading-none" onPointerEnter={seen} onPointerDown={seen}>
          <span data-hp className="font-texto text-[13px] font-extrabold tabular-nums pc:text-lg">
            {shownHp}
          </span>
          <span aria-hidden="true" className="font-texto text-[10px] font-semibold tabular-nums text-papel/65 pc:text-[13px]">
            /{max}
          </span>
          {marked ? <NovoChip /> : null}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// A barra de vida

/** Quanto o rastro vermelho fica na vida de antes, depois que ela começa a cair, antes de escorrer (em 600 ms, no CSS). */
export const TRAIL_HOLD_MS = 450;

const percentOf = (hp: number, max: number): number => Math.max(0, Math.min(100, (hp / max) * 100));

/**
 * A barra espelhada (o lado vem do `.placar-lado`): o ouro encolhe na direção do retrato; a vida perdida fica hachurada. No golpe,
 * o ouro cai com o número (`shown`) e o rastro vermelho fica na vida de antes, escorrendo até a nova (`hp`) depois de
 * `TRAIL_HOLD_MS`. Na cura o rastro só acompanha, por baixo do ouro. Com movimento reduzido, sem rastro.
 */
function HpBar({
  label,
  hp,
  shown,
  max,
  reduced,
  onSeen,
}: {
  label: string;
  /** A vida da `view` (a verdade, para o leitor de tela). */
  hp: number;
  /** A vida que a tela mostra agora (`useCountedNumber`). */
  shown: number;
  max: number;
  reduced: boolean;
  onSeen: (() => void) | undefined;
}) {
  const trail = useHpTrail(shown, hp, reduced);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={hp}
      aria-valuetext={`${hp} de ${max}`}
      onPointerEnter={onSeen}
      onPointerDown={onSeen}
      className="placar-barra"
    >
      {reduced ? null : <div data-rastro style={{ width: `${percentOf(trail, max)}%` }} />}
      <div data-vida style={{ width: `${percentOf(shown, max)}%` }} />
    </div>
  );
}

/**
 * A vida que o rastro marca. Parado ou na cura, a mesma da tela. Quando a da tela cai abaixo dele, o rastro espera
 * `TRAIL_HOLD_MS` contados do começo da queda (não de cada passo da contagem) e vai direto para a vida nova.
 */
function useHpTrail(shown: number, hp: number, reduced: boolean): number {
  const [trail, setTrail] = useState(shown);
  // Sem queda em curso (a vida da `view` não está abaixo da mostrada): o rastro acompanha a tela.
  const follow = reduced ? trail !== shown : hp >= shown && shown > trail;
  if (follow) setTrail(shown);
  const dropping = !reduced && shown < trail;
  // O alvo do rastro é a vida da `view` no momento em que ele parte (um segundo golpe durante a espera também conta).
  const target = useRef(hp);
  useEffect(() => {
    target.current = hp;
  }, [hp]);
  useEffect(() => {
    if (!dropping) return;
    const id = setTimeout(() => setTrail(target.current), TRAIL_HOLD_MS);
    return () => clearTimeout(id);
  }, [dropping]);
  return follow ? shown : trail;
}

// ---------------------------------------------------------------------------------------------
// O relógio

const DISC_SMALL = 'size-7 text-sm pc:size-[46px] pc:text-[22px]';
/** Na janela de reação o prazo é de 8 s e a decisão é urgente: o relógio cresce. */
const DISC_BIG = 'size-8 text-base pc:size-[52px] pc:text-[26px]';

/**
 * O número do relógio. Urgência por cor e por forma (disco vermelho, número em papel, anel mais grosso) e sem animação nenhuma.
 * "Tempo esgotado" e o turno pausado moram na faixa do meio, junto da fase por extenso (não cabem na placa do celular).
 */
function ClockBlock({ face }: { face: ClockFace }) {
  const big = face.kind === 'REACTION';
  const look = face.expired
    ? 'border-[3px] border-papel/60 pc:border-4'
    : face.urgent
      ? 'border-[5px] border-ouro bg-vermelho text-papel pc:border-[7px]'
      : 'border-[3px] border-ouro pc:border-4';
  return (
    <div
      role="timer"
      aria-label={face.urgent ? CLOCK_URGENT_LABEL : CLOCK_LABEL}
      data-urgente={face.urgent ? 'true' : undefined}
      data-relogio={big ? 'grande' : 'pequeno'}
      className={`my-px grid flex-none place-items-center rounded-full font-texto font-extrabold leading-none tabular-nums ${big ? DISC_BIG : DISC_SMALL} ${look}`}
    >
      {face.seconds}
    </div>
  );
}
