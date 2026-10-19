// Fechamentos finais da conexão e a tela de cada um (spec §6.3). O token já foi apagado, quando devia, por quem
// chama; aqui só aparece o que o jogador pode fazer.
import { navigate } from '../../app/router.ts';
import { Button, Panel, Screen, Title } from '../parts.tsx';

export type StoppedReason = 'ROOM_GONE' | 'PROTOCOL' | 'OTHER_TAB';

export interface StoppedProps {
  reason: StoppedReason;
  /** "Usar aqui": reconecta, o que derruba a outra aba. */
  onUseHere(): void;
  onReload(): void;
}

export function Stopped({ reason, onUseHere, onReload }: StoppedProps) {
  switch (reason) {
    case 'ROOM_GONE':
      return (
        <Screen>
          <Title>Essa sala não existe mais</Title>
          <Panel>
            <p>Ela expirou ou foi encerrada.</p>
            <Button onClick={() => navigate('/')}>Criar sala</Button>
          </Panel>
        </Screen>
      );
    case 'OTHER_TAB':
      return (
        <Screen>
          <Title>Esta sala está aberta em outra aba</Title>
          <Panel>
            <p>Para jogar aqui, a outra aba vai ser desconectada.</p>
            <Button onClick={onUseHere}>Usar aqui</Button>
          </Panel>
        </Screen>
      );
    case 'PROTOCOL':
      return (
        <Screen>
          <Title>Atualize a página</Title>
          <Panel>
            <p>Saiu uma versão nova do jogo, e esta página ficou para trás.</p>
            <Button onClick={onReload}>Recarregar</Button>
          </Panel>
        </Screen>
      );
  }
}
