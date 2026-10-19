import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { navigate, parseRoute, useRoute } from '../../src/app/router.ts';

describe('parseRoute', () => {
  it.each([
    ['/', { name: 'home' }],
    ['', { name: 'home' }],
    ['/treino', { name: 'training' }],
    ['/treino/', { name: 'training' }],
    ['/s/7kq2md', { name: 'room', code: '7KQ2MD' }],
    ['/s/7KQ2MD/', { name: 'room', code: '7KQ2MD' }],
    ['/s/%37KQ2MD', { name: 'room', code: '7KQ2MD' }],
    ['/s/7KQ2M0', { name: 'room', code: null }],
    ['/s/oi', { name: 'room', code: null }],
    ['/s/%E0%A4%A', { name: 'room', code: null }],
    ['/s', { name: 'notFound' }],
    ['/s/', { name: 'notFound' }],
    ['/s/ABC234/mais', { name: 'notFound' }],
    ['/outra', { name: 'notFound' }],
  ])('%s', (path, route) => {
    expect(parseRoute(path)).toEqual(route);
  });
});

function Probe() {
  const route = useRoute();
  return <p>{JSON.stringify(route)}</p>;
}

describe('useRoute e navigate', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('segue o navigate e o popstate, sem redesenhar em laço', () => {
    render(<Probe />);
    expect(screen.getByText('{"name":"home"}')).toBeInTheDocument();
    act(() => navigate('/s/abc234'));
    expect(window.location.pathname).toBe('/s/abc234');
    expect(screen.getByText('{"name":"room","code":"ABC234"}')).toBeInTheDocument();
    act(() => {
      window.history.replaceState(null, '', '/treino');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByText('{"name":"training"}')).toBeInTheDocument();
  });
});
