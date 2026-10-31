// A mesa desenhada a partir da `view` (spec §3.1, §3.2, §3.3, §7, §10): fileiras, totais, faixa central, mão,
// marcas de estado, histórico e a regra de não vazar a mão do oponente. As interações (Tarefa 20) e as fases
// (Tarefa 21) têm testes próprios.
import { attackPower, defensePower, quadValues, type GameEvent, type PlayerView } from '@coringa/engine';
import type { Deadline, RoomMessage, StateMessage } from '@coringa/protocol';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { appendNote } from '../../src/model/history.ts';
import { zoneKey } from '../../src/model/marks.ts';
import { Session, type SessionSnapshot } from '../../src/model/session.ts';
import { Card, cardName, QUAD_FACE } from '../../src/ui/cards/Card.tsx';
import { PC_QUERY } from '../../src/ui/table/History.tsx';
import { Table, type TableProps } from '../../src/ui/table/Table.tsx';
import { FakeConnection, scenarioAt, stateMessage, type ViewSpec } from '../fixtures.ts';
import { ATTACK_BUTTON, roomMessage, seriousViolations } from './support.tsx';

const seatOf = (playerId: 'p1' | 'p2', nickname: string) => ({
  playerId,
  nickname,
  connected: true,
  ready: true,
  wantsRematch: false,
});

/** O rascunho da Peleja (390 × 844): ATK 114 = 38 × 3, DEF 46 = 23 × 2; do outro lado, 56 = 28 × 2 e 42 = 14 × 3. */
const DRAFT: ViewSpec = {
  round: 7,
  self: {
    hp: 187,
    hand: ['K', 'A', 'Q'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    attackBuffs: ['J', 'WILD'],
    defenseBuffs: ['Q'],
    guard: ['K'],
  },
  opponent: {
    hp: 214,
    hand: ['A', 'K', 'WILD'],
    attackRow: [6, 9, 3, 10],
    defenseRow: [5, 7, 2],
    attackBuffs: ['J'],
    defenseBuffs: ['Q', 'Q'],
    guard: ['K'],
  },
  graveyard: [3, 5, 8],
};

/** Id da segunda carta da minha mão no rascunho. */
const DRAFT_HAND_ID = scenarioAt(DRAFT).view.self.hand[1]!.id;

interface MountOptions {
  room?: Partial<RoomMessage>;
  state?: Partial<Omit<StateMessage, 't' | 'view'>>;
  /** Troca campos do snapshot (marcas, `marksBaseSeq`…). */
  snapshot?: Partial<SessionSnapshot>;
  props?: Partial<TableProps>;
}

function mount(spec: ViewSpec = DRAFT, options: MountOptions = {}) {
  const { state: game, view } = scenarioAt(spec);
  const me = spec.me ?? 'p1';
  const room = roomMessage({
    status: 'PLAYING',
    seats: me === 'p1' ? [seatOf('p1', 'André'), seatOf('p2', 'Duda')] : [seatOf('p1', 'Duda'), seatOf('p2', 'André')],
    score: { p1: 1, p2: 0 },
    ...options.room,
  });
  const connection = new FakeConnection({ playerId: me, room, state: stateMessage(view, options.state), now: 0 });
  const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
  const snapshot: SessionSnapshot = { ...session.snapshot(), ...options.snapshot };
  const props: TableProps = {
    snapshot,
    remainingMs: (deadline: Deadline) => session.remainingMs(deadline),
    ...options.props,
  };
  const view$ = render(<Table {...props} />);
  return { game, view, session, connection, snapshot, props, ...view$ };
}

const group = (name: string) => screen.getByRole('group', { name });
const cardNames = (name: string) => within(group(name)).getAllByRole('img').map((el) => el.getAttribute('aria-label'));

describe('mesa: as quatro fileiras (spec §3.1)', () => {
  it('mostram as cartas na ordem, com a da frente marcada como "sai primeiro"', () => {
    mount();
    // O naipe da fixture gira pela posição na fileira: copas, ouros, espadas, paus.
    expect(cardNames('Sua fileira de ataque')).toEqual([
      '8 de copas, sai primeiro',
      '4 de ouros',
      '10 de espadas',
      '7 de paus',
      '9 de copas',
    ]);
    expect(cardNames('Sua fileira de defesa')).toEqual([
      '3 de copas, sai primeiro',
      '6 de ouros',
      '9 de espadas',
      '5 de paus',
    ]);
    expect(cardNames('Fileira de ataque de Duda')).toEqual([
      '6 de copas, sai primeiro',
      '9 de ouros',
      '3 de espadas',
      '10 de paus',
    ]);
    expect(cardNames('Fileira de defesa de Duda')).toEqual(['5 de copas, sai primeiro', '7 de ouros', '2 de espadas']);
  });

  it('desenham as vagas vazias até o limite da fileira', () => {
    const { container } = mount();
    const vagas = (name: string) => group(name).querySelectorAll('[data-vaga]').length;
    expect(vagas('Sua fileira de ataque')).toBe(2);
    expect(vagas('Sua fileira de defesa')).toBe(3);
    expect(vagas('Fileira de ataque de Duda')).toBe(3);
    expect(vagas('Fileira de defesa de Duda')).toBe(4);
    expect(container.querySelectorAll('[data-vaga][aria-hidden="true"]')).toHaveLength(12);
  });

  it('seguem o rowLimit da configuração', () => {
    mount({ ...DRAFT, config: { rowLimit: 5 }, self: { ...DRAFT.self, attackRow: [8, 4], defenseRow: [3] }, opponent: { hand: [] } });
    expect(group('Sua fileira de ataque').querySelectorAll('[data-vaga]')).toHaveLength(3);
    expect(group('Sua fileira de defesa').querySelectorAll('[data-vaga]')).toHaveLength(4);
  });

  it('uma fileira vazia mostra só vagas e total 0, sem conta', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, attackRow: [] } });
    const row = group('Sua fileira de ataque');
    expect(within(row).queryAllByRole('img')).toHaveLength(0);
    expect(row.querySelectorAll('[data-vaga]')).toHaveLength(7);
    expect(row.querySelector('[data-total]')).toHaveTextContent('0');
    expect(row.querySelector('[data-conta]')).toBeNull();
  });

  it('cada fileira mostra o total e a conta do motor (114 = 38 × 3 no rascunho)', () => {
    const { view } = mount();
    const total = (name: string) => group(name).querySelector('[data-total]')?.textContent;
    const conta = (name: string) => group(name).querySelector('[data-conta]')?.textContent;
    expect(total('Sua fileira de ataque')).toBe('114');
    expect(conta('Sua fileira de ataque')).toBe('38 × 3');
    expect(total('Sua fileira de defesa')).toBe('46');
    expect(conta('Sua fileira de defesa')).toBe('23 × 2');
    expect(total('Fileira de ataque de Duda')).toBe('56');
    expect(conta('Fileira de ataque de Duda')).toBe('28 × 2');
    expect(total('Fileira de defesa de Duda')).toBe('42');
    expect(conta('Fileira de defesa de Duda')).toBe('14 × 3');
    // Os números exibidos são os do motor.
    expect(Number(total('Sua fileira de ataque'))).toBe(attackPower(view.self));
    expect(Number(total('Sua fileira de defesa'))).toBe(defensePower(view.self));
    expect(Number(total('Fileira de ataque de Duda'))).toBe(attackPower(view.opponent));
    expect(Number(total('Fileira de defesa de Duda'))).toBe(defensePower(view.opponent));
  });

  it('a quadra destaca as quatro cartas e mostra "+V" no total', () => {
    const spec: ViewSpec = { ...DRAFT, self: { ...DRAFT.self, attackRow: [7, 2, 7, 7, 7, 3] } };
    const { view } = mount(spec);
    expect(quadValues(view.self.attackRow)).toEqual([7]);
    const row = group('Sua fileira de ataque');
    const quad = row.querySelectorAll('[data-quad="true"]');
    expect(quad).toHaveLength(4);
    expect([...quad].every((el) => el.getAttribute('aria-label')?.startsWith('7 de'))).toBe(true);
    expect([...quad].every((el) => el.getAttribute('aria-label')?.includes(', quadra'))).toBe(true);
    expect(row.querySelector('[data-quadra]')).toHaveTextContent('+7');
    // O total já inclui o bônus (o motor soma): 7×4 + 2 + 3 + 7 = 40, vezes o multiplicador.
    expect(row.querySelector('[data-total]')).toHaveTextContent(String(attackPower(view.self)));
  });

  it('sem quadra, nenhuma carta é destacada', () => {
    mount();
    expect(document.querySelectorAll('[data-quad="true"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-quadra]')).toHaveLength(0);
  });
});

