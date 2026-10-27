// A arte da Ressurreição (U2 do sub-projeto 5), desenhada para o projeto no traço de xilogravura da mesa: uma carta numérica sobe
// de uma lápide, com três raios por cima. Liga o botão "Ressuscitar" (a quadra que o deu) ao cemitério (de onde a carta volta).
// É desenho: fica escondida do leitor de tela, e o nome do botão diz o que ele faz.

export function ResurrectIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg aria-hidden="true" data-arte="ressurreicao" viewBox="0 0 40 40" className={`shrink-0 ${className}`} fill="none">
      {/* Os raios: três traços curtos acima da carta. */}
      <path d="M20 1.5v4.5M11.5 4.2l2.4 3.6M28.5 4.2l-2.4 3.6" stroke="var(--color-ouro)" strokeWidth="2.4" strokeLinecap="square" />
      {/* A carta que sobe, um pouco inclinada, com o valor riscado no meio. */}
      <g transform="rotate(-8 20 17)">
        <rect x="13" y="8.5" width="14" height="19" rx="1.5" fill="var(--color-papel)" stroke="var(--color-tinta)" strokeWidth="2" />
        <path d="M17 14.5h6M20 14.5v8.5M17.5 23h5" stroke="var(--color-vermelho)" strokeWidth="2" strokeLinecap="square" />
      </g>
      {/* A lápide, de onde ela sai: a frente cobre o pé da carta. */}
      <path
        d="M7 38.5V27.5c0-4 3-6.5 6.5-6.5h13c3.5 0 6.5 2.5 6.5 6.5v11Z"
        fill="var(--color-tinta)"
        stroke="var(--color-papel)"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <path d="M16 30.5h8M20 27v8" stroke="var(--color-ouro)" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}
