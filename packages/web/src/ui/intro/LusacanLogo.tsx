// A logo "LUSACAN productions" como a abertura a mostra: sobre o fundo de tinta, com cada parte numa classe, para o CSS da
// abertura (`intro.css`) animar a entrada (o capuz corta, a lua acende, a fenda abre, as letras sobem em fila). Os traçados vêm do
// `lusacan-shapes.ts`, os mesmos dos SVG de `src/assets/lusacan/`. Sem animação (fora da abertura, ou com movimento reduzido), é a
// logo parada.
import type { CSSProperties } from 'react';
import { EYE, LOGO_BOX, PLACE, TAG, TAG_STROKE, WORD, WORD_STROKE, type Glyph } from './lusacan-shapes.ts';

const at = ({ x, y }: { x: number; y: number }): string => `translate(${x} ${y})`;

/** Uma letra: forma preenchida ou traço, na cor de quem a usa (`currentColor`). */
function Letter({ glyph, width, className, style }: { glyph: Glyph; width: number; className?: string; style?: CSSProperties }) {
  const paint = glyph.stroke ? { fill: 'none', stroke: 'currentColor', strokeWidth: width } : { fill: 'currentColor' };
  return <path transform={`translate(${glyph.x} 0)`} d={glyph.d} className={className} style={style} {...paint} />;
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
      <g transform={at(PLACE.symbol)} className="lusacan-olho">
        <circle className="lusacan-iris fill-ouro" cx={EYE.iris.cx} cy={EYE.iris.cy} r={EYE.iris.r} />
        <path className="lusacan-fenda fill-tinta" d={EYE.pupil} />
        <path className="lusacan-capuz fill-papel" d={EYE.hood} />
        {/* `pathLength` 1: o traço se desenha com `stroke-dashoffset` de 1 a 0, sem medir o caminho. */}
        <path
          className="lusacan-fio stroke-papel"
          d={EYE.lower}
          pathLength={1}
          fill="none"
          strokeWidth={EYE.lowerWidth}
          strokeLinecap="round"
        />
      </g>
      <g transform={at(PLACE.word)} className="text-papel">
        {WORD.map((glyph, index) => (
          <Letter key={index} glyph={glyph} width={WORD_STROKE} className="lusacan-letra" style={{ '--i': index } as CSSProperties} />
        ))}
      </g>
      <g transform={at(PLACE.tag)} className="lusacan-tag text-ouro">
        {TAG.map((glyph, index) => (
          <Letter key={index} glyph={glyph} width={TAG_STROKE} />
        ))}
      </g>
    </svg>
  );
}
