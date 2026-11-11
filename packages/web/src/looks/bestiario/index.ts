// O pacote do deck Bestiário: as URLs das nove imagens, por chave. Chega por `import()` (`../load.ts`), nunca pelo JavaScript inicial.
import { urlsByKey } from '../pack-urls.ts';

const files = import.meta.glob<string>('./*.webp', { eager: true, query: '?url', import: 'default' });

/** As URLs das imagens deste pacote, por chave. */
export const urls = urlsByKey(files, {
  '02-morcego': '02',
  '03-aranha': '03',
  '04-lobo': '04',
  '05-urso': '05',
  '06-grifo': '06',
  '07-fenix': '07',
  '08-hidra': '08',
  '09-kraken': '09',
  '10-dragao': '10',
});
