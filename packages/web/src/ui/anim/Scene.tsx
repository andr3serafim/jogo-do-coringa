// As sobreposições das batidas (spec §4.2, §10.1): a cena (a tela escurece e o título aparece no meio) e a faixa. Ficam
// escondidas do leitor de tela: o histórico (região polida) é o registro acessível de tudo o que aconteceu.
//
// Sem pisca-pisca (spec §10.4: nunca mais de 3 trocas claro ↔ escuro por segundo, somando tudo o que estiver na tela):
// as camadas ficam montadas o tempo todo e só trocam de opacidade (esmaecimento de 220 ms, com `ease-out`: U4). A cortina escura da cena (a
// única mudança de luminância de tela inteira além da inversão) não segue a batida de agora: quem a sobe e a desce é o
// `useBeatPlayer`, pela mesma `FlashLock` da inversão, e a faixa também: ela sobe e desce por ele, quando a regra deixa. Entre
// uma faixa e a seguinte só o texto troca, então faixas coladas são UMA subida e UMA descida. No `catchUp`, onde batidas de
// movimento se intercalam com as faixas, `bannerBeatAt` mantém a camada no ar da primeira à última faixa da linha do tempo
// (com o texto da última que passou): uma subida e uma descida por reconexão, e não uma por faixa, o que passaria de 3
// trocas por segundo.
//
// Com movimento reduzido, a cena é o mesmo texto parado que aparece e some (esmaecimento), sem escala nem deslocamento.
//
// As cenas raras (U3 do sub-projeto 5: Ataque Absoluto, Defesa Absoluta, Exódia) são mais longas e têm figura: os quatro J entram
// em leque, os quatro Q formam um muro, os quatro K da Exódia sobem um a um até a cruz; o título carimba (escala, com mola) no
// instante em que a linha do tempo põe a única inversão da cena (`SCENE_INVERT_LEAD_MS`), e raios de xilogravura giram devagar
// atrás do painel. As cartas são desenhos (`Card` sem `layoutId`), não as da mesa. Nada disso muda a luminância da tela: o
// painel é escuro do começo ao fim, e os raios são traço sobre ele. Com movimento reduzido, tudo já parado no lugar.
import type { SpecialCard, Suit } from '@coringa/engine';
import type { Names } from '@coringa/sim/text';
import * as m from 'motion/react-m';
import { useState, type ReactNode } from 'react';
import { bannerText, sceneText } from '../../model/effects.ts';
import { SCENE_INVERT_LEAD_MS, type Beat, type SceneKind } from '../../model/timeline.ts';
import { Card } from '../cards/Card.tsx';

export interface BeatOverlayProps {
  /** A batida cuja faixa vale agora (`bannerBeatAt`), ou `null`: o texto vem dela. */
  bannerBeat: Beat | null;
  /** A camada da faixa está no ar (decidido pelo `useBeatPlayer`, pela trava de flash). */
  banner: boolean;
  /** A cena que o painel mostra (a de agora, ou a última enquanto a cortina segura). */
  scene: Beat | null;
  /** A cortina escura está no ar (decidido pelo `useBeatPlayer`). */
  curtain: boolean;
  names: Names;
  reduced: boolean;
}

/** A sobreposição da batida de agora: cena, faixa, ou nada (as camadas ficam, só esmaecem). */
export function BeatOverlay({ bannerBeat, banner, scene, curtain, names, reduced }: BeatOverlayProps) {
  // A trava pode segurar a faixa no ar depois da batida dela: fica o texto da última que passou.
  const text = bannerBeat === null ? null : bannerText(bannerBeat.event, names);
  const [last, setLast] = useState<string | null>(text);
  if (text !== null && text !== last) setLast(text);
  return (
    <>
      <SceneLayer scene={scene} curtain={curtain} names={names} reduced={reduced} />
      <BannerLayer text={banner ? (text ?? last) : null} />
    </>
  );
}

