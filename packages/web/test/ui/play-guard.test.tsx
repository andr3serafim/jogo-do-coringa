// A última linha de defesa da `PlayTable` (spec §1.5, passo 2): antes de `session.play`, a jogada precisa ainda valer pelo
// papel na lista legal do `state`. Nenhum caminho normal da interface monta uma jogada ilegal, então o teste força um:
// as jogadas da mesa vêm de um `tablePlays` trocado, que oferece "Encerrar turno" com o Ataque cheio (o motor só lista
// `DECLARE_ATTACK` nesse caso).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type * as Plays from '../../src/model/plays.ts';
import { Session } from '../../src/model/session.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { FakeConnection, scenarioAt, stateMessage } from '../fixtures.ts';
import { roomMessage } from './support.tsx';

vi.mock('../../src/model/plays.ts', async (importOriginal) => {
  const real = await importOriginal<typeof Plays>();
  return { ...real, tablePlays: (...args: Parameters<typeof real.tablePlays>) => ({ ...real.tablePlays(...args), finish: { type: 'END_TURN' as const } }) };
});

describe('PlayTable: só manda a jogada que ainda é legal', () => {
  it('uma jogada fora da lista legal não chega à sessão', async () => {
    const { view } = scenarioAt({ self: { hand: ['K'], attackRow: [8, 4] } });
    const connection = new FakeConnection({
      room: roomMessage({ status: 'PLAYING' }),
      state: stateMessage(view),
    });
    const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
    const user = userEvent.setup();
    render(<PlayTable session={session} />);
    const button = within(screen.getByRole('region', { name: 'Ações' })).getByRole('button', { name: 'Encerrar turno' });
    await user.click(button);
    expect(connection.sent).toEqual([]);
    expect(session.snapshot().pending).toBe(false);
    session.dispose();
  });
});