describe('mesa: Guarda, buffs e mão (spec §3.1)', () => {
  it('Guarda e buffs aparecem em listas com rótulo; o Selvagem mostra o papel que assumiu', () => {
    mount();
    const mine = within(screen.getByRole('region', { name: 'Seu campo' }));
    expect(within(mine.getByRole('list', { name: 'Guarda' })).getAllByRole('img')).toHaveLength(1);
    const buffs = within(mine.getByRole('list', { name: 'Buffs de ataque' })).getAllByRole('img');
    expect(buffs.map((el) => el.getAttribute('aria-label'))).toEqual([expect.stringMatching(/^J de /), 'Coringa Selvagem como J']);
    expect(within(mine.getByRole('list', { name: 'Buffs de defesa' })).getAllByRole('img')).toHaveLength(1);
    const theirs = within(screen.getByRole('region', { name: 'Campo de Duda' }));
    expect(within(theirs.getByRole('list', { name: 'Buffs de defesa' })).getAllByRole('img')).toHaveLength(2);
  });

  it('a minha mão mostra o papel escrito em cada carta', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, hand: ['K', 'J', 'Q', 'A', 'WILD'] } });
    const hand = within(screen.getByRole('list', { name: 'Sua mão' }));
    const names = hand.getAllByRole('img').map((el) => el.getAttribute('aria-label') ?? '');
    expect(names.map((n) => n.split(', ')[1])).toEqual([
      'Guarda',
      'Buff de ataque',
      'Buff de defesa',
      'Armadilha',
      'Selvagem',
    ]);
    expect(names[0]).toMatch(/^K, Guarda, de .+$/);
    expect(names[4]).toBe('Coringa Selvagem, Selvagem');
  });

  it('rótulo no nome (axe, WCAG 2.5.3): o texto visível da carta da mão ("K Guarda") é trecho contínuo do nome ("K, Guarda, de copas")', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, hand: ['K', 'J', 'Q', 'A', 'WILD'] } }, { props: { onSelectCard: vi.fn() } });
    const buttons = within(screen.getByRole('list', { name: 'Sua mão' })).getAllByRole('button');
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['K Guarda', 'J Buff de ataque', 'Q Buff de defesa', 'A Armadilha', 'Selvagem']);
    expect(buttons[0]).toHaveAccessibleName(/^K, Guarda, de (copas|ouros|espadas|paus)$/);
    expect(buttons[3]).toHaveAccessibleName(/^A, Armadilha, de (copas|ouros|espadas|paus)$/);
    expect(buttons[4]).toHaveAccessibleName('Coringa Selvagem, Selvagem');
  });

  it('com onSelectCard, a mão vira botões; o escolhido fica "pressionado" e o clique devolve o id', async () => {
    const onSelectCard = vi.fn();
    const user = userEvent.setup();
    const { view } = mount(DRAFT, { props: { onSelectCard, selectedCardId: DRAFT_HAND_ID } });
    const hand = within(screen.getByRole('list', { name: 'Sua mão' }));
    const buttons = hand.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    const selected = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(selected).toHaveLength(1);
    await user.click(buttons[0]!);
    expect(onSelectCard).toHaveBeenCalledWith(view.self.hand[0]!.id);
  });

  it('a mão do oponente mostra só handCount versos, sem nome de carta', () => {
    const { container } = mount();
    const backs = screen.getByRole('img', { name: 'Mão de Duda: 3 cartas' });
    expect(backs.querySelectorAll('[data-verso]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-verso]')).toHaveLength(3);
    // Os versos não dizem nada sobre as cartas.
    expect(backs.textContent).toBe('');
    expect(backs.querySelectorAll('[aria-label],[data-card-id]')).toHaveLength(0);
  });

  it('a contagem da mão do oponente: uma carta, nenhuma', () => {
    const { unmount } = mount({ ...DRAFT, opponent: { ...DRAFT.opponent, hand: ['K'] } });
    expect(screen.getByRole('img', { name: 'Mão de Duda: 1 carta' })).toBeInTheDocument();
    unmount();
    mount({ ...DRAFT, opponent: { ...DRAFT.opponent, hand: [] } });
    expect(screen.getByRole('img', { name: 'Mão de Duda: sem cartas' })).toBeInTheDocument();
  });

  it('nenhum id de carta da mão do oponente aparece no DOM', () => {
    const { game, container, view } = mount({
      ...DRAFT,
      opponent: { ...DRAFT.opponent, hand: ['A', 'K', 'WILD'] },
    });
    expect(view.opponent.handCount).toBe(3);
    const hidden = game.players[1].hand.map((card) => card.id);
    expect(hidden).toHaveLength(3);
    for (const id of hidden) expect(container.innerHTML).not.toContain(id);
    // Os ids que o DOM expõe são todos de cartas públicas ou da minha mão.
    const visible = new Set(publicIds(view));
    const inDom = [...container.querySelectorAll('[data-card-id]')].map((el) => el.getAttribute('data-card-id'));
    expect(inDom.length).toBeGreaterThan(10);
    for (const id of inDom) expect(visible.has(id ?? '')).toBe(true);
  });
});

