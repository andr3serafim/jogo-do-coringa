import { describe, expect, it } from 'vitest';
import type { Cue } from '../../src/model/sound.ts';
import createSynthDefault, { createSynth } from '../../src/sound/synth.ts';

// O Node não tem Web Audio: um `AudioContext` falso, mínimo, que guarda o grafo (quem liga em quem) e a agenda dos parâmetros.
// Ele imita os erros que o navegador lança de verdade e que um sintetizador distraído provocaria (rampa exponencial até zero,
// `start` duas vezes, `stop` antes do `start`), para o teste pegar isso aqui e não no ouvido de quem joga.

const NOW = 5;

class FakeParam {
  value = 0;
  /** Todo valor agendado (`setValueAtTime` e rampas), para conferir o pico. */
  readonly scheduled: number[] = [];

  private schedule(value: number, time: number): this {
    if (!Number.isFinite(value) || !Number.isFinite(time)) throw new TypeError('valor ou tempo não finito');
    if (time < 0) throw new RangeError('tempo negativo');
    this.scheduled.push(value);
    return this;
  }

  setValueAtTime(value: number, time: number): this {
    return this.schedule(value, time);
  }

  linearRampToValueAtTime(value: number, time: number): this {
    return this.schedule(value, time);
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    if (value === 0) throw new RangeError('uma rampa exponencial não chega a zero');
    return this.schedule(value, time);
  }
}

class FakeNode {
  readonly kind: string;
  connections: FakeNode[] = [];

  constructor(kind: string) {
    this.kind = kind;
  }

  connect<T extends FakeNode>(target: T): T {
    this.connections.push(target);
    return target;
  }

  disconnect(): void {
    this.connections = [];
  }
}

class FakeSource extends FakeNode {
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;

  start(time: number): void {
    if (this.startedAt !== null) throw new Error('InvalidStateError: start duas vezes');
    this.startedAt = time;
  }

  stop(time: number): void {
    if (this.startedAt === null) throw new Error('InvalidStateError: stop antes do start');
    this.stoppedAt = time;
  }
}

class FakeOscillator extends FakeSource {
  type = 'sine';
  readonly frequency = new FakeParam();
}

class FakeBufferSource extends FakeSource {
  buffer: FakeBuffer | null = null;
  loop = false;
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}

class FakeCompressor extends FakeNode {
  readonly threshold = new FakeParam();
  readonly knee = new FakeParam();
  readonly ratio = new FakeParam();
  readonly attack = new FakeParam();
  readonly release = new FakeParam();
}

class FakeBuffer {
  readonly length: number;
  readonly data: Float32Array;

  constructor(length: number) {
    this.length = length;
    this.data = new Float32Array(length);
  }

  getChannelData(): Float32Array {
    return this.data;
  }
}

class FakeAudioContext {
  readonly currentTime = NOW;
  readonly sampleRate = 48_000;
  readonly destination = new FakeNode('destination');
  readonly created: FakeNode[] = [];
  readonly buffers: FakeBuffer[] = [];

  private track<T extends FakeNode>(node: T): T {
    this.created.push(node);
    return node;
  }

  createOscillator() {
    return this.track(new FakeOscillator('oscillator'));
  }

  createBufferSource() {
    return this.track(new FakeBufferSource('bufferSource'));
  }

  createGain() {
    return this.track(new FakeGain('gain'));
  }

  createBiquadFilter() {
    return this.track(new FakeFilter('filter'));
  }

  createDynamicsCompressor() {
    return this.track(new FakeCompressor('compressor'));
  }

  createBuffer(channels: number, length: number) {
    expect(channels).toBe(1);
    const buffer = new FakeBuffer(length);
    this.buffers.push(buffer);
    return buffer;
  }
}

/** Toda pista, na ordem que o compilador exigir: se o `Cue` ganhar uma pista, este registro não compila sem ela. */
const ALL_CUES: Record<Cue, true> = {
  carta: true,
  quebra: true,
  'golpe-leve': true,
  'golpe-medio': true,
  'golpe-forte': true,
  escudo: true,
  absoluto: true,
  vez: true,
  vitoria: true,
  derrota: true,
  urgencia: true,
};
const CUES = Object.keys(ALL_CUES) as Cue[];

/** Cria o sintetizador sobre o contexto falso e devolve o que cada chamada de `play` acrescentou ao grafo. */
function setup() {
  const ctx = new FakeAudioContext();
  const synth = createSynth(ctx as unknown as AudioContext);
  const compressors = ctx.created.filter((node): node is FakeCompressor => node instanceof FakeCompressor);
  const before = ctx.created.length;
  return {
    ctx,
    synth,
    compressors,
    /** Os nós criados por `play`, depois da cadeia de saída que o `createSynth` monta. */
    play(cue: Cue): FakeNode[] {
      const start = ctx.created.length;
      synth.play(cue);
      return ctx.created.slice(start);
    },
    before,
  };
}

