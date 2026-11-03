// Os pontos diretos do playtest de 2026-11-02 (decisoes.md 2026-11-02 (9)): sem seleção de texto na mesa, sem a "Ameaça de X", sem a
// ordem automática, "Bônus" no lugar de "Buff" e o total da fileira que cresce quando sobe; e o ponto 18 (2026-11-03 (1) e (2)): o total
// que sobe fica em ouro, com contorno de tinta, e o que desce encolhe na cor de sempre.
import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { act, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TABLE_MOTION } from '../../src/model/table-motion.ts';
import { TREND } from '../../src/ui/table/Row.tsx';
import { advance, cleanup, emit, MINE, mount, stage, THEIRS, TURN } from './anim-harness.tsx';
import type { ViewSpec } from '../fixtures.ts';

interface Call {
  el: HTMLElement;
  frames: Keyframe[];
}
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  HTMLElement.prototype.animate = function (this: HTMLElement, frames: Keyframe[]) {
    calls.push({ el: this, frames });
    return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
  } as HTMLElement['animate'];
});
afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  cleanup();
});

const inBar = () => within(screen.getByRole('region', { name: 'Ações' }));

describe('3. sem seleção de texto na mesa', () => {
  it('o palco não seleciona texto; o histórico e os diálogos seguem selecionáveis', () => {
    const m = mount(MINE);
    expect(stage(m.container)).toHaveClass('select-none');
    expect(screen.getByRole('region', { name: 'Linhas do histórico' })).toHaveClass('select-text');
    const css = readFileSync(resolve(import.meta.dirname, '../../src/ui/table/Modal.tsx'), 'utf8');
    expect(css).toMatch(/const BASE = '[^']*\bselect-text\b/);
  });
});

describe('4. sem a ameaça do oponente', () => {
  it('a barra não mostra "Ameaça de X" nem a conta do ataque dele', () => {
    mount(MINE);
    expect(inBar().queryByText(/Ameaça de/)).not.toBeInTheDocument();
    expect(inBar().queryByRole('group', { name: 'Prévias' })).not.toBeInTheDocument();
  });
});

describe('7. sem a ordem automática', () => {
  it('o painel da ordem não tem barra nem promete sair sozinho, e nada é enviado sem o jogador', () => {
    const m = mount({ ...MINE, phase: { kind: 'ORDER_CHOICE', player: 'p1' } });
    const order = screen.getByRole('region', { name: 'Escolha da ordem' });
    expect(order.querySelector('[data-auto-barra]')).toBeNull();
    expect(within(order).queryByText(/sai sozinho/)).not.toBeInTheDocument();
    expect(within(order).getByText('Escolha quando quiser.')).toBeInTheDocument();
    advance(10_000);
    expect(m.connection.sent).toEqual([]);
  });
});

