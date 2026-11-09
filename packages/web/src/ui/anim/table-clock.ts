// O relógio da mesa (bloco C dos pontos do playtest, decisoes.md 2026-11-08 (2), C4): as auras que fervem na mesa (a da iniciativa, a dos 4 J armados)
// podem ficar no ar por muitos turnos. Em vez de um intervalo por aura, um só, de `AURA_BOIL_MS`, para todas; e um agendador só para os raios da
// mesa, que chama um assinante por vez, em rodízio, a cada `BOLT_GAP_MS`: no máximo 3 por segundo somando a mesa inteira (spec da web §10.4). Os dois
// só existem com algum assinante ativo, e quem assina passa `active` falso durante as batidas e as cenas e com movimento reduzido.
//
// O quadro e o raio chegam por chamada, fora do React (como a aura das cenas, que troca o `d` por atributo): nenhum desenho a cada 70 ms.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { AURA_BOIL_MS, BOLT_GAP_MS } from './aura.ts';

type Listener = (frame: number) => void;

let frame = 0;
let boilTimer: number | null = null;
const boilers = new Set<Listener>();

function syncBoil(): void {
  if (boilers.size > 0 && boilTimer === null) {
    boilTimer = window.setInterval(() => {
      frame = (frame + 1) % 4;
      for (const listener of [...boilers]) listener(frame);
    }, AURA_BOIL_MS);
  } else if (boilers.size === 0 && boilTimer !== null) {
    window.clearInterval(boilTimer);
    boilTimer = null;
  }
}

/** Chama `onFrame` com o quadro de 0 a 3 das formas da aura, a cada `AURA_BOIL_MS`, enquanto `active`. Um intervalo só para a mesa inteira. */
export function useAuraBoil(active: boolean, onFrame: (frame: number) => void): void {
  const latest = useRef(onFrame);
  useLayoutEffect(() => {
    latest.current = onFrame;
  });
  useEffect(() => {
    if (!active) return;
    const listener: Listener = (next) => latest.current(next);
    boilers.add(listener);
    syncBoil();
    return () => {
      boilers.delete(listener);
      syncBoil();
    };
  }, [active]);
}

let boltTimer: number | null = null;
let turn = 0;
const bolters: Array<() => void> = [];

function syncBolts(): void {
  if (bolters.length > 0 && boltTimer === null) {
    boltTimer = window.setInterval(() => {
      if (bolters.length === 0) return;
      turn = turn % bolters.length;
      const next = bolters[turn]!;
      turn += 1;
      next();
    }, BOLT_GAP_MS);
  } else if (bolters.length === 0 && boltTimer !== null) {
    window.clearInterval(boltTimer);
    boltTimer = null;
  }
}

/** Chama `onBolt` quando é a vez deste assinante soltar um raio, enquanto `active`. Um agendador só: ≤ 3 raios por segundo na mesa inteira. */
export function useBoltSlot(active: boolean, onBolt: () => void): void {
  const latest = useRef(onBolt);
  useLayoutEffect(() => {
    latest.current = onBolt;
  });
  useEffect(() => {
    if (!active) return;
    const slot = () => latest.current();
    bolters.push(slot);
    syncBolts();
    return () => {
      const index = bolters.indexOf(slot);
      if (index >= 0) bolters.splice(index, 1);
      syncBolts();
    };
  }, [active]);
}
