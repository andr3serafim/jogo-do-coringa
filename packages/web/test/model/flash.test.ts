import { describe, expect, it } from 'vitest';
import { FLASH_MAX_SWITCHES, FLASH_WINDOW_MS, FlashLock, withinFlashLimit } from '../../src/model/flash.ts';
import { INVERT_COOLDOWN_MS } from '../../src/model/timeline.ts';

describe('withinFlashLimit (spec §10.4: no máximo 3 trocas claro ↔ escuro em 1 s)', () => {
  it('as constantes são as da spec', () => {
    expect(FLASH_MAX_SWITCHES).toBe(3);
    expect(FLASH_WINDOW_MS).toBe(1_000);
  });

  it('sem trocas anteriores, uma inversão (2 trocas) passa', () => {
    expect(withinFlashLimit([], [0, 600])).toBe(true);
  });

  it('3 trocas numa janela de 1 s passam; a quarta não', () => {
    expect(withinFlashLimit([0, 100], [200])).toBe(true);
    expect(withinFlashLimit([0, 100, 200], [300])).toBe(false);
  });

  it('a quarta troca a 1 s ou mais da primeira já passa', () => {
    expect(withinFlashLimit([0, 100, 200], [1_000])).toBe(true);
    expect(withinFlashLimit([0, 100, 200], [999])).toBe(false);
  });

  it('confere a janela deslizante inteira, não só a ponta', () => {
    // Duas inversões coladas: 4 trocas em 450 ms.
    expect(withinFlashLimit([0, 150], [300, 450])).toBe(false);
    // Duas inversões separadas por 2 s: nenhuma janela de 1 s pega mais de 2 trocas.
    expect(withinFlashLimit([0, 600], [2_600, 3_200])).toBe(true);
  });

  it('não depende da ordem em que as trocas chegam', () => {
    expect(withinFlashLimit([300, 0], [100, 200])).toBe(false);
  });
});

describe('FlashLock: a trava global do palco', () => {
  it('a primeira inversão passa', () => {
    expect(new FlashLock().request(1_000, 600)).toBe(true);
  });

  it('uma segunda inversão durante a primeira é recusada (cena de outro state, 200 ms depois)', () => {
    const lock = new FlashLock();
    expect(lock.request(150, 600)).toBe(true);
    expect(lock.request(350, 600)).toBe(false);
  });

  it('depois do fim da primeira, ainda vale o resfriamento de INVERT_COOLDOWN_MS', () => {
    const lock = new FlashLock();
    expect(lock.request(0, 600)).toBe(true); // liga em 0, desliga em 600
    expect(lock.request(600 + INVERT_COOLDOWN_MS - 1, 600)).toBe(false);
    expect(lock.request(600 + INVERT_COOLDOWN_MS, 600)).toBe(true);
  });

  it('uma recusa não grava nada: a inversão seguinte é julgada só pelas que aconteceram', () => {
    const lock = new FlashLock();
    expect(lock.request(0, 600)).toBe(true);
    expect(lock.request(400, 600)).toBe(false);
    expect(lock.request(2_600, 600)).toBe(true);
  });

  it('o desligar antecipado (pulo) vale pelo instante real: o resfriamento conta dele', () => {
    const lock = new FlashLock();
    expect(lock.request(0, 600)).toBe(true);
    lock.release(100); // o jogador pulou 100 ms depois de ligar
    expect(lock.request(100 + INVERT_COOLDOWN_MS - 1, 600)).toBe(false);
    expect(lock.request(100 + INVERT_COOLDOWN_MS, 600)).toBe(true);
  });

  it('soltar depois do fim previsto, ou sem inversão, não muda nada', () => {
    const lock = new FlashLock();
    lock.release(50); // sem inversão nenhuma
    expect(lock.request(0, 600)).toBe(true);
    lock.release(900); // depois do fim previsto (600)
    expect(lock.request(600 + INVERT_COOLDOWN_MS, 600)).toBe(true);
  });

  it('a conta de 1 s vale mesmo que o resfriamento seja zerado (a regra da spec sozinha)', () => {
    // Defesa em profundidade: a janela é conferida à parte do resfriamento.
    const lock = new FlashLock({ cooldownMs: 0 });
    expect(lock.request(0, 100)).toBe(true); // trocas em 0 e 100
    expect(lock.request(200, 100)).toBe(false); // 4 trocas em 300 ms
    expect(lock.request(1_000, 100)).toBe(true); // a janela de 1 s já passou
  });

  it('não acumula trocas velhas sem fim', () => {
    const lock = new FlashLock();
    for (let i = 0; i < 50; i++) expect(lock.request(i * 10_000, 600)).toBe(true);
    expect(lock.recentSwitches()).toHaveLength(2);
  });
});
