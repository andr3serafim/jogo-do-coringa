// O que a interface usa do som (Fase C, fatia 1): tocar uma pista e ligar ou desligar o som. O `App` cria o único
// `SoundController` e o provê aqui; fora dele (os testes, um componente solto) vale o `SILENT`, que não faz nada.
// Quem usa chama `sound.play(...)` e `sound.setEnabled(...)` no objeto, sem desestruturar: os métodos do controlador
// dependem do `this`.
import { createContext, useContext } from 'react';
import type { Cue } from '../model/sound.ts';

export interface SoundApi {
  play(cue: Cue): void;
  setEnabled(on: boolean): void;
  /** Corta o que está soando: o pulo das batidas leva junto o som delas (sub-projeto 6 §10). */
  cut(): void;
}

const SILENT: SoundApi = { play() {}, setEnabled() {}, cut() {} };

export const SoundContext = createContext<SoundApi>(SILENT);

export function useSound(): SoundApi {
  return useContext(SoundContext);
}
