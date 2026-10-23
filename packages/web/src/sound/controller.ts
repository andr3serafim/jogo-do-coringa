// O controlador de som (Fase C, fatia 1): decide QUANDO existe um `AudioContext` e quando uma pista pode soar. Fica no bundle
// inicial, por isso é pequeno e não importa o sintetizador: este só entra por `import()` dinâmico (`browserSoundDeps`), num
// chunk à parte, depois do primeiro gesto do usuário.
//
// Por que os eventos de ativação: o Chrome e o Safari só contam como ativação do usuário o `pointerup`, o `touchend`, o `click`
// e o `keydown`. Um `pointerdown` de toque NÃO destrava o áudio, então ele sozinho não cria o contexto. Antes de um gesto não há
// contexto, nem sintetizador, nem pista na fila: `play` descarta.
import type { Cue } from '../model/sound.ts';

/**
 * O que o controlador usa de um `AudioContext`; o `AudioContext` do navegador cumpre isto, e os testes usam um falso. O Safari
 * acrescenta o estado `interrupted` (uma ligação, outro app com o áudio): como qualquer estado fora de `running`, ele pede `resume()`.
 */
export interface AudioContextLike {
  readonly state: 'suspended' | 'running' | 'closed' | 'interrupted';
  resume(): Promise<void>;
  suspend(): Promise<void>;
}

/** O sintetizador toca uma pista agora, num contexto que já existe. */
export interface Synth {
  play(cue: Cue): void;
}

export interface SoundControllerDeps {
  createContext(): AudioContextLike;
  /** Carrega o sintetizador que toca neste contexto (no navegador, o `import()` do `synth.ts`). */
  loadSynth(ctx: AudioContextLike): Promise<Synth>;
}

/** Os gestos que o navegador conta como ativação do usuário, e que por isso podem criar e retomar o contexto. */
export const ACTIVATION_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

// Captura, para um `stopPropagation` da interface não esconder o gesto; passivo, porque o controlador nunca cancela nada.
const LISTENER_OPTIONS = { capture: true, passive: true } as const;

const ignore = () => {};

export class SoundController {
  private readonly deps: SoundControllerDeps;
  private enabled: boolean;
  private ctx: AudioContextLike | null = null;
  private synth: Synth | null = null;
  private loading = false;

  constructor(deps: SoundControllerDeps, enabled: boolean) {
    this.deps = deps;
    this.enabled = enabled;
  }

  /** Passa a ouvir os gestos de ativação em `target` (o `document`); devolve a função que tira os ouvintes. */
  attach(target: EventTarget): () => void {
    const onGesture = () => this.onGesture();
    for (const type of ACTIVATION_EVENTS) target.addEventListener(type, onGesture, LISTENER_OPTIONS);
    return () => {
      for (const type of ACTIVATION_EVENTS) target.removeEventListener(type, onGesture, LISTENER_OPTIONS);
    };
  }

  /**
   * Liga ou desliga o som. Desligar suspende o contexto vivo. Ligar não cria nem retoma nada: isso espera o próximo gesto,
   * que é o único momento em que o navegador deixa.
   */
  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (!on) this.ctx?.suspend().catch(ignore);
  }

  /**
   * Toca a pista, se der. Sem som ligado, sem sintetizador carregado ou com o contexto parado (suspenso, interrompido), a
   * pista é descartada: não há fila, senão elas soariam todas juntas na retomada.
   */
  play(cue: Cue): void {
    if (!this.enabled || this.synth === null || this.ctx?.state !== 'running') return;
    try {
      this.synth.play(cue);
    } catch {
      // O som é enfeite: um nó que o navegador recusa nunca derruba a partida.
    }
  }

  private onGesture(): void {
    if (!this.enabled) return;
    if (this.ctx === null) {
      try {
        this.ctx = this.deps.createContext();
      } catch {
        return; // sem Web Audio neste navegador: o próximo gesto tenta de novo, sem custo
      }
      void this.load(this.ctx);
      return;
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(ignore);
    if (this.synth === null) void this.load(this.ctx);
  }

  /** Carrega o sintetizador; se falhar (sem rede), o gesto seguinte tenta de novo no mesmo contexto. */
  private async load(ctx: AudioContextLike): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      this.synth = await this.deps.loadSynth(ctx);
    } catch {
      // fica sem sintetizador até a próxima tentativa
    } finally {
      this.loading = false;
    }
  }
}

/** As dependências reais: o `AudioContext` do navegador e o sintetizador num chunk à parte (fora do JavaScript inicial). */
export const browserSoundDeps: SoundControllerDeps = {
  createContext: () => new AudioContext(),
  loadSynth: async (ctx) => {
    const { default: createSynth } = await import('./synth.ts');
    return createSynth(ctx as AudioContext);
  },
};
