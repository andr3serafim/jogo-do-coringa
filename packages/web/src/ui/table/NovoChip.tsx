// A marca "novo" fora das cartas (vida, pressão): letras vermelhas sobre papel e contorno de tinta, para ter >= 3:1
// também sobre a capa verde (spec §10.3 e §10.5). Decorativa: o nome acessível do elemento ganha ", novo".
export function NovoChip() {
  return (
    <span
      aria-hidden="true"
      data-marca-novo
      className="inline-block border-2 border-tinta bg-papel px-1 font-texto text-[10px] font-bold uppercase leading-tight text-vermelho"
    >
      novo
    </span>
  );
}
