// Peças compartilhadas das telas fora da mesa e dos diálogos da partida (spec §10). Dentro de uma tela de menu (`Screen`, que é a
// `MenuScreen` do Folheto, spec 2026-11-18-menus-folheto-design.md §5) elas vestem o Folheto: o título com a textura, o painel de papel,
// os carimbos da mesa, o campo e a chave do menu. Fora dela — o fim, a dica e o menu da partida — a roupa de antes (os botões e a
// tipografia da partida ficam para depois, decisoes.md 2026-11-18 (4)). Alvos de toque ≥ 44 px; campos de texto com 16 px.
import { useEffect, useId, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react';
import { navigate } from '../app/router.ts';
import { SWITCH_OFF, SWITCH_ON } from '../model/copy.ts';
import { useInMenu } from './menu/menu-theme.tsx';
import { MenuScreen } from './menu/MenuScreen.tsx';
import { MenuField, MenuSwitch, MenuTitle, StampButton } from './menu/parts.tsx';

/** A tela inteira fora da mesa: a do Folheto, no fundo do tema (rosa ou verde). */
export function Screen({ children }: { children: ReactNode }) {
  return <MenuScreen>{children}</MenuScreen>;
}

/**
 * O título da tela. Com `focusOnMount` (as telas que a rota troca por inteiro, sem recarregar a página) o foco vai a ele ao
 * abrir, sem rolar a página: o teclado e o leitor de tela começam pela tela nova, e não pelo botão que a abriu, que já saiu de
 * cena. Só ao montar: um redesenho nunca devolve o foco ao título. Fica fora da ordem do Tab (`tabIndex={-1}`).
 */
export function Title({
  children,
  focusOnMount = false,
  ref: outer,
}: {
  children: ReactNode;
  focusOnMount?: boolean;
  /** Para a tela levar o foco de volta ao título (a lista das partidas, quando a linha que tinha o foco sai). */
  ref?: Ref<HTMLHeadingElement>;
}) {
  const inMenu = useInMenu();
  const ref = useRef<HTMLHeadingElement>(null);
  // O `<h1>` já está na página quando o React chama isto. No menu, quem entrega o título ao `ref` de fora é o `MenuTitle`.
  useImperativeHandle(inMenu ? undefined : outer, () => ref.current!, []);
  useEffect(() => {
    if (focusOnMount && !inMenu) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount, inMenu]);
  if (inMenu) {
    return (
      <MenuTitle focusOnMount={focusOnMount} ref={outer}>
        {children}
      </MenuTitle>
    );
  }
  return (
    <h1
      ref={ref}
      tabIndex={focusOnMount ? -1 : undefined}
      className="font-madeira text-4xl uppercase leading-tight tablet:text-5xl"
    >
      {children}
    </h1>
  );
}

/** Folha de papel com borda de carimbo para agrupar um formulário ou uma mensagem. */
export function Panel({ children, label }: { children: ReactNode; label?: string }) {
  const inMenu = useInMenu();
  if (inMenu) {
    return (
      <section aria-label={label} className="menu-painel">
        {children}
      </section>
    );
  }
  return (
    <section aria-label={label} className="flex flex-col gap-4 border-4 border-tinta bg-papel p-5">
      {children}
    </section>
  );
}

const BUTTON_BASE =
  'min-h-11 border-4 px-5 py-2 font-madeira text-lg uppercase tracking-wide disabled:cursor-wait disabled:opacity-60';
/** `danger`: a ação sem volta (apagar partidas), no vermelho do Desistir do menu. */
const BUTTON_TONES = {
  primary: 'border-tinta bg-ouro text-tinta',
  secondary: 'border-tinta bg-papel text-tinta',
  danger: 'border-vermelho bg-papel text-vermelho',
} as const;

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ComponentPropsWithoutRef<'button'> & { variant?: keyof typeof BUTTON_TONES }) {
  const inMenu = useInMenu();
  if (inMenu) {
    const tone = variant === 'primary' ? 'gold' : variant === 'danger' ? 'danger' : 'paper';
    return <StampButton tone={tone} className={className} {...rest} />;
  }
  return <button type="button" className={`${BUTTON_BASE} ${BUTTON_TONES[variant]} ${className}`} {...rest} />;
}

/**
 * Um link para outra tela do site: um `<a href>` de verdade (abre em outra aba, mostra o destino), que no clique simples
 * navega pelo roteador, sem recarregar a página. O clique com Ctrl, Cmd ou Shift, ou com outro botão do mouse, fica com o navegador.
 */
export function AppLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={to}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigate(to);
      }}
      className={`inline-flex min-h-11 items-center font-bold underline ${className}`}
    >
      {children}
    </a>
  );
}

export function TextField({
  label,
  hint,
  error,
  ...rest
}: Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'> & { label: string; hint?: string; error?: string | null }) {
  const inMenu = useInMenu();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-erro`;
  const described = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  if (inMenu) return <MenuField label={label} hint={hint} error={error} {...rest} />;
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
  const inMenu = useInMenu();
  const labelId = useId();
  const hintId = useId();
  if (inMenu) return <MenuSwitch label={label} checked={checked} onChange={onChange} disabled={disabled} hint={hint} />;
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
