// O medalhão do fim de partida (a Faixa de feira, decisoes.md 2026-11-24 (11) e (13)): o seu Coringa, o da mesa (`Coringa.tsx`: o mesmo
// chapéu, guizos e gola), maior, ocupando o círculo com folga pequena, em três humores: feliz na vitória, triste na derrota, sério sem
// vencedor. Sempre o Bufão, para qualquer raça (o retrato pintado não tem as expressões). Desenho original do projeto; decorativo.
import { CORINGA_BELLS, CORINGA_COLLAR, CORINGA_HAT, CORINGA_STRIPES } from '../cards/Coringa.tsx';

export type ResultMood = 'feliz' | 'triste' | 'serio';

/** Os olhos e a boca de cada humor, no quadro de 64 × 64 do Coringa. */
const FACES: Record<ResultMood, { eyes: string; mouth: string; open: boolean }> = {
  // Os olhos fechados de riso e a boca aberta, em vermelho.
  feliz: { eyes: 'M26 37.5l3-2M35 35.5l3 2', mouth: 'M25 42.5h14c-1 6-12 6-14 0z', open: true },
  // Os olhos caídos e a boca para baixo.
  triste: { eyes: 'M26 36.5l3 1.5M35 38l3-1.5', mouth: 'M26 47c3.5-4 9.5-4 13 0', open: false },
  // Os olhos de ponto e a boca reta.
  serio: { eyes: 'M27.5 37h1M35.5 37h1', mouth: 'M27 45h10', open: false },
};

export function ResultFace({ mood }: { mood: ResultMood }) {
  const face = FACES[mood];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className="size-full">
      <g transform="translate(4 6) scale(.88)">
        <circle cx="32" cy="40" r="17" className="fill-capa-voce" />
        <path className="fill-tinta" d={CORINGA_HAT} />
        <path className="stroke-papel" d={CORINGA_STRIPES} strokeWidth="1.6" fill="none" />
        {CORINGA_BELLS.map(([cx, cy]) => (
          <circle key={cx} className="fill-ouro stroke-tinta" cx={cx} cy={cy} r="3.4" strokeWidth="2" />
        ))}
        <circle className="fill-papel stroke-tinta" cx="32" cy="40" r="12" strokeWidth="2.6" />
        <path className="stroke-tinta" d={face.eyes} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path
          className={face.open ? 'fill-vermelho stroke-tinta' : 'stroke-tinta'}
          d={face.mouth}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={face.open ? undefined : 'none'}
        />
        <circle className="fill-vermelho" cx="24.5" cy="41" r="1.8" />
        <circle className="fill-vermelho" cx="39.5" cy="41" r="1.8" />
        <path className="fill-tinta" d={CORINGA_COLLAR} />
      </g>
    </svg>
  );
}
