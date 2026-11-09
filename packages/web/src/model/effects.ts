// O que cada batida mostra (spec §4.2): efeitos nas cartas e nas fileiras, o número do dano, o texto das faixas e das
// cenas, e o atraso das transições de layout. Puro: sem React nem DOM. Quem desenha é a interface (`ui/anim`).
import { quadValues, type DevastationState, type GameEvent, type NumCard, type PlayerId, type PlayerView, type RowName } from '@coringa/engine';
import { cardText, eventText, type Names } from '@coringa/sim/text';
import { finalBlowTitle, initiativeRibbon, SCENE_TITLE, type Ribbon } from './copy.ts';
import { impactForce, type ImpactForce } from './impact.ts';
import { TABLE_MOTION } from './table-motion.ts';
import { RIBBON_SCENES, type Beat } from './timeline.ts';

/** Chave de uma fileira de um jogador, para o conjunto de fileiras acesas: "p1:ATK". */
export const rowKey = (player: PlayerId, row: RowName): string => `${player}:${row}`;

/**
 * O efeito numa carta: a carta do escudo do Reflect, a carta da quadra que acende. A carta que quebra (o K da Guarda, o alvo da Armadilha e
 * do Sacrifício) não tem efeito aqui: quem racha e estoura é a cópia dela, no lugar antigo (`ui/anim/Leaving.tsx`, sub-projeto 6 §8).
 */
export type CardFx = 'shield' | 'light' | 'cause';

export interface BeatEffects {
  cards: ReadonlyMap<string, CardFx>;
  /** Fileiras acesas (`rowKey`). */
  rows: ReadonlySet<string>;
  /** O número do dano (ou, com `heal`, o da cura: "+N") que sobe no Coringa de `target`. */
  damage: { target: PlayerId; amount: number; heal?: true } | null;
  /** O escudo do Reflect de `owner` quebra: a `view` já não o tem, então é só uma sobreposição no Coringa dele. */
  shieldBreak: PlayerId | null;
  /**
   * A decisão da iniciativa (sub-projeto 6 §4): quem ficou com ela e se mudou de mão. A espada voa para o retrato novo (ou salta no
   * mesmo) na batida, e não quando o `state` chega.
   */
  initiative: { holder: PlayerId; changed: boolean; streak: number } | null;
  /** O golpe (sub-projeto 6 §5): quem apanhou e com que peso. A mesa treme e respinga tinta no retrato dele. */
  impact: { target: PlayerId; force: ImpactForce } | null;
}

export const NO_EFFECTS: BeatEffects = { cards: new Map(), rows: new Set(), damage: null, shieldBreak: null, initiative: null, impact: null };

/** As cartas da fileira da quadra: as da fileira com o valor dela (a `view` já é a de depois do evento). */
function quadCards(view: PlayerView, player: PlayerId, row: RowName, value: number): string[] {
  const side = view.me === player ? view.self : view.opponent;
  return (row === 'ATK' ? side.attackRow : side.defenseRow).filter((card) => card.value === value).map((card) => card.id);
}

const fxMap = (ids: string[], fx: CardFx): ReadonlyMap<string, CardFx> => new Map(ids.map((id) => [id, fx] as const));

/** O golpe em `target`, se o dano pesa alguma coisa. */
function impactOn(target: PlayerId, damage: number): BeatEffects['impact'] {
  const force = impactForce(damage);
  return force === null ? null : { target, force };
}

