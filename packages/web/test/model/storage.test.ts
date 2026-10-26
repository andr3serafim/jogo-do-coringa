import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  diagnostic,
  forgetSeat,
  loadNickname,
  loadPrefs,
  loadSeat,
  loadTutorialState,
  safeStore,
  saveLastSeq,
  saveNickname,
  savePrefs,
  saveSeat,
  saveTutorialState,
  type KeyValueStore,
} from '../../src/model/storage.ts';

// Token de teste fixo: 43 caracteres base64url, como o do servidor.
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

function throwingStorage(on: 'getItem' | 'setItem' | 'removeItem' | 'all'): Storage {
  const base = memoryStorage();
  const boom = (): never => {
    throw new Error('SecurityError');
  };
  return {
    get length() {
      return base.length;
    },
    clear: () => base.clear(),
    key: (index) => base.key(index),
    getItem: on === 'getItem' || on === 'all' ? boom : (key) => base.getItem(key),
    setItem: on === 'setItem' || on === 'all' ? boom : (key, value) => base.setItem(key, value),
    removeItem: on === 'removeItem' || on === 'all' ? boom : (key) => base.removeItem(key),
  };
}

function fresh(): KeyValueStore {
  return safeStore(memoryStorage()).store;
}

describe('safeStore', () => {
  it('com Storage que funciona: available true e grava no Storage', () => {
    const raw = memoryStorage();
    const { store, available } = safeStore(raw);
    expect(available).toBe(true);
    store.set('k', 'v');
    expect(raw.getItem('k')).toBe('v');
    expect(store.get('k')).toBe('v');
    store.remove('k');
    expect(raw.getItem('k')).toBeNull();
    expect(store.get('k')).toBeNull();
  });

  it('não deixa a sonda de teste no Storage', () => {
    const raw = memoryStorage();
    safeStore(raw);
    expect(raw.length).toBe(0);
  });

  it('sem Storage (undefined): memória, available false', () => {
    const { store, available } = safeStore(undefined);
    expect(available).toBe(false);
    store.set('k', 'v');
    expect(store.get('k')).toBe('v');
    store.remove('k');
    expect(store.get('k')).toBeNull();
  });

  it.each(['getItem', 'setItem', 'removeItem', 'all'] as const)(
    'Storage que lança em %s: available false e opera em memória',
    (on) => {
      const { store, available } = safeStore(throwingStorage(on));
      expect(available).toBe(false);
      store.set('k', 'v');
      expect(store.get('k')).toBe('v');
      store.remove('k');
      expect(store.get('k')).toBeNull();
    },
  );

  /** Um `Storage` que passa na sonda e depois recusa (cota cheia), até `full.on` voltar a false. */
  function fillingStorage() {
    const base = memoryStorage();
    const full = { on: false };
    const storage: Storage = {
      get length() {
        return base.length;
      },
      clear: () => base.clear(),
      key: (index) => base.key(index),
      getItem: (key) => {
        if (full.on) throw new Error('boom');
        return base.getItem(key);
      },
      setItem: (key, value) => {
        if (full.on) throw new Error('quota');
        base.setItem(key, value);
      },
      removeItem: (key) => {
        if (full.on) throw new Error('boom');
        base.removeItem(key);
      },
    };
    return { storage, base, full };
  }

  it('Storage que passa a lançar depois da sonda: o set guarda em memória e relança; get e remove caem em memória', () => {
    const { storage, full } = fillingStorage();
    const { store, available } = safeStore(storage);
    expect(available).toBe(true);
    full.on = true;
    // Quem grava precisa saber que não foi para o disco; a sessão, porém, segue vendo o valor mais novo.
    expect(() => store.set('k', 'v')).toThrow('quota');
    expect(store.get('k')).toBe('v');
    expect(() => store.remove('k')).not.toThrow();
    expect(store.get('k')).toBeNull();
  });

  it('o set que falhou e depois cabe vai para o disco, e a cópia em memória sai', () => {
    const { storage, base, full } = fillingStorage();
    const { store } = safeStore(storage);
    full.on = true;
    expect(() => store.set('k', 'velho')).toThrow();
    full.on = false;
    store.set('k', 'novo');
    expect(base.getItem('k')).toBe('novo');
    expect(store.get('k')).toBe('novo');
    // Sem a cópia em memória: o que o disco muda por fora é o que a leitura vê.
    base.setItem('k', 'de fora');
    expect(store.get('k')).toBe('de fora');
  });

  it('as gravações do app engolem a falha da cota: o app não lança e a sessão vê o valor', () => {
    const { storage, base, full } = fillingStorage();
    const { store } = safeStore(storage);
    full.on = true;
    expect(() => saveNickname(store, 'Ana')).not.toThrow();
    expect(() => savePrefs(store, { ...DEFAULT_PREFS, sound: false })).not.toThrow();
    expect(() => saveSeat(store, 'ABC234', { token: TOKEN, playerId: 'ana', nickname: 'Ana' })).not.toThrow();
    expect(loadNickname(store)).toBe('Ana');
    expect(loadPrefs(store).sound).toBe(false);
    expect(loadSeat(store, 'ABC234')).toMatchObject({ playerId: 'ana' });
    expect(base.length).toBe(0);
  });
});

