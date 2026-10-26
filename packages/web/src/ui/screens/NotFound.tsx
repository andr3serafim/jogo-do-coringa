import { AppLink, Panel, Screen, Title } from '../parts.tsx';

/** "Página não encontrada", com link para o início (spec §2.1). */
export function NotFound() {
  return (
    <Screen>
      <Title>Página não encontrada</Title>
      <Panel>
        <p>Esse endereço não leva a lugar nenhum.</p>
        <AppLink to="/">Voltar ao início</AppLink>
      </Panel>
    </Screen>
  );
}
