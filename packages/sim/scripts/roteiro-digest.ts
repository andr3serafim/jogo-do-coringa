// Ferramenta de quem muda uma regra: imprime os digests do `playGame` offline da semente 'roteiro' (sempre a opção 1), os que o
// teste `askChoice aborta com o sinal e o playGame offline continua igual` (`test/online.test.ts`) amarra. Rodar só depois de
// conferir que a mudança no jogo é de propósito: `node packages/sim/scripts/roteiro-digest.ts`.
import { createHash } from 'node:crypto';
import { makeConfig } from '@coringa/engine';
import { playGame } from '../src/play/game.ts';
import { scriptedIo } from '../src/play/io.ts';

const game = scriptedIo(() => '1');
const outcome = await playGame({ io: game, seed: 'roteiro', bot: 'greedy', config: makeConfig(), saveDir: null });
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
console.log(`saída: ${sha(game.output.join('\n'))}`);
console.log(`jogadas: ${sha(JSON.stringify(outcome.replay.steps))}`);
console.log(`passos: ${outcome.replay.steps.length}`);
