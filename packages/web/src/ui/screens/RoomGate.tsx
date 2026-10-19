// Entrar numa sala (spec §2.2) e viver nela (§6.2, §6.3). Por enquanto, o lobby e a mesa são um espaço reservado
// com o status da sala: as Tarefas 18 e seguintes o trocam pelas telas de verdade.
import { HttpError, normalizeCode, normalizeNickname, parseTarget } from '@coringa/protocol';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { openStore } from '../../app/browser-store.ts';
import { clearDiagnosticContext, setDiagnosticContext } from '../../app/diagnostic-context.ts';
import type { RoomApi } from '../../app/room-api.ts';
import { navigate } from '../../app/router.ts';
import type { Session } from '../../model/session.ts';
import {
  forgetSeat,
  loadNickname,
  loadSeat,
  saveNickname,
  saveSeat,
  type KeyValueStore,
  type SeatSession,
} from '../../model/storage.ts';
import { Button, Panel, Screen, TextField, Title } from '../parts.tsx';
import { NICKNAME_ERROR, OFFLINE, ROOM_FULL, ROOM_MISSING, TOO_MANY } from '../text.ts';
import { useSession } from '../useSession.ts';
import { Stopped } from './Stopped.tsx';

/** Marca no `sessionStorage`: a página já recarregou uma vez por causa de uma versão nova (spec §6.3, 4001). */
const RELOAD_MARK = 'coringa:recarregou';

const defaultReload = (): void => window.location.reload();

export interface RoomGateProps {
  code: string | null;
  api: RoomApi;
  store: KeyValueStore;
  /** Recarrega a página (padrão: `location.reload`). Os testes trocam. */
  reload?: () => void;
  /** Onde fica a marca contra o laço de recarga (padrão: `sessionStorage`). */
  marks?: KeyValueStore;
}

export function RoomGate({ code, api, store, reload = defaultReload, marks }: RoomGateProps) {
  if (code === null) return <InvalidCode />;
  return <RoomEntry key={code} code={code} api={api} store={store} reload={reload} marks={marks} />;
}

// ---------------------------------------------------------------------------------------------
// Código fora do formato

function InvalidCode() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    let code = normalizeCode(value);
    if (code === null) {
      try {
        code = parseTarget(value, window.location.origin).code;
      } catch {
        code = null;
      }
    }
    if (code === null) {
      setError('Esse não parece um código de sala: são 6 caracteres, ou o link inteiro.');
      return;
    }
    navigate(`/s/${code}`);
  }

  return (
    <Screen>
      <Title>Código inválido</Title>
      <Panel>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Digite outro código"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            error={error}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <Button type="submit">Entrar</Button>
        </form>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Voltar ao início
        </Button>
      </Panel>
    </Screen>
  );
}

// ---------------------------------------------------------------------------------------------
// Entrada (sem token → `info` → apelido → `join`)

type Step =
  | { kind: 'checking' }
  | { kind: 'form' }
  | { kind: 'missing' }
  | { kind: 'full' }
  | { kind: 'retry'; text: string }
  | { kind: 'online'; seat: SeatSession };

function failure(error: unknown): Step {
  if (error instanceof HttpError && error.status === 404) return { kind: 'missing' };
  if (error instanceof HttpError && error.status === 409) return { kind: 'full' };
  if (error instanceof HttpError && error.status === 429) return { kind: 'retry', text: TOO_MANY };
  if (error instanceof HttpError) return { kind: 'retry', text: 'O servidor não conseguiu responder' };
  return { kind: 'retry', text: OFFLINE };
}

interface EntryProps {
  code: string;
  api: RoomApi;
  store: KeyValueStore;
  reload: () => void;
  marks: KeyValueStore | undefined;
}

function RoomEntry({ code, api, store, reload, marks }: EntryProps) {
  const [step, setStep] = useState<Step>(() => {
    const seat = loadSeat(store, code);
    return seat === null ? { kind: 'checking' } : { kind: 'online', seat };
  });
  const [nickname, setNickname] = useState(() => loadNickname(store));
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadMarks] = useState(() => marks ?? openStore('session').store);

  // Sem token salvo: a sala existe, está no lobby e tem vaga?
  useEffect(() => {
    if (step.kind !== 'checking') return;
    let live = true;
    api.info(code).then(
      (info) => {
        if (!live) return;
        setStep(info.full || info.status !== 'LOBBY' ? { kind: 'full' } : { kind: 'form' });
      },
      (error: unknown) => {
        if (live) setStep(failure(error));
      },
    );
    return () => {
      live = false;
    };
  }, [api, code, step.kind]);

  // O token foi recusado (4003): volta ao começo do fluxo, que pode oferecer o assento livre.
  const restart = useCallback(() => setStep({ kind: 'checking' }), []);

  async function join(event: FormEvent) {
    event.preventDefault();
    const valid = normalizeNickname(nickname);
    if (valid === null) {
      setNicknameError(NICKNAME_ERROR);
      return;
    }
    setNicknameError(null);
    setBusy(true);
    try {
      const joined = await api.join(code, valid);
      const seat: SeatSession = { token: joined.token, playerId: joined.playerId, nickname: valid };
      saveNickname(store, valid);
      saveSeat(store, code, seat);
      setStep({ kind: 'online', seat });
    } catch (error) {
      if (error instanceof HttpError && error.status === 400) setNicknameError(NICKNAME_ERROR);
      else setStep(failure(error));
    } finally {
      setBusy(false);
    }
  }

  switch (step.kind) {
    case 'online':
      return (
        <Online code={code} seat={step.seat} api={api} store={store} marks={reloadMarks} reload={reload} onAuth={restart} />
      );
    case 'checking':
      return (
        <Screen>
          <p role="status">Procurando a sala…</p>
        </Screen>
      );
    case 'form':
      return (
        <Screen>
          <Title>Entrar na sala {code}</Title>
          <Panel>
            <form onSubmit={(event) => void join(event)} className="flex flex-col gap-4" noValidate>
              <TextField
                label="Seu apelido"
                hint="De 1 a 20 caracteres."
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                error={nicknameError}
                autoComplete="nickname"
                autoCapitalize="words"
              />
              <Button type="submit" disabled={busy}>
                Entrar
              </Button>
            </form>
          </Panel>
        </Screen>
      );
    case 'missing':
      return (
        <Screen>
          <Title>{ROOM_MISSING}</Title>
          <Panel>
            <Button onClick={() => navigate('/')}>Criar sala</Button>
          </Panel>
        </Screen>
      );
    case 'full':
      return (
        <Screen>
          <Title>{ROOM_FULL}</Title>
          <Panel>
            <Button onClick={() => navigate('/')}>Criar outra sala</Button>
          </Panel>
        </Screen>
      );
    case 'retry':
      return (
        <Screen>
          <Title>{step.text}</Title>
          <Panel>
            <Button onClick={() => setStep({ kind: 'checking' })}>Tentar de novo</Button>
          </Panel>
        </Screen>
      );
  }
}

