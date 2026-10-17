/** Cola dos CLIs online (`pnpm play --online` e `pnpm bot`): entrar na sala, ligar o `RoomClient` e jogar. */
import { HttpError, normalizeNickname, parseTarget, RoomClient, roomLink } from '@coringa/protocol';
import { enterRoom, forgetSession, saveSession } from '../online/sessions.ts';
import { playOnline } from '../online/session.ts';
import type { Io } from '../play/io.ts';
import { namesFor } from '../play/text.ts';
import { resolveServer, targetArg } from './args.ts';

/** Mensagem para o terminal, sem a pilha de chamadas. */
export function describeError(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.status === 404) return 'sala não encontrada (código errado ou sala expirada)';
    if (e.status === 409) return 'a sala está cheia';
    if (e.status === 429) return 'muitas requisições; espere um minuto';
    return `o servidor respondeu HTTP ${e.status}`;
  }
  if (e instanceof TypeError && e.message === 'fetch failed') return 'não consegui falar com o servidor (ele está no ar? veja --servidor)';
  return e instanceof Error ? e.message : String(e);
}

async function askNickname(io: Io, given: string | undefined): Promise<string> {
  if (given !== undefined) {
    const nickname = normalizeNickname(given);
    if (!nickname) throw new Error('apelido inválido (1 a 20 caracteres, sem controle)');
    return nickname;
  }
  for (;;) {
    const nickname = normalizeNickname(await io.ask('Apelido: '));
    if (nickname) return nickname;
    io.print('Apelido de 1 a 20 caracteres.');
  }
}

export interface PlayOnlineCli {
  io: Io;
  positionals: string[];
  nickname: string | undefined;
  server: string | undefined;
}

/** `pnpm play --online [alvo]`: cria a sala, volta pela sessão salva ou entra pelo código. */
export async function playOnlineCli({ io, positionals, nickname, server: serverFlag }: PlayOnlineCli): Promise<void> {
  const { server, code } = parseTarget(targetArg(positionals), resolveServer(serverFlag));
  const entered = await enterRoom({ server, code, nickname: () => askNickname(io, nickname) });
  const { session } = entered;
  if (entered.created) {
    io.print(`Sala criada: ${session.code}\nLink: ${roomLink(server, session.code)}\nO outro jogador entra com: pnpm play --online ${session.code}  (ou um bot: pnpm bot --online ${session.code})`);
  } else if (entered.resumed) {
    io.print(`Voltando para a sala ${session.code} como ${session.nickname} (sessão salva).`);
  } else {
    io.print(`Entrando na sala ${session.code} como ${session.nickname}.`);
  }
  const client = new RoomClient({ server, code: session.code, token: session.token, lastSeq: session.lastSeq });
  client.subscribe((event) => {
    // Guarda o último `seq` para a volta em outro processo receber os eventos perdidos (o arquivo segue com modo 0600).
    if (event.type === 'state') saveSession({ ...session, lastSeq: event.state.seq });
    // Sala apagada ou token recusado: a sessão salva não serve mais, e guardá-la só atrapalharia o próximo `joinRoom`.
    if (event.type === 'closed' && event.final && (event.code === 4000 || event.code === 4003)) {
      forgetSession(server, session.code);
    }
  });
  const playing = playOnline({ io, connection: client, names: namesFor(session.playerId, 'Oponente') });
  client.connect();
  try {
    await playing;
  } finally {
    client.close();
  }
}
