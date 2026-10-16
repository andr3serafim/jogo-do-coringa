export { Room } from './room.ts';

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return Response.json({ ok: true, version: env.VERSION });
    }
    return new Response('não encontrado', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
