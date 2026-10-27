// O gesto de arrastar uma carta (spec do polimento, §6; plano da fatia 5, tarefa 2). Genérico: não sabe de mesa nem de regra. Quem usa diz
// se o gesto vale agora (`enabled`), quais zonas aceitam a carta (`zones`, lida na hora) e o que fazer com a soltura e com o toque.
//
// - O `pointerdown` do ponteiro primário guarda o ponto (o segundo dedo não começa nada). Só depois de `DRAG_THRESHOLD_PX` de movimento
//   vira arrasto. Antes disso é um toque, e o gancho não faz nada com ele: o `pointerup` não chama `onTap` nem arma o engolidor, e o clique
//   que o navegador manda depois chega ao botão como sempre. O `onClick` do botão é o caminho do toque, do mouse, do teclado e dos
//   leitores de tela. Escolher no `pointerup` seria cedo no celular: o Chromium manda o `mousedown` de compatibilidade DEPOIS do `pointerup`
//   e ele foca a carta tocada, desfazendo o foco que a escolha acabou de levar à primeira jogada; o clique vem depois do `mousedown`.
//   Só o arrasto que passou do limiar e termina sem zona de volta sobre a própria carta é um toque (`onTap`), e aí o clique que o
//   navegador manda depois (como o de todo arrasto, solto numa zona ou fora) é engolido (`CLICK_GRACE_MS`, ou até o próximo `pointerdown`
//   ou tecla). O clique que não vem de um ponteiro tem `event.detail === 0` (Enter/Espaço, leitor de tela, `element.click()`; o do mouse
//   e o do toque trazem a contagem de cliques, >= 1) e passa sempre pelo engolidor, que segue armado para o clique do ponteiro. Nunca
//   ligue `onTap` e `onClick` a efeitos diferentes. O clique é engolido na janela, em captura: nenhum ouvinte de clique do caminho (a
//   carta, os ancestrais, o `onClickCapture` do palco e o da mesa) o vê. Só o `pointerdown` e o foco seguem normais.
// - No arrasto, o ponteiro é capturado, o fantasma (`DragGhost`) segue o dedo e a zona sob ele sai de `elementFromPoint` + `closest('[data-soltar]')`,
//   subindo pelos ancestrais até a primeira zona que esteja em `zones()` (a última carta de uma fileira, que não vale, não esconde a fileira, que
//   vale). As zonas válidas ganham `data-soltar-ativo` enquanto a carta está no ar, e a que está sob o dedo também `data-soltar-sob` (o
//   contorno é CSS parado, em `styles.css`). A soltura chama `onDrop(chave)`, ou `onDrop(null)` fora de toda zona válida. Soltar sem
//   zona de volta sobre a própria carta é toque (`onTap`), e não `onDrop(null)`: o dedo do celular escorrega uns pixels num toque.
// - `pointercancel`, `Esc`, a perda do foco da janela, `enabled` virando falso e a carta saindo da tela cancelam sem soltar nem tocar. O
//   `pointercancel` também não arma o engolidor: o navegador não manda clique depois dele. O `pointerup` que vem depois de um cancelamento
//   (o dedo ainda estava na tela) arma: o clique dele é do gesto cancelado.
// - Com `enabled` falso nada começa, e o `pointerdown` nem é lido: o palco (`Stage`) trata o dele como sempre. O gesto também nunca
//   segura nem impede o `pointerdown`.
// - O `pointerdown` é lido em captura na janela, antes de qualquer ouvinte da mesa: o toque que pulou as batidas (e que, ao pulá-las,
//   já liberou o `enabled`) vale com o `enabled` de antes dele, e não vira arrasto.
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { DropKey } from '../../model/drag.ts';

/** Quanto o ponteiro precisa andar, em px, para o toque virar arrasto. Abaixo disso é a tremida do dedo: continua sendo um toque. */
export const DRAG_THRESHOLD_PX = 8;

/** Quanto o clique do gesto que acabou pode demorar depois do `pointerup` (o toque no celular chega em outra tarefa). */
const CLICK_GRACE_MS = 400;

/** O atributo das zonas de soltura: o valor é a `DropKey`. */
const ZONE = '[data-soltar]';

