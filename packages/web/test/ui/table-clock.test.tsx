// O relógio da mesa (bloco C dos pontos do playtest): um intervalo só para todas as auras que fervem na mesa, e um agendador só para os raios, com no
// máximo 3 por segundo somando a mesa inteira. Timers falsos: conta-se o que o navegador agendaria.
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AURA_BOIL_MS, BOLT_GAP_MS } from '../../src/ui/anim/aura.ts';
import { useAuraBoil, useBoltSlot } from '../../src/ui/anim/table-clock.ts';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function Boiler({ active, log }: { active: boolean; log: number[] }) {
  useAuraBoil(active, (frame) => log.push(frame));
  return null;
}

function Bolter({ active, log, name }: { active: boolean; log: string[]; name: string }) {
  useBoltSlot(active, () => log.push(name));
  return null;
}

describe('o relógio das auras da mesa', () => {
  it('três auras ativas usam um intervalo só, e o quadro de cada uma anda a cada AURA_BOIL_MS', () => {
    const spy = vi.spyOn(window, 'setInterval');
    const logs = [[], [], []] as number[][];
    render(
      <>
        {logs.map((log, i) => (
          <Boiler key={i} active log={log} />
        ))}
      </>,
    );
    expect(spy.mock.calls.filter(([, ms]) => ms === AURA_BOIL_MS)).toHaveLength(1);
    advance(AURA_BOIL_MS * 2);
    for (const log of logs) expect(log).toHaveLength(2);
    expect(logs[0]![1]).toBe((logs[0]![0]! + 1) % 4);
    spy.mockRestore();
  });

  it('a aura inativa não recebe quadro, e sem assinante ativo nenhum intervalo fica vivo', () => {
    const log: number[] = [];
    const view = render(<Boiler active={false} log={log} />);
    expect(vi.getTimerCount()).toBe(0);
    advance(AURA_BOIL_MS * 3);
    expect(log).toEqual([]);
    view.rerender(<Boiler active log={log} />);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('o agendador dos raios da mesa', () => {
  it('os raios de dois assinantes saem alternados, um a cada BOLT_GAP_MS: no máximo 3 por segundo na mesa inteira', () => {
    const log: string[] = [];
    render(
      <>
        <Bolter active log={log} name="a" />
        <Bolter active log={log} name="b" />
      </>,
    );
    advance(1_000);
    expect(log.length).toBeGreaterThanOrEqual(2);
    expect(log.length).toBeLessThanOrEqual(3);
    expect(log[0]).not.toBe(log[1]);
    advance(BOLT_GAP_MS * 6);
    expect(log.filter((name) => name === 'a').length - log.filter((name) => name === 'b').length).toBeLessThanOrEqual(1);
  });

  it('o assinante inativo não recebe raio, e sem ativo nenhum intervalo fica vivo', () => {
    const log: string[] = [];
    const view = render(<Bolter active={false} log={log} name="a" />);
    advance(BOLT_GAP_MS * 4);
    expect(log).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    view.unmount();
  });
});
