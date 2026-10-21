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

type Step = { kind: 'loading' } | { kind: 'failed' } | { kind: 'playing'; session: Session; seed: string };

export function Training({ store, load = loadLocalRoom, reload = defaultReload }: TrainingProps) {
  const [step, setStep] = useState<Step>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    let dispose: (() => void) | null = null;
    load().then(
      (module) => {
        if (!live) return;
        const timers = {
          now: () => Date.now(),
          setTimer: (fn: () => void, ms: number): unknown => setTimeout(fn, ms),
          clearTimer: (handle: unknown): void => clearTimeout(handle as ReturnType<typeof setTimeout>),
        };
        const seed = module.trainingSeed(window.location.search, randomUnit);
        const room = new module.LocalRoom({ seed, ...timers });
        // A sessão ouve a sala antes de ela abrir: o `open`, o `room` e o primeiro `state` saem dentro do `connect()`.
        const session = new Session(room, timers, loadPrefs(store));
        room.connect();
        dispose = () => {
          session.dispose();
          room.close();
        };
        setStep({ kind: 'playing', session, seed });
      },
      () => {
        if (live) setStep({ kind: 'failed' });
      },
    );
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
      return <TrainingTable session={step.session} seed={step.seed} store={store} />;
  }
}

function TrainingTable({ session, seed, store }: { session: Session; seed: string; store: KeyValueStore }) {
  const snapshot = useSession(session);
  const seq = snapshot.state?.seq ?? null;
  const epoch = snapshot.state?.epoch ?? null;

  // O diagnóstico copiável da fronteira de erro leva a semente: com ela a partida se repete (spec §2.6).
  useEffect(() => {
    setDiagnosticContext({ code: `TREINO, semente ${seed}`, seq, epoch });
    return clearDiagnosticContext;
  }, [seed, seq, epoch]);

  return (
    <PlayTable
      session={session}
      store={store}
      training
      onNewRoom={goHome}
      newRoomLabel={BACK_HOME_LABEL}
      onExit={goHome}
    />
  );
}