function effectsOfEvent(event: GameEvent, view: PlayerView): Partial<BeatEffects> {
  switch (event.type) {
    case 'AttackDeclared':
    case 'AbsoluteAttack':
      return { rows: new Set([rowKey(event.player, 'ATK')]) };
    case 'DamageDealt':
      return {
        rows: new Set([rowKey(event.attacker, 'ATK'), rowKey(event.defender, 'DEF')]),
        damage: event.damage > 0 ? { target: event.defender, amount: event.damage } : null,
        impact: impactOn(event.defender, event.damage),
      };
    case 'ReflectTriggered':
      return {
        damage: event.damage > 0 ? { target: event.attacker, amount: event.damage } : null,
        impact: impactOn(event.attacker, event.damage),
      };
    case 'StealDamage':
      return {
        damage: event.damage > 0 ? { target: event.victim, amount: event.damage } : null,
        impact: impactOn(event.victim, event.damage),
      };
    case 'Healed': {
      const damage = event.amount > 0 ? { target: event.player, amount: event.amount, heal: true as const } : null;
      if (event.source !== 'DEFENSE' || damage === null) return { damage };
      // A causa da cura passiva acende junto (bloco A dos pontos do playtest, ponto 9): os K da Guarda de quem curou.
      const side = view.me === event.player ? view.self : view.opponent;
      return { damage, cards: fxMap(side.guard.map((card) => card.id), 'cause') };
    }
    case 'ReflectCanceled':
      return { shieldBreak: event.owner };
    case 'InitiativeDecided':
      return { initiative: { holder: event.player, changed: event.changed, streak: event.streak } };
    case 'ReflectPlayed':
      return { cards: fxMap([event.reflect.k.id, event.reflect.j.id, event.reflect.q.id], 'shield') };
    case 'QuadFormed':
    case 'QuadBroken':
      return { cards: fxMap(quadCards(view, event.player, event.quad.row, event.quad.value), 'light') };
    default:
      return {};
  }
}

/** Os efeitos da batida em curso, sobre a `view` do `state` que a trouxe. Sem batida, nenhum. */
/**
 * Os efeitos da batida. Na cena com golpe (o Ataque Absoluto, o gatilho do Reflect), depois que ele acerta (`landed`), somam-se os dele
 * (o número, os respingos, as fileiras), e o tremor é sempre o forte (sub-projeto 6 §7.1), qualquer que seja o dano. Com
 * `sceneNumber`, a cena desenhada mostra o número ela mesma (o placar não passa por cima dela) e o placar não o repete.
 */
export function effectsOf(beat: Beat | null, view: PlayerView, landed = false, sceneNumber = false): BeatEffects {
  if (beat === null) return NO_EFFECTS;
  // Os dois espelhos que trincam já dizem o que o escudo do placar diria.
  if (beat.scene === 'REFLECT_CANCELED' && sceneNumber) return NO_EFFECTS;
  // O golpe que é o próprio evento da cena (o dano devolvido pelo Reflect) só vale quando acende.
  const own = beat.hit?.event === beat.event ? {} : effectsOfEvent(beat.event, view);
  if (beat.hit === null || !landed) return { ...NO_EFFECTS, ...own };
  const hit = effectsOfEvent(beat.hit.event, view);
  const impact = hit.impact ? { target: hit.impact.target, force: 'forte' as const } : null;
  return { ...NO_EFFECTS, ...own, ...hit, impact, damage: sceneNumber ? null : (hit.damage ?? null) };
}

/**
 * A insígnia da Defesa Absoluta no retrato de `player` na batida `index` (sub-projeto 6 §7.2). `active` é a Defesa da `view`, que
 * já é a de depois da linha do tempo: com ela, a insígnia espera a cena do `AbsoluteDefenseStarted` passar; sem ela, fica até a
 * batida do `AbsoluteDefenseEnded`.
 */
export function insigniaShown(beats: readonly Beat[], index: number, player: PlayerId, active: boolean): boolean {
  const ahead = (type: 'AbsoluteDefenseStarted' | 'AbsoluteDefenseEnded', from: number) =>
    beats.some((beat, i) => i >= from && beat.event.type === type && beat.event.player === player);
  return active ? !ahead('AbsoluteDefenseStarted', index) : ahead('AbsoluteDefenseEnded', index + 1);
}

/**
 * A desolação da fileira `key` na batida `index` (sub-projeto 6 §7.4). `stored` é a da sessão, que já é a de depois da linha do tempo:
 * com a queda da fileira nesta linha, ela espera a batida da queda e a poeira assentar (`settled`: a batida em que isso já aconteceu).
 */
export function desolationShown(beats: readonly Beat[], index: number, key: string, stored: boolean, settled: Beat | null): boolean {
  if (!stored) return false;
  const fall = beats.findLastIndex((beat) => beat.event.type === 'RowDevastated' && rowKey(beat.event.player, beat.event.row) === key);
  if (fall < 0 || index > fall) return true;
  if (index < fall) return false;
  // No `catchUp` a queda é faixa, sem cena: vale na batida dela.
  return beats[fall]!.scene === null || settled === beats[fall];
}

