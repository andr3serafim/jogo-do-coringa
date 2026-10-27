// A barra de ação e a escolha na mesa (spec §3.4, §7, §1.5): tocar a carta → jogadas → alvo, as prévias, os botões
// próprios, o cemitério em `<dialog>`, o teclado e o foco. A mesa é a `PlayTable` sobre uma `Session` de verdade com
// uma `FakeConnection`; toda jogada enviada também é conferida contra o motor (`applyAction`).
import { applyAction, previewAttack, type PlayerView, type SpecialCard } from '@coringa/engine';
import type { PlayerAction, StateMessage } from '@coringa/protocol';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attackPreviewText, cardText, resurrectRowDetail, threatPreviewText } from '../../src/model/copy.ts';
import { livesOf, viewWithout } from '../../src/model/preview.ts';
import { Session } from '../../src/model/session.ts';
import { PC_QUERY } from '../../src/ui/table/History.tsx';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import type { TableHint } from '../../src/ui/table/Table.tsx';
import { deferredAck, FakeConnection, scenarioAt, stateMessage, type SideSpec, type ViewSpec } from '../fixtures.ts';
import { ATTACK_BUTTON, END_TURN_BUTTON, roomMessage, seriousViolations, startsWith } from './support.tsx';

const seatOf = (playerId: 'p1' | 'p2', nickname: string) => ({
  playerId,
  nickname,
  connected: true,
  ready: true,
  wantsRematch: false,
});

/** O rascunho da Peleja: ATK 152 = 38 × 4 contra DEF 42 com um K na Guarda de Duda; do outro lado, 84 contra a minha DEF 46. */
const DRAFT: ViewSpec = {
  round: 7,
  self: {
    hp: 187,
    hand: ['K', 'A', 'Q'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    // Um J a mais de cada lado mantém as contas sem a Pressão da mesa (saiu no sub-projeto 5): 38 × 4 e 28 × 3.
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
    guard: ['K'],
  },
  graveyard: [3, 5, 8],
};

/** Troca a mão do rascunho. */
const withHand = (hand: SideSpec['hand'], extra: Partial<ViewSpec> = {}): ViewSpec => ({
  ...DRAFT,
  ...extra,
  self: { ...DRAFT.self, ...extra.self, hand },
});

interface MountOptions {
  state?: Partial<Omit<StateMessage, 't' | 'view'>>;
  /** Fora da mesa, antes dela na árvore (um campo de texto, por exemplo). */
  before?: ReactNode;
  /** A dica do tutorial. */
  hint?: TableHint;
}

function mount(spec: ViewSpec = DRAFT, options: MountOptions = {}) {
  const { state: game, view } = scenarioAt(spec);
  const me = spec.me ?? 'p1';
  const room = roomMessage({
    status: 'PLAYING',
    seats: me === 'p1' ? [seatOf('p1', 'André'), seatOf('p2', 'Duda')] : [seatOf('p1', 'Duda'), seatOf('p2', 'André')],
    score: { p1: 0, p2: 0, draws: 0 },
  });
  const connection = new FakeConnection({ playerId: me, room, state: stateMessage(view, options.state), now: 0 });
  const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
  const user = userEvent.setup();
  const rendered = render(
    <>
      {options.before}
      <PlayTable session={session} hint={options.hint} />
    </>,
  );
  return { game, view, me, connection, session, user, ...rendered };
}

type Mounted = ReturnType<typeof mount>;

const bar = () => screen.getByRole('region', { name: 'Ações' });
const inBar = () => within(bar());
const handList = () => within(screen.getByRole('list', { name: 'Sua mão' }));

// O nome da carta da mão segue a ordem do texto visível: "Q, Buff de defesa, de ouros" (axe: rótulo no nome).
const HAND_NAME = {
  K: /^K, Guarda, de /,
  J: /^J, Buff de ataque, de /,
  Q: /^Q, Buff de defesa, de /,
  A: /^A, Armadilha, de /,
  WILD: /^Coringa Selvagem/,
} as const;
/** O botão da carta da mão: a `index`-ésima de `kind`. */
const handCard = (kind: keyof typeof HAND_NAME, index = 0) => handList().getAllByRole('button', { name: HAND_NAME[kind] })[index]!;

const acts = (m: Mounted) => m.connection.sent.flatMap((s) => (s.type === 'act' ? [s.action] : []));

/** A jogada enviada, que também precisa ser aceita pelo motor (spec §1.5, passo 2). */
function sentAction(m: Mounted): PlayerAction {
  const sent = acts(m);
  expect(sent).toHaveLength(1);
  const action = sent[0]!;
  expect(applyAction(m.game, m.me, action).ok).toBe(true);
  return action;
}

const handCards = (view: PlayerView, kind: SpecialCard['kind']) => view.self.hand.filter((c) => c.kind === kind);

/** O texto do alvo na lista: "K♣ da Guarda de Duda". */
const guardTarget = (view: PlayerView) => `${cardText(view.opponent.guard[0]!)} da Guarda de Duda`;

describe('barra de ação: tocar uma carta lista as jogadas (spec §3.4)', () => {
  it('as jogadas de cada carta saem da lista legal, e a carta tocada fica pressionada', async () => {
    const m = mount();
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
    await m.user.click(handCard('A'));
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().getAllByRole('button').map((b) => b.textContent)).toContain('Armadilha');
    expect(inBar().getByRole('list', { name: 'Jogadas' }).querySelectorAll('button')).toHaveLength(1);

    await m.user.click(handCard('K'));
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().getByRole('button', { name: 'Pôr na Guarda' })).toBeInTheDocument();
    expect(inBar().queryByRole('button', { name: 'Armadilha' })).not.toBeInTheDocument();

    await m.user.click(handCard('Q'));
    const plays = within(inBar().getByRole('list', { name: 'Jogadas' })).getAllByRole('button');
    expect(plays.map((b) => b.textContent)).toEqual(['Buff de defesa', 'Sacrifício']);
    expect(acts(m)).toEqual([]);
  });

  it('a barra diz o que fazer com a carta escolhida', async () => {
    const m = mount();
    expect(inBar().getByText(/Toque numa carta da mão/)).toBeInTheDocument();
    const a = handCards(m.view, 'A')[0]!;
    await m.user.click(handCard('A'));
    expect(inBar().getByText(`${cardText(a)}: escolha a jogada`)).toBeInTheDocument();
  });

  it('tocar de novo a carta escolhida desfaz a escolha', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(handCard('A'));
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
    expect(inBar().queryByRole('list', { name: 'Jogadas' })).not.toBeInTheDocument();
  });

  it('uma carta sem jogada possível diz por quê (B2), e o resto da barra continua', async () => {
    const m = mount(withHand(['J'], { self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { ...DRAFT.opponent, attackBuffs: [] } }));
    await m.user.click(handCard('J'));
    expect(inBar().getByText(/: seus Buffs de ataque já têm 4 J, o limite$/)).toBeInTheDocument();
    expect(inBar().queryByRole('list', { name: 'Jogadas' })).not.toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('J: Buff de ataque e Sacrifício; o Sacrifício pede o alvo e abate o J de Duda', async () => {
    const m = mount(withHand(['J']));
    await m.user.click(handCard('J'));
    await m.user.click(inBar().getByRole('button', { name: 'Sacrifício' }));
    const jTarget = m.view.opponent.attackBuffs[0]!;
    await m.user.click(inBar().getByRole('button', { name: startsWith(`${cardText(jTarget)} dos Buffs de Ataque de Duda`) }));
    expect(sentAction(m)).toEqual({ type: 'SACRIFICE', cardId: handCards(m.view, 'J')[0]!.id, targetId: jTarget.id });
  });

  it('J → "Buff de ataque" manda PLAY_J, sem pedir alvo', async () => {
    const m = mount(withHand(['J']));
    await m.user.click(handCard('J'));
    await m.user.click(inBar().getByRole('button', { name: 'Buff de ataque' }));
    expect(sentAction(m)).toEqual({ type: 'PLAY_J', cardId: handCards(m.view, 'J')[0]!.id });
  });

  it('Selvagem → "como J: Buff de ataque" manda PLAY_J com o id do Selvagem', async () => {
    const m = mount(withHand(['K', 'WILD']));
    await m.user.click(handCard('WILD'));
    const plays = within(inBar().getByRole('list', { name: 'Jogadas' })).getAllByRole('button');
    expect(plays.map((b) => b.textContent)).toEqual(
      expect.arrayContaining(['como J: Buff de ataque', 'como Q: Buff de defesa', 'como A: Armadilha']),
    );
    await m.user.click(inBar().getByRole('button', { name: 'como J: Buff de ataque' }));
    expect(sentAction(m)).toEqual({ type: 'PLAY_J', cardId: handCards(m.view, 'WILD')[0]!.id });
  });

  it('um K só: "Pôr na Guarda" manda PLAY_K', async () => {
    const m = mount();
    await m.user.click(handCard('K'));
    await m.user.click(inBar().getByRole('button', { name: 'Pôr na Guarda' }));
    expect(sentAction(m)).toEqual({ type: 'PLAY_K', cardIds: [handCards(m.view, 'K')[0]!.id] });
  });

  it('dois K: "Pôr 2 K" manda PLAY_K com os dois, o tocado primeiro', async () => {
    const m = mount(withHand(['K', 'K', 'Q']));
    const [first, second] = handCards(m.view, 'K') as [SpecialCard, SpecialCard];
    await m.user.click(handCard('K', 1));
    expect(within(inBar().getByRole('list', { name: 'Jogadas' })).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Pôr 1 K',
      'Pôr 2 K',
    ]);
    await m.user.click(inBar().getByRole('button', { name: 'Pôr 2 K' }));
    expect(sentAction(m)).toEqual({ type: 'PLAY_K', cardIds: [second.id, first.id] });
  });

  it('enviar limpa a escolha, e a barra volta ao começo', async () => {
    const m = mount();
    await m.user.click(handCard('K'));
    await m.user.click(inBar().getByRole('button', { name: 'Pôr na Guarda' }));
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'false');
    expect(inBar().queryByRole('list', { name: 'Jogadas' })).not.toBeInTheDocument();
  });
});

