// O replay pede os pacotes da aparência assim que acha a partida, antes de a mesa montar (decks e raças, fatia 2, Minor 1): quando o
// provedor da mesa nasce, o pacote já pode estar pronto, e a carta não passa pelo cordel. Arquivo à parte: o `vi.mock` do visualizador
// vale para o arquivo inteiro, e é ele que prova que o pedido vem da tela, e não do provedor da mesa.
import { RULES_VERSION } from '@coringa/engine';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readyPack, resetPacks } from '../../src/looks/load.ts';
import { recordPastGame, type PastGame } from '../../src/model/past-games.ts';
import { DEFAULT_PREFS, savePrefs } from '../../src/model/storage.ts';
import ReplayScreen from '../../src/ui/screens/ReplayScreen.tsx';
import { realReplay } from '../fixtures.ts';
import { memoryStore } from './support.tsx';

vi.mock('../../src/ui/screens/ReplayViewer.tsx', () => ({ ReplayViewer: () => null }));

beforeEach(() => resetPacks());
afterEach(() => resetPacks());

function storedGame(extra: Partial<Omit<PastGame, 'id'>> = {}) {
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
      ...extra,
    },
    1_000,
  )!;
  return { store, game };
}

it('os pacotes das aparências gravadas na partida são pedidos pela tela do replay (G3)', async () => {
  const { store, game } = storedGame({ looks: { me: { deck: 'celestial', race: 'bufao' }, opponent: { deck: 'cordel', race: 'bufao' } } });
  savePrefs(store, { ...DEFAULT_PREFS, look: { deck: 'bestiario', race: 'egipcio' } });
  render(<ReplayScreen store={store} id={game.id} />);
  await vi.waitFor(() => expect(readyPack('celestial')).toBeDefined());
  // A preferência de agora não entra no replay.
  expect(readyPack('bestiario')).toBeUndefined();
  expect(readyPack('egipcio')).toBeUndefined();
});

it('os do oponente também', async () => {
  const { store, game } = storedGame({ looks: { me: { deck: 'cordel', race: 'bufao' }, opponent: { deck: 'bestiario', race: 'egipcio' } } });
  render(<ReplayScreen store={store} id={game.id} />);
  await vi.waitFor(() => {
    expect(readyPack('bestiario')).toBeDefined();
    expect(readyPack('egipcio')).toBeDefined();
  });
});

it('sem aparências gravadas, nenhum pacote é pedido, nem com a preferência fantasy', async () => {
  const { store, game } = storedGame();
  savePrefs(store, { ...DEFAULT_PREFS, look: { deck: 'bestiario', race: 'egipcio' } });
  render(<ReplayScreen store={store} id={game.id} />);
  await vi.dynamicImportSettled();
  expect(readyPack('bestiario')).toBeUndefined();
  expect(readyPack('celestial')).toBeUndefined();
  expect(readyPack('egipcio')).toBeUndefined();
});
