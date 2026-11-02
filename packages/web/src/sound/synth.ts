// O sintetizador dos sons (Fase C, fatia 1). Só entra por `import()` dinâmico, depois do primeiro gesto (ver `controller.ts`),
// e por isso mora num chunk à parte. Tudo sai de código: osciladores, ruído filtrado e envelopes curtos do Web Audio, sem
// arquivo de áudio e sem licença a conferir. Cada pista é uma receita de poucas vozes (um tom ou uma rajada de ruído); todas
// passam por um volume geral moderado e por um compressor que faz de limitador, então nada fura o teto.
import { SCENE_MOMENTS } from '../model/scene-moments.ts';
import type { Cue } from '../model/sound.ts';
import type { Synth } from './controller.ts';

/** Volume geral, antes do limitador. */
const MASTER_GAIN = 0.8;
/** O "zero" dos envelopes: uma rampa exponencial não chega a 0 de verdade. */
const SILENCE = 0.0001;
/** Subida padrão até o pico, em s: curta, mas sem o clique de um degrau. */
const ATTACK = 0.005;
/** O ruído branco é um buffer só, repetido; cada rajada começa num ponto diferente dele. */
const NOISE_SECONDS = 0.5;

/** O que toda voz tem: quando começa, quanto dura, quão alto fica e por onde passa a frequência. */
interface Voice {
  /** Atraso em relação ao instante da pista, em s. */
  at?: number;
  /** Duração, em s: o envelope sobe até o pico e desce a quase zero nela. */
  length: number;
  /** Volume do pico (0 a 1, por voz). */
  peak: number;
  /** Subida até o pico, em s. */
  attack?: number;
  /** Frequência em Hz no começo (a do oscilador; no ruído, a de corte do filtro). */
  from: number;
  /** Frequência no fim; sem ela a frequência fica parada. */
  to?: number;
}

interface ToneSpec extends Voice {
  wave: OscillatorType;
}

interface NoiseSpec extends Voice {
  filter: BiquadFilterType;
  /** Ressonância do filtro; padrão 1. */
  q?: number;
}

/** Os blocos de que as receitas são feitas. */
interface Voices {
  tone(spec: ToneSpec): void;
  noise(spec: NoiseSpec): void;
}

/** Faz a frequência de `param` ir de `from` a `to` ao longo da voz (parada, se não há `to`). */
function glide(param: AudioParam, start: number, voice: Voice): void {
  param.setValueAtTime(voice.from, start);
  if (voice.to !== undefined && voice.to !== voice.from) param.exponentialRampToValueAtTime(voice.to, start + voice.length);
}

/** O envelope do volume: de quase zero ao pico e de volta a quase zero. */
function envelope(param: AudioParam, start: number, voice: Voice): void {
  param.setValueAtTime(SILENCE, start);
  param.exponentialRampToValueAtTime(voice.peak, start + (voice.attack ?? ATTACK));
  param.exponentialRampToValueAtTime(SILENCE, start + voice.length);
}

