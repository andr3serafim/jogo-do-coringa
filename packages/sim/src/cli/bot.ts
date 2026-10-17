/** `pnpm bot --online <código|link> [--bot greedy] [--servidor URL]`: um bot do simulador que joga pela sala (spec §10.2). */
import { joinRoom, parseTarget, RoomClient } from '@coringa/protocol';
import { runBot } from '../online/bot.ts';
import { botName, parseArgs, resolveServer, targetArg } from './args.ts';
import { describeError } from './online.ts';

try {
  const { values, positionals } = parseArgs({
    options: { online: { type: 'boolean' }, bot: { type: 'string', default: 'greedy' }, servidor: { type: 'string' } },
    allowPositionals: true,
  });
  const name = botName(values.bot ?? 'greedy');
  const { server, code } = parseTarget(targetArg(positionals), resolveServer(values.servidor));
  if (!code) throw new Error('informe o código ou o link da sala: pnpm bot --online <código>');
  // O bot não guarda sessão: na mesma máquina ela sobrescreveria a do jogador humano da sala.
  const joined = await joinRoom(server, code, `Bot (${name})`);
  const client = new RoomClient({ server, code, token: joined.token });
  console.log(`Bot ${name} na sala ${code} como ${joined.playerId}.`);
  const playing = runBot({ connection: client, bot: name, seed: Date.now().toString(36), log: (line) => console.log(`[bot] ${line}`) });
  client.connect();
  await playing;
  client.close();
  console.log('Sala encerrada.');
} catch (e) {
  console.error(`erro: ${describeError(e)}`);
  process.exitCode = 1;
}
