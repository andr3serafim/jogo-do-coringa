import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App.tsx';

describe('<App />', () => {
  it('desenha o título do jogo', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Jogo do Coringa/ })).toBeInTheDocument();
  });
});
