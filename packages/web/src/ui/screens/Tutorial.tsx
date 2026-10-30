// O tutorial (`/tutorial`, spec do polimento, fatia 4): uma partida de treino de verdade contra o bot Fácil, na semente em que as
// especiais aparecem cedo (`TUTORIAL_SEED`), com dicas por situação num painel. É a mesma mesa do treino (`local-game.tsx` cria a
// sala e a sessão), com a faixa "Tutorial" e o painel de dica. Não é um roteiro: o jogador joga o que quiser, e a dica certa
// aparece quando a situação acontece (`tutorialHint`, no modelo). A ordem não sai sozinha aqui (`autoOrder: false`): quem lê a dica da
// ordem escolhe sem pressa, na partida toda.
//
// Esta tela chega por `React.lazy` (`App.tsx`), e é a única que importa o painel, os textos e a semente: nada disso pesa no
// JavaScript inicial (`scripts/smoke.ts` confere). A semente é sempre a do tutorial, nunca a da URL, e as dicas recomeçam a cada
// vez que a tela abre (o que fica guardado é só `coringa:tutorial`: `done` quando a dica do fim aparece, `skipped` no "Pular").
import { TUTORIAL_SEED } from '@coringa/sim/tutorial';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BACK_HOME_LABEL, TRAINING_CONCEDE_WARNING } from '../../model/copy.ts';
import type { TrainingLevel } from '../../model/local-room.ts';
import type { Session } from '../../model/session.ts';
import { saveTutorialState, type KeyValueStore } from '../../model/storage.ts';
import { TUTORIAL_FAILED_TITLE, TUTORIAL_LOADING_TEXT } from '../../model/tutorial-copy.ts';
import { acknowledgeHint, advanceHint, hintHolding, NO_HINT, type HintFlow } from '../../model/tutorial.ts';
import { EndHintNote, HintPanel } from '../table/HintPanel.tsx';
import { PlayTable } from '../table/PlayTable.tsx';
import type { TableHint } from '../table/Table.tsx';
import { useSession } from '../useSession.ts';
import {
  defaultReload,
  goHome,
  loadLocalRoom,
  LocalRoomFailed,
  LocalRoomLoading,
  openLocalRoom,
  useGameDiagnostic,
  type LocalRoomModule,
} from './local-game.tsx';

/** O tutorial joga contra o Fácil (spec §5.1). */
const LEVEL: TrainingLevel = 'facil';

export interface TutorialProps {
  /** Onde as preferências do menu e o `coringa:tutorial` ficam guardados. */
  store: KeyValueStore;
  /** Carrega o módulo da sala local (os testes trocam). Tem que ser estável entre renderizações. */
  load?: () => Promise<LocalRoomModule>;
  /** Recarrega a página, se o módulo não carregar (padrão: `location.reload`). Os testes trocam. */
  reload?: () => void;
}

type Step =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'playing'; session: Session; seedOf: (gameNo: number) => string };

export default function Tutorial({ store, load = loadLocalRoom, reload = defaultReload }: TutorialProps) {
  const [step, setStep] = useState<Step>({ kind: 'loading' });

  // A sala nasce e morre com o efeito (como no treino): vale para o modo estrito, que monta duas vezes, e para o módulo que chega
  // depois de a tela sair de cena (`live`): nesse caso não nasce sala nenhuma, e o timer do bot não vaza.
  useEffect(() => {
    let live = true;
    let dispose: (() => void) | null = null;
    load()
      .then((module) => {
        if (!live) return;
        const game = openLocalRoom(module, { seed: TUTORIAL_SEED, level: LEVEL, store, autoOrder: false });
        dispose = game.dispose;
        setStep({ kind: 'playing', session: game.session, seedOf: game.seedOf });
      })
      .catch(() => {
        dispose?.();
        dispose = null;
        if (live) setStep({ kind: 'failed' });
      });
    return () => {
      live = false;
      dispose?.();
    };
  }, [load, store]);

  switch (step.kind) {
    case 'loading':
      return <LocalRoomLoading>{TUTORIAL_LOADING_TEXT}</LocalRoomLoading>;
    case 'failed':
      return <LocalRoomFailed title={TUTORIAL_FAILED_TITLE} reload={reload} />;
    case 'playing':
      return <TutorialTable session={step.session} seedOf={step.seedOf} store={store} />;
  }
}

interface TutorialTableProps {
  session: Session;
  seedOf: (gameNo: number) => string;
  store: KeyValueStore;
}

function TutorialTable({ session, seedOf, store }: TutorialTableProps) {
  useGameDiagnostic(session, 'TUTORIAL', LEVEL, seedOf);
  const { state } = useSession(session);
  // A dica no painel e as vistas moram só aqui (recarregar recomeça); a cada `state` novo o fluxo avança (ajuste durante o
  // desenho, como a `Table` faz com as linhas do histórico: sem um desenho a mais com a dica velha).
  const [flow, setFlow] = useState<HintFlow>(NO_HINT);
  const [lastState, setLastState] = useState<typeof state>(null);
  if (state !== lastState) {
    setLastState(state);
    if (state !== null) setFlow(advanceHint(flow, state.view, state.events, state.epoch));
  }
  const [skipped, setSkipped] = useState(false);
  // Com a dica do fim vista (ou saída do painel), o tutorial acabou: nada depois dela.
  const finished = flow.current === null && flow.seen.has('end');
  const shown = !skipped && !finished;

  // A dica do fim vai dentro do painel de fim da partida (o `EndPanel` é um diálogo modal: uma dica fora dele ficaria inerte atrás
  // dele, sem clique, sem foco e fora da árvore de acessibilidade). Aparecer ali é chegar ao fim do tutorial: `done` fica guardado
  // nesse momento, sem "Entendi". Sem o painel de fim aberto (as batidas ainda tocam, ou a pessoa recolheu o painel), a nota não
  // existe, e o tutorial só fica concluído quando ela aparece.
  const current = flow.current;
  const markDone = useCallback(() => saveTutorialState(store, 'done'), [store]);

  // O contorno só vale enquanto a situação da dica vale: uma dica que ficou no painel depois de a situação passar não contorna
  // (por exemplo, a do Equipar não contorna o painel da ordem).
  const holding = useMemo(
    () => (state !== null && current !== null ? hintHolding(state.view, state.events, current) : null),
    [state, current],
  );

  // `open` (que segura a rolagem da vez de atacar, no celular) é só da dica que chegou nesta época: uma que ficou no painel e cuja
  // situação voltou a valer vários turnos depois (o Selvagem na mão, os buffs) não prende a rolagem para sempre.
  const hint: TableHint | undefined = shown
    ? {
        zone: holding?.zone ?? null,
        open: holding !== null && current !== 'end' && flow.epoch === state?.epoch,
        panel: (
          <HintPanel
            hint={current === 'end' ? null : current}
            onGotIt={() => {
              if (state !== null) setFlow(acknowledgeHint(flow, state.view, state.events, state.epoch));
            }}
            onSkip={() => {
              saveTutorialState(store, 'skipped');
              setSkipped(true);
            }}
          />
        ),
      }
    : undefined;

  return (
    <PlayTable
      session={session}
      store={store}
      training={LEVEL}
      tutorial
      hint={hint}
      endNote={shown && current === 'end' ? <EndHintNote onShown={markDone} /> : undefined}
      onNewRoom={goHome}
      newRoomLabel={BACK_HOME_LABEL}
      onExit={goHome}
      concedeWarning={TRAINING_CONCEDE_WARNING}
    />
  );
}
