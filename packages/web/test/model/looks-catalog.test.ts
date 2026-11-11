import { describe, expect, it } from 'vitest';
import type { ArtKey, PackId } from '../../src/model/looks.ts';
import { ART_META, DECK_LABEL, RACE_LABEL } from '../../src/looks/catalog.ts';
import { urls as bestiario } from '../../src/looks/bestiario/index.ts';
import { urls as celestial } from '../../src/looks/celestial/index.ts';
import { portrait, urls as egipcio } from '../../src/looks/egipcio/index.ts';
import { loadPack } from '../../src/looks/load.ts';

const NUMBERS: ArtKey[] = ['02', '03', '04', '05', '06', '07', '08', '09', '10'];
const SPECIALS: ArtKey[] = ['K', 'J', 'Q', 'A', 'WILD'];
const URLS: Record<PackId, Partial<Record<ArtKey, string>>> = { bestiario, celestial, egipcio };
const KEYS: Record<PackId, ArtKey[]> = { bestiario: NUMBERS, celestial: NUMBERS, egipcio: SPECIALS };

/** Todo `.webp` de `src/looks/`, pelo mesmo caminho do Vite que os pacotes usam. */
const ALL_FILES = Object.values(
  import.meta.glob<string>('../../src/looks/*/*.webp', { eager: true, query: '?url', import: 'default' }),
);

describe('o catálogo das aparências (spec dos decks §2.3 e §4.4)', () => {
  it('os rótulos dos decks e das raças', () => {
    expect(DECK_LABEL).toEqual({ cordel: 'Cordel', bestiario: 'Bestiário', celestial: 'Celestial' });
    expect(RACE_LABEL).toEqual({ bufao: 'Bufão', egipcio: 'Egípcio' });
  });

  it.each(Object.keys(KEYS) as PackId[])('o pacote %s tem as chaves dele no catálogo e nas URLs, e mais nenhuma', (pack) => {
    expect(Object.keys(ART_META[pack]).sort()).toEqual([...KEYS[pack]].sort());
    expect(Object.keys(URLS[pack]).sort()).toEqual([...KEYS[pack]].sort());
  });

  it('os nomes, ao pé da letra da spec', () => {
    // Pela lista das chaves: '10' é índice inteiro e viria primeiro no `Object.values`.
    expect(NUMBERS.map((key) => ART_META.bestiario[key]?.name)).toEqual([
      'Morcego',
      'Aranha',
      'Lobo',
      'Urso',
      'Grifo',
      'Fênix',
      'Hidra',
      'Kraken',
      'Dragão Ancestral',
    ]);
    expect(NUMBERS.map((key) => ART_META.celestial[key]?.name)).toEqual([
      'Borboleta',
      'Beija-flor',
      'Cervo Branco',
      'Unicórnio',
      'Pégaso',
      'Leão Alado',
      'Águia Gigante',
      'Baleia Celeste',
      'Arcanjo',
    ]);
    expect(SPECIALS.map((key) => ART_META.egipcio[key]?.name)).toEqual([
      'Máscara do Faraó',
      'Khopesh de Rá',
      'Escudo de Hórus',
      'Adaga de Set',
      'Coringa Anúbis',
    ]);
  });

  it('as cores de metal da spec §4.4', () => {
    expect(ART_META.bestiario['07']?.metal).toBe('#ffe2b0');
    expect(ART_META.bestiario['10']?.metal).toBe('#ffd75a');
    expect(ART_META.celestial['06']?.metal).toBe('#f2f6ff');
    expect(ART_META.celestial['10']?.metal).toBe('#ffe27a');
    for (const key of SPECIALS) expect(ART_META.egipcio[key]?.metal).toBe('#ffd98a');
    for (const pack of Object.values(ART_META)) {
      for (const meta of Object.values(pack)) expect(meta.metal).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('a mesma criatura nas duas chaves: a URL de cada carta é o arquivo dela', () => {
    expect(bestiario['02']).toMatch(/02-morcego\.webp$/);
    expect(bestiario['10']).toMatch(/10-dragao\.webp$/);
    expect(celestial['03']).toMatch(/03-beija-flor\.webp$/);
    expect(egipcio.K).toMatch(/k-mascara\.webp$/);
    expect(egipcio.WILD).toMatch(/coringa-anubis\.webp$/);
    expect(portrait).toMatch(/retrato-anubis\.webp$/);
  });

  it('toda URL termina em .webp, e nenhum .webp de src/looks/ fica sem chave', () => {
    const mapped = [...Object.values(URLS).flatMap((urls) => Object.values(urls)), portrait];
    for (const url of mapped) expect(url).toMatch(/\.webp$/);
    expect(ALL_FILES.length).toBe(24);
    expect([...mapped].sort()).toEqual([...ALL_FILES].sort());
  });

  it('o pacote é pedido uma vez só: a promessa fica guardada', async () => {
    const first = loadPack('bestiario');
    expect(loadPack('bestiario')).toBe(first);
    await expect(first).resolves.toEqual(bestiario);
  });
});
