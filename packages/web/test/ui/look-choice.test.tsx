// O seletor da aparência (decks e raças, fatia 1, Task 5): dois grupos de rádio no molde do HpChoice, a trava do Cordel e a amostra.
import { DEFAULT_LOOK, type Look } from '@coringa/protocol';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LOOK_DECK_LABEL, LOOK_LOCK_NOTE, LOOK_RACE_LABEL } from '../../src/model/copy.ts';
import type { LooksValue } from '../../src/ui/cards/looks-context.ts';
import { LookChoice } from '../../src/ui/LookChoice.tsx';
import { seriousViolations } from './support.tsx';

const PACKS: LooksValue['packs'] = {
  bestiario: { '03': '/arte/03-aranha.webp', '10': '/arte/10-dragao.webp' },
  egipcio: { K: '/arte/k-mascara.webp' },
};

/** O seletor controlado, como o Início e o menu o usam: o valor mora em quem chama. */
function Harness({ initial = DEFAULT_LOOK, onChange, note }: { initial?: Look; onChange?: (look: Look) => void; note?: string }) {
  const [look, setLook] = useState<Look>(initial);
  return (
    <LookChoice
      value={look}
      note={note}
      packs={PACKS}
      onChange={(next) => {
        setLook(next);
        onChange?.(next);
      }}
    />
  );
}

const deck = () => within(screen.getByRole('group', { name: LOOK_DECK_LABEL }));
const race = () => within(screen.getByRole('group', { name: LOOK_RACE_LABEL }));

describe('o seletor da aparência', () => {
  it('os dois grupos, com os nomes de cada opção', () => {
    render(<Harness />);
    expect(deck().getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual([
      'Cordel',
      'Bestiário',
      'Celestial',
    ]);
    expect(race().getAllByRole('radio').map((radio) => radio.closest('label')?.textContent)).toEqual(['Bufão', 'Egípcio']);
    expect(deck().getByRole('radio', { name: 'Cordel' })).toBeChecked();
    expect(race().getByRole('radio', { name: 'Bufão' })).toBeChecked();
  });

  it('escolher o Bestiário avisa com a aparência nova', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await user.click(deck().getByRole('radio', { name: 'Bestiário' }));
    expect(onChange).toHaveBeenLastCalledWith({ deck: 'bestiario', race: 'bufao' });
    expect(deck().getByRole('radio', { name: 'Bestiário' })).toBeChecked();
  });

  it('as setas trocam a opção do grupo', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    deck().getByRole('radio', { name: 'Cordel' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(deck().getByRole('radio', { name: 'Bestiário' })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith({ deck: 'bestiario', race: 'bufao' });
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith({ deck: 'celestial', race: 'bufao' });
  });

  it('o espaço marca a opção focada', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={{ deck: 'bestiario', race: 'bufao' }} onChange={onChange} />);
    race().getByRole('radio', { name: 'Egípcio' }).focus();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith({ deck: 'bestiario', race: 'egipcio' });
  });

  it('com o Cordel, o Egípcio fica desligado e uma linha diz por quê', () => {
    render(<Harness />);
    expect(race().getByRole('radio', { name: 'Egípcio' })).toBeDisabled();
    expect(screen.getByText(LOOK_LOCK_NOTE)).toBeInTheDocument();
  });

  it('fora do Cordel, o Egípcio liga e a linha some', () => {
    render(<Harness initial={{ deck: 'celestial', race: 'bufao' }} />);
    expect(race().getByRole('radio', { name: 'Egípcio' })).toBeEnabled();
    expect(screen.queryByText(LOOK_LOCK_NOTE)).not.toBeInTheDocument();
  });

  it('voltar ao Cordel com o Egípcio marcado devolve o Bufão (a trava)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={{ deck: 'bestiario', race: 'egipcio' }} onChange={onChange} />);
    await user.click(deck().getByRole('radio', { name: 'Cordel' }));
    expect(onChange).toHaveBeenLastCalledWith({ deck: 'cordel', race: 'bufao' });
    expect(race().getByRole('radio', { name: 'Bufão' })).toBeChecked();
  });

  it('a amostra: três cartas (uma baixa, uma alta e o K), com arte quando os pacotes vêm prontos', () => {
    const { container, rerender } = render(<LookChoice value={DEFAULT_LOOK} onChange={() => undefined} packs={PACKS} />);
    const sample = () => container.querySelectorAll('[data-amostra] [data-card-id]');
    expect(sample()).toHaveLength(3);
    expect(container.querySelectorAll('[data-amostra] img')).toHaveLength(0);
    rerender(<LookChoice value={{ deck: 'bestiario', race: 'egipcio' }} onChange={() => undefined} packs={PACKS} />);
    expect([...container.querySelectorAll('[data-amostra] img')].map((img) => img.getAttribute('src'))).toEqual([
      '/arte/03-aranha.webp',
      '/arte/10-dragao.webp',
      '/arte/k-mascara.webp',
    ]);
  });

  it('a nota de quem chama aparece embaixo', () => {
    render(<Harness note="Por enquanto vale no treino." />);
    expect(screen.getByText('Por enquanto vale no treino.')).toBeInTheDocument();
  });

  it('o axe limpo', async () => {
    const { container } = render(<Harness initial={{ deck: 'bestiario', race: 'egipcio' }} note="Uma nota." />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
