// O controle discreto do tema (decisoes.md 2026-11-18 (5)): no canto do Início, uma bolinha da outra cor, num alvo de 44 px. É um botão de
// alternar com o nome fixo ("Fundo verde") e o estado no `aria-pressed` (ligado é o verde).
import { MENU_THEME_LABEL } from '../../model/copy.ts';
import { useMenuTheme } from './menu-theme.tsx';

export function ThemeToggle() {
  const { theme, setTheme } = useMenuTheme();
  const green = theme === 'green';
  return (
    <button
      type="button"
      className="menu-tema"
      aria-label={MENU_THEME_LABEL}
      aria-pressed={green}
      title={MENU_THEME_LABEL}
      onClick={() => setTheme(green ? 'pink' : 'green')}
    >
      <span aria-hidden="true" />
    </button>
  );
}
