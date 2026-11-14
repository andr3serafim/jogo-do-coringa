// Os botões de carimbo (bloco D dos pontos do playtest, ponto 5; spec do playtest §6.1): o Atacar vermelho com a espada e a prévia numa
// tira lisa, o Ataque Absoluto armado (a borda de ouro, a etiqueta e a faísca), o Passar e o Encerrar turno de papel, o Confirmar de ouro,
// os selos do Desfazer e do Recomeçar, os pingos do toque e as formas paradas do movimento reduzido.
import { previewAttack } from '@coringa/engine';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, type Prefs } from '../../src/model/storage.ts';
import { Session } from '../../src/model/session.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { FakeConnection, scenarioAt, stateMessage, type ViewSpec } from '../fixtures.ts';
import { ATTACK_BUTTON, END_TURN_BUTTON, roomMessage } from './support.tsx';

const seatOf = (playerId: 'p1' | 'p2', nickname: string) => ({ playerId, nickname, connected: true, ready: true, wantsRematch: false });

const DRAFT: ViewSpec = {
  round: 7,
  self: {
    hp: 187,
    hand: ['K', 'A', 'Q'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    attackBuffs: ['J', 'WILD', 'J'],
    defenseBuffs: ['Q'],
    guard: ['K'],
  },
  opponent: {
    hp: 214,
    hand: ['A', 'K', 'WILD'],
    attackRow: [6, 9, 3, 10],
    defenseRow: [5, 7, 2],
    attackBuffs: ['J', 'J'],
    defenseBuffs: ['Q', 'Q'],
    guard: [],
  },
  graveyard: [3, 5, 8],
};

/** O Ataque Absoluto armado: os J no limite. */
const ARMED: ViewSpec = { ...DRAFT, self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] } };
const EQUIP: ViewSpec = { ...DRAFT, phase: { kind: 'EQUIP' }, self: { ...DRAFT.self, pending: [7] }, opponent: { ...DRAFT.opponent, pending: [5] } };

const sessions: Session[] = [];
afterEach(() => {
  for (const session of sessions.splice(0)) session.dispose();
  document.querySelectorAll('[data-pingo]').forEach((drop) => drop.remove());
});

function mount(spec: ViewSpec = DRAFT, prefs: Partial<Prefs> = {}) {
  const { view } = scenarioAt(spec);
  const room = roomMessage({ status: 'PLAYING', seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda')], score: { p1: 0, p2: 0 } });
  const connection = new FakeConnection({ playerId: 'p1', room, state: stateMessage(view), now: 0 });
  const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined }, { ...DEFAULT_PREFS, ...prefs });
  sessions.push(session);
  return { view, ...render(<PlayTable session={session} />) };
}

const inBar = () => within(screen.getByRole('region', { name: 'Ações' }));
const inEquip = () => within(screen.getByRole('region', { name: 'Equipar' }));
const classes = (el: Element) => el.className.split(/\s+/);

