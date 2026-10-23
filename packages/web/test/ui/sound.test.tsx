// Os sons ligados à mesa (Fase C, fatia 1): o palco toca a pista de cada batida ao vivo, o relógio toca a urgência uma vez por
// prazo, e a chave "Som" (no menu da partida e na tela inicial) liga e desliga o controlador e grava a preferência. O
// `SoundContext` aqui é um falso que só anota o que lhe pediram; a ordem dos eventos do navegador (o clique que liga o som já
// ativa o áudio) é conferida com o `SoundController` de verdade e contextos falsos. O harness é o de `anim-harness.tsx`.
import type { GameEvent } from '@coringa/engine';
import type { Deadline } from '@coringa/protocol';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cue } from '../../src/model/sound.ts';
import { App } from '../../src/app/App.tsx';
import { loadPrefs, savePrefs, type KeyValueStore } from '../../src/model/storage.ts';
import { SoundController, type AudioContextLike, type Synth } from '../../src/sound/controller.ts';
import { Home } from '../../src/ui/screens/Home.tsx';
import { SoundContext, type SoundApi } from '../../src/ui/sound-context.ts';
import { PlayTable, type PlayTableProps } from '../../src/ui/table/PlayTable.tsx';
import type { ViewSpec } from '../fixtures.ts';
import { advance, cleanup, connect, emit, stage, THEIRS, type MountOptions } from './anim-harness.tsx';
import { fakeApi, memoryStore } from './support.tsx';

afterEach(cleanup);

/** O `SoundContext` de mentira: anota as pistas e as trocas de "Som ligado". */
function fakeSound() {
  const played: Cue[] = [];
  const enabled: boolean[] = [];
  const api: SoundApi = {
    play: (cue) => void played.push(cue),
    setEnabled: (on) => void enabled.push(on),
  };
  return { api, played, enabled };
}

function mountTable(spec: ViewSpec = THEIRS, options: MountOptions & { props?: Partial<PlayTableProps> } = {}) {
  const base = connect(spec, options);
  const sound = fakeSound();
  const store = memoryStore();
  const rendered = render(
    <SoundContext value={sound.api}>
      <PlayTable session={base.session} store={store} {...options.props} />
    </SoundContext>,
  );
  return { ...base, ...rendered, sound, store };
}

/**
 * Anda o tempo em passos curtos, como o navegador: um avanço único de vários segundos dispara os timers das batidas dentro
 * de uma só atualização do React, que só veria a última.
 */
function run(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) advance(50);
}

// `me` é o p1. A vez e o golpe de 120 pontos (faixa forte) são as duas batidas do cenário da brief.
const MY_TURN: GameEvent = { type: 'TurnStarted', player: 'p1' };
const THEIR_TURN: GameEvent = { type: 'TurnStarted', player: 'p2' };
const strike = (damage: number): GameEvent => ({ type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: damage + 10, defense: 10, damage });
const DEF_BROKEN: GameEvent = { type: 'CardsRemovedFromRow', player: 'p1', row: 'DEF', cards: [] };
const BOTH: GameEvent[] = [MY_TURN, strike(120)];

