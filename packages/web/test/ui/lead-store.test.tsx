// A liderança da mesa (bloco C dos pontos do playtest, ponto 13): quem tem o Ataque maior (e a Defesa maior) ganha o ouro na figura do total. O
// armazém guarda os totais que as fileiras mostram e só avisa as fileiras do tipo que mudou.
import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { leaderOf, LeadProvider, useLead, useReportTotal } from '../../src/ui/table/lead-store.ts';

describe('quem lidera', () => {
  it('só o estritamente maior; no empate, inclusive 0 × 0, ninguém', () => {
    expect(leaderOf(74, 52)).toBe('a');
    expect(leaderOf(52, 74)).toBe('b');
    expect(leaderOf(60, 60)).toBeNull();
    expect(leaderOf(0, 0)).toBeNull();
    expect(leaderOf(0, 5)).toBe('b');
  });
});

describe('o armazém da liderança', () => {
  it('a fileira que lidera sabe, e um total de Ataque que muda não redesenha as fileiras de Defesa', () => {
    const renders = { defense: 0 };
    let setAttack: (total: number) => void = () => {};

    function AttackRow({ player, initial }: { player: 'p1' | 'p2'; initial: number }) {
      const [total, setTotal] = useState(initial);
      if (player === 'p1') setAttack = setTotal;
      useReportTotal(player, 'ATK', total);
      return <span data-testid={`atk-${player}`}>{useLead(player, 'ATK') ? 'lider' : '-'}</span>;
    }
    function DefenseRow({ player, total }: { player: 'p1' | 'p2'; total: number }) {
      useReportTotal(player, 'DEF', total);
      const lead = useLead(player, 'DEF');
      if (player === 'p1') renders.defense += 1;
      return <span data-testid={`def-${player}`}>{lead ? 'lider' : '-'}</span>;
    }

    const view = render(
      <LeadProvider>
        <AttackRow player="p1" initial={52} />
        <AttackRow player="p2" initial={74} />
        <DefenseRow player="p1" total={38} />
        <DefenseRow player="p2" total={26} />
      </LeadProvider>,
    );
    expect(view.getByTestId('atk-p1')).toHaveTextContent('-');
    expect(view.getByTestId('atk-p2')).toHaveTextContent('lider');
    expect(view.getByTestId('def-p1')).toHaveTextContent('lider');
    const before = renders.defense;
    act(() => setAttack(90));
    expect(view.getByTestId('atk-p1')).toHaveTextContent('lider');
    expect(view.getByTestId('atk-p2')).toHaveTextContent('-');
    expect(renders.defense).toBe(before);
    act(() => setAttack(74));
    expect(view.getByTestId('atk-p1')).toHaveTextContent('-');
    expect(view.getByTestId('atk-p2')).toHaveTextContent('-');
  });

  it('sem o provedor, ninguém lidera', () => {
    function Row() {
      useReportTotal('p1', 'ATK', 10);
      return <span data-testid="sem">{useLead('p1', 'ATK') ? 'lider' : '-'}</span>;
    }
    expect(render(<Row />).getByTestId('sem')).toHaveTextContent('-');
  });
});
