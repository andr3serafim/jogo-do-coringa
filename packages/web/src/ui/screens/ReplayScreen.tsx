// O visualizador do replay de uma partida da lista (`/partidas/<id>`, spec do polimento §4.3). Esqueleto: a Tarefa 6 põe a mesa
// de vista e os controles aqui. Entra por `React.lazy` (`App.tsx`): fica fora do JavaScript inicial, e por isso a exportação é a `default`.
import { navigate } from '../../app/router.ts';
import { BACK_TO_LIST_LABEL } from '../../model/copy.ts';
import { Panel, Screen, Title } from '../parts.tsx';

export default function ReplayScreen() {
  return (
    <Screen>
      <Title>Replay</Title>
      <Panel>
        <a
          href="/partidas"
          onClick={(event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            navigate('/partidas');
          }}
          className="inline-flex min-h-11 items-center font-bold underline"
        >
          {BACK_TO_LIST_LABEL}
        </a>
      </Panel>
    </Screen>
  );
}
