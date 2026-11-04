// A janela da Ressurreição na mesa (ponto 16, plano do bloco E, Tarefa 6): o painel depois da revelação do Equipar, no lugar da barra,
// e o passo da fileira no cemitério com a troca da última carta, o total de antes e de depois e a fileira protegida pela quadra. A mesa
// é a `PlayTable` sobre uma `Session` de verdade, com `FakeConnection`; toda jogada enviada é conferida contra o motor.
import { applyAction } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  RESURRECT_ALL_PROTECTED_TEXT,
  resurrectProtectedText,
  resurrectReplaceDetail,
  resurrectTotalText,
  RESURRECTION_WINDOW_TEXT,
} from '../../src/model/resurrection-copy.ts';
import { Session } from '../../src/model/session.ts';
import { DEFAULT_PREFS } from '../../src/model/storage.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { FakeConnection, scenarioAt, stateMessage, type ViewSpec } from '../fixtures.ts';
import { roomMessage, seriousViolations } from './support.tsx';

const seat = (playerId: 'p1' | 'p2', nickname: string) => ({ playerId, nickname, connected: true, ready: true, wantsRematch: false });

const sessions: Session[] = [];
afterEach(() => {
  for (const session of sessions.splice(0)) session.dispose();
});

function mount(spec: ViewSpec) {
  const { state: game, view } = scenarioAt(spec);
  const room = roomMessage({ status: 'PLAYING', seats: [seat('p1', 'André'), seat('p2', 'Duda')], score: { p1: 0, p2: 0 } });
  const connection = new FakeConnection({ playerId: 'p1', room, state: stateMessage(view), now: 0 });
  const session = new Session(
    connection,
    { now: () => Date.now(), setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) },
    DEFAULT_PREFS,
  );
  sessions.push(session);
  const rendered = render(<PlayTable session={session} />);
  return { game, view, connection, user: userEvent.setup(), ...rendered };
}

const acts = (m: ReturnType<typeof mount>): PlayerAction[] => m.connection.sent.flatMap((s) => (s.type === 'act' ? [s.action] : []));
const panel = () => screen.getByRole('region', { name: 'Janela da Ressurreição' });

/** A minha janela: a quadra de 7 no Ataque, as duas fileiras cheias (7 cartas) e um 10 no cemitério. */
const WINDOW: ViewSpec = {
  round: 4,
  phase: { kind: 'RESURRECTION', player: 'p1', next: null },
  self: { attackRow: [2, 3, 4, 7, 7, 7, 7], defenseRow: [2, 3, 4, 5, 6, 8, 9], resurrections: [{ row: 'ATK', value: 7 }] },
  graveyard: [10],
};

describe('a janela da Ressurreição (ponto 16)', () => {
  it('o painel ocupa o lugar da barra, com o texto, Ressuscitar e Guardar, e recebe o foco', () => {
    mount(WINDOW);
    expect(within(panel()).getByText(RESURRECTION_WINDOW_TEXT)).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: /Ressuscitar/ })).toBeEnabled();
    expect(within(panel()).getByRole('button', { name: 'Guardar' })).toBeEnabled();
    expect(screen.queryByRole('region', { name: 'Ações' })).not.toBeInTheDocument();
    expect(panel()).toHaveFocus();
  });

  it('Guardar manda PASS', async () => {
    const m = mount(WINDOW);
    await m.user.click(within(panel()).getByRole('button', { name: 'Guardar' }));
    expect(acts(m)).toEqual([{ type: 'PASS' }]);
    expect(applyAction(m.game, 'p1', { type: 'PASS' }).ok).toBe(true);
  });

  it('Ressuscitar abre o cemitério; a fileira mostra a troca e o total, e a protegida não tem botão', async () => {
    const m = mount(WINDOW);
    await m.user.click(within(panel()).getByRole('button', { name: /Ressuscitar/ }));
    const dialog = screen.getByRole('dialog');
    await m.user.click(within(dialog).getAllByRole('button').find((b) => b.closest('li') !== null)!);
    const rows = within(dialog).getByRole('list', { name: 'Fileiras' });
    const defense = within(rows).getByRole('button', { name: /Defesa/ });
    expect(defense).toHaveAccessibleName(`Defesa ${resurrectReplaceDetail(m.view.self.defenseRow[6]!)} · ${resurrectTotalText(37, 38)}`);
    expect(within(rows).queryByRole('button', { name: /Ataque/ })).not.toBeInTheDocument();
    expect(within(dialog).getByText(resurrectProtectedText('ATK', m.view.self.attackRow[6]!))).toBeInTheDocument();
    await m.user.click(defense);
    const sent = acts(m);
    expect(sent).toEqual([{ type: 'RESURRECT', cardId: m.view.graveyard[0]!.id, row: 'DEF' }]);
    expect(applyAction(m.game, 'p1', sent[0]!).ok).toBe(true);
  });

  it('o oponente vê só a espera, sem botões', () => {
    mount({ ...WINDOW, phase: { kind: 'RESURRECTION', player: 'p2', next: null } });
    expect(within(panel()).getByText('Duda formou quadra e decide se ressuscita agora')).toBeInTheDocument();
    expect(within(panel()).queryAllByRole('button')).toHaveLength(0);
  });

  it('sem violações sérias de acessibilidade', async () => {
    const { container } = mount(WINDOW);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('na fase principal, com as duas últimas da quadra, Ressuscitar abre o cemitério e diz por quê', async () => {
    const m = mount({
      round: 5,
      self: { attackRow: [2, 3, 4, 7, 7, 7, 7], defenseRow: [2, 3, 9, 9, 9, 6, 9], resurrections: [{ row: 'ATK', value: 7 }] },
      graveyard: [10],
    });
    await m.user.click(screen.getByRole('button', { name: /Ressuscitar/ }));
    expect(within(screen.getByRole('dialog')).getByText(RESURRECT_ALL_PROTECTED_TEXT)).toBeInTheDocument();
  });
});
