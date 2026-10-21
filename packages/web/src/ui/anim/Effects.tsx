// Os efeitos de uma batida sobre a mesa (spec §4.2) que não são de carta: o número do dano que sobe no Coringa e a
// fileira acesa. Só usam opacidade e deslocamento, sobem e descem uma vez dentro da batida (sem pisca-pisca), e ficam
// escondidos do leitor de tela (o histórico registra tudo). Os números de jogo seguem sem textura (spec §10.7).
import * as m from 'motion/react-m';

const times = [0, 0.15, 0.75, 1];

/** O número do dano sobe no Coringa que apanhou. */
export function DamageNumber({ amount, ms, reduced }: { amount: number; ms: number; reduced: boolean }) {
  return (
    <m.span
      aria-hidden="true"
      data-dano
      initial={{ opacity: 0 }}
      animate={reduced ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], y: [0, -6, -18, -26] }}
      transition={{ duration: ms / 1000, times, ease: 'linear' }}
      className="pointer-events-none absolute -top-5 left-0 z-10 border-2 border-tinta bg-vermelho px-1.5 font-texto text-xl font-extrabold leading-tight tabular-nums text-papel pc:-top-7 pc:text-3xl"
    >
      −{amount}
    </m.span>
  );
}

/** A fileira de Ataque acende e aponta para o Coringa do outro; a de Defesa que apanha só acende. */
export function LitRow({ aim, ms }: { aim?: 'up' | 'down'; ms: number }) {
  return (
    <m.span
      aria-hidden="true"
      data-fileira-acesa
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: ms / 1000, times, ease: 'linear' }}
      className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 z-10 border-4 border-ouro"
    >
      {aim ? (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-ouro px-1 text-[10px] leading-none text-tinta">
          {aim === 'up' ? '▲' : '▼'}
        </span>
      ) : null}
    </m.span>
  );
}

/** O escudo do Reflect do Coringa quebra (cancelado, protegido ou expirado): a `view` já não o tem, então é só isto. */
export function ShieldBreak({ ms, reduced }: { ms: number; reduced: boolean }) {
  return (
    <m.svg
      viewBox="0 0 24 26"
      aria-hidden="true"
      data-escudo-quebra
      initial={{ opacity: 0 }}
      animate={reduced ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [0.9, 1, 1.15, 1.4] }}
      transition={{ duration: ms / 1000, times, ease: 'linear' }}
      className="pointer-events-none absolute -inset-1.5 z-10 size-[calc(100%+12px)] text-ouro"
    >
      <path
        d="M12 1 L22 4.5 V13 C22 19 17.5 23.5 12 25 C6.5 23.5 2 19 2 13 V4.5 Z"
        fill="currentColor"
        fillOpacity="0.55"
        stroke="var(--color-tinta)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <path d="M13 3 L10 11 L14 14 L9.5 22" fill="none" stroke="var(--color-tinta)" strokeWidth="1.6" />
    </m.svg>
  );
}