describe('assento', () => {
  const seat = { token: TOKEN, playerId: 'ana', nickname: 'Ana', lastSeq: 7 };

  it('ida e volta de SeatSession na chave coringa:sala:<CÓDIGO>', () => {
    const raw = memoryStorage();
    const { store } = safeStore(raw);
    saveSeat(store, '7KQ2MD', seat);
    expect(raw.getItem('coringa:sala:7KQ2MD')).not.toBeNull();
    expect(loadSeat(store, '7KQ2MD')).toEqual(seat);
  });

  it('assento sem lastSeq volta sem lastSeq', () => {
    const store = fresh();
    saveSeat(store, 'ABC234', { token: TOKEN, playerId: 'duda', nickname: 'Duda' });
    expect(loadSeat(store, 'ABC234')).toEqual({ token: TOKEN, playerId: 'duda', nickname: 'Duda' });
  });

  it('sala desconhecida dá null', () => {
    expect(loadSeat(fresh(), 'ZZZZZZ')).toBeNull();
  });

  it('salas diferentes não se misturam', () => {
    const store = fresh();
    saveSeat(store, 'AAAAAA', seat);
    expect(loadSeat(store, 'BBBBBB')).toBeNull();
  });

  it('saveLastSeq mantém o token e os outros campos', () => {
    const store = fresh();
    saveSeat(store, '7KQ2MD', seat);
    saveLastSeq(store, '7KQ2MD', 42);
    expect(loadSeat(store, '7KQ2MD')).toEqual({ ...seat, lastSeq: 42 });
  });

  it('saveLastSeq sem assento salvo não cria nada', () => {
    const store = fresh();
    saveLastSeq(store, '7KQ2MD', 5);
    expect(loadSeat(store, '7KQ2MD')).toBeNull();
    expect(store.get('coringa:sala:7KQ2MD')).toBeNull();
  });

  it('forgetSeat apaga o assento', () => {
    const store = fresh();
    saveSeat(store, '7KQ2MD', seat);
    forgetSeat(store, '7KQ2MD');
    expect(loadSeat(store, '7KQ2MD')).toBeNull();
  });

  it.each([
    ['JSON quebrado', '{token:'],
    ['não é objeto', '"texto"'],
    ['null', 'null'],
    ['array', '[]'],
    ['sem token', JSON.stringify({ playerId: 'ana', nickname: 'Ana' })],
    ['token vazio', JSON.stringify({ token: '', playerId: 'ana', nickname: 'Ana' })],
    ['token que não é texto', JSON.stringify({ token: 5, playerId: 'ana', nickname: 'Ana' })],
    ['sem playerId', JSON.stringify({ token: TOKEN, nickname: 'Ana' })],
    ['sem apelido', JSON.stringify({ token: TOKEN, playerId: 'ana' })],
  ])('%s dá null', (_name, raw) => {
    const store = fresh();
    store.set('coringa:sala:7KQ2MD', raw);
    expect(loadSeat(store, '7KQ2MD')).toBeNull();
  });

  it.each([
    ['negativo', -1],
    ['fracionário', 1.5],
    ['texto', '3'],
    ['nulo', null],
  ])('lastSeq %s é descartado e o resto do assento sobrevive', (_name, lastSeq) => {
    const store = fresh();
    store.set('coringa:sala:7KQ2MD', JSON.stringify({ token: TOKEN, playerId: 'ana', nickname: 'Ana', lastSeq }));
    expect(loadSeat(store, '7KQ2MD')).toEqual({ token: TOKEN, playerId: 'ana', nickname: 'Ana' });
  });

  it('lastSeq 0 é válido', () => {
    const store = fresh();
    saveSeat(store, '7KQ2MD', { ...seat, lastSeq: 0 });
    expect(loadSeat(store, '7KQ2MD')?.lastSeq).toBe(0);
  });

  it('em memória (Storage que lança) o assento também faz a ida e volta', () => {
    const { store } = safeStore(throwingStorage('all'));
    saveSeat(store, '7KQ2MD', seat);
    expect(loadSeat(store, '7KQ2MD')).toEqual(seat);
    forgetSeat(store, '7KQ2MD');
    expect(loadSeat(store, '7KQ2MD')).toBeNull();
  });
});

