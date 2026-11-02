// As cenas do Reflect (sub-projeto 6 §7.5): o espelho que se forma, o cometa que volta dele e os dois espelhos que trincam. No jsdom não
// há Web Animations nem layout: a caixa é falsa, e os testes conferem o que existe e quando (timers falsos).
import type { GameEvent, PlayerId } from '@coringa/engine';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline, RARE_SCENE_MS } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import type { SceneProps } from '../../src/ui/anim/scenes-loader.ts';
import { ReflectCanceled } from '../../src/ui/scenes/ReflectCanceled.tsx';
import { ReflectPlayed } from '../../src/ui/scenes/ReflectPlayed.tsx';
import { ReflectTriggered } from '../../src/ui/scenes/ReflectTriggered.tsx';

const P = SCENE_MOMENTS.REFLECT_PLAYED;
const T = SCENE_MOMENTS.REFLECT_TRIGGERED;
const C = SCENE_MOMENTS.REFLECT_CANCELED;
const MAX_PARTICLES = 60;

const played = (player: PlayerId): GameEvent => ({
  type: 'ReflectPlayed',
  player,
  reflect: { k: { id: 'k', kind: 'K', suit: 'copas' }, j: { id: 'j', kind: 'J', suit: 'copas' }, q: { id: 'q', kind: 'Q', suit: 'copas' } },
  against: 'ATTACK',
});

/** A caixa falsa: o p1 embaixo, o p2 em cima, e as zonas medidas guardadas em `asked`. */
function fakeBox(asked: string[] = [], zone = true): SceneBox {
  return {
    band: { x: 0, y: 96, w: 1000, h: 500 },
    hudBottom: 96,
    portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
    graveyard: () => null,
    reflectZone: (player) => {
      asked.push(player);
      return zone ? { x: 800, y: 500, w: 40, h: 40 } : null;
    },
    row: (player) => ({
      rect: player === 'p1' ? { x: 100, y: 400, w: 400, h: 100 } : { x: 100, y: 120, w: 400, h: 100 },
      slots: [],
      field: player === 'p1' ? { x: 0, y: 340, w: 1000, h: 240 } : { x: 0, y: 100, w: 1000, h: 240 },
    }),
  };
}

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

function show(Scene: (props: SceneProps) => React.ReactNode, event: GameEvent, { me = 'p1', reduced = false, box = fakeBox(), hitLanded = false }: { me?: PlayerId; reduced?: boolean; box?: SceneBox; hitLanded?: boolean } = {}) {
  const [beat] = buildTimeline([event], { mode: 'live', reducedMotion: reduced, decisionPending: false });
  return render(
    <div data-palco>
      <div data-campos />
      <Scene beat={beat!} names={roomNames(me, [])} reduced={reduced} me={me} hitLanded={hitLanded} box={box} field={null} />
    </div>,
  );
}

const q = (selector: string) => document.querySelector<HTMLElement>(selector);
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

/** O maior número de partículas vivas ao longo de `ms`. */
function peakParticles(ms: number): number {
  let peak = 0;
  for (let t = 0; t < ms; t += 20) {
    advance(20);
    peak = Math.max(peak, all('[data-particula]').length);
  }
  return peak;
}

