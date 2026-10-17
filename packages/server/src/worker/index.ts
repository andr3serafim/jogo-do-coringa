import { handle } from './router.ts';

export { Room } from './room.ts';

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      console.log(JSON.stringify({ evt: 'error', code: '', message: failure.message, stack: failure.stack }));
      return Response.json({ error: 'INTERNAL', message: 'erro interno' }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