/**
 * O retrato do perdedor rachado na batida `index` (`decisoes.md` 2026-11-07 (3), B2: toda derrota pela vida racha, como a Exódia). A
 * batida fatal é a da Exódia ou a do golpe final: antes dela, inteiro; nela, a partir do instante dela (`cracked`: o `crackAt` da Exódia,
 * o impacto do golpe final; no `catchUp`, sem cena, na hora); depois dela, rachado. Sem batida fatal (o Ataque Absoluto e o Reflect que
 * matam ficam com as cenas deles), racha na batida do `GameOver`. Sem nenhuma das duas na linha do tempo, a partida acabou antes: rachado.
 */
export function defeatShown(beats: readonly Beat[], index: number, cracked: boolean): boolean {
  const fatal = beats.findLastIndex((beat) => beat.event.type === 'Exodia' || beat.scene === 'FINAL_BLOW');
  if (fatal >= 0) return index === fatal ? beats[fatal]!.scene === null || cracked : index > fatal;
  const over = beats.findIndex((beat) => beat.event.type === 'GameOver');
  return over < 0 || index >= over;
}

/** O que a cena da Ressurreição lê da mesa: a vaga onde a carta pousa (`-1` sem ela) e a quadra que acende. */
export interface RisingInfo {
  landIndex: number;
  quad: { row: RowName; indices: number[]; cards: NumCard[] } | null;
}

/**
 * Lê da `view` a Ressurreição (sub-projeto 6 §7.6). O evento não diz de qual quadra ela veio, e dizer mudaria as partidas de referência e o
 * `RULES_VERSION` por um detalhe visual (`decisoes.md` 2026-11-02 (4)): acende a quadra que estiver na mesa, primeiro na fileira de destino,
 * a de maior valor. A carta que volta não conta, porque ela ainda não pousou. Sem quadra (ela pode ter se desfeito), nenhuma carta acende.
 */
export function resurrectionInfo(event: GameEvent, view: PlayerView): RisingInfo | null {
  if (event.type !== 'Resurrected') return null;
  const side = view.me === event.player ? view.self : view.opponent;
  const rowOf = (row: RowName): NumCard[] => (row === 'ATK' ? side.attackRow : side.defenseRow);
  const landIndex = rowOf(event.row).findIndex((card) => card.id === event.card.id);
  for (const row of [event.row, event.row === 'ATK' ? 'DEF' : 'ATK'] as const) {
    const cards = rowOf(row);
    const value = quadValues(cards.filter((card) => card.id !== event.card.id)).at(-1);
    if (value === undefined) continue;
    const indices = cards.flatMap((card, i) => (card.value === value && card.id !== event.card.id ? [i] : [])).slice(0, 4);
    return { landIndex, quad: { row, indices, cards: indices.map((i) => cards[i]!) } };
  }
  return { landIndex, quad: null };
}

/** O que a cena do golpe final lê da mesa: quem bate, de que lado está o retrato atingido e quantas cartas acendem na fileira de Ataque. */
export interface FinalBlowInfo {
  attacker: PlayerId;
  target: 'voce' | 'oponente';
  cards: number;
}

/**
 * Lê da `view` o golpe final (bloco B dos pontos do playtest, ponto 15). O motor acaba a partida antes de tirar as cartas da fileira de
 * Ataque de quem bateu (`resolveAttack`), então a `view` de depois do passo ainda as tem. `null` fora da cena do golpe final.
 */
export function finalBlowInfo(beat: Beat, view: PlayerView): FinalBlowInfo | null {
  if (beat.scene !== 'FINAL_BLOW' || beat.event.type !== 'DamageDealt') return null;
  const { attacker } = beat.event;
  const side = attacker === view.me ? view.self : view.opponent;
  return { attacker, target: attacker === view.me ? 'oponente' : 'voce', cards: side.attackRow.length };
}

/** A fileira onde a cena de campo acontece. */
export interface FieldTarget {
  player: PlayerId;
  row: RowName;
}

