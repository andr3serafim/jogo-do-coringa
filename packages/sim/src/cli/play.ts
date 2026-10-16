/** `pnpm play`: você contra o bot no terminal (spec §4). */
import { makeConfig, validateConfig } from '@coringa/engine';
import { consoleIo } from '../play/io.ts';
import { playGame } from '../play/game.ts';
import { botName, configFromArgs, parseArgs, RULE_OPTIONS } from './args.ts';

const { values } = parseArgs({ options: { ...RULE_OPTIONS, semente: { type: 'string' }, bot: { type: 'string', default: 'greedy' } } });
const config = makeConfig(configFromArgs(values));
const error = validateConfig(config);
if (error) throw new Error(error.message);
const io = consoleIo();
try {
  await playGame({ io, seed: values.semente ?? Date.now().toString(36), bot: botName(values.bot ?? 'greedy'), config });
} finally {
  io.close();
}