/** Todo caminho que sai de `node` termina no destino e passa pelo compressor (o limitador) no caminho. */
function everyPathEndsAtLimiter(node: FakeNode, destination: FakeNode, limiter: FakeNode, through = false): boolean {
  if (node === destination) return through;
  if (node.connections.length === 0) return false;
  return node.connections.every((next) => everyPathEndsAtLimiter(next, destination, limiter, through || next === limiter));
}

const isSource = (node: FakeNode): node is FakeSource => node instanceof FakeSource;

describe('createSynth', () => {
  it('o módulo exporta o sintetizador também como default (é o que o import() dinâmico usa)', () => {
    expect(createSynthDefault).toBe(createSynth);
  });

  it('a cadeia de saída é um compressor-limitador antes do destino, montada uma vez só', () => {
    const { ctx, compressors, before } = setup();
    expect(compressors).toHaveLength(1);
    const [limiter] = compressors;
    expect(limiter!.connections).toEqual([ctx.destination]);
    // limitador de verdade: limiar abaixo de zero, razão alta, ataque rápido
    expect(limiter!.threshold.value).toBeLessThan(0);
    expect(limiter!.ratio.value).toBeGreaterThanOrEqual(10);
    expect(limiter!.attack.value).toBeLessThanOrEqual(0.01);
    // o contexto falso ainda não viu nenhum oscilador: só a cadeia de saída (e o ruído) nasceu
    expect(ctx.created.slice(0, before).some(isSource)).toBe(false);
  });

  it.each(CUES)('%s: cria nós, nenhum lança, e tudo chega ao destino pelo limitador', (cue) => {
    const { ctx, compressors, play } = setup();
    const nodes = play(cue);
    const sources = nodes.filter(isSource);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.startedAt).not.toBeNull();
      expect(source.stoppedAt).not.toBeNull();
      expect(source.stoppedAt!).toBeGreaterThan(source.startedAt!);
      expect(everyPathEndsAtLimiter(source, ctx.destination, compressors[0]!)).toBe(true);
    }
    // só o limitador toca o destino
    const touching = ctx.created.filter((node) => node.connections.includes(ctx.destination));
    expect(touching).toEqual(compressors);
  });

  it.each(CUES)('%s: dura no máximo 600 ms (o absoluto, 1,2 s) e começa agora', (cue) => {
    const { play } = setup();
    const sources = play(cue).filter(isSource);
    const limit = cue === 'absoluto' ? 1.2 : 0.6;
    for (const source of sources) {
      expect(source.startedAt!).toBeGreaterThanOrEqual(NOW);
      expect(source.stoppedAt!).toBeLessThanOrEqual(NOW + limit + 1e-9);
    }
    // a pista não é vazia: o fim do último nó passa de 40 ms
    expect(Math.max(...sources.map((source) => source.stoppedAt!))).toBeGreaterThan(NOW + 0.04);
  });

  it.each(CUES)('%s: nenhuma voz passa de metade da escala (sem picos)', (cue) => {
    const { play } = setup();
    const gains = play(cue).filter((node): node is FakeGain => node instanceof FakeGain);
    expect(gains.length).toBeGreaterThan(0);
    for (const gain of gains) expect(Math.max(...gain.gain.scheduled)).toBeLessThanOrEqual(0.5);
  });

  it('as pistas podem soar em seguida e sobrepostas: a cadeia de saída é compartilhada', () => {
    const { ctx, play, compressors } = setup();
    for (const cue of CUES) play(cue);
    play('golpe-forte');
    play('golpe-forte');
    expect(ctx.created.filter((node) => node instanceof FakeCompressor)).toEqual(compressors);
  });

  it('o ruído é um buffer só, feito uma vez, com amostras entre -1 e 1', () => {
    const { ctx, play } = setup();
    expect(ctx.buffers).toHaveLength(1);
    play('quebra');
    play('absoluto');
    expect(ctx.buffers).toHaveLength(1);
    const samples = ctx.buffers[0]!.data;
    expect(samples.some((sample) => sample !== 0)).toBe(true);
    expect(samples.every((sample) => sample >= -1 && sample <= 1)).toBe(true);
  });

  it('a pista de ruído passa por um filtro antes da voz', () => {
    const { ctx, play, compressors } = setup();
    const nodes = play('quebra');
    const noise = nodes.filter((node): node is FakeBufferSource => node instanceof FakeBufferSource);
    expect(noise.length).toBeGreaterThan(0);
    for (const source of noise) {
      expect(source.loop).toBe(true);
      expect(source.buffer).toBe(ctx.buffers[0]);
      expect(source.connections[0]).toBeInstanceOf(FakeFilter);
      expect(everyPathEndsAtLimiter(source, ctx.destination, compressors[0]!)).toBe(true);
    }
  });

  it('ao fim da fonte, a voz solta o resto da cadeia', () => {
    const { play, compressors, ctx } = setup();
    const source = play('carta').find((node) => node instanceof FakeOscillator)!;
    const voice = source.connections[0]!;
    expect(voice.connections.length).toBeGreaterThan(0);
    source.onended!();
    expect(voice.connections).toEqual([]);
    // a cadeia de saída, essa, continua de pé para a próxima pista
    expect(compressors[0]!.connections).toEqual([ctx.destination]);
  });
});
