import { navigate } from '../../app/router.ts';
import { Panel, Screen, Title } from '../parts.tsx';

/** "Página não encontrada", com link para o início (spec §2.1). */
export function NotFound() {
  return (
    <Screen>
      <Title>Página não encontrada</Title>
      <Panel>
        <p>Esse endereço não leva a lugar nenhum.</p>
        <a
          href="/"
          onClick={(event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            navigate('/');
          }}
          className="inline-flex min-h-11 items-center font-bold underline"
        >
          Voltar ao início
        </a>
      </Panel>
    </Screen>
  );
}