/**
 * A fileira da cena de campo (sub-projeto 6 §7.4): a que caiu, ou a que a cancelada ia derrubar. A cancelada não traz a fileira:
 * ela vem da Devastação em curso no `state` de antes (`cast`), e o dono é o alvo (nos Reflects) ou quem lançou, para quem ela tinha
 * voltado (na Defesa Absoluta). `null` sem isso.
 */
export function fieldTarget(event: GameEvent, cast: Pick<DevastationState, 'row'> | null, me: PlayerId, opponent: PlayerId): FieldTarget | null {
  if (event.type === 'RowDevastated') return { player: event.player, row: event.row };
  if (event.type !== 'DevastationCanceled' || cast === null) return null;
  const other = event.player === me ? opponent : me;
  return { player: event.reason === 'ABSOLUTE_DEFENSE' ? event.player : other, row: cast.row };
}

/**
 * Quando cada elemento com `layoutId` (as cartas) começa a se mexer: o início, em ms, da
 * batida que o move (no momento da especial do oponente, o impacto). Se mais de uma batida mexe na carta, vale a última: a carta fica
 * onde estava até lá.
 */
export function delaysOf(beats: readonly Beat[]): ReadonlyMap<string, number> {
  const delays = new Map<string, number>();
  for (const beat of beats) {
    for (const id of beat.cards) delays.set(id, beat.moment?.impactAtMs ?? beat.startMs);
  }
  return delays;
}

export interface Deals {
  /** Cartas com id que entram (as suas): id → quando, em ms (o início da batida do `CardsDealt`, em leque). */
  cards: ReadonlyMap<string, number>;
  /** Cartas sem id (o verso na mão do oponente): quantas entram, quando entra a primeira e o intervalo do leque. */
  backs: ReadonlyMap<PlayerId, { count: number; startMs: number; staggerMs: number }>;
}

/**
 * O intervalo do leque (sub-projeto 6 §8): `fanStaggerMs`, encolhido para as `count` cartas caberem na batida (a encolhida pelo teto de
 * decisão também). Nunca aumenta a batida.
 */
const fanStagger = (beat: Beat, count: number): number =>
  count <= 1 ? 0 : Math.min(TABLE_MOTION.fanStaggerMs, Math.floor(beat.durationMs / count));

/**
 * As cartas que entram na mesa na batida do `CardsDealt` (spec §4.2): esperam a batida e esmaecem, em vez de já estarem lá. Desde a fatia 5
 * do sub-projeto 6, chegam em leque, uma depois da outra, na ordem da compra.
 */
export function dealsOf(beats: readonly Beat[]): Deals {
  const cards = new Map<string, number>();
  const backs = new Map<PlayerId, { count: number; startMs: number; staggerMs: number }>();
  for (const beat of beats) {
    if (beat.event.type !== 'CardsDealt') continue;
    const { player, count, cards: dealt } = beat.event;
    if (dealt) {
      const stagger = fanStagger(beat, dealt.length);
      dealt.forEach((card, i) => cards.set(card.id, beat.startMs + i * stagger));
    } else {
      const before = backs.get(player);
      backs.set(player, before ? { ...before, count: before.count + count } : { count, startMs: beat.startMs, staggerMs: fanStagger(beat, count) });
    }
  }
  return { cards, backs };
}

/**
 * A batida em que a vida e os totais contam até o valor novo (o dano, o dano devolvido pelo Reflect, o dano ou a cura do Roubo, a
 * cura pela Defesa); -1 sem ela.
 */
export function damageBeatIndex(beats: readonly Beat[]): number {
  const counts = new Set<GameEvent['type']>(['DamageDealt', 'ReflectTriggered', 'StealDamage', 'Healed']);
  // A cura de 0 (a vida já cheia) é batida quieta: não é ela que conta.
  return beats.findIndex((beat) => counts.has(beat.event.type) && beat.kind !== 'quiet');
}

/**
 * O quanto o evento muda a vida, e de quem: o golpe, o dano devolvido pelo Reflect, o do Roubo e a cura. Cada jogador conta a
 * vida na batida que mexe nela (decisoes.md 2026-11-01 (1)): a cura sobe junto com o "+N", e não na batida do golpe.
 */
