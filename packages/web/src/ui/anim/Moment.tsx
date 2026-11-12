// O momento da especial do oponente (bloco A dos pontos do playtest, ponto 1; spec `2026-11-03-playtest-design.md` §3.1, variante A): a
// carta sai da mão dele de costas, vira e cresce no centro da mesa, uma placa diz o que ela fez (com os números do motor) e ela voa ao
// destino ou ao alvo. Os instantes são da linha do tempo (`Beat.moment`); o véu leve é a cortina do `useBeatPlayer`.
//
// - A carta grande é uma cópia (`Card` com `ghost`): sem `data-card-id` e escondida do leitor de tela. O histórico guarda a linha da
//   jogada (decisoes.md 2026-11-03 (5), A4).
// - O voo mede o destino no começo dele, com a mesa já assentada: a carta de verdade (`[data-card-id]`, escondida até o `snap`), a cópia do
//   alvo (`[data-saindo-id]`, da `Leaving`) ou a numérica roubada, ainda na sua fileira.
// - A Armadilha, o Sacrifício e o Roubo: depois do impacto, a carta dele segue ao cemitério e some. As outras somem no impacto (a de
//   verdade aparece no lugar).
// - O som do impacto: o pouso (que bate `dropMs` depois de começar) ou a quebra. O pulo, a linha do tempo nova e a desmontagem o calam.
// - Com movimento reduzido: a carta e a placa aparecem e somem no centro, sem virada, voo nem véu.
// - Só `transform` e `opacity` animam (§11 da direção visual).
import type { GameEvent, PlayerView, SpecialCard } from '@coringa/engine';
import { SPECIAL_MOMENT_MS } from '@coringa/protocol';
import type { Names } from '@coringa/sim/text';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { momentPlate } from '../../model/copy.ts';
import type { Cue } from '../../model/sound.ts';
import { TABLE_MOTION } from '../../model/table-motion.ts';
import { MOMENT_MS, type Beat } from '../../model/timeline.ts';
import { Card } from '../cards/Card.tsx';
import { LookZone } from '../cards/LooksProvider.tsx';
import { useLook } from '../cards/looks-context.ts';
import { useSound } from '../sound-context.ts';
import type { Run } from './useBeatPlayer.ts';

/** A escala da carta grande sobre o tamanho da mão: no PC (a partir de 768 px de mesa) e no celular. */
const SCALE = { pc: 1.6, phone: 1.25 } as const;
const PC_MIN_PX = 768;
/** Os K jogados juntos abrem em leque, a esta distância um do outro (px) e com esta inclinação (graus). */
const FAN_PX = 18;
const FAN_DEG = 6;
/** De onde a carta sai: o tamanho dela na mão do oponente, sobre o da carta grande. */
const FROM_SCALE = 0.35;
/** O espaço entre a carta grande e a placa (px). */
const PLATE_GAP_PX = 10;

type Phase = 'flip' | 'plate' | 'fly' | 'exit';

/** As cartas que a especial tira da mão do oponente: elas é que aparecem grandes. */
function cardsOf(event: GameEvent): SpecialCard[] {
  switch (event.type) {
    case 'BuffPlayed':
    case 'TrapUsed':
    case 'Sacrificed':
      return [event.card];
    case 'GuardPlayed':
      return event.cards;
    case 'CardStolen':
      return [event.ace];
    default:
      return [];
  }
}

/** Para onde a carta grande voa (um seletor no palco), ou `null`. */
function destinationOf(event: GameEvent): string | null {
  switch (event.type) {
    case 'BuffPlayed':
      return `[data-card-id="${CSS.escape(event.card.id)}"]`;
    case 'GuardPlayed':
      return event.cards[0] ? `[data-card-id="${CSS.escape(event.cards[0].id)}"]` : null;
    case 'TrapUsed':
    case 'Sacrificed':
      return `[data-saindo-id="${CSS.escape(event.target.id)}"]`;
    case 'CardStolen':
      return `[data-card-id="${CSS.escape(event.card.id)}"]`;
    default:
      return null;
  }
}

/** Depois do impacto, a carta dele vai ao cemitério: a Armadilha, o Sacrifício e o A do Roubo. */
const goesToGrave = (event: GameEvent): boolean => event.type === 'TrapUsed' || event.type === 'Sacrificed' || event.type === 'CardStolen';

/** A pista do impacto e quanto antes dele ela começa (o pouso bate `dropMs` depois do começo). O dano do Roubo já soa: nada. */
function impactCue(event: GameEvent): { cue: Cue; leadMs: number } | null {
  switch (event.type) {
    case 'BuffPlayed':
    case 'GuardPlayed':
      return { cue: 'pouso', leadMs: TABLE_MOTION.dropMs };
    case 'TrapUsed':
    case 'Sacrificed':
      return { cue: 'quebra', leadMs: 0 };
    default:
      return null;
  }
}

export interface MomentLayerProps {
  run: Run;
  /** A batida de agora: a camada mostra a de momento. */
  beat: Beat | null;
  /** A linha do tempo foi pulada: o momento sai na hora. */
  cut: boolean;
  view: PlayerView;
  names: Names;
  reduced: boolean;
}

