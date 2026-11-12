// O replay pede os pacotes da aparência assim que acha a partida, antes de a mesa montar (decks e raças, fatia 2, Minor 1): quando o
// provedor da mesa nasce, o pacote já pode estar pronto, e a carta não passa pelo cordel. Arquivo à parte: o `vi.mock` do visualizador
// vale para o arquivo inteiro, e é ele que prova que o pedido vem da tela, e não do provedor da mesa.
import { RULES_VERSION } from '@coringa/engine';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readyPack, resetPacks } from '../../src/looks/load.ts';
import { recordPastGame } from '../../src/model/past-games.ts';
import { DEFAULT_PREFS, savePrefs } from '../../src/model/storage.ts';
import ReplayScreen from '../../src/ui/screens/ReplayScreen.tsx';
import { realReplay } from '../fixtures.ts';
import { memoryStore } from './support.tsx';

vi.mock('../../src/ui/screens/ReplayViewer.tsx', () => ({ ReplayViewer: () => null }));

beforeEach(() => resetPacks());
afterEach(() => resetPacks());

function storedGame() {
  const store = memoryStore();
  const game = recordPastGame(
    store,
    {
      date: 1_000,
      mode: { kind: 'training', level: 'medio' },
      seat: 'p1',
      names: { me: 'Ana', opponent: 'Duda' },
      outcome: { gameNo: 1, cause: 'NORMAL', result: null },
      rounds: 3,
      score: { p1: 0, p2: 0 },
      rulesVersion: RULES_VERSION,
      replay: realReplay('ui-1'),
    },
    1_000,
  )!;
  return { store, game };
}

it('com uma aparência de arte, os pacotes dela são pedidos pela tela do replay', async () => {
  const { store, game } = storedGame();
  savePrefs(store, { ...DEFAULT_PREFS, look: { deck: 'celestial', race: 'egipcio' } });
  render(<ReplayScreen store={store} id={game.id} />);
  await vi.waitFor(() => {
    expect(readyPack('celestial')).toBeDefined();
    expect(readyPack('egipcio')).toBeDefined();
  });
  expect(readyPack('bestiario')).toBeUndefined();
});

it('com o padrão, nenhum pacote é pedido', async () => {
  const { store, game } = storedGame();
  render(<ReplayScreen store={store} id={game.id} />);
  await vi.dynamicImportSettled();
  expect(readyPack('bestiario')).toBeUndefined();
  expect(readyPack('celestial')).toBeUndefined();
  expect(readyPack('egipcio')).toBeUndefined();
});
