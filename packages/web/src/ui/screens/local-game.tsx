// O que o treino e o tutorial dividem: os dois montam a mesma partida contra o bot, sobre uma `LocalRoom` que roda no próprio
// navegador (sem servidor, sem lobby e sem relógio), com a `Session` de sempre. Este arquivo é do JavaScript inicial (o `Training`
// o importa): o módulo da sala local, com o bot dentro, só chega por `import()` dinâmico (`loadLocalRoom`), e aqui só se
// importam TIPOS dele, apagados na compilação.
import { useEffect, type ReactNode } from 'react';
import { clearDiagnosticContext, setDiagnosticContext } from '../../app/diagnostic-context.ts';
import { navigate } from '../../app/router.ts';
import { BACK_HOME_LABEL, TRAINING_FAILED_TEXT } from '../../model/copy.ts';
import type { LocalRoom, TrainingLevel } from '../../model/local-room.ts';
import { Session } from '../../model/session.ts';
import { loadPrefs, type KeyValueStore } from '../../model/storage.ts';
import { Button, Panel, Screen, Title } from '../parts.tsx';
import { useSession } from '../useSession.ts';

/** O módulo da sala local, com o bot dentro. Só esta chamada o alcança, e só quando o treino ou o tutorial abrem. */
export const loadLocalRoom = () => import('../../model/local-room.ts');

export type LocalRoomModule = Awaited<ReturnType<typeof loadLocalRoom>>;

/** Um número em [0, 1) sorteado pelo navegador (spec §2.6: a semente vem de `crypto.getRandomValues`). */
export function randomUnit(): number {
  const source = globalThis.crypto as Crypto | undefined;
  if (!source?.getRandomValues) return Math.random();
  return source.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
}

export const defaultReload = (): void => window.location.reload();
export const goHome = (): void => navigate('/');

/** Uma partida local aberta: a sessão que a mesa usa e o que a fecha. */
export interface LocalGame {
  session: Session;
  /** A semente da partida `n` desta sala: abrir `?semente=<ela>&nivel=<nível>` repete a partida. */
  seedOf: (gameNo: number) => string;
  /** Solta a sessão e fecha a sala (e o timer do bot). */
  dispose: () => void;
}

/**
 * Cria a sala local (na semente e no nível dados) e a sessão sobre ela, e a abre. O passe automático não se aplica ao treino (spec
 * §2.6): a sessão não o manda, e as preferências guardadas (que valem para a sala online) ficam como estão, sem ser reescritas.
 * A sessão ouve a sala antes de ela abrir: o `open`, o `room` e o primeiro `state` saem dentro do `connect()`. Se algo lançar no meio
 * (a sala conectada já agendou o bot), o que chegou a nascer é solto antes de a exceção seguir: nenhum timer vaza.
 */
export function openLocalRoom(module: LocalRoomModule, options: { seed: string; level: TrainingLevel; store: KeyValueStore }): LocalGame {
  const timers = {
    now: () => Date.now(),
    setTimer: (fn: () => void, ms: number): unknown => setTimeout(fn, ms),
    clearTimer: (handle: unknown): void => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
  const { seed, level, store } = options;
  const room: LocalRoom = new module.LocalRoom({ seed, level, ...timers });
  let session: Session | null = null;
  const dispose = (): void => {
    session?.dispose();
    room.close();
  };
  try {
    session = new Session(room, timers, loadPrefs(store), { autoPass: false });
    room.connect();
  } catch (error) {
    dispose();
    throw error;
  }
  return { session, seedOf: (gameNo) => module.gameSeed(seed, gameNo), dispose };
}

/**
 * O diagnóstico copiável da fronteira de erro leva a semente da partida em curso (a revanche `n` usa `<semente>-<n>`), o nível do
 * bot (o valor da URL: `facil`, `medio` ou `dificil`) e o número dela: abrir `/treino?semente=<a do diagnóstico>&nivel=<o nível>`
 * repete a partida (spec §2.6). `label` diz de onde veio (`TREINO` ou `TUTORIAL`).
 */
export function useGameDiagnostic(session: Session, label: string, level: TrainingLevel, seedOf: (gameNo: number) => string): void {
  const snapshot = useSession(session);
  const seq = snapshot.state?.seq ?? null;
  const epoch = snapshot.state?.epoch ?? null;
  const gameNo = snapshot.room?.gameNo ?? 1;
  useEffect(() => {
    setDiagnosticContext({ code: `${label}, semente ${seedOf(gameNo)}, nivel ${level}, partida ${gameNo}`, seq, epoch });
    return clearDiagnosticContext;
  }, [label, seedOf, level, gameNo, seq, epoch]);
}

/** "Preparando…" até o módulo da sala local chegar. */
export function LocalRoomLoading({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <p role="status">{children}</p>
    </Screen>
  );
}

/** O módulo (ou a sala) não abriu: "Recarregar" e "Voltar ao início". */
export function LocalRoomFailed({ title, reload }: { title: string; reload: () => void }) {
  return (
    <Screen>
      <Title>{title}</Title>
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
}
