// Treino contra o bot (spec §2.6, §12): a mesma mesa da sala, sobre uma `LocalRoom` que roda no próprio navegador, sem
// servidor, sem lobby e sem relógio. A `Session` é a de sempre, e a `PlayTable` não sabe qual conexão está usando.
//
// O módulo da sala local puxa o bot (`@coringa/sim/bots`), que só o treino usa: ele entra por `import()` dinâmico, num
// chunk à parte, para não pesar no JavaScript inicial (o `scripts/smoke.ts` confere). Aqui só se importam TIPOS dele
// (apagados na compilação). A sala nasce e morre com o efeito: ele cria a sessão e a conexão, e a limpeza solta uma e
// fecha a outra. Isso também vale para o modo estrito, que monta duas vezes, e para um módulo que chega depois de a tela
// sair de cena (`live`): nesse caso não nasce sala nenhuma, e o timer do bot não vaza.
import { useEffect, useState } from 'react';
import { navigate } from '../../app/router.ts';
import { clearDiagnosticContext, setDiagnosticContext } from '../../app/diagnostic-context.ts';
import {
  BACK_HOME_LABEL,
  TRAINING_CONCEDE_WARNING,
  TRAINING_FAILED_TEXT,
  TRAINING_FAILED_TITLE,
  TRAINING_LOADING_TEXT,
} from '../../model/copy.ts';
import { Session } from '../../model/session.ts';
import { loadPrefs, type KeyValueStore } from '../../model/storage.ts';
import { Button, Panel, Screen, Title } from '../parts.tsx';
import { PlayTable } from '../table/PlayTable.tsx';
import { useSession } from '../useSession.ts';

/** O módulo da sala local, com o bot dentro. Só esta chamada o alcança, e só quando o treino abre. */
const loadLocalRoom = () => import('../../model/local-room.ts');

export type LocalRoomModule = Awaited<ReturnType<typeof loadLocalRoom>>;

/** Um número em [0, 1) sorteado pelo navegador (spec §2.6: a semente vem de `crypto.getRandomValues`). */
function randomUnit(): number {
  const source = globalThis.crypto as Crypto | undefined;
  if (!source?.getRandomValues) return Math.random();
  return source.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}

const defaultReload = (): void => window.location.reload();
const goHome = (): void => navigate('/');

export interface TrainingProps {
  /** Onde as preferências do menu (passe automático, movimento reduzido) ficam guardadas. */
  store: KeyValueStore;
  /** Carrega o módulo da sala local (os testes trocam). Tem que ser estável entre renderizações. */
  load?: () => Promise<LocalRoomModule>;
  /** Recarrega a página, se o módulo não carregar (padrão: `location.reload`). Os testes trocam. */
  reload?: () => void;
}

type Step =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | {
      kind: 'playing';
      session: Session;
      /** A semente da partida `n` desta sala: abrir `?semente=<ela>` repete a partida. */
      seedOf: (gameNo: number) => string;
    };

export function Training({ store, load = loadLocalRoom, reload = defaultReload }: TrainingProps) {
  const [step, setStep] = useState<Step>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    let dispose: (() => void) | null = null;
    // O `catch` fica depois do `then`: uma exceção ao criar a sala (e não só o módulo que não carrega) cai na tela de falha, e
    // não numa rejeição solta com a tela presa em "Preparando…".
    load()
      .then((module) => {
        if (!live) return;
        const timers = {
          now: () => Date.now(),
          setTimer: (fn: () => void, ms: number): unknown => setTimeout(fn, ms),
          clearTimer: (handle: unknown): void => clearTimeout(handle as ReturnType<typeof setTimeout>),
        };
        const seed = module.trainingSeed(window.location.search, randomUnit);
        const room = new module.LocalRoom({ seed, ...timers });
        // O `dispose` vale desde já: se algo abaixo lançar, o `catch` solta o que chegou a nascer (a sala conectada já agendou o bot).
        let session: Session | null = null;
        dispose = () => {
          session?.dispose();
          room.close();
        };
        // A sessão ouve a sala antes de ela abrir: o `open`, o `room` e o primeiro `state` saem dentro do `connect()`.
        // O passe automático não se aplica ao treino (spec §2.6): a sessão não o manda, e as preferências guardadas (que valem
        // para a sala online) ficam como estão, sem ser reescritas.
        const created = new Session(room, timers, loadPrefs(store), { autoPass: false });
        session = created;
        room.connect();
        setStep({ kind: 'playing', session: created, seedOf: (gameNo) => module.gameSeed(seed, gameNo) });
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
      return (
        <Screen>
          <p role="status">{TRAINING_LOADING_TEXT}</p>
        </Screen>
      );
    case 'failed':
      return (
        <Screen>
          <Title>{TRAINING_FAILED_TITLE}</Title>
          <Panel>
            <p>{TRAINING_FAILED_TEXT}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={reload}>Recarregar</Button>
              <Button variant="secondary" onClick={goHome}>
                {BACK_HOME_LABEL}
              </Button>
            </div>
          </Panel>
        </Screen>
      );
    case 'playing':
      return <TrainingTable session={step.session} seedOf={step.seedOf} store={store} />;
  }
}

interface TrainingTableProps {
  session: Session;
  seedOf: (gameNo: number) => string;
  store: KeyValueStore;
}

function TrainingTable({ session, seedOf, store }: TrainingTableProps) {
  const snapshot = useSession(session);
  const seq = snapshot.state?.seq ?? null;
  const epoch = snapshot.state?.epoch ?? null;
  const gameNo = snapshot.room?.gameNo ?? 1;

  // O diagnóstico copiável da fronteira de erro leva a semente da partida em curso (a revanche `n` usa `<semente>-<n>`) e o
  // número dela: abrir `/treino?semente=<a do diagnóstico>` repete a partida (spec §2.6).
  useEffect(() => {
    setDiagnosticContext({ code: `TREINO, semente ${seedOf(gameNo)}, partida ${gameNo}`, seq, epoch });
    return clearDiagnosticContext;
  }, [seedOf, gameNo, seq, epoch]);

  return (
    <PlayTable
      session={session}
      store={store}
      training
      onNewRoom={goHome}
      newRoomLabel={BACK_HOME_LABEL}
      onExit={goHome}
      concedeWarning={TRAINING_CONCEDE_WARNING}
    />
  );
}