describe('barra de ação: Armadilha e alvos (spec §3.2, §3.4)', () => {
  it('A → Armadilha → botão do alvo K manda TRAP com a carta e o alvo', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    await m.user.click(inBar().getByRole('button', { name: startsWith(guardTarget(m.view)) }));
    expect(sentAction(m)).toEqual({
      type: 'TRAP',
      cardId: handCards(m.view, 'A')[0]!.id,
      targetId: m.view.opponent.guard[0]!.id,
    });
  });

  it('a barra lista os alvos como botões grandes, e a mesa destaca os mesmos', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    const { opponent } = m.view;
    const [j1, j2] = opponent.attackBuffs as [SpecialCard, SpecialCard];
    const [q1, q2] = opponent.defenseBuffs as [SpecialCard, SpecialCard];
    const k = opponent.guard[0]!;
    const buttons = within(inBar().getByRole('list', { name: 'Alvos' })).getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAccessibleName(startsWith(`${cardText(j1)} dos Buffs de Ataque de Duda`));
    expect(buttons[1]).toHaveAccessibleName(startsWith(`${cardText(j2)} dos Buffs de Ataque de Duda`));
    expect(buttons[2]).toHaveAccessibleName(startsWith(`${cardText(q1)} dos Buffs de Defesa de Duda`));
    expect(buttons[3]).toHaveAccessibleName(startsWith(`${cardText(q2)} dos Buffs de Defesa de Duda`));
    expect(buttons[4]).toHaveAccessibleName(startsWith(`${cardText(k)} da Guarda de Duda`));
    // Alvo de toque ≥ 44 px (`min-h-11`).
    for (const button of buttons) expect(button.className).toContain('min-h-11');
    // Na mesa, as mesmas cinco cartas ganham o destaque.
    const highlighted = [...document.querySelectorAll('[data-alvo="true"]')].map((el) => el.getAttribute('data-card-id'));
    expect(new Set(highlighted)).toEqual(new Set([j1.id, j2.id, q1.id, q2.id, k.id]));
    expect(inBar().getByText(`Armadilha (${cardText(handCards(m.view, 'A')[0]!)}): escolha o alvo de Duda`)).toBeInTheDocument();
  });

  it('tocar a carta destacada na mesa também manda a jogada', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    const onTable = screen.getByRole('region', { name: 'Campo de Duda' }).querySelector(`[data-card-id="${m.view.opponent.guard[0]!.id}"]`)!;
    expect(onTable.tagName).toBe('BUTTON');
    await m.user.click(onTable);
    expect(sentAction(m)).toMatchObject({ type: 'TRAP', targetId: m.view.opponent.guard[0]!.id });
  });

  it('as cartas pequenas da mesa saem da ordem do Tab: a lista da barra é o caminho do teclado', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    const onTable = screen.getByRole('region', { name: 'Campo de Duda' }).querySelector(`[data-card-id="${m.view.opponent.guard[0]!.id}"]`)!;
    expect(onTable).toHaveAttribute('tabindex', '-1');
  });

  it('cada alvo diz o efeito de quebrá-lo, calculado pelo motor sem a carta', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    const kButton = inBar().getByRole('button', { name: startsWith(guardTarget(m.view)) });
    const without = previewAttack(viewWithout(m.view, m.view.opponent.guard[0]!.id), 'self');
    expect(without).toMatchObject({ outcome: 'DAMAGE', damage: 110 });
    expect(kButton).toHaveAccessibleName(`${guardTarget(m.view)} quebrando o K: 110 de dano`);
    const jButton = inBar().getByRole('button', { name: startsWith(`${cardText(m.view.opponent.attackBuffs[0]!)} dos Buffs de Ataque de Duda`) });
    expect(jButton).toHaveAccessibleName(`${cardText(m.view.opponent.attackBuffs[0]!)} dos Buffs de Ataque de Duda quebrando o J: ameaça de Duda cai de 84 para 56`);
  });

  it('apontar um alvo recalcula a prévia sem ele (quebrando o K: 152 × 42 · dano 110)', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    expect(inBar().queryByText('Quebrando o K antes')).not.toBeInTheDocument();
    const kButton = inBar().getByRole('button', { name: startsWith(guardTarget(m.view)) });
    await m.user.hover(kButton);
    expect(inBar().getByText('Quebrando o K antes')).toBeInTheDocument();
    expect(
      inBar().getByText(attackPreviewText(previewAttack(viewWithout(m.view, m.view.opponent.guard[0]!.id), 'self'), 'Duda', livesOf(m.view))),
    ).toHaveTextContent('152 × 42 · dano 110');
    await m.user.unhover(kButton);
    expect(inBar().queryByText('Quebrando o K antes')).not.toBeInTheDocument();
  });

  it('na janela de reação a Armadilha só mira o que o gatilho permite (K posto: só a Guarda)', async () => {
    const m = mount({ ...DRAFT, phase: 'K_PLAYED' });
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    expect(within(inBar().getByRole('list', { name: 'Alvos' })).getAllByRole('button')).toHaveLength(1);
    await m.user.click(inBar().getByRole('button', { name: startsWith(guardTarget(m.view)) }));
    expect(sentAction(m)).toMatchObject({ type: 'TRAP', targetId: m.view.opponent.guard[0]!.id });
  });
});

