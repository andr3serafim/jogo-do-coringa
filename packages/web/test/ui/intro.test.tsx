// A abertura (decisoes.md 2026-11-16 (5); sem a logo LUSACAN desde 2026-11-19 (6)): a intro do jogo e o menu. Aqui: o que ela mostra em cada versão, quando termina, o
// que pula (clique, toque, teclas), o som nos instantes dele e o pulo que corta o som. O relógio é o falso do Vitest; o jsdom não anima
// o CSS, então o que a pessoa vê em cada instante é conferido pelas variáveis de tempo que o componente entrega ao CSS.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRO_SKIP_HINT, INTRO_SKIP_HINT_TOUCH } from '../../src/model/copy.ts';
import { INTRO, INTRO_REDUCED, SKIP_FADE_MS } from '../../src/model/intro.ts';
import type { Cue } from '../../src/model/sound.ts';
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
  it('mostra as quatro cartas dos naipes e o Coringa; sem a logo, o título, a aura, o anel e as faíscas (2026-11-25 (2))', () => {
    const { overlay } = mount();
    expect(overlay).toHaveAttribute('data-abertura', 'completa');
    expect(screen.queryByRole('img', { name: /LUSACAN/ })).toBeNull();
    expect([...overlay.querySelectorAll('[data-naipe]')].map((card) => card.getAttribute('data-naipe'))).toEqual(['espadas', 'copas', 'ouros', 'paus']);
    expect(overlay.querySelector('.abertura-coringa svg')).not.toBeNull();
    for (const gone of ['.abertura-titulo', '.abertura-aura', '.abertura-onda', '.abertura-faisca']) expect(overlay.querySelector(gone)).toBeNull();
    expect(overlay).not.toHaveTextContent('Jogo do Coringa');
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
    expect(time('--t-tema')).toBe(`${INTRO.themeAt}ms`);
    expect(time('--t-junta')).toBe(`${INTRO.gatherAt}ms`);
    expect(time('--t-vira')).toBe(`${INTRO.flipAt}ms`);
    expect(time('--t-entra')).toBe(`${INTRO.coringaInAt}ms`);
    expect(time('--t-pousa')).toBe(`${INTRO.revealAt}ms`);
    expect(time('--t-titulo')).toBe('');
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

  it('toca a pista da chamada no instante dela (a chamada cai na virada), e nada antes', () => {
    const { sound } = mount();
    wait(INTRO.revealCueAt - 1);
    expect(sound.played).toEqual([]);
    wait(1);
    expect(sound.played).toEqual(['abertura-titulo']);
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
    wait(INTRO.revealCueAt);
    fireEvent.click(overlay);
    wait(INTRO.total);
    expect(sound.played).toEqual(['abertura-titulo']);
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
  it('é a versão curta: o Coringa parado, sem as cartas que sobem, sem o título nem as faíscas', () => {
    const { overlay } = mount({ reduced: true });
    expect(overlay).toHaveAttribute('data-abertura', 'curta');
    expect(overlay.querySelector('.abertura-coringa svg')).not.toBeNull();
    expect(overlay.querySelector('.abertura-titulo')).toBeNull();
    expect(overlay.querySelector('[data-naipe]')).toBeNull();
    expect(overlay.querySelector('.abertura-faisca')).toBeNull();
    expect(overlay.style.getPropertyValue('--t-titulo')).toBe('');
    expect(overlay.style.getPropertyValue('--t-some')).toBe(`${INTRO_REDUCED.fadeAt}ms`);
    expect(overlay.style.getPropertyValue('--d-some')).toBe(`${INTRO_REDUCED.total - INTRO_REDUCED.fadeAt}ms`);
  });

  it('termina em menos de 2 s, muda', () => {
    const { onDone, sound } = mount({ reduced: true });
    wait(INTRO_REDUCED.total - 1);
    expect(onDone).not.toHaveBeenCalled();
    wait(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(sound.played).toEqual([]);
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
