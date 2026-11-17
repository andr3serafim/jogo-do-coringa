// A logo "LUSACAN productions" como a abertura a mostra (decisoes.md 2026-11-17 (3)): a versão para fundo escuro, com cada parte numa
// classe ou marca, para a abertura animar (a lua acende, o dragão voa e abre as asas, os veios de raio acendem, o nome sobe letra a letra).
// Os traçados vêm do `lusacan-shapes.ts`, os mesmos dos SVG de `src/assets/lusacan/`. Sem animação (fora da abertura, ou com movimento
// reduzido), é a logo parada.
//
// O dragão se move por peças: o `<g transform>` de fora põe a peça no lugar, e o de dentro (com a marca `data-dragao-*`) é o que a
// animação mexe, com o pivô na origem do desenho (a asa gira no ombro, o corpo no peito).
import type { CSSProperties } from 'react';
import {
  BODY,
  CRATERS,
  DRAGON,
  LOGO_BOX,
  MOON,
  PALETTES,
  SHOULDER,
  TAG,
  TAIL,
  WING,
  WORD,
  flourishPath,
  type TextLine,
} from './lusacan-shapes.ts';

const P = PALETTES.escuro;

/**
 * O contorno de luz do dragão: sem ele, o corpo some no escuro fora da lua. Com a espessura fixa na tela (`non-scaling-stroke`), ele
 * não some quando o dragão está pequeno, longe, no começo do voo; na pose, 1,8 px dá o mesmo traço do SVG de `assets`.
 */
const rim = { fill: P.dragon, stroke: P.wingRim, strokeWidth: 1.8, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const;

function Wing({ side }: { side: 'esquerda' | 'direita' }) {
  const place = side === 'esquerda' ? `translate(${-SHOULDER} 0)` : `translate(${SHOULDER} 0) scale(-1 1)`;
  return (
    <g transform={place}>
      <g data-dragao-asa={side}>
        <path d={WING.membrane} {...rim} fill={P.wing} />
        <path d={WING.bones} fill="none" stroke={P.bone} strokeWidth={1.6} />
        <g className="lusacan-veios">
          <path d={WING.veins} fill="none" stroke={P.veinGlow} strokeWidth={3.5} strokeOpacity={0.3} strokeLinejoin="round" />
          <path d={WING.veins} fill="none" stroke={P.vein} strokeWidth={1.1} strokeLinejoin="round" />
        </g>
      </g>
    </g>
  );
}

function Line({ line, fill, className, letterClass }: { line: TextLine; fill: string; className: string; letterClass?: string }) {
  return (
    <g transform={`translate(${line.x} ${line.y}) scale(${line.scale})`} fill={fill} className={className}>
      {line.glyphs.map((glyph, index) => (
        <path
          key={index}
          transform={`translate(${glyph.x} 0)`}
          d={glyph.d}
          className={letterClass}
          style={letterClass ? ({ '--i': index } as CSSProperties) : undefined}
        />
      ))}
    </g>
  );
}

export function LusacanLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_BOX.width} ${LOGO_BOX.height}`}
      role="img"
      aria-label="LUSACAN productions"
      focusable="false"
      className={className}
    >
      <defs>
        <radialGradient id="lusacan-lua" cx=".4" cy=".36" r=".72">
          <stop offset="0" stopColor={P.moonLight} />
          <stop offset=".55" stopColor={P.moonMid} />
          <stop offset="1" stopColor={P.moonEdge} />
        </radialGradient>
        <radialGradient id="lusacan-halo">
          <stop offset="0" stopColor={P.halo} stopOpacity=".45" />
          <stop offset="1" stopColor={P.halo} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lusacan-prata" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.wordTop} />
          <stop offset="1" stopColor={P.wordBottom} />
        </linearGradient>
      </defs>
      <g className="lusacan-lua">
        <circle className="lusacan-halo" cx={MOON.cx} cy={MOON.cy} r={MOON.halo} fill="url(#lusacan-halo)" />
        <circle cx={MOON.cx} cy={MOON.cy} r={MOON.r} fill="url(#lusacan-lua)" />
        <g fill={P.crater} opacity={0.35}>
          {CRATERS.map((crater, index) => (
            <circle key={index} cx={crater.cx} cy={crater.cy} r={crater.r} />
          ))}
        </g>
      </g>
      <g transform={`translate(${DRAGON.x} ${DRAGON.y})`}>
        <g data-dragao-voo="">
          <path d={TAIL} {...rim} />
          <Wing side="esquerda" />
          <Wing side="direita" />
          <path d={BODY.horns} {...rim} />
          <path d={BODY.spikes} {...rim} />
          <path d={BODY.trunk} {...rim} />
          <path d={BODY.belly} fill="none" stroke={P.bone} strokeWidth={1.4} strokeLinecap="round" />
          <circle className="lusacan-olho" cx={BODY.eye.cx} cy={BODY.eye.cy} r={BODY.eye.r} fill={P.eye} />
        </g>
      </g>
      <Line line={WORD} fill="url(#lusacan-prata)" className="lusacan-nome" letterClass="lusacan-letra" />
      <Line line={TAG} fill={P.tag} className="lusacan-tag" />
      <path className="lusacan-filete" d={flourishPath()} fill={P.tag} stroke={P.tag} strokeWidth={0.8} opacity={0.75} />
    </svg>
  );
}