describe('preferências', () => {
  it('padrão: passe automático ligado, movimento normal, som ligado', () => {
    expect(DEFAULT_PREFS).toEqual({ autoPass: true, reduceMotion: false, sound: true });
    expect(loadPrefs(fresh())).toEqual(DEFAULT_PREFS);
  });

  it('ida e volta', () => {
    const raw = memoryStorage();
    const { store } = safeStore(raw);
    savePrefs(store, { autoPass: false, reduceMotion: true, sound: false });
    expect(raw.getItem('coringa:prefs')).not.toBeNull();
    expect(loadPrefs(store)).toEqual({ autoPass: false, reduceMotion: true, sound: false });
  });

  it('campo faltando completa com o padrão', () => {
    const store = fresh();
    store.set('coringa:prefs', JSON.stringify({ reduceMotion: true }));
    expect(loadPrefs(store)).toEqual({ autoPass: true, reduceMotion: true, sound: true });
    store.set('coringa:prefs', JSON.stringify({ autoPass: false }));
    expect(loadPrefs(store)).toEqual({ autoPass: false, reduceMotion: false, sound: true });
  });

  it('o som: sem a chave vem ligado; com sound: false, desligado; valor que não é booleano volta a ligado', () => {
    const store = fresh();
    expect(loadPrefs(store).sound).toBe(true);
    store.set('coringa:prefs', JSON.stringify({ autoPass: false, reduceMotion: true }));
    expect(loadPrefs(store).sound).toBe(true);
    store.set('coringa:prefs', JSON.stringify({ sound: false }));
    expect(loadPrefs(store)).toEqual({ autoPass: true, reduceMotion: false, sound: false });
    for (const sound of ['não', 0, 1, null, [], {}]) {
      store.set('coringa:prefs', JSON.stringify({ sound }));
      expect(loadPrefs(store).sound).toBe(true);
    }
  });

  it('campo com tipo errado volta ao padrão', () => {
    const store = fresh();
    store.set('coringa:prefs', JSON.stringify({ autoPass: 'sim', reduceMotion: 1, sound: 'alto' }));
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS);
  });

  it.each(['{quebrado', 'null', '"x"', '[]', '7'])('JSON %s dá os padrões', (raw) => {
    const store = fresh();
    store.set('coringa:prefs', raw);
    expect(loadPrefs(store)).toEqual(DEFAULT_PREFS);
  });

  it('o padrão devolvido é uma cópia', () => {
    const prefs = loadPrefs(fresh());
    prefs.autoPass = false;
    expect(DEFAULT_PREFS.autoPass).toBe(true);
  });
});

