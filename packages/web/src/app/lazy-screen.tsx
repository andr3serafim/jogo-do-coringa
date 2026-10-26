// As telas que chegam sob demanda (`React.lazy`) e a fronteira que cobre o `import()` que falha. O pedaço de uma tela pode não
// chegar (a rede caiu no meio, o deploy novo tirou o arquivo velho do ar): o `lazy` então lança o erro do `import()` na hora de
// desenhar, e sem esta fronteira ele cairia no "Algo deu errado" do app, que fala de "lugar na sala" e não ajuda. Aqui a rota mostra
// que a tela não abriu e oferece "Atualizar", que baixa a página nova (e os pedaços novos).
//
// A fronteira só trata a falha do `import()`: o `lazyScreen` a marca com `ScreenLoadError`, e qualquer outro erro (a tela que
// chegou e quebra ao desenhar) é lançado de novo, para a `ErrorBoundary` do app. Os textos moram no `copy.ts`, que é do
// JavaScript inicial: um texto do pedaço que falhou não chegaria.
import { Component, lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { PAST_GAMES_LABEL, REFRESH_LABEL, SCREEN_LOAD_FAILED_TEXT } from '../model/copy.ts';
import { Button, Panel, Screen, Title } from '../ui/parts.tsx';

/** O `import()` de uma tela falhou (a causa, o erro do navegador, vai em `cause`). */
export class ScreenLoadError extends Error {
  constructor(cause: unknown) {
    super('o pedaço da tela não chegou', { cause });
    this.name = 'ScreenLoadError';
  }
}

/** Um `React.lazy` cujo `import()` que falha vira `ScreenLoadError`. */
export function lazyScreen<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): LazyExoticComponent<ComponentType<P>> {
  return lazy(() =>
    load().catch((cause: unknown) => {
      throw new ScreenLoadError(cause);
    }),
  );
}

interface Props {
  children: ReactNode;
  /** O título da tela que não abriu (padrão: "Partidas anteriores", as duas telas do histórico). O texto vem do `copy.ts`, do JavaScript inicial. */
  title?: string;
  /** Recarrega a página (padrão: `location.reload`). */
  reload?: () => void;
}

interface State {
  /** O que a fronteira pegou (`null`: nada). Embrulhado, para um erro lançado como `null` ou `undefined` também contar. */
  caught: { error: unknown } | null;
}

export class ScreenBoundary extends Component<Props, State> {
  state: State = { caught: null };

  static getDerivedStateFromError(error: unknown): State {
    return { caught: { error } };
  }

  #reload = (): void => {
    (this.props.reload ?? (() => window.location.reload()))();
  };

  render(): ReactNode {
    const { caught } = this.state;
    if (caught === null) return this.props.children;
    // Não é a falha do `import()`: segue para a fronteira de cima (o React procura a próxima quando esta lança ao desenhar).
    if (!(caught.error instanceof ScreenLoadError)) throw caught.error instanceof Error ? caught.error : new Error(String(caught.error));
    return (
      <Screen>
        <Title focusOnMount>{this.props.title ?? PAST_GAMES_LABEL}</Title>
        <Panel>
          <p>{SCREEN_LOAD_FAILED_TEXT}</p>
          <div>
            <Button onClick={this.#reload}>{REFRESH_LABEL}</Button>
          </div>
        </Panel>
      </Screen>
    );
  }
}