describe('barra de ação: prévias e o botão principal (spec §3.4)', () => {
  it('Atacar mostra a prévia do motor e manda DECLARE_ATTACK', async () => {
    const m = mount();
    const preview = previewAttack(m.view, 'self');
    const text = attackPreviewText(preview, 'Duda', livesOf(m.view));
    expect(text).toBe('152 × 42 · o K de Duda absorve, dano 0');
    const attack = inBar().getByRole('button', { name: ATTACK_BUTTON });
    expect(attack).toHaveAccessibleName(`Atacar ${text}`);
    // Rótulo no nome (axe, WCAG 2.5.3): o texto visível das duas linhas é, palavra por palavra, o nome.
    expect(attack.textContent).toBe(`Atacar ${text}`);
    expect(inBar().getByText(text)).toBeInTheDocument();
    await m.user.click(attack);
    expect(sentAction(m)).toEqual({ type: 'DECLARE_ATTACK' });
    // Jogada voluntária: sem `auto`.
    expect(m.connection.sent[0]).toMatchObject({ options: undefined });
  });

  it('o texto da prévia segue cada desfecho do motor', () => {
    const cases: Array<{ spec: ViewSpec; text: string }> = [
      {
        // Sem K, o dano passa: 152 contra 42.
        spec: { ...DRAFT, opponent: { ...DRAFT.opponent, guard: [] } },
        text: '152 × 42 · dano 110',
      },
      {
        spec: { ...DRAFT, opponent: { ...DRAFT.opponent, absoluteDefense: true } },
        text: '152 × 42 · Defesa Absoluta de Duda, dano 0',
      },
      {
        spec: { ...DRAFT, opponent: { ...DRAFT.opponent, reflect: true } },
        text: '152 × 11 · Reflect de Duda: 141 de dano volta para você',
      },
    ];
    for (const { spec, text } of cases) {
      const { unmount } = mount(spec);
      expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toHaveAccessibleName(`Atacar ${text}`);
      unmount();
    }
  });

  it('o botão Atacar diz "derruba Duda" quando o dano alcança a vida dele, e só então (spec §8.1)', async () => {
    const noGuard = { ...DRAFT.opponent, guard: [] };
    const lethal = mount({ ...DRAFT, opponent: { ...noGuard, hp: 110 } });
    const attack = inBar().getByRole('button', { name: ATTACK_BUTTON });
    expect(attack).toHaveAccessibleName('Atacar 152 × 42 · dano 110 · derruba Duda');
    expect(attack.textContent).toBe('Atacar 152 × 42 · dano 110 · derruba Duda');
    expect(inBar().getByText('152 × 42 · dano 110 · derruba Duda').className).toContain('tabular-nums');
    await lethal.user.click(attack);
    expect(sentAction(lethal)).toEqual({ type: 'DECLARE_ATTACK' });
    lethal.unmount();

    mount({ ...DRAFT, opponent: { ...noGuard, hp: 111 } });
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toHaveAccessibleName('Atacar 152 × 42 · dano 110');
  });

  it('com a Guarda de Duda de pé o botão não diz "derruba", mesmo com ATK − DEF maior que a vida dele', () => {
    mount({ ...DRAFT, opponent: { ...DRAFT.opponent, hp: 50 } });
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toHaveAccessibleName(
      'Atacar 152 × 42 · o K de Duda absorve, dano 0',
    );
  });

  it('contra o Reflect de Duda o botão diz "derruba você" quando o que volta alcança a sua vida', () => {
    const lethal = mount({ ...DRAFT, self: { ...DRAFT.self, hp: 141 }, opponent: { ...DRAFT.opponent, reflect: true } });
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toHaveAccessibleName(
      'Atacar 152 × 11 · Reflect de Duda: 141 de dano volta para você · derruba você',
    );
    lethal.unmount();
    mount({ ...DRAFT, self: { ...DRAFT.self, hp: 142 }, opponent: { ...DRAFT.opponent, reflect: true } });
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toHaveAccessibleName(
      'Atacar 152 × 11 · Reflect de Duda: 141 de dano volta para você',
    );
  });

  it('a linha "Quebrando o K antes" também diz quando o ataque sem o K derruba', async () => {
    const m = mount({ ...DRAFT, opponent: { ...DRAFT.opponent, hp: 110 } });
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    await m.user.hover(inBar().getByRole('button', { name: startsWith(guardTarget(m.view)) }));
    expect(inBar().getByText('152 × 42 · dano 110 · derruba Duda')).toBeInTheDocument();
  });

  it('a prévia do Ataque Absoluto diz que a Guarda não segura', () => {
    mount({ ...DRAFT, self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] } });
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toHaveAccessibleName(/^Atacar .*Ataque Absoluto, dano \d+/);
    expect(inBar().getByText(/Ataque Absoluto, dano \d+/)).toBeInTheDocument();
  });

  it('com o Ataque vazio, o botão principal vira "Encerrar turno" e manda END_TURN', async () => {
    const m = mount({ ...DRAFT, self: { ...DRAFT.self, attackRow: [] } });
    expect(inBar().queryByRole('button', { name: ATTACK_BUTTON })).not.toBeInTheDocument();
    const end = inBar().getByRole('button', { name: END_TURN_BUTTON });
    expect(end).toHaveAccessibleName('Encerrar turno Sua fileira de Ataque está vazia');
    await m.user.click(end);
    expect(sentAction(m)).toEqual({ type: 'END_TURN' });
  });

  it('a ameaça do oponente aparece junto da sua Defesa', () => {
    const m = mount();
    const threat = previewAttack(m.view, 'opponent');
    const text = threatPreviewText(threat, 'Duda', livesOf(m.view));
    expect(text).toBe('84 × sua Defesa 46 · seu K absorve, dano 0');
    expect(inBar().getByText('Ameaça de Duda')).toBeInTheDocument();
    expect(inBar().getByText(text)).toBeInTheDocument();
  });

  it('a ameaça segue cada desfecho, e some sem ataque do outro lado', () => {
    const none = mount({ ...DRAFT, opponent: { ...DRAFT.opponent, attackRow: [] } });
    expect(inBar().queryByText('Ameaça de Duda')).not.toBeInTheDocument();
    none.unmount();
    const damage = mount({ ...DRAFT, self: { ...DRAFT.self, guard: [] } });
    expect(inBar().getByText('84 × sua Defesa 46 · dano 38')).toBeInTheDocument();
    damage.unmount();
    const absolute = mount({ ...DRAFT, self: { ...DRAFT.self, absoluteDefense: true } });
    expect(inBar().getByText('84 × sua Defesa 46 · sua Defesa Absoluta anula, dano 0')).toBeInTheDocument();
    absolute.unmount();
    mount({ ...DRAFT, self: { ...DRAFT.self, reflect: true } });
    expect(inBar().getByText('84 × 7 · seu Reflect devolve 77 de dano a Duda')).toBeInTheDocument();
  });

  it('a ameaça diz "derruba você" quando o dano de Duda alcança a sua vida, e só então (spec §8.1)', () => {
    const lethal = mount({ ...DRAFT, self: { ...DRAFT.self, guard: [], hp: 38 } });
    expect(inBar().getByText('84 × sua Defesa 46 · dano 38 · derruba você')).toBeInTheDocument();
    lethal.unmount();
    const spared = mount({ ...DRAFT, self: { ...DRAFT.self, guard: [], hp: 39 } });
    expect(inBar().getByText('84 × sua Defesa 46 · dano 38')).toBeInTheDocument();
    spared.unmount();
    // O seu K absorve: nunca derruba, com a vida que for.
    const guarded = mount({ ...DRAFT, self: { ...DRAFT.self, hp: 10 } });
    expect(inBar().getByText('84 × sua Defesa 46 · seu K absorve, dano 0')).toBeInTheDocument();
    guarded.unmount();
    mount({ ...DRAFT, self: { ...DRAFT.self, reflect: true }, opponent: { ...DRAFT.opponent, hp: 77 } });
    expect(inBar().getByText('84 × 7 · seu Reflect devolve 77 de dano a Duda · derruba Duda')).toBeInTheDocument();
  });

  it('o botão principal tem altura de alvo de toque', () => {
    mount();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON }).className).toContain('min-h-14');
  });
});

