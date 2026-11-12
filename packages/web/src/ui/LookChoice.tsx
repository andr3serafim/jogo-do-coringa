// O seletor da aparência (spec dos decks e raças, §6): dois grupos de rádio no molde do `HpChoice` (rádios escondidos com cara de botão,
// alvo de toque ≥ 44 px, o anel ouro no foco), o Deck e o Coringa, e uma amostra do que está escolhido. Toda troca passa pelo
// `normalizeLook`: com o deck Cordel, o Coringa fica travado no Bufão (§2.1), e uma linha diz por quê.
import type { Card as EngineCard } from '@coringa/engine';
import { DECK_IDS, normalizeLook, RACE_IDS, type Look } from '@coringa/protocol';
import { useId } from 'react';
import { DECK_LABEL, RACE_LABEL } from '../looks/catalog.ts';
import { LOOK_DECK_LABEL, LOOK_LOCK_NOTE, LOOK_RACE_LABEL } from '../model/copy.ts';
import { Card } from './cards/Card.tsx';
import { LooksProvider } from './cards/LooksProvider.tsx';
import type { LooksValue } from './cards/looks-context.ts';

/** A amostra (§6): uma numérica baixa, uma alta e uma especial. */
const SAMPLE: EngineCard[] = [
  { id: 'amostra-3', kind: 'NUM', value: 3, suit: 'copas' },
  { id: 'amostra-10', kind: 'NUM', value: 10, suit: 'espadas' },
  { id: 'amostra-k', kind: 'K', suit: 'paus' },
];

const OPTION =
  'flex min-h-11 flex-1 cursor-pointer items-center justify-center border-4 border-tinta px-3 py-1.5 text-center font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ouro has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50';

interface GroupProps<T extends string> {
  legend: string;
  ids: readonly T[];
  labels: Record<T, string>;
  value: T;
  disabled?: (id: T) => boolean;
  onChange: (id: T) => void;
}

function Group<T extends string>({ legend, ids, labels, value, disabled, onChange }: GroupProps<T>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <label key={id} className={`${OPTION} ${value === id ? 'bg-tinta text-papel' : 'bg-papel text-tinta'}`}>
            <input
              type="radio"
              name={name}
              value={id}
              checked={value === id}
              disabled={disabled?.(id) ?? false}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            {labels[id]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface LookChoiceProps {
  value: Look;
  onChange: (look: Look) => void;
  /** Uma linha embaixo (o Início diz que por enquanto vale no treino: F1). */
  note?: string;
  /** Os pacotes prontos para a amostra (os testes); sem eles, a amostra os pede como a mesa. */
  packs?: LooksValue['packs'];
}

export function LookChoice({ value, onChange, note, packs }: LookChoiceProps) {
  const locked = value.deck === 'cordel';
  const change = (next: Partial<Look>) => onChange(normalizeLook({ ...value, ...next }));
  return (
    <div className="flex flex-col gap-4">
      <Group legend={LOOK_DECK_LABEL} ids={DECK_IDS} labels={DECK_LABEL} value={value.deck} onChange={(deck) => change({ deck })} />
      <Group
        legend={LOOK_RACE_LABEL}
        ids={RACE_IDS}
        labels={RACE_LABEL}
        value={value.race}
        disabled={(race) => locked && race !== 'bufao'}
        onChange={(race) => change({ race })}
      />
      {locked ? <p className="text-sm">{LOOK_LOCK_NOTE}</p> : null}
      <LooksProvider look={value} packs={packs}>
        <div data-amostra aria-hidden="true" className="flex justify-center gap-3">
          {SAMPLE.map((card) => (
            <Card key={card.id} card={card} size="hand" animated={false} ghost />
          ))}
        </div>
      </LooksProvider>
      {note ? <p className="text-sm">{note}</p> : null}
    </div>
  );
}
