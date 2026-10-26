// O fantasma da carta arrastada (spec do polimento, §6): a cópia da carta, que segue o dedo. Mora direto no `body`, numa camada
// `position: fixed` que não pega o ponteiro: o contêiner dos campos rola por dentro e cortaria uma cópia que ficasse nele, e um
// ancestral com `transform` ou `filter` (o palco inverte a tela, o Motion move as cartas) prenderia o `fixed` a ele. É só desenho:
// escondido de quem lê a tela (`aria-hidden`) e fora da ordem do Tab (`inert`). Some na soltura e no cancelamento, sem voo de volta, e
// não tem transição nem animação, igual com movimento reduzido: o movimento é o do dedo.
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GhostState } from './useCardDrag.ts';

/** A cópia levanta um pouco da mesa: um tamanho a mais e uma sombra, parados. */
const LIFT = 1.05;

/** Põe o clone dentro do fantasma e o tira quando ele troca ou o fantasma some. */
function CloneHost({ node }: { node: HTMLElement }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    host.current?.append(node);
    return () => node.remove();
  }, [node]);
  return <div ref={host} className="size-full" />;
}

export function DragGhost({ ghost }: { ghost: GhostState | null }) {
  if (ghost === null) return null;
  const { x, y, offsetX, offsetY, width, height, node } = ghost;
  return createPortal(
    <div
      data-fantasma
      aria-hidden="true"
      inert
      className="pointer-events-none fixed left-0 top-0 z-60"
      style={{
        width,
        height,
        // A carta fica presa ao ponto onde o dedo a pegou, e cresce a partir dele.
        transform: `translate3d(${x - offsetX}px, ${y - offsetY}px, 0) scale(${LIFT})`,
        transformOrigin: `${offsetX}px ${offsetY}px`,
        filter: 'drop-shadow(0 8px 10px rgb(23 18 15 / 0.35))',
      }}
    >
      <CloneHost node={node} />
    </div>,
    document.body,
  );
}