describe('carimbos: o Atacar', () => {
  it('é o carimbo vermelho, com a espada, o título em tipo de madeira e a prévia numa tira lisa de papel', () => {
    mount();
    const attack = inBar().getByRole('button', { name: ATTACK_BUTTON });
    expect(classes(attack)).toEqual(expect.arrayContaining(['carimbo', 'carimbo-atacar', 'min-h-14']));
    expect(attack.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    const strip = attack.querySelector('[data-tira]')!;
    expect(strip.textContent).toMatch(/dano \d+/);
    // A prévia é número de jogo: fonte de texto, algarismos tabulares, sem o grão (spec §10.7).
    expect(classes(strip)).toEqual(expect.arrayContaining(['carimbo-tira', 'tabular-nums', 'font-texto']));
    expect(strip.className).not.toMatch(/grao|textura/);
    // Sem o Absoluto armado, nem etiqueta nem faísca.
    expect(attack).not.toHaveAttribute('data-absoluto');
    expect(document.querySelector('[data-etiqueta-absoluto]')).toBeNull();
    expect(document.querySelector('[data-faisca]')).toBeNull();
  });

  it('com o Ataque Absoluto armado: a borda de ouro, a etiqueta fora do botão (só desenho) e a faísca que corre a borda', () => {
    const { view } = mount(ARMED);
    expect(previewAttack(view, 'self').absolute).toBe(true);
    const attack = inBar().getByRole('button', { name: ATTACK_BUTTON });
    expect(attack).toHaveAttribute('data-absoluto');
    const tag = document.querySelector('[data-etiqueta-absoluto]')!;
    expect(tag).toHaveTextContent('Ataque Absoluto');
    expect(tag).toHaveAttribute('aria-hidden', 'true');
    // Rótulo no nome (WCAG 2.5.3): a etiqueta é irmã do botão, e o nome já diz o Absoluto pela prévia.
    expect(attack.contains(tag)).toBe(false);
    expect(attack).toHaveAccessibleName(/Ataque Absoluto, dano \d+/);
    const spark = document.querySelector('[data-faisca]')!;
    expect(spark).toHaveAttribute('aria-hidden', 'true');
    expect(attack.contains(spark)).toBe(false);
  });

  it('com movimento reduzido, o Absoluto armado fica parado: a borda e a etiqueta, sem a faísca', () => {
    mount(ARMED, { reduceMotion: true });
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toHaveAttribute('data-absoluto');
    expect(document.querySelector('[data-etiqueta-absoluto]')).not.toBeNull();
    expect(document.querySelector('[data-faisca]')).toBeNull();
    expect(document.querySelector('[data-palco]')).toHaveAttribute('data-movimento-reduzido');
  });

  it('sem movimento reduzido, o palco não leva a marca', () => {
    mount();
    expect(document.querySelector('[data-palco]')).not.toHaveAttribute('data-movimento-reduzido');
  });
});

describe('carimbos: os outros', () => {
  it('Encerrar turno é de papel (o Atacar é o único vermelho)', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, attackRow: [] } });
    const end = inBar().getByRole('button', { name: END_TURN_BUTTON });
    expect(classes(end)).toEqual(expect.arrayContaining(['carimbo', 'carimbo-papel', 'carimbo-grande', 'min-h-14']));
    expect(classes(end)).not.toContain('carimbo-atacar');
  });

  it('Passar é de papel, e as respostas da janela são carimbos pequenos', () => {
    mount({ ...DRAFT, phase: 'ATTACK' });
    const pass = inBar().getByRole('button', { name: 'Passar' });
    expect(classes(pass)).toEqual(expect.arrayContaining(['carimbo', 'carimbo-papel', 'carimbo-grande']));
    expect(classes(pass)).not.toContain('carimbo-ouro');
  });

  it('as jogadas da carta tocada são carimbos pequenos de papel, sem o grão (levam prévias)', () => {
    mount();
    fireEvent.click(within(screen.getByRole('list', { name: 'Sua mão' })).getByRole('button', { name: /^Q, Bônus de defesa/ }));
    const plays = within(inBar().getByRole('list', { name: 'Jogadas' })).getAllByRole('button');
    expect(plays.length).toBeGreaterThan(0);
    for (const play of plays) {
      expect(classes(play)).toEqual(expect.arrayContaining(['carimbo', 'carimbo-papel', 'min-h-11']));
      expect(classes(play)).not.toContain('carimbo-grande');
    }
  });

  it('no Equipar: o Confirmar é de ouro, e o Desfazer e o Recomeçar são selos redondos com desenho e legenda', () => {
    mount(EQUIP);
    for (const name of ['Desfazer', 'Recomeçar']) {
      const seal = inEquip().getByRole('button', { name });
      expect(classes(seal)).toEqual(expect.arrayContaining(['carimbo-selo', 'min-h-11', 'min-w-11']));
      // O texto visível é a legenda (o nome do botão); o desenho é só desenho.
      expect(seal.textContent).toBe(name);
      expect(seal.querySelector('[data-selo] svg[aria-hidden="true"]')).not.toBeNull();
      expect(seal).toBeDisabled();
    }
    fireEvent.click(within(inEquip().getByRole('list', { name: 'Destinos' })).getAllByRole('button')[0]!);
    const confirm = inEquip().getByRole('button', { name: 'Confirmar' });
    expect(classes(confirm)).toEqual(expect.arrayContaining(['carimbo', 'carimbo-ouro', 'carimbo-grande']));
    expect(inEquip().getByRole('button', { name: 'Desfazer' })).toBeEnabled();
  });

  it('na escolha da ordem: "Atacar primeiro" é de ouro e "Atacar em segundo" é de papel', () => {
    mount({ ...DRAFT, phase: { kind: 'ORDER_CHOICE', player: 'p1' } });
    const order = within(screen.getByRole('region', { name: 'Escolha da ordem' }));
    expect(classes(order.getByRole('button', { name: /primeiro/ }))).toEqual(expect.arrayContaining(['carimbo', 'carimbo-ouro']));
    expect(classes(order.getByRole('button', { name: /segundo/ }))).toEqual(expect.arrayContaining(['carimbo', 'carimbo-papel']));
  });
});

describe('carimbos: os pingos do toque', () => {
  const drops = () => document.querySelectorAll('[data-pingo]');

  it('soltar o toque num carimbo ligado solta os pingos, na cor da face, fora do fluxo e escondidos do leitor de tela', () => {
    mount();
    const attack = inBar().getByRole('button', { name: ATTACK_BUTTON });
    fireEvent.pointerUp(attack);
    expect(drops().length).toBe(7);
    for (const drop of drops()) {
      expect(drop).toHaveAttribute('aria-hidden', 'true');
      expect(drop.className).toContain('carimbo-pingo');
      expect((drop as HTMLElement).style.position).toBe('');
    }
    // Moram no invólucro da barra, não no botão: a jogada pode tirar o botão da tela.
    expect(attack.querySelector('[data-pingo]')).toBeNull();
  });

  it('o toque dentro do botão (no título) também vale; fora de um carimbo, nada', () => {
    mount();
    fireEvent.pointerUp(screen.getByText('Atacar'));
    expect(drops().length).toBe(7);
    document.querySelectorAll('[data-pingo]').forEach((drop) => drop.remove());
    fireEvent.pointerUp(screen.getByRole('region', { name: 'Ações' }));
    expect(drops().length).toBe(0);
  });

  it('carimbo desligado não solta pingos', () => {
    mount(EQUIP);
    fireEvent.pointerUp(inEquip().getByRole('button', { name: 'Desfazer' }));
    expect(drops().length).toBe(0);
  });

  it('com movimento reduzido, nenhum pingo', () => {
    mount(DRAFT, { reduceMotion: true });
    fireEvent.pointerUp(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(drops().length).toBe(0);
  });
});