/** Agenda o fim da fonte; quando ela acaba, solta a voz do resto da cadeia (o navegador recolhe os nós). */
function stopAt(source: AudioScheduledSourceNode, voiceOut: AudioNode, end: number): void {
  source.stop(end);
  source.onended = () => voiceOut.disconnect();
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Um tom: um oscilador com envelope. */
function playTone(ctx: AudioContext, out: AudioNode, spec: ToneSpec): void {
  const start = ctx.currentTime + (spec.at ?? 0);
  const osc = ctx.createOscillator();
  osc.type = spec.wave;
  glide(osc.frequency, start, spec);
  const gain = ctx.createGain();
  envelope(gain.gain, start, spec);
  osc.connect(gain).connect(out);
  osc.start(start);
  stopAt(osc, gain, start + spec.length);
}

/** Uma rajada de ruído: o ruído branco passa por um filtro (que pode varrer a frequência) e por um envelope. */
function playNoise(ctx: AudioContext, out: AudioNode, buffer: AudioBuffer, spec: NoiseSpec): void {
  const start = ctx.currentTime + (spec.at ?? 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = spec.filter;
  filter.Q.value = spec.q ?? 1;
  glide(filter.frequency, start, spec);
  const gain = ctx.createGain();
  envelope(gain.gain, start, spec);
  source.connect(filter).connect(gain).connect(out);
  source.start(start, Math.random() * NOISE_SECONDS);
  stopAt(source, gain, start + spec.length);
}

const ATK = SCENE_MOMENTS.ABSOLUTE_ATTACK;
const DEF = SCENE_MOMENTS.ABSOLUTE_DEFENSE;
const EXO = SCENE_MOMENTS.EXODIA;
const DEV = SCENE_MOMENTS.DEVASTATION;
const NOPE = SCENE_MOMENTS.DEVASTATION_CANCELED;
const RP = SCENE_MOMENTS.REFLECT_PLAYED;
const RT = SCENE_MOMENTS.REFLECT_TRIGGERED;
const RC = SCENE_MOMENTS.REFLECT_CANCELED;
/** Quanto cada carta leva para chegar à ponta do espelho (o voo da cena). */
const MIRROR_CARD_MS = 220;
/** Um instante da cena (ms desde o começo dela), em segundos de pista. */
const s = (ms: number): number => ms / 1000;

/**
 * As receitas, uma por pista. Todas até 600 ms, menos a `espada` (até 1,2 s) e as das cenas raras, que acompanham a cena inteira
 * com as vozes nos instantes dela (`SCENE_MOMENTS`). Timbres livres (spec §9): o que importa é
 * curto, original e sem pico. Golpes mais pesados são mais graves, mais longos e mais cheios.
 */
/** O sino de vidro: parciais agudas e longas, sem alma de metal. */
function glassBell({ tone, noise }: Voices, at: number): void {
  tone({ wave: 'sine', from: 1319, at, length: 0.8, peak: 0.2 });
  tone({ wave: 'sine', from: 2637, at, length: 0.6, peak: 0.12 });
  tone({ wave: 'sine', from: 3951, at, length: 0.4, peak: 0.07 });
  noise({ filter: 'highpass', from: 5000, at, length: 0.06, peak: 0.2 });
}

/** O vidro que quebra: o chiado agudo que desce, e um tinido solto. */
function glassBreak({ tone, noise }: Voices, at: number): void {
  noise({ filter: 'highpass', from: 5200, to: 2600, at, length: 0.5, peak: 0.22 });
  tone({ wave: 'triangle', from: 3136, to: 1568, at, length: 0.3, peak: 0.1 });
}

/** A ida do cometa, igual com ou sem dano: a carga, o sopro, o tempo lento, e a batida no espelho, com o sino e o impacto. */
function cometWay(voices: Voices): void {
  const { tone, noise } = voices;
  const charge = s(RT.launchAt);
  noise({ filter: 'lowpass', from: 180, to: 520, attack: charge * 0.85, length: charge, peak: 0.2 });
  tone({ wave: 'sine', from: 55, to: 110, attack: charge * 0.85, length: charge, peak: 0.16 });
  noise({ filter: 'bandpass', from: 600, to: 1800, q: 1, at: s(RT.launchAt), attack: 0.2, length: s(RT.slowAt - RT.launchAt) + 0.05, peak: 0.2 });
  const slow = s(RT.slowUntil - RT.slowAt);
  tone({ wave: 'sawtooth', from: 90, to: 70, at: s(RT.slowAt), attack: 0.1, length: slow, peak: 0.08 });
  noise({ filter: 'lowpass', from: 500, to: 300, at: s(RT.slowAt), attack: 0.1, length: slow, peak: 0.1 });
  glassBell(voices, s(RT.mirrorHitAt));
  tone({ wave: 'sine', from: 120, to: 32, at: s(RT.mirrorHitAt), length: 0.5, peak: 0.42 });
  noise({ filter: 'lowpass', from: 3000, to: 200, at: s(RT.mirrorHitAt), length: 0.4, peak: 0.32 });
}

const RECIPES: Record<Cue, (voices: Voices) => void> = {
  // A carta chega à mesa: um estalo de papel e uma batida seca.
  carta: ({ tone, noise }) => {
    noise({ filter: 'bandpass', from: 2400, to: 900, q: 0.8, length: 0.07, peak: 0.5 });
    tone({ wave: 'triangle', from: 220, to: 130, length: 0.09, peak: 0.4 });
  },
  // Algo se parte: um estalo agudo que varre para baixo, um segundo estalo logo atrás e um rangido grave.
  quebra: ({ tone, noise }) => {
    noise({ filter: 'highpass', from: 2600, to: 700, length: 0.18, peak: 0.4 });
    noise({ filter: 'bandpass', from: 3200, q: 1.5, at: 0.07, length: 0.05, peak: 0.3 });
    tone({ wave: 'sawtooth', from: 320, to: 70, length: 0.22, peak: 0.2 });
  },
  'golpe-leve': ({ tone, noise }) => {
    tone({ wave: 'sine', from: 180, to: 90, length: 0.12, peak: 0.5 });
    noise({ filter: 'lowpass', from: 1500, to: 600, length: 0.06, peak: 0.3 });
  },
  'golpe-medio': ({ tone, noise }) => {
    tone({ wave: 'sine', from: 140, to: 60, length: 0.2, peak: 0.5 });
    tone({ wave: 'triangle', from: 280, to: 120, length: 0.1, peak: 0.2 });
    noise({ filter: 'lowpass', from: 1800, to: 400, length: 0.12, peak: 0.3 });
  },
  'golpe-forte': ({ tone, noise }) => {
    tone({ wave: 'sine', from: 110, to: 38, length: 0.38, peak: 0.5 });
    tone({ wave: 'sawtooth', from: 90, to: 40, length: 0.3, peak: 0.15 });
    noise({ filter: 'lowpass', from: 2200, to: 250, length: 0.25, peak: 0.4 });
  },
  // A sua vez: dois toques de sino, o segundo uma quinta acima.
  vez: ({ tone }) => {
    tone({ wave: 'sine', from: 660, length: 0.2, peak: 0.22 });
    tone({ wave: 'sine', from: 990, at: 0.1, length: 0.3, peak: 0.18 });
  },
  // Vitória: um arpejo que sobe, em sol maior, e termina numa nota mais longa.
  vitoria: ({ tone }) => {
    [392, 494, 587, 784].forEach((hz, i, notes) => {
      tone({ wave: 'triangle', from: hz, at: i * 0.08, length: i === notes.length - 1 ? 0.34 : 0.26, peak: 0.2 });
    });
  },
  // Derrota: três notas que descem, sobre um grave que afunda.
  derrota: ({ tone }) => {
    [330, 262, 196].forEach((hz, i) => tone({ wave: 'sine', from: hz, at: i * 0.13, length: 0.3, peak: 0.2 }));
    tone({ wave: 'sine', from: 110, to: 55, length: 0.55, peak: 0.25 });
  },
  // O relógio nos últimos 5 s: dois tiques agudos e secos.
  urgencia: ({ tone }) => {
    tone({ wave: 'sine', from: 1200, length: 0.05, peak: 0.15 });
    tone({ wave: 'sine', from: 1200, at: 0.13, length: 0.05, peak: 0.15 });
  },
  // A espada da iniciativa (sub-projeto 6 §10): o zunido do voo, ruído num passa-faixa que sobe de 400 a 2200 Hz, e, quando ela
  // crava (aos 0,8 s), um tinido de lâmina (1318 e 1976 Hz, uma quinta acima).
  espada: ({ tone, noise }) => {
    noise({ filter: 'bandpass', from: 400, to: 2200, q: 2, attack: 0.2, length: 0.45, peak: 0.22 });
    noise({ filter: 'bandpass', from: 900, to: 2600, q: 3, at: 0.35, attack: 0.15, length: 0.4, peak: 0.12 });
    tone({ wave: 'triangle', from: 1318, at: 0.8, length: 0.25, peak: 0.2 });
    tone({ wave: 'sine', from: 1976, at: 0.8, length: 0.2, peak: 0.12 });
  },
  // A fita de cordel: um estalo de papel (ruído passa-altas a 2500 Hz) e um segundo, mais curto, logo atrás.
  fita: ({ noise }) => {
    noise({ filter: 'highpass', from: 2500, length: 0.06, peak: 0.3 });
    noise({ filter: 'highpass', from: 3000, at: 0.05, length: 0.04, peak: 0.2 });
  },
  // A quadra formada: um acorde curto de dó maior (523, 659 e 784 Hz), as vozes entrando de 40 em 40 ms.
  quadra: ({ tone }) => {
    [523, 659, 784].forEach((hz, i) => tone({ wave: 'triangle', from: hz, at: i * 0.04, length: 0.5 - i * 0.04, peak: 0.16 }));
  },
  // O Ataque Absoluto (sub-projeto 6 §10): um ronco que cresce enquanto a aura junta energia, o estrondo grave quando os J entram
  // no Coringa, a carga aguda da bola e o impacto do feixe no instante da inversão.
  'ataque-absoluto': ({ tone, noise }) => {
    const prep = s(ATK.transformAt - ATK.barsIn);
    tone({ wave: 'sine', from: 55, at: s(ATK.barsIn), attack: prep, length: prep + 0.15, peak: 0.22 });
    tone({ wave: 'sawtooth', from: 70, to: 140, at: s(ATK.barsIn), attack: prep, length: prep + 0.15, peak: 0.09 });
    noise({ filter: 'lowpass', from: 200, to: 700, at: s(ATK.barsIn), attack: prep - 0.05, length: prep + 0.15, peak: 0.12 });
    tone({ wave: 'sine', from: 90, to: 40, at: s(ATK.transformAt), length: 0.5, peak: 0.32 });
    noise({ filter: 'lowpass', from: 1800, to: 200, at: s(ATK.transformAt), length: 0.4, peak: 0.2 });
    const charge = s(ATK.hitAt - ATK.ballAt);
    tone({ wave: 'sawtooth', from: 200, to: 900, at: s(ATK.ballAt), attack: charge, length: charge + 0.02, peak: 0.08 });
    noise({ filter: 'bandpass', from: 600, to: 4000, q: 1.2, at: s(ATK.ballAt), attack: charge - 0.04, length: charge + 0.02, peak: 0.12 });
    tone({ wave: 'sine', from: 110, to: 34, at: s(ATK.hitAt), length: 0.6, peak: 0.4 });
    tone({ wave: 'sawtooth', from: 80, to: 35, at: s(ATK.hitAt), length: 0.45, peak: 0.14 });
    noise({ filter: 'lowpass', from: 2600, to: 180, at: s(ATK.hitAt), length: 0.5, peak: 0.34 });
  },
  // A Defesa Absoluta: o ronco da muralha, o zunido do escudo caindo e o baque dele no chão, um tinido de metal em cada Q que
  // crava, e o clangor da trava (um acorde de metal, sol e ré, sobre um grave) no instante da inversão.
  'defesa-absoluta': ({ tone, noise }) => {
    const rise = s(DEF.shieldLandsAt - 340 - DEF.barsIn);
    noise({ filter: 'lowpass', from: 300, to: 150, at: s(DEF.barsIn), attack: rise * 0.6, length: rise, peak: 0.2 });
    tone({ wave: 'sine', from: 50, at: s(DEF.barsIn), attack: rise * 0.6, length: rise + 0.05, peak: 0.15 });
    noise({ filter: 'bandpass', from: 400, to: 1800, q: 1.5, at: s(DEF.shieldLandsAt - 340), attack: 0.3, length: 0.34, peak: 0.12 });
    tone({ wave: 'sine', from: 120, to: 45, at: s(DEF.shieldLandsAt), length: 0.4, peak: 0.38 });
    noise({ filter: 'lowpass', from: 2000, to: 250, at: s(DEF.shieldLandsAt), length: 0.3, peak: 0.3 });
    for (const ms of DEF.queensAt) {
      tone({ wave: 'triangle', from: 1175, at: s(ms), length: 0.3, peak: 0.16 });
      tone({ wave: 'sine', from: 1760, at: s(ms), length: 0.22, peak: 0.1 });
      noise({ filter: 'bandpass', from: 5000, q: 2, at: s(ms), length: 0.03, peak: 0.15 });
    }
    tone({ wave: 'triangle', from: 784, at: s(DEF.lockAt), length: 0.9, peak: 0.2 });
    tone({ wave: 'sine', from: 1175, at: s(DEF.lockAt), length: 0.7, peak: 0.14 });
    tone({ wave: 'sine', from: 1568, at: s(DEF.lockAt), length: 0.5, peak: 0.1 });
    tone({ wave: 'sine', from: 90, to: 45, at: s(DEF.lockAt), length: 0.4, peak: 0.25 });
  },
  // A Exódia: um baque grave a cada K, o ronco que cresce até a coroa, o zunido dela caindo, o tinido de metal e o estrondo quando
  // ela crava (no instante da inversão), e o acorde grave que desce junto com a vida do perdedor.
  exodia: ({ tone, noise }) => {
    const rise = s(EXO.crownAt - EXO.barsIn);
    noise({ filter: 'lowpass', from: 240, to: 520, at: s(EXO.barsIn), attack: rise * 0.9, length: rise, peak: 0.18 });
    tone({ wave: 'sine', from: 48, to: 62, at: s(EXO.barsIn), attack: rise * 0.9, length: rise + 0.05, peak: 0.16 });
    for (const ms of EXO.kingsAt) {
      tone({ wave: 'sine', from: 130, to: 48, at: s(ms), length: 0.28, peak: 0.36 });
      noise({ filter: 'lowpass', from: 1400, to: 200, at: s(ms), length: 0.16, peak: 0.2 });
    }
    noise({ filter: 'bandpass', from: 500, to: 2400, q: 1.5, at: s(EXO.crownAt - 380), attack: 0.34, length: 0.38, peak: 0.12 });
    tone({ wave: 'triangle', from: 1319, at: s(EXO.crownAt), length: 0.8, peak: 0.2 });
    tone({ wave: 'sine', from: 1976, at: s(EXO.crownAt), length: 0.6, peak: 0.12 });
    tone({ wave: 'sine', from: 110, to: 32, at: s(EXO.crownAt), length: 0.7, peak: 0.42 });
    tone({ wave: 'sawtooth', from: 80, to: 35, at: s(EXO.crownAt), length: 0.5, peak: 0.14 });
    noise({ filter: 'lowpass', from: 2800, to: 160, at: s(EXO.crownAt), length: 0.6, peak: 0.34 });
    for (const hz of [196, 233, 294]) tone({ wave: 'triangle', from: hz, to: hz / 2, at: s(EXO.drainAt), length: 0.9, peak: 0.13 });
  },
  // A Devastação: o ronco da terra que cresce até a fenda, o estalo dela, o estrondo do chão que se abre (no instante da inversão), e
  // o entulho que cai e a poeira que assenta logo depois.
  devastacao: ({ tone, noise }) => {
    const rise = s(DEV.openAt);
    noise({ filter: 'lowpass', from: 120, to: 380, attack: rise * 0.85, length: rise, peak: 0.24 });
    tone({ wave: 'sine', from: 42, to: 58, attack: rise * 0.85, length: rise, peak: 0.2 });
    noise({ filter: 'highpass', from: 2600, to: 900, at: s(DEV.crackAt), length: 0.09, peak: 0.4 });
    tone({ wave: 'sawtooth', from: 300, to: 80, at: s(DEV.crackAt), length: 0.12, peak: 0.18 });
    tone({ wave: 'sine', from: 90, to: 28, at: s(DEV.openAt), length: 0.8, peak: 0.45 });
    tone({ wave: 'sawtooth', from: 70, to: 30, at: s(DEV.openAt), length: 0.6, peak: 0.14 });
    noise({ filter: 'lowpass', from: 2400, to: 120, at: s(DEV.openAt), length: 0.8, peak: 0.38 });
    noise({ filter: 'bandpass', from: 1800, to: 500, q: 1, at: s(DEV.openAt) + 0.2, length: 0.5, peak: 0.16 });
    noise({ filter: 'bandpass', from: 1400, to: 400, q: 1, at: s(DEV.openAt) + 0.45, length: 0.35, peak: 0.1 });
    noise({ filter: 'lowpass', from: 400, to: 120, at: s(DEV.openAt) + 0.1, attack: 0.05, length: 1.2, peak: 0.14 });
  },
  // A cancelada: o mesmo ronco, um estalo curto da fenda que começa, e tudo morre quando ela para. Sem estrondo.
  'devastacao-cancelada': ({ tone, noise }) => {
    const rise = s(NOPE.stopAt);
    noise({ filter: 'lowpass', from: 120, to: 300, attack: rise * 0.8, length: rise, peak: 0.22 });
    tone({ wave: 'sine', from: 42, to: 54, attack: rise * 0.8, length: rise, peak: 0.18 });
    noise({ filter: 'highpass', from: 2600, to: 1400, at: s(NOPE.crackAt), length: 0.09, peak: 0.25 });
  },
  // O espelho que se forma: um tinido em cada carta que chega à ponta, e o sino de vidro.
  'reflect-armado': (voices) => {
    for (const ms of RP.cardsAt) voices.tone({ wave: 'triangle', from: 1568, at: s(ms + MIRROR_CARD_MS), length: 0.12, peak: 0.12 });
    glassBell(voices, s(RP.mirrorAt));
  },
  // O cometa: a ida, o sopro que sobe na volta, o baque no retrato e o vidro que quebra.
  'reflect-cometa': (voices) => {
    cometWay(voices);
    const { tone, noise } = voices;
    noise({ filter: 'bandpass', from: 900, to: 3200, q: 1, at: s(RT.mirrorHitAt), attack: 0.25, length: s(RT.returnHitAt - RT.mirrorHitAt), peak: 0.2 });
    tone({ wave: 'sine', from: 100, to: 30, at: s(RT.returnHitAt), length: 0.45, peak: 0.45 });
    noise({ filter: 'lowpass', from: 2400, to: 160, at: s(RT.returnHitAt), length: 0.4, peak: 0.3 });
    glassBreak(voices, s(RT.returnHitAt));
  },
  // O cometa que se desfaz no espelho: a mesma ida, e depois só o vidro.
  'reflect-segurado': (voices) => {
    cometWay(voices);
    glassBreak(voices, s(RT.returnHitAt));
  },
  // Os dois espelhos que trincam: dois estalos de vidro, um logo depois do outro, sem estrondo.
  'reflect-cancelado': ({ tone, noise }) => {
    for (const at of [s(RC.crackAt), s(RC.crackAt) + 0.09]) {
      noise({ filter: 'highpass', from: 4800, to: 2400, at, length: 0.1, peak: 0.26 });
      tone({ wave: 'triangle', from: 2794, to: 1760, at, length: 0.14, peak: 0.1 });
    }
  },
};

/** Quanto o corte leva para zerar o que está soando. */
const CUT_SECONDS = 0.08;

/** O sintetizador sobre `ctx`: a cadeia de saída (volume geral e limitador) é montada uma vez, e cada pista liga as vozes nela. */
export function createSynth(ctx: AudioContext): Required<Synth> {
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.1;
  master.connect(limiter).connect(ctx.destination);

  const noise = noiseBuffer(ctx);
  // Cada pista passa por um ganho próprio, para o corte (`cut`) zerar o que ainda soa sem mexer no volume geral. O ganho fica na
  // lista até a última voz da pista acabar.
  const live: Array<{ bus: GainNode; end: number }> = [];
  const prune = () => {
    for (let i = live.length - 1; i >= 0; i--) if (live[i]!.end <= ctx.currentTime) live.splice(i, 1);
  };
  return {
    play: (cue) => {
      prune();
      const bus = ctx.createGain();
      bus.gain.value = 1;
      bus.connect(master);
      let end = ctx.currentTime;
      const track = (spec: Voice) => {
        end = Math.max(end, ctx.currentTime + (spec.at ?? 0) + spec.length);
      };
      RECIPES[cue]({
        tone: (spec) => {
          track(spec);
          playTone(ctx, bus, spec);
        },
        noise: (spec) => {
          track(spec);
          playNoise(ctx, bus, noise, spec);
        },
      });
      live.push({ bus, end });
    },
    cut: () => {
      const now = ctx.currentTime;
      for (const { bus } of live) {
        bus.gain.cancelScheduledValues?.(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(0, now + CUT_SECONDS);
      }
      live.length = 0;
    },
  };
}

export default createSynth;