function publicIds(view: PlayerView): string[] {
  const ids: string[] = [];
  for (const side of [view.self, view.opponent]) {
    for (const zone of [side.attackRow, side.defenseRow, side.attackBuffs, side.defenseBuffs, side.guard]) {
      ids.push(...zone.map((card) => card.id));
    }
    if (side.reflect) ids.push(side.reflect.k.id, side.reflect.j.id, side.reflect.q.id);
  }
  ids.push(...view.self.hand.map((card) => card.id), ...view.graveyard.map((card) => card.id));
  return ids;
}

describe('mesa: marcas de estado no Coringa (spec §3.1)', () => {
  const region = (name: string) => within(screen.getByRole('region', { name }));

  it('Reflect ativo mostra o texto e as três cartas, que são públicas', () => {
    mount({ ...DRAFT, opponent: { ...DRAFT.opponent, reflect: true } });
    const theirs = region('Campo de Duda');
    expect(theirs.getByText('Reflect ativo')).toBeInTheDocument();
    const cards = within(theirs.getByRole('list', { name: 'Cartas do Reflect' })).getAllByRole('img');
    expect(cards.map((el) => el.getAttribute('aria-label')?.[0])).toEqual(['K', 'J', 'Q']);
    expect(region('Seu campo').queryByText('Reflect ativo')).not.toBeInTheDocument();
  });

  it('Defesa Absoluta', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, absoluteDefense: true } });
    expect(region('Seu campo').getByText('Defesa Absoluta')).toBeInTheDocument();
    expect(region('Campo de Duda').queryByText('Defesa Absoluta')).not.toBeInTheDocument();
  });

  it('Ressurreições disponíveis, com a contagem', () => {
    mount({
      ...DRAFT,
      self: { ...DRAFT.self, resurrections: [{ row: 'ATK', value: 7 }, { row: 'DEF', value: 5 }] },
      opponent: { ...DRAFT.opponent, resurrections: [{ row: 'ATK', value: 7 }] },
    });
    expect(region('Seu campo').getByText('2 Ressurreições disponíveis')).toBeInTheDocument();
    expect(region('Campo de Duda').getByText('1 Ressurreição disponível')).toBeInTheDocument();
  });

  it('Ataque Absoluto armado com os 4 J', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] } });
    expect(region('Seu campo').getByText('Ataque Absoluto armado')).toBeInTheDocument();
    expect(region('Campo de Duda').queryByText('Ataque Absoluto armado')).not.toBeInTheDocument();
  });

  it('Cura passiva com 2 K na Guarda; com 1 K, não', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, guard: ['K', 'K'] } });
    expect(region('Seu campo').getByText('Cura passiva')).toBeInTheDocument();
    expect(region('Campo de Duda').queryByText('Cura passiva')).not.toBeInTheDocument();
  });

  it('a Cura passiva também aparece no campo do oponente', () => {
    mount({ ...DRAFT, opponent: { ...DRAFT.opponent, guard: ['K', 'K', 'K'] } });
    expect(region('Campo de Duda').getByText('Cura passiva')).toBeInTheDocument();
    expect(region('Seu campo').queryByText('Cura passiva')).not.toBeInTheDocument();
  });

  it('sem nenhuma, o campo não tem lista de marcas de estado', () => {
    mount();
    expect(screen.queryByRole('list', { name: /Estado do Coringa/ })).not.toBeInTheDocument();
  });
});