export function lifeChange(event: GameEvent): { player: PlayerId; delta: number } | null {
  switch (event.type) {
    case 'DamageDealt':
      return event.damage > 0 ? { player: event.defender, delta: -event.damage } : null;
    case 'ReflectTriggered':
      return event.damage > 0 ? { player: event.attacker, delta: -event.damage } : null;
    case 'StealDamage':
      return event.damage > 0 ? { player: event.victim, delta: -event.damage } : null;
    case 'Healed':
      return event.amount > 0 ? { player: event.player, delta: event.amount } : null;
    default:
      return null;
  }
}

/** A fileira com o dono: "o seu Ataque", "a Defesa de Duda"; com `from`, "do seu Ataque", "da Defesa de Duda". */
function rowText(row: RowName, owner: PlayerId, names: Names, from = false): string {
  const attack = row === 'ATK';
  const lead = from ? (attack ? 'do' : 'da') : attack ? 'o' : 'a';
  const name = attack ? 'Ataque' : 'Defesa';
  return owner === names.me ? `${lead} ${attack ? 'seu' : 'sua'} ${name}` : `${lead} ${name} de ${names.of(owner)}`;
}

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** "O Ataque de Duda foi devastado"; refletida, "A Devastação voltou: a sua Defesa foi devastada". */
function devastatedText(event: Extract<GameEvent, { type: 'RowDevastated' }>, names: Names): string {
  const done = `${rowText(event.row, event.player, names)} foi ${event.row === 'ATK' ? 'devastado' : 'devastada'}`;
  return event.reflected ? `A Devastação voltou: ${done}` : capitalized(done);
}

const listText = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

/**
 * A faixa de um evento (spec §4.2), ou `null` se o evento não tem faixa. As cenas (Exódia, Absolutos, Reflect) também têm
 * texto: no `catchUp` elas viram faixa (spec §4.1: sem cenas especiais na volta).
 */
export function bannerText(event: GameEvent, names: Names): string | null {
  switch (event.type) {
    case 'RoundStarted':
      return `Rodada ${event.round} · ${event.kind === 'EQUIP' ? 'Equipar' : 'Ataque'}`;
    case 'TurnStarted':
      return event.player === names.me ? 'Sua vez' : `Vez de ${names.of(event.player)}`;
    case 'ReactionWindowOpened':
      return event.responder === names.me ? 'Você pode reagir' : `${names.of(event.responder)} pode reagir`;
    case 'DeckReshuffled':
      return 'O cemitério virou o monte';
    case 'CardStolen':
      return `${names.of(event.player)} roubou o ${cardText(event.card)} ${rowText(event.fromRow, event.from, names, true)}`;
    case 'HandLimitPenalty': {
      if (event.penalty !== 'BURN') return eventText(event, names);
      const cards = event.cards.map(cardText);
      const hand = event.player === names.me ? 'Sua mão' : `A mão de ${names.of(event.player)}`;
      return `${hand} já tem 4 especiais: ${listText(cards)} ${cards.length === 1 ? 'foi' : 'foram'} para o cemitério`;
    }
    case 'RowDevastated':
      return devastatedText(event, names);
    case 'ReflectCanceled':
      return 'Os Reflects se anularam';
    case 'DevastationCanceled': {
      if (event.reason === 'REFLECT_CLASH') return 'Os Reflects se anularam: a Devastação não aconteceu';
      // A Devastação refletida voltou para quem a lançou, e a Defesa Absoluta dele a segurou.
      const defense = event.player === names.me ? 'A sua Defesa Absoluta' : `A Defesa Absoluta de ${names.of(event.player)}`;
      return `${defense} segurou a Devastação devolvida`;
    }
    case 'DevastationCast':
      return `${SCENE_TITLE.DEVASTATION.replace('!', '')} de ${names.of(event.player)}!`;
    case 'OrderChosen':
    case 'InitiativeDecided':
    case 'QuadFormed':
    case 'QuadBroken':
    case 'GameOver':
    case 'Exodia':
    case 'AbsoluteAttack':
    case 'AbsoluteDefenseStarted':
    case 'ReflectPlayed':
    case 'ReflectTriggered':
    case 'Resurrected':
      return eventText(event, names);
    default:
      return null;
  }
}

