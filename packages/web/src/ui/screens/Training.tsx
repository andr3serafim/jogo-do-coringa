// Treino contra o bot (spec §2.6, §12): a mesma mesa da sala, sobre uma `LocalRoom` que roda no próprio navegador, sem
// servidor, sem lobby e sem relógio. A `Session` é a de sempre, e a `PlayTable` não sabe qual conexão está usando.
//
// O módulo da sala local puxa o bot (`@coringa/sim/bots`), que só o treino usa: ele entra por `import()` dinâmico, num
// chunk à parte, para não pesar no JavaScript inicial (o `scripts/smoke.ts` confere). Aqui só se importam TIPOS dele
// (apagados na compilação); os valores (a lista dos níveis, `trainingLevel`) vêm do módulo carregado. O nível do bot vem de
// `?nivel=` ou da escolha que a tela mostra antes da mesa (o último fica em `coringa:nivel` e vem focado). A sala nasce e morre
// com o efeito: ele cria a sessão e a conexão (na hora, com o nível da URL, ou quando a pessoa escolhe), e a limpeza solta uma e
// fecha a outra. Isso também vale para o modo estrito, que monta duas vezes, e para um módulo que chega depois de a tela
// sair de cena (`live`): nesse caso não nasce sala nenhuma, e o timer do bot não vaza.
import { useEffect, useState } from 'react';
import { navigate } from '../../app/router.ts';
import { clearDiagnosticContext, setDiagnosticContext } from '../../app/diagnostic-context.ts';
import {
  BACK_HOME_LABEL,
  LEVEL_LINE,
  LEVEL_NAME,
  TRAINING_CHOICE_HINT,
  TRAINING_CHOICE_LABEL,
  TRAINING_CHOICE_TITLE,
  TRAINING_CONCEDE_WARNING,
  TRAINING_FAILED_TEXT,
  TRAINING_FAILED_TITLE,
  TRAINING_LOADING_TEXT,
} from '../../model/copy.ts';
import type { TrainingLevel } from '../../model/local-room.ts';
import { Session } from '../../model/session.ts';
import { loadLevel, loadPrefs, saveLevel, type KeyValueStore } from '../../model/storage.ts';
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
      /** Sem `?nivel=` válido: a pessoa escolhe o nível antes da mesa. */
      kind: 'choosing';
      levels: readonly TrainingLevel[];
      /** O nível que vem focado: o último escolhido, ou o Médio. */
      initial: TrainingLevel;
      choose: (level: TrainingLevel) => void;
    }
  | {
      kind: 'playing';
      session: Session;
      level: TrainingLevel;
      /** A semente da partida `n` desta sala: abrir `?semente=<ela>&nivel=<nível>` repete a partida. */
      seedOf: (gameNo: number) => string;
    };

export function Training({ store, load = loadLocalRoom, reload = defaultReload }: TrainingProps) {
  const [step, setStep] = useState<Step>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    let dispose: (() => void) | null = null;
    const fail = (): void => {
      dispose?.();
      dispose = null;
      if (live) setStep({ kind: 'failed' });
    };
    /** Cria a sala e a sessão no nível dado e abre a mesa. */
    const begin = (module: LocalRoomModule, level: TrainingLevel): void => {
      const timers = {
        now: () => Date.now(),
        setTimer: (fn: () => void, ms: number): unknown => setTimeout(fn, ms),
        clearTimer: (handle: unknown): void => clearTimeout(handle as ReturnType<typeof setTimeout>),
      };
      const seed = module.trainingSeed(window.location.search, randomUnit);
      const room = new module.LocalRoom({ seed, level, ...timers });
      // O `dispose` vale desde já: se algo abaixo lançar, quem chamou solta o que chegou a nascer (a sala conectada já agendou o bot).
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
      setStep({ kind: 'playing', session: created, level, seedOf: (gameNo) => module.gameSeed(seed, gameNo) });
    };
    // O `catch` fica depois do `then`: uma exceção ao criar a sala (e não só o módulo que não carrega) cai na tela de falha, e
    // não numa rejeição solta com a tela presa em "Preparando…".
    load()
      .then((module) => {
        if (!live) return;
        const fromUrl = module.trainingLevel(window.location.search);
        if (fromUrl !== null) {
          begin(module, fromUrl);
          return;
        }
        const saved = loadLevel(store);
        setStep({
          kind: 'choosing',
          levels: module.TRAINING_LEVELS,
          initial: module.TRAINING_LEVELS.find((level) => level === saved) ?? 'medio',
          choose: (level) => {
            // Uma sala só: o segundo clique antes de a mesa aparecer não cria outra.
            if (!live || dispose !== null) return;
            saveLevel(store, level);
            try {
              begin(module, level);
            } catch {
              fail();
            }
          },
        });
      })
      .catch(fail);
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
    case 'choosing':
      return <LevelChoice levels={step.levels} initial={step.initial} onChoose={step.choose} />;
    case 'playing':
      return <TrainingTable session={step.session} level={step.level} seedOf={step.seedOf} store={store} />;
  }
}

