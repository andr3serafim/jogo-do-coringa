// O pacote de arte que não chega (sem rede, chunk antigo depois de um deploy): a mesa do treino fica em cordel, sem tela de erro e sem
// nada no console (decks e raças, fatia 1, F3). Arquivo à parte: o `vi.mock` vale para o arquivo inteiro.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as localRoomModule from '../../src/model/local-room.ts';
import { DEFAULT_PREFS, savePrefs } from '../../src/model/storage.ts';
import { Training } from '../../src/ui/screens/Training.tsx';
import { memoryStore } from './support.tsx';

vi.mock('../../src/looks/load.ts', () => ({ loadPack: vi.fn(() => Promise.reject(new Error('o chunk do pacote sumiu'))) }));

beforeEach(() => {
  window.history.replaceState(null, '', '/treino?semente=t1&nivel=medio');
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

it('com o pacote que falha, a mesa do treino fica em cordel e nada vai ao console', async () => {
  const errors = vi.spyOn(console, 'error');
  const warnings = vi.spyOn(console, 'warn');
  const store = memoryStore();
  savePrefs(store, { ...DEFAULT_PREFS, look: { deck: 'bestiario', race: 'egipcio' } });
  render(<Training store={store} load={() => Promise.resolve(localRoomModule)} />);
  await act(async () => vi.dynamicImportSettled());
  await act(async () => vi.dynamicImportSettled());
  expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
  expect(document.querySelectorAll('[data-card-id]').length).toBeGreaterThan(0);
  expect(document.querySelector('[data-card-id] img')).toBeNull();
  expect(errors).not.toHaveBeenCalled();
  expect(warnings).not.toHaveBeenCalled();
});
