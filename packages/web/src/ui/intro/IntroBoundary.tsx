// A fronteira da abertura (decisoes.md 2026-11-16 (5)): a abertura é enfeite, e se ela quebrar ao desenhar, o menu abre na hora, em vez
// de o app inteiro cair no "Algo deu errado". Mora fora do pedaço da abertura, no JavaScript inicial, com o `App`.
import { Component, type ReactNode } from 'react';

export class IntroBoundary extends Component<{ children: ReactNode; onError(): void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
