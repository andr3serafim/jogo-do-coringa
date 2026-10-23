// O sintetizador dos sons (Fase C, fatia 1). Só entra por `import()` dinâmico, depois do primeiro gesto (ver `controller.ts`),
// e por isso mora num chunk à parte. Tudo sai de código: osciladores, ruído filtrado e envelopes curtos do Web Audio, sem
// arquivo de áudio e sem licença a conferir. Cada pista é uma receita de poucas vozes (um tom ou uma rajada de ruído); todas
// passam por um volume geral moderado e por um compressor que faz de limitador, então nada fura o teto.
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

/**
 * As receitas, uma por pista. Todas até 600 ms, menos o `absoluto` (até 1,2 s). Timbres livres (spec §9): o que importa é
 * curto, original e sem pico. Golpes mais pesados são mais graves, mais longos e mais cheios.
 */
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
  // O escudo: um tinido metálico (dois tons agudos, o segundo uma quinta acima do primeiro: 1046 Hz e 1568 Hz) e um clique de ruído.
  escudo: ({ tone, noise }) => {
    tone({ wave: 'triangle', from: 1046, length: 0.35, peak: 0.2 });
    tone({ wave: 'sine', from: 1568, length: 0.25, peak: 0.12 });
    noise({ filter: 'bandpass', from: 5000, q: 2, length: 0.03, peak: 0.2 });
  },
  // O golpe absoluto: uma onda que cresce por uns 700 ms e desaba num impacto grave. É a única pista que passa de 600 ms.
  absoluto: ({ tone, noise }) => {
    tone({ wave: 'sawtooth', from: 70, to: 210, attack: 0.6, length: 1.0, peak: 0.12 });
    tone({ wave: 'sine', from: 55, attack: 0.5, length: 1.15, peak: 0.25 });
    noise({ filter: 'bandpass', from: 300, to: 3000, q: 1.2, attack: 0.7, length: 1.0, peak: 0.15 });
    tone({ wave: 'sine', from: 100, to: 40, at: 0.7, length: 0.45, peak: 0.3 });
    noise({ filter: 'lowpass', from: 2000, to: 200, at: 0.7, length: 0.4, peak: 0.2 });
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
};

/** O sintetizador sobre `ctx`: a cadeia de saída (volume geral e limitador) é montada uma vez, e cada pista liga as vozes nela. */
export function createSynth(ctx: AudioContext): Synth {
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
  const voices: Voices = {
    tone: (spec) => playTone(ctx, master, spec),
    noise: (spec) => playNoise(ctx, master, noise, spec),
  };
  return { play: (cue) => RECIPES[cue](voices) };
}

export default createSynth;
