/** `pnpm play`: você contra o bot no terminal (spec §4); com `--online`, pela sala do servidor (spec §10.2 do servidor). */
import { makeConfig, validateConfig } from '@coringa/engine';
import { consoleIo, QuitSignal } from '../play/io.ts';
import { playGame } from '../play/game.ts';
import { botName, configFromArgs, parseArgs, RULE_OPTIONS } from './args.ts';
import { describeError, playOnlineCli } from './online.ts';

const { values, positionals } = parseArgs({
  options: {
    ...RULE_OPTIONS,
    semente: { type: 'string' },
    bot: { type: 'string', default: 'greedy' },
    online: { type: 'boolean' },
    apelido: { type: 'string' },
    servidor: { type: 'string' },
  },
  allowPositionals: true,
});

if (values.online) {
  const io = consoleIo();
  try {
    await playOnlineCli({ io, positionals, nickname: values.apelido, server: values.servidor });
  } catch (e) {
    // Fim da entrada ou Ctrl+C antes de a partida começar (ex.: no apelido) não é erro.
    if (!(e instanceof QuitSignal)) {
      console.error(`erro: ${describeError(e)}`);
      process.exitCode = 1;
    }
  } finally {
    io.close();
  }
} else {
  if (positionals.length > 0) throw new Error(`argumento inesperado: ${positionals[0]} (o alvo só vale com --online)`);
  const config = makeConfig(configFromArgs(values));
  const error = validateConfig(config);
  if (error) throw new Error(error.message);
  const io = consoleIo();
  try {
    await playGame({ io, seed: values.semente ?? Date.now().toString(36), bot: botName(values.bot ?? 'greedy'), config });
  } finally {
    io.close();
  }
}
