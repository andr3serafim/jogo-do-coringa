// Trava global de flash (spec §10.4, WCAG 2.3.1). Puro: sem React, DOM nem timers; o relógio entra por parâmetro.
//
// O limite vale para a tela inteira, não para um `state`: duas cenas de `state`s diferentes, coladas, seriam um
// pisca-pisca mesmo que cada linha do tempo, sozinha, respeite a regra. E vale para tudo o que muda a luminância da tela,
// somado: a inversão (liga e desliga), a cortina escura da cena (sobe e desce) e a faixa (sobe e desce). Quem aplica (o
// `useBeatPlayer`) pede a licença aqui na hora de ligar e grava o desligar quando ele acontece (inclusive o antecipado, do pulo).
import { INVERT_COOLDOWN_MS } from './timeline.ts';

/** Janela da regra de flash: nunca mais de `FLASH_MAX_SWITCHES` trocas claro ↔ escuro dentro dela. */
export const FLASH_WINDOW_MS = 1_000;
export const FLASH_MAX_SWITCHES = 3;

/**
 * Acrescentar as trocas `added` (instantes, em ms) às `switches` já feitas deixa toda janela de 1 s com no máximo 3
 * trocas? Quatro trocas seguidas cabem numa janela de 1 s quando a primeira e a quarta estão a menos de 1 s.
 */
export function withinFlashLimit(switches: readonly number[], added: readonly number[]): boolean {
  const all = [...switches, ...added].sort((a, b) => a - b);
  for (let i = 0; i + FLASH_MAX_SWITCHES < all.length; i++) {
    if (all[i + FLASH_MAX_SWITCHES]! - all[i]! < FLASH_WINDOW_MS) return false;
  }
  return true;
}

export interface FlashLockOptions {
  /** Espera entre o fim de uma inversão e o começo da próxima (padrão: `INVERT_COOLDOWN_MS`). */
  cooldownMs?: number;
}

/** Guarda os instantes das trocas claro ↔ escuro recentes. Cada inversão são 2: liga e desliga. */
export class FlashLock {
  readonly #cooldownMs: number;
  #switches: number[] = [];
  /** Instante em que a última inversão desligou (ou desligará). */
  #endAt = -Infinity;

  constructor(options: FlashLockOptions = {}) {
    this.#cooldownMs = options.cooldownMs ?? INVERT_COOLDOWN_MS;
  }

  /**
   * Pede uma inversão que liga em `atMs` e desliga em `atMs + holdMs`. Recusa a que começa antes do resfriamento
   * acabar (isso inclui uma inversão ainda no ar) ou que passaria de 3 trocas em alguma janela de 1 s. Concedida,
   * fica gravada; recusada, não deixa rastro.
   */
  request(atMs: number, holdMs: number): boolean {
    if (atMs < this.#endAt + this.#cooldownMs) return false;
    const added = [atMs, atMs + holdMs];
    this.#switches = this.#switches.filter((instant) => instant > atMs - FLASH_WINDOW_MS);
    if (!withinFlashLimit(this.#switches, added)) return false;
    this.#switches.push(...added);
    this.#endAt = atMs + holdMs;
    return true;
  }

  /**
   * O jogador pulou com a inversão no ar e quer desligá-la em `atMs`. Devolve o instante em que ela desliga de fato: o
   * pedido, se isso mantém toda janela de 1 s com no máximo 3 trocas (contando as da cortina), ou o primeiro instante
   * depois dele em que a conta deixa (no pior caso, o fim que já estava previsto). O desligar gravado vira esse instante,
   * e o resfriamento conta dele. Sem inversão no ar, devolve `atMs` e não muda nada.
   */
  release(atMs: number): number {
    if (atMs >= this.#endAt) return atMs;
    // É o desligar DA INVERSÃO que muda de instante; a cortina pode ter gravado trocas depois dele.
    const index = this.#switches.lastIndexOf(this.#endAt);
    const others = this.#switches.filter((_, i) => i !== index);
    const candidates = [atMs, ...others.map((instant) => instant + FLASH_WINDOW_MS)]
      .filter((instant) => instant >= atMs && instant < this.#endAt)
      .sort((a, b) => a - b);
    const off = candidates.find((instant) => withinFlashLimit(others, [instant])) ?? this.#endAt;
    if (index >= 0) this.#switches[index] = off;
    this.#endAt = off;
    return off;
  }

  /** Uma troca avulsa (a cortina ou a faixa sobe ou desce) em `atMs`: grava e devolve `true` se cabe na janela; senão, nada. */
  toggle(atMs: number): boolean {
    this.#switches = this.#switches.filter((instant) => instant > atMs - FLASH_WINDOW_MS);
    if (!withinFlashLimit(this.#switches, [atMs])) return false;
    this.#switches.push(atMs);
    return true;
  }

  /**
   * O primeiro instante a partir de `atMs` em que `request(_, holdMs)` concederia a inversão: as duas pontas (liga e desliga)
   * cabem na conta de 3 trocas por segundo. Serve à inversão que as trocas de antes (a faixa, a cortina) recusaram: ela espera,
   * dentro da cena, em vez de não acontecer. Durante o resfriamento de outra inversão devolve `null`: a cena seguida perde a
   * inversão, sem espera.
   */
  nextRequest(atMs: number, holdMs: number): number | null {
    if (atMs < this.#endAt + this.#cooldownMs) return null;
    // Cada troca gravada sai da janela 1 s depois; a ponta do desligar sai `holdMs` antes disso.
    const candidates = [atMs, ...this.#switches.flatMap((instant) => [instant + FLASH_WINDOW_MS, instant + FLASH_WINDOW_MS - holdMs])]
      .filter((instant) => instant >= atMs)
      .sort((a, b) => a - b);
    // O último candidato (a troca mais tardia mais 1 s) sempre cabe.
    return candidates.find((instant) => withinFlashLimit(this.#switches, [instant, instant + holdMs])) ?? atMs;
  }

  /**
   * O primeiro instante a partir de `atMs` em que uma troca avulsa cabe, contando também as trocas já agendadas (o
   * desligar de uma inversão no ar). Serve para segurar a descida da cortina, e a subida ou a descida da faixa, até a regra
   * deixar.
   */
  nextAllowed(atMs: number): number {
    const candidates = [atMs, ...this.#switches.map((instant) => instant + FLASH_WINDOW_MS)]
      .filter((instant) => instant >= atMs)
      .sort((a, b) => a - b);
    // O último candidato (a troca mais tardia mais 1 s) sempre cabe.
    return candidates.find((instant) => withinFlashLimit(this.#switches, [instant])) ?? atMs;
  }

  /** As trocas que ainda contam para a janela, em ordem (para os testes). */
  recentSwitches(): readonly number[] {
    return [...this.#switches].sort((a, b) => a - b);
  }
}
