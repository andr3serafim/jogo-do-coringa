// O gesto de arrastar carta (plano da fatia 5, tarefa 2): o limiar de 8 px entre o toque e o arrasto, o fantasma, a zona sob o dedo, o
// clique engolido, o cancelamento e a limpeza. Genérico: sem mesa nem regra, só um botão, o fantasma e zonas `data-soltar` soltas no DOM.
// O jsdom não tem `elementFromPoint`, a captura do ponteiro nem layout: os testes os simulam.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAG_THRESHOLD_PX, useCardDrag } from '../../src/ui/table/useCardDrag.ts';
import { DragGhost } from '../../src/ui/table/DragGhost.tsx';

interface HarnessProps {
  enabled?: boolean;
  /** As chaves das zonas onde a carta pode cair; lidas na hora, a cada chamada de `zones()`. */
  valid?: { current: string[] };
  onDrop?: (key: string | null) => void;
  onTap?: () => void;
  onClick?: () => void;
}

function Harness({ enabled = true, valid = { current: ['guarda', 'buffs:ATK'] }, onDrop = () => undefined, onTap = () => undefined, onClick }: HarnessProps) {
  const { bind, dragging, ghost, overKey } = useCardDrag({ enabled, zones: () => new Set(valid.current), onDrop, onTap });
  return (
    <div>
      <button type="button" ref={bind} onClick={onClick}>
        Carta K
      </button>
      <output data-testid="estado">{`${String(dragging)}|${overKey ?? ''}`}</output>
      <DragGhost ghost={ghost} />
    </div>
  );
}

/** As zonas ficam soltas no DOM, fora da árvore do React: sobrevivem ao `unmount` e mostram o que o gesto deixou nelas. */
const zones = new Map<string, HTMLElement>();
const stray: HTMLElement[] = [];
let hit: Element | null = null;

function addZone(key: string): HTMLElement {
  const zone = document.createElement('div');
  zone.dataset.soltar = key;
  const inner = document.createElement('span');
  inner.textContent = key;
  zone.append(inner);
  document.body.append(zone);
  zones.set(key, zone);
  return zone;
}

/** Uma zona dentro da outra (a última carta da fileira dentro da fileira); `over(inner)` acerta uma folha dentro da de dentro. */
function addNested(outerKey: string, innerKey: string): { outer: HTMLElement; inner: HTMLElement } {
  const outer = addZone(outerKey);
  const inner = document.createElement('div');
  inner.dataset.soltar = innerKey;
  inner.append(document.createElement('span'));
  outer.append(inner);
  zones.set(innerKey, inner);
  return { outer, inner };
}

function outside(): HTMLElement {
  const el = document.createElement('p');
  document.body.append(el);
  stray.push(el);
  return el;
}

/** O que o `elementFromPoint` devolve a partir de agora; um filho da zona prova o `closest`. */
const over = (zone: HTMLElement | null) => {
  hit = zone === null ? null : (zone.firstElementChild ?? zone);
};

const POINTER = { pointerId: 1, button: 0, isPrimary: true };

/** O clique que o navegador manda depois de um gesto de ponteiro (mouse, toque): `detail` é a contagem de cliques, sempre >= 1. */
const CLICK = { detail: 1 };

const card = () => screen.getByRole('button', { name: 'Carta K' });
const down = (x = 10, y = 10, extra: Record<string, number | boolean> = {}) => fireEvent.pointerDown(card(), { ...POINTER, clientX: x, clientY: y, ...extra });
const move = (x: number, y: number) => fireEvent.pointerMove(card(), { ...POINTER, clientX: x, clientY: y });
const up = (x = 10, y = 10) => fireEvent.pointerUp(card(), { ...POINTER, clientX: x, clientY: y });
const ghostEl = () => document.querySelector<HTMLElement>('[data-fantasma]');
const marked = (name: string) => [...document.querySelectorAll(`[${name}]`)].map((el) => el.getAttribute('data-soltar'));

const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
let capture: ReturnType<typeof vi.fn>;

