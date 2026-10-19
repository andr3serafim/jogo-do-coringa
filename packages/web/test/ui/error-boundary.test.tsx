import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../src/app/ErrorBoundary.tsx';
import { clearDiagnosticContext, setDiagnosticContext } from '../../src/app/diagnostic-context.ts';
import { seriousViolations, TOKEN } from './support.tsx';

function Bomb({ message }: { message: string }): never {
  throw new Error(message);
}

beforeEach(() => {
  // O React registra o erro capturado no console; o teste não precisa dele.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  clearDiagnosticContext();
  vi.restoreAllMocks();
});

describe('fronteira de erro', () => {
  it('sem erro, só renderiza os filhos', () => {
    render(
      <ErrorBoundary>
        <p>tudo bem</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('tudo bem')).toBeInTheDocument();
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
  });

  it('um componente que lança mostra "Algo deu errado", e o diagnóstico copiado não leva o token', async () => {
    const user = userEvent.setup();
    setDiagnosticContext({ code: 'ABC234', seq: 17, epoch: 5 });
    render(
      <ErrorBoundary>
        <Bomb message={`falha ao conectar com o token ${TOKEN}`} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copiar diagnóstico' }));
    const copied = await navigator.clipboard.readText();

    expect(copied).not.toContain(TOKEN);
    expect(copied).toContain('[token oculto]');
    expect(copied).toContain('Sala: ABC234');
    expect(copied).toContain('seq: 17');
    expect(copied).toContain('Época: 5');
    expect(copied).toContain('Versão: protocolo 1');
    expect(screen.getByRole('status')).toHaveTextContent('Diagnóstico copiado.');
  });

  it('sem sala conhecida, o diagnóstico traz travessões e a mensagem', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb message="quebrou" />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Copiar diagnóstico' }));
    const copied = await navigator.clipboard.readText();
    expect(copied).toContain('Sala: —');
    expect(copied).toContain('Mensagem: quebrou');
  });

  it('Recarregar chama a recarga injetada', async () => {
    const reload = vi.fn();
    render(
      <ErrorBoundary reload={reload}>
        <Bomb message="quebrou" />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('sem área de transferência, mostra o texto para copiar à mão', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Bomb message="quebrou" />
      </ErrorBoundary>,
    );
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('negado'));
    await user.click(screen.getByRole('button', { name: 'Copiar diagnóstico' }));
    expect(screen.getByRole('status')).toHaveTextContent('Não deu para copiar');
    expect((screen.getByRole('textbox', { name: 'Diagnóstico' }) as HTMLTextAreaElement).value).toContain('Mensagem: quebrou');
  });

  it('um valor que não é Error também vira diagnóstico', async () => {
    function Throws(): never {
      // O ponto do teste é lançar algo que não é Error.
      throw 'texto solto';
    }
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <Throws />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Copiar diagnóstico' }));
    expect(await navigator.clipboard.readText()).toContain('Mensagem: texto solto');
  });

  it('axe: sem violações sérias nem críticas', async () => {
    const { container } = render(
      <ErrorBoundary>
        <Bomb message="quebrou" />
      </ErrorBoundary>,
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
