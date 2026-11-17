// A abertura (decisoes.md 2026-11-16 (5)): a logo, a intro do jogo e o menu. Aqui: o que ela mostra em cada versão, quando termina, o
// que pula (clique, toque, teclas), o som nos instantes dele e o pulo que corta o som. O relógio é o falso do Vitest; o jsdom não anima
// o CSS, então o que a pessoa vê em cada instante é conferido pelas variáveis de tempo que o componente entrega ao CSS.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRO_SKIP_HINT, INTRO_SKIP_HINT_TOUCH } from '../../src/model/copy.ts';
import { INTRO, INTRO_REDUCED, SKIP_FADE_MS } from '../../src/model/intro.ts';
import type { Cue } from '../../src/model/sound.ts';
import { flightAnimation, wingAnimation } from '../../src/ui/intro/dragon-flight.ts';
import { Intro } from '../../src/ui/intro/Intro.tsx';
import { IntroBoundary } from '../../src/ui/intro/IntroBoundary.tsx';
import { SoundContext, type SoundApi } from '../../src/ui/sound-context.ts';

function fakeSound() {
  const played: Cue[] = [];
  let cuts = 0;
  const api: SoundApi = {
    play: (cue) => void played.push(cue),
    setEnabled: () => {},
    cut: () => void (cuts += 1),
  };
  return { api, played, cuts: () => cuts };
}