describe('o Reflect jogado: o espelho se forma', () => {
  it('as três cópias saem uma a uma, K, J e Q', () => {
    show(ReflectPlayed, played('p1'));
    advance(P.cardsAt[0]);
    expect(all('[data-carta-cena]').map((c) => c.textContent)).toEqual(['K']);
    advance(P.cardsAt[1] - P.cardsAt[0] - 1);
    expect(all('[data-carta-cena]')).toHaveLength(1);
    advance(1);
    expect(all('[data-carta-cena]').map((c) => c.textContent)).toEqual(['K', 'J']);
    advance(P.cardsAt[2] - P.cardsAt[1]);
    expect(all('[data-carta-cena]').map((c) => c.textContent)).toEqual(['K', 'J', 'Q']);
  });

  it('o espelho aparece no instante dele, com faíscas nas pontas', () => {
    show(ReflectPlayed, played('p1'));
    advance(P.mirrorAt - 1);
    expect(q('[data-espelho]')).toBeNull();
    expect(all('[data-particula]')).toHaveLength(0);
    advance(1);
    expect(q('[data-espelho]')).not.toBeNull();
    expect(all('[data-particula]').length).toBeGreaterThan(0);
  });

  it('encolhe até a zona do dono, no instante dele', () => {
    const asked: string[] = [];
    show(ReflectPlayed, played('p2'), { box: fakeBox(asked) });
    advance(P.shrinkAt - 1);
    expect(q('[data-espelho]')).not.toHaveAttribute('data-encolhendo');
    expect(asked).toEqual([]);
    advance(1);
    expect(q('[data-espelho]')).toHaveAttribute('data-encolhendo');
    expect(asked).toEqual(['p2']);
  });

  it('sem a zona medida, ele só some, sem erro', () => {
    show(ReflectPlayed, played('p1'), { box: fakeBox([], false) });
    advance(RARE_SCENE_MS.REFLECT_PLAYED);
    expect(q('[data-espelho]')).toHaveAttribute('data-encolhendo');
  });

  it('fica no campo de quem jogou: o seu embaixo, o do Bot em cima', () => {
    const top = (owner: PlayerId) => {
      const view = show(ReflectPlayed, played(owner));
      advance(P.mirrorAt);
      const value = Number.parseFloat(q('[data-espelho]')!.style.top);
      view.unmount();
      return value;
    };
    expect(top('p1')).toBeGreaterThan(top('p2'));
  });

  it('não carimba nome: o nome é da batida do cometa', () => {
    show(ReflectPlayed, played('p1'));
    advance(RARE_SCENE_MS.REFLECT_PLAYED);
    expect(q('[data-carimbo]')).toBeNull();
  });

  it('as partículas ficam dentro do limite, e somem sozinhas', () => {
    show(ReflectPlayed, played('p1'));
    expect(peakParticles(RARE_SCENE_MS.REFLECT_PLAYED)).toBeLessThanOrEqual(MAX_PARTICLES);
    advance(1_000);
    expect(all('[data-particula]')).toHaveLength(0);
  });

  it('com movimento reduzido: as peças aparecem nos mesmos instantes, sem voo nem partícula', () => {
    show(ReflectPlayed, played('p1'), { reduced: true });
    advance(P.mirrorAt);
    expect(all('[data-carta-cena]')).toHaveLength(3);
    expect(q('[data-voo]')).toBeNull();
    expect(q('[data-espelho]')).not.toBeNull();
    expect(peakParticles(RARE_SCENE_MS.REFLECT_PLAYED)).toBe(0);
  });
});

const triggered = (owner: PlayerId, damage = 40): GameEvent => ({ type: 'ReflectTriggered', owner, attacker: owner === 'p1' ? 'p2' : 'p1', damage });