describe('mesa: o Coringa de cada lado', () => {
  it('apelido, rótulo "você" e vida em número e barra', () => {
    mount();
    const mine = within(screen.getByRole('region', { name: 'Seu campo' }));
    expect(mine.getByRole('heading', { name: /André/ })).toHaveTextContent('André (você)');
    const bar = mine.getByRole('meter', { name: 'Vida de André' });
    expect(bar).toHaveAttribute('aria-valuenow', '187');
    expect(bar).toHaveAttribute('aria-valuemax', '300');
    expect(bar).toHaveAttribute('aria-valuetext', '187 de 300');
    expect(mine.getByText('187')).toBeInTheDocument();
    const theirs = within(screen.getByRole('region', { name: 'Campo de Duda' }));
    expect(theirs.getByRole('heading', { name: 'Duda' })).toBeInTheDocument();
    expect(theirs.getByRole('meter', { name: 'Vida de Duda' })).toHaveAttribute('aria-valuenow', '214');
  });

  it('oponente fora da sala: a presença aparece em texto', () => {
    mount(DRAFT, { room: { seats: [seatOf('p1', 'André'), { ...seatOf('p2', 'Duda'), connected: false }] } });
    expect(screen.getByText('fora da sala')).toBeInTheDocument();
  });

  it('sem a sala (ainda), os nomes são "Você" e "Oponente"', () => {
    mount(DRAFT, { snapshot: { room: null } });
    const theirs = within(screen.getByRole('region', { name: 'Campo de Oponente' }));
    expect(theirs.getByRole('heading', { name: 'Oponente' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Seu campo' })).getByRole('heading', { name: 'Você' })).toBeInTheDocument();
  });
});

describe('mesa: faixa central (spec §3.1)', () => {
  const band = () => within(screen.getByRole('region', { name: 'Situação da rodada' }));

  it('rodada e tipo, de quem é a vez, monte e cemitério', () => {
    mount();
    expect(band().getByRole('heading', { name: 'Rodada 7' })).toBeInTheDocument();
    expect(band().getByText('Ataque · sua vez')).toBeInTheDocument();
    const view = scenarioAt(DRAFT).view;
    expect(band().getByText(String(view.deckCount))).toBeInTheDocument();
    expect(band().getByText('Monte')).toBeInTheDocument();
    expect(band().getByText('Cemitério')).toBeInTheDocument();
    expect(band().getByText('3')).toBeInTheDocument();
  });

  it('a vez do oponente, a escolha da ordem, a reação e o fim têm texto próprio', () => {
    const cases: Array<[ViewSpec, string]> = [
      [{ ...DRAFT, phase: 'WAITING' }, 'Ataque · vez de Duda'],
      [{ ...DRAFT, phase: { kind: 'ORDER_CHOICE', player: 'p1' } }, 'Ataque · você escolhe a ordem'],
      [{ ...DRAFT, phase: { kind: 'ORDER_CHOICE', player: 'p2' } }, 'Ataque · Duda escolhe a ordem'],
      [{ ...DRAFT, phase: 'ATTACK' }, 'Ataque · sua reação'],
      [{ ...DRAFT, phase: { kind: 'REACTION', responder: 'p2', trigger: 'ATTACK' } }, 'Ataque · Duda pode reagir'],
      [{ ...DRAFT, phase: { kind: 'EQUIP' } }, 'Equipar · os dois montam'],
      [{ ...DRAFT, phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: 'p2', reason: 'EXODIA' } } }, 'Fim de jogo'],
    ];
    for (const [spec, text] of cases) {
      const { unmount } = mount(spec);
      expect(band().getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it('o cemitério mostra a carta de cima e a quantidade; com onOpenGraveyard vira botão', async () => {
    const onOpenGraveyard = vi.fn();
    const user = userEvent.setup();
    const { view } = mount(DRAFT, { props: { onOpenGraveyard } });
    const top = view.graveyard.at(-1)!;
    const button = band().getByRole('button', { name: `Cemitério 3, a de cima é ${cardName(top)}` });
    await user.click(button);
    expect(onOpenGraveyard).toHaveBeenCalledTimes(1);
  });

  it('rótulo no nome: o botão do cemitério só tem "Cemitério 3" visível, e a carta de cima fica fora dele, só como desenho', () => {
    const { view } = mount(DRAFT, { props: { onOpenGraveyard: vi.fn() } });
    const top = view.graveyard.at(-1)!;
    const button = band().getByRole('button', { name: `Cemitério 3, a de cima é ${cardName(top)}` });
    expect(button.textContent).toBe('Cemitério 3');
    // A carta é irmã do botão, na mesma caixa; o botão cobre a caixa inteira (alvo de toque e clique iguais aos de antes).
    const box = button.parentElement!;
    expect(box.querySelector(`[data-card-id="${top.id}"]`)).not.toBeNull();
    expect(button.querySelector('[data-card-id]')).toBeNull();
    expect(box.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(box.className).toContain('relative');
    expect(box.className).toContain('min-h-11');
    expect(button.className).toContain('after:absolute');
    expect(button.className).toContain('after:inset-0');
  });

  it('cemitério vazio: o texto visível é "Cemitério vazio", com espaço entre as palavras', () => {
    mount({ ...DRAFT, graveyard: [] }, { props: { onOpenGraveyard: vi.fn() } });
    expect(band().getByRole('button', { name: 'Cemitério vazio' }).textContent).toBe('Cemitério vazio');
  });

  it('sem onOpenGraveyard, é só informação (nenhum botão)', () => {
    mount();
    expect(band().queryByRole('button')).not.toBeInTheDocument();
    expect(band().getByText('Cemitério')).toBeInTheDocument();
  });

  it('cemitério vazio', () => {
    mount({ ...DRAFT, graveyard: [] });
    expect(band().getByText('vazio')).toBeInTheDocument();
  });

  it('sem contador de rodadas sem dano nem Pressão da mesa (as duas regras saíram no sub-projeto 5)', () => {
    mount(DRAFT);
    expect(band().queryByText(/Sem dano/i)).not.toBeInTheDocument();
    expect(band().queryByRole('group', { name: /Rodadas sem dano/ })).not.toBeInTheDocument();
    expect(band().queryByText(/anti-travamento|Pressão/)).not.toBeInTheDocument();
  });

  it('a iniciativa diz de quem é e a ordem escolhida na rodada', () => {
    mount();
    expect(band().getByText('Iniciativa')).toBeInTheDocument();
    expect(band().getByText('Você, atacando primeiro')).toBeInTheDocument();
  });

  it('a iniciativa do oponente, ou a ordem em que se ataca, muda o texto', () => {
    mount({ ...DRAFT, initiative: 'opponent', firstToAttack: 'opponent' });
    expect(band().getByText('Duda, atacando primeiro')).toBeInTheDocument();
  });

  it('quem tem a iniciativa pode atacar em segundo', () => {
    mount({ ...DRAFT, initiative: 'opponent', firstToAttack: 'self' });
    expect(band().getByText('Duda, atacando em segundo')).toBeInTheDocument();
  });

  it('antes da escolha da ordem, a iniciativa não promete uma ordem', () => {
    mount({ ...DRAFT, phase: { kind: 'ORDER_CHOICE', player: 'p1' } });
    expect(band().getByText('Você, escolhendo a ordem')).toBeInTheDocument();
  });

  it('no Equipar não há ordem ainda: só de quem é a iniciativa', () => {
    mount({ ...DRAFT, phase: { kind: 'EQUIP' } });
    expect(band().getByText('Você')).toBeInTheDocument();
  });

  // O placar da iniciativa (autor, 2026-10-31: "não tá claro pro jogador").
  it('na rodada de Ataque, a faixa mostra o dano de cada um na rodada, nos números de texto', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, damageThisRound: 12 }, opponent: { ...DRAFT.opponent, damageThisRound: 8 } });
    const score = band().getByText('Dano na rodada: você 12 · Duda 8');
    expect(score.className).toContain('tabular-nums');
  });

  it('fora do Ataque, a faixa diz por que a iniciativa está com quem está: sorteada, mais dano ou empate', () => {
    const equip = { ...DRAFT, phase: { kind: 'EQUIP' } } satisfies ViewSpec;
    const first = mount(equip);
    expect(band().getByText('sorteada no início')).toBeInTheDocument();
    first.unmount();
    const lead = mount({ ...equip, lastInitiative: { holder: 'self', changed: true, self: 14, opponent: 9 } });
    expect(band().getByText('mais dano na última rodada (14 × 9)')).toBeInTheDocument();
    lead.unmount();
    mount({ ...equip, initiative: 'opponent', lastInitiative: { holder: 'opponent', changed: false, self: 5, opponent: 5 } });
    expect(band().getByText('empate na última rodada (5 × 5)')).toBeInTheDocument();
  });

  it('na escolha da ordem, a faixa diz o motivo, não o placar zerado da rodada nova', () => {
    mount({ ...DRAFT, phase: { kind: 'ORDER_CHOICE', player: 'p1' }, lastInitiative: { holder: 'self', changed: false, self: 20, opponent: 3 } });
    expect(band().getByText('mais dano na última rodada (20 × 3)')).toBeInTheDocument();
    expect(band().queryByText(/Dano na rodada/)).not.toBeInTheDocument();
  });

  it('o relógio mostra os segundos que faltam pelo relógio do servidor', () => {
    mount(DRAFT, { state: { deadline: { kind: 'TURN', at: 21_000, players: ['p1'] } } });
    const clock = band().getByRole('timer');
    expect(clock).toHaveTextContent('21');
    expect(clock).not.toHaveAttribute('aria-live', 'assertive');
  });

  it('sem prazo (treino, ou entre fases), não há relógio', () => {
    mount();
    expect(band().queryByRole('timer')).not.toBeInTheDocument();
  });
});

describe('mesa: o "novo" (spec §10.5)', () => {
  it('uma carta marcada leva ", novo" no nome acessível e o sinal vermelho', () => {
    const { view } = scenarioAt(DRAFT);
    const id = view.opponent.attackRow[1]!.id;
    mount(DRAFT, { snapshot: { marks: { cards: new Set([id]), zones: new Set() } } });
    const marked = screen.getByRole('img', { name: '9 de ouros, novo' });
    expect(marked).toHaveAttribute('data-novo', 'true');
    expect(marked.querySelector('[data-marca-novo]')).not.toBeNull();
    expect(screen.queryByRole('img', { name: '9 de ouros' })).not.toBeInTheDocument();
  });

  it('a frente marcada junta as duas dicas', () => {
    const { view } = scenarioAt(DRAFT);
    mount(DRAFT, { snapshot: { marks: { cards: new Set([view.opponent.attackRow[0]!.id]), zones: new Set() } } });
    expect(screen.getByRole('img', { name: '6 de copas, sai primeiro, novo' })).toBeInTheDocument();
  });

  it('passar o mouse numa carta marcada avisa a sessão (onSeen) com o id', async () => {
    const onSeen = vi.fn();
    const user = userEvent.setup();
    const { view } = scenarioAt(DRAFT);
    const id = view.opponent.attackRow[1]!.id;
    mount(DRAFT, { snapshot: { marks: { cards: new Set([id]), zones: new Set() } }, props: { onSeen } });
    await user.hover(screen.getByRole('img', { name: '9 de ouros, novo' }));
    expect(onSeen).toHaveBeenCalledWith(id);
  });

  it('uma carta sem marca não avisa nada', async () => {
    const onSeen = vi.fn();
    const user = userEvent.setup();
    mount(DRAFT, { props: { onSeen } });
    await user.hover(screen.getByRole('img', { name: '9 de ouros' }));
    expect(onSeen).not.toHaveBeenCalled();
  });

  it('a vida marcada leva ", novo" e se apaga ao passar o mouse', async () => {
    const onSeen = vi.fn();
    const user = userEvent.setup();
    mount(DRAFT, {
      snapshot: { marks: { cards: new Set(), zones: new Set(['opponentHp', 'selfHp'] as const) } },
      props: { onSeen },
    });
    const hp = screen.getByRole('meter', { name: 'Vida de Duda, novo' });
    expect(screen.getByRole('meter', { name: 'Vida de André, novo' })).toBeInTheDocument();
    await user.hover(hp);
    expect(onSeen).toHaveBeenCalledWith(zoneKey('opponentHp'));
  });
});

describe('mesa: alvos e seleção (para a Tarefa 20)', () => {
  it('os alvos ganham ", alvo possível" e viram botões que devolvem o id', async () => {
    const onSelectTarget = vi.fn();
    const user = userEvent.setup();
    const { view } = scenarioAt(DRAFT);
    const guardId = view.opponent.guard[0]!.id;
    mount(DRAFT, { props: { targetIds: new Set([guardId]), onSelectTarget } });
    const target = screen.getByRole('button', { name: /^K de .+, alvo possível$/ });
    expect(target).toHaveAttribute('data-card-id', guardId);
    await user.click(target);
    expect(onSelectTarget).toHaveBeenCalledWith(guardId);
  });

  it('sem onSelectTarget, o alvo continua destacado mas não é botão', () => {
    const { view } = scenarioAt(DRAFT);
    mount(DRAFT, { props: { targetIds: new Set([view.opponent.guard[0]!.id]) } });
    expect(screen.queryByRole('button', { name: /alvo possível/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^K de .+, alvo possível$/ })).toHaveAttribute('data-alvo', 'true');
  });
});

describe('mesa: histórico (spec §3.1, §7, §10.5)', () => {
  const view = scenarioAt(DRAFT).view;
  const attack: GameEvent = { type: 'AttackDeclared', player: 'p1' };
  const guard: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [view.opponent.guard[0]!] };

  function withHistory(base: number | null) {
    const mounted = mount(DRAFT, { state: { seq: 2, events: [attack] } });
    act(() => mounted.connection.emitState(stateMessage(view, { seq: 3, events: [guard] })));
    mounted.unmount();
    return mount(DRAFT, { snapshot: { ...mounted.session.snapshot(), marksBaseSeq: base } });
  }

  const panel = () => screen.getByRole('complementary', { name: 'Histórico da partida' });

  it('é uma região aria-live="polite" com as linhas do histórico', () => {
    withHistory(null);
    const list = within(panel()).getByRole('list');
    expect(list).toHaveAttribute('aria-live', 'polite');
    const items = within(list).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([`Rodada ${view.round}: Ataque`, 'Você declarou o ataque', 'Duda pôs 1 K na Guarda']);
  });

  it('mostra a sala e o placar', () => {
    withHistory(null);
    expect(within(panel()).getByText('ABC234')).toBeInTheDocument();
    expect(within(panel()).getByText('André 1 × 0 Duda')).toBeInTheDocument();
  });

  it('as linhas depois da base das marcas levam "novo"; as antigas não', () => {
    withHistory(2);
    const items = within(panel()).getAllByRole('listitem');
    expect(within(items[2]!).getByText('novo')).toBeInTheDocument();
    expect(within(items[1]!).queryByText('novo')).not.toBeInTheDocument();
    expect(within(items[0]!).queryByText('novo')).not.toBeInTheDocument();
  });

  it('o botão da gaveta conta o que é novo e abre e fecha a lista', async () => {
    const user = userEvent.setup();
    withHistory(1);
    const toggle = screen.getByRole('button', { name: 'Histórico, 3 novos' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', panel().id);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Fechar o histórico' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('abrir a gaveta conta como ver as linhas (spec §10.5): o contador zera, e só a linha que chega depois acende de novo', async () => {
    const user = userEvent.setup();
    const mounted = withHistory(1);
    await user.click(screen.getByRole('button', { name: 'Histórico, 3 novos' }));
    await user.click(screen.getByRole('button', { name: 'Fechar o histórico' }));
    expect(screen.getByRole('button', { name: 'Histórico' })).toBeInTheDocument();
    // Dentro da lista, as marcas "novo" seguem a regra das marcas: apagam na próxima jogada voluntária.
    expect(within(panel()).getAllByText('novo')).toHaveLength(3);
    // Uma linha nova depois de ver: o contador volta a 1.
    const { history } = mounted.props.snapshot;
    const line = { seq: 4, kind: 'event' as const, text: 'Duda declarou o ataque' };
    mounted.rerender(<Table {...mounted.props} snapshot={{ ...mounted.props.snapshot, history: { ...history, lines: [...history.lines, line] } }} />);
    expect(screen.getByRole('button', { name: 'Histórico, 1 novo' })).toBeInTheDocument();
  });

  it('uma nota que chega sem state novo (com o seq da última linha) também acende o contador depois de ver', async () => {
    const user = userEvent.setup();
    const mounted = withHistory(1);
    await user.click(screen.getByRole('button', { name: 'Histórico, 3 novos' }));
    await user.click(screen.getByRole('button', { name: 'Fechar o histórico' }));
    const { history } = mounted.props.snapshot;
    const note = appendNote(history, 'Duda voltou');
    expect(note.lines.at(-1)!.seq).toBe(history.lines.at(-1)!.seq);
    mounted.rerender(<Table {...mounted.props} snapshot={{ ...mounted.props.snapshot, history: note }} />);
    expect(screen.getByRole('button', { name: 'Histórico, 1 novo' })).toBeInTheDocument();
  });

  it('Esc fecha a gaveta e devolve o foco ao botão', async () => {
    const user = userEvent.setup();
    withHistory(null);
    const toggle = screen.getByRole('button', { name: 'Histórico' });
    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  it('o texto da linha e o "novo" ficam separados por um espaço (leitor de tela)', () => {
    withHistory(2);
    const items = within(panel()).getAllByRole('listitem');
    expect(items[2]!.textContent).toBe('Duda pôs 1 K na Guarda novo');
  });

  it('fechada, a gaveta sai da vista mas continua na árvore (a região ao vivo anuncia); aberta, vira uma folha', async () => {
    const user = userEvent.setup();
    withHistory(null);
    expect(panel().className).toContain('max-pc:sr-only');
    expect(panel().className).not.toContain('max-pc:fixed');
    expect(within(panel()).getByRole('list')).toHaveAttribute('aria-live', 'polite');
    expect(within(panel()).getByRole('button', { name: 'Fechar o histórico', hidden: true })).toHaveAttribute('tabindex', '-1');
    await user.click(screen.getByRole('button', { name: 'Histórico' }));
    expect(panel().className).toContain('max-pc:fixed');
    expect(panel().className).not.toContain('max-pc:sr-only');
    expect(within(panel()).getByRole('button', { name: 'Fechar o histórico' })).toHaveFocus();
  });

  describe('lista rolável focável (axe: scrollable-region-focusable)', () => {
    const lines = () => within(panel()).getByRole('region', { name: 'Linhas do histórico', hidden: true });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('gaveta fechada (celular e tablet): sem rolagem e fora do Tab, para não sobrar parada invisível; aberta: focável', async () => {
      const user = userEvent.setup();
      withHistory(null);
      expect(lines()).not.toHaveAttribute('tabindex');
      expect(lines().className).toContain('max-pc:overflow-hidden');
      await user.click(screen.getByRole('button', { name: 'Histórico' }));
      expect(lines()).toHaveAttribute('tabindex', '0');
      expect(lines().className).toContain('overflow-y-auto');
      expect(lines().className).not.toContain('max-pc:overflow-hidden');
    });

    it('a media query do PC é o ponto `pc` do tema (styles.css), sem número solto', () => {
      const css = readFileSync(resolve(import.meta.dirname, '../../src/styles.css'), 'utf8');
      const px = /--breakpoint-pc:\s*(\d+)px/.exec(css)?.[1];
      expect(px).toBeDefined();
      expect(PC_QUERY).toBe(`(min-width: ${px}px)`);
    });

    it('no PC a coluna está sempre à vista: a lista é focável mesmo com a gaveta "fechada"', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(min-width: 1024px)',
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      withHistory(null);
      expect(lines()).toHaveAttribute('tabindex', '0');
    });
  });

  describe('rolagem da lista', () => {
    /** A lista de rolagem com medidas de mentira (o jsdom não faz layout): 1000 de altura, 200 visíveis. */
    function scroller(top: number) {
      const mounted = mount(DRAFT, { state: { seq: 2, events: [attack] } });
      const list = within(panel()).getByRole('list').parentElement!;
      let scrollTop = top;
      Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 1000 });
      Object.defineProperty(list, 'clientHeight', { configurable: true, value: 200 });
      Object.defineProperty(list, 'scrollTop', {
        configurable: true,
        get: () => scrollTop,
        set: (value: number) => {
          scrollTop = value;
        },
      });
      const addLine = () => {
        act(() => mounted.connection.emitState(stateMessage(view, { seq: 5, events: [guard] })));
        mounted.rerender(<Table {...mounted.props} snapshot={mounted.session.snapshot()} />);
      };
      return { list, addLine, top: () => scrollTop };
    }

    it('no fim da lista, a linha nova a puxa para baixo', () => {
      const { list, addLine, top } = scroller(800);
      fireEvent.scroll(list);
      addLine();
      expect(top()).toBe(1000);
    });

    it('quem subiu para ler o que ficou para cima não é interrompido', () => {
      const { list, addLine, top } = scroller(100);
      fireEvent.scroll(list);
      addLine();
      expect(top()).toBe(100);
    });

    it('perto do fim (até 24 px) ainda conta como no fim', () => {
      const { list, addLine, top } = scroller(780);
      fireEvent.scroll(list);
      addLine();
      expect(top()).toBe(1000);
    });

    it('voltar ao fim com a rolagem religa o acompanhamento', () => {
      const { list, addLine, top } = scroller(100);
      fireEvent.scroll(list);
      list.scrollTop = 800;
      fireEvent.scroll(list);
      addLine();
      expect(top()).toBe(1000);
    });
  });

  it('um novo só: singular', () => {
    withHistory(2);
    expect(screen.getByRole('button', { name: 'Histórico, 1 novo' })).toBeInTheDocument();
  });
});

describe('mesa: números de jogo sem textura (spec §10.7)', () => {
  const textured = (el: Element) => el.closest('.textura') !== null || (el as HTMLElement).style.filter !== '';

  it('vida, totais, conta, relógio, rodadas sem dano, monte, cemitério e placar ficam fora da textura', () => {
    const { container } = mount(DRAFT, { state: { deadline: { kind: 'TURN', at: 21_000, players: ['p1'] } } });
    const numbers: Element[] = [
      ...container.querySelectorAll('[data-total]'),
      ...container.querySelectorAll('[data-conta]'),
      ...container.querySelectorAll('[data-hp]'),
      ...container.querySelectorAll('[data-numero]'),
      screen.getByRole('timer'),
      screen.getByText('André 1 × 0 Duda'),
    ];
    expect(numbers.length).toBeGreaterThan(12);
    for (const el of numbers) expect(textured(el), el.outerHTML).toBe(false);
    for (const el of numbers) expect(el.className).toMatch(/tabular-nums|font-texto/);
  });

  it('a textura existe nos títulos (e só neles)', () => {
    const { container } = mount();
    const titles = [...container.querySelectorAll('.textura')];
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) {
      expect(title.textContent).toMatch(/^(Rodada \d+|Histórico)$/);
    }
    expect(container.querySelector('main')?.classList.contains('textura')).toBe(false);
  });

  it('o grão do papel fica por baixo do conteúdo, nunca por cima', () => {
    const { container } = mount();
    const grain = container.querySelectorAll('[data-grao]');
    expect(grain.length).toBeGreaterThan(0);
    for (const layer of grain) {
      expect(layer).toHaveAttribute('aria-hidden', 'true');
      expect(layer.className).toContain('-z-10');
      expect(layer.className).toContain('pointer-events-none');
    }
  });
});

describe('mesa: página (spec §3.2)', () => {
  it('ocupa 100dvh, respeita as margens seguras e não deixa o puxar-para-atualizar recarregar', () => {
    const { container } = mount();
    const main = container.querySelector('main')!;
    expect(main.className).toContain('h-dvh');
    expect(main.className).toContain('overscroll-none');
    expect(main.className).toContain('env(safe-area-inset-top)');
    expect(main.className).toContain('env(safe-area-inset-left)');
    expect(main.className).toContain('env(safe-area-inset-right)');
    expect(document.documentElement).toHaveClass('mesa-ativa');
  });

  it('devolve o overscroll da página ao sair da mesa', () => {
    const { unmount } = mount();
    unmount();
    expect(document.documentElement).not.toHaveClass('mesa-ativa');
  });

  it('a fileira não corta o anel de foco (sem overflow hidden) e as cartas focáveis sobem de camada', () => {
    const { container } = mount(DRAFT, { props: { onSelectCard: () => undefined } });
    for (const row of container.querySelectorAll('[role="group"]')) {
      expect(row.className).not.toContain('overflow-hidden');
      for (const ancestor of [row.parentElement, row.querySelector('ul')]) {
        expect(ancestor?.className ?? '').not.toContain('overflow-hidden');
      }
    }
    const button = screen.getAllByRole('button').find((b) => b.hasAttribute('data-card-id'))!;
    expect(button.className).toContain('focus-visible:z-10');
  });

  it('a barra de ação entra abaixo da mão', () => {
    mount(DRAFT, { props: { actionBar: <button type="button">Atacar</button> } });
    const hand = screen.getByRole('list', { name: 'Sua mão' });
    const bar = screen.getByRole('button', { name: ATTACK_BUTTON });
    expect(hand.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sem state, não desenha nada', () => {
    const { container } = mount(DRAFT, { snapshot: { state: null } });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Card', () => {
  const k = { id: 'k1', kind: 'K', suit: 'paus' } as const;
  const wild = { id: 'w1', kind: 'WILD' } as const;
  const seven = { id: 'n7', kind: 'NUM', value: 7, suit: 'copas' } as const;

  it('o nome acessível: valor e naipe, mais as dicas', () => {
    expect(cardName(seven)).toBe('7 de copas');
    expect(cardName(k)).toBe('K de paus');
    expect(cardName(wild)).toBe('Coringa Selvagem');
    expect(cardName(wild, 'Q')).toBe('Coringa Selvagem como Q');
    render(<Card card={seven} size="field" front marked />);
    expect(screen.getByRole('img', { name: '7 de copas, sai primeiro, novo' })).toBeInTheDocument();
  });

  it('naipes vermelhos e pretos têm formas próprias (nunca só a cor)', () => {
    const shapes = (['copas', 'ouros', 'espadas', 'paus'] as const).map((suit) => {
      const { container, unmount } = render(<Card card={{ id: suit, kind: 'K', suit }} size="mini" />);
      const d = container.querySelector('svg path')?.getAttribute('d');
      unmount();
      return d;
    });
    expect(new Set(shapes).size).toBe(4);
  });

  it('o texto das cartas de naipe vermelho usa o vermelho; as pretas, a tinta', () => {
    const { container, rerender } = render(<Card card={seven} size="field" />);
    expect(container.querySelector('[data-valor]')?.className).toContain('text-vermelho');
    rerender(<Card card={{ ...seven, suit: 'paus' }} size="field" />);
    expect(container.querySelector('[data-valor]')?.className).toContain('text-tinta');
  });

  it('com onSelect é um botão com aria-pressed; sem, é uma imagem', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Card card={k} size="hand" onSelect={onSelect} selected />);
    const button = screen.getByRole('button', { name: 'K de paus' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    rerender(<Card card={k} size="hand" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'K de paus' })).toBeInTheDocument();
  });

  it('o title diz o papel e o efeito, e o hint de quem chama o substitui', () => {
    const { rerender } = render(<Card card={k} size="mini" />);
    expect(screen.getByRole('img')).toHaveAttribute('title', expect.stringMatching(/Guarda.*absorve/));
    rerender(<Card card={k} size="mini" hint="dica própria" />);
    expect(screen.getByRole('img')).toHaveAttribute('title', 'dica própria');
    rerender(<Card card={wild} size="mini" />);
    expect(screen.getByRole('img')).toHaveAttribute('title', expect.stringMatching(/J, Q ou A/));
  });

  it('nenhum utilitário de box-shadow na carta: o halo de foco e o anel ouro são os donos dele', () => {
    // Um `shadow-*` (camada de utilitários) apagaria o halo global de `:focus-visible` (camada base) e disputaria o anel.
    for (const size of ['field', 'mini', 'hand'] as const) {
      for (const props of [{}, { selected: true }, { target: true }, { quad: true }, { onSelect: () => undefined }]) {
        const { container, unmount } = render(<Card card={k} size={size} {...props} />);
        const tokens = (container.firstElementChild?.className ?? '').split(/\s+/);
        expect(tokens.length).toBeGreaterThan(5); // o teste só vale se de fato leu as classes
        expect(tokens.filter((token) => /(^|:)shadow-/.test(token))).toEqual([]);
        unmount();
      }
    }
  });

  it('um fundo só por carta: duas classes bg-* disputam a propriedade e a ordem do CSS gerado decide', () => {
    // Na versão com `bg-papel` fixo mais `bg-ouro`, o CSS do Tailwind põe `.bg-papel` depois e o papel vence:
    // a quadra e o Selvagem perdiam o ouro.
    const cases = [
      { name: 'comum', card: k, props: {}, bg: 'bg-papel' },
      { name: 'Selvagem', card: wild, props: {}, bg: 'bg-ouro' },
      { name: 'quadra', card: seven, props: { quad: true }, bg: QUAD_FACE },
      { name: 'Selvagem em quadra', card: wild, props: { quad: true }, bg: 'bg-ouro' },
      { name: 'selecionada', card: k, props: { selected: true, onSelect: () => undefined }, bg: 'bg-papel' },
      { name: 'alvo', card: k, props: { target: true }, bg: 'bg-papel' },
    ];
    for (const { name, card, props, bg } of cases) {
      for (const size of ['field', 'mini', 'hand'] as const) {
        const { container, unmount } = render(<Card card={card} size={size} {...props} />);
        const tokens = (container.firstElementChild?.className ?? '').split(/\s+/);
        expect(tokens.filter((token) => /^bg-/.test(token)), `${name} (${size})`).toEqual([bg]);
        unmount();
      }
    }
  });

  it('no cemitério perde a cor', () => {
    render(<Card card={k} size="mini" grave />);
    expect(screen.getByRole('img').className).toContain('grayscale');
  });
});

describe('mesa: acessibilidade (axe)', () => {
  it('a mesa cheia, com buffs, Reflect, Defesa Absoluta e marcas, não tem violações sérias', async () => {
    const spec: ViewSpec = {
      ...DRAFT,
      self: {
        ...DRAFT.self,
        attackRow: [7, 7, 7, 7, 3],
        attackBuffs: ['J', 'J', 'J', 'J'],
        absoluteDefense: true,
        resurrections: [{ row: 'ATK', value: 7 }],
      },
      opponent: { ...DRAFT.opponent, reflect: true },
    };
    const { view } = scenarioAt(spec);
    const { container } = mount(spec, {
      state: { deadline: { kind: 'TURN', at: 21_000, players: ['p1'] } },
      snapshot: {
        marks: { cards: new Set([view.opponent.attackRow[0]!.id]), zones: new Set(['opponentHp'] as const) },
        marksBaseSeq: 0,
      },
      props: { onSelectCard: () => undefined, onOpenGraveyard: () => undefined, actionBar: <button type="button">Atacar</button> },
    });
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('com a gaveta aberta e a mesa vazia também não', async () => {
    const user = userEvent.setup();
    const { container } = mount({ ...DRAFT, self: { hand: [] }, opponent: { hand: [] }, graveyard: [] });
    await user.click(screen.getByRole('button', { name: 'Histórico' }));
    expect(await seriousViolations(container)).toEqual([]);
  });
});
