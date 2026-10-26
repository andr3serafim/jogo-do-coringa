// A lista local das partidas terminadas (`/partidas`, spec do polimento §4.3). Esqueleto: a Tarefa 6 põe a lista aqui.
// Entra por `React.lazy` (`App.tsx`): fica fora do JavaScript inicial, e por isso a exportação é a `default`.
import { navigate } from '../../app/router.ts';
import { BACK_HOME_LABEL, PAST_GAMES_LABEL } from '../../model/copy.ts';
import { Button, Screen, Title } from '../parts.tsx';

export default function PastGames() {
  return (
    <Screen>
      <Title>{PAST_GAMES_LABEL}</Title>
      <Button variant="secondary" onClick={() => navigate('/')}>
        {BACK_HOME_LABEL}
      </Button>
    </Screen>
  );
}
