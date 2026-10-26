// O "derruba" do texto contra a regra de fim do motor (spec do polimento §8.1). `copy-lethal.test.ts` confere as frases; este arquivo
// prende a REGRA da interface à do motor: monta partidas de verdade, declara o ataque e passa a janela de reação com `applyAction`,
// e confere que o Coringa cai (`GAME_OVER` por vida) exatamente quando o texto diz "derruba", e quem cai é o que o texto nomeia.
// Se a vida mudar no sub-projeto 5 (ou o motor passar a zerar o dano de outro jeito), é este teste que reprova primeiro.
import { applyAction, previewAttack, type GameResult, type GameState, type PlayerId, type PlayerView } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { attackDeclaredText, attackPreviewText, threatPreviewText } from '../../src/model/copy.ts';
import { previewsOf } from '../../src/model/preview.ts';
import { scenarioAt, type SideSpec, type ViewSpec } from '../fixtures.ts';

/** Você é `p1` e Duda é `p2` (o padrão da `scenarioAt`). */
const OPPONENT = 'Duda';

const fourOf = <T>(card: T): T[] => [card, card, card, card];
const ABSOLUTE_DEFENSE: SideSpec = { defenseBuffs: fourOf('Q'), absoluteDefense: true };
const ABSOLUTE_ATTACK: SideSpec = { attackBuffs: fourOf('J') };

/** Os dois lados antes de cada variante: nenhuma Guarda, ATK 114 contra DEF 42 (72 de dano) e 56 contra 46 (10 de dano). */
const ME: SideSpec = {
  attackRow: [8, 4, 10, 7, 9],
  defenseRow: [3, 6, 9, 5],
  attackBuffs: ['J', 'WILD'],
  defenseBuffs: ['Q'],
};
const FOE: SideSpec = { attackRow: [6, 9, 3, 10], defenseRow: [5, 7, 2], attackBuffs: ['J'], defenseBuffs: ['Q', 'Q'] };

/** Cada variante muda o lado que ataca (`a`) e o que defende (`d`): as situações em que o dano cai de um jeito diferente. */
const VARIANTS: Record<string, (a: SideSpec, d: SideSpec) => [SideSpec, SideSpec]> = {
  'dano direto': (a, d) => [a, d],
  'a Guarda absorve': (a, d) => [a, { ...d, guard: ['K'] }],
  'a Defesa Absoluta absorve': (a, d) => [a, { ...d, ...ABSOLUTE_DEFENSE }],
  'o Ataque Absoluto fura a Guarda': (a, d) => [{ ...a, ...ABSOLUTE_ATTACK }, { ...d, guard: ['K'] }],
  'o Ataque Absoluto contra a Defesa Absoluta': (a, d) => [{ ...a, ...ABSOLUTE_ATTACK }, { ...d, ...ABSOLUTE_DEFENSE }],
  'o Reflect devolve o golpe': (a, d) => [a, { ...d, reflect: true }],
  'o Reflect e a Guarda de quem ataca': (a, d) => [{ ...a, guard: ['K'] }, { ...d, reflect: true }],
  'o Reflect contra quem tem Defesa Absoluta (nada volta)': (a, d) => [{ ...a, ...ABSOLUTE_DEFENSE }, { ...d, reflect: true }],
  'o Ataque Absoluto contra o Reflect': (a, d) => [{ ...a, ...ABSOLUTE_ATTACK }, { ...d, reflect: true }],
};

/**
 * Quem ataca e de onde se lê a frase:
 * - `mine`: o botão Atacar, na sua vez (você ataca; você declara e Duda passa a reação);
 * - `threat`: a ameaça na barra, na vez de Duda (Duda declara e você passa);
 * - `declared`: o gatilho da janela de reação, com o ataque de Duda já declarado (você passa).
 */
interface Direction {
  /** O cenário: `a` é o lado que ataca; `d`, o que defende. */
  spec: (a: SideSpec, d: SideSpec) => ViewSpec;
  /** O texto da prévia, lido da `view` de quem vê (você). */
  text: (view: PlayerView) => string;
  /** Quem declara o ataque (o motor), ou `null` se o ataque já está declarado e a janela de reação está aberta. */
  declarer: PlayerId | null;
  /** Quem passa a janela de reação. */
  passer: PlayerId;
  /** O lado do cenário que é o seu (para pôr a vida de quem leva o golpe). */
  attackerIsMe: boolean;
}

const DIRECTIONS: Record<string, Direction> = {
  'o seu ataque (botão Atacar)': {
    spec: (a, d) => ({ phase: 'MAIN', self: a, opponent: d }),
    text: (view) => {
      const { mine, lives } = previewsOf(view);
      return attackPreviewText(mine, OPPONENT, lives);
    },
    declarer: 'p1',
    passer: 'p2',
    attackerIsMe: true,
  },
  'o ataque de Duda (a ameaça)': {
    spec: (a, d) => ({ phase: 'WAITING', firstToAttack: 'opponent', self: d, opponent: a }),
    text: (view) => {
      const { threat, lives } = previewsOf(view);
      return threatPreviewText(threat, OPPONENT, lives);
    },
    declarer: 'p2',
    passer: 'p1',
    attackerIsMe: false,
  },
  'o gatilho da janela de reação': {
    spec: (a, d) => ({ phase: 'ATTACK', firstToAttack: 'opponent', self: d, opponent: a }),
    text: (view) => attackDeclaredText(previewAttack(view, 'opponent'), OPPONENT, previewsOf(view).lives),
    declarer: null,
    passer: 'p1',
    attackerIsMe: false,
  },
};

