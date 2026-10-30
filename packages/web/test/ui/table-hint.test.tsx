// A dica do tutorial na `Table` (plano da fatia 4, tarefa 4): onde o painel mora (no alto da coluna do histórico no PC; no fluxo
// acima dos campos, dentro do contêiner que rola, no celular e no tablet) e qual zona ganha o contorno parado (`data-dica`).
// O desenho do contorno é CSS (`styles.css`): o jsdom só confere de quem é o atributo. A faixa "Tutorial" também.
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../../src/model/session.ts';
import type { HintZone } from '../../src/model/tutorial.ts';
import { PC_QUERY } from '../../src/ui/table/History.tsx';
import { Table, type TableProps } from '../../src/ui/table/Table.tsx';
import { FakeConnection, scenarioAt, stateMessage } from '../fixtures.ts';
import { roomMessage } from './support.tsx';

const seatOf = (playerId: 'p1' | 'p2', nickname: string) => ({ playerId, nickname, connected: true, ready: true, wantsRematch: false });

afterEach(() => {
  vi.unstubAllGlobals();
});

function mount(props: Partial<TableProps> = {}) {
  const { view } = scenarioAt({ self: { hand: ['K', 'J'], attackRow: [8, 4], defenseRow: [3] }, opponent: { attackRow: [6], defenseRow: [5] } });
  const room = roomMessage({ status: 'PLAYING', seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda')] });
  const connection = new FakeConnection({ playerId: 'p1', room, state: stateMessage(view), now: 0 });
  const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
  return render(
    <Table
      snapshot={session.snapshot()}
      remainingMs={(deadline) => session.remainingMs(deadline)}
      actionBar={<section aria-label="Painel de baixo">a barra</section>}
      {...props}
    />,
  );
}

const panel = <section aria-label="Dica">o texto da dica</section>;
const outlined = () => [...document.querySelectorAll('[data-dica]')];
const asPc = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === PC_QUERY, addEventListener() {}, removeEventListener() {} }));

describe('a dica na mesa: o contorno de cada zona', () => {
  it('rows: as duas fileiras suas, e nenhuma do oponente', () => {
    mount({ hint: { zone: 'rows', panel } });
    const [rows] = outlined();
    expect(outlined()).toHaveLength(1);
    expect(rows).toHaveAttribute('data-dica', 'rows');
    expect(rows).toContainElement(screen.getByRole('group', { name: 'Sua fileira de ataque' }));
    expect(rows).toContainElement(screen.getByRole('group', { name: 'Sua fileira de defesa' }));
    expect(rows).not.toContainElement(screen.getByRole('group', { name: 'Fileira de ataque de Duda' }));
  });

  it('hand: a mão', () => {
    mount({ hint: { zone: 'hand', panel } });
    expect(outlined()).toEqual([screen.getByRole('list', { name: 'Sua mão' })]);
    expect(outlined()[0]).toHaveAttribute('data-dica', 'hand');
  });

  it.each<HintZone>(['equip', 'order', 'actionBar', 'reaction'])('%s: o recipiente do painel de baixo, e só ele', (zone) => {
    mount({ hint: { zone, panel } });
    expect(outlined()).toHaveLength(1);
    expect(outlined()[0]).toHaveAttribute('data-dica', zone);
    expect(outlined()[0]).toContainElement(screen.getByRole('region', { name: 'Painel de baixo' }));
    // O contorno vai no recipiente, e não no painel que recebe o foco por código.
    expect(outlined()[0]).not.toBe(screen.getByRole('region', { name: 'Painel de baixo' }));
  });

  it.each([['end'], [null]] as const)('%s: nenhum contorno (o painel de fim é o diálogo; sem zona, sem destaque)', (zone) => {
    mount({ hint: { zone, panel } });
    expect(outlined()).toEqual([]);
  });

  it('sem `hint`, nada de painel nem de contorno', () => {
    mount();
    expect(outlined()).toEqual([]);
    expect(screen.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();
  });
});

describe('a dica na mesa: o lugar do painel', () => {
  it('celular e tablet: primeiro filho dos campos, um só, e não na coluna do histórico', () => {
    mount({ hint: { zone: null, panel } });
    const fields = document.querySelector('[data-campos]')!;
    expect(screen.getAllByRole('region', { name: 'Dica' })).toHaveLength(1);
    expect(fields.firstElementChild).toBe(screen.getByRole('region', { name: 'Dica' }));
    expect(screen.getByRole('complementary', { name: 'Histórico da partida', hidden: true })).not.toContainElement(
      screen.getByRole('region', { name: 'Dica' }),
    );
  });

  it('PC: logo abaixo do cabeçalho da coluna do histórico, e fora dos campos', () => {
    asPc();
    mount({ hint: { zone: null, panel } });
    const aside = screen.getByRole('complementary', { name: 'Histórico da partida' });
    expect(screen.getAllByRole('region', { name: 'Dica' })).toHaveLength(1);
    expect(aside).toContainElement(screen.getByRole('region', { name: 'Dica' }));
    expect(document.querySelector('[data-campos]')).not.toContainElement(screen.getByRole('region', { name: 'Dica' }));
    expect(within(aside).getByRole('heading', { name: 'Histórico' }).parentElement?.nextElementSibling).toBe(
      screen.getByRole('region', { name: 'Dica' }),
    );
  });
});

describe('a dica na mesa: onde o foco cai', () => {
  it('o título da mesa é focável por código (e fora do Tab): é para onde o painel da dica devolve o foco sem painel de baixo', () => {
    mount();
    const title = screen.getByRole('heading', { name: 'Mesa da partida' });
    expect(title).toHaveAttribute('tabindex', '-1');
    expect(title.closest('main')).toHaveAttribute('aria-label', 'Mesa');
  });
});

describe('a dica na mesa: a faixa do tutorial', () => {
  it('"Tutorial, sem relógio" no lugar do nível do bot', () => {
    mount({ training: 'facil', tutorial: true });
    const band = within(screen.getByRole('region', { name: 'Situação da rodada' }));
    expect(band.getByText('Tutorial, sem relógio')).toBeInTheDocument();
    expect(band.queryByText(/Treino/)).not.toBeInTheDocument();
  });

  it('sem `tutorial`, o treino segue dizendo o nível', () => {
    mount({ training: 'facil' });
    expect(within(screen.getByRole('region', { name: 'Situação da rodada' })).getByText('Treino · Fácil, sem relógio')).toBeInTheDocument();
  });
});
