// O palco (spec §4, §10.1, §10.4): envolve a mesa, toca as batidas do último `state` e leva à mesa, por contexto, o que
// ela precisa para animar (`useAnim`): se há batida (`useBoardBusy`), quando cada carta começa a se mexer, os efeitos da
// batida de agora e a fase da contagem dos números.
//
// - A `view` mais recente é sempre a que está desenhada; as batidas são transição e sobreposição por cima dela.
// - A cena inverte o palco inteiro uma vez (`filter: invert(1)`), como o negativo da gravura, sobre uma cortina escura de
//   tela inteira. A trava de flash (`FlashLock`) vale para a tela, não para um `state`, e soma a inversão e a cortina: uma
//   inversão que passaria de 3 trocas claro ↔ escuro em 1 s, ou que começaria antes do resfriamento, não acontece, e a
//   cena segue sem ela; a cortina que não pode subir deixa só o painel, e a que não pode descer espera. Com movimento
//   reduzido, nunca há inversão.
// - Um toque na mesa (ou Esc) durante as batidas termina tudo na hora. O toque que pulou não vira clique: a barra de ação
//   desligada não pode receber, no mesmo gesto, a jogada que o jogador nem viu liberada.
// - Cada batida ao vivo toca a pista dela (`cueOf`), uma vez, quando a batida começa. O `catchUp` (eventos perdidos numa
//   reconexão) e o `resync` (que nem tem batidas) são mudos; o pulo termina as batidas, e as pistas que faltavam não tocam.
// - O Motion vem com `LazyMotion`: o recurso de layout (`layoutId` das cartas) só existe no `domMax`, carregado por
//   `import()` à parte, fora do JavaScript inicial (spec §12).
import { LazyMotion, MotionConfig } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { effectsOf, NO_EFFECTS } from '../../model/effects.ts';
import { roomNames } from '../../model/history.ts';
import type { SessionSnapshot } from '../../model/session.ts';
import { cueOf } from '../../model/sound.ts';
import type { Beat } from '../../model/timeline.ts';
import { useSound } from '../sound-context.ts';
import { AnimContext, type Anim, type CountPhase } from './context.ts';
import { BeatOverlay } from './Scene.tsx';
import { useBeatPlayer } from './useBeatPlayer.ts';

/** Quanto o clique do gesto que pulou pode demorar depois do `pointerup` (o toque no celular chega em outra tarefa). */
const CLICK_GRACE_MS = 400;

const loadMotionFeatures = () => import('./motion-features.ts').then((module) => module.default);

export interface StageProps {
  snapshot: SessionSnapshot;
  /** O menu ou o sistema pedem menos movimento (`useReducedMotion`). */
  reducedMotion: boolean;
  /** As batidas do último `state` terminaram (no fim ou no pulo). */
  onSettled?: () => void;
  children: ReactNode;
}

