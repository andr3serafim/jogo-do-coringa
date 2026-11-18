// As peças das telas fora da mesa no Folheto (spec 2026-11-18-menus-folheto-design.md §4): o título com a mini carta, o painel de papel,
// os carimbos (a classe `.carimbo` da mesa), o campo e a chave. As de `ui/parts.tsx` seguem para a partida (o fim, a dica, o menu dela).
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { navigate } from '../../app/router.ts';
import { HOME_LABEL, SWITCH_OFF, SWITCH_ON } from '../../model/copy.ts';
import { MiniCard, type MiniCardKind } from './MiniCard.tsx';

/** O clique simples num link do site navega pelo roteador; com Ctrl, Cmd, Shift ou outro botão, fica com o navegador. */
export function followLink(to: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(to);
  };
}

export interface MenuTitleProps {
  children: ReactNode;
  /** A linha curta embaixo do nome. */
  line?: string;
  /** A mini carta da entrada, ao lado do nome. */
  card?: MiniCardKind;
  /** Nas telas que a rota troca: o foco vai ao título ao abrir, sem rolar (como o `Title` de `ui/parts.tsx`). */
  focusOnMount?: boolean;
  ref?: Ref<HTMLHeadingElement>;
}

/** O `<h1>` da tela: o nome em tipo de madeira, com a textura da mesa. */
export function MenuTitle({ children, line, card, focusOnMount = false, ref: outer }: MenuTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useImperativeHandle(outer, () => ref.current!, []);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  return (
    <header className="menu-titulo">
      {card ? <MiniCard kind={card} /> : null}
      <div className="min-w-0">
        <h1 ref={ref} tabIndex={focusOnMount ? -1 : undefined} className="menu-titulo-nome textura">
          {children}
        </h1>
        {line ? <p className="menu-titulo-linha">{line}</p> : null}
      </div>
    </header>
  );
}

/** O painel de papel, com o título em tipo de madeira. `order` dá o tempo da entrada. */
export function MenuPanel({ title, icon, order = 0, children }: { title: string; icon?: ReactNode; order?: number; children: ReactNode }) {
  return (
    <section aria-label={title} className="menu-painel" style={{ '--d': order } as CSSProperties}>
      <h2 className="menu-painel-tit">
        {icon}
        <span className="textura">{title}</span>
      </h2>
      {children}
    </section>
  );
}

type StampLook = { tone?: 'paper' | 'gold' | 'danger'; size?: 'small' | 'big' };

function stampClass({ tone = 'paper', size = 'big' }: StampLook, extra = ''): string {
  return `carimbo menu-carimbo ${size === 'big' ? 'carimbo-grande' : ''} ${tone === 'gold' ? 'carimbo-ouro' : 'carimbo-papel'} ${extra}`;
}

/** O carimbo de madeira da mesa, como botão. */
export function StampButton({ tone, size, className = '', ...rest }: ComponentPropsWithoutRef<'button'> & StampLook) {
  return (
    <button
      type="button"
      className={stampClass({ tone, size }, className)}
      data-tamanho={size === 'small' ? 'pequeno' : 'grande'}
      data-tom={tone ?? 'paper'}
      {...rest}
    />
  );
}

/** O carimbo como link para outra tela do site. */
export function StampLink({ to, tone, size, className = '', children }: StampLook & { to: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={to}
      onClick={followLink(to)}
      className={stampClass({ tone, size }, className)}
      data-tamanho={size === 'small' ? 'pequeno' : 'grande'}
      data-tom={tone ?? 'paper'}
    >
      {children}
    </a>
  );
}

/** O carimbo pequeno "Início", no alto das telas de cada entrada. */
export function BackHome() {
  return (
    <StampLink to="/" size="small" className="menu-voltar">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {HOME_LABEL}
    </StampLink>
  );
}

/** O campo de texto (a mesma API do `TextField`): rótulo, dica e erro ligados ao campo, e 16 px para o celular não ampliar. */
export function MenuField({
  label,
  hint,
  error,
  ...rest
}: Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'className'> & { label: string; hint?: string; error?: string | null }) {
  const id = useId();
  const hintId = `${id}-dica`;
  const errorId = `${id}-erro`;
  const described = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <div className="menu-campo">
      <label htmlFor={id} className="menu-rotulo">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described === '' ? undefined : described}
        className="menu-entrada text-base"
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="menu-dica">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="menu-erro">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface MenuSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: ReactNode;
  icon?: ReactNode;
}

/** A chave (a mesma API do `Switch`): caixa nativa com `role="switch"`, o estado também escrito. */
export function MenuSwitch({ label, checked, onChange, disabled = false, hint, icon }: MenuSwitchProps) {
  const labelId = useId();
  const hintId = useId();
  return (
    <label className="menu-chave">
      <span className="flex min-w-0 items-center gap-2.5">
        {icon}
        <span className="menu-chave-texto">
          <span id={labelId}>{label}</span>
          {hint ? (
            <span id={hintId} className="menu-chave-dica">
              {hint}
            </span>
          ) : null}
        </span>
      </span>
      <span className="menu-chave-lado">
        <span aria-hidden="true" className="menu-chave-estado">
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
          className="sr-only"
        />
        <span aria-hidden="true" className="menu-trilho-chave" />
      </span>
    </label>
  );
}
