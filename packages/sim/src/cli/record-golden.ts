/** `pnpm --filter @coringa/sim record-golden`: regrava as fixtures das partidas de referência do motor. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recordGolden } from '../golden.ts';

const target = fileURLToPath(new URL('../../../engine/test/fixtures/golden-replays.json', import.meta.url));
const replays = recordGolden();
writeFileSync(target, `${JSON.stringify(replays, null, 1)}\n`);
console.log(`${replays.length} partidas gravadas em ${target}`);
console.log('Rode `pnpm --filter @coringa/engine test -u` e revise o diff dos snapshots antes de commitar.');
