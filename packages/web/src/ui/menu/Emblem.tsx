// O emblema do Início (decisoes.md 2026-11-18 (4)): o Coringa do jogo (`Coringa.tsx`, os mesmos traçados) maior que o disco de papel —
// os guizos, as pontas do chapéu e a gola passam da borda. Onde sai do disco, um contorno de papel com um fio de tinta por fora, para ler
// sobre os dois fundos. Decorativo: o nome da tela é o `<h1>`.
import { CORINGA_BELLS, CORINGA_COLLAR, CORINGA_FACE_LINES, CORINGA_HAT, CORINGA_STRIPES } from '../cards/Coringa.tsx';

const TINTA = 'var(--color-tinta)';
const PAPEL = 'var(--color-papel)';
const VERMELHO = 'var(--color-vermelho)';

export function Emblem() {
  return (
    <svg className="menu-emblema" viewBox="0 0 300 264" aria-hidden="true" focusable="false">
      <circle cx="150" cy="150" r="92" fill={PAPEL} stroke={TINTA} strokeWidth="3.5" />
      <circle cx="150" cy="150" r="83" fill="none" stroke={TINTA} strokeOpacity="0.38" strokeWidth="1.5" strokeDasharray="3 5" />
      <g transform="translate(150 158) scale(3.4) translate(-32 -34)" strokeLinejoin="round" strokeLinecap="round">
        <path d={CORINGA_HAT} fill="none" stroke={TINTA} strokeWidth="3" />
        <path d={CORINGA_HAT} fill={TINTA} stroke={PAPEL} strokeWidth="1.8" paintOrder="stroke" />
        <path d={CORINGA_STRIPES} fill="none" stroke={PAPEL} strokeWidth="1.1" />
        {CORINGA_BELLS.map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="3.4" fill={PAPEL} stroke={TINTA} strokeWidth="1.5" />
        ))}
        <circle cx="32" cy="40" r="12" fill={PAPEL} stroke={TINTA} strokeWidth="1.8" />
        <path d={CORINGA_FACE_LINES} fill="none" stroke={TINTA} strokeWidth="1.7" />
        <circle cx="24.5" cy="41" r="1.8" fill={VERMELHO} />
        <circle cx="39.5" cy="41" r="1.8" fill={VERMELHO} />
        <path d={CORINGA_COLLAR} fill="none" stroke={TINTA} strokeWidth="3" />
        <path d={CORINGA_COLLAR} fill={VERMELHO} stroke={PAPEL} strokeWidth="1.8" paintOrder="stroke" />
        <path d={CORINGA_COLLAR} fill="none" stroke={TINTA} strokeWidth="0.9" />
      </g>
    </svg>
  );
}
