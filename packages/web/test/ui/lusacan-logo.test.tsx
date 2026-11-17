// A logo "LUSACAN productions" (decisoes.md 2026-11-16 (5)): a versão do jogo (o componente, que a abertura anima) e os SVG de
// `src/assets/lusacan/`, que saem do jogo sozinhos. Os dois trazem os mesmos traçados (`lusacan-shapes.ts`).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LusacanLogo } from '../../src/ui/intro/LusacanLogo.tsx';
import { EYE, GOLD, INK, LOGO_BOX, PAPER, SYMBOL_BOX, TAG, WORD } from '../../src/ui/intro/lusacan-shapes.ts';

/** O texto de um SVG de `src/assets/lusacan/`, lido do disco: o jogo não importa esses arquivos (a abertura desenha a logo pelo componente). */
const asset = (name: string): string => readFileSync(resolve(import.meta.dirname, '../../src/assets/lusacan', `${name}.svg`), 'utf8');
const logoOnDark = asset('lusacan-logo-fundo-escuro');
const logoOnLight = asset('lusacan-logo-fundo-claro');
const symbolOnDark = asset('lusacan-simbolo-fundo-escuro');
const symbolOnLight = asset('lusacan-simbolo-fundo-claro');

const EYE_PATHS = [EYE.pupil, EYE.hood, EYE.lower];
const LETTER_PATHS = [...WORD, ...TAG].map((glyph) => glyph.d);

const FILES = [
  { name: 'a logo para fundo escuro', svg: logoOnDark, full: true, line: PAPER },
  { name: 'a logo para fundo claro', svg: logoOnLight, full: true, line: INK },
  { name: 'o símbolo para fundo escuro', svg: symbolOnDark, full: false, line: PAPER },
  { name: 'o símbolo para fundo claro', svg: symbolOnLight, full: false, line: INK },
];

describe('<LusacanLogo />', () => {
  it('é uma imagem com o nome da produtora', () => {
    render(<LusacanLogo />);
    expect(screen.getByRole('img', { name: 'LUSACAN productions' })).toBeInTheDocument();
  });

  it('desenha o olho (a lua, a fenda, o capuz, a pálpebra de baixo), as sete letras do nome e as onze de "PRODUCTIONS"', () => {
    const { container } = render(<LusacanLogo />);
    const drawn = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));
    for (const d of [...EYE_PATHS, ...LETTER_PATHS]) expect(drawn).toContain(d);
    expect(container.querySelectorAll('.lusacan-letra')).toHaveLength(7);
    expect(container.querySelectorAll('.lusacan-tag path')).toHaveLength(11);
    const iris = container.querySelector('circle.lusacan-iris');
    expect(iris).toHaveAttribute('r', String(EYE.iris.r));
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', `0 0 ${LOGO_BOX.width} ${LOGO_BOX.height}`);
  });

  it('cada letra do nome leva a sua posição na fila, para a entrada em sequência', () => {
    const { container } = render(<LusacanLogo />);
    const order = [...container.querySelectorAll<SVGPathElement>('.lusacan-letra')].map((path) => path.style.getPropertyValue('--i'));
    expect(order).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });
});

describe.each(FILES)('$name (o SVG de assets)', ({ svg, full, line }) => {
  it('traz os mesmos traçados do componente', () => {
    for (const d of EYE_PATHS) expect(svg).toContain(`d="${d}"`);
    for (const d of LETTER_PATHS) {
      if (full) expect(svg).toContain(`d="${d}"`);
      else expect(svg).not.toContain(`d="${d}"`);
    }
    const box = full ? LOGO_BOX : SYMBOL_BOX;
    expect(svg).toContain(`viewBox="0 0 ${box.width} ${box.height}"`);
  });

  it('usa as cores do cordel: a lua de ouro, a fenda de tinta e o traço da versão', () => {
    expect(svg).toContain(`fill="${GOLD}"`);
    expect(svg).toContain(`<path d="${EYE.pupil}" fill="${INK}"/>`);
    expect(svg).toContain(`<path d="${EYE.hood}" fill="${line}"/>`);
  });

  it('abre fora do jogo: tem nome, não depende de fonte, de folha de estilo, de classe nem de arquivo de fora', () => {
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toMatch(/<title id="t">LUSACAN/);
    for (const forbidden of ['<text', 'font-', '<style', 'class=', 'href', '<script', '<image', 'url(']) expect(svg).not.toContain(forbidden);
  });
});
