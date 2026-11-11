// O pacote da raça Egípcia (o Coringa Anúbis): as URLs dos cinco artefatos, por chave, e o retrato (só a fatia 2 o usa). Chega por
// `import()` (`../load.ts`), nunca pelo JavaScript inicial.
import { urlsByKey } from '../pack-urls.ts';

const files = import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' });

/** As URLs das imagens deste pacote, por chave. */
export const urls = urlsByKey(files, {
  'k-mascara': 'K',
  'j-khopesh': 'J',
  'q-escudo': 'Q',
  'a-adaga': 'A',
  'coringa-anubis': 'WILD',
});

/** O retrato quadrado do Anúbis, para o placar (fatia 2). */
export const portrait = files['./retrato-anubis.webp'] ?? '';