beforeEach(() => {
  capture = vi.fn();
  proto.setPointerCapture = capture;
  proto.releasePointerCapture = vi.fn();
  proto.hasPointerCapture = vi.fn(() => true);
  document.elementFromPoint = vi.fn(() => hit);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 140));
  for (const key of ['guarda', 'buffs:ATK', 'cemiterio']) addZone(key);
  hit = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete proto.setPointerCapture;
  delete proto.releasePointerCapture;
  delete proto.hasPointerCapture;
  delete (document as unknown as Record<string, unknown>).elementFromPoint;
  for (const el of [...zones.values(), ...stray]) el.remove();
  zones.clear();
  stray.length = 0;
});

describe('useCardDrag: do toque ao arrasto', () => {
  it('abaixo de 8 px é toque: chama onTap, não arrasta, não mostra fantasma nem captura o ponteiro', () => {
    const onTap = vi.fn();
    const onDrop = vi.fn();
    render(<Harness onTap={onTap} onDrop={onDrop} />);
    down(10, 10);
    move(14, 13);
    expect(ghostEl()).toBeNull();
    expect(screen.getByTestId('estado')).toHaveTextContent('false|');
    up(14, 13);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onDrop).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    expect(DRAG_THRESHOLD_PX).toBe(8);
  });

  it('um toque inteiro (pointerdown, pointerup, click) dá um onTap só: o clique que o navegador manda depois é engolido', () => {
    const onTap = vi.fn();
    const onClick = vi.fn();
    render(<Harness onTap={onTap} onClick={onClick} />);
    down();
    up();
    fireEvent.click(card(), CLICK);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('o toque feito pelo user-event (mouse) também dá um onTap só', async () => {
    const onTap = vi.fn();
    const onClick = vi.fn();
    render(<Harness onTap={onTap} onClick={onClick} />);
    await userEvent.click(card());
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('o clique sem gesto de ponteiro (o Enter no botão) segue direto para o botão, e não é toque', async () => {
    const onTap = vi.fn();
    const onClick = vi.fn();
    render(<Harness onTap={onTap} onClick={onClick} />);
    card().focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('a partir de 8 px é arrasto: captura o ponteiro e mostra o fantasma, uma cópia da carta numa camada fixa fora da mesa', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    down(10, 10);
    move(10, 17);
    expect(ghostEl()).toBeNull();
    move(10, 18);
    const ghost = ghostEl();
    expect(ghost).not.toBeNull();
    expect(capture).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('estado')).toHaveTextContent('true|');
    // A camada do fantasma: fixa, sem pegar o mouse, escondida de quem lê a tela e fora do contêiner dos campos (direto no body).
    expect(ghost?.parentElement).toBe(document.body);
    expect(ghost).toHaveClass('fixed', 'pointer-events-none');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
    expect(ghost).toHaveTextContent('Carta K');
    // Uma cópia: a original continua na mesa, e só ela é um botão para quem lê a tela.
    expect(screen.getAllByRole('button', { name: 'Carta K' })).toHaveLength(1);
    up(10, 18);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('o fantasma segue o ponteiro, preso ao ponto onde o dedo pegou a carta', () => {
    render(<Harness />);
    down(30, 40);
    move(80, 120);
    expect(ghostEl()?.style.transform).toContain('translate3d(50px, 80px, 0)');
    move(100, 90);
    expect(ghostEl()?.style.transform).toContain('translate3d(70px, 50px, 0)');
    expect(ghostEl()?.style.width).toBe('100px');
    expect(ghostEl()?.style.height).toBe('140px');
  });

  it('tira do clone o que repetiria a carta na tela (id, rótulo, foco)', () => {
    render(<Harness />);
    const original = card();
    original.id = 'carta-k';
    original.title = 'K, Guarda';
    down();
    move(40, 40);
    const copy = ghostEl()?.querySelector('button');
    expect(copy).not.toBeNull();
    expect(copy?.hasAttribute('id')).toBe(false);
    expect(copy?.hasAttribute('title')).toBe(false);
    expect(copy?.tabIndex).toBe(-1);
    expect(document.querySelectorAll('#carta-k')).toHaveLength(1);
  });
});

describe('useCardDrag: a soltura', () => {
  it('soltar sobre uma zona válida chama onDrop com a chave dela (a zona vem de elementFromPoint + closest)', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    render(<Harness onDrop={onDrop} onTap={onTap} />);
    down();
    move(60, 60);
    over(zones.get('guarda') ?? null);
    move(200, 200);
    expect(screen.getByTestId('estado')).toHaveTextContent('true|guarda');
    up(200, 200);
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith('guarda');
    expect(onTap).not.toHaveBeenCalled();
    expect(ghostEl()).toBeNull();
    expect(screen.getByTestId('estado')).toHaveTextContent('false|');
  });

  it('a zona é a do ponto onde o dedo solta, não a da última vez que se mexeu', () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    down();
    over(zones.get('guarda') ?? null);
    move(60, 60);
    over(zones.get('buffs:ATK') ?? null);
    up(70, 70);
    expect(onDrop).toHaveBeenCalledWith('buffs:ATK');
  });

  it('soltar sobre uma zona que não está em zones() chama onDrop(null)', () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    down();
    over(zones.get('cemiterio') ?? null);
    move(60, 60);
    expect(screen.getByTestId('estado')).toHaveTextContent('true|');
    up(60, 60);
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(null);
  });

  it('soltar fora de qualquer zona (num elemento sem zona, ou onde não há nada) chama onDrop(null)', () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    down();
    over(null);
    hit = outside();
    move(60, 60);
    up(60, 60);
    expect(onDrop).toHaveBeenLastCalledWith(null);
    // Outro arrasto, agora com o ponto vazio (fora da janela, por exemplo).
    hit = null;
    down();
    move(60, 60);
    up(60, 60);
    expect(onDrop).toHaveBeenCalledTimes(2);
    expect(onDrop).toHaveBeenLastCalledWith(null);
  });

  it('soltar de volta sobre a própria carta, sem zona, é toque (o dedo do celular escorrega alguns px): chama onTap, e o clique que vem depois é engolido', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    const onClick = vi.fn();
    render(<Harness onDrop={onDrop} onTap={onTap} onClick={onClick} />);
    down();
    hit = outside();
    move(40, 40); // passou do limiar: está no ar, longe da carta
    expect(ghostEl()).not.toBeNull();
    hit = card();
    up(12, 12);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onDrop).not.toHaveBeenCalled();
    expect(ghostEl()).toBeNull();
    fireEvent.click(card(), CLICK);
    expect(onClick).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('o toque que escorregou além do limiar e solta ainda sobre a carta (sem sair dela) também é toque, não onDrop(null)', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    render(<Harness onDrop={onDrop} onTap={onTap} />);
    down(10, 10);
    hit = card();
    move(22, 10); // 12 px: arrasto para o gesto, mas o dedo continua em cima da carta
    up(22, 10);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('soltar sobre um filho da própria carta também vale como toque', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    const child = document.createElement('span');
    card().append(child);
    down();
    move(40, 40);
    hit = child;
    up(12, 12);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('sobre outra carta (um botão vizinho) a soltura segue sendo onDrop(null), e uma zona válida vale mais que a própria carta', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    render(
      <>
        <Harness onDrop={onDrop} onTap={onTap} />
        <button type="button">Vizinha</button>
      </>,
    );
    down();
    move(40, 40);
    hit = screen.getByRole('button', { name: 'Vizinha' });
    up(40, 40);
    expect(onDrop).toHaveBeenLastCalledWith(null);
    expect(onTap).not.toHaveBeenCalled();
    // A zona válida que contém o ponto (mesmo que o elemento da carta estivesse dentro dela) é a soltura, e não um toque.
    const zone = zones.get('guarda')!;
    zone.append(card());
    down();
    move(40, 40);
    hit = card();
    up(40, 40);
    expect(onDrop).toHaveBeenLastCalledWith('guarda');
    expect(onTap).not.toHaveBeenCalled();
  });

  it('depois do Esc ou do pointercancel, soltar sobre a própria carta não toca nem solta', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    render(<Harness onDrop={onDrop} onTap={onTap} />);
    down();
    move(40, 40);
    fireEvent.keyDown(window, { key: 'Escape' });
    hit = card();
    up(12, 12);
    expect(onTap).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
    down();
    move(40, 40);
    fireEvent.pointerCancel(card(), { ...POINTER });
    hit = card();
    up(12, 12);
    expect(onTap).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('o clique que o navegador manda depois do arrasto não vira toque nem chega ao botão; depois da folga, o clique volta ao normal', () => {
    vi.useFakeTimers();
    const onTap = vi.fn();
    const onClick = vi.fn();
    render(<Harness onTap={onTap} onClick={onClick} />);
    down();
    move(60, 60);
    up(60, 60);
    fireEvent.click(card(), CLICK);
    expect(onTap).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
    // O arrasto que termina sem clique (o navegador às vezes o descarta) não deixa o próximo clique de teclado engolido.
    down();
    move(60, 60);
    up(60, 60);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(card());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('o arrasto de dedo, que não gera clique, não come o clique seguinte em outro botão (qualquer pointerdown ou tecla desfaz a espera)', () => {
    const onOther = vi.fn();
    render(
      <>
        <Harness />
        <button type="button" onClick={onOther}>
          Confirmar
        </button>
      </>,
    );
    const other = () => screen.getByRole('button', { name: 'Confirmar' });
    down();
    move(60, 60);
    up(60, 60);
    // Nenhum clique veio, e o dedo já toca em outro botão dentro da folga.
    fireEvent.pointerDown(other(), { pointerId: 2, button: 0, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(other(), { pointerId: 2, button: 0, clientX: 300, clientY: 300 });
    fireEvent.click(other());
    expect(onOther).toHaveBeenCalledTimes(1);
    // O mesmo com o teclado: o Enter que vem logo depois do arrasto não é engolido.
    down();
    move(60, 60);
    up(60, 60);
    fireEvent.keyDown(other(), { key: 'Enter' });
    fireEvent.click(other());
    expect(onOther).toHaveBeenCalledTimes(2);
  });

  it('o próximo gesto desfaz a espera do clique engolido', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    down();
    move(60, 60);
    up(60, 60);
    // Nenhum clique veio; o toque seguinte é um toque inteiro.
    down();
    up();
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});

describe('useCardDrag: o clique que não vem de um ponteiro', () => {
  it('o clique com detail 0 (leitor de tela, element.click()) passa pelo engolidor armado, que segue valendo para o clique do ponteiro', () => {
    const onClick = vi.fn();
    render(<Harness onClick={onClick} />);
    down();
    move(60, 60);
    up(60, 60);
    fireEvent.click(card());
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(card(), CLICK);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('o pointercancel não arma o engolidor: o navegador não manda clique depois dele, e o clique seguinte é de outro gesto', () => {
    const onClick = vi.fn();
    render(<Harness onClick={onClick} />);
    down();
    over(zones.get('guarda') ?? null);
    move(60, 60);
    fireEvent.pointerCancel(card(), POINTER);
    fireEvent.click(card(), CLICK);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('useCardDrag: as zonas válidas', () => {
  it('as zonas de zones() ganham data-soltar-ativo enquanto a carta está no ar, a zona sob o dedo ganha data-soltar-sob, e tudo sai na soltura', () => {
    render(<Harness />);
    down();
    expect(marked('data-soltar-ativo')).toEqual([]);
    move(60, 60);
    expect(marked('data-soltar-ativo')).toEqual(['guarda', 'buffs:ATK']);
    expect(marked('data-soltar-sob')).toEqual([]);
    over(zones.get('buffs:ATK') ?? null);
    move(70, 70);
    expect(marked('data-soltar-sob')).toEqual(['buffs:ATK']);
    // O dedo sai da zona e vai para uma que não vale: ela não ganha nada.
    over(zones.get('cemiterio') ?? null);
    move(80, 80);
    expect(marked('data-soltar-sob')).toEqual([]);
    expect(zones.get('cemiterio')).not.toHaveAttribute('data-soltar-ativo');
    up(80, 80);
    expect(marked('data-soltar-ativo')).toEqual([]);
    expect(marked('data-soltar-sob')).toEqual([]);
  });

  it('zones() é lida a cada movimento: a jogada que passou a valer (ou deixou de valer) no meio do arrasto muda as zonas', () => {
    const valid = { current: ['guarda'] };
    render(<Harness valid={valid} />);
    down();
    move(60, 60);
    expect(marked('data-soltar-ativo')).toEqual(['guarda']);
    valid.current = ['cemiterio'];
    over(zones.get('cemiterio') ?? null);
    move(70, 70);
    expect(marked('data-soltar-ativo')).toEqual(['cemiterio']);
    expect(marked('data-soltar-sob')).toEqual(['cemiterio']);
    valid.current = [];
    up(70, 70);
    // A soltura confere a lista de agora: a zona que deixou de valer não conta.
    expect(marked('data-soltar-ativo')).toEqual([]);
  });

  it('zonas aninhadas: sobe até a primeira zona válida (a última carta, que não vale, não esconde a fileira, que vale)', () => {
    const onDrop = vi.fn();
    const { outer, inner } = addNested('fileira:ATK', 'ultima:ATK');
    render(<Harness valid={{ current: ['fileira:ATK'] }} onDrop={onDrop} />);
    down();
    over(inner);
    move(60, 60);
    expect(screen.getByTestId('estado')).toHaveTextContent('true|fileira:ATK');
    expect(outer).toHaveAttribute('data-soltar-sob');
    expect(inner).not.toHaveAttribute('data-soltar-ativo');
    up(60, 60);
    expect(onDrop).toHaveBeenCalledWith('fileira:ATK');
  });

  it('zonas aninhadas, as duas válidas: vale a de dentro', () => {
    const onDrop = vi.fn();
    const { outer, inner } = addNested('fileira:DEF', 'ultima:DEF');
    render(<Harness valid={{ current: ['fileira:DEF', 'ultima:DEF'] }} onDrop={onDrop} />);
    down();
    over(inner);
    move(60, 60);
    expect(inner).toHaveAttribute('data-soltar-sob');
    expect(outer).not.toHaveAttribute('data-soltar-sob');
    up(60, 60);
    expect(onDrop).toHaveBeenCalledWith('ultima:DEF');
  });

  it('zonas aninhadas, nenhuma válida: soltar é onDrop(null)', () => {
    const onDrop = vi.fn();
    const { inner } = addNested('fileira:ATK', 'ultima:ATK');
    render(<Harness valid={{ current: ['guarda'] }} onDrop={onDrop} />);
    down();
    over(inner);
    move(60, 60);
    up(60, 60);
    expect(onDrop).toHaveBeenCalledWith(null);
  });

  it('as zonas só ficam marcadas depois do limiar: o toque não pisca contorno nenhum', () => {
    render(<Harness />);
    down();
    move(13, 12);
    expect(marked('data-soltar-ativo')).toEqual([]);
    up(13, 12);
    expect(marked('data-soltar-ativo')).toEqual([]);
  });
});

describe('useCardDrag: cancelar', () => {
  it('pointercancel cancela sem soltar nem tocar, e limpa o fantasma e as zonas', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    render(<Harness onDrop={onDrop} onTap={onTap} />);
    down();
    over(zones.get('guarda') ?? null);
    move(60, 60);
    expect(ghostEl()).not.toBeNull();
    fireEvent.pointerCancel(card(), POINTER);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
    expect(ghostEl()).toBeNull();
    expect(marked('data-soltar-ativo')).toEqual([]);
    expect(screen.getByTestId('estado')).toHaveTextContent('false|');
    // O gesto acabou: um toque novo funciona.
    down();
    up();
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('Esc cancela o arrasto (e segura o evento para quem olha o defaultPrevented); o pointerup que vem depois não solta nem toca, e o clique dele é engolido', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    const onClick = vi.fn();
    render(<Harness onDrop={onDrop} onTap={onTap} onClick={onClick} />);
    down();
    over(zones.get('guarda') ?? null);
    move(60, 60);
    expect(ghostEl()).not.toBeNull();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(true);
    expect(ghostEl()).toBeNull();
    expect(marked('data-soltar-ativo')).toEqual([]);
    // Ainda com o dedo na tela: mexer não traz o fantasma de volta.
    move(90, 90);
    expect(ghostEl()).toBeNull();
    up(90, 90);
    fireEvent.click(card(), CLICK);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Esc antes do limiar também cancela: soltar depois não é toque', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    down();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(escape);
    });
    up();
    expect(onTap).not.toHaveBeenCalled();
  });

  it('uma tecla que não é Esc não cancela', () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    down();
    over(zones.get('guarda') ?? null);
    move(60, 60);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(ghostEl()).not.toBeNull();
    up(60, 60);
    expect(onDrop).toHaveBeenCalledWith('guarda');
  });

  it('enabled virando falso no meio do arrasto (as batidas começaram, a jogada ficou em voo) cancela: o fantasma some e a soltura não manda nada', () => {
    const onDrop = vi.fn();
    const { rerender } = render(<Harness onDrop={onDrop} />);
    down();
    over(zones.get('guarda') ?? null);
    move(60, 60);
    expect(ghostEl()).not.toBeNull();
    rerender(<Harness enabled={false} onDrop={onDrop} />);
    expect(ghostEl()).toBeNull();
    expect(marked('data-soltar-ativo')).toEqual([]);
    up(60, 60);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('desmontar a carta no meio do arrasto (o state novo tirou ela da mão) não deixa fantasma, zona marcada nem ouvinte', () => {
    const onDrop = vi.fn();
    const { unmount } = render(<Harness onDrop={onDrop} />);
    down();
    over(zones.get('guarda') ?? null);
    move(60, 60);
    expect(marked('data-soltar-ativo')).toEqual(['guarda', 'buffs:ATK']);
    unmount();
    expect(ghostEl()).toBeNull();
    expect(marked('data-soltar-ativo')).toEqual([]);
    expect(marked('data-soltar-sob')).toEqual([]);
    // O pointerup que chegar depois não encontra ninguém.
    fireEvent.pointerUp(document.body, { ...POINTER, clientX: 60, clientY: 60 });
    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe('useCardDrag: quando não começa', () => {
  it('com enabled falso nada começa: nem toque, nem arrasto, nem captura, e o clique segue para o botão', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    const onClick = vi.fn();
    render(<Harness enabled={false} onDrop={onDrop} onTap={onTap} onClick={onClick} />);
    over(zones.get('guarda') ?? null);
    down();
    move(60, 60);
    expect(ghostEl()).toBeNull();
    up(60, 60);
    fireEvent.click(card());
    expect(onDrop).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(marked('data-soltar-ativo')).toEqual([]);
  });

  it('com enabled falso o gesto não registra ouvinte nenhum e não toca no pointerdown (o palco o vê como sempre)', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const seen: Event[] = [];
    render(
      <div onPointerDown={(event) => seen.push(event.nativeEvent)}>
        <Harness enabled={false} />
      </div>,
    );
    add.mockClear();
    down();
    expect(add.mock.calls.map(([type]) => type)).not.toEqual(expect.arrayContaining(['pointermove']));
    expect(add).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.defaultPrevented).toBe(false);
  });

  it('com enabled, o gesto também deixa o pointerdown passar (não segura, não impede)', () => {
    const seen: Event[] = [];
    render(
      <div onPointerDown={(event) => seen.push(event.nativeEvent)}>
        <Harness />
      </div>,
    );
    down();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.defaultPrevented).toBe(false);
  });

  it('o pointerdown que o palco trata (e que, ao pular as batidas, libera o enabled na hora) não vira arrasto: vale o enabled de antes dele', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    function StageLike() {
      const [enabled, setEnabled] = useState(false);
      return (
        <div
          ref={(el) => {
            // O palco escuta o pointerdown em captura, antes da carta; o que ele muda, o React já desenhou quando a carta o vê.
            el?.addEventListener('pointerdown', () => flushSync(() => setEnabled(true)), { capture: true, once: true });
          }}
        >
          <Harness enabled={enabled} onDrop={onDrop} onTap={onTap} />
        </div>
      );
    }
    render(<StageLike />);
    over(zones.get('guarda') ?? null);
    down();
    move(60, 60);
    expect(ghostEl()).toBeNull();
    up(60, 60);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
    // O gesto seguinte, já com a mesa liberada, arrasta.
    down();
    move(60, 60);
    expect(ghostEl()).not.toBeNull();
    up(60, 60);
    expect(onDrop).toHaveBeenCalledWith('guarda');
  });

  it('só o botão principal começa: o clique direito e o do meio não', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    down(10, 10, { button: 2 });
    move(60, 60);
    expect(ghostEl()).toBeNull();
    up();
    down(10, 10, { button: 1 });
    up();
    expect(onTap).not.toHaveBeenCalled();
  });

  it('só o ponteiro primário começa: o segundo dedo, com o primeiro em outro lugar da tela, não toca nem arrasta', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    over(zones.get('guarda') ?? null);
    down(10, 10, { pointerId: 2, isPrimary: false });
    fireEvent.pointerMove(card(), { pointerId: 2, isPrimary: false, clientX: 60, clientY: 60 });
    expect(ghostEl()).toBeNull();
    fireEvent.pointerUp(card(), { pointerId: 2, isPrimary: false, clientX: 60, clientY: 60 });
    expect(onTap).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('um segundo dedo no meio do gesto é ignorado, e o dedo do arrasto segue valendo', () => {
    const onDrop = vi.fn();
    const onTap = vi.fn();
    render(<Harness onDrop={onDrop} onTap={onTap} />);
    down(10, 10, { pointerId: 1 });
    over(zones.get('guarda') ?? null);
    move(60, 60);
    fireEvent.pointerDown(card(), { pointerId: 2, button: 0, clientX: 5, clientY: 5 });
    fireEvent.pointerMove(card(), { pointerId: 2, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(card(), { pointerId: 2, clientX: 300, clientY: 300 });
    expect(ghostEl()).not.toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
    expect(onTap).not.toHaveBeenCalled();
    up(60, 60);
    expect(onDrop).toHaveBeenCalledWith('guarda');
  });

  it('um pointerdown fora da carta não começa nada', () => {
    const onTap = vi.fn();
    render(<Harness onTap={onTap} />);
    fireEvent.pointerDown(outside(), { ...POINTER, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(document.body, { ...POINTER, clientX: 10, clientY: 10 });
    expect(onTap).not.toHaveBeenCalled();
  });

  it('a carta arrastável tem touch-action: none (o dedo arrasta em vez de rolar); desligada, volta ao normal', () => {
    const { rerender } = render(<Harness />);
    expect(card().style.touchAction).toBe('none');
    rerender(<Harness enabled={false} />);
    expect(card().style.touchAction).toBe('');
    rerender(<Harness />);
    expect(card().style.touchAction).toBe('none');
  });

  it('o arrasto não deixa selecionar texto nem arrastar a imagem do navegador', () => {
    render(<Harness />);
    down();
    move(60, 60);
    const select = new Event('selectstart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(select);
    expect(select.defaultPrevented).toBe(true);
    const native = new Event('dragstart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(native);
    expect(native.defaultPrevented).toBe(true);
    up(60, 60);
    const after = new Event('selectstart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});

describe('o contorno das zonas de soltura (styles.css)', () => {
  const css = readFileSync(resolve(import.meta.dirname, '../../src/styles.css'), 'utf8');
  const start = css.indexOf('[data-soltar] {');
  const block = css.slice(start, css.indexOf('fim da soltura do arrasto', start));

  it('existe, para a zona válida e para a zona sob o dedo', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('[data-soltar][data-soltar-ativo]');
    expect(block).toContain('[data-soltar-sob]');
  });

  it('é parado: sem animação, sem transição, sem @keyframes e sem depender de movimento reduzido (igual nos dois modos)', () => {
    expect(block).not.toMatch(/animation|transition|@keyframes|prefers-reduced-motion/);
  });

  it('não toma o ::after da dica nem o outline e o box-shadow do elemento (halo de foco e anel de alvo das cartas): desenha no ::before', () => {
    expect(block).not.toContain('::after');
    const rules = [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector = '', body = '']) => ({ selector, body }));
    expect(rules.length).toBeGreaterThan(1);
    for (const { selector, body } of rules) {
      if (/\b(outline|box-shadow)\s*:/.test(body)) expect(selector).toContain('::before');
    }
  });

  it('o bloco da dica do tutorial continua onde o teste dele o procura (a soltura vem antes dele)', () => {
    expect(css.indexOf('[data-soltar] {')).toBeLessThan(css.indexOf('[data-dica] {'));
  });
});
