// O módulo das cenas refeitas no sub-projeto 6 (§12): os desenhos ficam num chunk à parte, fora do JavaScript inicial, e a mesa
// o pré-carrega quando monta (`loadScenes`), para a primeira cena não esperar a rede. Enquanto ele não chega (ou se falhar), a
// sobreposição mostra o painel de antes, com o título.
import type { PlayerId } from '@coringa/engine';
import type { Names } from '@coringa/sim/text';
import { useSyncExternalStore, type ComponentType } from 'react';
import type { Beat, SceneKind } from '../../model/timeline.ts';
import type { SceneBox } from './scene-box.ts';

/** O que cada cena recebe da sobreposição. */
export interface SceneProps {
  beat: Beat;
  names: Names;
  reduced: boolean;
  /** O jogador deste lado da tela: a cena se espelha quando é o oponente que joga. */
  me: PlayerId;
  /** O golpe absorvido já acendeu (o feixe do Ataque Absoluto acertou). */
  hitLanded: boolean;
  box: SceneBox;
}

export type SceneModule = Partial<Record<SceneKind, ComponentType<SceneProps>>>;

let loaded: SceneModule | null = null;
let pending: Promise<SceneModule> | null = null;
const listeners = new Set<() => void>();

/** Carrega o módulo das cenas uma vez só. Uma falha (a rede caiu) deixa tentar de novo na próxima chamada. */
export function loadScenes(): Promise<SceneModule> {
  pending ??= import('../scenes/index.ts').then(
    (module) => {
      loaded = module.SCENES;
      for (const listener of listeners) listener();
      return module.SCENES;
    },
    () => {
      pending = null;
      return {};
    },
  );
  return pending;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => loaded;

/** As cenas carregadas, ou `null` enquanto o módulo não chegou. */
export const useScenes = (): SceneModule | null => useSyncExternalStore(subscribe, snapshot, snapshot);
