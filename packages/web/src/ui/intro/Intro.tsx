// A abertura do jogo (decisoes.md 2026-11-16 (5); sem a logo LUSACAN desde 2026-11-19 (6); sem o título, a aura, o anel e as faíscas desde
// 2026-11-25 (2)): a intro do jogo (as cartas dos quatro naipes sobem, juntam-se e o maço vira no Coringa), até o menu. É uma camada por cima do Início, que já está montado por
// baixo (inerte): nada do menu espera a abertura para carregar.
//
// Os instantes moram no modelo (`model/intro.ts`). O CSS (`intro.css`) faz os gestos e os lê pelas variáveis que esta camada entrega.
// Daqui também saem o som nos instantes dele, o fim e o pulo. Clique, toque e "qualquer tecla" pulam (`skipsIntro`).
// Com movimento reduzido, é a versão curta: o Coringa parado, e um esmaecer.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Suit as SuitName } from '@coringa/engine';
import { INTRO_SKIP_HINT, INTRO_SKIP_HINT_TOUCH } from '../../model/copy.ts';
import { INTRO, SKIP_FADE_MS, introPlan, skipsIntro } from '../../model/intro.ts';
import { Coringa } from '../cards/Coringa.tsx';
import { Suit, isRedSuit } from '../cards/Suit.tsx';
import { useSound } from '../sound-context.ts';
import './intro.css';

/** As quatro cartas que sobem, na ordem do leque (preto e vermelho alternados). */
const SUITS: readonly SuitName[] = ['espadas', 'copas', 'ouros', 'paus'];

const ms = (value: number): string => `${value}ms`;

/** Variáveis de CSS no `style` (o React as põe pelo CSSOM, que a CSP do site deixa passar). */
const cssVars = (values: Record<`--${string}`, string | number>): CSSProperties => values as CSSProperties;

/** Uma tela de toque não tem "qualquer tecla": o aviso muda. */
function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export interface IntroProps {
  /** Movimento reduzido (o sistema ou o menu do jogo): a versão curta. Lido uma vez, ao abrir. */
  reduced: boolean;
  /** A abertura acabou (sozinha ou pulada): o menu fica livre. Chamado uma vez. */
  onDone(): void;
}

export function Intro({ reduced, onDone }: IntroProps) {
  const sound = useSound();
  // A versão é a de quando a abertura abriu: trocar a preferência no meio não a recomeça.
  const [plan] = useState(() => introPlan(reduced));
  const [hint] = useState(() => (isCoarsePointer() ? INTRO_SKIP_HINT_TOUCH : INTRO_SKIP_HINT));
  const [leaving, setLeaving] = useState(false);
  /** `true` do pulo em diante, e desde que ela começa a esmaecer sozinha: daí em diante não há o que pular. */
  const closing = useRef(false);
  const onDoneRef = useRef(onDone);
  const skipButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // O relógio da abertura: as pistas de som nos instantes delas e o fim. Depois do pulo, só o esmaecer curto.
  useEffect(() => {
    const done = () => onDoneRef.current();
    if (leaving) {
      const timer = window.setTimeout(done, SKIP_FADE_MS);
      return () => window.clearTimeout(timer);
    }
    const timers = plan.cues.map(({ at, cue }) => window.setTimeout(() => sound.play(cue), at));
    timers.push(
      window.setTimeout(() => {
        closing.current = true;
      }, plan.fadeAt),
    );
    timers.push(window.setTimeout(done, plan.total));
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [leaving, plan, sound]);

  const skip = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    sound.cut();
    setLeaving(true);
  }, [sound]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!skipsIntro(event)) return;
      // A tecla é da abertura: o Espaço não rola a página, e o Enter não aciona nada.
      event.preventDefault();
      skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  // O foco vai ao aviso: o leitor de tela o anuncia, e o Tab não passeia pelo menu coberto.
  useEffect(() => {
    skipButton.current?.focus({ preventScroll: true });
  }, []);

  const full = plan.variant === 'completa';
  const times: Record<`--${string}`, string> = full
    ? {
        '--t-tema': ms(INTRO.themeAt),
        '--d-sobe': ms(INTRO.cardRiseMs),
        '--t-junta': ms(INTRO.gatherAt),
        '--t-vira': ms(INTRO.flipAt),
      }
    : {};
  const style = cssVars({
    ...times,
    '--t-aviso': ms(plan.hintAt),
    '--t-some': ms(plan.fadeAt),
    '--d-some': ms(plan.total - plan.fadeAt),
    '--d-pulo': ms(SKIP_FADE_MS),
  });

  return (
    <div data-abertura={plan.variant} data-saindo={leaving ? 'true' : undefined} className="abertura" style={style} onClick={skip}>
      <div className="abertura-tema" aria-hidden="true">
        <div className="abertura-palco">
          {full ? (
            <>
              {SUITS.map((suit, index) => (
                <div
                  key={suit}
                  className="abertura-carta"
                  data-naipe={suit}
                  style={cssVars({ '--i': index, '--d': ms(INTRO.cardDelays[index]!) })}
                >
                  <Suit suit={suit} className={isRedSuit(suit) ? 'abertura-naipe text-vermelho' : 'abertura-naipe text-tinta'} />
                </div>
              ))}
            </>
          ) : null}
          <div className="abertura-coringa">
            <Coringa className="abertura-coringa-arte" />
          </div>
        </div>
      </div>
      <button ref={skipButton} type="button" className="abertura-aviso">
        {hint}
      </button>
    </div>
  );
}