describe('barra de ação: botões próprios (spec §3.4)', () => {
  it('Lançar Reflect diz quais cartas saem da mão, prefere as reais ao Selvagem e manda REFLECT', async () => {
    const m = mount(withHand(['K', 'J', 'Q', 'WILD']));
    const k = handCards(m.view, 'K')[0]!;
    const j = handCards(m.view, 'J')[0]!;
    const q = handCards(m.view, 'Q')[0]!;
    const button = inBar().getByRole('button', { name: startsWith('Lançar Reflect') });
    expect(button).toHaveAccessibleName(`Lançar Reflect sai ${cardText(k)} + ${cardText(j)} + ${cardText(q)} da sua mão`);
    await m.user.click(button);
    expect(sentAction(m)).toEqual({ type: 'REFLECT', kId: k.id, jId: j.id, qId: q.id });
  });

  it('Anular o Reflect aparece na janela de reação e manda CANCEL_REFLECT', async () => {
    const m = mount(withHand(['K', 'J', 'Q'], { phase: 'REFLECT_PLAYED', opponent: { ...DRAFT.opponent, reflect: true } }));
    expect(inBar().queryByRole('button', { name: startsWith('Lançar Reflect') })).not.toBeInTheDocument();
    const k = handCards(m.view, 'K')[0]!;
    const j = handCards(m.view, 'J')[0]!;
    const q = handCards(m.view, 'Q')[0]!;
    const button = inBar().getByRole('button', { name: startsWith('Anular o Reflect') });
    expect(button).toHaveAccessibleName(`Anular o Reflect sai ${cardText(k)} + ${cardText(j)} + ${cardText(q)} da sua mão`);
    await m.user.click(button);
    expect(sentAction(m)).toEqual({ type: 'CANCEL_REFLECT', kId: k.id, jId: j.id, qId: q.id });
  });

  it('Proteger-se do Reflect diz quais cartas do campo saem e manda PROTECT_FROM_REFLECT', async () => {
    const m = mount({ ...DRAFT, opponent: { ...DRAFT.opponent, reflect: true } });
    const j = m.view.self.attackBuffs[0]!;
    const q = m.view.self.defenseBuffs[0]!;
    const k = m.view.self.guard[0]!;
    const button = inBar().getByRole('button', { name: startsWith('Proteger-se do Reflect') });
    expect(button).toHaveAccessibleName(`Proteger-se do Reflect sai ${cardText(j)} + ${cardText(q)} + ${cardText(k)} do seu campo`);
    await m.user.click(button);
    expect(sentAction(m)).toEqual({ type: 'PROTECT_FROM_REFLECT', jId: j.id, qId: q.id, kId: k.id });
  });

  it('sem essas jogadas, os botões não aparecem', () => {
    mount();
    for (const name of ['Lançar Reflect', 'Anular o Reflect', 'Proteger-se do Reflect', 'Ressuscitar']) {
      expect(inBar().queryByRole('button', { name: startsWith(name) })).not.toBeInTheDocument();
    }
  });

  it('com uma carta escolhida os botões próprios saem da barra, e voltam ao cancelar', async () => {
    const m = mount(withHand(['K', 'J', 'Q']));
    expect(inBar().getByRole('button', { name: startsWith('Lançar Reflect') })).toBeInTheDocument();
    await m.user.click(handCard('J'));
    expect(inBar().queryByRole('button', { name: startsWith('Lançar Reflect') })).not.toBeInTheDocument();
    await m.user.click(inBar().getByRole('button', { name: 'Cancelar' }));
    expect(inBar().getByRole('button', { name: startsWith('Lançar Reflect') })).toBeInTheDocument();
  });

  it('os botões próprios têm altura de alvo de toque', () => {
    mount(withHand(['K', 'J', 'Q']));
    expect(inBar().getByRole('button', { name: startsWith('Lançar Reflect') }).className).toContain('min-h-11');
  });
});