describe('o ataque que bate no espelho: o cometa', () => {
  it('a esfera junta energia até o cometa partir', () => {
    show(ReflectTriggered, triggered('p1'));
    advance(0);
    expect(q('[data-carga]')).not.toBeNull();
    expect(q('[data-cometa]')).toBeNull();
    advance(T.launchAt - 1);
    expect(q('[data-carga]')).not.toBeNull();
    advance(1);
    expect(q('[data-carga]')).toBeNull();
    expect(q('[data-cometa]')).not.toBeNull();
  });

  it('o espelho e as três cópias já estão lá, porque o espelho veio da zona', () => {
    show(ReflectTriggered, triggered('p1'));
    advance(0);
    expect(q('[data-espelho]')).not.toBeNull();
    expect(all('[data-carta-cena]').map((c) => c.textContent)).toEqual(['K', 'J', 'Q']);
  });

  it('ele volta dourado na batida no espelho, e não antes', () => {
    show(ReflectTriggered, triggered('p1'));
    advance(T.mirrorHitAt - 1);
    expect(q('[data-cometa]')).not.toHaveAttribute('data-volta');
    advance(1);
    expect(q('[data-cometa]')).toHaveAttribute('data-volta');
  });

  it('na volta ao retrato: os cacos, o nome, e o espelho some', () => {
    show(ReflectTriggered, triggered('p1'));
    advance(T.returnHitAt - 1);
    expect(q('[data-cacos]')).toBeNull();
    expect(q('[data-carimbo]')).toBeNull();
    advance(1);
    expect(q('[data-cacos]')).not.toBeNull();
    expect(q('[data-carimbo="REFLECT_TRIGGERED"]')).toHaveTextContent('REFLECT');
    expect(q('[data-espelho]')).toBeNull();
  });

  it('o número é o do dano devolvido, só depois de a volta acertar, perto do retrato de quem atacou', () => {
    const before = show(ReflectTriggered, triggered('p2', 37));
    expect(q('[data-dano]')).toBeNull();
    before.unmount();
    show(ReflectTriggered, triggered('p2', 37), { hitLanded: true });
    expect(q('[data-dano]')).toHaveTextContent('−37');
    // Quem atacou é você: o número fica do seu lado, à esquerda.
    expect(q('[data-dano]')!.style.left).not.toBe('');
  });

  it('o seu Reflect, e o do Bot: o espelho fica no campo do dono', () => {
    const top = (owner: PlayerId) => {
      const view = show(ReflectTriggered, triggered(owner));
      advance(0);
      const value = Number.parseFloat(q('[data-espelho]')!.style.top);
      view.unmount();
      return value;
    };
    expect(top('p1')).toBeGreaterThan(top('p2'));
  });

  it('sem dano de volta: o cometa se desfaz no espelho, sem voltar e sem número; o espelho quebra mesmo assim', () => {
    show(ReflectTriggered, triggered('p1', 0), { hitLanded: true });
    advance(T.mirrorHitAt);
    expect(q('[data-cometa]')).not.toHaveAttribute('data-volta');
    expect(q('[data-cometa]')).toHaveAttribute('data-desfeito');
    advance(T.returnHitAt - T.mirrorHitAt);
    expect(q('[data-cacos]')).not.toBeNull();
    expect(q('[data-dano]')).toBeNull();
    expect(q('[data-carimbo="REFLECT_TRIGGERED"]')).not.toBeNull();
  });

  it('as partículas ficam dentro do limite, e somem sozinhas', () => {
    show(ReflectTriggered, triggered('p1'));
    expect(peakParticles(RARE_SCENE_MS.REFLECT_TRIGGERED)).toBeLessThanOrEqual(MAX_PARTICLES);
    advance(2_000);
    expect(all('[data-particula]')).toHaveLength(0);
  });

  it('com movimento reduzido: sem voo nem partícula, e o nome nos mesmos instantes', () => {
    show(ReflectTriggered, triggered('p1'), { reduced: true });
    advance(T.launchAt);
    expect(q('[data-voo]')).toBeNull();
    expect(q('[data-cometa]')).not.toBeNull();
    advance(T.mirrorHitAt - T.launchAt);
    expect(q('[data-cometa]')).toHaveAttribute('data-volta');
    expect(all('[data-particula]')).toHaveLength(0);
    advance(T.returnHitAt - T.mirrorHitAt);
    expect(q('[data-carimbo="REFLECT_TRIGGERED"]')).not.toBeNull();
    expect(q('[data-espelho]')).toBeNull();
    expect(all('[data-particula]')).toHaveLength(0);
  });
});

describe('Reflect contra Reflect: os dois espelhos trincam', () => {
  const canceled: GameEvent = { type: 'ReflectCanceled', player: 'p2', owner: 'p1' };

  it('dois espelhos, um em cada campo, sem cometa nem nome', () => {
    show(ReflectCanceled, canceled);
    advance(0);
    const mirrors = all('[data-espelho]');
    expect(mirrors).toHaveLength(2);
    expect(mirrors[0]!.style.top).not.toBe(mirrors[1]!.style.top);
    advance(RARE_SCENE_MS.REFLECT_CANCELED);
    expect(q('[data-cometa]')).toBeNull();
    expect(q('[data-carimbo]')).toBeNull();
  });

  it('trincam no instante deles, e somem depois', () => {
    show(ReflectCanceled, canceled);
    advance(C.crackAt - 1);
    expect(q('[data-trinca]')).toBeNull();
    advance(1);
    expect(all('[data-trinca]')).toHaveLength(2);
    advance(C.fadeAt - C.crackAt - 1);
    expect(q('[data-espelho][data-somindo]')).toBeNull();
    advance(1);
    expect(all('[data-espelho][data-somindo]')).toHaveLength(2);
  });

  it('com movimento reduzido: trincam nos mesmos instantes, sem partícula', () => {
    show(ReflectCanceled, canceled, { reduced: true });
    advance(C.crackAt);
    expect(all('[data-trinca]')).toHaveLength(2);
    expect(all('[data-particula]')).toHaveLength(0);
  });
});