/** A cópia da carta no ar: onde o dedo está, onde nela ele pegou, o tamanho e o clone do DOM. */
export interface GhostState {
  /** O ponteiro, em coordenadas da janela. */
  x: number;
  y: number;
  /** O ponto da carta (a partir do canto de cima à esquerda) em que o dedo a pegou. */
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  /** A cópia da carta, já sem id, rótulo nem foco. */
  node: HTMLElement;
}

export interface CardDragOptions {
  /** O gesto vale agora? Falso: nada começa (batidas em curso, jogada em voo, conexão caída), e um arrasto em curso é cancelado. */
  enabled: boolean;
  /** As zonas onde esta carta pode ser solta, na hora: é lida a cada movimento e na soltura. */
  zones: () => ReadonlySet<DropKey>;
  /** A soltura: a chave da zona válida sob o dedo, ou `null` fora de todas. */
  onDrop: (key: DropKey | null) => void;
  /**
   * O arrasto que passou do limiar, não achou zona e foi solto de volta sobre a própria carta: o dedo escorregou, e era um toque. O toque
   * de verdade (abaixo do limiar) não passa por aqui: o clique do navegador chega ao botão, e o `onClick` dele faz o mesmo que esta função.
   */
  onTap: () => void;
}

export interface CardDrag {
  /** A `ref` do elemento da carta (o botão): é ele que o dedo pega e que o fantasma copia. Estável. */
  bind: (el: HTMLElement | null) => void;
  /** A carta está no ar. */
  dragging: boolean;
  /** O que o `DragGhost` desenha; `null` quando a carta não está no ar. */
  ghost: GhostState | null;
  /** A zona válida sob o dedo, se houver. */
  overKey: DropKey | null;
}

type Phase = 'pending' | 'dragging' | 'cancelled';

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  rect: DOMRect;
  phase: Phase;
}

/**
 * A zona que o ponto da janela acerta e a chave dela: a primeira, de dentro para fora, que esteja entre as válidas. Uma zona de dentro
 * que não vale (a última carta de uma fileira com vaga) não esconde a de fora que vale (a fileira).
 */
function zoneAt(x: number, y: number, valid: ReadonlySet<DropKey>): { el: HTMLElement; key: DropKey } | null {
  let el = document.elementFromPoint(x, y)?.closest<HTMLElement>(ZONE) ?? null;
  while (el !== null) {
    const key = el.getAttribute('data-soltar');
    if (key !== null && valid.has(key)) return { el, key };
    el = el.parentElement?.closest<HTMLElement>(ZONE) ?? null;
  }
  return null;
}

/** Marca as zonas válidas (e a que está sob o dedo) e desmarca o resto, em todo o documento. */
function markZones(valid: ReadonlySet<DropKey>, under: HTMLElement | null): void {
  for (const zone of document.querySelectorAll<HTMLElement>(ZONE)) {
    const active = valid.has(zone.getAttribute('data-soltar') ?? '');
    zone.toggleAttribute('data-soltar-ativo', active);
    zone.toggleAttribute('data-soltar-sob', active && zone === under);
  }
}

function clearZones(): void {
  for (const zone of document.querySelectorAll('[data-soltar-ativo], [data-soltar-sob]')) {
    zone.removeAttribute('data-soltar-ativo');
    zone.removeAttribute('data-soltar-sob');
  }
}

/** Atributos que repetiriam a carta para quem lê a tela ou para um teste (a cópia é só desenho). */
const IDENTITY = ['id', 'title', 'aria-label', 'aria-labelledby', 'aria-describedby', 'data-testid', 'name'];