describe('Ressuscitar e o cemitério (spec §3.4, §7)', () => {
  const RESURRECT: ViewSpec = {
    ...DRAFT,
    self: { ...DRAFT.self, resurrections: [{ row: 'ATK', value: 7 }] },
    graveyard: [7, 3, 7, { id: 'x-grave-k', kind: 'K', suit: 'paus' }],
  };

  it('abre o cemitério só com as numéricas, escolhe o 7, escolhe Ataque e manda RESURRECT', async () => {
    const m = mount(RESURRECT);
    const opener = inBar().getByRole('button', { name: startsWith('Ressuscitar') });
    expect(opener).toHaveAccessibleName('Ressuscitar 1 Ressurreição disponível');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await m.user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Ressuscitar' });
    const cards = within(dialog).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    // Um por valor (a lista legal), nenhum K.
    expect(cards.filter((name) => name !== null && /^\d+ de /.test(name))).toEqual(['7 de copas', '3 de ouros']);
    expect(within(dialog).queryByRole('button', { name: /^K de/ })).not.toBeInTheDocument();

    await m.user.click(within(dialog).getByRole('button', { name: '7 de copas' }));
    expect(within(dialog).getByText(`Em qual fileira entra ${cardText(m.view.graveyard[0]!)}?`)).toBeInTheDocument();
    const row = within(dialog).getByRole('button', { name: startsWith('Ataque') });
    // Rótulo no nome (axe, WCAG 2.5.3): o texto visível das duas linhas é, palavra por palavra, o nome ("Ataque no fim da fileira · 1 de 7").
    const rowName = `Ataque ${resurrectRowDetail(m.view.self.attackRow.length, m.view.config.rowLimit)}`;
    expect(row.textContent).toBe(rowName);
    expect(row).toHaveAccessibleName(rowName);
    await m.user.click(row);
    expect(sentAction(m)).toEqual({ type: 'RESURRECT', cardId: m.view.graveyard[0]!.id, row: 'ATK' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // O botão que abriu pode nem existir mais: o foco vai para a barra.
    expect(bar()).toHaveFocus();
  });

  it('só oferece as fileiras que têm vaga', async () => {
    const m = mount({ ...RESURRECT, self: { ...RESURRECT.self, defenseRow: [3, 6, 9, 5, 2, 4, 8] } });
    await m.user.click(inBar().getByRole('button', { name: startsWith('Ressuscitar') }));
    const dialog = screen.getByRole('dialog', { name: 'Ressuscitar' });
    await m.user.click(within(dialog).getByRole('button', { name: '7 de copas' }));
    expect(within(dialog).getByRole('button', { name: startsWith('Ataque') })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: startsWith('Defesa') })).not.toBeInTheDocument();
  });

  it('Voltar devolve à lista de cartas', async () => {
    const m = mount(RESURRECT);
    await m.user.click(inBar().getByRole('button', { name: startsWith('Ressuscitar') }));
    const dialog = screen.getByRole('dialog', { name: 'Ressuscitar' });
    await m.user.click(within(dialog).getByRole('button', { name: '3 de ouros' }));
    await m.user.click(within(dialog).getByRole('button', { name: 'Voltar' }));
    expect(within(dialog).getByRole('button', { name: '7 de copas' })).toBeInTheDocument();
    expect(acts(m)).toEqual([]);
  });

  it('Esc e Fechar fecham sem mandar nada e devolvem o foco ao botão que abriu', async () => {
    const m = mount(RESURRECT);
    const opener = inBar().getByRole('button', { name: startsWith('Ressuscitar') });
    await m.user.click(opener);
    expect(screen.getByRole('dialog', { name: 'Ressuscitar' })).toBeInTheDocument();
    await m.user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await m.user.click(opener);
    await m.user.click(within(screen.getByRole('dialog', { name: 'Ressuscitar' })).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(acts(m)).toEqual([]);
  });

  it('o botão do cemitério na faixa central abre a lista inteira, só para ver', async () => {
    const m = mount(RESURRECT);
    const button = screen.getByRole('button', { name: /^Cemitério \d/ });
    await m.user.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Cemitério' });
    const names = within(dialog).getAllByRole('img').map((el) => el.getAttribute('aria-label'));
    expect(names).toEqual(expect.arrayContaining(['7 de copas', '3 de ouros', '7 de espadas', 'K de paus']));
    expect(names).toHaveLength(4);
    expect(within(dialog).getAllByRole('button').map((b) => b.textContent)).toEqual(['Fechar']);
    await m.user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('o cemitério vazio não oferece nada a ressuscitar, e a lista diz que está vazio', async () => {
    const m = mount({ ...RESURRECT, graveyard: [] });
    expect(inBar().queryByRole('button', { name: startsWith('Ressuscitar') })).not.toBeInTheDocument();
    await m.user.click(screen.getByRole('button', { name: 'Cemitério vazio' }));
    expect(within(screen.getByRole('dialog', { name: 'Cemitério' })).getByText('O cemitério está vazio.')).toBeInTheDocument();
    expect(acts(m)).toEqual([]);
  });
});

describe('barra de ação: cancelar e o teclado (spec §3.4, §7)', () => {
  it('Esc limpa a escolha, sem mandar nada', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.keyboard('{Escape}');
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
    expect(inBar().queryByRole('list', { name: 'Jogadas' })).not.toBeInTheDocument();
    expect(acts(m)).toEqual([]);
  });

  it('Esc também volta do passo do alvo', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    expect(inBar().getByRole('list', { name: 'Alvos' })).toBeInTheDocument();
    await m.user.keyboard('{Escape}');
    expect(inBar().queryByRole('list', { name: 'Alvos' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-alvo="true"]')).toHaveLength(0);
    expect(acts(m)).toEqual([]);
  });

  it('Esc sem escolha não faz nada', async () => {
    const m = mount();
    await m.user.keyboard('{Escape}');
    expect(acts(m)).toEqual([]);
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('o botão Cancelar faz o mesmo e só existe com uma escolha', async () => {
    const m = mount();
    expect(inBar().queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    await m.user.click(handCard('A'));
    const cancel = inBar().getByRole('button', { name: 'Cancelar' });
    expect(cancel.className).toContain('min-h-11');
    await m.user.click(cancel);
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
    expect(inBar().queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(acts(m)).toEqual([]);
  });

  it('Esc dentro do cemitério fecha só o cemitério: a escolha da mão fica', async () => {
    const m = mount({ ...DRAFT, self: { ...DRAFT.self, resurrections: [{ row: 'ATK', value: 7 }] }, graveyard: [7, 3] });
    await m.user.click(handCard('A'));
    await m.user.click(screen.getByRole('button', { name: /^Cemitério \d/ }));
    await m.user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'true');
  });

  it('com o cemitério aberto, um Esc que não passa por ele também não limpa a escolha', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(screen.getByRole('button', { name: /^Cemitério \d/ }));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Esc que fecha a gaveta do histórico não limpa a escolha', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(screen.getByRole('button', { name: 'Histórico' }));
    expect(screen.getByRole('button', { name: 'Fechar o histórico' })).toHaveFocus();
    await m.user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Histórico' })).toHaveFocus();
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'true');
  });

  it('a jogada inteira só pelo teclado: Enter na carta, Enter na jogada, Tab até o alvo e Enter', async () => {
    const m = mount();
    // A vez chegou: o foco já está na barra.
    expect(bar()).toHaveFocus();
    // Shift+Tab percorre a mão de trás para a frente: Q, A.
    await m.user.tab({ shift: true });
    expect(handCard('Q')).toHaveFocus();
    await m.user.tab({ shift: true });
    expect(handCard('A')).toHaveFocus();
    await m.user.keyboard('{Enter}');
    // Escolher a carta leva o foco à primeira jogada; escolher a jogada, ao primeiro alvo.
    expect(inBar().getByRole('button', { name: 'Armadilha' })).toHaveFocus();
    await m.user.keyboard('{Enter}');
    const targets = within(inBar().getByRole('list', { name: 'Alvos' })).getAllByRole('button');
    expect(targets[0]).toHaveFocus();
    // Os alvos vêm na ordem J, J, Q, Q, K; o K é o quinto.
    await m.user.tab();
    await m.user.tab();
    await m.user.tab();
    await m.user.tab();
    expect(targets[4]).toHaveFocus();
    await m.user.keyboard('{Enter}');
    expect(sentAction(m)).toMatchObject({ type: 'TRAP', targetId: m.view.opponent.guard[0]!.id });
    // Depois de jogar, o foco volta à barra (a carta que ele estava sumiu).
    expect(bar()).toHaveFocus();
  });

  it('Espaço também escolhe', async () => {
    const m = mount();
    act(() => handCard('K').focus());
    await m.user.keyboard(' ');
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().getByRole('button', { name: 'Pôr na Guarda' })).toHaveFocus();
  });

  it('não há atalhos de uma tecla: letras e números não jogam', async () => {
    const m = mount();
    await m.user.keyboard('akqjr1234 ');
    expect(acts(m)).toEqual([]);
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });
});

describe('barra de ação: enviando (spec §1.5)', () => {
  it('com a jogada em voo, os botões ficam desligados, a mão não escolhe e a barra diz "Enviando…"', async () => {
    const m = mount(withHand(['K', 'J', 'Q']));
    const ack = deferredAck();
    m.connection.acks = [ack.promise];
    expect(screen.queryByText('Enviando…')).not.toBeInTheDocument();
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeDisabled();
    expect(inBar().getByRole('button', { name: startsWith('Lançar Reflect') })).toBeDisabled();
    // Um segundo toque não manda nada, nem escolhe carta.
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    await m.user.click(handCard('K'));
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'false');
    expect(acts(m)).toHaveLength(1);

    await act(async () => {
      ack.resolve({ ok: true });
      await ack.promise;
    });
    expect(screen.queryByText('Enviando…')).not.toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('os botões da escolha também ficam desligados durante o envio', async () => {
    const m = mount();
    await m.user.click(handCard('K'));
    const ack = deferredAck();
    m.connection.acks = [ack.promise];
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(inBar().queryByRole('button', { name: 'Pôr na Guarda' })).not.toBeInTheDocument();
    await act(async () => {
      ack.resolve({ ok: true });
      await ack.promise;
    });
  });

  it('um ack de regra recusada mostra a mensagem do motor; "devagar" mostra o aviso curto', async () => {
    const m = mount();
    m.connection.acks = [{ ok: false, code: 'INVALID_TARGET', message: 'alvo inválido para esta jogada' }];
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(await screen.findByText('alvo inválido para esta jogada')).toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
    m.connection.acks = [{ ok: false, code: 'RATE_LIMITED', message: 'x' }];
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(await screen.findByText('Devagar: muitas jogadas seguidas.')).toBeInTheDocument();
  });

  it('uma conexão que lança não derruba a mesa', async () => {
    const m = mount();
    vi.spyOn(m.connection, 'act').mockRejectedValueOnce(new Error('socket morto'));
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });
});

describe('barra de ação: quando não é a sua vez', () => {
  it('a mão não escolhe nada (o toque só explica, B2), e a barra só diz de quem é a vez', async () => {
    const m = mount({ ...DRAFT, phase: 'WAITING' });
    const buttons = handList().getAllByRole('button');
    for (const button of buttons) expect(button).not.toHaveAttribute('aria-pressed');
    await m.user.click(buttons[0]!);
    expect(document.querySelector('[data-motivo]')).toHaveTextContent(/: espere a sua vez \(agora é a de Duda\)$/);
    expect(document.querySelector('[data-motivo]')).toHaveAttribute('role', 'status');
    expect(m.connection.sent).toHaveLength(0);
    expect(inBar().getByText('Esperando Duda jogar…')).toBeInTheDocument();
    expect(inBar().queryByRole('button', { name: ATTACK_BUTTON })).not.toBeInTheDocument();
    // A ameaça dele continua à vista.
    expect(inBar().getByText('Ameaça de Duda')).toBeInTheDocument();
  });

  it('com a vez dele de reagir, a barra diz isso', () => {
    mount({ ...DRAFT, phase: { kind: 'REACTION', responder: 'p2', trigger: 'ATTACK' } });
    expect(inBar().getByText('Duda pode reagir…')).toBeInTheDocument();
  });

  it('no Equipar e na escolha da ordem, a barra de jogadas não existe (são painéis próprios, em phases.test.tsx)', () => {
    for (const phase of [{ kind: 'EQUIP' }, { kind: 'ORDER_CHOICE', player: 'p1' }] as const) {
      const { unmount } = mount({ ...DRAFT, phase });
      expect(screen.queryByRole('region', { name: 'Ações' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('numa reação em que só dá para passar, a barra não manda tocar em carta', () => {
    mount(withHand(['K', 'Q'], { phase: 'ATTACK' }));
    expect(inBar().queryByText(/Toque numa carta/)).not.toBeInTheDocument();
    expect(inBar().queryAllByRole('button')).toHaveLength(0);
  });

  it('na janela de reação não há Atacar nem Encerrar turno', () => {
    mount({ ...DRAFT, phase: 'ATTACK' });
    expect(inBar().queryByRole('button', { name: ATTACK_BUTTON })).not.toBeInTheDocument();
    expect(inBar().queryByRole('button', { name: END_TURN_BUTTON })).not.toBeInTheDocument();
  });
});

describe('barra de ação: a escolha depende da época e da mão (spec §1.5, passo 4)', () => {
  const nextState = (m: Mounted, extra: Partial<Omit<StateMessage, 't' | 'view'>>, view = m.view) =>
    act(() => m.connection.emitState(stateMessage(view, { seq: 2, ...extra })));

  it('sobrevive a um state da mesma época, se a carta continua na mão', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    nextState(m, { epoch: 1 });
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().getByRole('button', { name: 'Armadilha' })).toBeInTheDocument();
  });

  it('zera quando a época muda', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    nextState(m, { epoch: 2 });
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
    expect(inBar().queryByRole('list', { name: 'Alvos' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-alvo="true"]')).toHaveLength(0);
    // E não volta sozinha numa época nova, nem se a carta ainda estiver lá.
    nextState(m, { epoch: 2, seq: 3 });
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
  });

  it('zera quando a carta sai da mão', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    const { view: without } = scenarioAt(withHand(['K', 'Q']));
    nextState(m, { epoch: 1 }, without);
    expect(handList().getAllByRole('button')).toHaveLength(2);
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(inBar().queryByRole('list', { name: 'Jogadas' })).not.toBeInTheDocument();
  });

  it('uma jogada que deixou de ser legal volta para a lista de jogadas da carta', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    // Duda ganha a Defesa Absoluta na mesma época: a Armadilha não tem mais alvo.
    const { view: protectedView } = scenarioAt({ ...DRAFT, opponent: { ...DRAFT.opponent, absoluteDefense: true } });
    nextState(m, { epoch: 1 }, protectedView);
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().queryByRole('list', { name: 'Alvos' })).not.toBeInTheDocument();
    expect(inBar().getByText(/: Duda está sob Defesa Absoluta: nada de Armadilha nem Sacrifício$/)).toBeInTheDocument();
  });
});

describe('barra de ação: foco e a sessão (spec §7)', () => {
  const myTurn = () => scenarioAt(DRAFT).view;

  it('quando chega o state da sua vez, o foco vai para a barra, sem contar como interação', () => {
    const m = mount({ ...DRAFT, phase: 'WAITING' });
    expect(bar()).not.toHaveFocus();
    const interact = vi.spyOn(m.session, 'interact');
    act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
    expect(bar()).toHaveFocus();
    expect(interact).not.toHaveBeenCalled();
  });

  it('já na primeira vez, se a mesa abre na sua vez', () => {
    mount();
    expect(bar()).toHaveFocus();
  });

  describe('na sua vez de atacar, a sua fileira de Ataque vem para o pé da janela dos campos (celular e tablet)', () => {
    type ScrollIntoView = (this: Element, arg?: boolean | ScrollIntoViewOptions) => void;
    const scrolled = (spy: ReturnType<typeof vi.fn<ScrollIntoView>>) =>
      spy.mock.contexts.map((element) => element.getAttribute('data-fileira'));
    let spy: ReturnType<typeof vi.fn<ScrollIntoView>>;
    /** A geometria de um celular de 360 × 640 com os campos no topo: a janela dos campos vai até 317, e a sua fileira está em 422..478. */
    const rects: Record<string, [number, number]> = { campos: [0, 317], 'p1:ATK': [422, 478], 'p2:DEF': [161, 217] };
    const original = Element.prototype.getBoundingClientRect;
    beforeEach(() => {
      spy = vi.fn<ScrollIntoView>();
      Element.prototype.scrollIntoView = spy;
      Element.prototype.getBoundingClientRect = function (this: Element) {
        const key = this.hasAttribute('data-campos') ? 'campos' : (this.getAttribute('data-fileira') ?? '');
        const [top, bottom] = rects[key] ?? [0, 0];
        return { top, bottom, left: 0, right: 360, width: 360, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
      };
    });
    afterEach(() => {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
      Element.prototype.getBoundingClientRect = original;
      rects['p1:ATK'] = [422, 478];
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('rola a sua fileira de Ataque até o pé quando ela não está à vista, uma vez por vez', () => {
      const m = mount({ ...DRAFT, phase: 'WAITING' });
      expect(scrolled(spy)).toEqual([]);
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
      expect(scrolled(spy)).toEqual(['p1:ATK']);
      // Instantânea, nunca suave; e o foco segue na barra.
      expect(spy).toHaveBeenLastCalledWith({ block: 'end', behavior: 'auto' });
      expect(bar()).toHaveFocus();
      // Um state da mesma época (o bot respondeu, a carta voltou) não rola de novo.
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 3, epoch: 2 })));
      expect(scrolled(spy)).toEqual(['p1:ATK']);
    });

    it('com movimento reduzido (sistema), a rolagem também é instantânea', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        addEventListener() {},
        removeEventListener() {},
      }));
      const m = mount({ ...DRAFT, phase: 'WAITING' });
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
      expect(spy).toHaveBeenLastCalledWith({ block: 'end', behavior: 'auto' });
    });

    it.each([
      ['a roda do mouse', () => new WheelEvent('wheel', { bubbles: true })],
      ['o toque arrastado', () => new Event('touchmove', { bubbles: true })],
      ['uma tecla de rolagem', () => new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true })],
    ])('não briga com o jogador: se ele rolou os campos nesta vez (%s), nada rola', (_, event) => {
      vi.useFakeTimers();
      const m = mount({ ...DRAFT, phase: 'WAITING' });
      const hit = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 40, defense: 10, damage: 30 } as const;
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2, events: [hit, { type: 'TurnStarted', player: 'p1' }] })));
      act(() => {
        document.querySelector('[data-campos]')!.dispatchEvent(event());
      });
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(scrolled(spy)).toEqual([]);
    });

    it('espera as batidas pararem: enquanto o dano que você recebe conta, a sua vida fica à vista', () => {
      vi.useFakeTimers();
      const m = mount({ ...DRAFT, phase: 'WAITING' });
      const hit = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 40, defense: 10, damage: 30 } as const;
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2, events: [hit, { type: 'TurnStarted', player: 'p1' }] })));
      expect(scrolled(spy)).toEqual([]);
      act(() => {
        vi.advanceTimersByTime(3_000);
      });
      expect(scrolled(spy)).toEqual(['p1:ATK']);
    });

    it('com a sua fileira e a Defesa do oponente já inteiras na janela, nada rola (a vista que o jogador escolheu fica)', () => {
      rects['p1:ATK'] = [261, 317];
      const m = mount({ ...DRAFT, phase: 'WAITING' });
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
      expect(scrolled(spy)).toEqual([]);
    });

    it('com a dica do tutorial aberta no alto dos campos, a rolagem espera ela fechar (e rola, uma vez, quando fecha)', () => {
      const panel = <section aria-label="Dica">o texto</section>;
      const m = mount({ ...DRAFT, phase: 'WAITING' }, { hint: { zone: 'actionBar', panel, open: true } });
      // A mesma árvore do `mount` (o fragmento com o `before`): um outro formato remontaria a mesa.
      const hintIs = (open: boolean) =>
        m.rerender(
          <>
            {undefined}
            <PlayTable session={m.session} hint={{ zone: null, panel, open }} />
          </>,
        );
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
      expect(scrolled(spy)).toEqual([]);
      // Uma dica que ficou no painel mas já não vale (`open` falso) não segura a rolagem.
      hintIs(false);
      expect(scrolled(spy)).toEqual(['p1:ATK']);
      hintIs(true);
      hintIs(false);
      expect(scrolled(spy)).toEqual(['p1:ATK']);
    });

    it('no PC não rola: a mesa cabe, e a vida do oponente fica à vista', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === PC_QUERY, addEventListener() {}, removeEventListener() {} }));
      const m = mount({ ...DRAFT, phase: 'WAITING' });
      act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
      expect(scrolled(spy)).toEqual([]);
    });
  });

  it('não rouba o foco de um campo de texto', () => {
    const m = mount({ ...DRAFT, phase: 'WAITING' }, { before: <input aria-label="Campo de texto" /> });
    const input = screen.getByRole('textbox', { name: 'Campo de texto' });
    input.focus();
    act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
    expect(input).toHaveFocus();
    expect(bar()).not.toHaveFocus();
  });

  it('não rouba o foco de um diálogo aberto', async () => {
    const m = mount({ ...DRAFT, phase: 'WAITING' });
    await m.user.click(screen.getByRole('button', { name: /^Cemitério \d/ }));
    const dialog = screen.getByRole('dialog', { name: 'Cemitério' });
    act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 2 })));
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('um state da mesma época não puxa o foco de novo', async () => {
    const m = mount();
    await m.user.click(handCard('K'));
    act(() => m.connection.emitState(stateMessage(myTurn(), { seq: 2, epoch: 1 })));
    expect(bar()).not.toHaveFocus();
  });

  it('na escolha da ordem o foco vai para o painel da ordem (não há barra), sem contar como interação', () => {
    const m = mount({ ...DRAFT, phase: 'WAITING' });
    const interact = vi.spyOn(m.session, 'interact');
    act(() => m.connection.emitState(stateMessage(scenarioAt({ ...DRAFT, phase: { kind: 'ORDER_CHOICE', player: 'p1' } }).view, { seq: 2, epoch: 2 })));
    expect(screen.getByRole('region', { name: 'Escolha da ordem' })).toHaveFocus();
    expect(interact).not.toHaveBeenCalled();
  });

  it('qualquer clique ou foco na mesa chama interact()', async () => {
    const m = mount();
    const interact = vi.spyOn(m.session, 'interact');
    await m.user.click(screen.getByRole('region', { name: 'Campo de Duda' }));
    expect(interact).toHaveBeenCalled();
    interact.mockClear();
    act(() => handCard('K').focus());
    expect(interact).toHaveBeenCalled();
  });

  it('tocar, passar o mouse ou focar um item marcado apaga a marca (markSeen)', async () => {
    const m = mount();
    const markSeen = vi.spyOn(m.session, 'markSeen');
    // Uma jogada voluntária fixa a base das marcas; depois Duda ganha um K na Guarda.
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    const { view: next } = scenarioAt({ ...DRAFT, opponent: { ...DRAFT.opponent, guard: ['K', 'K'] } });
    act(() => m.connection.emitState(stateMessage(next, { seq: 2, epoch: 2 })));
    const fresh = next.opponent.guard[1]!;
    const novo = screen.getByRole('img', { name: /^K de .+, novo$/ });
    expect(novo).toHaveAttribute('data-card-id', fresh.id);
    await m.user.hover(novo);
    expect(markSeen).toHaveBeenCalledWith(fresh.id);
    expect(screen.queryByRole('img', { name: /, novo$/ })).not.toBeInTheDocument();
  });

  it('focar o botão do cemitério apaga o "novo" das cartas suas que foram para lá (teclado)', async () => {
    const m = mount();
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    // Duda destruiu o K da sua Guarda: ele sai do campo e entra no cemitério.
    const guardK = m.view.self.guard[0]!;
    const { view: next } = scenarioAt({ ...DRAFT, self: { ...DRAFT.self, guard: [] }, graveyard: [3, 5, 8, guardK] });
    act(() => m.connection.emitState(stateMessage(next, { seq: 2, epoch: 2 })));
    const button = screen.getByRole('button', { name: /^Cemitério \d+, novo, a de cima é / });
    // Rótulo no nome: o texto visível ("Cemitério 3 novo") é trecho contínuo do nome ("Cemitério 3, novo, a de cima é ...").
    expect(button.textContent).toMatch(/^Cemitério \d+ novo$/);
    act(() => button.focus());
    expect(screen.getByRole('button', { name: /^Cemitério \d/ })).not.toHaveAccessibleName(/, novo,/);
  });

  it('o alvo marcado, na lista da barra, também apaga a marca quando é focado', async () => {
    const m = mount();
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    const { view: next } = scenarioAt({ ...DRAFT, opponent: { ...DRAFT.opponent, guard: ['K', 'K'] } });
    act(() => m.connection.emitState(stateMessage(next, { seq: 2, epoch: 2 })));
    const markSeen = vi.spyOn(m.session, 'markSeen');
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    const fresh = next.opponent.guard[1]!;
    const target = within(inBar().getByRole('list', { name: 'Alvos' })).getAllByRole('button').at(-1)!;
    expect(target).toHaveAccessibleName(startsWith(`${cardText(fresh)} da Guarda de Duda`));
    act(() => target.focus());
    expect(markSeen).toHaveBeenCalledWith(fresh.id);
  });
});

