// Peças compartilhadas das telas de início e de entrada e do menu da partida, no tema da Peleja (spec §10): capa colorida,
// tinta, títulos em tipo de madeira e botões ouro. Alvos de toque ≥ 44 px; campos de texto com 16 px.
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { SWITCH_OFF, SWITCH_ON } from '../model/copy.ts';

/** A tela inteira: um `<main>` sobre a capa rosa (a sua) ou verde (a do oponente). */
export function Screen({ children, tone = 'voce' }: { children: ReactNode; tone?: 'voce' | 'oponente' }) {
  return (
    <main
      className={`min-h-dvh px-4 py-8 text-tinta ${tone === 'voce' ? 'bg-capa-voce' : 'bg-capa-oponente'}`}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">{children}</div>
    </main>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="font-madeira text-4xl uppercase leading-tight tablet:text-5xl">{children}</h1>;
}

/** Folha de papel com borda de carimbo para agrupar um formulário ou uma mensagem. */
export function Panel({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <section aria-label={label} className="flex flex-col gap-4 border-4 border-tinta bg-papel p-5">
      {children}
    </section>
  );
}

const BUTTON_BASE =
  'min-h-11 border-4 border-tinta px-5 py-2 font-madeira text-lg uppercase tracking-wide text-tinta disabled:cursor-wait disabled:opacity-60';

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ComponentPropsWithoutRef<'button'> & { variant?: 'primary' | 'secondary' }) {
  const tone = variant === 'primary' ? 'bg-ouro' : 'bg-papel';
  return <button type="button" className={`${BUTTON_BASE} ${tone} ${className}`} {...rest} />;
}

export function TextField({
  label,
  hint,
  error,
  ...rest
}: Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'> & { label: string; hint?: string; error?: string | null }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-erro`;
  const described = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described === '' ? undefined : described}
        className="min-h-11 w-full border-4 border-tinta bg-papel px-3 py-2 text-base text-tinta"
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-bold text-vermelho">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: ReactNode;
}

/** Uma chave: caixa nativa com `role="switch"`. O estado também vem escrito, e não só pela forma. */
export function Switch({ label, checked, onChange, disabled = false, hint }: SwitchProps) {
  const labelId = useId();
  const hintId = useId();
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 border-2 border-tinta px-3 py-1.5 font-bold">
      <span className="flex min-w-0 flex-col">
        <span id={labelId}>{label}</span>
        {hint ? (
          <span id={hintId} className="text-sm font-normal">
            {hint}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span aria-hidden="true" className="text-sm font-normal">
          {checked ? SWITCH_ON : SWITCH_OFF}
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.checked)}
          className="size-6 accent-tinta"
        />
      </span>
    </label>
  );
}
