// A logo "LUSACAN productions" (decisoes.md 2026-11-17 (3)): a versão do jogo (o componente, que a abertura anima) e os SVG de
// `src/assets/lusacan/`, que saem do jogo sozinhos. Os dois saem do mesmo desenho (`lusacan-shapes.ts`): o componente o desenha, e os SVG
// têm de ser, byte a byte, o que o `scripts/gerar-logo-lusacan.ts` grava hoje (quem muda o desenho roda o gerador).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { logoFiles } from '../../scripts/gerar-logo-lusacan.ts';
import { LusacanLogo } from '../../src/ui/intro/LusacanLogo.tsx';
import { BODY, LOGO_BOX, SYMBOL_BOX, TAG, TAIL, WING, WORD, flourishPath } from '../../src/ui/intro/lusacan-shapes.ts';

/** O texto de um SVG de `src/assets/lusacan/`, lido do disco: o jogo não importa esses arquivos (a abertura desenha a logo pelo componente). */
const asset = (name: string): string => readFileSync(resolve(import.meta.dirname, '../../src/assets/lusacan', name), 'utf8');

const DRAGON_PATHS = [WING.membrane, WING.bones, WING.veins, BODY.trunk, BODY.horns, BODY.spikes, BODY.belly, TAIL];
const LETTER_PATHS = [...WORD.glyphs, ...TAG.glyphs].map((glyph) => glyph.d);

describe('<LusacanLogo />', () => {
  it('é uma imagem com o nome da produtora', () => {
    render(<LusacanLogo />);
    expect(screen.getByRole('img', { name: 'LUSACAN productions' })).toBeInTheDocument();
  });

  it('desenha a lua, o dragão (as duas asas, o corpo, a cauda), as letras do nome e de "PRODUCTIONS" e os filetes', () => {
    const { container } = render(<LusacanLogo />);
    const drawn = [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));
    for (const d of [...DRAGON_PATHS, ...LETTER_PATHS, flourishPath()]) expect(drawn).toContain(d);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', `0 0 ${LOGO_BOX.width} ${LOGO_BOX.height}`);
    expect(container.querySelectorAll('.lusacan-lua circle').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('.lusacan-letra')).toHaveLength(7);
    expect(container.querySelectorAll('.lusacan-tag path')).toHaveLength(11);
  });

  it('o dragão se move por peças: o voo no grupo do corpo, e cada asa no seu grupo, com o pivô no ombro', () => {
    const { container } = render(<LusacanLogo />);
    const flight = container.querySelector('[data-dragao-voo]')!;
    expect(flight.getAttribute('transform')).toBeNull();
    const wings = [...flight.querySelectorAll('[data-dragao-asa]')];
    expect(wings.map((wing) => wing.getAttribute('data-dragao-asa'))).toEqual(['esquerda', 'direita']);
    // a peça que se move não tem `transform` (a animação o trocaria); quem a põe no ombro é o grupo de fora
    for (const wing of wings) expect(wing.getAttribute('transform')).toBeNull();
    expect(wings[1]!.parentElement!.getAttribute('transform')).toContain('scale(-1 1)');
  });

  it('os veios de raio e o olho têm classe própria, para acenderem quando as asas abrem', () => {
    const { container } = render(<LusacanLogo />);
    expect(container.querySelectorAll('.lusacan-veios')).toHaveLength(2);
    expect(container.querySelector('.lusacan-olho')).not.toBeNull();
  });

  it('cada letra do nome leva a sua posição na fila, para a entrada em sequência', () => {
    const { container } = render(<LusacanLogo />);
    const order = [...container.querySelectorAll<SVGPathElement>('.lusacan-letra')].map((path) => path.style.getPropertyValue('--i'));
    expect(order).toEqual(['0', '1', '2', '3', '4', '5', '6']);
  });
});

describe('os SVG de src/assets/lusacan/', () => {
  const files = Object.entries(logoFiles());

  it('são quatro: o conjunto e o símbolo, para fundo escuro e claro', () => {
    expect(files.map(([name]) => name).sort()).toEqual([
      'lusacan-logo-fundo-claro.svg',
      'lusacan-logo-fundo-escuro.svg',
      'lusacan-simbolo-fundo-claro.svg',
      'lusacan-simbolo-fundo-escuro.svg',
    ]);
  });

  it.each(files)('%s é o que o gerador grava hoje (rode `pnpm --filter @coringa/web logo` depois de mudar o desenho)', (name, content) => {
    expect(asset(name)).toBe(content);
  });

  it.each(files)('%s traz o dragão; só o conjunto traz as letras e os filetes', (name, content) => {
    const full = name.includes('-logo-');
    for (const d of [WING.membrane, BODY.trunk, BODY.horns, TAIL]) expect(content).toContain(`d="${d}"`);
    for (const d of [...LETTER_PATHS, flourishPath()]) {
      if (full) expect(content).toContain(`d="${d}"`);
      else expect(content).not.toContain(`d="${d}"`);
    }
    const box = full ? `0 0 ${LOGO_BOX.width} ${LOGO_BOX.height}` : `${SYMBOL_BOX.x} ${SYMBOL_BOX.y} ${SYMBOL_BOX.width} ${SYMBOL_BOX.height}`;
    expect(content).toContain(`viewBox="${box}"`);
  });

  it.each(files)('%s abre fora do jogo: tem nome e não depende de fonte, folha de estilo, classe nem arquivo de fora', (_, content) => {
    expect(content).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(content).toMatch(/<title id="lusacan-t">LUSACAN/);
    for (const forbidden of ['<text', 'font-', '<style', 'class=', 'href', '<script', '<image']) expect(content).not.toContain(forbidden);
    // os únicos `url(` são os degradês do próprio arquivo
    for (const reference of content.match(/url\([^)]*\)/g) ?? []) expect(reference).toMatch(/^url\(#lusacan-[a-z]+\)$/);
  });
});