describe('apelido', () => {
  it('ida e volta na chave coringa:apelido', () => {
    const raw = memoryStorage();
    const { store } = safeStore(raw);
    saveNickname(store, 'Duda');
    expect(raw.getItem('coringa:apelido')).toBe('Duda');
    expect(loadNickname(store)).toBe('Duda');
  });

  it('sem apelido salvo dá texto vazio', () => {
    expect(loadNickname(fresh())).toBe('');
  });
});

describe('o tutorial (coringa:tutorial)', () => {
  it('ida e volta, na chave coringa:tutorial', () => {
    const raw = memoryStorage();
    const { store } = safeStore(raw);
    saveTutorialState(store, 'skipped');
    expect(raw.getItem('coringa:tutorial')).toBe('skipped');
    expect(loadTutorialState(store)).toBe('skipped');
    saveTutorialState(store, 'done');
    expect(raw.getItem('coringa:tutorial')).toBe('done');
    expect(loadTutorialState(store)).toBe('done');
  });

  it('sem nada guardado, ou com um valor que não é estado, dá null', () => {
    expect(loadTutorialState(fresh())).toBeNull();
    const store = fresh();
    store.set('coringa:tutorial', 'quase');
    expect(loadTutorialState(store)).toBeNull();
    store.set('coringa:tutorial', '');
    expect(loadTutorialState(store)).toBeNull();
  });
});

describe('KeyValueStore que lança (defesa em profundidade)', () => {
  const hostile: KeyValueStore = {
    get: () => {
      throw new Error('boom');
    },
    set: () => {
      throw new Error('boom');
    },
    remove: () => {
      throw new Error('boom');
    },
  };

  it('nenhuma operação do modelo lança', () => {
    expect(loadSeat(hostile, '7KQ2MD')).toBeNull();
    expect(() => saveSeat(hostile, '7KQ2MD', { token: TOKEN, playerId: 'ana', nickname: 'Ana' })).not.toThrow();
    expect(() => saveLastSeq(hostile, '7KQ2MD', 1)).not.toThrow();
    expect(() => forgetSeat(hostile, '7KQ2MD')).not.toThrow();
    expect(loadPrefs(hostile)).toEqual(DEFAULT_PREFS);
    expect(() => savePrefs(hostile, DEFAULT_PREFS)).not.toThrow();
    expect(loadNickname(hostile)).toBe('');
    expect(() => saveNickname(hostile, 'Ana')).not.toThrow();
    expect(loadTutorialState(hostile)).toBeNull();
    expect(() => saveTutorialState(hostile, 'done')).not.toThrow();
  });
});

describe('diagnostic', () => {
  const info = { code: '7KQ2MD', seq: 12, epoch: 3, version: 'abc1234', message: 'Falhou' };

  it('leva código, seq, época, versão e mensagem', () => {
    const text = diagnostic(info);
    expect(text).toContain('7KQ2MD');
    expect(text).toContain('12');
    expect(text).toContain('3');
    expect(text).toContain('abc1234');
    expect(text).toContain('Falhou');
  });

  it('valores ausentes saem como traço', () => {
    const text = diagnostic({ ...info, code: null, seq: null, epoch: null });
    expect(text).not.toContain('null');
    expect(text).toContain('—');
  });

  it('mascara o token dentro da mensagem', () => {
    const text = diagnostic({ ...info, message: `Erro no socket ?token=${TOKEN} e de novo ${TOKEN}.` });
    expect(text).not.toContain(TOKEN);
    expect(text).toContain('Erro no socket');
    expect(text).toContain('[token oculto]');
  });

  it('mascara o token também em outros campos', () => {
    const text = diagnostic({ ...info, version: TOKEN });
    expect(text).not.toContain(TOKEN);
  });

  it('mascara a corrida de 43 caracteres base64url, mesmo colada em outros textos', () => {
    const text = diagnostic({ ...info, message: `x${TOKEN}y` });
    expect(text).not.toMatch(/[A-Za-z0-9_-]{43}/);
  });

  it('não mexe em mensagens comuns', () => {
    const text = diagnostic({ ...info, message: 'TypeError: cannot read properties of undefined' });
    expect(text).toContain('TypeError: cannot read properties of undefined');
  });
});