/**
 * A faixa de um evento como fita de cordel (sub-projeto 6 §4: a fita é o padrão de todas as faixas da mesa): a da iniciativa
 * tem título e motivo; as outras, o texto de `bannerText` como título.
 */
export function bannerRibbon(event: GameEvent, names: Names): Ribbon | null {
  if (event.type === 'InitiativeDecided') return initiativeRibbon(event, names);
  const title = bannerText(event, names);
  return title === null ? null : { title, reason: null };
}

/** A fita numa linha: o título e, se houver, " · " e o motivo (o `data-faixa` e o tempo de leitura). */
export const ribbonText = (ribbon: Ribbon): string => (ribbon.reason === null ? ribbon.title : `${ribbon.title} · ${ribbon.reason}`);

/**
 * A batida mostra uma faixa? As cenas só chegam aqui no `catchUp` (viram `banner`), menos as que não carimbam nome e dizem o motivo
 * na fita (`RIBBON_SCENES`); o `DeckReshuffled` é `move` com faixa.
 */
function hasBanner(beat: Beat): boolean {
  return beat.kind === 'banner' || beat.teach || beat.event.type === 'DeckReshuffled' || (beat.scene !== null && RIBBON_SCENES.has(beat.scene));
}

/**
 * A batida cuja faixa está no ar quando a batida `index` toca (é dela o texto), ou `null` sem faixa.
 *
 * - Ao vivo: a faixa é a da própria batida, se ela tem uma.
 * - No `catchUp` (spec §4.1, §10.4): a faixa fica no ar da primeira à última batida com faixa da linha do tempo, com o texto
 *   da última que passou. Uma subida e uma descida por linha do tempo, e não uma por faixa: com eventos de movimento
 *   entre elas (`CardsRemovedFromRow`, `Sacrificed`...), a camada subiria e desceria várias vezes por segundo.
 */
export function bannerBeatAt(beats: readonly Beat[], index: number, catchUp: boolean): Beat | null {
  const beat = beats[index];
  if (beat === undefined) return null;
  if (!catchUp) return hasBanner(beat) ? beat : null;
  // Da primeira à última faixa da linha do tempo a camada fica no ar; antes e depois dela, apagada.
  if (index > beats.findLastIndex(hasBanner)) return null;
  for (let i = index; i >= 0; i--) {
    const earlier = beats[i]!;
    if (hasBanner(earlier)) return earlier;
  }
  return null;
}

/** O título e a linha de baixo da cena da batida; vazios se a batida não é uma cena. */
export function sceneText(beat: Beat, names: Names): { title: string; detail: string } {
  const { event, scene } = beat;
  if (scene === null) return { title: '', detail: '' };
  const title = SCENE_TITLE[scene];
  switch (event.type) {
    case 'Exodia':
      return { title, detail: `${names.of(event.player)} reuniu os quatro K e vence!` };
    case 'AbsoluteAttack':
    case 'AbsoluteDefenseStarted':
      return { title, detail: names.of(event.player) };
    case 'ReflectPlayed':
      return { title, detail: `${names.of(event.player)} armou o escudo` };
    case 'ReflectTriggered': {
      const target = event.attacker === names.me ? 'você' : names.of(event.attacker);
      return { title, detail: `O ataque voltou: ${event.damage} de dano em ${target}` };
    }
    case 'RowDevastated':
      return { title, detail: devastatedText(event, names) };
    case 'Resurrected':
      return { title, detail: eventText(event, names) ?? '' };
    case 'DamageDealt': {
      // O golpe final (bloco B dos pontos do playtest, ponto 15): o carimbo é de quem vê.
      if (scene !== 'FINAL_BLOW') return { title, detail: '' };
      const detail = event.attacker === names.me ? `Você derrubou ${names.of(event.defender)}` : `${names.of(event.attacker)} derrubou você`;
      return { title: finalBlowTitle(event.attacker, names.me), detail };
    }
    default:
      return { title, detail: '' };
  }
}