/** O clone de `el` para o fantasma: do tamanho da carta, sem o que a identifica nem o que a deixa focável. */
function cloneForGhost(el: HTMLElement, rect: DOMRect): HTMLElement {
  const copy = el.cloneNode(true) as HTMLElement;
  for (const node of [copy, ...copy.querySelectorAll<HTMLElement>('*')]) {
    for (const name of IDENTITY) node.removeAttribute(name);
    if (node.matches('button, a[href], input, select, textarea, [tabindex]')) node.tabIndex = -1;
  }
  Object.assign(copy.style, { width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', transform: 'none', translate: 'none' });
  return copy;
}

interface Host {
  setGhost: (ghost: GhostState | null) => void;
  setOver: (key: DropKey | null) => void;
}

/** A máquina do gesto, fora do React: os ouvintes são nativos (o `pointerdown` em captura na janela, o resto só durante o gesto). */
function createDragController(initial: CardDragOptions, host: Host) {
  let options = initial;
  let el: HTMLElement | null = null;
  let gesture: Gesture | null = null;
  let stopDown: (() => void) | null = null;
  let stopGesture: (() => void) | null = null;
  let stopSwallow: (() => void) | null = null;
  // O clone nasce uma vez por arrasto, no primeiro movimento depois do limiar, e vale até o fim dele.
  let clone: { gesture: Gesture; node: HTMLElement } | null = null;

  const showNothing = () => {
    clearZones();
    host.setGhost(null);
    host.setOver(null);
  };

  /**
   * Engole o clique que o navegador manda depois do gesto que acabou. Vale até o clique, a folga ou qualquer outro gesto (um
   * `pointerdown` ou uma tecla, de qualquer elemento): o arrasto de dedo que passa da tolerância não gera clique nenhum, e essa
   * espera não pode comer o clique seguinte em outro botão.
   */
  const swallowClick = () => {
    stopSwallow?.();
    const onClick = (event: MouseEvent) => {
      // Sem ponteiro (teclado, leitor de tela, `element.click()`): passa, e o engolidor segue armado para o clique do ponteiro.
      if (event.detail === 0) return;
      event.stopPropagation();
      event.preventDefault();
      stopSwallow?.();
    };
    const release = () => stopSwallow?.();
    const timer = window.setTimeout(release, CLICK_GRACE_MS);
    window.addEventListener('click', onClick, true);
    window.addEventListener('pointerdown', release, true);
    window.addEventListener('keydown', release, true);
    stopSwallow = () => {
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('pointerdown', release, true);
      window.removeEventListener('keydown', release, true);
      window.clearTimeout(timer);
      stopSwallow = null;
    };
  };

  /** Cancela o que está no ar, mas o gesto segue até o dedo soltar (o `pointerup` não solta nem toca, e o clique dele é engolido). */
  const cancel = () => {
    if (gesture === null || gesture.phase === 'cancelled') return;
    gesture.phase = 'cancelled';
    showNothing();
  };

  /** O fim do gesto: sai dos ouvintes, tira o que estava no ar e solta a captura. */
  const finish = () => {
    const ended = gesture;
    if (ended === null) return;
    gesture = null;
    clone = null;
    stopGesture?.();
    showNothing();
    if (ended.phase === 'dragging') {
      try {
        el?.releasePointerCapture(ended.pointerId);
      } catch {
        // O navegador já soltou a captura (o ponteiro acabou, ou o elemento saiu do documento).
      }
    }
  };

  /** O ponto da janela está sobre a carta de origem (ou sobre algo dentro dela)? */
  const isOverCard = (x: number, y: number): boolean => {
    const under = document.elementFromPoint(x, y);
    return el !== null && under !== null && el.contains(under);
  };

  const ghostNode = (current: Gesture): HTMLElement | null => {
    if (el === null) return null;
    if (clone === null || clone.gesture !== current) clone = { gesture: current, node: cloneForGhost(el, current.rect) };
    return clone.node;
  };

  const track = (current: Gesture, event: PointerEvent) => {
    const valid = options.zones();
    const zone = zoneAt(event.clientX, event.clientY, valid);
    markZones(valid, zone?.el ?? null);
    host.setOver(zone?.key ?? null);
    const node = ghostNode(current);
    if (node === null) return;
    host.setGhost({
      x: event.clientX,
      y: event.clientY,
      offsetX: current.startX - current.rect.left,
      offsetY: current.startY - current.rect.top,
      width: current.rect.width,
      height: current.rect.height,
      node,
    });
  };

  const onMove = (event: PointerEvent) => {
    const current = gesture;
    if (current === null || event.pointerId !== current.pointerId || current.phase === 'cancelled') return;
    if (current.phase === 'pending') {
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_THRESHOLD_PX) return;
      current.phase = 'dragging';
      try {
        el?.setPointerCapture(current.pointerId);
      } catch {
        // Sem captura (o ponteiro já acabou): os ouvintes da janela seguem valendo.
      }
    }
    track(current, event);
  };

  const onUp = (event: PointerEvent) => {
    const current = gesture;
    if (current === null || event.pointerId !== current.pointerId) return;
    const phase = current.phase;
    const { onDrop, onTap, zones } = options;
    const key = phase === 'dragging' ? (zoneAt(event.clientX, event.clientY, zones())?.key ?? null) : null;
    // O dedo que passou do limiar mas solta sem zona, ainda em cima da própria carta, só escorregou: é um toque (um toque no celular
    // costuma andar uns pixels). Uma zona válida sob o ponto vale mais; soltar sobre outra carta continua sendo `onDrop(null)`.
    const backOnCard = phase === 'dragging' && key === null && isOverCard(event.clientX, event.clientY);
    finish();
    // O toque abaixo do limiar não é do gesto: sem `onTap` e sem engolidor, o clique do navegador chega ao botão (veja o cabeçalho).
    if (phase === 'pending') return;
    swallowClick();
    if (backOnCard) onTap();
    else if (phase === 'dragging') onDrop(key);
  };

  const onCancel = (event: PointerEvent) => {
    if (gesture === null || event.pointerId !== gesture.pointerId) return;
    // Sem `swallowClick()`: depois do `pointercancel` o navegador não manda clique, e o próximo é de outro gesto.
    finish();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || gesture === null || gesture.phase === 'cancelled') return;
    // Quem olha o `defaultPrevented` (o palco, os diálogos) vê que o Esc já foi tratado aqui.
    event.preventDefault();
    cancel();
  };

  /** O texto selecionado e a imagem arrastada do navegador atrapalhariam o arrasto da carta. */
  const hold = (event: Event) => event.preventDefault();

  const startGesture = (event: PointerEvent, target: HTMLElement) => {
    stopSwallow?.();
    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: target.getBoundingClientRect(),
      phase: 'pending',
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', cancel);
    window.addEventListener('selectstart', hold, true);
    window.addEventListener('dragstart', hold, true);
    stopGesture = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('selectstart', hold, true);
      window.removeEventListener('dragstart', hold, true);
      stopGesture = null;
    };
  };

  const onDown = (event: PointerEvent) => {
    const target = el;
    if (target === null || !(event.target instanceof Node) || !target.contains(event.target)) return;
    if (!options.enabled || event.button !== 0 || !event.isPrimary) return;
    // Um gesto que ficou sem fim (o `pointerup` se perdeu) acaba quando o mesmo ponteiro aperta de novo; outro dedo é ignorado.
    if (gesture !== null) {
      if (gesture.pointerId !== event.pointerId) return;
      finish();
    }
    startGesture(event, target);
  };

  const bind = (next: HTMLElement | null) => {
    if (next === el) return;
    stopDown?.();
    stopDown = null;
    if (el !== null) el.style.touchAction = '';
    // A carta trocada ou saída da tela no meio do arrasto: nada fica no ar. O dedo ainda está na tela, então o gesto acaba no `pointerup`.
    cancel();
    el = next;
    if (next === null) return;
    window.addEventListener('pointerdown', onDown, true);
    stopDown = () => window.removeEventListener('pointerdown', onDown, true);
    next.style.touchAction = options.enabled ? 'none' : '';
  };

  /** A cada desenho: guarda as opções de agora; o `touch-action` segue o `enabled`, e um arrasto em curso não sobrevive a ele falso. */
  const update = (next: CardDragOptions) => {
    options = next;
    if (el !== null) el.style.touchAction = next.enabled ? 'none' : '';
    if (!next.enabled) cancel();
  };

  /** A mesa desmontou o gancho: nenhum ouvinte, marca nem fantasma fica para trás. */
  const dispose = () => {
    bind(null);
    finish();
    stopSwallow?.();
  };

  return { bind, update, dispose };
}

/**
 * O gesto de arrastar uma carta. Veja o cabeçalho do arquivo para as regras. Uso: um componente por carta chama o gancho, põe
 * `ref={bind}` no botão da carta e desenha `<DragGhost ghost={ghost} />`. Desestruture o retorno: com `ref={drag.bind}`, o lint
 * (`react-hooks/refs`) toma o objeto inteiro por uma ref e barra `drag.ghost` no desenho.
 */
export function useCardDrag(options: CardDragOptions): CardDrag {
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const [overKey, setOver] = useState<DropKey | null>(null);
  const [controller] = useState(() => createDragController(options, { setGhost, setOver }));

  useLayoutEffect(() => {
    controller.update(options);
  });
  useEffect(() => () => controller.dispose(), [controller]);

  const bind = useCallback((el: HTMLElement | null) => controller.bind(el), [controller]);
  return { bind, dragging: ghost !== null, ghost, overKey };
}