describe('barra de ação: acessibilidade (axe)', () => {
  it('em repouso, com Reflect e Ressuscitar à mostra', async () => {
    const { container } = mount({
      ...DRAFT,
      self: { ...DRAFT.self, hand: ['K', 'J', 'Q', 'A'], resurrections: [{ row: 'ATK', value: 7 }] },
    });
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('no passo do alvo, com a lista de alvos e o destaque na mesa', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    await m.user.hover(inBar().getByRole('button', { name: startsWith(guardTarget(m.view)) }));
    expect(await seriousViolations(m.container)).toEqual([]);
  });

  it('com o cemitério aberto (ver e ressuscitar)', async () => {
    const m = mount({ ...DRAFT, self: { ...DRAFT.self, resurrections: [{ row: 'ATK', value: 7 }] }, graveyard: [7, 3] });
    await m.user.click(screen.getByRole('button', { name: /^Cemitério \d/ }));
    expect(await seriousViolations(m.container)).toEqual([]);
    await m.user.keyboard('{Escape}');
    await m.user.click(inBar().getByRole('button', { name: startsWith('Ressuscitar') }));
    expect(await seriousViolations(m.container)).toEqual([]);
    await m.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '7 de copas' }));
    expect(await seriousViolations(m.container)).toEqual([]);
  });

  it('na vez do oponente', async () => {
    const { container } = mount({ ...DRAFT, phase: 'WAITING' });
    expect(await seriousViolations(container)).toEqual([]);
  });
});
