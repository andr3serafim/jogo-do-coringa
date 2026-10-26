import {
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  makeConfig,
  RULES_VERSION,
  viewFor,
  type PlayerId,
  type Replay,
  type ReplayStep,
} from '@coringa/engine';
import { BOTS } from '@coringa/sim/bots';
import { createRng } from '@coringa/sim/rng';
import { describe, expect, it } from 'vitest';
import {
  attachReplay,
  DEDUPE_WINDOW_MS,
  findPastGame,
  loadPastGames,
  MAX_PAST_GAMES,
  MAX_PAST_GAMES_CHARS,
  PAST_GAMES_KEY,
  recordPastGame,
  type PastGame,
} from '../../src/model/past-games.ts';
import { safeStore, type KeyValueStore } from '../../src/model/storage.ts';

const SEATS: [PlayerId, PlayerId] = ['p1', 'p2'];
const HOUR = 60 * 60 * 1000;

/** Armazenamento de mentira com cota: um `set` maior que ela lança, como o `setItem` do navegador. */
interface FakeStore extends KeyValueStore {
  readonly data: Map<string, string>;
  quota: number;
  sets: number;
}

function fakeStore(quota = Infinity): FakeStore {
  const data = new Map<string, string>();
  const store: FakeStore = {
    data,
    quota,
    sets: 0,
    get: (key) => data.get(key) ?? null,
    set(key, value) {
      store.sets += 1;
      if (value.length > store.quota) throw new Error('QuotaExceededError');
      data.set(key, value);
    },
    remove: (key) => void data.delete(key),
  };
  return store;
}

/** Uma partida de verdade (greedy × greedy, até o fim) no formato do replay do motor. */
function realReplay(seed: string): Replay {
  const config = makeConfig();
  const created = createGame(config, seed, SEATS);
  if (!created.ok) throw new Error(created.error.message);
  let state = created.state;
  const rngs = [createRng(`${seed}/p1`), createRng(`${seed}/p2`)] as const;
  const steps: ReplayStep[] = [];
  while (state.phase.kind !== 'GAME_OVER') {
    const actor = actingPlayers(state)[0]!;
    const view = viewFor(state, actor);
    const seat = actor === SEATS[0] ? 0 : 1;
    const action = BOTS.greedy(view, legalActions(view), rngs[seat]);
    const result = applyAction(state, actor, action);
    if (!result.ok) throw new Error(`bot jogou ação ilegal (${result.error.code})`);
    steps.push({ player: actor, action });
    state = result.state;
  }
  return { name: `treino-${seed}`, config, seed, players: SEATS, steps };
}

/**
 * Uma partida de verdade tem de 3 a 12 mil caracteres, então 20 delas cabem com folga no teto. Para passar do teto, emenda
 * cópias dos passos de uma partida real até o replay chegar a `chars` (só o tamanho importa aqui, não a jogada).
 */
function bulky(replay: Replay, chars: number): Replay {
  const copies = Math.ceil(chars / JSON.stringify(replay.steps).length);
  return { ...replay, steps: Array.from({ length: copies }, () => replay.steps).flat() };
}

const entry = (over: Partial<Omit<PastGame, 'id'>> = {}): Omit<PastGame, 'id'> => ({
  date: 1_000,
  mode: { kind: 'training', level: 'medio' },
  seat: 'p1',
  names: { me: 'Ana', opponent: 'Bot Médio' },
  outcome: { gameNo: 1, result: { kind: 'WIN', winner: 'p1', reason: 'HP' }, cause: 'NORMAL' },
  rounds: 7,
  score: { p1: 1, p2: 0, draws: 0 },
  rulesVersion: RULES_VERSION,
  ...over,
});

/** O mesmo que `entry`, no formato cru que a lista guarda (para os testes que estragam o armazenamento à mão). */
const rawGame = (id: string): Record<string, unknown> => ({ id, ...entry() });

const put = (store: KeyValueStore, items: unknown): void => store.set(PAST_GAMES_KEY, JSON.stringify(items));
const hasReplay = (games: PastGame[]): boolean[] => games.map((game) => game.replay !== undefined);