/** Declara o ataque (se ainda não estiver) e passa a janela de reação: o que o motor faz com o golpe. Devolve o fim da partida, ou `null`. */
function playOut(state: GameState, direction: Direction): GameResult | null {
  let current = state;
  if (direction.declarer !== null) {
    const declared = applyAction(current, direction.declarer, { type: 'DECLARE_ATTACK' });
    if (!declared.ok) throw new Error(`DECLARE_ATTACK: ${declared.error.code}: ${declared.error.message}`);
    current = declared.state;
  }
  expect(current.phase.kind, 'a janela de reação está aberta').toBe('REACTION');
  const passed = applyAction(current, direction.passer, { type: 'PASS' });
  if (!passed.ok) throw new Error(`PASS: ${passed.error.code}: ${passed.error.message}`);
  return passed.state.phase.kind === 'GAME_OVER' ? passed.state.phase.result : null;
}

/** O que o texto diz que cai: `[]`, ou o nome de quem "derruba". */
const knockouts = (text: string): string[] => [...text.matchAll(/derruba (você|Duda)/g)].map((match) => match[1]!);

/** O que o motor diz que caiu: ninguém, ou o nome de quem perdeu a vida (o vencedor é o outro). Qualquer outro fim é um erro do cenário. */
function engineKnockouts(result: GameResult | null): string[] {
  if (result === null) return [];
  if (result.kind !== 'WIN' || result.reason !== 'HP') throw new Error(`fim inesperado: ${JSON.stringify(result)}`);
  return [result.winner === 'p1' ? OPPONENT : 'você'];
}

/** A vida a testar de quem recebe `landing` de dano: o limite (cai, e o empate também), um a menos (cai), um a mais (não cai) e valores longe dele. */
function lifeValues(landing: number): number[] {
  const around = landing > 0 ? [landing - 1, landing, landing + 1] : [2];
  return [...new Set([1, ...around, 1000])].filter((hp) => hp >= 1).sort((a, b) => a - b);
}

interface Tally {
  /** Golpes que o motor diz que derrubam você. */
  you: number;
  /** Golpes que o motor diz que derrubam Duda. */
  foe: number;
  /** Golpes depois dos quais a partida segue. */
  none: number;
}

/**
 * Uma variante numa direção, com as vidas de borda de cada lado: o texto diz "derruba" exatamente quando o motor termina a partida
 * por vida, e nomeia quem cai. Devolve quantos golpes de cada tipo o motor viu (para a conferência de que o teste não é vazio).
 */
function checkVariant(direction: Direction, variantName: string): Tally {
  const tally: Tally = { you: 0, foe: 0, none: 0 };
  const [attackerBase, defenderBase] = VARIANTS[variantName]!(
    { ...(direction.attackerIsMe ? ME : FOE) },
    { ...(direction.attackerIsMe ? FOE : ME) },
  );

  // De onde sai o dano de cada lado: o motor diz (`previewAttack`), e é com isso que se escolhem as vidas de borda.
  const probe = scenarioAt(direction.spec(attackerBase, defenderBase));
  const preview = previewAttack(probe.view, direction.attackerIsMe ? 'self' : 'opponent');
  for (const defenderHp of lifeValues(preview.damage)) {
    for (const attackerHp of lifeValues(preview.reflected)) {
      const { state, view } = scenarioAt(direction.spec({ ...attackerBase, hp: attackerHp }, { ...defenderBase, hp: defenderHp }));
      const text = direction.text(view);
      const happened = engineKnockouts(playOut(state, direction));
      expect(knockouts(text), `${variantName}, vida de quem ataca ${attackerHp}, de quem defende ${defenderHp}: "${text}"`).toEqual(happened);
      if (happened.length === 0) tally.none += 1;
      else if (happened[0] === 'você') tally.you += 1;
      else tally.foe += 1;
    }
  }
  return tally;
}

describe('o "derruba" da prévia contra o fim de partida do motor', () => {
  for (const [directionName, direction] of Object.entries(DIRECTIONS)) {
    describe(directionName, () => {
      for (const variantName of Object.keys(VARIANTS)) {
        it(`${variantName}: a partida acaba por vida exatamente quando o texto diz "derruba", e cai quem o texto nomeia`, () => {
          checkVariant(direction, variantName);
        });
      }
    });
  }

  it('o teste não é vazio: há golpe que derruba Duda, golpe que derruba você e golpe que não derruba ninguém', () => {
    const total: Tally = { you: 0, foe: 0, none: 0 };
    for (const direction of Object.values(DIRECTIONS)) {
      for (const variantName of Object.keys(VARIANTS)) {
        const tally = checkVariant(direction, variantName);
        total.you += tally.you;
        total.foe += tally.foe;
        total.none += tally.none;
      }
    }
    expect(total.foe, 'golpes que derrubam Duda').toBeGreaterThan(0);
    expect(total.you, 'golpes que derrubam você').toBeGreaterThan(0);
    expect(total.none, 'golpes que não derrubam ninguém').toBeGreaterThan(0);
  });
});

