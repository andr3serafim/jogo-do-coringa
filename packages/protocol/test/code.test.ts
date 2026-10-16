import { describe, expect, it } from 'vitest';
import { generateCode, normalizeCode, parseTarget, roomLink } from '../src/code.ts';

describe('código da sala', () => {
  it('normaliza: minúsculas e espaços viram o código; fora do alfabeto é null', () => {
    expect(normalizeCode(' k7m2qx ')).toBe('K7M2QX');
    expect(normalizeCode('K7M2Q')).toBeNull(); // curto
    expect(normalizeCode('K7M2Q0')).toBeNull(); // 0 não existe
    expect(normalizeCode('K7M2QI')).toBeNull(); // I não existe
  });

  it('gera só do alfabeto, sem viés de módulo (bytes ≥ 248 são descartados)', () => {
    const bytes = [255, 249, 248, 0, 30, 31, 61, 247];
    let i = 0;
    const code = generateCode((n) => Uint8Array.from({ length: n }, () => bytes[i++ % bytes.length]));
    // lote 1: 255, 249, 248 descartados; 0→'2', 30→'Z', 31→'2', 61→'Z', 247→'Z'; lote 2: descarta três, 0→'2'
    expect(code).toBe('2Z2ZZ2');
  });

  it('link e alvo', () => {
    expect(roomLink('https://h.dev', 'K7M2QX')).toBe('https://h.dev/s/K7M2QX');
    expect(parseTarget(undefined, 'http://localhost:8787')).toEqual({ server: 'http://localhost:8787', code: null });
    expect(parseTarget('k7m2qx', 'http://localhost:8787')).toEqual({ server: 'http://localhost:8787', code: 'K7M2QX' });
    expect(parseTarget('https://h.dev/s/K7M2QX', 'x')).toEqual({ server: 'https://h.dev', code: 'K7M2QX' });
    expect(parseTarget('http://localhost:8787', 'x')).toEqual({ server: 'http://localhost:8787', code: null });
    expect(() => parseTarget('???', 'x')).toThrow('alvo inválido');
  });

  it('recusa alvo com protocolo estranho, caminho que não é /s/<código> ou código fora do alfabeto', () => {
    expect(() => parseTarget('ftp://h.dev/s/K7M2QX', 'x')).toThrow('alvo inválido: ftp://h.dev/s/K7M2QX');
    expect(() => parseTarget('https://h.dev/outra/K7M2QX', 'x')).toThrow('alvo inválido');
    expect(() => parseTarget('https://h.dev/s/K7M2Q0', 'x')).toThrow('alvo inválido');
    expect(parseTarget('https://h.dev/s/k7m2qx/', 'x')).toEqual({ server: 'https://h.dev', code: 'K7M2QX' });
  });
});
