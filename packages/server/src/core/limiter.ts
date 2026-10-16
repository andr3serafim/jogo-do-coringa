/** Balde de fichas: começa cheio e repõe `refillPerSec` por segundo. Aritmética em milifichas, sem erro de ponto flutuante. */
export class TokenBucket {
  private readonly capacity: number;
  private readonly refillPerSec: number;
  private milli: number;
  private last: number;

  constructor(capacity: number, refillPerSec: number, now: number) {
    this.capacity = capacity * 1000;
    this.refillPerSec = refillPerSec;
    this.milli = this.capacity;
    this.last = now;
  }

  /** Gasta uma ficha; `false` se o balde está vazio. Relógio que anda para trás não repõe nada. */
  take(now: number): boolean {
    const elapsed = Math.max(0, now - this.last);
    this.last = Math.max(this.last, now);
    this.milli = Math.min(this.capacity, this.milli + elapsed * this.refillPerSec);
    if (this.milli < 1000) return false;
    this.milli -= 1000;
    return true;
  }
}
