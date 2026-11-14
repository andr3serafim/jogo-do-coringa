// Os pingos do carimbo (bloco D dos pontos do playtest, ponto 5; spec do playtest §6.1): quando o toque solta um carimbo ligado, umas
// gotas escorrem do pé dele. São da cor da face (a barra é de tinta: gota de tinta sobre tinta não se vê). Um ouvinte só, no invólucro da
// barra (`Table.tsx`), serve todos os carimbos; as gotas moram no invólucro, e não no botão, porque a jogada pode tirar o botão da tela.
// `position: fixed` (da classe): não entram na conta da rolagem. Só `transform` e `opacity`, uma vez, e somem. Com movimento reduzido a
// mesa não põe o ouvinte.

const DROPS = 7;
const LIFE_MS = 420;

type Face = 'atacar' | 'ouro' | 'papel';

function faceOf(stamp: Element): Face {
  if (stamp.classList.contains('carimbo-atacar')) return 'atacar';
  return stamp.classList.contains('carimbo-ouro') ? 'ouro' : 'papel';
}

export function stampInk(event: { target: EventTarget | null; currentTarget: EventTarget | null; button?: number }): void {
  // Só o toque e o botão principal do mouse: o do meio e o direito não carimbam.
  if (event.button !== undefined && event.button !== 0) return;
  const host = event.currentTarget;
  const from = event.target;
  if (!(host instanceof HTMLElement) || !(from instanceof Element)) return;
  const stamp = from.closest('.carimbo, .carimbo-selo');
  if (stamp === null || !host.contains(stamp) || stamp.matches(':disabled')) return;
  const box = stamp.getBoundingClientRect();
  const face = faceOf(stamp);
  for (let i = 0; i < DROPS; i += 1) {
    const drop = document.createElement('span');
    const size = 4 + Math.random() * 6;
    drop.setAttribute('data-pingo', '');
    drop.setAttribute('data-face', face);
    drop.setAttribute('aria-hidden', 'true');
    drop.className = 'carimbo-pingo';
    drop.style.left = `${(box.left + Math.random() * box.width).toFixed(1)}px`;
    drop.style.top = `${(box.bottom - 4).toFixed(1)}px`;
    drop.style.width = `${size.toFixed(1)}px`;
    drop.style.height = `${size.toFixed(1)}px`;
    host.appendChild(drop);
    const dx = (Math.random() - 0.5) * 36;
    const dy = 8 + Math.random() * 16;
    drop.animate?.(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.6)`, opacity: 0 },
      ],
      { duration: LIFE_MS, easing: 'ease-out', fill: 'forwards' },
    );
    window.setTimeout(() => drop.remove(), LIFE_MS);
  }
}
