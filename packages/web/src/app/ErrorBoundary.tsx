// Fronteira de erro (spec §6.5): uma exceção no React mostra "Algo deu errado", com **Recarregar** e
// **Copiar diagnóstico**. O diagnóstico leva o código da sala, o `seq`, a época, a versão e a mensagem, e
// nunca o token (o `diagnostic` ainda mascara qualquer sequência com cara de token que sobrar na mensagem).
// Não há `console.error` de propósito: a mensagem do erro pode carregar dado da sala.
import { PROTOCOL_VERSION } from '@coringa/protocol';
import { Component, type ReactNode } from 'react';
import { diagnostic } from '../model/storage.ts';
import { Button, Panel, Screen, Title } from '../ui/parts.tsx';
import { getDiagnosticContext } from './diagnostic-context.ts';

interface Props {
  children: ReactNode;
  /** Recarrega a página (padrão: `location.reload`). */
  reload?: () => void;
}

interface State {
  error: Error | null;
  /** O diagnóstico, congelado no instante da queda: a tela da sala já saiu de cena quando o jogador o copia. */
  report: string;
  copy: 'idle' | 'copied' | 'failed';
}

const asError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)));

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, report: '', copy: 'idle' };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const { code, seq, epoch } = getDiagnosticContext();
    const message = asError(error).message;
    return {
      error: asError(error),
      report: diagnostic({ code, seq, epoch, version: `protocolo ${PROTOCOL_VERSION}`, message }),
      copy: 'idle',
    };
  }

  #copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(this.state.report);
      this.setState({ copy: 'copied' });
    } catch {
      this.setState({ copy: 'failed' });
    }
  };

  #reload = (): void => {
    (this.props.reload ?? (() => window.location.reload()))();
  };

  render(): ReactNode {
    const { error, report, copy } = this.state;
    if (error === null) return this.props.children;
    return (
      <Screen>
        <Title>Algo deu errado</Title>
        <Panel>
          <p>A tela travou. Recarregar costuma resolver, e o seu lugar na sala continua guardado.</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={this.#reload}>Recarregar</Button>
            <Button variant="secondary" onClick={() => void this.#copy()}>
              Copiar diagnóstico
            </Button>
          </div>
          <p role="status">
            {copy === 'copied' ? 'Diagnóstico copiado.' : null}
            {copy === 'failed' ? 'Não deu para copiar. Selecione o texto abaixo.' : null}
          </p>
          {copy === 'failed' ? (
            <textarea
              readOnly
              aria-label="Diagnóstico"
              value={report}
              rows={6}
              className="w-full border-4 border-tinta bg-papel p-2 text-base text-tinta"
            />
          ) : null}
        </Panel>
      </Screen>
    );
  }
}
