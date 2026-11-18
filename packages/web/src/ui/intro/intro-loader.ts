// A abertura (decisoes.md 2026-11-16 (5)) mora num pedaço à parte, fora do JavaScript inicial: o dragão, as letras em traçado e o CSS dela
// pesam ~8 KB comprimidos, e o orçamento do inicial é de 200 KB (`scripts/smoke.ts`). O `App` pede o pedaço ao abrir no Início e cobre o
// menu com uma capa escura até ele chegar; se falhar, o menu abre na hora. O mesmo jeito das cenas (`anim/scenes-loader.ts`).
import type { ComponentType } from 'react';
import type { IntroProps } from './Intro.tsx';

let loaded: ComponentType<IntroProps> | null = null;
let pending: Promise<ComponentType<IntroProps>> | null = null;

/** Carrega a abertura uma vez só. A falha (a rede caiu) é repassada a quem pediu, e a próxima chamada tenta de novo. */
export function loadIntro(): Promise<ComponentType<IntroProps>> {
  pending ??= import('./Intro.tsx').then(
    (module) => {
      loaded = module.Intro;
      return module.Intro;
    },
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending;
}

/** Esquece o pedaço carregado, para o próximo `App` mostrar a capa até ele chegar de novo. Só para os testes. */
export function forgetIntro(): void {
  loaded = null;
  pending = null;
}

/** A abertura, se o pedaço já chegou (os testes o carregam antes, no `setup-ui.ts`); `null` enquanto não. */
export const loadedIntro = (): ComponentType<IntroProps> | null => loaded;