/**
 * A camada do momento, por cima da mesa e do véu. Fica com o último momento até a carta dele terminar (a ida ao cemitério passa do fim da
 * batida); o pulo e a linha do tempo que não tem mais a batida o tiram.
 */
export function MomentLayer({ run, beat, cut, view, names, reduced }: MomentLayerProps) {
  // O momento que terminou fica anotado (`done`), em vez de sair: o timer do fim dele e o do fim da batida vencem no mesmo instante, e
  // se o dele chegasse antes, a batida ainda seria o momento e ele voltaria (o achado do E2E do bloco A).
  const [shown, setShown] = useState<{ beat: Beat; serial: number; done: boolean } | null>(null);
  let next = shown;
  if (beat?.kind === 'moment' && beat.moment !== null && shown?.beat !== beat) next = { beat, serial: (shown?.serial ?? 0) + 1, done: false };
  else if (shown !== null && (cut || !run.beats.includes(shown.beat))) next = null;
  if (next !== shown) setShown(next);
  if (next === null || next.done) return null;
  const finished = next.beat;
  const { event } = next.beat;
  // O momento veste a aparência de quem jogou (decks e raças, fatia 2, G6): a carta grande e o verso que vira.
  return (
    <LookZone owner={'player' in event ? event.player : null}>
      <MomentShow
        key={next.serial}
        beat={next.beat}
        view={view}
        names={names}
        reduced={reduced}
        onDone={() => setShown((now) => (now?.beat === finished ? { ...now, done: true } : now))}
      />
    </LookZone>
  );
}

/** O verso da carta grande, no deck do lugar (o de quem jogou): o mesmo do verso da mão dele. O Cordel é o de hoje, sem o atributo. */
function MomentBack() {
  const { deck } = useLook();
  return <span aria-hidden="true" data-momento-verso data-verso-deck={deck === 'cordel' ? undefined : deck} className="momento-verso" />;
}

interface MomentShowProps {
  beat: Beat;
  view: PlayerView;
  names: Names;
  reduced: boolean;
  onDone: () => void;
}

interface Box {
  x: number;
  y: number;
}


