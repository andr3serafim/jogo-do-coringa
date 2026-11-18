// As peças do menu no Folheto (spec 2026-11-18-menus-folheto-design.md §4, §6): a inclinação da mini carta (a conta da mão do jogo), o
// movimento reduzido e o campo.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, savePrefs } from '../../src/model/storage.ts';
import { MenuThemeProvider } from '../../src/ui/menu/menu-theme.tsx';
import { MenuScreen } from '../../src/ui/menu/MenuScreen.tsx';
import { MenuItem } from '../../src/ui/menu/MiniCard.tsx';
import { MenuField } from '../../src/ui/menu/parts.tsx';
import { memoryStore } from './support.tsx';

function item(reduceMotion = false) {
  const store = memoryStore();
  if (reduceMotion) savePrefs(store, { ...DEFAULT_PREFS, reduceMotion: true });
  render(
    <MenuThemeProvider store={store}>
      <MenuScreen>
        <MenuItem to="/jogar" kind="online" name="Jogar online" line="Criar sala ou entrar numa sala" index={0} />
      </MenuScreen>
    </MenuThemeProvider>,
  );
  const link = screen.getByRole('link', { name: /^Jogar online/ });
  return { link, tilt: link.querySelector<HTMLElement>('[data-inclina]')! };
}

describe('a mini carta da linha do menu', () => {
  it('sob o mouse, inclina em 3D (a perspectiva da mão do jogo) com a sombra; ao sair, volta reta', () => {
    const { link, tilt } = item();
    fireEvent.pointerMove(link, { pointerType: 'mouse', clientX: 10, clientY: 10 });
    expect(tilt.style.transform).toMatch(/^perspective\(600px\) rotateX\(.+deg\) rotateY\(.+deg\)$/);
    expect(tilt.style.filter).toMatch(/^drop-shadow/);
    fireEvent.pointerLeave(link, { pointerType: 'mouse' });
    expect(tilt.style.transform).toBe('');
    expect(tilt.style.filter).toBe('');
  });

  it('no toque, sobe 8 px e inclina; ao soltar, volta', () => {
    const { link, tilt } = item();
    fireEvent.pointerDown(link, { pointerType: 'touch' });
    expect(tilt.style.transform).toMatch(/^translateY\(-8px\) perspective\(600px\) rotateY\(.+deg\)$/);
    fireEvent.pointerUp(link, { pointerType: 'touch' });
    expect(tilt.style.transform).toBe('');
  });

  it('com "Reduzir animações" ligada no menu, nada inclina e a raiz pede menos movimento', () => {
    const { link, tilt } = item(true);
    expect(screen.getByRole('main')).toHaveAttribute('data-movimento-reduzido');
    fireEvent.pointerMove(link, { pointerType: 'mouse', clientX: 10, clientY: 10 });
    fireEvent.pointerDown(link, { pointerType: 'touch' });
    expect(tilt.style.transform).toBe('');
  });
});

describe('o campo do menu', () => {
  it('liga o rótulo, a dica e o erro, e tem 16 px', () => {
    render(<MenuField label="Seu apelido" hint="De 1 a 20 caracteres." error="Apelido inválido" />);
    const field = screen.getByLabelText('Seu apelido');
    expect(field).toHaveAccessibleDescription('De 1 a 20 caracteres. Apelido inválido');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveClass('text-base');
  });
});
