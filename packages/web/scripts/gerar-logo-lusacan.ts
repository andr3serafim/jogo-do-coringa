/// <reference types="node" />
/**
 * Grava os SVG da logo "LUSACAN productions" em `src/assets/lusacan/` a partir do `src/ui/intro/lusacan-shapes.ts`, a fonte única do
 * desenho (decisoes.md 2026-11-17 (3)). Roda no Node puro: `pnpm --filter @coringa/web logo`. Quem muda o desenho muda o módulo e roda
 * isto; o teste `lusacan-logo.test.tsx` reprova os SVG que não saíram daqui.
 *
 * Os arquivos saem do jogo sozinhos: sem fonte (as letras já são contornos), sem folha de estilo, sem classe e sem arquivo de fora; os
 * degradês moram no `<defs>` do próprio arquivo.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BODY,
  CRATERS,
  DRAGON,
  LOGO_BOX,
  MOON,
  PALETTES,
  SHOULDER,
  SYMBOL_BOX,
  TAG,
  TAIL,
  WING,
  WORD,
  flourishPath,
  type LogoPalette,
  type TextLine,
} from '../src/ui/intro/lusacan-shapes.ts';

const OUT = join(import.meta.dirname, '..', 'src', 'assets', 'lusacan');
const ABOUT = 'Logo original do projeto Jogo do Coringa: um dragão de asas abertas diante da lua cheia.';

function defs(p: LogoPalette, dark: boolean): string {
  const halo = dark
    ? `
    <radialGradient id="lusacan-halo"><stop offset="0" stop-color="${p.halo}" stop-opacity=".45"/><stop offset="1" stop-color="${p.halo}" stop-opacity="0"/></radialGradient>`
    : '';
  return `  <defs>
    <radialGradient id="lusacan-lua" cx=".4" cy=".36" r=".72"><stop offset="0" stop-color="${p.moonLight}"/><stop offset=".55" stop-color="${p.moonMid}"/><stop offset="1" stop-color="${p.moonEdge}"/></radialGradient>
    <linearGradient id="lusacan-prata" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.wordTop}"/><stop offset="1" stop-color="${p.wordBottom}"/></linearGradient>${halo}
  </defs>`;
}

function moon(p: LogoPalette, dark: boolean): string {
  const halo = dark ? `  <circle cx="${MOON.cx}" cy="${MOON.cy}" r="${MOON.halo}" fill="url(#lusacan-halo)"/>\n` : '';
  const ring = dark ? '' : ` stroke="${p.dragon}" stroke-width="2"`;
  const craters = CRATERS.map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`).join('');
  return `${halo}  <circle cx="${MOON.cx}" cy="${MOON.cy}" r="${MOON.r}" fill="url(#lusacan-lua)"${ring}/>
  <g fill="${p.crater}" opacity=".35">${craters}</g>`;
}

/** O contorno de luz do dragão: sem ele, o corpo some no escuro fora da lua. */
const rim = (p: LogoPalette, fill: string): string =>
  `fill="${fill}" stroke="${p.wingRim}" stroke-width="1.2" stroke-linejoin="round"`;

function wing(p: LogoPalette, side: 'esquerda' | 'direita', veins: boolean): string {
  const place = side === 'esquerda' ? `translate(${-SHOULDER} 0)` : `translate(${SHOULDER} 0) scale(-1 1)`;
  const lines = veins
    ? `
      <path d="${WING.bones}" fill="none" stroke="${p.bone}" stroke-width="1.6"/>
      <path d="${WING.veins}" fill="none" stroke="${p.veinGlow}" stroke-width="3.5" stroke-opacity=".3" stroke-linejoin="round"/>
      <path d="${WING.veins}" fill="none" stroke="${p.vein}" stroke-width="1.1" stroke-linejoin="round"/>`
    : '';
  return `    <g transform="${place}">
      <path d="${WING.membrane}" ${rim(p, p.wing)}/>${lines}
    </g>`;
}

function dragon(p: LogoPalette, veins: boolean): string {
  return `  <g transform="translate(${DRAGON.x} ${DRAGON.y})">
    <path d="${TAIL}" ${rim(p, p.dragon)}/>
${wing(p, 'esquerda', veins)}
${wing(p, 'direita', veins)}
    <path d="${BODY.horns}" ${rim(p, p.dragon)}/>
    <path d="${BODY.spikes}" ${rim(p, p.dragon)}/>
    <path d="${BODY.trunk}" ${rim(p, p.dragon)}/>
    <path d="${BODY.belly}" fill="none" stroke="${p.bone}" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="${BODY.eye.cx}" cy="${BODY.eye.cy}" r="${BODY.eye.r}" fill="${p.eye}"/>
  </g>`;
}

function text(line: TextLine, fill: string): string {
  const glyphs = line.glyphs.map((g) => `    <path transform="translate(${g.x} 0)" d="${g.d}"/>`).join('\n');
  return `  <g transform="translate(${line.x} ${line.y}) scale(${line.scale})" fill="${fill}">
${glyphs}
  </g>`;
}

function svg(viewBox: string, title: string, desc: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="lusacan-t">
  <title id="lusacan-t">${title}</title>
  <desc>${desc}</desc>
${body}
</svg>
`;
}

function logo(dark: boolean): string {
  const p = dark ? PALETTES.escuro : PALETTES.claro;
  const body = [
    defs(p, dark),
    moon(p, dark),
    dragon(p, true),
    text(WORD, 'url(#lusacan-prata)'),
    text(TAG, p.tag),
    `  <path d="${flourishPath()}" fill="${p.tag}" stroke="${p.tag}" stroke-width=".8" opacity=".75"/>`,
  ].join('\n');
  const where = dark ? 'Versão para fundo escuro.' : 'Versão para fundo claro.';
  return svg(`0 0 ${LOGO_BOX.width} ${LOGO_BOX.height}`, 'LUSACAN productions', `${ABOUT} ${where}`, body);
}

function symbol(dark: boolean): string {
  const p = dark ? PALETTES.escuro : PALETTES.claro;
  const body = [defs(p, dark), moon(p, dark), dragon(p, false)].join('\n');
  const where = dark ? 'Só o símbolo, para fundo escuro.' : 'Só o símbolo, para fundo claro.';
  const box = `${SYMBOL_BOX.x} ${SYMBOL_BOX.y} ${SYMBOL_BOX.width} ${SYMBOL_BOX.height}`;
  return svg(box, 'LUSACAN', `${ABOUT} ${where}`, body);
}

/** Os quatro arquivos: o nome e o conteúdo. */
export function logoFiles(): Record<string, string> {
  return {
    'lusacan-logo-fundo-escuro.svg': logo(true),
    'lusacan-logo-fundo-claro.svg': logo(false),
    'lusacan-simbolo-fundo-escuro.svg': symbol(true),
    'lusacan-simbolo-fundo-claro.svg': symbol(false),
  };
}

if (import.meta.main) {
  for (const [name, content] of Object.entries(logoFiles())) {
    writeFileSync(join(OUT, name), content);
    console.log(`gravado: src/assets/lusacan/${name}`);
  }
}