describe('lista de partidas', () => {
  it('a chave e os limites são os da spec', () => {
    expect(PAST_GAMES_KEY).toBe('coringa:partidas');
    expect(MAX_PAST_GAMES).toBe(20);
    expect(MAX_PAST_GAMES_CHARS).toBe(1_000_000);
    expect(DEDUPE_WINDOW_MS).toBe(24 * HOUR);
  });

  it('grava no topo e lê de volta', () => {
    const store = fakeStore();
    expect(loadPastGames(store)).toEqual([]);
    const replay = realReplay('topo');
    const first = recordPastGame(store, entry({ date: 1_000, replay }), 1_000);
    const second = recordPastGame(
      store,
      entry({
        date: 2_000,
        mode: { kind: 'online', code: 'ABCD' },
        key: 'sala:ABCD:1',
        seat: 'p2',
        outcome: { gameNo: 1, result: { kind: 'DRAW', reason: 'ANTI_STALL' }, cause: 'NORMAL' },
      }),
      2_000,
    );
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).not.toBe(second!.id);

    const games = loadPastGames(store);
    expect(games.map((game) => game.id)).toEqual([second!.id, first!.id]);
    // O que volta é o que foi guardado, até o replay, depois de passar pelo JSON.
    expect(games[1]).toEqual(JSON.parse(JSON.stringify(first)));
    expect(games[1]!.replay).toEqual(replay);
    expect(games[0]).toMatchObject({ key: 'sala:ABCD:1', mode: { kind: 'online', code: 'ABCD' }, seat: 'p2' });
    expect(games[0]).not.toHaveProperty('replay');
    expect(findPastGame(store, second!.id)).toEqual(games[0]);
    expect(findPastGame(store, first!.id)).toEqual(games[1]);
    expect(findPastGame(store, 'nao-existe')).toBeNull();
  });

  it('guarda no máximo 20', () => {
    const store = fakeStore();
    for (let i = 0; i < 25; i++) recordPastGame(store, entry({ date: i, rounds: i }), i);
    const games = loadPastGames(store);
    expect(games).toHaveLength(MAX_PAST_GAMES);
    // A mais nova primeiro; as 5 mais velhas saíram.
    expect(games.map((game) => game.rounds)).toEqual(Array.from({ length: 20 }, (_, i) => 24 - i));
  });

  it('lê no máximo 20 mesmo que o armazenamento tenha mais', () => {
    const store = fakeStore();
    put(store, Array.from({ length: 30 }, (_, i) => rawGame(`g${i}`)));
    const games = loadPastGames(store);
    expect(games).toHaveLength(MAX_PAST_GAMES);
    expect(games[0]!.id).toBe('g0');
  });

  it('passando de 1 MB tira os replays das mais velhas e mantém as linhas', () => {
    const store = fakeStore();
    const replay = bulky(realReplay('mega'), 60_000);
    // 20 replays de ~60 mil caracteres passam de 1 MB: a lista cheia não cabe com todos eles.
    expect(JSON.stringify(replay).length * MAX_PAST_GAMES).toBeGreaterThan(MAX_PAST_GAMES_CHARS);

    let last: PastGame | null = null;
    for (let i = 0; i < MAX_PAST_GAMES; i++) {
      last = recordPastGame(store, entry({ date: i, rounds: i, replay }), i);
    }
    expect(store.data.get(PAST_GAMES_KEY)!.length).toBeLessThanOrEqual(MAX_PAST_GAMES_CHARS);

    const games = loadPastGames(store);
    // Nenhuma linha se perde, e a ordem segue da mais nova para a mais velha.
    expect(games.map((game) => game.rounds)).toEqual(Array.from({ length: 20 }, (_, i) => 19 - i));
    // Os replays que sobram são os das mais novas, sem buraco: o que sai é sempre o da mais velha que ainda tinha um.
    const flags = hasReplay(games);
    const kept = flags.filter(Boolean).length;
    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeLessThan(MAX_PAST_GAMES);
    expect(flags).toEqual([...Array<boolean>(kept).fill(true), ...Array<boolean>(MAX_PAST_GAMES - kept).fill(false)]);
    // A linha sem replay continua inteira (nome, resultado, placar).
    expect(games.at(-1)).toMatchObject({ names: { me: 'Ana' }, outcome: { gameNo: 1 }, score: { p1: 1 } });
    expect(last).toEqual(games[0]);
    // Tirou o mínimo: devolver o replay da mais nova entre as que ficaram sem ele já estoura o teto.
    const fuller = games.map((game, i) => (i === kept ? { ...game, replay } : game));
    expect(JSON.stringify(fuller).length).toBeGreaterThan(MAX_PAST_GAMES_CHARS);
  });

  it('o teto é exato: com 1 000 000 caracteres cabe, com 1 a mais sai só o replay da mais velha', () => {
    const replay = realReplay('borda');
    // Três partidas; o tamanho da última é acertado ao caractere pelo nome do replay dela.
    const build = (pad: number) => {
      const store = fakeStore();
      recordPastGame(store, entry({ date: 1, rounds: 1, replay }), 1);
      recordPastGame(store, entry({ date: 2, rounds: 2, replay }), 2);
      recordPastGame(store, entry({ date: 3, rounds: 3, replay: { ...replay, name: 'x'.repeat(pad) } }), 3);
      return store;
    };
    const pad = MAX_PAST_GAMES_CHARS - build(0).data.get(PAST_GAMES_KEY)!.length;

    const exact = build(pad);
    expect(exact.data.get(PAST_GAMES_KEY)!.length).toBe(MAX_PAST_GAMES_CHARS);
    expect(hasReplay(loadPastGames(exact))).toEqual([true, true, true]);

    const over = build(pad + 1);
    expect(over.data.get(PAST_GAMES_KEY)!.length).toBeLessThanOrEqual(MAX_PAST_GAMES_CHARS);
    // Um replay a menos, o da mais velha, e só ele.
    expect(hasReplay(loadPastGames(over))).toEqual([true, true, false]);
  });

  it('um replay sozinho maior que o teto também sai, e a linha fica', () => {
    const store = fakeStore();
    const saved = recordPastGame(store, entry({ replay: bulky(realReplay('gigante'), 1_200_000) }), 1_000);
    expect(saved).not.toBeNull();
    expect(saved).not.toHaveProperty('replay');
    expect(store.data.get(PAST_GAMES_KEY)!.length).toBeLessThanOrEqual(MAX_PAST_GAMES_CHARS);
    expect(loadPastGames(store)).toHaveLength(1);
  });

  it('uma entrada de outra versão das regras é lida normalmente', () => {
    const store = fakeStore();
    const replay = realReplay('versao');
    for (const rulesVersion of [RULES_VERSION + 1, 0]) {
      recordPastGame(store, entry({ rulesVersion, replay, rounds: rulesVersion }), rulesVersion);
    }
    const games = loadPastGames(store);
    expect(games.map((game) => game.rulesVersion)).toEqual([0, RULES_VERSION + 1]);
    expect(games.every((game) => game.replay !== undefined)).toBe(true);
  });

  it('cota estourada tira replays e tenta de novo', () => {
    const replay = realReplay('cota');
    const games = (store: KeyValueStore): void => {
      for (let i = 1; i <= 4; i++) recordPastGame(store, entry({ date: i, rounds: i, replay }), i);
    };
    // A cota que sobra exatamente para a lista com os replays só das duas mais novas.
    const dry = fakeStore();
    games(dry);
    const all = loadPastGames(dry);
    const quota = JSON.stringify(all.map((game, i) => (i < 2 ? game : { ...game, replay: undefined }))).length;
    expect(JSON.stringify(all).length).toBeGreaterThan(quota);

    const store = fakeStore();
    for (let i = 1; i <= 3; i++) recordPastGame(store, entry({ date: i, rounds: i, replay }), i);
    store.quota = quota;
    store.sets = 0;
    const saved = recordPastGame(store, entry({ date: 4, rounds: 4, replay }), 4);

    // Tentou com tudo, depois sem o replay da mais velha, depois sem o das duas mais velhas.
    expect(store.sets).toBe(3);
    expect(saved?.replay).toEqual(replay);
    const stored = loadPastGames(store);
    expect(stored.map((game) => game.rounds)).toEqual([4, 3, 2, 1]);
    expect(hasReplay(stored)).toEqual([true, true, false, false]);
  });

  it('com o safeStore de verdade, a cota do Storage chega aqui: corta replays e o disco fica com a lista completa', () => {
    const replay = realReplay('disco');
    const addGames = (store: KeyValueStore, from: number, to: number): void => {
      for (let i = from; i <= to; i++) recordPastGame(store, entry({ date: i, rounds: i, replay }), i);
    };
    // A cota que sobra exatamente para os replays das duas mais novas, entre quatro partidas.
    const dry = fakeStore();
    addGames(dry, 1, 4);
    const quota = JSON.stringify(loadPastGames(dry).map((game, i) => (i < 2 ? game : { ...game, replay: undefined }))).length;

    // Um `Storage` que recusa o `setItem` da lista acima da cota (o `QuotaExceededError` do navegador).
    const disk = new Map<string, string>();
    let limit = Infinity;
    const raw: Storage = {
      get length() {
        return disk.size;
      },
      clear: () => disk.clear(),
      key: (index) => [...disk.keys()][index] ?? null,
      getItem: (key) => disk.get(key) ?? null,
      removeItem: (key) => void disk.delete(key),
      setItem(key, value) {
        if (key === PAST_GAMES_KEY && value.length > limit) throw new Error('QuotaExceededError');
        disk.set(key, value);
      },
    };
    const { store, available } = safeStore(raw);
    expect(available).toBe(true);
    addGames(store, 1, 3);
    limit = quota;
    const saved = recordPastGame(store, entry({ date: 4, rounds: 4, replay }), 4);

    expect(saved?.replay).toEqual(replay);
    // O que está no disco (o Storage por baixo, não a memória do safeStore) é a lista completa, com menos replays.
    const onDisk = JSON.parse(disk.get(PAST_GAMES_KEY)!) as PastGame[];
    expect(onDisk.map((game) => game.rounds)).toEqual([4, 3, 2, 1]);
    expect(onDisk.map((game) => game.replay !== undefined)).toEqual([true, true, false, false]);
    expect(disk.get(PAST_GAMES_KEY)!.length).toBeLessThanOrEqual(quota);
    // Sem cópia pendente em memória: quem abre o mesmo Storage (outra aba, a página recarregada) lê o mesmo.
    expect(store.get(PAST_GAMES_KEY)).toBe(disk.get(PAST_GAMES_KEY));
    expect(loadPastGames(safeStore(raw).store)).toEqual(loadPastGames(store));

    // Cota que nem a lista sem replays cabe: null, sem lançar, e o disco continua com a lista de antes.
    const before = disk.get(PAST_GAMES_KEY);
    limit = 10;
    expect(recordPastGame(store, entry({ date: 5, rounds: 5, replay }), 5)).toBeNull();
    expect(disk.get(PAST_GAMES_KEY)).toBe(before);
  });

  it('armazenamento que sempre recusa devolve null sem lançar', () => {
    const refusing = fakeStore(-1);
    expect(() => recordPastGame(refusing, entry(), 1_000)).not.toThrow();
    expect(recordPastGame(refusing, entry(), 1_000)).toBeNull();
    // Com replay, tira o replay e tenta de novo; sem nada mais para tirar, desiste.
    refusing.sets = 0;
    expect(recordPastGame(refusing, entry({ replay: realReplay('recusa') }), 1_000)).toBeNull();
    expect(refusing.sets).toBe(2);
    expect(loadPastGames(refusing)).toEqual([]);

    // O que já estava guardado fica como estava.
    const store = fakeStore();
    recordPastGame(store, entry({ rounds: 3 }), 1_000);
    store.quota = 0;
    expect(recordPastGame(store, entry({ rounds: 4 }), 2_000)).toBeNull();
    expect(loadPastGames(store).map((game) => game.rounds)).toEqual([3]);
  });

  it('um armazenamento que lança até no get não derruba nada', () => {
    const broken: KeyValueStore = {
      get: () => {
        throw new Error('SecurityError');
      },
      set: () => {
        throw new Error('SecurityError');
      },
      remove: () => {
        throw new Error('SecurityError');
      },
    };
    expect(loadPastGames(broken)).toEqual([]);
    expect(findPastGame(broken, 'x')).toBeNull();
    expect(recordPastGame(broken, entry(), 1_000)).toBeNull();
  });

  it('entrada que não vira JSON devolve null sem lançar', () => {
    const store = fakeStore();
    const circular = { ...entry() } as Record<string, unknown>;
    circular.self = circular;
    expect(recordPastGame(store, circular as unknown as Omit<PastGame, 'id'>, 1_000)).toBeNull();
    expect(store.data.has(PAST_GAMES_KEY)).toBe(false);
  });

  it('só devolve o que a leitura devolveria: entrada que seria rejeitada vira null e não grava', () => {
    const store = fakeStore();
    const rejected: [string, Partial<Omit<PastGame, 'id'>>][] = [
      ['rounds NaN', { rounds: NaN }],
      ['date infinita', { date: Infinity }],
      ['nível desconhecido', { mode: { kind: 'training', level: 'lendario' as never } }],
      ['sem o apelido', { names: { me: undefined as unknown as string, opponent: 'Bot' } }],
      ['key numérica', { key: 7 as unknown as string }],
    ];
    for (const [label, over] of rejected) {
      expect(recordPastGame(store, entry(over), 1_000), label).toBeNull();
    }
    expect(store.sets).toBe(0);
    expect(store.data.has(PAST_GAMES_KEY)).toBe(false);

    // Replay de forma errada sai sozinho, como na leitura; campo de fora também não fica.
    const crooked = { ...realReplay('torto'), seed: 12 as unknown as string };
    const saved = recordPastGame(store, { ...entry({ replay: crooked }), extra: 1 } as Omit<PastGame, 'id'>, 1_000)!;
    expect(saved).not.toHaveProperty('replay');
    expect(saved).not.toHaveProperty('extra');
    expect(findPastGame(store, saved.id)).toEqual(saved);
  });

  it('JSON estragado vira lista vazia', () => {
    const store = fakeStore();
    for (const text of ['{nope', '', '[1, 2', 'null', '{"id":"a"}', '"texto"', '42']) {
      store.set(PAST_GAMES_KEY, text);
      expect(loadPastGames(store), text).toEqual([]);
    }
    // Gravar por cima do estrago funciona: a lista recomeça com a partida nova.
    store.set(PAST_GAMES_KEY, '{nope');
    expect(recordPastGame(store, entry(), 1_000)).not.toBeNull();
    expect(loadPastGames(store)).toHaveLength(1);
  });

  describe('entrada com forma errada', () => {
    const GONE = Symbol('apagar');
    type Path = (string | number)[];
    /** Uma cópia de `source` com o valor de `path` trocado (ou apagado, com `GONE`). */
    function at(path: Path, value: unknown, source: unknown = rawGame('boa')): Record<string, unknown> {
      const copy = structuredClone(source) as Record<string | number, unknown>;
      let node = copy;
      for (const step of path.slice(0, -1)) node = node[step] as Record<string | number, unknown>;
      const last = path.at(-1)!;
      if (value === GONE) delete node[last];
      else node[last] = value;
      return copy;
    }

    const bad: [string, unknown][] = [
      ['null', null],
      ['texto', 'texto'],
      ['número', 42],
      ['lista', []],
      ['objeto vazio', {}],
      ['sem id', at(['id'], GONE)],
      ['id vazio', at(['id'], '')],
      ['id numérico', at(['id'], 7)],
      ['key numérica', at(['key'], 7)],
      ['date em texto', at(['date'], '2026-10-23')],
      ['date nula', at(['date'], null)],
      ['sem mode', at(['mode'], GONE)],
      ['mode em texto', at(['mode'], 'training')],
      ['mode de tipo desconhecido', at(['mode'], { kind: 'torneio' })],
      ['treino sem nível', at(['mode'], { kind: 'training' })],
      ['treino de nível desconhecido', at(['mode'], { kind: 'training', level: 'lendario' })],
      ['online sem código', at(['mode'], { kind: 'online' })],
      ['online com código vazio', at(['mode'], { kind: 'online', code: '' })],
      ['online com código numérico', at(['mode'], { kind: 'online', code: 12 })],
      ['seat numérico', at(['seat'], 1)],
      ['seat vazio', at(['seat'], '')],
      ['sem seat', at(['seat'], GONE)],
      ['sem names', at(['names'], GONE)],
      ['names.me numérico', at(['names', 'me'], 3)],
      ['sem names.opponent', at(['names', 'opponent'], GONE)],
      ['sem outcome', at(['outcome'], GONE)],
      ['outcome.gameNo em texto', at(['outcome', 'gameNo'], '1')],
      ['outcome.cause desconhecida', at(['outcome', 'cause'], 'ENJOO')],
      ['sem outcome.result', at(['outcome', 'result'], GONE)],
      ['outcome.result em texto', at(['outcome', 'result'], 'WIN')],
      ['outcome.result de tipo desconhecido', at(['outcome', 'result'], { kind: 'LOSS', reason: 'HP' })],
      ['vitória sem vencedor', at(['outcome', 'result'], { kind: 'WIN', reason: 'HP' })],
      ['vitória de motivo desconhecido', at(['outcome', 'result'], { kind: 'WIN', winner: 'p1', reason: 'SORTE' })],
      ['empate de motivo desconhecido', at(['outcome', 'result'], { kind: 'DRAW', reason: 'HP' })],
      ['rounds em texto', at(['rounds'], '7')],
      ['sem score', at(['score'], GONE)],
      ['score.p1 em texto', at(['score', 'p1'], '1')],
      ['score.p2 nulo', at(['score', 'p2'], null)],
      ['sem score.draws', at(['score', 'draws'], GONE)],
      ['rulesVersion em texto', at(['rulesVersion'], '1')],
      ['sem rulesVersion', at(['rulesVersion'], GONE)],
    ];

    it('é descartada e as boas ficam', () => {
      const store = fakeStore();
      for (const [label, item] of bad) {
        put(store, [rawGame('antes'), item, rawGame('depois')]);
        expect(
          loadPastGames(store).map((game) => game.id),
          label,
        ).toEqual(['antes', 'depois']);
      }
      // Tudo estragado de uma vez: sobra a lista vazia, sem lançar.
      put(
        store,
        bad.map(([, item]) => item),
      );
      expect(loadPastGames(store)).toEqual([]);
    });

    it('uma entrada boa passa por inteiro, com ou sem key e replay', () => {
      const store = fakeStore();
      const replay = realReplay('forma');
      const full = { ...rawGame('cheia'), key: 'sala:ABCD:2', mode: { kind: 'online', code: 'ABCD' }, replay };
      const draw = {
        ...rawGame('empate'),
        outcome: { gameNo: 2, result: { kind: 'DRAW', reason: 'ANTI_STALL' }, cause: 'AFK' },
      };
      const abandoned = { ...rawGame('abandonada'), outcome: { gameNo: 3, result: null, cause: 'ABANDONED' } };
      put(store, [full, draw, abandoned, rawGame('simples')]);
      expect(loadPastGames(store)).toEqual([full, draw, abandoned, rawGame('simples')]);
    });

    describe('no replay', () => {
      const valid = realReplay('replay-forma');
      const withReplay = { ...rawGame('r'), replay: valid };
      const inReplay = (path: Path, value: unknown): Record<string, unknown> =>
        at(['replay', ...path], value, withReplay);
      const badReplays: [string, unknown][] = [
        ['replay em texto', { ...rawGame('r'), replay: 'x' }],
        ['replay nulo', { ...rawGame('r'), replay: null }],
        ['replay lista', { ...rawGame('r'), replay: [] }],
        ['sem name', inReplay(['name'], GONE)],
        ['sem seed', inReplay(['seed'], GONE)],
        ['seed numérica', inReplay(['seed'], 12)],
        ['sem config', inReplay(['config'], GONE)],
        ['config nula', inReplay(['config'], null)],
        ['players de um só', inReplay(['players'], ['p1'])],
        ['players de três', inReplay(['players'], ['p1', 'p2', 'p3'])],
        ['players numéricos', inReplay(['players'], [1, 2])],
        ['sem players', inReplay(['players'], GONE)],
        ['steps em texto', inReplay(['steps'], 'x')],
        ['sem steps', inReplay(['steps'], GONE)],
        ['passo nulo', inReplay(['steps', 1], null)],
        ['passo sem player', inReplay(['steps', 2, 'player'], GONE)],
        ['passo sem action', inReplay(['steps', 2, 'action'], GONE)],
        ['passo com action em texto', inReplay(['steps', 2, 'action'], 'EQUIP')],
        ['passo com action sem type', inReplay(['steps', 2, 'action'], {})],
      ];

      it('é descartado e a linha fica', () => {
        const store = fakeStore();
        for (const [label, item] of badReplays) {
          put(store, [item]);
          const games = loadPastGames(store);
          expect(
            games.map((game) => game.id),
            label,
          ).toEqual(['r']);
          expect(games[0], label).not.toHaveProperty('replay');
          expect(games[0], label).toMatchObject({ names: { me: 'Ana' }, rounds: 7 });
        }
      });

      it('um replay inteiro, de partida de verdade, passa', () => {
        const store = fakeStore();
        put(store, [withReplay]);
        expect(loadPastGames(store)[0]!.replay).toEqual(valid);
      });
    });
  });

  describe('partidas repetidas', () => {
    const online = (gameNo: number, over: Partial<Omit<PastGame, 'id'>> = {}) =>
      entry({
        mode: { kind: 'online', code: 'ABCD' },
        key: `sala:ABCD:${gameNo}`,
        outcome: { gameNo, result: { kind: 'WIN', winner: 'p2', reason: 'EXODIA' }, cause: 'NORMAL' },
        ...over,
      });

    it('online repetida em 24 h devolve a existente', () => {
      const store = fakeStore();
      const t0 = 1_000_000;
      const first = recordPastGame(store, online(1, { date: t0, names: { me: 'Ana', opponent: 'Bia' } }), t0)!;
      const stored = store.data.get(PAST_GAMES_KEY);

      // Na volta do `hello` com a sala terminada, a mesma partida chega de novo (até 24 h depois, inclusive).
      for (const later of [t0 + 5_000, t0 + 3 * HOUR, t0 + DEDUPE_WINDOW_MS]) {
        const again = recordPastGame(store, online(1, { date: later, names: { me: 'Ana', opponent: 'Outro nome' } }), later);
        expect(again).toEqual(first);
      }
      expect(loadPastGames(store)).toHaveLength(1);
      expect(store.data.get(PAST_GAMES_KEY)).toBe(stored);
      expect(findPastGame(store, first.id)!.names.opponent).toBe('Bia');
    });

    it('a mesma sala depois de 24 h é outra partida', () => {
      const store = fakeStore();
      const t0 = 1_000_000;
      const first = recordPastGame(store, online(1, { date: t0 }), t0)!;
      const later = t0 + DEDUPE_WINDOW_MS + 1;
      const second = recordPastGame(store, online(1, { date: later }), later)!;
      expect(second.id).not.toBe(first.id);
      expect(loadPastGames(store).map((game) => game.id)).toEqual([second.id, first.id]);
    });

    it('outra partida da mesma sala, ou o treino, nunca é repetida', () => {
      const store = fakeStore();
      const a = recordPastGame(store, online(1), 1_000)!;
      const b = recordPastGame(store, online(2), 1_000)!;
      // O treino não tem `key`: duas partidas iguais, no mesmo instante, são duas partidas.
      const c = recordPastGame(store, entry(), 1_000)!;
      const d = recordPastGame(store, entry(), 1_000)!;
      expect(new Set([a.id, b.id, c.id, d.id]).size).toBe(4);
      expect(loadPastGames(store)).toHaveLength(4);
    });
  });

  it('o id serve na URL', () => {
    const store = fakeStore();
    const ids: string[] = [];
    // Vários no mesmo milissegundo, e um instante de verdade, de hoje.
    for (const now of [1_000, 1_000, 1_000, 1_000, 1_792_000_000_000, 1_792_000_000_000]) {
      ids.push(recordPastGame(store, entry(), now)!.id);
    }
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
      expect(encodeURIComponent(id)).toBe(id);
      expect(id.length).toBeLessThanOrEqual(16);
      expect(findPastGame(store, id)?.id).toBe(id);
    }
  });
});

