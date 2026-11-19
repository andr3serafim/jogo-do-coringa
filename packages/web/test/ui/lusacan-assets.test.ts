// A logo "LUSACAN productions" (decisoes.md 2026-11-17 (3)): os SVG de `src/assets/lusacan/`, para uso fora do jogo (a abertura não a
// mostra mais, 2026-11-19 (6)). Saem do desenho de `lusacan-shapes.ts` e têm de ser, byte a byte, o que o `scripts/gerar-logo-lusacan.ts`
// grava hoje (quem muda o desenho roda o gerador).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { logoFiles } from '../../scripts/gerar-logo-lusacan.ts';
import { BODY, LOGO_BOX, SYMBOL_BOX, TAG, TAIL, WING, WORD, flourishPath } from '../../scripts/lusacan-shapes.ts';

/** O texto de um SVG de `src/assets/lusacan/`, lido do disco: o jogo não importa esses arquivos. */
const asset = (name: string): string => readFileSync(resolve(import.meta.dirname, '../../src/assets/lusacan', name), 'utf8');

const LETTER_PATHS = [...WORD.glyphs, ...TAG.glyphs].map((glyph) => glyph.d);

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