describe('as batidas tocam a pista delas', () => {
  it('ao vivo, [a sua vez, golpe de 120] toca "vez" e depois "golpe-forte", uma pista por batida', () => {
    const m = mountTable();
    emit(m, THEIRS, BOTH);
    // A primeira batida (a faixa da vez) começa no mesmo desenho do `state`; a do golpe, quando a primeira acaba.
    expect(m.sound.played).toEqual(['vez']);
    advance(399);
    expect(m.sound.played).toEqual(['vez']);
    advance(1);
    expect(m.sound.played).toEqual(['vez', 'golpe-forte']);
    // Terminadas as batidas, nada se repete.
    run(3_000);
    expect(m.sound.played).toEqual(['vez', 'golpe-forte']);
  });

  it('a vez do oponente é muda: só o golpe soa', () => {
    const m = mountTable();
    emit(m, THEIRS, [THEIR_TURN, strike(50)]);
    run(3_000);
    expect(m.sound.played).toEqual(['golpe-medio']);
  });

  it('o golpe contra uma Defesa toca "golpe" e depois "quebra", em batidas vizinhas', () => {
    const m = mountTable();
    emit(m, THEIRS, [strike(30), DEF_BROKEN]);
    expect(m.sound.played).toEqual(['golpe-leve']);
    run(3_000);
    expect(m.sound.played).toEqual(['golpe-leve', 'quebra']);
  });

  it('o `state` de reconexão (catchUp) com os mesmos eventos não toca nada', () => {
    const m = mountTable();
    emit(m, THEIRS, BOTH, { catchUp: true });
    run(5_000);
    expect(m.sound.played).toEqual([]);
  });

  it('o `state` de ressincronização (resync) não tem batidas e não toca nada', () => {
    const m = mountTable();
    emit(m, THEIRS, BOTH, { resync: true });
    run(5_000);
    expect(m.sound.played).toEqual([]);
  });

  it('a mesa que abre já feita (recarregar a página) não toca os eventos de antes', () => {
    const m = mountTable(THEIRS, { events: BOTH });
    run(5_000);
    expect(m.sound.played).toEqual([]);
  });

  it('pular depois da primeira batida não toca a segunda', async () => {
    const m = mountTable();
    emit(m, THEIRS, BOTH);
    expect(m.sound.played).toEqual(['vez']);
    await m.user.click(stage(m.container));
    run(5_000);
    expect(m.sound.played).toEqual(['vez']);
  });

  it('um `state` novo no meio das batidas troca a linha do tempo: as pistas que faltavam da velha não tocam', () => {
    const m = mountTable();
    emit(m, THEIRS, BOTH);
    run(100);
    emit(m, THEIRS, [strike(10)]);
    expect(m.sound.played).toEqual(['vez', 'golpe-leve']);
    run(5_000);
    expect(m.sound.played).toEqual(['vez', 'golpe-leve']);
  });
});

// ---------------------------------------------------------------------------------------------

describe('a urgência do relógio toca uma vez por prazo, e só no seu', () => {
  const turn = (at: number, players: Deadline['players'] = ['p1']) => ({ deadline: { kind: 'TURN', at, players } as Deadline });
  /** O relógio do servidor (`connection.now`) e os timers andam juntos. */
  const tick = (m: Pick<ReturnType<typeof mountTable>, 'connection'>, ms: number) =>
    act(() => {
      m.connection.now += ms;
      vi.advanceTimersByTime(ms);
    });

  it('toca quando o relógio passa de 6 s para 5 s, e não de novo no mesmo prazo', () => {
    const m = mountTable();
    emit(m, THEIRS, [], turn(6_000));
    expect(m.sound.played).toEqual([]);
    tick(m, 999); // 5,001 s
    expect(m.sound.played).toEqual([]);
    tick(m, 1); // 5 s
    expect(m.sound.played).toEqual(['urgencia']);
    tick(m, 4_000); // 1 s: os segundos mudam, a pista não
    expect(m.sound.played).toEqual(['urgencia']);
  });

  it('o prazo seguinte toca de novo, quando também entra na urgência', () => {
    const m = mountTable();
    emit(m, THEIRS, [], turn(6_000));
    tick(m, 1_000);
    expect(m.sound.played).toEqual(['urgencia']);
    emit(m, THEIRS, [], turn(30_000));
    tick(m, 20_000); // faltam 9 s para o novo prazo: ainda sem urgência
    expect(m.sound.played).toEqual(['urgencia']);
    tick(m, 4_000); // faltam 5 s
    expect(m.sound.played).toEqual(['urgencia', 'urgencia']);
  });

  it('o prazo do oponente não toca, mesmo em urgência', () => {
    const m = mountTable();
    emit(m, THEIRS, [], turn(6_000, ['p2']));
    tick(m, 2_000);
    expect(screen.getByRole('timer')).toHaveAttribute('data-urgente', 'true');
    tick(m, 5_000);
    expect(m.sound.played).toEqual([]);
  });

  it('o prazo dos dois (Equipar) é seu também e toca', () => {
    const m = mountTable();
    emit(m, THEIRS, [], { deadline: { kind: 'EQUIP', at: 6_000, players: ['p1', 'p2'] } });
    tick(m, 1_000);
    expect(m.sound.played).toEqual(['urgencia']);
  });
});