function MomentShow({ beat, view, names, reduced, onDone }: MomentShowProps) {
  const sound = useSound();
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const moves = useRef<(Animation | undefined)[]>([]);
  // Os números da placa são os do passo: um `state` quieto que chega no meio não os troca.
  const [plate] = useState(() => momentPlate(beat.event, view, names));
  const [phase, setPhase] = useState<Phase>('flip');
  const [center, setCenter] = useState<Box | null>(null);
  const [scale, setScale] = useState<number>(SCALE.phone);
  const event = beat.event;
  const phases = beat.durationMs === SPECIAL_MOMENT_MS.first ? MOMENT_MS.first : MOMENT_MS.next;
  const flyAt = beat.moment!.flyAtMs - beat.startMs;
  const impact = beat.durationMs;
  const exitMs = goesToGrave(event) && !reduced ? TABLE_MOTION.exitMs : 0;
  const palco = () => root.current?.closest('[data-palco]') ?? null;
  /** A posição de um retângulo da tela no sistema da camada. */
  const local = (box: DOMRect): Box => {
    const from = root.current!.getBoundingClientRect();
    return { x: box.left + box.width / 2 - from.left, y: box.top + box.height / 2 - from.top };
  };

  // Os instantes do momento, contados de quando ele começa (a montagem é no começo da batida), e o som do impacto.
  const finish = useRef(onDone);
  const voice = useRef(sound);
  useEffect(() => {
    finish.current = onDone;
    voice.current = sound;
  }, [onDone, sound]);
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase('plate'), phases.flipMs),
      window.setTimeout(() => setPhase('fly'), flyAt),
      window.setTimeout(() => setPhase('exit'), impact),
      window.setTimeout(() => finish.current(), impact + exitMs),
    ];
    const cue = impactCue(event);
    if (cue !== null) timers.push(window.setTimeout(() => voice.current.play(cue.cue), Math.max(0, impact - cue.leadMs)));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [event, phases, flyAt, impact, exitMs]);

  // O centro da mesa (o dos campos) e o tamanho da carta grande, antes do primeiro quadro.
  useLayoutEffect(() => {
    const layer = root.current;
    if (layer === null) return;
    const fields = palco()?.querySelector('[data-campos]');
    setCenter(local((fields ?? layer).getBoundingClientRect()));
    setScale(layer.getBoundingClientRect().width >= PC_MIN_PX ? SCALE.pc : SCALE.phone);
  }, []);

  // A virada: a carta sai da mão dele (os versos no campo dele), de costas, e cresce até o centro.
  useLayoutEffect(() => {
    const el = card.current;
    if (el === null || center === null || reduced || moves.current.length > 0) return;
    const player = 'player' in event ? event.player : null;
    const hand = player === null ? null : palco()?.querySelector(`[data-campo="${player}"] .area-mao`);
    const from = hand ? local(hand.getBoundingClientRect()) : { x: center.x, y: 0 };
    const dx = from.x - center.x;
    const dy = from.y - center.y;
    moves.current.push(
      el.animate?.(
        [
          { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${FROM_SCALE}) rotateY(180deg)`, opacity: 0.5 },
          { transform: `translate(0px, 0px) scale(${scale}) rotateY(0deg)`, opacity: 1 },
        ],
        { duration: phases.flipMs, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
      ),
    );
  }, [center, scale, event, phases, reduced]);

  // O voo: o destino é medido agora, com a mesa assentada.
  useEffect(() => {
    const el = card.current;
    if (phase !== 'fly' || reduced || el === null || center === null) return;
    const selector = destinationOf(event);
    const target = selector === null ? null : palco()?.querySelector(selector);
    if (!target) return;
    const box = target.getBoundingClientRect();
    const to = local(box);
    // A largura da carta sem a escala: a da face (o contêiner não tem tamanho, as faces são absolutas).
    const width = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    const end = width > 0 ? box.width / width : 1;
    moves.current.push(
      el.animate?.(
        [
          { transform: `translate(0px, 0px) scale(${scale}) rotateY(0deg)`, opacity: 1 },
          { transform: `translate(${(to.x - center.x).toFixed(1)}px, ${(to.y - center.y).toFixed(1)}px) scale(${end.toFixed(3)}) rotateY(0deg)`, opacity: 1 },
        ],
        { duration: impact - flyAt, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
      ),
    );
  }, [phase, reduced, center, event, scale, impact, flyAt]);

  // Depois do impacto: ao cemitério (o `translate` se soma ao `transform` do voo, que fica parado no alvo), ou some de uma vez, e a
  // carta de verdade aparece no lugar.
  useEffect(() => {
    const el = card.current;
    if (phase !== 'exit' || el === null) return;
    if (exitMs === 0) {
      moves.current.forEach((move) => move?.cancel());
      moves.current = [];
      el.style.opacity = '0';
      return;
    }
    const grave = palco()?.querySelector('[data-cemiterio]');
    const box = el.getBoundingClientRect();
    const graveBox = grave?.getBoundingClientRect();
    const dx = graveBox ? graveBox.left + graveBox.width / 2 - (box.left + box.width / 2) : 0;
    const dy = graveBox ? graveBox.top + graveBox.height / 2 - (box.top + box.height / 2) : 24;
    moves.current.push(
      el.animate?.([{ translate: '0px 0px', opacity: 1 }, { translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, opacity: 0 }], {
        duration: exitMs,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
        fill: 'forwards',
      }),
    );
  }, [phase, exitMs]);

  useEffect(() => () => moves.current.forEach((move) => move?.cancel()), []);

  const cards = cardsOf(event);
  const plateShown = reduced ? phase !== 'exit' : phase === 'plate';
  return (
    <div
      ref={root}
      aria-hidden="true"
      data-momento={event.type}
      data-fase={phase}
      data-reduzido={reduced ? 'true' : undefined}
      className="pointer-events-none absolute inset-0 z-[55] overflow-hidden"
    >
      <div
        ref={card}
        data-momento-carta
        className="momento-carta absolute"
        style={{
          left: `${center?.x ?? 0}px`,
          top: `${center?.y ?? 0}px`,
          // Sem a virada (movimento reduzido), a carta já está grande, no centro; com ela, a animação a mostra.
          ...(reduced ? { transform: `scale(${scale})`, opacity: phase === 'exit' ? 0 : 1 } : { opacity: 0 }),
          visibility: center === null ? 'hidden' : undefined,
        }}
      >
        {cards.map((special, index) => {
          const step = index - (cards.length - 1) / 2;
          return (
            <div
              key={special.id}
              className="momento-face absolute left-0 top-0"
              style={{ translate: `calc(-50% + ${step * FAN_PX}px) -50%`, rotate: `${step * FAN_DEG}deg` }}
            >
              <Card card={special} size="hand" animated={false} ghost />
              {reduced ? null : <MomentBack />}
            </div>
          );
        })}
      </div>
      {plate === null || center === null ? null : (
        <div
          data-placa-momento
          data-visivel={plateShown ? 'true' : undefined}
          className={`absolute w-max max-w-[calc(100%-2rem)] -translate-x-1/2 border-[3px] border-tinta bg-papel px-3 py-1.5 text-center text-tinta shadow-[3px_3px_0_var(--color-tinta)] transition-opacity duration-150 ease-out ${plateShown ? 'opacity-100' : 'opacity-0'}`}
          style={{ left: `${center.x}px`, top: `calc(${center.y}px + var(--hand-h) * ${scale / 2} + ${PLATE_GAP_PX}px)` }}
        >
          <p className="font-madeira text-[15px] uppercase leading-tight pc:text-xl">{plate.title}</p>
          {plate.consequence === null ? null : (
            <p className="font-texto text-[13px] font-bold leading-snug tabular-nums pc:text-[15px]">{plate.consequence}</p>
          )}
        </div>
      )}
    </div>
  );
}
