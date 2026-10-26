import type { Outcome } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import {
  againstText,
  pastGameDateText,
  pastGameModeText,
  pastGameResultText,
  replayStoppedText,
  stepCounterText,
} from '../../src/model/past-games-copy.ts';

const win = (winner: 'p1' | 'p2'): Outcome => ({ gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner, reason: 'HP' } });

describe('pastGameDateText', () => {
  it('dia/mês e hora local, com dois dígitos', () => {
    expect(pastGameDateText(new Date(2026, 9, 25, 14, 30).getTime())).toBe('25/10, 14:30');
    expect(pastGameDateText(new Date(2026, 0, 3, 9, 5).getTime())).toBe('03/01, 09:05');
    expect(pastGameDateText(new Date(2026, 11, 31, 0, 0).getTime())).toBe('31/12, 00:00');
  });

  it('uma data fora do alcance do Date não vira "NaN/NaN"', () => {
    expect(pastGameDateText(8.64e15 + 1)).toBe('data desconhecida');
  });
});

describe('pastGameResultText', () => {
  it('é do ponto de vista do assento', () => {
    expect(pastGameResultText(win('p1'), 'p1')).toBe('Vitória');
    expect(pastGameResultText(win('p1'), 'p2')).toBe('Derrota');
    expect(pastGameResultText(win('p2'), 'p2')).toBe('Vitória');
  });

  it('empate e partida sem resultado', () => {
    expect(pastGameResultText({ gameNo: 1, cause: 'NORMAL', result: { kind: 'DRAW', reason: 'ANTI_STALL' } }, 'p1')).toBe('Empate');
    expect(pastGameResultText({ gameNo: 1, cause: 'ABANDONED', result: null }, 'p2')).toBe('Sem resultado');
  });
});

describe('modo, adversário e contador', () => {
  it('o modo do treino leva o nível; o online, o código da sala', () => {
    expect(pastGameModeText({ kind: 'training', level: 'dificil' })).toBe('Treino · Difícil');
    expect(pastGameModeText({ kind: 'online', code: 'ABC234' })).toBe('Sala ABC234');
  });

  it('um apelido vazio vira "Oponente"', () => {
    expect(againstText('Duda')).toBe('contra Duda');
    expect(againstText('')).toBe('contra Oponente');
  });

  it('"Passo 12 de 240"', () => {
    expect(stepCounterText(12, 240)).toBe('Passo 12 de 240');
  });
});

describe('replayStoppedText', () => {
  it('diz o passo e o motivo do motor, sem repetir o ponto final', () => {
    expect(replayStoppedText(37, 'jogador desconhecido: p9')).toBe('O replay parou no passo 37: jogador desconhecido: p9.');
    expect(replayStoppedText(37, 'a partida já terminou.')).toBe('O replay parou no passo 37: a partida já terminou.');
  });

  it('no passo 0 a partida nem começou', () => {
    expect(replayStoppedText(0, 'hp deve ser um inteiro ≥ 1')).toBe('O replay não pôde começar: hp deve ser um inteiro ≥ 1.');
  });
});
