// O Coringa do jogo (spec §10.6): desenho original do projeto, de chapéu de guizos e sorriso torto, em tinta,
// papel e um toque do vermelho de segunda cor. Decorativo: o nome acessível é de quem o usa.
export function Coringa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      <path
        className="fill-tinta"
        d="M14 31C10 23 6 17 4 10c8 2 14 6 18 12 2-8 6-14 10-18 4 4 8 10 10 18 4-6 10-10 18-12-2 7-6 13-10 21z"
      />
      <path
        className="stroke-papel"
        d="M10 16c4 2 7 5 9 9M32 10v14M54 16c-4 2-7 5-9 9"
        strokeWidth="1.6"
        fill="none"
      />
      <circle className="fill-papel stroke-tinta" cx="4" cy="10" r="3.4" strokeWidth="2" />
      <circle className="fill-papel stroke-tinta" cx="32" cy="4" r="3.4" strokeWidth="2" />
      <circle className="fill-papel stroke-tinta" cx="60" cy="10" r="3.4" strokeWidth="2" />
      <circle className="fill-papel stroke-tinta" cx="32" cy="40" r="12" strokeWidth="2.6" />
      <path
        className="stroke-tinta"
        d="M26 37.5l3-2M35 35.5l3 2M25.5 43c3.5 5.5 9.5 5.5 13 0"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle className="fill-vermelho" cx="24.5" cy="41" r="1.8" />
      <circle className="fill-vermelho" cx="39.5" cy="41" r="1.8" />
      <path className="fill-tinta" d="M16 54l6-6 5 6 5-6 5 6 5-6 6 6-2 9H18z" />
    </svg>
  );
}