describe('attachReplay', () => {
  it('acrescenta o replay e mantém o resto', () => {
    const store = fakeStore();
    const replay = realReplay('depois');
    const old = recordPastGame(store, entry({ date: 1, rounds: 1, mode: { kind: 'online', code: 'ABCD' }, key: 'sala:ABCD:1' }), 1)!;
    const other = recordPastGame(store, entry({ date: 2, rounds: 2, replay: realReplay('ja-tinha') }), 2)!;
    const before = loadPastGames(store);

    const attached = attachReplay(store, old.id, replay);

    // A linha volta como ficou, com o replay, e não muda de lugar nem de dados (`date`, `key`, placar...).
    expect(attached).toEqual({ ...old, replay });
    const after = loadPastGames(store);
    expect(after.map((game) => game.id)).toEqual([other.id, old.id]);
    expect(after[0]).toEqual(before[0]);
    expect(after[1]).toEqual({ ...before[1]!, replay });
    expect(findPastGame(store, old.id)).toEqual(attached);
  });

  it('a linha mais nova também recebe o replay, sem tocar nas mais velhas', () => {
    const store = fakeStore();
    const older = recordPastGame(store, entry({ date: 1, rounds: 1, replay: realReplay('velha') }), 1)!;
    const fresh = recordPastGame(store, entry({ date: 2, rounds: 2 }), 2)!;
    const replay = realReplay('nova');

    expect(attachReplay(store, fresh.id, replay)).toEqual({ ...fresh, replay });
    expect(loadPastGames(store)).toEqual([{ ...fresh, replay }, older]);
  });

  it('não troca um replay que já existe', () => {
    const store = fakeStore();
    const first = realReplay('primeiro');
    const row = recordPastGame(store, entry({ replay: first }), 1_000)!;
    const stored = store.data.get(PAST_GAMES_KEY);
    store.sets = 0;

    // Devolve a linha como está e não grava.
    expect(attachReplay(store, row.id, realReplay('segundo'))).toEqual(row);
    expect(store.sets).toBe(0);
    expect(store.data.get(PAST_GAMES_KEY)).toBe(stored);
    expect(findPastGame(store, row.id)!.replay).toEqual(first);
  });

  it('id que sumiu devolve null', () => {
    const store = fakeStore();
    const row = recordPastGame(store, entry(), 1_000)!;
    store.sets = 0;

    expect(attachReplay(store, 'nao-existe', realReplay('x'))).toBeNull();
    // Sem gravar nada.
    expect(store.sets).toBe(0);
    expect(loadPastGames(store)).toEqual([row]);
    // Lista que nunca foi gravada: o mesmo.
    expect(attachReplay(fakeStore(), row.id, realReplay('x'))).toBeNull();
  });

  it('um replay de forma errada não entra, e a linha fica como estava', () => {
    const store = fakeStore();
    const row = recordPastGame(store, entry(), 1_000)!;
    const stored = store.data.get(PAST_GAMES_KEY);
    store.sets = 0;

    const broken = { ...realReplay('quebrado'), steps: 'não são passos' } as unknown as Replay;
    expect(attachReplay(store, row.id, broken)).toEqual(row);
    expect(store.sets).toBe(0);
    expect(store.data.get(PAST_GAMES_KEY)).toBe(stored);
  });

  it('respeita o teto de 1 MB', () => {
    const store = fakeStore();
    const filler = bulky(realReplay('enchimento'), 60_000);
    for (let i = 0; i < MAX_PAST_GAMES - 1; i++) recordPastGame(store, entry({ date: i, rounds: i, replay: filler }), i);
    const target = recordPastGame(store, entry({ date: 100, rounds: 100 }), 100)!;
    const replay = bulky(realReplay('anexo'), 150_000);
    const before = hasReplay(loadPastGames(store)).filter(Boolean).length;
    // Sem tirar nada a lista passaria do teto: o anexo só cabe à custa dos replays das mais velhas.
    const naive = loadPastGames(store).map((game) => (game.id === target.id ? { ...game, replay } : game));
    expect(JSON.stringify(naive).length).toBeGreaterThan(MAX_PAST_GAMES_CHARS);

    const attached = attachReplay(store, target.id, replay);

    expect(attached).toEqual({ ...target, replay });
    expect(store.data.get(PAST_GAMES_KEY)!.length).toBeLessThanOrEqual(MAX_PAST_GAMES_CHARS);
    const games = loadPastGames(store);
    expect(games).toHaveLength(MAX_PAST_GAMES);
    expect(games[0]).toEqual({ ...target, replay });
    // Nenhuma linha se perde; o que sai é replay, sempre o da mais velha que ainda tinha um.
    const flags = hasReplay(games);
    const kept = flags.filter(Boolean).length;
    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeLessThanOrEqual(before);
    expect(flags).toEqual([...Array<boolean>(kept).fill(true), ...Array<boolean>(MAX_PAST_GAMES - kept).fill(false)]);
    expect(games.map((game) => game.rounds)).toEqual([100, ...Array.from({ length: MAX_PAST_GAMES - 1 }, (_, i) => MAX_PAST_GAMES - 2 - i)]);
  });

  it('o teto é exato: com 1 000 000 caracteres cabe sem tirar nada, com 1 a mais sai só o replay da mais velha', () => {
    const replay = realReplay('borda');
    const build = (pad: number) => {
      const store = fakeStore();
      recordPastGame(store, entry({ date: 1, rounds: 1, replay }), 1);
      recordPastGame(store, entry({ date: 2, rounds: 2, replay }), 2);
      const last = recordPastGame(store, entry({ date: 3, rounds: 3 }), 3)!;
      attachReplay(store, last.id, { ...replay, name: 'x'.repeat(pad) });
      return store;
    };
    const pad = MAX_PAST_GAMES_CHARS - build(0).data.get(PAST_GAMES_KEY)!.length;

    const exact = build(pad);
    expect(exact.data.get(PAST_GAMES_KEY)!.length).toBe(MAX_PAST_GAMES_CHARS);
    expect(hasReplay(loadPastGames(exact))).toEqual([true, true, true]);

    const over = build(pad + 1);
    expect(over.data.get(PAST_GAMES_KEY)!.length).toBeLessThanOrEqual(MAX_PAST_GAMES_CHARS);
    expect(hasReplay(loadPastGames(over))).toEqual([true, true, false]);
  });

  it('só tira replays das linhas mais velhas que a que recebeu: o de uma mais nova fica', () => {
    const store = fakeStore();
    // Da mais velha para a mais nova: uma com replay, a que vai receber o seu (sem), e uma mais nova com replay.
    const older = recordPastGame(store, entry({ date: 1, rounds: 1, replay: bulky(realReplay('velha'), 400_000) }), 1)!;
    const target = recordPastGame(store, entry({ date: 2, rounds: 2 }), 2)!;
    const newer = recordPastGame(store, entry({ date: 3, rounds: 3, replay: bulky(realReplay('nova'), 400_000) }), 3)!;
    const replay = bulky(realReplay('anexo'), 400_000);
    expect(hasReplay(loadPastGames(store))).toEqual([true, false, true]);

    const attached = attachReplay(store, target.id, replay);

    // Para caber, saiu o replay da mais velha; o da mais nova e o do anexo ficam.
    expect(attached).toEqual({ ...target, replay });
    expect(store.data.get(PAST_GAMES_KEY)!.length).toBeLessThanOrEqual(MAX_PAST_GAMES_CHARS);
    const games = loadPastGames(store);
    expect(games.map((game) => game.id)).toEqual([newer.id, target.id, older.id]);
    expect(hasReplay(games)).toEqual([true, true, false]);
  });

  it('se só couber tirando o replay de uma linha mais nova, o replay não entra: a linha volta como estava e nada é gravado', () => {
    const store = fakeStore();
    const target = recordPastGame(store, entry({ date: 1, rounds: 1 }), 1)!;
    const newer = recordPastGame(store, entry({ date: 2, rounds: 2, replay: bulky(realReplay('nova'), 600_000) }), 2)!;
    const stored = store.data.get(PAST_GAMES_KEY);
    store.sets = 0;

    const attached = attachReplay(store, target.id, bulky(realReplay('anexo'), 600_000));

    expect(attached).toEqual(target);
    expect(store.sets).toBe(0);
    expect(store.data.get(PAST_GAMES_KEY)).toBe(stored);
    expect(findPastGame(store, newer.id)!.replay).toBeDefined();
  });

  it('um replay sozinho maior que o teto não entra: a linha volta como estava e o armazenamento não muda', () => {
    const store = fakeStore();
    const keep = recordPastGame(store, entry({ date: 1, rounds: 1, replay: realReplay('guardado') }), 1)!;
    const row = recordPastGame(store, entry({ date: 2, rounds: 2 }), 2)!;
    const stored = store.data.get(PAST_GAMES_KEY);
    store.sets = 0;

    const attached = attachReplay(store, row.id, bulky(realReplay('gigante'), 1_200_000));

    expect(attached).toEqual(row);
    expect(attached).not.toHaveProperty('replay');
    // Não tirou o replay das outras à toa: a lista de antes continua inteira.
    expect(store.sets).toBe(0);
    expect(store.data.get(PAST_GAMES_KEY)).toBe(stored);
    expect(findPastGame(store, keep.id)!.replay).toBeDefined();
  });

  it('cota estourada tira os replays das mais velhas e tenta de novo', () => {
    const replay = realReplay('cota-anexo');
    const store = fakeStore();
    for (let i = 1; i <= 3; i++) recordPastGame(store, entry({ date: i, rounds: i, replay }), i);
    const target = recordPastGame(store, entry({ date: 4, rounds: 4 }), 4)!;
    // A cota que sobra para o anexo e só o replay da mais nova das três que já tinham.
    const full = loadPastGames(store).map((game) => (game.id === target.id ? { ...game, replay } : game));
    store.quota = JSON.stringify(full.map((game, i) => (i < 2 ? game : { ...game, replay: undefined }))).length;
    store.sets = 0;

    const attached = attachReplay(store, target.id, replay);

    expect(attached?.replay).toEqual(replay);
    // Tentou com tudo, depois sem o replay da mais velha, depois sem o das duas mais velhas.
    expect(store.sets).toBe(3);
    expect(hasReplay(loadPastGames(store))).toEqual([true, true, false, false]);
  });

  it('armazenamento que recusa devolve null sem lançar', () => {
    const store = fakeStore();
    const keep = recordPastGame(store, entry({ date: 1, rounds: 1, replay: realReplay('antigo') }), 1)!;
    const row = recordPastGame(store, entry({ date: 2, rounds: 2 }), 2)!;
    const stored = store.data.get(PAST_GAMES_KEY);
    // Nem o replay sozinho cabe na cota: depois de tirar os das outras, desiste.
    store.quota = 10;

    expect(() => attachReplay(store, row.id, realReplay('novo'))).not.toThrow();
    expect(attachReplay(store, row.id, realReplay('novo'))).toBeNull();
    // O que estava guardado fica como estava.
    expect(store.data.get(PAST_GAMES_KEY)).toBe(stored);
    expect(findPastGame(store, keep.id)!.replay).toBeDefined();
  });

  it('um armazenamento que lança até no get devolve null', () => {
    const boom = (): never => {
      throw new Error('SecurityError');
    };
    expect(attachReplay({ get: boom, set: boom, remove: boom }, 'x', realReplay('x'))).toBeNull();
  });

  it('um replay que não vira JSON devolve null sem lançar', () => {
    const store = fakeStore();
    const row = recordPastGame(store, entry(), 1_000)!;
    const cyclic = { ...realReplay('ciclo') } as Replay & { self?: unknown };
    cyclic.self = cyclic;
    expect(attachReplay(store, row.id, cyclic)).toBeNull();
    expect(loadPastGames(store)).toEqual([row]);
  });

  it('com o safeStore de verdade, a cota do Storage corta replays e o disco fica com a lista completa', () => {
    const replay = realReplay('disco-anexo');
    const disk = new Map<string, string>();
    let limit = Infinity;
    const raw: Storage = {
      get length() {
        return disk.size;
      },
      clear: () => disk.clear(),
      key: (index) => [...disk.keys()][index] ?? null,
      getItem: (key) => disk.get(key) ?? null,
      removeItem: (key) => void disk.delete(key),
      setItem(key, value) {
        if (key === PAST_GAMES_KEY && value.length > limit) throw new Error('QuotaExceededError');
        disk.set(key, value);
      },
    };
    const { store } = safeStore(raw);
    for (let i = 1; i <= 3; i++) recordPastGame(store, entry({ date: i, rounds: i, replay }), i);
    const target = recordPastGame(store, entry({ date: 4, rounds: 4 }), 4)!;
    const full = loadPastGames(store).map((game) => (game.id === target.id ? { ...game, replay } : game));
    limit = JSON.stringify(full.map((game, i) => (i < 2 ? game : { ...game, replay: undefined }))).length;

    expect(attachReplay(store, target.id, replay)?.replay).toEqual(replay);
    const onDisk = JSON.parse(disk.get(PAST_GAMES_KEY)!) as PastGame[];
    expect(onDisk.map((game) => game.rounds)).toEqual([4, 3, 2, 1]);
    expect(hasReplay(onDisk)).toEqual([true, true, false, false]);
    // Sem cópia pendente em memória: quem abre o mesmo Storage lê o mesmo.
    expect(store.get(PAST_GAMES_KEY)).toBe(disk.get(PAST_GAMES_KEY));
  });
});