// ---------------------------------------------------------------------------------------------
// Conectado

interface OnlineProps {
  code: string;
  seat: SeatSession;
  api: RoomApi;
  store: KeyValueStore;
  marks: KeyValueStore;
  reload: () => void;
  onAuth: () => void;
}

/** Recarrega uma vez só por versão nova (4001). Sem `sessionStorage`, recarregar poderia girar sem fim: não recarrega. */
function reloadOnce(marks: KeyValueStore, reload: () => void): void {
  try {
    if (marks.get(RELOAD_MARK) !== null) return;
    marks.set(RELOAD_MARK, '1');
    if (marks.get(RELOAD_MARK) === null) return;
  } catch {
    return;
  }
  reload();
}

function Online({ code, seat, api, store, marks, reload, onAuth }: OnlineProps) {
  const [session, setSession] = useState<Session | null>(null);

  // A sessão nasce e morre com este efeito: o `dispose()` solta os ouvintes e fecha a conexão. Criar a conexão
  // aqui (e não ao renderizar) faz o modo estrito, que monta duas vezes, abrir um socket só no fim.
  useEffect(() => {
    const created = api.connect(code, seat);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- publica o recurso criado por este efeito; é o único jeito de a árvore enxergá-lo
    setSession(created);
    let handled = false;

    const onChange = () => {
      const snapshot = created.snapshot();
      if (snapshot.status === 'open') {
        try {
          marks.remove(RELOAD_MARK);
        } catch {
          // Sem `sessionStorage`: a marca nunca existiu.
        }
      }
      if (snapshot.stop === null) {
        handled = false;
        return;
      }
      if (handled) return;
      handled = true;
      switch (snapshot.stop) {
        case 'ROOM_GONE':
          forgetSeat(store, code);
          return;
        case 'AUTH':
          forgetSeat(store, code);
          onAuth();
          return;
        case 'PROTOCOL':
          reloadOnce(marks, reload);
          return;
        case 'LEFT':
          navigate('/');
          return;
        case 'OTHER_TAB':
          return;
      }
    };
    const unsubscribe = created.subscribe(onChange);

    // A aba voltou ao primeiro plano ou a rede voltou: reconecta já, ou sonda o socket (spec §6.2).
    const wake = () => {
      if (created.snapshot().status !== 'stopped') created.wake();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') wake();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', wake);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', wake);
      unsubscribe();
      created.dispose();
    };
  }, [api, code, seat, store, marks, reload, onAuth]);

  if (session === null) return <Connecting />;
  return <OnlineRoom session={session} code={code} reload={reload} />;
}

function Connecting() {
  return (
    <Screen>
      <p role="status">Conectando à sala…</p>
    </Screen>
  );
}

function OnlineRoom({ session, code, reload }: { session: Session; code: string; reload: () => void }) {
  const snapshot = useSession(session);
  const seq = snapshot.state?.seq ?? null;
  const epoch = snapshot.state?.epoch ?? null;

  // O diagnóstico copiável da fronteira de erro sabe em que sala e em que `seq` a tela estava.
  useEffect(() => {
    setDiagnosticContext({ code, seq, epoch });
    return clearDiagnosticContext;
  }, [code, seq, epoch]);

  const { stop, status, room } = snapshot;
  if (stop === 'ROOM_GONE' || stop === 'PROTOCOL' || stop === 'OTHER_TAB') {
    return <Stopped reason={stop} onUseHere={() => session.wake()} onReload={reload} />;
  }
  if (stop !== null || room === null) return <Connecting />;

  return (
    <Screen>
      {status === 'reconnecting' ? (
        <p role="status" className="border-4 border-tinta bg-ouro px-3 py-2 font-bold">
          {snapshot.slowRetry ? 'Muitas mensagens; reconectando em 30 s…' : 'Reconectando…'}
        </p>
      ) : null}
      {/* Espaço reservado: o lobby (Tarefa 18) e a mesa (Tarefa 19 em diante) entram aqui. */}
      <section aria-label="Sala">
        <p>
          Sala {code}: {room.status}
        </p>
      </section>
    </Screen>
  );
}