function mount(options: { reduced?: boolean } = {}) {
  const sound = fakeSound();
  const onDone = vi.fn();
  const rendered = render(
    <SoundContext value={sound.api}>
      <Intro reduced={options.reduced ?? false} onDone={onDone} />
    </SoundContext>,
  );
  const overlay = rendered.container.querySelector<HTMLElement>('[data-abertura]')!;
  return { ...rendered, sound, onDone, overlay };
}

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('<Intro />: a versão completa', () => {
  it('mostra a logo, as quatro cartas dos naipes, o Coringa e o título', () => {
    const { overlay } = mount();
    expect(overlay).toHaveAttribute('data-abertura', 'completa');
    expect(screen.getByRole('img', { name: 'LUSACAN productions' })).toBeInTheDocument();
    expect([...overlay.querySelectorAll('[data-naipe]')].map((card) => card.getAttribute('data-naipe'))).toEqual(['espadas', 'copas', 'ouros', 'paus']);
    expect(overlay.querySelector('.abertura-coringa svg')).not.toBeNull();
    expect(overlay.querySelector('.abertura-titulo')).toHaveTextContent('Jogo do Coringa');
  });

  it('a cena do jogo é enfeite: o leitor de tela não a lê (o título de verdade é o do menu)', () => {
    const { overlay } = mount();
    expect(overlay.querySelector('.abertura-tema')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('entrega ao CSS os instantes do modelo', () => {
    const { overlay } = mount();
    const time = (name: string) => overlay.style.getPropertyValue(name);
    expect(time('--t-aviso')).toBe(`${INTRO.hintAt}ms`);
    expect(time('--t-lua')).toBe(`${INTRO.logoAt}ms`);
    expect(time('--t-asas')).toBe(`${INTRO.wingsAt}ms`);
    expect(time('--t-nome')).toBe(`${INTRO.nameAt}ms`);
    expect(time('--t-logo-sai')).toBe(`${INTRO.logoOutAt}ms`);
    expect(time('--t-tema')).toBe(`${INTRO.themeAt}ms`);
    expect(time('--t-junta')).toBe(`${INTRO.gatherAt}ms`);
    expect(time('--t-vira')).toBe(`${INTRO.flipAt}ms`);
    expect(time('--t-titulo')).toBe(`${INTRO.titleAt}ms`);
    expect(time('--t-some')).toBe(`${INTRO.fadeAt}ms`);
    expect(time('--d-some')).toBe(`${INTRO.total - INTRO.fadeAt}ms`);
    expect(time('--d-sobe')).toBe(`${INTRO.cardRiseMs}ms`);
    const delays = [...overlay.querySelectorAll<HTMLElement>('[data-naipe]')].map((card) => card.style.getPropertyValue('--d'));
    expect(delays).toEqual(INTRO.cardDelays.map((delay) => `${delay}ms`));
  });

  it('termina sozinha no fim do tempo, uma vez só', () => {
    const { onDone } = mount();
    wait(INTRO.total - 1);
    expect(onDone).not.toHaveBeenCalled();
    wait(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    wait(10_000);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('toca o voo do dragão e a chamada do título nos instantes deles', () => {
    const { sound } = mount();
    wait(INTRO.logoCueAt - 1);
    expect(sound.played).toEqual([]);
    wait(1);
    expect(sound.played).toEqual(['abertura-logo']);
    wait(INTRO.titleCueAt - INTRO.logoCueAt - 1);
    expect(sound.played).toEqual(['abertura-logo']);
    wait(1);
    expect(sound.played).toEqual(['abertura-logo', 'abertura-titulo']);
  });
});

describe('<Intro />: o voo do dragão', () => {
  /** O jsdom não tem a Web Animations: um `animate` falso anota quem pediu o quê, e devolve uma animação que se deixa cancelar. */
  function stubAnimate() {
    const calls: { element: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions; canceled: boolean }[] = [];
    const animate = function (this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const call = { element: this, keyframes, options, canceled: false };
      calls.push(call);
      return { cancel: () => void (call.canceled = true) } as unknown as Animation;
    };
    Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true, writable: true });
    return calls;
  }

  afterEach(() => {
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it('na completa, o dragão inteiro voa e as duas asas batem, com as animações do voo, que só deixam o desenho ao fim', () => {
    const calls = stubAnimate();
    const { overlay } = mount();
    expect(calls).toHaveLength(3);
    const [flight, ...wings] = calls;
    expect(flight!.element).toBe(overlay.querySelector('[data-dragao-voo]'));
    expect(flight!.keyframes).toEqual(flightAnimation().keyframes);
    expect(flight!.options).toEqual({ delay: flightAnimation().delay, duration: flightAnimation().duration, fill: 'backwards' });
    expect(wings.map((call) => call.element.getAttribute('data-dragao-asa'))).toEqual(['esquerda', 'direita']);
    for (const wing of wings) {
      expect(wing.keyframes).toEqual(wingAnimation().keyframes);
      expect(wing.options).toEqual({ delay: wingAnimation().delay, duration: wingAnimation().duration, fill: 'backwards' });
    }
  });

  it('ao sair da tela, as animações do voo são canceladas', () => {
    const calls = stubAnimate();
    const { unmount } = mount();
    unmount();
    expect(calls.map((call) => call.canceled)).toEqual([true, true, true]);
  });

  it('com movimento reduzido, o dragão fica parado na pose', () => {
    const calls = stubAnimate();
    mount({ reduced: true });
    expect(calls).toEqual([]);
  });

  it('sem a Web Animations no navegador, o dragão fica parado na pose, sem erro', () => {
    const { overlay } = mount();
    expect(overlay.querySelector('[data-dragao-voo]')).not.toBeNull();
  });
});

describe('<Intro />: o aviso de pular', () => {
  it('é um botão discreto, com o texto das teclas, que já nasce com o foco', () => {
    mount();
    const hint = screen.getByRole('button', { name: INTRO_SKIP_HINT });
    expect(hint).toHaveFocus();
  });

  it('numa tela de toque, diz "Toque para pular"', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)', addEventListener() {}, removeEventListener() {} }));
    mount();
    expect(screen.getByRole('button', { name: INTRO_SKIP_HINT_TOUCH })).toBeInTheDocument();
  });
});

describe('<Intro />: pular', () => {
  it('um clique (ou toque) em qualquer ponto pula: esmaece depressa, corta o som e abre o menu', () => {
    const { overlay, onDone, sound } = mount();
    wait(800);
    fireEvent.click(overlay);
    expect(overlay).toHaveAttribute('data-saindo', 'true');
    expect(sound.cuts()).toBe(1);
    expect(onDone).not.toHaveBeenCalled();
    wait(SKIP_FADE_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it.each(['Enter', ' ', 'Escape', 'x'])('a tecla %j pula, e o navegador não a usa para mais nada', (name) => {
    const { onDone } = mount();
    wait(600);
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    act(() => void window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    wait(SKIP_FADE_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('um atalho (Ctrl+R) e uma tecla de modificador não pulam nem são engolidos', () => {
    const { overlay, onDone } = mount();
    const reload = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true, cancelable: true });
    const shift = new KeyboardEvent('keydown', { key: 'Shift', bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(reload);
      window.dispatchEvent(shift);
    });
    expect(reload.defaultPrevented).toBe(false);
    expect(overlay).not.toHaveAttribute('data-saindo');
    wait(SKIP_FADE_MS * 2);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('depois do pulo, nenhum som da abertura toca mais', () => {
    const { overlay, sound, onDone } = mount();
    wait(INTRO.logoCueAt);
    fireEvent.click(overlay);
    wait(INTRO.total);
    expect(sound.played).toEqual(['abertura-logo']);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('pular duas vezes é pular uma', () => {
    const { overlay, onDone, sound } = mount();
    fireEvent.click(overlay);
    fireEvent.click(overlay);
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    wait(INTRO.total);
    expect(sound.cuts()).toBe(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('com a abertura já esmaecendo para o menu, o pulo não faz nada (o menu chega no mesmo instante)', () => {
    const { overlay, onDone, sound } = mount();
    wait(INTRO.fadeAt);
    fireEvent.click(overlay);
    expect(overlay).not.toHaveAttribute('data-saindo');
    expect(sound.cuts()).toBe(0);
    wait(INTRO.total - INTRO.fadeAt);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('ao sair da tela, deixa de ouvir o teclado', () => {
    const { unmount, onDone } = mount();
    unmount();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    vi.advanceTimersByTime(INTRO.total);
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('<Intro />: com movimento reduzido', () => {
  it('é a versão curta: só a logo, sem a cena do jogo', () => {
    const { overlay } = mount({ reduced: true });
    expect(overlay).toHaveAttribute('data-abertura', 'curta');
    expect(screen.getByRole('img', { name: 'LUSACAN productions' })).toBeInTheDocument();
    expect(overlay.querySelector('.abertura-tema')).toBeNull();
    expect(overlay.style.getPropertyValue('--t-some')).toBe(`${INTRO_REDUCED.fadeAt}ms`);
    expect(overlay.style.getPropertyValue('--d-some')).toBe(`${INTRO_REDUCED.total - INTRO_REDUCED.fadeAt}ms`);
  });

  it('termina em menos de 2 s e só toca o baque das asas', () => {
    const { onDone, sound } = mount({ reduced: true });
    wait(INTRO_REDUCED.total - 1);
    expect(onDone).not.toHaveBeenCalled();
    wait(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(sound.played).toEqual(['abertura-logo-curta']);
  });

  it('também se pula', () => {
    const { overlay, onDone } = mount({ reduced: true });
    fireEvent.click(overlay);
    wait(SKIP_FADE_MS);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('<IntroBoundary />', () => {
  it('se a abertura quebrar ao desenhar, avisa uma vez e não desenha nada: o menu abre em vez de o app cair', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    function Broken(): never {
      throw new Error('a abertura quebrou');
    }
    const { container } = render(
      <IntroBoundary onError={onError}>
        <Broken />
      </IntroBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(onError).toHaveBeenCalledTimes(1);
    errors.mockRestore();
  });

  it('sem erro, desenha a abertura', () => {
    const onError = vi.fn();
    const { container } = render(
      <IntroBoundary onError={onError}>
        <Intro reduced onDone={() => {}} />
      </IntroBoundary>,
    );
    expect(container.querySelector('[data-abertura]')).not.toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
