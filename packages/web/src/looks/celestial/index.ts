// O pacote do deck Celestial: as URLs das nove imagens, por chave. Chega por `import()` (`../load.ts`), nunca pelo JavaScript inicial.
import { urlsByKey } from '../pack-urls.ts';

const files = import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' });

/** As URLs das imagens deste pacote, por chave. */
export const urls = urlsByKey(files, {
  '02-borboleta': '02',
  '03-beija-flor': '03',
  '04-cervo-branco': '04',
  '05-unicornio': '05',
  '06-pegaso': '06',
  '07-leao-alado': '07',
  '08-aguia-gigante': '08',
  '09-baleia-celeste': '09',
  '10-arcanjo': '10',
});