export function Stage({ snapshot, reducedMotion, onSettled, children }: StageProps) {
  const { state, room } = snapshot;
  // A decisão do jogador espera se há jogada legal para ele neste `state` (spec §4.1: tudo cabe em ~1 s).
  const player = useBeatPlayer(state, { reducedMotion, decisionPending: snapshot.legal.length > 0 }, onSettled);
  const { run, beat, index, busy, inverted, curtain, bannerBeat, banner, released, skip } = player;
  const names = useMemo(() => roomNames(state?.view.me ?? 'p1', room?.seats ?? []), [state, room]);

  const count: CountPhase =
    !busy || reducedMotion || run.damageIndex < 0 || index > run.damageIndex
      ? 'idle'
      : index === run.damageIndex
        ? 'count'
        : 'hold';
  const countMs = run.beats[run.damageIndex]?.durationMs ?? 0;
  // O número da pressão muda NA batida dela, com destaque (sem movimento: o destaque é só cor, vale com movimento reduzido).
  const pressure: CountPhase =
    !busy || run.pressureIndex < 0 || index > run.pressureIndex
      ? 'idle'
      : index === run.pressureIndex
        ? 'count'
        : 'hold';
  const seq = state?.seq ?? 0;
  const remounted = useMemo(() => ({ serial: released.serial, ids: released.batch }), [released]);

  // O som da batida: toca quando a batida de agora muda (a identidade dela), só ao vivo. A batida que já tocou não toca de
  // novo, mesmo que o desenho se repita por outro motivo (o modo estrito monta os efeitos duas vezes).
  const sound = useSound();
  const me = state?.view.me ?? 'p1';
  const cued = useRef<Beat | null>(null);
  useEffect(() => {
    if (beat === null || beat === cued.current) return;
    cued.current = beat;
    if (run.catchUp) return;
    const cue = cueOf(beat, me);
    if (cue !== null) sound.play(cue);
  }, [beat, run.catchUp, me, sound]);

  // A cena em curso e a última que passou: a cortina segura o painel da última até descer (e o pulo o apaga já).
  const sceneNow = beat !== null && beat.kind === 'scene' && beat.scene !== null ? beat : null;
  const [lastScene, setLastScene] = useState<Beat | null>(null);
  if (sceneNow !== null && sceneNow !== lastScene) setLastScene(sceneNow);
  const scene = sceneNow ?? (curtain && busy ? lastScene : null);

  const anim = useMemo<Anim>(
    () => ({
      busy,
      reduced: reducedMotion,
      delayOf: (id) => (busy && !reducedMotion ? (run.delays.get(id) ?? 0) / 1000 : 0),
      enterDelay: (id) => {
        const startMs = busy ? run.deals.cards.get(id) : undefined;
        return startMs === undefined ? null : startMs / 1000;
      },
      backs: (player) => {
        const deal = busy ? run.deals.backs.get(player) : undefined;
        return deal === undefined ? null : { count: deal.count, delay: deal.startMs / 1000 };
      },
      remounted,
      markOf: (id) => released.marks.get(id) ?? 0,
      instant: (id) => released.instant.has(id),
      layoutKey: `${seq}:${busy ? 'tocando' : 'parado'}`,
      fx: state ? effectsOf(beat, state.view) : NO_EFFECTS,
      beatMs: beat?.durationMs ?? 0,
      count,
      countMs,
      pressure,
    }),
    [busy, reducedMotion, run, released, remounted, seq, state, beat, count, countMs, pressure],
  );

  // Esc pula as batidas (o Esc que um diálogo ou a gaveta do histórico já tratou não conta).
  useEffect(() => {
    if (!busy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      skip();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, skip]);

  // O toque que pulou as batidas não vira clique na barra, na mão nem em carta nenhuma. O clique do mesmo gesto chega logo
  // depois do `pointerup`; se não chegar (rolagem, `pointercancel`, o navegador que descarta o clique num botão
  // desligado), a marca cai sozinha e o Enter do teclado que vier depois não é engolido.
  const skippedByTouch = useRef(false);
  const forgetTouch = useRef<number | null>(null);
  const clearTouch = () => {
    skippedByTouch.current = false;
    if (forgetTouch.current !== null) window.clearTimeout(forgetTouch.current);
    forgetTouch.current = null;
  };
  useEffect(
    () => () => {
      if (forgetTouch.current !== null) window.clearTimeout(forgetTouch.current);
    },
    [],
  );
  const onPointerDown = () => {
    clearTouch();
    skippedByTouch.current = busy;
    if (busy) skip();
  };
  const onPointerUp = () => {
    if (skippedByTouch.current) forgetTouch.current = window.setTimeout(clearTouch, CLICK_GRACE_MS);
  };
  const onClick = (event: MouseEvent) => {
    if (skippedByTouch.current) {
      clearTouch();
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    if (busy) skip();
  };

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <AnimContext value={anim}>
          <div
            data-palco
            data-ocupado={busy ? 'true' : undefined}
            data-invertido={inverted ? 'true' : undefined}
            style={inverted ? { filter: 'invert(1)' } : undefined}
            onPointerDownCapture={onPointerDown}
            onPointerUpCapture={onPointerUp}
            onPointerCancelCapture={clearTouch}
            onClickCapture={onClick}
            className="relative isolate"
          >
            {children}
            <BeatOverlay
              bannerBeat={bannerBeat}
              banner={banner}
              scene={scene}
              curtain={curtain}
              names={names}
              reduced={reducedMotion}
            />
          </div>
        </AnimContext>
      </MotionConfig>
    </LazyMotion>
  );
}