describe('8. "Bônus" no lugar de "Buff"', () => {
  /** Um texto entre aspas com a palavra "Buff" solta (os identificadores, como `attackBuffs`, ficam). */
  const BUFF_TEXT = /(['"`])[^'"`\n]*\b[Bb]uffs?\b[^'"`\n]*\1/;
  it.each([
    'src/model/copy.ts',
    'src/model/tutorial-copy.ts',
    'src/ui/table/labels.ts',
    'src/ui/table/PlayerField.tsx',
    'src/ui/cards/Card.tsx',
    '../sim/src/play/text.ts',
  ])('%s não tem "Buff" em texto', (file) => {
    const source = readFileSync(resolve(import.meta.dirname, '../..', file), 'utf8');
    const code = source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(BUFF_TEXT);
  });

  it('a mesa diz "Bônus de ataque" e "Bônus de defesa"', () => {
    mount(MINE);
    expect(screen.getAllByText('Bônus de ataque').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bônus de defesa').length).toBeGreaterThan(0);
  });
});

describe('12. o total que sobe cresce no pouso', () => {
  const total = (container: HTMLElement, key: string) => container.querySelector(`[data-fileira="${key}"] [data-total]`)!;
  const pops = (el: Element) => calls.filter((call) => call.el === el && call.frames.some((frame) => frame.scale === '1.3'));
  /** A sexta numérica do seu Ataque (a fixture dá os ids pela posição). */
  const SIXTH: NumCard = { id: 'x-p1-ATK-5', kind: 'NUM', value: 6, suit: 'espadas' };
  const PLACED: GameEvent = { type: 'CardsPlaced', player: 'p1', placements: [{ card: SIXTH, destination: 'ATK' }] };
  const WITH_SIXTH: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, attackRow: [8, 4, 10, 7, 9, 6] } };

  it('a numérica do Equipar: o total fica o de antes até ela pousar, e então cresce e assenta', () => {
    const m = mount(THEIRS);
    const before = total(m.container, 'p1:ATK').textContent;
    emit(m, WITH_SIXTH, [PLACED]);
    expect(total(m.container, 'p1:ATK').textContent).toBe(before);
    advance(TABLE_MOTION.dropMs - 1);
    expect(total(m.container, 'p1:ATK').textContent).toBe(before);
    advance(1);
    expect(Number(total(m.container, 'p1:ATK').textContent)).toBeGreaterThan(Number(before));
    expect(pops(total(m.container, 'p1:ATK'))).toHaveLength(1);
  });

  it('o J que pousa nos Bônus de ataque sobe o total do Ataque do mesmo jeito', () => {
    const J: SpecialCard = { id: 'j-novo', kind: 'J', suit: 'ouros' };
    const before: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, hand: ['K', J], attackBuffs: [] } };
    const m = mount(before);
    const old = total(m.container, 'p1:ATK').textContent;
    emit(m, { ...before, self: { ...before.self, hand: ['K'], attackBuffs: [J] } }, [TURN, { type: 'BuffPlayed', player: 'p1', card: J, as: 'J' }]);
    advance(400 + TABLE_MOTION.recoilMs + TABLE_MOTION.landAfterMs - 1);
    expect(total(m.container, 'p1:ATK').textContent).toBe(old);
    advance(1);
    expect(Number(total(m.container, 'p1:ATK').textContent)).toBeGreaterThan(Number(old));
    expect(pops(total(m.container, 'p1:ATK'))).toHaveLength(1);
  });

  it('o total que cai (o golpe) não cresce', () => {
    const m = mount(THEIRS);
    emit(m, { ...THEIRS, self: { ...THEIRS.self, defenseRow: [6, 9, 5] } }, [
      { type: 'AttackDeclared', player: 'p2' },
      { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 100, defense: 50, damage: 50 },
    ]);
    advance(2_000);
    expect(pops(total(m.container, 'p1:DEF'))).toHaveLength(0);
  });

  it('18. o total que sobe fica em ouro (com contorno) até 900 ms depois do pouso', () => {
    const m = mount(THEIRS);
    emit(m, WITH_SIXTH, [PLACED]);
    advance(TABLE_MOTION.dropMs);
    const el = total(m.container, 'p1:ATK');
    expect(el).toHaveClass('total-fileira');
    expect(el).toHaveAttribute('data-subiu');
    expect(el).not.toHaveAttribute('data-desceu');
    advance(TREND.holdMs - 1);
    expect(el).toHaveAttribute('data-subiu');
    advance(1);
    expect(el).not.toHaveAttribute('data-subiu');
  });

  it('com movimento reduzido: o total troca no pouso, sem crescer', () => {
    const m = mount(THEIRS, { prefs: { reduceMotion: true } });
    const before = total(m.container, 'p1:ATK').textContent;
    emit(m, WITH_SIXTH, [PLACED]);
    expect(total(m.container, 'p1:ATK').textContent).toBe(before);
    advance(TABLE_MOTION.dropMs);
    expect(total(m.container, 'p1:ATK').textContent).not.toBe(before);
    expect(pops(total(m.container, 'p1:ATK'))).toHaveLength(0);
  });
});

describe('18. o total que desce encolhe, na cor de sempre', () => {
  it('a folha pinta só a subida: a descida não tem cor nem contorno (decisoes.md 2026-11-03 (2))', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../../src/styles.css'), 'utf8');
    expect(css).toMatch(/\.total-fileira\[data-subiu\] \{[^}]*color: var\(--color-ouro\)/);
    expect(css).not.toMatch(/data-desceu/);
  });

  const total = (container: HTMLElement, key: string) => container.querySelector(`[data-fileira="${key}"] [data-total]`)!;
  const dips = (el: Element) => calls.filter((call) => call.el === el && call.frames.some((frame) => frame.scale === TREND.fall));
  /** O golpe de Duda tira a carta da frente da sua Defesa: o total conta para baixo na batida do dano. */
  const HIT: GameEvent[] = [
    { type: 'AttackDeclared', player: 'p2' },
    { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 100, defense: 50, damage: 50 },
  ];
  const HIT_VIEW: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, defenseRow: [6, 9, 5] } };

  it('o golpe: marcado enquanto conta, encolhe uma vez só, e a marca sai 900 ms depois da última mudança', () => {
    const m = mount(THEIRS);
    const before = Number(total(m.container, 'p1:DEF').textContent);
    emit(m, HIT_VIEW, HIT);
    const el = total(m.container, 'p1:DEF');
    expect(el).not.toHaveAttribute('data-desceu');
    // A batida do dano conta o número para baixo, quadro a quadro.
    for (let i = 0; i < 40 && Number(el.textContent) === before; i++) advance(50);
    expect(Number(el.textContent)).toBeLessThan(before);
    expect(el).toHaveAttribute('data-desceu');
    expect(el).not.toHaveAttribute('data-subiu');
    advance(2_000);
    expect(dips(el)).toHaveLength(1);
    expect(el).not.toHaveAttribute('data-desceu');
  });

  it('a carta que sai sem golpe (a Armadilha num J seu) também desce o total', () => {
    const J: SpecialCard = { id: 'j-alvo', kind: 'J', suit: 'copas' };
    const trap: SpecialCard = { id: 'a-bot', kind: 'A', suit: 'paus' };
    const before: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, attackBuffs: [J] } };
    const m = mount(before);
    emit(m, { ...before, self: { ...before.self, attackBuffs: [] }, graveyard: [3, 5, 8, J, trap] }, [
      { type: 'TrapUsed', player: 'p2', card: trap, target: J, targetOwner: 'p1' },
    ]);
    expect(total(m.container, 'p1:ATK')).toHaveAttribute('data-desceu');
  });

  it('o pulo leva o total ao valor final sem pintar', () => {
    const m = mount(THEIRS);
    emit(m, HIT_VIEW, HIT);
    act(() => stage(m.container).click());
    const el = total(m.container, 'p1:DEF');
    expect(el).not.toHaveAttribute('data-desceu');
    expect(dips(el)).toHaveLength(0);
  });

  it('com movimento reduzido: só a marca, sem encolher', () => {
    const J: SpecialCard = { id: 'j-alvo', kind: 'J', suit: 'copas' };
    const trap: SpecialCard = { id: 'a-bot', kind: 'A', suit: 'paus' };
    const before: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, attackBuffs: [J] } };
    const m = mount(before, { prefs: { reduceMotion: true } });
    emit(m, { ...before, self: { ...before.self, attackBuffs: [] }, graveyard: [3, 5, 8, J, trap] }, [
      { type: 'TrapUsed', player: 'p2', card: trap, target: J, targetOwner: 'p1' },
    ]);
    const el = total(m.container, 'p1:ATK');
    expect(el).toHaveAttribute('data-desceu');
    expect(dips(el)).toHaveLength(0);
  });
});