// ---------------------------------------------------------------------------------------------

describe('a chave "Som" do menu da partida', () => {
  const menuButton = () => screen.getAllByRole('button', { name: 'Menu da partida' })[0]!;
  const menu = () => within(screen.getByRole('dialog', { name: 'Menu da partida' }));
  const soundSwitch = () => menu().getByRole('switch', { name: 'Som' });

  it('vem ligada, diz o estado e desligar chama setEnabled(false) e grava sound: false sem mexer no resto', async () => {
    const m = mountTable();
    await m.user.click(menuButton());
    expect(soundSwitch()).toBeChecked();
    expect(soundSwitch().closest('label')).toHaveTextContent('Ligado');
    await m.user.click(soundSwitch());
    expect(soundSwitch()).not.toBeChecked();
    expect(soundSwitch().closest('label')).toHaveTextContent('Desligado');
    expect(m.sound.enabled.at(-1)).toBe(false);
    expect(loadPrefs(m.store)).toEqual({ autoPass: true, reduceMotion: false, sound: false });
    expect(m.session.snapshot().prefs.sound).toBe(false);
  });

  it('ligar de novo chama setEnabled(true) e grava sound: true', async () => {
    const m = mountTable(THEIRS, { prefs: { sound: false } });
    await m.user.click(menuButton());
    expect(soundSwitch()).not.toBeChecked();
    await m.user.click(soundSwitch());
    expect(m.sound.enabled.at(-1)).toBe(true);
    expect(loadPrefs(m.store).sound).toBe(true);
  });

  it('a mesa que abre com o som desligado nas preferências avisa o controlador', () => {
    const m = mountTable(THEIRS, { prefs: { sound: false } });
    expect(m.sound.enabled.at(-1)).toBe(false);
  });

  it('no treino o menu também tem a chave (e não tem a do passe automático)', async () => {
    const m = mountTable(THEIRS, { props: { training: true } });
    await m.user.click(menuButton());
    expect(soundSwitch()).toBeChecked();
    expect(menu().queryByRole('switch', { name: /Passar sozinho/ })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------

describe('a chave "Som" da tela inicial', () => {
  function home(prefs?: Record<string, unknown>) {
    const sound = fakeSound();
    const store: KeyValueStore = memoryStore();
    if (prefs) store.set('coringa:prefs', JSON.stringify(prefs));
    const user = userEvent.setup();
    render(
      <SoundContext value={sound.api}>
        <Home api={fakeApi()} store={store} />
      </SoundContext>,
    );
    return { sound, store, user, soundSwitch: () => screen.getByRole('switch', { name: 'Som' }) };
  }

  it('vem ligada; desligar chama setEnabled(false) e grava sound: false', async () => {
    const h = home();
    expect(h.soundSwitch()).toBeChecked();
    await h.user.click(h.soundSwitch());
    expect(h.soundSwitch()).not.toBeChecked();
    expect(h.sound.enabled).toEqual([false]);
    expect(loadPrefs(h.store).sound).toBe(false);
  });

  it('mantém as outras preferências como estavam', async () => {
    const h = home({ autoPass: false, reduceMotion: true });
    await h.user.click(h.soundSwitch());
    expect(JSON.parse(h.store.get('coringa:prefs')!)).toEqual({ autoPass: false, reduceMotion: true, sound: false });
  });

  it('lê a preferência guardada: sound: false aparece desligada, e ligar grava true', async () => {
    const h = home({ sound: false });
    expect(h.soundSwitch()).not.toBeChecked();
    await h.user.click(h.soundSwitch());
    expect(h.sound.enabled).toEqual([true]);
    expect(loadPrefs(h.store).sound).toBe(true);
  });

  it('sem um SoundContext (testes, componentes fora do App) a chave funciona e não lança', async () => {
    const store = memoryStore();
    const user = userEvent.setup();
    render(<Home api={fakeApi()} store={store} />);
    await user.click(screen.getByRole('switch', { name: 'Som' }));
    expect(loadPrefs(store).sound).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------

describe('o clique na chave que liga o som', () => {
  /** Um controlador de verdade com contextos falsos: só conta quantos nasceram. */
  function controller(enabled: boolean) {
    const contexts: AudioContextLike[] = [];
    const ctrl = new SoundController(
      {
        createContext() {
          const ctx: AudioContextLike = { state: 'running', resume: () => Promise.resolve(), suspend: () => Promise.resolve() };
          contexts.push(ctx);
          return ctx;
        },
        loadSynth: () => Promise.resolve<Synth>({ play() {} }),
      },
      enabled,
    );
    return { ctrl, contexts };
  }

  it('o clique na chave que liga o som já ativa o áudio', async () => {
    const { ctrl, contexts } = controller(false);
    const detach = ctrl.attach(document);
    const store = memoryStore();
    savePrefs(store, { autoPass: true, reduceMotion: false, sound: false });
    const user = userEvent.setup();
    render(
      <SoundContext value={ctrl}>
        <Home api={fakeApi()} store={store} />
      </SoundContext>,
    );
    // Desligado, nenhum gesto (nem o ponteiro que sobe antes do clique) cria contexto...
    expect(contexts).toHaveLength(0);
    await user.click(screen.getByRole('switch', { name: 'Som' }));
    // ...mas o clique que LIGA já chega ao ouvinte do documento com o som ligado: o ouvinte roda depois do React.
    expect(contexts).toHaveLength(1);
    detach();
  });

  it('o mesmo vale para a chave "Som" do menu da partida', async () => {
    const { ctrl, contexts } = controller(false);
    const detach = ctrl.attach(document);
    const base = connect(THEIRS, { prefs: { sound: false } });
    render(
      <SoundContext value={ctrl}>
        <PlayTable session={base.session} store={memoryStore()} />
      </SoundContext>,
    );
    await base.user.click(screen.getAllByRole('button', { name: 'Menu da partida' })[0]!);
    expect(contexts).toHaveLength(0);
    await base.user.click(within(screen.getByRole('dialog', { name: 'Menu da partida' })).getByRole('switch', { name: 'Som' }));
    expect(contexts).toHaveLength(1);
    detach();
  });
});

// ---------------------------------------------------------------------------------------------

describe('o App liga o controlador ao documento', () => {
  /** Um `AudioContext` que só conta as instâncias; o sintetizador não consegue montar nada nele, e o controlador segue sem som. */
  function stubAudioContext() {
    const created: object[] = [];
    class CountingAudioContext {
      state = 'running';
      constructor() {
        created.push(this);
      }
      resume = () => Promise.resolve();
      suspend = () => Promise.resolve();
    }
    vi.stubGlobal('AudioContext', CountingAudioContext);
    return created;
  }

  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('nenhum contexto antes de um gesto; o primeiro clique na página cria um, e só um', async () => {
    const created = stubAudioContext();
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    expect(created).toHaveLength(0);
    await user.click(screen.getByRole('heading', { name: /Jogo do Coringa/ }));
    expect(created).toHaveLength(1);
    await user.keyboard('a');
    expect(created).toHaveLength(1);
  });

  it('com sound: false guardado, os gestos não criam contexto; ligar pela chave da tela inicial já o cria no mesmo clique', async () => {
    const created = stubAudioContext();
    window.localStorage.setItem('coringa:prefs', JSON.stringify({ autoPass: true, reduceMotion: false, sound: false }));
    const user = userEvent.setup();
    render(<App api={fakeApi()} />);
    await user.click(screen.getByRole('heading', { name: /Jogo do Coringa/ }));
    expect(created).toHaveLength(0);
    await user.click(screen.getByRole('switch', { name: 'Som' }));
    expect(created).toHaveLength(1);
    expect(JSON.parse(window.localStorage.getItem('coringa:prefs')!)).toEqual({ autoPass: true, reduceMotion: false, sound: true });
  });

  it('ao desmontar, os ouvintes saem do documento', async () => {
    const created = stubAudioContext();
    const user = userEvent.setup();
    const { unmount } = render(<App api={fakeApi()} />);
    unmount();
    await user.click(document.body);
    expect(created).toHaveLength(0);
  });
});
