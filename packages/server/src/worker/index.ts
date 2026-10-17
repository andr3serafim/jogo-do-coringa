import { acceptAndClose, handle } from './router.ts';

export { Room } from './room.ts';

/** Fechamento de um upgrade que deu erro no servidor: o cliente reconecta (não está em FINAL_CLOSE_CODES). */
const UPGRADE_FAILED_CLOSE = 1011;

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      console.log(JSON.stringify({ evt: 'error', code: '', message: failure.message, stack: failure.stack }));
      // Upgrade sempre responde 101 (spec §3): um 500 chegaria ao navegador como 1006 e ele tentaria de novo sem parar.
      if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
        return acceptAndClose(UPGRADE_FAILED_CLOSE, 'erro interno');
      }
      return Response.json({ error: 'INTERNAL', message: 'erro interno' }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