describe('os casos que o texto promete, um a um (frase e motor)', () => {
  const mine = DIRECTIONS['o seu ataque (botão Atacar)']!;
  const threat = DIRECTIONS['o ataque de Duda (a ameaça)']!;

  it('o dano que zera a vida de Duda derruba, o empate também, e a partida acaba com a vitória de quem atacou', () => {
    // ATK 114 contra DEF 42: 72 de dano.
    const { state, view } = scenarioAt(mine.spec({ ...ME }, { ...FOE, hp: 72 }));
    expect(mine.text(view)).toBe('114 × 42 · dano 72 · derruba Duda');
    expect(playOut(state, mine)).toEqual({ kind: 'WIN', winner: 'p1', reason: 'HP' });
  });

  it('um dano que deixa 1 de vida não derruba, e o motor segue a partida', () => {
    const { state, view } = scenarioAt(mine.spec({ ...ME }, { ...FOE, hp: 73 }));
    expect(mine.text(view)).toBe('114 × 42 · dano 72');
    expect(playOut(state, mine)).toBeNull();
  });

  it('o Reflect de Duda que devolve o golpe e zera a SUA vida derruba você, e o vencedor é Duda', () => {
    // O motor usa metade da DEF base de quem ataca, sem os Q (⌊23/2⌋ = 11), contra o ATK: 114 − 11 = 103 voltam para você.
    const { state, view } = scenarioAt(mine.spec({ ...ME, hp: 103 }, { ...FOE, reflect: true }));
    expect(mine.text(view)).toBe('114 × 11 · Reflect de Duda: 103 de dano volta para você · derruba você');
    expect(playOut(state, mine)).toEqual({ kind: 'WIN', winner: 'p2', reason: 'HP' });
    // Com 1 de vida a mais, sobra vida: nem o texto nem o motor derrubam.
    const survives = scenarioAt(mine.spec({ ...ME, hp: 104 }, { ...FOE, reflect: true }));
    expect(mine.text(survives.view)).toBe('114 × 11 · Reflect de Duda: 103 de dano volta para você');
    expect(playOut(survives.state, mine)).toBeNull();
  });

  it('o seu Reflect que devolve o bastante derruba Duda, e o vencedor é você', () => {
    // Duda ataca com 56 contra ⌊(DEF base dele, sem os Q) 14 / 2⌋ = 7: 49 voltam para ele.
    const { state, view } = scenarioAt(threat.spec({ ...FOE, hp: 49 }, { ...ME, reflect: true }));
    expect(threat.text(view)).toBe('56 × 7 · seu Reflect devolve 49 de dano a Duda · derruba Duda');
    expect(playOut(state, threat)).toEqual({ kind: 'WIN', winner: 'p1', reason: 'HP' });
  });

  it('o K da Guarda que absorve nunca derruba, mesmo com ATK − DEF maior que a vida', () => {
    const { state, view } = scenarioAt(mine.spec({ ...ME }, { ...FOE, guard: ['K'], hp: 1 }));
    expect(previewAttack(view, 'self')).toMatchObject({ outcome: 'GUARD_ABSORBS', net: 72, damage: 0 });
    expect(mine.text(view)).toBe('114 × 42 · o K de Duda absorve, dano 0');
    expect(playOut(state, mine)).toBeNull();
  });

  it('a Defesa Absoluta que absorve nunca derruba', () => {
    const { state, view } = scenarioAt(threat.spec({ ...FOE }, { ...ME, ...ABSOLUTE_DEFENSE, hp: 1 }));
    expect(threat.text(view)).not.toContain('derruba');
    expect(playOut(state, threat)).toBeNull();
  });

  it('o Ataque Absoluto fura a Guarda e derruba quando o dano alcança a vida', () => {
    const attacker = { ...ME, ...ABSOLUTE_ATTACK };
    const { damage } = previewAttack(scenarioAt(mine.spec(attacker, { ...FOE, guard: ['K'] })).view, 'self');
    expect(damage).toBeGreaterThan(0);
    const kills = scenarioAt(mine.spec(attacker, { ...FOE, guard: ['K'], hp: damage }));
    expect(mine.text(kills.view)).toContain('Ataque Absoluto');
    expect(mine.text(kills.view)).toMatch(/ · derruba Duda$/);
    expect(playOut(kills.state, mine)).toEqual({ kind: 'WIN', winner: 'p1', reason: 'HP' });
    const survives = scenarioAt(mine.spec(attacker, { ...FOE, guard: ['K'], hp: damage + 1 }));
    expect(mine.text(survives.view)).not.toContain('derruba');
    expect(playOut(survives.state, mine)).toBeNull();
  });
});
