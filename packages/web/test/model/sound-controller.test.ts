import { describe, expect, it } from 'vitest';
import type { Cue } from '../../src/model/sound.ts';
import {
  ACTIVATION_EVENTS,
  SoundController,
  type AudioContextLike,
  type Synth,
} from '../../src/sound/controller.ts';

/** Um contexto falso: o estado se muda à mão e as chamadas ficam contadas. */
class FakeContext implements AudioContextLike {
  state: AudioContextLike['state'];
  resumes = 0;
  suspends = 0;

  constructor(state: AudioContextLike['state'] = 'running') {
    this.state = state;
  }

  resume(): Promise<void> {
    this.resumes += 1;
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.suspends += 1;
    return Promise.resolve();
  }
}

interface Rig {
  controller: SoundController;
  target: EventTarget;
  contexts: FakeContext[];
  synthLoads: number;
  played: Cue[];
  /** Termina o carregamento do sintetizador que está no ar (o `import()` do navegador). */
  finishLoad(): Promise<void>;
  failLoad(): Promise<void>;
}

/** Monta o controlador com um contexto e um sintetizador falsos; o carregamento do sintetizador só termina quando o teste manda. */
function rig(options: { enabled?: boolean; contextState?: AudioContextLike['state']; throwOnPlay?: boolean } = {}): Rig {
  const contexts: FakeContext[] = [];
  const pending: { resolve(synth: Synth): void; reject(error: Error): void }[] = [];
  const played: Cue[] = [];
  const state: Rig = {
    controller: undefined as unknown as SoundController,
    target: new EventTarget(),
    contexts,
    synthLoads: 0,
    played,
    async finishLoad() {
      pending.shift()?.resolve({
        play(cue) {
          if (options.throwOnPlay) throw new Error('nó inválido');
          played.push(cue);
        },
      });
      await flush();
    },
    async failLoad() {
      pending.shift()?.reject(new Error('sem rede'));
      await flush();
    },
  };
  state.controller = new SoundController(
    {
      createContext() {
        const ctx = new FakeContext(options.contextState);
        contexts.push(ctx);
        return ctx;
      },
      loadSynth() {
        state.synthLoads += 1;
        return new Promise<Synth>((resolve, reject) => pending.push({ resolve, reject }));
      },
    },
    options.enabled ?? true,
  );
  state.controller.attach(state.target);
  return state;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const gesture = (target: EventTarget, type: string = 'click') => target.dispatchEvent(new Event(type));

describe('SoundController', () => {
  it('os eventos de ativação são os que o navegador conta como gesto do usuário', () => {
    expect([...ACTIVATION_EVENTS]).toEqual(['pointerup', 'touchend', 'click', 'keydown']);
  });

  it('nenhum contexto antes de um gesto, e um pointerdown sozinho não conta', () => {
    const r = rig();
    gesture(r.target, 'pointerdown');
    gesture(r.target, 'pointermove');
    gesture(r.target, 'touchstart');
    gesture(r.target, 'mousedown');
    expect(r.contexts).toHaveLength(0);
    expect(r.synthLoads).toBe(0);
  });

  it.each(ACTIVATION_EVENTS)('o primeiro %s cria o contexto e carrega o sintetizador', (type) => {
    const r = rig();
    gesture(r.target, type);
    expect(r.contexts).toHaveLength(1);
    expect(r.synthLoads).toBe(1);
  });

  it('só um contexto e um carregamento, por mais gestos que cheguem', async () => {
    const r = rig();
    gesture(r.target, 'pointerup');
    gesture(r.target, 'click'); // o segundo gesto chega com o carregamento ainda no ar
    await r.finishLoad();
    gesture(r.target, 'keydown');
    expect(r.contexts).toHaveLength(1);
    expect(r.synthLoads).toBe(1);
  });

  it('um contexto que nasce suspenso é retomado no próprio gesto que o criou, e nos seguintes enquanto não estiver tocando', () => {
    const r = rig({ contextState: 'suspended' });
    gesture(r.target, 'pointerup');
    expect(r.contexts[0]!.resumes).toBe(1);
    // o navegador ainda não o pôs a tocar: o gesto seguinte tenta de novo
    gesture(r.target, 'click');
    expect(r.contexts[0]!.resumes).toBe(2);
    // retomado de verdade: os gestos que vêm depois não mexem mais nele
    r.contexts[0]!.state = 'running';
    gesture(r.target, 'click');
    expect(r.contexts[0]!.resumes).toBe(2);
  });

  it('um contexto que já nasce tocando não é retomado de novo, e uma retomada recusada não derruba nada', () => {
    const running = rig();
    gesture(running.target, 'click');
    expect(running.contexts[0]!.resumes).toBe(0);

    const refused = rig({ contextState: 'suspended' });
    const original = FakeContext.prototype.resume;
    FakeContext.prototype.resume = function (this: FakeContext) {
      this.resumes += 1;
      return Promise.reject(new Error('recusado'));
    };
    try {
      gesture(refused.target, 'click');
    } finally {
      FakeContext.prototype.resume = original;
    }
    expect(refused.contexts[0]!.resumes).toBe(1);
    expect(refused.synthLoads).toBe(1);
  });

  it('um contexto interrompido depois (ligação no iOS) também é retomado no gesto seguinte', () => {
    const r = rig();
    gesture(r.target, 'click');
    r.contexts[0]!.state = 'interrupted';
    gesture(r.target, 'keydown');
    expect(r.contexts[0]!.resumes).toBe(1);
  });

  it('play antes de o sintetizador carregar descarta; depois, toca', async () => {
    const r = rig();
    r.controller.play('carta'); // nem contexto há ainda
    gesture(r.target, 'click');
    r.controller.play('quebra'); // o sintetizador ainda carrega
    await r.finishLoad();
    expect(r.played).toEqual([]);
    r.controller.play('golpe-forte');
    expect(r.played).toEqual(['golpe-forte']);
  });

  it('play não toca num contexto que não está rodando, para não juntar pistas velhas na retomada', async () => {
    const r = rig();
    gesture(r.target, 'click');
    await r.finishLoad();
    r.contexts[0]!.state = 'suspended';
    r.controller.play('vez');
    expect(r.played).toEqual([]);
    r.contexts[0]!.state = 'running';
    r.controller.play('vez');
    expect(r.played).toEqual(['vez']);
  });

  it('um sintetizador que lança ao tocar não derruba quem chamou', async () => {
    const r = rig({ throwOnPlay: true });
    gesture(r.target, 'click');
    await r.finishLoad();
    expect(() => r.controller.play('carta')).not.toThrow();
  });

  it('o carregamento que falha (sem rede) é tentado de novo no gesto seguinte, no mesmo contexto', async () => {
    const r = rig();
    gesture(r.target, 'click');
    await r.failLoad();
    expect(r.synthLoads).toBe(1);
    gesture(r.target, 'click');
    expect(r.synthLoads).toBe(2);
    expect(r.contexts).toHaveLength(1);
    await r.finishLoad();
    r.controller.play('escudo');
    expect(r.played).toEqual(['escudo']);
  });

  it('desligado, o gesto não cria contexto e play não toca', () => {
    const r = rig({ enabled: false });
    gesture(r.target, 'click');
    r.controller.play('carta');
    expect(r.contexts).toHaveLength(0);
    expect(r.synthLoads).toBe(0);
    expect(r.played).toEqual([]);
  });

  it('desligar com o contexto vivo o suspende, e play descarta', async () => {
    const r = rig();
    gesture(r.target, 'click');
    await r.finishLoad();
    r.controller.setEnabled(false);
    expect(r.contexts[0]!.suspends).toBe(1);
    r.controller.play('carta');
    expect(r.played).toEqual([]);
  });

  it('desligado, um contexto suspenso não é retomado pelos gestos', async () => {
    const r = rig();
    gesture(r.target, 'click');
    r.controller.setEnabled(false);
    r.contexts[0]!.state = 'suspended';
    gesture(r.target, 'click');
    expect(r.contexts[0]!.resumes).toBe(0);
  });

  it('ligar de novo não cria nem retoma nada: espera o próximo gesto', async () => {
    const r = rig();
    gesture(r.target, 'click');
    await r.finishLoad();
    r.controller.setEnabled(false);
    r.contexts[0]!.state = 'suspended';
    r.controller.setEnabled(true);
    expect(r.contexts[0]!.resumes).toBe(0);
    r.controller.play('carta'); // suspenso: descarta
    expect(r.played).toEqual([]);
    gesture(r.target, 'click');
    expect(r.contexts[0]!.resumes).toBe(1);
    r.contexts[0]!.state = 'running';
    r.controller.play('carta');
    expect(r.played).toEqual(['carta']);
    expect(r.contexts).toHaveLength(1);
  });

  it('ligar sem nunca ter havido contexto também espera o primeiro gesto', () => {
    const r = rig({ enabled: false });
    r.controller.setEnabled(true);
    expect(r.contexts).toHaveLength(0);
    gesture(r.target, 'click');
    expect(r.contexts).toHaveLength(1);
  });

  it('attach devolve a função que remove os ouvintes', () => {
    const r = rig();
    const other = new EventTarget();
    const detach = r.controller.attach(other);
    detach();
    for (const type of ACTIVATION_EVENTS) gesture(other, type);
    expect(r.contexts).toHaveLength(0);
    // o outro alvo, ainda ligado, continua valendo
    gesture(r.target, 'click');
    expect(r.contexts).toHaveLength(1);
  });
});