function Shield() {
  return (
    <svg viewBox="0 0 24 26" aria-hidden="true" className="mx-auto mb-2 size-12 text-ouro pc:size-16">
      <path
        d="M12 1 L22 4.5 V13 C22 19 17.5 23.5 12 25 C6.5 23.5 2 19 2 13 V4.5 Z"
        fill="currentColor"
        stroke="var(--color-papel)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function SceneLayer({
  scene,
  curtain,
  names,
  reduced,
}: {
  scene: Beat | null;
  curtain: boolean;
  names: Names;
  reduced: boolean;
}) {
  // O painel fica montado depois da primeira cena e só esmaece (220 ms), com o texto da última enquanto some: sem troca
  // brusca de luminância, e o esmaecimento é o que o movimento reduzido mantém (texto parado que aparece e some).
  const [last, setLast] = useState<Beat | null>(scene);
  // Cada cena nova remonta a figura e o título, para a entrada tocar de novo (duas cenas iguais seguidas também).
  const [serial, setSerial] = useState(0);
  if (scene !== null && scene !== last) {
    setLast(scene);
    setSerial((n) => n + 1);
  }
  const shown = scene ?? last;
  const { title, detail } = shown === null ? { title: '', detail: '' } : sceneText(shown, names);
  const reflect = shown?.scene === 'REFLECT_PLAYED' || shown?.scene === 'REFLECT_TRIGGERED';
  const rare = shown !== null && shown.scene !== null && shown.scene in RARE ? RARE[shown.scene as RareKind] : null;
  return (
    <div
      aria-hidden="true"
      data-camada-cena
      data-cena={scene?.scene ?? undefined}
      data-reduzido={reduced ? 'true' : undefined}
      className="pointer-events-none absolute inset-0 z-50 grid place-items-center px-4"
    >
      <div
        data-cortina
        data-ativa={curtain ? 'true' : undefined}
        className={`absolute inset-0 bg-tinta/60 transition-opacity duration-[220ms] ease-out ${curtain ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Sempre montado: até o primeiro aparecer é um esmaecimento, não um pulo de opacidade. */}
      <div
        data-painel-cena
        data-ativo={scene === null ? undefined : 'true'}
        data-rara={rare ? shown?.scene : undefined}
        className={`relative overflow-hidden border-[5px] border-papel bg-tinta px-6 py-4 text-center text-papel transition-opacity duration-[220ms] ease-out ${scene === null ? 'opacity-0' : 'opacity-100'} ${rare ? 'w-[min(92vw,34rem)] py-6' : ''}`}
      >
        {rare ? <Rays reduced={reduced} /> : null}
        {reflect ? <Shield /> : null}
        {rare ? <Figure key={serial} rare={rare} reduced={reduced} /> : null}
        <Stamp key={`titulo-${serial}`} delay={rare?.titleAt ?? 0} reduced={reduced || rare === null}>
          <p className="textura relative font-madeira text-4xl uppercase leading-none pc:text-6xl">{title}</p>
        </Stamp>
        {detail ? <p className="relative mt-2 text-base font-bold pc:text-xl">{detail}</p> : null}
      </div>
    </div>
  );
}

function BannerLayer({ text }: { text: string | null }) {
  return (
    <div
      aria-hidden="true"
      data-camada-faixa
      data-faixa={text ?? undefined}
      className={`pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 border-y-4 border-ouro bg-tinta px-3 py-2 text-center transition-opacity duration-[220ms] ease-out ${text === null ? 'opacity-0' : 'opacity-100'}`}
    >
      {text === null ? null : (
        <p className="font-madeira text-2xl uppercase leading-tight text-ouro pc:text-3xl">{text}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// As cenas raras (U3)

type RareKind = Extract<SceneKind, 'EXODIA' | 'ABSOLUTE_ATTACK' | 'ABSOLUTE_DEFENSE'>;

interface RareScene {
  kind: 'J' | 'Q' | 'K';
  /** Leque (os J), muro (os Q) ou cruz (os K da Exódia). */
  layout: 'fan' | 'wall' | 'cross';
  /** Segundos entre a entrada de uma carta e a da seguinte. */
  stagger: number;
  /** Segundos até o título carimbar: o instante da inversão da cena (a mesma conta da linha do tempo). */
  titleAt: number;
}

const RARE: Record<RareKind, RareScene> = {
  ABSOLUTE_ATTACK: { kind: 'J', layout: 'fan', stagger: 0.12, titleAt: SCENE_INVERT_LEAD_MS.ABSOLUTE_ATTACK / 1000 },
  ABSOLUTE_DEFENSE: { kind: 'Q', layout: 'wall', stagger: 0.12, titleAt: SCENE_INVERT_LEAD_MS.ABSOLUTE_DEFENSE / 1000 },
  EXODIA: { kind: 'K', layout: 'cross', stagger: 0.3, titleAt: SCENE_INVERT_LEAD_MS.EXODIA / 1000 },
};

const SUITS: readonly Suit[] = ['copas', 'ouros', 'espadas', 'paus'];

/** Onde cada uma das quatro cartas para: deslocamento em larguras de carta (x) e inclinação. */
const PLACES: Record<RareScene['layout'], ReadonlyArray<{ x: number; y: number; rotate: number }>> = {
  fan: [
    { x: -1.1, y: 0.18, rotate: -24 },
    { x: -0.38, y: 0, rotate: -8 },
    { x: 0.38, y: 0, rotate: 8 },
    { x: 1.1, y: 0.18, rotate: 24 },
  ],
  wall: [
    { x: -1.65, y: 0, rotate: 0 },
    { x: -0.55, y: 0, rotate: 0 },
    { x: 0.55, y: 0, rotate: 0 },
    { x: 1.65, y: 0, rotate: 0 },
  ],
  cross: [
    { x: 0, y: -0.85, rotate: 0 },
    { x: -1.1, y: 0, rotate: -6 },
    { x: 1.1, y: 0, rotate: 6 },
    { x: 0, y: 0.85, rotate: 0 },
  ],
};

/** As quatro cartas da cena rara: entram uma a uma, com mola; com movimento reduzido, já paradas no lugar. */
function Figure({ rare, reduced }: { rare: RareScene; reduced: boolean }) {
  const tall = rare.layout === 'cross';
  return (
    <div
      data-figura={rare.layout}
      className={`relative mx-auto mb-3 w-full ${tall ? 'h-[calc(var(--card-w)*3.3)]' : 'h-[calc(var(--card-w)*1.75)]'}`}
    >
      {PLACES[rare.layout].map((place, i) => {
        const card: SpecialCard = { id: `cena-${rare.kind}-${i}`, kind: rare.kind, suit: SUITS[i]! };
        return (
          <m.div
            key={card.id}
            className="absolute w-(--card-w)"
            style={{
              left: `calc(50% + ${place.x} * var(--card-w) - var(--card-w) / 2)`,
              top: `calc(50% + ${place.y} * var(--card-w) * 1.39 - var(--card-w) * 0.7)`,
            }}
            initial={reduced ? false : { opacity: 0, y: 70, scale: 0.6, rotate: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: place.rotate }}
            transition={reduced ? { duration: 0 } : { delay: i * rare.stagger, type: 'spring', bounce: 0.35, visualDuration: 0.45 }}
          >
            <Card card={card} size="field" animated={false} />
          </m.div>
        );
      })}
    </div>
  );
}

/** O título que carimba: entra grande e assenta, com mola, no instante da inversão. Sem animação, só aparece. */
function Stamp({ delay, reduced, children }: { delay: number; reduced: boolean; children: ReactNode }) {
  if (reduced) return <div className="relative">{children}</div>;
  return (
    <m.div
      className="relative"
      initial={{ opacity: 0, scale: 1.6, rotate: -5 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay, type: 'spring', bounce: 0.45, visualDuration: 0.3 }}
    >
      {children}
    </m.div>
  );
}

/** Raios de xilogravura atrás do painel: cunhas de traço, girando devagar (parados com movimento reduzido). */
function Rays({ reduced }: { reduced: boolean }) {
  const wedges = Array.from({ length: 18 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 18;
    const b = a + Math.PI / 30;
    const point = (angle: number) => `${(Math.cos(angle) * 70).toFixed(2)} ${(Math.sin(angle) * 70).toFixed(2)}`;
    return `M0 0 L${point(a)} L${point(b)} Z`;
  });
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[200%] -translate-x-1/2 -translate-y-1/2">
      <svg
        viewBox="-50 -50 100 100"
        data-raios
        className={`size-full text-ouro opacity-25 ${reduced ? '' : 'animate-[spin_36s_linear_infinite]'}`}
      >
        {wedges.map((d) => (
          <path key={d} d={d} fill="currentColor" />
        ))}
      </svg>
    </div>
  );
}