interface LevelChoiceProps {
  levels: readonly TrainingLevel[];
  initial: TrainingLevel;
  onChoose: (level: TrainingLevel) => void;
}

/** A escolha do nível (spec da fatia 1, §3.3): um botão grande por nível, com o nome e uma linha, e o inicial já focado. */
function LevelChoice({ levels, initial, onChoose }: LevelChoiceProps) {
  return (
    <Screen>
      <Title>{TRAINING_CHOICE_TITLE}</Title>
      <p className="text-lg">{TRAINING_CHOICE_HINT}</p>
      <div role="group" aria-label={TRAINING_CHOICE_LABEL} className="flex flex-col gap-3">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            // O nome do botão é o texto visível inteiro, nível e linha (WCAG 2.5.3: o axe barra um nome que não o contenha).
            autoFocus={level === initial}
            onClick={() => onChoose(level)}
            className="flex min-h-20 flex-col items-start gap-0.5 border-4 border-tinta bg-ouro px-5 py-3 text-left text-tinta"
          >
            <span className="font-madeira text-2xl uppercase leading-tight tracking-wide">{LEVEL_NAME[level]}</span>
            {/* Entre itens de flex o espaço some (o layout não muda), mas separa as palavras do nome acessível: "Fácil Joga…", e não "FácilJoga…". */}{' '}
            <span className="text-base">{LEVEL_LINE[level]}</span>
          </button>
        ))}
      </div>
      <Button variant="secondary" onClick={goHome}>
        {BACK_HOME_LABEL}
      </Button>
    </Screen>
  );
}

interface TrainingTableProps {
  session: Session;
  level: TrainingLevel;
  seedOf: (gameNo: number) => string;
  store: KeyValueStore;
}

function TrainingTable({ session, level, seedOf, store }: TrainingTableProps) {
  const snapshot = useSession(session);
  const seq = snapshot.state?.seq ?? null;
  const epoch = snapshot.state?.epoch ?? null;
  const gameNo = snapshot.room?.gameNo ?? 1;

  // O diagnóstico copiável da fronteira de erro leva a semente da partida em curso (a revanche `n` usa `<semente>-<n>`), o nível
  // do bot e o número dela: abrir `/treino?semente=<a do diagnóstico>&nivel=<o nível>` repete a partida (spec §2.6).
  useEffect(() => {
    setDiagnosticContext({ code: `TREINO, semente ${seedOf(gameNo)}, nível ${LEVEL_NAME[level]}, partida ${gameNo}`, seq, epoch });
    return clearDiagnosticContext;
  }, [seedOf, level, gameNo, seq, epoch]);

  return (
    <PlayTable
      session={session}
      store={store}
      training={level}
      onNewRoom={goHome}
      newRoomLabel={BACK_HOME_LABEL}
      onExit={goHome}
      concedeWarning={TRAINING_CONCEDE_WARNING}
    />
  );
}
