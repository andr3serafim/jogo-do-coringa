// A vida inicial da partida (sub-projeto 5, R3): na criação da sala e na escolha do treino. Um grupo de rádios com cara de botões
// grandes (alvo de toque ≥ 44 px); as opções são as do protocolo (`HP_CHOICES`), e o servidor recusa outra. Com `skin="menu"`, a roupa das
// telas fora da mesa (spec 2026-11-18-menus-folheto-design.md §4): carimbos pequenos, a marcada afundada em tinta.
import { DEFAULT_CONFIG } from '@coringa/engine';
import { HP_CHOICES } from '@coringa/protocol';
import { useId } from 'react';
import { HP_CHOICE_LABEL, hpChoiceText } from '../model/copy.ts';

const OPTION =
  'flex min-h-11 flex-1 cursor-pointer items-center justify-center border-4 border-tinta px-3 py-1.5 text-center font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ouro';

export function HpChoice({ value, onChange, skin }: { value: number; onChange: (hp: number) => void; skin?: 'menu' }) {
  const name = useId();
  const menu = skin === 'menu';
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className={menu ? 'menu-legenda' : 'mb-2 font-bold'}>{HP_CHOICE_LABEL}</legend>
      <div className={menu ? 'menu-opcoes' : 'flex flex-wrap gap-2'}>
        {HP_CHOICES.map((hp) => (
          <label
            key={hp}
            data-marcada={menu && value === hp ? '' : undefined}
            className={menu ? 'menu-opcao' : `${OPTION} ${value === hp ? 'bg-tinta text-papel' : 'bg-papel text-tinta'}`}
          >
            <input type="radio" name={name} value={hp} checked={value === hp} onChange={() => onChange(hp)} className="sr-only" />
            <span className="font-texto tabular-nums">{hpChoiceText(hp, hp === DEFAULT_CONFIG.hp)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
