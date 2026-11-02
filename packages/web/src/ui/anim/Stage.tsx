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
//   desligada não pode receber, no mesmo gesto, a jogada que o jogador nem viu liberada. Só os controles marcados com
//   `data-sem-pulo` (os controles do replay e o painel da dica do tutorial, que não mandam jogada) ficam de fora: o clique neles é
//   deles. A barra de jogadas e a mão nunca o usam.
// - Cada batida ao vivo toca a pista dela (`cueOf`), uma vez, quando a batida começa. O `catchUp` (eventos perdidos numa
//   reconexão) e o `resync` (que nem tem batidas) são mudos; o pulo termina as batidas, e as pistas que faltavam não tocam.
// - O `resync` (a volta da reconexão fora do anel e, no replay, o voltar, o "Início" e a rodada) troca a mesa de uma vez: as cartas
//   chegam sem a transição de layout (`instant`), e não deslizam do quadro de antes. O `catchUp` e o passo ao vivo animam.
// - O Motion vem com `LazyMotion`: o recurso de layout (`layoutId` das cartas) só existe no `domMax`, carregado por
//   `import()` à parte, fora do JavaScript inicial (spec §12).
import type { DevastationState, PlayerId } from '@coringa/engine';
import { LazyMotion, MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { Ribbon } from '../../model/copy.ts';
import { bannerRibbon, desolationShown, effectsOf, fieldTarget, insigniaShown, lifeChange, NO_EFFECTS, resurrectionInfo, ribbonText } from '../../model/effects.ts';
import { roomNames } from '../../model/history.ts';
import type { SessionSnapshot } from '../../model/session.ts';
import type { ImpactForce } from '../../model/impact.ts';
import { bannerReadMs } from '../../model/reading.ts';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import { cueOf } from '../../model/sound.ts';
import type { Beat } from '../../model/timeline.ts';
import { useSound } from '../sound-context.ts';
import { AnimContext, IDLE_LIFE, type Anim, type CountPhase, type LifeCount } from './context.ts';
import { useScenes } from './scenes-loader.ts';
import { FxLayer } from './FxLayer.tsx';
import { Leaving } from './Leaving.tsx';
import { BeatOverlay } from './Scene.tsx';
import { useBeatPlayer } from './useBeatPlayer.ts';

/** Quanto o clique do gesto que pulou pode demorar depois do `pointerup` (o toque no celular chega em outra tarefa). */
const CLICK_GRACE_MS = 400;

/**
 * Controle que mora dentro do palco sem ser da mesa (os do replay, na barra de baixo da mesa, e o painel da dica do tutorial): um
 * toque nele é só dele, não pula as batidas e não é engolido. Sem isso, o primeiro clique em "Pausar", em "Próximo passo" ou em
 * "Entendi" durante uma cena só a pularia. Só vale para o que não manda jogada: a barra e a mão não o usam.
 */
const OWN_CONTROL = '[data-sem-pulo]';
const isOwnControl = (target: EventTarget | null): boolean => target instanceof Element && target.closest(OWN_CONTROL) !== null;

const loadMotionFeatures = () => import('./motion-features.ts').then((module) => module.default);

/** O tremor do golpe (sub-projeto 6 §5): quanto a mesa se desloca e por quanto tempo, por peso. Deslocamento, não luz (spec §10.4). */
export const SHAKE_PX: Record<ImpactForce, number> = { leve: 3, medio: 4, forte: 6 };
export const SHAKE_MS: Record<ImpactForce, number> = { leve: 200, medio: 200, forte: 260 };
/** O caminho do tremor, em frações de `SHAKE_PX` (x, y): vai e volta, morrendo. */
const SHAKE_PATH: readonly (readonly [number, number])[] = [[0, 0], [-1, 0.5], [1, -0.5], [-0.6, 0.3], [0.4, 0], [0, 0]];

/** Os quadros do tremor de `force`, no `translate` (o `transform` dos campos é das cenas). */
function shakeKeyframes(force: ImpactForce): Keyframe[] {
  const px = SHAKE_PX[force];
  return SHAKE_PATH.map(([x, y], i) => ({ translate: `${x * px}px ${y * px}px`, offset: i / (SHAKE_PATH.length - 1) }));
}
/** Quanto a vida leva para descer depois que o feixe do Ataque Absoluto acerta (o protótipo conta em 700 ms). */
export const HIT_COUNT_MS = 700;

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
  const names = useMemo(() => roomNames(state?.view.me ?? 'p1', room?.seats ?? []), [state, room]);
  // A faixa fica no ar ao menos o tempo de leitura do texto dela (U1).
  const readBanner = useCallback((beat: Beat) => {
    const ribbon = bannerRibbon(beat.event, names);
    return bannerReadMs(ribbon === null ? '' : ribbonText(ribbon));
  }, [names]);
  // O rascunho do Equipar estava à vista no desenho de antes deste `state` (você confirmou nesta página): as suas cartas só assentam.
  // O valor guardado ainda é o do desenho anterior quando o `state` novo chega; a troca dele só vale do desenho seguinte em diante.
  const [confirmedBefore, setConfirmedBefore] = useState(snapshot.equipConfirmed);
  const draftShown = confirmedBefore === 'thisPage';
  if (confirmedBefore !== snapshot.equipConfirmed) setConfirmedBefore(snapshot.equipConfirmed);
  const player = useBeatPlayer(state, { reducedMotion, decisionPending: snapshot.legal.length > 0, bannerReadMs: readBanner, draftShown }, onSettled);
  const { run, beat, index, busy, inverted, curtain, bannerBeat, banner, released, skip, hitLanded, cut } = player;

  const count: CountPhase =
    !busy || reducedMotion || run.damageIndex < 0 || index > run.damageIndex
      ? 'idle'
      : index === run.damageIndex
        ? 'count'
        : 'hold';
  const countMs = run.beats[run.damageIndex]?.durationMs ?? 0;
  // A cena desenhada (o módulo das cenas já chegou) mostra o número do golpe que absorveu: o placar fica embaixo dela.
  const scenes = useScenes();
  const drawnScene = beat?.scene ? scenes?.[beat.scene] !== undefined : false;
  // O golpe que a cena do Ataque Absoluto absorveu conta na cena, uma vez só: a batida absorvida não conta.
  const lifeSteps = useMemo(
    () => run.beats.map((b) => (b.absorbed ? null : lifeChange(b.hit ? b.hit.event : b.event))),
    [run],
  );
  const life = useCallback(
    (who: PlayerId): LifeCount => {
      if (!busy || reducedMotion) return IDLE_LIFE;
      let done = 0;
      let total = 0;
      lifeSteps.forEach((change, i) => {
        if (change?.player !== who) return;
        total += change.delta;
        if (i < index) done += change.delta;
      });
      const now = lifeSteps[index];
      const hit = run.beats[index]?.hit ?? null;
      // Na cena com golpe, a vida espera o feixe acertar e desce em `HIT_COUNT_MS`.
      const step = now?.player === who && (hit === null || hitLanded) ? now.delta : 0;
      const ms = hit === null ? (run.beats[index]?.durationMs ?? 0) : HIT_COUNT_MS;
      return { playing: true, done, step, ms, total };
    },
    [busy, reducedMotion, lifeSteps, index, run, hitLanded],
  );
  const insignia = useCallback(
    (who: PlayerId, active: boolean): boolean => (busy && index >= 0 ? insigniaShown(run.beats, index, who, active) : active),
    [busy, index, run],
  );
  // O fim da Exódia no retrato do perdedor (sub-projeto 6 §7.3): a vida escorre em `drainAt` e o retrato racha em `crackAt`. Até a
  // batida dela, nada; depois dela (ou parado, ou no pulo), tudo.
  const [exodia, setExodia] = useState<{ beat: Beat; stage: 1 | 2 } | null>(null);
  useEffect(() => {
    if (beat?.scene !== 'EXODIA') return;
    const ids = [
      window.setTimeout(() => setExodia({ beat, stage: 1 }), SCENE_MOMENTS.EXODIA.drainAt),
      window.setTimeout(() => setExodia({ beat, stage: 2 }), SCENE_MOMENTS.EXODIA.crackAt),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [beat]);
  const exodiaStage = useCallback((): number => {
    if (!busy || index < 0) return 2;
    const at = run.beats.findIndex((b) => b.event.type === 'Exodia');
    if (at < 0 || index > at) return 2;
    if (index < at) return 0;
    // No `catchUp` a Exódia é faixa, sem cena: vale na batida dela.
    if (run.beats[at]!.scene === null) return 2;
    return exodia?.beat === run.beats[at] ? exodia.stage : 0;
  }, [busy, index, run, exodia]);
  const defeated = useCallback((_who: PlayerId, lost: boolean) => lost && exodiaStage() >= 2, [exodiaStage]);
  const drained = useCallback((_who: PlayerId, lost: boolean) => lost && exodiaStage() >= 1, [exodiaStage]);
  // A desolação da fileira que caiu aparece quando a poeira assenta (sub-projeto 6 §7.4).
  const [settled, setSettled] = useState<Beat | null>(null);
  useEffect(() => {
    if (beat?.scene !== 'DEVASTATION') return;
    const id = window.setTimeout(() => setSettled(beat), SCENE_MOMENTS.DEVASTATION.settleAt);
    return () => window.clearTimeout(id);
  }, [beat]);
  const desolated = useCallback(
    (key: string, stored: boolean): boolean => (busy && index >= 0 ? desolationShown(run.beats, index, key, stored, settled) : stored),
    [busy, index, run, settled],
  );
  // As cartas da fileira devastada vão ao cemitério na hora: quem cai é a cópia da cena (sub-projeto 6 §7.4).
  const fallen = useMemo(
    () => new Set(run.beats.flatMap((b) => (b.event.type === 'RowDevastated' ? b.event.cards.map((card) => card.id) : []))),
    [run],
  );
  // A Devastação em curso (`phase.devastation`) fica guardada: a cancelada não diz a fileira, e ela já saiu da `view` que a traz.
  const phaseNow = state?.view.phase;
  const castNow = phaseNow?.kind === 'REACTION' ? (phaseNow.devastation ?? null) : null;
  const [lastCast, setLastCast] = useState<DevastationState | null>(castNow);
  if (castNow !== null && castNow !== lastCast) setLastCast(castNow);
  const seq = state?.seq ?? 0;
  const jump = state?.resync === true;
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

  // A fita (sub-projeto 6 §4): a trava pode segurá-la no ar depois da batida dela, então fica a última que passou. O objeto só
  // troca quando o texto troca (o `anim` não muda a cada desenho por causa dela).
  const ribbonNow = bannerBeat === null ? null : bannerRibbon(bannerBeat.event, names);
  const [lastRibbon, setLastRibbon] = useState<Ribbon | null>(ribbonNow);
  if (ribbonNow !== null && (lastRibbon === null || ribbonText(ribbonNow) !== ribbonText(lastRibbon))) setLastRibbon(ribbonNow);
  const ribbon = banner ? lastRibbon : null;

  // O voo do monte é do passo ao vivo: sem ele no `catchUp`, no `resync`, com movimento reduzido e depois do pulo.
  const flies = !reducedMotion && !cut && !run.catchUp && !jump;
  const anim = useMemo<Anim>(
    () => ({
      busy,
      reduced: reducedMotion,
      delayOf: (id) => (busy && !reducedMotion ? (run.delays.get(id) ?? 0) / 1000 : 0),
      recoilAt: (id) => {
        const startMs = busy && !reducedMotion && !cut ? run.recoils.get(id) : undefined;
        return startMs === undefined ? null : startMs / 1000;
      },
      landAt: (id) => {
        const landing = cut ? undefined : run.landings.get(id);
        return landing === undefined ? null : { at: landing.atMs / 1000, drop: landing.drop };
      },
      enterDelay: (id) => {
        const startMs = busy ? run.deals.cards.get(id) : undefined;
        return startMs === undefined ? null : startMs / 1000;
      },
      backs: (player) => {
        const deal = busy ? run.deals.backs.get(player) : undefined;
        return deal === undefined ? null : { count: deal.count, delay: deal.startMs / 1000, stagger: deal.staggerMs / 1000 };
      },
      dealAt: (id) => {
        const startMs = flies ? run.deals.cards.get(id) : undefined;
        return startMs === undefined ? null : startMs / 1000;
      },
      backsAt: (player) => {
        const deal = flies ? run.deals.backs.get(player) : undefined;
        return deal === undefined ? null : { count: deal.count, delay: deal.startMs / 1000, stagger: deal.staggerMs / 1000 };
      },
      remounted,
      markOf: (id) => released.marks.get(id) ?? 0,
      // O `resync` troca a mesa de uma vez: uma carta que está nos dois quadros (o salto do replay, a volta da reconexão) não desliza.
      // A carta que estoura e segue na mesa (o topo do cemitério) chega lá sem voar: quem estoura é a cópia dela, no lugar antigo (fatia 5).
      instant: (id) => jump || released.instant.has(id) || (busy && (fallen.has(id) || run.leaving.get(id)?.shatter === true)),
      layoutKey: `${seq}:${busy ? 'tocando' : 'parado'}`,
      fx: state ? effectsOf(beat, state.view, hitLanded, drawnScene) : NO_EFFECTS,
      ribbon,
      beatMs: beat?.durationMs ?? 0,
      count,
      countMs,
      life,
      insignia,
      defeated,
      drained,
      desolated,
    }),
    [
      busy,
      reducedMotion,
      run,
      released,
      remounted,
      seq,
      jump,
      state,
      beat,
      ribbon,
      count,
      countMs,
      life,
      insignia,
      defeated,
      drained,
      desolated,
      hitLanded,
      drawnScene,
      fallen,
      cut,
      flies,
    ],
  );

  // O golpe treme a mesa (o placar e os campos) na batida dele, uma vez por batida: dois golpes seguidos tremem duas vezes. É uma
  // animação nos dois elementos, e nada no palco: uma variável CSS no estilo do palco é herdada e recalculava o estilo da mesa inteira
  // (~530 elementos, ~100 ms com a CPU 4×; `notas/medicao-fatia-5.md`). Nada com movimento reduzido.
  const impact = reducedMotion ? null : anim.fx.impact;
  const palco = useRef<HTMLDivElement>(null);
  const shakeForce = impact?.force ?? null;
  useEffect(() => {
    if (shakeForce === null || palco.current === null) return;
    const frames = shakeKeyframes(shakeForce);
    const shakes = [...palco.current.querySelectorAll<HTMLElement>('[data-placar], [data-campos]')].map((el) =>
      el.animate?.(frames, { duration: SHAKE_MS[shakeForce], easing: 'linear' }),
    );
    return () => shakes.forEach((shake) => shake?.cancel());
  }, [beat, shakeForce]);

  // O pulo leva junto o som das batidas puladas (sub-projeto 6 §10: a pista da cena acompanha a cena inteira).
  const skipNow = useCallback(() => {
    sound.cut();
    skip();
  }, [sound, skip]);

  // Esc pula as batidas (o Esc que um diálogo ou a gaveta do histórico já tratou não conta).
  useEffect(() => {
    if (!busy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      skipNow();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, skipNow]);

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
  const onPointerDown = (event: PointerEvent) => {
    if (isOwnControl(event.target)) return;
    clearTouch();
    skippedByTouch.current = busy;
    if (busy) skipNow();
  };
  const onPointerUp = () => {
    if (skippedByTouch.current) forgetTouch.current = window.setTimeout(clearTouch, CLICK_GRACE_MS);
  };
  const onClick = (event: MouseEvent) => {
    if (isOwnControl(event.target)) return;
    if (skippedByTouch.current) {
      clearTouch();
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    if (busy) skipNow();
  };

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        <AnimContext value={anim}>
          <div
            ref={palco}
            data-palco
            data-ocupado={busy ? 'true' : undefined}
            data-invertido={inverted ? 'true' : undefined}
            data-tremor={impact?.force}
            style={inverted ? { filter: 'invert(1)' } : undefined}
            onPointerDownCapture={onPointerDown}
            onPointerUpCapture={onPointerUp}
            onPointerCancelCapture={clearTouch}
            onClickCapture={onClick}
            className="relative isolate"
          >
            <FxLayer reduced={reducedMotion}>
              {children}
              <Leaving run={run} cut={cut} reduced={reducedMotion} />
            </FxLayer>
            <BeatOverlay
              scene={scene}
              curtain={curtain}
              names={names}
              reduced={reducedMotion}
              me={me}
              hitLanded={hitLanded}
              field={scene && state ? fieldTarget(scene.event, lastCast, state.view.me, state.view.opponent.id) : null}
              rising={scene && state ? resurrectionInfo(scene.event, state.view) : null}
            />
          </div>
        </AnimContext>
      </MotionConfig>
    </LazyMotion>
  );
}
