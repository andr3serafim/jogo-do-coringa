// O Coringa do jogo (spec §10.6): desenho original do projeto, de chapéu de guizos e sorriso torto, em tinta,
// papel e um toque do vermelho de segunda cor. Decorativo: o nome acessível é de quem o usa. Os traçados ficam exportados para o
// emblema do menu (`ui/menu/Emblem.tsx`), que desenha o mesmo Coringa maior, saindo do disco.

/** O chapéu de três pontas. */
export const CORINGA_HAT =
  'M14 31C10 23 6 17 4 10c8 2 14 6 18 12 2-8 6-14 10-18 4 4 8 10 10 18 4-6 10-10 18-12-2 7-6 13-10 21z';
/** As dobras do chapéu, em papel. */
export const CORINGA_STRIPES = 'M10 16c4 2 7 5 9 9M32 10v14M54 16c-4 2-7 5-9 9';
/** Os olhos fechados e o sorriso. */
export const CORINGA_FACE_LINES = 'M26 37.5l3-2M35 35.5l3 2M25.5 43c3.5 5.5 9.5 5.5 13 0';
/** A gola em zigue-zague. */
export const CORINGA_COLLAR = 'M16 54l6-6 5 6 5-6 5 6 5-6 6 6-2 9H18z';
/** Os três guizos (centro x, y; raio 3,4). */
export const CORINGA_BELLS: readonly (readonly [number, number])[] = [
  [4, 10],
  [32, 4],
  [60, 10],
];

export function Coringa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      <path className="fill-tinta" d={CORINGA_HAT} />
      <path className="stroke-papel" d={CORINGA_STRIPES} strokeWidth="1.6" fill="none" />
      {CORINGA_BELLS.map(([cx, cy]) => (
        <circle key={cx} className="fill-papel stroke-tinta" cx={cx} cy={cy} r="3.4" strokeWidth="2" />
      ))}
      <circle className="fill-papel stroke-tinta" cx="32" cy="40" r="12" strokeWidth="2.6" />
      <path className="stroke-tinta" d={CORINGA_FACE_LINES} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle className="fill-vermelho" cx="24.5" cy="41" r="1.8" />
      <circle className="fill-vermelho" cx="39.5" cy="41" r="1.8" />
      <path className="fill-tinta" d={CORINGA_COLLAR} />
    </svg>
  );
}
